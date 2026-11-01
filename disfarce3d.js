/* =========================================================
   A CAIXA DE FÓSFOROS · disfarce3d.js
   O disfarce no 3D, no espírito do "Prop Hunt": o Filho que tem as habilidades
   genéricas "objeto" (Forma de Objeto) e "copiar" (a cópia) vira qualquer modelo da
   sala ou qualquer cobaia, e TODA transformação tem um detalhe errado que só se
   percebe olhando de perto e com atenção.

   1. VIRAR UM OBJETO: no Controle do Filho, o modo Disfarce contorna o que pode ser
      copiado quando a mira passa; um toque copia aquele modelo exato (o mesmo item da
      cena, clonado) para a posição do Filho. Girar, ajustar o lugar e confirmar.
      Publica em mapa/fil/ob (a, x, y, o, ts e os campos novos cn, i, r, h, p, d).
   2. VIRAR UMA COBAIA: o token aparece como a miniatura daquela cobaia (tokens.cp e
      tokens.cpd). "Exigir Estudar (ficha)" é opção do Mestre, ligada por padrão.
   3. O DETALHE ERRADO: catálogo de objetos e de cobaias (sorteio ou escolha). De longe
      e de relance tudo parece perfeito; de perto (menos de ~2,5 m) e mirando por ~1,5 s,
      ou com a lanterna em cima, o erro aparece.
   4. REPARAR (jogador): mirando de perto por alguns segundos em qualquer objeto ou
      cobaia, aparece "🔍 Reparar" (E ou botão): Percepção contra a DT de Examinar para
      objetos, Intuição contra a Enganação para cobaias (os testes que já existem).
   5. QUEBRAR O DISFARCE: ataque, revelação do Mestre, PV da ficha do Filho caindo ou
      "voltar à forma": a forma falsa se deforma e vira a criatura.
   6. REGRAS DA CASA (mapa/cfg/disf, desligadas por padrão): sinal periódico, só se move
      quando ninguém olha, trocar de objeto custa a vez.

   Código genérico: nenhum Filho é citado. Quem pode o quê vem das características
   (privado/filhos, filhos.js).
   ========================================================= */
(() => {
'use strict';
const A = () => window.ACF;
const I = () => window.ACF._int;
const FX = () => window.ACF_FICHAS;
const FIL = () => window.ACF_FILHOS;
const S3 = () => window.Sala3D;
const MOM = () => window.ACF_MOMENTO;
const NS = () => window.ACF3D;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const agora = () => Date.now();
const num = (v, p = 0) => { const n = parseFloat(v); return isFinite(n) ? n : p; };
const int = v => Math.round(num(v));
const pad2 = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const suave = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const lsG = (k, p) => { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } };
const est = () => (A() && A().estado) || {};
const tokens = () => est().tokens || {};
const SERd = id => (A().SER || {})[id];
const tipoDe = tk => ((tk && SERd(tk.s)) || {}).tipo || '';
const souMestre = () => !!A().mestre;
const souAux = () => !!A().aux && !A().mestre;
const souGM = () => !!(A().mestre || A().aux);
const euJog = () => (!A().mestre && !A().aux ? A().meu : null);
const priv = () => (I() && I().Priv && I().Priv.dados) || {};
const ef = () => priv().filhosEstado || {};
const pub = () => est().fil || {};
const cfgTk = tk => (FIL() && FIL().cfgTk ? FIL().cfgTk(tk) : null);
const hab = (c, k) => !!(c && c.hab && c.hab[k]);
const persg = () => est().persg || { on: false };
const ordemP = () => (persg().ordem ? Object.values(persg().ordem) : []);
const vezId = () => { const p = persg(), o = ordemP(); return p.on && o.length ? (o[p.vez || 0] || {}).id : null; };
const aberto3D = () => !!(S3() && S3().aberta);
const api3 = () => (aberto3D() && S3()._api) || null;
const celular = () => Math.min(innerWidth, innerHeight) < 700 || matchMedia('(pointer: coarse)').matches;
const salaP = tk => (tk && tk.a ? I().salaEm(tk.a, tk.x, tk.y) : null);
const nomeTk = tk => (A().rotulo ? A().rotulo(tk) : (SERd(tk.s) || {}).nome || '');
const hashS = s => { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rngDe = s => NS().rng(hashS(s) % 999983 + 7);
function logFilhos(txt) { try { I().Chat.enviar('🎛 ' + txt, 'filhos', true); } catch (e) {} }
function avisar(t) { const ap = api3(); if (ap) ap.toast(t); else A().aviso(t); }

/* =========================================================
   OPÇÕES DO MESTRE (mapa/cfg/disf/<k> = true | false; só o Mestre grava)
   ========================================================= */
const PAD = { estudo: true, sinal: false, olhar: false, custo: false };
const cfgD = () => ((est().cfg || {}).disf) || {};
const opc = k => { const v = cfgD()[k]; return v === undefined || v === null ? PAD[k] : !!v; };

/* =========================================================
   CATÁLOGO DOS DETALHES (públicos no estado, descritos de forma neutra)
   [chave, nome, o que se nota de perto, peso(tipo do modelo)]
   ========================================================= */
const TELA = /crt|monitor|tv|tela|terminal|console|computador|mainframe|painel|radio|maquina|registradora/;
const ELETRO = /crt|monitor|tv|tela|terminal|console|computador|mainframe|rack|servidor|painel|radio|maquina|telefone|luminaria|geladeira|freezer|bomba|transformador|bateria|gravador|caixa_registradora/;
const MOVEL = /cadeira|mesa|arquivo|armario|estante|gaveteiro|carteira|bancada|prateleira|gondola|poltrona|mocho|banco|maca|leito|cama|caixote|carrinho/;
const DET_OBJ = [
  ['resp', 'Respira', 'sobe e desce de leve, como um peito respirando', () => 1],
  ['espelho', 'Espelhado', 'letreiros, números e etiquetas estão ao contrário', t => (TELA.test(t) ? 1.4 : 1)],
  ['tom', 'Um tom errado', 'a cor está um pouco diferente das peças iguais da sala', () => 1],
  ['veia', 'Veias num canto', 'um canto tem textura de pele, com veias finas', () => 1],
  ['peca', 'Uma peça a mais', 'tem uma perna, um parafuso ou um puxador a mais', t => (MOVEL.test(t) ? 1.5 : .8)],
  ['olho', 'Um olho por um instante', 'um olho abre numa fresta (ou na tela) e fecha', t => (TELA.test(t) ? 2 : .8)],
  ['cabo', 'Cabo solto', 'um cabo sai dele e não vai a lugar nenhum', t => (ELETRO.test(t) ? 2 : .6)],
  ['fosco', 'Não reflete a lanterna', 'a luz da lanterna não acende a superfície', () => 1],
  ['vira', 'Vira devagar', 'quando você dá as costas, ele gira um pouco para o seu lado', () => 1],
  ['gota', 'Gota escura', 'de vez em quando uma gota escura escorre e pinga', () => 1],
  ['vapor', 'Quente', 'solta um vapor fino, como algo morno num lugar frio', () => 1],
  ['limpo', 'Limpo demais', 'novo e brilhante num lugar sujo e empoeirado', () => 1],
  ['duplic', 'Duplicata', 'igual a outro da sala, até no mesmo arranhão', () => 1],
  ['dentes', 'Dentes numa fresta', 'uma fileira de dentes pequenos numa junta', () => 1],
  ['cabelo', 'Fios de cabelo', 'fios escuros saindo de uma junta', () => 1],
  ['unha', 'Uma unha', 'no lugar de um parafuso, uma unha', () => 1],
  ['umido', 'Úmido', 'brilha molhado e deixa uma pocinha embaixo', () => 1],
  ['etiq', 'Etiqueta impossível', 'uma etiqueta de inventário com uma data que não existe', t => (MOVEL.test(t) || ELETRO.test(t) ? 1.2 : .8)],
  ['sombra', 'Sombra errada', 'a sombra no chão não tem o formato dele', () => 1],
  ['pulso', 'Pulsa', 'um calombo que pulsa devagar, como um coração', () => 1],
];
// [chave, nome, o que se nota, { ficha: vem do cânone (2D), partes: precisa de miniatura de corpo humano }]
const DET_COB = [
  ['espelho', 'Retrato espelhado', 'o retrato e a miniatura estão ao contrário', { ficha: 1 }],
  ['fhp', 'Número FHP trocado', 'dois dígitos do número FHP trocados de lugar', { ficha: 1 }],
  ['aro', 'Anel de outro tom', 'a cor do anel está um tom diferente', { ficha: 1 }],
  ['pisca', 'Pisca fora de ritmo', 'pisca um olho de cada vez, devagar demais', { partes: 1 }],
  ['sombra', 'Sombra atrasada', 'a sombra não acompanha o corpo', {}],
  ['dedo', 'Um dedo a mais', 'uma das mãos tem um dedo a mais', { partes: 1 }],
  ['roupa', 'Roupa espelhada', 'o que fica de um lado da roupa está do outro', { partes: 1 }],
  ['olhos', 'Olhos de bicho', 'os olhos devolvem a luz da lanterna, como os de um animal', { partes: 1 }],
  ['cabeca', 'Pescoço que gira demais', 'a cabeça acompanha você além do que um pescoço vira', { partes: 1 }],
  ['resp', 'Respira fora do ritmo', 'prende o ar por muito tempo e depois respira rápido', { partes: 1 }],
  ['joelho', 'Joelhos ao contrário', 'ao andar, os joelhos dobram para o lado errado', { partes: 1 }],
  ['pescoco', 'Pescoço comprido', 'o pescoço está um dedo mais longo', { partes: 1 }],
  ['sorriso', 'Sorriso que não acaba', 'um sorriso largo que fica tempo demais no rosto', { partes: 1 }],
  ['parado', 'Parado demais', 'não respira nem mexe a cabeça: imóvel como um boneco', { partes: 1 }],
  ['desliza', 'Anda deslizando', 'anda sem mexer direito as pernas', { partes: 1 }],
  ['alto', 'Um pouco mais alto', 'uns dois dedos mais alto que o original', {}],
  ['pele', 'Pele de outro tom', 'a pele do rosto está um tom mais acinzentada', { partes: 1 }],
  ['bracos', 'Braços compridos', 'as mãos ficam um pouco abaixo de onde deveriam', { partes: 1 }],
];
const DOBJ = Object.fromEntries(DET_OBJ.map(d => [d[0], d]));
const DCOB = Object.fromEntries(DET_COB.map(d => [d[0], d]));
// cobaias com miniatura de corpo humano (a de escorpião não tem as partes)
const SEM_PARTES = new Set(['mostarda']);
function sortearObj(tipo, semente, comFonte) {
  const r = semente != null ? rngDe('o' + semente) : Math.random;
  const L = DET_OBJ.filter(d => d[0] !== 'duplic' || comFonte).map(d => [d[0], d[3](tipo || '')]);
  let s = L.reduce((a, b) => a + b[1], 0) * r();
  for (const [k, w] of L) { s -= w; if (s <= 0) return k; }
  return L[0][0];
}
function sortearCob(cob) {
  const partes = !SEM_PARTES.has(cob);
  const L = DET_COB.filter(d => (!d[3].ficha || d[0] === 'aro') && (partes || !d[3].partes)).map(d => d[0]);
  return L[Math.floor(Math.random() * L.length)];
}
// o detalhe de um objeto publicado (o antigo, da lista do mapa 2D, não tem "d": sai da chave, igual em todo aparelho)
const detObjDe = (ob, k) => (ob && ob.d && DOBJ[ob.d] ? ob.d : sortearObj(ob && ob.o, k, false));

/* =========================================================
   NOMES DOS MODELOS (o mesmo nome para o objeto verdadeiro e para o disfarce)
   ========================================================= */
const NOMES_T = [[/cadeira_plastico/, 'Cadeira de plástico'], [/fila_cadeiras/, 'Fileira de cadeiras'], [/cadeira_odonto|cadeira_dentista/, 'Cadeira de dentista'], [/cadeira_tombada/, 'Cadeira caída'], [/cadeira/, 'Cadeira'],
  [/mocho|banco/, 'Banco'], [/poltrona/, 'Poltrona'], [/carteira/, 'Carteira escolar'], [/mesa/, 'Mesa'], [/arquivo/, 'Arquivo'], [/gaveteiro/, 'Gaveteiro'], [/armario/, 'Armário'],
  [/estante|prateleira|gondola/, 'Estante'], [/crt|monitor/, 'Monitor'], [/tv/, 'Televisão'], [/mainframe|rack|servidor|console|computador|terminal/, 'Computador'], [/maca|leito/, 'Maca'],
  [/cama|beliche|colchao/, 'Cama'], [/caixote|caixa/, 'Caixa'], [/lixeira/, 'Lixeira'], [/vaso/, 'Vaso'], [/pintura|quadro_rede|quadro$/, 'Quadro'], [/quadro_eletrico/, 'Quadro elétrico'],
  [/cartaz/, 'Cartaz'], [/carrinho/, 'Carrinho'], [/maquina_escrever/, 'Máquina de escrever'], [/maquina/, 'Máquina'], [/geladeira|freezer/, 'Geladeira'], [/manequim/, 'Manequim'],
  [/bancada/, 'Bancada'], [/relogio/, 'Relógio'], [/telefone/, 'Telefone'], [/luminaria/, 'Luminária'], [/globo/, 'Globo'], [/radio/, 'Rádio'], [/biombo/, 'Biombo'],
  [/suporte_soro/, 'Suporte de soro'], [/bomba_infusao/, 'Bomba de infusão'], [/monitor_cardiaco|monitor_ecg/, 'Monitor cardíaco'], [/cinzeiro/, 'Cinzeiro'], [/pilhas_papel/, 'Pilha de papéis'],
  [/vhs/, 'Fitas de vídeo'], [/esqueleto/, 'Esqueleto'], [/cranio/, 'Crânio'], [/vitrine/, 'Vitrine'], [/expositor/, 'Expositor'], [/transformador/, 'Transformador'], [/bateria/, 'Baterias']];
function nomeTipo(t) {
  t = String(t || '');
  for (const [rx, n] of NOMES_T) if (rx.test(t)) return n;
  const s = t.replace(/^(p\d|a\d)_/, '').replace(/_/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Objeto';
}

/* =========================================================
   O QUE PODE SER COPIADO (modelos reais da cena, clonados)
   ========================================================= */
const NAO_COPIA = /^(p\d_|a\d_)?(porta|placa|parede|mancha|papeis|sangue|teia|agua|grade|tapete|ralo|cabos?($|_)|item_chao|documento|lampada|campo_infinito|membrana|onda|rasgos|canos?|gotas|janela|cortina|varal|centelhas|halo|espiral|silhuetas|grama|helice|mural|texto|triangulo|coracoes|botao)|calha|canaleta|_teto|rastro|vapor|placa|cabos_chao|parede_interna|chao$|_parede$|bolsas_parede|armario_suspenso|ventilador_parede|foco_cirurgico|tubo_neon|lousa|negatoscopio/;
const PAREDE = /quadro|pintura|cartaz|relogio|espelho_falso|negatoscopio_nao/;
function copiavel(T, o) {
  if (!o || !o.userData) return false;
  if (o.userData.disfOk !== undefined) return o.userData.disfOk;
  const t = o.userData.t || '';
  let ok = false;
  if (t && !NAO_COPIA.test(t) && o.visible !== false) {
    const b = new T.Box3().setFromObject(o);
    if (!b.isEmpty()) {
      const s = b.getSize(new T.Vector3()), parede = PAREDE.test(t);
      if (parede) ok = s.y > .18 && s.y < 2.3 && Math.max(s.x, s.z) < 2.6 && Math.min(s.x, s.z) < .5;
      else ok = s.y > .2 && s.y < 2.75 && Math.max(s.x, s.z) < 2.8 && Math.max(s.x, s.z) > .12 && b.min.y < 1.3;
    }
  }
  o.userData.disfOk = ok;
  return ok;
}
// o item da cena (o mesmo objeto que todos já montam), ajustado ao tamanho da sala de 20 m
function itemDaCena(cn, i) {
  const c = S3() && S3().cenaDe ? S3().cenaDe(cn) : null; if (!c || !c.itens || !c.itens[i]) return null;
  const it = c.itens[i], lado = c.lado || 7.071, ap = api3(), SALA_M = ap ? ap.SALA_M : 20, ALT = ap ? ap.ALT : 4;
  return { it: lado === SALA_M ? it : NS().ajustarItem(it, lado, SALA_M, ALT), cena: c };
}

/* =========================================================
   MATERIAIS, TEXTURAS E PEÇAS DOS DETALHES (feitos na hora)
   ========================================================= */
const TX = new Map();   // texturas compartilhadas (descartadas ao fechar o 3D)
function tex(T, k, w, h, desenho) {
  if (TX.has(k)) return TX.get(k);
  const [c, x] = NS().tela(w, h); desenho(x, w, h);
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; TX.set(k, t); return t;
}
const texVeias = T => tex(T, 'veias', 256, 256, (x, w, h) => {
  const g = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(196,128,118,.95)'); g.addColorStop(.62, 'rgba(176,104,98,.75)'); g.addColorStop(1, 'rgba(160,90,90,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, h); const r = NS().rng(55);
  for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${r() < .5 ? '90,30,30' : '255,220,210'},${r() * .12})`; x.fillRect(r() * w, r() * h, 2, 2); }
  const veia = (x0, y0, a, l, larg, cor) => { x.strokeStyle = cor; x.lineWidth = larg; x.beginPath(); x.moveTo(x0, y0); let px = x0, py = y0; for (let s = 0; s < l; s += 6) { a += (r() - .5) * .5; px += Math.cos(a) * 6; py += Math.sin(a) * 6; x.lineTo(px, py); if (r() < .08 && larg > 1.2) veia(px, py, a + (r() - .5) * 1.6, l * .45, larg * .6, cor); } x.stroke(); };
  for (let i = 0; i < 5; i++) veia(w * .2 + r() * w * .6, h * .2 + r() * h * .6, r() * 6.28, 70 + r() * 70, 2.6, 'rgba(70,40,120,.75)');
  for (let i = 0; i < 4; i++) veia(w * .2 + r() * w * .6, h * .2 + r() * h * .6, r() * 6.28, 50 + r() * 50, 1.8, 'rgba(150,20,30,.7)');
});
const texOlho = T => tex(T, 'olho', 256, 128, (x, w, h) => {
  x.clearRect(0, 0, w, h);
  x.save(); x.beginPath(); x.moveTo(8, h / 2); x.quadraticCurveTo(w / 2, -h * .25, w - 8, h / 2); x.quadraticCurveTo(w / 2, h * 1.25, 8, h / 2); x.closePath(); x.clip();
  const g = x.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2); g.addColorStop(0, '#f3eee4'); g.addColorStop(1, '#b9a89a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(170,30,30,.45)'; x.lineWidth = 1.2; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(i % 2 ? 12 : w - 12, h / 2 + (i - 4) * 4); x.lineTo(w / 2 + (i % 2 ? -36 : 36), h / 2 + (i - 4) * 2); x.stroke(); }
  const ir = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, 40); ir.addColorStop(0, '#2a1a08'); ir.addColorStop(.35, '#6a4a1a'); ir.addColorStop(1, '#2a3a2a'); x.fillStyle = ir; x.beginPath(); x.arc(w / 2, h / 2, 38, 0, 7); x.fill();
  x.fillStyle = '#050505'; x.beginPath(); x.ellipse(w / 2, h / 2, 9, 26, 0, 0, 7); x.fill();
  x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(w / 2 - 12, h / 2 - 12, 6, 0, 7); x.fill(); x.restore();
  x.strokeStyle = '#2a1410'; x.lineWidth = 6; x.beginPath(); x.moveTo(8, h / 2); x.quadraticCurveTo(w / 2, -h * .25, w - 8, h / 2); x.stroke();
});
const texEtiqueta = (T, txt, k) => tex(T, 'etq' + k, 256, 96, (x, w, h) => {
  x.fillStyle = '#e9e3cf'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(120,100,60,.25)'; for (let i = 0; i < 200; i++) x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  x.strokeStyle = '#3a3020'; x.lineWidth = 4; x.strokeRect(4, 4, w - 8, h - 8);
  x.fillStyle = '#1a1610'; x.font = 'bold 26px monospace'; x.textAlign = 'center'; x.fillText(txt[0], w / 2, 38); x.font = 'bold 30px monospace'; x.fillText(txt[1], w / 2, 76);
});
const texRisco = T => tex(T, 'risco', 256, 128, (x, w, h) => {
  x.clearRect(0, 0, w, h); const r = NS().rng(91);
  x.strokeStyle = 'rgba(235,230,220,.85)'; x.lineCap = 'round';
  for (let i = 0; i < 4; i++) { x.lineWidth = 3 - i * .5; x.beginPath(); const y0 = 30 + i * 18 + r() * 8; x.moveTo(20 + r() * 20, y0); x.bezierCurveTo(90, y0 - 14 + r() * 10, 160, y0 + 12, 230 - r() * 20, y0 + 6 - r() * 8); x.stroke(); }
});
const texSombra = T => tex(T, 'sombraf', 256, 256, (x, w, h) => {
  x.clearRect(0, 0, w, h); x.filter = 'blur(3px)'; x.fillStyle = 'rgba(0,0,0,.95)'; x.strokeStyle = 'rgba(0,0,0,.95)'; x.lineCap = 'round';
  // um vulto curvado com braços compridos e dedos abertos (a sombra que não é a do objeto)
  x.beginPath(); x.ellipse(128, 168, 46, 60, 0, 0, 7); x.fill();
  x.beginPath(); x.ellipse(128, 92, 24, 28, 0, 0, 7); x.fill();
  [-1, 1].forEach(sg => { x.lineWidth = 11; x.beginPath(); x.moveTo(128 + sg * 30, 140); x.quadraticCurveTo(128 + sg * 92, 120, 128 + sg * 98, 52); x.stroke();
    for (let i = 0; i < 4; i++) { x.lineWidth = 4; x.beginPath(); x.moveTo(128 + sg * 98, 52); x.lineTo(128 + sg * (86 + i * 9), 14 + i * 3); x.stroke(); } });
  x.filter = 'none';
});
const texSorriso = T => tex(T, 'sorriso', 256, 96, (x, w, h) => {
  x.clearRect(0, 0, w, h);
  x.fillStyle = '#2a0a0a'; x.beginPath(); x.moveTo(14, 26); x.quadraticCurveTo(w / 2, 108, w - 14, 26); x.quadraticCurveTo(w / 2, 62, 14, 26); x.fill();
  x.fillStyle = '#efe6cf'; for (let i = 0; i < 12; i++) { const u = (i + .5) / 12, px = 24 + u * (w - 48), py = 32 + Math.sin(u * Math.PI) * 22; x.fillRect(px - 6, py, 10, 9); }
  x.strokeStyle = '#3a1010'; x.lineWidth = 4; x.beginPath(); x.moveTo(10, 24); x.quadraticCurveTo(w / 2, 112, w - 10, 24); x.stroke();
});
const texBrilhoOlho = T => tex(T, 'brilhoOlho', 64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 1, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(.25, 'rgba(210,255,120,.9)'); g.addColorStop(1, 'rgba(120,200,40,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
const texPoca = T => tex(T, 'poca', 128, 128, (x, w, h) => { const g = x.createRadialGradient(54, 50, 4, 64, 64, 62); g.addColorStop(0, 'rgba(200,215,230,.8)'); g.addColorStop(.18, 'rgba(120,140,160,.6)'); g.addColorStop(.32, 'rgba(40,52,62,.75)'); g.addColorStop(.85, 'rgba(10,14,18,.7)'); g.addColorStop(1, 'rgba(10,14,18,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
const texVapor = T => tex(T, 'vapor', 64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });

/* ---------- registro do que está disfarçado neste aparelho (para a atenção e as animações) ---------- */
// cada entrada: { tipo: 'obj' | 'cob', g (raiz no mundo), k (chave), det, ticks: [fn(dt, t, k, ctx)], at: 0..1, forc, raio, centro }
const REG = { obj: new Map(), cob: new Map() };
const LIXO = [];   // geometrias e materiais próprios (descartados ao fechar)
const guardar = x => { LIXO.push(x); return x; };

// ponto da superfície do modelo: raio de fora para dentro (no espaço do grupo, montado na origem)
function superficie(T, g, lado, fx, fy, bb) {
  const s = bb.getSize(new T.Vector3()), o = new T.Vector3(), d = new T.Vector3();
  if (lado === 'topo') { o.set(bb.min.x + fx * s.x, bb.max.y + 1, bb.min.z + fy * s.z); d.set(0, -1, 0); }
  else if (lado === 'esq') { o.set(bb.min.x - 1, bb.min.y + fy * s.y, bb.min.z + fx * s.z); d.set(1, 0, 0); }
  else if (lado === 'dir') { o.set(bb.max.x + 1, bb.min.y + fy * s.y, bb.min.z + fx * s.z); d.set(-1, 0, 0); }
  else { o.set(bb.min.x + fx * s.x, bb.min.y + fy * s.y, bb.max.z + 1); d.set(0, 0, -1); }
  const ray = new T.Raycaster(o, d, 0, 4);
  const alvos = []; g.traverse(m => { if (m.isMesh && !m.userData.disfDeco && m.visible !== false) alvos.push(m); });
  const h = ray.intersectObjects(alvos, false)[0];
  if (h) { const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : d.clone().negate(); if (n.dot(d) > 0) n.negate(); return { p: h.point.clone(), n }; }
  // sem acertar nada (modelo vazado): a face da caixa
  const p = o.clone();
  if (lado === 'topo') p.y = bb.max.y; else if (lado === 'esq') p.x = bb.min.x; else if (lado === 'dir') p.x = bb.max.x; else p.z = bb.max.z;
  return { p, n: d.clone().negate() };
}
// adesivo plano encostado na superfície
function adesivo(T, g, sup, w, h, mat) {
  const me = new T.Mesh(guardar(new T.PlaneGeometry(w, h)), mat);
  me.position.copy(sup.p).add(sup.n.clone().multiplyScalar(.004));
  me.lookAt(me.position.clone().add(sup.n)); me.userData.disfDeco = 1; me.raycast = () => {}; me.renderOrder = 2;
  g.add(me); return me;
}
const matBasico = (T, o) => guardar(new T.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, ...o }));
const matPadrao = (T, o) => guardar(new T.MeshStandardMaterial(o));
// as malhas do modelo (sem os detalhes), da maior para a menor
function malhas(T, g) {
  const out = []; g.traverse(m => { if (m.isMesh && !m.userData.disfDeco) { const b = new T.Box3().setFromObject(m); if (!b.isEmpty()) { const s = b.getSize(new T.Vector3()); out.push({ m, b, v: s.x * s.y * s.z + 1e-6, s }); } } });
  return out.sort((a, b) => b.v - a.v);
}
// troca os materiais do modelo por cópias (só deste objeto) e devolve a lista [{ m, orig }]
function materiaisProprios(g, filtro) {
  const out = []; const feitos = new Map();
  g.traverse(me => {
    if (!me.isMesh || me.userData.disfDeco || (filtro && !filtro(me))) return;
    const lista = Array.isArray(me.material) ? me.material : [me.material];
    const novos = lista.map(m => { if (!m || !m.color) return m; if (!feitos.has(m)) { const c = guardar(m.clone()); feitos.set(m, c); out.push({ m: c, cor: m.color.clone(), em: m.emissive ? m.emissive.clone() : null, ei: m.emissiveIntensity, r: m.roughness, me: m.metalness }); } return feitos.get(m); });
    me.material = Array.isArray(me.material) ? novos : novos[0];
  });
  return out;
}

/* =========================================================
   DETALHES DOS OBJETOS: decorar(T, g, det, semente) → lista de ticks
   k (0 a 1) é a atenção de quem olha: 0 de longe e de relance, 1 de perto e mirando
   ========================================================= */
function decorarObjeto(T, g, det, semente, info) {
  g.updateMatrixWorld(true);
  const bb = new T.Box3().setFromObject(g); if (bb.isEmpty()) return [];
  const s = bb.getSize(new T.Vector3()), ctr = bb.getCenter(new T.Vector3()), r = rngDe(semente + ':' + det);
  const ticks = [];
  const base = { sx: g.scale.x, sy: g.scale.y, sz: g.scale.z };
  // a face maior (a frente do móvel, ou o lado quando ele é fundo e estreito)
  const face = s.x >= s.z * .7 ? 'frente' : 'dir', frente = (fx, fy) => superficie(T, g, face, fx, fy, bb);
  switch (det) {
    case 'resp': {
      const per = 3.4 + r() * 1.2;
      ticks.push((dt, t, k) => { const e = Math.sin(t * Math.PI * 2 / per) * .024 * (.1 + .9 * k); g.scale.set(base.sx * (1 + e * .45), base.sy * (1 + e), base.sz * (1 + e * .45)); });
      break;
    }
    case 'espelho': {
      g.scale.x = -g.scale.x; base.sx = g.scale.x;
      // etiqueta de patrimônio (desenhada certa: no modelo espelhado, ela aparece ao contrário)
      const sp = frente(.25 + r() * .5, .55 + r() * .3);
      adesivo(T, g, sp, .15, .056, matBasico(T, { map: texEtiqueta(T, ['PATRIMÔNIO', 'Nº 0' + (400 + Math.floor(r() * 500))], 'p'), transparent: false, depthWrite: true }));
      break;
    }
    case 'tom': {
      const ms = malhas(T, g); if (!ms.length) break;
      const alvo = ms[0].m, mats = materiaisProprios(g, me => me === alvo);
      const tintas = [[1, .82, .64], [.76, .9, .72], [.74, .82, 1], [1, .76, .78]], tn = tintas[Math.floor(r() * tintas.length)];
      mats.forEach(x => { x.alvo = x.cor.clone().multiply(new T.Color(tn[0], tn[1], tn[2])); });
      ticks.push((dt, t, k) => { const q = .1 + .75 * k; mats.forEach(x => x.m.color.copy(x.cor).lerp(x.alvo, q)); });
      break;
    }
    case 'veia': {
      const sp = frente(r() < .5 ? .2 : .8, .25 + r() * .45), tam = clamp(Math.min(s.x, s.y) * .45, .14, .34);
      const mat = matBasico(T, { map: texVeias(T), opacity: .6 });
      const me = adesivo(T, g, sp, tam, tam * .8, mat);
      ticks.push((dt, t, k) => { mat.opacity = .3 + .7 * k; const p = 1 + Math.max(0, Math.sin(t * 5.2)) * .05 * k; me.scale.set(p, p, 1); });
      break;
    }
    case 'peca': {
      const ms = malhas(T, g), tot = ms.reduce((a, b) => a + b.v, 0);
      const peq = ms.filter(x => x.v < tot * .05 && x.v > tot * .0004);
      // peças parecidas (pernas, rodas, puxadores): uma a mais, ao lado da última
      const grupos = new Map(); peq.forEach(x => { const kk = x.s.toArray().map(v => v.toFixed(2)).join(','); if (!grupos.has(kk)) grupos.set(kk, []); grupos.get(kk).push(x); });
      const rep = [...grupos.values()].filter(l => l.length >= 2).sort((a, b) => b.length - a.length)[0];
      if (rep) {
        const src = rep[Math.floor(r() * rep.length)].m, c = src.clone(); c.userData.disfDeco = 1;
        const sb = new T.Box3().setFromObject(src), ss = sb.getSize(new T.Vector3()), sc = sb.getCenter(new T.Vector3());
        const dir = new T.Vector3(sc.x - ctr.x, 0, sc.z - ctr.z); if (dir.lengthSq() < 1e-4) dir.set(1, 0, 0); dir.normalize();
        const lat = new T.Vector3(-dir.z, 0, dir.x).multiplyScalar(Math.max(ss.x, ss.z) * 1.35 + .02);
        src.parent.add(c); c.position.copy(src.position); c.quaternion.copy(src.quaternion); c.scale.copy(src.scale);
        c.parent.updateMatrixWorld(true); const inv = new T.Matrix4().copy(c.parent.matrixWorld).invert();
        const w = new T.Vector3().copy(sc).add(lat), l = w.applyMatrix4(inv), l0 = sc.clone().applyMatrix4(inv);
        c.position.add(l.sub(l0)); c.raycast = () => {};
      } else {
        // sem peças repetidas: um puxador a mais na frente
        const sp = frente(.5 + (r() - .5) * .5, .35 + r() * .4), mat = matPadrao(T, { color: '#8a8f96', roughness: .35, metalness: .8 });
        const me = new T.Mesh(guardar(new T.CylinderGeometry(.012, .012, .09, 10)), mat); me.rotation.z = Math.PI / 2; me.position.copy(sp.p).add(sp.n.clone().multiplyScalar(.025)); me.userData.disfDeco = 1; me.raycast = () => {}; g.add(me);
        [-1, 1].forEach(q => { const p = new T.Mesh(guardar(new T.CylinderGeometry(.008, .008, .03, 8)), mat); p.position.copy(sp.p).add(sp.n.clone().multiplyScalar(.012)); p.position.x += q * .035; p.lookAt(p.position.clone().add(sp.n)); p.rotateX(Math.PI / 2); p.userData.disfDeco = 1; p.raycast = () => {}; g.add(p); });
      }
      break;
    }
    case 'olho': {
      const tela = TELA.test(info.tipo || '');
      const sp = tela ? frente(.5, .62) : frente(.3 + r() * .4, .3 + r() * .4), w = clamp(Math.min(s.x, s.y) * (tela ? .42 : .2), .08, .24);
      const mat = matBasico(T, { map: texOlho(T), opacity: 0 });
      const me = adesivo(T, g, sp, w, w * .5, mat); me.scale.y = .05; ticks.info = { olho: mat };
      const per = 6 + r() * 5, fase = r() * per;
      ticks.push((dt, t, k) => {
        const u = (t + fase) % per, abre = u < .12 ? u / .12 : u < .55 ? 1 : u < .7 ? 1 - (u - .55) / .15 : 0;
        const vis = k > .45 ? abre : 0; mat.opacity = vis; me.scale.y = .05 + .95 * vis;
        if (vis > 0) me.position.copy(sp.p).add(sp.n.clone().multiplyScalar(.004 + Math.sin(t * 9) * .0008));
      });
      break;
    }
    case 'cabo': {
      const lado = r() < .5 ? 'esq' : 'dir', sp = superficie(T, g, lado, .3 + r() * .4, .35 + r() * .35, bb);
      const p0 = sp.p.clone(), n = sp.n.clone(), p1 = p0.clone().add(n.clone().multiplyScalar(.18)), p2 = p1.clone().add(new T.Vector3(n.x * .25, -p0.y * .75, .08 + r() * .1)), p3 = new T.Vector3(p2.x + n.x * .22, .04, p2.z + .14), p4 = new T.Vector3(p3.x + n.x * .1 + .05, .14 + r() * .08, p3.z + .12);
      const curva = new T.CatmullRomCurve3([p0, p1, p2, p3, p4]);
      const mat = matPadrao(T, { color: '#151515', roughness: .55 });
      const me = new T.Mesh(guardar(new T.TubeGeometry(curva, 40, .009, 6, false)), mat); me.userData.disfDeco = 1; me.raycast = () => {}; g.add(me);
      const cobre = matPadrao(T, { color: '#c77a3a', roughness: .3, metalness: .9 });
      for (let i = 0; i < 6; i++) { const f = new T.Mesh(guardar(new T.CylinderGeometry(.0018, .0018, .035, 4)), cobre); f.position.copy(p4); f.rotation.set(r() * 1.4 - .7, 0, r() * 1.4 - .7); f.translateY(.016); f.userData.disfDeco = 1; f.raycast = () => {}; g.add(f); }
      break;
    }
    case 'fosco': {
      const mats = materiaisProprios(g);
      ticks.push((dt, t, k, cx) => { const q = clamp(k * (cx && cx.luz ? 1 : .7), 0, 1); mats.forEach(x => { x.m.color.copy(x.cor).multiplyScalar(1 - .82 * q); if (x.m.emissive) { x.m.emissive.copy(x.cor).multiplyScalar(.2 * q); x.m.emissiveIntensity = 1; } }); });
      break;
    }
    case 'vira': {
      let off = 0;
      ticks.push((dt, t, k, cx) => {
        if (!cx || !cx.cam || g.userData.disfRotBase == null) return;
        const w = new T.Vector3(); g.getWorldPosition(w);
        const dx = cx.cam.x - w.x, dz = cx.cam.z - w.z, d = Math.hypot(dx, dz);
        if (d < 7 && d > .4) {
          const olhando = (cx.fwd.x * -dx + cx.fwd.z * -dz) / d > .35;
          if (!olhando) { let alvo = Math.atan2(dx, dz) - g.userData.disfRotBase; while (alvo > Math.PI) alvo -= Math.PI * 2; while (alvo < -Math.PI) alvo += Math.PI * 2; alvo = clamp(alvo, -.3, .3); off += clamp(alvo - off, -dt * .18, dt * .18); }
        }
        g.rotation.y = g.userData.disfRotBase + off;
      });
      break;
    }
    case 'gota': {
      const sp = frente(.2 + r() * .6, .92), mat = matPadrao(T, { color: '#1a0204', roughness: .15, metalness: .1 });
      const gt = new T.Mesh(guardar(new T.SphereGeometry(.016, 10, 8)), mat); gt.scale.set(1, 1.5, 1); gt.userData.disfDeco = 1; gt.raycast = () => {}; g.add(gt);
      const poca = new T.Mesh(guardar(new T.CircleGeometry(.09, 18)), matBasico(T, { color: '#2a0306', opacity: .85, depthWrite: false }));
      poca.rotation.x = -Math.PI / 2; poca.position.set(sp.p.x, bb.min.y + .006, sp.p.z + .05); poca.scale.set(1, .7, 1); poca.userData.disfDeco = 1; poca.raycast = () => {}; g.add(poca);
      const per = 7 + r() * 4, alto = sp.p.y;
      ticks.push((dt, t) => { const u = (t % per) / per; if (u < .75) { gt.visible = true; const q = u / .75, y = alto - q * q * (alto - bb.min.y); gt.position.set(sp.p.x, y, sp.p.z + .006 + (y < bb.min.y + .15 ? (1 - (y - bb.min.y) / .15) * .05 : 0)); } else gt.visible = false; });
      break;
    }
    case 'vapor': {
      const mat = matBasico(T, { map: texVapor(T), opacity: .2 });
      const fios = [];
      for (let i = 0; i < 5; i++) { const sm = new T.SpriteMaterial({ map: texVapor(T), transparent: true, depthWrite: false, opacity: 0 }); guardar(sm); const sp = new T.Sprite(sm); sp.userData.disfDeco = 1; sp.raycast = () => {}; g.add(sp); fios.push({ sp, f: i / 5, x: bb.min.x + s.x * (.25 + r() * .5), z: bb.min.z + s.z * (.25 + r() * .5) }); }
      mat.dispose();
      ticks.push((dt, t, k) => fios.forEach(o => { const u = (t * .22 + o.f) % 1; o.sp.position.set(o.x + Math.sin(t + o.f * 9) * .04, bb.max.y + .02 + u * .55, o.z); const e = .16 + u * .42; o.sp.scale.set(e, e * 1.3, 1); o.sp.material.opacity = Math.sin(u * Math.PI) * (.04 + .76 * k); }));
      break;
    }
    case 'limpo': {
      const mats = materiaisProprios(g);
      ticks.push((dt, t, k) => { const q = .3 + .7 * k; mats.forEach(x => { x.m.color.copy(x.cor).multiplyScalar(1 + .14 * q); if (x.r != null) x.m.roughness = lerp(x.r, .12, q); if (x.me != null) x.m.metalness = lerp(x.me, Math.min(1, x.me + .3), q); }); });
      break;
    }
    case 'duplic': {
      // o arranhão: o mesmo no disfarce e no original da sala (o original ganha o risco quando a sala está carregada)
      const sp = frente(.35 + r() * .3, .45 + r() * .3), w = clamp(s.x * .3, .08, .22);
      const claro = (() => { const ms = malhas(T, g); const m = ms[0] && ms[0].m.material; const c = m && m.color; return c ? (c.r + c.g + c.b) / 3 > .45 : false; })();
      adesivo(T, g, sp, w, w * .5, matBasico(T, { map: texRisco(T), opacity: .9, color: claro ? '#3a2a20' : '#ffffff' }));
      g.userData.disfRisco = { fx: sp.p.clone(), n: sp.n.clone(), w, cor: claro ? '#3a2a20' : '#ffffff' };
      break;
    }
    case 'dentes': {
      const sp = frente(.5, .12 + r() * .25), mat = matPadrao(T, { color: '#e8dfc8', roughness: .35 });
      const n2 = 9, larg = clamp(s.x * .35, .08, .22);
      const lado = new T.Vector3(-sp.n.z, 0, sp.n.x).normalize();
      const fenda = adesivo(T, g, sp, larg + .03, .022, matBasico(T, { color: '#050303', opacity: .95 }));
      for (let i = 0; i < n2; i++) { const d2 = new T.Mesh(guardar(new T.ConeGeometry(.0055, .016, 5)), mat); d2.position.copy(sp.p).add(sp.n.clone().multiplyScalar(.006)).add(lado.clone().multiplyScalar((i / (n2 - 1) - .5) * larg)); d2.position.y += .008 - (i % 2) * .016; d2.rotation.z = i % 2 ? 0 : Math.PI; d2.userData.disfDeco = 1; d2.raycast = () => {}; g.add(d2); }
      ticks.push((dt, t, k) => { fenda.scale.y = 1 + Math.max(0, Math.sin(t * .9)) * .35 * k; });
      break;
    }
    case 'cabelo': {
      const sp = frente(r() < .5 ? .12 : .88, .55 + r() * .3);
      const mat = matPadrao(T, { color: '#140e0a', roughness: .5 }), fios = [];
      for (let i = 0; i < 30; i++) {
        const pts = [], a = (r() - .5) * 1.2, l = .14 + r() * .18, x0 = (r() - .5) * .07;
        for (let j = 0; j <= 6; j++) { const q = j / 6; pts.push(new T.Vector3(sp.p.x + x0 + sp.n.x * q * l * .5 + Math.sin(a) * q * .05, sp.p.y + (r() - .5) * .01 - q * q * l, sp.p.z + sp.n.z * q * l * .5 + .004 + Math.cos(a) * q * .02)); }
        const ln = new T.Mesh(guardar(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 10, .0022, 3, false)), mat); ln.userData.disfDeco = 1; ln.raycast = () => {}; g.add(ln); fios.push(ln);
      }
      ticks.push((dt, t, k) => fios.forEach((f, i) => { f.rotation.z = Math.sin(t * 1.3 + i) * .04 * (.3 + k); }));
      break;
    }
    case 'unha': {
      const sp = frente(r() < .5 ? .15 : .85, .55 + r() * .3), mat = matPadrao(T, { color: '#d9a99a', roughness: .3 });
      const u = new T.Mesh(guardar(new T.SphereGeometry(.018, 12, 8)), mat); u.scale.set(1, 1.35, .32); u.position.copy(sp.p).add(sp.n.clone().multiplyScalar(.003)); u.lookAt(u.position.clone().add(sp.n)); u.userData.disfDeco = 1; u.raycast = () => {}; g.add(u);
      const ponta = new T.Mesh(guardar(new T.SphereGeometry(.016, 10, 6)), matPadrao(T, { color: '#f1e8dc', roughness: .3 })); ponta.scale.set(1, .4, .3); ponta.position.copy(u.position); ponta.position.y += .021; ponta.quaternion.copy(u.quaternion); ponta.userData.disfDeco = 1; ponta.raycast = () => {}; g.add(ponta);
      break;
    }
    case 'umido': {
      const mats = materiaisProprios(g);
      const poca = new T.Mesh(guardar(new T.CircleGeometry(Math.max(s.x, s.z) * .45, 24)), matBasico(T, { map: texPoca(T), opacity: .7 }));
      poca.rotation.x = -Math.PI / 2; poca.position.set(ctr.x + (r() - .5) * .2, bb.min.y + .005, ctr.z + (r() - .5) * .2); poca.scale.set(1, .7, 1); poca.userData.disfDeco = 1; poca.raycast = () => {}; g.add(poca);
      ticks.push((dt, t, k) => { const q = .25 + .75 * k; mats.forEach(x => { x.m.color.copy(x.cor).multiplyScalar(1 - .2 * q); if (x.r != null) x.m.roughness = lerp(x.r, .06, q); if (x.me != null) x.m.metalness = lerp(x.me, Math.max(x.me, .25), q); }); poca.material.opacity = .2 + .7 * k; });
      break;
    }
    case 'etiq': {
      const sp = frente(.2 + r() * .6, .4 + r() * .4), dias = ['31/02/1987', '30/02/1979', '32/13/1984', '00/00/1990'];
      adesivo(T, g, sp, .15, .056, matBasico(T, { map: texEtiqueta(T, ['INVENTÁRIO', dias[Math.floor(r() * dias.length)]], 'i' + Math.floor(r() * 4)), transparent: false, depthWrite: true }));
      break;
    }
    case 'sombra': {
      const mat = matBasico(T, { map: texSombra(T), opacity: .3 });
      const me = new T.Mesh(guardar(new T.PlaneGeometry(1, 1)), mat); me.rotation.x = -Math.PI / 2;
      const L = Math.max(s.x, s.z) * 1.6 + .4; me.scale.set(L, L * 1.3, 1);
      me.position.set(ctr.x + (r() - .5) * .3, bb.min.y + .007, ctr.z + L * .35); me.userData.disfDeco = 1; me.raycast = () => {}; me.renderOrder = 1; g.add(me);
      ticks.push((dt, t, k) => { mat.opacity = .14 + .6 * k; me.rotation.z = Math.sin(t * .4) * .08 * k; });
      break;
    }
    case 'pulso': {
      const sp = frente(.3 + r() * .4, .4 + r() * .3), mat = matPadrao(T, { color: '#8a4a42', roughness: .35, map: texVeias(T) });
      const me = new T.Mesh(guardar(new T.SphereGeometry(.065, 16, 12)), mat); me.position.copy(sp.p).sub(sp.n.clone().multiplyScalar(.01)); me.userData.disfDeco = 1; me.raycast = () => {}; g.add(me);
      ticks.push((dt, t, k) => { const u = (t * 1.1) % 1, b = (u < .12 ? Math.sin(u / .12 * Math.PI) : u > .22 && u < .32 ? .6 * Math.sin((u - .22) / .1 * Math.PI) : 0); const e = .55 + b * (.15 + .45 * k); me.scale.set(e, e, e * .8); });
      break;
    }
  }
  return ticks;
}

/* =========================================================
   DETALHES DAS COBAIAS: no token (a miniatura da cobaia copiada)
   t = { g, alt, anim, partes? } (tokens3d.js). Os ticks rodam DEPOIS da animação normal.
   ========================================================= */
function decorarCobaia(T, t, det, semente) {
  const P = t.partes, r = rngDe('c' + semente + det), ticks = [];
  const eyeY = P ? -P.R * .03 : 0, eyeX = P ? P.R * .33 * (P.sxC || .82) / .82 : 0, eyeZ = P ? P.R * (P.szC || .92) * .92 : 0;
  const deco = (pai, me) => { me.userData.disfDeco = 1; me.raycast = () => {}; pai.add(me); return me; };
  switch (det) {
    case 'pisca': {
      if (!P) break;
      const cor = (P.pesc && P.pesc.material && P.pesc.material.color) ? P.pesc.material.color.clone() : new T.Color('#c9a07a');
      const mat = matPadrao(T, { color: cor, roughness: .6 });
      const palp = [-1, 1].map(s => { const m = deco(P.cab, new T.Mesh(guardar(new T.SphereGeometry(P.R * .13, 12, 8)), mat)); m.position.set(s * eyeX, eyeY + P.R * .02, eyeZ * .98); m.scale.set(1, .02, .5); return m; });
      const per = 5.5 + r() * 2; ticks.info = { palp };
      ticks.push((dt, tt, k) => { const u = tt % per; palp.forEach((m, i) => { const u2 = u - i * .8, f = u2 > 0 && u2 < 1.1 ? Math.sin(u2 / 1.1 * Math.PI) : 0; m.scale.y = .02 + f * (k > .3 ? 1 : 0) * .98; }); });
      break;
    }
    case 'sombra': {
      let lx = null, lz = null;
      ticks.push((dt, tt, k) => {
        const sb = t.g.userData.momSombra || (t.g.parent && t.g.parent.userData.momSombra); if (!sb || !sb.parent) return;
        const w = new T.Vector3(); sb.parent.getWorldPosition(w);
        if (lx === null) { lx = w.x; lz = w.z; }
        lx += (w.x - lx) * Math.min(1, dt * .9); lz += (w.z - lz) * Math.min(1, dt * .9);
        const q = .35 + .65 * k, ox = (lx - w.x) * q + .16 * q, oz = (lz - w.z) * q + .1 * q;
        const inv = new T.Matrix4().copy(sb.parent.matrixWorld).invert(), p = new T.Vector3(w.x + ox, 0, w.z + oz).applyMatrix4(inv);
        sb.position.set(p.x, .008, p.z);
      });
      break;
    }
    case 'dedo': {
      if (!P || !P.bracos) break;
      const b = P.bracos[r() < .5 ? 0 : 1], mao = b.mao; if (!mao) break;
      let mm = null; mao.children.forEach(c => { if (c.isMesh && !mm) mm = c.material; });
      const raio = (mao.children[0] && mao.children[0].geometry && mao.children[0].geometry.parameters && mao.children[0].geometry.parameters.radius) || .03, eM = raio / .03;
      const dd = deco(mao, new T.Mesh(guardar(new T.CylinderGeometry(.009 * eM, .0075 * eM, .06 * eM, 6)), mm || matPadrao(T, { color: '#c9a07a' })));
      dd.position.set(b.k * .02 * eM, -.07 * eM, -.006 * eM); dd.rotation.z = b.k * .35;
      break;
    }
    case 'roupa': {
      if (!P || !P.corpo) break;
      P.corpo.scale.x = -P.corpo.scale.x; if (P.cab) P.cab.scale.x = -P.cab.scale.x;
      break;
    }
    case 'olhos': {
      if (!P) break;
      const mats = [-1, 1].map(s => { const sm = guardar(new T.SpriteMaterial({ map: texBrilhoOlho(T), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 })); const sp = deco(P.cab, new T.Sprite(sm)); sp.position.set(s * eyeX, eyeY, eyeZ * 1.04); sp.scale.set(P.R * .5, P.R * .5, 1); return sm; });
      ticks.push((dt, tt, k, cx) => { const v = cx && cx.luzEm ? cx.luzEm(t.g, 9) : 0; mats.forEach(m => { m.opacity = clamp(v * (.35 + .5 * k), 0, .85); }); });
      break;
    }
    case 'cabeca': {
      if (!P || !P.cab) break;
      let giro = 0;
      ticks.push((dt, tt, k, cx) => {
        if (!cx || !cx.cam) return;
        const w = new T.Vector3(); P.cab.getWorldPosition(w);
        const d = Math.hypot(cx.cam.x - w.x, cx.cam.z - w.z);
        let alvo = 0;
        const q = new T.Quaternion(); (P.corpo || t.g).getWorldQuaternion(q); const yaw = new T.Euler().setFromQuaternion(q, 'YXZ').y;
        if (d < 7) { alvo = Math.atan2(cx.cam.x - w.x, cx.cam.z - w.z) - yaw; while (alvo > Math.PI) alvo -= Math.PI * 2; while (alvo < -Math.PI) alvo += Math.PI * 2; alvo = clamp(alvo, -2.5, 2.5) * (.35 + .65 * k); }
        giro += (alvo - giro) * Math.min(1, dt * 2.2); P.cab.rotation.y = giro;
      });
      break;
    }
    case 'resp': {
      if (!P || !P.tronco) break;
      ticks.push((dt, tt, k, cx, andando) => { if (andando) return; const u = tt % 8.5, a = (.012 + .03 * k), e = u < 6.8 ? 0 : Math.abs(Math.sin((u - 6.8) / 1.7 * Math.PI * 3)); P.tronco.scale.x = 1 + e * a * .6; P.tronco.scale.z = 1 + e * a; });
      break;
    }
    case 'joelho': {
      if (!P || !P.pernas) break;
      ticks.push((dt, tt, k, cx, andando) => { if (!andando) return; P.pernas.forEach(p => { p.joelho.rotation.x = -Math.abs(p.joelho.rotation.x) * (.5 + .5 * k); }); });
      break;
    }
    case 'pescoco': {
      if (!P || !P.cab) break;
      P.cab.position.y += P.R * .24; if (P.pesc) { P.pesc.scale.y *= 1.35; }
      break;
    }
    case 'sorriso': {
      if (!P || !P.cab) break;
      const mat = matBasico(T, { map: texSorriso(T), opacity: 0 });
      const me = deco(P.cab, new T.Mesh(guardar(new T.PlaneGeometry(P.R * .95, P.R * .36)), mat)); me.position.set(0, -P.R * .42, P.R * (P.szC || .92) * .93); me.rotation.x = -.18;
      ticks.push((dt, tt, k) => { mat.opacity = .08 + .62 * k; });
      break;
    }
    case 'parado': {
      if (!P) break;
      ticks.push((dt, tt, k, cx, andando) => { if (andando) return; if (P.tronco) P.tronco.scale.set(1, 1, 1); if (P.cab) P.cab.rotation.y = 0; });
      break;
    }
    case 'desliza': {
      if (!P || !P.pernas) break;
      ticks.push((dt, tt, k, cx, andando) => { if (!andando) return; P.pernas.forEach(p => { p.quad.rotation.x *= .12; p.joelho.rotation.x *= .12; }); if (P.corpo) P.corpo.position.y = 0; });
      break;
    }
    case 'alto': { t.g.scale.y *= 1.045; break; }
    case 'pele': {
      if (!P || !P.cabeca || !P.cabeca.material) break;
      const m0 = P.cabeca.material, m = guardar(m0.clone()); P.cabeca.material = m; const c0 = m0.color.clone(), alvo = c0.clone().multiply(new T.Color(.68, .82, .76));
      ticks.push((dt, tt, k) => { m.color.copy(c0).lerp(alvo, .3 + .7 * k); });
      break;
    }
    case 'bracos': {
      if (!P || !P.bracos) break;
      P.bracos.forEach(b => { if (b.cot) b.cot.position.y *= 1.14; if (b.mao) b.mao.position.y *= 1.08; });
      break;
    }
  }
  return ticks;
}

/* =========================================================
   O MODELO DO OBJETO (gancho do sala3d.js para mapa/fil/ob)
   ========================================================= */
// o anel "um tom diferente" (a mesma conta do filhos.js, para a figura que o Mestre vê)
function tomOutro(c) { const T = window.THREE, o = c.clone(); return o.setRGB(Math.min(1, c.r * .82 + .12), Math.min(1, c.g * .86 + .07), Math.min(1, c.b * .7 + .24)); }
const assinatura = ob => [ob.o, ob.cn, ob.i, ob.d, ob.h, ob.p].join('|');
function montarModelo(F, ob, semente, fant) {
  const T = F.T || window.THREE;
  let fonte = null;
  if (typeof ob.cn === 'number' && typeof ob.i === 'number') fonte = itemDaCena(ob.cn, ob.i);
  const it = fonte && fonte.it && (fonte.it.t === ob.o || !F.P[ob.o]) ? fonte.it : null;
  const tipo = it ? it.t : ob.o, fab = F.P[tipo];
  if (typeof fab !== 'function') return null;
  const det = detObjDe(ob, semente);
  const exato = det === 'duplic' && it;
  const prm = it ? (exato ? { sem: ob.i + 1, ...it } : { ...it, sem: (ob.i + 1) * 31 + (hashS(semente) % 97) + 3 }) : { sem: hashS(semente) % 97 + 3 };
  const imgAnt = F.imagens; F.imagens = (fonte && fonte.cena && fonte.cena.imagens) || {};
  let dentro = null; try { dentro = fab(prm); } catch (e) { console.warn('disfarce: modelo', tipo, e); }
  F.imagens = imgAnt;
  if (!dentro) return null;
  dentro.position.set(0, 0, 0); dentro.rotation.set(0, 0, 0); if (it && it.s) dentro.scale.setScalar(it.s);
  const g = new T.Group(); g.add(dentro);
  const luzes = []; g.traverse(o => { if (o.isLight) luzes.push(o); }); luzes.forEach(l => l.parent && l.parent.remove(l));
  g.userData.disfTipo = tipo;
  return { g, det, tipo, it };
}
// sala3d.js: modelo de um objeto publicado (todos os aparelhos montam igual)
function modelo(F, ob, k) {
  const m = montarModelo(F, ob, k); if (!m) return null;
  const T = F.T || window.THREE, g = m.g;
  g.updateMatrixWorld(true);
  const ticks = decorarObjeto(T, g, m.det, k, { tipo: m.tipo });
  const bb = new T.Box3().setFromObject(g), s = bb.getSize(new T.Vector3());
  const ent = { tipo: 'obj', k, g, det: m.det, ticks, at: 0, forc: 0, raio: Math.max(.25, s.length() / 2), alt: bb.getCenter(new T.Vector3()).y, ob: { ...ob }, nome: nomeTipo(m.tipo), nasc: performance.now() };
  g.userData.disfEnt = ent;
  g.userData.disfRotBase = typeof ob.r === 'number' ? ob.r * Math.PI / 180 : ((ob.ts || 0) % 628) / 100;
  REG.obj.set(k, ent);
  Vista.objNovo(ent);
  return g;
}

/* =========================================================
   QUEM ESTÁ NO CONTROLE (Mestre ou auxiliar, no 3D)
   ========================================================= */
const meuCtrl = () => { const ap = api3(); return ap && ap.V ? ap.V.ctrl : null; };
function filhoCtrl() {
  if (!souGM()) return null;
  const id = meuCtrl(), tk = id && tokens()[id]; if (!tk || tipoDe(tk) !== 'filho') return null;
  const ap = api3(); if (!ap || tk.a !== ap.a) return null;
  const c = cfgTk(tk) || {};
  const obj = hab(c, 'objeto'), cop = hab(c, 'copiar');
  if (!obj && !cop) return null;
  return { id, tk, c, obj, cop };
}
// "Trocar de objeto custa a vez" (regra da casa): na perseguição, só na vez dele e gasta o resto da vez
function custoVez(id) {
  if (!opc('custo')) return { ok: true };
  const p = persg(), part = !!(p.on && ordemP().some(o => o.id === id));
  if (!part) return { ok: true };
  if (vezId() !== id) return { ok: false, motivo: 'Na perseguição, trocar de forma só na vez dele (regra da casa).' };
  const lim = A().limiteDe ? A().limiteDe(id) : 0;
  return { ok: true, m: lim || 99 };
}

/* =========================================================
   AÇÕES: virar objeto, virar cobaia, quebrar o disfarce
   ========================================================= */
function gravarObjEstado(id, k) { try { return I().Priv.gravar(['filhosEstado', 'obj', id], k); } catch (e) { return null; } }
function virarObjeto(id, op) {
  const tk = tokens()[id]; if (!tk) return false;
  const cv = custoVez(id); if (!cv.ok) { avisar(cv.motivo); return false; }
  const ob = { a: tk.a, x: +num(op.x, tk.x).toFixed(2), y: +num(op.y, tk.y).toFixed(2), o: String(op.o).slice(0, 24), ts: agora() };
  if (typeof op.cn === 'number' && typeof op.i === 'number') { ob.cn = op.cn; ob.i = op.i; }
  if (typeof op.r === 'number') ob.r = Math.round(((op.r % 360) + 360) % 360);
  if (op.h > .05) ob.h = +clamp(op.h, 0, 3.5).toFixed(2);
  if (op.p) ob.p = 1;
  ob.d = op.d && DOBJ[op.d] ? op.d : sortearObj(ob.o, null, ob.cn !== undefined);
  let obk = (ef().obj || {})[id];
  const trocou = !!(tk.fo && obk);
  if (!obk) obk = 'o' + A().Rede.chave().slice(-10);
  gravarObjEstado(id, obk);   // o dono primeiro: a tela do Mestre apaga objeto sem dono
  A().definir(['fil', 'ob', obk], ob);
  const n = { ...tk, fo: nomeTipo(ob.o).toLowerCase().slice(0, 24) };
  delete n.cp; delete n.cpd;
  if (cv.m) n.m = cv.m;
  A().definir(['tokens', id], n);
  logFilhos(`${nomeTk(tk)} ${trocou ? 'trocou de objeto' : 'virou objeto'}: ${nomeTipo(ob.o).toLowerCase()} · detalhe: ${DOBJ[ob.d][1].toLowerCase()}`);
  return true;
}
function virarCobaia(id, cob, det) {
  const tk = tokens()[id]; if (!tk || !SERd(cob)) return false;
  const cv = custoVez(id); if (!cv.ok) { avisar(cv.motivo); return false; }
  const d = det && DCOB[det] ? det : sortearCob(cob);
  const n = { ...tk, cp: cob, cpd: d };
  if (tk.fo) { const obk = (ef().obj || {})[id]; if (obk) A().definir(['fil', 'ob', obk], null); gravarObjEstado(id, null); delete n.fo; }
  if (cv.m) n.m = cv.m;
  A().definir(['tokens', id], n);
  logFilhos(`${nomeTk(tk)} copiou ${SERd(cob).nome} · detalhe: ${DCOB[d][1].toLowerCase()}`);
  return true;
}
const MOTIVOS = { voltou: 'voltou à forma', atacou: 'atacou: o disfarce caiu', acertado: 'foi acertado: o disfarce caiu', revelado: 'o Mestre revelou o disfarce' };
function quebrar(id, motivo) {
  const tk = tokens()[id]; if (!tk || !(tk.fo || tk.cp) || !souGM()) return false;
  const n = { ...tk }; delete n.fo; delete n.cp; delete n.cpd;
  if (tk.fo) { const obk = (ef().obj || {})[id]; if (obk) A().definir(['fil', 'ob', obk], null); gravarObjEstado(id, null); }
  n.rvt = agora();
  A().definir(['tokens', id], n);
  logFilhos(`${nomeTk(tk)} ${MOTIVOS[motivo] || 'voltou à forma'}`);
  if (souMestre() && A().diario) A().diario('filhos', `Disfarce desfeito: ${nomeTk(tk)} ${MOTIVOS[motivo] || 'voltou à forma'}`);
  if (meuCtrl() === id) Ctrl.depoisDeQuebrar();
  return true;
}

/* =========================================================
   GANCHOS DO filhos.js
   ========================================================= */
// botões "Forma de Objeto" e "Copiar" (devolve true quando cuidou)
function usar(id, k, tk) {
  if (k !== 'objeto' && k !== 'copiar') return false;
  if (tk.fo || tk.cp) {
    // apertar de novo: volta à forma (com a animação de quebrar). Copiando e pedindo objeto (ou o contrário): troca
    if ((k === 'objeto' && tk.fo) || (k === 'copiar' && tk.cp)) { quebrar(id, 'voltou'); return true; }
  }
  const ap = api3();
  if (ap && meuCtrl() === id) { Ctrl.abrirPop(k === 'objeto' ? 'objeto' : 'cobaia'); return true; }
  if (k === 'copiar') { Escolha.cobaia2D(id); return true; }
  return false;   // Forma de Objeto pelo mapa 2D: a lista antiga (o detalhe sai da chave)
}
// "Só se move quando ninguém olha": '' = pode mover; texto = motivo; null = regra da ficha (não se move)
function travaObjeto(id, tk) {
  if (!opc('olhar')) return null;
  const olhando = quemOlha(tk);
  return olhando ? `${olhando} está olhando: o objeto não se mexe agora.` : '';
}
function quemOlha(tk) {
  const p = salaP(tk); if (!p) return '';
  const mu = (A().geo && A().geo.M_POR_UNID) || 1;
  for (const [cid, c] of Object.entries(tokens())) {
    if (!c || tipoDe(c) !== 'cobaia' || c.a !== tk.a || c.h || c.esq || salaP(c) !== p) continue;
    const dx = tk.x - c.x, dy = tk.y - c.y, d = Math.hypot(dx, dy) * mu; if (d > 14) continue;
    if (c.d == null) return (SERd(cid) || {}).nome || 'Uma cobaia';
    const a = c.d * Math.PI / 180, fx = Math.sin(a), fy = Math.cos(a);
    if ((fx * dx + fy * dy) / (Math.hypot(dx, dy) || 1) > .55) return (SERd(cid) || {}).nome || 'Uma cobaia';
  }
  return '';
}
// tela do Mestre: o jogador reparou em algo (filAcoes t = reparar) → Diário
function aoReparar(x) {
  if (!souMestre() || !x) return;
  const quem = (SERd(x.s) || {}).nome || x.s, alvo = String(x.o || '');
  let txt = '', era = false;
  if (alvo.startsWith('ob:')) { const ob = (pub().ob || {})[alvo.slice(3)]; era = !!ob; txt = `${quem} reparou num(a) ${ob ? nomeTipo(ob.o).toLowerCase() : 'objeto'} na CN ${pad2(x.cn)}: Percepção ${x.v}`; }
  else if (alvo.startsWith('tk:')) { const tk = tokens()[alvo.slice(3)]; era = !!(tk && tk.cp); txt = `${quem} reparou em ${tk ? (tk.cp ? (SERd(tk.cp) || {}).nome : nomeTk(tk)) : 'alguém'} na CN ${pad2(x.cn)}: Intuição ${x.v}`; }
  else txt = `${quem} reparou num objeto da CN ${pad2(x.cn)}: Percepção ${x.v}`;
  txt += x.ok ? ' · passou' : ' · falhou';
  if (era) txt += x.ok ? ' (era o disfarce: percebeu o detalhe)' : ' (era o disfarce: não percebeu)';
  if (A().diario) A().diario('filhos', '🔍 ' + txt);
  if (era && x.ok && A().alertaMestre) A().alertaMestre('🔍 ' + txt + '.');
}

/* =========================================================
   ESCOLHAS (janelas do mapa 2D e do 3D)
   ========================================================= */
// cobaias que este Filho pode copiar: com "Exigir Estudar" ligado, só as estudadas (o Mestre vê todas, marcadas)
function listaCopia(id) {
  const lib = new Set(Object.keys(((ef().copias || {})[id]) || {}));
  const todas = Object.keys(A().SER || {}).filter(k => SERd(k).tipo === 'cobaia');
  const exige = opc('estudo');
  return todas.filter(k => !exige || souMestre() || lib.has(k)).map(k => ({ k, nome: SERd(k).nome, cor: SERd(k).cor, estudada: lib.has(k), livre: !exige || lib.has(k) }))
    .sort((a, b) => (b.livre - a.livre) || a.nome.localeCompare(b.nome));
}
function detalheDaFicha(id) { const tk = tokens()[id], c = tk && cfgTk(tk); return c && c.detalhe && DCOB[c.detalhe] ? c.detalhe : ''; }
const Escolha = {
  // mapa 2D: janela com a lista de cobaias e o detalhe (sorteio, o da ficha ou um escolhido)
  cobaia2D(id) {
    const L = listaCopia(id);
    if (!L.length) { A().aviso(opc('estudo') ? 'Nenhuma cópia liberada: use Estudar (uma cena inteira como objeto com a cobaia).' : 'Nenhuma cobaia para copiar.'); return; }
    let det = detalheDaFicha(id) || '', lista = false;
    if (det && !DCOB[det]) det = '';
    const m = document.createElement('div'); m.id = 'filModal'; m.className = 'fil-modal disf-modal2d';   // a mesma janela das habilidades (fecha junto)
    const desenhar = () => {
      m.innerHTML = `<div class="fil-caixa disf-caixa" role="dialog" aria-modal="true"><button class="fil-x" aria-label="Fechar">×</button><h3>🎭 Copiar uma cobaia</h3>
        ${opc('estudo') && souMestre() ? '<p class="disf-nota">"Exigir Estudar" está ligado: as marcadas com ✔ foram estudadas. Você (Mestre) pode copiar qualquer uma.</p>' : ''}
        <div class="fil-opcoes">${L.map((o, i) => `<button data-op="${i}" data-cob="${o.k}"><span class="disf-bola" style="--c:${esc(o.cor)}"></span>${esc(o.nome)}${o.estudada ? ' ✔' : ''}${!o.livre ? '<small>sem Estudar</small>' : ''}</button>`).join('')}</div>
        <p class="disf-sub">Detalhe errado${det && det === detalheDaFicha(id) ? ' (o da ficha)' : ''}</p>${lista ? Ctrl.listaDet('cob', det) : Ctrl.chipsDet('cob', det)}</div>`;
      $('.fil-x', m).onclick = () => m.remove();
      $$('[data-cob]', m).forEach(b => b.onclick = () => { m.remove(); virarCobaia(id, b.dataset.cob, det); });
      $$('[data-det]', m).forEach(b => b.onclick = () => { det = b.dataset.det; lista = false; desenhar(); });
      $$('[data-det-lista]', m).forEach(b => b.onclick = () => { lista = true; desenhar(); });
    };
    const velho = $('#filModal'); if (velho) velho.remove();
    document.body.appendChild(m); desenhar();
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
  },
};

/* =========================================================
   ESTILO
   ========================================================= */
const CSS = `
.disf-barra { position: absolute; right: max(10px, env(safe-area-inset-right)); bottom: calc(max(12px, env(safe-area-inset-bottom)) + 74px); z-index: 4; display: flex; gap: 5px; pointer-events: auto; }
.disf-barra[hidden], .disf-pop[hidden], .disf-card[hidden], .disf-mira[hidden], .disf-rep[hidden], .disf-res[hidden] { display: none; }
.disf-bt { min-width: 54px; min-height: 48px; padding: 4px 7px 3px; display: grid; justify-items: center; align-content: center; gap: 1px; border-radius: 12px; border: 1px solid rgba(231,111,81,.6); background: rgba(22,10,12,.88); color: #f6e8e4; font: 600 10.5px/1.05 var(--mono, monospace); cursor: pointer; -webkit-tap-highlight-color: transparent; backdrop-filter: blur(3px); }
.disf-bt i { font-style: normal; font-size: 19px; line-height: 1.1; }
.disf-bt:hover, .disf-bt:focus-visible { border-color: #ffb199; outline: none; }
.disf-bt.on { border-color: #ffd23f; box-shadow: 0 0 0 1px #ffd23f inset; }
.disf-bt.perigo { border-color: #ff5a4a; background: rgba(60,8,10,.9); }
.disf-pop { position: absolute; right: max(10px, env(safe-area-inset-right)); bottom: calc(max(12px, env(safe-area-inset-bottom)) + 132px); z-index: 70; width: min(340px, calc(100% - 20px)); max-height: min(58vh, 460px); overflow: auto; padding: 10px; border-radius: 14px; background: rgba(16,9,12,.97); border: 1px solid #e76f51; box-shadow: 0 10px 30px rgba(0,0,0,.6); color: #f3e8ec; display: grid; gap: 7px; font: 13px/1.3 var(--sans, system-ui, sans-serif); }
.disf-pop h4 { margin: 0; font: 700 11px var(--mono, monospace); letter-spacing: .12em; color: #ffb199; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.disf-pop h4 button { min-width: 40px; min-height: 40px; border: 0; background: transparent; color: #cfc6e0; font-size: 18px; cursor: pointer; }
.disf-op { min-height: 44px; text-align: left; padding: 7px 10px; border-radius: 10px; border: 1px solid #3e2a30; background: #1f1317; color: #f3e8ec; font: 600 13px/1.25 var(--sans, system-ui, sans-serif); cursor: pointer; display: flex; gap: 10px; align-items: center; width: 100%; }
.disf-op:hover, .disf-op:focus-visible { border-color: #e76f51; outline: none; }
.disf-op i { font-style: normal; font-size: 18px; flex: none; width: 24px; text-align: center; }
.disf-op small { display: block; font: 500 11px/1.25 var(--mono, monospace); color: #c5a9b0; margin-top: 2px; }
.disf-op[aria-disabled="true"] { opacity: .5; }
.disf-pop p.mini, .disf-card p.mini { margin: 0; font-size: 11.5px; color: #c5a9b0; }
.disf-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.disf-chips button { min-height: 40px; padding: 0 11px; border-radius: 999px; border: 1px solid #3e2a30; background: #140c0f; color: #d9c6cc; font: 600 12px var(--mono, monospace); cursor: pointer; }
.disf-chips button.on { border-color: #ffd23f; background: rgba(255,210,63,.14); color: #fff3c4; }
.disf-lista-det { display: grid; gap: 4px; max-height: 220px; overflow: auto; }
.disf-lista-det button { min-height: 40px; text-align: left; padding: 5px 9px; border-radius: 9px; border: 1px solid #3e2a30; background: #1a1014; color: #f3e8ec; font: 600 12px var(--sans, system-ui, sans-serif); cursor: pointer; }
.disf-lista-det button.on { border-color: #ffd23f; }
.disf-lista-det small { display: block; font: 500 10.5px var(--mono, monospace); color: #b9a0a8; }
.disf-card { position: absolute; right: max(10px, env(safe-area-inset-right)); bottom: calc(max(12px, env(safe-area-inset-bottom)) + 132px); z-index: 5; width: min(340px, calc(100% - 20px)); padding: 9px 10px; border-radius: 14px; background: rgba(16,9,12,.93); border: 1px solid #ffd23f; color: #fff3e0; display: grid; gap: 7px; font: 13px/1.3 var(--sans, system-ui, sans-serif); box-shadow: 0 8px 26px rgba(0,0,0,.55); }
.disf-card b { font: 700 12px var(--mono, monospace); letter-spacing: .06em; color: #ffd23f; flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.disf-card .disf-tit { flex-wrap: nowrap; margin: -2px 0 -4px; }
.disf-card .disf-tit button.x { min-width: 40px; min-height: 40px; }
.disf-card .disf-linha { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.disf-card .disf-linha button { min-width: 44px; min-height: 44px; border-radius: 12px; border: 1px solid #5a4630; background: #241a10; color: #ffe9b8; font: 700 15px var(--mono, monospace); cursor: pointer; padding: 0 10px; }
.disf-card .disf-linha button.pri { background: #3a2c08; border-color: #ffd23f; color: #fff3c4; flex: 1 1 auto; }
.disf-card .disf-linha button.x { border-color: #5a4a6e; background: transparent; color: #cfc6e0; }
.disf-card .disf-linha button:disabled { opacity: .45; }
.disf-mira { position: absolute; left: 50%; top: 50%; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%; border: 2px solid rgba(255,210,63,.9); box-shadow: 0 0 0 2px rgba(0,0,0,.45), inset 0 0 0 2px rgba(0,0,0,.35); pointer-events: none; z-index: 3; }
.disf-mira::after { content: ''; position: absolute; left: 50%; top: 50%; width: 4px; height: 4px; margin: -2px 0 0 -2px; border-radius: 50%; background: #ffd23f; }
.disf-mira-txt { position: absolute; left: 50%; top: calc(50% + 28px); transform: translateX(-50%); padding: 4px 12px; border-radius: 999px; background: rgba(0,0,0,.66); color: #ffe9a8; font: 600 12px var(--mono, monospace); white-space: nowrap; max-width: calc(100% - 24px); overflow: hidden; text-overflow: ellipsis; pointer-events: none; z-index: 3; }
.disf-mira-txt[hidden] { display: none; }
.disf-rep { position: absolute; left: 50%; top: calc(50% + 34px); transform: translateX(-50%); z-index: 4; min-height: 44px; padding: 6px 16px; border-radius: 22px; border: 1px solid #9fd8ff; background: rgba(8,16,24,.86); color: #dff3ff; font: 700 13px var(--mono, monospace); cursor: pointer; box-shadow: 0 0 16px rgba(120,200,255,.25); max-width: calc(100% - 40px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; animation: disfIn .25s ease-out; }
.disf-rep kbd { margin-left: 6px; padding: 1px 6px; border-radius: 5px; border: 1px solid #9fd8ff; border-bottom-width: 3px; font: 700 11px var(--mono, monospace); }
.disf-res { position: absolute; left: 50%; top: 36%; transform: translate(-50%, -50%); z-index: 6; width: min(340px, calc(100% - 32px)); padding: 12px 16px; border-radius: 14px; background: rgba(8,8,14,.9); border: 1px solid #9fd8ff; color: #eef6ff; text-align: center; font: 600 14px/1.4 var(--sans, system-ui, sans-serif); pointer-events: none; animation: disfIn .25s ease-out; }
.disf-res b { display: block; font: 700 11px var(--mono, monospace); letter-spacing: .16em; color: #9fd8ff; margin-bottom: 4px; }
.disf-res .dados { display: flex; gap: 5px; justify-content: center; margin: 4px 0 6px; }
.disf-res .dados span { min-width: 28px; padding: 3px 5px; border-radius: 6px; border: 1px solid #47607a; font: 700 13px var(--mono, monospace); color: #cfe6ff; }
.disf-res .dados span.usada { border-color: #ffd23f; color: #fff3c4; }
.disf-res .msg { display: block; margin-top: 6px; font-size: 15px; color: #fff; }
.disf-res.achou { border-color: #ffd23f; box-shadow: 0 0 22px rgba(255,210,63,.3); }
.disf-res.achou .msg { color: #ffe08a; }
@keyframes disfIn { from { opacity: 0; transform: translate(-50%, -30%); } to { opacity: 1; transform: translate(-50%, -50%); } }
.disf-rep { animation-name: disfInRep; }
@keyframes disfInRep { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
.disf-flash { position: absolute; inset: 0; z-index: 2; pointer-events: none; background: radial-gradient(circle at 50% 55%, rgba(231,111,81,.0) 30%, rgba(120,20,30,.55) 100%); opacity: 0; transition: opacity .25s; }
.disf-flash.on { opacity: 1; }
.disf-nota { font-size: 12px; color: var(--texto-dim, #b9b0cc); margin: 0 0 6px; }
.disf-sub { margin: 10px 0 4px; font: 700 11px var(--mono, monospace); letter-spacing: .12em; text-transform: uppercase; color: var(--texto-dim, #b9b0cc); }
.disf-bola { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: var(--c); margin-right: 8px; box-shadow: 0 0 6px var(--c); vertical-align: -1px; }
.disf-caixa .disf-chips { margin-top: 4px; }
.disf-caixa .fil-opcoes small { display: block; font-size: 11px; opacity: .7; }
.disf-cfg h3 { margin: 14px 0 4px; font: 700 12px var(--mono, monospace); letter-spacing: .1em; color: var(--texto-dim, #b9b0cc); text-transform: uppercase; }
.disf-cfg p.mini { font-size: 12px; color: var(--texto-dim, #b9b0cc); margin: 2px 0 6px; }
#s3d.disf-modo .s3d-dica { display: none; }
@media (pointer: coarse), (max-width: 560px) { #s3d.disf-modo .s3d-hab { display: none; } .disf-card { width: min(300px, calc(100% - 150px)); min-width: 200px; } }
@media (max-width: 420px) { .disf-bt { min-width: 0; width: 52px; padding: 4px 2px 3px; font-size: 9.5px; } .disf-card { right: 8px; width: calc(100% - 146px); min-width: 206px; padding: 8px; } .disf-card .disf-linha button { min-width: 42px; padding: 0 8px; } }
`;
function estilo() { if ($('#disfEstilo')) return; const s = document.createElement('style'); s.id = 'disfEstilo'; s.textContent = CSS; document.head.appendChild(s); }

/* =========================================================
   CONTROLE: o modo Disfarce de quem controla o Filho no 3D
   ========================================================= */
const Ctrl = {
  modo: '',            // '' | 'mira' | 'colocar'
  pop: '', sig: '', det: '', alvo: null, fant: null, rot: 0, alt: 0, usarAlt: false, desl: [0, 0], modoAnt: '',
  chipsDet(qual, atual) {
    const L = qual === 'obj' ? DET_OBJ : DET_COB;
    const nomeAtual = atual ? (L.find(d => d[0] === atual) || [])[1] : '';
    return `<div class="disf-chips" role="group" aria-label="Detalhe errado"><button type="button" data-det="" class="${atual ? '' : 'on'}" title="Um detalhe sorteado na hora">🎲 Sorteio</button>${atual ? `<button type="button" class="on" data-det="${esc(atual)}">✔ ${esc(nomeAtual)}</button>` : ''}<button type="button" data-det-lista="${qual}">Escolher…</button></div>`;
  },
  listaDet(qual, atual) {
    const L = qual === 'obj' ? DET_OBJ : DET_COB;
    return `<div class="disf-lista-det">${L.map(d => `<button type="button" data-det="${d[0]}" class="${d[0] === atual ? 'on' : ''}">${esc(d[1])}${d[3] && d[3].ficha ? ' (ficha)' : ''}<small>${esc(d[2])}</small></button>`).join('')}</div>`;
  },
  barra() {
    const b = $('#disfBarra'); if (!b) return;
    const ap = api3(), f = filhoCtrl();
    const pode = f && ap && !(ap.V.d && ap.V.d.classList.contains('s3d-sem-hud'));
    if (!pode) { if (!b.hidden) { b.hidden = true; this.fecharPop(); } if (this.modo) this.sair(); this.sig = ''; return; }
    const L = [];
    if (this.modo === 'mira') { L.push(['lista', '📋', 'Lista', 'Escolher da lista (cadeira, caixote, maca…)']); L.push(['sair', '✕', 'Cancelar', 'Sair do modo Disfarce']); }
    else if (this.modo !== 'colocar') {
      if (f.tk.fo || f.tk.cp) L.push(['voltar', '↩', 'Voltar', 'Voltar à forma (desfaz o disfarce)', 'perigo']);
      if (f.obj) L.push(['objeto', '🪑', f.tk.fo ? 'Trocar' : 'Objeto', f.tk.fo ? 'Trocar de objeto' : 'Virar um objeto da sala']);
      if (f.cop) L.push(['cobaia', '🧍', 'Cobaia', 'Virar uma cobaia (a cópia)']);
    }
    const sig = L.map(x => x.join('|')).join('#') + this.pop;
    if (sig !== this.sig) {
      this.sig = sig;
      b.innerHTML = L.map(([k, i, n, tt, cls]) => `<button type="button" class="disf-bt${cls ? ' ' + cls : ''}${this.pop === k ? ' on' : ''}" data-disf="${k}" title="${esc(tt)}" aria-label="${esc(tt)}"><i aria-hidden="true">${i}</i>${esc(n)}</button>`).join('');
    }
    b.hidden = !L.length;
    // o cartão do piloto da perseguição fica embaixo: sobe a barra
    const ps = $('.ps-piloto'); const sobe = ps && ps.offsetParent && innerWidth < 900 ? (innerHeight - ps.getBoundingClientRect().top + 8) : 0;
    b.style.bottom = sobe ? sobe + 'px' : '';
  },
  botao(k) {
    if (document.pointerLockElement && k !== 'objeto') document.exitPointerLock();
    const f = filhoCtrl(); if (!f) return;
    if (k === 'voltar') { this.fecharPop(); quebrar(f.id, 'voltou'); return; }
    if (k === 'objeto') { this.fecharPop(); this.entrarMira(); return; }
    if (k === 'cobaia') { this.pop === 'cobaia' ? this.fecharPop() : this.abrirPop('cobaia'); return; }
    if (k === 'lista') { this.pop === 'lista' ? this.fecharPop() : this.abrirPop('lista'); return; }
    if (k === 'sair') { this.sair(); return; }
  },
  abrirPop(k) {
    const pop = $('#disfPop'), f = filhoCtrl(); if (!pop || !f) return;
    if (k === 'objeto') { this.entrarMira(); return; }
    if (document.pointerLockElement) document.exitPointerLock();
    this.pop = k; this.sig = '';
    let h = '';
    if (k === 'cobaia') {
      const L = listaCopia(f.id);
      if (this.det === undefined || this.detQual !== 'cob') { this.det = detalheDaFicha(f.id); this.detQual = 'cob'; }
      h = `<h4><span>🧍 Virar uma cobaia</span><button type="button" data-pop="x" aria-label="Fechar">✕</button></h4>`
        + (L.length ? L.map(o => `<button type="button" class="disf-op" data-cob="${o.k}"${o.livre ? '' : ' data-sem="1"'}><i aria-hidden="true"><span class="disf-bola" style="--c:${esc(o.cor)};margin:0"></span></i><span>${esc(o.nome)}${o.estudada ? ' ✔' : ''}<small>${o.livre ? (o.estudada ? 'estudada' : 'cópia livre') : 'sem Estudar (só o Mestre)'}</small></span></button>`).join('')
          : `<p class="mini">${opc('estudo') ? 'Nenhuma cópia liberada. Pela ficha, é preciso Estudar: passar uma cena inteira como objeto na mesma sala que a cobaia.' : 'Nenhuma cobaia para copiar.'}</p>`)
        + `<p class="mini">Detalhe errado${this.det && DCOB[this.det] && this.det === detalheDaFicha(f.id) ? ' (o da ficha)' : ''}:</p>${this.chipsDet('cob', this.det)}`
        + (opc('estudo') ? '<p class="mini">"Exigir Estudar (ficha)" está ligado.</p>' : '');
    } else if (k === 'lista') {
      h = `<h4><span>📋 Objeto da lista</span><button type="button" data-pop="x" aria-label="Fechar">✕</button></h4>`
        + ((FIL() && FIL().OBJETOS) || []).map(([o, n]) => `<button type="button" class="disf-op" data-lista="${esc(o)}"><i aria-hidden="true">🪑</i><span>${esc(n)}</span></button>`).join('')
        + '<p class="mini">Ou mire num objeto da sala para copiar o modelo exato.</p>';
    } else if (k === 'detobj' || k === 'detcob') {
      const q = k === 'detobj' ? 'obj' : 'cob';
      h = `<h4><span>Detalhe errado</span><button type="button" data-pop="x" aria-label="Fechar">✕</button></h4><p class="mini">Só se percebe olhando de perto e com atenção.</p>${this.listaDet(q, this.det)}`;
    }
    pop.innerHTML = h; pop.hidden = false; this.barra();
  },
  fecharPop() { const pop = $('#disfPop'); if (pop) { pop.hidden = true; pop.innerHTML = ''; } this.pop = ''; this.sig = ''; },
  cliquePop(e) {
    const f = filhoCtrl();
    if (e.target.closest('[data-pop="x"]')) { const volta = this.pop === 'detobj' ? 'colocar' : this.pop === 'detcob' ? 'cobaia' : ''; this.fecharPop(); if (volta === 'cobaia') this.abrirPop('cobaia'); this.barra(); return; }
    const bd = e.target.closest('[data-det]');
    if (bd) { this.det = bd.dataset.det; if (this.pop === 'detobj') { this.fecharPop(); this.cartao(); } else if (this.pop === 'detcob') { this.fecharPop(); this.abrirPop('cobaia'); } else this.abrirPop(this.pop); return; }
    const bl = e.target.closest('[data-det-lista]'); if (bl) { this.abrirPop(bl.dataset.detLista === 'obj' ? 'detobj' : 'detcob'); return; }
    const bc = e.target.closest('[data-cob]');
    if (bc && f) {
      if (bc.dataset.sem && !souMestre()) { avisar('Pela ficha, é preciso Estudar esta cobaia antes.'); return; }
      const cob = bc.dataset.cob; this.fecharPop();
      if (virarCobaia(f.id, cob, this.det)) { this.det = undefined; Efx.flash(); }
      return;
    }
    const bo = e.target.closest('[data-lista]');
    if (bo && f) { this.fecharPop(); this.escolher({ o: bo.dataset.lista }); }
  },

  /* ---------- modo mira: contorno no que pode ser copiado ---------- */
  entrarMira() {
    const ap = api3(), f = filhoCtrl(); if (!ap || !f) return;
    const cv = custoVez(f.id); if (!cv.ok) { avisar(cv.motivo); return; }
    this.limparColocar(); this.modo = 'mira'; this.sig = ''; this.det = ''; this.detQual = 'obj';
    ap.V.d.classList.add('disf-modo');
    $('#disfMira').hidden = false;
    ap.toast(celular() ? 'Disfarce: toque num objeto da sala (ou mire com o círculo).' : 'Disfarce: mire num objeto da sala e clique.');
    this.barra();
  },
  sair(confirmou) {
    const ap = api3();
    if (!confirmou && this.modo === 'colocar') this.voltarCamera();
    this.limparColocar(); this.tirarContorno(); this.modo = ''; this.sig = ''; this.fecharPop();
    const m = $('#disfMira'); if (m) m.hidden = true; const mt = $('#disfMiraTxt'); if (mt) mt.hidden = true;
    const c = $('#disfCard'); if (c) c.hidden = true;
    if (ap && ap.V && ap.V.d) ap.V.d.classList.remove('disf-modo');
    this.barra();
  },
  // objetos da sala atual que podem ser copiados, no raio
  candidatos(ap) {
    const p = ap.salaNoPonto3D(ap.est.px, ap.est.pz); if (!p) return [];
    const c = ap.mundo.carregadas.get(p); if (!c || c.extra) return [];
    return c.g.children.filter(o => o.visible !== false && copiavel(ap.T, o)).map(o => ({ o, p, cn: ap.mundo.S[p].cn }));
  },
  pick(ap, ray) {
    const L = this.candidatos(ap); if (!L.length) return null;
    const hits = ray.intersectObjects(L.map(x => x.o), true);
    for (const h of hits) { let o = h.object; while (o && !L.some(x => x.o === o)) o = o.parent; if (o) { const x = L.find(y => y.o === o); return { ...x, d: h.distance }; } }
    return null;
  },
  quadroMira(ap) {
    const tq = performance.now(); if (tq - (this.tMira || 0) < 90) { if (this.contorno) this.contorno.pulso(tq / 1000); return; } this.tMira = tq;
    const T = ap.T, ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2(0, 0), ap.camera); ray.far = 24;
    const h = this.pick(ap, ray), mt = $('#disfMiraTxt');
    const o = h ? h.o : null;
    if (o !== (this.hov && this.hov.o)) {
      this.tirarContorno(); this.hov = h;
      if (h) this.contorno = Efx.contorno(T, h.o, '#ffd23f');
    }
    if (mt) { mt.hidden = !h; if (h) mt.textContent = `🎭 ${nomeTipo(h.o.userData.t)} · ${celular() ? 'toque' : 'clique'} para copiar`; }
    if (this.contorno) this.contorno.pulso(performance.now() / 1000);
  },
  tirarContorno() { if (this.contorno) { this.contorno.tirar(); this.contorno = null; } this.hov = null; },
  // toque ou clique (gancho do sala3d.js): devolve true quando cuidou
  tocar(ray, mira) {
    if (this.modo === 'colocar') {
      const ap = api3(); if (!ap) return false;
      const p = new ap.T.Vector3(); if (!ray.ray.intersectPlane(new ap.T.Plane(new ap.T.Vector3(0, 1, 0), 0), p)) return true;
      if (mira) return true;
      this.mover(p.x, p.z); return true;
    }
    if (this.modo !== 'mira') return false;
    const ap = api3(); if (!ap) return false;
    let h = mira ? this.hov : this.pick(ap, ray);
    if (!h && mira) { const r2 = new ap.T.Raycaster(); r2.setFromCamera(new ap.T.Vector2(0, 0), ap.camera); h = this.pick(ap, r2); }
    if (!h) { ap.toast('Isso não dá para copiar. Mire numa cadeira, armário, monitor, caixa…'); return true; }
    this.escolher({ obj: h.o, cn: h.cn, i: h.o.userData.i, o: h.o.userData.t });
    return true;
  },

  /* ---------- colocar: o fantasma do objeto na posição do Filho ---------- */
  escolher(op) {
    const ap = api3(), f = filhoCtrl(); if (!ap || !f) return;
    this.tirarContorno();
    const m = $('#disfMira'); if (m) m.hidden = true; const mt = $('#disfMiraTxt'); if (mt) mt.hidden = true;
    const F = ap.fabrica(), T = ap.T;
    const ob = { o: op.o }; if (typeof op.cn === 'number') { ob.cn = op.cn; ob.i = op.i; }
    const mm = montarModelo(F, ob, 'fant' + f.id, true); if (!mm) { ap.toast('Não deu para copiar esse modelo.'); this.sair(); return; }
    // altura original (em cima de uma mesa, na parede) e se é de parede
    let h0 = 0, parede = PAREDE.test(op.o || '');
    if (op.obj) { const b = new T.Box3().setFromObject(op.obj); h0 = Math.max(0, b.min.y - .002); if (mm.it && typeof mm.it.h0 === 'number') h0 = mm.it.h0; }
    this.alvo = { ...ob, nome: nomeTipo(op.o), h0, parede, rotOrig: op.obj ? op.obj.rotation.y : 0 };
    this.usarAlt = parede; this.alt = parede ? h0 : 0;
    this.rot = parede ? 0 : (op.obj ? op.obj.rotation.y : ap.est.yaw + Math.PI);
    this.desl = [0, 0]; this.det = this.detQual === 'obj' ? this.det : ''; this.detQual = 'obj';
    const g = mm.g; Efx.fantasma(T, g); ap.cena.add(g); this.fant = g;
    this.modo = 'colocar'; this.sig = '';
    // para ver o objeto no lugar do Filho: a câmera sai para trás e para cima (como no Prop Hunt)
    this.verDeFora(ap);
    if (parede) this.encostarParede(ap);
    this.posFant(ap);
    this.cartao(); this.barra();
  },
  encostarParede(ap) {
    const p = ap.salaNoPonto3D(ap.est.px, ap.est.pz), s = p && ap.mundo.S[p]; if (!s) return;
    const L = [['n', ap.est.pz - s.z0], ['s', s.z1 - ap.est.pz], ['w', ap.est.px - s.x0], ['e', s.x1 - ap.est.px]].sort((a, b) => a[1] - b[1])[0];
    this.parede = { lado: L[0], dist: L[1], s };
    this.rot = { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 }[L[0]];
  },
  limiteDesl() { return 2.5; },
  verDeFora(ap) {
    if (!ap.imersivo(ap.est.modo)) return;
    if (!this.modoAnt) this.modoAnt = ap.est.modo;
    const yaw = ap.est.yaw;
    try { S3().modo('fora'); } catch (e) { return; }
    ap.est.theta = yaw; ap.est.phi = .98; ap.est.r = celular() ? 6.2 : 5.6; ap.est.ax = ap.est.px; ap.est.az = ap.est.pz;
  },
  voltarCamera() { const ap = api3(); if (this.modoAnt && ap && ap.est.modo === 'fora') { try { S3().modo(this.modoAnt); } catch (e) {} } this.modoAnt = ''; },
  mover(x, z) {
    const ap = api3(); if (!ap || !this.fant) return;
    const dx = x - ap.est.px, dz = z - ap.est.pz, d = Math.hypot(dx, dz), L = this.limiteDesl();
    const k = d > L ? L / d : 1; this.desl = [dx * k, dz * k];
    if (d > L) ap.toast(`Dá para ajustar até ${String(L).replace('.', ',')} m do Filho.`);
    this.posFant(ap);
  },
  pontoFant(ap) {
    let x = ap.est.px + this.desl[0], z = ap.est.pz + this.desl[1], y = this.usarAlt ? this.alt : 0;
    if (this.alvo && this.alvo.parede && this.parede) {
      const s = this.parede.s, l = this.parede.lado;
      if (l === 'n') z = s.z0 + .04; else if (l === 's') z = s.z1 - .04; else if (l === 'w') x = s.x0 + .04; else x = s.x1 - .04;
      y = this.alt;
    }
    return { x, y, z };
  },
  posFant(ap) {
    if (!this.fant) return;
    const q = this.pontoFant(ap);
    this.fant.position.set(q.x, q.y, q.z); this.fant.rotation.y = this.rot;
    const ok = this.lugarOk(ap, q);
    Efx.corFantasma(this.fant, ok);
    const bt = $('#disfCard [data-c="ok"]'); if (bt) bt.disabled = !ok;
  },
  lugarOk(ap, q) {
    if (this.alvo && this.alvo.parede) return !!this.parede && this.parede.dist < 3.5;
    const tokX = ap.est.px + this.desl[0], tokZ = ap.est.pz + this.desl[1];
    return !!(ap.mundo.area3D(tokX, tokZ, .05) && (ap.mundo.livre3D(tokX, tokZ) || Math.hypot(this.desl[0], this.desl[1]) < .05));
  },
  girar(s) { const ap = api3(); this.rot += s * Math.PI / 12; if (ap) this.posFant(ap); },
  cartao() {
    const c = $('#disfCard'); if (!c || !this.alvo) return;
    const nomeDet = this.det && DOBJ[this.det] ? DOBJ[this.det][1] : '';
    c.innerHTML = `<div class="disf-linha disf-tit"><b>🎭 ${esc(this.alvo.nome)}</b><button type="button" class="x" data-c="x" aria-label="Cancelar" title="Cancelar (Esc)">✕</button></div>
      <div class="disf-linha"><button type="button" data-c="esq" title="Girar para a esquerda (Q)" aria-label="Girar para a esquerda">⟲</button><button type="button" data-c="dir" title="Girar para a direita (E)" aria-label="Girar para a direita">⟳</button>
        ${!this.alvo.parede && this.alvo.h0 > .3 ? `<button type="button" data-c="alt" title="Na altura original (em cima de algo) ou no chão" aria-pressed="${this.usarAlt}">${this.usarAlt ? '⬆ alto' : '⬇ chão'}</button>` : ''}
        <button type="button" class="pri" data-c="ok" title="Confirmar (Enter)">✔ Virar</button></div>
      <div class="disf-chips" role="group" aria-label="Detalhe errado"><button type="button" data-c="sorteio" class="${nomeDet ? '' : 'on'}">🎲 Sorteio</button>${nomeDet ? `<button type="button" class="on" data-c="lista">✔ ${esc(nomeDet)}</button>` : ''}<button type="button" data-c="lista">Escolher…</button></div>
      <p class="mini">${celular() ? 'Toque no chão perto do Filho para ajustar o lugar.' : 'Clique no chão perto do Filho para ajustar o lugar.'}</p>`;
    c.hidden = false;
    this.posFant(api3());
  },
  cliqueCartao(e) {
    const b = e.target.closest('[data-c]'); if (!b) return;
    const k = b.dataset.c, ap = api3();
    if (k === 'esq') this.girar(1); else if (k === 'dir') this.girar(-1);
    else if (k === 'alt') { this.usarAlt = !this.usarAlt; this.alt = this.usarAlt ? this.alvo.h0 : 0; this.cartao(); }
    else if (k === 'sorteio') { this.det = ''; this.cartao(); }
    else if (k === 'lista') this.abrirPop('detobj');
    else if (k === 'x') this.sair();
    else if (k === 'ok') this.confirmar();
    if (ap && this.fant) this.posFant(ap);
  },
  confirmar() {
    const ap = api3(), f = filhoCtrl(); if (!ap || !f || !this.fant || !this.alvo) return;
    const q = this.pontoFant(ap);
    if (!this.lugarOk(ap, q)) { ap.toast(this.alvo.parede ? 'Chegue mais perto de uma parede.' : 'Esse lugar está ocupado.'); return; }
    // o token vai até o ponto (as regras de movimento valem); o objeto fica onde o token parar
    let tx = ap.est.px + this.desl[0], tz = ap.est.pz + this.desl[1];
    if (Math.hypot(this.desl[0], this.desl[1]) > .05) {
      const pq = ap.plantaDe3D(tx, tz), r = A().moverToken3D(f.id, pq.x, pq.y, true);
      if (!r || !r.ok) { ap.toast((r && r.motivo) || 'Não dá para chegar lá agora.'); return; }
      const [nx, nz] = ap.planta3D(r.x, r.y); tx = nx; tz = nz; ap.est.px = nx; ap.est.pz = nz;
    }
    const ox = this.alvo.parede ? q.x : tx, oz = this.alvo.parede ? q.z : tz, pp = ap.plantaDe3D(ox, oz);
    const ok = virarObjeto(f.id, { x: pp.x, y: pp.y, o: this.alvo.o, cn: this.alvo.cn, i: this.alvo.i, r: this.rot * 180 / Math.PI, h: (this.alvo.parede || this.usarAlt) ? this.alt : 0, p: this.alvo.parede, d: this.det });
    if (!ok) return;
    // quem controla continua vendo de fora, para ver o objeto que virou (volta ao normal quando o disfarce cai)
    this.sair(true);
    Efx.flash();
  },
  depoisDeQuebrar() {
    const ap = api3(); if (!ap) return;
    Efx.flash(); this.voltarCamera();
  },
  limparColocar() {
    if (this.fant) { const ap = api3(); try { this.fant.parent && this.fant.parent.remove(this.fant); } catch (e) {} this.fant = null; }
    this.alvo = null; this.parede = null;
    const c = $('#disfCard'); if (c) { c.hidden = true; c.innerHTML = ''; }
    if (this.modo === 'colocar') this.modo = '';
  },
  tecla(k, id, e) {
    if (!this.modo && !this.pop) return false;
    if (k === 'escape') { if (this.pop) { this.fecharPop(); this.barra(); return true; } if (this.modo) { this.sair(); return true; } return false; }
    if (this.modo === 'colocar') {
      if (k === 'q') { if (!e.repeat) this.girar(1); return true; }
      if (k === 'e') { if (!e.repeat) this.girar(-1); return true; }
      if (k === 'enter') { if (!e.repeat) this.confirmar(); return true; }
    }
    if (this.modo === 'mira' && k === 'enter') return true;
    return false;
  },
  quadro(ap) {
    if (this.modo === 'mira') this.quadroMira(ap);
    if (this.modo === 'colocar' && this.fant) { this.posFant(ap); Efx.pulsoFantasma(this.fant, performance.now() / 1000); }
  },
};

/* =========================================================
   EFEITOS LOCAIS: contorno, fantasma, transformação e quebra
   ========================================================= */
const Efx = {
  contorno(T, obj, cor) {
    obj.updateMatrixWorld(true);
    const g = new T.Group(), lixo = [], mat = new T.LineBasicMaterial({ color: cor, transparent: true, opacity: .95, depthTest: false, depthWrite: false, toneMapped: false }); lixo.push(mat);
    const ms = []; obj.traverse(m => { if (m.isMesh && m.visible !== false && m.geometry) ms.push(m); });
    if (ms.length > 70) {
      const b = new T.Box3().setFromObject(obj), h = new T.Box3Helper(b, new T.Color(cor)); h.material.depthTest = false; h.material.transparent = true; lixo.push(h.geometry, h.material); g.add(h);
    } else ms.forEach(m => { const eg = new T.EdgesGeometry(m.geometry, 32); lixo.push(eg); const l = new T.LineSegments(eg, mat); l.matrixAutoUpdate = false; l.matrix.copy(m.matrixWorld); l.renderOrder = 8; l.raycast = () => {}; g.add(l); });
    const ap = api3(); (Vista.grupo || (ap && ap.cena)).add(g);
    return { pulso: t => { mat.opacity = .65 + .35 * Math.sin(t * 6); }, tirar: () => { try { g.parent && g.parent.remove(g); } catch (e) {} lixo.forEach(x => { try { x.dispose(); } catch (e) {} }); } };
  },
  fantasma(T, g) {
    const mat = guardar(new T.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: .32, depthWrite: false, toneMapped: false }));
    const lin = guardar(new T.LineBasicMaterial({ color: '#ffd23f', transparent: true, opacity: .9, toneMapped: false }));
    const ms = []; g.traverse(m => { if (m.isMesh) ms.push(m); });
    ms.forEach(m => { m.material = mat; m.raycast = () => {}; if (ms.length <= 70 && m.geometry) { const l = new T.LineSegments(guardar(new T.EdgesGeometry(m.geometry, 32)), lin); l.raycast = () => {}; m.add(l); } });
    g.userData.fant = { mat, lin };
  },
  corFantasma(g, ok) { const f = g.userData.fant; if (!f) return; const c = ok ? '#ffd23f' : '#ff4a3a'; f.mat.color.set(c); f.lin.color.set(c); },
  pulsoFantasma(g, t) { const f = g.userData.fant; if (f) f.mat.opacity = .22 + .12 * Math.sin(t * 4); },
  flash() { const ap = api3(); if (!ap || !ap.V || !ap.V.d) return; let fl = $('#disfFlash'); if (!fl) { fl = document.createElement('div'); fl.id = 'disfFlash'; fl.className = 'disf-flash'; ap.V.d.appendChild(fl); } fl.classList.add('on'); clearTimeout(fl._t); fl._t = setTimeout(() => fl.classList.remove('on'), 380); },
  // animações em andamento: { g, t0, dur, fn(k, g), fim() }
  vivas: [],
  escala: 1,   // testes: animações mais lentas para tirar quadros
  animar(g, dur, fn, fim) { this.vivas.push({ g, t0: performance.now(), dur: dur * this.escala, fn, fim }); },
  quadro() {
    const t = performance.now();
    this.vivas = this.vivas.filter(a => { const k = clamp((t - a.t0) / a.dur, 0, 1); try { a.fn(k, a.g); } catch (e) {} if (k >= 1) { try { a.fim && a.fim(); } catch (e) {} return false; } return true; });
  },
  // farelos escuros que voam (a forma falsa se desfazendo)
  farelos(T, pos, cor, n = 14, alto = 1) {
    const g = new T.Group(), geo = guardar(new T.TetrahedronGeometry(.045, 0)), mat = guardar(new T.MeshBasicMaterial({ color: cor, transparent: true, toneMapped: false }));
    const ps = []; for (let i = 0; i < n; i++) { const m = new T.Mesh(geo, mat); m.raycast = () => {}; const a = Math.random() * 6.28; m.userData.v = new T.Vector3(Math.cos(a) * (.6 + Math.random()), 1 + Math.random() * 2, Math.sin(a) * (.6 + Math.random())); m.position.set(0, Math.random() * alto, 0); g.add(m); ps.push(m); }
    g.position.copy(pos); (Vista.grupo).add(g);
    this.animar(g, 1100, k => { ps.forEach(m => { m.position.addScaledVector(m.userData.v, .016); m.userData.v.y -= .06; m.rotation.x += .2; m.rotation.y += .15; }); mat.opacity = 1 - k; }, () => g.parent && g.parent.remove(g));
  },
  // a forma falsa (objeto ou cobaia) se deforma e some; a criatura cresce no lugar
  quebra(g, alturaFarelo) {
    const ap = api3(); if (!ap || !g) return;
    const T = ap.T, w = new T.Vector3(); g.getWorldPosition(w);
    if (!g.parent) Vista.grupo.add(g);
    const s0 = g.scale.clone(), r0 = g.rotation.y, y0 = g.position.y;
    g.traverse(o => { o.raycast = () => {}; });
    this.animar(g, 1150, k => {
      const a = k < .35 ? k / .35 : 1, b = k < .35 ? 0 : (k - .35) / .65;
      const est = 1 + Math.sin(a * Math.PI * 3) * .12 * (1 - b) + a * .35 - b * 1.25;
      g.scale.set(s0.x * (1 + Math.sin(k * 40) * .06 * (1 - b)) * (1 - b * .85), s0.y * Math.max(.02, est), s0.z * (1 + Math.cos(k * 37) * .06 * (1 - b)) * (1 - b * .85));
      g.rotation.y = r0 + Math.sin(k * 23) * .12 * (1 - b) + b * b * 2.4;
      g.position.y = y0 + Math.sin(k * 51) * .02 * (1 - b);
    }, () => { try { g.parent && g.parent.remove(g); } catch (e) {} });
    this.farelos(T, w, '#3a0a10', 16, Math.max(.4, alturaFarelo || 1));
  },
  // a criatura (ou a forma nova) surge crescendo e se esticando
  surgir(g, dur = 1000, atraso = 250) {
    if (!g) return; dur *= this.escala; atraso *= this.escala; const s0 = g.scale.clone(), t0 = performance.now() + atraso;
    g.userData.disfSurgindo = 1;
    this.animar(g, (dur + atraso) / this.escala, () => { const k = clamp((performance.now() - t0) / dur, 0, 1), e = suave(k), st = 1 + Math.sin(k * Math.PI) * .25; g.scale.set(s0.x * Math.max(.05, e), s0.y * Math.max(.05, e) * st, s0.z * Math.max(.05, e)); }, () => { g.scale.copy(s0); delete g.userData.disfSurgindo; });
  },
  // a criatura encolhe torcendo para virar a forma falsa
  sumir(g, dur = 900) {
    const ap = api3(); if (!ap || !g) return;
    if (!g.parent) Vista.grupo.add(g);
    const s0 = g.scale.clone(), r0 = g.rotation.y;
    g.traverse(o => { o.raycast = () => {}; });
    this.animar(g, dur, k => { const e = 1 - suave(k); g.scale.set(s0.x * (e + Math.sin(k * 30) * .05), s0.y * e * (1 + k * .4), s0.z * (e + Math.cos(k * 30) * .05)); g.rotation.y = r0 + k * k * 5; }, () => { try { if (g.parent === Vista.grupo) Vista.grupo.remove(g); } catch (e) {} g.scale.copy(s0); g.rotation.y = r0; });
  },
};

/* =========================================================
   ATENÇÃO E REPARAR (cada aparelho calcula o seu)
   ========================================================= */
const Olhar = {
  alvo: null, desde: 0, vistoEm: 0, tRay: 0, feitos: new Map(),
  // contexto de quem olha: câmera, para onde aponta, lanterna
  ctx(ap) {
    const T = ap.T, f = new T.Vector3(); ap.camera.getWorldDirection(f);
    const luz = !!(ap.V && ap.V.lanterna);
    const cam = ap.camera.position.clone();
    return {
      cam, fwd: f, luz,
      // a lanterna aponta para este grupo? (0 a 1)
      luzEm: (g, alc) => { if (!luz) return 0; const w = new T.Vector3(); g.getWorldPosition(w); w.y += 1.4; const d = w.clone().sub(cam), L = d.length(); if (L > alc) return 0; const c = d.normalize().dot(f); return c > .94 ? clamp((c - .94) / .05, 0, 1) * clamp((alc - L) / 3, 0, 1) : 0; },
    };
  },
  // atenção de um disfarce: de perto (2,5 m) mirando por ~1,5 s, ou com a lanterna em cima
  atencao(ap, ent, cx, dt) {
    if (!ent.g || !ent.g.parent) return;
    const T = ap.T, w = new T.Vector3(); ent.g.getWorldPosition(w); w.y += ent.alt || .6;
    const d = w.distanceTo(cx.cam), dir = w.clone().sub(cx.cam).normalize(), ang = Math.acos(clamp(dir.dot(cx.fwd), -1, 1)), larg = Math.atan2(ent.raio || .5, Math.max(.1, d)) + .03;
    const mirando = d < 2.6 && ang < larg;
    const luz = cx.luz && d < 4.5 && ang < .42;
    const sobe = mirando ? 1 / 1.5 : luz ? 1 / 2.2 : 0;
    ent.at = clamp(ent.at + (sobe ? sobe * dt : -dt * .45), 0, 1);
    if (d > 7) ent.at = Math.max(0, ent.at - dt);
  },
  // o que está na mira de perto (qualquer objeto da sala, qualquer cobaia, ou um disfarce)
  mira(ap) {
    const T = ap.T, ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2(0, 0), ap.camera); ray.far = 2.7;
    const L = [];
    const p = ap.salaNoPonto3D(ap.est.px, ap.est.pz), c = p && ap.mundo.carregadas.get(p);
    // só o que está perto (o centro de cada móvel fica guardado): menos raios no celular
    const cam = ap.camera.position;
    if (c && !c.extra) c.g.children.forEach(o => {
      if (!o.userData || !o.userData.t || o.visible === false || NAO_COPIA.test(o.userData.t)) return;
      if (!o.userData.disfC) { const b = new T.Box3().setFromObject(o); if (b.isEmpty()) return; const sz = b.getSize(new T.Vector3()); o.userData.disfC = [b.getCenter(new T.Vector3()), sz.length() / 2]; }
      const [ctr, rr] = o.userData.disfC; if (ctr.distanceTo(cam) - rr < 2.8) L.push(o);
    });
    REG.obj.forEach(e => { if (e.g && e.g.parent) L.push(e.g); });
    ap.tok.mapa.forEach((o, id) => { if (id !== ap.V.ctrl && o.t.g.visible) L.push(o.t.g); });
    const hits = ray.intersectObjects(L, true);
    for (const h of hits) {
      let o = h.object; while (o && !L.includes(o)) o = o.parent; if (!o) continue;
      if (o.userData.disfEnt) return { k: 'ob:' + o.userData.disfEnt.k, nome: o.userData.disfEnt.nome, ent: o.userData.disfEnt, tipo: 'obj' };
      const tid = [...ap.tok.mapa.entries()].find(([, x]) => x.t.g === o);
      if (tid) { const tk = tokens()[tid[0]]; if (!tk) return null; const tp = tipoDe(tk); if (tp !== 'cobaia' && !(tp === 'filho' && tk.cp)) return null; return { k: 'tk:' + tid[0], nome: nomeTk(tk), tipo: 'cob', id: tid[0], ent: REG.cob.get(tid[0]) || null }; }
      const inter = !!(o.userData.int || o.userData.esc || o.userData.uso);
      return { k: `c${ap.mundo.S[p].cn}:${o.userData.i}`, nome: nomeTipo(o.userData.t), tipo: 'obj', inter };
    }
    return null;
  },
  quadro(ap, dt) {
    const bt = $('#disfRep');
    const jog = euJog() && ap.V.ctrl === euJog();
    if (!jog || ap.V.escondido || !ap.primeiraP(ap.est.modo) && ap.est.modo !== 'jogo') { if (bt && !bt.hidden) bt.hidden = true; this.alvo = null; return; }
    this.tRay -= dt; if (this.tRay > 0) return; this.tRay = .15;
    const m = this.mira(ap), t = performance.now();
    if (!m) { if (this.alvo && t - this.vistoEm > 350) { this.alvo = null; } }
    else { if (!this.alvo || this.alvo.k !== m.k) { this.alvo = m; this.desde = t; } this.alvo = { ...m }; this.vistoEm = t; }
    const pronto = this.alvo && t - this.desde > 1500;
    if (bt) {
      if (pronto) { const txt = `🔍 Reparar: ${this.alvo.nome}`; if (bt.dataset.t !== txt) { bt.dataset.t = txt; bt.innerHTML = `${esc(txt)}${celular() || this.alvo.inter ? '' : '<kbd>E</kbd>'}`; } bt.hidden = false; }
      else bt.hidden = true;
    }
  },
  podeTecla() { const bt = $('#disfRep'); return !!(bt && !bt.hidden && this.alvo && !this.alvo.inter); },
  // o teste do livro: Percepção contra a DT de Examinar (objeto) ou Intuição contra a Enganação (cobaia)
  reparar() {
    const ap = api3(), al = this.alvo, eu = euJog(); if (!ap || !al || !eu) return;
    const ult = this.feitos.get(al.k) || 0;
    if (agora() - ult < 20000) { ap.toast('Você acabou de reparar nisso. Espere um pouco.'); return; }
    const at = FX() && FX().ativa && FX().ativa(); if (!at) { ap.toast('Ative a sua ficha (★ em Fichas) para rolar.'); return; }
    this.feitos.set(al.k, agora());
    const tk = tokens()[eu], pS = salaP(tk); if (!tk || !pS) { ap.toast('Entre na sala para reparar.'); return; }
    const cn = I().cnDe(tk.a, pS);
    let t, ok, linha, msg, achou = false;
    if (al.tipo === 'cob') {
      t = FX().testarPericia(at.d, 'intuicao');
      const ex = String((pub().cfg || {}).eng || '1d20'), mm = /^(\d+)d20\s*([+-]\s*\d+)?$/i.exec(ex.replace(/\s/g, ''));
      const op = mm ? FX().rolarTeste(int(mm[1]), int(mm[2] || 0)) : FX().rolarTeste(1, 0);
      const falsa = !!(al.id && (tokens()[al.id] || {}).cp);
      ok = t.total > op.total; linha = `Intuição <b>${t.total}</b> contra <b>${op.total}</b>: <b>${ok ? 'passou' : 'falhou'}</b>`;
      if (ok && falsa) { achou = true; const ent = REG.cob.get(al.id); msg = `Essa pessoa tem algo errado${ent && DCOB[ent.det] ? ': ' + DCOB[ent.det][2] : ''}.`; if (ent) ent.forc = 1; }
      else msg = ok ? 'Nada parece errado.' : 'Você não percebe nada de estranho.';
    } else {
      t = FX().testarPericia(at.d, 'percepcao');
      const dt = int((pub().cfg || {}).dtEx);
      ok = dt ? t.total >= dt : null;
      linha = dt ? `Percepção <b>${t.total}</b> contra DT ${dt}: <b>${ok ? 'passou' : 'falhou'}</b>` : `Percepção <b>${t.total}</b>`;
      const ent = al.ent;
      if (ok && ent) { achou = true; ent.forc = 1; msg = `Esse objeto tem algo errado: ${DOBJ[ent.det] ? DOBJ[ent.det][2] : 'um detalhe que não devia estar ali'}.`; }
      else msg = ok ? 'Nada de errado com isso.' : ok === false ? 'Você não nota nada de estranho.' : 'Você repara com atenção. O Mestre dirá se encontrou algo.';
    }
    if (achou) { const ent = al.tipo === 'cob' ? REG.cob.get(al.id) : al.ent; if (ent) Vista.realce(ent); }
    this.resultado(al.tipo === 'cob' ? 'DESCONFIAR' : 'REPARAR', t, linha, msg, achou);
    A().Rede.push('filAcoes', { s: eu, t: 'reparar', a: tk.a, cn, v: t.total, ts: agora(), o: String(al.k).slice(0, 40), ok: !!ok }).pronto.catch(() => {});
    try { I().postarRolagemSecreta(`${SERd(eu).nome} reparou em ${al.nome} (CN ${pad2(cn)}): ${al.tipo === 'cob' ? 'Intuição' : 'Percepção'} ${t.total}`); } catch (e) {}
  },
  resultado(tit, t, linha, msg, achou) {
    const ap = api3(); if (!ap || !ap.V || !ap.V.d) return;
    let r = $('#disfRes'); if (!r) { r = document.createElement('div'); r.id = 'disfRes'; r.className = 'disf-res'; r.setAttribute('aria-live', 'polite'); ap.V.d.appendChild(r); }
    r.className = 'disf-res' + (achou ? ' achou' : '');
    r.innerHTML = `<b>🔍 ${esc(tit)}</b>${t && t.dados ? `<div class="dados">${t.dados.map(x => `<span class="${x === t.esc ? 'usada' : ''}">${x}</span>`).join('')}</div>` : ''}<div>${linha}</div><span class="msg">${esc(msg)}</span>`;
    r.hidden = false; clearTimeout(r._t); r._t = setTimeout(() => { r.hidden = true; }, achou ? 6000 : 4200);
  },
};

/* =========================================================
   A VISTA 3D (extensão do sala3d.js)
   ========================================================= */
const Vista = {
  ap: null, grupo: null, forcarK: null, forcarAndar: false,
  iniciar(ap) {
    estilo();
    this.ap = ap; const T = ap.T;
    this.grupo = new T.Group(); this.grupo.name = 'disfarce'; ap.cena.add(this.grupo);
    this.tokAnt = new Map(); this.obAnt = new Map(); this.sumidos = []; this.crescer = []; this.cresc = new Map(); this.primeiro = true; this.sinalVisto = new Map(); this.realces = [];
    const d = ap.V.d;
    if (d) {
      ['disfBarra', 'disfPop', 'disfCard', 'disfMira', 'disfMiraTxt', 'disfRep', 'disfRes', 'disfFlash'].forEach(id => { const x = $('#' + id); if (x) x.remove(); });
      const b = document.createElement('div'); b.id = 'disfBarra'; b.className = 'disf-barra'; b.hidden = true; b.setAttribute('role', 'toolbar'); b.setAttribute('aria-label', 'Disfarce');
      b.addEventListener('click', e => { const x = e.target.closest('[data-disf]'); if (x) Ctrl.botao(x.dataset.disf); });
      const pop = document.createElement('div'); pop.id = 'disfPop'; pop.className = 'disf-pop'; pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Disfarce');
      pop.addEventListener('click', e => Ctrl.cliquePop(e));
      const c = document.createElement('div'); c.id = 'disfCard'; c.className = 'disf-card'; c.hidden = true; c.setAttribute('role', 'group'); c.setAttribute('aria-label', 'Colocar o objeto');
      c.addEventListener('click', e => Ctrl.cliqueCartao(e));
      const m = document.createElement('div'); m.id = 'disfMira'; m.className = 'disf-mira'; m.hidden = true; m.setAttribute('aria-hidden', 'true');
      const mt = document.createElement('div'); mt.id = 'disfMiraTxt'; mt.className = 'disf-mira-txt'; mt.hidden = true;
      const rp = document.createElement('button'); rp.type = 'button'; rp.id = 'disfRep'; rp.className = 'disf-rep'; rp.hidden = true;
      rp.addEventListener('click', e => { e.stopPropagation(); Olhar.reparar(); });
      d.append(b, pop, c, m, mt, rp);
      document.addEventListener('pointerdown', this.fora, true);
    }
  },
  fora(e) {
    const pop = $('#disfPop'); if (!pop || pop.hidden) return;
    if (e.target.closest('#disfPop') || e.target.closest('#disfBarra') || e.target.closest('#disfCard') || e.target.closest('.s3d-hab')) return;
    Ctrl.fecharPop(); Ctrl.barra();
  },
  fechar() {
    const ap = this.ap; if (!ap) return;
    Ctrl.sair();
    try { ap.cena.remove(this.grupo); } catch (e) {}
    ['disfBarra', 'disfPop', 'disfCard', 'disfMira', 'disfMiraTxt', 'disfRep', 'disfRes', 'disfFlash'].forEach(id => { const x = $('#' + id); if (x) x.remove(); });
    document.removeEventListener('pointerdown', this.fora, true);
    REG.obj.clear(); REG.cob.forEach(e => this.tirarCob(e)); REG.cob.clear();
    Efx.vivas = [];
    LIXO.splice(0).forEach(x => { try { x.dispose(); } catch (e) {} });
    TX.forEach(t => { try { t.dispose(); } catch (e) {} }); TX.clear();
    this.ap = null; this.grupo = null;
  },
  // sala3d.js chamou modelo(): um objeto novo apareceu (a animação vem no próximo quadro, pela correlação)
  objNovo(ent) { ent.novo = true; },
  realce(ent) {
    const ap = this.ap; if (!ap) return;
    const alvo = ent.tipo === 'obj' ? ent.g : ent.t && ent.t.g; if (!alvo) return;
    const c = Efx.contorno(ap.T, alvo, '#9fd8ff'), t0 = performance.now();
    this.realces.push({ c, t0 });
  },
  quadro(dt0, tt) {
    const ap = this.ap; if (!ap || !ap.V) return;
    const tw = performance.now() / 1000, dt = Math.min(.1, Math.max(0, tw - (this.tw || tw))); this.tw = tw;
    const cx = Olhar.ctx(ap), gm = souGM();
    this.correlacionar(ap);
    // objetos disfarçados: atenção + detalhes
    REG.obj.forEach((e, k) => {
      if (!e.g.parent || e.g.parent === this.grupo) { this.tirarRisco(e); REG.obj.delete(k); return; }
      if (e.det === 'duplic') this.riscoNoOriginal(ap, e);
      Olhar.atencao(ap, e, cx, dt);
      const kk = Vista.forcarK != null ? Vista.forcarK : e.forc ? 1 : gm ? Math.max(e.at, .55) : e.at;
      e.ticks.forEach(f => { try { f(dt, tt, kk, cx); } catch (er) {} });
      if (opc('sinal')) this.sinal(ap, e, 'ob:' + k, tt);
    });
    // cobaias copiadas: o detalhe no token (jogadores) ou a figura por cima da criatura (Mestre e auxiliares)
    this.copias(ap, cx, dt, tt, gm);
    // Filho em Forma de Objeto: o Mestre e quem controla veem só o anel e o nome (o objeto fala por ele); o auxiliar que não
    // controla (e o teste "ocultarFo") vê só o objeto clonado, sem anel, sombra, nome ou seleção. Os jogadores nem recebem o token.
    if (gm) ap.tok.mapa.forEach((o, id) => {
      const tk = tokens()[id]; const fo = !!(tk && tk.fo && !o.t.g.userData.disfSurgindo && !o.t.g.userData.disfSumindo);
      const limpo = fo && (this.ocultarFo || (souAux() && meuCtrl() !== id));
      // o perseg3d.js e o sala3d.js reacendem a base, a sombra e o nome a cada quadro: some pela escala
      [o.t.base, o.nome, o.t.g.userData.momSombra].forEach(x => { if (x) { const e = limpo ? .0001 : 1; if (x.userData.disfEsc0 === undefined) x.userData.disfEsc0 = x.scale.clone(); if (limpo) x.scale.setScalar(e); else if (x.userData.disfLimpo) x.scale.copy(x.userData.disfEsc0); x.userData.disfLimpo = limpo; } });
      const ch0 = fo + ':' + limpo; if (o.disfFo !== ch0) { o.disfFo = ch0; o.t.g.children.forEach(ch => { if (ch !== o.t.base && ch !== o.nome && ch !== o.t.g.userData.momSombra && !ch.userData.disfOv) ch.visible = !fo; }); }
    });
    Ctrl.quadro(ap);
    Olhar.quadro(ap, dt);
    Efx.quadro(); this.quadroCresc(ap);
    this.realces = this.realces.filter(r => { const k = (performance.now() - r.t0) / 2600; r.c.pulso(performance.now() / 1000); if (k >= 1) { r.c.tirar(); return false; } return true; });
    this.tBarra = (this.tBarra || 0) - dt; if (this.tBarra <= 0) { this.tBarra = .25; Ctrl.barra(); }
  },
  // "Sinal periódico" (regra da casa): um tremor curto e um som, de tempos em tempos (mesmo ritmo em todo aparelho)
  sinal(ap, e, chave, tt) {
    const per = 70 + hashS(chave) % 40, n = Math.floor(agora() / 1000 / per);
    const ult = this.sinalVisto.get(chave);
    if (ult === undefined) { this.sinalVisto.set(chave, n); return; }
    if (n !== ult) {
      this.sinalVisto.set(chave, n);
      const g = e.g || (e.t && e.t.g); if (!g) return;
      const r0 = g.rotation.z, t0 = performance.now();
      Efx.animar(g, 600, k => { g.rotation.z = r0 + Math.sin(k * 40) * .03 * (1 - k); }, () => { g.rotation.z = r0; });
      const w = new ap.T.Vector3(); g.getWorldPosition(w); const q = ap.plantaDe3D(w.x, w.z); somSinal(ap.a, q.x, q.y);
    }
  },

  // "Duplicata": o original da sala ganha o mesmo arranhão do disfarce (enquanto o disfarce existir)
  riscoNoOriginal(ap, e) {
    const ob = e.ob, rs = e.g.userData.disfRisco; if (!rs || typeof ob.cn !== 'number' || ob.a !== ap.a) return;
    const p = ob.cn - 25 * (ap.a - 1), c = ap.mundo.carregadas.get(p);
    const o = c && c.g.children.find(x => x.userData && x.userData.i === ob.i && x.userData.t);
    if (!o) { if (e.riscoOrig && e.riscoOrig.o !== o) this.tirarRisco(e); return; }
    if (e.riscoOrig && e.riscoOrig.o === o) return;
    this.tirarRisco(e);
    const T = ap.T, sc = o.scale.x || 1, me = new T.Mesh(guardar(new T.PlaneGeometry(rs.w / sc, rs.w * .5 / sc)), matBasico(T, { map: texRisco(T), opacity: .9, color: rs.cor || '#ffffff' }));
    me.position.copy(rs.fx).multiplyScalar(1 / sc).add(rs.n.clone().multiplyScalar(.004 / sc));
    me.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), rs.n.clone().normalize()); me.raycast = () => {}; me.userData.disfDeco = 1; me.renderOrder = 2;
    o.add(me); e.riscoOrig = { o, me };
  },
  tirarRisco(e) { if (e.riscoOrig) { try { e.riscoOrig.o.remove(e.riscoOrig.me); } catch (er) {} e.riscoOrig = null; } },

  /* ---------- cópias ---------- */
  copias(ap, cx, dt, tt, gm) {
    const vistos = new Set();
    ap.tok.mapa.forEach((o, id) => {
      const tk = tokens()[id]; if (!tk || tipoDe(tk) !== 'filho' || !tk.cp || !SERd(tk.cp)) return;
      const det = tk.cpd || '';
      vistos.add(id);
      let e = REG.cob.get(id);
      if (e && (e.o !== o || e.cp !== tk.cp || e.det !== det)) { this.tirarCob(e); REG.cob.delete(id); e = null; }
      if (!e) {
        e = { tipo: 'cob', id, o, cp: tk.cp, det, at: 0, forc: 0, raio: .45, alt: .9, ticks: [] };
        if (gm) {
          // Mestre e auxiliares: a miniatura da cobaia por cima da criatura (o que os jogadores veem), com um aro roxo
          const F = ap.fabrica(); let t = null; try { t = NS().criarToken(F, 'disf-' + id, SERd(tk.cp)); } catch (er) {}
          if (t) {
            t.g.userData.disfOv = 1; t.g.traverse(x => { x.userData.token = id; });
            if (det === 'espelho') t.g.scale.x = -1;
            if (det === 'aro' && t.aro && t.aro.material.emissive) t.aro.material.emissive.copy(tomOutro(t.aro.material.emissive));
            o.t.g.add(t.g); e.ov = t;
            // a base e o anel ficam os da cobaia (o que os jogadores veem); o nome continua o do Filho
            e.esc = []; o.t.g.children.forEach(ch => { if (ch !== t.g && ch !== o.nome && ch !== o.t.g.userData.momSombra && ch.visible) { ch.visible = false; e.esc.push(ch); } });
          }
        }
        const alvo = e.ov || o.t;
        e.t = alvo; e.ticks = decorarCobaia(ap.T, alvo, det, id + tk.cp);
        REG.cob.set(id, e);
      }
      const andando = !!(Vista.forcarAndar || o.andando > 0);
      if (e.ov) e.ov.anim(dt, tt, andando); else if (Vista.forcarAndar) o.t.anim(dt, tt, true);
      Olhar.atencao(ap, { get g() { return e.t.g; }, alt: .9, raio: .45, get at() { return e.at; }, set at(v) { e.at = v; } }, cx, dt);
      const kk = Vista.forcarK != null ? Vista.forcarK : e.forc ? 1 : gm ? Math.max(e.at, .55) : e.at;
      e.ticks.forEach(f => { try { f(dt, tt, kk, cx, andando); } catch (er) {} });
      if (opc('sinal')) this.sinal(ap, e, 'tk:' + id, tt);
    });
    REG.cob.forEach((e, id) => { if (!vistos.has(id)) { this.tirarCob(e); REG.cob.delete(id); } });
  },
  tirarCob(e) {
    if (e.ov) { try { e.ov.g.parent && e.ov.g.parent.remove(e.ov.g); } catch (er) {} (e.esc || []).forEach(ch => { ch.visible = true; }); e.ov = null; }
  },

  /* ---------- transformações vistas por todos (pela mudança no estado, sem caminho novo no Firebase) ---------- */
  correlacionar(ap) {
    const T = ap.T, t = performance.now(), gm = souGM();
    const atual = new Map();
    ap.tok.mapa.forEach((o, id) => { const tk = tokens()[id]; if (!tk) return; atual.set(id, { o, g: o.t.g, x: o.x, z: o.z, filho: tipoDe(tk) === 'filho', fo: !!tk.fo, cp: tk.cp || '', apk: o.ap || '', ov: (REG.cob.get(id) || {}).ov || null }); });
    const obs = new Map(); REG.obj.forEach((e, k) => { if (e.g.parent && e.g.parent !== this.grupo) obs.set(k, e); });
    if (this.primeiro) { this.primeiro = false; this.tokAnt = atual; this.obAnt = obs; return; }
    // tokens que sumiram neste quadro (para o jogador, o Filho que virou objeto some do mapa público)
    this.tokAnt.forEach((a, id) => { if (!atual.has(id) && a.filho) this.sumidos.push({ ...a, id, t }); });
    this.sumidos = this.sumidos.filter(s => t - s.t < 2500);
    // objeto novo: perto de um Filho que acabou de sumir (jogador) ou que acabou de virar objeto (Mestre)
    obs.forEach((e, k) => {
      const velho = this.obAnt.get(k);
      if (velho && velho !== e) { Efx.quebra(velho.g, velho.alt * 2); Efx.surgir(e.g, 900, 450); return; }
      if (velho) return;
      const w = new T.Vector3(); e.g.getWorldPosition(w);
      const viz = (x, z) => Math.hypot(x - w.x, z - w.z) < 2.2;
      let fonte = null;
      const i = this.sumidos.findIndex(s => viz(s.x, s.z)); if (i >= 0) fonte = this.sumidos.splice(i, 1)[0];
      if (!fonte && gm) atual.forEach((a, id) => { const ant = this.tokAnt.get(id); if (a.filho && a.fo && ant && !ant.fo && viz(a.x, a.z)) fonte = { ...a, id, gm: true }; });
      if (fonte) {
        if (!fonte.gm) { fonte.g.position.set(fonte.x, 0, fonte.z); Efx.sumir(fonte.g, 900); }
        else { const g = fonte.g, s0 = g.scale.clone(); g.userData.disfSumindo = 1; Efx.animar(g, 850, k => { const e2 = 1 - suave(k) * .9; g.scale.set(s0.x * e2, s0.y * e2, s0.z * e2); }, () => { g.scale.copy(s0); delete g.userData.disfSumindo; }); }
        Efx.surgir(e.g, 900, 350);
        Efx.farelos(T, w, '#6a1620', 10, 1);
      }
    });
    // objeto que sumiu: a forma falsa se deforma (a criatura aparece no lugar)
    this.obAnt.forEach((e, k) => {
      if (obs.has(k)) return;
      const w = new T.Vector3(); e.g.getWorldPosition(w);
      // longe da câmera não anima (ninguém vê)
      if (w.distanceTo(ap.camera.position) > 30) return;
      Efx.quebra(e.g, e.alt * 2);
      this.crescer.push({ x: w.x, z: w.z, t });
    });
    // cópia que começou ou acabou: a miniatura troca com uma deformação
    atual.forEach((a, id) => {
      const ant = this.tokAnt.get(id); if (!ant || !a.filho) return;
      // a aparência mudou (jogadores: a miniatura foi refeita pelo sala3d.js, cobaia ↔ criatura; Mestre: a figura por cima entrou ou saiu)
      if (!gm && ant.apk !== a.apk && ant.g && ant.g !== a.g) { ant.g.position.set(ant.x, 0, ant.z); ant.g.rotation.y = a.g.rotation.y; Efx.quebra(ant.g, 1.7); this.crescerTok(id, 900, 300); }
      if (gm && !!ant.ov !== !!a.ov) {
        if (ant.ov) { const g = ant.ov.g; g.parent && g.parent.remove(g); g.position.set(a.x, 0, a.z); g.rotation.y = a.g.rotation.y; g.scale.copy(a.g.scale); Efx.quebra(g, 1.7); this.crescerTok(id, 900, 300); }
        else { Efx.surgir(a.ov.g, 900, 200); Efx.farelos(T, new T.Vector3(a.x, 0, a.z), '#6a1620', 10, 1.6); }
      }
      // Mestre: saiu da Forma de Objeto (o token continua no mapa dele)
      if (gm && ant.fo && !a.fo) this.crescer.push({ x: a.x, z: a.z, t, id });
    });
    // a criatura cresce onde o disfarce caiu (o token aparece nos jogadores quando a tela do Mestre publica)
    this.crescer = this.crescer.filter(c => {
      if (t - c.t > 4000) return false;
      for (const [id, a] of atual) {
        if (!a.filho || a.fo || a.cp) continue;
        const novo = !this.tokAnt.has(id) || (c.id === id);
        if (novo && Math.hypot(a.x - c.x, a.z - c.z) < 2.2) { this.crescerTok(id, 950, c.id ? 380 : 120); return false; }
      }
      return true;
    });
    this.tokAnt = atual; this.obAnt = obs;
  },

  // a criatura (ou a forma nova) cresce no lugar; segue o token mesmo que o sala3d.js refaça a miniatura no meio
  crescerTok(id, dur, atraso) { this.cresc.set(id, { t0: performance.now() + atraso * Efx.escala, dur: dur * Efx.escala, g: null, s0: null }); },
  quadroCresc(ap) {
    const t = performance.now();
    this.cresc.forEach((c, id) => {
      const o = ap.tok.mapa.get(id); if (!o) { if (t - c.t0 > c.dur + 4000) this.cresc.delete(id); return; }
      if (c.g !== o.t.g) { if (c.g && c.s0) c.g.scale.copy(c.s0); c.g = o.t.g; c.s0 = o.t.g.scale.clone(); }
      const k = clamp((t - c.t0) / c.dur, 0, 1), e = Math.max(.05, suave(k)), st = 1 + Math.sin(k * Math.PI) * .25;
      c.g.userData.disfSurgindo = k < 1 ? 1 : 0;
      c.g.scale.set(c.s0.x * e, c.s0.y * e * st, c.s0.z * e);
      if (k >= 1) { c.g.scale.copy(c.s0); delete c.g.userData.disfSurgindo; this.cresc.delete(id); }
    });
  },

  /* ---------- ganchos do sala3d.js ---------- */
  tocar(ray, mira) { return Ctrl.tocar(ray, mira); },
  tecla(k, id, e) {
    if (!this.ap) return false;
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (Ctrl.tecla(k, id, e)) return true;
    if (id === 'interagir' && Olhar.podeTecla()) { if (!e.repeat) Olhar.reparar(); return true; }
    return false;
  },
  menu(add) {
    const f = filhoCtrl(); if (!f) return;
    if (f.tk.fo || f.tk.cp) add('↩', 'Voltar à forma', () => quebrar(f.id, 'voltou'), 'desfaz o disfarce');
    if (f.obj) add('🪑', f.tk.fo ? 'Trocar de objeto' : 'Virar um objeto', () => Ctrl.entrarMira(), 'modo Disfarce');
    if (f.cop) add('🧍', 'Virar uma cobaia', () => Ctrl.abrirPop('cobaia'), 'a cópia');
  },
  // painel do token escolhido (Mestre): quebrar o disfarce de quem está disfarçado
  painelToken(id) {
    const tk = tokens()[id]; if (!tk || tipoDe(tk) !== 'filho' || !(tk.fo || tk.cp) || !souGM()) return '';
    return `<p class="mini">🎭 Disfarçado: ${tk.fo ? 'objeto (' + esc(tk.fo) + ')' : 'cópia de ' + esc((SERd(tk.cp) || {}).nome || '')}</p><div class="s3d-op"><button type="button" data-disf-quebrar="${esc(id)}">💥 Revelar o disfarce</button></div>`;
  },
  ligarPainel(p, id) { const b = p.querySelector('[data-disf-quebrar]'); if (b) b.onclick = () => quebrar(b.dataset.disfQuebrar, 'revelado'); },
};

// som do "Sinal periódico": um estalo e um assobio curtos, de onde está o disfarce
function somSinal(a, x, y) {
  const M = MOM(); if (!M || !M.Aud) return;
  const Aud = M.Aud; Aud.preparar(); if (!Aud.ok()) return;
  const ap = api3(), mu = (A().geo && A().geo.M_POR_UNID) || 1; if (!ap || ap.a !== a) return;
  const c = ap.camera, f = new ap.T.Vector3(); c.getWorldDirection(f);
  Aud.ouvinte(c.position.x, c.position.y, c.position.z, f.x, f.z);
  const [X, Z] = ap.planta3D(x, y), q = ap.plantaDe3D(c.position.x, c.position.z), dist = Math.hypot(q.x - x, q.y - y) * mu;
  if (dist > 18) return;
  const T0 = Aud.ctx.currentTime, p = Aud.panner(X, 1, Z, 1.6);
  Aud.ruido(T0, p, { bp: 1800, q: 6, v: .16, ataque: .005, dur: .09 });
  Aud.tom(T0 + .1, p, { f: 1500, f2: 2100, v: .05, ataque: .03, dur: .32 });
  Aud.tom(T0 + .46, p, { f: 2100, f2: 1300, v: .05, ataque: .03, dur: .36 });
  setTimeout(() => { try { p.disconnect(); } catch (e) {} }, 3000);
  if (lsG('acf-sons-legendas', false)) avisar('[um estalo e um assobio baixo, perto]');
}

/* =========================================================
   TELA DO MESTRE: ataque e PV caindo desfazem o disfarce; o objeto segue o token
   ========================================================= */
const Vigia = {
  fx: new Map(), pv: new Map(), subs: new Map(), ultSinc: 0,
  rodar() {
    if (!A() || !souGM() || (I() && I().espiar)) return;
    const tks = tokens();
    Object.entries(tks).forEach(([id, tk]) => {
      if (!tk || tipoDe(tk) !== 'filho') return;
      const fts = tk.fx && tk.fx.t === 'atk' ? tk.fx.ts || 0 : 0, ant = this.fx.get(id);
      this.fx.set(id, fts);
      // atacou disfarçado: o disfarce cai (tela do Mestre, ou quem controla o Filho)
      if ((tk.fo || tk.cp) && ant !== undefined && fts > ant && agora() - fts < 15000 && souMestre()) quebrar(id, 'atacou');
    });
    if (!souMestre()) return;
    // PV da ficha do Filho caindo enquanto disfarçado: foi acertado
    const disf = new Set(Object.values(tks).filter(t => t && tipoDe(t) === 'filho' && (t.fo || t.cp)).map(t => t.s));
    disf.forEach(s => {
      if (this.subs.has(s) || !FX() || !FX().fichasDoFilho) return;
      this.subs.set(s, FX().fichasDoFilho(s, lista => {
        lista.forEach(f => {
          const d = f.d || {}, pvA = d.pv && d.pv.a !== undefined && d.pv.a !== '' ? int(d.pv.a) : int(d.pvMax), k = s + ':' + f.chave, ant = this.pv.get(k);
          this.pv.set(k, pvA);
          if (ant !== undefined && pvA < ant) Object.entries(tokens()).forEach(([id, tk]) => { if (tk && tk.s === s && (tk.fo || tk.cp)) quebrar(id, 'acertado'); });
        });
      }));
    });
    this.subs.forEach((off, s) => { if (!disf.has(s)) { try { off(); } catch (e) {} this.subs.delete(s); [...this.pv.keys()].forEach(k => { if (k.startsWith(s + ':')) this.pv.delete(k); }); } });
    // o objeto acompanha o token (regra "só se move quando ninguém olha", ou o Mestre arrastou no mapa)
    if (agora() - this.ultSinc > 600) {
      this.ultSinc = agora();
      Object.entries(ef().obj || {}).forEach(([id, k]) => {
        const tk = tks[id], ob = (pub().ob || {})[k]; if (!tk || !tk.fo || !ob || ob.p) return;
        if (Math.hypot(ob.x - tk.x, ob.y - tk.y) > .04 || ob.a !== tk.a) A().definir(['fil', 'ob', k], { ...ob, a: tk.a, x: tk.x, y: tk.y });
      });
    }
  },
};

/* =========================================================
   MESTRE: as opções num lugar só (painel Filhos, aba Segredos)
   ========================================================= */
function blocoMestre() {
  const pai = $('#blocoFilhosM'); let b = $('#disfCfgM');
  if (!souMestre() || !pai || pai.hidden || (I() && I().espiar)) { if (b) b.hidden = true; return; }
  if (!b || b.parentNode !== pai) { if (b) b.remove(); b = document.createElement('div'); b.id = 'disfCfgM'; b.className = 'disf-cfg'; pai.appendChild(b); }
  b.hidden = false;
  if (b.contains(document.activeElement) && document.activeElement.matches('input')) return;
  const chip = (k, txt) => `<label class="chave"><input type="checkbox" data-dc="${k}" ${opc(k) ? 'checked' : ''}><span>${txt}</span></label>`;
  const html = `<h3>🎭 Disfarce no 3D</h3>
    <p class="mini">Forma de Objeto e cópia: no Controle do Filho, o modo Disfarce copia qualquer modelo da sala ou qualquer cobaia, sempre com um detalhe errado que só se vê de perto. Os jogadores têm "🔍 Reparar" (Percepção contra a DT de Examinar; Intuição contra a Enganação).</p>
    ${chip('estudo', 'Exigir Estudar (ficha): só copia a cobaia estudada')}
    <p class="mini">Regras da casa (inspiradas no Prop Hunt), desligadas por padrão:</p>
    ${chip('sinal', 'Sinal periódico: de tempos em tempos o disfarce estala e assobia baixo')}
    ${chip('olhar', 'Só se move quando ninguém olha: em forma de objeto, anda se nenhuma cobaia da sala estiver olhando')}
    ${chip('custo', 'Trocar de objeto custa a vez (na perseguição, só na vez dele e gasta o resto)')}`;
  if (b.dataset.h === html) return;
  b.dataset.h = html; b.innerHTML = html;
  $$('[data-dc]', b).forEach(i => i.onchange = () => { const k = i.dataset.dc; A().definir(['cfg', 'disf', k], i.checked === PAD[k] ? null : i.checked); });
}

/* =========================================================
   LIGAÇÃO
   ========================================================= */
let ag = null;
function tudo() { try { Vigia.rodar(); blocoMestre(); } catch (e) { console.warn('disfarce:', e); } }
function agendar() { if (ag) return; ag = setTimeout(() => { ag = null; tudo(); }, 150); }
function iniciar() {
  if (!window.ACF || !window.ACF._int || !window.ACF.aoMudar) { setTimeout(iniciar, 200); return; }
  estilo();
  // os detalhes novos das cobaias também entram na escolha do Mestre (Editor do Filho, "Detalhe da cópia")
  const D = FIL() && FIL().DETALHES;
  if (D && !D.some(d => d[0] === 'pisca')) { const v = D.find(d => d[0] === ''); if (v) v[1] = '🎲 Sorteio no 3D (padrão)'; DET_COB.filter(d => !d[3].ficha).forEach(d => D.push([d[0], d[1] + ' (3D)'])); }
  A().aoMudar(agendar);
  document.addEventListener('acf-perfil', () => setTimeout(tudo, 80));
  document.addEventListener('acf-segredos', agendar);
  setInterval(tudo, 1000);
  // o painel dos Filhos se redesenha inteiro: as opções voltam logo
  const vig = new MutationObserver(() => { const pai = $('#blocoFilhosM'); if (pai && !$('#disfCfgM', pai)) agendar(); });
  (function ligarObs() { const pai = $('#blocoFilhosM'); if (pai) vig.observe(pai, { childList: true }); else setTimeout(ligarObs, 1000); })();
  tudo();
}
(window.ACF3D = window.ACF3D || {}).vista = window.ACF3D.vista || [];
window.ACF3D.vista.push(Vista);
window.ACF_DISFARCE = {
  // ganchos: filhos.js (usar, travaObjeto, aoReparar) e sala3d.js (modelo, assinatura)
  usar, travaObjeto, aoReparar, modelo, assinatura,
  // ações e dados (outras telas e testes)
  virarObjeto, virarCobaia, quebrar, opc, PAD, DET_OBJ, DET_COB, sortearObj, sortearCob, nomeTipo, listaCopia, quemOlha,
  // para testes
  Vista, Ctrl, Olhar, Efx, REG, copiavel, decorarObjeto, decorarCobaia, montarModelo,
};
iniciar();
})();
