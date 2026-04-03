# hashtree-cc

Standalone workspace for the `hashtree.cc` site/app and the local Hashtree TypeScript packages it currently depends on.

Source: <https://git.iris.to/#/npub1xdhnr9mrv47kkrn95k6cwecearydeh8e895990n3acntwvmgk2dsdeeycm/hashtree-cc>
Built on Hashtree: <https://git.iris.to/#/npub1xdhnr9mrv47kkrn95k6cwecearydeh8e895990n3acntwvmgk2dsdeeycm/hashtree>

## Layout

- `apps/hashtree-cc` - Svelte app, Playwright e2e tests, portable build checks, and release scripts
- `packages/*` - extracted local packages required to build and test the app without the main `hashtree` monorepo

## Development

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm test:portable
pnpm release:site -- --skip-cloudflare
```

The release scripts use an installed `htree` by default. If you want to run
against a local Hashtree Rust checkout instead, set `HTREE_BIN`,
`HASHTREE_RUST_DIR`, or `HASHTREE_REPO_ROOT`.

Git remote setup for Hashtree-first development:

```bash
git remote add origin htree://self/hashtree-cc
```
