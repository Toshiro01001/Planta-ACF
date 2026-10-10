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
  r.defesa = 10 + at('agi') + r.defEquip + int(d.defOutros) - (r.sobrecarga ? 5 : 0);
  r.bonus = id => {
    const p = (d.per || {})[id] || {};
    let b = int(p.t) + int(p.o);
    if (PER[id] && PER[id][4] && r.sobrecarga) b -= 5;
    return b;
  };
  r.esquiva = r.defesa + r.bonus('reflexos');
  r.bloqueio = Math.max(0, r.bonus('fortitude'));
  r.desl = Math.max(0, num(d.desl === undefined ? 9 : d.desl) - (r.sobrecarga ? 3 : 0));
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

/* ---------------- DADOS ---------------- */
const d20 = () => 1 + Math.floor(Math.random() * 20);
function rolarTeste(qtdAtr, bonus) {
  const desv = qtdAtr <= 0;
  const q = desv ? 2 : Math.min(qtdAtr, 10);
  const dados = Array.from({ length: q }, d20);
  const esc = desv ? Math.min(...dados) : Math.max(...dados);
  return { dados, esc, desv, total: esc + bonus, bonus };
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
function indice() { try { return JSON.parse(localStorage.getItem(KEY_IDX) || '[]') || []; } catch (e) { return []; } }
function salvarIndice(l) { try { localStorage.setItem(KEY_IDX, JSON.stringify(l)); } catch (e) {} }
const caminho = ref => ref.gm ? `agentesMestre/${ref.chave}` : `agentes/${ref.dono}/${ref.chave}`;
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
function abrir() {
  montarTela();
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
  const abas = ehMestre() ? [['jogadores', 'Fichas dos jogadores'], ['minhas', 'Minhas fichas (Mestre)']] : [['minhas', 'Minhas fichas']];
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
  if (ehMestre() && F.abaLista === 'jogadores') {
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
  const podeCriar = !gmJog;
  let cab = '';
  if (gmJog) cab = `<p class="fx-dica">Você vê as fichas de todos os jogadores, ao vivo, mas só para leitura. O código de cada ficha aparece no cartão: passe ao jogador se ele precisar abrir a ficha em outro aparelho.</p>`;
  else if (ehMestre()) cab = `<p class="fx-dica">Fichas suas (NPCs, inimigos, aliados). Só você vê e edita.</p>`;
  else cab = `<p class="fx-dica">Suas fichas ficam ligadas a este aparelho. Em outro aparelho, use "Abrir por código" com o código que aparece dentro da ficha. O Mestre vê suas fichas, mas não pode alterá-las.</p>`;
  const grupos = {};
  todos.forEach(x => { const g = gmJog ? x.ref.dono : '_'; (grupos[g] = grupos[g] || []).push(x); });
  const cartao = x => {
    const d = x.d, s = A.SER[d.dono] || {};
    const foto = d.foto || s.img || '';
    const cl = CLASSES[d.classe] || {};
    const sub = [cl.n, d.trilha].filter(Boolean).join(' · ');
    const nivel = cl.estagio ? `Estágio ${d.estagio || 1}` : d.classe === 'mundano' ? 'NEX 0%' : `NEX ${d.nex || 5}%`;
    return `<article class="fx-cartao" style="--cor:${s.cor || '#8b5cf6'}">
      <div class="fx-cartao-foto"${foto ? ` style="background-image:url('${esc(foto)}')"` : ''}></div>
      <div class="fx-cartao-info"><h3>${esc(d.nome || 'Sem nome')}</h3><p>${esc(sub)}</p><small>${esc(nivel)} · Registrado em ${new Date(d.criado || Date.now()).toLocaleDateString('pt-BR')}</small>
      ${gmJog ? `<small class="fx-cod">Código: ${esc(codigoDe(x.ref))}</small>` : ''}
      <div class="fx-cartao-acoes"><button class="fx-btn-roxo" data-acao="abrir-ficha" data-k="${esc(codigoDe(x.ref))}" data-gm="${x.ref.gm ? 1 : ''}">Acessar ficha</button>
      ${podeCriar ? `<button data-acao="apagar-ficha" data-k="${esc(codigoDe(x.ref))}" data-gm="${x.ref.gm ? 1 : ''}" class="fx-btn-perigo" title="Apagar ficha">🗑</button>` : ''}</div></div></article>`;
  };
  let html = cab;
  if (podeCriar) html += `<div class="fx-lista-acoes"><button class="fx-btn-roxo" data-acao="nova-ficha">+ Nova ficha</button>${!ehMestre() ? '<button data-acao="abrir-codigo">Abrir por código</button>' : ''}<label class="fx-btn-arq" title="Cria uma ficha nova a partir de um arquivo exportado">⬆ Importar arquivo<input type="file" accept=".json,application/json" data-acao-arq="importar" hidden></label></div>`;
  if (!todos.length) html += `<p class="fx-vazio">${gmJog ? 'Nenhum jogador criou ficha ainda.' : 'Nenhuma ficha ainda. Crie a primeira!'}</p>`;
  Object.entries(grupos).forEach(([g, xs]) => {
    if (gmJog) { const s = A.SER[g] || {}; html += `<h2 class="fx-grupo"><span class="fx-pinta" style="--cor:${s.cor || '#8b5cf6'}"></span>${esc(s.nome || g)}${s.jogador ? ` <small>${esc(s.jogador)}</small>` : ''}</h2>`; }
    html += `<div class="fx-grade">${xs.map(cartao).join('')}</div>`;
  });
  corpo.innerHTML = html;
}
function refDoCodigo(k, gm) {
  const i = k.indexOf(':');
  const dono = k.slice(0, i), chave = k.slice(i + 1);
  return gm ? { gm: true, dono: 'mestre', chave } : { dono, chave };
}
async function criarFicha() {
  const gm = ehMestre();
  const dono = gm ? 'mestre' : quem();
  if (!dono) { A.aviso('Escolha sua cobaia antes de criar uma ficha.'); return; }
  const ref = { gm, dono, chave: novaChave() };
  const d = novaFicha(gm ? null : dono);
  if (gm) { d.nome = 'Novo NPC'; d.dono = 'mestre'; }
  try { await A.Rede.set(caminho(ref), d); } catch (e) { A.aviso('O servidor recusou a criação da ficha. Confira as regras do Firebase.'); return; }
  if (!gm) { const idx = indice(); idx.push({ dono: ref.dono, chave: ref.chave }); salvarIndice(idx); }
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
  if (!idx.some(r => r.chave === ref.chave)) { idx.push(ref); salvarIndice(idx); }
  abrirFicha(ref);
}
async function apagarFicha(ref) {
  const r = F.resumo[codigoDe(ref)];
  if (!confirm(`Apagar a ficha "${r ? r.d.nome : ''}" de vez? Isso não pode ser desfeito.`)) return;
  if (!confirm('Tem certeza? A ficha some para todos, inclusive para o Mestre.')) return;
  try { await A.Rede.set(caminho(ref), null); } catch (e) { A.aviso('Não consegui apagar.'); return; }
  if (!ref.gm) salvarIndice(indice().filter(x => x.chave !== ref.chave));
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
  if (!gm) { const idx = indice(); idx.push({ dono: ref.dono, chave: ref.chave }); salvarIndice(idx); }
  A.aviso(`Ficha "${d.nome || 'Sem nome'}" importada.`);
  abrirFicha(ref);
}

/* ---------------- FICHA ---------------- */
function abrirFicha(ref) {
  pararLista(); pararFicha();
  const editavel = ref.gm ? ehMestre() : (!ehMestre() && ref.dono === quem());
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
function normalizar(d) {
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
  const s = A.SER[d.dono] || {};
  const cl = CLASSES[d.classe] || CLASSES.combatente;
  const foto = d.foto || s.img || '';
  const corpo = $('#fxCorpo');
  const rolagemTopo = corpo.scrollTop;
  corpo.innerHTML = `<div class="fx-ficha${at.editavel ? '' : ' so-leitura'}" data-mob="${F.abaMob}" style="--cor:${s.cor || '#8b5cf6'}">
    ${at.editavel ? '' : `<div class="fx-aviso-leitura">👁 Modo leitura · ${ehMestre() ? 'o Mestre vê esta ficha ao vivo, mas não pode alterá-la' : 'esta ficha é de outra cobaia, só o dono pode editar'}</div>`}
    <nav class="fx-abas-mob">${[['status', 'Status'], ['pericias', 'Perícias'], ['combate', 'Combate'], ['habilidades', 'Habilidades'], ['rituais', 'Rituais'], ['inventario', 'Inventário'], ['descricao', 'Descrição']].map(([k, n]) => `<button data-acao="aba-mob" data-v="${k}" class="${F.abaMob === k ? 'on' : ''}">${n}</button>`).join('')}</nav>
    <section class="fx-col fx-col-esq">
      <div class="fx-id">
        <label class="fx-foto"${foto ? ` style="background-image:url('${esc(foto)}')"` : ''}>${at.editavel ? '<input type="file" accept="image/*" data-acao-arq="foto" hidden><span>trocar</span>' : ''}</label>
        <div class="fx-id-campos">
          <label>Personagem ${campo('nome')}</label>
          <label>Origem <input data-c="origem" list="fxOrigens" value="${esc(d.origem)}"${RO()}></label>
          ${at.editavel ? `<button class="fx-mini" data-acao="aplicar-origem" title="Marca as perícias da origem como treinadas e adiciona o poder dela">aplicar origem</button>` : ''}
        </div>
      </div>
      <div class="fx-id2">
        <label>Jogador ${campo('jogador')}</label>
        <label>Classe <select data-c="classe"${RO()}>${Object.entries(CLASSES).map(([k, c]) => `<option value="${k}" ${d.classe === k ? 'selected' : ''}>${c.n}</option>`).join('')}</select></label>
        <label>Trilha <input data-c="trilha" list="fxTrilhas" value="${esc(d.trilha)}"${RO()}></label>
        <label>Regra <select data-c="regra"${RO()}><option value="padrao" ${d.regra !== 'determinacao' ? 'selected' : ''}>PV, PE e Sanidade</option><option value="determinacao" ${d.regra === 'determinacao' ? 'selected' : ''}>Determinação (SaH)</option></select></label>
      </div>
      <datalist id="fxOrigens">${ORIGENS.map(o => `<option value="${esc(o[0])}">`).join('')}</datalist>
      <datalist id="fxTrilhas">${(cl.trilhas || []).map(t => `<option value="${esc(t)}">`).join('')}</datalist>
      <div class="fx-atributos">
        <span class="fx-atr-centro">ATRIBUTOS</span>
        ${ATRS.map(([k, n, sg]) => `<label class="fx-atr fx-atr-${k}"><input data-c="atr.${k}" type="number" data-n="1" min="0" max="9" value="${int(d.atr[k])}"${RO()}><b>${sg}</b><small>${n}</small></label>`).join('')}
      </div>
      <div class="fx-linha3">
        <label>${cl.estagio ? 'Estágio' : 'NEX'} ${cl.estagio
          ? `<select data-c="estagio"${RO()}>${[1, 2, 3, 4, 5].map(e => `<option ${int(d.estagio) === e ? 'selected' : ''}>${e}</option>`).join('')}</select>`
          : d.classe === 'mundano' ? '<input value="0%" disabled>'
          : `<select data-c="nex"${RO()}>${NEXES.map(x => `<option value="${x}" ${int(d.nex) === x ? 'selected' : ''}>${x}%</option>`).join('')}</select>`}</label>
        <label>${d.regra === 'determinacao' ? 'PD' : 'PE'} / turno <output data-calc="peTurno"></output></label>
        <label>Deslocamento <span class="fx-desl">${campo('desl', 'n', ' min="0" step="1.5"')}<output data-calc="desl"></output></span></label>
      </div>
      <div class="fx-barras">${barras(d)}</div>
      <div class="fx-defesa">
        <div class="fx-escudo"><output data-calc="defesa"></output><span>DEFESA</span></div>
        <div class="fx-def-conta">= 10 + AGI + <span title="Proteções vestidas">equip. <output data-calc="defEquip"></output></span> + <label>outros ${campo('defOutros', 'n')}</label><output data-calc="defCarga" class="fx-alerta"></output></div>
        <div class="fx-def-reacoes"><span>Bloqueio <output data-calc="bloqueio"></output></span><span>Esquiva <output data-calc="esquiva"></output></span></div>
      </div>
      <label class="fx-larga">Proteção ${campo('protecao')}</label>
      <label class="fx-larga">Resistências ${campo('resist')}</label>
      <label class="fx-larga">Proficiências ${campo('prof')}</label>
      ${at.editavel && !at.ref.gm ? `<p class="fx-codigo">Código desta ficha: <code>${esc(codigoDe(at.ref))}</code> <button class="fx-mini" data-acao="copiar-codigo">copiar</button></p>` : ''}
      <p class="fx-codigo"><button class="fx-mini" data-acao="exportar" title="Baixa um arquivo com a ficha inteira (cópia de segurança ou para importar em outro lugar)">⬇ Exportar ficha</button></p>
    </section>
    <section class="fx-col fx-col-meio">
      <h3 class="fx-tit">PERÍCIAS</h3>
      <table class="fx-pericias"><thead><tr><th>Perícia</th><th>Dados</th><th>Bônus</th><th>Treino</th><th>Outros</th></tr></thead>
      <tbody>${PERICIAS.map(([id, n, a, so, carga]) => {
        const p = d.per[id] || {};
        return `<tr data-per="${id}" class="${int(p.t) ? 'treinada t' + int(p.t) : ''}">
          <td><button class="fx-rolar" data-acao="rolar-per" data-v="${id}" title="Rolar ${n}">${n}${so ? '*' : ''}${carga ? '+' : ''}</button></td>
          <td>${at.editavel ? `<select class="fx-per-atr${p.a && p.a !== a ? ' mudado' : ''}" data-c="per.${id}.a" title="Atributo usado nos dados (ex.: Racionalidade Inflexível usa Intelecto em Vontade)">${ATRS.map(([k, , sg]) => `<option value="${k}" ${(p.a || a) === k ? 'selected' : ''}>${sg}</option>`).join('')}</select>` : `<span class="${p.a && p.a !== a ? 'fx-mudado' : ''}">(${(p.a || a).toUpperCase()})</span>`}</td><td><output data-calc="per-${id}"></output></td>
          <td><select data-c="per.${id}.t" data-n="1"${RO()}>${TREINOS.map(([v, tn]) => `<option value="${v}" ${int(p.t) === v ? 'selected' : ''} title="${tn}">${v}</option>`).join('')}</select></td>
          <td>${campo(`per.${id}.o`, 'n')}</td></tr>`;
      }).join('')}</tbody></table>
      <p class="fx-legenda">+ penalidade de carga · * somente treinada · toque no nome para rolar</p>
    </section>
    <section class="fx-col fx-col-dir">
      <nav class="fx-abas">${[['combate', 'Combate'], ['habilidades', 'Habilidades'], ['rituais', 'Rituais'], ['inventario', 'Inventário'], ['descricao', 'Descrição']].map(([k, n]) => `<button data-acao="aba" data-v="${k}" class="${F.aba === k ? 'on' : ''}">${n}</button>`).join('')}</nav>
      <div class="fx-aba-corpo" id="fxAba"></div>
    </section></div>`;
  desenharAba();
  atualizarDerivados();
  corpo.scrollTop = rolagemTopo;
}

function barras(d) {
  const det = d.regra === 'determinacao';
  const defs = det ? [['pv', 'VIDA', 'pvMax', 'v'], ['pd', 'DETERMINAÇÃO', 'pdMax', 'd']] : [['pv', 'VIDA', 'pvMax', 'v'], ['san', 'SANIDADE', 'sanMax', 's'], ['pe', 'ESFORÇO', 'peMax', 'e']];
  return defs.map(([k, n, mx, cls]) => `<div class="fx-barra fx-barra-${cls}" data-barra="${k}" data-max="${mx}">
    <span class="fx-barra-tit">${n}</span>
    <div class="fx-barra-trilho"><div class="fx-barra-fill"></div>
      ${F.atual.editavel ? `<button data-acao="barra" data-k="${k}" data-v="-5" class="fx-b-l">«</button><button data-acao="barra" data-k="${k}" data-v="-1" class="fx-b-l2">‹</button>` : ''}
      <span class="fx-barra-txt"><input data-c="${k}.a" type="number" data-n="1" class="fx-barra-at"${RO()}> / <output data-calc="${mx}"></output></span>
      ${F.atual.editavel ? `<button data-acao="barra" data-k="${k}" data-v="1" class="fx-b-r2">›</button><button data-acao="barra" data-k="${k}" data-v="5" class="fx-b-r">»</button>` : ''}
    </div>
    <label class="fx-ajuste" title="Ajuste no máximo (poderes, origem, itens)">ajuste ${campo(k + '.aj', 'n')}</label></div>`).join('');
}

// recalcula só os números (não redesenha: preserva o foco do que está sendo digitado)
function atualizarDerivados() {
  const at = F.atual; if (!at || !at.d) return;
  const d = at.d, r = calc(d), raiz = $('#fxCorpo');
  const put = (k, v) => $$(`[data-calc="${k}"]`, raiz).forEach(e => { e.textContent = v; });
  put('peTurno', r.peTurno);
  put('desl', `m / ${Math.floor(r.desl / 1.5)} q${r.sobrecarga ? ' (−3m carga)' : ''}`);
  put('defesa', r.defesa); put('defEquip', r.defEquip); put('defCarga', r.sobrecarga ? ' −5 sobrecarga' : '');
  put('bloqueio', r.bloqueio); put('esquiva', r.esquiva);
  ['pvMax', 'peMax', 'sanMax', 'pdMax'].forEach(k => put(k, r[k]));
  PERICIAS.forEach(([id]) => {
    const b = r.bonus(id);
    put('per-' + id, `(${b >= 0 ? '' : ''}${b})`);
    const tr = $(`tr[data-per="${id}"]`, raiz);
    if (tr) { const t = int((d.per[id] || {}).t); tr.className = t ? 'treinada t' + t : ''; }
  });
  $$('.fx-barra', raiz).forEach(b => {
    const k = b.dataset.barra, mx = r[b.dataset.max];
    const a = d[k] && d[k].a !== undefined && d[k].a !== null && d[k].a !== '' ? int(d[k].a) : mx;
    const inp = $('.fx-barra-at', b);
    if (document.activeElement !== inp) inp.value = a;
    $('.fx-barra-fill', b).style.width = `${Math.max(0, Math.min(100, mx ? a / mx * 100 : 0))}%`;
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
    return `<div class="fx-ataque"><div><b>${esc(it.n)}</b><small>${esc([a.prof, a.tipo, a.emp].filter(Boolean).join(' · '))}${mods ? ' · ' + esc(mods) : ''}</small></div>
      <div class="fx-ataque-num"><span>Ataque <b>${PER[per][1]}</b> ${bAtk >= 0 ? '+' : ''}${bAtk}</span><span>Dano <b>${esc(dano)}</b>${a.td ? ' ' + esc(a.td) : ''}</span><span>Crítico <b>${marg < 20 ? marg + '/' : ''}x${mult}</b></span>${a.alc ? `<span>Alcance <b>${esc(a.alc)}</b></span>` : ''}</div>
      <div class="fx-ataque-btns"><button data-acao="atacar" data-id="${esc(it.id || '')}" data-per="${per}">🎲 Ataque</button>${alts.map((x, i) => `<button data-acao="dano" data-expr="${esc(x + extra)}" data-n="${esc(it.n)}${alts.length > 1 ? ' (' + esc(x) + ')' : ''}">🎲 Dano${alts.length > 1 ? ' ' + esc(x) : ''}</button>`).join('')}${alts.map((x, i) => `<button data-acao="dano" data-expr="${esc(x + extra)}" data-mult="${mult}" data-n="${esc(it.n)}${alts.length > 1 ? ' (' + esc(x) + ')' : ''}">💥 Crítico${alts.length > 1 ? ' ' + esc(x) : ''}</button>`).join('')}</div></div>`;
  };
  return `<div class="fx-combate">
    <div class="fx-rapidos">${['fortitude', 'reflexos', 'vontade', 'iniciativa', 'percepcao'].map(p => `<button data-acao="rolar-per" data-v="${p}">🎲 ${PER[p][1]} <b>${r.bonus(p) >= 0 ? '+' : ''}${r.bonus(p)}</b></button>`).join('')}</div>
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
        <div class="fx-det-acoes"><button class="fx-btn-roxo" data-acao="conjurar" data-id="${h.id}">Conjurar (−${custo} ${pe})</button><button class="fx-btn-perigo" data-acao="remover" data-v="rit" data-id="${h.id}">Remover</button></div>`
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
  const cab = `<summary><b>${esc(it.n || 'Item')}</b>${int(it.qtd) > 1 ? `<small>×${int(it.qtd)}</small>` : ''}<small>${TIPOS_ITEM[it.t] || ''}</small>${it.el ? `<i class="fx-el" style="--el:${corEl(it.el)}">${esc(it.el)}</i>` : ''}<span class="fx-cat">Categoria: ${ROM[ce] || ce} · Espaços: ${num(it.esp)}</span>${it.t === 'protecao' && it.vest ? '<i class="fx-vest">vestida</i>' : ''}</summary>`;
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
        <label>Alcance ${campo(base + '.a.alc')}</label><label>Bônus ataque ${campo(base + '.a.bAtk', 'n')}</label><label>Bônus dano ${campo(base + '.a.bDano', 'n')}</label>` : ''}
    </div>
    ${area(base + '.d', 4, 'Descrição')}
    ${it.t === 'arma' || it.t === 'protecao' || it.t === 'municao' ? `<div class="fx-mods"><span>Melhorias${mods.length ? ` (+${mods.length} categoria)` : ''}</span>${mods.map(m => `<span class="fx-chip${m.mal ? ' mal' : ''}" title="${esc(m.d || '')}">${esc(m.n)}${m.el ? ` · ${esc(m.el)}` : ''}<button data-acao="rem-mod" data-id="${it.id}" data-m="${m.id}" aria-label="Remover">×</button></span>`).join('')}<button class="fx-btn-roxo fx-mini" data-acao="add-mod" data-id="${it.id}">Adicionar</button></div>` : ''}
    <div class="fx-det-acoes"><button class="fx-btn-perigo" data-acao="remover" data-v="itens" data-id="${it.id}">Remover</button></div>
    <datalist id="fxProf"><option value="Armas Simples"><option value="Armas Táticas"><option value="Armas Pesadas"></datalist>
    <datalist id="fxTipoArma"><option value="Corpo a Corpo"><option value="Arma de Disparo"><option value="Arma de Fogo"><option value="Arremesso"></datalist>
    <datalist id="fxEmp"><option value="Leve"><option value="Uma Mão"><option value="Duas Mãos"></datalist>
    <datalist id="fxElementos2">${['Conhecimento', 'Energia', 'Morte', 'Sangue', 'Medo', 'Varia'].map(e => `<option value="${e}">`).join('')}</datalist>
  </div></details>`;
}

/* ---------------- CATÁLOGO (modal) ---------------- */
function abrirCatalogo(tipo, itemId) {
  F.cat = { tipo, itemId, busca: '', grupo: '', circ: '', el: '', sub: tipo === 'mods' ? 'melhorias' : '' };
  desenharCatalogo();
}
function desenharCatalogo() {
  const m = $('#fxModal'); const c = F.cat; if (!c) { m.hidden = true; return; }
  m.hidden = false;
  let base, titulo;
  if (c.tipo === 'hab') { base = C.habilidades; titulo = 'Adicionar habilidade'; }
  if (c.tipo === 'rit') { base = C.rituais; titulo = 'Adicionar ritual'; }
  if (c.tipo === 'itens') { base = C.itens; titulo = 'Adicionar item'; }
  if (c.tipo === 'mods') { base = c.sub === 'maldicoes' ? C.maldicoes : C.melhorias; titulo = 'Melhorias para itens'; }
  const grupos = [...new Set(base.map(x => x.g).filter(Boolean))];
  const b = c.busca.toLowerCase();
  const res = base.map((x, i) => ({ ...x, i })).filter(x => (!b || (x.n + ' ' + x.d).toLowerCase().includes(b)) && (!c.grupo || x.g === c.grupo)
    && (!c.circ || int(x.c) === int(c.circ)) && (!c.el || String(x.el || '').toLowerCase().includes(c.el)) && (c.tipo !== 'itens' || !c.sub || x.t === c.sub));
  if (b) {
    const peso = x => { const n = x.n.toLowerCase(); return n === b ? 0 : n.startsWith(b) ? 1 : n.includes(b) ? 2 : 3; };
    res.sort((x, y) => peso(x) - peso(y));
  }
  const mostra = res.slice(0, 120);
  m.innerHTML = `<div class="fx-modal-caixa"><div class="fx-modal-topo"><h3>${titulo}</h3><button class="fx-fechar" data-acao="fechar-modal" aria-label="Fechar">×</button></div>
    ${c.tipo === 'mods' ? `<div class="fx-seg"><button data-acao="mod-sub" data-v="melhorias" class="${c.sub === 'melhorias' ? 'on' : ''}">Modificações</button><button data-acao="mod-sub" data-v="maldicoes" class="${c.sub === 'maldicoes' ? 'on' : ''}">Maldições</button></div>` : ''}
    <div class="fx-modal-filtros"><input id="fxBusca" placeholder="Buscar…" value="${esc(c.busca)}">
      ${grupos.length > 1 ? `<select id="fxGrupo"><option value="">Todas as fontes</option>${grupos.map(g => `<option ${c.grupo === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>` : ''}
      ${c.tipo === 'rit' ? `<select id="fxCirc"><option value="">Todo círculo</option>${[1, 2, 3, 4].map(x => `<option value="${x}" ${int(c.circ) === x ? 'selected' : ''}>${x}º círculo</option>`).join('')}</select>
        <select id="fxEl"><option value="">Todo elemento</option>${['conhecimento', 'energia', 'morte', 'sangue', 'medo', 'varia'].map(e => `<option value="${e}" ${c.el === e ? 'selected' : ''}>${e[0].toUpperCase() + e.slice(1)}</option>`).join('')}</select>` : ''}
      ${c.tipo === 'itens' ? `<select id="fxTipoIt"><option value="">Todo tipo</option>${Object.entries(TIPOS_ITEM).map(([k, n]) => `<option value="${k}" ${c.sub === k ? 'selected' : ''}>${n}</option>`).join('')}</select>` : ''}
    </div>
    <p class="fx-dica">${res.length} resultado${res.length === 1 ? '' : 's'}${res.length > mostra.length ? ` (mostrando ${mostra.length}; refine a busca)` : ''}</p>
    <div class="fx-modal-lista">${mostra.map(x => `<article class="fx-cat-item" style="--el:${corEl(x.el)}"><div><b>${esc(x.n)}</b>
      <small>${esc([x.g, x.el, x.c ? x.c + 'º círculo' : '', x.t ? TIPOS_ITEM[x.t] : '', x.cat !== undefined && c.tipo === 'itens' ? 'Cat. ' + (ROM[x.cat] || x.cat) : '', x.esp !== undefined ? x.esp + ' esp.' : '', x.a ? `${x.a.dano} · ${x.a.margem < 20 ? x.a.margem + '/' : ''}x${x.a.mult}` : '', x.def ? 'Defesa +' + x.def : ''].filter(Boolean).join(' · '))}</small>
      <p>${esc(x.d).slice(0, 420)}${x.d.length > 420 ? '…' : ''}</p></div><button class="fx-btn-roxo" data-acao="cat-add" data-i="${x.i}">Adicionar</button></article>`).join('') || '<p class="fx-vazio-p">Nada encontrado.</p>'}</div></div>`;
  const busca = $('#fxBusca');
  busca.oninput = () => { c.busca = busca.value; const pos = busca.selectionStart; desenharCatalogo(); const nb = $('#fxBusca'); nb.focus(); nb.setSelectionRange(pos, pos); };
  const liga = (id, k) => { const e = $(id); if (e) e.onchange = () => { c[k] = e.value; desenharCatalogo(); }; };
  liga('#fxGrupo', 'grupo'); liga('#fxCirc', 'circ'); liga('#fxEl', 'el'); liga('#fxTipoIt', 'sub');
}
function adicionarDoCatalogo(i) {
  const c = F.cat; const d = F.atual.d; const id = A.Rede.chave();
  const o = Date.now();
  if (c.tipo === 'hab') { const x = C.habilidades[i]; const v = { n: x.n, d: x.d, g: x.g || '', o }; if (x.el) v.el = x.el; gravar('hab.' + id, v, true); }
  if (c.tipo === 'rit') { const x = C.rituais[i]; const v = { ...x, o }; delete v.g; gravar('rit.' + id, v, true); }
  if (c.tipo === 'itens') {
    const x = C.itens[i]; const v = { n: x.n, t: x.t, cat: x.cat, esp: x.esp, qtd: 1, d: x.d, o };
    if (x.el) v.el = x.el; if (x.a) v.a = { ...x.a }; if (x.def) v.def = x.def;
    if (x.t === 'protecao') v.vest = true;
    gravar('itens.' + id, v, true);
  }
  if (c.tipo === 'mods') {
    const x = (c.sub === 'maldicoes' ? C.maldicoes : C.melhorias)[i];
    const v = { n: x.n, d: x.d, o }; if (c.sub === 'maldicoes') { v.mal = true; if (x.el) v.el = x.el; }
    gravar(`itens.${c.itemId}.mods.${id}`, v, true);
    F.abertos.add(c.itemId);
  }
  A.aviso(`"${(c.tipo === 'hab' ? C.habilidades : c.tipo === 'rit' ? C.rituais : c.tipo === 'itens' ? C.itens : (c.sub === 'maldicoes' ? C.maldicoes : C.melhorias))[i].n}" adicionado.`);
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
function rolarPericia(id, extra = 0, titulo) {
  const d = F.atual.d, r = calc(d);
  const p = PER[id];
  const qtd = int(d.atr[atrDaPericia(d, id)]);
  const t = rolarTeste(qtd, r.bonus(id) + extra);
  const nome = titulo || p[1];
  mostrarRolagem(`${d.nome} · ${nome}`, `<div class="dados-faces">${t.dados.map(v => `<span class="face${v === t.esc ? ' usada' : ''}${v === 20 ? ' crit' : ''}${v === 1 ? ' falha' : ''}">${v}</span>`).join('')}</div>
    <p>${t.desv ? 'Menor' : 'Maior'} dado <b>${t.esc}</b> ${t.bonus >= 0 ? '+' : '−'} ${Math.abs(t.bonus)} = <span class="fx-total">${t.total}</span></p>`);
  if (minhaFicha()) A.rolagemDaFicha(`${nome}: ${t.total} (${t.dados.length}d20: ${t.dados.join(', ')}${t.desv ? ', menor' : ''}; ${t.bonus >= 0 ? '+' : '−'}${Math.abs(t.bonus)})`, id === 'iniciativa' ? t.total : undefined, t.dados, t.bonus);
  return t;
}
function rolarDano(expr, mult, nome) {
  const r = rolarExpr(expr, mult);
  mostrarRolagem(`${F.atual.d.nome} · ${mult > 1 ? 'Crítico' : 'Dano'}: ${nome}`, `<p class="fx-det-dano">${esc(r.det)}</p><p>Total <span class="fx-total">${r.total}</span></p>`);
  if (minhaFicha()) A.rolagemDaFicha(`${mult > 1 ? 'Crítico' : 'Dano'} (${nome}): ${r.total} · ${r.det}`);
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
    if (/\.t$|\.vest$|\.cat$/.test(path)) { desenharAba(); return; }
  }
  if (path === 'nex' || path === 'estagio') { atualizarDerivados(); }
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
  if (ac === 'abrir-codigo') { abrirPorCodigo(); return; }
  if (ac === 'abrir-ficha') { abrirFicha(refDoCodigo(b.dataset.k, !!b.dataset.gm)); return; }
  if (ac === 'apagar-ficha') { apagarFicha(refDoCodigo(b.dataset.k, !!b.dataset.gm)); return; }
  if (ac === 'fechar-modal') { F.cat = null; $('#fxModal').hidden = true; return; }
  if (ac === 'fechar-rolagem') { $('#fxRolagem').hidden = true; return; }
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
    rolarPericia(b.dataset.per, it ? int((it.a || {}).bAtk) : 0, `Ataque${it ? ' · ' + it.n : ' desarmado'}`);
    return;
  }
  if (ac === 'dano') { rolarDano(b.dataset.expr, int(b.dataset.mult) || 1, b.dataset.n); return; }
  if (ac === 'exportar') { exportarFicha(); return; }
  if (ac === 'copiar-codigo') { navigator.clipboard && navigator.clipboard.writeText(codigoDe(at.ref)).then(() => A.aviso('Código copiado.')).catch(() => {}); return; }
  if (!ed) return;
  if (ac === 'barra') {
    const k = b.dataset.k, r = calc(at.d);
    const mx = r[{ pv: 'pvMax', pe: 'peMax', san: 'sanMax', pd: 'pdMax' }[k]];
    const cur = at.d[k] && at.d[k].a !== undefined && at.d[k].a !== null && at.d[k].a !== '' ? int(at.d[k].a) : mx;
    gravar(k + '.a', cur + int(v));
    atualizarDerivados();
    return;
  }
  if (ac === 'catalogo') { abrirCatalogo(v); return; }
  if (ac === 'mod-sub') { F.cat.sub = v; F.cat.busca = ''; desenharCatalogo(); return; }
  if (ac === 'cat-add') { adicionarDoCatalogo(int(b.dataset.i)); return; }
  if (ac === 'add-mod') { abrirCatalogo('mods', b.dataset.id); return; }
  if (ac === 'rem-mod') { gravar(`itens.${b.dataset.id}.mods.${b.dataset.m}`, null, true); F.abertos.add(b.dataset.id); desenharAba(); return; }
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
    gravar(`${v}.${b.dataset.id}`, null, true); desenharAba();
    return;
  }
  if (ac === 'conjurar') {
    const h = (at.d.rit || {})[b.dataset.id]; if (!h) return;
    const custo = CUSTO_RITUAL[int(h.c)] || 1;
    const k = at.d.regra === 'determinacao' ? 'pd' : 'pe';
    const r = calc(at.d);
    const mx = r[k + 'Max'];
    const cur = at.d[k] && at.d[k].a !== undefined && at.d[k].a !== null && at.d[k].a !== '' ? int(at.d[k].a) : mx;
    if (cur < custo && !confirm(`Você tem ${cur} ${k.toUpperCase()} e o ritual custa ${custo}. Conjurar mesmo assim?`)) return;
    gravar(k + '.a', cur - custo, true);
    atualizarDerivados();
    const desc = `conjurou ${h.n} (${h.el || ''} ${int(h.c) || 1}º círculo, −${custo} ${k.toUpperCase()})`;
    mostrarRolagem(`${at.d.nome}`, `<p>${esc(desc)}</p><p class="fx-legenda">Lembre do Custo do Paranormal: Ocultismo DT ${20 + custo}.</p>`);
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

/* ---------------- BOTÃO NO TOPO ---------------- */
function atualizarBotao() {
  const b = $('#btnFichas'); if (!b) return;
  b.hidden = !(A.mestre || A.meu || A.aux);
  if (F.aberto && F.tela === 'lista') irLista();
}
document.addEventListener('acf-perfil', () => setTimeout(atualizarBotao, 0));
const btn = $('#btnFichas');
if (btn) btn.addEventListener('click', () => (F.aberto ? fechar() : abrir()));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && F.aberto) { if (!$('#fxModal').hidden) { F.cat = null; $('#fxModal').hidden = true; } else fechar(); } });
setTimeout(atualizarBotao, 300);
window.ACF_FICHAS = { abrir, fechar, calc, rolarExpr };
})();
