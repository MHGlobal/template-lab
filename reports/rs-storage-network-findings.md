# RS Storage Audit — Local Network / Wi-Fi findings

Target: `MHGlobal/RS-Storage` · `release/v4.7.13-agent-harness`

Status: **OPEN — automated network gates running; physical hotspot/Wi-Fi validation still mandatory.**

## F-WN-001 — HIGH candidate — mDNS can bind to the wrong local interface

`LocalDiscoveryManager` selects one IPv4 address using interface-name and address-range scoring. This is a heuristic rather than the actual network/interface on which a client will reach the embedded server. On devices with concurrent Wi-Fi/hotspot/repeater/USB/Ethernet interfaces, JmDNS can therefore bind and advertise on a different multicast domain from the intended client.

`discovery.isActive()` only proves that a responder and bound address exist. It does not prove that `rsstorage.local` is resolvable from the intended client network. If the wrong interface is selected, the application can still present the negotiated `.local` hostname as the preferred URL.

Physical gate: validate `.local` resolution independently from direct-IP access on hotspot, ordinary Wi-Fi and any supported Wi-Fi-sharing/repeater mode.

## F-WN-002 — HIGH compatibility candidate — fallback subnet is hard-coded to /24

`RsLocalNetworkPolicy.samePrivateSubnet(...)` attempts to use the real Android interface prefix. If interface lookup/prefix retrieval fails, it silently falls back to `/24`.

This is conservative from a security perspective, but it can reject a legitimate local client on a wider `/23`, `/20`, `/16`, etc. network. The product should not claim general LAN compatibility until this fallback behavior is exercised on physical networks and the intended compatibility contract is explicit.

## F-WN-003 — HIGH — denied Nearby Devices permission can still start the server

For Android 13+, `requestServerPermissionsThenStart()` requests `NEARBY_WIFI_DEVICES`. In `onRequestPermissionsResult(...)`, when that permission remains denied, the UI warns that mDNS may be unavailable but then calls `startServerAfterPermissions()` anyway.

That assumption is not future-safe for Android Local Network Protections. With Android 16 LNP opt-in, LAN traffic can be blocked at the app UID when local-network permission is not granted, including incoming TCP and multicast/mDNS. A server that remains marked `RUNNING` under that condition can present a misleading healthy state even though LAN clients cannot reach it.

Wave 5 tests the platform behavior with `RESTRICT_LOCAL_NETWORK` on Android 16 using the RS Storage app UID.

## F-WN-004 — REVIEW — discovery is not automatically re-established after permission changes

The discovery manager is created and started during server startup. There is no demonstrated listener/rebind path that re-runs discovery when Nearby Devices permission changes while the service remains running. If startup occurs while LAN permission is denied and permission is granted later, `.local` discovery may require a server restart.

Wave 5 records the server state before/after the permission transition; physical validation remains required for actual multicast propagation.

## F-WN-005 — REVIEW — displayed private URLs are broader than discovery-interface filtering

The direct-IP URL list enumerates active non-loopback interfaces and includes RFC1918 IPv4 addresses without applying the discovery manager's exclusions for cellular/VPN-like interface names. A private carrier/VPN address can therefore appear beside the actual hotspot/Wi-Fi address even when it is not useful to the local client.

This is primarily a diagnostics/UX correctness risk. The physical gate must verify which addresses are shown on devices with mobile data + hotspot and with VPN active.

## Positive controls already present

- Main HTTP server binds to port 8080 and accepts on all interfaces; socket admission is then checked per connection.
- `NEARBY_WIFI_DEVICES` is declared in the manifest and requested before normal UI-driven server startup.
- `CHANGE_WIFI_MULTICAST_STATE` is declared and JmDNS uses a multicast lock when available.
- mDNS deliberately excludes obvious cellular, VPN, dummy and tunnel interface names when choosing its bind address.
- The explicit subnet comparison handles arbitrary IPv4 prefixes correctly when the real interface prefix is available.

## Mandatory physical matrix

The audit is not complete until a real candidate APK is exercised with at least: Android hotspot → second Android client; Android hotspot → Windows/laptop client; ordinary shared Wi-Fi; `rsstorage.local` versus direct IP; screen-on/screen-off; stop/start/restart; permission denial/grant; mobile-data + hotspot coexistence; and, when available, a wider-than-/24 LAN or a second supported local transport. Each run needs client-side screenshots plus server-side screenshots/log evidence.
