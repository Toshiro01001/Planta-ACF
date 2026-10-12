/* =========================================================
   exposicao.js · Salas de Exposição (perigos complexos)
   - Biblioteca (só o Mestre): segredos/_expo/<id>, importada de um .json (planta-acf-exposicao).
   - Salas da planta: segredos/_expoMapa/c<CN> = { s: id da sala de exposição }.
   - Em andamento (público): mapa/expo; o prazo secreto fica em segredos/_expoRun.
   - Ações e testes dos jogadores: expoLog/<id da rodada de exposição>/<push> (cada um só cria).
   ========================================================= */
(() => {
const A = window.ACF;
if (!A) return;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = A.esc;
const num = (v, p = 0) => { const n = parseFloat(v); return isFinite(n) ? n : p; };
const int = v => Math.round(num(v));
const est = () => A.estado || {};
const sg = () => (A.segredos || {});
const FX = () => window.ACF_FICHAS;
const cobaias = () => (A.SERES || []).filter(x => x.tipo === 'cobaia');
const nomeDe = id => (A.SER[id] || {}).nome || id || '';
const ELEM = { Sangue: '#c2272f', Morte: '#8c8c8c', Conhecimento: '#d9a514', Energia: '#8a3fd1', Medo: '#e9e4f2', Varia: '#5fa8a0' };
const corEl = el => ELEM[el] || '#8a3fd1';
const PERN = { forca: 'Força', ataque: 'Ataque' };
const nomePer = p => PERN[p] || (((FX() && FX().PER) || {})[p] || [, p])[1];
const lib = () => Object.fromEntries(Object.entries(sg()._expo || {}).filter(([, v]) => v && v.nome));
const mapaExpo = () => sg()._expoMapa || {};
const rolar = expr => (FX() && FX().rolarExpr ? FX().rolarExpr(String(expr)) : { total: 0, det: '' });

/* ---------- registro (expoLog) ---------- */
const LOG = { id: '', off: null, v: {} };
function ouvirLog(id) {
  if (LOG.id === id) return;
  if (LOG.off) LOG.off();
  LOG.id = id; LOG.v = {}; LOG.off = null;
  if (!id) return;
  A.garantirLogin().then(() => { if (LOG.id !== id) return; LOG.off = A.Rede.on('expoLog/' + id, v => { const antes = LOG.v; LOG.v = v || {}; aoMudarLog(antes); }, () => {}); });
}
const entradas = () => Object.entries(LOG.v || {}).map(([k, e]) => ({ k, ...e })).filter(e => e && e.s).sort((a, b) => num(a.ts) - num(b.ts));
function progresso(x) {
  const p = {}, f = {}, feitos = {}, extra = {};
  Object.keys(x.part || {}).forEach(q => { p[q] = 0; f[q] = 0; });
  entradas().forEach(e => {
    if (e.t === 'acao' || e.t === 'adj') { p[e.s] = (p[e.s] || 0) + int(e.suc); }
    if (e.t === 'acao' && e.ok === false) f[e.s] = (f[e.s] || 0) + 1;
    if (e.t === 'acao' && int(e.r) === int(x.rod)) feitos[e.s] = (feitos[e.s] || 0) + 1;
    if (e.t === 'res' && e.ini && e.ok && int(e.r) === int(x.rod)) extra[e.s] = 1;
  });
  const grupo = Object.values(p).reduce((s, n) => s + n, 0), falhas = Object.values(f).reduce((s, n) => s + n, 0);
  const podeAgir = q => (feitos[q] || 0) < 1 + (extra[q] || 0);
  return { p, f, feitos, extra, grupo, falhas, podeAgir };
}
function gravarLog(x, e) { return A.Rede.set(`expoLog/${x.id}/${A.Rede.chave()}`, { ...e, ts: Date.now() }).catch(() => A.aviso('O servidor recusou o registro da sala.')); }
// Mestre: falha numa sala sobe a tensão do grupo
function aoMudarLog(antes) {
  const x = est().expo;
  if (A.mestre && x && x.on) {
    Object.entries(LOG.v || {}).forEach(([k, e]) => { if (!antes[k] && e && e.t === 'acao' && e.ok === false && window.ACF_SESSAO) window.ACF_SESSAO.tensao(2); });
  }
  desenharTela(); desenharBloco(true);
}

/* ---------- DT e dano ajustados pelo Mestre ---------- */
function dtDe(v, x, rod) {
  if (v === null || v === undefined || v === '' || v === '?') return null;
  const s = String(v).replace(/\s/g, '');
  let base;
  const m1 = /^(\d+)\+(\d+)\/rodada$/.exec(s), m2 = /^(\d+)\+(\d+)\/testeanterior$/i.exec(s.replace(/\s/g, ''));
  if (m1) base = int(m1[1]) + int(m1[2]) * Math.max(0, int(rod));
  else if (m2) base = int(m2[1]) + int(m2[2]) * Math.max(0, int(rod) - 1);
  else if (/d/i.test(s)) base = rolar(s).total;
  else base = int(s);
  return base + int((x.aj || {}).dt);
}
const multDano = x => (num((x.aj || {}).dano, 1) || 1);

/* =========================================================
   MAPAS (um desenho por modelo; as fichas andam conforme os sucessos)
   ========================================================= */
function semente(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
function labirinto(seed, W = 14, H = 6) {
  const r = semente(seed), vis = new Set(), par = {}, k = (x, y) => x + ',' + y;
  const pilha = [[0, Math.floor(H / 2)]]; vis.add(k(0, Math.floor(H / 2)));
  const paredes = new Set();
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) { paredes.add(`${x},${y},r`); paredes.add(`${x},${y},b`); }
  while (pilha.length) {
    const [x, y] = pilha[pilha.length - 1];
    const viz = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < W && b < H && !vis.has(k(a, b)));
    if (!viz.length) { pilha.pop(); continue; }
    const [nx, ny] = viz[Math.floor(r() * viz.length)];
    if (nx > x) paredes.delete(`${x},${y},r`); else if (nx < x) paredes.delete(`${nx},${ny},r`); else if (ny > y) paredes.delete(`${x},${y},b`); else paredes.delete(`${nx},${ny},b`);
    vis.add(k(nx, ny)); par[k(nx, ny)] = [x, y]; pilha.push([nx, ny]);
  }
  // caminho da entrada (esquerda) à saída (direita)
  const fim = [W - 1, Math.floor(H / 2)], cam = [];
  let c = fim; while (c) { cam.unshift(c); c = par[k(c[0], c[1])]; }
  return { W, H, paredes, cam };
}
const pct = v => Math.max(2, Math.min(98, v)).toFixed(1) + '%';
function tokens(lista) {
  return lista.map(([q, x, y]) => { const s = A.SER[q] || {}; return `<i class="ex-tk" data-q="${esc(q)}" style="left:${pct(x)};top:${pct(y)};--cor:${s.cor || '#fff'};${s.img ? `background-image:url('${s.img}')` : ''}" title="${esc(s.nome || q)}"></i>`; }).join('');
}
function htmlMapa(x, pr) {
  const sala = x.sala || {}, meta = sala.meta || {}, cor = corEl(sala.el), part = Object.keys(x.part || {});
  const need = Math.max(1, int(x.meta || meta.sucessos) || 5), rod = Math.max(1, int(x.rod));
  const ind = q => Math.max(0, pr.p[q] || 0), grupo = Math.max(0, pr.grupo);
  const espalha = (i, n, base, amp = 7) => base + (i - (n - 1) / 2) * amp;
  let fundo = '', tks = [];
  const W = 640, H = 290;
  switch (sala.modelo) {
    case 'travessia': {
      const pts = Array.from({ length: need + 1 }, (_, i) => [40 + i * (560 / need), 160 + Math.sin(i * 1.3) * 50]);
      fundo = `<g class="ex-chuva" stroke="${cor}">${Array.from({ length: 40 }, (_, i) => `<line x1="${(i * 53) % W}" y1="${(i * 37) % 120}" x2="${(i * 53) % W - 6}" y2="${(i * 37) % 120 + 18}" style="--d:${(i % 7) * 0.13}s"/>`).join('')}</g>
        <path d="M${pts.map(p => p.join(' ')).join(' L')}" stroke="#ffffff22" stroke-width="10" fill="none" stroke-dasharray="2 10"/>
        ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === need ? 16 : 11}" class="${(meta.modo === 'individual' ? 0 : grupo) >= i ? 'ex-ok' : ''}" fill="${i === need ? '#3c9e7a' : '#2a2530'}" stroke="${cor}" stroke-width="2"/>`).join('')}
        <text x="${pts[need][0]}" y="${pts[need][1] + 36}" class="ex-rot">SAÍDA</text>`;
      tks = part.map((q, i) => { const st = Math.min(need, meta.modo === 'individual' ? ind(q) : grupo); const p = pts[st]; return [q, espalha(i, part.length, p[0] / W * 100, 4), (p[1] - 26) / H * 100]; });
      break;
    }
    case 'zonas': {
      fundo = `<circle cx="320" cy="160" r="250" fill="#3c9e7a18"/><circle cx="320" cy="160" r="150" fill="${cor}22" stroke="${cor}66"/><circle cx="320" cy="160" r="80" fill="${cor}44" stroke="${cor}"/>
        <circle cx="320" cy="160" r="20" fill="${cor}" class="ex-pulsa"/><text x="320" y="96" class="ex-rot">2 ou menos</text><text x="320" y="24" class="ex-rot">3 ou 4</text><text x="600" y="30" class="ex-rot">5+ a salvo</text>
        <rect x="20" y="268" width="600" height="8" rx="4" fill="#ffffff18"/><rect x="20" y="268" width="${Math.min(600, 600 * rod / Math.max(1, int(meta.rodadas) || 5))}" height="8" rx="4" fill="${cor}" class="ex-pavio"/>`;
      tks = part.map((q, i) => { const s = Math.min(6, ind(q)); const ang = (i / Math.max(1, part.length)) * Math.PI * 2 + 0.4; const rr = 18 + s * 42; return [q, (320 + Math.cos(ang) * rr) / W * 100, (160 + Math.sin(ang) * rr * 0.55) / H * 100]; });
      break;
    }
    case 'mare': {
      const dist = meta.distancia, maxM = dist ? Math.max(60, (rod + 6) * 6) : need;
      const xDe = v => 30 + v / maxM * 560;
      const frente = dist ? Math.max(0, (rod - 1) * int(dist.passo || 6)) : 0;
      fundo = `<rect x="20" y="70" width="600" height="160" rx="10" fill="#1a161f" stroke="#ffffff22"/><rect x="600" y="110" width="22" height="80" fill="#3c9e7a" rx="3"/><text x="611" y="250" class="ex-rot">SAÍDA</text>
        ${dist ? `<rect x="20" y="70" width="${Math.max(6, xDe(frente) - 20)}" height="160" rx="10" fill="${cor}" class="ex-onda"/><text x="${Math.max(40, xDe(frente) - 30)}" y="62" class="ex-rot">${frente} m</text>` : `<g class="ex-grama" stroke="${cor}">${Array.from({ length: 60 }, (_, i) => `<line x1="${30 + i * 9.6}" y1="230" x2="${32 + i * 9.6}" y2="${200 - (i % 5) * 6}" style="--d:${(i % 6) * 0.2}s"/>`).join('')}</g>`}`;
      tks = part.map((q, i) => { const v = dist ? 6 + ind(q) * 6 : Math.min(need, ind(q)); return [q, xDe(v) / W * 100, espalha(i, part.length, 52, 9)]; });
      break;
    }
    case 'paredes': {
      const fecha = Math.min(1, (rod - 1) / 4), larg = 260 * fecha;
      fundo = `<rect x="40" y="40" width="560" height="210" fill="#1a161f" stroke="#ffffff22"/>
        <rect x="40" y="40" width="${8 + larg * 0.5}" height="210" fill="${cor}" class="ex-parede"/><rect x="${592 - larg * 0.5}" y="40" width="${8 + larg * 0.5}" height="210" fill="${cor}" class="ex-parede"/>
        <rect x="600" y="115" width="26" height="60" fill="#3a2f44" stroke="#ffffff44"/>${[0, 1, 2].map(i => `<circle cx="613" cy="${128 + i * 17}" r="6" fill="${grupo > i ? '#3c9e7a' : '#552'}"/>`).join('')}
        <text x="320" y="30" class="ex-rot">${fecha >= 1 ? 'AS PAREDES SE FECHARAM' : `rodada ${rod}: as paredes avançam`}</text>`;
      tks = part.map((q, i) => [q, espalha(i, part.length, 50, 8), 52]);
      break;
    }
    case 'labirinto': {
      const L = labirinto(sala.id || sala.nome), cw = 600 / L.W, ch = 220 / L.H, ox = 20, oy = 40;
      const k = Math.min(L.cam.length - 1, Math.round(grupo / need * (L.cam.length - 1)));
      const linhas = [];
      L.paredes.forEach(w => { const [x, y, t] = w.split(','); const X = ox + x * cw, Y = oy + y * ch; if (t === 'r' && !(+x === L.W - 1 && +y === Math.floor(L.H / 2))) linhas.push(`M${X + cw} ${Y} v${ch}`); if (t === 'b') linhas.push(`M${X} ${Y + ch} h${cw}`); });
      fundo = `<rect x="${ox}" y="${oy}" width="600" height="220" fill="#15121a" stroke="#ffffff33"/>
        <path d="M${L.cam.slice(0, k + 1).map(([x, y]) => `${ox + x * cw + cw / 2} ${oy + y * ch + ch / 2}`).join(' L')}" stroke="${cor}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".7"/>
        <path d="${linhas.join(' ')}" stroke="#8a8094" stroke-width="2"/><text x="610" y="30" class="ex-rot">SAÍDA</text>`;
      const [cx, cy] = L.cam[k];
      tks = part.map((q, i) => [q, (ox + cx * cw + cw / 2) / W * 100 + (i - (part.length - 1) / 2) * 1.6, (oy + cy * ch + ch / 2) / H * 100]);
      break;
    }
    case 'desabamento': {
      const rodMax = int(meta.rodadas) || 7, frac = Math.min(1, rod / rodMax);
      fundo = `<path d="M40 250 L40 80 L200 40 L440 40 L600 80 L600 250 Z" fill="#1d1922" stroke="#ffffff33"/>
        ${Array.from({ length: Math.round(frac * 10) }, (_, i) => { const r = semente('r' + i)(); return `<path d="M${80 + r * 480} 40 l${-10 + r * 20} 40 l${10 - r * 20} 50 l${-8 + r * 16} 60" stroke="${cor}" stroke-width="2" fill="none"/>`; }).join('')}
        <g class="ex-entulho" fill="#6b6170">${Array.from({ length: 10 }, (_, i) => `<rect x="${60 + i * 55}" y="0" width="8" height="8" style="--d:${(i % 5) * 0.4}s"/>`).join('')}</g>
        <rect x="600" y="170" width="24" height="80" fill="#3c9e7a" rx="2"/><text x="612" y="270" class="ex-rot">SAÍDA</text>`;
      tks = part.map((q, i) => { const v = Math.min(need, meta.modo === 'individual' ? ind(q) : grupo); return [q, (60 + v / need * 520) / W * 100, espalha(i, part.length, 72, 7)]; });
      break;
    }
    case 'horda': {
      const max = Math.max(1, int(meta.horda) || 500), pv = Math.max(0, int(x.horda === undefined ? max : x.horda)), n = Math.ceil(pv / max * 42);
      fundo = `<rect x="20" y="20" width="600" height="14" rx="7" fill="#ffffff18"/><rect x="20" y="20" width="${600 * pv / max}" height="14" rx="7" fill="${cor}"/><text x="320" y="54" class="ex-rot">HORDA ${pv}/${max} PV</text>
        <g class="ex-horda" fill="${cor}">${Array.from({ length: n }, (_, i) => { const r = semente('h' + i); return `<g transform="translate(${300 + r() * 320} ${90 + r() * 170})"><circle r="7"/><rect x="-6" y="7" width="12" height="16" rx="5"/></g>`; }).join('')}</g>`;
      tks = part.map((q, i) => [q, 18, espalha(i, part.length, 60, 9)]);
      break;
    }
    default: {
      fundo = `<circle cx="320" cy="150" r="90" fill="${cor}22" stroke="${cor}" class="ex-pulsa"/><text x="320" y="146" class="ex-rodada">RODADA ${rod}</text><text x="320" y="176" class="ex-rot">${esc(meta.rotulo || '')}${meta.sucessos ? ` ${grupo}/${need}` : ''}</text>`;
      tks = part.map((q, i) => [q, espalha(i, part.length, 50, 9), 86]);
    }
  }
  return `<div class="ex-mapa" style="--el:${cor}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${fundo}</svg>${tokens(tks)}</div>`;
}

/* =========================================================
   TELA DO JOGADOR (e prévia do Mestre)
   ========================================================= */
const UI = { min: false, aberto: '', efrVisto: '', previa: false };
function participo(x) { return !!(x && x.on && A.meu && (x.part || {})[A.meu]); }
function desenharTela() {
  const x = est().expo;
  let o = $('#expoTela');
  const ver = x && x.on && (participo(x) || (A.mestre && UI.previa));
  if (!ver) { if (o) o.hidden = true; const b = $('#expoChip'); if (b) b.hidden = true; return; }
  if (!o) { o = document.createElement('div'); o.id = 'expoTela'; o.className = 'expo-tela'; document.body.appendChild(o); o.addEventListener('click', aoClicarTela); }
  let chip = $('#expoChip');
  if (!chip) { chip = document.createElement('button'); chip.id = 'expoChip'; chip.className = 'expo-chip'; document.body.appendChild(chip); chip.onclick = () => { UI.min = false; desenharTela(); }; }
  const sala = x.sala || {}, meta = sala.meta || {}, pr = progresso(x), rod = int(x.rod) || 1;
  chip.innerHTML = `⚠ ${esc(sala.nome)} · rodada ${rod}`; chip.style.setProperty('--el', corEl(sala.el));
  chip.hidden = !UI.min; o.hidden = UI.min;
  if (UI.min) return;
  const at = FX() && FX().ativa(), d = at && at.d;
  const jaAgi = !pr.podeAgir(A.meu);
  const need = int(x.meta || meta.sucessos);
  const meu = pr.p[A.meu] || 0;
  const btns = (sala.acoes || []).map((a, i) => {
    const pers = (a.per || []).filter(Boolean);
    const dt = dtDe(a.dt, x, rod);
    const bon = p => (d && at && p !== 'forca' && p !== 'ataque' ? at.r.bonus(p) : null);
    const sel = pers.length > 1 || a.livre ? `<select data-ex-per="${i}">${pers.map(p => `<option value="${p}">${esc(nomePer(p))}${bon(p) !== null ? ` (${bon(p) >= 0 ? '+' : ''}${bon(p)})` : ''}</option>`).join('')}${a.livre ? `<optgroup label="Outra perícia (o Mestre aprova${a.dtOutras ? `, DT ${int(a.dtOutras) + int((x.aj || {}).dt)}` : ''})">${Object.values((FX() && FX().PER) || {}).filter(p => !pers.includes(p[0])).map(p => `<option value="${p[0]}">${esc(p[1])}</option>`).join('')}</optgroup>` : ''}</select>` : '';
    return `<div class="ex-acao"><button data-ex-acao="${i}" ${jaAgi || !at ? 'disabled' : ''} title="${esc(a.txt || '')}"><b>${esc(a.n)}</b><small>${pers.length ? pers.map(nomePer).join(' ou ') : 'sem teste'}${dt !== null ? ` · DT ${dt}` : a.dt === null && pers.length ? ' · DT do Mestre' : ''}${int(a.s) ? ` · +${a.s}${a.dobro ? ' (10+ vale 2)' : ''}` : ''}${a.dano ? ` · sofre ${esc(a.dano)}` : ''}</small></button>${sel}<details><summary>regra</summary><p>${esc(a.txt || '')}</p></details></div>`;
  }).join('');
  const meusLog = entradas().filter(e => e.s === A.meu).slice(-4).reverse();
  // só redesenha se algo mudou (preserva a perícia escolhida e o que estava aberto)
  const chaveT = JSON.stringify([x, Object.keys(LOG.v || {}).length, !!at, A.meu, d && d.atr]);
  if (o.dataset.k === chaveT) { verEfeitoRodada(x); return; }
  o.dataset.k = chaveT;
  const selAnt = {}; $$('[data-ex-per]', o).forEach(s => { selAnt[s.dataset.exPer] = s.value; });
  const abertos = $$('details', o).map(dd => dd.open);
  const posAnt = {}; $$('.ex-tk', o).forEach(t => { posAnt[t.dataset.q] = [t.style.left, t.style.top]; });
  o.innerHTML = `<div class="ex-caixa" style="--el:${corEl(sala.el)}">
    <header><div><p class="ex-k">SALA DE EXPOSIÇÃO · ${esc(sala.el || '')}${sala.vd ? ` · VD ${esc(sala.vd)}` : ''}</p><h3>${esc(sala.nome)}</h3></div>
      <div class="ex-rodada-box"><b>${rod}</b><small>rodada</small></div><button class="ex-min" data-ex="min" title="Minimizar">–</button></header>
    ${x.evento && x.evento.t && int(x.evento.rod) === rod ? `<p class="ex-evento">🎲 ${esc(x.evento.dado || '')} ${int(x.evento.r)}: ${esc(x.evento.t)}</p>` : ''}
    ${htmlMapa(x, pr)}
    <p class="ex-obj"><b>Objetivo:</b> ${esc(sala.obj || '')}${need ? ` <span class="ex-conta">${meta.modo === 'individual' ? `Você: ${meu}/${need}` : `Grupo: ${pr.grupo}/${need}`} ${esc(meta.rotulo || 'sucessos')}${meta.falhasMax ? ` · falhas ${pr.falhas}/${meta.falhasMax}` : ''}</span>` : ''}</p>
    <details class="ex-desc"><summary>O que vocês veem</summary><p>${esc(sala.desc || '')}</p>${sala.rodTxt ? `<p><b>A cada rodada:</b> ${esc(sala.rodTxt)}</p>` : ''}</details>
    ${A.meu && (x.part || {})[A.meu] ? `<p class="ex-k">SUAS AÇÕES ${jaAgi ? '· você já agiu nesta rodada' : pr.extra[A.meu] ? '· duas nesta rodada' : '· uma por rodada'}</p>${!at ? '<p class="mini">Ative sua ficha para agir.</p>' : ''}<div class="ex-acoes">${btns}</div>` : '<p class="mini">Prévia do Mestre: é isto que os jogadores veem.</p>'}
    ${meusLog.length ? `<ul class="ex-log">${meusLog.map(e => `<li>${e.t === 'res' ? '🛡' : e.ok === null ? '⏳' : e.ok ? '✅' : '❌'} ${esc(e.n || '')}${e.tot !== undefined && e.tot !== null && e.tot >= 0 ? ` · ${e.tot}` : ''}${e.dt ? ` vs DT ${e.dt}` : ''}${int(e.suc) ? ` · +${e.suc}` : ''}${e.dano ? ` · −${e.dano} ${esc(String(e.tipo || 'pv').toUpperCase())}` : ''}</li>`).join('')}</ul>` : ''}
  </div>`;
  Object.entries(selAnt).forEach(([i, v]) => { const s = $(`[data-ex-per="${i}"]`, o); if (s && [...s.options].some(op => op.value === v)) s.value = v; });
  $$('details', o).forEach((dd, i) => { if (abertos[i]) dd.open = true; });
  // as fichas andam da posição anterior até a nova
  $$('.ex-tk', o).forEach(t => { const p = posAnt[t.dataset.q]; if (!p) return; const nv = [t.style.left, t.style.top]; if (p[0] === nv[0] && p[1] === nv[1]) return; t.style.transition = 'none'; t.style.left = p[0]; t.style.top = p[1]; void t.offsetWidth; t.style.transition = ''; t.style.left = nv[0]; t.style.top = nv[1]; });
  verEfeitoRodada(x);
}
function aoClicarTela(e) {
  if (e.target.closest('[data-ex="min"]')) { UI.min = true; if (A.mestre) UI.previa = false; desenharTela(); return; }
  const b = e.target.closest('[data-ex-acao]'); if (!b) return;
  agir(int(b.dataset.exAcao), b);
}
// o jogador faz uma ação da sala com a própria ficha
function agir(i, b) {
  const x = est().expo; if (!participo(x)) return;
  const sala = x.sala || {}, a = (sala.acoes || [])[i]; if (!a) return;
  const at = FX() && FX().ativa(); if (!at) { A.aviso('Ative sua ficha.'); return; }
  const pr = progresso(x); if (!pr.podeAgir(A.meu)) { A.aviso('Você já agiu nesta rodada.'); return; }
  b.disabled = true;
  const d = at.d, rod = int(x.rod) || 1, sel = $(`[data-ex-per="${i}"]`);
  const pers = (a.per || []).filter(Boolean);
  let per = sel ? sel.value : pers[0] || '';
  let dt = dtDe(a.dt, x, rod);
  if (a.livre && per && !pers.includes(per)) dt = a.dtOutras !== undefined ? dtDe(a.dtOutras, x, rod) : dt;
  let t = null;
  if (per === 'forca') t = FX().rolarTeste(int(d.atr.for), 0);
  else if (per === 'ataque') { const p = at.r.bonus('luta') >= at.r.bonus('pontaria') ? 'luta' : 'pontaria'; t = FX().testarPericia(d, p, 0, 'ataque'); per = p; }
  else if (per) t = FX().testarPericia(d, per);
  const tot = t ? t.total : -1, nat = t ? t.esc : -1;
  const ok = !per ? true : dt === null ? null : tot >= dt;
  const suc = ok ? int(a.s) * (a.dobro && (tot >= dt + 10 || nat === 20) ? 2 : 1) : 0;
  // dano da própria ação (sempre) ou da falha
  let dano = 0, tipo = 'pv';
  const aplicar = (expr, tp) => { const r = rolar(expr); const v = Math.max(0, Math.round(r.total * multDano(x))); dano += v; tipo = tp || 'pv'; danoNaFicha(v, tipo); };
  if (a.dano) aplicar(a.dano, a.tipo);
  if (ok === false && a.danoFalha) aplicar(a.danoFalha, a.tipoFalha);
  gravarLog(x, { t: 'acao', s: A.meu, a: i, n: String(a.n).slice(0, 60), per, r: rod, tot, nat, dt: dt === null ? null : dt, ok, suc, dano, tipo });
  const txt = `${a.n}: ${per ? `${nomePer(per)} ${tot}${dt !== null ? ` contra DT ${dt}` : ''}, ${ok === null ? 'o Mestre decide' : ok ? `passou${suc > 1 ? ' (vale 2)' : ''}` : 'falhou'}` : 'feito'}${dano ? `; sofreu ${dano} ${tipo.toUpperCase()}` : ''}.`;
  A.aviso('⚠ ' + txt);
  A.rolagemDaFicha(`⚠ ${sala.nome} · ${txt}`, undefined, t ? t.dados : undefined, t ? t.bonus : undefined);
}
function danoNaFicha(v, tipo) {
  if (!v) return;
  const at = FX() && FX().ativa(); if (!at) return;
  const det = at.d.regra === 'determinacao';
  const k = tipo === 'san' ? (det ? 'pd' : 'san') : tipo === 'pe' ? (det ? 'pd' : 'pe') : 'pv';
  const mx = at.r[k + 'Max'];
  FX().aplicarNaAtiva([[k + '.a', Math.max(0, FX().atualDe(at.d, k, mx) - v)]]);
}
// efeito do início da rodada: cada participante rola a resistência na própria tela
function verEfeitoRodada(x) {
  const f = x.efr;
  if (!f || !participo(x) || int(f.rod) !== int(x.rod) || (f.para && !f.para[A.meu])) return;
  const chave = x.id + ':' + f.ts;
  if (UI.efrVisto === chave) return;
  if (entradas().some(e => e.s === A.meu && e.t === 'res' && int(e.r) === int(f.rod) && num(e.efr) === num(f.ts))) { UI.efrVisto = chave; return; }
  UI.efrVisto = chave;
  abrirResistencias(x, f);
}
function abrirResistencias(x, f) {
  let o = $('#expoRes');
  if (!o) { o = document.createElement('div'); o.id = 'expoRes'; o.className = 'rr-modal expo-res'; document.body.appendChild(o); }
  const testes = (f.testes || []);
  let i = 0;
  const passo = () => {
    if (i >= testes.length) { o.hidden = true; return; }
    const te = testes[i];
    o.innerHTML = `<div class="rr-modal-caixa ex-res-caixa" style="--el:${corEl((x.sala || {}).el)}"><p class="ex-k">${esc((x.sala || {}).nome || '')} · RODADA ${int(f.rod)}</p>
      <h3>${te.per ? `Teste de ${esc(nomePer(te.per))}${te.dt !== null ? ` · DT ${int(te.dt)}` : ''}` : 'Efeito sem teste'}</h3>
      <p>${esc(te.nota || '')}${te.dano ? ` Dano: <b>${esc(te.dano)}</b> ${esc(String(te.tipo || 'pv').toUpperCase())}${te.metade ? ' (passar reduz à metade)' : te.per ? ' (passar evita)' : ''}.` : ''}${te.cond ? ` Falhou: fica ${esc(te.cond)}.` : ''}</p>
      <div class="rr-botoes"><button data-er="rolar" class="pri">🎲 ${te.per ? 'Rolar' : 'Receber'}</button></div><div class="ex-res-saida"></div></div>`;
    o.hidden = false;
    $('[data-er="rolar"]', o).onclick = e => {
      e.target.disabled = true;
      const at = FX() && FX().ativa(); if (!at) { A.aviso('Ative sua ficha.'); return; }
      let t = null, ok = false;
      if (te.per === 'forca') t = FX().rolarTeste(int(at.d.atr.for), 0);
      else if (te.per) t = FX().testarPericia(at.d, te.per);
      if (t && te.dt !== null) ok = t.total >= int(te.dt);
      let dano = 0;
      if (te.dano) { const r = rolar(te.dano); dano = Math.max(0, Math.round(r.total * num(f.mult, 1))); if (ok) dano = te.metade ? Math.floor(dano / 2) : 0; }
      danoNaFicha(dano, te.tipo);
      gravarLog(x, { t: 'res', s: A.meu, n: te.per ? `Resistência (${nomePer(te.per)})` : 'Efeito da rodada', per: te.per || '', r: int(f.rod), efr: num(f.ts), ini: te.ini ? true : null, tot: t ? t.total : -1, nat: t ? t.esc : -1, dt: te.dt, ok, suc: 0, dano, tipo: te.tipo || 'pv' });
      $('.ex-res-saida', o).innerHTML = `<p>${t ? `${nomePer(te.per)} <b>${t.total}</b> (d20 ${t.esc}) · ${ok ? 'passou' : 'falhou'}` : ''}${dano ? ` · você sofre <b>${dano}</b> ${esc(String(te.tipo || 'pv').toUpperCase())}` : ok && te.dano ? ' · sem dano' : ''}${!ok && te.cond ? ` · fica ${esc(te.cond)} (o Mestre marca)` : ''}${te.ini && ok ? ' · você ganha uma ação extra nesta rodada' : ''}.</p><div class="rr-botoes"><button data-er="prox" class="pri">${i + 1 < testes.length ? 'Próximo teste' : 'Fechar'}</button></div>`;
      $('[data-er="prox"]', o).onclick = () => { i++; passo(); };
    };
  };
  passo();
}

/* =========================================================
   MESTRE: biblioteca, salas da planta, iniciar e conduzir
   ========================================================= */
const M = { alertados: new Set(), aba: 'planta', edit: null };
function salaPublica(s) {
  const { meta = {} } = s;
  return { id: s.id, nome: s.nome, el: s.el, vd: s.vd, modelo: s.modelo, obj: s.obj, desc: s.desc, rodTxt: (s.rodada || {}).txt || '',
    meta: { modo: meta.modo || 'grupo', rotulo: meta.rotulo || 'sucessos', sucessos: meta.sucessos || null, falhasMax: meta.falhasMax || null, rodadas: /^\d+$/.test(String(meta.rodadas || '')) ? meta.rodadas : null, distancia: meta.distancia || null, horda: meta.horda || null },
    acoes: (s.acoes || []).map(a => ({ n: a.n, per: a.per || [], livre: !!a.livre, dt: a.dt === undefined ? null : a.dt, dtOutras: a.dtOutras, s: int(a.s), dobro: !!a.dobro, dano: a.dano || '', tipo: a.tipo || '', danoFalha: a.danoFalha || '', tipoFalha: a.tipoFalha || '', txt: String(a.txt || '').slice(0, 900) })) };
}
function vigiarEntradas() {
  if (!A.mestre || !A.segredosProntos) return;
  const mp = mapaExpo(), x = est().expo;
  cobaias().forEach(c => {
    const cn = A.salaDe(c.id), chave = c.id + ':' + cn;
    if (!cn) return;
    const a = mp['c' + cn];
    if (!a || !lib()[a.s]) return;
    if (x && x.on && int(x.cn) === cn) return;
    if (M.alertados.has(chave)) return;
    M.alertados.add(chave);
    A.alertaMestre && A.alertaMestre(`⚠ ${c.nome} entrou em ${A.nomeSala(cn)}: ${lib()[a.s].nome}. Inicie pela aba Mesa → Salas de Exposição ou pelo cartão da sala.`);
    desenharBloco();
  });
  // esquece quem saiu, para avisar de novo se voltar
  [...M.alertados].forEach(k => { const [q, cn] = k.split(':'); if (String(A.salaDe(q)) !== cn) M.alertados.delete(k); });
}
function abrirInicio(cn) {
  const a = mapaExpo()['c' + cn], s = a && lib()[a.s]; if (!s) return;
  const presentes = cobaias().filter(c => A.salaDe(c.id) === cn).map(c => c.id);
  const meta = s.meta || {};
  let o = $('#expoIni');
  if (!o) { o = document.createElement('div'); o.id = 'expoIni'; o.className = 'rr-modal'; document.body.appendChild(o); }
  o.innerHTML = `<div class="rr-modal-caixa"><h3>Iniciar: ${esc(s.nome)}</h3><p class="rr-mini">${esc(A.nomeSala(cn))} · ${esc(s.el)} · VD ${esc(s.vd)}${s.rascunho ? ' · <b>rascunho</b>' : ''}</p>
    <p class="rr-mini"><b>Quem participa</b></p><div class="mesa-alvos">${cobaias().map(c => `<label class="chave"><input type="checkbox" data-ei-q="${c.id}" ${presentes.includes(c.id) ? 'checked' : ''}><span>${esc(c.nome)}</span></label>`).join('')}</div>
    ${(meta.opcoes || []).length ? `<label>Tamanho <select data-ei="op">${meta.opcoes.map((op, i) => `<option value="${i}">${esc(op.n)} · ${int(op.sucessos)} ${esc(meta.rotulo || 'sucessos')}</option>`).join('')}</select></label>` : ''}
    <div class="ses-grade"><label>Ajuste de DT <select data-ei="dt">${[-10, -5, 0, 5, 10].map(v => `<option value="${v}" ${v === 0 ? 'selected' : ''}>${v > 0 ? '+' : ''}${v}</option>`).join('')}</select></label>
    <label>Dano <select data-ei="dano"><option value="1">como está</option><option value="0.5">metade</option><option value="0.25">um quarto</option></select></label></div>
    ${meta.rodadas ? `<p class="rr-mini">Duração: ${esc(meta.rodadas)} rodadas${/d/.test(meta.rodadas) ? ' (o site rola agora e só você vê)' : ''}.</p>` : ''}
    <label class="chave"><input type="checkbox" data-ei="amb" checked><span>Trocar o ambiente sonoro para "${esc(s.amb || s.el)}"</span></label>
    <div class="rr-botoes"><button data-ei-b="cancelar">Cancelar</button><button data-ei-b="ir" class="pri">▶ Iniciar</button></div></div>`;
  o.hidden = false;
  o.onclick = e => {
    if (e.target === o || e.target.closest('[data-ei-b="cancelar"]')) { o.hidden = true; return; }
    if (!e.target.closest('[data-ei-b="ir"]')) return;
    const part = {}; $$('[data-ei-q]', o).forEach(c => { if (c.checked) part[c.dataset.eiQ] = true; });
    if (!Object.keys(part).length) { A.aviso('Escolha quem participa.'); return; }
    const opI = $('[data-ei="op"]', o), op = opI ? (meta.opcoes || [])[int(opI.value)] : null;
    const id = A.Rede.chave();
    const rodMax = meta.rodadas ? (/d/.test(meta.rodadas) ? rolar(meta.rodadas).total : int(meta.rodadas)) : null;
    A.gravarSegredo(['_expoRun', id], { rodMax, s: s.id, cn, ts: Date.now() });
    A.definir(['expo'], { id, on: true, cn, sala: salaPublica(s), part, rod: 1, meta: op ? int(op.sucessos) : (meta.sucessos || null), op: op ? op.n : '', aj: { dt: int($('[data-ei="dt"]', o).value), dano: num($('[data-ei="dano"]', o).value, 1) }, horda: meta.horda || null, ts: Date.now() });
    if ($('[data-ei="amb"]', o).checked) { const v0 = (est().amb || {}).vol; A.definir(['amb'], { el: s.amb || s.el, vol: v0 === undefined ? 85 : v0, ts: Date.now() }); }
    o.hidden = true; UI.previa = false;
  };
}
// efeito da rodada: o Mestre escolhe os testes e quem recebe; o site calcula a DT (rola os d6 que a regra pede) e manda
const testesDaSala = (s, x) => {
  const L = ((s.rodada || {}).testes || []).map(te => ({ ...te, marcado: !/^apenas|a partir d|nas rodadas|na \d|rodadas? \d/i.test(te.nota || '') }));
  const ini = (s.meta || {}).inicio;
  if (ini && int(x.rod) === 1) L.unshift({ per: ini.per, dt: ini.dt, dano: '', tipo: 'pv', nota: ini.txt || '', ini: true, marcado: true });
  return L;
};
function efeitoRodada() {
  const x = est().expo; if (!x || !x.on) return;
  const s = lib()[x.sala.id] || {}, L = testesDaSala(s, x);
  if (!L.length) { A.aviso('Esta sala não tem teste automático no início da rodada. Narre o efeito.'); return; }
  let o = $('#expoEfr');
  if (!o) { o = document.createElement('div'); o.id = 'expoEfr'; o.className = 'rr-modal'; document.body.appendChild(o); }
  o.innerHTML = `<div class="rr-modal-caixa"><h3>Efeito da rodada ${int(x.rod)}</h3><p class="rr-mini">${esc((s.rodada || {}).txt || '')}</p>
    <p class="rr-mini"><b>Testes</b> (os marcados com “apenas…” vêm desmarcados: escolha quem recebe)</p>
    ${L.map((te, i) => `<div class="ex-efr-linha"><label class="chave"><input type="checkbox" data-ef="${i}" ${te.marcado ? 'checked' : ''}><span>${te.ini ? '🔎 Teste inicial · ' : ''}${te.per ? `${esc(nomePer(te.per))} DT ${esc(String(te.dt))}` : 'Sem teste'}${te.dano ? ` · ${esc(te.dano)} ${esc(String(te.tipo || 'pv').toUpperCase())}` : ''}</span></label><small>${esc(te.nota || '')}</small>${te.dano ? `<label>Dano desta rodada <input data-efd="${i}" value="${esc(te.dano)}"></label>` : ''}</div>`).join('')}
    <p class="rr-mini"><b>Quem recebe</b></p><div class="mesa-alvos">${Object.keys(x.part || {}).map(q => `<label class="chave"><input type="checkbox" data-efq="${q}" checked><span>${esc(nomeDe(q))}</span></label>`).join('')}</div>
    <div class="rr-botoes"><button data-efb="cancelar">Cancelar</button><button data-efb="ir" class="pri">⚡ Mandar</button></div></div>`;
  o.hidden = false;
  o.onclick = e => {
    if (e.target === o || e.target.closest('[data-efb="cancelar"]')) { o.hidden = true; return; }
    if (!e.target.closest('[data-efb="ir"]')) return;
    const testes = L.map((te, i) => [te, i]).filter(([, i]) => $(`[data-ef="${i}"]`, o).checked).map(([te, i]) => { const di = $(`[data-efd="${i}"]`, o); return { per: te.per || '', dt: te.per ? dtDe(te.dt, x, x.rod) : null, dano: di ? di.value.trim() : '', tipo: te.tipo || 'pv', metade: !!te.metade, cond: te.cond || '', nota: te.nota || '', ini: !!te.ini }; });
    const para = {}; $$('[data-efq]', o).forEach(c => { if (c.checked) para[c.dataset.efq] = true; });
    if (!testes.length || !Object.keys(para).length) { A.aviso('Marque pelo menos um teste e uma cobaia.'); return; }
    A.definir(['expo', 'efr'], { rod: x.rod, ts: Date.now(), testes, mult: multDano(x), para });
    o.hidden = true;
  };
}
function rolarEvento() {
  const x = est().expo; if (!x || !x.on) return;
  const ev = (lib()[x.sala.id] || {}).eventos; if (!ev || !ev.lista) return;
  const r = rolar(ev.dado || '1d6').total, e = ev.lista.find(l => r >= int(l.de) && r <= int(l.ate || l.de));
  A.definir(['expo', 'evento'], { rod: x.rod, r, dado: ev.dado, t: e ? e.t : 'Nada acontece.', ts: Date.now() });
}

/* ---------- Bloco do Mestre ---------- */
function desenharBloco(leve) {
  const c = $('#mesaExpo'); if (!c || !A.mestre) return;
  const a = document.activeElement; if (a && c.contains(a) && a.matches('input:not([type=checkbox]), select, textarea')) return;
  const x = est().expo, L = lib(), mp = mapaExpo();
  if (x && x.on) ouvirLog(x.id); else if (!x || !x.on) ouvirLog(x && x.id ? x.id : '');
  let html;
  if (x && x.on) {
    const pr = progresso(x), run = (sg()._expoRun || {})[x.id] || {}, s = L[x.sala.id] || {}, need = int(x.meta);
    const pend = entradas().filter(e => e.t === 'acao' && e.ok === null && !entradas().some(z => z.t === 'adj' && z.ref === e.k));
    html = `<p class="mini"><b style="color:${corEl(x.sala.el)}">${esc(x.sala.nome)}</b> · ${esc(A.nomeSala(int(x.cn)))}${x.op ? ` · ${esc(x.op)}` : ''} · ajuste DT ${int((x.aj || {}).dt) >= 0 ? '+' : ''}${int((x.aj || {}).dt)}, dano ×${num((x.aj || {}).dano, 1)}</p>
      <div class="ex-m-topo"><div class="ex-rodada-box"><b>${int(x.rod)}</b><small>rodada${run.rodMax ? ` de ${run.rodMax}` : ''}</small></div>
        <div class="mesa-linha"><button data-xm="rod" class="btn-protocolo">Próxima rodada</button><button data-xm="efr" ${((s.rodada || {}).testes || []).length ? '' : 'disabled'}>⚡ Efeito da rodada</button>${s.eventos ? '<button data-xm="ev">🎲 Evento</button>' : ''}<button data-xm="previa">👁 Ver como jogador</button></div></div>
      ${run.rodMax && int(x.rod) >= run.rodMax ? `<p class="ex-alerta">Última rodada (${run.rodMax}).</p>` : ''}
      ${s.rodada && s.rodada.txt ? `<p class="mini"><b>Início da rodada:</b> ${esc(s.rodada.txt)}</p>` : ''}
      ${x.evento && int(x.evento.rod) === int(x.rod) ? `<p class="ex-evento">🎲 ${int(x.evento.r)}: ${esc(x.evento.t)}</p>` : ''}
      ${x.sala.modelo === 'horda' ? `<div class="mesa-linha"><span>Horda ${int(x.horda)} PV</span><input id="exHorda" type="number" placeholder="dano" style="width:80px"><button data-xm="horda">− dano</button></div>` : ''}
      ${need ? `<p class="mini">${x.sala.meta.modo === 'individual' ? 'Cada um precisa de' : 'O grupo precisa de'} ${need} ${esc(x.sala.meta.rotulo || 'sucessos')}${x.sala.meta.modo !== 'individual' ? ` · grupo ${pr.grupo}/${need}` : ''}${x.sala.meta.falhasMax ? ` · falhas ${pr.falhas}/${x.sala.meta.falhasMax}` : ''}</p>` : ''}
      <table class="ex-tab"><tr><th>Cobaia</th><th>${esc(x.sala.meta.rotulo || 'Suc.')}</th><th>Falhas</th><th>Rodada</th><th></th></tr>${Object.keys(x.part || {}).map(q => `<tr><td>${esc(nomeDe(q))}</td><td><b>${pr.p[q] || 0}</b></td><td>${pr.f[q] || 0}</td><td>${pr.feitos[q] ? '✓ agiu' : '…'}</td><td><button data-xm="adj" data-q="${q}" data-v="1">+1</button><button data-xm="adj" data-q="${q}" data-v="-1">−1</button></td></tr>`).join('')}</table>
      ${pend.length ? `<p class="mesa-k">VOCÊ DECIDE</p>${pend.map(e => `<div class="mesa-linha"><span>${esc(nomeDe(e.s))}: ${esc(e.n)} (${esc(nomePer(e.per))} ${e.tot})</span><button data-xm="dec" data-k="${e.k}" data-q="${e.s}" data-v="${int(((x.sala.acoes || [])[e.a] || {}).s)}">✓ passou</button><button data-xm="dec" data-k="${e.k}" data-q="${e.s}" data-v="0">✗ falhou</button></div>`).join('')}` : ''}
      <details><summary>Registro (${entradas().length})</summary><ul class="ex-log">${entradas().slice(-30).reverse().map(e => `<li>${esc(nomeDe(e.s))} · r${int(e.r)} · ${esc(e.n || e.t)}${e.tot >= 0 ? ` ${e.tot}` : ''}${e.dt ? `/${e.dt}` : ''} ${e.t === 'res' ? (e.ok ? 'resistiu' : 'falhou') : e.ok === null ? '⏳' : e.ok ? '✅' : e.t === 'adj' ? '' : '❌'}${int(e.suc) ? ` +${e.suc}` : ''}${e.dano ? ` −${e.dano} ${esc(String(e.tipo || '').toUpperCase())}` : ''}</li>`).join('')}</ul></details>
      <details><summary>Regras da sala</summary><p class="mini"><b>Efeito:</b> ${esc(s.efeito || '')}</p>${s.extra ? `<p class="mini"><b>Extra:</b> ${esc(s.extra)}</p>` : ''}</details>
      <div class="mesa-linha"><button data-xm="fim" class="perigo">■ Encerrar a sala</button></div>`;
  } else {
    const porEl = {}; Object.entries(L).forEach(([id, s]) => { if (s) (porEl[s.el || 'Varia'] = porEl[s.el || 'Varia'] || []).push([id, s]); });
    const andar = A.andarAtual || 1, cns = Array.from({ length: 25 }, (_, i) => (andar - 1) * 25 + i + 1);
    const naPlanta = Object.entries(mp).filter(([, v]) => v && L[v.s]).map(([k, v]) => [int(k.slice(1)), v]);
    html = `<p class="mini">Biblioteca: ${Object.keys(L).length} sala${Object.keys(L).length === 1 ? '' : 's'}. Coloque cada uma numa sala da planta; quando uma cobaia entrar, você recebe um aviso e inicia.</p>
      <div class="mesa-linha"><label class="amb-arq">⬆ Importar salas<input type="file" id="exImp" accept=".json,application/json" hidden></label><button data-xm="exp" ${Object.keys(L).length ? '' : 'disabled'}>⬇ Exportar</button><button data-xm="nova">+ Nova sala</button></div>
      <p class="mesa-k">NA PLANTA</p>
      ${naPlanta.length ? `<ul class="ex-planta">${naPlanta.sort((a, b) => a[0] - b[0]).map(([cn, v]) => { const s = L[v.s], dentro = cobaias().filter(c => A.salaDe(c.id) === cn); return `<li style="--el:${corEl(s.el)}"><span><b>${esc(A.nomeSala(cn))}</b> → ${esc(s.nome)}${dentro.length ? ` <em>· dentro: ${dentro.map(c => esc(c.nome)).join(', ')}</em>` : ''}</span><button data-xm="ini" data-cn="${cn}" class="${dentro.length ? 'pri' : ''}">▶ Iniciar</button><button data-xm="tirar" data-cn="${cn}" aria-label="Tirar">×</button></li>`; }).join('')}</ul>` : '<p class="mini">Nenhuma ainda.</p>'}
      <div class="mesa-linha"><select id="exSala">${Object.entries(porEl).map(([el, ls]) => `<optgroup label="${esc(el)}">${ls.sort((a, b) => a[1].nome.localeCompare(b[1].nome, 'pt')).map(([id, s]) => `<option value="${esc(id)}">${esc(s.nome)} · VD ${esc(s.vd)}${s.rascunho ? ' (rascunho)' : ''}</option>`).join('')}</optgroup>`).join('')}</select>
        <select id="exCn">${cns.map(cn => `<option value="${cn}">${esc(A.nomeSala(cn))}</option>`).join('')}</select><button data-xm="por" ${Object.keys(L).length ? '' : 'disabled'}>📍 Colocar</button></div>
      <details><summary>Biblioteca por elemento</summary>${Object.entries(porEl).map(([el, ls]) => `<p class="mesa-k" style="color:${corEl(el)}">${esc(el.toUpperCase())}</p><ul class="ex-bib">${ls.map(([id, s]) => `<li><span>${esc(s.nome)} <small>VD ${esc(s.vd)} · ${esc(s.modelo)}${s.rascunho ? ' · rascunho' : ''}</small></span><button data-xm="editar" data-id="${esc(id)}">✎</button><button data-xm="apagar" data-id="${esc(id)}" aria-label="Apagar">×</button></li>`).join('')}</ul>`).join('')}</details>
      ${(sg()._expoVar || []).length ? `<details><summary>Variações (${sg()._expoVar.length})</summary>${sg()._expoVar.map(v => `<p class="mini"><b>${esc(v.nome)}</b> (${esc(v.el)}): ${esc(v.txt)}</p>`).join('')}</details>` : ''}`;
  }
  const chave = JSON.stringify([html.length, x && x.on, x && x.rod, Object.keys(LOG.v || {}).length]);
  if (leve && c.dataset.k === chave) return;
  c.dataset.k = chave; c.innerHTML = html;
  const imp = $('#exImp', c); if (imp) imp.onchange = e => { importar(e.target.files[0]); e.target.value = ''; };
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-xm]'); if (!b || !A.mestre) return;
  const a = b.dataset.xm, x = est().expo;
  if (a === 'ini') abrirInicio(int(b.dataset.cn));
  else if (a === 'tirar') { if (confirm('Tirar a sala de exposição daqui?')) A.gravarSegredo(['_expoMapa', 'c' + b.dataset.cn], null); setTimeout(() => desenharBloco(), 50); }
  else if (a === 'por') { const id = $('#exSala').value, cn = int($('#exCn').value); if (!id || !cn) return; A.gravarSegredo(['_expoMapa', 'c' + cn], { s: id }); setTimeout(() => desenharBloco(), 50); }
  else if (a === 'rod' && x) { A.definir(['expo'], { ...x, rod: int(x.rod) + 1, efr: null }); }
  else if (a === 'efr') efeitoRodada();
  else if (a === 'ev') rolarEvento();
  else if (a === 'previa') { UI.previa = true; UI.min = false; desenharTela(); }
  else if (a === 'adj' && x) gravarLog(x, { t: 'adj', s: b.dataset.q, n: 'Ajuste do Mestre', r: int(x.rod), suc: int(b.dataset.v), tot: -1 });
  else if (a === 'dec' && x) gravarLog(x, { t: 'adj', s: b.dataset.q, ref: b.dataset.k, n: int(b.dataset.v) ? 'Mestre: passou' : 'Mestre: falhou', r: int(x.rod), suc: int(b.dataset.v), tot: -1 });
  else if (a === 'horda' && x) { const v = int(($('#exHorda') || {}).value); if (v) A.definir(['expo', 'horda'], Math.max(0, int(x.horda) - v)); }
  else if (a === 'fim' && x) { if (confirm(`Encerrar ${x.sala.nome}?`)) { A.definir(['expo'], { ...x, on: false, fimTs: Date.now() }); UI.previa = false; } }
  else if (a === 'exp') exportar();
  else if (a === 'nova') abrirEditor(null);
  else if (a === 'editar') abrirEditor(b.dataset.id);
  else if (a === 'apagar') { const s = lib()[b.dataset.id]; if (s && confirm(`Apagar "${s.nome}" da biblioteca?`)) A.gravarSegredo(['_expo', b.dataset.id], null); setTimeout(() => desenharBloco(), 50); }
});

/* ---------- importar, exportar, editar ---------- */
const limparId = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'sala';
function importar(arq) {
  if (!arq) return;
  arq.text().then(t => {
    let o; try { o = JSON.parse(t); } catch (e) { A.aviso('Arquivo inválido.'); return; }
    const salas = o && o.tipo === 'planta-acf-exposicao' && Array.isArray(o.salas) ? o.salas.filter(s => s && s.nome) : [];
    if (!salas.length) { A.aviso('Esse arquivo não tem salas de exposição.'); return; }
    const L = lib(), novas = salas.filter(s => !L[limparId(s.id || s.nome)]), iguais = salas.length - novas.length;
    const subst = iguais && confirm(`${iguais} sala(s) já existem na biblioteca. Substituir por estas?`);
    let n = 0;
    salas.forEach(s => { const id = limparId(s.id || s.nome); if (L[id] && !subst) return; A.gravarSegredo(['_expo', id], { ...s, id }); n++; });
    if (Array.isArray(o.variacoes) && o.variacoes.length) A.gravarSegredo(['_expoVar'], o.variacoes.slice(0, 60));
    A.aviso(`${n} sala${n === 1 ? '' : 's'} de exposição importada${n === 1 ? '' : 's'}.`);
    setTimeout(() => desenharBloco(), 80);
  });
}
function exportar() {
  const blob = new Blob([JSON.stringify({ tipo: 'planta-acf-exposicao', versao: 1, salas: Object.values(lib()).filter(Boolean), variacoes: sg()._expoVar || [] }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `salas-exposicao-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  A.aviso('Exportado. O arquivo tem as regras das salas: guarde só com você.');
}
const MODELOS = [['travessia', 'Travessia (caminho em etapas)'], ['zonas', 'Fuga por zonas'], ['mare', 'Corrida contra a maré'], ['paredes', 'Paredes que fecham'], ['labirinto', 'Labirinto'], ['desabamento', 'Desabamento'], ['horda', 'Horda'], ['livre', 'Cena livre']];
function abrirEditor(id) {
  const s = id ? lib()[id] || {} : { nome: '', el: 'Sangue', vd: '', modelo: 'livre', meta: { modo: 'grupo', rotulo: 'sucessos' }, acoes: [], rodada: null, eventos: null };
  let o = $('#expoEd');
  if (!o) { o = document.createElement('div'); o.id = 'expoEd'; o.className = 'rr-modal'; document.body.appendChild(o); }
  const j = v => esc(JSON.stringify(v === undefined ? null : v, null, 1));
  o.innerHTML = `<div class="rr-modal-caixa ex-ed"><h3>${id ? 'Editar sala de exposição' : 'Nova sala de exposição'}</h3>
    <div class="ses-grade"><label>Nome <input data-ed="nome" value="${esc(s.nome || '')}"></label><label>Elemento <select data-ed="el">${Object.keys(ELEM).map(e => `<option ${s.el === e ? 'selected' : ''}>${e}</option>`).join('')}</select></label>
    <label>VD <input data-ed="vd" value="${esc(s.vd || '')}"></label><label>Mapa <select data-ed="modelo">${MODELOS.map(([k, n]) => `<option value="${k}" ${s.modelo === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label>Ambiente <input data-ed="amb" value="${esc(s.amb || '')}" placeholder="ex.: Goteira"></label><label class="chave"><input type="checkbox" data-ed="rascunho" ${s.rascunho ? 'checked' : ''}><span>Rascunho</span></label></div>
    <label>Descrição (os jogadores leem) <textarea data-ed="desc" rows="4">${esc(s.desc || '')}</textarea></label>
    <label>Objetivo <input data-ed="obj" value="${esc(s.obj || '')}"></label>
    <label>Efeito (só você lê) <textarea data-ed="efeito" rows="4">${esc(s.efeito || '')}</textarea></label>
    <label>Extra <textarea data-ed="extra" rows="2">${esc(s.extra || '')}</textarea></label>
    <details><summary>Avançado: meta, ações, rodada e eventos (JSON)</summary><p class="rr-mini">Formato igual ao do arquivo de importação. Ação: {"n":"Correr","per":["atletismo"],"dt":20,"s":1,"dobro":true,"txt":"…"}.</p>
      <label>Meta <textarea data-edj="meta" rows="5">${j(s.meta)}</textarea></label><label>Ações <textarea data-edj="acoes" rows="8">${j(s.acoes)}</textarea></label>
      <label>Rodada <textarea data-edj="rodada" rows="5">${j(s.rodada)}</textarea></label><label>Eventos <textarea data-edj="eventos" rows="5">${j(s.eventos)}</textarea></label></details>
    <div class="rr-botoes"><button data-edb="cancelar">Cancelar</button><button data-edb="salvar" class="pri">Salvar</button></div></div>`;
  o.hidden = false;
  o.onclick = e => {
    if (e.target === o || e.target.closest('[data-edb="cancelar"]')) { o.hidden = true; return; }
    if (!e.target.closest('[data-edb="salvar"]')) return;
    const v = { ...s };
    $$('[data-ed]', o).forEach(i => { v[i.dataset.ed] = i.type === 'checkbox' ? i.checked : i.value.trim(); });
    try { $$('[data-edj]', o).forEach(t => { v[t.dataset.edj] = JSON.parse(t.value || 'null'); }); } catch (err) { A.aviso('JSON inválido nos campos avançados: ' + err.message); return; }
    if (!v.nome) { A.aviso('Dê um nome à sala.'); return; }
    const nid = id || limparId(v.nome);
    A.gravarSegredo(['_expo', nid], { ...v, id: nid });
    o.hidden = true; setTimeout(() => desenharBloco(), 60);
  };
}

/* ---------- cartão da sala (Mestre) ---------- */
A.ganchoSala({
  mestre(cn) {
    const a = mapaExpo()['c' + cn], s = a && lib()[a.s];
    if (!s) return '';
    return `<div class="ex-cartao" style="--el:${corEl(s.el)}"><b>⚠ Sala de Exposição:</b> ${esc(s.nome)} <small>VD ${esc(s.vd)}</small> <button data-ex-cn="${cn}">▶ Iniciar</button></div>`;
  },
  ligar(c, cn) { if (!A.mestre) return; $$('[data-ex-cn]', c).forEach(b => b.onclick = () => abrirInicio(int(b.dataset.exCn))); },
});

/* ---------- Ligações ---------- */
let ag = false;
function tudo() {
  if (ag) return; ag = true;
  requestAnimationFrame(() => {
    ag = false;
    try {
      const x = est().expo;
      if (x && x.on && (participo(x) || A.mestre)) ouvirLog(x.id);
      vigiarEntradas(); desenharTela(); desenharBloco(true);
    } catch (err) { console.warn('exposicao:', err); }
  });
}
A.aoMudar(tudo);
document.addEventListener('acf-segredos', () => setTimeout(() => desenharBloco(), 30));
document.addEventListener('acf-perfil', () => setTimeout(tudo, 60));
document.addEventListener('acf-ativa', () => setTimeout(tudo, 60));
setTimeout(tudo, 500);
window.ACF_EXPO = { importar, htmlMapa, progresso };
})();
