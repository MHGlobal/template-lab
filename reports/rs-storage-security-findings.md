# RS Storage Audit — Embedded server security findings

Target: `MHGlobal/RS-Storage` · `release/v4.7.13-agent-harness`

Status: **OPEN — static/runtime controls reviewed; physical hostile-LAN testing still required.**

## F-SEC-001 — HIGH on shared/untrusted LAN; MEDIUM on owner-controlled hotspot — authentication and session traffic use plaintext HTTP

The embedded service binds ordinary `ServerSocket` listeners on port 8080 and, when possible, port 80. Preferred URLs and mDNS advertise `http://`, not HTTPS. No TLS listener or certificate path is present in the candidate server implementation.

The login form therefore transmits the username and password over plaintext HTTP. The resulting `RSSESSION` cookie is correctly `HttpOnly` and `SameSite=Strict`, but cannot safely be marked `Secure` while the product is served only over HTTP. `HttpOnly` and SameSite reduce browser-side theft/CSRF; they do not protect credentials or cookies from a network observer or active MITM on the same LAN.

**Threat-model consequence:**

- On an owner-controlled encrypted phone hotspot, practical exposure is substantially lower and may be acceptable if that is the explicitly documented trust boundary.
- On ordinary shared Wi-Fi — a mode currently included in the product's LAN behavior — another party controlling/observing the network can potentially capture or alter authenticated HTTP traffic.

The release/recovery decision must explicitly choose one of these contracts: restrict/document use to trusted local networks, or introduce an authenticated TLS/secure-pairing transport suitable for LAN use. The UI must not imply that “local/offline” automatically means encrypted.

## F-SEC-002 — REVIEW — Content Security Policy permits inline scripts/styles

The server emits useful browser security headers including `nosniff`, `no-referrer`, `SAMEORIGIN`, restrictive Permissions-Policy, same-origin CORP and a CSP. However, the CSP currently permits both `script-src 'unsafe-inline'` and `style-src 'unsafe-inline'` because much of the UI is generated inline.

This is not independently classified as an exploitable XSS: dynamic values reviewed in the server use escaping in the relevant rendered paths, and state-changing operations are protected by CSRF. It does mean CSP is not a strong second layer against a future HTML-injection regression. Recovery should migrate script execution to nonce/hash or same-origin static assets where practical.

## F-SEC-003 — LOW/DoS review — login throttling state is process-memory and per-IP

Failed logins are counted by source IP; five failures block that IP for five minutes. This is a useful control. The `failures`/`blocked` maps are process-memory maps and expired/low-count entries are not globally bounded/periodically swept in the reviewed path.

Because the server only admits local-subnet clients, exploitation requires LAN presence and the address space is constrained in normal hotspot use. This is therefore not a release blocker, but a bounded cache/periodic cleanup is preferable for long-running service robustness, especially if broader IPv6/LAN support is later added.

## Positive security controls that must be preserved

- LAN socket admission is checked before dispatch and again before request handling.
- Request line/header sizes are bounded; duplicate `Content-Length`, `Host` and `Transfer-Encoding` headers are rejected.
- `Transfer-Encoding` is rejected, reducing request-smuggling ambiguity in the custom HTTP parser.
- Non-upload request bodies have a 2 MiB limit; uploads have an explicit 100 GiB ceiling.
- Admin/client authentication is role-separated.
- Session identifiers and CSRF values are generated from `SecureRandom`-backed tokens.
- Session cookie uses `HttpOnly` and `SameSite=Strict`.
- Sessions expire on a four-hour sliding window and disabled/deleted client accounts invalidate active access on the next session check.
- Mutating admin upload/action APIs require admin role and CSRF validation.
- CSRF comparison is constant-time.
- Passwords use a random 16-byte salt and PBKDF2-HMAC-SHA256 (180,000 iterations, 256-bit output) and are compared with `MessageDigest.isEqual`.
- Android app backup is disabled in the manifest.
- Filesystem paths are canonicalized beneath the storage root; symbolic-link traversal is rejected.
- Upload file names reject slash, backslash, dot/dot-dot and NUL path components.
- Uploads are staged atomically and temporary files are deleted in a `finally` block.
- Permanent RS Media structure has explicit delete/overwrite protection.

## Mandatory runtime security checks still required

1. Confirm unauthenticated File/Admin/RS IA administrative routes return 401/redirect and never disclose data.
2. Confirm client accounts cannot access admin File routes or admin APIs.
3. Confirm missing/wrong CSRF fails upload, actions and transfer cancellation.
4. Repeat traversal tests with URL encoding, mixed separators and symlink targets on Android storage.
5. Exercise login throttling and expiry against the actual Android server.
6. On a controlled physical LAN, capture traffic or otherwise verify that HTTP is visibly plaintext, so the release documentation/severity is based on demonstrated transport behavior rather than assumption.
7. Test service behavior under slow/partial requests, concurrent sockets and oversized headers without ANR/crash.

Final audit remains blocked independently by Agent parity, Android visual/upgrade, transfer/performance and physical-network gates.
