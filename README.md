# A Caixa de Fósforos · Planta do Complexo

Mapa 2.5D dos cinco andares da Caixa, com a posição das cobaias, das cobaias NPC e dos Filhos da O.R.F.E.U.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | O esqueleto da página |
| `style.css` | A aparência (roxo e preto) |
| `app.js` | O motor: desenha a planta, gira a câmera, arrasta as fichas, sincroniza |
| `data.js` | Nomes das salas, elementos e lista de seres. **É aqui que se edita o conteúdo** |
| `config.js` | Senhas (em hash) e a conexão com o Firebase |
| `img/` | Retratos das cobaias e o ícone da aba |

## Publicar no GitHub Pages

1. Crie um repositório público (ex.: `Planta-ACF`).
2. **Add file › Upload files** e arraste os arquivos soltos e a pasta `img`. O `index.html` precisa ficar na raiz.
3. **Settings › Pages › Deploy from a branch › main › / (root) › Save**.

## Elevadores

O campo `saida` de cada andar, no `data.js`, diz qual sala leva ao andar de baixo. Sala na borda vira um corredor para fora da planta; sala do meio vira um poço no chão.

## Senhas

Cada andar tem a sua senha, guardada só como hash no `config.js`. Para trocar: entre como Mestre, clique em **Gerar hash de senha**, digite a senha nova e cole o resultado na linha do andar. Nunca escreva a senha em texto no repositório.

A trava é feita no navegador. Ela segura o jogador comum, mas quem souber ler código consegue contornar.

## Tempo real (Firebase)

Sem Firebase, o site funciona em **modo local**: o Mestre move as fichas e outra aba ou tela do mesmo computador acompanha (bom para TV ou compartilhamento de tela). Para cada jogador ver no próprio celular:

1. Em <https://console.firebase.google.com>, crie um projeto.
2. **Build › Realtime Database › Create database** (modo bloqueado).
3. **Build › Authentication › Get started › E-mail/senha › Ativar**. Na aba **Users**, crie o usuário do Mestre e copie o **UID**.
4. Em **Authentication › Settings › Authorized domains**, adicione `toshiro01001.github.io`.
5. Em **Realtime Database › Rules**, cole e publique (troque o UID):

```json
{
  "rules": {
    "mapa": {
      ".read": true,
      ".write": "auth != null && auth.uid === 'COLE_O_UID_AQUI'"
    }
  }
}
```

6. Em **Configurações do projeto › Seus apps › Web (</>)**, registre um app e copie o objeto `firebaseConfig` para a linha `const FIREBASE` do `config.js`.

Com isso, todo mundo lê o mapa, e só a conta do Mestre consegue mexer.
