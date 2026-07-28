import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

/**
 * How long the plugin has to answer.
 *
 * Generous, because reading an article is many small requests and a busy
 * Obsidian is slow rather than broken — but finite, because the interface asks
 * again every ten seconds and a request that never settles is one more socket
 * and one more promise held for the life of the process.
 */
const TIMEOUT = 15_000;

/**
 * What reading the vault needs from the outside, and no more. Keeping it this
 * narrow is what lets the reader be exercised against a stub server rather than
 * against a running Obsidian.
 */
export interface VaultHttp {
	/** Entry names in a folder; a trailing `/` marks a folder. */
	listDirectory(path: string): Promise<readonly string[]>;
	readFile(path: string): Promise<string>;
	/**
	 * Writes a note, creating it if it is not there.
	 *
	 * The only thing Pressroom writes, and it goes through the plugin like
	 * everything else — which is the point of reaching the vault this way.
	 * Obsidian stays the one process touching its own files, so the note is not
	 * changed under an open editor or raced with the folder's syncing.
	 */
	writeFile(path: string, contents: string): Promise<void>;
}

/**
 * Nothing is at that path — which for several things is the ordinary answer,
 * not a failure: an article that has been nowhere has no `published.md`, and
 * most articles have no announcement written for most platforms.
 *
 * It has to be its own type because the alternative was catching every error
 * alike. That is how a plugin answering 500 came to mean "this article has
 * been published nowhere", one keystroke before the whole record was rewritten
 * from that emptiness.
 */
export class VaultPathMissing extends Error {
	constructor(readonly path: string) {
		super(`The vault has nothing at '${path}'.`);
		this.name = "VaultPathMissing";
	}
}

/**
 * The plugin could not be reached, or could not be trusted.
 *
 * Distinct from an answer that merely says no: only this one means the
 * connection itself is suspect and worth starting over, certificate and all.
 */
export class VaultUnreachable extends Error {
	constructor(message: string) {
		super(message);
		this.name = "VaultUnreachable";
	}
}

export interface ObsidianRestConfig {
	/** Where the plugin listens, e.g. `https://127.0.0.1:27124`. */
	readonly baseUrl: string;
	readonly apiKey: string;
	/**
	 * PEM of the certificate authority the plugin generated for itself.
	 *
	 * The plugin serves HTTPS with a self-signed certificate, so without this
	 * every request fails verification. Pinning that one authority keeps
	 * verification on, which blanket-disabling it would not.
	 */
	readonly certificate?: string;
}

/** Reads the vault over the Obsidian Local REST API plugin. */
export class ObsidianRestClient implements VaultHttp {
	constructor(private readonly config: ObsidianRestConfig) {}

	async listDirectory(path: string): Promise<readonly string[]> {
		const withSlash = path.endsWith("/") ? path : `${path}/`;
		const body = await this.send("GET", withSlash, { Accept: "application/json" });
		const parsed: unknown = JSON.parse(body);
		const files = (parsed as { files?: unknown }).files;
		if (!Array.isArray(files)) {
			throw new Error(`The plugin answered for '${path}' without a list of files.`);
		}
		return files.filter((entry): entry is string => typeof entry === "string");
	}

	readFile(path: string): Promise<string> {
		return this.send("GET", path, { Accept: "text/markdown" });
	}

	async writeFile(path: string, contents: string): Promise<void> {
		await this.send("PUT", path, { "Content-Type": "text/markdown; charset=utf-8" }, contents);
	}

	private send(
		method: string,
		path: string,
		headers: Readonly<Record<string, string>>,
		body?: string,
	): Promise<string> {
		// Refused before the address is built, because `new URL` resolves `..`
		// after the encoding — `encodeURIComponent("..")` is `".."` — so a slug
		// climbing out of the vault would leave the `/vault/` prefix behind
		// entirely. Nothing in the vault can produce one; a renderer asking for
		// it is not asking for anything this application does.
		if (path.split("/").includes("..")) {
			// Rejected rather than thrown: `send` is not async, and a caller
			// that wrote `.catch(…)` would not see a synchronous throw.
			return Promise.reject(new Error(`'${path}' points outside the vault.`));
		}
		const url = new URL(`${this.config.baseUrl.replace(/\/$/, "")}/vault/${encodePath(path)}`);
		const send = url.protocol === "https:" ? httpsRequest : httpRequest;
		const payload = body === undefined ? undefined : Buffer.from(body, "utf8");

		return new Promise((resolve, reject) => {
			const call = send(
				url,
				{
					method,
					headers: {
						Authorization: `Bearer ${this.config.apiKey}`,
						...headers,
						...(payload === undefined ? {} : { "Content-Length": String(payload.byteLength) }),
					},
					...(this.config.certificate === undefined ? {} : { ca: this.config.certificate }),
					// A plugin that accepts the connection and then says nothing
					// would otherwise leave this promise pending for the life of
					// the process — and the interface polls, so they accumulate.
					timeout: TIMEOUT,
				},
				(response) => {
					const chunks: Buffer[] = [];
					response.on("data", (chunk: Buffer) => chunks.push(chunk));
					// The connection can drop after the headers and before the
					// body; unheard, that is an unhandled error in the main
					// process rather than an answer the interface can show.
					response.on("error", (cause: NodeJS.ErrnoException) =>
						reject(new VaultUnreachable(describeTransport(cause, url))),
					);
					response.on("end", () => {
						const body = Buffer.concat(chunks).toString("utf8");
						const status = response.statusCode ?? 0;
						if (status >= 200 && status < 300) resolve(body);
						else if (status === 404) reject(new VaultPathMissing(path));
						else reject(failureFor(status, path));
					});
				},
			);
			call.on("timeout", () => {
				call.destroy();
				reject(new VaultUnreachable(`${url.origin} accepted the request and did not answer.`));
			});
			call.on("error", (cause: NodeJS.ErrnoException) =>
				reject(new VaultUnreachable(describeTransport(cause, url))),
			);
			call.end(payload);
		});
	}
}

/**
 * Fetches the plugin's certificate authority **without verifying it** — there
 * is nothing to verify it against yet.
 *
 * This is trust on first use, and it is a separate, named call rather than a
 * fallback inside the request path so that it cannot happen unnoticed. It is
 * only defensible because the plugin listens on the loopback interface: a
 * request that never leaves the machine has no network to be intercepted on.
 */
export function fetchPluginCertificate(baseUrl: string): Promise<string> {
	const url = new URL(`${baseUrl.replace(/\/$/, "")}/obsidian-local-rest-api.crt`);
	return new Promise((resolve, reject) => {
		const call = httpsRequest(
			url,
			{ method: "GET", rejectUnauthorized: false, timeout: TIMEOUT },
			(response) => {
				const chunks: Buffer[] = [];
				response.on("data", (chunk: Buffer) => chunks.push(chunk));
				response.on("error", (cause: NodeJS.ErrnoException) =>
					reject(new VaultUnreachable(describeTransport(cause, url))),
				);
				response.on("end", () => {
					const status = response.statusCode ?? 0;
					if (status >= 200 && status < 300) resolve(Buffer.concat(chunks).toString("utf8"));
					else reject(new VaultUnreachable(`The plugin did not hand out its certificate (HTTP ${status}).`));
				});
			},
		);
		call.on("timeout", () => {
			call.destroy();
			reject(new VaultUnreachable(`${url.origin} accepted the request and did not answer.`));
		});
		call.on("error", (cause: NodeJS.ErrnoException) =>
			reject(new VaultUnreachable(describeTransport(cause, url))),
		);
		call.end();
	});
}

function encodePath(path: string): string {
	return path
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");
}

/**
 * What an answer that is not a success means.
 *
 * The plugin's own error body is deliberately not repeated: it is remote text,
 * it lands in the interface and in any screenshot of it, and it has never
 * carried anything the status and the path do not already say.
 */
function failureFor(status: number, path: string): Error {
	if (status === 401 || status === 403) {
		return new Error("The plugin rejected the API key. Check the key in Obsidian's Local REST API settings.");
	}
	// A plugin answering 5xx is a plugin in trouble, and the next attempt is
	// worth making on a fresh connection.
	if (status >= 500) return new VaultUnreachable(`The plugin answered ${status} for '${path}'.`);
	return new Error(`The plugin answered ${status} for '${path}'.`);
}

function describeTransport(cause: NodeJS.ErrnoException, url: URL): string {
	if (cause.code === "ECONNREFUSED") {
		return `Nothing is listening at ${url.origin}. Obsidian must be running with the Local REST API plugin enabled.`;
	}
	if (cause.code?.includes("SELF_SIGNED") === true || cause.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
		return `The certificate at ${url.origin} could not be verified. Pass the plugin's own certificate as \`certificate\`.`;
	}
	return `Could not reach ${url.origin}: ${cause.message}`;
}
