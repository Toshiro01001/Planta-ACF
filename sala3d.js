/* sala3d.js · a Planta em 3D (Three.js): o andar inteiro, para jogar como num Foundry ou Owlbear
   - Duas formas de jogar: o mapa 2.5D de sempre e esta vista 3D. As duas mostram o MESMO estado:
     andar no 3D move o token de verdade, com as MESMAS regras do arraste no mapa (paredes, portas
     fechadas, vez e limite de metros da perseguição). Nada de correr infinito numa fuga.
   - Escala do 3D: sala de 10 m de lado (mais espaço para andar e se esconder) e corredor de 14 m de
     comprido e 2,4 m de largura (duas pessoas lado a lado). As REGRAS (metros de fuga, custo do
     movimento) continuam sendo as da planta: o 3D só converte a posição.
   - O código é só o MOTOR. O que existe em cada sala (a "cena") vem do arquivo salas-3d.json, que o
     Mestre importa pelo cartão de qualquer sala e que fica nos segredos (nunca no GitHub). Quando o
     Mestre revela uma sala, a tela dele publica a cena em mapa/m3d/cNN.
   - Quem vê o quê: Mestre, tudo. Auxiliares, as salas reveladas. JOGADOR: só a sala onde o token
     dele está (as outras ficam escuras) e só os tokens à vista dali.
   - Mestre no 3D: luzes de cada sala e dos corredores, portas, versão das salas (Rei/Mãe), forma de
     cada Filho, e pode "controlar" qualquer token. Jogador: anda (WASD/setas ou joystick), aperta
     o botão das portas e se esconde nos esconderijos (armários, embaixo da cama…).
   - Decibelímetro, perseguição e Protocolo aparecem também no 3D.
   - Three.js (r128) é baixado só na primeira vez que alguém abre o 3D. */
(() => {
  'use strict';
  const URL3 = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  // objetos dos andares 2 a 5 (andares3d.js): grande, então só baixa quando alguém abre o 3D (mesma versão deste arquivo)
  const VERSAO = ((document.currentScript && document.currentScript.src) || '').split('?')[1] || '';
  let extrasP = null;
  const carregarExtras = () => extrasP || (extrasP = new Promise(ok => {
    if ((window.ACF3D || {}).andaresProntos) return ok();
    const s = document.createElement('script'); s.src = 'andares3d.js' + (VERSAO ? '?' + VERSAO : ''); s.async = true;
    s.onload = () => ok(); s.onerror = () => { extrasP = null; s.remove(); ok(); };   // sem o arquivo, o 3D abre do mesmo jeito
    document.head.appendChild(s);
  }));
  const ACF = () => window.ACF;
  const NS = () => window.ACF3D;
  // objeto de cena "campo_infinito": a figura flutuante (triângulo invertido) com o campo em volta.
  // O que ele faz com quem chega perto fica em Campos (mover): quanto mais perto, mais devagar; perto demais, preso.
  (window.ACF3D = window.ACF3D || {}).extensoes = window.ACF3D.extensoes || [];
  window.ACF3D.extensoes.push(F => {
    const { P, m, G, T, guardar, anim, luz } = F;
    P.campo_infinito = o => {
      const g = G(), alto = o.y || 1.75, tam = o.tam || 1.5, fig = G(); fig.position.y = alto; g.add(fig);
      const tri = (lado, furo) => { const sh = new T.Shape(), h = lado * Math.sqrt(3) / 2; sh.moveTo(-lado / 2, h / 3); sh.lineTo(lado / 2, h / 3); sh.lineTo(0, -2 * h / 3); sh.closePath();
        if (furo) { const f = new T.Path(), l2 = furo, h2 = l2 * Math.sqrt(3) / 2; f.moveTo(-l2 / 2, h2 / 3); f.lineTo(0, -2 * h2 / 3); f.lineTo(l2 / 2, h2 / 3); f.closePath(); sh.holes.push(f); } return sh; };
      const moldura = new T.Mesh(guardar(new T.ExtrudeGeometry(tri(tam, tam * .72), { depth: .12, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2 })), m('#0a0a0b', { r: .35, me: .4 }));
      moldura.position.z = -.06; fig.add(moldura);
      const branco = m('#ffffff', { unico: true, e: '#ffffff', ei: 1.6, r: .2 });
      const miolo = new T.Mesh(guardar(new T.ShapeGeometry(tri(tam * .38))), branco); miolo.position.z = .07; fig.add(miolo);
      const miolo2 = miolo.clone(); miolo2.rotation.y = Math.PI; miolo2.position.z = -.07; fig.add(miolo2);
      const fundo = new T.Mesh(guardar(new T.ShapeGeometry(tri(tam * .72))), m('#1a1a1c', { r: .9, lado: 2 })); fig.add(fundo);
      // anéis listrados (a espiral do mural) girando em volta da figura
      const aneis = [];
      for (let i = 0; i < 4; i++) { const a = new T.Mesh(guardar(new T.TorusGeometry(tam * (.75 + i * .22), .012, 6, 64)), m(i % 2 ? '#f2f2f2' : '#101010', { unico: true, op: .55 - i * .1, e: i % 2 ? '#ffffff' : '#000000', ei: .4 })); a.position.y = alto; g.add(a); aneis.push(a); }
      // ondas no chão: marcam onde o ar fica "grosso"
      const ondas = [];
      for (let i = 0; i < 3; i++) { const r = new T.Mesh(guardar(new T.RingGeometry(1, 1.04, 64)), m('#ffffff', { unico: true, op: .0, lado: 2 })); r.rotation.x = -Math.PI / 2; r.position.y = .015; g.add(r); ondas.push(r); }
      luz(g, '#f4f6ff', o.i || 1.4, o.d || 8, 0, alto, 0, false);
      const ext = o.ext || 7;
      anim.push((dt, t) => {
        fig.rotation.y = t * .22; fig.position.y = alto + Math.sin(t * .9) * .06;
        aneis.forEach((a, i) => { a.rotation.x = t * (.15 + i * .07) * (i % 2 ? -1 : 1); a.rotation.y = t * (.11 + i * .05); });
        branco.emissiveIntensity = 1.3 + Math.sin(t * 2.2) * .5;
        ondas.forEach((r, i) => { const k = ((t * .18 + i / 3) % 1); r.scale.setScalar(.4 + k * ext); r.material.opacity = .22 * (1 - k); });
      });
      return g;
    };
  });
  // 'jogo' (terceira pessoa) e 'dentro' (primeira pessoa): você está DENTRO do mundo (teto, névoa, paredes inteiras)
  const imersivo = m => m === 'dentro' || m === 'jogo';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pad2 = n => String(n).padStart(2, '0');
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtM = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
  const lsG = (k, p) => { try { const v = localStorage.getItem(k); return v === null ? p : JSON.parse(v); } catch (e) { return p; } };
  const lsS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  /* ================= opções de jogo (neste aparelho): gráficos, câmera, mouse, áudio e atalhos ================= */
  const CFG_PAD = {
    escala: 1, sombras: 'auto', brilho: 'auto', aberr: 'auto', grao: true, vinheta: true, nevoa: 1, poeira: true, fps: 0, verFps: false,
    fov: 75, balanco: true, terceira: false, nomes: true, baloes: true,
    sens: 1, invY: false,
    volAmb: 1, volVoz: 1, teclas: {},
  };
  const CFG = Object.assign({}, CFG_PAD, lsG('acf-s3d-cfg', {}) || {});
  CFG.teclas = Object.assign({}, (lsG('acf-s3d-cfg', {}) || {}).teclas || {});
  const salvarCfg = () => lsS('acf-s3d-cfg', CFG);
  // ações do teclado e a tecla padrão de cada uma (setas sempre andam; Enter sempre abre o chat; Esc sempre volta)
  const ACOES = [
    ['frente', 'Andar para a frente', 'w', 'mov'], ['tras', 'Andar para trás', 's', 'mov'], ['esq', 'Passo para a esquerda', 'a', 'mov'], ['dir', 'Passo para a direita', 'd', 'mov'],
    ['correr', 'Correr (segurar)', 'shift', 'mov'], ['olharTras', 'Olhar para trás (segurar)', 'q', 'mov'],
    ['interagir', 'Interagir / usar', 'e', 'jogo'], ['lanterna', 'Lanterna', 'l', 'jogo'], ['camera', 'Trocar a câmera', 'c', 'jogo'], ['zoomAndar', 'Sala / andar inteiro', 'z', 'jogo'],
    ['chat', 'Chat de texto', 't', 'atalho'], ['fichas', 'Fichas', 'f', 'atalho'], ['dados', 'Dados', 'r', 'atalho'], ['quadro', 'Quadro', 'b', 'atalho'], ['mochila', 'Mochila (inventário)', 'i', 'atalho'], ['arquivo', 'Arquivo', 'k', 'atalho'], ['narrador', 'Narrador (Mestre)', 'n', 'atalho'],
    ['menu', 'Menu do jogo', 'm', 'atalho'], ['painel', 'Painel lateral', 'tab', 'atalho'], ['opcoes', 'Opções', 'o', 'atalho'], ['hud', 'Esconder a interface', 'h', 'atalho'],
    ['hab1', 'Habilidade 1 (no Controle)', '1', 'hab'], ['hab2', 'Habilidade 2', '2', 'hab'], ['hab3', 'Habilidade 3', '3', 'hab'], ['hab4', 'Habilidade 4', '4', 'hab'], ['hab5', 'Habilidade 5', '5', 'hab'],
    ['hab6', 'Habilidade 6', '6', 'hab'], ['hab7', 'Habilidade 7', '7', 'hab'], ['hab8', 'Habilidade 8', '8', 'hab'], ['hab9', 'Habilidade 9', '9', 'hab'],
  ];
  const teclaDe = id => { const v = CFG.teclas[id]; return v !== undefined ? v : (ACOES.find(x => x[0] === id) || [])[2]; };
  const acaoDaTecla = k => { for (const [id] of ACOES) if (teclaDe(id) === k) return id; return null; };
  const nomeTecla = k => !k ? '—' : ({ ' ': 'Espaço', shift: 'Shift', tab: 'Tab', enter: 'Enter', control: 'Ctrl', alt: 'Alt', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', backspace: '⌫', capslock: 'Caps', mouse1: 'Mouse (meio)', mouse2: 'Mouse (direito)', mouse3: 'Mouse (voltar)', mouse4: 'Mouse (avançar)' }[k] || k.toUpperCase());
  const SETAS = { arrowup: 'frente', arrowdown: 'tras', arrowleft: 'esq', arrowright: 'dir' };
  // primeira pessoa: "Olhos" sempre; "Jogo" também, a menos que a opção de terceira pessoa esteja ligada
  const primeiraP = m => m === 'dentro' || (m === 'jogo' && !CFG.terceira);

  /* ================= dados: de onde vem a cena ================= */
  const cenaDe = cn => {
    const a = ACF(); if (!a) return null;
    const k = 'c' + cn;
    if (a.mestre) return (a.segredos._3d || {})[k] || null;
    return ((a.estado || {}).m3d || {})[k] || null;
  };
  // "impressão digital" da cena: a tela do Mestre só regrava o mapa público quando a cena muda
  const impressao = o => { const s = JSON.stringify(o); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

  let tPub = null;
  const agendarPublicar = () => { const a = ACF(); if (!a || !a.mestre) return; clearTimeout(tPub); tPub = setTimeout(publicar, 500); };
  function publicar() {
    const a = ACF();
    if (!a || !a.mestre || !a.segredosProntos || !a.salaRevelada) return;
    const fonte = a.segredos._3d || {}, atual = (a.estado || {}).m3d || {};
    new Set([...Object.keys(fonte), ...Object.keys(atual)]).forEach(k => {
      const cn = +k.slice(1);
      const quer = fonte[k] && a.salaRevelada(cn) ? fonte[k] : null;
      const hq = quer ? impressao(quer) : null;
      const ha = atual[k] ? atual[k]._h : null;
      if (hq === ha) return;
      a.definir(['m3d', k], quer ? { ...quer, _h: hq } : null);
    });
    // trajes nos cabides: o estoque começa cheio (os jogadores só podem tirar: regra do Firebase)
    const e0 = (a.estado || {}).estoque || {};
    Object.entries(fonte).forEach(([k, c]) => (c.itens || []).forEach((it, i) => {
      if (it.int !== 'vestir') return;
      const kk = `v_${k}_${i}`;
      if (e0[kk] === undefined) a.definir(['estoque', kk], it.intQtd ?? 1);
    }));
  }

  /* ================= cartão da sala ================= */
  function botoes() { return '<button type="button" data-s3d="abrir">🧊 Ver a sala em 3D</button><button type="button" data-s3d="andar">🏢 Andar inteiro (3D)</button>'; }
  function blocoMestre(cn) {
    const tem = !!cenaDe(cn);
    const pub = !!(((ACF().estado || {}).m3d || {})['c' + cn]);
    return `<div class="s3d-bloco">
      ${botoes()}
      <span class="mini">${tem ? (pub ? 'Cena publicada: o jogador vê esta sala quando o token dele estiver nela.' : 'Cena só sua: a sala está oculta aos jogadores.') : 'Sala sem cena 3D (aparece vazia).'}</span>
      <button type="button" class="btn-fantasma" data-s3d="importar">Importar cenas 3D (.json)</button>
    </div>`;
  }
  // jogador: só com o token dele EM CIMA da sala; auxiliar: em toda sala revelada
  function blocoPublico(cn) {
    const a = ACF();
    if (a.aux) return `<div class="s3d-bloco">${botoes()}</div>`;
    if (a.meu && a.salaDe(a.meu) === cn) return `<div class="s3d-bloco">${botoes()}</div>`;
    return a.meu ? '<div class="s3d-bloco"><span class="mini">🧊 Leve o token da sua cobaia até esta sala para vê-la em 3D.</span></div>' : '';
  }
  function ligarBloco(c, cn) {
    c.querySelectorAll('[data-s3d="abrir"]').forEach(b => b.onclick = () => abrir(cn));
    c.querySelectorAll('[data-s3d="andar"]').forEach(b => b.onclick = () => abrir(cn, { andar: true }));
    c.querySelectorAll('[data-s3d="importar"]').forEach(b => b.onclick = importar);
  }

  function importar() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      let d; try { d = JSON.parse(await f.text()); } catch (e) { alert('Arquivo inválido.'); return; }
      if (!d || d.tipo !== 'planta-acf-3d' || !d.salas) { alert('Este arquivo não é um arquivo de cenas 3D da Planta da Caixa.'); return; }
      const n = Object.keys(d.salas).length, nf = Object.keys(d.formas || {}).length;
      if (!confirm(`Importar ${n} cena(s) 3D${nf ? ` e a forma de ${nf} Filho(s)` : ''}? As cenas ficam nos seus segredos e só aparecem aos jogadores nas salas reveladas. Cenas com o mesmo número serão substituídas.`)) return;
      Object.entries(d.salas).forEach(([k, v]) => ACF().gravarSegredo(['_3d', k], v));
      // narração das salas (texto para ler à mesa e "Na mesa"): só o Mestre vê (segredos/_narrativa)
      if (d.narrativa && typeof d.narrativa === 'object') Object.entries(d.narrativa).forEach(([k, v]) => ACF().gravarSegredo(['_narrativa', k], v));
      // formas dos Filhos: só as que o Mestre ainda não escolheu
      const atuais = (ACF().estado || {}).formas || {};
      Object.entries(d.formas || {}).forEach(([id, fm]) => { if (!atuais[id]) ACF().definir(['formas', id], fm); });
      ACF().diario('sessao', `Cenas 3D importadas (${n})`);
      ACF().aviso(`${n} cena(s) 3D importada(s).`);
      setTimeout(() => { agendarPublicar(); ACF().redesenharCartao(); }, 300);
    };
    inp.click();
  }

  (function registrar() {
    const a = ACF();
    if (!a || !a.ganchoSala) return setTimeout(registrar, 200);
    a.ganchoSala({ mestre: blocoMestre, publico: blocoPublico, ligar: (c, cn) => ligarBloco(c, cn) });
    a.aoMudar(() => agendarPublicar());
    document.addEventListener('acf-segredos', agendarPublicar);
    agendarPublicar();
  })();

  /* ================= carregar o Three.js sob demanda ================= */
  let carregando = null;
  const carregarThree = () => window.THREE ? Promise.resolve() : (carregando = carregando || new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = URL3; s.async = true;
    s.onload = () => ok(); s.onerror = () => { carregando = null; s.remove(); falha(new Error('three')); };
    document.head.appendChild(s);
  }));

  /* ================= escala: planta (quadradinhos) <-> 3D (metros) ================= */
  // Sala do 3D: 20 m de lado (o dobro da versão anterior, para o clima de terror). Corredor: 14 m.
  // As cenas são montadas para 20 m (lado 20). Cenas antigas (10 m ou 7,07 m) ainda funcionam: ajustarItem as leva
  // para 20 m (objetos de parede continuam na parede; o miolo se espalha).
  // Na largura, o corredor do 3D é mais estreito que o desenho: a posição é comprimida (KC).
  const SALA_M = 20, ALT = 4.0, CORR_W = 2.4, CORR_H = 2.7, VAO_H = 2.2, ESP = .2, RAIO = .22;
  let MAPA = null;
  function prepararMapa() {
    if (MAPA) return MAPA;
    const g = ACF().geo, segs = [];
    let u = 0, pos = 0;
    const add = (len, s) => { segs.push({ u0: u, u1: u + len, x0: pos, s }); u += len; pos += len * s; };
    const mS = SALA_M / g.R;
    add(g.M, mS);
    for (let c = 0; c < 5; c++) { add(g.R, mS); if (c < 4) add(g.G, g.M_CORREDOR); }
    add(g.M, mS);
    const meio = pos / 2; segs.forEach(s => { s.x0 -= meio; s.x1 = s.x0 + (s.u1 - s.u0) * s.s; });
    MAPA = { segs, total: pos, g, KC: Math.min(1, CORR_W / (g.CW * mS)), SALA: SALA_M };
    return MAPA;
  }
  function eixo3D(u) { const S = MAPA.segs; for (const s of S) if (u <= s.u1) return s.x0 + (Math.max(u, s.u0) - s.u0) * s.s; const l = S[S.length - 1]; return l.x1 + (u - l.u1) * l.s; }
  function eixoPlanta(x) { const S = MAPA.segs; for (const s of S) if (x <= s.x1) return s.u0 + (Math.max(x, s.x0) - s.x0) / s.s; const l = S[S.length - 1]; return l.u1 + (x - l.x1) / l.s; }
  const dentroR = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const cacheCorr = {};
  function corrs(a) {
    if (cacheCorr[a]) return cacheCorr[a];
    const g = MAPA.g, l = g.CORREDORES.map((c, ci) => ({ ...c, ci }));
    const rs = g.retSaida(a);
    // a saída é quadrada no desenho: o eixo vem do lado da sala onde ela fica (em cima/embaixo corre em Z)
    const sdA = g.saidaDoAndar(a) || {};
    if (rs) l.push({ ...rs, eixo: sdA.lado === 'cima' || sdA.lado === 'baixo' ? 'v' : sdA.lado ? 'h' : (rs.w < rs.h ? 'v' : 'h'), saida: true, ci: -1, p1: sdA.p });
    return (cacheCorr[a] = l);
  }
  function planta3D(a, x, y) {
    let X = eixo3D(x), Z = eixo3D(y);
    for (const c of corrs(a)) {
      if (!dentroR(c, x, y)) continue;
      if (c.eixo === 'h') { const zc = eixo3D(c.y + c.h / 2); Z = zc + (Z - zc) * MAPA.KC; }
      else { const xc = eixo3D(c.x + c.w / 2); X = xc + (X - xc) * MAPA.KC; }
      break;
    }
    return [X, Z];
  }
  function plantaDe3D(a, X, Z) {
    let x = eixoPlanta(X), y = eixoPlanta(Z);
    for (const c of corrs(a)) {
      if (c.eixo === 'h') { if (x > c.x && x < c.x + c.w) { const zc = eixo3D(c.y + c.h / 2); if (Math.abs(Z - zc) <= CORR_W / 2 + .05) { y = eixoPlanta(zc + (Z - zc) / MAPA.KC); break; } } }
      else if (y > c.y && y < c.y + c.h) { const xc = eixo3D(c.x + c.w / 2); if (Math.abs(X - xc) <= CORR_W / 2 + .05) { x = eixoPlanta(xc + (X - xc) / MAPA.KC); break; } }
    }
    return { x, y };
  }
  // retângulo da sala p em metros, e o centro
  function sala3D(p) { const s = MAPA.g.retSala(p); const x0 = eixo3D(s.x), x1 = eixo3D(s.x + s.w), z0 = eixo3D(s.y), z1 = eixo3D(s.y + s.h); return { p, x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 }; }
  function corr3D(c) {
    // h: corre em X; v: corre em Z. a0..a1 = começo e fim ao longo; linha = centro na largura
    if (c.eixo === 'h') return { h: true, a0: eixo3D(c.x), a1: eixo3D(c.x + c.w), linha: eixo3D(c.y + c.h / 2) };
    return { h: false, a0: eixo3D(c.y), a1: eixo3D(c.y + c.h), linha: eixo3D(c.x + c.w / 2) };
  }
  function salaNoPonto3D(a, X, Z) { const q = plantaDe3D(a, X, Z); const p = MAPA.g.salaEm(a, q.x, q.y); return p || null; }

  /* ================= peças estáticas juntas numa malha só (menos trabalho para o celular) ================= */
  function criarLote(T, descartes) {
    const porMat = new Map();
    const por = (mat, g) => { if (!porMat.has(mat)) porMat.set(mat, []); porMat.get(mat).push(g); };
    return {
      caixa(mat, w, h, d, x, y, z) { const g = new T.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); por(mat, g); },
      plano(mat, w, h, x, y, z, rx, ry) { const g = new T.PlaneGeometry(w, h); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); por(mat, g); },
      montar(pai) {
        const out = [];
        porMat.forEach((gs, mat) => {
          let nv = 0, ni = 0;
          gs.forEach(g => { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
          const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
          let ov = 0, oi = 0;
          gs.forEach(g => {
            const p = g.attributes.position;
            pos.set(p.array, ov * 3); nor.set(g.attributes.normal.array, ov * 3); uv.set(g.attributes.uv.array, ov * 2);
            if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[oi + i] = a[i] + ov; oi += a.length; }
            else { for (let i = 0; i < p.count; i++) idx[oi + i] = ov + i; oi += p.count; }
            ov += p.count; g.dispose();
          });
          const geo = new T.BufferGeometry();
          geo.setAttribute('position', new T.BufferAttribute(pos, 3));
          geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
          geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
          geo.setIndex(new T.BufferAttribute(idx, 1));
          geo.computeBoundingSphere(); descartes.push(geo);
          const me = new T.Mesh(geo, mat); me.receiveShadow = true; pai.add(me); out.push(me);
        });
        porMat.clear();
        return out;
      }
    };
  }

  /* ================= objetos da cena ================= */
  // objetos que não atrapalham a caminhada (no chão, na parede ou no teto)
  const SEM_COLISAO = new Set(['item_m', 'campo_infinito', 'tapete', 'ralo', 'cabos', 'ventilador', 'luminaria', 'lampada', 'placa', 'quadro', 'cartaz', 'pintura', 'relogio', 'telao', 'senhas', 'espelho', 'triangulo', 'rasgos', 'canos', 'gotas', 'mural', 'helice', 'porta', 'porta_dupla', 'sangue', 'texto', 'janela', 'placa_bronze', 'placa_saida', 'seteira', 'silhuetas', 'fotos', 'mapa_mundi', 'halo', 'estrela_cadente', 'grama', 'agua', 'cortina', 'membrana', 'ninho_simbolo', 'botao_porta', 'coracoes', 'parede_monitores', 'ventilador_parede', 'tenda', 'espiral', 'placa_teto', 'papeis_chao', 'cabos_chao', 'mancha', 'teia', 'placa_sala', 'lampada_alerta', 'onda_som', 'grade_chao', 'foco_cirurgico', 'tubo_neon', 'negatoscopio', 'quadro_dentes', 'lousa', 'mural_graficos', 'janela_luz', 'bolsas_parede', 'armario_suspenso', 'centelhas', 'livro_aberto', 'escorpiao', 'item_chao', 'documento_sala',
    'a2_aneis_chao', 'a2_arandela', 'a2_camera_canto', 'a2_defletor', 'a2_documento', 'a2_estandarte', 'a2_evaporador', 'a2_facho', 'a2_faixa_zebrada', 'a2_fila_chao', 'a2_gelo', 'a2_lampada_cultivo', 'a2_metronomo', 'a2_panelas', 'a2_ralo_cabelo', 'a2_regua_altura', 'a2_retalhos', 'a3_bilhete', 'a3_carne_costurada', 'a3_chao', 'a3_eclusa', 'a3_lampada_respira', 'a3_manual_corte', 'a3_poco_teto', 'a3_sob_agua', 'a3_telas', 'a3_trilhos_parede', 'a3_veias', 'a3_vento', 'a4_arandela', 'a4_calcada', 'a4_calendario', 'a4_capacete_riscado', 'a4_carne_parede', 'a4_fachada', 'a4_fenda_portal', 'a4_fita_chao', 'a4_fratura', 'a4_lampiao', 'a4_lustre', 'a4_luz', 'a4_placa_museu', 'a4_poco_espiral', 'a4_porta_nome', 'a4_seteira_vista', 'a5_brinquedos', 'a5_coroa', 'a5_costura', 'a5_cupula', 'a5_facho', 'a5_feixe', 'a5_gotas_paradas', 'a5_olhos_fenda', 'a5_parede_nomes', 'a5_pertences', 'a5_projecao', 'a5_queimado', 'a5_tunel', 'a5_valvula', 'a5_veias', 'a5_vista']);
  // o item aparece nesta versão da sala? (5º andar: neutro / rei / mae / consagrado)
  const naVersao = (it, ver) => { if (!it.v || typeof it.v === 'number') return true;   // v numérico é velocidade (ventilador, turbina), não versão
 const l = Array.isArray(it.v) ? it.v : [it.v]; return l.includes(ver || 'neutro'); };
  function montarItens(F, cena, pai, ver, sala) {
    F.imagens = cena.imagens || {};
    const lado = cena.lado || 7.071;
    let itens = (cena.itens || []).map(it => lado === SALA_M ? it : NS().ajustarItem(it, lado, SALA_M, ALT));
    itens.forEach((it, i) => {
      if (it.t === 'porta' || !naVersao(it, ver)) return;   // no 3D novo, as portas de verdade são as dos corredores
      const fab = F.P[it.t]; if (!fab) return;
      let o; try { o = fab({ sem: i + 1, ...it }); } catch (e) { console.warn('3D:', it.t, e); return; }
      o.position.set(it.x || 0, it.h0 || 0, it.z || 0);
      o.rotation.y = (it.r || 0) * Math.PI / 180;
      if (it.s) o.scale.setScalar(it.s);
      o.userData.t = it.t; o.userData.i = i; o.userData.esc = it.esc || null; o.userData.uso = it.uso || null;
      if (it.int) o.userData.int = { m: it.int, nome: it.intN || '', item: it.intItem || '', qtd: it.intQtd ?? null, som: it.intSom || '', txt: it.intTxt || '', ini: it.intIni ?? null };
      if (it.t === 'campo_infinito') o.userData.campo = { r0: it.r0 || 1.3, r1: it.r1 || 2.6, ext: it.ext || 7, per: it.per || 'vontade', dt: it.dt || 20 };
      pai.add(o);
    });
  }
  const dentroDe = (r, x, z) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3];
  function obstaculos(T, pai) {
    const out = [];
    pai.updateMatrixWorld(true);
    pai.children.forEach(o => {
      const t = o.userData.t;
      if (!t || SEM_COLISAO.has(t) || (NS().semColisao && NS().semColisao.has(t))) return;
      NS().caixasColisao(T, o).forEach(b => {
        if (b.max.y < .25 || b.min.y > 1.8) return;
        out.push([b.min.x - RAIO, b.max.x + RAIO, b.min.z - RAIO, b.max.z + RAIO]);
      });
    });
    return out;
  }
  function pontoLivre(livre, x, z) {
    if (livre(x, z)) return [x, z];
    for (let r = .25; r < SALA_M * .6; r += .25) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r; if (livre(nx, nz)) return [nx, nz]; }
    return [x, z];
  }

  /* ================= temas dos andares (corredores "backrooms") ================= */
  // quanto mais fundo, mais sangue, mais carne e mais lâmpadas mortas
  const TEMAS = {
    1: { parede: '#c9b45a', chao: '#8a7a4c', teto: '#d8cf9f', luz: '#fff1c2', sangue: .22, carne: 0, mortas: .08, pisca: .15, sala: { piso: '#6f6a62', parede: '#b9b2a4', teto: '#8a857c' }, nevoa: .035 },
    2: { parede: '#c2a958', chao: '#7d6c44', teto: '#cfc495', luz: '#ffedb8', sangue: .35, carne: 0, mortas: .12, pisca: .2, sala: { piso: '#5f574c', parede: '#a8977c', teto: '#7a6e5e' }, nevoa: .04 },
    3: { parede: '#b39a50', chao: '#6e5d3a', teto: '#bdb184', luz: '#ffe2a0', sangue: .5, carne: .25, mortas: .18, pisca: .28, sala: { piso: '#4a4640', parede: '#6c665c', teto: '#3c3934' }, nevoa: .05 },
    4: { parede: '#a68e4c', chao: '#5e4f32', teto: '#a99d74', luz: '#ffd690', sangue: .6, carne: .45, mortas: .25, pisca: .35, sala: { piso: '#3e3a34', parede: '#5e574c', teto: '#2e2b27' }, nevoa: .06 },
    5: { parede: '#8a5a4c', chao: '#4a2a26', teto: '#6a3a34', luz: '#ffb3a0', sangue: .75, carne: .9, mortas: .3, pisca: .45, sala: { piso: '#4a2a26', parede: '#7a3a34', teto: '#3a1a18' }, nevoa: .075 },
  };

  /* ================= o mundo: um andar inteiro ================= */
  function mundoAndar(ctx, a) {
    const { T, celular } = ctx, A = ACF(), NSX = NS();
    prepararMapa();
    const tema = TEMAS[a] || TEMAS[1];
    const F = NSX.criarFabrica(T, ctx.animMundo, [], ctx.descartes, { alt: ALT }); F.T = T;
    const raiz = new T.Group(), tetos = new T.Group(), veus = new T.Group();
    ctx.cena.add(raiz); raiz.add(tetos); raiz.add(veus);
    const r0 = NSX.rng(a * 977);
    const interativos = [];      // portas, botões e esconderijos (para clicar e para o "E")
    const zonasCorr = [];         // onde dá para pisar nos corredores (metros)

    /* ----- salas: vãos de cada lado (onde encostam os corredores) ----- */
    const S = {};
    for (let p = 1; p <= 25; p++) { const cn = 25 * (a - 1) + p; S[p] = { ...sala3D(p), cn, cena: cenaDe(cn), vaos: {}, paredes: {}, veus: [] }; }
    const CS = corrs(a);
    CS.forEach(c => {
      const q = corr3D(c);
      if (c.saida) { const lado = { cima: 'n', baixo: 's', esq: 'w', dir: 'e' }[(MAPA.g.saidaDoAndar(a) || {}).lado]; if (lado && S[c.p1]) S[c.p1].vaos[lado] = { centro: q.linha, ci: -1, saida: true }; return; }
      if (q.h) { S[c.p1].vaos.e = { centro: q.linha, ci: c.ci }; S[c.p2].vaos.w = { centro: q.linha, ci: c.ci }; }
      else { S[c.p1].vaos.s = { centro: q.linha, ci: c.ci }; S[c.p2].vaos.n = { centro: q.linha, ci: c.ci }; }
    });

    /* ----- paredes com vão, batentes e rodapé ----- */
    const mBatente = F.m('#26262b', { r: .5, me: .4 });
    function parede(lt, mat, rod, eixoX, fixo, de, ate, vao, sinal) {
      const segs = vao ? [[de, vao[0]], [vao[1], ate]] : [[de, ate]];
      segs.forEach(([u0, u1]) => {
        const L = u1 - u0; if (L < .01) return; const m = (u0 + u1) / 2, f = fixo + sinal * (ESP / 2 + .012);
        if (eixoX) { lt.caixa(mat, L, ALT, ESP, m, 0, fixo); lt.caixa(rod, L, .12, .02, m, 0, f); }
        else { lt.caixa(mat, ESP, ALT, L, fixo, 0, m); lt.caixa(rod, .02, .12, L, f, 0, m); }
      });
      if (vao) {
        const L = vao[1] - vao[0], m = (vao[0] + vao[1]) / 2;
        if (eixoX) { lt.caixa(mat, L, ALT - VAO_H, ESP, m, VAO_H, fixo); [vao[0], vao[1]].forEach(u => lt.caixa(mBatente, .08, VAO_H, ESP + .04, u, 0, fixo)); lt.caixa(mBatente, L + .16, .08, ESP + .04, m, VAO_H - .04, fixo); }
        else { lt.caixa(mat, ESP, ALT - VAO_H, L, fixo, VAO_H, m); [vao[0], vao[1]].forEach(u => lt.caixa(mBatente, ESP + .04, VAO_H, .08, fixo, 0, u)); lt.caixa(mBatente, ESP + .04, .08, L + .16, fixo, VAO_H - .04, m); }
      }
    }
    const vaoDe = v => v ? [v.centro - CORR_W / 2, v.centro + CORR_W / 2] : null;
    Object.values(S).forEach(s => {
      const c = s.cena || {}, piso = c.piso || {}, par = c.parede || {}, teto = c.teto || {}, KR = SALA_M / (c.lado || 7.071);
      const mPiso = F.m(piso.c || tema.sala.piso, { tex: piso.tex || 'concreto', rep: [(piso.rep || 3) * KR, (piso.rep || 3) * KR], r: piso.r ?? .85 });
      const mPar = F.m(par.c || tema.sala.parede, { tex: par.tex || 'concreto', rep: [(par.rep || 2) * KR, 1], r: .9 });
      const mRod = F.m(par.rodape || '#2b2b2b');
      const lt = criarLote(T, ctx.descartes);
      lt.plano(mPiso, s.x1 - s.x0, s.z1 - s.z0, s.cx, 0, s.cz, -Math.PI / 2);
      lt.montar(raiz);
      const lados = {
        n: [true, s.z0 - ESP / 2, s.x0 - ESP, s.x1 + ESP, vaoDe(s.vaos.n), 1],
        s: [true, s.z1 + ESP / 2, s.x0 - ESP, s.x1 + ESP, vaoDe(s.vaos.s), -1],
        w: [false, s.x0 - ESP / 2, s.z0, s.z1, vaoDe(s.vaos.w), 1],
        e: [false, s.x1 + ESP / 2, s.z0, s.z1, vaoDe(s.vaos.e), -1],
      };
      Object.entries(lados).forEach(([lado, [eixoX, fixo, de, ate, vao, sinal]]) => {
        const g = new T.Group(); raiz.add(g);
        const l2 = criarLote(T, ctx.descartes); parede(l2, mPar, mRod, eixoX, fixo, de, ate, vao, sinal); l2.montar(g);
        s.paredes[lado] = g;
      });
      const lt3 = criarLote(T, ctx.descartes);
      lt3.plano(F.m(teto.c || tema.sala.teto, { tex: teto.tex || 'concreto', rep: [2 * KR, 2 * KR] }), s.x1 - s.x0, s.z1 - s.z0, s.cx, ALT, s.cz, Math.PI / 2);
      lt3.montar(tetos);
      // véus nos vãos: escondem a sala de quem não pode vê-la (escuro que não deixa ver dentro)
      Object.entries(s.vaos).forEach(([lado, v]) => {
        const veu = new T.Mesh(F.guardar(new T.PlaneGeometry(CORR_W + .02, VAO_H + .02)), F.m('#000000', { r: 1 }));
        const d = .05;
        if (lado === 'n') { veu.position.set(v.centro, VAO_H / 2, s.z0 + d); }
        if (lado === 's') { veu.position.set(v.centro, VAO_H / 2, s.z1 - d); veu.rotation.y = Math.PI; }
        if (lado === 'w') { veu.position.set(s.x0 + d, VAO_H / 2, v.centro); veu.rotation.y = Math.PI / 2; }
        if (lado === 'e') { veu.position.set(s.x1 - d, VAO_H / 2, v.centro); veu.rotation.y = -Math.PI / 2; }
        // o véu olha para FORA da sala (quem está no corredor vê só escuro)
        veu.rotation.y += Math.PI; veu.material.side = T.DoubleSide;
        veu.visible = false; veus.add(veu); s.veus.push(veu);
      });
    });

    /* ----- corredores ("backrooms": papel de parede amarelo, carpete úmido, forro e lâmpadas) ----- */
    const mParC = F.m(tema.parede, { tex: 'papel_parede', rep: [5, 1], r: .9 });
    const mChaoC = F.m(tema.chao, { tex: 'carpete_umido', rep: [8, 1], r: 1 });
    const mTetoC = F.m(tema.teto, { tex: 'forro', rep: [10, 1], r: .9 });
    const mPainel = F.m('#ffffff', { unico: true, e: tema.luz, ei: 1.5 });
    const mPainelMorto = F.m('#5a5850', { r: .6 });
    const mPainelPisca = F.m('#ffffff', { unico: true, e: tema.luz, ei: 1.5 });
    const mCarne = F.m('#8a2a2e', { tex: 'carne', rep: [2, 1], r: .4, e: '#200004', ei: .3 });
    const ltC = criarLote(T, ctx.descartes), ltCT = criarLote(T, ctx.descartes);
    const virtCorr = [];      // luzes virtuais dos corredores
    const decalques = new T.Group(); raiz.add(decalques);
    const cpos = (q, ao, lin, y) => q.h ? new T.Vector3(ao, y, lin) : new T.Vector3(lin, y, ao);
    CS.forEach((c, k) => {
      const q = corr3D(c), L = q.a1 - q.a0, mid = (q.a0 + q.a1) / 2, rr = NSX.rng(a * 131 + k * 17 + 3);
      const W = CORR_W, lados = [q.linha - W / 2 - .075, q.linha + W / 2 + .075];
      if (q.h) {
        ltC.plano(mChaoC, L, W + .02, mid, .003, q.linha, -Math.PI / 2);
        lados.forEach(z => ltC.caixa(mParC, L, CORR_H, .15, mid, 0, z));
        ltCT.plano(mTetoC, L, W, mid, CORR_H - .001, q.linha, Math.PI / 2);
      } else {
        ltC.plano(mChaoC, W + .02, L, q.linha, .003, mid, -Math.PI / 2);
        lados.forEach(x => ltC.caixa(mParC, .15, CORR_H, L, x, 0, mid));
        ltCT.plano(mTetoC, W, L, q.linha, CORR_H - .001, mid, Math.PI / 2);
      }
      // lâmpadas do teto: algumas piscam, algumas morreram
      const n = Math.max(1, Math.round(L / 3.5));
      for (let i = 0; i < n; i++) {
        const ao = q.a0 + (i + .5) * L / n, sorte = rr();
        const morta = sorte < tema.mortas, pisca = !morta && sorte < tema.mortas + tema.pisca;
        const mat = morta ? mPainelMorto : pisca ? mPainelPisca : mPainel;
        const pp = cpos(q, ao, q.linha, CORR_H - .012);
        const pm = new T.Mesh(F.guardar(new T.PlaneGeometry(.55, .55)), mat); pm.rotation.x = Math.PI / 2; pm.position.copy(pp); raiz.add(pm);
        if (!morta) { const l = new T.PointLight(tema.luz, .85, 5.2, 2); virtCorr.push({ l, p: cpos(q, ao, q.linha, CORR_H - .3), base: .85, pisca, f: rr() * 9, corr: true }); }
      }
      // sangue (mais nos andares de baixo)
      if (rr() < tema.sangue) {
        const nd = 1 + Math.floor(rr() * 3);
        for (let i = 0; i < nd; i++) {
          const est = ['escorrido', 'mao', 'respingo', 'poca'][Math.floor(rr() * 4)], chao = est === 'poca' || (est === 'respingo' && rr() < .5);
          const o = F.P.sangue({ estilo: est, chao: chao ? 1 : 0, w: chao ? 1.2 : .9, h: chao ? 1.2 : 1.1, y: .2 + rr() * .6, sem: k * 7 + i });
          const ao = q.a0 + 1 + rr() * (L - 2), lado = rr() < .5 ? -1 : 1;
          if (chao) o.position.copy(cpos(q, ao, q.linha + (rr() - .5) * .4, 0));
          else { o.position.copy(cpos(q, ao, q.linha + lado * (W / 2 - .002), 0)); o.rotation.y = q.h ? (lado < 0 ? 0 : Math.PI) : (lado < 0 ? Math.PI / 2 : -Math.PI / 2); }
          decalques.add(o);
        }
      }
      // carne tomando as paredes (do 3º andar para baixo)
      if (rr() < tema.carne) {
        for (let i = 0; i < 3; i++) {
          const ao = q.a0 + 1 + rr() * (L - 2), lado = rr() < .5 ? -1 : 1, hh = .6 + rr() * 1.4;
          const pts = []; for (let j = 0; j < 5; j++) pts.push(cpos(q, ao + (rr() - .5) * 2, q.linha + lado * (W / 2 - .03), .1 + j * hh / 4));
          decalques.add(new T.Mesh(F.guardar(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 16, .03 + rr() * .05, 6)), mCarne));
        }
      }
      // zona andável (3D) do corredor: estreita, de sala a sala
      const w0 = q.linha - W / 2 + RAIO, w1 = q.linha + W / 2 - RAIO;
      zonasCorr.push(q.h ? [q.a0 - .35, q.a1 + .35, w0, w1] : [w0, w1, q.a0 - .35, q.a1 + .35]);
      // saída: elevador no fim do corredor curto
      if (c.saida) {
        const el = F.P.elevador({}); const fimA = (MAPA.g.saidaDoAndar(a) || {}).lado === 'cima' || (MAPA.g.saidaDoAndar(a) || {}).lado === 'esq' ? q.a0 + .1 : q.a1 - .1;
        el.position.copy(cpos(q, fimA, q.linha, 0));
        const lado = (MAPA.g.saidaDoAndar(a) || {}).lado; el.rotation.y = { cima: 0, baixo: Math.PI, esq: Math.PI / 2, dir: -Math.PI / 2 }[lado] || 0;
        raiz.add(el);
        interativos.push({ tipo: 'elevador', pos: el.position.clone().setY(1.1), obj: el });
      }
    });
    ltC.montar(raiz); ltCT.montar(tetos);

    /* ----- portas dos corredores (estado público, ao vivo) ----- */
    const animPortas = [];
    const portas = CS.map(c => {
      if (c.saida) return null;
      const q = corr3D(c), grp = new T.Group(), mid = (q.a0 + q.a1) / 2;
      grp.position.copy(cpos(q, mid, q.linha, 0)); if (!q.h) grp.rotation.y = -Math.PI / 2;
      raiz.add(grp);
      return { c, q, grp, v: null, desc: [], anim: [], botoes: [] };
    });
    const estadoPorta = ci => {
      const v = ((ACF().estado || {}).portas || {})['a' + a + 'c' + ci];
      if (!v) return 'f'; if (v === 'a') return 'a';
      if (typeof v === 'string' && v.startsWith('p')) return 'p';
      if (typeof v === 'string' && v.startsWith('k:')) return 'tk';
      return ['t', 'tk', 'd', 'c'].includes(v) ? v : 'f';
    };
    function montarPorta(P, e) {
      P.grp.clear(); P.desc.forEach(x => { try { x.dispose(); } catch (er) {} }); P.desc = []; P.anim = [];
      const Fp = NSX.criarFabrica(T, P.anim, [], P.desc, { alt: ALT }), g = P.grp, W = CORR_W;
      const metalP = Fp.m('#737a83', { r: .55, me: .25, tex: 'metal', rep: [1, 2] });
      [-1, 1].forEach(s => Fp.bx(g, .22, CORR_H, .1, mBatente, 0, 0, s * (W / 2 - .05)));
      Fp.bx(g, .22, .14, W, mBatente, 0, CORR_H - .14, 0);
      const alvo = Fp.bx(g, .14, CORR_H - .16, W - .1, Fp.m('#000000', { unico: true, op: 0 }), 0, 0, 0); alvo.userData.porta = P.c.ci;   // área de clique
      if (e === 'a') { Fp.bx(g, .12, .1, W - .2, metalP, 0, CORR_H - .24, 0); return; }
      if (e === 'd') {
        const r = NSX.rng(P.c.ci * 7 + 1), mc = Fp.m('#6a665f', { tex: 'concreto', r: 1 }), mf = Fp.m('#3b3a38', { r: .9 });
        for (let i = 0; i < 20; i++) { const w = .25 + r() * .55, h = .2 + r() * .5, y = Math.max(0, (1 - Math.abs(r() - .5) * 2) * 1.4 * r()); const b = Fp.bx(g, w, h, .25 + r() * .5, i % 4 ? mc : mf, (r() - .5) * 1.2, y, (r() - .5) * (W - .3)); b.rotation.set(r() * .6, r() * 3, r() * .6); }
        const viga = Fp.bx(g, .16, .16, W + .5, metalP, .2, 1.1, 0); viga.rotation.x = .5; viga.rotation.y = .3; return;
      }
      if (e === 'c') {
        const mcarne = Fp.m('#b07070', { unico: true, tex: 'carne', r: .35, e: '#1a0002', ei: .4 });
        const pw = new T.Group(); g.add(pw); Fp.bx(pw, .28, CORR_H, W - .06, mcarne, 0, 0, 0);
        const r = NSX.rng(11); for (let i = 0; i < 8; i++) Fp.sf(pw, .12 + r() * .18, mcarne, (r() - .5) * .25, .3 + r() * 1.8, (r() - .5) * (W - .4), 12).scale.set(.55, 1, 1);
        P.anim.push((dt, t) => { const k = 1 + Math.max(0, Math.sin(t * 5.2)) * .04 + Math.max(0, Math.sin(t * 5.2 - 1.2)) * .02; pw.scale.set(k, 1, 1 + (k - 1) * .4); });
        return;
      }
      // porta de aço dupla, rebitada, com puxadores dos dois lados
      const aco = Fp.m('#5a5e62', { tex: 'porta_aco', r: .6, me: .45 }), puxa = Fp.m('#a8aeb4', { me: .8, r: .3 }), escuro = Fp.m('#1a1a1a', { me: .5 });
      [-1, 1].forEach(s => {
        Fp.bx(g, .09, CORR_H - .16, W / 2 - .06, aco, 0, 0, s * (W / 4 - .01));
        [-1, 1].forEach(lx => Fp.bx(g, .04, .5, .035, puxa, lx * .07, .95, s * .13));
        [.35, CORR_H - .65].forEach(yy => Fp.bx(g, .12, .22, .06, escuro, 0, yy, s * (W / 2 - .07)));
      });
      Fp.bx(g, .1, CORR_H - .16, .02, escuro, 0, 0, 0);
      Fp.bx(g, .1, .12, W - .08, Fp.m('#d4a017', { r: .7 }), 0, .25, 0);
      if (e === 't' || e === 'tk') [-1, 1].forEach(s => {
        const tx = Fp.textoTex(e === 'tk' ? '🔢\nTECLADO' : '🔒\nTRANCADA', { w: 256, h: 192, cor: '#ffd36b', fundo: '#1a1408' });
        const pm = Fp.pl(g, .5, .38, Fp.m('#ffffff', { unico: true, mapa: tx, r: .9 }), s * .051, 1.6, 0); pm.rotation.y = s * Math.PI / 2;
      });
    }
    // botões vermelhos ao lado dos vãos, do lado de dentro das salas
    const ladoInfo = { n: [0, 1, 0], s: [Math.PI, -1, 0], w: [Math.PI / 2, 0, 1], e: [-Math.PI / 2, 0, -1] };
    Object.values(S).forEach(s => Object.entries(s.vaos).forEach(([lado, v]) => {
      if (v.ci < 0) return;
      const b = F.P.botao_porta({}), along = v.centro + CORR_W / 2 + .32;
      if (lado === 'n') b.position.set(along, 0, s.z0 + .03); if (lado === 's') b.position.set(along, 0, s.z1 - .03);
      if (lado === 'w') b.position.set(s.x0 + .03, 0, along); if (lado === 'e') b.position.set(s.x1 - .03, 0, along);
      b.rotation.y = ladoInfo[lado][0]; raiz.add(b);
      b.traverse(o => { if (o.isMesh) o.userData.porta = v.ci; });
      const P = portas[CS.findIndex(c => c.ci === v.ci)]; if (P) P.botoes.push(b);
      interativos.push({ tipo: 'porta', ci: v.ci, pos: b.position.clone().setY(1.1), p: s.p });
      // lâmpadas de alerta dos dois lados do vão (mudam de cor com a porta, como o botão)
      if (F.P.lampada_alerta) [-1, 1].forEach(k => {
        const l = F.P.lampada_alerta({ y: 1.95, sem: v.ci * 3 + k }), al = v.centro + k * (CORR_W / 2 + .2);
        if (lado === 'n') l.position.set(al, 0, s.z0 + .1); if (lado === 's') l.position.set(al, 0, s.z1 - .1);
        if (lado === 'w') l.position.set(s.x0 + .1, 0, al); if (lado === 'e') l.position.set(s.x1 - .1, 0, al);
        l.rotation.y = ladoInfo[lado][0]; raiz.add(l); if (P) P.botoes.push(l);
      });
    }));
    const COR_BOTAO = { f: '#ff2020', p: '#ff2020', a: '#20ff60', t: '#ffb020', tk: '#ffb020', d: '#ffb020', c: '#ffb020' };
    function atualizarPortas() {
      portas.forEach(P => {
        if (!P) return; const e = estadoPorta(P.c.ci); if (e === P.v) return; P.v = e; montarPorta(P, e);
        P.botoes.forEach(b => { const l = b.userData.luzBotao; if (l) { l.material.emissive.set(COR_BOTAO[e] || '#ff2020'); l.userData.pisca = e === 'p'; } });
      });
    }
    atualizarPortas();

    /* ----- luzes: cada sala com sua luz; o Mestre muda (mapa/luz) ----- */
    const est = () => ACF().estado || {};
    const modoLuz = k => ((est().luz || {})[k]) || 'normal';
    function fatorLuz(modo, t, f) {
      if (modo === 'off') return 0; if (modo === 'fraca') return .35;
      if (modo === 'pisca') return (Math.sin(t * 3.1 + f) > .55 || Math.sin(t * 17 + f * 3) > .9) ? .05 : 1;
      return 1;
    }
    const VERM = new T.Color('#ff2a1a');

    { const sd = MAPA.g.saidaDoAndar(a); if (sd && !sd.lado && S[sd.p]) interativos.push({ tipo: 'elevador', pos: new T.Vector3(S[sd.p].cx, 1.1, S[sd.p].cz), sala: sd.p }); }

    /* ----- conteúdo das salas: só perto de quem está olhando ----- */
    const carregadas = new Map(), campos = [];
    function carregar(p) {
      const s = S[p]; if (carregadas.has(p)) return;
      const ver = ((est().var3d || {})['c' + s.cn]) || 'neutro';
      const desc = [], anim = [], luzes = [], g = new T.Group();
      g.position.set(s.cx, 0, s.cz); raiz.add(g);
      const cena = s.cena || {};
      const F2 = NSX.criarFabrica(T, anim, luzes, desc, { alt: ALT }); F2.T = T;
      montarItens(F2, cena, g, ver, { cn: s.cn, vaos: Object.entries(s.vaos).map(([lado, v]) => ({ lado, u: v.centro - (lado === 'n' || lado === 's' ? s.cx : s.cz) })) });
      g.updateMatrixWorld(true);
      g.children.forEach(o => { if (o.userData.campo) campos.push({ p, cn: s.cn, x: s.cx + o.position.x, z: s.cz + o.position.z, ...o.userData.campo }); });
      const virt = luzes.map(l => { const w = new T.Vector3(); l.getWorldPosition(w); let dono = l.parent; while (dono && dono.parent && dono.parent !== g) dono = dono.parent; l.parent.remove(l); return { l, p: w, base: l.intensity, cn: s.cn, dono: dono && dono.parent === g ? dono : null }; });
      (cena.luzes || []).forEach((l, i) => {
        const L = new T.PointLight(l.c || '#fff', l.i ?? 1, l.d ?? 8, 2);
        virt.push({ l: L, p: new T.Vector3(s.cx + (l.x || 0), l.y ?? ALT - .4, s.cz + (l.z || 0)), base: L.intensity, cn: s.cn, pisca: !!l.pisca, f: i * 1.7 });
      });
      // sala sem luz própria: uma lâmpada fraca no teto (para não virar um quadrado preto)
      if (!virt.length && !s.cena) virt.push({ l: new T.PointLight('#ffe8c8', .6, 8, 2), p: new T.Vector3(s.cx, ALT - .4, s.cz), base: .6, cn: s.cn });
      if (cena.sombra !== false && s.cena) virt.push({ l: new T.PointLight(cena.sombraCor || '#fff4e6', (cena.sombraI ?? .8) * .8, 10, 2), p: new T.Vector3(s.cx + .8, ALT - .4, s.cz + .6), base: (cena.sombraI ?? .8) * .8, cn: s.cn });
      // interações (abrir, ligar, tocar, ler, vestir, telão): interacoes3d.js
      const IN = NS().inter ? NS().inter.preparar(T, g, s, p, desc) : { lista: [], dinam: [] };
      IN.lista.forEach(e => interativos.push(e));
      // materiais que brilham (lâmpadas, telas): apagam junto com a luz da sala
      const emissivos = [];
      g.traverse(o => { if (o.isMesh && o.material && o.material.emissive && o.material.emissiveIntensity > .3 && !emissivos.find(e => e.m === o.material)) emissivos.push({ m: o.material, base: o.material.emissiveIntensity }); });
      // esconderijos desta sala
      const esconde = [];
      g.children.forEach(o => { if (o.userData.esc) { const w = new T.Vector3(); o.getWorldPosition(w); esconde.push({ tipo: 'esconderijo', cn: s.cn, p, i: o.userData.i, nome: o.userData.esc, pos: w, obj: o }); } });
      esconde.forEach(e => interativos.push(e));
      // coisas de usar: o Maurício (loja), o bebedouro e a geladeira (despensa)
      g.children.forEach(o => { if (o.userData.uso) { const w = new T.Vector3(); o.getWorldPosition(w); interativos.push({ tipo: 'uso', uso: o.userData.uso, cn: s.cn, p, pos: w, obj: o }); } });
      // itens do livro jogados: aparecem quando o Mestre espalha (mapa/estoque/i_<CN>_<n>)
      g.children.forEach(o => { if (o.userData.t === 'item_chao') { const w = new T.Vector3(); o.getWorldPosition(w); const it = (cena.itens || [])[o.userData.i] || {}; interativos.push({ tipo: 'item', k: `i_${s.cn}_${o.userData.i}`, nome: it.item || 'Item', cn: s.cn, p, pos: w, obj: o }); } });
      const c = { g, desc, anim, virt, obst: obstaculos(T, g), emissivos, esconde, ver, docs: [], sigDocs: '', inter: IN };
      carregadas.set(p, c);
      if (NS().inter) NS().inter.aplicar(c, true);
      atualizarItens(p); sincDocs(p, F2); sincItensM(p, F2);
    }
    // itens do chão: só aparecem os que estão no estoque (o Mestre espalhou e ninguém pegou)
    function atualizarItens(pSo) {
      const e = (est().estoque || {});
      carregadas.forEach((c, p) => { if (pSo && p !== pSo) return; c.g.children.forEach(o => { if (o.userData.t === 'item_chao') o.visible = (e[`i_${S[p].cn}_${o.userData.i}`] || 0) > 0; else if (o.userData.km) o.visible = (e[o.userData.km] || 0) > 0; }); });
    }
    // itens que o Mestre deixou nesta sala (mapa/itens3d): aparecem para todos e se pegam com E
    function sincItensM(p, F2) {
      const c = carregadas.get(p); if (!c) return;
      const cn = S[p].cn, lista = Object.entries(est().itens3d || {}).filter(([, v]) => v && v.cn === cn && v.a === a);
      const sig = lista.map(([k, v]) => k + v.x + v.y + v.n).join('|');
      if (sig === c.sigItm) return; c.sigItm = sig;
      (c.itm || []).forEach(d => { c.g.remove(d.obj); const i = interativos.indexOf(d.it); if (i >= 0) interativos.splice(i, 1); }); c.itm = [];
      const Fd = F2 || NSX.criarFabrica(T, c.anim, [], c.desc, { alt: ALT });
      lista.forEach(([k, v], j) => {
        let [x, z] = planta3D(a, v.x, v.y); x -= S[p].cx; z -= S[p].cz;
        const o = Fd.P.item_chao({ item: v.n, sem: 700 + j }); o.position.set(x, 0, z); o.userData.t = 'item_m'; o.userData.km = 'm_' + k; c.g.add(o);
        const w = new T.Vector3(); o.getWorldPosition(w);
        const it = { tipo: 'item', k: 'm_' + k, nome: v.n, cn, p, pos: w, obj: o };
        interativos.push(it); c.itm.push({ obj: o, it });
      });
      atualizarItens(p);
    }
    function atualizarItensM() { carregadas.forEach((c, p) => sincItensM(p)); }
    // documentos e cifras que o Mestre prendeu a esta sala (Arquivo: "Na parede de uma sala")
    function sincDocs(p, F2) {
      const c = carregadas.get(p); if (!c) return;
      const AR = window.ACF_ARQUIVO, lista = AR && AR.daSala3D ? AR.daSala3D(S[p].cn) : [];
      const sig = lista.map(x => x.tipo + x.id + x.tit).join('|');
      if (sig === c.sigDocs) return;
      c.sigDocs = sig;
      c.docs.forEach(d => { c.g.remove(d.obj); const i = interativos.indexOf(d.it); if (i >= 0) interativos.splice(i, 1); }); c.docs = [];
      const Fd = F2 || NSX.criarFabrica(T, c.anim, [], c.desc, { alt: ALT });
      const HD = SALA_M / 2 - .6, livreAqui = (x, z) => x > -HD && x < HD && z > -HD && z < HD && !c.obst.some(r => dentroDe(r, x + S[p].cx, z + S[p].cz));
      lista.forEach((d, k) => {
        let pt = null;
        for (let r = 1.2; r < HD - .2 && !pt; r += .35) for (let j = 0; j < 12; j++) { const ang = (k * 2.1 + j / 12 * Math.PI * 2), x = Math.cos(ang) * r, z = Math.sin(ang) * r; if (livreAqui(x, z)) { pt = [x, z]; break; } }
        if (!pt) pt = [0, 0];
        const o = Fd.P.documento_sala({ sem: 900 + k, txt: d.tipo === 'cifras' ? 'CIFRA' : 'O.R.F.E.U.' });
        o.position.set(pt[0], 0, pt[1]); o.userData.t = 'documento_sala'; c.g.add(o);
        const w = new T.Vector3(); o.getWorldPosition(w);
        const it = { tipo: 'doc', arq: d.tipo, id: d.id, tit: d.tit, cn: S[p].cn, p, pos: w, obj: o };
        interativos.push(it); c.docs.push({ obj: o, it });
      });
    }
    function atualizarDocs() { carregadas.forEach((c, p) => sincDocs(p)); }
    function descarregar(p) {
      const c = carregadas.get(p); if (!c) return;
      for (let i = campos.length - 1; i >= 0; i--) if (campos[i].p === p) campos.splice(i, 1);
      raiz.remove(c.g); c.desc.forEach(x => { try { x.dispose(); } catch (e) {} });
      for (let i = interativos.length - 1; i >= 0; i--) if (['esconderijo', 'uso', 'item', 'doc', 'int'].includes(interativos[i].tipo) && interativos[i].p === p) interativos.splice(i, 1);
      carregadas.delete(p);
    }
    const vizinhas = p => CS.filter(c => !c.saida && (c.p1 === p || c.p2 === p)).map(c => [c.p1 === p ? c.p2 : c.p1, c.ci]);
    const centroMaisPerto = (x, z) => { let best = null, bd = 1e9; Object.values(S).forEach(s => { const d = (s.cx - x) ** 2 + (s.cz - z) ** 2; if (d < bd) { bd = d; best = s.p; } }); return best; };

    // quem vê qual sala: Mestre, todas; auxiliar, as reveladas; jogador, só a do próprio token
    function salaVisivel(p) {
      if (ctx.quem === 'mestre') return true;
      if (ctx.quem === 'aux') return !!A.salaRevelada(S[p].cn);
      return p === ctx.salaJogador();
    }
    let tStream = 0, visAntes = '';
    function streaming(x, z, modo) {
      const quer = new Set();
      if (ctx.quem === 'jog') { const pj = ctx.salaJogador(); if (pj) quer.add(pj); }
      else {
        const p0 = salaNoPonto3D(a, x, z) || centroMaisPerto(x, z); quer.add(p0);
        const largo = !imersivo(modo) && ctx.zoomLargo();
        if (largo) { Object.values(S).map(s => [s.p, (s.cx - x) ** 2 + (s.cz - z) ** 2]).sort((u, v) => u[1] - v[1]).slice(0, celular ? 3 : 7).forEach(([p]) => quer.add(p)); }
        else vizinhas(p0).forEach(([p, ci]) => { const P = portas.find(q => q && q.c.ci === ci); if (P && P.v === 'a' || (!imersivo(modo) && !celular)) quer.add(p); });
      }
      [...quer].forEach(p => { if (!salaVisivel(p)) quer.delete(p); });
      [...carregadas.keys()].forEach(p => { if (!quer.has(p)) descarregar(p); });
      const falta = [...quer].find(p => !carregadas.has(p));
      if (falta) carregar(falta);
      // véus: salas que você não pode ver ficam escuras na porta
      const vis = Object.values(S).map(s => salaVisivel(s.p) ? 1 : 0).join('');
      if (vis !== visAntes) { visAntes = vis; Object.values(S).forEach(s => s.veus.forEach(v => { v.visible = !salaVisivel(s.p); })); }
    }
    // remontar uma sala (versão Rei/Mãe trocada, cena nova)
    function recarregar(p) { if (carregadas.has(p)) { descarregar(p); carregar(p); } }

    /* ----- conjunto fixo de luzes (não recompila os materiais quando as salas entram e saem) ----- */
    const POOL = celular ? 6 : 10, pool = [];
    for (let i = 0; i < POOL; i++) { const L = new T.PointLight('#fff', 0, 1, 2); raiz.add(L); pool.push(L); }
    const lista = [];
    function distribuirLuzes(x, z, t) {
      const e = est(), apagao = !!(A.apagao), prot = !!(A.protocolo);
      const modoCorr = modoLuz('a' + a);
      lista.length = 0;
      carregadas.forEach(c => c.virt.forEach(v => lista.push(v)));
      virtCorr.forEach(v => lista.push(v));
      lista.forEach(v => { v.d = (v.p.x - x) ** 2 + (v.p.z - z) ** 2 + (v.p.y - 1.6) ** 2; });
      lista.sort((u, w) => u.d - w.d);
      for (let i = 0; i < POOL; i++) {
        const L = pool[i], v = lista[i];
        if (!v) { L.intensity = 0; continue; }
        const modo = v.corr ? modoCorr : modoLuz('c' + v.cn);
        let k = fatorLuz(modo, t, v.f || 0);
        if (v.pisca) k *= (Math.sin(t * 2.7 + (v.f || 0)) > .9 || Math.sin(t * 13 + (v.f || 0)) > .97) ? .08 : 1;
        if (apagao) k = 0;
        L.position.copy(v.p); L.distance = v.l.distance; L.decay = v.l.decay;
        L.color.copy(v.l.color);
        if (modo === 'vermelha' || prot) { L.color.copy(VERM); if (prot) k *= .45 + .55 * Math.max(0, Math.sin(t * 4)); }
        L.intensity = v.l.intensity * k * (v.dono && v.dono.userData._lig === 0 ? 0 : 1);
      }
      // brilho das lâmpadas e telas acompanha
      carregadas.forEach((c, p) => { const modo = modoLuz('c' + S[p].cn); const k = apagao ? 0 : fatorLuz(modo, t, p); c.emissivos.forEach(o => { o.m.emissiveIntensity = o.base * Math.max(k, apagao ? 0 : .04) * (o.m.userData.mult ?? 1); }); });
      const kc = apagao ? 0 : fatorLuz(modoCorr, t, 0);
      mPainel.emissiveIntensity = 1.5 * kc; mPainelPisca.emissiveIntensity = 1.5 * kc * ((Math.sin(t * 2.7) > .85 || Math.sin(t * 11) > .95) ? .05 : 1);
      const corP = (modoCorr === 'vermelha' || prot) ? VERM : null; mPainel.emissive.set(corP || tema.luz); mPainelPisca.emissive.set(corP || tema.luz);
      portas.forEach(P => P && P.botoes.forEach(b => { const l = b.userData.luzBotao; if (l && l.userData.pisca) l.material.emissiveIntensity = Math.sin(t * 10) > 0 ? 2.5 : .4; else if (l) l.material.emissiveIntensity = 1.4; }));
    }

    /* ----- atmosfera: segue a sala onde você está ----- */
    const corredorAtm = { i: .16, c: '#c9c0a0', chao: '#1a140c', nc: '#0b0904', nd: tema.nevoa, fundo: '#050403', exp: 1.25 };
    const ambDe = c => ({ i: Math.max(c.amb?.i ?? .3, c.amb?.min ?? .15), c: c.amb?.c || '#bfc6d6', chao: c.amb?.chao || '#1a1410' });
    const atmDe = p => {
      if (expoCena && p === expoCena.p && Object.keys(expoCena.atm).length) { const e0 = expoCena; expoCena = null; const base = atmDe(p); expoCena = e0; return { ...base, ...e0.atm }; }
      const s = p && S[p];
      if (!s || !salaVisivel(p)) return corredorAtm;
      if (!s.cena) return { i: .22, c: '#c8c0b0', chao: '#141010', nc: '#060505', nd: tema.nevoa * .6, fundo: '#060505', exp: 1.25 };
      const c = s.cena, am = ambDe(c);
      return { i: am.i, c: am.c, chao: am.chao, nc: c.nevoa ? c.nevoa.c || '#000' : (c.fundo || '#07060a'), nd: c.nevoa ? c.nevoa.d || .05 : .015, fundo: c.fundo || '#07060a', exp: c.exposicao || 1.25 };
    };
    ctx.cena.background = new T.Color('#050403');
    ctx.cena.fog = new T.FogExp2('#050403', tema.nevoa);
    const cTmp = new T.Color();
    function atmosfera(x, z, modo, dt) {
      const at = atmDe(salaNoPonto3D(a, x, z)), k = Math.min(1, dt * 3), apagao = !!A.apagao;
      const ai = apagao ? .015 : at.i;
      ctx.amb.intensity += (ai - ctx.amb.intensity) * k;
      ctx.amb.color.lerp(cTmp.set(at.c), k); ctx.amb.groundColor.lerp(cTmp.set(at.chao), k);
      ctx.cena.fog.color.lerp(cTmp.set(at.nc), k);
      const nd = at.nd * (imersivo(modo) ? (+CFG.nevoa || 1) : .12);
      ctx.cena.fog.density += (nd - ctx.cena.fog.density) * k;
      ctx.cena.background.lerp(cTmp.set(imersivo(modo) ? at.fundo : '#050403'), k);
      ctx.ren.toneMappingExposure += (at.exp - ctx.ren.toneMappingExposure) * k;
    }

    /* ----- onde dá para pisar (metros): salas, corredores e saída; móveis bloqueiam ----- */
    function livre3D(x, z) {
      let ok = false;
      for (const s of Object.values(S)) if (x >= s.x0 + RAIO && x <= s.x1 - RAIO && z >= s.z0 + RAIO && z <= s.z1 - RAIO) { ok = true; break; }
      if (!ok) for (const r of zonasCorr) if (dentroDe(r, x, z)) { ok = true; break; }
      if (!ok) return false;
      for (const c of carregadas.values()) { for (const r of c.obst) if (dentroDe(r, x, z)) return false; if (c.inter && c.inter.dinam.length && !NS().inter.livre(c, x, z)) return false; }
      if (expoCena && expoCena.r.colisoes) for (const r of expoCena.r.colisoes) if (x >= r[0] - RAIO && x <= r[1] + RAIO && z >= r[2] - RAIO && z <= r[3] + RAIO) return false;
      return true;
    }

    /* ----- sala de exposição em andamento (mapa/expo): a sala vira o ambiente da exposição (exposicao3d.js) ----- */
    let expoCena = null;
    function sincExpo() {
      const x = est().expo, quer = x && x.on && x.cn && Math.ceil(x.cn / 25) === a && NS().expo3d ? x : null;
      if (expoCena && (!quer || expoCena.id !== quer.id)) {
        raiz.remove(expoCena.r.grupo); try { expoCena.r.descartar && expoCena.r.descartar(); } catch (e) {}
        expoCena.desc.forEach(d => { try { d.dispose(); } catch (e) {} }); expoCena = null;
      }
      if (!quer) return;
      const p = quer.cn - 25 * (a - 1), sd = S[p]; if (!sd) return;
      if (!expoCena) {
        const anim = [], luzes = [], desc = [];
        const F3 = NSX.criarFabrica(T, anim, luzes, desc, { alt: ALT }); F3.T = T;
        const vaos = Object.entries(sd.vaos).map(([lado, v]) => ({ lado, u: v.centro - (lado === 'n' || lado === 's' ? sd.cx : sd.cz) }));
        let r = null;
        try { r = NS().expo3d.montar({ T, F: F3, sala: { cn: sd.cn, cx: sd.cx, cz: sd.cz, x0: sd.x0, x1: sd.x1, z0: sd.z0, z1: sd.z1, vaos }, expo: quer, ALT, SALA_M, celular: ctx.celular }); }
        catch (e) { console.warn('3D exposição:', e); }
        if (!r || !r.grupo) return;
        raiz.add(r.grupo);
        const at = r.atmosfera || {};
        expoCena = { r, id: quer.id, p, anim, desc, atm: { ...(at.amb ? { i: at.amb.i, c: at.amb.c } : {}), ...(at.nevoa ? { nc: at.nevoa.c, nd: at.nevoa.d } : {}), ...(at.fundo ? { fundo: at.fundo } : {}), ...(at.exposicao ? { exp: at.exposicao } : {}) } };
      } else { try { expoCena.r.atualizar && expoCena.r.atualizar(quer); } catch (e) { console.warn('3D exposição:', e); } }
    }

    // dentro de uma sala ou corredor (ignora os móveis): a câmera de jogo não sai pelas paredes
    function area3D(x, z, mg = .12) {
      for (const s of Object.values(S)) if (x >= s.x0 + mg && x <= s.x1 - mg && z >= s.z0 + mg && z <= s.z1 - mg) return true;
      for (const r of zonasCorr) if (x >= r[0] - RAIO + mg && x <= r[1] + RAIO - mg && z >= r[2] - RAIO + mg && z <= r[3] + RAIO - mg) return true;
      return false;
    }

    // casa de bonecas: na vista de fora, as paredes viradas para a câmera somem
    function casaDeBonecas(cx, cz, modo) {
      const fora = !imersivo(modo);
      Object.values(S).forEach(s => {
        const ps = s.paredes, dx = cx - s.cx, dz = cz - s.cz;
        if (!fora) { ps.n.visible = ps.s.visible = ps.w.visible = ps.e.visible = true; return; }
        ps.n.visible = dz > -2; ps.s.visible = dz < 2; ps.w.visible = dx > -2; ps.e.visible = dx < 2;
      });
    }

    setTimeout(() => { try { sincExpo(); } catch (e) {} }, 0);
    return {
      a, S, CS, portas, interativos, carregadas, raiz, tetos, campos,
      livre3D, area3D, atualizarPortas, recarregar, estadoPorta, atualizarItens, atualizarDocs, atualizarItensM, carregar, sincExpo,
      atualizarInter: () => { if (NS().inter) carregadas.forEach(c => NS().inter.aplicar(c, false)); },
      centro: p => [S[p].cx, S[p].cz],
      atualizar(dt, t, x, z, modo, cam) {
        tStream -= dt; if (!(tStream > 0)) { tStream = .3; streaming(x, z, modo); }   // !(>0) também pega NaN
        carregadas.forEach(c => { for (let i = 0; i < c.anim.length; i++) c.anim[i](dt, t); });
        portas.forEach(P => { if (P) for (let i = 0; i < P.anim.length; i++) P.anim[i](dt, t); });
        for (let i = 0; i < ctx.animMundo.length; i++) ctx.animMundo[i](dt, t);
        distribuirLuzes(cam.x, cam.z, t);
        if (expoCena) { for (let i = 0; i < expoCena.anim.length; i++) expoCena.anim[i](dt, t); try { if (typeof expoCena.r.anim === 'function') expoCena.r.anim(dt, t, cam); } catch (e) {} }
        atmosfera(x, z, modo, dt);
        tetos.visible = imersivo(modo);
        casaDeBonecas(cam.x, cam.z, modo);
      },
      sons(x, z) {
        const out = [], pAqui = salaNoPonto3D(a, x, z);
        carregadas.forEach((c, p) => {
          const s = S[p]; if (!s.cena || !s.cena.som) return;
          const d = Math.hypot(s.cx - x, s.cz - z), dentro = pAqui === p;
          out.push({ k: 'c' + s.cn, som: s.cena.som, g: dentro ? 1 : Math.max(0, 1 - (d - SALA_M * .35) / (SALA_M * .9)) * .4 });
        });
        if (!pAqui) out.push({ k: 'corr' + a, som: [['fluor', 1.1], ['neutra', .6]], g: .8 });   // o zumbido dos corredores
        if (A.protocolo) out.push({ k: 'protocolo', som: [['sirene', 1]], g: .9 });
        return out;
      },
      descartar() {
        if (expoCena) { try { expoCena.r.descartar && expoCena.r.descartar(); } catch (e) {} expoCena.desc.forEach(d => { try { d.dispose(); } catch (e) {} }); expoCena = null; }
        [...carregadas.keys()].forEach(descarregar);
        portas.forEach(P => P && P.desc.forEach(x => { try { x.dispose(); } catch (e) {} }));
      }
    };
  }

  /* ================= tokens no 3D (miniaturas) ================= */
  function camadaTokens(ctx, mundo) {
    const { T } = ctx, A = ACF(), NSX = NS(), a = mundo.a;
    const F = NSX.criarFabrica(T, [], [], ctx.descartes, { alt: ALT }); F.T = T;
    const grupo = new T.Group(); ctx.cena.add(grupo);
    const mapa = new Map();
    const tokens = () => (A.estado || {}).tokens || {};
    const formas = () => (A.estado || {}).formas || {};

    // o jogador só enxerga quem está na mesma sala (ou no corredor à vista); Mestre e auxiliar seguem as regras do mapa
    function quemVe(id, tk) {
      if (!A.visivelPara(tk)) return false;
      // auxiliar no Controle de um Filho: enxerga como o Filho (escondido e aprovado no teste some)
      if (ctx.quem === 'aux') { const c = ctx.ctrlAtual(), tc = c && tokens()[c]; if (tc && A.SER[tc.s] && A.SER[tc.s].tipo === 'filho' && A.visivelAoFilho && !A.visivelAoFilho(tk, c)) return false; }
      if (ctx.quem !== 'jog' || id === A.meu) return true;
      const g = MAPA.g, pj = ctx.salaJogador(), pt = g.salaEm(a, tk.x, tk.y);
      if (pt) return pt === pj;
      const ci = g.corredorEm(tk.x, tk.y), meuTk = tokens()[A.meu];
      if (ci < 0 || !meuTk) return false;
      if (g.corredorEm(meuTk.x, meuTk.y) === ci) return true;
      const c = g.CORREDORES[ci];
      return (c.p1 === pj || c.p2 === pj) && A.portaDe(a, ci) === 'a';
    }

    function etiqueta(txt, cor) {
      const [c, x] = NSX.tela(512, 112);
      x.clearRect(0, 0, 512, 112); x.font = 'bold 46px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const w = Math.min(500, x.measureText(txt).width + 46);
      x.fillStyle = 'rgba(7,6,10,.82)'; x.beginPath(); x.roundRect ? x.roundRect(256 - w / 2, 14, w, 84, 18) : x.rect(256 - w / 2, 14, w, 84); x.fill();
      x.strokeStyle = cor || '#c4a8ff'; x.lineWidth = 5; x.stroke();
      x.fillStyle = '#f2ecfa'; x.fillText(txt, 256, 58);
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; ctx.descartes.push(t);
      const mat = new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false }); ctx.descartes.push(mat);
      const sp = new T.Sprite(mat); sp.scale.set(.95, .21, 1); sp.renderOrder = 5;
      return sp;
    }

    function criar(id, tk) {
      const s = ACF().SER[tk.s]; if (!s) return null;
      const forma = formas()[tk.s] || formas()[id];
      const t = NSX.criarToken(F, id, s, forma);
      t.g.traverse(o => { o.userData.token = id; });
      const nome = etiqueta((ACF().rotulo(tk) || s.nome) + (tk.esq ? ' · escondido' : ''), s.contorno || s.cor);
      nome.position.y = t.alt + .32; t.g.add(nome);
      grupo.add(t.g);
      const [x, z] = planta3D(a, tk.x, tk.y);
      t.g.position.set(x, 0, z);
      return { t, x, z, ax: x, az: z, rot: 0, andando: 0, forma, nome, esq: !!tk.esq, rotulo: ACF().rotulo(tk), filho: s.tipo === 'filho', corAro: t.aro ? t.aro.material.emissive.clone() : null };
    }
    function remover(id) { const o = mapa.get(id); if (!o) return; grupo.remove(o.t.g); mapa.delete(id); }

    function sincronizar() {
      const tk0 = tokens(), vistos = new Set();
      Object.entries(tk0).forEach(([id, tk]) => {
        if (!tk || tk.a !== a || !quemVe(id, tk)) return;
        vistos.add(id);
        let o = mapa.get(id);
        const forma = formas()[tk.s] || formas()[id];
        // forma do Filho trocada, escondido/saiu do esconderijo ou nome mudou: refaz a miniatura
        if (o && (o.forma !== forma || o.esq !== !!tk.esq || o.rotulo !== ACF().rotulo(tk))) { remover(id); o = null; }
        if (!o) { o = criar(id, tk); if (!o) return; mapa.set(id, o); }
        // traje vestido (ficha ativa → vitais do token): por cima da miniatura
        const tj = (tk.vit && tk.vit.tj) || '';
        if (o.tj !== tj && NS().inter) { if (o.trajeG) o.t.g.remove(o.trajeG); o.trajeG = tj ? NS().inter.traje(F, o.t.alt, tj) : null; if (o.trajeG) { o.trajeG.traverse(x => { x.userData.token = id; }); o.t.g.add(o.trajeG); } o.tj = tj;
          // de traje, a miniatura some por dentro dele (fica o aro e o nome)
          o.t.g.children.forEach(ch => { if (ch !== o.trajeG && ch !== o.nome && ch !== o.t.base && !ch.isLight && !ch.isSprite) ch.visible = !tj; }); }
        // posição do mapa caiu dentro de um móvel (cama, armário…): fica no ponto livre mais perto
        const ch = tk.x + ',' + tk.y + ':' + mundo.carregadas.size;
        if (o.chLivre !== ch) { o.chLivre = ch; let [x, z] = planta3D(a, tk.x, tk.y); if (!tk.esq && !mundo.livre3D(x, z) && mundo.area3D(x, z, .05)) [x, z] = pontoLivre(mundo.livre3D, x, z); o.bx = x; o.bz = z; }
        o.ax = o.bx; o.az = o.bz;
      });
      [...mapa.keys()].forEach(id => { if (!vistos.has(id)) remover(id); });
      // dois tokens no mesmo lugar: se afastam um pouco (o seu, que você controla, não sai do lugar)
      const ls2 = [...mapa.entries()];
      for (let it = 0; it < 4; it++) for (let i = 0; i < ls2.length; i++) for (let j = i + 1; j < ls2.length; j++) {
        const [ia, A1] = ls2[i], [ib, B1] = ls2[j], dx = B1.ax - A1.ax, dz = B1.az - A1.az, d = Math.hypot(dx, dz) || .001, min = .62;
        if (d >= min) continue;
        const fixoA = ia === ctx.ctrlAtual(), fixoB = ib === ctx.ctrlAtual(), k = (min - d) / (fixoA || fixoB ? 1 : 2), ux = (dx || .3) / d, uz = (dz || .1) / d;
        const tenta = (o, sx) => { const nx = o.ax + ux * k * sx, nz = o.az + uz * k * sx; if (mundo.livre3D(nx, nz)) { o.ax = nx; o.az = nz; } };
        if (!fixoA) tenta(A1, -1); if (!fixoB) tenta(B1, 1);
      }
    }

    let selecionado = null;
    const VERM_ARO = new T.Color('#ff1a10');
    function atualizar(dt, t, eu, euPos, modo, camPos, euYaw) {
      const tks = tokens();
      mapa.forEach((o, id) => {
        let tx = o.ax, tz = o.az;
        if (id === eu && euPos) { tx = euPos[0]; tz = euPos[1]; }
        const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz);
        const passo = Math.min(d, Math.max(dt * 4.5, d * Math.min(1, dt * 8)));
        if (d > .002) { o.x += dx / d * passo; o.z += dz / d * passo; o.rot = Math.atan2(dx, dz); o.andando = .25; }
        else o.andando = Math.max(0, o.andando - dt);
        // para onde olha: o seu segue a câmera (jogo e olhos); os outros seguem o que o dono publicou (tk.d)
        if (id === eu && euYaw != null && imersivo(modo)) o.rot = euYaw + Math.PI;
        else if (id !== eu) { const tk = tks[id]; if (tk && tk.d != null) o.rot = tk.d * Math.PI / 180; }
        if (id === eu && A.virarToken3D && (o.andando > 0 || imersivo(modo))) A.virarToken3D(id, o.rot * 180 / Math.PI);
        if (d > 6) { o.x = tx; o.z = tz; }     // teleporte (o Mestre trouxe o token)
        o.t.g.position.set(o.x, 0, o.z);
        let dr = o.rot - o.t.g.rotation.y; while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2;
        o.t.g.rotation.y += dr * Math.min(1, dt * 10);
        o.t.anim(dt, t, o.andando > 0);
        // o próprio token não aparece na vista de dentro (você é a câmera)
        // no modo Jogo, se a parede empurrou a câmera para colada no token, ele some para não tampar a tela
        o.t.g.visible = !(id === eu && (primeiraP(modo) || (modo === 'jogo' && camPos && Math.hypot(camPos.x - o.x, camPos.z - o.z) < .75)));
        // nomes: o seu some quando você está dentro do mundo; os dos outros somem bem perto da câmera (não tampam a tela)
        const perto = camPos && imersivo(modo) && Math.hypot(camPos.x - o.x, camPos.z - o.z) < 2.6;
        o.nome.visible = CFG.nomes && !(id === eu && imersivo(modo)) && !perto;
        if (o.t.aro) {
          // Protocolo: os Filhos soltos ganham o aro vermelho pulsando
          const prot = o.filho && A.protocolo;
          if (prot !== !!o.aroProt && o.corAro) { o.aroProt = prot; o.t.aro.material.emissive.copy(prot ? VERM_ARO : o.corAro); }
          o.t.aro.material.emissiveIntensity = id === selecionado ? 1.6 + Math.sin(t * 6) * .8 : prot ? 1.2 + Math.sin(t * 5 + o.x) * .9 : .9;
        }
      });
    }
    function objetos() { return grupo.children; }
    function posDe(id) { const o = mapa.get(id); return o ? [o.x, o.z] : null; }
    sincronizar();
    return { sincronizar, atualizar, objetos, posDe, set selecionado(v) { selecionado = v; }, get selecionado() { return selecionado; }, mapa, descartar() { [...mapa.keys()].forEach(remover); ctx.cena.remove(grupo); } };
  }
  /* ================= som ambiente (gerado na hora, sem arquivos) ================= */
  const Som = (() => {
    let ctx = null, saida = null, branco = null, marrom = null, ligado = true;
    try { ligado = JSON.parse(localStorage.getItem('acf-s3d-som') ?? 'true'); } catch (e) {}
    const vozes = new Map();
    function buf(tipo) {
      const n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      let ult = 0;
      for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (tipo === 'marrom') { ult = (ult + .02 * w) / 1.02; d[i] = ult * 3.5; } else d[i] = w; }
      return b;
    }
    function preparar() {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      try {
        if (!ctx) { ctx = new AC(); saida = ctx.createGain(); saida.gain.value = 0; saida.connect(ctx.destination); branco = buf('branco'); marrom = buf('marrom'); }
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      } catch (e) { ctx = null; }
    }
    // pecinhas
    const ruido = (o, b, destino) => { const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; s.connect(destino); s.start(0, Math.random() * 1.9); o.fontes.push(s); return s; };
    const filtro = (tipo, f, q, destino) => { const x = ctx.createBiquadFilter(); x.type = tipo; x.frequency.value = f; if (q) x.Q.value = q; x.connect(destino); return x; };
    const ganho = (v, destino) => { const g = ctx.createGain(); g.gain.value = v; g.connect(destino); return g; };
    const osc = (o, tipo, f, destino) => { const s = ctx.createOscillator(); s.type = tipo; s.frequency.value = f; s.connect(destino); s.start(); o.fontes.push(s); return s; };
    const lfo = (o, f, amp, param) => { const s = osc(o, 'sine', f, ganho(amp, param)); return s; };
    // um "toque" curto (gota, batida, bip, estalo)
    function toque(t, destino, { f = 800, f2, tipo = 'sine', v = .1, ataque = .005, dur = .2, ruidoBP }) {
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + ataque); g.gain.exponentialRampToValueAtTime(.0001, t + dur); g.connect(destino);
      let s;
      if (ruidoBP) { s = ctx.createBufferSource(); s.buffer = branco; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ruidoBP; bp.Q.value = 2; s.connect(bp); bp.connect(g); }
      else { s = ctx.createOscillator(); s.type = tipo; s.frequency.setValueAtTime(f, t); if (f2) s.frequency.exponentialRampToValueAtTime(f2, t + dur); s.connect(g); }
      s.start(t, ruidoBP ? Math.random() : 0); s.stop(t + dur + .05);
    }
    // repetição com intervalo (fixo ou sorteado)
    const ritmo = (o, intervalo, fn) => { let prox = ctx.currentTime + .3 + Math.random() * .5; o.ticks.push(t => { while (prox < t + .25) { fn(prox); prox += typeof intervalo === 'function' ? intervalo() : intervalo; } }); };
    const PRESETS = {
      zumbido(o, s) { const g = ganho(.05, s); osc(o, 'sine', 60, g); osc(o, 'sine', 120, ganho(.5, g)); osc(o, 'sine', 180, ganho(.22, g)); ruido(o, marrom, filtro('lowpass', 300, 0, ganho(.25, s))); },
      fluor(o, s) {
        const g = ganho(.012, s); osc(o, 'sawtooth', 120, filtro('lowpass', 1100, 0, g)); osc(o, 'sine', 240, ganho(.5, g));
        ritmo(o, () => 4 + Math.random() * 9, t => { for (let i = 0; i < 2 + Math.random() * 3; i++) toque(t + i * .07, s, { ruidoBP: 2400, v: .05, dur: .04 }); });
      },
      freezer(o, s) { const g = ganho(.1, s); ruido(o, marrom, filtro('lowpass', 180, 0, g)); const h = ganho(.03, s); osc(o, 'sine', 50, h); lfo(o, .11, .015, h.gain); },
      ventilacao(o, s) { const g = ganho(.13, s); ruido(o, marrom, filtro('bandpass', 520, .7, g)); lfo(o, .17, .04, g.gain); },
      vapor(o, s) {
        const g = ganho(.012, s); ruido(o, branco, filtro('bandpass', 3200, .8, g));
        ritmo(o, () => 3 + Math.random() * 6, t => { g.gain.setTargetAtTime(.075, t, .12); g.gain.setTargetAtTime(.012, t + 1.4, .5); });
      },
      gotas(o, s) {
        const eco = ctx.createDelay(1); eco.delayTime.value = .23; const fb = ganho(.32, eco); eco.connect(fb); eco.connect(s); const ent = ganho(1, s); ent.connect(eco);
        ritmo(o, () => .5 + Math.random() * 1.8, t => toque(t, ent, { f: 1100 + Math.random() * 700, f2: 380, v: .07, dur: .16 }));
      },
      coracao(o, s) { const lp = filtro('lowpass', 160, 0, s); ritmo(o, 1.05, t => { toque(t, lp, { f: 58, f2: 40, v: .5, ataque: .01, dur: .16 }); toque(t + .27, lp, { f: 50, f2: 36, v: .32, ataque: .01, dur: .14 }); }); },
      bip(o, s) { ritmo(o, 1.03, t => toque(t, s, { f: 980, v: .03, ataque: .004, dur: .1 })); },
      estatica(o, s) { ruido(o, branco, filtro('highpass', 1500, 0, ganho(.022, s))); ritmo(o, () => .08 + Math.random() * .5, t => toque(t, s, { ruidoBP: 3500, v: .03 * Math.random(), dur: .02 })); },
      vela(o, s) { ruido(o, marrom, filtro('lowpass', 900, 0, ganho(.02, s))); ritmo(o, () => .15 + Math.random() * .8, t => toque(t, s, { ruidoBP: 2600, v: .04 * Math.random(), dur: .018 })); },
      maquinas(o, s) {
        osc(o, 'sawtooth', 42, filtro('lowpass', 160, 0, ganho(.06, s)));
        ritmo(o, 1.4, t => { toque(t, s, { ruidoBP: 900, v: .09, dur: .09 }); toque(t, s, { tipo: 'square', f: 160, f2: 90, v: .02, dur: .15 }); });
      },
      neutra(o, s) { ruido(o, marrom, filtro('lowpass', 400, 0, ganho(.035, s))); },
      eco(o, s) {
        const eco = ctx.createDelay(1.5); eco.delayTime.value = .6; const fb = ganho(.4, eco); eco.connect(fb); eco.connect(s);
        const bp = filtro('bandpass', 220, 4, ganho(.06, s)); bp.connect(eco); ruido(o, branco, bp); lfo(o, .05, 120, bp.frequency);
      },
      relogio(o, s) { let par = 0; ritmo(o, 1, t => toque(t, s, { ruidoBP: (par++ % 2) ? 3000 : 2300, v: .05, dur: .03 })); },
      geiger(o, s) { ritmo(o, () => .03 + Math.random() * Math.random() * .5, t => toque(t, s, { ruidoBP: 4200, v: .07, dur: .012 })); },
      grilos(o, s) { ritmo(o, () => .25 + Math.random() * .6, t => { for (let i = 0; i < 3; i++) toque(t + i * .045, s, { f: 4300 + Math.random() * 300, v: .012, ataque: .003, dur: .03 }); }); ruido(o, marrom, filtro('lowpass', 300, 0, ganho(.02, s))); },
      vento(o, s) { const g = ganho(.08, s); const bp = filtro('bandpass', 380, .6, g); ruido(o, branco, bp); lfo(o, .07, 160, bp.frequency); lfo(o, .11, .04, g.gain); },
      mar(o, s) { const g = ganho(.05, s); ruido(o, marrom, filtro('lowpass', 520, 0, g)); lfo(o, .09, .045, g.gain); },
      // Protocolo Filho da O.R.F.E.U.: sirene que sobe e desce, com um bipe de alerta por cima
      sirene(o, s) { const g = ganho(.035, s), lp = filtro('lowpass', 1800, 0, g); const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.value = 640; os.connect(lp); os.start(); o.fontes.push(os); lfo(o, .32, 230, os.frequency); ritmo(o, 2.2, t => { toque(t, s, { tipo: 'square', f: 1250, v: .012, dur: .12 }); toque(t + .18, s, { tipo: 'square', f: 1250, v: .012, dur: .12 }); }); },
      alarme_baixo(o, s) { ritmo(o, 1.6, t => { toque(t, s, { tipo: 'square', f: 440, v: .018, dur: .35 }); toque(t + .4, s, { tipo: 'square', f: 330, v: .018, dur: .35 }); }); },
      respiracao(o, s) { const g = ganho(0, s); ruido(o, branco, filtro('bandpass', 700, .9, g)); ritmo(o, 4.2, t => { g.gain.setTargetAtTime(.05, t, .6); g.gain.setTargetAtTime(.004, t + 1.8, .5); g.gain.setTargetAtTime(.035, t + 2.4, .4); g.gain.setTargetAtTime(0, t + 3.6, .3); }); },
      coro(o, s) { const g = ganho(.012, s); [220, 220.6, 329.6, 330.4, 440.8].forEach(f => osc(o, 'sawtooth', f, filtro('lowpass', 900, 0, g))); lfo(o, .2, .004, g.gain); },
    };
    const normal = som => (Array.isArray(som) ? som : [som]).map(x => typeof x === 'string' ? [x, 1] : Array.isArray(x) ? [x[0], x[1] ?? 1] : x && x.p ? [x.p, x.v ?? 1] : null).filter(x => x && PRESETS[x[0]]);
    function criarVoz(k, som) {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(saida);
      const o = { fontes: [], ticks: [] };
      normal(som).forEach(([nome, v]) => { try { PRESETS[nome](o, ganho(v, g)); } catch (e) { console.warn('som 3D:', nome, e); } });
      const voz = { g, o }; vozes.set(k, voz); return voz;
    }
    function soltar(k) {
      const v = vozes.get(k); if (!v) return; vozes.delete(k);
      const t = ctx.currentTime; v.g.gain.setTargetAtTime(0, t, .3);
      setTimeout(() => { v.o.fontes.forEach(s => { try { s.stop(); } catch (e) {} }); try { v.g.disconnect(); } catch (e) {} }, 1600);
    }
    return {
      preparar,
      get ligado() { return ligado; },
      alternar() { ligado = !ligado; try { localStorage.setItem('acf-s3d-som', JSON.stringify(ligado)); } catch (e) {} return ligado; },
      // alvos: [{k, som, g}] · chamado algumas vezes por segundo
      atualizar(alvos) {
        if (!ctx) return;
        const t = ctx.currentTime, mudo = !ligado || (ACF() && ACF().mudo);
        saida.gain.setTargetAtTime(mudo ? 0 : .7 * (CFG.volAmb ?? 1), t, .25);
        const quer = new Set();
        alvos.forEach(a => { quer.add(a.k); const v = vozes.get(a.k) || criarVoz(a.k, a.som); v.g.gain.setTargetAtTime(a.g, t, .5); });
        [...vozes.keys()].forEach(k => { if (!quer.has(k)) soltar(k); });
      },
      tick() { if (!ctx) return; const t = ctx.currentTime; vozes.forEach(v => v.o.ticks.forEach(f => f(t))); },
      // passo de quem anda (só neste aparelho)
      passo(forte) { if (!ctx || !ligado || (ACF() && ACF().mudo)) return; const t = ctx.currentTime; toque(t, saida, { ruidoBP: 160 + Math.random() * 80, v: forte ? .55 : .32, dur: .08 }); toque(t, saida, { f: 72, f2: 44, v: forte ? .3 : .18, ataque: .004, dur: .1 }); },
      pausar() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); },
      retomar() { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
      parar() { [...vozes.keys()].forEach(soltar); if (ctx) setTimeout(() => { if (!V && ctx) ctx.suspend().catch(() => {}); }, 1800); },
    };
  })();


  /* ================= pós-processamento: brilho, vinheta, grão (filme de terror) ================= */
  function criarPos(T, ren, alta) {
    const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
    const quad = new T.Mesh(new T.PlaneGeometry(2, 2)), camO = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), cenaQ = new T.Scene(); cenaQ.add(quad);
    const opt = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, encoding: T.sRGBEncoding };
    const ms = alta && ren.capabilities.isWebGL2 && T.WebGLMultisampleRenderTarget;
    const rtCena = ms ? new T.WebGLMultisampleRenderTarget(1, 1, opt) : new T.WebGLRenderTarget(1, 1, opt);
    const rtA = new T.WebGLRenderTarget(1, 1, opt), rtB = new T.WebGLRenderTarget(1, 1, opt);
    const brilho = new T.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: VS, fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(.68, 1., l), 1.); }' });
    const borrao = new T.ShaderMaterial({ uniforms: { t: { value: null }, dir: { value: new T.Vector2() } }, vertexShader: VS, fragmentShader: 'uniform sampler2D t; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb * .227; c += (texture2D(t, vUv + dir * 1.385).rgb + texture2D(t, vUv - dir * 1.385).rgb) * .316; c += (texture2D(t, vUv + dir * 3.231).rgb + texture2D(t, vUv - dir * 3.231).rgb) * .07; gl_FragColor = vec4(c, 1.); }' });
    const final = new T.ShaderMaterial({
      uniforms: { tCena: { value: null }, tBrilho: { value: null }, uBrilho: { value: 0 }, uTempo: { value: 0 }, uGrao: { value: .055 }, uVinheta: { value: 1.15 }, uAberr: { value: 0 }, uVermelho: { value: 0 }, uEscuro: { value: 0 }, uRes: { value: new T.Vector2(1, 1) } },
      vertexShader: VS,
      fragmentShader: `uniform sampler2D tCena, tBrilho; uniform float uBrilho, uTempo, uGrao, uVinheta, uAberr, uVermelho, uEscuro; uniform vec2 uRes; varying vec2 vUv;
        float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 c = vUv - .5; float d = length(c); vec2 off = c * uAberr * d * 2.;
          vec3 col = vec3(texture2D(tCena, vUv + off).r, texture2D(tCena, vUv).g, texture2D(tCena, vUv - off).b);
          col += texture2D(tBrilho, vUv).rgb * uBrilho;
          col = mix(col, vec3(dot(col, vec3(.35, .2, .1))) * vec3(2.2, .35, .3), uVermelho);
          col *= 1. - uEscuro;
          col *= smoothstep(.95, .2, d * uVinheta);
          col += (rnd(vUv * uRes + fract(uTempo) * 61.7) - .5) * uGrao;
          gl_FragColor = vec4(col, 1.);
        }` });
    let w = 1, h = 1, usarBrilho = alta;
    const passar = (mat, alvo) => { quad.material = mat; ren.setRenderTarget(alvo); ren.render(cenaQ, camO); };
    // opções gráficas (⚙): brilho (bloom), aberração, grão e vinheta
    const aplicar = () => {
      const auto = (v, p) => v === 'auto' ? p : !!v;
      usarBrilho = auto(CFG.brilho, alta);
      final.uniforms.uBrilho.value = usarBrilho ? .75 : 0;
      final.uniforms.uAberr.value = auto(CFG.aberr, alta) ? .006 : 0;
      final.uniforms.uGrao.value = CFG.grao ? .055 : 0;
      final.uniforms.uVinheta.value = CFG.vinheta ? 1.15 : .5;
    };
    aplicar();
    return {
      final, aplicar,
      tamanho(W, H, dpr) { w = Math.max(1, Math.floor(W * dpr)); h = Math.max(1, Math.floor(H * dpr)); rtCena.setSize(w, h); rtA.setSize(Math.max(1, w >> 2), Math.max(1, h >> 2)); rtB.setSize(Math.max(1, w >> 2), Math.max(1, h >> 2)); final.uniforms.uRes.value.set(w, h); },
      render(cena, cam, t) {
        ren.setRenderTarget(rtCena); ren.render(cena, cam);
        if (usarBrilho) {
          brilho.uniforms.t.value = rtCena.texture; passar(brilho, rtA);
          borrao.uniforms.t.value = rtA.texture; borrao.uniforms.dir.value.set(1 / (w >> 2), 0); passar(borrao, rtB);
          borrao.uniforms.t.value = rtB.texture; borrao.uniforms.dir.value.set(0, 1 / (h >> 2)); passar(borrao, rtA);
        }
        final.uniforms.tCena.value = rtCena.texture; final.uniforms.tBrilho.value = rtA.texture; final.uniforms.uTempo.value = t;
        passar(final, null);
      },
      descartar() { [rtCena, rtA, rtB, brilho, borrao, final, quad.geometry].forEach(x => x.dispose()); }
    };
  }

  /* ================= o visualizador (tela cheia) ================= */
  let V = null;
  const ehToque = () => matchMedia('(pointer: coarse)').matches;
  const quemSou = () => { const a = ACF(); return a.mestre ? 'mestre' : a.aux ? 'aux' : 'jog'; };

  function criarJanela() {
    if ($('#s3d')) return $('#s3d');
    const d = document.createElement('div');
    d.id = 's3d'; d.className = 's3d'; d.hidden = true;
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Planta em 3D');
    d.innerHTML = `<div class="s3d-palco"></div>
      <div class="s3d-fresta" id="s3dFresta" hidden></div>
      <div class="s3d-topo"><div class="s3d-tit"><b id="s3dCN"></b><span id="s3dNome"></span></div>
        <div class="s3d-topo-bts">
          <button type="button" class="s3d-x s3d-mini s3d-bt-menu" data-s3dv="menu" title="Menu do jogo (M)" aria-label="Menu do jogo">☰</button>
          <button type="button" class="s3d-x s3d-mini" data-s3dv="chat" title="Chat (Enter): a mensagem aparece em cima da cabeça do seu personagem" aria-label="Chat">💬</button>
          <button type="button" class="s3d-x s3d-mini" data-s3dv="gaveta" title="Painel (Tab)" aria-label="Painel">🗂</button>
          <button type="button" class="s3d-x s3d-mini" data-s3dv="painel" id="s3dBtPainel" title="Controles do 3D (luzes, portas, tokens)" aria-label="Controles do 3D" hidden>🎛</button>
          <button type="button" class="s3d-x s3d-mini" data-s3dv="opcoes" title="Opções" aria-label="Opções">⚙</button>
          <button type="button" class="s3d-x" data-s3dv="fechar" aria-label="Fechar">✕</button>
        </div></div>
      <div class="s3d-faixas"><div class="s3d-prot" id="s3dProt" hidden>⚠ PROTOCOLO FILHO DA O.R.F.E.U.</div><div class="s3d-persg" id="s3dPersg" hidden></div></div>
      <div class="s3d-db" id="s3dDb" hidden></div>
      <div class="s3d-metros" id="s3dMetros" hidden><span></span><button type="button" title="Zerar a contagem" aria-label="Zerar os metros andados">↺</button></div>
      <div class="s3d-legenda" id="s3dLegenda" hidden></div>
      <div class="s3d-fps" id="s3dFps" hidden></div>
      <aside class="s3d-hab" id="s3dHab" hidden aria-label="Habilidades do personagem controlado"></aside>
      <div class="s3d-fx" id="s3dFx" aria-hidden="true"></div>
      <div class="s3d-msg" id="s3dMsg">Carregando…</div>
      <p class="s3d-dica" id="s3dDica"></p>
      <button type="button" class="s3d-prompt" id="s3dPrompt" hidden></button>
      <div class="s3d-toast" id="s3dToast" hidden></div>
      <form class="s3d-codigo" id="s3dCodigo" hidden><label>Código do teclado<input type="text" inputmode="numeric" maxlength="12" autocomplete="off"></label><button type="submit">Digitar</button><button type="button" data-cod="x">Cancelar</button></form>
      <div class="s3d-joy" id="s3dJoy" hidden aria-hidden="true"><span></span></div>
      <aside class="s3d-painel" id="s3dPainel" hidden></aside>
      <div class="s3d-opcoes" id="s3dOpcoes" hidden></div>
      <div class="s3d-mira" id="s3dMira" aria-hidden="true"></div>
      <aside class="s3d-gaveta" id="s3dGaveta" hidden aria-label="Painel">
        <header><b id="s3dGavTit">Painel</b><button type="button" class="s3d-x" data-s3dv="gaveta" aria-label="Fechar painel">✕</button></header>
        <div class="s3d-gav-corpo" id="s3dGavCorpo"><div id="s3dGavCartao"></div><div id="s3dGavPainel"></div></div>
      </aside>
      <div class="s3d-menu" id="s3dMenu" hidden><div class="s3d-menu-caixa"><header><b>Menu</b><button type="button" class="s3d-x" data-s3dv="menu" aria-label="Fechar menu">✕</button></header><div class="s3d-menu-grade" id="s3dMenuGrade"></div></div></div>
      <div class="s3d-barra">
        <button type="button" data-s3dv="jogo" title="Jogo: você é o personagem (primeira pessoa; a terceira pessoa fica nas Opções)"><i>🎮</i><span>Jogo</span></button>
        <button type="button" data-s3dv="dentro" title="Ver pelos olhos do token (WASD ou setas; Shift corre)"><i>👁</i><span>Olhos</span></button>
        <button type="button" data-s3dv="fora" class="on" title="Ver de fora, como uma maquete"><i>🏠</i><span>Fora</span></button>
        <button type="button" data-s3dv="cima" title="Vista de cima"><i>⬇</i><span>Cima</span></button>
        <button type="button" data-s3dv="lanterna" title="Lanterna (L)"><i>🔦</i><span>Luz</span></button>
        <button type="button" data-s3dv="zoom" title="Alternar entre a sala e o andar inteiro"><i>🏢</i><span>Andar</span></button>
      </div>`;
    document.body.appendChild(d);
    d.addEventListener('click', e => {
      const b = e.target.closest('[data-s3dv]'); if (!b || !V) return;
      const k = b.dataset.s3dv;
      if (k === 'fechar') fechar();
      else if (k === 'lanterna') alternarLanterna();
      else if (k === 'som') { Som.preparar(); Som.alternar(); pintarBarra(); }
      else if (k === 'menu') alternarMenu();
      else if (k === 'chat') { if (document.pointerLockElement) document.exitPointerLock(); clicar('btnChat'); }
      else if (k === 'gaveta') alternarGaveta();
      else if (k === 'zoom') alternarZoom();
      else if (k === 'painel') { const p = $('#s3dPainel'); p.hidden = !p.hidden; $('#s3dOpcoes').hidden = true; if (!p.hidden) desenharPainel(); }
      else if (k === 'opcoes') { const o = $('#s3dOpcoes'); o.hidden = !o.hidden; $('#s3dPainel').hidden = true; if (!o.hidden) desenharOpcoes(); }
      else definirModo(k);
    });
    $('#s3dPrompt', d).addEventListener('click', () => interagir());
    $('#s3dMetros button', d).addEventListener('click', () => { const A = ACF(); if (A.zerarMetros) A.zerarMetros(); hud(); toast('Contagem de metros zerada.'); });
    $('#s3dCodigo', d).addEventListener('submit', e => { e.preventDefault(); const inp = $('#s3dCodigo input'); const ci = +$('#s3dCodigo').dataset.ci; const r = ACF().porta3D(V.a, ci, 'codigo', inp.value); if (r) toast(r); $('#s3dCodigo').hidden = true; inp.value = ''; inp.blur(); });
    $('#s3dCodigo [data-cod="x"]', d).addEventListener('click', () => { $('#s3dCodigo').hidden = true; });
    ligarJoystick($('#s3dJoy', d));
    return d;
  }
  function pintarBarra() {
    if (!V) return;
    const b = $('#s3d [data-s3dv="som"]'); if (b) { b.classList.toggle('on', Som.ligado); $('i', b).textContent = Som.ligado ? '🔊' : '🔇'; }
    $('#s3d [data-s3dv="lanterna"]').classList.toggle('on', !!V.lanterna);
    const z = $('#s3d [data-s3dv="zoom"]'); $('i', z).textContent = V.cam.largo ? '🧊' : '🏢'; $('span', z).textContent = V.cam.largo ? 'Sala' : 'Andar';
  }
  let tToast = null, V_destravou = 0;
  document.addEventListener('pointerlockchange', () => { const d = $('#s3d'); const trav = !!(document.pointerLockElement && d && d.contains(document.pointerLockElement)); if (d) d.classList.toggle('s3d-travado', trav); if (!trav) V_destravou = performance.now(); });
  function toast(txt) { const t = $('#s3dToast'); if (!t) return; t.textContent = txt; t.hidden = false; clearTimeout(tToast); tToast = setTimeout(() => { t.hidden = true; }, 2600); }

  // teclado: com o 3D aberto, NENHUMA tecla chega ao mapa (ex.: "A" é o apagão do Mestre, "F" abre as fichas).
  // As teclas vêm das Opções (⚙ › Controles), com padrão de jogo; setas sempre andam, Enter abre o chat, Esc volta.
  const MOV = { frente: 'f', tras: 't', esq: 'e', dir: 'd' };
  let capturando = null;   // Opções › Controles esperando a nova tecla de uma ação
  function executarAcao(id, e) {
    const solta = () => { if (document.pointerLockElement) document.exitPointerLock(); };
    switch (id) {
      case 'interagir': if (e) e.preventDefault(); interagir(); break;
      case 'lanterna': alternarLanterna(); break;
      case 'menu': alternarMenu(); break;
      case 'camera': { const ord = V.ctrl ? (CFG.terceira ? ['jogo', 'dentro', 'fora'] : ['jogo', 'fora', 'cima']) : ['dentro', 'fora', 'cima']; const i = ord.indexOf(V.cam.modo); definirModo(ord[(i + 1) % ord.length]); break; }
      case 'zoomAndar': alternarZoom(); break;
      case 'chat': if (e) e.preventDefault(); solta(); clicar('btnChat'); break;
      case 'fichas': solta(); clicar('btnFichas'); break;
      case 'quadro': solta(); clicar('btnQuadro'); break;
      case 'dados': solta(); clicar('btnDados'); break;
      case 'arquivo': solta(); if (window.ACF_ARQUIVO) window.ACF_ARQUIVO.abrir(); break;
      case 'mochila': { solta(); const A = ACF(), mo = document.getElementById('mochila'); if (mo && !mo.hidden) A.fecharMochila(); else if (A.abrirMochila) A.abrirMochila(); break; }
      case 'narrador': { solta(); const A = ACF(); if (A.abrirNarrador) A.abrirNarrador(); break; }
      case 'painel': if (e) e.preventDefault(); alternarGaveta(); break;
      case 'opcoes': { solta(); const o = $('#s3dOpcoes'); o.hidden = !o.hidden; $('#s3dPainel').hidden = true; if (!o.hidden) desenharOpcoes(); break; }
      case 'hud': V.d.classList.toggle('s3d-sem-hud'); toast(V.d.classList.contains('s3d-sem-hud') ? `Interface escondida (${nomeTecla(teclaDe('hud'))} mostra de novo).` : 'Interface de volta.'); break;
      case 'olharTras': V.olharTras = true; break;
      default: if (/^hab\d$/.test(id)) Hab.usarN(+id.slice(3)); break;
    }
  }
  window.addEventListener('keydown', e => {
    const d = $('#s3d'); if (!V || !d || d.hidden) return;
    let k = (e.key || '').toLowerCase(); if (k === 'spacebar') k = ' ';
    if (capturando) { e.preventDefault(); e.stopImmediatePropagation(); capturando(k); return; }
    // janela do site aberta por cima do 3D (loja, fichas, arquivo, chat…): o teclado é dela
    if (sobreposta()) return;
    if (e.target && e.target.matches && e.target.matches('input, textarea, select, [contenteditable="true"]')) { if (e.key === 'Escape') e.target.blur(); return; }
    e.stopImmediatePropagation();
    if (k === 'escape') {
      e.preventDefault();
      if (document.pointerLockElement || performance.now() - V_destravou < 400) return;   // o Esc só soltou o mouse
      if (!$('#s3dMenu').hidden) { fecharMenu(); return; }
      if (!$('#s3dGaveta').hidden) { alternarGaveta(false); return; }
      if (V.d.classList.contains('s3d-sem-hud')) { V.d.classList.remove('s3d-sem-hud'); return; }
      if (!$('#s3dPainel').hidden || !$('#s3dOpcoes').hidden) { $('#s3dPainel').hidden = true; $('#s3dOpcoes').hidden = true; } else fechar();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const id = acaoDaTecla(k), mv = MOV[id] || MOV[SETAS[k]];
    if (id === 'correr') { V.correr = true; if (k === 'tab' || k === ' ') e.preventDefault(); return; }
    if (mv) { e.preventDefault(); V.teclas.add(mv); V.autoAlvo = null; return; }
    if (e.repeat) return;
    if (k === 'enter') { executarAcao('chat', e); return; }
    if (id) { if (k === 'tab' || k === ' ') e.preventDefault(); executarAcao(id, e); }
  }, true);
  window.addEventListener('keyup', e => {
    if (!V) return;
    const k = (e.key || '').toLowerCase(), id = acaoDaTecla(k), mv = MOV[id] || MOV[SETAS[k]];
    if (id === 'correr') V.correr = false;
    if (id === 'olharTras') V.olharTras = false;
    if (mv) { V.teclas.delete(mv); e.stopImmediatePropagation(); }
  }, true);
  // botões extras do mouse (meio, direito, laterais) também podem ter ações nas Opções
  function botaoMouse(e) {
    if (!V || e.button === 0) return false;
    const k = 'mouse' + e.button;
    if (capturando) { e.preventDefault(); capturando(k); return true; }
    const id = acaoDaTecla(k); if (!id) return false;
    e.preventDefault();
    const mv = MOV[id];
    if (mv) { V.teclas.add(mv); const up = () => { if (V) V.teclas.delete(mv); removeEventListener('pointerup', up); }; addEventListener('pointerup', up); }
    else if (id === 'correr') { V.correr = true; const up = () => { if (V) V.correr = false; removeEventListener('pointerup', up); }; addEventListener('pointerup', up); }
    else if (id === 'olharTras') { V.olharTras = true; const up = () => { if (V) V.olharTras = false; removeEventListener('pointerup', up); }; addEventListener('pointerup', up); }
    else executarAcao(id, e);
    return true;
  }
  window.addEventListener('blur', () => { if (V) { V.teclas.clear(); V.correr = false; } });

  function ligarJoystick(j) {
    const bola = $('span', j); let id = null;
    const mover = e => {
      const r = j.getBoundingClientRect(), raio = r.width / 2;
      let dx = (e.clientX - r.left - raio) / raio, dy = (e.clientY - r.top - raio) / raio;
      const mm = Math.hypot(dx, dy); if (mm > 1) { dx /= mm; dy /= mm; }
      bola.style.transform = `translate(${dx * raio * .55}px, ${dy * raio * .55}px)`;
      if (V) { V.joy = { x: dx, y: -dy }; V.autoAlvo = null; }
    };
    const soltar = () => { id = null; bola.style.transform = ''; if (V) V.joy = null; };
    j.addEventListener('pointerdown', e => { e.preventDefault(); id = e.pointerId; j.setPointerCapture(id); mover(e); });
    j.addEventListener('pointermove', e => { if (e.pointerId === id) mover(e); });
    j.addEventListener('pointerup', soltar); j.addEventListener('pointercancel', soltar);
  }

  function definirModo(k) {
    if (!V) return;
    const c = V.cam;
    $$('.s3d-barra [data-s3dv]').forEach(b => { if (['jogo', 'fora', 'dentro', 'cima'].includes(b.dataset.s3dv)) b.classList.toggle('on', b.dataset.s3dv === k); });
    const asp = V.camera.aspect || 1, recuo = asp < 1 ? Math.pow(1 / asp, .9) : 1;
    c.modo = k;
    const fovFP = Math.max(55, Math.min(105, (CFG.fov || 75) + (asp < 1 ? 10 : 0)));
    if (k === 'dentro') { c.fov = fovFP; if (V.ctrl == null && V.quem !== 'mestre' && V.quem !== 'aux') toast('Sem token neste andar: você só olha em volta.'); }
    else if (k === 'jogo') {
      if (V.ctrl == null) { toast(V.quem === 'jog' ? 'Sem token neste andar.' : 'Controle um token (🎛 ou toque nele) para jogar.'); return definirModo(V.quem === 'jog' ? 'fora' : 'dentro'); }
      c.fov = fovFP; c.fovJ = asp < 1 ? 80 : 64; if (c.pitch > .3 || c.pitch < -.8) c.pitch = -.14; c.dj = c.dj || (asp < 1 ? 3.6 : 3.3); c.djAt = null;
      if (c.modoAnt !== 'jogo' && c.modoAnt !== 'dentro') c.yaw = c.theta || 0;
    }
    else if (k === 'cima') { c.theta = .0001; c.phi = .05; c.r = (c.largo ? MAPA.total * .58 : SALA_M * 1.4) * recuo; }
    else { c.theta = c.theta || .62; c.phi = c.largo ? .62 : .85; c.r = (c.largo ? MAPA.total * .54 : SALA_M * 1.3) * recuo; }
    const j = $('#s3dJoy'); if (j) j.hidden = !ehToque();
    V.d.classList.toggle('s3d-andando', imersivo(k));
    V.d.classList.toggle('s3d-jogo', k === 'jogo' && !primeiraP(k));
    V.d.classList.toggle('s3d-fp', primeiraP(k));
    const bo = $('.s3d-barra [data-s3dv="dentro"]'); if (bo) bo.hidden = V.ctrl != null && !CFG.terceira;   // com token e jogo em 1ª pessoa, "Olhos" é o próprio Jogo
    c.modoAnt = k;
    if (!imersivo(k) && document.pointerLockElement) document.exitPointerLock();
    dica();
  }
  function alternarZoom() {
    if (!V) return; const c = V.cam; c.largo = !c.largo;
    if (c.largo) { c.ax = 0; c.az = 0; } else { const q = V.ctrl ? V.tok.posDe(V.ctrl) : null; const [x, z] = q || [c.px, c.pz]; c.ax = x; c.az = z; }
    if (imersivo(c.modo) && c.largo) c.modo = 'fora';
    definirModo(c.modo); pintarBarra();
  }
  function alternarLanterna() { if (!V) return; V.lanterna = !V.lanterna; pintarBarra(); }
  function dica() {
    if (!V) return;
    try { V.tok.sincronizar(); } catch (e) {}   // quem controla mudou: a vista (ex.: a do Filho) pode mudar
    const tq = ehToque(), q = V.quem, ctrl = V.ctrl != null;
    const T2 = id => nomeTecla(teclaDe(id)), wasd = [T2('frente'), T2('esq'), T2('tras'), T2('dir')].join('');
    const andar = ctrl ? (tq ? 'Círculo no canto: anda' : `${wasd}/setas: anda · ${T2('correr')} corre · ${T2('olharTras')} olha para trás`) : (q === 'jog' ? '' : (tq ? 'Círculo: câmera livre' : `${wasd}: câmera livre`));
    const tp = V.cam.modo === 'jogo' && !primeiraP(V.cam.modo);
    const olhar = imersivo(V.cam.modo) ? (tq ? 'arraste para olhar' + (tp ? ' · pinça aproxima' : '') : 'clique para travar o mouse e olhar' + (tp ? ' · roda aproxima' : '')) : (tq ? 'arraste gira · pinça aproxima' : 'arraste gira · roda aproxima');
    const toque = !imersivo(V.cam.modo) ? (ctrl ? (tq ? ' · toque no chão para ir' : ' · clique no chão para ir') : (q === 'jog' ? '' : ' · clique numa sala para ir')) : '';
    $('#s3dDica').textContent = [andar, olhar].filter(Boolean).join(' · ') + toque + (tq ? '' : ` · ${T2('interagir')} interage · ${T2('chat')} chat · ${T2('painel')} painel · ${T2('menu')} menu · ${T2('opcoes')} opções`);
  }

  /* ================= o jogo dentro do 3D: menu, painel do site e janelas por cima =================
     O 3D não copia as ferramentas do site: ele LEVA as peças de verdade para dentro da tela 3D (o painel
     lateral inteiro, o cartão da sala, os dados, os avisos) e devolve quando fecha. Assim todas as mecânicas
     de jogador, auxiliar e Mestre funcionam iguais às do mapa 2.5D, com as mesmas regras e o mesmo Firebase. */
  const levados = [];
  function levar(el, destino) {
    if (!el || !destino || el.parentNode === destino) return;
    if (!levados.some(l => l[0] === el)) levados.push([el, el.parentNode, el.nextSibling]);
    destino.appendChild(el);
  }
  function devolver(el) {
    const i = levados.findIndex(l => l[0] === el); if (i < 0) return;
    const [, pai, prox] = levados[i]; levados.splice(i, 1);
    if (prox && prox.parentNode === pai) pai.insertBefore(el, prox); else pai.appendChild(el);
  }
  function devolverTudo() { [...levados].reverse().forEach(l => devolver(l[0])); }
  const clicar = id => { const b = document.getElementById(id); if (b) { b.click(); return true; } return false; };
  const disponivel = id => { const b = document.getElementById(id); return !!b && !b.hidden && !b.closest('[hidden]'); };
  // janelas do site abertas por cima do 3D: o teclado do jogo deixa elas em paz
  const SOBRE = ['dialog[open]', '.fx-tela', '.qd-tela', '.arquivo-tela', '.mesa-janela', '.escudo', '.relatorio-tela', '.nex-tela', '.parede-tela',
    '.visao-tela', '.rr-modal', '.bz-modal', '.dil-tela', '.expo-tela', '.dest-tela', '.hall-tela', '.bau-tela', '.ab-tela', '.fx-modal', '.cf-palpite', '.cor-pop', '#painelChat', '#perfil', '#mochila', '#narrador'];
  const visivelEl = el => !!el && !el.hidden && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  function sobreposta() { for (const sel of SOBRE) for (const el of document.querySelectorAll(sel)) if (visivelEl(el) && !el.closest('#s3d')) return true; return false; }
  function salaAtualCN() {
    if (!V) return null; const c = V.cam;
    const p = salaNoPonto3D(V.a, imersivo(c.modo) || V.ctrl ? c.px : c.ax, imersivo(c.modo) || V.ctrl ? c.pz : c.az);
    return p ? 25 * (V.a - 1) + p : null;
  }
  function alternarGaveta(forca) {
    if (!V) return;
    const g = $('#s3dGaveta'), abrirG = forca ?? g.hidden;
    if (abrirG) {
      fecharMenu();
      if (document.pointerLockElement) document.exitPointerLock();
      const A = ACF(), cn = salaAtualCN();
      $('#s3dGavTit').textContent = V.quem === 'mestre' ? 'Painel do Mestre' : V.quem === 'aux' ? 'Painel do auxiliar' : 'Sua cobaia';
      levar($('#cartao'), $('#s3dGavCartao'));
      levar($('#painel'), $('#s3dGavPainel'));
      if (cn) { try { A.focarSala(cn); } catch (e) {} }
      g.hidden = false; V.d.classList.add('s3d-com-gaveta');
    } else {
      g.hidden = true; V.d.classList.remove('s3d-com-gaveta');
      devolver($('#painel')); devolver($('#cartao'));
    }
  }
  function fecharMenu() { const m = $('#s3dMenu'); if (m) m.hidden = true; }
  function alternarMenu(forca) {
    if (!V) return;
    const m = $('#s3dMenu'), abrirM = forca ?? m.hidden;
    if (!abrirM) { m.hidden = true; return; }
    if (document.pointerLockElement) document.exitPointerLock();
    const A = ACF(), q = V.quem, it = [];
    const add = (ic, t, fn, dica) => it.push({ ic, t, fn, dica });
    add('🗂', q === 'mestre' ? 'Painel do Mestre' : q === 'aux' ? 'Painel' : 'Minha cobaia', () => alternarGaveta(true), 'Tab');
    if (q === 'mestre' || q === 'aux') add('🎛', 'Controles do 3D', () => { const p = $('#s3dPainel'); p.hidden = false; $('#s3dOpcoes').hidden = true; desenharPainel(); }, 'luzes, portas, tokens');
    if (q === 'aux') add('🤖', 'Meu robô aqui', () => colocarMeuRobo(), 'coloca ou traz o seu S.T.A.F.F.');
    if (q === 'jog' && A.abrirMochila) add('🎒', 'Mochila', () => A.abrirMochila(), nomeTecla(teclaDe('mochila')));
    if (q === 'mestre' && A.abrirNarrador) add('🎭', 'Narrador', () => A.abrirNarrador(), nomeTecla(teclaDe('narrador')));
    if (disponivel('btnFichas')) add('📋', 'Fichas', () => clicar('btnFichas'), 'F');
    if (q === 'aux' && window.ACF_FICHAS) add('☠', 'Ameaças e Filhos', () => window.ACF_FICHAS.abrir('aux'));
    add('🎲', 'Dados', () => { clicar('btnDados'); }, 'R');
    if (disponivel('btnChat')) add('💬', 'Chat', () => clicar('btnChat'), 'Enter');
    if (window.ACF_ARQUIVO) add('📜', 'Arquivo · Cifras · Terminal', () => window.ACF_ARQUIVO.abrir(), nomeTecla(teclaDe('arquivo')));
    if (q === 'jog' && disponivel('btnAbrirLoja')) add('🛒', 'Loja do Maurício', () => clicar('btnAbrirLoja'));
    if (q === 'mestre') add('🛒', 'Loja (Mestre)', () => clicar('btnAbrirLojaM'));
    if (disponivel('btnQuadro')) add('🖍', 'Quadro da equipe', () => clicar('btnQuadro'), 'B');
    if (q === 'jog') add('📓', 'Caderno', () => { alternarGaveta(true); const c = $('#caderno'); if (c) { c.closest('section')?.scrollIntoView({ block: 'start' }); setTimeout(() => c.focus(), 200); } });
    [['btnRegras', '📖', 'Regras'], ['btnHall', '🏛', 'Hall da Caixa'], ['btnParede', '🧱', 'Parede de Desejos'], ['btnMinhaCor', '🎨', 'Cor da minha cobaia']].forEach(([id, ic, t]) => { if (disponivel(id)) add(ic, t, () => clicar(id)); });
    if ((q === 'mestre' || q === 'aux') && window.ACF_MESA && window.ACF_MESA.abrirEscudo) add('🛡', 'Escudo do Mestre', () => window.ACF_MESA.abrirEscudo());
    add(Som.ligado ? '🔊' : '🔇', 'Som do 3D', () => { Som.preparar(); Som.alternar(); pintarBarra(); });
    add('⚙', 'Opções do 3D', () => { const o = $('#s3dOpcoes'); o.hidden = false; $('#s3dPainel').hidden = true; desenharOpcoes(); });
    if (disponivel('btnAjuda')) add('❓', 'Ajuda', () => clicar('btnAjuda'));
    add('🚪', 'Sair do 3D', () => fechar(), 'Esc');
    $('#s3dMenuGrade').innerHTML = it.map((x, i) => `<button type="button" data-mi="${i}"><i>${x.ic}</i><span>${esc(x.t)}</span>${x.dica ? `<small>${esc(x.dica)}</small>` : ''}</button>`).join('');
    $('#s3dMenuGrade').onclick = e => { const b = e.target.closest('[data-mi]'); if (!b) return; m.hidden = true; it[+b.dataset.mi].fn(); };
    m.hidden = false;
  }
  // auxiliar: coloca (ou traz) o próprio robô S.T.A.F.F. onde a câmera está
  function colocarMeuRobo() {
    if (!V) return; const A = ACF(), c = V.cam;
    const x = imersivo(c.modo) || V.ctrl ? c.px : c.ax, z = imersivo(c.modo) || V.ctrl ? c.pz : c.az;
    let [px, pz] = V.mundo.livre3D(x, z) ? [x, z] : pontoLivre(V.mundo.livre3D, x, z);
    const q = plantaDe3D(V.a, px, pz), r = A.colocarRoboAux ? A.colocarRoboAux(V.a, q.x, q.y) : 'Atualize o site.';
    if (r) { toast(r); return; }
    toast('Robô colocado. Ele aparece para todos quando a tela do Mestre confirmar.');
    setTimeout(() => { if (V && V.quem === 'aux' && ((A.estado || {}).tokens || {})[A.aux]) { V.ctrl = A.aux; c.px = px; c.pz = pz; definirModo('jogo'); dica(); } }, 600);
  }

  /* ---------- abrir e fechar ---------- */
  function podeAbrir(cn) {
    const a = ACF(); if (!a) return false;
    if (a.mestre) return true;
    if (a.aux) return !!a.salaRevelada(cn);
    return !!a.meu && a.salaDe(a.meu) === cn;
  }
  async function abrir(cn, op = {}) {
    const a = ACF();
    if (!op.manter && !op.livre && !podeAbrir(cn)) { a.aviso(a.meu ? 'Para ver esta sala em 3D, o token da sua cobaia precisa estar nela.' : 'Esta sala não está liberada para você.'); return; }
    Som.preparar();   // precisa ser no clique (o celular só libera o som assim)
    const d = criarJanela();
    const manter = op.manter && V ? { cam: { ...V.cam }, lanterna: V.lanterna, ctrl: V.ctrlMestre, a: V.a } : null;
    if (V) fechar(true);
    d.hidden = false; document.body.classList.add('s3d-aberta');
    ['#aviso', '#suaVez', '#painelDados'].forEach(sel => levar($(sel), d));
    const msg = $('#s3dMsg'); msg.hidden = false; msg.textContent = 'Montando o andar…';
    $('#s3dBtPainel').hidden = quemSou() === 'jog';
    $('[data-s3dv="chat"]', d).hidden = !disponivel('btnChat');
    $('.s3d-x[data-s3dv="fechar"]', d).focus();
    try { await carregarThree(); await carregarExtras(); await NS().carregarModelos(); } catch (e) { msg.textContent = 'Não consegui carregar o 3D (sem internet?). Tente de novo.'; return; }
    if (d.hidden) return;
    msg.hidden = true;
    try { iniciar({ cn, a: op.a || Math.ceil(cn / 25), largo: !!op.andar, manter, ctrl: op.ctrl || null }, d); }
    catch (e) { console.error(e); msg.hidden = false; msg.textContent = 'Não consegui montar o 3D neste aparelho.'; }
  }

  function iniciar(op, d) {
    const T = window.THREE, A = ACF(), a = op.a;
    prepararMapa();
    const palco = $('.s3d-palco', d);
    const celular = Math.min(innerWidth, innerHeight) < 700 || ehToque();
    const alta = lsG('acf-s3d-qualidade', celular ? 'baixa' : 'alta') === 'alta';
    const ren = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    ren.setPixelRatio(1);
    const dpr = Math.max(.35, Math.min(devicePixelRatio || 1, alta ? 2 : 1.25) * (+CFG.escala || 1));
    const sombras = CFG.sombras === 'auto' ? alta : !!CFG.sombras;
    ren.outputEncoding = T.sRGBEncoding; ren.toneMapping = T.ACESFilmicToneMapping; ren.toneMappingExposure = 1.25;
    ren.shadowMap.enabled = sombras; ren.shadowMap.type = T.PCFSoftShadowMap;
    palco.appendChild(ren.domElement);
    const cenaT = new T.Scene();
    const descartes = [];
    const amb = new T.HemisphereLight('#bfc6d6', '#1a1410', .3); cenaT.add(amb);
    // ambiente para reflexos (metal, vidro): uma sala escura com poucas luzes
    const pmrem = new T.PMREMGenerator(ren), envC = new T.Scene();
    const envM = new T.Mesh(new T.BoxGeometry(10, 4, 10), new T.MeshBasicMaterial({ color: '#0d0c0b', side: T.BackSide })); envC.add(envM);
    [[0, 1.9, 0, '#fff1d0', 3], [3, 1, -4.9, '#ffe2b0', 1.2], [-4.9, 1.5, 2, '#c9d4ff', .8]].forEach(([x, y, z, c, k]) => { const p = new T.Mesh(new T.PlaneGeometry(2, .6), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k), side: T.DoubleSide })); p.position.set(x, y, z); p.lookAt(0, 0, 0); envC.add(p); });
    const envRT = pmrem.fromScene(envC, .04); cenaT.environment = envRT.texture;
    envM.geometry.dispose(); pmrem.dispose();

    const quem = quemSou();
    const ctx = { T, cena: cenaT, ren, amb, celular, descartes, quem, animMundo: [],
      salaJogador: () => { const tk = ((A.estado || {}).tokens || {})[A.meu]; return tk && tk.a === a ? MAPA.g.salaEm(a, tk.x, tk.y) : null; },
      zoomLargo: () => !!(V && V.cam.largo), ctrlAtual: () => (V ? V.ctrl : null) };
    const mundo = mundoAndar(ctx, a);
    const tok = camadaTokens(ctx, mundo);

    const cam = new T.PerspectiveCamera(50, 1, .05, Math.max(220, MAPA.total * 2));
    const est = { modo: 'fora', theta: .62, phi: .85, r: 13, ax: 0, az: 0, px: 0, pz: 0, yaw: 0, pitch: -.08, fov: 70, passo: 0, largo: op.largo };
    // quem é controlado: o jogador anda com o próprio token; Mestre e auxiliar começam com a câmera livre
    const meuId = quem === 'jog' ? A.meu : quem === 'aux' ? A.aux : null;
    const meuTk = () => ((A.estado || {}).tokens || {})[meuId];
    const tkOp = op.ctrl && ((A.estado || {}).tokens || {})[op.ctrl];
    const ctrlJog = tkOp && tkOp.a === a && A.podeMover(tkOp) ? op.ctrl : meuId && meuTk() && meuTk().a === a ? meuId : null;
    const [cx, cz] = mundo.centro(op.cn - 25 * (a - 1));
    if (ctrlJog) { const tk = ((A.estado || {}).tokens || {})[ctrlJog]; [est.px, est.pz] = planta3D(a, tk.x, tk.y); }
    else { [est.px, est.pz] = [cx, cz + 1.5]; }
    est.ax = op.largo ? 0 : est.px; est.az = op.largo ? 0 : est.pz;
    if (op.manter) {
      // mesmo andar: volta exatamente onde estava; outro andar: mantém só o jeito de olhar (a posição é a da sala nova)
      const c0 = { ...op.manter.cam };
      if (op.manter.a !== a) ['px', 'pz', 'ax', 'az'].forEach(k => delete c0[k]);
      Object.assign(est, c0);
    }

    // lanterna (luz que sai da câmera ou do token); no computador, faz sombra
    const lanterna = new T.SpotLight('#fff1d8', 0, 16, .48, .55, 1.4); lanterna.castShadow = sombras; lanterna.shadow.mapSize.set(1024, 1024); lanterna.shadow.bias = -.0006; lanterna.shadow.camera.near = .1;
    cenaT.add(lanterna, lanterna.target);
    // poeira no ar
    const nP = !CFG.poeira ? 1 : celular ? 140 : 320, posP = new Float32Array(nP * 3), rP = NS().rng(5);
    for (let i = 0; i < nP; i++) { posP[i * 3] = (rP() - .5) * 12; posP[i * 3 + 1] = rP() * ALT; posP[i * 3 + 2] = (rP() - .5) * 12; }
    const geoP = new T.BufferGeometry(); geoP.setAttribute('position', new T.BufferAttribute(posP, 3));
    const poeira = new T.Points(geoP, new T.PointsMaterial({ color: '#d8d0c0', size: .018, transparent: true, opacity: .35, depthWrite: false })); cenaT.add(poeira);
    descartes.push(geoP, poeira.material);

    const pos = criarPos(T, ren, alta);
    V = { op, a, ren, cena: cenaT, cam: est, camera: cam, mundo, tok, descartes, amb, lanterna: op.manter ? op.manter.lanterna : false, rodando: true, raf: 0, d,
      teclas: new Set(), correr: false, joy: null, quem, ctrl: ctrlJog, ctrlMestre: op.manter ? op.manter.ctrl : null, autoAlvo: null, pos, envRT, alta, celular,
      sig: assinatura(a), escondido: null, ultMov: 0, movendo: false, ultToast: 0 };
    if (op.ctrl && ctrlJog === op.ctrl) V.ctrlMestre = op.ctrl;
    if (V.ctrlMestre && ((A.estado || {}).tokens || {})[V.ctrlMestre]) V.ctrl = V.ctrlMestre;
    pintarBarra();

    const tamanho = () => { const w = palco.clientWidth || innerWidth, h = palco.clientHeight || innerHeight; ren.setPixelRatio(dpr); ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); pos.tamanho(w, h, dpr); };
    tamanho(); V.tamanho = tamanho; addEventListener('resize', tamanho);
    definirModo(op.manter ? (op.manter.cam.modo === 'jogo' && !V.ctrl ? 'fora' : op.manter.cam.modo) : (V.ctrl ? 'jogo' : 'fora'));
    $('#s3dCN').textContent = `${a}º ANDAR`;

    /* ---------- controles: arrastar gira/olha; pinça e roda aproximam; toque escolhe ---------- */
    const pts = new Map(); let dist0 = 0, ini0 = null;
    const el = ren.domElement; el.style.touchAction = 'none';
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && botaoMouse(e)) return;
      el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      ini0 = pts.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
      if (pts.size === 2) { const [p, q] = [...pts.values()]; dist0 = Math.hypot(p[0] - q[0], p[1] - q[1]); }
    });
    el.addEventListener('mousemove', e => { if (document.pointerLockElement === el && imersivo(est.modo)) olharDelta(e.movementX, e.movementY, .0024); });
    el.addEventListener('pointermove', e => {
      if (document.pointerLockElement === el) return;
      if (!pts.has(e.pointerId)) return;
      const [px, py] = pts.get(e.pointerId); const dx = e.clientX - px, dy = e.clientY - py; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const [p, q] = [...pts.values()]; const dd = Math.hypot(p[0] - q[0], p[1] - q[1]); if (dist0) zoom((dist0 - dd) * .02); dist0 = dd; return; }
      if (imersivo(est.modo)) olharDelta(dx, dy);
      else { est.theta -= dx * .006; est.phi = Math.max(.05, Math.min(1.45, est.phi - dy * .006)); }
    });
    const ray = new T.Raycaster(), chao = new T.Plane(new T.Vector3(0, 1, 0), 0), pt = new T.Vector3(), v2 = new T.Vector2();
    const solta = e => {
      if (ini0 && e.type === 'pointerup' && Math.hypot(e.clientX - ini0.x, e.clientY - ini0.y) < 8 && performance.now() - ini0.t < 450) {
        const travado = document.pointerLockElement === el;
        if (!travado && e.pointerType === 'mouse' && imersivo(est.modo)) { try { el.requestPointerLock(); } catch (er) {} }
        else {
          const r = el.getBoundingClientRect();
          if (travado) v2.set(0, 0); else v2.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
          ray.setFromCamera(v2, cam); tocar(ray, chao, pt, travado);
        }
      }
      ini0 = null; pts.delete(e.pointerId); if (pts.size < 2) dist0 = 0;
    };
    el.addEventListener('pointerup', solta); el.addEventListener('pointercancel', solta);
    el.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY * .01); }, { passive: false });
    function zoom(k) { if (primeiraP(est.modo)) est.fov = Math.max(35, Math.min(100, est.fov + k * 8)); else if (est.modo === 'jogo') est.dj = Math.max(1.2, Math.min(7, (est.dj || 3.2) * (1 + k * .12))); else est.r = Math.max(3, Math.min(MAPA.total * 1.2, est.r * (1 + k * .12))); }
    function olharDelta(dx, dy, k = .005) {
      k *= CFG.sens || 1; const tp = !primeiraP(est.modo);
      est.yaw -= dx * k; est.pitch = Math.max(tp ? -1.05 : -1.25, Math.min(tp ? .55 : 1.25, est.pitch - dy * k * (CFG.invY ? -1 : 1)));
    }

    /* ---------- andar: o token anda pelas regras do mapa (paredes, portas, vez e metros) ---------- */
    const L3 = (x, z) => mundo.livre3D(x, z);
    function mover(dt) {
      let f = 0, s = 0;
      if (V.teclas.has('f')) f += 1; if (V.teclas.has('t')) f -= 1; if (V.teclas.has('d')) s += 1; if (V.teclas.has('e')) s -= 1;
      let corre = V.correr;
      if (V.joy) { f += V.joy.y; s += V.joy.x; if (Math.hypot(V.joy.x, V.joy.y) > .92) corre = true; }
      const ang = imersivo(est.modo) ? est.yaw : est.theta, sy = Math.sin(ang), cyw = Math.cos(ang);
      let dx = 0, dz = 0;
      const m = Math.hypot(f, s);
      if (m > .05) { const k = m > 1 ? 1 / m : 1; dx = (-sy * f + cyw * s) * k; dz = (-cyw * f - sy * s) * k; }
      else if (V.autoAlvo) { const ax = V.autoAlvo[0] - est.px, az = V.autoAlvo[1] - est.pz, dd = Math.hypot(ax, az); if (dd < .12) V.autoAlvo = null; else { dx = ax / dd; dz = az / dd; } }
      if (!dx && !dz) return false;
      const ctrl = V.ctrl, livre = !ctrl;
      const vel = (livre ? (corre ? 8 : 4) : (corre ? 4 : 2)) * dt;
      if (livre) { est.px += dx * vel; est.pz += dz * vel; if (!imersivo(est.modo)) { est.ax = est.px; est.az = est.pz; } return true; }
      // campo em volta da figura (campo_infinito): a parte do passo que vai em direção a ela encolhe sem nunca chegar;
      // perto demais, o token fica preso e só se afasta passando num teste (Vontade, por padrão)
      const cp = campoPerto(est.px, est.pz);
      if (cp) {
        const rx = est.px - cp.x, rz = est.pz - cp.z, d = Math.hypot(rx, rz) || .001, ux = rx / d, uz = rz / d;
        let sx = dx * vel, sz = dz * vel; const rad = sx * ux + sz * uz, tx = sx - rad * ux, tz = sz - rad * uz;
        const preso = V.preso && V.preso.cn === cp.cn && !V.preso.livre;
        let nr = rad;
        if (rad < 0) { const k = Math.pow(Math.max(0, (d - cp.r0) / (cp.ext - cp.r0)), 1.6); nr = rad * k; if (d + nr < cp.r0 + .03) nr = Math.min(0, cp.r0 + .03 - d); if (k < .5) avisar('O ar fica pesado. Por mais que você ande, a figura não chega mais perto.'); }
        else if (preso && rad > 0) { nr = 0; tentarSoltar(cp); }
        const k2 = preso ? .35 : 1;
        sx = tx * k2 + nr * ux; sz = tz * k2 + nr * uz;
        const m2 = Math.hypot(sx, sz); if (m2 < 1e-5) return false;
        dx = sx / m2; dz = sz / m2; vel2 = m2;
        if (d < cp.r1 && !(V.preso && V.preso.cn === cp.cn)) { V.preso = { cn: cp.cn, livre: false, ult: 0 }; toast(`Você chegou perto demais. Algo te segura aqui: para se afastar, ${PER_NOME[cp.per] || cp.per} (DT ${cp.dt}).`); V.choque = 1.2; }
        if (V.preso && V.preso.cn === cp.cn && V.preso.livre && d > cp.r1 + .6) V.preso = null;
      } else if (V.preso) V.preso = null;
      const passo = vel2 != null ? vel2 : vel; vel2 = null;
      const tk = ((A.estado || {}).tokens || {})[ctrl];
      if (!tk) return false;
      if (tk.esq || V.escondido) { avisar('Você está escondido. Aperte E para sair.'); return false; }
      // começou em cima de um móvel (o token foi posto ali pelo mapa 2D): sai para o ponto livre mais perto
      if (!L3(est.px, est.pz)) [est.px, est.pz] = pontoLivre(L3, est.px, est.pz);
      // 'parede' = bateu (tenta deslizar); 'regra' = a regra do mapa não deixa (vez, metros…)
      const tenta = (nx, nz) => {
        if (!L3(nx, nz)) return 'parede';
        for (const [id, o] of tok.mapa) { if (id === ctrl || !o.t.g.visible && id !== ctrl) continue; const dn = Math.hypot(o.x - nx, o.z - nz); if (dn < .5 && dn < Math.hypot(o.x - est.px, o.z - est.pz)) return 'parede'; }
        const q = plantaDe3D(a, nx, nz), r = A.moverToken3D(ctrl, q.x, q.y, false);
        if (r.ok) return { r, nx, nz };
        if (r.parede) return 'parede';
        V.autoAlvo = null; avisar(r.motivo || 'Não dá para andar agora.');
        return 'regra';
      };
      let res = tenta(est.px + dx * passo, est.pz + dz * passo);
      if (res === 'parede') { res = tenta(est.px + dx * passo, est.pz); if (res === 'parede') res = tenta(est.px, est.pz + dz * passo); }
      if (typeof res === 'string') { if (res === 'parede' && V.autoAlvo) V.autoAlvo = null; return false; }
      if (res.r.esgotou) { [est.px, est.pz] = planta3D(a, res.r.x, res.r.y); avisar(`Deslocamento esgotado (${res.r.lim} m).`); V.autoAlvo = null; }
      else { est.px = res.nx; est.pz = res.nz; }
      V.movendo = true; V.ultMov = performance.now();
      est.passo += vel * 3;
      if (Math.floor(est.passo / Math.PI) !== Math.floor((est.passo - vel * 3) / Math.PI)) Som.passo(corre);
      return true;
    }
    function avisar(txt) { const agora = performance.now(); if (agora - V.ultToast > 1800) { V.ultToast = agora; toast(txt); } }
    let vel2 = null;
    const PER_NOME = { vontade: 'teste de Vontade', fortitude: 'teste de Fortitude', atletismo: 'teste de Atletismo', reflexos: 'teste de Reflexos', ocultismo: 'teste de Ocultismo' };
    function campoPerto(x, z) { let melhor = null, bd = 1e9; for (const c of mundo.campos) { const d = Math.hypot(x - c.x, z - c.z); if (d < c.ext && d < bd) { bd = d; melhor = c; } } return melhor; }
    // preso perto da figura: cada tentativa de se afastar (no máximo uma a cada 2,5 s) é um teste; a rolagem vai só ao Mestre
    function tentarSoltar(cp) {
      const agora = performance.now(); if (agora - (V.preso.ult || 0) < 2500) return; V.preso.ult = agora;
      const FX = window.ACF_FICHAS; if (!FX) return;
      const tk = ((A.estado || {}).tokens || {})[V.ctrl], nome = tk ? A.rotulo(tk) : '';
      const t = (quem === 'jog' && FX.testarAtiva ? FX.testarAtiva(cp.per) : null) || FX.rolarTeste(1, 0);
      const ok = t.total >= cp.dt;
      (A.postarRolagemSecreta || A.postarRolagem)(`${nome} tentou se afastar da figura (CN ${pad2(cp.cn)}): ${PER_NOME[cp.per] || cp.per} ${t.total} [${t.dados.join(', ')}] contra DT ${cp.dt} · ${ok ? 'conseguiu' : 'continua preso'}`);
      if (ok) { V.preso.livre = true; toast(`Você conseguiu (${t.total} contra DT ${cp.dt}). Afaste-se agora.`); }
      else { toast(`Falhou (${t.total} contra DT ${cp.dt}). A força te puxa de volta. Tente de novo.`); V.choque = .8; }
    }
    // parou de andar: manda a posição final (fecha o movimento no Diário e no "Desfazer")
    function talvezFechar() {
      if (!V.movendo || !V.ctrl || performance.now() - V.ultMov < 180) return;
      V.movendo = false;
      const q = plantaDe3D(a, est.px, est.pz); A.moverToken3D(V.ctrl, q.x, q.y, true);
    }
    V.mover = mover;

    /* ---------- tocar/clicar: token, porta, esconderijo ou chão ---------- */
    function tocar(ray, plano, ptv, mira) {
      const alvos = [...tok.objetos(), ...mundo.raiz.children];
      const hits = ray.intersectObjects(alvos, true);
      // o raio do Three.js não liga para o que está escondido: pula paredes ocultas, véus e tetos
      const visivel = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
      for (const h of hits) {
        const o = h.object;
        if (!visivel(o) && o.userData.porta === undefined) continue;
        if (o.userData.token) { escolherToken(o.userData.token); return; }
        if (o.userData.porta !== undefined && o.userData.porta >= 0) { usarPorta(o.userData.porta, true); return; }
        let p = o; while (p && !p.userData.esc && p.parent) p = p.parent;
        if (p && p.userData.esc) { const e = mundo.interativos.find(x => x.obj === p); if (e) { usarEsconderijo(e); return; } }
        let u = o; while (u && !u.userData.uso && u.parent) u = u.parent;
        if (u && u.userData.uso) { const e = mundo.interativos.find(x => x.obj === u); if (e && Math.hypot(e.pos.x - est.px, e.pos.z - est.pz) < 3.2) { usar(e); return; } }
        break;
      }
      if (mira) { interagir(); return; }
      if (!ray.ray.intersectPlane(plano, ptv)) return;
      if (V.ctrl) { V.autoAlvo = [ptv.x, ptv.z]; return; }
      if (quem !== 'jog') { const p = salaNoPonto3D(a, ptv.x, ptv.z); const [x, z] = p ? mundo.centro(p) : [ptv.x, ptv.z]; est.px = x; est.pz = z; est.ax = x; est.az = z; }
    }
    function escolherToken(id) {
      const tk = ((A.estado || {}).tokens || {})[id];
      if (quem === 'jog') { if (tk) toast(A.rotulo(tk)); return; }
      tok.selecionado = id; V.sel = id;
      const p = $('#s3dPainel'); p.hidden = false; $('#s3dOpcoes').hidden = true; desenharPainel();
    }
    function usarPorta(ci, clique) {
      const e = mundo.estadoPorta(ci);
      if (quem === 'mestre') { const r = A.porta3D(a, ci, e === 'a' ? 'fechar' : 'abrir'); if (r) toast(r); else toast(e === 'a' ? 'Porta fechada.' : 'Porta aberta (ou o que estava atrás dela apareceu).'); return; }
      if (e === 'tk') { const f = $('#s3dCodigo'); f.dataset.ci = ci; f.hidden = false; $('input', f).focus(); return; }
      const r = A.porta3D(a, ci, 'abrir'); toast(r || 'Você apertou o botão vermelho.');
    }
    function usarEsconderijo(e) {
      if (!V.ctrl) { toast(quem === 'jog' ? 'Você não tem token neste andar.' : 'Controle um token para usar o esconderijo.'); return; }
      const tk = ((A.estado || {}).tokens || {})[V.ctrl]; if (!tk) return;
      if (tk.esq) { sairEsconderijo(); return; }
      if (Math.hypot(e.pos.x - est.px, e.pos.z - est.pz) > 1.9) { toast('Chegue mais perto para se esconder.'); return; }
      const q = plantaDe3D(a, e.pos.x, e.pos.z), r = A.moverToken3D(V.ctrl, q.x, q.y, true);
      if (!r.ok) { toast(r.motivo || 'Não dá para chegar lá agora.'); return; }
      // regra do livro (Sobrevivendo ao Horror, Furtividade): esconder-se é um teste de Furtividade DT 15;
      // passou, a visibilidade cai 1. A rolagem vai só para o Mestre (Sussurro), para não entregar o esconderijo.
      // O resultado fica no token (eo): os robôs S.T.A.F.F. veem todo mundo; um Filho na sala só vê quem falhou.
      const FX = window.ACF_FICHAS, t = quem !== 'mestre' && FX && FX.testarAtiva ? FX.testarAtiva('furtividade') : null;
      A.esconderToken(V.ctrl, `c${e.cn}:${e.i}`, t ? (t.total >= 15 ? 1 : 0) : undefined);
      V.escondido = { ...e, volta: [est.px, est.pz] }; est.px = e.pos.x; est.pz = e.pos.z;
      if (t) { const ok = t.total >= 15; (A.postarRolagemSecreta || A.postarRolagem)(`escondeu-se (${e.nome}): Furtividade ${t.total} [${t.dados.join(', ')}] contra DT 15 · ${ok ? 'passou: visibilidade −1' : 'falhou: visibilidade igual'}`); toast(`Escondido: ${e.nome}. Furtividade ${t.total} (DT 15): ${ok ? 'passou' : 'falhou'}. E para sair.`); }
      else toast(`Escondido: ${e.nome}. Ninguém vê o seu token.${quem === 'mestre' ? '' : ' Sem ficha ativa: role Furtividade (DT 15) se o Mestre pedir.'} E para sair.`);
      if (!primeiraP(est.modo)) definirModo(V.ctrl ? 'jogo' : 'dentro');
    }
    function sairEsconderijo() {
      const e = V.escondido, tk = ((A.estado || {}).tokens || {})[V.ctrl];
      A.esconderToken(V.ctrl, null);
      const [vx, vz] = e && e.volta ? pontoLivre(L3, e.volta[0], e.volta[1]) : pontoLivre(L3, est.px, est.pz);
      const q = plantaDe3D(a, vx, vz); A.moverToken3D(V.ctrl, q.x, q.y, true);
      est.px = vx; est.pz = vz; V.escondido = null; toast('Você saiu do esconderijo.');
    }
    V.usarPorta = usarPorta; V.usarEsconderijo = usarEsconderijo; V.sairEsconderijo = sairEsconderijo;

    /* ---------- o que está perto (para o "E" e o botão na tela) ---------- */
    function pertoDe() {
      const tk = V.ctrl && ((A.estado || {}).tokens || {})[V.ctrl];
      if (tk && tk.esq) return { tipo: 'sair', txt: '✋ Sair do esconderijo' };
      let melhor = null, bd = 1.7;
      mundo.interativos.forEach(it => {
        if (it.tipo === 'item' && !(it.obj && it.obj.visible)) return;
        if (it.tipo === 'int' && !NS().inter.rotulo(it, { quem, ctrl: V.ctrl })) return;
        const d = it.tipo === 'int' ? NS().inter.distancia(it, est.px, est.pz) + .25 : Math.hypot(it.pos.x - est.px, it.pos.z - est.pz) - (it.sala ? 1.4 : 0);
        if (d < bd) { bd = d; melhor = it; }
      });
      // no corredor da saída (ou na sala da saída sem corredor), o elevador fica à mão mesmo de longe
      if (!melhor && tk && tk.a === a) {
        const rs = MAPA.g.retSaida(a), sd = MAPA.g.saidaDoAndar(a);
        const naSaida = rs ? dentroR(rs, tk.x, tk.y) : (sd && MAPA.g.salaEm(a, tk.x, tk.y) === sd.p);
        if (naSaida) melhor = mundo.interativos.find(it => it.tipo === 'elevador') || null;
      }
      if (!melhor) return null;
      if (melhor.tipo === 'elevador') return quem === 'mestre' ? { ...melhor, txt: '🛗 Saída do andar: levar tokens' } : V.ctrl ? { ...melhor, txt: '🛗 Usar a saída do andar (pede ao Mestre)' } : null;
      if (melhor.tipo === 'item') return V.ctrl || quem === 'mestre' ? { ...melhor, txt: `🎒 Pegar: ${melhor.nome}` } : null;
      if (melhor.tipo === 'int') { const txt = NS().inter.rotulo(melhor, { quem, ctrl: V.ctrl }); return txt ? { ...melhor, it: melhor, txt } : null; }
      if (melhor.tipo === 'doc') return { ...melhor, txt: melhor.arq === 'cifras' ? `◈ Ver a inscrição: ${melhor.tit}` : `📄 Ler: ${melhor.tit}` };
      if (melhor.tipo === 'esconderijo') return V.ctrl ? { ...melhor, txt: `✋ Esconder-se (${melhor.nome})` } : null;
      if (melhor.tipo === 'uso') return { ...melhor, txt: { loja: '🃏 Falar com o Maurício (loja)', agua: '💧 Pegar água (despensa)', comida: '🥫 Pegar comida (despensa)', arquivo: '📜 Ler o Arquivo (documentos e cifras)', terminal: '⌨ Usar o Terminal O.R.F.E.U.' }[melhor.uso] || '✋ Usar' };
      const e = mundo.estadoPorta(melhor.ci);
      const txt = quem === 'mestre' ? (e === 'a' ? '🚪 Fechar a porta' : '🚪 Abrir a porta') : e === 'a' ? null : e === 'tk' ? '🔢 Digitar o código' : e === 'f' ? '🔴 Apertar o botão da porta' : null;
      return txt ? { ...melhor, txt } : null;
    }
    V.pertoDe = pertoDe;

    /* ---------- laço de desenho ---------- */
    let t0 = performance.now(), tt = 0, tHud = 0, ultRot, ultPrompt = '', fpsN = 0, fpsT = performance.now();
    const alvo = new T.Vector3(est.ax, 1, est.az), dir = new T.Vector3();
    const quadro = agora => {
      if (!V || !V.rodando) return;
      V.raf = requestAnimationFrame(quadro);
      if (!(agora > 0)) agora = performance.now();
      if (CFG.fps > 0 && agora - t0 < 1000 / CFG.fps - 2) return;   // limite de quadros (Opções)
      if (CFG.verFps) { fpsN++; if (agora - fpsT > 1000) { const f = $('#s3dFps'); if (f) { f.hidden = false; f.textContent = Math.round(fpsN * 1000 / (agora - fpsT)) + ' fps'; } fpsN = 0; fpsT = agora; } }
      const dt = Math.max(0, Math.min(.05, (agora - t0) / 1000)) || 0; t0 = agora; tt += dt;
      const andou = mover(dt); if (!andou) talvezFechar();
      // token controlado: se o Mestre (ou o mapa 2D) o mover, a câmera vai junto
      if (V.ctrl && !V.movendo && !V.escondido) {
        const tk = ((A.estado || {}).tokens || {})[V.ctrl];
        if (tk && tk.a === a) {
          // token parado em cima de um móvel (posto pelo mapa 2D): a câmera fica no ponto livre mais perto
          const ch = tk.x + ',' + tk.y;
          if (V.livreCache?.ch !== ch) { const [tx, tz] = planta3D(a, tk.x, tk.y); V.livreCache = { ch, p: L3(tx, tz) ? [tx, tz] : pontoLivre(L3, tx, tz) }; }
          const [fx, fz] = V.livreCache.p;
          if (Math.hypot(fx - est.px, fz - est.pz) > .35) { est.px = fx; est.pz = fz; }
        }
      }
      if (V.ctrl && !imersivo(est.modo) && !est.largo) { est.ax += (est.px - est.ax) * Math.min(1, dt * 4); est.az += (est.pz - est.az) * Math.min(1, dt * 4); }
      const olhoY = V.escondido ? (/cama/i.test(V.escondido.nome) ? .32 : 1.5) : 1.6;
      if (primeiraP(est.modo)) {
        // primeira pessoa: balanço dos passos, respiração parada e "olhar para trás" (Q)
        cam.fov += (est.fov - cam.fov) * .2;
        const bal = CFG.balanco ? 1 : 0, corre = V.correr || (V.joy && Math.hypot(V.joy.x, V.joy.y) > .92);
        est.resp = (est.resp || 0) + dt;
        const y = olhoY + (andou ? Math.sin(est.passo) * (corre ? .05 : .03) * bal : Math.sin(est.resp * 1.7) * .008 * bal);
        const lado = andou ? Math.cos(est.passo * .5) * (corre ? .035 : .018) * bal : 0;
        const yaw = est.yaw + (V.olharTras ? Math.PI : 0);
        cam.position.set(est.px + Math.cos(yaw) * lado, y, est.pz - Math.sin(yaw) * lado);
        cam.lookAt(cam.position.x - Math.sin(yaw) * Math.cos(est.pitch), y + Math.sin(est.pitch), cam.position.z - Math.cos(yaw) * Math.cos(est.pitch));
        if (andou && bal) cam.rotateZ(Math.sin(est.passo * .5) * (corre ? .012 : .006));
        alvo.set(est.px, 1, est.pz); if (V.ctrl) { est.ax = est.px; est.az = est.pz; }
      } else if (est.modo === 'jogo') {
        // terceira pessoa, como num jogo: a câmera fica atrás e um pouco ao lado do token e nunca atravessa parede
        cam.fov += ((est.fovJ || 66) - cam.fov) * .2;
        const L = [-Math.sin(est.yaw) * Math.cos(est.pitch), Math.sin(est.pitch), -Math.cos(est.yaw) * Math.cos(est.pitch)];
        const dir2 = [Math.cos(est.yaw), -Math.sin(est.yaw)], ombro = V.celular ? .25 : .38;
        const retrato = innerWidth < innerHeight, ty = (retrato ? 1.68 : 1.5) + (andou ? Math.sin(est.passo) * .015 : 0), tx = est.px + dir2[0] * ombro, tz = est.pz + dir2[1] * ombro;
        const quer = est.dj || 3.2; let ok = quer;
        for (let i = 1; i <= 24; i++) { const k = quer * i / 24, cx = tx - L[0] * k, cz = tz - L[2] * k, cyy = ty - L[1] * k; if (!mundo.area3D(cx, cz, .16) || cyy > ALT - .18 || cyy < .25) { ok = Math.max(.35, quer * (i - 1) / 24); break; } }
        est.djAt = est.djAt == null ? ok : (ok < est.djAt ? ok : est.djAt + (ok - est.djAt) * Math.min(1, dt * 3));
        const d = est.djAt;
        cam.position.set(tx - L[0] * d, ty - L[1] * d, tz - L[2] * d);
        cam.lookAt(tx + L[0] * 3, ty + L[1] * 3 + (retrato ? .22 : .1), tz + L[2] * 3);   // mira um pouco acima: o token fica no terço de baixo da tela
        alvo.set(est.px, 1, est.pz); est.ax = est.px; est.az = est.pz;
      } else {
        cam.fov += (50 - cam.fov) * .2;
        alvo.x += (est.ax - alvo.x) * .15; alvo.z += (est.az - alvo.z) * .15; alvo.y = 1;
        cam.position.set(alvo.x + est.r * Math.sin(est.phi) * Math.sin(est.theta), alvo.y + est.r * Math.cos(est.phi), alvo.z + est.r * Math.sin(est.phi) * Math.cos(est.theta));
        cam.lookAt(alvo);
      }
      cam.updateProjectionMatrix();
      const foco = imersivo(est.modo) || V.ctrl ? [est.px, est.pz] : [alvo.x, alvo.z];
      mundo.atualizar(dt, tt, foco[0], foco[1], est.modo, cam.position);
      if (NS().inter) { NS().inter.ouvinte = [cam.position.x, cam.position.z]; V.qVideo = (V.qVideo || 0) + 1; if (V.qVideo % 2 === 0) { try { NS().inter.videoQuadro(T, cam, ren.domElement, mundo.interativos, salaNoPonto3D(V.a, cam.position.x, cam.position.z), cam.position.x, cam.position.z); } catch (e) {} } }
      tok.atualizar(dt, tt, V.ctrl, V.ctrl ? [est.px, est.pz] : null, est.modo, cam.position, est.yaw);
      // lanterna: sai dos olhos (dentro) ou do token (fora)
      if (V.lanterna) {
        cam.getWorldDirection(dir);
        if (imersivo(est.modo) || !V.ctrl) { lanterna.position.copy(cam.position); lanterna.target.position.copy(cam.position).add(dir); }
        else { const rot = (V.tok.mapa.get(V.ctrl) || {}).rot || 0; lanterna.position.set(est.px, 1.5, est.pz); lanterna.target.position.set(est.px + Math.sin(rot) * 3, .6, est.pz + Math.cos(rot) * 3); }
        lanterna.intensity = 2.4;
      } else lanterna.intensity = 0;
      // poeira acompanha a câmera
      const cp = imersivo(est.modo) ? cam.position : alvo;
      if (Math.hypot(poeira.position.x - cp.x, poeira.position.z - cp.z) > 4) poeira.position.set(cp.x, 0, cp.z);
      poeira.rotation.y += dt * .01;
      // efeitos de tela: Protocolo deixa tudo vermelho; apagão escurece
      pos.final.uniforms.uVermelho.value += ((A.protocolo ? .35 + .25 * Math.max(0, Math.sin(tt * 4)) : 0) - pos.final.uniforms.uVermelho.value) * .1;
      pos.final.uniforms.uEscuro.value += ((A.apagao ? .25 : 0) - pos.final.uniforms.uEscuro.value) * .05;
      Efeitos.tick(dt);
      if (V.tremor > 0) { V.tremor = Math.max(0, V.tremor - dt); cam.position.x += (Math.random() - .5) * V.tremor * .12; cam.position.y += (Math.random() - .5) * V.tremor * .08; }
      if (V.choque > 0) { V.choque = Math.max(0, V.choque - dt); pos.final.uniforms.uAberr.value = .006 + V.choque * .03; } else if (V.choque === 0) { V.choque = -1; pos.aplicar(); }
      pos.render(cenaT, cam, tt);
      posicionarBaloes();
      // HUD algumas vezes por segundo
      tHud -= dt;
      if (tHud <= 0) {
        tHud = .25;
        const p = salaNoPonto3D(a, foco[0], foco[1]), cn = p ? 25 * (a - 1) + p : null;
        if (cn !== ultRot) {
          ultRot = cn;
          const vis = cn && (quem !== 'jog' || p === ctx.salaJogador());
          $('#s3dCN').textContent = cn ? (vis ? `CN ${pad2(cn)}` : '???') : `${a}º ANDAR`;
          $('#s3dNome').textContent = cn ? (vis ? (A.nomeSala(cn) || '').replace(/^CN \d+\s*·?\s*/, '') : 'Sala que você não vê') : 'Corredor';
          if (!$('#s3dPainel').hidden) desenharPainel();
        }
        const pr = pertoDe(), txt = pr ? pr.txt : '';
        if (txt !== ultPrompt) { ultPrompt = txt; const b = $('#s3dPrompt'); b.hidden = !txt; b.textContent = txt + (txt && !ehToque() ? '  (E)' : ''); }
        $('#s3dFresta').hidden = !(V.escondido && /arm|guarda|traje|cabine/i.test(V.escondido.nome) && primeiraP(est.modo));
        hud(); Hab.atualizar();
        Som.atualizar(mundo.sons(foco[0], foco[1]));
      }
      Som.tick();
    };
    alvo.set(est.ax, 1, est.az);
    V.raf = requestAnimationFrame(quadro);
    V.retomar = () => { if (V && !V.rodando) { V.rodando = true; t0 = performance.now(); V.raf = requestAnimationFrame(quadro); } };
  }

  /* ---------- HUD: decibelímetro, perseguição, Protocolo ---------- */
  function hud() {
    if (!V) return;
    const A = ACF(), q = V.quem;
    // decibelímetro: jogador vê a própria sala; Mestre vê o token escolhido ou a sala mais barulhenta
    let r = null, rot = '';
    if (q === 'jog' && A.meu) { r = A.ruidoDe(A.meu); rot = 'Sua sala'; }
    else if (q === 'mestre') { const id = V.ctrl || V.sel; if (id) { r = A.ruidoDe(id); rot = 'Sala do token'; } else { r = A.ruidoPior(); rot = r ? r.onde : ''; } }
    else if (q === 'aux' && A.aux) { r = A.ruidoDe(A.aux); rot = 'Sala do seu robô'; }
    const db = $('#s3dDb');
    if (r) {
      let barras = ''; for (let i = 5; i >= 1; i--) barras += `<i class="${i <= r.n ? 'on n' + i : ''}"></i>`;
      db.innerHTML = `<b>DECIBELÍMETRO</b><div class="s3d-db-col">${barras}</div><span>${esc(r.nome)}${r.db ? ` · ${r.db} dB` : ''}</span><small>${esc(rot)}</small>`;
      db.hidden = false; db.classList.toggle('alerta', r.n >= 4);
    } else db.hidden = true;
    $('#s3dProt').hidden = !A.protocolo;
    // metros andados pelo seu token (mapa 2D e 3D), contados neste aparelho
    const mt = $('#s3dMetros');
    if (q !== 'mestre' && A.metros && (A.meu || A.aux)) { mt.style.top = db.hidden ? '' : (db.offsetTop + db.offsetHeight + 6) + 'px'; $('span', mt).textContent = `🚶 ${A.fmtM(A.metros())} m`; mt.title = 'Metros que o seu token andou (mapa 2D e 3D, contados neste aparelho)'; mt.hidden = false; } else mt.hidden = true;
    const pg = $('#s3dPersg'), estP = (A.estado || {}).persg;
    if (estP && estP.on) {
      const vez = A.vez, tkv = vez && ((A.estado || {}).tokens || {})[vez];
      const minha = V.ctrl && vez === V.ctrl, part = V.ctrl && A.participa(V.ctrl);
      const tkc = V.ctrl && ((A.estado || {}).tokens || {})[V.ctrl], lim = V.ctrl ? A.limiteDe(V.ctrl) : null;
      pg.innerHTML = `PERSEGUIÇÃO · Vez de ${esc(tkv ? (A.visivelPara(tkv) ? A.rotulo(tkv) : '???') : '—')}${part ? (minha ? ` · <b>Sua vez: ${fmtM((tkc && tkc.m) || 0)} / ${lim || '?'} m</b>` : ' · aguarde a sua vez') : ''}`;
      pg.hidden = false; pg.classList.toggle('minha', !!minha);
    } else pg.hidden = true;
  }

  /* ---------- chat no 3D: balão em cima da cabeça, voz de cada personagem e legenda do Mestre ----------
     O texto é o mesmo do chat Geral. C2P0 e Mostarda: o balão mostra os bips/grunhidos para quem não
     conjurou Compreensão Paranormal; Mestre e auxiliares leem o original (mesma regra do chat). */
  const Baloes = { vistos: null, lista: [], tLeg: 0 };
  const idFala = m => `${m.a || ''}_${m.ts}`;
  document.addEventListener('acf-chat-geral', e => {
    const msgs = Object.values(e.detail || {}).filter(Boolean);
    if (!Baloes.vistos) { Baloes.vistos = new Set(msgs.map(idFala)); return; }
    const novas = msgs.filter(m => !Baloes.vistos.has(idFala(m))).sort((x, y) => x.ts - y.ts);
    novas.forEach(m => Baloes.vistos.add(idFala(m)));
    if (!V) return;
    novas.forEach(m => { if (Date.now() - (+m.ts || 0) < 60000) { try { mostrarFala(m); } catch (er) { console.warn('3D fala:', er); } } });
  });
  function tirarBalao(b) { b.el.remove(); const i = Baloes.lista.indexOf(b); if (i >= 0) Baloes.lista.splice(i, 1); }
  function mostrarFala(m) {
    const A = ACF(), t = A.textoChat ? A.textoChat(m) : { txt: m.t };
    let txt = String(t.txt || '').trim(); if (!txt) return;
    if (m.a === '_mestre') { legenda('Mestre', txt); return; }
    const o = V.tok.mapa.get(m.a), tk = ((A.estado || {}).tokens || {})[m.a];
    if (!o || !tk) return;                                   // fora da vista: nem balão nem voz
    if (txt.length > 150) txt = txt.slice(0, 147) + '…';
    Baloes.lista.filter(b => b.id === m.a).forEach(tirarBalao);
    const el = document.createElement('div'); if (!CFG.baloes) el.style.display = 'none';
    el.className = 's3d-balao' + (t.cifrado ? ' cifrado ' + (t.cls || '') : '') + (m.d ? ' dado' : '');
    const trad = t.trad ? String(t.trad).trim() : '';
    el.innerHTML = `<b>${esc(A.rotulo(tk))}${t.lingua ? ` · ${esc(t.nome || 'língua desconhecida')}` : ''}</b><span>${esc(txt)}</span>` +
      (t.lingua ? (trad ? `<i class="s3d-trad">✦ ${esc(trad.length > 150 ? trad.slice(0, 147) + '…' : trad)}</i>` : '<i class="s3d-trad nao">Incompreensível. Só com Compreensão Paranormal.</i>') : '');
    V.d.appendChild(el);
    Baloes.lista.push({ id: m.a, el, fim: performance.now() + Math.min(13000, 3800 + txt.length * 65) * (window.__acfLento || 1) });
    // voz: C2P0 e Mostarda já falam pela regra do chat (app.js); os outros, com a voz escolhida
    if (!t.lingua && !m.d && window.ACF_VOZES) {
      const s = A.SER[tk.s], voz = window.ACF_VOZES.vozDe(m.a, tk, s && s.tipo);
      const cp = V.camera.position, d = Math.hypot(o.x - cp.x, o.z - cp.z);
      const dur = window.ACF_VOZES.falar(voz, txt, { vol: Math.max(.18, 1 - d / (SALA_M * 2.4)) * (CFG.volVoz ?? 1), pan: panDe(o) });
      if (dur) { el.classList.add('falando'); setTimeout(() => el.classList.remove('falando'), dur * 1000); }
    }
  }
  const vTmp = { x: 0, y: 0, z: 0 };
  function panDe(o) { if (!V || !window.THREE) return 0; const v = new window.THREE.Vector3(o.x, 1.5, o.z).project(V.camera); return Math.max(-.8, Math.min(.8, v.x * .8)); }
  function legenda(quem, txt) {
    const l = $('#s3dLegenda'); if (!l) return;
    l.innerHTML = `<b>${esc(quem)}:</b> ${esc(txt.length > 260 ? txt.slice(0, 257) + '…' : txt)}`; l.hidden = false;
    clearTimeout(Baloes.tLeg); Baloes.tLeg = setTimeout(() => { l.hidden = true; }, Math.min(14000, 4500 + txt.length * 60));
  }
  // a cada quadro: o balão segue a cabeça do token na tela
  function posicionarBaloes() {
    if (!Baloes.lista.length || !V) return;
    const T = window.THREE, agora = performance.now(), w = V.d.clientWidth, h = V.d.clientHeight, v = new T.Vector3();
    [...Baloes.lista].forEach(b => {
      const o = V.tok.mapa.get(b.id);
      if (!o || agora > b.fim) { tirarBalao(b); return; }
      const proprio = b.id === V.ctrl && primeiraP(V.cam.modo);
      v.set(o.x, (o.t.alt || 1.6) + .62, o.z).project(V.camera);
      const fora = v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.3;
      if (fora && !proprio) { b.el.style.visibility = 'hidden'; return; }
      b.el.style.visibility = '';
      const x = proprio ? w / 2 : (v.x + 1) / 2 * w, y = proprio ? h * .72 : (1 - v.y) / 2 * h;
      const meio = (b.el.offsetWidth || 120) / 2 + 8, alto = (b.el.offsetHeight || 40) + 64;   // o balão não sai da tela
      b.el.style.transform = `translate(${Math.round(Math.max(meio, Math.min(w - meio, x)))}px, ${Math.round(Math.max(alto, y))}px) translate(-50%, -100%)`;
      b.el.classList.toggle('sumindo', b.fim - agora < 600);
    });
  }
  function limparBaloes() { [...Baloes.lista].forEach(tirarBalao); const l = $('#s3dLegenda'); if (l) l.hidden = true; }

  /* ---------- Controle de um Filho: as habilidades da ficha aparecem na tela (Mestre e auxiliares) ----------
     A ficha vem de Fichas › Ameaças e Filhos (a que tem "Filho no mapa" = este Filho). Ataques rolam em
     segredo (Sussurro para o Mestre, canal dos Filhos para o auxiliar); usar uma habilidade mostra o efeito
     no 3D para todos que veem o Filho. Teclas 1 a 9 (configuráveis nas Opções). */
  const Hab = (() => {
    let ser = null, off = null, fichas = [], itens = [], recolhido = false;
    const linhas = t => String(t || '').split(/\n+|;\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/).map(l => l.trim()).filter(l => l.length > 1).slice(0, 12);
    const nomeDe = l => { const m = /^([^:.()]{2,40}?)\s*[:.(]/.exec(l); return (m ? m[1] : l.length > 30 ? l.slice(0, 28) + '…' : l).replace(/^[-•*\s]+/, '').trim(); };
    function montar() {
      itens = [];
      fichas.forEach(f => {
        const d = f.d;
        Object.entries(d.ataques || {}).sort((x, y) => (x[1].o || 0) - (y[1].o || 0)).forEach(([id, a]) => itens.push({ tipo: 'atk', f, id, a, nome: a.n || 'Ataque', det: `${int(a.dados) || 1}d20${int(a.bonus) >= 0 ? '+' : ''}${int(a.bonus)} · dano ${a.dano || '—'}` }));
        linhas(d.hab).forEach(l => itens.push({ tipo: 'hab', f, nome: nomeDe(l), det: l }));
        linhas(d.acoes).forEach(l => itens.push({ tipo: 'acao', f, nome: nomeDe(l), det: l }));
      });
    }
    const int = v => parseInt(v, 10) || 0;
    function atualizar() {
      if (!V) return limpar();
      const A = ACF(), tk = V.ctrl && ((A.estado || {}).tokens || {})[V.ctrl], s = tk && A.SER[tk.s];
      const quer = (V.quem === 'mestre' || V.quem === 'aux') && s && s.tipo === 'filho' ? tk.s : null;
      if (quer !== ser) {
        if (off) { try { off(); } catch (e) {} } off = null; fichas = []; itens = []; ser = quer;
        const FX = window.ACF_FICHAS;
        if (quer && FX && FX.fichasDoFilho) off = FX.fichasDoFilho(quer, l => { fichas = l; montar(); desenhar(); });
      }
      desenhar();
    }
    function desenhar() {
      const el = $('#s3dHab'); if (!el) return;
      if (!ser || !V) { el.hidden = true; el.dataset.h = ''; return; }
      const A = ACF(), tk = ((A.estado || {}).tokens || {})[V.ctrl] || {}, s = A.SER[ser] || {};
      const kbd = n => n <= 9 && !ehToque() ? `<kbd>${esc(nomeTecla(teclaDe('hab' + n)))}</kbd>` : '';
      let h = `<header><span class="s3d-hab-cor" style="--c:${esc(s.cor || '#ff4d6d')}"></span><b>${esc(A.rotulo(tk) || s.nome || 'Filho')}</b><small>CONTROLE</small>
        <button type="button" data-hab-min title="${recolhido ? 'Mostrar' : 'Recolher'}" aria-label="${recolhido ? 'Mostrar as habilidades' : 'Recolher as habilidades'}">${recolhido ? '▴' : '▾'}</button></header>`;
      if (!recolhido) {
        if (!fichas.length) h += `<p class="mini">Nenhuma ficha ligada a este Filho. Em Fichas › Ameaças e Filhos, crie uma (+ Novo Filho) e escolha este Filho em "Filho no mapa".</p>`;
        fichas.forEach(f => {
          const d = f.d, pvA = d.pv && d.pv.a !== undefined && d.pv.a !== '' ? int(d.pv.a) : int(d.pvMax), pvM = int(d.pvMax) || 1;
          h += `<div class="s3d-hab-vit"><span>PV ${pvA}/${pvM}</span><i style="--p:${Math.max(0, Math.min(100, pvA / pvM * 100))}%"></i><span>Def ${int(d.def)}</span><span>${esc(d.desl || '')}</span><span>VD ${int(d.vd)}</span></div>`;
        });
        h += `<div class="s3d-hab-lista">${itens.map((it, i) => `<button type="button" data-hab="${i}" title="${esc(it.det)}">${kbd(i + 1)}<span>${it.tipo === 'atk' ? '⚔' : it.tipo === 'acao' ? '▶' : '✦'} ${esc(it.nome)}</span><small>${esc(it.tipo === 'atk' ? it.det : it.det.length > 70 ? it.det.slice(0, 68) + '…' : it.det)}</small></button>`).join('')}</div>
          <div class="s3d-op">${fichas[0] ? `<button type="button" data-hab-ficha>📋 Ficha</button>` : ''}<button type="button" data-hab-soltar>Soltar o Controle</button></div>`;
      }
      if (el.dataset.h === h && !el.hidden) return;
      el.dataset.h = h; el.innerHTML = h; el.hidden = false; el.classList.toggle('recolhido', recolhido);
      $('[data-hab-min]', el).onclick = () => { recolhido = !recolhido; desenhar(); };
      el.querySelectorAll('[data-hab]').forEach(b => b.onclick = () => usar(itens[+b.dataset.hab]));
      const bf = $('[data-hab-ficha]', el); if (bf) bf.onclick = () => { if (document.pointerLockElement) document.exitPointerLock(); window.ACF_FICHAS.abrirAux(fichas[0].chave); };
      const bs = $('[data-hab-soltar]', el); if (bs) bs.onclick = () => { V.ctrl = null; V.ctrlMestre = null; definirModo('fora'); atualizar(); dica(); };
    }
    function usar(it) {
      if (!it || !V || !V.ctrl) return;
      const A = ACF(), FX = window.ACF_FICHAS, id = V.ctrl, tk = ((A.estado || {}).tokens || {})[id], quem = A.rotulo(tk || {}) || 'Filho';
      const secreto = A.postarRolagemSecreta || A.postarRolagem;
      if (it.tipo === 'atk') {
        const t = FX.rolarTeste(int(it.a.dados) || 1, int(it.a.bonus)), dn = it.a.dano ? FX.rolarExpr(it.a.dano) : null;
        secreto(`${quem} · ${it.nome}: ataque ${t.total} [${t.dados.join(', ')}]${dn ? ` · dano ${dn.total} (${it.a.dano})` : ''}`);
        toast(`⚔ ${it.nome}: ataque ${t.total}${dn ? ` · dano ${dn.total}` : ''} (só você e o Mestre veem os números)`);
        if (A.efeitoToken) A.efeitoToken(id, { t: 'atk', n: it.nome });
      } else {
        toast(`✦ ${it.nome}`);
        if (A.efeitoToken) A.efeitoToken(id, { t: 'hab', n: it.nome, el: it.f.d.el || '' });
      }
    }
    function usarN(n) { if (ser) usar(itens[n - 1]); }
    function limpar() { if (off) { try { off(); } catch (e) {} } off = null; ser = null; fichas = []; itens = []; const el = $('#s3dHab'); if (el) el.hidden = true; }
    return { atualizar, usarN, limpar };
  })();

  /* ---------- efeitos que TODOS veem no 3D: rituais, habilidades, ataques, dano, sanidade, cura e momentos ----------
     Fontes: o campo fx do token (gravado por quem o controla), as vitais publicadas no token (PV e SAN) e o nó
     "efeito" do site (rituais conjurados e momentos: 20 natural, 1 natural, óbito, insanidade). */
  const Efeitos = (() => {
    const vivos = [], ult = new Map();
    const COR_EL = { sangue: '#d01830', morte: '#8a8a8a', conhecimento: '#f0c43a', energia: '#9a4aff', medo: '#f4f4f4', varia: '#b48cff' };
    const corEl = (el, p) => COR_EL[String(el || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()] || p || '#b48cff';
    function textoSprite(T, txt, cor) {
      const [c, x] = NS().tela(512, 128); x.font = 'bold 54px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = '#000'; x.shadowBlur = 14; x.lineWidth = 8; x.strokeStyle = 'rgba(0,0,0,.85)'; x.strokeText(txt, 256, 64); x.fillStyle = cor; x.fillText(txt, 256, 64);
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
      const m = new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false });
      const sp = new T.Sprite(m); sp.scale.set(1.9, .48, 1); sp.renderOrder = 9; return { sp, lixo: [t, m] };
    }
    function sigiloTex(T, cor, sem) {
      const [c, x] = NS().tela(256, 256), r = NS().rng(sem || 3); x.translate(128, 128); x.strokeStyle = cor; x.shadowColor = cor; x.shadowBlur = 10; x.lineWidth = 4;
      x.beginPath(); x.arc(0, 0, 118, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, 92, 0, 7); x.stroke();
      const n = 3 + Math.floor(r() * 4); x.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2 * (n % 2 ? 2 : 1); x.lineTo(Math.cos(a) * 92, Math.sin(a) * 92); } x.stroke();
      x.font = 'bold 22px serif'; x.fillStyle = cor; for (let i = 0; i < 12; i++) { x.save(); x.rotate(i / 12 * Math.PI * 2); x.fillText('ᚱᛟᛞᛁᛗᛖᚾᚷ'[Math.floor(r() * 9)], -6, -98); x.restore(); }
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
    }
    // cria um efeito em volta do token id (só aparece se o token estiver à vista)
    function criar(tipo, id, op = {}) {
      if (!V || !window.THREE) return;
      const o = V.tok.mapa.get(id); if (!o || !o.t.g.visible && !(id === V.ctrl)) return;
      const T = window.THREE, g = new T.Group(), lixo = [], alt = o.t.alt || 1.7;
      g.position.set(o.x, 0, o.z); V.cena.add(g);
      const add = (geo, mat) => { const me = new T.Mesh(geo, mat); lixo.push(geo, mat); g.add(me); return me; };
      const cor = op.cor || { atk: '#ff3a2a', dano: '#ff1a1a', san: '#a050ff', cura: '#5aff8a', hab: corEl(op.el, '#7ad8ff'), ritual: corEl(op.el), m20: '#ffd23a', m1: '#5a5a5a', obito: '#c00000', insano: '#b030ff' }[tipo] || '#ffffff';
      const C = new T.Color(cor);
      let dur = 2.6, anim = () => {};
      const luz = new T.PointLight(cor, 0, 7, 2); luz.position.y = 1.2; g.add(luz);
      if (tipo === 'ritual') {
        dur = 4.2; const tex = sigiloTex(T, cor, (op.n || '').length); lixo.push(tex);
        const s1 = add(new T.PlaneGeometry(2.6, 2.6), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide })); s1.rotation.x = -Math.PI / 2; s1.position.y = .04;
        const col = add(new T.CylinderGeometry(.7, 1.1, alt + 1.2, 24, 1, true), new T.MeshBasicMaterial({ color: C, transparent: true, opacity: .0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide })); col.position.y = (alt + 1.2) / 2;
        anim = k => { s1.rotation.z += .02; const a = Math.sin(Math.min(1, k * 1.4) * Math.PI); s1.material.opacity = a; s1.scale.setScalar(.6 + k * .6); col.material.opacity = a * .22; luz.intensity = a * 3.2; };
      } else if (tipo === 'hab' || tipo === 'cura' || tipo === 'm20') {
        const anel = add(new T.RingGeometry(.3, .42, 40), new T.MeshBasicMaterial({ color: C, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide })); anel.rotation.x = -Math.PI / 2; anel.position.y = .05;
        const n = 26, pts = new Float32Array(n * 3), vel = []; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = .2 + Math.random() * .4; pts[i * 3] = Math.cos(a) * r; pts[i * 3 + 1] = Math.random() * .4; pts[i * 3 + 2] = Math.sin(a) * r; vel.push(.6 + Math.random() * 1.2); }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pts, 3)); const pm = new T.PointsMaterial({ color: C, size: .09, transparent: true, depthWrite: false, blending: T.AdditiveBlending }); const pp = new T.Points(geo, pm); lixo.push(geo, pm); g.add(pp);
        anim = (k, dt) => { anel.scale.setScalar(1 + k * 7); anel.material.opacity = 1 - k; for (let i = 0; i < n; i++) pts[i * 3 + 1] += vel[i] * dt; geo.attributes.position.needsUpdate = true; pm.opacity = 1 - k; luz.intensity = (1 - k) * 2.6; };
      } else if (tipo === 'atk') {
        dur = 1.4; const arcos = [];
        const fp = id === V.ctrl && primeiraP(V.cam.modo), zA = fp ? 1.4 : .5, yA = fp ? 1.25 : 1.0;   // em primeira pessoa, o golpe sai na frente da câmera
        for (let i = 0; i < 3; i++) { const a = add(new T.TorusGeometry(fp ? .4 : .55, .02, 6, 24, Math.PI * .8), new T.MeshBasicMaterial({ color: C, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); a.position.set(0, yA + i * .14, zA); a.rotation.set(0, 0, -.6 + i * .5); arcos.push(a); }
        g.rotation.y = o.t.g.rotation.y;
        anim = k => { arcos.forEach((a, i) => { a.material.opacity = Math.max(0, 1 - k * 1.4 - i * .1); a.rotation.y = k * 2.2; a.scale.setScalar(1 + k * .5); }); luz.intensity = (1 - k) * 2; };
      } else if (tipo === 'dano' || tipo === 'obito') {
        dur = tipo === 'obito' ? 4 : 1.8; const n = tipo === 'obito' ? 90 : 40, pts = new Float32Array(n * 3), vel = [];
        for (let i = 0; i < n; i++) { pts[i * 3] = (Math.random() - .5) * .3; pts[i * 3 + 1] = 1 + Math.random() * .5; pts[i * 3 + 2] = (Math.random() - .5) * .3; vel.push([(Math.random() - .5) * 2.6, 1 + Math.random() * 2.4, (Math.random() - .5) * 2.6]); }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pts, 3)); const pm = new T.PointsMaterial({ color: '#8a0000', size: .07, transparent: true, depthWrite: false }); const pp = new T.Points(geo, pm); lixo.push(geo, pm); g.add(pp);
        const poca = add(new T.CircleGeometry(.5, 20), new T.MeshBasicMaterial({ color: '#3a0000', transparent: true, depthWrite: false })); poca.rotation.x = -Math.PI / 2; poca.position.y = .02;
        anim = (k, dt) => { for (let i = 0; i < n; i++) { vel[i][1] -= 9 * dt; pts[i * 3] += vel[i][0] * dt; pts[i * 3 + 1] = Math.max(.02, pts[i * 3 + 1] + vel[i][1] * dt); pts[i * 3 + 2] += vel[i][2] * dt; } geo.attributes.position.needsUpdate = true; pm.opacity = 1 - k * k; poca.scale.setScalar(.3 + Math.min(1, k * 2) * (tipo === 'obito' ? 2.2 : 1)); poca.material.opacity = .8 * (1 - k * k); luz.intensity = (1 - k) * 1.6; };
      } else if (tipo === 'san' || tipo === 'insano' || tipo === 'm1') {
        dur = 3; const anel = add(new T.TorusGeometry(.5, .05, 8, 40), new T.MeshBasicMaterial({ color: C, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); anel.rotation.x = Math.PI / 2; anel.position.y = alt + .25;
        const sombra = add(new T.SphereGeometry(.8, 16, 12), new T.MeshBasicMaterial({ color: tipo === 'm1' ? '#000' : '#14001f', transparent: true, depthWrite: false, opacity: 0 })); sombra.position.y = alt * .6; sombra.scale.y = 1.6;
        anim = (k, dt) => { anel.rotation.z += dt * 6; anel.scale.setScalar(1 + Math.sin(k * 20) * .15); anel.material.opacity = 1 - k; sombra.material.opacity = Math.sin(k * Math.PI) * .45; luz.intensity = Math.sin(k * Math.PI) * 1.8; };
      }
      // texto que sobe (nome do ritual/habilidade ou o número do dano)
      if (op.txt) { const { sp, lixo: l2 } = textoSprite(T, op.txt, cor); lixo.push(...l2); sp.position.y = alt + .55; g.add(sp); const a0 = anim; anim = (k, dt) => { a0(k, dt); sp.position.y = alt + .55 + k * .9; sp.material.opacity = k < .75 ? 1 : (1 - k) * 4; }; }
      vivos.push({ g, t: 0, dur, anim, lixo, id, segue: tipo !== 'dano' && tipo !== 'obito' });
      // no SEU personagem, a tela também sente
      if (id === V.ctrl || id === ACF().meu) tela(tipo);
      if (tipo === 'ritual' || tipo === 'hab') Som.preparar();
    }
    function tela(tipo) {
      const f = $('#s3dFx'); if (!f || !V) return;
      const cls = { dano: 'dano', obito: 'dano', san: 'san', insano: 'san', ritual: 'ritual', cura: 'cura' }[tipo]; if (!cls) return;
      f.className = 's3d-fx'; void f.offsetWidth; f.className = 's3d-fx ' + cls;
      if (cls === 'san') V.choque = 1.2; if (cls === 'dano') V.tremor = .5;
    }
    function tick(dt) {
      for (let i = vivos.length - 1; i >= 0; i--) {
        const v = vivos[i]; v.t += dt; const k = Math.min(1, v.t / v.dur);
        if (v.segue && V) { const o = V.tok.mapa.get(v.id); if (o) v.g.position.set(o.x, 0, o.z); }
        try { v.anim(k, dt); } catch (e) {}
        if (v.t >= v.dur) { if (v.g.parent) v.g.parent.remove(v.g); v.lixo.forEach(x => { try { x.dispose(); } catch (e) {} }); vivos.splice(i, 1); }
      }
    }
    function limpar() { vivos.splice(0).forEach(v => { if (v.g.parent) v.g.parent.remove(v.g); v.lixo.forEach(x => { try { x.dispose(); } catch (e) {} }); }); }
    // compara cada token com o que já foi visto: fx novo, PV ou SAN caindo (ou subindo: cura)
    function vigiarTokens() {
      if (!V) return;
      const tks = (ACF().estado || {}).tokens || {}, agora = Date.now();
      Object.entries(tks).forEach(([id, tk]) => {
        if (!tk) return;
        const u = ult.get(id), vit = tk.vit || {}, fx = tk.fx;
        const novo = { fx: fx && fx.ts, pv: vit.pv, san: vit.san };
        ult.set(id, novo);
        if (!u || tk.a !== V.a) return;
        if (fx && fx.ts && fx.ts !== u.fx && agora - fx.ts < 15000) criar(fx.t === 'atk' ? 'atk' : fx.t === 'cura' ? 'cura' : 'hab', id, { txt: (fx.t === 'atk' ? '⚔ ' : fx.t === 'cura' ? '✚ ' : '✦ ') + String(fx.n || '').slice(0, 40), el: fx.el });
        if (typeof vit.pv === 'number' && typeof u.pv === 'number' && vit.pv !== u.pv) criar(vit.pv < u.pv ? 'dano' : 'cura', id, { txt: `${vit.pv < u.pv ? '−' : '+'}${Math.abs(vit.pv - u.pv)} PV` });
        if (typeof vit.san === 'number' && typeof u.san === 'number' && vit.san < u.san) criar('san', id, { txt: `−${u.san - vit.san} SAN` });
      });
    }
    // nó "efeito" do site: ritual conjurado (quem) e momentos (id)
    let ultEf = 0;
    function aoEfeito(e) {
      if (!e || !e.ts || e.ts <= ultEf) return; const velho = !ultEf; ultEf = e.ts;
      if (velho && Date.now() - e.ts > 8000) return;
      if (!V) return;
      if (e.t === 'sigilo' && e.quem) criar('ritual', e.quem, { el: e.el, n: e.n, txt: '◈ ' + String(e.n || 'Ritual').slice(0, 40) });
      if (e.t === 'momento' && e.id) criar({ 20: 'm20', 1: 'm1', obito: 'obito', insano: 'insano' }[e.k] || 'hab', e.id, { txt: { 20: '★ 20 NATURAL', 1: '✖ 1 NATURAL', obito: '✝', insano: '☍' }[e.k] || '' });
    }
    return { criar, tick, limpar, vigiarTokens, aoEfeito };
  })();

  /* ---------- painel do Mestre (e dos auxiliares) ---------- */
  const LUZES = [['normal', 'Normal'], ['fraca', 'Fraca'], ['pisca', 'Piscando'], ['vermelha', 'Vermelha'], ['off', 'Apagada']];
  // chaves dos itens do livro (item_chao) das cenas de um andar: i_<CN>_<posição na cena>
  function chavesItens(a) {
    const out = [];
    for (let p = 1; p <= 25; p++) { const cn = 25 * (a - 1) + p, c = cenaDe(cn); (c && c.itens || []).forEach((it, i) => { if (it.t === 'item_chao') out.push(`i_${cn}_${i}`); }); }
    return out;
  }
  function desenharPainel() {
    if (!V) return;
    const A = ACF(), p = $('#s3dPainel'), q = V.quem, a = V.a, e = A.estado || {};
    const est = V.cam, pS = salaNoPonto3D(a, imersivo(est.modo) || V.ctrl ? est.px : est.ax, imersivo(est.modo) || V.ctrl ? est.pz : est.az);
    const cn = pS ? 25 * (a - 1) + pS : null;
    const luz = k => (e.luz || {})[k] || 'normal';
    const bts = (grupo, atual) => LUZES.map(([v, t]) => `<button type="button" data-luz="${grupo}" data-v="${v}" class="${atual === v ? 'on' : ''}">${t}</button>`).join('');
    let h = '';
    if (q === 'mestre') {
      h += cn ? `<section><h4>Sala CN ${pad2(cn)}</h4><p class="mini">Luzes desta sala</p><div class="s3d-op">${bts('c' + cn, luz('c' + cn))}</div>` : '<section><h4>Corredor</h4><p class="mini">Entre numa sala para mudar a luz dela.</p>';
      const cena = cn && cenaDe(cn), temVer = cena && (cena.itens || []).some(it => it.v);
      if (temVer) { const v = (e.var3d || {})['c' + cn] || 'neutro'; h += `<p class="mini">Versão da sala (Balança)</p><div class="s3d-op">${[['neutro', 'Neutra'], ['rei', 'Rei'], ['mae', 'Mãe'], ['consagrado', 'Consagrado']].filter(([k]) => k !== 'consagrado' || (cena.itens || []).some(it => [].concat(it.v || []).includes('consagrado'))).map(([k, t]) => `<button type="button" data-ver="${k}" class="${v === k ? 'on' : ''}">${t}</button>`).join('')}</div>`; }
      h += '</section>';
      h += `<section><h4>Corredores do ${a}º andar</h4><div class="s3d-op">${bts('a' + a, luz('a' + a))}</div></section>`;
      h += `<section><h4>Portas</h4><p class="mini">Clique numa porta (ou no botão vermelho ao lado dela) para abrir ou fechar.</p></section>`;
      if (cn) {
        const meus = Object.entries(e.itens3d || {}).filter(([, v]) => v && v.cn === cn), est1 = e.estoque || {};
        h += `<section><h4>Deixar um item nesta sala</h4><p class="mini">Fica no chão ${imersivo(est.modo) ? 'à sua frente' : 'no centro da vista'} e todos veem. Quem pega leva para a ficha ativa.</p>
          <div class="s3d-item-m"><input type="text" list="s3dCatItens" placeholder="Nome do item (catálogo ou livre)" aria-label="Item"><button type="button" data-itm="por">Colocar</button></div>
          <datalist id="s3dCatItens">${((window.ACF_FICHAS && window.ACF_FICHAS.catalogoItens && window.ACF_FICHAS.catalogoItens()) || []).map(x => `<option value="${esc(x.n)}">`).join('')}</datalist>
          ${meus.length ? `<ul class="s3d-itm-lista">${meus.map(([k, v]) => `<li><span>${(est1['m_' + k] || 0) > 0 ? '🎒' : '✓ pego:'} ${esc(v.n)}</span><button type="button" data-itm="tirar" data-k="${esc(k)}" aria-label="Tirar ${esc(v.n)}">✕</button></li>`).join('')}</ul>` : ''}</section>`;
      }
      // telão (vídeo do YouTube) e cabides de trajes desta sala
      const ints = cn ? V.mundo.interativos.filter(it => it.tipo === 'int' && it.cn === cn) : [];
      if (ints.some(it => it.m === 'video')) {
        const vd = (e.video || {})['c' + cn];
        h += `<section><h4>🎬 Telão desta sala</h4><p class="mini">Cole o link de um vídeo do YouTube. Passa para todos que estiverem nesta sala, sincronizado (quem entra depois pega o vídeo andando). O som sobe perto da tela.</p>
          <div class="s3d-item-m"><input type="url" data-vid-url placeholder="https://www.youtube.com/watch?v=…" aria-label="Link do vídeo" value="${vd && vd.id ? 'https://youtu.be/' + esc(vd.id) : ''}"><button type="button" data-vid="passar">▶ Passar</button></div>
          ${vd && vd.id ? '<div class="s3d-op"><button type="button" data-vid="parar">⏹ Parar o vídeo</button></div>' : ''}</section>`;
      }
      const cabs = ints.filter(it => it.m === 'vestir');
      if (cabs.length) h += `<section><h4>🦺 Trajes nesta sala</h4>${cabs.map(it => { const n = (e.estoque || {})['v_' + it.k]; return `<p class="mini">${esc(it.d.item || it.nome)}: ${n === undefined ? (it.d.qtd ?? 1) : n} no cabide</p>`; }).join('')}<div class="s3d-op"><button type="button" data-trajes="repor">Repor os cabides</button></div></section>`;
      const ks = chavesItens(a), est0 = e.estoque || {}, noChao = ks.filter(k => (est0[k] || 0) > 0).length;
      if (ks.length) h += `<section><h4>Itens do livro no ${a}º andar</h4><p class="mini">${noChao} de ${ks.length} no chão. Quem pega leva para a ficha ativa (some para todos).</p><div class="s3d-op"><button type="button" data-itens="espalhar">Espalhar todos</button><button type="button" data-itens="recolher">Recolher</button></div></section>`;
    }
    const sel = V.sel && (e.tokens || {})[V.sel];
    if (sel) {
      const s = A.SER[sel.s], pode = A.podeMover(sel);
      h += `<section><h4>Token: ${esc(A.rotulo(sel))}</h4>${sel.esq ? '<p class="mini">👁 Escondido num esconderijo (só você vê).</p>' : ''}
        <div class="s3d-op">${pode ? (V.ctrl === V.sel ? '<button type="button" data-tk="soltar" class="on">Soltar (câmera livre)</button>' : '<button type="button" data-tk="controlar">🎮 Controlar com WASD</button>') : ''}
        <button type="button" data-tk="seguir">🎥 Levar a câmera até ele</button>
        ${q === 'mestre' && sel.esq ? '<button type="button" data-tk="revelar">Tirar do esconderijo</button>' : ''}</div>
        ${q === 'mestre' ? htmlVoz(V.sel) : ''}
        ${q === 'mestre' && s && s.tipo === 'filho' ? `<p class="mini">Forma da criatura no 3D</p><select data-forma>${NS().FORMAS.map(f => `<option value="${f}" ${((e.formas || {})[sel.s] || 'esguio') === f ? 'selected' : ''}>${esc(NS().NOMES_FORMA[f])}</option>`).join('')}</select>` : ''}</section>`;
    } else h += '<section><h4>Tokens</h4><p class="mini">Toque num token para escolher: dá para controlá-lo com WASD (com as regras de distância) ou levar a câmera até ele.</p></section>';
    if (V.ctrl && V.ctrl !== V.sel && q !== 'jog') h += `<section><div class="s3d-op"><button type="button" data-tk="soltar">Soltar ${esc(A.rotulo((e.tokens || {})[V.ctrl] || {}))}</button></div></section>`;
    p.innerHTML = `<button type="button" class="s3d-painel-x" aria-label="Fechar o painel">✕</button>${h}`;
    $('.s3d-painel-x', p).onclick = () => { p.hidden = true; };
    p.querySelectorAll('[data-luz]').forEach(b => b.onclick = () => { A.definir(['luz', b.dataset.luz], b.dataset.v === 'normal' ? null : b.dataset.v); setTimeout(desenharPainel, 60); });
    p.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => { A.definir(['var3d', 'c' + cn], b.dataset.ver === 'neutro' ? null : b.dataset.ver); setTimeout(() => { V.mundo.recarregar(pS); desenharPainel(); }, 80); });
    p.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => {
      const k = b.dataset.tk;
      if (k === 'controlar') { V.ctrl = V.sel; V.ctrlMestre = V.sel; const q2 = V.tok.posDe(V.sel); if (q2) { V.cam.px = q2[0]; V.cam.pz = q2[1]; V.cam.ax = q2[0]; V.cam.az = q2[1]; } V.cam.largo = false; pintarBarra(); dica(); }
      if (k === 'soltar') { V.ctrl = null; V.ctrlMestre = null; dica(); }
      if (k === 'seguir') { const q2 = V.tok.posDe(V.sel); if (q2) { V.cam.ax = q2[0]; V.cam.az = q2[1]; V.cam.px = q2[0]; V.cam.pz = q2[1]; V.cam.largo = false; if (V.cam.modo === 'cima') V.cam.r = 14; pintarBarra(); } }
      if (k === 'revelar') A.esconderToken(V.sel, null);
      desenharPainel();
    });
    const sf = p.querySelector('[data-forma]'); if (sf) sf.onchange = () => { A.definir(['formas', sel.s], sf.value); };
    ligarVoz(p, desenharPainel);
    p.querySelectorAll('[data-itm]').forEach(b => b.onclick = () => {
      if (b.dataset.itm === 'tirar') { A.tirarItem3D(b.dataset.k); setTimeout(desenharPainel, 150); return; }
      const nome = ($('.s3d-item-m input', p) || {}).value || ''; if (!nome.trim()) { toast('Escreva o nome do item.'); return; }
      const c = V.cam; let x, z;
      if (imersivo(c.modo)) { x = c.px - Math.sin(c.yaw) * 1.6; z = c.pz - Math.cos(c.yaw) * 1.6; } else { x = c.ax; z = c.az; }
      [x, z] = pontoLivre(V.mundo.livre3D, x, z);
      const q = plantaDe3D(a, x, z), r = A.colocarItem3D(nome, a, q.x, q.y);
      toast(r || `Item deixado: ${nome}.`); setTimeout(desenharPainel, 150);
    });
    p.querySelectorAll('[data-vid]').forEach(b => b.onclick = () => {
      if (b.dataset.vid === 'parar') { A.definir(['video', 'c' + cn], null); setTimeout(desenharPainel, 120); return; }
      const id = NS().inter.idYoutube(($('[data-vid-url]', p) || {}).value);
      if (!id) { toast('Link do YouTube não reconhecido.'); return; }
      A.definir(['video', 'c' + cn], { id, t0: Date.now() }); toast('🎬 Passando no telão.'); setTimeout(desenharPainel, 120);
    });
    p.querySelectorAll('[data-trajes]').forEach(b => b.onclick = () => {
      V.mundo.interativos.filter(it => it.tipo === 'int' && it.cn === cn && it.m === 'vestir').forEach(it => A.definir(['estoque', 'v_' + it.k], it.d.qtd ?? 1));
      toast('Cabides repostos.'); setTimeout(desenharPainel, 150);
    });
    p.querySelectorAll('[data-itens]').forEach(b => b.onclick = () => {
      const ks = chavesItens(a), novo = { ...(e.estoque || {}) };
      if (b.dataset.itens === 'espalhar') ks.forEach(k => { if (!(novo[k] > 0)) novo[k] = 1; }); else ks.forEach(k => { delete novo[k]; });
      A.definir(['estoque'], Object.keys(novo).length ? novo : null); setTimeout(desenharPainel, 120);
    });
  }
  // voz do token no chat do 3D: o jogador escolhe a da cobaia, o auxiliar a do robô; o Mestre escolhe no painel do token
  function htmlVoz(idForcado) {
    const A = ACF(), VZ = window.ACF_VOZES; if (!VZ) return '';
    const id = idForcado || (A.mestre ? null : A.meu || A.aux), tk = id && ((A.estado || {}).tokens || {})[id];
    if (!tk) return '';
    if (id === 'c2p0' || id === 'mostarda') return `<b>Voz no chat</b><p class="mini">${id === 'c2p0' ? 'A C2P0 fala em bips e zips' : 'O Mostarda fala em grunhidos, estalos e chiados'}: só quem conjura Compreensão Paranormal entende (Mestre e auxiliares sempre leem).</p>`;
    const s = A.SER[tk.s], atual = VZ.vozDe(id, tk, s && s.tipo);
    return `<b>Voz no chat${idForcado ? ' · ' + esc(A.rotulo(tk)) : ''}</b><div class="s3d-voz" data-voz-id="${esc(id)}"><select aria-label="Voz">${Object.entries(VZ.VOZES).map(([k, v]) => `<option value="${k}" ${k === atual ? 'selected' : ''}>${esc(v.n)}${VZ.PADRAO[id] === k ? ' (padrão)' : ''}</option>`).join('')}</select><button type="button" data-voz="ouvir" title="Ouvir">▶</button></div>`;
  }
  function ligarVoz(raiz, depois) {
    const A = ACF(), VZ = window.ACF_VOZES, c = raiz.querySelector('.s3d-voz'); if (!c || !VZ) return;
    const id = c.dataset.vozId, sel = c.querySelector('select');
    c.querySelector('[data-voz="ouvir"]').onclick = () => VZ.testar(sel.value);
    sel.onchange = () => { const tk = ((A.estado || {}).tokens || {})[id]; if (!tk) return; A.definir(['tokens', id], { ...tk, vz: sel.value }); VZ.testar(sel.value); setTimeout(depois, 120); };
  }
  // Opções do 3D, como num jogo: Gráficos, Câmera e mouse, Controles (atalhos) e Áudio/Chat. Tudo fica neste aparelho.
  let abaOp = 'graficos';
  function desenharOpcoes() {
    const o = $('#s3dOpcoes'); if (!o) return;
    const alta = lsG('acf-s3d-qualidade', V && V.celular ? 'baixa' : 'alta') === 'alta';
    const sel = (k, ops, rot) => `<label class="s3d-lin"><span>${rot}</span><select data-cfg="${k}">${ops.map(([v, t]) => `<option value="${esc(String(v))}" ${String(CFG[k]) === String(v) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    const chave = (k, rot) => `<label class="chave"><input type="checkbox" data-cfgb="${k}" ${CFG[k] ? 'checked' : ''}><span>${rot}</span></label>`;
    const faixa = (k, min, max, passo, rot, fmt) => `<label class="s3d-lin s3d-faixa"><span>${rot} <output>${fmt(CFG[k])}</output></span><input type="range" data-cfgr="${k}" min="${min}" max="${max}" step="${passo}" value="${CFG[k]}"></label>`;
    const auto = [['auto', 'Automático'], ['true', 'Ligado'], ['false', 'Desligado']];
    const pct = v => Math.round(v * 100) + '%';
    let h = `<header class="s3d-op-cab"><b>Opções</b><button type="button" class="s3d-painel-x" data-op-x aria-label="Fechar as opções">✕</button></header>
      <nav class="s3d-op-abas">${[['graficos', 'Gráficos'], ['camera', 'Câmera e mouse'], ['controles', 'Controles'], ['audio', 'Áudio e chat']].map(([k, t]) => `<button type="button" data-aba-op="${k}" class="${abaOp === k ? 'on' : ''}">${t}</button>`).join('')}</nav>`;
    if (abaOp === 'graficos') {
      h += `<section><p class="mini">Abaixe o que pesar no seu aparelho. As marcadas com ↻ reabrem o 3D na hora.</p>
        <label class="s3d-lin"><span>Predefinição ↻</span><select data-qual><option value="alta" ${alta ? 'selected' : ''}>Alta (computador)</option><option value="baixa" ${!alta ? 'selected' : ''}>Leve (celular, máquina fraca)</option></select></label>
        ${faixa('escala', .5, 1.5, .05, 'Escala de resolução ↻', pct)}
        ${sel('sombras', auto, 'Sombras da lanterna ↻')}
        ${sel('brilho', auto, 'Brilho das luzes (bloom)')}
        ${sel('aberr', auto, 'Aberração cromática')}
        ${chave('grao', 'Grão de filme')}
        ${chave('vinheta', 'Vinheta (bordas escuras)')}
        ${sel('nevoa', [[.6, 'Leve'], [1, 'Normal'], [1.6, 'Densa (mais medo)'], [2.4, 'Muito densa']], 'Névoa')}
        ${chave('poeira', 'Poeira no ar ↻')}
        ${sel('fps', [[0, 'Sem limite'], [60, '60 por segundo'], [30, '30 por segundo (economiza bateria)']], 'Limite de quadros')}
        ${chave('verFps', 'Mostrar quadros por segundo')}</section>`;
    } else if (abaOp === 'camera') {
      h += `<section>${chave('terceira', 'Modo Jogo em terceira pessoa (o padrão é primeira pessoa)')}
        ${faixa('fov', 55, 105, 1, 'Campo de visão', v => v + '°')}
        ${chave('balanco', 'Balanço da câmera ao andar e respirar')}
        ${faixa('sens', .2, 3, .05, 'Sensibilidade do mouse e do toque', v => (+v).toFixed(2).replace('.', ',') + '×')}
        ${chave('invY', 'Inverter o eixo vertical')}
        ${chave('nomes', 'Nomes em cima dos personagens')}</section>`;
    } else if (abaOp === 'controles') {
      const grupos = [['mov', 'Movimento'], ['jogo', 'Jogo'], ['atalho', 'Atalhos'], ['hab', 'Habilidades (Mestre e auxiliares no Controle de um Filho)']];
      h += `<p class="mini">Clique numa tecla e aperte a nova (vale botão do meio, direito ou lateral do mouse). Esc cancela. Setas sempre andam, Enter sempre abre o chat.</p>`;
      grupos.forEach(([g, t]) => {
        if (g === 'hab' && V && V.quem === 'jog') return;
        h += `<section><h4>${t}</h4><div class="s3d-teclas">${ACOES.filter(x => x[3] === g).map(([id, n]) => `<div class="s3d-tecla"><span>${esc(n)}</span><button type="button" data-tecla="${id}" class="${CFG.teclas[id] !== undefined ? 'mudada' : ''}">${esc(nomeTecla(teclaDe(id)))}</button></div>`).join('')}</div></section>`;
      });
      h += `<div class="s3d-op"><button type="button" data-teclas-pad>Restaurar as teclas padrão</button></div>`;
    } else {
      h += `<section>${faixa('volAmb', 0, 1.5, .05, 'Volume do ambiente e dos passos', pct)}
        ${faixa('volVoz', 0, 1.5, .05, 'Volume das vozes do chat', pct)}
        ${chave('baloes', 'Balões de fala em cima das cabeças')}
        ${htmlVoz()}</section>
        <section><b>Dados</b>
        <label class="chave"><input type="checkbox" data-op="d3" ${lsG('acf-dados3d', true) ? 'checked' : ''}><span>Dados 3D rolando na tela quando eu rolar</span></label>
        <label class="chave"><input type="checkbox" data-op="d3m" ${lsG('acf-dados3d-2d', false) ? 'checked' : ''}><span>Também no mapa 2D</span></label></section>
        <p class="mini">Modelos próprios: coloque arquivos .glb na pasta modelos/ e liste em modelos/modelos.json (veja o README).</p>`;
    }
    o.innerHTML = h;
    const reabrir = () => { if (V) abrir(25 * (V.a - 1) + 1, { a: V.a, manter: true, andar: V.cam.largo }); };
    const REABRE = new Set(['escala', 'sombras', 'poeira']);
    const depois = k => {
      salvarCfg();
      if (REABRE.has(k)) { reabrir(); return; }
      if (V) { V.pos.aplicar(); if (k === 'fov' && primeiraP(V.cam.modo)) definirModo(V.cam.modo); if (k === 'terceira') definirModo(V.ctrl ? 'jogo' : V.cam.modo); if (k === 'verFps' && !CFG.verFps) $('#s3dFps').hidden = true; dica(); }
    };
    $('[data-op-x]', o).onclick = () => { o.hidden = true; };
    o.querySelectorAll('[data-aba-op]').forEach(b => b.onclick = () => { abaOp = b.dataset.abaOp; desenharOpcoes(); });
    const q = $('[data-qual]', o); if (q) q.onchange = () => { lsS('acf-s3d-qualidade', q.value); reabrir(); };
    o.querySelectorAll('[data-cfg]').forEach(x => x.onchange = () => { const k = x.dataset.cfg, v = x.value; CFG[k] = v === 'auto' ? 'auto' : v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; depois(k); });
    o.querySelectorAll('[data-cfgb]').forEach(x => x.onchange = () => { CFG[x.dataset.cfgb] = x.checked; depois(x.dataset.cfgb); });
    o.querySelectorAll('[data-cfgr]').forEach(x => {
      const k = x.dataset.cfgr, out = x.parentElement.querySelector('output'), fmt = { escala: pct, volAmb: pct, volVoz: pct, fov: v => v + '°', sens: v => (+v).toFixed(2).replace('.', ',') + '×' }[k];
      x.oninput = () => { CFG[k] = +x.value; if (out && fmt) out.textContent = fmt(CFG[k]); if (!REABRE.has(k)) depois(k); };
      x.onchange = () => { CFG[k] = +x.value; depois(k); };
    });
    o.querySelectorAll('[data-tecla]').forEach(b => b.onclick = () => {
      const id = b.dataset.tecla; b.textContent = 'aperte…'; b.classList.add('esperando');
      capturando = k => {
        capturando = null;
        if (k !== 'escape') {
          if (k === 'enter' || SETAS[k]) { toast(`${nomeTecla(k)} já tem função fixa.`); }
          else {
            const outra = acaoDaTecla(k), minha = teclaDe(id);
            if (outra && outra !== id) { CFG.teclas[outra] = minha; toast(`Trocou com "${(ACOES.find(x => x[0] === outra) || [])[1]}".`); }
            CFG.teclas[id] = k; ACOES.forEach(([a2, , p2]) => { if (CFG.teclas[a2] === p2) delete CFG.teclas[a2]; });
            salvarCfg(); dica();
          }
        }
        desenharOpcoes();
      };
    });
    const tp = $('[data-teclas-pad]', o); if (tp) tp.onclick = () => { CFG.teclas = {}; salvarCfg(); dica(); desenharOpcoes(); toast('Teclas padrão de volta.'); };
    const d3 = o.querySelector('[data-op="d3"]'), d3m = o.querySelector('[data-op="d3m"]');
    if (d3) d3.onchange = () => lsS('acf-dados3d', d3.checked); if (d3m) d3m.onchange = () => lsS('acf-dados3d-2d', d3m.checked);
    ligarVoz(o, () => desenharOpcoes());
  }

  /* ---------- "E" / botão na tela: interagir com o que está perto ---------- */
  // objetos de usar: Maurício (loja), geladeira e bebedouro (despensa), estação de leitura (Arquivo e Terminal)
  function usar(e) {
    const A = ACF();
    if (document.pointerLockElement) document.exitPointerLock();
    if (e.uso === 'loja') A.abrirLoja && A.abrirLoja();
    else if (e.uso === 'arquivo' || e.uso === 'terminal') { if (window.ACF_ARQUIVO) window.ACF_ARQUIVO.abrir(e.uso === 'terminal' ? 'terminal' : undefined); }
    else A.pegarEstoque && A.pegarEstoque(e.uso);
  }
  function interagir() {
    if (!V) return;
    const pr = V.pertoDe(); if (!pr) { toast('Nada por perto para usar.'); return; }
    if (pr.tipo === 'sair') V.sairEsconderijo();
    else if (pr.tipo === 'esconderijo') V.usarEsconderijo(pr);
    else if (pr.tipo === 'uso') usar(pr);
    else if (pr.tipo === 'porta') V.usarPorta(pr.ci);
    else if (pr.tipo === 'elevador') usarElevador(pr);
    else if (pr.tipo === 'item') { const r = ACF().pegarItemChao(pr.k, pr.nome); toast(r || `🎒 ${pr.nome} foi para a sua ficha.`); }
    else if (pr.tipo === 'int') { setTimeout(() => { if (V) V.mundo.atualizarInter(); }, 60); NS().inter.usar(pr.it, { quem: V.quem, ctrl: V.ctrl, toast, raiz: $('#s3d') || document.body, abrirPainel: () => { const pp = $('#s3dPainel'); if (pp) { if (document.pointerLockElement) document.exitPointerLock(); pp.hidden = false; desenharPainel(); } } }); }
    else if (pr.tipo === 'doc') { if (document.pointerLockElement) document.exitPointerLock(); const AR = window.ACF_ARQUIVO; if (AR && AR.abrirNaSala) AR.abrirNaSala(pr.arq, pr.id); }
  }

  /* ---------- saída do andar (elevador, poço, eclusa, fenda) ----------
     Mestre: escolhe quem vai e para qual andar. Jogador e auxiliar: pedem; o Mestre aprova na fila de Pedidos. */
  function usarElevador(pr) {
    if (!V) return;
    const A = ACF(), a = V.a, q = V.quem;
    if (document.pointerLockElement) document.exitPointerLock();
    let cx = $('#s3dElev');
    if (!cx) { cx = document.createElement('div'); cx.id = 's3dElev'; cx.className = 's3d-elev'; V.d.appendChild(cx); }
    const andares = [1, 2, 3, 4, 5].filter(n => n !== a);
    const padrao = a < 5 ? a + 1 : a - 1;
    const opAndar = andares.map(n => `<option value="${n}" ${n === padrao ? 'selected' : ''}>${n}º andar${n < a ? ' (subir)' : ''}</option>`).join('');
    if (q === 'mestre') {
      const toks = (A.estado || {}).tokens || {};
      const perto = new Set(A.tokensNaSaida(a));
      V.tok.mapa.forEach((o, id) => { if (Math.hypot(o.x - pr.pos.x, o.z - pr.pos.z) < 6) perto.add(id); });
      const ids = [...perto].filter(id => toks[id] && toks[id].a === a);
      cx.innerHTML = `<b>🛗 Saída do ${a}º andar</b><p class="mini">Quem vai? (marcados: quem está na saída ou perto dela)</p>
        <div class="s3d-elev-lista">${ids.map(id => `<label class="chave"><input type="checkbox" value="${esc(id)}" ${A.tokensNaSaida(a).includes(id) || id === V.ctrl ? 'checked' : ''}><span>${esc(A.rotulo(toks[id]))}</span></label>`).join('') || '<p class="mini">Ninguém perto da saída.</p>'}</div>
        <label class="s3d-elev-dest">Para o <select>${opAndar}</select></label>
        <p class="mini">Descendo, chegam à 1ª sala do andar; subindo, à sala da saída do andar de cima.</p>
        <div class="s3d-op"><button type="button" data-el="ir" class="on">Levar</button><button type="button" data-el="x">Cancelar</button></div>`;
    } else {
      cx.innerHTML = `<b>🛗 Saída do andar</b><p class="mini">Só o Mestre muda o andar de um token. O pedido vai para ele, que decide se a passagem abre (e o que ela cobra).</p>
        <label class="s3d-elev-dest">Ir para o <select>${opAndar}</select></label>
        <div class="s3d-op"><button type="button" data-el="pedir" class="on">Pedir ao Mestre</button><button type="button" data-el="x">Cancelar</button></div>`;
    }
    cx.hidden = false;
    cx.onclick = e => {
      const b = e.target.closest('[data-el]'); if (!b) return;
      const dest = +$('select', cx).value;
      if (b.dataset.el === 'x') { cx.hidden = true; return; }
      if (b.dataset.el === 'pedir') { const r = A.pedirElevador(dest); toast(r || 'Pedido enviado ao Mestre. Espere aqui.'); cx.hidden = true; return; }
      if (b.dataset.el === 'ir') {
        const ids = $$('input[type="checkbox"]:checked', cx).map(i => i.value);
        const r = A.levarElevador(ids, dest); cx.hidden = true;
        if (r) { toast(r); return; }
        toast(`Levados para o ${dest}º andar.`);
        const chegada = dest < a ? (((A.geo.saidaDoAndar(dest)) || {}).p || 25) : 1;
        setTimeout(() => abrir(25 * (dest - 1) + chegada, { a: dest, manter: true }), 250);
      }
    };
  }

  /* ---------- abrir o 3D direto (botão 3D da coluna da câmera, sem clicar numa sala) ---------- */
  function abrirDireto() {
    const A = ACF(); if (!A) return;
    if (V) { fechar(); return; }
    const q = quemSou(), id = q === 'jog' ? A.meu : q === 'aux' ? A.aux : null;
    const tk = id && ((A.estado || {}).tokens || {})[id];
    if (q === 'jog') {
      if (!A.meu) { A.aviso('Escolha a sua cobaia para entrar no 3D.'); return; }
      if (!tk) { A.aviso('O token da sua cobaia ainda não está no mapa.'); return; }
      if (A.podeVer && !A.podeVer(tk.a)) { if (A.irAndar) A.irAndar(tk.a); A.aviso('Digite a senha do andar para entrar no 3D.'); return; }
    }
    prepararMapa();
    const g = MAPA.g, perto = (a, x, y) => { let best = 13, bd = 1e9; for (let p = 1; p <= 25; p++) { const r = g.retSala(p), d = (r.x + r.w / 2 - x) ** 2 + (r.y + r.h / 2 - y) ** 2; if (d < bd) { bd = d; best = p; } } return best; };
    if (tk) { const cn = A.salaDe(id) || 25 * (tk.a - 1) + perto(tk.a, tk.x, tk.y); abrir(cn, { a: tk.a, livre: true }); return; }
    const a = A.andarAtual || 1, sel = A.salaSel && Math.ceil(A.salaSel / 25) === a ? A.salaSel : null;
    abrir(sel || 25 * (a - 1) + 25, { a, livre: true, andar: !sel });
  }

  // "Controle": Mestre e auxiliares assumem um token (os Filhos, por exemplo) direto no 3D, em primeira pessoa
  function controlar(id) {
    const A = ACF(); if (!A) return;
    const tk = ((A.estado || {}).tokens || {})[id];
    if (!tk || !A.podeMover(tk)) { A.aviso('Você não pode controlar esse token.'); return; }
    prepararMapa();
    if (V && V.a === tk.a) {
      V.ctrl = id; V.ctrlMestre = id; V.sel = id;
      const q = V.tok.posDe(id) || planta3D(tk.a, tk.x, tk.y); V.cam.px = q[0]; V.cam.pz = q[1]; V.cam.ax = q[0]; V.cam.az = q[1]; V.cam.largo = false;
      definirModo('jogo'); pintarBarra(); dica(); return;
    }
    const g = MAPA.g; let best = 13, bd = 1e9;
    for (let p = 1; p <= 25; p++) { const r = g.retSala(p), d = (r.x + r.w / 2 - tk.x) ** 2 + (r.y + r.h / 2 - tk.y) ** 2; if (d < bd) { bd = d; best = p; } }
    const cn = A.salaDe(id) || 25 * (tk.a - 1) + best;
    abrir(cn, { a: tk.a, livre: true, ctrl: id });
  }

  document.addEventListener('visibilitychange', () => {
    if (!V) return;
    if (document.hidden) { V.rodando = false; cancelAnimationFrame(V.raf); Som.pausar(); }
    else { V.retomar && V.retomar(); Som.retomar(); }
  });

  function fechar(trocando) {
    if (NS().inter) NS().inter.videoTirar();
    if (V) {
      V.rodando = false; cancelAnimationFrame(V.raf);
      removeEventListener('resize', V.tamanho);
      if (V.movendo && V.ctrl) { try { const q = plantaDe3D(V.a, V.cam.px, V.cam.pz); ACF().moverToken3D(V.ctrl, q.x, q.y, true); } catch (e) {} }
      try { V.tok.descartar(); } catch (e) {}
      try { V.mundo.descartar(); } catch (e) {}
      try { V.pos.descartar(); } catch (e) {}
      try { V.envRT.dispose(); } catch (e) {}
      V.descartes.forEach(x => { try { x.dispose && x.dispose(); } catch (e) {} });
      try { V.ren.dispose(); V.ren.forceContextLoss && V.ren.forceContextLoss(); } catch (e) {}
      V.ren.domElement.remove();
      V = null;
    }
    if (trocando) return;
    if (document.pointerLockElement) document.exitPointerLock();
    const gv = $('#s3dGaveta'); if (gv) gv.hidden = true; fecharMenu(); devolverTudo(); limparBaloes(); Efeitos.limpar(); Hab.limpar();
    const el = $('#s3dElev'); if (el) el.hidden = true;
    if (window.ACF_DADOS3D) window.ACF_DADOS3D.encerrar();
    Som.atualizar([]); Som.parar();
    const d = $('#s3d'); if (d) { d.hidden = true; ['#s3dJoy', '#s3dPainel', '#s3dOpcoes', '#s3dCodigo', '#s3dFresta', '#s3dPrompt'].forEach(s => { const x = $(s, d); if (x) x.hidden = true; }); }
    document.body.classList.remove('s3d-aberta');
  }

  /* ---------- vigia: o 3D acompanha o mapa ---------- */
  const cacheImp = new WeakMap();
  const imp = o => { if (!o || typeof o !== 'object') return '-'; if (o._h) return o._h; if (!cacheImp.has(o)) cacheImp.set(o, impressao(o)); return cacheImp.get(o); };
  // se mudar o que está montado (cena importada, sala revelada para o auxiliar), o andar é remontado
  function assinatura(a) {
    const A = ACF(); if (!A) return '';
    const q = quemSou(), partes = [];
    for (let p = 1; p <= 25; p++) { const cn = 25 * (a - 1) + p; partes.push(q === 'aux' && !A.salaRevelada(cn) ? '0' : imp(cenaDe(cn))); }
    return partes.join('|');
  }
  let tVigia = null, varAntes = '';
  function vigiar() {
    clearTimeout(tVigia);
    tVigia = setTimeout(() => {
      if (!V) return;
      const A = ACF(), a = V.a, e = A.estado || {};
      // jogador: se o token mudou de andar, o 3D vai junto; se saiu do mapa, fecha
      if (V.quem === 'jog') {
        const tk = (e.tokens || {})[A.meu];
        if (!tk) { fechar(); A.aviso('O token da sua cobaia saiu do mapa: o 3D foi fechado.'); return; }
        if (tk.a !== a) {
          // andar novo sem a senha digitada neste aparelho: fecha o 3D e mostra a tela da senha
          if (A.podeVer && !A.podeVer(tk.a)) { fechar(); if (A.irAndar) A.irAndar(tk.a); A.aviso(`Sua cobaia chegou ao ${tk.a}º andar. Digite a senha do andar para continuar no 3D.`); return; }
          abrir(A.salaDe(A.meu) || 25 * (tk.a - 1) + 13, { a: tk.a, manter: true }); return;
        }
        if (!V.ctrl) V.ctrl = A.meu;
        if (!tk.esq && V.escondido) V.escondido = null;
      }
      if (V.quem === 'aux' && A.aux) { const rb = (e.tokens || {})[A.aux]; if (!V.ctrl && rb && rb.a === a) V.ctrl = A.aux; if (V.ctrl === A.aux && (!rb || rb.a !== a)) { V.ctrl = null; if (V.cam.modo === 'jogo') definirModo('fora'); } }
      if (V.ctrl && !(e.tokens || {})[V.ctrl]) { V.ctrl = null; V.ctrlMestre = null; }
      if (assinatura(a) !== V.sig) { abrir(25 * (a - 1) + 13, { a, manter: true, andar: V.cam.largo }); return; }
      const va = JSON.stringify(e.var3d || {});
      if (va !== varAntes) { const antes = varAntes; varAntes = va; if (antes) Object.keys({ ...JSON.parse(antes || '{}'), ...(e.var3d || {}) }).forEach(k => { const p = +k.slice(1) - 25 * (a - 1); if (p >= 1 && p <= 25) V.mundo.recarregar(p); }); }
      V.mundo.atualizarPortas();
      V.mundo.atualizarItensM();
      V.mundo.sincExpo();
      V.mundo.atualizarInter();
      V.mundo.atualizarItens();
      V.mundo.atualizarDocs();
      V.tok.sincronizar();
      Efeitos.vigiarTokens();
    }, 120);
  }
  (function ligarVigia() {
    const a = ACF(); if (!a || !a.aoMudar) return setTimeout(ligarVigia, 250);
    a.aoMudar(vigiar);
    document.addEventListener('acf-segredos', vigiar);
    (function ouvirEfeito(n) { const b = ACF(); if (b && b.Rede && b.Rede.on && b.pronto) { try { b.Rede.on('efeito', Efeitos.aoEfeito, () => {}); } catch (e) {} } else if (n < 240) setTimeout(() => ouvirEfeito(n + 1), 500); })(0);
  })();

  /* ---------- para outros módulos e para os testes ---------- */
  function andarTeste(teclas, seg) {
    if (!V) return null;
    const salva = new Set(V.teclas); V.teclas = new Set([...teclas].map(k => ({ w: 'f', s: 't', a: 'e', d: 'd' })[k]).filter(Boolean));
    for (let i = 0; i < seg * 60; i++) { V.mover(1 / 60); V.mundo.atualizar(1 / 60, i / 60, V.cam.px, V.cam.pz, V.cam.modo, V.camera.position); }
    V.teclas = salva; return [+V.cam.px.toFixed(2), +V.cam.pz.toFixed(2)];
  }
  // teste: a sala p deste andar tem os vãos das portas livres e dá para andar de uma porta à outra?
  function checarSala(p) {
    if (!V) return null;
    const m = V.mundo, s = m.S[p]; if (!s) return null;
    m.carregar(p);
    const H = .1, nx = Math.round((s.x1 - s.x0) / H), nz = Math.round((s.z1 - s.z0) / H);
    const ok = (i, j) => m.livre3D(s.x0 + (i + .5) * H, s.z0 + (j + .5) * H);
    const grid = []; let livres = 0;
    for (let i = 0; i < nx; i++) { grid.push([]); for (let j = 0; j < nz; j++) { const v = ok(i, j); grid[i].push(v); if (v) livres++; } }
    const idx = (x, z) => [Math.max(0, Math.min(nx - 1, Math.floor((x - s.x0) / H))), Math.max(0, Math.min(nz - 1, Math.floor((z - s.z0) / H)))];
    const pts = Object.entries(s.vaos).map(([l, v]) => [l, l === 'n' ? idx(v.centro, s.z0 + .5) : l === 's' ? idx(v.centro, s.z1 - .5) : l === 'w' ? idx(s.x0 + .5, v.centro) : idx(s.x1 - .5, v.centro)]);
    const bloq = pts.filter(([, [i, j]]) => !grid[i][j]).map(([l]) => l);
    let semLig = [];
    if (pts.length && !bloq.length) {
      const [i0, j0] = pts[0][1], visto = new Set([i0 * 10000 + j0]), pilha = [[i0, j0]];
      while (pilha.length) { const [i, j] = pilha.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const u = i + a, w = j + b; if (u >= 0 && u < nx && w >= 0 && w < nz && grid[u][w] && !visto.has(u * 10000 + w)) { visto.add(u * 10000 + w); pilha.push([u, w]); } }); }
      semLig = pts.filter(([, [i, j]]) => !visto.has(i * 10000 + j)).map(([l]) => l);
    }
    const c = m.carregadas.get(p), esc = m.interativos.filter(x => x.tipo === 'esconderijo' && x.p === p).length;
    // interações: quantas de cada tipo, e se a resposta da peça (aoInter) roda sem erro
    const ints = m.interativos.filter(x => x.tipo === 'int' && x.p === p), cont = {}; let intErr = '';
    ints.forEach(it => { cont[it.m] = (cont[it.m] || 0) + 1; const f = it.obj.userData.aoInter; if (f) { try { f(1, true, null); f(0, true, null); f(it.ult ?? 0, true, null); } catch (e) { intErr += it.k + ':' + e.message + ' '; } } });
    return { cn: s.cn, livre: Math.round(livres / (nx * nz) * 100), bloq: bloq.join(''), semLig: semLig.join(''), esc, itens: c ? c.g.children.length : 0, int: Object.entries(cont).map(([k, n]) => k + n).join(' '), intErr };
  }
  window.Sala3D = {
    _checar: checarSala, get _mundo() { return V ? V.mundo : null; },
    abrir, fechar, cenaDe, podeAbrir, publicar: agendarPublicar, andarTeste, interagir, abrirDireto, controlar, carregarThree,
    virar(yaw) { if (V) V.cam.yaw = yaw; }, modo: definirModo,
    get aberta() { return !!V; },
    get estado() { return V ? { a: V.a, cam: { ...V.cam }, quem: V.quem, ctrl: V.ctrl, tokens: [...V.tok.mapa.keys()], salas: [...V.mundo.carregadas.keys()], perto: V.pertoDe(), preso: V.preso || null, campos: V.mundo.campos.length } : null; },
    _livre: (x, z) => !!(V && V.mundo.livre3D(x, z)),
    _centro: p => V && V.mundo.centro(p),
    _cam: o => V && Object.assign(V.cam, o),
    _tok: id => V && V.tok.posDe(id),
    _v: () => V && { raf: V.raf, rodando: V.rodando, n: V.mundo.carregadas.size },
    _mapa: { planta3D: (a, x, y) => (prepararMapa(), planta3D(a, x, y)), plantaDe3D: (a, x, z) => (prepararMapa(), plantaDe3D(a, x, z)) },
    Som
  };
})();
