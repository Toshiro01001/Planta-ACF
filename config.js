/* =========================================================
   config.js · senhas e conexão em tempo real
   ========================================================= */

/* SENHAS
   As senhas não ficam escritas aqui, só a "impressão digital" (hash) delas.
   As senhas dos andares agora se trocam pela pasta "Senhas" (aba Segredos do Mestre),
   sem mexer aqui: o site usa a senha de lá. As linhas abaixo são só a reserva
   (valem enquanto a pasta Senhas não tiver a senha daquele andar).
   Para trocar a reserva: botão "Gerar hash de senha" no painel e cole o resultado na linha certa.

   Nunca escreva a senha em texto aqui: este arquivo fica público no GitHub.
   Linhas 1 a 5: um andar cada. */
const SAL = 'acf-caixa::';

const SENHAS_ANDARES = {
  1: '5e7b1c26da0771522ba4bf74d3d88b1e47386758e961f15b338ac02c2d50af03',
  2: '538ed5bcf673361a66e860ea5a3b3093d99807bf9c5476617b764780929507b7',
  3: '703b65b9ca3d470b3a3e2c8f3cdecb7d539fa976cc62c2213943283015259739',
  4: '68cc2292593e8e7dc0074bf21ea9a1e3f587ad1e73e38b70ce9d9032776e1895',
  5: 'dff27bba63f3f782e6918b0824690dcbd2557989f8b1a922d4cfa4f773ed1730',
};

/* Senha dos Mestres Auxiliares.
   Modo local: o site confere por este hash.
   Com Firebase: os auxiliares entram numa conta própria do Firebase com este
   e-mail (criada pelo Mestre em Authentication) e a senha dos auxiliares. */
const SENHA_AUX = '69ed67323361e2f9b80a29085a884be5aef8e4ce745731b67f9a58d27fe227aa';
const EMAIL_AUX = 'auxiliares@caixa-acf.com';

/* Senha do Mestre (usada só no MODO LOCAL, sem Firebase).
   Com o Firebase ligado, o Mestre entra com o e-mail e a senha
   da conta criada no Firebase, e esta linha deixa de valer. */
const SENHA_MESTRE = '3aaa687c86f4f34e72a06d969c9e769e2b582739957e62f5694cb5598b786076';

/* TEMPO REAL (Firebase)
   Deixe FIREBASE = null para o MODO LOCAL: funciona só no computador do
   Mestre (por exemplo, numa TV ou num compartilhamento de tela).
   Para os jogadores verem o mapa no celular deles, ao vivo, cole aqui
   a configuração do seu projeto Firebase (o README explica o passo a passo). */
const FIREBASE = {
  apiKey: "AIzaSyCFVn9bXN4HxBCXqZ7zl1gS4bsLHO1vaVM",
  authDomain: "a-planta-caixadefosforos.firebaseapp.com",
  databaseURL: "https://a-planta-caixadefosforos-default-rtdb.firebaseio.com",
  projectId: "a-planta-caixadefosforos",
  storageBucket: "a-planta-caixadefosforos.firebasestorage.app",
  messagingSenderId: "801839612801",
  appId: "1:801839612801:web:ce7b84b71c28d5b3a55e80"
};
/* Exemplo de como fica depois de colar:
const FIREBASE = {
  apiKey: "AIza...",
  authDomain: "mapa-acf.firebaseapp.com",
  databaseURL: "https://mapa-acf-default-rtdb.firebaseio.com",
  projectId: "mapa-acf",
  appId: "1:123:web:abc"
};
*/
