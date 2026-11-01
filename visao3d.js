/* visao3d.js · A VISÃO DA CRIATURA (só Mestre e auxiliares, no Controle de um Filho, no 3D)
   - Quando o Mestre ou um auxiliar controla um Filho no 3D, a câmera vai para os olhos dele (a altura
     vem da altura do modelo 3D) e a imagem passa por um filtro que depende da FORMA 3D escolhida
     (só a aparência: afogada, cabeça de TV, moldura…). As formas genéricas usam um filtro padrão.
   - Por cima do filtro entram os SENTIDOS da criatura, lidos dos dados (privado/filhos), nunca do
     código: os sons das salas viram ondas de luz que correm pelas paredes, o faro mostra o sangue e a
     trilha brilhando no chão, a vibração mostra só quem se mexeu, quem a criatura não percebe some e
     quem ela percebe por outro sentido (tela, câmera, raízes, solidão…) aparece como silhueta acesa
     através das paredes. É a mesma conta que a vista do auxiliar já faz (filhos.js: comoPercebe e
     sentidosDe), sem gravar nada e sem caminho novo no Firebase.
   - O Mestre tem "Ver tudo" (só a aparência do filtro, sem tirar ninguém da tela).
   - Desempenho: a cena é desenhada uma vez numa textura (com profundidade) e um ÚNICO passe faz o
     filtro e os sentidos (sem o brilho/bloom do pós normal). Silhuetas pedem um passe pequeno a mais,
     em meia resolução, só quando existem. No celular a textura sai a 70%, e a qualidade automática
     (imersao.js) reduz mais quando desce de degrau. Sem flashes fortes: tudo pulsa devagar; "Reduzir
     efeitos que se mexem" (ou o movimento reduzido do sistema) quase para as animações.
   - Botão 👁 no topo do 3D e tecla V entram e saem. Opções do 3D › Gráficos › Visão da criatura.
   - Jogadores nunca veem nada disto (o módulo não liga para o perfil de jogador). */
(() => {
  'use strict';
  const A = () => window.ACF;
  const FIL = () => window.ACF_FILHOS;
  const IMR = () => window.ACF_IMERSAO;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const agora = () => Date.now();
  const tokens = () => ((A() || {}).estado || {}).tokens || {};
  const tipoDe = tk => { const s = tk && (A().SER || {})[tk.s]; return s ? s.tipo : ''; };
  const ALT_SALA = 4.0, ALT_CORR = 2.7;

  /* =========================================================
     GLSL comum: amostras da cena, profundidade, posição no mundo, ruídos
     ========================================================= */
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  const COMUM = `
uniform sampler2D tCena, tProf, tMasc, tAux;
uniform vec2 uRes, uResM;
uniform float uTempo, uT, uInt, uTemProf, uCego, uCurta, uMascOn, uNO, uPasso, uAnda, uEco, uTinta;
uniform vec3 uCorOnda;
uniform mat4 uProjInv, uCamMundo;
uniform vec4 uOP[12];
uniform vec4 uOQ[12];
varying vec2 vUv;
#define PI 3.14159265
float gOcl = 0.;   // o estilo marca o que tampa a vista (dentes, grades, cabelo…): as ondas e silhuetas não pintam por cima
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float h11(float x){ return fract(sin(x * 127.1 + 3.7) * 43758.5453); }
float ruido(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * ruido(p); p = p * 2.03 + 11.7; a *= .5; } return s; }
float luma(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
vec2 aspecto(){ return vec2(uRes.x / uRes.y, 1.); }
vec4 brutoC(vec2 uv){ return texture2D(tCena, clamp(uv, vec2(.0008), vec2(.9992))); }
float profB(vec2 uv){ return texture2D(tProf, clamp(uv, vec2(.0008), vec2(.9992))).x; }
vec3 posVista(vec2 uv){ vec4 v = uProjInv * vec4(uv * 2. - 1., profB(uv) * 2. - 1., 1.); return v.xyz / v.w; }
float distV(vec2 uv){ return uTemProf > .5 ? -posVista(uv).z : 5.; }
vec3 posMundo(vec2 uv){ return (uCamMundo * vec4(posVista(uv), 1.)).xyz; }
float bordaProf(vec2 uv){
  if (uTemProf < .5) return 0.;
  vec2 e = 1.5 / uRes; float d = distV(uv);
  float s = abs(distV(uv + vec2(e.x, 0.)) - d) + abs(distV(uv + vec2(0., e.y)) - d);
  return smoothstep(.03, .22, s / max(d, .4));
}
// o mundo como a criatura o recebe: sem visão, só o contorno do que está perto; visão curta, o longe some
vec3 olhar(vec2 uv){
  vec4 r = brutoC(uv); vec3 c = r.rgb;
  if (uCego > .001) { float d = distV(uv); vec3 cg = c * .03 + vec3(.42, .46, .52) * bordaProf(uv) * .45 * smoothstep(9., 1.2, d); c = mix(c, cg, uCego); }
  if (uCurta > .001) { float d = distV(uv); c *= mix(.05, 1., smoothstep(uCurta * 1.5, uCurta * .5, d)); }
  return c;
}
vec3 borrar(vec2 uv, float r){ vec2 e = r / uRes; vec3 s = olhar(uv) * .2;
  s += olhar(uv + vec2(e.x, e.y * .5)) * .2; s += olhar(uv + vec2(-e.x * .5, e.y)) * .2;
  s += olhar(uv + vec2(-e.x, -e.y * .5)) * .2; s += olhar(uv + vec2(e.x * .5, -e.y)) * .2; return s; }
float bordaLuma(vec2 uv, float r){ vec2 e = r / uRes;
  float a = luma(olhar(uv + vec2(e.x, 0.))), b = luma(olhar(uv - vec2(e.x, 0.))), c = luma(olhar(uv + vec2(0., e.y))), d = luma(olhar(uv - vec2(0., e.y)));
  return length(vec2(a - b, c - d)); }
float vinheta(vec2 uv, float k){ return smoothstep(.95, .18, length((uv - .5) * aspecto()) * k); }
float capsula(vec2 p, vec2 a, vec2 b, float r){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }
// células: x = distância ao centro, y = sorteio da célula, z = distância à borda (F2-F1); c = centro (no espaço de p)
vec3 celulas(vec2 p, out vec2 c){
  vec2 n = floor(p), f = fract(p); float d1 = 8., d2 = 8., id = 0.; vec2 cc = vec2(0.);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)), o = vec2(h21(n + g), h21(n + g + 17.3)) * .9 + .05, r = g + o - f; float d = length(r);
    if (d < d1) { d2 = d1; d1 = d; id = h21(n + g + 3.1); cc = n + g + o; } else if (d < d2) d2 = d;
  }
  c = cc; return vec3(d1, id, d2 - d1);
}
`;

  /* =========================================================
     Um estilo por forma 3D (aparência). Cada um define deforma(uv) e estilo(uv, q).
     n: nome da visão · olho: altura dos olhos (fração da altura do modelo) · onda: cor das ondas de som
     cego: quanto a forma já enxerga mal por si (0 a 1) · ganho: força das ondas de som
     ========================================================= */
  const ID = 'vec2 deforma(vec2 uv){ return uv; }';
  const ESTILOS = {
    _padrao: { n: 'Olhar de predador', onda: '#d8e4ff', g: `${ID}
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q); vec3 b = borrar(q, 1.6); c += (c - b) * .9;
  float l = luma(c); c = mix(vec3(l), c, .45) * vec3(.92, .98, 1.08);
  float v = smoothstep(.25, .9, length((uv - .5) * aspecto()));
  c = mix(c, vec3(.22, .02, .02) + c * .3, v * .55);
  return c;
}` },

    afogada: { n: 'Debaixo d’água turva', olho: .93, onda: '#9fe8ff', g: `
float gotas(vec2 uv, out vec2 off){
  vec2 a = aspecto(); vec2 p = uv * a * 5.5; p.y += uT * .04;
  vec2 id = floor(p), f = fract(p) - .5; float h = h21(id); off = vec2(0.);
  if (h < .55) return 0.;
  vec2 c = vec2(h21(id + 7.) - .5, h21(id + 3.) - .5) * .45; float r = .12 + .16 * h21(id + 5.);
  vec2 d = (f - c) / r; float l = length(d * vec2(1., .85)); float m = smoothstep(1., .7, l);
  off = -d * m * .045 / a; return m;
}
vec2 deforma(vec2 uv){ vec2 o; gotas(uv, o); return uv + o + vec2(sin(uv.y * 16. + uT * 1.2), cos(uv.x * 13. + uT)) * .0045; }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q) * 1.25;
  float d = distV(q), turvo = smoothstep(2.5, 14., d);
  c = c * vec3(.55, .88, .9) + vec3(0., .02, .025);
  vec3 agua = vec3(.03, .12, .13) * (.7 + .6 * fbm(uv * 3. + uT * .05));
  c = mix(c, agua, turvo * .8);
  float ca = ruido(q * vec2(10., 7.) + vec2(uT * .25, uT * .18)); ca = pow(1. - abs(ca * 2. - 1.), 7.);
  c += vec3(.22, .5, .5) * ca * .22 * (1. - turvo);
  float pt = step(.988, h21(floor(uv * uRes / 3. + vec2(0., uT * 3.)))); c += vec3(.4, .6, .6) * pt * .06 * (1. - turvo);
  vec2 o; float m = gotas(uv, o);
  c = mix(c, c * 1.15 + vec3(.04, .07, .08), m * .5);
  c += vec3(.6, .8, .85) * smoothstep(.3, .95, m) * (1. - smoothstep(.95, 1., m)) * .18;
  // cabelo preto molhado pendurado no alto e nos lados
  float x = uv.x * aspecto().x, w = fbm(vec2(x * 4., uT * .07));
  float fios = smoothstep(.35, .8, abs(sin(x * 85. + fbm(vec2(x * 3., uv.y * 2.)) * 10.)));
  float alto = uv.y + .18 * w + .07 * sin(x * 6. + uT * .3);
  float cab = smoothstep(.84, .99, alto) * (.55 + .45 * fios);
  cab = max(cab, smoothstep(.44, .5, abs(uv.x - .5) + .06 * w - .1 * (1. - uv.y)) * (.4 + .5 * fios));
  gOcl = cab;
  c = mix(c, vec3(.01, .015, .02) + vec3(.07, .1, .11) * pow(fios, 6.), cab * .93);
  return c * vinheta(uv, 1.);
}` },

    anfibio_cria: { n: 'Olho de peixe rente ao chão', olho: .75, onda: '#c8ffb0', g: `
vec2 deforma(vec2 uv){ vec2 a = aspecto(); vec2 p = (uv - .5) * a; float r = length(p);
  p *= .7 + .55 * r * r; p.y += sin(uT * .6) * .004; return p / a + .5; }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q);
  c = pow(max(c, 0.), vec3(.78)) * vec3(.72, .9, .74);
  float l = luma(c); c = mix(vec3(l) * vec3(.8, .95, .8), c, .55);
  c += (h21(uv * uRes + fract(uTempo) * 61.) - .5) * .07;
  // membrana que passa devagar (pálpebra de réptil)
  float fase = fract(uT * .09), x = fase * 3. - 1.;
  float memb = smoothstep(.25, 0., abs(uv.x - x)) * smoothstep(.0, .2, fase) * smoothstep(.55, .3, fase);
  c = mix(c, vec3(.55, .6, .5) + c * .4, memb * .55);
  // olho redondo
  float r = length((uv - .5) * aspecto());
  c *= smoothstep(.78, .62, r);
  c += vec3(.05, .07, .05) * smoothstep(.6, .75, r) * smoothstep(.85, .7, r);
  return c;
}` },

    anfibio_ovos: { n: 'Esferas rosadas', olho: .7, onda: '#ffc4dc', g: `
vec2 deforma(vec2 uv){
  vec2 a = aspecto(), cc; float k = 3.6; vec2 p = uv * a * k + vec2(0., uT * .015);
  vec3 v = celulas(p, cc); vec2 cen = (cc - vec2(0., uT * .015)) / k / a;
  return cen + (uv - cen) * .78 + (cen - .5) * .05 + vec2(sin(uT * 1.1 + v.y * 6.3), cos(uT * .9 + v.y * 4.)) * .003;
}
vec3 estilo(vec2 uv, vec2 q){
  vec2 a = aspecto(), cc; float k = 3.6; vec2 p = uv * a * k + vec2(0., uT * .015);
  vec3 v = celulas(p, cc);
  vec3 c = olhar(q) * vec3(1.25, 1.02, 1.08) + vec3(.03, .0, .01);
  vec2 pc = cc + vec2(sin(uT * .5 + v.y * 20.), cos(uT * .4 + v.y * 13.)) * .2;
  float pup = smoothstep(.075, .045, length(p - pc));
  c *= 1. - pup * .75;
  c += vec3(1., .85, .9) * smoothstep(.07, .0, length(p - cc - vec2(-.18, .2))) * .3;
  float borda = smoothstep(.0, .1, v.z);
  float veia = smoothstep(.7, .95, 1. - abs(fbm(uv * 14.) * 2. - 1.));
  vec3 memb = vec3(.62, .2, .3) * (.55 + .5 * fbm(uv * 9.)) - veia * vec3(.25, .12, .1);
  gOcl = 1. - borda;
  c = mix(memb, c, borda);
  c *= .85 + .15 * smoothstep(.55, .1, v.x);
  return c;
}` },

    aranha_gaiola: { n: 'Pelas grades da gaiola', olho: .82, onda: '#ffd9a0', g: `
vec2 deforma(vec2 uv){ return uv + vec2(sin(uT * .7) * .004, cos(uT * .5) * .003); }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q);
  c *= vec3(1.14, .95, .72); c += vec3(.07, .035, .0) * vinheta(uv, 1.3);
  vec2 a = aspecto(); float x = (uv.x - .5) * a.x + sin(uT * .7) * .01, y = uv.y;
  float curva = 1. + 2.6 * pow(max(0., y - .4), 2.);
  float bx = x * curva * 5.2, fb = abs(fract(bx) - .5);
  float barra = smoothstep(.06, .03, fb);
  float anel = smoothstep(.014, .005, abs(y - .88)) + smoothstep(.02, .008, abs(y - .1)) + smoothstep(.009, .004, abs(y - .6)) * .7;
  float ferro = clamp(max(barra, anel), 0., 1.);
  gOcl = ferro;
  vec3 corFerro = vec3(.16, .08, .04) * (.55 + .7 * fbm(uv * vec2(50., 9.)));
  c = mix(c, corFerro, ferro * .92);
  c += vec3(.5, .26, .07) * barra * smoothstep(.06, .02, fb) * .35;
  float pano = smoothstep(.8, .97, y + .13 * fbm(vec2(x * 6., uT * .08)) - .05 * sin(x * 9. + uT * .4));
  gOcl = max(gOcl, pano);
  c = mix(c, vec3(.15, .15, .14) * (.55 + .6 * fbm(uv * 22.)), pano * .9);
  return c;
}` },

    aureola_mascara: { n: 'Auréola e máscara de caveira', olho: .9, onda: '#ffe39a', g: `${ID}
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q);
  vec2 cen = vec2(.5, .56), dir = cen - uv; vec3 raio = vec3(0.);
  for (int i = 1; i <= 6; i++) raio += max(olhar(uv + dir * float(i) * .07) - .42, 0.);
  c += raio / 6. * vec3(1.3, 1., .45) * 1.4;
  float l = luma(c); c = mix(vec3(.08, .09, .03), vec3(1., .85, .48), l) * .55 + c * .55;
  vec2 p = (uv - cen) * aspecto(); float r = length(p), an = atan(p.y, p.x);
  float chama = .02 * fbm(vec2(an * 4., uT * .6));
  float halo = smoothstep(.03, 0., abs(r - .44 - chama)) + .35 * smoothstep(.14, 0., abs(r - .44));
  c += vec3(1., .76, .28) * halo * (.25 + .05 * sin(uT * 1.1));
  vec2 e1 = (uv - vec2(.31, .5)) * aspecto() * vec2(1., 1.18), e2 = (uv - vec2(.69, .5)) * aspecto() * vec2(1., 1.18);
  float o1 = length(e1), o2 = length(e2);
  float olhos = max(smoothstep(.5, .4, o1), smoothstep(.5, .4, o2));
  vec3 osso = vec3(.5, .47, .4) * (.4 + .4 * fbm(uv * 12.)) * .35;
  float aro = max(smoothstep(.56, .5, o1) - smoothstep(.5, .44, o1), smoothstep(.56, .5, o2) - smoothstep(.5, .44, o2));
  gOcl = 1. - olhos;
  c = mix(osso * .25, c, olhos) + osso * aro * .6;
  return c;
}` },

    boca_no_tronco: { n: 'Pela boca do tronco', olho: .55, onda: '#ffb0a0', g: `vec2 deforma(vec2 uv){ return uv; }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q) * vec3(1.1, .83, .74);
  float resp = .5 + .5 * sin(uT * 1.6);
  float x = abs(uv.x - .5) * aspecto().x, y = uv.y - .5;
  float abert = (.42 + .05 * resp) * sqrt(max(0., 1. - pow(y / .56, 2.)));
  float lado = step(.5, uv.x), fi = floor(uv.y * 13. + lado * .5);
  float dl = .07 + .06 * h11(fi + lado * 31.), fr = fract(uv.y * 13. + lado * .5);
  float dente = dl * (1. - abs(fr * 2. - 1.));
  float ehDente = step(abert - dente, x) * step(x, abert);
  float carne = smoothstep(abert - .004, abert + .01, x);
  gOcl = max(ehDente, carne);
  vec3 corDente = vec3(.78, .72, .55) * (.6 + .5 * (1. - fr)) * (.75 + .25 * fbm(uv * 30.));
  vec3 corCarne = vec3(.32, .05, .04) * (.5 + .7 * fbm(uv * vec2(6., 3.) + uT * .05)) + vec3(.25, .1, .08) * pow(ruido(uv * 40.), 8.);
  c = mix(c, corDente, ehDente * (1. - carne));
  c = mix(c, corCarne * (1. - .5 * smoothstep(0., .3, x - abert)), carne);
  c = mix(c, vec3(.4, .18, .15), .12 * resp * smoothstep(.55, 0., uv.y));
  return c;
}` },

    bracos_rastejante: { n: 'Sob a mortalha, entre os braços', olho: .55, onda: '#f3d98a', g: `
vec2 deforma(vec2 uv){ return uv + vec2(sin(uT * 1.1) * .004, abs(sin(uT * 1.1)) * .004); }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q); float l = luma(c);
  // cinza pálido de pano velho; o que brilha vira ouro (os anéis e pulseiras dele)
  c = mix(vec3(l) * vec3(.78, .8, .82) * 1.15, vec3(l) * vec3(1.5, 1.1, .4), smoothstep(.45, .8, l));
  // a mortalha: um capuz baixo, recortado em arco, com dobras e rasgos
  vec2 p = (uv - vec2(.5, .42)) * aspecto() * vec2(.56, .95);
  float r = length(p) + .05 * fbm(uv * 7. + 2.);
  float cap = smoothstep(.56, .64, r);
  float dobra = .5 + .5 * sin(atan(p.y, p.x) * 18. + fbm(uv * 5.) * 7.);
  vec3 pano = vec3(.23, .22, .2) * (.35 + .55 * dobra) * (.7 + .3 * fbm(uv * 40.));
  pano += vec3(.6, .55, .45) * smoothstep(.6, .58, r) * smoothstep(.54, .58, r) * .4;
  float rasgo = step(.74, fbm(uv * vec2(10., 6.) + 3.)) * cap;
  gOcl = cap * (1. - rasgo);
  c = mix(c, mix(pano, c * .5, rasgo), cap);
  // braços cinzentos de tendões puxando o corpo pela frente, com anéis de ouro
  for (int k = 0; k < 5; k++) {
    float fk = float(k), lado = mod(fk, 2.) * 2. - 1.;
    float t = uT * .9 + fk * 1.3, ph = fract(t * .25);
    vec2 om = vec2(.5 + lado * (.55 + .03 * fk), -.12);
    vec2 cot = vec2(.5 + lado * (.36 - .03 * fk), .14 + .05 * sin(t));
    vec2 mao = vec2(.5 + lado * (.18 + .06 * fk + .05 * ph), .05 + .2 * ph + .03 * fk);
    vec2 P = uv * aspecto();
    float d = min(capsula(P, om * aspecto(), cot * aspecto(), .028), capsula(P, cot * aspecto(), mao * aspecto(), .018));
    for (int j = 0; j < 3; j++) { float fj = float(j); vec2 dir = normalize(mao - cot) + vec2(lado * (fj - 1.) * .45, 0.); d = min(d, capsula(P, mao * aspecto(), (mao + dir * .06) * aspecto(), .007)); }
    float m = smoothstep(.004, -.004, d);
    float tend = .88 + .12 * sin((uv.x - uv.y) * 140. + fbm(uv * 20.) * 4.);
    vec3 pele = vec3(.13, .13, .14) * tend * (.55 + .6 * smoothstep(-.03, .0, d));
    gOcl = max(gOcl, m);
    c = mix(c, pele, m);
    c += vec3(1., .75, .2) * smoothstep(.012, .0, abs(capsula(P, mao * aspecto(), mao * aspecto(), .028))) * .8 * m;
  }
  return c;
}` },

    cabeca_cao: { n: 'Nariz de cão: cores de cão e cheiros', olho: .93, onda: '#fff1b0', g: `
vec2 deforma(vec2 uv){ float f = fract(uT * .5); float fung = smoothstep(.0, .06, f) * smoothstep(.22, .08, f); return uv + vec2(0., fung * .004 * sin(uT * 30.)); }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = borrar(q, 1.4) * 1.35;
  // dicromata (vermelho e verde viram amarelo e oliva; azul fica)
  c = vec3(.367 * c.r + .861 * c.g - .228 * c.b, .28 * c.r + .673 * c.g + .047 * c.b, -.012 * c.r + .043 * c.g + .969 * c.b);
  c = max(c, 0.); c = pow(c, vec3(.8));
  c = mix(vec3(luma(c)), c, 1.25) * vec3(1.05, 1., .92);
  // o cheiro no ar: fiapos amarelados que sobem devagar
  float ch = fbm(vec2(uv.x * 4., uv.y * 2. - uT * .15) + fbm(uv * 3. + uT * .05));
  c += vec3(.55, .48, .2) * smoothstep(.55, .8, ch) * .12;
  // focinho comprido fora de foco, com a ponta úmida e escura
  vec2 p = (uv - vec2(.5, -.1)) * aspecto();
  float foc = smoothstep(.03, -.05, length(p * vec2(1.2, .95)) - .3);
  float ponta = smoothstep(.03, -.02, length((uv - vec2(.5, .11)) * aspecto() * vec2(1., 1.6)) - .05);
  vec3 pelo = vec3(.55, .5, .41) * (.45 + .9 * uv.y) * (.85 + .15 * fbm(vec2(uv.x * 40., uv.y * 6.)));
  pelo = mix(pelo, vec3(.05, .045, .04) + vec3(.25) * smoothstep(.02, .0, length((uv - vec2(.485, .135)) * aspecto()) - .01), ponta * .9);
  gOcl = foc;
  c = mix(c, pelo, foc * .95);
  // olhos grandes dos lados: o campo é largo, com as bordas escuras e úmidas
  float lat = abs(uv.x - .5) * 2.;
  c *= .55 + .45 * smoothstep(1.05, .6, length(vec2(lat * .8, (uv.y - .55) * 1.3)));
  return c;
}` },

    cabeca_tv: { n: 'Tubo de televisão', olho: .94, onda: '#e0f0ff', g: `
vec2 deforma(vec2 uv){ vec2 p = uv * 2. - 1.; p *= 1. + .08 * (p.yx * p.yx); return p * .5 + .5; }
vec3 estilo(vec2 uv, vec2 q){
  if (q.x < 0. || q.x > 1. || q.y < 0. || q.y > 1.) { gOcl = 1.; return vec3(.01); }
  vec3 c = olhar(q) * .88 + olhar(q + vec2(.014, 0.)) * .22;
  c *= vec3(.86, 1., 1.08);
  c *= .76 + .24 * sin(q.y * uRes.y * 1.5);
  float m = mod(gl_FragCoord.x, 3.);
  c *= m < 1. ? vec3(1.12, .9, .9) : m < 2. ? vec3(.9, 1.12, .9) : vec3(.9, .9, 1.12);
  c *= 1. + .07 * smoothstep(.12, 0., abs(fract(q.y * .5 - uT * .07) - .5));
  c += (h21(uv * uRes + fract(uTempo) * 37.) - .5) * .06;
  vec2 b = abs(q - .5) * 2.; float bord = smoothstep(1., .9, max(b.x, b.y)); c *= bord;
  return c * (.6 + .4 * vinheta(q, .9));
}` },

    cabelos_longos: { n: 'Cortina de cabelo', olho: .93, onda: '#d9ffd0', g: `
vec2 deforma(vec2 uv){ return uv + vec2(sin(uv.y * 3. + uT * .3) * .003, 0.); }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q) * 1.15; float l = luma(c);
  c = mix(vec3(l), c, .35) * vec3(.82, .96, .8);
  c *= smoothstep(1., .25, length((uv - .5) * aspecto()) * 1.1);
  float x = uv.x * aspecto().x;
  float cab = 0., brilho = 0.;
  for (int k = 0; k < 3; k++) {
    float fk = float(k), fr = 70. + fk * 37.;
    float o = fbm(vec2(x * (1.2 + fk * .4) + fk * 5., uv.y * 1.1 + uT * .03));
    float s = abs(sin((x + o * .25 + sin(uv.y * (2. + fk) + uT * .25 + fk) * .02) * fr));
    float dens = .1 + .55 * smoothstep(.15, .55, abs(uv.x - .5)) + .3 * smoothstep(.65, 1., uv.y) - fk * .04;
    float m = smoothstep(1. - dens, 1. - dens + .06, s) * step(.3, ruido(vec2(x * fr * .1, fk)));
    cab = max(cab, m * (.75 + .25 * fk / 2.)); brilho = max(brilho, pow(s, 30.) * m);
  }
  gOcl = cab;
  vec3 cor = vec3(.015, .012, .012) + vec3(.13, .02, .05) * brilho;
  return mix(c, cor, cab * .96);
}` },

    eletrico_agachado: { n: 'Só arestas elétricas', olho: .75, onda: '#d6b8ff', g: `${ID}
vec3 estilo(vec2 uv, vec2 q){
  vec3 b = olhar(q);
  float e = clamp(bordaLuma(q, 1.2) * 3. + bordaProf(q) * .9, 0., 1.);
  float arco = ruido(uv * vec2(28., 9.) + vec2(uT * 2., uT * 6.));
  vec3 c = b * .1 * vec3(.5, .4, .9);
  c += vec3(.72, .48, 1.) * e * (1. + .55 * arco);
  c += max(b - .62, 0.) * vec3(1.1, .8, 1.6) * 1.4;
  // um raio fino que cruza a tela de vez em quando e some devagar
  float seg = floor(uT * .35), fs = fract(uT * .35), on = smoothstep(.0, .08, fs) * smoothstep(.45, .15, fs);
  float yr = .5 + .3 * (h11(seg) - .5) + .18 * (fbm(vec2(uv.x * 5., seg)) - .5);
  c += vec3(.85, .7, 1.) * smoothstep(.006, .0, abs(uv.y - yr)) * on * .5 * step(h11(seg + 4.), .6);
  return c;
}` },

    enraizado: { n: 'Sob o chapéu de palha', olho: .9, onda: '#e8f5b0', g: `
vec2 deforma(vec2 uv){ return uv + vec2(sin(uT * .4) * .002, 0.); }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q) * 1.1; float l = luma(c);
  c = vec3(l) * vec3(.95, .9, .62) * .8 + c * .35;
  vec2 a = aspecto(); float x = (uv.x - .5) * a.x;
  // aba do chapéu: palha trançada em diagonal, luz entrando pelos furos
  float aba = .8 - .1 * x * x + .008 * sin(x * 24.);
  float chap = smoothstep(aba - .008, aba + .008, uv.y);
  vec2 tp = vec2(x + uv.y, x - uv.y) * 14.;
  float tr = .5 + .25 * sin(tp.x * 6.2832) + .25 * sin(tp.y * 6.2832);
  float fio = smoothstep(.2, .8, abs(fract(tp.x) - .5) * 2.) * .5 + smoothstep(.2, .8, abs(fract(tp.y) - .5) * 2.) * .5;
  vec3 palha = vec3(.36, .27, .12) * (.35 + .55 * tr) * (.6 + .4 * fio);
  palha *= .45 + .55 * smoothstep(aba + .12, aba, uv.y);
  palha += vec3(.5, .4, .2) * smoothstep(.85, 1., fbm(uv * vec2(30., 10.))) * .3;
  palha = mix(palha, vec3(.18, .12, .05), smoothstep(.012, .0, abs(uv.y - aba)) * .8);
  gOcl = chap;
  c = mix(c, palha, chap);
  // galhos com folhas entrando pelos lados
  for (int k = 0; k < 6; k++) {
    float fk = float(k), lado = mod(fk, 2.) * 2. - 1.;
    vec2 cen = vec2(.5 + lado * (.44 + .04 * h11(fk)), .18 + .11 * fk + .012 * sin(uT * .6 + fk));
    vec2 p = (uv - cen) * a; float an = .7 * lado + .5 * sin(fk * 2.3) + .05 * sin(uT * .5 + fk);
    p = mat2(cos(an), -sin(an), sin(an), cos(an)) * p;
    float folha = smoothstep(.006, -.006, length(p * vec2(1., 2.6)) - .085);
    float galho = smoothstep(.006, .0, abs(p.y)) * step(0., p.x * -lado) * step(abs(p.x), .2);
    vec3 cf = vec3(.08, .14, .04) * (.6 + .6 * smoothstep(.005, .0, abs(p.y)));
    gOcl = max(gOcl, folha);
    c = mix(c, cf, folha * .95); c = mix(c, vec3(.1, .07, .03), galho * .9);
  }
  float raiz = smoothstep(.93, .99, 1. - abs(fbm(uv * vec2(7., 4.)) * 2. - 1.)) * smoothstep(.28, .0, uv.y);
  c = mix(c, vec3(.08, .05, .02), raiz);
  return c * (.6 + .4 * vinheta(uv, 1.05));
}` },

    esfolado: { n: 'Carne viva', olho: .93, onda: '#ffd0c0', g: `vec2 deforma(vec2 uv){ return uv; }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q) * 1.2; float l = luma(c);
  c = vec3(l * 1.35, l * .42, l * .34) + c * .16;
  float fase = fract(uTempo * 1.05);
  float bat = exp(-fase * 7.) + .55 * exp(-max(0., fase - .26) * 9.) * step(.26, fase);
  float r = length((uv - .5) * aspecto());
  float rv = 1. - abs(fbm(uv * vec2(4., 3.2) + 2.) * 2. - 1.);
  float rv2 = 1. - abs(fbm(uv * vec2(9., 7.) + 7.) * 2. - 1.);
  float perto = smoothstep(.3, .8, r);
  float vei = max(smoothstep(.93, .985, rv), smoothstep(.95, .99, rv2) * .7) * perto;
  c *= 1. - perto * (.4 + .1 * bat);
  c = mix(c, vec3(.35, .0, .02) * (1. + .5 * bat), vei * .9);
  gOcl = vei * .7;
  c += vec3(.12, .0, .0) * pow(ruido(uv * 50.), 10.);
  return c;
}` },

    estatica_tres_cabecas: { n: 'Três telas de chiado', olho: .94, onda: '#efe0ff', g: `
vec2 deforma(vec2 uv){
  float pn = floor(uv.x * 3.), lx = fract(uv.x * 3.);
  float salto = step(.86, h11(floor(uT * .5) + pn * 7.)) * .02;
  float off = (pn - 1.) * .24;
  float y = uv.y + (pn == 1. ? 0. : .004 * sin(uT * 1.7 + pn * 3.)) + salto;
  return vec2(.5 + (lx - .5) * .36 + off + salto * .5, y);
}
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q); c.r = olhar(q + vec2(.005, 0.)).r;
  float l = luma(c); c = mix(c, vec3(l) * vec3(.96, .86, 1.12), .55);
  float n = h21(floor(uv * uRes * .5) + floor(uTempo * 24.) * 17.);
  c = mix(c, vec3(n) * vec3(.9, .82, 1.), .16);
  float tr = smoothstep(.025, 0., abs(fract(uv.y + uT * .06) - .5));
  c += vec3(.12, .1, .15) * tr;
  float lx = fract(uv.x * 3.); float gap = smoothstep(.0, .012, lx) * smoothstep(1., .988, lx);
  return c * gap * (.75 + .25 * vinheta(vec2(lx, uv.y), 1.2));
}` },

    fera_juba_lodo: { n: 'Por baixo da juba de lodo', olho: .45, onda: '#e6d8a8', g: `
vec2 deforma(vec2 uv){ return uv + vec2(0., sin(uT * .8) * .003); }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q) * 1.1; float l = luma(c);
  c = mix(vec3(l) * vec3(.92, .86, .64), c, .4);
  vec2 a = aspecto(); float x = uv.x * a.x;
  // mechas grossas e molhadas de lodo caindo do alto, balançando
  float juba = 0., brilho = 0.;
  for (int k = 0; k < 2; k++) {
    float fk = float(k), fr = 9. + fk * 6.;
    float sx = x * fr + fbm(vec2(x * 2. + fk, uv.y * 1.5)) * 2. + sin(uT * .5 + fk) * .2;
    float cel = floor(sx), f = fract(sx) - .5;
    float comp = .5 + .28 * h11(cel + fk * 13.) + .03 * sin(uT * .7 + cel);
    float larg = .32 + .12 * h11(cel + 4.);
    float m = smoothstep(larg, larg - .08, abs(f)) * smoothstep(comp, comp + .05, uv.y + .04 * (1. - abs(f) * 2.));
    // gota pendurada na ponta
    float gy = comp - .02 - fract(uT * .15 + h11(cel)) * .25;
    m = max(m, smoothstep(.12, .06, length(vec2(f * .9, (uv.y - gy) * fr * .5))) * step(.4, h11(cel + 9.)));
    juba = max(juba, m); brilho = max(brilho, m * pow(1. - abs(f) * 2., 6.));
  }
  vec3 lodo = vec3(.1, .085, .045) * (.5 + .6 * fbm(uv * vec2(14., 4.))) + vec3(.35, .33, .2) * brilho * .25;
  gOcl = juba;
  c = mix(c, lodo, juba * .97);
  // barro seco rachado só nos cantos de baixo
  vec2 cc; vec3 v = celulas(uv * a * 6., cc);
  float canto = smoothstep(.72, .95, length((uv - vec2(.5, .7)) * a * vec2(.7, 1.3)));
  c = mix(c, vec3(.3, .26, .18) * (.6 + .4 * v.y) * (1. - smoothstep(.05, .0, v.z) * .7), canto * .85);
  gOcl = max(gOcl, canto);
  return c;
}` },

    fera_pelo: { n: 'Um olho vermelho', olho: .9, onda: '#ffb4a8', g: `
vec2 deforma(vec2 uv){ float f = fract(uT * .4); float s = smoothstep(.0, .05, f) * smoothstep(.25, .08, f); return uv + vec2(sin(uT * 23.) * .003, cos(uT * 19.) * .002) * s; }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q) * 1.15;
  float l = luma(c); c = mix(c, vec3(l * 1.4, l * .3, l * .22), .7);
  // o lado sem olho: escuro, só um vulto borrado
  float cego = smoothstep(.42, .12, uv.x);
  c = mix(c, borrar(q, 6.) * vec3(.25, .05, .04), cego * .92);
  // pelo branco-acinzentado empapado de sangue nas bordas, fio a fio
  vec2 p = (uv - vec2(.6, .5)) * aspecto(); float r = length(p), an = atan(p.y, p.x);
  float fio = smoothstep(.35, .8, ruido(vec2(an * 70., r * 4.))) * .7 + .3 * ruido(vec2(an * 160., r * 9.));
  float pelo = smoothstep(.66, .86, r + .14 * fbm(vec2(an * 5., 3.)) + .04 * fio);
  vec3 cor = mix(vec3(.42, .4, .37), vec3(.32, .02, .02), smoothstep(.35, .65, fbm(vec2(an * 2.5, r * 3.))));
  gOcl = pelo;
  c = mix(c, cor * (.2 + .5 * fio) * (1. - .45 * smoothstep(.75, 1.05, r)), pelo * .95);
  return c;
}` },

    filme_queimado: { n: 'Fotogramas queimando', olho: .95, onda: '#ffe2b8', g: `
vec2 deforma(vec2 uv){ return uv + vec2(0., sin(uT * 1.3) * .002 + (h11(floor(uTempo * 8.)) - .5) * .0012); }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q) * .95 + olhar(q + vec2(.025, .012)) * .22;
  float l = luma(c); c = vec3(l) * vec3(1.15, .92, .62);
  c += (h21(uv * uRes * .7 + floor(uTempo * 12.)) - .5) * .09;
  float risco = step(.9965, h21(vec2(floor(uv.x * uRes.x * .5), floor(uTempo * 1.6))));
  c = mix(c, vec3(.9, .82, .66), risco * .22);
  c *= 1. - step(.9993, h21(floor(uv * uRes * .25) + floor(uTempo * 2.))) * .7;
  float borda = 1. - smoothstep(.06, .072, uv.x) * smoothstep(.94, .928, uv.x);
  float fy = fract(uv.y * 7. + uT * .05);
  vec2 fp = vec2((uv.x < .5 ? uv.x - .03 : uv.x - .97) * aspecto().x, (fy - .5) * .14);
  float furo = smoothstep(.004, .0, max(abs(fp.x) - .016, abs(fp.y) - .028));
  c = mix(c, vec3(.08, .05, .03), borda); c = mix(c, vec3(.75, .68, .55), furo * borda);
  gOcl = borda;
  // a queima: só nos cantos, avançando devagar, com a borda acesa
  vec2 cn = abs(uv - .5) * 2.;
  float e = pow(pow(cn.x, 4.) + pow(cn.y, 4.), .25);
  float qm = e + (fbm(uv * 3.2 + vec2(0., uT * .02)) - .5) * .5 + .05 * sin(uT * .2);
  float queima = smoothstep(1.12, 1.15, qm), aro = smoothstep(1.07, 1.12, qm) - queima;
  c = mix(c, vec3(.02, .01, .0), queima);
  c += vec3(1., .42, .08) * aro * .75;
  gOcl = max(gOcl, queima);
  return c * (.97 + .03 * sin(uT * 5.));
}` },

    fitas_magenta: { n: 'Fitas de tinta', olho: .9, onda: '#ffc0ec', g: `
vec2 deforma(vec2 uv){ vec2 f = vec2(fbm(uv * 3. + uT * .08), fbm(uv * 3. + 7. + uT * .07)) - .5; float r = length((uv - .5) * aspecto()); return uv + f * (.03 + .06 * r); }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q); float l = luma(c);
  vec3 g = l < .4 ? mix(vec3(.12, .03, .2), vec3(.85, .16, .6), l / .4) : mix(vec3(.85, .16, .6), vec3(1., .86, .95), (l - .4) / .6);
  c = mix(c, g, .72);
  float r = length((uv - .5) * aspecto());
  float fita = sin((uv.x + uv.y * .3) * 13. + fbm(uv * 2. + uT * .1) * 9. + uT * .3);
  c += vec3(1., .3, .75) * smoothstep(.96, 1., fita) * (.15 + .5 * smoothstep(.3, .8, r));
  float bord = smoothstep(.45, .85, r + .15 * fbm(uv * 4. + uT * .05));
  c = mix(c, vec3(.5, .06, .4) * (.5 + .6 * fbm(uv * 5. - uT * .06)), bord * .8);
  return c;
}` },

    lodo: { n: 'Película oleosa', olho: .93, onda: '#c8d0ff', g: `
float pinga(vec2 uv, out float dx){
  float col = floor(uv.x * 28.), h = h11(col); dx = 0.;
  float lado = smoothstep(.22, .4, abs(uv.x - .5));
  if (h < .45 || lado < .01) return 0.;
  float y0 = 1.15 - fract(uT * (.025 + .04 * h) + h * 7.) * 1.5;
  float cx = (col + .5) / 28. + .006 * sin(uv.y * 20. + h * 9.);
  float w = .004 + .003 * h, dxx = (uv.x - cx) / w;
  float corpo = smoothstep(1., .5, abs(dxx)) * step(y0, uv.y) * smoothstep(y0 + .3 + .3 * h, y0 + .05, uv.y);
  float cab = smoothstep(1.6, .8, length(vec2(dxx * .7, (uv.y - y0) / w * .6)));
  float m = max(corpo, cab) * lado; dx = dxx * m; return m;
}
vec2 deforma(vec2 uv){ float dx; float m = pinga(uv, dx); return uv + vec2(dx * .004, 0.) * m; }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q) * .85; c = pow(max(c, 0.), vec3(1.15));
  float l = luma(c), r = length((uv - .5) * aspecto());
  // a película: só nas bordas fica grossa; o centro continua limpo
  float pel = smoothstep(.25, .75, r);
  float h = fbm(uv * 2.4 + vec2(uT * .03, uT * .02)) * 3.;
  vec3 irid = .5 + .5 * cos(6.2832 * (h + vec3(0., .33, .67)));
  c = mix(c, c * .35 + irid * .07, pel * .8);
  c += irid * .06 * (.2 + l) * (1. - pel * .5);
  float dx; float m = pinga(uv, dx);
  gOcl = max(m, pel * .6);
  c = mix(c, vec3(.0), m * .8); c += vec3(.45, .5, .6) * m * smoothstep(.2, .9, -dx) * .2;
  return c * (.25 + .75 * smoothstep(.95, .35, r));
}` },

    marionetista: { n: 'Fios vermelhos no palco', olho: .93, onda: '#ffd0d0', g: `${ID}
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q); float l = luma(c);
  float verm = smoothstep(.06, .22, c.r - max(c.g, c.b));
  c = mix(vec3(l) * vec3(.95, .93, .9), c * vec3(1.25, .7, .7), verm);
  c *= .25 + .75 * smoothstep(.95, .2, length((uv - vec2(.5, .62)) * aspecto() * vec2(.85, 1.)));
  for (int k = 0; k < 7; k++) {
    float fk = float(k), x0 = .08 + fk * .14 + .012 * sin(uT * .6 + fk);
    float x = x0 + (1. - uv.y) * .07 * sin(uT * .45 + fk * 1.7);
    float fim = .18 + .35 * h11(fk);
    float d = abs(uv.x - x) * uRes.x;
    float fio = smoothstep(1.8, .3, d) * step(fim, uv.y);
    c = mix(c, vec3(.75, .03, .03), fio * .9);
  }
  c += (h21(uv * uRes + fract(uTempo) * 13.) - .5) * .04;
  return c;
}` },

    mascara_sorriso: { n: 'Pelas frestas da máscara', olho: .93, onda: '#fff0e0', g: `vec2 deforma(vec2 uv){ return uv; }
float fresta(vec2 uv, vec2 c){
  vec2 p = (uv - c) * aspecto();
  float topo = .2 - .75 * p.x * p.x, base = -.17 - .25 * p.x * p.x;
  return smoothstep(-.03, .03, topo - p.y) * smoothstep(-.03, .03, p.y - base) * smoothstep(.62, .52, abs(p.x));
}
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q) * vec3(1.08, 1., .94);
  float v = max(fresta(uv, vec2(.3, .53)), fresta(uv, vec2(.7, .53)));
  // o interior da máscara: porcelana escura, mais clara junto das frestas
  vec3 dentro = vec3(.16, .14, .13) * (.4 + .4 * fbm(uv * 6.)) * (.5 + .8 * smoothstep(.0, .8, v + .2));
  gOcl = 1. - v;
  c = mix(dentro, c, v);
  float cach = smoothstep(.13, .0, uv.y + .03 * sin(uv.x * 8.));
  c = mix(c, vec3(.42, .05, .05) * (.6 + .5 * fbm(uv * vec2(20., 6.))), cach * .9);
  gOcl = max(gOcl, cach);
  return c;
}` },

    moldura: { n: 'Pintura a óleo rachada', olho: .94, onda: '#ffe6a0', g: `
vec2 deforma(vec2 uv){ float a = fbm(uv * 7.) * 6.2832; return uv + vec2(cos(a), sin(a)) * .004; }
vec3 estilo(vec2 uv, vec2 q){
  float a = fbm(uv * 7.) * 6.2832; vec2 d = vec2(cos(a), sin(a));
  vec3 c = (olhar(q) + olhar(q + d * .007)) * .5;
  c = mix(c, floor(c * 7. + .5) / 7., .55);
  c = c * vec3(1.02, .9, .66) + vec3(.03, .02, .0);
  vec2 cc; vec3 v = celulas(uv * aspecto() * 16., cc);
  c *= 1. - smoothstep(.05, .0, v.z) * .5;
  c *= .93 + .07 * sin(uv.x * uRes.x * .9) * sin(uv.y * uRes.y * .9);
  vec2 b = abs(uv - .5) * 2.; vec2 m = vec2(.075 / aspecto().x, .075) * 2.;
  float fr = max(smoothstep(1. - m.x, 1. - m.x + .004, b.x), smoothstep(1. - m.y, 1. - m.y + .006, b.y));
  float ins = max((b.x - (1. - m.x)) / m.x, (b.y - (1. - m.y)) / m.y);
  vec3 ouro = vec3(.72, .52, .18) * (.45 + .65 * fbm(uv * 70.)) * (.6 + .6 * sin(ins * 9.));
  gOcl = fr;
  c = mix(c, ouro, fr);
  c *= .7 + .3 * vinheta(uv, 1.);
  return c;
}` },

    muitos_bracos: { n: 'Entre lágrimas e braços', olho: .92, onda: '#ffe0d8', g: `
float lagr(vec2 uv, out vec2 off){
  vec2 a = aspecto(); vec2 p = uv * a * 4.; p.y += uT * .07;
  vec2 id = floor(p), f = fract(p) - .5; float h = h21(id); off = vec2(0.);
  if (h < .7) return 0.;
  vec2 c = vec2(h21(id + 4.) - .5, h21(id + 9.) - .5) * .4; float r = .1 + .1 * h21(id + 2.);
  vec2 d = (f - c) / r; float m = smoothstep(1., .75, length(d * vec2(1., .8)));
  off = -d * m * .035 / a; return m;
}
vec2 deforma(vec2 uv){ vec2 o; lagr(uv, o); return uv + o + vec2(sin(uv.y * 9. + uT), 0.) * .003 * smoothstep(.4, 0., uv.y); }
vec3 estilo(vec2 uv, vec2 q){
  float bw = clamp(smoothstep(.35, .0, uv.y) + smoothstep(.35, .5, abs(uv.x - .5)) * .7, 0., 1.);
  vec3 c = mix(olhar(q) * 1.1, borrar(q, 4.5), bw);
  c = mix(c, vec3(luma(c)) * vec3(1.12, .9, .84), .55);
  vec2 o; float m = lagr(uv, o); c = mix(c, c * 1.2 + vec3(.05, .04, .04), m * .5);
  // mãos pálidas abraçando pelas bordas: dedos finos que entram e recuam
  vec2 a = aspecto(), P = uv * a; float dmin = 1e3;
  for (int k = 0; k < 4; k++) {
    float fk = float(k), lado = k < 2 ? -1. : 1., yy = mod(fk, 2.) < 1. ? .3 : .68;
    vec2 pulso = vec2(lado < 0. ? -.02 : 1.02, yy);
    vec2 palma = vec2(lado < 0. ? .075 + .012 * sin(uT * .8 + fk) : .925 - .012 * sin(uT * .8 + fk), yy + .02);
    float d = capsula(P, pulso * a, palma * a, .04);
    d = min(d, length((P - palma * a) * vec2(1., .85)) - .045);
    for (int j = 0; j < 4; j++) { float fj = float(j); vec2 dir = normalize(vec2(-lado, (fj - 1.5) * .5)); d = min(d, capsula(P, palma * a, palma * a + dir * (.1 + .012 * (1.5 - abs(fj - 1.5))) * vec2(1., .9), .011)); }
    dmin = min(dmin, d);
  }
  float mb = smoothstep(.004, -.004, dmin);
  vec3 pele = vec3(.8, .72, .66) * (.5 + .5 * smoothstep(-.03, .0, dmin));
  gOcl = mb;
  c = mix(c, pele, mb * .95);
  vec2 cn = min(uv, 1. - uv) * a;
  float bordaFoto = smoothstep(.02, .014, min(cn.x, cn.y));
  c = mix(c, vec3(.9, .86, .78), bordaFoto * .75);
  return c;
}` },

    olhos_muitos: { n: 'Mosaico de olhos', olho: .8, onda: '#e0ffd8', g: `
vec2 olhoCel(vec2 uv, out vec2 lc, out vec2 id){
  vec2 a = aspecto(); vec2 g = vec2(3.4, 3.6); vec2 p = uv * a * g; float row = floor(p.y); p.x += mod(row, 2.) * .5;
  id = floor(p); lc = fract(p) - .5; return (id + .5 - vec2(mod(row, 2.) * .5, 0.)) / g / a;
}
vec2 deforma(vec2 uv){ vec2 lc, id; vec2 cen = olhoCel(uv, lc, id); return mix(uv, cen, .12); }
vec3 estilo(vec2 uv, vec2 q){
  vec2 lc, id; olhoCel(uv, lc, id);
  float ph = h21(id), pis = smoothstep(.9, 1., sin(uT * (.35 + .3 * ph) + ph * 40.));
  float ab = .42 * (1. - pis * .95) * (1. - pow(abs(lc.x) / .5, 2.));
  float olho = smoothstep(.02, -.02, abs(lc.y) - ab) * step(abs(lc.x), .49);
  vec3 c = olhar(q) * 1.3 * vec3(.95, 1.04, .9);
  c *= .78 + .22 * smoothstep(.3, .05, length(lc * vec2(1., 1.6)));
  c += vec3(1.) * smoothstep(.04, .0, length(lc - vec2(-.12, .1))) * .25;
  vec3 pele = vec3(.22, .25, .2) * (.5 + .6 * fbm(uv * 25.)) * (.6 + .4 * smoothstep(.0, .2, abs(lc.y) - ab));
  gOcl = 1. - olho;
  return mix(pele, c, olho);
}` },

    orelhas: { n: 'Quase cego: vê pelos ecos', olho: .93, onda: '#f2f6ff', cego: .94, ganho: 1.1, eco: 1, g: `
vec2 deforma(vec2 uv){ return uv + vec2(sin(uT * .9), cos(uT * .7)) * .0015; }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q);
  c = vec3(luma(c)) * vec3(.85, .88, .95);
  c += vec3(.015, .017, .024) * fbm(uv * 3. + uT * .03);
  return c * (.4 + .6 * vinheta(uv, 1.25));
}` },

    protese: { n: 'Radiografia', olho: .92, onda: '#bff4ff', g: `${ID}
float ecg(float x){ x = fract(x); return smoothstep(.0, .02, x - .4) * smoothstep(.06, .02, x - .4) * 1. - smoothstep(.0, .02, x - .46) * smoothstep(.05, .02, x - .46) * .45 + smoothstep(0., .05, x - .55) * smoothstep(.15, .05, x - .55) * .2; }
vec3 estilo(vec2 uv, vec2 q){
  vec3 b = olhar(q); float l = luma(b);
  float e = clamp(bordaLuma(q, 1.3) * 2.5 + bordaProf(q) * .6, 0., 1.);
  float v = pow(1. - clamp(l * 1.6, 0., 1.), 1.7) * .55 + e * .85;
  vec3 c = vec3(.5, .78, 1.) * v + vec3(.03, .05, .07);
  c += (h21(uv * uRes + fract(uTempo) * 7.) - .5) * .05;
  for (int k = 0; k < 5; k++) {
    float fk = float(k), x = .14 + fk * .18 + .03 * sin(uv.y * 3. + uT * .4 + fk);
    float cab = smoothstep(.022, .012, abs(uv.x - x)) * smoothstep(.72, .86, uv.y + .05 * h11(fk));
    c = mix(c, vec3(.01, .02, .03), cab * .9);
  }
  float y = .085 + .04 * ecg(uv.x * 1.4 - uTempo * .3);
  c += vec3(.3, 1., .5) * smoothstep(.004, .0, abs(uv.y - y)) * .8;
  return c * (.6 + .4 * vinheta(uv, 1.));
}` },

    retalhos_quadrupede: { n: 'Retalhos costurados', olho: .8, onda: '#ffe0d0', g: `
vec2 deforma(vec2 uv){ vec2 cc; vec3 v = celulas(uv * aspecto() * 2.6, cc); return uv + (vec2(h11(v.y * 91.), h11(v.y * 37.)) - .5) * .02; }
vec3 estilo(vec2 uv, vec2 q){
  vec2 cc; vec3 v = celulas(uv * aspecto() * 2.6, cc);
  vec3 c = olhar(q) * 1.15;
  float t = floor(v.y * 4.);
  vec3 tom = t < 1. ? vec3(1.45, .62, .55) : t < 2. ? vec3(1.15, 1., .76) : t < 3. ? vec3(.85, .85, .85) : vec3(1.05, .7, .6);
  c = mix(vec3(luma(c)), c, .6) * tom;
  float an = v.y * 6.28; vec2 r = mat2(cos(an), -sin(an), sin(an), cos(an)) * uv * uRes * .22;
  c *= .88 + .12 * sin(r.x * 3.) * sin(r.y * 3.);
  float cost = smoothstep(.03, .0, v.z);
  // pontos em cruz: um X a cada passo ao longo da costura
  vec2 sp = fract(uv * uRes / 9.) - .5;
  float xis = smoothstep(.12, .0, min(abs(sp.x - sp.y), abs(sp.x + sp.y))) * smoothstep(.07, .02, v.z) * step(.25, abs(sp.x) + abs(sp.y));
  gOcl = cost;
  c = mix(c, vec3(.05, .03, .02), cost * .85);
  c = mix(c, vec3(.88, .8, .6), xis * .8);
  return c * (.62 + .38 * vinheta(uv, 1.05));
}` },

    sobretudo_vazio: { n: 'Pelos buracos do vazio', olho: .93, onda: '#d9c0ff', g: `
vec2 deforma(vec2 uv){ vec2 b = floor(uv * vec2(14., 22.)); float g = step(.988, h21(b + floor(uTempo * 1.4) * 3.)); return uv + vec2(g * .025, 0.); }
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q);
  float r = length((uv - .5) * aspecto());
  float f = fbm(uv * vec2(3., 2.4) * aspecto() + vec2(uT * .02, -uT * .015)) + .38 * smoothstep(.6, .0, r);
  float buraco = smoothstep(.6, .63, f), aro = smoothstep(.52, .6, f) - buraco;
  vec3 vazio = vec3(.03, .0, .06) + c * vec3(.12, .08, .18);
  float pt = step(.993, h21(floor(uv * uRes / 4. + vec2(0., -uT * 6.))));
  vazio += vec3(.6, .3, 1.) * pt * .5;
  c = mix(vazio, c, buraco);
  c += vec3(.62, .3, 1.) * aro * 1.2;
  return c;
}` },

    texto_vivo: { n: 'Tinta e letras', olho: .93, onda: '#c0301c', aux: 'glifos', papel: 1, g: `vec2 deforma(vec2 uv){ return uv; }
vec3 estilo(vec2 uv, vec2 q){
  float cs = max(6., floor(uRes.y / 72.));
  vec2 cel = floor(uv * uRes / cs), lc = fract(uv * uRes / cs);
  vec2 cuv = (cel + .5) * cs / uRes;
  vec3 s = olhar(cuv);
  // letras só onde o mundo tem forma: arestas e o que é claro; o resto é papel
  float e = clamp(bordaLuma(cuv, cs * .6) * 4. + bordaProf(cuv) * 1.2, 0., 1.);
  float l = luma(s);
  float dens = clamp(e * 1.7 + smoothstep(.06, .55, l) * .75, 0., 1.);
  float gi = floor(dens * 15.99);
  float var = mod(cel.y + floor(uT * .6 + h21(cel) * 4.), 4.);
  float g = gi < .5 ? 0. : texture2D(tAux, vec2((gi + lc.x) / 16., (var + 1. - lc.y) / 4.)).r;
  vec3 papel = vec3(.9, .85, .72) * (.86 + .14 * fbm(uv * 7.));
  papel *= .74 + .26 * smoothstep(.0, .3, l + .05);
  // linhas de caderno que seguem o chão ao longe: dão a noção de espaço
  float dz = distV(cuv); papel *= 1. - .06 * smoothstep(.6, 1., sin(log(max(dz, .5)) * 14.)) * step(uv.y, .5);
  vec3 tinta = mix(vec3(.08, .06, .05), s * .6, .2);
  vec3 c = mix(papel, tinta, g * .95);
  return c * (.78 + .22 * vinheta(uv, 1.));
}` },

    tita_algemado: { n: 'Fúria acorrentada', olho: .9, onda: '#ffc8a0', g: `
vec2 deforma(vec2 uv){ float s = uAnda * pow(abs(sin(uPasso * .5)), 14.) * .007; return uv + vec2(0., -s); }
float elo(vec2 uv, vec2 a, vec2 b){
  vec2 ab = b - a, p = uv - a; float t = clamp(dot(p, ab) / dot(ab, ab), 0., 1.); float L = length(ab);
  vec2 n = normalize(vec2(-ab.y, ab.x)); float dperp = dot(p, n), s = t * L * 13.;
  float k = floor(s), f = fract(s) - .5;
  vec2 lp = vec2(f, dperp * 13.);
  float anel = mod(k, 2.) < 1. ? abs(length(lp * vec2(1., 1.7)) - .36) - .1 : max(abs(lp.x) - .45, abs(lp.y) - .07);
  return smoothstep(.04, -.02, anel) * step(0., t) * step(t, 1.);
}
vec3 estilo(vec2 uv, vec2 q){
  vec3 c = olhar(q);
  c = mix(c, vec3(luma(c)) * vec3(1.25, .72, .55), .55); c = (c - .5) * 1.12 + .5;
  float r = length((uv - .5) * aspecto());
  c = mix(c, vec3(.25, .02, .01), smoothstep(.4, .95, r) * (.55 + .08 * sin(uT * 1.4)));
  vec2 cc; vec3 v = celulas(uv * aspecto() * 7., cc);
  c += vec3(.85, .22, .05) * smoothstep(.035, .0, v.z) * smoothstep(.45, .8, r) * .65;
  vec2 a = aspecto();
  float ch = max(elo(uv * a, vec2(0., .32) * a, vec2(.2, -.05) * a), elo(uv * a, vec2(1., .3) * a, vec2(.78, -.05) * a));
  gOcl = ch;
  c = mix(c, vec3(.2, .11, .06) * (.6 + .6 * fbm(uv * 40.)), ch);
  return c;
}` },
  };

  /* ---------- atlas de letras do texto vivo: 16 densidades × 4 variações, feito na hora ---------- */
  function atlasGlifos(T) {
    const W = 32, cv = document.createElement('canvas'); cv.width = W * 16; cv.height = W * 4;
    const x = cv.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, cv.width, cv.height);
    const cand = ' .,\'`:;-~"^!il|/\\()[]{}?<>+=*1ijrtfcvxzsnuoaeLJTYCZ7FPEVXKUHNOGQDSAR234569ab0dpqgwhkmy#%&@8BWM';
    const t = document.createElement('canvas'); t.width = W; t.height = W; const tx = t.getContext('2d');
    const dens = [...cand].map(ch => { tx.fillStyle = '#000'; tx.fillRect(0, 0, W, W); tx.fillStyle = '#fff'; tx.font = 'bold 26px Georgia, "Times New Roman", serif'; tx.textAlign = 'center'; tx.textBaseline = 'middle'; tx.fillText(ch, W / 2, W / 2 + 1); const d = tx.getImageData(0, 0, W, W).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i]; return [ch, s]; }).sort((a, b) => a[1] - b[1]);
    const n = dens.length;
    for (let g = 0; g < 16; g++) for (let v = 0; v < 4; v++) {
      const i = g === 0 ? 0 : Math.min(n - 1, Math.round((g / 15) * (n - 5)) + v);
      const ch = g === 0 ? ' ' : dens[i][0];
      x.fillStyle = '#fff'; x.font = 'bold 26px Georgia, "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(ch, g * W + W / 2, v * W + W / 2 + 1);
    }
    const tex = new T.CanvasTexture(cv); tex.minFilter = T.LinearFilter; tex.magFilter = T.LinearFilter; tex.generateMipmaps = false;
    return tex;
  }

  /* ---------- cores das silhuetas: por qual sentido a criatura sabe onde a cobaia está ---------- */
  const COR_SENT = {
    'vibração': '#ffa040', teste: '#ffffff', 'solidão': '#8cc0ff', 'raízes': '#78e05a', descanso: '#b9a0ff', ninho: '#ff80c0', NEX: '#c070ff',
    tela: '#59f2ff', 'câmera': '#59f2ff', sinal: '#59f2ff', rastro: '#9cff9c', leitura: '#ffe28c', vista: '#e6e6e6', faro: '#e01a12',
  };
  const ICONE_SENT = { 'vibração': '〰', teste: '🎯', 'solidão': '🧍', 'raízes': '🌱', descanso: '💤', ninho: '🥚', NEX: '☢', tela: '📺', 'câmera': '📷', sinal: '🔌', rastro: '🧶', leitura: '📚' };

  /* =========================================================
     A extensão da vista 3D
     ========================================================= */
  const Visao = {
    ap: null, on: false, ctrlAnt: undefined, verTudo: false, forma: '', chave: '', est: null, mats: {}, tam: null,
    rt: null, rtM: null, quad: null, cenaQ: null, camO: null, matM: null, glifos: null, preto: null,
    ondas: [], fontes: {}, olhoY: null, ultSent: 0, sentidos: null, perc: new Map(), passo: 0, ultPos: null, anda: 0,
    marcas: null, marcasCh: '', vibUlt: {},

    reduzir() { const r = this.ap && this.ap.CFG.visaoReduz; if (r === true || r === 'true') return true; if (r === false || r === 'false') return false; try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } },
    gm() { const V = this.ap && this.ap.V; return !!(V && (V.quem === 'mestre' || V.quem === 'aux')); },
    filhoCtrl() { const V = this.ap && this.ap.V; if (!V || !V.ctrl) return null; const tk = tokens()[V.ctrl]; return tk && tipoDe(tk) === 'filho' ? V.ctrl : null; },

    iniciar(ap) {
      this.ap = ap; this.on = false; this.ctrlAnt = undefined; this.ondas = []; this.fontes = {}; this.olhoY = null; this.perc = new Map(); this.vibUlt = {}; this.marcasCh = '';
      const C = ap.CFG;
      if (C.visaoAuto === undefined) C.visaoAuto = true;
      if (C.visaoInt === undefined) C.visaoInt = 1;
      if (C.visaoReduz === undefined) C.visaoReduz = 'auto';
      estilos();
      const pos = ap.pos;
      if (!pos.__vsc) {
        const r0 = pos.render, t0 = pos.tamanho;
        pos.render = function (cena, cam, t) { if (Visao.on && Visao.ap && Visao.ap.pos === pos) { try { return Visao.render(cena, cam, t); } catch (e) { console.warn('visão da criatura:', e); Visao.sair(true); } } return r0.apply(this, arguments); };
        pos.tamanho = function (W, H, dpr) { Visao.tam = [W, H, dpr]; Visao.rtCh = ''; return t0.apply(this, arguments); };
        pos.__vsc = 1;
      }
      const v2 = new ap.T.Vector2(); ap.ren.getSize(v2); this.tam = [v2.x, v2.y, ap.ren.getPixelRatio()]; this.rtCh = '';
      // botão 👁 no topo (antes do ⚙) e o selo da visão
      const d = ap.V && ap.V.d, bts = d && $('.s3d-topo-bts', d);
      if (bts && !$('[data-vsc="alternar"]', bts)) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 's3d-x s3d-mini vsc-bt'; b.dataset.vsc = 'alternar'; b.hidden = true;
        b.title = 'Visão da criatura (V): ver como o Filho controlado vê'; b.setAttribute('aria-label', 'Visão da criatura'); b.setAttribute('aria-pressed', 'false'); b.textContent = '👁';
        const op = $('[data-s3dv="opcoes"]', bts); bts.insertBefore(b, op || null);
      }
      if (d && !$('#vscHud', d)) { const h = document.createElement('div'); h.className = 'vsc-hud'; h.id = 'vscHud'; h.hidden = true; h.setAttribute('aria-live', 'polite'); d.appendChild(h); }
      this.botao(false);
    },

    fechar() {
      this.sair(true);
      [this.rt, this.rtM].forEach(x => x && x.dispose()); this.rt = this.rtM = null;
      Object.values(this.mats).forEach(m => m.dispose()); this.mats = {};
      if (this.matM) this.matM.dispose(); this.matM = null;
      if (this.quad) this.quad.geometry.dispose(); this.quad = null;
      if (this.glifos) this.glifos.dispose(); this.glifos = null;
      if (this.preto) this.preto.dispose(); this.preto = null;
      this.limparMarcas(); this.cenaS = null;
      this.ap = null;
    },

    // ---------- entrar e sair ----------
    entrar(auto) {
      const ap = this.ap; if (!ap || !this.gm() || !this.filhoCtrl()) return;
      if (!ap.primeiraP(ap.est.modo) && window.Sala3D) window.Sala3D.modo(ap.primeiraP('jogo') ? 'jogo' : 'dentro');
      this.on = true; this.olhoY = null; this.ondas = []; this.fontes = {};
      this.botao(true); this.hud(true);
      if (!auto) ap.toast('👁 Visão da criatura: você vê o que o Filho percebe. V ou 👁 para sair.');
    },
    sair(silencio) {
      if (!this.on) return;
      this.on = false; this.limparMarcas();
      const ap = this.ap;
      if (ap && ap.V) { ap.V.tok.mapa.forEach(o => { if (o.__vscOc) { o.__vscOc = false; } }); const h = $('#vscHud', ap.V.d); if (h) h.hidden = true; }
      this.botao(!!this.filhoCtrl());
      if (!silencio && ap) ap.toast('Visão normal.');
    },
    alternar() { if (this.on) this.sair(); else if (this.filhoCtrl() && this.gm()) this.entrar(false); else if (this.ap) this.ap.toast('Controle um Filho para ver pelos olhos dele.'); },
    botao(mostrar) {
      const d = this.ap && this.ap.V && this.ap.V.d, b = d && $('[data-vsc="alternar"]', d); if (!b) return;
      const ver = !!mostrar && this.gm();
      if (b.hidden === ver) b.hidden = !ver;
      b.classList.toggle('on', this.on); b.setAttribute('aria-pressed', this.on ? 'true' : 'false');
    },

    // ---------- a cada quadro (antes do desenho) ----------
    quadro(dt, t) {
      const ap = this.ap; if (!ap || !ap.V) return;
      if (!this.gm()) return;
      const V = ap.V, fid = this.filhoCtrl();
      if (V.ctrl !== this.ctrlAnt) {
        this.ctrlAnt = V.ctrl;
        if (fid && ap.CFG.visaoAuto !== false) this.entrar(true); else if (!fid) this.sair(true);
        this.botao(!!fid);
      }
      if (this.on && (!fid || !ap.primeiraP(ap.est.modo))) { this.sair(true); this.botao(!!fid); }
      if (!this.on) return;
      const o = V.tok.mapa.get(fid);
      this.forma = this.__forcar || (o && o.forma) || '';
      this.chave = ESTILOS[this.forma] ? this.forma : '_padrao';
      this.est = ESTILOS[this.chave];
      // olhos na altura do modelo (teto da sala ou do corredor como limite)
      const cam = ap.camera, alt = o && o.t ? (o.t.alt || 1.7) * (o.t.g.scale.y || 1) : 1.7;
      const naSala = !!ap.salaNoPonto3D(cam.position.x, cam.position.z);
      let quer = Math.max(.3, Math.min(alt * (this.est.olho || .92), (naSala ? ALT_SALA : ALT_CORR) - .15));
      this.olhoY = this.olhoY == null ? quer : this.olhoY + (quer - this.olhoY) * Math.min(1, dt * 4);
      const base = V.escondido ? cam.position.y : 1.6;
      cam.position.y += this.olhoY - base;
      // passos (para o tranco dos passos pesados)
      const p = [cam.position.x, cam.position.z];
      const vel = this.ultPos ? Math.hypot(p[0] - this.ultPos[0], p[1] - this.ultPos[1]) / Math.max(dt, .001) : 0; this.ultPos = p;
      this.anda += ((vel > .4 ? 1 : 0) - this.anda) * Math.min(1, dt * 6); this.passo += vel * dt * 3.2;
      // sentidos (dados): poucas vezes por segundo
      const ag = performance.now();
      if (ag - this.ultSent > 350) { this.ultSent = ag; this.lerSentidos(fid); }
      this.emitir(t);
      this.atualizarOndas(dt);
      this.hud();
    },

    // ---------- o que a criatura percebe (filhos.js) ----------
    lerSentidos(fid) {
      const ap = this.ap, F = FIL(), tks = tokens();
      const s = F && F.sentidosDe ? F.sentidosDe(fid) : null;
      this.sentidos = s;
      const sent = new Set((s && s.sent) || []);
      this.cego = !this.verTudo && (sent.has('sem_visao') || sent.has('vib_mov')) ? 1 : 0;
      this.curta = !this.verTudo && sent.has('visao_curta') ? 7 : 0;
      this.perc = new Map();
      ap.V.tok.mapa.forEach((o, id) => {
        const tk = tks[id], tp = tipoDe(tk);
        if (!tk || (tp !== 'cobaia' && tp !== 'npc') || id === fid) return;
        if (this.verTudo) { this.perc.set(id, { m: 'n' }); return; }
        const r = F && F.comoPercebe ? F.comoPercebe(fid, tk) : null;
        let m;
        if (r === null) m = (A().visivelAoFilho ? A().visivelAoFilho(tk, fid) : true) ? { m: 'n' } : { m: 'x' };
        else if (r.ve && !this.cego) m = { m: 'n', faro: r.faroCurto && r.machucada };
        else if (r.s) m = { m: 's', cor: COR_SENT[r.s] || '#ffffff', s: r.s };
        else m = { m: 'x' };
        this.perc.set(id, m);
      });
      this.montarMarcas();
    },

    // fontes de som: salas (exata ou mancha) e a vibração de quem se mexeu
    emitir() {
      const ap = this.ap, s = this.sentidos, T = performance.now() / 1000;
      if (!s) return;
      const I = window.ACF._int, R = (I && I.R) || 5;
      const est = this.est || {};
      (s.sons || []).forEach(f => {
        const k = 's' + f.k, per = Math.max(.9, 2.9 - .45 * f.n), ult = this.fontes[k] || 0;
        if (T - ult < per) return;
        this.fontes[k] = T + Math.random() * .25;
        let x = f.x, y = f.y;
        if (!f.exata) { const h = semente(f.k + ':' + Math.floor(agora() / 45000)); const an = h() * Math.PI * 2, d = R * (.35 + h() * .45); x += Math.cos(an) * d; y += Math.sin(an) * d; }
        const [X, Z] = ap.planta3D(x, y);
        this.ondas.push({ x: X, y: 1.3, z: Z, t0: T, v: 8.5, max: 14 + f.n * 4, I: (.42 + .1 * f.n) * (est.ganho || 1), w: f.exata ? .22 : .5, tipo: 0 });
      });
      // vibração: anel no chão aos pés de quem a criatura sente se mexer
      this.perc.forEach((m, id) => {
        if (m.m !== 's' || m.s !== 'vibração') return;
        const q = ap.V.tok.posDe(id); if (!q) return;
        if (T - (this.vibUlt[id] || 0) < .8) return; this.vibUlt[id] = T;
        this.ondas.push({ x: q[0], y: 0, z: q[1], t0: T, v: 2.6, max: 3.4, I: .9, w: .12, tipo: 1 });
      });
    },
    atualizarOndas() {
      const T = performance.now() / 1000;
      this.ondas = this.ondas.filter(o => (T - o.t0) * o.v < o.max);
      if (this.ondas.length > 12) this.ondas = this.ondas.slice(this.ondas.length - 12);
    },

    // ---------- marcas no chão: faro de sangue, trilha e leitura (desenhadas na cena, marcadas no alfa) ----------
    montarMarcas() {
      const ap = this.ap, s = this.sentidos, T = ap.T;
      const I = window.ACF._int;
      const lista = [];   // [x, z, ang, tam, r, g, b, força, tipo] tipo 0 pegada (chão), 1 brilho (através das paredes)
      if (s && I) {
        const a = ap.a, centro = cn => { const r = I.retSala(cn - 25 * (a - 1)); return ap.planta3D(r.x + r.w / 2, r.y + r.h / 2); };
        (s.trilha || []).forEach(tr => {
          const cor = corRGB(tr.cor), pts = tr.pts;
          pts.forEach((pt, i) => {
            if (Math.ceil(pt.cn / 25) !== a) return;
            const [cx, cz] = centro(pt.cn);
            const prox = pts[i + 1] && centro(pts[i + 1].cn), ant = pts[i - 1] && centro(pts[i - 1].cn);
            let dx = 0, dz = 1;
            if (prox && (prox[0] !== cx || prox[1] !== cz)) { dx = prox[0] - cx; dz = prox[1] - cz; } else if (ant && (ant[0] !== cx || ant[1] !== cz)) { dx = cx - ant[0]; dz = cz - ant[1]; }
            const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
            const idade = (agora() - pt.ts) / (tr.lim || 300000), forca = Math.max(.18, 1 - idade) * (i === pts.length - 1 ? 1.25 : .9);
            const h = semente(tr.id + pt.ts), n = 12;
            for (let k = 0; k < n; k++) {
              const u = (k / (n - 1) - .5) * 10, lado = (k % 2 ? 1 : -1) * .22, j = (h() - .5) * .3;
              lista.push([cx + dx * u - dz * (lado + j * .2), cz + dz * u + dx * (lado + j * .2), Math.atan2(dx, dz), .6, ...cor, forca, 0]);
            }
          });
        });
        (s.faro || []).forEach(f => { const [X, Z] = ap.planta3D(f.x, f.y); lista.push([X, Z, 0, 2.6, .95, .08, .05, 1, 1]); });
        (s.leitura || []).forEach(l => { const [X, Z] = ap.planta3D(l.x, l.y); lista.push([X, Z, 0, 1.1, 1, .88, .5, Math.max(.3, 1 - (agora() - l.ts) / 600000), 1]); });
      }
      const ch = lista.map(x => x.map(v => typeof v === 'number' ? v.toFixed(2) : v).join(',')).join(';');
      if (ch === this.marcasCh) return;
      this.marcasCh = ch; this.limparMarcas(true);
      if (!lista.length) return;
      const grupo = new T.Group(); grupo.name = 'vsc-marcas';
      [0, 1].forEach(tipo => {
        const it = lista.filter(x => x[8] === tipo); if (!it.length) return;
        const n = it.length, pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), cor = new Float32Array(n * 16), idx = [];
        it.forEach((m, i) => {
          const [x, z, an, tam, r, g, b, f] = m, c = Math.cos(an), sn = Math.sin(an);
          const hw = tipo ? tam / 2 : tam * .32, hl = tipo ? tam / 2 : tam / 2;
          const cantos = [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]];
          cantos.forEach(([u, v], k) => {
            if (tipo) { pos.set([x, .9, z], i * 12 + k * 3); }
            else pos.set([x + u * c + v * sn, .025, z - u * sn + v * c], i * 12 + k * 3);
            uv.set([k === 0 || k === 3 ? 0 : 1, k < 2 ? 0 : 1], i * 8 + k * 2);
            cor.set([r, g, b, f], i * 16 + k * 4);
          });
          idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
        });
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setAttribute('cor', new T.BufferAttribute(cor, 4));
        geo.setIndex(idx);
        if (tipo) { const tams = new Float32Array(n * 4); it.forEach((m, i) => tams.fill(m[3], i * 4, i * 4 + 4)); geo.setAttribute('tam', new T.BufferAttribute(tams, 1)); }
        // desenhadas na máscara (depois do filtro, com a cor certa); a pegada compara com a profundidade da cena
        const mat = new T.ShaderMaterial({
          uniforms: { uT: { value: 0 }, tProf: { value: null }, uResM: { value: new T.Vector2(1, 1) }, uNF: { value: new T.Vector2(.05, 200) }, uTemProf: { value: 0 } },
          transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false, blending: T.AdditiveBlending, side: T.DoubleSide,
          vertexShader: `attribute vec4 cor; varying vec4 vCor; varying vec2 vUv; ${tipo ? 'attribute float tam;' : ''}
            void main(){ vCor = cor; vUv = uv;
              ${tipo ? 'vec4 mv = modelViewMatrix * vec4(position, 1.); mv.xy += (uv - .5) * tam; gl_Position = projectionMatrix * mv;' : 'gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);'} }`,
          fragmentShader: `uniform float uT, uTemProf; uniform sampler2D tProf; uniform vec2 uResM, uNF; varying vec4 vCor; varying vec2 vUv;
            float lin(float d){ float z = d * 2. - 1.; return 2. * uNF.x * uNF.y / (uNF.y + uNF.x - z * (uNF.y - uNF.x)); }
            void main(){
              ${tipo ? '' : 'if (uTemProf > .5 && lin(gl_FragCoord.z) > lin(texture2D(tProf, gl_FragCoord.xy / uResM).x) + .12) discard;'}
              ${tipo
                ? 'float r = length(vUv - .5) * 2.; float a = smoothstep(1., 0., r); a = a * a * (.75 + .25 * sin(uT * 2. + vCor.r * 9.));'
                : 'vec2 p = vUv - .5; float sola = length(vec2(p.x * 2.6, (p.y - .1) * 1.15)); float salto = length(vec2(p.x * 2.9, (p.y + .3) * 2.4)); float a = max(smoothstep(.5, .36, sola), smoothstep(.42, .3, salto));'}
              a *= vCor.a; gl_FragColor = vec4(vCor.rgb * a * ${tipo ? '.8' : '1.1'}, 1.); }`,
        });
        const me = new T.Mesh(geo, mat); me.frustumCulled = false; me.renderOrder = 9; grupo.add(me);
      });
      if (!this.cenaS) this.cenaS = new T.Scene();
      this.cenaS.add(grupo); this.marcas = grupo;
    },
    limparMarcas(manterCh) {
      const g = this.marcas; if (!manterCh) this.marcasCh = '';
      if (!g) return;
      if (g.parent) g.parent.remove(g);
      g.children.forEach(m => { m.geometry.dispose(); m.material.dispose(); });
      this.marcas = null;
    },

    // ---------- o desenho ----------
    garantir() {
      const ap = this.ap, T = ap.T, ren = ap.ren;
      if (!this.quad) {
        this.quad = new T.Mesh(new T.PlaneGeometry(2, 2)); this.cenaQ = new T.Scene(); this.cenaQ.add(this.quad); this.camO = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.matM = new T.MeshBasicMaterial({ color: '#ffffff', blending: T.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false });
        const d = new Uint8Array([0, 0, 0, 255]); this.preto = new T.DataTexture(d, 1, 1, T.RGBAFormat); this.preto.needsUpdate = true;
      }
      const [W, H, dpr] = this.tam || [innerWidth, innerHeight, 1];
      const q = IMR() && IMR().Qual && IMR().Qual.aplicado != null ? IMR().Qual.aplicado : 0;
      const k = (ap.celular ? .7 : 1) * (q >= 3 ? .85 : 1);
      const w = Math.max(64, Math.floor(W * dpr * k)), h = Math.max(64, Math.floor(H * dpr * k));
      const ch = w + 'x' + h;
      if (ch === this.rtCh && this.rt) return;
      this.rtCh = ch;
      if (this.rt) this.rt.dispose(); if (this.rtM) this.rtM.dispose();
      const opt = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, encoding: T.sRGBEncoding };
      this.rt = new T.WebGLRenderTarget(w, h, opt);
      this.temProf = !!(ren.capabilities.isWebGL2 || ren.extensions.get('WEBGL_depth_texture'));
      if (this.temProf) { this.rt.depthTexture = new T.DepthTexture(w, h); this.rt.depthTexture.type = ren.capabilities.isWebGL2 ? T.UnsignedIntType : T.UnsignedShortType; }
      this.rtM = new T.WebGLRenderTarget(Math.max(32, w >> 1), Math.max(32, h >> 1), { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat });
    },
    material(chave) {
      if (this.mats[chave]) return this.mats[chave];
      const ap = this.ap, T = ap.T, e = ESTILOS[chave];
      const u = {
        tCena: { value: null }, tProf: { value: null }, tMasc: { value: null }, tAux: { value: null },
        uRes: { value: new T.Vector2(1, 1) }, uResM: { value: new T.Vector2(1, 1) },
        uTempo: { value: 0 }, uT: { value: 0 }, uInt: { value: 1 }, uEco: { value: 0 }, uTinta: { value: 0 }, uTemProf: { value: 0 }, uCego: { value: 0 }, uCurta: { value: 0 }, uMascOn: { value: 0 }, uNO: { value: 0 }, uPasso: { value: 0 }, uAnda: { value: 0 },
        uCorOnda: { value: new T.Color(e.onda || '#dfe8ff') }, uProjInv: { value: new T.Matrix4() }, uCamMundo: { value: new T.Matrix4() },
        uOP: { value: Array.from({ length: 12 }, () => new T.Vector4()) }, uOQ: { value: Array.from({ length: 12 }, () => new T.Vector4()) },
      };
      const fs = COMUM + e.g + `
vec3 ondas(vec3 c, vec2 q){
  if (uNO > .5 && uTemProf > .5) {
    vec3 p = posMundo(q); float vale = step(profB(q), .99995);
    for (int i = 0; i < 12; i++) {
      if (float(i) >= uNO) break;
      vec4 P = uOP[i], Q = uOQ[i];
      vec3 dv = p - P.xyz; float dd = Q.z > .5 ? length(dv.xz) : length(dv);
      float b = exp(-pow((dd - P.w) / Q.y, 2.)) * Q.x * vale;
      if (Q.z > .5) b *= smoothstep(.35, .04, p.y);
      else b *= mix(.45, 1., smoothstep(.06, .32, length((q - .5) * aspecto())));   // o centro da tela fica limpo
      // eco: a onda acende a geometria por onde passa (quem quase não vê enxerga a sala no pulso)
      float rastro = Q.z > .5 ? 0. : step(dd, P.w) * exp(-(P.w - dd) * .7) * Q.x * .3 * vale;
      vec3 cor = Q.z > .5 ? vec3(1., .62, .22) : uCorOnda;
      if (uTinta > .5) c = mix(c, cor, clamp(b * 1.4, 0., 1.));
      else c += cor * b + (brutoC(q).rgb * 5. + vec3(.5, .55, .62) * bordaProf(q)) * (b * .8 + rastro) * uEco;
    }
  }
  return c;
}
// silhuetas, sangue, trilha e leitura: sempre por cima de tudo (até do que tampa a vista)
vec3 mascara(vec3 c, vec2 q){
  if (uMascOn > .5) {
    vec2 px = 2. / uResM;
    vec3 m = texture2D(tMasc, q).rgb;
    vec3 mx = max(max(texture2D(tMasc, q + vec2(px.x, 0.)).rgb, texture2D(tMasc, q - vec2(px.x, 0.)).rgb), max(texture2D(tMasc, q + vec2(0., px.y)).rgb, texture2D(tMasc, q - vec2(0., px.y)).rgb));
    float a = clamp(max(m.r, max(m.g, m.b)), 0., 1.);
    float pul = .82 + .18 * sin(uTempo * 2.2);
    if (uTinta > .5) { float bo = smoothstep(.15, .45, a + (ruido(q * 70.) - .5) * .35); c = mix(c, vec3(.05, .035, .03) + m * .35, bo * .92); }
    else { c = c * (1. - a * .6) + m * .95 * pul; c += max(mx - m, 0.) * 1.5; }
  }
  return c;
}
void main(){
  vec2 q = deforma(vUv);
  vec3 e = estilo(vUv, q);
  vec3 b = olhar(vUv);
  vec3 c = mix(b, e, uInt);
  vec2 qs = mix(vUv, q, uInt);
  float dentro = step(0., qs.x) * step(qs.x, 1.) * step(0., qs.y) * step(qs.y, 1.);
  if (dentro > .5) { c = mix(ondas(c, qs), c, clamp(gOcl, 0., 1.) * .9); c = mascara(c, qs); }
  gl_FragColor = vec4(max(c, 0.), 1.);
}`;
      const m = new T.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false });
      m.toneMapped = false;
      this.mats[chave] = m;
      return m;
    },
    malhas(o) {
      const ag = performance.now();
      if (o.__vscM && ag - (o.__vscT || 0) < 2000) return o.__vscM;
      const l = [], base = o.t.base;
      const ir = x => { if (x === base || x === o.nome || x.isSprite || x.isLight) return; if (x.isMesh) l.push(x); x.children.forEach(ir); };
      o.t.g.children.forEach(ir);
      o.__vscM = l; o.__vscT = ag; return l;
    },
    render(cena, cam, t) {
      const ap = this.ap, T = ap.T, ren = ap.ren;
      this.garantir();
      const mat = this.material(this.chave), U = mat.uniforms, mapa = ap.V.tok.mapa;
      // quem a criatura não percebe some; quem ela percebe por outro sentido vira silhueta
      const esconder = [], silh = new Map();
      this.perc.forEach((m, id) => {
        const o = mapa.get(id); if (!o || !o.t.g.visible) return;
        if (m.m === 'x') esconder.push(o);
        else if (m.m === 's') { esconder.push(o); const k = m.cor + '|1'; if (!silh.has(k)) silh.set(k, []); silh.get(k).push(o); }
        else if ((this.est || {}).papel) { const k = '#5a2a22|1'; if (!silh.has(k)) silh.set(k, []); silh.get(k).push(o); }   // no papel, as cobaias viram manchas de tinta
        else if (m.faro) { const k = COR_SENT.faro + '|.4'; if (!silh.has(k)) silh.set(k, []); silh.get(k).push(o); }   // faro curto: brilho vermelho por cima de quem já se vê
      });
      // cobaia que acabou de entrar na vista e ainda não passou pelos sentidos: fica escondida até a próxima leitura
      if (!this.verTudo) { const tks = tokens(); mapa.forEach((o, id) => { if (this.perc.has(id) || !o.t.g.visible) return; const tp = tipoDe(tks[id]); if ((tp === 'cobaia' || tp === 'npc') && id !== this.filhoCtrl()) esconder.push(o); }); }
      esconder.forEach(o => { o.t.g.visible = false; });
      // a cena, numa textura com profundidade
      const cc = new T.Color(); ren.getClearColor(cc); const ca = ren.getClearAlpha();
      ren.setRenderTarget(this.rt); ren.render(cena, cam);
      esconder.forEach(o => { o.t.g.visible = true; });
      // máscara dos sentidos (meia resolução, só quando há o que mostrar): silhuetas acesas através das paredes,
      // pegadas da trilha (escondidas atrás das paredes pela profundidade da cena), sangue e leitura
      const marcas = this.marcas && this.marcas.children.length;
      let temM = false;
      if (silh.size || marcas) {
        temM = true;
        const ac = ren.autoClear, su = ren.shadowMap.autoUpdate;
        ren.shadowMap.autoUpdate = false;
        ren.setClearColor(0x000000, 1); ren.setRenderTarget(this.rtM); ren.clear(); ren.autoClear = false;
        if (silh.size) {
          const bg = cena.background, ov = cena.overrideMaterial, lm = cam.layers.mask;
          cena.background = null; cena.overrideMaterial = this.matM; cam.layers.set(3);
          silh.forEach((lista, k) => {
            const [cor, f] = k.split('|'), ms = []; lista.forEach(o => this.malhas(o).forEach(x => ms.push(x)));
            ms.forEach(x => x.layers.enable(3)); this.matM.color.set(cor).multiplyScalar(+f || 1);
            ren.render(cena, cam);
            ms.forEach(x => x.layers.disable(3));
          });
          cena.background = bg; cena.overrideMaterial = ov; cam.layers.mask = lm;
        }
        if (marcas) {
          this.marcas.children.forEach(m => { const u = m.material.uniforms; u.uT.value = t; u.tProf.value = this.temProf ? this.rt.depthTexture : null; u.uTemProf.value = this.temProf ? 1 : 0; u.uResM.value.set(this.rtM.width, this.rtM.height); u.uNF.value.set(cam.near, cam.far); });
          ren.render(this.cenaS, cam);
        }
        ren.autoClear = ac; ren.shadowMap.autoUpdate = su;
      }
      ren.setClearColor(cc, ca);
      // o passe único: filtro da forma + sentidos
      const reduz = this.reduzir(), es = this.est || {};
      U.tCena.value = this.rt.texture; U.tProf.value = this.temProf ? this.rt.depthTexture : this.preto; U.tMasc.value = temM ? this.rtM.texture : this.preto;
      if (es.aux === 'glifos') { if (!this.glifos) this.glifos = atlasGlifos(T); U.tAux.value = this.glifos; } else U.tAux.value = this.preto;
      U.uRes.value.set(this.rt.width, this.rt.height); U.uResM.value.set(this.rtM.width, this.rtM.height);
      U.uTempo.value = t; this.tm = (this.tm || 0) + Math.max(0, Math.min(.1, t - (this.tUlt || t))) * (reduz ? .12 : 1); this.tUlt = t; U.uT.value = this.tm;
      U.uInt.value = Math.max(.15, Math.min(1, +ap.CFG.visaoInt || 1));
      U.uTemProf.value = this.temProf ? 1 : 0;
      U.uCego.value = Math.max(this.cego || 0, this.verTudo ? 0 : (es.cego || 0));
      U.uCurta.value = this.curta || 0; U.uMascOn.value = temM ? 1 : 0;
      U.uEco.value = es.eco || (this.cego && !this.verTudo) ? 1 : 0; U.uTinta.value = es.papel ? 1 : 0;
      U.uPasso.value = this.passo; U.uAnda.value = reduz ? 0 : this.anda;
      U.uProjInv.value.copy(cam.projectionMatrixInverse); U.uCamMundo.value.copy(cam.matrixWorld);
      const T0 = performance.now() / 1000, on = this.ondas.slice(-12);
      on.forEach((o, i) => { const r = (T0 - o.t0) * o.v, f = Math.pow(Math.max(0, 1 - r / o.max), 1.3); U.uOP.value[i].set(o.x, o.y, o.z, r); U.uOQ.value[i].set(o.I * f, o.w * (1 + r * .03), o.tipo, 0); });
      U.uNO.value = on.length;
      this.quad.material = mat; ren.setRenderTarget(null); ren.render(this.cenaQ, this.camO);
    },

    // ---------- selo da visão (nome, sentidos, Ver tudo) ----------
    hud(forcar) {
      const ap = this.ap, d = ap && ap.V && ap.V.d, h = d && $('#vscHud', d); if (!h) return;
      if (!this.on) { h.hidden = true; return; }
      const F = FIL(), s = this.sentidos, cat = (F && F.SENTIDOS) || [];
      const sents = s && s.cfg ? s.sent.map(k => { const x = cat.find(c => c[0] === k); return x ? `${x[3]} ${x[4]}` : k; }) : [];
      const txt = (this.est && this.est.n) || '';
      const mestre = ap.V.quem === 'mestre';
      const ch = [txt, sents.join('|'), this.verTudo, mestre, s && s.cfg].join('§');
      if (!forcar && ch === h.dataset.ch && !h.hidden) return;
      h.dataset.ch = ch; h.hidden = false;
      h.innerHTML = `<b title="Visão da criatura (forma: ${esc(this.forma || 'genérica')})">👁 ${esc(txt)}</b>`
        + `<span class="vsc-sent">${this.verTudo ? 'vendo tudo (Mestre)' : s && !s.cfg ? 'sem características: vista padrão e audição' : sents.length ? esc(sents.join(' · ')) : 'só a vista'}</span>`
        + `<span class="vsc-bts">${mestre ? `<button type="button" data-vsc="tudo" class="${this.verTudo ? 'on' : ''}" aria-pressed="${this.verTudo}" title="Mostrar todos, sem a regra dos sentidos (só o Mestre)">${this.verTudo ? '✓ ' : ''}Ver tudo</button>` : ''}`
        + `<button type="button" data-vsc="sair" title="Sair da visão (V)" aria-label="Sair da visão da criatura">✕</button></span>`;
    },

    // ---------- Opções do 3D ----------
    opcoes(aba, h) {
      if (aba !== 'graficos' || !h || h.quem === 'jog') return '';
      const pct = v => Math.round(v * 100) + '%';
      return `<section><h4>Visão da criatura</h4>
        ${h.chave('visaoAuto', 'Entrar na visão ao controlar um Filho (botão 👁 ou tecla V entram e saem)')}
        ${h.faixa('visaoInt', .2, 1, .05, 'Intensidade do filtro', pct)}
        ${h.sel('visaoReduz', [['auto', 'Como o sistema'], ['true', 'Sim'], ['false', 'Não']], 'Reduzir efeitos que se mexem')}
        <p class="mini">Só Mestre e auxiliares. O filtro vem da forma 3D; o que aparece vem dos sentidos do Filho.</p></section>`;
    },
  };

  /* ---------- utilidades ---------- */
  function semente(txt) { let h = 2166136261; for (const c of String(txt)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
  function corRGB(hex) { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim()); if (!m) return [1, 1, 1]; const n = parseInt(m[1], 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  let estilosProntos = false;
  function estilos() {
    if (estilosProntos) return; estilosProntos = true;
    const s = document.createElement('style'); s.id = 'vscCss';
    s.textContent = `
.vsc-bt.on { border-color: #ffd23f; box-shadow: 0 0 12px rgba(255,210,63,.45); background: rgba(60,45,10,.85); }
.vsc-hud { position: absolute; left: 50%; transform: translateX(-50%); top: calc(max(10px, env(safe-area-inset-top)) + 50px); z-index: 3; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center;
  max-width: min(620px, calc(100% - 32px)); padding: 4px 6px 4px 12px; border-radius: 999px; background: rgba(10,8,14,.78); border: 1px solid rgba(255,210,63,.5); color: #f2ecfa; font: 600 12px/1.3 var(--mono, monospace); pointer-events: auto; }
.vsc-hud[hidden] { display: none; }
.vsc-hud b { color: #ffd23f; font-weight: 700; white-space: nowrap; }
.vsc-hud .vsc-sent { color: #cfc6dc; font-weight: 500; }
.vsc-hud button { min-width: 40px; min-height: 40px; padding: 0 10px; border-radius: 999px; border: 1px solid rgba(196,168,255,.5); background: rgba(30,22,44,.9); color: #f2ecfa; font: 600 12px var(--mono, monospace); cursor: pointer; }
.vsc-hud button.on { border-color: #ffd23f; color: #ffd23f; }
.s3d.s3d-sem-hud .vsc-hud, .s3d.s3d-sem-hud .vsc-bt { display: none !important; }
.vsc-hud .vsc-bts { display: flex; gap: 6px; }
@media (max-width: 420px) {
  .vsc-hud { top: calc(max(10px, env(safe-area-inset-top)) + 150px); left: max(12px, env(safe-area-inset-left)); transform: none; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; width: max-content; max-width: min(240px, calc(100% - 130px)); border-radius: 14px; padding: 4px 4px 6px 10px; gap: 2px 6px; font-size: 11px; }
  .vsc-hud b { white-space: normal; grid-row: 1; grid-column: 1; }
  .vsc-hud .vsc-bts { grid-row: 1; grid-column: 2; }
  .vsc-hud .vsc-sent { grid-row: 2; grid-column: 1 / -1; text-align: left; }
  .s3d-topo-bts .vsc-bt { position: fixed; right: max(12px, env(safe-area-inset-right)); top: calc(44% + 54px); width: 44px; height: 44px; font-size: 18px; box-shadow: 0 4px 14px rgba(0,0,0,.5); }
  .s3d.s3d-com-gaveta .vsc-bt { display: none; }
}`;
    document.head.appendChild(s);
  }

  // cliques (botão do topo e selo)
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-vsc]'); if (!b || !Visao.ap) return;
    const k = b.dataset.vsc;
    if (k === 'alternar' || k === 'sair') { Visao.alternar(); b.blur(); }
    else if (k === 'tudo') { if (Visao.ap.V && Visao.ap.V.quem === 'mestre') { Visao.verTudo = !Visao.verTudo; Visao.ultSent = 0; Visao.hud(true); } }
  });
  // tecla V (antes do teclado do 3D; só se nenhuma ação usa o V e nada está aberto por cima)
  addEventListener('keydown', e => {
    if (!Visao.ap || !Visao.ap.V || e.repeat) return;
    const k = (e.key || '').toLowerCase(); if (k !== 'v' || e.ctrlKey || e.metaKey || e.altKey) return;
    const d = $('#s3d'); if (!d || d.hidden) return;
    const alvo = e.target; if (alvo && alvo.matches && alvo.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (document.querySelector('dialog[open], .s3d-opcoes .esperando')) return;
    if (Object.values(Visao.ap.CFG.teclas || {}).includes('v')) return;
    if (!Visao.gm()) return;
    e.preventDefault(); e.stopImmediatePropagation(); Visao.alternar();
  }, true);
  // a saída da faixa de intensidade (o 3D só atualiza o número das faixas que ele conhece)
  document.addEventListener('input', e => { const x = e.target; if (x && x.dataset && x.dataset.cfgr === 'visaoInt') { const o = x.parentElement.querySelector('output'); if (o) o.textContent = Math.round(x.value * 100) + '%'; } });

  (window.ACF3D = window.ACF3D || {}).vista = window.ACF3D.vista || [];
  window.ACF3D.vista.push(Visao);
  // testes e outras telas
  window.ACF_VISAO = { Visao, ESTILOS, get ativa() { return Visao.on; }, alternar: () => Visao.alternar(), forma: f => { Visao.__forcar = ESTILOS[f] ? f : null; } };
})();
