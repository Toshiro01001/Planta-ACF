/* sw.js · guarda os arquivos do site neste aparelho para a 2ª sessão abrir rápido (Planta da Caixa)
   - Página (index.html e qualquer navegação): sempre pela rede, conferindo se mudou; sem rede, a última cópia.
   - Arquivos do site com ?v= (versionados): primeiro o guardado. Cada entrega nova troca o ?v= no index.html,
     então o arquivo novo tem outro endereço e vem da rede: nunca serve arquivo velho depois de uma entrega.
   - three.min.js do cdnjs (versão fixa r128): primeiro o guardado.
   - Modelos V2 (modelos/v2/*.glb?v=): primeiro o guardado (o ?v= troca a cada entrega do modelo).
   - Kit do mapa V2 (modelos/mapa_v2/*, pedido sem ?v=): o guardado na hora e, por trás, confere a rede e atualiza
     a cópia para a próxima sessão (uma troca do kit aparece na sessão seguinte; mapa_v2.js vem com ?v=).
   - Bibliotecas do 3D em lib/ (carregadores do three.js r128, decodificador meshopt, transcodificador KTX2): não mudam
     de versão, então primeiro o guardado mesmo sem ?v= (o transcodificador .wasm é pedido sem ?v=).
   - O resto (Firebase, fontes, sons, imagens, modelos): direto pela rede, sem passar por aqui.
   - Limpeza: a página avisa as versões que está usando e as outras versões dos mesmos arquivos saem do cache;
     um sw.js novo (CACHE com outro nome) apaga os caches antigos ao ativar. */
'use strict';
const CACHE = 'acf-arquivos-1';
const PAGINAS = 'acf-paginas-1';
const THREE = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const PROPRIOS = [CACHE, PAGINAS];

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k.startsWith('acf-') && !PROPRIOS.includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

const noEscopo = u => u.href.startsWith(self.registration.scope);
const versionado = u => /(^|[?&])v=/.test(u.search.slice(1));
const kitMapa = u => u.pathname.startsWith(new URL(self.registration.scope).pathname + 'modelos/mapa_v2/');
// guardado na hora; a rede atualiza a cópia em segundo plano
async function guardadoAtualiza(req, e) {
  const c = await caches.open(CACHE), hit = await c.match(req.url);
  const rede = fetch(req).then(r => { if (r.ok && r.type === 'basic') c.put(req.url, r.clone()).catch(() => {}); return r; });
  if (hit) { e.waitUntil(rede.catch(() => {})); return hit; }
  return rede;
}
const biblioteca = u => u.pathname.startsWith(new URL(self.registration.scope).pathname + 'lib/');

// página: rede primeiro (revalida sempre); a cópia guardada só serve sem rede
async function pagina(req) {
  const chave = req.url.split('#')[0].split('?')[0];
  try {
    const r = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
    if (r.redirected) return Response.redirect(r.url, 302);
    if (r.ok) { const c = await caches.open(PAGINAS); c.put(chave, r.clone()).catch(() => {}); }
    return r;
  } catch (er) {
    const c = await caches.open(PAGINAS), hit = await c.match(chave);
    if (hit) return hit;
    throw er;
  }
}
// arquivo versionado do site: guardado primeiro; da rede, guarda só resposta boa
async function guardadoPrimeiro(req) {
  const c = await caches.open(CACHE), hit = await c.match(req.url);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok && r.type === 'basic') c.put(req.url, r.clone()).catch(() => {});
  return r;
}
let guardandoThree = null, threeGuardado = false;
caches.open(CACHE).then(c => c.match(THREE)).then(hit => { threeGuardado = !!hit; }).catch(() => {});
function guardarThree() {
  return guardandoThree || (guardandoThree = (async () => {
    try {
      const r = await fetch(new Request(THREE, { mode: 'cors', credentials: 'omit' }));
      if (r.ok) { await (await caches.open(CACHE)).put(THREE, r); threeGuardado = true; }
    } catch (er) {} finally { guardandoThree = null; }
  })());
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let u; try { u = new URL(req.url); } catch (er) { return; }
  if (req.mode === 'navigate' && noEscopo(u)) { e.respondWith(pagina(req)); return; }
  // three.js: guardado, serve o guardado; senão o navegador baixa como sempre (sem passar por aqui) e uma cópia é
  // guardada em segundo plano para a próxima sessão
  // (a decisão tem de ser na hora: só responde daqui quando já sabe que a cópia existe)
  if (req.url === THREE) {
    if (threeGuardado) e.respondWith(caches.open(CACHE).then(c => c.match(THREE)).then(hit => hit || fetch(req)));
    else e.waitUntil(guardarThree());
    return;
  }
  if (u.origin === self.location.origin && noEscopo(u) && !versionado(u) && kitMapa(u)) { e.respondWith(guardadoAtualiza(req, e)); return; }
  if (u.origin === self.location.origin && noEscopo(u) && (versionado(u) || biblioteca(u)) && !u.pathname.endsWith('/sw.js')) e.respondWith(guardadoPrimeiro(req));
});

// a página manda os endereços que está usando: outra versão do mesmo arquivo sai do cache
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.t !== 'versoes' || !Array.isArray(d.urls)) return;
  e.waitUntil((async () => {
    const usa = new Set(d.urls), caminhos = new Set(d.urls.map(x => { try { return new URL(x).pathname; } catch (er) { return ''; } }));
    const c = await caches.open(CACHE);
    for (const r of await c.keys()) {
      const u = new URL(r.url);
      if (u.origin === self.location.origin && caminhos.has(u.pathname) && !usa.has(r.url)) await c.delete(r);
    }
  })());
});
