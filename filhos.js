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
// [chave, nome, descrição, ícone, rótulo curto]
const SENTIDOS = [
  ['audicao', 'Audição', 'manchas borradas e setas (o sistema atual)', '👂', 'audição'],
  ['audicao_precisa', 'Audição precisa', 'escala de ruído: silêncio nada; baixo mancha (e pedir teste de Percepção contra Furtividade); médio sala exata em alcance médio; alto ou mais sala exata no andar e movimento dobrado na próxima vez', '🎯', 'audição precisa'],
  ['audicao_agua', 'Audição dobrada na água', 'em sala com água, o alcance da audição dobra (soma à audição)', '💧', 'ouve na água'],
  ['sem_visao', 'Sem visão', 'salas reveladas não mostram cobaias: só o som; imune a efeitos visuais', '🙈', 'sem visão'],
  ['visao_curta', 'Visão curta', 'cobaias só na mesma sala ou numa sala vizinha', '👁', 'visão curta'],
  ['visao_total', 'Visão total', 'todas as cobaias na mesma sala e nas vizinhas, sem importar o barulho', '🌐', 'visão total'],
  ['faro', 'Faro de sangue', 'cobaias machucadas aparecem como mancha vermelha no andar, mesmo em silêncio', '🩸', 'faro'],
  ['faro_curto', 'Faro curto', 'cobaias machucadas à vista ganham um brilho a mais', '🩹', 'faro curto'],
  ['trilha', 'Faro de trilha', 'o rastro de cada cobaia pelas salas nos últimos minutos, como uma trilha, mesmo em silêncio', '🐾', 'trilha'],
  ['solidao', 'Solidão', 'cobaias sozinhas numa sala, mesmo em silêncio', '🧍', 'solidão'],
  ['vibracao', 'Vibração da teia', 'a primeira cobaia que pisa numa teia aparece na posição exata', '🕸', 'teia'],
  ['vib_mov', 'Vibração no chão', 'quem se mexeu em alcance médio, através das paredes, mesmo em silêncio; quem fica parado some (substitui a visão)', '〰', 'vibração'],
  ['raizes', 'Raízes', 'quem está numa sala enraizada, mesmo em silêncio', '🌱', 'raízes'],
  ['mechas', 'Rastro próprio', 'deixa uma marca (só Mestre e auxiliares) em cada sala por onde passa e vê quem está numa delas', '🧶', 'rastro próprio'],
  ['leitura', 'Leitura', 'quais cobaias abriram documentos do Arquivo nos últimos minutos e onde estavam', '📖', 'leitura'],
  ['leitura_cena', 'Leitura na cena', 'vê as cobaias que abriram documentos do Arquivo ou leram algo nesta cena', '📚', 'leu na cena'],
  ['descanso', 'Descanso', 'cobaias descansando ou dormindo (descanso curto ou longo do interlúdio), mesmo em silêncio', '💤', 'descanso'],
  ['ninho', 'Ninho', 'quem entra no covil e nas salas vizinhas a ele', '🥚', 'ninho'],
  ['maior_nex', 'Maior NEX', 'a cobaia com mais NEX do andar (Calculadora do Mestre), mesmo em silêncio', '☢', 'maior NEX'],
  ['telas', 'Telas', 'quem está numa sala com monitor ou televisão (etiqueta "tela")', '📺', 'telas'],
  ['cameras', 'Câmeras', 'quem está numa sala com câmera (etiqueta "câmera") ou com um robô S.T.A.F.F.', '📷', 'câmeras'],
];
const NOME_SENT = Object.fromEntries(SENTIDOS.map(([k, n]) => [k, n]));
const MOVS = [['normal', 'Normal', 'segue o limite da perseguição', '🚶'], ['lento', 'Lento', 'metade do limite na perseguição', '🐢'], ['imovel', 'Imóvel', 'não se move no mapa', '⚓'], ['escuro', 'Só no escuro', 'travado em sala iluminada (anda em Apagão, luz apagada, sem sinal ou sala "escura")', '🌑']];
const MODS = [
  ['apagao2', 'Dobro no Apagão', 'movimento dobrado durante um Apagão geral', '🌘'],
  ['grande', 'Grande demais', 'não entra em corredor (ou sala) estreito', '🦣'],
  ['arromba', 'Arromba portas', 'passa por porta trancada, com estrondo', '💥'],
  ['silencioso', 'Passos silenciosos', 'o movimento nunca gera aviso aos jogadores', '🤫'],
  ['diaPar', 'Dia par', 'nos dias pares do ciclo, as cobaias veem um aviso discreto de −5 em Furtividade', '📅'],
  ['proibeBarulhenta', 'Evita barulho', 'PROPOSTA: sala barulhenta proibida; a cobaia que se esconde nela soma barulho', '🔇'],
  ['atravessa', 'Atravessa paredes', 'anda em linha reta pelas paredes; ignora portas trancadas e corredores', '🧱'],
  ['proibeMetal', 'Não entra em metal', 'salas com a etiqueta "metal" ficam proibidas', '⛓'],
  ['agua18', 'Rápido na água', 'em sala com água: limite de 18 m e passa direto entre salas com água vizinhas', '🌊'],
  ['dobroPersg', 'Dobro na perseguição', 'PROPOSTA: anda o dobro do limite na perseguição', '🐆'],
  ['derrubaSinal', 'Derruba o sinal', 'PROPOSTA: as salas por onde passa ficam sem sinal por 30 segundos', '📵'],
];
// rastro público: dura alguns minutos (as duas salas) ou, se "cena", só a sala que ele deixou até o fim da cena
const RASTROS = { molhado: 'Chão molhado', lodo: 'Lodo preto no chão', ausencia: 'Trilhas de Ausência' };
const RASTRO_CENA = { ausencia: 1 };
const MARCAS = { molhado: ['💧', 'Chão molhado'], lodo: ['⬛', 'Lodo preto no chão'], raizes: ['🌱', 'Raízes no chão'], alagada: ['🌊', 'Alagada: terreno difícil (metade do movimento)'], ausencia: ['🌀', 'Trilhas de Ausência'] };
const AVISOS = [
  ['tremor', 'O chão treme', 'todos no andar, com um rumo vago', '📳'],
  ['forro', 'Algo acima do forro', 'quem está numa sala vizinha, sem direção', '⬆'],
  ['observado', 'Você se sente observado', 'quem está na mesma sala', '👁'],
  ['aproxima', 'Algo se aproxima', 'quem está numa sala vizinha', '👣'],
];
const TXT_AVISO = {
  tremor: r => `O chão treme. Parece vir do ${r}.`,
  forro: () => 'Algo se arrasta acima do forro.',
  observado: () => 'Você se sente observado.',
  aproxima: () => 'Algo se aproxima.',
  estrondo: r => `Um estrondo de porta arrombada, vindo do ${r}.`,
  treme: () => 'O chão treme debaixo dos seus pés.',
  tv: () => 'A televisão liga sozinha.',
};
const OCULT = [
  ['', 'Nenhuma', 'aparece como qualquer token', '·'],
  ['teto', 'No teto', 'oculto mesmo em sala revelada até alguém passar em "Examinar a sala"', '🕷'],
  ['parede', 'Na parede', 'em sala com quadros, invisível até atacar', '🖼'],
  ['sempre', 'Sempre oculto', 'até atacar ou alguém passar em "Olhar ao redor" (fica parado no próximo turno)', '👻'],
  ['pisca', 'Meio apagado', 'o token pisca para os jogadores, aparece e some', '💫'],
  ['lente', 'Só por uma lente', 'revelado, só aparece para quem marcou "olhando por uma lente" (e para todos durante um Flash)', '📷'],
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
  conectar: { n: 'Conectar', i: '🔌', lim: 'cena', d: 'Liga os cabos a um painel da sala: por 1 rodada, a vista dele mostra quem está nas salas do andar que têm sinal.' },
  trancar: { n: 'Trancar', i: '🔒', d: 'Fecha uma porta aberta do andar (os jogadores abrem de novo pelo botão da porta) ou abre uma fechada.' },
  fiacao: { n: 'Pela fiação', i: '🔀', d: 'Some numa sala do elemento escolhido (padrão Energia) e reaparece em outra sala desse elemento no mesmo andar.' },
  curto: { n: 'Curto-circuito', i: '⚡', d: 'A sala dele entra em apagão local e perde o sinal até o fim da cena.' },
  atravessar: { n: 'Atravessar', i: '🌀', lim: 'cena', d: 'O token salta para qualquer sala do andar.' },
  transmissao: { n: 'Transmissão', i: '📺', d: 'Aparece numa sala com tela (etiqueta "tela"); quem está lá recebe "a televisão liga sozinha".' },
  bote: { n: 'Avisar o bote', i: '📳', d: 'Na rodada antes do bote: quem está na sala escolhida recebe "o chão treme".' },
  buscar: { n: 'Buscar', i: '🦴', d: 'Escolha uma cobaia: o jogador faz Vontade na tela; se falhar, você (Mestre) escreve o que ela esqueceu, em mensagem privada.' },
  postura: { n: 'Postura', i: '🐸', d: 'Põe 1d4+2 crias ocultas na mesma sala, como tokens pequenos (Filho e dado no campo próprio).' },
};
const PASSIVOS = [
  ['regente', 'Regente', 'com ele no andar, o auxiliar move mais um Filho por rodada de perseguição', '🎼'],
  ['abraco', 'Abraço', 'o Mestre marca a cobaia agarrada e as frases dela entram no repertório', '🤱'],
  ['interferencia', 'Interferência', 'revelado, aparece aos jogadores como três tokens na mesma região: só um é real; os falsos somem quando uma cobaia entra na sala deles ou passa em Olhar ao redor ou Examinar (DT abaixo)', '📡'],
  ['amigavel', 'Amigável', 'revelado, os jogadores veem a etiqueta "amigável" no token até ele atacar alguém', '🤝'],
  ['distFalsa', 'Distância falsa', 'na perseguição, as cobaias na sala dele e nas vizinhas andam metade do limite', '📏'],
  ['unico', 'Único no mapa', 'só um token dele no mapa: a tela do Mestre tira os repetidos', '①'],
];
const ETIQUETAS = [['agua', '💧', 'Água'], ['barulhenta', '🔊', 'Barulhenta'], ['estreito', '↔', 'Estreito'], ['quadros', '🖼', 'Quadros'], ['ninho', '🥚', 'Ninho'], ['metal', '⛓', 'Metal'], ['camera', '📷', 'Câmera'], ['tela', '📺', 'Tela'], ['escura', '🌑', 'Escura']];
const ELEMENTOS = [['sangue', 'Sangue', '🩸', '#d0343e'], ['morte', 'Morte', '💀', '#9a9a9a'], ['conhecimento', 'Conhecimento', '📜', '#d6a521'], ['energia', 'Energia', '⚡', '#a35cf0'], ['medo', 'Medo', '👁', '#e9e4f2']];
const EL = Object.fromEntries(ELEMENTOS.map(e => [e[0], e]));
const FUGA = { sangue: 'morte', morte: 'energia', energia: 'conhecimento', conhecimento: 'sangue' };   // rota de fuga (cânone): elemento oposto
const EL_SALA = { S: 'sangue', M: 'morte', C: 'conhecimento', E: 'energia', F: 'medo' };
// estados do modelo 3D: o momento (genérico) → nome do estado da forma (dados do Mestre)
const MOMENTOS3D = [['padrao', 'Normal'], ['anda', 'Andando'], ['cobaia', 'Com cobaia na sala'], ['conectar', 'Conectado'], ['transmissao', 'Transmitindo'], ['flash', 'Durante o Flash']];
// formas do 3D (filhos3d.js) com o estado 'candelabro' (fingir ser um lustre no teto); o cartão ganha o botão
const FORMAS_CANDELABRO = ['aranha_gaiola'];
const formaTk = (id, tk) => tk.fm || (est().formas || {})[tk.s] || (est().formas || {})[id] || '';
// objetos da biblioteca do 3D para a Forma de Objeto
const OBJETOS = [['cadeira', 'Cadeira'], ['cadeira_plastico', 'Cadeira de plástico'], ['caixote', 'Caixote (baú)'], ['maca', 'Maca com rodas (carrinho)'], ['armario', 'Armário'], ['armario_metal', 'Armário de metal'], ['estante', 'Estante'], ['manequim', 'Manequim'], ['mesa', 'Mesa']];
const DETALHES = [['', 'Nenhum (cópia perfeita)'], ['espelho', 'Retrato espelhado'], ['fhp', 'Número FHP trocado'], ['aro', 'Cor do anel um tom diferente']];
const ALC_MEDIO = 18, ALC_LONGO = 36;          // metros (alcances do livro)
const RASTRO_MIN = 5, LEITURA_MIN = 10;         // minutos padrão
const TRILHA_MIN = 5;                            // faro de trilha: minutos padrão

/* ---------- Leitura dos dados ---------- */
const est = () => (A() && A().estado) || {};
const priv = () => (I() && I().Priv.dados) || {};
const cfgs = () => priv().filhos || {};
const cfgDe = ser => cfgs()[ser] || null;
// características valendo para um token: as do Filho e, se ele tem forma rolada (tk.el), as daquela forma por cima
function cfgTk(tk) {
  if (!tk) return null;
  const c = cfgDe(tk.s); if (!c) return null;
  const pf = tk.el && c.porForma && c.porForma[tk.el];
  if (!pf) return tk.el ? { ...c, el: tk.el } : c;
  const r = { ...c, el: tk.el };
  ['sent', 'movx', 'hab', 'pass', 'avisos'].forEach(g => { if (pf[g]) r[g] = { ...(c[g] || {}), ...pf[g] }; });
  ['rastro', 'mov', 'ocult'].forEach(k => { if (pf[k]) r[k] = pf[k]; });
  return r;
}
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
// escuro: Apagão, luz apagada, sem sinal, sala com a etiqueta "escura", curto-circuito nesta cena ou sinal caído há pouco
const curtoEm = cn => { const v = (ef().curto || {})['c' + cn]; return !!(v && v.c === cena()); };
const sinalCaido = cn => ((ef().sinalCaido || {})['c' + cn] || 0) > agora();
const semSinalEm = cn => !!(cn && ((ef().semSinal || {})['c' + cn] || curtoEm(cn) || sinalCaido(cn)));
const escuroEm = (a, cn) => !!(I().apagao() || ((est().luz || {})['c' + cn] === 'off') || (cn && (semSinalEm(cn) || tagsSala(cn).escura)));
const elSala = (a, cn) => EL_SALA[(A().infoSala(cn) || [])[1]] || '';
// estados temporários de um token (Conectar, Flash, Transmissão): valem 1 rodada na perseguição ou ~1 minuto fora dela
function ativoAte(v, ms) {
  if (!v) return false; if (v.c && v.c !== cena()) return false;
  if (P().on && v.r) { const r = rodada(), vz = P().vez || 0; return r < v.r + 1 || (r === v.r + 1 && vz < (v.v || 0)); }
  return agora() - (v.ts || 0) < (ms || 60000);
}
const umaRodada = () => ({ r: P().on ? rodada() : 0, v: P().on ? P().vez || 0 : 0, ts: agora(), c: cena() });
const conectado = id => ativoAte((ef().con || {})[id]);
const flashAtivo = tk => !!(tk && tk.fl && ativoAte(tk.fl, 60000));
const lenteMinha = () => { const t = tokens()[A().meu]; return !!(t && t.lt); };
// token "só por uma lente": some para o jogador que não está olhando por uma, salvo durante o Flash
const lenteOculto = tk => !!(tk && tk.ln) && !flashAtivo(tk);

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
  if (sent(c, 'vib_mov') && !naoMexeu(cobId, tk) && metros({ x: f.x, y: f.y }, { x: tk.x, y: tk.y }) <= ALC_MEDIO) return 'vibração';
  if (sent(c, 'maior_nex') && maiorNex(tk.a).includes(cobId)) return 'NEX';
  if (sent(c, 'telas') && cn && tagsSala(cn).tela) return 'tela';
  if (sent(c, 'cameras') && cn && (tagsSala(cn).camera || roboNaSala(tk.a, p))) return 'câmera';
  if (sent(c, 'mechas') && cn) { const fid = idDe(f); if (fid && ((ef().mechas || {})[fid] || {})['c' + cn]) return 'rastro'; }
  if (sent(c, 'leitura_cena') && leuNaCena(cobId)) return 'leitura';
  const fid = idDe(f);
  if (fid && conectado(fid) && cn && !escuroEm(tk.a, cn)) return 'sinal';
  return '';
}
const idDe = tk => Object.keys(tokens()).find(k => tokens()[k] === tk) || null;
function maiorNex(a) {
  const nx = est().nex || {};
  let max = -1, ids = [];
  cobaiasNoAndar(a).forEach(([id]) => { const v = typeof nx[id] === 'number' ? nx[id] : -1; if (v > max) { max = v; ids = [id]; } else if (v === max) ids.push(id); });
  return max >= 0 ? ids : [];
}
const roboNaSala = (a, p) => !!p && Object.values(tokens()).some(t => tipoDe(t) === 'robo' && t.a === a && !t.h && salaP(t) === p);
function leuNaCena(cob) {
  const desde = (est().cena || {}).ts || 0;
  return Object.values(leituras).some(l => l && l.s === cob && (l.ts || 0) >= desde && (desde || agora() - (l.ts || 0) < LEITURA_MIN * 60e3));
}
function salaEnraizada(f, cn) {
  if (cnTk(f) === cn) return true;
  return !!(ef().raizes || {})['c' + cn];
}
function covis(c) { return String((c && c.covil) || '').split(/[^0-9]+/).map(int).filter(Boolean); }
function ninhoP(f, c) { const cv = covis(c).find(n => Math.ceil(n / 25) === f.a); return cv ? cv - 25 * (f.a - 1) : salaP(f); }
// visão: true/false. Base: cobaias na sala do Filho e nas salas reveladas
function enxerga(f, c, tk) {
  if (sent(c, 'sem_visao') || sent(c, 'vib_mov')) return false;
  const pf = salaP(f), pt = salaP(tk);
  let ve;
  if (sent(c, 'visao_curta')) {
    if (pt) ve = !!pf && (pt === pf || vizinhas(pf).includes(pt));
    else { const ci = corrTk(tk), k = I().CORREDORES[ci]; ve = !!k && (corrTk(f) === ci || k.p1 === pf || k.p2 === pf); }
  } else if (pt) ve = pt === pf || I().salaRevelada(tk.a, I().cnDe(tk.a, pt)) || (sent(c, 'visao_total') && !!pf && vizinhas(pf).includes(pt));
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
  const c = cfgTk(f);
  if (!c) return null;
  if (tk.a !== f.a) return false;
  const id = idDe(tk) || tk.s;
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
  const f = tokens()[fid], c = cfgTk(f);
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
  const f = tokens()[fid], c = cfgTk(f);
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
  const c = ehFilho(tk) ? cfgTk(tk) : null;
  if (c) {
    if (c.mov === 'lento') l /= 2;
    if (mod(c, 'apagao2') && I().apagao()) l *= 2;
    if (mod(c, 'dobroPersg') && P().on) l *= 2;
    const db = (ef().dobro || {})[id];
    if (db && P().on && rodada() <= db.r && agora() - (db.ts || 0) < 900000) l *= 2;
    if (mod(c, 'agua18')) { const cf = cnTk(tk.x0 !== undefined ? { a: tk.a, x: tk.x0, y: tk.y0 } : tk); if (cf && tagsSala(cf).agua) l = Math.max(l, 18); }
  }
  // sala alagada (marca pública): terreno difícil, metade do movimento, para todos
  const ref = tk.x0 !== undefined ? { a: tk.a, x: tk.x0, y: tk.y0 } : tk;
  const cn = cnTk(ref);
  if (cn && Object.values(pub().m || {}).some(m => m && m.t === 'alagada' && m.cn === cn && m.c === cena())) l /= 2;
  // distância falsa (publicada sem dizer de quem): as cobaias nessas salas andam metade na perseguição
  if (cn && !ehFilho(tk) && P().on && (pub().df || {})['c' + cn]) l /= 2;
  return Math.max(0.5, Math.round(l * 2) / 2);
}
function travado(id, tk) {
  if (!tk || !ehFilho(tk) || !regraVale(id)) return '';
  if (tk.dc) return 'Imagem falsa (interferência): não se move.';
  const c = cfgTk(tk); if (!c) return '';
  if (tk.fo) { const tr = window.ACF_DISFARCE ? ACF_DISFARCE.travaObjeto(id, tk) : null; if (tr !== '') return tr || 'Em forma de objeto: volte à forma normal para se mover.'; }   // disfarce3d.js: "só se move quando ninguém olha"
  if (c.mov === 'imovel') return 'Este Filho não se move no mapa (imóvel).';
  if (c.mov === 'escuro') { const cn = cnTk(tk); const corrEsc = !cn && (I().apagao() || (est().luz || {})['a' + tk.a] === 'off'); if (!(cn ? escuroEm(tk.a, cn) : corrEsc)) return 'Só se move no escuro: este lugar está iluminado.'; }
  const tv = (ef().trava || {})[id];
  if (tv && P().on && rodada() <= tv) return 'Alguém está olhando: fica parado neste turno.';
  return '';
}
function bloqueia(id, a, x, y) {
  const tk = tokens()[id]; if (!tk || !ehFilho(tk) || !regraVale(id)) return false;
  const c = cfgTk(tk); if (!c) return false;
  const p = I().salaEm(a, x, y);
  if (mod(c, 'grande')) {
    if (p && tagsSala(I().cnDe(a, p)).estreito) return true;
    if (!p) { const ci = I().corredorEm(x, y); if (ci >= 0 && tagsCorr(a, ci).estreito) return true; }
  }
  if (mod(c, 'proibeBarulhenta') && p && tagsSala(I().cnDe(a, p)).barulhenta) return true;
  if (mod(c, 'proibeMetal') && p && tagsSala(I().cnDe(a, p)).metal) return true;
  return false;
}
// anda pelas paredes (fora das salas e corredores): só quem tem "atravessa paredes"
function atravessa(id) {
  const tk = tokens()[id]; if (!tk || !ehFilho(tk) || !regraVale(id)) return false;
  return mod(cfgTk(tk), 'atravessa');
}
function ignoraPorta(id, a, ci) {
  const tk = tokens()[id]; if (!tk || !ehFilho(tk)) return false;
  const c = cfgTk(tk); if (!c) return false;
  if (mod(c, 'arromba') || mod(c, 'atravessa')) return true;
  if (mod(c, 'agua18')) { const k = I().CORREDORES[ci]; if (k && tagsSala(I().cnDe(a, k.p1)).agua && tagsSala(I().cnDe(a, k.p2)).agua) return true; }
  const d = (ef().dutos || {})[id];
  return !!(d && agora() - d < 600000);
}
function regente(id, tk) {
  if (!tk || !ehFilho(tk) || !P().on || !(souAux() || souMestre())) return false;
  const temRegente = Object.values(tokens()).some(t => t !== tk && t.a === tk.a && ehFilho(t) && !t.dc && pas(cfgTk(t), 'regente'));
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
      gravarEstado(['obj', id], obk);   // o dono antes do objeto: a limpeza da tela do Mestre não apaga objeto sem dono
      gravarPub(['ob', obk], { a: t2.a, x: t2.x, y: t2.y, o, ts: agora() });
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
  conectar(id, tk) {
    gravarEstado(['con', id], umaRodada());
    return 'Conectar: por 1 rodada, vê as salas do andar com sinal';
  },
  trancar(id, tk) {
    // portas abertas primeiro, depois as mais perto do Filho
    const pf = salaOuPerto(tk), ops = [];
    I().CORREDORES.forEach((k, ci) => {
      const v = A().portaDe(tk.a, ci);
      if (v !== 'a' && v !== null) return;
      ops.push([ci, `${v === 'a' ? '🔒 Fechar' : '🔓 Abrir'} · CN ${pad2(I().cnDe(tk.a, k.p1))} ↔ CN ${pad2(I().cnDe(tk.a, k.p2))}`, '', (v === 'a' ? 0 : 100) + Math.min(passos(pf, k.p1), passos(pf, k.p2))]);
    });
    ops.sort((x, y) => x[3] - y[3]);
    escolher('Trancar: qual porta do andar', ops, ci => {
      const k = 'a' + tk.a + 'c' + ci, v = A().portaDe(tk.a, ci);
      if (v === 'a') { A().definir(['portas', k], null); logFilhos(`${rotuloGM(tk)} fechou a porta do corredor ${ci} (os jogadores abrem pelo botão)`); A().aviso('Porta fechada.'); }
      else { const r = A().porta3D(tk.a, ci, 'abrir'); if (r) A().aviso(r); else logFilhos(`${rotuloGM(tk)} abriu a porta do corredor ${ci}`); }
    }, 'Nenhuma porta aberta ou fechada (sem obstáculo) neste andar.');
    return null;
  },
  fiacao(id, tk, c) {
    const elx = c.fiacaoEl || 'energia', cn = cnTk(tk);
    if (!cn || elSala(tk.a, cn) !== elx) return A().aviso(`Precisa estar numa sala de ${(EL[elx] || [, elx])[1]}.`);
    const ops = [];
    for (let p = 1; p <= 25; p++) { const c2 = I().cnDe(tk.a, p); if (c2 !== cn && elSala(tk.a, c2) === elx) ops.push([p, A().nomeSala(c2)]); }
    escolher('Pela fiação: reaparecer em', ops, p => {
      const r = I().retSala(p), t2 = tokens()[id]; if (!t2) return;
      A().definir(['tokens', id], { ...t2, x: +(r.x + 1 + Math.random() * (I().R - 2)).toFixed(2), y: +(r.y + 1 + Math.random() * (I().R - 2)).toFixed(2) });
      logFilhos(`${rotuloGM(t2)} usou Pela fiação: CN ${pad2(cn)} → CN ${pad2(I().cnDe(tk.a, p))}`);
    }, `Nenhuma outra sala de ${(EL[elx] || [, elx])[1]} neste andar.`);
    return null;
  },
  curto(id, tk) {
    const cn = cnTk(tk); if (!cn) return A().aviso('Fique numa sala.');
    gravarEstado(['curto', 'c' + cn], { c: cena(), ts: agora(), tk: id });
    return `Curto-circuito: CN ${pad2(cn)} no escuro e sem sinal até o fim da cena`;
  },
  atravessar(id, tk) {
    const ops = [];
    for (let p = 1; p <= 25; p++) { const c2 = I().cnDe(tk.a, p); if (p !== salaP(tk)) ops.push([p, A().nomeSala(c2)]); }
    escolher('Atravessar: saltar para', ops, p => {
      const r = I().retSala(p), t2 = tokens()[id]; if (!t2) return;
      A().definir(['tokens', id], { ...t2, x: +(r.x + 1 + Math.random() * (I().R - 2)).toFixed(2), y: +(r.y + 1 + Math.random() * (I().R - 2)).toFixed(2) });
      marcarUso(id, 'atravessar');
      logFilhos(`${rotuloGM(t2)} usou Atravessar: CN ${pad2(cnTk(tk) || 0)} → CN ${pad2(I().cnDe(tk.a, p))}`);
    });
    return false;
  },
  transmissao(id, tk) {
    const ops = [];
    for (let p = 1; p <= 25; p++) { const c2 = I().cnDe(tk.a, p); if (tagsSala(c2).tela) ops.push([p, A().nomeSala(c2)]); }
    escolher('Transmissão: aparecer em', ops, p => {
      const r = I().retSala(p), t2 = tokens()[id]; if (!t2) return;
      const cn = I().cnDe(tk.a, p);
      A().definir(['tokens', id], { ...t2, x: +(r.x + 1 + Math.random() * (I().R - 2)).toFixed(2), y: +(r.y + 1 + Math.random() * (I().R - 2)).toFixed(2) });
      gravarEstado(['trans', id], { ts: agora(), r: rodada(), c: cena() });
      const al = {}; cobaiasNoAndar(tk.a).forEach(([cid, t]) => { if (salaP(t) === p) al[cid] = 1; });
      if (Object.keys(al).length) Motor.aviso('tv', tk.a, al);
      logFilhos(`${rotuloGM(t2)} usou Transmissão: CN ${pad2(cn)}${Object.keys(al).length ? ` (${Object.keys(al).map(k => SERd(k).nome).join(', ')}: a televisão liga sozinha)` : ''}`);
    }, 'Nenhuma sala com a etiqueta "tela" neste andar (editor de etiquetas do Mestre).');
    return null;
  },
  bote(id, tk) {
    const p = salaP(tk); const salas = p ? [p].concat(vizinhas(p)) : [];
    const ops = salas.map(q => { const n = cobaiasNoAndar(tk.a).filter(([, t]) => salaP(t) === q).length; return [q, `${A().nomeSala(I().cnDe(tk.a, q))}${n ? ` · ${n} cobaia(s)` : ''}`]; });
    escolher('Avisar o bote: a sala que treme', ops, q => {
      const al = {}; cobaiasNoAndar(tk.a).forEach(([cid, t]) => { if (salaP(t) === q) al[cid] = 1; });
      if (Object.keys(al).length) Motor.aviso('treme', tk.a, al);
      logFilhos(`${rotuloGM(tk)} prepara o bote na CN ${pad2(I().cnDe(tk.a, q))}${Object.keys(al).length ? '' : ' (ninguém lá)'}`);
      A().aviso('O chão treme na sala escolhida.');
    }, 'Fique numa sala.');
    return null;
  },
  buscar(id, tk, c) {
    const p = salaP(tk);
    const lista = cobaiasNoAndar(tk.a).sort((x, y) => (salaP(y[1]) === p) - (salaP(x[1]) === p));
    escolher('Buscar: tocar em', lista.map(([cid, t]) => [cid, SERd(cid).nome, salaP(t) === p ? 'na mesma sala' : '']), cid => {
      const ir = dt => {
        pedirTeste({ per: 'vontade', dt, al: { [cid]: 1 }, ef: 'buscar', txt: 'Algo toca você e procura uma lembrança.' });
        logFilhos(`${rotuloGM(tk)} usou Buscar em ${SERd(cid).nome}${dt ? ` (Vontade DT ${dt})` : ''}`);
      };
      if (c.buscarDT) ir(int(c.buscarDT)); else pedirTexto('Buscar', `DT do teste de Vontade de ${SERd(cid).nome}`, '', v => { if (int(v)) ir(int(v)); }, true);
    }, 'Nenhuma cobaia neste andar.');
    return null;
  },
  postura(id, tk, c) {
    const p = salaP(tk); if (!p) return A().aviso('Fique numa sala.');
    const dado = (c.postura && c.postura.dado) || '1d4+2', ser = (c.postura && c.postura.ser) || tk.s, n = Math.max(1, rolar(dado).total);
    for (let i = 0; i < n; i++) colocarHidden(ser, tk.a, p);
    A().aviso(`Postura: +${n} (${dado}) ocultos nesta sala.`); return `Postura: +${n} na CN ${pad2(cnTk(tk))}`;
  },
};
function usar(id, k) {
  const tk = tokens()[id]; if (!tk || !ehFilho(tk)) return;
  if (!souGM()) return;
  if (tk.dc) return A().aviso('Esta é uma imagem falsa (interferência).');
  const c = cfgTk(tk) || {};
  if (!hab(c, k) && !souMestre()) return A().aviso('Este Filho não tem essa habilidade.');
  const b = bloqueioUso(id, c, k); if (b) return A().aviso(b);
  if (window.ACF_DISFARCE && ACF_DISFARCE.usar(id, k, tk, c)) return;   // disfarce3d.js: objeto e cópia (modo Disfarce no 3D)
  let r;
  try { r = USAR[k](id, tk, c); } catch (e) { console.warn('filhos:', k, e); return A().aviso('Não deu para usar agora.'); }
  if (typeof r === 'string') { if (limiteHab(c, k) && k !== 'enraizar' && k !== 'atravessar') marcarUso(id, k); logFilhos(`${rotuloGM(tk)} · ${r}`); A().aviso('✦ ' + r); }
}
function naoMexeu(cid, t) {
  if (P().on) return !(t.m > 0);
  const u = ultMov[cid]; return !u || agora() - u > 30000;
}
const ultMov = {}, posAnt = {};
function vigiarParados() {
  Object.entries(tokens()).forEach(([id, t]) => { if (!ehCobaia(t)) return; const k = t.a + ':' + t.x + ',' + t.y; if (posAnt[id] !== undefined && posAnt[id] !== k) ultMov[id] = agora(); posAnt[id] = k; });
}

/* ---------- Resumo em chips (painel do Mestre, cartão e quadro do Controle) ---------- */
const elDe = c => (c && c.el && EL[c.el]) || null;
// lista de [ícone, rótulo, descrição] do que o Filho tem
function chipsDe(c) {
  if (!c) return [];
  const out = [];
  SENTIDOS.forEach(([k, n, d, i, t]) => { if (sent(c, k)) out.push([i, t, n + ': ' + d]); });
  const mv = MOVS.find(m => m[0] === (c.mov || 'normal'));
  if (mv && mv[0] !== 'normal') out.push([mv[3], mv[1].toLowerCase(), mv[1] + ': ' + mv[2]]);
  MODS.forEach(([k, n, d, i]) => { if (mod(c, k)) out.push([i, n.toLowerCase(), n + ': ' + d]); });
  const oc = c.ocult && OCULT.find(o => o[0] === c.ocult); if (oc) out.push([oc[3], oc[1].toLowerCase(), oc[1] + ': ' + oc[2]]);
  if (c.rastro && RASTROS[c.rastro]) out.push([MARCAS[c.rastro][0], RASTROS[c.rastro].toLowerCase(), 'Rastro: ' + RASTROS[c.rastro]]);
  AVISOS.forEach(([k, n, d, i]) => { if (c.avisos && c.avisos[k]) out.push([i, n.toLowerCase(), 'Aviso: ' + n + ' (' + d + ')']); });
  PASSIVOS.forEach(([k, n, d, i]) => { if (pas(c, k)) out.push([i, n.toLowerCase(), n + ': ' + d]); });
  if (covis(c).length) out.push(['🏠', 'covil ' + covis(c).map(pad2).join(', '), 'Covil: CN ' + covis(c).map(pad2).join(', CN ')]);
  if (c.rolagem && c.rolagem.dado) out.push(['🎲', 'forma ' + c.rolagem.dado, 'A forma é rolada na invocação']);
  return out;
}
function htmlChips(lista, max, cls) {
  if (!lista.length) return '';
  const vis = max && lista.length > max + 1 ? lista.slice(0, max) : lista, resto = lista.length - vis.length;
  return `<span class="${cls || 'fc-chips'}">${vis.map(([i, t, d]) => `<span class="fc-chip" title="${esc(d || t)}"><i aria-hidden="true">${i}</i>${esc(t)}</span>`).join('')}${resto ? `<span class="fc-chip fc-mais" title="${esc(lista.slice(vis.length).map(x => x[1]).join(', '))}">+${resto}</span>` : ''}</span>`;
}
function nBotoes(c) { return Object.keys(HABS).filter(k => hab(c, k)).length; }

/* ---------- Cartão do token (2D) ---------- */
function resumoCfg(c) {
  if (!c) return '<p class="mini">Sem características cadastradas (painel "Filhos" do Mestre, aba Segredos).</p>';
  const ch = chipsDe(c), e = elDe(c);
  const fuga = e && FUGA[e[0]] ? `<span class="fc-chip fc-fuga" title="Rota de fuga (cânone): o Protocolo se desliga se as cobaias chegarem a uma sala do elemento oposto"><i aria-hidden="true">🏃</i>fuga: ${esc(EL[FUGA[e[0]]][1])}</span>` : '';
  return `<div class="fc-resumo">${e ? `<span class="fc-chip fc-el" style="--el:${e[3]}"><i aria-hidden="true">${e[2]}</i>${esc(e[1])}</span>` : ''}${fuga}${htmlChips(ch, 0, 'fc-chips fc-in')}</div>`;
}
function htmlBotoes(id, tk, c, cls) {
  const ks = Object.keys(HABS).filter(k => hab(c, k));
  if (!ks.length) return '';
  return `<div class="${cls || 'fil-btns'}">${ks.map(k => { const b = bloqueioUso(id, c, k); const nome = k === 'objeto' && tk.fo ? 'Voltar à forma' : k === 'copiar' && tk.cp ? 'Desfazer cópia' : HABS[k].n; return `<button type="button" data-fil-hab="${k}" title="${esc(HABS[k].d + (b ? ' · ' + b : ''))}" class="${b ? 'usado' : ''}${(k === 'objeto' && tk.fo) || (k === 'copiar' && tk.cp) ? ' on' : ''}"><i aria-hidden="true">${HABS[k].i}</i><span>${esc(nome)}</span>${limiteHab(c, k) === 'cena' ? '<small>1/cena</small>' : limiteHab(c, k) === 'rodadas3' ? '<small>3 rod.</small>' : ''}</button>`; }).join('')}</div>`;
}
function estadoTk(tk) {
  const l = [];
  if (tk.dc) l.push(['📡', 'imagem falsa (interferência)']);
  if (tk.fo) l.push(['🪑', 'objeto: ' + (OBJETOS.find(o => o[0] === tk.fo) || ['', tk.fo])[1].toLowerCase()]);
  if (tk.cp && SERd(tk.cp)) l.push(['🎭', 'copiando ' + SERd(tk.cp).nome + (tk.cpd ? ' · ' + (DETALHES.find(d => d[0] === tk.cpd) || ['', tk.cpd])[1].toLowerCase() : '')]);
  if (tk.oc) l.push(['👻', 'oculto dos jogadores']);
  if (tk.cd) l.push(['🕯', 'fingindo ser um candelabro (sem anel nem nome para os jogadores)']);
  if (tk.ln && flashAtivo(tk)) l.push(['📸', 'visível a todos: Flash']);
  if (tk.am) l.push(['🤝', 'amigável para os jogadores']);
  if (tk.el && EL[tk.el]) l.push([EL[tk.el][2], 'forma rolada: ' + EL[tk.el][1]]);
  if (tk.pp) l.push(['⏳', 'aguardando a tela do Mestre']);
  if (tk.pi) l.push(['💫', 'pisca para os jogadores']);
  const id = idDe(tk);
  if (id && conectado(id)) l.push(['🔌', 'conectado: vê as salas com sinal']);
  return l.length ? `<div class="fc-estado">${l.map(([i, t]) => `<span class="fc-chip fc-st"><i aria-hidden="true">${i}</i>${esc(t)}</span>`).join('')}</div>` : '';
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
  const c = cfgTk(tk);
  let h = `<details class="fil-cartao" open><summary>Características${c && nBotoes(c) ? ` <small>${nBotoes(c)} botão(ões)</small>` : ''}</summary>${tk.dc ? '' : resumoCfg(c)}${estadoTk(tk)}`;
  if (c && !tk.dc) h += htmlBotoes(id, tk, c);
  const acoes = [];
  if (v.aux && !tk.dc) acoes.push(`<button type="button" data-fil-foco class="${focoAtual() === id ? 'on' : ''}">👁 ${focoAtual() === id ? 'Voltar à vista do robô' : 'Ver pelos sentidos dele'}</button>`);
  if (v.mestre) {
    if (tk.dc) acoes.push('<button type="button" data-fil-falsos>📡 Tirar as imagens falsas</button>');
    if (c && pas(c, 'abraco')) acoes.push('<button type="button" data-fil-abraco>🤱 Abraço: cobaia agarrada</button>');
    if (c && (c.ocult === 'sempre' || c.ocult === 'teto' || c.ocult === 'parede')) acoes.push(`<button type="button" data-fil-revelar>${tk.rv ? '🙈 Esconder de novo' : '👁 Revelar nesta sala'}</button>`);
    if (!tk.dc && FORMAS_CANDELABRO.includes(formaTk(id, tk))) acoes.push(`<button type="button" data-fil-candelabro class="${tk.cd ? 'on' : ''}" title="No 3D: sobe ao teto e finge ser um candelabro; os jogadores não veem o anel nem o nome">${tk.cd ? '⬇ Descer do teto' : '🕯 Fingir candelabro'}</button>`);
    if (!tk.dc) acoes.push(`<button type="button" data-fil-editar>⚙ Editar características</button>`);
  }
  if (acoes.length) h += `<div class="fc-acoes">${acoes.join('')}</div>`;
  if (v.mestre) { const en = ((A().segredos._filhos || {})[tk.s] || {}).enigma; if (en) h += `<details class="fil-enigma"><summary>🔐 Enigma (só você)</summary><p>${esc(en)}</p></details>`; }
  return h + '</details>';
}
function ligarCartao(c, id) {
  $$('[data-fil-hab]', c).forEach(b => b.onclick = () => usar(id, b.dataset.filHab));
  const bf = $('[data-fil-foco]', c); if (bf) bf.onclick = () => definirFoco(focoAtual() === id ? null : id);
  const bd = $('[data-fil-desconfiar]', c); if (bd) bd.onclick = () => desconfiarToken(id);
  const ba = $('[data-fil-abraco]', c); if (ba) ba.onclick = () => escolher('Abraço: cobaia agarrada', Object.keys(A().SER).filter(k => SERd(k).tipo === 'cobaia').map(k => [k, SERd(k).nome]), cob => { gravarEstado(['repert', id, cob], agora()); A().aviso(`As frases de ${SERd(cob).nome} entram no repertório.`); });
  const br = $('[data-fil-revelar]', c); if (br) br.onclick = () => { const tk = tokens()[id]; if (!tk) return; const n = { ...tk }; if (tk.rv) delete n.rv; else n.rv = chaveLugar(tk); A().definir(['tokens', id], n); };
  const be = $('[data-fil-editar]', c); if (be) be.onclick = () => { const tk = tokens()[id]; if (tk) Editor.abrir(tk.s); };
  // candelabro: tk.cd liga o estado 'candelabro' da forma; ao tirar, o motor segura o estado 'solto' por uns segundos (o 3D toca a descida)
  const bc = $('[data-fil-candelabro]', c); if (bc) bc.onclick = () => { const tk = tokens()[id]; if (!tk) return; const n = { ...tk }; if (tk.cd) delete n.cd; else n.cd = 1; A().definir(['tokens', id], n); };
  const bx = $('[data-fil-falsos]', c); if (bx) bx.onclick = () => { const tk = tokens()[id]; if (tk && tk.dc) Motor.tirarFalsos(tk.dc, 'o Mestre tirou'); };
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
      if (ok === false && p.ef === 'buscar') efTxt = 'Alguma coisa escapa da sua memória.';
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
    modal(`<p class="fil-k">${m.k === 'lembranca' ? 'UMA LEMBRANÇA' : m.k === 'esqueceu' ? 'VOCÊ ESQUECEU' : 'VOCÊ OUVE'}</p><p class="fil-voz">${esc(m.t)}</p><div class="fil-opcoes"><button class="pri" data-ok>Fechar</button></div>`, mm => { $('[data-ok]', mm).onclick = fecharModal; });
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
    if ((m.t === 'alagada' || RASTRO_CENA[m.t]) && m.c !== cena()) return;
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
  const fid = focoAtual(), f = fid && tokens()[fid], c = f && cfgTk(f), a = I().andarAtual;
  const salaRet = cn => I().retSala(cn - 25 * (a - 1));
  if (souGM()) {
    // curto-circuito (sala no escuro até o fim da cena) e rastro próprio (só Mestre e auxiliares)
    Object.keys(ef().curto || {}).forEach(k => { const cn = +k.slice(1); if (Math.ceil(cn / 25) !== a || !curtoEm(cn)) return; const r = salaRet(cn); add('cu' + k, 'fil-curto', r.x, r.y, '<span>⚡ curto</span>', r.w, r.h); });
    Object.entries(ef().mechas || {}).forEach(([tid, salas]) => { if (!tokens()[tid]) return; Object.keys(salas || {}).forEach(k => { const cn = +k.slice(1); if (Math.ceil(cn / 25) !== a) return; const r = salaRet(cn); add('me' + tid + k, 'fil-mechas', r.x, r.y, '', r.w, r.h); }); });
  }
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
    // faro de trilha: as salas por onde cada cobaia passou nos últimos minutos (a mais nova com o nome)
    if (sent(c, 'trilha')) {
      const lim = (int(c.trilhaMin) || TRILHA_MIN) * 60e3;
      cobaiasNoAndar(a).forEach(([cid], ci) => {
        const pts = Object.entries(((ef().trilha || {})[cid]) || {}).map(([k, v]) => [k, v]).filter(([, v]) => v && v.a === a && agora() - (v.ts || 0) < lim).sort((x, y) => x[1].ts - y[1].ts);
        const cor = (SERd(cid) || {}).cor || '#fff';
        pts.forEach(([k, v], i) => {
          const r = salaRet(v.cn), ult = i === pts.length - 1, ox = ((ci % 4) - 1.5) * .55, oy = (Math.floor(ci / 4) - .5) * .55;
          add('tr' + cid + k, 'fil-trilha' + (ult ? ' ult' : ''), r.x + r.w / 2 + ox, r.y + r.h / 2 + oy, `<span style="--c:${cor};opacity:${(.35 + .65 * (i + 1) / pts.length).toFixed(2)}">🐾${ult ? ' ' + esc(SERd(cid).nome) : ''}</span>`);
        });
      });
    }
    // salas que este Filho vê pelas telas, câmeras ou pelo sinal (Conectar)
    const verSalas = (sent(c, 'telas') ? ['tela'] : []).concat(sent(c, 'cameras') ? ['camera'] : []);
    const con = conectado(fid);
    if (verSalas.length || con) for (let p = 1; p <= 25; p++) { const cn = I().cnDe(a, p), t = tagsSala(cn); const ok = verSalas.some(x => t[x]) || (sent(c, 'cameras') && roboNaSala(a, p)) || (con && !escuroEm(a, cn)); if (ok) { const r = I().retSala(p); add('vs' + cn, 'fil-vesala', r.x, r.y, `<span>${con && !verSalas.some(x => t[x]) ? '🔌' : t.tela ? '📺' : '📷'}</span>`, r.w, r.h); } }
    // covil / ninho
    covis(c).forEach(cn => { if (Math.ceil(cn / 25) !== a) return; const r = I().retSala(cn - 25 * (a - 1)); add('cv' + cn, 'fil-covil', r.x, r.y, '<span>covil</span>', r.w, r.h); });
  }
  $$('.fil-sent', st).forEach(d => { if (!vivos.has(d.dataset.k)) d.remove(); });
}
function semAudicao() {
  const fid = focoAtual(); if (!fid) return '';
  const c = cfgTk(tokens()[fid]);
  return c && !sent(c, 'audicao') && !sent(c, 'audicao_precisa') ? 'Este Filho não ouve os sons: só os outros sentidos dele.' : '';
}
function linhasEscuta(atuais) {
  const fid = focoAtual(); if (!fid) return '';
  const f = tokens()[fid], c = cfgTk(f);
  let h = `<li class="fil-foco"><b>👁 Sentidos de ${esc(rotuloGM(f))}</b>: ${esc(c ? Object.keys(c.sent || {}).filter(k => c.sent[k]).map(k => NOME_SENT[k] || k).join(', ') || 'nenhum' : 'sem características')}</li>`;
  if (c && sent(c, 'maior_nex')) { const ids = maiorNex(f.a); h += `<li>☢ Maior NEX do andar: ${ids.length ? ids.map(k => esc(SERd(k).nome)).join(', ') : 'ninguém (Calculadora do Mestre vazia)'}</li>`; }
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

/* ---------- Bloco do jogador: ações na sala, lente, Flash e aviso do dia par ---------- */
// itens da ficha ativa: câmera ou celular (Flash) e câmera, celular ou visor (olhar por uma lente)
const RX_FLASH = /c[aâ]mera|celular|smartphone|telefone|polaroid/i, RX_LENTE = /c[aâ]mera|celular|smartphone|telefone|polaroid|visor|bin[oó]culo|luneta|lente/i;
function itemDe(rx) { const at = FX() && FX().ativa && FX().ativa(); if (!at) return null; const e = Object.values(at.d.itens || {}).find(it => it && rx.test(String(it.n || ''))); return e ? String(e.n) : null; }
function alternarLente() {
  const eu = A().meu, tk = tokens()[eu]; if (!tk) return A().aviso('Sua cobaia não está no mapa.');
  if (!tk.lt && !itemDe(RX_LENTE)) return A().aviso('Para olhar por uma lente, a ficha ativa precisa de uma câmera, um celular ou um visor.');
  const n = { ...tk }; if (tk.lt) delete n.lt; else n.lt = 1;
  A().definir(['tokens', eu], n);
  A().aviso(tk.lt ? 'Você abaixa a lente.' : `Você olha pela lente (${itemDe(RX_LENTE)}).`);
}
let flashCena = '';
try { flashCena = localStorage.getItem('acf-fil-flash') || ''; } catch (e) {}
function dispararFlash() {
  const l = meuLugar(); if (!l) return A().aviso('Entre numa sala para usar o Flash.');
  const it = itemDe(RX_FLASH); if (!it) return A().aviso('O Flash precisa de uma câmera ou de um celular na ficha ativa.');
  if (flashCena === cena()) return A().aviso('Esta câmera já disparou o Flash nesta cena.');
  flashCena = cena(); try { localStorage.setItem('acf-fil-flash', flashCena); } catch (e) {}
  A().Rede.push('filAcoes', { s: A().meu, t: 'flash', a: l.a, cn: l.cn, v: 0, ts: agora() }).pronto.catch(() => {});
  I().postarRolagemSecreta(`${SERd(A().meu).nome} disparou o Flash (${it}) na CN ${pad2(l.cn)}`);
  const f = document.createElement('div'); f.className = 'fil-flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 900);
  A().aviso('⚡ Flash!');
}
function desenharBlocoJogador() {
  const b = $('#blocoMinha'); if (!b) return;
  let d = $('#filJog', b);
  const eu = A().meu;
  if (!eu || souGM()) { if (d) d.remove(); return; }
  if (!d) { d = document.createElement('div'); d.id = 'filJog'; d.className = 'fil-jog-bloco'; const ref = $('#btnAbrirLoja', b); b.insertBefore(d, ref); }
  const l = meuLugar(), tk = tokens()[eu] || {};
  const dp = pub().dp ? '<p class="fil-diapar" title="Você não ouve o próprio barulho">📅 Dia par: −5 em Furtividade</p>' : '';
  const sil = chatBloqueado() ? '<p class="fil-surdo">🔇 Você não ouve nada (1 rodada).</p>' : '';
  const marcas = l ? marcasDaSala(l.cn).map(t => `<span>${MARCAS[t][0]} ${esc(MARCAS[t][1])}</span>`).join('') : '';
  const temLente = !!tk.lt || !!itemDe(RX_LENTE), temFlash = !!itemDe(RX_FLASH);
  const bt = (attr, i, t, on, dis, tit) => `<button type="button" class="fil-jb${on ? ' on' : ''}" ${attr} ${dis ? 'disabled' : ''} title="${esc(tit)}"><i aria-hidden="true">${i}</i><span>${t}</span></button>`;
  const html = `${dp}${sil}${marcas ? `<p class="fil-marcas-sala">${marcas}</p>` : ''}<div class="fil-acoes-jog n${2 + temLente + temFlash}">${bt('data-fil-ex', '🔍', 'Examinar', false, !l, 'Examinar a sala (Percepção)')}${bt('data-fil-olhar', '👀', 'Olhar', false, !l, 'Olhar ao redor (Percepção)')}${temLente ? bt('data-fil-lente', '📷', tk.lt ? 'Na lente' : 'Lente', !!tk.lt, false, 'Olhar por uma lente (câmera, celular ou visor): alguns perigos só aparecem assim') : ''}${temFlash ? bt('data-fil-flash', '⚡', 'Flash', false, !l || flashCena === cena(), 'Disparar o Flash da câmera ou do celular (1 por cena)') : ''}</div>`;
  if (d.dataset.h !== html) { d.innerHTML = html; d.dataset.h = html; $('[data-fil-ex]', d).onclick = examinar; $('[data-fil-olhar]', d).onclick = olharRedor; const bl = $('[data-fil-lente]', d); if (bl) bl.onclick = alternarLente; const bf = $('[data-fil-flash]', d); if (bf) bf.onclick = dispararFlash; }
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
  return `<div class="fil-tags">${ETIQUETAS.map(([k, i, n]) => editar ? `<label class="${chk[k] ? 'on' : ''}"><input type="checkbox" ${nomeAttr}="${k}" ${chk[k] ? 'checked' : ''}><span>${i} ${n}</span></label>` : (chk[k] ? `<span class="on">${i} ${n}</span>` : '')).join('')}</div>`;
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

/* ---------- Painel do Mestre (aba Segredos): lista compacta dos Filhos; o editor abre à parte ---------- */
let fpFiltro = '';
try { fpFiltro = sessionStorage.getItem('acf-fp-filtro') || ''; } catch (e) {}
const filhosLista = () => (A().SERES || []).filter(s => s.tipo === 'filho');
function resumoCurto(c) {
  if (!c) return '<span class="fp-vazio">sem características</span>';
  const ch = chipsDe(c).filter(x => x[0] !== '🏠'), nb = nBotoes(c);
  const vis = ch.slice(0, nb ? 3 : 4), resto = ch.length - vis.length;
  const partes = vis.map(([i, t]) => `<span><i aria-hidden="true">${i}</i>${esc(t)}</span>`);
  if (nb) partes.push(`<span><i aria-hidden="true">🔘</i>${nb} ${nb === 1 ? 'botão' : 'botões'}</span>`);
  if (resto > 0) partes.push(`<span class="fp-mais">+${resto}</span>`);
  return partes.join('');
}
function blocoMestre() {
  let b = $('#blocoFilhosM');
  if (!souMestre() || vista().aux || vista().meu) { if (b) b.hidden = true; Editor.fechar(true); return; }
  if (!b) {
    b = document.createElement('section'); b.className = 'bloco mestre-only fil-bloco'; b.id = 'blocoFilhosM'; b.dataset.aba = 'segredos';
    const ref = $('#blocoFuncoes'); ref ? ref.parentNode.insertBefore(b, ref) : $('#painel').appendChild(b);
    const abaAtual = ($('#abasMestre button.ativo') || {}).dataset; if (abaAtual && abaAtual.aba) b.classList.toggle('fora-da-aba', abaAtual.aba !== 'segredos');
  }
  b.hidden = false;
  if (b.contains(document.activeElement) && document.activeElement.matches('input, textarea, select')) return;
  const filhos = filhosLista(), tks = tokens();
  const n = filhos.filter(s => cfgDe(s.id)).length, ns = Object.values(etq().salas || {}).filter(t => t && Object.values(t).some(Boolean)).length;
  const contaMapa = {}; Object.values(tks).forEach(t => { if (t && !t.dc) contaMapa[t.s] = (contaMapa[t.s] || 0) + 1; });   // uma passada (era uma por Filho)
  const noMapa = id => contaMapa[id] || 0;
  // só tokens andaram e a contagem por Filho no mapa é a mesma: o bloco já está certo
  const chaveMapa = Object.entries(contaMapa).map(e => e.join(':')).join(',');
  if (A().soTokens && A().soTokens() && b.__mapa === chaveMapa && b.dataset.h) return;
  b.__mapa = chaveMapa;
  const elDeSer = id => { const c = cfgDe(id); return c && c.el ? c.el : ''; };
  const filtros = [['', 'Todos']].concat(ELEMENTOS.filter(e => e[0] !== 'medo').map(e => [e[0], e[2], e[1]]), [['mapa', '📍', 'No mapa']]);
  const lista = filhos.filter(s => !fpFiltro || (fpFiltro === 'mapa' ? noMapa(s.id) : elDeSer(s.id) === fpFiltro || (fpFiltro && elDeSer(s.id) === '1d4')));
  const html = `<div class="fp-topo"><h2>Filhos</h2>
      <button type="button" class="fp-ico" data-fm="etq" title="Etiquetas das salas (água, metal, tela…)" aria-label="Etiquetas das salas">🏷</button>
      <div class="fp-menu"><button type="button" class="fp-ico" data-fm="menu" aria-label="Importar ou exportar" aria-haspopup="true" title="Importar ou exportar o arquivo">⋯</button>
        <div class="fp-pop" hidden><button type="button" data-fm="importar">📥 Importar arquivo…</button><button type="button" data-fm="exportar">📤 Exportar</button><p>O arquivo (tipo planta-acf-filhos) fica fora do GitHub.</p></div>
        <input type="file" id="filArq" accept=".json,application/json" hidden></div></div>
    <p class="fp-sub">${n} de ${filhos.length} com características · ${ns} sala(s) com etiqueta</p>
    <div class="fp-filtro" role="group" aria-label="Filtrar">${filtros.map(([k, t, tit]) => `<button type="button" data-ff="${k}" class="${fpFiltro === k ? 'on' : ''}" title="${esc(tit || t)}" aria-pressed="${fpFiltro === k}">${esc(t)}</button>`).join('')}</div>
    <ul class="fp-lista">${lista.map(s => {
      const c = cfgDe(s.id), e = c && EL[c.el], nm = noMapa(s.id);
      return `<li><button type="button" class="fp-item${c ? '' : ' sem'}" data-fsel="${s.id}" style="--cor:${s.cor}" aria-label="${esc(s.codigo + ' ' + s.nome)}: editar">
        <span class="fp-cod">${esc(s.codigo)}</span><span class="fp-nome">${esc(s.nome)}${nm ? `<small title="No mapa">📍${nm}</small>` : ''}</span>
        <span class="fp-el" title="${esc(e ? e[1] : c && c.el === '1d4' ? 'Elemento rolado' : 'Sem elemento')}">${e ? e[2] : c && c.el === '1d4' ? '🎲' : ''}</span>
        <span class="fp-res">${resumoCurto(c)}</span></button></li>`;
    }).join('') || '<li class="fp-nada">Nenhum Filho neste filtro.</li>'}</ul>`;
  if (b.dataset.h !== html) {
    b.dataset.h = html; b.innerHTML = html;
    $$('[data-fsel]', b).forEach(x => x.onclick = () => Editor.abrir(x.dataset.fsel));
    $$('[data-ff]', b).forEach(x => x.onclick = () => { fpFiltro = x.dataset.ff; try { sessionStorage.setItem('acf-fp-filtro', fpFiltro); } catch (e) {} blocoMestre(); });
    const pop = $('.fp-pop', b), bm = $('[data-fm="menu"]', b);
    bm.onclick = e => { e.stopPropagation(); pop.hidden = !pop.hidden; bm.setAttribute('aria-expanded', String(!pop.hidden)); };
    $('[data-fm="etq"]', b).onclick = () => Editor.abrirEtq();
    $('[data-fm="exportar"]', b).onclick = () => { pop.hidden = true; exportar(); };
    $('[data-fm="importar"]', b).onclick = () => { pop.hidden = true; $('#filArq', b).click(); };
    $('#filArq', b).onchange = e => { const f = e.target.files[0]; if (f) importar(f); e.target.value = ''; };
  }
  Editor.atualizar();
}
document.addEventListener('click', e => { const p = $('#blocoFilhosM .fp-pop'); if (p && !p.hidden && !e.target.closest('.fp-menu')) p.hidden = true; });

/* ---------- Editor de um Filho (painel lateral no computador, tela cheia no celular) ---------- */
const ABAS_ED = [['sent', '👂', 'Sentidos', 'o que o auxiliar percebe'], ['mov', '🚶', 'Movimento', 'como anda no mapa'], ['rastro', '👣', 'Rastro', 'rastro, avisos e ocultação'], ['hab', '🔘', 'Botões', 'botões do auxiliar e passivos'], ['covil', '🏠', 'Covil', 'covil, enigma e notas'], ['avanc', '⚙', 'Avançado', 'elemento, forma rolada e 3D']];
const Editor = {
  ser: '', aba: 'sent', modo: '', dicas: false, etqA: 1, etqTag: 'agua', sug: null,
  abrir(ser) { this.ser = ser; this.modo = 'filho'; this.render(true); },
  abrirEtq() { this.modo = 'etq'; this.etqA = I().andarAtual || 1; this.sug = null; this.render(true); },
  fechar(silencioso) { const w = $('#filEd'); if (w) w.remove(); this.modo = ''; document.documentElement.classList.remove('fe-aberto'); if (!silencioso) { const b = $('#blocoFilhosM'); if (b) b.dataset.h = ''; } },
  atualizar() { if (this.modo && souMestre()) this.render(false); },
  render(forcar) {
    let w = $('#filEd');
    if (!this.modo) { if (w) w.remove(); return; }
    if (w && !forcar && w.contains(document.activeElement) && document.activeElement.matches('input, textarea, select')) return;
    const html = this.modo === 'etq' ? this.htmlEtq() : this.htmlFilho();
    if (!w) {
      w = document.createElement('div'); w.id = 'filEd'; w.className = 'fe-wrap';
      w.innerHTML = '<div class="fe-fundo" data-fe="fundo"></div><aside class="fe" role="dialog" aria-modal="true"></aside>';
      document.body.appendChild(w); document.documentElement.classList.add('fe-aberto');
      w.addEventListener('keydown', e => { if (e.key === 'Escape') this.fechar(); });
      this.ligarFixos(w);
    }
    const as = $('.fe', w);
    if (as.dataset.h === html) return;
    const rol = $('.fe-corpo', as), y = rol ? rol.scrollTop : 0, mesmo = as.dataset.k === this.modo + this.ser + this.aba;
    as.dataset.h = html; as.dataset.k = this.modo + this.ser + this.aba; as.innerHTML = html;
    if (mesmo && $('.fe-corpo', as)) $('.fe-corpo', as).scrollTop = y;
    this.ligar(as);
    if (forcar) { const f = $('[data-fe="fechar"]', as); if (f) f.focus({ preventScroll: true }); }
  },
  // segurar um chip mostra a descrição (sem ligar nem desligar)
  ligarFixos(w) {
    let tm = null, segurou = false;
    w.addEventListener('pointerdown', e => { const ch = e.target.closest('[data-d]'); if (!ch) return; segurou = false; clearTimeout(tm); tm = setTimeout(() => { segurou = true; this.dica(ch.dataset.d, ch); }, 450); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => w.addEventListener(t, () => clearTimeout(tm)));
    w.addEventListener('click', e => { if (segurou && e.target.closest('[data-d]')) { e.stopPropagation(); e.preventDefault(); segurou = false; } }, true);
    w.addEventListener('contextmenu', e => { if (e.target.closest('[data-d]')) e.preventDefault(); });
  },
  dica(txt, ch) { const d = $('#filEd .fe-dica'); if (!d) return; d.innerHTML = `<b>${esc((ch && ch.dataset.n) || '')}</b> ${esc(txt)}`; d.hidden = false; clearTimeout(this._td); this._td = setTimeout(() => { d.hidden = true; }, 5000); },
  htmlFilho() {
    const s = SERd(this.ser) || {}, c = cfgDe(this.ser) || {}, e = EL[c.el];
    const lista = filhosLista(), i = lista.findIndex(x => x.id === this.ser);
    const cab = `<header class="fe-cab" style="--cor:${s.cor || '#888'}">
      <button type="button" class="fe-ico" data-fe="fechar" aria-label="Fechar o editor">✕</button>
      <div class="fe-tit"><span class="fe-cod">${esc(s.codigo || '')}</span><h3>${esc(s.nome || '')}</h3>${e ? `<span class="fe-elb" style="--el:${e[3]}">${e[2]} ${esc(e[1])}</span>` : c.el === '1d4' ? '<span class="fe-elb">🎲 rolado</span>' : ''}</div>
      <button type="button" class="fe-ico" data-fe="ant" aria-label="Filho anterior" ${i <= 0 ? 'disabled' : ''}>‹</button><button type="button" class="fe-ico" data-fe="prox" aria-label="Próximo Filho" ${i >= lista.length - 1 ? 'disabled' : ''}>›</button></header>`;
    const res = `<div class="fe-resumo">${htmlChips(chipsDe(c), 0, 'fc-chips') || '<span class="fp-vazio">Nada ligado ainda. Toque nas opções abaixo.</span>'}</div>`;
    const abas = `<nav class="fe-abas" role="tablist">${ABAS_ED.map(([k, ic, t]) => `<button type="button" role="tab" data-fa="${k}" aria-selected="${this.aba === k}" class="${this.aba === k ? 'on' : ''}"><i aria-hidden="true">${ic}</i><span>${t}</span>${this.contAba(k, c) ? `<b>${this.contAba(k, c)}</b>` : ''}</button>`).join('')}</nav>`;
    const a = ABAS_ED.find(x => x[0] === this.aba) || ABAS_ED[0];
    return `${cab}${res}${abas}<div class="fe-corpo${this.dicas ? ' com-dicas' : ''}" role="tabpanel"><div class="fe-sec-cab"><h4>${a[2]}</h4><span>${a[3]}</span><button type="button" class="fe-q${this.dicas ? ' on' : ''}" data-fe="dicas" aria-pressed="${this.dicas}" title="Mostrar ou esconder as descrições (ou segure uma opção)">?</button></div>${this['aba_' + this.aba](c)}</div><div class="fe-dica" hidden></div>`;
  },
  contAba(k, c) {
    const nn = o => Object.values(o || {}).filter(Boolean).length;
    if (k === 'sent') return nn(c.sent);
    if (k === 'mov') return nn(c.movx) + (c.mov && c.mov !== 'normal' ? 1 : 0);
    if (k === 'rastro') return nn(c.avisos) + (c.rastro ? 1 : 0) + (c.ocult ? 1 : 0);
    if (k === 'hab') return nn(c.hab) + nn(c.pass);
    if (k === 'covil') return covis(c).length + (((A().segredos._filhos || {})[this.ser] || {}).enigma ? 1 : 0);
    return 0;
  },
  // chips liga/desliga (data-tg = caminho booleano) e de escolha única (data-rd = caminho, data-v = valor)
  chips(itens, cam, obj) { return `<div class="fe-chips">${itens.map(([k, n, d, i]) => { const on = !!(obj && obj[k]); return `<button type="button" class="fe-chip${on ? ' on' : ''}" data-tg="${cam}.${k}" aria-pressed="${on}" data-d="${esc(d || '')}" data-n="${esc(n)}" title="${esc(d || '')}"><i aria-hidden="true">${i}</i><span>${esc(n)}</span><small>${esc(d || '')}</small></button>`; }).join('')}</div>`; },
  radio(itens, cam, atual) { return `<div class="fe-chips fe-radio" role="radiogroup">${itens.map(([k, n, d, i]) => { const on = (atual || '') === k; return `<button type="button" role="radio" class="fe-chip${on ? ' on' : ''}" data-rd="${cam}" data-v="${esc(k)}" aria-checked="${on}" data-d="${esc(d || '')}" data-n="${esc(n)}" title="${esc(d || '')}"><i aria-hidden="true">${i}</i><span>${esc(n)}</span><small>${esc(d || '')}</small></button>`; }).join('')}</div>`; },
  campo(rot, cam, v, tipo, ph) { return `<label class="fe-campo"><span>${esc(rot)}</span><input ${tipo === 'n' ? 'type="number" inputmode="numeric"' : ''} data-fc="${cam}" value="${esc(v == null ? '' : v)}" placeholder="${esc(ph || '')}"></label>`; },
  serSel(rot, cam, v) { return `<label class="fe-campo"><span>${esc(rot)}</span><select data-fc="${cam}"><option value="">o mesmo</option>${filhosLista().map(s => `<option value="${s.id}" ${v === s.id ? 'selected' : ''}>${esc(s.codigo + ' ' + s.nome)}</option>`).join('')}</select></label>`; },
  grupo(t, h) { return `<div class="fe-grupo"><p class="fe-gt">${t}</p>${h}</div>`; },
  aba_sent(c) {
    let h = this.chips(SENTIDOS, 'sent', c.sent);
    const f = [];
    if (sent(c, 'audicao') || sent(c, 'audicao_agua')) f.push(this.campo('Alcance da audição (m)', 'alcAud', c.alcAud, 'n', String(ALC_LONGO)));
    if (sent(c, 'trilha')) f.push(this.campo('Faro de trilha: minutos', 'trilhaMin', c.trilhaMin, 'n', String(TRILHA_MIN)));
    if (f.length) h += `<div class="fe-campos">${f.join('')}</div>`;
    return h;
  },
  aba_mov(c) {
    return this.grupo('Tipo', this.radio(MOVS, 'mov', c.mov || 'normal')) + this.grupo('Modificadores', this.chips(MODS, 'movx', c.movx));
  },
  aba_rastro(c) {
    let h = this.grupo('Rastro para os jogadores', this.radio([['', 'Nenhum', 'não deixa marca', '·']].concat(Object.entries(RASTROS).map(([k, n]) => [k, n, RASTRO_CENA[k] ? 'a sala que ele deixou fica marcada até o fim da cena' : 'as duas salas ficam marcadas por alguns minutos', MARCAS[k][0]])), 'rastro', c.rastro || ''));
    if (c.rastro && !RASTRO_CENA[c.rastro]) h += `<div class="fe-campos">${this.campo('Minutos do rastro', 'rastroMin', c.rastroMin, 'n', String(RASTRO_MIN))}</div>`;
    h += this.grupo('Avisos ao se mover', this.chips(AVISOS, 'avisos', c.avisos));
    h += this.grupo('Ocultação especial', this.radio(OCULT, 'ocult', c.ocult || ''));
    const f = [];
    if (c.ocult === 'teto') f.push(this.campo('DT de Examinar a sala', 'examinarDT', c.examinarDT, 'n', 'você decide'));
    if (c.ocult === 'sempre') f.push(this.campo('DT de Olhar ao redor', 'olharDT', c.olharDT, 'n', 'você decide'));
    if (f.length) h += `<div class="fe-campos">${f.join('')}</div>`;
    return h;
  },
  aba_hab(c) {
    const itens = Object.entries(HABS).map(([k, x]) => [k, x.n + (x.lim === 'cena' ? ' · 1/cena' : x.lim === 'rodadas3' ? ' · 3 rod.' : ''), x.d, x.i]);
    let h = this.grupo('Botões', this.chips(itens, 'hab', c.hab));
    const f = [];
    if (hab(c, 'bando')) f.push(this.serSel('Bando: Filho', 'bando.ser', (c.bando || {}).ser), this.campo('Bando: dado', 'bando.dado', (c.bando || {}).dado || '1d4'));
    if (hab(c, 'ninhada')) f.push(this.serSel('Ninhada: Filho', 'ninhada.ser', (c.ninhada || {}).ser), this.campo('Ninhada: dado', 'ninhada.dado', (c.ninhada || {}).dado || '1d4'));
    if (hab(c, 'postura')) f.push(this.serSel('Postura: cria', 'postura.ser', (c.postura || {}).ser), this.campo('Postura: dado', 'postura.dado', (c.postura || {}).dado || '1d4+2'));
    if (hab(c, 'fios')) f.push(this.campo('DT de Puxar os fios', 'fiosDT', c.fiosDT, 'n', 'pergunta na hora'));
    if (hab(c, 'teia')) f.push(this.campo('DT da Teia (Reflexos)', 'teiaDT', c.teiaDT, 'n', 'você decide'));
    if (hab(c, 'coracao')) f.push(this.campo('DT de Ouvir o Coração', 'coracaoDT', c.coracaoDT, 'n'));
    if (hab(c, 'buscar')) f.push(this.campo('DT de Buscar (Vontade)', 'buscarDT', c.buscarDT, 'n', 'pergunta na hora'));
    if (hab(c, 'fiacao')) f.push(`<label class="fe-campo"><span>Pela fiação: salas de</span><select data-fc="fiacaoEl">${ELEMENTOS.map(e => `<option value="${e[0]}" ${(c.fiacaoEl || 'energia') === e[0] ? 'selected' : ''}>${e[2]} ${e[1]}</option>`).join('')}</select></label>`);
    if (hab(c, 'copiar')) f.push(this.campo('Desconfiar: rolagem do Filho', 'desconfiar', c.desconfiar, '', 'ex.: 2d20+10'), `<label class="fe-campo"><span>Detalhe da cópia</span><select data-fc="detalhe">${DETALHES.map(([k, t]) => `<option value="${k}" ${(c.detalhe || '') === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`);
    if (f.length) h += `<div class="fe-campos">${f.join('')}</div>`;
    if (hab(c, 'lembranca')) h += `<label class="fe-campo fe-largo"><span>Lembranças (uma por linha; o auxiliar escolhe)</span><textarea data-fc="lembrancas" rows="3">${esc(c.lembrancas || '')}</textarea></label>`;
    h += this.grupo('Passivos', this.chips(PASSIVOS, 'pass', c.pass));
    if (pas(c, 'interferencia')) h += `<div class="fe-campos">${this.campo('Interferência: DT de Percepção', 'interfDT', c.interfDT, 'n', 'você decide')}</div>`;
    return h;
  },
  aba_covil(c) {
    const enig = ((A().segredos._filhos || {})[this.ser] || {}).enigma || '';
    return `<div class="fe-campos">${this.campo('Covil (CN, separados por vírgula)', 'covil', c.covil, '', 'ex.: 61, 31')}</div>
      <label class="fe-campo fe-largo"><span>🔐 Enigma: a fraqueza (só você vê)</span><textarea id="filEnigma" rows="4">${esc(enig)}</textarea></label>
      <label class="fe-campo fe-largo"><span>Notas (Mestre e auxiliares)</span><textarea data-fc="nota" rows="4">${esc(c.nota || '')}</textarea></label>`;
  },
  aba_avanc(c) {
    let h = this.grupo('Elemento', this.radio(ELEMENTOS.map(e => [e[0], e[1], e[0] === 'medo' ? '' : 'rota de fuga: salas de ' + EL[FUGA[e[0]]][1], e[2]]).concat([['1d4', 'Rolado', 'o elemento sai na rolagem da invocação', '🎲']]), 'el', c.el || ''));
    const r = c.rolagem;
    h += this.grupo('Forma rolada na invocação', `<div class="fe-chips"><button type="button" class="fe-chip${r ? ' on' : ''}" data-fe="rolagem" aria-pressed="${!!r}" data-n="Forma rolada" data-d="Na invocação, a tela do Mestre rola o dado, grava a forma e troca a imagem e o modelo. O auxiliar não escolhe." title="Na invocação, a tela do Mestre rola o dado, grava a forma e troca a imagem e o modelo. O auxiliar não escolhe."><i aria-hidden="true">🎲</i><span>Rolar a forma</span><small>na invocação, a tela do Mestre rola e grava</small></button></div>`);
    if (r) {
      const ops = r.ops || {};
      h += `<div class="fe-campos">${this.campo('Dado', 'rolagem.dado', r.dado || '1d4')}</div><div class="fe-formas">${[1, 2, 3, 4, 5, 6].filter(n => n <= (parseInt(String(r.dado || '1d4').split('d')[1], 10) || 4)).map(n => {
        const o = ops[n] || {}, pf = (c.porForma || {})[o.el] || {};
        return `<div class="fe-forma"><b>${n}</b><select data-fc="rolagem.ops.${n}.el" aria-label="Elemento da face ${n}"><option value="">elemento…</option>${ELEMENTOS.map(e => `<option value="${e[0]}" ${o.el === e[0] ? 'selected' : ''}>${e[2]} ${e[1]}</option>`).join('')}</select><input data-fc="rolagem.ops.${n}.forma" value="${esc(o.forma || '')}" placeholder="forma 3D" aria-label="Forma 3D da face ${n}">
          ${o.el ? `<details><summary>Comportamento desta forma (PROPOSTA) ${Object.values(pf.sent || {}).filter(Boolean).length + Object.values(pf.movx || {}).filter(Boolean).length ? '· ' + (Object.values(pf.sent || {}).filter(Boolean).length + Object.values(pf.movx || {}).filter(Boolean).length) + ' ligado(s)' : ''}</summary>${this.chips(SENTIDOS, 'porForma.' + o.el + '.sent', pf.sent)}${this.chips(MODS, 'porForma.' + o.el + '.movx', pf.movx)}</details>` : ''}</div>`;
      }).join('')}</div>`;
    }
    const st = c.st3d || {};
    h += `<details class="fe-grupo fe-det"${Object.keys(st).length ? ' open' : ''}><summary class="fe-gt">Estados do modelo 3D</summary><p class="fe-nota">Nome do estado da forma (comentário do topo do arquivo dela) em cada momento. Vazio: não muda.</p><div class="fe-campos">${MOMENTOS3D.map(([k, t]) => this.campo(t, 'st3d.' + k, st[k], '', '')).join('')}</div></details>`;
    return h;
  },
  htmlEtq() {
    const a = this.etqA, tg = this.etqTag, T = ETIQUETAS.find(x => x[0] === tg) || ETIQUETAS[0];
    const ret = []; for (let p = 1; p <= 25; p++) ret.push([p, I().retSala(p)]);
    const xs = [...new Set(ret.map(([, r]) => Math.round(r.x)))].sort((u, v) => u - v), ys = [...new Set(ret.map(([, r]) => Math.round(r.y)))].sort((u, v) => u - v);
    const sug = this.sug && this.sug.a === a ? this.sug : null;
    const tiles = ret.map(([p, r]) => {
      const cn = I().cnDe(a, p), t = tagsSala(cn), on = !!t[tg], prop = sug && (sug.lista[cn] || []).length;
      const ics = ETIQUETAS.filter(([k]) => t[k]).map(([, i]) => i).join('');
      const nome = A().nomeSala(cn);
      return `<button type="button" class="fe-sala${on ? ' on' : ''}${prop ? ' sug' : ''}" data-sala="${cn}" style="grid-column:${xs.indexOf(Math.round(r.x)) + 1};grid-row:${ys.indexOf(Math.round(r.y)) + 1}" aria-pressed="${on}" title="${esc(nome)}${prop ? ' · sugestão: ' + sug.lista[cn].map(k => ETIQUETAS.find(x => x[0] === k)[2]).join(', ') : ''}"><b>${pad2(cn)}</b><span>${ics || '&nbsp;'}</span>${prop ? `<em>${sug.lista[cn].map(k => ETIQUETAS.find(x => x[0] === k)[1]).join('')}</em>` : ''}</button>`;
    }).join('');
    const nSug = sug ? Object.values(sug.lista).reduce((s2, l) => s2 + l.length, 0) : 0;
    return `<header class="fe-cab"><button type="button" class="fe-ico" data-fe="fechar" aria-label="Fechar">✕</button><div class="fe-tit"><span class="fe-cod">🏷</span><h3>Etiquetas das salas</h3></div></header>
      <div class="fe-corpo">
        <div class="fe-andares" role="tablist" aria-label="Andar">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="tab" data-ea="${n}" aria-selected="${n === a}" class="${n === a ? 'on' : ''}">${n}º</button>`).join('')}</div>
        <div class="fe-chips fe-radio fe-paleta" role="radiogroup" aria-label="Etiqueta">${ETIQUETAS.map(([k, i, n]) => `<button type="button" role="radio" class="fe-chip${k === tg ? ' on' : ''}" data-et="${k}" aria-checked="${k === tg}"><i aria-hidden="true">${i}</i><span>${n}</span></button>`).join('')}</div>
        <p class="fe-nota">Toque numa sala para pôr ou tirar <b>${T[1]} ${T[2]}</b>. Corredores: no cartão de cada corredor.</p>
        <div class="fe-grade">${tiles}</div>
        <div class="fe-sug">${sug ? (nSug ? `<p>✨ ${nSug} sugestão(ões) neste andar (borda tracejada): ${['tela', 'camera', 'escura'].map(k => { const l = Object.entries(sug.lista).filter(([, v]) => v.includes(k)).map(([cn]) => pad2(cn)); return l.length ? `${ETIQUETAS.find(x => x[0] === k)[1]} ${l.join(', ')}` : ''; }).filter(Boolean).join(' · ')}</p><div class="fe-linha"><button type="button" class="pri" data-fe="aceitar">Aceitar todas</button><button type="button" data-fe="descartar">Descartar</button></div>` : `<p>✨ Nenhuma sugestão nova neste andar.</p><div class="fe-linha"><button type="button" data-fe="descartar">Fechar</button></div>`) : `<button type="button" data-fe="sugerir" title="Procura monitores, TVs e câmeras nas cenas 3D e salas no escuro ou sem sinal">✨ Sugerir 📺 tela, 📷 câmera e 🌑 escura</button>`}</div>
      </div>`;
  },
  // propostas: tela e câmera pelos itens das cenas 3D (monitor, TV, câmera, vídeo) e pelas câmeras de segurança; escura pela luz, apagão e sinal
  sugerir(a) {
    const RX_TELA = /(^|_)(tv|crt|telao|telas?|monitor|terminal)(_|$)/, RX_CAM = /(^|_)camera(_|$)/;
    const cams = (est().cameras && typeof est().cameras === 'object') ? est().cameras : { c2: {}, c75: {} };
    const alvosCam = new Set();
    Object.entries(cams).forEach(([k, v]) => { if (!/^c\d+$/.test(k) || !v) return; const cn = +k.slice(1); const l = String(v.alvos || '').split(/[^0-9]+/).map(int).filter(Boolean); (l.length ? l : (() => { const p = cn - 25 * (Math.ceil(cn / 25) - 1); return vizinhas(p).map(q => I().cnDe(Math.ceil(cn / 25), q)); })()).forEach(x => alvosCam.add(x)); });
    const lista = {};
    for (let p = 1; p <= 25; p++) {
      const cn = I().cnDe(a, p), t = tagsSala(cn), cena3 = ((A().segredos || {})._3d || {})['c' + cn] || {}, itens = cena3.itens || [], out = [];
      if (!t.tela && (itens.some(it => it && (RX_TELA.test(String(it.t || '')) || it.int === 'video')) || cams['c' + cn])) out.push('tela');
      if (!t.camera && (itens.some(it => it && RX_CAM.test(String(it.t || ''))) || alvosCam.has(cn))) out.push('camera');
      const amb = cena3.amb && typeof cena3.amb.i === 'number' ? cena3.amb.i : 1;
      if (!t.escura && ((est().luz || {})['c' + cn] === 'off' || ((A().segredos || {})._semSinal || {})['c' + cn] || amb <= .12)) out.push('escura');
      if (out.length) lista[cn] = out;
    }
    return { a, lista };
  },
  ligar(as) {
    const gravar = (cam, v) => I().Priv.gravar(['filhos', this.ser].concat(cam), v);
    $$('[data-fe="fechar"]', as).forEach(x => x.onclick = () => this.fechar());
    const fundo = $('#filEd .fe-fundo'); if (fundo) fundo.onclick = () => this.fechar();
    const lista = filhosLista(), i = lista.findIndex(x => x.id === this.ser);
    const ba = $('[data-fe="ant"]', as); if (ba) ba.onclick = () => { if (i > 0) this.abrir(lista[i - 1].id); };
    const bp = $('[data-fe="prox"]', as); if (bp) bp.onclick = () => { if (i < lista.length - 1) this.abrir(lista[i + 1].id); };
    $$('[data-fa]', as).forEach(x => x.onclick = () => { this.aba = x.dataset.fa; this.render(true); const c = $('#filEd .fe-corpo'); if (c) c.scrollTop = 0; });
    const bq = $('[data-fe="dicas"]', as); if (bq) bq.onclick = () => { this.dicas = !this.dicas; this.render(true); };
    $$('[data-tg]', as).forEach(x => x.onclick = () => { const on = x.getAttribute('aria-pressed') !== 'true'; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); gravar(x.dataset.tg.split('.'), on || null); });
    $$('[data-rd]', as).forEach(x => x.onclick = () => { const v = x.dataset.v; gravar(x.dataset.rd.split('.'), v === '' || (x.dataset.rd === 'mov' && v === 'normal') ? null : v); });
    $$('[data-fc]', as).forEach(x => x.onchange = () => {
      const cam = x.dataset.fc.split('.');
      let v = x.type === 'number' ? (x.value === '' ? null : +x.value) : (x.value.trim() || null);
      if (cam[0] === 'fiacaoEl' && v === 'energia') v = null;
      gravar(cam, v);
    });
    const br = $('[data-fe="rolagem"]', as); if (br) br.onclick = () => { const c = cfgDe(this.ser) || {}; gravar(['rolagem'], c.rolagem ? null : { dado: '1d4' }); };
    const en = $('#filEnigma', as); if (en) en.onchange = e => A().gravarSegredo(['_filhos', this.ser, 'enigma'], e.target.value.trim() || null);
    // etiquetas
    $$('[data-ea]', as).forEach(x => x.onclick = () => { this.etqA = +x.dataset.ea; this.render(true); });
    $$('[data-et]', as).forEach(x => x.onclick = () => { this.etqTag = x.dataset.et; this.render(true); });
    $$('[data-sala]', as).forEach(x => x.onclick = () => { const cn = +x.dataset.sala, on = !tagsSala(cn)[this.etqTag]; x.classList.toggle('on', on); I().Priv.gravar(['etiquetas', 'salas', 'c' + cn, this.etqTag], on || null); });
    const bs = $('[data-fe="sugerir"]', as); if (bs) bs.onclick = () => { this.sug = this.sugerir(this.etqA); this.render(true); };
    const bac = $('[data-fe="aceitar"]', as); if (bac) bac.onclick = () => { const s2 = this.sug; if (!s2) return; Object.entries(s2.lista).forEach(([cn, ks]) => ks.forEach(k => I().Priv.gravar(['etiquetas', 'salas', 'c' + cn, k], true))); A().aviso('Etiquetas sugeridas gravadas.'); this.sug = null; setTimeout(() => this.render(true), 250); };
    const bd = $('[data-fe="descartar"]', as); if (bd) bd.onclick = () => { this.sug = null; this.render(true); };
  },
};
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
    setTimeout(() => Editor.render(true), 400);
  };
  r.readAsText(arq);
}

/* =========================================================
   MOTOR (roda só na tela do Mestre): rastros, avisos, ocultação especial,
   teias, estudo da Forma de Objeto, Examinar/Olhar dos jogadores, dia par.
   Como o robô dos auxiliares, depende da tela do Mestre aberta.
   ========================================================= */
const Motor = {
  ant: {}, antCob: {}, atk: {}, cdAnt: {}, desceu: {}, cenaAnt: null, limpo: 0, vistasAcoes: new Set(), respVistas: new Set(), barulho: {}, visJ: {}, movTs: {},
  rodar() {
    if (!souMestre() || I().espiar || !I().Priv.pronto) return;
    const tks = tokens(), c0 = cena();
    if (this.cenaAnt === null) this.cenaAnt = c0;
    // 1. Filhos: mudança de lugar, ocultação especial, publicar pedidos do auxiliar
    Object.entries(tks).forEach(([id, tk]) => {
      if (!ehFilho(tk) || !tk.a) return;
      if (tk.dc) { this.falso(id, tk); return; }
      const c = cfgTk(tk), lugar = chaveLugar(tk), ant = this.ant[id];
      if (ant && (ant.a !== tk.a || ant.l !== lugar)) this.moveu(id, tk, ant, c);
      if (ant && (ant.x !== tk.x || ant.y !== tk.y)) this.movTs[id] = agora();
      this.ant[id] = { a: tk.a, l: lugar, x: tk.x, y: tk.y, p: salaP(tk), ci: corrTk(tk) };
      // único no mapa: o repetido sai
      if (c && pas(c, 'unico')) { const outro = Object.entries(tks).find(([k, t]) => k !== id && t && t.s === tk.s && !t.dc && (t.n || 1) < (tk.n || 1)); if (outro) { A().definir(['tokens', id], null); A().alertaMestre(`${rotuloGM(tk)}: só um no mapa. O repetido saiu.`); return; } }
      const n = { ...tk };
      // forma rolada na invocação (o auxiliar não escolhe)
      if (c && c.rolagem && !n.el) this.rolarForma(id, n, c);
      if (n.rv && n.rv !== lugar) delete n.rv;
      // ataque (Controle) revela a ocultação especial nesta sala; o primeiro estado visto só é anotado
      const fts = tk.fx && tk.fx.t === 'atk' ? tk.fx.ts || 0 : 0;
      if (this.atk[id] === undefined) this.atk[id] = fts;
      else if (fts > this.atk[id]) { this.atk[id] = fts; if (c && c.ocult && c.ocult !== 'pisca' && c.ocult !== 'lente') n.rv = lugar; if (c && pas(c, 'amigavel')) gravarEstado(['atacou', id], fts); delete n.cd; }
      // saiu do disfarce de candelabro (botão ou ataque): o estado 'solto' vale por uns segundos para o 3D tocar a descida
      if (this.cdAnt[id] && !n.cd) this.desceu[id] = agora();
      this.cdAnt[id] = !!n.cd;
      const oc = !!c && !n.fo && ((c.ocult === 'teto' || c.ocult === 'sempre') ? n.rv !== lugar : c.ocult === 'parede' ? !!(cnTk(tk) && tagsSala(cnTk(tk)).quadros) && n.rv !== lugar : false);
      if (oc) n.oc = 1; else delete n.oc;
      if (c && c.ocult === 'pisca') n.pi = 1; else delete n.pi;
      if (c && c.ocult === 'lente') n.ln = 1; else delete n.ln;
      if (n.fl && !flashAtivo(n)) delete n.fl;
      if (c && pas(c, 'amigavel') && !n.h && !(ef().atacou || {})[id]) n.am = 1; else delete n.am;
      if (n.pp) delete n.pp;
      // revelado aos jogadores agora (o 3D toca a animação de revelação)
      const vj = !n.h && !n.oc && !n.fo && !n.pp && !lenteOculto(n);
      if (this.visJ[id] === false && vj) n.rvt = agora();
      this.visJ[id] = vj;
      // estado do modelo 3D (nomes da forma, nos dados do Mestre)
      const st = this.estado3d(id, n, c);
      if (st) n.st = st; else delete n.st;
      // token no caminho errado (o auxiliar não move entre o público e o privado): a tela do Mestre corrige
      const St = I().Store, naPub = !!(St.pub && St.pub.tokens && St.pub.tokens[id]), naPriv = !!(St.privTok && St.privTok[id]);
      const errado = A().firebase && (I().ehPrivado(n) ? naPub : (naPriv && !naPub));
      if (errado || JSON.stringify(n) !== JSON.stringify(tk)) A().definir(['tokens', id], n);
      if (c && pas(c, 'interferencia')) this.interferencia(id, n, c, vj);
    });
    // 2. cobaias: teias, "você se sente observado", quem viu quem, faro de trilha
    const trilha = Object.values(cfgs()).some(c => c && (sent(c, 'trilha') || Object.values(c.porForma || {}).some(pf => pf && pf.sent && pf.sent.trilha)));
    Object.entries(tks).forEach(([id, tk]) => {
      if (!ehCobaia(tk) || !tk.a) return;
      const lugar = chaveLugar(tk), ant = this.antCob[id];
      this.antCob[id] = lugar;
      if (ant === undefined || ant === lugar) return;
      const teia = (ef().teias || {})[lugar];
      if (teia && /^a\d+k\d+$/.test(lugar)) this.teia(id, tk, lugar, teia);
      this.observado([id], tk.a, salaP(tk));
      const p = salaP(tk);
      if (trilha && p) gravarEstado(['trilha', id, 't' + agora().toString(36)], { a: tk.a, cn: I().cnDe(tk.a, p), ts: agora() });
    });
    // quem viu cada Filho revelado (Lembrança)
    Object.entries(tks).forEach(([id, tk]) => {
      if (!ehFilho(tk) || tk.h || tk.oc || tk.fo || tk.dc || !hab(cfgTk(tk), 'lembranca')) return;
      const p = salaP(tk); if (!p) return;
      cobaiasNoAndar(tk.a).forEach(([cid, t]) => { if (salaP(t) === p && !((ef().viu || {})[id] || {})[cid]) gravarEstado(['viu', id, cid], agora()); });
    });
    // imagens falsas (interferência): somem quando uma cobaia entra na sala delas
    Object.entries(tks).forEach(([id, tk]) => {
      if (!tk || !tk.dc || !ehFilho(tk)) return; const p = salaP(tk); if (!p) return;
      const quem = cobaiasNoAndar(tk.a).find(([, t]) => salaP(t) === p);
      if (quem) { A().definir(['tokens', id], null); logFilhos(`${rotuloGM(tk)}: a imagem falsa sumiu quando ${SERd(quem[0]).nome} chegou perto`); }
    });
    // 3. estudo da Forma de Objeto: a cena inteira na mesma sala que a cobaia
    if (c0 !== this.cenaAnt) { this.novaCena(this.cenaAnt, c0); this.cenaAnt = c0; }
    Object.entries(tks).forEach(([id, tk]) => {
      if (!ehFilho(tk) || tk.dc || !hab(cfgTk(tk), 'estudar')) return;
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
      if (!ehFilho(tk) || tk.dc || !sent(cfgTk(tk), 'audicao_precisa')) return;
      const alto = grupos.some(gr => gr.a === tk.a && gr.p && I().nivelDe(semSilenciados(gr.ids).length + (gr.extra || 0)) >= 3);
      const db = (ef().dobro || {})[id];
      if (alto && !(db && db.r >= rodada() + 1 && agora() - (db.ts || 0) < 60000)) gravarEstado(['dobro', id], { r: rodada() + 1, ts: agora() });
    });
    // 4. publicações: dia par, números públicos (Examinar, Desconfiar), barulho de quem se esconde em sala barulhenta, distância falsa
    const d = (est().ruido || {}).d || 1;
    const dp = d % 2 === 0 && Object.values(tks).some(t => ehFilho(t) && !t.dc && mod(cfgTk(t), 'diaPar')) ? 1 : null;
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
    const df = {};
    if (P().on) Object.values(tks).forEach(t => { if (!ehFilho(t) || t.dc || !pas(cfgTk(t), 'distFalsa')) return; const p = salaP(t); if (!p) return; [p].concat(vizinhas(p)).forEach(q => { df['c' + I().cnDe(t.a, q)] = 1; }); });
    if (JSON.stringify(pub().df || {}) !== JSON.stringify(df)) gravarPub(['df'], Object.keys(df).length ? df : null);
    // curto-circuito: a sala fica no escuro e sem sinal até o fim da cena (e volta como estava)
    Object.entries(ef().curto || {}).forEach(([k, v]) => {
      if (!v) return;
      if (v.c !== c0) { if (v.ap) { A().definir(['luz', k], v.pl || null); A().gravarSegredo(['_semSinal', k], v.ps ? true : null); } gravarEstado(['curto', k], null); return; }
      if (!v.ap) { const pl = (est().luz || {})[k] || '', ps = !!((A().segredos._semSinal || {})[k]); A().definir(['luz', k], 'off'); A().gravarSegredo(['_semSinal', k], true); gravarEstado(['curto', k], { ...v, ap: 1, pl, ps: ps ? 1 : 0 }); A().alertaMestre(`⚡ Curto-circuito na CN ${pad2(+k.slice(1))}: escuro e sem sinal até o fim da cena.`); }
    });
    // sem sinal (segredo do Mestre) espelhado para os auxiliares: o "só no escuro" precisa saber
    const ss = Object.fromEntries(Object.keys(A().segredos._semSinal || {}).filter(k => (A().segredos._semSinal || {})[k]).map(k => [k, true]));
    if (JSON.stringify(ef().semSinal || {}) !== JSON.stringify(ss)) gravarEstado(['semSinal'], Object.keys(ss).length ? ss : null);
    if (agora() - this.limpo > 15000) { this.limpo = agora(); this.limpar(); }
  },
  rolarForma(id, n, c) {
    const r = rolar(c.rolagem.dado || '1d4'), ops = c.rolagem.ops || {}, o = ops[r.total] || ops[String(r.total)] || {};
    n.fz = r.total; if (o.el) n.el = o.el; else n.el = 'f' + r.total;
    if (o.forma) n.fm = String(o.forma).slice(0, 40);
    const nomeEl = (EL[o.el] || [, 'face ' + r.total])[1];
    logFilhos(`${rotuloGM(n)}: ${c.rolagem.dado || '1d4'} = ${r.total} → forma de ${nomeEl}`);
    A().alertaMestre(`🎲 ${rotuloGM(n)} entrou: ${c.rolagem.dado || '1d4'} = ${r.total}, forma de ${nomeEl}.`);
  },
  estado3d(id, n, c) {
    if (n.cd) return 'candelabro';
    if (this.desceu[id] && agora() - this.desceu[id] < 8000) return 'solto';
    const st = c && c.st3d; if (!st || typeof st !== 'object') return '';
    if (st.flash && flashAtivo(n)) return st.flash;
    if (st.conectar && conectado(id)) return st.conectar;
    if (st.transmissao && ativoAte((ef().trans || {})[id], 30000)) return st.transmissao;
    if (st.anda && agora() - (this.movTs[id] || 0) < 4000) return st.anda;
    const p = salaP(n);
    if (st.cobaia && p && cobaiasNoAndar(n.a).some(([, t]) => salaP(t) === p)) return st.cobaia;
    return st.padrao || '';
  },
  // Interferência: revelado, ganha duas imagens falsas em salas vizinhas; escondido de novo, elas saem
  interferencia(id, tk, c, vj) {
    const it = (ef().interf || {})[id], falsos = Object.entries(tokens()).filter(([, t]) => t && t.dc === id);
    if (!vj || tk.h) { if (it) gravarEstado(['interf', id], null); falsos.forEach(([k]) => A().definir(['tokens', k], null)); return; }
    if (it) return;
    const p = salaP(tk); if (!p) return;
    const viz = vizinhas(p).filter(q => q !== 25 || !(typeof ZONA_NEUTRA_ISENTA !== 'undefined' && ZONA_NEUTRA_ISENTA)).sort(() => Math.random() - .5);
    const usados = Object.values(tokens()).filter(t => t.s === tk.s).map(t => t.n || 1);
    let nn = (usados.length ? Math.max(...usados) : 0);
    [0, 1].forEach(i => {
      const q = viz[i] || p, r = I().retSala(q);
      nn++; A().definir(['tokens', `${tk.s}-${nn}`], { s: tk.s, a: tk.a, x: +(r.x + 0.8 + Math.random() * (I().R - 1.6)).toFixed(2), y: +(r.y + 0.8 + Math.random() * (I().R - 1.6)).toFixed(2), h: false, n: tk.n || 1, dc: id, ...(tk.st ? { st: tk.st } : {}), ...(tk.fm ? { fm: tk.fm } : {}) });
    });
    gravarEstado(['interf', id], { ts: agora(), c: cena() });
    logFilhos(`${rotuloGM(tk)}: interferência, duas imagens falsas nas salas vizinhas`);
  },
  falso(id, tk) {
    const real = tokens()[tk.dc];
    if (!real || real.h || real.a !== tk.a) A().definir(['tokens', id], null);
  },
  tirarFalsos(realId, motivo) {
    const fs = Object.entries(tokens()).filter(([, t]) => t && t.dc === realId);
    fs.forEach(([k]) => A().definir(['tokens', k], null));
    if (fs.length) logFilhos(`${rotuloGM(tokens()[realId] || fs[0][1])}: as imagens falsas sumiram (${motivo})`);
  },
  moveu(id, tk, ant, c) {
    const l = { a: tk.a, p: salaP(tk), ci: corrTk(tk) };
    // passou por porta fechada? (arrombar ou pelos dutos)
    let ci = l.ci >= 0 ? l.ci : ant.ci >= 0 ? ant.ci : (l.p && ant.p && ant.a === tk.a ? corredorEntre(ant.p, l.p) : -1);
    const fechada = ci >= 0 && ant.a === tk.a && !I().portaAberta(tk.a, ci);
    if (!c) return;
    // rastro: o lugar de onde saiu e o lugar aonde chegou (ou, no rastro "de cena", só a sala que deixou, até o fim da cena)
    if (c.rastro && RASTRO_CENA[c.rastro]) {
      if (ant.a === tk.a && ant.p && ant.p !== l.p) { const cn = I().cnDe(ant.a, ant.p); gravarPub(['m', c.rastro.slice(0, 2) + cn], { t: c.rastro, a: ant.a, cn, c: cena(), ts: agora() }); }
    } else if (c.rastro && RASTROS[c.rastro]) {
      const ate = agora() + (int(c.rastroMin) || RASTRO_MIN) * 60000;
      const marca = (a, p, cc) => { if (p) { const cn = I().cnDe(a, p); gravarPub(['m', c.rastro.slice(0, 2) + cn], { t: c.rastro, a, cn, ts: agora(), ate }); } else if (cc >= 0) gravarPub(['m', c.rastro.slice(0, 2) + 'a' + a + 'k' + cc], { t: c.rastro, a, ci: cc, ts: agora(), ate }); };
      if (ant.a === tk.a) marca(ant.a, ant.p, ant.ci);
      marca(l.a, l.p, l.ci);
    }
    // rastro próprio (só Mestre e auxiliares) e sinal que cai por onde passa
    const salas = [ant.a === tk.a ? ant.p : null, l.p].filter(Boolean);
    if (sent(c, 'mechas')) salas.forEach(p => gravarEstado(['mechas', id, 'c' + I().cnDe(tk.a, p)], agora()));
    if (mod(c, 'derrubaSinal')) salas.forEach(p => gravarEstado(['sinalCaido', 'c' + I().cnDe(tk.a, p)], agora() + 30000));
    if (!mod(c, 'silencioso')) {
      const av = c.avisos || {};
      if (av.tremor) { const al = {}; cobaiasNoAndar(tk.a).forEach(([cid, t]) => { al[cid] = rumo4(tk.x - t.x, tk.y - t.y); }); this.aviso('tremor', tk.a, al); }
      if ((av.forro || av.aproxima) && l.p) { const viz = vizinhas(l.p), al = {}; cobaiasNoAndar(tk.a).forEach(([cid, t]) => { if (viz.includes(salaP(t))) al[cid] = 1; }); if (av.forro) this.aviso('forro', tk.a, al); if (av.aproxima) this.aviso('aproxima', tk.a, al); }
    }
    if (av2(c, 'observado') && l.p) this.observado(cobaiasNoAndar(tk.a).filter(([, t]) => salaP(t) === l.p).map(([k]) => k), tk.a, l.p, id);
    if (fechada && mod(c, 'arromba') && !mod(c, 'atravessa')) {
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
    const tem = Object.entries(tokens()).some(([fid, t]) => (!filhoId || fid === filhoId) && ehFilho(t) && !t.dc && t.a === a && salaP(t) === p && av2(cfgTk(t), 'observado'));
    if (!tem) return;
    cobs.forEach(k => { this.obs[k + ':' + a + ':' + p] = agora(); });
    this.aviso('observado', a, Object.fromEntries(cobs.map(k => [k, 1])));
  },
  aviso(t, a, al) { if (!Object.keys(al).length) return; gravarPub(['av', 'v' + novaChave().slice(-10)], { t, a, al, ts: agora() }); },
  teia(cob, tk, lugar, teia) {
    const f = tokens()[teia.tk], c = f ? cfgTk(f) || {} : {};
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
    Object.entries(pub().m || {}).forEach(([k, m]) => { if (m && (m.t === 'alagada' || RASTRO_CENA[m.t]) && m.c !== nova) gravarPub(['m', k], null); });
  },
  acoes(v) {
    Object.entries(v).forEach(([k, x]) => {
      if (this.vistasAcoes.has(k)) return; this.vistasAcoes.add(k);
      if (!x || agora() - (x.ts || 0) > 600000) { A().Rede.set('filAcoes/' + k, null).catch(() => {}); return; }
      const p = x.cn - 25 * (x.a - 1);
      if (x.t === 'flash') this.flash(x, p);
      if (x.t === 'reparar' && window.ACF_DISFARCE) ACF_DISFARCE.aoReparar(x);   // disfarce3d.js: Reparar (Diário)
      Object.entries(tokens()).forEach(([id, tk]) => {
        if (!ehFilho(tk) || tk.dc || tk.a !== x.a) return;
        const c = cfgTk(tk); if (!c) return;
        // Percepção perto da interferência: as imagens falsas somem (com a DT; sem ela, o Mestre decide)
        if ((x.t === 'olhar' || x.t === 'examinar') && pas(c, 'interferencia') && Object.values(tokens()).some(t => t && t.dc === id)) {
          const perto = [salaP(tk)].concat(Object.values(tokens()).filter(t => t && t.dc === id).map(t => salaP(t))).filter(Boolean);
          if (perto.some(q => q === p || vizinhas(q).includes(p))) {
            const dt = int(c.interfDT);
            if (dt && x.v >= dt) { this.tirarFalsos(id, `${SERd(x.s).nome} passou em Percepção (${x.v})`); A().alertaMestre(`📡 ${SERd(x.s).nome} (${x.v}) desfez as imagens falsas de ${rotuloGM(tk)}.`); }
            else if (!dt) A().alertaMestre(`📡 ${SERd(x.s).nome} rolou Percepção ${x.v} perto da interferência de ${rotuloGM(tk)}. Se passou, toque numa imagem falsa e em "Tirar as imagens falsas".`);
          }
        }
        if (salaP(tk) !== p) return;
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
  // Flash de um jogador: quem só aparece por uma lente fica visível a todos por 1 rodada (na sala do Flash)
  flash(x, p) {
    const alvos = Object.entries(tokens()).filter(([, tk]) => ehFilho(tk) && !tk.dc && !tk.h && tk.a === x.a && salaP(tk) === p && (cfgTk(tk) || {}).ocult === 'lente');
    if (!alvos.length) { A().alertaMestre(`📸 ${SERd(x.s).nome} disparou o Flash na CN ${pad2(x.cn)}.`); return; }
    alvos.forEach(([id, tk]) => {
      A().definir(['tokens', id], { ...tk, fl: umaRodada(), rvt: agora() });
      A().alertaMestre(`📸 Flash de ${SERd(x.s).nome} na CN ${pad2(x.cn)}: ${rotuloGM(tk)} visível a todos por 1 rodada (veja o efeito do Flash na ficha).`);
      logFilhos(`${rotuloGM(tk)} apareceu no Flash de ${SERd(x.s).nome}`);
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
        if (p.ef === 'buscar') {
          if (r.ok === true) { A().alertaMestre(`🦴 ${SERd(cob).nome} passou na Vontade (${r.t}): nada foi tirado.`); return; }
          A().alertaMestre(`🦴 ${SERd(cob).nome} ${r.ok === false ? 'falhou' : 'rolou'} na Vontade (${r.t})${r.ok === false ? '' : ': você decide'}. Escreva o que ela esqueceu.`);
          const pedir = () => { if ($('#filModal')) { setTimeout(pedir, 1500); return; } pedirTexto(`O que ${SERd(cob).nome} esqueceu`, `Vontade ${r.t}${p.dt ? ' contra DT ' + p.dt : ''}. Mensagem privada (vazio: nada)`, '', txt => { if (!txt) return; A().Rede.push('filMsg/' + cob, { t: txt.slice(0, 400), k: 'esqueceu', ts: agora() }).pronto.catch(I().erroGravacao); A().aviso('Mensagem enviada.'); }); };
          pedir();
        }
      });
    });
  },
  limpar() {
    const pf = pub();
    Object.entries(pf.m || {}).forEach(([k, m]) => { if (m && (m.t === 'molhado' || m.t === 'lodo') && agora() > (m.ate || 0) + 5000) gravarPub(['m', k], null); if (m && RASTRO_CENA[m.t] && m.c !== cena()) gravarPub(['m', k], null); });
    Object.entries(pf.av || {}).forEach(([k, a]) => { if (!a || agora() - (a.ts || 0) > 120000) gravarPub(['av', k], null); });
    Object.entries(pf.pd || {}).forEach(([k, p]) => { if (!p || agora() - (p.ts || 0) > 900000) { gravarPub(['pd', k], null); A().Rede.set('filResp/' + k, null).catch(() => {}); } });
    if (pf.sil && !silAtivo()) gravarPub(['sil'], null);
    Object.entries(ef().teiaHit || {}).forEach(([k, h]) => { if (!h || agora() - (h.ts || 0) > 240000) gravarEstado(['teiaHit', k], null); });
    Object.entries(ef().dutos || {}).forEach(([k, t]) => { if (agora() - t > 900000) gravarEstado(['dutos', k], null); });
    Object.entries(leituras).forEach(([k, l]) => { if (!l || agora() - (l.ts || 0) > 3600e3) A().Rede.set('leituras/' + k, null).catch(() => {}); });
    Object.entries(ef().trilha || {}).forEach(([cob, pts]) => Object.entries(pts || {}).forEach(([k, v]) => { if (!v || agora() - (v.ts || 0) > 15 * 60e3) gravarEstado(['trilha', cob, k], null); }));
    Object.entries(ef().sinalCaido || {}).forEach(([k, t]) => { if (agora() > t) gravarEstado(['sinalCaido', k], null); });
    ['mechas', 'interf', 'atacou', 'con', 'trans'].forEach(g => Object.keys(ef()[g] || {}).forEach(id => { if (!tokens()[id]) gravarEstado([g, id], null); }));
    Object.entries(ef().con || {}).forEach(([id, v]) => { if (!ativoAte(v)) gravarEstado(['con', id], null); });
    // objetos de Forma de Objeto sem dono (token saiu do mapa)
    const donos = new Set(Object.values(ef().obj || {}));
    Object.keys(pf.ob || {}).forEach(k => { if (!donos.has(k)) gravarPub(['ob', k], null); });
    Object.entries(ef().obj || {}).forEach(([id, k]) => { const t = tokens()[id]; if (!t || !t.fo) { gravarEstado(['obj', id], null); if (k) gravarPub(['ob', k], null); } });
  },
};
const av2 = (c, k) => !!(c && c.avisos && c.avisos[k]);

/* ---------- 3D: botões no quadro do Controle ---------- */
function htmlHab(id) {
  const tk = tokens()[id]; if (!tk || !ehFilho(tk) || !souGM() || tk.dc) return '';
  const c = cfgTk(tk); if (!c) return '';
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

/* ---------- Ganchos do mapa 2D (classes da ficha) e da visibilidade do jogador ---------- */
function extraFicha(id, tk) {
  const s = SERd(tk.s) || {}, v = vista(), gm = !!(v.mestre || v.aux);
  return { mini: !!s.mini, amigavel: !!tk.am && ehFilho(tk), falso: gm && !!tk.dc, lente: gm && !!tk.ln && !flashAtivo(tk), flash: flashAtivo(tk), el: tk.el && EL[tk.el] ? tk.el : '', olhaLente: !!tk.lt && ehCobaia(tk) };
}
// jogador: o Filho "só por uma lente" some, salvo para quem está olhando por uma (ou durante o Flash)
function visivelJogador(tk) { return !(ehFilho(tk) && lenteOculto(tk) && !lenteMinha()); }
const foraDoEncontro = tk => !!(tk && (tk.dc || lenteOculto(tk)));

/* ---------- Visão da criatura (visao3d.js): o que os sentidos de um Filho mostram, sem gravar nada ---------- */
// como o Filho percebe uma cobaia/NPC: { ve: pela vista, s: sentido que dá a posição exata ('' se nenhum) }; null sem características
function comoPercebe(filhoId, tk) {
  const f = tokens()[filhoId], t = tipoDe(tk);
  if (!f || !ehFilho(f) || !tk || (t !== 'cobaia' && t !== 'npc')) return null;
  const c = cfgTk(f); if (!c) return null;
  if (tk.a !== f.a) return { ve: false, s: '' };
  const s = sentidoExato(f, c, idDe(tk) || tk.s, tk);
  return { ve: enxerga(f, c, tk), s, machucada: machucada(tk), faroCurto: sent(c, 'faro_curto') };
}
// sons das salas (a mesma conta da escuta do auxiliar, sem o pedido de teste nem o movimento dobrado), faro, trilha e leitura
function sentidosDe(filhoId) {
  const f = tokens()[filhoId]; if (!f || !ehFilho(f)) return null;
  const c = cfgTk(f), a = f.a, out = { cfg: !!c, sent: c ? Object.keys(c.sent || {}).filter(k => c.sent[k]) : [], sons: [], faro: [], trilha: [], leitura: [] };
  const precisa = sent(c, 'audicao_precisa');
  if (!c || sent(c, 'audicao') || precisa) {
    let alc = (c && +c.alcAud) || ALC_LONGO; const cf = cnTk(f);
    if (c && sent(c, 'audicao_agua') && cf && tagsSala(cf).agua) alc *= 2;
    I().gruposDeSala().forEach((gr, k) => {
      if (gr.a !== a) return;
      const n = I().nivelDe(semSilenciados(gr.ids).length + (gr.extra || 0)); if (!n) return;
      const tc = gr.p ? null : tokens()[String(k).slice(5)];
      const centro = gr.p ? centroSala(gr.p) : tc ? { x: tc.x, y: tc.y } : null; if (!centro) return;
      const r = gr.p ? I().retSala(gr.p) : null, alvo = r ? { x: Math.max(r.x, Math.min(r.x + r.w, f.x)), y: Math.max(r.y, Math.min(r.y + r.h, f.y)) } : centro;
      const d = metros({ x: f.x, y: f.y }, alvo);
      const exata = precisa && !!gr.p && (n >= 3 || (n === 2 && d <= ALC_MEDIO));
      if (!precisa && d > alc) return;
      out.sons.push({ k: String(k), x: centro.x, y: centro.y, n, exata, p: gr.p || 0 });
    });
  }
  if (sent(c, 'faro')) cobaiasNoAndar(a).forEach(([cid, t]) => { if (!machucada(t)) return; const p = salaP(t), q = p ? centroSala(p) : { x: t.x, y: t.y }; out.faro.push({ id: cid, x: q.x, y: q.y }); });
  if (sent(c, 'leitura')) Object.values(leituras).forEach(l => { if (l && l.a === a && agora() - (l.ts || 0) <= LEITURA_MIN * 60e3) out.leitura.push({ x: l.x, y: l.y, ts: l.ts }); });
  if (sent(c, 'trilha')) {
    const lim = (int(c.trilhaMin) || TRILHA_MIN) * 60e3;
    cobaiasNoAndar(a).forEach(([cid]) => {
      const pts = Object.values(((ef().trilha || {})[cid]) || {}).filter(v => v && v.a === a && agora() - (v.ts || 0) < lim).sort((x, y) => x.ts - y.ts).map(v => ({ cn: v.cn, ts: v.ts }));
      if (pts.length) out.trilha.push({ id: cid, cor: (SERd(cid) || {}).cor || '#ffffff', pts, lim });
    });
  }
  return out;
}

window.ACF_FILHOS = {
  // ganchos usados por app.js e sala3d.js
  percebe, veAux, marcaSentido, ouve, semSilenciados, semAudicao, linhasEscuta, ligarEscuta, desenharSentidos, chatBloqueado,
  limite, travado, bloqueia, ignoraPorta, regente, aparencia, htmlCartao, ligarCartao, htmlCorredor, ligarCorredor,
  btnMsg, desconfiarMsg, htmlHab, ligarHab, usar, leu, limPadrao, atravessa, extraFicha, visivelJogador, foraDoEncontro, chipsDe, htmlChips,
  // para testes e outras telas
  get foco() { return focoAtual(); }, definirFoco, cfgDe, cfgTk, Editor, ETIQUETAS, tagsSala, tagsCorr, marcasVivas, exatos, Motor, HABS, SENTIDOS, OBJETOS, DETALHES,
  // modo foto do imersao.js: o mesmo Flash do botão (câmera ou celular na ficha ativa, 1 por cena)
  dispararFlash, flashPronto: () => !!itemDe(RX_FLASH) && flashCena !== cena() && !!meuLugar(),
  // visão da criatura (visao3d.js)
  comoPercebe, sentidosDe,
};
iniciar();
})();
