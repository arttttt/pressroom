import { type BrowserWindow, session, WebContentsView } from "electron";
import { stageOf } from "../../domain/browser/pilots.js";
import type { PageState, ViewBounds } from "../../shared/browser.js";
import { IPC } from "../../shared/ipc.js";
import type { PlatformId } from "../../shared/platform.js";
import { browserUserAgent, partitionFor } from "../sessions/partitions.js";

/**
 * A platform's own page, shown inside the application's window.
 *
 * One window is the application; the desk, an article and a platform's editor
 * are places within it. That makes the page a native view painted over the
 * interface rather than an element inside it, with two consequences worth
 * stating: the interface has to tell it where to sit, and it has to be taken
 * out of the window when the interface moves on. A view left attached under
 * another screen goes on receiving clicks meant for the interface.
 *
 * Taken out, not closed: a half-written editor is not something to throw away
 * because someone looked at the article behind it. The page keeps running and
 * comes back as it was left.
 */
/**
 * One platform's page: the view, and the code its last navigation came back
 * with. The code is worth keeping because a site can answer "sign in first" at
 * the very address its editor lives at, which no reading of the address finds.
 */
interface Open {
	readonly view: WebContentsView;
	status: number;
}

export class PlatformViews {
	readonly #host: BrowserWindow;
	readonly #open = new Map<PlatformId, Open>();
	#shown: PlatformId | null = null;

	constructor(host: BrowserWindow) {
		this.#host = host;
		host.on("closed", () => {
			for (const open of this.#open.values()) open.view.webContents.close();
			this.#open.clear();
			this.#shown = null;
		});
	}

	/** Brings a platform's page into the window, loading it the first time. */
	show(platform: PlatformId, bounds: ViewBounds, startAt: string): PageState {
		if (this.#shown !== null && this.#shown !== platform) this.hide();
		const open = this.#open.get(platform) ?? this.#load(platform, startAt);
		if (this.#shown !== platform) {
			this.#host.contentView.addChildView(open.view);
			this.#shown = platform;
		}
		open.view.setBounds(whole(bounds));
		return state(platform, open);
	}

	/** The window resized, or the interface around the page changed shape. */
	move(bounds: ViewBounds): void {
		this.#current()?.view.setBounds(whole(bounds));
	}

	/** Takes the page out of the window, leaving it running as it was. */
	hide(): void {
		const open = this.#current();
		if (open === undefined) return;
		this.#host.contentView.removeChildView(open.view);
		this.#shown = null;
	}

	go(url: string): void {
		void this.#current()?.view.webContents.loadURL(url);
	}

	reload(): void {
		this.#current()?.view.webContents.reload();
	}

	back(): void {
		const history = this.#current()?.view.webContents.navigationHistory;
		if (history?.canGoBack() === true) history.goBack();
	}

	/**
	 * Runs an expression inside the platform's page and answers with its value.
	 *
	 * `userGesture` is on because the things this is used for — moving focus
	 * into a field, typing into a rich editor — are refused to a page that
	 * nobody appears to have touched.
	 */
	async evaluate(platform: PlatformId, expression: string): Promise<unknown> {
		const open = this.#open.get(platform);
		if (open === undefined) throw new Error(`${platform} is not open.`);
		return open.view.webContents.executeJavaScript(expression, true);
	}

	/** What the page currently is, for the platform whose page is showing. */
	current(): PageState | null {
		const open = this.#current();
		return open === undefined || this.#shown === null ? null : state(this.#shown, open);
	}

	#current(): Open | undefined {
		return this.#shown === null ? undefined : this.#open.get(this.#shown);
	}

	#load(platform: PlatformId, startAt: string): Open {
		const partition = partitionFor(platform);
		// The user agent goes on the session rather than on the page, so every
		// request the page makes carries it and not only the first.
		session.fromPartition(partition).setUserAgent(browserUserAgent(process.versions.chrome));

		const view = new WebContentsView({
			webPreferences: {
				partition,
				contextIsolation: true,
				nodeIntegration: false,
				// Someone else's page, with no preload of ours to load: it gets the
				// full sandbox, unlike the interface's own window.
				sandbox: true,
				webviewTag: false,
			},
		});

		// Nothing escapes into a window of its own. A sign-in that opens a popup
		// is followed in the same view, which is where the person is looking.
		view.webContents.setWindowOpenHandler(({ url }) => {
			void view.webContents.loadURL(url);
			return { action: "deny" };
		});

		const open: Open = { view, status: 0 };
		const announce = () => this.#announce(platform, open);
		// Only a whole navigation carries a code; a move within the page keeps
		// whatever the page was served with, which is what it is still showing.
		view.webContents.on("did-navigate", (_event, _url, code) => {
			open.status = code;
			announce();
		});
		view.webContents.on("did-navigate-in-page", announce);
		view.webContents.on("did-start-loading", announce);
		view.webContents.on("did-stop-loading", announce);
		view.webContents.on("did-fail-load", announce);
		view.webContents.on("page-title-updated", announce);

		this.#open.set(platform, open);
		void view.webContents.loadURL(startAt);
		return open;
	}

	#announce(platform: PlatformId, open: Open): void {
		// The page goes on navigating for a moment after the window is gone.
		if (this.#host.isDestroyed() || open.view.webContents.isDestroyed()) return;
		this.#host.webContents.send(IPC.platformState, state(platform, open));
	}
}

function state(platform: PlatformId, open: Open): PageState {
	const url = open.view.webContents.getURL();
	return {
		platform,
		url,
		title: open.view.webContents.getTitle(),
		loading: open.view.webContents.isLoading(),
		stage: stageOf(platform, url, open.status),
		canGoBack: open.view.webContents.navigationHistory.canGoBack(),
	};
}

/**
 * Native views are placed in whole pixels; a measurement from the interface is
 * whatever the layout worked out. Rounding rather than truncating, so the page
 * does not sit a pixel short of the space left for it.
 */
function whole(bounds: ViewBounds): ViewBounds {
	return {
		x: Math.round(bounds.x),
		y: Math.round(bounds.y),
		width: Math.round(bounds.width),
		height: Math.round(bounds.height),
	};
}

const perWindow = new WeakMap<BrowserWindow, PlatformViews>();

/** The pages belonging to one window, made the first time that window asks. */
export function viewsFor(host: BrowserWindow): PlatformViews {
	const existing = perWindow.get(host);
	if (existing !== undefined) return existing;
	const made = new PlatformViews(host);
	perWindow.set(host, made);
	return made;
}
