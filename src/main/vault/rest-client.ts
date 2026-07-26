import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

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
				},
				(response) => {
					const chunks: Buffer[] = [];
					response.on("data", (chunk: Buffer) => chunks.push(chunk));
					response.on("end", () => {
						const body = Buffer.concat(chunks).toString("utf8");
						const status = response.statusCode ?? 0;
						if (status >= 200 && status < 300) resolve(body);
						else reject(new Error(describeFailure(status, path, body)));
					});
				},
			);
			call.on("error", (cause: NodeJS.ErrnoException) => reject(new Error(describeTransport(cause, url))));
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
		const call = httpsRequest(url, { method: "GET", rejectUnauthorized: false }, (response) => {
			const chunks: Buffer[] = [];
			response.on("data", (chunk: Buffer) => chunks.push(chunk));
			response.on("end", () => {
				const status = response.statusCode ?? 0;
				if (status >= 200 && status < 300) resolve(Buffer.concat(chunks).toString("utf8"));
				else reject(new Error(`The plugin did not hand out its certificate (HTTP ${status}).`));
			});
		});
		call.on("error", (cause: NodeJS.ErrnoException) => reject(new Error(describeTransport(cause, url))));
		call.end();
	});
}

function encodePath(path: string): string {
	return path
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");
}

function describeFailure(status: number, path: string, body: string): string {
	if (status === 401) {
		return "The plugin rejected the API key. Check the key in Obsidian's Local REST API settings.";
	}
	if (status === 404) return `The vault has nothing at '${path}'.`;
	return `The plugin answered ${status} for '${path}': ${body.slice(0, 200)}`;
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
