/* =========================================================
   A CAIXA DE FÓSFOROS · perseg3d.js
   Os Filhos na perseguição, do lado do Mestre.

   1. PILOTO AUTOMÁTICO: na vez de um Filho, "Mover Filho" calcula para onde a
      criatura iria pelos sentidos dela (privado/filhos) e mostra a rota no 3D (linha
      no chão com os metros) e no mapa 2.5D. O Mestre (ou o auxiliar) confirma ou move
      à mão. Só sugere; respeita deslocamento, portas, paredes, água, metal, Zona Neutra.
   2. COMPORTAMENTO VISÍVEL: o modelo 3D age pelas características, sem mexer nas formas
      (gira, inclina, sobe, afunda, fica translúcido o grupo do token).
   3. ABERTURA: "Iniciar perseguição" mostra 2 s da criatura (revelar + som) a quem a vê.
   4. O FILHO PARA NA PORTA: a cobaia entra na Zona Neutra, a porta bate e a criatura
      encara o batente e vai embora.
   5. REPLAY: a tela do Mestre grava as posições; no fim, ~20 s vistos de cima.
   6. LINHA DE INICIATIVA no topo do 3D.
   7. Chips no bloco Perseguição do Mestre (mapa/cfg/perseg).

   O código é genérico: nenhum nome de Filho aqui. Tudo vem dos dados (filhos.js).
   ========================================================= */
(() => {
'use strict';
const A = () => window.ACF;
const I = () => window.ACF._int;
const FIL = () => window.ACF_FILHOS;
const S3 = () => window.Sala3D;
const MOM = () => window.ACF_MOMENTO;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const agora = () => Date.now();
const num = (v, p = 0) => { const n = parseFloat(v); return isFinite(n) ? n : p; };
const int = v => Math.round(num(v));
const pad2 = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtM = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
const est = () => (A() && A().estado) || {};
const tokens = () => est().tokens || {};
const SERd = id => (A().SER || {})[id];
const tipoDe = tk => ((tk && SERd(tk.s)) || {}).tipo || '';
const souMestre = () => !!(A() && A().mestre);
const souAux = () => !!(A() && A().aux && !A().mestre);
const souGM = () => souMestre() || souAux();
const euJog = () => (A() && !A().mestre && !A().aux ? A().meu : null);
const persg = () => est().persg || { on: false };
const ordemP = () => (persg().ordem ? Object.values(persg().ordem) : []);
const vezId = () => { const p = persg(), o = ordemP(); return p.on && o.length ? (o[p.vez || 0] || {}).id : null; };
const salaP = tk => (tk && tk.a ? I().salaEm(tk.a, tk.x, tk.y) : null);
const cnTk = tk => { const p = salaP(tk); return p ? I().cnDe(tk.a, p) : null; };
const aberto3D = () => !!(S3() && S3().aberta);
const api3 = () => (aberto3D() && S3()._api) || null;
const nomeTk = tk => (A().rotulo ? A().rotulo(tk) : (SERd(tk.s) || {}).nome || '');
const celular = () => Math.min(innerWidth, innerHeight) < 700 || matchMedia('(pointer: coarse)').matches;
// opções do Mestre (mapa/cfg/perseg/<k> = false desliga; nada gravado = padrão)
const cfgP = (k, p = true) => { const c = ((est().cfg || {}).perseg) || {}; return c[k] === undefined || c[k] === null ? p : c[k]; };
const filhoAVista = tk => tipoDe(tk) === 'filho' && !tk.h && !tk.oc && !tk.fo && !tk.pp && !tk.cp && !(FIL() && FIL().foraDoEncontro && FIL().foraDoEncontro(tk));
const ZN = 25;   // a Zona Neutra é a sala 25 de cada andar
const cfgTk = tk => (FIL() && FIL().cfgTk ? FIL().cfgTk(tk) : null);
const sent = (c, k) => !!(c && c.sent && c.sent[k]);
const mod = (c, k) => !!(c && c.movx && c.movx[k]);
const tagsSala = cn => (FIL() && FIL().tagsSala ? FIL().tagsSala(cn) : {}) || {};
const tagsCorr = (a, ci) => (FIL() && FIL().tagsCorr ? FIL().tagsCorr(a, ci) : {}) || {};
const machucada = tk => { const v = tk && tk.vit; if (!v) return false; const mx = num(v.pvMax, num(v.pvM, 0)); return typeof v.pv === 'number' && mx > 0 && v.pv < mx; };
const vizinhas = p => { const v = []; I().CORREDORES.forEach(c => { if (c.p1 === p) v.push(c.p2); else if (c.p2 === p) v.push(c.p1); }); return v; };
const centroSala = p => { const r = I().retSala(p); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; };
const NIVEL_NOME = ['silêncio', 'baixo', 'moderado', 'alto', 'no limite', 'limite rompido'];
const ls = { get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
function avisar(t) { const ap = api3(); if (ap) ap.toast(t); else if (A()) A().aviso(t); }

/* =========================================================
   1. PILOTO AUTOMÁTICO DO FILHO (só sugere; quem decide é o Mestre)
   ========================================================= */
const CEL = .25;   // grade da busca de caminho (unidades da planta; a sala tem 5)
// onde ESTE Filho pode pisar (as mesmas regras do mapa, vistas com as características dele)
function regrasDe(id, tk) {
  const g = A().geo, c = cfgTk(tk) || {}, a = tk.a;
  const atr = mod(c, 'atravessa');
  const salaOk = [false];
  for (let p = 1; p <= 25; p++) {
    const tg = tagsSala(I().cnDe(a, p));
    salaOk[p] = p !== ZN && !(mod(c, 'proibeMetal') && tg.metal) && !(mod(c, 'grande') && tg.estreito) && !(mod(c, 'proibeBarulhenta') && tg.barulhenta);
  }
  const corrOk = g.CORREDORES.map((k, ci) => (I().portaAberta(a, ci) || !!(FIL() && FIL().ignoraPorta(id, a, ci))) && !(mod(c, 'grande') && tagsCorr(a, ci).estreito));
  const dentro = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const andar = (x, y) => {
    const p = I().salaEm(a, x, y);
    if (p) return salaOk[p];
    if (atr) return x >= 0 && y >= 0 && x <= g.W && y <= g.H;
    for (let ci = 0; ci < g.CORREDORES.length; ci++) { const k = g.CORREDORES[ci]; if (dentro(k, x, y)) return corrOk[ci]; }
    return false;
  };
  // metros por unidade (sala ou corredor), como o custoMetros do mapa
  const escala = (x, y) => {
    if (I().salaEm(a, x, y)) return [g.M_POR_UNID, g.M_POR_UNID];
    for (const k of g.CORREDORES) if (dentro(k, x, y)) return k.eixo === 'h' ? [g.M_CORREDOR, g.M_POR_UNID] : [g.M_POR_UNID, g.M_CORREDOR];
    return [g.M_POR_UNID, g.M_POR_UNID];
  };
  return { andar, escala, atr, c };
}
// o desenho da planta em células (fixo): 1..25 sala, 100 + ci corredor, 0 parede
let GEO = null;
function geoGrade() {
  if (GEO) return GEO;
  const g = A().geo, nx = Math.ceil(g.W / CEL), ny = Math.ceil(g.H / CEL), tipo = new Int16Array(nx * ny);
  const pintar = (r, v, so0) => { for (let j = Math.max(0, Math.floor(r.y / CEL)); j < Math.min(ny, Math.ceil((r.y + r.h) / CEL)); j++) for (let i = Math.max(0, Math.floor(r.x / CEL)); i < Math.min(nx, Math.ceil((r.x + r.w) / CEL)); i++) { const x = (i + .5) * CEL, y = (j + .5) * CEL, k = j * nx + i; if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h && (!so0 || !tipo[k])) tipo[k] = v; } };
  for (let p = 1; p <= 25; p++) pintar(g.retSala(p), p);
  g.CORREDORES.forEach((k, ci) => pintar(k, 100 + ci, true));
  return (GEO = { nx, ny, tipo });
}
// uma busca só (Dijkstra) a partir do Filho: depois cada alvo lê o caminho
function buscar(id, tk) {
  const g = A().geo, R = regrasDe(id, tk), G = geoGrade(), nx = G.nx, ny = G.ny, N = nx * ny, mu = g.M_POR_UNID;
  const ok = new Uint8Array(N), sx = new Float32Array(N), sy = new Float32Array(N);
  const corrOk = g.CORREDORES.map((k, ci) => R.andar(k.x + k.w / 2, k.y + k.h / 2));
  const salaOk = [false]; for (let p = 1; p <= 25; p++) { const r = g.retSala(p); salaOk[p] = R.andar(r.x + r.w / 2, r.y + r.h / 2); }
  for (let k = 0; k < N; k++) {
    const t = G.tipo[k];
    if (t >= 1 && t <= 25) { if (salaOk[t]) { ok[k] = 1; sx[k] = sy[k] = mu; } }
    else if (t >= 100) { if (corrOk[t - 100]) { ok[k] = 1; const h = g.CORREDORES[t - 100].eixo === 'h'; sx[k] = h ? g.M_CORREDOR : mu; sy[k] = h ? mu : g.M_CORREDOR; } }
    else if (R.atr) { ok[k] = 1; sx[k] = sy[k] = mu; }
  }
  // barricadas (fuga3d.js): a faixa é parede para ele, a menos que atravesse ou arrombe (a mesma conta do mapa)
  const FU = window.ACF_FUGA;
  if (FU && FU.barricadas && FU.bloqueia) FU.barricadas(tk.a).forEach(b => {
    const z = b.zona; if (!z || !FU.bloqueia(id, tk.a, z.x + z.w / 2, z.y + z.h / 2, false)) return;
    for (let j = Math.max(0, Math.floor(z.y / CEL)); j <= Math.min(ny - 1, Math.floor((z.y + z.h) / CEL)); j++) for (let i = Math.max(0, Math.floor(z.x / CEL)); i <= Math.min(nx - 1, Math.floor((z.x + z.w) / CEL)); i++) ok[j * nx + i] = 0;
  });
  const cel = (x, y) => clamp(Math.floor(y / CEL), 0, ny - 1) * nx + clamp(Math.floor(x / CEL), 0, nx - 1);
  // começo: a célula do token (ou a livre mais perto)
  let ini = cel(tk.x, tk.y);
  if (!ok[ini]) { let bd = 1e9, bi = -1; const ci = ini % nx, cj = Math.floor(ini / nx); for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= nx || j >= ny) continue; const k = j * nx + i; if (ok[k] && di * di + dj * dj < bd) { bd = di * di + dj * dj; bi = k; } } ini = bi; }
  const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
  if (ini < 0) return { R, dist, prev, nx, ny, ok, cel, ini };
  // fila de prioridade simples (heap binário)
  const hk = [], hv = [];
  const troca = (a, b) => { const tk2 = hk[a]; hk[a] = hk[b]; hk[b] = tk2; const tv = hv[a]; hv[a] = hv[b]; hv[b] = tv; };
  const push = (k, v) => { hk.push(k); hv.push(v); let i = hk.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hv[p] <= hv[i]) break; troca(p, i); i = p; } };
  let popV = 0;
  const pop = () => { const k = hk[0]; popV = hv[0]; const lk = hk.pop(), lv = hv.pop(); if (hk.length) { hk[0] = lk; hv[0] = lv; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < hk.length && hv[l] < hv[m]) m = l; if (r < hk.length && hv[r] < hv[m]) m = r; if (m === i) break; troca(m, i); i = m; } } return k; };
  dist[ini] = 0; push(ini, 0);
  const viz = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (hk.length) {
    const k = pop(), d = popV; if (d > dist[k]) continue;
    const i = k % nx, j = (k - i) / nx;
    for (let v = 0; v < 8; v++) {
      const di = viz[v][0], dj = viz[v][1];
      const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
      const q = jj * nx + ii; if (!ok[q]) continue;
      if (di && dj && (!ok[j * nx + ii] || !ok[jj * nx + i])) continue;   // diagonal só com os dois lados livres
      const ex = (sx[k] + sx[q]) / 2, ey = (sy[k] + sy[q]) / 2, c = Math.hypot(di * CEL * ex, dj * CEL * ey), nd = d + c;
      if (nd < dist[q]) { dist[q] = nd; prev[q] = k; push(q, nd); }
    }
  }
  return { R, dist, prev, nx, ny, ok, cel, ini };
}
// as quatro portas da Zona Neutra, do lado de fora (a ponta do corredor encostada nela)
function portasZN() {
  const r = I().retSala(ZN), out = [];
  I().CORREDORES.forEach((k, ci) => {
    if (k.p1 !== ZN && k.p2 !== ZN) return;
    if (k.eixo === 'h') out.push({ ci, x: k.x < r.x ? k.x + k.w - .22 : k.x + .22, y: k.y + k.h / 2 });
    else out.push({ ci, x: k.x + k.w / 2, y: k.y < r.y ? k.y + k.h - .22 : k.y + .22 });
  });
  return out;
}
// do Filho até o ponto do alvo (se a porta está fechada e ele não passa, não há caminho);
// na Zona Neutra ninguém entra: o alvo vira o batente alcançável mais perto
function caminhoAte(B, tk, alvo) {
  const { dist, prev, nx, ny, cel } = B, mu = A().geo.M_POR_UNID;
  let fim = cel(alvo.x, alvo.y);
  if (alvo.zn) {
    let bd = Infinity, bp = null;
    portasZN().forEach(q => { const k = cel(q.x, q.y); if (!isFinite(dist[k])) return; const v = dist[k] + Math.hypot(q.x - alvo.x, q.y - alvo.y) * mu; if (v < bd) { bd = v; bp = q; } });
    if (!bp) return null;
    alvo = { x: bp.x, y: bp.y }; fim = cel(bp.x, bp.y);
  }
  if (!isFinite(dist[fim])) {
    let bd = Infinity; const ci = fim % nx, cj = Math.floor(fim / nx), R = 2;
    for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
      const k = j * nx + i; if (!isFinite(dist[k])) continue;
      const v = dist[k] + 3 * Math.hypot(di, dj) * CEL * mu; if (v < bd) { bd = v; fim = k; }
    }
    if (!isFinite(bd)) return null;
  }
  const cels = []; for (let k = fim; k >= 0; k = prev[k]) { cels.push(k); if (k === B.ini) break; }
  if (cels[cels.length - 1] !== B.ini) return null;
  cels.reverse();
  const pts = [{ x: tk.x, y: tk.y }].concat(cels.map(k => ({ x: (k % nx + .5) * CEL, y: (Math.floor(k / nx) + .5) * CEL })));
  if (isFinite(dist[cel(alvo.x, alvo.y)]) && B.R.andar(alvo.x, alvo.y)) pts.push({ x: alvo.x, y: alvo.y });
  return suavizar(B, pts);
}
// puxa o barbante: tira os pontos que dá para pular em linha reta
// (a grade segue as paredes da planta: salas e corredores caem em múltiplos de 0,25)
function livreReto(B, a, b) { const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / .05)); for (let i = 1; i < n; i++) if (!B.ok[B.cel(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n)]) return false; return true; }
function suavizar(B, pts) {
  if (pts.length < 3) return pts;
  const out = [pts[0]]; let i = 0;
  while (i < pts.length - 1) { let j = i + 1; while (j + 1 < pts.length && livreReto(B, pts[i], pts[j + 1])) j++; out.push(pts[j]); i = j; }
  return out;
}
const custo = (a, b) => A().custoMetros(a, b);
// corta o caminho no que resta de deslocamento (metros de regra, os mesmos do site)
function cortar(pts, resta) {
  const alc = [pts[0]]; let m = 0, total = 0;
  for (let i = 1; i < pts.length; i++) total += custo(pts[i - 1], pts[i]);
  for (let i = 1; i < pts.length; i++) {
    const c = custo(pts[i - 1], pts[i]);
    if (m + c <= resta + 1e-6) { alc.push(pts[i]); m += c; continue; }
    let lo = 0, hi = 1; const a = pts[i - 1], b = pts[i];
    for (let k = 0; k < 18; k++) { const mid = (lo + hi) / 2, q = { x: a.x + (b.x - a.x) * mid, y: a.y + (b.y - a.y) * mid }; if (m + custo(a, q) <= resta) lo = mid; else hi = mid; }
    const q = { x: a.x + (b.x - a.x) * lo, y: a.y + (b.y - a.y) * lo }; m += custo(a, q); alc.push(q); break;
  }
  return { alc, m, total };
}
// encurta o fim (não para em cima da cobaia)
function encurtar(pts, u) {
  if (pts.length < 2) return pts;
  const out = pts.slice(); let falta = u;
  while (out.length > 1 && falta > 0) {
    const b = out[out.length - 1], a = out[out.length - 2], d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d > falta) { const k = (d - falta) / d; out[out.length - 1] = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; break; }
    out.pop(); falta -= d;
  }
  return out;
}
// por que este Filho enxerga a cobaia (só para o Mestre ler; a regra de verdade é a do filhos.js)
function motivoVe(f, c, t) {
  const pf = salaP(f), pt = salaP(t);
  if (pf && pt === pf) return 'viu na mesma sala';
  if (sent(c, 'vib_mov')) return 'sentiu a vibração de quem se mexeu';
  if (sent(c, 'vibracao')) return 'sentiu a teia';
  if (sent(c, 'solidao') && pt) return 'percebeu alguém sozinho';
  if (sent(c, 'raizes')) return 'sentiu pelas raízes';
  if (sent(c, 'ninho')) return 'entraram no ninho';
  if (sent(c, 'maior_nex')) return 'sente o maior NEX';
  if (sent(c, 'telas')) return 'viu pela tela';
  if (sent(c, 'cameras')) return 'viu pela câmera';
  if (sent(c, 'leitura_cena') || sent(c, 'leitura')) return 'sente quem leu';
  if (sent(c, 'mechas')) return 'pisou no rastro dele';
  if (sent(c, 'visao_total')) return 'viu na sala vizinha';
  if (sent(c, 'visao_curta')) return 'viu de perto';
  return 'viu (sala revelada)';
}
// para onde a criatura iria, pelos sentidos cadastrados em privado/filhos
function candidatos(id, f) {
  const c = cfgTk(f); if (!c) return [];
  const a = f.a, out = [], mu = A().geo.M_POR_UNID, tks = tokens();
  const cobs = Object.entries(tks).filter(([, t]) => t && tipoDe(t) === 'cobaia' && t.a === a);
  cobs.forEach(([cid, t]) => {
    if (!FIL().percebe || FIL().percebe(id, t) !== true) return;
    out.push({ k: 've', cid, x: t.x, y: t.y, prio: 5, mot: motivoVe(f, c, t), zn: salaP(t) === ZN, nome: nomeTk(t) });
  });
  if (sent(c, 'audicao') || sent(c, 'audicao_precisa')) {
    const cf = cnTk(f);
    let alc = num(c.alcAud, 36); if (sent(c, 'audicao_agua') && cf && tagsSala(cf).agua) alc *= 2;
    I().gruposDeSala().forEach(gr => {
      if (gr.a !== a) return;
      const n = I().nivelDe(gr.ids.length + (gr.extra || 0)); if (n < 1) return;
      const r = gr.p ? I().retSala(gr.p) : null, t0 = !gr.p ? tks[gr.ids[0]] : null;
      const pt = gr.p ? centroSala(gr.p) : t0 ? { x: t0.x, y: t0.y } : null; if (!pt) return;
      const perto = r ? { x: clamp(f.x, r.x, r.x + r.w), y: clamp(f.y, r.y, r.y + r.h) } : pt;
      const d = Math.hypot(perto.x - f.x, perto.y - f.y) * mu;
      let prio, mot;
      if (sent(c, 'audicao_precisa')) {
        if (n <= 1) { prio = 2.6; mot = 'ouviu um sussurro (só a direção)'; }
        else if (n === 2 && d > 18) { prio = 2.7; mot = 'ouviu vozes longe (só a direção)'; }
        else { prio = 3.6 + n * .1; mot = `ouviu barulho ${NIVEL_NOME[n]} (sala exata)`; }
      } else { if (d > alc) return; prio = 3 + n * .15; mot = `ouviu barulho ${NIVEL_NOME[n]}`; }
      // o auxiliar só sabe o que a criatura saberia: o barulho, não quem fez
      out.push({ k: 'ouve', x: pt.x, y: pt.y, prio, mot, cn: gr.p ? I().cnDe(a, gr.p) : null, zn: gr.p === ZN, nome: souMestre() ? gr.ids.map(i => nomeTk(tks[i] || {})).join(', ') : '' });
    });
  }
  if (sent(c, 'faro')) cobs.forEach(([cid, t]) => {
    if (!machucada(t)) return; const p = salaP(t), q = p ? centroSala(p) : { x: t.x, y: t.y };
    out.push({ k: 'faro', cid, x: q.x, y: q.y, prio: 3.45, mot: 'faro de sangue (ferida)', zn: p === ZN, nome: souMestre() ? nomeTk(t) : '' });
  });
  if (sent(c, 'trilha')) {
    const lim = (int(c.trilhaMin) || 5) * 60e3, tr = (((I().Priv || {}).dados || {}).filhosEstado || {}).trilha || {};
    Object.entries(tr).forEach(([cid, pts]) => {
      const ult = Object.values(pts || {}).filter(v => v && v.a === a && agora() - num(v.ts) < lim).sort((u, v) => num(v.ts) - num(u.ts))[0];
      if (!ult || !tks[cid]) return; const p = ult.cn - 25 * (a - 1); if (p < 1 || p > 25) return;
      const q = centroSala(p); out.push({ k: 'trilha', cid, x: q.x, y: q.y, prio: 3.25, mot: 'seguiu o rastro', zn: p === ZN, nome: nomeTk(tks[cid]) });
    });
  }
  // na Zona Neutra ninguém entra: vira a última opção (ele para na porta)
  out.forEach(o => { if (o.zn) { o.prio -= 4; o.mot += ' · para na porta da Zona Neutra'; } });
  // a mesma cobaia ou sala por dois sentidos: fica o mais forte
  const vistos = new Map();
  out.sort((u, v) => v.prio - u.prio).forEach(o => { const ch = o.cid ? 'c:' + o.cid : 's:' + Math.round(o.x) + ',' + Math.round(o.y); if (!vistos.has(ch)) vistos.set(ch, o); });
  return [...vistos.values()];
}
const Piloto = {
  sug: null, vk: null, exec: null, auto: {},
  podeUsar() {
    if (!souGM() || !A().pronto || (I() && I().espiar) || cfgP('piloto') === false) return null;
    const vid = vezId(), tk = vid && tokens()[vid];
    if (!tk || tipoDe(tk) !== 'filho') return null;
    if (!souMestre() && !(A().podeMover && A().podeMover(tk))) return null;
    return vid;
  },
  calcular(id, iAlvo) {
    const tk = tokens()[id]; if (!tk) return null;
    const oz = ordemP().find(o => o.id === id) || {};
    const lim = FIL() ? FIL().limite(id, num(oz.lim, 9)) : num(oz.lim, 9), resta = Math.max(0, lim - num(tk.m));
    const base = { id, a: tk.a, x0: tk.x, y0: tk.y, lim, resta, vk: this.chaveVez(), ts: agora() };
    const trava = FIL() && FIL().travado ? FIL().travado(id, tk) : '';
    if (trava) return { ...base, msg: trava, alvos: [] };
    if (!cfgTk(tk)) return { ...base, msg: 'Este Filho não tem características cadastradas (aba Segredos › Filhos). Mova à mão.', alvos: [] };
    if (resta <= .05) return { ...base, msg: 'Deslocamento esgotado nesta vez.', alvos: [] };
    const B = buscar(id, tk);
    const alvos = [];
    candidatos(id, tk).forEach(cd => {
      let pts = caminhoAte(B, tk, cd); if (!pts || pts.length < 2) return;
      if (cd.k === 've' && !cd.zn) pts = encurtar(pts, .45);
      const r = cortar(pts, resta); if (r.total < .3 && cd.k !== 've') return;
      alvos.push({ ...cd, pts, alc: r.alc, m: r.m, total: r.total });
    });
    alvos.sort((u, v) => (v.prio - u.prio) || (u.total - v.total));
    const i = clamp(iAlvo || 0, 0, Math.max(0, alvos.length - 1));
    return { ...base, alvos, i, msg: alvos.length ? '' : 'Nenhuma cobaia ao alcance dos sentidos dele. Sugestão: esperar (ou mova à mão).' };
  },
  chaveVez() { const p = persg(); return p.on ? (p.rod || 1) + ':' + (p.vez || 0) + ':' + vezId() + ':' + num(p.vts) : null; },
  atual() { const s = this.sug; return s && s.alvos[s.i] ? s.alvos[s.i] : null; },
  mostrar(id) { this.sug = this.calcular(id, 0); this.desenhar(); },
  outro() { const s = this.sug; if (!s || s.alvos.length < 2) return; s.i = (s.i + 1) % s.alvos.length; this.desenhar(); },
  limpar() { this.sug = null; this.desenhar(); },
  // confirma: anda pela rota com as regras do site (moverToken3D), em passos, como se alguém arrastasse
  confirmar() {
    const s = this.sug, al = this.atual(); if (!s || !al || this.exec) return;
    const id = s.id, pts = al.alc, segs = []; let tot = 0;
    for (let i = 1; i < pts.length; i++) { const c = custo(pts[i - 1], pts[i]); segs.push({ a: pts[i - 1], b: pts[i], m0: tot, c }); tot += c; }
    if (tot < .05) { this.limpar(); return; }
    const vel = Math.max(3.6, tot / 2.6), t0 = performance.now();
    const ponto = m => { const sg = segs.find(x => m <= x.m0 + x.c + 1e-6) || segs[segs.length - 1]; const k = sg.c ? clamp((m - sg.m0) / sg.c, 0, 1) : 1; return { x: sg.a.x + (sg.b.x - sg.a.x) * k, y: sg.a.y + (sg.b.y - sg.a.y) * k }; };
    this.exec = { id, fim: false };
    A().diario && A().diario('persg', `Piloto do Filho: ${nomeTk(tokens()[id] || {})} ${al.mot}${al.cn ? ' em CN ' + pad2(al.cn) : ''} (${fmtM(al.m)} m)`);
    const passo = () => {
      if (!this.exec) return;
      const m = Math.min(tot, (performance.now() - t0) / 1000 * vel), fim = m >= tot - 1e-6, q = ponto(m);
      let r = A().moverToken3D(id, q.x, q.y, fim);
      this.log = (this.log || []).slice(-30); this.log.push([+m.toFixed(2), +q.x.toFixed(2), +q.y.toFixed(2), r && r.ok, r && r.motivo || '']);
      // bateu numa quina (a grade é de 25 cm): tenta chegar mais perto no mesmo trecho
      if (r && !r.ok && r.parede) { const tk = tokens()[id]; for (let f2 = .5; tk && f2 > .05; f2 /= 2) { const q2 = { x: tk.x + (q.x - tk.x) * f2, y: tk.y + (q.y - tk.y) * f2 }; const r2 = A().moverToken3D(id, q2.x, q2.y, false); if (r2 && r2.ok) { r = { ...r2, ok: true }; break; } } if (r.ok && fim) r = A().moverToken3D(id, tokens()[id].x, tokens()[id].y, true); }
      if (!r || !r.ok || fim) {
        if (!fim) { const tk = tokens()[id]; if (tk) A().moverToken3D(id, tk.x, tk.y, true); }
        this.exec = null; this.sug = null; this.desenhar();
        if (r && !r.ok && r.motivo && r.motivo !== 'parede') avisar(r.motivo);
        return;
      }
      setTimeout(passo, 90);
    };
    this.sug.andando = true; this.desenhar();
    passo();
  },
  // a cada pouco: rota some se a vez mudou ou se alguém moveu o Filho à mão; rota já no começo da vez (opção)
  vigiar() {
    const id = this.podeUsar(), vk = this.chaveVez();
    if (this.sug && !this.exec) {
      const tk = tokens()[this.sug.id];
      if (!id || this.sug.id !== id || this.sug.vk !== vk || !tk || Math.hypot(tk.x - this.sug.x0, tk.y - this.sug.y0) > .04) this.sug = null;
    }
    if (id && !this.sug && !this.exec && cfgP('rotaAuto') !== false && this.auto[vk] !== 1) {
      this.auto[vk] = 1; const tk = tokens()[id];
      if (tk && num(tk.m) < .05 && I().Priv && I().Priv.pronto) this.sug = this.calcular(id, 0);
    }
    this.desenhar();
  },
  /* ---------- cartão (por cima do 3D ou no canto do mapa) ---------- */
  desenhar() {
    const id = this.podeUsar();
    let c = $('#psPiloto');
    if (!id) { if (c) c.remove(); this.desenhar2D(); return; }
    if (!c) { c = document.createElement('div'); c.id = 'psPiloto'; c.className = 'ps-piloto'; c.setAttribute('role', 'group'); c.setAttribute('aria-label', 'Piloto automático do Filho'); c.addEventListener('click', e => this.clique(e)); }
    const pai = aberto3D() ? $('#s3d') : ($('.palco-area') || document.body);
    if (pai && c.parentNode !== pai) pai.appendChild(c);
    c.classList.toggle('no3d', aberto3D());
    const tk = tokens()[id], s = this.sug && this.sug.id === id ? this.sug : null, al = s ? this.atual() : null;
    const nome = esc(nomeTk(tk));
    let corpo;
    if (this.exec) corpo = `<p class="ps-p-txt">Andando pela rota…</p>`;
    else if (!s) corpo = `<p class="ps-p-txt">Calcula para onde a criatura iria, pelos sentidos dela.</p><div class="ps-p-bts"><button type="button" class="pri" data-ps="mover">🐾 Mover Filho</button></div>`;
    else if (!al) corpo = `<p class="ps-p-txt">${esc(s.msg)}</p><div class="ps-p-bts"><button type="button" data-ps="mover">↻ Calcular de novo</button><button type="button" data-ps="x" aria-label="Fechar">✕</button></div>`;
    else {
      const resto = al.total - al.m > .05 ? ` · alvo a ${fmtM(al.total)} m` : '';
      corpo = `<p class="ps-p-txt"><b>${esc(al.mot)}</b>${al.cn ? ` em CN ${pad2(al.cn)}` : ''}${al.nome ? ` <span class="ps-p-q">(${esc(al.nome)})</span>` : ''}</p>
        <p class="ps-p-m">anda <b>${fmtM(al.m)}</b> de ${fmtM(s.resta)} m${resto}${s.alvos.length > 1 ? ` · opção ${s.i + 1} de ${s.alvos.length}` : ''}</p>
        <div class="ps-p-bts"><button type="button" class="pri" data-ps="ok">✔ Confirmar rota</button>${s.alvos.length > 1 ? '<button type="button" data-ps="outro">↻ Outro alvo</button>' : ''}<button type="button" data-ps="x" aria-label="Descartar a sugestão">✕</button></div>
        <p class="ps-p-dica">Ou mova à mão: a sugestão some.</p>`;
    }
    const html = `<p class="ps-p-k">🐾 VEZ DE ${nome}</p>${corpo}`;
    if (c.dataset.h !== html) { c.innerHTML = html; c.dataset.h = html; }
    this.desenhar2D();
  },
  clique(e) {
    const b = e.target.closest('[data-ps]'); if (!b) return;
    const k = b.dataset.ps, id = this.podeUsar(); if (!id) return;
    if (document.pointerLockElement) document.exitPointerLock();
    if (k === 'mover') this.mostrar(id);
    else if (k === 'ok') this.confirmar();
    else if (k === 'outro') this.outro();
    else if (k === 'x') { this.auto[this.chaveVez()] = 1; this.limpar(); }
  },
  /* ---------- rota no mapa 2.5D: trechos em div (o palco é 3D: SVG nele não aparece) ---------- */
  desenhar2D() {
    const st = I() && I().stage; if (!st) return;
    let cx = $('#psRota2D', st), rot = $('#psRot2D', st);
    const s = this.sug, al = s && this.atual();
    if (!s || !al || s.a !== I().andarAtual || !souGM()) { if (cx) cx.remove(); if (rot) rot.remove(); return; }
    const T = I().T, sig = s.ts + ':' + s.i;
    if (cx && rot && cx.dataset.sig === sig && cx.parentNode === st && rot.parentNode === st) return;
    if (!cx) { cx = document.createElement('div'); cx.id = 'psRota2D'; cx.className = 'ps-rota2d'; cx.setAttribute('aria-hidden', 'true'); }
    if (cx.parentNode !== st) st.appendChild(cx);
    // os metros, em pé sobre o fim da rota (o mesmo rótulo da prévia de caminho do mapa)
    if (!rot) { rot = document.createElement('div'); rot.id = 'psRot2D'; rot.className = 'previa-rotulo ps-rot2d'; rot.setAttribute('aria-hidden', 'true'); rot.innerHTML = '<span></span>'; }
    if (rot.parentNode !== st) st.appendChild(rot);
    cx.dataset.sig = sig;
    const seg = (a, b, cls) => { const dx = (b.x - a.x) * T, dy = (b.y - a.y) * T, L = Math.hypot(dx, dy); if (L < .5) return ''; return `<i class="${cls}" style="left:${(a.x * T).toFixed(1)}px;top:${(a.y * T).toFixed(1)}px;width:${L.toFixed(1)}px;transform:rotate(${Math.atan2(dy, dx).toFixed(4)}rad)"></i>`; };
    const fim = al.alc[al.alc.length - 1], alvo = al.pts[al.pts.length - 1];
    let h = '';
    // o resto do caminho até o alvo (fraco), depois o alcance desta vez (forte)
    const tot = al.pts.length;
    for (let i = 1; i < tot; i++) h += seg(al.pts[i - 1], al.pts[i], 'ps-r-resto');
    for (let i = 1; i < al.alc.length; i++) h += seg(al.alc[i - 1], al.alc[i], 'ps-r-linha');
    if (Math.hypot(alvo.x - fim.x, alvo.y - fim.y) > .1) h += `<b class="ps-r-alvo" style="left:${(alvo.x * T).toFixed(1)}px;top:${(alvo.y * T).toFixed(1)}px"></b>`;
    h += `<b class="ps-r-fim" style="left:${(fim.x * T).toFixed(1)}px;top:${(fim.y * T).toFixed(1)}px"></b>`;
    cx.innerHTML = h;
    rot.style.left = (fim.x * T) + 'px'; rot.style.top = (fim.y * T) + 'px';
    $('span', rot).textContent = `🐾 ${fmtM(al.m)} m`;
  },
};

/* =========================================================
   2. COMPORTAMENTO VISÍVEL (o grupo do token, nunca as formas)
   Mestre e auxiliares calculam pelas características; a tela do Mestre publica no
   token público o que os jogadores já podem ver (tokens.<id>.cpt: t teto, a água,
   f fareja, o<graus> ouvindo). Atravessando parede é pela posição (todos calculam).
   ========================================================= */
const Comp = {
  ult: {}, cache: new Map(),
  aguaDe: c => mod(c, 'agua18') || sent(c, 'audicao_agua') || !!(c && c.hab && (c.hab.canos || c.hab.alagar)) || (c && c.rastro === 'molhado'),
  calcular(id, tk) {
    const c = cfgTk(tk); if (!c || !tk.a) return {};
    const f = {}, p = salaP(tk), cn = p ? I().cnDe(tk.a, p) : null;
    if (c.ocult === 'teto') f.t = 1;
    else if (this.aguaDe(c) && cn && tagsSala(cn).agua) f.a = 1;
    const cobs = Object.values(tokens()).filter(t => t && tipoDe(t) === 'cobaia' && t.a === tk.a);
    // fareja: sobre um rastro (trilha das cobaias nesta sala ou ferida aqui ou ao lado)
    if (sent(c, 'trilha') && cn) { const lim = (int(c.trilhaMin) || 5) * 60e3, tr = (((I().Priv || {}).dados || {}).filhosEstado || {}).trilha || {}; if (Object.values(tr).some(pts => Object.values(pts || {}).some(v => v && v.cn === cn && agora() - num(v.ts) < lim))) f.f = 1; }
    if (!f.f && (sent(c, 'faro') || sent(c, 'faro_curto')) && p) { const vz = vizinhas(p).concat(p); if (cobs.some(t => machucada(t) && vz.includes(salaP(t)))) f.f = 1; }
    // ouve: vira para o barulho mais forte ao alcance
    if (!f.f && (sent(c, 'audicao') || sent(c, 'audicao_precisa'))) {
      const mu = A().geo.M_POR_UNID; let melhor = null, bv = -1;
      I().gruposDeSala().forEach(gr => {
        if (gr.a !== tk.a) return; const n = I().nivelDe(gr.ids.length + (gr.extra || 0)); if (n < 1) return;
        const pt = gr.p ? centroSala(gr.p) : tokens()[gr.ids[0]]; if (!pt) return;
        const d = Math.hypot(pt.x - tk.x, pt.y - tk.y) * mu; if (d > num(c.alcAud, 36) || d < .8) return;
        const v = n * 10 - d / 4; if (v > bv) { bv = v; melhor = pt; }
      });
      if (melhor) f.o = Math.round(Math.atan2(melhor.x - tk.x, melhor.y - tk.y) * 180 / Math.PI / 15) * 15;
    }
    return f;
  },
  txt(f) { return [f.t ? 't' : '', f.a ? 'a' : '', f.f ? 'f' : '', f.o !== undefined ? 'o' + f.o : ''].filter(Boolean).join(','); },
  ler(s) { const f = {}; String(s || '').split(',').forEach(x => { if (x === 't') f.t = 1; else if (x === 'a') f.a = 1; else if (x === 'f') f.f = 1; else if (/^o-?\d+$/.test(x)) f.o = +x.slice(1); }); return f; },
  // o que ESTE aparelho mostra para o token id
  de(id) {
    if (cfgP('comp') === false) return {};
    const c = this.cache.get(id); if (c && agora() - c.t < 350) return c.f;
    const tk = tokens()[id]; let f = {};
    if (tk) f = souGM() && I().Priv && I().Priv.pronto ? this.calcular(id, tk) : this.ler(tk.cpt);
    this.cache.set(id, { t: agora(), f }); return f;
  },
  // tela do Mestre: publica no token público (só o que os jogadores já veem)
  publicar() {
    if (!souMestre() || I().espiar || !I().Priv.pronto) return;
    const on = cfgP('comp') !== false;
    Object.entries(tokens()).forEach(([id, tk]) => {
      if (!tk || tipoDe(tk) !== 'filho' || (I().ehPrivado && I().ehPrivado(tk)) || (Piloto.exec && Piloto.exec.id === id)) return;
      const quer = on && filhoAVista(tk) ? this.txt(this.calcular(id, tk)) : '';
      const tem = tk.cpt || '';
      if (quer === tem || agora() - (this.ult[id] || 0) < 1500) return;
      this.ult[id] = agora();
      A().definir(['tokens', id, 'cpt'], quer || null);
    });
  },
};

/* =========================================================
   3. ABERTURA DA PERSEGUIÇÃO (só quando o Mestre clica em "Iniciar perseguição")
   ========================================================= */
const Abert = {
  on: null, ate: 0,
  // tela do Mestre: a revelação (rvt) faz o 3D de todos chamar acao('revelar') e tocar o som de revelação
  clicou() {
    setTimeout(() => {
      const p = persg(); if (!souMestre() || !p.on || p.enc || cfgP('abertura') === false) return;
      ordemP().forEach(o => { const tk = tokens()[o.id]; if (tk && filhoAVista(tk) && !(I().ehPrivado && I().ehPrivado(tk))) A().definir(['tokens', o.id, 'rvt'], agora()); });
    }, 60);
  },
  ver() {
    const p = persg(), on = !!p.on;
    if (this.on === null) { this.on = on; return; }
    if (on && !this.on && !p.enc && cfgP('abertura') !== false && agora() - num(p.vts, 0) < 8000) setTimeout(() => this.mostrar(), 260);
    this.on = on;
  },
  // quem vê o Filho (revelado) olha 2 s para ele; depois a câmera volta ao primeiro da iniciativa
  mostrar() {
    const ap = api3(), V = MOM() && MOM().Vista, tks = tokens();
    const fid = ordemP().map(o => o.id).find(id => { const tk = tks[id]; if (!tk || tipoDe(tk) !== 'filho' || !A().visivelPara(tk)) return false; if (!souGM() && !filhoAVista(tk)) return false; return ap ? ap.a === tk.a && ap.quemVe(id) : true; });
    if (!fid) return;
    this.ate = agora() + 2100;
    if (ap && V && V.ap) {
      V.zoom(fid, { dur: 2, fov: .16, borda: .55 });
      setTimeout(() => { if (V.Z && V.Z.alvo === fid) V.Z = null; V.novaVez && V.novaVez(vezId()); }, 2100);
    } else if (!ap && A().focarToken) {
      const tk = tks[fid]; if (!tk || tk.a !== A().andarAtual) return;
      A().focarToken(fid); pulso2D(tk.x, tk.y, 'ps-ab2d');
      setTimeout(() => { const v = vezId(), tv = v && tokens()[v]; if (tv && A().visivelPara(tv) && tv.a === A().andarAtual) A().focarToken(v); }, 2100);
    }
  },
};
function pulso2D(x, y, cls) {
  const st = I() && I().stage; if (!st) return;
  const d = document.createElement('div'); d.className = 'ps-pulso ' + (cls || ''); d.style.left = I().px(x); d.style.top = I().px(y); d.setAttribute('aria-hidden', 'true');
  st.appendChild(d); setTimeout(() => d.remove(), 2600);
}

/* =========================================================
   4. O FILHO PARA NA PORTA (cobaia entra na Zona Neutra durante a perseguição)
   ========================================================= */
const Porta = {
  ant: {}, frio: {}, encarar: new Map(), batidas: [],
  vigiar() {
    const p = persg(), tks = tokens();
    if (!p.on) { this.ant = {}; return; }
    ordemP().forEach(o => {
      const tk = tks[o.id]; if (!tk || tipoDe(tk) !== 'cobaia' || !tk.a) return;
      const pz = salaP(tk), a0 = this.ant[o.id]; this.ant[o.id] = { a: tk.a, p: pz, x: tk.x, y: tk.y };
      if (!a0 || a0.a !== tk.a || a0.p === ZN || pz !== ZN) return;
      if (agora() - (this.frio[o.id] || 0) < 20000) return;
      this.frio[o.id] = agora();
      if (cfgP('porta') !== false) this.bater(o.id, tk, a0);
    });
  },
  // a porta por onde ela entrou: o corredor da Zona Neutra mais perto de onde ela estava
  portaDe(a0) {
    const C = I().CORREDORES; let melhor = null, bd = Infinity;
    C.forEach((k, ci) => {
      if (k.p1 !== ZN && k.p2 !== ZN) return;
      const r = I().retSala(ZN), pt = k.eixo === 'h' ? { x: k.x + (k.x < r.x ? k.w : 0), y: k.y + k.h / 2 } : { x: k.x + k.w / 2, y: k.y + (k.y < r.y ? k.h : 0) };
      const d = Math.hypot(pt.x - a0.x, pt.y - a0.y); if (d < bd) { bd = d; melhor = { ci, ...pt, fora: k.eixo === 'h' ? { x: k.x + k.w / 2, y: pt.y } : { x: pt.x, y: k.y + k.h / 2 } }; }
    });
    return melhor;
  },
  bater(cid, tk, a0) {
    const pt = this.portaDe(a0); if (!pt) return;
    somPorta(tk.a, pt.x, pt.y);
    this.batidas.push({ a: tk.a, x: pt.x, y: pt.y, t0: agora() }); this.batidas = this.batidas.filter(b => agora() - b.t0 < 4000);
    if (!aberto3D() && tk.a === I().andarAtual) pulso2D(pt.x, pt.y, 'ps-porta2d');
    const eu = euJog(); if (eu === cid) { const ap = api3(); if (ap && ap.V) ap.V.tremor = Math.max(ap.V.tremor || 0, .35); if (navigator.vibrate && ls.get('acf-s3d-cfg', {}).vibrar !== false) try { navigator.vibrate(70); } catch (e) {} }
    // a criatura da perseguição mais perto da porta para e encara o batente (só animação; a posição não muda)
    const mu = A().geo.M_POR_UNID, tks = tokens();
    ordemP().forEach(o => {
      const f = tks[o.id]; if (!f || tipoDe(f) !== 'filho' || f.a !== tk.a) return;
      const d = Math.hypot(f.x - pt.x, f.y - pt.y) * mu; if (d > 16) return;
      this.encarar.set(o.id, { x: pt.x, y: pt.y, t0: agora() });
    });
    if (souMestre()) A().diario && A().diario('persg', `${nomeTk(tk)} entrou na Zona Neutra: a porta bateu`);
  },
};
// porta batendo: pancada grave, estalo de metal e o eco curto (gerado na hora, com posição)
function somPorta(a, x, y) {
  const Au = MOM() && MOM().Aud; if (!Au) return;
  Au.preparar(); if (!Au.ok()) return;
  const mu = A().geo.M_POR_UNID, ap = api3(); let X, Z;
  if (ap && ap.a === a) { const c = ap.camera, f = new ap.T.Vector3(); c.getWorldDirection(f); Au.ouvinte(c.position.x, c.position.y, c.position.z, f.x, f.z); [X, Z] = ap.planta3D(x, y); }
  else {
    const eu = A().meu || A().aux, tk = eu && tokens()[eu];
    const o = tk && tk.a === a ? tk : souGM() && I().andarAtual === a ? { x, y: y + 3 } : null; if (!o) return;
    if (Math.hypot(o.x - x, o.y - y) * mu > 30) return;
    Au.ouvinte(o.x * mu, 1.6, o.y * mu, 0, -1); X = x * mu; Z = y * mu;
  }
  const c = Au.ctx, t = c.currentTime, p = Au.panner(X, 1.4, Z, 2.2);
  Au.tom(t, p, { f: 92, f2: 38, v: .9, ataque: .004, dur: .55 });
  Au.ruido(t, p, { tipo: 'lowpass', bp: 420, v: .8, ataque: .003, dur: .32 });
  Au.ruido(t + .01, p, { bp: 1900, q: 4, v: .25, ataque: .002, dur: .22 });
  Au.tom(t + .02, p, { tipo: 'square', f: 310, f2: 240, v: .05, ataque: .002, dur: .3 });
  Au.ruido(t + .2, p, { tipo: 'lowpass', bp: 260, v: .22, ataque: .02, dur: .7 });
  setTimeout(() => { try { p.disconnect(); } catch (e) {} }, 2500);
  if (MOM().Aud && window.ACF_SONS && window.ACF_SONS.legendas) legendaPorta();
}
function legendaPorta() {
  let l = $('#psLeg'); if (!l) { l = document.createElement('div'); l.id = 'psLeg'; l.className = 'ps-leg'; l.setAttribute('aria-live', 'polite'); document.body.appendChild(l); }
  l.textContent = '[uma porta bate com força]'; l.classList.add('on'); clearTimeout(l._t); l._t = setTimeout(() => l.classList.remove('on'), 2600);
}

/* =========================================================
   5. REPLAY DA PERSEGUIÇÃO (só a tela do Mestre grava)
   segredos/_replays/<k> = { ts, d, a, j (texto) }; "Mostrar a todos": mapa/replay = { id, ts, j }
   ========================================================= */
const Rep = {
  rec: null, on: null, fxVisto: {},
  gravar() {
    if (!souMestre() || I().espiar) { this.rec = null; return; }
    const p = persg(), on = !!p.on, tks = tokens(), t = agora();
    if (this.on === null) { this.on = on; if (on) this.novo(p); return; }
    if (on && !this.on) this.novo(p);
    if (!on && this.on && this.rec) this.terminar();
    this.on = on;
    if (!on || !this.rec) return;
    const R = this.rec;
    R.rod = Math.max(R.rod, p.rod || 1);
    const vz = vezId(); if (vz && (!R.vz.length || R.vz[R.vz.length - 1][1] !== vz)) R.vz.push([t, vz, p.rod || 1]);
    ordemP().forEach(o => {
      const tk = tks[o.id]; if (!tk || !tk.a) return;
      const s = SERd(tk.s) || {}, f = s.tipo === 'filho';
      const tr = R.tr[o.id] || (R.tr[o.id] = { n: nomeTk(tk), c: s.contorno && s.cor === '#111111' ? s.contorno : s.cor || '#999', f: f ? 1 : 0, img: s.img || '', p: [] });
      const v = f ? (filhoAVista(tk) ? 1 : 0) : (tk.h ? 0 : 1), ult = tr.p[tr.p.length - 1];
      if (tk.a !== R.a) return;
      if (!ult || Math.hypot(tk.x - ult[1], tk.y - ult[2]) > .06 || ult[3] !== v) tr.p.push([t, +tk.x.toFixed(2), +tk.y.toFixed(2), v]);
      // ataque (o mesmo sinal que o 3D usa para animar)
      const fx = tk.fx; if (fx && fx.t === 'atk' && num(fx.ts) >= R.ts0 && this.fxVisto[o.id] !== fx.ts) { this.fxVisto[o.id] = fx.ts; R.mk.push([num(fx.ts), +tk.x.toFixed(2), +tk.y.toFixed(2), v]); }
    });
    // garras gravadas pelo imersao.js (mapa/marcas, t = g)
    Object.entries(est().marcas || {}).forEach(([k, m]) => { if (m && m.t === 'g' && m.a === R.a && num(m.ts) >= R.ts0 && !R.mkv[k]) { R.mkv[k] = 1; if (!R.mk.some(x => Math.abs(x[0] - m.ts) < 1500)) R.mk.push([num(m.ts), m.x, m.y, 1]); } });
  },
  novo(p) {
    const tks = tokens(), vz = vezId(), tv = vz && tks[vz];
    const a = (tv && tv.a) || (ordemP().map(o => tks[o.id]).find(t => t && t.a) || {}).a || I().andarAtual;
    this.rec = { ts0: agora(), a, tr: {}, mk: [], mkv: {}, vz: [], rod: p.rod || 1 };
  },
  terminar() {
    const R = this.rec; this.rec = null; if (!R) return;
    const fim = agora(), mov = Object.values(R.tr).reduce((s, t) => s + Math.max(0, t.p.length - 1), 0);
    if (mov < 2) return;
    const dados = { v: 1, ts0: R.ts0, ts1: fim, a: R.a, rod: R.rod, tr: R.tr, mk: R.mk, vz: R.vz };
    const k = 'r' + R.ts0.toString(36);
    if (A().gravarSegredo) {
      A().gravarSegredo(['_replays', k], { ts: R.ts0, d: fim - R.ts0, a: R.a, rod: R.rod, n: Object.values(R.tr).filter(t => !t.f).map(t => t.n).join(', ').slice(0, 160), atk: R.mk.length, j: JSON.stringify(dados) });
      const todos = Object.entries((A().segredos || {})._replays || {}).sort((u, v) => num(v[1].ts) - num(u[1].ts));
      todos.slice(8).forEach(([kk]) => A().gravarSegredo(['_replays', kk], null));
    }
    this.ultimo = { k, dados };
    if (cfgP('replay') !== false) setTimeout(() => Tela.abrir(dados, { k, mestre: true }), 900);
  },
  lista() { return Object.entries((A().segredos || {})._replays || {}).filter(([, r]) => r && r.j).sort((u, v) => num(v[1].ts) - num(u[1].ts)); },
  dadosDe(k) { const r = ((A().segredos || {})._replays || {})[k]; if (!r) return this.ultimo && this.ultimo.k === k ? this.ultimo.dados : null; try { return JSON.parse(r.j); } catch (e) { return null; } },
  // para os jogadores: sem Filho oculto (os trechos em que ele estava escondido somem), sem retrato de quem não se vê
  publico(d) {
    const tr = {};
    Object.entries(d.tr || {}).forEach(([id, t]) => {
      if (t.f) { const vis = t.p.filter(q => q[3]); if (!vis.length) return; tr[id] = { n: 'criatura', c: t.c, f: 1, img: '', p: t.p.map(q => q[3] ? q : [q[0], null, null, 0]) }; }
      else tr[id] = { ...t, p: t.p.filter(q => q[3]) };
    });
    const vz = (d.vz || []).map(([t, id, r]) => [t, tr[id] ? id : '?', r]);
    return { ...d, tr, mk: (d.mk || []).filter(m => m[3]), vz };
  },
  mostrarATodos(k) {
    const d = this.dadosDe(k); if (!d || !souMestre()) return;
    let j = JSON.stringify(this.publico(d));
    if (j.length > 60000) { const p = this.publico(d); Object.values(p.tr).forEach(t => { if (t.p.length > 140) { const s = Math.ceil(t.p.length / 140); t.p = t.p.filter((q, i) => i % s === 0 || i === t.p.length - 1); } }); j = JSON.stringify(p); }
    A().definir(['replay'], { id: k + '-' + agora().toString(36), ts: agora(), j: j.slice(0, 60000) });
    A().aviso('🎞 Replay enviado à tela de todos.');
    clearTimeout(this.tLimpa); this.tLimpa = setTimeout(() => { if (souMestre() && est().replay) A().definir(['replay'], null); }, 5 * 60000);
  },
  apagar(k) { if (souMestre() && confirm('Apagar este replay?')) A().gravarSegredo(['_replays', k], null); },
  // jogadores (e auxiliares): o Mestre mandou mostrar
  visto: undefined,
  ver() {
    const r = est().replay;
    if (this.visto === undefined) { this.visto = r ? r.id : null; return; }
    if (!r || !r.id || r.id === this.visto) return;
    this.visto = r.id;
    if (souMestre() || agora() - num(r.ts) > 120000) return;
    let d = null; try { d = JSON.parse(r.j); } catch (e) {}
    if (d) Tela.abrir(d, {});
  },
  // resumo da sessão (imersao.js): as perseguições gravadas, sem citar Filhos nem salas
  resumo(ini, fim) {
    const ls2 = this.lista().filter(([, r]) => num(r.ts) >= ini && num(r.ts) <= fim + 60000).reverse();
    if (!ls2.length) return null;
    const L = [`🎞 Replays de perseguição (${ls2.length}, em Momentos marcantes):`];
    ls2.forEach(([, r], i) => { const s = Math.round(num(r.d) / 1000); L.push(`   ${i + 1}. ${hora(r.ts)} · ${Math.floor(s / 60)}:${pad2(s % 60)} · ${int(r.rod) || 1} rodada${int(r.rod) > 1 ? 's' : ''}${r.n ? ' · ' + r.n : ''}${int(r.atk) ? ` · ${int(r.atk)} ataque${int(r.atk) > 1 ? 's' : ''}` : ''}`); });
    return L;
  },
  // bloco "Momentos marcantes" (aba Mesa): a lista dos replays
  desenharBloco() {
    const b = $('#blocoMesaMom'); if (!b) return;
    let c = $('#psReplays', b);
    if (!souMestre()) { if (c) c.remove(); return; }
    if (!c) { c = document.createElement('div'); c.id = 'psReplays'; c.className = 'ps-replays'; b.appendChild(c); c.addEventListener('click', e => { const x = e.target.closest('[data-psr]'); if (!x) return; const k = x.dataset.k; if (x.dataset.psr === 'ver') { const d = this.dadosDe(k); if (d) Tela.abrir(d, { k, mestre: true }); } else if (x.dataset.psr === 'todos') this.mostrarATodos(k); else if (x.dataset.psr === 'apagar') this.apagar(k); }); }
    const L = this.lista();
    const html = `<h3>🎞 Replays de perseguição</h3>${L.length ? `<ul class="ps-rl">${L.map(([k, r]) => { const s = Math.round(num(r.d) / 1000); return `<li><span class="ps-rl-t"><b>${data(r.ts)} ${hora(r.ts)}</b> · ${Math.floor(s / 60)}:${pad2(s % 60)} · ${int(r.rod) || 1} rod.${int(r.atk) ? ` · ⚔ ${int(r.atk)}` : ''}<small>${esc(r.n || '')}</small></span><span class="ps-rl-b"><button type="button" data-psr="ver" data-k="${k}" aria-label="Ver o replay">▶</button><button type="button" data-psr="todos" data-k="${k}" title="Mostrar a todos">📣</button><button type="button" data-psr="apagar" data-k="${k}" aria-label="Apagar">🗑</button></span></li>`; }).join('')}</ul>` : '<p class="mini">Nenhum ainda. No fim de cada perseguição, a tela do Mestre guarda um replay de uns 20 s, visto de cima (os 8 últimos).</p>'}`;
    if (c.dataset.h !== html) { c.innerHTML = html; c.dataset.h = html; }
  },
};
const data = ts => { const d = new Date(num(ts)); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`; };
const hora = ts => { const d = new Date(num(ts)); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };

/* ---------- a tela do replay: o andar visto de cima, os caminhos de todos e as marcas de ataque ---------- */
const Tela = {
  raf: 0, d: null,
  abrir(d, op) {
    this.fechar();
    const m = document.createElement('div'); m.id = 'psReplay'; m.className = 'ps-replay'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Replay da perseguição');
    const g = A().geo, T = 10, a = d.a || 1;
    // enquadra onde a perseguição aconteceu (com uma sala de folga), não o andar inteiro
    const xs = [], ys = []; Object.values(d.tr || {}).forEach(t => t.p.forEach(q => { if (q[1] !== null) { xs.push(q[1]); ys.push(q[2]); } })); (d.mk || []).forEach(m => { xs.push(m[1]); ys.push(m[2]); });
    let x0 = 0, y0 = 0, x1 = g.W, y1 = g.H;
    if (xs.length) { x0 = Math.min(...xs) - 5; x1 = Math.max(...xs) + 5; y0 = Math.min(...ys) - 4; y1 = Math.max(...ys) + 4; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, lw = Math.max(x1 - x0, 19), lh = Math.max(y1 - y0, 13); x0 = clamp(cx - lw / 2, 0, g.W); x1 = clamp(cx + lw / 2, 0, g.W); y0 = clamp(cy - lh / 2, 0, g.H); y1 = clamp(cy + lh / 2, 0, g.H); }
    const vb = `${(x0 * T).toFixed(0)} ${(y0 * T).toFixed(0)} ${((x1 - x0) * T).toFixed(0)} ${((y1 - y0) * T).toFixed(0)}`;
    const salas = []; for (let p = 1; p <= 25; p++) { const r = g.retSala(p), cn = 25 * (a - 1) + p, vis = souGM() || A().salaRevelada(cn); salas.push(`<rect class="ps-rs${p === ZN ? ' zn' : ''}" x="${r.x * T}" y="${r.y * T}" width="${r.w * T}" height="${r.h * T}" rx="3"/>${vis ? `<text class="ps-rt" x="${(r.x + .35) * T}" y="${(r.y + .9) * T}">${p === ZN ? 'ZN' : 'CN ' + pad2(cn)}</text>` : ''}`); }
    const corr = g.CORREDORES.map(k => `<rect class="ps-rc" x="${k.x * T}" y="${k.y * T}" width="${k.w * T}" height="${k.h * T}"/>`).join('');
    // linha do tempo comprimida: só os instantes em que alguém andou (as pausas da mesa somem)
    const tempos = [...new Set(Object.values(d.tr || {}).flatMap(t => t.p.map(q => q[0])).concat((d.mk || []).map(x => x[0])))].sort((u, v) => u - v);
    const ids = Object.keys(d.tr || {});
    const caixa = ids.map(id => { const t = d.tr[id]; return `<g class="ps-tk${t.f ? ' filho' : ''}" data-id="${esc(id)}" style="--c:${esc(t.c || '#999')}"><polyline class="ps-tl" points=""/><g class="ps-th" transform="translate(-99,-99)"><circle r="${T * .42}"/><text y="${T * .15}">${esc(t.f ? '!' : (t.n || '?').slice(0, 1))}</text><text class="ps-tn" y="${-T * .62}">${esc(t.n || '')}</text></g></g>`; }).join('');
    const mk = (d.mk || []).map((x, i) => `<g class="ps-mk" data-i="${i}" transform="translate(${x[1] * T},${x[2] * T})"><path d="M-5,-6 L3,5 M-1,-7 L6,3 M3,-7 L9,1"/></g>`).join('');
    const s = Math.round((num(d.ts1) - num(d.ts0)) / 1000);
    m.innerHTML = `<div class="ps-rp-caixa"><header class="ps-rp-cab"><b>🎞 REPLAY · PERSEGUIÇÃO</b><span>${int(d.rod) || 1} rodada${int(d.rod) > 1 ? 's' : ''} · ${Math.floor(s / 60)}:${pad2(s % 60)} na mesa</span><button type="button" class="ps-rp-x" data-psrp="x" aria-label="Fechar">✕</button></header>
      <p class="ps-rp-vez" aria-live="polite"></p>
      <svg class="ps-rp-svg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet"><g>${corr}${salas.join('')}</g><g class="ps-rp-mks">${mk}</g><g>${caixa}</g></svg>
      <div class="ps-rp-barra"><i></i></div>
      <div class="ps-rp-bts"><button type="button" data-psrp="rever">⟲ Rever</button>${op.mestre && souMestre() && op.k ? `<button type="button" data-psrp="todos" class="pri">📣 Mostrar a todos</button>` : ''}<button type="button" data-psrp="x">Fechar</button></div></div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { const b = e.target.closest('[data-psrp]'); if (!b) { if (e.target === m) this.fechar(); return; } const k = b.dataset.psrp; if (k === 'x') this.fechar(); else if (k === 'rever') this.tocar(); else if (k === 'todos') Rep.mostrarATodos(op.k); });
    this.esc = e => { if (e.key === 'Escape') { e.stopPropagation(); this.fechar(); } }; document.addEventListener('keydown', this.esc, true);
    if (document.pointerLockElement) document.exitPointerLock();
    this.d = d; this.m = m; this.tempos = tempos; this.T = T;
    // posições de cada um em cada instante (null = sem ponto / escondido)
    this.pos = {}; ids.forEach(id => { const P = d.tr[id].p; let j = -1; this.pos[id] = tempos.map(tm => { while (j + 1 < P.length && P[j + 1][0] <= tm) j++; return j >= 0 && P[j][1] !== null ? [P[j][1], P[j][2]] : null; }); });
    this.mkI = (d.mk || []).map(x => tempos.findIndex(tm => tm >= x[0]));
    this.tocar();
  },
  tocar() {
    cancelAnimationFrame(this.raf);
    const n = this.tempos.length; if (!n || !this.m) return;
    const dur = clamp(n * 220, 8000, 20000), t0 = performance.now();
    const vzTxt = i => { const tm = this.tempos[i], v = (this.d.vz || []).filter(x => x[0] <= tm).pop(); if (!v) return ''; const t = this.d.tr[v[1]]; return `Rodada ${v[2]} · vez de ${t ? t.n : '???'}`; };
    let vAnt = '';
    const quadro = () => {
      if (!this.m) return;
      const k = clamp((performance.now() - t0) / dur, 0, 1), fi = k * (n - 1), i = Math.floor(fi), fr = fi - i;
      Object.entries(this.pos).forEach(([id, P]) => {
        const g = $(`.ps-tk[data-id="${CSS.escape(id)}"]`, this.m); if (!g) return;
        const pts = []; let partes = [], cur = [];
        for (let q = 0; q <= i; q++) { if (P[q]) cur.push(P[q]); else if (cur.length) { partes.push(cur); cur = []; } }
        let cab = P[i]; if (cab && P[i + 1]) cab = [cab[0] + (P[i + 1][0] - cab[0]) * fr, cab[1] + (P[i + 1][1] - cab[1]) * fr];
        if (cab) cur.push(cab); if (cur.length) partes.push(cur);
        partes.forEach(pp => pts.push(pp.map(p => (p[0] * this.T).toFixed(1) + ',' + (p[1] * this.T).toFixed(1)).join(' ')));
        $('.ps-tl', g).setAttribute('points', pts.length ? pts[pts.length - 1] : '');
        // trechos anteriores (quando ele sumiu e voltou) ficam como linhas a mais
        $$('.ps-tl2', g).forEach(x => x.remove());
        pts.slice(0, -1).forEach(s => { const l = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); l.setAttribute('class', 'ps-tl ps-tl2'); l.setAttribute('points', s); g.insertBefore(l, g.firstChild); });
        const h = $('.ps-th', g);
        if (cab) { h.setAttribute('transform', `translate(${(cab[0] * this.T).toFixed(1)},${(cab[1] * this.T).toFixed(1)})`); h.style.opacity = 1; } else h.style.opacity = 0;
      });
      $$('.ps-mk', this.m).forEach(x => { x.classList.toggle('on', this.mkI[+x.dataset.i] >= 0 && this.mkI[+x.dataset.i] <= i); });
      const vt = vzTxt(i); if (vt !== vAnt) { vAnt = vt; const e = $('.ps-rp-vez', this.m); if (e) e.textContent = vt; }
      const b = $('.ps-rp-barra i', this.m); if (b) b.style.width = (k * 100).toFixed(1) + '%';
      if (k < 1) this.raf = requestAnimationFrame(quadro);
    };
    quadro();
  },
  fechar() { cancelAnimationFrame(this.raf); if (this.m) this.m.remove(); this.m = null; if (this.esc) document.removeEventListener('keydown', this.esc, true); this.esc = null; },
};

/* =========================================================
   6. LINHA DE INICIATIVA NO TOPO DO 3D (no lugar da faixa da perseguição)
   ========================================================= */
const Linha = {
  html: '',
  desenhar(ap) {
    const d = ap && ap.V && ap.V.d; if (!d) return;
    const p = persg(), on = !!p.on && cfgP('linha') !== false;
    d.classList.toggle('ps-linha', on);
    let l = $('#psLinha', d);
    if (!on) { if (l) l.remove(); this.html = ''; return; }
    if (!l) { l = document.createElement('div'); l.id = 'psLinha'; l.className = 'ps-linha-ini'; l.setAttribute('aria-label', 'Ordem da perseguição'); const fx = $('.s3d-faixas', d) || d; fx.insertBefore(l, fx.firstChild); }
    const o = ordemP(), vz = p.vez || 0, tks = tokens(), estreito = innerWidth < 560, max = estreito ? 4 : 7;
    const V = ap.V, ctrl = V.ctrl, minha = !!ctrl && vezId() === ctrl;
    const itens = [];
    for (let k = 0; k < Math.min(o.length, max); k++) {
      const oz = o[(vz + k) % o.length], tk = tks[oz.id], s = tk && SERd(tk.s), vis = !!tk && A().visivelPara(tk);
      const nome = vis ? nomeTk(tk) : '???', cor = vis && s ? (s.cor === '#111111' && s.contorno ? s.contorno : s.cor) : '#5a4d70';
      const img = vis && s && s.img && !(s.tipo === 'filho' && tk.cp) ? s.img : '';
      itens.push(`<li class="${k === 0 ? 'vez' : ''}${vis ? '' : ' oculto'}" style="--c:${esc(cor)}" title="${esc(nome)}"><span class="ps-li-r"${img ? ` style="background-image:url('${esc(img)}')"` : ''}>${img ? '' : esc(vis ? nome.replace(/^F-\S+\s*/, '').slice(0, 1) : '?')}</span>${k === 0 ? `<b>${esc(nome)}</b>` : ''}</li>`);
    }
    const tkc = ctrl && tks[ctrl], lim = ctrl ? A().limiteDe(ctrl) : null, part = !!ctrl && A().participa(ctrl);
    const rodape = part ? (minha ? `<span class="ps-li-sua">Sua vez: ${fmtM((tkc && tkc.m) || 0)} / ${lim || '?'} m</span>` : '<span class="ps-li-esp">aguarde a sua vez</span>') : '';
    // o relógio da vez (o mesmo do momento.js, que some enquanto a linha aparece)
    const limT = num((est().cfg || {}).tempoVez), dec = (agora() - num(p.vts, agora())) / 1000, sT = limT ? Math.max(0, Math.ceil(limT - dec)) : Math.floor(dec);
    const rel = `<span class="ps-li-t${limT && sT <= 10 ? ' acabando' : ''}">⏱ ${limT ? sT + ' s' : Math.floor(sT / 60) + ':' + pad2(sT % 60)}</span>`;
    const html = `<span class="ps-li-k">PERSEGUIÇÃO · R${p.rod || 1}</span><ol>${itens.join('<i class="ps-li-seta" aria-hidden="true">›</i>')}${o.length > max ? `<li class="mais">+${o.length - max}</li>` : ''}</ol>${rel}${rodape}`;
    if (html !== this.html) { l.innerHTML = html; this.html = html; }
    l.classList.toggle('minha', minha);
  },
};

/* =========================================================
   VISTA 3D (extensão do sala3d.js): rota no chão, comportamento, linha de iniciativa
   ========================================================= */
const Vista = {
  ap: null,
  iniciar(ap) {
    this.ap = ap; this.st = new Map(); this.desc = []; this.rota = null; this.tLinha = 0;
    const T = ap.T;
    this.grupo = new T.Group(); this.grupo.name = 'ps-perseg'; ap.cena.add(this.grupo);
    this.matRota = new T.MeshBasicMaterial({ color: '#ff5a2e', transparent: true, opacity: .95, depthWrite: false, depthTest: false, toneMapped: false, side: T.DoubleSide });
    this.matResto = new T.MeshBasicMaterial({ color: '#ff8a5e', transparent: true, opacity: .32, depthWrite: false, depthTest: false, toneMapped: false, side: T.DoubleSide });
    this.matAlvo = new T.MeshBasicMaterial({ color: '#ff3b4e', transparent: true, opacity: .85, depthWrite: false, depthTest: false, toneMapped: false, side: T.DoubleSide });
    this.matOnda = new T.MeshBasicMaterial({ color: '#9fc8d8', transparent: true, opacity: .5, depthWrite: false, toneMapped: false, side: T.DoubleSide });
    this.geoOnda = new T.RingGeometry(.35, .42, 32);
    this.matSombra = new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: .55, depthWrite: false, depthTest: false, toneMapped: false, side: T.DoubleSide });
    this.desc.push(this.matRota, this.matResto, this.matAlvo, this.matOnda, this.geoOnda, this.matSombra);
  },
  fechar() {
    const ap = this.ap; if (!ap) return;
    // devolve os materiais originais dos tokens que ficaram translúcidos
    if (this.st) this.st.forEach((s, id) => { const o = ap.tok.mapa.get(id); if (o) { this.opacidade(o, s, 1, true); o.t.g.position.y = 0; o.t.g.rotation.x = 0; o.t.g.rotation.z = 0; } });
    this.limparRota();
    if (this.poeira) { this.poeira.forEach(m => { try { m.geometry.dispose(); m.material.dispose(); } catch (e) {} }); this.poeira = null; }
    try { ap.cena.remove(this.grupo); } catch (e) {}
    this.desc.forEach(x => { try { x.dispose(); } catch (e) {} });
    this.st = new Map(); this.desc = [];   // o estado por token guardava as malhas: sem isso a cena ficava presa depois de fechar
    const l = $('#psLinha'); if (l) l.remove();
    if (ap.V && ap.V.d) ap.V.d.classList.remove('ps-linha');
    this.ap = null;
  },
  quadro(dt, t) {
    const ap = this.ap; if (!ap || !ap.V) return;
    this.rotaTick(t);
    this.compTick(dt, t);
    this.portaTick();
    this.tLinha -= dt; if (this.tLinha <= 0) { this.tLinha = .3; Linha.desenhar(ap); }
  },
  /* ---------- rota sugerida: fita no chão, metros no fim e o alvo pulsando ---------- */
  limparRota() { const R = this.rota; if (!R) return; this.grupo.remove(R.g); R.desc.forEach(x => { try { x.dispose(); } catch (e) {} }); this.rota = null; },
  rotaTick(t) {
    const ap = this.ap, s = Piloto.sug, al = s && Piloto.atual();
    const sig = s && al && s.a === ap.a ? s.ts + ':' + s.i : '';
    if (!sig) { this.limparRota(); return; }
    if (!this.rota || this.rota.sig !== sig) { this.limparRota(); this.rota = this.montarRota(al, sig); }
    const R = this.rota; if (!R) return;
    this.matRota.opacity = .75 + Math.sin(t * 5) * .2;
    if (R.alvo) { const k = 1 + (t * .9 % 1) * .6; R.alvo.scale.set(k, k, 1); this.matAlvo.opacity = .9 * (1 - (t * .9 % 1)); }
  },
  fita(pts3, mat, larg, y) {
    const T = this.ap.T, n = pts3.length; if (n < 2) return null;
    const pos = new Float32Array(n * 6), idx = [];
    for (let i = 0; i < n; i++) {
      const a = pts3[Math.max(0, i - 1)], b = pts3[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L * larg, nz = dx / L * larg;
      pos.set([pts3[i][0] + nx, y, pts3[i][1] + nz, pts3[i][0] - nx, y, pts3[i][1] - nz], i * 6);
      if (i < n - 1) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setIndex(idx);
    const m = new T.Mesh(g, mat); m.renderOrder = 6; m.raycast = () => {}; m.frustumCulled = false;
    return m;
  },
  // pontos da planta a cada 10 cm, levados ao 3D (os corredores do 3D têm outra escala)
  denso(pts) {
    const ap = this.ap, out = [];
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / .1)); for (let k = i === 1 ? 0 : 1; k <= n; k++) out.push(ap.planta3D(a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n)); }
    return out;
  },
  montarRota(al, sig) {
    const ap = this.ap, T = ap.T, g = new T.Group(), desc = [];
    const a3 = this.denso(al.alc), p3 = this.denso(al.pts);
    const resto = this.fita(p3, this.matResto, .07, .05); if (resto) { g.add(resto); desc.push(resto.geometry); }
    const somb = this.fita(a3, this.matSombra, .24, .055); if (somb) { somb.renderOrder = 5; g.add(somb); desc.push(somb.geometry); }
    const linha = this.fita(a3, this.matRota, .15, .06); if (linha) { g.add(linha); desc.push(linha.geometry); }
    // setinhas ao longo da rota (para onde ele vai)
    for (let i = 14; i < a3.length - 6; i += 22) {
      const a = a3[i - 2], b = a3[i + 2], ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
      const sh = new T.Shape(); sh.moveTo(0, .22); sh.lineTo(.16, -.06); sh.lineTo(0, .02); sh.lineTo(-.16, -.06); sh.closePath();
      // o Shape fica em XY com a ponta em +Y; girado em Z e deitado no chão (−90° em X), a ponta vai para (sen ang, cos ang)
      const gm = new T.ShapeGeometry(sh), m = new T.Mesh(gm, this.matRota); m.rotation.set(-Math.PI / 2, 0, ang + Math.PI); m.position.set(a3[i][0], .07, a3[i][1]);
      m.renderOrder = 7; m.raycast = () => {}; g.add(m); desc.push(gm);
    }
    // fim do alcance: disco e os metros
    const fim = a3[a3.length - 1];
    const disco = new T.Mesh(new T.CircleGeometry(.32, 28), this.matRota); disco.rotation.x = -Math.PI / 2; disco.position.set(fim[0], .065, fim[1]); disco.renderOrder = 7; disco.raycast = () => {}; g.add(disco); desc.push(disco.geometry);
    const [cv, x] = window.ACF3D.tela(256, 96); x.clearRect(0, 0, 256, 96);
    x.fillStyle = 'rgba(20,12,4,.88)'; x.beginPath(); x.roundRect ? x.roundRect(8, 10, 240, 76, 38) : x.rect(8, 10, 240, 76); x.fill(); x.strokeStyle = '#ff5a2e'; x.lineWidth = 5; x.stroke();
    x.fillStyle = '#ffe2a8'; x.font = 'bold 44px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(fmtM(al.m) + ' m', 128, 50);
    const tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; const sm = new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false });
    const sp = new T.Sprite(sm); sp.scale.set(1.3, .49, 1); sp.position.set(fim[0], 1.1, fim[1]); sp.renderOrder = 9; g.add(sp); desc.push(tex, sm);
    // alvo (barulho, cobaia ou rastro) quando a rota não chega até ele
    let alvo = null; const lp = p3[p3.length - 1];
    if (Math.hypot(lp[0] - fim[0], lp[1] - fim[1]) > .5) { alvo = new T.Mesh(new T.RingGeometry(.35, .5, 32), this.matAlvo); alvo.rotation.x = -Math.PI / 2; alvo.position.set(lp[0], .07, lp[1]); alvo.renderOrder = 7; alvo.raycast = () => {}; g.add(alvo); desc.push(alvo.geometry); }
    this.grupo.add(g);
    return { g, sig, desc, alvo };
  },
  /* ---------- a porta da Zona Neutra batendo: um sopro de poeira no chão, no batente ---------- */
  portaTick() {
    const ap = this.ap, T = ap.T, vivas = new Set();
    Porta.batidas.forEach(b => {
      if (b.a !== ap.a) return; const k = b.t0; vivas.add(k);
      const e = (agora() - b.t0) / 1000; if (e > 2.2) return;
      this.poeira = this.poeira || new Map();
      let m = this.poeira.get(k);
      if (!m) { m = new T.Mesh(new T.RingGeometry(.2, .55, 36), new T.MeshBasicMaterial({ color: '#e9e2d4', transparent: true, opacity: .7, depthWrite: false, toneMapped: false, side: T.DoubleSide })); m.rotation.x = -Math.PI / 2; const [X, Z] = ap.planta3D(b.x, b.y); m.position.set(X, .04, Z); m.raycast = () => {}; m.renderOrder = 4; this.grupo.add(m); this.poeira.set(k, m); }
      const q = Math.min(1, e / 2.2); m.scale.set(1 + q * 4.5, 1 + q * 4.5, 1); m.material.opacity = .7 * (1 - q);
    });
    if (this.poeira) this.poeira.forEach((m, k) => { if (!vivas.has(k) || (agora() - k) / 1000 > 2.2) { this.grupo.remove(m); m.geometry.dispose(); m.material.dispose(); this.poeira.delete(k); } });
  },
  /* ---------- comportamento visível: só no grupo do token ---------- */
  compTick(dt, t) {
    const ap = this.ap, tks = tokens(), k = 1 - Math.exp(-dt * 2.6), vivos = new Set();
    ap.tok.mapa.forEach((o, id) => {
      if (!o.filho) return;
      vivos.add(id);
      const g = o.t.g, tk = tks[id] || {};
      let s = this.st.get(id); if (!s || s.g !== g) { s = { g, y: 0, roll: 0, tilt: 0, op: 1, yaw: null, onda: null }; this.st.set(id, s); g.rotation.order = 'YXZ'; }
      const f = Comp.de(id);
      const dentro = ap.mundo.area3D(o.x, o.z, .02), ceu = ap.salaNoPonto3D(o.x, o.z) ? ap.ALT : 2.7, alt = o.t.alt || 1.6;
      const anda = o.andando > 0;
      // O Filho para na porta: encara o batente (3 s) e vira as costas (1,6 s)
      const enc = Porta.encarar.get(id); let yawT = null, tiltT = 0;
      if (enc) {
        const dtE = (agora() - enc.t0) / 1000;
        if (dtE > 4.8) Porta.encarar.delete(id);
        else { const [px, pz] = ap.planta3D(enc.x, enc.y), ang = Math.atan2(px - o.x, pz - o.z); yawT = dtE < 3.1 ? ang : ang + Math.PI; tiltT = dtE < 3.1 ? .14 : 0; }
      }
      if (yawT === null && f.o !== undefined && !anda) yawT = f.o * Math.PI / 180;
      if (f.f) tiltT = anda ? .24 : .44 + Math.sin(t * 9) * .05;
      const yT = f.t ? ceu : f.a ? -alt * .96 : 0, rollT = f.t ? Math.PI : 0;
      // na água afunda devagar (uns 3 s) e some conforme a água cobre
      s.y += (yT - s.y) * (f.a || s.y < -.05 ? k * .55 : k); s.roll += (rollT - s.roll) * k; s.tilt += (tiltT - s.tilt) * Math.min(1, k * 2);
      const opT = s.y < -.05 ? clamp(1 + s.y / alt * 1.15, 0, 1) : !dentro ? .3 : 1;
      s.op += (opT - s.op) * Math.min(1, k * (opT < s.op ? 2.2 : 1.4));
      if (Math.abs(s.y) > .001) g.position.y = s.y;
      g.rotation.z = s.roll; g.rotation.x = s.tilt + (f.o !== undefined && !anda && !f.t ? Math.sin(t * .7) * .03 : 0);
      if (yawT !== null) { const cur = s.yaw === null ? g.rotation.y : s.yaw; let d = yawT - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; s.yaw = cur + d * Math.min(1, k * 1.4); g.rotation.y = s.yaw; }
      else s.yaw = null;
      // a base (o disco da miniatura) e a sombra redonda ficam no chão: não inclinam e somem no teto
      const noTeto = s.roll > 1.2, base = o.t.base, sb = g.userData.momSombra;
      if (base) { base.rotation.x = -g.rotation.x; if (base.visible === noTeto) base.visible = !noTeto; }
      if (sb) { sb.rotation.x = -Math.PI / 2 - g.rotation.x; if (sb.visible === noTeto) sb.visible = !noTeto; }
      this.opacidade(o, s, s.op);
      // água: ondas no chão onde ele afundou
      if (s.y < -.25) {
        if (!s.onda) { s.onda = new ap.T.Mesh(this.geoOnda, this.matOnda.clone()); s.onda.rotation.x = -Math.PI / 2; s.onda.raycast = () => {}; s.onda.renderOrder = 3; this.grupo.add(s.onda); this.desc.push(s.onda.material); }
        const c = (t * .6) % 1; s.onda.position.set(o.x, .025, o.z); s.onda.scale.set(1 + c * 1.6, 1 + c * 1.6, 1); s.onda.material.opacity = .45 * (1 - c) * Math.min(1, -s.y / alt * 1.3); s.onda.visible = true;
      } else if (s.onda) s.onda.visible = false;
    });
    this.st.forEach((s, id) => { if (!vivos.has(id)) { if (s.onda) this.grupo.remove(s.onda); this.st.delete(id); } });
  },
  // translúcido (atravessando parede) ou sumindo (na água): materiais próprios só enquanto precisar
  opacidade(o, s, op, forcar) {
    const g = o.t.g;
    if (op > .985 || forcar) {
      if (!s.mats) return;
      s.mats.forEach(([m, orig]) => { m.material = orig; }); s.clones.forEach(c => { try { c.dispose(); } catch (e) {} });
      s.mats = null; s.clones = null; return;
    }
    if (!s.mats) {
      s.mats = []; s.clones = [];
      g.traverse(m => {
        if (!m.material || m.userData.psSem) return;
        const orig = m.material, cl = Array.isArray(orig) ? orig.map(x => x.clone()) : orig.clone();
        (Array.isArray(cl) ? cl : [cl]).forEach(c => { c.userData.psOp = c.opacity; c.transparent = true; s.clones.push(c); });
        m.material = cl; s.mats.push([m, orig]);
      });
    }
    s.clones.forEach(c => { c.opacity = (c.userData.psOp == null ? 1 : c.userData.psOp) * op; c.depthWrite = op > .6; });
  },
};
(window.ACF3D = window.ACF3D || {}).vista = window.ACF3D.vista || [];
window.ACF3D.vista.push(Vista);

/* =========================================================
   7. BLOCO DO MESTRE: "Filhos na perseguição" (chips no bloco Perseguição)
   ========================================================= */
const OPCOES = [
  ['piloto', '🐾 Piloto automático do Filho', 'na vez de um Filho, "Mover Filho" sugere a rota pelos sentidos dele'],
  ['rotaAuto', '🗺 Rota já no começo da vez', 'a sugestão aparece sozinha; é só confirmar'],
  ['comp', '🎭 Comportamento visível no 3D', 'vira para o barulho, fareja, anda no teto, afunda na água, fica translúcido na parede'],
  ['abertura', '🎬 Abertura (2 s na criatura)', 'ao iniciar a perseguição, quem vê o Filho olha para ele e ouve a revelação'],
  ['porta', '🚪 O Filho para na porta', 'cobaia entra na Zona Neutra: a porta bate e a criatura encara o batente e vai embora'],
  ['replay', '🎞 Replay no fim', 'abre o replay visto de cima na sua tela; você decide se mostra a todos'],
  ['linha', '👥 Linha de iniciativa no 3D', 'retratos no topo: quem age, quem vem depois e ??? para o Filho oculto'],
];
// seção "Filhos na perseguição" do bloco único "Perseguição (Sobrevivendo ao Horror)" (aba Mesa).
// O h3 fica fora do div, como filho direto do bloco, para virar seção recolhível (paineis.js)
function blocoMestre() {
  const b = $('#blocoSahPers'); if (!b) return;
  let c = $('#psFilhos', b), h = $('#psFilhosH', b);
  if (!souMestre() || I().espiar) { if (c) c.remove(); if (h) h.remove(); return; }
  if (!c) {
    h = document.createElement('h3'); h.id = 'psFilhosH'; h.textContent = 'Filhos na perseguição'; b.appendChild(h);
    c = document.createElement('div'); c.id = 'psFilhos'; c.className = 'ps-bloco'; b.appendChild(c);
    c.addEventListener('change', e => { const i = e.target.closest('[data-psc]'); if (i) A().definir(['cfg', 'perseg', i.dataset.psc], i.checked ? null : false); });
    c.addEventListener('click', e => { const x = e.target.closest('[data-ps]'); if (x) Piloto.clique(e); });
  }
  if (c.contains(document.activeElement) && document.activeElement.matches('input')) return;
  const vid = Piloto.podeUsar();
  const html = `${vid ? `<div class="ps-b-vez"><span>🐾 Vez de <b>${esc(nomeTk(tokens()[vid]))}</b></span><button type="button" class="btn-roxo" data-ps="mover">Mover Filho</button></div>` : ''}
    <div class="lista-apagao ps-chips">${OPCOES.map(([k, n, d]) => `<label class="chave" title="${esc(d)}"><input type="checkbox" data-psc="${k}" ${cfgP(k) !== false ? 'checked' : ''}><span>${esc(n)}</span></label>`).join('')}</div>
    <p class="mini">O piloto só sugere: a rota aparece no 3D e no mapa, e você confirma ou move à mão. Ele escolhe o alvo pelos sentidos cadastrados (audição, faro, trilha, vibração, visão…) e anda até o deslocamento da vez, respeitando portas, paredes, água, metal e a Zona Neutra. Valem para todos (em <code>mapa/cfg/perseg</code>).</p>`;
  if (c.dataset.h !== html) { c.dataset.h = html; c.innerHTML = html; }
}

/* =========================================================
   ESTILO (no próprio arquivo, para não mexer no style.css dos outros)
   ========================================================= */
function estilo() {
  if ($('#psEstilo')) return;
  const st = document.createElement('style'); st.id = 'psEstilo';
  st.textContent = `
.ps-piloto { position: absolute; left: 50%; bottom: 84px; transform: translateX(-50%); z-index: 62; width: min(420px, calc(100% - 16px)); padding: 10px 12px; border-radius: 12px; background: linear-gradient(160deg, rgba(40,24,6,.95), rgba(16,11,20,.95) 70%); border: 1px solid #ffb02e; box-shadow: 0 0 22px rgba(255,176,46,.28), 0 10px 26px rgba(0,0,0,.55); color: #f6ecd8; font-size: 13px; }
.palco-area > .ps-piloto { bottom: 72px; width: min(420px, calc(100% - 110px)); }
.ps-piloto.no3d { bottom: calc(env(safe-area-inset-bottom, 0px) + 78px); }
.ps-p-k { margin: 0 0 4px; font: 700 11px/1.2 var(--mono, monospace); letter-spacing: .12em; color: #ffc766; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ps-p-txt { margin: 0 0 4px; line-height: 1.35; } .ps-p-q { color: #cdbfa8; }
.ps-p-m { margin: 0 0 6px; font: 12px var(--mono, monospace); color: #e8d6b0; } .ps-p-m b { color: #ffd27a; }
.ps-p-dica { margin: 4px 0 0; font-size: 11px; color: #a99a85; }
.ps-p-bts { display: flex; flex-wrap: wrap; gap: 6px; }
.ps-p-bts button { min-height: 40px; min-width: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid #6b5332; background: rgba(255,255,255,.06); color: #f6ecd8; font: 600 13px var(--corpo, sans-serif); cursor: pointer; }
.ps-p-bts button.pri { background: linear-gradient(180deg, #ffb02e, #d9861a); border-color: #ffb02e; color: #1c1206; }
.ps-rota2d { position: absolute; left: 0; top: 0; width: 0; height: 0; transform: translateZ(3.2px); transform-style: preserve-3d; pointer-events: none; }
.ps-rota2d i { position: absolute; height: 6px; margin-top: -3px; transform-origin: 0 50%; border-radius: 3px; }
.ps-rota2d i.ps-r-linha { background: repeating-linear-gradient(90deg, #ff5a2e 0 12px, #ffb08a 12px 18px); box-shadow: 0 0 0 2px rgba(0,0,0,.55), 0 0 8px rgba(255,90,46,.7); }
.ps-rota2d i.ps-r-resto { height: 3px; margin-top: -1.5px; background: repeating-linear-gradient(90deg, rgba(255,138,94,.6) 0 5px, transparent 5px 11px); }
.ps-rota2d b { position: absolute; width: 0; height: 0; }
.ps-rota2d b::before { content: ''; position: absolute; border-radius: 50%; }
.ps-rota2d b.ps-r-fim::before { left: -9px; top: -9px; width: 18px; height: 18px; background: #ff5a2e; border: 3px solid #1c1206; box-sizing: border-box; }
.ps-rota2d b.ps-r-alvo::before { left: -14px; top: -14px; width: 28px; height: 28px; border: 3px dashed #ff3b4e; box-sizing: border-box; animation: psAlvo 1.4s ease-in-out infinite; }
@keyframes psAlvo { 50% { transform: scale(1.25); opacity: .55; } }
.ps-rot2d span { border-color: #ff5a2e !important; color: #ffd9c8 !important; }
.ps-pulso { position: absolute; width: 0; height: 0; z-index: 41; pointer-events: none; }
.ps-pulso::before, .ps-pulso::after { content: ''; position: absolute; left: -26px; top: -26px; width: 52px; height: 52px; border-radius: 50%; border: 3px solid #ff3b4e; animation: psPulso 1.1s ease-out 2; }
.ps-pulso::after { animation-delay: .35s; }
.ps-pulso.ps-porta2d::before, .ps-pulso.ps-porta2d::after { border-color: #e8e2f4; border-radius: 6px; }
@keyframes psPulso { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }
.ps-leg { position: fixed; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 150px); transform: translateX(-50%); z-index: 9500; padding: 4px 10px; border-radius: 6px; background: rgba(0,0,0,.72); color: #f1ecf7; font: 14px var(--corpo, sans-serif); opacity: 0; transition: opacity .3s; pointer-events: none; }
.ps-leg.on { opacity: 1; }
/* linha de iniciativa (no lugar da faixa da perseguição) */
.s3d.ps-linha #s3dPersg, .s3d.ps-linha #momRelogio { display: none !important; }
.ps-li-t { white-space: nowrap; color: #d9cdee; } .ps-li-t.acabando { color: #ff8a96; }
.ps-linha-ini { display: flex; align-items: center; gap: 8px; max-width: 100%; padding: 5px 10px 5px 8px; border-radius: 12px; background: rgba(18,15,26,.88); border: 1px solid var(--linha, #3a3150); color: var(--texto, #eee); font: 600 11px/1.2 var(--mono, monospace); pointer-events: none; flex-wrap: wrap; justify-content: center; }
.ps-linha-ini.minha { border-color: #ffd23f; box-shadow: 0 0 14px rgba(255,210,63,.4); }
.ps-li-k { letter-spacing: .08em; color: #d9cdee; white-space: nowrap; }
.ps-linha-ini ol { display: flex; align-items: center; gap: 3px; margin: 0; padding: 0; list-style: none; min-width: 0; }
.ps-linha-ini li { display: flex; align-items: center; gap: 5px; min-width: 0; }
.ps-li-r { flex: none; width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--c); background: #1d1828 center/cover no-repeat; display: grid; place-items: center; font: 700 12px var(--corpo, sans-serif); color: #fff; opacity: .78; }
.ps-linha-ini li.vez .ps-li-r { width: 32px; height: 32px; opacity: 1; border-color: #ffd23f; box-shadow: 0 0 0 2px rgba(255,210,63,.35), 0 0 12px rgba(255,210,63,.5); }
.ps-linha-ini li.oculto .ps-li-r { background: repeating-linear-gradient(45deg, #2a2238 0 4px, #1a1424 4px 8px); color: #c9b8ea; border-style: dashed; }
.ps-linha-ini li b { max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #ffe7a0; font-size: 12px; }
.ps-linha-ini li.mais { color: #a99cc0; padding: 0 2px; }
.ps-li-seta { font-style: normal; color: #6f6390; }
.ps-li-sua { color: #ffd23f; white-space: nowrap; } .ps-li-esp { color: #a99cc0; white-space: nowrap; }
@media (max-width: 560px) {
  /* celular: a faixa (e a linha) ficam à esquerda do decibelímetro, nada por cima dele */
  .s3d .s3d-faixas { left: max(10px, env(safe-area-inset-left)); transform: none; width: calc(100% - 20px - 96px - 10px - env(safe-area-inset-right)); justify-items: start; }
  .s3d:has(#s3dDb[hidden]) .s3d-faixas { width: calc(100% - 20px); }
  .s3d.ps-linha .s3d-dica { display: none; }   /* a dica de teclas volta no fim da perseguição */
  .ps-linha-ini { justify-content: flex-start; gap: 4px 6px; padding: 4px 8px; }
  .ps-li-k { width: 100%; font-size: 10px; }
  .ps-linha-ini li b { max-width: 82px; font-size: 11px; }
  .ps-li-r { width: 24px; height: 24px; } .ps-linha-ini li.vez .ps-li-r { width: 28px; height: 28px; }
  .ps-li-sua, .ps-li-esp { font-size: 10.5px; } .ps-li-t { font-size: 10.5px; }
  .s3d .mom-relogio { font-size: 11px; max-width: 100%; }
  .ps-piloto { font-size: 12.5px; }
}
/* replay */
.ps-replay { position: fixed; inset: 0; z-index: 9620; display: grid; place-items: center; padding: 12px; background: rgba(5,3,9,.82); backdrop-filter: blur(2px); }
.ps-rp-caixa { width: min(720px, 100%); max-height: calc(100vh - 24px); overflow: auto; padding: 12px 14px; border-radius: 14px; background: linear-gradient(170deg, #1a1222, #0d0a12); border: 1px solid #5a4378; box-shadow: 0 20px 60px rgba(0,0,0,.7); color: #eee7f7; }
.ps-rp-cab { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ps-rp-cab b { font: 700 13px var(--mono, monospace); letter-spacing: .12em; color: #ffb3bf; }
.ps-rp-cab span { font: 12px var(--mono, monospace); color: #b8a9cf; flex: 1; }
.ps-rp-cab b { flex: 1 1 auto; } .ps-rp-cab .ps-rp-x { margin-left: auto; }
@media (max-width: 560px) { .ps-rp-cab span { order: 3; flex-basis: 100%; } .ps-rp-caixa { padding: 10px; } }
/* celular: com o painel aberto (folha de tela cheia), o cartão do piloto espera atrás */
@media (max-width: 700px) { body:has(#painel.aberto) .palco-area > .ps-piloto { display: none; } }
.ps-rp-x { min-width: 40px; min-height: 40px; border-radius: 10px; border: 1px solid #4a3a62; background: rgba(255,255,255,.05); color: #eee; font-size: 16px; cursor: pointer; }
.ps-rp-vez { min-height: 18px; margin: 4px 0; font: 600 12px var(--mono, monospace); color: #ffd27a; }
.ps-rp-svg { display: block; width: 100%; height: auto; max-height: calc(100vh - 210px); background: #0b0910; border-radius: 10px; border: 1px solid #2e2440; }
.ps-rs { fill: #18131f; stroke: #3c3152; stroke-width: 1.2; } .ps-rs.zn { fill: #10241a; stroke: #2f6b4b; }
.ps-rc { fill: #141019; stroke: #2b2338; stroke-width: 1; }
.ps-rt { fill: #6d6185; font: 600 6px var(--mono, monospace); }
.ps-tl { fill: none; stroke: var(--c); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; stroke-opacity: .85; }
.ps-tk.filho .ps-tl { stroke: #ff3b4e; stroke-dasharray: 5 3; stroke-width: 2.6; }
.ps-th circle { fill: var(--c); stroke: #0b0910; stroke-width: 1.5; } .ps-tk.filho .ps-th circle { fill: #ff3b4e; }
.ps-th text { fill: #0b0910; font: 700 5.5px var(--corpo, sans-serif); text-anchor: middle; } .ps-tk.filho .ps-th text { fill: #fff; }
.ps-th text.ps-tn { fill: #f1ecf7; font: 600 5px var(--mono, monospace); paint-order: stroke; stroke: #0b0910; stroke-width: 1.6px; }
.ps-mk path { fill: none; stroke: #ff3b4e; stroke-width: 1.8; stroke-linecap: round; opacity: 0; transform: scale(.2); transition: opacity .25s, transform .3s; }
.ps-mk.on path { opacity: 1; transform: scale(1); }
.ps-rp-barra { height: 4px; margin: 8px 0; border-radius: 2px; background: #2a2238; overflow: hidden; } .ps-rp-barra i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #ff3b4e, #ffb02e); }
.ps-rp-bts { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.ps-rp-bts button { min-height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid #4a3a62; background: rgba(255,255,255,.05); color: #eee7f7; font: 600 13px var(--corpo, sans-serif); cursor: pointer; }
.ps-rp-bts button.pri { background: linear-gradient(180deg, #8b5cf6, #6d3fe0); border-color: #8b5cf6; color: #fff; }
/* bloco do Mestre e lista de replays */
.ps-bloco h3, .ps-replays h3 { margin: 14px 0 6px; font-size: 13px; letter-spacing: .04em; }
.ps-b-vez { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin: 6px 0; padding: 8px 10px; border-radius: 10px; border: 1px solid #ffb02e; background: rgba(255,176,46,.08); }
.ps-b-vez button { min-height: 40px; }
.ps-chips label.chave span { overflow-wrap: anywhere; }
.ps-rl { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.ps-rl li { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 10px; border: 1px solid #2c2440; background: rgba(255,255,255,.03); }
.ps-rl-t { flex: 1; min-width: 0; font-size: 12.5px; } .ps-rl-t small { display: block; color: var(--texto-dim, #a99cc0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ps-rl-b { display: flex; gap: 4px; } .ps-rl-b button { min-width: 40px; min-height: 40px; border-radius: 10px; border: 1px solid #3a2e52; background: rgba(255,255,255,.05); color: inherit; cursor: pointer; }
`;
  document.head.appendChild(st);
}

/* =========================================================
   LIGAÇÕES
   ========================================================= */
let ag = null;
function tudo() {
  try { Abert.ver(); Porta.vigiar(); Rep.gravar(); Rep.ver(); Piloto.vigiar(); blocoMestre(); } catch (e) { console.warn('perseg3d:', e); }
}
function agendar() { if (ag) return; ag = setTimeout(() => { ag = null; tudo(); }, 120); }
function iniciar() {
  if (!window.ACF || !window.ACF._int || !window.ACF.aoMudar || !window.ACF_FILHOS) { setTimeout(iniciar, 200); return; }
  estilo();
  A().aoMudar(agendar);
  document.addEventListener('acf-perfil', () => setTimeout(tudo, 80));
  const bi = $('#btnIniciarPersg'); if (bi) bi.addEventListener('click', () => Abert.clicou());
  setInterval(() => { try { Rep.gravar(); Porta.vigiar(); Piloto.vigiar(); blocoMestre(); } catch (e) { console.warn('perseg3d:', e); } }, 450);
  setInterval(() => { try { Comp.publicar(); Rep.desenharBloco(); } catch (e) { console.warn('perseg3d:', e); } }, 1200);
  // resumo da sessão (imersao.js): as perseguições com replay
  (window.ACF_RESUMO_EXTRA = window.ACF_RESUMO_EXTRA || []).push((ini, fim) => Rep.resumo(ini, fim));
  tudo();
}
window.ACF_PERSEG = {
  Piloto, Comp, Abert, Porta, Rep, Tela, Linha, Vista, OPCOES, cfgP,
  // testes
  _int: { buscar, caminhoAte, cortar, suavizar, candidatos, regrasDe },
  _candidatos: id => { const tk = tokens()[id]; return tk ? candidatos(id, tk).map(c => ({ k: c.k, mot: c.mot, prio: +c.prio.toFixed(2), x: +c.x.toFixed(2), y: +c.y.toFixed(2), zn: !!c.zn })) : []; },
  _sug: () => { const s = Piloto.sug, al = Piloto.atual(); return s ? { id: s.id, msg: s.msg, n: s.alvos.length, i: s.i, resta: s.resta, mot: al && al.mot, m: al && +al.m.toFixed(2), total: al && +al.total.toFixed(2), fim: al && al.alc[al.alc.length - 1], k: al && al.k } : null; },
};
iniciar();
})();
