/* =========================================================
   A CAIXA DE FÓSFOROS · imersao.js
   Imersão automática. Nada aqui dá trabalho ao Mestre na mesa: tudo roda sozinho,
   com no máximo uma opção para ligar e desligar (⚙ Opções do 3D, salvas neste aparelho).

   1. QUALIDADE AUTOMÁTICA DO 3D: mede os quadros por segundo; se ficar baixo por alguns
      segundos, baixa um degrau (resolução, poeira, fumaça, câmeras de segurança, sombras,
      luzes do conjunto) e sobe de volta quando sobra folga, com histerese. O que o jogador
      escolheu à mão nas Opções manda (só mexe no que está no padrão).
   2. CORAÇÃO do próprio personagem (só o jogador ouve): o batimento acelera
      com PV baixo, com um Filho à vista perto, com um eco de som perto e na perseguição;
      som gerado na hora (WebAudio), respeita o mudo e o volume do ambiente.
   3. VIBRAÇÃO DO CELULAR: dano no próprio personagem e susto (as vibrações que o site já
      tinha, como Encontro e "o chão treme", passam a obedecer a mesma opção).
   4. AMBIENTE QUE REAGE: um Filho passando perto (posição real na tela do Mestre e dos
      auxiliares; nos jogadores, pelos ecos de som, sem dizer quem) faz as luzes piscarem,
      as telas chiarem e um zumbido elétrico curto. Só efeito local; nada é gravado.
   5. MARCAS QUE FICAM: a tela do Mestre grava em mapa/marcas (sem dizer quem) onde um Filho
      atacou ou passou numa perseguição; no 3D viram arranhões e manchas até o "Nova cena".
   6. BACKUP AUTOMÁTICO: a tela do Mestre guarda a cada 15 min o mesmo pacote do botão
      "Baixar backup" em segredosBk (só o Mestre lê), mantendo os 6 últimos.
   7. RESUMO AUTOMÁTICO DA SESSÃO: no Encerramento, monta o relatório (salas, encontros,
      perseguições, quem quase morreu, itens, interações) para o Mestre revisar e mandar.
   8. TUTORIAL da primeira vez no 3D (jogador), uma vez por aparelho, com "Pular".
   9. MODO FOTO: tira foto da vista (sem a interface), mostra a prévia e guarda numa galeria
      deste aparelho; com câmera ou celular na ficha e um perigo "só por lente" à frente,
      dispara o mesmo Flash do site.

   Código genérico: nenhum nome de Filho aqui.
   ========================================================= */
(() => {
'use strict';
const A = () => window.ACF;
const I = () => window.ACF._int;
const S3 = () => window.Sala3D;
const M = () => window.ACF_MOMENTO;
const FIL = () => window.ACF_FILHOS;
const MESA = () => window.ACF_MESA || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const agora = () => Date.now();
const num = (v, p = 0) => { const n = parseFloat(v); return isFinite(n) ? n : p; };
const pad2 = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ls = { get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } } };
const est = () => (A() && A().estado) || {};
const tokens = () => est().tokens || {};
const SERd = id => (A().SER || {})[id];
const tipoDe = tk => ((tk && SERd(tk.s)) || {}).tipo || '';
const souMestre = () => !!(A() && A().mestre);
const souAux = () => !!(A() && A().aux && !A().mestre);
const euJog = () => (A() && !A().mestre && !A().aux ? A().meu : null);
const salaP = tk => (tk && tk.a ? I().salaEm(tk.a, tk.x, tk.y) : null);
const cnTk = tk => { const p = salaP(tk); return p ? I().cnDe(tk.a, p) : null; };
const MU = () => A().geo.M_POR_UNID;
const aberto3D = () => !!(S3() && S3().aberta);
const api3 = () => (aberto3D() && S3()._api) || null;
const persg = () => est().persg || { on: false };
const ordemP = () => (persg().ordem ? Object.values(persg().ordem) : []);
const celular = () => Math.min(innerWidth, innerHeight) < 700 || matchMedia('(pointer: coarse)').matches;
const toque = () => matchMedia('(pointer: coarse)').matches;
const hora = ts => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const data = ts => { const d = new Date(ts); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; };
const hashTxt = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const avisar = txt => { const ap = api3(); if (ap && ap.toast) ap.toast(txt); else if (A() && A().aviso) A().aviso(txt); };

/* ---------- Opções (as do 3D, salvas neste aparelho em acf-s3d-cfg) ---------- */
let cfgCache = { t: 0, v: {} };
const cfg3d = () => {
  const ap = api3(); if (ap && ap.CFG) return ap.CFG;
  if (agora() - cfgCache.t > 800) cfgCache = { t: agora(), v: ls.get('acf-s3d-cfg', {}) || {} };
  return cfgCache.v;
};
const opc = (k, pad) => { const v = cfg3d()[k]; return v === undefined || v === null ? pad : v; };

/* =========================================================
   ÁUDIO: usa o mesmo contexto do momento.js (liga no primeiro toque); saída própria
   com o volume do ambiente das Opções e o mudo do site (e o "Som do 3D" desligado)
   ========================================================= */
const Som = {
  g: null,
  ctx() { const Au = M() && M().Aud; return Au && Au.ctx ? Au.ctx : null; },
  mudo() { return !!(A() && A().mudo) || !!(aberto3D() && S3().Som && S3().Som.ligado === false); },
  ok() { const c = this.ctx(); return !!c && c.state === 'running' && !this.mudo(); },
  saida() {
    const c = this.ctx(); if (!c) return null;
    if (!this.g || this.g.context !== c) { this.g = c.createGain(); this.g.gain.value = 0; this.g.connect(c.destination); }
    const alvo = this.mudo() ? 0 : clamp(num(opc('volAmb', 1), 1), 0, 1.5);
    this.g.gain.setTargetAtTime(alvo, c.currentTime, .08);
    return this.g;
  },
  ruido(t, dest, { bp = 600, q = 1, tipo = 'bandpass', v = .2, ataque = .01, dur = .2, f2 }) {
    const c = this.ctx(), Au = M().Aud; if (!c || !Au.branco) return;
    const s = c.createBufferSource(); s.buffer = Au.branco;
    const f = c.createBiquadFilter(); f.type = tipo; f.frequency.setValueAtTime(bp, t); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur); f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + ataque); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + .05);
    s.onended = () => { try { s.disconnect(); f.disconnect(); g.disconnect(); } catch (e) {} };   // a cadeia curta sai do grafo quando acaba
  },
  tom(t, dest, { f = 60, f2, tipo = 'sine', v = .2, ataque = .01, dur = .3 }) {
    const c = this.ctx(); if (!c) return;
    const o = c.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + ataque); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05);
    o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) {} };
  },
  // posição do ouvinte: no 3D, a câmera
  ouvinteNaCamera(ap) {
    try { const c = ap.camera, f = new ap.T.Vector3(); c.getWorldDirection(f); M().Aud.ouvinte(c.position.x, c.position.y, c.position.z, f.x, f.z); } catch (e) {}
  },
};

/* =========================================================
   3. VIBRAÇÃO: todas as vibrações do site obedecem à opção "Vibração do celular"
   ========================================================= */
const Vib = {
  orig: null, log: [],
  instalar() {
    if (this.orig || typeof navigator.vibrate !== 'function') return;
    const o = navigator.vibrate.bind(navigator); this.orig = o;
    try {
      navigator.vibrate = p => {
        const ok = !!opc('vibrar', true);
        this.log.push([agora(), JSON.stringify(p), ok]); if (this.log.length > 30) this.log.shift();
        if (!ok) return false;
        try { return o(p); } catch (e) { return false; }
      };
    } catch (e) {}
  },
  vibrar(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} },
};

/* =========================================================
   2. CORAÇÃO E RESPIRAÇÃO (só o jogador, no próprio aparelho)
   ========================================================= */
const Cor = {
  k: 0, prox: 0, ecoTs: 0, ecoD: 99, sustoTs: 0, pvAnt: null, part: false, persgOn: null,
  ativo() { return !!euJog() && opc('coracao', true) !== false; },
  // Filho à vista mais perto (metros de regra), do jeito que o jogador enxerga
  filhoPerto(tk) {
    const mu = MU(), ap = api3(); let d = 99;
    Object.entries(tokens()).forEach(([id, f]) => {
      if (!f || tipoDe(f) !== 'filho' || f.a !== tk.a || f.h || f.oc || f.fo) return;
      if (ap) { if (!ap.quemVe(id)) return; }
      else if (!(A().visivelPara ? A().visivelPara(f) : true) || (FIL() && FIL().visivelJogador && !FIL().visivelJogador(f))) return;
      d = Math.min(d, Math.hypot(f.x - tk.x, f.y - tk.y) * mu);
    });
    return d;
  },
  estresse() {
    const eu = euJog(), tk = eu && tokens()[eu]; if (!tk) return 0;
    const v = tk.vit || {}, pvM = num(v.pvM), pv = num(v.pv, pvM);
    let s = 0;
    if (pvM > 0) { const r = pv / pvM; if (r < .6) s += (.6 - r) / .6 * .75; if (pv <= 0) s = Math.max(s, .92); }
    const dF = this.filhoPerto(tk); if (dF < 12) s += .12 + (1 - dF / 12) * .55;
    if (agora() - this.ecoTs < 7000) s += .38 * clamp(1 - this.ecoD / 14, .25, 1);
    if (persg().on && ordemP().some(o => o.id === eu)) s += .3;
    if (agora() - this.sustoTs < 7000) s += .45;
    return clamp(s, 0, 1);
  },
  tick() {
    const c = Som.ctx();
    if (!this.ativo() || !c || !Som.ok()) { this.k = 0; this.prox = 0; return; }
    const s = this.estresse();
    this.k += (s - this.k) * (s > this.k ? .35 : .14);
    const out = Som.saida(), t = c.currentTime;
    // batimento: abaixo de um mínimo, silêncio
    if (this.k < .14) this.prox = 0;
    else {
      if (!this.prox || this.prox < t) this.prox = t + .08;
      const bpm = 62 + 100 * this.k, v = .05 + .3 * this.k;
      if (!this.lp || this.lp.context !== c) { this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 170; this.lp.connect(out); }
      while (this.prox < t + .35) {
        Som.tom(this.prox, this.lp, { f: 60, f2: 42, v, ataque: .01, dur: .15 });
        Som.ruido(this.prox, this.lp, { tipo: 'lowpass', bp: 110, v: v * .7, ataque: .005, dur: .09 });
        Som.tom(this.prox + .24 * (90 / bpm), this.lp, { f: 52, f2: 36, v: v * .62, ataque: .01, dur: .13 });
        this.prox += 60 / bpm;
      }
    }
  },
  // a respiração ofegante saiu do site (pedido do Mestre em 05/11: o chiado lembrava vassoura e incomodava)
  ofegar() {},
  // dano no próprio personagem (vitais publicadas no token): vibra
  vigiar() {
    const eu = euJog(), tk = eu && tokens()[eu], v = tk && tk.vit;
    const pv = v && typeof v.pv === 'number' ? v.pv : null, nome = (v && v.nome) || '', pvM = v ? num(v.pvM) : 0;
    // só conta como dano a mesma ficha perdendo PV (trocar de ficha ativa não vibra)
    const outraFicha = (nome && this.nomeAnt && nome !== this.nomeAnt) || (pvM && this.pvMAnt && pvM !== this.pvMAnt);
    if (pv !== null && this.pvAnt !== null && pv < this.pvAnt && !outraFicha) {
      const pvM = Math.max(1, num(v.pvM, 20)), q = (this.pvAnt - pv) / pvM;
      Vib.vibrar(q >= .25 ? [120, 60, 200, 60, 120] : [70, 40, 130]);
    }
    this.pvAnt = pv; if (nome) this.nomeAnt = nome; if (pvM) this.pvMAnt = pvM;
    const p = persg(), on = !!p.on, part = !!(eu && ordemP().some(o => o.id === eu));
    if (this.persgOn === null) this.persgOn = on;
    if (on && part) this.part = true;
    if (this.persgOn && !on) this.part = false;
    this.persgOn = on;
  },
  // 3D: a respiração ofegante depois de correr saiu; nada a acompanhar por quadro
  quadro() {
  },
};

/* =========================================================
   Ecos de som dos Filhos (jogador): a mesma fonte que o momento.js toca (ecos3d)
   Servem ao coração (eco perto) e ao ambiente (luzes e telas perto do eco)
   ========================================================= */
const Ecos = {
  off: null, ligando: false, vistos: null,
  ligar() {
    const quer = !!euJog() && A().pronto;
    if (quer && !this.off && !this.ligando) {
      this.ligando = true; this.vistos = null;
      A().garantirLogin().then(() => {
        this.ligando = false; if (this.off || !euJog()) return;
        let off = null;
        off = A().Rede.on('ecos3d', v => this.chegou(v || {}), () => { if (this.off === off) { this.off = null; setTimeout(() => this.ligar(), 5000); } });
        this.off = off;
      }, () => { this.ligando = false; });
    } else if (!quer && this.off) { this.off(); this.off = null; this.vistos = null; }
  },
  chegou(v) {
    if (!this.vistos) { this.vistos = new Set(Object.keys(v)); return; }
    Object.entries(v).forEach(([k, e]) => { if (this.vistos.has(k) || !e) return; this.vistos.add(k); this.eco(e); });
    if (this.vistos.size > 400) this.vistos = new Set(Object.keys(v));
  },
  eco(e) {
    const eu = A().meu, tk = tokens()[eu]; if (!tk || tk.a !== e.a || agora() - num(e.ts, agora()) > 15000) return;
    const d = Math.hypot(e.x - tk.x, e.y - tk.y) * MU();
    if (d < 14) { Cor.ecoTs = agora(); Cor.ecoD = d; }
    const ap = api3();
    if (ap && ap.a === e.a && d < 18) { const [X, Z] = ap.planta3D(e.x, e.y); Amb.fonte('e' + Math.round(e.x * 3) + '_' + Math.round(e.y * 3), X, Z, 2.6); }
  },
};

/* =========================================================
   1. QUALIDADE AUTOMÁTICA DO 3D
   Degraus: 0 tudo; 1 resolução 85%; 2 sem poeira e fumaça; 3 resolução 72% e câmeras leves;
   4 sem câmeras e sem sombras; 5 resolução 60% e menos luzes no conjunto.
   ========================================================= */
const DEGRAUS = [
  { esc: 1, nome: 'qualidade cheia' },
  { esc: .85, nome: 'resolução 85%' },
  { esc: .85, part: 1, fum: 1, nome: 'resolução 85%, sem poeira e fumaça' },
  { esc: .72, part: 1, fum: 1, cam: 'leve', nome: 'resolução 72%, câmeras leves' },
  { esc: .72, part: 1, fum: 1, cam: 'off', somb: 1, nome: 'resolução 72%, sem câmeras e sombras' },
  { esc: .6, part: 1, fum: 1, cam: 'off', somb: 1, luz: 1, nome: 'resolução 60%, menos luzes' },
];
// Decisão (uma amostra por segundo, FPS medido numa janela de 2 s):
// - carência: os quadros logo depois de a aba sumir e voltar, de a janela perder ou ganhar o foco, de abrir o 3D, de
//   trocar de andar, de mudar o tamanho da janela e de trocar de degrau não contam (engasgos de passagem);
// - desce um degrau só com queda sustentada (QUEDA segundos seguidos abaixo do limite baixo) e com a janela em foco
//   (sem foco o navegador desenha menos quadros de propósito: Alt+Tab, outra janela por cima);
// - sobe um degrau por vez com folga sustentada (SOBE segundos acima de 92% do teto, 55 FPS a 60; um segundo
//   entre 80% e 92% só desconta dois, para a oscilação normal perto do teto não impedir a subida);
// - histerese: o limite de descer (26 FPS) fica bem abaixo do de subir; se cair logo depois de subir, a espera para
//   subir de novo dobra (até ESPERA_MAX) e volta ao normal depois de um minuto firme no degrau.
const QUEDA = 5, SOBE = 10, ESPERA_MAX = 60;
const Qual = {
  ap: null, nivel: 0, aplicado: null, base: 1, quadros: [], seg: 0, baixo: 0, alto: 0, espera: SOBE, ultSubida: 0, ultTroca: 0, ignorarAte: 0, t1: 0, luzes: [], sombra0: false,
  ligado() { return opc('autoQual', true) !== false; },
  // janela de carência: zera a medida e ignora os próximos ms
  carencia(ms) { const t = performance.now(); this.ignorarAte = Math.max(this.ignorarAte, t + ms); this.quadros = []; this.baixo = 0; this.alto = 0; },
  iniciar(ap) {
    this.ap = ap; this.base = ap.ren.getPixelRatio(); this.quadros = []; this.baixo = 0; this.alto = 0; this.espera = SOBE; this.ultSubida = 0; this.ultTroca = agora(); this.aplicado = null;
    this.ignorarAte = performance.now() + 5000; this.primeiro = true; this.andar = ap.a;
    this.luzes = ap.mundo.raiz.children.filter(o => o.isPointLight);
    this.sombra0 = !!ap.lanterna.castShadow;
    // começa no degrau em que o aparelho ficou da última vez (sobe sozinho se sobrar folga)
    const s = ls.get('acf-imr-qual', null);
    this.nivel = this.ligado() && s && agora() - num(s.ts) < 3 * 86400000 ? clamp(Math.round(num(s.n)), 0, DEGRAUS.length - 1) : 0;
    this.aplicar(this.nivel);
  },
  fechar() { this.ap = null; this.aplicado = null; this.luzes = []; },   // (as luzes seguravam a cena fechada na memória)
  manual(k, pad) { const v = this.ap.CFG[k]; return v !== undefined && String(v) !== String(pad); },
  aplicar(n) {
    const ap = this.ap; if (!ap) return;
    const d = DEGRAUS[n], ant = this.aplicado;
    this.nivel = n; this.aplicado = n;
    if (typeof ap.degrau === 'function') ap.degrau(n);   // sala3d.js: o Modo Desempenho automático liga no degrau 3
    // resolução (só com a escala no padrão: a do jogador manda)
    const esc = this.manual('escala', 1) ? 1 : d.esc;
    this.resolucao(esc);
    // poeira no ar (a da lanterna é escondida a cada quadro)
    if (ap.poeira && !this.manual('poeira', true)) ap.poeira.visible = !d.part;
    // fumaça baixa do momento.js
    const V = M() && M().Vista;
    if (V && V.fumaca && !this.manual('fumaca', 'auto')) V.fumaca.forEach(p => { p.visible = !d.fum; });
    // sombras da lanterna (troca os materiais uma vez)
    if (this.sombra0 && !this.manual('sombras', 'auto')) ap.lanterna.castShadow = !d.somb;
    // luzes do conjunto: as mais longe apagam de vez (também troca os materiais uma vez)
    const lim = d.luz ? Math.ceil(this.luzes.length * .6) : this.luzes.length;
    this.luzes.forEach((L, i) => { L.visible = i < lim; });
    if (ant !== null && n > ant && !ls.get('acf-imr-qaviso', false)) { ls.set('acf-imr-qaviso', true); avisar('⚙ Qualidade ajustada sozinha para ficar fluido (Opções › Gráficos).'); }
    ls.set('acf-imr-qual', { n, ts: agora() });
    this.carencia(2500);
  },
  resolucao(esc) {
    const ap = this.ap, ren = ap.ren, el = ren.domElement, pai = el.parentElement, w = (pai && pai.clientWidth) || innerWidth, h = (pai && pai.clientHeight) || innerHeight;
    // Modo Tela: a resolução é a que o Mestre escolheu (os outros degraus da qualidade automática continuam valendo)
    const fixa = window.ACF_TELA && ACF_TELA.dpr ? ACF_TELA.dpr(h) : 0;
    const quer = fixa || Math.max(.35, this.base * esc);
    if (Math.abs(ren.getPixelRatio() - quer) < .01) return;
    ren.setPixelRatio(quer); ren.setSize(w, h, false); try { ap.pos.tamanho(w, h, quer); } catch (e) {}
  },
  cam() { return this.ap && this.aplicado !== null ? DEGRAUS[this.aplicado].cam || '' : ''; },
  quadro(ap) {
    const t = performance.now();
    // o 1º quadro (a abertura prepara a sala antes de desenhar) e a troca de andar também têm carência
    if (this.primeiro || this.andar !== ap.a) { this.primeiro = false; this.andar = ap.a; this.carencia(4000); }
    if (DEGRAUS[this.nivel].part && M() && M().Vista && M().Vista.beam && !this.manual('poeira', true)) M().Vista.beam.pts.visible = false;
    // quadro muito longo (aba em segundo plano, materiais compilando): recomeça a medir
    const ult = this.quadros[this.quadros.length - 1];
    // (num aparelho muito lento um quadro passa de 1 s: a janela de medida é de 2 s)
    if (ult && t - ult > 2500) { this.quadros = []; this.ignorarAte = t + 1500; }
    this.quadros.push(t);
    while (this.quadros.length > 2 && t - this.quadros[0] > 2000) this.quadros.shift();
    if (t - this.t1 < 1000) return;
    this.t1 = t;
    // a janela do site foi trocada (o 3D reabre): a resolução volta ao padrão; reaplica
    if (this.aplicado !== null) this.resolucao(this.manual('escala', 1) ? 1 : DEGRAUS[this.aplicado].esc);
    if (!this.ligado()) { if (this.nivel) this.aplicar(0); this.baixo = this.alto = 0; return; }
    if (t < this.ignorarAte || document.hidden || this.quadros.length < 2) return;
    // a janela de 2 s ainda tem quadros de antes da carência: espera encher de novo
    if (this.quadros[0] < this.ignorarAte) return;
    const fps = (this.quadros.length - 1) * 1000 / (this.quadros[this.quadros.length - 1] - this.quadros[0]);
    this.fps = fps;
    const teto = num(ap.CFG.fps, 0) > 0 ? num(ap.CFG.fps) : 60;
    const foco = typeof document.hasFocus !== 'function' || document.hasFocus();
    const baixo = foco && fps < Math.min(26, teto * .8), alto = fps >= teto * .92;
    this.baixo = baixo ? this.baixo + 1 : 0;
    // folga: um segundo um pouco abaixo (oscilação normal perto do teto) só desconta; queda de verdade zera
    this.alto = alto ? this.alto + 1 : fps >= teto * .8 ? Math.max(0, this.alto - 2) : 0;
    // um minuto firme no degrau depois de subir: a espera para subir volta ao normal
    if (this.espera > SOBE && agora() - this.ultTroca > 60000) this.espera = SOBE;
    if (this.baixo >= QUEDA && this.nivel < DEGRAUS.length - 1) {
      // caiu logo depois de subir: espera o dobro para tentar subir de novo (sem ficar oscilando)
      if (agora() - this.ultSubida < 30000) this.espera = Math.min(ESPERA_MAX, this.espera * 2);
      this.baixo = 0; this.alto = 0; this.ultTroca = agora(); this.aplicar(this.nivel + 1);
    } else if (this.alto >= this.espera && this.nivel > 0) {
      this.alto = 0; this.baixo = 0; this.ultSubida = this.ultTroca = agora(); this.aplicar(this.nivel - 1);
    }
  },
  desc() { return this.aplicado === null ? 'abra o 3D' : `degrau ${this.aplicado} de ${DEGRAUS.length - 1} (${DEGRAUS[this.aplicado].nome})${this.fps ? ` · ${Math.round(this.fps)} quadros/s` : ''}`; },
};

/* =========================================================
   4. AMBIENTE QUE REAGE (só na tela de quem vê; nada é gravado)
   ========================================================= */
const RX_TELA = /(^|_)(tv|crt|telao|telas?|monitor|terminal|computador|notebook|tela)(_|$)/;
const Amb = {
  fontes: new Map(), posF: new Map(), telas: [], sigTelas: '', matsTela: new Map(), ultZumbido: 0, t03: 0, tTela: 0,
  fonte(k, x, z, dur) {
    const f = this.fontes.get(k), nova = !f || agora() > f.ate;
    this.fontes.set(k, { x, z, ate: agora() + dur * 1000, ini: nova ? agora() : f.ini, sem: (f && f.sem) || Math.random() * 10 });
    if (nova) this.zumbido(x, z);
  },
  limpar() { this.fontes.clear(); this.posF.clear(); this.restaurarTelas(); this.telas = []; this.sigTelas = ''; const v = $('.s3d-video'); if (v) v.classList.remove('imr-chiado'); },
  // Mestre e auxiliares: a posição real de cada Filho que anda no andar aberto
  vigiarFilhos(ap) {
    if (!souMestre() && !souAux()) return;
    Object.entries(tokens()).forEach(([id, tk]) => {
      if (!tk || tipoDe(tk) !== 'filho' || tk.a !== ap.a) { this.posF.delete(id); return; }
      const p = ap.planta3D(tk.x, tk.y), u = this.posF.get(id);
      this.posF.set(id, p);
      if (u && Math.hypot(p[0] - u[0], p[1] - u[1]) > .12) this.fonte('f' + id, p[0], p[1], 1.4);
    });
  },
  // quanto uma luz ou tela perto de (x, z) é afetada agora (0 nada, 1 muito)
  forca(x, z, raio) {
    let k = 0; const t = agora();
    this.fontes.forEach(f => { if (t > f.ate) return; const d = Math.hypot(f.x - x, f.z - z); if (d < raio) k = Math.max(k, (1 - d / raio) * Math.min(1, (f.ate - t) / 600)); });
    return k;
  },
  pisca(t, sem, k) { const on = Math.sin(t * 31 + sem * 7) > -.1 && Math.sin(t * 9.3 + sem) > -.55 && Math.random() > .12; return on ? 1 - k * .35 * Math.random() : .05 + (1 - k) * .4; },
  quadro(ap, dw, t) {
    if (ap.CFG.ambiente === false) { if (this.fontes.size) { this.fontes.clear(); if (this.matsTela.size) this.restaurarTelas(); } return; }   // Modo Desempenho
    this.t03 -= dw;
    if (this.t03 <= 0) { this.t03 = .3; this.vigiarFilhos(ap); }
    const agoraMs = agora();
    for (const [k, f] of this.fontes) if (agoraMs > f.ate + 400) this.fontes.delete(k);
    const vid = $('.s3d-video');
    if (!this.fontes.size) { if (this.matsTela.size) this.restaurarTelas(); if (vid) vid.classList.remove('imr-chiado'); return; }
    // luzes do conjunto (o sala3d.js põe a intensidade a cada quadro; aqui só multiplica)
    Qual.luzes.forEach((L, i) => { if (!L.visible || L.intensity <= 0) return; const k = this.forca(L.position.x, L.position.z, 8.5); if (k > .02) L.intensity *= this.pisca(t, i * 1.37, k); });
    // brilho das lâmpadas e telas de cada sala carregada
    ap.mundo.carregadas.forEach((c, p) => {
      const S = ap.mundo.S[p]; if (!S || c.extra) return;
      const k = this.forca(S.cx, S.cz, 12); if (k < .05) return;
      const f = this.pisca(t, p * .71, k);
      c.emissivos.forEach(o => { o.m.emissiveIntensity *= f; });
    });
    // telas: chiado (cor e brilho tremendo)
    this.tTela -= dw; if (this.tTela <= 0) { this.tTela = 1; this.acharTelas(ap); }
    let algum = false;
    this.telas.forEach(tl => {
      const k = this.forca(tl.x, tl.z, 10);
      tl.mats.forEach(m => {
        if (k < .05) { this.restaurar(m); return; }
        algum = true;
        let b = this.matsTela.get(m); if (!b) { b = { c: m.emissive.clone(), i: m.emissiveIntensity }; this.matsTela.set(m, b); }
        const r = Math.random();
        m.emissive.setRGB(.55 + r * .45, .6 + r * .4, .7 + Math.random() * .3);
        m.emissiveIntensity = (b.i || .6) * (Math.random() < .25 ? .1 : .6 + Math.random() * 1.6);
      });
    });
    if (vid) { const perto = this.forca(ap.camera.position.x, ap.camera.position.z, 12) > .05; vid.classList.toggle('imr-chiado', perto); }
    if (!algum && this.matsTela.size) this.restaurarTelas();
  },
  restaurar(m) { const b = this.matsTela.get(m); if (!b) return; m.emissive.copy(b.c); m.emissiveIntensity = b.i; this.matsTela.delete(m); },
  restaurarTelas() { [...this.matsTela.keys()].forEach(m => this.restaurar(m)); },
  // monitores, TVs, telões e terminais das salas carregadas (interações ligar/vídeo e peças com tela)
  acharTelas(ap) {
    const sig = [...ap.mundo.carregadas.keys()].join(',');
    if (sig === this.sigTelas) return;
    this.restaurarTelas(); this.sigTelas = sig; this.telas = [];
    const T = ap.T, v = new T.Vector3();
    ap.mundo.carregadas.forEach((c, p) => {
      const S = ap.mundo.S[p], itens = ((S && S.cena) || {}).itens || [];
      c.g.children.forEach(o => {
        const it = itens[o.userData.i] || {}, nome = String(it.t || o.userData.t || '').toLowerCase();
        const int = o.userData.int && o.userData.int.m;
        if (!(RX_TELA.test(nome) || int === 'ligar' && RX_TELA.test(String(it.intN || nome).toLowerCase().replace(/\s+/g, '_')) || int === 'video' || o.userData.tela)) return;
        const mats = new Set();
        o.traverse(x => { if (x.isMesh && x.material && !Array.isArray(x.material) && x.material.emissive && x.material.emissiveIntensity > .05) mats.add(x.material); });
        if (!mats.size) return;
        o.getWorldPosition(v);
        this.telas.push({ x: v.x, z: v.z, mats: [...mats] });
      });
    });
  },
  zumbido(x, z) {
    const ap = api3(); if (!ap || !Som.ok() || agora() - this.ultZumbido < 2500) return;
    const cp = ap.camera.position; if (Math.hypot(cp.x - x, cp.z - z) > 15) return;
    this.ultZumbido = agora();
    const c = Som.ctx(), out = Som.saida(), t = c.currentTime;
    Som.ouvinteNaCamera(ap);
    const p = c.createPanner(); p.panningModel = celular() ? 'equalpower' : 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 2; p.maxDistance = 40; p.rolloffFactor = 1.1;
    if (p.positionX) { p.positionX.value = x; p.positionY.value = 2.6; p.positionZ.value = z; } else p.setPosition(x, 2.6, z);
    p.connect(out);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 360; bp.Q.value = 1.1;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .04);
    for (let i = 0; i < 9; i++) g.gain.setValueAtTime(Math.random() < .35 ? .015 : .1 + Math.random() * .06, t + .06 + i * .1);
    g.gain.exponentialRampToValueAtTime(.0001, t + 1.15);
    bp.connect(g); g.connect(p);
    const os = [['sawtooth', 60], ['square', 120], ['sawtooth', 180]].map(([tp, f]) => { const o = c.createOscillator(); o.type = tp; o.frequency.value = f * (1 + (Math.random() - .5) * .01); o.connect(bp); o.start(t); o.stop(t + 1.2); return o; });
    for (let i = 0; i < 4; i++) Som.ruido(t + .1 + Math.random() * .8, p, { tipo: 'highpass', bp: 3200, v: .09, ataque: .003, dur: .04 + Math.random() * .05 });
    // a cadeia inteira sai do grafo quando acaba (antes só o panner saía: osciladores, filtro e ganho ficavam pendurados)
    setTimeout(() => { [...os, bp, g, p].forEach(x => { try { x.disconnect(); } catch (e) {} }); }, 1800);
  },
};

/* =========================================================
   5. MARCAS QUE FICAM: mapa/marcas/<k> = { a, x, y, t: g (garras) | r (rastro), r (ângulo), ts, c (cena) }
   A tela do Mestre grava (sem dizer quem); o "Nova cena" apaga. No 3D, decalques no chão
   (e na parede, se o ataque foi perto dela).
   ========================================================= */
const MAX_MARCAS = 80;
const Marcas = {
  ult: {}, fx: {}, cenaAnt: undefined,
  aVista: tk => !tk.h && !tk.oc && !tk.fo && !tk.pp && !tk.cp,
  gravar() {
    if (!souMestre() || I().espiar || !A().pronto) return;
    const c = (est().cena || {}).id || '';
    if (this.cenaAnt === undefined) this.cenaAnt = c;
    else if (c !== this.cenaAnt) { this.cenaAnt = c; this.ult = {}; if (Object.keys(est().marcas || {}).length) A().definir(['marcas'], null); return; }
    const tks = tokens(), on = !!persg().on, mu = MU();
    Object.entries(tks).forEach(([id, tk]) => {
      if (!tk || tipoDe(tk) !== 'filho' || !tk.a) return;
      // ataque (o Controle do Filho grava tk.fx = { t: 'atk', ts }): garras onde ele está
      const fx = tk.fx, fts = fx && fx.t === 'atk' ? num(fx.ts) : 0;
      if (this.fx[id] === undefined) this.fx[id] = fts;
      else if (fts && fts !== this.fx[id]) { this.fx[id] = fts; if (agora() - fts < 20000) this.nova('g', tk, this.rumoAlvo(tk)); }
      // perseguição: rastro a cada ~2 m de regra que um Filho à vista anda
      const u = this.ult[id];
      if (!u || u.a !== tk.a || !on || !this.aVista(tk)) { this.ult[id] = { a: tk.a, x: tk.x, y: tk.y }; return; }
      const d = Math.hypot(tk.x - u.x, tk.y - u.y) * mu;
      if (d >= 2.2) {
        const n = Math.min(3, Math.floor(d / 2.2));
        for (let i = 1; i <= n; i++) { const f = i / (n + 1); this.nova('r', { a: tk.a, x: u.x + (tk.x - u.x) * f, y: u.y + (tk.y - u.y) * f }, Math.atan2(tk.x - u.x, tk.y - u.y)); }
        this.ult[id] = { a: tk.a, x: tk.x, y: tk.y };
      }
    });
  },
  // para onde a garra aponta: a cobaia mais perto (ou ao acaso)
  rumoAlvo(f) {
    let best = null, bd = 9;
    Object.values(tokens()).forEach(c => { if (tipoDe(c) !== 'cobaia' || c.a !== f.a) return; const d = Math.hypot(c.x - f.x, c.y - f.y); if (d < bd) { bd = d; best = c; } });
    return best ? Math.atan2(best.x - f.x, best.y - f.y) : Math.random() * Math.PI * 2;
  },
  nova(t, tk, ang) {
    const todas = Object.entries(est().marcas || {});
    if (todas.length >= MAX_MARCAS) todas.sort((a, b) => num(a[1].ts) - num(b[1].ts)).slice(0, todas.length - MAX_MARCAS + 1).forEach(([k]) => A().definir(['marcas', k], null));
    const k = 'm' + agora().toString(36) + Math.random().toString(36).slice(2, 5);
    const W = A().geo.W, H = A().geo.H;
    A().definir(['marcas', k], { a: tk.a, x: +clamp(tk.x, 0, W).toFixed(2), y: +clamp(tk.y, 0, H).toFixed(2), t, r: +(num(ang) % (Math.PI * 2)).toFixed(2), ts: agora(), c: String((est().cena || {}).id || '').slice(0, 40) });
  },
};
// texturas dos decalques, desenhadas na hora
function texMarca(tipo) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.clearRect(0, 0, 256, 256);
  const rnd = (() => { let s = tipo === 'g' ? 7 : tipo === 'p' ? 19 : 13; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  if (tipo === 'g' || tipo === 'p') {
    // garras: quatro sulcos paralelos, escuros no meio e claros na borda (na parede, 'p', mais secos)
    for (let i = 0; i < 4; i++) {
      const x0 = 70 + i * 34 + rnd() * 6, y0 = 30 + rnd() * 20, x1 = x0 + 30 + rnd() * 10, y1 = 220 + rnd() * 18;
      x.lineCap = 'round';
      x.strokeStyle = 'rgba(230,214,192,.6)'; x.lineWidth = 15; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(x0 + 22, 128, x1, y1); x.stroke();
      x.strokeStyle = tipo === 'p' ? 'rgba(25,18,14,.95)' : 'rgba(96,8,10,.95)'; x.lineWidth = 8; x.beginPath(); x.moveTo(x0, y0 + 6); x.quadraticCurveTo(x0 + 22, 128, x1, y1 - 8); x.stroke();
      x.strokeStyle = 'rgba(0,0,0,.95)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(x0 + 1, y0 + 14); x.quadraticCurveTo(x0 + 23, 128, x1 - 1, y1 - 16); x.stroke();
    }
    if (tipo === 'g') for (let i = 0; i < 22; i++) { x.fillStyle = `rgba(${120 + rnd() * 50},6,10,${.6 + rnd() * .35})`; x.beginPath(); x.arc(60 + rnd() * 150, 60 + rnd() * 150, 2 + rnd() * 7, 0, 7); x.fill(); }
  } else {
    // rastro: mancha arrastada, mais forte no começo
    const g = x.createLinearGradient(0, 30, 0, 230); g.addColorStop(0, 'rgba(60,6,8,.0)'); g.addColorStop(.25, 'rgba(92,10,12,.8)'); g.addColorStop(.8, 'rgba(58,10,10,.6)'); g.addColorStop(1, 'rgba(40,8,6,0)');
    x.fillStyle = g;
    for (let i = 0; i < 9; i++) { const w = 30 + rnd() * 40, cx = 100 + rnd() * 56; x.beginPath(); x.ellipse(cx, 130, w / 2, 100 - rnd() * 20, (rnd() - .5) * .15, 0, 7); x.fill(); }
    x.strokeStyle = 'rgba(10,3,3,.55)'; x.lineWidth = 2;
    for (let i = 0; i < 7; i++) { const sx = 92 + rnd() * 72; x.beginPath(); x.moveTo(sx, 50 + rnd() * 30); x.lineTo(sx + (rnd() - .5) * 10, 200 + rnd() * 30); x.stroke(); }
    for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(110,8,10,${.45 + rnd() * .4})`; x.beginPath(); x.arc(70 + rnd() * 120, 40 + rnd() * 180, 1.5 + rnd() * 5, 0, 7); x.fill(); }
  }
  return c;
}
const MarcasVista = {
  ap: null, grupo: null, objs: new Map(), sig: '', mats: null, geo: null, t05: 0,
  iniciar(ap) {
    const T = ap.T; this.ap = ap; this.objs.clear(); this.sig = '';
    this.grupo = new T.Group(); this.grupo.name = 'imr-marcas'; ap.cena.add(this.grupo);
    const mk = tp => { const tx = new T.CanvasTexture(texMarca(tp)); tx.encoding = T.sRGBEncoding; tx.anisotropy = 4; return new T.MeshLambertMaterial({ map: tx, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }); };
    this.mats = { g: mk('g'), r: mk('r'), p: mk('p') };
    this.geo = new T.PlaneGeometry(1, 1);
  },
  fechar() {
    const ap = this.ap; if (!ap) return;
    try { ap.cena.remove(this.grupo); } catch (e) {}
    if (this.mats) Object.values(this.mats).forEach(m => { try { m.map.dispose(); m.dispose(); } catch (e) {} });
    try { this.geo.dispose(); } catch (e) {}
    this.objs.clear(); this.ap = null; this.grupo = null;
  },
  quadro(dw) {
    this.t05 -= dw; if (this.t05 > 0 || !this.ap) return; this.t05 = .5;
    const ap = this.ap, lst = Object.entries(est().marcas || {}).filter(([, m]) => m && m.a === ap.a);
    const sig = lst.map(([k]) => k).join(',');
    if (sig === this.sig) return; this.sig = sig;
    const quer = new Set(lst.map(([k]) => k));
    [...this.objs.keys()].forEach(k => { if (!quer.has(k)) { this.objs.get(k).forEach(o => this.grupo.remove(o)); this.objs.delete(k); } });
    lst.forEach(([k, m], i) => { if (!this.objs.has(k)) this.objs.set(k, this.criar(k, m, i)); });
  },
  criar(k, m, i) {
    const ap = this.ap, T = ap.T, [X, Z] = ap.planta3D(num(m.x), num(m.y)), h = parseInt(hashTxt(k), 36) || 1, j = (h % 1000) / 1000;
    const out = [];
    const chao = new T.Mesh(this.geo, m.t === 'g' ? this.mats.g : this.mats.r);
    chao.rotation.x = -Math.PI / 2; chao.rotation.z = -num(m.r) + (j - .5) * .5;
    if (m.t === 'g') chao.scale.set(1.5 + j * .4, 1.7 + j * .3, 1); else chao.scale.set(.9 + j * .3, 1.9 + j * .6, 1);
    chao.position.set(X, .012 + (i % 7) * .0015, Z); chao.renderOrder = 2; chao.raycast = () => {};
    this.grupo.add(chao); out.push(chao);
    // garras perto de uma parede: também na parede
    if (m.t === 'g') {
      const p = ap.salaNoPonto3D(X, Z), S = p && ap.mundo.S[p];
      if (S) {
        const ds = [['w', X - S.x0], ['e', S.x1 - X], ['n', Z - S.z0], ['s', S.z1 - Z]].sort((a, b) => a[1] - b[1]);
        const [lado, d] = ds[0];
        if (d < 2) {
          const par = new T.Mesh(this.geo, this.mats.p); par.scale.set(.9 + j * .3, 1.1 + j * .3, 1); par.raycast = () => {};
          const y = 1 + j * .6;
          if (lado === 'w') { par.position.set(S.x0 + .03, y, Z); par.rotation.y = Math.PI / 2; }
          else if (lado === 'e') { par.position.set(S.x1 - .03, y, Z); par.rotation.y = -Math.PI / 2; }
          else if (lado === 'n') { par.position.set(X, y, S.z0 + .03); }
          else { par.position.set(X, y, S.z1 - .03); par.rotation.y = Math.PI; }
          par.rotation.z = (j - .5) * .6; par.renderOrder = 2;
          this.grupo.add(par); out.push(par);
        }
      }
    }
    return out;
  },
};

/* =========================================================
   6. BACKUP AUTOMÁTICO (tela do Mestre): segredosBk/idx/<k> = { ts, n, kb, dia } e
   segredosBk/d/<k> = o pacote do "Baixar backup" em texto (JSON). Guarda os 6 últimos.
   ========================================================= */
const Bk = {
  PER: 15 * 60000, MAX: 6, prox: 0, ultHash: '', idx: null, salvando: false,
  local() { return !A().firebase; },
  pronto() { return souMestre() && A().segredosProntos && I().Priv && I().Priv.pronto && typeof A().pacoteBackup === 'function'; },
  async lerIdx() {
    if (this.local()) { this.idx = (ls.get('acf-bkauto', {}) || {}).idx || {}; return this.idx; }
    this.idx = (await A().Rede.once('segredosBk/idx').catch(() => null)) || {};
    return this.idx;
  },
  ultimo() { const l = Object.values(this.idx || {}).filter(x => x && x.ts); return l.length ? Math.max(...l.map(x => num(x.ts))) : 0; },
  async tick() {
    if (!this.pronto() || this.salvando) return;
    if (this.idx === null) { await this.lerIdx(); this.prox = Math.max(agora() + 60000, this.ultimo() + this.PER); this.desenhar(); return; }
    // com o 3D aberto e a câmera andando, espera ela parar (o backup monta e confere o estado inteiro de uma vez)
    if (agora() >= this.prox && !(window.Sala3D && Sala3D.aberta && Sala3D.parado === false)) await this.salvar(false);
  },
  async salvar(manual) {
    if (this.salvando || !this.pronto()) return false;
    this.salvando = true;
    try {
      const pac = await A().pacoteBackup();
      const txt = JSON.stringify(pac), h = hashTxt(JSON.stringify({ ...pac, salvoEm: 0 }));
      if (!manual && h === this.ultHash) { this.prox = agora() + this.PER; return false; }
      const k = 'b' + pac.salvoEm.toString(36);
      const info = { ts: pac.salvoEm, n: Object.keys((pac.mapa || {}).tokens || {}).length, kb: Math.round(txt.length / 1024), dia: num(((pac.mapa || {}).ruido || {}).d, 1) || 1 };
      if (this.local()) {
        const b = ls.get('acf-bkauto', {}) || {}; b.idx = b.idx || {}; b.d = b.d || {};
        b.idx[k] = info; b.d[k] = txt;
        let chaves = Object.keys(b.idx).sort((x, y) => num(b.idx[x].ts) - num(b.idx[y].ts));
        while (chaves.length > this.MAX) { const v = chaves.shift(); delete b.idx[v]; delete b.d[v]; }
        while (!ls.set('acf-bkauto', b) && chaves.length > 1) { const v = chaves.shift(); delete b.idx[v]; delete b.d[v]; }
        this.idx = b.idx;
      } else {
        await A().Rede.set('segredosBk/d/' + k, txt);
        await A().Rede.set('segredosBk/idx/' + k, info);
        this.idx = { ...(this.idx || {}), [k]: info };
        const velhas = Object.keys(this.idx).sort((x, y) => num(this.idx[x].ts) - num(this.idx[y].ts));
        while (velhas.length > this.MAX) { const v = velhas.shift(); delete this.idx[v]; A().Rede.set('segredosBk/idx/' + v, null).catch(() => {}); A().Rede.set('segredosBk/d/' + v, null).catch(() => {}); }
      }
      this.ultHash = h; this.prox = agora() + this.PER;
      this.desenhar();
      return true;
    } catch (e) { console.warn('backup automático:', e); this.prox = agora() + 5 * 60000; return false; }
    finally { this.salvando = false; }
  },
  async pacote(k) {
    if (this.local()) return JSON.parse(((ls.get('acf-bkauto', {}) || {}).d || {})[k] || 'null');
    const txt = await A().Rede.once('segredosBk/d/' + k).catch(() => null);
    return txt ? JSON.parse(txt) : null;
  },
  desenhar() {
    const b = $('#blocoBackup'); if (!b || !souMestre()) return;
    let d = $('#imrBk', b);
    if (!d) { d = document.createElement('div'); d.id = 'imrBk'; d.className = 'imr-bk'; const f = $('.ferramentas', b); if (f) f.after(d); else b.appendChild(d); }
    const u = this.ultimo();
    const html = `<p class="mini">🕒 Backup automático: a tela do Mestre guarda sozinha a cada 15 min, no servidor, os 6 últimos. ${u ? `Último: ${data(u)} às ${hora(u)}.` : 'Ainda nenhum.'}</p><div class="ferramentas"><button type="button" class="btn-fantasma" data-imr="bk-lista">Voltar a um backup automático…</button></div>`;
    if (d.dataset.h !== html) { d.dataset.h = html; d.innerHTML = html; }
  },
  async abrirLista() {
    await this.lerIdx(); this.desenhar();
    const lst = Object.entries(this.idx || {}).filter(([, v]) => v && v.ts).sort((a, b) => num(b[1].ts) - num(a[1].ts));
    const html = `<header class="imr-cab"><b>Backups automáticos</b><button type="button" class="imr-x" data-imr="fechar" aria-label="Fechar">✕</button></header>
      <p class="mini">Guardados pela tela do Mestre a cada 15 min (só quando algo mudou). Voltar a um deles devolve mapa, segredos e anotações àquele ponto; o diário atual é mantido. Antes, baixe um backup do jeito de sempre se quiser guardar o estado de agora.</p>
      ${lst.length ? `<ul class="imr-bk-lista">${lst.map(([k, v]) => `<li><span><b>${data(v.ts)} · ${hora(v.ts)}</b><small>Dia ${num(v.dia, 1)} na Caixa · ${num(v.n)} tokens · ${num(v.kb)} KB</small></span><button type="button" class="btn-roxo" data-imr="bk-volta" data-k="${esc(k)}">Voltar</button></li>`).join('')}</ul>` : '<p class="mini">Ainda não há backups automáticos. O primeiro sai até 15 minutos depois de abrir a tela do Mestre.</p>'}
      <div class="imr-bts"><button type="button" data-imr="bk-agora">Guardar um agora</button><button type="button" data-imr="fechar" class="pri">Fechar</button></div>`;
    modal('imrBkModal', html);
  },
  async voltar(k) {
    const info = (this.idx || {})[k]; if (!info) return;
    if (!confirm(`Voltar ao backup automático de ${data(info.ts)} às ${hora(info.ts)}?\n\nTokens, salas, ruído, dia, perseguição, funções e anotações voltam a esse ponto. Todos os jogadores verão o mapa mudar. O diário atual é mantido.`)) return;
    const pac = await this.pacote(k);
    if (!pac || pac.tipo !== 'planta-acf-backup' || !pac.mapa) { A().aviso('Não consegui ler esse backup.'); return; }
    fecharModal('imrBkModal');
    A().restaurarPacote(pac, 'automático');
  },
};

/* =========================================================
   7. RESUMO AUTOMÁTICO DA SESSÃO (tela do Mestre, no Encerramento)
   Só usa o que o site já registra: Diário, Relatório da Mesa, chat (itens pegos),
   interações do 3D (mapa/inter) e as marcas. Não cita Filhos nem salas não reveladas.
   ========================================================= */
const Resumo = {
  visto: ls.get('acf-imr-resumo', ''), tAbre: null, minPv: ls.get('acf-imr-minpv', null),
  vigiar() {
    if (!souMestre() || I().espiar) return;
    // menor PV de cada cobaia nesta sessão (para "quem quase morreu")
    const ab = est().abertura, ses = (ab && ab.id) || 'x';
    if (!this.minPv || this.minPv.ses !== ses) this.minPv = { ses, por: {} };
    let mudou = false;
    Object.entries(tokens()).forEach(([id, tk]) => {
      if (tipoDe(tk) !== 'cobaia' || !tk.vit) return;
      const pvM = num(tk.vit.pvM), pv = num(tk.vit.pv, pvM); if (pvM <= 0) return;
      const r = pv / pvM, u = this.minPv.por[id];
      if (!u || r < u.r) { this.minPv.por[id] = { r: +r.toFixed(3), pv, pvM, ts: agora() }; mudou = true; }
    });
    if (mudou) ls.set('acf-imr-minpv', this.minPv);
    // encerramento novo: abre o resumo depois que a tela do encerramento termina
    const en = est().encerramento;
    if (!en || !en.id || en.id === this.visto) return;
    if (agora() - num(en.ts) > 30 * 60000) { this.visto = en.id; ls.set('acf-imr-resumo', en.id); return; }
    const fim = num(en.ts) + clamp(num(en.dur, 75), 25, 300) * 1000 + 2500;
    if (!en.on || agora() >= fim) { this.visto = en.id; ls.set('acf-imr-resumo', en.id); this.abrir(en); }
  },
  inicio(fim) {
    const ab = est().abertura;
    if (ab && num(ab.ts) && num(ab.ts) < fim) return num(ab.ts);
    const ds = Object.values(A().segredos._diario || {}).filter(e => e && e.k === 'sessao' && /^Nova sessão/.test(e.txt || '') && num(e.ts) < fim).sort((a, b) => num(b.ts) - num(a.ts));
    return ds.length ? num(ds[0].ts) : fim - 6 * 3600000;
  },
  nomeCn(cn) { const n = A().salaRevelada(cn) ? String(A().nomeSala(cn) || '').replace(/^CN \d+\s*·?\s*/, '') : ''; return `CN ${pad2(cn)}${n ? ' ' + n : ''}`; },
  nome: id => (SERd(id) || {}).nome || id,
  async montar(en) {
    const fim = en && num(en.ts) ? num(en.ts) : agora(), ini = this.inicio(fim);
    const nos = e => num(e.ts) >= ini && num(e.ts) <= fim + 60000;
    const diario = Object.values(A().segredos._diario || {}).filter(e => e && nos(e)).sort((a, b) => num(a.ts) - num(b.ts));
    // salas visitadas pelas cobaias (movimentos do Diário)
    const salas = new Map(), porCob = {};
    diario.forEach(e => {
      if (e.k !== 'mov' || !e.quem || !e.a1 || tipoDe({ s: e.s || e.quem }) !== 'cobaia') return;
      const p = I().salaEm(e.a1, num(e.x1), num(e.y1)); if (!p) return;
      const cn = I().cnDe(e.a1, p); salas.set(cn, (salas.get(cn) || 0) + 1);
      (porCob[e.quem] = porCob[e.quem] || new Set()).add(cn);
    });
    // começo da sessão: onde cada uma estava
    const enc = diario.filter(e => /^Encontro confirmado/.test(e.txt || '')), falsos = diario.filter(e => /^Encontro cancelado/.test(e.txt || '')).length;
    const cnsEnc = enc.map(e => (/CN (\d+)/.exec(e.txt) || [])[1]).filter(Boolean).map(n => 'CN ' + pad2(+n));
    const persgs = diario.filter(e => /^Perseguição iniciada/.test(e.txt || '') || /^Perseguição começou/.test(e.txt || '')).length;
    const sustos = diario.filter(e => /^Susto só para/.test(e.txt || '')).length;
    const corpos = diario.filter(e => /o corpo ficou em/.test(e.txt || '')).map(e => String(e.txt).split(':')[0]);
    // quem quase morreu: caiu (Relatório da Mesa), óbito, ou chegou a 25% dos PV ou menos
    let rel = null; try { rel = MESA().agregarRelatorio ? await MESA().agregarRelatorio(ini, fim + 60000) : null; } catch (e) {}
    const quase = [];
    const cobs = (A().SERES || []).filter(s => s.tipo === 'cobaia').map(s => s.id);
    cobs.forEach(id => {
      const r = rel && rel.por[id], m = this.minPv && this.minPv.por[id], partes = [];
      if (r && r.fim === 'óbito') partes.push('morreu');
      else if (r && r.caiu) partes.push(`caiu ${r.caiu > 1 ? r.caiu + ' vezes' : 'uma vez'} em Morrendo${r.voltou ? ' e voltou' : ''}`);
      if (m && m.r <= .25 && !(r && r.fim === 'óbito')) partes.push(`chegou a ${Math.max(0, Math.round(m.pv))}/${Math.round(m.pvM)} PV`);
      if (r && r.fim === 'insano') partes.push('enlouqueceu');
      if (partes.length) quase.push(`${this.nome(id)} (${partes.join(', ')})`);
    });
    // itens achados: as mensagens do chat que o site já manda ao pegar e vestir
    const chat = (await A().Rede.once('chat/geral').catch(() => null)) || {};
    const itens = [];
    Object.values(chat).filter(m => m && nos(m)).sort((a, b) => num(a.ts) - num(b.ts)).forEach(m => {
      const t = String(m.t || ''); let r = /^🎒 (.+?) pegou: (.+?)\.?$/.exec(t);
      if (r) { itens.push(`${r[1]}: ${r[2]}`); return; }
      r = /^🦺 (.+?) vestiu: (.+?)\.?$/.exec(t); if (r) itens.push(`${r[1]} vestiu ${r[2]}`);
    });
    // interações curiosas do 3D (mapa/inter): o que foi usado, onde e por quem
    const cenas = A().segredos._3d || {}, VERBO = { abrir: 'aberto', ligar: 'ligado', jogar: 'jogado', tocar: 'tocado', ler: 'lido', video: 'com vídeo', vestir: 'usado' };
    const usos = new Map();
    Object.entries(est().inter || {}).forEach(([k, v]) => {
      if (!v || !nos(v)) return;
      const m = /^c(\d+)_(\d+)$/.exec(k); if (!m) return;
      const cn = +m[1], it = ((cenas['c' + cn] || {}).itens || [])[+m[2]] || {}, int = it.int || '';
      if (int === 'abrir' && !/cofre|caixa|gaveta|ba[uú]|arm[aá]rio|geladeira/i.test(String(it.intN || it.t || ''))) return;   // portões e portas comuns não contam
      const nome = String(it.intN || it.nome || String(it.t || 'objeto').replace(/_/g, ' ')).trim();
      const quem = v.q && SERd(v.q) ? this.nome(v.q) : '';
      const ch = cn + '|' + nome; const u = usos.get(ch) || { cn, nome, verbo: VERBO[int] || 'usado', quem: new Set(), n: 0 };
      u.n++; if (quem) u.quem.add(quem); usos.set(ch, u);
    });
    const marcas = Object.keys(est().marcas || {}).length;
    // texto (revisável)
    const ab = est().abertura || {}, dur = Math.max(0, Math.round((fim - ini) / 60000));
    const durTxt = dur >= 60 ? `${Math.floor(dur / 60)}h${pad2(dur % 60)}` : `${dur} min`;
    const titulo = [ab.num ? `Sessão ${ab.num}` : 'Sessão', ab.nome || ''].filter(Boolean).join(': ');
    const L = [`📝 RESUMO DA SESSÃO · ${titulo}`, `${data(ini)} · ${hora(ini)} às ${hora(fim)} (${durTxt})`, ''];
    const lista = salas.size ? [...salas.keys()].sort((a, b) => a - b).map(cn => this.nomeCn(cn)) : [];
    L.push(`🚪 Salas visitadas (${lista.length}): ${lista.length ? lista.join(', ') : 'nenhum movimento registrado'}`);
    Object.entries(porCob).forEach(([id, s]) => L.push(`   ${this.nome(id)}: ${[...s].sort((a, b) => a - b).map(cn => 'CN ' + pad2(cn)).join(', ')}`));
    L.push(`⚠ Encontros: ${enc.length ? `${enc.length} (${[...new Set(cnsEnc)].join(', ')})` : 'nenhum'}${falsos ? ` · ${falsos} falso${falsos > 1 ? 's' : ''} alarme${falsos > 1 ? 's' : ''}` : ''}`);
    L.push(`🏃 Perseguições: ${persgs || 'nenhuma'}`);
    L.push(`💀 Quem quase morreu: ${quase.length ? quase.join('; ') : 'ninguém'}`);
    if (corpos.length) L.push(`✝ Corpos que ficaram na Caixa: ${corpos.join(', ')}`);
    L.push(`🎒 Itens achados: ${itens.length ? itens.join('; ') : 'nenhum registrado'}`);
    const us = [...usos.values()].sort((a, b) => b.n - a.n).slice(0, 10);
    L.push(`✋ Interações curiosas: ${us.length ? us.map(u => `${u.nome} ${u.verbo} na CN ${pad2(u.cn)}${u.quem.size ? ` (${[...u.quem].join(', ')})` : ''}${u.n > 1 ? ` ${u.n}×` : ''}`).join('; ') : 'nenhuma'}`);
    if (rel && rel.pistas && rel.pistas.length) L.push(`🔎 Pistas: ${rel.pistas.slice(0, 8).join(' | ')}`);
    if (sustos) L.push(`👁 Sustos: ${sustos}`);
    if (marcas) L.push(`🩸 Marcas deixadas na Caixa: ${marcas}`);
    // linhas de outros módulos (perseg3d.js: replays das perseguições), sem citar Filhos nem salas
    (window.ACF_RESUMO_EXTRA || []).forEach(f => { try { const x = f(ini, fim); if (x) [].concat(x).forEach(l => L.push(String(l))); } catch (e) {} });
    return L.join('\n');
  },
  async abrir(en) {
    if (!souMestre()) return;
    const txt = await this.montar(en || null);
    const html = `<header class="imr-cab"><b>📝 Resumo da sessão</b><button type="button" class="imr-x" data-imr="fechar" aria-label="Fechar">✕</button></header>
      <p class="mini">Montado sozinho com o que o site registrou (Diário, Relatório da Mesa, chat, interações do 3D). Revise e edite antes de mandar: o texto não cita Filhos nem nomes de salas que os jogadores não conhecem.</p>
      <textarea class="imr-resumo-txt" rows="14" aria-label="Texto do resumo">${esc(txt)}</textarea>
      <div class="imr-bts"><button type="button" data-imr="res-copiar">📋 Copiar para o grupo</button><button type="button" data-imr="res-chat">💬 Mandar no chat Geral</button><button type="button" data-imr="res-baixar">⬇ Baixar .txt</button><button type="button" data-imr="fechar" class="pri">Fechar</button></div>`;
    modal('imrResumo', html);
  },
  texto() { const t = $('#imrResumo .imr-resumo-txt'); return t ? t.value.trim() : ''; },
  copiar() {
    const t = this.texto(); if (!t) return;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => A().aviso('Resumo copiado. Cole no grupo.'), () => { const ta = $('#imrResumo .imr-resumo-txt'); ta.focus(); ta.select(); A().aviso('Copie o texto selecionado.'); });
  },
  chat() {
    const t = this.texto(); if (!t || !A().enviarChat) return;
    // o chat aceita até 500 caracteres por mensagem: quebra por linha
    const partes = []; let cur = '';
    t.split('\n').forEach(l => { const x = l.length > 480 ? l.slice(0, 477) + '…' : l; if ((cur + '\n' + x).length > 480) { if (cur.trim()) partes.push(cur); cur = x; } else cur = cur ? cur + '\n' + x : x; });
    if (cur.trim()) partes.push(cur);
    partes.slice(0, 8).forEach((p, i) => setTimeout(() => A().enviarChat(p, 'geral'), i * 350));
    A().aviso(`Resumo mandado no chat Geral (${Math.min(8, partes.length)} mensage${partes.length > 1 ? 'ns' : 'm'}).`);
  },
  baixar() {
    const t = this.texto(); if (!t) return;
    const d = new Date(), nome = `resumo-sessao-${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}.txt`;
    baixarBlob(new Blob([t], { type: 'text/plain;charset=utf-8' }), nome);
  },
  desenharBloco() {
    const b = $('#blocoImrResumo'); if (!b) return;
    if (!souMestre()) { b.hidden = true; return; }
    const c = $('#imrResumoBloco', b); if (c && !c.dataset.ok) { c.dataset.ok = '1'; c.innerHTML = '<p class="mini">Abre sozinho quando o Encerramento termina. Junta salas visitadas, encontros, perseguições, quem quase morreu, itens achados e interações curiosas, para revisar e mandar ao grupo.</p><div class="ferramentas"><button type="button" class="btn-fantasma" data-imr="res-abrir">📝 Ver o resumo desta sessão</button></div>'; }
  },
};

/* =========================================================
   Janelas e downloads
   ========================================================= */
function modal(id, html) {
  let m = $('#' + id); if (m) m.remove();
  m = document.createElement('div'); m.id = id; m.className = 'imr-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
  m.innerHTML = `<div class="imr-caixa">${html}</div>`;
  m.addEventListener('click', e => { if (e.target === m) m.remove(); });
  document.body.appendChild(m);
  if (document.pointerLockElement) try { document.exitPointerLock(); } catch (e) {}
  return m;
}
function fecharModal(id) { const m = id ? $('#' + id) : null; if (m) m.remove(); }
function baixarBlob(blob, nome) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* =========================================================
   8. TUTORIAL DA PRIMEIRA VEZ NO 3D (jogador; uma vez por aparelho)
   ========================================================= */
const Tut = {
  i: 0, t: null, el: null,
  tecla(ap, id, pad) { const k = ((ap && ap.CFG && ap.CFG.teclas) || {})[id]; return String(k === undefined ? pad : k || pad).toUpperCase(); },
  cartoes(ap) {
    const t = toque();
    return [
      ['🚶', 'Andar', t ? 'Use o joystick no canto esquerdo. Empurre até o fim para correr.' : `WASD ou as setas. Segure ${this.tecla(ap, 'correr', 'shift') === 'SHIFT' ? 'Shift' : this.tecla(ap, 'correr', 'shift')} para correr.`],
      ['👀', 'Olhar', t ? 'Arraste o dedo na tela para olhar em volta. Pinça aproxima.' : 'Clique na tela para prender o mouse e mova-o para olhar. Esc solta.'],
      ['✋', 'Usar', t ? 'Perto de algo (porta, armário, item), toque no objeto ou no aviso que aparece embaixo.' : `Perto de algo (porta, armário, item), aperte ${this.tecla(ap, 'interagir', 'e')}.`],
      ['🎒', 'Mochila', t ? 'Os itens da sua ficha ficam na Mochila, dentro do menu ☰.' : `${this.tecla(ap, 'mochila', 'i')} abre a mochila com os itens da sua ficha.`],
      ['🔦', 'Lanterna', t ? 'O botão 🔦 Luz embaixo acende a lanterna da ficha. A bateria acaba.' : `${this.tecla(ap, 'lanterna', 'l')} ou o botão 🔦 Luz acende a lanterna da ficha. A bateria acaba.`],
      ['☰', 'Menu', t ? 'O ☰ no topo tem fichas, chat, dados, fotos e as opções.' : `${this.tecla(ap, 'menu', 'm')} (ou ☰ no topo) abre fichas, chat, dados, fotos e as opções.`],
    ];
  },
  talvez(ap) {
    if (!ap.V || ap.V.quem !== 'jog' || (window.ACF && ACF.tv) || ls.get('acf-imr-tutorial', false)) return;   // a TV da mesa não tem quem aperte
    setTimeout(() => { if (api3() === ap && !ls.get('acf-imr-tutorial', false)) this.mostrar(); }, 1600);
  },
  mostrar() {
    const ap = api3(), d = $('#s3d'); if (!ap || !d) return;
    this.fechar(true);
    const el = document.createElement('div'); el.className = 'imr-tut'; el.id = 'imrTut'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Primeiros passos no 3D');
    d.appendChild(el); this.el = el; this.i = 0; this.desenhar();
  },
  desenhar() {
    const ap = api3(), el = this.el; if (!el) return;
    const cs = this.cartoes(ap), [ic, tit, txt] = cs[this.i], ult = this.i === cs.length - 1;
    el.innerHTML = `<div class="imr-tut-ic" aria-hidden="true">${ic}</div><div class="imr-tut-txt"><b>${esc(tit)}</b><p>${esc(txt)}</p></div>
      <div class="imr-tut-pe"><span class="imr-tut-pts">${cs.map((x, i) => `<i class="${i === this.i ? 'on' : ''}"></i>`).join('')}</span>
      <button type="button" data-imr="tut-pular">Pular</button><button type="button" class="pri" data-imr="tut-prox">${ult ? 'Jogar' : 'Próximo ›'}</button></div>
      <div class="imr-tut-barra"><i></i></div>`;
    clearTimeout(this.t); this.t = setTimeout(() => this.prox(), 5000);
  },
  prox() { const cs = this.cartoes(api3()); if (this.i >= cs.length - 1) { this.fechar(); return; } this.i++; this.desenhar(); },
  fechar(semMarcar) { clearTimeout(this.t); if (this.el) this.el.remove(); this.el = null; if (!semMarcar) ls.set('acf-imr-tutorial', true); },
};

/* =========================================================
   9. MODO FOTO (galeria só neste aparelho, em IndexedDB; sem IndexedDB, só nesta aba)
   ========================================================= */
const RX_FLASH = /c[aâ]mera|celular|smartphone|telefone|polaroid/i;
const Foto = {
  mem: [], db: null, urls: [],
  abrirDb() {
    if (this.p) return this.p;
    this.p = new Promise((ok, falha) => {
      try {
        const r = indexedDB.open('acf-imersao', 1);
        r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('fotos')) d.createObjectStore('fotos', { keyPath: 'id' }); };
        r.onsuccess = () => ok(r.result); r.onerror = () => falha(r.error);
      } catch (e) { falha(e); }
    }).catch(() => null);
    return this.p;
  },
  async guardar(f) {
    const db = await this.abrirDb();
    if (!db) { this.mem.push(f); this.mem = this.mem.slice(-30); return; }
    await new Promise(ok => { try { const tx = db.transaction('fotos', 'readwrite'); tx.objectStore('fotos').put(f); tx.oncomplete = ok; tx.onerror = ok; } catch (e) { this.mem.push(f); ok(); } });
    const todas = await this.todas();
    if (todas.length > 60) await Promise.all(todas.slice(0, todas.length - 60).map(x => this.apagar(x.id)));
  },
  async todas() {
    const db = await this.abrirDb();
    if (!db) return this.mem.slice().sort((a, b) => a.ts - b.ts);
    const l = await new Promise(ok => { try { const r = db.transaction('fotos').objectStore('fotos').getAll(); r.onsuccess = () => ok(r.result || []); r.onerror = () => ok([]); } catch (e) { ok([]); } });
    return l.concat(this.mem).sort((a, b) => a.ts - b.ts);
  },
  async apagar(id) {
    this.mem = this.mem.filter(x => x.id !== id);
    const db = await this.abrirDb(); if (!db) return;
    await new Promise(ok => { try { const tx = db.transaction('fotos', 'readwrite'); tx.objectStore('fotos').delete(id); tx.oncomplete = ok; tx.onerror = ok; } catch (e) { ok(); } });
  },
  sessao() { const ab = est().abertura, d = new Date(); return ab && ab.id ? 's' + ab.id : `d${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; },
  nomeSessao(s) { const ab = est().abertura; if (ab && 's' + ab.id === s) return `Sessão ${ab.num || ''}${ab.nome ? ': ' + ab.nome : ''}`.trim(); return s[0] === 'd' ? `Dia ${s.slice(1).split('-').reverse().join('/')}` : 'Sessão anterior'; },
  // Filho "só por lente" à frente da câmera (dados públicos do token), na mesma sala do jogador
  lenteAFrente(ap) {
    const eu = euJog(), me = eu && tokens()[eu]; if (!me) return false;
    const cam = ap.camera, f = new ap.T.Vector3(); cam.getWorldDirection(f);
    return Object.values(tokens()).some(tk => {
      if (!tk || tipoDe(tk) !== 'filho' || !tk.ln || tk.h || tk.a !== ap.a || salaP(tk) !== salaP(me)) return false;
      const [X, Z] = ap.planta3D(tk.x, tk.y), dx = X - cam.position.x, dz = Z - cam.position.z, d = Math.hypot(dx, dz);
      return d < 16 && d > .2 && (dx * f.x + dz * f.z) / (d * Math.hypot(f.x, f.z) || 1) > .78;
    });
  },
  temFlash() {
    try { const at = window.ACF_FICHAS && window.ACF_FICHAS.ativa && window.ACF_FICHAS.ativa(); return !!(at && Object.values(at.d.itens || {}).some(it => it && RX_FLASH.test(String(it.n || '')))); } catch (e) { return false; }
  },
  async tirar() {
    const ap = api3(); if (!ap) return;
    // sem a interface: nomes e o anel da vez saem só desta foto
    const esc0 = [];
    ap.tok.mapa.forEach(o => { if (o.nome && o.nome.visible) { esc0.push(o.nome); o.nome.visible = false; } });
    const ring = M() && M().Vista && M().Vista.ring, rv = ring && ring.g.visible; if (ring) ring.g.visible = false;
    // a foto sai na resolução cheia do aparelho, mesmo com a qualidade automática baixa
    const ren = ap.ren, pr0 = ren.getPixelRatio(), prF = Math.max(pr0, Qual.ap === ap ? Qual.base : pr0), el = ren.domElement, pai = el.parentElement;
    const w = (pai && pai.clientWidth) || innerWidth, h = (pai && pai.clientHeight) || innerHeight;
    const tam = pr => { ren.setPixelRatio(pr); ren.setSize(w, h, false); try { ap.pos.tamanho(w, h, pr); } catch (e) {} };
    let url = '', dims = [0, 0];
    try {
      if (prF > pr0 + .01) tam(prF);
      ap.pos.render(ap.cena, ap.camera, performance.now() / 1000); url = el.toDataURL('image/jpeg', .9); dims = [el.width, el.height];
    } catch (e) { console.warn('foto:', e); }
    finally { if (prF > pr0 + .01) tam(pr0); }
    esc0.forEach(o => { o.visible = true; }); if (ring) ring.g.visible = rv;
    if (!url || url.length < 2000) { avisar('Não consegui tirar a foto neste aparelho.'); return; }
    // clarão e obturador
    const fl = document.createElement('div'); fl.className = 'imr-clarao'; ($('#s3d') || document.body).appendChild(fl); setTimeout(() => fl.remove(), 700);
    this.obturador();
    // perigo que só aparece por lente: o mesmo Flash do site (câmera ou celular na ficha, 1 por cena)
    if (euJog() && this.temFlash() && this.lenteAFrente(ap) && FIL() && FIL().dispararFlash) { try { if (!FIL().flashPronto || FIL().flashPronto()) FIL().dispararFlash(); } catch (e) {} }
    const blob = dataBlob(url);
    const cn = ap.V && ap.V.ctrl && A().salaDe ? A().salaDe(ap.V.ctrl) : null;
    const salaTxt = ($('#s3dCN') || {}).textContent || '';
    const f = { id: 'f' + agora().toString(36) + Math.random().toString(36).slice(2, 5), ts: agora(), ses: this.sessao(), cn: cn || 0, sala: salaTxt, w: dims[0], h: dims[1], blob };
    this.previa(f);
    await this.guardar(f);
  },
  obturador() {
    if (!Som.ok()) return; const c = Som.ctx(), out = Som.saida(), t = c.currentTime;
    Som.ruido(t, out, { tipo: 'highpass', bp: 2500, v: .22, ataque: .002, dur: .05 });
    Som.ruido(t + .07, out, { bp: 1800, q: 1.5, v: .16, ataque: .002, dur: .06 });
  },
  previa(f) {
    const d = $('#s3d') || document.body; let p = $('#imrPrevia'); if (p) p.remove();
    const url = URL.createObjectURL(f.blob); this.urls.push(url);
    p = document.createElement('div'); p.id = 'imrPrevia'; p.className = 'imr-previa';
    p.innerHTML = `<img src="${url}" alt="Foto tirada agora"><div><button type="button" data-imr="foto-baixar" data-id="${esc(f.id)}" aria-label="Baixar a foto">⬇</button><button type="button" data-imr="galeria">Galeria</button></div>`;
    d.appendChild(p); this.ultima = f;
    clearTimeout(this.tPrev); this.tPrev = setTimeout(() => { const q = $('#imrPrevia'); if (q) q.classList.add('some'); setTimeout(() => { const r = $('#imrPrevia'); if (r && r.classList.contains('some')) r.remove(); }, 500); }, 4200);
  },
  nomeArq(f) { const d = new Date(f.ts); return `caixa-foto-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}.jpg`; },
  async baixar(id) { const f = (await this.todas()).find(x => x.id === id) || (this.ultima && this.ultima.id === id ? this.ultima : null); if (f) baixarBlob(f.blob, this.nomeArq(f)); },
  async galeria() {
    this.urls.forEach(u => URL.revokeObjectURL(u)); this.urls = [];
    const todas = (await this.todas()).reverse(), atual = this.sessao();
    const grupos = new Map(); todas.forEach(f => { if (!grupos.has(f.ses)) grupos.set(f.ses, []); grupos.get(f.ses).push(f); });
    const ord = [...grupos.keys()].sort((a, b) => (a === atual ? -1 : b === atual ? 1 : 0));
    const cartao = f => { const u = URL.createObjectURL(f.blob); this.urls.push(u); return `<figure><img src="${u}" alt="Foto de ${esc(hora(f.ts))}" loading="lazy"><figcaption>${esc(hora(f.ts))}${f.sala ? ' · ' + esc(f.sala) : ''}</figcaption><div><button type="button" data-imr="foto-baixar" data-id="${esc(f.id)}">⬇ Baixar</button><button type="button" data-imr="foto-apagar" data-id="${esc(f.id)}" aria-label="Apagar a foto">🗑</button></div></figure>`; };
    const html = `<header class="imr-cab"><b>📷 Fotos da sessão</b><button type="button" class="imr-x" data-imr="fechar" aria-label="Fechar">✕</button></header>
      <p class="mini">Ficam só neste aparelho. Tire mais com o botão 📷 do 3D.</p>
      ${todas.length ? ord.map(s => `<h4>${esc(this.nomeSessao(s))} <small>(${grupos.get(s).length})</small></h4><div class="imr-gal">${grupos.get(s).map(cartao).join('')}</div>`).join('') : '<p class="mini">Nenhuma foto ainda.</p>'}
      <div class="imr-bts"><button type="button" data-imr="fechar" class="pri">Fechar</button></div>`;
    modal('imrGaleria', html).classList.add('imr-modal-larga');
  },
};
function dataBlob(url) {
  const [cab, b64] = url.split(','), tipo = (/data:([^;]+)/.exec(cab) || [])[1] || 'image/jpeg', bin = atob(b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type: tipo });
}

/* =========================================================
   Extensão da vista 3D (sala3d.js chama iniciar, quadro, fechar, opcoes e menu)
   ========================================================= */
const Vista = {
  ap: null, tw: 0,
  iniciar(ap) {
    this.ap = ap; this.tw = 0;
    Qual.iniciar(ap);
    MarcasVista.iniciar(ap);
    Amb.limpar();
    // botão de foto no topo (antes do ⚙)
    const d = ap.V && ap.V.d, bts = d && $('.s3d-topo-bts', d);
    if (bts && !$('[data-imr="foto"]', bts)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 's3d-x s3d-mini imr-bt-foto'; b.dataset.imr = 'foto'; b.title = 'Tirar uma foto da vista (sem a interface)'; b.setAttribute('aria-label', 'Tirar uma foto'); b.textContent = '📷';
      const op = $('[data-s3dv="opcoes"]', bts); bts.insertBefore(b, op || null);
    }
    Tut.talvez(ap);
  },
  quadro(dt, t) {
    const ap = this.ap; if (!ap || !ap.V) return;
    const tw = performance.now() / 1000, dw = Math.min(1, Math.max(0, tw - (this.tw || tw))); this.tw = tw;
    try { Qual.quadro(ap); } catch (e) { if (!this.e1) { this.e1 = 1; console.warn('imersão (qualidade):', e); } }
    try { Amb.quadro(ap, dw, tw); } catch (e) { if (!this.e2) { this.e2 = 1; console.warn('imersão (ambiente):', e); } }
    try { MarcasVista.quadro(dw); } catch (e) { if (!this.e3) { this.e3 = 1; console.warn('imersão (marcas):', e); } }
    try { Cor.quadro(ap, dw); } catch (e) {}
  },
  fechar() {
    Amb.limpar(); MarcasVista.fechar(); Qual.fechar(); Tut.fechar(true);
    const p = $('#imrPrevia'); if (p) p.remove();
    this.ap = null;
  },
  // ⚙ Opções do 3D: as chaves usam o mesmo esquema de gravação das outras (acf-s3d-cfg)
  opcoes(aba, h) {
    if (aba === 'graficos') return `<section><h4>Automático</h4>${h.chave('autoQual', 'Qualidade automática (baixa sozinha se o jogo travar e sobe de volta quando sobrar folga)')}<p class="mini">Agora: ${esc(Qual.desc())}. O que você escolheu à mão acima manda.</p></section>`;
    if (aba === 'audio') return `<section><h4>Sentir o personagem</h4>${h.quem === 'jog' ? h.chave('coracao', 'Coração e respiração do meu personagem (só você ouve)') : ''}${typeof navigator.vibrate === 'function' || Vib.orig ? h.chave('vibrar', 'Vibração do celular (dano, susto, encontro, o chão treme)') : '<p class="mini">Este aparelho não vibra.</p>'}</section>`;
    if (aba === 'controles' && h.quem === 'jog') return '<div class="s3d-op"><button type="button" data-imr="tut-rever">Rever o tutorial do 3D</button></div>';
    return '';
  },
  menu(add) {
    add('📷', 'Fotos da sessão', () => Foto.galeria(), 'galeria deste aparelho');
  },
};
// as vibrações e o coração dependem do momento.js (áudio, sustos e a batida da perseguição)
(window.ACF3D = window.ACF3D || {}).vista = window.ACF3D.vista || [];
window.ACF3D.vista.push(Vista);

// cliques dos botões desta extensão (em qualquer janela)
document.addEventListener('click', e => {
  const b = e.target.closest('[data-imr]'); if (!b) return;
  const k = b.dataset.imr;
  if (k === 'fechar') { const m = b.closest('.imr-modal'); if (m) m.remove(); if (m && m.id === 'imrGaleria') { Foto.urls.forEach(u => URL.revokeObjectURL(u)); Foto.urls = []; } return; }
  if (k === 'foto') { Foto.tirar(); return; }
  if (k === 'galeria') { const p = $('#imrPrevia'); if (p) p.remove(); Foto.galeria(); return; }
  if (k === 'foto-baixar') { Foto.baixar(b.dataset.id); return; }
  if (k === 'foto-apagar') { if (confirm('Apagar esta foto deste aparelho?')) Foto.apagar(b.dataset.id).then(() => Foto.galeria()); return; }
  if (k === 'tut-pular') { Tut.fechar(); return; }
  if (k === 'tut-prox') { Tut.prox(); return; }
  if (k === 'tut-rever') { const o = $('#s3dOpcoes'); if (o) o.hidden = true; Tut.mostrar(); return; }
  if (k === 'bk-lista') { Bk.abrirLista(); return; }
  if (k === 'bk-volta') { Bk.voltar(b.dataset.k); return; }
  if (k === 'bk-agora') { b.disabled = true; Bk.salvar(true).then(ok => { A().aviso(ok ? 'Backup automático guardado.' : 'Não consegui guardar agora.'); Bk.abrirLista(); }); return; }
  if (k === 'res-abrir') { Resumo.abrir(est().encerramento && est().encerramento.id ? est().encerramento : null); return; }
  if (k === 'res-copiar') { Resumo.copiar(); return; }
  if (k === 'res-chat') { Resumo.chat(); return; }
  if (k === 'res-baixar') { Resumo.baixar(); return; }
});

/* ---------- ganchos no momento.js (sem mexer nele): susto vibra; a batida da perseguição vira a nossa ---------- */
function ganchosMomento() {
  const MO = M(); if (!MO || MO.__imr) return !!MO;
  MO.__imr = true;
  const S = MO.Susto;
  if (S && typeof S.mostrar === 'function') { const m0 = S.mostrar; S.mostrar = function (v) { Vib.vibrar([40, 40, 40, 40, 260]); Cor.sustoTs = agora(); return m0.apply(this, arguments); }; }
  const Au = MO.Aud;
  // com o coração do personagem ligado, ele faz a batida da perseguição (acelerando com o perigo)
  if (Au && typeof Au.tensao === 'function') { const t0 = Au.tensao; Au.tensao = function (on) { if (on && Cor.ativo()) { if (this.loop) t0.call(this, false); return; } return t0.apply(this, arguments); }; }
  // degraus da qualidade: câmeras de segurança leves ou desligadas
  const V = MO.Vista;
  if (V && typeof V.resCam === 'function') { const r0 = V.resCam; V.resCam = function () { const c = Qual.cam(), cf = this.ap && this.ap.CFG && this.ap.CFG.cameras; if (c && cf === 'auto') return c === 'off' ? null : [144, 90, .5]; return r0.apply(this, arguments); }; }
  return true;
}

/* ---------- partida ---------- */
function iniciar() {
  if (!window.ACF || !window.ACF._int) { setTimeout(iniciar, 300); return; }
  Vib.instalar();
  // qualidade automática: engasgos de passagem (aba sumiu e voltou, Alt+Tab, janela redimensionada) não contam
  document.addEventListener('visibilitychange', () => Qual.carencia(3000));
  addEventListener('blur', () => Qual.carencia(2500)); addEventListener('focus', () => Qual.carencia(2500));
  addEventListener('resize', () => Qual.carencia(2000));
  let tentativas = 0; (function g() { if (!ganchosMomento() && ++tentativas < 40) setTimeout(g, 300); })();
  setInterval(() => { try { Cor.vigiar(); Cor.tick(); } catch (e) { console.warn('imersão:', e); } }, 120);
  setInterval(() => {
    try { Ecos.ligar(); Marcas.gravar(); Resumo.vigiar(); } catch (e) { console.warn('imersão:', e); }
  }, 700);
  setInterval(() => { try { Bk.tick(); Bk.desenhar(); Resumo.desenharBloco(); } catch (e) { console.warn('imersão (backup):', e); } }, 10000);
  setTimeout(() => { try { Bk.tick(); Bk.desenhar(); Resumo.desenharBloco(); } catch (e) {} }, 2500);
  document.addEventListener('acf-perfil', () => setTimeout(() => { try { Bk.idx = null; Bk.desenhar(); Resumo.desenharBloco(); Ecos.ligar(); } catch (e) {} }, 300));
}
window.ACF_IMERSAO = { Qual, Cor, Vib, Amb, Marcas, MarcasVista, Bk, Resumo, Tut, Foto, Ecos, Som, DEGRAUS, coracaoAtivo: () => Cor.ativo() };
iniciar();
})();
