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

## Funções das cobaias

As funções nunca ficam no código (o repositório é público). O Mestre preenche no painel **Funções (só o Mestre vê)**; elas ficam no navegador dele ou, com Firebase, num caminho que só a conta do Mestre lê.

## Perseguição e dados

- Escala: cada sala tem 50 m² (a grade do piso tem 8 x 8 quadradinhos de 0,88 m); cada corredor mede 14 m.
- O Mestre marca os participantes, preenche a iniciativa (ou rola no 🎲) e inicia. A ordem vai da maior para a menor iniciativa.
- Só quem está na vez se move, até o deslocamento do turno (9 m por padrão). Voltar ao ponto de partida zera o que andou; "Refazer rota" faz o mesmo.
- Dados: quantos d20, bônus e desvantagem (usa o menor dado). "Vou rolar em outro lugar" fecha a janela.

## Ferramentas do Mestre

- **Diário da sessão:** registro automático de movimentos (de sala para sala), rolagens, quebras, Protocolo, perseguição e revelações, com dia e horário. Só grava enquanto a tela do Mestre está aberta. Dá para filtrar, marcar uma nova sessão, baixar em .txt e limpar.
- **Rolagens recentes:** as 5 últimas rolagens de cada um, com os dados e o bônus; ⚠ marca quem rolou de novo em menos de 1 minuto.
- **Anotações das salas:** clique numa sala e escreva no cartão. A sala ganha o selo "✎ anotação" só na tela do Mestre.
- **Desfazer (↶ ou Ctrl+Z):** o jogador e o auxiliar desfazem os próprios movimentos; o Mestre desfaz o último movimento de qualquer ficha. Na perseguição, só na vez daquela ficha.
- **Ciclo diário:** número do dia (clique para corrigir), quebras de hoje, quebras rumo ao Protocolo e o histórico dos dias anteriores. "Novo dia" zera as quebras; encerrar o Protocolo zera as quebras rumo ao Protocolo.
- **Backup:** baixa um .json com tudo (fichas, salas, ruído, dia, perseguição, funções, anotações e diário). Restaurar volta ao ponto salvo e mantém o diário atual. O arquivo tem as funções: nunca envie ao GitHub.

- **Balança do Eco:** Mãe à esquerda, Rei à direita, começa em 50/50 e anda de 5 em 5. O símbolo do Eco aparece no canto do mapa para todos (jogadores, auxiliares e Mestre) e troca de forma: neutro até 60/40, Tingido de 65/35 a 85/15 e Consagrado de 90/10 em diante, para o lado da Mãe ou do Rei. Ao passar o mouse ou tocar, aparece só "Eco", "Eco Tingido" ou "Eco Consagrado". O número fica só com o Mestre. Imagens em `img/eco-*.jpg`.
- **Apagão:** a planta escurece, todas as fichas somem por 3 segundos e depois cada jogador enxerga só a própria. Quem o Mestre marcar em "Continuam enxergando" vê tudo normalmente. Os auxiliares não são afetados.

## Celular

- Ao entrar, a câmera já abre com zoom de cerca de 3 x 3 salas, centrada na sala da sua ficha. O botão ◉ volta até ela.
- As salas mostram só o CN; tocar numa sala abre um cartão com o nome completo e quem está ali.
- A lista de cobaias, o ruído e a perseguição ficam numa gaveta que sobe da aba no rodapé.
- Com mais de 3 fichas na mesma sala, elas se arrumam em fileiras no rodapé da sala (só na tela).

Diário, anotações, funções, Balança e a lista do apagão ficam em `segredos`, que só a conta do Mestre lê. As regras do Firebase não mudaram.

## Chat, portas e ferramentas de mesa

- **Chat** (botão 💬 no topo, painel próprio): **Geral** (todos), **Sussurro ao Mestre** (só o Mestre lê; a resposta dele chega só para quem mandou) e **Filhos** (Mestre e auxiliares). O Mestre apaga tudo com "Apagar todo o chat". As rolagens dos jogadores entram no Geral ou, se o Mestre desmarcar a opção, só no Sussurro; as dos auxiliares vão para o canal Filhos.
- **Portas:** clique num corredor e escolha Trancada, Destruída ou Carne. Jogadores e auxiliares não passam; o Mestre passa sempre.
- **Sinal no mapa:** o jogador segura o dedo (ou o botão do mouse) num ponto, e só o Mestre vê o sinal piscando.
- **Relógio da Caixa:** o Mestre ajusta; todos veem. À 00:00 aparece o aviso dos robôs; opcionalmente liga o Apagão e começa um novo dia.
- **Ficha resumida:** o Mestre preenche PV, SAN, PE e NEX no cartão da cobaia; o jogador vê a dele no painel.
- **Sua vez:** na perseguição, o celular de quem está na vez vibra e mostra "SUA VEZ".
- **Trilhas de Ausência:** no cartão da sala, "Sem sinal"; quem entrar vê só a própria ficha até sair.
- **Exposição (NEX):** conta as entradas de cada cobaia em salas de cada elemento.
- **Arquivos nas salas:** texto e imagem anexados pelo Mestre, revelados quando ele quiser; o jogador abre pelo cartão da sala.
- **Tela da mesa:** `…/Planta-ACF/?tv=1` mostra só o mapa, com a visão dos jogadores, para uma TV.

## Salas dos andares 2 a 5

Nomes, elementos, subtítulos e elevadores desses andares não ficam no código. O Mestre importa o arquivo `salas-secretas.json` (botão "Importar salas" no painel) ou edita no cartão de cada sala. Os jogadores só recebem o nome de uma sala quando ela é revelada. Nunca envie esse arquivo ao GitHub.

## Perfis

Ao abrir o site, a pessoa escolhe **Jogador**, **Mestre Auxiliar** ou **Mestre**. O Mestre Auxiliar entra com a senha dos auxiliares (com Firebase, é a senha da conta `auxiliares@caixa-acf.com`), escolhe o próprio robô e move os Filhos e o seu robô; ele não vê as cobaias, só os sons das salas, até o Mestre revelar. O jogador escolhe a própria cobaia e só consegue arrastar essa ficha. O Mestre entra com senha e move tudo. A escolha fica salva no navegador; o botão no topo ("trocar") volta para a tela de escolha.

Cada aba guarda o próprio perfil e o próprio login. Dá para testar Mestre, auxiliar e jogador em abas do mesmo navegador. O Mestre precisa entrar de novo só ao abrir uma aba nova (recarregar a página mantém o login).

Se alguém tentar algo que o perfil não permite (por exemplo, arrastar a cobaia de outro jogador), o site avisa e não envia nada. Se o servidor recusar alguma ação, aparece um aviso por alguns segundos e o mapa volta sozinho ao estado certo.

## Tempo real (Firebase)

Sem Firebase, o site funciona em **modo local**: as posições ficam no navegador de cada um, e outra aba ou tela do mesmo computador acompanha (bom para TV ou compartilhamento de tela). Para cada jogador ver e mover a sua ficha pelo próprio celular:

1. Em <https://console.firebase.google.com>, crie um projeto.
2. **Build › Realtime Database › Create database** (modo bloqueado).
3. **Build › Authentication › Get started**. Ative **E-mail/senha** e também **Anônimo** (é o login invisível dos jogadores). Na aba **Users**, crie o usuário do Mestre e copie o **UID**.
4. Em **Authentication › Settings › Authorized domains**, adicione `toshiro01001.github.io`.
5. Em **Authentication › Users**, crie também a conta dos auxiliares: e-mail `auxiliares@caixa-acf.com` e a senha dos auxiliares.
6. Em **Realtime Database › Rules**, cole e publique (troque o UID nas linhas do Mestre):

```json
{
  "rules": {
    "mapa": {
      ".read": true,
      ".write": "auth != null && auth.uid === 'COLE_O_UID_AQUI'",
      "tokens": {
        "$id": {
          ".write": "auth != null && data.exists() && newData.exists() && newData.child('s').val() === data.child('s').val() && newData.child('a').val() === data.child('a').val() && newData.child('h').val() === data.child('h').val() && newData.child('vf').val() === data.child('vf').val() && ($id === 'faca' || $id === 'sabonete' || $id === 'mostarda' || $id === 'papelao' || $id === 'papel' || $id === 'luva' || $id === 'velcro' || $id === 'c2p0' || $id === 'b00bies' || $id === 'm3rl1n' || $id === 'k4iser' || ($id.beginsWith('f') && $id.contains('-')))"
        }
      }
    },
    "privado": {
      ".read": "auth != null && (auth.uid === 'COLE_O_UID_AQUI' || auth.token.email === 'auxiliares@caixa-acf.com')",
      ".write": "auth != null && auth.uid === 'COLE_O_UID_AQUI'",
      "tokens": {
        ".write": "auth != null && auth.token.email === 'auxiliares@caixa-acf.com'"
      }
    },
    "segredos": {
      ".read": "auth != null && auth.uid === 'COLE_O_UID_AQUI'",
      ".write": "auth != null && auth.uid === 'COLE_O_UID_AQUI'"
    },
    "arquivos": {
      ".read": true,
      ".write": "auth != null && auth.uid === 'COLE_O_UID_AQUI'"
    },
    "arquivosPriv": {
      ".read": "auth != null && auth.uid === 'COLE_O_UID_AQUI'",
      ".write": "auth != null && auth.uid === 'COLE_O_UID_AQUI'"
    },
    "sinais": {
      ".read": "auth != null && auth.uid === 'COLE_O_UID_AQUI'",
      ".write": "auth != null && auth.uid === 'COLE_O_UID_AQUI'",
      "$s": {
        ".write": "auth != null && !data.exists() && newData.exists()",
        ".validate": "newData.hasChildren(['a', 'x', 'y', 'ts'])"
      }
    },
    "chat": {
      ".write": "auth != null && auth.uid === 'COLE_O_UID_AQUI'",
      "limpo": {
        ".read": "auth != null"
      },
      "geral": {
        ".read": "auth != null",
        "$m": {
          ".write": "auth != null && !data.exists() && newData.exists()",
          ".validate": "newData.hasChildren(['a', 't', 'ts']) && newData.child('t').isString() && newData.child('t').val().length <= 500"
        }
      },
      "sussurros": {
        ".read": "auth != null && auth.uid === 'COLE_O_UID_AQUI'",
        "$m": {
          ".write": "auth != null && !data.exists() && newData.exists()",
          ".validate": "newData.hasChildren(['a', 't', 'ts']) && newData.child('t').isString() && newData.child('t').val().length <= 500"
        }
      },
      "respostas": {
        "$cx": {
          ".read": "auth != null"
        }
      },
      "filhos": {
        ".read": "auth != null && (auth.uid === 'COLE_O_UID_AQUI' || auth.token.email === 'auxiliares@caixa-acf.com')",
        ".write": "auth != null && (auth.uid === 'COLE_O_UID_AQUI' || auth.token.email === 'auxiliares@caixa-acf.com')"
      }
    }
  }
}
```

7. Em **Configurações do projeto › Seus apps › Web (</>)**, registre um app e copie o objeto `firebaseConfig` para a linha `const FIREBASE` do `config.js`.

Com isso: todo mundo vê o mapa público; Filhos, NPCs e robôs ocultos, nomes secretos das salas e o canal Filhos só chegam ao Mestre e à conta dos auxiliares; funções, anotações, diário e Balança só ao Mestre; os jogadores só movem a própria cobaia.
