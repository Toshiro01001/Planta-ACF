/* =========================================================
   A CAIXA DE FÓSFOROS · momento.js
   A perseguição como momento, a informação escondida e o acabamento do 3D.

   1. ENCONTRO: a tela do Mestre percebe um Filho à vista de uma cobaia (mesma sala,
      sem ocultação) ou o decibelímetro de uma sala passando do limite e PROPÕE o
      encontro. Confirmado, quem vê a cena congela 2 s (no 3D, zoom lento na criatura,
      som grave e bordas escuras; no 2D, clarão e vinheta) e a perseguição de sempre
      (mapa/persg) abre com a iniciativa já rolada. Cancelado, nada acontece.
      Na perseguição: anel de alcance no chão do token da vez (metros de regra que o
      site já aplica), tela dessaturada e relógio para quem espera, câmera que mostra
      quem está na vez (opção) e as ações do jogador como cartas na tela. No fim, cor
      e som voltam aos poucos.
   2. INFORMAÇÃO ESCONDIDA: sons dos Filhos (ecos3d, sem dizer de quem) com áudio
      posicional; lanterna com bateria (item "Lanterna..." da ficha ativa); mapa que
      mente com SAN baixa (só na tela daquele jogador); sustos que só uma cobaia vê
      (sustos/<cobaia>); câmeras de segurança nos monitores (mapa/cameras).
   3. ACABAMENTO: fumaça baixa que se move, poeira na luz da lanterna, sombras dos
      tokens no chão e o corpo de quem morreu (mapa/corpos), que se examina com E.

   O código é genérico: nenhum nome de Filho aqui. Quem tem "passos silenciosos" vem
   de privado/filhos (filhos.js).
   ========================================================= */
(() => {
'use strict';
const A = () => window.ACF;
const I = () => window.ACF._int;
const FX = () => window.ACF_FICHAS;
const SAH = () => window.ACF_SAH;
const FIL = () => window.ACF_FILHOS;
const S3 = () => window.Sala3D;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const agora = () => Date.now();
const num = (v, p = 0) => { const n = parseFloat(v); return isFinite(n) ? n : p; };
const int = v => Math.round(num(v));
const pad2 = n => String(n).padStart(2, '0');
const ls = { get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const est = () => (A() && A().estado) || {};
const tokens = () => est().tokens || {};
const SERd = id => (A().SER || {})[id];
const tipoDe = tk => ((tk && SERd(tk.s)) || {}).tipo || '';
const cfg = () => ((est().cfg || {}).momento) || {};
const cfgV = (k, p) => (cfg()[k] === undefined || cfg()[k] === null ? p : cfg()[k]);
const souMestre = () => !!A().mestre;
const souAux = () => !!A().aux && !A().mestre;
const euJog = () => (!A().mestre && !A().aux ? A().meu : null);
const salaP = tk => (tk && tk.a ? I().salaEm(tk.a, tk.x, tk.y) : null);
const cnTk = tk => { const p = salaP(tk); return p ? I().cnDe(tk.a, p) : null; };
const aberto3D = () => !!(S3() && S3().aberta);
const api3 = () => (aberto3D() && S3()._api) || null;
const MU = () => A().geo.M_POR_UNID;
const d20 = () => 1 + Math.floor(Math.random() * 20);
const persg = () => est().persg || { on: false };
const ordemP = () => (persg().ordem ? Object.values(persg().ordem) : []);
const vezId = () => { const p = persg(), o = ordemP(); return p.on && o.length ? (o[p.vez || 0] || {}).id : null; };
const celular = () => Math.min(innerWidth, innerHeight) < 700 || matchMedia('(pointer: coarse)').matches;
const nomeTk = tk => (A().rotulo ? A().rotulo(tk) : (SERd(tk.s) || {}).nome || '');
// o Filho está à vista dos jogadores? (sem ocultação geral, especial, forma de objeto, cópia nem pedido de publicar)
const filhoAVista = tk => tipoDe(tk) === 'filho' && !tk.h && !tk.oc && !tk.fo && !tk.pp && !tk.cp && !(FIL() && FIL().foraDoEncontro && FIL().foraDoEncontro(tk));

/* =========================================================
   ÁUDIO: um contexto só, sons feitos na hora, com posição (PannerNode)
   ========================================================= */
const Aud = {
  ctx: null, saida: null, branco: null, loop: null,
  preparar() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      if (!this.ctx) {
        this.ctx = new AC(); this.saida = this.ctx.createGain(); this.saida.gain.value = .9; this.saida.connect(this.ctx.destination);
        const n = this.ctx.sampleRate * 2, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        this.branco = b;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch (e) { this.ctx = null; }
  },
  ok() { return !!this.ctx && this.ctx.state === 'running' && !(A() && A().mudo); },
  // ouvinte: no 3D, a câmera; no 2D, o token do jogador olhando para o "norte" do mapa
  ouvinte(x, y, z, fx, fz) {
    const L = this.ctx.listener, t = this.ctx.currentTime;
    if (L.positionX) { L.positionX.setValueAtTime(x, t); L.positionY.setValueAtTime(y, t); L.positionZ.setValueAtTime(z, t); L.forwardX.setValueAtTime(fx, t); L.forwardY.setValueAtTime(0, t); L.forwardZ.setValueAtTime(fz, t); L.upX.setValueAtTime(0, t); L.upY.setValueAtTime(1, t); L.upZ.setValueAtTime(0, t); }
    else { L.setPosition(x, y, z); L.setOrientation(fx, 0, fz, 0, 1, 0); }
  },
  panner(x, y, z, ref) {
    const p = this.ctx.createPanner();
    p.panningModel = celular() ? 'equalpower' : 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref || 1.6; p.maxDistance = 60; p.rolloffFactor = 1.3;
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
    p.connect(this.saida); return p;
  },
  ruido(t, dest, { bp = 600, q = 1, tipo = 'bandpass', v = .2, ataque = .01, dur = .2, f2 }) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.branco;
    const f = c.createBiquadFilter(); f.type = tipo; f.frequency.setValueAtTime(bp, t); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur); f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + ataque); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + .05);
  },
  tom(t, dest, { f = 60, f2, tipo = 'sine', v = .2, ataque = .01, dur = .3 }) {
    const c = this.ctx, o = c.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + ataque); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05);
  },
  // sons dos Filhos (passos, arrasto, respiração) num ponto do espaço
  criatura(tipo, x, y, z, vol = 1) {
    if (!this.ok()) return false;
    const t = this.ctx.currentTime, p = this.panner(x, y, z, 1.4);
    if (tipo === 'passos') for (let i = 0; i < 4; i++) { const ti = t + i * (.42 + Math.random() * .08); this.ruido(ti, p, { tipo: 'lowpass', bp: 380, v: .55 * vol, dur: .12 }); this.tom(ti, p, { f: 78, f2: 40, v: .45 * vol, ataque: .004, dur: .16 }); }
    else if (tipo === 'arrastar') { this.ruido(t, p, { bp: 520, f2: 260, q: .7, v: .4 * vol, ataque: .25, dur: 1.7 }); this.ruido(t + .5, p, { bp: 900, f2: 420, q: .9, v: .18 * vol, ataque: .2, dur: 1.2 }); }
    else { this.ruido(t, p, { bp: 650, q: .8, v: .22 * vol, ataque: 1, dur: 1.5 }); this.ruido(t + 1.7, p, { bp: 480, q: .8, v: .26 * vol, ataque: .3, dur: 1.6 }); this.tom(t + 1.7, p, { f: 95, f2: 70, v: .05 * vol, ataque: .4, dur: 1.2 }); }
    setTimeout(() => { try { p.disconnect(); } catch (e) {} }, 4500);
    return true;
  },
  grave() { if (!this.ok()) return; const t = this.ctx.currentTime; this.tom(t, this.saida, { f: 46, f2: 38, v: .5, ataque: .08, dur: 2.6 }); this.tom(t, this.saida, { f: 69, f2: 55, v: .22, ataque: .12, dur: 2.2 }); this.ruido(t, this.saida, { tipo: 'lowpass', bp: 140, v: .35, ataque: .05, dur: 2.4 }); },
  ferroada() { if (!this.ok()) return; const t = this.ctx.currentTime; this.tom(t, this.saida, { tipo: 'sawtooth', f: 880, f2: 1240, v: .07, ataque: .01, dur: .5 }); this.ruido(t, this.saida, { bp: 2400, q: 2, v: .25, ataque: .005, dur: .35 }); this.tom(t, this.saida, { f: 55, v: .35, ataque: .01, dur: .9 }); },
  sussurro() {
    if (!this.ok()) return; const t = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) { const p = this.panner(i ? .6 : -.6, 0, -.2, .5); this.ruido(t + i * .55, p, { bp: 3600, q: 1.8, v: .16, ataque: .12, dur: .7 }); this.ruido(t + i * .55 + .2, p, { bp: 1800, q: 3, v: .08, ataque: .1, dur: .5 }); setTimeout(() => { try { p.disconnect(); } catch (e) {} }, 2500); }
  },
  alivio() { if (!this.ok()) return; const t = this.ctx.currentTime; [220, 277.2, 329.6].forEach((f, i) => this.tom(t + i * .12, this.saida, { f, v: .05, ataque: .8, dur: 3.4 })); },
  // batida de coração baixa durante a perseguição (para de leve no fim)
  tensao(on) {
    if (!this.ctx) return;
    if (on && !this.loop && this.ok()) {
      const g = this.ctx.createGain(); g.gain.value = 0; g.connect(this.saida); g.gain.setTargetAtTime(.5, this.ctx.currentTime, 1.2);
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150; lp.connect(g);
      let prox = this.ctx.currentTime + .2;
      const id = setInterval(() => { if (!this.ctx) return; const t = this.ctx.currentTime; while (prox < t + .3) { this.tom(prox, lp, { f: 56, f2: 40, v: .5, ataque: .01, dur: .16 }); this.tom(prox + .26, lp, { f: 50, f2: 36, v: .32, ataque: .01, dur: .14 }); prox += .95; } }, 150);
      this.loop = { g, id };
    } else if (!on && this.loop) {
      const l = this.loop; this.loop = null;
      l.g.gain.setTargetAtTime(0, this.ctx.currentTime, 1.3);
      setTimeout(() => { clearInterval(l.id); try { l.g.disconnect(); } catch (e) {} }, 5000);
    }
  },
};
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => Aud.preparar(), { passive: true, capture: true }));

/* =========================================================
   1. ENCONTRO (a tela do Mestre propõe; confirmado, vira momento para quem vê)
   ========================================================= */
const Enc = {
  visAnt: null, ruidoAnt: null, fila: [], atual: null, frio: {}, idVisto: undefined, congeladoAte: 0,
  vigiar() {
    if (!souMestre() || I().espiar || !I().Priv.pronto) return;
    const ligado = cfgV('encontro', true) !== false && !persg().on;
    const tks = tokens();
    // 1. visão: um Filho à vista na mesma sala que uma cobaia (no apagão, ninguém vê ninguém)
    const vis = new Set();
    if (!A().apagao) {
      Object.entries(tks).forEach(([fid, f]) => {
        if (!f || !f.a || !filhoAVista(f)) return; const p = salaP(f); if (!p) return;
        Object.entries(tks).forEach(([cid, c]) => { if (tipoDe(c) === 'cobaia' && c.a === f.a && salaP(c) === p) vis.add(fid + '|' + cid); });
      });
    }
    const novos = this.visAnt ? [...vis].filter(k => !this.visAnt.has(k)) : [];
    this.visAnt = vis;
    // 2. barulho: sala passando do limite (decibelímetro no máximo, como o alarme do mapa)
    const rompidas = new Map();
    I().gruposDeSala().forEach((gr, k) => { if (gr.p && I().nivelDe(gr.ids.length + (gr.extra || 0)) >= 5) rompidas.set(k, gr); });
    const ruidoNovo = this.ruidoAnt ? [...rompidas.keys()].filter(k => !this.ruidoAnt.has(k)) : [];
    this.ruidoAnt = new Set(rompidas.keys());
    if (!ligado) return;
    const porFilho = {};
    novos.forEach(k => { const [f, c] = k.split('|'); (porFilho[f] = porFilho[f] || []).push(c); });
    Object.entries(porFilho).forEach(([fid, cobs]) => {
      const f = tks[fid], cn = cnTk(f), chave = 'v:' + fid + ':' + cn;
      if (agora() - (this.frio[chave] || 0) < 90000) return;
      this.frio[chave] = agora();
      const aqui = Object.entries(tks).filter(([id, t]) => t && t.a === f.a && salaP(t) === salaP(f) && (tipoDe(t) === 'cobaia' || (tipoDe(t) === 'filho' && filhoAVista(t))));
      const part = aqui.map(([id, t]) => ({ id, ck: !(tipoDe(t) === 'cobaia' && t.esq), nota: t.esq ? 'escondida' : '' }));
      const nomes = cobs.map(c => nomeTk(tks[c])).join(', ');
      this.propor({ tipo: 'visao', a: f.a, cn, f: fid, txt: `Encontro: ${nomeTk(f)} viu ${nomes} em CN ${pad2(cn)}`, part });
    });
    ruidoNovo.forEach(k => {
      const gr = rompidas.get(k), cn = I().cnDe(gr.a, gr.p), chave = 'r:' + cn;
      if (agora() - (this.frio[chave] || 0) < 90000) return;
      const r = I().retSala(gr.p), centro = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
      const filhos = Object.entries(tks).filter(([, t]) => tipoDe(t) === 'filho' && t.a === gr.a).map(([id, t]) => [id, t, Math.hypot(t.x - centro.x, t.y - centro.y)]).sort((u, v) => u[2] - v[2]).slice(0, 4);
      if (!filhos.length) return;
      this.frio[chave] = agora();
      const part = gr.ids.map(id => ({ id, ck: true })).concat(filhos.map(([id, t], i) => ({ id, ck: i === 0, nota: t.h || t.oc || t.fo ? 'oculto' : '' })));
      this.propor({ tipo: 'ruido', a: gr.a, cn, f: filhoAVista(filhos[0][1]) ? filhos[0][0] : null, txt: `Encontro: barulho no limite em CN ${pad2(cn)} (${gr.ids.map(id => nomeTk(tks[id])).join(', ')})`, part });
    });
  },
  propor(pr) {
    pr.id = 'e' + agora().toString(36) + Math.random().toString(36).slice(2, 5);
    if (this.atual) { if (this.fila.length < 3) this.fila.push(pr); this.desenhar(); return; }
    this.atual = pr; this.desenhar();
    try { A().Som.tom(196, 0, .35, 'sawtooth', .07, 98); } catch (e) {}
    A().diario('persg', pr.txt + ' (proposto)');
  },
  desenhar() {
    let c = $('#momProp');
    const pr = this.atual;
    if (!pr || !souMestre()) { if (c) c.remove(); return; }
    if (!c) { c = document.createElement('div'); c.id = 'momProp'; c.className = 'mom-prop'; c.setAttribute('role', 'alertdialog'); document.body.appendChild(c); }
    const tks = tokens();
    c.innerHTML = `<p class="mom-k">⚠ ENCONTRO${this.fila.length ? ` <small>+${this.fila.length} na fila</small>` : ''}</p>
      <h3>${esc(pr.txt)}</h3>
      <p class="mini">Confirmar: quem vê a cena congela 2 s e a perseguição abre com a iniciativa rolada. Cancelar: nada acontece para os jogadores.</p>
      <div class="mom-part">${pr.part.filter(x => tks[x.id]).map(x => `<label><input type="checkbox" data-mp="${esc(x.id)}" ${x.ck ? 'checked' : ''}><span>${esc(nomeTk(tks[x.id]))}${x.nota ? ` <small>(${esc(x.nota)})</small>` : ''}</span></label>`).join('')}</div>
      <div class="mom-bts"><button type="button" class="pri" data-mom="ok">Confirmar</button><button type="button" data-mom="x">Cancelar</button></div>`;
    $$('[data-mp]', c).forEach(i => i.onchange = () => { const x = pr.part.find(y => y.id === i.dataset.mp); if (x) x.ck = i.checked; });
    $('[data-mom="ok"]', c).onclick = () => this.confirmar(pr);
    $('[data-mom="x"]', c).onclick = () => { A().diario('persg', 'Encontro cancelado (falso alarme)'); this.proximo(); };
  },
  proximo() { this.atual = this.fila.shift() || null; this.desenhar(); },
  async confirmar(pr) {
    const tks = tokens(), ids = pr.part.filter(x => x.ck && tks[x.id]).map(x => x.id);
    if (!ids.length) { A().aviso('Marque quem participa.'); return; }
    const b = $('#momProp [data-mom="ok"]'); if (b) b.disabled = true;
    const ordem = [], linhas = [];
    for (const id of ids) {
      const tk = tks[id]; if (!tk) continue;
      const r = await iniciativa(id, tk).catch(() => ({ ini: d20(), como: '1d20' }));
      const lim = tipoDe(tk) === 'filho' && FIL() ? (num(FIL().limPadrao(tk.s)) || 9) : 9;
      ordem.push({ id, ini: r.ini, lim }); linhas.push(`${nomeTk(tk)} ${r.ini} (${r.como})`);
    }
    const f = pr.f && tks[pr.f] && filhoAVista(tks[pr.f]) ? pr.f : null;
    A().definir(['encontro'], { id: pr.id, ts: agora(), a: pr.a, cn: pr.cn, f, ids: Object.fromEntries(ids.map(i => [i, 1])) });
    A().diario('persg', `Encontro confirmado em CN ${pad2(pr.cn)} · iniciativa: ${linhas.join(', ')}`);
    this.proximo();
    // a perseguição abre depois do congelamento (2 s)
    setTimeout(() => { if (!persg().on) A().iniciarPerseguicao(ordem, { enc: pr.id }); }, 2100);
  },
  // cada aparelho: o encontro novo vira momento para quem vê a cena
  ver() {
    const e = est().encontro;
    if (this.idVisto === undefined) { this.idVisto = e ? e.id : null; return; }
    if (!e || e.id === this.idVisto) return;
    this.idVisto = e.id;
    if (!veACena(e)) return;
    this.momento(e);
  },
  momento(e) {
    this.congeladoAte = agora() + 2000;
    Aud.preparar(); Aud.grave();
    const ap = api3();
    if (ap && ap.a === e.a) {
      if (ap.V) ap.V.congelado = performance.now() + 2000;
      // zoom na criatura para quem a enxerga (a miniatura pode chegar ao 3D um instante depois: o quadro procura)
      const ft = e.f && tokens()[e.f], meuTk = tokens()[A().meu];
      const ve = !!ft && A().visivelPara(ft) && (souMestre() || souAux() || (!!meuTk && cnTk(meuTk) === cnTk(ft)));
      Vista.zoom(ve ? e.f : null, { dur: 2.4, fov: .26, borda: .9 });
    } else veu2D();
    if (navigator.vibrate) try { navigator.vibrate([60, 80, 160]); } catch (er) {}
  },
};
function veACena(e) {
  if (souMestre()) return true;
  if (souAux()) return true;
  const eu = A().meu, tk = eu && tokens()[eu];
  if (!tk) return false;
  return !!(e.ids && e.ids[eu]) || (tk.a === e.a && cnTk(tk) === e.cn);
}
// 2D: clarão e vinheta (o equivalente do zoom do 3D)
function veu2D() {
  let v = $('#momVeu');
  if (!v) { v = document.createElement('div'); v.id = 'momVeu'; v.className = 'mom-veu'; v.setAttribute('aria-hidden', 'true'); document.body.appendChild(v); }
  v.classList.remove('on'); void v.offsetWidth; v.classList.add('on');
  clearTimeout(v._t); v._t = setTimeout(() => v.classList.remove('on'), 2600);
}
// iniciativa do Encontro: a ficha do jogador (só leitura; a ativa pelo nome publicado no token), a ficha ligada ao Filho ou 1d20
async function iniciativa(id, tk) {
  const s = SERd(tk.s) || {};
  if (s.tipo === 'cobaia') {
    const fichas = (await A().Rede.once('agentes/' + id).catch(() => null)) || {};
    const nome = (tk.vit || {}).nome, lst = Object.values(fichas).filter(x => x && typeof x === 'object');
    const d = lst.find(x => nome && x.nome === nome) || (lst.length === 1 ? lst[0] : null);
    if (d && FX() && FX().normalizar) { const t = FX().testarPericia(FX().normalizar(d), 'iniciativa'); return { ini: t.total, como: `Iniciativa da ficha ${d.nome || ''}`.trim() }; }
    if (tk.r && !tk.r.fora && agora() - (tk.r.ts || 0) < 600000) return { ini: int(tk.r.t), como: 'rolou no site' };
    const r = d20(); return { ini: r, como: '1d20, sem ficha' };
  }
  if (s.tipo === 'filho') {
    const fichas = (await A().Rede.once('agentesAux').catch(() => null)) || {};
    const d = Object.values(fichas).find(x => x && x.tipo === 'ameaca' && x.filho === tk.s);
    const txt = d ? String(d.per || '') : '';
    let m = /iniciativa[^0-9+\-]*(\d+)\s*d\s*20\s*([+-]\s*\d+)?/i.exec(txt);
    if (m) { const t = FX().rolarTeste(int(m[1]) || 1, int(String(m[2] || '0').replace(/\s/g, ''))); return { ini: t.total, como: `${m[1]}d20${m[2] ? m[2].replace(/\s/g, '') : ''} da ficha` }; }
    m = /iniciativa[^0-9+\-]*([+-]\s*\d+)/i.exec(txt);
    if (m) { const t = FX().rolarTeste(1, int(m[1].replace(/\s/g, ''))); return { ini: t.total, como: `1d20${m[1].replace(/\s/g, '')} da ficha` }; }
    const b = int(($('#bonusFilhos') || {}).value);
    const t = FX().rolarTeste(1, b); return { ini: t.total, como: `1d20${b ? (b > 0 ? '+' : '') + b : ''}` };
  }
  const r = d20(); return { ini: r, como: '1d20' };
}

/* ---------- perseguição: alívio no fim, véu e batida para quem espera (2D) ---------- */
const Persg = {
  on: null, vezAnt: null,
  ver() {
    const p = persg(), on = !!p.on;
    const vk = on ? (p.rod || 1) + ':' + (p.vez || 0) : null;
    if (this.on === null) { this.on = on; this.vezAnt = vk; return; }
    const eu = euJog(), part = !!(eu && ordemP().some(o => o.id === eu));
    if (on && !this.on) { this.on = true; document.body.classList.add('mom-persg'); }
    if (!on && this.on) {
      this.on = false; document.body.classList.remove('mom-persg');
      if (part || (eu && this.participava)) { Aud.alivio(); }
      Aud.tensao(false);
      Vista.alivio = 1;
    }
    this.participava = part;
    Aud.tensao(on && part);
    document.body.classList.toggle('mom-espera', on && !!eu && vezId() !== eu);
    if (!$('#momEspera')) { const v = document.createElement('div'); v.id = 'momEspera'; v.className = 'mom-espera-veu'; v.setAttribute('aria-hidden', 'true'); document.body.appendChild(v); }
    if (on && vk !== this.vezAnt) { this.vezAnt = vk; Vista.novaVez(vezId()); }
    if (!on) this.vezAnt = null;
  },
};

/* =========================================================
   CARTAS DE AÇÃO (na vez do jogador): só mostram o que o site já faz
   ========================================================= */
const Cartas = {
  html: '', min: false,
  dados() {
    const eu = A().meu, S = SAH(), F = FX();
    const p = S ? S.pers() : {}, ep = S ? S.meuPart() : null, f = S ? S.furt() : {}, ef = f && f.on && eu ? (f.part || {})[eu] : null;
    const tk = tokens()[eu] || {}, oz = ordemP().find(o => o.id === eu) || {};
    const lim = FIL() ? FIL().limite(eu, num(oz.lim, 9)) : num(oz.lim, 9), rest = Math.max(0, lim - num(tk.m));
    const fm = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
    const nPer = id => (S && S.nomePer ? S.nomePer(id) : id);
    const L = [];
    // correr: na perseguição do SaH é o teste da rodada; sem ela, é o deslocamento da vez
    if (p.on && ep && !S.estadoPart(ep, p)) L.push({ k: 'correr', i: '🏃', n: 'Correr', per: nPer(p.pericia || 'atletismo'), dt: 'DT ' + S.dtRodada(p), off: S.jaAgiu() ? 'Você já agiu nesta rodada.' : '' });
    else L.push({ k: 'correr', i: '🏃', n: 'Correr', per: 'Deslocamento', dt: `${fm(rest)} de ${fm(lim)} m`, off: rest <= 0 ? 'Deslocamento esgotado nesta vez.' : '' });
    // esconder: Furtividade DT 15 (esconderijo do 3D; na cena de furtividade, a ação Esconder-se)
    L.push({ k: 'esconder', i: '🫥', n: 'Esconder', per: nPer('furtividade'), dt: 'DT ' + (15 + int(ef ? f.dtMais : 0)), off: ef && ef.visto ? 'Você já foi visto.' : '' });
    // despistar: só presa com 1 sucesso ou mais, na perseguição do SaH
    const podeDesp = p.on && ep && ep.lado === 'presa' && int(ep.s) >= 1 && !S.estadoPart(ep, p);
    L.push({ k: 'despistar', i: '🌫', n: 'Despistar', per: nPer('furtividade'), dt: p.on ? 'DT ' + S.dtRodada(p) : 'DT da rodada', off: podeDesp ? (S.jaAgiu() ? 'Você já agiu nesta rodada.' : '') : !p.on ? 'Só na perseguição do Sobrevivendo ao Horror (o Mestre começa na Mesa).' : ep && ep.lado !== 'presa' ? 'Só a presa despista.' : 'Precisa de 1 sucesso ou mais.' });
    // atacar: a arma da ficha ativa (a DT é a Defesa do alvo, que só o Mestre sabe)
    const atks = F && F.ataquesAtiva ? F.ataquesAtiva() : [], at = atks.find((x, i) => i > 0) || atks[0];
    L.push({ k: 'atacar', i: '⚔', n: 'Atacar', per: at ? `${nPer(at.per)} ${at.bAtk >= 0 ? '+' : ''}${at.bAtk}` : 'Luta ou Pontaria', dt: 'Defesa do alvo', sub: at ? at.n : '', off: F && F.ativa && F.ativa() ? '' : 'Sem ficha ativa.' });
    // usar item: os itens com uso da mochila (Cicatrizante e afins)
    const mo = F && F.mochila ? F.mochila() : null, us = mo ? mo.itens.filter(x => x.usavel && x.qtd > 0) : [];
    L.push({ k: 'item', i: '🎒', n: 'Usar item', per: us.length ? us[0].n + (us.length > 1 ? ` +${us.length - 1}` : '') : 'Nada com uso', dt: us.length ? `${us[0].uso.x} ${String(us[0].uso.rec).toUpperCase()}, sem teste` : 'Mochila', off: mo ? '' : 'Sem ficha ativa.' });
    return L;
  },
  desenhar() {
    const eu = euJog(), on = !!eu && persg().on && vezId() === eu && !TV();
    let c = $('#momCartas');
    if (!on) { if (c) { c.remove(); this.html = ''; } return; }
    if (!c) { c = document.createElement('div'); c.id = 'momCartas'; c.className = 'mom-cartas'; c.setAttribute('aria-label', 'Ações da sua vez'); c.addEventListener('click', e => this.clique(e)); }
    const pai = aberto3D() ? $('#s3d') : ($('.palco-area') || document.body);
    if (pai && c.parentNode !== pai) pai.appendChild(c);
    c.classList.toggle('no3d', aberto3D());
    const L = this.dados();
    const html = `<div class="mom-cartas-topo"><b>SUA VEZ</b><span>escolha uma ação</span><button type="button" data-carta="min" aria-label="${this.min ? 'Mostrar as cartas' : 'Esconder as cartas'}">${this.min ? '▴' : '▾'}</button></div>
      <div class="mom-cartas-fila"${this.min ? ' hidden' : ''}>${L.map(x => `<button type="button" class="mom-carta${x.off ? ' off' : ''}" data-carta="${x.k}" title="${esc(x.off || (x.n + ': ' + x.per + ' · ' + x.dt + (x.sub ? ' · ' + x.sub : '')))}"><i>${x.i}</i><b>${esc(x.n)}</b><span>${esc(x.per)}</span><small>${esc(x.dt)}</small></button>`).join('')}</div>`;
    if (html !== this.html) { c.innerHTML = html; this.html = html; }
  },
  clique(e) {
    const b = e.target.closest('[data-carta]'); if (!b) return;
    const k = b.dataset.carta, S = SAH(), F = FX(), ap = api3();
    if (k === 'min') { this.min = !this.min; this.html = ''; this.desenhar(); return; }
    const x = this.dados().find(y => y.k === k);
    if (x && x.off) { avisar(x.off); return; }
    if (document.pointerLockElement) document.exitPointerLock();
    const p = S ? S.pers() : {}, ep = S ? S.meuPart() : null, f = S ? S.furt() : {}, ef = f && f.on ? (f.part || {})[A().meu] : null;
    if (k === 'correr') {
      if (p.on && ep) S.abrirAcaoPers('correr');
      else avisar(ap ? `Ande com WASD, setas ou o joystick: ${x.dt}.` : `Arraste o seu token no mapa: ${x.dt}.`);
    } else if (k === 'esconder') {
      if (ef && !ef.visto) S.abrirAcaoFurt('esconder');
      else if (ap) { const pr = ap.V && ap.V.pertoDe(); if (pr && pr.tipo === 'esconderijo') ap.V.usarEsconderijo(pr); else avisar('Chegue perto de um esconderijo (armário, cama, balcão…) e aperte E: Furtividade DT 15.'); }
      else avisar('Esconder-se é no 3D, perto de um esconderijo (E): Furtividade DT 15. Ou na cena de furtividade do Mestre.');
    } else if (k === 'despistar') S.abrirAcaoPers('despistar');
    else if (k === 'atacar') { if (F && F.abrirAtiva) F.abrirAtiva(); avisar('Na ficha, aba Em jogo: ⚔ Atacar rola o ataque e o dano.'); }
    else if (k === 'item') A().abrirMochila();
  },
};
function avisar(t) { const ap = api3(); if (ap) ap.toast(t); else A().aviso(t); }
const TV = () => !!(A() && A().tv);

/* =========================================================
   2a. SONS DOS FILHOS: a tela do Mestre publica (sem dizer de quem); os jogadores ouvem
   ecos3d/<k> = { a, x, y (aproximados), t: passos | arrastar | respiracao, ts }
   ========================================================= */
const Eco = {
  ant: {}, ult: {}, resp: {}, meus: [], vistos: null, off: null,
  tipoMov(tk) {
    const c = FIL() ? FIL().cfgDe(tk.s) : null, forma = String(((est().formas || {})[tk.s]) || ((est().formas || {})[Object.keys(tokens()).find(k => tokens()[k] === tk)]) || '');
    return (c && c.mov === 'lento') || /rastej|arrast|verme|serpe|lesma|lodo|enxame/i.test(forma) ? 'arrastar' : 'passos';
  },
  silencioso(tk) { const c = FIL() ? FIL().cfgDe(tk.s) : null; return !!(c && c.movx && c.movx.silencioso); },
  rodar() {
    if (!souMestre() || I().espiar || cfgV('sons', true) === false) return;
    const tks = tokens(), t = agora(), mu = MU();
    Object.entries(tks).forEach(([id, tk]) => {
      if (tipoDe(tk) !== 'filho' || !tk.a) return;
      const a0 = this.ant[id]; this.ant[id] = { a: tk.a, x: tk.x, y: tk.y };
      if (tk.fo) return;   // Forma de Objeto: parado como objeto, sem som
      const andou = a0 && a0.a === tk.a ? Math.hypot(tk.x - a0.x, tk.y - a0.y) * mu : 0;
      if (andou > .35 && t - (this.ult[id] || 0) > 1100 && !this.silencioso(tk)) { this.ult[id] = t; this.publicar(this.tipoMov(tk), tk); return; }
      if (andou > .05) return;
      // parado perto de alguém: respira de tempos em tempos (passos silenciosos não calam a respiração, que só se ouve de perto)
      const perto = Object.values(tks).some(c => tipoDe(c) === 'cobaia' && c.a === tk.a && Math.hypot(c.x - tk.x, c.y - tk.y) * mu < (this.silencioso(tk) ? 4 : 9));
      if (perto && t - (this.resp[id] || 0) > 13000 + Math.random() * 9000) { this.resp[id] = t; this.publicar('respiracao', tk); }
    });
    // apaga os eventos velhos que esta tela publicou
    this.meus = this.meus.filter(([k, ts]) => { if (t - ts > 12000) { A().Rede.set('ecos3d/' + k, null).catch(() => {}); return false; } return true; });
  },
  publicar(tipo, tk) {
    const k = A().Rede.chave(), j = () => (Math.random() - .5) * 1.2;
    const W = A().geo.W, H = A().geo.H;
    const v = { a: tk.a, x: +Math.max(0, Math.min(W, tk.x + j())).toFixed(2), y: +Math.max(0, Math.min(H, tk.y + j())).toFixed(2), t: tipo, ts: agora() };
    // sons-filhos.js: a forma (só aparência) e um apelido sorteado, para o jogador ouvir os sons gravados
    const sf = window.ACF_SONS && ACF_SONS.marca ? ACF_SONS.marca(tk) : null; if (sf) Object.assign(v, sf);
    this.meus.push([k, v.ts]);
    A().Rede.set('ecos3d/' + k, v).catch(() => {});
  },
  // jogador: ouve o que chegou depois de entrar, se estiver perto (mesmo andar, até 18 m)
  ligar() {
    const quer = !!euJog() && A().pronto;
    if (quer && !this.off && !this.ligando) {
      // o jogador só lê depois do login invisível (antes dele, o servidor recusa e a escuta morre)
      this.ligando = true; this.vistos = null;
      A().garantirLogin().then(() => {
        this.ligando = false; if (this.off || !euJog()) return;
        let off = null;
        off = A().Rede.on('ecos3d', v => this.chegou(v || {}), () => { if (this.off === off) { this.off = null; setTimeout(() => this.ligar(), 4000); } });
        this.off = off;
      }, () => { this.ligando = false; });
    } else if (!quer && this.off) { this.off(); this.off = null; this.vistos = null; }
  },
  chegou(v) {
    if (!this.vistos) { this.vistos = new Set(Object.keys(v)); return; }
    Object.entries(v).forEach(([k, e]) => {
      if (this.vistos.has(k) || !e) return; this.vistos.add(k);
      this.tocar(e);
    });
    if (this.vistos.size > 400) this.vistos = new Set(Object.keys(v));
  },
  tocar(e) {
    const eu = A().meu, tk = tokens()[eu]; if (!tk || tk.a !== e.a) return false;
    const mu = MU(), dist = Math.hypot(e.x - tk.x, e.y - tk.y) * mu;
    if (dist > (e.t === 'respiracao' ? 7 : 18)) return false;
    // sons gravados da forma (sons-filhos.js); sem arquivo, segue o som sintetizado abaixo (reserva)
    if (window.ACF_SONS && ACF_SONS.eco(e)) return true;
    Aud.preparar(); if (!Aud.ok()) return false;
    const ap = api3();
    if (ap && ap.a === e.a) {
      const c = ap.camera, f = new ap.T.Vector3(); c.getWorldDirection(f);
      Aud.ouvinte(c.position.x, c.position.y, c.position.z, f.x, f.z);
      const [X, Z] = ap.planta3D(e.x, e.y);
      return Aud.criatura(e.t, X, e.t === 'respiracao' ? 1.5 : .2, Z, 1);
    }
    Aud.ouvinte(tk.x * mu, 1.6, tk.y * mu, 0, -1);
    return Aud.criatura(e.t, e.x * mu, e.t === 'respiracao' ? 1.5 : .2, e.y * mu, 1);
  },
};

/* =========================================================
   2b. LANTERNA COM BATERIA (item "Lanterna…" da ficha ativa; bateria em itens.<id>.bat)
   O Mestre recarrega pelo cartão da cobaia: mapa/pilhas/<cobaia> = carimbo
   ========================================================= */
const Luz = {
  bat: null, id: null, salvo: null, tSalvo: 0, aviso10: false,
  item() {
    const at = FX() && FX().ativa && FX().ativa(); if (!at) return null;
    const e = Object.entries(at.d.itens || {}).find(([, it]) => it && /^lanterna/i.test(String(it.n || '').trim()));
    if (!e) return null;
    const [id, it] = e;
    return { id, n: it.n, bat: it.bat === undefined || it.bat === '' || it.bat === null ? 100 : Math.max(0, Math.min(100, num(it.bat))), ts: num(it.batTs) };
  },
  sinc() {
    const it = this.item();
    if (!it) { this.id = null; this.bat = null; return null; }
    // a ficha manda, menos logo depois de uma gravação deste aparelho (a cópia local da ficha chega um instante depois)
    if (it.id !== this.id || this.salvo === null || (Math.abs(it.bat - this.salvo) > .5 && agora() - this.tSalvo > 3000)) { this.id = it.id; this.bat = it.bat; this.salvo = it.bat; }
    return it;
  },
  bloqueio(quem) {
    if (quem !== 'jog') return '';
    if (!(FX() && FX().ativa && FX().ativa())) return 'Sem ficha ativa: a lanterna vem do inventário da ficha (📋 Fichas › ★).';
    const it = this.sinc();
    if (!it) return 'Você não tem uma Lanterna na ficha ativa. Sem ela, o escuro é seu.';
    if (this.bat <= 0) return 'A bateria da lanterna acabou. Peça pilhas ao Mestre.';
    return '';
  },
  // chamado a cada quadro com a lanterna acesa: gasta a bateria e devolve o fator da luz (treme no fim)
  gastar(dt) {
    if (this.id === null || this.bat === null) this.sinc();
    if (this.bat === null) return 0;
    const min = Math.max(1, num(cfgV('luzMin', 30), 30));
    this.bat = Math.max(0, this.bat - dt / (min * 60) * 100);
    if (this.bat < 10 && !this.aviso10) { this.aviso10 = true; avisar('🔋 A lanterna está fraca.'); }
    if (this.bat >= 10) this.aviso10 = false;
    if ((this.salvo - this.bat >= 2 || (this.bat <= 0 && this.salvo > 0)) && agora() - this.tSalvo > 1500) this.salvar();
    if (this.bat <= 0) return 0;
    if (this.bat < 10) { const k = this.bat < 3 ? .45 : .2; return Math.random() < k ? .05 + Math.random() * .3 : .55 + Math.random() * .45; }
    return 1;
  },
  salvar() {
    if (this.id === null || this.bat === null || !FX()) return;
    this.tSalvo = agora(); this.salvo = Math.round(this.bat);
    FX().aplicarNaAtiva([[`itens.${this.id}.bat`, Math.round(this.bat)]]);
  },
  // pilhas novas do Mestre: aplica uma vez (o carimbo fica no item)
  verPilhas() {
    const eu = euJog(); if (!eu) return;
    const ts = num(((est().pilhas || {})[eu]));
    if (!ts) return;
    const it = this.item(); if (!it || it.ts >= ts) return;
    if (this._aplicando === ts) return; this._aplicando = ts;
    this.tSalvo = agora();
    FX().aplicarNaAtiva([[`itens.${it.id}.bat`, 100], [`itens.${it.id}.batTs`, ts]]).then(ok => { if (ok) { this.bat = 100; this.salvo = 100; this.id = it.id; this.tSalvo = agora(); avisar('🔋 Pilhas novas: a lanterna está com 100%.'); } else this._aplicando = 0; });
  },
};

/* =========================================================
   2c. MAPA QUE MENTE (SAN abaixo de X% do máximo): só na tela daquele jogador, nada gravado
   ========================================================= */
const Mente = {
  prox: 0, ativo: null,
  tick() {
    const eu = euJog(), tk = eu && tokens()[eu], v = tk && tk.vit;
    const lim = Math.max(1, Math.min(100, num(cfgV('sanMente', 25), 25))) / 100;
    const baixa = !!(v && !v.det && num(v.sanM) > 0 && num(v.san) < num(v.sanM) * lim);
    if (!baixa || aberto3D() || !tk || tk.a !== I().andarAtual || document.hidden) { this.limpar(); if (!baixa) this.prox = 0; return; }
    if (this.ativo) { if (agora() > this.ativo.ate) this.limpar(); return; }
    if (!this.prox) this.prox = agora() + 6000 + Math.random() * 14000;
    if (agora() < this.prox) return;
    this.prox = agora() + 28000 + Math.random() * 45000;
    if (Math.random() < .5) this.portaFalsa(tk); else this.sumirSala(tk);
  },
  salasPerto(tk) {
    const p = salaP(tk), C = A().geo.CORREDORES, viz = new Set();
    if (p) C.forEach(c => { if (c.p1 === p) viz.add(c.p2); if (c.p2 === p) viz.add(c.p1); });
    return { p, viz: [...viz] };
  },
  portaFalsa(tk) {
    const g = A().geo, C = g.CORREDORES, { p, viz } = this.salasPerto(tk), st = I().stage, px = I().px;
    const cands = [p, ...viz].filter(Boolean);
    const c0 = C[0], larg = c0.eixo === 'h' ? c0.h : c0.w;
    const opcoes = [];
    cands.forEach(q => {
      const r = g.retSala(q);
      const lados = [
        { x: r.x + r.w / 2 - larg / 2, y: r.y - g.G, w: larg, h: g.G, eixo: 'v' },
        { x: r.x + r.w / 2 - larg / 2, y: r.y + r.h, w: larg, h: g.G, eixo: 'v' },
        { x: r.x - g.G, y: r.y + r.h / 2 - larg / 2, w: g.G, h: larg, eixo: 'h' },
        { x: r.x + r.w, y: r.y + r.h / 2 - larg / 2, w: g.G, h: larg, eixo: 'h' },
      ];
      lados.forEach(l => {
        const toca = C.some(c => l.x < c.x + c.w - .01 && l.x + l.w > c.x + .01 && l.y < c.y + c.h - .01 && l.y + l.h > c.y + .01);
        const dentro = l.x >= -.01 && l.y >= -.01 && l.x + l.w <= g.W + .01 && l.y + l.h <= g.H + .01;
        if (!toca && dentro) opcoes.push(l);
      });
    });
    if (!opcoes.length || !st) { this.sumirSala(tk); return; }
    const l = opcoes[Math.floor(Math.random() * opcoes.length)];
    const d = document.createElement('div'); d.className = 'corredor mente-corr';
    Object.assign(d.style, { left: px(l.x), top: px(l.y), width: px(l.w), height: px(l.h) });
    const pt = document.createElement('div'); pt.className = 'porta-chao porta-f mente-porta';
    const bw = l.eixo === 'h' ? .25 : l.w, bh = l.eixo === 'h' ? l.h : .25;
    Object.assign(pt.style, { left: px(l.eixo === 'h' ? l.x + l.w / 2 - .125 : l.x), top: px(l.eixo === 'h' ? l.y : l.y + l.h / 2 - .125), width: px(bw), height: px(bh) });
    pt.innerHTML = '<i class="botao-2d"></i>';
    st.appendChild(d); st.appendChild(pt);
    this.ativo = { ate: agora() + 4000 + Math.random() * 3000, els: [d, pt] };
  },
  sumirSala(tk) {
    const { p, viz } = this.salasPerto(tk);
    const alvo = viz.length ? viz[Math.floor(Math.random() * viz.length)] : null;
    if (!alvo) return;
    const cn = I().cnDe(tk.a, alvo), s = $(`#stage .sala[data-cn="${cn}"]`) || $(`.sala[data-cn="${cn}"]`);
    if (!s) return;
    s.classList.add('mente-some');
    this.ativo = { ate: agora() + 3000 + Math.random() * 3000, sala: s };
  },
  limpar() {
    if (!this.ativo) return;
    (this.ativo.els || []).forEach(e => e.remove());
    if (this.ativo.sala) this.ativo.sala.classList.remove('mente-some');
    this.ativo = null;
  },
};

/* =========================================================
   2d. O QUE SÓ UM JOGADOR VÊ: sustos/<cobaia> = { t: rosto | figura | nome, ts, k }
   O Mestre manda num clique (cartão da cobaia). Só aquele aparelho mostra.
   ========================================================= */
const Susto = {
  off: null, de: '', primeiro: true,
  ligar() {
    const eu = euJog(), quer = eu && A().pronto ? eu : '';
    if (quer === this.de) return;
    if (this.off) { this.off(); this.off = null; }
    this.de = quer; this.primeiro = true;
    if (!quer) return;
    A().garantirLogin().then(() => {
      if (this.de !== quer || this.off) return;
      let off = null;
      off = A().Rede.on('sustos/' + quer, v => this.chegou(v), () => { if (this.off === off) { this.off = null; this.de = ''; setTimeout(() => this.ligar(), 4000); } });
      this.off = off;
    }, () => { this.de = ''; });
  },
  chegou(v) {
    const chave = 'acf-sustos-' + this.de, visto = ls.get(chave, 0);
    if (!v || !v.ts) { this.primeiro = false; return; }
    if (this.primeiro) { this.primeiro = false; if (!visto) { ls.set(chave, v.ts); return; } }
    if (v.ts <= visto) return;
    ls.set(chave, v.ts);
    this.mostrar(v);
  },
  mostrar(v) {
    Aud.preparar();
    const nome = (SERd(this.de || A().meu) || {}).nome || '';
    if (v.t === 'nome') {
      A().chatLocal({ t: `…${nome}…`, ts: agora() });
      Aud.sussurro();
      legenda(`…${nome}…`);
      return;
    }
    Aud.ferroada();
    if (api3()) Vista.susto(v.t);
    else susto2D(v.t);
  },
  enviar(cob, t) {
    if (!souMestre()) return;
    A().Rede.set('sustos/' + cob, { t, ts: agora(), k: Math.random().toString(36).slice(2, 8) }).then(() => {
      A().aviso(`👁 ${({ rosto: 'Rosto na janela', figura: 'Figura no fim do corredor', nome: 'Nome sussurrado' })[t]}: só ${(SERd(cob) || {}).nome} vê.`);
      A().diario('sala', `Susto só para ${(SERd(cob) || {}).nome}: ${t}`);
    }, () => A().aviso('O servidor recusou o susto (atualize as regras do Firebase).'));
  },
};
function legenda(txt) {
  let l = $('#momLegenda');
  if (!l) { l = document.createElement('div'); l.id = 'momLegenda'; l.className = 'mom-legenda'; l.setAttribute('aria-live', 'polite'); }
  const pai = aberto3D() ? $('#s3d') : document.body; if (l.parentNode !== pai) pai.appendChild(l);
  l.textContent = txt; l.classList.remove('on'); void l.offsetWidth; l.classList.add('on');
  clearTimeout(l._t); l._t = setTimeout(() => l.classList.remove('on'), 2600);
}
// rosto e figura no mapa 2D
function rostoCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0, 0, w, h);
  const g = x.createRadialGradient(w / 2, h * .46, w * .05, w / 2, h * .48, w * .42); g.addColorStop(0, '#e9e4dc'); g.addColorStop(.7, '#9d978e'); g.addColorStop(1, 'rgba(40,36,34,0)');
  x.fillStyle = g; x.beginPath(); x.ellipse(w / 2, h * .48, w * .3, h * .4, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#050304';
  [-1, 1].forEach(s => { x.beginPath(); x.ellipse(w / 2 + s * w * .11, h * .4, w * .065, h * .085, 0, 0, Math.PI * 2); x.fill(); });
  x.beginPath(); x.ellipse(w / 2, h * .7, w * .07, h * .11, 0, 0, Math.PI * 2); x.fill();
  return c;
}
function susto2D(t) {
  const st = I().stage, eu = A().meu, tk = tokens()[eu];
  if (t === 'rosto') {
    const d = document.createElement('div'); d.className = 'mom-rosto2d'; d.setAttribute('aria-hidden', 'true');
    const lado = Math.random() < .5 ? 'esq' : 'dir'; d.classList.add(lado);
    d.appendChild(rostoCanvas(220, 260)); document.body.appendChild(d);
    setTimeout(() => d.remove(), 2200);
    return;
  }
  // figura: no fim do corredor que sai da sala da cobaia (ou do corredor onde ela está)
  if (!st || !tk || tk.a !== I().andarAtual) return;
  const g = A().geo, p = salaP(tk), C = g.CORREDORES;
  let ci = p ? C.findIndex(c => c.p1 === p || c.p2 === p) : I().corredorEm(tk.x, tk.y);
  const cs = p ? C.map((c, i) => [c, i]).filter(([c]) => c.p1 === p || c.p2 === p) : [];
  if (cs.length) ci = cs[Math.floor(Math.random() * cs.length)][1];
  const c = C[ci]; if (!c) return;
  const r = p ? g.retSala(p) : null, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
  let fx = cx, fy = cy;
  if (r) { if (c.eixo === 'h') fx = Math.abs(c.x - (r.x + r.w)) < .1 ? c.x + c.w - .3 : c.x + .3; else fy = Math.abs(c.y - (r.y + r.h)) < .1 ? c.y + c.h - .3 : c.y + .3; }
  const f = document.createElement('div'); f.className = 'mom-figura2d'; f.setAttribute('aria-hidden', 'true'); f.innerHTML = '<span class="mom-fig-pino"><i></i></span>';
  f.style.left = I().px(fx); f.style.top = I().px(fy);
  st.appendChild(f);
  setTimeout(() => f.classList.add('some'), 2400); setTimeout(() => f.remove(), 3200);
}

/* =========================================================
   3a. MORTE COM PESO: o corpo fica na sala (mapa/corpos/<cobaia>) e se examina com E
   A tela do Mestre grava quando o contador de Morrendo chega a 3 (óbito, como na Mesa).
   Só o que dá para ver de relance: armas, o que está vestido, itens grandes e a lanterna. Nada de segredo.
   ========================================================= */
const Corpo = {
  pend: {},
  vigiar() {
    if (!souMestre() || I().espiar || !A().pronto) return;
    const c = est().cond || {}, corpos = est().corpos || {}, tks = tokens();
    (A().SERES || []).filter(x => x.tipo === 'cobaia').forEach(x => {
      const mt = int((c[x.id] || {})._mt);
      if (mt >= 3 && !corpos[x.id] && !this.pend[x.id] && tks[x.id] && tks[x.id].a) this.criar(x.id, tks[x.id]);
      if (mt < 3 && corpos[x.id] && !this.pend[x.id]) A().definir(['corpos', x.id], null);   // voltou do Morrendo: o corpo sai
    });
  },
  async criar(id, tk) {
    this.pend[id] = 1;
    let itens = [];
    try {
      const fichas = (await A().Rede.once('agentes/' + id)) || {}, nome = (tk.vit || {}).nome;
      const lst = Object.values(fichas).filter(x => x && typeof x === 'object');
      const d = lst.find(x => nome && x.nome === nome) || (lst.length === 1 ? lst[0] : null);
      if (d) itens = Object.values(d.itens || {}).filter(it => it && it.n && it.t !== 'amaldicoado' && (it.t === 'arma' || it.vest || num(it.esp) >= 2 || /^lanterna/i.test(it.n))).map(it => String(it.n).slice(0, 40) + (it.vest ? ' (vestido)' : '')).slice(0, 8);
    } catch (e) {}
    const v = { a: tk.a, x: tk.x, y: tk.y, cn: cnTk(tk) || 0, ts: agora(), dia: int((est().ruido || {}).d) || 1 };
    if (itens.length) v.itens = itens;
    A().definir(['corpos', id], v);
    A().diario('sala', `${(SERd(id) || {}).nome}: o corpo ficou em ${v.cn ? 'CN ' + pad2(v.cn) : 'um corredor'}`);
    setTimeout(() => { delete this.pend[id]; }, 1500);
  },
  // quem enxerga o corpo: Mestre, todos; auxiliar, salas reveladas; jogador, a sala onde está (ou perto, no corredor)
  visivel(id, c) {
    if (!c || !c.a) return false;
    if (souMestre()) return true;
    if (souAux()) return !c.cn || A().salaRevelada(c.cn);
    const tk = tokens()[A().meu]; if (!tk || tk.a !== c.a) return false;
    if (c.cn) return cnTk(tk) === c.cn;
    return Math.hypot(tk.x - c.x, tk.y - c.y) < 4;
  },
  examinar(id) {
    const c = (est().corpos || {})[id]; if (!c) return;
    const s = SERd(id) || {}, h = new Date(c.ts || agora());
    modal(`<p class="mom-k">CORPO</p><div class="mom-corpo-topo">${s.img ? `<img src="${esc(s.img)}" alt="">` : ''}<div><h3>${esc(s.nome || id)}</h3><span>${esc(s.codigo || '')}</span></div></div>
      <p>Óbito registrado no dia ${int(c.dia) || 1}, às ${pad2(h.getHours())}:${pad2(h.getMinutes())}.</p>
      <p><b>O que dá para ver:</b> ${c.itens && Object.values(c.itens).length ? Object.values(c.itens).map(esc).join(' · ') : 'nada que se note de relance.'}</p>`);
  },
  // marcador no mapa 2D (o mesmo exame)
  desenhar2D() {
    const st = I().stage; if (!st) return;
    const corpos = est().corpos || {}, a = I().andarAtual, vivos = new Set();
    Object.entries(corpos).forEach(([id, c]) => {
      if (!c || c.a !== a || !this.visivel(id, c)) return;
      vivos.add(id);
      let m = st.querySelector(`.mom-corpo2d[data-id="${id}"]`);
      if (!m) { m = document.createElement('button'); m.type = 'button'; m.className = 'mom-corpo2d'; m.dataset.id = id; m.title = 'Examinar o corpo'; m.setAttribute('aria-label', 'Examinar o corpo de ' + ((SERd(id) || {}).nome || '')); m.innerHTML = '<span class="mom-corpo-pino">✝</span>'; m.onclick = ev => { ev.stopPropagation(); this.examinar(id); }; st.appendChild(m); }
      m.style.left = I().px(c.x); m.style.top = I().px(c.y);
    });
    $$('.mom-corpo2d', st).forEach(m => { if (!vivos.has(m.dataset.id)) m.remove(); });
  },
};
function modal(html) {
  let m = $('#momModal'); if (m) m.remove();
  m = document.createElement('div'); m.id = 'momModal'; m.className = 'mom-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
  m.innerHTML = `<div class="mom-caixa">${html}<div class="mom-bts"><button type="button" class="pri" data-mom-ok>Fechar</button></div></div>`;
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-mom-ok]')) m.remove(); });
  document.body.appendChild(m);
  const b = $('[data-mom-ok]', m); if (b) b.focus();
}

/* =========================================================
   CÂMERAS DE SEGURANÇA (configuração): mapa/cameras/cNN = { alvos: "1, 3", fs: <Filho>, fcn: <CN> }
   Sem nada gravado, valem os monitores da CN 02 e da CN 75 mostrando as salas vizinhas.
   ========================================================= */
const CAM_PADRAO = { c2: {}, c75: {} };
function cams() {
  const c = est().cameras;
  if (!c || typeof c !== 'object') return CAM_PADRAO;
  return Object.fromEntries(Object.entries(c).filter(([k, v]) => /^c\d{1,3}$/.test(k) && v));
}
function alvosDe(cn, cam) {
  const a = Math.ceil(cn / 25), p = cn - 25 * (a - 1);
  const lst = String((cam && cam.alvos) || '').split(/[^0-9]+/).map(int).filter(n => n >= 1 && n <= 125 && Math.ceil(n / 25) === a && n !== cn);
  if (lst.length) return lst;
  const C = A().geo.CORREDORES, viz = [];
  C.forEach(c => { if (c.p1 === p) viz.push(c.p2); if (c.p2 === p) viz.push(c.p1); });
  return [...new Set(viz)].map(q => 25 * (a - 1) + q);
}

/* ---------- bloco do Mestre (aba Sessão) e botões no cartão da cobaia ---------- */
function blocoMestre() {
  let b = $('#blocoMomento');
  if (!souMestre() || I().espiar) { if (b) b.hidden = true; return; }
  if (!b) {
    b = document.createElement('section'); b.className = 'bloco mestre-only mom-bloco'; b.id = 'blocoMomento'; b.dataset.aba = 'sessao';
    const ref = $('#blocoPersgM'); ref ? ref.parentNode.insertBefore(b, ref.nextSibling) : $('#painel').appendChild(b);
    const ab = ($('#abasMestre button.ativo') || {}).dataset; if (ab && ab.aba) b.classList.toggle('fora-da-aba', ab.aba !== 'sessao');
  }
  b.hidden = false;
  if (b.contains(document.activeElement) && document.activeElement.matches('input, select, textarea')) return;
  const cf = cfg(), cs = cams(), filhos = (A().SERES || []).filter(s => s.tipo === 'filho');
  const html = `<h2>Encontros, sons e câmeras</h2>
    <label class="chave"><input type="checkbox" data-mc="encontro" ${cf.encontro === false ? '' : 'checked'}><span>Propor encontros (Filho à vista de uma cobaia, barulho no limite)</span></label>
    <label class="chave"><input type="checkbox" data-mc="sons" ${cf.sons === false ? '' : 'checked'}><span>Sons dos Filhos para os jogadores (passos, arrasto, respiração)</span></label>
    <div class="mom-grade"><label>SAN para o mapa mentir (% do máximo)<input type="number" min="1" max="100" data-mc="sanMente" value="${esc(cfgV('sanMente', 25))}"></label>
    <label>Bateria da lanterna (minutos acesa)<input type="number" min="1" max="600" data-mc="luzMin" value="${esc(cfgV('luzMin', 30))}"></label></div>
    <h3>Câmeras de segurança</h3>
    <label class="mom-l">Salas com monitor (CN, separadas por vírgula)<input id="momCamSalas" value="${esc(Object.keys(cs).map(k => +k.slice(1)).join(', '))}" placeholder="ex.: 2, 75"></label>
    ${Object.entries(cs).map(([k, c]) => { const cn = +k.slice(1); return `<div class="mom-cam" data-cam="${k}"><b>CN ${pad2(cn)}</b>
      <label>Mostra (CN)<input data-cam-alvos value="${esc(c.alvos || '')}" placeholder="vizinhas: ${alvosDe(cn, {}).join(', ')}"></label>
      <label>Filho onde ele não está<select data-cam-fs><option value="">nenhum</option>${filhos.map(s => `<option value="${s.id}" ${c.fs === s.id ? 'selected' : ''}>${esc((s.codigo || '') + ' ' + s.nome)}</option>`).join('')}</select></label>
      <label>na CN<input type="number" data-cam-fcn value="${esc(c.fcn || '')}" min="1" max="125"></label></div>`; }).join('')}
    <p class="mini">Quem está na sala do monitor (no 3D) vê as outras salas ao vivo, em baixa resolução, trocando a cada 6 s. Jogadores só veem salas já reveladas. O "Filho onde ele não está" aparece só na imagem da câmera. Em <code>mapa/cameras</code> (todos leem).</p>`;
  if (b.dataset.h === html) return;
  b.dataset.h = html; b.innerHTML = html;
  $$('[data-mc]', b).forEach(i => i.onchange = () => {
    const k = i.dataset.mc, v = i.type === 'checkbox' ? (i.checked ? null : false) : (i.value === '' ? null : Math.max(1, int(i.value)));
    A().definir(['cfg', 'momento', k], v);
  });
  const gravarCams = () => {
    const salas = String($('#momCamSalas', b).value || '').split(/[^0-9]+/).map(int).filter(n => n >= 1 && n <= 125);
    const novo = {};
    salas.forEach(cn => { const k = 'c' + cn, el = $(`.mom-cam[data-cam="${k}"]`, b), ant = cs[k] || {};
      const v = el ? { alvos: $('[data-cam-alvos]', el).value.trim().slice(0, 60), fs: $('[data-cam-fs]', el).value, fcn: int($('[data-cam-fcn]', el).value) } : { alvos: ant.alvos || '', fs: ant.fs || '', fcn: ant.fcn || 0 };
      const o = {}; if (v.alvos) o.alvos = v.alvos; if (v.fs && v.fcn) { o.fs = v.fs; o.fcn = v.fcn; } if (!Object.keys(o).length) o.on = 1; novo[k] = o; });
    A().definir(['cameras'], Object.keys(novo).length ? novo : { nenhum: 1 });
    b.dataset.h = '';
  };
  $('#momCamSalas', b).onchange = gravarCams;
  $$('.mom-cam input, .mom-cam select', b).forEach(i => i.onchange = gravarCams);
}
function ligarCartao() {
  A().ganchoToken({
    html(id, tk) {
      if (!souMestre() || tipoDe(tk) !== 'cobaia') return '';
      const nome = (SERd(id) || {}).nome || '', corpo = (est().corpos || {})[id];
      const temCorpo = corpo && corpo.a;
      return `<details class="mom-det"><summary>👁 Susto só para ${esc(nome)}</summary><div class="acoes mom-sustos"><button type="button" data-mom-susto="rosto">🪟 Rosto na janela</button><button type="button" data-mom-susto="figura">🚪 Figura no fim do corredor</button><button type="button" data-mom-susto="nome">🗣 Nome sussurrado no chat</button></div><p class="mini">Só esta cobaia vê (no 3D, se estiver nele; senão no mapa). Se quiser o teste de Sanidade, use o Medo em jogo.</p></details>
        <div class="acoes"><button type="button" data-mom-pilhas>🔋 Recarregar a lanterna (pilhas novas)</button>${temCorpo ? '<button type="button" data-mom-corpo-x>✝ Tirar o corpo do mapa</button>' : ''}</div>`;
    },
    ligar(c, id) {
      $$('[data-mom-susto]', c).forEach(b => b.onclick = () => Susto.enviar(id, b.dataset.momSusto));
      const bp = $('[data-mom-pilhas]', c); if (bp) bp.onclick = () => { A().definir(['pilhas', id], agora()); A().aviso(`🔋 Pilhas enviadas: a lanterna de ${(SERd(id) || {}).nome} volta a 100% quando o aparelho dela receber.`); };
      const bx = $('[data-mom-corpo-x]', c); if (bx) bx.onclick = () => { A().definir(['corpos', id], { tirado: 1, ts: agora() }); };   // não volta enquanto ela estiver morta
    },
  });
}

/* =========================================================
   3b. A VISTA 3D (extensão do sala3d.js): zoom do encontro, anel da vez, cor e som da
   perseguição, relógio, lanterna com bateria, fumaça, poeira na luz, sombras dos tokens,
   monitores de segurança, corpos e sustos. Tudo respeita as Opções de qualidade.
   ========================================================= */
const FRAG_FUMACA = `uniform float uT, uA; uniform vec3 uCor; uniform vec2 uCam; varying vec3 vW;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }
  void main(){ vec2 q = vW.xz * .16 + vec2(uT * .035, uT * .021); float v = n(q) * .55 + n(q * 2.1 - uT * .05) * .3 + n(q * 4.3 + uT * .04) * .15;
    float a = smoothstep(.38, .9, v) * uA * (1. - smoothstep(7., 15., length(vW.xz - uCam)));
    gl_FragColor = vec4(uCor, a); }`;
const VERT_W = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const Vista = {
  ap: null, Z: null, alivio: 0, cinza: 0, borda: 0, abafo: 1,
  iniciar(ap) {
    this.ap = ap; this.Z = null; this.cinza = 0; this.borda = 0; this.abafo = 1; this.t05 = 0; this.t1 = 0;
    const T = ap.T;
    this.grupo = new T.Group(); ap.cena.add(this.grupo);
    this.desc = [];
    const guardar = x => { this.desc.push(x); return x; };
    this.guardar = guardar;
    // anel da vez
    this.ring = { g: new T.Group(), sig: '', t: 0, linha: null, fill: null };
    this.grupo.add(this.ring.g);
    this.matLinha = guardar(new T.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: .9, depthWrite: false, depthTest: false, toneMapped: false, side: T.DoubleSide }));
    this.matFill = guardar(new T.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: .14, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
    // sombra redonda dos tokens
    const [c, x] = window.ACF3D.tela(64, 64); const g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(.6, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.clearRect(0, 0, 64, 64); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    this.texSombra = guardar(new T.CanvasTexture(c));
    this.matSombra = guardar(new T.MeshBasicMaterial({ map: this.texSombra, transparent: true, depthWrite: false, toneMapped: false }));
    this.geoPlano = guardar(new T.PlaneGeometry(1, 1)); 
    // fumaça baixa (camadas animadas): menos no celular; desligável nas Opções
    const fum = ap.CFG.fumaca === 'auto' ? true : !!ap.CFG.fumaca;
    this.fumaca = [];
    if (fum) (ap.celular ? [.3] : [.12, .38, .75]).forEach((y, i) => {
      const m = guardar(new T.ShaderMaterial({ uniforms: { uT: { value: i * 7 }, uA: { value: .16 }, uCor: { value: new T.Color('#8c8a96') }, uCam: { value: new T.Vector2() } }, vertexShader: VERT_W, fragmentShader: FRAG_FUMACA, transparent: true, depthWrite: false, side: T.DoubleSide }));
      const p = new T.Mesh(guardar(new T.PlaneGeometry(34, 34)), m); p.rotation.x = -Math.PI / 2; p.position.y = y; p.renderOrder = 3; p.raycast = () => {};
      this.grupo.add(p); this.fumaca.push(p);
    });
    // poeira na luz da lanterna
    const nB = !ap.CFG.poeira ? 0 : ap.celular ? 70 : 220;
    this.beam = null;
    if (nB) {
      const loc = new Float32Array(nB * 3), pos = new Float32Array(nB * 3);
      for (let i = 0; i < nB; i++) { const d = .9 + Math.random() * 4.4, ang = Math.random() * Math.PI * 2, r = d * .4 * Math.sqrt(Math.random()); loc[i * 3] = Math.cos(ang) * r; loc[i * 3 + 1] = Math.sin(ang) * r; loc[i * 3 + 2] = d; }
      const geo = guardar(new T.BufferGeometry()); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      // grão redondo e macio (sem o quadrado do ponto padrão)
      const [cp, xp] = window.ACF3D.tela(32, 32); xp.clearRect(0, 0, 32, 32); const gp = xp.createRadialGradient(16, 16, 0, 16, 16, 15); gp.addColorStop(0, 'rgba(255,255,255,1)'); gp.addColorStop(.35, 'rgba(255,255,255,.5)'); gp.addColorStop(1, 'rgba(255,255,255,0)'); xp.fillStyle = gp; xp.fillRect(0, 0, 32, 32);
      const mat = guardar(new T.PointsMaterial({ color: '#fff1d2', map: guardar(new T.CanvasTexture(cp)), size: ap.celular ? .02 : .014, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
      const pts = new T.Points(geo, mat); pts.frustumCulled = false; pts.raycast = () => {}; this.grupo.add(pts);
      this.beam = { pts, loc, pos, n: nB, b: [new T.Vector3(), new T.Vector3(), new T.Vector3()] };
    }
    this.mon = new Map(); this.corpos = new Map(); this.sustos = []; this.fant = new Map();
    // relógio da vez e bateria da lanterna na tela do 3D
    const d = ap.V.d;
    if (d && !$('#momRelogio', d)) { const r = document.createElement('div'); r.id = 'momRelogio'; r.className = 'mom-relogio'; r.hidden = true; ($('.s3d-faixas', d) || d).appendChild(r); }
    const bl = d && $('[data-s3dv="lanterna"]', d);
    if (bl && !$('.mom-bat', bl)) { const s = document.createElement('small'); s.className = 'mom-bat'; s.hidden = true; bl.appendChild(s); }
  },
  fechar() {
    const ap = this.ap; if (!ap) return;
    try { ap.extraSalas.clear(); } catch (e) {}
    this.mon.forEach(m => { try { m.rt.dispose(); } catch (e) {} });
    this.fant.forEach(f => { try { this.grupo.remove(f.g); } catch (e) {} });
    try { ap.cena.remove(this.grupo); } catch (e) {}
    this.desc.forEach(x => { try { x.dispose(); } catch (e) {} });
    this.desc = []; this.mon.clear(); this.corpos.clear(); this.sustos = []; this.fant.clear();
    try { ap.Som.abafo = 1; } catch (e) {}
    const r = $('#momRelogio'); if (r) r.remove();
    $$('.mom-bat').forEach(x => x.remove());
    this.ap = null; this.Z = null;
  },
  // o tempo do zoom é o do relógio (num aparelho lento, com poucos quadros, ele dura o mesmo)
  zoom(alvo, op) { if (!this.ap) return; this.Z = { alvo, t0: performance.now(), t: 0, dur: op.dur || 2, fov: op.fov || 0, borda: op.borda || 0, suave: !!op.suave, fov0: this.ap.camera.fov }; },
  novaVez(id) {
    const ap = this.ap; if (!ap || ap.CFG.enquadrar === false || !id) return;
    if (id === euJog() || (ap.V && ap.V.ctrl === id)) return;
    if (!ap.quemVe(id) || (this.Z && this.Z.borda)) return;
    this.zoom(id, { dur: 1.5, suave: true });
  },
  quadro(dt, t) {
    const ap = this.ap; if (!ap || !ap.V) return;
    // relógio de verdade (o dt do 3D tem teto: num aparelho lento o tempo do jogo anda mais devagar)
    const tw = performance.now() / 1000, dw = Math.min(1, Math.max(0, tw - (this.tw || tw))); this.tw = tw;
    const T = ap.T, cam = ap.camera, est = ap.est, u = ap.pos.final.uniforms;
    this.t05 -= dw; this.t1 -= dw;
    // zoom (encontro) ou enquadrar (começo da vez): a câmera vira para o alvo sem tirar o controle
    let bordaAlvo = 0;
    if (this.Z) {
      const Z = this.Z; Z.t = (performance.now() - Z.t0) / 1000; const k = Math.min(1, Z.t / Z.dur), f = 1 - Math.exp(-Math.max(dw, .016) * (Z.suave ? 3.2 : 2.4));
      const o = Z.alvo && ap.tok.mapa.get(Z.alvo);
      if (o) {
        const alt = (o.t.alt || 1.6) * .7;
        if (ap.imersivo(est.modo)) {
          const dx = o.x - cam.position.x, dz = o.z - cam.position.z, dy = alt - cam.position.y;
          const yaw = Math.atan2(-dx, -dz), pitch = Math.max(-1, Math.min(1, Math.atan2(dy, Math.hypot(dx, dz))));
          let dyw = yaw - est.yaw; while (dyw > Math.PI) dyw -= Math.PI * 2; while (dyw < -Math.PI) dyw += Math.PI * 2;
          est.yaw += dyw * f; est.pitch += (pitch - est.pitch) * f;
        } else if (!(ap.V.ctrl && est.modo === 'jogo')) { est.ax += (o.x - est.ax) * f; est.az += (o.z - est.az) * f; }
      }
      if (Z.fov) { cam.fov = Z.fov0 * (1 - Z.fov * Math.sin(k * Math.PI / 2)); cam.updateProjectionMatrix(); }
      bordaAlvo = Z.borda * (k < .8 ? 1 : (1 - k) / .2);
      if (k >= 1) this.Z = null;
    }
    // cor: quem espera a vez vê a tela dessaturada; no fim da perseguição a cor volta devagar
    const p = persg(), eu = euJog(), espera = !!(p.on && eu && vezId() !== eu);
    const alvoC = espera ? .55 : 0;
    this.cinza += (alvoC - this.cinza) * Math.min(1, dw * (alvoC > this.cinza ? 2.2 : .45));
    this.borda += (bordaAlvo - this.borda) * Math.min(1, dw * (bordaAlvo > this.borda ? 6 : 1.5));
    u.uCinza.value = this.cinza; u.uBorda.value = this.borda;
    // som: o ambiente abaixa no encontro e na perseguição e volta aos poucos
    const alvoA = this.Z && this.Z.borda ? .3 : p.on ? .6 : 1;
    this.abafo += (alvoA - this.abafo) * Math.min(1, dw * (alvoA < this.abafo ? 3 : .3));
    ap.Som.abafo = this.abafo;
    this.anel(dt, t, p);
    this.relogio(p, espera);
    this.lanterna(dw, t);
    this.fumacaTick(t);
    if (this.t05 <= 0) { this.t05 = .5; this.sombras(); this.sincCorpos(); }
    this.esconderMortos();
    if (this.t1 <= 0) { this.t1 = 1; this.sincMon(); }
    this.monTick(dw, tw);
    this.sustoTick(dw);
  },
  /* ---------- anel no chão: quanto o token da vez ainda anda (metros de regra) ---------- */
  anel(dt, t, p) {
    const ap = this.ap, R = this.ring, vid = vezId(), tk = vid && tokens()[vid], o = vid && ap.tok.mapa.get(vid);
    if (!p.on || !tk || !o || tk.a !== ap.a) { R.g.visible = false; R.sig = ''; return; }
    const oz = ordemP().find(x => x.id === vid) || {}, lim = FIL() ? FIL().limite(vid, num(oz.lim, 9)) : num(oz.lim, 9), rest = Math.max(0, lim - num(tk.m));
    const sig = vid + ':' + tk.x + ',' + tk.y + ':' + rest.toFixed(2);
    R.t -= dt;
    if (sig !== R.sig && R.t <= 0) { R.sig = sig; R.t = .18; this.montarAnel(tk, rest); }
    R.g.visible = rest > .05;
    this.matLinha.opacity = .65 + Math.sin(t * 4) * .25;
  },
  montarAnel(tk, rest) {
    const ap = this.ap, T = ap.T, R = this.ring;
    if (R.linha) { R.g.remove(R.linha); R.linha.geometry.dispose(); R.linha = null; }
    if (R.fill) { R.g.remove(R.fill); R.fill.geometry.dispose(); R.fill = null; }
    if (rest <= .05) return;
    const [cx, cz] = ap.planta3D(tk.x, tk.y), N = ap.celular ? 28 : 44, pts = [], base = { x: tk.x, y: tk.y };
    for (let i = 0; i < N; i++) {
      const ang = i / N * Math.PI * 2, dx = Math.cos(ang), dz = Math.sin(ang);
      let r = 0, custo = 0, prev = base; const passo = .35;
      while (r < 70) {
        const nr = r + passo, X = cx + dx * nr, Z = cz + dz * nr;
        if (!ap.mundo.area3D(X, Z, .06)) break;
        const q = ap.plantaDe3D(X, Z), c = A().custoMetros(prev, q);
        if (custo + c >= rest) { r += passo * Math.max(0, Math.min(1, (rest - custo) / (c || 1))); break; }
        custo += c; prev = q; r = nr;
      }
      pts.push([dx * r, dz * r]);
    }
    // borda: uma fita de 16 cm (linha de 1 px some no celular), desenhada por cima de tudo
    const pos = new Float32Array(N * 6), idx = [], L = .08;
    pts.forEach(([x, z], i) => { const ang = i / N * Math.PI * 2, ux = Math.cos(ang), uz = Math.sin(ang), r = Math.hypot(x, z), li = Math.min(L, r);
      pos.set([cx + x - ux * li, .04, cz + z - uz * li, cx + x + ux * L, .04, cz + z + uz * L], i * 6);
      const j = (i + 1) % N; idx.push(i * 2, j * 2, i * 2 + 1, i * 2 + 1, j * 2, j * 2 + 1); });
    const gl = new T.BufferGeometry(); gl.setAttribute('position', new T.BufferAttribute(pos, 3)); gl.setIndex(idx);
    R.linha = new T.Mesh(gl, this.matLinha); R.linha.raycast = () => {}; R.linha.renderOrder = 4; R.g.add(R.linha);
    const sh = new T.Shape(); pts.forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)));
    R.fill = new T.Mesh(new T.ShapeGeometry(sh), this.matFill); R.fill.rotation.x = -Math.PI / 2; R.fill.position.set(cx, .03, cz); R.fill.raycast = () => {}; R.fill.renderOrder = 4; R.g.add(R.fill);
  },
  relogio(p, espera) {
    const r = $('#momRelogio'); if (!r) return;
    if (!p.on || !espera) { r.hidden = true; return; }
    const vid = vezId(), tk = vid && tokens()[vid], nome = tk ? (A().visivelPara(tk) ? nomeTk(tk) : '???') : '?';
    const lim = num((est().cfg || {}).tempoVez), dec = (agora() - num(p.vts, agora())) / 1000;
    const s = lim ? Math.max(0, Math.ceil(lim - dec)) : Math.floor(dec);
    const txt = `⏱ Vez de ${nome} · ${lim ? s + ' s' : Math.floor(s / 60) + ':' + pad2(s % 60)}`;
    if (r.textContent !== txt) r.textContent = txt;
    r.classList.toggle('acabando', !!lim && s <= 10);
    r.hidden = false;
  },
  /* ---------- lanterna: bateria da ficha, treme no fim, apaga em 0; poeira dentro da luz ---------- */
  lanterna(dt, t) {
    const ap = this.ap, V = ap.V, L = ap.lanterna, jog = V.quem === 'jog';
    let k = V.lanterna ? 1 : 0;
    if (V.lanterna && jog) {
      k = Luz.gastar(dt);
      if (Luz.bat !== null && Luz.bat <= 0) { V.lanterna = false; const b = $('[data-s3dv="lanterna"]', V.d); if (b) b.classList.remove('on'); ap.toast('A lanterna tremeu e apagou: a bateria acabou. Peça pilhas ao Mestre.'); k = 0; }
      L.intensity *= k;
    }
    if (this.t05 <= 0) {
      const b = V.d && $('[data-s3dv="lanterna"] .mom-bat', V.d);
      if (b) { const it = jog ? Luz.sinc() : null; b.hidden = !it; if (it) { const v = Math.round(Luz.bat); b.textContent = v + '%'; b.classList.toggle('fraca', v < 10); } }
    }
    const B = this.beam; if (!B) return;
    const vis = V.lanterna && L.intensity > .25 && ap.CFG.poeira;
    B.pts.visible = !!vis; if (!vis) return;
    const [ex, ey, ez] = B.b, dir = ez.copy(L.target.position).sub(L.position).normalize();
    ex.set(0, 1, 0).cross(dir); if (ex.lengthSq() < 1e-4) ex.set(1, 0, 0); ex.normalize(); ey.copy(dir).cross(ex).normalize();
    const o = L.position, lc = B.loc, ps = B.pos;
    for (let i = 0; i < B.n; i++) {
      const a = lc[i * 3] + Math.sin(t * .4 + i) * .05, b = lc[i * 3 + 1] + Math.cos(t * .33 + i * 1.7) * .05, c = lc[i * 3 + 2] + Math.sin(t * .2 + i * .3) * .08;
      ps[i * 3] = o.x + ex.x * a + ey.x * b + dir.x * c; ps[i * 3 + 1] = o.y + ex.y * a + ey.y * b + dir.y * c; ps[i * 3 + 2] = o.z + ex.z * a + ey.z * b + dir.z * c;
    }
    B.pts.geometry.attributes.position.needsUpdate = true;
    B.pts.material.opacity = Math.min(.45, .18 * L.intensity);
  },
  fumacaTick(t) {
    if (!this.fumaca.length) return;
    const ap = this.ap, c = ap.camera.position, luz = Math.max(.3, Math.min(1, ap.ctx.amb.intensity * 2.6)), fora = !ap.imersivo(ap.est.modo);
    this.fumaca.forEach((p, i) => { p.position.x = c.x; p.position.z = c.z; const un = p.material.uniforms; un.uT.value = t + i * 7; un.uCam.value.set(c.x, c.z); un.uA.value = (fora ? .07 : .17 - i * .03) * luz; });
  },
  sombras() {
    const ap = this.ap, T = ap.T;
    ap.tok.mapa.forEach(o => {
      if (o.t.g.userData.momSombra) return;
      const r = (o.t.raioBase || (o.filho ? .55 : .32)) * 2.7;
      const m = new T.Mesh(this.geoPlano, this.matSombra); m.rotation.x = -Math.PI / 2; m.position.y = .008; m.scale.set(r, r, 1); m.raycast = () => {}; m.renderOrder = 1;
      o.t.g.add(m); o.t.g.userData.momSombra = m;
    });
  },
  /* ---------- corpos: a miniatura caída, uma poça escura e o "E · Examinar" ---------- */
  sincCorpos() {
    const ap = this.ap, T = ap.T, corpos = est().corpos || {}, vivos = new Set();
    Object.entries(corpos).forEach(([id, c]) => {
      if (!c || c.a !== ap.a || !Corpo.visivel(id, c) || !SERd(id)) return;
      vivos.add(id);
      const ch = c.x + ',' + c.y;
      let o = this.corpos.get(id);
      if (o && o.ch !== ch) { this.grupo.remove(o.g); this.corpos.delete(id); o = null; }
      if (o) return;
      const F = ap.fabrica(), g = new T.Group();
      let tkm = null; try { tkm = window.ACF3D.criarToken(F, 'corpo-' + id, SERd(id)); } catch (e) {}
      if (tkm) { if (tkm.base) tkm.base.visible = false; tkm.g.rotation.x = -Math.PI / 2; tkm.g.position.set(0, .14, -.1); g.add(tkm.g); }
      const poca = new T.Mesh(new T.CircleGeometry(.8, 24), new T.MeshStandardMaterial({ color: '#1c0303', roughness: .32, metalness: .05, transparent: true, opacity: .82, depthWrite: false }));
      poca.rotation.x = -Math.PI / 2; poca.position.set(.05, .012, -.5); poca.scale.set(1, .7, 1); g.add(poca); this.desc.push(poca.geometry, poca.material);
      const [x, z] = ap.planta3D(c.x, c.y); g.position.set(x, 0, z); g.rotation.y = ((c.ts || 0) % 628) / 100;
      g.traverse(m => { m.raycast = () => {}; });
      this.grupo.add(g); this.corpos.set(id, { g, ch, x, z, id });
    });
    [...this.corpos.keys()].forEach(id => { if (!vivos.has(id)) { this.grupo.remove(this.corpos.get(id).g); this.corpos.delete(id); } });
  },
  // o token de quem morreu não fica de pé em cima do próprio corpo
  esconderMortos() {
    this.corpos.forEach((c, id) => { const o = this.ap.tok.mapa.get(id); if (o && Math.hypot(o.x - c.x, o.z - c.z) < 4) o.t.g.visible = false; });
  },
  perto(x, z) {
    let melhor = null, bd = 1.7;
    this.corpos.forEach(c => { const d = Math.hypot(c.x - x, c.z - z); if (d < bd) { bd = d; melhor = c; } });
    if (!melhor) return null;
    const id = melhor.id;
    return { tipo: 'ext', d: bd - .4, txt: `🔍 Examinar o corpo: ${(SERd(id) || {}).nome || ''}`, usar: () => Corpo.examinar(id) };
  },
  /* ---------- monitores de segurança: render-to-texture em baixa resolução, poucas vezes por segundo ---------- */
  resCam() {
    const ap = this.ap, c = ap.CFG.cameras;
    if (c === false || c === 'false') return null;
    if (c === 'alta') return [320, 200, .25];
    if (c === 'baixa' || ap.celular) return [144, 90, .5];
    return ap.alta ? [256, 160, .25] : [192, 120, .34];
  },
  sincMon() {
    const ap = this.ap, T = ap.T, cs = cams(), quer = new Set();
    Object.entries(cs).forEach(([k, c]) => {
      const cn = +k.slice(1); if (Math.ceil(cn / 25) !== ap.a) return;
      const p = cn - 25 * (ap.a - 1), S = ap.mundo.S[p]; if (!S) return;
      if (souAux() && !A().salaRevelada(cn)) return;
      quer.add(k);
      if (this.mon.has(k)) return;
      const sala = ap.mundo.carregadas.get(p); if (!sala) return;   // espera a sala carregar para achar uma parede livre
      const lugar = this.paredeLivre(S, sala); if (!lugar) return;
      this.mon.set(k, this.criarMon(k, cn, p, S, lugar));
    });
    [...this.mon.keys()].forEach(k => { if (!quer.has(k)) { const m = this.mon.get(k); this.grupo.remove(m.g); try { m.rt.dispose(); } catch (e) {} this.mon.delete(k); } });
  },
  paredeLivre(S, sala) {
    const cands = [['n', -5.2], ['n', 5.2], ['s', -5.2], ['s', 5.2], ['w', -5.2], ['w', 5.2], ['e', -5.2], ['e', 5.2]];
    for (const [l, u] of cands) {
      const x = l === 'n' || l === 's' ? S.cx + u : l === 'w' ? S.x0 + .5 : S.x1 - .5, z = l === 'w' || l === 'e' ? S.cz + u : l === 'n' ? S.z0 + .5 : S.z1 - .5;
      const r = [x - 1.2, x + 1.2, z - 1.2, z + 1.2];
      if (!(sala.obst || []).some(o => o[0] < r[1] && o[1] > r[0] && o[2] < r[3] && o[3] > r[2])) return { l, x, z };
    }
    return { l: 'n', x: S.cx - 5.2, z: S.z0 + .5 };
  },
  criarMon(k, cn, p, S, lugar) {
    const ap = this.ap, T = ap.T, F = ap.fabrica(), g = new T.Group(), res = this.resCam() || [160, 100, .5];
    const ang = { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 }[lugar.l];
    const enc = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[lugar.l];
    g.position.set(lugar.x + enc[0] * .36, 0, lugar.z + enc[1] * .36); g.rotation.y = ang;
    const caixa = new T.Mesh(this.guardar(new T.BoxGeometry(1.95, 1.3, .16)), F.m('#1a1b1e', { r: .5, me: .5 })); caixa.position.y = 2.15; g.add(caixa);
    const rt = new T.WebGLRenderTarget(res[0], res[1], { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, encoding: T.sRGBEncoding });
    const mat = this.guardar(new T.MeshBasicMaterial({ map: rt.texture, color: '#d6f0d8', toneMapped: false }));
    const tela = new T.Mesh(this.guardar(new T.PlaneGeometry(1.74, 1.08)), mat); tela.position.set(0, 2.15, .085); g.add(tela);
    // linhas de varredura e cantos escuros por cima da imagem
    const [cv, x] = window.ACF3D.tela(128, 128); x.clearRect(0, 0, 128, 128);
    for (let i = 0; i < 128; i += 4) { x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(0, i, 128, 2); }
    const gr = x.createRadialGradient(64, 64, 30, 64, 64, 92); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.6)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    const tv = this.guardar(new T.CanvasTexture(cv));
    const vidro = new T.Mesh(this.guardar(new T.PlaneGeometry(1.74, 1.08)), this.guardar(new T.MeshBasicMaterial({ map: tv, transparent: true, depthWrite: false, toneMapped: false }))); vidro.position.set(0, 2.15, .088); g.add(vidro);
    // rótulo (CAM · CN) e chiado quando não há sinal
    const [cr, xr] = window.ACF3D.tela(256, 40), texR = this.guardar(new T.CanvasTexture(cr));
    const rot = new T.Mesh(this.guardar(new T.PlaneGeometry(1.74, .27)), this.guardar(new T.MeshBasicMaterial({ map: texR, transparent: true, toneMapped: false }))); rot.position.set(0, 1.36, .09); g.add(rot);
    const [cs, xs] = window.ACF3D.tela(96, 60), texS = this.guardar(new T.CanvasTexture(cs));
    const luzRec = new T.Mesh(this.guardar(new T.SphereGeometry(.035, 8, 6)), this.guardar(new T.MeshBasicMaterial({ color: '#ff2a2a', toneMapped: false }))); luzRec.position.set(.86, 2.74, .09); g.add(luzRec);
    const camS = new T.PerspectiveCamera(80, res[0] / res[1], .05, 70);
    g.traverse(m => { m.raycast = () => {}; });
    this.grupo.add(g);
    return { k, cn, p, g, rt, mat, tela, camS, rot: { c: cr, x: xr, tex: texR, txt: '' }, chiado: { c: cs, x: xs, tex: texS }, luzRec, idx: 0, tTroca: 0, tRender: 0, alvo: 0, res };
  },
  rotulo(m, txt) {
    if (m.rot.txt === txt) return; m.rot.txt = txt;
    const { c, x } = m.rot; x.clearRect(0, 0, 256, 40); x.fillStyle = 'rgba(6,8,7,.85)'; x.fillRect(0, 0, 256, 40);
    x.font = 'bold 18px monospace'; x.fillStyle = '#9dffb0'; x.textBaseline = 'middle'; x.fillText(txt, 10, 21); m.rot.tex.needsUpdate = true;
  },
  chiado(m, txt) {
    const { c, x } = m.chiado, d = x.createImageData(96, 60);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 200; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(0, 22, 96, 16); x.fillStyle = '#e8ffe8'; x.font = 'bold 11px monospace'; x.textAlign = 'center'; x.fillText(txt, 48, 33);
    m.chiado.tex.needsUpdate = true;
    if (m.mat.map !== m.chiado.tex) { m.mat.map = m.chiado.tex; m.mat.needsUpdate = true; }
  },
  podeVerSala(cn) { if (A().mestre) return true; return !!A().salaRevelada(cn); },
  monTick(dt, t) {
    const ap = this.ap; if (!this.mon.size) { if (ap.extraSalas.size) ap.extraSalas.clear(); return; }
    const res = this.resCam(), cam = ap.camera, pAqui = ap.salaNoPonto3D(cam.position.x, cam.position.z), cs = cams(), quer = new Set();
    this.mon.forEach(m => {
      m.luzRec.visible = Math.sin(t * 3) > 0;
      if (pAqui !== m.p) return;   // só quem está na sala do monitor gasta com a câmera
      const alvos = alvosDe(m.cn, cs['c' + m.cn]);
      m.tTroca -= dt; if (m.tTroca <= 0 || !alvos.includes(m.alvo)) { m.tTroca = 6; m.idx = (m.idx + 1) % Math.max(1, alvos.length); m.alvo = alvos[m.idx] || 0; m.canto = (m.canto || 0) + 1; }
      const cnA = m.alvo; if (!cnA) { this.rotulo(m, `CAM · sem salas`); if (t - m.tRender > .3) { m.tRender = t; this.chiado(m, 'SEM SINAL'); } return; }
      this.rotulo(m, `CAM ${pad2(m.idx + 1)} · CN ${pad2(cnA)}  ● REC`);
      if (!res || !this.podeVerSala(cnA)) { if (t - m.tRender > .25) { m.tRender = t; this.chiado(m, res ? 'SEM SINAL' : 'DESLIGADA'); } return; }
      const pA = cnA - 25 * (ap.a - 1); quer.add(pA);
      const sala = ap.mundo.carregadas.get(pA);
      if (!sala) { if (t - m.tRender > .25) { m.tRender = t; this.chiado(m, 'CONECTANDO'); } return; }
      if (t - m.tRender < res[2]) return;
      m.tRender = t;
      if (m.rt.width !== res[0]) { m.rt.setSize(res[0], res[1]); m.camS.aspect = res[0] / res[1]; m.camS.updateProjectionMatrix(); }
      if (m.mat.map !== m.rt.texture) { m.mat.map = m.rt.texture; m.mat.needsUpdate = true; }
      this.renderCam(m, pA, sala, cs['c' + m.cn]);
    });
    // salas a mais carregadas só para a câmera (escondidas na vista normal)
    [...ap.extraSalas].forEach(p => { if (!quer.has(p)) ap.extraSalas.delete(p); });
    quer.forEach(p => ap.extraSalas.add(p));
  },
  renderCam(m, pA, sala, cfgC) {
    const ap = this.ap, T = ap.T, S = ap.mundo.S[pA], ALT = ap.ALT;
    const cantos = [[S.x0 + .7, S.z0 + .7], [S.x1 - .7, S.z0 + .7], [S.x1 - .7, S.z1 - .7], [S.x0 + .7, S.z1 - .7]], cc = cantos[(m.canto || 0) % 4];
    m.camS.position.set(cc[0], ALT - .35, cc[1]); m.camS.lookAt(S.cx, .7, S.cz);
    const fant = this.fantasmas(pA, cfgC);
    const vis0 = sala.g.visible, amb0 = ap.ctx.amb.intensity, fog0 = ap.cena.fog.density, tetos = ap.mundo.tetos, tv0 = tetos.visible;
    sala.g.visible = true; fant.forEach(f => { f.g.visible = true; });
    ap.ctx.amb.intensity = Math.max(amb0, .9); ap.cena.fog.density = fog0 * .2; tetos.visible = true;
    const vf = this.fumaca.map(p => p.visible); this.fumaca.forEach(p => { p.visible = false; }); const vb = this.beam ? this.beam.pts.visible : false; if (this.beam) this.beam.pts.visible = false; const vr = this.ring.g.visible; this.ring.g.visible = false;
    try { ap.ren.setRenderTarget(m.rt); ap.ren.render(ap.cena, m.camS); } finally {
      ap.ren.setRenderTarget(null);
      sala.g.visible = vis0; fant.forEach(f => { f.g.visible = false; });
      ap.ctx.amb.intensity = amb0; ap.cena.fog.density = fog0; tetos.visible = tv0;
      this.fumaca.forEach((p, i) => { p.visible = vf[i]; }); if (this.beam) this.beam.pts.visible = vb; this.ring.g.visible = vr;
    }
  },
  // quem aparece na câmera: tokens visíveis a você naquela sala que a sua vista não carregou, e o Filho que o Mestre "pôs" ali
  fantasmas(pA, cfgC) {
    const ap = this.ap, T = ap.T, a = ap.a, quer = new Map(), cnA = 25 * (a - 1) + pA;
    Object.entries(tokens()).forEach(([id, tk]) => {
      if (!tk || tk.a !== a || I().salaEm(a, tk.x, tk.y) !== pA || ap.tok.mapa.has(id) || !A().visivelPara(tk)) return;
      if (tipoDe(tk) === 'filho' && (tk.cp || (FIL() && FIL().aparencia(tk)))) return;
      quer.set('t:' + id, { s: tk.s, id, x: tk.x, y: tk.y, forma: (est().formas || {})[tk.s] || (est().formas || {})[id] });
    });
    if (cfgC && cfgC.fs && int(cfgC.fcn) === cnA && SERd(cfgC.fs)) {
      const r = A().geo.retSala(pA);
      quer.set('f:' + cfgC.fs, { s: cfgC.fs, id: 'cam-' + cfgC.fs, x: r.x + r.w * .62, y: r.y + r.h * .58, forma: (est().formas || {})[cfgC.fs] });
    }
    const out = [];
    quer.forEach((q, k) => {
      let f = this.fant.get(k);
      if (f && f.forma !== q.forma) { this.grupo.remove(f.g); this.fant.delete(k); f = null; }
      if (!f) { let t = null; try { t = window.ACF3D.criarToken(ap.fabrica(), q.id, SERd(q.s), q.forma); } catch (e) {} if (!t) return; t.g.traverse(o => { o.raycast = () => {}; }); t.g.visible = false; this.grupo.add(t.g); f = { g: t.g, forma: q.forma }; this.fant.set(k, f); }
      const [x, z] = ap.planta3D(q.x, q.y); f.g.position.set(x, 0, z); f.vivo = true; out.push(f);
    });
    this.fant.forEach((f, k) => { if (!quer.has(k)) { this.grupo.remove(f.g); this.fant.delete(k); } });
    return out;
  },
  /* ---------- painel 🎛 do Mestre no 3D: o mesmo susto e as pilhas, no token escolhido ---------- */
  painelToken(id, tk, q) {
    if (q !== 'mestre' || tipoDe(tk) !== 'cobaia') return '';
    return `<p class="mini">Só esta cobaia vê</p><div class="s3d-op"><button type="button" data-mom3-susto="rosto">🪟 Rosto</button><button type="button" data-mom3-susto="figura">🚪 Figura</button><button type="button" data-mom3-susto="nome">🗣 Nome</button><button type="button" data-mom3-pilhas>🔋 Pilhas</button></div>`;
  },
  ligarPainel(p, id) {
    $$('[data-mom3-susto]', p).forEach(b => b.onclick = () => Susto.enviar(id, b.dataset.mom3Susto));
    const bp = $('[data-mom3-pilhas]', p); if (bp) bp.onclick = () => { A().definir(['pilhas', id], agora()); if (this.ap) this.ap.toast('🔋 Pilhas enviadas.'); };
  },
  /* ---------- sustos que só este jogador vê ---------- */
  susto(tipo, vida) {
    const ap = this.ap; if (!ap) return;
    const T = ap.T, cam = ap.camera, dir = new T.Vector3(); cam.getWorldDirection(dir); dir.y = 0; if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1); dir.normalize();
    const longe = max => { let d = 0; for (let s = .5; s <= max; s += .3) { if (!ap.mundo.area3D(cam.position.x + dir.x * s, cam.position.z + dir.z * s, .2)) break; d = s; } return d; };
    if (tipo === 'rosto') {
      // o rosto encosta no que estiver à frente (parede, grade, armário): como numa janela
      let d = Math.max(1.6, Math.min(5.5, longe(7) - .25));
      try {
        const rc = new T.Raycaster(new T.Vector3(cam.position.x, 1.6, cam.position.z), dir, 1.2, d + .3), vis = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
        const h = rc.intersectObjects(ap.mundo.raiz.children, true).find(x => vis(x.object) && !x.object.isSprite);
        if (h) d = Math.max(1.2, h.distance - .14);
      } catch (e) {}
      const [cv] = [rostoCanvas(256, 300)], tex = new T.CanvasTexture(cv);
      const mat = new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false });
      const m = new T.Mesh(new T.PlaneGeometry(.9, 1.06), mat);
      m.position.set(cam.position.x + dir.x * d, 1.72, cam.position.z + dir.z * d); m.lookAt(cam.position.x, 1.72, cam.position.z); m.raycast = () => {}; m.renderOrder = 8;
      this.grupo.add(m); this.sustos.push({ m, t: 0, vida: vida || 1.6, tipo, desc: [tex, mat, m.geometry] });
      if (ap.V) ap.V.choque = 1;
    } else {
      const d = Math.max(4, longe(26) - .4);
      const g = new T.Group(), mat = new T.MeshBasicMaterial({ color: '#030304', transparent: true, opacity: .96 });
      const corpo = new T.Mesh(new T.CylinderGeometry(.16, .26, 1.75, 10), mat); corpo.position.y = .88; g.add(corpo);
      const cab = new T.Mesh(new T.SphereGeometry(.15, 10, 8), mat); cab.position.y = 1.9; cab.scale.set(1, 1.25, 1); g.add(cab);
      g.position.set(cam.position.x + dir.x * d, 0, cam.position.z + dir.z * d); g.traverse(o => { o.raycast = () => {}; });
      this.grupo.add(g); this.sustos.push({ m: g, t: 0, vida: vida || 3, tipo, desc: [mat, corpo.geometry, cab.geometry] });
    }
  },
  sustoTick(dt) {
    if (!this.sustos.length) return;
    const ap = this.ap, c = ap.camera.position;
    this.sustos = this.sustos.filter(s => {
      s.t += dt;
      if (s.tipo === 'rosto') s.m.material.opacity = s.t < .25 ? s.t / .25 : (Math.random() < .08 ? .3 : 1);
      const perto = s.tipo === 'figura' && Math.hypot(s.m.position.x - c.x, s.m.position.z - c.z) < 3.5;
      if (s.t >= s.vida || perto) { this.grupo.remove(s.m); s.desc.forEach(x => { try { x.dispose(); } catch (e) {} }); return false; }
      return true;
    });
  },
};
(window.ACF3D = window.ACF3D || {}).vista = window.ACF3D.vista || [];
window.ACF3D.vista.push(Vista);

/* =========================================================
   LIGAÇÕES
   ========================================================= */
let ag = null;
function tudo() {
  try {
    Enc.vigiar(); Enc.ver(); Persg.ver(); Corpo.vigiar(); Luz.verPilhas();
    Eco.ligar(); Susto.ligar(); blocoMestre(); Cartas.desenhar(); Corpo.desenhar2D();
  } catch (e) { console.warn('momento:', e); }
}
function agendar() { if (ag) return; ag = setTimeout(() => { ag = null; tudo(); }, 120); }
function iniciar() {
  if (!window.ACF || !window.ACF._int || !window.ACF.ganchoToken) { setTimeout(iniciar, 200); return; }
  A().aoMudar(agendar);
  document.addEventListener('acf-perfil', () => setTimeout(tudo, 60));
  document.addEventListener('acf-ativa', () => setTimeout(() => { Luz.sinc(); Luz.verPilhas(); Cartas.desenhar(); }, 80));
  ligarCartao();
  setInterval(() => { try { Cartas.desenhar(); Mente.tick(); Persg.ver(); Corpo.desenhar2D(); } catch (e) { console.warn('momento:', e); } }, 500);
  setInterval(() => { try { Eco.rodar(); Enc.vigiar(); } catch (e) { console.warn('momento:', e); } }, 700);
  tudo();
}
window.ACF_MOMENTO = {
  congelado: () => agora() < Enc.congeladoAte,
  lanternaBloqueio: q => Luz.bloqueio(q),
  // para testes e outras telas
  Enc, Eco, Luz, Mente, Susto, Corpo, Cartas, Vista, Aud, Persg, cams, alvosDe, iniciativa,
  susto: (c, t) => Susto.enviar(c, t),
};
iniciar();
})();
