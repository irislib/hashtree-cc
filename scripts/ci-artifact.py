"""Bind the tested site to its source and installed public pubsub archive."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile
import urllib.request

url = 'https://registry.npmjs.org/nostr-pubsub/-/nostr-pubsub-0.5.42.tgz'
with urllib.request.urlopen(url, timeout=30) as response:
    archive = response.read(1_000_000)
archive_sha = hashlib.sha256(archive).hexdigest()
assert archive_sha == '8181645e74f3e5971a7bef55cceab24c0cee882b0a8eacc9c89657a03729a523'
packages = list(Path('node_modules/.pnpm').glob('*/node_modules/nostr-pubsub/package.json'))
assert packages, 'No installed nostr-pubsub package'
with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
    members = [(m.name.removeprefix('package/'), tar.extractfile(m).read())
               for m in tar.getmembers() if m.isfile()]
for package in packages:
    assert json.loads(package.read_text())['version'] == '0.5.42'
    for relative, expected in members:
        assert (package.parent / relative).read_bytes() == expected, relative

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
    'pubsub': {'url': url, 'bytes': len(archive), 'sha256': archive_sha,
               'installedCopies': len(packages), 'matchedFilesPerCopy': len(members)},
    'checks': ['frozen-install', 'typecheck-and-build', 'release-tests',
               'portable-tests', 'portable-browser-smoke', 'playwright', 'unchanged-lock'],
    'files': files,
    'limits': 'Hosted website checks only; native release gate and production acceptance remain separate.',
}
Path('ci-evidence/artifact.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(f'Bound {len(files)} site files and {len(packages)} installed pubsub copies to {receipt["commit"]}')
