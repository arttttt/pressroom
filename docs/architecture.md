# Architecture

## Shape

A macOS-only Electron application. There is no server and no remote access:
everything runs on one machine, against a local Obsidian vault and the
platforms' own websites.

Electron rather than Tauri, for one reason: Tauri uses the system WebView, and
several independent, persistently logged-in browser sessions inside one
application is awkward there. Chromium's partitions give that directly.

## Layers

```
  renderer (UI)
      │  IPC
  main process ── sessions, browser views, window management
      │
  domain ── vault · render · registry · credentials · metrics · platforms
```

The domain layer knows nothing about Electron. Everything it needs from the
outside is a port: `VaultReader`, `Renderer`, `PublicationRegistry`,
`CredentialProvider`, `MetricsSource`. The main process supplies the
implementations.

The browser-driving code sits on its own, above the renderers. It receives text
that is already in the right dialect and only knows where to put it on a given
page. That is the part which breaks when someone else redesigns their editor,
so nothing else depends on it.

## Sessions

One persistent Electron session per platform, `persist:<platform>`. Cookies are
what actually keeps the application logged in; they live in the application's
data directory, with Chromium's encryption key held in the macOS Keychain.

These sessions are the sensitive asset — they can publish under the user's name
without a second factor, which a password alone cannot do. Hence: no remote
access, one action to clear them all, and no code path that submits anything
without a person pressing the button.

## Credentials

macOS does not offer a way for a third-party application to read the user's
saved password for an arbitrary website. Autofill and credential-provider
extensions run the other way round — a password manager supplies the system —
and `ASAuthorizationPasswordProvider` only returns credentials for a domain the
application has proven it owns. This is deliberate: domain binding is what makes
autofill a defence against phishing.

So credentials come from a password manager's own command-line interface.
Bitwarden (`bw`) is the only implementation; the port exists so a second one
costs nothing elsewhere.

Scope is deliberately small: Pressroom fills the login and password fields and
stops. Submitting the form, second factors and captchas are the person's.

## Publishing

Nothing is published automatically. Each platform is brought to the state where
one click would do it, and there the application stops. Beyond being the safer
design, it is also the honest one for Hacker News, which does not want automated
submissions.

Reddit is the exception in the other direction: it has a real API, so it needs
no browser at all.

## The vault

Articles are read, and the publication record is written, through Obsidian's
Local REST API plugin rather than through the filesystem.

Reading files directly would be simpler. Writing them would not: the vault is
open in Obsidian and synchronised through Google Drive, so a second writer means
conflicts and an editor showing stale content. Going through the plugin keeps
Obsidian the only process mutating its own files.

That makes the plugin a requirement for running Pressroom. For an application
written for one person that is an acceptable dependency, and for anyone else it
is a documented one.

## Registry

Publications are recorded in the vault, beside the article, not in a database of
this application's own. The record then travels with the text, is versioned with
it, and stays readable without Pressroom.
