/* =========================================================
   A CAIXA DE FÓSFOROS · sons-filhos.js
   Sons gravados das criaturas, com posição no espaço.

   Cada forma 3D de Filho tem 7 arquivos na pasta sons/filhos/, com o nome da forma na frente:
     <forma>-respira.mp3 (loop parado) · <forma>-move.mp3 (loop andando) · <forma>-voz1..3.mp3
     (vozes ao acaso) · <forma>-ataque.mp3 · <forma>-revela.mp3
   e sons/filhos/indice.json diz quais formas têm sons, o tamanho exato de cada loop,
   quais formas são quase mudas e as palavras das legendas. Para trocar um som, basta
   substituir o arquivo de mesmo nome (veja o README).

   Quem ouve o quê:
   - Mestre e auxiliares: as posições reais dos Filhos do andar aberto.
   - Jogador: só o que a tela do Mestre publica em ecos3d (posição aproximada, sem dizer
     quem; momento.js), que já respeita "passos silenciosos" e a chave de sons do Mestre.
     Sem arquivo para a forma, momento.js toca o som sintetizado de sempre (reserva).
   - Ataque e revelação tocam nos mesmos momentos em que o 3D chama acao('ataque'|'revelar').
   Os sons de uma forma só são baixados quando ela aparece no andar (ou num eco) e são
   liberados quando ela sai. O áudio só começa depois do primeiro toque (regra do navegador)
   e respeita o mudo do site e o volume do ambiente das Opções do 3D.

   Legendas de som (opção, desligada por padrão): "[um rosnado ao norte]", sem dizer o que é.
   O código é genérico: nenhum nome de Filho aqui; só as formas (aparência).
   ========================================================= */
(() => {
'use strict';
const A = () => window.ACF;
const S3 = () => window.Sala3D;
const BASE = 'sons/filhos/', VER = '20261031t';
const SONS = ['respira', 'move', 'voz1', 'voz2', 'voz3', 'ataque', 'revela'];
const ALC = 18, FOLGA = 4;           // metros: alcance do som e folga antes de soltar a fonte
const LEG_I = { respira: 0, move: 1, voz: 2, ataque: 3, revela: 4 };
const agora = () => Date.now();
const rnd = (a, b) => a + Math.random() * (b - a);
const ls = { get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const est = () => (A() && A().estado) || {};
const SERd = id => ((A() && A().SER) || {})[id];
const tipoDe = tk => ((tk && SERd(tk.s)) || {}).tipo || '';
const formaDe = (id, tk) => String(tk.fm || (est().formas || {})[tk.s] || (est().formas || {})[id] || '');
const celular = () => Math.min(innerWidth, innerHeight) < 700 || matchMedia('(pointer: coarse)').matches;
const souGM = () => !!(A() && (A().mestre || A().aux));
const souJog = () => !!(A() && !A().mestre && !A().aux && A().meu);
const sonsDoMestre = () => (((est().cfg || {}).momento) || {}).sons !== false;

let ctx = null, saida = null, indice = null, pedIndice = null;
let legOn = !!ls.get('acf-sons-legendas', false);
const bufs = new Map();     // forma -> { b: {som: AudioBuffer}, ok, p, usado }
const fontes = new Map();   // chave -> fonte com loops (Filho do mapa ou eco)
const ultPos = new Map(), andou = new Map(), ultFx = new Map(), ultRv = new Map(), alias = new Map();
const stats = { panners: 0, loops: 0, unicos: 0, baixados: [], legendas: [] };

/* ---------------- contexto (só depois de um toque) ---------------- */
function preparar() {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try {
    if (!ctx) { ctx = (A() && A().Som && A().Som.pronto && A().Som.pronto()) || new AC(); saida = ctx.createGain(); saida.gain.value = 0; saida.connect(ctx.destination); }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch (e) { ctx = null; }
  carregarIndice();
}
['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, preparar, { passive: true, capture: true }));
const pronto = () => !!ctx && ctx.state === 'running' && !!indice;

function carregarIndice() {
  if (pedIndice) return pedIndice;
  pedIndice = fetch(BASE + 'indice.json?v=' + VER).then(r => (r.ok ? r.json() : null)).catch(() => null)
    .then(j => { indice = j && j.formas ? j : { sr: 24000, formas: {} }; return indice; });
  return pedIndice;
}
const infoDe = f => (indice && indice.formas && indice.formas[f]) || null;

/* ---------------- arquivos: baixa sob demanda, libera quando ninguém usa ---------------- */
function decodificar(ab) {
  return new Promise((ok, erro) => { try { const p = ctx.decodeAudioData(ab, ok, erro); if (p && p.then) p.then(ok, erro); } catch (e) { erro(e); } });
}
function carregar(forma) {
  let c = bufs.get(forma);
  if (c) { c.usado = agora(); return c; }
  c = { b: {}, ok: false, usado: agora() };
  c.p = Promise.all(SONS.map(k => fetch(`${BASE}${forma}-${k}.mp3?v=${VER}`)
    .then(r => { if (!r.ok) throw new Error(String(r.status)); stats.baixados.push(forma + '/' + k); return r.arrayBuffer(); })
    .then(decodificar).then(b => { c.b[k] = b; }).catch(() => {})))
    .then(() => { c.ok = !!(c.b.respira || c.b.move || c.b.ataque); });
  bufs.set(forma, c);
  return c;
}
// o MP3 pode chegar com o atraso do codificador no começo: o índice guarda o tamanho exato do loop
function regiao(forma, k, b) {
  const inf = infoDe(forma), n = inf && inf.n && inf.n[k], sr = (indice && indice.sr) || 24000;
  if (!n) return null;
  const d = n / sr;
  if (Math.abs(b.duration - d) < .012) return null;
  if (b.duration > d + .012 && b.duration < d + .3) { const ini = 1105 / sr; return [ini, ini + d]; }
  return null;   // arquivo trocado à mão: faz o loop do arquivo inteiro
}

/* ---------------- fontes no espaço ---------------- */
function panner() {
  const p = ctx.createPanner();
  p.panningModel = celular() ? 'equalpower' : 'HRTF'; p.distanceModel = 'linear';
  p.refDistance = 1; p.maxDistance = ALC; p.rolloffFactor = 1;
  stats.panners++;
  return p;
}
function por(p, x, y, z, suave) {
  const t = ctx.currentTime;
  if (p.positionX) {
    if (suave) { p.positionX.setTargetAtTime(x, t, .25); p.positionY.setTargetAtTime(y, t, .25); p.positionZ.setTargetAtTime(z, t, .25); }
    else { p.positionX.setValueAtTime(x, t); p.positionY.setValueAtTime(y, t); p.positionZ.setValueAtTime(z, t); }
  } else p.setPosition(x, y, z);
}
function criarFonte(chave, forma) {
  const p = panner(), g = ctx.createGain(); g.gain.value = 0; g.connect(p); p.connect(saida);
  return { chave, forma, p, g, loops: {}, novo: true, andarAte: 0, respAte: 0, vivo: agora(), proxVoz: agora() + rnd(20000, 60000), leg: {} };
}
function loopDe(f, k) {
  if (f.loops[k]) return f.loops[k];
  const c = bufs.get(f.forma), b = c && c.b[k]; if (!b) return null;
  const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
  const r = regiao(f.forma, k, b); if (r) { s.loopStart = r[0]; s.loopEnd = r[1]; }
  const g = ctx.createGain(); g.gain.value = 0; s.connect(g); g.connect(f.g);
  const ini = r ? r[0] : 0, dur = r ? r[1] - r[0] : b.duration;
  s.start(ctx.currentTime, ini + Math.random() * dur * .9);   // cada um começa num ponto diferente do loop
  stats.loops++;
  return (f.loops[k] = { s, g });
}
function soltar(f) {
  if (!f || f.solto) return; f.solto = true;
  try { f.g.gain.setTargetAtTime(0, ctx.currentTime, .4); } catch (e) {}
  setTimeout(() => { Object.values(f.loops).forEach(l => { try { l.s.stop(); l.s.disconnect(); } catch (e) {} try { l.g.disconnect(); } catch (e) {} }); try { f.g.disconnect(); f.p.disconnect(); } catch (e) {} }, 2200);
}
// som único (voz, ataque, revelação) num ponto do espaço
function tocarEm(forma, k, X, Y, Z, ganho = 1) {
  const c = bufs.get(forma), b = c && c.b[k]; if (!b) return false;
  const p = panner(); por(p, X, Y, Z, false); p.connect(saida);
  const s = ctx.createBufferSource(); s.buffer = b; const g = ctx.createGain(); g.gain.value = ganho;
  s.connect(g); g.connect(p); s.start();
  s.onended = () => { try { s.disconnect(); g.disconnect(); p.disconnect(); } catch (e) {} };
  stats.unicos++;
  return true;
}

/* ---------------- quem escuta: a câmera do 3D ou o token no 2D ---------------- */
function ouvinte() {
  const s3 = S3(), ap = s3 && s3.aberta && s3._api;
  if (ap && ap.camera && ap.planta3D) {
    const c = ap.camera, f = new ap.T.Vector3(); c.getWorldDirection(f);
    let x = c.position.x, y = c.position.y, z = c.position.z;
    // câmera do alto (vista livre ou de fora): quem escuta é o ponto do chão para onde ela olha
    if (y > 3 && f.y < -.15) { const t = Math.min(60, (y - 1.6) / -f.y); x += f.x * t; z += f.z * t; y = 1.6; }
    return { a: ap.a, x, y, z, fx: f.x, fz: f.z, d3: true, conv: (px, py) => ap.planta3D(px, py) };
  }
  const mu = A().geo.M_POR_UNID, tks = est().tokens || {};
  const id = souJog() ? A().meu : A().selecionado, tk = id && tks[id];
  if (!tk || !tk.a) return null;
  if (souGM() && tk.a !== A().andarAtual) return null;
  return { a: tk.a, x: tk.x * mu, y: 1.6, z: tk.y * mu, fx: 0, fz: -1, d3: false, conv: (x, y) => [x * mu, y * mu] };
}
function porOuvinte(o) {
  const L = ctx.listener, t = ctx.currentTime, n = Math.hypot(o.fx, o.fz) || 1, fx = o.fx / n, fz = o.fz / n;
  if (L.positionX) {
    L.positionX.setTargetAtTime(o.x, t, .05); L.positionY.setTargetAtTime(o.y, t, .05); L.positionZ.setTargetAtTime(o.z, t, .05);
    L.forwardX.setTargetAtTime(fx, t, .05); L.forwardY.setTargetAtTime(0, t, .05); L.forwardZ.setTargetAtTime(fz, t, .05);
    L.upX.setValueAtTime(0, t); L.upY.setValueAtTime(1, t); L.upZ.setValueAtTime(0, t);
  } else { L.setPosition(o.x, o.y, o.z); L.setOrientation(fx, 0, fz, 0, 1, 0); }
}
function volume() {
  if (!A() || A().mudo) return 0;
  if (souJog() && !sonsDoMestre()) return 0;
  const s3 = S3(), ap = s3 && s3.aberta && s3._api;
  if (ap) { if (s3.Som && s3.Som.ligado === false) return 0; return .9 * ((ap.CFG && ap.CFG.volAmb) ?? 1); }
  const cfg = ls.get('acf-s3d-cfg', {}) || {};
  return .9 * (typeof cfg.volAmb === 'number' ? cfg.volAmb : 1);
}

/* ---------------- legendas de som ---------------- */
function rumo(X, Z, o) {
  const dx = X - o.x, dz = Z - o.z, d = Math.hypot(dx, dz);
  if (d < 2.5) return 'muito perto';
  let txt;
  if (o.d3) {
    // em relação a para onde a câmera olha
    const n = Math.hypot(o.fx, o.fz) || 1, fx = o.fx / n, fz = o.fz / n;
    const frente = (dx * fx + dz * fz) / d, lado = (dx * -fz + dz * fx) / d;   // lado > 0: direita
    txt = frente > .7 ? 'à frente' : frente < -.7 ? 'atrás de você' : lado > 0 ? 'à direita' : 'à esquerda';
  } else {
    // no mapa, o norte fica para cima
    const ang = Math.atan2(dx, -dz) * 180 / Math.PI, i = Math.round(((ang + 360) % 360) / 45) % 8;
    txt = ['ao norte', 'a nordeste', 'a leste', 'a sudeste', 'ao sul', 'a sudoeste', 'a oeste', 'a noroeste'][i];
  }
  return d > 12 ? txt + ', longe' : txt;
}
let caixaLeg = null;
function legenda(forma, tipo, X, Z, o) {
  if (!legOn) return;
  const inf = infoDe(forma); if (!inf || !inf.leg) return;
  const t = `[${inf.leg[LEG_I[tipo]] || 'um som'} ${rumo(X, Z, o)}]`;
  stats.legendas.push(t); if (stats.legendas.length > 30) stats.legendas.shift();
  if (!caixaLeg || !document.body.contains(caixaLeg)) {
    caixaLeg = document.createElement('div'); caixaLeg.id = 'sfLeg'; caixaLeg.setAttribute('aria-live', 'polite');
    caixaLeg.style.cssText = 'position:fixed;left:50%;bottom:22%;transform:translateX(-50%);z-index:2147483000;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:4px;max-width:calc(100vw - 32px);';
    document.body.appendChild(caixaLeg);
  }
  const l = document.createElement('div');
  l.textContent = t;
  l.style.cssText = 'font:500 13px/1.35 system-ui,sans-serif;color:#efe8fa;background:rgba(10,8,14,.72);padding:3px 10px;border-radius:6px;letter-spacing:.02em;text-align:center;transition:opacity .6s;opacity:0;';
  caixaLeg.appendChild(l); requestAnimationFrame(() => { l.style.opacity = '1'; });
  while (caixaLeg.children.length > 3) caixaLeg.firstChild.remove();
  setTimeout(() => { l.style.opacity = '0'; setTimeout(() => l.remove(), 700); }, 3600);
}
function legLoop(f, tipo, X, Z, o, d) {
  if (!legOn) return;
  if (tipo === 'respira' && d > 8) return;   // respiração só se percebe de perto
  if (agora() - (f.leg[tipo] || 0) < 15000) return;
  f.leg[tipo] = agora(); legenda(f.forma, tipo, X, Z, o);
}

/* ---------------- mistura de cada fonte: respira parado, move andando, voz rara ---------------- */
function misturar(f, andando, ativo, X, Z, o) {
  const t = ctx.currentTime, inf = infoDe(f.forma) || {}, d = Math.hypot(X - o.x, Z - o.z);
  const lr = loopDe(f, 'respira'), lm = loopDe(f, 'move');
  if (lr) lr.g.gain.setTargetAtTime(andando ? .35 : 1, t, .4);
  if (lm) lm.g.gain.setTargetAtTime(andando ? 1 : 0, t, andando ? .12 : .5);
  f.g.gain.setTargetAtTime(ativo ? 1 : 0, t, ativo ? .3 : .8);
  if (!ativo || d > ALC) return;
  legLoop(f, andando ? 'move' : 'respira', X, Z, o, d);
  // voz ao acaso: rara (a cada 20 a 60 s), mais perto, mais chance; as formas quase mudas não falam
  if (!inf.sil && agora() > f.proxVoz) {
    if (Math.random() < Math.max(.15, 1 - d / ALC)) {
      if (tocarEm(f.forma, 'voz' + (1 + Math.floor(Math.random() * 3)), X, 1.4, Z)) legenda(f.forma, 'voz', X, Z, o);
      f.proxVoz = agora() + rnd(20000, 60000);
    } else f.proxVoz = agora() + rnd(8000, 20000);
  }
}

// Mestre e auxiliares: os Filhos de verdade no andar aberto
function atualizarReal(o) {
  const tks = est().tokens || {}, vistos = new Set();
  if (o) Object.entries(tks).forEach(([id, tk]) => {
    if (!tk || tipoDe(tk) !== 'filho' || tk.a !== o.a || tk.fo) return;   // forma de objeto: parado e mudo
    const forma = formaDe(id, tk); if (!infoDe(forma)) return;
    const c = carregar(forma);
    const ant = ultPos.get(id); if (ant && Math.hypot(ant[0] - tk.x, ant[1] - tk.y) > .02) andou.set(id, agora());
    ultPos.set(id, [tk.x, tk.y]);
    const [X, Z] = o.conv(tk.x, tk.y), d = Math.hypot(X - o.x, Z - o.z);
    if (d > ALC + FOLGA || !c.ok) return;
    vistos.add(id);
    let f = fontes.get(id);
    if (f && f.forma !== forma) { soltar(f); fontes.delete(id); f = null; }
    if (!f) { f = criarFonte(id, forma); fontes.set(id, f); }
    por(f.p, X, 1.2, Z, !f.novo); f.novo = false;
    misturar(f, agora() - (andou.get(id) || 0) < 900, true, X, Z, o);
  });
  fontes.forEach((f, k) => { if (!vistos.has(k)) { soltar(f); fontes.delete(k); } });
}

// jogador: momento.js entrega cada eco que chegou ao alcance
function eco(e) {
  if (!e || !e.f || !souJog()) return false;
  if (!indice) { carregarIndice(); return false; }
  if (!infoDe(e.f) || !ctx || ctx.state !== 'running') return false;
  const c = carregar(e.f);
  if (!c.ok) return false;   // primeira vez: o som sintetizado cobre enquanto os arquivos baixam
  const o = ouvinte(); if (!o || o.a !== e.a) return false;
  const k = 'e:' + (e.q || e.f);
  let f = fontes.get(k);
  if (f && f.forma !== e.f) { soltar(f); fontes.delete(k); f = null; }
  if (!f) { f = criarFonte(k, e.f); fontes.set(k, f); }
  f.a = e.a; f.px = e.x; f.py = e.y; f.vivo = agora();
  const [X, Z] = o.conv(e.x, e.y); por(f.p, X, 1.2, Z, !f.novo); f.novo = false;
  if (e.t === 'respiracao') f.respAte = agora() + 7000; else f.andarAte = agora() + 1700;
  atualizarEco(o);
  return true;
}
function atualizarEco(o) {
  fontes.forEach((f, k) => {
    if (!k.startsWith('e:') || !o || f.a !== o.a || agora() - f.vivo > 60000) { soltar(f); fontes.delete(k); return; }
    const [X, Z] = o.conv(f.px, f.py), andando = agora() < f.andarAte, resp = agora() < f.respAte;
    misturar(f, andando, andando || resp, X, Z, o);
  });
}

// ataque e revelação: os mesmos sinais que o 3D usa (tokens.<id>.fx = atk e tokens.<id>.rvt)
function vigiarAcoes(o) {
  const tks = est().tokens || {};
  Object.entries(tks).forEach(([id, tk]) => {
    if (!tk || tipoDe(tk) !== 'filho') return;
    const fx = tk.fx && tk.fx.t === 'atk' ? tk.fx.ts || 0 : 0, rv = tk.rvt || 0;
    const a0 = ultFx.get(id), r0 = ultRv.get(id); ultFx.set(id, fx); ultRv.set(id, rv);
    const primeira = a0 === undefined;
    if (fx && fx !== a0 && agora() - fx < (primeira ? 3000 : 8000)) acao(id, tk, 'ataque', o);
    if (rv && rv !== r0 && agora() - rv < (primeira ? 3000 : 8000)) acao(id, tk, 'revela', o);
  });
}
const tocados = new Set(), ultAcao = new Map();   // o estado pode ir e voltar (gravação local e depois o servidor): cada sinal toca uma vez só
function acao(id, tk, k, o) {
  if (!o || tk.a !== o.a || !pronto()) return;
  const marca = id + ':' + k + ':' + (k === 'ataque' ? tk.fx.ts : tk.rvt);
  if (tocados.has(marca) || agora() - (ultAcao.get(id + k) || 0) < 4000) return;
  tocados.add(marca); ultAcao.set(id + k, agora()); if (tocados.size > 300) tocados.clear();
  const forma = formaDe(id, tk); if (!infoDe(forma)) return;
  let x = tk.x, y = tk.y;
  if (souJog()) {
    if (!sonsDoMestre() || tk.cp || tk.fo) return;   // a cópia de uma cobaia não se denuncia pelo som
    if (!(A().visivelPara && A().visivelPara(tk))) { x += rnd(-1.2, 1.2); y += rnd(-1.2, 1.2); }   // sem enxergar: só o rumo
  }
  const [X, Z] = o.conv(x, y); if (Math.hypot(X - o.x, Z - o.z) > ALC) return;
  const c = carregar(forma), t0 = agora();
  const vai = () => { if (tocarEm(forma, k, X, 1.3, Z, 1)) legenda(forma, k, X, Z, o); };
  if (c.ok) vai(); else c.p.then(() => { if (agora() - t0 < 2500) vai(); });
}

// libera os sons das formas que saíram do andar (ou que ninguém ouve faz tempo)
function limpar(o) {
  const precisa = new Set();
  fontes.forEach(f => precisa.add(f.forma));
  if (o && souGM()) Object.entries(est().tokens || {}).forEach(([id, tk]) => { if (tk && tipoDe(tk) === 'filho' && tk.a === o.a) precisa.add(formaDe(id, tk)); });
  bufs.forEach((c, forma) => { if (precisa.has(forma)) c.usado = agora(); else if (agora() - c.usado > (souGM() ? 30000 : 120000)) bufs.delete(forma); });
}

function tick() {
  if (!A() || !ctx || document.hidden) return;
  try {
    saida.gain.setTargetAtTime(volume(), ctx.currentTime, .3);
    if (!pronto()) return;
    const o = ouvinte();
    if (o) porOuvinte(o);
    if (souGM()) atualizarReal(o);
    else if (souJog()) atualizarEco(o);
    else fontes.forEach((f, k) => { soltar(f); fontes.delete(k); });
    vigiarAcoes(o);
    limpar(o);
  } catch (e) { console.warn('sons-filhos:', e); }
}
setInterval(tick, 250);

/* ---------------- opções: 3D (Opções › Áudio e chat) e 2D (botão CC no topo) ---------------- */
function definirLegendas(v) {
  legOn = !!v; ls.set('acf-sons-legendas', legOn);
  const b = document.getElementById('btnLegSom'); if (b) { b.classList.toggle('ativo', legOn); b.setAttribute('aria-pressed', legOn ? 'true' : 'false'); }
  document.querySelectorAll('[data-sf-leg]').forEach(x => { x.checked = legOn; });
}
function botao2D() {
  if (document.getElementById('btnLegSom')) return;
  const som = document.getElementById('btnSom'); if (!som) return;
  const b = document.createElement('button');
  b.id = 'btnLegSom'; b.type = 'button'; b.className = 'btn-fantasma btn-icone'; b.textContent = 'CC';
  b.title = 'Legendas de som: mostra por escrito os barulhos das criaturas (sem dizer o que são)';
  b.setAttribute('aria-label', 'Legendas de som');
  b.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:.04em;';
  b.onclick = () => { definirLegendas(!legOn); if (A() && A().aviso) A().aviso(legOn ? 'Legendas de som ligadas neste aparelho.' : 'Legendas de som desligadas.'); };
  som.insertAdjacentElement('afterend', b);
  definirLegendas(legOn);
}
// telas estreitas: o som vai para o ⚙ do painel (limpo.js); a opção de legendas vai junto
function menuPainel() {
  const m = document.querySelector('.pb-menu');
  if (!m || m.querySelector('[data-sf-leg]')) return;
  const d = document.createElement('div'); d.className = 'sf-leg-pb'; d.style.marginTop = '6px';
  d.innerHTML = `<label class="chave"><input type="checkbox" data-sf-leg ${legOn ? 'checked' : ''}><span>Legendas de som</span></label>`;
  m.appendChild(d); ACF_SONS.ligarOpcao(d);
}
function iniciarUI() {
  botao2D();
  if (!document.getElementById('sfEstilo')) {
    const st = document.createElement('style'); st.id = 'sfEstilo';
    st.textContent = '@media (max-width: 440px) { body.hud-limpo #btnLegSom { display: none; } } #btnLegSom.ativo { color: var(--roxo, #b07cff); border-color: currentColor; }';
    document.head.appendChild(st);
  }
  menuPainel();
}


window.ACF_SONS = {
  eco,
  // momento.js (tela do Mestre): o que vai junto no eco publicado, sem dizer quem é
  marca(tk) {
    if (!tk || tk.cp || tk.fo) return null;
    const tks = est().tokens || {}, id = Object.keys(tks).find(k => tks[k] === tk); if (!id) return null;
    const forma = formaDe(id, tk); if (!/^[a-z0-9_]{1,40}$/.test(forma)) return null;
    if (indice && !infoDe(forma)) return null;
    if (!alias.has(id)) alias.set(id, Math.random().toString(36).slice(2, 7));
    return { f: forma, q: alias.get(id) };
  },
  opcaoHTML: () => `<label class="chave"><input type="checkbox" data-sf-leg ${legOn ? 'checked' : ''}><span>Legendas de som (barulhos das criaturas por escrito, sem dizer o que são)</span></label>`,
  ligarOpcao(raiz) { (raiz || document).querySelectorAll('[data-sf-leg]').forEach(x => { x.onchange = () => definirLegendas(x.checked); }); },
  get legendas() { return legOn; }, set legendas(v) { definirLegendas(v); },
  // testes e depuração
  preparar, carregarIndice,
  estado: () => ({
    ctx: ctx ? ctx.state : null, indice: !!indice, vol: saida ? +saida.gain.value.toFixed(2) : null,
    fontes: [...fontes.values()].map(f => ({ k: f.chave.startsWith('e:') ? 'eco' : 'real', forma: f.forma, loops: Object.keys(f.loops), r: f.loops.respira ? +f.loops.respira.g.gain.value.toFixed(2) : null, m: f.loops.move ? +f.loops.move.g.gain.value.toFixed(2) : null, g: +f.g.gain.value.toFixed(2) })),
    bufs: [...bufs.entries()].map(([k, c]) => [k, c.ok, Object.keys(c.b).length]),
    stats: { ...stats, baixados: stats.baixados.length, legendas: stats.legendas.slice(-6) },
  }),
  _baixados: () => stats.baixados.slice(),
  _ouvinte: () => { const o = ouvinte(); return o ? { a: o.a, x: +o.x.toFixed(1), y: +o.y.toFixed(1), z: +o.z.toFixed(1), d3: o.d3 } : null; },
  _voz(id) { const f = fontes.get(id) || [...fontes.values()][0]; if (f) f.proxVoz = 0; },
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarUI); else iniciarUI();
setInterval(() => { try { menuPainel(); } catch (e) {} }, 2000);
})();
