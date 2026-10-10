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
| `fichas.js` | Fichas de agente de Ordem Paranormal (botão 📋 Fichas) |
| `mesa.js` | Ferramentas de Ordem Paranormal: retratos, Presença Perturbadora, interlúdio, fim de missão, investigação, ambiente, sigilo e Escudo do Mestre |
| `quadro.js` | Quadro colaborativo da mesa (botão 🖍 Quadro) |
| `arquivo.js` | Arquivo da O.R.F.E.U.: cifras de sigilos, documentos tarjados e visões |
| `catalogo-op.js` | Catálogo de habilidades, rituais, itens, melhorias e maldições usado nas fichas |
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

## Loja do Maurício

- Os jogadores abrem pelo botão **🛒 Loja do Maurício** no painel ("Sua cobaia"). Cada venda mostra imagem, custo em Sucatas Maiores e Menores, opções com dano e crítico, e o botão **Pedir**.
- O pedido chega no Sussurro do Mestre ("🛒 Pedido ao Maurício: Pistola…"). Por padrão o Maurício só atende quem está na Zona Neutra, e a loja pode ser fechada (aba Sessão).
- O catálogo inicial é o do PDF "Itens do Maurício" (`data.js`, imagens direto na pasta `img/`). O Mestre abre a loja pela aba Sessão para **criar vendas novas** (nome, custo, opções "nome ; dano ; crítico", descrição, imagem), editar, ocultar ou apagar. Venda oculta só aparece quando ele mostrar.
- As sucatas de cada cobaia ficam na ficha resumida (o Mestre preenche); o jogador vê as dele na loja.

## Mais ferramentas

- **Jogadores:** linha tracejada com os metros ao arrastar; Caderno (só no aparelho); aviso de conexão perdida; botão **?** com a ajuda do seu perfil; botão **🔊** para desligar os sons.
- **Mestre:** painel em abas (Mapa, Sessão, Registro, Segredos); "Ver pelos olhos de" um jogador ou auxiliar; gatilhos nas salas (alerta quando uma cobaia entra); cenas prontas; Shift+clique para mover em grupo e "Trazer todas as cobaias para cá"; resumo da sessão para imprimir ou salvar em PDF; lista de quem está conectado.
- **Auxiliares:** rastro de som que vai apagando; sinal no mapa visível aos outros auxiliares e ao Mestre; iniciativa de todos os Filhos do andar de uma vez.

## Fichas de agente (📋 Fichas, atalho F)

Ficha editável de Ordem Paranormal, no estilo do C.R.I.S.: atributos, perícias (o atributo de cada uma pode ser trocado), PV, SAN e PE (ou PD na regra de Determinação), defesa, esquiva e bloqueio, habilidades, rituais com DT e custo, inventário com patente, limite de itens por categoria, crédito, carga e melhorias ou maldições nos itens. Tudo que é calculado tem um campo de ajuste para regras da casa.

- **Jogador:** cria e edita as próprias fichas. Cada ficha tem um código secreto (aparece dentro dela); em outro aparelho, "Abrir por código". Fichas de outra cobaia abertas por código ficam só para leitura.
- **Mestre:** "Fichas dos jogadores" mostra todas, ao vivo, só para leitura (o Firebase recusa qualquer alteração vinda da conta do Mestre). "Minhas fichas" guarda NPCs e inimigos, que só o Mestre vê.
- **Catálogo:** habilidades por classe, trilha, origem, poderes paranormais e homebrew; rituais por elemento e círculo; itens por tipo e fonte. A aba "Minhas" reúne o que você criou nas suas fichas, para reaproveitar.
- **Exportar e importar:** cada ficha baixa um arquivo `.json` (cópia de segurança). "Importar arquivo" cria uma ficha nova a partir dele.
- No Firebase, as fichas ficam em `agentes` (jogadores) e `agentesMestre` (Mestre). As regras novas estão no arquivo de regras entregue junto com esta versão.

## Mesa de Ordem Paranormal (aba Mesa do Mestre)

- **Painel de retratos:** foto, nome, PV e PE (ou PD) sobre o mapa, no estilo das transmissões. Cada jogador vê só o próprio; o Mestre marca quem aparece na tela dele e na de cada jogador. Os números vêm da **ficha ativa** (★ na ficha), que manda PV, PE e SAN para o token.
- **Ficha ligada ao mapa:** PV 0 vira Morrendo, SAN 0 vira Enlouquecendo (com Determinação, dano mental maior que os PD). Os turnos contam sozinhos na perseguição; "Nova cena" zera. As condições de Ordem Paranormal marcadas no cartão da cobaia entram nas rolagens da ficha (−O, −OO, Defesa, deslocamento).
- **Ameaças:** ficha de criatura (VD, Presença Perturbadora, PV, ataques). "Chamar o teste" abre na tela de cada jogador o teste de Vontade com a ficha dele; o jogador confirma o dano de SAN (ou PD) e o Mestre vê as respostas.
- **Interlúdio:** cada jogador escolhe até duas ações; o site aplica PV, PE, SAN e os bônus de +1d6 de exercício e leitura.
- **Fim de missão:** PP e NEX por cobaia; a ficha ativa recebe uma vez só (patente, crédito e limites sobem). A loja avisa quando um item passa do limite da patente.
- **Clima:** a tela do jogador desbota com a SAN baixa e pulsa em vermelho morrendo; conjurar mostra um sigilo na cor do elemento para todos e rola o Custo do Paranormal; o Mestre liga um ambiente sonoro por elemento.
- **Ferramentas:** cena de investigação (urgência, rodadas, falhas e pistas numa faixa no mapa), rolagem secreta e Escudo do Mestre com os resumos de regra.
- **Membrana:** cada sala tem estabilidade de 0 a 100. Ritual conjurado na sala tira 5 por círculo (Medo tira o dobro) e Presença Perturbadora tira de 3 a 20 conforme o VD. A sala racha e brilha na cor do elemento; ao romper, o Mestre recebe um alerta. O número só aparece para quem tem um *Medidor de Estabilidade da Membrana* na ficha ativa (no cartão da sala e no retrato). O Mestre ajusta e restaura pelo cartão da sala ou pela aba Mesa.
- **Momentos marcantes:** 20 natural e 1 natural nas rolagens da ficha, óbito e insanidade (contador de Morrendo ou Enlouquecendo chegando a 3) viram uma animação curta na tela de todos. O Mestre liga e desliga cada um.
- **Limite de PE por turno:** a ficha soma o PE gasto no turno (botões de −PE e custo de rituais) e avisa ao passar do limite. Na perseguição, cada vez é um turno novo; fora dela, zera depois de um minuto parado.
- **Munição:** a arma aponta para a munição do inventário (as do catálogo já vêm ligadas). Atacar marca o pacote como usado; a "Nova cena" do Mestre desconta (balas curtas e barras de aço duram duas cenas; balas longas, cartuchos, combustível e nitrogênio, uma; foguete sai um por disparo; flechas descontam no fim de missão).
- **Relatório da missão:** enquanto a tela do Mestre estiver aberta, o site anota dano, cura, SAN, PD, PE, rituais, quedas, pistas, Presenças, rupturas, cenas e momentos. "Gerar relatório" monta um dossiê por agente e uma linha do tempo, pronto para imprimir em PDF ou copiar para o grupo. "Nova missão" zera.
- No Firebase: `mesaResp` (respostas dos jogadores), `efeito` (sigilo e momentos) e `relatorio` (só o Mestre); o resto fica em `mapa`.

## Arquivo da O.R.F.E.U. (📜 no painel do jogador; aba Mesa do Mestre)

- **Cifras de sigilos:** o Mestre escreve a mensagem e o site a mostra num alfabeto de 36 símbolos criados para a Caixa (não são os sigilos oficiais). A chave fica só nos segredos do Mestre; os jogadores recebem apenas os símbolos. Cada símbolo é sempre a mesma letra em todas as cifras. Os jogadores tocam num símbolo para dar um palpite, que todos veem; o Mestre vê palpites certos em verde e errados em vermelho e revela letras com um toque. A cifra aparece no Arquivo, na parede de uma sala (cartão da sala e ◈ no mapa) e no chat ("Mandar no chat").
- **Documentos tarjados:** texto com trechos entre `[[colchetes duplos]]`. Os jogadores veem tarjas pretas do tamanho do trecho (o texto escondido não chega ao aparelho deles). O Mestre toca numa tarja para liberar; ela se abre na tela de todos.
- **Visões:** frase ou imagem que pisca na tela de uma cobaia só, com efeito (clarão, estática, sangue, sussurro) e som. O chat geral mostra apenas "Fulano teve uma visão". A visão fica guardada no Arquivo do jogador, naquele aparelho.
- No Firebase: `mapa/cifras`, `mapa/cifraRev` e `mapa/docs` (públicos, só o Mestre grava), `cifraPalpite` (palpites dos jogadores), `visoes/<cobaia>` (só o Mestre grava) e `segredos/_sigilos`, `_cifras` e `_docs` (só o Mestre lê).

## Quadro da equipe (🖍 Quadro, atalho B)

Quadro compartilhado, ao vivo, para jogadores, auxiliares e Mestre: caneta, marca-texto, borracha, texto com 7 fontes (tamanho, negrito e itálico), notas adesivas, retângulo, elipse, seta, linha e imagens (escolher, colar com Ctrl+V ou arrastar). Cada pessoa escolhe a própria cor (a primeira é a cor da cobaia, quando ela aparece bem no fundo). Fundo branco ou preto por quadro; tinta quase preta vira clara no quadro preto e vice-versa, para nada sumir. Dá para criar vários quadros (abas), mover, redimensionar, duplicar, trazer para a frente e desfazer (Ctrl+Z). Qualquer um apaga o que fez; só o Mestre limpa ou apaga um quadro inteiro. No Firebase: `quadrosMeta` e `quadrosItens`.

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
    },
    "lojaImg": {
      ".read": true,
      ".write": "auth != null && auth.uid === 'COLE_O_UID_AQUI'"
    },
    "sinaisFilhos": {
      ".read": "auth != null && (auth.uid === 'COLE_O_UID_AQUI' || auth.token.email === 'auxiliares@caixa-acf.com')",
      ".write": "auth != null && (auth.uid === 'COLE_O_UID_AQUI' || auth.token.email === 'auxiliares@caixa-acf.com')"
    },
    "presenca": {
      ".read": "auth != null",
      "$k": {
        ".write": "auth != null"
      }
    }
  }
}
```

7. Em **Configurações do projeto › Seus apps › Web (</>)**, registre um app e copie o objeto `firebaseConfig` para a linha `const FIREBASE` do `config.js`.

Com isso: todo mundo vê o mapa público; Filhos, NPCs e robôs ocultos, nomes secretos das salas e o canal Filhos só chegam ao Mestre e à conta dos auxiliares; funções, anotações, diário e Balança só ao Mestre; os jogadores só movem a própria cobaia.
