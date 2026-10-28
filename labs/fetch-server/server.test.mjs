import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { createHandler } from './server.mjs';

async function serve(t, upstream) {
  const server = createServer(createHandler(upstream));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return (path, init) => fetch(`http://127.0.0.1:${server.address().port}${path}`, init);
}

test('login and path normalization work without upstream requests or redirects', async t => {
  const request = await serve(t, () => assert.fail('Unexpected upstream request'));
  for (const path of ['/login', '/login/', '//login//?test=1']) {
    const response = await request(path, { redirect: 'manual' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(await response.text(), 'serelllka');
  }
  assert.equal((await request('/missing')).status, 404);
  assert.equal((await request('/login', { method: 'POST' })).status, 405);
});

test('fetches different IDs from the fixed upstream without Content-Type', async t => {
  const request = await serve(t, async (url, options) => {
    assert.match(url, /^https:\/\/nd\.kodaktor\.ru\/users\/(3|7)$/);
    assert.equal(new Headers(options.headers).has('content-type'), false);
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.signal.aborted, false);
    return Response.json({ login: `user-${url.split('/').at(-1)}`, password: 'not returned' });
  });
  for (const id of [3, 7]) {
    const response = await request(`//id//${id}/`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), `user-${id}`);
  }
});

test('invalid IDs never reach upstream', async t => {
  const request = await serve(t, () => assert.fail('Unexpected upstream request'));
  for (const id of ['abc', '-1', '123456789012345678901', '7/8', '%2Fexample.com']) {
    assert.equal((await request(`/id/${id}`)).status, 400);
  }
});

test('upstream failures preserve the expected status contract', async t => {
  for (const [name, upstream, status] of [
    ['missing', async () => new Response('', { status: 404 }), 404],
    ['server error', async () => new Response('', { status: 500 }), 502],
    ['invalid JSON', async () => new Response('{'), 502],
    ['no login', async () => Response.json({ name: 'Someone' }), 502],
    ['empty login', async () => Response.json({ login: ' ' }), 502],
    ['network error', async () => { throw new TypeError('fetch failed'); }, 502],
    ['timeout', async () => { throw new DOMException('Timed out', 'TimeoutError'); }, 502],
  ]) {
    await t.test(name, async t => {
      const request = await serve(t, upstream);
      const response = await request('/id/3');
      assert.equal(response.status, status);
      assert.match(response.headers.get('content-type'), /^text\/plain/);
    });
  }
});
