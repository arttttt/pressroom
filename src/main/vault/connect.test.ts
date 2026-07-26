import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_BASE_URL } from "../../shared/settings.js";
import { connectToVault } from "./connect.js";

let server: Server | null = null;

afterEach(async () => {
	if (server === null) return;
	const closing = server;
	server = null;
	await new Promise<void>((resolve) => closing.close(() => resolve()));
});

/** A stand-in for the plugin that answers one folder listing. */
async function vaultServing(files: readonly string[]): Promise<string> {
	server = createServer((_incoming, outgoing) => {
		outgoing.writeHead(200, { "content-type": "application/json" });
		outgoing.end(JSON.stringify({ files }));
	});
	await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
	return `http://127.0.0.1:${(server?.address() as AddressInfo).port}`;
}

describe("connectToVault", () => {
	it("says what is missing rather than failing on a request nobody can answer", async () => {
		await expect(connectToVault({ baseUrl: DEFAULT_BASE_URL, apiKey: null })).rejects.toThrow(
			/API key/,
		);
	});

	it("builds a reader that talks to the address it was given", async () => {
		const baseUrl = await vaultServing(["An Article/"]);
		const reader = await connectToVault({ baseUrl, apiKey: "test-key" });
		expect(await reader.listArticles()).toEqual(["An Article"]);
	});

	it("does not go looking for a certificate over plain HTTP", async () => {
		// Only HTTPS needs the plugin's own authority pinned; asking for one over
		// http would be a request to an endpoint that is not there.
		const baseUrl = await vaultServing([]);
		await expect(connectToVault({ baseUrl, apiKey: "test-key" })).resolves.toBeDefined();
	});

	it("tolerates a trailing slash on the address someone typed", async () => {
		const baseUrl = await vaultServing(["An Article/"]);
		const reader = await connectToVault({ baseUrl: `${baseUrl}/`, apiKey: "test-key" });
		expect(await reader.listArticles()).toEqual(["An Article"]);
	});
});
