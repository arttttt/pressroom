import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { DEFAULT_BASE_URL, type Settings, type SettingsUpdate } from "../../shared/settings.js";
import type { SecretCipher } from "./cipher.js";

/** The settings plus the secret, which only the main process ever holds. */
export interface StoredSettings {
	readonly baseUrl: string;
	readonly apiKey: string | null;
}

/** What lands on disk: the key encrypted, never the key. */
interface SettingsFile {
	readonly baseUrl?: string;
	/** Base64 of the ciphertext. */
	readonly apiKey?: string;
}

/**
 * Keeps the settings between runs.
 *
 * The file itself is not a secret — the key inside it is encrypted with one the
 * operating system holds. Losing the keychain entry therefore loses the key and
 * not the settings, which is why an unreadable secret clears that field instead
 * of failing the whole read: the author retypes a key rather than losing where
 * their vault is.
 */
export class SettingsStore {
	constructor(
		private readonly file: string,
		private readonly cipher: SecretCipher,
	) {}

	async read(): Promise<StoredSettings> {
		const contents = await readFile(this.file, "utf8").catch(() => null);
		if (contents === null) return { baseUrl: DEFAULT_BASE_URL, apiKey: null };

		const parsed = parse(contents);
		return {
			baseUrl: parsed.baseUrl ?? DEFAULT_BASE_URL,
			apiKey: this.decrypt(parsed.apiKey),
		};
	}

	async save(update: SettingsUpdate): Promise<StoredSettings> {
		const current = await this.read();
		const apiKey = nextKey(current.apiKey, update);
		if (apiKey !== null && !this.cipher.isAvailable()) {
			throw new Error(
				"This machine offers no keychain to encrypt the API key with, so it will not be written to disk.",
			);
		}

		const next: SettingsFile = {
			baseUrl: update.baseUrl,
			...(apiKey === null ? {} : { apiKey: this.cipher.encrypt(apiKey).toString("base64") }),
		};

		await mkdir(dirname(this.file), { recursive: true });
		// Written beside and moved into place, because a bare write truncates
		// first: a crash between the two leaves an empty file, and a read
		// landing in that window — the interface polls, so one will — reports
		// the key as missing and the vault as unreachable.
		const beside = `${this.file}.writing`;
		await writeFile(beside, `${JSON.stringify(next, null, 2)}\n`, "utf8");
		await rename(beside, this.file);
		return { baseUrl: update.baseUrl, apiKey };
	}

	private decrypt(stored: string | undefined): string | null {
		if (stored === undefined || stored.length === 0) return null;
		try {
			return this.cipher.decrypt(Buffer.from(stored, "base64"));
		} catch {
			// Written by another installation, or the keychain entry is gone.
			return null;
		}
	}
}

/** What the interface may know: everything except the key itself. */
export function visible(stored: StoredSettings): Settings {
	return { baseUrl: stored.baseUrl, hasApiKey: stored.apiKey !== null };
}

function nextKey(current: string | null, update: SettingsUpdate): string | null {
	switch (update.apiKey.kind) {
		case "unchanged":
			return current;
		case "set":
			return update.apiKey.value.trim().length === 0 ? null : update.apiKey.value.trim();
		case "cleared":
			return null;
	}
}

function parse(contents: string): SettingsFile {
	try {
		const parsed: unknown = JSON.parse(contents);
		return typeof parsed === "object" && parsed !== null ? (parsed as SettingsFile) : {};
	} catch {
		// A settings file someone hand-edited into invalid JSON should not stop
		// the application from starting; it starts from the defaults instead.
		return {};
	}
}
