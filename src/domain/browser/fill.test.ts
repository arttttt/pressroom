import { describe, expect, it } from "vitest";
import { type FieldFill, type FillOutcome, fillScript } from "./fill.js";

/**
 * An input whose framework watches the setter on its prototype — and which
 * also carries a value of its own, shadowing that setter, exactly as React
 * does. Assigning to `.value` writes the shadow and the framework sees
 * nothing; only the prototype's setter reaches `seen`.
 */
class FrameworkInput {
	seen: string | null = null;
	readonly events: string[] = [];

	get value(): string {
		return this.seen ?? "";
	}

	set value(next: string) {
		this.seen = next;
	}

	focus(): void {}

	dispatchEvent(event: { readonly type: string }): void {
		this.events.push(event.type);
	}
}

/** The shadow React puts on the element itself. */
function shadowed(input: FrameworkInput): FrameworkInput {
	Object.defineProperty(input, "value", { value: "", writable: true, configurable: true });
	return input;
}

/** A rich editor's box: no value to assign, only text that can be typed in. */
class EditableBox {
	focused = false;
	readonly typed: string[] = [];
	readonly events: string[] = [];
	value = "";

	focus(): void {
		this.focused = true;
	}

	dispatchEvent(event: { readonly type: string }): void {
		this.events.push(event.type);
	}
}

/**
 * Runs the injected source itself, with nothing in scope but the two globals
 * a page supplies. Anything the function reached for from our own modules
 * would be undefined here — which is the point of running it this way.
 */
function inject(elements: Record<string, unknown>, fields: readonly FieldFill[]): FillOutcome {
	const selected: unknown[] = [];
	const page = {
		querySelector: (selector: string) => elements[selector] ?? null,
		createRange: () => ({ selectNodeContents: (node: unknown) => selected.push(node) }),
		getSelection: () => ({ removeAllRanges: () => {}, addRange: () => {} }),
		execCommand: (command: string, _showUi: boolean, text: string) => {
			for (const node of selected) (node as EditableBox).typed.push(`${command}:${text}`);
			return true;
		},
	};
	class PageEvent {
		readonly type: string;
		readonly bubbles: boolean;
		constructor(type: string, init?: { bubbles?: boolean }) {
			this.type = type;
			this.bubbles = init?.bubbles ?? false;
		}
	}
	const run = new Function("document", "Event", `return ${fillScript(fields)}`) as (
		page: unknown,
		event: unknown,
	) => FillOutcome;
	return run(page, PageEvent);
}

const TITLE: FieldFill = {
	name: "the title",
	selector: "#title",
	value: "Как я превратил старый OnePlus 3T в домашний сервер",
	into: "field",
};

describe("filling a form field", () => {
	it("moves the value where the page's own framework will see it", () => {
		const input = shadowed(new FrameworkInput());
		const outcome = inject({ "#title": input }, [TITLE]);
		// Assigning straight to `.value` would leave this null and the editor
		// would look filled while holding nothing.
		expect(input.seen).toBe(TITLE.value);
		expect(outcome).toEqual({ filled: ["the title"], missing: [] });
	});

	it("says the value moved, in the event frameworks listen for", () => {
		const input = shadowed(new FrameworkInput());
		inject({ "#title": input }, [TITLE]);
		expect(input.events).toEqual(["input", "change"]);
	});

	it("works on a plain field with no setter of its own to go through", () => {
		const plain = { value: "", focus() {}, dispatchEvent() {} };
		inject({ "#title": plain }, [TITLE]);
		expect(plain.value).toBe(TITLE.value);
	});
});

describe("filling a rich editor", () => {
	it("types the text in rather than assigning it, and focuses first", () => {
		// A rich editor keeps its own document; a value written onto the element
		// is not part of it and is discarded at the next keystroke.
		const box = new EditableBox();
		const outcome = inject({ ".editor": box }, [
			{ name: "the body", selector: ".editor", value: "## Раздел\n\nТекст.", into: "editable" },
		]);
		expect(box.focused).toBe(true);
		expect(box.typed).toEqual(["insertText:## Раздел\n\nТекст."]);
		expect(outcome.filled).toEqual(["the body"]);
	});
});

describe("when the page is not what it was", () => {
	it("names the field that has gone and fills the rest anyway", () => {
		// Someone else's editor changes without warning. Half of it filled is
		// worth having, and the name is what says which selector to fix.
		const input = shadowed(new FrameworkInput());
		const outcome = inject({ "#title": input }, [
			TITLE,
			{ name: "the body", selector: "#body", value: "Текст.", into: "field" },
		]);
		expect(outcome).toEqual({ filled: ["the title"], missing: ["the body"] });
		expect(input.seen).toBe(TITLE.value);
	});

	it("reports every field as missing when the page is a stranger", () => {
		const outcome = inject({}, [TITLE]);
		expect(outcome.filled).toEqual([]);
		expect(outcome.missing).toEqual(["the title"]);
	});
});

describe("the text that goes in", () => {
	it("survives everything an article can contain", () => {
		// The body is Markdown: backticks, quotes, newlines, backslashes and
		// non-Latin text all reach the page as text rather than as syntax.
		const awkward = 'Он сказал: "```js\\n`x` \\ ${y}\n</script> конец"';
		const box = shadowed(new FrameworkInput());
		inject({ "#body": box }, [
			{ name: "the body", selector: "#body", value: awkward, into: "field" },
		]);
		expect(box.seen).toBe(awkward);
	});

	it("goes in the order it was given, so the title is there before the body", () => {
		const order: string[] = [];
		const watching = (name: string) => ({
			set value(next: string) {
				order.push(`${name}=${next}`);
			},
			get value() {
				return "";
			},
			focus() {},
			dispatchEvent() {},
		});
		inject({ "#title": watching("title"), "#body": watching("body") }, [
			TITLE,
			{ name: "the body", selector: "#body", value: "Текст.", into: "field" },
		]);
		expect(order).toEqual([`title=${TITLE.value}`, "body=Текст."]);
	});
});
