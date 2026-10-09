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
  if (c < 4) CORREDORES.push({ x: x + R, y: y + (R - CW) / 2, w: G, h: CW, eixo: 'h', p1: LAYOUT[r][c], p2: LAYOUT[r][c + 1] });
  if (r < 4) CORREDORES.push({ x: x + (R - CW) / 2, y: y + R, w: CW, h: G, eixo: 'v', p1: LAYOUT[r][c], p2: LAYOUT[r + 1][c] });
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
const salaVisivel = (andar, cn) => mestre || !!aux || salaRevelada(andar, cn);

/* Quem enxerga cada ficha.
   h  = Ocultação geral: escondida dos jogadores.
   vf = Visível aos Filhos: o Mestre revelou essa cobaia/NPC aos Mestres Auxiliares.
   Mestre vê tudo. Auxiliar vê Filhos e robôs sempre, e cobaias/NPCs só com vf.
   Jogador vê o que não está oculto e a própria cobaia. */
function visivelPara(tk) {
  if (!tk || !SER[tk.s]) return false;
  if (mestre) return true;
  const tipo = SER[tk.s].tipo;
  if (aux) return tipo === 'filho' || tipo === 'robo' || !!tk.vf;
  return !tk.h || tk.s === meu;
}

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

function posicoesIniciais(andar = 1) {
  const tokens = {};
  const cob = SERES.filter(s => s.tipo === 'cobaia');
  cob.forEach((s, i) => {
    const ang = (i / cob.length) * Math.PI * 2 - Math.PI / 2;
    tokens[s.id] = { s: s.id, a: andar, x: +(CENTRO_ZN.x + Math.cos(ang) * 1.6).toFixed(2), y: +(CENTRO_ZN.y + Math.sin(ang) * 1.6).toFixed(2), h: false, n: 1 };
  });
  return tokens;
}
const estadoPadrao = () => ({ tokens: posicoesIniciais(), rev: {}, salas: {}, ruido: { q: 0, p: false }, persg: { on: false } });

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
      if (!u && (meu || aux)) this.auth.signInAnonymously().catch(erroGravacao);
      if (!u && lerPerfil() === 'mestre') { salvarPerfil(''); mostrarPerfil(1); }
    });
    this.db.ref('.info/connected').on('value', s => setSync(s.val() ? 'ao vivo' : 'reconectando…', s.val() ? 'vivo' : ''));
    this.db.ref('mapa').on('value', snap => {
      const v = snap.val();
      if (v && v.tokens !== undefined) {
        this.state = { tokens: v.tokens || {}, rev: v.rev || {}, salas: v.salas || {}, ruido: v.ruido || { q: 0, p: false }, persg: v.persg || { on: false } };
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
    this.gravar([id], valor || null);
  },
  // grava em qualquer ponto dos segredos (ex.: ['_notas', 'c14'])
  gravar(caminho, valor) {
    if (valor === '' || valor === undefined) valor = null;
    let o = this.dados;
    for (let i = 0; i < caminho.length - 1; i++) {
      const k = caminho[i];
      if (!o[k] || typeof o[k] !== 'object') o[k] = {};
      o = o[k];
    }
    const k = caminho[caminho.length - 1];
    if (valor === null) delete o[k]; else o[k] = valor;
    if (Store.modo === 'firebase') Store.db.ref('segredos/' + caminho.join('/')).set(valor).catch(erroGravacao);
    else this.salvarLocal();
  },
  // apaga várias chaves de uma vez dentro de um ramo
  apagar(ramo, chaves) {
    if (!chaves.length) return;
    const o = this.dados[ramo] || {};
    const upd = {};
    chaves.forEach(k => { delete o[k]; upd[k] = null; });
    if (Store.modo === 'firebase') Store.db.ref('segredos/' + ramo).update(upd).catch(erroGravacao);
    else this.salvarLocal();
  },
  // troca tudo (usado ao restaurar um backup)
  substituir(obj) {
    this.dados = obj || {};
    if (Store.modo === 'firebase') Store.db.ref('segredos').set(this.dados).catch(erroGravacao);
    else this.salvarLocal();
  },
  novaChave() {
    if (Store.modo === 'firebase') return Store.db.ref('segredos/_diario').push().key;
    return 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },
  salvarLocal() { try { localStorage.setItem('acf-segredos', JSON.stringify(this.dados)); } catch (e) {} },
};
const notaDe = cn => (mestre && (Segredos.dados._notas || {})['c' + cn]) || '';
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
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
const podeVer = a => mestre || !!aux || liberados.has(a);

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
  CORREDORES.forEach((c, ci) => {
    const d = el('div', 'corredor', { left: px(c.x), top: px(c.y), width: px(c.w), height: px(c.h), backgroundSize: `${T}px ${T}px` });
    d.dataset.ci = ci;
    d.innerHTML = '<span class="corr-m">14 m</span>';
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
    // grade do piso: 8 quadradinhos por lado (cada um com 0,88 m)
    const d = el('div', 'sala', { left: px(s.x), top: px(s.y), width: px(s.w), height: px(s.h), backgroundSize: `${R * T / 8}px ${R * T / 8}px` });
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
  let t = (mestre ? 'M' : aux ? 'A' : 'J') + andarAtual + ':';
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

function rotuloFicha(tk, id) {
  const s = SER[tk.s];
  const pz = participante(id);
  if (pz) return `${rotuloBase(tk)} · ${fmtM(tk.m || 0)}/${pz.lim} m`;
  return rotuloBase(tk);
}
function rotuloBase(tk) {
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
    if (!visivelPara(tk)) return;
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
    $('.ficha-nome', f).textContent = rotuloFicha(tk, id);
    f.classList.toggle('na-vez', vezAtual() === id);
    f.classList.toggle('oculta', !!tk.h);
    f.classList.toggle('minha', !mestre && podeMover(tk));
    f.classList.toggle('vista-filhos', mestre && !!tk.vf);
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
    const tk = Store.state.tokens[id];
    if (!podeMover(tk)) { selecionar(id); return; }
    const motivo = bloqueioPerseguicao(id, tk);
    if (motivo) { aviso(motivo); selecionar(id); return; }
    const p = telaParaPiso(e.clientX, e.clientY);
    arrastando = { id, dx: tk.x - p.x, dy: tk.y - p.y, andou: false, ultimo: 0, limitado: !!limiteDe(id), antes: { a: tk.a, x: tk.x, y: tk.y, m: tk.m || 0 } };
    cabeca.setPointerCapture(e.pointerId);
    f.classList.add('arrastada');
  });
  cabeca.addEventListener('pointermove', e => {
    if (!arrastando || arrastando.id !== f.dataset.id) return;
    const tk = Store.state.tokens[arrastando.id];
    const p = telaParaPiso(e.clientX, e.clientY);
    let alvo = { x: clamp(p.x + arrastando.dx, 0.3, W - 0.3), y: clamp(p.y + arrastando.dy, 0.3, H - 0.3) };
    const atual = { x: tk.x, y: tk.y };
    // paredes: não atravessa blocos maciços (só se a ficha já está num lugar andável)
    if (andavel(tk.a, atual.x, atual.y) && !caminhoLivre(tk.a, atual, alvo)) return;
    // perseguição: limite de deslocamento do turno
    const lim = limiteDe(arrastando.id);
    if (lim) {
      const usado = tk.m || 0;
      if (usado >= lim - 0.001) return;
      let custo = custoMetros(atual, alvo);
      if (usado + custo > lim) {
        // anda só até gastar o que resta
        let lo = 0, hi = 1;
        for (let i = 0; i < 18; i++) {
          const mid = (lo + hi) / 2;
          const q = { x: atual.x + (alvo.x - atual.x) * mid, y: atual.y + (alvo.y - atual.y) * mid };
          if (usado + custoMetros(atual, q) <= lim) lo = mid; else hi = mid;
        }
        alvo = { x: atual.x + (alvo.x - atual.x) * lo, y: atual.y + (alvo.y - atual.y) * lo };
        custo = lim - usado;
      }
      tk.m = +Math.min(lim, usado + custo).toFixed(2);
    }
    arrastando.andou = true;
    tk.x = +alvo.x.toFixed(2); tk.y = +alvo.y.toFixed(2);
    f.style.left = px(tk.x); f.style.top = px(tk.y);
    $('.ficha-nome', f).textContent = rotuloFicha(tk, arrastando.id);
    const agora = performance.now();
    if (agora - arrastando.ultimo > 120) {   // envia aos jogadores enquanto arrasta
      arrastando.ultimo = agora;
      Store.definir(['tokens', arrastando.id], { ...tk });
    }
  });
  const fim = () => {
    if (!arrastando || arrastando.id !== f.dataset.id) return;
    const { id, andou, limitado, antes } = arrastando;
    arrastando = null;
    f.classList.remove('arrastada');
    const tk = Store.state.tokens[id];
    // voltou ao ponto de partida do turno: zera o que andou
    if (limitado && tk.x0 !== undefined && Math.hypot(tk.x - tk.x0, tk.y - tk.y0) < 0.35) {
      tk.x = tk.x0; tk.y = tk.y0; tk.m = 0;
    }
    if (andou) {
      Store.definir(['tokens', id], { ...tk });
      if (!mestre && (tk.x !== antes.x || tk.y !== antes.y)) empilharLocal(id, antes);
    }
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
  // não atrapalha o Mestre enquanto ele escreve a anotação
  const ta = $('textarea.nota-txt', c);
  if (ta && document.activeElement === ta && +c.dataset.sala === cn) return;
  c.dataset.sala = cn;
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
    <div class="acoes"><button data-acao="revelar">${rev ? 'Esconder dos jogadores' : 'Revelar aos jogadores'}</button>
      <button data-acao="vfsim">Revelar aos Filhos quem está aqui</button>
      <button data-acao="vfnao">Esconder dos Filhos quem está aqui</button></div>
    <label class="nota-sala">Anotações da sala <span class="so-mestre">só o Mestre vê</span>
      <textarea class="nota-txt" rows="4" placeholder="Pistas, armadilhas, o que já foi revelado…">${esc(notaDe(cn))}</textarea></label>
    <span class="nota-status" aria-live="polite"></span>`;
  c.hidden = false;
  const caixaNota = $('textarea.nota-txt', c);
  let tNota = null;
  const salvarNota = () => {
    clearTimeout(tNota);
    Segredos.gravar(['_notas', 'c' + cn], caixaNota.value.trim() || null);
    $('.nota-status', c).textContent = 'salvo';
    marcarNotas(); desenharNotas();
  };
  caixaNota.oninput = () => { $('.nota-status', c).textContent = 'digitando…'; clearTimeout(tNota); tNota = setTimeout(salvarNota, 700); };
  caixaNota.onblur = salvarNota;
  $('.fechar', c).onclick = () => selecionar(null);
  $('[data-acao="revelar"]', c).onclick = () => Store.definir(['salas', 'c' + cn], !rev);
  // ocultação dos Filhos por sala: revela/esconde as cobaias e NPCs que estão nela
  const naSala = () => Object.entries(Store.state.tokens || {}).filter(([, tk]) =>
    SER[tk.s] && (SER[tk.s].tipo === 'cobaia' || SER[tk.s].tipo === 'npc') && tk.a === a && salaEm(tk.a, tk.x, tk.y) === p);
  const marcar = sim => {
    const lista = naSala();
    lista.forEach(([id, tk]) => Store.definir(['tokens', id], { ...tk, vf: sim }));
    aviso(lista.length ? `${lista.length} ficha(s) ${sim ? 'reveladas aos' : 'escondidas dos'} Filhos.` : 'Nenhuma cobaia ou NPC nesta sala.');
  };
  $('[data-acao="vfsim"]', c).onclick = () => marcar(true);
  $('[data-acao="vfnao"]', c).onclick = () => marcar(false);
}

function desenharCartao() {
  const c = $('#cartao');
  if (salaSel && mestre) { desenharCartaoSala(); return; }
  delete c.dataset.sala;
  const tk = selecionado && Store.state.tokens[selecionado];
  if (!tk || !visivelPara(tk)) { c.hidden = true; return; }
  const s = SER[tk.s];
  c.style.setProperty('--cor', s.cor);
  const foto = s.img ? `<img src="${s.img}" alt="">` : `<div class="cartao-bola"></div>`;
  let linhas = '';
  const fn = funcaoDe(s.id);
  if (s.tipo === 'cobaia') linhas = `<p>Interpretado por ${s.jogador}${fn ? `<br>Função: ${fn} <span class="so-mestre">só o Mestre vê</span>` : ''}</p>${!mestre && tk.s === meu ? '<p><strong>Esta é a sua cobaia.</strong> Arraste a ficha para movê-la.</p>' : ''}`;
  if (s.tipo === 'npc') linhas = fn ? `<p>Função: ${fn} <span class="so-mestre">só o Mestre vê</span></p>` : '';
  if (s.tipo === 'filho') linhas = `<p>Filho da O.R.F.E.U.</p>`;
  if (s.tipo === 'robo') linhas = `<p>Robô S.T.A.F.F. · não faz barulho</p>`;
  const titulo = s.tipo === 'filho' ? s.nome + (tk.n > 1 ? ` #${tk.n}` : '') : s.nome;

  let acoes = '';
  if (mestre) {
    const opcoes = ANDARES.map(a => `<option value="${a.id}" ${a.id === tk.a ? 'selected' : ''}>${a.titulo}</option>`).join('');
    const podeVF = s.tipo === 'cobaia' || s.tipo === 'npc';
    acoes = `<div class="acoes">
      <button data-acao="ocultar">${tk.h ? 'Ocultação geral: LIGADA · revelar aos jogadores' : 'Ocultação geral: desligada · ocultar dos jogadores'}</button>
      ${podeVF ? `<button data-acao="vf">${tk.vf ? 'Visível aos Filhos · esconder dos Filhos' : 'Oculta dos Filhos · revelar aos Filhos'}</button>` : ''}
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
    const bvf = $('[data-acao="vf"]', c);
    if (bvf) bvf.onclick = () => Store.definir(['tokens', selecionado], { ...tk, vf: !tk.vf });
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
    const visivel = tk && visivelPara(tk);
    return `<li data-id="${s.id}">${bola(s)}<span class="info">
      <strong>${s.nome} <span class="sub" style="display:inline">${s.codigo}</span>${!mestre && s.id === meu ? '<span class="voce">você</span>' : ''}</strong>
      <span class="sub">${s.jogador}${funcaoDe(s.id) ? ' · ' + funcaoDe(s.id) : ''}</span>
      <span class="onde">${visivel ? descreveLocal(tk) : 'localização desconhecida'}</span></span></li>`;
  }).join('');

  // Presenças no andar aberto (NPCs e Filhos)
  const pres = Object.entries(tokens)
    .filter(([, tk]) => SER[tk.s] && (SER[tk.s].tipo !== 'cobaia' || aux) && tk.a === andarAtual && visivelPara(tk))
    .sort((a, b) => SER[a[1].s].codigo.localeCompare(SER[b[1].s].codigo));
  const podeAndar = podeVer(andarAtual);
  $('#listaPresencas').innerHTML = podeAndar ? pres.map(([id, tk]) => {
    const s = SER[tk.s];
    return `<li data-id="${id}">${bola(s)}<span class="info">
      <strong>${s.tipo === 'filho' ? `${s.codigo} · ${s.nome}${tk.n > 1 ? ' #' + tk.n : ''}` : s.nome}</strong>
      <span class="onde">${descreveLocal(tk)}${mestre && tk.h ? ' · oculto' : ''}${mestre && tk.vf ? ' · visível aos Filhos' : ''}</span></span></li>`;
  }).join('') : '';
  $('#semPresencas').hidden = podeAndar && pres.length > 0;

  $$('.lista-seres li').forEach(li => li.onclick = () => irParaFicha(li.dataset.id));

  if (mestre) desenharTray();
}

function desenharFuncoes() {
  const caixa = $('#listaFuncoes');
  if (caixa.contains(document.activeElement)) return;   // não atrapalha quem está digitando
  caixa.innerHTML = SERES.filter(s => s.tipo === 'cobaia' || s.tipo === 'npc').map(s =>
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
    // NPCs e robôs nascem na Zona Neutra, ocultos (só o Mestre vê) até ele revelar
    const oculto = atual ? !!atual.h : s.tipo !== 'cobaia';
    Store.definir(['tokens', serId], { s: serId, a: andarAtual, ...pos, h: oculto, vf: atual ? !!atual.vf : false, n: 1 });
    selecionar(serId);
    return;
  }
  const usados = Object.values(tokens).filter(t => t.s === serId).map(t => t.n || 1);
  const n = usados.length ? Math.max(...usados) + 1 : 1;
  const id = `${serId}-${n}`;
  // Filhos nascem ocultos numa sala sorteada do andar (nunca na Zona Neutra)
  const p = 1 + Math.floor(Math.random() * 24);
  const r = retSala(p);
  const lugar = { x: +(r.x + 0.7 + Math.random() * (R - 1.4)).toFixed(2), y: +(r.y + 0.7 + Math.random() * (R - 1.4)).toFixed(2) };
  Store.definir(['tokens', id], { s: serId, a: andarAtual, ...lugar, h: true, n });
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
    const temCobaia = Object.values(tokens).some(t => t.a === a.id && SER[t.s] && SER[t.s].tipo === 'cobaia' && visivelPara(t));
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

// O que o Mestre Auxiliar "ouve": salas com cobaias pulsam em vermelho
const ultimaPos = {};
function desenharSons() {
  const ouvinte = aux && !mestre;
  if (!ouvinte) $$('.sala.som, .corredor.som').forEach(e => e.classList.remove('som'));
  const grupos = gruposDeSala();
  const alvo = new Map();
  const elDe = (gr, k) => {
    if (gr.p) return $(`.sala[data-cn="${cnDe(andarAtual, gr.p)}"]`, stage);
    const tk = Store.state.tokens[k.slice(5)];
    const ci = tk ? CORREDORES.findIndex(c => dentro(c, tk.x, tk.y)) : -1;
    return ci >= 0 ? $(`.corredor[data-ci="${ci}"]`, stage) : null;
  };
  grupos.forEach((gr, k) => {
    if (gr.a !== andarAtual) return;
    const e = elDe(gr, k);
    if (e) alvo.set(e, Math.max(alvo.get(e) || 0, nivelDe(gr.ids.length)));
  });
  if (ouvinte) {
    $$('.sala, .corredor', stage).forEach(e => {
      const n = alvo.get(e) || 0;
      e.classList.toggle('som', n > 0);
      e.style.setProperty('--som', n);
    });
  }
  // pulso quando uma cobaia se mexe
  Object.entries(Store.state.tokens || {}).forEach(([id, tk]) => {
    if (!SER[tk.s] || SER[tk.s].tipo !== 'cobaia') return;
    const antes = ultimaPos[id];
    ultimaPos[id] = `${tk.a}:${tk.x}:${tk.y}`;
    if (!ouvinte || !antes || antes === ultimaPos[id] || tk.a !== andarAtual) return;
    const p = salaEm(tk.a, tk.x, tk.y);
    if (p === 25 && ZONA_NEUTRA_ISENTA) return;
    let e = p ? $(`.sala[data-cn="${cnDe(andarAtual, p)}"]`, stage) : null;
    if (!p) { const ci = CORREDORES.findIndex(c => dentro(c, tk.x, tk.y)); e = ci >= 0 ? $(`.corredor[data-ci="${ci}"]`, stage) : null; }
    if (e) { e.classList.remove('pulso'); void e.offsetWidth; e.classList.add('pulso'); }
  });
}

function atualizarTudo() {
  desenharSons();
  desenharPerseguicao();
  verificarPedidoIniciativa();
  desenharRuido();
  verificarAlarme();
  atualizarProtocolo();
  desenharElevador();
  atualizarElementos();
  desenharFichas();
  desenharPainel();
  desenharCartao();
  marcarNotas();
  desenharExtrasMestre();
  atualizarDesfazer();
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
    const visivel = tk && visivelPara(tk);
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
  desenharCiclo(r);
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

/* ---------- Ciclo diário ----------
   q  = quebras rumo ao Protocolo (zera no "Novo dia" e ao encerrar o Protocolo)
   qd = quebras de hoje (zera só no "Novo dia")
   d  = número do dia; hist = quebras de cada dia anterior */
const ruido = () => Store.state.ruido || { q: 0, p: false };
const hojeDe = r => r.qd !== undefined ? r.qd : (r.q || 0);
function mudarRuido(patch) { Store.definir(['ruido'], { ...ruido(), ...patch }); }
function somarQuebra(n) {
  const r = ruido();
  mudarRuido({ q: Math.max(0, (r.q || 0) + n), qd: Math.max(0, hojeDe(r) + n) });
}
function desenharCiclo(r) {
  const d = r.d || 1, q = r.q || 0;
  $('#cicloDia').textContent = d;
  $('#qtdHoje').textContent = hojeDe(r);
  let info;
  if (r.p) info = 'Protocolo em curso. Ao encerrar, as quebras rumo ao Protocolo voltam a 0.';
  else if (q >= 3) info = 'Limite estourado 3 vezes: o Protocolo está liberado.';
  else info = `Falta${3 - q > 1 ? 'm' : ''} ${3 - q} quebra${3 - q > 1 ? 's' : ''} para liberar o Protocolo. O limite reinicia ao clicar em "Novo dia" ou ao encerrar o Protocolo.`;
  $('#cicloInfo').textContent = info;
  const hist = r.hist || {};
  const dias = Object.keys(hist).map(k => +k.slice(1)).filter(n => n < d).sort((a, b) => b - a).slice(0, 6);
  $('#cicloHist').textContent = dias.length ? 'Dias anteriores: ' + dias.map(n => `Dia ${n}: ${hist['d' + n]} quebra${hist['d' + n] === 1 ? '' : 's'}`).join(' · ') : '';
}
$('#btnQuebra').addEventListener('click', () => somarQuebra(1));
$('#btnQuebraMenos').addEventListener('click', () => somarQuebra(-1));
$('#btnQuebraZerar').addEventListener('click', () => {
  const r = ruido(), d = r.d || 1;
  if (!confirm(`Encerrar o Dia ${d} e começar o Dia ${d + 1}? As quebras voltam a 0.`)) return;
  mudarRuido({ q: 0, qd: 0, d: d + 1, hist: { ...(r.hist || {}), ['d' + d]: hojeDe(r) } });
});
$('#btnDia').addEventListener('click', () => {
  const r = ruido();
  const v = prompt('Qual é o dia atual na Caixa?', r.d || 1);
  const n = parseInt(v, 10);
  if (n > 0) mudarRuido({ d: n });
});
$('#btnRegistrarAlerta').addEventListener('click', () => somarQuebra(1));
$('#btnProtocolo').addEventListener('click', () => {
  const r = Store.state.ruido || {};
  // encerrar também zera o limite diário na hora (o dia e o histórico ficam)
  if (r.p) { if (confirm('Encerrar o Protocolo Filho da O.R.F.E.U.? As quebras do limite diário voltam a 0.')) mudarRuido({ q: 0, p: false }); return; }
  if (confirm('Iniciar o Protocolo Filho da O.R.F.E.U.? Todos os jogadores vão ver e ouvir o alarme.')) Store.definir(['ruido', 'p'], true);
});
$('#btnTesteSom').addEventListener('click', () => Som.alarme());

// revelar ou esconder todas as salas do andar aberto
function revelarAndar(sim) {
  for (let p = 1; p <= 25; p++) Store.definir(['salas', 'c' + cnDe(andarAtual, p)], sim);
}
$('#btnRevelarAndar').addEventListener('click', () => { if (confirm('Revelar aos jogadores todas as salas deste andar?')) revelarAndar(true); });
$('#btnEsconderAndar').addEventListener('click', () => { if (confirm('Esconder dos jogadores todas as salas deste andar?')) revelarAndar(false); });

/* =========================================================
   ESCALA E MOVIMENTO
   Sala: 50 m² (5 x 5 quadradinhos de desenho = 7,07 m de lado).
   No piso da sala, cada quadradinho da grade vale 0,88 m (8 por lado).
   Corredor: 14 m de comprimento, seja qual for o tamanho desenhado.
   ========================================================= */
const LADO_SALA_M = Math.sqrt(50);        // 7,07 m
const M_POR_UNID = LADO_SALA_M / R;       // 1,414 m por unidade da planta
const M_CORREDOR = 14 / G;                // 7 m por unidade ao longo do corredor
const fmtM = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');

function dentro(r, x, y, folga = 0) {
  return x >= r.x - folga && x <= r.x + r.w + folga && y >= r.y - folga && y <= r.y + r.h + folga;
}
function andavel(andar, x, y) {
  for (let p = 1; p <= 25; p++) if (dentro(retSala(p), x, y)) return true;
  for (const c of CORREDORES) if (dentro(c, x, y)) return true;
  const rs = retSaida(saidaDoAndar(andar));
  return !!(rs && dentro(rs, x, y));
}
function caminhoLivre(andar, a, b) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.12));
  for (let i = 1; i <= n; i++) {
    if (!andavel(andar, a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n)) return false;
  }
  return true;
}
// metros por unidade em x e em y, conforme o lugar (sala ou corredor)
function escalaEm(x, y) {
  for (const c of CORREDORES) {
    if (c.x !== undefined && dentro(c, x, y) && !(() => { for (let p = 1; p <= 25; p++) if (dentro(retSala(p), x, y)) return true; return false; })()) {
      return c.eixo === 'h' ? [M_CORREDOR, M_POR_UNID] : [M_POR_UNID, M_CORREDOR];
    }
  }
  return [M_POR_UNID, M_POR_UNID];
}
function custoMetros(a, b) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.05));
  let total = 0;
  for (let i = 0; i < n; i++) {
    const x0 = a.x + (b.x - a.x) * i / n, y0 = a.y + (b.y - a.y) * i / n;
    const x1 = a.x + (b.x - a.x) * (i + 1) / n, y1 = a.y + (b.y - a.y) * (i + 1) / n;
    const [sx, sy] = escalaEm((x0 + x1) / 2, (y0 + y1) / 2);
    total += Math.hypot((x1 - x0) * sx, (y1 - y0) * sy);
  }
  return total;
}

let avisoTimer = null;
function aviso(txt) {
  const el2 = $('#aviso');
  el2.textContent = txt; el2.hidden = false;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => { el2.hidden = true; }, 2600);
}

/* =========================================================
   DADOS (d20 com bônus e desvantagem)
   ========================================================= */
let alvoDados = null;   // participante da perseguição que o Mestre está rolando
function abrirDados(titulo, alvo = null) {
  alvoDados = alvo;
  $('#dadosTitulo').textContent = titulo || 'Rolar dados';
  $('#dadosResultado').innerHTML = '';
  $('#painelDados').hidden = false;
}
function fecharDados() { $('#painelDados').hidden = true; alvoDados = null; }

function rolar() {
  const qtd = clamp(parseInt($('#dadosQtd').value, 10) || 1, 1, 10);
  const bonus = parseInt($('#dadosBonus').value, 10) || 0;
  const desv = $('#dadosDesv').checked;
  const dados = Array.from({ length: qtd }, () => 1 + Math.floor(Math.random() * 20));
  const escolhido = desv ? Math.min(...dados) : Math.max(...dados);
  const iEsc = dados.indexOf(escolhido);
  const total = escolhido + bonus;
  $('#dadosResultado').innerHTML =
    `<div class="dados-faces">${dados.map((v, i) => `<span class="face${i === iEsc ? ' usada' : ''}${v === 20 ? ' crit' : ''}${v === 1 ? ' falha' : ''}">${v}</span>`).join('')}</div>
     <p class="dados-conta">${desv ? 'Menor' : 'Maior'} dado <b>${escolhido}</b> ${bonus >= 0 ? '+' : '−'} ${Math.abs(bonus)} = <span class="dados-total">${total}</span></p>`;
  Som.tom(520, 0, 0.06, 'triangle', 0.08);
  if (mestre) {
    if (alvoDados) {
      const inp = $(`#setupPersg input.ini[data-id="${alvoDados}"]`);
      if (inp) inp.value = total;
    }
    const titulo = $('#dadosTitulo').textContent;
    Diario.dado(alvoDados || '_mestre', { t: total, d: dados, b: bonus, dv: desv }, alvoDados ? 'iniciativa rolada pelo Mestre' : (titulo !== 'Rolar dados' ? titulo : ''));
  } else {
    // o resultado chega ao Mestre pela ficha de quem rolou
    const quem = meu || aux;
    if (quem && Store.state.tokens[quem]) Store.definir(['tokens', quem], { ...Store.state.tokens[quem], r: { t: total, d: dados, b: bonus, dv: desv, ts: Date.now() } });
  }
}
$('#btnRolar').addEventListener('click', rolar);
$('#btnDados').addEventListener('click', () => $('#painelDados').hidden ? abrirDados('Rolar dados') : fecharDados());
$('#btnFecharDados').addEventListener('click', fecharDados);
$('#btnRolarFora').addEventListener('click', () => {
  const quem = meu || aux;
  if (quem && Store.state.tokens[quem]) Store.definir(['tokens', quem], { ...Store.state.tokens[quem], r: { fora: true, ts: Date.now() } });
  fecharDados();
});

/* =========================================================
   PERSEGUIÇÃO (turnos por iniciativa, deslocamento por turno)
   ========================================================= */
let movLivre = false;            // Mestre move sem limite (só nesta tela)
let pedidoVisto = null;
const P = () => Store.state.persg || { on: false };
const ordemP = () => (P().ordem ? Object.values(P().ordem) : []);
function participante(id) { return P().on ? ordemP().find(o => o.id === id) : null; }
function vezAtual() { const o = ordemP(); return P().on && o.length ? (o[P().vez || 0] || {}).id : null; }
// limite em metros para quem está arrastando (null = sem limite)
function limiteDe(id) {
  const pz = participante(id);
  if (!pz || (mestre && movLivre)) return null;
  return pz.lim || 9;
}
function bloqueioPerseguicao(id, tk) {
  const pz = participante(id);
  if (!pz || (mestre && movLivre)) return '';
  if (vezAtual() !== id) return 'Na perseguição, só quem está na vez se move.';
  if ((tk.m || 0) >= (pz.lim || 9) - 0.001) return `Deslocamento esgotado (${pz.lim || 9} m). Use "Refazer rota" para voltar ao início.`;
  return '';
}
function nomeParticipante(id, paraJogador) {
  const tk = Store.state.tokens[id];
  if (!tk || !SER[tk.s]) return '(removido)';
  if (paraJogador && !visivelPara(tk)) return '???';
  return rotuloBase(tk);
}

function iniciarTurno(id) {
  const tk = Store.state.tokens[id];
  if (tk) Store.definir(['tokens', id], { ...tk, x0: tk.x, y0: tk.y, m: 0 });
}
function refazerRota(id) {
  const tk = Store.state.tokens[id];
  if (tk && tk.x0 !== undefined) Store.definir(['tokens', id], { ...tk, x: tk.x0, y: tk.y0, m: 0 });
}

function desenharSetup() {
  const caixa = $('#setupPersg');
  if (caixa.contains(document.activeElement)) return;
  const pedido = P().req || 0;
  const linhas = Object.entries(Store.state.tokens || {})
    .filter(([, tk]) => SER[tk.s] && tk.a === andarAtual)
    .sort((x, y) => ['cobaia', 'npc', 'robo', 'filho'].indexOf(SER[x[1].s].tipo) - ['cobaia', 'npc', 'robo', 'filho'].indexOf(SER[y[1].s].tipo));
  const antes = {};
  $$('#setupPersg .setup-linha').forEach(l => {
    antes[l.dataset.id] = { ck: $('input.ck', l).checked, ini: $('input.ini', l).value, lim: $('input.lim', l).value };
  });
  caixa.innerHTML = linhas.map(([id, tk]) => {
    const s = SER[tk.s];
    const a0 = antes[id] || { ck: s.tipo === 'cobaia', ini: '', lim: '9' };
    let ini = a0.ini, nota = '';
    if (tk.r && tk.r.ts > pedido && pedido) {
      if (tk.r.fora) nota = 'rola fora';
      else if (!ini) { ini = tk.r.t; nota = 'rolou no site'; } else nota = `rolou ${tk.r.t}`;
    }
    return `<div class="setup-linha" data-id="${id}">
      <input type="checkbox" class="ck" ${a0.ck ? 'checked' : ''} aria-label="Participa">
      ${bola(s)}<span class="setup-nome">${rotuloBase(tk)}${nota ? `<small>${nota}</small>` : ''}</span>
      <input class="ini" data-id="${id}" type="number" placeholder="ini" value="${ini}" aria-label="Iniciativa">
      <button class="dado-mini" data-id="${id}" title="Rolar a iniciativa">🎲</button>
      <input class="lim" type="number" min="1" value="${a0.lim}" aria-label="Deslocamento em metros"><span class="m">m</span>
    </div>`;
  }).join('') || '<p class="vazio">Ninguém neste andar.</p>';
  $$('#setupPersg .dado-mini').forEach(b => b.onclick = () => abrirDados(`Iniciativa: ${nomeParticipante(b.dataset.id)}`, b.dataset.id));
}

function desenharPerseguicao() {
  const p = P();
  const ordem = ordemP();
  const vez = vezAtual();
  // faixa no topo para todos
  $('#faixaPersg').hidden = !p.on;
  if (p.on) $('#faixaPersg').textContent = `PERSEGUIÇÃO · Rodada ${p.rod || 1} · Vez de: ${vez ? nomeParticipante(vez, true) : '—'}`;
  document.body.classList.toggle('em-persg', !!p.on);

  // painel dos jogadores
  $('#blocoPersg').hidden = !p.on;
  if (p.on) {
    $('#listaPersg').innerHTML = ordem.map((o, i) => {
      const tk = Store.state.tokens[o.id];
      const ativo = o.id === vez;
      return `<li class="${ativo ? 'ativo' : ''}"><span class="ord">${i + 1}º</span>
        <span class="pn">${nomeParticipante(o.id, true)}</span><span class="pi">ini ${o.ini}</span>
        <span class="pm">${tk ? fmtM(tk.m || 0) : '0,0'} / ${o.lim} m</span></li>`;
    }).join('');
    const tkv = vez && Store.state.tokens[vez];
    const minha = !mestre && tkv && podeMover(tkv);
    $('#minhaVez').hidden = !minha;
    if (minha) {
      const o = participante(vez);
      const quem = vez === meu ? 'Sua vez!' : `Vez de ${rotuloBase(tkv)}.`;
      $('#minhaVezTxt').textContent = `${quem} Andou ${fmtM(tkv.m || 0)} de ${o.lim} m.`;
    }
  }

  if (!mestre) return;
  $('#persgSetup').hidden = !!p.on;
  $('#persgAtiva').hidden = !p.on;
  if (!p.on) { desenharSetup(); return; }
  $('#persgRodada').textContent = `Rodada ${p.rod || 1}`;
  $('#ordemPersg').innerHTML = ordem.map((o, i) => {
    const tk = Store.state.tokens[o.id];
    const s = tk && SER[tk.s];
    return `<li class="${o.id === vez ? 'ativo' : ''}" data-i="${i}">
      <span class="ord">${i + 1}º</span>${s ? bola(s) : ''}<span class="pn">${nomeParticipante(o.id)}</span>
      <span class="pi">${o.ini}</span><span class="pm">${tk ? fmtM(tk.m || 0) : '0,0'}/${o.lim} m</span>
      <button data-mover="-1" title="Subir">▲</button><button data-mover="1" title="Descer">▼</button></li>`;
  }).join('');
  $$('#ordemPersg button').forEach(b => b.onclick = () => {
    const i = +b.closest('li').dataset.i, j = i + +b.dataset.mover;
    const o = ordemP();
    if (j < 0 || j >= o.length) return;
    const vezId = vezAtual();
    [o[i], o[j]] = [o[j], o[i]];
    Store.definir(['persg'], { ...P(), ordem: o, vez: Math.max(0, o.findIndex(x => x.id === vezId)) });
  });
}

// jogador: abre os dados quando o Mestre pede a iniciativa
function verificarPedidoIniciativa() {
  const req = P().req || 0;
  if (pedidoVisto === null) { pedidoVisto = req; return; }
  if (req && req !== pedidoVisto) {
    pedidoVisto = req;
    if ((meu || aux) && !mestre) abrirDados('O Mestre pediu: role a iniciativa');
  }
}

$('#btnPedirIni').addEventListener('click', () => { Store.definir(['persg'], { ...P(), on: false, req: Date.now() }); aviso('Pedido enviado aos jogadores.'); });
$('#btnIniciarPersg').addEventListener('click', () => {
  const ordem = $$('#setupPersg .setup-linha').filter(l => $('input.ck', l).checked).map(l => ({
    id: l.dataset.id,
    ini: parseInt($('input.ini', l).value, 10) || 0,
    lim: Math.max(1, parseFloat($('input.lim', l).value) || 9),
  })).sort((x, y) => y.ini - x.ini);
  if (!ordem.length) { aviso('Marque quem participa da perseguição.'); return; }
  Store.definir(['persg'], { on: true, req: P().req || 0, ordem, vez: 0, rod: 1 });
  iniciarTurno(ordem[0].id);
});
$('#btnProxTurno').addEventListener('click', () => {
  const o = ordemP(); if (!o.length) return;
  let v = (P().vez || 0) + 1, rod = P().rod || 1;
  if (v >= o.length) { v = 0; rod++; }
  Store.definir(['persg'], { ...P(), vez: v, rod });
  iniciarTurno(o[v].id);
});
$('#btnRefazerVez').addEventListener('click', () => { const v = vezAtual(); if (v) refazerRota(v); });
$('#btnRefazerMinha').addEventListener('click', () => { const v = vezAtual(); const tk = v && Store.state.tokens[v]; if (tk && podeMover(tk)) refazerRota(v); });
$('#btnEncerrarPersg').addEventListener('click', () => { if (confirm('Encerrar a perseguição?')) Store.definir(['persg'], { on: false, req: P().req || 0 }); });
$('#chkLivre').addEventListener('change', e => { movLivre = e.target.checked; });

/* ---------- Perfil: Jogador ou Mestre ---------- */
let meu = null;   // id da cobaia do jogador neste navegador
function lerPerfil() { try { return localStorage.getItem('acf-perfil') || ''; } catch (e) { return ''; } }
function salvarPerfil(v) { try { v ? localStorage.setItem('acf-perfil', v) : localStorage.removeItem('acf-perfil'); } catch (e) {} }
const podeMover = tk => !!tk && !!SER[tk.s] && (mestre || (!!meu && tk.s === meu) ||
  (!!aux && (SER[tk.s].tipo === 'filho' || tk.s === aux)));
let aux = null;   // robô do Mestre Auxiliar neste navegador

function atualizarBotaoPerfil() {
  const b = $('#btnMestre');
  b.textContent = mestre ? 'Mestre ✓ · trocar' : meu ? `${SER[meu].nome} · trocar` : aux ? `${SER[aux].nome} (auxiliar) · trocar` : 'Entrar';
  b.classList.toggle('ativo', mestre || !!meu || !!aux);
  document.body.classList.toggle('auxiliar', !!aux && !mestre);
  $('#blocoCobaias').hidden = !!aux && !mestre;
  $('#blocoRuido').hidden = !!aux && !mestre;
  $('#blocoSons').hidden = !(aux && !mestre);
}

function mostrarPerfil(passo) {
  $('#perfil').hidden = false;
  $('#perfilPasso1').hidden = passo !== 1;
  $('#perfilPasso2').hidden = passo !== 2;
  $('#perfilPasso3').hidden = passo !== 3;
  $('#perfilPasso4').hidden = passo !== 4;
  if (passo === 3) { $('#auxSenha').value = ''; $('#auxErro').hidden = true; setTimeout(() => $('#auxSenha').focus(), 50); }
  if (passo === 4) {
    $('#listaRobos').innerHTML = SERES.filter(s => s.tipo === 'robo').map(s =>
      `<button class="perso" data-id="${s.id}" style="--cor:${s.cor}">
        <img src="${s.img}" alt=""><strong>${s.nome}</strong><span>${s.jogador}</span></button>`).join('');
    $$('#listaRobos .perso').forEach(b => b.onclick = () => escolherRobo(b.dataset.id));
  }
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

function escolherRobo(id) {
  aux = id; meu = null;
  salvarPerfil('aux:' + id);
  $('#perfil').hidden = true;
  if (Store.modo === 'firebase' && !Store.auth.currentUser) Store.auth.signInAnonymously().catch(erroGravacao);
  atualizarBotaoPerfil();
  montarAndar();
  atualizarTudo();
}

function abrirLoginMestre() {
  $('#perfil').hidden = true;
  $('#campoEmail').hidden = Store.modo !== 'firebase';
  $('#mestreErro').hidden = true;
  $('#mestreSenha').value = '';
  $('#dlgMestre').showModal();
}

function trocarPerfil() {
  meu = null; aux = null;
  salvarPerfil('');
  if (Store.modo === 'firebase' && Store.auth.currentUser) Store.auth.signOut();
  definirMestre(false);
  selecionar(null);
  mostrarPerfil(1);
}

$('#btnSouJogador').addEventListener('click', () => mostrarPerfil(2));
$('#btnSouMestre').addEventListener('click', abrirLoginMestre);
$('#btnVoltarPerfil').addEventListener('click', () => mostrarPerfil(1));
$$('.voltar-perfil').forEach(b => b.addEventListener('click', () => mostrarPerfil(1)));
$('#btnSouAux').addEventListener('click', () => mostrarPerfil(3));
$('#formAux').addEventListener('submit', async e => {
  e.preventDefault();
  if (await hash($('#auxSenha').value.trim()) === SENHA_AUX) mostrarPerfil(4);
  else $('#auxErro').hidden = false;
});
$('#btnMestre').addEventListener('click', trocarPerfil);
// cancelar o login de Mestre volta para a tela de escolha
$('#dlgMestre').addEventListener('close', () => { if (!mestre && !meu && !aux && lerPerfil() !== 'mestre') mostrarPerfil(1); });

$('#formMestre').addEventListener('submit', async e => {
  if (e.submitter && e.submitter.value === 'cancel') return;
  e.preventDefault();
  const senha = $('#mestreSenha').value;
  const erro = msg => { $('#mestreErro').textContent = msg; $('#mestreErro').hidden = false; };
  if (Store.modo === 'firebase') {
    try {
      await Store.auth.signInWithEmailAndPassword($('#mestreEmail').value.trim(), senha);
      salvarPerfil('mestre'); meu = null; aux = null;
      $('#dlgMestre').close();
    } catch (err) { erro('E-mail ou senha recusados.'); }
  } else {
    if (await hash(senha) === SENHA_MESTRE) { salvarPerfil('mestre'); meu = null; aux = null; definirMestre(true); $('#dlgMestre').close(); }
    else erro('Senha recusada.');
  }
});

$('#btnSair').addEventListener('click', trocarPerfil);

$('#chkElementos').addEventListener('change', e => Store.definir(['rev', 'a' + andarAtual], e.target.checked ? true : null));

$('#btnReset').addEventListener('click', () => {
  $('#listaReset').innerHTML = ANDARES.map(an => `<button class="btn-fantasma" data-andar="${an.id}">${an.titulo} · CN ${25 * an.id}</button>`).join('');
  $$('#listaReset button').forEach(b => b.onclick = () => {
    const andar = +b.dataset.andar;
    Object.entries(posicoesIniciais(andar)).forEach(([id, tk]) => {
      const antigo = Store.state.tokens[id];
      Store.definir(['tokens', id], { ...tk, h: antigo ? !!antigo.h : false });
    });
    $('#dlgReset').close();
    irParaAndar(andar);
  });
  $('#dlgReset').showModal();
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
   DIÁRIO DA SESSÃO (só o Mestre)
   A tela do Mestre compara cada mudança do mapa com a anterior
   e anota o que aconteceu. Fica em "segredos/_diario", que só a
   conta do Mestre lê. Só grava enquanto a tela do Mestre está aberta.
   ========================================================= */
const MAX_DIARIO = 800;
const ROTULO_K = { mov: 'MOV', dado: 'DADO', ruido: 'RUÍDO', persg: 'PERS', sala: 'SALA', sessao: 'SESSÃO' };
const pad2 = n => String(n).padStart(2, '0');
const hora = ts => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };
const dataCurta = ts => { const d = new Date(ts); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; };

// lugar exato, do ponto de vista do Mestre
function lugarDe(tk) {
  if (!tk) return 'fora do mapa';
  const p = salaEm(tk.a, tk.x, tk.y);
  const cnTxt = q => 'CN ' + pad2(cnDe(tk.a, q));
  if (p) {
    const cn = cnDe(tk.a, p);
    const [nome] = ANDARES[tk.a - 1].salas[cn] || [p === 25 ? 'Zona Neutra' : ''];
    return `${cnTxt(p)}${nome ? ' ' + nome : ''}`;
  }
  const c = CORREDORES.find(k => dentro(k, tk.x, tk.y));
  if (c) return `corredor entre ${cnTxt(c.p1)} e ${cnTxt(c.p2)}`;
  const saida = saidaDoAndar(tk.a);
  const rs = retSaida(saida);
  if (rs && dentro(rs, tk.x, tk.y)) return `saída do elevador (${cnTxt(saida.p)})`;
  return `${nomeAndar(tk.a)}, fora das salas`;
}

const Diario = {
  prev: null,
  pend: {},        // movimentos ainda em andamento (esperando a ficha parar)
  pilha: [],       // movimentos que o Mestre pode desfazer
  ignorar: {},     // movimentos causados pelo próprio "Desfazer"
  reiniciar: false,
  sig: '',

  entradas() { return Object.entries(Segredos.dados._diario || {}).map(([k, e]) => ({ k, ...e })).sort((a, b) => a.ts - b.ts); },

  registrar(k, txt, extra = {}) {
    if (!mestre) return;
    const e = { ts: Date.now(), k, txt, dia: ruido().d || 1 };
    Object.entries(extra).forEach(([c, v]) => { if (v !== undefined && v !== null) e[c] = v; });
    Segredos.gravar(['_diario', Segredos.novaChave()], e);
    const todas = this.entradas();
    if (todas.length > MAX_DIARIO) Segredos.apagar('_diario', todas.slice(0, todas.length - MAX_DIARIO).map(x => x.k));
    desenharExtrasMestre();
  },

  dado(quem, r, obs) {
    const nome = quem === '_mestre' ? 'Mestre' : nomeDoId(quem);
    if (r.fora) { this.registrar('dado', `${nome} vai rolar em outro lugar`, { quem, fora: true }); return; }
    const det = r.d ? `${r.d.length}d20: ${r.d.join(', ')}${r.dv ? ', desvantagem' : ''}; bônus ${r.b >= 0 ? '+' : '−'}${Math.abs(r.b || 0)}` : '';
    this.registrar('dado', `${nome} rolou ${r.t}${det ? ` (${det})` : ''}${obs ? ` · ${obs}` : ''}`, { quem, t: r.t, det: det || null });
  },

  // chamado a cada mudança do mapa
  observar(st) {
    const novo = JSON.parse(JSON.stringify({ tokens: st.tokens || {}, salas: st.salas || {}, rev: st.rev || {}, ruido: st.ruido || {}, persg: st.persg || {} }));
    const ant = this.prev;
    this.prev = novo;
    if (!ant || this.reiniciar) { this.reiniciar = false; this.pend = {}; return; }
    if (!mestre) return;
    this.difFichas(ant.tokens, novo.tokens);
    this.difSalas(ant, novo);
    this.difRuido(ant.ruido, novo.ruido);
    this.difPersg(ant.persg, novo.persg);
  },

  difFichas(A, B) {
    new Set([...Object.keys(A), ...Object.keys(B)]).forEach(id => {
      const a = A[id], b = B[id];
      if (b && !SER[b.s]) return;
      if (!a && b) { this.registrar('sala', `${rotuloBase(b)} entrou no mapa: ${lugarDe(b)}${b.h ? ' (oculto)' : ''}`); return; }
      if (a && !b) {
        if (this.pend[id]) { clearTimeout(this.pend[id].t); delete this.pend[id]; }
        if (SER[a.s]) this.registrar('sala', `${rotuloBase(a)} saiu do mapa (estava em ${lugarDe(a)})`);
        return;
      }
      if (a.x !== b.x || a.y !== b.y || a.a !== b.a) this.moveu(id, a);
      if (!!a.h !== !!b.h) this.registrar('sala', `${rotuloBase(b)} ${b.h ? 'ocultado dos jogadores' : 'revelado aos jogadores'}`);
      if (!!a.vf !== !!b.vf) this.registrar('sala', `${rotuloBase(b)} ${b.vf ? 'revelado aos Filhos' : 'escondido dos Filhos'}`);
      if (b.r && b.r.ts && (!a.r || a.r.ts !== b.r.ts)) this.dado(id, b.r);
    });
  },

  moveu(id, antes) {
    if (!this.pend[id]) this.pend[id] = { antes: { a: antes.a, x: antes.x, y: antes.y, m: antes.m || 0 } };
    clearTimeout(this.pend[id].t);
    this.pend[id].t = setTimeout(() => this.assentar(id), 1500);
  },

  // a ficha parou: anota de onde para onde e guarda para o "Desfazer"
  assentar(id) {
    const p = this.pend[id];
    if (!p) return;
    clearTimeout(p.t);
    delete this.pend[id];
    const tk = (Store.state.tokens || {})[id];
    if (!tk || !SER[tk.s]) return;
    const de = lugarDe(p.antes), para = lugarDe(tk);
    if (this.ignorar[id] && Date.now() - this.ignorar[id] < 6000) {
      delete this.ignorar[id];
      this.registrar('mov', `↶ ${rotuloBase(tk)}: movimento desfeito, voltou para ${para}`, { quem: id });
      return;
    }
    if (p.antes.a === tk.a && p.antes.x === tk.x && p.antes.y === tk.y) return;
    if (de !== para) this.registrar('mov', `${rotuloBase(tk)}: ${de} → ${para}`, { quem: id });
    this.pilha.push({ id, antes: p.antes });
    if (this.pilha.length > 40) this.pilha.shift();
    atualizarDesfazer();
  },

  assentarTudo() { Object.keys(this.pend).forEach(id => this.assentar(id)); },

  difSalas(A, B) {
    const rev = [], esc2 = [];
    new Set([...Object.keys(A.salas), ...Object.keys(B.salas)]).forEach(k => {
      const cn = +k.slice(1);
      const a = A.salas[k] === undefined ? Math.ceil(cn / 25) === 1 : !!A.salas[k];
      const b = B.salas[k] === undefined ? Math.ceil(cn / 25) === 1 : !!B.salas[k];
      if (a !== b) (b ? rev : esc2).push(cn);
    });
    const lista = l => l.sort((x, y) => x - y).map(cn => 'CN ' + pad2(cn)).join(', ');
    if (rev.length) this.registrar('sala', `Revelada${rev.length > 1 ? 's' : ''} aos jogadores: ${lista(rev)}`);
    if (esc2.length) this.registrar('sala', `Escondida${esc2.length > 1 ? 's' : ''} dos jogadores: ${lista(esc2)}`);
    new Set([...Object.keys(A.rev), ...Object.keys(B.rev)]).forEach(k => {
      if (!!A.rev[k] !== !!B.rev[k]) this.registrar('sala', `Elementos das salas do ${k.slice(1)}º andar ${B.rev[k] ? 'mostrados aos' : 'escondidos dos'} jogadores`);
    });
  },

  difRuido(a, b) {
    const qa = a.q || 0, qb = b.q || 0;
    if ((a.d || 1) !== (b.d || 1)) this.registrar('ruido', `Novo dia: Dia ${b.d || 1}${b.hist && b.hist['d' + (a.d || 1)] !== undefined ? ` (Dia ${a.d || 1} terminou com ${b.hist['d' + (a.d || 1)]} quebra(s))` : ''}`);
    if (!a.p && b.p) this.registrar('ruido', 'PROTOCOLO FILHO DA O.R.F.E.U. INICIADO');
    if (a.p && !b.p) this.registrar('ruido', 'Protocolo encerrado. Quebras rumo ao Protocolo zeradas.');
    else if ((a.d || 1) === (b.d || 1) && qa !== qb) this.registrar('ruido', qb > qa ? `Quebra do limite registrada (${qb}/3)` : `Quebra removida (${qb}/3)`);
  },

  difPersg(a, b) {
    if ((b.req || 0) !== (a.req || 0) && b.req) this.registrar('persg', 'Mestre pediu a iniciativa');
    const ordem = o => (o.ordem ? Object.values(o.ordem) : []);
    if (!a.on && b.on) {
      this.registrar('persg', 'Perseguição iniciada · ordem: ' + ordem(b).map(o => `${nomeDoId(o.id)} (${o.ini})`).join(', '));
      return;
    }
    if (a.on && !b.on) { this.registrar('persg', 'Perseguição encerrada'); return; }
    if (b.on && ((a.vez || 0) !== (b.vez || 0) || (a.rod || 1) !== (b.rod || 1))) {
      const o = ordem(b)[b.vez || 0];
      this.registrar('persg', `Rodada ${b.rod || 1} · vez de ${o ? nomeDoId(o.id) : '?'}`);
    }
  },
};
function nomeDoId(id) {
  const tk = (Store.state.tokens || {})[id];
  if (tk && SER[tk.s]) return rotuloBase(tk);
  return SER[id] ? SER[id].nome : id;
}

/* ---------- Painéis do Mestre: diário, rolagens, anotações ---------- */
function desenharExtrasMestre() {
  if (!mestre) return;
  desenharDiario();
  desenharRolagens();
  desenharNotas();
}

function desenharDiario() {
  const filtro = $('#filtroDiario').value;
  const todas = Diario.entradas();
  const sig = `${todas.length}:${todas.length ? todas[todas.length - 1].k : ''}:${filtro}`;
  if (sig === Diario.sig) return;
  Diario.sig = sig;
  const lista = todas.filter(e => !filtro || e.k === filtro || e.k === 'sessao').reverse().slice(0, 250);
  $('#listaDiario').innerHTML = lista.map(e => e.k === 'sessao'
    ? `<li class="d-sessao"><span>${esc(e.txt)}</span></li>`
    : `<li class="d-${e.k}"><time>D${e.dia || 1} · ${hora(e.ts)}</time><span class="d-tag">${ROTULO_K[e.k] || ''}</span><span class="d-txt">${esc(e.txt)}</span></li>`).join('');
  $('#diarioVazio').hidden = lista.length > 0;
}

function desenharRolagens() {
  const porQuem = {};
  Diario.entradas().filter(e => e.k === 'dado' && e.quem).forEach(e => (porQuem[e.quem] = porQuem[e.quem] || []).push(e));
  const blocos = Object.entries(porQuem).map(([quem, l]) => ({ quem, l: l.reverse().slice(0, 5) }))
    .sort((a, b) => b.l[0].ts - a.l[0].ts);
  $('#listaRolagens').innerHTML = blocos.map(({ quem, l }) => {
    const s = SER[quem] || SER[(Store.state.tokens[quem] || {}).s];
    const itens = l.map((e, i) => {
      const anterior = l[i + 1];
      const repetiu = anterior && !e.fora && !anterior.fora && e.ts - anterior.ts < 60000;
      return `<li class="${repetiu ? 'repetiu' : ''}"><time>${hora(e.ts)}</time>
        <b>${e.fora ? 'rola fora' : esc(e.t)}</b><span>${e.det ? esc(e.det) : ''}${repetiu ? ` · ⚠ rolou de novo em ${Math.round((e.ts - anterior.ts) / 1000)} s` : ''}</span></li>`;
    }).join('');
    return `<div class="rolagem">${s ? bola(s) : '<span class="bola mestre-bola">M</span>'}<div class="rolagem-info">
      <strong>${quem === '_mestre' ? 'Mestre' : esc(nomeDoId(quem))}</strong><ul>${itens}</ul></div></div>`;
  }).join('');
  $('#rolagensVazio').hidden = blocos.length > 0;
}

function desenharNotas() {
  if (!mestre) return;
  const notas = Segredos.dados._notas || {};
  const doAndar = Object.keys(notas).map(k => +k.slice(1)).filter(cn => Math.ceil(cn / 25) === andarAtual).sort((a, b) => a - b);
  $('#listaNotas').innerHTML = doAndar.map(cn => {
    const [nome] = ANDARES[andarAtual - 1].salas[cn] || [cn % 25 === 0 ? 'Zona Neutra' : ''];
    const txt = notas['c' + cn];
    return `<li data-cn="${cn}"><strong>CN ${pad2(cn)}${nome ? ' ' + esc(nome) : ''}</strong><span>${esc(txt.length > 110 ? txt.slice(0, 110) + '…' : txt)}</span></li>`;
  }).join('');
  $('#notasVazio').hidden = doAndar.length > 0;
  $$('#listaNotas li').forEach(li => li.onclick = () => {
    const cn = +li.dataset.cn, r = retSala(cn - 25 * (andarAtual - 1));
    focar(r.x + R / 2, r.y + R / 2);
    selecionarSala(cn);
    $('#painel').classList.remove('aberto');
  });
}

// selo "✎ anotação" nas salas do mapa (só na tela do Mestre)
function marcarNotas() {
  $$('.sala', stage).forEach(e => e.classList.toggle('com-nota', !!notaDe(+e.dataset.cn)));
}

$('#filtroDiario').addEventListener('change', () => { Diario.sig = ''; desenharDiario(); });
$('#btnSessao').addEventListener('click', () => {
  const r = ruido();
  Diario.registrar('sessao', `Nova sessão · ${dataCurta(Date.now())} ${hora(Date.now())} · Dia ${r.d || 1} na Caixa`);
});
$('#btnLimparDiario').addEventListener('click', () => {
  if (!confirm('Apagar todo o diário? Baixe o .txt antes se quiser guardar.')) return;
  Segredos.gravar(['_diario'], null);
  Diario.sig = '';
  desenharExtrasMestre();
});
$('#btnBaixarDiario').addEventListener('click', () => {
  const linhas = Diario.entradas().map(e => e.k === 'sessao'
    ? `\n===== ${e.txt} =====`
    : `[${dataCurta(e.ts)} ${hora(e.ts)} · Dia ${e.dia || 1}] [${ROTULO_K[e.k] || e.k}] ${e.txt}`);
  baixar(`diario-caixa-${carimbo()}.txt`, 'A CAIXA DE FÓSFOROS · DIÁRIO DA SESSÃO (documento do Mestre)\n' + linhas.join('\n') + '\n', 'text/plain');
});

/* =========================================================
   DESFAZER
   Jogador e auxiliar: desfazem os próprios movimentos (guardados neste aparelho).
   Mestre: desfaz o último movimento de qualquer ficha.
   ========================================================= */
const pilhaLocal = [];
function empilharLocal(id, antes) {
  pilhaLocal.push({ id, antes });
  if (pilhaLocal.length > 20) pilhaLocal.shift();
  atualizarDesfazer();
}

function proximoDesfazer() {
  const pilha = mestre ? Diario.pilha : pilhaLocal;
  while (pilha.length) {
    const it = pilha[pilha.length - 1];
    const tk = (Store.state.tokens || {})[it.id];
    if (tk && podeMover(tk)) return { it, tk, pilha };
    pilha.pop();
  }
  return null;
}

function atualizarDesfazer() {
  const b = $('#btnDesfazer');
  const prox = (mestre || meu || aux) ? proximoDesfazer() : null;
  b.hidden = !prox;
  if (prox) b.title = `Desfazer: ${rotuloBase(prox.tk)} volta para ${mestre ? lugarDe(prox.it.antes) : descreveLocal({ ...prox.tk, ...prox.it.antes })} (Ctrl+Z)`;
}

function desfazer() {
  if (mestre) Diario.assentarTudo();
  const prox = proximoDesfazer();
  if (!prox) { aviso('Nada para desfazer.'); return; }
  const { it, tk, pilha } = prox;
  const pz = participante(it.id);
  if (pz && vezAtual() !== it.id && !(mestre && movLivre)) { aviso('Na perseguição, só dá para desfazer na vez dessa ficha.'); return; }
  pilha.pop();
  if (mestre) Diario.ignorar[it.id] = Date.now();
  Store.definir(['tokens', it.id], { ...tk, a: it.antes.a, x: it.antes.x, y: it.antes.y, m: it.antes.m || 0 });
  aviso(`${rotuloBase(tk)} voltou.`);
  if (it.antes.a !== andarAtual && podeVer(it.antes.a)) irParaAndar(it.antes.a);
  atualizarDesfazer();
}
$('#btnDesfazer').addEventListener('click', desfazer);
window.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z') && !e.target.matches('input, textarea, select')) {
    e.preventDefault();
    desfazer();
  }
});

/* =========================================================
   BACKUP (baixar e restaurar o estado inteiro)
   ========================================================= */
function carimbo() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}
function baixar(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo + ';charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

$('#btnBackup').addEventListener('click', () => {
  const pacote = { tipo: 'planta-acf-backup', versao: 1, salvoEm: Date.now(), mapa: Store.state, segredos: Segredos.dados };
  baixar(`backup-caixa-${carimbo()}.json`, JSON.stringify(pacote, null, 1), 'application/json');
  Diario.registrar('sessao', `Backup baixado · ${dataCurta(Date.now())} ${hora(Date.now())}`);
});
$('#btnRestaurar').addEventListener('click', () => { $('#arqBackup').value = ''; $('#arqBackup').click(); });
$('#arqBackup').addEventListener('change', async e => {
  const arq = e.target.files[0];
  if (!arq) return;
  let pacote;
  try { pacote = JSON.parse(await arq.text()); } catch (err) { alert('Este arquivo não é um backup válido.'); return; }
  if (!pacote || pacote.tipo !== 'planta-acf-backup' || !pacote.mapa || typeof pacote.mapa.tokens !== 'object') { alert('Este arquivo não é um backup da Planta da Caixa.'); return; }
  const qtd = Object.keys(pacote.mapa.tokens || {}).length;
  if (!confirm(`Restaurar o backup salvo em ${dataCurta(pacote.salvoEm)} às ${hora(pacote.salvoEm)}?\n\n${qtd} fichas, salas, ruído, dia, perseguição, funções e anotações voltam a esse ponto. Todos os jogadores verão o mapa mudar. O diário atual é mantido.`)) return;
  const m = pacote.mapa;
  Diario.reiniciar = true;
  Diario.pend = {}; Diario.pilha = []; pilhaLocal.length = 0;
  Store.state = { tokens: m.tokens || {}, rev: m.rev || {}, salas: m.salas || {}, ruido: m.ruido || { q: 0, p: false }, persg: m.persg || { on: false } };
  Store.gravarTudo();
  const seg = { ...(pacote.segredos || {}) };
  delete seg._diario;
  if (Segredos.dados._diario) seg._diario = Segredos.dados._diario;
  Segredos.substituir(seg);
  Diario.registrar('sessao', `Backup restaurado (salvo em ${dataCurta(pacote.salvoEm)} ${hora(pacote.salvoEm)})`);
  selecionar(null);
  montarAndar();
  atualizarTudo();
  aviso('Backup restaurado.');
});

/* =========================================================
   PAINEL RECOLHÍVEL E CELULAR
   ========================================================= */
// cada seção do painel abre e fecha clicando no título
let fechados = {};
try { fechados = JSON.parse(localStorage.getItem('acf-blocos') || '{}'); } catch (e) {}
$$('.painel .bloco').forEach(b => {
  const h = $('h2', b);
  if (!h || !b.id) return;
  h.classList.add('dobra');
  h.tabIndex = 0;
  b.classList.toggle('fechado', !!fechados[b.id]);
  const alternar = () => {
    b.classList.toggle('fechado');
    fechados[b.id] = b.classList.contains('fechado');
    try { localStorage.setItem('acf-blocos', JSON.stringify(fechados)); } catch (e) {}
  };
  h.addEventListener('click', alternar);
  h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(); } });
});

// computador: esconde o painel lateral inteiro para o mapa ocupar a tela
function aplicarRecolhido(sim) {
  document.body.classList.toggle('painel-fechado', sim);
  $('#btnRecolher').textContent = sim ? '⟨ Painel' : 'Painel ⟩';
  try { sim ? localStorage.setItem('acf-recolhido', '1') : localStorage.removeItem('acf-recolhido'); } catch (e) {}
}
try { aplicarRecolhido(localStorage.getItem('acf-recolhido') === '1'); } catch (e) {}
$('#btnRecolher').addEventListener('click', () => aplicarRecolhido(!document.body.classList.contains('painel-fechado')));

// celular: puxar a alça para baixo (ou tocar nela) fecha o painel
(() => {
  const alca = $('#btnAlca');
  let y0 = null;
  alca.addEventListener('pointerdown', e => { y0 = e.clientY; });
  alca.addEventListener('pointerup', e => {
    if (y0 === null) return;
    const dy = e.clientY - y0; y0 = null;
    if (dy > 30 || Math.abs(dy) < 8) $('#painel').classList.remove('aberto');
  });
})();

/* =========================================================
   INÍCIO
   ========================================================= */
Store.aoMudar(st => Diario.observar(st));
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
  if (perfil.startsWith('aux:') && SER[perfil.slice(4)]) aux = perfil.slice(4);
  if (!FIREBASE && perfil === 'mestre') { try { if (localStorage.getItem('acf-mestre') === '1') mestre = true; } catch (e) {} }
  await Store.iniciar();
  if (mestre && Store.modo === 'local') definirMestre(true);
  atualizarBotaoPerfil();
  atualizarTudo();
  // sem perfil salvo: pergunta quem é
  if (!meu && !aux && !mestre && !(FIREBASE && perfil === 'mestre')) mostrarPerfil(1);
})();

})();
