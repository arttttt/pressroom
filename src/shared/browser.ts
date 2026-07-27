import type { PlatformId } from "./platform.js";

/**
 * Where a platform's page sits inside the window, in CSS pixels from the top
 * left of the content area.
 *
 * A platform's page is a native view painted over the interface rather than an
 * element inside it, so the interface cannot lay it out. It leaves a hole,
 * measures it, and says where it is.
 */
export interface ViewBounds {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/**
 * What a platform's page currently is.
 *
 * The distinction is the reason Pressroom watches at all: each of these is a
 * different thing to offer, and anywhere else nothing is offered — a title
 * typed into a search box helps nobody.
 *
 * Being turned away and standing at the form are two stages rather than one
 * because they need opposite things: the first needs taking to the form, and
 * the second needs a login put into it.
 */
export type Stage = "sign-in-needed" | "signing-in" | "editor" | "elsewhere";

/**
 * The moves the interface can make on a platform's page.
 *
 * Four named moves rather than an address to load: the interface does not know
 * where anyone's editor is, and it should not be able to send a logged-in
 * session anywhere it is asked to.
 */
export type Navigation = "editor" | "sign-in" | "back" | "reload";

/** The platform's page, as the interface around it needs to know it. */
export interface PageState {
	readonly platform: PlatformId;
	readonly url: string;
	readonly title: string;
	readonly loading: boolean;
	readonly stage: Stage;
	readonly canGoBack: boolean;
}

/**
 * What came of putting text into a page.
 *
 * A field that is not there is the failure to expect: these selectors describe
 * someone else's editor, and it changes without warning. Saying which field
 * went missing is the difference between a bug report and a shrug — so the
 * fields are named, and a partial fill says what it did manage.
 */
export type FillResult =
	| { readonly kind: "filled"; readonly filled: readonly string[] }
	| {
			readonly kind: "incomplete";
			readonly filled: readonly string[];
			readonly missing: readonly string[];
	  }
	| { readonly kind: "failed"; readonly reason: string };
