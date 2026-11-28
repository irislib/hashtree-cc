import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const root=process.cwd();
const pins=JSON.parse(readFileSync('scripts/runtime-pins.json','utf8')).packages;
function resolveManifest(name,parent) {
  const require=createRequire(parent);
  for (const directory of require.resolve.paths(name) ?? []) {
    const file=path.join(directory,name,'package.json');
    if (existsSync(file)) return realpathSync(file);
  }
  return null;
}
const visited=new Set(), edges=[], packages=[];
function visit(manifest) {
  if (visited.has(manifest)) return;
  visited.add(manifest);
  const pkg=JSON.parse(readFileSync(manifest,'utf8'));
  if (pins[pkg.name]) {
    assert.equal(pkg.version,pins[pkg.name].version,`Unexpected installed ${pkg.name}`);
    packages.push({name:pkg.name,version:pkg.version,path:path.relative(root,manifest)});
  }
  const names=new Set([...Object.keys(pkg.dependencies??{}),...Object.keys(pkg.optionalDependencies??{}),...Object.keys(pkg.peerDependencies??{})]);
  for (const name of names) {
    const target=resolveManifest(name,manifest);
    const optional=name in (pkg.optionalDependencies??{}) || pkg.peerDependenciesMeta?.[name]?.optional;
    if (!target) { assert.ok(optional || !pins[name],`Missing cohort dependency ${pkg.name} -> ${name}`);continue; }
    if (pins[name]) {
      const selected=JSON.parse(readFileSync(target,'utf8'));
      assert.equal(selected.version,pins[name].version,`Stale nested edge ${pkg.name} -> ${name}`);
      edges.push({from:pkg.name,to:name,version:selected.version,path:path.relative(root,target)});
    }
    visit(target);
  }
}
visit(path.resolve('apps/hashtree-cc/package.json'));
assert.ok(edges.some(e=>e.from==='@hashtree/fips-transport'&&e.to==='@fips/transport-websocket'));
assert.ok(edges.some(e=>e.from==='@hashtree/worker'&&e.to==='@hashtree/nostr-pubsub'));
assert.ok(edges.some(e=>e.from==='@hashtree/nostr-pubsub'&&e.to==='nostr-pubsub'));
writeFileSync('ci-evidence/runtime-edges.json',JSON.stringify({visitedPackages:visited.size,packages,edges},null,2)+'\n');
console.log(`Verified ${packages.length} reachable cohort instances and ${edges.length} cohort dependency edges`);
