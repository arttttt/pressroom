/**
 * Putting text into somebody else's page.
 *
 * This code does not run in Pressroom. It is serialised with `toString()` and
 * evaluated inside the platform's page, which is why it closes over nothing:
 * every capability it uses arrives as an argument, because an import would
 * simply not be there. `fillScript` builds the one expression that supplies
 * them, and the tests rebuild the function from that same source with nothing
 * but `document` and `Event` in scope — so a stray reference fails there
 * rather than silently in a page nobody is watching.
 */

/** Where a value goes: a form field, or the box of a rich editor. */
export type Into = "field" | "editable";

export interface FieldFill {
	/** What to call this when it cannot be found. */
	readonly name: string;
	readonly selector: string;
	readonly value: string;
	readonly into: Into;
}

/**
 * The little of a page this touches.
 *
 * Declared here rather than taken from the DOM library because the process
 * that sends this code deliberately has no DOM — and because a page arriving
 * as an argument is what lets a test hand it one it can inspect.
 */
export interface PageField {
	value: string;
	focus(): void;
	dispatchEvent(event: object): void;
}

export interface Page {
	find(selector: string): PageField | null;
	/** An event of this type that bubbles, for saying the value moved. */
	event(type: string): object;
	/** Types text into an element, as a person's keyboard would. */
	insertText(element: PageField, text: string): void;
}

export interface FillOutcome {
	readonly filled: readonly string[];
	readonly missing: readonly string[];
}

/**
 * Fills what it can and reports what it could not, rather than stopping at the
 * first field that has moved.
 *
 * Half an editor filled in is worth having — the title is there and the body
 * can be pasted — and the name of the field that went missing is what tells
 * whoever fixes it which selector the platform changed.
 */
export function fillFields(page: Page, fields: readonly FieldFill[]): FillOutcome {
	// Declared inside, because this function is serialised whole: anything it
	// called from outside would not exist in the page it runs in.
	function setValue(element: PageField, value: string): void {
		// React keeps its own copy of what an input holds and ignores an `input`
		// event carrying a value it believes is already there — assigning to
		// `.value` writes past that copy and the change is discarded. Going
		// through the setter on the element's prototype is what makes it
		// visible. Vue reads the element back and does not care either way, so
		// the one path serves both.
		const prototype: unknown = Object.getPrototypeOf(element);
		const setter = Object.getOwnPropertyDescriptor(prototype as object, "value")?.set;
		if (setter === undefined) element.value = value;
		else setter.call(element, value);
	}

	const filled: string[] = [];
	const missing: string[] = [];

	for (const field of fields) {
		const element = page.find(field.selector);
		if (element === null) {
			missing.push(field.name);
			continue;
		}
		if (field.into === "editable") {
			page.insertText(element, field.value);
		} else {
			setValue(element, field.value);
			element.dispatchEvent(page.event("input"));
			element.dispatchEvent(page.event("change"));
		}
		filled.push(field.name);
	}

	return { filled, missing };
}

/**
 * The whole expression to evaluate in the platform's page: the function above,
 * the page facilities it asks for, and the values to put in.
 *
 * Values go through `JSON.stringify` rather than into a quoted template, so an
 * article full of backticks, quotes and newlines is text rather than syntax.
 */
export function fillScript(fields: readonly FieldFill[]): string {
	return `(${fillFields})({
	find: (selector) => document.querySelector(selector),
	event: (type) => new Event(type, { bubbles: true }),
	insertText: (element, text) => {
		element.focus();
		const range = document.createRange();
		range.selectNodeContents(element);
		const selection = document.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
		document.execCommand("insertText", false, text);
	},
}, ${JSON.stringify(fields)})`;
}
