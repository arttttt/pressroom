import { describe, expect, it } from "vitest";
import { parseSectionNote } from "./section-note.js";

describe("parseSectionNote", () => {
	it("separates the note's own heading from its prose", () => {
		const note = parseSectionNote("# Why an old phone\n\nI'd wanted to self-host.\n");
		expect(note.heading).toBe("Why an old phone");
		expect(note.body).toBe("I'd wanted to self-host.");
	});

	it("finds the heading past leading blank lines", () => {
		expect(parseSectionNote("\n\n# Deploying the service\n\nProse.").heading).toBe(
			"Deploying the service",
		);
	});

	it("keeps sub-headings in the body where the author put them", () => {
		const note = parseSectionNote("# Network access\n\n## Tailscale\n\nProse.");
		expect(note.heading).toBe("Network access");
		expect(note.body).toBe("## Tailscale\n\nProse.");
	});

	it("does not promote a note that opens at the second level", () => {
		// Its author meant that as content; taking it would restructure the article.
		const note = parseSectionNote("## Tailscale\n\nProse.");
		expect(note.heading).toBeNull();
		expect(note.body).toBe("## Tailscale\n\nProse.");
	});

	it("reports no heading rather than guessing one", () => {
		const note = parseSectionNote("Just prose, no heading.\n");
		expect(note.heading).toBeNull();
		expect(note.body).toBe("Just prose, no heading.");
	});

	it("ignores frontmatter a section note happens to carry", () => {
		const note = parseSectionNote("---\nstatus: draft\n---\n# Heading\n\nProse.");
		expect(note.heading).toBe("Heading");
		expect(note.body).toBe("Prose.");
	});

	it("does not read a hashtag as a heading", () => {
		expect(parseSectionNote("#draft\n\nProse.").heading).toBeNull();
	});
});

describe("a note as it comes off a synced disk", () => {
	it("finds the heading through Windows line endings", () => {
		// It came back null, and the article then took the section's name from
		// the file stem — silently, and only for notes saved on Windows.
		expect(parseSectionNote("# Reproducing it\r\n\r\nProse").heading).toBe("Reproducing it");
	});

	it("finds the heading through a byte-order mark", () => {
		expect(parseSectionNote("﻿# Reproducing it\n\nProse").heading).toBe("Reproducing it");
	});

	it("treats a heading nobody has written yet as no heading", () => {
		// An empty string defeats the reader's fallback chain, which tests for
		// absence, and publishes a bare `##` into the article.
		expect(parseSectionNote("# \n\nProse").heading).toBeNull();
	});
});
