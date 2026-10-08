/* =========================================================
   A CAIXA DE FÓSFOROS · PLANTA DO COMPLEXO · app.js
   O "motor" do site: desenha o mapa, move a câmera,
   arrasta as fichas e mantém todo mundo sincronizado.
   ========================================================= */
(() => {
'use strict';

/* ---------- Medidas da planta (em quadradinhos) ---------- */
const T  = 40;   // pixels por quadradinho
const M  = 2;    // margem em volta das salas (cabe o elevador)
const R  = 5;    // lado de cada sala
const G  = 2;    // comprimento do corredor entre salas
const CW = 2;    // largura do corredor
const WH = 0.75; // altura das paredes
const W  = 2 * M + 5 * R + 4 * G;  // largura total
const H  = W;                       // altura total

const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const SER = Object.fromEntries(SERES.map(s => [s.id, s]));

/* ---------- Geometria das salas ---------- */
// posição (1..25) -> {linha, coluna}
const POS = {};
LAYOUT.forEach((linha, r) => linha.forEach((p, c) => { POS[p] = { r, c }; }));

function retSala(p) {
  const { r, c } = POS[p];
  return { x: M + c * (R + G), y: M + r * (R + G), w: R, h: R };
}

// corredores ligando todas as salas vizinhas + a saída abaixo da posição 11
const CORREDORES = [];
for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
  const x = M + c * (R + G), y = M + r * (R + G);
  if (c < 4) CORREDORES.push({ x: x + R, y: y + (R - CW) / 2, w: G, h: CW, eixo: 'h' });
  if (r < 4) CORREDORES.push({ x: x + (R - CW) / 2, y: y + R, w: CW, h: G, eixo: 'v' });
}

// sala do elevador/porta de cada andar (definida em data.js, campo "saida")
function saidaDoAndar(a) {
  const cn = ANDARES[a - 1].saida;
  const p = cn - 25 * (a - 1);
  if (!cn || p < 1 || p > 25) return null;
  const { r, c } = POS[p];
  const lado = r === 0 ? 'cima' : r === 4 ? 'baixo' : c === 0 ? 'esq' : c === 4 ? 'dir' : null;
  return { p, lado };
}

const cnDe = (andar, p) => p + 25 * (andar - 1);
const nomeAndar = a => ANDARES[a - 1].titulo;

function salaEm(andar, x, y) {
  for (let p = 1; p <= 25; p++) {
    const s = retSala(p);
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return p;
  }
  return null;
}

// Sala revelada aos jogadores? O 1º andar começa conhecido; os outros, desconhecidos.
// O Mestre muda isso clicando na sala (fica salvo em state.salas).
function salaRevelada(andar, cn) {
  const v = (Store.state.salas || {})['c' + cn];
  return v === undefined ? andar === 1 : !!v;
}
const salaVisivel = (andar, cn) => mestre || salaRevelada(andar, cn);

function descreveLocal(tk) {
  if (!tk) return 'fora do mapa';
  const p = salaEm(tk.a, tk.x, tk.y);
  if (!p) return `${nomeAndar(tk.a)} · Corredor`;
  const cn = cnDe(tk.a, p);
  if (!salaVisivel(tk.a, cn)) return `${nomeAndar(tk.a)} · Sala desconhecida`;
  const [nome] = ANDARES[tk.a - 1].salas[cn] || [p === 25 ? 'Zona Neutra' : ''];
  return `${nomeAndar(tk.a)} · CN ${String(cn).padStart(2, '0')}${nome ? ' ' + nome : ''}`;
}

/* ---------- Estado inicial ---------- */
const CENTRO_ZN = (() => { const s = retSala(25); return { x: s.x + R / 2, y: s.y + R / 2 }; })();

function posicoesIniciais() {
  const tokens = {};
  const cob = SERES.filter(s => s.tipo === 'cobaia');
  cob.forEach((s, i) => {
    const ang = (i / cob.length) * Math.PI * 2 - Math.PI / 2;
    tokens[s.id] = { s: s.id, a: 1, x: +(CENTRO_ZN.x + Math.cos(ang) * 1.6).toFixed(2), y: +(CENTRO_ZN.y + Math.sin(ang) * 1.6).toFixed(2), h: false, n: 1 };
  });
  return tokens;
}
const estadoPadrao = () => ({ tokens: posicoesIniciais(), rev: {}, salas: {}, ruido: { q: 0, p: false } });

/* =========================================================
   SINCRONIA: modo local ou Firebase
   ========================================================= */
const Store = {
  state: estadoPadrao(),
  modo: 'local',
  ouvintes: [],
  db: null, auth: null,

  aoMudar(fn) { this.ouvintes.push(fn); },
  avisar() { this.ouvintes.forEach(fn => fn(this.state)); },

  async iniciar() {
    if (FIREBASE) return this.iniciarFirebase();
    try {
      const salvo = JSON.parse(localStorage.getItem('acf-mapa-estado'));
      if (salvo && salvo.tokens) this.state = salvo;
    } catch (e) {}
    try {
      this.canal = new BroadcastChannel('acf-mapa');
      this.canal.onmessage = ev => { this.state = ev.data; this.avisar(); };
    } catch (e) {}
    setSync('modo local', '');
    this.avisar();
  },

  async iniciarFirebase() {
    setSync('conectando…', '');
    const v = '10.12.2';
    try {
      await carregarScript(`https://www.gstatic.com/firebasejs/${v}/firebase-app-compat.js`);
      await carregarScript(`https://www.gstatic.com/firebasejs/${v}/firebase-auth-compat.js`);
      await carregarScript(`https://www.gstatic.com/firebasejs/${v}/firebase-database-compat.js`);
    } catch (e) { setSync('sem conexão', 'erro'); return; }
    this.modo = 'firebase';
    firebase.initializeApp(FIREBASE);
    this.db = firebase.database();
    this.auth = firebase.auth();
    this.auth.onAuthStateChanged(u => {
      definirMestre(!!u && !u.isAnonymous);
      // jogador precisa de um login anônimo para poder mover a própria ficha
      if (!u && meu) this.auth.signInAnonymously().catch(erroGravacao);
      if (!u && lerPerfil() === 'mestre') { salvarPerfil(''); mostrarPerfil(1); }
    });
    this.db.ref('.info/connected').on('value', s => setSync(s.val() ? 'ao vivo' : 'reconectando…', s.val() ? 'vivo' : ''));
    this.db.ref('mapa').on('value', snap => {
      const v = snap.val();
      if (v && v.tokens !== undefined) {
        this.state = { tokens: v.tokens || {}, rev: v.rev || {}, salas: v.salas || {}, ruido: v.ruido || { q: 0, p: false } };
        this.vazio = false;
      } else {
        this.state = estadoPadrao();
        this.vazio = true;
        if (mestre) { this.vazio = false; this.gravarTudo(); }
      }
      this.avisar();
    });
  },

  // caminho: ['tokens', id] ou ['rev', 'a1']; valor null apaga
  definir(caminho, valor) {
    let alvo = this.state;
    for (let i = 0; i < caminho.length - 1; i++) alvo = alvo[caminho[i]] = alvo[caminho[i]] || {};
    const k = caminho[caminho.length - 1];
    if (valor === null) delete alvo[k]; else alvo[k] = valor;

    if (this.modo === 'firebase') {
      this.db.ref('mapa/' + caminho.join('/')).set(valor).catch(erroGravacao);
    } else {
      this.salvarLocal();
    }
    this.avisar();
  },

  gravarTudo() {
    if (this.modo === 'firebase') this.db.ref('mapa').set(this.state).catch(erroGravacao);
    else { this.salvarLocal(); this.avisar(); }
  },

  salvarLocal() {
    try { localStorage.setItem('acf-mapa-estado', JSON.stringify(this.state)); } catch (e) {}
    try { this.canal && this.canal.postMessage(this.state); } catch (e) {}
  },
};

/* =========================================================
   SEGREDOS DO MESTRE (funções das cobaias)
   Nunca ficam no código público. No modo local, ficam só no navegador
   do Mestre; com Firebase, num caminho que só a conta do Mestre lê.
   ========================================================= */
const Segredos = {
  dados: {}, ref: null,
  carregar() {
    if (Store.modo === 'firebase') {
      if (this.ref) return;
      this.ref = Store.db.ref('segredos');
      this.ref.on('value', s => { this.dados = s.val() || {}; atualizarTudo(); }, () => {});
    } else {
      try { this.dados = JSON.parse(localStorage.getItem('acf-segredos') || '{}'); } catch (e) { this.dados = {}; }
    }
  },
  parar() { if (this.ref) { this.ref.off(); this.ref = null; } this.dados = {}; },
  definir(id, valor) {
    valor = (valor || '').trim();
    if (valor) this.dados[id] = valor; else delete this.dados[id];
    if (Store.modo === 'firebase') Store.db.ref('segredos/' + id).set(valor || null).catch(erroGravacao);
    else { try { localStorage.setItem('acf-segredos', JSON.stringify(this.dados)); } catch (e) {} }
  },
};
// a função só existe na tela do Mestre
const funcaoDe = id => (mestre && Segredos.dados[id]) || '';

function erroGravacao(e) {
  console.error(e);
  setSync('sem permissão para gravar', 'erro');
}

function carregarScript(src) {
  return new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = falha;
    document.head.appendChild(s);
  });
}

function setSync(txt, cls) {
  const el = $('#sync');
  el.textContent = txt;
  el.className = 'sync ' + (cls || '');
}

/* =========================================================
   SENHAS
   ========================================================= */
async function hash(txt) {
  const dados = new TextEncoder().encode(SAL + txt);
  const buf = await crypto.subtle.digest('SHA-256', dados);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

let liberados = new Set();
try { liberados = new Set(JSON.parse(localStorage.getItem('acf-andares') || '[]')); } catch (e) {}
const salvarLiberados = () => { try { localStorage.setItem('acf-andares', JSON.stringify([...liberados])); } catch (e) {} };

let mestre = false;
function definirMestre(sim) {
  mestre = sim;
  document.body.classList.toggle('mestre', sim);
  $$('.mestre-only').forEach(el => el.hidden = !sim);
  atualizarBotaoPerfil();
  if (Store.modo === 'local') { try { sim ? localStorage.setItem('acf-mestre', '1') : localStorage.removeItem('acf-mestre'); } catch (e) {} }
  if (sim) Segredos.carregar(); else Segredos.parar();
  if (sim && Store.modo === 'firebase' && Store.vazio) { Store.vazio = false; Store.gravarTudo(); }
  montarAndar();
  atualizarTudo();
}

/* =========================================================
   CÂMERA
   ========================================================= */
const cam = { rot: 0, tilt: 50, s: 1, px: 0, py: 0 };
const viewport = $('#viewport');
const stage = $('#stage');

function aplicarCamera() {
  stage.style.transform = `translate(${cam.px}px, ${cam.py}px) scale(${cam.s}) rotateX(${cam.tilt}deg) rotateZ(${cam.rot}deg)`;
  stage.style.setProperty('--rot', cam.rot + 'deg');
  stage.style.setProperty('--tilt', cam.tilt + 'deg');
  // fichas mantêm o mesmo tamanho na tela, com qualquer zoom
  stage.style.setProperty('--k', Math.min(2.4, Math.max(0.8, 0.85 / cam.s)).toFixed(3));
}

function enquadrar() {
  const r = viewport.getBoundingClientRect();
  const t = cam.tilt * Math.PI / 180;
  const alturaVista = H * T * Math.cos(t) + WH * T * Math.sin(t) + 80;
  cam.s = Math.min(r.width / (W * T), r.height / alturaVista) * 0.92;
  cam.px = 0; cam.py = 0;
  aplicarCamera();
}

// converte um ponto da tela para coordenadas do piso (em quadradinhos)
function telaParaPiso(cx, cy) {
  const r = viewport.getBoundingClientRect();
  let dx = (cx - (r.left + r.width / 2) - cam.px) / cam.s;
  let dy = (cy - (r.top + r.height / 2) - cam.py) / cam.s;
  dy /= Math.cos(cam.tilt * Math.PI / 180);
  const th = cam.rot * Math.PI / 180;
  const x = dx * Math.cos(th) + dy * Math.sin(th);
  const y = -dx * Math.sin(th) + dy * Math.cos(th);
  return { x: (x + W * T / 2) / T, y: (y + H * T / 2) / T };
}

// leva a câmera até um ponto do piso
function focar(x, y) {
  const th = cam.rot * Math.PI / 180, t = cam.tilt * Math.PI / 180;
  const ux = (x * T - W * T / 2), uy = (y * T - H * T / 2);
  const rx = ux * Math.cos(th) - uy * Math.sin(th);
  const ry = (ux * Math.sin(th) + uy * Math.cos(th)) * Math.cos(t);
  cam.px = -rx * cam.s; cam.py = -ry * cam.s;
  aplicarCamera();
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let modoMover = false;

/* ---- Gestos ---- */
const ponteiros = new Map();
let gesto = null;

viewport.addEventListener('contextmenu', e => e.preventDefault());

viewport.addEventListener('pointerdown', e => {
  if (e.target.closest('.ficha')) return;
  viewport.setPointerCapture(e.pointerId);
  ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
  esconderDica();
  if (ponteiros.size === 1) {
    gesto = { tipo: (e.button === 2 || e.button === 1 || e.shiftKey || modoMover) ? 'mover' : 'girar', x: e.clientX, y: e.clientY, andou: false };
  } else if (ponteiros.size === 2) {
    const [a, b] = [...ponteiros.values()];
    gesto = { tipo: 'pinca', dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, andou: true };
  }
  viewport.classList.add('arrastando');
});

viewport.addEventListener('pointermove', e => {
  if (!ponteiros.has(e.pointerId) || !gesto) return;
  ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (gesto.tipo === 'pinca' && ponteiros.size >= 2) {
    const [a, b] = [...ponteiros.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    zoomEm(mx, my, dist / gesto.dist);
    cam.px += mx - gesto.mx; cam.py += my - gesto.my;
    gesto.dist = dist; gesto.mx = mx; gesto.my = my;
    aplicarCamera();
    return;
  }
  const dx = e.clientX - gesto.x, dy = e.clientY - gesto.y;
  gesto.x = e.clientX; gesto.y = e.clientY;
  if (Math.abs(dx) + Math.abs(dy) > 2) gesto.andou = true;
  if (gesto.tipo === 'girar') {
    cam.rot = (cam.rot + dx * 0.35) % 360;
    cam.tilt = clamp(cam.tilt - dy * 0.25, 0, 75);
  } else {
    cam.px += dx; cam.py += dy;
  }
  aplicarCamera();
});

function soltar(e) {
  if (!ponteiros.has(e.pointerId)) return;
  ponteiros.delete(e.pointerId);
  if (gesto && !gesto.andou && ponteiros.size === 0) {
    const pt = telaParaPiso(e.clientX, e.clientY);
    const p = podeVer(andarAtual) ? salaEm(andarAtual, pt.x, pt.y) : null;
    if (mestre && p) selecionarSala(cnDe(andarAtual, p)); else selecionar(null);
  }
  if (ponteiros.size === 0) { gesto = null; viewport.classList.remove('arrastando'); }
  else if (ponteiros.size === 1) {
    const [p] = [...ponteiros.values()];
    gesto = { tipo: modoMover ? 'mover' : 'girar', x: p.x, y: p.y, andou: true };
  }
}
viewport.addEventListener('pointerup', soltar);
viewport.addEventListener('pointercancel', soltar);

function zoomEm(cx, cy, k) {
  const r = viewport.getBoundingClientRect();
  const novo = clamp(cam.s * k, 0.2, 4);
  k = novo / cam.s;
  const mx = cx - (r.left + r.width / 2), my = cy - (r.top + r.height / 2);
  cam.px = mx - (mx - cam.px) * k;
  cam.py = my - (my - cam.py) * k;
  cam.s = novo;
}

viewport.addEventListener('wheel', e => {
  e.preventDefault();
  zoomEm(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
  aplicarCamera();
  esconderDica();
}, { passive: false });

$$('.camera button').forEach(b => b.addEventListener('click', () => {
  const r = viewport.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  switch (b.dataset.cam) {
    case 'girarE': cam.rot -= 45; break;
    case 'girarD': cam.rot += 45; break;
    case 'iso': cam.rot = 45; cam.tilt = 55; enquadrar(); return;
    case 'topo': cam.rot = 0; cam.tilt = 0; enquadrar(); return;
    case 'mais': zoomEm(cx, cy, 1.25); break;
    case 'menos': zoomEm(cx, cy, 0.8); break;
    case 'centro': cam.rot = 0; cam.tilt = 50; enquadrar(); return;
    case 'mover':
      modoMover = !modoMover;
      b.classList.toggle('ativo', modoMover);
      return;
  }
  aplicarCamera();
}));

window.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea')) return;
  if (e.key === 'q' || e.key === 'Q') { cam.rot -= 15; aplicarCamera(); }
  if (e.key === 'e' || e.key === 'E') { cam.rot += 15; aplicarCamera(); }
});

let dicaFeita = false;
function esconderDica() { if (!dicaFeita) { dicaFeita = true; $('#dica').style.opacity = '0'; } }

/* =========================================================
   DESENHO DA PLANTA
   ========================================================= */
let andarAtual = 1;
const podeVer = a => mestre || liberados.has(a);

function el(tag, cls, estilo) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (estilo) Object.assign(e.style, estilo);
  return e;
}
const px = v => (v * T) + 'px';

function parede(x1, y1, x2, y2) {
  const p = el('div');
  if (y1 === y2) {
    p.className = 'parede h';
    Object.assign(p.style, { left: px(Math.min(x1, x2)), top: px(y1 - WH), width: px(Math.abs(x2 - x1)), height: px(WH) });
  } else {
    p.className = 'parede v';
    Object.assign(p.style, { left: px(x1), top: px(Math.min(y1, y2)), width: px(WH), height: px(Math.abs(y2 - y1)) });
  }
  return p;
}

// parede de um lado da sala, com abertura no meio se houver corredor
function ladoComPorta(x1, y1, x2, y2, temPorta, out) {
  if (!temPorta) { out.push(parede(x1, y1, x2, y2)); return; }
  const meio = (R - CW) / 2;
  if (y1 === y2) {
    out.push(parede(x1, y1, x1 + meio, y1));
    out.push(parede(x2 - meio, y1, x2, y1));
  } else {
    out.push(parede(x1, y1, x1, y1 + meio));
    out.push(parede(x1, y2 - meio, x1, y2));
  }
}

function montarAndar() {
  stage.innerHTML = '';
  const andar = ANDARES[andarAtual - 1];
  $('#legendaAndar').textContent = andar.titulo;
  const algumaRevelada = Array.from({ length: 25 }, (_, i) => cnDe(andarAtual, i + 1)).some(cn => salaRevelada(andarAtual, cn));
  $('#legendaSub').textContent = mestre || algumaRevelada ? andar.subtitulo : 'Setor não mapeado';

  const bloqueado = !podeVer(andarAtual);
  $('#bloqueio').hidden = !bloqueado;
  if (bloqueado) {
    $('#bloqueioTitulo').textContent = '> ' + andar.titulo.toUpperCase();
    $('#inputSenha').value = '';
    $('#erroSenha').hidden = true;
    setTimeout(() => $('#inputSenha').focus(), 50);
    return;
  }

  Object.assign(stage.style, { width: px(W), height: px(H), marginLeft: px(-W / 2), marginTop: px(-H / 2) });
  stage.style.transformOrigin = '50% 50%';

  const base = el('div', 'stage-base');
  base.style.backgroundSize = `${T}px ${T}px`;
  stage.appendChild(base);

  const paredes = [];
  const saidaReal = saidaDoAndar(andarAtual);
  // jogador só enxerga o elevador se a sala dele já foi revelada
  const saida = saidaReal && salaVisivel(andarAtual, cnDe(andarAtual, saidaReal.p)) ? saidaReal : null;
  assinaturaAndar = assinatura();

  // corredores
  CORREDORES.forEach(c => {
    const d = el('div', 'corredor', { left: px(c.x), top: px(c.y), width: px(c.w), height: px(c.h), backgroundSize: `${T}px ${T}px` });
    stage.appendChild(d);
    if (c.eixo === 'h') {
      paredes.push(parede(c.x, c.y, c.x + c.w, c.y));
      paredes.push(parede(c.x, c.y + c.h, c.x + c.w, c.y + c.h));
    } else {
      paredes.push(parede(c.x, c.y, c.x, c.y + c.h));
      paredes.push(parede(c.x + c.w, c.y, c.x + c.w, c.y + c.h));
    }
  });

  // salas
  for (let p = 1; p <= 25; p++) {
    const s = retSala(p);
    const cn = cnDe(andarAtual, p);
    const revelada = salaRevelada(andarAtual, cn);
    const visivel = mestre || revelada;
    let [nome, elm] = andar.salas[cn] || (p === 25 ? ['Zona Neutra', 'F'] : ['', '?']);
    if (!visivel) { nome = ''; elm = '?'; }
    const elemento = ELEMENTOS[elm] || ELEMENTOS['?'];
    const d = el('div', 'sala', { left: px(s.x), top: px(s.y), width: px(s.w), height: px(s.h), backgroundSize: `${T}px ${T}px` });
    d.dataset.cn = cn;
    if (p === 25 && visivel) d.classList.add('neutra');
    if (!visivel) d.classList.add('desconhecida');
    if (mestre && !revelada) d.classList.add('oculta-jog');
    if (!Object.keys(andar.salas).length) d.classList.add('vazia-planta');
    d.style.setProperty('--el', elemento.cor);
    d.innerHTML = `<div class="sala-tinta"></div>
      <div class="sala-rotulo">
        ${visivel ? `<span class="sala-cn">CN ${String(cn).padStart(2, '0')}</span>` : '<span class="sala-cn">Desconhecido</span>'}
        ${mestre && !revelada ? '<span class="sala-oculta">oculta aos jogadores</span>' : ''}
        ${nome ? `<span class="sala-nome">${nome}</span>` : ''}
        ${elm !== '?' && elm !== 'N' ? `<span class="sala-el">${elemento.nome}</span>` : ''}
      </div>`;
    stage.appendChild(d);

    const { r, c } = POS[p];
    const lado = saida && saida.p === p ? saida.lado : null;
    ladoComPorta(s.x, s.y, s.x + R, s.y, r > 0 || lado === 'cima', paredes);           // cima
    ladoComPorta(s.x, s.y + R, s.x + R, s.y + R, r < 4 || lado === 'baixo', paredes);  // baixo
    ladoComPorta(s.x, s.y, s.x, s.y + R, c > 0 || lado === 'esq', paredes);            // esquerda
    ladoComPorta(s.x + R, s.y, s.x + R, s.y + R, c < 4 || lado === 'dir', paredes);    // direita
  }
  if (saida) desenharSaida(saida, paredes);
  desenharMacico(saida, paredes);
  paredes.forEach(pw => stage.appendChild(pw));

  fichasDom.clear();
  atualizarElementos();
  desenharFichas();
}

// elevador/porta para o próximo andar
// corredor do elevador, quando a sala fica na borda da planta
function retSaida(saida) {
  if (!saida || !saida.lado) return null;
  const s = retSala(saida.p);
  if (saida.lado === 'baixo') return { x: s.x + (R - CW) / 2, y: s.y + R, w: CW, h: M };
  if (saida.lado === 'cima')  return { x: s.x + (R - CW) / 2, y: s.y - M, w: CW, h: M };
  if (saida.lado === 'esq')   return { x: s.x - M, y: s.y + (R - CW) / 2, w: M, h: CW };
  if (saida.lado === 'dir')   return { x: s.x + R, y: s.y + (R - CW) / 2, w: M, h: CW };
  return null;
}

// Tudo o que não é sala nem corredor vira bloco maciço: uma tampa sólida
// na altura das paredes, que esconde os vazios entre as salas.
function desenharMacico(saida, paredes) {
  const P = 0.5;                        // resolução da grade (meio quadradinho)
  const n = Math.round(W / P);
  const aberto = Array.from({ length: n }, () => new Array(n).fill(false));
  const abertos = [];
  for (let p = 1; p <= 25; p++) abertos.push(retSala(p));
  CORREDORES.forEach(c => abertos.push(c));
  const rs = retSaida(saida);
  if (rs) abertos.push(rs);
  abertos.forEach(r => {
    for (let j = Math.round(r.y / P); j < Math.round((r.y + r.h) / P); j++)
      for (let i = Math.round(r.x / P); i < Math.round((r.x + r.w) / P); i++) aberto[j][i] = true;
  });

  // junta as células sólidas em retângulos (faixas horizontais empilhadas)
  const usado = Array.from({ length: n }, () => new Array(n).fill(false));
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (aberto[j][i] || usado[j][i]) continue;
    let w = 0; while (i + w < n && !aberto[j][i + w] && !usado[j][i + w]) w++;
    let h = 1;
    while (j + h < n) {
      let ok = true;
      for (let k = 0; k < w; k++) if (aberto[j + h][i + k] || usado[j + h][i + k]) { ok = false; break; }
      if (!ok) break; h++;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) usado[j + y][i + x] = true;
    const tampa = el('div', 'macico', { left: px(i * P), top: px(j * P), width: px(w * P), height: px(h * P) });
    tampa.style.transform = `translateZ(${WH * T}px)`;
    stage.appendChild(tampa);
  }

  // paredes externas da Caixa (com abertura onde sai o elevador)
  const lado = (x1, y1, x2, y2, abertura) => {
    if (!abertura) { paredes.push(parede(x1, y1, x2, y2)); return; }
    if (y1 === y2) {
      if (abertura.a > x1) paredes.push(parede(x1, y1, abertura.a, y1));
      if (abertura.b < x2) paredes.push(parede(abertura.b, y1, x2, y1));
    } else {
      if (abertura.a > y1) paredes.push(parede(x1, y1, x1, abertura.a));
      if (abertura.b < y2) paredes.push(parede(x1, abertura.b, x1, y2));
    }
  };
  const ab = l => rs && saida.lado === l ? (l === 'cima' || l === 'baixo' ? { a: rs.x, b: rs.x + rs.w } : { a: rs.y, b: rs.y + rs.h }) : null;
  lado(0, 0, W, 0, ab('cima'));
  lado(0, H, W, H, ab('baixo'));
  lado(0, 0, 0, H, ab('esq'));
  lado(W, 0, W, H, ab('dir'));
}

function desenharSaida(saida, paredes) {
  const s = retSala(saida.p);
  const destino = andarAtual < 5 ? `${andarAtual + 1}º ANDAR` : '???';
  const rotulo = `<span class="saida-seta">⇩</span><span class="saida-txt">${destino}</span>`;
  let ret;
  if (saida.lado === 'baixo') ret = { x: s.x + (R - CW) / 2, y: s.y + R, w: CW, h: M };
  if (saida.lado === 'cima')  ret = { x: s.x + (R - CW) / 2, y: s.y - M, w: CW, h: M };
  if (saida.lado === 'esq')   ret = { x: s.x - M, y: s.y + (R - CW) / 2, w: M, h: CW };
  if (saida.lado === 'dir')   ret = { x: s.x + R, y: s.y + (R - CW) / 2, w: M, h: CW };
  if (ret) {
    const d = el('div', 'saida', { left: px(ret.x), top: px(ret.y), width: px(ret.w), height: px(ret.h) });
    d.innerHTML = rotulo;
    d.title = 'Elevador para o ' + destino.toLowerCase();
    stage.appendChild(d);
    if (saida.lado === 'cima' || saida.lado === 'baixo') {
      paredes.push(parede(ret.x, ret.y, ret.x, ret.y + ret.h));
      paredes.push(parede(ret.x + ret.w, ret.y, ret.x + ret.w, ret.y + ret.h));
    } else {
      paredes.push(parede(ret.x, ret.y, ret.x + ret.w, ret.y));
      paredes.push(parede(ret.x, ret.y + ret.h, ret.x + ret.w, ret.y + ret.h));
    }
  } else {
    // sala de dentro da planta: poço no chão
    const d = el('div', 'saida poco', { left: px(s.x + (R - 2.4) / 2), top: px(s.y + R - 2.7), width: px(2.4), height: px(2.4) });
    d.innerHTML = rotulo;
    d.title = 'Poço para o ' + destino.toLowerCase();
    stage.appendChild(d);
  }
}

// muda quando o que o jogador pode ver no andar muda (salas reveladas, perfil)
let assinaturaAndar = '';
function assinatura() {
  const s = Store.state.salas || {};
  let t = (mestre ? 'M' : 'J') + andarAtual + ':';
  for (let p = 1; p <= 25; p++) t += salaRevelada(andarAtual, cnDe(andarAtual, p)) ? '1' : '0';
  return t;
}

function atualizarElementos() {
  const mostra = mestre || !!(Store.state.rev || {})['a' + andarAtual];
  stage.classList.toggle('mostra-elementos', mostra);
  $('#chkElementos').checked = !!(Store.state.rev || {})['a' + andarAtual];
}

/* =========================================================
   FICHAS (os pontinhos)
   ========================================================= */
const fichasDom = new Map();
let selecionado = null;
let arrastando = null;

function rotuloFicha(tk) {
  const s = SER[tk.s];
  if (s.tipo === 'filho') return tk.n > 1 ? `${s.codigo} ${s.nome} #${tk.n}` : `${s.codigo} ${s.nome}`;
  return s.nome;
}

function desenharFichas() {
  if (!podeVer(andarAtual)) return;
  const tokens = Store.state.tokens || {};
  const vistos = new Set();

  Object.entries(tokens).forEach(([id, tk]) => {
    if (!SER[tk.s] || tk.a !== andarAtual) return;
    if (tk.h && !mestre && tk.s !== meu) return;
    vistos.add(id);
    let f = fichasDom.get(id);
    if (!f) {
      const s = SER[tk.s];
      f = el('div', 'ficha ' + s.tipo);
      f.dataset.id = id;
      f.style.setProperty('--cor', s.cor);
      f.innerHTML = `<div class="ficha-sombra"></div>
        <div class="ficha-pino">
          <span class="ficha-nome"></span>
          <div class="ficha-cabeca"${s.img ? ` style="background-image:url('${s.img}')"` : ''}></div>
          <div class="ficha-haste"></div>
        </div>`;
      ligarArraste(f);
      stage.appendChild(f);
      fichasDom.set(id, f);
    }
    if (!arrastando || arrastando.id !== id) {
      f.style.left = px(tk.x); f.style.top = px(tk.y);
    }
    $('.ficha-nome', f).textContent = rotuloFicha(tk);
    f.classList.toggle('oculta', !!tk.h);
    f.classList.toggle('minha', !mestre && tk.s === meu);
    f.classList.toggle('selecionada', selecionado === id);
  });

  fichasDom.forEach((f, id) => { if (!vistos.has(id)) { f.remove(); fichasDom.delete(id); } });
}

function ligarArraste(f) {
  const cabeca = $('.ficha-cabeca', f);
  cabeca.addEventListener('pointerdown', e => {
    e.stopPropagation();
    esconderDica();
    const id = f.dataset.id;
    if (!podeMover(Store.state.tokens[id])) { selecionar(id); return; }
    const tk = Store.state.tokens[id];
    const p = telaParaPiso(e.clientX, e.clientY);
    arrastando = { id, dx: tk.x - p.x, dy: tk.y - p.y, andou: false, ultimo: 0 };
    cabeca.setPointerCapture(e.pointerId);
    f.classList.add('arrastada');
  });
  cabeca.addEventListener('pointermove', e => {
    if (!arrastando || arrastando.id !== f.dataset.id) return;
    const p = telaParaPiso(e.clientX, e.clientY);
    const x = clamp(p.x + arrastando.dx, 0.3, W - 0.3);
    const y = clamp(p.y + arrastando.dy, 0.3, H - 0.3);
    arrastando.andou = true;
    f.style.left = px(x); f.style.top = px(y);
    const tk = Store.state.tokens[arrastando.id];
    tk.x = +x.toFixed(2); tk.y = +y.toFixed(2);
    const agora = performance.now();
    if (agora - arrastando.ultimo > 120) {   // envia aos jogadores enquanto arrasta
      arrastando.ultimo = agora;
      Store.definir(['tokens', arrastando.id], { ...tk });
    }
  });
  const fim = () => {
    if (!arrastando || arrastando.id !== f.dataset.id) return;
    const { id, andou } = arrastando;
    arrastando = null;
    f.classList.remove('arrastada');
    if (andou) Store.definir(['tokens', id], { ...Store.state.tokens[id] });
    selecionar(id);
  };
  cabeca.addEventListener('pointerup', fim);
  cabeca.addEventListener('pointercancel', fim);
}

/* ---------- Cartão do ser selecionado ---------- */
let salaSel = null;
function selecionar(id) {
  selecionado = id;
  salaSel = null;
  $$('.sala.sel').forEach(s => s.classList.remove('sel'));
  $$('.ficha').forEach(f => f.classList.toggle('selecionada', f.dataset.id === id));
  desenharCartao();
}

function selecionarSala(cn) {
  selecionar(null);
  salaSel = cn;
  $$('.sala').forEach(s => s.classList.toggle('sel', +s.dataset.cn === cn));
  desenharCartao();
}

function desenharCartaoSala() {
  const c = $('#cartao');
  const cn = salaSel;
  const a = Math.ceil(cn / 25);
  const andar = ANDARES[a - 1];
  const p = cn - 25 * (a - 1);
  const [nome, elm] = andar.salas[cn] || (p === 25 ? ['Zona Neutra', 'F'] : ['', '?']);
  const el2 = ELEMENTOS[elm] || ELEMENTOS['?'];
  const saida = saidaDoAndar(a);
  const temSaida = saida && saida.p === p;
  const rev = salaRevelada(a, cn);
  c.style.setProperty('--cor', el2.cor);
  c.innerHTML = `<button class="fechar" aria-label="Fechar">×</button>
    <div class="cartao-topo"><div class="cartao-bola sala-bola"></div><div>
      <h3>CN ${String(cn).padStart(2, '0')}</h3><span class="cod">${nome || 'sem nome registrado'}</span></div></div>
    <p>Elemento: ${el2.nome}${temSaida ? `<br><strong>Elevador para o ${a < 5 ? (a + 1) + 'º andar' : '???'}</strong>` : ''}</p>
    <p>Para os jogadores: <strong>${rev ? 'revelada' : 'desconhecida'}</strong></p>
    <div class="acoes"><button data-acao="revelar">${rev ? 'Esconder dos jogadores' : 'Revelar aos jogadores'}</button></div>`;
  c.hidden = false;
  $('.fechar', c).onclick = () => selecionar(null);
  $('[data-acao="revelar"]', c).onclick = () => Store.definir(['salas', 'c' + cn], !rev);
}

function desenharCartao() {
  const c = $('#cartao');
  if (salaSel && mestre) { desenharCartaoSala(); return; }
  const tk = selecionado && Store.state.tokens[selecionado];
  if (!tk || (tk.h && !mestre && tk.s !== meu)) { c.hidden = true; return; }
  const s = SER[tk.s];
  c.style.setProperty('--cor', s.cor);
  const foto = s.img ? `<img src="${s.img}" alt="">` : `<div class="cartao-bola"></div>`;
  let linhas = '';
  const fn = funcaoDe(s.id);
  if (s.tipo === 'cobaia') linhas = `<p>Interpretado por ${s.jogador}${fn ? `<br>Função: ${fn} <span class="so-mestre">só o Mestre vê</span>` : ''}</p>${!mestre && tk.s === meu ? '<p><strong>Esta é a sua cobaia.</strong> Arraste a ficha para movê-la.</p>' : ''}`;
  if (s.tipo === 'npc') linhas = fn ? `<p>Função: ${fn} <span class="so-mestre">só o Mestre vê</span></p>` : '';
  if (s.tipo === 'filho') linhas = `<p>Filho da O.R.F.E.U.</p>`;
  const titulo = s.tipo === 'filho' ? s.nome + (tk.n > 1 ? ` #${tk.n}` : '') : s.nome;

  let acoes = '';
  if (mestre) {
    const opcoes = ANDARES.map(a => `<option value="${a.id}" ${a.id === tk.a ? 'selected' : ''}>${a.titulo}</option>`).join('');
    acoes = `<div class="acoes">
      <button data-acao="ocultar">${tk.h ? 'Mostrar aos jogadores' : 'Ocultar dos jogadores'}</button>
      <select data-acao="andar" aria-label="Enviar para o andar">${opcoes}</select>
      <button data-acao="remover">Tirar do mapa</button>
    </div>`;
  }

  c.innerHTML = `<button class="fechar" aria-label="Fechar">×</button>
    <div class="cartao-topo">${foto}<div><h3>${titulo}</h3><span class="cod">${s.codigo}</span></div></div>
    ${linhas}<p><strong>Onde:</strong> ${descreveLocal(tk)}</p>${acoes}`;
  c.hidden = false;

  $('.fechar', c).onclick = () => selecionar(null);
  if (mestre) {
    $('[data-acao="ocultar"]', c).onclick = () => Store.definir(['tokens', selecionado], { ...tk, h: !tk.h });
    $('[data-acao="remover"]', c).onclick = () => { const id = selecionado; selecionar(null); Store.definir(['tokens', id], null); };
    $('[data-acao="andar"]', c).onchange = ev => {
      const a = +ev.target.value;
      Store.definir(['tokens', selecionado], { ...tk, a, x: CENTRO_ZN.x, y: CENTRO_ZN.y - 1.2 });
      irParaAndar(a);
    };
  }
}

/* =========================================================
   PAINEL
   ========================================================= */
function bola(s) {
  return `<span class="bola ${s.tipo === 'filho' ? 'filho' : ''}" style="--cor:${s.cor};${s.img ? `background-image:url('${s.img}')` : ''}"></span>`;
}

function desenharPainel() {
  const tokens = Store.state.tokens || {};

  // Cobaias
  $('#listaCobaias').innerHTML = SERES.filter(s => s.tipo === 'cobaia').map(s => {
    const tk = tokens[s.id];
    const visivel = tk && (!tk.h || mestre);
    return `<li data-id="${s.id}">${bola(s)}<span class="info">
      <strong>${s.nome} <span class="sub" style="display:inline">${s.codigo}</span>${!mestre && s.id === meu ? '<span class="voce">você</span>' : ''}</strong>
      <span class="sub">${s.jogador}${funcaoDe(s.id) ? ' · ' + funcaoDe(s.id) : ''}</span>
      <span class="onde">${visivel ? descreveLocal(tk) : 'localização desconhecida'}</span></span></li>`;
  }).join('');

  // Presenças no andar aberto (NPCs e Filhos)
  const pres = Object.entries(tokens)
    .filter(([, tk]) => SER[tk.s] && SER[tk.s].tipo !== 'cobaia' && tk.a === andarAtual && (!tk.h || mestre))
    .sort((a, b) => SER[a[1].s].codigo.localeCompare(SER[b[1].s].codigo));
  const podeAndar = podeVer(andarAtual);
  $('#listaPresencas').innerHTML = podeAndar ? pres.map(([id, tk]) => {
    const s = SER[tk.s];
    return `<li data-id="${id}">${bola(s)}<span class="info">
      <strong>${s.tipo === 'filho' ? `${s.codigo} · ${s.nome}${tk.n > 1 ? ' #' + tk.n : ''}` : s.nome}</strong>
      <span class="onde">${descreveLocal(tk)}${tk.h ? ' · oculto' : ''}</span></span></li>`;
  }).join('') : '';
  $('#semPresencas').hidden = podeAndar && pres.length > 0;

  $$('.lista-seres li').forEach(li => li.onclick = () => irParaFicha(li.dataset.id));

  if (mestre) desenharTray();
}

function desenharFuncoes() {
  const caixa = $('#listaFuncoes');
  if (caixa.contains(document.activeElement)) return;   // não atrapalha quem está digitando
  caixa.innerHTML = SERES.filter(s => s.tipo !== 'filho').map(s =>
    `<label class="funcao-linha"><span>${s.nome}</span>
      <input data-id="${s.id}" value="${(Segredos.dados[s.id] || '').replace(/"/g, '&quot;')}" placeholder="função"></label>`).join('');
  $$('input', caixa).forEach(i => i.onchange = () => { Segredos.definir(i.dataset.id, i.value); atualizarTudo(); });
}

function desenharTray() {
  desenharFuncoes();
  const tokens = Store.state.tokens || {};
  const unicos = SERES.filter(s => s.tipo !== 'filho');
  $('#trayNpc').innerHTML = unicos.map(s => {
    const tk = tokens[s.id];
    const onde = tk ? (tk.a === andarAtual ? 'aqui' : `${tk.a}º`) : '';
    return `<button data-ser="${s.id}" title="${tk ? 'Trazer para este andar' : 'Colocar no mapa'}">
      <span class="pinta" style="--cor:${s.cor};${s.img ? `background-image:url('${s.img}')` : ''}"></span>${s.nome}
      ${onde ? `<span class="qtd">${onde}</span>` : ''}</button>`;
  }).join('');
  $('#trayFilhos').innerHTML = SERES.filter(s => s.tipo === 'filho').map(s => {
    const qtd = Object.values(tokens).filter(t => t.s === s.id).length;
    return `<button data-ser="${s.id}" title="Colocar mais um no andar aberto">
      <span class="pinta filho" style="--cor:${s.cor}"></span>${s.codigo} ${s.nome}
      ${qtd ? `<span class="qtd">×${qtd}</span>` : ''}</button>`;
  }).join('');
  $$('#trayNpc button, #trayFilhos button').forEach(b => b.onclick = () => colocar(b.dataset.ser));
}

function colocar(serId) {
  const s = SER[serId];
  const tokens = Store.state.tokens || {};
  const jitter = () => +(Math.random() * 2.4 - 1.2).toFixed(2);
  const pos = { x: CENTRO_ZN.x + jitter(), y: CENTRO_ZN.y - 1.2 + jitter() };
  if (s.tipo !== 'filho') {
    const atual = tokens[serId];
    if (atual && atual.a === andarAtual) { irParaFicha(serId); return; }
    Store.definir(['tokens', serId], { s: serId, a: andarAtual, ...pos, h: atual ? !!atual.h : false, n: 1 });
    selecionar(serId);
    return;
  }
  const usados = Object.values(tokens).filter(t => t.s === serId).map(t => t.n || 1);
  const n = usados.length ? Math.max(...usados) + 1 : 1;
  const id = `${serId}-${n}`;
  Store.definir(['tokens', id], { s: serId, a: andarAtual, ...pos, h: false, n });
  selecionar(id);
}

function irParaFicha(id) {
  const tk = Store.state.tokens[id];
  if (!tk) return;
  if (tk.a !== andarAtual) {
    if (!podeVer(tk.a)) { irParaAndar(tk.a); return; }
    irParaAndar(tk.a);
  }
  focar(tk.x, tk.y);
  selecionar(id);
  $('#painel').classList.remove('aberto');
}

/* ---------- Elevador ---------- */
function desenharElevador() {
  const tokens = Store.state.tokens || {};
  $('#listaAndares').innerHTML = ANDARES.map(a => {
    const temCobaia = Object.values(tokens).some(t => t.a === a.id && SER[t.s] && SER[t.s].tipo === 'cobaia' && (!t.h || mestre));
    const trancado = !podeVer(a.id);
    return `<button class="andar-btn ${a.id === andarAtual ? 'atual' : ''}" data-andar="${a.id}" title="${a.titulo}${trancado ? ' (trancado)' : ''}">
      ${a.id}${trancado ? '<span class="cadeado">🔒</span>' : ''}${temCobaia && !trancado ? '<span class="ocupado"></span>' : ''}</button>`;
  }).join('');
  $$('.andar-btn').forEach(b => b.onclick = () => irParaAndar(+b.dataset.andar));
}

function irParaAndar(a) {
  if (a === andarAtual && stage.childElementCount) return;
  andarAtual = a;
  selecionar(null);
  montarAndar();
  atualizarTudo();
}

function atualizarTudo() {
  desenharRuido();
  verificarAlarme();
  atualizarProtocolo();
  desenharElevador();
  atualizarElementos();
  desenharFichas();
  desenharPainel();
  desenharCartao();
}

/* =========================================================
   FORMULÁRIOS
   ========================================================= */
$('#formSenha').addEventListener('submit', async e => {
  e.preventDefault();
  const h = await hash($('#inputSenha').value.trim());
  if (h === SENHAS_ANDARES[andarAtual]) {
    liberados.add(andarAtual);
    salvarLiberados();
    montarAndar();
    atualizarTudo();
  } else {
    $('#erroSenha').hidden = false;
    $('#inputSenha').select();
  }
});

/* =========================================================
   RUÍDO: decibelímetro, quebras do limite e o Protocolo
   ========================================================= */
// quadradinhos por número de cobaias na mesma sala
const NIVEIS = [
  { db: 0,  nome: 'Silêncio' },
  { db: 28, nome: 'Baixo' },
  { db: 41, nome: 'Moderado' },
  { db: 57, nome: 'Alto' },
  { db: 68, nome: 'No limite' },
  { db: 83, nome: 'Limite rompido' },
];
const nivelDe = n => n <= 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : n === 5 ? 4 : 5;

// agrupa as cobaias por sala (andar + posição). No corredor, cada uma conta sozinha.
const isentos = new Set();   // cobaias na Zona Neutra (não contam)
function gruposDeSala() {
  const g = new Map();
  isentos.clear();
  Object.entries(Store.state.tokens || {}).forEach(([id, tk]) => {
    if (!SER[tk.s] || SER[tk.s].tipo !== 'cobaia') return;
    const p = salaEm(tk.a, tk.x, tk.y);
    if (p === 25 && typeof ZONA_NEUTRA_ISENTA !== 'undefined' && ZONA_NEUTRA_ISENTA) { isentos.add(id); return; }
    const k = p ? `${tk.a}:${p}` : `corr:${id}`;
    if (!g.has(k)) g.set(k, { a: tk.a, p, ids: [] });
    g.get(k).ids.push(id);
  });
  return g;
}

function quadradinhos(nivel) {
  let h = '<span class="medidor">';
  for (let i = 1; i <= 5; i++) h += `<span class="q${i <= nivel ? ' on n' + i : ''}"></span>`;
  return h + '</span>';
}

function nomeGrupo(gr) {
  if (!gr.p) return `${nomeAndar(gr.a)} · Corredor`;
  return descreveLocal({ a: gr.a, x: retSala(gr.p).x + 1, y: retSala(gr.p).y + 1 });
}

function desenharRuido() {
  const grupos = gruposDeSala();
  const nivelDoId = {};
  grupos.forEach(gr => gr.ids.forEach(id => { nivelDoId[id] = { n: nivelDe(gr.ids.length), qtd: gr.ids.length }; }));
  const tokens = Store.state.tokens || {};

  $('#listaRuido').innerHTML = SERES.filter(s => s.tipo === 'cobaia').map(s => {
    const tk = tokens[s.id];
    const visivel = tk && (!tk.h || mestre || s.id === meu);
    if (visivel && isentos.has(s.id)) return `<li><span class="r-nome">${s.nome}</span>${quadradinhos(0)}<span class="r-txt">Zona Neutra · isenta</span></li>`;
    if (!visivel || !nivelDoId[s.id]) return `<li><span class="r-nome">${s.nome}</span>${quadradinhos(0)}<span class="r-txt">—</span></li>`;
    const { n } = nivelDoId[s.id];
    return `<li class="${n >= 5 ? 'estouro' : ''}"><span class="r-nome">${s.nome}</span>${quadradinhos(n)}<span class="r-txt">${NIVEIS[n].nome} · ${NIVEIS[n].db} dB</span></li>`;
  }).join('');

  if (!mestre) return;
  // decibelímetro do Mestre: mostra a sala mais barulhenta da Caixa
  let pior = null;
  grupos.forEach(gr => { if (!pior || gr.ids.length > pior.ids.length) pior = gr; });
  const nMax = pior ? nivelDe(pior.ids.length) : 0;
  let col = '';
  for (let i = 5; i >= 1; i--) col += `<div class="dq${i <= nMax ? ' on n' + i : ''}"><span>${NIVEIS[i].db} dB</span><em>${NIVEIS[i].nome}</em></div>`;
  $('#decibelimetro').innerHTML = col;
  $('#decibelInfo').textContent = pior ? `Mais barulho: ${nomeGrupo(pior)} (${pior.ids.length} cobaia${pior.ids.length > 1 ? 's' : ''})` : 'Nenhuma cobaia no mapa.';

  const rompidas = [...grupos.values()].filter(gr => nivelDe(gr.ids.length) >= 5);
  $('#alertaRuido').hidden = rompidas.length === 0;
  $('#alertaRuidoTxt').textContent = rompidas.map(gr => `${nomeGrupo(gr)}: ${gr.ids.length} cobaias`).join(' · ');

  const r = Store.state.ruido || { q: 0, p: false };
  $('#qtdQuebras').textContent = r.q || 0;
  $('#barraQuebras').innerHTML = [1, 2, 3].map(i => `<span class="${i <= (r.q || 0) ? 'on' : ''}"></span>`).join('');
  const btnP = $('#btnProtocolo');
  btnP.disabled = !r.p && (r.q || 0) < 3;
  btnP.textContent = r.p ? 'Encerrar Protocolo Filho da O.R.F.E.U.' : 'Iniciar Protocolo Filho da O.R.F.E.U.';
  btnP.classList.toggle('pronto', !r.p && (r.q || 0) >= 3);
}

// toca o aviso quando uma sala passa a romper o limite
let salasRompidas = null;
function verificarAlarme() {
  const agora = new Set();
  gruposDeSala().forEach((gr, k) => { if (nivelDe(gr.ids.length) >= 5) agora.add(k); });
  if (salasRompidas) {
    const nova = [...agora].some(k => !salasRompidas.has(k));
    if (nova) { Som.alarme(); piscar(); }
  }
  salasRompidas = agora;
}

function piscar() {
  document.body.classList.remove('pisca');
  void document.body.offsetWidth;
  document.body.classList.add('pisca');
}

let protocoloAntes = null;
function atualizarProtocolo() {
  const ativo = !!(Store.state.ruido || {}).p;
  $('#faixaProtocolo').hidden = !ativo;
  if (ativo && protocoloAntes === false) {
    $('#telaProtocolo').hidden = false;
    Som.sirene();
    setTimeout(() => { $('#telaProtocolo').hidden = true; }, 7000);
  }
  if (!ativo) $('#telaProtocolo').hidden = true;
  protocoloAntes = ativo;
}

/* ---------- Som (gerado pelo navegador, sem arquivos) ---------- */
const Som = {
  ctx: null,
  pronto() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tom(freq, ini, dur, tipo = 'square', vol = 0.12, freqFim) {
    const c = this.pronto(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = tipo; o.frequency.setValueAtTime(freq, c.currentTime + ini);
    if (freqFim) o.frequency.linearRampToValueAtTime(freqFim, c.currentTime + ini + dur);
    g.gain.setValueAtTime(vol, c.currentTime + ini);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + ini + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + ini); o.stop(c.currentTime + ini + dur + 0.02);
  },
  alarme() { for (let i = 0; i < 4; i++) { this.tom(880, i * 0.42, 0.18); this.tom(620, i * 0.42 + 0.2, 0.18); } },
  sirene() { for (let i = 0; i < 7; i++) { this.tom(420, i, 0.5, 'sawtooth', 0.1, 1050); this.tom(1050, i + 0.5, 0.5, 'sawtooth', 0.1, 420); } },
};
// navegadores só liberam som depois de um clique
document.addEventListener('pointerdown', () => Som.pronto(), { passive: true });

$('#btnQuebra').addEventListener('click', () => Store.definir(['ruido', 'q'], ((Store.state.ruido || {}).q || 0) + 1));
$('#btnQuebraMenos').addEventListener('click', () => Store.definir(['ruido', 'q'], Math.max(0, ((Store.state.ruido || {}).q || 0) - 1)));
$('#btnQuebraZerar').addEventListener('click', () => { if (confirm('Zerar as quebras do limite (novo dia)?')) Store.definir(['ruido', 'q'], 0); });
$('#btnRegistrarAlerta').addEventListener('click', () => Store.definir(['ruido', 'q'], ((Store.state.ruido || {}).q || 0) + 1));
$('#btnProtocolo').addEventListener('click', () => {
  const r = Store.state.ruido || {};
  // encerrar também zera o limite diário na hora
  if (r.p) { if (confirm('Encerrar o Protocolo Filho da O.R.F.E.U.? As quebras do limite diário voltam a 0.')) Store.definir(['ruido'], { q: 0, p: false }); return; }
  if (confirm('Iniciar o Protocolo Filho da O.R.F.E.U.? Todos os jogadores vão ver e ouvir o alarme.')) Store.definir(['ruido', 'p'], true);
});
$('#btnTesteSom').addEventListener('click', () => Som.alarme());

// revelar ou esconder todas as salas do andar aberto
function revelarAndar(sim) {
  for (let p = 1; p <= 25; p++) Store.definir(['salas', 'c' + cnDe(andarAtual, p)], sim);
}
$('#btnRevelarAndar').addEventListener('click', () => { if (confirm('Revelar aos jogadores todas as salas deste andar?')) revelarAndar(true); });
$('#btnEsconderAndar').addEventListener('click', () => { if (confirm('Esconder dos jogadores todas as salas deste andar?')) revelarAndar(false); });

/* ---------- Perfil: Jogador ou Mestre ---------- */
let meu = null;   // id da cobaia do jogador neste navegador
function lerPerfil() { try { return localStorage.getItem('acf-perfil') || ''; } catch (e) { return ''; } }
function salvarPerfil(v) { try { v ? localStorage.setItem('acf-perfil', v) : localStorage.removeItem('acf-perfil'); } catch (e) {} }
const podeMover = tk => !!tk && (mestre || (!!meu && tk.s === meu));

function atualizarBotaoPerfil() {
  const b = $('#btnMestre');
  b.textContent = mestre ? 'Mestre ✓ · trocar' : meu ? `${SER[meu].nome} · trocar` : 'Entrar';
  b.classList.toggle('ativo', mestre || !!meu);
}

function mostrarPerfil(passo) {
  $('#perfil').hidden = false;
  $('#perfilPasso1').hidden = passo !== 1;
  $('#perfilPasso2').hidden = passo !== 2;
  if (passo === 2) {
    $('#listaPersonagens').innerHTML = SERES.filter(s => s.tipo === 'cobaia').map(s =>
      `<button class="perso" data-id="${s.id}" style="--cor:${s.cor}">
        <img src="${s.img}" alt=""><strong>${s.nome}</strong><span>${s.jogador}</span></button>`).join('');
    $$('#listaPersonagens .perso').forEach(b => b.onclick = () => escolherPersonagem(b.dataset.id));
  }
}

function escolherPersonagem(id) {
  meu = id;
  salvarPerfil('jogador:' + id);
  $('#perfil').hidden = true;
  if (Store.modo === 'firebase' && !Store.auth.currentUser) Store.auth.signInAnonymously().catch(erroGravacao);
  atualizarBotaoPerfil();
  atualizarTudo();
  const tk = Store.state.tokens[id];
  if (tk && podeVer(tk.a)) irParaFicha(id);
}

function abrirLoginMestre() {
  $('#perfil').hidden = true;
  $('#campoEmail').hidden = Store.modo !== 'firebase';
  $('#mestreErro').hidden = true;
  $('#mestreSenha').value = '';
  $('#dlgMestre').showModal();
}

function trocarPerfil() {
  meu = null;
  salvarPerfil('');
  if (Store.modo === 'firebase' && Store.auth.currentUser) Store.auth.signOut();
  definirMestre(false);
  selecionar(null);
  mostrarPerfil(1);
}

$('#btnSouJogador').addEventListener('click', () => mostrarPerfil(2));
$('#btnSouMestre').addEventListener('click', abrirLoginMestre);
$('#btnVoltarPerfil').addEventListener('click', () => mostrarPerfil(1));
$('#btnMestre').addEventListener('click', trocarPerfil);
// cancelar o login de Mestre volta para a tela de escolha
$('#dlgMestre').addEventListener('close', () => { if (!mestre && !meu && lerPerfil() !== 'mestre') mostrarPerfil(1); });

$('#formMestre').addEventListener('submit', async e => {
  if (e.submitter && e.submitter.value === 'cancel') return;
  e.preventDefault();
  const senha = $('#mestreSenha').value;
  const erro = msg => { $('#mestreErro').textContent = msg; $('#mestreErro').hidden = false; };
  if (Store.modo === 'firebase') {
    try {
      await Store.auth.signInWithEmailAndPassword($('#mestreEmail').value.trim(), senha);
      salvarPerfil('mestre'); meu = null;
      $('#dlgMestre').close();
    } catch (err) { erro('E-mail ou senha recusados.'); }
  } else {
    if (await hash(senha) === SENHA_MESTRE) { salvarPerfil('mestre'); meu = null; definirMestre(true); $('#dlgMestre').close(); }
    else erro('Senha recusada.');
  }
});

$('#btnSair').addEventListener('click', trocarPerfil);

$('#chkElementos').addEventListener('change', e => Store.definir(['rev', 'a' + andarAtual], e.target.checked ? true : null));

$('#btnReset').addEventListener('click', () => {
  if (!confirm('Recolocar as 7 cobaias na Zona Neutra do 1º andar?')) return;
  const ini = posicoesIniciais();
  Object.entries(ini).forEach(([id, tk]) => Store.definir(['tokens', id], tk));
});

$('#btnLimpar').addEventListener('click', () => {
  if (!confirm('Tirar todas as cobaias NPC e todos os Filhos do mapa, em todos os andares?')) return;
  Object.entries(Store.state.tokens || {}).forEach(([id, tk]) => {
    if (SER[tk.s] && SER[tk.s].tipo !== 'cobaia') Store.definir(['tokens', id], null);
  });
  selecionar(null);
});

$('#btnHash').addEventListener('click', () => {
  $('#hashEntrada').value = ''; $('#hashSaida').value = '';
  $('#dlgHash').showModal();
});
$('#hashEntrada').addEventListener('input', async e => {
  $('#hashSaida').value = e.target.value ? `'${await hash(e.target.value.trim())}'` : '';
});

$('#btnPainel').addEventListener('click', () => $('#painel').classList.add('aberto'));
$('#btnFecharPainel').addEventListener('click', () => $('#painel').classList.remove('aberto'));

/* =========================================================
   INÍCIO
   ========================================================= */
Store.aoMudar(() => {
  if (podeVer(andarAtual) && assinatura() !== assinaturaAndar) montarAndar();
  atualizarTudo();
});

window.addEventListener('resize', () => enquadrar());

(async function iniciar() {
  aplicarCamera();
  montarAndar();
  enquadrar();
  const perfil = lerPerfil();
  if (perfil.startsWith('jogador:') && SER[perfil.slice(8)]) meu = perfil.slice(8);
  if (!FIREBASE && perfil === 'mestre') { try { if (localStorage.getItem('acf-mestre') === '1') mestre = true; } catch (e) {} }
  await Store.iniciar();
  if (mestre && Store.modo === 'local') definirMestre(true);
  atualizarBotaoPerfil();
  atualizarTudo();
  // sem perfil salvo: pergunta quem é
  if (!meu && !mestre && !(FIREBASE && perfil === 'mestre')) mostrarPerfil(1);
})();

})();
