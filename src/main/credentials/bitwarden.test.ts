import { describe, expect, it } from "vitest";
import { BitwardenVault, type CommandResult, type RunBitwarden } from "./bitwarden.js";

/** A `bw` that answers whatever the test says it does, and records the asking. */
function bitwarden(answers: Record<string, CommandResult>) {
	const asked: string[][] = [];
	const run: RunBitwarden = async (args) => {
		asked.push([...args]);
		return answers[args[0] ?? ""] ?? { code: 1, out: "", err: "Not found." };
	};
	return { vault: new BitwardenVault(run), asked };
}

function item(login: object): CommandResult {
	return { code: 0, out: JSON.stringify({ id: "x", name: "Habr", login }), err: "" };
}

const LOGIN = { username: "author@example.com", password: "correct horse battery staple" };

describe("whether the vault can be used at all", () => {
	it("is available only when it is unlocked", () => {
		// A locked vault answers every question with a refusal, and "Bitwarden is
		// not installed" and "Bitwarden is locked" are different things to say.
		const cases = [
			[JSON.stringify({ status: "unlocked" }), true],
			[JSON.stringify({ status: "locked" }), false],
			[JSON.stringify({ status: "unauthenticated" }), false],
		] as const;
		return Promise.all(
			cases.map(async ([out, expected]) => {
				const { vault } = bitwarden({ status: { code: 0, out, err: "" } });
				expect(await vault.isAvailable(), out).toBe(expected);
			}),
		);
	});

	it("is not available when the command is not there to answer", async () => {
		const { vault } = bitwarden({ status: { code: 1, out: "", err: "ENOENT" } });
		expect(await vault.isAvailable()).toBe(false);
	});

	it("is not available when the answer is not what it should be", async () => {
		// A `bw` that prints a warning before its JSON, or a different `bw`.
		const { vault } = bitwarden({ status: { code: 0, out: "you should update", err: "" } });
		expect(await vault.isAvailable()).toBe(false);
	});
});

describe("getting a login", () => {
	it("asks for the item by the platform's own name, in one call", async () => {
		// `bw` takes a second or two to answer; a call per field doubles the wait.
		const { vault, asked } = bitwarden({ get: item(LOGIN) });
		expect(await vault.get("habr")).toEqual(LOGIN);
		expect(asked).toEqual([["get", "item", "Habr"]]);
	});

	it("brings back nothing but the two fields it will fill", async () => {
		// The item holds a one-time-password seed as well. Pressroom stops at two
		// fields, so reading the third would be taking a secret it never uses.
		const { vault } = bitwarden({ get: item({ ...LOGIN, totp: "otpauth://totp/Habr" }) });
		expect(Object.keys(await vault.get("habr")).sort()).toEqual(["password", "username"]);
	});

	it("says the vault is locked, and how to unlock it for this application", async () => {
		// The common one, and the one a bare "command failed" explains worst: an
		// application started from the dock inherits no shell session.
		const { vault } = bitwarden({ get: { code: 1, out: "", err: "You are not logged in." } });
		await expect(vault.get("habr")).rejects.toThrow(/locked.*bw unlock/is);
	});

	it("says which name matched two items rather than picking one", async () => {
		const { vault } = bitwarden({
			get: { code: 1, out: "", err: "More than one result was found." },
		});
		await expect(vault.get("habr")).rejects.toThrow(/More than one Bitwarden item matches 'Habr'/);
	});

	it("names the item that does not exist, so it can be created", async () => {
		const { vault } = bitwarden({ get: { code: 1, out: "", err: "Not found." } });
		await expect(vault.get("habr")).rejects.toThrow(/No Bitwarden item is named 'Habr'/);
	});

	it("says the command is missing rather than blaming the vault", async () => {
		const { vault } = bitwarden({ get: { code: 1, out: "", err: "ENOENT" } });
		await expect(vault.get("habr")).rejects.toThrow(/command line is not installed/);
	});

	it("refuses an item with half a login in it", async () => {
		// A password field left empty fills the form with an empty string and the
		// sign-in fails for a reason nobody can see.
		const { vault } = bitwarden({ get: item({ username: "author@example.com" }) });
		await expect(vault.get("habr")).rejects.toThrow(/no password/);
		const { vault: other } = bitwarden({ get: item({ password: "x" }) });
		await expect(other.get("habr")).rejects.toThrow(/no username/);
	});

	it("refuses an item that is not a login at all", async () => {
		const { vault } = bitwarden({ get: { code: 0, out: JSON.stringify({ name: "Habr" }), err: "" } });
		await expect(vault.get("habr")).rejects.toThrow(/no username/);
	});

	it("passes on anything else Bitwarden says, rather than swallowing it", async () => {
		const { vault } = bitwarden({ get: { code: 1, out: "", err: "Cannot reach the server." } });
		await expect(vault.get("habr")).rejects.toThrow("Cannot reach the server.");
	});
});
