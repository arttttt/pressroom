import type { StoredSettings } from "../settings/store.js";
import { ObsidianPublicationRegistry } from "./obsidian-registry.js";
import { ObsidianVaultReader } from "./obsidian-vault-reader.js";
import { fetchPluginCertificate, ObsidianRestClient } from "./rest-client.js";

/** Everything the vault is reached for, over one connection to the plugin. */
export interface Vault {
	readonly reader: ObsidianVaultReader;
	readonly registry: ObsidianPublicationRegistry;
}

/**
 * One certificate per address, for as long as the application runs.
 *
 * The plugin regenerates its certificate rarely and never mid-session, so
 * fetching it once keeps the unverified request to a single occurrence per run
 * rather than one per thing the interface asks for.
 */
const certificates = new Map<string, Promise<string>>();

/**
 * Builds a reader from the settings, or says plainly what is missing.
 *
 * There is no reader without an API key, and saying so here means every caller
 * gets the same sentence rather than each inventing its own.
 */
export async function connectToVault(settings: StoredSettings): Promise<Vault> {
	if (settings.apiKey === null) {
		throw new Error("No API key is set. Enter the one from Obsidian's Local REST API settings.");
	}

	const baseUrl = settings.baseUrl.replace(/\/$/, "");
	const client = new ObsidianRestClient({
		baseUrl,
		apiKey: settings.apiKey,
		...(new URL(baseUrl).protocol === "https:" ? { certificate: await certificateFor(baseUrl) } : {}),
	});
	return { reader: new ObsidianVaultReader(client), registry: new ObsidianPublicationRegistry(client) };
}

/**
 * Drops what was cached about the plugin, so the next attempt starts over.
 *
 * Called when a conversation with the vault fails. Obsidian may have been
 * restarted since, and it may have generated a new certificate while it was
 * down; holding the old one would make every retry fail the same way until the
 * application itself is restarted, which is the thing retrying exists to avoid.
 */
export function forgetVaultConnection(): void {
	certificates.clear();
}

function certificateFor(baseUrl: string): Promise<string> {
	const known = certificates.get(baseUrl);
	if (known !== undefined) return known;

	const fetching = fetchPluginCertificate(baseUrl);
	certificates.set(baseUrl, fetching);
	// A failure must not be remembered as the answer, or a plugin that was
	// merely still starting stays broken until the application is restarted.
	fetching.catch(() => certificates.delete(baseUrl));
	return fetching;
}
