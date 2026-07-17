# Changelog

## 0.1.5 - 2026-07-16

- Upgrade to immutable FIPS TypeScript 0.0.26 and Hashtree TypeScript 0.5.0.
  Quick Share stays thin while the shared adaptive `BlobRouter` owns bounded
  local, exact-provider, and Blossom read selection.
- Preserve explicit provider identity, HTL 10, central hash verification, and
  Blossom-only behavior when no authenticated provider bridge is enabled.
- Serialize the shared-origin browser suite and wait on bounded readiness so
  service-worker media checks remain deterministic under host load.

## 0.1.4 - 2026-07-16

- Pin the shared Hashtree worker 0.3.3 and its immutable runtime 0.4.4
  release, preserving exact-provider HTL 10 media reads after restart.
- Keep Quick Share thin: provider-less viewers remain Blossom-only and never
  infer blob providers from arbitrary connected peers.
- Remove redundant service-worker cleanup from isolated browser tests so the
  real two-session FIPS gate waits for activation instead of racing it.

## 0.1.3 - 2026-07-16

- Consume immutable FIPS, Hashtree, Iris Kit, and social-graph releases instead
  of maintaining copied package trees and sibling-repository build steps.
- Put the uploader's authenticated FIPS identity in share links and fetch only
  through that explicit Hashtree route with HTL 10; connected peers are never
  inferred to be blob providers.
- Preserve an explicitly empty Blossom configuration; without a named provider
  or configured read server, viewers remain local/serve-only.
- Use the shared Hashtree worker media path for provider reads and keep a thin
  local Vite worker entry for reliable development startup.
