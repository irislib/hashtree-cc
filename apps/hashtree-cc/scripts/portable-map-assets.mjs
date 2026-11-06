import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Only public map bytes cross this fixture boundary. No request headers, cookies,
// credentials, methods, redirects, sockets, or user-selected destinations do.
export async function startMapAssetCache(directory) {
  await mkdir(directory, { recursive: true });
  const started = Date.now(), budget = 128 * 1024 * 1024, perFile = 4 * 1024 * 1024;
  let received = 0;
  const fetched = new Map(), pending = new Map();
  try {
    const prior = JSON.parse(await readFile(path.join(directory, 'receipt.json'), 'utf8'));
    for (const asset of prior.assets) {
      const key = createHash('sha256').update(asset.pathname).digest('hex');
      const bytes = await readFile(path.join(directory, key));
      if (bytes.length !== asset.bytes || createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw Error('Retained map fixture cache changed');
      fetched.set(asset.pathname, asset);
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const obtain = async (pathname) => {
    const block = /^\/blocks\/([a-f0-9]{64})$/.exec(pathname);
    const glyph = /^\/fonts\/(Noto%20Sans%20(?:Regular|Italic|Bold)|Noto%20Sans%20CJK%20JP%20Regular)\/(\d{1,7}-\d{1,7})\.pbf$/.exec(pathname);
    if (!block && !glyph) throw Error('Path is not an allowed map asset');
    if (Date.now() - started > 180000) throw Error('Map asset retrieval deadline exceeded');
    const key = createHash('sha256').update(pathname).digest('hex');
    const filename = path.join(directory, key);
    if (fetched.has(pathname)) return readFile(filename);
    if (pending.has(pathname)) return pending.get(pathname);
    if (pending.size >= 16) throw Error('Map asset concurrency limit exceeded');
    const job = (async () => {
      const upstream = block ? `https://cdn.iris.to/${block[1]}.bin` : `https://tiles.openfreemap.org${pathname}`;
      const response = await fetch(upstream, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw Error(`Map asset HTTP ${response.status}`);
      const chunks = []; let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length; received += chunk.length;
        if (size > perFile || received > budget) throw Error('Map asset byte limit exceeded');
        chunks.push(chunk);
      }
      const bytes = Buffer.concat(chunks), sha256 = createHash('sha256').update(bytes).digest('hex');
      if (block && sha256 !== block[1]) throw Error('Map block hash mismatch');
      await writeFile(filename, bytes, { flag: 'wx' });
      fetched.set(pathname, { pathname, upstream, bytes: bytes.length, sha256, contentAddressVerified: Boolean(block) });
      return bytes;
    })().finally(() => pending.delete(pathname));
    pending.set(pathname, job); return job;
  };
  const server = createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    if (request.method !== 'GET' || request.url.includes('?') || request.url.includes('#')) {
      response.writeHead(405).end(); return;
    }
    try { const bytes = await obtain(request.url); response.writeHead(200, { 'content-type': 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' }).end(bytes); }
    catch (error) { response.writeHead(502).end(String(error.message)); }
  });
  server.on('connect', (_request, socket) => socket.destroy());
  server.on('upgrade', (_request, socket) => socket.destroy());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    async close() {
      await new Promise(resolve => server.close(resolve));
      await Promise.allSettled([...pending.values()]);
      await writeFile(path.join(directory, `receipt-${started}.json`), JSON.stringify({ started, elapsedMs: Date.now() - started, maximumBytes: budget, receivedBytes: received, methods: ['GET'], forwardedHeaders: [], redirects: false, assets: [...fetched.values()] }, null, 2) + '\n');
    },
  };
}

export function mapAssetPrelude(origin) {
  return `;(() => { const original = globalThis.fetch.bind(globalThis); globalThis.fetch = (input, options) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, globalThis.location.href);
    const method = options?.method ?? (typeof input === 'object' ? input.method : undefined) ?? 'GET';
    // Batch reads are answered locally from verified GETs; the POST never leaves.
    if (method === 'POST' && url.hostname === 'cdn.iris.to' && url.pathname === '/blob/batch') {
      return (async () => {
        const hashes = JSON.parse(options?.body ?? '').hashes;
        if (!Array.isArray(hashes) || hashes.length < 1 || hashes.length > 64 || hashes.some(hash => !/^[a-f0-9]{64}$/.test(hash))) throw Error('Invalid fixture read-batch hashes');
        const blocks = [];
        for (const hash of hashes) {
          const response = await original(${JSON.stringify(origin)} + '/blocks/' + hash, { method: 'GET' });
          if (!response.ok) throw Error('Fixture map block unavailable: ' + response.status);
          blocks.push({ hash, bytes: new Uint8Array(await response.arrayBuffer()) });
        }
        const bytes = new Uint8Array(12 + blocks.reduce((sum, block) => sum + 40 + block.bytes.length, 0));
        bytes.set([72,84,66,68,86,49,0,0]); const view = new DataView(bytes.buffer); view.setUint32(8, blocks.length, false); let offset = 12;
        for (const block of blocks) { bytes.set(Uint8Array.from(block.hash.match(/../g), pair => parseInt(pair,16)), offset); offset += 32; view.setBigUint64(offset, BigInt(block.bytes.length), false); offset += 8; bytes.set(block.bytes, offset); offset += block.bytes.length; }
        return new Response(bytes, { headers: { 'Content-Type': 'application/vnd.hashtree.blob-batch.v1+octet-stream' } });
      })();
    }
    let route;
    if (method === 'GET' && ['cdn.iris.to','upload.iris.to','cdn.hzrd149.com','blossom.primal.net'].includes(url.hostname) && /^\\/[a-f0-9]{64}(?:\\.[a-z0-9]+)?$/.test(url.pathname)) route = '/blocks/' + url.pathname.slice(1).split('.')[0];
    if (method === 'GET' && url.hostname === 'tiles.openfreemap.org' && url.pathname.startsWith('/fonts/')) route = url.pathname;
    return route ? original(${JSON.stringify(origin)} + route, { method: 'GET' }) : original(input, options);
  }; })();\n`;
}
