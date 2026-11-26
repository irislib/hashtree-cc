# hashtree-cc

Standalone workspace for the `hashtree.cc` site/app. Shared FIPS, Hashtree,
Nostr, and social-graph code comes from immutable release artifacts instead of
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

The release scripts require the immutable public `htree 0.2.142` CLI. Set
`HTREE_BIN` to an extracted release binary or put that exact version on `PATH`.

Cloudflare deployment uses the reviewed local Wrangler 4.78.0 installation on
macOS arm64. Set `WRANGLER_NODE_MODULES` to its absolute `node_modules` directory.
The deploy script verifies the complete package set, file bytes, permissions,
and installed lock against `apps/hashtree-cc/scripts/wrangler-tool.json` before
starting Wrangler. It never resolves or downloads a tool during deployment.
That manifest records the public archive integrities and the native postinstall
copies needed to reproduce the tool closure.

Hosted CI retains the built site and its source/file receipt. An approved
prebuilt release reuses those exact bytes and completed build/browser checks;
it still runs the strict publisher check and native Iris Sites gate before
publishing to the established Hashtree tree and Cloudflare Worker.

Git remote setup for Hashtree-first development:

```bash
git remote add origin htree://self/hashtree-cc
```
