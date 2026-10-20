/* =========================================================
   ferramentas.js · ferramentas que antes eram sites separados
   1. Calculadora de NEX (Mestre): exposição paranormal das cobaias.
      Histórico em segredos/_nex (só o Mestre); o valor atual vai para mapa/nex (todos leem).
   2. Senhas (Mestre e auxiliares): andares, chave da Parede, códigos dos cofres do Arquivo e outras.
      Texto das senhas em "senhas" (Mestre e auxiliares leem, só o Mestre grava);
      o que confere a senha do andar é só o hash, em mapa/senhasAndar.
   3. Parede de Desejos: chama o mesmo Cloudflare Worker do site antigo (a chave da IA fica lá).
      A contagem de desejos continua no Worker; cada desejo e o preço vão para "desejos" (só o Mestre lê).
   ========================================================= */
(() => {
const A = window.ACF;
if (!A) return;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = A.esc;
const num = (v, p = 0) => { const n = parseFloat(v); return isFinite(n) ? n : p; };
const int = v => Math.round(num(v));
const est = () => A.estado || {};
const sg = () => A.segredos || {};
const cobaias = () => (A.SERES || []).filter(x => x.tipo === 'cobaia');
const nomeDe = id => (A.SER[id] || {}).nome || id || '';
const ls = { get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const MESA = () => window.ACF_MESA || {};
const somOk = () => !A.mudo && A.Som && A.Som.tom;
const dataHora = ts => { const d = new Date(num(ts)); return { data: d.toLocaleDateString('pt-BR'), hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }; };
// não redesenha um bloco enquanto alguém digita nele
function semFoco(sel) { const e = $(sel), a = document.activeElement; return !!e && !(a && e.contains(a) && a.matches('input:not([type=checkbox]), select, textarea')); }
function baixar(nome, obj) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function lerArquivo(cb) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
  i.onchange = () => { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { let o = null; try { o = JSON.parse(r.result); } catch (e) {} cb(o); }; r.readAsText(f); };
  i.click();
}
const copiar = (txt, msg) => (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => A.aviso(msg || 'Copiado.'), () => { window.prompt('Copie:', txt); });

/* =========================================================
   1. CALCULADORA DE NEX
   Mesmos gatilhos, NEX inicial e cores da calculadora antiga. NEX vai de 0 a 99.
   NEX aqui é só exposição paranormal: o nível do personagem fica na ficha.
   ========================================================= */
const GATILHOS = [
  { k: 'criatura', l: 'Exposição à criatura', d: 2 },
  { k: 'medo_leve', l: 'Exposição leve à sala de medo', d: 2 },
  { k: 'medo_mod', l: 'Exposição moderada à sala de medo', d: 3 },
  { k: 'ritual', l: 'Aprender Ritual', d: 1 },
  { k: 'transcender', l: 'Transcender', d: 1 },
];
const NEX_INICIAL = { faca: 11, sabonete: 10, mostarda: 22, papelao: 20, papel: 15, luva: 11, velcro: 24 };
const CHAVE_CALC_ANTIGA = 'caixa-fosforos:nex:eventos:v1';   // mesmo endereço (toshiro01001.github.io): dá para ler daqui
const TETO = 99, PISO = 0;
const limitar = v => Math.max(PISO, Math.min(TETO, v));
const corNex = n => (n <= 20 ? '#ead63c' : n <= 40 ? '#d9a521' : n <= 60 ? '#e0701f' : n <= 80 ? '#cf2f2a' : '#b3246a');
const codCurto = id => String((A.SER[id] || {}).codigo || '').replace(/^FHP-/, '');
const idDoCodigo = c => (cobaias().find(x => codCurto(x.id) === String(c).padStart(3, '0')) || {}).id;
// o histórico da Calculadora mora em "nexCalc" (Mestre e auxiliares leem e gravam)
const NXC = { dados: null, pronto: false, off: null, de: '', vistos: null, meus: new Set() };
const nexSg = () => NXC.dados || {};
const podeNex = () => A.mestre || !!A.aux;
function ligarNexCalc() {
  const quem = A.mestre ? 'm' : A.aux ? 'a' : '';
  if (NXC.de === quem) return;
  if (NXC.off) { NXC.off(); NXC.off = null; }
  NXC.de = quem; NXC.dados = null; NXC.pronto = false; NXC.vistos = null;
  if (!quem) return;
  A.garantirLogin().then(() => {
    if (NXC.de !== quem) return;
    NXC.off = A.Rede.on('nexCalc', v => { NXC.dados = v || {}; NXC.pronto = true; aoMudarNexCalc(); tudo(); desenharNex(); }, () => { NXC.dados = {}; NXC.pronto = true; });
  }, () => {});
}
function gravarNx(cam, v) {
  if (v === undefined) v = null;
  NXC.dados = NXC.dados || {};
  let o = NXC.dados;
  for (let i = 0; i < cam.length - 1; i++) { if (!o[cam[i]] || typeof o[cam[i]] !== 'object') o[cam[i]] = {}; o = o[cam[i]]; }
  if (v === null) delete o[cam[cam.length - 1]]; else o[cam[cam.length - 1]] = JSON.parse(JSON.stringify(v));
  A.Rede.set('nexCalc/' + cam.join('/'), v).catch(() => A.aviso('O servidor recusou a gravação do NEX.'));
}
// mudanças feitas por outra tela (Mestre ou auxiliar): o Mestre registra no Relatório; quem não aplicou recebe os marcos
function aoMudarNexCalc() {
  const ev = nexSg().ev || {}, ks = Object.keys(ev);
  if (NXC.vistos === null) { NXC.vistos = new Set(ks); return; }
  ks.forEach(k => {
    if (NXC.vistos.has(k)) return;
    NXC.vistos.add(k);
    if (NXC.meus.has(k)) return;
    const e = ev[k]; if (!e || !e.s) return;
    if (A.mestre && MESA().registrarRel) MESA().registrarRel('nex', e.s, e.d, e.l, 'n' + k);
    const depois = nexAtual(e.s);
    avisarMarcos(e.s, limitar(somaAte(e.s) - int(e.d)), depois);
  });
  [...NXC.vistos].forEach(k => { if (!ev[k]) { NXC.vistos.delete(k); if (A.mestre) A.Rede.set('relatorio/ev/n' + k, null).catch(() => {}); } });
}
const baseDe = id => { const b = (nexSg().base || {})[id]; return typeof b === 'number' ? b : (NEX_INICIAL[id] !== undefined ? NEX_INICIAL[id] : 0); };
// "chave" = id do registro no servidor; "k" = qual gatilho foi usado (criatura, sala…, ajuste)
const eventosNex = () => Object.entries(nexSg().ev || {}).filter(([, e]) => e && e.s).map(([chave, e]) => ({ ...e, chave })).sort((a, b) => num(a.ts) - num(b.ts));
const somaAte = (id, ate = Infinity) => baseDe(id) + eventosNex().filter(e => e.s === id && num(e.ts) <= ate).reduce((t, e) => t + int(e.d), 0);
const nexAtual = id => limitar(somaAte(id));
const ultimoEv = id => eventosNex().filter(e => e.s === id).pop() || null;
const N = { aba: 'calc', filtro: 'todos' };
// Marcos de NEX: valores da regra opcional "NEX & Experiência" (Sobrevivendo ao Horror, p. 98 a 103). O Mestre edita em Ajustes.
const MARCOS_PADRAO = [
  { v: 25, t: 'Alterações gerais (SaH p. 99): pode testar Ocultismo sem ser treinado (+2 se for treinado) e sofre −5 em Diplomacia, Enganação ou Intimidação, à escolha.' },
  { v: 35, t: 'Alterações gerais (SaH p. 99): coincidências paranormais passam a acontecer ao redor; soma um atributo à escolha (exceto Presença) ao total de PE e sofre −5 em Atletismo, Fortitude ou Reflexos.' },
  { v: 50, t: 'SaH p. 99: no próximo Transcender, ganha afinidade com Conhecimento, Energia, Morte ou Sangue e passa a receber as alterações desse elemento.' },
  { v: 60, t: 'Alteração do elemento da afinidade, grau 60% (SaH p. 100 a 103).' },
  { v: 75, t: 'Alteração do elemento da afinidade, grau 75% (SaH p. 100 a 103).' },
  { v: 90, t: 'Alteração do elemento da afinidade, grau 90% (SaH p. 100 a 103).' },
  { v: 99, t: 'Limite da exposição (SaH p. 99): só uma desconjuração passa de 99%.' },
];
const marcos = () => { const m = nexSg().marcos; const l = m ? Object.values(m).filter(x => x && num(x.v) > 0) : MARCOS_PADRAO; return l.map(x => ({ v: limitar(int(x.v)), t: String(x.t || '') })).sort((a, b) => a.v - b.v); };
const proxMarco = n => marcos().find(m => m.v > n) || null;
function avisarMarcos(id, antes, depois) {
  marcos().filter(m => antes < m.v && depois >= m.v).forEach(m => {
    if (A.alertaMestre) A.alertaMestre(`☢ ${nomeDe(id)} chegou a NEX ${m.v}%. ${m.t}`);
    A.diario && A.diario('nex', `${nomeDe(id)} chegou a NEX ${m.v}%: ${m.t}`);
  });
}

// manda os valores atuais para o mapa (fichas, HUD e cartão leem de lá)
function publicarNex() {
  if (!podeNex() || !NXC.pronto) return;
  const atual = est().nex || {};
  cobaias().forEach(x => { const v = nexAtual(x.id); if (atual[x.id] !== v) A.definir(['nex', x.id], v); });
}
function aplicarNex(id, g, motivo) {
  const antes = nexAtual(id);
  const k = A.Rede.chave();
  const ev = g ? { s: id, k: g.k, l: g.l, d: g.d, ts: Date.now() } : { s: id, k: 'ajuste', l: motivo.l, d: motivo.d, ts: Date.now() };
  NXC.meus.add(k); if (NXC.vistos) NXC.vistos.add(k);
  gravarNx(['ev', k], ev);
  publicarNex();
  if (MESA().registrarRel) MESA().registrarRel('nex', id, ev.d, ev.l, 'n' + k);
  A.diario && A.diario('nex', `${nomeDe(id)}: ${ev.l} (${ev.d > 0 ? '+' : ''}${ev.d}) · NEX ${nexAtual(id)}%`);
  if (somOk()) A.Som.tom(ev.d > 0 ? 330 : 220, 0, 0.15, 'triangle', 0.06);
  avisarMarcos(id, antes, nexAtual(id));
  desenharNex();
}
function reverterNex(k) {
  gravarNx(['ev', k], null);
  publicarNex();
  A.Rede.set('relatorio/ev/n' + k, null).catch(() => {});
  desenharNex();
}
// lista da calculadora antiga ([{eid, char:'001', key, label, delta, ts}]) → eventos daqui
function eventosDaCalcAntiga(lista) {
  const out = {};
  (Array.isArray(lista) ? lista : []).forEach(e => {
    const id = e && idDoCodigo(e.char), d = int(e && e.delta);
    if (!id || !d || !num(e.ts)) return;
    const k = 'c' + String(e.eid || (e.ts + '-' + e.char)).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
    out[k] = { s: id, k: String(e.key || 'ajuste').slice(0, 20), l: String(e.label || 'Aumento de NEX').slice(0, 80), d, ts: num(e.ts) };
  });
  return out;
}
function importarEventos(novos, origem) {
  const ev = nexSg().ev || {};
  const so = Object.fromEntries(Object.entries(novos).filter(([k]) => !ev[k]));
  const n = Object.keys(so).length;
  if (!n) { A.aviso(`Nada novo ${origem}: esses registros já estão na Planta.`); return; }
  if (!confirm(`Trazer ${n} registro${n === 1 ? '' : 's'} de NEX ${origem}? Os que já existem na Planta ficam como estão.`)) return;
  gravarNx(['ev'], { ...ev, ...so });
  publicarNex(); desenharNex();
  A.aviso(`${n} registro${n === 1 ? '' : 's'} de NEX importado${n === 1 ? '' : 's'}.`);
}
const antigosNesteNavegador = () => { let l = []; try { l = JSON.parse(localStorage.getItem(CHAVE_CALC_ANTIGA) || '[]'); } catch (e) {} const ev = nexSg().ev || {}; return Object.keys(eventosDaCalcAntiga(l)).filter(k => !ev[k]).length; };
function exportarNex() {
  // mesmo formato da calculadora antiga (dá para importar lá também)
  const lista = eventosNex().map(e => ({ eid: e.chave, char: codCurto(e.s), key: e.k || 'ajuste', label: e.l, delta: int(e.d), ts: num(e.ts) }));
  baixar(`caixa-de-fosforos-nex-${new Date().toISOString().slice(0, 10)}.json`, lista);
}

/* ---------- sugestões automáticas (o Mestre confirma) ----------
   Presença Perturbadora chamada, cobaia entrando numa sala de Medo, ritual aprendido ou Transcender
   escolhido na ficha (o jogador avisa por "avisos", que só o Mestre lê). Nada sobe sozinho. */
const KEY_SUG = 'acf-sug-nex';
const SUG = { lista: ls.get(KEY_SUG, []), chamado: undefined, salas: null, avisosOff: null, visto: ls.get('acf-avisos-visto', 0) };
const salvarSug = () => ls.set(KEY_SUG, SUG.lista.slice(-30));
const GAT = k => GATILHOS.find(g => g.k === k);
function sugerir(s, motivo, ops, chave) {
  if (!A.mestre || !(A.SER[s] || {}).nome) return;
  if (chave && SUG.lista.some(x => x.chave === chave)) return;
  const x = { id: A.Rede.chave(), s, motivo: String(motivo).slice(0, 140), ops, chave: chave || '', ts: Date.now() };
  SUG.lista.push(x); salvarSug();
  // alerta com botões, além da lista no bloco da Calculadora
  const caixa = $('#alertasMestre');
  if (caixa) {
    const d = document.createElement('div'); d.className = 'alerta-mestre sug-nex'; d.dataset.sug = x.id;
    d.innerHTML = `<span>☢ ${esc(nomeDe(s))}: ${esc(x.motivo)}</span><div class="sug-botoes">${ops.map(k => { const g = GAT(k); return `<button data-sug="aplicar" data-id="${x.id}" data-g="${k}">+${g.d} ${esc(g.l)}</button>`; }).join('')}<button data-sug="ignorar" data-id="${x.id}">Ignorar</button></div>`;
    caixa.prepend(d);
    setTimeout(() => d.remove(), 60000);
  }
  if (somOk()) { A.Som.tom(520, 0, 0.12, 'triangle', 0.06); A.Som.tom(390, 0.14, 0.18, 'triangle', 0.06); }
  desenharMesaNex();
}
function resolverSug(id, g) {
  const x = SUG.lista.find(y => y.id === id); if (!x) return;
  if (g) { const gt = GAT(g); if (gt) aplicarNex(x.s, gt); }
  SUG.lista = SUG.lista.filter(y => y.id !== id); salvarSug();
  $$(`[data-sug="aplicar"][data-id="${id}"], [data-sug="ignorar"][data-id="${id}"]`).forEach(b => { const a = b.closest('.alerta-mestre'); if (a) a.remove(); });
  desenharMesaNex(); desenharNex();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-sug]'); if (!b || !A.mestre) return;
  if (b.dataset.sug === 'aplicar') resolverSug(b.dataset.id, b.dataset.g);
  else if (b.dataset.sug === 'ignorar') resolverSug(b.dataset.id, null);
  else if (b.dataset.sug === 'limpar') { SUG.lista = []; salvarSug(); $$('.sug-nex').forEach(a => a.remove()); desenharMesaNex(); }
});
const posNaPlanta = cn => ((cn - 1) % 25) + 1;
function vigiarSugestoes() {
  if (!A.mestre || !A.pronto) { SUG.chamado = undefined; SUG.salas = null; return; }
  // Presença Perturbadora: um chamado novo sugere "exposição à criatura" para cada alvo
  const ch = est().chamado;
  const idCh = ch && ch.t === 'presenca' ? ch.id : null;
  if (SUG.chamado === undefined) SUG.chamado = idCh;
  else if (idCh && idCh !== SUG.chamado) {
    SUG.chamado = idCh;
    Object.keys(ch.alvos || {}).filter(id => (A.SER[id] || {}).tipo === 'cobaia').forEach(id => sugerir(id, `Presença Perturbadora de ${ch.nome || 'criatura'}`, ['criatura'], 'pp:' + idCh + ':' + id));
  }
  // salas de Medo (a Zona Neutra, posição 25, fica de fora)
  const agora = {};
  cobaias().forEach(x => { agora[x.id] = A.salaDe(x.id); });
  if (SUG.salas) cobaias().forEach(x => {
    const cn = agora[x.id];
    if (!cn || cn === SUG.salas[x.id] || posNaPlanta(cn) === 25) return;
    const info = A.infoSala ? A.infoSala(cn) : ['', '?'];
    if (info[1] === 'F') sugerir(x.id, `entrou na CN ${String(cn).padStart(2, '0')}${info[0] ? ' · ' + info[0] : ''} (sala de Medo)`, ['medo_leve', 'medo_mod'], 'sala:' + x.id + ':' + cn + ':' + Math.floor(Date.now() / 60000));
  });
  SUG.salas = agora;
  // avisos que os jogadores mandam (ritual, Transcender, cofre aberto)
  if (!SUG.avisosOff) SUG.avisosOff = A.Rede.on('avisos', v => {
    Object.entries(v || {}).sort((a, b) => num(a[1].ts) - num(b[1].ts)).forEach(([k, x]) => {
      if (!x) return;
      if (num(x.ts) > SUG.visto) {
        if (x.t === 'ritual') sugerir(x.s, `aprendeu o ritual ${x.x || ''}`.trim(), ['ritual'], 'av:' + k);
        else if (x.t === 'transcender') sugerir(x.s, 'escolheu Transcender na ficha', ['transcender'], 'av:' + k);
        else if (x.t === 'noite') {
          // ação da noite (esgueirar-se, alerta ou ação noturna de uma regra restrita): só o Mestre vê
          const tem = x.tot !== undefined && x.tot !== null && int(x.tot) >= 0;
          A.gravarSegredo(['_noite', String(x.it || 'avulso').replace(/[.#$\[\]/]/g, ''), k], { s: x.s, k: String(x.k || '').slice(0, 10), x: x.x || '', alvo: x.alvo || '', tot: tem ? int(x.tot) : null, nat: tem ? int(x.nat) : null, r: String(x.r || '').slice(0, 40), at: String(x.at || '').slice(0, 30), si: x.si ? true : null, ts: num(x.ts) });
          if (A.alertaMestre) A.alertaMestre(`🌙 ${nomeDe(x.s)}: ${x.x || 'ação noturna'}${x.alvo ? ' → ' + nomeDe(x.alvo) : ''}${tem ? ` · Furtividade ${int(x.tot)}` : ''}`);
        }
        else if (x.t === 'cofre') {
          if (A.alertaMestre) A.alertaMestre(`🔓 ${x.s === 'aux' ? 'Um auxiliar' : nomeDe(x.s)} abriu o cofre: ${x.x || ''}`);
          if (MESA().registrarRel) MESA().registrarRel('cofre', x.s, 0, x.x || '', 'c' + k);
        }
        SUG.visto = Math.max(SUG.visto, num(x.ts)); ls.set('acf-avisos-visto', SUG.visto);
      }
      A.Rede.set('avisos/' + k, null).catch(() => {});   // já lido: limpa
    });
  }, () => {});
}
// jogador: ritual ou Transcender adicionado pelo catálogo da ficha → aviso para o Mestre
document.addEventListener('acf-ficha-add', e => {
  const d = e.detail || {}; if (A.mestre || !d.s) return;
  A.Rede.set('avisos/' + A.Rede.chave(), { t: d.tipo === 'rit' ? 'ritual' : 'transcender', s: d.s, x: d.tipo === 'rit' ? `${d.n} (${d.c}º círculo)`.slice(0, 120) : 'Transcender', ts: Date.now() }).catch(() => {});
});

/* ---------- bloco da Mesa ---------- */
function desenharMesaNex() {
  const c = $('#mesaNex'); if (!c || !podeNex() || !semFoco('#mesaNex')) return;
  // sem o histórico ainda: mostra o que está no mapa e tenta de novo logo
  const pronto = NXC.pronto;
  if (!pronto) setTimeout(desenharMesaNex, 1000);
  const valor = id => (pronto ? nexAtual(id) : (typeof (est().nex || {})[id] === 'number' ? est().nex[id] : baseDe(id)));
  const ant = pronto ? antigosNesteNavegador() : 0;
  const html = `<p class="mini">Exposição paranormal das cobaias (não é o nível). Cada aumento entra no histórico, na ficha do jogador e no Relatório.</p>
    ${pronto ? '' : '<p class="mini">Carregando o histórico…</p>'}
    <ul class="nx-mini">${cobaias().map(x => { const n = valor(x.id); return `<li style="--nex:${corNex(n)}"><span>${esc(x.nome)}</span><i><b style="width:${n}%"></b></i><strong>${n}%</strong></li>`; }).join('')}</ul>
    ${A.mestre && SUG.lista.length ? `<div class="sug-lista"><p class="mesa-k">SUGESTÕES DE NEX (${SUG.lista.length})</p>${SUG.lista.slice().reverse().map(x => `<div class="sug-item"><span><b>${esc(nomeDe(x.s))}</b> ${esc(x.motivo)} <small>${dataHora(x.ts).hora}</small></span><div class="sug-botoes">${x.ops.map(k => { const g = GAT(k); return g ? `<button data-sug="aplicar" data-id="${x.id}" data-g="${k}">+${g.d} ${esc(g.l)}</button>` : ''; }).join('')}<button data-sug="ignorar" data-id="${x.id}">Ignorar</button></div></div>`).join('')}<button data-sug="limpar" class="sug-limpar">Ignorar todas</button></div>` : ''}
    ${ant ? `<p class="nx-aviso">Encontrei ${ant} registro${ant === 1 ? '' : 's'} da Calculadora de NEX antiga neste navegador. <button data-nxm="antigos">Trazer para a Planta</button></p>` : ''}
    <button data-nxm="abrir" class="btn-protocolo">☢ Abrir a Calculadora de NEX</button>`;
  if (c.dataset.html !== html) { c.innerHTML = html; c.dataset.html = html; }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-nxm]'); if (!b || !podeNex()) return;
  if (b.dataset.nxm === 'abrir') abrirNex();
  if (b.dataset.nxm === 'antigos') { let l = []; try { l = JSON.parse(localStorage.getItem(CHAVE_CALC_ANTIGA) || '[]'); } catch (er) {} importarEventos(eventosDaCalcAntiga(l), 'da calculadora antiga deste navegador'); desenharMesaNex(); }
});

/* ---------- janela da calculadora ---------- */
function abrirNex(aba) {
  if (!podeNex()) return;
  let o = $('#nexTela');
  if (!o) {
    o = document.createElement('div'); o.id = 'nexTela'; o.className = 'nex-tela';
    o.innerHTML = `<div class="nx-caixa"><header class="nx-cab"><div><span>PROGRESSO DA CAIXA DE FÓSFOROS</span><h2>Calculadora de NEX</h2></div>
      <nav class="nx-abas"><button data-nx="aba" data-v="calc">Calculadora</button><button data-nx="aba" data-v="hist">Histórico</button><button data-nx="aba" data-v="cfg">Ajustes</button></nav>
      <button data-nx="fechar" class="nx-x" aria-label="Fechar">×</button></header><div class="nx-corpo" id="nxCorpo"></div></div>`;
    document.body.appendChild(o);
    o.addEventListener('click', aoClicarNex);
    o.addEventListener('change', e => {
      const i = e.target;
      if (i.dataset.base) { const v = i.value === '' ? null : limitar(int(i.value)); gravarNx(['base', i.dataset.base], v); publicarNex(); desenharNex(); }
    });
  }
  if (aba) N.aba = aba;
  o.hidden = false;
  publicarNex();
  desenharNex(true);
}
function fecharNex() { const o = $('#nexTela'); if (o) o.hidden = true; }
function desenharNex(forcar) {
  desenharMesaNex();
  const o = $('#nexTela'); if (!o || o.hidden) return;
  if (!forcar && !semFoco('#nxCorpo')) return;
  $$('.nx-abas button', o).forEach(b => b.classList.toggle('on', b.dataset.v === N.aba));
  const c = $('#nxCorpo');
  let html = '';
  if (N.aba === 'calc') {
    html = `<div class="nx-grade">${cobaias().map(x => {
      const n = nexAtual(x.id), u = ultimoEv(x.id), aberto = N.abertos && N.abertos[x.id];
      return `<article class="nx-card" style="--nex:${corNex(n)}"><div class="nx-card-cab"><span>FHP · ${esc(codCurto(x.id))}</span><b>${esc(x.nome)}</b></div>
        <div class="nx-leitura"><span class="nx-num">${n}</span><span class="nx-pct">%</span><span class="nx-rot">NEX</span></div>
        <div class="nx-barra"><i style="width:${n}%"></i>${marcos().map(m => `<em style="left:${m.v}%" title="Marco ${m.v}%" class="${n >= m.v ? 'ok' : ''}"></em>`).join('')}</div><div class="nx-marcas"><span>0%</span><span>${(pm => (pm ? `próximo marco: ${pm.v}%` : 'todos os marcos'))(proxMarco(n))}</span><span>99%</span></div>
        <div class="nx-passo" role="group" aria-label="Mudar o NEX de ${esc(x.nome)}"><button data-nx="passo" data-id="${x.id}" data-d="-5" aria-label="Tirar 5">−5</button><button data-nx="passo" data-id="${x.id}" data-d="-1" aria-label="Tirar 1">−1</button><button data-nx="passo" data-id="${x.id}" data-d="1" aria-label="Somar 1">+1</button><button data-nx="passo" data-id="${x.id}" data-d="5" aria-label="Somar 5">+5</button><button data-nx="definir" data-id="${x.id}" title="Definir o valor exato">= …</button></div>
        <details class="nx-aumento" data-id="${x.id}" ${aberto ? 'open' : ''}><summary>Gatilhos e ajuste com motivo</summary>
          <div class="nx-gatilhos">${GATILHOS.map(g => `<button data-nx="gat" data-id="${x.id}" data-g="${g.k}"><span>${esc(g.l)}</span><b>+${g.d}</b></button>`).join('')}</div>
          <div class="nx-ajuste"><input type="number" step="1" data-aj="${x.id}" placeholder="±" aria-label="Valor do ajuste"><input data-ajm="${x.id}" maxlength="60" placeholder="Motivo do ajuste"><button data-nx="ajuste" data-id="${x.id}">Aplicar</button></div>
        </details>
        ${u ? `<button class="nx-desfazer" data-nx="rev" data-k="${esc(u.chave)}">↩ desfazer último (${esc(u.l)} ${int(u.d) > 0 ? '+' : ''}${int(u.d)})</button>` : ''}</article>`; }).join('')}</div>`;
  } else if (N.aba === 'hist') {
    let lista = eventosNex();
    if (N.filtro !== 'todos') lista = lista.filter(e => e.s === N.filtro);
    lista = lista.reverse();
    html = `<div class="nx-filtros">${[['todos', 'Todos']].concat(cobaias().map(x => [x.id, `${codCurto(x.id)} ${x.nome}`])).map(([k, n]) => `<button data-nx="filtro" data-v="${k}" class="${N.filtro === k ? 'on' : ''}">${esc(n)}</button>`).join('')}</div>
      <div class="nx-linha">${lista.length ? lista.map(e => { const r = limitar(somaAte(e.s, num(e.ts))), q = dataHora(e.ts);
        return `<div class="nx-reg" style="--nex:${corNex(r)}"><div class="nx-quando"><b>${q.data}</b>${q.hora}</div><div class="nx-oque"><div class="nx-alvo">FHP · ${esc(codCurto(e.s))} ${esc(nomeDe(e.s))}</div><div class="nx-causa">${esc(e.l)}</div></div>
          <div class="nx-delta"><div class="nx-mais">${int(e.d) > 0 ? '+' : ''}${int(e.d)}</div><div class="nx-res">NEX → ${r}%</div></div><button class="nx-rev" data-nx="rev" data-k="${esc(e.chave)}">reverter</button></div>`; }).join('')
        : '<p class="nx-vazio">Nenhum aumento registrado ainda. A Caixa de Fósforos ainda dorme.</p>'}</div>`;
  } else {
    const ant = antigosNesteNavegador();
    html = `<section class="nx-cfg"><h3>NEX inicial</h3><p class="mini">O valor de partida de cada cobaia, antes dos aumentos. Vazio volta ao padrão da calculadora antiga.</p>
      <div class="nx-bases">${cobaias().map(x => { const b = (nexSg().base || {})[x.id]; return `<label><span>${esc(x.nome)}</span><input type="number" min="0" max="99" data-base="${x.id}" value="${typeof b === 'number' ? b : ''}" placeholder="${NEX_INICIAL[x.id] !== undefined ? NEX_INICIAL[x.id] : 0}"></label>`; }).join('')}</div>
      <h3>Marcos de NEX</h3><p class="mini">Quando uma cobaia passa de um marco, você recebe um alerta com o texto. Os valores e textos padrão vêm da regra opcional "NEX &amp; Experiência" (Sobrevivendo ao Horror, p. 98 a 103), que separa nível e NEX como nesta campanha.</p>
      <div class="nx-marcos-ed">${marcos().map((m, i) => `<div class="nx-marco-l"><input type="number" min="1" max="99" data-mv="${i}" value="${m.v}" aria-label="Valor"><input data-mt="${i}" maxlength="240" value="${esc(m.t)}" aria-label="Texto do marco"><button data-nx="marco-tirar" data-i="${i}" aria-label="Tirar">×</button></div>`).join('')}</div>
      <div class="nx-botoes"><button data-nx="marco-novo">+ Marco</button><button data-nx="marco-salvar" class="nx-pri">Salvar marcos</button><button data-nx="marco-padrao">Voltar ao padrão do livro</button></div>
      <h3>Backup e calculadora antiga</h3>
      <p class="mini">Exportar baixa o histórico no mesmo formato da calculadora antiga. Importar aceita o backup dela ou o daqui e só acrescenta o que faltar.</p>
      <div class="nx-botoes"><button data-nx="exportar">⬇ Exportar backup</button><button data-nx="importar">⬆ Importar backup…</button>${ant ? `<button data-nx="antigos" class="nx-pri">Trazer ${ant} registro${ant === 1 ? '' : 's'} deste navegador</button>` : ''}</div>
      <h3>Zerar</h3><div class="nx-botoes"><button data-nx="zerar" class="nx-perigo">Apagar todo o histórico de NEX</button></div></section>`;
  }
  if (forcar || c.dataset.html !== html) { const rol = c.scrollTop; c.innerHTML = html; c.dataset.html = html; c.scrollTop = rol; }
}
function aoClicarNex(e) {
  const o = $('#nexTela');
  if (e.target === o) { fecharNex(); return; }
  const sm = e.target.closest('summary');
  if (sm) { const d = sm.parentElement; N.abertos = N.abertos || {}; setTimeout(() => { N.abertos[d.dataset.id] = d.open; }, 0); return; }
  const b = e.target.closest('[data-nx]'); if (!b) return;
  const a = b.dataset.nx;
  if (a === 'fechar') fecharNex();
  else if (a === 'aba') { N.aba = b.dataset.v; desenharNex(true); }
  else if (a === 'filtro') { N.filtro = b.dataset.v; desenharNex(true); }
  else if (a === 'gat') { const g = GATILHOS.find(x => x.k === b.dataset.g); if (g) { aplicarNex(b.dataset.id, g); desenharNex(true); } }
  else if (a === 'passo') {
    // +1/+5/−1/−5: só o que cabe entre 0% e 99% vira registro
    const id = b.dataset.id, cur = nexAtual(id), d = limitar(cur + int(b.dataset.d)) - cur;
    if (!d) { A.aviso(cur >= TETO ? 'Já está no máximo (99%).' : 'Já está em 0%.'); return; }
    aplicarNex(id, null, { l: d > 0 ? 'Ajuste manual (aumento)' : 'Ajuste manual (redução)', d }); desenharNex(true);
  }
  else if (a === 'definir') {
    const id = b.dataset.id, cur = nexAtual(id);
    const v = prompt(`Novo NEX de ${nomeDe(id)} (0 a 99). Hoje: ${cur}%`, String(cur)); if (v === null) return;
    const alvo = limitar(int(v)), d = alvo - cur; if (!d) return;
    aplicarNex(id, null, { l: `Ajuste: definido em ${alvo}%`, d }); desenharNex(true);
  }
  else if (a === 'ajuste') {
    const id = b.dataset.id, v = int($(`[data-aj="${id}"]`, o).value), m = ($(`[data-ajm="${id}"]`, o).value || '').trim();
    if (!v) { A.aviso('Digite quanto somar ou tirar (ex.: 2 ou -1).'); return; }
    const cur = nexAtual(id), d = limitar(cur + Math.max(-99, Math.min(99, v))) - cur;
    if (!d) { A.aviso(cur >= TETO ? 'Já está no máximo (99%).' : 'Já está em 0%.'); return; }
    aplicarNex(id, null, { l: m ? `Ajuste: ${m}`.slice(0, 80) : 'Ajuste manual', d }); desenharNex(true);
  }
  else if (a === 'rev') { const ev = (nexSg().ev || {})[b.dataset.k]; if (ev && confirm(`Reverter "${ev.l}" de ${nomeDe(ev.s)}?`)) { reverterNex(b.dataset.k); desenharNex(true); } }
  else if (a === 'exportar') exportarNex();
  else if (a === 'importar') lerArquivo(obj => { if (!Array.isArray(obj)) { A.aviso('Arquivo inválido: use o backup da Calculadora de NEX.'); return; } importarEventos(eventosDaCalcAntiga(obj), 'do arquivo'); desenharNex(true); });
  else if (a === 'antigos') { let l = []; try { l = JSON.parse(localStorage.getItem(CHAVE_CALC_ANTIGA) || '[]'); } catch (er) {} importarEventos(eventosDaCalcAntiga(l), 'da calculadora antiga deste navegador'); desenharNex(true); }
  else if (a === 'marco-salvar' || a === 'marco-novo' || a === 'marco-tirar') {
    const l = $$('[data-mv]', o).map((i, k) => ({ v: limitar(int(i.value)), t: ($(`[data-mt="${k}"]`, o).value || '').trim().slice(0, 240) }));
    if (a === 'marco-tirar') l.splice(int(b.dataset.i), 1);
    if (a === 'marco-novo') l.push({ v: Math.min(99, (l.length ? Math.max(...l.map(m => m.v)) : 0) + 5), t: '' });
    const obj = {}; l.filter(m => m.v > 0).forEach((m, k) => { obj['m' + k] = m; });
    gravarNx(['marcos'], Object.keys(obj).length ? obj : { m0: { v: 99, t: '' } });
    if (a === 'marco-salvar') A.aviso('Marcos de NEX salvos.');
    desenharNex(true);
  }
  else if (a === 'marco-padrao') { if (confirm('Voltar os marcos ao padrão do livro?')) { gravarNx(['marcos'], null); desenharNex(true); } }
  else if (a === 'zerar') { if (!confirm('Apagar TODO o histórico de NEX? O NEX de cada cobaia volta ao inicial. Baixe um backup antes.')) return; gravarNx(['ev'], null); publicarNex(); desenharNex(true); }
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const o = $('#nexTela'); if (o && !o.hidden) fecharNex(); } });

/* =========================================================
   2. SENHAS (Mestre e auxiliares)
   ========================================================= */
const S = { dados: null, off: null, de: '', mostrar: false };
const podeVerSenhas = () => A.mestre || !!A.aux;
function ligarSenhas() {
  const quem = A.mestre ? 'm' : A.aux ? 'a' : '';
  if (S.de === quem) return;
  if (S.off) { S.off(); S.off = null; }
  S.de = quem; S.dados = null;
  if (!quem) return;
  A.garantirLogin().then(() => {
    if (S.de !== quem) return;
    S.off = A.Rede.on('senhas', v => { S.dados = v || {}; desenharSenhas(); }, () => { S.dados = { _erro: true }; desenharSenhas(); });
  }, () => {});
}
const andares = () => (typeof ANDARES !== 'undefined' ? ANDARES : []).map(a => ({ n: a.id, nome: a.titulo }));
const hashAtivo = n => (est().senhasAndar || {})['a' + n] || (typeof SENHAS_ANDARES !== 'undefined' ? SENHAS_ANDARES[n] : '') || '';
const conferidos = {};   // texto guardado confere com o hash ativo? (calculado aos poucos)
async function conferir(n, txt) {
  const k = n + '\u0000' + txt + '\u0000' + hashAtivo(n);
  if (conferidos[k] !== undefined) return conferidos[k];
  conferidos[k] = (await A.hash(txt)) === hashAtivo(n);
  desenharSenhas();
  return conferidos[k];
}
function htmlSenhas(ehMestre) {
  const d = S.dados;
  if (!d) return '<p class="mini">Carregando…</p>';
  if (d._erro) return '<p class="mini">Sem permissão para ler as senhas. Os auxiliares precisam entrar com a conta dos auxiliares.</p>';
  const and = d.andares || {}, outras = Object.entries(d.outras || {}), cof = Object.entries(d.cofres || {});
  const campo = (val, attrs, ph) => ehMestre ? `<input ${attrs} value="${esc(val || '')}" placeholder="${esc(ph || '')}" autocomplete="off" spellcheck="false">` : `<code class="sn-txt">${val ? esc(val) : '<i>—</i>'}</code>`;
  const btnCop = v => (v ? `<button data-sn="copiar" data-v="${esc(v)}" title="Copiar" aria-label="Copiar">⧉</button>` : '');
  const linhasAndar = andares().map(a => {
    const t = and['a' + a.n] || '';
    const ok = t ? (conferidos[a.n + '\u0000' + t + '\u0000' + hashAtivo(a.n)]) : undefined;
    if (t && ok === undefined) conferir(a.n, t);
    const estado = !t ? '<small class="sn-alerta">senha antiga do config.js (texto não guardado aqui)</small>' : ok === false ? '<small class="sn-alerta">o texto não confere com a senha ativa: salve de novo</small>' : '';
    return `<div class="sn-linha"><span class="sn-nome">${esc(a.nome)}</span>${campo(t, `data-sn-andar="${a.n}"`, 'nova senha')}${btnCop(t)}${ehMestre ? `<button data-sn="salvar-andar" data-n="${a.n}">Salvar</button><button data-sn="trancar" data-n="${a.n}" title="Quem já entrou neste andar precisa digitar a senha de novo">🔒 Trancar de novo</button>` : ''}${estado}</div>`;
  }).join('');
  return `<p class="mini">${ehMestre ? 'Tudo o que você precisa passar para os jogadores, num lugar só. Os auxiliares também veem esta pasta, mas só você altera.' : 'Senhas para passar aos jogadores. Só o Mestre altera.'} Não envie o arquivo exportado ao GitHub.</p>
    <h3>Andares</h3><div class="sn-grupo">${linhasAndar}</div>
    <h3>Parede de Desejos</h3><div class="sn-grupo"><div class="sn-linha"><span class="sn-nome">Chave da Parede</span>${campo(d.parede, 'data-sn-parede', 'chave do Worker')}${btnCop(d.parede)}${ehMestre ? '<button data-sn="salvar-parede">Salvar</button>' : ''}${d.parede ? '<button data-sn="parede-aqui" title="Grava a chave neste aparelho para usar a Parede">Usar neste aparelho</button>' : ''}</div></div>
    <h3>Cofres do Arquivo</h3><div class="sn-grupo">${cof.length ? cof.map(([, c]) => `<div class="sn-linha"><span class="sn-nome">${esc(Object.values(c.docs || {}).slice(0, 2).join(' · '))}${Object.keys(c.docs || {}).length > 2 ? ` <small>+${Object.keys(c.docs).length - 2}</small>` : ''}</span><code class="sn-txt">${esc(c.cod || '')}</code>${btnCop(c.cod)}</div>`).join('') : '<p class="mini">Nenhum documento com código de acesso. O código se define no próprio documento, no Arquivo.</p>'}</div>
    <h3>Outras senhas</h3><div class="sn-grupo">${outras.map(([k, o]) => `<div class="sn-linha"><span class="sn-nome">${esc(o.n || '')}${o.o ? `<small>${esc(o.o)}</small>` : ''}</span><code class="sn-txt">${esc(o.s || '')}</code>${btnCop(o.s)}${ehMestre ? `<button data-sn="tirar" data-k="${esc(k)}" class="perigo" aria-label="Apagar">×</button>` : ''}</div>`).join('') || '<p class="mini">Nenhuma.</p>'}
      ${ehMestre ? '<div class="sn-nova"><input id="snNovaN" maxlength="40" placeholder="Para quê (ex.: porta da CN 37)"><input id="snNovaS" maxlength="60" placeholder="Senha" autocomplete="off" spellcheck="false"><input id="snNovaO" maxlength="80" placeholder="Observação (opcional)"><button data-sn="nova">Adicionar</button></div>' : ''}</div>
    <div class="ferramentas sn-botoes"><button data-sn="exportar" class="btn-fantasma">⬇ Exportar senhas (.json)</button>${ehMestre ? '<button data-sn="importar" class="btn-fantasma">⬆ Importar senhas…</button>' : ''}</div>`;
}
function desenharSenhas() {
  const blocoA = $('#blocoSenhasAux');
  if (blocoA) blocoA.hidden = !(A.aux && !A.mestre);
  const alvo = A.mestre ? '#listaSenhas' : A.aux ? '#listaSenhasAux' : null;
  if (!alvo || !semFoco(alvo)) return;
  const c = $(alvo); if (!c) return;
  const html = htmlSenhas(A.mestre);
  if (c.dataset.html !== html) { c.innerHTML = html; c.dataset.html = html; }
}
function trancarAndar(n) { A.definir(['trancaAndar', 'a' + n], int((est().trancaAndar || {})['a' + n]) + 1); }
async function salvarAndar(n, txt) {
  txt = String(txt || '').trim();
  if (!txt) { A.aviso('Digite a senha do andar.'); return false; }
  if (txt.length < 4) { A.aviso('Use pelo menos 4 caracteres.'); return false; }
  const h = await A.hash(txt);
  A.definir(['senhasAndar', 'a' + n], h);
  await A.Rede.set('senhas/andares/a' + n, txt).catch(() => A.aviso('O servidor recusou a senha.'));
  return true;
}
function exportarSenhas() {
  const d = S.dados || {};
  const and = {}; andares().forEach(a => { if ((d.andares || {})['a' + a.n]) and[a.n] = d.andares['a' + a.n]; });
  baixar(`senhas-acf-${new Date().toISOString().slice(0, 10)}.json`, {
    tipo: 'planta-acf-senhas', versao: 1, salvoEm: Date.now(),
    andares: and, parede: d.parede || '',
    cofres: Object.values(d.cofres || {}).map(c => ({ codigo: c.cod, documentos: Object.values(c.docs || {}) })),
    outras: Object.values(d.outras || {}).map(o => ({ nome: o.n || '', senha: o.s || '', obs: o.o || '' })),
  });
}
async function importarSenhas(o) {
  if (!o || o.tipo !== 'planta-acf-senhas') { A.aviso('Arquivo inválido: use um .json exportado pela pasta Senhas.'); return; }
  const and = Object.entries(o.andares || {}).filter(([n, t]) => andares().some(a => String(a.n) === String(n)) && String(t || '').trim().length >= 4);
  const outras = (Array.isArray(o.outras) ? o.outras : []).filter(x => x && x.nome && x.senha);
  const resumo = [and.length ? `${and.length} senha${and.length === 1 ? '' : 's'} de andar` : '', o.parede ? 'a chave da Parede' : '', outras.length ? `${outras.length} outra${outras.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(', ');
  if (!resumo) { A.aviso('O arquivo não tem senhas para importar.'); return; }
  if (!confirm(`Importar ${resumo}? As senhas de andar mudam na hora: quem ainda não entrou no andar vai precisar da senha nova.${o.cofres && o.cofres.length ? '\n(Os códigos dos cofres não mudam por aqui: eles ficam em cada documento do Arquivo.)' : ''}`)) return;
  const mudaram = and.filter(([n, t]) => String(((S.dados || {}).andares || {})['a' + n] || '') !== String(t).trim()).map(([n]) => int(n));
  for (const [n, t] of and) await salvarAndar(int(n), t);
  if (mudaram.length && confirm(`Trancar de novo ${mudaram.length === 1 ? 'o andar que mudou de senha' : `os ${mudaram.length} andares que mudaram de senha`} para quem já tinha entrado?`)) mudaram.forEach(trancarAndar);
  if (o.parede) await A.Rede.set('senhas/parede', String(o.parede).trim().slice(0, 120)).catch(() => {});
  if (outras.length) { const obj = {}; outras.forEach(x => { obj[A.Rede.chave()] = { n: String(x.nome).slice(0, 40), s: String(x.senha).slice(0, 60), o: String(x.obs || '').slice(0, 80) }; }); await A.Rede.set('senhas/outras', obj).catch(() => {}); }
  A.aviso('Senhas importadas.');
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-sn]'); if (!b || !podeVerSenhas()) return;
  const a = b.dataset.sn;
  if (a === 'copiar') { copiar(b.dataset.v, 'Senha copiada.'); return; }
  if (a === 'exportar') { exportarSenhas(); A.aviso('Arquivo de senhas baixado. Guarde só com você.'); return; }
  if (a === 'parede-aqui') { const k = (S.dados || {}).parede; if (k) { try { localStorage.setItem(CHAVE_PAREDE, k); } catch (er) {} A.aviso('Chave da Parede gravada neste aparelho.'); } return; }
  if (!A.mestre) return;
  if (a === 'salvar-andar') {
    const n = int(b.dataset.n), i = $(`[data-sn-andar="${n}"]`), nome = andares().find(x => x.n === n).nome;
    b.disabled = true;
    if (await salvarAndar(n, i && i.value)) { A.aviso(`Senha do ${nome} trocada.`); if (confirm(`Trancar de novo o ${nome} para quem já tinha entrado? (Eles vão precisar da senha nova.)`)) trancarAndar(n); }
    b.disabled = false;
  }
  else if (a === 'trancar') { const n = int(b.dataset.n), nome = andares().find(x => x.n === n).nome; if (confirm(`Trancar de novo o ${nome}? Todos os jogadores voltam para a tela da senha nesse andar.`)) { trancarAndar(n); A.aviso(`${nome} trancado de novo.`); } }
  else if (a === 'salvar-parede') { const v = ($('[data-sn-parede]').value || '').trim(); await A.Rede.set('senhas/parede', v ? v.slice(0, 120) : null).catch(() => A.aviso('O servidor recusou.')); A.aviso('Chave da Parede guardada.'); }
  else if (a === 'nova') { const n = ($('#snNovaN').value || '').trim(), s = ($('#snNovaS').value || '').trim(), o = ($('#snNovaO').value || '').trim(); if (!n || !s) { A.aviso('Preencha para quê e a senha.'); return; } await A.Rede.set('senhas/outras/' + A.Rede.chave(), { n: n.slice(0, 40), s: s.slice(0, 60), o: o.slice(0, 80) }).catch(() => A.aviso('O servidor recusou.')); }
  else if (a === 'tirar') { if (confirm('Apagar esta senha da lista?')) A.Rede.set('senhas/outras/' + b.dataset.k, null).catch(() => {}); }
  else if (a === 'importar') lerArquivo(importarSenhas);
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-sn-andar]')) { e.preventDefault(); const b = e.target.parentElement.querySelector('[data-sn="salvar-andar"]'); if (b) b.click(); } });

/* =========================================================
   3. PAREDE DE DESEJOS
   ========================================================= */
const WORKER = 'https://parede-de-desejos.rodri01001.workers.dev';
const CHAVE_PAREDE = 'parede:chave';   // a mesma do site antigo: quem já usou neste aparelho não digita de novo
const LEGENDAS = ['0 · um incômodo passageiro', '1 · um custo pequeno', '2 · algo que não se esquece fácil', '3 · uma perda concreta', '4 · uma marca permanente', '5 · uma mutilação fria', '6 · o limiar do que se suporta'];
const SELOS = ['O preço está anotado.', 'A dívida foi inscrita na pedra.', 'Anotado. A pedra não esquece.'];
const VIDEO = 'SSeJDJWCnE8';
const P = { ativo: null, nivel: null, cont: {}, contOk: false, pensando: false, yt: null, ytPronto: false, tocando: false, desejos: null, off: null, visto: ls.get('acf-parede-visto', 0), meus: {} };
const paredeAberta = () => !!((est().parede || {}).on);
const chaveParede = () => { try { return (localStorage.getItem(CHAVE_PAREDE) || '').trim(); } catch (e) { return ''; } };
async function carregarContagens() {
  try {
    const r = await fetch(WORKER + '/counts');
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    P.cont = {}; cobaias().forEach(x => { P.cont[x.id] = int(d[codCurto(x.id)]); });
    P.contOk = true;
  } catch (e) { P.contOk = false; }
  desenharParede(); desenharMesaParede();
}
function carregarFontesParede() {
  if ($('#fontesParede')) return;
  const l = document.createElement('link'); l.id = 'fontesParede'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Metal+Mania&family=Butcherman&family=Shadows+Into+Light+Two&display=swap';
  document.head.appendChild(l);
}
function abrirParede() {
  if (!(A.mestre || A.aux) && !(A.meu && paredeAberta())) return;
  carregarFontesParede();
  let o = $('#paredeTela');
  if (!o) {
    o = document.createElement('div'); o.id = 'paredeTela'; o.className = 'parede-tela';
    o.innerHTML = `<div class="pd-grao" aria-hidden="true"></div><div class="pd-vinheta" aria-hidden="true"></div><div class="pd-respira" aria-hidden="true"></div><div class="pd-eco" aria-hidden="true"></div>
      <button class="pd-fechar" data-pd="fechar" aria-label="Fechar a Parede">×</button>
      <main class="pd-muro"><header class="pd-cabecalho"><h1 class="pd-titulo" data-text="A Parede de Desejos">A Parede de Desejos</h1><p class="pd-sussurro">tudo é concedido. nada é de graça.</p></header>
        <nav aria-label="Quem deseja"><ul class="pd-abas" id="pdAbas"></ul></nav>
        <section class="pd-rito"><label class="pd-rotulo" for="pdDesejo">Sussurre o desejo de <span id="pdQuem">—</span></label>
          <div class="pd-entrada"><textarea id="pdDesejo" class="pd-campo" rows="3" maxlength="500" placeholder="Eu desejo…" spellcheck="false" autocomplete="off"></textarea>
            <div class="pd-seletor" role="group" aria-label="Profundidade do preço"><span class="pd-seletor-tit">preço</span><div class="pd-niveis" id="pdNiveis">${[0, 1, 2, 3, 4, 5, 6].map(n => `<button class="pd-nivel" data-pd="nivel" data-n="${n}">${n}</button>`).join('')}</div><span class="pd-legenda" id="pdLegenda">selecione a profundidade</span></div></div>
          <div class="pd-chave" id="pdChave" hidden><label for="pdChaveIn">Sussurre a chave da Parede</label><div><input id="pdChaveIn" type="password" autocomplete="off" spellcheck="false"><button data-pd="chave">Guardar</button></div></div>
          <button class="pd-oferecer" id="pdOferecer" data-pd="oferecer">Oferecer à Parede</button></section>
        <section class="pd-veredito" id="pdVeredito" aria-live="polite" hidden><div class="pd-veredito-marca" aria-hidden="true"></div><p class="pd-veredito-texto" id="pdTexto"></p><p class="pd-selo" id="pdSelo"></p></section>
        <p class="pd-aviso" id="pdAviso" hidden></p>
        <details class="pd-hist" id="pdHist"><summary>Desejos já feitos neste aparelho</summary><div id="pdHistLista"></div></details>
      </main><footer class="pd-rodape">nº de pedidos é registrado na pedra. a pedra não esquece.</footer>
      <div id="pdYt" class="pd-yt" aria-hidden="true"></div><button id="pdSom" class="pd-som" data-pd="som" aria-label="Ligar ou desligar o som" title="Som">♫</button>`;
    document.body.appendChild(o);
    o.addEventListener('click', aoClicarParede);
    o.addEventListener('pointerdown', () => { if (!P.tocando && !P.calado) tocarSom(); }, true);
    $('#pdDesejo', o).addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') oferecer(); });
    $('#pdChaveIn', o).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); guardarChave(); } });
  }
  const livre = A.mestre || !!A.aux;   // Mestre e auxiliares desejam por qualquer cobaia
  if (!P.ativo || (!livre && P.ativo !== A.meu)) P.ativo = livre ? (P.ativo || cobaias()[0].id) : A.meu;
  o.hidden = false; document.body.classList.add('parede-aberta');
  $('#pdAviso').hidden = true;
  carregarContagens();
  desenharParede();
}
function fecharParede() {
  const o = $('#paredeTela'); if (!o) return;
  o.hidden = true; document.body.classList.remove('parede-aberta');
  try { if (P.yt && P.ytPronto) P.yt.pauseVideo(); } catch (e) {}
  P.tocando = false; const s = $('#pdSom'); if (s) s.classList.remove('on');
}
function desenharParede() {
  const o = $('#paredeTela'); if (!o || o.hidden) return;
  const quem = A.mestre || A.aux ? cobaias() : cobaias().filter(x => x.id === A.meu);
  $('#pdAbas').innerHTML = quem.map(x => `<li><button class="pd-aba${x.id === P.ativo ? ' ativa' : ''}" data-pd="quem" data-id="${x.id}"><span class="pd-cod">${esc(codCurto(x.id))}</span><span class="pd-nome">${esc(x.nome)}</span><span class="pd-cont">desejos: <b>${P.contOk ? int(P.cont[x.id]) : '?'}</b></span></button></li>`).join('');
  const at = A.SER[P.ativo] || {};
  $('#pdQuem').textContent = `${codCurto(P.ativo)} · ${at.nome || ''}`;
  $$('.pd-nivel', o).forEach(b => b.classList.toggle('escolhido', int(b.dataset.n) === P.nivel && P.nivel !== null));
  $('#pdLegenda').textContent = P.nivel === null ? 'selecione a profundidade' : LEGENDAS[P.nivel];
  $('#pdChave').hidden = !!chaveParede();
  const b = $('#pdOferecer'); b.disabled = P.pensando; b.classList.toggle('pensando', P.pensando); b.textContent = P.pensando ? 'A Parede considera…' : 'Oferecer à Parede';
  const hist = ls.get('acf-parede-hist', []).filter(h => A.mestre || A.aux || h.s === A.meu).slice(-20).reverse();
  $('#pdHist').hidden = !hist.length;
  const dv = est().dividas || {};
  $('#pdHistLista').innerHTML = hist.map(h => { const q = dataHora(h.ts); return `<article class="pd-hist-item${h.k && dv[h.k] === 'pago' ? ' pago' : ''}"><header><b>${esc(nomeDe(h.s))}</b> · preço ${int(h.n)} · ${q.data} ${q.hora}${h.k ? ` · <i>${dv[h.k] === 'pago' ? 'cobrado' : 'pendente'}</i>` : ''}</header><p class="pd-hist-d">“${esc(h.d)}”</p><p class="pd-hist-p">${esc(h.p)}</p></article>`; }).join('');
}
function avisoParede(t) { const a = $('#pdAviso'); if (!a) return; a.textContent = t; a.hidden = !t; }
function guardarChave() {
  const v = ($('#pdChaveIn').value || '').trim(); if (!v) return;
  try { localStorage.setItem(CHAVE_PAREDE, v); } catch (e) {}
  $('#pdChaveIn').value = ''; avisoParede(''); desenharParede();
}
function inscrever(texto, selo) {
  const v = $('#pdVeredito'), t = $('#pdTexto'), s = $('#pdSelo');
  v.hidden = false; v.style.animation = 'none'; void v.offsetWidth; v.style.animation = '';
  s.textContent = ''; t.textContent = ''; t.classList.add('escrevendo');
  v.scrollIntoView({ behavior: 'smooth', block: 'center' });
  let i = 0;
  const passo = () => {
    if (i <= texto.length) { t.textContent = texto.slice(0, i); i++; setTimeout(passo, 14 + Math.random() * 26); }
    else { t.classList.remove('escrevendo'); s.textContent = selo || ''; }
  };
  passo();
}
async function oferecer() {
  if (P.pensando) return;
  const desejo = ($('#pdDesejo').value || '').trim();
  avisoParede('');
  if (!desejo) { avisoParede('A Parede não escuta o silêncio. Escreva um desejo.'); return; }
  if (P.nivel === null) { avisoParede('Escolha a profundidade do preço, de 0 a 6.'); return; }
  const chave = chaveParede();
  if (!chave) { $('#pdChave').hidden = false; $('#pdChaveIn').focus(); avisoParede('Sem a chave, a Parede não abre. Peça ao Mestre.'); return; }
  const id = P.ativo, nome = nomeDe(id), nivel = P.nivel;
  if (!(A.mestre || A.aux) && id !== A.meu) return;
  P.pensando = true; desenharParede();
  try {
    const r = await fetch(WORKER + '/wish', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-parede-key': chave }, body: JSON.stringify({ id: codCurto(id), nome, desejo, nivel }) });
    if (r.status === 401) { try { localStorage.removeItem(CHAVE_PAREDE); } catch (e) {} avisoParede('A chave estava errada. A Parede a recusou. Sussurre de novo.'); return; }
    if (!r.ok) { const corpo = await r.text(); throw new Error(`${r.status} · ${corpo.slice(0, 200)}`); }
    const d = await r.json();
    if (typeof d.count === 'number') { P.cont[id] = d.count; P.contOk = true; }
    const preco = String(d.price || 'A Parede ficou em silêncio.');
    inscrever(preco, d.selo || SELOS[Math.floor(Math.random() * SELOS.length)]);
    $('#pdDesejo').value = '';
    // memória: neste aparelho e para o Mestre (Firebase)
    const reg = { s: id, n: nivel, d: desejo.slice(0, 500), p: preco.slice(0, 2000), c: typeof d.count === 'number' ? d.count : 0, ts: Date.now() };
    const hist = ls.get('acf-parede-hist', []); hist.push(reg); ls.set('acf-parede-hist', hist.slice(-50));
    const k = A.Rede.chave(); P.meus[k] = true;
    hist[hist.length - 1].k = k; ls.set('acf-parede-hist', hist.slice(-50));
    A.Rede.set('desejos/' + k, reg).catch(() => {});
    // a dívida fica na ficha ativa do jogador (seção "O que devo à Parede"); o Mestre marca "cobrado"
    const FXA = window.ACF_FICHAS, at = FXA && FXA.ativa && FXA.ativa();
    if (at && at.d && at.d.dono === id && !A.mestre && !A.aux) FXA.aplicarNaAtiva([['dividas.' + k, { n: nivel, d: reg.d, p: reg.p, ts: reg.ts }]]);
  } catch (e) {
    avisoParede('A Parede recusou o pedido. Verifique a chave e a conexão. Detalhe: ' + (e.message || e));
  } finally { P.pensando = false; desenharParede(); desenharMesaParede(); }
}
function tocarSom() {
  if (!P.yt) {
    if (!window.YT || !window.YT.Player) {
      if (!$('#ytApi')) {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { if (prev) try { prev(); } catch (e) {} criarYt(); };
        const t = document.createElement('script'); t.id = 'ytApi'; t.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(t);
      }
      P.querTocar = true; return;
    }
    criarYt(); P.querTocar = true; return;
  }
  if (!P.ytPronto) { P.querTocar = true; return; }
  try { P.yt.unMute(); P.yt.setVolume(60); P.yt.playVideo(); P.tocando = true; $('#pdSom').classList.add('on'); } catch (e) {}
}
function criarYt() {
  if (P.yt || !$('#pdYt')) return;
  P.yt = new window.YT.Player('pdYt', { videoId: VIDEO, playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: VIDEO, playsinline: 1 },
    events: { onReady: () => { P.ytPronto = true; if (P.querTocar && !$('#paredeTela').hidden) tocarSom(); } } });
}
function aoClicarParede(e) {
  const b = e.target.closest('[data-pd]'); if (!b) return;
  const a = b.dataset.pd;
  if (a === 'fechar') fecharParede();
  else if (a === 'quem') { if (A.mestre || A.aux) { P.ativo = b.dataset.id; desenharParede(); } }
  else if (a === 'nivel') { P.nivel = int(b.dataset.n); desenharParede(); }
  else if (a === 'oferecer') oferecer();
  else if (a === 'chave') guardarChave();
  else if (a === 'som') {
    e.stopPropagation();
    if (P.tocando) { try { P.yt.pauseVideo(); } catch (er) {} P.tocando = false; P.calado = true; b.classList.remove('on'); }
    else { P.calado = false; tocarSom(); }
  }
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const o = $('#paredeTela'); if (o && !o.hidden) fecharParede(); } });

/* ---------- Mestre: desejos recebidos ---------- */
function ligarDesejos() {
  const quem = A.mestre ? 'm' : A.aux ? 'a' : '';
  if (P.de !== quem && P.off) { P.off(); P.off = null; P.desejos = null; }
  P.de = quem;
  if (quem && !P.off && A.pronto) {
    P.off = A.Rede.on('desejos', v => { P.desejos = v || {}; avisarDesejos(); desenharMesaParede(); }, () => { P.desejos = {}; });
  }
}
function avisarDesejos() {
  const novos = Object.entries(P.desejos || {}).filter(([, d]) => d && num(d.ts) > P.visto).sort((a, b) => num(a[1].ts) - num(b[1].ts));
  if (!novos.length) return;
  novos.forEach(([k, d]) => {
    if (int(d.c) > int(P.cont[d.s])) P.cont[d.s] = int(d.c);   // a contagem da pedra que veio junto
    if (!P.meus[k] && A.alertaMestre) A.alertaMestre(`🧱 ${nomeDe(d.s)} fez um desejo à Parede (preço ${int(d.n)}): “${String(d.d).slice(0, 80)}”`);
    if (MESA().registrarRel) MESA().registrarRel('desejo', d.s, int(d.n), `preço ${int(d.n)}: ${String(d.d).slice(0, 150)}`, 'd' + k);
  });
  P.visto = Math.max(...novos.map(([, d]) => num(d.ts)));
  ls.set('acf-parede-visto', P.visto);
}
function desenharMesaParede() {
  const c = $('#mesaParede'); if (!c || !(A.mestre || A.aux) || !semFoco('#mesaParede')) return;
  if (!P.contTentou) { P.contTentou = true; carregarContagens(); }
  const lista = Object.entries(P.desejos || {}).sort((a, b) => num(b[1].ts) - num(a[1].ts));
  const on = paredeAberta(), dv = est().dividas || {};
  const pend = lista.filter(([k]) => dv[k] !== 'pago').length;
  const html = `<p class="mini">O mesmo Worker do site antigo: a contagem de desejos é a mesma. Cada desejo e o preço chegam aqui e no Relatório.</p>
    <label class="chave"><input type="checkbox" data-pdm="on" ${on ? 'checked' : ''}><span>Parede desperta (os jogadores veem o botão)</span></label>
    <p class="mini">${P.contOk ? cobaias().map(x => `${esc(x.nome)} ${int(P.cont[x.id])}`).join(' · ') : 'Contagem: <button data-pdm="contar">consultar a pedra</button>'}</p>
    <div class="mesa-linha"><button data-pdm="abrir" class="btn-protocolo">🧱 Abrir a Parede</button></div>
    ${lista.length ? `<details class="pd-m-lista"><summary>Desejos registrados (${lista.length}) · ${pend ? `${pend} preço${pend > 1 ? 's' : ''} pendente${pend > 1 ? 's' : ''}` : 'tudo cobrado'}</summary>${lista.slice(0, 40).map(([k, d]) => { const q = dataHora(d.ts), pago = dv[k] === 'pago'; return `<article class="${pago ? 'pago' : ''}"><header><b>${esc(nomeDe(d.s))}</b> · preço ${int(d.n)} · ${q.data} ${q.hora}<button data-pdm="pago" data-k="${esc(k)}" class="pd-m-st">${pago ? '✓ cobrado' : 'marcar cobrado'}</button><button data-pdm="apagar" data-k="${esc(k)}" aria-label="Apagar este registro">×</button></header><p>“${esc(d.d)}”</p><p class="mini">${esc(d.p)}</p></article>`; }).join('')}</details>` : ''}`;
  if (c.dataset.html !== html) { c.innerHTML = html; c.dataset.html = html; }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pdm]'); if (!b || !(A.mestre || A.aux)) return;
  const a = b.dataset.pdm;
  if (a === 'abrir') abrirParede();
  else if (a === 'contar') carregarContagens();
  else if (a === 'pago') { const k = b.dataset.k; A.definir(['dividas', k], (est().dividas || {})[k] === 'pago' ? null : 'pago'); setTimeout(desenharMesaParede, 30); }
  else if (a === 'apagar') { if (confirm('Apagar este registro de desejo? (A contagem do Worker não muda.)')) A.Rede.set('desejos/' + b.dataset.k, null).catch(() => {}); }
});
document.addEventListener('change', e => {
  if (e.target.matches && e.target.matches('[data-pdm="on"]') && (A.mestre || A.aux)) { A.definir(['parede'], e.target.checked ? { on: true, ts: Date.now() } : null); setTimeout(desenharMesaParede, 30); }
});

/* ---------- botão do jogador ---------- */
function atualizarBotaoParede() {
  const b = $('#btnParede'); if (!b) return;
  const ver = !A.mestre && !A.aux && !!A.meu && paredeAberta();
  if (b.hidden === ver) b.hidden = !ver;
  if (!ver) { const o = $('#paredeTela'); if (o && !o.hidden && !A.mestre && !A.aux) fecharParede(); }
}
const bp = $('#btnParede'); if (bp) bp.addEventListener('click', abrirParede);

/* =========================================================
   4. REGRAS RESTRITAS (Escudo do Mestre)
   Regras que só algumas pessoas podem ler (ex.: ações noturnas de cada função).
   O texto e quem vê ficam nos segredos do Mestre (segredos/_regras). O site publica:
   - regrasAux: as marcadas para os auxiliares (Mestre e auxiliares leem);
   - regrasJog/<hash da chave da ficha>: uma cópia para cada ficha de quem pode ver.
     Só quem tem a chave da ficha chega nesse endereço, então os outros jogadores não leem.
   O jogador vê as dele no Arquivo (pasta "Regras pessoais") e, se for ação noturna, no interlúdio.
   ========================================================= */
const RR = { aux: {}, auxOff: null, auxDe: '', pess: {}, pessOff: {}, pessDe: '', tPub: null, pubFeito: false, edit: null };
const regrasM = () => sg()._regras || {};
const ordRegras = o => Object.entries(o || {}).sort((a, b) => num(a[1].ord) - num(b[1].ord) || String(a[1].tit || '').localeCompare(String(b[1].tit || ''), 'pt'));
// texto simples → HTML: "# título", "- item", **negrito**
function txtRegra(t) {
  const linhas = String(t || '').split('\n');
  let html = '', ul = false;
  const fecha = () => { if (ul) { html += '</ul>'; ul = false; } };
  const neg = s => esc(s).replace(/\*\*([^*\n][\s\S]*?)\*\*/g, '<b>$1</b>');
  linhas.forEach(l => {
    const x = l.trim();
    if (!x) { fecha(); return; }
    if (x.startsWith('# ')) { fecha(); html += `<h5>${neg(x.slice(2))}</h5>`; return; }
    if (/^[-*•] /.test(x)) { if (!ul) { html += '<ul>'; ul = true; } html += `<li>${neg(x.slice(2))}</li>`; return; }
    fecha(); html += `<p>${neg(x)}</p>`;
  });
  fecha();
  return html;
}
const cartaoRegra = r => ({ tit: String(r.tit || 'Regra').slice(0, 100), txt: String(r.txt || '').slice(0, 8000), noite: !!r.noite, si: !!r.si, custo: Math.max(0, Math.min(2, int(r.custo === undefined ? 2 : r.custo))), ord: num(r.ord) });
async function publicarRegras() {
  if (!A.mestre || !A.segredosProntos) return;
  const aux = {}, porCob = {};
  ordRegras(regrasM()).forEach(([id, r]) => {
    const c = cartaoRegra(r);
    if (r.aux) aux[id] = c;
    (r.todos ? cobaias().map(x => x.id) : Object.keys(r.para || {})).forEach(cob => { (porCob[cob] = porCob[cob] || {})[id] = c; });
  });
  await A.Rede.set('regrasAux', Object.keys(aux).length ? aux : null).catch(() => {});
  const novos = {};
  for (const cob of Object.keys(porCob)) {
    const fichas = (await A.Rede.once('agentes/' + cob).catch(() => null)) || {};
    for (const chave of Object.keys(fichas)) novos[await A.hash('regra:' + chave)] = porCob[cob];
  }
  const velhos = sg()._regrasHs || [];
  (Array.isArray(velhos) ? velhos : Object.values(velhos)).filter(h => !novos[h]).forEach(h => A.Rede.set('regrasJog/' + h, null).catch(() => {}));
  for (const [h, v] of Object.entries(novos)) await A.Rede.set('regrasJog/' + h, v).catch(() => {});
  A.gravarSegredo(['_regrasHs'], Object.keys(novos).length ? Object.keys(novos) : null);
}
function agendarPublicarRegras() { clearTimeout(RR.tPub); RR.tPub = setTimeout(() => publicarRegras().catch(() => {}), 600); }
// auxiliares leem regrasAux; o jogador lê as cópias das próprias fichas
function ligarRegras() {
  const quemA = A.aux && !A.mestre ? 'a' : '';
  if (RR.auxDe !== quemA) { if (RR.auxOff) RR.auxOff(); RR.auxOff = null; RR.aux = {}; RR.auxDe = quemA;
    if (quemA) A.garantirLogin().then(() => { RR.auxOff = A.Rede.on('regrasAux', v => { RR.aux = v || {}; avisarRegras(); }, () => {}); }, () => {}); }
  const FXA = window.ACF_FICHAS;
  const chaves = !A.mestre && A.meu && FXA && FXA.minhasChaves ? FXA.minhasChaves() : [];
  const assin = (A.meu || '') + ':' + chaves.join(',');
  if (RR.pessDe === assin) return;
  RR.pessDe = assin;
  Object.values(RR.pessOff).forEach(f => { try { f(); } catch (e) {} });
  RR.pessOff = {}; RR.pess = {};
  if (!chaves.length) { avisarRegras(); return; }
  A.garantirLogin().then(async () => {
    for (const k of chaves) {
      const h = await A.hash('regra:' + k);
      if (RR.pessDe !== assin) return;
      RR.pessOff[h] = A.Rede.on('regrasJog/' + h, v => { RR.pess[h] = v || {}; avisarRegras(); }, () => {});
    }
  }, () => {});
}
const regrasPessoais = () => { const out = {}; Object.values(RR.pess).forEach(o => Object.entries(o || {}).forEach(([id, c]) => { out[id] = c; })); return out; };
function avisarRegras() { document.dispatchEvent(new Event('acf-regras')); const o = $('#escudoMestre'); if (o && !o.hidden && MESA().desenharEscudo) MESA().desenharEscudo(); }

/* ---------- no Escudo do Mestre ---------- */
function topicoRegras() {
  if (A.mestre) {
    const fun = id => String(sg()[id] || '').trim();
    const cards = ordRegras(regrasM()).map(([id, r]) => {
      const c = cartaoRegra(r), para = r.todos ? 'todas as cobaias' : Object.keys(r.para || {}).map(nomeDe).join(', ') || 'nenhuma cobaia';
      const html = `<h4>${esc(c.tit)}</h4><div class="rr-txt">${txtRegra(c.txt)}</div>
        <details class="rr-quem"><summary>👁 Quem vê: ${esc([r.aux ? 'auxiliares' : '', para].filter(Boolean).join(' · '))}${c.noite ? ` · 🌙 ação noturna (${c.custo} aç${c.custo === 1 ? 'ão' : 'ões'})` : ''}</summary>
          <div class="rr-opcoes" data-rr-id="${esc(id)}">
            <label class="chave"><input type="checkbox" data-rr-campo="aux" ${r.aux ? 'checked' : ''}><span>Mestres auxiliares</span></label>
            <label class="chave"><input type="checkbox" data-rr-campo="todos" ${r.todos ? 'checked' : ''}><span>Todas as cobaias</span></label>
            ${cobaias().map(x => `<label class="chave"><input type="checkbox" data-rr-campo="para" data-rr-cob="${x.id}" ${(r.para || {})[x.id] ? 'checked' : ''} ${r.todos ? 'disabled' : ''}><span>${esc(x.nome)}${fun(x.id) ? ` <small>(${esc(fun(x.id))})</small>` : ''}</span></label>`).join('')}
            <label class="chave"><input type="checkbox" data-rr-campo="noite" ${c.noite ? 'checked' : ''}><span>Aparece como ação noturna no interlúdio de quem vê</span></label>
            <label class="rr-custo">Custo <select data-rr-campo="custo">${[0, 1, 2].map(n => `<option value="${n}" ${c.custo === n ? 'selected' : ''}>${n} aç${n === 1 ? 'ão' : 'ões'}</option>`).join('')}</select></label>
            <label class="chave"><input type="checkbox" data-rr-campo="si" ${r.si ? 'checked' : ''}><span>Pode mirar em si mesmo (sem teste)</span></label>
            <p class="rr-mini">Efeitos que viram botões na sua lista da noite:</p>
            <label class="rr-custo">Cura <input data-rr-campo="cura" maxlength="30" value="${esc(r.cura || '')}" placeholder="ex.: 3d8+VIG"></label>
            <label class="rr-custo">NEX <select data-rr-campo="nexd">${[0, -5, 5].map(n => `<option value="${n}" ${int(r.nexd) === n ? 'selected' : ''}>${n ? (n > 0 ? '+' : '−') + Math.abs(n) + '%' : 'nada'}</option>`).join('')}</select></label>
            <label class="rr-custo">Marca <select data-rr-campo="marca">${[['', 'nada'], ['por', 'marcar o alvo'], ['tirar', 'tirar a marca do alvo']].map(([v, n]) => `<option value="${v}" ${(r.marca || '') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          </div></details>
        <div class="rr-botoes"><button data-rr="editar" data-id="${esc(id)}">✎ Editar</button><button data-rr="apagar" data-id="${esc(id)}" class="perigo">Apagar</button></div>`;
      return { titulo: c.tit, tipo: 'html', html, linhas: [c.txt], fonte: '' };
    });
    cards.push({ titulo: 'Gerenciar', tipo: 'html', linhas: ['regra nova importar exportar'], html: `<h4>Regras restritas</h4><p class="rr-mini">Só quem você marcar lê cada regra. Os jogadores marcados encontram a regra no Arquivo (pasta "Regras pessoais"); as de ação noturna aparecem também no interlúdio deles. Cópias: uma por ficha de cada jogador marcado; se ele criar uma ficha nova, clique em "Reenviar".</p>
      <div class="rr-botoes"><button data-rr="nova" class="pri">+ Nova regra</button><button data-rr="importar">⬆ Importar</button><button data-rr="exportar">⬇ Exportar</button><button data-rr="reenviar">↻ Reenviar</button></div>` });
    return { id: 'restritas', titulo: 'Regras restritas', cards };
  }
  if (A.aux) {
    const cards = ordRegras(RR.aux).map(([, c]) => ({ titulo: c.tit, tipo: 'html', linhas: [c.txt], html: `<h4>${esc(c.tit)}</h4><div class="rr-txt">${txtRegra(c.txt)}</div>` }));
    return cards.length ? { id: 'restritas', titulo: 'Regras restritas', cards } : null;
  }
  return null;
}
function salvarCampoRegra(id, campo, el) {
  const r = regrasM()[id]; if (!r) return;
  if (campo === 'para') A.gravarSegredo(['_regras', id, 'para', el.dataset.rrCob], el.checked ? true : null);
  else if (campo === 'custo') A.gravarSegredo(['_regras', id, 'custo'], int(el.value));
  else if (campo === 'cura') A.gravarSegredo(['_regras', id, 'cura'], String(el.value || '').trim().slice(0, 30) || null);
  else if (campo === 'nexd') A.gravarSegredo(['_regras', id, 'nexd'], int(el.value) || null);
  else if (campo === 'marca') A.gravarSegredo(['_regras', id, 'marca'], el.value || null);
  else A.gravarSegredo(['_regras', id, campo], el.checked ? true : null);
  agendarPublicarRegras();
  setTimeout(() => { const o = $('#escudoMestre'); if (o && !o.hidden && MESA().desenharEscudo) { const aberto = id; MESA().desenharEscudo(); const d = $(`[data-rr-id="${aberto}"]`); if (d) d.closest('details').open = true; } }, 30);
}
document.addEventListener('change', e => {
  const el = e.target; if (!el.dataset || !el.dataset.rrCampo || !A.mestre) return;
  const box = el.closest('[data-rr-id]'); if (box) salvarCampoRegra(box.dataset.rrId, el.dataset.rrCampo, el);
});
function abrirEditorRegra(id) {
  const r = id ? regrasM()[id] || {} : {};
  let o = $('#rrModal');
  if (!o) { o = document.createElement('div'); o.id = 'rrModal'; o.className = 'rr-modal'; document.body.appendChild(o);
    o.addEventListener('click', e => { if (e.target === o || e.target.closest('[data-rrm="cancelar"]')) o.hidden = true; if (e.target.closest('[data-rrm="salvar"]')) salvarEditorRegra(); }); }
  RR.edit = id || null;
  o.innerHTML = `<div class="rr-modal-caixa"><h3>${id ? 'Editar regra' : 'Nova regra'}</h3>
    <label>Título <input id="rrTit" maxlength="100" value="${esc(r.tit || '')}" placeholder="Ex.: Ação noturna"></label>
    <label>Texto <textarea id="rrTxt" rows="14" maxlength="8000" placeholder="# Teste&#10;- Acordado: DT 30&#10;**negrito** entre asteriscos duplos">${esc(r.txt || '')}</textarea></label>
    <p class="rr-mini">"# " no começo da linha vira subtítulo; "- " vira item de lista; **assim** fica em negrito.</p>
    <div class="rr-botoes"><button data-rrm="cancelar">Cancelar</button><button data-rrm="salvar" class="pri">Salvar</button></div></div>`;
  o.hidden = false;
  setTimeout(() => $('#rrTit').focus(), 30);
}
function salvarEditorRegra() {
  const tit = ($('#rrTit').value || '').trim(), txt = ($('#rrTxt').value || '').trim();
  if (!tit || !txt) { A.aviso('Preencha o título e o texto.'); return; }
  const id = RR.edit || A.Rede.chave(), velho = regrasM()[id] || {};
  A.gravarSegredo(['_regras', id], { ...velho, tit: tit.slice(0, 100), txt: txt.slice(0, 8000), ord: velho.ord || Date.now() });
  $('#rrModal').hidden = true;
  agendarPublicarRegras();
  if (MESA().desenharEscudo) MESA().desenharEscudo();
}
function importarRegras(o) {
  const lista = o && o.tipo === 'planta-acf-regras' && Array.isArray(o.regras) ? o.regras.filter(r => r && r.tit && r.txt) : [];
  if (!lista.length) { A.aviso('Arquivo inválido: use um .json de regras restritas.'); return; }
  const ja = new Set(Object.values(regrasM()).map(r => r.tit));
  const novas = lista.filter(r => !ja.has(String(r.tit).slice(0, 100)));
  if (!novas.length) { A.aviso('Essas regras já estão no Escudo.'); return; }
  if (!confirm(`Importar ${novas.length} regra${novas.length === 1 ? '' : 's'}${lista.length > novas.length ? ` (${lista.length - novas.length} já existiam)` : ''}? Depois marque em "Quem vê" os jogadores de cada uma.`)) return;
  let t = Date.now();
  novas.forEach(r => {
    const para = {}; (Array.isArray(r.para) ? r.para : []).forEach(c => { if ((A.SER[c] || {}).tipo === 'cobaia') para[c] = true; });
    A.gravarSegredo(['_regras', A.Rede.chave()], { tit: String(r.tit).slice(0, 100), txt: String(r.txt).slice(0, 8000), aux: r.aux ? true : null, todos: r.todos ? true : null, para: Object.keys(para).length ? para : null, noite: r.noite ? true : null, custo: r.custo === undefined ? 2 : int(r.custo), si: r.si ? true : null, cura: r.cura ? String(r.cura).slice(0, 30) : null, nexd: int(r.nexd) || null, marca: ['por', 'tirar'].includes(r.marca) ? r.marca : null, ord: t++ });
  });
  agendarPublicarRegras();
  if (MESA().desenharEscudo) MESA().desenharEscudo();
  A.aviso(`${novas.length} regra${novas.length === 1 ? '' : 's'} importada${novas.length === 1 ? '' : 's'}.`);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-rr]'); if (!b || !A.mestre) return;
  const a = b.dataset.rr, id = b.dataset.id;
  if (a === 'nova') abrirEditorRegra(null);
  else if (a === 'editar') abrirEditorRegra(id);
  else if (a === 'apagar') { const r = regrasM()[id]; if (r && confirm(`Apagar a regra "${r.tit}"? Ela some também para quem podia ver.`)) { A.gravarSegredo(['_regras', id], null); agendarPublicarRegras(); if (MESA().desenharEscudo) MESA().desenharEscudo(); } }
  else if (a === 'importar') lerArquivo(importarRegras);
  else if (a === 'exportar') { baixar(`regras-restritas-${new Date().toISOString().slice(0, 10)}.json`, { tipo: 'planta-acf-regras', versao: 1, regras: ordRegras(regrasM()).map(([, r]) => ({ tit: r.tit, txt: r.txt, aux: !!r.aux, todos: !!r.todos, para: Object.keys(r.para || {}), noite: !!r.noite, custo: cartaoRegra(r).custo, si: !!r.si, cura: r.cura || '', nexd: int(r.nexd), marca: r.marca || '' })) }); A.aviso('Regras exportadas. O arquivo diz quem vê cada uma: guarde só com você.'); }
  else if (a === 'reenviar') { publicarRegras().then(() => A.aviso('Regras reenviadas para as fichas atuais.'), () => A.aviso('Não consegui reenviar.')); }
});
// opções de ação noturna para o interlúdio do jogador (vêm das regras pessoais dele)
const opcoesNoite = () => ordRegras(regrasPessoais()).filter(([, c]) => c && c.noite).map(([id, c]) => ({ id, tit: c.tit, si: !!c.si, custo: Math.max(0, Math.min(2, int(c.custo))) }));

/* ---------- Entregas do Mestre na ficha (ex.: cura de uma ação noturna) ----------
   O Mestre não edita fichas. Ele deixa a entrega em entregas/<hash da chave da ficha>, um endereço que só o dono acha;
   o aparelho do jogador aplica na ficha ativa e apaga a entrega de todas as fichas dele. */
async function entregar(cob, obj) {
  if (!A.mestre) return 0;
  const fichas = (await A.Rede.once('agentes/' + cob).catch(() => null)) || {};
  const k = A.Rede.chave(), v = { ...obj, ts: Date.now() };
  let n = 0;
  for (const chave of Object.keys(fichas)) { await A.Rede.set(`entregas/${await A.hash('entrega:' + chave)}/${k}`, v).catch(() => {}); n++; }
  return n;
}
// entrega para uma ficha só (o Mestre viu a ficha e sabe a chave dela)
async function entregarFicha(cob, chave, obj) {
  if (!A.mestre || !cob || !chave) return 0;
  await A.Rede.set(`entregas/${await A.hash('entrega:' + chave)}/${A.Rede.chave()}`, { ...obj, ts: Date.now() });
  return 1;
}
// o que o Mestre pode tirar de uma ficha (condições do sono e bônus de interlúdio)
const TIRAVEL = /^(condSono(\/[a-z]+)?|semDormir|treino(\/[a-z]+)?|rapido|bonusProx|bonusInt)$/;
const ENT = { de: '', off: [], hs: {}, v: {} };
function ligarEntregas() {
  const FXA = window.ACF_FICHAS;
  const chaves = !A.mestre && A.meu && FXA && FXA.minhasChaves ? FXA.minhasChaves() : [];
  const assin = (A.meu || '') + ':' + chaves.join(',');
  if (ENT.de === assin) return;
  ENT.de = assin; ENT.off.forEach(f => { try { f(); } catch (e) {} }); ENT.off = []; ENT.hs = {}; ENT.v = {};
  if (!chaves.length) return;
  A.garantirLogin().then(async () => {
    for (const c of chaves) {
      const h = await A.hash('entrega:' + c);
      if (ENT.de !== assin) return;
      ENT.hs[h] = c;
      ENT.off.push(A.Rede.on('entregas/' + h, v => { ENT.v[h] = v || {}; aplicarEntregas(); }, () => {}));
    }
  }, () => {});
}
function aplicarEntregas() {
  const FXA = window.ACF_FICHAS, at = FXA && FXA.ativa();
  Object.entries(ENT.hs).forEach(([h, chave]) => Object.entries(ENT.v[h] || {}).forEach(([k, e]) => {
    if (!e || ENT['feito' + h + k]) return;
    // "tirar": vale para a ficha a que foi mandada, ativa ou não
    if (e.tirar) {
      ENT['feito' + h + k] = true;
      const lst = (Array.isArray(e.tirar) ? e.tirar : Object.values(e.tirar)).map(String).filter(p => TIRAVEL.test(p));
      Promise.all(lst.map(p => A.Rede.set(`agentes/${A.meu}/${chave}/${p}`, null))).then(() => {
        A.Rede.set(`entregas/${h}/${k}`, null).catch(() => {});
        if (lst.length) A.aviso('O Mestre ajustou sua ficha: ' + lst.map(p => ({ condSono: 'condições do sono', semDormir: 'dias sem dormir', treino: 'bônus de treino', rapido: 'prato rápido', bonusProx: 'bônus guardado', bonusInt: 'bônus antigos' }[p.split('/')[0]] + (p.includes('/') ? ` (${p.split('/')[1]})` : ''))).join(', ') + '.');
      }, () => { ENT['feito' + h + k] = false; });
      return;
    }
    // cura, baú e afins: só na ficha ativa
    if (!at || !at.ref || at.ref.chave !== chave) return;
    ENT['feito' + h + k] = true;
    // baú de achados: o jogador abre e o item entra na ficha ativa
    if (e.item && typeof e.item === 'object' && window.ACF_JOGO) {
      const fimB = () => Object.keys(ENT.hs).forEach(hh => A.Rede.set(`entregas/${hh}/${k}`, null).catch(() => {}));
      window.ACF_JOGO.abrirBau(e, async () => {
        const it = { ...e.item, o: Date.now() }; delete it.ts;
        const ok = await FXA.aplicarNaAtiva([['itens.' + A.Rede.chave(), it]]);
        if (ok) fimB(); else ENT['feito' + h + k] = false;
        return !!ok;
      });
      return;
    }
    const lista = [];
    if (int(e.pv)) lista.push(['pv.a', Math.min(at.r.pvMax, FXA.atualDe(at.d, 'pv', at.r.pvMax) + int(e.pv))]);
    const fim = () => Object.keys(ENT.hs).forEach(hh => A.Rede.set(`entregas/${hh}/${k}`, null).catch(() => {}));
    if (!lista.length) { fim(); return; }
    FXA.aplicarNaAtiva(lista).then(ok => { if (!ok) { ENT['feito' + h + k] = false; return; } fim(); A.aviso(`🌙 Você acordou melhor do que dormiu: +${int(e.pv)} PV.`); });
  }));
}
document.addEventListener('acf-ativa', () => setTimeout(aplicarEntregas, 300));

window.ACF_REGRAS = { topicoEscudo: topicoRegras, pessoais: regrasPessoais, opcoesNoite, txtRegra, entregar, entregarFicha };

/* =========================================================
   LIGAÇÕES
   ========================================================= */
let agendado = false, nexPublicado = false;
function tudo() {
  if (agendado) return; agendado = true;
  requestAnimationFrame(() => {
    agendado = false;
    try {
      ligarSenhas(); ligarDesejos(); vigiarSugestoes(); ligarRegras(); ligarEntregas();
      // o Mestre reenvia as regras restritas uma vez ao entrar (pega fichas criadas desde a última vez)
      if (A.mestre && A.segredosProntos && !RR.pubFeito) { RR.pubFeito = true; if (Object.keys(regrasM()).length) agendarPublicarRegras(); }
      if (!A.mestre) RR.pubFeito = false;
      ligarNexCalc();
      // versões antigas guardavam o NEX nos segredos do Mestre: muda para "nexCalc" uma vez
      if (A.mestre && A.segredosProntos && NXC.pronto && sg()._nex) {
        if (!Object.keys(nexSg()).length) { const velho = JSON.parse(JSON.stringify(sg()._nex)); NXC.dados = velho; NXC.vistos = new Set(Object.keys(velho.ev || {})); A.Rede.set('nexCalc', velho).then(() => A.gravarSegredo(['_nex'], null), () => {}); }
        else A.gravarSegredo(['_nex'], null);
      }
      // quem usa a calculadora publica o NEX uma vez ao entrar
      if (podeNex() && NXC.pronto && !nexPublicado) { nexPublicado = true; if (Object.keys(nexSg()).length) publicarNex(); }
      if (!podeNex()) nexPublicado = false;
      // cada parte isolada: um erro numa não deixa as outras presas em "Carregando"
      const seguro = (fn, onde) => { try { fn(); } catch (e) { console.error('ferramentas/' + onde + ':', e); const c = onde && $(onde); if (c && (A.mestre || A.aux)) c.innerHTML = `<p class="mini sn-alerta">Erro ao desenhar: ${esc(e && e.message || e)}. Recarregue a página; se continuar, mande esta mensagem.</p>`; } };
      seguro(desenharMesaNex, '#mesaNex'); seguro(desenharSenhas, A.mestre ? '#listaSenhas' : '#listaSenhasAux'); seguro(desenharMesaParede, '#mesaParede'); seguro(atualizarBotaoParede);
      const o = $('#nexTela'); if (o && !o.hidden) { if (!podeNex()) fecharNex(); else desenharNex(); }
    } catch (e) { console.warn('ferramentas:', e); }
  });
}
A.aoMudar(tudo);
document.addEventListener('acf-tudo', tudo);
document.addEventListener('acf-segredos', tudo);
setInterval(() => { if (A.mestre || A.aux) tudo(); }, 3000);   // reserva: nada fica preso esperando
document.addEventListener('acf-perfil', () => setTimeout(tudo, 60));
setTimeout(tudo, 900);
window.ACF_FERRAMENTAS = { abrirNex, abrirParede, publicarNex, nexAtual, exportarSenhas, aplicarNex };
})();
