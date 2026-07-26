import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assembleMarkdown } from "../../domain/render/markdown.js";
import { UnsupportedArticleLayout } from "../../domain/vault/reader.js";
import { ObsidianVaultReader } from "./obsidian-vault-reader.js";
import { ObsidianRestClient } from "./rest-client.js";

const API_KEY = "test-key";

/**
 * A vault as the plugin serves it: a folder answers with a list whose folders
 * carry a trailing slash, a note answers with its text.
 */
const VAULT: Readonly<Record<string, readonly string[] | string>> = {
	"Статьи/": [
		"Sample Article/",
		"Другая статья/",
		"Started/",
		"Broken/",
		"Legacy/",
		"Unlisted/",
		"loose-note.md",
	],

	"Статьи/Sample Article/": ["en/", "ru/", "plan.md"],
	"Статьи/Sample Article/en/": ["Sample Article.md", "sections/"],
	"Статьи/Sample Article/en/Sample Article.md":
		"---\ntitle: Sample Article\nlang: en\n---\n\n## Contents\n\n1. [[s0-intro|Opening]]\n2. [[s1-network]]\n3. [[s2-loose|A section with no heading]]\n",
	"Статьи/Sample Article/en/sections/s0-intro.md": "# Why an old phone\n\nProse.\n",
	"Статьи/Sample Article/en/sections/s1-network.md":
		"# Network access\n\n## Tailscale\n\n```sh\n# not a heading\ntailscale up\n```\n",
	"Статьи/Sample Article/en/sections/s2-loose.md": "Prose with no heading of its own.\n",
	"Статьи/Sample Article/ru/": ["Sample Article.md", "sections/"],
	"Статьи/Sample Article/ru/Sample Article.md":
		"---\ntitle: Пример статьи\nlang: ru\n---\n\n1. [[s0-intro]]\n",
	"Статьи/Sample Article/ru/sections/s0-intro.md": "# Зачем старый телефон\n\nТекст.\n",

	// A folder named in Cyrillic, to prove the path is encoded rather than sent raw.
	"Статьи/Другая статья/": ["ru/"],
	"Статьи/Другая статья/ru/": ["Другая статья.md", "sections/"],
	"Статьи/Другая статья/ru/Другая статья.md": "---\ntitle: Другая статья\n---\n\n1. [[s0-начало]]\n",
	"Статьи/Другая статья/ru/sections/s0-начало.md": "# Начало\n\nТекст.\n",

	// Started, but no language folder yet.
	"Статьи/Started/": ["plan.md"],

	// An index promising a section that is not there.
	"Статьи/Broken/": ["en/"],
	"Статьи/Broken/en/": ["Broken.md", "sections/"],
	"Статьи/Broken/en/Broken.md": "---\ntitle: Broken\n---\n\n1. [[s0-missing]]\n",

	// Written before the layout existed: one note holding the whole article.
	"Статьи/Legacy/": ["en/"],
	"Статьи/Legacy/en/": ["Legacy.md"],
	"Статьи/Legacy/en/Legacy.md": "# Legacy\n\nThe whole article in one note.\n\n## A part\n\nMore.\n",

	// Split, but the index has not been filled in.
	"Статьи/Unlisted/": ["en/"],
	"Статьи/Unlisted/en/": ["Unlisted.md", "sections/"],
	"Статьи/Unlisted/en/Unlisted.md": "---\ntitle: Unlisted\n---\n\nNothing linked yet.\n",
};

let server: Server;
let reader: ObsidianVaultReader;

function readerFor(apiKey: string): ObsidianVaultReader {
	const { port } = server.address() as AddressInfo;
	return new ObsidianVaultReader(new ObsidianRestClient({ baseUrl: `http://127.0.0.1:${port}`, apiKey }));
}

beforeAll(async () => {
	server = createServer((incoming, outgoing) => {
		if (incoming.headers.authorization !== `Bearer ${API_KEY}`) {
			outgoing.writeHead(401);
			outgoing.end("Unauthorized");
			return;
		}
		const path = decodeURIComponent((incoming.url ?? "").replace(/^\/vault\//, ""));
		const entry = VAULT[path];
		if (entry === undefined) {
			outgoing.writeHead(404);
			outgoing.end("Not found");
			return;
		}
		if (Array.isArray(entry)) {
			outgoing.writeHead(200, { "content-type": "application/json" });
			outgoing.end(JSON.stringify({ files: entry }));
			return;
		}
		outgoing.writeHead(200, { "content-type": "text/markdown" });
		outgoing.end(entry);
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	reader = readerFor(API_KEY);
});

afterAll(async () => {
	await new Promise<void>((resolve, reject) =>
		server.close((cause) => (cause === undefined ? resolve() : reject(cause))),
	);
});

describe("ObsidianVaultReader", () => {
	it("lists every article folder, including ones it cannot read", () => {
		// The list is how the author sees what is there; an article in the old
		// layout still belongs on it, and says so when opened.
		return expect(reader.listArticles()).resolves.toEqual([
			"Sample Article",
			"Другая статья",
			"Started",
			"Broken",
			"Legacy",
			"Unlisted",
		]);
	});

	it("reports the languages an article actually has", async () => {
		expect(await reader.availableLanguages("Sample Article")).toEqual(["en", "ru"]);
		expect(await reader.availableLanguages("Другая статья")).toEqual(["ru"]);
		expect(await reader.availableLanguages("Started")).toEqual([]);
	});

	it("reads a document in the order its index lists", async () => {
		const article = await reader.readArticle("Sample Article");
		const english = article.documents.find((document) => document.language === "en");
		expect(english?.title).toBe("Sample Article");
		expect(english?.sections.map((section) => section.id)).toEqual(["s0-intro", "s1-network", "s2-loose"]);
	});

	it("publishes the heading the section note carries, not the index label", async () => {
		const article = await reader.readArticle("Sample Article");
		const english = article.documents.find((document) => document.language === "en");
		// The index calls it "Opening"; the note calls it "Why an old phone".
		expect(english?.sections[0]?.heading).toBe("Why an old phone");
	});

	it("falls back to the index label for a section note without a heading", async () => {
		const article = await reader.readArticle("Sample Article");
		const english = article.documents.find((document) => document.language === "en");
		expect(english?.sections[2]?.heading).toBe("A section with no heading");
	});

	it("takes the article's title from its English document", async () => {
		const article = await reader.readArticle("Sample Article");
		expect(article.title).toBe("Sample Article");
		expect(article.documents.map((document) => document.language)).toEqual(["en", "ru"]);
	});

	it("encodes folder names that are not ASCII", async () => {
		const article = await reader.readArticle("Другая статья");
		expect(article.title).toBe("Другая статья");
		expect(article.documents[0]?.sections[0]?.heading).toBe("Начало");
	});

	it("returns an article that has no language folders yet, rather than failing", async () => {
		const article = await reader.readArticle("Started");
		expect(article.documents).toEqual([]);
		expect(article.title).toBe("Started");
	});

	it("says which note is missing when the index promises one that is not there", async () => {
		await expect(reader.readArticle("Broken")).rejects.toThrow(/s0-missing\.md/);
	});

	it("refuses an article still written as one note, and says what to do", async () => {
		// Rather than splitting it on its own headings: a structure the author
		// has not written would look right and be a guess.
		await expect(reader.readArticle("Legacy")).rejects.toThrow(UnsupportedArticleLayout);
		await expect(reader.readArticle("Legacy")).rejects.toThrow(/sections\/ folder/);
	});

	it("refuses an index that lists no sections rather than returning an empty article", async () => {
		await expect(reader.readArticle("Unlisted")).rejects.toThrow(UnsupportedArticleLayout);
		await expect(reader.readArticle("Unlisted")).rejects.toThrow(/links to no sections/);
	});

	it("names the article and language on a layout it cannot read", async () => {
		const failure = await reader.readArticle("Legacy").catch((cause: unknown) => cause);
		expect(failure).toBeInstanceOf(UnsupportedArticleLayout);
		expect((failure as UnsupportedArticleLayout).slug).toBe("Legacy");
		expect((failure as UnsupportedArticleLayout).language).toBe("en");
	});

	it("says the key was rejected rather than reporting a bare status", async () => {
		await expect(readerFor("wrong-key").listArticles()).rejects.toThrow(/API key/);
	});

	it("assembles what it read into one document", async () => {
		const article = await reader.readArticle("Sample Article");
		const english = article.documents.find((document) => document.language === "en");
		if (english === undefined) throw new Error("the English document should have been read");

		expect(assembleMarkdown(english).body).toBe(
			[
				"## Why an old phone",
				"",
				"Prose.",
				"",
				"## Network access",
				"",
				"### Tailscale",
				"",
				"```sh",
				"# not a heading",
				"tailscale up",
				"```",
				"",
				"## A section with no heading",
				"",
				"Prose with no heading of its own.",
			].join("\n"),
		);
	});
});
