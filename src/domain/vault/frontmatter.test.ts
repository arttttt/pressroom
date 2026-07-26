import { describe, expect, it } from "vitest";
import { splitFrontmatter } from "./frontmatter.js";

describe("splitFrontmatter", () => {
	it("reads the fields and hands back what follows", () => {
		const { fields, body } = splitFrontmatter("---\ntitle: A Note\nlang: en\n---\nProse.\n");
		expect(fields.get("title")).toBe("A Note");
		expect(fields.get("lang")).toBe("en");
		expect(body).toBe("Prose.\n");
	});

	it("treats a note without a block as all body", () => {
		const { fields, body } = splitFrontmatter("# Heading\n\nProse.");
		expect(fields.size).toBe(0);
		expect(body).toBe("# Heading\n\nProse.");
	});

	it("splits a value on its first colon only, so URLs survive", () => {
		const { fields } = splitFrontmatter("---\ncanonical: https://example.com/a:b\n---\n");
		expect(fields.get("canonical")).toBe("https://example.com/a:b");
	});

	it("leaves an unterminated block alone rather than swallowing the note", () => {
		// A stray `---` at the top of a draft must not eat everything below it.
		const text = "---\ntitle: Unfinished\n\n# Heading\n\nProse.";
		const { fields, body } = splitFrontmatter(text);
		expect(fields.size).toBe(0);
		expect(body).toBe(text);
	});

	it("ignores a delimiter that is not on the first line", () => {
		const text = "Prose.\n---\ntitle: Not frontmatter\n---\n";
		expect(splitFrontmatter(text).fields.size).toBe(0);
	});

	it("strips quotes a title needed only for the file format", () => {
		const { fields } = splitFrontmatter('---\ntitle: "A: colon in the title"\n---\n');
		expect(fields.get("title")).toBe("A: colon in the title");
	});

	it("survives carriage returns from a file written on another machine", () => {
		const { fields, body } = splitFrontmatter("---\r\ntitle: A Note\r\n---\r\nProse.");
		expect(fields.get("title")).toBe("A Note");
		expect(body).toBe("Prose.");
	});
});
