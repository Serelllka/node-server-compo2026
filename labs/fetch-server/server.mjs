import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

export function createHandler(fetchUser = fetch) {
  return async (request, response) => {
    const send = (status, body) => {
      response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(body);
    };
    if (request.method !== 'GET') return send(405, 'Method not allowed');

    let pathname;
    try {
      pathname = new URL(`http://localhost${request.url}`).pathname
        .replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    } catch {
      return send(400, 'Invalid URL');
    }
    if (pathname === '/login') return send(200, 'serelllka');
    if (!pathname.startsWith('/id/')) return send(404, 'Not found');
    const id = pathname.slice(4);
    if (!/^\d{1,20}$/.test(id)) return send(400, 'Invalid user ID');

    try {
      const upstream = await fetchUser(`https://nd.kodaktor.ru/users/${id}`, {
        signal: AbortSignal.timeout(12000),
      });
      if (upstream.status === 404) return send(404, 'User not found');
      if (!upstream.ok) throw new Error('User service failed');
      const data = await upstream.json();
      if (typeof data?.login !== 'string' || !data.login.trim()) {
        throw new Error('Invalid user response');
      }
      return send(200, data.login);
    } catch {
      return send(502, 'User service unavailable');
    }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  createServer(createHandler()).listen(port, '0.0.0.0', () => {
    console.log(`Listening on port ${port}`);
  });
}
