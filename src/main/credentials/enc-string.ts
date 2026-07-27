import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Bitwarden's own string encryption, as its clients speak it to each other.
 *
 * The form is `2.<iv>|<ciphertext>|<mac>`, all base64, where 2 names the
 * scheme: AES-256-CBC with an HMAC-SHA256 over the initialisation vector and
 * the ciphertext together. The key is 64 bytes — the first half encrypts, the
 * second half authenticates. They are separate keys on purpose; one key doing
 * both is the classic way to make a scheme that verifies nothing.
 *
 * Written from the format rather than taken from Bitwarden's own code, which
 * is GPL-3.0 and would carry that licence into a project that is not.
 */

const SCHEME = "2";
const KEY_BYTES = 64;
const IV_BYTES = 16;

export function encrypt(plain: string, key: Buffer): string {
	const { encryption, authentication } = halves(key);
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv("aes-256-cbc", encryption, iv);
	const secret = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
	const mac = createHmac("sha256", authentication).update(iv).update(secret).digest();
	return `${SCHEME}.${iv.toString("base64")}|${secret.toString("base64")}|${mac.toString("base64")}`;
}

export function decrypt(encoded: string, key: Buffer): string {
	const { encryption, authentication } = halves(key);
	const [scheme, rest] = split(encoded, ".");
	if (scheme !== SCHEME) throw new Error(`Encrypted with scheme ${scheme}, which Pressroom does not read.`);

	const parts = rest.split("|");
	const [iv, secret, mac] = parts.map((part) => Buffer.from(part, "base64"));
	if (parts.length !== 3 || iv === undefined || secret === undefined || mac === undefined) {
		throw new Error("This is not an encrypted string: it has the wrong number of parts.");
	}

	const expected = createHmac("sha256", authentication).update(iv).update(secret).digest();
	// Compared in constant time, and the length is checked first because
	// `timingSafeEqual` throws rather than answering when they differ.
	if (mac.byteLength !== expected.byteLength || !timingSafeEqual(mac, expected)) {
		throw new Error("The message was changed on its way here, or was not meant for this key.");
	}

	const decipher = createDecipheriv("aes-256-cbc", encryption, iv);
	return Buffer.concat([decipher.update(secret), decipher.final()]).toString("utf8");
}

/** The encrypting half and the authenticating half of one 64-byte key. */
function halves(key: Buffer): { readonly encryption: Buffer; readonly authentication: Buffer } {
	if (key.byteLength !== KEY_BYTES) {
		throw new Error(`A shared key is ${KEY_BYTES} bytes; this one is ${key.byteLength}.`);
	}
	return { encryption: key.subarray(0, 32), authentication: key.subarray(32) };
}

/** Splits on the first occurrence only — the rest may contain the separator. */
function split(value: string, at: string): [string, string] {
	const found = value.indexOf(at);
	return found === -1 ? [value, ""] : [value.slice(0, found), value.slice(found + at.length)];
}
