import { execFile } from "node:child_process";
import type { Credential, CredentialProvider } from "../../domain/credentials/provider.js";
import { PLATFORMS } from "../../domain/platforms/registry.js";
import type { PlatformId } from "../../shared/platform.js";

/** What running `bw` came to. Its own words are worth more than ours. */
export interface CommandResult {
	readonly code: number;
	readonly out: string;
	readonly err: string;
}

export type RunBitwarden = (args: readonly string[]) => Promise<CommandResult>;

/**
 * The login for a platform, out of Bitwarden's own command line.
 *
 * macOS will not hand a third-party application a saved password for a site it
 * cannot prove it owns — autofill is bound to domains on purpose, and that
 * binding is what makes it resist phishing. So the password manager is asked
 * directly instead, through the interface it publishes.
 *
 * The command is injected rather than reached for, because everything worth
 * testing here is what is made of its answers: a locked vault, a name matching
 * two items, an item with no password in it. None of those are error cases to
 * paper over — each is a different thing to tell the person.
 */
export class BitwardenVault implements CredentialProvider {
	readonly id = "bitwarden";
	readonly #run: RunBitwarden;

	constructor(run: RunBitwarden) {
		this.#run = run;
	}

	async isAvailable(): Promise<boolean> {
		const status = await this.#run(["status"]);
		if (status.code !== 0) return false;
		try {
			return (JSON.parse(status.out) as { status?: string }).status === "unlocked";
		} catch {
			return false;
		}
	}

	async get(platform: PlatformId): Promise<Credential> {
		const named = nameOf(platform);
		// One call rather than one per field: `bw` takes a second or two to
		// answer, and asking twice doubles the wait for no reason.
		const found = await this.#run(["get", "item", named]);
		if (found.code !== 0) throw new Error(whatWentWrong(found, named));

		let item: { login?: { username?: string | null; password?: string | null } };
		try {
			item = JSON.parse(found.out);
		} catch {
			throw new Error(`Bitwarden answered with something that is not an item for '${named}'.`);
		}

		const username = item.login?.username ?? "";
		const password = item.login?.password ?? "";
		if (username === "" || password === "") {
			throw new Error(
				`The Bitwarden item '${named}' has no ${username === "" ? "username" : "password"} in it.`,
			);
		}
		return { username, password };
	}
}

/**
 * What the vault is asked for.
 *
 * The platform's own name, because that is what an item for it is called, and
 * because it is what appears when nothing matches — telling the person exactly
 * what to name the item rather than leaving them to guess at a search term
 * they never chose.
 */
function nameOf(platform: PlatformId): string {
	return PLATFORMS.find((entry) => entry.id === platform)?.displayName ?? platform;
}

/** Bitwarden's own message, made into one that says what to do about it. */
function whatWentWrong(result: CommandResult, named: string): string {
	const said = `${result.err} ${result.out}`.trim();
	if (said.includes("ENOENT") || said.includes("not found: bw")) {
		return "Bitwarden's command line is not installed, or is not on this application's PATH.";
	}
	if (/not logged in|Vault is locked|master password/i.test(said)) {
		return "Bitwarden is locked. Unlock it with `bw unlock` and start Pressroom from that same shell, so it inherits the session.";
	}
	if (/More than one result/i.test(said)) {
		return `More than one Bitwarden item matches '${named}'. Rename the one this platform should use.`;
	}
	if (/Not found/i.test(said)) {
		return `No Bitwarden item is named '${named}'.`;
	}
	return said === "" ? `Bitwarden refused to answer for '${named}'.` : said;
}

/**
 * Where Homebrew puts things, added to whatever PATH the application inherited.
 *
 * An application started from the dock inherits almost none, and `bw` living
 * somewhere perfectly ordinary would look to it exactly like `bw` not being
 * installed at all.
 */
const LIKELY_PATH = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];

/** Runs `bw` for real, and never lets it stop to ask anybody anything. */
export function bwCommand(args: readonly string[]): Promise<CommandResult> {
	return new Promise((resolve) => {
		const path = [...new Set([...(process.env["PATH"] ?? "").split(":"), ...LIKELY_PATH])]
			.filter((entry) => entry !== "")
			.join(":");
		execFile(
			"bw",
			[...args, "--nointeraction"],
			{ env: { ...process.env, PATH: path }, timeout: 30_000 },
			(error, out, err) => {
				const code = error === null ? 0 : typeof error.code === "number" ? error.code : 1;
				// A missing command reports its name in `error.code`, not on stderr.
				const said = error !== null && typeof error.code === "string" ? error.code : err;
				resolve({ code, out, err: said });
			},
		);
	});
}
