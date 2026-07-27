import { describe, expect, it } from "vitest";
import { PLATFORM_GUIDE } from "../../shared/guide.js";
import { PLATFORMS } from "./registry.js";

/**
 * The guide is prose about the same table the application acts on, so what is
 * worth checking is that the two cannot drift: a platform added to one and
 * forgotten in the other is a screen that silently omits it.
 */
describe("PLATFORM_GUIDE", () => {
	it("describes every platform in the table, and no others", () => {
		expect(Object.keys(PLATFORM_GUIDE).sort()).toEqual(PLATFORMS.map((p) => p.id).sort());
	});

	it("says what each one is, and what catches people out", () => {
		for (const platform of PLATFORMS) {
			const entry = PLATFORM_GUIDE[platform.id];
			expect(entry.what.length, platform.id).toBeGreaterThan(40);
			expect(entry.watch.length, platform.id).toBeGreaterThan(0);
		}
	});

	it("warns every announcement platform that it needs the article out first", () => {
		// The one that bites hardest and looks like a bug: a destination that
		// refuses to prepare anything until a publication has been recorded.
		for (const platform of PLATFORMS) {
			if (platform.carries !== "announcement") continue;
			const said = PLATFORM_GUIDE[platform.id].watch.join(" ");
			expect(said, platform.id).toMatch(/out somewhere first/);
		}
	});
});
