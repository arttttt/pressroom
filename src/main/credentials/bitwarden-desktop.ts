import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { constants, createPrivateKey, generateKeyPairSync, privateDecrypt, randomUUID } from "node:crypto";
import type { Credential, CredentialProvider } from "../../domain/credentials/provider.js";
import { editorUrlFor } from "../../domain/platforms/registry.js";
import type { PlatformId } from "../../shared/platform.js";
import { decrypt, encrypt } from "./enc-string.js";
import { Frames, frame } from "./native-messaging.js";

/**
 * The login for a platform, out of the Bitwarden application already on this
 * Mac. No command line to install and no second copy of the vault.
 *
 * Bitwarden ships `desktop_proxy` beside the application for browsers to
 * launch, and speaks a small protocol through it: a handshake the person
 * approves in Bitwarden itself, and then encrypted commands, of which one —
 * `bw-credential-retrieval` — answers with the logins matching an address. It
 * exists for the DuckDuckGo browser, which is why it must be switched on under
 * "Allow DuckDuckGo browser integration" before it answers anybody.
 *
 * Written from the protocol rather than from Bitwarden's own code, which is
 * GPL-3.0 and would carry that licence into a project that is not. It is also
 * an internal protocol with no promise of staying still — the same standing as
 * a platform's editor markup, and isolated behind the same kind of port.
 */
const PROXY = "/Applications/Bitwarden.app/Contents/MacOS/desktop_proxy";

/** A person pressing a button in another application is not a fast operation. */
const APPROVAL_PATIENCE = 120_000;
const ANSWER_PATIENCE = 30_000;

/**
 * The helper exits at once when it has nothing to relay to, so this is what a
 * closed pipe almost always means — and it says what to do about it, which
 * `write EPIPE` does not.
 */
const NOT_RUNNING = "Bitwarden does not seem to be running. Open it, unlock it, and try again.";

export class BitwardenDesktop implements CredentialProvider {
	readonly id = "bitwarden-desktop";
	readonly #proxyPath: string;
	#talking: Conversation | null = null;

	constructor(proxyPath: string = PROXY) {
		this.#proxyPath = proxyPath;
	}

	/** Whether Bitwarden is there, answering, and unlocked. */
	async isAvailable(): Promise<boolean> {
		try {
			return (await this.#accounts()).some((account) => account.status === "unlocked");
		} catch {
			return false;
		}
	}

	async get(platform: PlatformId): Promise<Credential> {
		const site = new URL(editorUrlFor(platform)).origin;
		const answer = await this.#ask("bw-credential-retrieval", { uri: site });

		if (isRecord(answer) && answer["error"] === "locked") {
			throw new Error("Bitwarden is locked. Unlock it and try again.");
		}
		const found = Array.isArray(answer) ? answer.filter(isLogin) : [];
		if (found.length === 0) {
			throw new Error(`Bitwarden has no login for ${site}.`);
		}
		// More than one is not an error to stop at — the first is very probably
		// right — but which one was used is reported back, so a wrong one is
		// visible immediately rather than after a failed sign-in.
		const [first] = found;
		if (first === undefined) throw new Error(`Bitwarden has no login for ${site}.`);
		return { username: first.userName, password: first.password };
	}

	/** Lets go of the conversation, and of the shared key with it. */
	close(): void {
		this.#talking?.close();
		this.#talking = null;
	}

	async #accounts(): Promise<readonly { readonly status: string }[]> {
		const answer = await this.#ask("bw-status", {});
		return Array.isArray(answer) ? answer.filter(hasStatus) : [];
	}

	/** Sends one encrypted command, opening the conversation if there is none. */
	async #ask(command: string, payload: object): Promise<unknown> {
		const talking = await this.#connected();
		try {
			return await talking.command(command, payload);
		} catch (cause) {
			// A conversation that has failed is not worth reusing: the proxy may
			// be gone, and the next attempt should start with a fresh handshake.
			this.close();
			throw cause;
		}
	}

	async #connected(): Promise<Conversation> {
		if (this.#talking !== null && this.#talking.alive) return this.#talking;
		const talking = Conversation.open(this.#proxyPath);
		try {
			await talking.handshake();
		} catch (cause) {
			talking.close();
			throw cause;
		}
		this.#talking = talking;
		return talking;
	}
}

/**
 * One run of the proxy, and the shared key established over it.
 *
 * Requests and answers are matched by an identifier carried on each, because
 * the channel is one pipe with no ordering promise — an answer to the second
 * question may well arrive before the answer to the first.
 */
class Conversation {
	readonly #proxy: ChildProcessWithoutNullStreams;
	readonly #frames = new Frames();
	readonly #waiting = new Map<string, { ok: (value: unknown) => void; bad: (cause: Error) => void }>();
	readonly #appId = randomUUID();
	#shared: Buffer | null = null;
	#ended: string | null = null;

	private constructor(proxy: ChildProcessWithoutNullStreams) {
		this.#proxy = proxy;

		proxy.stdout.on("data", (chunk: Buffer) => {
			let arrived: readonly unknown[];
			try {
				arrived = this.#frames.push(chunk);
			} catch (cause) {
				this.#end(cause instanceof Error ? cause.message : String(cause));
				return;
			}
			for (const message of arrived) this.#answer(message);
		});

		proxy.on("error", (cause) => this.#end(`Bitwarden's helper could not be run: ${cause.message}`));
		proxy.on("exit", () => this.#end(NOT_RUNNING));
		// Writing into a pipe whose far end has gone raises on the stream rather
		// than on the promise waiting for the answer. Unheard, that is an
		// uncaught exception in the main process — which is to say, the
		// application falling over because a password manager was not running.
		proxy.stdin.on("error", () => this.#end(NOT_RUNNING));
	}

	static open(proxyPath: string): Conversation {
		// Launched the way a browser launches it: talking over its own pipes,
		// with its noise kept out of ours.
		return new Conversation(spawn(proxyPath, [], { stdio: ["pipe", "pipe", "pipe"] }));
	}

	get alive(): boolean {
		return this.#ended === null;
	}

	/**
	 * Introduces this application to Bitwarden and takes the shared key back.
	 *
	 * A key pair per conversation, so nothing of ours is kept between runs; the
	 * cost is that the person approves again next time. Signing in to a
	 * platform happens when a session has died — rarely — so that is a fair
	 * trade for holding no long-lived secret.
	 */
	async handshake(): Promise<void> {
		const { publicKey, privateKey } = generateKeyPairSync("rsa", {
			modulusLength: 2048,
			publicKeyEncoding: { type: "spki", format: "der" },
			privateKeyEncoding: { type: "pkcs8", format: "der" },
		});

		const answer = await this.#send(
			{
				command: "bw-handshake",
				payload: { publicKey: publicKey.toString("base64"), applicationName: "Pressroom" },
			},
			APPROVAL_PATIENCE,
		);

		const payload = isRecord(answer) && isRecord(answer["payload"]) ? answer["payload"] : answer;
		if (!isRecord(payload)) throw new Error("Bitwarden answered the handshake with nothing.");
		if (payload["error"] === "canceled") {
			throw new Error("The request to read a login was declined in Bitwarden.");
		}
		const shared = payload["sharedKey"];
		if (typeof shared !== "string") {
			throw new Error(
				"Bitwarden did not share a key. Switch on 'Allow DuckDuckGo browser integration' in its settings, and unlock it.",
			);
		}

		this.#shared = privateDecrypt(
			{
				key: createPrivateKey({ key: privateKey, format: "der", type: "pkcs8" }),
				padding: constants.RSA_PKCS1_OAEP_PADDING,
				// SHA-1 because that is what the other end uses; it is the digest
				// inside OAEP's padding, not a signature, and changing it here
				// would simply not decrypt.
				oaepHash: "sha1",
			},
			Buffer.from(shared, "base64"),
		);
	}

	/** One command, encrypted going out and coming back. */
	async command(command: string, payload: object): Promise<unknown> {
		const shared = this.#shared;
		if (shared === null) throw new Error("There is no shared key yet.");

		const answer = await this.#send(
			{ appId: this.#appId, message: encrypt(JSON.stringify({ command, payload }), shared) },
			ANSWER_PATIENCE,
		);

		const sealed = isRecord(answer) ? answer["message"] : null;
		if (typeof sealed !== "string") {
			throw new Error(`Bitwarden's answer to ${command} was not an encrypted message.`);
		}
		const opened: unknown = JSON.parse(decrypt(sealed, shared));
		return isRecord(opened) && "payload" in opened ? opened["payload"] : opened;
	}

	close(): void {
		this.#end("The conversation was closed.");
		this.#proxy.kill();
	}

	#send(message: object, patience: number): Promise<unknown> {
		if (this.#ended !== null) return Promise.reject(new Error(this.#ended));
		const messageId = randomUUID();
		return new Promise((ok, bad) => {
			const timer = setTimeout(() => {
				this.#waiting.delete(messageId);
				bad(new Error("Bitwarden did not answer in time."));
			}, patience);
			this.#waiting.set(messageId, {
				ok: (value) => {
					clearTimeout(timer);
					ok(value);
				},
				bad: (cause) => {
					clearTimeout(timer);
					bad(cause);
				},
			});
			this.#proxy.stdin.write(frame({ ...message, messageId }), (cause) => {
				if (cause === null || cause === undefined) return;
				this.#waiting.get(messageId)?.bad(new Error(this.#ended ?? NOT_RUNNING));
				this.#waiting.delete(messageId);
			});
		});
	}

	/** Anything without an identifier we are waiting on is the proxy talking. */
	#answer(message: unknown): void {
		if (!isRecord(message)) return;
		const messageId = message["messageId"];
		if (typeof messageId !== "string") return;
		this.#waiting.get(messageId)?.ok(message);
		this.#waiting.delete(messageId);
	}

	#end(why: string): void {
		if (this.#ended !== null) return;
		this.#ended = why;
		for (const waiting of this.#waiting.values()) waiting.bad(new Error(why));
		this.#waiting.clear();
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLogin(value: unknown): value is { readonly userName: string; readonly password: string } {
	return isRecord(value) && typeof value["userName"] === "string" && typeof value["password"] === "string";
}

function hasStatus(value: unknown): value is { readonly status: string } {
	return isRecord(value) && typeof value["status"] === "string";
}
