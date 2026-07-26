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

beforeEach(() => {
	files = new Map();
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
			platform: "reddit",
			language: "en",
			url: "https://reddit.com/r/selfhosted/comments/abc/",
			publishedAt: "2026-07-28",
			canonical: false,
		});
		expect(both).toHaveLength(2);
		expect(both.filter((publication) => publication.canonical)).toHaveLength(1);
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
