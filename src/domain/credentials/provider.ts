import type { PlatformId } from "../../shared/platform.js";

export interface Credential {
	readonly username: string;
	readonly password: string;
	/** Present only if the vault item carries a one-time-password seed. */
	readonly totp?: string;
}

/**
 * Supplies the login for a platform.
 *
 * macOS has no interface for handing a third-party application the user's
 * saved password for an arbitrary website — autofill is deliberately bound to
 * domains an application can prove it owns. So credentials come from a password
 * manager's own command-line interface instead.
 *
 * Bitwarden is the only implementation for now; the port exists so that adding
 * another does not touch anything else.
 */
export interface CredentialProvider {
	readonly id: string;
	/** Whether the underlying vault is reachable and unlocked. */
	isAvailable(): Promise<boolean>;
	get(platform: PlatformId): Promise<Credential>;
}
