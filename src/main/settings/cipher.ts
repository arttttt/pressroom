import { safeStorage } from "electron";

/**
 * Encryption for the one secret this application stores itself.
 *
 * An interface rather than a direct call so the store can be exercised without
 * a running Electron, and so that what is encrypted is visible in one place.
 */
export interface SecretCipher {
	/** False when the platform has no keychain to hold the key. */
	isAvailable(): boolean;
	encrypt(value: string): Buffer;
	decrypt(value: Buffer): string;
}

/**
 * Electron's own encryption, which on macOS keeps its key in the Keychain and
 * writes only ciphertext to disk.
 *
 * Available once the application is ready, so it is built there rather than at
 * import time.
 */
export function keychainCipher(): SecretCipher {
	return {
		isAvailable: () => safeStorage.isEncryptionAvailable(),
		encrypt: (value) => safeStorage.encryptString(value),
		decrypt: (value) => safeStorage.decryptString(value),
	};
}
