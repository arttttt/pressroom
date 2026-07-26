import { useEffect, useState } from "react";
import type { ApiKeyUpdate, Settings, VaultCheck } from "../../shared/settings.js";

/**
 * Where the connection to the vault is set up.
 *
 * The key field is always empty on arrival, because the key is never sent back
 * here. Leaving it empty keeps whatever is stored; typing in it replaces that.
 */
export function SettingsView() {
	const [settings, setSettings] = useState<Settings | null>(null);
	const [baseUrl, setBaseUrl] = useState("");
	const [apiKey, setApiKey] = useState("");
	const [check, setCheck] = useState<VaultCheck | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		let listening = true;
		void window.pressroom.readSettings().then((loaded) => {
			if (!listening) return;
			setSettings(loaded);
			setBaseUrl(loaded.baseUrl);
		});
		return () => {
			listening = false;
		};
	}, []);

	async function save(keyUpdate: ApiKeyUpdate) {
		setBusy(true);
		setCheck(null);
		try {
			setSettings(await window.pressroom.saveSettings({ baseUrl, apiKey: keyUpdate }));
			setApiKey("");
			setCheck(await window.pressroom.checkVault());
		} catch (cause: unknown) {
			setCheck({ kind: "failed", reason: cause instanceof Error ? cause.message : String(cause) });
		} finally {
			setBusy(false);
		}
	}

	if (settings === null) return <p className="quiet pad">Reading the settings…</p>;

	return (
		<section className="settings">
			<h1>The vault</h1>
			<p className="quiet standfirst">
				Pressroom reads articles through Obsidian's Local REST API plugin rather than off the disk, so
				Obsidian stays the only thing writing to its own files. The key is the one in that plugin's
				settings
			</p>

			<label>
				<span className="field">Address</span>
				<input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} spellCheck={false} />
			</label>

			<label>
				<span className="field">API key</span>
				<input
					type="password"
					value={apiKey}
					onChange={(event) => setApiKey(event.target.value)}
					placeholder={settings.hasApiKey ? "Stored — type to replace it" : "Paste it here"}
					spellCheck={false}
				/>
			</label>
			<p className="quiet hint">
				{settings.hasApiKey
					? "Encrypted with a key held in the macOS Keychain, and never read back into this window"
					: "It will be encrypted with a key held in the macOS Keychain"}
			</p>

			<div className="actions">
				<button
					type="button"
					className="btn primary"
					disabled={busy}
					onClick={() =>
						void save(apiKey.length === 0 ? { kind: "unchanged" } : { kind: "set", value: apiKey })
					}
				>
					{busy ? "Checking…" : "Save and check"}
				</button>
				{settings.hasApiKey && (
					<button
						type="button"
						className="btn"
						disabled={busy}
						onClick={() => void save({ kind: "cleared" })}
					>
						Forget the key
					</button>
				)}
			</div>

			{check?.kind === "reachable" && (
				<p className="result ok">
					<span className="mark ready" /> The vault answered — {check.articles} articles.
				</p>
			)}
			{check?.kind === "failed" && (
				<p className="result bad">
					<span className="mark missing" /> {check.reason}
				</p>
			)}
		</section>
	);
}
