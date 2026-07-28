import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Publication } from "../../shared/publication.js";
import { ObsidianPublicationRegistry } from "./obsidian-registry.js";
import { ObsidianRestClient } from "./rest-client.js";

const API_KEY = "test-key";
const SLUG = "Sample Article";
const NOTE = `Статьи/${SLUG}/published.md`;

const HABR: Publication = {
	platform: "habr",
	language: "ru",
	url: "https://habr.com/ru/articles/123456/",
	publishedAt: "2026-07-27",
	canonical: false,
};

/** The vault as the plugin serves it, and as writing to it changes it. */
let files: Map<string, string>;
let server: Server;
let registry: ObsidianPublicationRegistry;
/** A plugin in trouble: it answers, and what it answers is not the file. */
let readsFail: boolean;

beforeEach(() => {
	files = new Map();
	readsFail = false;
});

beforeAll(async () => {
	server = createServer((incoming, outgoing) => {
		if (incoming.headers.authorization !== `Bearer ${API_KEY}`) {
			outgoing.writeHead(401);
			outgoing.end("Unauthorized");
			return;
		}
		const path = decodeURIComponent((incoming.url ?? "").replace(/^\/vault\//, ""));

		if (incoming.method === "PUT") {
			const chunks: Buffer[] = [];
			incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
			incoming.on("end", () => {
				files.set(path, Buffer.concat(chunks).toString("utf8"));
				outgoing.writeHead(204);
				outgoing.end();
			});
			return;
		}

		if (readsFail) {
			outgoing.writeHead(500);
			outgoing.end("Something went wrong");
			return;
		}

		const note = files.get(path);
		if (note === undefined) {
			outgoing.writeHead(404);
			outgoing.end("Not found");
			return;
		}
		outgoing.writeHead(200, { "content-type": "text/markdown" });
		outgoing.end(note);
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

	const { port } = server.address() as AddressInfo;
	registry = new ObsidianPublicationRegistry(
		new ObsidianRestClient({ baseUrl: `http://127.0.0.1:${port}`, apiKey: API_KEY }),
	);
});

afterAll(async () => {
	await new Promise<void>((resolve, reject) =>
		server.close((cause) => (cause === undefined ? resolve() : reject(cause))),
	);
});

describe("ObsidianPublicationRegistry", () => {
	it("says an article has been nowhere rather than failing on a missing note", async () => {
		// The ordinary state of everything not yet published.
		expect(await registry.list(SLUG)).toEqual([]);
	});

	it("does not mistake a plugin in trouble for an article published nowhere", async () => {
		// The whole record is rewritten from what was read. Reading "nothing"
		// because the plugin answered 500 replaced four publications with one,
		// and the interface showed the loss as though it were correct.
		await registry.record(SLUG, HABR);
		const before = files.get(NOTE);

		readsFail = true;
		await expect(
			registry.record(SLUG, { ...HABR, platform: "hackernoon", language: "en", url: "https://h.com/1" }),
		).rejects.toThrow();
		expect(files.get(NOTE)).toBe(before);
	});

	it("says so rather than answering with an empty record", async () => {
		await registry.record(SLUG, HABR);
		readsFail = true;
		await expect(registry.list(SLUG)).rejects.toThrow(/500/);
	});

	it("keeps a hand-written row it does not understand", async () => {
		// The note is meant to be corrected in Obsidian, so it will hold rows
		// this application cannot read. Recording must not delete them.
		await registry.record(SLUG, HABR);
		files.set(NOTE, `${files.get(NOTE) ?? ""}| livejournal | ru | 2020-01-01 | | https://lj.example/1 |\n`);

		await registry.record(SLUG, {
			platform: "hackernoon",
			language: "en",
			url: "https://hackernoon.com/1",
			publishedAt: "2026-07-28",
			canonical: false,
		});

		const note = files.get(NOTE) ?? "";
		expect(note).toContain("| livejournal |");
		expect(note).toContain(HABR.url);
		expect(note).toContain("https://hackernoon.com/1");
	});

	it("writes the record into the vault beside the article", async () => {
		await registry.record(SLUG, HABR);
		expect(files.has(NOTE)).toBe(true);
		expect(files.get(NOTE)).toContain(HABR.url);
	});

	it("writes something a person can read without Pressroom", async () => {
		await registry.record(SLUG, HABR);
		const note = files.get(NOTE) ?? "";
		expect(note).toContain("| platform | language | published | canonical | url |");
		expect(note).toContain(`article: ${SLUG}`);
	});

	it("reads back what it recorded", async () => {
		await registry.record(SLUG, HABR);
		expect(await registry.list(SLUG)).toEqual([{ ...HABR, canonical: true }]);
	});

	it("makes the first place an article goes out the one to point at", async () => {
		// The announcements are links, so one address has to be the address.
		const recorded = await registry.record(SLUG, HABR);
		expect(recorded[0]?.canonical).toBe(true);
	});

	it("keeps the record when a second place is added", async () => {
		await registry.record(SLUG, HABR);
		const both = await registry.record(SLUG, {
			platform: "hackernoon",
			language: "en",
			url: "https://hackernoon.com/how-i-turned-a-oneplus-3t",
			publishedAt: "2026-07-28",
			canonical: false,
		});
		expect(both).toHaveLength(2);
		// One canonical per language, not per article: the English text and the
		// Russian one are different texts, each with its own original.
		expect(both.filter((publication) => publication.canonical)).toHaveLength(2);
	});

	it("forgets a publication recorded by mistake", async () => {
		await registry.record(SLUG, HABR);
		expect(await registry.forget(SLUG, "habr", "ru")).toEqual([]);
		expect(await registry.list(SLUG)).toEqual([]);
	});

	it("leaves the other publications alone when one is forgotten", async () => {
		await registry.record(SLUG, HABR);
		await registry.record(SLUG, {
			platform: "reddit",
			language: "en",
			url: "https://reddit.com/r/selfhosted/comments/abc/",
			publishedAt: "2026-07-28",
			canonical: false,
		});
		const left = await registry.forget(SLUG, "reddit", "en");
		expect(left.map((publication) => publication.platform)).toEqual(["habr"]);
	});
});

describe("a request that would leave the vault", () => {
	it("is refused rather than sent", async () => {
		// `new URL` resolves `..` after the encoding, so this used to address
		// the plugin's root instead of anything under /vault/.
		await expect(registry.list("../../..")).rejects.toThrow(/outside the vault/);
	});
});
