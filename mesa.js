/* =========================================================
   mesa.js · Ferramentas de mesa de Ordem Paranormal
   - Painel de retratos (foto, nome, PV e PE) sobre o mapa
   - Pedidos do Mestre na tela do jogador: Presença Perturbadora, interlúdio, fim de missão
   - Contagem de turnos em Morrendo e Enlouquecendo
   - Cena de investigação, ambiente sonoro, sigilo de ritual, efeitos de sanidade
   - Aba "Mesa" do Mestre: retratos, cena, investigação, interlúdio, fim de missão,
     ambiente, rolagem secreta, ameaças e Escudo do Mestre
   Regras conferidas no OPRPG v1.3 e no Sobrevivendo ao Horror (resumidas, não copiadas).
   ========================================================= */
(() => {
const A = window.ACF;
if (!A) return;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = A.esc;
const num = (v, p = 0) => { const n = parseFloat(v); return isFinite(n) ? n : p; };
const int = v => Math.round(num(v));
const FX = () => window.ACF_FICHAS;
const est = () => A.estado || {};
const cobaias = () => (A.SERES || []).filter(x => x.tipo === 'cobaia');
const ls = { get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const ELEM = { Sangue: '#c2272f', Morte: '#8c8c8c', Conhecimento: '#d9a514', Energia: '#8a3fd1', Medo: '#e9e4f2', Varia: '#5fa8a0' };
const corEl = el => ELEM[Object.keys(ELEM).find(k => String(el || '').toLowerCase().startsWith(k.toLowerCase()))] || '#8b5cf6';
const somOk = () => !A.mudo;

/* =========================================================
   1. PAINEL DE RETRATOS
   ========================================================= */
// mancha de sangue irregular em volta do retrato (forma fixa por cobaia)
function semente(txt) { let h = 2166136261; for (const c of String(txt)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
function mancha(id) {
  const r = semente(id), pts = [], n = 26;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, raio = 37 + r() * 9 + (r() > 0.78 ? 7 + r() * 9 : 0);
    pts.push([50 + Math.cos(a) * raio, 50 + Math.sin(a) * raio]);
  }
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('') + 'Z';
  const gotas = Array.from({ length: 5 }, () => { const a = r() * Math.PI * 2, dist = 47 + r() * 10; return `<circle cx="${(50 + Math.cos(a) * dist).toFixed(1)}" cy="${(50 + Math.sin(a) * dist).toFixed(1)}" r="${(1.2 + r() * 2.4).toFixed(1)}"/>`; }).join('');
  const escorre = Array.from({ length: 3 }, () => { const x = 30 + r() * 40, h = 8 + r() * 16; return `<rect x="${x.toFixed(1)}" y="78" width="${(2 + r() * 2.5).toFixed(1)}" height="${h.toFixed(1)}" rx="1.5"/>`; }).join('');
  return `<svg class="hud-mancha" viewBox="0 0 100 100" aria-hidden="true"><g fill="var(--hud-sangue)"><path d="${d}"/>${gotas}${escorre}</g><circle cx="50" cy="50" r="33" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="3"/></svg>`;
}
const hudOffJog = () => ((est().hud || {}).off) || {};
const hudOffMeu = () => ls.get('acf-hud-gm-off', {});
function vitaisDe(id) {
  const tk = (est().tokens || {})[id];
  if (tk && tk.vit) return tk.vit;
  const f = (est().fichas || {})[id];
  if (f && (f.pv !== undefined || f.pvm !== undefined)) return { pv: f.pv, pvM: f.pvm, pe: f.pe, peM: f.pem, san: f.san, sanM: f.sanm, nex: f.nex, resumida: true };
  return null;
}
const ultimoPV = {};
function desenharHud() {
  let caixa = $('#hudRetratos');
  const area = $('.palco-area');
  if (!area) return;
  if (!caixa) { caixa = document.createElement('div'); caixa.id = 'hudRetratos'; caixa.className = 'hud-retratos'; area.appendChild(caixa); caixa.addEventListener('click', aoClicarHud); }
  let ids = [];
  if (A.mestre) ids = cobaias().map(c => c.id).filter(id => !hudOffMeu()[id]);
  else if (A.meu && !hudOffJog()[A.meu]) ids = [A.meu];
  if (A.tv) ids = cobaias().map(c => c.id).filter(id => !hudOffJog()[id] && (est().tokens || {})[id]);
  caixa.classList.toggle('muitos', ids.length > 1);
  caixa.hidden = !ids.length || !!ls.get('acf-hud-recolhido', false) && !A.mestre;
  const html = ids.map(id => {
    const s = A.SER[id] || {}, v = vitaisDe(id);
    const conds = A.condicoesVisiveis ? A.condicoesVisiveis(id) : [];
    const morr = conds.includes('morrendo'), enl = conds.includes('enlouquecendo');
    const pv = v ? int(v.pv) : null, pvM = v ? int(v.pvM) : null;
    const pe = v ? (v.det ? v.pd : v.pe) : null;
    const tit = v ? `${s.nome}: PV ${pv}/${pvM}${v.det ? ` · PD ${int(v.pd)}/${int(v.pdM)}` : `${v.pe !== undefined ? ` · PE ${int(v.pe)}/${int(v.peM)}` : ''}${v.san !== undefined ? ` · SAN ${int(v.san)}/${int(v.sanM)}` : ''}`}${v.nex !== undefined ? ` · NEX ${v.nex}${String(v.nex).startsWith('E') ? '' : '%'}` : ''}` : `${s.nome}: sem ficha ativa`;
    const icones = conds.filter(c => !['morrendo', 'enlouquecendo', 'machucado'].includes(c)).map(c => (A.COND[c] || {}).i || '').join('');
    return `<div class="hud-card${morr ? ' morrendo' : ''}${enl ? ' enlouquecendo' : ''}${!v ? ' sem-ficha' : ''}" data-id="${id}" title="${esc(tit)}" style="--cor:${s.cor || '#888'}">
      <div class="hud-retrato">${mancha(id)}<div class="hud-foto"${s.img ? ` style="background-image:url('${s.img}')"` : ''}></div>${pe !== null && pe !== undefined ? `<span class="hud-pe" title="${v && v.det ? 'Pontos de Determinação' : 'Pontos de Esforço'}">${int(pe)}</span>` : ''}</div>
      <div class="hud-txt"><b class="hud-nome">${esc(s.nome || id)}</b>${v ? `<span class="hud-pv"><i>${pv}</i>/${pvM}</span>` : '<span class="hud-pv hud-vazio">—</span>'}${icones ? `<span class="hud-icones">${icones}</span>` : ''}${medidorHud(id)}</div>
      ${morr ? '<span class="hud-estado">MORRENDO</span>' : enl ? '<span class="hud-estado">ENLOUQUECENDO</span>' : ''}</div>`;
  }).join('') + (!A.mestre && ids.length ? '<button class="hud-recolher" data-hud="recolher" title="Esconder o painel" aria-label="Esconder o painel">–</button>' : '');
  if (caixa.dataset.html !== html) { caixa.innerHTML = html; caixa.dataset.html = html; }
  // brilho quando a vida muda
  ids.forEach(id => {
    const v = vitaisDe(id); if (!v) return;
    const pv = int(v.pv), ant = ultimoPV[id];
    ultimoPV[id] = pv;
    if (ant === undefined || ant === pv) return;
    const card = $(`.hud-card[data-id="${id}"]`, caixa); if (!card) return;
    card.classList.remove('dano', 'cura'); void card.offsetWidth; card.classList.add(pv < ant ? 'dano' : 'cura');
  });
  const mostrar = $('#hudMostrar');
  if (!A.mestre && A.meu && !hudOffJog()[A.meu] && ls.get('acf-hud-recolhido', false)) {
    if (!mostrar) { const b = document.createElement('button'); b.id = 'hudMostrar'; b.className = 'hud-mostrar'; b.textContent = '♥ Retrato'; b.onclick = () => { ls.set('acf-hud-recolhido', false); desenharHud(); }; area.appendChild(b); }
  } else if (mostrar) mostrar.remove();
}
// leitura do Medidor da Membrana no próprio retrato (só para quem carrega o item)
function medidorHud(id) {
  if (A.mestre || id !== A.meu || !temMedidor()) return '';
  const cn = A.salaDe(id); if (!cn) return '';
  const v = membDe(cn), g = grauMemb(v);
  return `<span class="hud-memb memb-g-${g[2]}" title="Medidor da Membrana: ${A.nomeSala(cn)}">📟 ${v}%</span>`;
}
function aoClicarHud(e) {
  if (e.target.closest('[data-hud="recolher"]')) { ls.set('acf-hud-recolhido', true); desenharHud(); return; }
  const card = e.target.closest('.hud-card'); if (!card || !FX()) return;
  if (A.mestre) { FX().abrir(); return; }
  FX().abrirAtiva();
}

/* =========================================================
   2. EFEITOS DE SANIDADE NA TELA DO JOGADOR
   ========================================================= */
function efeitosDaTela() {
  const b = document.body;
  const v = !A.mestre && A.meu ? vitaisDe(A.meu) : null;
  const tira = () => b.classList.remove('ef-san-baixa', 'ef-san-critica', 'ef-san-zero', 'ef-pv-baixa', 'ef-pv-zero');
  if (!v || v.resumida) { tira(); return; }
  const sanR = v.det ? (num(v.pdM) ? num(v.pd) / num(v.pdM) : 1) : (num(v.sanM) ? num(v.san) / num(v.sanM) : 1);
  const enl = v.det ? !!v.enl : num(v.sanM) && num(v.san) <= 0;
  const pvR = num(v.pvM) ? num(v.pv) / num(v.pvM) : 1;
  b.classList.toggle('ef-san-zero', !!enl);
  b.classList.toggle('ef-san-critica', !enl && sanR <= 0.25);
  b.classList.toggle('ef-san-baixa', !enl && sanR > 0.25 && sanR < 0.5);
  b.classList.toggle('ef-pv-zero', num(v.pvM) > 0 && num(v.pv) <= 0);
  b.classList.toggle('ef-pv-baixa', num(v.pv) > 0 && pvR <= 0.5);
  if (!$('#efeitoTela')) { const d = document.createElement('div'); d.id = 'efeitoTela'; d.className = 'efeito-tela'; d.setAttribute('aria-hidden', 'true'); document.body.appendChild(d); }
}

/* =========================================================
   3. CONTAGEM DE TURNOS (Morrendo / Enlouquecendo) — feita pela tela do Mestre
   ========================================================= */
let vezAnterior;   // undefined até a primeira leitura (recarregar a página não conta turno)
function contarTurnos() {
  if (!A.mestre) return;
  const p = est().persg || {};
  const vez = A.vez;
  if (vezAnterior === undefined) { vezAnterior = p.on ? vez : null; return; }
  if (!p.on) { vezAnterior = null; return; }
  if (!vez || vez === vezAnterior) return;
  vezAnterior = vez;
  if (!A.SER[vez] || A.SER[vez].tipo !== 'cobaia') return;
  const conds = A.condicoesVisiveis(vez);
  const c = (est().cond || {})[vez] || {};
  const nome = (A.SER[vez] || {}).nome || vez;
  if (conds.includes('morrendo')) {
    const n = Math.min(3, int(c._mt) + 1);
    A.definir(['cond', vez, '_mt'], n);
    A.aviso(n >= 3 ? `💀 ${nome} iniciou o terceiro turno morrendo nesta cena. Pela regra, morre.` : `💀 ${nome} inicia o turno morrendo (${n}/3).`);
    if (n >= 3 && somOk()) A.Som.alarme();
  }
  if (conds.includes('enlouquecendo')) {
    const n = Math.min(3, int(c._et) + 1);
    A.definir(['cond', vez, '_et'], n);
    A.aviso(n >= 3 ? `🌀 ${nome} iniciou o terceiro turno enlouquecendo. Pela regra, fica insana e vira NPC do Mestre.` : `🌀 ${nome} inicia o turno enlouquecendo (${n}/3).`);
  }
}
function novaCena() {
  const c = est().cond || {};
  A.definir(['cena'], { id: A.Rede.chave(), ts: Date.now() });
  registrarRel('cena');
  Object.keys(c).forEach(id => ['_mt', '_et', '_ms'].forEach(k => { if (c[id] && c[id][k]) A.definir(['cond', id, k], null); }));
  A.aviso('Nova cena: contadores de Morrendo e Enlouquecendo zerados e munição descontada.');
}

/* =========================================================
   4. JANELA DE PEDIDOS NA TELA DO JOGADOR
   ========================================================= */
function janela(id, html, classe = '') {
  let m = $('#mesaJanela');
  if (!m) { m = document.createElement('div'); m.id = 'mesaJanela'; m.className = 'mesa-janela'; document.body.appendChild(m); m.addEventListener('click', aoClicarJanela); }
  m.className = 'mesa-janela ' + classe;
  m.dataset.id = id;
  m.innerHTML = `<div class="mesa-caixa">${html}</div>`;
  m.hidden = false;
}
function fecharJanela() { const m = $('#mesaJanela'); if (m) { m.hidden = true; m.dataset.id = ''; } }
const respondido = id => !!ls.get('acf-resp-' + id, false);
const marcar = id => ls.set('acf-resp-' + id, true);
let estadoJanela = null;
function aoClicarJanela(e) {
  const b = e.target.closest('[data-mj]'); if (!b) return;
  const a = b.dataset.mj;
  if (a === 'fechar') { fecharJanela(); return; }
  if (a === 'adiar') { estadoJanela = null; fecharJanela(); adiados.add($('#mesaJanela').dataset.id); return; }
  if (a === 'abrir-fichas') { fecharJanela(); FX() && FX().abrir(); return; }
  if (estadoJanela && estadoJanela.on) estadoJanela.on(a, b);
}
const adiados = new Set();

/* ---------- 4a. Presença Perturbadora ---------- */
function vigiarChamadoMembrana() {
  const ch = est().chamado;
  if (!A.mestre || !ch || ch.t !== 'presenca' || !ch.id || Date.now() - num(ch.ts) > 60000) return;
  const vistos = ls.get('acf-memb-ch', []);
  if (vistos.includes(ch.id)) return;
  ls.set('acf-memb-ch', [...vistos.slice(-30), ch.id]);
  quedaPorPresenca(ch);
}
// regra de Determinação (SaH): cada dado desce um passo e a quantidade cai pela metade (arredonda para cima)
function danoDeterminacao(expr) {
  return String(expr || '').replace(/(\d*)d(\d+)/gi, (m, q, f) => {
    const passos = [4, 6, 8, 10, 12, 20];
    const i = passos.indexOf(int(f));
    const nf = i > 0 ? passos[i - 1] : Math.max(2, int(f) - 2);
    return `${Math.ceil((int(q) || 1) / 2)}d${nf}`;
  });
}
function verChamado() {
  const ch = est().chamado;
  if (!ch || A.mestre || !A.meu) return;
  if (ch.t !== 'presenca' || !(ch.alvos || {})[A.meu]) return;
  if (respondido(ch.id) || adiados.has(ch.id) || Date.now() - num(ch.ts) > 3 * 3600e3) return;
  const m = $('#mesaJanela'); if (m && !m.hidden && m.dataset.id === ch.id) return;
  if (m && !m.hidden && m.dataset.id) return;   // outra janela aberta: espera
  abrirPresencaJogador(ch);
}
function abrirPresencaJogador(ch) {
  const at = FX() && FX().ativa();
  const v = at ? FX().vitaisDe(at.d) : null;
  const det = !!(v && v.det);
  let expr = ch.dano + (int(ch.extras) ? `+${int(ch.extras)}d6` : '');
  if (det) expr = danoDeterminacao(expr);
  const nex = v && typeof v.nex === 'number' ? v.nex : null;
  const imune = nex !== null && int(ch.nex) > 0 && nex >= int(ch.nex);
  const topo = `<p class="mesa-k" style="--el:${corEl(ch.el)}">PRESENÇA PERTURBADORA</p><h3>${esc(ch.nome)}</h3>
    <p>Você enxerga a criatura. Teste de <b>Vontade</b> contra <b>DT ${int(ch.dt)}</b>. Falhou: dano mental <b>${esc(expr)}</b>${det ? ' (ajustado para Determinação)' : ''}. Passou: metade.</p>`;
  if (!at) {
    janela(ch.id, `${topo}<p class="mesa-aviso">Você não tem uma ficha ativa. Role Vontade pelo 🎲 Dados e avise o Mestre, ou crie a sua ficha.</p>
      <div class="mesa-botoes"><button data-mj="abrir-fichas">Abrir fichas</button><button data-mj="feito">Já rolei</button></div>`, 'presenca');
    estadoJanela = { on: a => { if (a === 'feito') { marcar(ch.id); fecharJanela(); } } };
    return;
  }
  if (imune) {
    janela(ch.id, `${topo}<p class="mesa-ok">Com NEX ${nex}% você é imune a esta Presença Perturbadora.</p><div class="mesa-botoes"><button data-mj="ok" class="pri">Entendi</button></div>`, 'presenca');
    estadoJanela = { on: a => { if (a === 'ok') { responder(ch.id, { imune: true }); A.rolagemDaFicha(`😐 ${at.d.nome} encara ${ch.nome}: imune pelo NEX.`); marcar(ch.id); fecharJanela(); } } };
    return;
  }
  janela(ch.id, `${topo}<div class="mesa-botoes"><button data-mj="rolar" class="pri">🎲 Rolar Vontade</button><button data-mj="adiar">Depois</button></div><div id="mjRes"></div>`, 'presenca');
  estadoJanela = { on: a => {
    if (a === 'rolar' && !estadoJanela.t) {
      const d = FX().ativa().d;
      const t = FX().testarPericia(d, 'vontade');
      const passou = t.total >= int(ch.dt);
      const dr = FX().rolarExpr(expr);
      const dano = passou ? Math.floor(dr.total / 2) : dr.total;
      estadoJanela.t = t; estadoJanela.res = { passou, dano, det };
      $('#mjRes').innerHTML = `<div class="dados-faces">${t.dados.map(x => `<span class="face${x === t.esc ? ' usada' : ''}">${x}</span>`).join('')}</div>
        <p>Vontade <b class="mesa-total">${t.total}</b> contra DT ${int(ch.dt)}: <b>${passou ? 'passou' : 'falhou'}</b>${t.pen && t.pen.length ? ` <small>(condições: ${esc(t.pen.map(x => x.n + 'd20 ' + x.fonte).join(', '))})</small>` : ''}</p>
        <p>Dano mental ${esc(dr.det)} = ${dr.total}${passou ? ` → metade: <b>${dano}</b>` : ''}</p>
        <div class="mesa-botoes"><button data-mj="aplicar" class="pri">Aplicar −${dano} ${det ? 'PD' : 'SAN'} na minha ficha</button></div>`;
      $('[data-mj="rolar"]').disabled = true;
      return;
    }
    if (a === 'aplicar' && estadoJanela.res) {
      const { passou, dano } = estadoJanela.res;
      const at2 = FX().ativa(); if (!at2) return;
      const d = at2.d, r = at2.r;
      const k = det ? 'pd' : 'san';
      const mx = det ? r.pdMax : r.sanMax;
      const cur = FX().atualDe(d, k, mx);
      const novo = Math.max(0, cur - dano);
      const lista = [[`${k}.a`, novo]];
      if (det && dano > cur) lista.push(['enl', true]);
      FX().aplicarNaAtiva(lista);
      responder(ch.id, { total: estadoJanela.t.total, passou, dano, det });
      A.rolagemDaFicha(`😱 ${d.nome} vê ${ch.nome}: Vontade ${estadoJanela.t.total} vs DT ${int(ch.dt)}, ${passou ? 'passou' : 'falhou'}. −${dano} ${det ? 'PD' : 'SAN'}.`);
      marcar(ch.id);
      const virouPert = cur >= mx / 2 && novo < mx / 2 && novo > 0;
      if (virouPert || novo <= 0 || (det && dano > cur)) {
        janela(ch.id, `<p class="mesa-k">SANIDADE</p><h3>${novo <= 0 || (det && dano > cur) ? 'Enlouquecendo' : 'Perturbado'}</h3><p>${novo <= 0 || (det && dano > cur) ? 'Sua mente está cedendo. Se iniciar três turnos enlouquecendo nesta cena, seu personagem fica insano. Alguém pode acalmá-lo com Diplomacia, ou qualquer cura de Sanidade encerra a condição.' : 'Sua Sanidade caiu abaixo da metade. O Mestre sorteia um efeito de insanidade para você interpretar.'}</p><div class="mesa-botoes"><button data-mj="fechar" class="pri">Entendi</button></div>`, 'presenca');
        estadoJanela = null;
      } else fecharJanela();
    }
  } };
}
function responder(id, dados) { if (!A.meu) return; A.Rede.set(`mesaResp/${id}/${A.meu}`, { ...dados, ts: Date.now() }).catch(() => {}); }

/* ---------- 4b. Interlúdio ---------- */
const DESCANSO = { precaria: ['Precária', 0], normal: ['Normal', 1], confortavel: ['Confortável', 2], luxuosa: ['Luxuosa', 3] };
const PASSOS = [0.5, 1, 2, 3, 4];
const ACOES_INT = [
  ['alimentar', 'Alimentar-se', 'Uma refeição especial e o benefício do prato.'],
  ['dormir', 'Dormir', 'Recupera PV e PE conforme o limite de PE e o descanso.'],
  ['relaxar', 'Relaxar', 'Recupera Sanidade como o dormir; +1 por colega que também relaxar.'],
  ['exercitar', 'Exercitar-se', '+1d6 guardado para um teste de Agilidade, Força ou Vigor (máximo igual ao Vigor).'],
  ['ler', 'Ler', '+1d6 guardado para um teste de Intelecto ou Presença (máximo igual ao Intelecto).'],
  ['manutencao', 'Manutenção', 'Conserta um item quebrado.'],
  ['revisar', 'Revisar caso', 'Teste de perícia para achar uma pista que passou batido.'],
];
const PRATOS = [['favorito', 'Prato favorito (+2 SAN ao relaxar)'], ['nutritivo', 'Prato nutritivo (dormir recupera mais PV)'], ['energetico', 'Prato energético (dormir recupera mais PE)'], ['rapido', 'Prato rápido (+5 no revisar caso)']];
function verInterludio() {
  const it = est().interludio;
  if (!it || A.mestre || !A.meu) return;
  if (!it.on) { bonusRelaxar(it); return; }
  if (respondido('int-' + it.id) || adiados.has('int-' + it.id)) return;
  const m = $('#mesaJanela'); if (m && !m.hidden && m.dataset.id) return;
  abrirInterludio(it);
}
function calcInterludio(it, esc2, prato, d, r, det) {
  const lim = r.peTurno;
  const base = DESCANSO[it.cond] ? DESCANSO[it.cond][1] : 1;
  const passo = k => PASSOS[Math.min(PASSOS.length - 1, base + (k ? 1 : 0))];
  const out = { pv: 0, pe: 0, san: 0, pd: 0, ex: 0, le: 0, txt: [] };
  if (esc2.includes('dormir')) {
    out.pv = Math.floor(lim * passo(prato === 'nutritivo'));
    if (!det) out.pe = Math.floor(lim * passo(prato === 'energetico'));
    out.txt.push(`dormiu (+${out.pv} PV${det ? '' : `, +${out.pe} PE`})`);
  }
  if (esc2.includes('relaxar')) {
    const v = Math.floor(lim * passo(false)) + (prato === 'favorito' && !det ? 2 : 0);
    if (det) out.pd = v; else out.san = v;
    out.txt.push(`relaxou (+${v} ${det ? 'PD' : 'SAN'})`);
  }
  if (det && esc2.includes('alimentar') && prato === 'favorito') { out.pdTemp = 2; out.txt.push('prato favorito (+2 PD temporários)'); }
  if (esc2.includes('exercitar')) { out.ex = 1; out.txt.push('se exercitou (+1d6 físico guardado)'); }
  if (esc2.includes('ler')) { out.le = 1; out.txt.push('leu (+1d6 mental guardado)'); }
  if (esc2.includes('alimentar') && !(det && prato === 'favorito')) out.txt.push('comeu ' + (PRATOS.find(p => p[0] === prato) || [, 'bem'])[1].split(' (')[0].toLowerCase());
  if (esc2.includes('manutencao')) out.txt.push('fez manutenção');
  if (esc2.includes('revisar')) out.txt.push(`revisou o caso${prato === 'rapido' ? ' (+5 pelo prato rápido)' : ''}`);
  return out;
}
function abrirInterludio(it) {
  const at = FX() && FX().ativa();
  const desc = DESCANSO[it.cond] ? DESCANSO[it.cond][0] : 'Normal';
  if (!at) {
    janela('int-' + it.id, `<p class="mesa-k">INTERLÚDIO</p><h3>Hora de respirar</h3><p>Descanso ${esc(desc.toLowerCase())}. Você não tem ficha ativa: crie ou ative sua ficha para escolher as ações aqui.</p><div class="mesa-botoes"><button data-mj="abrir-fichas">Abrir fichas</button><button data-mj="adiar">Depois</button></div>`, 'interludio');
    estadoJanela = null;
    return;
  }
  const det = at.d.regra === 'determinacao';
  janela('int-' + it.id, `<p class="mesa-k">INTERLÚDIO · descanso ${esc(desc.toLowerCase())}</p><h3>Escolha até duas ações</h3>
    <div class="mesa-acoes">${ACOES_INT.map(([k, n, d]) => `<label class="mesa-acao"><input type="checkbox" data-int="${k}"><b>${n}</b><small>${d}${det && k === 'dormir' ? ' Com Determinação, só PV.' : ''}${det && k === 'relaxar' ? ' Com Determinação, recupera PD.' : ''}</small></label>`).join('')}</div>
    <label class="mesa-prato" hidden>Prato <select id="mjPrato">${PRATOS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
    <p id="mjPrev" class="mesa-prev"></p>
    <div class="mesa-botoes"><button data-mj="confirmar" class="pri" disabled>Confirmar</button><button data-mj="adiar">Depois</button></div>`, 'interludio');
  const atualizar = () => {
    const marc = $$('#mesaJanela [data-int]').filter(x => x.checked).map(x => x.dataset.int);
    $$('#mesaJanela [data-int]').forEach(x => { x.disabled = !x.checked && marc.length >= 2; });
    $('#mesaJanela .mesa-prato').hidden = !marc.includes('alimentar');
    const at2 = FX().ativa(); if (!at2) return;
    const o = calcInterludio(it, marc, marc.includes('alimentar') ? $('#mjPrato').value : '', at2.d, at2.r, det);
    $('#mjPrev').textContent = marc.length ? 'Resultado: ' + o.txt.join(', ') + '.' : '';
    $('[data-mj="confirmar"]').disabled = !marc.length;
  };
  $$('#mesaJanela [data-int]').forEach(x => { x.onchange = atualizar; });
  $('#mjPrato').onchange = atualizar;
  estadoJanela = { on: a => {
    if (a !== 'confirmar') return;
    const marc = $$('#mesaJanela [data-int]').filter(x => x.checked).map(x => x.dataset.int);
    const prato = marc.includes('alimentar') ? $('#mjPrato').value : '';
    const at2 = FX().ativa(); if (!at2) return;
    const d = at2.d, r = at2.r;
    const o = calcInterludio(it, marc, prato, d, r, det);
    const lista = [];
    const soma = (k, mx, n, folga = 0) => { if (!n) return; lista.push([`${k}.a`, Math.min(mx + folga, FX().atualDe(d, k, mx) + n)]); };
    soma('pv', r.pvMax, o.pv);
    if (det) { soma('pd', r.pdMax, (o.pd || 0) + (o.pdTemp || 0), o.pdTemp || 0); if (o.pd || o.pdTemp) lista.push(['enl', null]); }
    else { soma('pe', r.peMax, o.pe); soma('san', r.sanMax, o.san); }
    const bi = d.bonusInt || {};
    if (o.ex) lista.push(['bonusInt.ex', Math.min(Math.max(1, int(d.atr.vig)), int(bi.ex) + 1)]);
    if (o.le) lista.push(['bonusInt.le', Math.min(Math.max(1, int(d.atr.int)), int(bi.le) + 1)]);
    FX().aplicarNaAtiva(lista);
    responder(it.id, { acoes: marc, prato, relaxar: marc.includes('relaxar') });
    if (marc.includes('relaxar')) ls.set('acf-relaxou-' + it.id, true);
    A.rolagemDaFicha(`🛋️ ${d.nome} no interlúdio: ${o.txt.join(', ')}.`);
    marcar('int-' + it.id);
    fecharJanela();
  } };
}
// relaxar: +1 de Sanidade para cada outro personagem que relaxou no mesmo interlúdio (aplicado quando o Mestre encerra)
async function bonusRelaxar(it) {
  if (!it.id || !ls.get('acf-relaxou-' + it.id, false) || ls.get('acf-relaxou-bonus-' + it.id, false)) return;
  ls.set('acf-relaxou-bonus-' + it.id, true);
  const resp = (await A.Rede.once('mesaResp/' + it.id).catch(() => null)) || {};
  const outros = Object.entries(resp).filter(([q, r]) => q !== A.meu && r && r.relaxar).length;
  const at = FX() && FX().ativa();
  if (!outros || !at) return;
  const det = at.d.regra === 'determinacao', k = det ? 'pd' : 'san', mx = det ? at.r.pdMax : at.r.sanMax;
  FX().aplicarNaAtiva([[`${k}.a`, Math.min(mx, FX().atualDe(at.d, k, mx) + outros)]]);
  A.aviso(`Relaxar em grupo: +${outros} ${det ? 'PD' : 'SAN'} (${outros} colega${outros > 1 ? 's' : ''} também relaxou).`);
}

/* ---------- 4c. Fim de missão ---------- */
function verRecompensa() {
  const rc = est().recomp;
  if (!rc || !rc.id || A.mestre || !A.meu) return;
  const meu = (rc.por || {})[A.meu]; if (!meu) return;
  const at = FX() && FX().ativa();
  if (!at) return;   // aplica quando houver ficha ativa
  if ((at.d.recAplic || {})[rc.id]) return;
  const d = at.d;
  const lista = [['recAplic.' + rc.id, true]];
  const pp = int(meu.pp), novoNex = int(meu.nex);
  if (pp) lista.push(['pp', int(d.pp) + pp]);
  const nexSobe = novoNex && FX().NEXES.includes(novoNex) && novoNex > (int(d.nex) || 5) && !(FX().CLASSES[d.classe] || {}).estagio;
  if (nexSobe) lista.push(['nex', novoNex]);
  if (FX().consumoMissao) lista.push(...FX().consumoMissao(d));   // flechas e afins: duram a missão
  FX().aplicarNaAtiva(lista).then(ok => {
    if (!ok) return;
    const dep = FX().ativa();
    const pat = dep ? dep.r.patente : null;
    const m = $('#mesaJanela');
    if (m && !m.hidden && m.dataset.id) { A.aviso(`Fim de missão: ${pp ? `+${pp} PP` : ''}${nexSobe ? ` · NEX ${novoNex}%` : ''}`); return; }
    janela('rec-' + rc.id, `<p class="mesa-k">FIM DE MISSÃO</p><h3>${esc(rc.msg || 'Relatório da O.R.F.E.U.')}</h3>
      ${pp ? `<p>+<b>${pp}</b> pontos de prestígio. Total: ${int(d.pp) + pp}.${pat ? ` Patente: <b>${esc(pat.n)}</b> · crédito ${esc(pat.cred.toLowerCase())}.` : ''}</p>` : ''}
      ${nexSobe ? `<p>NEX sobe para <b>${novoNex}%</b>. Confira na ficha as novas habilidades, poderes ou rituais que ele libera.</p>` : ''}
      <div class="mesa-botoes"><button data-mj="abrir-fichas" class="pri">Abrir minha ficha</button><button data-mj="fechar">Fechar</button></div>`, 'recompensa');
    estadoJanela = null;
    A.rolagemDaFicha(`📁 ${d.nome}: fim de missão${pp ? `, +${pp} PP` : ''}${nexSobe ? `, NEX ${novoNex}%` : ''}.`);
  });
}

/* =========================================================
   5. SIGILO DE RITUAL (todas as telas)
   ========================================================= */
let ultimoSigilo = 0;
function sigiloSVG(nome, cor) {
  const r = semente(nome), pontas = 5 + Math.floor(r() * 4), passo = 2 + Math.floor(r() * (pontas / 2 - 1)) || 2;
  const ang = i => (i / pontas) * Math.PI * 2 - Math.PI / 2;
  const P = (raio, i) => [100 + Math.cos(ang(i)) * raio, 100 + Math.sin(ang(i)) * raio];
  let estrela = '', i = 0;
  for (let k = 0; k <= pontas; k++) { const p = P(70, i); estrela += `${k ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`; i = (i + passo) % pontas; }
  const runas = Array.from({ length: pontas * 2 }, (_, k) => {
    const a = (k / (pontas * 2)) * Math.PI * 2, x = 100 + Math.cos(a) * 86, y = 100 + Math.sin(a) * 86, t = 4 + r() * 4, gira = r() * 180;
    return `<path d="M${(x - t).toFixed(1)} ${y.toFixed(1)}l${t} ${(-t).toFixed(1)}l${t} ${t.toFixed(1)}${r() > 0.5 ? `m${(-t).toFixed(1)} ${(-t).toFixed(1)}v${(t * 2).toFixed(1)}` : ''}" transform="rotate(${gira.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }).join('');
  const raios = Array.from({ length: pontas }, (_, k) => { const p = P(70, k), q = P(30, k); return `<path d="M${q[0].toFixed(1)} ${q[1].toFixed(1)}L${p[0].toFixed(1)} ${p[1].toFixed(1)}"/>`; }).join('');
  return `<svg viewBox="0 0 200 200" style="--el:${cor}"><g class="sg-traco" fill="none" stroke="${cor}" stroke-width="1.6" stroke-linecap="round">
    <circle cx="100" cy="100" r="96"/><circle cx="100" cy="100" r="78"/><path d="${estrela}Z"/><circle cx="100" cy="100" r="30"/>${raios}${runas}<circle cx="100" cy="100" r="6"/></g></svg>`;
}
// tudo o que chega em "efeito": sigilo de ritual ou momento marcante
function aoEfeito(e) {
  if (!e || num(e.ts) <= ultimoSigilo || Date.now() - num(e.ts) > 9000) return;
  ultimoSigilo = num(e.ts);
  if (A.mestre) {
    relEfeito(e);
    const k = 'acf-memb-ef';
    if (e.t === 'sigilo' && num(e.ts) > num(ls.get(k, 0))) { ls.set(k, num(e.ts)); quedaPorRitual(e); }
  }
  if (e.t === 'sigilo') mostrarSigilo(e);
  else if (e.t === 'momento') mostrarMomento(e);
}
function mostrarSigilo(e) {
  const cor = corEl(e.el);
  let o = $('#sigiloTela');
  if (!o) { o = document.createElement('div'); o.id = 'sigiloTela'; o.className = 'sigilo-tela'; o.setAttribute('aria-live', 'polite'); document.body.appendChild(o); }
  o.innerHTML = `<div class="sigilo-centro">${sigiloSVG(e.n + e.q, cor)}<p><b>${esc(e.q)}</b> conjura <i style="color:${cor}">${esc(e.n)}</i></p></div>`;
  o.classList.remove('ativo'); void o.offsetWidth; o.classList.add('ativo');
  clearTimeout(mostrarSigilo.t); mostrarSigilo.t = setTimeout(() => o.classList.remove('ativo'), 3200);
  if (somOk() && A.Som && A.Som.tom) { A.Som.tom(110, 0, 1.4, 'sine', 0.09, 55); A.Som.tom(165, 0.1, 1.2, 'triangle', 0.04, 82); }
}

/* =========================================================
   6. AMBIENTE SONORO POR ELEMENTO (gerado no navegador, sem arquivos)
   ========================================================= */
const Amb = {
  el: null, nos: [], timers: [], ctx: null, saida: null,
  parar() {
    this.timers.forEach(clearInterval); this.timers = [];
    this.nos.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} }); this.nos = [];
    if (this.saida) { try { this.saida.disconnect(); } catch (e) {} this.saida = null; }
    this.el = null;
  },
  ruido(c, seg = 2) { const b = c.createBuffer(1, c.sampleRate * seg, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; },
  osc(c, tipo, f, vol, destino) { const o = c.createOscillator(), g = c.createGain(); o.type = tipo; o.frequency.value = f; g.gain.value = vol; o.connect(g); g.connect(destino); o.start(); this.nos.push(o, g); return { o, g }; },
  pulso(c, f, vol, dur, destino, tipo = 'sine', fFim) {
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = tipo; o.frequency.setValueAtTime(f, t); if (fFim) o.frequency.exponentialRampToValueAtTime(fFim, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(destino); o.start(t); o.stop(t + dur + 0.05);
  },
  tocar(el) {
    if (el === this.el) return;
    this.parar();
    if (!el || !somOk() || !A.Som) return;
    const c = A.Som.pronto(); if (!c) return;
    this.el = el;
    const saida = c.createGain(); saida.gain.value = 0; saida.connect(c.destination); this.saida = saida;
    saida.gain.linearRampToValueAtTime(0.85, c.currentTime + 3);
    const filtro = (tipo, f, q = 1) => { const x = c.createBiquadFilter(); x.type = tipo; x.frequency.value = f; x.Q.value = q; x.connect(saida); this.nos.push(x); return x; };
    if (el === 'Sangue') {
      this.osc(c, 'sawtooth', 41, 0.035, filtro('lowpass', 120));
      const bate = () => { this.pulso(c, 62, 0.22, 0.18, saida); setTimeout(() => this.pulso(c, 54, 0.16, 0.2, saida), 230); };
      bate(); this.timers.push(setInterval(bate, 1050));
    } else if (el === 'Morte') {
      this.osc(c, 'sine', 36.7, 0.09, saida); this.osc(c, 'sine', 55, 0.03, saida);
      let lado = 0;
      this.timers.push(setInterval(() => { lado = 1 - lado; this.pulso(c, lado ? 2400 : 2100, 0.03, 0.04, saida, 'square'); }, 1000));
    } else if (el === 'Conhecimento') {
      const n = c.createBufferSource(); n.buffer = this.ruido(c); n.loop = true;
      const bp = filtro('bandpass', 1800, 6); const g = c.createGain(); g.gain.value = 0; n.connect(g); g.connect(bp); n.start(); this.nos.push(n, g);
      this.timers.push(setInterval(() => { const t = c.currentTime; bp.frequency.setValueAtTime(900 + Math.random() * 2600, t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06 + Math.random() * 0.05, t + 0.25); g.gain.linearRampToValueAtTime(0.0001, t + 0.9 + Math.random()); }, 1400));
      this.osc(c, 'sine', 880, 0.008, saida); this.osc(c, 'sine', 1318, 0.005, saida);
    } else if (el === 'Energia') {
      const n = c.createBufferSource(); n.buffer = this.ruido(c); n.loop = true; const g = c.createGain(); g.gain.value = 0.012; n.connect(g); g.connect(filtro('highpass', 3000)); n.start(); this.nos.push(n, g);
      this.timers.push(setInterval(() => { if (Math.random() < 0.7) this.pulso(c, 200 + Math.random() * 1800, 0.035, 0.05 + Math.random() * 0.12, saida, 'square', 100 + Math.random() * 2000); }, 260));
      this.osc(c, 'sawtooth', 60, 0.012, filtro('lowpass', 300));
    } else if (el === 'Medo') {
      [110, 116.54, 155.56, 233.08].forEach((f, i) => { const { g } = this.osc(c, 'sine', f, 0.02, saida); const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 0.07 + i * 0.05; lg.gain.value = 0.015; l.connect(lg); lg.connect(g.gain); l.start(); this.nos.push(l, lg); });
      this.timers.push(setInterval(() => { if (Math.random() < 0.35) this.pulso(c, 48, 0.18, 2.5, saida, 'sine', 30); }, 4000));
    }
  },
};
function verAmbiente() { const a = est().amb; Amb.tocar(a && a.el ? a.el : null); }

/* =========================================================
   7. CENA DE INVESTIGAÇÃO (faixa para todos)
   ========================================================= */
const URGENCIA = [['muito-baixo', 'Muito baixa', 6], ['baixo', 'Baixa', 5], ['medio', 'Média', 4], ['alto', 'Alta', 3], ['muito-alto', 'Muito alta', 2]];
function desenharInvestigacao() {
  const inv = est().inv;
  let f = $('#faixaInv');
  const area = $('.palco-area'); if (!area) return;
  if (!inv || !inv.on) { if (f) f.remove(); return; }
  if (!f) { f = document.createElement('div'); f.id = 'faixaInv'; f.className = 'faixa-inv'; area.appendChild(f); f.addEventListener('click', () => f.classList.toggle('aberta')); }
  const g = URGENCIA.find(u => u[0] === inv.grau) || URGENCIA[2];
  const max = Math.max(1, int(inv.max) || g[2]);
  const rod = int(inv.rod) || 1;
  const pistas = Object.values(inv.pistas || {}).sort((a, b) => num(a.ts) - num(b.ts));
  const fim = rod > max;
  const html = `<div class="inv-linha"><span class="inv-k">🔎 Investigação</span><b>${fim ? 'Tempo esgotado' : `Rodada ${rod} de ${max}`}</b><span class="inv-urg">Urgência ${g[1].toLowerCase()}</span>
    <span class="inv-relogio">${Array.from({ length: max }, (_, i) => `<i class="${i < rod - 1 || fim ? 'gasta' : i === rod - 1 ? 'atual' : ''}"></i>`).join('')}</span><span class="inv-pistas">${pistas.length} pista${pistas.length === 1 ? '' : 's'} ▾</span></div>
    <ol class="inv-lista">${pistas.map(p => `<li>${esc(p.t)}</li>`).join('') || '<li class="vazio">Nenhuma pista ainda.</li>'}</ol>`;
  if (f.dataset.html !== html) { f.innerHTML = html; f.dataset.html = html; }
  f.classList.toggle('fim', fim);
}

/* =========================================================
   8. ABA "MESA" DO MESTRE
   ========================================================= */
function desenharMesaMestre() {
  if (!A.mestre || !$('#mesaHudMeu')) return;
  // retratos
  const grade = (sel, off, salvar) => {
    const caixa = $(sel); if (!semFoco(sel)) return;
    caixa.innerHTML = cobaias().map(x => `<label class="chave"><input type="checkbox" data-id="${x.id}" ${off[x.id] ? '' : 'checked'}><span>${esc(x.nome)} <small>${esc(x.jogador || '')}</small></span></label>`).join('');
    $$('input', caixa).forEach(i => { i.onchange = () => salvar(i.dataset.id, !i.checked); });
  };
  grade('#mesaHudMeu', hudOffMeu(), (id, off) => { const o = hudOffMeu(); if (off) o[id] = true; else delete o[id]; ls.set('acf-hud-gm-off', o); desenharHud(); });
  grade('#mesaHudJog', hudOffJog(), (id, off) => A.definir(['hud', 'off', id], off ? true : null));
  desenharMesaInv(); desenharMesaInt(); desenharMesaRec(); desenharMesaAmb(); desenharMesaRol(); desenharMesaAmea();
  desenharMesaMemb(); desenharMesaMom(); desenharMesaRel();
}
// não redesenha um bloco enquanto alguém digita nele (botões e caixas de marcar não contam)
function semFoco(id) { const e = $(id), a = document.activeElement; return !!e && !(a && e.contains(a) && a.matches('input:not([type=checkbox]), select, textarea')); }
function desenharMesaInv() {
  if (!semFoco('#mesaInv')) return;
  const inv = est().inv || {};
  const pistas = Object.entries(inv.pistas || {}).sort((a, b) => num(a[1].ts) - num(b[1].ts));
  $('#mesaInv').innerHTML = inv.on ? `<p class="mini">Rodada <b>${int(inv.rod) || 1}</b> de <b>${int(inv.max)}</b> · falhas em procurar pistas: <b>${int(inv.falhas)}</b>${inv.r3 ? ' (a cada 3, perde 1 rodada)' : ''}</p>
      <div class="mesa-linha"><button data-mi="rod">Próxima rodada</button><button data-mi="falha">+ Falha</button><button data-mi="fim" class="perigo">Encerrar</button></div>
      <div class="mesa-linha"><input id="mesaPista" placeholder="Nova pista encontrada…"><button data-mi="pista">Revelar</button></div>
      <ol class="mesa-pistas">${pistas.map(([k, p]) => `<li>${esc(p.t)} <button data-mi="tirar" data-k="${k}" aria-label="Tirar">×</button></li>`).join('')}</ol>
      <button data-mi="quadro">Abrir quadro "Pistas"</button>`
    : `<p class="mini">A faixa aparece no mapa de todos com as rodadas e as pistas. Procurar pistas: DT 15 (simples), 20 (complexa), 25 ou mais (vaga).</p>
      <label class="mesa-campo">Urgência <select id="mesaUrg">${URGENCIA.map(u => `<option value="${u[0]}" ${u[0] === 'medio' ? 'selected' : ''}>${u[1]} · ${u[2]} rodadas</option>`).join('')}</select></label>
      <label class="chave"><input type="checkbox" id="mesaR3"><span>Cada 3 falhas tiram 1 rodada</span></label>
      <button data-mi="ini" class="btn-protocolo">Começar investigação</button>`;
}
function desenharMesaInt() {
  if (!semFoco('#mesaInt')) return;
  const it = est().interludio || {};
  $('#mesaInt').innerHTML = it.on ? `<p class="mini">Interlúdio aberto (descanso ${esc((DESCANSO[it.cond] || DESCANSO.normal)[0].toLowerCase())}). Cada jogador escolhe até duas ações na própria tela.</p><div id="mesaIntResp" class="mesa-resp"></div><button data-mi="int-fim" class="perigo">Encerrar interlúdio</button>`
    : `<p class="mini">Cada jogador escolhe até duas ações (dormir, relaxar, alimentar-se, exercitar-se, ler, manutenção, revisar caso) e o site aplica na ficha dele.</p>
      <label class="mesa-campo">Descanso <select id="mesaDesc">${Object.entries(DESCANSO).map(([k, v]) => `<option value="${k}" ${k === 'normal' ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></label>
      <button data-mi="int-ini" class="btn-protocolo">Abrir interlúdio</button>`;
  if (it.on && it.id) ouvirRespostas('mesaIntResp', it.id, r => `${esc(((r.acoes || []).map(a => (ACOES_INT.find(x => x[0] === a) || [, a])[1]).join(' e ')) || '—')}`);
}
let respOff = {};
function ouvirRespostas(alvo, id, fmt) {
  const pinta = v => {
    const el = $('#' + alvo); if (!el) return;
    const rs = Object.entries(v || {});
    el.innerHTML = rs.length ? rs.map(([q, r]) => `<p>${esc((A.SER[q] || {}).nome || q)}: ${fmt(r)}</p>`).join('') : '<p class="mini">Ninguém respondeu ainda.</p>';
  };
  const atual = respOff[alvo];
  if (atual && atual.id === id) { pinta(atual.v); return; }
  if (atual) atual.off();
  const reg = { id, v: null, off: () => {} };
  respOff[alvo] = reg;
  reg.off = A.Rede.on('mesaResp/' + id, v => { reg.v = v; pinta(v); }, () => {});
}
function desenharMesaRec() {
  if (!semFoco('#mesaRec')) return;
  const rc = est().recomp;
  const nexes = (FX() && FX().NEXES) || [];
  $('#mesaRec').innerHTML = `<p class="mini">Pontos de prestígio e NEX de cada cobaia. A ficha ativa de cada jogador recebe sozinha (patente, crédito e limite de itens sobem junto). Quem estiver fora recebe quando voltar.</p>
    <div class="mesa-rec">${cobaias().map(x => `<div class="mesa-rec-linha"><span>${esc(x.nome)}</span><label>PP <input type="number" data-pp="${x.id}" min="0" value="0"></label><label>NEX <select data-nex="${x.id}"><option value="">—</option>${nexes.map(n => `<option value="${n}">${n}%</option>`).join('')}</select></label></div>`).join('')}</div>
    <label class="mesa-campo">Título <input id="mesaRecMsg" placeholder="Ex.: Missão concluída: o Laboratório Nº 5"></label>
    <button data-mi="rec" class="btn-protocolo">Enviar recompensas</button>
    ${rc && rc.id ? `<p class="mini">Último envio: ${esc(rc.msg || 'sem título')} · ${new Date(num(rc.ts)).toLocaleString('pt-BR')}</p>` : ''}`;
}
function desenharMesaAmb() {
  if (!semFoco('#mesaAmb')) return;
  const a = est().amb || {};
  $('#mesaAmb').innerHTML = `<p class="mini">Som contínuo em todos os aparelhos (quem desligou o 🔊 não ouve). Feito no próprio navegador, sem arquivos.</p>
    <div class="mesa-amb">${Object.keys(ELEM).filter(e => e !== 'Varia').map(e => `<button data-mi="amb" data-v="${e}" class="${a.el === e ? 'on' : ''}" style="--el:${ELEM[e]}">${e}</button>`).join('')}<button data-mi="amb" data-v="" class="${!a.el ? 'on' : ''}">Silêncio</button></div>`;
}
function desenharMesaRol() {
  if (!semFoco('#mesaRol')) return;
  if ($('#mesaRolExpr')) return;
  $('#mesaRol').innerHTML = `<p class="mini">Só você vê o resultado. "3d20+5" vira teste (fica com o maior d20); qualquer outra expressão soma.</p>
    <div class="mesa-linha"><input id="mesaRolExpr" value="1d20" aria-label="Expressão"><button data-mi="rol">Rolar</button></div>
    <label class="chave"><input type="checkbox" id="mesaRolAvisa" checked><span>Avisar no chat que o Mestre rolou algo</span></label>
    <div id="mesaRolRes" class="mesa-rol-res"></div>`;
}
let ameaOff = null;
function desenharMesaAmea() {
  if (ameaOff || !$('#mesaAmea')) return;
  ameaOff = A.Rede.on('agentesMestre', v => {
    const lista = Object.entries(v || {}).filter(([, d]) => d && d.tipo === 'ameaca');
    $('#mesaAmea').innerHTML = `<p class="mini">Fichas de criatura com Presença Perturbadora, ataques e PV. Crie em 📋 Fichas › Minhas fichas › + Nova ameaça.</p>`
      + (lista.length ? lista.map(([k, d]) => `<div class="mesa-amea" style="--el:${corEl(d.el)}"><b>${esc(d.nome)}</b><small>VD ${int(d.vd)} · Vontade DT ${int((d.pres || {}).dt)} · ${esc((d.pres || {}).dano || '')}</small></div>`).join('') : '<p class="mini">Nenhuma ameaça criada.</p>')
      + '<button data-mi="fichas">Abrir fichas</button>';
  }, () => {});
}
function aoClicarMesa(e) {
  const b = e.target.closest('[data-mi]'); if (!b || !A.mestre) return;
  const a = b.dataset.mi, inv = est().inv || {};
  if (a === 'ini') {
    const g = URGENCIA.find(u => u[0] === $('#mesaUrg').value) || URGENCIA[2];
    A.definir(['inv'], { on: true, grau: g[0], max: g[2], rod: 1, falhas: 0, r3: !!$('#mesaR3').checked, pistas: {}, ts: Date.now() });
  } else if (a === 'rod') A.definir(['inv', 'rod'], (int(inv.rod) || 1) + 1);
  else if (a === 'falha') {
    const f = int(inv.falhas) + 1;
    A.definir(['inv', 'falhas'], f);
    if (inv.r3 && f % 3 === 0) { A.definir(['inv', 'max'], Math.max(1, int(inv.max) - 1)); A.aviso('Terceira falha: a investigação perde uma rodada.'); }
  } else if (a === 'fim') { if (confirm('Encerrar a investigação para todos?')) A.definir(['inv'], null); }
  else if (a === 'pista') {
    const t = ($('#mesaPista').value || '').trim().slice(0, 300); if (!t) return;
    A.definir(['inv', 'pistas', A.Rede.chave()], { t, ts: Date.now() }); $('#mesaPista').value = '';
    if (somOk() && A.Som) A.Som.tom(660, 0, 0.12, 'triangle', 0.08, 990);
  } else if (a === 'tirar') A.definir(['inv', 'pistas', b.dataset.k], null);
  else if (a === 'quadro') { if (window.ACF_QUADRO) window.ACF_QUADRO.abrir(); }
  else if (a === 'int-ini') A.definir(['interludio'], { on: true, id: A.Rede.chave(), cond: $('#mesaDesc').value, ts: Date.now() });
  else if (a === 'int-fim') { if (confirm('Encerrar o interlúdio?')) A.definir(['interludio'], { ...(est().interludio || {}), on: false }); }
  else if (a === 'rec') {
    const por = {};
    cobaias().forEach(x => {
      const pp = int(($(`[data-pp="${x.id}"]`) || {}).value), nex = int(($(`[data-nex="${x.id}"]`) || {}).value);
      if (pp || nex) por[x.id] = { pp, nex };
    });
    if (!Object.keys(por).length) { A.aviso('Preencha PP ou NEX de alguém.'); return; }
    if (!confirm('Enviar as recompensas? Cada ficha ativa recebe uma vez só.')) return;
    A.definir(['recomp'], { id: A.Rede.chave(), por, msg: ($('#mesaRecMsg').value || '').trim().slice(0, 120), ts: Date.now() });
    A.aviso('Recompensas enviadas.');
    setTimeout(desenharMesaRec, 50);
  } else if (a === 'amb') { A.definir(['amb'], b.dataset.v ? { el: b.dataset.v, ts: Date.now() } : null); }
  else if (a === 'rol') rolagemSecreta();
  else if (a === 'fichas') { FX() && FX().abrir(); }
  else if (a === 'memb-ok') mudarMemb(int(b.dataset.cn), 100);
  else if (a === 'memb-tudo') { if (confirm('Restaurar a membrana de todas as salas?')) A.definir(['membrana'], null); }
  else if (a === 'mom-teste') mostrarMomento({ t: 'momento', k: b.dataset.v, n: 'teste (só na sua tela)', q: 'Mestre', id: (cobaias()[0] || {}).id, ts: Date.now() });
  else if (a === 'rel-ver') abrirRelatorio();
  else if (a === 'rel-novo') {
    if (!confirm('Começar o registro de uma nova missão? O relatório atual será apagado (gere e salve antes).')) return;
    relMeta = { nome: '', inicio: Date.now() };
    A.Rede.set('relatorio', { meta: relMeta }).catch(() => {});
    $('#mesaRel').dataset.html = ''; desenharMesaRel();
  }
}
function rolagemSecreta() {
  const ex = ($('#mesaRolExpr').value || '1d20').trim();
  const m = /^\s*(\d*)d20\s*([+-]\s*\d+)?\s*$/i.exec(ex);
  let html;
  if (m && FX()) {
    const t = FX().rolarTeste(int(m[1] || 1), int((m[2] || '0').replace(/\s/g, '')));
    html = `<div class="dados-faces">${t.dados.map(x => `<span class="face${x === t.esc ? ' usada' : ''}">${x}</span>`).join('')}</div><p>${t.desv ? 'Menor' : 'Maior'} ${t.esc} ${t.bonus >= 0 ? '+' : '−'} ${Math.abs(t.bonus)} = <b class="mesa-total">${t.total}</b></p>`;
  } else if (FX()) { const r = FX().rolarExpr(ex); html = `<p>${esc(r.det)} = <b class="mesa-total">${r.total}</b></p>`; }
  $('#mesaRolRes').innerHTML = html + `<p class="mini">${new Date().toLocaleTimeString('pt-BR')}</p>`;
  if ($('#mesaRolAvisa').checked) A.enviarChat('🎲 O Mestre rolou algo em segredo…', 'geral');
}

/* ---------- Escudo do Mestre (resumos das regras) ---------- */
function abrirEscudo() {
  let o = $('#escudoMestre');
  if (!o) { o = document.createElement('div'); o.id = 'escudoMestre'; o.className = 'escudo'; document.body.appendChild(o); o.addEventListener('click', e => { if (e.target === o || e.target.closest('[data-esc="fechar"]')) o.hidden = true; }); }
  const C = (FX() && FX().PATENTES) || [];
  const t = (tit, linhas) => `<section><h3>${tit}</h3><table>${linhas.map(l => `<tr>${l.map((c, i) => `<${i ? 'td' : 'th'}>${c}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</table></section>`;
  const p = (tit, itens) => `<section><h3>${tit}</h3><ul>${itens.map(x => `<li>${x}</li>`).join('')}</ul></section>`;
  o.innerHTML = `<div class="escudo-caixa"><header><span>O.R.F.E.U. · USO DO MESTRE</span><h2>Escudo do Mestre</h2><button data-esc="fechar" aria-label="Fechar">×</button></header><div class="escudo-grade">
    ${t('Dificuldades', [['Fácil', '5'], ['Média', '10'], ['Difícil', '15'], ['Muito difícil', '20'], ['Formidável', '25'], ['Heroica', '30'], ['Quase impossível', '35']])}
    ${p('Dados', ['Teste: 1d20 por ponto do atributo, fica com o maior, soma o bônus da perícia.', 'Atributo 0: rola 2d20 e fica com o pior.', '+O é um d20 a mais; −O, um a menos.', 'Se as penalidades deixarem menos de 1 dado, rola como se fossem bônus e fica com o pior.', 'Treino: leigo +0, treinado +5, veterano +10, expert +15.'])}
    ${t('Urgência da investigação', [['Muito baixa', '6 rodadas'], ['Baixa', '5'], ['Média', '4'], ['Alta', '3'], ['Muito alta', '2'], ['Procurar pistas', 'DT 15 simples · 20 complexa · 25+ vaga'], ['Opcional', 'a cada 3 falhas, −1 rodada']])}
    ${p('Ferimentos e loucura', ['<b>Machucado</b>: metade dos PV ou menos (sem penalidade; pré-requisito de efeitos).', '<b>Morrendo</b>: 0 PV, inconsciente. Três turnos iniciados morrendo na mesma cena: morre. Medicina DT 20 (+5 por estabilização anterior na cena).', '<b>Perturbado</b>: menos da metade da SAN. Na primeira vez na cena, um efeito de insanidade (Tabela 5.1, p. 112).', '<b>Enlouquecendo</b>: SAN 0. Três turnos na mesma cena: insano, vira NPC. Diplomacia DT 20 (+5 por vez já acalmado) ou curar 1 de SAN.', '<b>Perda de vida</b>: reduz PV ignorando resistência a dano.'])}
    ${p('Presença Perturbadora', ['Ao enxergar a criatura: Vontade contra a DT da ficha.', 'Falhou: sofre o dano mental. Passou: metade.', 'NEX igual ou acima do indicado: imune.', 'Várias criaturas: usa a de VD mais alto, +1d6 por criatura a mais.', 'Determinação: cada dado desce um passo e a quantidade cai à metade (arredonda para cima).'])}
    ${p('Rituais', ['DT para resistir: 10 + limite de PE + Presença.', 'Custo: 1º círculo 1 PE · 2º 3 PE · 3º 6 PE · 4º 10 PE (formas avançadas somam o indicado).', '<b>Custo do Paranormal</b> (exceto Medo): Ocultismo DT 20 + custo. Falhou: perde SAN igual ao custo; por 5 ou mais, também 1 de SAN permanente.', '<b>Medo</b>: sempre perde SAN igual ao custo e 1 permanente (discente 2, verdadeiro 3).'])}
    ${p('Condições', ['<b>Abalado</b> −O em testes (de novo: apavorado). <b>Apavorado</b> −OO em perícias e foge da fonte.', '<b>Fraco</b> −O em Agi, For e Vig (de novo: debilitado). <b>Debilitado</b> −OO nesses (de novo: inconsciente).', '<b>Frustrado</b> −O em Int e Pre (de novo: esmorecido). <b>Esmorecido</b> −OO nesses.', '<b>Desprevenido</b> −5 Defesa e −O Reflexos. <b>Vulnerável</b> −2 Defesa. <b>Indefeso</b> −10 Defesa, falha em Reflexos.', '<b>Cego</b> desprevenido e lento, −OO em perícias de Agi e For. <b>Ofuscado</b> −O em ataque e Percepção. <b>Surdo</b> −OO Iniciativa.', '<b>Caído</b> −OO em ataque corpo a corpo, desloc. 1,5m, −5 Def. corpo a corpo e +5 à distância.', '<b>Agarrado</b> desprevenido, imóvel, −O em ataque. <b>Enredado</b> lento, vulnerável, −O em ataque.', '<b>Fatigado</b> fraco e vulnerável. <b>Exausto</b> debilitado, lento e vulnerável.', '<b>Alquebrado</b> +1 PE em habilidades e rituais. <b>Lento</b> metade do deslocamento. <b>Enjoado</b> uma ação padrão ou de movimento por rodada.', '<b>Sangrando</b> Vigor DT 20 no início do turno; falha perde 1d6 PV. <b>Em chamas</b> 1d6 de fogo por turno; ação padrão apaga.', 'Condições terminam no fim da cena, salvo indicação.'])}
    ${p('Interlúdio (duas ações)', ['<b>Dormir</b>: PV e PE iguais ao limite de PE × descanso (precária ½, normal ×1, confortável ×2, luxuosa ×3). Uma vez.', '<b>Relaxar</b>: SAN do mesmo jeito, +1 por colega que também relaxar. Uma vez.', '<b>Alimentar-se</b>: favorito +2 SAN ao relaxar; nutritivo e energético sobem um passo de PV ou PE ao dormir; rápido +5 em revisar caso.', '<b>Exercitar-se</b> e <b>Ler</b>: +1d6 guardado (máximo Vigor ou Intelecto).', '<b>Manutenção</b> conserta item. <b>Revisar caso</b> pode render uma pista que passou.', 'Determinação: dormir só recupera PV; relaxar recupera PD; prato favorito dá 2 PD temporários.'])}
    ${p('Perigos', ['<b>Queda</b>: 1d6 de impacto a cada 1,5m (máx. 40d6 em 60m). Na água, −4d6.', '<b>Fogo</b>: Reflexos DT 15 ou fica em chamas.', '<b>Asfixia</b>: segura o ar por rodadas igual ao Vigor; depois Fortitude DT 5 (+5 por teste).'])}
    ${t('Patentes', C.map(x => [x.n, `${x.pp} PP · crédito ${x.cred.toLowerCase()} · itens I ${x.lim[0]}, II ${x.lim[1]}, III ${x.lim[2]}, IV ${x.lim[3]}`]))}
  </div><p class="escudo-rodape">Resumos para consulta rápida. A regra completa está no livro (OPRPG v1.3 e Sobrevivendo ao Horror).</p></div>`;
  o.hidden = false;
}

/* =========================================================
   10. MEMBRANA
   Cada sala tem uma estabilidade de 0 a 100 (sem registro = 100).
   Rituais conjurados ali e Presenças Perturbadoras derrubam sozinhos (feito pela tela do Mestre).
   Todos veem as rachaduras nas salas conhecidas; o número só aparece para quem
   carrega um Medidor de Estabilidade da Membrana na ficha ativa.
   ========================================================= */
const MEMB_GRAUS = [[75, 'estável', 'estavel'], [50, 'fissurada', 'fissurada'], [25, 'rachada', 'rachada'], [1, 'crítica', 'critica'], [0, 'rompida', 'rompida']];
const membDe = cn => { const v = (est().membrana || {})['c' + cn]; return v === undefined || v === null ? 100 : Math.max(0, Math.min(100, int(v))); };
const grauMemb = v => MEMB_GRAUS.find(g => v >= g[0]) || MEMB_GRAUS[4];
const membAuto = () => ls.get('acf-memb-auto', true);
function temMedidor() {
  const at = FX() && FX().ativa();
  return !!at && Object.values(at.d.itens || {}).some(it => it && /medidor de estabilidade da membrana/i.test(it.n || '') && (it.qtd === undefined || it.qtd === '' || int(it.qtd) > 0));
}
function mudarMemb(cn, novo) {
  if (!A.mestre || !cn) return;
  novo = Math.max(0, Math.min(100, Math.round(novo)));
  if (novo === membDe(cn)) return;
  A.definir(['membrana', 'c' + cn], novo >= 100 ? null : novo);
}
// rachaduras desenhadas por sala (forma fixa pelo número da sala). Três camadas: aparecem conforme o grau.
function rachaduras(cn) {
  const r = semente('memb' + cn);
  const camada = k => Array.from({ length: 2 + k }, () => {
    const lado = Math.floor(r() * 4), t = 10 + r() * 80;
    let x = lado === 0 ? t : lado === 1 ? 100 : lado === 2 ? t : 0, y = lado === 0 ? 0 : lado === 1 ? t : lado === 2 ? 100 : t;
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    const alvoX = 35 + r() * 30, alvoY = 35 + r() * 30, passos = 4 + Math.floor(r() * 3);
    let ramos = '';
    for (let i = 1; i <= passos; i++) {
      x += (alvoX - x) / (passos - i + 1.4) + (r() - 0.5) * 14; y += (alvoY - y) / (passos - i + 1.4) + (r() - 0.5) * 14;
      d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
      if (r() > 0.6) ramos += `M${x.toFixed(1)} ${y.toFixed(1)}l${((r() - 0.5) * 22).toFixed(1)} ${((r() - 0.5) * 22).toFixed(1)}`;
    }
    return `<path d="${d}${ramos}"/>`;
  }).join('');
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g class="rc rc1">${camada(0)}</g><g class="rc rc2">${camada(1)}</g><g class="rc rc3">${camada(2)}</g><ellipse class="rc-fenda" cx="50" cy="50" rx="9" ry="16"/></svg>`;
}
function pintarMembrana() {
  $$('.sala[data-cn]').forEach(s => {
    const cn = +s.dataset.cn, v = membDe(cn);
    const vis = !s.classList.contains('desconhecida');
    const g = v >= 75 || !vis ? '' : grauMemb(v)[2];
    if ((s.dataset.memb || '') === g) return;
    s.classList.remove('memb-fissurada', 'memb-rachada', 'memb-critica', 'memb-rompida');
    let fx = $('.memb-fx', s);
    if (g) {
      s.classList.add('memb-' + g);
      if (!fx) { fx = document.createElement('i'); fx.className = 'memb-fx'; fx.innerHTML = rachaduras(cn); const tinta = $('.sala-tinta', s); s.insertBefore(fx, tinta ? tinta.nextSibling : s.firstChild); }
    } else if (fx) fx.remove();
    s.dataset.memb = g;
  });
}
const membAnt = {};
let membIni = false;
function vigiarMembrana() {
  if (!A.mestre) { membIni = false; return; }
  const m = est().membrana || {};
  const chaves = new Set([...Object.keys(m), ...Object.keys(membAnt)]);
  chaves.forEach(k => {
    const v = m[k] === undefined || m[k] === null ? 100 : int(m[k]);
    const ant = membAnt[k] === undefined ? 100 : membAnt[k];   // sala sem registro = 100
    membAnt[k] = v;
    if (!membIni || ant === v) return;
    const cn = +k.slice(1);
    if (ant > 0 && v <= 0) {
      A.aviso(`🩸 A membrana se rompeu: ${A.nomeSala(cn)}. O Outro Lado está aberto aqui.`);
      A.diario('sala', `Membrana rompida: ${A.nomeSala(cn)}`);
      registrarRel('membrana', '', 0, A.nomeSala(cn), 'mb' + cn + '-' + Date.now());
      if (somOk() && A.Som) { A.Som.tom(55, 0, 2.2, 'sawtooth', 0.12, 28); A.Som.tom(880, 0.05, 0.9, 'sine', 0.04, 220); }
    } else if (grauMemb(ant)[2] !== grauMemb(v)[2] && v < ant && v > 0 && v < 25) A.aviso(`A membrana da ${A.nomeSala(cn)} está crítica (${v}).`);
  });
  membIni = true;
}
// quedas automáticas: ritual conjurado na sala e Presença Perturbadora
function quedaPorRitual(e) {
  if (!A.mestre || !membAuto() || !e || !e.quem) return;
  const cn = A.salaDe(e.quem); if (!cn) return;
  const queda = 5 * Math.max(1, int(e.c) || 1) * (/medo/i.test(e.el || '') ? 2 : 1);
  mudarMemb(cn, membDe(cn) - queda);
}
function quedaPorPresenca(ch) {
  if (!A.mestre || !membAuto()) return;
  const queda = Math.max(3, Math.min(20, Math.round((int(ch.vd) || 100) / 20)));
  const salas = new Set(Object.keys(ch.alvos || {}).map(id => A.salaDe(id)).filter(Boolean));
  salas.forEach(cn => mudarMemb(cn, membDe(cn) - queda));
}
function htmlMembMestre(cn) {
  const v = membDe(cn), g = grauMemb(v);
  return `<div class="memb-cartao memb-g-${g[2]}" style="--v:${v}"><div class="memb-cab"><span>MEMBRANA</span><b>${v}</b><small>/100 · ${g[1]}</small></div><div class="memb-barra"><i></i></div>
    <div class="acoes memb-acoes"><button data-memb="-5">−5</button><button data-memb="-10">−10</button><button data-memb="-25">−25</button><button data-memb="+10">+10</button><button data-memb="=100">Restaurar</button></div></div>`;
}
function htmlMembPublico(cn) {
  if (!temMedidor()) return '';
  const v = membDe(cn), g = grauMemb(v);
  return `<div class="memb-cartao memb-g-${g[2]} memb-leitura" style="--v:${v}"><div class="memb-cab"><span>📟 MEDIDOR</span><b>${v}%</b><small>${g[1]}</small></div><div class="memb-barra"><i></i></div></div>`;
}
A.ganchoSala({
  mestre: htmlMembMestre,
  publico: htmlMembPublico,
  ligar(c, cn, pub) {
    if (pub || !A.mestre) return;
    $$('[data-memb]', c).forEach(b => b.onclick = () => {
      const t = b.dataset.memb;
      mudarMemb(cn, t[0] === '=' ? int(t.slice(1)) : membDe(cn) + int(t));
    });
  },
});
function desenharMesaMemb() {
  if (!semFoco('#mesaMemb')) return;
  const m = est().membrana || {};
  const lista = Object.keys(m).map(k => +k.slice(1)).filter(cn => membDe(cn) < 100).sort((a, b) => membDe(a) - membDe(b));
  const html = `<p class="mini">Cada sala começa em 100. Ritual conjurado na sala tira 5 por círculo (Medo tira o dobro); Presença Perturbadora tira de 3 a 20 conforme o VD. Ajuste e restaure pelo cartão da sala. Só quem tem um <i>Medidor de Estabilidade da Membrana</i> na ficha vê o número.</p>
    <label class="chave"><input type="checkbox" id="mesaMembAuto" ${membAuto() ? 'checked' : ''}><span>Quedas automáticas (rituais e Presença)</span></label>
    ${lista.length ? `<ul class="memb-lista">${lista.map(cn => { const v = membDe(cn), g = grauMemb(v); return `<li class="memb-g-${g[2]}" style="--v:${v}"><span>${esc(A.nomeSala(cn))}</span><b>${v}</b><i class="memb-barra"><i></i></i><button data-mi="memb-ok" data-cn="${cn}" title="Restaurar">↺</button></li>`; }).join('')}</ul>
      <button data-mi="memb-tudo" class="perigo">Restaurar todas</button>` : '<p class="mini">Todas as salas estão estáveis.</p>'}`;
  const c = $('#mesaMemb');
  if (c.dataset.html !== html) { c.innerHTML = html; c.dataset.html = html; $('#mesaMembAuto').onchange = e => ls.set('acf-memb-auto', e.target.checked); }
}

/* =========================================================
   11. MOMENTOS MARCANTES (20 natural, 1 natural, óbito, insanidade)
   ========================================================= */
const MOMENTOS = [['20', '20 natural'], ['1', '1 natural'], ['obito', 'Óbito'], ['insano', 'Insanidade']];
const momentoLigado = k => !(((est().momentos || {}).off) || {})[k];
// chamado pela ficha do jogador ao rolar
function momento(k, titulo, d) {
  if (!momentoLigado(k) || A.mestre) return;
  try { A.Rede.set('efeito', { t: 'momento', k, n: String(titulo || '').slice(0, 120), q: String((d && d.nome) || '').slice(0, 120), id: A.meu || '', ts: Date.now() }); } catch (e) {}
}
function mostrarMomento(e) {
  let o = $('#momentoTela');
  if (!o) { o = document.createElement('div'); o.id = 'momentoTela'; o.className = 'momento-tela'; o.setAttribute('aria-live', 'polite'); document.body.appendChild(o); o.addEventListener('click', () => o.classList.remove('ativo')); }
  const s = A.SER[e.id] || {};
  const foto = s.img ? ` style="background-image:url('${s.img}')"` : '';
  const k = e.k;
  let html = '';
  if (k === '20') html = `<div class="mm mm-20"><i class="mm-raios"></i><b class="mm-num">20</b><p><b>${esc(e.q)}</b>${e.n ? ' · ' + esc(e.n) : ''}</p></div>`;
  else if (k === '1') html = `<div class="mm mm-1"><b class="mm-num">1</b><svg class="mm-trinca" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M48 0L52 22L41 38L57 55L46 72L54 100M52 22L68 30M41 38L24 44M57 55L76 60M46 72L30 82"/></svg><p><b>${esc(e.q)}</b>${e.n ? ' · ' + esc(e.n) : ''}</p></div>`;
  else if (k === 'obito' || k === 'insano') {
    const ob = k === 'obito';
    html = `<div class="mm mm-ficha ${ob ? 'mm-obito' : 'mm-insano'}" style="--cor:${s.cor || '#888'}"><div class="mm-papel"><span class="mm-cab">O.R.F.E.U. · REGISTRO DE AGENTE</span>
      <div class="mm-foto"${foto}></div><b class="mm-nome">${esc(s.nome || e.q || '')}</b><small>${esc(s.jogador || '')}</small>
      <span class="mm-data">${new Date(num(e.ts)).toLocaleDateString('pt-BR')}</span><i class="mm-carimbo">${ob ? 'ÓBITO' : 'INSANO'}</i></div></div>`;
  }
  if (!html) return;
  o.className = 'momento-tela k-' + k;
  o.innerHTML = html;
  o.classList.remove('ativo'); void o.offsetWidth; o.classList.add('ativo');
  clearTimeout(mostrarMomento.t); mostrarMomento.t = setTimeout(() => o.classList.remove('ativo'), k === '20' || k === '1' ? 3400 : 6500);
  if (!somOk() || !A.Som) return;
  if (k === '20') [523, 659, 784, 1047].forEach((f, i) => A.Som.tom(f, i * 0.09, 0.5, 'triangle', 0.07));
  else if (k === '1') { A.Som.tom(220, 0, 0.6, 'sawtooth', 0.07, 70); A.Som.tom(110, 0.05, 0.8, 'square', 0.04, 40); }
  else if (k === 'obito') { A.Som.tom(98, 0, 2.4, 'sine', 0.14, 49); A.Som.tom(147, 0.5, 2, 'sine', 0.06, 73); }
  else { [311, 330, 349, 370].forEach((f, i) => A.Som.tom(f, i * 0.12, 1.4, 'sine', 0.05, f * 0.5)); }
}
// óbito e insanidade: a tela do Mestre percebe o contador chegar a 3
const contAnt = {};
let contIni = false;
function vigiarContadores() {
  if (!A.mestre) { contIni = false; return; }
  const c = est().cond || {};
  cobaias().forEach(x => {
    const mt = int((c[x.id] || {})._mt), et = int((c[x.id] || {})._et);
    const ant = contAnt[x.id];
    contAnt[x.id] = { mt, et };
    if (!contIni || !ant) return;
    const base = { t: 'momento', n: '', q: x.nome, id: x.id, ts: Date.now() };
    if (ant.mt < 3 && mt >= 3 && momentoLigado('obito')) A.Rede.set('efeito', { ...base, k: 'obito' }).catch(() => {});
    else if (ant.et < 3 && et >= 3 && momentoLigado('insano')) A.Rede.set('efeito', { ...base, k: 'insano' }).catch(() => {});
  });
  contIni = true;
}
function desenharMesaMom() {
  if (!semFoco('#mesaMom')) return;
  const html = `<p class="mini">Animação curta na tela de todos. O 20 e o 1 saem das rolagens das fichas; óbito e insanidade, quando o contador de Morrendo ou Enlouquecendo chega a 3.</p>
    <div class="lista-apagao">${MOMENTOS.map(([k, n]) => `<label class="chave"><input type="checkbox" data-mom="${k}" ${momentoLigado(k) ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
    <div class="mesa-linha"><button data-mi="mom-teste" data-v="20">Testar 20</button><button data-mi="mom-teste" data-v="obito">Testar óbito</button></div>`;
  const c = $('#mesaMom');
  if (c.dataset.html !== html) { c.innerHTML = html; c.dataset.html = html; $$('[data-mom]', c).forEach(i => i.onchange = () => A.definir(['momentos', 'off', i.dataset.mom], i.checked ? null : true)); }
}

/* =========================================================
   12. RELATÓRIO O.R.F.E.U. (montado pela tela do Mestre)
   relatorio/meta {nome, inicio} e relatorio/ev/<chave> {t, q, v, x, ts}. Só o Mestre lê e grava.
   ========================================================= */
let relMeta, relOff = null;
function ligarRelatorio() {
  if (relOff || !A.mestre || !A.pronto) return;
  relOff = A.Rede.on('relatorio/meta', v => { relMeta = v || null; desenharMesaRel(); }, () => {});
}
function registrarRel(t, q, v, x, chave) {
  if (!A.mestre || !A.pronto || relMeta === undefined) return;
  const ts = Date.now();
  if (!relMeta) { relMeta = { nome: '', inicio: ts }; A.Rede.set('relatorio/meta', relMeta).catch(() => {}); }
  A.Rede.set('relatorio/ev/' + (chave || A.Rede.chave()), { t, q: q || '', v: int(v), x: String(x || '').slice(0, 200), ts }).catch(() => {});
}
const vitAnt = {}, condAnt = {};
let pistasAnt = null, chamadoAnt, intAnt, recAnt, relIni = false;
function vigiarRelatorio() {
  if (!A.mestre || relMeta === undefined) return;
  const e = est();
  cobaias().forEach(x => {
    const v = ((e.tokens || {})[x.id] || {}).vit;
    const ant = vitAnt[x.id];
    vitAnt[x.id] = v ? { ...v } : null;
    if (relIni && v && ant && ant.nome === v.nome) {
      const dif = k => int(v[k]) - int(ant[k]);
      if (dif('pv') < 0) registrarRel('dano', x.id, -dif('pv'));
      if (dif('pv') > 0) registrarRel('cura', x.id, dif('pv'));
      if (v.san !== undefined && ant.san !== undefined && dif('san') < 0) registrarRel('san', x.id, -dif('san'));
      if (v.pd !== undefined && ant.pd !== undefined && dif('pd') < 0) registrarRel('pd', x.id, -dif('pd'));
      if (v.pe !== undefined && ant.pe !== undefined && dif('pe') < 0) registrarRel('pe', x.id, -dif('pe'));
    }
    const cs = A.condicoesVisiveis(x.id);
    const ca = condAnt[x.id];
    condAnt[x.id] = { m: cs.includes('morrendo'), e: cs.includes('enlouquecendo') };
    if (relIni && ca) {
      if (!ca.m && condAnt[x.id].m) registrarRel('caiu', x.id);
      if (!ca.e && condAnt[x.id].e) registrarRel('enl', x.id);
    }
  });
  const pistas = (e.inv || {}).pistas || {};
  if (relIni && pistasAnt) Object.entries(pistas).forEach(([k, p]) => { if (!pistasAnt.has(k)) registrarRel('pista', '', 0, p.t, 'i' + k); });
  pistasAnt = new Set(Object.keys(pistas));
  const ch = e.chamado;
  if (relIni && ch && ch.id && ch.id !== chamadoAnt && ch.t === 'presenca') registrarRel('presenca', '', Object.keys(ch.alvos || {}).length, ch.nome, 'p' + ch.id);
  chamadoAnt = ch && ch.id;
  const it = e.interludio;
  if (relIni && it && it.on && it.id !== intAnt) registrarRel('interludio', '', 0, (DESCANSO[it.cond] || DESCANSO.normal)[0], 'l' + it.id);
  intAnt = it && it.on ? it.id : null;
  const rc = e.recomp;
  if (relIni && rc && rc.id && rc.id !== recAnt) registrarRel('recomp', '', 0, rc.msg || '', 'r' + rc.id);
  recAnt = rc && rc.id;
  relIni = true;
}
// efeitos (rituais e momentos) chegam pelo caminho "efeito"
function relEfeito(ef) {
  if (ef.t === 'sigilo') registrarRel('ritual', ef.quem || '', int(ef.c), `${ef.n}${ef.el ? ' (' + ef.el + ')' : ''}`, 'e' + int(ef.ts));
  else if (ef.t === 'momento') registrarRel('m' + ef.k, ef.id || '', 0, ef.n || '', 'e' + int(ef.ts));
}
function desenharMesaRel() {
  if (!$('#mesaRel') || !semFoco('#mesaRel')) return;
  const m = relMeta;
  const html = `<p class="mini">Enquanto sua tela estiver aberta, o site anota dano, Sanidade, PE, rituais, quedas, pistas, Presenças, rupturas da membrana e momentos marcantes. No fim, gere o relatório para salvar em PDF ou mandar no grupo.</p>
    ${m ? `<p class="mini">Missão em registro desde <b>${new Date(num(m.inicio)).toLocaleString('pt-BR')}</b>.</p>` : '<p class="mini">Nenhum registro ainda: começa sozinho no primeiro acontecimento.</p>'}
    <label class="mesa-campo">Nome da missão <input id="mesaRelNome" value="${esc((m && m.nome) || '')}" placeholder="Ex.: Missão 03 · O Laboratório Nº 5"></label>
    <div class="mesa-linha"><button data-mi="rel-ver" class="btn-protocolo">📁 Gerar relatório</button><button data-mi="rel-novo" class="perigo">Nova missão</button></div>`;
  const c = $('#mesaRel');
  if (c.dataset.html !== html) {
    c.innerHTML = html; c.dataset.html = html;
    $('#mesaRelNome').onchange = ev => { const nome = ev.target.value.trim().slice(0, 120); relMeta = { ...(relMeta || { inicio: Date.now() }), nome }; A.Rede.set('relatorio/meta', relMeta).catch(() => {}); };
  }
}
const ROT_REL = { dano: 'sofreu dano', cura: 'recuperou PV', san: 'perdeu Sanidade', pd: 'perdeu Determinação', pe: 'gastou PE', caiu: 'caiu (morrendo)', enl: 'começou a enlouquecer', pista: 'Pista', presenca: 'Presença Perturbadora', interludio: 'Interlúdio', recomp: 'Fim de missão', ritual: 'conjurou', membrana: 'Membrana rompida', m20: 'tirou 20 natural', m1: 'tirou 1 natural', mobito: 'ÓBITO', minsano: 'INSANIDADE', cena: 'Nova cena' };
async function abrirRelatorio() {
  const dados = await A.Rede.once('relatorio').catch(() => null) || {};
  const meta = dados.meta || {}, evs = Object.values(dados.ev || {}).sort((a, b) => num(a.ts) - num(b.ts));
  const nomeDe = id => (A.SER[id] || {}).nome || id || '';
  const por = {};
  cobaias().forEach(x => { por[x.id] = { dano: 0, cura: 0, san: 0, pd: 0, pe: 0, rit: [], m20: 0, m1: 0, caiu: 0, enl: 0, fim: '' }; });
  const pistas = [], pres = [], memb = [];
  let cenas = 0;
  evs.forEach(e => {
    const p = por[e.q];
    if (p) {
      if (['dano', 'cura', 'san', 'pd', 'pe'].includes(e.t)) p[e.t] += int(e.v);
      if (e.t === 'ritual') p.rit.push(e.x);
      if (e.t === 'm20') p.m20++; if (e.t === 'm1') p.m1++;
      if (e.t === 'caiu') p.caiu++; if (e.t === 'enl') p.enl++;
      if (e.t === 'mobito') p.fim = 'óbito'; if (e.t === 'minsano' && !p.fim) p.fim = 'insano';
    }
    if (e.t === 'pista') pistas.push(e.x);
    if (e.t === 'presenca') pres.push(e.x);
    if (e.t === 'membrana') memb.push(e.x);
    if (e.t === 'cena') cenas++;
  });
  const ativos = Object.entries(por).filter(([, p]) => p.dano || p.cura || p.san || p.pd || p.pe || p.rit.length || p.m20 || p.m1 || p.caiu || p.enl || p.fim);
  const ini = num(meta.inicio) || (evs[0] && evs[0].ts) || Date.now(), fim = evs.length ? num(evs[evs.length - 1].ts) : ini;
  const dur = Math.max(0, Math.round((fim - ini) / 60000));
  const durTxt = dur >= 60 ? `${Math.floor(dur / 60)}h${String(dur % 60).padStart(2, '0')}` : `${dur} min`;
  const linhaTexto = (id, p) => `👤 ${nomeDe(id)}: ` + [p.dano ? `−${p.dano} PV` : '', p.cura ? `+${p.cura} PV curados` : '', p.san ? `−${p.san} SAN` : '', p.pd ? `−${p.pd} PD` : '', p.pe ? `${p.pe} PE gastos` : '', p.rit.length ? `${p.rit.length} ritua${p.rit.length > 1 ? 'is' : 'l'} (${[...new Set(p.rit.map(r => r.replace(/\s*\(.*\)$/, '')))].join(', ')})` : '', p.m20 ? `${p.m20}× 20 natural` : '', p.m1 ? `${p.m1}× 1 natural` : '', p.caiu ? `caiu ${p.caiu}×` : '', p.enl ? `enlouqueceu ${p.enl}×` : '', p.fim ? p.fim.toUpperCase() : ''].filter(Boolean).join(' · ');
  const texto = [`📁 RELATÓRIO O.R.F.E.U.${meta.nome ? ' · ' + meta.nome : ''}`, `${new Date(ini).toLocaleDateString('pt-BR')} · duração ${durTxt}${cenas ? ` · ${cenas + 1} cenas` : ''}`, '',
    ...(ativos.length ? ativos.map(([id, p]) => linhaTexto(id, p)) : ['Nenhum agente registrou mudanças.']), '',
    pistas.length ? `🔎 Pistas (${pistas.length}): ${pistas.join(' | ')}` : '', pres.length ? `😱 Presenças: ${pres.join(', ')}` : '', memb.length ? `🩸 Membrana rompida: ${memb.join(', ')}` : '',
    ativos.some(([, p]) => p.fim) ? `💀 Baixas: ${ativos.filter(([, p]) => p.fim).map(([id, p]) => `${nomeDe(id)} (${p.fim})`).join(', ')}` : ''].join('\n').replace(/\n{3,}/g, '\n\n').trim();
  let o = $('#relatorioTela');
  if (!o) {
    o = document.createElement('div'); o.id = 'relatorioTela'; o.className = 'relatorio-tela'; document.body.appendChild(o);
    o.addEventListener('click', ev => {
      const b = ev.target.closest('[data-rel]');
      if (ev.target === o || (b && b.dataset.rel === 'fechar')) { o.hidden = true; document.body.classList.remove('imprimindo-rel'); return; }
      if (!b) return;
      if (b.dataset.rel === 'pdf') { document.body.classList.add('imprimindo-rel'); setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove('imprimindo-rel'), 500); }, 60); }
      if (b.dataset.rel === 'copiar') { const t = o.dataset.texto; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => A.aviso('Relatório copiado. Cole no grupo.'), () => { const ta = $('textarea', o); ta.hidden = false; ta.select(); A.aviso('Copie o texto selecionado.'); }); }
    });
  }
  o.dataset.texto = texto;
  const cel = (v, cls = '') => `<td class="${cls}">${v || '<i>—</i>'}</td>`;
  o.innerHTML = `<div class="rel-folha"><header class="rel-cab"><div><span>O.R.F.E.U. · DOCUMENTO INTERNO</span><h2>Relatório de Missão${meta.nome ? `<small>${esc(meta.nome)}</small>` : ''}</h2></div><i class="rel-selo">O.R.F.E.U.<br>CONFIDENCIAL</i></header>
    <p class="rel-meta">Aberto em ${new Date(ini).toLocaleString('pt-BR')} · duração ${durTxt}${cenas ? ` · ${cenas + 1} cenas` : ''} · ${evs.length} registros</p>
    <h3>Agentes</h3>
    ${ativos.length ? `<table class="rel-tab"><thead><tr><th>Agente</th><th>Dano</th><th>SAN / PD</th><th>PE</th><th>Rituais</th><th>Dados</th><th>Estado</th></tr></thead><tbody>
      ${ativos.map(([id, p]) => `<tr><th>${esc(nomeDe(id))}</th>${cel(p.dano ? `−${p.dano}${p.cura ? ` <small>(+${p.cura})</small>` : ''}` : p.cura ? `<small>+${p.cura}</small>` : '')}${cel([p.san ? `−${p.san} SAN` : '', p.pd ? `−${p.pd} PD` : ''].filter(Boolean).join(' · '))}${cel(p.pe ? String(p.pe) : '')}${cel(p.rit.length ? esc([...new Set(p.rit)].join(', ')) : '')}${cel([p.m20 ? `${p.m20}× 20` : '', p.m1 ? `${p.m1}× 1` : ''].filter(Boolean).join(' · '))}${cel(p.fim ? `<b class="rel-fim">${p.fim.toUpperCase()}</b>` : [p.caiu ? `caiu ${p.caiu}×` : '', p.enl ? `enlouqueceu ${p.enl}×` : ''].filter(Boolean).join(' · '))}</tr>`).join('')}</tbody></table>` : '<p class="mini">Nenhum agente registrou mudanças.</p>'}
    <div class="rel-grade"><section><h3>Pistas (${pistas.length})</h3>${pistas.length ? `<ol>${pistas.map(p => `<li>${esc(p)}</li>`).join('')}</ol>` : '<p class="mini">Nenhuma.</p>'}</section>
      <section><h3>Ameaças e membrana</h3><ul>${pres.map(p => `<li>Presença: ${esc(p)}</li>`).join('')}${memb.map(p => `<li>Rompida: ${esc(p)}</li>`).join('')}</ul>${pres.length || memb.length ? '' : '<p class="mini">Nada registrado.</p>'}</section></div>
    <details class="rel-linha"><summary>Linha do tempo (${evs.length})</summary><ol>${evs.map(e => `<li><time>${new Date(num(e.ts)).toLocaleTimeString('pt-BR').slice(0, 5)}</time> ${e.q ? `<b>${esc(nomeDe(e.q))}</b> ` : ''}${esc(ROT_REL[e.t] || e.t)}${e.v && ['dano', 'cura', 'san', 'pd', 'pe'].includes(e.t) ? ` ${int(e.v)}` : ''}${e.x ? `: ${esc(e.x)}` : ''}</li>`).join('')}</ol></details>
    <textarea class="rel-texto" hidden readonly>${esc(texto)}</textarea>
    <footer class="rel-acoes"><button data-rel="pdf" class="btn-protocolo">🖨 Imprimir ou salvar PDF</button><button data-rel="copiar">📋 Copiar texto para o grupo</button><button data-rel="fechar">Fechar</button></footer></div>`;
  o.hidden = false;
}

/* =========================================================
   9. LIGAÇÕES
   ========================================================= */
let efeitoOff = null;
function tudo() {
  if (!efeitoOff && A.pronto) efeitoOff = A.Rede.on('efeito', aoEfeito, () => {});
  ligarRelatorio();
  vigiarMembrana();
  vigiarContadores();
  vigiarRelatorio();
  vigiarChamadoMembrana();
  pintarMembrana();
  desenharHud();
  efeitosDaTela();
  contarTurnos();
  verChamado();
  verInterludio();
  verRecompensa();
  verAmbiente();
  desenharInvestigacao();
  desenharMesaMestre();
}
let agendado = false;
function agendar() { if (agendado) return; agendado = true; requestAnimationFrame(() => { agendado = false; try { tudo(); } catch (e) { console.warn('mesa:', e); } }); }
A.aoMudar(agendar);
document.addEventListener('acf-perfil', () => setTimeout(agendar, 50));
document.addEventListener('acf-ativa', agendar);
document.addEventListener('click', e => { if (e.target.closest('#painel [data-mi]')) aoClicarMesa(e); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const o = $('#escudoMestre'); if (o && !o.hidden) o.hidden = true; } });
const bNova = $('#mesaNovaCena'); if (bNova) bNova.addEventListener('click', () => { if (confirm('Começar uma nova cena? Zera os contadores de Morrendo e Enlouquecendo e desconta a munição usada.')) novaCena(); });
const bEsc = $('#mesaEscudo'); if (bEsc) bEsc.addEventListener('click', abrirEscudo);
// navegadores só liberam som depois de um toque: tenta de novo o ambiente no primeiro clique
document.addEventListener('pointerdown', () => { if (!Amb.el) setTimeout(verAmbiente, 50); }, { passive: true });
setTimeout(agendar, 700);
setInterval(pintarMembrana, 1200);
window.ACF_MESA = { abrirEscudo, desenharHud, novaCena, danoDeterminacao, momento, mostrarMomento, membDe, temMedidor, abrirRelatorio };
})();
