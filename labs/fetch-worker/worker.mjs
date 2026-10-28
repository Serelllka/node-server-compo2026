export function createHandler(fetchUser = fetch) {
  return async request => {
    const send = (status, body) => new Response(body, {
      status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
    if (request.method !== 'GET') return send(405, 'Method not allowed');
    const pathname = new URL(request.url).pathname
      .replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
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

export default { fetch: createHandler() };
