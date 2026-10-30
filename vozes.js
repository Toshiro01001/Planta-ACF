/* vozes.js · vozes das mensagens do chat dentro do 3D (geradas na hora, sem arquivos de áudio)
   Cada sílaba vira um "pedacinho de fala": uma fonte (oscilador ou chiado) passa por dois filtros nas
   frequências da vogal (formantes), com um estalo para as consoantes duras e um chiado para s, f, x, z.
   O timbre muda com a voz escolhida: altura, velocidade, abafado (máscara), camadas (vozes juntas),
   distorção, eco, rádio e robô. A C2P0 e o Mostarda continuam com as vozes próprias (app.js).
   A voz de cada token fica no próprio token (campo vz); sem escolha, vale a PADRÃO abaixo. */
(() => {
  'use strict';
  const VOZES = {
    crianca: { n: 'Criança (menina)', f0: 330, var: .3, onda: 'triangle', fk: 1.34, vel: 1.22, vib: 6.5, vibA: .022, vol: .95 },
    mulher: { n: 'Mulher (suave)', f0: 222, var: .22, onda: 'triangle', fk: 1.18, vel: 1, vib: 5, vibA: .014, vol: .9 },
    mulher_firme: { n: 'Mulher (firme)', f0: 200, var: .15, onda: 'sawtooth', fk: 1.12, vel: 1.1, corte: 2800, vol: .7 },
    homem: { n: 'Homem', f0: 118, var: .17, onda: 'sawtooth', fk: 1, vel: .96, corte: 2300, vol: .75 },
    homem_grave: { n: 'Homem (grave)', f0: 88, var: .12, onda: 'sawtooth', fk: .92, vel: .88, corte: 1800, vol: .8 },
    mascarado: { n: 'Mascarado (abafado)', f0: 106, var: .12, onda: 'sawtooth', fk: .95, vel: .9, corte: 720, sopro: .5, vol: 1 },
    monstro: { n: 'Remendado (grave e arrastado)', f0: 60, var: .1, onda: 'sawtooth', fk: .82, vel: .68, corte: 1500, camadas: 4, desafina: .045, distorcer: 14, vol: .75 },
    idoso: { n: 'Voz idosa (trêmula)', f0: 148, var: .18, onda: 'triangle', fk: 1.04, vel: .8, vib: 8.5, vibA: .05, vol: .85 },
    sussurro: { n: 'Sussurro', sussurro: true, fk: 1.1, vel: .95, vol: 1.1 },
    eco: { n: 'Distante (com eco)', f0: 172, var: .2, onda: 'triangle', fk: 1.06, vel: .9, eco: .4, vol: .8 },
    radio: { n: 'Rádio (chiado)', f0: 150, var: .18, onda: 'sawtooth', fk: 1.02, vel: 1, radio: true, vol: .7 },
    robo: { n: 'Robô (agudo)', f0: 410, var: .32, onda: 'square', fk: 1.3, vel: 1.15, robo: true, vol: .5 },
    robo_grave: { n: 'Robô (grave)', f0: 138, var: .2, onda: 'square', fk: .95, vel: .95, robo: true, vol: .5 },
    robo_metal: { n: 'Robô (metálico)', f0: 205, var: .25, onda: 'sawtooth', fk: 1.1, vel: 1, robo: true, anel: 72, vol: .5 },
    criatura: { n: 'Criatura (rosnado)', f0: 70, var: .3, onda: 'sawtooth', fk: .78, vel: .8, sopro: .7, distorcer: 30, camadas: 2, desafina: .08, vol: .65 },
  };
  // vozes iniciais de cada um (o jogador troca nas Opções do 3D)
  const PADRAO = { velcro: 'crianca', papel: 'mulher', faca: 'mulher_firme', luva: 'homem', sabonete: 'mascarado', papelao: 'monstro', b00bies: 'robo', m3rl1n: 'robo_grave', k4iser: 'robo_metal' };
  const PADRAO_TIPO = { cobaia: 'homem', npc: 'eco', robo: 'robo', filho: 'criatura' };
  function vozDe(id, tk, tipo) { const v = tk && tk.vz; return (v && VOZES[v]) ? v : PADRAO[id] || PADRAO_TIPO[tipo] || 'homem'; }

  // formantes (F1, F2) de cada vogal, voz adulta; fk sobe para mulher e criança
  const FORM = { a: [760, 1220], e: [520, 1850], i: [300, 2250], o: [560, 880], u: [330, 820] };
  const semAc = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // texto → sílabas aproximadas (consoantes antes da vogal + vogal) e pausas da pontuação
  function silabas(txt) {
    const out = [], partes = semAc(txt).match(/[a-z0-9]+|[.!?…,;:]/g) || [];
    partes.forEach(p => {
      if (/^[.!?…]$/.test(p)) { out.push({ pausa: .26, fim: p }); return; }
      if (/^[,;:]$/.test(p)) { out.push({ pausa: .13 }); return; }
      if (/^\d+$/.test(p)) { for (const d of p.slice(0, 4)) out.push({ c: 't', v: 'eiaou'[+d % 5] }); out.push({ pausa: .05 }); return; }
      const re = /([^aeiouy]*)([aeiouy]+)/g; let m, n = 0;
      while ((m = re.exec(p)) && n < 5) { out.push({ c: m[1], v: m[2][0] === 'y' ? 'i' : m[2][0] }); n++; }
      out.push({ pausa: .045 });
    });
    return out.slice(0, 46);
  }
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; };

  let ctx = null, ruido = null;
  function contexto() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  // o navegador só libera o som depois de um toque
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); }, { passive: true }));

  function curva(k) { const n = 512, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return c; }
  function chiado(c, t0, dur, f, q, vol, destino, tipo = 'bandpass') {
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = ruido; fl.type = tipo; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(.006, dur / 3)); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    s.connect(fl); fl.connect(g); g.connect(destino); s.start(t0, Math.random() * .7); s.stop(t0 + dur + .02);
  }

  // fala o texto com a voz escolhida; devolve a duração em segundos
  function falar(vozId, txt, op = {}) {
    const A = window.ACF;
    if (A && A.mudo) return 0;
    const V = VOZES[vozId] || VOZES.homem, c = contexto(); if (!c) return 0;
    const vol = Math.max(0, Math.min(1.2, op.vol ?? 1)) * (V.vol || .8) * .32;
    if (vol < .005) return 0;
    const t0 = c.currentTime + .03;
    // cadeia de saída: abafado (máscara), rádio, distorção, eco
    const saida = c.createGain(); saida.gain.value = vol;
    let ponta = saida;
    const corte = c.createBiquadFilter(); corte.type = 'lowpass'; corte.frequency.value = V.corte || 4200; corte.Q.value = V.corte && V.corte < 900 ? 2.2 : .7;
    const pan = c.createStereoPanner ? c.createStereoPanner() : null; if (pan) pan.pan.value = Math.max(-1, Math.min(1, op.pan || 0));
    if (V.distorcer) { const w = c.createWaveShaper(); w.curve = curva(V.distorcer); w.oversample = '2x'; ponta.connect(w); ponta = w; }
    if (V.radio) { const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 420; ponta.connect(hp); ponta = hp; }
    ponta.connect(corte);
    let fim = corte;
    if (pan) { fim.connect(pan); fim = pan; }
    fim.connect(c.destination);
    if (V.eco) { const dl = c.createDelay(1), fb = c.createGain(), wet = c.createGain(); dl.delayTime.value = .24; fb.gain.value = V.eco; wet.gain.value = .55; fim.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(c.destination); }

    const sil = silabas(txt), pergunta = /\?\s*$/.test(String(txt)), grita = /!\s*$/.test(String(txt));
    const nSil = sil.filter(s => s.v).length;
    let t = t0, k = 0;
    const camadas = V.camadas || 1;
    sil.forEach(s => {
      if (s.pausa) { t += s.pausa / (V.vel || 1); return; }
      k++;
      const dur = (.075 + hash(s.c + s.v + k) * .045) / (V.vel || 1) * (V.robo ? .9 : 1);
      // consoante: estalo (duras) ou chiado (s, f, x, z, ch)
      if (/[ptkcqbdg]/.test(s.c)) { chiado(c, t, .016, V.sussurro ? 2400 : 1800, 1.2, V.sussurro ? .5 : .35, saida, 'bandpass'); t += .012 / (V.vel || 1); }
      if (/[sfxzj]|ch/.test(s.c)) { chiado(c, t, .05 / (V.vel || 1), 5200, 2, V.sussurro ? .45 : .22, saida, 'bandpass'); t += .035 / (V.vel || 1); }
      // altura: varia por sílaba; pergunta sobe no fim, frase normal desce no fim
      let f = (V.f0 || 150) * (1 + (V.var || .15) * (hash(s.v + k * 7) - .5));
      const fimFrase = nSil - k;
      if (pergunta && fimFrase < 3) f *= 1.12 + (2 - fimFrase) * .1;
      else if (!pergunta && fimFrase < 2) f *= .9;
      if (grita) f *= 1.08;
      const [F1, F2] = FORM[s.v] || FORM.a, fk = V.fk || 1;
      const env = c.createGain();
      env.gain.setValueAtTime(.0001, t); env.gain.exponentialRampToValueAtTime(grita ? 1.25 : 1, t + .012); env.gain.setValueAtTime(grita ? 1.1 : .85, t + dur * .7); env.gain.exponentialRampToValueAtTime(.0001, t + dur);
      const b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(), g1 = c.createGain(), g2 = c.createGain();
      b1.type = b2.type = 'bandpass'; b1.frequency.value = F1 * fk; b2.frequency.value = F2 * fk; b1.Q.value = V.sussurro ? 4 : 7; b2.Q.value = V.sussurro ? 6 : 11;
      g1.gain.value = V.sussurro ? 2.2 : 1.6; g2.gain.value = V.sussurro ? 1.6 : 1.1;
      b1.connect(g1); b2.connect(g2); g1.connect(env); g2.connect(env); env.connect(saida);
      const fontes = [];
      if (V.sussurro) {
        const s2 = c.createBufferSource(); s2.buffer = ruido; s2.connect(b1); s2.connect(b2); s2.start(t, Math.random() * .7); s2.stop(t + dur + .02); fontes.push(s2);
      } else {
        for (let i = 0; i < camadas; i++) {
          const o = c.createOscillator(); o.type = V.onda || 'sawtooth';
          const fi = f * (1 + (i - (camadas - 1) / 2) * (V.desafina || 0));
          if (V.robo) o.frequency.setValueAtTime(fi, t);   // robô: sem deslizar
          else { o.frequency.setValueAtTime(fi * 1.03, t); o.frequency.exponentialRampToValueAtTime(fi, t + dur * .6); }
          if (V.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = V.vib; lg.gain.value = fi * (V.vibA || .02); l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .02); }
          let src = o;
          if (V.anel) { const am = c.createGain(), mod = c.createOscillator(); am.gain.value = 0; mod.frequency.value = V.anel; mod.connect(am.gain); o.connect(am); src = am; mod.start(t); mod.stop(t + dur + .02); }
          const gc = c.createGain(); gc.gain.value = 1 / Math.sqrt(camadas); src.connect(gc); gc.connect(b1); gc.connect(b2);
          o.start(t); o.stop(t + dur + .02); fontes.push(o);
        }
        if (V.sopro) chiado(c, t, dur, 1400, .7, .18 * V.sopro, saida, 'lowpass');
      }
      t += dur * (V.robo ? 1.05 : .92);
    });
    if (V.radio) chiado(c, t0, t - t0 + .05, 3200, .5, .05, saida, 'bandpass');
    return t - t0;
  }
  const testar = vozId => falar(vozId, 'Olá. Você me ouve daí? Tem alguém na sala.', { vol: 1 });

  window.ACF_VOZES = { VOZES, PADRAO, vozDe, falar, testar };
})();
