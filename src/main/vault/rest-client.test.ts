import { X509Certificate } from "node:crypto";
import { createServer as createHttpServer, type Server } from "node:http";
import { createServer as createHttpsServer, type Server as TlsServer } from "node:https";
import type { AddressInfo } from "node:net";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	fetchPluginCertificate,
	ObsidianRestClient,
	VaultPathMissing,
	VaultUnreachable,
} from "./rest-client.js";

const API_KEY = "test-key";

/**
 * A certificate the plugin could have generated for itself: self-signed, and
 * therefore refused by default — which is the whole reason the application
 * fetches and pins one.
 */
function selfSigned(): { readonly certificate: string; readonly key: string } {
	const where = mkdtempSync(join(tmpdir(), "pressroom-tls-"));
	try {
		execFileSync("openssl", [
			"req", "-x509", "-newkey", "rsa:2048", "-nodes",
			"-keyout", join(where, "key.pem"),
			"-out", join(where, "cert.pem"),
			"-days", "1",
			"-subj", "/CN=127.0.0.1",
			"-addext", "subjectAltName=IP:127.0.0.1",
		]);
		return {
			certificate: readFileSync(join(where, "cert.pem"), "utf8"),
			key: readFileSync(join(where, "key.pem"), "utf8"),
		};
	} finally {
		rmSync(where, { recursive: true, force: true });
	}
}

let tls: TlsServer;
let origin: string;
const own = selfSigned();

beforeAll(async () => {
	tls = createHttpsServer({ cert: own.certificate, key: own.key }, (incoming, outgoing) => {
		if (incoming.url === "/obsidian-local-rest-api.crt") {
			outgoing.writeHead(200, { "content-type": "application/x-x509-ca-cert" });
			outgoing.end(own.certificate);
			return;
		}
		if (incoming.headers.authorization !== `Bearer ${API_KEY}`) {
			outgoing.writeHead(401);
			outgoing.end("Unauthorized");
			return;
		}
		outgoing.writeHead(200, { "content-type": "text/markdown" });
		outgoing.end("# A note\n");
	});
	await new Promise<void>((resolve) => tls.listen(0, "127.0.0.1", resolve));
	origin = `https://127.0.0.1:${(tls.address() as AddressInfo).port}`;
});

afterAll(async () => {
	await new Promise<void>((resolve, reject) =>
		tls.close((cause) => (cause === undefined ? resolve() : reject(cause))),
	);
});

describe("the certificate the plugin generates for itself", () => {
	it("is refused when nothing has been pinned", async () => {
		// The default address is HTTPS, so this is the ordinary first request —
		// and the reason a certificate has to be fetched at all.
		const client = new ObsidianRestClient({ baseUrl: origin, apiKey: API_KEY });
		await expect(client.readFile("A note.md")).rejects.toThrow(VaultUnreachable);
	});

	it("is handed out, and pinning it makes the connection verify", async () => {
		const certificate = await fetchPluginCertificate(origin);
		expect(new X509Certificate(certificate).subject).toContain("127.0.0.1");

		const client = new ObsidianRestClient({ baseUrl: origin, apiKey: API_KEY, certificate });
		expect(await client.readFile("A note.md")).toBe("# A note\n");
	});

	it("does not make the key optional", async () => {
		const certificate = await fetchPluginCertificate(origin);
		const client = new ObsidianRestClient({ baseUrl: origin, apiKey: "wrong", certificate });
		await expect(client.readFile("A note.md")).rejects.toThrow(/rejected the API key/);
	});

	it("says the plugin is not there rather than blaming the certificate", async () => {
		await expect(fetchPluginCertificate("https://127.0.0.1:1")).rejects.toThrow(VaultUnreachable);
	});
});

describe("what the client makes of an answer", () => {
	let plain: Server;
	let status = 200;
	let plainOrigin: string;

	beforeAll(async () => {
		plain = createHttpServer((_incoming, outgoing) => {
			outgoing.writeHead(status, { "content-type": "text/markdown" });
			outgoing.end("something the plugin said");
		});
		await new Promise<void>((resolve) => plain.listen(0, "127.0.0.1", resolve));
		plainOrigin = `http://127.0.0.1:${(plain.address() as AddressInfo).port}`;
	});

	afterAll(async () => {
		await new Promise<void>((resolve, reject) =>
			plain.close((cause) => (cause === undefined ? resolve() : reject(cause))),
		);
	});

	it("tells a missing file from a plugin in trouble", async () => {
		const client = new ObsidianRestClient({ baseUrl: plainOrigin, apiKey: API_KEY });

		status = 404;
		await expect(client.readFile("gone.md")).rejects.toThrow(VaultPathMissing);

		// Not the same thing at all: one is an answer, the other is a failure,
		// and writing the publication record depends on the difference.
		status = 500;
		await expect(client.readFile("gone.md")).rejects.toThrow(VaultUnreachable);
		status = 200;
	});

	it("does not repeat the plugin's own words into the interface", async () => {
		const client = new ObsidianRestClient({ baseUrl: plainOrigin, apiKey: API_KEY });
		status = 418;
		await expect(client.readFile("a.md")).rejects.toThrow(/answered 418/);
		await expect(client.readFile("a.md")).rejects.not.toThrow(/something the plugin said/);
		status = 200;
	});
});
