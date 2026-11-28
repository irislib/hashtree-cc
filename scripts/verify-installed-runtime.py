"""Authenticate every installed cohort package, including nested copies, before building."""
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import tarfile
import urllib.request

root = Path.cwd()
pins = json.loads((root / 'scripts/runtime-pins.json').read_text())
virtual = root / 'node_modules/.pnpm'
report = {'cohort': pins['cohort'], 'source': pins['source'], 'packages': {}, 'notInstalled': []}
for name, pin in pins['packages'].items():
    manifests = sorted({p.resolve() for p in virtual.glob(f'*/node_modules/{name}/package.json')})
    if not manifests:
        report['notInstalled'].append(name)
        continue
    with urllib.request.urlopen(pin['url'], timeout=30) as response:
        archive = response.read(10 * 1024 * 1024 + 1)
    assert len(archive) <= 10 * 1024 * 1024, name
    assert hashlib.sha256(archive).hexdigest() == pin['sha256'], name + ' archive SHA256'
    assert 'sha512-' + base64.b64encode(hashlib.sha512(archive).digest()).decode() == pin['integrity'], name + ' archive integrity'
    members = {}
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        for member in tar:
            if member.isdir():
                continue
            assert member.isfile() and member.name.startswith('package/'), member.name
            relative = Path(member.name.removeprefix('package/'))
            assert not relative.is_absolute() and '..' not in relative.parts, member.name
            assert relative.as_posix() not in members, 'Duplicate archive member ' + member.name
            members[relative.as_posix()] = (tar.extractfile(member).read(), member.mode & 0o111)
    assert 'package.json' in members, name
    for manifest in manifests:
        package = manifest.parent
        metadata = json.loads(manifest.read_text())
        assert (metadata['name'], metadata['version']) == (name, pin['version']), str(manifest)
        actual = set()
        for directory, directories, files in os.walk(package, followlinks=False):
            if Path(directory) == package:
                directories[:] = [d for d in directories if d != 'node_modules']
            for d in directories:
                assert not (Path(directory) / d).is_symlink(), str(Path(directory) / d)
            for file in files:
                entry = Path(directory) / file
                assert entry.is_file() and not entry.is_symlink(), str(entry)
                relative = entry.relative_to(package).as_posix()
                actual.add(relative)
                assert relative in members, name + ' extra file ' + relative
                expected, executable = members[relative]
                assert entry.read_bytes() == expected, name + '/' + relative
                assert entry.stat().st_mode & 0o111 == executable, name + ' mode ' + relative
        assert actual == set(members), name + ' file set'
    report['packages'][name] = dict(pin, copies=len(manifests), filesPerCopy=len(members))
    print(f'Authenticated {name} {pin["version"]}: {len(manifests)} installed copies, {len(members)} files each', flush=True)
for required in ('@hashtree/core', '@hashtree/worker', '@hashtree/fips-transport', '@hashtree/nostr-pubsub', '@fips/core', '@fips/browser', '@fips/transport-webrtc', '@fips/transport-websocket', 'nostr-pubsub', 'nostr-social-graph'):
    assert required in report['packages'], required + ' missing'
Path('ci-evidence/installed-runtime.json').write_text(json.dumps(report, indent=2) + '\n')
