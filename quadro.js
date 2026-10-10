/* =========================================================
   quadro.js · Quadro colaborativo da mesa (branco ou preto)
   Todos (jogadores, auxiliares e Mestre) desenham, escrevem, colam notas,
   formas e imagens no mesmo quadro, ao vivo.
   Firebase: quadrosMeta/<quadro> (nome e fundo) e quadrosItens/<quadro>/<item>.
   ========================================================= */
(() => {
const A = window.ACF;
if (!A) return;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = A.esc;
const num = (v, p = 0) => { const n = parseFloat(v); return isFinite(n) ? n : p; };

/* ---------------- OPÇÕES ---------------- */
const FONTES = [
  ['manuscrita', 'Manuscrita', "'Caveat', 'Segoe Print', cursive"],
  ['marcador', 'Marcador', "'Permanent Marker', 'Comic Sans MS', cursive"],
  ['maquina', 'Máquina de escrever', "'Special Elite', 'Courier New', monospace"],
  ['serifa', 'Serifada', "'Lora', Georgia, serif"],
  ['classica', 'Clássica', "'Cinzel', Georgia, serif"],
  ['terminal', 'Terminal', "'Share Tech Mono', ui-monospace, monospace"],
  ['simples', 'Simples', "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"],
];
const FONTE = Object.fromEntries(FONTES.map(f => [f[0], f[2]]));
const TAMANHOS = [14, 18, 22, 28, 36, 48, 64, 96];
const CORES = {
  branco: ['#1b1b1f', '#e03131', '#f08c00', '#e0b000', '#2f9e44', '#1971c2', '#7048e8', '#c2255c', '#868e96', '#ffffff'],
  preto: ['#f1efe9', '#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#b197fc', '#f783ac', '#adb5bd', '#16181b'],
};
const NOTAS = ['#fff3a3', '#ffd6a5', '#ffc9de', '#c8f2c2', '#bde0fe', '#e2d4ff', '#ffffff', '#2b2b30'];
const ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const FERR = [
  ['sel', 'Selecionar e mover', 'V', ic('<path d="M5 3l14 8-6 2-3 6z"/>')],
  ['mao', 'Mover a vista', 'H', ic('<path d="M8 11V5a1.5 1.5 0 013 0v5m0-1V4a1.5 1.5 0 013 0v6m0-1V6a1.5 1.5 0 013 0v8a7 7 0 01-7 7h-1a6 6 0 01-5-3l-3-5a1.5 1.5 0 012.5-1.5L8 14"/>')],
  ['caneta', 'Caneta', 'P', ic('<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/>')],
  ['marca', 'Marca-texto', 'M', ic('<path d="M9 15l-4 5h6l2-3"/><path d="M9 15l7-11 4 3-7 11z"/>')],
  ['borracha', 'Borracha (apaga o que tocar)', 'E', ic('<path d="M8 20h12"/><path d="M4 15l9-10 7 7-8 8H8z"/><path d="M9 10l6 6"/>')],
  ['texto', 'Texto', 'T', ic('<path d="M5 6V4h14v2M12 4v16M9 20h6"/>')],
  ['nota', 'Nota adesiva', 'N', ic('<path d="M4 4h16v11l-5 5H4z"/><path d="M15 20v-5h5"/>')],
  ['ret', 'Retângulo', 'R', ic('<rect x="4" y="6" width="16" height="12" rx="1"/>')],
  ['elipse', 'Elipse', 'O', ic('<ellipse cx="12" cy="12" rx="8.5" ry="6.5"/>')],
  ['seta', 'Seta', 'A', ic('<path d="M4 20L20 4M11 4h9v9"/>')],
  ['linha', 'Linha', 'L', ic('<path d="M4 20L20 4"/>')],
  ['img', 'Imagem (também dá para colar ou arrastar)', 'I', ic('<rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 8"/>')],
];
const FORMAS = ['ret', 'elipse', 'seta', 'linha'];
const ATALHO = Object.fromEntries(FERR.map(f => [f[2].toLowerCase(), f[0]]));

/* ---------------- ESTADO ---------------- */
const Q = {
  aberto: false, qid: 'principal', metas: {}, itens: {}, els: new Map(), assin: new Map(),
  ferr: 'caneta', cam: {}, sel: null, ops: [], refazer: [],
  toques: new Map(), gesto: null, editando: null, offItens: null, offMetas: null,
};
const KEY_PREF = 'acf-quadro-pref';
const PREF = (() => { try { return JSON.parse(localStorage.getItem(KEY_PREF) || '{}') || {}; } catch (e) { return {}; } })();
const salvarPref = () => { try { localStorage.setItem(KEY_PREF, JSON.stringify(PREF)); } catch (e) {} };
PREF.esp = PREF.esp || 4; PREF.fonte = PREF.fonte || 'manuscrita'; PREF.tam = PREF.tam || 28; PREF.nota = PREF.nota || NOTAS[0];
if (PREF.ferr && FERR.some(f => f[0] === PREF.ferr)) Q.ferr = PREF.ferr;

const quem = () => A.meu || A.aux || (A.mestre ? 'mestre' : null);
const nomeDeQuem = () => { const q = quem(); if (q === 'mestre') return 'Mestre'; const s = A.SER[q] || {}; return s.nome || q || ''; };
const fundo = () => ((Q.metas[Q.qid] || {}).fundo === 'preto' ? 'preto' : 'branco');
const luminancia = c => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return 0.5; const n = parseInt(m[1], 16); return (0.2126 * (n >> 16) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; };
// cor da caneta: lembrada separadamente para o quadro branco e o preto; começa com a cor da cobaia se ela aparecer bem
function corAtual() {
  const f = fundo(), k = 'cor_' + f;
  if (PREF[k]) return PREF[k];
  const s = A.SER[quem()] || {};
  const l = luminancia(s.cor);
  const boa = s.cor && (f === 'branco' ? l < 0.72 : l > 0.28);
  return boa ? s.cor : CORES[f][0];
}
const definirCor = c => { PREF['cor_' + fundo()] = c; salvarPref(); };
const caminhoItens = () => `quadrosItens/${Q.qid}`;

/* ---------------- TELA ---------------- */
function montar() {
  if ($('#telaQuadro')) return;
  const t = document.createElement('div');
  t.id = 'telaQuadro'; t.className = 'qd-tela'; t.hidden = true;
  t.innerHTML = `<header class="qd-topo">
      <div class="qd-marca"><span>A.C.F.</span><b>Quadro</b></div>
      <nav class="qd-quadros" id="qdQuadros"></nav>
      <div class="qd-topo-dir">
        <div class="qd-fundo" role="group" aria-label="Fundo do quadro"><button data-qd="fundo" data-v="branco">Branco</button><button data-qd="fundo" data-v="preto">Preto</button></div>
        <button class="qd-ico" data-qd="desfazer" title="Desfazer (Ctrl+Z)" aria-label="Desfazer">${ic('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>')}</button>
        <button class="qd-ico" data-qd="refazer" title="Refazer (Ctrl+Y)" aria-label="Refazer">${ic('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/>')}</button>
        <div class="qd-zoom"><button data-qd="zoom" data-v="-1" aria-label="Diminuir zoom">−</button><button data-qd="ajustar" id="qdZoomTxt" title="Ajustar à tela">100%</button><button data-qd="zoom" data-v="1" aria-label="Aumentar zoom">+</button></div>
        <button class="qd-ico" data-qd="menu" title="Mais opções" aria-label="Mais opções">${ic('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>')}</button>
        <button class="qd-fechar" data-qd="fechar" aria-label="Fechar o quadro">×</button>
      </div>
      <div class="qd-menu" id="qdMenu" hidden></div>
    </header>
    <div class="qd-palco" id="qdPalco" tabindex="-1">
      <div class="qd-mundo" id="qdMundo"></div>
    </div>
    <div class="qd-opcoes" id="qdOpcoes"></div>
    <nav class="qd-ferramentas" id="qdFerramentas">${FERR.map(([k, n, a, svg]) => `<button data-qd="ferr" data-v="${k}" title="${n} (${a})" aria-label="${n}">${svg}</button>`).join('')}</nav>
    <input type="file" id="qdArquivo" accept="image/*" hidden>
    <input type="color" id="qdCorLivre" hidden>`;
  document.body.appendChild(t);
  const palco = $('#qdPalco');
  palco.addEventListener('pointerdown', aoApertar);
  palco.addEventListener('pointermove', aoMover);
  palco.addEventListener('pointerup', aoSoltar);
  palco.addEventListener('pointercancel', aoSoltar);
  palco.addEventListener('dblclick', aoDuploClique);
  palco.addEventListener('wheel', aoRolar, { passive: false });
  palco.addEventListener('contextmenu', e => e.preventDefault());
  palco.addEventListener('dragover', e => { e.preventDefault(); });
  palco.addEventListener('drop', aoSoltarArquivo);
  t.addEventListener('click', aoClicar);
  $('#qdArquivo').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) adicionarImagem(f, centroDaTela()); });
  $('#qdCorLivre').addEventListener('input', e => aplicarOpcao('cor', e.target.value));
  window.addEventListener('resize', () => { if (Q.aberto) atualizarSelecao(); });
}

function abrir() {
  montar();
  Q.aberto = true;
  $('#telaQuadro').hidden = false;
  document.body.classList.add('qd-aberto');
  Q.offMetas = A.Rede.on('quadrosMeta', v => {
    Q.metas = v || {};
    if (!Q.metas.principal) { garantirPrincipal(); }
    if (!Q.metas[Q.qid] && Q.qid !== 'principal') trocarQuadro('principal');
    desenharTopo();
    aplicarFundo();
  }, () => A.aviso('Sem permissão para abrir o quadro. Confira as regras do Firebase.'));
  trocarQuadro(Q.qid, true);
  desenharFerramentas();
}
function fechar() {
  terminarEdicao();
  Q.aberto = false;
  $('#telaQuadro').hidden = true;
  document.body.classList.remove('qd-aberto');
  if (Q.offItens) Q.offItens(); Q.offItens = null;
  if (Q.offMetas) Q.offMetas(); Q.offMetas = null;
  fecharMenu();
}
let criandoPrincipal = false;
async function garantirPrincipal() {
  if (criandoPrincipal) return; criandoPrincipal = true;
  try {
    const ja = await A.Rede.once('quadrosMeta/principal');
    if (!ja) await A.Rede.set('quadrosMeta/principal', { nome: 'Quadro da equipe', fundo: 'branco', criado: Date.now(), por: nomeDeQuem() });
  } catch (e) {}
  criandoPrincipal = false;
}
function trocarQuadro(qid, forcar) {
  if (qid === Q.qid && !forcar && Q.offItens) return;
  terminarEdicao();
  Q.qid = qid; Q.sel = null; Q.ops = []; Q.refazer = [];
  if (Q.offItens) Q.offItens();
  $('#qdMundo').innerHTML = ''; Q.els.clear(); Q.assin.clear(); Q.itens = {};
  if (!Q.cam[qid]) Q.cam[qid] = { x: 60, y: 60, z: 1 };
  aplicarCamera();
  Q.offItens = A.Rede.on(caminhoItens(), v => { Q.itens = v || {}; renderizar(); }, () => {});
  desenharTopo(); aplicarFundo(); desenharOpcoes();
}

/* ---------------- TOPO, FERRAMENTAS E OPÇÕES ---------------- */
function desenharTopo() {
  const nav = $('#qdQuadros'); if (!nav) return;
  const lista = Object.entries(Q.metas).sort((a, b) => (a[0] === 'principal' ? -1 : b[0] === 'principal' ? 1 : (a[1].criado || 0) - (b[1].criado || 0)));
  nav.innerHTML = lista.map(([k, m]) => `<button data-qd="quadro" data-v="${esc(k)}" class="${k === Q.qid ? 'on' : ''}" title="${esc(m.nome || '')}"><i class="qd-bolinha ${m.fundo === 'preto' ? 'preto' : ''}"></i>${esc(m.nome || 'Quadro')}</button>`).join('')
    + `<button data-qd="novo-quadro" class="qd-novo" title="Novo quadro" aria-label="Novo quadro">+</button>`;
  $$('[data-qd="fundo"]').forEach(b => b.classList.toggle('on', b.dataset.v === fundo()));
}
function aplicarFundo() {
  const t = $('#telaQuadro'); if (!t) return;
  if (Q.fundoDesenhado !== fundo()) { Q.fundoDesenhado = fundo(); Q.assin.clear(); renderizar(); }
  t.classList.toggle('qd-preto', fundo() === 'preto');
  $$('[data-qd="fundo"]').forEach(b => b.classList.toggle('on', b.dataset.v === fundo()));
  desenharOpcoes();
}
function desenharFerramentas() {
  $$('#qdFerramentas button').forEach(b => b.classList.toggle('on', b.dataset.v === Q.ferr));
  const p = $('#qdPalco'); if (p) p.dataset.ferr = Q.ferr;
}
function escolherFerramenta(f) {
  if (f === 'img') { $('#qdArquivo').click(); return; }
  terminarEdicao();
  Q.ferr = f; PREF.ferr = f; salvarPref();
  if (f !== 'sel') selecionar(null);
  desenharFerramentas(); desenharOpcoes();
}
// a barra de opções muda conforme a ferramenta ou o item selecionado
function desenharOpcoes() {
  const el = $('#qdOpcoes'); if (!el) return;
  const it = Q.sel ? Q.itens[Q.sel] : null;
  const tipo = it ? (it.t === 'forma' ? it.f : it.t) : Q.ferr;
  const blocos = [];
  const cor = it ? (it.t === 'nota' ? null : it.cor) : corAtual();
  const paleta = () => `<div class="qd-cores">${CORES[fundo()].map(c => `<button data-qd="cor" data-v="${c}" class="${(cor || '').toLowerCase() === c ? 'on' : ''}" style="--c:${c}" title="${c}" aria-label="Cor ${c}"></button>`).join('')}<button data-qd="cor-livre" class="qd-cor-livre" title="Escolher outra cor" aria-label="Outra cor" style="--c:${cor || '#888'}"></button></div>`;
  const espessura = v => `<label class="qd-esp" title="Espessura"><span>Traço</span><input type="range" min="1" max="32" value="${v}" data-qdin="esp"><output>${v}</output></label>`;
  const fonte = (f, t, b, i) => `<select data-qdin="fonte" title="Fonte">${FONTES.map(([k, n, css]) => `<option value="${k}" ${f === k ? 'selected' : ''} style="font-family:${css}">${n}</option>`).join('')}</select>
    <select data-qdin="tam" title="Tamanho">${TAMANHOS.map(x => `<option value="${x}" ${num(t) === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
    <button data-qd="b" class="qd-bt-b ${b ? 'on' : ''}" title="Negrito">B</button><button data-qd="i" class="qd-bt-i ${i ? 'on' : ''}" title="Itálico">I</button>`;
  if (['caneta', 'marca', 'traco'].includes(tipo)) { blocos.push(paleta(), espessura(it ? it.esp : (Q.ferr === 'marca' ? Math.max(PREF.esp, 14) : PREF.esp))); }
  else if (FORMAS.includes(tipo)) {
    blocos.push(paleta(), espessura(it ? it.esp : PREF.esp));
    if (['ret', 'elipse'].includes(tipo)) blocos.push(`<button data-qd="pre" class="${(it ? it.pre : PREF.pre) ? 'on' : ''}" title="Preencher a forma">Preenchida</button>`);
  } else if (tipo === 'texto') { blocos.push(paleta(), fonte(it ? it.fo : PREF.fonte, it ? it.tam : PREF.tam, it ? it.b : PREF.b, it ? it.i : PREF.i)); }
  else if (tipo === 'nota') {
    blocos.push(`<div class="qd-cores qd-cores-nota">${NOTAS.map(c => `<button data-qd="nota-cor" data-v="${c}" class="${(it ? it.bg : PREF.nota) === c ? 'on' : ''}" style="--c:${c}" aria-label="Nota ${c}"></button>`).join('')}</div>`, fonte(it ? it.fo : PREF.fonte, it ? it.tam : Math.min(PREF.tam, 36), it ? it.b : PREF.b, it ? it.i : PREF.i));
  } else if (tipo === 'borracha') blocos.push('<span class="qd-dica">Passe por cima do que quer apagar. Ctrl+Z desfaz.</span>');
  else if (tipo === 'mao') blocos.push('<span class="qd-dica">Arraste para mover a vista. Roda do mouse ou pinça para o zoom.</span>');
  else if (tipo === 'sel' && !it) blocos.push('<span class="qd-dica">Toque num item para mover, redimensionar ou mudar a cor. Dois toques num texto para editar.</span>');
  else if (tipo === 'img' && !it) blocos.push('<span class="qd-dica">Escolha uma imagem, cole (Ctrl+V) ou arraste para o quadro.</span>');
  if (it) blocos.push(`<span class="qd-sep"></span><button data-qd="frente" title="Trazer para a frente">Frente</button><button data-qd="tras" title="Mandar para trás">Trás</button><button data-qd="duplicar" title="Duplicar (Ctrl+D)">Duplicar</button><button data-qd="apagar" class="qd-perigo" title="Apagar (Delete)">Apagar</button>${it.porN ? `<span class="qd-autor">por ${esc(it.porN)}</span>` : ''}`);
  el.innerHTML = blocos.join('');
  el.hidden = !blocos.length;
  $$('[data-qdin]', el).forEach(inp => {
    inp.oninput = () => { if (inp.dataset.qdin === 'esp') inp.nextElementSibling.textContent = inp.value; if (inp.type === 'range') aplicarOpcao(inp.dataset.qdin, num(inp.value), true); };
    inp.onchange = () => aplicarOpcao(inp.dataset.qdin, inp.tagName === 'SELECT' && inp.dataset.qdin === 'tam' ? num(inp.value) : inp.type === 'range' ? num(inp.value) : inp.value);
  });
}
// muda a preferência e, se houver item selecionado, o próprio item
function aplicarOpcao(k, v, rascunho) {
  const it = Q.sel ? Q.itens[Q.sel] : null;
  if (!it) {
    if (k === 'cor') definirCor(v);
    else if (k === 'nota') PREF.nota = v;
    else PREF[{ esp: 'esp', fonte: 'fonte', tam: 'tam', b: 'b', i: 'i', pre: 'pre' }[k]] = v;
    salvarPref();
    if (!rascunho) desenharOpcoes();
    return;
  }
  const campo = { cor: 'cor', nota: 'bg', esp: 'esp', fonte: 'fo', tam: 'tam', b: 'b', i: 'i', pre: 'pre' }[k];
  if (k === 'cor' && it.t !== 'nota') definirCor(v);
  const novo = { ...it, [campo]: v };
  if (rascunho) { Q.itens[Q.sel] = novo; atualizarEl(Q.sel, novo); Q.rascunho = Q.rascunho || { id: Q.sel, antes: it }; return; }
  const antes = Q.rascunho && Q.rascunho.id === Q.sel ? Q.rascunho.antes : it;
  Q.rascunho = null;
  gravarItem(Q.sel, novo, antes);
  desenharOpcoes();
}

/* ---------------- CÂMERA ---------------- */
function aplicarCamera() {
  const c = Q.cam[Q.qid] || { x: 0, y: 0, z: 1 };
  const m = $('#qdMundo'), p = $('#qdPalco');
  if (!m) return;
  m.style.transform = `translate(${c.x}px, ${c.y}px) scale(${c.z})`;
  const g = 28 * c.z;
  p.style.backgroundSize = `${g}px ${g}px`;
  p.style.backgroundPosition = `${c.x}px ${c.y}px`;
  const zt = $('#qdZoomTxt'); if (zt) zt.textContent = Math.round(c.z * 100) + '%';
  p.style.setProperty('--qz', c.z);
}
function zoomEm(cx, cy, fator) {
  const c = Q.cam[Q.qid];
  const r = $('#qdPalco').getBoundingClientRect();
  const nz = Math.min(6, Math.max(0.1, c.z * fator));
  const px = cx - r.left, py = cy - r.top;
  c.x = px - (px - c.x) * (nz / c.z); c.y = py - (py - c.y) * (nz / c.z); c.z = nz;
  aplicarCamera(); atualizarSelecao(); posicionarEditor();
}
function paraMundo(cx, cy) {
  const c = Q.cam[Q.qid], r = $('#qdPalco').getBoundingClientRect();
  return { x: (cx - r.left - c.x) / c.z, y: (cy - r.top - c.y) / c.z };
}
function centroDaTela() { const r = $('#qdPalco').getBoundingClientRect(); return paraMundo(r.left + r.width / 2, r.top + r.height / 2); }
function ajustarATela() {
  const ids = Object.keys(Q.itens);
  const r = $('#qdPalco').getBoundingClientRect();
  if (!ids.length) { Q.cam[Q.qid] = { x: 60, y: 60, z: 1 }; aplicarCamera(); return; }
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  ids.forEach(id => { const b = caixaDoItem(id); if (!b) return; x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h); });
  if (!isFinite(x1)) return;
  const z = Math.min(2, Math.max(0.1, Math.min((r.width - 80) / Math.max(1, x2 - x1), (r.height - 160) / Math.max(1, y2 - y1))));
  Q.cam[Q.qid] = { z, x: (r.width - (x2 - x1) * z) / 2 - x1 * z, y: (r.height - (y2 - y1) * z) / 2 - y1 * z + 20 };
  aplicarCamera(); atualizarSelecao();
}

/* ---------------- RENDERIZAÇÃO ---------------- */
const pontos = p => String(p || '').trim().split(' ').map(s => s.split(',').map(Number)).filter(q => q.length === 2 && isFinite(q[0]) && isFinite(q[1]));
function caminhoSuave(ps) {
  if (!ps.length) return '';
  if (ps.length < 3) { const [a, b = a] = ps; return `M${a[0]} ${a[1]}L${b[0] + 0.01} ${b[1]}`; }
  let d = `M${ps[0][0]} ${ps[0][1]}`;
  for (let i = 1; i < ps.length - 1; i++) { const mx = (ps[i][0] + ps[i + 1][0]) / 2, my = (ps[i][1] + ps[i + 1][1]) / 2; d += `Q${ps[i][0]} ${ps[i][1]} ${mx.toFixed(1)} ${my.toFixed(1)}`; }
  const u = ps[ps.length - 1];
  return d + `L${u[0]} ${u[1]}`;
}
function svgForma(it) {
  const w = num(it.w), h = num(it.h), aw = Math.max(1, Math.abs(w)), ah = Math.max(1, Math.abs(h));
  const e = Math.max(1, num(it.esp, 3));
  const cv = esc(corVisivel(it.cor));
  const st = `stroke="${cv}" stroke-width="${e}" stroke-linecap="round" stroke-linejoin="round"`;
  const fill = it.pre ? `fill="${cv}" fill-opacity=".28"` : 'fill="none"';
  const hitFill = it.pre ? 'pointer-events="all"' : '';
  let corpo = '';
  if (it.f === 'ret') corpo = `<rect class="qd-hit" x="0" y="0" width="${aw}" height="${ah}" ${hitFill} stroke-width="${e + 12}"/><rect x="0" y="0" width="${aw}" height="${ah}" rx="${Math.min(6, aw / 4)}" ${st} ${fill}/>`;
  else if (it.f === 'elipse') corpo = `<ellipse class="qd-hit" cx="${aw / 2}" cy="${ah / 2}" rx="${aw / 2}" ry="${ah / 2}" ${hitFill} stroke-width="${e + 12}"/><ellipse cx="${aw / 2}" cy="${ah / 2}" rx="${aw / 2}" ry="${ah / 2}" ${st} ${fill}/>`;
  else {
    const x1 = w < 0 ? aw : 0, y1 = h < 0 ? ah : 0, x2 = w < 0 ? 0 : aw, y2 = h < 0 ? 0 : ah;
    corpo = `<line class="qd-hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${e + 14}"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${st}/>`;
    if (it.f === 'seta') {
      const ang = Math.atan2(y2 - y1, x2 - x1), tam = 10 + e * 2.2;
      const p1 = [x2 - tam * Math.cos(ang - 0.45), y2 - tam * Math.sin(ang - 0.45)], p2 = [x2 - tam * Math.cos(ang + 0.45), y2 - tam * Math.sin(ang + 0.45)];
      corpo += `<path d="M${p1[0]} ${p1[1]}L${x2} ${y2}L${p2[0]} ${p2[1]}" ${st} fill="none"/>`;
    }
  }
  return `<svg width="${aw}" height="${ah}" overflow="visible">${corpo}</svg>`;
}
// tinta quase preta no quadro preto (ou quase branca no branco) é mostrada invertida, para nada sumir ao trocar o fundo
function corVisivel(c) {
  const l = luminancia(c);
  if (fundo() === 'preto' && l < 0.16) return CORES.preto[0];
  if (fundo() === 'branco' && l > 0.9) return CORES.branco[0];
  return c;
}
const corTextoNota = bg => (luminancia(bg) > 0.5 ? '#1d1b17' : '#f4f1ea');
function preencherEl(el, it) {
  const st = el.style;
  el.className = 'qd-it qd-' + it.t + (it.t === 'forma' ? ' qd-forma-' + it.f : '');
  el.title = it.porN ? `por ${it.porN}` : '';
  st.left = num(it.x) + 'px'; st.top = num(it.y) + 'px';
  st.transform = ''; st.width = ''; st.height = '';
  if (it.t === 'traco') {
    const s = num(it.s, 1) || 1;
    if (s !== 1) st.transform = `scale(${s})`;
    const d = caminhoSuave(pontos(it.p));
    el.innerHTML = `<svg width="${Math.max(1, num(it.w))}" height="${Math.max(1, num(it.h))}" overflow="visible"><path class="qd-hit" d="${d}" stroke-width="${num(it.esp, 3) + 14}"/><path d="${d}" fill="none" stroke="${esc(corVisivel(it.cor))}" stroke-width="${num(it.esp, 3)}" stroke-linecap="round" stroke-linejoin="round" opacity="${num(it.op, 1)}"/></svg>`;
  } else if (it.t === 'forma') {
    st.left = (num(it.x) + Math.min(0, num(it.w))) + 'px'; st.top = (num(it.y) + Math.min(0, num(it.h))) + 'px';
    el.innerHTML = svgForma(it);
  } else if (it.t === 'texto') {
    st.color = corVisivel(it.cor); st.fontFamily = FONTE[it.fo] || FONTE.manuscrita; st.fontSize = num(it.tam, 28) + 'px';
    st.fontWeight = it.b ? '700' : '400'; st.fontStyle = it.i ? 'italic' : 'normal';
    st.width = num(it.w) > 0 ? num(it.w) + 'px' : 'max-content';
    el.textContent = it.tx || '';
  } else if (it.t === 'nota') {
    st.width = num(it.w, 200) + 'px'; st.height = num(it.h, 200) + 'px';
    st.background = it.bg || NOTAS[0]; st.color = corTextoNota(it.bg || NOTAS[0]);
    el.innerHTML = `<div class="qd-nota-tx" style="font-family:${FONTE[it.fo] || FONTE.manuscrita};font-size:${num(it.tam, 28)}px;font-weight:${it.b ? 700 : 400};font-style:${it.i ? 'italic' : 'normal'}">${esc(it.tx || '')}</div>${it.porN ? `<small>${esc(it.porN)}</small>` : ''}`;
  } else if (it.t === 'img') {
    st.width = num(it.w, 200) + 'px'; st.height = num(it.h, 150) + 'px';
    el.innerHTML = `<img src="${esc(it.src || '')}" alt="" draggable="false">`;
  }
}
function atualizarEl(id, it) {
  let el = Q.els.get(id);
  if (!el) { el = document.createElement('div'); el.dataset.id = id; $('#qdMundo').appendChild(el); Q.els.set(id, el); }
  preencherEl(el, it);
  Q.assin.set(id, JSON.stringify(it));
  if (Q.sel === id) atualizarSelecao();
}
function renderizar() {
  const mundo = $('#qdMundo'); if (!mundo) return;
  const ids = Object.keys(Q.itens);
  const vivos = new Set(ids);
  Q.els.forEach((el, id) => { if (!vivos.has(id)) { el.remove(); Q.els.delete(id); Q.assin.delete(id); } });
  ids.forEach(id => {
    if (Q.gesto && Q.gesto.id === id && ['mover', 'redim'].includes(Q.gesto.tipo)) return;   // não briga com o arrasto em curso
    if (Q.editando && Q.editando.id === id) return;
    const it = Q.itens[id];
    if (!it || !it.t) return;
    const a = JSON.stringify(it);
    if (Q.assin.get(id) !== a) atualizarEl(id, it);
  });
  // ordem de empilhamento
  ids.sort((a, b) => num((Q.itens[a] || {}).z) - num((Q.itens[b] || {}).z)).forEach((id, i) => { const el = Q.els.get(id); if (el) el.style.zIndex = i + 1; });
  if (Q.sel && !Q.itens[Q.sel]) selecionar(null); else atualizarSelecao();
}

/* ---------------- SELEÇÃO ---------------- */
function caixaDoItem(id) {
  const el = Q.els.get(id); if (!el) return null;
  const r = el.getBoundingClientRect();
  const a = paraMundo(r.left, r.top), b = paraMundo(r.right, r.bottom);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
}
function selecionar(id) {
  if (Q.sel !== id) Q.rascunho = null;
  Q.sel = id && Q.itens[id] ? id : null;
  $$('.qd-it.selecionado').forEach(e => e.classList.remove('selecionado'));
  if (Q.sel && Q.els.get(Q.sel)) Q.els.get(Q.sel).classList.add('selecionado');
  atualizarSelecao(); desenharOpcoes();
}
function atualizarSelecao() {
  let caixa = $('#qdSelecao');
  if (!Q.sel || !Q.els.get(Q.sel)) { if (caixa) caixa.remove(); return; }
  if (!caixa) {
    caixa = document.createElement('div'); caixa.id = 'qdSelecao'; caixa.className = 'qd-selecao';
    caixa.innerHTML = '<span class="qd-alca" data-alca="1" title="Redimensionar"></span>';
    $('#qdMundo').appendChild(caixa);
  }
  const b = caixaDoItem(Q.sel), pad = 6 / (Q.cam[Q.qid].z || 1);
  Object.assign(caixa.style, { left: (b.x - pad) + 'px', top: (b.y - pad) + 'px', width: (b.w + pad * 2) + 'px', height: (b.h + pad * 2) + 'px', zIndex: 100000 });
}

/* ---------------- GRAVAÇÃO E DESFAZER ---------------- */
function gravarItem(id, novo, antes, semHistorico) {
  if (novo) Q.itens[id] = novo; else delete Q.itens[id];
  renderizar();
  A.Rede.set(`${caminhoItens()}/${id}`, novo || null).catch(() => A.aviso('O servidor recusou a alteração no quadro.'));
  if (!semHistorico) { Q.ops.push([{ id, antes: antes || null, depois: novo || null }]); if (Q.ops.length > 150) Q.ops.shift(); Q.refazer = []; }
}
function gravarLote(lista) {
  lista.forEach(o => { if (o.depois) Q.itens[o.id] = o.depois; else delete Q.itens[o.id]; A.Rede.set(`${caminhoItens()}/${o.id}`, o.depois || null).catch(() => {}); });
  renderizar();
  Q.ops.push(lista); Q.refazer = [];
}
function desfazer() {
  const op = Q.ops.pop(); if (!op) { A.aviso('Nada para desfazer.'); return; }
  op.slice().reverse().forEach(o => gravarItem(o.id, o.antes, null, true));
  Q.refazer.push(op);
}
function refazer() {
  const op = Q.refazer.pop(); if (!op) return;
  op.forEach(o => gravarItem(o.id, o.depois, null, true));
  Q.ops.push(op);
}
const novoZ = () => Math.max(Date.now(), ...Object.values(Q.itens).map(x => num(x.z))) + 1;
const assinatura = () => ({ por: quem() || '', porN: nomeDeQuem(), ts: Date.now() });
function criar(it) {
  const id = A.Rede.chave();
  gravarItem(id, { ...it, z: novoZ(), ...assinatura() }, null);
  return id;
}

/* ---------------- PONTEIRO ---------------- */
function aoApertar(e) {
  const palco = $('#qdPalco');
  if (e.target.closest('.qd-editor')) return;
  palco.setPointerCapture && palco.setPointerCapture(e.pointerId);
  Q.toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
  fecharMenu();
  // dois dedos: pinça (zoom e mover a vista)
  if (Q.toques.size === 2) {
    cancelarGesto();
    const [a, b] = [...Q.toques.values()];
    Q.gesto = { tipo: 'pinca', d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    return;
  }
  if (Q.toques.size > 2) return;
  if (Q.editando) { terminarEdicao(); if (Q.ferr === 'texto' || Q.ferr === 'nota') return; }
  const m = paraMundo(e.clientX, e.clientY);
  const alvoEl = e.target.closest('.qd-it');
  const alvo = alvoEl ? alvoEl.dataset.id : null;
  const panorama = e.button === 1 || e.button === 2 || Q.ferr === 'mao' || Q.espaco;
  if (panorama) { Q.gesto = { tipo: 'pan', sx: e.clientX, sy: e.clientY, cam: { ...Q.cam[Q.qid] } }; palco.classList.add('arrastando'); return; }
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  const f = Q.ferr;
  if (f === 'sel') {
    if (e.target.dataset.alca && Q.sel) {
      const it = Q.itens[Q.sel], b = caixaDoItem(Q.sel);
      Q.gesto = { tipo: 'redim', id: Q.sel, antes: it, b, sx: m.x, sy: m.y };
      return;
    }
    if (alvo) {
      const agora = Date.now();
      if (Q.ultimoToque && Q.ultimoToque.id === alvo && agora - Q.ultimoToque.t < 350 && e.pointerType !== 'mouse') { Q.ultimoToque = null; editar(alvo); return; }
      Q.ultimoToque = { id: alvo, t: agora };
      selecionar(alvo);
      Q.gesto = { tipo: 'mover', id: alvo, antes: Q.itens[alvo], sx: m.x, sy: m.y, moveu: false, ult: 0 };
      return;
    }
    selecionar(null);
    Q.gesto = { tipo: 'pan', sx: e.clientX, sy: e.clientY, cam: { ...Q.cam[Q.qid] } };
    palco.classList.add('arrastando');
    return;
  }
  if (f === 'caneta' || f === 'marca') {
    const prev = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    prev.setAttribute('class', 'qd-previa'); prev.setAttribute('overflow', 'visible'); prev.setAttribute('width', '1'); prev.setAttribute('height', '1');
    const esp = f === 'marca' ? Math.max(PREF.esp, 14) : PREF.esp;
    prev.innerHTML = `<path fill="none" stroke="${esc(corAtual())}" stroke-width="${esp}" stroke-linecap="round" stroke-linejoin="round" opacity="${f === 'marca' ? 0.38 : 1}"/>`;
    $('#qdMundo').appendChild(prev);
    Q.gesto = { tipo: 'traco', pts: [[m.x, m.y]], prev, esp, op: f === 'marca' ? 0.38 : 1 };
    return;
  }
  if (f === 'borracha') { Q.gesto = { tipo: 'apagar', lote: [] }; apagarEm(e.clientX, e.clientY); return; }
  if (FORMAS.includes(f)) {
    const prev = document.createElement('div'); prev.className = 'qd-it qd-forma qd-previa-forma';
    $('#qdMundo').appendChild(prev);
    Q.gesto = { tipo: 'forma', f, x: m.x, y: m.y, w: 0, h: 0, prev };
    return;
  }
  if (f === 'texto') {
    if (alvo && ['texto', 'nota'].includes((Q.itens[alvo] || {}).t)) { editar(alvo); return; }
    novoTexto(m);
    return;
  }
  if (f === 'nota') {
    if (alvo && (Q.itens[alvo] || {}).t === 'nota') { editar(alvo); return; }
    const id = criar({ t: 'nota', x: m.x - 110, y: m.y - 110, w: 220, h: 220, tx: '', bg: PREF.nota, fo: PREF.fonte, tam: Math.min(num(PREF.tam, 28), 36), b: !!PREF.b, i: !!PREF.i });
    Q.novaNota = id;
    editar(id);
  }
}
function novoTexto(m) {
  const tam = num(PREF.tam, 28);
  const id = A.Rede.chave();
  const it = { t: 'texto', x: m.x, y: m.y - tam * 0.65, w: 0, tx: '', cor: corAtual(), fo: PREF.fonte, tam, b: !!PREF.b, i: !!PREF.i, z: novoZ(), ...assinatura() };
  Q.itens[id] = it; atualizarEl(id, it);
  editar(id, true);
}
function aoMover(e) {
  if (Q.toques.has(e.pointerId)) Q.toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const g = Q.gesto; if (!g) return;
  if (g.tipo === 'pinca') {
    if (Q.toques.size < 2) return;
    const [a, b] = [...Q.toques.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const c = Q.cam[Q.qid]; c.x += cx - g.cx; c.y += cy - g.cy;
    zoomEm(cx, cy, d / (g.d || d));
    g.d = d; g.cx = cx; g.cy = cy;
    return;
  }
  if (g.tipo === 'pan') { const c = Q.cam[Q.qid]; c.x = g.cam.x + e.clientX - g.sx; c.y = g.cam.y + e.clientY - g.sy; aplicarCamera(); posicionarEditor(); return; }
  const m = paraMundo(e.clientX, e.clientY);
  if (g.tipo === 'traco') {
    const u = g.pts[g.pts.length - 1];
    if (Math.hypot(m.x - u[0], m.y - u[1]) < 1.6 / (Q.cam[Q.qid].z || 1)) return;
    if (g.pts.length > 3000) return;
    g.pts.push([m.x, m.y]);
    g.prev.firstChild.setAttribute('d', caminhoSuave(g.pts.map(p => [+p[0].toFixed(1), +p[1].toFixed(1)])));
    return;
  }
  if (g.tipo === 'apagar') { apagarEm(e.clientX, e.clientY); return; }
  if (g.tipo === 'forma') {
    g.w = m.x - g.x; g.h = m.y - g.y;
    if (e.shiftKey && ['ret', 'elipse'].includes(g.f)) { const l = Math.max(Math.abs(g.w), Math.abs(g.h)); g.w = Math.sign(g.w || 1) * l; g.h = Math.sign(g.h || 1) * l; }
    let x = g.x, y = g.y, w = g.w, h = g.h;
    if (['ret', 'elipse'].includes(g.f)) { x = Math.min(g.x, g.x + g.w); y = Math.min(g.y, g.y + g.h); w = Math.abs(g.w); h = Math.abs(g.h); }
    preencherEl(g.prev, { t: 'forma', f: g.f, x, y, w, h, cor: corAtual(), esp: PREF.esp, pre: !!PREF.pre });
    g.prev.classList.add('qd-previa-forma');
    return;
  }
  if (g.tipo === 'mover') {
    const dx = m.x - g.sx, dy = m.y - g.sy;
    if (!g.moveu && Math.hypot(dx, dy) * (Q.cam[Q.qid].z || 1) < 3) return;
    g.moveu = true;
    const novo = { ...g.antes, x: num(g.antes.x) + dx, y: num(g.antes.y) + dy };
    Q.itens[g.id] = novo; preencherEl(Q.els.get(g.id), novo); Q.els.get(g.id).classList.add('selecionado'); atualizarSelecao();
    const agora = Date.now();
    if (agora - g.ult > 140) { g.ult = agora; A.Rede.set(`${caminhoItens()}/${g.id}`, novo).catch(() => {}); }
    return;
  }
  if (g.tipo === 'redim') {
    const it = g.antes, b = g.b;
    const nw = Math.max(12, b.w + (m.x - g.sx)), nh = Math.max(12, b.h + (m.y - g.sy));
    const k = nw / Math.max(1, b.w);
    let novo = { ...it };
    if (it.t === 'traco') novo.s = Math.max(0.05, num(it.s, 1) * k);
    else if (it.t === 'texto') novo.tam = Math.max(8, Math.round(num(it.tam, 28) * k));
    else if (it.t === 'img') { novo.w = nw; novo.h = e.shiftKey ? nh : nw * (num(it.h) / Math.max(1, num(it.w))); }
    else if (it.t === 'nota') { novo.w = Math.max(80, nw); novo.h = Math.max(60, nh); }
    else if (it.t === 'forma') {
      const kx = nw / Math.max(1, b.w), ky = nh / Math.max(1, b.h);
      if (it.f === 'ret' || it.f === 'elipse') { novo.w = Math.max(4, num(it.w) * kx); novo.h = Math.max(4, num(it.h) * ky); }
      else { novo.w = num(it.w) * kx; novo.h = num(it.h) * ky; }
    }
    Q.itens[g.id] = novo; preencherEl(Q.els.get(g.id), novo); Q.els.get(g.id).classList.add('selecionado'); atualizarSelecao();
    g.novo = novo;
  }
}
function aoSoltar(e) {
  Q.toques.delete(e.pointerId);
  const g = Q.gesto;
  $('#qdPalco').classList.remove('arrastando');
  if (!g) return;
  if (g.tipo === 'pinca') { if (Q.toques.size < 2) Q.gesto = null; return; }
  Q.gesto = null;
  if (g.tipo === 'traco') {
    g.prev.remove();
    const ps = g.pts;
    const xs = ps.map(p => p[0]), ys = ps.map(p => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    const rel = ps.map(p => `${(p[0] - x0).toFixed(1)},${(p[1] - y0).toFixed(1)}`).join(' ');
    criar({ t: 'traco', x: +x0.toFixed(1), y: +y0.toFixed(1), w: +(Math.max(...xs) - x0).toFixed(1), h: +(Math.max(...ys) - y0).toFixed(1), s: 1, p: rel, cor: corAtual(), esp: g.esp, op: g.op });
    return;
  }
  if (g.tipo === 'apagar') { if (g.lote.length) { Q.ops.push(g.lote); Q.refazer = []; } return; }
  if (g.tipo === 'forma') {
    g.prev.remove();
    let { x, y, w, h } = g;
    if (Math.hypot(w, h) < 6 / (Q.cam[Q.qid].z || 1)) { w = 160; h = g.f === 'ret' || g.f === 'elipse' ? 110 : 0; if (g.f === 'seta' || g.f === 'linha') { w = 160; h = -60; } }
    if (g.f === 'ret' || g.f === 'elipse') { x = Math.min(g.x, g.x + w); y = Math.min(g.y, g.y + h); w = Math.abs(w); h = Math.abs(h); }
    const id = criar({ t: 'forma', f: g.f, x: +x.toFixed(1), y: +y.toFixed(1), w: +w.toFixed(1), h: +h.toFixed(1), cor: corAtual(), esp: PREF.esp, pre: !!PREF.pre });
    return id;
  }
  if (g.tipo === 'mover') {
    if (!g.moveu) return;
    gravarItem(g.id, Q.itens[g.id], g.antes);
    return;
  }
  if (g.tipo === 'redim') { if (g.novo) gravarItem(g.id, g.novo, g.antes); else renderizar(); }
}
function cancelarGesto() {
  const g = Q.gesto; if (!g) return;
  if (g.prev) g.prev.remove();
  if ((g.tipo === 'mover' || g.tipo === 'redim') && g.antes) { Q.itens[g.id] = g.antes; Q.assin.delete(g.id); }
  if (g.tipo === 'apagar' && g.lote.length) { Q.ops.push(g.lote); }
  Q.gesto = null; renderizar();
}
function apagarEm(cx, cy) {
  const g = Q.gesto;
  document.elementsFromPoint(cx, cy).forEach(el => {
    const it = el.closest && el.closest('#qdMundo .qd-it');
    if (!it || !it.dataset.id) return;
    const id = it.dataset.id;
    if (!Q.itens[id]) return;
    g.lote.push({ id, antes: Q.itens[id], depois: null });
    delete Q.itens[id];
    A.Rede.set(`${caminhoItens()}/${id}`, null).catch(() => {});
    renderizar();
  });
}
function aoDuploClique(e) {
  const toque = document.elementFromPoint(e.clientX, e.clientY);
  const el = toque && toque.closest('#qdMundo .qd-it');
  if (el && el.dataset.id && ['texto', 'nota'].includes((Q.itens[el.dataset.id] || {}).t)) { editar(el.dataset.id); return; }
  if (!el && Q.ferr === 'sel' && !Q.editando) novoTexto(paraMundo(e.clientX, e.clientY));   // dois cliques no vazio: texto ali
}
function aoRolar(e) {
  e.preventDefault();
  if (e.shiftKey) { const c = Q.cam[Q.qid]; c.x -= e.deltaY || e.deltaX; aplicarCamera(); atualizarSelecao(); return; }
  zoomEm(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)));
}

/* ---------------- TEXTO E NOTAS ---------------- */
const medidor = document.createElement('canvas').getContext('2d');
function editar(id, novo) {
  terminarEdicao();
  const it = Q.itens[id]; if (!it) return;
  selecionar(null);
  const el = Q.els.get(id);
  const ta = document.createElement('textarea');
  ta.className = 'qd-editor qd-editor-' + it.t;
  ta.value = it.tx || '';
  ta.spellcheck = true;
  ta.placeholder = it.t === 'nota' ? 'Escreva na nota…' : 'Escreva…';
  $('#qdMundo').appendChild(ta);
  Q.editando = { id, ta, novo: !!novo, antes: novo ? null : it };
  if (el) el.classList.add('editando');
  posicionarEditor();
  ta.addEventListener('input', posicionarEditor);
  ta.addEventListener('keydown', ev => {
    ev.stopPropagation();
    if (ev.key === 'Escape' || (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey))) { ev.preventDefault(); terminarEdicao(); }
  });
  ta.addEventListener('blur', () => setTimeout(() => { if (Q.editando && Q.editando.ta === ta) terminarEdicao(); }, 0));
  setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 0);
}
function posicionarEditor() {
  const ed = Q.editando; if (!ed) return;
  const it = Q.itens[ed.id]; if (!it) return;
  const ta = ed.ta, st = ta.style;
  const fam = FONTE[it.fo] || FONTE.manuscrita, tam = num(it.tam, 28);
  st.fontFamily = fam; st.fontSize = tam + 'px'; st.fontWeight = it.b ? 700 : 400; st.fontStyle = it.i ? 'italic' : 'normal';
  st.zIndex = 100001;
  if (it.t === 'nota') {
    Object.assign(st, { left: num(it.x) + 'px', top: num(it.y) + 'px', width: num(it.w, 220) + 'px', height: num(it.h, 220) + 'px', color: corTextoNota(it.bg) });
    return;
  }
  medidor.font = `${it.i ? 'italic ' : ''}${it.b ? 700 : 400} ${tam}px ${fam}`;
  const linhas = (ta.value || ' ').split('\n');
  const larg = num(it.w) > 0 ? num(it.w) : Math.max(tam * 2, ...linhas.map(l => medidor.measureText(l + 'W').width)) + 8;
  Object.assign(st, { left: (num(it.x) - 4) + 'px', top: (num(it.y) - 2) + 'px', width: larg + 'px', color: corVisivel(it.cor) });
  st.height = 'auto'; st.height = (ta.scrollHeight + 2) + 'px';
}
function terminarEdicao() {
  const ed = Q.editando; if (!ed) return;
  Q.editando = null;
  const it = Q.itens[ed.id];
  const tx = ed.ta.value.replace(/\s+$/, '');
  ed.ta.remove();
  const el = Q.els.get(ed.id); if (el) el.classList.remove('editando');
  if (!it) return;
  if (it.t === 'texto' && !tx.trim()) {
    if (ed.novo) { delete Q.itens[ed.id]; Q.assin.delete(ed.id); renderizar(); }
    else gravarItem(ed.id, null, ed.antes);
    return;
  }
  if (ed.novo) { gravarItem(ed.id, { ...it, tx }, null); return; }
  const notaNova = Q.novaNota === ed.id; Q.novaNota = null;
  if (tx === (it.tx || '')) { renderizar(); return; }
  gravarItem(ed.id, { ...it, tx }, ed.antes);
  if (notaNova) {   // criar a nota e escrever nela conta como uma ação só
    const op = Q.ops.pop(), ant = Q.ops[Q.ops.length - 1];
    if (ant && ant[0] && ant[0].id === ed.id) ant[0].depois = op[0].depois; else Q.ops.push(op);
  }
}

/* ---------------- IMAGENS ---------------- */
async function adicionarImagem(f, pos) {
  if (!f || !/^image\//.test(f.type)) { A.aviso('Esse arquivo não é uma imagem.'); return; }
  try {
    let src = await A.imagemReduzida(f, 1100);
    if (src.length > 650000) src = await A.imagemReduzida(f, 760);
    if (src.length > 650000) { A.aviso('Imagem grande demais, mesmo reduzida.'); return; }
    const im = new Image();
    await new Promise((ok, falha) => { im.onload = ok; im.onerror = falha; im.src = src; });
    const k = Math.min(1, 420 / Math.max(im.width, im.height));
    const w = Math.round(im.width * k), h = Math.round(im.height * k);
    const id = criar({ t: 'img', x: pos.x - w / 2, y: pos.y - h / 2, w, h, src });
    escolherFerramenta('sel'); selecionar(id);
  } catch (e) { A.aviso('Não consegui ler essa imagem.'); }
}
function aoSoltarArquivo(e) {
  e.preventDefault();
  const fs = [...(e.dataTransfer && e.dataTransfer.files || [])].filter(f => /^image\//.test(f.type));
  const m = paraMundo(e.clientX, e.clientY);
  fs.slice(0, 6).forEach((f, i) => adicionarImagem(f, { x: m.x + i * 30, y: m.y + i * 30 }));
}
document.addEventListener('paste', e => {
  if (!Q.aberto || Q.editando || (e.target && e.target.matches && e.target.matches('input, textarea'))) return;
  const itens = [...(e.clipboardData && e.clipboardData.items || [])];
  const img = itens.find(i => i.kind === 'file' && /^image\//.test(i.type));
  if (img) { e.preventDefault(); adicionarImagem(img.getAsFile(), centroDaTela()); return; }
  const tx = e.clipboardData && e.clipboardData.getData('text/plain');
  if (tx && tx.trim()) {
    e.preventDefault();
    const c = centroDaTela();
    criar({ t: 'texto', x: c.x - 100, y: c.y, w: tx.length > 60 ? 420 : 0, tx: tx.slice(0, 4000), cor: corAtual(), fo: PREF.fonte, tam: num(PREF.tam, 28), b: !!PREF.b, i: !!PREF.i });
  }
});

/* ---------------- AÇÕES ---------------- */
function abrirMenu() {
  const m = $('#qdMenu');
  if (!m.hidden) { fecharMenu(); return; }
  const meta = Q.metas[Q.qid] || {};
  const gm = A.mestre;
  m.innerHTML = `<button data-qd="renomear">Renomear este quadro</button>
    <button data-qd="ajustar">Mostrar tudo na tela</button>
    <button data-qd="limpar-meus">Apagar o que eu fiz neste quadro</button>
    ${gm ? `<button data-qd="limpar" class="qd-perigo">Limpar o quadro inteiro (Mestre)</button>${Q.qid !== 'principal' ? '<button data-qd="apagar-quadro" class="qd-perigo">Apagar este quadro (Mestre)</button>' : ''}` : ''}
    <p>${esc(meta.nome || '')}${meta.por ? ` · criado por ${esc(meta.por)}` : ''} · ${Object.keys(Q.itens).length} itens</p>
    <p class="qd-ajuda">Atalhos: V selecionar · H mover a vista · P caneta · M marca-texto · E borracha · T texto · N nota · R, O, A, L formas · I imagem · Delete apaga · Ctrl+D duplica · Ctrl+Z desfaz · espaço + arrastar move a vista.</p>`;
  m.hidden = false;
}
function fecharMenu() { const m = $('#qdMenu'); if (m) m.hidden = true; }
function aoClicar(e) {
  const b = e.target.closest('[data-qd]'); if (!b) return;
  const a = b.dataset.qd, v = b.dataset.v;
  if (a !== 'menu') fecharMenu();
  if (a === 'fechar') { fechar(); return; }
  if (a === 'ferr') { escolherFerramenta(v); return; }
  if (a === 'quadro') { trocarQuadro(v); return; }
  if (a === 'novo-quadro') { novoQuadro(); return; }
  if (a === 'fundo') { if (fundo() !== v) A.Rede.set(`quadrosMeta/${Q.qid}/fundo`, v).catch(() => A.aviso('Não consegui mudar o fundo.')); return; }
  if (a === 'desfazer') { desfazer(); return; }
  if (a === 'refazer') { refazer(); return; }
  if (a === 'zoom') { const r = $('#qdPalco').getBoundingClientRect(); zoomEm(r.left + r.width / 2, r.top + r.height / 2, v === '1' ? 1.25 : 0.8); return; }
  if (a === 'ajustar') { ajustarATela(); return; }
  if (a === 'menu') { abrirMenu(); return; }
  if (a === 'renomear') { const n = (prompt('Nome do quadro:', (Q.metas[Q.qid] || {}).nome || '') || '').trim().slice(0, 40); if (n) A.Rede.set(`quadrosMeta/${Q.qid}/nome`, n).catch(() => {}); return; }
  if (a === 'limpar-meus') {
    const meus = Object.entries(Q.itens).filter(([, it]) => it.por === quem());
    if (!meus.length) { A.aviso('Você ainda não fez nada neste quadro.'); return; }
    if (!confirm(`Apagar ${meus.length} item(ns) seus deste quadro?`)) return;
    gravarLote(meus.map(([id, it]) => ({ id, antes: it, depois: null })));
    return;
  }
  if (a === 'limpar') {
    if (!A.mestre || !confirm('Limpar o quadro inteiro, para todos? Isso não pode ser desfeito.')) return;
    A.Rede.set(caminhoItens(), null).catch(() => A.aviso('O servidor recusou.'));
    Q.ops = []; Q.refazer = [];
    return;
  }
  if (a === 'apagar-quadro') {
    if (!A.mestre || !confirm('Apagar este quadro e tudo que há nele?')) return;
    const qid = Q.qid;
    A.Rede.set(`quadrosItens/${qid}`, null).then(() => A.Rede.set(`quadrosMeta/${qid}`, null)).catch(() => A.aviso('O servidor recusou.'));
    trocarQuadro('principal');
    return;
  }
  if (a === 'cor') { aplicarOpcao('cor', v); return; }
  if (a === 'cor-livre') { const c = $('#qdCorLivre'); c.value = (Q.sel && Q.itens[Q.sel] && Q.itens[Q.sel].cor) || corAtual(); c.click(); return; }
  if (a === 'nota-cor') { aplicarOpcao('nota', v); return; }
  if (a === 'b' || a === 'i') { const it = Q.sel ? Q.itens[Q.sel] : null; aplicarOpcao(a, !(it ? it[a] : PREF[a])); return; }
  if (a === 'pre') { const it = Q.sel ? Q.itens[Q.sel] : null; aplicarOpcao('pre', !(it ? it.pre : PREF.pre)); return; }
  if (a === 'apagar' && Q.sel) { const id = Q.sel; selecionar(null); gravarItem(id, null, Q.itens[id]); return; }
  if (a === 'duplicar' && Q.sel) { duplicar(); return; }
  if ((a === 'frente' || a === 'tras') && Q.sel) {
    const it = Q.itens[Q.sel], zs = Object.values(Q.itens).map(x => num(x.z));
    gravarItem(Q.sel, { ...it, z: a === 'frente' ? Math.max(...zs) + 1 : Math.min(...zs) - 1 }, it);
  }
}
function duplicar() {
  const it = Q.itens[Q.sel]; if (!it) return;
  const id = criar({ ...it, x: num(it.x) + 24, y: num(it.y) + 24 });
  selecionar(id);
}
async function novoQuadro() {
  const nome = (prompt('Nome do novo quadro (ex.: Pistas, Mapa da fuga):', '') || '').trim().slice(0, 40);
  if (!nome) return;
  const preto = confirm('Quadro preto? (OK = preto, Cancelar = branco)');
  const id = A.Rede.chave();
  try { await A.Rede.set(`quadrosMeta/${id}`, { nome, fundo: preto ? 'preto' : 'branco', criado: Date.now(), por: nomeDeQuem() }); } catch (e) { A.aviso('O servidor recusou o novo quadro.'); return; }
  trocarQuadro(id);
}

/* ---------------- TECLADO ---------------- */
document.addEventListener('keydown', e => {
  if (!Q.aberto) return;
  if (e.target.matches && e.target.matches('input, textarea, select') ) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? refazer() : desfazer(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); refazer(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); if (Q.sel) duplicar(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === 'escape') { if (!$('#qdMenu').hidden) fecharMenu(); else if (Q.sel) selecionar(null); else fechar(); return; }
  if ((k === 'delete' || k === 'backspace') && Q.sel) { e.preventDefault(); const id = Q.sel; selecionar(null); gravarItem(id, null, Q.itens[id]); return; }
  if (k === ' ') { Q.espaco = true; $('#qdPalco').classList.add('espaco'); e.preventDefault(); return; }
  if (k === '+' || k === '=') { const r = $('#qdPalco').getBoundingClientRect(); zoomEm(r.left + r.width / 2, r.top + r.height / 2, 1.25); return; }
  if (k === '-') { const r = $('#qdPalco').getBoundingClientRect(); zoomEm(r.left + r.width / 2, r.top + r.height / 2, 0.8); return; }
  if (ATALHO[k]) { escolherFerramenta(ATALHO[k]); }
});
document.addEventListener('keyup', e => { if (e.key === ' ') { Q.espaco = false; const p = $('#qdPalco'); if (p) p.classList.remove('espaco'); } });

/* ---------------- BOTÃO NO TOPO ---------------- */
function atualizarBotao() { const b = $('#btnQuadro'); if (b) b.hidden = !(A.mestre || A.meu || A.aux); }
document.addEventListener('acf-perfil', () => setTimeout(atualizarBotao, 0));
const btn = $('#btnQuadro');
if (btn) btn.addEventListener('click', () => (Q.aberto ? fechar() : abrir()));
setTimeout(atualizarBotao, 300);
window.ACF_QUADRO = { abrir, fechar };
})();
