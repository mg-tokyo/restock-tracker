// Route-table fetch mock. routes: { [urlSubstring]: response | (url, init) => response }
// response: { status?: number, body?: any } — body is JSON-encoded unless it is a string.
export function installMockFetch(routes) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const href = String(url);
    calls.push({ url: href, init });
    const key = Object.keys(routes).find((k) => href.includes(k));
    if (!key) return new Response('not found', { status: 404 });
    let r = routes[key];
    if (typeof r === 'function') r = await r(href, init);
    const status = r.status ?? 200;
    const body = typeof r.body === 'string' ? r.body : JSON.stringify(r.body ?? []);
    return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
  };
  return { calls };
}
