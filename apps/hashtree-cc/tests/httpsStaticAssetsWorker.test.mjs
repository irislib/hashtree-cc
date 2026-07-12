import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../scripts/https-static-assets-worker.mjs';

test('redirects plain HTTP requests to HTTPS', async () => {
  const response = await worker.fetch(
    new Request('http://hashtree.cc/#/dev'),
    {
      ASSETS: {
        fetch: () => new Response('asset'),
      },
    },
  );

  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://hashtree.cc/#/dev');
});

test('detects Cloudflare HTTP requests without a TLS version', async () => {
  const request = new Request('https://hashtree.cc/');
  Object.defineProperty(request, 'cf', {
    value: {},
  });

  const response = await worker.fetch(request, {
    ASSETS: {
      fetch: () => new Response('asset'),
    },
  });

  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://hashtree.cc/');
});

test('delegates HTTPS requests to static assets', async () => {
  let delegated = false;
  const response = await worker.fetch(
    new Request('https://hashtree.cc/'),
    {
      ASSETS: {
        fetch: () => {
          delegated = true;
          return new Response('asset', { status: 200 });
        },
      },
    },
  );

  assert.equal(delegated, true);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'asset');
});
