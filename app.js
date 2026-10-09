/* =========================================================
   A CAIXA DE FÓSFOROS · PLANTA DO COMPLEXO · app.js
   O "motor" do site: desenha o mapa, move a câmera,
   arrasta as fichas e mantém todo mundo sincronizado.
   ========================================================= */
(() => {
'use strict';
// muda a cada atualização do site: força o navegador a buscar as imagens novas
const VERSAO_SITE = '20261009';

/* ---------- Medidas da planta (em quadradinhos) ---------- */
const T  = 40;   // pixels por quadradinho
const M  = 2;    // margem em volta das salas (cabe o elevador)
const R  = 5;    // lado de cada sala
const G  = 2;    // comprimento do corredor entre salas
const CW = 2;    // largura do corredor
const WH = 0.75; // altura das paredes
const W  = 2 * M + 5 * R + 4 * G;  // largura total
const H  = W;                       // altura total

const TV = new URLSearchParams(location.search).has('tv');   // tela da mesa
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

/* ---------- Dados das salas ----------
   1º andar: data.js (público). Andares 2 a 5: caminho privado (Mestre e
   auxiliares). Jogadores recebem só o que foi revelado, em mapa/nomes. */
const veTudo = () => V().mestre || !!V().aux;
function infoSala(a, cn) {
  const p = cn - 25 * (a - 1);
  const padrao = p === 25 ? ['Zona Neutra', 'F'] : ['', '?'];
  const base = (ANDARES[a - 1] && ANDARES[a - 1].salas[cn]) || null;
  if (veTudo()) {
    const e = (Priv.dados.salas || {})['c' + cn];
    if (e) return [e.n || '', e.e || '?'];
    return base || padrao;
  }
  const pub = (Store.state.nomes || {})['c' + cn];
  if (pub) return [pub.n || '', pub.e || (base ? base[1] : '?')];
  return base || padrao;
}
function saidaCN(a) {
  if (veTudo()) {
    const v = (Priv.dados.saidas || {})['a' + a];
    if (v !== undefined && v !== null) return v || null;
    return ANDARES[a - 1].saida || null;
  }
  const n = Store.state.nomes || {};
  for (let p = 1; p <= 25; p++) { const e = n['c' + cnDe(a, p)]; if (e && e.s) return cnDe(a, p); }
  return a === 1 ? (ANDARES[0].saida || null) : null;
}
function subtituloDe(a) {
  if (veTudo()) return (Priv.dados.andares || {})['a' + a] || ANDARES[a - 1].subtitulo || '';
  return (Store.state.nomes || {})['a' + a] || ANDARES[a - 1].subtitulo || '';
}

// sala do elevador/porta de cada andar
function saidaDoAndar(a) {
  const cn = saidaCN(a);
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
const salaVisivel = (andar, cn) => V().mestre || !!V().aux || salaRevelada(andar, cn);

/* Quem enxerga cada ficha.
   h  = Ocultação geral: escondida dos jogadores.
   vf = Visível aos Filhos: o Mestre revelou essa cobaia/NPC aos Mestres Auxiliares.
   Mestre vê tudo. Auxiliar vê Filhos e robôs sempre, e cobaias/NPCs só com vf.
   Jogador vê o que não está oculto e a própria cobaia. */
function visivelPara(tk) {
  if (!tk || !SER[tk.s]) return false;
  const v = V();
  if (v.mestre) return true;
  const tipo = SER[tk.s].tipo;
  if (v.aux) return tipo === 'filho' || tipo === 'robo' || !!tk.vf;
  // apagão: o jogador só enxerga a própria ficha (salvo quem o Mestre liberou)
  if (apagaoAtivo() && tk.s !== v.meu && (!isentoDe(v.meu) || apagaoQueda)) return false;
  if (cegoDe(v.meu) && tk.s !== v.meu) return false;
  return !tk.h || tk.s === v.meu;
}
const apagaoAtivo = () => !!(Store.state.ap && Store.state.ap.on);
let apagaoIsento = false;   // calculado em verificarApagao()
let apagaoQueda = false;    // primeiros segundos do apagão: todas as fichas somem

function descreveLocal(tk) {
  if (!tk) return 'fora do mapa';
  const p = salaEm(tk.a, tk.x, tk.y);
  if (!p) return `${nomeAndar(tk.a)} · Corredor`;
  const cn = cnDe(tk.a, p);
  if (!salaVisivel(tk.a, cn)) return `${nomeAndar(tk.a)} · Sala desconhecida`;
  const [nome] = infoSala(tk.a, cn);
  return `${nomeAndar(tk.a)} · CN ${String(cn).padStart(2, '0')}${nome ? ' ' + nome : ''}`;
}

/* ---------- Estado inicial ---------- */
const CENTRO_ZN = (() => { const s = retSala(25); return { x: s.x + R / 2, y: s.y + R / 2 }; })();

function posicoesIniciais(andar = 1) {
  const tokens = {};
  const cob = SERES.filter(s => s.tipo === 'cobaia');
  const zn = retSala(25);
  cob.forEach((s, i) => {
    const fila = i < 4 ? 0 : 1, col = i < 4 ? i : i - 4, nessa = i < 4 ? 4 : cob.length - 4;
    const x = zn.x + R * (col + 0.5) / nessa, y = zn.y + R - 0.75 - fila * 1.1;
    tokens[s.id] = { s: s.id, a: andar, x: +x.toFixed(2), y: +y.toFixed(2), h: false, n: 1 };
  });
  return tokens;
}
const CAMPOS_VAZIOS = () => ({ rev: {}, salas: {}, ruido: { q: 0, p: false }, persg: { on: false }, ap: null, eco: null,
  portas: {}, relogio: null, fichas: {}, cego: {}, cfg: {}, nomes: {}, loja: {} });
const estadoPadrao = () => ({ ...CAMPOS_VAZIOS(), tokens: posicoesIniciais() });
// ficha que vai para o caminho privado (só Mestre e auxiliares leem): Filhos, NPCs e robôs ocultos
const ehPrivado = tk => !!tk && !!tk.h && !!SER[tk.s] && SER[tk.s].tipo !== 'cobaia';
const EMAIL_AUXILIARES = (typeof EMAIL_AUX !== 'undefined' ? EMAIL_AUX : 'auxiliares@caixa-acf.com').toLowerCase();
let auxLogado = false;   // conta dos auxiliares conectada (Firebase)

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
    Arquivos.ligar();
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
    // cada aba guarda o próprio login: Mestre, auxiliar e jogador podem ficar
    // abertos no mesmo navegador sem um derrubar o outro
    try { await this.auth.setPersistence(firebase.auth.Auth.Persistence.SESSION); } catch (e) {}
    this.auth.onAuthStateChanged(u => {
      const ehAux = !!u && !u.isAnonymous && (u.email || '').toLowerCase() === EMAIL_AUXILIARES;
      auxLogado = ehAux;
      definirMestre(!!u && !u.isAnonymous && !ehAux);
      Priv.ligar(mestre || ehAux);
      // jogador precisa de um login anônimo para poder mover a própria ficha
      if (!u && meu) this.garantirLogin();
      // auxiliar sem a conta dos auxiliares (aba nova): pede a senha de novo
      if (!u && aux) { aux = null; salvarPerfil(''); atualizarBotaoPerfil(); mostrarPerfil(3); }
      if (ehAux && !aux) {
        const pf = lerPerfil();
        if (pf.startsWith('aux:') && SER[pf.slice(4)]) { aux = pf.slice(4); atualizarBotaoPerfil(); montarAndar(); atualizarTudo(); }
        else mostrarPerfil(4);
      }
      if (!u && lerPerfil() === 'mestre') { salvarPerfil(''); mostrarPerfil(1); }
      Chat.ligar();
    });
    this.db.ref('.info/connected').on('value', s => { this.conectado = !!s.val(); mostrarConexao(); });
    this.db.ref('mapa').on('value', snap => {
      const v = snap.val();
      if (v) {
        this.pub = v;
        this.vazio = false;
        this.compor();
      } else {
        this.pub = null;
        this.state = estadoPadrao();
        this.vazio = true;
        if (mestre) { this.vazio = false; this.gravarTudo(); }
      }
      this.avisar();
    });
    Arquivos.ligar();
  },

  // junta o mapa público com as fichas ocultas (estas só chegam ao Mestre e aos auxiliares)
  pub: null, privTok: {},
  compor() {
    const v = this.pub || {};
    this.state = { ...CAMPOS_VAZIOS(), ...v, tokens: { ...(v.tokens || {}), ...(this.privTok || {}) } };
  },

  // login invisível do jogador/auxiliar; quem chamar espera ele terminar
  garantirLogin() {
    if (this.auth.currentUser) return Promise.resolve();
    if (!this.loginAnon) this.loginAnon = this.auth.signInAnonymously().finally(() => { this.loginAnon = null; });
    return this.loginAnon;
  },

  // caminho: ['tokens', id] ou ['rev', 'a1']; valor null apaga
  definir(caminho, valor) {
    // jogador e auxiliar: o site barra aqui o que o servidor recusaria
    if (!mestre) {
      const motivo = recusaLocal(caminho, valor);
      if (motivo) { aviso(motivo); this.avisar(); return; }
    }
    let alvo = this.state;
    for (let i = 0; i < caminho.length - 1; i++) alvo = alvo[caminho[i]] = alvo[caminho[i]] || {};
    const k = caminho[caminho.length - 1];
    if (valor === null) delete alvo[k]; else alvo[k] = valor;

    if (this.modo === 'firebase') {
      let ops = [['mapa/' + caminho.join('/'), valor]];
      // fichas ocultas (Filhos, NPCs, robôs) moram no caminho privado
      if (caminho[0] === 'tokens' && caminho.length === 2) {
        const id = caminho[1];
        const naPub = !!(this.pub && this.pub.tokens && this.pub.tokens[id]);
        const naPriv = !!(this.privTok && this.privTok[id]);
        if (valor === null) ops = [naPub || !naPriv ? ['mapa/tokens/' + id, null] : null, naPriv ? ['privado/tokens/' + id, null] : null].filter(Boolean);
        else if (ehPrivado(valor)) ops = [['privado/tokens/' + id, valor]].concat(naPub ? [['mapa/tokens/' + id, null]] : []);
        else ops = [['mapa/tokens/' + id, valor]].concat(naPriv ? [['privado/tokens/' + id, null]] : []);
      }
      const enviar = () => ops.forEach(([cam, v]) => this.db.ref(cam).set(v).catch(erroGravacao));
      if (mestre || this.auth.currentUser) enviar();
      else this.garantirLogin().then(enviar).catch(erroGravacao);
    } else {
      this.salvarLocal();
    }
    this.avisar();
  },

  gravarTudo() {
    if (this.modo === 'firebase') {
      const pub = { ...this.state, tokens: {} }, priv = {};
      Object.entries(this.state.tokens || {}).forEach(([id, tk]) => { (ehPrivado(tk) ? priv : pub.tokens)[id] = tk; });
      this.db.ref('mapa').set(pub).catch(erroGravacao);
      this.db.ref('privado/tokens').set(priv).catch(erroGravacao);
    } else { this.salvarLocal(); this.avisar(); }
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
  dados: {}, ref: null, pronto: false,
  carregar() {
    if (Store.modo === 'firebase') {
      if (this.ref) return;
      this.ref = Store.db.ref('segredos');
      this.ref.on('value', s => { this.dados = s.val() || {}; this.pronto = true; atualizarTudo(); agendarSincMestre(); }, () => {});
    } else {
      try { this.dados = JSON.parse(localStorage.getItem('acf-segredos') || '{}'); } catch (e) { this.dados = {}; }
      this.pronto = true;
    }
  },
  parar() { if (this.ref) { this.ref.off(); this.ref = null; } this.dados = {}; this.pronto = false; },
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
/* =========================================================
   REDE: leitura e gravação fora do mapa (chat, sinais, arquivos, privado).
   Com Firebase, vai direto ao banco. No modo local, imita o banco numa
   árvore guardada no navegador e repassada entre as abas.
   ========================================================= */
const Rede = {
  arvore: {}, ouv: [], canal: null, localPronto: false,
  fb() { return Store.modo === 'firebase'; },
  partes(c) { return String(c).split('/').filter(Boolean); },
  iniciarLocal() {
    if (this.localPronto) return;
    this.localPronto = true;
    try { this.arvore = JSON.parse(localStorage.getItem('acf-rede') || '{}') || {}; } catch (e) { this.arvore = {}; }
    try {
      this.canal = new BroadcastChannel('acf-rede');
      this.canal.onmessage = ev => { this.arvore = ev.data.arvore || {}; this.notificar(ev.data.caminho); };
    } catch (e) {}
  },
  ler(c) { let o = this.arvore; for (const k of this.partes(c)) { if (o == null || typeof o !== 'object') return null; o = o[k]; } return o === undefined ? null : o; },
  copia(v) { return v == null ? null : JSON.parse(JSON.stringify(v)); },
  // grava (valor null apaga); jogador e auxiliar esperam o login invisível
  async set(c, v) {
    if (v === undefined) v = null;
    if (this.fb()) {
      if (!mestre && !Store.auth.currentUser) await Store.garantirLogin();
      return Store.db.ref(c).set(v);
    }
    this.iniciarLocal();
    const ps = this.partes(c);
    let o = this.arvore;
    for (let i = 0; i < ps.length - 1; i++) { if (!o[ps[i]] || typeof o[ps[i]] !== 'object') o[ps[i]] = {}; o = o[ps[i]]; }
    if (v === null) delete o[ps[ps.length - 1]]; else o[ps[ps.length - 1]] = this.copia(v);
    try { localStorage.setItem('acf-rede', JSON.stringify(this.arvore)); } catch (e) { aviso('Sem espaço no navegador para guardar isso (modo local).'); }
    try { this.canal && this.canal.postMessage({ arvore: this.arvore, caminho: c }); } catch (e) {}
    this.notificar(c);
  },
  chave() {
    if (this.fb()) return Store.db.ref('_').push().key;
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },
  push(c, v) { const k = this.chave(); const p = this.set(c + '/' + k, v); return { key: k, pronto: p }; },
  // escuta um caminho; devolve a função que para de escutar
  on(c, cb, erro) {
    if (this.fb()) {
      const r = Store.db.ref(c);
      const h = s => cb(s.val());
      r.on('value', h, erro || (() => {}));
      return () => r.off('value', h);
    }
    this.iniciarLocal();
    const o = { c, cb };
    this.ouv.push(o);
    cb(this.copia(this.ler(c)));
    return () => { this.ouv = this.ouv.filter(x => x !== o); };
  },
  once(c) {
    if (this.fb()) return Store.db.ref(c).once('value').then(s => s.val());
    this.iniciarLocal();
    return Promise.resolve(this.copia(this.ler(c)));
  },
  notificar(c) {
    const ps = this.partes(c).join('/');
    this.ouv.slice().forEach(o => {
      const oc = this.partes(o.c).join('/');
      if (ps === oc || ps.startsWith(oc + '/') || oc.startsWith(ps + '/') || !ps) o.cb(this.copia(this.ler(o.c)));
    });
  },
};

/* =========================================================
   PRIVADO (Mestre e auxiliares): fichas ocultas, nomes e elementos das
   salas, elevadores e subtítulos dos andares. Jogadores nunca leem isto;
   recebem só o que o Mestre revela (mapa/nomes).
   ========================================================= */
const Priv = {
  dados: {}, pronto: false, off: null,
  ligar(sim) {
    if (sim && !this.off) {
      this.off = Rede.on('privado', v => {
        if (!this.pronto) Diario.reiniciar = true;
        this.dados = v || {};
        this.pronto = true;
        if (Store.modo === 'firebase') { Store.privTok = this.dados.tokens || {}; Store.compor(); }
        migrarOcultos();
        Store.avisar();
      }, () => {});
    }
    if (!sim && this.off) {
      this.off(); this.off = null; this.dados = {}; this.pronto = false;
      if (Store.modo === 'firebase') { Store.privTok = {}; Store.compor(); Store.avisar(); }
    }
  },
  gravar(caminho, valor) {
    let o = this.dados;
    for (let i = 0; i < caminho.length - 1; i++) { if (!o[caminho[i]] || typeof o[caminho[i]] !== 'object') o[caminho[i]] = {}; o = o[caminho[i]]; }
    if (valor === null || valor === undefined || valor === '') delete o[caminho[caminho.length - 1]]; else o[caminho[caminho.length - 1]] = valor;
    return Rede.set('privado/' + caminho.join('/'), valor === '' ? null : valor).catch(erroGravacao);
  },
};
// fichas ocultas que ainda estejam no mapa público (versão antiga) vão para o privado
let migrou = false;
function migrarOcultos() {
  if (migrou || !mestre || Store.modo !== 'firebase' || !Store.pub) return;
  migrou = true;
  Object.entries((Store.pub && Store.pub.tokens) || {}).forEach(([id, tk]) => { if (ehPrivado(tk)) Store.definir(['tokens', id], tk); });
}

// a função só existe na tela do Mestre
const funcaoDe = id => (mestre && Segredos.dados[id]) || '';

/* Mesmas condições das regras do Firebase, conferidas antes de enviar.
   Jogador: só a própria cobaia. Auxiliar: os Filhos e o próprio robô.
   Ninguém além do Mestre troca andar, ocultação, coloca ou tira fichas. */
function recusaLocal(caminho, valor) {
  if (caminho[0] !== 'tokens' || caminho.length !== 2) return 'Só o Mestre pode fazer isso.';
  const atual = (Store.state.tokens || {})[caminho[1]];
  if (!atual || !valor) return 'Só o Mestre pode colocar ou tirar fichas do mapa.';
  if (!podeMover(atual)) return meu ? 'Você só pode mover a sua própria cobaia.' : 'Você não pode mover essa ficha.';
  const igual = c => (valor[c] === undefined ? null : valor[c]) === (atual[c] === undefined ? null : atual[c]);
  if (!igual('s') || !igual('a') || !igual('h') || !igual('vf')) return 'Só o Mestre pode mudar o andar ou a ocultação de uma ficha.';
  return '';
}

// recusa do servidor: aviso passageiro; o mapa volta sozinho ao estado certo
let erroTimer = null;
function erroGravacao(e) {
  console.warn('Gravação recusada:', e && e.message ? e.message : e);
  setSync('ação recusada', 'erro');
  aviso('O servidor recusou essa ação. O mapa voltou ao estado certo.');
  clearTimeout(erroTimer);
  erroTimer = setTimeout(mostrarConexao, 4000);
}
let jaConectou = false;
function mostrarConexao() {
  if (Store.modo !== 'firebase') return;
  if (Store.conectado) jaConectou = true;
  $('#faixaConexao').hidden = !jaConectou || !!Store.conectado || TV;
  setSync(Store.conectado ? 'ao vivo' : 'reconectando…', Store.conectado ? 'vivo' : '');
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
  if (Store.modo !== 'firebase') Priv.ligar(sim || !!aux);
  if (sim) agendarSincMestre();
  if (Store.modo !== 'firebase') Chat.ligar();
  if (sim) preencherEspiar(); else if (espiar) { espiar = null; $('#faixaEspiar').hidden = true; document.body.classList.remove('espiando'); }
  aplicarAbas();
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
  if (typeof fichasPorFila !== 'undefined' && fichasPorFila && porFilaAtual() !== fichasPorFila) desenharFichas();
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
    const ci = podeVer(andarAtual) && !p ? corredorEm(pt.x, pt.y) : -1;
    if (p) selecionarSala(cnDe(andarAtual, p)); else if (ci >= 0) selecionarCorredor(ci); else selecionar(null);
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
    case 'eu': focarMinhaFicha(celular()); return;
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
  $('#legendaSub').textContent = (veTudo() || algumaRevelada) && subtituloDe(andarAtual) ? subtituloDe(andarAtual) : 'Setor não mapeado';

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
    const visivel = V().mestre || revelada;
    let [nome, elm] = infoSala(andarAtual, cn);
    if (!visivel) { nome = ''; elm = '?'; }
    const elemento = ELEMENTOS[elm] || ELEMENTOS['?'];
    // grade do piso: 8 quadradinhos por lado (cada um com 0,88 m)
    const d = el('div', 'sala', { left: px(s.x), top: px(s.y), width: px(s.w), height: px(s.h), backgroundSize: `${R * T / 8}px ${R * T / 8}px` });
    d.dataset.cn = cn;
    if (p === 25 && visivel) d.classList.add('neutra');
    if (!visivel) d.classList.add('desconhecida');
    if (V().mestre && !revelada) d.classList.add('oculta-jog');
    if (!nome && p !== 25) d.classList.add('vazia-planta');
    d.style.setProperty('--el', elemento.cor);
    d.innerHTML = `<div class="sala-tinta"></div>
      <div class="sala-rotulo">
        ${visivel ? `<span class="sala-cn">CN ${String(cn).padStart(2, '0')}</span>` : '<span class="sala-cn">Desconhecido</span>'}
        ${V().mestre && !revelada ? '<span class="sala-oculta">oculta aos jogadores</span>' : ''}
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
  desenharPortas(paredes);
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
  const vv = V();
  let t = (vv.mestre ? 'M' : vv.aux ? 'A' : 'J') + (espiar ? espiar.id : '') + andarAtual + ':';
  for (let p = 1; p <= 25; p++) t += salaRevelada(andarAtual, cnDe(andarAtual, p)) ? '1' : '0';
  const nomes = [];
  for (let p = 1; p <= 25; p++) nomes.push(infoSala(andarAtual, cnDe(andarAtual, p)).join('|'));
  const portas = Object.entries(Store.state.portas || {}).filter(([k]) => k.startsWith('a' + andarAtual + 'c')).map(kv => kv.join('=')).sort();
  return t + '|' + saidaCN(andarAtual) + '|' + subtituloDe(andarAtual) + '|' + nomes.join(';') + '|' + portas.join(',');
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

/* Fichas encostadas umas nas outras se afastam um pouco, só na tela
   (a posição salva não muda). Ficha em espaço livre aparece exatamente
   onde está, então dá para movê-la à vontade dentro da sala.
   Sala com mais de 3 fichas: fichas um pouco menores e nomes só ao selecionar. */
const posTela = new Map();
const cheias = new Set();
let fichasPorFila = 0;   // guarda o zoom usado no último cálculo
function porFilaAtual() { return +Math.min(2.4, Math.max(0.8, 0.85 / cam.s)).toFixed(2); }
function calcularFileiras(lista) {
  posTela.clear();
  cheias.clear();
  fichasPorFila = porFilaAtual();
  const k = fichasPorFila;
  const grupos = new Map();
  lista.forEach(([id, tk]) => {
    if (arrastando && arrastando.id === id) return;
    const p = salaEm(tk.a, tk.x, tk.y);
    const chave = p ? 'p' + p : 'c';
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push({ id, x: tk.x, y: tk.y, x0: tk.x, y0: tk.y, p });
  });
  grupos.forEach(l => {
    const cheia = l[0].p && l.length > 3;
    if (cheia) l.forEach(o => cheias.add(o.id));
    const D = Math.min(1.3, (34 * k * (cheia ? 0.7 : 1)) / T * 0.9);   // distância mínima entre cabeças
    for (let it = 0; it < 12; it++) {
      let mexeu = false;
      for (let a = 0; a < l.length; a++) for (let b = a + 1; b < l.length; b++) {
        const A = l[a], B = l[b];
        let dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
        if (d >= D) continue;
        if (d < 0.001) { dx = Math.cos(a + b); dy = Math.sin(a + b); d = 1; }
        const em = (D - d) / 2;
        A.x -= dx / d * em; A.y -= dy / d * em; B.x += dx / d * em; B.y += dy / d * em;
        mexeu = true;
      }
      l.forEach(o => { if (o.p) { const r = retSala(o.p); o.x = clamp(o.x, r.x + 0.3, r.x + R - 0.3); o.y = clamp(o.y, r.y + 0.3, r.y + R - 0.3); } });
      if (!mexeu) break;
    }
    l.forEach(o => { if (Math.abs(o.x - o.x0) > 0.01 || Math.abs(o.y - o.y0) > 0.01) posTela.set(o.id, { x: +o.x.toFixed(2), y: +o.y.toFixed(2) }); });
  });
}

function desenharFichas() {
  if (!podeVer(andarAtual)) return;
  const tokens = Store.state.tokens || {};
  const vistos = new Set();
  calcularFileiras(Object.entries(tokens).filter(([, tk]) => SER[tk.s] && tk.a === andarAtual && visivelPara(tk)));

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
      const pos = posTela.get(id) || tk;
      f.style.left = px(pos.x); f.style.top = px(pos.y);
    }
    f.classList.toggle('em-fila', cheias.has(id));
    $('.ficha-nome', f).textContent = rotuloFicha(tk, id);
    f.classList.toggle('na-vez', vezAtual() === id);
    f.classList.toggle('oculta', !!tk.h);
    f.classList.toggle('minha', !mestre && podeMover(tk));
    f.classList.toggle('vista-filhos', mestre && !!tk.vf);
    f.classList.toggle('selecionada', selecionado === id);
    f.classList.toggle('no-grupo', grupo.has(id));
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
    if (espiar) { selecionar(id); aviso('Volte à visão do Mestre para mover fichas.'); return; }
    if (mestre && e.shiftKey) { alternarGrupo(id); return; }
    if (!podeMover(tk)) { selecionar(id); return; }
    const motivo = bloqueioPerseguicao(id, tk);
    if (motivo) { aviso(motivo); selecionar(id); return; }
    const p = telaParaPiso(e.clientX, e.clientY);
    const antes = { a: tk.a, x: tk.x, y: tk.y, m: tk.m || 0 };
    // ficha em fileira: o arraste começa de onde ela aparece na tela
    const vista = posTela.get(id);
    if (vista) { tk.x = vista.x; tk.y = vista.y; }
    arrastando = { id, dx: tk.x - p.x, dy: tk.y - p.y, andou: false, ultimo: 0, limitado: !!limiteDe(id), antes, outros: grupoInicio(id) };
    previaInicio(tk);
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
    previaPasso(tk, lim);
    if (arrastando.outros) grupoPasso(arrastando.outros, tk, arrastando.antes);
    $('.ficha-nome', f).textContent = rotuloFicha(tk, arrastando.id);
    const agora = performance.now();
    if (agora - arrastando.ultimo > 120) {   // envia aos jogadores enquanto arrasta
      arrastando.ultimo = agora;
      Store.definir(['tokens', arrastando.id], { ...tk });
    }
  });
  const fim = () => {
    if (!arrastando || arrastando.id !== f.dataset.id) return;
    const { id, andou, limitado, antes, outros } = arrastando;
    arrastando = null;
    previaFim();
    if (andou && outros) grupoFim(outros);
    f.classList.remove('arrastada');
    const tk = Store.state.tokens[id];
    // voltou ao ponto de partida do turno: zera o que andou
    if (limitado && tk.x0 !== undefined && Math.hypot(tk.x - tk.x0, tk.y - tk.y0) < 0.35) {
      tk.x = tk.x0; tk.y = tk.y0; tk.m = 0;
    }
    if (!andou) { tk.x = antes.x; tk.y = antes.y; }
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
  corredorSel = null;
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
  delete c.dataset.ficha;
  const cn = salaSel;
  // não atrapalha o Mestre enquanto ele escreve a anotação
  if (+c.dataset.sala === cn && c.contains(document.activeElement) && document.activeElement.matches('input, textarea, select')) return;
  const abertos = +c.dataset.sala === cn ? $$('details', c).map(d => d.open) : [];
  c.dataset.sala = cn;
  const a = Math.ceil(cn / 25);
  const andar = ANDARES[a - 1];
  const p = cn - 25 * (a - 1);
  const [nome, elm] = infoSala(a, cn);
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
      <button data-acao="vfnao">Esconder dos Filhos quem está aqui</button>
      <button data-acao="trazcob">Trazer todas as cobaias para cá</button>
      ${grupo.size ? `<button data-acao="trazgrupo">Trazer o grupo (${grupo.size}) para cá</button>` : ''}</div>
    <label class="nota-sala">Anotações da sala <span class="so-mestre">só o Mestre vê</span>
      <textarea class="nota-txt" rows="4" placeholder="Pistas, armadilhas, o que já foi revelado…">${esc(notaDe(cn))}</textarea></label>
    <span class="nota-status" aria-live="polite"></span>
    ${htmlEdicaoSala(a, cn, p)}`;
  c.hidden = false;
  $$('details', c).forEach((d, i) => { if (abertos[i]) d.open = true; });
  ligarEdicaoSala(c, a, cn);
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
  $('[data-acao="trazcob"]', c).onclick = () => {
    const ids = SERES.filter(x => x.tipo === 'cobaia' && Store.state.tokens[x.id]).map(x => x.id);
    if (confirm(`Levar as ${ids.length} cobaias para a CN ${pad2(cn)}?`)) levarParaSala(ids, a, p);
  };
  const btg = $('[data-acao="trazgrupo"]', c);
  if (btg) btg.onclick = () => levarParaSala([...grupo], a, p);
  $('[data-acao="vfnao"]', c).onclick = () => marcar(false);
}

// cartão da sala para jogadores e auxiliares: nome completo e quem está ali
function desenharCartaoSalaPublico() {
  const c = $('#cartao');
  delete c.dataset.ficha;
  delete c.dataset.sala;
  const cn = salaSel;
  const a = Math.ceil(cn / 25), p = cn - 25 * (a - 1);
  const vis = salaVisivel(a, cn);
  const [nome, elm] = vis ? infoSala(a, cn) : ['', '?'];
  const mostraEl = vis && !!(Store.state.rev || {})['a' + a] && elm !== '?' && elm !== 'N';
  const el2 = ELEMENTOS[mostraEl ? elm : '?'] || ELEMENTOS['?'];
  const aqui = Object.entries(Store.state.tokens || {}).filter(([, tk]) =>
    SER[tk.s] && tk.a === a && salaEm(tk.a, tk.x, tk.y) === p && visivelPara(tk)).map(([, tk]) => rotuloBase(tk));
  c.style.setProperty('--cor', el2.cor);
  c.innerHTML = `<button class="fechar" aria-label="Fechar">×</button>
    <div class="cartao-topo"><div class="cartao-bola sala-bola"></div><div>
      <h3>${vis ? 'CN ' + pad2(cn) : 'Sala desconhecida'}</h3><span class="cod">${vis ? (nome || 'sem nome registrado') : 'ainda não mapeada'}</span></div></div>
    ${mostraEl ? `<p>Elemento: ${el2.nome}</p>` : ''}
    <p><strong>Aqui:</strong> ${aqui.length ? aqui.map(esc).join(', ') : 'ninguém à vista'}</p>
    ${vis && Arquivos.daSala(cn).length ? `<p><strong>Arquivos encontrados:</strong></p><div class="acoes">${Arquivos.daSala(cn).map(([fid, t]) => `<button data-abrir="${fid}">📄 ${esc(t)}</button>`).join('')}</div>` : ''}`;
  c.hidden = false;
  $('.fechar', c).onclick = () => selecionar(null);
  $$('[data-abrir]', c).forEach(b => b.onclick = () => Arquivos.abrir(b.dataset.abrir));
}

function desenharCartao() {
  const c = $('#cartao');
  if (corredorSel !== null && corredorSel !== undefined && CORREDORES[corredorSel]) { desenharCartaoCorredor(); return; }
  if (salaSel && mestre && !espiar) { desenharCartaoSala(); return; }
  if (salaSel) { desenharCartaoSalaPublico(); return; }
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

  const fichaMinha = !mestre && tk.s === meu ? `<div class="cartao-ficha">${barrasFicha(fichaDe(meu))}</div>` : '';
  const fichaEdit = mestre && s.tipo === 'cobaia' ? htmlEditarFicha(s.id) : '';
  if (c.dataset.ficha === selecionado && c.contains(document.activeElement) && document.activeElement.matches('input')) return;
  const abertos = c.dataset.ficha === selecionado ? $$('details', c).map(d => d.open) : [];
  c.dataset.ficha = selecionado;
  c.innerHTML = `<button class="fechar" aria-label="Fechar">×</button>
    <div class="cartao-topo">${foto}<div><h3>${titulo}</h3><span class="cod">${s.codigo}</span></div></div>
    ${linhas}<p><strong>Onde:</strong> ${descreveLocal(tk)}</p>${fichaMinha}${acoes}${fichaEdit}`;
  c.hidden = false;
  $$('details', c).forEach((d, i) => { if (abertos[i]) d.open = true; });
  if (fichaEdit) ligarEditarFicha(c, s.id);

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
      <strong>${Presenca.online(s.id) ? '<span class="ponto-on on" title="conectado agora"></span>' : ''}${s.nome} <span class="sub" style="display:inline">${s.codigo}</span>${!mestre && s.id === meu ? '<span class="voce">você</span>' : ''}</strong>
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
  const ouvinte = !!V().aux && !V().mestre;
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
    marcarRastro(tk.a, p, p ? null : CORREDORES.findIndex(c => dentro(c, tk.x, tk.y)));
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
  marcarSalasMestre();
  desenharExtrasMestre();
  verificarSuaVez();
  desenharExpo();
  desenharRelogio();
  desenharMinhaFicha();
  desenharOpcoesMestre();
  ligarSinais();
  seguirAndarTV();
  desenharCenas();
  desenharGrupo();
  desenharRastros();
  desenharCaderno();
  desenharConectados();
  desenharOpcoesLoja();
  aplicarAbas();
  Presenca.ligar();
  if ($('#dlgLoja').open) desenharLoja();
  atualizarDesfazer();
  desenharApagaoMestre();
  desenharBalanca();
  desenharEco();
  atualizarBotaoMinha();
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
    focoInicialCelular();
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
    if (typeof mudo !== 'undefined' && mudo) return;
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
  if (bloqueadoPorPorta(andar, x, y)) return false;
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
    const tit = $('#dadosTitulo').textContent;
    postarRolagem(`rolou ${total} (${qtd}d20: ${dados.join(', ')}${desv ? ', desvantagem' : ''}; ${bonus >= 0 ? '+' : '−'}${Math.abs(bonus)})${tit && tit !== 'Rolar dados' ? ' · ' + tit.replace('O Mestre pediu: ', '') : ''}`);
  }
}
$('#btnRolar').addEventListener('click', rolar);
$('#btnDados').addEventListener('click', () => $('#painelDados').hidden ? abrirDados('Rolar dados') : fecharDados());
$('#btnFecharDados').addEventListener('click', fecharDados);
$('#btnRolarFora').addEventListener('click', () => {
  const quem = meu || aux;
  if (quem && Store.state.tokens[quem]) Store.definir(['tokens', quem], { ...Store.state.tokens[quem], r: { fora: true, ts: Date.now() } });
  if (quem) postarRolagem('vai rolar em outro lugar');
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
function lerPerfil() {
  try { const s = sessionStorage.getItem('acf-perfil'); if (s !== null) return s; } catch (e) {}
  try { return localStorage.getItem('acf-perfil') || ''; } catch (e) { return ''; }
}
function salvarPerfil(v) {
  try { sessionStorage.setItem('acf-perfil', v || ''); } catch (e) {}
  try { v ? localStorage.setItem('acf-perfil', v) : localStorage.removeItem('acf-perfil'); } catch (e) {}
}
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
  if (Store.modo === 'firebase') Store.garantirLogin().then(() => Chat.ligar()).catch(erroGravacao);
  else Chat.ligar();
  atualizarBotaoPerfil();
  atualizarTudo();
  const tk = Store.state.tokens[id];
  if (celular()) { focoInicial = false; focoInicialCelular(); }
  else if (tk && podeVer(tk.a)) irParaFicha(id);
}

function escolherRobo(id) {
  aux = id; meu = null;
  salvarPerfil('aux:' + id);
  $('#perfil').hidden = true;
  if (Store.modo !== 'firebase') Priv.ligar(true);
  atualizarBotaoPerfil();
  Chat.ligar();
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
  if (Presenca.quem) { Rede.set('presenca/' + Presenca.id, null).catch(() => {}); Presenca.quem = ''; clearInterval(Presenca.timer); }
  meu = null; aux = null;
  salvarPerfil('');
  if (Store.modo === 'firebase' && Store.auth.currentUser) Store.auth.signOut();
  if (Store.modo !== 'firebase') Priv.ligar(false);
  definirMestre(false);
  Chat.ligar();
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
  const senha = $('#auxSenha').value.trim();
  if (Store.modo === 'firebase') {
    // conta própria dos auxiliares: o Firebase confere a senha de verdade
    try {
      if (Store.auth.currentUser) await Store.auth.signOut();
      await Store.auth.signInWithEmailAndPassword(EMAIL_AUXILIARES, senha);
      mostrarPerfil(4);
    } catch (err) {
      $('#auxErro').textContent = /user-not-found|invalid-credential|INVALID_LOGIN/i.test(String(err && (err.code || err.message))) && senha
        ? 'Senha recusada (ou a conta dos auxiliares ainda não foi criada no Firebase).' : 'Senha recusada.';
      $('#auxErro').hidden = false;
    }
    return;
  }
  if (await hash(senha) === SENHA_AUX) mostrarPerfil(4);
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
    const [nome] = infoSala(tk.a, cn);
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
    const novo = JSON.parse(JSON.stringify({ tokens: st.tokens || {}, salas: st.salas || {}, rev: st.rev || {}, ruido: st.ruido || {}, persg: st.persg || {}, ap: st.ap || null, portas: st.portas || {}, cego: st.cego || {} }));
    const ant = this.prev;
    this.prev = novo;
    if (!ant || this.reiniciar) { this.reiniciar = false; this.pend = {}; return; }
    if (!mestre) return;
    this.difFichas(ant.tokens, novo.tokens);
    this.difSalas(ant, novo);
    this.difRuido(ant.ruido, novo.ruido);
    this.difPersg(ant.persg, novo.persg);
    const apA = !!(ant.ap && ant.ap.on), apB = !!(novo.ap && novo.ap.on);
    if (!apA && apB) {
      const ve = Object.keys(apagaoVe()).filter(id => apagaoVe()[id]).map(id => SER[id] ? SER[id].nome : id);
      this.registrar('sala', `APAGÃO ligado${ve.length ? ' · continuam enxergando: ' + ve.join(', ') : ''}`);
    }
    if (apA && !apB) this.registrar('sala', 'Apagão desligado');
    new Set([...Object.keys(ant.portas || {}), ...Object.keys(novo.portas || {})]).forEach(k => {
      const a = (ant.portas || {})[k] || null, b = (novo.portas || {})[k] || null;
      if (a === b) return;
      const m = /^a(\d+)c(\d+)$/.exec(k); if (!m) return;
      const c = CORREDORES[+m[2]], andar = +m[1];
      this.registrar('sala', `Corredor entre CN ${pad2(cnDe(andar, c.p1))} e CN ${pad2(cnDe(andar, c.p2))}: ${b ? TIPOS_PORTA[b].toLowerCase() : 'porta aberta'}`);
    });
    new Set([...Object.keys(ant.cego || {}), ...Object.keys(novo.cego || {})]).forEach(id => {
      const a = !!(ant.cego || {})[id], b = !!(novo.cego || {})[id];
      if (a !== b && SER[id]) this.registrar('sala', `${SER[id].nome} ${b ? 'entrou numa Trilha de Ausência (sem sinal)' : 'saiu da Trilha de Ausência'}`);
    });
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
      if (a.x !== b.x || a.y !== b.y || a.a !== b.a) { this.moveu(id, a); verificarGatilho(id, a, b); }
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
    contarExposicao(id, tk, p.antes);
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
    const [nome] = infoSala(andarAtual, cn);
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
  const privado = { ...Priv.dados }; delete privado.tokens;
  const pacote = { tipo: 'planta-acf-backup', versao: 2, salvoEm: Date.now(), mapa: Store.state, segredos: Segredos.dados, privado };
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
  Store.state = { ...CAMPOS_VAZIOS(), ...m, tokens: m.tokens || {} };
  Store.gravarTudo();
  if (pacote.privado) ['salas', 'saidas', 'andares'].forEach(k => Priv.gravar([k], pacote.privado[k] || null));
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
   APAGÃO
   O sinal da Interface cai. Cada jogador passa a ver só a própria ficha.
   Quem o Mestre marcar continua vendo. A lista fica nos segredos do Mestre;
   no mapa público vai só um sorteio e códigos embaralhados, sem nomes.
   ========================================================= */
let apagaoChave = '';
let apagaoAntes = false;
let apagaoTimer = null;
async function verificarApagao() {
  const ap = Store.state.ap;
  const vv = V();
  const ativo = !!(ap && ap.on) || cegoDe(vv.meu);
  // entrada no apagão (ou numa Trilha de Ausência): tudo some por alguns segundos e a tela pisca
  if (ativo && !apagaoAntes && !vv.mestre && !vv.aux && !TV) {
    apagaoQueda = true;
    $('#telaApagao').hidden = false;
    document.body.classList.add('apagao-queda');
    clearTimeout(apagaoTimer);
    apagaoTimer = setTimeout(() => {
      apagaoQueda = false;
      $('#telaApagao').hidden = true;
      document.body.classList.remove('apagao-queda');
      atualizarTudo();
    }, 3200);
  }
  if (!ativo) { apagaoQueda = false; clearTimeout(apagaoTimer); $('#telaApagao').hidden = true; document.body.classList.remove('apagao-queda'); }
  apagaoAntes = ativo;
  document.body.classList.toggle('apagao', ativo && !vv.mestre && !vv.aux);
  $('#faixaApagao').hidden = !(apagaoAtivo() && mestre);
  // quem continua vendo
  const chave = apagaoAtivo() && meu ? `${ap.n}:${meu}:${(ap.v || []).join(',')}` : '';
  if (chave === apagaoChave) return;
  apagaoChave = chave;
  let isento = false;
  if (chave) isento = Object.values(ap.v || {}).includes(await hash(ap.n + ':' + meu));
  if (isento !== apagaoIsento) { apagaoIsento = isento; atualizarTudo(); }
}

const apagaoVe = () => (mestre && Segredos.dados._apagaoVe) || {};
function desenharApagaoMestre() {
  if (!mestre) return;
  const caixa = $('#listaApagaoVe');
  if (!caixa.contains(document.activeElement)) {
    const ve = apagaoVe();
    caixa.innerHTML = SERES.filter(x => x.tipo === 'cobaia').map(x =>
      `<label class="chave"><input type="checkbox" data-id="${x.id}" ${ve[x.id] ? 'checked' : ''}><span>${x.nome} <small>${x.jogador}</small></span></label>`).join('');
    $$('input', caixa).forEach(i => i.onchange = async () => {
      Segredos.gravar(['_apagaoVe', i.dataset.id], i.checked ? true : null);
      if (apagaoAtivo()) await publicarApagao(true);
    });
  }
  const b = $('#btnApagao');
  b.textContent = apagaoAtivo() ? 'Desligar apagão' : 'Ligar apagão';
  b.classList.toggle('pronto', apagaoAtivo());
}

// grava no mapa só um sorteio e códigos (com alguns falsos, para não revelar quantos são)
async function publicarApagao(ligar) {
  if (!ligar) { Store.definir(['ap'], null); return; }
  const n = Math.random().toString(36).slice(2, 10);
  const ids = Object.keys(apagaoVe()).filter(id => apagaoVe()[id]);
  const v = await Promise.all(ids.map(id => hash(n + ':' + id)));
  while (v.length < 4) v.push(await hash(n + ':' + Math.random().toString(36)));
  v.sort();
  Store.definir(['ap'], { on: true, n, v });
}
$('#btnApagao').addEventListener('click', async () => {
  if (apagaoAtivo()) { await publicarApagao(false); return; }
  if (confirm('Ligar o apagão? Os jogadores passam a enxergar só a própria ficha até você desligar.')) await publicarApagao(true);
});

/* =========================================================
   BALANÇA DO ECO
   Valor em % para o Rei (0 = tudo da Mãe, 100 = tudo do Rei), começa em 50.
   Fica nos segredos do Mestre. O mapa público recebe só a forma do símbolo
   (neutro, tingido ou consagrado, e para qual lado), nunca o número.
   ========================================================= */
const balanca = () => { const v = Segredos.dados._balanca; return typeof v === 'number' ? v : 50; };
// 50/50 a 60/40 neutro · 65/35 a 85/15 tingido · 90/10 a 100 consagrado
function estagioEco(r) {
  const d = Math.abs(r - 50);
  if (d <= 10) return 'neutro';
  return (r > 50 ? 'rei' : 'mae') + (d >= 40 ? '-c' : '-t');
}
const NOME_ECO = { neutro: 'Eco', 'mae-t': 'Eco Tingido', 'rei-t': 'Eco Tingido', 'mae-c': 'Eco Consagrado', 'rei-c': 'Eco Consagrado' };
const ESTADO_MESTRE = { neutro: 'Neutro', 'mae-t': 'Tingido para a Mãe', 'rei-t': 'Tingido para o Rei', 'mae-c': 'Consagrado à Mãe', 'rei-c': 'Consagrado ao Rei' };

// o Mestre mantém a forma pública do símbolo igual à Balança
function sincronizarEco() {
  if (!mestre || !Segredos.pronto) return;
  const e = estagioEco(balanca());
  if (((Store.state.eco || {}).e || 'neutro') !== e) Store.definir(['eco'], { e });
}
function mudarBalanca(v) {
  v = clamp(Math.round(v / 5) * 5, 0, 100);
  const antes = balanca();
  if (v === antes) return;
  Segredos.gravar(['_balanca'], v);
  const ea = estagioEco(antes), eb = estagioEco(v);
  Diario.registrar('sala', `Balança do Eco: Rei ${v}% / Mãe ${100 - v}% (${v > antes ? '+' + (v - antes) + ' Rei' : '+' + (antes - v) + ' Mãe'})${ea !== eb ? ' · ' + ESTADO_MESTRE[eb] : ''}`);
  sincronizarEco();
  desenharBalanca();
  desenharEco();
}
function desenharBalanca() {
  if (!mestre) return;
  const v = balanca(), e = estagioEco(v);
  const rg = $('#balancaRange');
  if (document.activeElement !== rg) rg.value = v;
  $('#balRei').textContent = v + '%';
  $('#balMae').textContent = (100 - v) + '%';
  $('#balancaEstado').textContent = ESTADO_MESTRE[e];
  $('#balancaEstado').className = 'bal-estado ' + (e.startsWith('rei') ? 'rei' : e.startsWith('mae') ? 'mae' : '');
  sincronizarEco();
}
$('#balancaRange').addEventListener('change', e => mudarBalanca(+e.target.value));
$('#btnBalMae').addEventListener('click', () => mudarBalanca(balanca() - 5));
$('#btnBalRei').addEventListener('click', () => mudarBalanca(balanca() + 5));
$('#btnBalZerar').addEventListener('click', () => { if (confirm('Voltar a Balança para 50/50?')) mudarBalanca(50); });

// o símbolo no canto do mapa (todos veem)
function desenharEco() {
  const e = mestre && Segredos.pronto ? estagioEco(balanca()) : ((Store.state.eco || {}).e || 'neutro');
  const caixa = $('#ecoSimbolo');
  $$('img', caixa).forEach(im => im.classList.toggle('ativo', im.dataset.e === e));
  caixa.classList.toggle('consagrado', e.endsWith('-c'));
  const nome = NOME_ECO[e] || 'Eco';
  $('#ecoNome').textContent = nome;
  caixa.title = nome;
  caixa.setAttribute('aria-label', nome);
}
// no celular, tocar mostra o nome por alguns segundos
let ecoTimer = null;
$('#ecoSimbolo').addEventListener('click', () => {
  const c = $('#ecoSimbolo');
  c.classList.add('mostra');
  clearTimeout(ecoTimer);
  ecoTimer = setTimeout(() => c.classList.remove('mostra'), 2500);
});

/* =========================================================
   CELULAR: começar perto da própria ficha
   ========================================================= */
const celular = () => window.innerWidth <= 860;
const minhaFichaId = () => meu || aux || null;
// zoom que mostra cerca de 3 x 3 salas
function focarMinhaFicha(comZoom) {
  const id = minhaFichaId();
  const tk = id && (Store.state.tokens || {})[id];
  if (!tk) return false;
  if (tk.a !== andarAtual) { if (!podeVer(tk.a)) return false; irParaAndar(tk.a); }
  if (comZoom) {
    const r = viewport.getBoundingClientRect();
    cam.s = clamp(r.width / ((3 * R + 2 * G) * T) * 0.98, 0.2, 4);
  }
  const p = salaEm(tk.a, tk.x, tk.y);
  const alvo = p ? { x: retSala(p).x + R / 2, y: retSala(p).y + R / 2 } : tk;
  focar(alvo.x, alvo.y);
  return true;
}
let focoInicial = false;
function focoInicialCelular() {
  if (focoInicial || mestre || !minhaFichaId() || !celular()) return;
  if (focarMinhaFicha(true)) focoInicial = true;
}
function atualizarBotaoMinha() {
  const id = minhaFichaId();
  $('#btnIrMinha').hidden = !(id && (Store.state.tokens || {})[id] && !mestre);
}

// gaveta do painel no celular: tocar ou puxar a aba para cima abre
(() => {
  const aba = $('#abaPainel');
  let y0 = null;
  aba.addEventListener('pointerdown', e => { y0 = e.clientY; });
  aba.addEventListener('pointerup', e => {
    if (y0 === null) return;
    const dy = e.clientY - y0; y0 = null;
    if (dy < -20 || Math.abs(dy) < 8) $('#painel').classList.add('aberto');
  });
})();

/* =========================================================
   SINCRONIA FEITA PELA TELA DO MESTRE
   Publica para os jogadores só o que foi revelado (nomes das salas,
   elevador, subtítulo) e calcula quem está numa Trilha de Ausência.
   ========================================================= */
let sincTimer = null;
function agendarSincMestre() {
  if (!mestre) return;
  clearTimeout(sincTimer);
  sincTimer = setTimeout(sincronizarMestre, 250);
}
function sincronizarMestre() {
  if (!mestre || !Segredos.pronto) return;
  if (Priv.pronto || Store.modo !== 'firebase') for (let a = 1; a <= 5; a++) publicarNomes(a);
  sincronizarCego();
  semearLoja();
}
const igualJSON = (x, y) => JSON.stringify(x === undefined ? null : x) === JSON.stringify(y === undefined ? null : y);
function publicarNomes(a) {
  const atual = Store.state.nomes || {};
  const privSalas = Priv.dados.salas || {};
  const saida = saidaCN(a);
  const temSaidaPriv = (Priv.dados.saidas || {})['a' + a] !== undefined;
  const rev = !!(Store.state.rev || {})['a' + a];
  let algum = false;
  for (let p = 1; p <= 25; p++) {
    const cn = cnDe(a, p), k = 'c' + cn;
    let val = null;
    if (salaRevelada(a, cn)) {
      const publicar = a > 1 || privSalas[k] || (temSaidaPriv && saida === cn);
      if (a > 1) algum = true;
      if (publicar) {
        const [n, e] = infoSala(a, cn);
        val = { n: n || '' };
        if (rev && e && e !== '?') val.e = e;
        if (saida === cn) val.s = true;
      }
    }
    if (!igualJSON(atual[k], val)) Store.definir(['nomes', k], val);
  }
  if (a > 1) {
    const sub = algum ? (subtituloDe(a) || null) : null;
    if (!igualJSON(atual['a' + a], sub)) Store.definir(['nomes', 'a' + a], sub);
  }
}

/* ---------- Trilhas de Ausência (zonas sem sinal) ----------
   A lista das salas fica nos segredos do Mestre. O mapa público recebe só
   quais cobaias estão "cegas" agora, e cada jogador cego vê só a própria ficha. */
const semSinal = cn => !!(mestre && (Segredos.dados._semSinal || {})['c' + cn]);
function sincronizarCego() {
  const novo = {};
  const ve = Segredos.dados._apagaoVe || {};
  Object.entries(Store.state.tokens || {}).forEach(([id, tk]) => {
    if (!SER[tk.s] || SER[tk.s].tipo !== 'cobaia' || ve[tk.s]) return;
    const p = salaEm(tk.a, tk.x, tk.y);
    if (p && semSinal(cnDe(tk.a, p))) novo[id] = true;
  });
  const atual = Store.state.cego || {};
  if (!igualJSON(Object.keys(atual).sort(), Object.keys(novo).sort())) Store.definir(['cego'], Object.keys(novo).length ? novo : null);
}
const cegoEu = () => !!(meu && !mestre && (Store.state.cego || {})[meu]);

/* ---------- Edição da sala pelo Mestre (cartão) ---------- */
function htmlEdicaoSala(a, cn, p) {
  const [nome, elm] = infoSala(a, cn);
  const saida = saidaCN(a) === cn;
  const opcoes = ['S', 'M', 'C', 'E', 'F', '?'].map(k => `<option value="${k}" ${k === elm ? 'selected' : ''}>${ELEMENTOS[k].nome}</option>`).join('');
  return `<details class="cartao-sec" ${p === 25 ? '' : ''}><summary>Editar sala</summary>
      <label class="campo-linha">Nome <input class="ed-nome" value="${esc(nome)}" placeholder="sem nome"></label>
      <label class="campo-linha">Elemento <select class="ed-el">${opcoes}</select></label>
      <label class="chave"><input type="checkbox" class="ed-saida" ${saida ? 'checked' : ''}><span>O elevador para o ${a < 5 ? (a + 1) + 'º andar' : 'fim'} fica nesta sala</span></label>
      <label class="chave"><input type="checkbox" class="ed-semsinal" ${semSinal(cn) ? 'checked' : ''}><span>Sem sinal (Trilha de Ausência): quem entrar só vê a própria ficha</span></label>
      <label class="campo-linha">Gatilho (avisa você quando uma cobaia entrar) <input class="ed-gatilho" value="${esc(gatilhoDe(cn))}" placeholder="ex.: armadilha do armário"></label>
    </details>
    <details class="cartao-sec arq-sec"><summary>Arquivos da sala <span class="arq-qtd">${Arquivos.daSalaMestre(cn).length || ''}</span></summary>
      <ul class="arq-lista-mestre">${Arquivos.daSalaMestre(cn).map(([fid, f]) => `<li data-fid="${fid}">
        <span class="arq-t">${esc(f.t)}${f.img ? ' 🖼' : ''}</span>
        <button data-arq="abrir">Abrir</button>
        <button data-arq="rev" class="${f.rev ? 'on' : ''}">${f.rev ? 'Revelado · esconder' : 'Revelar'}</button>
        <button data-arq="apagar" class="perigo">Apagar</button></li>`).join('') || '<li class="vazio">Nenhum arquivo.</li>'}</ul>
      <div class="arq-novo">
        <input class="arq-titulo" placeholder="Título (ex.: Prontuário rasgado)">
        <textarea class="arq-texto-novo" rows="3" placeholder="Texto do arquivo (opcional)"></textarea>
        <input type="file" class="arq-img" accept="image/*">
        <button class="btn-roxo arq-add">Adicionar arquivo (fica oculto)</button>
      </div>
    </details>`;
}
function ligarEdicaoSala(c, a, cn) {
  const salvarSala = () => {
    const n = $('.ed-nome', c).value.trim(), e = $('.ed-el', c).value;
    Priv.gravar(['salas', 'c' + cn], { n, e });
    agendarSincMestre();
    montarAndar(); atualizarTudo();
  };
  $('.ed-nome', c).onchange = salvarSala;
  $('.ed-el', c).onchange = salvarSala;
  $('.ed-saida', c).onchange = e => {
    Priv.gravar(['saidas', 'a' + a], e.target.checked ? cn : 0);
    agendarSincMestre();
    montarAndar(); atualizarTudo();
  };
  $('.ed-gatilho', c).onchange = e => {
    Segredos.gravar(['_gatilhos', 'c' + cn], e.target.value.trim() || null);
    marcarSalasMestre();
  };
  $('.ed-semsinal', c).onchange = e => {
    Segredos.gravar(['_semSinal', 'c' + cn], e.target.checked ? true : null);
    Diario.registrar('sala', `CN ${pad2(cn)} ${e.target.checked ? 'marcada como Trilha de Ausência (sem sinal)' : 'voltou a ter sinal'}`);
    agendarSincMestre(); marcarSalasMestre();
  };
  $$('.arq-lista-mestre li[data-fid]', c).forEach(li => {
    const fid = li.dataset.fid;
    $('[data-arq="abrir"]', li).onclick = () => Arquivos.abrirMestre(fid);
    $('[data-arq="rev"]', li).onclick = () => Arquivos.alternar(fid).then(() => { delete c.dataset.sala; desenharCartao(); });
    $('[data-arq="apagar"]', li).onclick = () => { if (confirm('Apagar este arquivo?')) Arquivos.apagar(fid).then(() => { delete c.dataset.sala; desenharCartao(); }); };
  });
  $('.arq-add', c).onclick = async () => {
    const t = $('.arq-titulo', c).value.trim();
    if (!t) { aviso('Dê um título ao arquivo.'); return; }
    const f = $('.arq-img', c).files[0];
    $('.arq-add', c).disabled = true;
    await Arquivos.criar(cn, t, $('.arq-texto-novo', c).value.trim(), f);
    delete c.dataset.sala; desenharCartao();
    const sec = $('.arq-sec', c); if (sec) sec.open = true;
  };
}

// selos das salas na tela do Mestre: anotação e sem sinal
function marcarSalasMestre() {
  $$('.sala', stage).forEach(e => {
    e.classList.toggle('com-nota', !!notaDe(+e.dataset.cn));
    e.classList.toggle('sem-sinal', semSinal(+e.dataset.cn));
    e.classList.toggle('com-gatilho', !!gatilhoDe(+e.dataset.cn));
  });
}

/* =========================================================
   PORTAS NOS CORREDORES
   ========================================================= */
const TIPOS_PORTA = { t: 'Trancada', d: 'Destruída (escombros)', c: 'Bloqueada por carne' };
const SINAL_PORTA = { t: '🔒', d: '⚠', c: '❦' };
const chavePorta = (a, ci) => 'a' + a + 'c' + ci;
const portaDe = (a, ci) => (Store.state.portas || {})[chavePorta(a, ci)] || null;
// faixa no meio do corredor onde fica a porta
function barreira(c) {
  return c.eixo === 'h' ? { x: c.x + c.w / 2 - 0.3, y: c.y, w: 0.6, h: c.h } : { x: c.x, y: c.y + c.h / 2 - 0.3, w: c.w, h: 0.6 };
}
function bloqueadoPorPorta(andar, x, y) {
  if (mestre) return false;   // o Mestre passa por qualquer porta
  for (let ci = 0; ci < CORREDORES.length; ci++) {
    if (portaDe(andar, ci) && dentro(barreira(CORREDORES[ci]), x, y)) return true;
  }
  return false;
}
function desenharPortas(paredes) {
  CORREDORES.forEach((c, ci) => {
    const t = portaDe(andarAtual, ci);
    if (!t) return;
    const b = barreira(c);
    const chao = el('div', 'porta-chao porta-' + t, { left: px(b.x), top: px(b.y), width: px(b.w), height: px(b.h) });
    chao.innerHTML = `<span>${SINAL_PORTA[t]}</span>`;
    stage.appendChild(chao);
    const xm = b.x + b.w / 2, ym = b.y + b.h / 2;
    const pw = c.eixo === 'h' ? parede(xm, c.y, xm, c.y + c.h) : parede(c.x, ym, c.x + c.w, ym);
    pw.classList.add('porta-parede', 'porta-' + t);
    paredes.push(pw);
  });
}
const corredorEm = (x, y) => CORREDORES.findIndex(c => dentro(c, x, y));
let corredorSel = null;
function selecionarCorredor(ci) {
  selecionar(null);
  corredorSel = ci;
  desenharCartao();
}
function desenharCartaoCorredor() {
  const c = $('#cartao');
  delete c.dataset.ficha;
  delete c.dataset.sala;
  const k = CORREDORES[corredorSel];
  const t = portaDe(andarAtual, corredorSel);
  const nomeC = `Corredor entre CN ${pad2(cnDe(andarAtual, k.p1))} e CN ${pad2(cnDe(andarAtual, k.p2))}`;
  c.style.setProperty('--cor', t === 'c' ? '#8a2f2f' : t === 'd' ? '#8a6a3a' : t === 't' ? '#7a8597' : '#8b5cf6');
  c.innerHTML = `<button class="fechar" aria-label="Fechar">×</button>
    <div class="cartao-topo"><div class="cartao-bola sala-bola"></div><div><h3>Corredor</h3><span class="cod">${nomeC}</span></div></div>
    <p>Porta: <strong>${t ? TIPOS_PORTA[t] : 'aberta'}</strong> · 14 m</p>
    ${mestre ? `<div class="acoes portas-acoes">
      <button data-porta="" class="${!t ? 'on' : ''}">Aberta</button>
      <button data-porta="t" class="${t === 't' ? 'on' : ''}">🔒 Trancada</button>
      <button data-porta="d" class="${t === 'd' ? 'on' : ''}">⚠ Destruída</button>
      <button data-porta="c" class="${t === 'c' ? 'on' : ''}">❦ Carne</button></div>` : ''}`;
  c.hidden = false;
  $('.fechar', c).onclick = () => selecionar(null);
  $$('[data-porta]', c).forEach(b => b.onclick = () => {
    Store.definir(['portas', chavePorta(andarAtual, corredorSel)], b.dataset.porta || null);
    montarAndar(); atualizarTudo();
  });
}

/* =========================================================
   AVISO "SUA VEZ" (perseguição)
   ========================================================= */
let vezAvisada = '';
function verificarSuaVez() {
  const p = P();
  const vez = vezAtual();
  const tk = vez && (Store.state.tokens || {})[vez];
  const minha = p.on && tk && !mestre && podeMover(tk);
  const chave = minha ? `${p.rod || 1}:${p.vez || 0}:${vez}` : '';
  if (!minha) { vezAvisada = ''; return; }
  if (chave === vezAvisada) return;
  vezAvisada = chave;
  $('#suaVezQuem').textContent = vez === meu ? `Rodada ${p.rod || 1}` : `${rotuloBase(tk)} · rodada ${p.rod || 1}`;
  const caixa = $('#suaVez');
  caixa.hidden = false;
  caixa.classList.remove('anima'); void caixa.offsetWidth; caixa.classList.add('anima');
  setTimeout(() => { caixa.hidden = true; }, 2600);
  try { navigator.vibrate && navigator.vibrate([250, 120, 250, 120, 400]); } catch (e) {}
  Som.tom(660, 0, 0.15, 'triangle', 0.12); Som.tom(990, 0.18, 0.25, 'triangle', 0.12);
}

/* =========================================================
   EXPOSIÇÃO (NEX)
   ========================================================= */
const ELEM_EXPO = ['S', 'M', 'C', 'E', 'F'];
function contarExposicao(id, tk, antes) {
  if (!mestre || !SER[tk.s] || SER[tk.s].tipo !== 'cobaia') return;
  const pB = salaEm(tk.a, tk.x, tk.y);
  if (!pB || pB === 25) return;
  const pA = salaEm(antes.a, antes.x, antes.y);
  if (pA === pB && antes.a === tk.a) return;
  const cn = cnDe(tk.a, pB);
  const el2 = infoSala(tk.a, cn)[1];
  if (!ELEM_EXPO.includes(el2)) return;
  const atual = ((Segredos.dados._expo || {})[tk.s] || {})[el2] || 0;
  Segredos.gravar(['_expo', tk.s, el2], atual + 1);
}
function desenharExpo() {
  if (!mestre) return;
  const ex = Segredos.dados._expo || {};
  const cob = SERES.filter(x => x.tipo === 'cobaia');
  $('#tabelaExpo').innerHTML = `<table><thead><tr><th></th>${ELEM_EXPO.map(k => `<th title="${ELEMENTOS[k].nome}"><span class="el-ponto" style="--cor:${ELEMENTOS[k].cor}"></span>${ELEMENTOS[k].nome.slice(0, 4)}</th>`).join('')}</tr></thead>
    <tbody>${cob.map(x => `<tr><td>${x.nome}</td>${ELEM_EXPO.map(k => `<td>${(ex[x.id] || {})[k] || ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
$('#btnZerarExpo').addEventListener('click', () => { if (confirm('Zerar a contagem de exposição de todas as cobaias?')) { Segredos.gravar(['_expo'], null); desenharExpo(); } });
$('#btnCopiarExpo').addEventListener('click', async () => {
  const ex = Segredos.dados._expo || {};
  const linhas = SERES.filter(x => x.tipo === 'cobaia').map(x => {
    const partes = ELEM_EXPO.filter(k => (ex[x.id] || {})[k]).map(k => `${ELEMENTOS[k].nome} ${ex[x.id][k]}x`);
    return `${x.nome}: ${partes.length ? partes.join(', ') : 'nenhuma'}`;
  });
  const txt = 'Exposição por elemento (visitas)\n' + linhas.join('\n');
  try { await navigator.clipboard.writeText(txt); aviso('Resumo copiado.'); } catch (e) { prompt('Copie o resumo:', txt); }
});

/* =========================================================
   ARQUIVOS NAS SALAS
   Mestre: segredos/_arquivos (texto) + arquivosPriv (imagem).
   Revelado: arquivos/lista (títulos) e arquivos/dados (conteúdo), públicos.
   ========================================================= */
const Arquivos = {
  lista: {}, off: null,
  ligar() { if (!this.off) this.off = Rede.on('arquivos/lista', v => { this.lista = v || {}; if (salaSel && !mestre) desenharCartao(); }); },
  daSala(cn) { return Object.entries(this.lista['c' + cn] || {}); },
  daSalaMestre(cn) { return Object.entries(Segredos.dados._arquivos || {}).filter(([, f]) => f && f.cn === cn).sort((x, y) => x[1].ts - y[1].ts); },
  async criar(cn, t, x, arquivo) {
    const fid = Rede.chave();
    let img = null;
    if (arquivo) {
      try { img = await imagemReduzida(arquivo); } catch (e) { aviso('Não consegui ler a imagem.'); }
    }
    if (img) await Rede.set('arquivosPriv/' + fid, img).catch(erroGravacao);
    Segredos.gravar(['_arquivos', fid], { cn, t, x: x || '', img: !!img, rev: false, ts: Date.now() });
    Diario.registrar('sala', `Arquivo criado na CN ${pad2(cn)}: "${t}" (oculto)`);
  },
  async alternar(fid) {
    const f = (Segredos.dados._arquivos || {})[fid];
    if (!f) return;
    if (f.rev) {
      await Rede.set('arquivos/lista/c' + f.cn + '/' + fid, null).catch(erroGravacao);
      await Rede.set('arquivos/dados/' + fid, null).catch(erroGravacao);
      Segredos.gravar(['_arquivos', fid, 'rev'], false);
      Diario.registrar('sala', `Arquivo escondido: "${f.t}" (CN ${pad2(f.cn)})`);
    } else {
      const img = f.img ? await Rede.once('arquivosPriv/' + fid) : null;
      const dados = { t: f.t, x: f.x || '' };
      if (img) dados.img = img;
      await Rede.set('arquivos/dados/' + fid, dados).catch(erroGravacao);
      await Rede.set('arquivos/lista/c' + f.cn + '/' + fid, f.t).catch(erroGravacao);
      Segredos.gravar(['_arquivos', fid, 'rev'], true);
      Diario.registrar('sala', `Arquivo revelado aos jogadores: "${f.t}" (CN ${pad2(f.cn)})`);
    }
  },
  async apagar(fid) {
    const f = (Segredos.dados._arquivos || {})[fid];
    if (f && f.rev) await this.alternar(fid);
    await Rede.set('arquivosPriv/' + fid, null).catch(() => {});
    Segredos.gravar(['_arquivos', fid], null);
  },
  async abrirMestre(fid) {
    const f = (Segredos.dados._arquivos || {})[fid];
    if (!f) return;
    const img = f.img ? await Rede.once('arquivosPriv/' + fid) : null;
    mostrarArquivo({ t: f.t, x: f.x, img });
  },
  async abrir(fid) {
    const d = await Rede.once('arquivos/dados/' + fid).catch(() => null);
    if (!d) { aviso('Este arquivo não está mais disponível.'); return; }
    mostrarArquivo(d);
  },
};
function mostrarArquivo(d) {
  $('#arqTitulo').textContent = d.t || 'Arquivo';
  const im = $('#arqImg');
  im.hidden = !d.img;
  if (d.img) im.src = d.img; else im.removeAttribute('src');
  $('#arqTexto').textContent = d.x || '';
  $('#dlgArquivo').showModal();
}
// reduz a foto para caber no banco gratuito (lado maior 1000 px, JPEG)
function imagemReduzida(arquivo, max = 1000) {
  return new Promise((ok, falha) => {
    const leitor = new FileReader();
    leitor.onerror = falha;
    leitor.onload = () => {
      const im = new Image();
      im.onerror = falha;
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        ok(cv.toDataURL('image/jpeg', 0.8));
      };
      im.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

/* =========================================================
   CHAT (Geral · Sussurro ao Mestre · Filhos)
   ========================================================= */
const Chat = {
  msgs: { geral: {}, sus: {}, filhos: {} },
  enviados: [],          // sussurros que este aparelho mandou (só ele guarda)
  respostas: {},         // respostas do Mestre para este aparelho
  offs: [], chaveLigada: '', canal: 'geral', aberto: false, visto: {}, resp: null,
  autorId() { return mestre ? '_mestre' : (meu || aux || ''); },
  autorNome() { return mestre ? 'Mestre' : (SER[meu || aux] ? SER[meu || aux].nome : 'Visitante'); },
  // código secreto deste aparelho para receber respostas do Mestre
  cx() {
    const k = 'acf-cx-' + (meu ? 'j:' + meu : aux ? 'a:' + aux : 'x');
    let v = null;
    try { v = localStorage.getItem(k); } catch (e) {}
    if (!v) { v = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''); try { localStorage.setItem(k, v); } catch (e) {} }
    return v;
  },
  canais() { return mestre ? ['geral', 'sus', 'filhos'] : aux ? ['geral', 'sus', 'filhos'] : meu ? ['geral', 'sus'] : []; },
  pronto() {
    if (TV) return false;
    if (Store.modo === 'firebase') return !!(Store.auth && Store.auth.currentUser) && (mestre || !!meu || !!aux);
    return mestre || !!meu || !!aux;
  },
  ligar() {
    const chave = this.pronto() ? `${mestre ? 'M' : aux ? 'A:' + aux : 'J:' + meu}` : '';
    $('#btnChat').hidden = !chave;
    if (chave === this.chaveLigada) return;
    this.offs.forEach(f => f()); this.offs = [];
    this.msgs = { geral: {}, sus: {}, filhos: {} }; this.respostas = {}; this.visto = {}; this.resp = null;
    this.chaveLigada = chave;
    if (!chave) { this.fechar(); return; }
    this.carregarEnviados();
    const agora = Date.now();
    this.canais().forEach(c => { this.visto[c] = agora; });
    this.offs.push(Rede.on('chat/geral', v => { this.msgs.geral = v || {}; this.atualizar(); }, () => {}));
    if (mestre) {
      this.offs.push(Rede.on('chat/sussurros', v => { this.msgs.sus = v || {}; this.atualizar(); }, () => {}));
    } else {
      this.offs.push(Rede.on('chat/respostas/' + this.cx(), v => { this.respostas = v || {}; this.atualizar(); }, () => {}));
    }
    if (mestre || aux) this.offs.push(Rede.on('chat/filhos', v => { this.msgs.filhos = v || {}; this.atualizar(); }, () => {}));
    this.offs.push(Rede.on('chat/limpo', ts => {
      if (!ts) return;
      const antes = this.enviados.length;
      this.enviados = this.enviados.filter(m => m.ts > ts);
      if (this.enviados.length !== antes) this.salvarEnviados();
      this.atualizar();
    }, () => {}));
    this.atualizar();
  },
  chaveEnviados() { return 'acf-sus-' + this.cx(); },
  carregarEnviados() { try { this.enviados = JSON.parse(localStorage.getItem(this.chaveEnviados()) || '[]'); } catch (e) { this.enviados = []; } },
  salvarEnviados() { try { localStorage.setItem(this.chaveEnviados(), JSON.stringify(this.enviados.slice(-200))); } catch (e) {} },
  // mensagens de um canal, em ordem
  lista(c) {
    let l;
    if (c === 'sus' && !mestre) l = this.enviados.concat(Object.values(this.respostas || {}));
    else l = Object.values(this.msgs[c] || {});
    return l.filter(m => m && m.ts).sort((x, y) => x.ts - y.ts).slice(-250);
  },
  naoLidas(c) {
    const eu = this.autorId();
    return this.lista(c).filter(m => m.ts > (this.visto[c] || 0) && m.a !== eu).length;
  },
  atualizar() {
    if (!this.chaveLigada) return;
    const canais = this.canais();
    $$('#chatAbas button').forEach(b => {
      const c = b.dataset.canal;
      b.hidden = !canais.includes(c);
      b.classList.toggle('ativo', c === this.canal);
      if (c === 'sus') b.firstChild.textContent = mestre ? 'Sussurros' : 'Sussurro ao Mestre';
      const n = this.aberto && c === this.canal ? 0 : this.naoLidas(c);
      const s = $('.n', b); s.hidden = !n; s.textContent = n;
    });
    document.body.classList.toggle('chat-aberto', this.aberto && !$('#painelChat').hidden);
    if (this.aberto) this.visto[this.canal] = Date.now();
    const total = canais.reduce((t, c) => t + (this.aberto && c === this.canal ? 0 : this.naoLidas(c)), 0);
    $('#chatBadge').hidden = !total; $('#chatBadge').textContent = total;
    $('#btnApagarChat').hidden = !mestre;
    if (this.aberto) this.desenhar();
  },
  desenhar() {
    const c = this.canal;
    const dicas = {
      geral: 'Todos leem: jogadores, auxiliares e o Mestre.',
      sus: mestre ? 'Mensagens privadas que os jogadores e auxiliares mandaram a você. Toque em "responder".' : 'Só o Mestre lê o que você mandar aqui. As respostas dele aparecem só para você.',
      filhos: 'Só o Mestre e os auxiliares leem este canal.',
    };
    $('#chatDica').textContent = dicas[c];
    const lista = $('#chatLista');
    const noFim = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 40;
    const eu = this.autorId();
    lista.innerHTML = this.lista(c).map(m => {
      const s = SER[m.a];
      const avatar = s ? `<span class="bola" style="--cor:${s.cor};${s.img ? `background-image:url('${s.img}')` : ''}"></span>` : '<span class="bola mestre-bola">M</span>';
      const para = mestre && c === 'sus' && m.para ? ` <small>→ ${esc(this.nomeDoCx(m.para))}</small>` : '';
      const btn = mestre && c === 'sus' && m.cx && m.a !== '_mestre' ? `<button class="responder" data-cx="${esc(m.cx)}" data-nome="${esc(m.n || '')}">responder</button>` : '';
      return `<li class="${m.a === eu ? 'meu' : ''}${m.d ? ' dado' : ''}">${avatar}<div class="msg">
        <div class="msg-topo"><b>${esc(m.n || '?')}</b>${para}<time>${hora(m.ts).slice(0, 5)}</time>${btn}</div>
        <div class="msg-txt">${esc(m.t)}</div></div></li>`;
    }).join('') || '<li class="vazio">Nenhuma mensagem ainda.</li>';
    $$('.responder', lista).forEach(b => b.onclick = () => { this.resp = { cx: b.dataset.cx, nome: b.dataset.nome }; this.mostrarResp(); $('#chatTexto').focus(); });
    if (noFim || this.rolarFim) { lista.scrollTop = lista.scrollHeight; this.rolarFim = false; }
    this.mostrarResp();
  },
  nomeDoCx(cx) {
    const m = Object.values(this.msgs.sus || {}).find(x => x.cx === cx && x.a !== '_mestre');
    return m ? m.n : 'jogador';
  },
  mostrarResp() {
    const on = mestre && this.canal === 'sus' && this.resp;
    $('#chatResp').hidden = !on;
    if (on) $('#chatRespNome').textContent = this.resp.nome;
  },
  abrir(c) {
    this.aberto = true;
    if (c) this.canal = c;
    if (!this.canais().includes(this.canal)) this.canal = 'geral';
    $('#painelChat').hidden = false;
    document.body.classList.add('chat-aberto');
    this.rolarFim = true;
    this.atualizar();
  },
  fechar() { this.aberto = false; $('#painelChat').hidden = true; document.body.classList.remove('chat-aberto'); this.atualizar(); },
  // envia para um canal; d marca rolagem de dado
  enviar(texto, canal = this.canal, d = false) {
    texto = String(texto || '').trim().slice(0, 500);
    if (!texto || !this.chaveLigada) return;
    const m = { a: this.autorId(), n: this.autorNome(), t: texto, ts: Date.now() };
    if (d) m.d = true;
    if (canal === 'geral') Rede.push('chat/geral', m).pronto.catch(erroGravacao);
    else if (canal === 'filhos') Rede.push('chat/filhos', m).pronto.catch(erroGravacao);
    else if (canal === 'sus') {
      if (mestre) {
        if (!this.resp) { aviso('Toque em "responder" numa mensagem para escolher a quem responder.'); return false; }
        const r = { ...m, para: this.resp.cx };
        Rede.push('chat/respostas/' + this.resp.cx, m).pronto.catch(erroGravacao);
        Rede.push('chat/sussurros', r).pronto.catch(erroGravacao);
      } else {
        const r = { ...m, cx: this.cx() };
        Rede.push('chat/sussurros', r).pronto.catch(erroGravacao);
        this.enviados.push(r); this.salvarEnviados();
        this.atualizar();
      }
    }
    return true;
  },
};
$('#btnChat').addEventListener('click', () => (Chat.aberto ? Chat.fechar() : Chat.abrir()));
$('#btnFecharChat').addEventListener('click', () => Chat.fechar());
$$('#chatAbas button').forEach(b => b.addEventListener('click', () => { Chat.canal = b.dataset.canal; Chat.rolarFim = true; Chat.atualizar(); }));
$('#chatForm').addEventListener('submit', e => {
  e.preventDefault();
  const inp = $('#chatTexto');
  if (Chat.enviar(inp.value) !== false) inp.value = '';
});
$('#btnCancelarResp').addEventListener('click', () => { Chat.resp = null; Chat.mostrarResp(); });
$('#btnApagarChat').addEventListener('click', () => {
  if (!confirm('Apagar TODO o chat (Geral, Sussurros e Filhos) para todo mundo?')) return;
  Rede.set('chat', { limpo: Date.now() }).catch(erroGravacao);
  Diario.registrar('sessao', 'Chat apagado pelo Mestre');
});

/* ---------- Rolagens no chat ---------- */
const rolagensAbertas = () => !(Store.state.cfg || {}).rolSecreta;
$('#chkRolAberta').addEventListener('change', e => Store.definir(['cfg', 'rolSecreta'], e.target.checked ? null : true));
function postarRolagem(texto) {
  if (mestre || !Chat.chaveLigada) return;
  const canal = aux ? 'filhos' : rolagensAbertas() ? 'geral' : 'sus';
  Chat.enviar('🎲 ' + texto, canal, true);
}

/* =========================================================
   SINAL NO MAPA ("quero ir para cá")
   Jogador ou auxiliar segura o dedo (ou o botão do mouse) num ponto;
   só o Mestre vê o sinal piscando.
   ========================================================= */
let toqueLongo = null;
function iniciarToqueLongo(e) {
  clearTimeout(toqueLongo && toqueLongo.t);
  if (mestre || TV || !(meu || aux) || !podeVer(andarAtual)) { toqueLongo = null; return; }
  const x0 = e.clientX, y0 = e.clientY;
  toqueLongo = { x0, y0, t: setTimeout(() => {
    const pt = telaParaPiso(x0, y0);
    if (!andavel(andarAtual, pt.x, pt.y)) return;
    if (gesto) gesto.andou = true;
    const de = meu || aux;
    const sinal = { a: andarAtual, x: +pt.x.toFixed(2), y: +pt.y.toFixed(2), ts: Date.now(), de, n: SER[de] ? SER[de].nome : '?' };
    if (aux) {
      const r = Rede.push('sinaisFilhos', sinal);
      r.pronto.catch(erroGravacao);
      setTimeout(() => Rede.set('sinaisFilhos/' + r.key, null).catch(() => {}), 12000);
      aviso('Sinal enviado aos Filhos e ao Mestre.');
    } else {
      Rede.push('sinais', sinal).pronto.catch(erroGravacao);
      mostrarSinal(pt.x, pt.y, 'enviado', '');
      aviso('Sinal enviado ao Mestre.');
    }
    try { navigator.vibrate && navigator.vibrate(60); } catch (err) {}
  }, 650) };
}
function cancelarToqueLongo(e) {
  if (!toqueLongo) return;
  if (!e || e.type !== 'pointermove' || Math.hypot(e.clientX - toqueLongo.x0, e.clientY - toqueLongo.y0) > 8) { clearTimeout(toqueLongo.t); toqueLongo = null; }
}
viewport.addEventListener('pointerdown', e => { if (!e.target.closest('.ficha') && e.isPrimary) iniciarToqueLongo(e); });
viewport.addEventListener('pointermove', cancelarToqueLongo);
viewport.addEventListener('pointerup', () => cancelarToqueLongo());
viewport.addEventListener('pointercancel', () => cancelarToqueLongo());
function mostrarSinal(x, y, cls, rotulo) {
  const d = el('div', 'sinal-ponto ' + cls, { left: px(x), top: px(y) });
  d.innerHTML = `<span class="sinal-anel"></span>${rotulo ? `<span class="sinal-nome">${esc(rotulo)}</span>` : ''}`;
  stage.appendChild(d);
  setTimeout(() => d.remove(), cls === 'enviado' ? 2500 : 10000);
}
// Mestre: recebe os sinais
const sinaisVistos = new Set();
let sinaisOff = null;
function ligarSinais() {
  if (mestre && !sinaisOff) {
    sinaisOff = Rede.on('sinais', v => {
      Object.entries(v || {}).forEach(([k, s]) => {
        if (sinaisVistos.has(k)) return;
        sinaisVistos.add(k);
        if (!s || Date.now() - s.ts > 120000) { Rede.set('sinais/' + k, null).catch(() => {}); return; }
        if (s.a === andarAtual) mostrarSinal(s.x, s.y, 'recebido', s.n);
        const p = salaEm(s.a, s.x, s.y);
        const onde = p ? 'CN ' + pad2(cnDe(s.a, p)) : lugarDe(s);
        aviso(`${s.n} marcou um ponto: ${onde}${s.a !== andarAtual ? ' (' + nomeAndar(s.a) + ')' : ''}`);
        Som.tom(880, 0, 0.12, 'sine', 0.1);
        Diario.registrar('mov', `${s.n} marcou um ponto no mapa: ${onde}`, { quem: s.de });
        setTimeout(() => Rede.set('sinais/' + k, null).catch(() => {}), 11000);
      });
    }, () => {});
  }
  if (!mestre && sinaisOff) { sinaisOff(); sinaisOff = null; }
  // sinais dos auxiliares: Mestre e auxiliares veem
  const querFilhos = (mestre || (aux && (Store.modo !== 'firebase' || auxLogado))) && !TV;
  if (querFilhos && !sinaisFilhosOff) {
    sinaisFilhosOff = Rede.on('sinaisFilhos', v => {
      Object.entries(v || {}).forEach(([k, s]) => {
        if (sinaisFilhosVistos.has(k) || !s || Date.now() - s.ts > 60000) { sinaisFilhosVistos.add(k); return; }
        sinaisFilhosVistos.add(k);
        if (s.a === andarAtual) mostrarSinal(s.x, s.y, 'filhos', s.n);
        const p = salaEm(s.a, s.x, s.y);
        aviso(`${s.n} marcou um ponto para os Filhos: ${p ? 'CN ' + pad2(cnDe(s.a, p)) : lugarDe(s)}`);
        Som.tom(523, 0, 0.12, 'sine', 0.08);
      });
    }, () => {});
  }
  if (!querFilhos && sinaisFilhosOff) { sinaisFilhosOff(); sinaisFilhosOff = null; }
}
let sinaisFilhosOff = null;
const sinaisFilhosVistos = new Set();

/* =========================================================
   RELÓGIO DA CAIXA
   ========================================================= */
const fmtHora = m => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
let meiaNoiteVista = null;
function desenharRelogio() {
  const r = Store.state.relogio;
  const tem = r && typeof r.m === 'number';
  $('#relogio').hidden = !tem;
  if (tem) $('#relogioHora').textContent = fmtHora(r.m);
  if (mestre) $('#relogioMestre').textContent = tem ? fmtHora(r.m) : '--:--';
  // virada da meia-noite: aviso para todos
  const z = tem ? r.z || 0 : 0;
  if (meiaNoiteVista === null) { meiaNoiteVista = z; return; }
  if (z && z !== meiaNoiteVista) {
    meiaNoiteVista = z;
    if (Date.now() - z < 60000) {
      const f = $('#faixaMeiaNoite');
      f.hidden = false; piscar(); Som.tom(220, 0, 0.6, 'sawtooth', 0.1, 110);
      setTimeout(() => { f.hidden = true; }, 7000);
    }
  }
}
function avancarRelogio(delta) {
  const r = Store.state.relogio || { m: 0 };
  const antes = typeof r.m === 'number' ? r.m : 0;
  let total = antes + delta;
  const virou = total >= 1440;
  total = ((total % 1440) + 1440) % 1440;
  const novo = { m: total };
  if (virou) novo.z = Date.now(); else if (r.z) novo.z = r.z;
  Store.definir(['relogio'], novo);
  if (virou) {
    Diario.registrar('ruido', '00:00 · os robôs S.T.A.F.F. desligam');
    if (Segredos.dados._apagao00 && !apagaoAtivo()) publicarApagao(true);
    setTimeout(() => { $('#btnQuebraZerar').click(); }, 400);
  }
}
$$('.relogio-botoes button').forEach(b => b.addEventListener('click', () => avancarRelogio(+b.dataset.min)));
$('#btnDefinirHora').addEventListener('click', () => {
  const r = Store.state.relogio;
  const v = prompt('Que horas são na Caixa? (HH:MM)', r && typeof r.m === 'number' ? fmtHora(r.m) : '20:00');
  const m = /^(\d{1,2}):(\d{2})$/.exec((v || '').trim());
  if (!m || +m[1] > 23 || +m[2] > 59) { if (v) aviso('Use o formato HH:MM, por exemplo 23:40.'); return; }
  Store.definir(['relogio'], { m: +m[1] * 60 + +m[2], ...(r && r.z ? { z: r.z } : {}) });
  Diario.registrar('ruido', `Relógio da Caixa ajustado para ${v.trim()}`);
});
$('#btnEsconderRelogio').addEventListener('click', () => Store.definir(['relogio'], null));
$('#chkApagao00').addEventListener('change', e => Segredos.gravar(['_apagao00'], e.target.checked ? true : null));

/* =========================================================
   FICHA RESUMIDA (PV, SAN, PE, NEX)
   O Mestre edita; o jogador vê a da própria cobaia.
   ========================================================= */
const CAMPOS_FICHA = [['pv', 'PV'], ['san', 'SAN'], ['pe', 'PE']];
const fichaDe = id => (Store.state.fichas || {})[id] || null;
function barrasFicha(f) {
  if (!f) return '<p class="vazio">O Mestre ainda não preencheu.</p>';
  return CAMPOS_FICHA.map(([k, r]) => {
    const v = f[k], m = f[k + 'm'];
    if (v === undefined && m === undefined) return '';
    const pct = m ? Math.max(0, Math.min(100, (v || 0) / m * 100)) : 0;
    return `<div class="barra barra-${k}"><span class="barra-r">${r}</span><div class="barra-trilho"><div class="barra-cheia" style="width:${pct}%"></div></div><b>${v ?? '?'}${m ? '/' + m : ''}</b></div>`;
  }).join('') + (f.nex !== undefined ? `<div class="barra barra-nex"><span class="barra-r">NEX</span><b>${f.nex}%</b></div>` : '')
    + (f.sM !== undefined || f.sm !== undefined ? `<div class="barra barra-nex"><span class="barra-r">Sucatas</span><b>${f.sM || 0} maiores · ${f.sm || 0} menores</b></div>` : '');
}
function htmlEditarFicha(id) {
  const f = fichaDe(id) || {};
  const inp = (k, ph) => `<input type="number" data-f="${k}" value="${f[k] ?? ''}" placeholder="${ph}">`;
  return `<details class="cartao-sec"><summary>Ficha resumida (o jogador vê)</summary>
    <div class="ficha-edit">${CAMPOS_FICHA.map(([k, r]) => `<label>${r}${inp(k, 'atual')}<span>/</span>${inp(k + 'm', 'máx')}</label>`).join('')}
    <label>NEX %${inp('nex', '%')}</label>
    <label>Sucatas${inp('sM', 'maiores')}<span>·</span>${inp('sm', 'menores')}</label></div></details>`;
}
function ligarEditarFicha(c, id) {
  $$('.ficha-edit input', c).forEach(i => i.onchange = () => {
    const f = { ...(fichaDe(id) || {}) };
    const v = i.value === '' ? null : Math.round(+i.value);
    if (v === null) delete f[i.dataset.f]; else f[i.dataset.f] = v;
    Store.definir(['fichas', id], Object.keys(f).length ? f : null);
  });
}
function desenharMinhaFicha() {
  const bloco = $('#blocoMinha');
  bloco.hidden = !meu || mestre || TV;
  if (bloco.hidden) return;
  const s = SER[meu];
  $('#minhaFicha').innerHTML = `<div class="minha-topo">${bola(s)}<div><strong>${s.nome}</strong><span class="sub">${s.jogador || ''}</span></div></div>${barrasFicha(fichaDe(meu))}`;
}

/* =========================================================
   TELA DA MESA (modo TV): ?tv=1
   Só o mapa, com a visão dos jogadores; segue o andar onde estão as cobaias.
   ========================================================= */
function seguirAndarTV() {
  if (!TV) return;
  const cont = {};
  Object.values(Store.state.tokens || {}).forEach(tk => {
    if (SER[tk.s] && SER[tk.s].tipo === 'cobaia' && visivelPara(tk) && podeVer(tk.a)) cont[tk.a] = (cont[tk.a] || 0) + 1;
  });
  const melhor = Object.entries(cont).sort((x, y) => y[1] - x[1])[0];
  if (melhor && +melhor[0] !== andarAtual) irParaAndar(+melhor[0]);
}
$('#btnTV').addEventListener('click', () => window.open(location.pathname + '?tv=1', '_blank'));

/* ---------- Painel do Mestre: subtítulo, importação, opções ---------- */
function desenharOpcoesMestre() {
  if (!mestre) return;
  const sub = $('#subAndar');
  if (document.activeElement !== sub) sub.value = (Priv.dados.andares || {})['a' + andarAtual] || ANDARES[andarAtual - 1].subtitulo || '';
  $('#chkRolAberta').checked = rolagensAbertas();
  $('#chkApagao00').checked = !!Segredos.dados._apagao00;
}
$('#subAndar').addEventListener('change', e => { Priv.gravar(['andares', 'a' + andarAtual], e.target.value.trim() || null); agendarSincMestre(); montarAndar(); });
$('#btnImportarSalas').addEventListener('click', () => { $('#arqSalas').value = ''; $('#arqSalas').click(); });
$('#arqSalas').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  let d;
  try { d = JSON.parse(await f.text()); } catch (err) { alert('Arquivo inválido.'); return; }
  if (!d || d.tipo !== 'planta-acf-salas') { alert('Este arquivo não é uma lista de salas da Planta da Caixa.'); return; }
  const n = Object.keys(d.salas || {}).length;
  if (!confirm(`Importar ${n} salas, os elevadores e os subtítulos? Os nomes atuais dessas salas serão substituídos.`)) return;
  Object.entries(d.salas || {}).forEach(([k, v]) => Priv.gravar(['salas', k], v));
  Object.entries(d.saidas || {}).forEach(([k, v]) => Priv.gravar(['saidas', k], v));
  Object.entries(d.andares || {}).forEach(([k, v]) => Priv.gravar(['andares', k], v));
  Diario.registrar('sessao', `Salas importadas (${n})`);
  agendarSincMestre(); montarAndar(); atualizarTudo();
  aviso(`${n} salas importadas.`);
});

/* =========================================================
   VISÃO ATIVA: o Mestre pode "ver pelos olhos" de um jogador ou auxiliar.
   ========================================================= */
let espiar = null;   // { t: 'j' | 'a', id }
function V() { return espiar ? { mestre: false, meu: espiar.t === 'j' ? espiar.id : null, aux: espiar.t === 'a' ? espiar.id : null } : { mestre, meu, aux }; }
const isentoDe = id => espiar ? !!(Segredos.dados._apagaoVe || {})[id] : apagaoIsento;
const cegoDe = id => !!(id && (Store.state.cego || {})[id]);
function preencherEspiar() {
  const sel = $('#selEspiar');
  if (sel.options.length > 1) return;
  SERES.filter(s => s.tipo === 'cobaia' || s.tipo === 'robo').forEach(s => {
    const o = document.createElement('option');
    o.value = (s.tipo === 'cobaia' ? 'j:' : 'a:') + s.id;
    o.textContent = `${s.nome} (${s.tipo === 'cobaia' ? 'jogador' : 'auxiliar'} · ${s.jogador || ''})`;
    sel.appendChild(o);
  });
}
function definirEspiar(v) {
  espiar = v ? { t: v.slice(0, 1), id: v.slice(2) } : null;
  $('#selEspiar').value = v || '';
  $('#faixaEspiar').hidden = !espiar;
  if (espiar) $('#espiarNome').textContent = SER[espiar.id].nome;
  document.body.classList.toggle('espiando', !!espiar);
  selecionar(null);
  montarAndar();
  atualizarTudo();
}
$('#selEspiar').addEventListener('change', e => definirEspiar(e.target.value));
$('#btnSairEspiar').addEventListener('click', () => definirEspiar(''));

/* =========================================================
   ABAS DO PAINEL DO MESTRE
   ========================================================= */
let abaMestre = 'mapa';
try { abaMestre = localStorage.getItem('acf-aba') || 'mapa'; } catch (e) {}
function aplicarAbas() {
  $$('#abasMestre button').forEach(b => b.classList.toggle('ativo', b.dataset.aba === abaMestre));
  $$('.painel section[data-aba]').forEach(s => s.classList.toggle('fora-da-aba', mestre && s.dataset.aba !== abaMestre));
}
$$('#abasMestre button').forEach(b => b.addEventListener('click', () => {
  abaMestre = b.dataset.aba;
  try { localStorage.setItem('acf-aba', abaMestre); } catch (e) {}
  aplicarAbas();
  $('#painel').scrollTop = 0;
}));

/* =========================================================
   ALERTAS DO MESTRE (gatilhos e avisos importantes)
   ========================================================= */
function alertaMestre(txt) {
  const d = el('div', 'alerta-mestre');
  d.innerHTML = `<span>${esc(txt)}</span><button aria-label="Fechar">×</button>`;
  $('button', d).onclick = () => d.remove();
  $('#alertasMestre').prepend(d);
  setTimeout(() => d.remove(), 25000);
  Som.tom(740, 0, 0.18, 'square', 0.1); Som.tom(988, 0.2, 0.25, 'square', 0.1);
}

/* ---------- Gatilhos nas salas ---------- */
const gatilhoDe = cn => (mestre && (Segredos.dados._gatilhos || {})['c' + cn]) || '';
const gatilhosVistos = {};
function verificarGatilho(id, a, b) {
  if (!mestre || !SER[b.s] || SER[b.s].tipo !== 'cobaia') return;
  const pB = salaEm(b.a, b.x, b.y);
  if (!pB) return;
  const pA = a ? salaEm(a.a, a.x, a.y) : null;
  if (a && pA === pB && a.a === b.a) return;
  const cn = cnDe(b.a, pB);
  const g = gatilhoDe(cn);
  if (!g) return;
  const k = id + ':' + cn;
  if (gatilhosVistos[k] && Date.now() - gatilhosVistos[k] < 20000) return;
  gatilhosVistos[k] = Date.now();
  alertaMestre(`${SER[b.s].nome} entrou na CN ${pad2(cn)}: ${g}`);
  Diario.registrar('sala', `Gatilho da CN ${pad2(cn)} disparado por ${SER[b.s].nome}: ${g}`);
}

/* =========================================================
   CENAS PRONTAS
   ========================================================= */
function desenharCenas() {
  if (!mestre) return;
  const cenas = Object.entries(Segredos.dados._cenas || {}).sort((x, y) => x[1].ts - y[1].ts);
  $('#listaCenas').innerHTML = cenas.map(([k, c]) => `<li data-k="${k}"><span><b>${esc(c.nome)}</b><small>${nomeAndar(c.andar)} · ${Object.keys(c.tokens || {}).length} fichas · ${Object.keys(c.portas || {}).length} portas</small></span>
    <button data-c="carregar" class="btn-fantasma">Carregar</button><button data-c="apagar" class="btn-fantasma perigo">×</button></li>`).join('') || '<li class="vazio">Nenhuma cena salva.</li>';
  $$('#listaCenas li[data-k]').forEach(li => {
    $('[data-c="carregar"]', li).onclick = () => carregarCena(li.dataset.k);
    $('[data-c="apagar"]', li).onclick = () => { if (confirm('Apagar esta cena?')) { Segredos.gravar(['_cenas', li.dataset.k], null); desenharCenas(); } };
  });
}
$('#btnSalvarCena').addEventListener('click', () => {
  const nome = $('#cenaNome').value.trim();
  if (!nome) { aviso('Dê um nome à cena.'); return; }
  const tokens = {}, portas = {};
  Object.entries(Store.state.tokens || {}).forEach(([id, tk]) => {
    if (SER[tk.s] && tk.a === andarAtual && (SER[tk.s].tipo === 'filho' || SER[tk.s].tipo === 'npc')) tokens[id] = { s: tk.s, a: tk.a, x: tk.x, y: tk.y, n: tk.n || 1 };
  });
  Object.entries(Store.state.portas || {}).forEach(([k, v]) => { if (k.startsWith('a' + andarAtual + 'c')) portas[k] = v; });
  Segredos.gravar(['_cenas', Rede.chave()], { nome, andar: andarAtual, ts: Date.now(), tokens, portas });
  $('#cenaNome').value = '';
  aviso(`Cena "${nome}" salva.`);
  desenharCenas();
});
function carregarCena(k) {
  const c = (Segredos.dados._cenas || {})[k];
  if (!c) return;
  if (!confirm(`Carregar "${c.nome}"? Os Filhos e NPCs do ${nomeAndar(c.andar)} saem e entram os da cena, ocultos. As portas do andar voltam como na cena.`)) return;
  Object.entries(Store.state.tokens || {}).forEach(([id, tk]) => {
    if (SER[tk.s] && tk.a === c.andar && (SER[tk.s].tipo === 'filho' || SER[tk.s].tipo === 'npc') && !(c.tokens || {})[id]) Store.definir(['tokens', id], null);
  });
  Object.entries(c.tokens || {}).forEach(([id, tk]) => Store.definir(['tokens', id], { ...tk, h: true, vf: false }));
  Object.keys(Store.state.portas || {}).forEach(pk => { if (pk.startsWith('a' + c.andar + 'c') && !(c.portas || {})[pk]) Store.definir(['portas', pk], null); });
  Object.entries(c.portas || {}).forEach(([pk, v]) => Store.definir(['portas', pk], v));
  Diario.registrar('sessao', `Cena carregada: ${c.nome}`);
  irParaAndar(c.andar);
  montarAndar(); atualizarTudo();
}

/* =========================================================
   MOVER EM GRUPO (Mestre)
   ========================================================= */
const grupo = new Set();
function alternarGrupo(id) {
  if (grupo.has(id)) grupo.delete(id); else grupo.add(id);
  desenharGrupo();
}
function desenharGrupo() {
  $$('.ficha').forEach(f => f.classList.toggle('no-grupo', grupo.has(f.dataset.id)));
  const info = $('#grupoInfo');
  info.hidden = !grupo.size;
  info.textContent = grupo.size ? `${grupo.size} ficha${grupo.size > 1 ? 's' : ''} no grupo: ${[...grupo].map(nomeDoId).join(', ')} · Esc limpa` : '';
}
window.addEventListener('keydown', e => { if (e.key === 'Escape' && grupo.size && !e.target.matches('input, textarea, select')) { grupo.clear(); desenharGrupo(); } });
function grupoInicio(id) {
  if (!mestre || !grupo.has(id) || grupo.size < 2) return null;
  const lead = Store.state.tokens[id];
  return [...grupo].filter(g => g !== id && Store.state.tokens[g] && Store.state.tokens[g].a === lead.a)
    .map(g => ({ id: g, x0: Store.state.tokens[g].x, y0: Store.state.tokens[g].y, x: Store.state.tokens[g].x, y: Store.state.tokens[g].y }));
}
function grupoPasso(outros, lead, antes) {
  const dx = lead.x - antes.x, dy = lead.y - antes.y;
  outros.forEach(o => {
    const alvo = { x: clamp(o.x0 + dx, 0.3, W - 0.3), y: clamp(o.y0 + dy, 0.3, H - 0.3) };
    if (caminhoLivre(lead.a, { x: o.x, y: o.y }, alvo)) { o.x = +alvo.x.toFixed(2); o.y = +alvo.y.toFixed(2); }
    const f = fichasDom.get(o.id);
    if (f) { f.style.left = px(o.x); f.style.top = px(o.y); }
  });
}
function grupoFim(outros) {
  outros.forEach(o => { const tk = Store.state.tokens[o.id]; if (tk && (o.x !== tk.x || o.y !== tk.y)) Store.definir(['tokens', o.id], { ...tk, x: o.x, y: o.y }); });
}
// arruma fichas numa sala (fileiras de 4 no rodapé)
function levarParaSala(ids, a, p) {
  const r = retSala(p);
  ids.forEach((id, i) => {
    const tk = Store.state.tokens[id];
    if (!tk) return;
    const fila = Math.floor(i / 4), col = i % 4, nessa = Math.min(4, ids.length - fila * 4);
    Store.definir(['tokens', id], { ...tk, a, x: +(r.x + R * (col + 0.5) / nessa).toFixed(2), y: +(r.y + R - 0.75 - fila * 1.1).toFixed(2) });
  });
  if (a !== andarAtual) irParaAndar(a);
}

/* =========================================================
   PRÉVIA DO CAMINHO (linha tracejada e metros enquanto arrasta)
   ========================================================= */
const SVGNS = 'http://www.w3.org/2000/svg';
let previa = null;
function previaInicio(tk) {
  previaFim(true);
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'previa-svg');
  svg.setAttribute('width', W * T); svg.setAttribute('height', H * T);
  svg.style.width = px(W); svg.style.height = px(H);
  const linha = document.createElementNS(SVGNS, 'polyline');
  linha.setAttribute('class', 'previa-linha');
  svg.appendChild(linha);
  const rot = el('div', 'previa-rotulo');
  rot.innerHTML = '<span></span>';
  // a trilha tem a cor da ficha que está andando
  const cor = (SER[tk.s] || {}).cor;
  if (cor) { svg.style.setProperty('--cor-trilha', cor); rot.style.setProperty('--cor-trilha', cor); }
  stage.appendChild(svg); stage.appendChild(rot);
  previa = { svg, linha, rot, pts: [{ x: tk.x, y: tk.y }], total: 0 };
}
function previaPasso(tk, lim) {
  if (!previa) return;
  const ult = previa.pts[previa.pts.length - 1];
  if (Math.hypot(tk.x - ult.x, tk.y - ult.y) > 0.05) {
    previa.total += custoMetros(ult, tk);
    previa.pts.push({ x: tk.x, y: tk.y });
  }
  previa.linha.setAttribute('points', previa.pts.map(q => `${q.x * T},${q.y * T}`).join(' '));
  previa.rot.style.left = px(tk.x); previa.rot.style.top = px(tk.y);
  const usado = lim ? (tk.m || 0) : previa.total;
  $('span', previa.rot).textContent = lim ? `${fmtM(usado)} de ${lim} m` : `${fmtM(usado)} m`;
  previa.rot.classList.toggle('no-limite', !!lim && usado >= lim - 0.05);
}
function previaFim(ja) {
  if (!previa) return;
  const p = previa; previa = null;
  if (ja) { p.svg.remove(); p.rot.remove(); return; }
  p.svg.classList.add('some'); p.rot.classList.add('some');
  setTimeout(() => { p.svg.remove(); p.rot.remove(); }, 1400);
}

/* =========================================================
   RESUMO DA SESSÃO (página para imprimir ou salvar em PDF)
   ========================================================= */
$('#btnResumo').addEventListener('click', () => {
  const todas = Diario.entradas();
  let ini = 0;
  todas.forEach((e, i) => { if (e.k === 'sessao' && /^Nova sessão/.test(e.txt)) ini = i; });
  const ent = todas.slice(ini);
  const r = ruido(), b = balanca();
  const ex = Segredos.dados._expo || {};
  const rel = Store.state.relogio;
  const linhaD = e => e.k === 'sessao' ? `<tr class="sep"><td colspan="3">${esc(e.txt)}</td></tr>` : `<tr><td>${hora(e.ts)}</td><td>${ROTULO_K[e.k] || ''}</td><td>${esc(e.txt)}</td></tr>`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Resumo da sessão · A Caixa de Fósforos</title>
<style>body{background:#0b0910;color:#ece6f7;font:14px/1.5 Georgia,serif;margin:28px}h1{font:700 26px Georgia;letter-spacing:.06em;margin:0}h2{color:#c4a8ff;font:700 15px Georgia;letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid #3b2366;padding-bottom:4px;margin-top:26px}
small{color:#9c90b3;font-family:monospace}table{width:100%;border-collapse:collapse}td,th{padding:4px 6px;border-bottom:1px solid #221b2e;text-align:left;vertical-align:top}td:first-child{white-space:nowrap;font-family:monospace;color:#9c90b3}
tr.sep td{color:#fff;background:#3b2366;font-family:monospace;text-align:center}.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}.card{border:1px solid #3b2366;border-radius:8px;padding:10px}.card b{font-size:20px;display:block}
button{background:#8b5cf6;color:#fff;border:0;border-radius:6px;padding:8px 14px;font:inherit;cursor:pointer}@media print{button{display:none}body{background:#fff;color:#000}h2{color:#3b2366}td:first-child,small{color:#555}.card{border-color:#999}tr.sep td{background:#ddd;color:#000}}</style></head><body>
<button onclick="print()">Imprimir ou salvar em PDF</button>
<p><small>O.R.F.E.U. · documento do Mestre</small></p><h1>A Caixa de Fósforos · Resumo da sessão</h1>
<p><small>${dataCurta(Date.now())} · Dia ${r.d || 1} na Caixa${rel && typeof rel.m === 'number' ? ' · relógio ' + fmtHora(rel.m) : ''}</small></p>
<div class="cards"><div class="card"><small>Quebras hoje</small><b>${hojeDe(r)}</b></div><div class="card"><small>Rumo ao Protocolo</small><b>${r.q || 0}/3${r.p ? ' · em curso' : ''}</b></div>
<div class="card"><small>Balança do Eco</small><b>Rei ${b}% · Mãe ${100 - b}%</b></div><div class="card"><small>Registros</small><b>${ent.length}</b></div></div>
<h2>Exposição por elemento</h2><table><tr><th>Cobaia</th>${ELEM_EXPO.map(k => `<th>${ELEMENTOS[k].nome}</th>`).join('')}</tr>
${SERES.filter(x => x.tipo === 'cobaia').map(x => `<tr><td>${x.nome}</td>${ELEM_EXPO.map(k => `<td>${(ex[x.id] || {})[k] || ''}</td>`).join('')}</tr>`).join('')}</table>
<h2>Rolagens</h2><table>${ent.filter(e => e.k === 'dado').map(linhaD).join('') || '<tr><td colspan="3">Nenhuma.</td></tr>'}</table>
<h2>Diário</h2><table>${ent.map(linhaD).join('') || '<tr><td colspan="3">Nada registrado.</td></tr>'}</table>
</body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
});

/* =========================================================
   RASTRO DE SOM (Mestres Auxiliares)
   ========================================================= */
const rastros = {};   // "andar:sala:cn" ou "andar:corr:ci" -> horário
const RASTRO_MS = 180000;
function marcarRastro(a, p, ci) { rastros[p ? `${a}:sala:${cnDe(a, p)}` : `${a}:corr:${ci}`] = Date.now(); }
function desenharRastros() {
  const ouvinte = V().aux && !V().mestre;
  const agora = Date.now();
  $$('.sala, .corredor', stage).forEach(e => {
    const k = e.dataset.cn ? `${andarAtual}:sala:${e.dataset.cn}` : `${andarAtual}:corr:${e.dataset.ci}`;
    const t = rastros[k];
    const vivo = ouvinte && t && agora - t < RASTRO_MS;
    e.classList.toggle('rastro', !!vivo);
    if (vivo) e.style.setProperty('--rastro', (1 - (agora - t) / RASTRO_MS).toFixed(2));
  });
}
setInterval(() => { if (aux && !mestre) desenharRastros(); }, 5000);

/* =========================================================
   INICIATIVA DOS FILHOS EM LOTE
   ========================================================= */
$('#btnIniFilhosAux').addEventListener('click', rolarIniFilhosAux);
$('#btnIniFilhos').addEventListener('click', () => {
  const bonus = parseInt($('#bonusFilhos').value, 10) || 0;
  let n = 0;
  $$('#setupPersg .setup-linha').forEach(l => {
    const tk = Store.state.tokens[l.dataset.id];
    if (!tk || !SER[tk.s] || SER[tk.s].tipo !== 'filho') return;
    const d = 1 + Math.floor(Math.random() * 20);
    $('input.ini', l).value = d + bonus;
    $('input.ck', l).checked = true;
    n++;
    Diario.dado(l.dataset.id, { t: d + bonus, d: [d], b: bonus, dv: false }, 'iniciativa em lote');
  });
  aviso(n ? `Iniciativa rolada para ${n} Filho(s).` : 'Nenhum Filho neste andar.');
});
// auxiliar: rola para os Filhos do andar aberto; o resultado chega ao Mestre
function rolarIniFilhosAux() {
  const bonus = parseInt($('#bonusFilhosAux').value, 10) || 0;
  const linhas = [];
  Object.entries(Store.state.tokens || {}).forEach(([id, tk]) => {
    if (!SER[tk.s] || SER[tk.s].tipo !== 'filho' || tk.a !== andarAtual) return;
    const d = 1 + Math.floor(Math.random() * 20);
    Store.definir(['tokens', id], { ...tk, r: { t: d + bonus, d: [d], b: bonus, dv: false, ts: Date.now() } });
    linhas.push(`${rotuloBase(tk)}: ${d + bonus}`);
  });
  if (!linhas.length) { aviso('Nenhum Filho neste andar.'); return; }
  Chat.enviar('🎲 Iniciativa dos Filhos · ' + linhas.join(' · '), 'filhos', true);
  aviso('Iniciativa enviada ao Mestre.');
}

/* =========================================================
   QUEM ESTÁ CONECTADO
   ========================================================= */
const Presenca = {
  id: Math.random().toString(36).slice(2, 12), quem: '', timer: null, off: null, lista: {},
  ligar() {
    const quem = TV ? '' : mestre ? '_mestre' : (meu || aux || '');
    const autenticado = Store.modo !== 'firebase' || !!(Store.auth && Store.auth.currentUser);
    if (!autenticado) return;
    if (quem !== this.quem) {
      this.quem = quem;
      const cam = 'presenca/' + this.id;
      if (quem) {
        Rede.set(cam, { a: quem, ts: Date.now() }).catch(() => {});
        if (Store.modo === 'firebase') { try { Store.db.ref(cam).onDisconnect().remove(); } catch (e) {} }
        clearInterval(this.timer);
        this.timer = setInterval(() => Rede.set(cam + '/ts', Date.now()).catch(() => {}), 20000);
      } else { clearInterval(this.timer); Rede.set(cam, null).catch(() => {}); }
    }
    if (!this.off) this.off = Rede.on('presenca', v => { this.lista = v || {}; desenharConectados(); desenharPainel(); }, () => { this.off = null; });
  },
  online(id) {
    const agora = Date.now();
    return Object.values(this.lista || {}).some(p => p && p.a === id && agora - (p.ts || 0) < 120000);
  },
};
window.addEventListener('beforeunload', () => { if (Presenca.quem) Rede.set('presenca/' + Presenca.id, null).catch(() => {}); });
function desenharConectados() {
  if (!mestre) return;
  const nomes = ['_mestre', ...SERES.filter(s => s.tipo === 'cobaia' || s.tipo === 'robo').map(s => s.id)];
  $('#listaConectados').innerHTML = nomes.map(id => {
    const on = Presenca.online(id);
    const nome = id === '_mestre' ? 'Mestre' : SER[id].nome + (SER[id].jogador ? ` · ${SER[id].jogador}` : '');
    return `<li class="${on ? 'on' : ''}"><span class="ponto-on"></span>${esc(nome)}</li>`;
  }).join('');
}

/* =========================================================
   SOM LIGADO / DESLIGADO (por aparelho)
   ========================================================= */
let mudo = false;
try { mudo = localStorage.getItem('acf-mudo') === '1'; } catch (e) {}
function aplicarMudo() { $('#btnSom').textContent = mudo ? '🔇' : '🔊'; $('#btnSom').classList.toggle('ativo', mudo); }
$('#btnSom').addEventListener('click', () => {
  mudo = !mudo;
  try { mudo ? localStorage.setItem('acf-mudo', '1') : localStorage.removeItem('acf-mudo'); } catch (e) {}
  aplicarMudo();
  aviso(mudo ? 'Sons desligados neste aparelho.' : 'Sons ligados.');
});
aplicarMudo();

/* =========================================================
   CADERNO (só neste aparelho)
   ========================================================= */
let cadernoChave = '';
function desenharCaderno() {
  const quem = meu || aux;
  const bloco = $('#blocoCaderno');
  bloco.hidden = !quem || mestre || TV;
  if (bloco.hidden) return;
  const k = 'acf-caderno-' + quem;
  if (k === cadernoChave) return;
  cadernoChave = k;
  try { $('#caderno').value = localStorage.getItem(k) || ''; } catch (e) {}
}
$('#caderno').addEventListener('input', e => { try { localStorage.setItem(cadernoChave, e.target.value); } catch (err) {} });

/* =========================================================
   AJUDA RÁPIDA
   ========================================================= */
$('#btnAjuda').addEventListener('click', () => {
  const comum = `<h3>Mapa</h3><ul>
    <li><b>Girar:</b> arraste no mapa. <b>Mover a vista:</b> botão direito, dois dedos ou o botão ✥. <b>Zoom:</b> roda do mouse ou pinça.</li>
    <li><b>ISO / TOPO / ◎:</b> vistas prontas. <b>◉</b> leva até a sua ficha.</li>
    <li><b>Tocar numa sala</b> mostra o nome, quem está ali e os arquivos encontrados. <b>Tocar num corredor</b> mostra se a porta está fechada.</li></ul>
    <h3>Topo</h3><ul><li><b>Símbolo do Eco:</b> muda conforme os rumos da Caixa. <b>🔊</b> liga e desliga os sons. <b>💬 Chat:</b> Geral e Sussurro ao Mestre.</li></ul>`;
  const jog = `<h3>Sua cobaia</h3><ul>
    <li><b>Arraste a sua ficha</b> (a de contorno tracejado). A linha mostra os metros do movimento.</li>
    <li><b>↶ Desfazer</b> (ou Ctrl+Z) volta o último movimento.</li>
    <li><b>Segure o dedo num ponto</b> do mapa para avisar o Mestre: "quero ir para cá".</li>
    <li><b>🎲 Dados:</b> quantos d20, bônus e desvantagem.</li>
    <li><b>Perseguição:</b> só quem está na vez se move, até o limite de metros. O celular vibra na sua vez.</li>
    <li><b>Painel:</b> sua ficha, a Loja do Maurício e o seu Caderno (só fica no seu aparelho).</li></ul>`;
  const auxT = `<h3>Mestre Auxiliar</h3><ul>
    <li>Você move os <b>Filhos</b> e o seu robô. As cobaias ficam invisíveis até o Mestre revelar.</li>
    <li>As salas com cobaias <b>brilham em vermelho</b> conforme o barulho; o <b>rastro</b> marca onde algo foi ouvido nos últimos minutos.</li>
    <li><b>Segure o dedo num ponto</b> para marcar um lugar para os outros auxiliares e o Mestre.</li>
    <li>No painel, <b>rolar iniciativa dos Filhos</b> do andar aberto de uma vez. O canal <b>Filhos</b> do chat é só de vocês e do Mestre.</li></ul>`;
  const mes = `<h3>Mestre</h3><ul>
    <li><b>Abas:</b> Mapa, Sessão, Registro e Segredos.</li>
    <li><b>Clique numa sala:</b> revelar, editar, gatilho, sem sinal, arquivos, trazer cobaias. <b>Num corredor:</b> portas.</li>
    <li><b>Shift+clique</b> nas fichas forma um grupo; arraste uma e o grupo vai junto. Esc limpa.</li>
    <li><b>Ver pelos olhos de</b> (aba Sessão) mostra o mapa como um jogador ou auxiliar vê.</li>
    <li><b>Ctrl+Z</b> desfaz o último movimento de qualquer ficha.</li></ul>`;
  $('#ajudaTexto').innerHTML = comum + (mestre ? mes : aux ? auxT : jog);
  $('#dlgAjuda').showModal();
});

/* =========================================================
   LOJA DO MAURÍCIO
   ========================================================= */
const cfgLoja = () => Store.state.cfg || {};
const lojaAberta = () => !cfgLoja().lojaFechada;
const lojaSoZN = () => !cfgLoja().lojaQualquerLugar;
const txtCusto = c => {
  if (!c) return '';
  const p = [];
  if (c.M) p.push(`${c.M} Sucata${c.M > 1 ? 's' : ''} Maior${c.M > 1 ? 'es' : ''}`);
  if (c.m) p.push(`${c.m} Sucata${c.m > 1 ? 's' : ''} Menor${c.m > 1 ? 'es' : ''}`);
  return p.join(', ') || 'grátis';
};
function itensLoja() {
  const pub = Object.entries(((Store.state.loja || {}).itens) || {}).map(([id, it]) => ({ ...it, id, oculto: false }));
  const ocultos = mestre ? Object.entries(Segredos.dados._lojaOculta || {}).map(([id, it]) => ({ ...it, id, oculto: true })) : [];
  return pub.concat(ocultos).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
}
const imgsLoja = {};
function imagemDoItem(it, imgEl) {
  // as imagens da loja ficam direto em img/ (versões antigas gravaram img/loja/)
  // vendas padrão: a imagem vem sempre do próprio site (img/<id>.jpg), não do banco
  const padrao = LOJA_PADRAO.find(p => p.id === it.id);
  const caminhos = [padrao && padrao.img, it.img && it.img.replace('img/loja/', 'img/'), it.img]
    .filter((c, i, l) => c && l.indexOf(c) === i);
  if (caminhos.length) {
    let n = 0;
    const versao = 'v=' + VERSAO_SITE;
    imgEl.onerror = () => { n++; if (n < caminhos.length) imgEl.src = caminhos[n] + '?' + versao; else imgEl.onerror = null; };
    imgEl.src = caminhos[0] + '?' + versao;
    return;
  }
  if (!it.imgId) { imgEl.remove(); return; }
  if (imgsLoja[it.imgId]) { imgEl.src = imgsLoja[it.imgId]; return; }
  Rede.once('lojaImg/' + it.imgId).then(d => { if (d) { imgsLoja[it.imgId] = d; imgEl.src = d; } else imgEl.remove(); }).catch(() => imgEl.remove());
}
function minhasSucatas() { const f = fichaDe(meu) || {}; return { M: f.sM, m: f.sm }; }
function podePagar(c) {
  const s = minhasSucatas();
  if (!c || s.M === undefined && s.m === undefined) return true;
  return (s.M || 0) >= (c.M || 0) && (s.m || 0) >= (c.m || 0);
}
function abrirLoja() {
  if (!mestre && !lojaAberta()) { aviso('A loja do Maurício está fechada agora.'); return; }
  $('#lojaMestre').hidden = !mestre;
  desenharLoja(true);
  $('#dlgLoja').showModal();
}
let lojaSig = '';
function desenharLoja(forcar) {
  const s = minhasSucatas();
  const sig = JSON.stringify([itensLoja(), cfgLoja().lojaFechada, cfgLoja().lojaQualquerLugar, s, mestre]);
  if (!forcar && sig === lojaSig) return;
  lojaSig = sig;
  let avisoTxt = '';
  if (!mestre) {
    avisoTxt = (s.M !== undefined || s.m !== undefined) ? `Suas sucatas: ${s.M || 0} maiores · ${s.m || 0} menores. ` : '';
    avisoTxt += lojaSoZN() ? 'O Maurício atende na Zona Neutra. O pedido vai para o Mestre.' : 'O pedido vai para o Mestre.';
  } else avisoTxt = `${lojaAberta() ? 'Loja aberta' : 'Loja FECHADA'} aos jogadores · ${lojaSoZN() ? 'só na Zona Neutra' : 'em qualquer lugar'}. Pedidos chegam no seu Sussurro.`;
  $('#lojaAviso').textContent = avisoTxt;
  const grade = $('#lojaGrade');
  grade.innerHTML = '';
  itensLoja().forEach(it => {
    const card = el('article', 'loja-card' + (it.oculto ? ' oculto' : ''));
    const temDano = (it.op || []).some(o => o.d || o.c);
    card.innerHTML = `<img alt="">
      <div class="loja-corpo">
        <h3>${esc(it.t)}${it.oculto ? ' <span class="so-mestre">oculta</span>' : ''}</h3>
        ${it.custo ? `<p class="loja-preco">${txtCusto(it.custo)}</p>` : ''}
        ${it.desc ? `<p class="loja-desc">${esc(it.desc)}</p>` : ''}
        <table class="loja-op">${temDano ? '<tr><th>Opção</th><th>Dano</th><th>Crítico</th><th></th></tr>' : ''}
        ${(it.op || []).map((o, i) => {
          const custo = o.p || it.custo;
          const ok = mestre || podePagar(custo);
          return `<tr class="${ok ? '' : 'caro'}"><td>${esc(o.n)}${o.p ? `<small>${txtCusto(o.p)}</small>` : ''}</td>${temDano ? `<td>${esc(o.d || '')}</td><td>${esc(o.c || '')}</td>` : ''}
            <td>${mestre ? '' : `<button data-i="${i}" class="btn-pedir"${ok ? '' : ' title="Sucatas insuficientes"'}>Pedir</button>`}</td></tr>`;
        }).join('')}</table>
        ${mestre ? `<div class="loja-acoes"><button data-a="editar">Editar</button><button data-a="ocultar">${it.oculto ? 'Mostrar aos jogadores' : 'Ocultar'}</button><button data-a="apagar" class="perigo">Apagar</button></div>` : ''}
      </div>`;
    imagemDoItem(it, $('img', card));
    $$('.btn-pedir', card).forEach(b => b.onclick = () => pedirItem(it, it.op[+b.dataset.i]));
    if (mestre) {
      $('[data-a="editar"]', card).onclick = () => editarItemLoja(it);
      $('[data-a="ocultar"]', card).onclick = () => salvarItemLoja({ ...it }, !it.oculto);
      $('[data-a="apagar"]', card).onclick = () => { if (confirm(`Apagar "${it.t}" da loja?`)) apagarItemLoja(it); };
    }
    grade.appendChild(card);
  });
  if (!grade.children.length) grade.innerHTML = '<p class="vazio">O Maurício não tem nada à venda agora.</p>';
}
function pedirItem(it, op) {
  const tk = (Store.state.tokens || {})[meu];
  if (lojaSoZN() && (!tk || salaEm(tk.a, tk.x, tk.y) !== 25)) { aviso('O Maurício só atende na Zona Neutra.'); return; }
  const custo = op.p || it.custo;
  if (!podePagar(custo) && !confirm('Pelas suas sucatas anotadas, não dá para pagar. Pedir mesmo assim?')) return;
  if (!Chat.chaveLigada) { aviso('Sem conexão com o chat.'); return; }
  Chat.enviar(`🛒 Pedido ao Maurício: ${op.n} (${it.t}) · ${txtCusto(custo)}`, 'sus');
  aviso('Pedido enviado ao Mestre.');
}
function limparFormLoja() {
  ['lojaEditId', 'lojaT', 'lojaOp', 'lojaDesc'].forEach(i => { $('#' + i).value = ''; });
  $('#lojaM').value = 0; $('#lojam').value = 0; $('#lojaImg').value = ''; $('#lojaOculta').checked = false;
  $('#lojaFormTitulo').textContent = 'Nova venda';
}
function editarItemLoja(it) {
  $('#lojaEditId').value = it.id;
  $('#lojaT').value = it.t || '';
  $('#lojaM').value = (it.custo && it.custo.M) || 0; $('#lojam').value = (it.custo && it.custo.m) || 0;
  $('#lojaOp').value = (it.op || []).map(o => [o.n, o.d || '', o.c || ''].join(' ; ').replace(/( ; )+$/, '')).join('\n');
  $('#lojaDesc').value = it.desc || '';
  $('#lojaOculta').checked = !!it.oculto;
  $('#lojaFormTitulo').textContent = 'Editando: ' + it.t;
  $('#lojaForm').open = true;
  $('#lojaForm').scrollIntoView({ behavior: 'smooth' });
}
async function salvarItemLoja(it, oculto) {
  const id = it.id;
  const limpo = { t: it.t, custo: it.custo || null, op: it.op || [], ordem: it.ordem || Date.now() };
  if (it.desc) limpo.desc = it.desc;
  if (it.img) limpo.img = it.img;
  if (it.imgId) limpo.imgId = it.imgId;
  if (!limpo.custo) delete limpo.custo;
  if (oculto) {
    Segredos.gravar(['_lojaOculta', id], limpo);
    Store.definir(['loja', 'itens', id], null);
  } else {
    Store.definir(['loja', 'itens', id], limpo);
    Segredos.gravar(['_lojaOculta', id], null);
  }
  Diario.registrar('sala', `Loja do Maurício: "${it.t}" ${oculto ? 'oculta' : 'à venda'}`);
  desenharLoja();
}
async function apagarItemLoja(it) {
  Store.definir(['loja', 'itens', it.id], null);
  Segredos.gravar(['_lojaOculta', it.id], null);
  if (it.imgId) Rede.set('lojaImg/' + it.imgId, null).catch(() => {});
  desenharLoja();
}
$('#btnLojaSalvar').addEventListener('click', async () => {
  const t = $('#lojaT').value.trim();
  if (!t) { aviso('Dê um nome à venda.'); return; }
  const op = $('#lojaOp').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [n, d, c] = l.split(';').map(x => (x || '').trim());
    const o = { n: n || t }; if (d) o.d = d; if (c) o.c = c; return o;
  });
  const idExist = $('#lojaEditId').value;
  const antigo = idExist ? itensLoja().find(i => i.id === idExist) : null;
  const id = idExist || Rede.chave();
  const it = { ...(antigo || {}), id, t, custo: { M: Math.max(0, +$('#lojaM').value || 0), m: Math.max(0, +$('#lojam').value || 0) }, op: op.length ? op : [{ n: t }], desc: $('#lojaDesc').value.trim() };
  if (!it.custo.M && !it.custo.m && antigo && !antigo.custo) delete it.custo;
  const f = $('#lojaImg').files[0];
  if (f) {
    try { const d = await imagemReduzida(f, 700); await Rede.set('lojaImg/' + id, d); it.imgId = id; delete it.img; imgsLoja[id] = d; }
    catch (e) { aviso('Não consegui salvar a imagem.'); }
  }
  await salvarItemLoja(it, $('#lojaOculta').checked);
  limparFormLoja();
  aviso('Venda salva.');
});
$('#btnLojaCancelar').addEventListener('click', limparFormLoja);
$('#btnFecharLoja').addEventListener('click', () => $('#dlgLoja').close());
$('#btnAbrirLoja').addEventListener('click', abrirLoja);
$('#btnAbrirLojaM').addEventListener('click', abrirLoja);
$('#chkLojaAberta').addEventListener('change', e => Store.definir(['cfg', 'lojaFechada'], e.target.checked ? null : true));
$('#chkLojaZN').addEventListener('change', e => Store.definir(['cfg', 'lojaQualquerLugar'], e.target.checked ? null : true));
// primeira vez: o Mestre coloca o catálogo do PDF na loja
function semearLoja() {
  if (!mestre || cfgLoja().lojaSemeada) return;
  LOJA_PADRAO.forEach((it, i) => {
    const { id, ...resto } = it;
    const limpo = { ...resto, ordem: i + 1 };
    if (!limpo.custo) delete limpo.custo;
    Store.definir(['loja', 'itens', id], limpo);
  });
  Store.definir(['cfg', 'lojaSemeada'], true);
}
function desenharOpcoesLoja() {
  if (!mestre) return;
  $('#chkLojaAberta').checked = lojaAberta();
  $('#chkLojaZN').checked = lojaSoZN();
}

/* =========================================================
   INÍCIO
   ========================================================= */
Store.aoMudar(st => Diario.observar(st));
Store.aoMudar(() => { verificarApagao(); focoInicialCelular(); agendarSincMestre(); });
Store.aoMudar(() => {
  if (podeVer(andarAtual) && assinatura() !== assinaturaAndar) montarAndar();
  atualizarTudo();
});

window.addEventListener('resize', () => enquadrar());

(async function iniciar() {
  aplicarCamera();
  montarAndar();
  enquadrar();
  // tela da mesa: sem perfil, sem painéis, só a visão dos jogadores
  if (TV) {
    document.body.classList.add('tv');
    await Store.iniciar();
    atualizarTudo();
    return;
  }
  const perfil = lerPerfil();
  if (perfil.startsWith('jogador:') && SER[perfil.slice(8)]) meu = perfil.slice(8);
  if (perfil.startsWith('aux:') && SER[perfil.slice(4)]) aux = perfil.slice(4);
  if (!FIREBASE && perfil === 'mestre') { try { if (localStorage.getItem('acf-mestre') === '1') mestre = true; } catch (e) {} }
  await Store.iniciar();
  if (mestre && Store.modo === 'local') definirMestre(true);
  if (aux && Store.modo === 'local') Priv.ligar(true);
  if (Store.modo === 'local') Chat.ligar();
  atualizarBotaoPerfil();
  atualizarTudo();
  // sem perfil salvo: pergunta quem é
  if (!meu && !aux && !mestre && !(FIREBASE && perfil === 'mestre')) mostrarPerfil(1);
})();

})();
