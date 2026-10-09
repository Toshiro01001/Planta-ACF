/* =========================================================
   config.js · senhas e conexão em tempo real
   ========================================================= */

/* SENHAS
   As senhas não ficam escritas aqui, só a "impressão digital" (hash) delas.
   Para trocar uma senha: abra o site, entre como Mestre, use o botão
   "Gerar hash de senha" no painel e cole o resultado na linha certa abaixo.

   Nunca escreva a senha em texto aqui: este arquivo fica público no GitHub.
   Linhas 1 a 5: um andar cada. */
const SAL = 'acf-caixa::';

const SENHAS_ANDARES = {
  1: 'b55719674cdc2065f3d01391180297a20298e17996a0a3090defebc8fea485c0',
  2: 'ff1fff0a240caeaf94eb0b87f8e763f68bb15d911be4b4f48d0faa5ecc1f1295',
  3: 'b68cda3280b0de9cd3c9ff94f4fcd69d5a6e81b52e9ab9ce57c9c9b571ecb492',
  4: '06dfd0c6de41ca7a00c0fb053e4bd976a1433e0fa32f69310c501e2e06d8df63',
  5: 'ae92d66ed5035aee947afd5690361df5af5ec8bd72741cbd2443fdc3c5b4026a',
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
