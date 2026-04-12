# hashtree.cc

Landing page and file sharing app at [hashtree.cc](https://hashtree.cc).

Upload files, get a content-addressed `nhash` link. Recipients fetch data P2P via WebRTC or from Blossom servers — no accounts, no server-side storage.

## Development

```bash
pnpm install
pnpm run dev           # Dev server
pnpm run build         # Production build
pnpm run test          # E2E tests (Playwright)
pnpm run test:release  # Release script unit tests
pnpm run test:portable
pnpm run publish:portable
pnpm run release:site
```

`pnpm run test:portable` builds the site, verifies the generated `dist/index.html` stays portable for `htree://` delivery, and smoke-tests that exact build from a nested path so root-absolute asset URLs fail before publish.

`pnpm run release:site` runs the same build and portable checks, publishes the resulting `dist/` directory to the mutable site ref `htree://self/hashtree-cc-site`, and then deploys that same directory to a Cloudflare Worker service named `hashtree-cc` by default.

The publish/release scripts use an installed `htree` by default. Set
`HTREE_BIN`, `HASHTREE_RUST_DIR`, or `HASHTREE_REPO_ROOT` when you want to run
against a specific local Hashtree Rust checkout instead.

The live `https://hashtree.cc` domain is still served from GitHub Pages today, not Cloudflare, so the release script does not attach the production custom domain automatically. Once the zone is moved to Cloudflare, pass `--domain hashtree.cc` (or `--route hashtree.cc/*`) to cut traffic over there.

## License

MIT
