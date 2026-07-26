import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_BASE_URL } from "../../shared/settings.js";
import type { SecretCipher } from "./cipher.js";
import { SettingsStore, visible } from "./store.js";

/** Stands in for the keychain: reversible, and obviously not the plaintext. */
function fakeCipher(overrides: Partial<SecretCipher> = {}): SecretCipher {
	return {
		isAvailable: () => true,
		encrypt: (value) => Buffer.from(`sealed:${value}`, "utf8"),
		decrypt: (value) => {
			const text = value.toString("utf8");
			if (!text.startsWith("sealed:")) throw new Error("not ours");
			return text.slice("sealed:".length);
		},
		...overrides,
	};
}

let folder: string;
let file: string;

beforeEach(async () => {
	folder = await mkdtemp(join(tmpdir(), "pressroom-settings-"));
	file = join(folder, "nested", "settings.json");
});

afterEach(async () => {
	await rm(folder, { recursive: true, force: true });
});

describe("SettingsStore", () => {
	it("starts from the plugin's own address with nothing stored", async () => {
		expect(await new SettingsStore(file, fakeCipher()).read()).toEqual({
			baseUrl: DEFAULT_BASE_URL,
			apiKey: null,
		});
	});

	it("keeps the address and the key between runs", async () => {
		const store = new SettingsStore(file, fakeCipher());
		await store.save({ baseUrl: "https://127.0.0.1:27124", apiKey: { kind: "set", value: "abc123" } });

		const reopened = new SettingsStore(file, fakeCipher());
		expect(await reopened.read()).toEqual({ baseUrl: "https://127.0.0.1:27124", apiKey: "abc123" });
	});

	it("never writes the key in the clear", async () => {
		const store = new SettingsStore(file, fakeCipher());
		await store.save({ baseUrl: DEFAULT_BASE_URL, apiKey: { kind: "set", value: "abc123" } });
		expect(await readFile(file, "utf8")).not.toContain("abc123");
	});

	it("leaves the stored key alone when the address changes", async () => {
		const store = new SettingsStore(file, fakeCipher());
		await store.save({ baseUrl: DEFAULT_BASE_URL, apiKey: { kind: "set", value: "abc123" } });
		const saved = await store.save({ baseUrl: "https://localhost:27124", apiKey: { kind: "unchanged" } });
		expect(saved).toEqual({ baseUrl: "https://localhost:27124", apiKey: "abc123" });
	});

	it("forgets the key when asked to", async () => {
		const store = new SettingsStore(file, fakeCipher());
		await store.save({ baseUrl: DEFAULT_BASE_URL, apiKey: { kind: "set", value: "abc123" } });
		expect(await store.save({ baseUrl: DEFAULT_BASE_URL, apiKey: { kind: "cleared" } })).toEqual({
			baseUrl: DEFAULT_BASE_URL,
			apiKey: null,
		});
		expect(await readFile(file, "utf8")).not.toContain("sealed");
	});

	it("treats a key of nothing but spaces as no key", async () => {
		const store = new SettingsStore(file, fakeCipher());
		expect(
			(await store.save({ baseUrl: DEFAULT_BASE_URL, apiKey: { kind: "set", value: "   " } })).apiKey,
		).toBeNull();
	});

	it("trims a key pasted with a stray newline", async () => {
		const store = new SettingsStore(file, fakeCipher());
		const saved = await store.save({ baseUrl: DEFAULT_BASE_URL, apiKey: { kind: "set", value: "abc123\n" } });
		expect(saved.apiKey).toBe("abc123");
	});

	it("starts from the defaults rather than failing on a hand-mangled file", async () => {
		const broken = join(folder, "broken.json");
		await writeFile(broken, "{ not json", "utf8");
		expect(await new SettingsStore(broken, fakeCipher()).read()).toEqual({
			baseUrl: DEFAULT_BASE_URL,
			apiKey: null,
		});
	});

	it("keeps the address when the key can no longer be decrypted", async () => {
		// The keychain entry is gone, or the file came from another machine.
		// Losing the key should not lose where the vault is.
		const store = new SettingsStore(file, fakeCipher());
		await store.save({ baseUrl: "https://localhost:27124", apiKey: { kind: "set", value: "abc123" } });

		const stranger = new SettingsStore(
			file,
			fakeCipher({
				decrypt: () => {
					throw new Error("this key is not mine");
				},
			}),
		);
		expect(await stranger.read()).toEqual({ baseUrl: "https://localhost:27124", apiKey: null });
	});

	it("refuses to store a key it cannot encrypt, rather than writing it plainly", async () => {
		const store = new SettingsStore(file, fakeCipher({ isAvailable: () => false }));
		await expect(
			store.save({ baseUrl: DEFAULT_BASE_URL, apiKey: { kind: "set", value: "abc123" } }),
		).rejects.toThrow(/keychain/);
	});

	it("still saves the address on a machine with no keychain", async () => {
		const store = new SettingsStore(file, fakeCipher({ isAvailable: () => false }));
		expect(
			await store.save({ baseUrl: "https://localhost:27124", apiKey: { kind: "cleared" } }),
		).toEqual({ baseUrl: "https://localhost:27124", apiKey: null });
	});
});

describe("visible", () => {
	it("reports that a key exists without handing it over", () => {
		expect(visible({ baseUrl: DEFAULT_BASE_URL, apiKey: "abc123" })).toEqual({
			baseUrl: DEFAULT_BASE_URL,
			hasApiKey: true,
		});
	});

	it("says so when there is none", () => {
		expect(visible({ baseUrl: DEFAULT_BASE_URL, apiKey: null }).hasApiKey).toBe(false);
	});
});
