/* paineis.js · painéis como lançador (Mestre, auxiliares e jogadores)
   - cada aba abre como uma lista compacta de cartões (ícone, título e uma linha de chips com o estado vivo do bloco)
   - tocar num cartão abre o bloco como folha (tela cheia no celular, dentro do painel no computador), com ← voltar
   - filtros em chips por categoria nas abas Sessão e Mesa; ★ favoritos e a busca do limpo.js continuam valendo
   - por dentro dos blocos: explicações longas atrás de um "?", seções em abas ou recolhíveis, alguns selects viram chips
   Só age no visual limpo (body.hud-limpo). "Visual clássico" (⚙ do painel) volta ao antigo.
   Não muda ids nem data-*: os blocos continuam no mesmo lugar do DOM; só a apresentação muda. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ls = { get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const txt = (s, r) => { const e = typeof s === 'string' ? $(s, r) : s; return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : ''; };
  const painel = $('#painel');
  if (!painel) return;
  const body = document.body;

  const limpo = () => body.classList.contains('hud-limpo');
  const modo = () => ls.get('acf-pn-modo', 'lanc');
  const lancOn = () => limpo() && modo() === 'lanc';

  /* ---------- categorias (filtros da Sessão e da Mesa) ---------- */
  const CATS = {
    cena: ['🎬', 'Cena'], testes: ['🎲', 'Testes'], sah: ['☠', 'Regras do SaH'], recomp: ['🏆', 'Recompensas'],
    clima: ['🌧', 'Clima e ambiente'], reg: ['📋', 'Registro'], ctrl: ['🎛', 'Controle']
  };

  /* ---------- registro dos blocos: ícone, título curto, categoria e descrição (quando não há estado vivo) ---------- */
  const REG = {
    blocoMinha: { ic: '🧍', t: 'Sua cobaia', fixo: true },
    blocoPersg: { ic: '🏃', t: 'Perseguição', fixo: true },
    blocoCaderno: { ic: '📓', t: 'Caderno', d: 'só neste aparelho' },
    blocoCobaias: { ic: '👥', t: 'Cobaias' },
    blocoRuido: { ic: '🔊', t: 'Medidor de ruído', cat: 'cena' },
    blocoPresencas: { ic: '👁', t: 'Presenças neste andar' },
    blocoSons: { ic: '👂', t: 'Sons na Caixa', fixo: true },
    blocoKitAux: { ic: '🧰', t: 'Kit do auxiliar' },
    blocoSenhasAux: { ic: '🔑', t: 'Senhas' },
    blocoFichasM: { ic: '📍', t: 'Colocar no mapa' },
    blocoCoresM: { ic: '🎨', t: 'Cores' },
    blocoSalasM: { ic: '🚪', t: 'Salas e portas' },
    blocoCenas: { ic: '🗂', t: 'Cenas prontas' },
    blocoNotas: { ic: '📝', t: 'Anotações das salas' },
    blocoRuidoM: { ic: '📢', t: 'Ruído e Protocolo', cat: 'cena' },
    blocoMomento: { ic: '🎥', t: 'Encontros, sons e câmeras', cat: 'cena' },
    blocoLojaM: { ic: '🛒', t: 'Loja do Maurício', cat: 'recomp' },
    blocoPedidos: { ic: '📨', t: 'Pedidos', cat: 'ctrl' },
    blocoMesa: { ic: '🎛', t: 'Mesa', cat: 'ctrl' },
    blocoRelogio: { ic: '🕰', t: 'Relógio da Caixa', cat: 'clima' },
    blocoApagao: { ic: '🌑', t: 'Apagão', cat: 'clima' },
    blocoFuncoes: { ic: '🎭', t: 'Funções' },
    blocoConectados: { ic: '🟢', t: 'Conectados agora' },
    blocoDesemp: { ic: '📈', t: 'Desempenho' },
    blocoExpo: { ic: '☢', t: 'Exposição (NEX)' },
    blocoBalanca: { ic: '⚖', t: 'Balança do Eco' },
    blocoDiario: { ic: '📔', t: 'Diário da sessão' },
    blocoRolagens: { ic: '🎲', t: 'Rolagens recentes' },
    blocoSenhas: { ic: '🔑', t: 'Senhas' },
    blocoBackup: { ic: '💾', t: 'Backup' },
    blocoFilhosM: { ic: '🩸', t: 'Características dos Filhos' },
    blocoMesaSessao: { ic: '🎬', t: 'Sessão', cat: 'cena', d: 'abertura · tensão · holofote · dilema' },
    blocoMesaRetratos: { ic: '🖼', t: 'Painel de retratos', cat: 'ctrl' },
    blocoMesaCena: { ic: '📜', t: 'Cena e escudo', cat: 'cena', d: 'nova cena · escudo do Mestre' },
    blocoMesaInv: { ic: '🔎', t: 'Cena de investigação', cat: 'testes' },
    blocoMesaTeste: { ic: '🎯', t: 'Pedir teste', cat: 'testes' },
    blocoSahPers: { ic: '🏃', t: 'Perseguição (Sobrevivendo ao Horror)', cat: 'sah', d: 'teste estendido · vez no mapa e no 3D' },
    blocoSahFurt: { ic: '🤫', t: 'Furtividade SaH', cat: 'sah', d: 'visibilidade por rodada' },
    blocoSahMedo: { ic: '😱', t: 'Medo em jogo', cat: 'sah', d: 'visões · insanidade' },
    blocoSahSort: { ic: '📊', t: 'Tabelas do SaH', cat: 'sah', d: 'sortear na hora' },
    blocoMesaBau: { ic: '🧳', t: 'Baú de achados', cat: 'recomp', d: 'item na ficha da cobaia' },
    blocoMesaConq: { ic: '🏆', t: 'Conquistas', cat: 'recomp' },
    blocoMesaHall: { ic: '🏛', t: 'Hall da Caixa', cat: 'recomp' },
    blocoImrResumo: { ic: '🧾', t: 'Resumo automático', cat: 'reg', d: 'abre no Encerramento' },
    blocoMesaExpo: { ic: '☢', t: 'Salas de Exposição', cat: 'cena' },
    blocoMesaInt: { ic: '☕', t: 'Interlúdio', cat: 'cena', d: 'curto · longo' },
    blocoMesaRec: { ic: '🏁', t: 'Fim de missão', cat: 'recomp', d: 'prestígio · nível' },
    blocoMesaAmb: { ic: '🌧', t: 'Ambiente', cat: 'clima' },
    blocoMesaRol: { ic: '🎲', t: 'Rolagem secreta', cat: 'testes' },
    blocoMesaAmea: { ic: '👹', t: 'Ameaças', cat: 'cena' },
    blocoMesaMemb: { ic: '🫧', t: 'Membrana', cat: 'clima' },
    blocoMesaArq: { ic: '📜', t: 'Arquivo da O.R.F.E.U.', cat: 'reg' },
    blocoMesaMom: { ic: '✨', t: 'Momentos marcantes', cat: 'cena' },
    blocoMesaRel: { ic: '📋', t: 'Relatório da missão', cat: 'reg' },
    blocoMesaNex: { ic: '🧮', t: 'Calculadora de NEX', cat: 'recomp' },
    blocoMesaParede: { ic: '🧱', t: 'Parede de Desejos', cat: 'recomp' },
    // qol.js: cartões de qualidade de vida (conteúdo montado só quando abertos)
    blocoQolAgora: { ic: '📡', t: 'Agora', d: 'on-line · onde está cada um · alertas' },
    blocoQolMacros: { ic: '⚡', t: 'Macros', cat: 'ctrl', d: 'grave e repita sequências' },
    blocoQolDesf: { ic: '↶', t: 'Desfazer ações', cat: 'ctrl' },
    blocoQolRetrato: { ic: '📸', t: 'Retrato da sessão', d: 'preparar · restaurar' },
    blocoQolAux: { ic: '🎮', t: 'Controle rápido' },
    blocoQolMapa: { ic: '🧠', t: 'Mapa mental', d: 'só você vê' },
    blocoCmdOrdens: { ic: '📨', t: 'Ordens e pilotos', cat: 'ctrl', d: 'ordens aos auxiliares · piloto dos Filhos' }
  };
  const reg = b => REG[b.id] || { ic: '▪', t: txt($('h2', b)).replace(/^[☆★]\s*/, '') || b.id };
  // cartões-atalho: o bloco mora numa aba, mas ganha um cartão noutra (abre o MESMO bloco, sem duplicar)
  // aba → lista de [id do bloco, id do bloco depois do qual o cartão entra]
  const ATALHOS = { sessao: [['blocoQolAgora', ''], ['blocoSahPers', 'blocoRuidoM']] };
  const tituloDe = b => reg(b).t || txt($('h2', b)).replace(/^[☆★]\s*/, '');

  /* ---------- estado vivo de cada bloco: lista de [ícone, texto, classe] ---------- */
  const n = (sel, r) => $$(sel, r).length;
  const marcado = sel => { const i = $(sel); return !!(i && i.checked); };
  const SUM = {
    blocoMinha: b => { const t = $$('.barra b', b).map(x => x.textContent); return t.length ? [['❤', 'PV ' + (t[0] || '?')], ['🧠', 'SAN ' + (t[1] || '?')]] : []; },
    blocoPersg: b => [['🏃', txt('#minhaVezTxt', b) || n('#listaPersg li', b) + ' na ordem', 'alerta']],
    blocoCaderno: () => { const v = ($('#caderno') || {}).value || ''; const l = v.split('\n').filter(x => x.trim()).length; return l ? [['📝', l + (l === 1 ? ' linha' : ' linhas')]] : [['📝', 'vazio']]; },
    blocoCobaias: b => { const li = n('#listaCobaias li', b), on = n('#listaCobaias .ponto-on.on', b); return [['👥', li + ' cobaias'], ...(on ? [['🟢', on + ' conectada' + (on > 1 ? 's' : '')]] : [])]; },
    blocoRuido: b => { const est = n('#listaRuido li.estouro', b); const pior = $$('#listaRuido li', b).map(li => n('.q.on', li)).reduce((a, x) => Math.max(a, x), 0); return [[est ? '🚨' : '🔉', est ? est + ' acima do limite' : 'nível ' + pior + '/5', est ? 'alerta' : '']]; },
    blocoPresencas: b => { const k = n('#listaPresencas li', b); return [[k ? '👁' : '·', k ? k + ' à vista' : 'nada à vista']]; },
    blocoSons: b => { const k = n('#escutaAux li:not(.vazio)', b); return [['👂', k ? k + ' sons' : 'silêncio']]; },
    blocoKitAux: b => { const q = $$('#trayFilhosAux .qtd', b).reduce((a, x) => a + (parseInt(x.textContent.replace(/\D/g, ''), 10) || 0), 0); return [['🩸', q ? q + ' Filhos no mapa' : 'Filhos'], ['🤖', 'robô'], ['🎲', 'rolagem'], ['🎨', 'cores']]; },
    blocoSenhasAux: b => [['🔑', n('.sn-linha', b) + ' senhas']],
    blocoSenhas: b => [['🔑', n('.sn-linha', b) + ' senhas'], ['🏢', n('[data-sn-andar]', b) + ' andares']],
    blocoFichasM: b => { const aqui = n('#trayNpc .qtd', b), fil = $$('#trayFilhos .qtd', b).reduce((a, x) => a + (parseInt(x.textContent.replace(/\D/g, ''), 10) || 1), 0); return [['👥', aqui + ' aqui'], ['🩸', fil + ' Filhos'], ...(marcado('#chkElementos') ? [['👁', 'elementos à mostra']] : [])]; },
    blocoCoresM: b => [['🎨', n('#listaCores button', b) + ' personagens']],
    blocoSalasM: () => { const s = ($('#subAndar') || {}).value; return [['🏷', s || 'sem subtítulo']]; },
    blocoCenas: b => { const k = n('#listaCenas li:not(.vazio)', b); return [['🗂', k ? k + (k > 1 ? ' cenas' : ' cena') : 'nenhuma']]; },
    blocoNotas: b => { const k = n('#listaNotas li', b); return [['📝', k ? k + ' notas' : 'nenhuma neste andar']]; },
    blocoRuidoM: () => { const q = txt('#qtdQuebras') || '0'; return [['📅', 'Dia ' + (txt('#cicloDia') || '1')], ['💥', q + '/3 quebras', +q >= 3 ? 'alerta' : ''], ...(!($('#alertaRuido') || {}).hidden ? [['🚨', 'limite rompido', 'alerta']] : [])]; },
    blocoMomento: b => { const on = $$('[data-mc]', b).filter(i => i.type === 'checkbox'); const cams = n('.mom-cam', b); return [['🎥', on.filter(i => i.checked).length + '/' + on.length + ' ligados'], ['📹', cams + (cams === 1 ? ' câmera' : ' câmeras')]]; },
    blocoLojaM: () => [[marcado('#chkLojaAberta') ? '🟢' : '🔒', marcado('#chkLojaAberta') ? 'aberta' : 'fechada', marcado('#chkLojaAberta') ? 'vivo' : ''], ['🪙', ((($('#cofreM') || {}).value) || 0) + ' maiores · ' + ((($('#cofrem') || {}).value) || 0) + ' menores']],
    blocoPedidos: b => { const k = n('#listaPedidos li:not(.vazio)', b); return [['📨', k ? k + ' pedidos' : 'nenhum', k ? 'alerta' : '']]; },
    blocoMesa: () => { const s = $('#selEspiar'); const o = s && s.value ? s.options[s.selectedIndex].textContent.split(' (')[0] : ''; return [['👁', o ? 'pelos olhos de ' + o : 'visão do Mestre', o ? 'vivo' : ''], ['🎲', marcado('#chkRolAberta') ? 'rolagens no Geral' : 'rolagens no Sussurro']]; },
    blocoRelogio: () => [['🕰', txt('#relogioMestre') || '--:--'], ...(marcado('#chkApagao00') ? [['🌑', 'apagão à 00:00']] : [])],
    blocoApagao: () => { const on = /deslig/i.test(txt('#btnApagao')); return [[on ? '🌑' : '💡', on ? 'apagão ligado' : 'luz normal', on ? 'alerta' : '']]; },
    blocoFuncoes: b => [['🎭', n('.funcao-linha', b) + ' funções']],
    blocoConectados: b => [['🟢', n('#listaConectados li.on', b) + ' de ' + n('#listaConectados li', b) + ' on-line']],
    blocoDesemp: b => { const on = n('#desempLista .dsp-li:not(.dsp-off)', b), al = n('#desempLista .dsp-alerta', b), pior = $$('#desempLista .dsp-li:not(.dsp-off) .dsp-fps b', b).map(x => +x.textContent || 0); return [['📈', on ? on + (on === 1 ? ' aparelho' : ' aparelhos') : 'nenhum aparelho'], ...(on ? [['⏱', 'pior ' + Math.min(...pior) + ' FPS', al ? 'alerta' : '']] : []), ...(al ? [['⚠', al + ' com problema', 'alerta']] : [])]; },
    blocoExpo: b => [['☢', Math.max(0, n('#tabelaExpo tr', b) - 1) + ' cobaias']],
    blocoBalanca: () => [['⚖', (txt('#balMae') || '50%') + ' Mãe · ' + (txt('#balRei') || '50%') + ' Rei'], ['·', txt('#balancaEstado') || 'Neutro']],
    blocoDiario: b => { const k = n('#listaDiario li', b); const u = $('#listaDiario li', b); return [['📔', k + ' registros'], ...(u ? [['🕒', txt(u).slice(0, 40)]] : [])]; },
    blocoRolagens: b => [['🎲', n('#listaRolagens .rol-item, #listaRolagens li', b) + ' rolagens'], ...(n('#listaRolagens .alerta, #listaRolagens .rerol', b) ? [['⚠', 'rolou de novo', 'alerta']] : [])],
    blocoBackup: b => { const p = $$('p.mini', b).map(x => x.textContent).find(t => /autom/i.test(t)) || ''; const m = p.match(/(\d{1,2}:\d{2})/); return [['⬇', 'baixar'], ['🕒', m ? 'automático ' + m[1] : 'automático a cada 15 min']]; },
    blocoFilhosM: b => [['🩸', txt('.fp-sub', b).split('·')[0] || 'Filhos']],
    blocoMesaSessao: b => { const k = $$('p.mesa-k', b).map(x => x.textContent).find(t => /tens/i.test(t)) || ''; const v = (k.match(/(\d+)\s*%/) || [])[1]; return [['😰', 'tensão ' + (v || 0) + '%', +v >= 50 ? 'alerta' : ''], ['🔦', 'holofote'], ['❓', 'dilema']]; },
    blocoMesaRetratos: b => [['🖼', n('#mesaHudMeu input:checked', b) + ' na sua tela'], ['👤', n('#mesaHudJog input:checked', b) + ' nos jogadores']],
    blocoSahPers: b => { const at = $('#persgAtiva', b); if (at && !at.hidden) return [['▶', txt('#persgRodada') || 'em andamento', 'vivo'], ['👥', n('#ordemPersg li', b) + ' na ordem']]; return [['⏸', 'parada'], ['👥', n('#setupPersg .ck:checked', b) + ' marcados']]; },
    blocoMesaInv: b => { const on = /encerr|parar/i.test(txt('.btn-protocolo', b)); return [[on ? '▶' : '⏸', on ? 'em andamento' : 'parada', on ? 'vivo' : ''], ['🔍', 'pistas DT 15/20']]; },
    blocoMesaTeste: b => [['🎯', n('.mesa-alvos input:checked, .mesa-alvos .on', b) + ' alvos'], ['📝', ($('#mesaTesteTxt') || {}).value || 'perícia livre']],
    blocoMesaBau: b => [['🧳', n('#bauLog li, #bauLog .bau-it', b) + ' entregues']],
    blocoMesaConq: b => [['🏆', n('.cq-grade > *', b) + ' conquistas']],
    blocoMesaHall: () => [['🏛', 'episódios e estatísticas']],
    blocoMesaExpo: b => { const t = $$('p.mini', b).map(x => x.textContent).find(x => /Biblioteca/.test(x)) || ''; return [['☢', (t.match(/Biblioteca:\s*([^.]+)/) || [])[1] || 'biblioteca']]; },
    blocoMesaAmb: b => { const on = $('.mesa-amb button.on', b); const vol = txt('.amb-vol output', b); const som = $('.amb-sons li.on span', b); return [[on ? '🔊' : '🔇', on ? txt(on) : (som ? txt(som) : 'silêncio'), on || som ? 'vivo' : ''], ['🎚', vol || '']]; },
    blocoMesaRol: b => { const r = txt('#mesaRolRes', b); return [['🎲', r ? r.slice(0, 34) : 'só você vê']]; },
    blocoMesaAmea: b => { const t = $$('p.mini', b).map(x => x.textContent).find(x => /Nenhuma/.test(x)); return [['👹', t ? 'nenhuma criada' : n('button, li', b) + ' fichas']]; },
    blocoMesaMemb: b => { const t = $$('p.mini', b).map(x => x.textContent).pop() || ''; const est = /estáveis/.test(t); return [[est ? '🫧' : '⚠', est ? 'salas estáveis' : t.slice(0, 34), est ? '' : 'alerta']]; },
    blocoMesaArq: b => { const t = txt('p.mini', b); const m = t.match(/(\d+) cifras e (\d+) documentos/); return m ? [['🔐', m[1] + ' cifras'], ['📄', m[2] + ' documentos']] : [['📜', 'cifras e documentos']]; },
    blocoMesaMom: b => [['✨', n('.lista-apagao input:checked', b) + ' ligados']],
    blocoMesaRel: b => { const t = $$('p.mini', b).map(x => x.textContent).find(x => /Nenhum registro/.test(x)); return [['📋', t ? 'sem registros' : 'registrando', t ? '' : 'vivo']]; },
    blocoMesaNex: b => [['🧮', n('.nx-mini li', b) + ' cobaias']],
    blocoMesaParede: b => { const t = $$('p.mini', b).map(x => x.textContent).find(x => /Contagem/.test(x)); return [['🧱', t ? t.replace(/^Contagem:\s*/, '') : 'desejos']]; }
  };
  const resumo = b => {
    let r = [];
    try { r = (SUM[b.id] ? SUM[b.id](b) : window.ACF_QOL && ACF_QOL.BLOCOS[b.id] ? ACF_QOL.resumo(b.id) : []) || []; } catch (e) { r = []; }
    r = r.filter(x => x && x[1]);
    if (!r.length && reg(b).d) r = [['', reg(b).d]];
    return r;
  };
  const htmlChips = r => r.map(([i, t, c]) => `<span class="pn-chip${c ? ' ' + c : ''}">${i ? `<i aria-hidden="true">${esc(i)}</i>` : ''}${esc(t)}</span>`).join('');

  /* ---------- quais blocos entram no lançador ---------- */
  const blocos = () => $$(':scope > .bloco', painel).filter(b => b.id);
  const disponivel = b => !b.hidden && !b.classList.contains('fora-busca') && (!b.classList.contains('fora-da-aba') || painel.classList.contains('buscando'));
  const ehFixo = b => !!reg(b).fixo && !painel.classList.contains('buscando');
  const abaAtual = () => { const a = $('#abasMestre'); if (!a || a.hidden) return body.classList.contains('auxiliar') ? 'aux' : 'jog'; const b = $('#abasMestre button.ativo'); return b ? b.dataset.aba : 'mapa'; };

  /* ---------- montagem do lançador ---------- */
  const lanc = document.createElement('div');
  lanc.id = 'pnLanc'; lanc.className = 'pn-lanc';
  lanc.innerHTML = '<div class="pn-filtros" role="group" aria-label="Filtrar por categoria"></div><p class="pn-sub"></p><div class="pn-lista"></div>';
  const posLanc = () => { const barra = $('.painel-barra', painel); const ref = barra || $('#abasMestre', painel); if (ref) { if (ref.nextElementSibling !== lanc) ref.after(lanc); } else if (painel.firstElementChild !== lanc) painel.prepend(lanc); };
  // o lançador fica logo depois dos blocos fixos (Sua cobaia) para o jogador: fixo em cima, cartões embaixo
  const posicionar = () => {
    const fixos = blocos().filter(b => ehFixo(b) && disponivel(b));
    if (fixos.length) { const ult = fixos[fixos.length - 1]; if (ult.nextElementSibling !== lanc) ult.after(lanc); }
    else posLanc();
  };

  let catSel = ls.get('acf-pn-cat', {});
  let aberto = null, scrollAntes = 0, eraFechado = false;

  function desenharLanc() {
    if (!lancOn()) return;
    posicionar();
    const aba = abaAtual(), busc = painel.classList.contains('buscando');
    // uma consulta dos blocos e um resumo por bloco em cada desenho (eram refeitos várias vezes)
    const todos = blocos(), rs = new Map(), resumoDe = b => { if (!rs.has(b)) rs.set(b, resumo(b)); return rs.get(b); };
    todos.forEach(b => b.classList.toggle('pn-fixo', ehFixo(b) && disponivel(b)));
    const lista = todos.filter(b => disponivel(b) && !ehFixo(b));
    if (!busc) (ATALHOS[aba] || []).forEach(([id, depois]) => {
      const b = document.getElementById(id);
      if (!b || b.hidden || lista.includes(b) || b.classList.contains('fora-busca')) return;
      const k = lista.findIndex(x => x.id === depois);
      lista.splice(k >= 0 ? k + 1 : 0, 0, b);
    });
    // filtros por categoria (só quando há duas ou mais categorias na aba)
    const cats = [...new Set(lista.map(b => reg(b).cat).filter(Boolean))];
    const usarCats = !busc && cats.length >= 2 && lista.length >= 6;
    let cat = usarCats ? (catSel[aba] || '') : '';
    if (cat && !cats.includes(cat)) cat = '';
    const fil = $('.pn-filtros', lanc);
    const fHtml = usarCats ? `<button type="button" data-pn-cat="" class="${cat ? '' : 'on'}" aria-pressed="${!cat}">Todos</button>` + Object.keys(CATS).filter(k => cats.includes(k)).map(k => `<button type="button" data-pn-cat="${k}" class="${cat === k ? 'on' : ''}" aria-pressed="${cat === k}" title="${CATS[k][1]}" aria-label="${CATS[k][1]}"><i aria-hidden="true">${CATS[k][0]}</i><span>${CATS[k][1]}</span></button>`).join('') : '';
    if (fil.dataset.h !== fHtml) { fil.innerHTML = fHtml; fil.dataset.h = fHtml; }
    fil.hidden = !usarCats;
    const vis = cat ? lista.filter(b => reg(b).cat === cat) : lista;
    // linha de resumo em mono
    const favs = vis.filter(b => b.classList.contains('fav')).length;
    const alertas = vis.filter(b => resumoDe(b).some(x => x[2] === 'alerta')).length;
    const sub = busc ? `${vis.length} ${vis.length === 1 ? 'bloco encontrado' : 'blocos encontrados'}` :
      `${vis.length} ${vis.length === 1 ? 'ferramenta' : 'ferramentas'}${cat ? ' · ' + CATS[cat][1] : ''}${favs ? ' · ' + favs + ' ★' : ''}${alertas ? ' · ' + alertas + ' pedindo atenção' : ''}`;
    $('.pn-sub', lanc).textContent = sub;
    // cartões (atualiza por chave para não piscar)
    const cx = $('.pn-lista', lanc);
    const ids = vis.map(b => b.id).join(',');
    if (cx.dataset.ids !== ids) {
      cx.innerHTML = vis.map(b => { const r = reg(b); return `<button type="button" class="pn-card" data-pn-abre="${b.id}" data-cat="${r.cat || ''}"><span class="pn-card-ic" aria-hidden="true">${r.ic}</span><span class="pn-card-tx"><b class="pn-card-t"></b><span class="pn-chips"></span></span><span class="pn-card-dir" aria-hidden="true"></span></button>`; }).join('') || `<p class="pn-nada">${busc ? 'Nada com esse nome. Tente outra palavra.' : 'Nada nesta categoria.'}</p>`;
      cx.dataset.ids = ids;
    }
    vis.forEach(b => {
      const c = $(`[data-pn-abre="${b.id}"]`, cx); if (!c) return;
      const t = tituloDe(b) + (busc && b.dataset.aba && $('#abasMestre') && !$('#abasMestre').hidden ? ` · ${b.dataset.aba === 'sessao' ? 'Sessão' : b.dataset.aba === 'registro' ? 'Registro' : b.dataset.aba[0].toUpperCase() + b.dataset.aba.slice(1)}` : '');
      const r = resumoDe(b), h = htmlChips(r);
      const tt = $('.pn-card-t', c); if (tt.textContent !== t) tt.textContent = t;
      const ch = $('.pn-chips', c); if (ch.dataset.h !== h) { ch.innerHTML = h; ch.dataset.h = h; }
      const dir = b.classList.contains('fav') ? '★' : '›'; const d = $('.pn-card-dir', c); if (d.textContent !== dir) d.textContent = dir;
      c.classList.toggle('fav', b.classList.contains('fav'));
      c.classList.toggle('alerta', r.some(x => x[2] === 'alerta'));
      c.classList.toggle('vivo', r.some(x => x[2] === 'vivo'));
      c.setAttribute('aria-label', `${t}: ${r.map(x => x[1]).join(', ')}`);
    });
  }

  lanc.addEventListener('click', e => {
    const f = e.target.closest('[data-pn-cat]');
    if (f) { catSel[abaAtual()] = f.dataset.pnCat; ls.set('acf-pn-cat', catSel); desenharLanc(); return; }
    const c = e.target.closest('[data-pn-abre]');
    if (c) abrir(c.dataset.pnAbre);
  });

  /* ---------- folha: o bloco aberto, com ← voltar ---------- */
  function cabecalho(b) {
    let cab = $(':scope > .pn-cab', b);
    if (!cab) {
      cab = document.createElement('div'); cab.className = 'pn-cab';
      cab.innerHTML = `<button type="button" class="pn-voltar" data-pn-voltar aria-label="Voltar à lista" title="Voltar">←</button><span class="pn-cab-ic" aria-hidden="true"></span><span class="pn-cab-tx"><b class="pn-cab-t"></b><span class="pn-chips pn-cab-chips"></span></span><button type="button" class="pn-q" data-pn-q aria-label="Explicações" title="Explicações" aria-pressed="false" hidden>?</button><button type="button" class="pn-fav" data-pn-fav aria-label="Favorito" title="Favorito: sobe para o topo">☆</button>`;
      b.prepend(cab);
    }
    const r = reg(b);
    $('.pn-cab-ic', cab).textContent = r.ic;
    const t = tituloDe(b); if ($('.pn-cab-t', cab).textContent !== t) $('.pn-cab-t', cab).textContent = t;
    const h = htmlChips(resumo(b)); const ch = $('.pn-cab-chips', cab); if (ch.dataset.h !== h) { ch.innerHTML = h; ch.dataset.h = h; }
    $('.pn-fav', cab).textContent = b.classList.contains('fav') ? '★' : '☆';
    $('.pn-fav', cab).classList.toggle('on', b.classList.contains('fav'));
    $('.pn-fav', cab).hidden = !$('.bloco-fav', b);
    const q = $('.pn-q', cab); q.hidden = !$('.pn-exp', b); q.setAttribute('aria-pressed', String(b.classList.contains('pn-ajuda'))); q.classList.toggle('on', b.classList.contains('pn-ajuda'));
    return cab;
  }
  function abrir(id) {
    const b = document.getElementById(id);
    if (!b || !lancOn()) return false;
    if (aberto && aberto !== b) fechar(true);
    if (!aberto) scrollAntes = painel.scrollTop;
    aberto = b;
    eraFechado = b.classList.contains('fechado'); b.classList.remove('fechado');
    b.classList.toggle('pn-atalho', b.classList.contains('fora-da-aba') && !painel.classList.contains('buscando'));
    b.classList.add('pn-aberto'); painel.classList.add('pn-folha'); body.classList.add('pn-folha-on');
    melhorar(b); cabecalho(b);
    const ab = $('#abasMestre', painel), abVis = ab && !ab.hidden && getComputedStyle(ab).display !== 'none';
    painel.style.setProperty('--pn-topo', abVis ? (ab.offsetHeight - 16) + 'px' : '-14px');
    painel.scrollTop = 0;
    // dentro da gaveta da vista 3D quem rola é a gaveta: leva o topo do painel para o alto dela
    const sc = painel.closest('.s3d-gav-corpo'); if (sc) sc.scrollTop += painel.getBoundingClientRect().top - sc.getBoundingClientRect().top;
    const v = $('.pn-voltar', b); if (v && !('ontouchstart' in window)) try { v.focus({ preventScroll: true }); } catch (e) {}
    return true;
  }
  function fechar(trocando) {
    if (!aberto) return;
    const b = aberto; aberto = null;
    b.classList.remove('pn-aberto', 'pn-atalho');
    if (eraFechado) b.classList.add('fechado');
    if (!trocando) {
      painel.classList.remove('pn-folha'); body.classList.remove('pn-folha-on');
      desenharLanc(); painel.scrollTop = scrollAntes;
      const c = $(`[data-pn-abre="${b.id}"]`, lanc); if (c && !('ontouchstart' in window)) try { c.focus({ preventScroll: true }); } catch (e) {}
    }
  }
  painel.addEventListener('click', e => {
    if (e.target.closest('[data-pn-voltar]')) { fechar(); return; }
    const q = e.target.closest('[data-pn-q]');
    if (q) { const b = q.closest('.bloco'); b.classList.toggle('pn-ajuda'); cabecalho(b); return; }
    const f = e.target.closest('[data-pn-fav]');
    if (f) { const b = f.closest('.bloco'); const s = $('.bloco-fav', b); if (s) s.click(); setTimeout(() => cabecalho(b), 0); return; }
    const q2 = e.target.closest('.pn-q2');
    if (q2) { e.stopPropagation(); e.preventDefault(); const b = q2.closest('.bloco'); b.classList.toggle('pn-ajuda'); q2.classList.toggle('on', b.classList.contains('pn-ajuda')); }
  }, true);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !aberto) return;
    if (document.querySelector('.fil-modal, .fe-wrap, #fxModal:not([hidden]), .modal:not([hidden])')) return;
    if (e.target && e.target.matches && e.target.matches('input, textarea, select') && !e.target.closest('.painel-barra')) { e.target.blur(); return; }
    fechar();
  });
  // trocar de aba fecha a folha
  const abas = $('#abasMestre');
  if (abas) abas.addEventListener('click', e => { if (e.target.closest('[data-aba]')) { fechar(); setTimeout(desenharLanc, 0); } });

  /* =========================================================
     POR DENTRO DOS BLOCOS (idempotente; roda de novo quando o conteúdo é redesenhado)
     ========================================================= */
  // explicações longas e fixas viram "?" (as curtas e as que mostram estado continuam à vista)
  const FICA = /^(Nenhum|Nenhuma|Todas as|Contagem|🕒|Biblioteca|Rodada)/;
  function explicacoes(b) {
    $$('p.mini', b).forEach(p => {
      if (p.classList.contains('pn-exp') || p.classList.contains('pn-fica')) return;
      const t = (p.textContent || '').trim();
      const fica = p.id || p.querySelector('[id], button, input, select') || p.closest('details, .pn-cab, .fp-pop, .cartao') || p.classList.contains('alerta-mini') || t.length < 60 || FICA.test(t);
      p.classList.add(fica ? 'pn-fica' : 'pn-exp');
    });
    const h = $(':scope > h2', b) || $(':scope > .fp-topo h2', b);
    if (h && $('.pn-exp', b) && !$('.pn-q2', h)) {
      const q = document.createElement('span'); q.className = 'pn-q2'; q.setAttribute('role', 'button'); q.tabIndex = 0; q.title = 'Explicações'; q.setAttribute('aria-label', 'Mostrar explicações'); q.textContent = '?';
      q.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); q.click(); } });
      h.appendChild(q);
    }
  }

  // seções: em abas (uma por vez) ou recolhíveis. Cabeçalhos: h3 ou p.mesa-k filhos diretos da raiz.
  const SEC = {
    blocoFichasM: { modo: 'abas', rot: { 'Cobaias, NPCs e robôs': '👥 Cobaias e NPCs', 'Filhos da O.R.F.E.U.': '🩸 Filhos', 'Mover em grupo': '✋ Grupo' } },
    blocoCoresM: { modo: 'abas', raiz: '#listaCores' },
    blocoKitAux: { modo: 'abas', rot: { 'Filhos da O.R.F.E.U.': '🩸 Filhos', 'Seu robô S.T.A.F.F.': '🤖 Robô', 'Rolagem secreta': '🎲 Rolagem', 'Cores': '🎨 Cores' } },
    blocoSenhas: { modo: 'abas', raiz: '#listaSenhas', fixos: '.sn-botoes' },
    blocoSenhasAux: { modo: 'abas', raiz: '#listaSenhasAux', fixos: '.sn-botoes' },
    blocoMesaRetratos: { modo: 'abas', rot: { 'Na minha tela': '🖥 Na minha tela', 'Na tela de cada jogador': '👤 Nos jogadores' } },
    blocoMesaSessao: { modo: 'abas', raiz: '#mesaSessao', rot: { 'HOLOFOTE': '🔦 Holofote', 'COBAIA DA SESSÃO': '🏆 Cobaia', 'DILEMA': '❓ Dilema' }, rotRe: [[/^TENS/, t => '😰 Tensão ' + ((t.match(/\d+\s*%/) || [''])[0])]], chave: t => /^TENS/.test(t) ? 'TENSÃO' : t },
    blocoMesaAmb: { modo: 'dobras', raiz: '#mesaAmb', fechadas: ['TRILHA POR ANDAR', 'SONS PRÓPRIOS'] },
    blocoMomento: { modo: 'dobras', fechadas: ['Câmeras de segurança'] },
    blocoSahPers: { modo: 'dobras', fechadas: ['Filhos na perseguição', 'Fuga dos jogadores'] },
    blocoApagao: { modo: 'nada' },
    blocoMesaExpo: { modo: 'dobras', raiz: '#mesaExpo' }
  };
  let secSel = ls.get('acf-pn-sec', {}), secFech = ls.get('acf-pn-dobra', {});
  const rotDe = (cfg, t) => { if (cfg.rot && cfg.rot[t]) return cfg.rot[t]; for (const [re, v] of (cfg.rotRe || [])) if (re.test(t)) return typeof v === 'function' ? v(t) : v; return t.charAt(0) + t.slice(1).toLowerCase(); };
  function secoes(b) {
    const cfg = SEC[b.id]; if (!cfg || cfg.modo === 'nada') return;
    const raiz = cfg.raiz ? $(cfg.raiz, b) : b; if (!raiz) return;
    const filhos = [...raiz.children].filter(x => !x.matches('.pn-cab, .pn-tabs, h2, .fp-topo'));
    const heads = filhos.filter(x => x.matches('h3, p.mesa-k'));
    if (heads.length < 2 && cfg.modo === 'abas') return;
    if (!heads.length) return;
    const rot0 = heads.map(h => (h.textContent || '').replace(/\s+/g, ' ').trim());
    const rot = cfg.chave ? rot0.map(cfg.chave) : rot0;
    // cada elemento recebe a seção a que pertence (-1: antes da primeira, sempre à vista)
    let i = -1; const de = new Map();
    filhos.forEach(x => { if (heads.includes(x)) i = heads.indexOf(x); de.set(x, (cfg.fixos && x.matches(cfg.fixos)) ? -1 : i); });
    if (cfg.modo === 'abas') {
      let sel = rot.indexOf(secSel[b.id]); if (sel < 0) sel = 0;
      let tabs = raiz === b ? $(':scope > .pn-tabs', b) : (raiz.previousElementSibling && raiz.previousElementSibling.classList.contains('pn-tabs') ? raiz.previousElementSibling : null);
      if (!tabs) { tabs = document.createElement('div'); tabs.className = 'pn-tabs'; tabs.setAttribute('role', 'tablist'); (raiz === b ? heads[0] : raiz).before(tabs); }
      else if (raiz === b && tabs.nextElementSibling !== heads[0] && filhos.indexOf(heads[0]) >= 0) { /* mantém onde está */ }
      const html = rot0.map((t, k) => `<button type="button" role="tab" data-pn-sec="${k}" class="${k === sel ? 'on' : ''}" aria-selected="${k === sel}">${esc(rotDe(cfg, t))}</button>`).join('');
      if (tabs.dataset.h !== html) { tabs.innerHTML = html; tabs.dataset.h = html; }
      tabs.onclick = e => { const t = e.target.closest('[data-pn-sec]'); if (!t) return; secSel[b.id] = rot[+t.dataset.pnSec]; ls.set('acf-pn-sec', secSel); secoes(b); };
      filhos.forEach(x => { const s = de.get(x); x.classList.toggle('pn-esc', s >= 0 && s !== sel); x.classList.toggle('pn-sec-h', heads.includes(x)); });
      b.classList.add('pn-com-abas');
    } else {
      const fech = secFech[b.id] || Object.fromEntries((cfg.fechadas || []).map(t => [t, 1]));
      heads.forEach((h, k) => {
        h.classList.add('pn-dobra-h'); h.setAttribute('role', 'button'); h.tabIndex = 0;
        const f = !!fech[rot[k]]; h.classList.toggle('pn-fechada', f); h.setAttribute('aria-expanded', String(!f));
        if (!h.dataset.pnLig) {
          h.dataset.pnLig = '1';
          const alt = ev => { if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return; ev.preventDefault(); const cur = secFech[b.id] || Object.fromEntries((cfg.fechadas || []).map(t => [t, 1])); const r = (h.textContent || '').replace(/\s+/g, ' ').trim(); if (cur[r]) delete cur[r]; else cur[r] = 1; secFech[b.id] = cur; ls.set('acf-pn-dobra', secFech); secoes(b); };
          h.addEventListener('click', alt); h.addEventListener('keydown', alt);
        }
      });
      filhos.forEach(x => { const s = de.get(x); x.classList.toggle('pn-esc', s >= 0 && !heads.includes(x) && !!fech[rot[s]]); });
    }
  }

  // selects com poucas opções viram chips (o select continua no DOM e recebe o change)
  const SEL_CHIPS = ['#filtroDiario', '#replayQual', '#replayVel'];
  function selectsEmChips(b) {
    SEL_CHIPS.forEach(s => {
      const sel = $(s, b); if (!sel) return;
      let g = sel.nextElementSibling && sel.nextElementSibling.classList.contains('pn-selchips') ? sel.nextElementSibling : null;
      if (!g) {
        g = document.createElement('div'); g.className = 'pn-selchips'; g.setAttribute('role', 'radiogroup'); g.setAttribute('aria-label', sel.getAttribute('aria-label') || '');
        sel.after(g); sel.classList.add('pn-sel-oculto');
        g.addEventListener('click', e => { const c = e.target.closest('[data-v]'); if (!c) return; sel.value = c.dataset.v; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); sincSel(sel, g); });
        sel.addEventListener('change', () => sincSel(sel, g));
      }
      sincSel(sel, g);
    });
  }
  function sincSel(sel, g) {
    const html = [...sel.options].map(o => `<button type="button" role="radio" data-v="${esc(o.value)}" class="pn-chipbt${o.value === sel.value ? ' on' : ''}" aria-checked="${o.value === sel.value}">${esc(o.textContent)}</button>`).join('');
    if (g.dataset.h !== html) { g.innerHTML = html; g.dataset.h = html; }
  }

  // botões de atalho com emoji no começo: o emoji vira ícone (grade de ícones da cobaia)
  function iconesNosBotoes(b) {
    $$(':scope > button.btn-fantasma, .fil-acoes-jog button', b).forEach(bt => {
      if ($('.pn-ic', bt)) return;
      const tn = [...bt.childNodes].find(x => x.nodeType === 3 && x.textContent.trim());
      if (!tn) return;
      const m = tn.textContent.match(/^\s*([\p{Extended_Pictographic}☀-➿][️‍\p{Extended_Pictographic}]*)\s*/u);
      if (!m) return;
      const i = document.createElement('i'); i.className = 'pn-ic'; i.setAttribute('aria-hidden', 'true'); i.textContent = m[1];
      tn.textContent = tn.textContent.slice(m[0].length);
      const sp = document.createElement('span'); sp.className = 'pn-rot'; sp.textContent = tn.textContent.trim();
      tn.replaceWith(sp);
      bt.prepend(i);
    });
  }

  function melhorar(b) {
    if (!limpo() || !b) return;
    try { explicacoes(b); } catch (e) {}
    try { secoes(b); } catch (e) {}
    try { selectsEmChips(b); } catch (e) {}
    if (b.id === 'blocoMinha') try { iconesNosBotoes(b); const bo = $('.minha-topo .bola', b), fi = $('#minhaFicha', b); if (bo && fi) fi.style.setProperty('--pn-cor', bo.style.getPropertyValue('--cor') || '#8b5cf6'); } catch (e) {}
  }

  /* ---------- observa redesenhos (mesa.js, filhos.js etc. trocam o innerHTML) ---------- */
  const pend = new Set(); let tm = 0;
  const mo = new MutationObserver(ms => {
    // hidden regravado com o mesmo valor (x.hidden = true num bloco já escondido) também gera registro: não conta
    ms.forEach(m => { if (m.type === 'attributes' && (m.oldValue !== null) === m.target.hasAttribute('hidden')) return; if (m.type === 'attributes') pend.add(painel); const b = m.target.closest ? (m.target.matches && m.target.matches('#painel > .bloco') ? m.target : m.target.closest('#painel > .bloco')) : null; if (b) pend.add(b); else if (m.target === painel) pend.add(painel); });
    if (!tm) tm = setTimeout(() => { tm = 0; const l = [...pend]; pend.clear(); l.forEach(b => { if (b === painel) return; melhorar(b); if (b === aberto) cabecalho(b); }); if (l.includes(painel)) desenharLanc(); }, 60);
  });

  /* ---------- liga tudo ---------- */
  function aplicar() {
    const on = lancOn();
    body.classList.toggle('pn-lanc-on', on);
    lanc.hidden = !on;
    if (!on) { fechar(); }
    if (limpo()) blocos().forEach(melhorar);
    desenharLanc();
  }
  function tique() {
    if (!lancOn()) return;
    // 3D aberto e o painel fora da gaveta do 3D: ninguém vê o lançador (redesenhar lia o layout à toa a cada 1,2 s)
    if (body.classList.contains('s3d-aberta') && !painel.closest('#s3dGaveta:not([hidden])')) return;
    if (aberto) {
      // o bloco aberto sumiu (perfil, aba, fim de perseguição): volta à lista
      if (aberto.hidden || !painel.contains(aberto) || (aberto.classList.contains('fora-da-aba') && !painel.classList.contains('buscando') && !aberto.classList.contains('pn-atalho'))) { fechar(); return; }
      cabecalho(aberto);
    } else desenharLanc();
  }
  function iniciar() {
    mo.observe(painel, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'], attributeOldValue: true });
    aplicar();
    setInterval(() => { if (!document.hidden) tique(); }, 1200);
    document.addEventListener('acf-perfil', () => setTimeout(() => { fechar(); aplicar(); }, 30));
    document.addEventListener('acf-pn', () => setTimeout(aplicar, 0));
    const busca = $('#painelBusca');
    document.addEventListener('acf-pn-busca', () => { if (busca && busca.value.trim()) fechar(); desenharLanc(); });
  }
  if (document.readyState === 'complete') setTimeout(iniciar, 120); else window.addEventListener('load', () => setTimeout(iniciar, 120));

  // API pequena: outros módulos (e os testes) abrem um bloco pelo id
  window.ACF_PN = {
    abrir: id => { const b = document.getElementById(id); if (!b) return false; if (!lancOn()) { if (b.classList.contains('fechado')) { const h = $('h2.dobra', b); if (h) h.click(); } return true; } return abrir(id); },
    fechar: () => fechar(),
    get aberto() { return aberto ? aberto.id : null; },
    get ligado() { return lancOn(); },
    redesenhar: () => aplicar()
  };
})();
