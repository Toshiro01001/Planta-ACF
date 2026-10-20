/* limpo.js · HUD limpo (para todos: jogadores, auxiliares e Mestre)
   - visual enxuto por padrão (body.hud-limpo); "Visual clássico" volta ao antigo neste aparelho
   - câmera: só +, −, centralizar e "⋯" (o resto abre no ⋯)
   - dica do mapa só nas primeiras visitas
   - painel: barra com busca (Mestre e auxiliares), recolher/abrir tudo, ★ favoritos no topo e ⚙ aparência */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ls = { get(k, p) { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const semAcento = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /* ---------- visual ---------- */
  const aplicarVisual = () => document.body.classList.toggle('hud-limpo', ls.get('acf-visual', 'limpo') !== 'classico');
  aplicarVisual();

  /* ---------- câmera: 4 botões à vista, o resto no ⋯ ---------- */
  const cam = $('.camera');
  if (cam) {
    const basicos = ['mais', 'menos', 'centro', 'eu'];
    $$('button[data-cam]', cam).forEach(b => b.classList.toggle('cam-extra', !basicos.includes(b.dataset.cam)));
    const mais = document.createElement('button');
    mais.type = 'button'; mais.className = 'cam-mais'; mais.title = 'Mais controles (girar, vistas, mover, régua)'; mais.setAttribute('aria-label', 'Mais controles da câmera'); mais.setAttribute('aria-expanded', 'false'); mais.textContent = '⋯';
    cam.appendChild(mais);
    mais.addEventListener('click', () => { const a = !cam.classList.contains('aberta'); cam.classList.toggle('aberta', a); mais.setAttribute('aria-expanded', String(a)); ls.set('acf-cam-aberta', a); });
    if (ls.get('acf-cam-aberta', false)) { cam.classList.add('aberta'); mais.setAttribute('aria-expanded', 'true'); }
  }

  /* ---------- dica do mapa: só nas 3 primeiras visitas, some sozinha ---------- */
  const dica = $('#dica');
  if (dica) {
    const n = ls.get('acf-dica-vistas', 0); ls.set('acf-dica-vistas', n + 1);
    if (n >= 3) dica.classList.add('dica-off');
    else setTimeout(() => { dica.style.opacity = '0'; }, 9000);
  }

  /* ---------- barra do painel ---------- */
  const painel = $('#painel');
  if (!painel) return;
  const barra = document.createElement('div');
  barra.className = 'painel-barra';
  barra.innerHTML = `<input type="search" id="painelBusca" class="painel-busca" placeholder="Procurar ferramenta…" aria-label="Procurar no painel" autocomplete="off">
    <button type="button" class="pb-btn" data-pb="recolher" title="Recolher todos os blocos" aria-label="Recolher todos os blocos">⊟</button>
    <button type="button" class="pb-btn" data-pb="abrir" title="Abrir todos os blocos" aria-label="Abrir todos os blocos">⊞</button>
    <button type="button" class="pb-btn" data-pb="cfg" title="Aparência" aria-label="Aparência" aria-expanded="false">⚙</button>
    <div class="pb-menu" hidden>
      <b>Aparência neste aparelho</b>
      <label class="chave"><input type="radio" name="pbVisual" value="limpo"><span>Limpo (menos coisas na tela)</span></label>
      <label class="chave"><input type="radio" name="pbVisual" value="classico"><span>Clássico (o visual anterior)</span></label>
      <div class="pb-linha"><button type="button" class="btn-fantasma" data-pb="som">🔊 Som</button><button type="button" class="btn-fantasma" data-pb="ajuda">? Ajuda</button></div>
      <p class="mini">★ no título de um bloco o leva para o topo do painel.</p>
    </div>`;
  const abas = $('#abasMestre', painel);
  (abas ? abas.after(barra) : painel.prepend(barra));
  // ao trocar de perfil a barra muda: busca só para Mestre e auxiliares (os jogadores têm poucos blocos)
  const ajustar = () => { barra.classList.toggle('so-botoes', !document.body.classList.contains('auxiliar') && !($('#abasMestre') && !$('#abasMestre').hidden)); };
  document.addEventListener('acf-perfil', () => setTimeout(ajustar, 0)); setTimeout(ajustar, 300);

  // busca: mostra só os blocos cujo título (ou texto) bate, em qualquer aba
  const busca = $('#painelBusca', barra);
  const filtrar = () => {
    const q = semAcento(busca.value).trim();
    painel.classList.toggle('buscando', !!q);
    // primeiro pelo título do bloco; se nenhum título bate, procura no conteúdo
    const blocos = $$('.painel > .bloco');
    if (!q) { blocos.forEach(b => b.classList.remove('fora-busca', 'achou')); return; }
    const tit = b => { const h = $('h2', b); return semAcento(h ? h.textContent : ''); };
    const porTitulo = blocos.filter(b => tit(b).includes(q));
    const lista = porTitulo.length ? porTitulo : blocos.filter(b => semAcento(b.textContent).includes(q));
    blocos.forEach(b => { const ok = lista.includes(b); b.classList.toggle('fora-busca', !ok); b.classList.toggle('achou', ok && porTitulo.length > 0); });
  };
  busca.addEventListener('input', filtrar);
  busca.addEventListener('keydown', e => { if (e.key === 'Escape') { busca.value = ''; filtrar(); } });

  // recolher / abrir tudo (usa o mesmo clique do título, que guarda o estado)
  const blocosVisiveis = () => $$('.painel > .bloco').filter(b => !b.hidden && !b.classList.contains('fora-da-aba') && !b.classList.contains('fora-busca') && $('h2.dobra', b));
  barra.addEventListener('click', e => {
    const b = e.target.closest('[data-pb]'); if (!b) return;
    if (b.dataset.pb === 'recolher') blocosVisiveis().forEach(x => { if (!x.classList.contains('fechado')) $('h2.dobra', x).click(); });
    if (b.dataset.pb === 'abrir') blocosVisiveis().forEach(x => { if (x.classList.contains('fechado')) $('h2.dobra', x).click(); });
    if (b.dataset.pb === 'som' && $('#btnSom')) { $('#btnSom').click(); }
    if (b.dataset.pb === 'ajuda' && $('#btnAjuda')) { $('.pb-menu', barra).hidden = true; $('#btnAjuda').click(); }
    if (b.dataset.pb === 'cfg') { const m = $('.pb-menu', barra); m.hidden = !m.hidden; b.setAttribute('aria-expanded', String(!m.hidden)); $$('input[name="pbVisual"]', m).forEach(i => { i.checked = i.value === (ls.get('acf-visual', 'limpo') === 'classico' ? 'classico' : 'limpo'); }); }
  });
  barra.addEventListener('change', e => { if (e.target.name === 'pbVisual') { ls.set('acf-visual', e.target.value); aplicarVisual(); } });
  document.addEventListener('click', e => { const m = $('.pb-menu', barra); if (!m.hidden && !barra.contains(e.target)) { m.hidden = true; $('[data-pb="cfg"]', barra).setAttribute('aria-expanded', 'false'); } });

  // ★ favoritos: estrela no título; os marcados sobem para o topo do painel
  let favs = ls.get('acf-favs', {});
  const pontoFav = barra;
  const ordemOriginal = new Map($$('.painel > .bloco').map((b, i) => [b.id, i]));
  const aplicarFavs = () => {
    const blocos = $$('.painel > .bloco').filter(b => b.id);
    // volta todos para a ordem original e sobe os favoritos logo abaixo da barra
    blocos.sort((a, b) => (ordemOriginal.get(a.id) ?? 999) - (ordemOriginal.get(b.id) ?? 999));
    let ancora = pontoFav;
    blocos.filter(b => favs[b.id]).forEach(b => { ancora.after(b); ancora = b; });
    const resto = blocos.filter(b => !favs[b.id]);
    resto.forEach(b => { ancora.after(b); ancora = b; });
    blocos.forEach(b => { b.classList.toggle('fav', !!favs[b.id]); const st = $('.bloco-fav', b); if (st) { st.textContent = favs[b.id] ? '★' : '☆'; st.setAttribute('aria-pressed', String(!!favs[b.id])); } });
  };
  const porEstrelas = () => {
    $$('.painel > .bloco').forEach(b => {
      const h = $('h2', b); if (!h || !b.id || $('.bloco-fav', h)) return;
      const st = document.createElement('span');
      st.className = 'bloco-fav'; st.setAttribute('role', 'button'); st.tabIndex = 0; st.title = 'Favorito: sobe para o topo do painel'; st.setAttribute('aria-label', 'Marcar como favorito');
      st.textContent = '☆';
      const alternar = ev => { ev.stopPropagation(); ev.preventDefault(); favs[b.id] = !favs[b.id]; if (!favs[b.id]) delete favs[b.id]; ls.set('acf-favs', favs); aplicarFavs(); };
      st.addEventListener('click', alternar);
      st.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') alternar(ev); });
      h.prepend(st);
    });
    aplicarFavs();
  };
  // o painel recebe blocos novos depois (módulos); espera o carregamento
  if (document.readyState === 'complete') setTimeout(porEstrelas, 50); else window.addEventListener('load', () => setTimeout(porEstrelas, 50));
})();
