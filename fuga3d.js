/* =========================================================
   A CAIXA DE FÓSFOROS · fuga3d.js
   O lado dos jogadores na perseguição: o que a cobaia pode fazer para fugir.

   1. ROTA COM CUSTO: na vez do jogador, tocar/clicar no chão do 3D desenha o caminho
      (desviando de móveis e portas fechadas) com os metros de regra que ele gasta contra
      o deslocamento da vez. Com um Filho visível na perseguição, marca até onde ele chega
      no próximo turno ("ele te pega aqui"). Nunca de Filho oculto.
   2. OLHAR PARA TRÁS: a câmera vira por 2 s e mostra a criatura (se visível) e a distância.
      Custo é opção da casa (nada, um pouco de barulho, parte do deslocamento).
   3. BARRICADA: derrubar uma estante, empurrar uma maca ou mesa até o vão de uma porta, ou
      fechar e travar a porta do corredor. Força DT 15 (SaH, "Criar obstáculo"). Bloqueia a
      passagem no 3D e nas regras do mapa (mapa/barricadas). O Filho contorna ou arromba
      (Força DT 15); quem "arromba portas" quebra passando, quem "atravessa" passa direto.
   4. ESCONDERIJO POR DENTRO: quem se esconde vê pelas frestas (armário), pelo vão (embaixo da
      cama), por cima do que o cobre (atrás das caixas) ou entre as estantes, com respiração.
   5. BARULHO DE PROPÓSITO: gritar, assobiar ou jogar um objeto pela porta para a sala vizinha
      sobe o decibelímetro de lá (mapa/fuga/r, somado no mesmo ruído das salas).
   6. SINALIZAR: "aqui!", "ele foi por ali", "perigo" que o grupo inteiro vê por alguns
      segundos (marcador no 3D e no mapa; mapa/fuga/s).
   Tudo o que o livro não cobre é opção do Mestre (mapa/cfg/fuga, bloco Perseguição).

   Código genérico: nenhum Filho é citado; o que cada um faz vem das características (filhos.js).
   ========================================================= */
(() => {
'use strict';
const A = () => window.ACF;
const I = () => window.ACF._int;
const FX = () => window.ACF_FICHAS;
const FIL = () => window.ACF_FILHOS;
const S3 = () => window.Sala3D;
const MOM = () => window.ACF_MOMENTO;
const IMR = () => window.ACF_IMERSAO;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const agora = () => Date.now();
const num = (v, p = 0) => { const n = parseFloat(v); return isFinite(n) ? n : p; };
const int = v => Math.round(num(v));
const pad2 = n => String(n).padStart(2, '0');
const fmtM = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lsG = (k, p) => { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } };
const est = () => (A() && A().estado) || {};
const tokens = () => est().tokens || {};
const SERd = id => (A().SER || {})[id];
const tipoDe = tk => ((tk && SERd(tk.s)) || {}).tipo || '';
const souMestre = () => !!A().mestre;
const souAux = () => !!A().aux && !A().mestre;
const euJog = () => (!A().mestre && !A().aux ? A().meu : null);
const persg = () => est().persg || { on: false };
const ordemP = () => (persg().ordem ? Object.values(persg().ordem) : []);
const vezId = () => { const p = persg(), o = ordemP(); return p.on && o.length ? (o[p.vez || 0] || {}).id : null; };
const aberto3D = () => !!(S3() && S3().aberta);
const api3 = () => (aberto3D() && S3()._api) || null;
const salaP = tk => (tk && tk.a ? I().salaEm(tk.a, tk.x, tk.y) : null);
const cnDe = (a, p) => 25 * (a - 1) + p;
const dentroR = (r, x, y) => !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const celular = () => Math.min(innerWidth, innerHeight) < 700 || matchMedia('(pointer: coarse)').matches;
const nomeTk = tk => (A().rotulo ? A().rotulo(tk) : (SERd(tk.s) || {}).nome || '');
const LADO = { n: 'norte', s: 'sul', w: 'oeste', e: 'leste' };
const DT_FORCA = 15;   // Sobrevivendo ao Horror p. 90 e 91: "Criar obstáculo" e "algo pesado" = Força DT 15

/* =========================================================
   OPÇÕES DA CASA (mapa/cfg/fuga, só o Mestre grava)
   ========================================================= */
const PAD = { rota: true, pega: true, olhar: 'ruido', barr: true, barrCusto: 'metade', barulho: true, sinal: true, sinalRuido: true, frestas: true };
const cfgF = () => ((est().cfg || {}).fuga) || {};
const opc = k => { const v = cfgF()[k]; return v === undefined || v === null ? PAD[k] : v; };

/* =========================================================
   RUÍDO DE PROPÓSITO: mapa/fuga/r/<k> = { a, p, n, t, ts, x?, y? }
   Soma no ruído da sala (gruposDeSala, app.js) enquanto dura: decibelímetro, escuta dos
   auxiliares, audição dos Filhos, encontro por barulho. Ninguém precisa estar na sala.
   ========================================================= */
const RUIDO = {
  grito: { n: 2, s: 90, txt: 'um grito' },
  assobio: { n: 1, s: 60, txt: 'um assobio' },
  objeto: { n: 1, s: 60, txt: 'algo caindo' },
  olhar: { n: 1, s: 20, txt: 'passos se virando' },
  sinal: { n: 1, s: 20, txt: 'um chamado baixo' },
  barr: { n: 1, s: 60, txt: 'móveis arrastados' },
  arromba: { n: 2, s: 90, txt: 'um estrondo' },
};
const novaChave = l => l + agora().toString(36) + Math.random().toString(36).slice(2, 6);
const ruidosVivos = () => Object.entries((est().fuga || {}).r || {}).filter(([, v]) => v && RUIDO[v.t] && agora() - num(v.ts) < RUIDO[v.t].s * 1000);
function publicarRuido(t, a, p, x, y) {
  const R = RUIDO[t]; if (!R || !a || !p || p === 25) return null;   // Zona Neutra é isenta
  const k = novaChave('r'), v = { a, p, n: R.n, t, ts: agora() };
  if (typeof x === 'number' && typeof y === 'number') { v.x = +x.toFixed(2); v.y = +y.toFixed(2); }
  A().definir(['fuga', 'r', k], v);
  setTimeout(() => { if (((est().fuga || {}).r || {})[k]) A().definir(['fuga', 'r', k], null); }, R.s * 1000 + 800);
  return k;
}
// gancho de app.js (gruposDeSala): o barulho de propósito entra como "cobaias a mais" na sala
function gruposExtra(g) {
  ruidosVivos().forEach(([, v]) => {
    const k = `${v.a}:${v.p}`, n = clamp(int(v.n) || 1, 1, 2);
    if (g.has(k)) g.get(k).extra = (g.get(k).extra || 0) + n;
    else g.set(k, { a: v.a, p: v.p, ids: [], extra: n, fuga: true });
  });
}

/* =========================================================
   BARRICADAS: mapa/barricadas/<k>
   k = "cNN:i" (móvel i da cena da sala NN) ou "aA:cCI" (porta do corredor CI do andar A)
   v = { t: movel | porta, a, ci, cn, lado, i?, ob?, q, ts }
   Bloqueia uma faixa do corredor ci (a ponta encostada na sala cn, ou o meio, na porta).
   ========================================================= */
const barricadas = () => Object.entries(est().barricadas || {}).filter(([, v]) => v && v.a && typeof v.ci === 'number');
function zonaBarr(v) {
  const c = A().geo.CORREDORES[v.ci]; if (!c) return null;
  if (v.t === 'porta') { const w = .22; return c.eixo === 'h' ? { x: c.x + c.w / 2 - w / 2, y: c.y - .02, w, h: c.h + .04 } : { x: c.x - .02, y: c.y + c.h / 2 - w / 2, w: c.w + .04, h: w }; }
  const p = int(v.cn) - 25 * (v.a - 1), r = A().geo.retSala(p); if (!r) return null;
  const d = .16;
  if (c.eixo === 'h') { const esq = Math.abs(c.x - (r.x + r.w)) < .3; return { x: esq ? c.x - .02 : c.x + c.w - d + .02, y: c.y - .02, w: d, h: c.h + .04 }; }
  const cima = Math.abs(c.y - (r.y + r.h)) < .3; return { x: c.x - .02, y: cima ? c.y - .02 : c.y + c.h - d + .02, w: c.w + .04, h: d };
}
const cfgTkF = tk => (FIL() && FIL().cfgTk ? FIL().cfgTk(tk) : null);
const arromba = id => { const tk = tokens()[id]; if (!tk || tipoDe(tk) !== 'filho') return false; const c = cfgTkF(tk); return !!(c && c.movx && c.movx.arromba); };
const atravessa = id => !!(id && FIL() && FIL().atravessa && FIL().atravessa(id));
const quebrando = {};
// gancho de app.js (andavel): a barricada é parede para todos, menos quem atravessa ou arromba
function bloqueia(quem, a, x, y, efeito = true) {
  const L = est().barricadas; if (!L) return false;
  for (const k in L) {
    const v = L[k]; if (!v || v.a !== a) continue;
    if (!dentroR(zonaBarr(v), x, y)) continue;
    if (quem && atravessa(quem)) continue;
    if (quem && arromba(quem)) { if (efeito) agendarQuebra(k, quem); continue; }
    return true;
  }
  return false;
}
function agendarQuebra(k, quem) {
  if (quebrando[k] || !(souMestre() || souAux())) return;
  quebrando[k] = setTimeout(() => {
    const v = (est().barricadas || {})[k]; quebrando[k] = null; if (!v) return;
    A().definir(['barricadas', k], null);
    publicarRuido('arromba', v.a, int(v.cn) - 25 * (v.a - 1));
    A().diario('persg', `Barricada derrubada com estrondo em CN ${pad2(v.cn)} (passou arrombando)`);
    const ap = api3(); if (ap) ap.toast('💥 A barricada cedeu com um estrondo.');
  }, 60);
}
const custoDesc = { nada: 'sem custo de metros', m3: '3 m da vez', metade: 'metade da vez', vez: 'a vez inteira' };
// custo em metros na perseguição (só na vez de quem age); devolve '' ou o motivo de não poder
function cobrarMetros(id, quanto, rotulo) {
  const p = persg(); if (!p.on || !ordemP().some(o => o.id === id)) return '';
  if (vezId() !== id) return 'Na perseguição, isso é na sua vez.';
  if (!quanto) return '';
  const tk = tokens()[id], lim = A().limiteDe(id); if (!tk || !lim) return '';
  const rest = Math.max(0, lim - num(tk.m));
  const c = quanto === 'metade' ? lim / 2 : quanto === 'vez' ? lim : num(quanto);
  if (rest <= .05) return `Deslocamento esgotado: ${rotulo} gasta ${quanto === 'vez' ? 'a vez inteira' : fmtM(c) + ' m'}.`;
  if (quanto !== 'vez' && quanto !== 'metade' && rest < c - .01) return `${rotulo} gasta ${fmtM(c)} m e sobram ${fmtM(rest)} m nesta vez.`;
  A().definir(['tokens', id], { ...tk, m: +Math.min(lim, num(tk.m) + c).toFixed(2) });
  return '';
}
const metrosBarr = () => ({ nada: 0, m3: 3, metade: 'metade', vez: 'vez' })[opc('barrCusto')] ?? 'metade';

/* teste de Força: ficha ativa do jogador (ou a ficha ligada ao Filho); sem ficha, 1d20 */
async function testeForca(id, tk) {
  const F = FX(); if (!F) return { total: 1 + Math.floor(Math.random() * 20), dados: [], como: '1d20' };
  if (tipoDe(tk) === 'filho') {
    const fichas = (await A().Rede.once('agentesAux').catch(() => null)) || {};
    const d = Object.values(fichas).find(x => x && x.tipo === 'ameaca' && x.filho === tk.s);
    const q = d && d.atr ? int(d.atr.for) : 1, t = F.rolarTeste(q, 0); t.como = d ? `Força ${q} da ficha` : '1d20, sem ficha'; return t;
  }
  const at = euJog() === id && F.ativa ? F.ativa() : null;
  if (at && at.d && at.d.atr) { const q = int(at.d.atr.for), t = F.rolarTeste(q, 0); t.como = `Força ${q}`; return t; }
  const t = F.rolarTeste(1, 0); t.como = '1d20, sem ficha ativa'; return t;
}

/* =========================================================
   SINAIS: mapa/fuga/s/<k> = { a, x, y, t: aqui | foi | perigo, ts, q, d? }
   ========================================================= */
const SINAL = { aqui: { i: '📍', n: 'Aqui!', cor: '#ffd23f' }, foi: { i: '➜', n: 'Ele foi por ali', cor: '#7fd3ff' }, perigo: { i: '⚠', n: 'Perigo!', cor: '#ff4a3a' } };
let SINAL_S = 8;
const sinaisVivos = () => Object.entries((est().fuga || {}).s || {}).filter(([, v]) => v && SINAL[v.t] && agora() - num(v.ts) < SINAL_S * 1000);

/* =========================================================
   CAMINHO NO 3D (A* numa grade de 40 cm, com os móveis e as regras do mapa)
   ========================================================= */
function caminho(x0, z0, x1, z1, livre, op = {}) {
  const passo = op.passo || .4, pad = op.pad || 8, maxN = op.max || 90000;
  const fator = op.fator || (() => 1);
  const minX = Math.min(x0, x1) - pad, minZ = Math.min(z0, z1) - pad;
  const nx = Math.ceil((Math.max(x0, x1) + pad - minX) / passo) + 1, nz = Math.ceil((Math.max(z0, z1) + pad - minZ) / passo) + 1;
  if (nx * nz > 400000) return null;
  const cache = new Int8Array(nx * nz);   // 0 não visto, 1 livre, 2 bloqueado
  const X = i => minX + (i % nx) * passo, Z = i => minZ + Math.floor(i / nx) * passo;
  const ok = i => { let c = cache[i]; if (!c) { c = livre(X(i), Z(i)) ? 1 : 2; cache[i] = c; } return c === 1; };
  const idx = (x, z) => clamp(Math.round((z - minZ) / passo), 0, nz - 1) * nx + clamp(Math.round((x - minX) / passo), 0, nx - 1);
  let ini = idx(x0, z0), fim = idx(x1, z1);
  // ponto livre mais perto (o token pode estar encostado num móvel; o alvo, em cima de um)
  const perto = (i, r) => { if (ok(i)) return i; const ix = i % nx, iz = Math.floor(i / nx); let best = -1, bd = 1e9; for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const jx = ix + dx, jz = iz + dz; if (jx < 0 || jz < 0 || jx >= nx || jz >= nz) continue; const j = jz * nx + jx; if (ok(j)) { const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = j; } } } return best; };
  ini = perto(ini, 3); fim = perto(fim, 4);
  if (ini < 0 || fim < 0) return null;
  const g = new Float32Array(nx * nz).fill(Infinity), de = new Int32Array(nx * nz).fill(-1), fechado = new Uint8Array(nx * nz);
  const heap = [], hf = [];
  const push = (i, f) => { heap.push(i); hf.push(f); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (hf[p] <= hf[c]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; [hf[p], hf[c]] = [hf[c], hf[p]]; c = p; } };
  const pop = () => { const top = heap[0], lh = heap.pop(), lf = hf.pop(); if (heap.length) { heap[0] = lh; hf[0] = lf; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < heap.length && hf[l] < hf[m]) m = l; if (r < heap.length && hf[r] < hf[m]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; [hf[m], hf[c]] = [hf[c], hf[m]]; c = m; } } return top; };
  const fx = X(fim), fz = Z(fim), hmin = op.hmin || .3536;
  g[ini] = 0; push(ini, Math.hypot(X(ini) - fx, Z(ini) - fz) * hmin);
  const viz = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  let n = 0, achou = false;
  while (heap.length) {
    const i = pop(); if (fechado[i]) continue; fechado[i] = 1;
    if (i === fim) { achou = true; break; }
    if (++n > maxN) break;
    const ix = i % nx, iz = Math.floor(i / nx), xi = X(i), zi = Z(i);
    for (const [dx, dz, w] of viz) {
      const jx = ix + dx, jz = iz + dz; if (jx < 0 || jz < 0 || jx >= nx || jz >= nz) continue;
      const j = jz * nx + jx; if (fechado[j] || !ok(j)) continue;
      if (dx && dz && (!ok(iz * nx + jx) || !ok(jz * nx + ix))) continue;   // sem cortar quina
      const ng = g[i] + w * passo * fator(xi + dx * passo / 2, zi + dz * passo / 2);
      if (ng < g[j]) { g[j] = ng; de[j] = i; push(j, ng + Math.hypot(X(j) - fx, Z(j) - fz) * hmin); }
    }
  }
  if (!achou) return null;
  const pts = []; for (let i = fim; i >= 0; i = de[i]) { pts.push([X(i), Z(i)]); if (i === ini) break; }
  pts.reverse();
  pts[0] = [x0, z0];
  if (op.alvoExato && livre(x1, z1)) pts[pts.length - 1] = [x1, z1];
  // puxa o fio: liga direto os pontos que se enxergam
  const linha = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), s = Math.max(1, Math.ceil(d / .15)); for (let k = 1; k < s; k++) if (!livre(a[0] + (b[0] - a[0]) * k / s, a[1] + (b[1] - a[1]) * k / s)) return false; return true; };
  const out = [pts[0]]; let i = 0;
  while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !linha(pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
  return out;
}
// metros de regra ao longo de um caminho do 3D
function custoCaminho(ap, pts) {
  const seg = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const c = A().custoMetros(ap.plantaDe3D(pts[i - 1][0], pts[i - 1][1]), ap.plantaDe3D(pts[i][0], pts[i][1])); seg.push(c); tot += c; }
  return { tot, seg };
}
// ponto do caminho em que se gastam "m" metros de regra
function pontoEm(ap, pts, seg, m) {
  let acc = 0;
  for (let i = 0; i < seg.length; i++) {
    if (acc + seg[i] >= m) {
      const a = pts[i], b = pts[i + 1]; let lo = 0, hi = 1;
      for (let k = 0; k < 16; k++) { const mid = (lo + hi) / 2, q = [a[0] + (b[0] - a[0]) * mid, a[1] + (b[1] - a[1]) * mid]; if (acc + A().custoMetros(ap.plantaDe3D(a[0], a[1]), ap.plantaDe3D(q[0], q[1])) <= m) lo = mid; else hi = mid; }
      return { i, k: lo, p: [a[0] + (b[0] - a[0]) * lo, a[1] + (b[1] - a[1]) * lo] };
    }
    acc += seg[i];
  }
  return { i: seg.length - 1, k: 1, p: pts[pts.length - 1] };
}
// regras do mapa para um token qualquer (sem precisar mover): portas, barricadas e o que o filhos.js barra
function portaBarra(a, ci, x, y) {
  const c = A().geo.CORREDORES[ci];
  const r = c.eixo === 'h' ? { x: c.x + .05, y: c.y - .01, w: c.w - .1, h: c.h + .02 } : { x: c.x - .01, y: c.y + .05, w: c.w + .02, h: c.h - .1 };
  return dentroR(r, x, y);
}
function plantaLivre(id, a, x, y) {
  if (atravessa(id)) return true;
  const C = A().geo.CORREDORES, F = FIL();
  for (let ci = 0; ci < C.length; ci++) if (A().portaDe(a, ci) !== 'a' && !(F && F.ignoraPorta && F.ignoraPorta(id, a, ci)) && portaBarra(a, ci, x, y)) return false;
  if (F && F.bloqueia && tipoDe(tokens()[id]) === 'filho' && F.bloqueia(id, a, x, y)) return false;
  return !bloqueia(id, a, x, y, false);
}
const naSala3D = (ap, x, z) => { for (const s of Object.values(ap.mundo.S)) if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) return true; return false; };

/* =========================================================
   FILHOS À VISTA (do jeito que este aparelho enxerga): nunca os ocultos
   ========================================================= */
function filhosVisiveis(a) {
  return Object.entries(tokens()).filter(([id, tk]) => tk && tk.a === a && tipoDe(tk) === 'filho' && !tk.h && !tk.oc && !tk.fo && !tk.pp && !tk.cp
    && A().visivelPara(tk) && !(FIL() && FIL().visivelJogador && !FIL().visivelJogador(tk)) && !(FIL() && FIL().foraDoEncontro && FIL().foraDoEncontro(tk)) && !(FIL() && FIL().aparencia && FIL().aparencia(tk)));
}
// salas de distância pela planta (corredores)
function salasEntre(a, p0, p1) {
  if (!p0 || !p1) return null; if (p0 === p1) return 0;
  const C = A().geo.CORREDORES, vis = new Map([[p0, 0]]), fila = [p0];
  while (fila.length) { const p = fila.shift(), d = vis.get(p); for (const c of C) { const q = c.p1 === p ? c.p2 : c.p2 === p ? c.p1 : null; if (q && !vis.has(q)) { if (q === p1) return d + 1; vis.set(q, d + 1); fila.push(q); } } }
  return null;
}

/* =========================================================
   ESTILO (injetado: este arquivo é autossuficiente)
   ========================================================= */
const CSS = `
.fuga-barra { position: absolute; right: max(10px, env(safe-area-inset-right)); bottom: calc(max(12px, env(safe-area-inset-bottom)) + 74px); z-index: 4; display: flex; gap: 5px; pointer-events: auto; }
.fuga-barra[hidden] { display: none; }
.fuga-bt { min-width: 50px; min-height: 46px; padding: 4px 6px 3px; display: grid; justify-items: center; align-content: center; gap: 1px; border-radius: 12px; border: 1px solid rgba(139,92,246,.55); background: rgba(15,12,22,.86); color: #ece6f8; font: 600 10.5px/1.05 var(--mono, monospace); cursor: pointer; -webkit-tap-highlight-color: transparent; backdrop-filter: blur(3px); }
.fuga-bt i { font-style: normal; font-size: 18px; line-height: 1.1; }
.fuga-bt:hover, .fuga-bt:focus-visible { border-color: #c4a8ff; outline: none; }
.fuga-bt.on { border-color: #ffd23f; box-shadow: 0 0 0 1px #ffd23f inset; }
.fuga-bt.off { opacity: .45; }
.fuga-pop { position: absolute; right: max(10px, env(safe-area-inset-right)); bottom: calc(max(12px, env(safe-area-inset-bottom)) + 128px); z-index: 70; width: min(330px, calc(100% - 20px)); max-height: 52vh; overflow: auto; padding: 10px; border-radius: 14px; background: rgba(13,10,20,.96); border: 1px solid #8b5cf6; box-shadow: 0 10px 30px rgba(0,0,0,.6); color: #ece6f8; display: grid; gap: 6px; font: 13px/1.3 var(--sans, system-ui, sans-serif); }
.fuga-pop[hidden] { display: none; }
.fuga-pop:not([hidden]) ~ .fuga-rota { display: none; }
.fuga-pop h4 { margin: 0 0 2px; font: 700 11px var(--mono, monospace); letter-spacing: .12em; color: #ffd23f; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.fuga-pop h4 button { min-width: 40px; min-height: 40px; border: 0; background: transparent; color: #cfc6e0; font-size: 18px; cursor: pointer; }
.fuga-pop .fuga-op { min-height: 44px; text-align: left; padding: 7px 10px; border-radius: 10px; border: 1px solid #3a2e52; background: #1a1426; color: #ece6f8; font: 600 13px/1.25 var(--sans, system-ui, sans-serif); cursor: pointer; display: flex; gap: 10px; align-items: center; }
.fuga-pop .fuga-op:hover, .fuga-pop .fuga-op:focus-visible { border-color: #8b5cf6; outline: none; }
.fuga-pop .fuga-op i { font-style: normal; font-size: 18px; flex: none; width: 22px; text-align: center; }
.fuga-pop .fuga-op small { display: block; font: 500 11px/1.25 var(--mono, monospace); color: #a99bc4; margin-top: 2px; }
.fuga-pop .fuga-op[disabled], .fuga-pop .fuga-op[aria-disabled="true"] { opacity: .5; cursor: default; }
.fuga-pop p.mini { margin: 0; font-size: 11.5px; color: #a99bc4; }
.fuga-rota { position: absolute; right: max(10px, env(safe-area-inset-right)); bottom: calc(max(12px, env(safe-area-inset-bottom)) + 128px); z-index: 4; display: flex; align-items: center; gap: 6px; max-width: min(340px, calc(100% - 20px)); padding: 5px 6px 5px 12px; border-radius: 22px; background: rgba(13,10,20,.9); border: 1px solid #ffd23f; color: #fff6d6; font: 700 12.5px var(--mono, monospace); pointer-events: auto; }
.fuga-rota[hidden] { display: none; }
.fuga-rota.longe { border-color: #ff5a4a; color: #ffd9d4; }
.fuga-rota span { flex: 1 1 auto; line-height: 1.3; }
.fuga-rota button { flex: none; min-width: 40px; min-height: 40px; border-radius: 999px; border: 1px solid #ffd23f; background: #3a2c08; color: #ffe9a8; font: 700 12.5px var(--mono, monospace); cursor: pointer; padding: 0 12px; }
.fuga-rota button.x { border-color: #5a4a6e; background: transparent; color: #cfc6e0; padding: 0; }
.fuga-olhar { position: absolute; left: 50%; top: 38%; transform: translate(-50%, -50%); z-index: 4; min-width: min(300px, calc(100% - 40px)); max-width: calc(100% - 24px); padding: 10px 16px; border-radius: 12px; background: rgba(8,6,12,.78); border: 1px solid rgba(255,90,74,.7); color: #ffe7e3; text-align: center; font: 600 14px/1.35 var(--sans, system-ui, sans-serif); pointer-events: none; animation: fugaIn .25s ease-out; }
.fuga-olhar[hidden] { display: none; }
.fuga-olhar b { display: block; font: 700 11px var(--mono, monospace); letter-spacing: .16em; color: #ff8a7a; margin-bottom: 3px; }
.fuga-olhar .nada { color: #cfc6e0; font-weight: 500; }
.fuga-olhar .dist { font: 800 22px/1.15 var(--mono, monospace); color: #fff; }
@keyframes fugaIn { from { opacity: 0; transform: translate(-50%, -40%); } to { opacity: 1; transform: translate(-50%, -50%); } }
.fuga-fresta { position: absolute; inset: 0; z-index: 1; pointer-events: none; transition: opacity .35s; }
.fuga-fresta[hidden] { display: none; }
.fuga-fresta svg { position: absolute; inset: -3%; width: 106%; height: 106%; }
.fuga-fresta .fuga-fresta-rot { position: absolute; left: 50%; top: calc(max(10px, env(safe-area-inset-top)) + 150px); transform: translateX(-50%); padding: 4px 12px; border-radius: 999px; background: rgba(0,0,0,.55); color: #d9d0e8; font: 600 11.5px var(--mono, monospace); white-space: nowrap; max-width: calc(100% - 24px); overflow: hidden; text-overflow: ellipsis; }
#s3d.fuga-dentro #s3dFresta { display: none !important; }
.fuga-legenda { position: absolute; left: 50%; bottom: calc(max(12px, env(safe-area-inset-bottom)) + 190px); transform: translateX(-50%); z-index: 4; padding: 4px 12px; border-radius: 8px; background: rgba(0,0,0,.6); color: #f2ecff; font: 600 13px var(--mono, monospace); pointer-events: none; opacity: 0; transition: opacity .3s; max-width: calc(100% - 24px); text-align: center; }
.fuga-legenda.on { opacity: 1; }
.fuga-barr2d { position: absolute; z-index: 6; transform: translate(-50%, -50%) translateZ(12px); width: 64px; height: 64px; border-radius: 14px; display: grid; place-items: center; font-size: 38px; line-height: 1; background: repeating-linear-gradient(45deg, #3a2508 0 10px, #5a3a0a 10px 20px); border: 4px solid #ffb020; box-shadow: 0 0 18px rgba(255,176,32,.7); pointer-events: none; }
.fuga-sinal2d { position: absolute; z-index: 7; transform: translate(-50%, -100%) translateZ(30px); pointer-events: none; display: grid; justify-items: center; animation: fugaSinal2d 1s ease-in-out infinite alternate; }
.fuga-sinal2d span { padding: 6px 18px; border-radius: 999px; background: rgba(10,8,16,.92); border: 4px solid var(--c, #ffd23f); color: #fff; font: 700 24px var(--mono, monospace); white-space: nowrap; }
.fuga-sinal2d i { width: 30px; height: 30px; margin-top: 6px; border-radius: 50%; background: var(--c, #ffd23f); box-shadow: 0 0 0 12px color-mix(in srgb, var(--c, #ffd23f) 35%, transparent); }
@keyframes fugaSinal2d { from { transform: translate(-50%, -100%) translateZ(30px); } to { transform: translate(-50%, calc(-100% - 12px)) translateZ(4px); } }
.fuga-cfg h3 { margin: 12px 0 4px; font: 700 12px var(--mono, monospace); letter-spacing: .1em; color: var(--texto-dim, #b9b0cc); text-transform: uppercase; }
.fuga-cfg .fuga-grupo { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 8px; }
.fuga-cfg .fuga-grupo label.chave { flex: 1 1 auto; margin: 0 !important; }
.fuga-cfg .fuga-grupo-t { font-size: 12.5px; color: var(--texto-dim, #b9b0cc); margin: 8px 0 0; }
@media (max-width: 420px) { .fuga-barra { gap: 4px; } .fuga-bt { min-width: 0; width: 49px; padding: 4px 2px 3px; font-size: 9.5px; } .fuga-rota { font-size: 11.5px; } }
.fuga-rota.sobre-cartas { right: auto; left: max(10px, env(safe-area-inset-left)); max-width: calc(100% - 84px); }
`;
function estilo() { if ($('#fugaEstilo')) return; const s = document.createElement('style'); s.id = 'fugaEstilo'; s.textContent = CSS; document.head.appendChild(s); }

/* =========================================================
   SONS (gerados na hora, posicionais, como os ecos do momento.js)
   ========================================================= */
function tocarSom(t, a, x, y) {
  const M = MOM(); if (!M || !M.Aud) return;
  const Aud = M.Aud; Aud.preparar(); if (!Aud.ok()) return;
  const mu = A().geo.M_POR_UNID, ap = api3();
  // quem escuta: no 3D, a câmera; no mapa, o próprio token (ou o selecionado, para Mestre e auxiliar)
  let ox, oz, X, Z, dist;
  if (ap && ap.a === a) {
    const c = ap.camera, f = new ap.T.Vector3(); c.getWorldDirection(f);
    Aud.ouvinte(c.position.x, c.position.y, c.position.z, f.x, f.z); [X, Z] = ap.planta3D(x, y);
    const q = ap.plantaDe3D(c.position.x, c.position.z); dist = Math.hypot(q.x - x, q.y - y) * mu; ox = c.position.x; oz = c.position.z;
  } else {
    const tk = tokens()[euJog() || A().meu || I().selecionado]; if (!tk || tk.a !== a) return;
    dist = Math.hypot(tk.x - x, tk.y - y) * mu; Aud.ouvinte(tk.x * mu, 1.6, tk.y * mu, 0, -1); X = x * mu; Z = y * mu; ox = tk.x * mu; oz = tk.y * mu;
  }
  if (dist > 24) return;
  const T0 = Aud.ctx.currentTime, p = Aud.panner(X, 1.4, Z, 1.6);
  if (t === 'grito') { Aud.tom(T0, p, { tipo: 'sawtooth', f: 420, f2: 300, v: .12, ataque: .05, dur: .9 }); Aud.ruido(T0, p, { bp: 1100, q: 3, v: .3, ataque: .06, dur: .85 }); Aud.ruido(T0 + .05, p, { bp: 2600, q: 4, v: .12, ataque: .05, dur: .6 }); }
  else if (t === 'assobio') { Aud.tom(T0, p, { f: 1700, f2: 2300, v: .1, ataque: .05, dur: .35 }); Aud.tom(T0 + .42, p, { f: 2300, f2: 1500, v: .1, ataque: .04, dur: .5 }); }
  else if (t === 'objeto') { Aud.tom(T0, p, { f: 140, f2: 55, v: .5, ataque: .004, dur: .25 }); [0, .14, .31].forEach((d, i) => Aud.ruido(T0 + d, p, { bp: 2400 - i * 500, q: 2.5, v: .35 - i * .08, ataque: .003, dur: .12 })); }
  else if (t === 'barr') { Aud.ruido(T0, p, { bp: 420, f2: 260, q: .8, v: .45, ataque: .1, dur: 1.1 }); Aud.tom(T0 + 1.05, p, { f: 90, f2: 40, v: .6, ataque: .005, dur: .4 }); Aud.ruido(T0 + 1.05, p, { tipo: 'lowpass', bp: 300, v: .5, ataque: .005, dur: .35 }); }
  else if (t === 'arromba') { Aud.tom(T0, p, { f: 70, f2: 32, v: .8, ataque: .004, dur: .7 }); Aud.ruido(T0, p, { tipo: 'lowpass', bp: 700, v: .7, ataque: .004, dur: .6 }); [.12, .26, .4].forEach(d => Aud.ruido(T0 + d, p, { bp: 1800, q: 2, v: .25, ataque: .003, dur: .14 })); }
  else if (t === 'sinal') Aud.tom(T0, p, { f: 880, f2: 990, v: .05, ataque: .02, dur: .25 });
  setTimeout(() => { try { p.disconnect(); } catch (e) {} }, 4000);
  // legenda de som (a mesma opção dos sons das criaturas)
  if (lsG('acf-sons-legendas', false) && RUIDO[t]) {
    let dirTxt = '';
    if (ap && ap.a === a) { const f = new ap.T.Vector3(); ap.camera.getWorldDirection(f); const ang = Math.atan2(X - ox, Z - oz) - Math.atan2(f.x, f.z); const c = Math.cos(ang), s = Math.sin(ang); dirTxt = dist < 2.5 ? 'muito perto' : Math.abs(c) > Math.abs(s) ? (c > 0 ? 'à frente' : 'atrás') : (s > 0 ? 'à esquerda' : 'à direita'); }
    else { const dx = X - ox, dz = Z - oz; dirTxt = dist < 2.5 ? 'muito perto' : Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'a leste' : 'a oeste') : (dz > 0 ? 'ao sul' : 'ao norte'); }
    legenda(`[${RUIDO[t].txt} ${dirTxt}]`);
  }
}
function legenda(txt) {
  let l = $('#fugaLegenda');
  if (!l) { l = document.createElement('div'); l.id = 'fugaLegenda'; l.className = 'fuga-legenda'; l.setAttribute('aria-live', 'polite'); }
  const pai = aberto3D() ? $('#s3d') : document.body; if (l.parentNode !== pai) pai.appendChild(l);
  l.style.position = aberto3D() ? 'absolute' : 'fixed';
  l.textContent = txt; l.classList.remove('on'); void l.offsetWidth; l.classList.add('on');
  clearTimeout(l._t); l._t = setTimeout(() => l.classList.remove('on'), 2600);
}
function avisar(t) { const ap = api3(); if (ap) ap.toast(t); else A().aviso(t); }

/* =========================================================
   A VISTA 3D (extensão do sala3d.js)
   ========================================================= */
const Vista = {
  ap: null,
  iniciar(ap) {
    estilo();
    this.ap = ap; const T = ap.T;
    this.grupo = new T.Group(); this.grupo.name = 'fuga'; ap.cena.add(this.grupo);
    this.desc = []; this.rota = null; this.seguir = null; this.olhar = null; this.dentro = null; this.barr3d = new Map(); this.sinais = new Map(); this.movidos = new Map();
    this.tSinc = 0; this.tPega = 0; this.tHud = 0;
    const g = x => { this.desc.push(x); return x; };
    this.g = g;
    this.mat = {
      ok: g(new T.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: .92, depthTest: false, depthWrite: false, toneMapped: false, side: T.DoubleSide })),
      longe: g(new T.MeshBasicMaterial({ color: '#ff5a4a', transparent: true, opacity: .75, depthTest: false, depthWrite: false, toneMapped: false, side: T.DoubleSide })),
      filho: g(new T.MeshBasicMaterial({ color: '#ff2a1a', transparent: true, opacity: .55, depthTest: false, depthWrite: false, toneMapped: false, side: T.DoubleSide })),
      pega: g(new T.MeshBasicMaterial({ color: '#ff2a1a', transparent: true, opacity: .9, depthTest: false, depthWrite: false, toneMapped: false, side: T.DoubleSide })),
      chega: g(new T.MeshBasicMaterial({ color: '#ff9a2a', transparent: true, opacity: .9, depthTest: false, depthWrite: false, toneMapped: false, side: T.DoubleSide })),
    };
    this.geoAnel = g(new T.RingGeometry(.42, .58, 40));
    this.geoDisco = g(new T.CircleGeometry(.16, 20));
    const d = ap.V.d;
    if (d) {
      ['fugaBarra', 'fugaPop', 'fugaRota', 'fugaOlhar', 'fugaFresta'].forEach(id => { const x = $('#' + id); if (x) x.remove(); });
      const b = document.createElement('div'); b.id = 'fugaBarra'; b.className = 'fuga-barra'; b.hidden = true; b.setAttribute('role', 'toolbar'); b.setAttribute('aria-label', 'Fuga');
      b.addEventListener('click', e => { const x = e.target.closest('[data-fuga]'); if (x) UI.botao(x.dataset.fuga); });
      const pop = document.createElement('div'); pop.id = 'fugaPop'; pop.className = 'fuga-pop'; pop.hidden = true; pop.setAttribute('role', 'dialog');
      pop.addEventListener('click', e => UI.cliquePop(e));
      const r = document.createElement('div'); r.id = 'fugaRota'; r.className = 'fuga-rota'; r.hidden = true;
      r.addEventListener('click', e => { const x = e.target.closest('[data-rota]'); if (!x) return; if (x.dataset.rota === 'ir') Rota.ir(); else Rota.limpar(); });
      const o = document.createElement('div'); o.id = 'fugaOlhar'; o.className = 'fuga-olhar'; o.hidden = true; o.setAttribute('aria-live', 'polite');
      const fr = document.createElement('div'); fr.id = 'fugaFresta'; fr.className = 'fuga-fresta'; fr.hidden = true; fr.setAttribute('aria-hidden', 'true');
      const palco = $('.s3d-palco', d);
      if (palco && palco.parentNode === d) d.insertBefore(fr, palco.nextSibling); else d.appendChild(fr);
      d.append(b, pop, r, o);
      document.addEventListener('pointerdown', UI.fora, true);
    }
  },
  fechar() {
    const ap = this.ap; if (!ap) return;
    Rota.limpar(true); Dentro.sair(true);
    this.barr3d.forEach((b, k) => this.tirarBarr3d(k));
    this.sinais.forEach(s => { try { this.grupo.remove(s.g); s.desc.forEach(x => x.dispose()); } catch (e) {} });
    try { ap.cena.remove(this.grupo); } catch (e) {}
    this.desc.forEach(x => { try { x.dispose(); } catch (e) {} });
    ['fugaBarra', 'fugaPop', 'fugaRota', 'fugaOlhar', 'fugaFresta'].forEach(id => { const x = $('#' + id); if (x) x.remove(); });
    document.removeEventListener('pointerdown', UI.fora, true);
    if (ap.V && ap.V.d) ap.V.d.classList.remove('fuga-dentro');
    this.ap = null; this.desc = []; this.barr3d.clear(); this.sinais.clear(); this.movidos.clear();
  },
  quadro(dt, t) {
    const ap = this.ap; if (!ap || !ap.V) return;
    const tw = performance.now() / 1000, dw = Math.min(.1, Math.max(0, tw - (this.tw || tw))); this.tw = tw;
    Rota.quadro(dw, t); Olhar.quadro(dw); Dentro.quadro(dw, t);
    this.sinaisQuadro(dw, t);
    this.tSinc -= dw; if (this.tSinc <= 0) { this.tSinc = .3; this.sincBarr(); }
    this.animBarr(dw);
    this.tHud -= dw; if (this.tHud <= 0) { this.tHud = .25; UI.barra(); }
  },
  // "E" perto de uma barricada: o Filho arromba, a cobaia desfaz
  perto(x, z) {
    const ap = this.ap; if (!ap || !ap.V) return null;
    const id = ap.V.ctrl, tk = id && tokens()[id]; if (!tk || tk.a !== ap.a) return null;
    let melhor = null, bd = 2.6;
    barricadas().forEach(([k, v]) => {
      if (v.a !== ap.a) return; const zr = zonaBarr(v); if (!zr) return;
      const [cx, cz] = ap.planta3D(zr.x + zr.w / 2, zr.y + zr.h / 2), d = Math.hypot(cx - x, cz - z);
      if (d < bd) { bd = d; melhor = [k, v]; }
    });
    if (!melhor) return null;
    const [k, v] = melhor, filho = tipoDe(tk) === 'filho';
    if (filho && !(souMestre() || souAux())) return null;
    return { tipo: 'ext', d: Math.max(0, bd - 1.4), txt: filho ? `💥 Arrombar a barricada (Força DT ${DT_FORCA})` : '✋ Desfazer a barricada', usar: () => (filho ? Barr.arrombar(k, id) : Barr.desfazer(k, id)) };
  },
  opcoes(aba, h) {
    if (aba !== 'controles' || h.quem !== 'jog') return '';
    const on = (this.ap ? this.ap.CFG : {}).fugaConfirma !== false;
    return `<section><h4>Fuga</h4><label class="chave"><input type="checkbox" data-cfgb="fugaConfirma" ${on ? 'checked' : ''}><span>Perseguição: tocar no chão mostra a rota e os metros; um segundo toque no mesmo ponto anda</span></label>
      <p class="mini">Teclas: G sinaliza, V faz barulho, X barricada (se não estiverem em outra ação).</p></section>`;
  },
  menu(add, q) {
    if (!podeAgir()) return;
    if (opc('sinal')) add('📍', 'Sinalizar', () => UI.abrir('sinal'), 'aqui, por ali, perigo');
    if (opc('barulho')) add('📣', 'Fazer barulho', () => UI.abrir('barulho'), 'gritar, assobiar, jogar');
    if (opc('barr')) add('🪑', 'Barricada', () => UI.abrir('barr'), `Força DT ${DT_FORCA}`);
  },
  // gancho do sala3d.js: toque/clique no chão (devolve true quando a rota cuidou)
  chao(x, z) { return Rota.tocar(x, z); },
  // gancho do sala3d.js: teclas (devolve true quando usou)
  tecla(k, id, e) {
    if (!this.ap) return false;
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const pop = $('#fugaPop');
    if (k === 'escape' && pop && !pop.hidden) { UI.fecharPop(); return true; }
    if (k === 'escape' && this.ap.V && this.ap.V.d && $('#fugaRota') && !$('#fugaRota').hidden && !document.pointerLockElement) { Rota.limpar(); return true; }
    if (id === 'olharTras' && Olhar.vale()) { if (!e.repeat) Olhar.fazer(); return true; }
    if (id) return false;
    if (!podeAgir()) return false;
    if (k === 'g' && opc('sinal')) { if (!e.repeat) Sinal.enviar('aqui'); return true; }
    if (k === 'v' && opc('barulho')) { if (!e.repeat) UI.abrir('barulho'); return true; }
    if (k === 'x' && opc('barr')) { if (!e.repeat) UI.abrir('barr'); return true; }
    return false;
  },

  /* ---------- barricadas no 3D ---------- */
  sincBarr() {
    const ap = this.ap, quer = new Map();
    barricadas().forEach(([k, v]) => { if (v.a === ap.a) quer.set(k, v); });
    this.barr3d.forEach((b, k) => { if (!quer.has(k) || quer.get(k).ts !== b.ts) this.tirarBarr3d(k); });
    quer.forEach((v, k) => {
      let b = this.barr3d.get(k);
      if (v.t === 'porta') { if (!b) this.porPorta3d(k, v); return; }
      const p = int(v.cn) - 25 * (ap.a - 1), c = ap.mundo.carregadas.get(p);
      if (b && b.c !== c) { this.tirarBarr3d(k); b = null; }   // a sala recarregou: o móvel voltou ao lugar; põe de novo
      if (!b && c && !c.extra) this.porMovel3d(k, v, c, p);
    });
  },
  porPorta3d(k, v) {
    const ap = this.ap, T = ap.T, P = (ap.mundo.portas || []).find(x => x && x.c.ci === v.ci); if (!P) return;
    // o corredor tem uma porta em cada ponta (sala3d.js, P.grps): a barricada aparece nas duas, como a porta
    const F = ap.fabrica(), g0 = new T.Group(), g = new T.Group(), W = 2.4, H = 2.7, pontas = P.grps || [P.grp];
    g0.position.copy(pontas[0].position); g0.rotation.y = pontas[0].rotation.y;
    const aco = F.m('#5a5e62', { r: .6, me: .45 }), mad = F.m('#6b4a2c', { r: .85 }), escuro = F.m('#1a1a1a', { me: .5 });
    [-1, 1].forEach(s => F.bx(g, .09, H - .16, W / 2 - .06, aco, 0, 0, s * (W / 4 - .01)));
    F.bx(g, .1, H - .16, .02, escuro, 0, 0, 0);
    // tábuas pregadas em X dos dois lados e uma cadeira travando a maçaneta
    [-1, 1].forEach(lx => { [[.55, .5], [1.45, -.45], [2.1, .38]].forEach(([y, r]) => { const tb = F.bx(g, .05, .18, W + .3, mad, lx * .1, y, 0); tb.rotation.x = r; }); });
    const cad = new T.Group(); cad.position.set(.45, 0, .2); cad.rotation.z = .45; g.add(cad);
    F.bx(cad, .42, .05, .42, mad, 0, .45, 0); [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]].forEach(([a, b]) => F.bx(cad, .04, .45, .04, mad, a, 0, b)); F.bx(cad, .04, .5, .42, mad, -.19, .5, 0);
    // as peças montadas em g passam para a ponta 1; a ponta 2 é a mesma cópia (geometria compartilhada), girada
    [...g.children].forEach(o => g0.add(o)); g.add(g0);
    pontas.slice(1).forEach(pg => { const c = g0.clone(); c.position.copy(pg.position); c.rotation.y = pg.rotation.y; g.add(c); });
    g.traverse(o => { o.raycast = () => {}; });
    this.grupo.add(g);
    const fresca = agora() - num(v.ts) < 3500;
    if (fresca) { g.scale.set(1, .02, 1); }
    this.barr3d.set(k, { tipo: 'porta', g, ts: v.ts, anim: fresca ? 0 : 1 });
  },
  porMovel3d(k, v, c, p) {
    const ap = this.ap, T = ap.T, o = c.g.children.find(x => x.userData && x.userData.i === int(v.i));
    const s = ap.mundo.S[p], vao = vaos3D(ap, p).find(x => x.ci === v.ci);
    if (!o || !s || !vao) { this.barr3d.set(k, { tipo: 'movel', c, ts: v.ts, vazio: true }); return; }
    const orig = { pos: o.position.clone(), q: o.quaternion.clone(), vis: o.visible };
    // tira a colisão do lugar antigo (as mesmas caixas que o sala3d.js calculou)
    c.g.updateMatrixWorld(true);
    const R = .22, velhas = [];
    (window.ACF3D.caixasColisao ? window.ACF3D.caixasColisao(T, o) : []).forEach(b => {
      if (b.max.y < .25 || b.min.y > 1.8) return;
      const r = [b.min.x - R, b.max.x + R, b.min.z - R, b.max.z + R];
      const i = c.obst.findIndex(q => Math.abs(q[0] - r[0]) < 1e-3 && Math.abs(q[1] - r[1]) < 1e-3 && Math.abs(q[2] - r[2]) < 1e-3 && Math.abs(q[3] - r[3]) < 1e-3);
      if (i >= 0) velhas.push(c.obst.splice(i, 1)[0]);
    });
    // tamanho do móvel no próprio eixo
    const q0 = o.quaternion.clone(); o.quaternion.identity(); o.updateMatrixWorld(true);
    const bb = new T.Box3().setFromObject(o), tam = bb.getSize(new T.Vector3()); o.quaternion.copy(q0); o.updateMatrixWorld(true);
    const ladoX = vao.lado === 'n' || vao.lado === 's';
    const longoX = tam.x >= tam.z, rotY = (ladoX ? (longoX ? 0 : Math.PI / 2) : (longoX ? Math.PI / 2 : 0));
    const alto = tam.y > 1.3;
    // tomba sobre o eixo comprido (a estante cai deitada atravessando o vão)
    const eixoLongo = new T.Vector3(ladoX ? 1 : 0, 0, ladoX ? 0 : 1);
    const qY = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), rotY);
    const alvoTomb = alto ? (Math.PI / 2) * (vao.nx + vao.nz > 0 ? -1 : 1) * (ladoX ? 1 : -1) : 0;
    const b = { tipo: 'movel', c, o, orig, velhas, ts: v.ts, vao, s, qY, eixoLongo, alvoTomb, anim: 1, extra: null, alto };
    const fresca = agora() - num(v.ts) < 3500;
    if (fresca) { b.anim = 0; b.pos0 = o.position.clone(); b.q0 = o.quaternion.clone(); }
    this.barr3d.set(k, b);
    this.posMovel(b, fresca ? 0 : 1);
    // colisão nova: o vão inteiro fica fechado (do lado da sala)
    const W = 2.4 / 2 + .35, fundo = 1.1;
    let r;
    if (vao.lado === 'n') r = [vao.x - W, vao.x + W, s.z0, s.z0 + fundo];
    else if (vao.lado === 's') r = [vao.x - W, vao.x + W, s.z1 - fundo, s.z1];
    else if (vao.lado === 'w') r = [s.x0, s.x0 + fundo, vao.z - W, vao.z + W];
    else r = [s.x1 - fundo, s.x1, vao.z - W, vao.z + W];
    c.obst.push(r); b.extra = r;
    this.complemento(b);
  },
  // o resto do vão: o que estava à mão (caixas e uma cadeira tombada), para a barricada fechar a porta inteira
  complemento(b) {
    const ap = this.ap, T = ap.T, F = ap.fabrica(), g = new T.Group(), vao = b.vao, s = b.s;
    const mad = F.m('#6e5338', { r: .9 }), papel = F.m('#8a7a5e', { r: .95 }), ferro = F.m('#4a4d52', { r: .6, me: .4 });
    const ladoX = vao.lado === 'n' || vao.lado === 's', fundo = .55;
    // nos dois cantos do vão, uma pilha; ao meio, uma cadeira caída por cima
    [-1, 1].forEach((k, j) => {
      const u = k * 1.05, w1 = .55 + j * .1, h1 = .5 + j * .12;
      const cx = ladoX ? vao.x + u : vao.x + vao.nx * fundo, cz = ladoX ? vao.z + vao.nz * fundo : vao.z + u;
      const b1 = F.bx(g, w1, h1, w1, j ? papel : mad, cx - s.cx, 0, cz - s.cz); b1.rotation.y = .2 + j * .5;
      const b2 = F.bx(g, w1 * .8, h1 * .8, w1 * .8, j ? mad : papel, cx - s.cx + .05, h1, cz - s.cz - .04); b2.rotation.y = -.3;
    });
    const cad = new T.Group(); const cx = vao.x + vao.nx * (fundo + .25), cz = vao.z + vao.nz * (fundo + .25);
    cad.position.set(cx - s.cx, .25, cz - s.cz); cad.rotation.set(1.2, ladoX ? 0 : Math.PI / 2, .3);
    F.bx(cad, .42, .05, .42, ferro, 0, .45, 0); [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]].forEach(([a, c]) => F.bx(cad, .03, .45, .03, ferro, a, 0, c)); F.bx(cad, .03, .5, .42, ferro, -.19, .5, 0);
    g.add(cad);
    g.traverse(o => { o.raycast = () => {}; o.castShadow = true; });
    b.c.g.add(g); b.comp = g;
    if (b.anim < 1) g.scale.set(1, .02, 1);
  },
  // k: 0 → no lugar de origem; 1 → atravessado no vão
  posMovel(b, k) {
    const ap = this.ap, T = ap.T, o = b.o, s = b.s, vao = b.vao;
    const e = k < 1 ? (k < .55 ? (k / .55) * (k / .55) * .55 : .55 + (1 - Math.pow(1 - (k - .55) / .45, 2)) * .45) : 1;
    const qT = new T.Quaternion().setFromAxisAngle(b.eixoLongo, b.alvoTomb * Math.min(1, Math.max(0, (e - .45) / .55)));
    const qF = qT.multiply(b.qY.clone());
    if (k < 1 && b.q0) o.quaternion.copy(b.q0).slerp(qF, Math.min(1, e * 1.4)); else o.quaternion.copy(qF);
    // posição: encostado no vão, do lado de dentro, sem atravessar o chão
    const loc = new T.Vector3(vao.x - s.cx + vao.nx * 1.0, 0, vao.z - s.cz + vao.nz * 1.0);
    o.position.copy(loc); o.updateMatrixWorld(true);
    const bb = new T.Box3().setFromObject(o);
    const off = new T.Vector3();
    off.y = -bb.min.y;
    if (vao.lado === 'n') off.z = (s.z0 + .18) - bb.min.z; else if (vao.lado === 's') off.z = (s.z1 - .18) - bb.max.z;
    else if (vao.lado === 'w') off.x = (s.x0 + .18) - bb.min.x; else off.x = (s.x1 - .18) - bb.max.x;
    if (vao.lado === 'n' || vao.lado === 's') off.x = vao.x - (bb.min.x + bb.max.x) / 2; else off.z = vao.z - (bb.min.z + bb.max.z) / 2;
    const fim = o.position.clone().add(off);
    if (k < 1 && b.pos0) o.position.copy(b.pos0).lerp(fim, Math.min(1, e * 1.25)); else o.position.copy(fim);
  },
  animBarr(dw) {
    this.barr3d.forEach(b => {
      if (b.anim >= 1 || b.vazio) return;
      b.anim = Math.min(1, b.anim + dw / (b.tipo === 'porta' ? .45 : 1.1));
      if (b.tipo === 'porta') b.g.scale.set(1, Math.max(.02, b.anim), 1);
      else { this.posMovel(b, b.anim); if (b.comp) b.comp.scale.set(1, Math.max(.02, (b.anim - .5) * 2), 1); }
    });
  },
  tirarBarr3d(k) {
    const b = this.barr3d.get(k); if (!b) return;
    this.barr3d.delete(k);
    if (b.tipo === 'porta') { try { this.grupo.remove(b.g); b.g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } catch (e) {} return; }
    if (b.vazio) return;
    const live = this.ap && this.ap.mundo.carregadas.get(b.s.p) === b.c;
    if (b.comp) { try { b.c.g.remove(b.comp); b.comp.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } catch (e) {} }
    if (b.o && b.orig) { b.o.position.copy(b.orig.pos); b.o.quaternion.copy(b.orig.q); b.o.visible = b.orig.vis; }
    if (live) { if (b.extra) { const i = b.c.obst.indexOf(b.extra); if (i >= 0) b.c.obst.splice(i, 1); } (b.velhas || []).forEach(r => b.c.obst.push(r)); }
  },

  /* ---------- sinais no 3D: feixe, anel e o texto, por cima das paredes ---------- */
  sinaisQuadro(dw, t) {
    const ap = this.ap, T = ap.T, vivos = new Set();
    sinaisVivos().forEach(([k, v]) => {
      if (v.a !== ap.a) return; vivos.add(k);
      let s = this.sinais.get(k);
      if (!s) s = this.criarSinal(k, v);
      const idade = (agora() - num(v.ts)) / 1000, fim = SINAL_S - idade;
      const al = Math.min(1, idade / .25) * Math.min(1, fim / 1.2);
      s.anel.scale.setScalar(1 + ((t * 1.4) % 1) * 1.6); s.anel.material.opacity = .85 * (1 - ((t * 1.4) % 1)) * al;
      s.feixe.material.opacity = .32 * al; s.spr.material.opacity = al;
      const dc = ap.camera.position.distanceTo(s.g.position), h = clamp(dc * .065, .26, 3);
      s.spr.scale.set(h * s.asp, h, 1);
      if (s.seta) s.seta.material.opacity = .9 * al;
    });
    this.sinais.forEach((s, k) => { if (!vivos.has(k)) { this.grupo.remove(s.g); s.desc.forEach(x => { try { x.dispose(); } catch (e) {} }); this.sinais.delete(k); } });
  },
  criarSinal(k, v) {
    const ap = this.ap, T = ap.T, S = SINAL[v.t], g = new T.Group(), desc = [];
    const [x, z] = ap.planta3D(v.x, v.y); g.position.set(x, 0, z);
    const mat = (o) => { const m = new T.MeshBasicMaterial(Object.assign({ color: S.cor, transparent: true, depthWrite: false, toneMapped: false, side: T.DoubleSide }, o)); desc.push(m); return m; };
    const fg = new T.CylinderGeometry(.09, .16, 3.6, 12, 1, true); desc.push(fg);
    const feixe = new T.Mesh(fg, mat({ opacity: .3, blending: T.AdditiveBlending })); feixe.position.y = 1.8; g.add(feixe);
    const ag = new T.RingGeometry(.35, .5, 36); desc.push(ag);
    const anel = new T.Mesh(ag, mat({ opacity: .8, depthTest: false })); anel.rotation.x = -Math.PI / 2; anel.position.y = .04; anel.renderOrder = 9; g.add(anel);
    let seta = null;
    if (v.t === 'foi' && typeof v.d === 'number') {
      const sh = new T.Shape(); sh.moveTo(0, 1.25); sh.lineTo(.42, .55); sh.lineTo(.15, .55); sh.lineTo(.15, -.4); sh.lineTo(-.15, -.4); sh.lineTo(-.15, .55); sh.lineTo(-.42, .55); sh.closePath();
      const sg = new T.ShapeGeometry(sh); desc.push(sg);
      seta = new T.Mesh(sg, mat({ opacity: .9, depthTest: false })); seta.position.y = .05; seta.renderOrder = 9;
      // d: graus na planta (0 = leste, 90 = sul); no 3D, x = leste e z = sul. A ponta da forma (+y) deitada vira -z;
      // girando θ em z, ela aponta para (-sen θ, 0, -cos θ): θ = atan2(-cos r, -sen r) aponta para (cos r, 0, sen r)
      const r = num(v.d) * Math.PI / 180; seta.rotation.set(-Math.PI / 2, 0, Math.atan2(-Math.cos(r), -Math.sin(r))); g.add(seta);
    }
    const quem = (SERd(v.q) || {}).nome || '';
    const [cv, cx] = window.ACF3D.tela(512, 128);
    cx.clearRect(0, 0, 512, 128);
    cx.fillStyle = 'rgba(10,8,16,.86)'; cx.strokeStyle = S.cor; cx.lineWidth = 6;
    const rr = (x0, y0, w, h, r) => { cx.beginPath(); cx.moveTo(x0 + r, y0); cx.arcTo(x0 + w, y0, x0 + w, y0 + h, r); cx.arcTo(x0 + w, y0 + h, x0, y0 + h, r); cx.arcTo(x0, y0 + h, x0, y0, r); cx.arcTo(x0, y0, x0 + w, y0, r); cx.closePath(); };
    rr(6, 6, 500, 116, 50); cx.fill(); cx.stroke();
    cx.fillStyle = '#fff'; cx.font = '700 46px system-ui, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(`${S.i} ${S.n}`, 256, quem ? 50 : 64);
    if (quem) { cx.font = '600 28px system-ui, sans-serif'; cx.fillStyle = '#d6cde8'; cx.fillText(quem, 256, 96); }
    const tex = new T.CanvasTexture(cv); desc.push(tex);
    const sm = new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }); desc.push(sm);
    const spr = new T.Sprite(sm); spr.position.set(0, 2.6, 0); spr.renderOrder = 10; g.add(spr); spr.center.set(.5, 0);
    g.traverse(o => { o.raycast = () => {}; });
    this.grupo.add(g);
    const s = { g, anel, feixe, spr, seta, desc, asp: 4 };
    this.sinais.set(k, s);
    return s;
  },
};

// vãos das portas de uma sala no 3D (ponto no meio do vão e a normal para dentro da sala)
function vaos3D(ap, p) {
  const s = ap.mundo.S[p]; if (!s) return [];
  return Object.entries(s.vaos || {}).filter(([, v]) => v.ci >= 0).map(([lado, v]) => {
    if (lado === 'n') return { lado, ci: v.ci, x: v.centro, z: s.z0, nx: 0, nz: 1 };
    if (lado === 's') return { lado, ci: v.ci, x: v.centro, z: s.z1, nx: 0, nz: -1 };
    if (lado === 'w') return { lado, ci: v.ci, x: s.x0, z: v.centro, nx: 1, nz: 0 };
    return { lado, ci: v.ci, x: s.x1, z: v.centro, nx: -1, nz: 0 };
  });
}
// direção de um ponto em relação à câmera ("à sua frente", "à direita"…)
function rumoCam(ap, x, z) {
  const f = new ap.T.Vector3(); ap.camera.getWorldDirection(f);
  const c = ap.camera.position, ang = Math.atan2(x - c.x, z - c.z) - Math.atan2(f.x, f.z), co = Math.cos(ang), si = Math.sin(ang);
  return Math.abs(co) > Math.abs(si) * .8 ? (co > 0 ? 'à sua frente' : 'atrás de você') : (si > 0 ? 'à sua esquerda' : 'à sua direita');
}

/* quem age na fuga: o jogador com a própria cobaia (ou o Mestre controlando uma cobaia ou NPC) */
function podeAgir() {
  const ap = api3(); if (!ap || !ap.V || !ap.V.ctrl) return false;
  const tk = tokens()[ap.V.ctrl]; if (!tk || tk.a !== ap.a) return false;
  const tp = tipoDe(tk);
  if (euJog()) return ap.V.ctrl === euJog();
  return souMestre() && (tp === 'cobaia' || tp === 'npc');
}
const meuId = () => { const ap = api3(); return ap && ap.V ? ap.V.ctrl : null; };
// na perseguição: participa e é a vez dele?
function situacao(id) {
  const p = persg(), part = !!(p.on && ordemP().some(o => o.id === id));
  return { on: !!p.on, part, vez: part && vezId() === id };
}

/* =========================================================
   1. ROTA COM CUSTO (vez do jogador na perseguição)
   ========================================================= */
const Rota = {
  vale() {
    const ap = api3(), id = meuId(); if (!ap || !id || !podeAgir() || !opc('rota')) return false;
    const s = situacao(id); return s.vez;
  },
  tocar(x, z) {
    if (!this.vale()) return false;
    const ap = api3(), V = ap.V, id = V.ctrl, tk = tokens()[id];
    if (tk.esq || V.escondido) return false;
    const pv = Vista.rota;
    if (pv && Math.hypot(pv.alvo[0] - x, pv.alvo[1] - z) < 1.1 && ap.CFG.fugaConfirma !== false) { this.ir(); return true; }
    const r = this.montar(x, z);
    if (!r) { ap.toast('Sem caminho até lá (parede, porta fechada ou barricada).'); return true; }
    if (ap.CFG.fugaConfirma === false) this.ir();
    else ap.toast(r.cabe ? 'Rota pronta: toque de novo no ponto (ou ▶ Ir) para andar.' : 'Não dá para chegar lá nesta vez: o trecho vermelho fica para a próxima. Toque de novo para ir até onde dá.');
    return true;
  },
  montar(x, z) {
    const ap = api3(), V = ap.V, id = V.ctrl, a = ap.a;
    const livre = (X, Z) => ap.mundo.livre3D(X, Z) && plantaLivre(id, a, ...(q => [q.x, q.y])(ap.plantaDe3D(X, Z)));
    const t0 = performance.now();
    const pts = caminho(ap.est.px, ap.est.pz, x, z, livre, { fator: (X, Z) => (naSala3D(ap, X, Z) ? .3536 : 1), alvoExato: true });
    if (!pts || pts.length < 2) return null;
    const { tot, seg } = custoCaminho(ap, pts), tk = tokens()[id], lim = A().limiteDe(id) || 9, rest = Math.max(0, lim - num(tk.m));
    const parada = tot > rest ? pontoEm(ap, pts, seg, rest) : null;
    this.limpar(true);
    const R = { alvo: [x, z], pts, seg, tot, rest, lim, parada, cabe: tot <= rest + .01, ms: performance.now() - t0, objs: [], fim: parada ? parada.p : pts[pts.length - 1] };
    Vista.rota = R;
    this.desenhar(R);
    Pega.calcular(R);
    this.chip(R);
    return R;
  },
  desenhar(R) {
    const ap = api3(), T = ap.T, G = Vista.grupo;
    const fita = (pts, mat, larg, tracejado) => {
      const pos = [], idx = []; let n = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < .01) continue;
        const ux = dx / L, uz = dz / L, px = -uz * larg / 2, pz = ux * larg / 2;
        const passo = tracejado ? .5 : L, vazio = tracejado ? .3 : 0;
        for (let s = 0; s < L; s += passo + vazio) {
          const e = Math.min(L, s + passo), x0 = a[0] + ux * s, z0 = a[1] + uz * s, x1 = a[0] + ux * e, z1 = a[1] + uz * e;
          pos.push(x0 + px, .05, z0 + pz, x0 - px, .05, z0 - pz, x1 + px, .05, z1 + pz, x1 - px, .05, z1 - pz);
          idx.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); n += 4;
        }
      }
      if (!n) return null;
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const m = new T.Mesh(g, mat); m.renderOrder = 6; m.raycast = () => {}; G.add(m); R.objs.push({ o: m, g }); return m;
    };
    const ate = R.parada ? R.pts.slice(0, R.parada.i + 1).concat([R.parada.p]) : R.pts;
    fita(ate, Vista.mat.ok, .2, false);
    if (R.parada) fita([R.parada.p].concat(R.pts.slice(R.parada.i + 1)), Vista.mat.longe, .16, true);
    // pontos a cada metro de regra (para ler o custo no chão) e o fim
    const marcas = [];
    for (let m = 1; m < Math.min(R.tot, R.rest); m += 1) marcas.push(pontoEm(ap, R.pts, R.seg, m).p);
    marcas.forEach(p => { const d = new T.Mesh(Vista.geoDisco, Vista.mat.ok); d.rotation.x = -Math.PI / 2; d.position.set(p[0], .055, p[1]); d.scale.setScalar(.55); d.renderOrder = 7; d.raycast = () => {}; G.add(d); R.objs.push({ o: d }); });
    const fimP = R.fim, anel = new T.Mesh(Vista.geoAnel, R.parada ? Vista.mat.longe : Vista.mat.ok); anel.rotation.x = -Math.PI / 2; anel.position.set(fimP[0], .06, fimP[1]); anel.renderOrder = 7; anel.raycast = () => {}; G.add(anel); R.objs.push({ o: anel });
    R.rotulo = this.rotulo(R, fimP, R.parada ? `para aqui · ${fmtM(R.rest)} m` : `${fmtM(R.tot)} m · sobra ${fmtM(R.rest - R.tot)}`, R.parada ? '#ff8a7a' : '#ffd23f');
  },
  rotulo(R, p, txt, cor, y = 1.1) {
    const ap = api3(), T = ap.T;
    const [c0, x0c] = window.ACF3D.tela(8, 8); x0c.font = '800 50px ui-monospace, monospace';
    const w = Math.ceil(x0c.measureText(txt).width + 64), W = Math.max(256, w);
    const [cv, cx] = window.ACF3D.tela(W, 112); cx.clearRect(0, 0, W, 112);
    cx.font = '800 50px ui-monospace, monospace';
    cx.fillStyle = 'rgba(10,8,16,.88)'; cx.strokeStyle = cor; cx.lineWidth = 6;
    const xa = 4, xb = W - 4; cx.beginPath(); cx.moveTo(xa + 46, 8); cx.arcTo(xb, 8, xb, 104, 46); cx.arcTo(xb, 104, xa, 104, 46); cx.arcTo(xa, 104, xa, 8, 46); cx.arcTo(xa, 8, xb, 8, 46); cx.closePath(); cx.fill(); cx.stroke();
    cx.fillStyle = cor; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(txt, W / 2, 58);
    const tex = new T.CanvasTexture(cv), mat = new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const s = new T.Sprite(mat); s.position.set(p[0], y, p[1]); s.center.set(.5, 0); s.renderOrder = 11; s.raycast = () => {};
    Vista.grupo.add(s); R.objs.push({ o: s, tex, mat, spr: true, asp: W / 112 });
    return s;
  },
  chip(R) {
    const c = $('#fugaRota'); if (!c) return;
    const conf = api3() && api3().CFG.fugaConfirma !== false;
    c.classList.toggle('longe', !R.cabe);
    c.innerHTML = `<span>📏 ${R.cabe ? `${fmtM(R.tot)} m · sobra ${fmtM(R.rest - R.tot)} m` : `${fmtM(R.tot)} m · só ${fmtM(R.rest)} m nesta vez`}${R.pega ? ` · ${R.pega.pega ? '⚠ ele te pega' : 'ele chega perto'}` : ''}</span>${conf ? '<button type="button" data-rota="ir">▶ Ir</button>' : ''}<button type="button" class="x" data-rota="x" aria-label="Apagar a rota">✕</button>`;
    c.hidden = false;
  },
  ir() {
    const R = Vista.rota, ap = api3(); if (!R || !ap) return;
    Vista.seguir = { pts: R.pts.slice(1), i: 0 };
    ap.V.autoAlvo = Vista.seguir.pts[0].slice();
    const c = $('#fugaRota'); if (c) { const b = $('[data-rota="ir"]', c); if (b) b.remove(); }
  },
  limpar(sem) {
    const R = Vista.rota;
    if (R) R.objs.forEach(x => { try { Vista.grupo.remove(x.o); if (x.g) x.g.dispose(); if (x.tex) x.tex.dispose(); if (x.mat) x.mat.dispose(); } catch (e) {} });
    Vista.rota = null; Pega.limpar();
    if (!sem) Vista.seguir = null;
    const c = $('#fugaRota'); if (c) c.hidden = true;
  },
  quadro(dw, t) {
    const ap = Vista.ap, V = ap.V, S = Vista.seguir;
    // segue o caminho: o andar por toque do sala3d.js vai de ponto em ponto
    if (S) {
      const alvo = S.pts[S.i];
      if (!V.autoAlvo) {
        if (alvo && Math.hypot(alvo[0] - ap.est.px, alvo[1] - ap.est.pz) < .35) {
          S.i++;
          if (S.i < S.pts.length) V.autoAlvo = S.pts[S.i].slice();
          else { Vista.seguir = null; setTimeout(() => { if (!Vista.seguir) Rota.limpar(); }, 900); }
        } else { Vista.seguir = null; setTimeout(() => { if (!Vista.seguir && Vista.rota) Rota.limpar(); }, 1200); }
      }
    }
    const R = Vista.rota;
    if (R) {
      if (!this.vale() && !Vista.seguir) { this.limpar(); return; }
      R.objs.concat(Pega.objs).forEach(x => { if (!x.spr) return; const dc = ap.camera.position.distanceTo(x.o.position), h = clamp(dc * .045, .28, 1.6); x.o.scale.set(h * (x.asp || 4.57), h, 1); });
      Vista.mat.ok.opacity = .75 + Math.sin(t * 4) * .17;
      Vista.tPega -= dw;
      if (Vista.tPega <= 0 && !Vista.seguir) { Vista.tPega = 1.5; Pega.calcular(R); }
    }
  },
};

/* "ELE TE PEGA AQUI": até onde cada Filho visível da perseguição chega no próximo turno */
const Pega = {
  objs: [], sig: '',
  limpar() { if (Vista.rota && Vista.rota.rotulo) Vista.rota.rotulo.visible = true; this.objs.forEach(x => { try { Vista.grupo.remove(x.o); if (x.g) x.g.dispose(); if (x.tex) x.tex.dispose(); if (x.mat) x.mat.dispose(); } catch (e) {} }); this.objs = []; this.sig = ''; },
  calcular(R) {
    const ap = api3(); if (!ap || !R || !opc('pega')) { this.limpar(); return; }
    const fs = filhosVisiveis(ap.a).filter(([id]) => ordemP().some(o => o.id === id));
    const sig = fs.map(([id, tk]) => id + tk.x + ',' + tk.y).join('|') + '#' + R.fim.join(',');
    if (sig === this.sig) return; this.limpar(); this.sig = sig;
    R.pega = null;
    let melhor = null;
    fs.slice(0, 3).forEach(([fid, ftk]) => {
      const oz = ordemP().find(o => o.id === fid) || {}, lim = FIL() && FIL().limite ? FIL().limite(fid, num(oz.lim, 9)) : num(oz.lim, 9);
      const [fx, fz] = ap.planta3D(ftk.x, ftk.y);
      const livre = (X, Z) => ap.mundo.area3D(X, Z, .2) && (q => plantaLivre(fid, ap.a, q.x, q.y))(ap.plantaDe3D(X, Z));
      const pts = caminho(fx, fz, R.fim[0], R.fim[1], livre, { passo: .5, fator: (X, Z) => (naSala3D(ap, X, Z) ? .3536 : 1), pad: 6, max: 60000 });
      if (!pts) return;
      const { tot, seg } = custoCaminho(ap, pts);
      const pega = tot <= lim + .01, ponto = pega ? R.fim : pontoEm(ap, pts, seg, lim).p;
      const corte = pega ? pts : pts.slice(0, pontoEm(ap, pts, seg, lim).i + 1).concat([ponto]);
      if (!melhor || (pega && !melhor.pega) || (pega === melhor.pega && tot - lim < melhor.tot - melhor.lim)) melhor = { fid, pega, ponto, corte, tot, lim };
    });
    if (!melhor) return;
    R.pega = melhor;
    const T = ap.T, G = Vista.grupo;
    // o caminho dele (vermelho, tracejado) até onde alcança
    const pos = [], idx = []; let n = 0;
    for (let i = 1; i < melhor.corte.length; i++) {
      const a = melhor.corte[i - 1], b = melhor.corte[i], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < .01) continue;
      const ux = dx / L, uz = dz / L, px = -uz * .07, pz = ux * .07;
      for (let s = 0; s < L; s += .55) { const e = Math.min(L, s + .3), x0 = a[0] + ux * s, z0 = a[1] + uz * s, x1 = a[0] + ux * e, z1 = a[1] + uz * e; pos.push(x0 + px, .045, z0 + pz, x0 - px, .045, z0 - pz, x1 + px, .045, z1 + pz, x1 - px, .045, z1 - pz); idx.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); n += 4; }
    }
    if (n) { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); const m = new T.Mesh(g, Vista.mat.filho); m.renderOrder = 5; m.raycast = () => {}; G.add(m); this.objs.push({ o: m, g }); }
    // a marca: X vermelho onde ele te pega; anel laranja onde ele para
    const mat = melhor.pega ? Vista.mat.pega : Vista.mat.chega;
    const ga = new T.RingGeometry(.55, .78, 40), anel = new T.Mesh(ga, mat); anel.rotation.x = -Math.PI / 2; anel.position.set(melhor.ponto[0], .065, melhor.ponto[1]); anel.renderOrder = 8; anel.raycast = () => {}; G.add(anel); this.objs.push({ o: anel, g: ga });
    if (melhor.pega) [1, -1].forEach(s => { const gx = new T.PlaneGeometry(1.2, .14), x = new T.Mesh(gx, mat); x.rotation.set(-Math.PI / 2, 0, s * Math.PI / 4); x.position.set(melhor.ponto[0], .07, melhor.ponto[1]); x.renderOrder = 8; x.raycast = () => {}; G.add(x); this.objs.push({ o: x, g: gx }); });
    const txt = melhor.pega ? 'ele te pega aqui' : `ele chega até aqui · falta ${fmtM(melhor.tot - melhor.lim)} m`;
    if (melhor.pega && R.rotulo) R.rotulo.visible = false;
    Rota.rotulo(this, melhor.ponto, melhor.pega && R.parada ? `ele te pega aqui · você para em ${fmtM(R.rest)} m` : txt, melhor.pega ? '#ff5a4a' : '#ffae4a', melhor.pega ? 1.75 : 1.1);
    if (Vista.rota) Rota.chip(Vista.rota);
  },
};

/* =========================================================
   2. OLHAR PARA TRÁS (2 s; custo da casa)
   ========================================================= */
const Olhar = {
  dur: 2000,
  vale() { const id = meuId(); return !!id && podeAgir() && situacao(id).part; },
  fazer() {
    const ap = api3(); if (!ap || !ap.V) return;
    if (Vista.olhar && performance.now() < Vista.olhar.ate) return;
    const id = meuId(), tk = tokens()[id]; if (!tk) return;
    const s = situacao(id), custo = opc('olhar');
    if (s.part && custo !== 'nada' && custo !== 'ruido') {
      if (!s.vez) { ap.toast('Olhar para trás gasta deslocamento: só na sua vez.'); return; }
      const motivo = cobrarMetros(id, custo === 'm3' ? 3 : 1.5, 'Olhar para trás'); if (motivo) { ap.toast(motivo); return; }
    }
    if (s.part && custo === 'ruido') publicarRuido('olhar', tk.a, salaP(tk), tk.x, tk.y);
    const modo = ap.est.modo;
    Vista.olhar = { ate: performance.now() + this.dur, t0: performance.now(), modo, yaw0: ap.est.yaw, th0: ap.est.theta };
    this.info(ap, id, tk);
  },
  info(ap, id, tk) {
    const o = $('#fugaOlhar'); if (!o) return;
    const lst = filhosVisiveis(tk.a).map(([fid, f]) => {
      const pf = salaP(f), pe = salaP(tk), salas = pf && pe ? salasEntre(tk.a, pf, pe) : null;
      const m = A().custoMetros({ x: tk.x, y: tk.y }, { x: f.x, y: f.y });
      return { fid, f, salas, m, ve: ap.quemVe(fid) };
    }).sort((x, y) => x.m - y.m).slice(0, 2);
    const linha = x => { const onde = x.ve || x.salas === 0 ? `<span class="dist">${Math.max(1, Math.round(x.m))} m</span>` : x.salas === 1 ? '<span class="dist">na sala ao lado</span>' : x.salas ? `<span class="dist">a ${x.salas} salas</span>` : `<span class="dist">no corredor · ${Math.round(x.m)} m</span>`; return `<div>${esc(nomeTk(x.f))}<br>${onde}</div>`; };
    o.innerHTML = `<b>👁 ATRÁS DE VOCÊ</b>${lst.length ? lst.map(linha).join('') : '<div class="nada">Nada à vista.</div>'}`;
    o.hidden = false;
    Vista.olhar.alvos = lst.filter(x => x.ve).map(x => x.fid);
    this.marcar(ap, Vista.olhar.alvos);
  },
  marcar(ap, ids) {
    const T = ap.T; this.limparMarcas();
    ids.forEach(fid => { const ob = ap.tok.mapa.get(fid); if (!ob) return; const m = new T.Mesh(Vista.geoAnel, Vista.mat.filho); m.rotation.x = -Math.PI / 2; m.position.set(ob.x, .07, ob.z); m.scale.setScalar(2.2); m.renderOrder = 8; m.raycast = () => {}; Vista.grupo.add(m); (this.marcas = this.marcas || []).push(m); });
  },
  limparMarcas() { (this.marcas || []).forEach(m => Vista.grupo.remove(m)); this.marcas = []; },
  quadro(dw) {
    const ap = Vista.ap, O = Vista.olhar; if (!O) return;
    const agoraP = performance.now(), fim = agoraP >= O.ate, est = ap.est;
    if (ap.primeiraP(est.modo)) ap.V.olharTras = !fim;
    else if (est.modo === 'jogo') { const k = Math.min(1, (agoraP - O.t0) / 280), kv = fim ? 0 : k; est.yaw = O.yaw0 + Math.PI * kv; }
    else { const k = Math.min(1, (agoraP - O.t0) / 350); est.theta = O.th0 + Math.PI * (fim ? 0 : k); }
    (this.marcas || []).forEach(m => { m.material.opacity = .4 + Math.sin(agoraP / 90) * .3; });
    if (fim) { Vista.olhar = null; ap.V.olharTras = false; const o = $('#fugaOlhar'); if (o) o.hidden = true; this.limparMarcas(); if (est.modo === 'jogo') est.yaw = O.yaw0; else if (!ap.primeiraP(est.modo)) est.theta = O.th0; }
  },
};

/* =========================================================
   3. BARRICADA
   ========================================================= */
const MOVEL = [
  [/estante|prateleira|cristaleira|gondola|vitrine/, 'a estante', 'Derrubar'], [/armario|guarda/, 'o armário', 'Derrubar'], [/arquivo|fichario|gaveteiro/, 'o arquivo', 'Derrubar'],
  [/rack/, 'o rack', 'Derrubar'], [/geladeira|freezer/, 'a geladeira', 'Derrubar'], [/maca|leito/, 'a maca', 'Empurrar'], [/mesa|carteira|escrivaninha|bancada|aparador/, 'a mesa', 'Empurrar'],
  [/carrinho/, 'o carrinho', 'Empurrar'], [/caixote|caixa_metal|palete|sacos/, 'as caixas', 'Empurrar'], [/beliche|cama/, 'a cama', 'Empurrar'], [/sofa|poltrona/, 'o sofá', 'Empurrar'],
  [/balcao/, 'o balcão', 'Empurrar'], [/banco/, 'o banco', 'Empurrar'], [/biombo|divisoria/, 'o biombo', 'Derrubar'], [/lavadora|tanque_|fogao/, 'a máquina', 'Empurrar'],
];
const NAO_MOVEL = /suspenso|parede|teto|_int$|mural|placa|quadro|tapete|lousa|lampada|luminaria|mesa_controle|console|cabine|camara|trono/;
const Barr = {
  // o que dá para fazer daqui: móveis perto de um vão e portas abertas
  opcoes() {
    const ap = api3(); if (!ap) return [];
    const id = meuId(), tk = tokens()[id]; if (!tk) return [];
    const p = salaP(tk); if (!p) return [{ off: 'No corredor não há o que empurrar: entre numa sala.' }];
    const cn = cnDe(tk.a, p), c = ap.mundo.carregadas.get(p), L = est().barricadas || {}, out = [];
    const px = ap.est.px, pz = ap.est.pz;
    const vaos = vaos3D(ap, p).map(v => ({ ...v, d: Math.hypot(v.x - px, v.z - pz) })).sort((x, y) => x.d - y.d);
    const usadosI = new Set(Object.values(L).filter(v => v && v.t === 'movel' && int(v.cn) === cn).map(v => int(v.i)));
    vaos.forEach(v => {
      const ja = Object.entries(L).find(([, b]) => b && b.a === tk.a && b.ci === v.ci);
      const rumo = `porta ${LADO[v.lado]}, ${rumoCam(ap, v.x, v.z)}`;
      if (ja) { out.push({ ac: 'desfazer', k: ja[0], i: '✋', t: `Desfazer a barricada (${rumo})`, sub: custoTxt(), longe: v.d > 7 }); return; }
      if (v.d > 9) return;
      // móvel: o maior perto do vão e de você
      let best = null;
      if (c && !c.extra) c.g.children.forEach(o => {
        // esconderijos e peças com interação (portas de armário, gavetas) ficam onde estão
        const tp = String(o.userData.t || ''); if (!tp || !o.visible || o.userData.esc || o.userData.int || o.userData.uso || usadosI.has(o.userData.i) || NAO_MOVEL.test(tp)) return;
        const def = MOVEL.find(([re]) => re.test(tp)); if (!def) return;
        const wx = c.g.position.x + o.position.x, wz = c.g.position.z + o.position.z;
        const dV = Math.hypot(wx - v.x, wz - v.z), dP = Math.hypot(wx - px, wz - pz);
        if (dV > 10 || dP > 7) return;
        const bb = new ap.T.Box3().setFromObject(o), sz = bb.getSize(new ap.T.Vector3());
        if (Math.max(sz.x, sz.z) < .8 || sz.y < .55 || Math.max(sz.x, sz.z) > 5) return;
        const nota = dV + dP * .5 - Math.min(2.4, Math.max(sz.x, sz.z)) * 2.2 - Math.min(2, sz.y) * .8;   // o maior primeiro
        if (!best || nota < best.nota) best = { o, def, nota, tp };
      });
      if (best) out.push({ ac: 'movel', ci: v.ci, lado: v.lado, i: best.def[2] === 'Derrubar' ? '🗄' : '🪑', t: `${best.def[2]} ${best.def[1]} na ${rumo}`, sub: `Força DT ${DT_FORCA} · ${custoTxt()}`, oi: best.o.userData.i, tp: best.tp });
      if (A().portaDe(tk.a, v.ci) === 'a' && v.d < 6) out.push({ ac: 'porta', ci: v.ci, lado: v.lado, i: '🚪', t: `Fechar e travar a ${rumo}`, sub: `Força DT ${DT_FORCA} · ${custoTxt()}` });
    });
    if (!out.length) out.push({ off: 'Chegue perto de uma porta (até ~6 m), com um móvel grande por perto, ou de uma porta aberta.' });
    return out;
  },
  async criar(op) {
    const ap = api3(), id = meuId(), tk = id && tokens()[id]; if (!ap || !tk) return;
    const p = salaP(tk); if (!p) return;
    const cn = cnDe(tk.a, p);
    // alguém parado no vão: não dá para fechar em cima dele
    const v0 = { t: op.ac === 'porta' ? 'porta' : 'movel', a: tk.a, ci: op.ci, cn }, zr = zonaBarr(v0);
    if (Object.values(tokens()).some(t => t && t.a === tk.a && dentroR(zr, t.x, t.y))) { ap.toast('Tem alguém no vão.'); return; }
    const motivo = cobrarMetros(id, metrosBarr(), 'A barricada'); if (motivo) { ap.toast(motivo); return; }
    const t = await testeForca(id, tk), ok = t.total >= DT_FORCA, nome = nomeTk(tk);
    const oque = op.ac === 'porta' ? `fechar e travar a porta ${LADO[op.lado]}` : op.t.split(' na ')[0].toLowerCase();
    (A().postarRolagem || (() => {}))(`${nome} tentou ${oque} (barricada): Força ${t.total} [${(t.dados || []).join(', ')}] contra DT ${DT_FORCA} · ${ok ? 'conseguiu' : 'não conseguiu'}`);
    A().diario('persg', `${nome}: barricada (${oque}) em CN ${pad2(cn)} · Força ${t.total} contra DT ${DT_FORCA} · ${ok ? 'feita' : 'falhou'}`);
    publicarRuido('barr', tk.a, p, tk.x, tk.y);
    if (!ok) { ap.toast(`Força ${t.total} contra DT ${DT_FORCA}: não saiu do lugar.`); return; }
    const k = op.ac === 'porta' ? `a${tk.a}:c${op.ci}` : `c${cn}:${op.oi}`;
    const v = { ...v0, lado: op.lado, q: String(id).slice(0, 24), ts: agora() };
    if (op.ac !== 'porta') { v.i = op.oi; v.ob = String(op.tp || '').slice(0, 24); }
    A().definir(['barricadas', k], v);
    ap.toast(`🪑 Barricada feita (Força ${t.total}). Ninguém passa por ali até alguém tirar ou arrombar.`);
  },
  desfazer(k, id) {
    const ap = api3(), v = (est().barricadas || {})[k]; if (!v) return;
    const motivo = cobrarMetros(id, metrosBarr(), 'Desfazer a barricada'); if (motivo) { avisar(motivo); return; }
    A().definir(['barricadas', k], null);
    const tk = tokens()[id]; if (tk) publicarRuido('barr', tk.a, salaP(tk) || int(v.cn) - 25 * (v.a - 1), tk.x, tk.y);
    A().diario('persg', `${tk ? nomeTk(tk) : 'Alguém'} desfez a barricada em CN ${pad2(v.cn)}`);
    if (ap) ap.toast('A passagem está livre de novo.');
  },
  async arrombar(k, id) {
    const ap = api3(), v = (est().barricadas || {})[k], tk = tokens()[id]; if (!v || !tk) return;
    const motivo = cobrarMetros(id, metrosBarr(), 'Arrombar'); if (motivo) { avisar(motivo); return; }
    const t = await testeForca(id, tk), ok = t.total >= DT_FORCA;
    A().diario('persg', `${nomeTk(tk)} tentou arrombar a barricada em CN ${pad2(v.cn)}: Força ${t.total} (${t.como}) contra DT ${DT_FORCA} · ${ok ? 'arrombou' : 'não conseguiu'}`);
    if (A().postarRolagemSecreta) A().postarRolagemSecreta(`${nomeTk(tk)} arrombar a barricada: Força ${t.total} [${(t.dados || []).join(', ')}] contra DT ${DT_FORCA} · ${ok ? 'arrombou' : 'não conseguiu'}`);
    publicarRuido('arromba', v.a, int(v.cn) - 25 * (v.a - 1));
    if (ok) A().definir(['barricadas', k], null);
    if (ap) ap.toast(ok ? `💥 Arrombou (Força ${t.total}).` : `Força ${t.total} contra DT ${DT_FORCA}: a barricada aguentou.`);
  },
};
const custoTxt = () => { const s = situacao(meuId()); return s.part ? custoDesc[opc('barrCusto')] || 'metade da vez' : 'fora da perseguição, sem custo'; };

/* =========================================================
   4. ESCONDERIJO POR DENTRO: frestas, vão, borda e respiração
   ========================================================= */
const MASCARAS = {
  dentro: (w, h) => { let s = ''; const n = 9, top = h * .2, alt = h * .62, gap = alt / n; for (let i = 0; i < n; i++) { const y = top + i * gap; s += `<rect x="${w * .2}" y="${y + gap * .52}" width="${w * .6}" height="${gap * .48}" fill="url(#fugaAleta)"/>`; } s += `<rect x="${w * .497}" y="${top}" width="${w * .006}" height="${alt}" fill="#020202"/>`; return `<rect width="${w}" height="${top}" fill="#050405"/><rect y="${top + alt}" width="${w}" height="${h - top - alt}" fill="#050405"/><rect width="${w * .2}" height="${h}" fill="#050405"/><rect x="${w * .8}" width="${w * .2}" height="${h}" fill="#050405"/>${s}<rect x="${w * .2}" y="${top}" width="${w * .6}" height="${alt}" fill="none" stroke="#1a1512" stroke-width="10"/>`; },
  embaixo: (w, h) => `<rect width="${w}" height="${h * .36}" fill="#060505"/><path d="M0 ${h * .36} Q${w * .5} ${h * .4} ${w} ${h * .36} L${w} ${h * .44} L0 ${h * .44}Z" fill="#0c0a09"/><rect y="${h * .8}" width="${w}" height="${h * .2}" fill="#050404"/><rect x="${w * .05}" y="${h * .3}" width="${w * .045}" height="${h * .56}" fill="#070606"/><rect x="${w * .905}" y="${h * .3}" width="${w * .045}" height="${h * .56}" fill="#070606"/>`,
  atras: (w, h) => `<path d="M0 ${h} L0 ${h * .58} L${w * .18} ${h * .56} L${w * .2} ${h * .5} L${w * .46} ${h * .52} L${w * .5} ${h * .6} L${w * .72} ${h * .58} L${w * .74} ${h * .62} L${w} ${h * .6} L${w} ${h}Z" fill="#060505"/><rect width="${w * .08}" height="${h}" fill="#060505"/>`,
  entre: (w, h) => `<rect width="${w * .36}" height="${h}" fill="#070605"/><rect x="${w * .64}" width="${w * .36}" height="${h}" fill="#070605"/>${[...Array(7)].map((_, i) => `<rect x="${w * .3}" y="${h * (.12 + i * .12)}" width="${w * .06}" height="${h * .015}" fill="#141110"/><rect x="${w * .64}" y="${h * (.08 + i * .12)}" width="${w * .06}" height="${h * .015}" fill="#141110"/>`).join('')}`,
};
const tipoEsc = n => (/^dentro|cabine|c[âa]mara|guarda/i.test(n) ? 'dentro' : /^embaixo/i.test(n) ? 'embaixo' : /^entre|meio/i.test(n) ? 'entre' : 'atras');
const Dentro = {
  quadro(dw, t) {
    const ap = Vista.ap, V = ap.V, e = V.escondido, est = ap.est;
    const quer = e && opc('frestas') && ap.primeiraP(est.modo) && V.ctrl && (euJog() ? V.ctrl === euJog() : true);
    if (!quer) { if (Vista.dentro) this.sair(); return; }
    let D = Vista.dentro;
    if (!D || D.e !== e) { if (D) this.sair(); D = this.entrar(ap, e); }
    // olhar limitado (você está dentro de um móvel)
    let dy = est.yaw - D.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    est.yaw = D.yaw + clamp(dy, -D.lim, D.lim); est.pitch = clamp(est.pitch, -.35, .32);
    V.olharTras = false;
    // câmera na altura do esconderijo, com um leve tremor de respiração
    const cam = ap.camera, resp = Math.sin(t * (D.prendendo ? 0 : 1.9)) * .006, Y = D.y + resp;
    const fx = D.px + Math.sin(D.yaw) * D.recuo, fz = D.pz + Math.cos(D.yaw) * D.recuo;
    cam.position.set(fx, Y, fz);
    cam.lookAt(fx - Math.sin(est.yaw) * Math.cos(est.pitch), Y + Math.sin(est.pitch), fz - Math.cos(est.yaw) * Math.cos(est.pitch));
    // Filho visível perto: prende a respiração (a máscara treme)
    let perto = 99; ap.tok.mapa.forEach((o, id) => { const tk = tokens()[id]; if (tk && tipoDe(tk) === 'filho' && o.t && o.t.g && o.t.g.visible) perto = Math.min(perto, Math.hypot(o.x - D.px, o.z - D.pz)); });
    D.prendendo = perto < 7;
    const fr = $('#fugaFresta'); if (fr) { const tr = D.prendendo ? (Math.random() - .5) * 3 : 0; fr.style.transform = `translate(${tr}px, ${Math.sin(t * 1.9) * 2 + tr}px)`; }
    this.respirar(D, dw, perto);
  },
  entrar(ap, e) {
    const tipo = tipoEsc(e.nome || ''), s = ap.mundo.S[e.p] || null;
    // de frente para o meio da sala (as costas para a parede)
    const cx = s ? s.cx : e.pos.x, cz = s ? s.cz : e.pos.z;
    let vx = cx - e.pos.x, vz = cz - e.pos.z;
    // no meio da sala, olha para a porta mais perto (é por ela que vem quem entra)
    if (Math.hypot(vx, vz) < 4) { const v = vaos3D(ap, e.p).sort((a, b) => Math.hypot(a.x - e.pos.x, a.z - e.pos.z) - Math.hypot(b.x - e.pos.x, b.z - e.pos.z))[0]; if (v) { vx = v.x - e.pos.x; vz = v.z - e.pos.z; } }
    const yaw = Math.atan2(-vx, -vz);
    ap.est.yaw = yaw; ap.est.pitch = tipo === 'embaixo' ? .05 : -.04;
    const D = { e, tipo, yaw, px: e.pos.x, pz: e.pos.z, lim: tipo === 'dentro' ? .42 : tipo === 'entre' ? .3 : .75, y: tipo === 'embaixo' ? (/banco|beliche/i.test(e.nome) ? .3 : .42) : tipo === 'atras' ? 1.02 : 1.48, recuo: tipo === 'atras' ? .35 : tipo === 'dentro' ? -.4 : 0, obj: e.obj, vis: e.obj ? e.obj.visible : true, prox: 0, prendendo: false };
    if (e.obj) e.obj.visible = false;   // a câmera fica dentro do móvel: quem vê o móvel é a máscara
    Vista.dentro = D;
    const fr = $('#fugaFresta');
    if (fr) {
      const w = 1000, h = 1000;
      fr.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="fugaAleta" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2420"/><stop offset=".25" stop-color="#0b0908"/><stop offset="1" stop-color="#000"/></linearGradient><radialGradient id="fugaVin" cx="50%" cy="50%" r="70%"><stop offset="45%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".88"/></radialGradient></defs>${MASCARAS[tipo](w, h)}<rect width="${w}" height="${h}" fill="url(#fugaVin)"/></svg><div class="fuga-fresta-rot">🫥 ${esc(e.nome || 'Escondido')} · E para sair</div>`;
      fr.hidden = false; fr.dataset.tipo = tipo;
    }
    if (ap.V.d) ap.V.d.classList.add('fuga-dentro');
    return D;
  },
  sair(sem) {
    const D = Vista.dentro; Vista.dentro = null;
    if (D && D.obj) D.obj.visible = D.vis;
    const fr = $('#fugaFresta'); if (fr) { fr.hidden = true; fr.innerHTML = ''; fr.style.transform = ''; }
    const ap = Vista.ap; if (ap && ap.V && ap.V.d) ap.V.d.classList.remove('fuga-dentro');
  },
  // respiração contida (opção "Coração e respiração" do jogador): lenta; com o Filho perto, prende
  respirar(D, dw, perto) {
    const C = IMR() && IMR().Cor, S = IMR() && IMR().Som; if (!C || !S || !C.ativo() || !S.ok || !S.ok()) return;
    const c = S.ctx(); if (!c) return;
    const t = c.currentTime;
    if (D.prendendo) { D.prox = Math.max(D.prox, t + 1.2); return; }
    if (!D.prox || D.prox < t) D.prox = t + .2;
    if (D.prox < t + .3) {
      const v = perto < 12 ? .035 : .055, out = S.saida();
      S.ruido(D.prox, out, { bp: 900, q: .6, v, ataque: .7, dur: 1.2 });
      S.ruido(D.prox + 1.35, out, { bp: 560, q: .6, v: v * 1.1, ataque: .3, dur: 1.4 });
      D.prox += 3.6;
    }
  },
};

/* =========================================================
   5. BARULHO DE PROPÓSITO
   ========================================================= */
const Barulho = {
  ult: 0,
  opcoes() {
    const ap = api3(), id = meuId(), tk = id && tokens()[id]; if (!ap || !tk) return [];
    const p = salaP(tk);
    if (!p) return [{ off: 'No corredor o som se espalha: entre numa sala para gritar ou jogar algo.' }];
    if (p === 25) return [{ off: 'Na Zona Neutra o barulho não conta.' }];
    const out = [
      { ac: 'grito', i: '📣', t: 'Gritar', sub: 'barulho alto aqui (+2 no decibelímetro, 1 min e meio)' },
      { ac: 'assobio', i: '😗', t: 'Assobiar', sub: 'barulho aqui (+1, 1 min)' },
    ];
    vaos3D(ap, p).forEach(v => {
      const c = A().geo.CORREDORES[v.ci]; if (!c) return;
      const q = c.p1 === p ? c.p2 : c.p1;
      const aberta = A().portaDe(tk.a, v.ci) === 'a', barr = barricadas().some(([, b]) => b.a === tk.a && b.ci === v.ci);
      out.push({ ac: 'objeto', q, ci: v.ci, lado: v.lado, i: '🪨', t: `Jogar um objeto pela porta ${LADO[v.lado]} (${rumoCam(ap, v.x, v.z)})`, sub: aberta && !barr ? 'cai na sala vizinha (+1 lá, 1 min)' : 'a porta está fechada', off: aberta && !barr ? '' : 'A porta está fechada: o objeto bate nela.' });
    });
    return out;
  },
  fazer(op) {
    const ap = api3(), id = meuId(), tk = id && tokens()[id]; if (!ap || !tk) return;
    if (agora() - this.ult < 8000) { ap.toast('Espere um pouco antes de fazer barulho de novo.'); return; }
    const s = situacao(id); if (s.part && !s.vez) { ap.toast('Na perseguição, isso é na sua vez.'); return; }
    const p = salaP(tk); if (!p) return;
    this.ult = agora();
    const nome = nomeTk(tk);
    if (op.ac === 'objeto') {
      const r = A().geo.retSala(op.q), x = r.x + r.w / 2, y = r.y + r.h / 2;
      publicarRuido('objeto', tk.a, op.q, x, y);
      this.arremesso(ap, op);
      A().diario('persg', `${nome} jogou um objeto para a sala vizinha (CN ${pad2(cnDe(tk.a, op.q))}) para fazer barulho`);
      ap.toast('🪨 Você jogou um objeto pela porta. Algo vai ouvir lá.');
    } else {
      publicarRuido(op.ac, tk.a, p, tk.x, tk.y);
      A().diario('persg', `${nome} ${op.ac === 'grito' ? 'gritou' : 'assobiou'} de propósito em CN ${pad2(cnDe(tk.a, p))}`);
      ap.toast(op.ac === 'grito' ? '📣 Você gritou. O decibelímetro daqui subiu.' : '😗 Você assobiou. O decibelímetro daqui subiu.');
    }
  },
  // o objeto voa pela porta (só na sua tela; o som vem do ruído publicado)
  arremesso(ap, op) {
    const T = ap.T, v = vaos3D(ap, salaP(tokens()[meuId()])).find(x => x.ci === op.ci); if (!v) return;
    const g = new T.BoxGeometry(.14, .1, .2), m = new T.MeshStandardMaterial({ color: '#7a6a55', roughness: .8 }), o = new T.Mesh(g, m);
    const a0 = ap.camera.position.clone(), a1 = new T.Vector3(v.x - v.nx * 4, .3, v.z - v.nz * 4);
    o.position.copy(a0); Vista.grupo.add(o);
    const t0 = performance.now(), dur = 900;
    const passo = () => { const k = (performance.now() - t0) / dur; if (k >= 1 || !Vista.ap) { try { Vista.grupo.remove(o); g.dispose(); m.dispose(); } catch (e) {} return; } o.position.lerpVectors(a0, a1, k); o.position.y = a0.y + (a1.y - a0.y) * k + Math.sin(k * Math.PI) * 1.2; o.rotation.x += .3; o.rotation.y += .2; requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  },
};

/* =========================================================
   6. SINALIZAR
   ========================================================= */
const Sinal = {
  ult: 0,
  enviar(t) {
    const ap = api3(), id = meuId(), tk = id && tokens()[id]; if (!ap || !tk) return;
    if (agora() - this.ult < 2500) { ap.toast('Espere um instante para sinalizar de novo.'); return; }
    this.ult = agora();
    // o ponto: onde a mira (o meio da tela) encosta no chão, até 25 m e sem passar da parede
    const T = ap.T, ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2(0, 0), ap.camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    let X = ap.est.px, Z = ap.est.pz;
    if (d.y < -.02) { const k = -o.y / d.y; X = o.x + d.x * k; Z = o.z + d.z * k; }
    else { X = o.x + d.x * 6; Z = o.z + d.z * 6; }
    // volta pelo raio até um ponto dentro de sala ou corredor
    const ox = ap.est.px, oz = ap.est.pz, L = Math.hypot(X - ox, Z - oz), lim = Math.min(25, L);
    let ux = (X - ox) / (L || 1), uz = (Z - oz) / (L || 1), ult = [ox, oz];
    for (let s = .3; s <= lim; s += .3) { const x = ox + ux * s, z = oz + uz * s; if (!ap.mundo.area3D(x, z, .2)) break; ult = [x, z]; }
    const q = ap.plantaDe3D(ult[0], ult[1]);
    const v = { a: tk.a, x: +q.x.toFixed(2), y: +q.y.toFixed(2), t, ts: agora(), q: String(id).slice(0, 24) };
    if (t === 'foi') { const fwd = new T.Vector3(); ap.camera.getWorldDirection(fwd); const q2 = ap.plantaDe3D(ult[0] + fwd.x, ult[1] + fwd.z); v.d = Math.round(Math.atan2(q2.y - q.y, q2.x - q.x) * 180 / Math.PI); }
    const k = novaChave('s');
    A().definir(['fuga', 's', k], v);
    setTimeout(() => { if (((est().fuga || {}).s || {})[k]) A().definir(['fuga', 's', k], null); }, SINAL_S * 1000 + 1500);
    if (opc('sinalRuido')) publicarRuido('sinal', tk.a, salaP(tk), tk.x, tk.y);
    ap.toast(`${SINAL[t].i} ${SINAL[t].n} marcado para o grupo.`);
  },
};

/* =========================================================
   BARRA DE BOTÕES E JANELINHAS (3D)
   ========================================================= */
const UI = {
  aberta: '', sig: '',
  barra() {
    const b = $('#fugaBarra'); if (!b) return;
    const ap = api3();
    const pode = podeAgir() && ap && !(ap.V && ap.V.escondido) && !(ap.V.d && ap.V.d.classList.contains('s3d-sem-hud'));
    if (!pode) { if (!b.hidden) { b.hidden = true; this.fecharPop(); } this.sig = ''; return; }
    const id = meuId(), s = situacao(id);
    const L = [];
    if (s.part) L.push(['olhar', '👀', 'Atrás', opc('olhar') === 'nada' ? 'Olhar para trás (2 s)' : `Olhar para trás (2 s; ${({ ruido: 'um pouco de barulho', m1: '1,5 m da vez', m3: '3 m da vez' })[opc('olhar')]})`, false]);
    if (opc('barr')) L.push(['barr', '🪑', 'Barricar', `Barricada: Força DT ${DT_FORCA}`, s.part && !s.vez]);
    if (opc('barulho')) L.push(['barulho', '📣', 'Barulho', 'Gritar, assobiar ou jogar um objeto', s.part && !s.vez]);
    if (opc('sinal')) L.push(['sinal', '📍', 'Sinal', 'Marcar um ponto para o grupo', false]);
    const sig = L.map(x => x.join('|')).join('#') + this.aberta;
    if (sig !== this.sig) {
      this.sig = sig;
      b.innerHTML = L.map(([k, i, n, tt, off]) => `<button type="button" class="fuga-bt${off ? ' off' : ''}${this.aberta === k ? ' on' : ''}" data-fuga="${k}" title="${esc(tt)}" aria-label="${esc(tt)}"><i aria-hidden="true">${i}</i>${esc(n)}</button>`).join('');
    }
    b.hidden = !L.length;
    // celular: o cartão da rota sobe para cima das cartas da vez (embaixo fica o joystick)
    const r = $('#fugaRota'), ca = $('#momCartas');
    if (r && !r.hidden) {
      const estreito = innerWidth < 700 && ca && ca.offsetParent && ca.getBoundingClientRect().height > 0;
      r.classList.toggle('sobre-cartas', !!estreito);
      r.style.bottom = estreito ? (innerHeight - ca.getBoundingClientRect().top + 8) + 'px' : '';
    }
  },
  botao(k) {
    if (document.pointerLockElement) document.exitPointerLock();
    if (k === 'olhar') { this.fecharPop(); Olhar.fazer(); return; }
    if (this.aberta === k) { this.fecharPop(); return; }
    this.abrir(k);
  },
  abrir(k) {
    const pop = $('#fugaPop'), ap = api3(); if (!pop || !ap) return;
    if (document.pointerLockElement) document.exitPointerLock();
    const s = situacao(meuId());
    if ((k === 'barr' || k === 'barulho') && s.part && !s.vez) { ap.toast('Na perseguição, isso é na sua vez.'); return; }
    let tit = '', L = [];
    if (k === 'sinal') { tit = '📍 Sinalizar'; L = Object.entries(SINAL).map(([t, S]) => ({ ac: t, i: S.i, t: S.n, sub: t === 'foi' ? 'a seta aponta para onde você olha' : 'onde a mira encosta no chão' })); }
    else if (k === 'barulho') { tit = '📣 Barulho de propósito'; L = Barulho.opcoes(); }
    else if (k === 'barr') { tit = `🪑 Barricada · Força DT ${DT_FORCA}`; L = Barr.opcoes(); }
    this.ops = L; this.aberta = k; this.sig = '';
    const nota = k === 'sinal' ? `<p class="mini">O grupo inteiro vê por ${SINAL_S} s, no 3D e no mapa.${opc('sinalRuido') ? ' Faz um pouco de barulho.' : ''}</p>` : k === 'barr' ? '<p class="mini">Bloqueia a passagem para todos. O Filho contorna ou arromba (Força DT 15).</p>' : '<p class="mini">Atrai o que estiver ouvindo para lá.</p>';
    pop.innerHTML = `<h4><span>${esc(tit)}</span><button type="button" data-pop="x" aria-label="Fechar">✕</button></h4>${L.map((o, i) => o.ac ? `<button type="button" class="fuga-op" data-op="${i}"${o.off ? ' aria-disabled="true"' : ''}><i aria-hidden="true">${o.i}</i><span>${esc(o.t)}<small>${esc(o.sub || '')}</small></span></button>` : `<p class="mini">${esc(o.off)}</p>`).join('')}${nota}`;
    pop.hidden = false; UI.barra();
    const b1 = $('.fuga-op', pop); if (b1 && !celular()) b1.focus();
  },
  fecharPop() { const pop = $('#fugaPop'); if (pop) pop.hidden = true; this.aberta = ''; this.sig = ''; },
  cliquePop(e) {
    if (e.target.closest('[data-pop="x"]')) { this.fecharPop(); this.barra(); return; }
    const b = e.target.closest('[data-op]'); if (!b) return;
    const o = (this.ops || [])[+b.dataset.op]; if (!o) return;
    if (o.off) { avisar(o.off); return; }
    const k = this.aberta; this.fecharPop(); this.barra();
    if (k === 'sinal') Sinal.enviar(o.ac);
    else if (k === 'barulho') Barulho.fazer(o);
    else if (k === 'barr') { if (o.ac === 'desfazer') Barr.desfazer(o.k, meuId()); else Barr.criar(o); }
  },
  fora(e) {
    const pop = $('#fugaPop'); if (!pop || pop.hidden) return;
    if (e.target.closest('#fugaPop') || e.target.closest('#fugaBarra') || e.target.closest('#s3dMenu')) return;
    UI.fecharPop(); UI.barra();
  },
};

/* =========================================================
   MAPA 2D: barricadas e sinais por cima da planta
   ========================================================= */
function desenhar2D() {
  const st = I() && I().stage; if (!st) return;
  const a = I().andarAtual, vivos = new Set();
  barricadas().forEach(([k, v]) => {
    if (v.a !== a) return; const z = zonaBarr(v); if (!z) return; vivos.add('b' + k);
    let m = st.querySelector(`.fuga-barr2d[data-k="${CSS_ESC(k)}"]`);
    if (!m) { m = document.createElement('div'); m.className = 'fuga-barr2d'; m.dataset.k = k; m.title = 'Barricada'; m.setAttribute('aria-label', 'Barricada'); m.textContent = v.t === 'porta' ? '⛔' : '🪑'; st.appendChild(m); }
    m.style.left = I().px(z.x + z.w / 2); m.style.top = I().px(z.y + z.h / 2);
  });
  $$('.fuga-barr2d', st).forEach(m => { if (!vivos.has('b' + m.dataset.k)) m.remove(); });
  const vs = new Set();
  sinaisVivos().forEach(([k, v]) => {
    if (v.a !== a) return; vs.add(k);
    let m = st.querySelector(`.fuga-sinal2d[data-k="${CSS_ESC(k)}"]`);
    if (!m) { const S = SINAL[v.t]; m = document.createElement('div'); m.className = 'fuga-sinal2d'; m.dataset.k = k; m.style.setProperty('--c', S.cor); m.innerHTML = `<span>${S.i} ${esc(S.n)}${SERd(v.q) ? ' · ' + esc(SERd(v.q).nome) : ''}</span><i></i>`; st.appendChild(m); }
    m.style.left = I().px(v.x); m.style.top = I().px(v.y);
  });
  $$('.fuga-sinal2d', st).forEach(m => { if (!vs.has(m.dataset.k)) m.remove(); });
}
const CSS_ESC = s => (window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/[^\w-]/g, '\\$&'));

/* =========================================================
   MESTRE: seção "Fuga dos jogadores" no bloco Perseguição
   ========================================================= */
// seção "Fuga dos jogadores" do bloco único "Perseguição (Sobrevivendo ao Horror)" (aba Mesa).
// O h3 fica fora do div, como filho direto do bloco, para virar seção recolhível (paineis.js)
function blocoMestre() {
  const pai = $('#blocoSahPers'); let b = $('#fugaCfgM'), h = $('#fugaCfgMH');
  if (!souMestre() || !pai || I().espiar) { if (b) b.hidden = true; if (h) h.hidden = true; return; }
  if (!b) {
    h = document.createElement('h3'); h.id = 'fugaCfgMH'; h.textContent = 'Fuga dos jogadores'; pai.appendChild(h);
    b = document.createElement('div'); b.id = 'fugaCfgM'; b.className = 'fuga-cfg'; pai.appendChild(b);
  } else if (b.parentNode !== pai) { pai.appendChild(h); pai.appendChild(b); }
  b.hidden = false; if (h) h.hidden = false;
  if (b.contains(document.activeElement) && document.activeElement.matches('input, select')) return;
  const chip = (k, txt) => `<label class="chave"><input type="checkbox" data-fg="${k}" ${opc(k) ? 'checked' : ''}><span>${txt}</span></label>`;
  const radio = (k, v, txt) => `<label class="chave"><input type="radio" name="fg-${k}" data-fgr="${k}" value="${v}" ${opc(k) === v ? 'checked' : ''}><span>${txt}</span></label>`;
  const nB = barricadas().length;
  const html = `<p class="mini">O que as cobaias podem fazer no 3D para fugir. Teste do livro: criar e arrombar barricada é Força DT ${DT_FORCA} (SaH p. 90 e 91). O resto é da casa.</p>
    ${chip('rota', 'Rota com custo: na vez do jogador, tocar no chão do 3D mostra o caminho e os metros')}
    ${chip('pega', '"Ele te pega aqui": até onde o Filho visível chega no próximo turno (nunca de oculto)')}
    <p class="fuga-grupo-t">👀 Olhar para trás (2 s) custa</p>
    <div class="fuga-grupo">${radio('olhar', 'nada', 'Nada')}${radio('olhar', 'ruido', 'Um pouco de barulho')}${radio('olhar', 'm1', '1,5 m da vez')}${radio('olhar', 'm3', '3 m da vez')}</div>
    ${chip('barr', `Barricadas (derrubar estante, empurrar maca ou mesa, travar a porta; Força DT ${DT_FORCA})`)}
    <p class="fuga-grupo-t">🪑 Barricada na perseguição custa (fazer, desfazer ou arrombar)</p>
    <div class="fuga-grupo">${radio('barrCusto', 'nada', 'Nada')}${radio('barrCusto', 'm3', '3 m')}${radio('barrCusto', 'metade', 'Metade da vez')}${radio('barrCusto', 'vez', 'A vez inteira')}</div>
    ${chip('barulho', 'Barulho de propósito (gritar, assobiar, jogar um objeto na sala vizinha)')}
    ${chip('sinal', 'Sinalizar no 3D ("aqui!", "ele foi por ali", "perigo")')}
    ${chip('sinalRuido', 'Sinalizar faz um pouco de barulho')}
    ${chip('frestas', 'Esconderijo por dentro (frestas do armário, vão da cama, respiração)')}
    <div class="ferramentas"><button type="button" class="btn-fantasma" data-fg-limpar ${nB ? '' : 'disabled'}>🧹 Tirar ${nB ? nB + ' ' : ''}barricada${nB === 1 ? '' : 's'} do mapa</button></div>`;
  if (b.dataset.h === html) return;
  b.dataset.h = html; b.innerHTML = html;
  $$('[data-fg]', b).forEach(i => i.onchange = () => { const k = i.dataset.fg; A().definir(['cfg', 'fuga', k], i.checked === PAD[k] ? null : i.checked); });
  $$('[data-fgr]', b).forEach(i => i.onchange = () => { if (!i.checked) return; const k = i.dataset.fgr; A().definir(['cfg', 'fuga', k], i.value === PAD[k] ? null : i.value); });
  const bl = $('[data-fg-limpar]', b); if (bl) bl.onclick = () => { A().definir(['barricadas'], null); A().diario('persg', 'O Mestre tirou as barricadas do mapa'); };
}

/* =========================================================
   VIGIAS: sons novos, limpeza do que venceu (tela do Mestre)
   ========================================================= */
const vistos = { r: null, s: null, b: null };
function vigiar() {
  const r = (est().fuga || {}).r || {}, s = (est().fuga || {}).s || {}, b = est().barricadas || {};
  if (vistos.r) Object.entries(r).forEach(([k, v]) => { if (!vistos.r.has(k) && v && agora() - num(v.ts) < 8000) { const x = typeof v.x === 'number' ? v.x : (A().geo.retSala(v.p).x + 2.5), y = typeof v.y === 'number' ? v.y : (A().geo.retSala(v.p).y + 2.5); tocarSom(v.t, v.a, x, y); } });
  if (vistos.s) Object.entries(s).forEach(([k, v]) => { if (!vistos.s.has(k) && v && agora() - num(v.ts) < 4000) tocarSom('sinal', v.a, v.x, v.y); });
  vistos.r = new Set(Object.keys(r)); vistos.s = new Set(Object.keys(s)); vistos.b = new Set(Object.keys(b));
  // a tela do Mestre apaga o que venceu (quem gravou pode ter fechado a página)
  if (souMestre() && !I().espiar) {
    Object.entries(r).forEach(([k, v]) => { if (!v || !RUIDO[v.t] || agora() - num(v.ts) > RUIDO[v.t].s * 1000 + 5000) A().definir(['fuga', 'r', k], null); });
    Object.entries(s).forEach(([k, v]) => { if (!v || agora() - num(v.ts) > SINAL_S * 1000 + 5000) A().definir(['fuga', 's', k], null); });
  }
}

let ag = null;
function tudo() { try { vigiar(); blocoMestre(); desenhar2D(); } catch (e) { console.warn('fuga:', e); } }
function agendar() { if (ag) return; ag = setTimeout(() => { ag = null; tudo(); }, 150); }
function iniciar() {
  if (!window.ACF || !window.ACF._int || !window.ACF.aoMudar) { setTimeout(iniciar, 200); return; }
  estilo();
  A().aoMudar(agendar);
  document.addEventListener('acf-perfil', () => setTimeout(tudo, 80));
  setInterval(() => { try { desenhar2D(); vigiar(); } catch (e) {} }, 1000);
  tudo();
}
(window.ACF3D = window.ACF3D || {}).vista = window.ACF3D.vista || [];
window.ACF3D.vista.push(Vista);
window.ACF_FUGA = {
  // ganchos de app.js
  bloqueia, gruposExtra,
  // para o piloto automático e outras telas: zona bloqueada de uma barricada (unidades da planta)
  zonaBarr, barricadas: a => barricadas().filter(([, v]) => !a || v.a === a).map(([k, v]) => ({ k, ...v, zona: zonaBarr(v) })),
  ruidos: () => ruidosVivos().map(([k, v]) => ({ k, ...v })), sinais: () => sinaisVivos().map(([k, v]) => ({ k, ...v })),
  plantaLivre, opc, PAD, DT_FORCA, _sinalS: v => { SINAL_S = v; },
  // para testes
  Vista, Rota, Pega, Olhar, Barr, Dentro, Barulho, Sinal, UI, caminho, publicarRuido,
};
iniciar();
})();
