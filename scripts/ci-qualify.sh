#!/usr/bin/env bash
# Linux amd64 qualification inside the pinned Noble/Playwright image in ci.yml.
# No publisher, signing credentials or deployment is used by this job.
set -euo pipefail
mkdir -p ci-evidence
exec > >(tee ci-evidence/qualification.log) 2>&1

check_capacity() {
  python3 - "$1" <<'PY'
import shutil, sys
floor = int(sys.argv[1]) * 1024**3
free = shutil.disk_usage('.').free
print(f'Disk available: {free}; required: {floor}', flush=True)
assert free >= floor, 'Insufficient hosted disk reserve'
PY
}

# Four GiB covers tools, dependency store/install, output and test evidence.
check_capacity 24
tool_dir="$RUNNER_TEMP/hashtree-cc-tools"
mkdir -p "$tool_dir/node" "$tool_dir/pnpm"
curl --fail --location --max-time 120 --output "$tool_dir/node.tar.gz" \
  https://nodejs.org/dist/v22.23.4/node-v22.23.4-linux-x64.tar.gz
echo "b8492284c76a54baf58d61668dd0e41ee0fc98adabf9503d30f05d08f55b4406  $tool_dir/node.tar.gz" | sha256sum --check --strict
tar -xzf "$tool_dir/node.tar.gz" --strip-components=1 -C "$tool_dir/node"
echo "94efd062ed066c1a0b332e18249859c905e920eeada5df55d24c99b919629a90  $tool_dir/node/bin/node" | sha256sum --check --strict
curl --fail --location --max-time 120 --output "$tool_dir/pnpm.tgz" \
  https://registry.npmjs.org/pnpm/-/pnpm-10.23.0.tgz
echo "21c4e5698002ade97e4efe8b8b4a89a8de3c85a37919f957e7a0f30f38fbc5bbdd05980ffe29179b2fb6e6e691242e098d945d1601772cad0fef5fb6411e2a4b  $tool_dir/pnpm.tgz" | sha512sum --check --strict
tar -xzf "$tool_dir/pnpm.tgz" --strip-components=1 -C "$tool_dir/pnpm"
ln -s "$tool_dir/pnpm/bin/pnpm.cjs" "$tool_dir/node/bin/pnpm"
export PATH="$tool_dir/node/bin:$PATH"
export CI=true PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
node --version
pnpm --version
test "$(pnpm --version)" = 10.23.0
git rev-parse HEAD > ci-evidence/source-commit.txt
sha256sum pnpm-lock.yaml > ci-evidence/lock-before.sha256

pnpm install --frozen-lockfile --store-dir "$RUNNER_TEMP/hashtree-cc-pnpm-store"
check_capacity 21
pnpm build
pnpm test:release
# Reuse the exact build above for portable and browser checks.
pnpm --dir apps/hashtree-cc exec node --test tests/portable-build.test.mjs
pnpm smoke:portable
pnpm test:e2e
sha256sum --check ci-evidence/lock-before.sha256
git diff --exit-code
check_capacity 20
python3 scripts/ci-artifact.py
