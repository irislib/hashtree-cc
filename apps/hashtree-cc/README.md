# hashtree.cc

Landing page and file sharing app at [hashtree.cc](https://hashtree.cc).

Upload files and get a content-addressed `nhash` link. The link names the
uploader as an explicit Hashtree provider, while FIPS discovers and authenticates
the WebRTC path. Blossom remains an optional storage route—no account required.

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

The publish/release scripts require the immutable public `htree 0.2.99` CLI.
Set `HTREE_BIN` to an extracted release binary or put that exact version on
`PATH`.

The default release deploys the same verified `dist/` directory to the
`hashtree-cc` Cloudflare Worker on `hashtree.cc/*`.

## License

MIT
