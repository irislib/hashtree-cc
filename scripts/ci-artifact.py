"""Bind the tested site to its source and complete installed runtime cohort."""
import hashlib
import json
from pathlib import Path
import subprocess

runtime = json.loads(Path('ci-evidence/installed-runtime.json').read_text())
edges = json.loads(Path('ci-evidence/runtime-edges.json').read_text())
dist = Path('apps/hashtree-cc/dist')
files = []
for file in sorted(dist.rglob('*')):
    assert not file.is_symlink(), file
    if file.is_file():
        contents = file.read_bytes()
        files.append({'path': file.relative_to(dist).as_posix(), 'bytes': len(contents),
                      'sha256': hashlib.sha256(contents).hexdigest()})
assert any(file['path'] == 'index.html' for file in files)
receipt = {
    'schema': 1, 'status': 'passed',
    'commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    'tree': subprocess.check_output(['git', 'rev-parse', 'HEAD^{tree}'], text=True).strip(),
    'lockSha256': hashlib.sha256(Path('pnpm-lock.yaml').read_bytes()).hexdigest(),
    'node': subprocess.check_output(['node', '--version'], text=True).strip(),
    'pnpm': subprocess.check_output(['pnpm', '--version'], text=True).strip(),
    'runtime': runtime,
    'runtimeEdges': edges,
    'checks': ['frozen-install', 'typecheck-and-build', 'release-tests',
               'installed-runtime-archives', 'nested-runtime-edges',
               'portable-tests', 'portable-browser-smoke', 'playwright', 'unchanged-lock'],
    'files': files,
    'limits': 'Hosted website checks only; native release gate and production acceptance remain separate.',
}
Path('ci-evidence/artifact.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(f'Bound {len(files)} site files and {len(runtime["packages"])} authenticated cohort packages to {receipt["commit"]}')
