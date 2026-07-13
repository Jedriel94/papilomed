// Helper para llamadas a la API.
// La base se calcula desde la carpeta actual, así funciona igual en la raíz
// del dominio o en una subcarpeta como /muestras.
const API_BASE = location.pathname.replace(/[^/]*$/, '') + 'api/';

const api = {
  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(API_BASE + path, opts);
    let data = null;
    try { data = await res.json(); } catch (_) { /* respuesta sin cuerpo */ }

    if (!res.ok) {
      const err = new Error((data && data.error) || `Error ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  },
  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  patch(path, body) { return this.request('PATCH', path, body); },
};
