# Changelog

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
