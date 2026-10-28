import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { createHandler } from './worker.mjs';

const request = (path, options) => new Request(`https://worker.example${path}`, options);

test('default Worker and normalized login routes return exact plain text', async () => {
  const handler = createHandler(() => assert.fail('Unexpected upstream request'));
  for (const path of ['/login', '/login/', '//login//?test=1']) {
    const response = await handler(request(path));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(response.headers.has('location'), false);
    assert.equal(await response.text(), 'serelllka');
  }
  assert.equal(await (await worker.fetch(request('/login'))).text(), 'serelllka');
  assert.equal((await handler(request('/missing'))).status, 404);
  assert.equal((await handler(request('/login', { method: 'POST' }))).status, 405);
});

test('different IDs fetch only the fixed upstream and return only its login', async () => {
  const handler = createHandler(async (url, options) => {
    assert.match(url, /^https:\/\/nd\.kodaktor\.ru\/users\/(3|7)$/);
    assert.equal(options.method ?? 'GET', 'GET');
    assert.equal(new Headers(options.headers).has('content-type'), false);
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.signal.aborted, false);
    return Response.json({ login: `user-${url.split('/').at(-1)}`, password: 'not returned' });
  });
  for (const id of [3, 7]) {
    const response = await handler(request(`//id//${id}/`));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), `user-${id}`);
  }
});

test('invalid IDs never reach upstream', async () => {
  const handler = createHandler(() => assert.fail('Unexpected upstream request'));
  for (const id of ['abc', '-1', '123456789012345678901', '7/8', '%2Fexample.com']) {
    assert.equal((await handler(request(`/id/${id}`))).status, 400);
  }
});

test('upstream failures preserve status and plain-text error contract', async t => {
  for (const [name, upstream, status] of [
    ['missing', async () => new Response('', { status: 404 }), 404],
    ['server error', async () => new Response('', { status: 500 }), 502],
    ['invalid JSON', async () => new Response('{'), 502],
    ['no login', async () => Response.json({ name: 'Someone' }), 502],
    ['empty login', async () => Response.json({ login: ' ' }), 502],
    ['null response', async () => Response.json(null), 502],
    ['network error', async () => { throw new TypeError('fetch failed'); }, 502],
    ['timeout', async () => { throw new DOMException('Timed out', 'TimeoutError'); }, 502],
  ]) {
    await t.test(name, async () => {
      const response = await createHandler(upstream)(request('/id/3'));
      assert.equal(response.status, status);
      assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
      assert.equal(await response.text(), status === 404 ? 'User not found' : 'User service unavailable');
    });
  }
});
