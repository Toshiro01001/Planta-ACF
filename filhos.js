/* =========================================================
   A CAIXA DE FÓSFOROS · filhos.js
   Características dos Filhos da O.R.F.E.U. no mapa: sentidos (o que o auxiliar
   percebe), movimento, rastro e avisos aos jogadores, ocultação especial e os
   botões de habilidade do auxiliar e do Mestre.

   O CÓDIGO É GENÉRICO. Aqui só existem os tipos (o sentido "faro", a trava
   "só no escuro", o botão "Teia"...). QUAL Filho tem cada coisa fica nos dados
   secretos do Firebase:
     privado/filhos/<ser>          características de cada Filho (Mestre grava, auxiliares leem)
     privado/etiquetas             etiquetas das salas e corredores (água, barulhenta, estreito, quadros, ninho)
     privado/filhosEstado          estado em jogo (usos por cena, teias, raízes, cópias liberadas...)
     segredos/_filhos/<ser>/enigma a fraqueza (só o Mestre)
   Público (sem dizer de quem é): mapa/fil (rastros, avisos, objetos, silêncio, pedidos de teste),
   filMsg (mensagens privadas a uma cobaia), filAcoes (Examinar/Olhar dos jogadores),
   filResp (respostas aos testes) e leituras (quem abriu documentos do Arquivo).
   O arquivo do Mestre (tipo planta-acf-filhos) fica FORA do GitHub.
   ========================================================= */
(() => {
'use strict';
const A = () => window.ACF;
const I = () => window.ACF._int;
const FX = () => window.ACF_FICHAS;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const int = v => parseInt(v, 10) || 0;
const pad2 = n => String(n).padStart(2, '0');
const agora = () => Date.now();

/* ---------- Catálogo genérico ---------- */
const SENTIDOS = [
  ['audicao', 'Audição', 'manchas borradas e setas (o sistema atual)'],
  ['audicao_precisa', 'Audição precisa', 'escala de ruído: silêncio nada; baixo mancha (e pedir teste de Percepção contra Furtividade); médio sala exata em alcance médio; alto ou mais sala exata no andar e movimento dobrado na próxima vez'],
  ['audicao_agua', 'Audição com alcance dobrado em sala com água', 'soma à audição'],
  ['sem_visao', 'Sem visão', 'salas reveladas não mostram cobaias: só o som; imune a efeitos visuais'],
  ['visao_curta', 'Visão curta', 'cobaias só na mesma sala ou numa sala vizinha'],
  ['faro', 'Faro de sangue', 'cobaias machucadas aparecem como mancha vermelha no andar, mesmo em silêncio'],
  ['faro_curto', 'Faro curto', 'cobaias machucadas à vista ganham um brilho a mais'],
  ['solidao', 'Solidão', 'cobaias sozinhas numa sala, mesmo em silêncio'],
  ['vibracao', 'Vibração', 'a primeira cobaia que pisa numa teia aparece na posição exata'],
  ['raizes', 'Raízes', 'quem está numa sala enraizada, mesmo em silêncio'],
  ['leitura', 'Leitura', 'quais cobaias abriram documentos do Arquivo nos últimos minutos e onde estavam'],
  ['descanso', 'Descanso', 'cobaias descansando ou dormindo (descanso curto ou longo do interlúdio), mesmo em silêncio'],
  ['ninho', 'Ninho', 'quem entra no covil e nas salas vizinhas a ele'],
];
const NOME_SENT = Object.fromEntries(SENTIDOS.map(([k, n]) => [k, n]));
const MOVS = [['normal', 'Normal'], ['lento', 'Lento: metade do limite na perseguição'], ['imovel', 'Imóvel: não se move no mapa'], ['escuro', 'Só no escuro: travado em sala iluminada (anda em Apagão, luz apagada ou sem sinal)']];
const MODS = [
  ['apagao2', 'Movimento dobrado durante um Apagão geral'],
  ['grande', 'Grande demais: não entra em corredor (ou sala) estreito'],
  ['arromba', 'Arromba portas: passa por porta trancada, com estrondo'],
  ['silencioso', 'Passos silenciosos: o movimento nunca gera aviso aos jogadores'],
  ['diaPar', 'Dia par do ciclo: as cobaias veem um aviso discreto de −5 em Furtividade'],
  ['proibeBarulhenta', 'PROPOSTA (liga/desliga): sala barulhenta proibida; a cobaia que se esconde nela soma barulho'],
];
const RASTROS = { molhado: 'Chão molhado', lodo: 'Lodo preto no chão' };
const MARCAS = { molhado: ['💧', 'Chão molhado'], lodo: ['⬛', 'Lodo preto no chão'], raizes: ['🌱', 'Raízes no chão'], alagada: ['🌊', 'Alagada: terreno difícil (metade do movimento)'] };
const AVISOS = [
  ['tremor', 'O chão treme: todos no andar, com um rumo vago'],
  ['forro', 'Algo se arrasta acima do forro: quem está numa sala vizinha, sem direção'],
  ['observado', 'Você se sente observado: quem está na mesma sala'],
  ['aproxima', 'Algo se aproxima: quem está numa sala vizinha'],
];
const TXT_AVISO = {
  tremor: r => `O chão treme. Parece vir do ${r}.`,
  forro: () => 'Algo se arrasta acima do forro.',
  observado: () => 'Você se sente observado.',
  aproxima: () => 'Algo se aproxima.',
  estrondo: r => `Um estrondo de porta arrombada, vindo do ${r}.`,
};
const OCULT = [
  ['', 'Nenhuma'],
  ['teto', 'No teto: oculto mesmo em sala revelada até alguém passar em "Examinar a sala"'],
  ['parede', 'Na parede: em sala com quadros, invisível até atacar'],
  ['sempre', 'Sempre oculto até atacar ou alguém passar em "Olhar ao redor" (fica parado no próximo turno)'],
  ['pisca', 'Meio apagado: o token pisca para os jogadores, aparece e some'],
];
// limites: 'cena' = 1 por cena (Nova cena do Mestre); 'rodadas3' = a cada 3 rodadas de perseguição
const HABS = {
  bando: { n: 'Bando', i: '🧟', d: 'Põe mais Filhos iguais, ocultos, na mesma sala.' },
  dutos: { n: 'Pelos dutos', i: '🕳', lim: 'cena', d: 'No próximo movimento, atravessa uma porta trancada ou um corredor bloqueado.' },
  canos: { n: 'Pelos canos', i: '🚰', d: 'Some numa sala com água e reaparece em outra sala com água do mesmo andar.' },
  alagar: { n: 'Alagar', i: '🌊', d: 'A sala vira terreno difícil (metade do movimento) até o fim da cena.' },
  chamado: { n: 'Chamado', i: '📞', d: 'Mensagem privada à cobaia sozinha mais próxima, com a voz de alguém querido. A direção é real.' },
  teia: { n: 'Teia', i: '🕸', d: 'Marca um corredor. A primeira cobaia que passar faz Reflexos; se falhar, fica enredada.' },
  enraizar: { n: 'Enraizar', i: '🌱', lim: 'cena', d: 'Liga uma sala vizinha às raízes.' },
  fios: { n: 'Puxar os fios', i: '🎻', d: 'O jogador da cobaia mais próxima faz Vontade; se falhar, o token é puxado uma sala em direção a este Filho.' },
  ninhada: { n: 'Ninhada', i: '🥚', lim: 'rodadas3', d: 'Põe Filhos ocultos em salas vizinhas ao covil.' },
  lembranca: { n: 'Lembrança', i: '🖼', d: 'Mensagem privada, escrita pelo Mestre, a uma cobaia que o viu.' },
  coracao: { n: 'Ouvir o Coração', i: '💓', d: 'Turno terminado ao lado de uma cobaia que não se mexeu: o jogador faz Vontade; se falhar, a posição exata aparece.' },
  silencio: { n: 'Silêncio Absoluto', i: '🔇', lim: 'cena', d: 'Em alcance médio, as cobaias ficam surdas por 1 rodada: chat bloqueado e o som delas some do mapa.' },
  objeto: { n: 'Forma de Objeto', i: '🪑', d: 'O token some para os jogadores e vira um objeto a mais na sala (no 3D, o objeto escolhido).' },
  estudar: { n: 'Estudar', i: '👁', d: 'Depois de uma cena inteira como objeto na mesma sala que uma cobaia, libera a cópia dela.' },
  copiar: { n: 'Copiar', i: '🎭', d: 'Para os jogadores, o token vira o da cobaia copiada (com o Detalhe escolhido pelo Mestre).' },
  mimetismo: { n: 'Mimetismo Vocal', i: '🗣', d: 'Mensagem no chat como a cobaia copiada, só com frases que o jogador dela escreveu nas últimas 24 h.' },
};
const PASSIVOS = [['regente', 'Regente: com ele no andar, o auxiliar move mais um Filho por rodada de perseguição'], ['abraco', 'Abraço: o Mestre marca a cobaia agarrada e as frases dela entram no repertório']];
const ETIQUETAS = [['agua', '💧 Água'], ['barulhenta', '🔊 Barulhenta'], ['estreito', '↔ Estreito'], ['quadros', '🖼 Quadros'], ['ninho', '🥚 Ninho']];
// objetos da biblioteca do 3D para a Forma de Objeto
const OBJETOS = [['cadeira', 'Cadeira'], ['cadeira_plastico', 'Cadeira de plástico'], ['caixote', 'Caixote (baú)'], ['maca', 'Maca com rodas (carrinho)'], ['armario', 'Armário'], ['armario_metal', 'Armário de metal'], ['estante', 'Estante'], ['manequim', 'Manequim'], ['mesa', 'Mesa']];
const DETALHES = [['', 'Nenhum (cópia perfeita)'], ['espelho', 'Retrato espelhado'], ['fhp', 'Número FHP trocado'], ['aro', 'Cor do anel um tom diferente']];
const ALC_MEDIO = 18, ALC_LONGO = 36;          // metros (alcances do livro)
const RASTRO_MIN = 5, LEITURA_MIN = 10;         // minutos padrão

/* ---------- Leitura dos dados ---------- */
const est = () => (A() && A().estado) || {};
const priv = () => (I() && I().Priv.dados) || {};
const cfgs = () => priv().filhos || {};
const cfgDe = ser => cfgs()[ser] || null;
const temCfg = tk => !!(tk && cfgDe(tk.s));
const ef = () => priv().filhosEstado || {};
const pub = () => est().fil || {};
const etq = () => priv().etiquetas || {};
const tagsSala = cn => ((etq().salas || {})['c' + cn]) || {};
const tagsCorr = (a, ci) => ((etq().corr || {})['a' + a + 'k' + ci]) || {};
const sent = (c, k) => !!(c && c.sent && c.sent[k]);
const mod = (c, k) => !!(c && c.movx && c.movx[k]);
const hab = (c, k) => !!(c && c.hab && c.hab[k]);
const pas = (c, k) => !!(c && c.pass && c.pass[k]);
const tokens = () => est().tokens || {};
const SERd = id => (A().SER || {})[id];
const tipoDe = tk => tk && SERd(tk.s) ? SERd(tk.s).tipo : '';
const ehFilho = tk => tipoDe(tk) === 'filho';
const ehCobaia = tk => tipoDe(tk) === 'cobaia';
const cena = () => (est().cena || {}).id || '0';
const P = () => I().P();
const rodada = () => (P().on ? P().rod || 1 : 0);
const vista = () => I().V();
const souMestre = () => !!A().mestre;
const souAux = () => !!A().aux && !A().mestre;
const souGM = () => !!A().mestre || !!A().aux;
function salaP(tk) { return tk && tk.a ? I().salaEm(tk.a, tk.x, tk.y) : null; }
function cnTk(tk) { const p = salaP(tk); return p ? I().cnDe(tk.a, p) : null; }
function corrTk(tk) { return tk && !salaP(tk) ? I().corredorEm(tk.x, tk.y) : -1; }
function chaveLugar(tk) { const p = salaP(tk); if (p) return 'c' + I().cnDe(tk.a, p); const ci = corrTk(tk); return ci >= 0 ? 'a' + tk.a + 'k' + ci : ''; }
function centroSala(p) { const r = I().retSala(p); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
function vizinhas(p) { const v = []; I().CORREDORES.forEach(c => { if (c.p1 === p) v.push(c.p2); else if (c.p2 === p) v.push(c.p1); }); return v; }
function corredorEntre(p1, p2) { return I().CORREDORES.findIndex(c => (c.p1 === p1 && c.p2 === p2) || (c.p1 === p2 && c.p2 === p1)); }
const metros = (a, b) => I().custoMetros(a, b);
const rumo4 = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'leste' : 'oeste') : (dy > 0 ? 'sul' : 'norte'));
const cobaiasNoAndar = a => Object.entries(tokens()).filter(([, t]) => ehCobaia(t) && t.a === a);
const nomeTk = tk => (I().rotuloBase ? I().rotuloBase(tk) : (SERd(tk.s) || {}).nome);
const rotuloGM = tk => { const s = SERd(tk.s) || {}; return s.tipo === 'filho' ? `${s.codigo} ${s.nome}${tk.n > 1 ? ' #' + tk.n : ''}` : s.nome; };
function gravarEstado(caminho, valor) { if (!I().Priv.pronto && A().firebase) return Promise.resolve(); return I().Priv.gravar(['filhosEstado'].concat(caminho), valor); }
function gravarPub(caminho, valor) { A().definir(['fil'].concat(caminho), valor); }
const novaChave = () => A().Rede.chave();
function rolar(expr) { try { return FX().rolarExpr(expr); } catch (e) { return { total: 0, det: expr }; } }
const machucada = tk => { const v = tk && tk.vit; return !!(v && typeof v.pv === 'number' && typeof v.pvMax === 'number' && v.pv < v.pvMax); };
const escuroEm = (a, cn) => !!(I().apagao() || ((est().luz || {})['c' + cn] === 'off') || (cn && (ef().semSinal || {})['c' + cn]));

/* ---------- Usos e limites (por cena / a cada 3 rodadas) ---------- */
function limiteHab(c, k) { const l = c && c.lim && c.lim[k]; return l !== undefined ? l : (HABS[k] || {}).lim || ''; }
function bloqueioUso(tokId, c, k) {
  const l = limiteHab(c, k), u = ((ef().u || {})[tokId] || {})[k];
  if (l === 'cena' && u && u.c === cena()) return 'Já usado nesta cena (1 por cena). O Mestre libera com "Nova cena".';
  if (l === 'rodadas3') {
    if (!P().on) return souMestre() ? '' : 'Só durante a perseguição (a cada 3 rodadas).';
    if (u && u.r && rodada() - u.r < 3 && u.c === cena()) return `Disponível de novo na rodada ${u.r + 3}.`;
  }
  return '';
}
function marcarUso(tokId, k) { return gravarEstado(['u', tokId, k], { c: cena(), r: rodada(), ts: agora() }); }

/* ---------- Filho em foco do auxiliar (vista pelos sentidos) ---------- */
let foco = null;
try { foco = sessionStorage.getItem('acf-fil-foco') || null; } catch (e) {}
function definirFoco(id) {
  foco = id || null;
  try { if (foco) sessionStorage.setItem('acf-fil-foco', foco); else sessionStorage.removeItem('acf-fil-foco'); } catch (e) {}
  try { I().limparEcos(); } catch (e) {}
  I().atualizarTudo(); desenharBlocoSons();
}
function focoAtual() {
  if (!souAux() || !foco) return null;
  const tk = tokens()[foco];
  return tk && ehFilho(tk) ? foco : null;
}

/* ---------- Exatos: falhou num teste pedido pelo auxiliar (posição exata por um tempo) ---------- */
let respostas = {};
function exatos() {
  const out = {}, pd = pub().pd || {};
  Object.entries(pd).forEach(([k, p]) => {
    if (!p || p.ef !== 'exato') return;
    Object.entries(respostas[k] || {}).forEach(([cob, r]) => { if (r && r.ok === false && agora() - (r.ts || 0) < 120000) out[cob] = r.ts; });
  });
  Object.entries(ef().teiaHit || {}).forEach(([, h]) => { if (h && h.s && agora() - (h.ts || 0) < 180000) out[h.s] = h.ts; });
  return out;
}

/* ---------- O que um Filho percebe ---------- */
// sentidos que mostram a cobaia na posição exata (mesmo em silêncio): devolve o nome do sentido ou ''
function sentidoExato(f, c, cobId, tk) {
  if (!tk || tk.a !== f.a) return '';
  const p = salaP(tk), cn = p ? I().cnDe(tk.a, p) : null;
  if (sent(c, 'vibracao') && exatos()[cobId]) return 'vibração';
  if (exatos()[cobId]) return 'teste';
  if (sent(c, 'solidao') && p && cobaiasNoAndar(tk.a).filter(([, t]) => salaP(t) === p).length === 1) return 'solidão';
  if (sent(c, 'raizes') && cn && salaEnraizada(f, cn)) return 'raízes';
  if (sent(c, 'descanso') && (est().interludio || {}).on) return 'descanso';
  if (sent(c, 'ninho') && p) { const nn = ninhoP(f, c); if (nn && (p === nn || vizinhas(nn).includes(p))) return 'ninho'; }
  return '';
}
function salaEnraizada(f, cn) {
  if (cnTk(f) === cn) return true;
  return !!(ef().raizes || {})['c' + cn];
}
function covis(c) { return String((c && c.covil) || '').split(/[^0-9]+/).map(int).filter(Boolean); }
function ninhoP(f, c) { const cv = covis(c).find(n => Math.ceil(n / 25) === f.a); return cv ? cv - 25 * (f.a - 1) : salaP(f); }
// visão: true/false. Base: cobaias na sala do Filho e nas salas reveladas
function enxerga(f, c, tk) {
  if (sent(c, 'sem_visao')) return false;
  const pf = salaP(f), pt = salaP(tk);
  let ve;
  if (sent(c, 'visao_curta')) {
    if (pt) ve = !!pf && (pt === pf || vizinhas(pf).includes(pt));
    else { const ci = corrTk(tk), k = I().CORREDORES[ci]; ve = !!k && (corrTk(f) === ci || k.p1 === pf || k.p2 === pf); }
  } else if (pt) ve = pt === pf || I().salaRevelada(tk.a, I().cnDe(tk.a, pt));
  else { const ci = corrTk(tk), k = I().CORREDORES[ci]; ve = !!k && (corrTk(f) === ci || k.p1 === pf || k.p2 === pf); }
  if (!ve) return false;
  // escondido num esconderijo (regra que já existia): só na mesma sala e se falhou no teste
  if (tk.esq && !tk.vf) return pt && pt === pf && tk.eo !== 1;
  return true;
}
function percebe(filhoId, tk) {
  const f = tokens()[filhoId];
  if (!f || !ehFilho(f) || !tk) return null;
  const t = tipoDe(tk);
  if (t !== 'cobaia' && t !== 'npc') return null;
  const c = cfgDe(f.s);
  if (!c) return null;
  if (tk.a !== f.a) return false;
  const id = Object.keys(tokens()).find(k => tokens()[k] === tk) || tk.s;
  if (sentidoExato(f, c, id, tk)) return true;
  return enxerga(f, c, tk);
}
function veAux(tk) {
  const f = focoAtual();
  if (!f) return true;
  const r = percebe(f, tk);
  return r === null ? true : r;
}
// marca no token: por qual sentido o auxiliar está vendo (só na vista do Filho)
function marcaSentido(id, tk) {
  const fid = focoAtual(); if (!fid) return '';
  const f = tokens()[fid], c = f && cfgDe(f.s);
  if (!c || !tk || (tipoDe(tk) !== 'cobaia' && tipoDe(tk) !== 'npc')) return '';
  const s = sentidoExato(f, c, id, tk);
  if (s) return s;
  if (sent(c, 'faro_curto') && machucada(tk) && enxerga(f, c, tk)) return 'faro';
  return '';
}

/* ---------- Escuta (audição) do Filho em foco ---------- */
// null = escuta padrão; false = este Filho não ouve; { exata, c } = sala exata; { teste: true } = mancha com pedido de teste
function ouve(gr, k, n) {
  const fid = focoAtual(); if (!fid) return null;
  const f = tokens()[fid], c = cfgDe(f.s);
  if (!c) return null;
  if (f.a !== gr.a) return false;
  const temAud = sent(c, 'audicao') || sent(c, 'audicao_precisa');
  if (!temAud) return false;
  const centro = gr.p ? centroSala(gr.p) : (() => { const t = tokens()[k.slice(5)]; return t ? { x: t.x, y: t.y } : null; })();
  if (!centro) return false;
  // distância até o ponto mais perto da sala (ou até a cobaia, no corredor), em metros de regra
  const alvo = gr.p ? (() => { const r = I().retSala(gr.p); return { x: Math.max(r.x, Math.min(r.x + r.w, f.x)), y: Math.max(r.y, Math.min(r.y + r.h, f.y)) }; })() : centro;
  const d = metros({ x: f.x, y: f.y }, alvo);
  if (sent(c, 'audicao_precisa')) {
    if (n <= 1) return { teste: true };
    if (n === 2) return d <= ALC_MEDIO && gr.p ? { exata: true, c: centro } : null;
    // estrondo: sala exata em qualquer ponto do andar e movimento dobrado na próxima vez
    const db = (ef().dobro || {})[fid];
    if (gr.p && !(db && db.r >= rodada() + 1 && agora() - (db.ts || 0) < 60000)) gravarEstado(['dobro', fid], { r: rodada() + 1, ts: agora() });
    return gr.p ? { exata: true, c: centro } : null;
  }
  let alc = +c.alcAud || ALC_LONGO;
  const cf = cnTk(f);
  if (sent(c, 'audicao_agua') && cf && tagsSala(cf).agua) alc *= 2;
  return d <= alc ? null : false;
}
// Silêncio Absoluto: quem está surdo
function silAtivo() {
  const s = pub().sil; if (!s || !s.al) return null;
  if (s.r) { const p = P(); if (!p.on) return agora() - (s.ts || 0) < 60000 ? s : null; const r = p.rod || 1, v = p.vez || 0; return (r < s.r + 1 || (r === s.r + 1 && v < (s.v || 0))) ? s : null; }
  return agora() < (s.ate || 0) ? s : null;
}
function semSilenciados(ids) { const s = silAtivo(); return s ? ids.filter(id => !s.al[id]) : ids; }
function chatBloqueado() { const s = silAtivo(), eu = A().meu; return s && eu && s.al[eu] ? 'Você não ouve nada. O canal de mensagens fica bloqueado por 1 rodada.' : ''; }

/* ---------- Movimento ---------- */
function regraVale(id) {
  // auxiliar: sempre; Mestre: só na perseguição (sem movimento livre)
  if (souAux()) return true;
  return souMestre() && A().participa(id) && A().limiteDe(id) !== null;
}
function limite(id, lim) {
  const tk = tokens()[id]; if (!tk) return lim;
  let l = lim;
  const c = ehFilho(tk) ? cfgDe(tk.s) : null;
  if (c) {
    if (c.mov === 'lento') l /= 2;
    if (mod(c, 'apagao2') && I().apagao()) l *= 2;
    const db = (ef().dobro || {})[id];
    if (db && P().on && rodada() <= db.r && agora() - (db.ts || 0) < 900000) l *= 2;
  }
  // sala alagada (marca pública): terreno difícil, metade do movimento, para todos
  const ref = tk.x0 !== undefined ? { a: tk.a, x: tk.x0, y: tk.y0 } : tk;
  const cn = cnTk(ref);
  if (cn && Object.values(pub().m || {}).some(m => m && m.t === 'alagada' && m.cn === cn && m.c === cena())) l /= 2;
  return Math.max(0.5, Math.round(l * 2) / 2);
}
function travado(id, tk) {
  if (!tk || !ehFilho(tk) || !regraVale(id)) return '';
  const c = cfgDe(tk.s); if (!c) return '';
  if (tk.fo) return 'Em forma de objeto: volte à forma normal para se mover.';
  if (c.mov === 'imovel') return 'Este Filho não se move no mapa (imóvel).';
  if (c.mov === 'escuro') { const cn = cnTk(tk); const corrEsc = !cn && (I().apagao() || (est().luz || {})['a' + tk.a] === 'off'); if (!(cn ? escuroEm(tk.a, cn) : corrEsc)) return 'Só se move no escuro: este lugar está iluminado.'; }
  const tv = (ef().trava || {})[id];
  if (tv && P().on && rodada() <= tv) return 'Alguém está olhando: fica parado neste turno.';
  return '';
}
function bloqueia(id, a, x, y) {
  const tk = tokens()[id]; if (!tk || !ehFilho(tk) || !regraVale(id)) return false;
  const c = cfgDe(tk.s); if (!c) return false;
  const p = I().salaEm(a, x, y);
  if (mod(c, 'grande')) {
    if (p && tagsSala(I().cnDe(a, p)).estreito) return true;
    if (!p) { const ci = I().corredorEm(x, y); if (ci >= 0 && tagsCorr(a, ci).estreito) return true; }
  }
  if (mod(c, 'proibeBarulhenta') && p && tagsSala(I().cnDe(a, p)).barulhenta) return true;
  return false;
}
function ignoraPorta(id, a, ci) {
  const tk = tokens()[id]; if (!tk || !ehFilho(tk)) return false;
  const c = cfgDe(tk.s); if (!c) return false;
  if (mod(c, 'arromba')) return true;
  const d = (ef().dutos || {})[id];
  return !!(d && agora() - d < 600000);
}
function regente(id, tk) {
  if (!tk || !ehFilho(tk) || !P().on || !(souAux() || souMestre())) return false;
  const temRegente = Object.values(tokens()).some(t => t !== tk && t.a === tk.a && ehFilho(t) && pas(cfgDe(t.s), 'regente'));
  if (!temRegente) return false;
  const r = (ef().regente || {})['a' + tk.a];
  if (r && r.r === rodada()) return r.tk === id;
  gravarEstado(['regente', 'a' + tk.a], { r: rodada(), tk: id });
  A().aviso('Regente: este Filho anda fora da vez nesta rodada.');
  return true;
}

/* ---------- Aparência para os jogadores (a cópia) ---------- */
function tomDiferente(hex) {
  const n = parseInt(String(hex || '#888888').slice(1), 16); if (isNaN(n)) return hex;
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  [r, g, b] = [Math.min(255, Math.round(r * .82 + 30)), Math.min(255, Math.round(g * .86 + 18)), Math.min(255, Math.round(b * .7 + 60))];
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
function trocarFHP(cod) { return String(cod || '').replace(/(\d)(\d)$/, '$2$1').replace(/^FHP-0*(\d)$/, m => m); }
function aparencia(tk) {
  if (!tk || !tk.cp || !ehFilho(tk)) return null;
  const v = vista(); if (v.mestre || v.aux) return null;
  const s = SERd(tk.cp); if (!s || s.tipo !== 'cobaia') return null;
  const det = tk.cpd || '';
  let cod = det === 'fhp' ? trocarFHP(s.codigo) : null;
  if (cod === s.codigo) cod = s.codigo.replace(/\d$/, d => String((+d + 1) % 10));
  return { ser: s, det, cor: det === 'aro' ? tomDiferente(s.cor) : null, codigo: cod };
}

/* ---------- Janelas (escolher, texto, teste) ---------- */
function fecharModal() { const m = $('#filModal'); if (m) m.remove(); }
function modal(html, ligar) {
  fecharModal();
  const m = document.createElement('div'); m.id = 'filModal'; m.className = 'fil-modal';
  m.innerHTML = `<div class="fil-caixa" role="dialog" aria-modal="true"><button class="fil-x" aria-label="Fechar">×</button>${html}</div>`;
  document.body.appendChild(m);
  $('.fil-x', m).onclick = fecharModal;
  m.addEventListener('click', e => { if (e.target === m) fecharModal(); });
  if (ligar) ligar(m);
  return m;
}
function escolher(titulo, opcoes, cb, txt) {
  if (!opcoes.length) { A().aviso(txt || 'Nenhuma opção agora.'); return; }
  modal(`<h3>${esc(titulo)}</h3><div class="fil-opcoes">${opcoes.map((o, i) => `<button data-op="${i}">${esc(o[1])}${o[2] ? `<small>${esc(o[2])}</small>` : ''}</button>`).join('')}</div>`,
    m => $$('[data-op]', m).forEach(b => b.onclick = () => { fecharModal(); cb(opcoes[+b.dataset.op][0]); }));
}
function pedirTexto(titulo, rotulo, padrao, cb, num) {
  modal(`<h3>${esc(titulo)}</h3><label class="fil-campo">${esc(rotulo)}<input id="filTxt" ${num ? 'type="number" inputmode="numeric"' : ''} value="${esc(padrao == null ? '' : padrao)}"></label><div class="fil-opcoes"><button data-ok class="pri">Confirmar</button></div>`,
    m => { const i = $('#filTxt', m); i.focus(); const ok = () => { const v = i.value.trim(); fecharModal(); cb(v); }; $('[data-ok]', m).onclick = ok; i.onkeydown = e => { if (e.key === 'Enter') ok(); }; });
}

/* ---------- Habilidades (auxiliar e Mestre) ---------- */
function logFilhos(txt) { try { I().Chat.enviar('🎛 ' + txt, 'filhos', true); } catch (e) {} }
function colocarHidden(serId, a, p) {
  const tks = tokens();
  const usados = Object.values(tks).filter(t => t.s === serId).map(t => t.n || 1);
  const n = (usados.length ? Math.max(...usados) : 0) + 1;
  const r = I().retSala(p);
  const id = `${serId}-${n}`;
  A().definir(['tokens', id], { s: serId, a, x: +(r.x + 0.7 + Math.random() * (I().R - 1.4)).toFixed(2), y: +(r.y + 0.7 + Math.random() * (I().R - 1.4)).toFixed(2), h: true, n });
  return id;
}
// salas de distância pelos corredores (no corredor, vale a sala mais perto)
function passos(a, b) {
  if (!a || !b) return 99;
  const vis = new Map([[a, 0]]), fila = [a];
  while (fila.length) { const s = fila.shift(); if (s === b) return vis.get(s); vizinhas(s).forEach(v => { if (!vis.has(v)) { vis.set(v, vis.get(s) + 1); fila.push(v); } }); }
  return 99;
}
const salaOuPerto = t => salaP(t) || (() => { const k = I().CORREDORES[corrTk(t)]; return k ? k.p1 : null; })();
// a cobaia mais perto pelo caminho das salas; a Zona Neutra (isenta) fica de fora
function cobaiaMaisPerto(f, filtro) {
  let melhor = null;
  const zn = typeof ZONA_NEUTRA_ISENTA !== 'undefined' && ZONA_NEUTRA_ISENTA;
  cobaiasNoAndar(f.a).forEach(([id, t]) => {
    if (filtro && !filtro(id, t)) return;
    if (zn && salaP(t) === 25) return;
    const d = passos(salaOuPerto(f), salaOuPerto(t)) * 1000 + metros({ x: f.x, y: f.y }, { x: t.x, y: t.y });
    if (!melhor || d < melhor.d) melhor = { id, t, d };
  });
  return melhor;
}
function sozinha(id, t) { const p = salaP(t); return !!p && cobaiasNoAndar(t.a).filter(([, o]) => salaP(o) === p).length === 1; }
function proximaSalaRumo(de, para) {
  // caminho pelas salas (corredores) até a sala "para"; devolve a próxima sala
  if (de === para) return null;
  const vis = new Map([[de, null]]), fila = [de];
  while (fila.length) { const s = fila.shift(); if (s === para) break; vizinhas(s).forEach(v => { if (!vis.has(v)) { vis.set(v, s); fila.push(v); } }); }
  if (!vis.has(para)) return null;
  let s = para; while (vis.get(s) !== de && vis.get(s) !== null) s = vis.get(s);
  return s;
}
function pedirTeste(p) {
  const k = novaChave();
  gravarPub(['pd', k], { ...p, ts: agora() });
  return k;
}
function percepcaoDaFicha(serId) {
  const f = (fichasFilho[serId] || [])[0];
  const m = f && /percep[cç][aã]o\s*([0-9]+)\s*d\s*20\s*([+-]\s*[0-9]+)?/i.exec(String(f.d.per || '') + ' ' + String(f.d.sentidos || ''));
  return m ? { dados: int(m[1]), bonus: int(String(m[2] || '0').replace(/\s/g, '')) } : null;
}
const fichasFilho = {};
// deslocamento da ficha ligada ao Filho (ex.: "9m" ou "12 m"): limite padrão na perseguição
function limPadrao(ser) { const f = (fichasFilho[ser] || [])[0]; const m = f && /(\d+(?:[.,]\d+)?)/.exec(String(f.d.desl || '')); return m ? String(parseFloat(m[1].replace(',', '.'))) : ''; }
let offFichas = null;
function ligarFichas() {
  if (offFichas || !souGM() || !A().Rede) return;
  offFichas = A().Rede.on('agentesAux', v => {
    Object.keys(fichasFilho).forEach(k => delete fichasFilho[k]);
    Object.entries(v || {}).forEach(([chave, d]) => { if (d && d.tipo === 'ameaca' && d.filho) (fichasFilho[d.filho] = fichasFilho[d.filho] || []).push({ chave, d }); });
  }, () => { offFichas = null; });
}

const USAR = {
  bando(id, tk, c) {
    const p = salaP(tk); if (!p) return A().aviso('Fique numa sala para chamar o bando.');
    const dado = (c.bando && c.bando.dado) || '1d4', ser = (c.bando && c.bando.ser) || tk.s, n = Math.max(1, rolar(dado).total);
    for (let i = 0; i < n; i++) colocarHidden(ser, tk.a, p);
    A().aviso(`Bando: +${n} (${dado}) ocultos nesta sala.`); return `Bando: +${n} na CN ${pad2(cnTk(tk))}`;
  },
  dutos(id) { gravarEstado(['dutos', id], agora()); A().aviso('Pelos dutos: no próximo movimento, passa por uma porta trancada ou um corredor bloqueado.'); return 'Pelos dutos'; },
  canos(id, tk) {
    const cn = cnTk(tk); if (!cn || !tagsSala(cn).agua) return A().aviso('Precisa estar numa sala com água (etiqueta do Mestre).');
    const ops = [];
    for (let p = 1; p <= 25; p++) { const c2 = I().cnDe(tk.a, p); if (c2 !== cn && tagsSala(c2).agua) ops.push([p, A().nomeSala(c2)]); }
    escolher('Pelos canos: reaparecer em', ops, p => {
      const r = I().retSala(p), t2 = tokens()[id]; if (!t2) return;
      A().definir(['tokens', id], { ...t2, x: +(r.x + 1 + Math.random() * (I().R - 2)).toFixed(2), y: +(r.y + 1 + Math.random() * (I().R - 2)).toFixed(2) });
      logFilhos(`${rotuloGM(t2)} usou Pelos canos: CN ${pad2(cnTk(tk))} → CN ${pad2(I().cnDe(tk.a, p))}`);
    }, 'Nenhuma outra sala com água neste andar.');
    return null;
  },
  alagar(id, tk) {
    const cn = cnTk(tk); if (!cn) return A().aviso('Fique numa sala para alagar.');
    gravarPub(['m', 'al' + cn], { t: 'alagada', a: tk.a, cn, c: cena(), ts: agora() });
    return `Alagar: CN ${pad2(cn)} até o fim da cena`;
  },
  chamado(id, tk) {
    const alvo = cobaiaMaisPerto(tk, sozinha);
    if (!alvo) return A().aviso('Nenhuma cobaia sozinha numa sala deste andar.');
    pedirTexto('Chamado', `Voz de quem chama ${SERd(alvo.id).nome} (ex.: sua mãe)`, 'sua mãe', quem => {
      if (!quem) return;
      const r = I().rumo(tk.x - alvo.t.x, tk.y - alvo.t.y);
      const txt = `${quem.charAt(0).toUpperCase() + quem.slice(1)} chama do ${r}.`;
      A().Rede.push('filMsg/' + alvo.id, { t: txt, k: 'voz', ts: agora() }).pronto.catch(I().erroGravacao);
      logFilhos(`${rotuloGM(tk)} usou Chamado em ${SERd(alvo.id).nome}: "${txt}"`);
      A().aviso('Chamado enviado.');
    });
    return null;
  },
  teia(id, tk) {
    const p = salaP(tk), ci0 = corrTk(tk), ops = [];
    I().CORREDORES.forEach((k, ci) => { if (ci === ci0 || (p && (k.p1 === p || k.p2 === p))) ops.push([ci, `Corredor CN ${pad2(I().cnDe(tk.a, k.p1))} ↔ CN ${pad2(I().cnDe(tk.a, k.p2))}`]); });
    escolher('Teia: marcar o corredor', ops, ci => { gravarEstado(['teias', 'a' + tk.a + 'k' + ci], { tk: id, ts: agora() }); logFilhos(`${rotuloGM(tk)} armou uma Teia (corredor ${ci})`); A().aviso('Teia armada. A primeira cobaia que passar faz Reflexos.'); }, 'Fique numa sala ou num corredor.');
    return null;
  },
  enraizar(id, tk, c) {
    const p = salaP(tk); if (!p) return A().aviso('Fique numa sala para enraizar.');
    const raiz = ef().raizes || {}, ok = new Set();
    const base = [p].concat(Object.keys(raiz).map(k => +k.slice(1)).filter(cn => Math.ceil(cn / 25) === tk.a).map(cn => cn - 25 * (tk.a - 1)));
    base.forEach(b => vizinhas(b).forEach(v => { const cn = I().cnDe(tk.a, v); if (!raiz['c' + cn] && v !== p) ok.add(v); }));
    escolher('Enraizar: ligar a sala', [...ok].map(v => [v, A().nomeSala(I().cnDe(tk.a, v))]), v => {
      const cn = I().cnDe(tk.a, v);
      gravarEstado(['raizes', 'c' + cn], { tk: id, ts: agora() });
      gravarPub(['m', 'rz' + cn], { t: 'raizes', a: tk.a, cn, ts: agora() });
      marcarUso(id, 'enraizar');
      logFilhos(`${rotuloGM(tk)} enraizou a CN ${pad2(cn)}`);
    }, 'Nenhuma sala vizinha livre.');
    return false;
  },
  fios(id, tk, c) {
    const alvo = cobaiaMaisPerto(tk); if (!alvo) return A().aviso('Nenhuma cobaia neste andar.');
    const pf = salaP(tk), pa = salaP(alvo.t);
    const prox = pf && pa ? proximaSalaRumo(pa, pf) : null;
    if (!prox) return A().aviso(`${SERd(alvo.id).nome} já está na sala deste Filho (ou fora de uma sala).`);
    const ir = dt => {
      const cc = centroSala(prox);
      pedirTeste({ per: 'vontade', dt, al: { [alvo.id]: 1 }, ef: 'puxar', px: +(cc.x + (Math.random() - .5)).toFixed(2), py: +(cc.y + (Math.random() - .5)).toFixed(2), pa: tk.a, txt: 'Fios invisíveis puxam o seu corpo.' });
      logFilhos(`${rotuloGM(tk)} usou Puxar os fios em ${SERd(alvo.id).nome} (Vontade DT ${dt})`);
    };
    if (c.fiosDT) ir(int(c.fiosDT)); else pedirTexto('Puxar os fios', `DT do teste de Vontade de ${SERd(alvo.id).nome}`, '', v => { if (int(v)) ir(int(v)); }, true);
    return null;
  },
  ninhada(id, tk, c) {
    const ninho = ninhoP(tk, c); if (!ninho) return A().aviso('Defina o covil deste Filho (bloco do Mestre).');
    const viz = vizinhas(ninho); if (!viz.length) return;
    const dado = (c.ninhada && c.ninhada.dado) || '1d4', ser = (c.ninhada && c.ninhada.ser) || tk.s, n = Math.max(1, rolar(dado).total);
    for (let i = 0; i < n; i++) colocarHidden(ser, tk.a, viz[Math.floor(Math.random() * viz.length)]);
    A().aviso(`Ninhada: +${n} (${dado}) ocultos nas salas vizinhas ao covil.`); return `Ninhada: +${n}`;
  },
  lembranca(id, tk, c) {
    const viu = Object.keys(((ef().viu || {})[id]) || {});
    const p = salaP(tk);
    cobaiasNoAndar(tk.a).forEach(([cid, t]) => { if (p && salaP(t) === p && !tk.oc && !tk.h && !viu.includes(cid)) viu.push(cid); });
    const lista = souMestre() ? Object.keys(A().SER).filter(k => SERd(k).tipo === 'cobaia') : viu;
    const textos = String(c.lembrancas || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
    if (!textos.length) return A().aviso('O Mestre ainda não escreveu as lembranças deste Filho (bloco do Mestre).');
    escolher('Lembrança: para quem o viu', lista.map(k => [k, SERd(k).nome]), alvo => {
      escolher('Lembrança: qual', textos.map((t, i) => [i, t.length > 90 ? t.slice(0, 88) + '…' : t]), i => {
        A().Rede.push('filMsg/' + alvo, { t: textos[i], k: 'lembranca', ts: agora() }).pronto.catch(I().erroGravacao);
        logFilhos(`${rotuloGM(tk)} mandou uma Lembrança a ${SERd(alvo).nome}`);
        A().aviso('Lembrança enviada.');
      });
    }, 'Ninguém o viu ainda.');
    return null;
  },
  coracao(id, tk, c) {
    if (P().on && I().vezAtual() === id) return A().aviso('Termine o turno primeiro.');
    const p = salaP(tk); if (!p) return A().aviso('Fique numa sala.');
    const paradas = cobaiasNoAndar(tk.a).filter(([cid, t]) => salaP(t) === p && naoMexeu(cid, t));
    escolher('Ouvir o Coração', paradas.map(([cid]) => [cid, SERd(cid).nome]), cid => {
      const dt = int(c.coracaoDT) || 0;
      if (!dt) return A().aviso('Defina a DT no bloco do Mestre.');
      pedirTeste({ per: 'vontade', dt, al: { [cid]: 1 }, ef: 'exato', txt: 'Seu coração bate alto demais.' });
      logFilhos(`${rotuloGM(tk)} usou Ouvir o Coração em ${SERd(cid).nome} (Vontade DT ${dt})`);
    }, 'Nenhuma cobaia parada na sala dele.');
    return null;
  },
  silencio(id, tk) {
    const al = {};
    cobaiasNoAndar(tk.a).forEach(([cid, t]) => { if (metros({ x: tk.x, y: tk.y }, { x: t.x, y: t.y }) <= ALC_MEDIO) al[cid] = 1; });
    if (!Object.keys(al).length) return A().aviso('Nenhuma cobaia em alcance médio.');
    const p = P();
    gravarPub(['sil'], p.on ? { al, r: p.rod || 1, v: p.vez || 0, ts: agora() } : { al, ate: agora() + 60000, ts: agora() });
    return `Silêncio Absoluto: ${Object.keys(al).map(k => SERd(k).nome).join(', ')}`;
  },
  objeto(id, tk) {
    if (tk.fo) {
      const obk = ((ef().obj || {})[id]);
      if (obk) gravarPub(['ob', obk], null);
      gravarEstado(['obj', id], null);
      const n = { ...tk }; delete n.fo; A().definir(['tokens', id], n);
      return 'Saiu da Forma de Objeto';
    }
    escolher('Forma de Objeto', OBJETOS.map(([k, n]) => [k, n]), o => {
      const t2 = tokens()[id]; if (!t2) return;
      const obk = 'o' + novaChave().slice(-10);
      gravarPub(['ob', obk], { a: t2.a, x: t2.x, y: t2.y, o, ts: agora() });
      gravarEstado(['obj', id], obk);
      A().definir(['tokens', id], { ...t2, fo: o });
      logFilhos(`${rotuloGM(t2)} virou objeto (${o})`);
    });
    return null;
  },
  estudar(id, tk) {
    const est2 = Object.keys(((ef().estudaveis || {})[id]) || {});
    escolher('Estudar: liberar a cópia de', est2.map(k => [k, SERd(k).nome]), cob => { gravarEstado(['copias', id, cob], agora()); logFilhos(`${rotuloGM(tk)} estudou ${SERd(cob).nome}: cópia liberada`); A().aviso('Cópia liberada.'); },
      'Ninguém para estudar: é preciso passar uma cena inteira como objeto na mesma sala que uma cobaia (a cena conta pelo "Nova cena" do Mestre).');
    return null;
  },
  copiar(id, tk, c) {
    if (tk.cp) { const n = { ...tk }; delete n.cp; delete n.cpd; A().definir(['tokens', id], n); return 'Desfez a cópia'; }
    const lib = Object.keys(((ef().copias || {})[id]) || {});
    const lista = souMestre() ? Object.keys(A().SER).filter(k => SERd(k).tipo === 'cobaia') : lib;
    escolher('Copiar', lista.map(k => [k, SERd(k).nome]), cob => {
      const t2 = tokens()[id]; if (!t2) return;
      const n = { ...t2, cp: cob }; if (c.detalhe) n.cpd = c.detalhe; else delete n.cpd;
      A().definir(['tokens', id], n);
      logFilhos(`${rotuloGM(t2)} copiou ${SERd(cob).nome}`);
    }, 'Nenhuma cópia liberada (use Estudar).');
    return null;
  },
  mimetismo(id, tk) {
    const vozes = new Set();
    if (tk.cp) vozes.add(tk.cp);
    Object.keys(((ef().repert || {})[id]) || {}).forEach(k => vozes.add(k));
    if (!vozes.size) return A().aviso('Sem voz para imitar: copie uma cobaia (ou o Mestre marca um Abraço).');
    const desde = agora() - 24 * 3600e3, msgs = (I().Chat.msgs || {}).geral || {};
    const ops = [];
    vozes.forEach(cob => {
      const vistas = new Set();
      Object.values(msgs).filter(m => m && m.a === cob && !m.d && !m.tk && (m.ts || 0) >= desde).sort((x, y) => y.ts - x.ts).forEach(m => {
        if (vistas.has(m.t)) return; vistas.add(m.t);
        const txt = A().textoChat ? A().textoChat(m) : { txt: m.t };
        ops.push([JSON.stringify([cob, m.t]), `${SERd(cob).nome}: ${String(txt.trad || txt.txt || '').slice(0, 120)}`]);
      });
    });
    escolher('Mimetismo Vocal: escolha a frase', ops, v => {
      const [cob, t] = JSON.parse(v);
      A().Rede.push('chat/geral', { a: cob, n: SERd(cob).nome, t, ts: agora(), tk: id }).pronto.catch(I().erroGravacao);
      logFilhos(`${rotuloGM(tk)} imitou ${SERd(cob).nome}`);
    }, 'Nenhuma frase dessa cobaia no chat Geral nas últimas 24 horas.');
    return null;
  },
};
function usar(id, k) {
  const tk = tokens()[id]; if (!tk || !ehFilho(tk)) return;
  if (!souGM()) return;
  const c = cfgDe(tk.s) || {};
  if (!hab(c, k) && !souMestre()) return A().aviso('Este Filho não tem essa habilidade.');
  const b = bloqueioUso(id, c, k); if (b) return A().aviso(b);
  let r;
  try { r = USAR[k](id, tk, c); } catch (e) { console.warn('filhos:', k, e); return A().aviso('Não deu para usar agora.'); }
  if (typeof r === 'string') { if (limiteHab(c, k) && k !== 'enraizar') marcarUso(id, k); logFilhos(`${rotuloGM(tk)} · ${r}`); A().aviso('✦ ' + r); }
}
function naoMexeu(cid, t) {
  if (P().on) return !(t.m > 0);
  const u = ultMov[cid]; return !u || agora() - u > 30000;
}
const ultMov = {}, posAnt = {};
function vigiarParados() {
  Object.entries(tokens()).forEach(([id, t]) => { if (!ehCobaia(t)) return; const k = t.a + ':' + t.x + ',' + t.y; if (posAnt[id] !== undefined && posAnt[id] !== k) ultMov[id] = agora(); posAnt[id] = k; });
}

/* ---------- Cartão do token (2D) ---------- */
function resumoCfg(c) {
  if (!c) return '<p class="mini">Sem características cadastradas (bloco "Características dos Filhos" do Mestre).</p>';
  const s = Object.keys(c.sent || {}).filter(k => c.sent[k]).map(k => NOME_SENT[k] || k);
  const mv = (MOVS.find(m => m[0] === (c.mov || 'normal')) || MOVS[0])[1].split(':')[0];
  const mods = MODS.filter(([k]) => k !== 'diaPar' && mod(c, k)).map(([, n]) => n.split(':')[0]);
  const linhas = [`<b>Sentido:</b> ${esc(s.join(', ') || 'nenhum')}`, `<b>Movimento:</b> ${esc([mv].concat(mods).join(' · '))}`];
  if (c.rastro) linhas.push(`<b>Rastro:</b> ${esc(RASTROS[c.rastro] || c.rastro)}`);
  const av = AVISOS.filter(([k]) => c.avisos && c.avisos[k]).map(([, n]) => n.split(':')[0]);
  if (av.length) linhas.push(`<b>Avisos:</b> ${esc(av.join(', '))}`);
  if (c.ocult) linhas.push(`<b>Ocultação:</b> ${esc((OCULT.find(o => o[0] === c.ocult) || ['', c.ocult])[1].split(':')[0])}`);
  if (mod(c, 'diaPar')) linhas.push('<b>Dia par:</b> aviso de −5 em Furtividade às cobaias');
  const ps = PASSIVOS.filter(([k]) => pas(c, k)).map(([, n]) => n.split(':')[0]);
  if (ps.length) linhas.push(`<b>Passivo:</b> ${esc(ps.join(', '))}`);
  if (covis(c).length) linhas.push(`<b>Covil:</b> ${covis(c).map(n => 'CN ' + pad2(n)).join(', ')}`);
  return `<p class="fil-resumo">${linhas.join('<br>')}</p>`;
}
function htmlBotoes(id, tk, c, cls) {
  const ks = Object.keys(HABS).filter(k => hab(c, k));
  if (!ks.length) return '';
  return `<div class="${cls || 'fil-btns'}">${ks.map(k => { const b = bloqueioUso(id, c, k); return `<button type="button" data-fil-hab="${k}" title="${esc(HABS[k].d + (b ? ' · ' + b : ''))}" class="${b ? 'usado' : ''}${(k === 'objeto' && tk.fo) || (k === 'copiar' && tk.cp) ? ' on' : ''}">${HABS[k].i} ${esc(k === 'objeto' && tk.fo ? 'Voltar à forma' : k === 'copiar' && tk.cp ? 'Desfazer cópia' : HABS[k].n)}${limiteHab(c, k) === 'cena' ? '<small>1/cena</small>' : limiteHab(c, k) === 'rodadas3' ? '<small>3 rodadas</small>' : ''}</button>`; }).join('')}</div>`;
}
function estadoTk(tk) {
  const l = [];
  if (tk.fo) l.push(`🪑 Forma de objeto (${esc((OBJETOS.find(o => o[0] === tk.fo) || ['', tk.fo])[1])})`);
  if (tk.cp && SERd(tk.cp)) l.push(`🎭 Copiando ${esc(SERd(tk.cp).nome)}${tk.cpd ? ' · Detalhe: ' + esc((DETALHES.find(d => d[0] === tk.cpd) || ['', tk.cpd])[1]) : ''}`);
  if (tk.oc) l.push('👻 Ocultação especial: os jogadores não veem');
  if (tk.pp) l.push('⏳ Aguardando a tela do Mestre publicar');
  if (tk.pi) l.push('〰 Pisca para os jogadores');
  return l.length ? `<p class="fil-estado">${l.join('<br>')}</p>` : '';
}
function htmlCartao(id, tk) {
  const v = vista();
  if (!v.mestre && !v.aux) {
    // jogador: Desconfiar de uma cobaia (ou do que parece ser uma)
    const ap = aparencia(tk);
    const pareceCob = ap || ehCobaia(tk);
    if (!pareceCob || !A().meu || tk.s === A().meu) return '';
    return `<div class="acoes fil-jog"><button type="button" data-fil-desconfiar>🤨 Desconfiar</button></div>`;
  }
  if (!ehFilho(tk)) return '';
  const c = cfgDe(tk.s);
  let h = `<details class="fil-cartao" open><summary>Características</summary>${resumoCfg(c)}${estadoTk(tk)}`;
  if (c) h += htmlBotoes(id, tk, c);
  if (v.aux) h += `<div class="acoes"><button type="button" data-fil-foco class="${focoAtual() === id ? 'on' : ''}">${focoAtual() === id ? '👁 Vendo pelos sentidos dele · voltar à vista do robô' : '👁 Ver o mapa pelos sentidos dele'}</button></div>`;
  if (v.mestre) {
    if (c && pas(c, 'abraco')) h += `<div class="acoes"><button type="button" data-fil-abraco>🤱 Abraço: marcar cobaia agarrada</button></div>`;
    if (c && (c.ocult === 'sempre' || c.ocult === 'teto' || c.ocult === 'parede')) h += `<div class="acoes"><button type="button" data-fil-revelar>${tk.rv ? '🙈 Esconder de novo (ocultação especial)' : '👁 Revelar nesta sala (achado ou atacou)'}</button></div>`;
    const en = ((A().segredos._filhos || {})[tk.s] || {}).enigma;
    if (en) h += `<p class="fil-enigma"><b>Enigma (só você vê):</b> ${esc(en)}</p>`;
  }
  return h + '</details>';
}
function ligarCartao(c, id) {
  $$('[data-fil-hab]', c).forEach(b => b.onclick = () => usar(id, b.dataset.filHab));
  const bf = $('[data-fil-foco]', c); if (bf) bf.onclick = () => definirFoco(focoAtual() === id ? null : id);
  const bd = $('[data-fil-desconfiar]', c); if (bd) bd.onclick = () => desconfiarToken(id);
  const ba = $('[data-fil-abraco]', c); if (ba) ba.onclick = () => escolher('Abraço: cobaia agarrada', Object.keys(A().SER).filter(k => SERd(k).tipo === 'cobaia').map(k => [k, SERd(k).nome]), cob => { gravarEstado(['repert', id, cob], agora()); A().aviso(`As frases de ${SERd(cob).nome} entram no repertório.`); });
  const br = $('[data-fil-revelar]', c); if (br) br.onclick = () => { const tk = tokens()[id]; if (!tk) return; const n = { ...tk }; if (tk.rv) delete n.rv; else n.rv = chaveLugar(tk); A().definir(['tokens', id], n); };
}

/* ---------- Jogador: Examinar, Olhar ao redor, Desconfiar, testes pedidos ---------- */
function ativaOuAviso() { const at = FX() && FX().ativa && FX().ativa(); if (!at) { A().aviso('Ative a sua ficha (★ em Fichas) para rolar.'); return null; } return at; }
function testar(per) { const at = ativaOuAviso(); if (!at) return null; return FX().testarPericia(at.d, per); }
const facesHtml = t => `<div class="dados-faces">${(t.dados || []).map(x => `<span class="face${x === t.esc ? ' usada' : ''}">${x}</span>`).join('')}</div>`;
function janelaRes(titulo, t, linha, msg) {
  modal(`<p class="fil-k">${esc(titulo)}</p>${t ? facesHtml(t) : ''}<p>${linha}</p>${msg ? `<p class="fil-msg">${esc(msg)}</p>` : ''}<div class="fil-opcoes"><button class="pri" data-ok>Fechar</button></div>`, m => { $('[data-ok]', m).onclick = fecharModal; });
}
function meuLugar() { const tk = tokens()[A().meu]; if (!tk || !tk.a) return null; const p = salaP(tk); return p ? { tk, a: tk.a, p, cn: I().cnDe(tk.a, p) } : null; }
function examinar() {
  const l = meuLugar(); if (!l) return A().aviso('Entre numa sala para examinar.');
  const t = testar('percepcao'); if (!t) return;
  // a DT vem dos dados do Mestre (publicada sem dizer de quem é); sem ela, o Mestre decide
  const dt = int((pub().cfg || {}).dtEx), ok = dt ? t.total >= dt : null;
  const obj = Object.values(pub().ob || {}).some(o => o && o.a === l.a && I().salaEm(o.a, o.x, o.y) === l.p);
  janelaRes('EXAMINAR A SALA', t, dt ? `Percepção <b>${t.total}</b> contra DT ${dt}: <b>${ok ? 'passou' : 'falhou'}</b>` : `Percepção <b>${t.total}</b>`, ok ? (obj ? 'Algo aqui não estava antes.' : 'Você examina cada canto da sala.') : ok === false ? 'Você não encontra nada.' : 'Você examina a sala. O Mestre dirá se encontrou algo.');
  A().Rede.push('filAcoes', { s: A().meu, t: 'examinar', a: l.a, cn: l.cn, v: t.total, ts: agora() }).pronto.catch(() => {});
  I().postarRolagemSecreta(`${SERd(A().meu).nome} examinou a sala (CN ${pad2(l.cn)}): Percepção ${t.total}${dt ? ' contra DT ' + dt : ''}`);
}
function olharRedor() {
  const l = meuLugar(); if (!l) return A().aviso('Entre numa sala para olhar ao redor.');
  const t = testar('percepcao'); if (!t) return;
  janelaRes('OLHAR AO REDOR', t, `Percepção <b>${t.total}</b>`, 'Você olha ao redor com atenção.');
  A().Rede.push('filAcoes', { s: A().meu, t: 'olhar', a: l.a, cn: l.cn, v: t.total, ts: agora() }).pronto.catch(() => {});
  I().postarRolagemSecreta(`${SERd(A().meu).nome} olhou ao redor (CN ${pad2(l.cn)}): Percepção ${t.total}`);
}
function rolarContra(falso, alvoTxt) {
  const t = testar('intuicao'); if (!t) return;
  const ex = String((pub().cfg || {}).eng || '1d20');
  const m = /^(\d+)d20\s*([+-]\s*\d+)?$/i.exec(ex.replace(/\s/g, ''));
  const op = m ? FX().rolarTeste(int(m[1]), int(m[2] || 0)) : FX().rolarTeste(1, 0);
  const ok = t.total > op.total;
  janelaRes('DESCONFIAR', t, `Intuição <b>${t.total}</b> contra <b>${op.total}</b>: <b>${ok ? 'passou' : 'falhou'}</b>`, ok && falso ? 'Essa voz tem algo errado.' : ok ? 'Nada parece errado.' : 'Você não percebe nada de estranho.');
  I().postarRolagemSecreta(`${SERd(A().meu).nome} desconfiou de ${alvoTxt}: Intuição ${t.total} contra ${op.total}${falso ? (ok ? ' · percebeu' : ' · não percebeu') : ''}`);
}
function desconfiarToken(id) { const tk = tokens()[id]; if (!tk) return; const ap = aparencia(tk); rolarContra(!!ap, ap ? ap.ser.nome : nomeTk(tk)); }
function desconfiarMsg(m) { rolarContra(!!(m.tk && m.tk !== m.a), 'uma mensagem de ' + (m.n || 'alguém')); }
function btnMsg(m, canal) {
  if (!m || canal !== 'geral' || m.d) return '';
  const v = vista();
  if (v.mestre || v.aux) return m.tk && m.tk !== m.a ? `<small class="msg-mimica" title="Mimetismo Vocal">🗣 voz imitada</small>` : '';
  if (!A().meu || !SERd(m.a) || SERd(m.a).tipo !== 'cobaia' || !m._k) return '';
  return `<button class="msg-desconfiar" data-desconfiar="${esc(m._k)}" title="Desconfiar: Intuição" aria-label="Desconfiar desta mensagem">🤨</button>`;
}
// pedidos de teste na tela do jogador
let respondidos = new Set();
try { respondidos = new Set(JSON.parse(localStorage.getItem('acf-fil-resp') || '[]')); } catch (e) {}
function marcarRespondido(k) { respondidos.add(k); try { localStorage.setItem('acf-fil-resp', JSON.stringify([...respondidos].slice(-80))); } catch (e) {} }
const PER_NOME = { vontade: 'Vontade', reflexos: 'Reflexos', furtividade: 'Furtividade', percepcao: 'Percepção' };
function verPedidos() {
  const eu = A().meu; if (!eu || souGM() || $('#filModal')) return;
  const pd = pub().pd || {};
  const k = Object.keys(pd).find(x => { const p = pd[x]; return p && p.al && p.al[eu] && !respondidos.has(x) && agora() - (p.ts || 0) < 600000; });
  if (!k) return;
  const p = pd[k];
  modal(`<p class="fil-k">TESTE</p><h3>${esc(p.txt || 'Algo exige a sua reação.')}</h3><p>Teste de <b>${esc(PER_NOME[p.per] || p.per)}</b>${p.dt ? ` contra <b>DT ${int(p.dt)}</b>` : ''}.</p><div class="fil-opcoes"><button class="pri" data-rolar>🎲 Rolar ${esc(PER_NOME[p.per] || p.per)}</button></div><div id="filRes"></div>`, m => {
    $('.fil-x', m).onclick = () => { marcarRespondido(k); fecharModal(); };
    $('[data-rolar]', m).onclick = () => {
      const t = testar(p.per); if (!t) return;
      const ok = p.dt ? t.total >= int(p.dt) : null;
      marcarRespondido(k);
      A().Rede.set(`filResp/${k}/${eu}`, { t: t.total, ok: ok === null ? -1 : ok, ts: agora() }).catch(() => {});
      I().postarRolagemSecreta(`${SERd(eu).nome}: ${PER_NOME[p.per] || p.per} ${t.total}${p.dt ? ` contra DT ${int(p.dt)} (${ok ? 'passou' : 'falhou'})` : ''}`);
      let efTxt = '';
      if (ok === false && p.ef === 'puxar' && typeof p.px === 'number') {
        const tk = tokens()[eu];
        if (tk && tk.a === p.pa) { A().definir(['tokens', eu], { ...tk, x: p.px, y: p.py }); efTxt = 'Seu corpo é puxado para a sala ao lado.'; }
      }
      if (ok === false && p.ef === 'enredar') efTxt = 'Você fica preso(a) em fios grudentos.';
      $('#filRes', m).innerHTML = `${facesHtml(t)}<p>${esc(PER_NOME[p.per] || p.per)} <b>${t.total}</b>${p.dt ? ` contra DT ${int(p.dt)}: <b>${ok ? 'passou' : 'falhou'}</b>` : ''}</p>${efTxt ? `<p class="fil-msg">${esc(efTxt)}</p>` : ''}<div class="fil-opcoes"><button data-ok>Fechar</button></div>`;
      $('[data-rolar]', m).disabled = true;
      $('[data-ok]', m).onclick = fecharModal;
    };
  });
}
// avisos e mensagens privadas na tela do jogador
let avVisto = 0;
try { avVisto = +localStorage.getItem('acf-fil-av') || 0; } catch (e) {}
function verAvisos() {
  const eu = A().meu; if (!eu || souGM()) return;
  const av = pub().av || {};
  let maior = avVisto;
  const ditos = new Set();
  Object.values(av).sort((x, y) => (x.ts || 0) - (y.ts || 0)).forEach(a => {
    if (!a || !a.al || a.al[eu] === undefined || (a.ts || 0) <= avVisto || agora() - (a.ts || 0) > 60000) return;
    maior = Math.max(maior, a.ts);
    const f = TXT_AVISO[a.t]; if (!f) return;
    const txt = '⚠ ' + f(a.al[eu]); if (ditos.has(txt)) return; ditos.add(txt);
    A().aviso(txt);
    try { navigator.vibrate && navigator.vibrate(a.t === 'tremor' || a.t === 'estrondo' ? [120, 60, 160] : 80); } catch (e) {}
  });
  if (maior !== avVisto) { avVisto = maior; try { localStorage.setItem('acf-fil-av', String(maior)); } catch (e) {} }
}
let offMsg = null, msgDono = '';
function ligarMensagens() {
  const eu = A().meu && !souGM() ? A().meu : '';
  if (eu === msgDono) return;
  if (offMsg) { offMsg(); offMsg = null; }
  const logado = !A().firebase || !!(I().Store.auth && I().Store.auth.currentUser);
  if (eu && (!A().pronto || !logado)) { msgDono = ''; if (logado === false && A().garantirLogin) A().garantirLogin().catch(() => {}); return; }
  msgDono = eu; if (!eu) return;
  const chave = 'acf-fil-msg-' + eu;
  let visto = 0; try { visto = +localStorage.getItem(chave) || 0; } catch (e) {}
  offMsg = A().Rede.on('filMsg/' + eu, v => {
    const novas = Object.values(v || {}).filter(m => m && (m.ts || 0) > visto).sort((x, y) => x.ts - y.ts);
    if (!novas.length) return;
    visto = novas[novas.length - 1].ts; try { localStorage.setItem(chave, String(visto)); } catch (e) {}
    const m = novas[novas.length - 1];
    if (agora() - m.ts > 15 * 60e3) return;
    modal(`<p class="fil-k">${m.k === 'lembranca' ? 'UMA LEMBRANÇA' : 'VOCÊ OUVE'}</p><p class="fil-voz">${esc(m.t)}</p><div class="fil-opcoes"><button class="pri" data-ok>Fechar</button></div>`, mm => { $('[data-ok]', mm).onclick = fecharModal; });
  }, () => { offMsg = null; msgDono = ''; });
}
// leitura de documentos do Arquivo (para o sentido "leitura")
const lidos = {};
function leu(docId) {
  const eu = A().meu; if (!eu || souGM() || !docId) return;
  if (lidos[docId] && agora() - lidos[docId] < 120000) return;
  lidos[docId] = agora();
  const tk = tokens()[eu]; const p = salaP(tk);
  A().Rede.push('leituras', { s: eu, a: tk ? tk.a || 0 : 0, cn: p ? I().cnDe(tk.a, p) : 0, x: tk ? tk.x || 0 : 0, y: tk ? tk.y || 0 : 0, ts: agora() }).pronto.catch(() => {});
}
let leituras = {}, offLeit = null, offResp = null, offAcoes = null;
function ligarGM() {
  if (!souGM() || !A().pronto) return;
  ligarFichas();
  if (!offLeit) offLeit = A().Rede.on('leituras', v => { leituras = v || {}; }, () => { offLeit = null; });
  if (!offResp) offResp = A().Rede.on('filResp', v => { respostas = v || {}; Motor.respostas(); }, () => { offResp = null; });
  if (souMestre() && !offAcoes) offAcoes = A().Rede.on('filAcoes', v => Motor.acoes(v || {}), () => { offAcoes = null; });
}

/* ---------- Marcas no mapa 2D (rastros, raízes, alagada) e sentidos do auxiliar ---------- */
function marcasVivas() {
  const out = [];
  Object.entries(pub().m || {}).forEach(([k, m]) => {
    if (!m || !MARCAS[m.t]) return;
    if (m.t === 'alagada' && m.c !== cena()) return;
    if ((m.t === 'molhado' || m.t === 'lodo') && agora() > (m.ate || 0)) return;
    out.push([k, m]);
  });
  return out;
}
function marcasDaSala(cn) { return marcasVivas().filter(([, m]) => m.cn === cn).map(([, m]) => m.t); }
function lugarRet(m) {
  if (m.cn) { const p = m.cn - 25 * (m.a - 1); return I().retSala(p); }
  if (m.ci !== undefined && I().CORREDORES[m.ci]) return I().CORREDORES[m.ci];
  return null;
}
function visivelLugar(m) {
  const v = vista(); if (v.mestre || v.aux) return true;
  if (m.cn) return I().salaRevelada(m.a, m.cn);
  const k = I().CORREDORES[m.ci]; return !!k && (I().salaRevelada(m.a, I().cnDe(m.a, k.p1)) || I().salaRevelada(m.a, I().cnDe(m.a, k.p2)));
}
function desenharMarcas() {
  const st = I().stage; if (!st) return;
  const a = I().andarAtual, vivas = new Set();
  marcasVivas().forEach(([k, m]) => {
    if (m.a !== a || !visivelLugar(m)) return;
    const r = lugarRet(m); if (!r) return;
    vivas.add(k);
    let d = st.querySelector(`.fil-marca[data-k="${k}"]`);
    if (!d) { d = document.createElement('div'); d.className = 'fil-marca fil-' + m.t; d.dataset.k = k; d.innerHTML = `<span>${MARCAS[m.t][0]} ${esc(MARCAS[m.t][1].split(':')[0])}</span>`; st.appendChild(d); }
    d.style.left = I().px(r.x); d.style.top = I().px(r.y); d.style.width = I().px(r.w); d.style.height = I().px(r.h);
    const fade = (m.t === 'molhado' || m.t === 'lodo') ? Math.max(.25, Math.min(1, ((m.ate || 0) - agora()) / 120000)) : 1;
    d.style.opacity = fade.toFixed(2);
  });
  $$('.fil-marca', st).forEach(d => { if (!vivas.has(d.dataset.k)) d.remove(); });
}
function desenharSentidos(st) {
  const vivos = new Set();
  const add = (k, cls, x, y, html, w, h) => {
    vivos.add(k);
    let d = st.querySelector(`.fil-sent[data-k="${k}"]`);
    if (!d) { d = document.createElement('div'); d.dataset.k = k; st.appendChild(d); }
    d.className = 'fil-sent ' + cls; d.style.left = I().px(x); d.style.top = I().px(y);
    if (w) { d.style.width = I().px(w); d.style.height = I().px(h); }
    if (d.dataset.h !== html) { d.innerHTML = html; d.dataset.h = html; }
  };
  const fid = focoAtual(), f = fid && tokens()[fid], c = f && cfgDe(f.s), a = I().andarAtual;
  if (souAux()) {
    // teias e raízes (o auxiliar sabe onde armou)
    Object.entries(ef().teias || {}).forEach(([k]) => { const m = /^a(\d+)k(\d+)$/.exec(k); if (!m || +m[1] !== a) return; const r = I().CORREDORES[+m[2]]; if (r) add('t' + k, 'fil-teia', r.x, r.y, '<span>🕸</span>', r.w, r.h); });
    Object.keys(ef().raizes || {}).forEach(k => { const cn = +k.slice(1); if (Math.ceil(cn / 25) !== a) return; const r = I().retSala(cn - 25 * (a - 1)); add('r' + k, 'fil-raiz', r.x, r.y, '', r.w, r.h); });
  }
  if (f && c && f.a === a) {
    // faro de sangue: mancha vermelha na sala de cada cobaia machucada (mesmo em silêncio)
    if (sent(c, 'faro')) cobaiasNoAndar(a).forEach(([cid, t]) => { if (!machucada(t)) return; const p = salaP(t); const q = p ? centroSala(p) : { x: t.x, y: t.y }; add('f' + cid, 'fil-faro', q.x, q.y, ''); });
    // leitura: onde cada cobaia estava quando abriu um documento
    if (sent(c, 'leitura')) Object.entries(leituras).forEach(([k, l]) => { if (!l || l.a !== a || agora() - (l.ts || 0) > LEITURA_MIN * 60e3) return; add('l' + k, 'fil-leit', l.x, l.y, `<span>📖 ${esc((SERd(l.s) || {}).nome || '?')}</span>`); });
    // covil / ninho
    covis(c).forEach(cn => { if (Math.ceil(cn / 25) !== a) return; const r = I().retSala(cn - 25 * (a - 1)); add('cv' + cn, 'fil-covil', r.x, r.y, '<span>covil</span>', r.w, r.h); });
  }
  $$('.fil-sent', st).forEach(d => { if (!vivos.has(d.dataset.k)) d.remove(); });
}
function semAudicao() {
  const fid = focoAtual(); if (!fid) return '';
  const c = cfgDe(tokens()[fid].s);
  return c && !sent(c, 'audicao') && !sent(c, 'audicao_precisa') ? 'Este Filho não ouve os sons: só os outros sentidos dele.' : '';
}
function linhasEscuta(atuais) {
  const fid = focoAtual(); if (!fid) return '';
  const f = tokens()[fid], c = cfgDe(f.s);
  let h = `<li class="fil-foco"><b>👁 Sentidos de ${esc(rotuloGM(f))}</b>: ${esc(c ? Object.keys(c.sent || {}).filter(k => c.sent[k]).map(k => NOME_SENT[k] || k).join(', ') || 'nenhum' : 'sem características')}</li>`;
  if (c && sent(c, 'audicao_precisa')) atuais.filter(e => e.teste && e.ids && e.ids.length).forEach((e, i) => { h += `<li class="fil-teste">Som baixo ${e.p ? 'numa sala' : 'num corredor'} · <button type="button" data-fil-ouvir="${esc(e.ids.join(','))}">Pedir teste (Percepção contra Furtividade)</button></li>`; });
  if (c && sent(c, 'leitura')) {
    const l = Object.values(leituras).filter(x => x && x.a === f.a && agora() - (x.ts || 0) < LEITURA_MIN * 60e3).sort((x, y) => y.ts - x.ts);
    h += l.length ? l.slice(0, 6).map(x => `<li>📖 ${esc((SERd(x.s) || {}).nome || '?')} abriu um documento ${x.cn ? 'na CN ' + pad2(x.cn) : 'num corredor'} · há ${Math.max(1, Math.round((agora() - x.ts) / 60000))} min</li>`).join('') : '<li class="vazio">Ninguém abriu documentos do Arquivo nos últimos minutos.</li>';
  }
  return h;
}
function ligarEscuta(lista) {
  $$('[data-fil-ouvir]', lista).forEach(b => b.onclick = () => {
    const ids = b.dataset.filOuvir.split(',').filter(Boolean), fid = focoAtual(); if (!fid) return;
    const f = tokens()[fid], pc = percepcaoDaFicha(f.s);
    const ir = t => { pedirTeste({ per: 'furtividade', dt: t.total, al: Object.fromEntries(ids.map(i => [i, 1])), ef: 'exato', txt: 'Um silêncio atento, perto demais.' }); logFilhos(`${rotuloGM(f)} pediu teste: Percepção ${t.total} contra a Furtividade de ${ids.map(i => SERd(i).nome).join(', ')}`); A().aviso(`Percepção ${t.total}: pedido enviado.`); };
    if (pc) ir(FX().rolarTeste(pc.dados, pc.bonus));
    else pedirTexto('Percepção do Filho', 'Bônus de Percepção (a ficha ligada não tem "Percepção XdY+Z")', '0', v => ir(FX().rolarTeste(1, int(v))), true);
  });
}

/* ---------- Bloco "Sons na Caixa" do auxiliar: escolher o Filho em foco ---------- */
function desenharBlocoSons() {
  const b = $('#blocoSons'); if (!b) return;
  let d = $('#filFoco', b);
  if (!souAux()) { if (d) d.remove(); return; }
  if (!d) { d = document.createElement('div'); d.id = 'filFoco'; d.className = 'fil-foco-sel'; const ul = $('#escutaAux', b); b.insertBefore(d, ul); }
  const a = I().andarAtual;
  const fs = Object.entries(tokens()).filter(([, t]) => ehFilho(t) && t.a === a).sort((x, y) => x[0].localeCompare(y[0]));
  const f = focoAtual();
  const html = `<label class="campo-linha">Ver pelos sentidos de <select id="filFocoSel"><option value="">Robô S.T.A.F.F. (vê tudo)</option>${fs.map(([id, t]) => `<option value="${esc(id)}" ${id === f ? 'selected' : ''}>${esc(rotuloGM(t))}${temCfg(t) ? '' : ' (sem características)'}</option>`).join('')}</select></label>`;
  if (d.dataset.h !== html) { d.innerHTML = html; d.dataset.h = html; $('#filFocoSel', d).onchange = e => definirFoco(e.target.value); }
}

/* ---------- Bloco do jogador: ações na sala e aviso do dia par ---------- */
function desenharBlocoJogador() {
  const b = $('#blocoMinha'); if (!b) return;
  let d = $('#filJog', b);
  const eu = A().meu;
  if (!eu || souGM()) { if (d) d.remove(); return; }
  if (!d) { d = document.createElement('div'); d.id = 'filJog'; d.className = 'fil-jog-bloco'; const ref = $('#btnAbrirLoja', b); b.insertBefore(d, ref); }
  const l = meuLugar();
  const dp = pub().dp ? '<p class="fil-diapar" title="Você não ouve o próprio barulho">Dia par: −5 em Furtividade</p>' : '';
  const sil = chatBloqueado() ? '<p class="fil-surdo">🔇 Você não ouve nada (1 rodada).</p>' : '';
  const marcas = l ? marcasDaSala(l.cn).map(t => `<span>${MARCAS[t][0]} ${esc(MARCAS[t][1])}</span>`).join('') : '';
  const html = `${dp}${sil}${marcas ? `<p class="fil-marcas-sala">${marcas}</p>` : ''}<div class="fil-acoes-jog"><button type="button" class="btn-fantasma" data-fil-ex ${l ? '' : 'disabled'}>🔍 Examinar a sala</button><button type="button" class="btn-fantasma" data-fil-olhar ${l ? '' : 'disabled'}>👀 Olhar ao redor</button></div>`;
  if (d.dataset.h !== html) { d.innerHTML = html; d.dataset.h = html; $('[data-fil-ex]', d).onclick = examinar; $('[data-fil-olhar]', d).onclick = olharRedor; }
}
// chat: aviso de surdez em cima da lista
function desenharChatSurdo() {
  const p = $('#painelChat'); if (!p) return;
  const txt = chatBloqueado();
  p.classList.toggle('chat-surdo', !!txt);
  let d = $('#filChatSurdo', p);
  if (txt && !d) { d = document.createElement('div'); d.id = 'filChatSurdo'; d.className = 'fil-chat-surdo'; d.textContent = '🔇 ' + txt; const l = $('#chatLista', p); if (l) l.parentNode.insertBefore(d, l); }
  if (!txt && d) d.remove();
}

/* ---------- Cartão da sala (etiquetas para o Mestre; marcas para todos) ---------- */
function htmlEtiquetas(chk, nomeAttr, editar) {
  return `<div class="fil-tags">${ETIQUETAS.map(([k, n]) => editar ? `<label><input type="checkbox" ${nomeAttr}="${k}" ${chk[k] ? 'checked' : ''}><span>${n}</span></label>` : (chk[k] ? `<span class="on">${n}</span>` : '')).join('')}</div>`;
}
const ganchoSala = {
  mestre(cn) {
    const t = tagsSala(cn), mk = marcasDaSala(cn);
    return `<details class="fil-sala"><summary>Etiquetas dos Filhos <span class="so-mestre">só Mestre e auxiliares</span></summary>${htmlEtiquetas(t, 'data-fil-tag', true)}${mk.length ? `<p class="mini">${mk.map(x => MARCAS[x][0] + ' ' + esc(MARCAS[x][1])).join(' · ')} <button type="button" data-fil-limpar="${cn}">limpar</button></p>` : ''}</details>`;
  },
  publico(cn) {
    const mk = marcasDaSala(cn).map(x => `<span>${MARCAS[x][0]} ${esc(MARCAS[x][1])}</span>`).join('');
    let h = mk ? `<p class="fil-marcas-sala">${mk}</p>` : '';
    if (souAux()) { const t = tagsSala(cn); if (Object.keys(t).some(k => t[k])) h += `<p class="mini">Etiquetas: </p>${htmlEtiquetas(t, '', false)}`; }
    const l = meuLugar();
    if (A().meu && !souGM() && l && l.cn === cn) h += `<div class="acoes fil-acoes-jog"><button type="button" data-fil-ex2>🔍 Examinar a sala</button><button type="button" data-fil-olhar2>👀 Olhar ao redor</button></div>`;
    return h;
  },
  ligar(c, cn, publico) {
    $$('[data-fil-tag]', c).forEach(i => i.onchange = () => { I().Priv.gravar(['etiquetas', 'salas', 'c' + cn, i.dataset.filTag], i.checked ? true : null); });
    const bl = $('[data-fil-limpar]', c); if (bl) bl.onclick = () => { marcasVivas().forEach(([k, m]) => { if (m.cn === cn) gravarPub(['m', k], null); }); gravarEstado(['raizes', 'c' + cn], null); };
    const be = $('[data-fil-ex2]', c); if (be) be.onclick = examinar;
    const bo = $('[data-fil-olhar2]', c); if (bo) bo.onclick = olharRedor;
  },
};
function htmlCorredor(a, ci) {
  const v = vista(); if (!v.mestre && !v.aux) return '';
  const t = tagsCorr(a, ci), teia = (ef().teias || {})['a' + a + 'k' + ci];
  return `<div class="fil-sala"><p class="so-mestre-txt">Etiquetas dos Filhos${v.mestre ? '' : ' (só leitura)'}:</p>${htmlEtiquetas(t, 'data-fil-ctag', v.mestre)}${teia ? `<p class="mini">🕸 Teia armada aqui. <button type="button" data-fil-tirar-teia>tirar</button></p>` : ''}</div>`;
}
function ligarCorredor(c, a, ci) {
  $$('[data-fil-ctag]', c).forEach(i => i.onchange = () => { I().Priv.gravar(['etiquetas', 'corr', 'a' + a + 'k' + ci, i.dataset.filCtag], i.checked ? true : null); });
  const bt = $('[data-fil-tirar-teia]', c); if (bt) bt.onclick = () => gravarEstado(['teias', 'a' + a + 'k' + ci], null);
}

/* ---------- Bloco do Mestre: características de cada Filho, importar e exportar ---------- */
let filSel = '';
function blocoMestre() {
  let b = $('#blocoFilhosM');
  if (!souMestre() || vista().aux || vista().meu) { if (b) b.hidden = true; return; }
  if (!b) {
    b = document.createElement('section'); b.className = 'bloco mestre-only fil-bloco'; b.id = 'blocoFilhosM'; b.dataset.aba = 'segredos';
    const ref = $('#blocoFuncoes'); ref ? ref.parentNode.insertBefore(b, ref) : $('#painel').appendChild(b);
    const abaAtual = ($('#abasMestre button.ativo') || {}).dataset; if (abaAtual && abaAtual.aba) b.classList.toggle('fora-da-aba', abaAtual.aba !== 'segredos');
  }
  b.hidden = false;
  if (b.contains(document.activeElement) && document.activeElement.matches('input, textarea, select')) return;
  const filhos = (A().SERES || []).filter(s => s.tipo === 'filho');
  if (!filSel) filSel = (filhos.find(s => cfgDe(s.id)) || filhos[0] || {}).id || '';
  const c = cfgDe(filSel) || {};
  const n = Object.keys(cfgs()).length, ns = Object.keys(etq().salas || {}).length, nc = Object.keys(etq().corr || {}).length;
  const ck = (grupo, k, on) => `<label><input type="checkbox" data-fc="${grupo}.${k}" ${on ? 'checked' : ''}><span></span></label>`;
  const lista = (grupo, itens, obj) => `<div class="fil-chks">${itens.map(([k, nome, d]) => `<label title="${esc(d || '')}"><input type="checkbox" data-fc="${grupo}.${k}" ${obj && obj[k] ? 'checked' : ''}><span>${esc(nome)}</span></label>`).join('')}</div>`;
  const enig = ((A().segredos._filhos || {})[filSel] || {}).enigma || '';
  const html = `<h2>Características dos Filhos</h2>
    <p class="mini">Sentidos, movimento, rastro, avisos e botões de cada Filho. Fica em <code>privado/filhos</code> (auxiliares leem) e o enigma em <code>segredos</code> (só você). O código do site não sabe quem tem o quê. ${n} Filho(s) com características · ${ns} sala(s) e ${nc} corredor(es) com etiqueta.</p>
    <div class="fil-imp"><button type="button" class="btn-fantasma" data-fm="importar">📥 Importar arquivo…</button><button type="button" class="btn-fantasma" data-fm="exportar">📤 Exportar</button><input type="file" id="filArq" accept=".json,application/json" hidden></div>
    <label class="campo-linha">Filho <select id="filSelM">${filhos.map(s => `<option value="${s.id}" ${s.id === filSel ? 'selected' : ''}>${esc(s.codigo + ' ' + s.nome)}${cfgDe(s.id) ? '' : ' ·'}</option>`).join('')}</select></label>
    <div class="fil-ed">
      <h3>Sentido (o que o auxiliar percebe)</h3>${lista('sent', SENTIDOS, c.sent)}
      <h3>Movimento</h3><select data-fc="mov">${MOVS.map(([k, t]) => `<option value="${k}" ${(c.mov || 'normal') === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>${lista('movx', MODS, c.movx)}
      <h3>Rastro para os jogadores</h3><div class="fil-linha"><select data-fc="rastro"><option value="">Nenhum</option>${Object.entries(RASTROS).map(([k, t]) => `<option value="${k}" ${c.rastro === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select><label>minutos <input type="number" min="1" max="60" data-fc="rastroMin" value="${esc(c.rastroMin || RASTRO_MIN)}"></label></div>
      <h3>Avisos aos jogadores</h3>${lista('avisos', AVISOS, c.avisos)}
      <h3>Ocultação especial</h3><select data-fc="ocult">${OCULT.map(([k, t]) => `<option value="${k}" ${(c.ocult || '') === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
      <h3>Botões (auxiliar e Mestre)</h3>${lista('hab', Object.entries(HABS).map(([k, h]) => [k, h.i + ' ' + h.n + (h.lim === 'cena' ? ' (1/cena)' : h.lim === 'rodadas3' ? ' (a cada 3 rodadas)' : ''), h.d]), c.hab)}
      <h3>Passivos</h3>${lista('pass', PASSIVOS.map(([k, t]) => [k, t.split(':')[0], t]), c.pass)}
      <h3>Números e textos</h3>
      <div class="fil-grade">
        <label>Covil (CN, separados por vírgula)<input data-fc="covil" value="${esc(c.covil || '')}" placeholder="ex.: 61, 31"></label>
        <label>Bando: Filho e dado<span class="fil-linha"><select data-fc="bando.ser"><option value="">o mesmo</option>${filhos.map(s => `<option value="${s.id}" ${(c.bando || {}).ser === s.id ? 'selected' : ''}>${esc(s.codigo + ' ' + s.nome)}</option>`).join('')}</select><input data-fc="bando.dado" value="${esc((c.bando || {}).dado || '1d4')}" size="5"></span></label>
        <label>Ninhada: Filho e dado<span class="fil-linha"><select data-fc="ninhada.ser"><option value="">o mesmo</option>${filhos.map(s => `<option value="${s.id}" ${(c.ninhada || {}).ser === s.id ? 'selected' : ''}>${esc(s.codigo + ' ' + s.nome)}</option>`).join('')}</select><input data-fc="ninhada.dado" value="${esc((c.ninhada || {}).dado || '1d4')}" size="5"></span></label>
        <label>DT de Ouvir o Coração<input type="number" data-fc="coracaoDT" value="${esc(c.coracaoDT || '')}"></label>
        <label>DT de Puxar os fios (vazio: pergunta)<input type="number" data-fc="fiosDT" value="${esc(c.fiosDT || '')}"></label>
        <label>DT da Teia (Reflexos; vazio: você decide)<input type="number" data-fc="teiaDT" value="${esc(c.teiaDT || '')}"></label>
        <label>DT de Examinar a sala<input type="number" data-fc="examinarDT" value="${esc(c.examinarDT || '')}"></label>
        <label>DT de Olhar ao redor (vazio: você decide)<input type="number" data-fc="olharDT" value="${esc(c.olharDT || '')}"></label>
        <label>Desconfiar: rolagem do Filho<input data-fc="desconfiar" value="${esc(c.desconfiar || '')}" placeholder="ex.: 2d20+10"></label>
        <label>Alcance da audição (m)<input type="number" data-fc="alcAud" value="${esc(c.alcAud || '')}" placeholder="${ALC_LONGO}"></label>
        <label>Detalhe da cópia<select data-fc="detalhe">${DETALHES.map(([k, t]) => `<option value="${k}" ${(c.detalhe || '') === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      </div>
      <label class="fil-campo">Lembranças (uma por linha; o auxiliar escolhe)<textarea data-fc="lembrancas" rows="3">${esc(c.lembrancas || '')}</textarea></label>
      <label class="fil-campo">Notas (só Mestre e auxiliares)<textarea data-fc="nota" rows="2">${esc(c.nota || '')}</textarea></label>
      <label class="fil-campo">Enigma: a fraqueza (só você vê)<textarea id="filEnigma" rows="3">${esc(enig)}</textarea></label>
      <p class="mini">As etiquetas das salas (água, barulhenta, estreito, quadros, ninho) ficam no cartão de cada sala e de cada corredor.</p>
    </div>`;
  if (b.dataset.h === html) return;
  b.dataset.h = html; b.innerHTML = html;
  $('#filSelM', b).onchange = e => { filSel = e.target.value; b.dataset.h = ''; blocoMestre(); };
  $$('[data-fc]', b).forEach(i => i.onchange = () => {
    const cam = i.dataset.fc.split('.');
    let v = i.type === 'checkbox' ? (i.checked || null) : i.type === 'number' ? (i.value === '' ? null : +i.value) : (i.value.trim() || null);
    if (cam[0] === 'mov' && v === 'normal') v = null;
    I().Priv.gravar(['filhos', filSel].concat(cam), v);
  });
  $('#filEnigma', b).onchange = e => A().gravarSegredo(['_filhos', filSel, 'enigma'], e.target.value.trim() || null);
  $('[data-fm="exportar"]', b).onclick = exportar;
  $('[data-fm="importar"]', b).onclick = () => $('#filArq', b).click();
  $('#filArq', b).onchange = e => { const f = e.target.files[0]; if (f) importar(f); e.target.value = ''; };
}
function exportar() {
  const dados = { tipo: 'planta-acf-filhos', versao: 1, aviso: 'Características secretas dos Filhos. NUNCA envie este arquivo ao GitHub.', exportado: new Date().toISOString(), filhos: cfgs(), etiquetas: etq(), enigmas: Object.fromEntries(Object.entries(A().segredos._filhos || {}).map(([k, v]) => [k, (v || {}).enigma || '']).filter(([, v]) => v)) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'filhos-regras.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function importar(arq) {
  const r = new FileReader();
  r.onload = () => {
    let d; try { d = JSON.parse(r.result); } catch (e) { A().aviso('Arquivo inválido.'); return; }
    if (!d || d.tipo !== 'planta-acf-filhos' || typeof d.filhos !== 'object') { A().aviso('Este arquivo não é das características dos Filhos (tipo planta-acf-filhos).'); return; }
    const nf = Object.keys(d.filhos || {}).filter(k => SERd(k) && SERd(k).tipo === 'filho');
    if (!confirm(`Importar as características de ${nf.length} Filho(s)${d.etiquetas ? ' e as etiquetas das salas' : ''}? Substitui o que estiver salvo para eles.`)) return;
    nf.forEach(k => I().Priv.gravar(['filhos', k], d.filhos[k]));
    if (d.etiquetas) I().Priv.gravar(['etiquetas'], d.etiquetas);
    Object.entries(d.enigmas || {}).forEach(([k, v]) => { if (SERd(k)) A().gravarSegredo(['_filhos', k, 'enigma'], String(v || '') || null); });
    A().aviso(`Características importadas: ${nf.length} Filho(s).`);
    const b = $('#blocoFilhosM'); if (b) b.dataset.h = '';
    setTimeout(blocoMestre, 300);
  };
  r.readAsText(arq);
}

/* =========================================================
   MOTOR (roda só na tela do Mestre): rastros, avisos, ocultação especial,
   teias, estudo da Forma de Objeto, Examinar/Olhar dos jogadores, dia par.
   Como o robô dos auxiliares, depende da tela do Mestre aberta.
   ========================================================= */
const Motor = {
  ant: {}, antCob: {}, atk: {}, cenaAnt: null, limpo: 0, vistasAcoes: new Set(), respVistas: new Set(), barulho: {},
  rodar() {
    if (!souMestre() || I().espiar || !I().Priv.pronto) return;
    const tks = tokens(), c0 = cena();
    if (this.cenaAnt === null) this.cenaAnt = c0;
    // 1. Filhos: mudança de lugar, ocultação especial, publicar pedidos do auxiliar
    Object.entries(tks).forEach(([id, tk]) => {
      if (!ehFilho(tk) || !tk.a) return;
      const c = cfgDe(tk.s), lugar = chaveLugar(tk), ant = this.ant[id];
      if (ant && (ant.a !== tk.a || ant.l !== lugar)) this.moveu(id, tk, ant, c);
      this.ant[id] = { a: tk.a, l: lugar, x: tk.x, y: tk.y, p: salaP(tk), ci: corrTk(tk) };
      const n = { ...tk };
      if (n.rv && n.rv !== lugar) delete n.rv;
      // ataque (Controle) revela a ocultação especial nesta sala; o primeiro estado visto só é anotado
      const fts = tk.fx && tk.fx.t === 'atk' ? tk.fx.ts || 0 : 0;
      if (this.atk[id] === undefined) this.atk[id] = fts;
      else if (fts > this.atk[id]) { this.atk[id] = fts; if (c && c.ocult && c.ocult !== 'pisca') n.rv = lugar; }
      const oc = !!c && !n.fo && ((c.ocult === 'teto' || c.ocult === 'sempre') ? n.rv !== lugar : c.ocult === 'parede' ? !!(cnTk(tk) && tagsSala(cnTk(tk)).quadros) && n.rv !== lugar : false);
      if (oc) n.oc = 1; else delete n.oc;
      if (c && c.ocult === 'pisca') n.pi = 1; else delete n.pi;
      if (n.pp) delete n.pp;
      // token no caminho errado (o auxiliar não move entre o público e o privado): a tela do Mestre corrige
      const St = I().Store, naPub = !!(St.pub && St.pub.tokens && St.pub.tokens[id]), naPriv = !!(St.privTok && St.privTok[id]);
      const errado = A().firebase && (I().ehPrivado(n) ? naPub : (naPriv && !naPub));
      if (errado || JSON.stringify(n) !== JSON.stringify(tk)) A().definir(['tokens', id], n);
    });
    // 2. cobaias: teias, "você se sente observado", quem viu quem
    Object.entries(tks).forEach(([id, tk]) => {
      if (!ehCobaia(tk) || !tk.a) return;
      const lugar = chaveLugar(tk), ant = this.antCob[id];
      this.antCob[id] = lugar;
      if (ant === undefined || ant === lugar) return;
      const teia = (ef().teias || {})[lugar];
      if (teia && /^a\d+k\d+$/.test(lugar)) this.teia(id, tk, lugar, teia);
      this.observado([id], tk.a, salaP(tk));
    });
    // quem viu cada Filho revelado (Lembrança)
    Object.entries(tks).forEach(([id, tk]) => {
      if (!ehFilho(tk) || tk.h || tk.oc || tk.fo || !hab(cfgDe(tk.s), 'lembranca')) return;
      const p = salaP(tk); if (!p) return;
      cobaiasNoAndar(tk.a).forEach(([cid, t]) => { if (salaP(t) === p && !((ef().viu || {})[id] || {})[cid]) gravarEstado(['viu', id, cid], agora()); });
    });
    // 3. estudo da Forma de Objeto: a cena inteira na mesma sala que a cobaia
    if (c0 !== this.cenaAnt) { this.novaCena(this.cenaAnt, c0); this.cenaAnt = c0; }
    Object.entries(tks).forEach(([id, tk]) => {
      if (!ehFilho(tk) || !hab(cfgDe(tk.s), 'estudar')) return;
      const e = (ef().estudo || {})[id];
      if (!tk.fo) { if (e) gravarEstado(['estudo', id], null); return; }
      const lugar = chaveLugar(tk);
      if (!e || e.cena !== c0 || e.sala !== lugar) { if (!e || e.sala !== lugar || e.cena !== c0) gravarEstado(['estudo', id], { cena: c0, sala: lugar, parcial: true, ts: agora() }); return; }
      if (e.parcial || !e.cands) return;
      const aqui = new Set(cobaiasNoAndar(tk.a).filter(([, t]) => chaveLugar(t) === lugar).map(([k]) => k));
      const resto = Object.keys(e.cands).filter(k => aqui.has(k));
      if (resto.length !== Object.keys(e.cands).length) gravarEstado(['estudo', id, 'cands'], resto.length ? Object.fromEntries(resto.map(k => [k, 1])) : null);
    });
    // audição precisa: estrondo no andar dá movimento dobrado na próxima vez (som de quem está surdo não conta)
    const grupos = [...I().gruposDeSala().values()];
    Object.entries(tks).forEach(([id, tk]) => {
      if (!ehFilho(tk) || !sent(cfgDe(tk.s), 'audicao_precisa')) return;
      const alto = grupos.some(gr => gr.a === tk.a && gr.p && I().nivelDe(semSilenciados(gr.ids).length + (gr.extra || 0)) >= 3);
      const db = (ef().dobro || {})[id];
      if (alto && !(db && db.r >= rodada() + 1 && agora() - (db.ts || 0) < 60000)) gravarEstado(['dobro', id], { r: rodada() + 1, ts: agora() });
    });
    // 4. publicações: dia par, números públicos (Examinar, Desconfiar), barulho de quem se esconde em sala barulhenta
    const d = (est().ruido || {}).d || 1;
    const dp = d % 2 === 0 && Object.values(tks).some(t => ehFilho(t) && mod(cfgDe(t.s), 'diaPar')) ? 1 : null;
    if ((pub().dp || null) !== dp) gravarPub(['dp'], dp);
    const cfgP = {};
    Object.values(cfgs()).forEach(c => { if (c && c.desconfiar && hab(c, 'copiar') && !cfgP.eng) cfgP.eng = String(c.desconfiar).slice(0, 20); if (c && c.examinarDT && !cfgP.dtEx) cfgP.dtEx = int(c.examinarDT); });
    if (JSON.stringify(pub().cfg || {}) !== JSON.stringify(cfgP)) gravarPub(['cfg'], Object.keys(cfgP).length ? cfgP : null);
    if (Object.values(cfgs()).some(c => mod(c, 'proibeBarulhenta'))) {
      Object.values(tks).forEach(t => {
        if (!ehCobaia(t) || !t.esq) return; const p = salaP(t), cn = p && I().cnDe(t.a, p); if (!cn || !tagsSala(cn).barulhenta) return;
        const k = t.a + ':' + p; if (agora() - (this.barulho[k] || 0) < 60000) return; this.barulho[k] = agora(); A().definir(['barulho', k], agora());
      });
    }
    // sem sinal (segredo do Mestre) espelhado para os auxiliares: o "só no escuro" precisa saber
    const ss = Object.fromEntries(Object.keys(A().segredos._semSinal || {}).filter(k => (A().segredos._semSinal || {})[k]).map(k => [k, true]));
    if (JSON.stringify(ef().semSinal || {}) !== JSON.stringify(ss)) gravarEstado(['semSinal'], Object.keys(ss).length ? ss : null);
    if (agora() - this.limpo > 15000) { this.limpo = agora(); this.limpar(); }
  },
  moveu(id, tk, ant, c) {
    const l = { a: tk.a, p: salaP(tk), ci: corrTk(tk) };
    // passou por porta fechada? (arrombar ou pelos dutos)
    let ci = l.ci >= 0 ? l.ci : ant.ci >= 0 ? ant.ci : (l.p && ant.p && ant.a === tk.a ? corredorEntre(ant.p, l.p) : -1);
    const fechada = ci >= 0 && ant.a === tk.a && !I().portaAberta(tk.a, ci);
    if (!c) return;
    // rastro: o lugar de onde saiu e o lugar aonde chegou
    if (c.rastro && RASTROS[c.rastro]) {
      const ate = agora() + (int(c.rastroMin) || RASTRO_MIN) * 60000;
      const marca = (a, p, cc) => { if (p) { const cn = I().cnDe(a, p); gravarPub(['m', c.rastro.slice(0, 2) + cn], { t: c.rastro, a, cn, ts: agora(), ate }); } else if (cc >= 0) gravarPub(['m', c.rastro.slice(0, 2) + 'a' + a + 'k' + cc], { t: c.rastro, a, ci: cc, ts: agora(), ate }); };
      if (ant.a === tk.a) marca(ant.a, ant.p, ant.ci);
      marca(l.a, l.p, l.ci);
    }
    if (!mod(c, 'silencioso')) {
      const av = c.avisos || {};
      if (av.tremor) { const al = {}; cobaiasNoAndar(tk.a).forEach(([cid, t]) => { al[cid] = rumo4(tk.x - t.x, tk.y - t.y); }); this.aviso('tremor', tk.a, al); }
      if ((av.forro || av.aproxima) && l.p) { const viz = vizinhas(l.p), al = {}; cobaiasNoAndar(tk.a).forEach(([cid, t]) => { if (viz.includes(salaP(t))) al[cid] = 1; }); if (av.forro) this.aviso('forro', tk.a, al); if (av.aproxima) this.aviso('aproxima', tk.a, al); }
    }
    if (av2(c, 'observado') && l.p) this.observado(cobaiasNoAndar(tk.a).filter(([, t]) => salaP(t) === l.p).map(([k]) => k), tk.a, l.p, id);
    if (fechada && mod(c, 'arromba')) {
      const al = {}; cobaiasNoAndar(tk.a).forEach(([cid, t]) => { al[cid] = rumo4(tk.x - t.x, tk.y - t.y); }); this.aviso('estrondo', tk.a, al);
      const k = I().CORREDORES[ci]; if (k) { A().definir(['barulho', tk.a + ':' + k.p1], agora()); A().definir(['barulho', tk.a + ':' + k.p2], agora()); }
    }
    if ((ef().dutos || {})[id] && l.p && ant.p && l.p !== ant.p) gravarEstado(['dutos', id], null);
  },
  obs: {},
  observado(cobs, a, p, filhoId) {
    if (!p) return;
    cobs = cobs.filter(k => { const kk = k + ':' + a + ':' + p; if (agora() - (this.obs[kk] || 0) < 20000) return false; return true; });
    if (!cobs.length) return;
    const tem = Object.entries(tokens()).some(([fid, t]) => (!filhoId || fid === filhoId) && ehFilho(t) && t.a === a && salaP(t) === p && av2(cfgDe(t.s), 'observado'));
    if (!tem) return;
    cobs.forEach(k => { this.obs[k + ':' + a + ':' + p] = agora(); });
    this.aviso('observado', a, Object.fromEntries(cobs.map(k => [k, 1])));
  },
  aviso(t, a, al) { if (!Object.keys(al).length) return; gravarPub(['av', 'v' + novaChave().slice(-10)], { t, a, al, ts: agora() }); },
  teia(cob, tk, lugar, teia) {
    const f = tokens()[teia.tk], c = f ? cfgDe(f.s) || {} : {};
    gravarEstado(['teias', lugar], null);
    gravarEstado(['teiaHit', lugar], { s: cob, a: tk.a, x: tk.x, y: tk.y, ts: agora() });
    const dt = int(c.teiaDT) || 0;
    pedirTeste(dt ? { per: 'reflexos', dt, al: { [cob]: 1 }, ef: 'enredar', txt: 'Algo gruda nas suas pernas.' } : { per: 'reflexos', al: { [cob]: 1 }, ef: 'enredar', txt: 'Algo gruda nas suas pernas.' });
    A().alertaMestre(`🕸 ${SERd(cob).nome} pisou numa teia${dt ? ` (Reflexos DT ${dt})` : ' (Reflexos: você decide a DT)'}.`);
  },
  novaCena(antes, nova) {
    Object.entries(tokens()).forEach(([id, tk]) => {
      if (!ehFilho(tk) || !tk.fo) return;
      const e = (ef().estudo || {})[id], lugar = chaveLugar(tk);
      if (e && e.cena === antes && e.sala === lugar && !e.parcial && e.cands) Object.keys(e.cands).forEach(cob => gravarEstado(['estudaveis', id, cob], agora()));
      const aqui = cobaiasNoAndar(tk.a).filter(([, t]) => chaveLugar(t) === lugar).map(([k]) => k);
      gravarEstado(['estudo', id], { cena: nova, sala: lugar, cands: aqui.length ? Object.fromEntries(aqui.map(k => [k, 1])) : null, ts: agora() });
    });
    marcasVivas(); Object.entries(pub().m || {}).forEach(([k, m]) => { if (m && m.t === 'alagada' && m.c !== nova) gravarPub(['m', k], null); });
  },
  acoes(v) {
    Object.entries(v).forEach(([k, x]) => {
      if (this.vistasAcoes.has(k)) return; this.vistasAcoes.add(k);
      if (!x || agora() - (x.ts || 0) > 600000) { A().Rede.set('filAcoes/' + k, null).catch(() => {}); return; }
      const p = x.cn - 25 * (x.a - 1);
      Object.entries(tokens()).forEach(([id, tk]) => {
        if (!ehFilho(tk) || tk.a !== x.a || salaP(tk) !== p) return;
        const c = cfgDe(tk.s); if (!c) return;
        if (x.t === 'examinar' && c.ocult === 'teto' && tk.oc) {
          const dt = int(c.examinarDT) || int((pub().cfg || {}).dtEx);
          if (dt && x.v >= dt) { A().definir(['tokens', id], { ...tk, rv: chaveLugar(tk) }); A().alertaMestre(`🔍 ${SERd(x.s).nome} examinou a CN ${pad2(x.cn)} e achou ${rotuloGM(tk)}.`); }
          else if (!dt) A().alertaMestre(`🔍 ${SERd(x.s).nome} examinou a CN ${pad2(x.cn)}: Percepção ${x.v}. ${rotuloGM(tk)} está oculto ali. Revele no cartão dele se passou.`);
        }
        if (x.t === 'olhar' && c.ocult === 'sempre' && tk.oc) {
          const dt = int(c.olharDT);
          if (dt && x.v >= dt) { A().definir(['tokens', id], { ...tk, rv: chaveLugar(tk) }); gravarEstado(['trava', id], rodada() + 1); A().alertaMestre(`👀 ${SERd(x.s).nome} olhou ao redor (${x.v}) e revelou ${rotuloGM(tk)}: parado no próximo turno.`); }
          else if (!dt) A().alertaMestre(`👀 ${SERd(x.s).nome} olhou ao redor na CN ${pad2(x.cn)}: Percepção ${x.v}. ${rotuloGM(tk)} está oculto ali. Revele no cartão dele se passou.`);
        }
      });
      A().Rede.set('filAcoes/' + k, null).catch(() => {});
    });
  },
  respostas() {
    if (!souMestre()) return;
    const pd = pub().pd || {};
    Object.entries(respostas).forEach(([k, rs]) => {
      const p = pd[k]; if (!p) return;
      Object.entries(rs || {}).forEach(([cob, r]) => {
        const kk = k + ':' + cob; if (this.respVistas.has(kk) || !r) return; this.respVistas.add(kk);
        if (agora() - (r.ts || 0) > 600000) return;
        if (p.ef === 'enredar') {
          if (r.ok === false) { A().definir(['cond', cob, 'enredado'], 1); A().alertaMestre(`🕸 ${SERd(cob).nome} falhou em Reflexos (${r.t}): Enredada.`); }
          else if (r.ok === -1) A().alertaMestre(`🕸 ${SERd(cob).nome} rolou Reflexos ${r.t} na teia. Marque Enredada no cartão dela se falhou.`);
        }
      });
    });
  },
  limpar() {
    const pf = pub();
    Object.entries(pf.m || {}).forEach(([k, m]) => { if (m && (m.t === 'molhado' || m.t === 'lodo') && agora() > (m.ate || 0) + 5000) gravarPub(['m', k], null); });
    Object.entries(pf.av || {}).forEach(([k, a]) => { if (!a || agora() - (a.ts || 0) > 120000) gravarPub(['av', k], null); });
    Object.entries(pf.pd || {}).forEach(([k, p]) => { if (!p || agora() - (p.ts || 0) > 900000) { gravarPub(['pd', k], null); A().Rede.set('filResp/' + k, null).catch(() => {}); } });
    if (pf.sil && !silAtivo()) gravarPub(['sil'], null);
    Object.entries(ef().teiaHit || {}).forEach(([k, h]) => { if (!h || agora() - (h.ts || 0) > 240000) gravarEstado(['teiaHit', k], null); });
    Object.entries(ef().dutos || {}).forEach(([k, t]) => { if (agora() - t > 900000) gravarEstado(['dutos', k], null); });
    Object.entries(leituras).forEach(([k, l]) => { if (!l || agora() - (l.ts || 0) > 3600e3) A().Rede.set('leituras/' + k, null).catch(() => {}); });
    // objetos de Forma de Objeto sem dono (token saiu do mapa)
    const donos = new Set(Object.values(ef().obj || {}));
    Object.keys(pf.ob || {}).forEach(k => { if (!donos.has(k)) gravarPub(['ob', k], null); });
    Object.entries(ef().obj || {}).forEach(([id, k]) => { const t = tokens()[id]; if (!t || !t.fo) { gravarEstado(['obj', id], null); if (k) gravarPub(['ob', k], null); } });
  },
};
const av2 = (c, k) => !!(c && c.avisos && c.avisos[k]);

/* ---------- 3D: botões no quadro do Controle ---------- */
function htmlHab(id) {
  const tk = tokens()[id]; if (!tk || !ehFilho(tk) || !souGM()) return '';
  const c = cfgDe(tk.s); if (!c) return '';
  const b = htmlBotoes(id, tk, c, 's3d-fil-btns');
  return b ? `<p class="s3d-fil-t">Características</p>${b}` : '';
}
function ligarHab(el, id) { $$('[data-fil-hab]', el).forEach(b => b.onclick = () => usar(id, b.dataset.filHab)); }

/* ---------- Ciclo ---------- */
let agMotor = null;
// auxiliar na vista de um Filho: o que ele percebe muda com o tempo (testes, leituras, teias); redesenha quando muda
let sigVista = '';
function vigiarVista() {
  if (!souAux()) return;
  const f = focoAtual();
  const sig = f ? Object.entries(tokens()).filter(([, t]) => tipoDe(t) === 'cobaia' || tipoDe(t) === 'npc').map(([id, t]) => id + (veAux(t) ? ':' + marcaSentido(id, t) : '')).join('|') : '';
  if (sig !== sigVista) { const antes = sigVista; sigVista = sig; if (antes || sig) I().atualizarTudo(); }
}
function aoMudar() {
  try {
    ligarGM(); ligarMensagens(); vigiarParados(); vigiarVista();
    desenharMarcas(); desenharBlocoJogador(); desenharBlocoSons(); desenharChatSurdo(); blocoMestre();
    verPedidos(); verAvisos();
  } catch (e) { console.warn('filhos:', e); }
  if (souMestre() && !agMotor) agMotor = setTimeout(() => { agMotor = null; try { Motor.rodar(); } catch (e) { console.warn('filhos motor:', e); } }, 250);
}
function iniciar() {
  if (!window.ACF || !window.ACF._int) { setTimeout(iniciar, 200); return; }
  A().aoMudar(aoMudar);
  A().ganchoSala(ganchoSala);
  document.addEventListener('acf-perfil', () => setTimeout(aoMudar, 50));
  document.addEventListener('acf-segredos', () => setTimeout(aoMudar, 50));
  setInterval(aoMudar, 2500);
  aoMudar();
}

window.ACF_FILHOS = {
  // ganchos usados por app.js e sala3d.js
  percebe, veAux, marcaSentido, ouve, semSilenciados, semAudicao, linhasEscuta, ligarEscuta, desenharSentidos, chatBloqueado,
  limite, travado, bloqueia, ignoraPorta, regente, aparencia, htmlCartao, ligarCartao, htmlCorredor, ligarCorredor,
  btnMsg, desconfiarMsg, htmlHab, ligarHab, usar, leu, limPadrao,
  // para testes e outras telas
  get foco() { return focoAtual(); }, definirFoco, cfgDe, tagsSala, tagsCorr, marcasVivas, exatos, Motor, HABS, SENTIDOS, OBJETOS,
};
iniciar();
})();
