import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./enc-string.js";

const KEY = randomBytes(64);

describe("Bitwarden's encrypted strings", () => {
	it("comes back as it went in", () => {
		const secret = "correct horse battery staple";
		expect(decrypt(encrypt(secret, KEY), KEY)).toBe(secret);
	});

	it("carries anything a password or an item name can contain", () => {
		const awkward = 'Пароль с "кавычками", $знаками, переносом\nи эмодзи 🔐';
		expect(decrypt(encrypt(awkward, KEY), KEY)).toBe(awkward);
	});

	it("names the scheme it wrote, so the other side knows how to read it", () => {
		expect(encrypt("x", KEY).startsWith("2.")).toBe(true);
		expect(encrypt("x", KEY).split("|")).toHaveLength(3);
	});

	it("never writes the same thing twice", () => {
		// A fresh initialisation vector each time; otherwise identical messages
		// are visibly identical on the wire.
		expect(encrypt("x", KEY)).not.toBe(encrypt("x", KEY));
	});

	it("refuses a message that was changed on the way", () => {
		const encoded = encrypt("transfer 10", KEY);
		const [scheme, iv, secret, mac] = [
			encoded.slice(0, 2),
			...encoded.slice(2).split("|"),
		] as [string, string, string, string];
		const tampered = Buffer.from(secret, "base64");
		tampered[0] = (tampered[0] ?? 0) ^ 0xff;
		expect(() => decrypt(`${scheme}${iv}|${tampered.toString("base64")}|${mac}`, KEY)).toThrow(
			/changed on its way/,
		);
	});

	it("refuses a message meant for somebody else's key", () => {
		expect(() => decrypt(encrypt("x", KEY), randomBytes(64))).toThrow(/changed on its way|not meant/);
	});

	it("refuses a key of the wrong size rather than silently using half of it", () => {
		expect(() => encrypt("x", randomBytes(32))).toThrow(/64 bytes; this one is 32/);
	});

	it("refuses something that is not an encrypted string at all", () => {
		expect(() => decrypt("hello", KEY)).toThrow(/does not read|wrong number of parts/);
		expect(() => decrypt("2.only|two", KEY)).toThrow(/wrong number of parts/);
		expect(() => decrypt("1.a|b|c", KEY)).toThrow(/scheme 1/);
	});
});
