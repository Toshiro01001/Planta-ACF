/* =========================================================
   fichas.js · FICHAS DE AGENTE (Ordem Paranormal)
   Cada jogador cria e edita as próprias fichas. O Mestre vê todas,
   ao vivo, mas não altera nada (as regras do Firebase também barram).
   O Mestre tem as próprias fichas (NPCs) num caminho só dele.

   Onde ficam:
     agentes/<dono>/<chave>   ficha de jogador (dono = id da cobaia)
     agentesMestre/<chave>    fichas do Mestre
   A <chave> é longa e aleatória: só quem tem o código abre a ficha.
   ========================================================= */
(() => {
'use strict';
const A = window.ACF;
if (!A) return;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = A.esc;
const C = (typeof CATALOGO_OP !== 'undefined' && CATALOGO_OP) || { habilidades: [], rituais: [], itens: [], melhorias: [], maldicoes: [] };

/* ---------------- REGRAS ---------------- */
const ATRS = [['agi', 'Agilidade', 'AGI'], ['for', 'Força', 'FOR'], ['int', 'Intelecto', 'INT'], ['pre', 'Presença', 'PRE'], ['vig', 'Vigor', 'VIG']];
// [id, nome, atributo, só treinada, penalidade de carga]
const PERICIAS = [
  ['acrobacia', 'Acrobacia', 'agi', 0, 1], ['adestramento', 'Adestramento', 'pre', 1, 0], ['artes', 'Artes', 'pre', 1, 0],
  ['atletismo', 'Atletismo', 'for', 0, 0], ['atualidades', 'Atualidades', 'int', 0, 0], ['ciencias', 'Ciências', 'int', 1, 0],
  ['crime', 'Crime', 'agi', 1, 1], ['diplomacia', 'Diplomacia', 'pre', 0, 0], ['enganacao', 'Enganação', 'pre', 0, 0],
  ['fortitude', 'Fortitude', 'vig', 0, 0], ['furtividade', 'Furtividade', 'agi', 0, 1], ['iniciativa', 'Iniciativa', 'agi', 0, 0],
  ['intimidacao', 'Intimidação', 'pre', 0, 0], ['intuicao', 'Intuição', 'pre', 0, 0], ['investigacao', 'Investigação', 'int', 0, 0],
  ['luta', 'Luta', 'for', 0, 0], ['medicina', 'Medicina', 'int', 0, 0], ['ocultismo', 'Ocultismo', 'int', 1, 0],
  ['percepcao', 'Percepção', 'pre', 0, 0], ['pilotagem', 'Pilotagem', 'agi', 1, 0], ['pontaria', 'Pontaria', 'agi', 0, 0],
  ['profissao', 'Profissão', 'int', 1, 0], ['reflexos', 'Reflexos', 'agi', 0, 0], ['religiao', 'Religião', 'pre', 1, 0],
  ['sobrevivencia', 'Sobrevivência', 'int', 0, 0], ['tatica', 'Tática', 'int', 1, 0], ['tecnologia', 'Tecnologia', 'int', 1, 0],
  ['vontade', 'Vontade', 'pre', 0, 0],
];
const PER = Object.fromEntries(PERICIAS.map(p => [p[0], p]));
const TREINOS = [[0, 'Destreinado'], [5, 'Treinado'], [10, 'Veterano'], [15, 'Expert']];
// PV, PE, SAN: [inicial, por nível]; o atributo (Vig/Pre) entra no inicial e em cada nível
const CLASSES = {
  combatente: { n: 'Combatente', pv: [20, 4], pe: [2, 2], san: [12, 3], pd: [6, 3], prof: 'Armas simples, armas táticas e proteções leves',
    trilhas: ['Aniquilador', 'Comandante de Campo', 'Guerreiro', 'Operações Especiais', 'Tropa de Choque', 'Agente Secreto', 'Caçador', 'Monstruoso'] },
  especialista: { n: 'Especialista', pv: [16, 3], pe: [3, 3], san: [16, 4], pd: [8, 4], prof: 'Armas simples e proteções leves',
    trilhas: ['Atirador de Elite', 'Infiltrador', 'Médico de Campo', 'Negociador', 'Técnico', 'Bibliotecário', 'Muambeiro', 'Perseverante'] },
  ocultista: { n: 'Ocultista', pv: [12, 2], pe: [4, 4], san: [20, 5], pd: [10, 5], prof: 'Armas simples',
    trilhas: ['Conduíte', 'Flagelador', 'Graduado', 'Intuitivo', 'Lâmina Paranormal', 'Exorcista', 'Parapsicólogo', 'Possuído'] },
  sobrevivente: { n: 'Sobrevivente', pv: [8, 2], pe: [2, 1], san: [8, 2], pd: [4, 2], prof: 'Armas simples', estagio: true,
    trilhas: ['Durão', 'Esperto', 'Esotérico'] },
  mundano: { n: 'Mundano', pv: [8, 0], pe: [1, 0], san: [8, 0], pd: [4, 0], prof: 'Armas simples', trilhas: [] },
};
const NEXES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99];
const PATENTES = [
  { n: 'Recruta', pp: 0, cred: 'Baixo', lim: [2, 0, 0, 0] },
  { n: 'Operador', pp: 20, cred: 'Médio', lim: [3, 1, 0, 0] },
  { n: 'Agente especial', pp: 50, cred: 'Médio', lim: [3, 2, 1, 0] },
  { n: 'Oficial de operações', pp: 100, cred: 'Alto', lim: [3, 3, 2, 1] },
  { n: 'Agente de elite', pp: 200, cred: 'Ilimitado', lim: [3, 3, 3, 2] },
];
const ORIGENS = [
  ['Acadêmico', 'ciencias,investigacao', 'Saber é Poder'], ['Agente de Saúde', 'intuicao,medicina', 'Técnica Medicinal'],
  ['Amnésico', '', 'Vislumbres do Passado'], ['Artista', 'artes,enganacao', 'Magnum Opus'], ['Atleta', 'acrobacia,atletismo', '110%'],
  ['Chef', 'fortitude,profissao', 'Ingrediente Secreto'], ['Criminoso', 'crime,furtividade', 'O Crime Compensa'],
  ['Cultista Arrependido', 'ocultismo,religiao', 'Traços do Outro Lado'], ['Desgarrado', 'fortitude,sobrevivencia', 'Calejado'],
  ['Engenheiro', 'profissao,tecnologia', 'Ferramenta Favorita'], ['Executivo', 'diplomacia,profissao', 'Processo Otimizado'],
  ['Investigador', 'investigacao,percepcao', 'Faro para Pistas'], ['Lutador', 'luta,reflexos', 'Mão Pesada'],
  ['Magnata', 'diplomacia,pilotagem', 'Patrocinador da Ordem'], ['Mercenário', 'iniciativa,intimidacao', 'Posição de Combate'],
  ['Militar', 'pontaria,tatica', 'Para Bellum'], ['Operário', 'fortitude,profissao', 'Ferramenta de Trabalho'],
  ['Policial', 'percepcao,pontaria', 'Patrulha'], ['Religioso', 'religiao,vontade', 'Acalentar'],
  ['Servidor Público', 'intuicao,vontade', 'Espírito Cívico'], ['Teórico da Conspiração', 'investigacao,ocultismo', 'Eu Já Sabia'],
  ['T.I.', 'investigacao,tecnologia', 'Motor de Busca'], ['Trabalhador Rural', 'adestramento,sobrevivencia', 'Desbravador'],
  ['Trambiqueiro', 'crime,enganacao', 'Impostor'], ['Universitário', 'atualidades,investigacao', 'Dedicação'],
  ['Vítima', 'reflexos,vontade', 'Cicatrizes Psicológicas'],
  // Sobrevivendo ao Horror
  ['Amigo dos Animais', 'adestramento,percepcao', 'Companheiro Animal'], ['Astronauta', 'ciencias,fortitude', 'Acostumado ao Extremo'],
  ['Chef do Outro Lado', 'ocultismo,profissao', 'Fome do Outro Lado'], ['Colegial', 'atualidades,tecnologia', 'Poder da Amizade'],
  ['Cosplayer', 'artes,vontade', 'Não é fantasia, é cosplay!'], ['Diplomata', 'atualidades,diplomacia', 'Conexões'],
  ['Explorador', 'fortitude,sobrevivencia', 'Manual do Sobrevivente'], ['Experimento', 'atletismo,fortitude', 'Mutação'],
  ['Fanático por Criaturas', 'investigacao,ocultismo', 'Conhecimento Oculto'], ['Fotógrafo', 'artes,percepcao', 'Através da Lente'],
  ['Inventor Paranormal', 'profissao,vontade', 'Invenção Paranormal'], ['Jovem Místico', 'ocultismo,religiao', 'A Culpa é das Estrelas'],
  ['Legista do Turno da Noite', 'ciencias,medicina', 'Luto Habitual'], ['Mateiro', 'percepcao,sobrevivencia', 'Mapa Celeste'],
  ['Mergulhador', 'atletismo,fortitude', 'Fôlego de Nadador'], ['Motorista', 'pilotagem,reflexos', 'Mãos no Volante'],
  ['Nerd Entusiasta', 'ciencias,tecnologia', 'O Inteligentão'], ['Profetizado', 'vontade', 'Luta ou Fuga'],
  ['Psicólogo', 'intuicao,profissao', 'Terapia'], ['Repórter Investigativo', 'atualidades,investigacao', 'Encontrar a Verdade'],
];
const CUSTO_RITUAL = { 1: 1, 2: 3, 3: 6, 4: 10 };
const ELEM_COR = { conhecimento: '#d9a514', energia: '#8a3fd1', morte: '#7c7c7c', sangue: '#c2272f', medo: '#e9e4f2', varia: '#5fa8a0' };
// cor de destaque da ficha: a cor da cobaia (cores muito escuras viram cinza claro)
function acento(cor) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(cor || '').trim());
  if (!m) return { ac: '#c9a14a', txt: '#16130c' };
  const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (lum < 0.14) return { ac: '#d8d2c8', txt: '#16130c' };
  return { ac: '#' + m[1], txt: lum > 0.5 ? '#16130c' : '#ffffff' };
}
const estiloAc = dono => { const s = A.SER[dono] || {}; const a = dono === 'mestre' ? acento('#c9a14a') : acento(s.cor); return `--ac:${a.ac};--ac-txt:${a.txt}`; };
const corEl = el => ELEM_COR[String(el || '').toLowerCase().split(/[\s&/]/)[0]] || '#8b5cf6';
const TIPOS_ITEM = { arma: 'Arma', municao: 'Munição', protecao: 'Proteção', geral: 'Geral', amaldicoado: 'Item Amaldiçoado' };
const ROM = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI'];

/* ---------------- CÁLCULOS ---------------- */
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const int = v => Math.round(num(v));
function nivelDe(d) {
  const cl = CLASSES[d.classe] || CLASSES.combatente;
  if (cl.estagio) return Math.max(1, Math.min(5, int(d.estagio) || 1));
  if (d.classe === 'mundano') return 1;
  const nex = int(d.nex) || 5;
  return nex >= 99 ? 20 : Math.max(1, Math.floor(nex / 5));
}
function calc(d) {
  if (d && d.tipo === 'ameaca') {
    const pvMax = Math.max(1, int(d.pvMax) || 1);
    return { n: 1, pvMax, peMax: 0, sanMax: 0, pdMax: 0, peTurno: 0, dt: 0, carga: 0, cargaMax: 0, sobrecarga: false, contagem: [0, 0, 0, 0], patente: PATENTES[0],
      defEquip: 0, defCond: { v: 0, f: [] }, defesa: int(d.def), bonus: () => 0, esquiva: int(d.def), bloqueio: 0, desl: 0, conds: new Set() };
  }
  const at = k => int((d.atr || {})[k]);
  const cl = CLASSES[d.classe] || CLASSES.combatente;
  const n = nivelDe(d);
  const fixo = cl.estagio || d.classe === 'mundano';
  const ganho = (base, porNivel, attr) => base + attr + (n - 1) * (porNivel + (fixo ? 0 : attr));
  const r = { n };
  r.pvMax = ganho(cl.pv[0], cl.pv[1], at('vig')) + int((d.pv || {}).aj);
  r.peMax = ganho(cl.pe[0], cl.pe[1], at('pre')) + int((d.pe || {}).aj);
  r.sanMax = cl.san[0] + (n - 1) * cl.san[1] + int((d.san || {}).aj);
  r.pdMax = ganho(cl.pd[0], cl.pd[1], at('pre')) + int((d.pd || {}).aj);
  r.peTurno = (cl.estagio || d.classe === 'mundano' ? 1 : n) + int(d.peTurnoAj);
  r.dt = 10 + r.peTurno + at('pre') + int(d.dtAj);
  // inventário
  const itens = lista(d.itens);
  r.carga = itens.reduce((s, it) => s + num(it.esp) * Math.max(0, num(it.qtd === undefined ? 1 : it.qtd)), 0);
  r.cargaMax = (at('for') > 0 ? at('for') * 5 : 2) + int(d.cargaAj);
  r.sobrecarga = r.carga > r.cargaMax;
  r.contagem = [0, 0, 0, 0];
  itens.forEach(it => { const c = catEfetiva(it); if (c >= 1 && c <= 4) r.contagem[c - 1] += Math.max(1, int(it.qtd === undefined ? 1 : it.qtd)); });
  r.patente = patenteDe(d);
  r.defEquip = itens.filter(it => it.t === 'protecao' && it.vest).reduce((s, it) => s + int(it.def), 0);
  r.defCond = efeitosNaDefesa(d);
  r.defesa = 10 + at('agi') + r.defEquip + int(d.defOutros) - (r.sobrecarga ? 5 : 0) + r.defCond.v;
  r.bonus = id => {
    const p = (d.per || {})[id] || {};
    let b = int(p.t) + int(p.o);
    if (PER[id] && PER[id][4] && r.sobrecarga) b -= 5;
    return b;
  };
  r.esquiva = r.defesa + r.bonus('reflexos');
  r.bloqueio = Math.max(0, r.bonus('fortitude'));
  r.desl = Math.max(0, num(d.desl === undefined ? 9 : d.desl) - (r.sobrecarga ? 3 : 0));
  const cs = condicoesDe(d);
  if (cs.has('imovel')) r.desl = 0;
  else { if (cs.has('lento')) r.desl = Math.floor(r.desl / 2 / 1.5) * 1.5; if (cs.has('caido')) r.desl = Math.min(r.desl, 1.5); }
  r.conds = cs;
  return r;
}
function patenteDe(d) {
  if (d.patente) return PATENTES.find(p => p.n === d.patente) || PATENTES[0];
  let p = PATENTES[0];
  PATENTES.forEach(x => { if (int(d.pp) >= x.pp) p = x; });
  return p;
}
const atrDaPericia = (d, id) => { const a = ((d.per || {})[id] || {}).a; return ATRS.some(x => x[0] === a) ? a : PER[id][2]; };
const catEfetiva = it => int(it.cat) + lista(it.mods).length;
const lista = o => Object.entries(o || {}).map(([id, v]) => ({ ...v, id })).sort((a, b) => (a.o || 0) - (b.o || 0));

/* ---------------- CONDIÇÕES (do mapa e da própria ficha) ----------------
   Resumo do Apêndice de Condições (OPRPG v1.3). –O = um d20 a menos no teste. */
const COND_EXPANDE = {
  fatigado: ['fraco', 'vulneravel'], exausto: ['debilitado', 'lento', 'vulneravel'], cego: ['desprevenido', 'lento'],
  agarrado: ['desprevenido', 'imovel'], atordoado: ['desprevenido'], surpreendido: ['desprevenido'], enredado: ['lento', 'vulneravel'],
  paralisado: ['indefeso', 'imovel'], inconsciente: ['indefeso'], indefeso: ['desprevenido'], morrendo: ['inconsciente'],
};
const COND_NOME = { abalado: 'Abalado', assustada: 'Apavorado', fraco: 'Fraco', debilitado: 'Debilitado', frustrado: 'Frustrado', esmorecido: 'Esmorecido',
  cego: 'Cego', ofuscado: 'Ofuscado', agarrado: 'Agarrado', enredado: 'Enredado', caido: 'Caído', desprevenido: 'Desprevenido', surdo: 'Surdo',
  fascinado: 'Fascinado', vulneravel: 'Vulnerável', indefeso: 'Indefeso', alquebrado: 'Alquebrado', lento: 'Lento', imovel: 'Imóvel' };
function condicoesDe(d) {
  const ativas = new Set();
  const est = A.estado || {};
  const c = d && d.dono && d.dono !== 'mestre' ? ((est.cond || {})[d.dono] || {}) : {};
  Object.keys(c).forEach(k => { if (k[0] !== '_' && c[k]) ativas.add(k); });
  if (d && d.pv && d.pv.a !== undefined && d.pv.a !== null && d.pv.a !== '' && int(d.pv.a) <= 0 && d.tipo !== 'ameaca') ativas.add('morrendo');
  let mudou = true;
  while (mudou) { mudou = false; [...ativas].forEach(k => (COND_EXPANDE[k] || []).forEach(x => { if (!ativas.has(x)) { ativas.add(x); mudou = true; } })); }
  return ativas;
}
// penalidade em dados para um teste: [{n, fonte}]
function penalidadesDados(d, perId, attr, tipo) {
  const a = condicoesDe(d), out = [];
  const pega = (k, n) => out.push({ n, fonte: COND_NOME[k] || k });
  if (a.has('assustada')) pega('assustada', -2); else if (a.has('abalado')) pega('abalado', -1);
  if (['agi', 'for', 'vig'].includes(attr)) { if (a.has('debilitado')) pega('debilitado', -2); else if (a.has('fraco')) pega('fraco', -1); }
  if (['int', 'pre'].includes(attr)) { if (a.has('esmorecido')) pega('esmorecido', -2); else if (a.has('frustrado')) pega('frustrado', -1); }
  if (a.has('cego') && ['agi', 'for'].includes(attr)) pega('cego', -2);
  if (tipo === 'ataque' || tipo === 'cac') { if (a.has('ofuscado')) pega('ofuscado', -1); if (a.has('agarrado')) pega('agarrado', -1); if (a.has('enredado')) pega('enredado', -1); }
  if (tipo === 'cac' && a.has('caido')) pega('caido', -2);
  if (perId === 'percepcao') { if (a.has('ofuscado')) pega('ofuscado', -1); if (a.has('fascinado')) pega('fascinado', -2); }
  if (perId === 'reflexos' && a.has('desprevenido')) pega('desprevenido', -1);
  if (perId === 'iniciativa' && a.has('surdo')) pega('surdo', -2);
  return out;
}
function efeitosNaDefesa(d) {
  const a = condicoesDe(d); let v = 0; const f = [];
  if (a.has('indefeso')) { v -= 10; f.push('indefeso −10'); } else if (a.has('desprevenido')) { v -= 5; f.push('desprevenido −5'); }
  if (a.has('vulneravel')) { v -= 2; f.push('vulnerável −2'); }
  return { v, f, caido: a.has('caido') };
}

/* ---------------- DADOS ---------------- */
const d20 = () => 1 + Math.floor(Math.random() * 20);
// 1d20 por ponto de atributo, fica com o maior. Se bônus e penalidades em dados deixarem menos de 1 dado,
// rola a quantidade que rolaria se fosse bônus e fica com o menor (atributo 0 → 2 dados, o pior).
function rolarTeste(qtdAtr, bonus, extraDados = 0) {
  const n = qtdAtr + extraDados;
  const desv = n < 1;
  const q = Math.min(desv ? 2 - n : n, 12);
  const dados = Array.from({ length: q }, d20);
  const esc = desv ? Math.min(...dados) : Math.max(...dados);
  return { dados, esc, desv, total: esc + bonus, bonus, extraDados };
}
// "2d6+1d8+3" → total e detalhes; mult multiplica só os dados (crítico)
function rolarExpr(expr, mult = 1) {
  // "1d4/1d6" (alternativas): usa a primeira; texto entre parênteses é ignorado
  const limpo = String(expr || '').replace(/\([^)]*\)/g, '').replace(/\s/g, '').replace(/−/g, '-').replace(/(\d*d\d+)(\/\d*d\d+)+/gi, '$1');
  const partes = limpo.match(/[+-]?[^+-]+/g) || [];
  let total = 0; const det = [];
  partes.forEach(p => {
    const s = p[0] === '-' ? -1 : 1;
    const t = p.replace(/^[+-]/, '');
    const m = /^(\d*)d(\d+)$/i.exec(t);
    if (m) {
      const q = (parseInt(m[1] || '1', 10)) * mult, f = parseInt(m[2], 10);
      const v = Array.from({ length: Math.min(q, 60) }, () => 1 + Math.floor(Math.random() * f));
      total += s * v.reduce((a, b) => a + b, 0);
      det.push(`${s < 0 ? '−' : ''}${q}d${f} [${v.join(', ')}]`);
    } else if (/^\d+$/.test(t)) { total += s * parseInt(t, 10); det.push(`${s < 0 ? '−' : '+'}${t}`); }
  });
  return { total, det: det.join(' ') };
}

/* ---------------- ESTADO ---------------- */
const F = {
  aberto: false, tela: 'lista', abaLista: '',
  offs: [], resumo: {},             // resumo das fichas da lista
  atual: null,                      // { ref, d, editavel, off }
  aba: 'combate', abaMob: 'status', abertos: new Set(), filtros: {},
};
const ehMestre = () => A.mestre;
const quem = () => A.meu || A.aux || null;
const KEY_IDX = 'acf-fichas-minhas';
// ficha ativa: a que o jogador usa no mapa (PV, PE e SAN vão para o token dele)
const KEY_ATIVA = q => 'acf-ficha-ativa-' + q;
function chaveAtiva() {
  const q = quem(); if (!q || ehMestre()) return null;
  const idx = indice().filter(r => r && r.chave && r.dono === q);
  let k = null; try { k = localStorage.getItem(KEY_ATIVA(q)); } catch (e) {}
  if (!idx.some(r => r.chave === k)) k = idx.length ? idx[0].chave : null;
  return k;
}
const ehAtiva = ref => !!ref && !ref.gm && ref.dono === quem() && ref.chave === chaveAtiva();
function indice() { try { return JSON.parse(localStorage.getItem(KEY_IDX) || '[]') || []; } catch (e) { return []; } }
function salvarIndice(l) { try { localStorage.setItem(KEY_IDX, JSON.stringify(l)); } catch (e) {} }
const caminho = ref => ref.aux ? `agentesAux/${ref.chave}` : ref.gm ? `agentesMestre/${ref.chave}` : `agentes/${ref.dono}/${ref.chave}`;
// auxiliar (robô S.T.A.F.F.): divide com o Mestre as fichas de ameaças e Filhos
const ehAux = () => !!A.aux && !A.mestre;
const codigoDe = ref => `${ref.dono}:${ref.chave}`;
function novaChave() {
  const r = Array.from(crypto.getRandomValues(new Uint8Array(9)), b => b.toString(36).padStart(2, '0')).join('');
  return (A.Rede.chave() + r).replace(/[^A-Za-z0-9_-]/g, '');
}

function novaFicha(dono) {
  const s = A.SER[dono] || {};
  return {
    v: 1, dono: dono || 'mestre', criado: Date.now(),
    nome: s.nome || 'Novo agente', jogador: s.jogador || '', origem: '', classe: 'combatente', trilha: '', nex: 5, estagio: 1,
    regra: 'padrao', foto: '',
    atr: { agi: 1, for: 1, int: 1, pre: 1, vig: 1 },
    per: {}, pv: { aj: 0 }, pe: { aj: 0 }, san: { aj: 0 }, pd: { aj: 0 },
    peTurnoAj: 0, desl: 9, defOutros: 0, protecao: '', resist: '', prof: CLASSES.combatente.prof,
    hab: {}, rit: {}, dtAj: 0, itens: {}, pp: 0, patente: '', cargaAj: 0,
    desc: { anot: '', apar: '', pers: '', hist: '', obj: '' },
  };
}

/* ---------------- TELA ---------------- */
function montarTela() {
  if ($('#telaFichas')) return;
  const t = document.createElement('div');
  t.id = 'telaFichas'; t.className = 'fx-tela'; t.hidden = true;
  t.innerHTML = `<div class="fx-topo"><div class="fx-marca"><span class="fx-k">O.R.F.E.U. · ARQUIVO</span><b>Fichas de Agente</b></div>
    <nav class="fx-nav" id="fxNav"></nav><button class="fx-fechar" id="fxFechar" aria-label="Fechar fichas">×</button></div>
    <div class="fx-corpo" id="fxCorpo"></div><div class="fx-rolagem" id="fxRolagem" hidden></div><div class="fx-modal" id="fxModal" hidden></div>`;
  document.body.appendChild(t);
  $('#fxFechar').onclick = fechar;
  t.addEventListener('input', aoEditar);
  t.addEventListener('change', aoEditar);
  t.addEventListener('click', aoClicar);
}
function abrir(aba) {
  montarTela();
  if (typeof aba === 'string') { F.abaLista = aba; F.tela = 'lista'; }
  F.aberto = true;
  $('#telaFichas').hidden = false;
  document.body.classList.add('fx-aberta');
  if (F.tela === 'ficha' && F.atual) desenharFicha(); else irLista();
}
function fechar() {
  F.aberto = false;
  $('#telaFichas').hidden = true;
  document.body.classList.remove('fx-aberta');
  pararFicha(); pararLista();
}
function pararLista() { F.offs.forEach(f => f()); F.offs = []; }
function pararFicha() { if (F.atual && F.atual.off) F.atual.off(); if (F.atual) F.atual.off = null; }

function desenharNav() {
  const nav = $('#fxNav');
  if (F.tela === 'ficha') {
    nav.innerHTML = `<button data-acao="voltar">‹ Voltar à lista</button>`;
    return;
  }
  const abas = ehMestre() ? [['jogadores', 'Fichas dos jogadores'], ['minhas', 'Minhas fichas (Mestre)'], ['aux', 'Ameaças e Filhos (auxiliares)']]
    : ehAux() ? [['aux', 'Ameaças e Filhos'], ['minhas', 'Minhas fichas']] : [['minhas', 'Minhas fichas']];
  if (!F.abaLista || !abas.some(a => a[0] === F.abaLista)) F.abaLista = abas[0][0];
  nav.innerHTML = abas.map(([k, n]) => `<button data-acao="aba-lista" data-v="${k}" class="${F.abaLista === k ? 'on' : ''}">${n}</button>`).join('');
}

/* ---------------- LISTA ---------------- */
function irLista() {
  pararFicha(); pararLista();
  F.tela = 'lista'; F.atual = null; F.resumo = {};
  desenharNav();
  const corpo = $('#fxCorpo');
  if (!ehMestre() && !quem()) { corpo.innerHTML = '<p class="fx-vazio">Entre como jogador (escolha sua cobaia) para criar e ver suas fichas.</p>'; return; }
  if ((ehMestre() || ehAux()) && F.abaLista === 'aux') {
    F.offs.push(A.Rede.on('agentesAux', v => { F.resumo = {}; Object.entries(v || {}).forEach(([chave, d]) => { F.resumo['aux:' + chave] = { ref: { aux: true, dono: 'aux', chave }, d }; }); desenharLista(); }, () => { $('#fxCorpo').innerHTML = '<p class="fx-vazio">Sem permissão para as fichas dos auxiliares. Entre com a senha dos auxiliares.</p>'; }));
  } else if (ehMestre() && F.abaLista === 'jogadores') {
    F.offs.push(A.Rede.on('agentes', v => { F.resumo = {}; Object.entries(v || {}).forEach(([dono, fs]) => Object.entries(fs || {}).forEach(([chave, d]) => { F.resumo[dono + ':' + chave] = { ref: { dono, chave }, d }; })); desenharLista(); }, () => {}));
  } else if (ehMestre()) {
    F.offs.push(A.Rede.on('agentesMestre', v => { F.resumo = {}; Object.entries(v || {}).forEach(([chave, d]) => { F.resumo['mestre:' + chave] = { ref: { gm: true, dono: 'mestre', chave }, d }; }); desenharLista(); }, () => {}));
  } else {
    const idx = indice().filter(r => r && r.chave && r.dono === quem());
    if (!idx.length) desenharLista();
    idx.forEach(ref => {
      F.offs.push(A.Rede.on(caminho(ref), d => {
        if (d) F.resumo[codigoDe(ref)] = { ref, d }; else delete F.resumo[codigoDe(ref)];
        desenharLista();
      }, () => { delete F.resumo[codigoDe(ref)]; desenharLista(); }));
    });
  }
  desenharLista();
}
function desenharLista() {
  if (F.tela !== 'lista') return;
  const corpo = $('#fxCorpo');
  const todos = Object.values(F.resumo).sort((a, b) => (a.d.criado || 0) - (b.d.criado || 0));
  const gmJog = ehMestre() && F.abaLista === 'jogadores';
  const abaAux = (ehMestre() || ehAux()) && F.abaLista === 'aux';
  const podeCriar = !gmJog;
  let cab = '';
  if (abaAux) cab = `<p class="fx-dica">Fichas de ameaças e de Filhos da O.R.F.E.U. divididas entre o Mestre e os auxiliares: todos editam. Pela ficha, "Chamar o teste" pede a Presença Perturbadora aos jogadores.</p>`;
  else if (gmJog) cab = `<p class="fx-dica">Você vê as fichas de todos os jogadores, ao vivo, mas só para leitura. O código de cada ficha aparece no cartão: passe ao jogador se ele precisar abrir a ficha em outro aparelho.</p>`;
  else if (ehMestre()) cab = `<p class="fx-dica">Fichas suas (NPCs, inimigos, aliados). Só você vê e edita.</p>`;
  else cab = `<p class="fx-dica">Suas fichas ficam ligadas a este aparelho. Em outro aparelho, use "Abrir por código" com o código que aparece dentro da ficha. O Mestre vê suas fichas, mas não pode alterá-las.</p>`;
  const grupos = {};
  todos.forEach(x => { const g = gmJog ? x.ref.dono : '_'; (grupos[g] = grupos[g] || []).push(x); });
  const cartao = x => {
    const d = x.d, s = A.SER[d.dono] || {};
    const foto = d.foto || s.img || '';
    const cl = CLASSES[d.classe] || {};
    const amea = d.tipo === 'ameaca';
    const nivel = amea ? `VD ${int(d.vd)}` : cl.estagio ? `Estágio ${d.estagio || 1}` : d.classe === 'mundano' ? 'NEX 0%' : `NEX ${d.nex || 5}%`;
    const k = esc(codigoDe(x.ref)), gmA = x.ref.aux ? 'a' : x.ref.gm ? 1 : '';
    const sf = d.filho ? A.SER[d.filho] : null;
    return `<article class="fx-cartao" style="${estiloAc(d.dono)}">
      <span class="fx-cartao-aba"${amea ? ` style="background:${sf ? sf.cor : corEl(d.el)}"` : ''}>${esc(amea ? (sf ? `FILHO ${sf.codigo}` : d.filho ? 'FILHO' : 'AMEAÇA') : x.ref.gm ? 'NPC' : (s.nome || d.dono || ''))}</span>
      <div class="fx-cartao-foto"${foto ? ` style="background-image:url('${esc(foto)}')"` : ''}><span class="fx-cartao-nex">${esc(nivel)}</span></div>
      <div class="fx-cartao-info"><small class="fx-k">${amea ? 'Ameaça · ' + esc(d.el || '') : esc(cl.n || '') + (d.trilha ? ' · ' + esc(d.trilha) : '')}</small><h3>${esc(d.nome || 'Sem nome')}</h3>
      <small class="fx-cartao-data">Aberta em ${new Date(d.criado || Date.now()).toLocaleDateString('pt-BR')}${d.jogador ? ' · ' + esc(d.jogador) : ''}</small>
      ${gmJog ? `<small class="fx-cod">${k}</small>` : ''}
      <div class="fx-cartao-acoes"><button class="fx-btn-roxo" data-acao="abrir-ficha" data-k="${k}" data-gm="${gmA}">Abrir ficha</button>
      ${podeCriar ? `<button data-acao="apagar-ficha" data-k="${k}" data-gm="${gmA}" class="fx-btn-perigo" title="Apagar ficha" aria-label="Apagar ficha">✕</button>` : ''}</div></div></article>`;
  };
  let html = cab;
  if (abaAux) html += `<div class="fx-lista-acoes"><button class="fx-btn-roxo" data-acao="nova-ameaca">+ Nova ameaça</button><button data-acao="novo-filho">+ Novo Filho</button></div>`;
  else if (podeCriar) html += `<div class="fx-lista-acoes"><button class="fx-btn-roxo" data-acao="nova-ficha">+ Nova ficha</button>${ehMestre() ? '<button data-acao="nova-ameaca">+ Nova ameaça</button>' : ''}${!ehMestre() ? '<button data-acao="abrir-codigo">Abrir por código</button>' : ''}<label class="fx-btn-arq" title="Cria uma ficha nova a partir de um arquivo exportado">⬆ Importar arquivo<input type="file" accept=".json,application/json" data-acao-arq="importar" hidden></label></div>`;
  if (!todos.length) html += `<p class="fx-vazio">${gmJog ? 'Nenhum jogador criou ficha ainda.' : 'Nenhuma ficha ainda. Crie a primeira!'}</p>`;
  Object.entries(grupos).forEach(([g, xs]) => {
    if (gmJog) { const s = A.SER[g] || {}; html += `<h2 class="fx-grupo" style="${estiloAc(g)}"><span class="fx-pinta"></span>${esc(s.nome || g)}${s.jogador ? ` <small>${esc(s.jogador)}</small>` : ''}</h2>`; }
    html += `<div class="fx-grade">${xs.map(cartao).join('')}</div>`;
  });
  corpo.innerHTML = html;
}
function refDoCodigo(k, gm) {
  const i = k.indexOf(':');
  const dono = k.slice(0, i), chave = k.slice(i + 1);
  return gm === 'a' ? { aux: true, dono: 'aux', chave } : gm ? { gm: true, dono: 'mestre', chave } : { dono, chave };
}
async function criarAmeaca(filho) {
  const naAux = F.abaLista === 'aux' || ehAux();
  const ref = naAux ? { aux: true, dono: 'aux', chave: novaChave() } : { gm: true, dono: 'mestre', chave: novaChave() };
  const d = novaAmeaca(); d.dono = ref.dono;
  if (filho) { const f1 = (A.SERES || []).find(x => x.tipo === 'filho'); Object.assign(d, { nome: f1 ? f1.nome : 'Novo Filho', filho: f1 ? f1.id : '', porte: 'Filho da O.R.F.E.U.' }); }
  try { await A.Rede.set(caminho(ref), d); } catch (e) { A.aviso('O servidor recusou a criação.'); return; }
  abrirFicha(ref);
}
async function criarFicha() {
  const gm = ehMestre();
  const dono = gm ? 'mestre' : quem();
  if (!dono) { A.aviso('Escolha sua cobaia antes de criar uma ficha.'); return; }
  const ref = { gm, dono, chave: novaChave() };
  const d = novaFicha(gm ? null : dono);
  if (gm) { d.nome = 'Novo NPC'; d.dono = 'mestre'; }
  try { await A.Rede.set(caminho(ref), d); } catch (e) { A.aviso('O servidor recusou a criação da ficha. Confira as regras do Firebase.'); return; }
  if (!gm) { const idx = indice(); idx.push({ dono: ref.dono, chave: ref.chave }); salvarIndice(idx); ligarAtiva(); }
  abrirFicha(ref);
}
async function abrirPorCodigo() {
  const k = (prompt('Cole o código da ficha (aparece no topo da ficha, ex.: faca:-Nx1…):') || '').trim();
  if (!k.includes(':')) return;
  const ref = refDoCodigo(k);
  let d = null;
  try { d = await A.Rede.once(caminho(ref)); } catch (e) {}
  if (!d) { A.aviso('Não encontrei ficha com esse código.'); return; }
  const idx = indice();
  if (!idx.some(r => r.chave === ref.chave)) { idx.push(ref); salvarIndice(idx); ligarAtiva(); }
  abrirFicha(ref);
}
async function apagarFicha(ref) {
  const r = F.resumo[codigoDe(ref)];
  if (!confirm(`Apagar a ficha "${r ? r.d.nome : ''}" de vez? Isso não pode ser desfeito.`)) return;
  if (!confirm('Tem certeza? A ficha some para todos, inclusive para o Mestre.')) return;
  try { await A.Rede.set(caminho(ref), null); } catch (e) { A.aviso('Não consegui apagar.'); return; }
  if (!ref.gm && !ref.aux) { salvarIndice(indice().filter(x => x.chave !== ref.chave)); F.ativaId = undefined; ligarAtiva(); }
  irLista();
}

/* ---------------- EXPORTAR / IMPORTAR ---------------- */
function exportarFicha() {
  const at = F.atual; if (!at || !at.d) return;
  const ficha = JSON.parse(JSON.stringify(at.d));
  delete ficha.dono; delete ficha.criado;
  const arq = { formato: 'acf-ficha', v: 1, exportado: new Date().toISOString(), ficha };
  const nome = String(ficha.nome || 'ficha').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'ficha';
  const url = URL.createObjectURL(new Blob([JSON.stringify(arq, null, 1)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `ficha-${nome}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
// chaves que o Firebase não aceita somem; textos longos demais são cortados
function limparImportado(v, prof = 0) {
  if (prof > 8) return null;
  if (Array.isArray(v)) { const o = {}; v.forEach((x, i) => { o['i' + i] = limparImportado(x, prof + 1); }); return o; }
  if (v && typeof v === 'object') {
    const o = {};
    Object.entries(v).forEach(([k, x]) => { const kk = String(k).replace(/[.#$/\[\]]/g, '_').slice(0, 80); if (kk && x !== undefined && x !== null) o[kk] = limparImportado(x, prof + 1); });
    return o;
  }
  if (typeof v === 'string') return v.slice(0, v.startsWith('data:image/') ? 400000 : 20000);
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  return typeof v === 'boolean' ? v : null;
}
async function importarFicha(f) {
  if (!f) return;
  if (f.size > 1500000) { A.aviso('Arquivo grande demais para uma ficha.'); return; }
  let dado;
  try { dado = JSON.parse(await f.text()); } catch (e) { A.aviso('Esse arquivo não é uma ficha válida.'); return; }
  const bruta = dado && dado.formato === 'acf-ficha' ? dado.ficha : dado;
  if (!bruta || typeof bruta !== 'object' || !('nome' in bruta || 'atr' in bruta)) { A.aviso('Esse arquivo não é uma ficha válida.'); return; }
  const gm = ehMestre();
  const dono = gm ? 'mestre' : quem();
  if (!dono) { A.aviso('Escolha sua cobaia antes de importar uma ficha.'); return; }
  const d = normalizar({ ...limparImportado(bruta), dono, criado: Date.now() });
  d.dono = dono; d.criado = Date.now();
  if (!CLASSES[d.classe]) d.classe = 'combatente';
  if (!confirm(`Criar uma ficha nova com "${d.nome || 'Sem nome'}"${gm ? ' nas suas fichas de Mestre' : ''}?`)) return;
  const ref = { gm, dono, chave: novaChave() };
  try { await A.Rede.set(caminho(ref), d); } catch (e) { A.aviso('O servidor recusou a ficha importada.'); return; }
  if (!gm) { const idx = indice(); idx.push({ dono: ref.dono, chave: ref.chave }); salvarIndice(idx); ligarAtiva(); }
  A.aviso(`Ficha "${d.nome || 'Sem nome'}" importada.`);
  abrirFicha(ref);
}

/* ---------------- FICHA ---------------- */
function abrirFicha(ref) {
  pararLista(); pararFicha();
  const editavel = ref.aux ? (ehMestre() || ehAux()) : ref.gm ? ehMestre() : (!ehMestre() && ref.dono === quem());
  F.tela = 'ficha';
  F.atual = { ref, d: null, editavel, off: null, pend: {} };
  desenharNav();
  $('#fxCorpo').innerHTML = '<p class="fx-vazio">Carregando a ficha…</p>';
  F.atual.off = A.Rede.on(caminho(ref), d => {
    if (!F.atual || F.atual.ref !== ref) return;
    if (!d) { $('#fxCorpo').innerHTML = '<p class="fx-vazio">Esta ficha não existe mais.</p>'; F.atual.d = null; return; }
    const primeira = !F.atual.d;
    if (!primeira && F.atual.editavel) {
      // quem edita: só aceita mudança de fora se ninguém estiver digitando nela
      if (Object.keys(F.atual.pend).length || $('#telaFichas').contains(document.activeElement) && document.activeElement.matches('input,textarea,select')) return;
      if (JSON.stringify(d) === JSON.stringify(F.atual.d)) return;
    }
    F.atual.d = normalizar(d);
    desenharFicha();
  }, () => { $('#fxCorpo').innerHTML = '<p class="fx-vazio">Sem permissão para abrir esta ficha.</p>'; });
}
function novaAmeaca() {
  return { v: 1, tipo: 'ameaca', dono: 'mestre', criado: Date.now(), nome: 'Nova ameaça', foto: '', el: 'Sangue', vd: 40, porte: 'Criatura de Sangue · Médio',
    pres: { dt: 20, dano: '2d6', nex: 25 }, def: 15, pvMax: 50, pv: {}, desl: '9m', atr: { agi: 1, for: 2, int: 0, pre: 1, vig: 2 },
    sentidos: '', per: '', resist: '', imun: '', vuln: '', ataques: {}, hab: '', acoes: '', enigma: '', notas: '' };
}
function normalizar(d) {
  if (d && d.tipo === 'ameaca') { const n = novaAmeaca(); return { ...n, ...d, pres: { ...n.pres, ...(d.pres || {}) }, atr: { ...n.atr, ...(d.atr || {}) }, pv: d.pv || {}, ataques: d.ataques || {} }; }
  const n = novaFicha(d.dono);
  const r = { ...n, ...d };
  ['atr', 'pv', 'pe', 'san', 'pd', 'desc'].forEach(k => { r[k] = { ...n[k], ...(d[k] || {}) }; });
  ['per', 'hab', 'rit', 'itens'].forEach(k => { r[k] = d[k] || {}; });
  return r;
}

// grava um campo (com espera curta para digitação)
function gravar(path, valor, imediato) {
  const at = F.atual;
  if (!at || !at.editavel) return;
  setPath(at.d, path, valor);
  clearTimeout(at.pend[path]);
  const enviar = () => { delete at.pend[path]; A.Rede.set(caminho(at.ref) + '/' + path.replace(/\./g, '/'), valor === '' ? '' : valor).catch(() => A.aviso('O servidor recusou a gravação da ficha.')); };
  if (imediato) enviar(); else at.pend[path] = setTimeout(enviar, 450);
}
function setPath(o, path, v) {
  const ps = path.split('.');
  for (let i = 0; i < ps.length - 1; i++) { if (!o[ps[i]] || typeof o[ps[i]] !== 'object') o[ps[i]] = {}; o = o[ps[i]]; }
  if (v === null) delete o[ps[ps.length - 1]]; else o[ps[ps.length - 1]] = v;
}
const getPath = (o, path) => path.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);

const RO = () => (F.atual && F.atual.editavel ? '' : ' disabled');
function campo(path, tipo = 'text', extra = '') {
  const v = getPath(F.atual.d, path);
  return `<input data-c="${path}" type="${tipo === 'n' ? 'number' : tipo}"${tipo === 'n' ? ' data-n="1" inputmode="numeric"' : ''} value="${esc(v === undefined || v === null ? '' : v)}"${extra}${RO()}>`;
}
function area(path, rows = 4, ph = '') {
  return `<textarea data-c="${path}" rows="${rows}" placeholder="${esc(ph)}"${RO()}>${esc(getPath(F.atual.d, path) || '')}</textarea>`;
}

function desenharFicha() {
  const at = F.atual;
  if (!at || !at.d) return;
  const d = at.d;
  if (d.tipo === 'ameaca') { desenharAmeaca(); return; }
  const s = A.SER[d.dono] || {};
  const cl = CLASSES[d.classe] || CLASSES.combatente;
  const foto = d.foto || s.img || '';
  const corpo = $('#fxCorpo');
  const rolagemTopo = corpo.scrollTop;
  const ed = at.editavel;
  const det = d.regra === 'determinacao';
  const nivelCampo = cl.estagio
    ? `<select data-c="estagio"${RO()}>${[1, 2, 3, 4, 5].map(e => `<option ${int(d.estagio) === e ? 'selected' : ''}>${e}</option>`).join('')}</select>`
    : d.classe === 'mundano' ? '<input value="0%" disabled>'
    : `<select data-c="nex"${RO()}>${NEXES.map(x => `<option value="${x}" ${int(d.nex) === x ? 'selected' : ''}>${x}%</option>`).join('')}</select>`;
  corpo.innerHTML = `<div class="fx-ficha${ed ? '' : ' so-leitura'}" data-mob="${F.abaMob}" style="${estiloAc(d.dono)}">
    ${ed ? '' : `<div class="fx-aviso-leitura"><b>SOMENTE LEITURA</b><span>${ehMestre() ? 'O Mestre acompanha esta ficha ao vivo, mas não pode alterá-la.' : 'Esta ficha é de outra cobaia. Só o dono pode editar.'}</span></div>`}
    <nav class="fx-abas-mob">${[['status', 'Status'], ['pericias', 'Perícias'], ['combate', 'Combate'], ['habilidades', 'Habilidades'], ['rituais', 'Rituais'], ['inventario', 'Inventário'], ['descricao', 'Descrição']].map(([k, n]) => `<button data-acao="aba-mob" data-v="${k}" class="${F.abaMob === k ? 'on' : ''}">${n}</button>`).join('')}</nav>
    <section class="fx-col fx-col-esq">
      <div class="fx-dossie fx-painel">
        <label class="fx-foto"${foto ? ` style="background-image:url('${esc(foto)}')"` : ''}>${ed ? '<input type="file" accept="image/*" data-acao-arq="foto" hidden><span>trocar foto</span>' : ''}<i class="fx-foto-tag">${esc(at.ref.gm ? 'NPC' : (s.nome || d.dono || ''))}</i></label>
        <div class="fx-dossie-campos">
          <label class="fx-nome"><span>Agente</span>${campo('nome')}</label>
          <div class="fx-dossie-grade">
            <label>Jogador ${campo('jogador')}</label>
            <label class="fx-origem">Origem <span><input data-c="origem" list="fxOrigens" value="${esc(d.origem)}"${RO()}>${ed ? `<button class="fx-mini" data-acao="aplicar-origem" title="Marca as perícias da origem como treinadas e adiciona o poder dela">aplicar</button>` : ''}</span></label>
            <label>Classe <select data-c="classe"${RO()}>${Object.entries(CLASSES).map(([k, c]) => `<option value="${k}" ${d.classe === k ? 'selected' : ''}>${c.n}</option>`).join('')}</select></label>
            <label>Trilha <input data-c="trilha" list="fxTrilhas" value="${esc(d.trilha)}"${RO()}></label>
            <label>Regra <select data-c="regra"${RO()}><option value="padrao" ${!det ? 'selected' : ''}>PV, PE e Sanidade</option><option value="determinacao" ${det ? 'selected' : ''}>Determinação (SaH)</option></select></label>
          </div>
        </div>
        <div class="fx-nex">
          <label class="fx-nex-grande">${cl.estagio ? 'Estágio' : 'NEX'} ${nivelCampo}</label>
          <div class="fx-nex-mini"><span>${det ? 'PD' : 'PE'}/turno</span><output data-calc="peTurno"></output></div>
          <div class="fx-nex-mini fx-gasto" title="Gasto neste turno (botões de −${det ? 'PD' : 'PE'} e rituais). Zera a cada turno da perseguição."><span>Neste turno</span><span><output data-calc="peGasto"></output>${ed ? '<button class="fx-mini" data-acao="zerar-gasto" aria-label="Zerar o gasto do turno">↺</button>' : ''}</span></div>
          <div class="fx-nex-mini"><span>Desloc.</span><span class="fx-desl">${campo('desl', 'n', ' min="0" step="1.5"')}<output data-calc="desl"></output></span></div>
        </div>
      </div>
      <datalist id="fxOrigens">${ORIGENS.map(o => `<option value="${esc(o[0])}">`).join('')}</datalist>
      <datalist id="fxTrilhas">${(cl.trilhas || []).map(t => `<option value="${esc(t)}">`).join('')}</datalist>
      <div class="fx-faixa">
        <div class="fx-painel fx-p-atr"><h4 class="fx-ph"><i>01</i>Atributos</h4>
          <div class="fx-atributos">${ATRS.map(([k, n, sg]) => `<label class="fx-atr"><span class="fx-atr-sg">${sg}</span><input data-c="atr.${k}" type="number" data-n="1" min="0" max="9" value="${int(d.atr[k])}"${RO()}><small>${n}</small><span class="fx-pips" data-pips="${k}">${'<b></b>'.repeat(5)}</span></label>`).join('')}</div>
          <label class="fx-larga">Proficiências ${campo('prof')}</label>
          <div class="fx-codigo">${ed && !at.ref.gm ? `<button class="fx-mini fx-ativa${ehAtiva(at.ref) ? ' on' : ''}" data-acao="ativa" title="A ficha ativa manda PV, PE e SAN para o mapa e para o painel de retratos">${ehAtiva(at.ref) ? '★ ficha ativa no mapa' : '☆ usar no mapa'}</button><span>Código <code>${esc(codigoDe(at.ref))}</code></span><button class="fx-mini" data-acao="copiar-codigo">copiar</button>` : ''}<button class="fx-mini" data-acao="exportar" title="Baixa um arquivo com a ficha inteira (cópia de segurança ou para importar em outro lugar)">exportar</button></div>
        </div>
        <div class="fx-painel fx-p-vit"><h4 class="fx-ph"><i>02</i>Sinais vitais</h4><div class="fx-barras">${barras(d)}</div><div class="fx-conds" data-conds></div></div>
        <div class="fx-painel fx-p-def"><h4 class="fx-ph"><i>03</i>Defesa</h4>
          <div class="fx-def-tiles">
            <div class="fx-tile fx-tile-g"><output data-calc="defesa"></output><span>Defesa</span></div>
            <div class="fx-tile"><output data-calc="esquiva"></output><span>Esquiva</span></div>
            <div class="fx-tile"><output data-calc="bloqueio"></output><span>Bloqueio</span></div>
          </div>
          <div class="fx-def-conta">10 + AGI + <span title="Proteções vestidas">equip. <output data-calc="defEquip"></output></span> + <label>outros ${campo('defOutros', 'n')}</label><output data-calc="defCarga" class="fx-alerta"></output></div>
          <label class="fx-larga">Proteção ${campo('protecao')}</label>
          <label class="fx-larga">Resistências ${campo('resist')}</label>
        </div>
      </div>
    </section>
    <section class="fx-col fx-col-meio fx-painel">
      <h4 class="fx-ph"><i>04</i>Perícias</h4>
      <table class="fx-pericias"><thead><tr><th>Perícia</th><th>Atr.</th><th title="Treinado, Veterano, Expert">Treino</th><th>Outros</th><th>Total</th></tr></thead>
      <tbody>${PERICIAS.map(([id, n, a, so, carga]) => {
        const p = d.per[id] || {};
        const t = int(p.t);
        return `<tr data-per="${id}" class="${t ? 'treinada t' + t : ''}">
          <td><button class="fx-rolar" data-acao="rolar-per" data-v="${id}" title="Rolar ${n}">${n}<sup>${so ? '*' : ''}${carga ? '+' : ''}</sup></button></td>
          <td>${ed ? `<select class="fx-per-atr${p.a && p.a !== a ? ' mudado' : ''}" data-c="per.${id}.a" title="Atributo usado nos dados (ex.: Racionalidade Inflexível usa Intelecto em Vontade)">${ATRS.map(([k, , sg]) => `<option value="${k}" ${(p.a || a) === k ? 'selected' : ''}>${sg}</option>`).join('')}</select>` : `<span class="fx-per-atr-ro${p.a && p.a !== a ? ' fx-mudado' : ''}">${(p.a || a).toUpperCase()}</span>`}</td>
          <td><span class="fx-treino">${[[5, 'T', 'Treinado (+5)'], [10, 'V', 'Veterano (+10)'], [15, 'E', 'Expert (+15)']].map(([v, l, tt]) => `<button data-acao="treino" data-id="${id}" data-v="${v}" class="${t >= v ? 'on' : ''}" title="${tt}"${ed ? '' : ' disabled'}>${l}</button>`).join('')}</span></td>
          <td>${campo(`per.${id}.o`, 'n')}</td>
          <td><output class="fx-per-total" data-calc="per-${id}"></output></td></tr>`;
      }).join('')}</tbody></table>
      <p class="fx-legenda">Toque no nome para rolar · <b>*</b> só treinada · <b>+</b> sofre penalidade de carga · T, V e E: treinado, veterano e expert</p>
    </section>
    <section class="fx-col fx-col-dir">
      <nav class="fx-abas">${[['combate', 'Combate'], ['habilidades', 'Habilidades'], ['rituais', 'Rituais'], ['inventario', 'Inventário'], ['descricao', 'Descrição']].map(([k, n]) => `<button data-acao="aba" data-v="${k}" class="${F.aba === k ? 'on' : ''}">${n}</button>`).join('')}</nav>
      <div class="fx-aba-corpo fx-painel" id="fxAba"></div>
    </section></div>`;
  desenharAba();
  atualizarDerivados();
  corpo.scrollTop = rolagemTopo;
}

/* ---------------- AMEAÇA (ficha de criatura do Mestre) ---------------- */
function desenharAmeaca() {
  const at = F.atual, d = at.d, ed = at.editavel;
  const corpo = $('#fxCorpo'); const topo = corpo.scrollTop;
  const ataques = lista(d.ataques);
  const pres = d.pres || {};
  corpo.innerHTML = `<div class="fx-ficha fx-ameaca" style="--ac:${corEl(d.el)};--ac-txt:${luz(corEl(d.el)) > 0.5 ? '#16130c' : '#fff'}">
    <section class="fx-col fx-col-esq">
      <div class="fx-dossie fx-painel">
        <label class="fx-foto"${d.foto ? ` style="background-image:url('${esc(d.foto)}')"` : ''}>${ed ? '<input type="file" accept="image/*" data-acao-arq="foto" hidden><span>trocar foto</span>' : ''}<i class="fx-foto-tag">${d.filho !== undefined ? 'FILHO' : 'AMEAÇA'}</i></label>
        <div class="fx-dossie-campos">
          <label class="fx-nome"><span>Ameaça</span>${campo('nome')}</label>
          <div class="fx-dossie-grade">
            <label>Elemento <select data-c="el"${RO()}>${['Sangue', 'Morte', 'Conhecimento', 'Energia', 'Medo', 'Varia'].map(e => `<option ${d.el === e ? 'selected' : ''}>${e}</option>`).join('')}</select></label>
            <label class="fx-origem">Tipo e tamanho ${campo('porte')}</label>
            <label>Deslocamento ${campo('desl')}</label>
            <label>Sentidos ${campo('sentidos')}</label>
            ${d.filho !== undefined ? `<label>Filho no mapa <select data-c="filho"${RO()}>${(A.SERES || []).filter(x => x.tipo === 'filho').map(x => `<option value="${x.id}" ${d.filho === x.id ? 'selected' : ''}>${esc(x.codigo + ' ' + x.nome)}</option>`).join('')}</select></label>` : ''}
          </div>
        </div>
        <div class="fx-nex"><label class="fx-nex-grande">VD ${campo('vd', 'n', ' min="0"')}</label></div>
      </div>
      <div class="fx-faixa">
        <div class="fx-painel fx-p-pres"><h4 class="fx-ph"><i>01</i>Presença Perturbadora</h4>
          <div class="fx-pres-grade"><label>DT ${campo('pres.dt', 'n')}</label><label>Dano mental ${campo('pres.dano')}</label><label>Imune a partir de NEX ${campo('pres.nex', 'n')}</label></div>
          <p class="fx-legenda">Quem enxerga a criatura faz Vontade: falhou, sofre o dano mental; passou, sofre metade. Com mais de uma criatura, use a de VD mais alto, +1d6 por criatura a mais.</p>
          <button class="fx-btn-roxo" data-acao="presenca">Chamar o teste dos jogadores</button>
        </div>
        <div class="fx-painel fx-p-vit"><h4 class="fx-ph"><i>02</i>Vida e defesa</h4>
          <div class="fx-barras">${['pv'].map(k => `<div class="fx-barra fx-barra-v" data-barra="pv" data-max="pvMax">
            <div class="fx-barra-cab"><span class="fx-barra-tit">Vida <i>PV</i></span><span class="fx-barra-txt"><input data-c="pv.a" type="number" data-n="1" class="fx-barra-at"${RO()}><i>/</i>${campo('pvMax', 'n', ' class="fx-pvmax"')}</span></div>
            <div class="fx-barra-trilho"><div class="fx-barra-fill"></div></div>
            <div class="fx-barra-ctl">${ed ? [-10, -5, -1, 1, 5, 10].map(v => `<button data-acao="barra" data-k="pv" data-v="${v}">${v > 0 ? '+' : '−'}${Math.abs(v)}</button>`).join('') : ''}</div></div>`).join('')}</div>
          <div class="fx-def-tiles"><div class="fx-tile fx-tile-g"><input data-c="def" type="number" data-n="1" value="${int(d.def)}"${RO()}><span>Defesa</span></div></div>
        </div>
        <div class="fx-painel fx-p-atr"><h4 class="fx-ph"><i>03</i>Atributos</h4>
          <div class="fx-atributos">${ATRS.map(([k, n, sg]) => `<label class="fx-atr"><span class="fx-atr-sg">${sg}</span><input data-c="atr.${k}" type="number" data-n="1" min="0" max="9" value="${int(d.atr[k])}"${RO()}><small>${n}</small><span class="fx-pips" data-pips="${k}">${'<b></b>'.repeat(5)}</span></label>`).join('')}</div>
        </div>
      </div>
    </section>
    <section class="fx-col fx-col-meio fx-painel"><h4 class="fx-ph"><i>04</i>Perícias e defesas</h4>
      <label class="fx-larga">Perícias ${area('per', 4, 'Ex.: Luta 3O+15, Percepção 2O+10, Iniciativa 3O+5')}</label>
      <label class="fx-larga">Resistências ${campo('resist')}</label>
      <label class="fx-larga">Imunidades ${campo('imun')}</label>
      <label class="fx-larga">Vulnerabilidades ${campo('vuln')}</label>
      <label class="fx-larga">Enigma de Medo ${area('enigma', 3)}</label>
      <label class="fx-larga">Notas do Mestre ${area('notas', 4)}</label>
    </section>
    <section class="fx-col fx-col-dir"><div class="fx-aba-corpo fx-painel"><h4 class="fx-ph"><i>05</i>Ataques e ações</h4>
      <div class="fx-itens">${ataques.map(a => `<div class="fx-ataque"><div class="fx-amea-atq">${ed ? `<label class="fx-l2">Ataque ${campo(`ataques.${a.id}.n`)}</label><label>d20 ${campo(`ataques.${a.id}.dados`, 'n', ' min="0"')}</label><label>Bônus ${campo(`ataques.${a.id}.bonus`, 'n')}</label><label>Dano ${campo(`ataques.${a.id}.dano`)}</label><label>Crítico ${campo(`ataques.${a.id}.crit`)}</label>` : `<b>${esc(a.n)}</b><small>${int(a.dados) || 1}d20${int(a.bonus) >= 0 ? '+' : ''}${int(a.bonus)} · ${esc(a.dano || '')}${a.crit ? ' · ' + esc(a.crit) : ''}</small>`}</div>
        <div class="fx-ataque-btns"><button data-acao="amea-atk" data-id="${a.id}">🎲 Ataque</button><button data-acao="dano" data-expr="${esc(a.dano || '')}" data-n="${esc(a.n || '')}">🎲 Dano</button><button data-acao="dano" data-expr="${esc(a.dano || '')}" data-mult="${int(String(a.crit || '').replace(/.*x/i, '')) || 2}" data-n="${esc(a.n || '')}">💥 Crítico</button>${ed ? `<button class="fx-btn-perigo" data-acao="remover" data-v="ataques" data-id="${a.id}">Remover</button>` : ''}</div></div>`).join('') || '<p class="fx-vazio-p">Nenhum ataque ainda.</p>'}</div>
      ${ed ? '<div class="fx-novo"><button data-acao="novo-ataque">+ Ataque</button></div>' : ''}
      <label class="fx-larga">Habilidades ${area('hab', 6, 'Origem Paranormal, Percepção às Cegas, habilidades especiais…')}</label>
      <label class="fx-larga">Ações ${area('acoes', 5)}</label>
    </div></section></div>`;
  atualizarDerivados();
  corpo.scrollTop = topo;
}
const luz = c => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return 0.5; const n = parseInt(m[1], 16); return (0.2126 * (n >> 16) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; };
// modal do Mestre: escolhe quem faz o teste e acompanha as respostas
function abrirPresenca() {
  const d = F.atual.d, pres = d.pres || {};
  const cobaias = (A.SERES || []).filter(x => x.tipo === 'cobaia');
  const m = $('#fxModal'); m.hidden = false; F.cat = null;
  m.innerHTML = `<div class="fx-modal-caixa" style="--ac:${corEl(d.el)}"><div class="fx-modal-topo"><h3>Presença Perturbadora · ${esc(d.nome)}</h3><button class="fx-fechar" data-acao="fechar-modal" aria-label="Fechar">×</button></div>
    <div class="fx-pres-modal">
      <p>Vontade <b>DT ${int(pres.dt)}</b> · dano mental <b>${esc(pres.dano || '')}</b>${int(pres.nex) ? ` · imune com NEX ${int(pres.nex)}% ou mais` : ''}</p>
      <p class="fx-k">Quem enxerga a criatura</p>
      <div class="fx-pres-alvos">${cobaias.map(c => `<label class="fx-check"><input type="checkbox" data-alvo="${c.id}" checked> ${esc(c.nome)}</label>`).join('')}</div>
      <label class="fx-check">Criaturas a mais na cena <input type="number" id="fxPresExtra" min="0" max="9" value="0" style="width:52px"> (+1d6 cada)</label>
      <p class="fx-legenda">Cada jogador recebe o pedido na tela, rola Vontade com a própria ficha e confirma o dano. Quem usa a regra de Determinação recebe o dano ajustado (dados um passo menores e pela metade).</p>
      <div class="fx-det-acoes"><button class="fx-btn-roxo" data-acao="presenca-enviar">Pedir o teste</button></div>
      <div id="fxPresResp"></div></div></div>`;
}
function acompanharPresenca(id) {
  if (F.presOff) F.presOff();
  F.presOff = A.Rede.on('mesaResp/' + id, v => {
    const el = $('#fxPresResp'); if (!el) { if (F.presOff) { F.presOff(); F.presOff = null; } return; }
    const rs = Object.entries(v || {});
    el.innerHTML = `<p class="fx-k">Respostas</p>${rs.length ? rs.map(([q, r]) => `<p>${esc((A.SER[q] || {}).nome || q)}: ${r.imune ? 'imune pelo NEX' : `Vontade ${int(r.total)} · ${r.passou ? 'passou' : 'falhou'} · −${int(r.dano)} ${r.det ? 'PD' : 'SAN'}`}</p>`).join('') : '<p class="fx-legenda">Aguardando os jogadores…</p>'}`;
  }, () => {});
}

function barras(d) {
  const det = d.regra === 'determinacao';
  const defs = det ? [['pv', 'Vida', 'PV', 'pvMax', 'v'], ['pd', 'Determinação', 'PD', 'pdMax', 'd']] : [['pv', 'Vida', 'PV', 'pvMax', 'v'], ['san', 'Sanidade', 'SAN', 'sanMax', 's'], ['pe', 'Esforço', 'PE', 'peMax', 'e']];
  const ed = F.atual.editavel;
  return defs.map(([k, n, sg, mx, cls]) => `<div class="fx-barra fx-barra-${cls}" data-barra="${k}" data-max="${mx}">
    <div class="fx-barra-cab"><span class="fx-barra-tit">${n} <i>${sg}</i></span><span class="fx-barra-txt"><input data-c="${k}.a" type="number" data-n="1" class="fx-barra-at"${RO()}><i>/</i><output data-calc="${mx}"></output></span></div>
    <div class="fx-barra-trilho"><div class="fx-barra-fill"></div></div>
    <div class="fx-barra-ctl">${ed ? `<button data-acao="barra" data-k="${k}" data-v="-5">−5</button><button data-acao="barra" data-k="${k}" data-v="-1">−1</button><button data-acao="barra" data-k="${k}" data-v="1">+1</button><button data-acao="barra" data-k="${k}" data-v="5">+5</button>` : ''}
    <label class="fx-ajuste" title="Ajuste no máximo (poderes, origem, itens, regras da casa)">ajuste ${campo(k + '.aj', 'n')}</label></div></div>`).join('');
}
// recalcula só os números (não redesenha: preserva o foco do que está sendo digitado)
function atualizarDerivados() {
  const at = F.atual; if (!at || !at.d) return;
  const d = at.d, r = calc(d), raiz = $('#fxCorpo');
  const put = (k, v) => $$(`[data-calc="${k}"]`, raiz).forEach(e => { e.textContent = v; });
  put('peTurno', r.peTurno);
  atualizarGasto();
  put('desl', `m / ${Math.floor(r.desl / 1.5)} q${r.sobrecarga ? ' (−3m carga)' : ''}`);
  put('defesa', r.defesa); put('defEquip', r.defEquip); put('defCarga', [r.sobrecarga ? '−5 sobrecarga' : '', ...r.defCond.f].filter(Boolean).join(' · '));
  const cx = $('[data-conds]', raiz);
  if (cx) {
    const nomes = [...r.conds].filter(k => (A.COND || {})[k] || COND_NOME[k]);
    const bi = d.bonusInt || {};
    const extra = [int(bi.ex) ? `🏋️ exercício ×${int(bi.ex)}` : '', int(bi.le) ? `📖 leitura ×${int(bi.le)}` : ''].filter(Boolean);
    const html = (nomes.length ? `<span class="fx-k">Condições</span>${nomes.map(k => { const c = (A.COND || {})[k]; return `<i class="fx-cond" title="${esc(COND_NOME[k] || (c && c.n) || k)}">${c ? c.i + ' ' : ''}${esc((c && c.n) || COND_NOME[k] || k)}</i>`; }).join('')}` : '')
      + (extra.length ? `<span class="fx-k">Bônus de interlúdio</span>${extra.map(x => `<i class="fx-cond fx-bonus">${x}</i>`).join('')}` : '');
    if (cx.innerHTML !== html) cx.innerHTML = html;
  }
  put('bloqueio', r.bloqueio); put('esquiva', r.esquiva);
  ['pvMax', 'peMax', 'sanMax', 'pdMax'].forEach(k => put(k, r[k]));
  PERICIAS.forEach(([id]) => {
    const b = r.bonus(id);
    put('per-' + id, b > 0 ? '+' + b : b < 0 ? '−' + Math.abs(b) : '0');
    const tr = $(`tr[data-per="${id}"]`, raiz);
    if (tr) { const t = int((d.per[id] || {}).t); tr.className = t ? 'treinada t' + t : ''; $$('.fx-treino button', tr).forEach(x => x.classList.toggle('on', t >= int(x.dataset.v))); }
  });
  $$('.fx-pips', raiz).forEach(p => { const v = int(d.atr[p.dataset.pips]); [...p.children].forEach((x, i) => x.classList.toggle('on', i < v)); p.classList.toggle('mais', v > 5); });
  $$('.fx-barra', raiz).forEach(b => {
    const k = b.dataset.barra, mx = r[b.dataset.max];
    const a = d[k] && d[k].a !== undefined && d[k].a !== null && d[k].a !== '' ? int(d[k].a) : mx;
    const inp = $('.fx-barra-at', b);
    if (document.activeElement !== inp) inp.value = a;
    const pc = Math.max(0, Math.min(100, mx ? a / mx * 100 : 0));
    $('.fx-barra-fill', b).style.width = `${pc}%`;
    b.classList.toggle('critico', pc > 0 && pc <= 25); b.classList.toggle('zerado', a <= 0);
  });
  // inventário
  put('dt', r.dt);
  put('carga', `${+r.carga.toFixed(1)}`); put('cargaMax', r.cargaMax);
  const cb = $('.fx-carga', raiz); if (cb) cb.classList.toggle('sobre', r.sobrecarga);
  put('cargaAviso', r.carga > r.cargaMax * 2 ? 'Acima do dobro: não dá para carregar tudo isso!' : r.sobrecarga ? 'Sobrecarregado: −5 em Defesa e perícias com +, −3m de deslocamento' : '');
  put('patente', r.patente.n); put('credito', r.patente.cred);
  r.patente.lim.forEach((l, i) => { put('lim' + i, l); put('cont' + i, r.contagem[i]); const e = $(`[data-calc="cont${i}"]`, raiz); if (e) e.classList.toggle('fx-alerta', r.contagem[i] > l); });
}

/* ---------- abas da direita ---------- */
function desenharAba() {
  const el = $('#fxAba'); if (!el) return;
  const d = F.atual.d;
  const ed = F.atual.editavel;
  const aba = F.aba;
  $$('.fx-abas button').forEach(b => b.classList.toggle('on', b.dataset.v === aba));
  if (aba === 'combate') el.innerHTML = abaCombate(d, ed);
  if (aba === 'habilidades') el.innerHTML = abaLista('hab', 'habilidades', d, ed);
  if (aba === 'rituais') el.innerHTML = abaRituais(d, ed);
  if (aba === 'inventario') el.innerHTML = abaInventario(d, ed);
  if (aba === 'descricao') el.innerHTML = `<div class="fx-desc">
    <label>Anotações ${area('desc.anot', 4, 'Anotações pessoais do agente...')}</label>
    <label>Aparência ${area('desc.apar', 4)}</label><label>Personalidade ${area('desc.pers', 4)}</label>
    <label>Histórico ${area('desc.hist', 5)}</label><label>Objetivo ${area('desc.obj', 3)}</label></div>`;
  $$('details[data-id]', el).forEach(dt => { if (F.abertos.has(dt.dataset.id)) dt.open = true; });
  atualizarDerivados();
}

function abaCombate(d, ed) {
  const r = calc(d);
  const armas = lista(d.itens).filter(it => it.t === 'arma');
  const linhaAtaque = (it, desarmado) => {
    const a = it.a || {};
    const corpo = /corpo/i.test(a.tipo || '') || desarmado;
    const arremesso = /arremesso/i.test(a.tipo || '');
    const per = corpo ? 'luta' : 'pontaria';
    const bAtk = r.bonus(per) + int(a.bAtk);
    const somaFor = corpo || arremesso;
    const forV = int(d.atr.for);
    const extra = `${somaFor && forV ? (forV > 0 ? '+' : '') + forV : ''}${int(a.bDano) ? (int(a.bDano) > 0 ? '+' : '') + int(a.bDano) : ''}`;
    // "1d6/1d8": duas formas de usar a arma (ex.: uma ou duas mãos); cada uma ganha seu botão
    const base = String(a.dano || '1d3').trim();
    const alts = /^\s*\d*d\d+(\s*\/\s*\d*d\d+)+/i.test(base) ? (() => { const m = /^([\dd\s/]+)(.*)$/i.exec(base); return m[1].split('/').map(x => x.trim() + m[2].trim()); })() : [base];
    const dano = alts.map(x => x + extra).join(' / ');
    const marg = int(a.margem) || 20, mult = int(a.mult) || 2;
    const mods = lista(it.mods).map(m => m.n).join(', ');
    const mun = !desarmado && a.mun ? municaoDa(d, it) : null;
    const munTxt = mun ? (mun.falta ? `<span class="fx-mun-falta">Munição <b>sem ${esc(a.mun)}</b></span>` : `<span class="${qtdDe(mun) <= 0 ? 'fx-mun-falta' : ''}">Munição <b>${esc(textoMun(mun))}</b></span>`) : '';
    return `<div class="fx-ataque"><div><b>${esc(it.n)}</b><small>${esc([a.prof, a.tipo, a.emp].filter(Boolean).join(' · '))}${mods ? ' · ' + esc(mods) : ''}</small></div>
      <div class="fx-ataque-num"><span>Ataque <b>${PER[per][1]}</b> ${bAtk >= 0 ? '+' : ''}${bAtk}</span><span>Dano <b>${esc(dano)}</b>${a.td ? ' ' + esc(a.td) : ''}</span><span>Crítico <b>${marg < 20 ? marg + '/' : ''}x${mult}</b></span>${a.alc ? `<span>Alcance <b>${esc(a.alc)}</b></span>` : ''}${munTxt}</div>
      <div class="fx-ataque-btns"><button data-acao="atacar" data-id="${esc(it.id || '')}" data-per="${per}">🎲 Ataque</button>${alts.map((x, i) => `<button data-acao="dano" data-expr="${esc(x + extra)}" data-n="${esc(it.n)}${alts.length > 1 ? ' (' + esc(x) + ')' : ''}">🎲 Dano${alts.length > 1 ? ' ' + esc(x) : ''}</button>`).join('')}${alts.map((x, i) => `<button data-acao="dano" data-expr="${esc(x + extra)}" data-mult="${mult}" data-n="${esc(it.n)}${alts.length > 1 ? ' (' + esc(x) + ')' : ''}">💥 Crítico${alts.length > 1 ? ' ' + esc(x) : ''}</button>`).join('')}</div></div>`;
  };
  return `<div class="fx-combate">
    <div class="fx-rapidos">${['fortitude', 'reflexos', 'vontade', 'iniciativa', 'percepcao'].map(p => `<button data-acao="rolar-per" data-v="${p}"><span>${PER[p][1]}</span><b>${r.bonus(p) >= 0 ? '+' : ''}${r.bonus(p)}</b></button>`).join('')}</div>
    <h4>Ataques</h4>
    ${linhaAtaque({ n: 'Ataque desarmado', a: { dano: '1d3', tipo: 'Corpo a Corpo', emp: 'Leve', td: 'Impacto (não letal)', margem: 20, mult: 2 } }, true)}
    ${armas.map(it => linhaAtaque(it)).join('') || '<p class="fx-vazio-p">Nenhuma arma no inventário. Adicione na aba Inventário.</p>'}
    <p class="fx-legenda">Corpo a corpo e arremesso somam a Força no dano. Efeitos de melhorias (como o +2 da Alongada) entram nos campos Bônus ataque, Bônus dano e Crítico da arma, no inventário.</p></div>`;
}

// habilidades
function abaLista(campoD, nomeCat, d, ed) {
  const filtro = (F.filtros[campoD] || '').toLowerCase();
  const itens = lista(d[campoD]).filter(h => !filtro || (h.n + ' ' + h.d).toLowerCase().includes(filtro));
  return `<div class="fx-topo-aba"><input class="fx-filtro" data-filtro="${campoD}" placeholder="Filtrar ${nomeCat}" value="${esc(F.filtros[campoD] || '')}">
    ${ed ? `<button class="fx-btn-roxo" data-acao="catalogo" data-v="${campoD}">Adicionar</button><button data-acao="novo" data-v="${campoD}">Nova habilidade</button>` : ''}</div>
    <div class="fx-itens">${itens.map(h => `<details data-id="${h.id}"><summary><b>${esc(h.n || 'Sem nome')}</b>${h.g ? `<small>${esc(h.g)}</small>` : ''}${h.el ? `<i class="fx-el" style="--el:${corEl(h.el)}">${esc(h.el)}</i>` : ''}</summary>
      <div class="fx-det">${ed ? `<label>Nome ${campo(`${campoD}.${h.id}.n`)}</label>${area(`${campoD}.${h.id}.d`, 5)}<div class="fx-det-acoes"><button class="fx-btn-perigo" data-acao="remover" data-v="${campoD}" data-id="${h.id}">Remover</button></div>`
        : `<p class="fx-texto">${esc(h.d)}</p>`}</div></details>`).join('') || `<p class="fx-vazio-p">${filtro ? 'Nada encontrado.' : 'Você ainda não possui habilidades.'}</p>`}</div>`;
}

// formas avançadas descritas no texto do ritual: "Discente (+3 PE)" e "Verdadeiro (+7 PE)"
function formasDoRitual(h) {
  const t = String(h.d || '');
  const out = [{ k: 'n', n: 'Conjurar', extra: 0 }];
  const md = /Discente\s*\(\s*\+\s*(\d+)\s*PE\s*\)/i.exec(t), mv = /Verdadeir[oa]\s*\(\s*\+\s*(\d+)\s*PE\s*\)/i.exec(t);
  if (md) out.push({ k: 'd', n: 'Discente', extra: int(md[1]) });
  if (mv) out.push({ k: 'v', n: 'Verdadeiro', extra: int(mv[1]) });
  return out;
}
function abaRituais(d, ed) {
  const filtro = (F.filtros.rit || '').toLowerCase();
  const its = lista(d.rit).filter(h => !filtro || (h.n + ' ' + h.d + ' ' + h.el).toLowerCase().includes(filtro));
  const pe = d.regra === 'determinacao' ? 'PD' : 'PE';
  return `<div class="fx-topo-aba"><input class="fx-filtro" data-filtro="rit" placeholder="Filtrar rituais" value="${esc(F.filtros.rit || '')}">
    ${ed ? `<button class="fx-btn-roxo" data-acao="catalogo" data-v="rit">Adicionar</button><button data-acao="novo" data-v="rit">Novo ritual</button>` : ''}</div>
    <div class="fx-dt"><span>DT DE RITUAIS</span><output data-calc="dt"></output><label>ajuste ${campo('dtAj', 'n')}</label></div>
    <div class="fx-itens">${its.map(h => {
      const custo = CUSTO_RITUAL[int(h.c)] || 1;
      const campos = [['ex', 'Execução'], ['al', 'Alcance'], ['av', 'Alvo'], ['ar', 'Área'], ['ef', 'Efeito'], ['du', 'Duração'], ['re', 'Resistência']];
      return `<details data-id="${h.id}" style="--el:${corEl(h.el)}"><summary><b>${esc(h.n || 'Sem nome')}</b><i class="fx-el" style="--el:${corEl(h.el)}">${esc(h.el || '')} ${int(h.c) || 1}º</i><small>${custo} ${pe}</small></summary>
      <div class="fx-det">${ed ? `<div class="fx-rit-campos"><label>Nome ${campo(`rit.${h.id}.n`)}</label><label>Elemento <input data-c="rit.${h.id}.el" list="fxElementos" value="${esc(h.el || '')}"></label><label>Círculo <select data-c="rit.${h.id}.c" data-n="1">${[1, 2, 3, 4].map(c => `<option ${int(h.c) === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        ${campos.map(([k, n]) => `<label>${n} ${campo(`rit.${h.id}.${k}`)}</label>`).join('')}</div>${area(`rit.${h.id}.d`, 6)}
        <datalist id="fxElementos">${['Conhecimento', 'Energia', 'Morte', 'Sangue', 'Medo', 'Varia'].map(e => `<option value="${e}">`).join('')}</datalist>
        <div class="fx-det-acoes">${formasDoRitual(h).map(f => `<button class="fx-btn-roxo" data-acao="conjurar" data-id="${h.id}" data-forma="${f.k}">${f.n} (−${custo + f.extra} ${pe})</button>`).join('')}<button class="fx-btn-perigo" data-acao="remover" data-v="rit" data-id="${h.id}">Remover</button></div>`
        : `<p class="fx-rit-linhas">${campos.filter(([k]) => h[k]).map(([k, n]) => `<b>${n}:</b> ${esc(h[k])}`).join('<br>')}</p><p class="fx-texto">${esc(h.d)}</p>`}</div></details>`;
    }).join('') || `<p class="fx-vazio-p">${filtro ? 'Nada encontrado.' : 'Você ainda não possui rituais.'}</p>`}</div>`;
}

function abaInventario(d, ed) {
  const r = calc(d);
  const filtro = (F.filtros.itens || '').toLowerCase();
  const its = lista(d.itens).filter(h => !filtro || (h.n + ' ' + (h.d || '')).toLowerCase().includes(filtro));
  return `<div class="fx-topo-aba"><input class="fx-filtro" data-filtro="itens" placeholder="Filtrar itens" value="${esc(F.filtros.itens || '')}">${ed ? '<button class="fx-btn-roxo" data-acao="catalogo" data-v="itens">Adicionar</button>' : ''}</div>
    <div class="fx-inv-grade">
      <label>Pontos de prestígio ${campo('pp', 'n', ' min="0"')}</label>
      <label>Patente <select data-c="patente"${RO()}><option value="">Automática (<output data-calc="patente"></output>)</option>${PATENTES.map(p => `<option value="${p.n}" ${d.patente === p.n ? 'selected' : ''}>${p.n} (${p.pp} PP)</option>`).join('')}</select></label>
      <div class="fx-inv-tab"><span>Limite de itens</span>${[0, 1, 2, 3].map(i => `<b title="Categoria ${ROM[i + 1]}"><small>${ROM[i + 1]}</small><output data-calc="lim${i}"></output></b>`).join('')}</div>
      <div class="fx-inv-tab"><span>No inventário</span>${[0, 1, 2, 3].map(i => `<b title="Categoria ${ROM[i + 1]}"><small>${ROM[i + 1]}</small><output data-calc="cont${i}"></output></b>`).join('')}</div>
      <label>Limite de crédito <output class="fx-caixa" data-calc="credito"></output></label>
      <div class="fx-carga"><span>Carga</span><b><output data-calc="carga"></output> / <output data-calc="cargaMax"></output></b><label>bônus ${campo('cargaAj', 'n')}</label><small data-calc="cargaAviso"></small></div>
    </div>
    ${ed ? `<div class="fx-novo"><span>NOVO</span>${Object.entries(TIPOS_ITEM).map(([k, n]) => `<button data-acao="novo-item" data-v="${k}">${n}</button>`).join('')}</div>` : ''}
    <div class="fx-itens">${its.map(it => itemHTML(it, ed)).join('') || `<p class="fx-vazio-p">${filtro ? 'Nada encontrado.' : 'Inventário vazio.'}</p>`}</div>
    <p class="fx-legenda">Carga: 5 espaços por ponto de Força (Força 0: 2). Patente vem dos pontos de prestígio, a menos que você escolha uma. Cada modificação ou maldição sobe a categoria do item em I.</p>`;
}
function itemHTML(it, ed) {
  const base = `itens.${it.id}`;
  const ce = catEfetiva(it);
  const a = it.a || {};
  const mods = lista(it.mods);
  const cab = `<summary><b>${esc(it.n || 'Item')}</b>${it.t === 'municao' ? `<small class="fx-mun${qtdDe(it) <= 0 ? ' fx-mun-falta' : ''}">${esc(textoMun(it))}</small>` : int(it.qtd) > 1 ? `<small>×${int(it.qtd)}</small>` : ''}<small>${TIPOS_ITEM[it.t] || ''}</small>${it.el ? `<i class="fx-el" style="--el:${corEl(it.el)}">${esc(it.el)}</i>` : ''}<span class="fx-cat">Categoria: ${ROM[ce] || ce} · Espaços: ${num(it.esp)}</span>${it.t === 'protecao' && it.vest ? '<i class="fx-vest">vestida</i>' : ''}</summary>`;
  if (!ed) {
    const linhas = [];
    if (it.t === 'arma') linhas.push(`${esc([a.prof, a.tipo, a.emp].filter(Boolean).join(' · '))}<br>Dano ${esc(a.dano || '')} · Crítico ${int(a.margem) < 20 && int(a.margem) ? int(a.margem) + '/' : ''}x${int(a.mult) || 2}${a.td ? ' · ' + esc(a.td) : ''}${a.alc ? ' · Alcance ' + esc(a.alc) : ''}`);
    if (it.t === 'protecao') linhas.push(`Defesa +${int(it.def)}`);
    return `<details data-id="${it.id}">${cab}<div class="fx-det"><p class="fx-rit-linhas">${linhas.join('<br>')}</p><p class="fx-texto">${esc(it.d || '')}</p>
      ${mods.length ? `<p class="fx-mods-ro">${mods.map(m => `<b>${esc(m.n)}</b>${m.el ? ` (${esc(m.el)})` : ''}`).join(' · ')}</p>` : ''}</div></details>`;
  }
  return `<details data-id="${it.id}">${cab}<div class="fx-det">
    <div class="fx-item-campos">
      <label class="fx-l2">Nome ${campo(base + '.n')}</label>
      <label>Tipo <select data-c="${base}.t">${Object.entries(TIPOS_ITEM).map(([k, n]) => `<option value="${k}" ${it.t === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>Categoria base <select data-c="${base}.cat" data-n="1">${[0, 1, 2, 3, 4].map(c => `<option value="${c}" ${int(it.cat) === c ? 'selected' : ''}>${ROM[c]}</option>`).join('')}</select></label>
      <label>Espaços ${campo(base + '.esp', 'n', ' step="0.5" min="0"')}</label>
      <label>Qtd. ${campo(base + '.qtd', 'n', ' min="0"')}</label>
      ${it.t === 'amaldicoado' ? `<label>Elemento <input data-c="${base}.el" list="fxElementos2" value="${esc(it.el || '')}"></label>` : ''}
      ${it.t === 'protecao' ? `<label>Defesa ${campo(base + '.def', 'n')}</label><label class="fx-check"><input type="checkbox" data-c="${base}.vest" ${it.vest ? 'checked' : ''}> vestida (soma na Defesa)</label>` : ''}
      ${it.t === 'arma' ? `<label>Proficiência <input data-c="${base}.a.prof" list="fxProf" value="${esc(a.prof || '')}"></label>
        <label>Tipo <input data-c="${base}.a.tipo" list="fxTipoArma" value="${esc(a.tipo || '')}"></label>
        <label>Empunhadura <input data-c="${base}.a.emp" list="fxEmp" value="${esc(a.emp || '')}"></label>
        <label>Dano ${campo(base + '.a.dano')}</label><label>Crítico (margem) ${campo(base + '.a.margem', 'n', ' min="2" max="20"')}</label>
        <label>Multiplicador ${campo(base + '.a.mult', 'n', ' min="2"')}</label><label>Tipo de dano ${campo(base + '.a.td')}</label>
        <label>Alcance ${campo(base + '.a.alc')}</label><label>Bônus ataque ${campo(base + '.a.bAtk', 'n')}</label><label>Bônus dano ${campo(base + '.a.bDano', 'n')}</label>
        <label>Munição <input data-c="${base}.a.mun" list="fxMunLista" value="${esc(a.mun || '')}" placeholder="nenhuma"></label>` : ''}
      ${it.t === 'municao' ? `<label>Duração <select data-c="${base}.cenas"><option value="">Do livro (${{ 1: '1 cena', 2: '2 cenas', missao: 'missão', tiro: '1 disparo' }[durMun({ ...it, cenas: '' })]})</option>${[['1', '1 cena'], ['2', '2 cenas'], ['missao', 'Missão inteira'], ['tiro', 'Um disparo']].map(([k, n]) => `<option value="${k}" ${String(it.cenas || '') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <p class="fx-legenda fx-l2">${esc(textoMun(it))}. Atacar com a arma ligada a esta munição marca o pacote; a "Nova cena" do Mestre desconta.${it.usou || (restamMun(it) !== null && restamMun(it) < int(durMun(it))) ? ` <button class="fx-mini" data-acao="mun-novo" data-id="${it.id}">Abrir pacote novo</button>` : ''}</p>` : ''}
    </div>
    ${area(base + '.d', 4, 'Descrição')}
    ${it.t === 'arma' || it.t === 'protecao' || it.t === 'municao' ? `<div class="fx-mods"><span>Melhorias${mods.length ? ` (+${mods.length} categoria)` : ''}</span>${mods.map(m => `<span class="fx-chip${m.mal ? ' mal' : ''}" title="${esc(m.d || '')}">${esc(m.n)}${m.el ? ` · ${esc(m.el)}` : ''}<button data-acao="rem-mod" data-id="${it.id}" data-m="${m.id}" aria-label="Remover">×</button></span>`).join('')}<button class="fx-btn-roxo fx-mini" data-acao="add-mod" data-id="${it.id}">Adicionar</button></div>` : ''}
    <div class="fx-det-acoes"><button class="fx-btn-perigo" data-acao="remover" data-v="itens" data-id="${it.id}">Remover</button></div>
    <datalist id="fxProf"><option value="Armas Simples"><option value="Armas Táticas"><option value="Armas Pesadas"></datalist>
    <datalist id="fxTipoArma"><option value="Corpo a Corpo"><option value="Arma de Disparo"><option value="Arma de Fogo"><option value="Arremesso"></datalist>
    <datalist id="fxEmp"><option value="Leve"><option value="Uma Mão"><option value="Duas Mãos"></datalist>
    <datalist id="fxMunLista">${[...new Set([...lista(F.atual.d.itens).filter(x => x.t === 'municao').map(x => x.n), 'Balas Curtas', 'Balas Longas', 'Cartuchos', 'Combustível', 'Flechas', 'Foguete'])].map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <datalist id="fxElementos2">${['Conhecimento', 'Energia', 'Morte', 'Sangue', 'Medo', 'Varia'].map(e => `<option value="${e}">`).join('')}</datalist>
  </div></details>`;
}

/* ---------------- CATÁLOGO (modal) ----------------
   Habilidades: abas por classe, origens, poderes paranormais e homebrew; chips por trilha ou fonte.
   Rituais: abas por elemento, chips por círculo. Itens: abas por tipo, chips por fonte.
   "Minhas": o que você criou nas suas fichas e não está no catálogo, para reaproveitar. */
const ELEMENTOS = ['Conhecimento', 'Energia', 'Morte', 'Sangue', 'Medo', 'Varia'];
const LIVRO_ITENS = ['Armas', 'Munições', 'Proteções', 'Geral', 'Itens Amaldiçoados'];
const fonteDe = x => (/CÍRCULO/i.test(x.g || '') || LIVRO_ITENS.includes(x.g) ? 'Livro' : x.g || 'Outros');
const TRILHA_CLASSE = {};
Object.entries(CLASSES).forEach(([k, c]) => (c.trilhas || []).forEach(t => { TRILHA_CLASSE[t.toLowerCase()] = k; }));
function abaDe(tipo, x) {
  if (tipo === 'hab') {
    const g = String(x.g || '').toLowerCase();
    if (g.startsWith('poderes de ')) return g.slice(11);
    if (TRILHA_CLASSE[g]) return TRILHA_CLASSE[g];
    if (g === 'origens') return 'origens';
    if (ELEMENTOS.some(e => e.toLowerCase() === g)) return 'paranormal';
    return 'homebrew';
  }
  if (tipo === 'rit') return String(x.el || 'varia').toLowerCase().split(/[\s&/]/)[0];
  return x.t || 'geral';
}
function abasDe(tipo) {
  if (tipo === 'hab') return [['combatente', 'Combatente'], ['especialista', 'Especialista'], ['ocultista', 'Ocultista'], ['origens', 'Origens'], ['paranormal', 'Poderes Paranormais'], ['homebrew', 'Homebrew']];
  if (tipo === 'rit') return [['todos', 'Todos'], ...ELEMENTOS.map(e => [e.toLowerCase(), e])];
  if (tipo === 'itens') return [['arma', 'Armas'], ['municao', 'Munições'], ['protecao', 'Proteções'], ['geral', 'Geral'], ['amaldicoado', 'Itens Amaldiçoados']];
  return [];
}
// chips da aba: [valor, rótulo, filtro]
function chipsDe(tipo, tab, base) {
  if (tipo === 'hab') {
    if (tab === 'origens') return [];
    const gs = [...new Set(base.filter(x => abaDe('hab', x) === tab).map(x => x.g))];
    const chips = gs.map(g => [g, g, x => x.g === g]);
    return ['paranormal', 'homebrew'].includes(tab) ? [['', 'Todos', () => true], ...chips] : chips;
  }
  if (tipo === 'rit') return [['', 'Todos', () => true], ...[1, 2, 3, 4].map(c => [String(c), `${c}º Círculo`, x => int(x.c) === c])];
  if (tipo === 'itens') {
    const fs = [...new Set(base.filter(x => abaDe('itens', x) === tab).map(fonteDe))];
    return fs.length > 1 ? [['', 'Todos', () => true], ...fs.map(f => [f, f, x => fonteDe(x) === f])] : [];
  }
  return [];
}
const NOMES_CAT = { hab: ['Habilidades', 'Minhas habilidades', 'Adicionar habilidade'], rit: ['Rituais', 'Meus rituais', 'Adicionar ritual'], itens: ['Itens', 'Meus itens', 'Adicionar item'] };
function baseDe(c) {
  if (c.tipo === 'hab') return C.habilidades;
  if (c.tipo === 'rit') return C.rituais;
  if (c.tipo === 'itens') return C.itens;
  return c.sub === 'maldicoes' ? C.maldicoes : C.melhorias;
}
function abrirCatalogo(tipo, itemId) {
  const ultimo = (F.ultimoCat || {})[tipo] || {};
  let tab = ultimo.tab;
  if (!tab) {
    const d = F.atual && F.atual.d;
    tab = tipo === 'hab' ? (['combatente', 'especialista', 'ocultista'].includes(d && d.classe) ? d.classe : 'combatente') : tipo === 'rit' ? 'todos' : 'arma';
  }
  F.cat = { tipo, itemId, seg: 'cat', tab, chip: ultimo.chip, busca: '', fonte: '', sub: tipo === 'mods' ? 'melhorias' : '', minhas: null };
  desenharCatalogo();
}
async function carregarMinhas() {
  const c = F.cat; if (!c) return;
  const campoD = c.tipo === 'hab' ? 'hab' : c.tipo === 'rit' ? 'rit' : 'itens';
  const nomes = new Set(baseDe(c).map(x => x.n.toLowerCase()));
  let fichas = [];
  try {
    if (ehMestre()) fichas = Object.values((await A.Rede.once('agentesMestre')) || {});
    else fichas = (await Promise.all(indice().filter(r => r && r.chave && r.dono === quem()).map(r => A.Rede.once(caminho(r)).catch(() => null)))).filter(Boolean);
  } catch (e) {}
  const atual = F.atual && F.atual.d;
  if (atual && !fichas.some(f => f.criado === atual.criado && f.nome === atual.nome)) fichas.push(atual);
  const vistos = new Set(), out = [];
  fichas.forEach(f => lista(f[campoD]).forEach(x => {
    const k = String(x.n || '').trim().toLowerCase();
    const assinatura = k + '|' + String(x.d || '').slice(0, 80);
    if (!k || nomes.has(k) || vistos.has(assinatura)) return;
    vistos.add(assinatura);
    out.push({ ...x, fichaOrigem: f.nome || '' });
  }));
  if (F.cat === c) { c.minhas = out.sort((a, b) => a.n.localeCompare(b.n, 'pt-BR')); desenharCatalogo(); }
}
function artigoCatalogo(x, c, i, minha) {
  const meta = [minha ? 'Na ficha ' + (x.fichaOrigem || '') : (c.tipo === 'hab' && c.busca ? x.g : ''), c.tipo === 'rit' && x.el ? x.el : '', x.c ? x.c + 'º círculo' : '', c.tipo === 'rit' && !minha ? fonteDe(x) : '',
    c.tipo === 'itens' ? (TIPOS_ITEM[x.t] || '') : '', c.tipo === 'itens' && x.cat !== undefined ? 'Categoria ' + (ROM[x.cat] || x.cat) : '', c.tipo === 'itens' && x.esp !== undefined ? x.esp + ' espaço' + (num(x.esp) === 1 ? '' : 's') : '',
    x.a ? `${x.a.dano} · ${x.a.margem < 20 ? x.a.margem + '/' : ''}x${x.a.mult}` : '', x.def ? 'Defesa +' + x.def : '', c.tipo === 'itens' && !minha ? fonteDe(x) : '', c.tipo === 'mods' && x.el ? x.el : ''].filter(Boolean);
  const d = String(x.d || '');
  return `<article class="fx-cat-item" style="--el:${corEl(x.el)}"><div><b>${esc(x.n)}</b>${meta.length ? `<small>${esc(meta.join(' · '))}</small>` : ''}
    <p>${esc(d.slice(0, 420))}${d.length > 420 ? '…' : ''}</p></div><button class="fx-btn-roxo" data-acao="cat-add" data-i="${i}"${minha ? ' data-m="1"' : ''}>Adicionar</button></article>`;
}
function desenharCatalogo() {
  const m = $('#fxModal'); const c = F.cat; if (!c) { m.hidden = true; return; }
  m.hidden = false;
  const base = baseDe(c);
  const mods = c.tipo === 'mods';
  const nomes = NOMES_CAT[c.tipo] || ['Modificações', 'Maldições', 'Melhorias para itens'];
  const b = c.busca.toLowerCase().trim();
  let corpoLista = '', contagem = '', barraFiltros = '';
  if (!mods && c.seg === 'minhas') {
    if (!c.minhas) { corpoLista = '<p class="fx-vazio-p">Procurando nas suas fichas…</p>'; if (!c.carregando) { c.carregando = true; carregarMinhas(); } }
    else {
      const res = c.minhas.map((x, i) => ({ x, i })).filter(({ x }) => !b || (x.n + ' ' + (x.d || '')).toLowerCase().includes(b));
      contagem = `${res.length} criado${res.length === 1 ? '' : 's'} por você`;
      corpoLista = res.map(({ x, i }) => artigoCatalogo(x, c, i, true)).join('') || `<p class="fx-vazio-p">${b ? 'Nada encontrado.' : 'Nada criado por você ainda. Crie do zero abaixo: o que você criar aparece aqui para usar em outras fichas.'}</p>`;
    }
    const criar = c.tipo === 'itens' ? Object.entries(TIPOS_ITEM).map(([k, n]) => `<button data-acao="novo-item" data-v="${k}">+ ${n}</button>`).join('') : `<button data-acao="novo" data-v="${c.tipo}">+ ${c.tipo === 'rit' ? 'Novo ritual' : 'Nova habilidade'}</button>`;
    barraFiltros = `<div class="fx-cat-criar"><span>Criar do zero</span>${criar}</div>`;
  } else {
    let res = base.map((x, i) => ({ x, i }));
    if (b) {
      res = res.filter(({ x }) => (x.n + ' ' + (x.d || '') + ' ' + (x.g || '')).toLowerCase().includes(b));
      const peso = x => { const n = x.n.toLowerCase(); return n === b ? 0 : n.startsWith(b) ? 1 : n.includes(b) ? 2 : 3; };
      res.sort((p, q) => peso(p.x) - peso(q.x));
    } else if (!mods) {
      if (!(c.tipo === 'rit' && c.tab === 'todos')) res = res.filter(({ x }) => abaDe(c.tipo, x) === c.tab);
      const chips = chipsDe(c.tipo, c.tab, base);
      if (chips.length && !chips.some(ch => ch[0] === (c.chip || ''))) c.chip = chips[0][0];
      const ch = chips.find(k => k[0] === (c.chip || ''));
      if (ch) res = res.filter(({ x }) => ch[2](x));
      if (c.tipo === 'rit' && c.fonte) res = res.filter(({ x }) => fonteDe(x) === c.fonte);
      barraFiltros = chips.length ? `<div class="fx-chips">${chips.map(([v, n]) => `<button data-acao="cat-chip" data-v="${esc(v)}" class="${(c.chip || '') === v ? 'on' : ''}">${esc(n)}</button>`).join('')}</div>` : '';
    }
    const mostra = res.slice(0, 120);
    contagem = `${res.length} resultado${res.length === 1 ? '' : 's'}${b && !mods ? ' em todo o catálogo' : ''}${res.length > mostra.length ? ` · mostrando ${mostra.length}, refine a busca` : ''}`;
    corpoLista = mostra.map(({ x, i }) => artigoCatalogo(x, c, i, false)).join('') || '<p class="fx-vazio-p">Nada encontrado.</p>';
  }
  const fontesRit = c.tipo === 'rit' && c.seg === 'cat' && !b ? [...new Set(C.rituais.map(fonteDe))] : [];
  m.innerHTML = `<div class="fx-modal-caixa" style="${F.atual ? estiloAc(F.atual.d.dono) : ''}"><div class="fx-modal-topo"><h3>${esc(nomes[2])}</h3><button class="fx-fechar" data-acao="fechar-modal" aria-label="Fechar">×</button></div>
    <div class="fx-seg">${mods
      ? `<button data-acao="mod-sub" data-v="melhorias" class="${c.sub === 'melhorias' ? 'on' : ''}">Modificações</button><button data-acao="mod-sub" data-v="maldicoes" class="${c.sub === 'maldicoes' ? 'on' : ''}">Maldições</button>`
      : `<button data-acao="cat-seg" data-v="cat" class="${c.seg === 'cat' ? 'on' : ''}">${nomes[0]}</button><button data-acao="cat-seg" data-v="minhas" class="${c.seg === 'minhas' ? 'on' : ''}">${nomes[1]}</button>`}</div>
    ${!mods && c.seg === 'cat' ? `<nav class="fx-cat-abas${b ? ' apagada' : ''}">${abasDe(c.tipo).map(([k, n]) => `<button data-acao="cat-tab" data-v="${k}" class="${c.tab === k ? 'on' : ''}">${n}</button>`).join('')}</nav>` : ''}
    ${barraFiltros}
    <div class="fx-modal-filtros"><span class="fx-busca"><input id="fxBusca" placeholder="Buscar${!mods && c.seg === 'cat' ? ' em todo o catálogo' : ''}…" value="${esc(c.busca)}"></span>
      ${fontesRit.length > 1 ? `<select id="fxFonte"><option value="">Todas as fontes</option>${fontesRit.map(f => `<option ${c.fonte === f ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select>` : ''}</div>
    <p class="fx-dica">${esc(contagem)}</p>
    <div class="fx-modal-lista">${corpoLista}</div></div>`;
  const busca = $('#fxBusca');
  busca.oninput = () => { c.busca = busca.value; const pos = busca.selectionStart; desenharCatalogo(); const nb = $('#fxBusca'); nb.focus(); nb.setSelectionRange(pos, pos); };
  const fo = $('#fxFonte'); if (fo) fo.onchange = () => { c.fonte = fo.value; desenharCatalogo(); };
}
function adicionarDoCatalogo(i, minha) {
  const c = F.cat; const id = A.Rede.chave();
  const o = Date.now();
  const x = minha ? c.minhas[i] : baseDe(c)[i];
  if (!x) return;
  if (minha) {
    const v = JSON.parse(JSON.stringify(x)); delete v.id; delete v.fichaOrigem; v.o = o;
    gravar(`${c.tipo === 'hab' ? 'hab' : c.tipo === 'rit' ? 'rit' : 'itens'}.${id}`, v, true);
  } else if (c.tipo === 'hab') { const v = { n: x.n, d: x.d, g: x.g || '', o }; if (x.el) v.el = x.el; gravar('hab.' + id, v, true); }
  else if (c.tipo === 'rit') { const v = { ...x, o }; delete v.g; gravar('rit.' + id, v, true); }
  else if (c.tipo === 'itens') {
    const v = { n: x.n, t: x.t, cat: x.cat, esp: x.esp, qtd: 1, d: x.d, o };
    if (x.el) v.el = x.el; if (x.a) v.a = { ...x.a }; if (x.def) v.def = x.def;
    if (x.t === 'protecao') v.vest = true;
    gravar('itens.' + id, v, true);
  } else if (c.tipo === 'mods') {
    const v = { n: x.n, d: x.d, o }; if (c.sub === 'maldicoes') { v.mal = true; if (x.el) v.el = x.el; }
    gravar(`itens.${c.itemId}.mods.${id}`, v, true);
    F.abertos.add(c.itemId);
  }
  A.aviso(`"${x.n}" adicionado.`);
  if (c.tipo === 'mods') { F.cat = null; $('#fxModal').hidden = true; }
  desenharAba();
}

/* ---------------- ROLAGENS ---------------- */
function mostrarRolagem(titulo, html) {
  const e = $('#fxRolagem');
  e.innerHTML = `<b>${esc(titulo)}</b>${html}<button class="fx-fechar" data-acao="fechar-rolagem" aria-label="Fechar">×</button>`;
  e.hidden = false;
  clearTimeout(F.tRol); F.tRol = setTimeout(() => { e.hidden = true; }, 9000);
  A.Som && A.Som.tom && A.Som.tom(520, 0, 0.06, 'triangle', 0.08);
}
const minhaFicha = () => F.atual && F.atual.editavel && !F.atual.ref.gm;
// teste de perícia de uma ficha qualquer, já com as condições (sem mostrar nada)
function testarPericia(d, id, extra = 0, tipo = '') {
  const r = calc(d);
  const attr = atrDaPericia(d, id);
  const pen = penalidadesDados(d, id, attr, tipo);
  const extraDados = pen.reduce((s, x) => s + x.n, 0);
  const t = rolarTeste(int(d.atr[attr]), r.bonus(id) + extra, extraDados);
  t.pen = pen; t.attr = attr; t.per = id;
  return t;
}
const htmlDados = t => `<div class="dados-faces">${t.dados.map(v => `<span class="face${v === t.esc ? ' usada' : ''}${v === 20 ? ' crit' : ''}${v === 1 ? ' falha' : ''}">${v}</span>`).join('')}</div>`;
const textoPen = t => (t.pen && t.pen.length ? t.pen.map(x => `${x.n}d20 ${x.fonte}`).join(', ') : '');
function rolarPericia(id, extra = 0, titulo, tipo = '') {
  const d = F.atual.d;
  const p = PER[id];
  const t = testarPericia(d, id, extra, tipo);
  const nome = titulo || p[1];
  F.ultimaRol = { nome, t, d6: 0 };
  mostrarRolagem(`${d.nome} · ${nome}`, htmlRolagem(F.ultimaRol, d));
  if (minhaFicha()) A.rolagemDaFicha(`${nome}: ${t.total} (${t.dados.length}d20: ${t.dados.join(', ')}${t.desv ? ', menor' : ''}; ${t.bonus >= 0 ? '+' : '−'}${Math.abs(t.bonus)}${t.pen.length ? '; ' + textoPen(t) : ''})`, id === 'iniciativa' ? t.total : undefined, t.dados, t.bonus);
  if (minhaFicha() && window.ACF_MESA && (t.esc === 20 || t.esc === 1)) window.ACF_MESA.momento(String(t.esc), nome, d);
  return t;
}
function htmlRolagem(u, d) {
  const t = u.t;
  const bi = d.bonusInt || {};
  const fis = ['agi', 'for', 'vig'].includes(t.attr), men = ['int', 'pre'].includes(t.attr);
  const podeEx = F.atual && F.atual.editavel && fis && int(bi.ex) > 0 && !u.usou, podeLe = F.atual && F.atual.editavel && men && int(bi.le) > 0 && !u.usou;
  return `${htmlDados(t)}
    <p>${t.desv ? 'Menor' : 'Maior'} dado <b>${t.esc}</b> ${t.bonus >= 0 ? '+' : '−'} ${Math.abs(t.bonus)}${u.d6 ? ` + <b>${u.d6}</b> (1d6)` : ''} = <span class="fx-total">${t.total + u.d6}</span></p>
    ${t.pen && t.pen.length ? `<p class="fx-legenda">Condições: ${esc(textoPen(t))}</p>` : ''}
    ${podeEx || podeLe ? `<p><button class="fx-mini" data-acao="usar-d6" data-v="${podeEx ? 'ex' : 'le'}">+1d6 de ${podeEx ? 'exercício' : 'leitura'} (${int(podeEx ? bi.ex : bi.le)} restante${int(podeEx ? bi.ex : bi.le) > 1 ? 's' : ''})</button></p>` : ''}`;
}
function rolarDano(expr, mult, nome) {
  const r = rolarExpr(expr, mult);
  mostrarRolagem(`${F.atual.d.nome} · ${mult > 1 ? 'Crítico' : 'Dano'}: ${nome}`, `<p class="fx-det-dano">${esc(r.det)}</p><p>Total <span class="fx-total">${r.total}</span></p>`);
  if (minhaFicha()) A.rolagemDaFicha(`${mult > 1 ? 'Crítico' : 'Dano'} (${nome}): ${r.total} · ${r.det}`);
}

/* ---------------- LIMITE DE PE POR TURNO ----------------
   Soma o que a ficha gastou no turno (botões de −PE e custo de rituais) e avisa quando passa do limite.
   Na perseguição, cada vez começa um turno novo; fora dela, zera depois de um minuto parado. */
function chaveTurno() { const p = A.estado.persg || {}; return p.on ? 'v' + (p.vts || p.rod || 0) : 'livre'; }
function gastoTurno(d) {
  const g = d.peGasto || {};
  if (g.k !== chaveTurno()) return 0;
  if (g.k === 'livre' && Date.now() - num(g.ts) > 60000) return 0;
  return int(g.v);
}
function registrarGasto(d, qtd) {
  if (!(qtd > 0) || !F.atual || F.atual.d !== d) return;
  const r = calc(d), antes = gastoTurno(d), novo = antes + qtd;
  gravar('peGasto', { k: chaveTurno(), v: novo, ts: Date.now() }, true);
  const K = d.regra === 'determinacao' ? 'PD' : 'PE';
  if (novo > r.peTurno && antes <= r.peTurno) A.aviso(`⚠ Limite de ${K} por turno passou: ${novo} de ${r.peTurno}. Pela regra, ninguém gasta mais que o limite num mesmo turno.`);
  atualizarGasto();
}
function atualizarGasto() {
  const o = $('[data-calc="peGasto"]'); if (!o || !F.atual || !F.atual.d || F.atual.d.tipo === 'ameaca') return;
  const d = F.atual.d, r = calc(d), g = gastoTurno(d);
  const txt = `${g}/${r.peTurno}`;
  if (o.textContent !== txt) o.textContent = txt;
  const caixa = o.closest('.fx-gasto'); if (caixa) { caixa.classList.toggle('passou', g > r.peTurno); caixa.classList.toggle('cheio', g === r.peTurno && g > 0); }
}

/* ---------------- MUNIÇÃO ----------------
   Duração tirada da descrição do livro (duas cenas, uma cena, missão inteira, um disparo).
   Atacar marca o pacote como "em uso"; a "Nova cena" do Mestre desconta; foguete sai um por disparo;
   flechas descontam no fim de missão. */
function durMun(it) {
  if (it.cenas) return String(it.cenas);
  const t = `${it.n || ''} ${it.d || ''}`.toLowerCase();
  if (/único disparo|unico disparo|cada foguete/.test(t)) return 'tiro';
  if (/missão inteira|missao inteira/.test(t)) return 'missao';
  if (/duas cenas/.test(t)) return '2';
  return '1';
}
const qtdDe = it => (it.qtd === undefined || it.qtd === null || it.qtd === '' ? 1 : int(it.qtd));
const restamMun = it => { const dm = durMun(it); if (dm !== '1' && dm !== '2') return null; return it.restam === undefined || it.restam === null || it.restam === '' ? int(dm) : int(it.restam); };
function municaoDa(d, arma) {
  const nome = String((arma.a || {}).mun || '').trim().toLowerCase(); if (!nome) return null;
  const ms = lista(d.itens).filter(x => x.t === 'municao');
  return ms.find(x => String(x.n || '').trim().toLowerCase() === nome) || ms.find(x => String(x.n || '').toLowerCase().includes(nome)) || { falta: true, n: arma.a.mun };
}
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
function textoMun(it) {
  const dm = durMun(it), q = qtdDe(it);
  if (dm === 'tiro') return plural(q, 'disparo', 'disparos');
  if (dm === 'missao') return `${plural(q, 'pacote', 'pacotes')} · dura a missão${it.usou ? ' (em uso)' : ''}`;
  const r = restamMun(it);
  const aberto = it.usou || r < int(dm);
  return `${plural(q, 'pacote', 'pacotes')} · ${aberto ? `aberto: ${plural(r, 'cena restante', 'cenas restantes')}${it.usou ? ', em uso nesta cena' : ''}` : `cada um dura ${plural(int(dm), 'cena', 'cenas')}`}`;
}
function gastarMun(m) {
  const dm = durMun(m), b = `itens.${m.id}`;
  if (dm === 'tiro') { const q = Math.max(0, qtdDe(m) - 1); gravar(b + '.qtd', q, true); if (!q) A.aviso(`Último ${String(m.n || 'disparo').toLowerCase()} usado.`); }
  else if (!m.usou) gravar(b + '.usou', true, true);
}
// "Nova cena" do Mestre: a ficha ativa desconta os pacotes usados na cena que acabou
function verCena() {
  if (ehMestre() || !F.ativaD || !F.ativaRef) return;
  const d = F.ativaD;
  const c = A.estado.cena || { id: 'inicio' };   // sem cena registrada ainda: a próxima "Nova cena" já desconta
  if (d.cenaVista === c.id || F.cenaAplicando === c.id) return;
  if (!c.id) return;
  F.cenaAplicando = c.id;
  const l = [['cenaVista', c.id]], msgs = [];
  if (d.cenaVista) lista(d.itens).filter(x => x.t === 'municao' && x.usou).forEach(m => {
    const dm = durMun(m), b = `itens.${m.id}`;
    if (dm !== '1' && dm !== '2') return;
    const r = restamMun(m) - 1;
    if (r <= 0) { const q = Math.max(0, qtdDe(m) - 1); l.push([b + '.qtd', q], [b + '.restam', null], [b + '.usou', null]); msgs.push(`${m.n}: pacote acabou, ${q === 1 ? 'resta 1' : `restam ${q}`}`); }
    else l.push([b + '.restam', r], [b + '.usou', null]);
  });
  aplicarNaAtiva(l).then(ok => { if (ok && msgs.length) A.aviso('🔫 ' + msgs.join(' · ')); });
}
// fim de missão: pacotes que duram a missão inteira e foram usados
function consumoMissao(d) {
  const l = [];
  lista(d.itens).filter(x => x.t === 'municao' && x.usou && durMun(x) === 'missao').forEach(m => { l.push([`itens.${m.id}.qtd`, Math.max(0, qtdDe(m) - 1)], [`itens.${m.id}.usou`, null]); });
  return l;
}

/* ---------------- EVENTOS ---------------- */
function aoEditar(e) {
  const t = e.target;
  if (t.dataset.filtro) { if (e.type === 'input') { F.filtros[t.dataset.filtro] = t.value; const pos = t.selectionStart; desenharAba(); const nt = $(`[data-filtro="${t.dataset.filtro}"]`); if (nt) { nt.focus(); nt.setSelectionRange(pos, pos); } } return; }
  if (t.dataset.acaoArq === 'foto' && e.type === 'change') { trocarFoto(t.files[0]); return; }
  if (t.dataset.acaoArq === 'importar' && e.type === 'change') { importarFicha(t.files[0]); t.value = ''; return; }
  const path = t.dataset.c;
  if (!path || !F.atual || !F.atual.editavel) return;
  if (t.tagName === 'SELECT' && e.type === 'input') return;   // select grava no change
  let v = t.type === 'checkbox' ? t.checked : t.value;
  if (t.dataset.n) v = t.value === '' ? '' : num(t.value);
  if (path.endsWith('.a') && v === '' && !path.startsWith('per.')) v = null;
  if (/^per\.[^.]+\.a$/.test(path)) { t.classList.toggle('mudado', PER[path.split('.')[1]][2] !== v); }
  gravar(path, v, t.tagName === 'SELECT' || t.type === 'checkbox');
  // mudanças que mudam a estrutura da tela
  if (['classe', 'regra', 'itens'].includes(path.split('.')[0]) && (t.tagName === 'SELECT' || t.type === 'checkbox')) {
    if (path === 'classe') { const cl = CLASSES[v]; if (cl && (!F.atual.d.prof || Object.values(CLASSES).some(c => c.prof === F.atual.d.prof))) gravar('prof', cl.prof, true); desenharFicha(); return; }
    if (path === 'regra') { desenharFicha(); return; }
    if (/\.t$|\.vest$|\.cat$|\.cenas$/.test(path)) { desenharAba(); return; }
  }
  if (path === 'nex' || path === 'estagio') { atualizarDerivados(); }
  if (F.atual.d.tipo === 'ameaca' && path === 'el') { desenharFicha(); return; }
  // nome do item/habilidade: atualiza o título sem redesenhar
  const m = /^(itens|hab|rit)\.([^.]+)\.n$/.exec(path);
  if (m) { const s = $(`details[data-id="${m[2]}"] > summary > b`); if (s) s.textContent = v || 'Sem nome'; }
  atualizarDerivados();
}
async function trocarFoto(f) {
  if (!f || !F.atual || !F.atual.editavel) return;
  try {
    const url = await A.imagemReduzida(f, 260);
    gravar('foto', url, true);
    desenharFicha();
  } catch (e) { A.aviso('Não consegui ler essa imagem.'); }
}
function aoClicar(e) {
  const b = e.target.closest('[data-acao]');
  if (!b) {
    const sm = e.target.closest('details[data-id] > summary');
    if (sm) { const dt = sm.parentElement; setTimeout(() => { dt.open ? F.abertos.add(dt.dataset.id) : F.abertos.delete(dt.dataset.id); }, 0); }
    return;
  }
  const ac = b.dataset.acao, v = b.dataset.v;
  const at = F.atual, ed = at && at.editavel;
  if (ac === 'voltar') { irLista(); return; }
  if (ac === 'aba-lista') { F.abaLista = v; irLista(); return; }
  if (ac === 'nova-ficha') { criarFicha(); return; }
  if (ac === 'nova-ameaca' && (ehMestre() || ehAux())) { criarAmeaca(); return; }
  if (ac === 'novo-filho' && (ehMestre() || ehAux())) { criarAmeaca(true); return; }
  if (ac === 'abrir-codigo') { abrirPorCodigo(); return; }
  if (ac === 'abrir-ficha') { abrirFicha(refDoCodigo(b.dataset.k, b.dataset.gm)); return; }
  if (ac === 'apagar-ficha') { apagarFicha(refDoCodigo(b.dataset.k, b.dataset.gm)); return; }
  if (ac === 'fechar-modal') { F.cat = null; $('#fxModal').hidden = true; return; }
  if (ac === 'fechar-rolagem') { $('#fxRolagem').hidden = true; return; }
  if (ac === 'usar-d6' && F.ultimaRol && F.atual && F.atual.editavel) {
    const k = v, d = F.atual.d, u = F.ultimaRol;
    const resto = int((d.bonusInt || {})[k]);
    if (resto < 1 || u.usou) return;
    u.d6 = 1 + Math.floor(Math.random() * 6); u.usou = true;
    gravar(`bonusInt.${k}`, resto - 1, true);
    mostrarRolagem(`${d.nome} · ${u.nome}`, htmlRolagem(u, d));
    if (minhaFicha()) A.rolagemDaFicha(`${u.nome}: +1d6 de ${k === 'ex' ? 'exercício' : 'leitura'} (${u.d6}) → ${u.t.total + u.d6}`);
    return;
  }
  if (!at || !at.d) return;
  if (ac === 'aba') { F.aba = v; desenharAba(); return; }
  if (ac === 'aba-mob') {
    F.abaMob = v; $('.fx-ficha').dataset.mob = v;
    $$('.fx-abas-mob button').forEach(x => x.classList.toggle('on', x.dataset.v === v));
    if (!['status', 'pericias'].includes(v)) { F.aba = v; desenharAba(); }
    return;
  }
  if (ac === 'rolar-per') { rolarPericia(v); return; }
  if (ac === 'atacar') {
    const it = b.dataset.id ? lista(at.d.itens).find(x => x.id === b.dataset.id) : null;
    if (it && ed && (it.a || {}).mun) {
      const m = municaoDa(at.d, it);
      if (!m || m.falta || qtdDe(m) <= 0) { if (!confirm(`Sem ${it.a.mun} no inventário. Atacar mesmo assim?`)) return; }
      else { gastarMun(m); setTimeout(() => { if (F.aba === 'combate') desenharAba(); }, 0); }
    }
    rolarPericia(b.dataset.per, it ? int((it.a || {}).bAtk) : 0, `Ataque${it ? ' · ' + it.n : ' desarmado'}`, b.dataset.per === 'luta' ? 'cac' : 'ataque');
    return;
  }
  if (ac === 'dano') { rolarDano(b.dataset.expr, int(b.dataset.mult) || 1, b.dataset.n); return; }
  if (ac === 'exportar') { exportarFicha(); return; }
  if (ac === 'ativa' && at && !at.ref.gm && at.ref.dono === quem()) {
    try { localStorage.setItem(KEY_ATIVA(quem()), at.ref.chave); } catch (e) {}
    F.ativaId = undefined; ligarAtiva();
    A.aviso('Esta é a sua ficha ativa: PV, PE e SAN aparecem no mapa.');
    desenharFicha();
    return;
  }
  if (ac === 'copiar-codigo') { navigator.clipboard && navigator.clipboard.writeText(codigoDe(at.ref)).then(() => A.aviso('Código copiado.')).catch(() => {}); return; }
  if (!ed) return;
  if (ac === 'barra') {
    const k = b.dataset.k, r = calc(at.d);
    const mx = r[{ pv: 'pvMax', pe: 'peMax', san: 'sanMax', pd: 'pdMax' }[k]];
    const cur = at.d[k] && at.d[k].a !== undefined && at.d[k].a !== null && at.d[k].a !== '' ? int(at.d[k].a) : mx;
    gravar(k + '.a', cur + int(v));
    if (k === 'pe' && int(v) < 0) registrarGasto(at.d, Math.min(cur, -int(v)));
    atualizarDerivados();
    return;
  }
  if (ac === 'zerar-gasto') { gravar('peGasto', null, true); atualizarGasto(); return; }
  if (ac === 'mun-novo') {
    const m = (at.d.itens || {})[b.dataset.id]; if (!m) return;
    gravar(`itens.${b.dataset.id}.restam`, null, true); gravar(`itens.${b.dataset.id}.usou`, null, true); desenharAba();
    return;
  }
  if (ac === 'treino') {
    const id = b.dataset.id, alvo = int(v), atual = int((at.d.per[id] || {}).t);
    gravar(`per.${id}.t`, atual === alvo ? alvo - 5 : alvo, true);
    atualizarDerivados();
    return;
  }
  if (ac === 'presenca') { abrirPresenca(); return; }
  if (ac === 'presenca-enviar') {
    const d = at.d, pres = d.pres || {};
    const alvos = {}; $$('[data-alvo]').forEach(x => { if (x.checked) alvos[x.dataset.alvo] = true; });
    if (!Object.keys(alvos).length) { A.aviso('Escolha ao menos uma cobaia.'); return; }
    const id = A.Rede.chave();
    A.definir(['chamado'], { id, t: 'presenca', nome: d.nome || 'Criatura', el: d.el || '', dt: int(pres.dt), dano: String(pres.dano || '1d6'), nex: int(pres.nex), vd: int(d.vd), extras: int(($('#fxPresExtra') || {}).value), alvos, ts: Date.now() });
    A.aviso('Pedido de Vontade enviado.');
    acompanharPresenca(id);
    return;
  }
  if (ac === 'amea-atk') {
    const a = (at.d.ataques || {})[b.dataset.id]; if (!a) return;
    const t = rolarTeste(int(a.dados) || 1, int(a.bonus));
    mostrarRolagem(`${at.d.nome} · ${a.n || 'Ataque'}`, `${htmlDados(t)}<p>${t.desv ? 'Menor' : 'Maior'} dado <b>${t.esc}</b> ${t.bonus >= 0 ? '+' : '−'} ${Math.abs(t.bonus)} = <span class="fx-total">${t.total}</span></p>`);
    return;
  }
  if (ac === 'novo-ataque') { const id = A.Rede.chave(); gravar('ataques.' + id, { n: 'Garras', dados: 2, bonus: 10, dano: '2d6+5', crit: 'x2', o: Date.now() }, true); desenharFicha(); return; }
  if (ac === 'catalogo') { abrirCatalogo(v); return; }
  if (ac === 'mod-sub') { F.cat.sub = v; F.cat.busca = ''; desenharCatalogo(); return; }
  if (ac === 'cat-seg') { F.cat.seg = v; desenharCatalogo(); return; }
  if (ac === 'cat-tab') { F.cat.tab = v; F.cat.chip = undefined; F.cat.busca = ''; F.ultimoCat = { ...(F.ultimoCat || {}), [F.cat.tipo]: { tab: v } }; desenharCatalogo(); $('#fxModal .fx-modal-lista').scrollTop = 0; return; }
  if (ac === 'cat-chip') { F.cat.chip = v; F.ultimoCat = { ...(F.ultimoCat || {}), [F.cat.tipo]: { tab: F.cat.tab, chip: v } }; desenharCatalogo(); $('#fxModal .fx-modal-lista').scrollTop = 0; return; }
  if (ac === 'cat-add') { adicionarDoCatalogo(int(b.dataset.i), !!b.dataset.m); return; }
  if (ac === 'add-mod') { abrirCatalogo('mods', b.dataset.id); return; }
  if (ac === 'rem-mod') { gravar(`itens.${b.dataset.id}.mods.${b.dataset.m}`, null, true); F.abertos.add(b.dataset.id); desenharAba(); return; }
  if ((ac === 'novo' || ac === 'novo-item') && F.cat) { F.cat = null; $('#fxModal').hidden = true; if (ac === 'novo-item') { F.aba = 'inventario'; } }
  if (ac === 'novo') {
    const id = A.Rede.chave();
    const vbase = v === 'rit' ? { n: 'Novo ritual', el: 'Conhecimento', c: 1, d: '', o: Date.now() } : { n: 'Nova habilidade', d: '', o: Date.now() };
    gravar(`${v}.${id}`, vbase, true); F.abertos.add(id); desenharAba();
    return;
  }
  if (ac === 'novo-item') {
    const id = A.Rede.chave();
    const it = { n: 'Novo item', t: v, cat: v === 'amaldicoado' ? 2 : v === 'protecao' ? 1 : 0, esp: v === 'protecao' ? 2 : 1, qtd: 1, d: '', o: Date.now() };
    if (v === 'arma') it.a = { prof: 'Armas Simples', tipo: 'Corpo a Corpo', emp: 'Uma Mão', dano: '1d6', margem: 20, mult: 2, td: 'Impacto', alc: '' };
    if (v === 'protecao') { it.def = 5; it.vest = true; }
    if (v === 'amaldicoado') it.el = 'Sangue';
    gravar(`itens.${id}`, it, true); F.abertos.add(id); desenharAba();
    return;
  }
  if (ac === 'remover') {
    const x = lista(at.d[v]).find(i => i.id === b.dataset.id);
    if (!confirm(`Remover "${x ? x.n : ''}"?`)) return;
    gravar(`${v}.${b.dataset.id}`, null, true); if (at.d.tipo === 'ameaca') desenharFicha(); else desenharAba();
    return;
  }
  if (ac === 'conjurar') {
    const d = at.d, h = (d.rit || {})[b.dataset.id]; if (!h) return;
    const forma = formasDoRitual(h).find(f => f.k === (b.dataset.forma || 'n')) || { k: 'n', n: 'Conjurar', extra: 0 };
    const alq = condicoesDe(d).has('alquebrado') ? 1 : 0;
    const custo = (CUSTO_RITUAL[int(h.c)] || 1) + forma.extra + alq;
    const det = d.regra === 'determinacao', k = det ? 'pd' : 'pe', K = k.toUpperCase();
    const r = calc(d);
    const cur = atualDe(d, k, r[k + 'Max']);
    if (cur < custo && !confirm(`Você tem ${cur} ${K} e o ritual custa ${custo}. Conjurar mesmo assim?`)) return;
    const jaGasto = gastoTurno(d), limT = calc(d).peTurno;
    if (jaGasto + custo > limT && !confirm(`Limite de ${K} por turno: você já gastou ${jaGasto} de ${limT} neste turno e o ritual custa ${custo}. Conjurar mesmo assim?`)) return;
    // O Custo do Paranormal (OPRPG p. 121): Ocultismo DT 20 + custo; Medo sempre cobra Sanidade
    const medo = /medo/i.test(h.el || '');
    let perda = 0, perm = 0, teste = null;
    const dt = 20 + custo;
    if (medo) { perda = custo; perm = forma.k === 'v' ? 3 : forma.k === 'd' ? 2 : 1; }
    else { teste = testarPericia(d, 'ocultismo'); if (teste.total < dt) { perda = custo; if (dt - teste.total >= 5) perm = 1; } }
    let resumo = '';
    if (det) {
      const novo = Math.max(0, cur - custo - perda - perm);
      gravar('pd.a', novo, true);
      resumo = perda || perm ? `perdeu mais ${perda + perm} PD (Custo do Paranormal)` : 'sem perda extra';
    } else {
      gravar('pe.a', Math.max(0, cur - custo), true);
      if (perda || perm) {
        const sanAt = atualDe(d, 'san', r.sanMax);
        if (perm) gravar('san.aj', int((d.san || {}).aj) - perm, true);
        const novoMax = calc(d).sanMax;
        gravar('san.a', Math.max(0, Math.min(novoMax, sanAt - perda)), true);
        resumo = `perdeu ${perda} SAN${perm ? ` e ${perm} de Sanidade máxima (permanente)` : ''}`;
      } else resumo = 'mente intacta';
    }
    registrarGasto(d, custo);
    atualizarDerivados();
    const nomeF = forma.k === 'n' ? '' : ` (${forma.n.toLowerCase()})`;
    const desc = `conjurou ${h.n}${nomeF} · ${h.el || ''} ${int(h.c) || 1}º círculo · −${custo} ${K}${alq ? ' (alquebrado +1)' : ''} · ${teste ? `Ocultismo ${teste.total} vs DT ${dt}: ${teste.total >= dt ? 'passou' : 'falhou'}, ` : 'Medo: '}${resumo}`;
    mostrarRolagem(`${d.nome} · ${h.n}${nomeF}`, `${teste ? htmlDados(teste) + `<p>Ocultismo <span class="fx-total">${teste.total}</span> contra DT ${dt}: <b>${teste.total >= dt ? 'passou' : 'falhou'}</b></p>${teste.pen.length ? `<p class="fx-legenda">Condições: ${esc(textoPen(teste))}</p>` : ''}` : '<p>Rituais de Medo sempre cobram Sanidade.</p>'}
      <p>−${custo} ${K}${alq ? ' (alquebrado: +1)' : ''} · ${esc(resumo)}.</p>`);
    try { A.Rede.set('efeito', { t: 'sigilo', el: h.el || 'Varia', n: h.n || 'Ritual', q: d.nome || '', quem: minhaFicha() ? (d.dono || A.meu || '') : '', c: int(h.c) || 1, ts: Date.now() }); } catch (e) {}
    if (minhaFicha()) A.rolagemDaFicha(desc);
    return;
  }
  if (ac === 'aplicar-origem') {
    const o = ORIGENS.find(x => x[0].toLowerCase() === String(at.d.origem || '').toLowerCase());
    if (!o) { A.aviso('Escolha uma origem da lista primeiro.'); return; }
    const pers = o[1].split(',').filter(Boolean);
    pers.forEach(p => { if (!int((at.d.per[p] || {}).t)) gravar(`per.${p}.t`, 5, true); });
    const pod = C.habilidades.find(h => h.n.toLowerCase() === o[2].toLowerCase());
    const ja = lista(at.d.hab).some(h => h.n.toLowerCase() === o[2].toLowerCase());
    if (!ja) gravar(`hab.${A.Rede.chave()}`, { n: o[2], d: pod ? pod.d : '', g: 'Origem: ' + o[0], o: Date.now() }, true);
    A.aviso(`Origem ${o[0]}: ${pers.map(p => PER[p][1]).join(' e ') || 'perícias à escolha do Mestre'} treinadas${ja ? '' : ` e poder "${o[2]}" adicionado`}.`);
    desenharFicha();
  }
}

/* ---------------- FICHA ATIVA → MAPA ---------------- */
function ligarAtiva() {
  if (!A.pronto) { clearTimeout(F.tAtiva); F.tAtiva = setTimeout(ligarAtiva, 500); return; }
  const k = chaveAtiva(), q = quem();
  const id = k ? q + ':' + k : null;
  if (F.ativaId === id) return;
  if (F.ativaOff) F.ativaOff();
  F.ativaOff = null; F.ativaId = id; F.ativaD = null; F.ativaRef = null;
  if (!k) { document.dispatchEvent(new Event('acf-ativa')); return; }
  const ref = { dono: q, chave: k };
  F.ativaRef = ref;
  const ouvir = () => { if (F.ativaId !== id) return; F.ativaOff = A.Rede.on(caminho(ref), d => {
    if (F.ativaId !== id) return;
    F.ativaD = d ? normalizar(d) : null;
    publicarVitais();
    document.dispatchEvent(new Event('acf-ativa'));
  }, () => {}); };
  (A.garantirLogin ? A.garantirLogin() : Promise.resolve()).then(ouvir, ouvir);
}
function vitaisDe(d) {
  const r = calc(d);
  const cur = (k, mx) => (d[k] && d[k].a !== undefined && d[k].a !== null && d[k].a !== '' ? int(d[k].a) : mx);
  const det = d.regra === 'determinacao';
  const v = { nome: d.nome || '', pv: cur('pv', r.pvMax), pvM: r.pvMax, nex: CLASSES[d.classe] && CLASSES[d.classe].estagio ? 'E' + (int(d.estagio) || 1) : (d.classe === 'mundano' ? 0 : int(d.nex) || 5) };
  if (det) { v.det = 1; v.pd = cur('pd', r.pdMax); v.pdM = r.pdMax; if (d.enl) v.enl = 1; }
  else { v.pe = cur('pe', r.peMax); v.peM = r.peMax; v.san = cur('san', r.sanMax); v.sanM = r.sanMax; }
  return v;
}
function publicarVitais() {
  if (!A.publicarVitais || ehMestre() || !F.ativaD) return;
  A.publicarVitais(vitaisDe(F.ativaD));
}
// aplica mudanças na ficha ativa (interlúdio, Presença Perturbadora, recompensas). lista: [[caminho, valor]]
async function aplicarNaAtiva(lista) {
  if (!F.ativaRef || !F.ativaD) return false;
  const ref = F.ativaRef;
  try {
    await Promise.all(lista.map(([c, v]) => A.Rede.set(caminho(ref) + '/' + c.replace(/\./g, '/'), v === undefined ? null : v)));
  } catch (e) { A.aviso('O servidor recusou a alteração na ficha.'); return false; }
  if (F.atual && F.atual.d && !F.atual.ref.gm && F.atual.ref.chave === ref.chave) {
    lista.forEach(([c, v]) => setPath(F.atual.d, c, v === undefined ? null : v));
    if (F.tela === 'ficha') { atualizarDerivados(); if (F.aba) desenharAba(); }
  }
  return true;
}
const atualDe = (d, k, mx) => (d[k] && d[k].a !== undefined && d[k].a !== null && d[k].a !== '' ? int(d[k].a) : mx);

/* ---------------- BOTÃO NO TOPO ---------------- */
function atualizarBotao() {
  const b = $('#btnFichas'); if (!b) return;
  b.hidden = !(A.mestre || A.meu || A.aux);
  if (F.aberto && F.tela === 'lista') irLista();
}
document.addEventListener('acf-perfil', () => setTimeout(() => { atualizarBotao(); ligarAtiva(); }, 0));
document.addEventListener('acf-ativa', verCena);
A.aoMudar(() => { verCena(); if (F.aberto && F.tela === 'ficha') atualizarGasto(); });
setTimeout(ligarAtiva, 600);
const btn = $('#btnFichas');
if (btn) btn.addEventListener('click', () => (F.aberto ? fechar() : abrir()));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && F.aberto) { if (!$('#fxModal').hidden) { F.cat = null; $('#fxModal').hidden = true; } else fechar(); } });
setTimeout(atualizarBotao, 300);
window.ACF_FICHAS = {
  abrir, fechar, calc, rolarExpr, rolarTeste, testarPericia, condicoesDe, vitaisDe, aplicarNaAtiva, atualDe, CLASSES, PER, NEXES, PATENTES,
  ativa: () => (F.ativaD ? { ref: F.ativaRef, d: F.ativaD, r: calc(F.ativaD) } : null),
  // categoria do item pelo nome no catálogo; devolve o estouro do limite da patente, se houver
  checarLimite: nome => {
    if (!F.ativaD) return null;
    const n = String(nome || '').trim().toLowerCase();
    const x = C.itens.find(i => i.n.toLowerCase() === n);
    if (!x || !int(x.cat) || int(x.cat) > 4) return null;
    const r = calc(F.ativaD), i = int(x.cat) - 1;
    const tem = r.contagem[i], max = r.patente.lim[i];
    return tem + 1 > max ? { cat: ROM[int(x.cat)], tem, max, pat: r.patente.n } : null;
  },
  consumoMissao,
  abrirAtiva: () => { if (F.ativaRef) { abrir(); abrirFicha(F.ativaRef); } else abrir(); },
  religar: () => { F.ativaId = undefined; ligarAtiva(); },
};
})();
