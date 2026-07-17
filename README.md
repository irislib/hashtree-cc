# hashtree-cc

Standalone workspace for the `hashtree.cc` site/app. Shared FIPS, Hashtree,
NDK, and social-graph code comes from immutable release artifacts instead of
being copied into this repository.

Source: <https://git.iris.to/#/npub1xdhnr9mrv47kkrn95k6cwecearydeh8e895990n3acntwvmgk2dsdeeycm/hashtree-cc>
Built on Hashtree: <https://git.iris.to/#/npub1xdhnr9mrv47kkrn95k6cwecearydeh8e895990n3acntwvmgk2dsdeeycm/hashtree>

## Layout

- `apps/hashtree-cc` - Svelte app, Playwright e2e tests, portable build checks, and release scripts
- `scripts/verify-dependency-lock.mjs` - release URL and integrity gate for the shared runtime tuple

## Development

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm test:portable
pnpm release:site -- --skip-cloudflare
```

The release scripts require the immutable public `htree 0.2.99` CLI. Set
`HTREE_BIN` to an extracted release binary or put that exact version on `PATH`.

Git remote setup for Hashtree-first development:

```bash
git remote add origin htree://self/hashtree-cc
```
