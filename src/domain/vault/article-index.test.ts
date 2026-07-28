import { describe, expect, it } from "vitest";
import { parseArticleIndex } from "./article-index.js";

const INDEX = `---
title: How I Turned a OnePlus 3T into a postmarketOS Home Server
lang: en
type: article-index
---
Sections, in reading order.

## Contents

1. [[s0-introduction|Why an old phone]]
2. [[s1-getting-linux-on-the-phone|Getting Linux on the phone]]
3. [[s2-making-the-build-reproducible]]
`;

describe("parseArticleIndex", () => {
	it("takes the title from the frontmatter", () => {
		expect(parseArticleIndex(INDEX).title).toBe(
			"How I Turned a OnePlus 3T into a postmarketOS Home Server",
		);
	});

	it("lists the sections in the order the links appear", () => {
		expect(parseArticleIndex(INDEX).entries.map((entry) => entry.id)).toEqual([
			"s0-introduction",
			"s1-getting-linux-on-the-phone",
			"s2-making-the-build-reproducible",
		]);
	});

	it("keeps the link label where the author wrote one", () => {
		const [first, , third] = parseArticleIndex(INDEX).entries;
		expect(first?.label).toBe("Why an old phone");
		expect(third?.label).toBeNull();
	});

	it("follows the links rather than the numbering beside them", () => {
		// Hand-edited lists renumber badly; the order is the order of the links.
		const text = "3. [[s2-third]]\n1. [[s0-first]]\n2. [[s1-second]]\n";
		expect(parseArticleIndex(text).entries.map((entry) => entry.id)).toEqual([
			"s2-third",
			"s0-first",
			"s1-second",
		]);
	});

	it("drops the heading anchor, which is not part of the file name", () => {
		const entries = parseArticleIndex("[[s3-server-problems#Heat|Heat]]").entries;
		expect(entries[0]?.id).toBe("s3-server-problems");
		expect(entries[0]?.label).toBe("Heat");
	});

	it("keeps the first mention when a section is linked twice", () => {
		const entries = parseArticleIndex("[[s0-intro|First]]\n\nsee [[s0-intro|again]]").entries;
		expect(entries).toHaveLength(1);
		expect(entries[0]?.label).toBe("First");
	});

	it("reports no title rather than inventing one when there is no frontmatter", () => {
		const index = parseArticleIndex("## Contents\n\n1. [[s0-intro]]\n");
		expect(index.title).toBeNull();
		expect(index.entries).toHaveLength(1);
	});

	it("finds nothing in an index with no links, instead of failing", () => {
		expect(parseArticleIndex("---\ntitle: Empty\n---\nNothing yet.\n").entries).toEqual([]);
	});
});

// The vault writes its indexes both ways: the English notes use Obsidian's
// wikilinks, the Russian ones plain Markdown links to the same files.
describe("parseArticleIndex, on plain Markdown links", () => {
	const INDEX = `---
title: Как я превратил старый OnePlus 3T в домашний сервер
lang: ru
---

## Содержание

1. [Зачем старый телефон](sections/s0-introduction.md)
2. [Ставим Linux на телефон](sections/s1-getting-linux-on-the-phone.md)
`;

	it("reads the sections a Markdown-linked index lists", () => {
		const index = parseArticleIndex(INDEX);
		expect(index.title).toBe("Как я превратил старый OnePlus 3T в домашний сервер");
		expect(index.entries).toEqual([
			{ id: "s0-introduction", label: "Зачем старый телефон" },
			{ id: "s1-getting-linux-on-the-phone", label: "Ставим Linux на телефон" },
		]);
	});

	it("keeps reading order across an index that mixes both styles", () => {
		const text = "1. [[s0-intro]]\n2. [Second](sections/s1-second.md)\n3. [[s2-third]]\n";
		expect(parseArticleIndex(text).entries.map((entry) => entry.id)).toEqual([
			"s0-intro",
			"s1-second",
			"s2-third",
		]);
	});

	it("ignores links that do not point at a note in the vault", () => {
		// An index is prose too; a repository link is not a section.
		const text = "See [the repo](https://github.com/arttttt/x) and [a note](sections/s0-intro.md).";
		expect(parseArticleIndex(text).entries.map((entry) => entry.id)).toEqual(["s0-intro"]);
	});

	it("ignores an embedded image", () => {
		const text = "![diagram](sections/diagram.md)\n\n1. [Real](sections/s0-intro.md)";
		expect(parseArticleIndex(text).entries.map((entry) => entry.id)).toEqual(["s0-intro"]);
	});

	it("decodes an escaped space in a link target", () => {
		expect(parseArticleIndex("[A](sections/s0%20intro.md)").entries[0]?.id).toBe("s0 intro");
	});

	it("drops a fragment from a Markdown link as it does from a wikilink", () => {
		expect(parseArticleIndex("[A](sections/s0-intro.md#heat)").entries[0]?.id).toBe("s0-intro");
	});

	it("does not count the same section twice when both styles name it", () => {
		const text = "1. [[s0-intro|Wiki]]\n2. [Markdown](sections/s0-intro.md)\n";
		expect(parseArticleIndex(text).entries).toEqual([{ id: "s0-intro", label: "Wiki" }]);
	});
});

describe("links Obsidian actually writes", () => {
	it("reduces a wikilink carrying a path to the note's own name", () => {
		// Obsidian writes the full path as soon as a basename is ambiguous, and
		// every article here has an `s0-`. Taken verbatim the id became
		// `sections/s0-introduction`, the reader looked under `sections/sections/`,
		// and the whole article failed to open.
		const index = parseArticleIndex("- [[sections/s0-introduction|Why an old phone]]");
		expect(index.entries[0]?.id).toBe("s0-introduction");
		expect(index.entries[0]?.label).toBe("Why an old phone");
	});

	it("drops the extension a wikilink sometimes carries", () => {
		expect(parseArticleIndex("- [[s0-intro.md]]").entries[0]?.id).toBe("s0-intro");
	});

	it("treats one file named two ways as one section", () => {
		// The vault sits on a case-insensitive disk, so these are one file.
		const index = parseArticleIndex("- [[s0-intro]]\n- [[S0-Intro]]");
		expect(index.entries).toHaveLength(1);
	});

	it("ignores a link that climbs out of this article", () => {
		// Reduced to a basename it would resolve to this article's own section
		// and take a place in its reading order.
		const index = parseArticleIndex("See [the other piece](../another/sections/s0-introduction.md)");
		expect(index.entries).toEqual([]);
	});

	it("ignores an example inside a fenced block", () => {
		// An index that documents its own format contributed a phantom section,
		// and the reader then failed the article looking for a file nobody wrote.
		const index = parseArticleIndex("```md\n[[s9-example]]\n```\n\n- [[s0-intro]]");
		expect(index.entries.map((entry) => entry.id)).toEqual(["s0-intro"]);
	});
});
