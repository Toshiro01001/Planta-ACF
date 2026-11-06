# A Caixa de Fósforos · Planta do Complexo

Mapa 2.5D dos cinco andares da Caixa, com a posição das cobaias, das cobaias NPC e dos Filhos da O.R.F.E.U.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | O esqueleto da página |
| `style.css` | A aparência (roxo e preto) |
| `app.js` | O motor: desenha a planta, gira a câmera, arrasta os tokens, sincroniza |
| `data.js` | Nomes das salas, elementos e lista de seres. **É aqui que se edita o conteúdo** |
| `config.js` | Senhas (em hash) e a conexão com o Firebase |
| `fichas.js` | Fichas de agente de Ordem Paranormal (botão 📋 Fichas) |
| `mesa.js` | Ferramentas de Ordem Paranormal: retratos, Presença Perturbadora, interlúdio, fim de missão, investigação, ambiente, sigilo e Escudo do Mestre |
| `quadro.js` | Quadro colaborativo da mesa (botão 🖍 Quadro) |
| `arquivo.js` | Arquivo da O.R.F.E.U.: cifras de sigilos, documentos tarjados, visões, Terminal O.R.F.E.U. e cofres |
| `escudo.js` | Resumos das regras para o Escudo do Mestre, separados em tópicos |
| `ferramentas.js` | Calculadora de NEX, pasta Senhas e Parede de Desejos (antes eram sites separados) |
| `sessao.js` | Abertura e encerramento da sessão, dilema com votação, tensão do grupo e holofote |
| `jogo.js` | Hall da Caixa, conquistas (só o Mestre) e Baú de achados |
| `exposicao.js` | Salas de Exposição: biblioteca, salas da planta, mapas animados e ações dos jogadores |
| `audio/` | Músicas do site (`dead-waltz.mp3`, a música da abertura) |
| `catalogo-op.js` | Catálogo de habilidades, rituais, itens, melhorias e maldições usado nas fichas |
| `sah.js` | Ferramentas de *Sobrevivendo ao Horror* na Mesa: perseguição, furtividade, medo em jogo e sorteios |
| `sah-dados.js` | Tabelas do *Sobrevivendo ao Horror* usadas por `sah.js` (eventos de investigação, efeitos de medo, ferimentos, desastres) |
| `limpo.js` | HUD limpo: câmera compacta, dica só nas primeiras visitas, busca, recolher/abrir e favoritos no painel, aparência (limpo ou clássico) |
| `paineis.js`, `paineis.css` | Painéis como lista de ferramentas (Mestre, auxiliares e jogadores): cada aba abre como cartões com o estado vivo de cada bloco; tocar abre o bloco como folha com ← voltar. Por dentro: chips liga/desliga, seções em abas ou recolhíveis, explicações atrás do "?" (ver "Painéis: lista de ferramentas") |
| `sala3d.js`, `objetos3d.js`, `detalhes3d.js`, `tokens3d.js` | A vista 3D (ver "Duas maneiras de jogar") |
| `nevoa.js` | Névoa de guerra e molduras dos tokens |
| `momento.js` | Encontro (a passagem da exploração para a perseguição), cartas de ação na vez, sons dos Filhos, lanterna com bateria, mapa que mente, sustos que só um jogador vê, câmeras de segurança, corpos e o acabamento do 3D (fumaça, poeira na luz, sombras dos tokens). Código genérico: quem tem o quê fica nos dados secretos |
| `imersao.js` | Imersão automática: qualidade do 3D que se ajusta sozinha, coração e respiração do personagem, vibração do celular, luzes e telas que reagem a um Filho por perto, marcas que ficam no 3D, backup automático, resumo da sessão, tutorial da primeira vez e modo foto (ver "Imersão automática"). Código genérico |
| `fuga3d.js` | Fuga dos jogadores no 3D: rota com custo e "ele te pega aqui", olhar para trás, barricadas, esconderijo por dentro, barulho de propósito e sinais (ver "Fuga dos jogadores"). Código genérico |
| `tela.js` | Modo Tela: a janela da TV da mesa (`?tv=1`) e o controle dela no bloco Mesa do Mestre; as duas janelas conversam por BroadcastChannel (ver "Modo Tela"). Código genérico |
| `visao3d.js` | Visão da criatura: no Controle de um Filho (Mestre e auxiliares), a câmera vai para os olhos dele, com um filtro por forma 3D e os sentidos dele por cima (ver "Visão da criatura"). Código genérico |
| `perseg3d.js` | Os Filhos na perseguição, do lado do Mestre: piloto automático (rota sugerida pelos sentidos), comportamento visível no 3D, abertura da perseguição, o Filho que para na porta da Zona Neutra, replay visto de cima e a linha de iniciativa no topo do 3D (ver "Os Filhos na perseguição"). Código genérico |
| `disfarce3d.js` | Disfarce no 3D (Forma de Objeto e cópia, no espírito do Prop Hunt): virar qualquer modelo da sala ou qualquer cobaia, sempre com um detalhe errado que só se vê de perto, o "🔍 Reparar" dos jogadores e a quebra do disfarce (ver "Disfarce no 3D"). Código genérico |
| `filhos.js` | Características dos Filhos: sentidos do auxiliar, movimento, rastro e avisos aos jogadores, ocultação especial e os botões de habilidade (código genérico; quem tem o quê fica nos dados secretos) |
| `sons-filhos.js`, `sons/` | Sons gravados das criaturas: 7 arquivos por forma 3D em `sons/filhos/` (`<forma>-respira.mp3` etc.), áudio posicional, legendas de som (ver "Sons das criaturas"); créditos e licenças em `sons/CREDITOS.md` |
| `img/` | Retratos das cobaias, o ícone da aba e o fundo da Parede de Desejos (`parede.jpg`, `eco-sigilo.svg`) |

## Publicar no GitHub Pages

1. Crie um repositório público (ex.: `Planta-ACF`).
2. **Add file › Upload files** e arraste os arquivos soltos e as pastas `img` e `sons`. O `index.html` precisa ficar na raiz.
3. **Settings › Pages › Deploy from a branch › main › / (root) › Save**.

## Elevadores

O campo `saida` de cada andar, no `data.js`, diz qual sala leva ao andar de baixo. Sala na borda vira um corredor para fora da planta; sala do meio vira um poço no chão.

## Senhas (aba Segredos do Mestre; painel dos auxiliares)

Uma pasta com tudo o que se passa para os jogadores: a senha de cada andar, a chave da Parede de Desejos, os códigos dos cofres do Arquivo e outras senhas livres (porta, cofre, rádio…), cada uma com botão de copiar. Os auxiliares veem a mesma pasta, só para leitura.

- **Trocar a senha de um andar:** digite e clique em Salvar. O site pergunta se quem já tinha entrado deve ser trancado de novo. Cada andar tem a sua, sem padrão entre elas.
- **🔒 Trancar de novo:** botão por andar. Todos os jogadores que já tinham entrado voltam para a tela da senha naquele andar, na hora (fica em `mapa/trancaAndar`).
- **Exportar e importar:** um `.json` com todas as senhas. Importar troca as dos andares, a chave da Parede e as outras de uma vez. Os códigos dos cofres vão no arquivo só para consulta (eles mudam no próprio documento). **Nunca envie esse arquivo ao GitHub.**
- **Como fica guardado:** o texto das senhas em `senhas` (Mestre e auxiliares leem, só o Mestre grava). Para conferir a senha do andar, o site usa só o hash, em `mapa/senhasAndar`. O `config.js` guarda hashes de reserva, usados enquanto a pasta não tiver a senha daquele andar.

A trava dos andares é feita no navegador. Ela segura o jogador comum, mas quem souber ler código consegue contornar.

## Funções das cobaias

As funções nunca ficam no código (o repositório é público). O Mestre preenche no painel **Funções (só o Mestre vê)**; elas ficam no navegador dele ou, com Firebase, num caminho que só a conta do Mestre lê.

## Perseguição e dados

- Escala: cada sala tem 50 m² (a grade do piso tem 8 x 8 quadradinhos de 0,88 m); cada corredor mede 14 m.
- **Há um bloco só de perseguição: "Perseguição (Sobrevivendo ao Horror)"**, na aba Mesa do Mestre (a aba Sessão tem um cartão-atalho que abre o mesmo bloco; a busca também acha). Em cima, as regras do livro (DT pela velocidade, tamanho, perícia, eventos da Tabela 2.3); embaixo, três seções recolhíveis: **Participantes e ordem** (quem entra, 🐇 presa ou 🐺 caçador, iniciativa, deslocamento por vez), **Filhos na perseguição** (`perseg3d.js`) e **Fuga dos jogadores** (`fuga3d.js`). O bloco antigo "Perseguição (Mestre)" da aba Sessão não existe mais: a ★ de quem o tinha como favorito passa para o bloco único.
- O Mestre marca os participantes na lista (cobaias, NPCs, robôs e Filhos do andar; quem está fora do mapa entra pela caixa "Fora do mapa"), diz quem é presa ou caçador, preenche a iniciativa (ou rola no 🎲) e toca em **Iniciar perseguição**: começam juntos o teste estendido do livro (sucessos antes de falhas, em `mapa/persSaH`) e a vez no mapa e no 3D (ordem pela iniciativa, limite de metros, piloto, abertura, linha de iniciativa, em `mapa/persg`). A mesma lista alimenta os dois: cobaias viram presas (ou caçadoras) do teste estendido; Filhos e NPCs entram como NPC, com o 🎲 do Mestre para rolar por eles. O Encontro (`momento.js`) começa as duas coisas do mesmo jeito. **Encerrar perseguição** encerra as duas; se a perseguição do mapa acabar por outro caminho, o teste estendido acaba junto.
- **Rodada e vez andam juntas:** o "Próximo turno" de quem é o último da ordem abre a rodada seguinte (do mapa e do teste estendido: DT da rodada seguinte, evento da Tabela 2.3 sorteado) e avisa o Mestre para pedir os testes; "Próxima rodada" do teste estendido recomeça a ordem da vez. Os jogadores veem "Agir nesta rodada" de novo a cada rodada.
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

## HUD limpo (todos os perfis)

- **Visual limpo por padrão** em todos os aparelhos. No ⚙ do painel dá para voltar ao **Visual clássico** neste aparelho (fica no navegador).
- **Topo:** botões discretos; abaixo de 1180 px só os ícones (📋 Fichas, 🖍 Quadro, 💬 Chat); o botão do perfil mostra só o nome (▾ troca de perfil). No celular estreito o 🔊 Som (e, abaixo de 380 px, o ? Ajuda) passa para o ⚙ do painel.
- **Câmera:** à vista só **+**, **−**, **◎** centralizar (e **◉** ir até a minha cobaia, para o jogador); o **⋯** abre girar, ISO, TOPO, mover e régua (e lembra se ficou aberto).
- **Retratos:** cartões compactos com a foto no anel da cor da cobaia, nome e PV; a mancha de sangue só aparece em quem está Morrendo. O Mestre vê uma coluna estreita só com foto e PV (nome ao passar o mouse); no celular, uma fileira pequena.
- **Dados:** botão redondo 🎲 no celular. A dica de como mexer no mapa só aparece nas 3 primeiras visitas.
- **Painel:** títulos mais leves; para o jogador, os atalhos da cobaia (Loja, Arquivo, Regras, Hall, Parede, Cor) em grade de duas colunas. No alto do painel: **Procurar ferramenta…** (Mestre e auxiliares; procura pelo título do bloco em todas as abas e, se nenhum título bater, pelo conteúdo), **☰/▦** (lista de ferramentas ou todos os blocos; ver "Painéis: lista de ferramentas"), **⊟ recolher tudo** e **⊞ abrir tudo** (no modo todos os blocos) e **⚙**. A **★** no título de um bloco o leva para o topo do painel (favoritos por aparelho).

## Painéis: lista de ferramentas (`paineis.js`, `paineis.css`)

Vale para o Mestre (as 5 abas), os auxiliares e os jogadores, no visual limpo. O **Visual clássico** (⚙) volta ao painel antigo.

- **Cada aba abre como uma lista de cartões.** Cada cartão tem o ícone do bloco, o título e **uma linha de chips com o estado vivo**  (ex.: "Perseguição (Sobrevivendo ao Horror) · ⏸ parada · 👥 7 marcados" ou "▶ Rodada 2 · 7 na ordem", "Ambiente · 🔇 silêncio · 🎚 85%", "Backup · ⬇ baixar · 🕒 automático 22:16"). A borda esquerda tem a cor da categoria; borda vermelha quando o bloco pede atenção (limite de ruído rompido, pedidos esperando, apagão ligado). Os chips se atualizam sozinhos a cada pouco mais de 1 s. Um bloco pode ter um **cartão-atalho** em outra aba (a Perseguição mora na Mesa e tem um cartão na Sessão): o cartão abre o mesmo bloco, sem duplicar; ← volta à lista da aba de onde veio.
- **Filtros em chips** no topo das abas com muitas ferramentas (Sessão e Mesa): Todos · 🎬 Cena · 🎲 Testes · ☠ Regras do SaH · 🏆 Recompensas · 🌧 Clima e ambiente · 📋 Registro · 🎛 Controle. A escolha fica guardada por aba neste aparelho. Logo abaixo, uma linha em mono resume ("25 ferramentas · 2 ★ · 1 pedindo atenção").
- **Tocar num cartão abre o bloco como folha**: no celular ocupa a tela inteira; no computador abre dentro do painel (as abas continuam no alto). O cabeçalho fixo tem **← voltar**, o ícone, o título, os mesmos chips do cartão, **?** (explicações) e **☆/★** (favorito). Esc também volta. Trocar de aba fecha a folha.
- **★ favoritos** continuam subindo para o topo da lista. **Procurar ferramenta…** filtra os cartões de todas as abas (o cartão diz de que aba é).
- **☰ / ▦** na barra do painel alterna entre a lista de ferramentas e o painel antigo com todos os blocos abertos, um embaixo do outro (o ⚙ tem a mesma escolha). Nesse modo voltam o ⊟ recolher tudo e o ⊞ abrir tudo.
- **Jogador:** "Sua cobaia" fica sempre à vista no alto como cartão herói (retrato, barras de PV, SAN e PE, Nível e NEX em chips, Examinar e Olhar, e Loja, Arquivo, Regras, Hall, Parede e Cor em grade de ícones), com a lista de ferramentas embaixo. Durante uma perseguição, o bloco da perseguição também fica à vista.
- **Por dentro dos blocos:** caixas de seleção viram chips liga/desliga; explicações longas ficam atrás do **?** (as curtas e as que mostram estado continuam à vista); blocos grandes ganham **seções em abas** (Colocar no mapa: Cobaias e NPCs · Filhos · Grupo; Kit do auxiliar: Filhos · Robô · Rolagem · Cores; Cores; Senhas; Painel de retratos; Sessão: Tensão · Holofote · Cobaia · Dilema) ou **seções recolhíveis** (Ambiente: Trilha por andar e Sons próprios começam fechadas; Câmeras de segurança; Perseguição: Participantes e ordem aberta, Filhos na perseguição e Fuga dos jogadores fechadas). A aba e as seções abertas ficam guardadas por aparelho. Personagens viram uma grade de chips com retrato; participantes da perseguição, cartões de uma linha; a lista de cobaias, cartões com a borda na cor de cada uma e mini barras de PV, SAN e PE (o Mestre vê de todas; o jogador, só a própria). Os filtros do Diário e a velocidade do replay viram chips.
- **Nada mudou no comportamento:** os blocos continuam no mesmo lugar da página, com os mesmos ids; a lista só decide qual aparece. Outros módulos abrem um bloco com `ACF_PN.abrir('idDoBloco')` (`ACF_PN.fechar()`, `ACF_PN.aberto`, `ACF_PN.ligado`).
- **Nada passa da tela nem fica comido** (360, 390, 412, celular deitado 740 x 360 e 1280): as abas do Mestre mostram o nome inteiro; o título e o estado no alto da folha quebram linha em vez de virar "…"; colunas de campos (Funções, participantes da Perseguição SaH) encolhem ou caem para uma coluna; textos sem espaço (links no chat, tradução de robô) quebram dentro do balão; no celular, a gaveta do painel começa abaixo das faixas de perseguição, Protocolo e apagão, e as cartas "Sua vez" descem para a borda de baixo com o painel rolando acima delas. Abas que rolam de lado continuam com o degradê na borda; os chips de estado dos cartões da lista continuam numa linha só (o cabeçalho da folha mostra tudo).

## Celular

- Ao entrar, a câmera já abre com zoom de cerca de 3 x 3 salas, centrada na sala da sua ficha. O botão ◉ volta até ela.
- As salas mostram só o CN; tocar numa sala abre um cartão com o nome completo e quem está ali.
- A lista de cobaias, o ruído e a perseguição ficam numa gaveta que sobe da aba no rodapé.
- Com mais de 3 fichas na mesma sala, elas se arrumam em fileiras no rodapé da sala (só na tela).
- O cartão da sala (ou da ficha) ocupa no máximo a metade de baixo do mapa, acima do botão Dados. O × fica preso no canto e acompanha a rolagem do cartão; tocar num ponto vazio do mapa também fecha. As anotações da sala usam um campo mais baixo.
- Ficha de Ameaça e de Filho no celular: três abas no topo (Ameaça ou Filho · Perícias e defesas · Ataques e ações), como as abas da ficha dos jogadores.
- "Trocar" (no botão do seu nome, no topo) pede confirmação antes de tirar você do perfil.
- Tela de senha do andar: enquanto ela aparece, o botão Dados, os retratos e a câmera somem, para nada cobrir o "Liberar".
- Faixas do topo (Perseguição, Protocolo, Apagão) ficam uma embaixo da outra, e a fileira dos andares desce junto; o Holofote aparece abaixo dos andares e não bloqueia o toque.
- Alertas do Mestre: várias cobaias entrando no mesmo lugar viram um aviso só ("Faca, Sabonete e Mostarda entraram…"); com 2 ou mais avisos aparece "Fechar todos".
- A Sala de Exposição minimizada fica acima do botão Dados; a etiqueta da Investigação fica no canto direito, fora do retrato do jogador.
- Quadro: as 12 ferramentas ficam em duas linhas, todas à vista; o menu "•••" não mostra atalhos de teclado.
- Hall da Caixa: o topo com o × acompanha a rolagem.
- Diálogos (Ajuda, Loja…) sempre abrem no começo do texto.
- Abas e barras que rolam de lado (ficha, Arquivo, Escudo, Quadro…) ganham um degradê na borda quando há mais coisa escondida.
- Botões de fechar com 44 px; caixinhas e campos da perseguição maiores. Botões sem estilo no painel (ex.: "Revelar agora", "consultar a pedra") seguem o tema escuro. Em celular pequeno (até 400 px), o nome do andar fica menor.
- A gaveta fechada some de verdade: o "Próximo" do teclado não pula para campos escondidos nela.
- Pinça fora do mapa (no cartão, na gaveta, no topo) não amplia a página inteira. O topo, a faixa dos andares e o mapa nunca rolam: se o navegador empurrar a página ao abrir ou fechar o teclado, tudo volta para o lugar.
- No celular, o símbolo do Eco não usa mistura de cor sobre o mapa (no Chrome do Android isso deixava partes da tela em branco até trocar de aplicativo).

Diário, anotações, funções, Balança e a lista do apagão ficam em `segredos`, que só a conta do Mestre lê. As regras do Firebase não mudaram.

## Chat, portas e ferramentas de mesa

- **Apagar mensagens (Mestre):** cada mensagem do chat (Geral, Sussurros e Filhos) tem um 🗑 ao lado do horário, só na tela do Mestre. O primeiro toque vira "apagar?" em vermelho; o segundo, em até 3 segundos, apaga para todos. Apagar uma resposta sua num sussurro tira também da caixa do jogador. O "Apagar todo o chat" continua lá para limpar tudo de uma vez.

- **Idioma da C2P0:** tudo o que a C2P0 escreve no chat aparece como bips e zips. Cada letra vira um par de sons (S, N, T… "zip zip"; I, E, R… "zip bip"; A, O, M… "bip zip"; B, D, G… "bip bip"); números viram "bzzt"; "sim", "não" e "não sei" são palavras fixas ("Zip zip zip bip bip zip", "Zip zip bip zip bip zip", "Zip zip zip zip zip"). O texto original vai embaralhado. Mestre e auxiliares leem a tradução embaixo. O jogador toca na mensagem para conjurar Compreensão Paranormal pela ficha ativa (precisa ter o ritual; cobra o custo e o Custo do Paranormal) e escolhe traduzir só para si ou para todos (`chatTrad`).

- **Chat** (botão 💬 no topo, painel próprio): **Geral** (todos), **Sussurro ao Mestre** (só o Mestre lê; a resposta dele chega só para quem mandou) e **Filhos** (Mestre e auxiliares). O Mestre apaga tudo com "Apagar todo o chat". As rolagens dos jogadores entram no Geral ou, se o Mestre desmarcar a opção, só no Sussurro; as dos auxiliares vão para o canal Filhos.
- **Portas:** clique num corredor e escolha Trancada, Destruída ou Carne. Jogadores e auxiliares não passam; o Mestre passa sempre.
- **Sinal no mapa:** o jogador segura o dedo (ou o botão do mouse) num ponto, e só o Mestre vê o sinal piscando.
- **Relógio da Caixa:** o Mestre ajusta; todos veem. À 00:00 aparece o aviso dos robôs; opcionalmente liga o Apagão e começa um novo dia.
- **Ficha resumida:** o Mestre preenche PV, SAN, PE e NEX no cartão da cobaia; o jogador vê a dele no painel.
- **Sua vez:** na perseguição, o celular de quem está na vez vibra e mostra "SUA VEZ".
- **Trilhas de Ausência:** no cartão da sala, "Sem sinal"; quem entrar vê só a própria ficha até sair.
- **Exposição (NEX):** conta as entradas de cada cobaia em salas de cada elemento.
- **Arquivos nas salas:** texto e imagem anexados pelo Mestre, revelados quando ele quiser; o jogador abre pelo cartão da sala.
- **Tela da mesa:** `…/Planta-ACF/?tv=1` mostra só o mapa, com a visão dos jogadores, para uma TV. Ver "Modo Tela".

### Modo Tela (TV da mesa)

Para a TV ligada no computador do Mestre (cabo HDMI, 2º monitor). Bloco **Mesa** (aba Sessão) › **📺 Modo Tela**:

- **Abrir a janela da Tela:** abre uma janela só com o mapa. Arraste-a para a TV e clique nela uma vez (tela cheia). O status mostra "● Tela conectada" com a resolução real.
- **Vista:** 3D ou 2.5D. A Tela fica travada na vista escolhida, mesmo que você mude a sua.
- **Câmera** (troque quando quiser):
  - **Segue os jogadores:** vai para o andar com mais cobaias e enquadra todas; aproxima ou afasta conforme elas se espalham.
  - **Eu escolho a sala ou o jogador:** lista os jogadores e as salas já reveladas.
  - **Copia a minha câmera:** a Tela mostra o que o seu 3D (ou o seu 2.5D) está mostrando. Quando você controla um token que não seja uma cobaia à vista (um Filho, um NPC, uma cobaia oculta) ou entra na visão da criatura, a Tela **congela** na última imagem e o bloco avisa.
- **Resolução do 3D:** 720p, 1080p, 4K ou a nativa da TV. Vale só para a Tela; a qualidade automática continua ajustando o resto (sombras, luzes), mas não mexe nessa resolução.
- **Som na Tela:** começa desligado (o som do seu computador já sai). Ligue se a TV for a caixa de som da mesa.
- **O que a Tela mostra:** o mesmo que a mesa enxerga. Cobaias à vista (inclusive as escondidas num esconderijo, como para um auxiliar), salvo as que você ocultou e durante o apagão; Filhos, NPCs e robôs pelas regras do jogador (ocultos, no teto, Forma de Objeto e lentes não aparecem); salas reveladas e as salas onde há cobaia; andares em que a mesa já está ou que têm sala revelada.
- **Segurança:** a janela da Tela nunca usa a conta de quem a abriu. Se herdar a sessão do Mestre, ela sai dessa conta só nela mesma; nada do privado é lido. Os comandos e a câmera passam de uma janela à outra pelo navegador (BroadcastChannel), sem servidor: só funciona no mesmo computador e no mesmo navegador.
- **Desempenho:** a Tela desenha o 3D de novo, na placa de vídeo do mesmo computador. Com o seu 3D aberto ao mesmo tempo, são duas cenas por quadro; em 4K, a Tela custa cerca de 4 vezes o que custa em 1080p.

## Loja do Maurício

- Os jogadores abrem pelo botão **🛒 Loja do Maurício** no painel ("Sua cobaia"). Cada venda mostra imagem, custo em Sucatas Maiores e Menores, opções com dano e crítico, e o botão **Pedir**.
- O pedido chega no Sussurro do Mestre ("🛒 Pedido ao Maurício: Pistola…"). Por padrão o Maurício só atende quem está na Zona Neutra, e a loja pode ser fechada (aba Sessão).
- O catálogo inicial é o do PDF "Itens do Maurício" (`data.js`, imagens direto na pasta `img/`). O Mestre abre a loja pela aba Sessão para **criar vendas novas** (nome, custo, opções "nome ; dano ; crítico", descrição, imagem), editar, ocultar ou apagar. Venda oculta só aparece quando ele mostrar.
- As sucatas de cada cobaia ficam na ficha resumida (o Mestre preenche); o jogador vê as dele na loja.

## Restaurar o site (aba Segredos → Backup)

"🧹 Restaurar o site…" apaga o que foi feito nos testes. Você marca o que zerar: **Mapa e jogo**, **Conversas e respostas** e **Registros** vêm marcados; o que você preparou (regras restritas, Arquivo, Salas de Exposição, conquistas criadas, sons, loja, quadros, gatilhos, senhas, funções e nomes secretos das salas, características dos Filhos e etiquetas das salas, Hall) vem desmarcado. As **fichas dos jogadores ficam de fora** (o Mestre não altera fichas; a lista mostra quais existem no servidor). Antes de apagar, o site baixa `backup-antes-de-restaurar-….json`; o "Restaurar backup…" devolve tudo, inclusive chat e relatório. Para confirmar, digite RESTAURAR. Com "Aparelhos de todos", cada celular e computador, ao abrir o site, apaga as visões recebidas, votos, respostas, telas já vistas, avisos e cofres abertos (o Caderno e as fichas ficam); com "Andares liberados", os jogadores digitam a senha dos andares de novo. Em `mapa/restauracao`.

## Mais ferramentas

- **Jogadores:** linha tracejada com os metros ao arrastar; Caderno (só no aparelho); aviso de conexão perdida; botão **?** com a ajuda do seu perfil; botão **🔊** para desligar os sons.
- **Mestre:** painel em abas (Mapa, Sessão, Registro, Segredos); "Ver pelos olhos de" um jogador ou auxiliar; gatilhos nas salas (alerta quando uma cobaia entra); cenas prontas; Shift+clique para mover em grupo e "Trazer todas as cobaias para cá"; resumo da sessão para imprimir ou salvar em PDF; lista de quem está conectado.
- **Auxiliares:** escuta imprecisa (mancha borrada perto de onde veio o som, nunca a sala exata, e seta em cada Filho e no robô apontando o som mais forte, com direção e distância aproximada); rastro que vai apagando; sinal no mapa visível aos outros auxiliares e ao Mestre; iniciativa de todos os Filhos do andar de uma vez.
- **Kit do auxiliar:** colocar Filhos ocultos no andar aberto e tirar os que ainda estão ocultos; fichas de ameaças e Filhos divididas com o Mestre (`agentesAux`), com o pedido de Presença Perturbadora; Escudo do Mestre; rolagem secreta; cores dos Filhos e do próprio robô.
- **Cores:** cada jogador muda a cor da própria cobaia (🎨 no painel), os auxiliares a dos Filhos e do robô, e o Mestre a de todos (bloco Cores na aba Mapa). Paleta pronta ou qualquer cor no espectro; "Voltar à cor original" usa a do `data.js`. Fica em `cores` no Firebase.

## Fichas de agente (📋 Fichas, atalho F)

Ficha editável de Ordem Paranormal, no estilo do C.R.I.S.: atributos, perícias (o atributo de cada uma pode ser trocado), PV, SAN e PE (ou PD na regra de Determinação), defesa, esquiva e bloqueio, habilidades, rituais com DT e custo, inventário com patente, limite de itens por categoria, crédito, carga e melhorias ou maldições nos itens. Tudo que é calculado tem um campo de ajuste para regras da casa.

- **Jogador:** cria e edita as próprias fichas. Cada ficha tem um código secreto (aparece dentro dela); em outro aparelho, "Abrir por código". Fichas de outra cobaia abertas por código ficam só para leitura.
- **Mestre:** "Fichas dos jogadores" mostra todas, ao vivo, só para leitura (o Firebase recusa qualquer alteração vinda da conta do Mestre). "Minhas fichas" guarda NPCs e inimigos, que só o Mestre vê.
- **Catálogo:** habilidades por classe, trilha, origem, poderes paranormais e homebrew; rituais por elemento e círculo; itens por tipo e fonte. A aba "Minhas" reúne o que você criou nas suas fichas, para reaproveitar.
- **🎮 Em jogo (aba padrão):** tudo o que se usa na mesa em botões grandes: PV, PE e SAN com − e +, o turno (Padrão, Movimento e Reação, que se marcam sozinhos ao atacar ou conjurar e somem quando o turno muda), ataques, perícias treinadas, habilidades com botão de uso, rituais e itens usáveis.
- **Ataque em um clique:** "⚔ Atacar" rola o ataque e o dano juntos; se o d20 escolhido chega na margem de crítico da arma, o dano sai multiplicado. "Só dano" fica para ataques que acertam sem teste.
- **Habilidades com uso:** um botão "⚡ usar" gasta o custo (respeitando o limite por turno) e guarda o bônus para o próximo teste que combinar (qualquer, perícia treinada ou sem treino, ataque ou um atributo). Saber é Poder, Perito e Eclético já vêm preenchidas; as outras se configuram dentro da habilidade.
- **Poderes que mudam a conta sozinhos:** com **Racionalidade Inflexível** na aba Habilidades (pelo nome, com ou sem acento), Vontade passa a usar Intelecto e o PE máximo é calculado com Intelecto; a barra mostra "PE · INT". Vale quando Intelecto é maior ou igual a Presença (o poder diz "pode usar"). Um atributo escolhido à mão na perícia continua mandando. PD (regra de Determinação) e DT de rituais seguem com Presença. Quem já tinha compensado o poder no "ajuste" do PE precisa zerar o ajuste.
- **Itens usáveis:** "Usar em mim" rola e soma na ficha; "Usar em outra pessoa" rola e mostra o número. Gasta uma unidade se marcado. O Cicatrizante já vem pronto; os outros se configuram no item. Conjurar sem Componentes Ritualísticos do elemento pede confirmação.
- **Registro da cobaia (aba Descrição):** contadores de 20 e 1 naturais, rituais conjurados, Presenças resistidas, interlúdios e noites em claro, com medalhas de bronze, prata e ouro.
- **Exportar e importar:** cada ficha baixa um arquivo `.json` (cópia de segurança). "Importar arquivos" cria fichas novas a partir deles, vários de uma vez, na aba aberta: Minhas fichas (jogador, auxiliar ou Mestre) ou Ameaças e Filhos (Mestre e auxiliares).
- No Firebase, as fichas ficam em `agentes` (jogadores) e `agentesMestre` (Mestre). As regras novas estão no arquivo de regras entregue junto com esta versão.

## Mesa de Ordem Paranormal (aba Mesa do Mestre)

- **Painel de retratos:** foto, nome, PV e PE (ou PD) sobre o mapa, no estilo das transmissões. Cada jogador vê só o próprio; o Mestre marca quem aparece na tela dele e na de cada jogador. Os números vêm da **ficha ativa** (★ na ficha), que manda PV, PE e SAN para o token.
- **Ficha ligada ao mapa:** PV 0 vira Morrendo, SAN 0 vira Enlouquecendo (com Determinação, dano mental maior que os PD). Os turnos contam sozinhos na perseguição; "Nova cena" zera. As condições de Ordem Paranormal marcadas no cartão da cobaia entram nas rolagens da ficha (−O, −OO, Defesa, deslocamento).
- **Ameaças:** ficha de criatura (VD, Presença Perturbadora, PV, ataques). "Chamar o teste" abre na tela de cada jogador o teste de Vontade com a ficha dele; o jogador confirma o dano de SAN (ou PD) e o Mestre vê as respostas.
- **Interlúdio (Cenas fora de combate, regra da casa):** o Mestre escolhe **descanso curto** (1 ação, só gerais; no máximo 2 por dia) ou **longo** (2 ações) e a condição do lugar (precária ½, normal, confortável ×2, luxuosa ×3). Gerais: relaxar (SAN = nível, +1 por colega que relaxar), alimentar-se (saboroso, nutritivo, energético ou rápido), exercitar-se e ler (+1d6 automático nas rolagens de uma perícia por 1 semana; limite de perícias = Vigor ou Intelecto; o jogador tira com × quando a semana acaba), revisar caso (rola a perícia; o Mestre compara com a DT da cena), manutenção e fabricação de campo (Profissão contra DT 15 a 35, improvisado −5, +1 item a cada 5 acima). Especiais (só no longo): sono leve (PV e PE = nível × condição), sono restaurador (2 ações: tudo cheio e limpa as condições), alerta, esgueirar-se (2 ações, com alvo) e Aprendendo com a S.T.A.F.F.
- **Ficar acordado:** quem não dorme no longo conta mais um dia sem dormir e rola Fortitude ou Vontade (DT 10/15, 15/20, 20/25); as condições (fraco e frustrado, depois debilitado e esmorecido, depois exausto e alquebrado; no 4º dia inconsciente e indefeso) ficam na própria ficha e entram nas rolagens até um sono restaurador. O sono leve zera a contagem, mas não tira as condições.
- **Noite secreta:** alerta, esgueirar-se e as ações noturnas das regras restritas não aparecem para os outros jogadores. Na tela do jogador a ação da função aparece com nome neutro ("🔒 Ação noturna"); o nome dela só aparece dentro de "Ler a regra". O site rola Furtividade e manda só para o Mestre (`avisos` → `segredos/_noite`). No bloco do Interlúdio o Mestre vê, em "Noite · só você vê", quem foi até quem, o estado do alvo e a DT (em alerta 30, sem dormir ou "estado padrão" 25, sono leve ou "dormindo" 20, sono restaurador ou "sono profundo" 15), a faixa (sucesso, falha, falha por 10 ou mais) e o 1 natural para decidir a falha crítica.
- **Efeitos da noite:** cada regra restrita pode ter cura (ex.: `3d8+VIG`, com os atributos de quem agiu), NEX (−5% ou +5%) e marca (marcar ou tirar a marca do alvo). Viram botões na lista da noite (em destaque quando a ação deu certo). A cura chega na ficha ativa do alvo por `entregas/<hash da chave da ficha>` (o Mestre continua sem editar fichas: o aparelho do jogador aplica e apaga a entrega). O NEX entra na Calculadora; as marcas ficam em `segredos/_marcas` e aparecem no topo da lista. A regra pode permitir "mirar em si mesmo (sem teste)".
- **Tirar condições das fichas (Mestre):** o Mestre continua sem editar fichas, mas, ao abrir a ficha de uma cobaia em "Fichas dos jogadores", cada condição do sono (fraco, frustrado…), os dias sem dormir e os bônus de interlúdio (treino, prato rápido, bônus guardado) ganham um ×, além de "🧹 Limpar tudo". O pedido vai por `entregas/<hash da chave da ficha>` e o aparelho do jogador apaga na hora em que estiver com o site aberto (só esses campos podem ser apagados assim). No bloco Interlúdio, "🧹 Tirar o cansaço de todos" faz isso com as condições do sono de todas as cobaias. As condições marcadas no cartão da cobaia (`mapa/cond`) continuam saindo pelo próprio cartão.
- **Chat sem spoiler:** o interlúdio não manda mais o resumo das ações para o chat. Só quando alguém falha no teste de ficar acordado aparece uma mensagem neutra ("😵 Fulano amanheceu fraco e frustrado"), sem dizer a causa.
- **Rolagem em destaque:** no Pedir teste, marque "🎲 Em destaque": quando a cobaia rola, o d20 gira devagar na tela de todos e para no resultado (20 dourado, 1 apagado). A DT continua só com você; se marcar "mostrar se passou", aparece PASSOU ou FALHOU. O resultado não vai para o chat.
- **Pedir teste:** o Mestre escolhe a perícia, a DT (fica nos segredos dele, `segredos/_testes`) e as cobaias; um botão aparece na tela de cada uma, que rola com a própria ficha. O bloco mostra quem passou e por quanto e quem ainda falta. "Secreto" tira o resultado do chat.
- **Nível e NEX são coisas separadas:** a ficha tem **Nível** (1 a 20) e **NEX** (exposição paranormal, 0 a 99). PV, PE, SAN e o **limite de PE por turno** saem do nível (nível 1 = antigo NEX 5% do livro … nível 20 = 99%; limite de PE = nível). O NEX das cobaias vem da Calculadora de NEX e aparece só para leitura na ficha do jogador, no retrato e no cartão; nas fichas de NPC o NEX se edita na própria ficha. Fichas antigas ganham sozinhas o nível que o NEX antigo representava.
- **Calculadora de NEX:** os 7 cartões, botões rápidos **−5, −1, +1, +5** e **"= …"** (define o valor exato) em cada cartão, os 5 gatilhos (criatura +2, sala de medo leve +2 e moderada +3, aprender ritual +1, transcender +1) e o ajuste com motivo em "Gatilhos e ajuste com motivo", "desfazer último" (corrigido: antes procurava o registro pelo nome do gatilho e não achava nada), o NEX nunca passa de 0% a 99% (o registro grava só o que coube), histórico com filtro e "reverter", NEX inicial editável e backup no mesmo formato da calculadora antiga. Como a Planta mora no mesmo endereço da calculadora antiga, o painel avisa quando encontra os registros dela no navegador e traz com um clique. Cada aumento cai na ficha do jogador na hora e entra no Relatório. Fica em `nexCalc` (Mestre e auxiliares); o valor atual vai para `mapa/nex`.
- **Sugestões de NEX:** quando o Mestre chama uma Presença Perturbadora, quando uma cobaia entra numa sala de Medo (a Zona Neutra fica de fora) e quando o jogador adiciona um ritual ou Transcender pelo catálogo da ficha, aparece um alerta com o gatilho certo ("+2 Exposição à criatura", "+2 leve" ou "+3 moderada", "+1 Aprender Ritual"…) e o botão de aplicar. Nada sobe sozinho. As sugestões também ficam listadas no bloco da Calculadora. Os avisos dos jogadores passam por `avisos` (o jogador só cria; só o Mestre lê e apaga depois de ler).
- **Marcos de NEX:** ao passar de um marco, o Mestre recebe um alerta com o que muda. O padrão segue a regra opcional "NEX & Experiência" de Sobrevivendo ao Horror (p. 98 a 103), a mesma separação de nível e NEX desta campanha: 25%, 35%, 50%, 60%, 75%, 90% e 99%. Valores e textos se editam em Ajustes. Os marcos aparecem como traços na barra de cada cobaia, com o próximo marco.
- **Parede de Desejos:** o mesmo visual e o mesmo Cloudflare Worker do site antigo (a chave da IA continua só no Worker; a contagem de desejos é a mesma nos dois sites). O Mestre desperta a Parede e os jogadores ganham o botão 🧱; cada um deseja só pela própria cobaia, o Mestre por qualquer uma. A chave de acesso é pedida uma vez por aparelho (quem já usou o site antigo no mesmo aparelho não digita de novo) e fica na pasta Senhas. Cada desejo e o preço chegam ao Mestre (alerta, lista na Mesa e Relatório) e ficam no histórico do aparelho do jogador. **Dívidas:** o preço também entra na ficha ativa do jogador, na aba Descrição, em "O que devo à Parede"; o Mestre marca cada um como cobrado na lista da Mesa (`mapa/dividas`) e a ficha atualiza na hora. No Firebase: `desejos` (o jogador só cria; só o Mestre lê).
- **Fim de missão:** PP e nível por cobaia; a ficha ativa recebe uma vez só (patente, crédito e limites sobem). A loja avisa quando um item passa do limite da patente.
- **Trilha por andar (bloco Ambiente):** escolha um som para cada andar e ligue a trilha. Quando nenhum ambiente está tocando, o jogador ouve o som do andar onde a cobaia dele está; você e os auxiliares, o do andar que estão vendo. Escolher um ambiente acima tem prioridade; o 🔇 Silêncio volta para a trilha. Em `mapa/trilha`.
- **Ambiente:** a música **Dead Waltz** (`audio/dead-waltz.mp3`, em "Músicas do site"), 5 sons dos elementos e 11 da Caixa (chuva, goteira, fluorescente, maquinário, vento, coração, sirene, rádio, relógio, sussurros, tensão), todos feitos no navegador, com volume para todos. **Sons próprios:** o Mestre envia um áudio (até 4 MB) ou cola um link direto (mp3, ogg…, ou um arquivo do próprio repositório, como `audio/chuva.mp3`) e toca em repetição ("▶ Ambiente") ou uma vez para todos ("🔔 Uma vez"). Exportar e importar a biblioteca em `.json`. No Firebase: `sonsIdx` (lista) e `sons/<id>` (o áudio, baixado só quando toca).
- **Clima:** a tela do jogador desbota com a SAN baixa e pulsa em vermelho morrendo; conjurar mostra um sigilo na cor do elemento para todos e rola o Custo do Paranormal; o Mestre liga um ambiente sonoro por elemento.
- **Ferramentas:** cena de investigação (urgência, rodadas, falhas e pistas numa faixa no mapa) e rolagem secreta.
- **Escudo do Mestre:** as mecânicas do sistema em 20 tópicos (Testes, Combate, Dano e sanidade, Condições, Rituais, Investigação, Perseguição, Furtividade, Interlúdio, Mestrando terror, Vida além da Ordem, Evolução por patentes, Conjuração avançada, Combate narrativo e sem mapa, Cenas fora de combate, Perigos, Ameaças, Equipamento, Progressão e Regras da Caixa), com busca por palavra e a página do livro em cada quadro. São resumos do Livro de Regras v1.3, de Sobrevivendo ao Horror e das regras da casa, em `escudo.js`.
- **Regras restritas (tópico no fim do Escudo):** regras que só algumas pessoas leem, como as ações noturnas de cada função. Em cada regra, "Quem vê" marca os auxiliares, todas as cobaias ou cobaias específicas, se ela vira ação noturna no interlúdio e quanto custa (0, 1 ou 2 ações). O texto aceita `# subtítulo`, `- item` e `**negrito**`. Importar e exportar em `.json` (o modelo `regras-noturnas.json` vai fora do repositório; **não envie ao GitHub**). O texto fica em `segredos/_regras`; o site publica `regrasAux` (Mestre e auxiliares leem) e uma cópia por ficha de cada jogador marcado em `regrasJog/<hash da chave da ficha>`, que só quem tem a chave encontra. O jogador lê no Arquivo, pasta "Regras pessoais", e no botão 📖 Regras ("Minhas regras"); as noturnas aparecem no interlúdio dele com 🔒. Se o jogador criar uma ficha nova, clique em "Reenviar".
- **📖 Regras (jogadores):** botão no painel do jogador que abre os tópicos do Escudo liberados pelo Mestre, com a mesma busca, mais "Minhas regras". No Escudo, cada tópico tem a caixa "👁 Jogadores leem" (`mapa/regrasPub`). Começam liberados: Testes, Condições, Furtividade e Cenas fora de combate.
- **Membrana:** cada sala tem estabilidade de 0 a 100. Ritual conjurado na sala tira 5 por círculo (Medo tira o dobro) e Presença Perturbadora tira de 3 a 20 conforme o VD. A sala racha e brilha na cor do elemento; ao romper, o Mestre recebe um alerta. O número só aparece para quem tem um *Medidor de Estabilidade da Membrana* na ficha ativa (no cartão da sala e no retrato). O Mestre ajusta e restaura pelo cartão da sala ou pela aba Mesa.
- **Momentos marcantes:** 20 natural (20 dourado e música de vitória) e 1 natural (1 preto, emojis de choro e música de derrota) nas rolagens da ficha, óbito e insanidade (contador de Morrendo ou Enlouquecendo chegando a 3) viram uma animação curta na tela de todos. O Mestre liga e desliga cada um.
- **Limite de PE por turno:** a ficha soma o PE gasto no turno (botões de −PE e custo de rituais) e avisa ao passar do limite. Na perseguição, cada vez é um turno novo; fora dela, zera depois de um minuto parado.
- **Munição:** a arma aponta para a munição do inventário (as do catálogo já vêm ligadas). Atacar marca o pacote como usado; a "Nova cena" do Mestre desconta (balas curtas e barras de aço duram duas cenas; balas longas, cartuchos, combustível e nitrogênio, uma; foguete sai um por disparo; flechas descontam no fim de missão).
- **Relatório da missão:** enquanto a tela do Mestre estiver aberta, o site anota dano, cura, SAN, PD, PE, rituais, quedas, pistas, Presenças, rupturas, cenas e momentos. "Gerar relatório" monta um dossiê por agente e uma linha do tempo, pronto para imprimir em PDF ou copiar para o grupo. "Nova missão" zera.
- **Abertura da sessão (bloco Sessão):** título, número e nome da sessão, frase, música (Dead Waltz, um som próprio ou um link do YouTube, com o segundo de início) e tempo na tela. Na tela de todos: o sigilo do Eco se desenha em tinta amarela que escorre e ganha o brilho roxo; depois o título, "Anteriormente…" (opcional; "↻ Puxar do Relatório" escreve um resumo) e os créditos, um por vez: cada cobaia com uma mini animação (fósforo riscado, glitch, estática ou pulso) e "interpretado por…", os auxiliares com o robô inicializando e o Mestre no fim. Se o tempo pedido for curto para tantos créditos, a abertura se estica (o formulário mostra o mínimo). "👁 Prévia só para mim" não manda para ninguém. Quem entra atrasado pega do ponto certo; o × fecha só na própria tela e "■ Parar para todos" encerra para a mesa. O navegador só toca som depois de um toque na página: quem ainda não tocou vê "▶ Toque para ouvir a música". Os créditos dos auxiliares e do Mestre se editam no formulário (`Nome | Modelo | robô`). Enquanto a abertura ou o encerramento tocam, o resto do site fica escondido (o mapa 2.5D pesa na placa de vídeo do celular), e no celular o sigilo e os títulos usam efeitos mais leves (sem os filtros de tinta, desfoque e grão). Em `mapa/abertura`.
- **Estilos de abertura:** no formulário, "Estilo": Sigilo do Eco (o da capa), Fita VHS (PLAY, REC, data e tremido de fita), Dossiê da O.R.F.E.U. (pasta de papel com carimbo CONFIDENCIAL e tarja que sai da frase), Terminal (texto verde digitado) e Fósforo riscado (o palito acende e ilumina o título). Os créditos seguem o estilo escolhido. O encerramento usa o mesmo estilo.
- **Cobaia da Sessão:** no bloco Sessão, "🏆 Abrir votação". Cada jogador vota em outra cobaia (não aparece a própria), em segredo, até o tempo acabar. O resultado aparece para todos; em empate, você escolhe uma ou deixa as duas. A vencedora entra sozinha no encerramento (primeiro destaque) e no Hall. Em `mapa/mvp`, votos em `mesaResp`.
- **Encerramento:** o espelho da abertura, com os destaques tirados do Relatório da missão (mais ferido, mente mais abalada, mais sortudo, mais azarado, mais rituais, mais curado), o resumo de cada cobaia e os créditos. Em `mapa/encerramento`.
- **Dilema com votação:** pergunta, 2 a 4 opções e tempo. Aparece na tela de cada jogador; o voto pode mudar até o tempo acabar e, se for secreto, nem o Mestre vê quem votou em quê (só a contagem). No fim, o resultado aparece para todos. Votos em `mesaResp/<id do dilema>`.
- **Tensão do grupo (0 a 100%):** escurece as bordas da tela de todos e pulsa mais rápido conforme sobe. Sobe sozinha +10 a cada Presença Perturbadora chamada e +2 a cada falha numa Sala de Exposição. Em `mapa/tensao`.
- **Holofote:** leva a câmera de todos até uma cobaia ou uma sala, com uma legenda. Também pelo cartão da sala ("🔦 Holofote nesta sala"). Só move a câmera de quem já tem aquele andar liberado. Em `mapa/holofote`.
- **Salas de Exposição (perigos complexos):** "⬆ Importar salas" lê um `.json` do tipo `planta-acf-exposicao` (o arquivo `salas-exposicao.json` vai fora do repositório; **não envie ao GitHub**); "⬇ Exportar" e "+ Nova sala"/✎ editam sem arquivo. Em "Na planta", escolha a sala de exposição e a CN e clique em "📍 Colocar". Quando uma cobaia entra naquela CN, o Mestre recebe um alerta; "▶ Iniciar" (no bloco ou no cartão da sala) escolhe quem participa, o tamanho (quando a sala tem opções), o ajuste de DT (−10 a +10) e o dano (inteiro, metade ou um quarto), e troca o ambiente sonoro. As durações em dados ("1d4+4 rodadas") são roladas na hora e só o Mestre vê.
  - **Na tela do jogador:** o mapa animado da sala (travessia, fuga por zonas, corrida contra a maré, paredes que fecham, labirinto, desabamento, horda ou cena livre), o objetivo, a contagem de sucessos e um botão por ação com perícia e DT. Ele rola com a ficha ativa, uma ação por rodada (duas se passou no teste inicial); "passou por 10 ou mais vale 2" já entra na conta, o dano da ação cai na ficha e o token anda no mapa. Ações sem DT ("Ajudar o Guia", "Proteger-se") ficam "⏳" até o Mestre decidir. "–" minimiza a tela.
  - **Para o Mestre:** rodada (com o total secreto), "Próxima rodada", "⚡ Efeito da rodada" (escolhe os testes e quem recebe; os que dizem "apenas soterrados/engolfados…" vêm desmarcados e o dano pode ser trocado na hora), "🎲 Evento" (tabela de dado da sala), tabela de sucessos e falhas com +1/−1, "Você decide" para as ações sem DT, PV da horda, registro, regras da sala e "👁 Ver como jogador". O efeito da rodada abre na tela de cada um, que rola a resistência com a própria ficha; o dano entra na ficha pelo aparelho do jogador. Biblioteca e salas da planta em `segredos/_expo`, `segredos/_expoMapa`, `segredos/_expoRun` e `segredos/_expoVar`; a sala em andamento em `mapa/expo` (só a parte que os jogadores podem ler: descrição, objetivo e ações, sem o "Efeito" nem o "Extra"); as rolagens em `expoLog/<id>` (cada um só cria).
- **Hall da Caixa:** cada abertura exibida para todos vira um episódio (número, nome, estilo, data) e o encerramento grava as estatísticas daquela sessão (20 e 1 naturais, dano, cura, SAN, rituais, quedas, "voltou do Morrendo") e a Cobaia da Sessão. As Salas de Exposição encerradas como "✓ Superaram" ou "✗ Não superaram" entram na aba Salas. Os jogadores e auxiliares abrem pelo botão 🏛 no painel (você pode esconder no bloco Hall da Caixa). "↻ Gravar a sessão em andamento" atualiza os números antes do encerramento. Em `hall` (todos leem; só o Mestre grava).
- **Conquistas (só o Mestre):** os jogadores não veem nada: nem lista, nem aviso. Importe `conquistas.json` (fica fora do GitHub; **não envie**) ou crie em "+ Nova conquista": nome, ícone, descrição e como ganha (manual, ou um número mínimo de 20 naturais, 1 naturais, rituais, dano, cura, SAN perdida, quedas, voltas do Morrendo, desejos, salas superadas de um elemento ou de qualquer um, vezes Cobaia da Sessão), contando numa sessão ou na campanha toda. As automáticas são verificadas sozinhas (a cada minuto e meio e ao encerrar) e chegam como alerta para você; as manuais você dá no bloco Conquistas. **Quando a cobaia ganha**, aparece na tela dela o banner "CONQUISTA DESBLOQUEADA" (com nome, ícone e descrição) e ela passa a ver as que já tem no Hall, aba "🏅 Minhas conquistas" (mesmo com o Hall escondido). Ela nunca vê a lista completa nem as que faltam. No bloco, "👁 Ver o banner" (ou o 👁 de cada conquista na lista) mostra o banner só na sua tela, para conferir como fica. A coleção de todas as cobaias aparece para você no Hall, na aba "🏅 Conquistas (só você)". Lista em `segredos/_conq`; o que cada cobaia já ganhou vai para `conqJog/<hash da chave da ficha>` (só quem tem a ficha encontra).
- **Baú de achados:** escolha a cobaia e um item do catálogo (ou um item novo) e, se quiser, onde foi encontrado. Na tela da cobaia aparece um baú que treme; ao abrir, o item sobe e entra na ficha ativa dela pelo próprio aparelho (o Mestre continua sem editar fichas). Se o jogador não estiver com o site aberto, o baú espera. Vai por `entregas`; o histórico fica em `segredos/_bau`.
- **Idioma do Mostarda:** o Mostarda (meio escorpião de sangue, meio humano) não fala direito: tudo o que ele escreve no chat aparece para os outros como grunhidos, estalos e chiados ("Krrh! Tsk-tsk!", "Hroo-hhe fff-hraa…"), com voz própria: grunhido grave (a metade humana), estalo de pinça e a estridulação do escorpião (o chiado áspero de ameaça). Tocar na mensagem dele toca o barulho de escorpião completo (duas batidas de pinça, patas arranhando e a estridulação) antes da voz; quando a mensagem chega, toca uma versão curta. "Sim" (Krrh! Tsk-tsk), "Não" (Hhhrrrgh) e "Não sei" (Tsk… tsk… hrrm) são fixos e sempre soam igual. Funciona como a C2P0: o texto vai embaralhado para o servidor; você, os auxiliares e o próprio Mostarda leem o original; os outros traduzem com **Compreensão Paranormal** tocando a mensagem (só para si ou para todos), pagando o custo da ficha ativa. Rolagens de dado dele continuam normais.
- **Voz da C2P0:** quando a C2P0 fala no chat, todos ouvem os bips e zips (o bip sobe curto, o zip desce arrastado). Sim, Não e Não sei têm melodia própria: Sim sobe alegre, Não desce duas vezes, Não sei treme e sobe como pergunta. Tocar na mensagem repete a voz.
- No Firebase: `mesaResp` (respostas dos jogadores), `efeito` (sigilo e momentos), `relatorio` (só o Mestre), `regrasAux`, `regrasJog` e `entregas`; o resto fica em `mapa`. `expoLog` (Salas de Exposição) e `hall`. **Atualize as regras do Firebase** com `regras-firebase.json` (novo nesta versão: `hall` e `conqJog`, e o Mestre passa a poder ler e apagar de uma vez `chat`, `mesaResp`, `expoLog`, `visoes`, `entregas`, `chatTrad` e `sons`, usado pelo Restaurar).

## Sobrevivendo ao Horror (aba Mesa do Mestre)

Ferramentas das regras novas do livro complementar. Os textos são resumos; a página do livro aparece em cada quadro. Onde a regra da casa (Cenas fora de combate, Regras da Caixa) diz outra coisa, vale a regra da casa.

- **Perseguição (SaH p. 90 e 91):** é o bloco único de perseguição (ver "Perseguição e dados"): o Mestre marca quem entra e quem é presa ou caçador em "Participantes e ordem" (a mesma lista da vez no mapa e no 3D), a DT pela velocidade do adversário (15, 20, 25 ou 30), o tamanho (curta 2/2, padrão 3/3, longa 5/3, caçada 7/3) e a perícia (Atletismo, Pilotagem ou Adestramento). Na faixa dos jogadores, um Filho que ninguém vê aparece como "???". Cada rodada pode ter evento da Tabela 2.3 (obstáculo ou atalho), sorteado ou escolhido. Na tela do jogador aparece a faixa da perseguição e "Agir nesta rodada": ele escolhe a ação (correr, cortar caminho, esforço extra, criar obstáculo, despistar, sacrifício, atrapalhar ou outra perícia), rola com a ficha ativa e manda. O placar de sucessos e falhas de cada um sobe sozinho; o esforço extra tira os PV na ficha; sacrifício dá +O aos aliados; criar obstáculo baixa a DT da rodada. NPCs rolam pelo botão do Mestre. Em `mapa/persSaH`, respostas em `mesaResp`.
- **Furtividade (SaH p. 92 e 93):** visibilidade de 0 a 3 por personagem. O evento da Tabela 2.4 entra sozinho no início da rodada (com alvo sorteado quando é de uma pessoa). O jogador escolhe ação comum (+1), discreta (+0, −O nos testes), chamativa (+2), esconder-se (Furtividade DT 15), distrair (Enganação DT 15, +5 por uso, um por rodada) ou chamar atenção (+2 em si, −1 num aliado). "Fechar rodada" marca quem foi visto (3 ou mais; com a opção de grupo, soma 5 ou mais). Em `mapa/furtSaH`.
- **Medo em jogo (SaH p. 87 a 89, opcional):** o Mestre escolhe a intensidade da visão (inquietante 1d4 DT 15 até aterrorizante 4d12 DT 40), escreve o que eles veem e escolhe quem. Cada jogador rola Vontade com a ficha e aplica o dano mental (mínimo 1). Com Determinação, os dados descem um passo e o dano sai dos PD. Quem chega a 0 ganha, na lista do Mestre, o botão "🎲 Efeito de medo" (Tabela 2.2, 2d10 + efeitos já sofridos na cena). Em `mapa/medoSaH`.
- **Sorteios:** eventos de investigação (2d6, cada evento uma vez por cena; o botão também aparece dentro da Cena de investigação), ferimento da investigação (1d10), efeitos de medo (2d10 + N), trauma (1d6), ferimento debilitante (1d6) e desastre paranormal (1d8). O resultado fica só com o Mestre; "Mostrar para todos" manda um aviso curto. Ferimento e trauma rolam o atributo junto.
- **Bestiário:** `bestiario-sah.json` (fica **fora do GitHub**) traz 29 fichas de ameaça do capítulo 3: 12 criaturas paranormais, 6 ameaças da Realidade, 3 serial killers e 8 animais. Em 📋 Fichas, aba "Ameaças e Filhos", "⬆ Importar arquivos" abre a lista com busca e "marcar todos"; só as marcadas viram ficha. Dá para importar de novo depois para pegar outras. Pessoas e animais usam o elemento "Realidade" e não têm Presença Perturbadora.
- **Catálogo das fichas:** habilidades, poderes gerais, trilhas novas, a classe Sobrevivente (trilhas Durão, Esperto e Esotérico), poderes de origem, 16 rituais, 76 itens e 3 modificações do capítulo 1, com a fonte "Sobrevivendo ao Horror". As abas novas do catálogo de habilidades são "Sobrevivente" e "Poderes Gerais".

## Arquivo da O.R.F.E.U. (📜 no painel do jogador; aba Mesa do Mestre)

- **Organização (todas as abas: Documentos, Cifras, Chave/Decifrar e Visões):** estante à esquerda e leitor à direita; no celular, a estante ocupa a tela e tocar abre o item com "‹ Voltar". Busca, filtros (Mestre: publicados e ocultos; jogador: novos), filtro por sala (ou por cobaia, nas visões), ordem (recentes, data no documento, título, sala) e pastas que abrem e fecham. Qualquer item pode ser fixado no topo (📌, vale para o aparelho). "+ Novo" e "Editar" abrem o formulário numa janela por cima; os botões de cada item ficam fixos no topo do leitor.
- **Para os jogadores:** "NOVO" nos itens ainda não abertos e "LIBERADO" quando o Mestre destarja um trecho ou confirma letras de uma cifra já lida. Cada aba mostra quantos itens novos tem, e o Arquivo abre no mais recente.

- **Cifras de sigilos:** o Mestre escreve a mensagem e o site a mostra num alfabeto de 36 símbolos criados para a Caixa (não são os sigilos oficiais). A chave fica só nos segredos do Mestre; os jogadores recebem apenas os símbolos. Cada símbolo é sempre a mesma letra em todas as cifras. Os jogadores tocam num símbolo para dar um palpite, que todos veem; o Mestre vê palpites certos em verde e errados em vermelho e revela letras com um toque. A cifra aparece no Arquivo, na parede de uma sala (cartão da sala e ◈ no mapa) e no chat ("Mandar no chat").
- **Documentos tarjados:** texto com trechos entre `[[colchetes duplos]]`. A data do pé do documento é escrita no próprio criador (qualquer formato; vazio esconde a data). Os jogadores veem tarjas pretas do tamanho do trecho (o texto escondido não chega ao aparelho deles). O Mestre toca numa tarja para liberar; ela se abre na tela de todos.
- **Visões:** frase ou imagem que pisca na tela de uma cobaia só, com efeito (clarão, estática, sangue, sussurro) e som. O chat geral mostra apenas "Fulano teve uma visão". A visão fica guardada no Arquivo do jogador, naquele aparelho. O jogador apaga as próprias visões (e elas não voltam ao recarregar); o Mestre apaga as que mandou, e elas somem também do Arquivo do jogador. Cada cobaia guarda no servidor a última visão enviada, que chega a qualquer navegador novo dela: em Visões, "🧹 Visões guardadas no servidor" mostra e apaga de vez.
- **Terminal O.R.F.E.U.:** aba com tela de terminal de fósforo verde. Comandos `help`, `ls`, `open <diretório>`, `acesso <código>` e `clear` (os diretórios também são clicáveis). Mostra os documentos publicados que têm um **Diretório no Terminal** (campo no formulário do documento: arquivos, experimentos, cobaias ou qualquer outro). Como são documentos comuns, o Mestre edita tudo pelo Arquivo (ex.: o status das cobaias) e a mudança aparece na hora no terminal de todos.
- **Quem abriu o cofre:** quando alguém digita o código certo, o Mestre recebe um alerta e o acesso entra no Relatório.
- **Cofre (código de acesso):** documento com código fica como "▓▓▓" na estante e no terminal, sem título nem texto. O texto vai para `cofre/<hash do código>`, um endereço que só existe para quem sabe o código, então nem o console do navegador mostra o conteúdo antes. O jogador digita o código no Arquivo ou no terminal; documentos com o mesmo código abrem juntos e ficam liberados naquele aparelho. O código aparece na pasta Senhas.
- **Negrito:** `**assim**` no texto do documento.
- **Importar e exportar documentos:** botões no pé da aba Documentos do Mestre. O arquivo `terminal-orfeu.json` (entregue fora do repositório) traz todo o conteúdo do antigo site Terminal O.R.F.E.U.: Arquivos, Experimentos (com o Projeto Olhos no cofre) e o Registro de Cobaias. **Não envie esses arquivos ao GitHub.**
- No Firebase: `mapa/cifras`, `mapa/cifraRev` e `mapa/docs` (públicos, só o Mestre grava), `cifraPalpite` (palpites dos jogadores), `visoes/<cobaia>` (só o Mestre grava), `cofre/<hash>` (só o Mestre grava; lê quem sabe o código), `senhas/cofres` e `segredos/_sigilos`, `_cifras` e `_docs` (só o Mestre lê).

## Quadro da equipe (🖍 Quadro, atalho B)

Quadro compartilhado, ao vivo, para jogadores, auxiliares e Mestre: caneta, marca-texto, borracha, texto com 7 fontes (tamanho, negrito e itálico), notas adesivas, retângulo, elipse, seta, linha e imagens (escolher, colar com Ctrl+V ou arrastar). Cada pessoa escolhe a própria cor (a primeira é a cor da cobaia, quando ela aparece bem no fundo). Fundo branco ou preto por quadro; tinta quase preta vira clara no quadro preto e vice-versa, para nada sumir. Dá para criar vários quadros (abas), mover, redimensionar, duplicar, trazer para a frente e desfazer (Ctrl+Z). Qualquer um apaga o que fez; só o Mestre limpa ou apaga um quadro inteiro. No Firebase: `quadrosMeta` e `quadrosItens`.

## Salas dos andares 2 a 5

Nomes, elementos, subtítulos e elevadores desses andares não ficam no código. O Mestre importa o arquivo `salas-secretas.json` (botão "Importar salas" no painel) ou edita no cartão de cada sala. Os jogadores só recebem o nome de uma sala quando ela é revelada. Nunca envie esse arquivo ao GitHub.

## Duas maneiras de jogar: 2.5D e 3D

**Termos usados no site:** *ficha* é a informação do personagem (vida, sanidade, nível, rituais…). *Token* é a peça que representa o personagem no mapa 2.5D e a miniatura no 3D. A vista 3D mostra só os tokens, nunca as fichas.

A planta 2.5D continua sendo o tabuleiro oficial. A vista 3D (estilo Foundry/Owlbear) é a mesma partida vista de outro jeito: quem anda no 3D move o token de verdade, e todos veem a mudança nas duas vistas.

### Como abrir

- **Botão 3D** (roxo, na coluna de controles da câmera, no canto do mapa): entra direto no mundo 3D, sem clicar numa sala. Jogador e auxiliar entram onde está o próprio token (se estiver num corredor, na sala mais perto); o Mestre entra na sala selecionada ou na Zona Neutra do andar que está na tela.
- No cartão da sala: **🧊 Ver a sala em 3D** e **🏢 Andar inteiro (3D)**.
- **Jogador:** só abre a sala onde está o token da cobaia dele. Se o token muda de andar, a vista reabre no andar novo. Se o andar novo ainda está trancado neste aparelho, o 3D fecha e aparece a tela da senha; depois de digitar, é só tocar no 3D de novo.
- **Mestre e auxiliares:** abrem qualquer sala e qualquer andar.

### Arquivos

| Arquivo | Para que serve |
|---|---|
| `sala3d.js` | Motor: monta o andar, corredores, portas, luzes, câmera, HUD e liga tudo às regras do mapa |
| `objetos3d.js` | Biblioteca de objetos genéricos (macas, racks, caldeiras, tronos, membranas…), texturas e efeitos |
| `detalhes3d.js` | Objetos detalhados e texturas com desgaste (concreto manchado, metal enferrujado, forro com infiltração), feitos a partir das imagens de referência das salas: expositores, quadros elétricos, negatoscópio, lousa, cabines de gravação, monitores cardíacos, colunas de pressão, fitas VHS, placas "SALA CN" sobre as portas… |
| `tokens3d.js` | Miniaturas: as sete cobaias, as quatro cobaias NPC (Coelho, Cara Pálida, Risa, Onírico, que anda rastejando), os robôs S.T.A.F.F., a Presença (aparição translúcida) e as formas dos Filhos. Rostos pintados em textura, com sombra, íris, brilho e cílios |
| `filhos3d.js` | Formas detalhadas das criaturas (16: carne viva, boneco de pano de quatro, mulher encharcada, titã algemado, mulher de muitos braços, vulto de lodo, aranha de gaiola, homem de raízes, titereiro, fera de pelo, homem de texto, moldura, criatura de olhos, rastejante de braços, máscara sorridente, figura de orelhas). Baixa junto com o 3D. Só aparência: qual Filho usa qual forma é escolha do Mestre (mapa/formas) |
| `andares3d.js` | Objetos próprios dos cinco andares (máquinas, relíquias, crescimentos de carne, vigas, passarelas, rastros, barricadas…), no mesmo estilo do `detalhes3d.js`, usados pelas salas montadas à mão para 20 m |
| `interacoes3d.js` | Interações das salas no 3D (abrir, ligar, jogar, tocar, ler, vestir, telão com vídeo do YouTube), sons curtos gerados na hora e o traje vestido por cima da miniatura |
| `exposicao3d.js` | Ambientes das Salas de Exposição no 3D (chuva, maré, paredes que fecham, desabamento, labirinto, horda, fogo, gelo…) e a camada animada por cima da sala no mapa 2.5D. Só construtores genéricos: nomes e textos das salas de exposição ficam no arquivo fora do GitHub |
| `vozes.js` | Vozes das mensagens do chat no 3D, geradas na hora (sem arquivos de áudio) |
| `dados3d.js` | Dados 3D com física (d4, d6, d8, d10, d12, d20) na tela de quem rolou; a física vem do cannon.js (jsDelivr), baixado só na primeira rolagem |
| `salas-3d.json` | O que existe em cada uma das 125 salas. **Fica fora do GitHub.** O Mestre importa pelo cartão de qualquer sala |
| `modelos/` (opcional) | Modelos 3D em `.glb` que substituem as miniaturas desenhadas por código |

### Regras do mapa valem no 3D

- **Tamanho no 3D:** a sala tem **20 m de lado** e **4 m de pé-direito**; o corredor tem 14 m de comprimento e 2,4 m de largura. Cada sala foi montada à mão para esse tamanho (cenas com `"lado":20`), com peças próprias de cada andar: ponto focal ligado ao nome e à descrição da sala, zonas (entrada, área principal, fundos, paredes e teto com detalhe), pequenas cenas de terror, esconderijos plausíveis, luz com cantos escuros e nada flutuando. Os vãos das portas e o caminho entre elas ficam sempre livres (o gerador confere numa grade de 25 cm).
- **Distância:** as regras continuam sendo as da planta (sala de 50 m², corredor de 14 m). O movimento passa por `ACF.moverToken3D`, que aplica o limite de metros da perseguição, as paredes e as portas. Numa fuga, o token para quando acaba o deslocamento, igual ao mapa. Como a sala do 3D (20 m) é bem maior que a da regra (7,07 m), dentro dela cada passo do 3D rende uns 35% de metro de regra: atravessar a sala inteira no 3D custa os mesmos ~7 m de regra do 2.5D.
- **Corredores:** 2,4 m de largura, para duas pessoas andarem lado a lado. Paredes amareladas no estilo Backrooms; quanto mais fundo o andar, mais sangue, carne e lâmpadas mortas.
- **Portas:** cada corredor tem a porta no estado público da planta (fechada, abrindo, trancada, com teclado, escombros, carne ou aberta). Porta fechada barra o corredor. Ao lado do vão, dentro da sala, fica o painel com o botão vermelho. Tecla **E** (ou toque no botão) aperta o botão quando a regra deixa; com teclado, pede o código. Só o Mestre fecha portas.
- **Decibelímetro:** o mesmo medidor do 2.5D aparece no canto da tela 3D, com o nível do token que você controla.

### Controles do Mestre (botão 🎛 no topo da vista)

- **Luzes:** cada sala e cada corredor aceita normal, fraca, piscando, vermelha ou apagada (`mapa/luz`). Apagão zera tudo; protocolo deixa tudo vermelho e pulsando.
- **Portas:** o Mestre abre e fecha pelo próprio 3D: clique na porta ou no botão vermelho ao lado (ou tecla E perto dela). Trancas e escombros continuam sendo mudados no mapa 2.5D.
- **Versão da sala (5º andar):** neutra, Rei, Mãe ou Consagrado, conforme a cena.
- **Controlar token:** o Mestre escolhe qualquer token e anda com WASD (as regras continuam valendo) ou usa a câmera fantasma, que atravessa paredes.
- **Controle de um Filho:** veja abaixo.
- **Formas dos Filhos:** cada Filho escolhe uma forma (esguio, colosso, rastejante, retalhos, mecânico, sombra, luz, enxame, estática, olhos). O arquivo traz uma PROPOSTA; o Mestre troca quando quiser (`mapa/formas`).

### Controle dos Filhos (Mestre e auxiliares)

No cartão de qualquer Filho no mapa 2D aparece **🎮 Controle (3D)**. O 3D abre na sala do Filho, em primeira pessoa, controlando ele (as regras de movimento continuam valendo). No 3D também dá para assumir pelo 🎛 → **Controlar com WASD**.

- **Habilidades na tela:** um quadro no canto inferior esquerdo mostra a ficha ligada ao Filho (Fichas › Ameaças e Filhos, campo "Filho no mapa"): PV, Defesa, deslocamento e VD, os **ataques** e cada linha de **Habilidades** e **Ações** como um botão. Teclas **1 a 9** usam na ordem (dá para trocar nas Opções).
- **Ataque:** rola o teste e o dano da ficha em segredo (Sussurro do Mestre; no auxiliar, canal dos Filhos), com os dados 3D na sua tela. Quem vê o Filho enxerga o golpe.
- **Habilidade ou ação:** mostra o efeito em volta do Filho, com o nome, para todos que veem o Filho (nas duas vistas).
- **📋 Ficha** abre a ficha completa; **Soltar o Controle** volta à câmera livre.
- Sem ficha ligada, o quadro explica como ligar.

### Visão da criatura (`visao3d.js`)

Quem controla um Filho no 3D (Mestre ou auxiliar) passa a ver **como a criatura vê**: a câmera vai para os olhos dela e a tela ganha o filtro daquela criatura. O auxiliar caça sabendo só o que o Filho saberia. **Jogadores nunca veem isso.**

- **Entrar e sair:** ao assumir o Controle de um Filho, a visão liga sozinha (opção, ligada por padrão). O botão **👁** no topo do 3D (no celular estreito, flutuando na borda direita, abaixo do 📷) e a tecla **V** entram e saem. Trocar a câmera para Fora ou Cima, ou soltar o Controle, volta à visão normal.
- **Altura dos olhos:** vem da altura do modelo 3D da forma (a gaiola perto do teto, a fera de juba rente ao chão, o titã lá em cima), limitada pelo teto da sala ou do corredor.
- **Selo no topo:** o nome da visão e os sentidos do Filho ("👂 audição · 🩸 faro"). O Mestre tem **Ver tudo**: mostra todos, sem a regra dos sentidos (só o filtro da forma continua). **✕** sai.

**1. Um filtro por forma 3D (só a aparência).** Cada uma das 30 formas detalhadas tem o seu; as formas genéricas (esguio, colosso, sombra…) usam o padrão, "Olhar de predador".

| Forma | Visão |
|---|---|
| afogada | Debaixo d'água turva: tudo verde-azulado, o longe some na água, cáusticas, gotas que escorrem na lente e cabelo molhado pendurado na frente |
| anfibio_cria | Olho de peixe rente ao chão: lente redonda e abaulada, verde turvo, uma membrana que passa devagar |
| anfibio_ovos | Esferas rosadas: a vista partida em esferas de geleia rosada, cada uma com uma pupila escura que gira |
| aranha_gaiola | Pelas grades da gaiola: barras de ferro enferrujado em cúpula, luz quente de lanterna, panos rasgados no alto |
| aureola_mascara | Auréola e máscara de caveira: raios dourados, a auréola em volta do centro, a vista pelos dois buracos dos olhos |
| boca_no_tronco | Pela boca do tronco: a vista é a fenda vertical da boca, com os dentes nas bordas, abrindo e fechando com a respiração |
| bracos_rastejante | Sob a mortalha, entre os braços: rente ao chão, capuz de pano rasgado, braços cinzentos com anéis de ouro puxando o corpo |
| cabeca_cao | Nariz de cão: cores de cão (vermelho e verde viram amarelo e oliva), um pouco borrado, o focinho fora de foco e fiapos de cheiro no ar |
| cabeca_tv | Tubo de televisão: tela curva, linhas de varredura, máscara de fósforo, imagem fantasma |
| cabelos_longos | Cortina de cabelo: fios pretos balançando por toda a tela, túnel escuro, verde pálido |
| eletrico_agachado | Só arestas elétricas: o mundo vira contorno violeta aceso sobre o escuro, com um raio fino de vez em quando |
| enraizado | Sob o chapéu de palha: aba de palha trançada no alto, folhas e galhos nos lados, raízes embaixo |
| esfolado | Carne viva: tudo em vermelho, veias nas bordas e o pulso do coração |
| estatica_tres_cabecas | Três telas de chiado: três vistas lado a lado (esquerda, frente, direita), fora de sincronia, com chiado de VHS |
| fera_juba_lodo | Por baixo da juba de lodo: rente ao chão, mechas grossas de lodo pingando do alto, barro rachado nos cantos |
| fera_pelo | Um olho vermelho: só um olho (o lado esquerdo quase cego), tudo avermelhado, pelo empapado de sangue nas bordas, o tranco de quem fareja |
| filme_queimado | Fotogramas queimando: sépia, grão, riscos, dupla exposição, furos da película nas bordas e os cantos queimando devagar |
| fitas_magenta | Fitas de tinta: a imagem escorre como tinta na água, em magenta e violeta |
| lodo | Película oleosa: escuro, brilho de óleo nas bordas, gotas pretas escorrendo pelos lados; o centro fica limpo |
| marionetista | Fios vermelhos no palco: preto e branco, só o vermelho fica, fios vermelhos balançando, luz de palco |
| mascara_sorriso | Pelas frestas da máscara: duas frestas largas em forma de olhos sorrindo, o cachecol vermelho embaixo |
| moldura | Pintura a óleo rachada: pinceladas, craquelado, verniz amarelado e a moldura dourada |
| muitos_bracos | Entre lágrimas e braços: lágrimas que escorrem, bordas borradas, mãos pálidas abraçando pelas bordas, tom de foto antiga |
| olhos_muitos | Mosaico de olhos: dezenas de olhos amendoados, piscando fora de ritmo |
| orelhas | Quase cego: vê pelos ecos. Quase tudo preto; quando há som, a onda acende a sala por onde passa |
| protese | Radiografia: tudo invertido em azul de negatoscópio, cabos pendurados no alto e a linha do monitor cardíaco |
| retalhos_quadrupede | Retalhos costurados: a vista em retalhos de cores diferentes, com costuras e pontos em cruz |
| sobretudo_vazio | Pelos buracos do vazio: escuro violeta, a sala só aparece pelos buracos, com a borda acesa |
| texto_vivo | Tinta e letras: papel claro, as arestas e o que é claro viram letras; as cobaias, manchas de tinta |
| tita_algemado | Fúria acorrentada: vermelho escuro, rachaduras acesas nas bordas, correntes penduradas e o tranco dos passos pesados |

**2. Os sentidos por cima (dos dados, nunca do código).** O que aparece vem das características do Filho em `privado/filhos` (a mesma conta da vista do auxiliar: `ACF_FILHOS.comoPercebe` e `sentidosDe`, sem gravar nada):

- **Quem a criatura não percebe some** (as mesmas regras de sempre: visão padrão nas salas reveladas, visão curta, escondido que passou no teste…). **Quem ela percebe por outro sentido** (vibração, tela, câmera, raízes, solidão, ninho, maior NEX, leitura, rastro próprio, teste falhado) aparece como **silhueta acesa através das paredes**, na cor do sentido (vibração laranja, tela e câmera ciano, raízes verde, NEX violeta…).
- **Sem visão** (sem visão ou vibração no chão): o mundo fica quase preto, só o contorno do que está perto; o resto vem dos outros sentidos.
- **Visão curta:** o que está longe some no escuro.
- **Audição:** o barulho de cada sala (a mesma escala do decibelímetro, com o alcance do Filho) vira uma **onda de luz que corre pelas paredes**, saindo da sala exata (audição precisa) ou de um ponto borrado perto dela (mancha), e acende a geometria por onde passa nos Filhos que quase não veem. O centro da tela fica mais limpo.
- **Vibração no chão:** um anel laranja no chão aos pés de quem se mexeu; quem fica parado some.
- **Faro de sangue:** uma mancha vermelha, através das paredes, na sala de cada cobaia machucada. **Faro curto:** um brilho vermelho em quem está machucado e à vista.
- **Faro de trilha:** pegadas acesas no chão, na cor de cada cobaia, pelas salas por onde ela passou (as mais velhas mais apagadas), escondidas atrás das paredes.
- **Leitura:** um brilho amarelo onde a cobaia abriu um documento.

**Opções** (⚙ › Gráficos › Visão da criatura, só Mestre e auxiliares): **Entrar na visão ao controlar um Filho** (ligada), **Intensidade do filtro** (20% a 100%) e **Reduzir efeitos que se mexem** (Como o sistema, Sim ou Não: quase para as animações; as ondas de som continuam, porque são informação).

**Desempenho:** a cena é desenhada uma vez numa textura com profundidade e um único passe faz o filtro e os sentidos (sem o bloom normal). As silhuetas e marcas pedem um passe pequeno, em meia resolução, só quando existem. No celular a textura sai a 70%, e cai mais quando a qualidade automática desce do 3º degrau. Nada pisca forte: tudo pulsa devagar.

**Firebase:** nenhum caminho novo. **Limites:** a visão é só na tela de quem controla (os jogadores não sabem que ela existe). Sem textura de profundidade (WebGL 1 sem a extensão), não há ondas nas paredes nem a vista escura dos Filhos sem visão. A trilha mostra as salas da trilha gravada (o caminho dentro da sala é desenhado, não o real). Pegadas e ondas são do aparelho de quem controla (a tela do Mestre precisa estar aberta para gravar a trilha, como sempre).

### Características dos Filhos (`filhos.js`)

O código é **genérico**: ele conhece os tipos (o sentido "faro", a trava "só no escuro", o botão "Teia"…), nunca qual Filho tem o quê. Isso fica nos dados secretos, que o Mestre importa de um arquivo **fora do GitHub** (`filhos-regras.json`, tipo `planta-acf-filhos`).

**Onde fica cada coisa (Firebase)**

| Caminho | O quê | Quem lê / grava |
|---|---|---|
| `privado/filhos/<ser>` | características de cada Filho | Mestre e auxiliares leem; Mestre grava |
| `privado/etiquetas` | etiquetas das salas (`salas/cNN`) e dos corredores (`corr/aNkCI`): água, barulhenta, estreito, quadros, ninho, metal, câmera, tela, escura | Mestre e auxiliares leem; Mestre grava |
| `privado/filhosEstado` | estado em jogo: usos por cena, teias, raízes, cópias liberadas, estudo, repertório, Regente, movimento dobrado, Conectar (`con`), curto-circuito (`curto`), sinal caído (`sinalCaido`), Transmissão (`trans`), trilha das cobaias (`trilha`), rastro próprio (`mechas`), imagens falsas (`interf`) e quem já atacou (`atacou`) | Mestre e auxiliares |
| `segredos/_filhos/<ser>/enigma` | a fraqueza | só o Mestre |
| `mapa/fil` | o que os jogadores precisam ver, sem dizer de quem é: rastros e salas marcadas (`m`, inclusive Trilhas de Ausência), avisos (`av`), objetos da Forma de Objeto (`ob`), Silêncio Absoluto (`sil`), pedidos de teste (`pd`), dia par (`dp`), números públicos (`cfg`) e salas de distância falsa na perseguição (`df`) | todos leem; Mestre e auxiliares gravam |
| `filMsg/<cobaia>` | mensagens privadas (Chamado, Lembrança) | quem está logado lê; Mestre e auxiliares gravam |
| `filAcoes` | Examinar a sala, Olhar ao redor e Flash dos jogadores | jogador só cria; Mestre e auxiliares leem |
| `filResp/<pedido>/<cobaia>` | respostas aos testes pedidos | quem está logado |
| `leituras` | quem abriu documentos do Arquivo, onde e quando (sentido "leitura") | jogador só cria; Mestre e auxiliares leem |

Nos tokens dos Filhos, só Mestre e auxiliares mudam os campos `fo` (forma de objeto), `cp`/`cpd` (cópia e Detalhe), `oc` (ocultação especial), `pi` (pisca), `rv` (revelado nesta sala), `pp` (pedido de publicar), `ln` (só por uma lente), `fl` (Flash), `am` (amigável), `dc` (imagem falsa da interferência), `el`/`fm`/`fz` (forma rolada: elemento, forma 3D e face do dado), `st` (estado do modelo 3D) e `rvt` (hora da revelação, para o 3D). No token da cobaia, `lt` marca quem está olhando por uma lente. As regras do Firebase barram o jogador nesses campos e em todos os tokens de Filhos e robôs.

**Mestre (aba Segredos, painel "Filhos"):** uma lista compacta dos Filhos (código, codinome, cor e elemento) com o resumo em chips ("👂 audição · 🩸 faro · 🐢 lento · 🔘 1 botão"), filtro por elemento ou "📍 no mapa", e dois ícones no topo: **🏷** abre o editor de etiquetas e **⋯** guarda Importar e Exportar. Tocar num Filho abre o **editor** dele (painel lateral no computador, tela cheia no celular), com seis abas: **Sentidos**, **Movimento**, **Rastro** (rastro, avisos e ocultação), **Botões** (botões e passivos), **Covil** (covil, enigma e notas) e **Avançado** (elemento, forma rolada e estados do modelo 3D). Cada opção é um chip que liga e desliga; as de escolha única ficam douradas. A descrição de cada uma aparece segurando o chip ou no **?** do topo da aba (que mostra todas). Os campos só aparecem quando valem (a DT de Buscar só com o botão Buscar ligado, o alcance só com audição, a DT de Examinar só com "no teto"…). As setas ‹ › passam para o Filho anterior ou o próximo; o ⚙ do cartão de um Filho no mapa abre o editor dele. Onde a especificação diz PROPOSTA, é uma opção que você liga e desliga (ex.: "evita barulho").

**Etiquetas (🏷):** escolha o andar e a etiqueta (💧 água, 🔊 barulhenta, ↔ estreito, 🖼 quadros, 🥚 ninho, ⛓ metal, 📷 câmera, 📺 tela, 🌑 escura) e toque nas salas da grade, que segue o desenho do andar; cada sala mostra os ícones das etiquetas que já tem. **✨ Sugerir** procura nas cenas 3D importadas os monitores, TVs, telões e terminais (e as interações de vídeo) para "tela", as câmeras e as salas mostradas pelas câmeras de segurança para "câmera", e as salas com a luz apagada, sem sinal ou com a cena muito escura para "escura"; as sugestões ficam com borda tracejada até você tocar em **Aceitar todas** ou **Descartar**. Os corredores continuam no cartão de cada corredor (e as salas também no cartão da sala).

**Auxiliar:** no cartão de cada Filho aparecem as características e os botões dele (também no quadro do Controle no 3D, embaixo dos ataques). Em "Sons na Caixa", **Ver pelos sentidos de** troca a vista do robô (vê tudo) pela do Filho escolhido; no Controle 3D a vista já é a do Filho controlado.

- **Vista padrão de um Filho:** as cobaias na sala dele e nas salas reveladas, mais o som (manchas e setas, até 36 m). Os sentidos trocam ou somam: *sem visão* (nenhuma cobaia por vista), *visão curta* (mesma sala ou vizinha), *audição precisa* (baixo: mancha e o botão "Pedir teste" de Percepção contra Furtividade; médio: a sala exata em alcance médio, 18 m; alto ou mais: a sala exata em qualquer ponto do andar e movimento dobrado na próxima vez), *audição com alcance dobrado em sala com água*, *faro* (mancha vermelha onde há cobaia machucada), *faro curto* (brilho nas machucadas à vista), *solidão*, *vibração* (quem pisou na teia), *raízes*, *leitura* (marca de onde a cobaia abriu um documento, nos últimos 10 min), *descanso* (durante o interlúdio) e *ninho* (covil e salas vizinhas). Quem aparece por um sentido ganha um aro vermelho.
- **Limites:** "1 por cena" conta pelo **Nova cena** do Mestre; "a cada 3 rodadas" conta pelas rodadas da perseguição. Cada uso vai para o canal Filhos do chat.

**Movimento** (vale para o auxiliar sempre e para o Mestre na perseguição sem movimento livre): lento (metade do limite), imóvel, só no escuro (Apagão, luz apagada ou sala sem sinal), dobrado no Apagão, grande demais (não entra em corredor ou sala com a etiqueta "estreito"), arromba portas (passa pela porta fechada com estrondo), Pelos dutos (passa uma porta no próximo movimento), sala barulhenta proibida (PROPOSTA), sala alagada (metade do movimento para todos até o fim da cena), Regente (um Filho a mais fora da vez por rodada) e "parado no próximo turno" de quem foi visto com Olhar ao redor. Na perseguição, o limite do Filho já vem do deslocamento da ficha ligada a ele.

**Jogadores:** rastros no mapa e no cartão da sala (chão molhado, lodo preto, raízes no chão, alagada, Trilhas de Ausência) por alguns minutos (ou até o fim da cena); avisos ("o chão treme" com um rumo vago, "algo se arrasta acima do forro", "você se sente observado", estrondo de porta); testes pedidos numa janela (Vontade, Reflexos, Furtividade) com a ficha ativa; mensagens privadas (uma voz chamando, uma lembrança); no painel da cobaia, os botões de ícone **🔍 Examinar**, **👀 Olhar** e, com câmera, celular ou visor na ficha ativa, **📷 Lente** e **⚡ Flash** (no cartão da sala, Examinar e Olhar também); **🤨 Desconfiar** nas mensagens do chat e no cartão de uma cobaia (Intuição contra a rolagem do Filho); aviso discreto do dia par; chat bloqueado (e as vozes do 3D caladas) durante o Silêncio Absoluto.

**Ocultação especial:** no teto (some até alguém passar em Examinar), na parede (some em sala com quadros até atacar), sempre oculto (até atacar ou alguém passar em Olhar ao redor) e meio apagado (o token pisca). O ataque pelo Controle revela na sala onde ele está. O token oculto mora no `privado` (o jogador não recebe). **Só por uma lente:** depois de revelado, o token continua sumido para os jogadores, mesmo em sala revelada; só aparece para quem tocou em **📷 Lente** (o botão aparece com câmera, celular ou visor na ficha ativa) e, por 1 rodada, para todos depois de um **⚡ Flash** na sala dele (botão do jogador com câmera ou celular, 1 por cena). Mestre e auxiliares (robôs S.T.A.F.F.) sempre veem; no 2D ele aparece sépia com "📷 lente".

**Tipos novos (rodada dos Filhos de Energia, do Zero e dos quatro novos):**
- **Sentidos:** visão total (mesma sala e vizinhas, sem importar o barulho), faro de trilha (as salas por onde cada cobaia passou nos últimos minutos, com o nome na mais nova; a tela do Mestre grava a trilha), vibração no chão (quem se mexeu nos últimos 30 s, ou nesta vez da perseguição, em alcance médio, através das paredes; quem fica parado some, e ela substitui a visão), rastro próprio (marca só para Mestre e auxiliares em cada sala por onde ele passa; vê quem está numa delas), leitura na cena (quem abriu documento do Arquivo ou leu algo no 3D desde o "Nova cena"), maior NEX (a cobaia com mais NEX do andar, pela Calculadora do Mestre), telas e câmeras (quem está em sala "tela", ou em sala "câmera" ou com um robô). Na vista do auxiliar, as salas que ele vê por tela, câmera ou sinal ganham contorno.
- **Movimento:** atravessa paredes (anda em linha reta por toda a planta do andar e ignora portas trancadas), não entra em metal, rápido na água (18 m em sala "água" e passa direto entre salas com água vizinhas), dobro na perseguição (PROPOSTA) e derruba o sinal (PROPOSTA: as salas por onde passa ficam 30 s sem sinal).
- **Rastro:** Trilhas de Ausência (só a sala que ele deixou, até o fim da cena).
- **Botões:** Conectar (1/cena: por 1 rodada, a vista dele mostra quem está nas salas do andar com sinal), Trancar (fecha uma porta aberta do andar, que os jogadores abrem de novo pelo botão da porta, ou abre uma fechada; as abertas e as mais perto vêm primeiro), Pela fiação (some numa sala do elemento escolhido, padrão Energia, e reaparece noutra do mesmo elemento no andar), Curto-circuito (a tela do Mestre apaga a luz da sala e tira o sinal até o "Nova cena", e depois devolve como estava; o "só no escuro" anda ali), Atravessar (1/cena: salta para qualquer sala do andar), Transmissão (aparece numa sala "tela"; quem está lá recebe "a televisão liga sozinha"), Avisar o bote (quem está na sala escolhida recebe "o chão treme"), Buscar (o jogador faz Vontade na tela; se falhar, a tela do Mestre pede o texto do que ele esqueceu e manda em mensagem privada, "VOCÊ ESQUECEU") e Postura (1d4+2 crias ocultas na mesma sala; a cria é o ser genérico "F-C Cria", de token pequeno).
- **Passivos:** Interferência (revelado, a tela do Mestre põe duas imagens falsas em salas vizinhas; somem quando uma cobaia entra na sala delas, quando alguém passa em Olhar ao redor ou Examinar na região com a DT do campo, ou pelo cartão, "📡 Tirar as imagens falsas"; escondido de novo, saem), Amigável (revelado, os jogadores veem "amigável" no token, no 2D e no 3D, até ele atacar pelo Controle), Distância falsa (na perseguição, as cobaias na sala dele e nas vizinhas andam metade do limite; a tela do Mestre publica as salas em `mapa/fil/df`, sem dizer de quem) e Único no mapa (o repetido sai).
- **Elemento e rota de fuga:** cada Filho tem um elemento (aba Avançado). O cartão mostra a rota de fuga do cânone (Sangue foge para Morte, Morte para Energia, Energia para Conhecimento, Conhecimento para Sangue).
- **Forma rolada (Avançado):** com "🎲 Rolar a forma" ligado, quando o token entra no mapa a tela do Mestre rola o dado (1d4), grava no token o elemento e a forma 3D daquela face e avisa você; o auxiliar não escolhe. Cada face tem o seu "comportamento desta forma" (sentidos e movimento que valem só com ela, para as PROPOSTAS). O token nasce oculto e mora no `privado`: nada chega aos jogadores antes de você revelar. No 2D, o token ganha o anel e o ícone do elemento.
- **Estados do modelo 3D (Avançado):** o nome do estado da forma em cada momento (normal, andando, com cobaia na sala, conectado, transmitindo, durante o Flash). A tela do Mestre grava o estado no token e o 3D de todos chama `estado(nome)` na forma.

**A cópia e a Forma de Objeto:** Forma de Objeto tira o token dos jogadores e põe um objeto da biblioteca do 3D (cadeira, caixote, maca, armário…) na sala. Uma cena inteira assim, na mesma sala que uma cobaia, libera **Estudar**; depois **Copiar** faz o token aparecer aos jogadores como aquela cobaia (foto, nome, cor e miniatura 3D), com o Detalhe que o Mestre escolheu (retrato espelhado, número FHP trocado ou o anel de outro tom). **Mimetismo Vocal** manda no chat Geral, como a cobaia copiada (ou agarrada num Abraço marcado pelo Mestre), só frases que ela escreveu no Geral nas últimas 24 horas, escolhidas numa lista, sem texto livre; o auxiliar nunca vê Sussurros. Mestre e auxiliares veem "🗣 voz imitada". No 3D, as duas viram o **modo Disfarce**, com o detalhe errado e o "🔍 Reparar" dos jogadores (ver "Disfarce no 3D").

**A tela do Mestre faz o trabalho automático** (rastros, avisos, ocultação, teias, estudo, Examinar e Olhar, dia par, "Enredada" de quem falhou na teia). Como no robô dos auxiliares, ela precisa estar aberta.

**Limites:** o que aparece aos jogadores é público, então quem abrir as ferramentas do navegador consegue ver: o token de um Filho "só por uma lente" já revelado (o sumiço é feito na tela, como a Presença), o campo `dc` que marca as imagens falsas da interferência, a forma rolada de um Filho já revelado, as salas de distância falsa, os rastros e avisos (sem o nome do Filho), o objeto da Forma de Objeto, os campos `cp`/`cpd` de um Filho revelado que está copiando (e por isso a cópia), o campo `tk` de uma mensagem imitada, o Silêncio Absoluto e os pedidos de teste. As rolagens dos jogadores são feitas no próprio aparelho, como todas as outras do site, e o bloqueio do chat do Silêncio Absoluto é feito na tela (um jogador que mexa no código consegue escrever). As características, as etiquetas, o estado em jogo e o enigma nunca chegam aos jogadores.

### Encontros, informação escondida e acabamento (`momento.js`)

Ninguém escreve roteiro de susto: o site só propõe, e o Mestre decide.

**1. Encontro: a passagem da exploração para a perseguição**

- **Gatilho:** a tela do Mestre percebe quando um Filho à vista dos jogadores (sem ocultação geral, ocultação especial, Forma de Objeto ou cópia) fica na mesma sala que uma cobaia, ou quando o decibelímetro de uma sala passa do limite (Limite rompido). Aparece no topo da tela dele (também por cima do 3D) a proposta, por exemplo "Encontro: F-02 Remendo viu Sabonete em CN 13", com quem participa (cobaias escondidas vêm desmarcadas; no barulho, entram as cobaias da sala e o Filho mais perto do andar) e **Confirmar / Cancelar**. A mesma situação não é proposta de novo por 90 segundos. Com a perseguição já correndo, nada é proposto. No Apagão, ninguém vê ninguém.
- **Cancelar (falso alarme):** nada acontece para os jogadores; o Diário anota.
- **Confirmar:** a iniciativa é rolada na hora: cobaia com a ficha dela (a ativa, pelo nome que ela publica no token; o Mestre só lê), Filho com a "Iniciativa NdM+B" das perícias da ficha ligada a ele (ou 1d20 + o bônus dos Filhos do bloco "Perseguição (Sobrevivendo ao Horror)"), sem ficha, 1d20. Quem vê a cena (o Mestre, os auxiliares e as cobaias da sala ou da lista) congela 2 s. No 3D, a câmera vira devagar para a criatura (para quem a enxerga), faz um zoom lento, as bordas escurecem e toca um som grave; no 2D, clarão e vinheta. Depois abre a faixa **PERSEGUIÇÃO** de sempre (`mapa/persg`), com a ordem pela iniciativa. O Diário guarda a iniciativa de cada um e de onde ela veio.
- **Câmera de turno (3D):** um anel dourado no chão mostra até onde o token da vez ainda chega, em metros de regra (o mesmo limite que o site aplica, descontando o que ele já andou; a área segue as paredes e passa pelas portas). Quem não está na vez vê a tela levemente sem cor e o relógio da vez ("⏱ Vez de… 0:12", ou a contagem regressiva se o Mestre ligou o cronômetro). A opção **Perseguição: no começo de cada vez, a câmera mostra quem está na vez** (⚙ Opções › Câmera e mouse, ligada por padrão) vira a câmera de quem espera para o token da vez, sem tirar o controle de ninguém.
- **Cartas de ação (vez do jogador, 2D e 3D):** Correr, Esconder, Despistar, Atacar e Usar item, cada uma com a perícia e a DT. Elas só mostram o que o site já faz: **Correr** é o teste da rodada na perseguição do Sobrevivendo ao Horror (Atletismo e a DT da rodada) ou, sem ela, o deslocamento que resta; **Esconder** é Furtividade DT 15 (o esconderijo do 3D com E, ou a ação "Esconder-se" da cena de furtividade); **Despistar** só existe na perseguição do SaH, para a presa com 1 sucesso ou mais; **Atacar** mostra a arma, a perícia e o bônus e abre a ficha na aba Em jogo (a DT é a Defesa do alvo, que só o Mestre sabe); **Usar item** abre a mochila com os itens que têm uso. O ▾ esconde as cartas.
- **Fim da perseguição:** a cor volta devagar, o ambiente do 3D sobe aos poucos, a batida baixa de coração (de quem participava) some e toca um acorde de alívio. No 2D, as bordas escuras de quem esperava somem devagar.
- **A miniatura e o estado:** ferido manca, morrendo se arrasta, enlouquecendo treme (`tokens3d.js`); vale também durante a perseguição, porque vem das vitais do token.

**2. Informação escondida**

- **Sons dos Filhos:** a tela do Mestre publica em `ecos3d` o tipo do som (passos, arrasto ou respiração) e uma posição aproximada (cerca de 1 m de erro), **sem dizer de quem**. Passos quando um Filho anda; arrasto se ele é lento ou tem forma rastejante; respiração de tempos em tempos quando ele está parado perto de uma cobaia. **Passos silenciosos** (características dos Filhos) calam passos e arrasto; a respiração continua, só de bem perto (4 m). Forma de Objeto não faz som. Cada jogador ouve com áudio posicional (PannerNode) o que acontece no andar dele, até 18 m (respiração, 7 m): no 3D, de onde vem em relação à câmera; no mapa, em relação ao token, olhando para o norte. Os eventos somem em 12 s. O Mestre desliga no bloco **Encontros, sons e câmeras**.
- **Lanterna com bateria:** o botão 🔦 Luz do jogador só acende com um item cujo nome começa com "Lanterna" (Lanterna Tática, Lanterna UV…) na ficha ativa; sem ele, o botão avisa. A bateria (%) fica no próprio item (`itens.<id>.bat`), aparece no botão Luz e na mochila, e gasta enquanto a luz está acesa (padrão: 30 minutos de luz, o Mestre muda). Abaixo de 10% a luz treme; em 0 ela apaga. **Recarregar:** no cartão da cobaia (ou no 🎛 do 3D, **🔋 Pilhas**), o Mestre toca em **🔋 Recarregar a lanterna** (`mapa/pilhas/<cobaia>`); o aparelho do jogador põe a bateria em 100% uma vez só. Mestre e auxiliares continuam com a lanterna livre.
- **Mapa que mente:** com a SAN abaixo de 25% do máximo (o Mestre muda), o mapa 2.5D daquele jogador às vezes (a cada meio minuto a um minuto e pouco) mostra uma porta e um pedaço de corredor que não existem, ou faz uma sala vizinha sumir, por alguns segundos. Só na tela dele; nada é gravado.
- **O que só um jogador vê:** no cartão da cobaia, **👁 Susto só para…** (no 3D, também no painel 🎛 com o token escolhido) → **Rosto na janela**, **Figura no fim do corredor** ou **Nome sussurrado no chat**. Vai por `sustos/<cobaia>`, que só aquele aparelho escuta. No 3D o rosto aparece à frente da câmera (perto da parede) e some; a figura fica no fim do que ela está olhando e some quando ela chega perto. Fora do 3D, o rosto aparece num quadro na borda da tela e a figura no fim de um corredor da sala dela, no mapa. O nome entra no chat Geral só no aparelho dela, sem autor, com um sussurro. Para o teste de Sanidade, use o Medo em jogo.
- **Câmeras de segurança:** monitores na parede (num ponto livre) das salas marcadas: por padrão a CN 02 e a CN 75. Quem está na sala do monitor, no 3D, vê as outras salas ao vivo (render-to-texture em baixa resolução, poucas vezes por segundo), trocando de sala e de canto a cada 6 s. Por padrão mostram as salas vizinhas; o Mestre escolhe as salas no bloco **Encontros, sons e câmeras** e pode pôr numa delas **um Filho que não está lá** (aparece só na imagem da câmera). Jogadores e auxiliares só veem salas reveladas; as outras dão "SEM SINAL". Em `mapa/cameras`.

**3. Acabamento**

- Fumaça e névoa baixa que se movem (três camadas no computador, uma no celular), poeira dentro da luz da lanterna e uma sombra redonda embaixo de cada token. Opções › Gráficos: **Fumaça e névoa baixa que se movem**, **Poeira no ar** (vale também para a poeira da lanterna) e **Câmeras de segurança nos monitores** (Automático, Ligadas com imagem melhor, Ligadas leves ou Desligadas; no celular o automático usa a imagem leve).
- **Morte com peso:** quando o contador de Morrendo de uma cobaia chega a 3 (o óbito que a Mesa já registra), a tela do Mestre grava o corpo em `mapa/corpos/<cobaia>`, no ponto onde ela estava. No 3D, a miniatura caída com uma poça escura, no lugar do token; **E · Examinar o corpo** mostra nome, dia e hora do óbito e o que dá para ver de relance (armas, o que estava vestido, itens grandes e a lanterna; nada amaldiçoado, nada de segredo). No mapa 2D, uma ✝ na sala abre o mesmo exame. Quem vê: Mestre, auxiliares (salas reveladas) e as cobaias na mesma sala. Se o contador voltar a menos de 3, o corpo sai; o Mestre também tira pelo cartão da cobaia (**✝ Tirar o corpo do mapa**).

**Mestre (aba Sessão, bloco "Encontros, sons e câmeras"):** propor encontros (liga/desliga), sons dos Filhos (liga/desliga), SAN para o mapa mentir (%), bateria da lanterna (minutos acesa), salas com monitor e, para cada uma, as salas que ela mostra e o Filho falso (`mapa/cfg/momento` e `mapa/cameras`).

**No Firebase (novos):** `mapa/encontro`, `mapa/cameras`, `mapa/corpos`, `mapa/pilhas` e `mapa/cfg/momento` (todos leem, só o Mestre grava, com validação); `ecos3d` (todos logados leem, só o Mestre grava); `sustos/<cobaia>` (só o Mestre grava). **Atualize as regras** com `regras-firebase.json`.

**Limites:** como o resto do mapa público, quem abrir as ferramentas do navegador pode ler `ecos3d` (posições aproximadas, sem nome), os sustos de qualquer cobaia (`sustos/<cobaia>`, como as Visões), a configuração das câmeras (inclusive o Filho falso) e os corpos. O congelamento de 2 s é feito na tela. A tela do Mestre precisa estar aberta para propor encontros, publicar os sons e gravar os corpos. O áudio só toca depois de um toque na página. A lanterna é a do 3D; no mapa 2D não há luz.

### Sons das criaturas (`sons-filhos.js`)

Cada forma 3D de Filho tem sons próprios, em arquivos dentro do site: quando uma criatura está perto, dá para ouvir ela respirar, andar, rosnar, atacar e aparecer, de onde ela está.

**Os arquivos.** Todos ficam na pasta `sons/filhos/`, com o nome da forma na frente (como `afogada` ou `lodo`; nunca o codinome) e sempre os mesmos 7 finais. Exemplo: `lodo-respira.mp3`, `lodo-move.mp3`, `lodo-voz1.mp3`…

| Arquivo | Quando toca |
|---|---|
| `<forma>-respira.mp3` | Em repetição, enquanto a criatura está parada |
| `<forma>-move.mp3` | Em repetição, enquanto ela anda (a respiração continua baixinha por baixo) |
| `<forma>-voz1.mp3`, `-voz2`, `-voz3` | Um deles ao acaso, raramente: a cada 20 a 60 s, com mais chance quanto mais perto |
| `<forma>-ataque.mp3` | Quando ela ataca (o mesmo momento em que o 3D anima o ataque) |
| `<forma>-revela.mp3` | Quando o Mestre a revela aos jogadores (o mesmo momento da animação de revelação) |

MP3 mono, 24 kHz, 48 kbps, volume igualado entre as criaturas (loudness parecida) e loops sem estalo na emenda. São 30 formas, cerca de 100 a 160 KB cada, uns 3,5 MB no total; cada aparelho só baixa os sons das formas que estão no andar. `sons/filhos/indice.json` lista as formas que têm sons, o tamanho exato de cada loop, quais formas são quase mudas e as palavras das legendas. As duas formas silenciosas pela ficha (`orelhas` e `olhos_muitos`) quase não fazem som: respiração quase inaudível e nenhuma voz ao acaso; só o ataque e a revelação. Formas sem arquivos (as genéricas, como `esguio`) usam os sons sintetizados de sempre do `momento.js`.

**Como trocar um som:** substitua o arquivo de mesmo nome (por exemplo, `sons/filhos/lodo-voz2.mp3`) e publique. MP3 mono de 22 a 32 kHz e 48 a 64 kbps fica leve; um arquivo de loop pode ter qualquer duração (o site faz a repetição do arquivo inteiro). Se a fonte for de outra pessoa, registre autor, endereço e licença em `sons/CREDITOS.md`. Para dar sons a uma forma nova, crie os 7 arquivos com o nome da forma na frente e acrescente a forma em `indice.json` (copie a linha de outra forma, troque as legendas e apague o campo `n`, que guarda o tamanho dos loops gerados aqui). Para o navegador baixar de novo depois de trocar arquivos, mude o `VER` no topo de `sons-filhos.js`.

**Quem ouve o quê.**
- **Mestre e auxiliares:** os Filhos do andar aberto, nas posições reais. No 3D, quem escuta é a câmera (na vista de cima, o ponto do chão para onde ela olha); no mapa 2D, o token selecionado (sem token selecionado, silêncio).
- **Jogadores:** só os ecos que a tela do Mestre já publica em `ecos3d` (posição aproximada, cerca de 1 m de erro, sem dizer quem). O eco agora leva também a forma (`f`, só a aparência) e um apelido sorteado na sessão (`q`), para o jogador ouvir os sons gravados certos. Tudo o que já valia continua: **passos silenciosos** calam os passos, Forma de Objeto não faz som, a cópia de uma cobaia não manda a forma (soa como antes) e a chave "Sons dos Filhos" do Mestre desliga tudo. Ataque e revelação: com o Filho à vista, de onde ele está; sem enxergar, só de um rumo aproximado.
- Alcance de 18 m, com volume caindo com a distância e áudio posicional (HRTF no computador; no celular, esquerda e direita). Na primeira vez que uma forma é ouvida, o som sintetizado cobre enquanto os arquivos baixam.

**Volume e mudo.** Respeita o 🔊 do site, o "Som do 3D" e o "Volume do ambiente e dos passos" das Opções do 3D (fora do 3D, vale o último volume escolhido). O áudio só começa depois do primeiro toque na página (regra dos navegadores).

**Legendas de som** (desligadas por padrão, valem só neste aparelho): textos discretos no meio da parte de baixo da tela, como "[um rosnado ao norte]", "[algo arrasta à esquerda]" ou "[respiração molhada muito perto]", sem dizer o que é. No 3D, a direção é em relação à câmera (à frente, atrás, à esquerda, à direita); no mapa, pelos pontos cardeais (o norte fica para cima). Liga em **Opções › Áudio e chat › Legendas de som** no 3D, no botão **CC** ao lado do 🔊 no topo do mapa ou, em telas estreitas, no ⚙ do painel.

**Firebase:** nenhum caminho novo; `ecos3d` aceita os campos opcionais `f` (forma: letras minúsculas, números e `_`) e `q` (até 8 caracteres). Atualize as regras com `regras-firebase.json`.

**Limites:** como os ecos já eram públicos, quem abrir as ferramentas do navegador pode ver a forma de quem fez o barulho (a aparência, nunca o nome). A tela do Mestre precisa estar aberta para os jogadores ouvirem (é ela que publica os ecos). As vozes ao acaso de cada aparelho são sorteadas ali mesmo (duas pessoas não ouvem a mesma voz no mesmo instante). Os sons foram feitos com gravações CC0 (domínio público) e síntese própria; fontes e licenças em `sons/CREDITOS.md`.

### Efeitos que todos veem

Aparecem em volta do personagem, para quem está vendo aquele token (no 3D e no mapa 2D):

| O quê | De onde vem |
|---|---|
| ◈ Ritual (selo girando no chão na cor do elemento) | Ritual conjurado pela ficha |
| ✦ Habilidade (onda e faíscas) | "⚡ usar" de uma habilidade na ficha do jogador; habilidade ou ação de um Filho no Controle |
| ⚔ Ataque (cortes no ar) | Ataque de um Filho no Controle |
| −X PV (sangue espirrando e poça) | PV da ficha ativa caindo (vitais publicadas no token) |
| −X SAN (anel roxo e sombra) | Sanidade da ficha ativa caindo |
| +X PV (brilho verde) | Cura |
| ★ 20 natural, ✖ 1 natural, óbito, insanidade | Momentos da Mesa |

No **seu** personagem a tela também sente: borda vermelha e tremida no dano, distorção roxa na sanidade.

### Presença (aparição que só um jogador vê)

O Mestre (bandeja dos Filhos, botão **Presença**) e os auxiliares (kit do auxiliar) colocam uma Presença na Zona Neutra do andar aberto. Ela é pública, mas **nenhum jogador a enxerga** até alguém escolher no cartão dela o campo **Quem enxerga, entre os jogadores** (uma cobaia). A partir daí, só aquele jogador (além do Mestre e dos auxiliares) a vê, no 2D e no 3D. Mestre e auxiliares movem a Presença arrastando no 2D ou pelo **🎮 Controle (3D)**. A do auxiliar entra quando a tela do Mestre confirma (como o robô). No 3D ela tem modelo próprio (aparição translúcida flutuando).

- **Limite:** como todo token público, quem abrir as ferramentas do navegador pode achar o registro dela no Firebase. A ocultação é de tela.
- O auxiliar não tira do mapa uma Presença já publicada (regra do Firebase): só o Mestre.

### Figura flutuante e campo (objeto `campo_infinito` da cena)

Uma sala pode ter, na cena, o objeto `campo_infinito`: uma figura (triângulo invertido) flutuando, com anéis girando e ondas no chão. Ninguém chega nela:

- Dentro do raio `ext` (padrão 7 m), a parte do passo que vai **em direção** à figura encolhe cada vez mais (andar de lado continua normal). Dá para insistir, mas nunca se passa de `r0` (1,3 m).
- Quem força até `r1` (2,6 m) fica **preso**: a tela distorce e cada tentativa de se afastar (no máximo uma a cada 2,5 s) é um teste (`per`, padrão Vontade; `dt`, padrão 20) com a ficha ativa. A rolagem vai só para o Mestre (Sussurro). Passou, o token pode se afastar; falhou, continua preso.
- Mestre e auxiliares controlando um token também ficam presos (rolam d20 puro). A câmera livre do Mestre não sente o campo.
- **Limite:** vale no 3D. Arrastando no mapa 2D, o token não sente o campo.
- O `salas-3d.json` desta versão traz o objeto na sala que tem a figura. **É preciso importar o arquivo de novo** (cartão de qualquer sala, perfil do Mestre).

### Mochila (tecla I)

Jogador: **I** (no mapa e no 3D), o ☰ Menu → **Mochila** no 3D. Mostra o que a **ficha ativa** carrega, como num jogo: carga (com o aviso de sobrecarga), os limites de categoria da patente, filtros (Armas, Proteção, Consumíveis, Outros) e cada item com ícone, quantidade, categoria e espaço. Tocando num item aparecem a descrição, o dano, o elemento e, nos itens de cura e afins, **Usar** (mesma regra do botão "Usar em mim" da ficha: rola, soma na ficha e gasta o item). Itens pegos no 3D aparecem marcados como "achado". Editar o inventário continua sendo na ficha (📋 Ver na ficha). I ou Esc fecha.

### Narrador (só o Mestre; tecla N no 3D)

Quando uma cobaia entra numa sala, abre para o Mestre um quadro com: quem entrou, a sala (com "primeira vez" na primeira visita), o texto **Para ler à mesa** (o que as cobaias veem, do caderno), o **Na mesa** do caderno, as suas notas da sala, a sala de exposição posta ali e quantos itens há no chão. **📢 Narrar no chat** manda o texto para ler no chat Geral (no 3D aparece como legenda do Mestre). Tocar no nome da sala leva a vista até ela. O botão "Abre sozinho / Só no N" escolhe se o quadro abre sozinho a cada entrada.

- Os textos vêm junto do arquivo de cenas 3D (`salas-3d.json`, campo `narrativa`) e, ao importar, vão para os segredos do Mestre (`segredos/_narrativa`). Jogadores nunca recebem esses textos.

### Itens que o Mestre deixa nas salas (3D)

No 3D, painel 🎛 → **Deixar um item nesta sala**: escreva o nome (a lista sugere os itens do catálogo) e toque em **Colocar**. O item aparece no chão à sua frente (em primeira pessoa) ou no centro da vista, para todos que veem a sala, com a mesma peça dos itens do livro. Quem chega perto usa **E · Pegar**: o item some para todos e entra na ficha ativa (com os dados do catálogo, se o nome bater). No mesmo bloco o Mestre vê os itens que deixou ali (e os que já foram pegos) e tira com ✕. Fica em `mapa/itens3d` e `mapa/estoque/m_<chave>`.

### Salas de Exposição no 3D e no mapa 2.5D

Quando o Mestre dá **▶ Iniciar** numa Sala de Exposição posta numa CN, aquela sala **se transforma** para todos que a veem, e muda com as rodadas e com o progresso do grupo:

- **3D:** o ambiente entra por cima da cena da sala (chuva de sangue ou de cinzas, água subindo a cada rodada, paredes se fechando, teto rachando e pedaços caindo, labirinto de paredes altas, enxame de silhuetas, vento, gelo, fogo, floresta, plateia, relógio gigante…), com névoa e luz próprias enquanto você está ali. Paredes do labirinto e afins bloqueiam o andar, mas nunca os vãos das portas. Ao encerrar, a sala volta ao normal.
- **Mapa 2.5D:** uma camada animada por cima da sala (chuva caindo, líquido subindo, paredes fechando, grade do labirinto, zonas piscando) e o selo **EXPOSIÇÃO · nome · rodada N**. Respeita "reduzir movimento" do aparelho.
- O visual de cada sala de exposição vem do campo `cena3d` da biblioteca (`salas-exposicao.json`, fora do GitHub). Sem `cena3d`, o site escolhe pelo `modelo`, elemento e ambiente sonoro. **Importe a biblioteca de novo** (Mesa → Salas de Exposição → ⬆ Importar) para trazer o `cena3d` das 37 salas.
- **Limite:** como o resto do estado da exposição em andamento, o nome público e o visual ficam em `mapa/expo` (todos leem). O efeito secreto e os eventos continuam só com o Mestre.

### Formas detalhadas das criaturas

Cada Filho com arte de referência ganhou uma forma própria no 3D (`filhos3d.js`), com textura, animação de respiração, tiques e jeito de andar (arrasta, rasteja, desliza, passos pesados; o homem de raízes não anda) e o núcleo roxo pulsando. Os que andam em bando saem cada um um pouco diferente. A forma de cada Filho vem no `salas-3d.json` (campo `formas`, fora do GitHub): ao importar de novo, a forma detalhada substitui a genérica antiga; uma forma que o Mestre escolheu no painel 🎛 (Forma da criatura no 3D) continua. As formas genéricas antigas seguem na lista para quem não tem arte.

- **Ataque e revelação:** quando um Filho ataca pelo Controle, além do efeito de ataque, a forma detalhada toca `acao('ataque')`; quando ele aparece para os jogadores (o Mestre revela, a ocultação especial cai ou um Flash o mostra), a tela do Mestre grava a hora no token (`rvt`) e o 3D de todos toca `acao('revelar')`. As formas antigas não têm essas animações e seguem iguais.
- **Forma do próprio token:** um Filho com forma rolada usa a forma gravada no token (`fm`) antes da forma escolhida para o Filho (`mapa/formas`). As crias aparecem menores.
- **Limite:** o código das formas é público (sem codinomes nem habilidades). Quem ler o código vê as aparências, mas não sabe de quem é cada uma até o Mestre publicar a forma. O mapa das formas do Zero fica só nos dados secretos (não vai em `mapa/formas`).
- **Barulho das interações:** fliperama, piano, telefone, sino, rádio, portão de metal e máquinas contam como uma porta aberta no decibelímetro daquela sala por 2 minutos, e o Mestre recebe "🔊 Barulho em CN …: algo pode ter ouvido".

### Interações nas salas (tecla E)

Cada sala tem objetos que se usam com **E** (ou tocando no botão que aparece na tela quando você chega perto). Quem usa é quem controla um token (o jogador com a cobaia, o Mestre e os auxiliares controlando alguém); o Mestre usa também da câmera livre.

| No botão | O que faz | Quem vê |
|---|---|---|
| 🚪 Abrir / Fechar | portões, armários, gavetas, geladeiras. Portão fechado barra a passagem; aberto, deixa passar | todos na sala, com som |
| 💡 Ligar / Desligar | luminárias, TVs, monitores, projetor, máquinas: o brilho e a luz da peça apagam ou acendem | todos |
| 🕹 Jogar | fliperamas: a tela roda uma partida por alguns segundos | todos, com som |
| 🎵 Tocar… | piano, órgão, telefone, sino, gravador, rádio | todos por perto ouvem |
| 📄 Ler | avisos, etiquetas, instruções (só o que a sala mostra; nada de segredo) | só quem leu |
| 🦺 Vestir | trajes num cabide (veja abaixo) | todos veem o traje na miniatura |

- O estado fica em `mapa/inter` (o portão que um abriu fica aberto para todos). **Atualize as regras do Firebase** com o `regras-firebase.json` desta versão (novo: `mapa/inter`, que qualquer conta logada grava no formato certo). Sem isso, só o Mestre consegue abrir e ligar as coisas.
- **Limite:** o portão aberto deixa passar no 3D. No mapa 2D, as paredes e portas continuam as da planta.

### Telão do cinema (vídeo do YouTube)

Na sala com telão, o Mestre abre o 🎛 (ou aperta E no telão) → **Telão desta sala**: cola o link do YouTube e toca em **▶ Passar**. O vídeo aparece na tela do cinema para todos que estiverem na sala, sincronizado (quem entra depois pega o vídeo andando), e o som sobe quanto mais perto da tela. **⏹ Parar** tira. Fica em `mapa/video`.

- **Limites:** o vídeo é desenhado por cima do 3D, então alguém andando na frente da tela não o cobre. O navegador pode segurar o som até a pessoa tocar na tela uma vez. Vídeos que o dono bloqueou para incorporação não tocam. Fora da sala o vídeo para de carregar (economiza dados).

### Trajes (vestir pelo 3D, pela mochila ou pela ficha)

Nos cabides de trajes (ex.: vestiário do 3º andar), **E · Vestir** coloca o traje na ficha ativa **já vestido**, e o cabide fica com um a menos para todos (`mapa/estoque/v_…`; o Mestre repõe no 🎛 → Trajes nesta sala). A miniatura passa a aparecer de traje (capuz, viseira, luvas, botas), no 3D de todos.

Regras dos livros que o site aplica:
- **Traje Hazmat** (livro base): +5 em testes de resistência contra efeitos ambientais e resistência a químico 10. Categoria I, 2 espaços.
- **Traje de Isolamento Elétrico**: RD 5 e +5 em resistência contra eletricidade. **Traje de Mergulho** (SaH): +5 contra efeitos ambientais, resistência a químico 5, 1 hora de oxigênio. **Traje Espacial** (SaH): +10, resistência a químico 20, oito horas. **Roupa de Aproximação**: resistência a fogo 2 e +5 em Fortitude contra calor e fumaça.
- Vestir ou tirar é **ação completa** (o traje espacial leva duas rodadas): o aviso lembra.
- No máximo **duas vestimentas** ao mesmo tempo: a terceira entra na ficha sem vestir.
- Na ficha, o traje tem a caixa "vestido"; a aba Em jogo mostra **Vestindo** com o que ele dá. Na mochila (I), **🦺 Vestir / Tirar**.
- **O que não é automático:** o +5 depende de o teste ser contra um efeito ambiental (ou elétrico), e só o Mestre sabe disso na hora: o site mostra o lembrete, não soma sozinho. As resistências aparecem escritas, para o Mestre descontar o dano.

### Zona Neutra no 3D

Toda Zona Neutra (sala 25 de cada andar) tem beliches, camas, armários, mural, geladeira, bebedouro e a banca do Maurício (o palhaço de mola na caixa "PROJ Maurício", com armas, lanternas, latas e máscaras de gás, e a placa "COMPRE OU TROQUE!"). Cada andar mantém o próprio jeito (bunker, alojamento, guarita, vagão, quarto branco).

- Perto da banca: **E · Falar com o Maurício** abre a Loja do Maurício (as mesmas regras de loja aberta/fechada).
- Perto da geladeira ou do bebedouro: **E** pega 1 comida ou 1 água da despensa (mesma regra do botão "Pegar 1").
- **Estação de leitura O.R.F.E.U.:** em toda Zona Neutra há um terminal (mesa com monitor verde) e um arquivo de aço com mural de cifras, com a placa "ESTAÇÃO DE LEITURA O.R.F.E.U.". Perto do terminal: **E · Usar o Terminal O.R.F.E.U.** abre o Arquivo direto na aba Terminal. Perto do arquivo: **E · Ler o Arquivo** abre documentos e cifras. São as mesmas telas do 📜 Arquivo do painel, com as mesmas liberações do Mestre.

### Esconderijos

Móveis marcados como esconderijo (embaixo da cama, dentro do armário, atrás do balcão…) mostram "E · Esconder". O token fica escondido: some da tela dos outros jogadores, nas duas vistas. Andar de novo tira do esconderijo. **Limite:** é ocultação visual; a posição continua no Firebase.

**Quem enxerga quem está escondido:**

- **Mestre:** todo mundo, sempre.
- **Robôs S.T.A.F.F. (auxiliares):** todas as cobaias e NPCs, escondidos ou não, nas duas vistas (no 3D com "· escondido" no nome).
- **Filhos:** quando o auxiliar está no **Controle de um Filho** no 3D, a tela passa a ser a do Filho. Quem está escondido **na mesma sala** só aparece se **falhou** no teste de Furtividade feito ao se esconder (DT 15). Passou, o Filho não vê. Sem ficha ativa (sem teste), o Filho vê.
- O resultado do teste fica no token (`eo`). No cartão da cobaia escondida, o Mestre vê "passou" ou "falhou" e pode trocar. O botão **Filhos veem mesmo escondida** (antigo "Visível aos Filhos") faz os Filhos enxergarem aquela cobaia mesmo que ela tenha passado.

### Saída do andar (elevador, poço, eclusa, fenda)

No fim do corredor de saída de cada andar fica o elevador (no 2º andar, a saída é o poço dentro da própria sala). Chegando nele: **E · Usar a saída do andar**.

- **Jogador e auxiliar:** escolhem o andar e **pedem ao Mestre**. Só o Mestre muda o andar de um token (regra do Firebase), e é ele quem decide se a passagem abre e o que ela cobra. O pedido aparece como alerta na tela do Mestre (também por cima do 3D) e na fila **Pedidos**, com **Levar ao Nº andar** ou **Recusar**. Aprovado, vão juntos quem pediu e as cobaias, robôs e NPCs que estiverem na saída.
- **Mestre:** no próprio 3D, marca quem vai (já vêm marcados os tokens que estão na saída) e o andar, e toca em **Levar**. A vista dele acompanha.
- **Chegada:** descendo, a 1ª sala do andar (Doca de Chegada, Plataforma de Descarga, Antecâmara das Relíquias, O Fim da Descida); subindo, a sala da saída do andar de cima.
- O jogador ainda precisa da senha do andar novo para ver o 2.5D e o 3D dele.

### Chat dentro do 3D: balões e vozes

- **💬** no topo da vista (ou Enter) abre o chat por cima do 3D. A mensagem do Geral aparece num **balão em cima da cabeça** de quem falou, para quem está vendo aquele token (o jogador só vê quem está na mesma sala; os balões seguem o personagem e somem depois de alguns segundos). Rolagens aparecem como balão roxo.
- As falas do **Mestre** aparecem como legenda na parte de baixo da tela.
- **Cada personagem tem uma voz**, gerada na hora: Velcro, criança (menina); Papel, mulher (suave); Faca, mulher (firme); Luva, homem; Sabonete, mascarado (abafado); Papelão, remendado (grave, arrastado, várias vozes juntas); B00BIES, M3RL1N e K4ISER, robôs (agudo, grave e metálico). O volume cai com a distância e o som vem do lado onde o personagem está.
- **Trocar a voz:** ⚙ Opções do 3D → **Voz no chat** (com ▶ para ouvir). Fica no token (`vz`), então todos ouvem a mesma voz. O Mestre troca a de qualquer token no painel 🎛.
- **C2P0 e Mostarda** continuam com as línguas próprias: o balão **sempre** mostra os bips e zips (ou os grunhidos), com o nome da língua no topo. Quem não conjurou **Compreensão Paranormal** vê embaixo "Incompreensível"; Mestre, auxiliares e quem conjurou veem a tradução numa linha separada (✦), como no chat.

### Dados 3D

Toda rolagem feita no site (🎲 Dados, perícias, ataques, dano e rituais da ficha) mostra, na tela de quem rolou, um quadradinho com os dados caindo numa bandeja com física de verdade. O número que fica para cima é sempre o que o site sorteou (a física roda primeiro e as faces são numeradas para a face de cima ser a sorteada). Em testes com vários d20, o dado usado brilha. Toque no quadradinho para fechar. Opções do 3D: ligar ou desligar e também mostrar no mapa 2D.

### Metros andados

No canto superior direito, abaixo do decibelímetro: **🚶 X m**, os metros de regra que o seu token andou (mapa 2D e 3D), contados neste aparelho. ↺ zera. Teleporte (o Mestre trouxe, saída do andar) não conta. Na perseguição, a faixa do topo continua mostrando os metros da vez.

### Itens do livro nas salas

As cenas trazem itens do livro jogados pelas salas (pé de cabra, lanternas, kits, munição, medicamentos…; poucos itens amaldiçoados, nos andares de baixo). Eles só aparecem quando o Mestre quer: painel 🎛 → **Itens do livro no Nº andar → Espalhar todos** (ou **Recolher**). Perto de um item: **E · Pegar**. Ele some para todos (`mapa/estoque/i_<CN>_<n>`, a mesma regra da despensa) e entra no inventário da **ficha ativa** com os dados do catálogo (marcado como achado); o chat avisa quem pegou.

### Documentos e cifras nas salas

Documento ou cifra do Arquivo com **Onde aparece: Na parede de uma sala** e publicado vira uma pasta no chão daquela sala no 3D. **E · Ler** abre o Arquivo direto nele.

### Esconder-se (regra do livro)

Ao entrar num esconderijo, a ficha ativa rola **Furtividade contra DT 15** (Sobrevivendo ao Horror, Furtividade: "Esconder-se"; passou, a visibilidade cai 1). A rolagem vai só para o Mestre (Sussurro; no auxiliar, canal dos Filhos), para o chat Geral não entregar quem se escondeu. Sem ficha ativa, o aviso pede para rolar se o Mestre pedir.

### Personagens sólidos

Os tokens não atravessam móveis nem uns aos outros: quem anda bate e desliza, e um token posto pelo mapa 2D em cima de uma cama ou armário aparece no ponto livre mais perto (só na tela; a posição de regra não muda). Dois tokens no mesmo ponto se afastam um pouco. O modelo de cada personagem **olha para onde o dono está olhando** no 3D: quem controla grava a direção no token (`d`, em graus, poucas vezes por segundo) e todos veem igual. Arrastado no mapa 2D, volta a olhar para onde anda.

### Perseguição: 2.5D e 3D juntos (ou só 3D)

As duas vistas usam a MESMA perseguição (`mapa/persg`): ordem de iniciativa, de quem é a vez, o limite de metros de cada um e os metros já gastos na vez (`m` no token). Arrastar no mapa 2D e andar no 3D passam pelas mesmas regras:

- **Fora da vez**, os dois recusam ("Na perseguição, só quem está na vez se move"). No 3D, a faixa do topo mostra de quem é a vez e, na sua, "Sua vez: X / 9 m".
- **Metros:** o que você anda no 3D é descontado no 2D e vice-versa; quando acaba, o token para no ponto exato ("Deslocamento esgotado"). Os metros são os de regra: a sala do 3D tem 20 m de lado, mas vale a sala da planta (50 m²), então dentro dela cada passo do 3D rende uns 35% de metro de regra; no corredor é igual.
- **Misturado:** um jogador pode correr no 3D enquanto outro arrasta no 2D, na mesma rodada; o Mestre vê tudo nas duas vistas.
- **Só no 3D:** funciona igual. O Mestre conduz pela gaveta 🗂 (Painel do Mestre, aba Mesa, bloco "Perseguição (Sobrevivendo ao Horror)", seção "Participantes e ordem": pedir iniciativa, iniciar, próxima vez, refazer rota, cronômetro); os jogadores rolam a iniciativa pelo pedido que abre na tela (os dados 3D rolam junto); os Filhos andam pelo Mestre ou pelo auxiliar (🎛 → controlar o token), com as mesmas regras, a menos que o Mestre ligue o movimento livre.
- **Cuidado:** no 3D o jogador só enxerga a própria sala. Para ter a visão do andar inteiro durante a fuga, o Mestre pode deixar o 2.5D aberto em outra aba ou usar o botão 🏢 Andar.

### Fuga dos jogadores (`fuga3d.js`)

O lado das cobaias na perseguição: o que o jogador pode fazer no 3D para fugir, além de correr. Tudo aparece para quem controla a própria cobaia (o Mestre também, controlando uma cobaia ou NPC). Na perseguição, as ações que custam alguma coisa só valem **na sua vez**; fora dela, valem a qualquer hora e sem custo de metros.

**Botões:** no canto de baixo à direita do 3D, acima da barra das câmeras: **👀 Atrás** (só na perseguição), **🪑 Barricar**, **📣 Barulho** e **📍 Sinal**. Barricar, Barulho e Sinal também estão no menu ☰ e nas teclas **X**, **V** e **G** (se não estiverem em outra ação nas Opções). Barricar e Barulho abrem uma janelinha com as escolhas do lugar onde você está.

1. **Rota com custo.** Na sua vez, tocar (ou clicar) no chão do 3D desenha o caminho até lá, desviando de móveis, portas fechadas e barricadas, com um ponto a cada metro de regra e o total no fim ("6,2 m · sobra 2,8"). O trecho que passa do seu deslocamento fica vermelho e tracejado, com "para aqui" onde você para. Um cartão acima dos botões repete os números, com **▶ Ir** e **✕**. Tocar de novo no mesmo ponto (ou ▶ Ir) anda pelo caminho, usando o mesmo andar por toque de antes (as regras de metros e paredes continuam valendo). Quem preferir andar no primeiro toque desliga em ⚙ Opções › Controles › Fuga. Fora da sua vez e fora da perseguição, o toque no chão anda como sempre.
   **"Ele te pega aqui":** com um Filho **visível** que está na perseguição (revelado, à vista deste jogador; nunca um oculto, em forma de objeto, copiando ou só por uma lente), a rota mostra o caminho dele em vermelho até onde ele chega no próximo turno, com o deslocamento dele na perseguição. Se ele alcança o ponto onde você vai parar: X vermelho e "ele te pega aqui". Se não: anel laranja "ele chega até aqui · falta X m". A conta usa só o que o jogador sabe (portas e barricadas comuns), não as características secretas do Filho.
2. **Olhar para trás.** A câmera vira por 2 s (primeira pessoa, terceira pessoa ou vista de fora) e um quadro diz o que está atrás: o Filho visível mais perto com a distância ("8 m"; noutra sala, "na sala ao lado", "a 2 salas"; no corredor, os metros), com um anel vermelho embaixo dele se ele está à vista no 3D. Sem nada visível: "Nada à vista". Na perseguição, o **Q** (olhar para trás) passa a fazer a mesma coisa, com o mesmo custo. Fora dela, o Q continua como antes.
3. **Barricada** (Sobrevivendo ao Horror, "Criar obstáculo": **Força DT 15**). Perto de uma porta da sala (até uns 6 m), a janelinha oferece o maior móvel por perto ("Derrubar a estante na porta norte, à sua frente", "Empurrar a maca…") e, se a porta do corredor está aberta, "Fechar e travar a porta". A ficha ativa rola Força (sem ficha, 1d20) e a rolagem vai ao chat. Passou: o móvel vai até o vão e tomba atravessado (com caixas e uma cadeira completando o vão), ou a porta fecha com tábuas pregadas; todos veem nas duas vistas (no mapa 2D, 🪑 ou ⛔ na ponta do corredor). A passagem fica **bloqueada nas regras do mapa** para todos (2D, 3D, rota, piloto automático). Fazer barricada faz barulho (+1 na sala, 1 min). **Desfazer:** perto dela, **E · Desfazer a barricada**. **Filhos:** quem tem **arromba portas** quebra passando (estrondo, +2 de barulho); quem **atravessa paredes** passa direto; os outros contornam ou arrombam: no Controle, perto dela, **E · Arrombar a barricada** rola Força DT 15 com a ficha ligada ao Filho (sem ficha, 1d20), em segredo. Esses três custam, na perseguição, o que o Mestre escolher (padrão: metade da vez). Não dá para fechar um vão com alguém parado nele. Esconderijos e móveis com interação (armários que abrem, geladeiras) não são usados.
4. **Esconderijo por dentro.** Quem se esconde (E num esconderijo, Furtividade DT 15 como antes) passa a ver o mundo de dentro do móvel, em primeira pessoa: pelas **frestas** da porta (dentro do armário, da cabine), pelo **vão** baixo (embaixo da cama, da mesa, da maca), por cima do que cobre (atrás das caixas, do balcão) ou **entre as estantes**. A cabeça vira pouco (você está apertado ali). Com **Coração e respiração** ligado (Opções › Áudio), a respiração fica baixa e lenta; com um Filho à vista a poucos metros, ela prende e a imagem treme. O Filho passando aparece normalmente se ele estiver visível para esse jogador (as mesmas regras de sempre). A rolagem continua a do livro: só muda o que o jogador vê.
5. **Barulho de propósito.** **Gritar** (+2 no decibelímetro da sala, 1 min e meio), **assobiar** (+1, 1 min) ou **jogar um objeto** pela porta aberta de um dos vãos para a sala vizinha (+1 lá, 1 min). O barulho entra no mesmo ruído das salas (o decibelímetro, a escuta dos auxiliares, a audição dos Filhos e o encontro por barulho), mesmo numa sala vazia: serve para atrair a criatura para longe de um colega. Quem está no andar ouve, de onde veio (até 24 m; legenda de som, se ligada). Na perseguição, só na sua vez; um a cada 8 s. Zona Neutra não conta.
6. **Sinalizar.** **📍 Aqui!**, **➜ Ele foi por ali** (seta para onde você olha) ou **⚠ Perigo!**, no ponto onde a mira encosta no chão (até 25 m, sem passar da parede). O grupo inteiro vê por 8 s: feixe de luz, anel e o nome de quem marcou no 3D (por cima das paredes) e um marcador no mapa 2D. Por padrão faz um pouco de barulho (+1 na sala, 20 s).

**Mestre (aba Mesa, bloco "Perseguição (Sobrevivendo ao Horror)", seção recolhível "Fuga dos jogadores"; começa fechada):** chips liga/desliga para a rota com custo, o "ele te pega aqui", as barricadas, o barulho de propósito, o sinal, o barulho do sinal e o esconderijo por dentro; quanto custa **olhar para trás** (nada, um pouco de barulho, que é o padrão, 1,5 m ou 3 m da vez) e quanto custa a **barricada** na perseguição (nada, 3 m, metade da vez, que é o padrão, ou a vez inteira); e **🧹 Tirar as barricadas do mapa**. Tudo em `mapa/cfg/fuga`.

**No Firebase (novos, todos leem; qualquer conta logada grava no formato certo):**

| Caminho | O quê |
|---|---|
| `mapa/barricadas/<k>` | `k` = `cNN:i` (móvel `i` da cena da sala NN) ou `aA:cCI` (porta do corredor CI do andar A); valor `{ t: movel \| porta, a, ci, cn, lado, i?, ob?, q, ts }`. Bloqueia uma faixa do corredor `ci`: a ponta encostada na sala `cn` (móvel) ou o meio (porta). `ACF_FUGA.zonaBarr(v)` devolve o retângulo em unidades da planta; `ACF_FUGA.barricadas(a)` lista com a zona; `ACF_FUGA.bloqueia(id, a, x, y)` é a mesma conta do mapa (o `andavel` do `app.js` já usa). Quem atravessa paredes passa; quem arromba quebra ao passar |
| `mapa/fuga/r/<k>` | barulho de propósito `{ a, p (sala 1 a 24), n (1 ou 2), t: grito \| assobio \| objeto \| olhar \| sinal \| barr \| arromba, ts, x?, y? }`; vale enquanto durar (20 a 90 s, pelo tipo) e entra em `gruposDeSala` como cobaias a mais (`ACF_FUGA.ruidos()`) |
| `mapa/fuga/s/<k>` | sinal `{ a, x, y, t: aqui \| foi \| perigo, ts, q (quem), d? (graus na planta, 0 = leste, 90 = sul) }`, 8 s |

Quem gravou apaga o que venceu; a tela do Mestre também limpa. **Atualize as regras** com `regras-firebase.json`.

**Limites:** o caminho e o "ele te pega aqui" são previsões feitas no aparelho do jogador, com as regras públicas (o Filho pode ter características que mudam isso). A rota desvia só dos móveis das salas carregadas no 3D (a sua e as vizinhas). A barricada bloqueia o vão; o móvel tombado é desenhado onde a regra bloqueia, mas é só aparência (as caixas que completam o vão não existem na cena). Os sinais, barulhos e barricadas são públicos: quem abrir as ferramentas do navegador vê quem marcou e onde. O teste de Força do Filho sem ficha ligada é 1d20.

### Os Filhos na perseguição (`perseg3d.js`)

O lado do Mestre na perseguição: a criatura sugere o que faria, age pelo que é e a mesa ganha abertura, porta batendo e replay. **Nada acontece sozinho para assustar:** tudo nasce de um clique do Mestre (iniciar, confirmar, mostrar) ou de uma regra que já dispara (a cobaia entrou na Zona Neutra).

**1. Piloto automático do Filho (Mestre e auxiliares).** Na vez de um Filho aparece o cartão **🐾 Vez de …** (por cima do 3D e no canto do mapa; também no bloco "Perseguição (Sobrevivendo ao Horror)"). **Mover Filho** calcula para onde a criatura iria e desenha a rota: no 3D, uma fita laranja no chão com setas, os metros em pé no fim do alcance e um alvo vermelho pulsando onde ela queria chegar; no mapa 2.5D, a mesma linha (forte até onde ele chega nesta vez, fraca até o alvo) com os metros em pé no fim. **✔ Confirmar rota** anda com o token pela rota (pelas mesmas regras do arraste: `moverToken3D`, vez, limite, portas, paredes, barricadas); **↻ Outro alvo** troca para a próxima opção; **✕** descarta. Mover o Filho à mão (2D ou 3D) apaga a sugestão. Com **Rota já no começo da vez** ligada, a sugestão aparece sozinha: é só confirmar.
- **Como escolhe o alvo** (pelos sentidos de `privado/filhos`, nunca pelo nome): quem ele percebe pela regra do `filhos.js` (visão, visão curta ou total, vibração de quem se mexeu, teia, solidão, raízes, ninho, maior NEX, telas, câmeras, leitura, rastro próprio) vem primeiro; depois o **faro de sangue** (cobaia ferida), o **faro de trilha** (a sala mais nova da trilha) e a **audição** (o barulho do decibelímetro, das portas, das interações e do barulho de propósito, ao alcance; audição precisa só dá a direção no sussurro). Entre alvos do mesmo tipo, o mais perto pelo caminho. O cartão diz o motivo ("ouviu barulho moderado em CN 13", "faro de sangue (ferida)"…), a sala, quem é e quantos metros anda.
- **Até onde vai:** o deslocamento da vez (limite da ficha ou da perseguição, com lento, dobro, água etc. do `filhos.js`), menos o que já andou. **Respeita** portas fechadas (só passa quem arromba, atravessa, tem os dutos ou nada entre salas com água), paredes (quem atravessa anda em linha reta pela planta), "grande demais" em lugar estreito, "não entra em metal", "evita barulho", barricadas (`fuga3d.js`) e a **Zona Neutra, onde nenhum Filho entra**: se o alvo está lá, a rota termina no batente. Imóvel, só no escuro, forma de objeto ou parado pelo Olhar: o cartão diz por que não anda. Ele para um pouco antes da cobaia (não fica em cima dela).

**2. Comportamento visível no 3D** (sem mexer nas formas: só gira, inclina, sobe, afunda ou deixa translúcido o grupo do token). **Ouve:** parado, vira o corpo para o barulho mais forte ao alcance e inclina de leve. **Fareja:** com faro de sangue sobre uma cobaia ferida na sala ou ao lado, ou com faro de trilha numa sala da trilha, abaixa e cheira o chão (andando, vai inclinado). **Teto:** quem tem a ocultação "no teto" anda de cabeça para baixo no teto (4 m na sala, 2,7 m no corredor). **Água:** quem tem afinidade com água (rápido na água, ouve na água, canos, alagar ou rastro molhado) afunda devagar na sala "água" e some, deixando ondas no chão. **Parede:** quem está dentro de uma parede (atravessa paredes) fica translúcido. Mestre e auxiliares calculam pelas características; para os jogadores, a tela do Mestre grava no token público só o que já está à vista (`tokens.<id>.cpt`: `t` teto, `a` água, `f` fareja, `o<graus>` ouvindo), nunca para um Filho oculto.

**3. Abertura da perseguição.** Quando o Mestre clica em **Iniciar perseguição** (não no Encontro, que tem o próprio momento), a tela dele marca a revelação nos Filhos da ordem que estão à vista (`rvt`): todos que veem a criatura (revelada) têm 2 s de câmera nela, com a animação `acao('revelar')` e o som de revelação da forma (`sons-filhos.js`); no 2D, o mapa centra nela com um pulso vermelho. Depois a câmera volta ao primeiro da iniciativa.

**4. O Filho para na porta.** Durante a perseguição, quando uma cobaia da ordem entra na Zona Neutra, a porta bate (som grave com eco, de onde fica a porta; com legenda se as legendas de som estão ligadas; o celular de quem entrou treme) e, no 2D, a porta pisca. A criatura da perseguição que estava a até 16 m daquela porta para, encara o batente por 3 s e vira as costas (só animação: a posição não muda). O piloto nunca leva um Filho para dentro da Zona Neutra.

**5. Replay da perseguição.** A tela do Mestre grava as posições de quem está na ordem, de quem é a vez e os ataques (o efeito de ataque do Controle e as garras do `imersao.js`). No fim da perseguição abre, só para ele, um replay de 8 a 20 s visto de cima: o pedaço do andar onde tudo aconteceu, o caminho de cada um na cor da cobaia, o do Filho tracejado em vermelho, as marcas de ataque aparecendo na hora certa e "Rodada N · vez de …" em cima. As pausas da mesa somem (só contam os momentos em que alguém andou). Ficam os 8 últimos em **Mesa › Momentos marcantes › 🎞 Replays de perseguição** (▶ ver, 📣 mostrar a todos, 🗑 apagar) e entram no **Resumo automático da sessão** (quando, duração, rodadas, cobaias e ataques; sem citar Filhos nem salas). **📣 Mostrar a todos** abre o replay na tela dos jogadores e auxiliares; para eles, o Filho só aparece nos trechos em que estava à vista, com o rótulo genérico "criatura", e os retratos de quem não se via somem.

**6. Linha de iniciativa no 3D.** No lugar da faixa "PERSEGUIÇÃO · Vez de…", uma fileira de retratos no topo: quem age (maior, com aro dourado e o nome), quem vem depois (até 7; 4 no celular) e **???** tracejado para quem você não vê (o Filho oculto), a rodada, o relógio da vez (o mesmo do momento.js, que some enquanto a linha aparece) e "Sua vez: x / 9 m" ou "aguarde a sua vez". **No celular (até 560 px), a faixa e a linha ficam à esquerda do decibelímetro**: nada passa por cima dele (antes a faixa ficava embaixo); durante a perseguição, a linha de dicas de teclas some no celular para dar lugar a ela.

**7. Opções (bloco "Perseguição (Sobrevivendo ao Horror)", aba Mesa, seção recolhível "Filhos na perseguição"; começa fechada):** chips liga/desliga, todos ligados por padrão: 🐾 Piloto automático do Filho · 🗺 Rota já no começo da vez · 🎭 Comportamento visível no 3D · 🎬 Abertura (2 s na criatura) · 🚪 O Filho para na porta · 🎞 Replay no fim · 👥 Linha de iniciativa no 3D. Valem para todos (`mapa/cfg/perseg/<opção>` = `false` desliga).

**No Firebase (novos):** `mapa/cfg/perseg/<opção>` (só `false`, com validação), `mapa/replay` = `{ id, ts, j }` (o replay que o Mestre mandou mostrar, em texto, até 60 000 caracteres; sai sozinho em 5 minutos) e o campo `cpt` nos tokens dos Filhos (sem regra nova: o jogador não grava token de Filho). Os replays do Mestre ficam em `segredos/_replays/<k>` (só o Mestre). **Atualize as regras** com `regras-firebase.json`.

**Limites:** o piloto é uma sugestão calculada na tela de quem clicou, com uma grade de 25 cm; os móveis das salas não contam (como no mapa), e a rota anda em tempo real (num aparelho lento ela chega mais depressa ao fim). O alvo vem de uma leitura simples dos sentidos; casos que a ficha resolve por teste (Percepção contra Furtividade, Olhar ao redor) continuam com o Mestre. A tela do Mestre precisa estar aberta para publicar o comportamento (`cpt`), marcar a abertura e gravar o replay; se ela recarregar no meio, aquele replay perde o começo. Quem abrir as ferramentas do navegador pode ler o `cpt` de um Filho à vista e o replay mostrado (os mesmos caminhos que a tela já mostra). O replay mostra o andar onde a perseguição começou.

### Disfarce no 3D (`disfarce3d.js`)

A Forma de Objeto e a cópia, no espírito do "Hide n' Seek" e do "Prop Hunt": o Filho que tem os botões **Forma de Objeto** e **Copiar** (características do Filho, nunca o código) vira **qualquer modelo da sala** ou **qualquer cobaia**, e **toda transformação tem um detalhe errado** que só se percebe olhando de perto e com atenção. De longe e de relance, tudo parece perfeito.

**Quem controla o Filho (Mestre ou auxiliar, no Controle do 3D).** No canto de baixo à direita aparecem **🪑 Objeto** e **🧍 Cobaia** (disfarçado: **↩ Voltar**, **🪑 Trocar** e **🧍 Cobaia**). Os botões Forma de Objeto e Copiar do quadro de habilidades e do menu ☰ abrem o mesmo modo.

1. **Virar um objeto:** no modo Disfarce, um círculo de mira aparece no meio da tela e o modelo da sala que a mira toca ganha **contorno dourado** e o nome ("Arquivo · clique para copiar"). Só entra o que dá para ser: cadeiras, mesas, monitores, computadores, arquivos, armários, estantes, macas, caixas, lixeiras, vasos, carrinhos, máquinas, quadros e relógios de parede (paredes, manchas, papéis no chão, luzes do teto e o que é grande demais ficam de fora). Um **toque** (ou clique) copia **aquele modelo exato da cena** (o mesmo item, montado igual) para a posição do Filho. A câmera sai para trás e o objeto aparece como um fantasma amarelo: **⟲ ⟳** (ou **Q/E**) giram, tocar no chão ajusta o lugar até 2,5 m do Filho (o token anda até lá pelas regras de sempre, então na perseguição gasta metros), **⬇ chão / ⬆ alto** põe em cima de algo quando o original estava numa mesa, e o detalhe errado é **🎲 Sorteio** (padrão) ou **Escolher…**. **✔ Virar** (ou Enter) confirma; **✕** (ou Esc) cancela. Quadros e relógios encostam na parede mais perto. **📋 Lista** mantém a lista antiga (cadeira, caixote, maca…). Virar faz uma animação curta: a criatura encolhe torcendo e o objeto cresce no lugar. No 3D do Mestre e de quem controla, o Filho em forma de objeto aparece só como o objeto com o anel e o nome dele; o auxiliar que não controla vê só o objeto (sem anel, sombra, nome nem seleção), e o jogador nem recebe o token.
2. **Virar uma cobaia:** a lista das cobaias e o detalhe (o da ficha, se o Mestre escolheu um; senão 🎲 Sorteio; ou Escolher…). Para os jogadores, o token vira a miniatura daquela cobaia, com nome, cor e retrato, e anda como ela. **Exigir Estudar (ficha)** vem ligado: o auxiliar só copia a cobaia já estudada (uma cena inteira como objeto na mesma sala). O Mestre vê todas, com "✔ estudada" ou "sem Estudar". No 3D do Mestre e dos auxiliares, o Filho copiando aparece como a cobaia (com o anel e a base dela), com o nome do Filho em cima.
3. **Voltar à forma:** a forma falsa se deforma (estica, treme, encolhe soltando farelos escuros) e a criatura cresce no lugar, com a animação `acao('revelar')` da forma 3D e o som de revelação (`sons-filhos.js`). O disfarce também cai sozinho quando o Filho **ataca** pelo Controle, quando a **PV da ficha ligada a ele cai** (foi acertado: o Mestre baixa a PV como sempre) e quando o Mestre toca em **💥 Revelar o disfarce** (painel do token no 3D, ou o próprio botão Forma de Objeto/Copiar de novo, no 2D e no 3D).

**O detalhe errado.** Cada aparelho calcula a **atenção** de quem olha: sobe quando a mira está no disfarce a menos de ~2,5 m por ~1,5 s, ou com a lanterna em cima (até ~4,5 m), e cai quando a pessoa se afasta ou olha para outro lado. Os detalhes crescem com ela (cor, opacidade, brilho, movimento); os de peça (uma perna a mais, uma unha) são pequenos demais para aparecer de longe. Mestre e auxiliares sempre veem os detalhes pela metade.

| Objetos (20) | Como se nota de perto |
|---|---|
| Respira | sobe e desce de leve, como um peito |
| Espelhado | letreiros, números e a etiqueta de patrimônio ao contrário |
| Um tom errado | a cor puxa para o amarelado, o verde, o azul ou o rosado, diferente das peças iguais |
| Veias num canto | um canto com textura de pele e veias finas, pulsando |
| Uma peça a mais | uma perna, roda ou puxador repetido; sem peças repetidas, um puxador onde não tem gaveta |
| Um olho por um instante | um olho abre numa fresta (ou na tela do monitor) e fecha, só para quem está reparando |
| Cabo solto | um cabo sai dele e termina no ar, com os fios de cobre à mostra |
| Não reflete a lanterna | com a lanterna em cima, a superfície fica chapada e escura |
| Vira devagar | quando você dá as costas, ele gira até ~17° para o seu lado |
| Gota escura | de tempos em tempos uma gota escorre e pinga numa pocinha |
| Quente | um vapor fino sobe dele |
| Limpo demais | novo, com brilho de verniz, num lugar sujo |
| Duplicata | igual a um objeto da sala até no arranhão (o original ganha o mesmo risco) |
| Dentes numa fresta | uma fileira de dentes pequenos numa junta |
| Fios de cabelo | fios escuros saindo de uma junta |
| Uma unha | uma unha no lugar de um parafuso |
| Úmido | brilha molhado e deixa uma poça |
| Etiqueta impossível | etiqueta de inventário com data que não existe (31/02, 32/13…) |
| Sombra errada | a sombra no chão é de um vulto de braços compridos |
| Pulsa | um calombo que pulsa como um coração |

| Cobaias (18) | Como se nota de perto |
|---|---|
| Retrato espelhado, Número FHP trocado, Anel de outro tom | os três da ficha (2D; o espelhado e o anel também no 3D) |
| Pisca fora de ritmo | um olho de cada vez, devagar demais |
| Sombra atrasada | a sombra fica para trás quando ela anda e nunca fica embaixo |
| Um dedo a mais | seis dedos numa das mãos |
| Roupa espelhada | o que é de um lado da roupa está do outro |
| Olhos de bicho | os olhos devolvem a luz da lanterna |
| Pescoço que gira demais | a cabeça acompanha você além do que um pescoço vira |
| Respira fora do ritmo | prende o ar e depois respira rápido |
| Joelhos ao contrário | ao andar, os joelhos dobram para trás |
| Pescoço comprido | um dedo mais longo |
| Sorriso que não acaba | um sorriso largo que não sai do rosto |
| Parado demais | não respira nem mexe a cabeça |
| Anda deslizando | anda quase sem mexer as pernas |
| Um pouco mais alto | uns dois dedos mais alto que a original |
| Pele de outro tom | o rosto um tom acinzentado |
| Braços compridos | as mãos ficam abaixo de onde deveriam |

O sorteio dos objetos pesa pelo modelo (o olho prefere telas, o cabo prefere aparelhos, a peça a mais prefere móveis). A cobaia de escorpião sorteia só os detalhes que não dependem de um corpo humano. No editor do Filho (aba Segredos › Filhos, aba Botões), "Detalhe da cópia" agora lista os 18; vazio é **🎲 Sorteio no 3D**.

**Jogadores (os caçadores): 🔍 Reparar.** No 3D, mirando de perto (até ~2,7 m) **qualquer** objeto da sala ou **qualquer** cobaia por 1,5 s, aparece **🔍 Reparar: <nome>** logo abaixo do meio da tela (tecla **E**, ou toque no botão; num objeto com interação própria, como um armário que abre, o E continua sendo dele e o Reparar fica no botão). É o teste do livro que já existia: **objeto** = Percepção contra a DT de Examinar a sala (a mesma publicada, `examinarDT` dos dados); **cobaia** = Desconfiar, Intuição contra a Enganação do Filho (3d20+15 nos dados). Passou num disfarce: "Esse objeto tem algo errado: …" (ou "Essa pessoa tem algo errado: …"), e o detalhe fica realçado só para aquele jogador (contorno azul e o detalhe no máximo). Passou num objeto comum: "Nada de errado com isso." Falhou: "Você não nota nada de estranho." (a ficha não pune). Sem DT nos dados, o Mestre decide. A mesma coisa só se repara de novo depois de 20 s. A rolagem vai ao Mestre em segredo e ao **Diário** (a tela do Mestre anota quem reparou em quê, o resultado e se era o disfarce; se passou num disfarce, também um alerta). Atacar um objeto ou cobaia suspeita é a ação **Atacar** de sempre (se acertar, o Mestre baixa a PV e o disfarce cai). Nada diz "é o Filho" sem o teste ou sem a revelação.

**Regras da casa (painel Filhos, aba Segredos, seção "🎭 Disfarce no 3D"):** **Exigir Estudar (ficha)** (ligada) e, desligadas por padrão: **Sinal periódico** (a cada 70 a 110 s, o mesmo ritmo em todos os aparelhos, o disfarce treme e solta um estalo e um assobio baixo, com som posicional e legenda se ligada), **Só se move quando ninguém olha** (em forma de objeto, o Filho pode andar, e o objeto vai junto, enquanto nenhuma cobaia da sala estiver olhando para ele; quem não publicou para onde olha conta como olhando) e **Trocar de objeto custa a vez** (na perseguição, virar, trocar ou copiar só na vez dele e gasta o resto do deslocamento). Desligadas, valem as regras da ficha.

**No Firebase:** `mapa/fil/ob/<k>` ganhou campos (com validação nas regras e no `recusaLocal`): `{ a, x, y, o, ts, cn?, i?, r?, h?, p?, d? }` (modelo da cena `cn`/`i`, giro em graus, altura, 1 = na parede, chave do detalhe). `mapa/cfg/disf/<k>` (só o Mestre, booleano). `filAcoes` aceita `t: reparar` com `o` (o que foi reparado: `ob:<k>`, `tk:<id>` ou `cNN:i`) e `ok`. Nos tokens dos Filhos, `cpd` passa a aceitar as chaves novas. O dono do objeto continua em `privado/filhosEstado/obj`. **Atualize as regras** com `regras-firebase.json`.

**Limites:** o detalhe é visual e público, como o resto do disfarce: quem abrir as ferramentas do navegador vê `mapa/fil/ob` (o objeto e a chave do detalhe) e, no token de um Filho copiando, `cp` e `cpd` (já era assim). A atenção e os realces são calculados em cada aparelho; um jogador com a câmera longe de verdade não vê nada mesmo que o colega veja. As animações de virar e de quebrar aparecem para quem tem aquela sala carregada no 3D; quem chega depois só vê o resultado. Os detalhes de movimento (respira, vira, cabeça, joelhos) não aparecem numa foto parada. A tela do Mestre precisa estar aberta para desfazer o disfarce no ataque e na PV caindo, para anotar o Reparar no Diário e para levar o objeto junto quando o Filho anda. Modelos da cena dependem do arquivo de cenas importado; sem ele, só a lista antiga.

### Protocolo no 3D

Quando o Protocolo Filho da O.R.F.E.U. começa: faixa vermelha no topo, todas as luzes ficam vermelhas e pulsando, a tela puxa para o vermelho e toca uma **sirene**. Os Filhos que o Mestre (ou o auxiliar) revela aparecem com as formas escolhidas.

### Na tela 3D: jogando como num jogo

**Câmeras (barra de baixo):**

| Botão | O que faz |
|---|---|
| 🎮 **Jogo** | **Primeira pessoa**: você é o personagem (balanço dos passos, respiração, Q olha para trás). É o modo que abre por padrão para quem controla um token. Quem preferir a câmera atrás do ombro liga a terceira pessoa em ⚙ Opções › Câmera e mouse |
| 👁 **Olhos** | Primeira pessoa sem token (câmera livre do Mestre e dos auxiliares). Com o Jogo em primeira pessoa, o botão some para quem controla um token |
| 🏠 **Fora** | Casa de bonecas: as paredes do lado da câmera somem |
| ⬇ **Cima** | Vista do teto |
| 🔦 **Luz** | Lanterna |
| 🏢 **Andar/Sala** | Alterna a sala e o andar inteiro |

**Computador (modos Jogo e Olhos):** clique na tela para prender o mouse; aí o mouse gira a câmera e a mira (ponto no centro) mostra para onde você olha. Clique com o mouse preso usa o que está na mira (terminal, Maurício, geladeira, porta) ou interage com o que estiver perto. **Esc** primeiro solta o mouse; um segundo Esc fecha menu, gaveta ou a vista. Roda do mouse aproxima e afasta.

**Teclas (padrão; todas trocáveis em ⚙ Opções › Controles):**

| Tecla | Ação |
|---|---|
| WASD / setas | Andar (setas sempre andam) |
| Shift (segurar) | Correr |
| Q (segurar) | Olhar para trás |
| E | Interagir (porta, botão, esconderijo, loja, terminal, arquivo, comida, água, item, documento) |
| **T** | **Chat de texto** (Enter também abre, sempre) |
| Tab | Abre e fecha a gaveta 🗂 com o painel completo |
| M | Menu ☰ |
| O | Opções |
| C | Troca a câmera (Jogo → Fora → Cima) |
| Z | Sala / andar inteiro |
| H | Esconde a interface (só o mundo; Esc ou H de novo mostra) |
| F | Fichas |
| B | Quadro da equipe |
| R | Dados |
| I | Mochila (inventário da ficha ativa) |
| K | Arquivo · Cifras · Terminal |
| N | Narrador (Mestre) |
| L | Lanterna |
| 1 a 9 | Habilidades do Filho no Controle (Mestre e auxiliares) |
| V | Visão da criatura: ver pelos olhos do Filho no Controle (Mestre e auxiliares) |
| Esc | Solta o mouse; depois fecha menu, gaveta, painéis e a vista |

### Opções (⚙, tecla O), como num jogo

Tudo fica salvo neste aparelho (`acf-s3d-cfg`).

- **Gráficos:** predefinição (Alta ou Leve), escala de resolução (50% a 150%), sombras da lanterna, brilho das luzes (bloom), aberração cromática, grão de filme, vinheta, névoa (leve, normal, densa, muito densa), poeira no ar (e na luz da lanterna), fumaça e névoa baixa que se movem, câmeras de segurança nos monitores, limite de quadros (sem limite, 60, 30) e contador de quadros por segundo. As marcadas com ↻ reabrem o 3D na hora. Embaixo, **Qualidade automática** (ligada por padrão) e em que degrau ela está agora.
- **Câmera e mouse:** Jogo em terceira pessoa (desligado = primeira pessoa), campo de visão, balanço da câmera, sensibilidade do mouse e do toque, inverter o eixo vertical, nomes em cima dos personagens e, na perseguição, a câmera que mostra quem está na vez.
- **Controles:** clique na tecla de uma ação e aperte a nova. Vale também botão do meio, direito ou lateral do mouse. Se a tecla já era de outra ação, as duas trocam. **Restaurar as teclas padrão** desfaz tudo.
- **Áudio e chat:** volume do ambiente e dos passos, volume das vozes, balões de fala, a voz do seu personagem e os dados 3D. Embaixo, **Coração e respiração do meu personagem** (jogador) e **Vibração do celular** (ligadas por padrão).
- Em **Controles**, o jogador tem **Rever o tutorial do 3D**. No menu ☰, **📷 Fotos da sessão** abre a galeria deste aparelho.

Com qualquer janela do site aberta por cima do 3D (ficha, chat, arquivo, loja), as teclas vão para ela, não para o jogo.

**Celular:** joystick no canto esquerdo anda; arrastar a tela olha em volta; pinça aproxima. No celular a gaveta abre como uma folha que sobe de baixo (82% da tela) e esconde joystick e barra enquanto está aberta. Toque no objeto (ou no aviso "E · …" que aparece embaixo) para usar.

**Topo da tela:** ☰ Menu · 💬 Chat · 🗂 Gaveta · 🎛 Controles (Mestre e auxiliares) · 👁 Visão da criatura (no Controle de um Filho) · ⚙ Opções · ✕ Sair.

### Tudo do site dentro do 3D

O 3D não tem um painel paralelo: a gaveta 🗂 recebe o **painel verdadeiro do site** (o mesmo `#painel` e o cartão da sala), e ele volta para o lugar quando a vista fecha. Por isso qualquer função nova do painel já funciona no 3D sem retrabalho. Dados, avisos e o "Sua vez" também aparecem por cima do 3D, e todas as janelas do site (fichas, quadro, arquivo, loja, chat, diálogos) abrem por cima da cena.

**Menu ☰ por perfil:**

- **Jogador:** Minha cobaia (gaveta), Fichas, Dados, Chat, Arquivo · Cifras · Terminal, Loja do Maurício, Quadro, Caderno, Som, Opções, Ajuda, Sair.
- **Mestre auxiliar:** Painel, Controles do 3D, **Meu robô aqui**, Fichas, Ameaças e Filhos, Dados, Chat, Arquivo, Quadro, Escudo, Som, Opções, Ajuda, Sair.
- **Mestre:** a gaveta vira o **Painel do Mestre** (as mesmas abas da tela 2D, com as notas e a membrana da sala) e o menu traz Controles do 3D, Fichas, Dados, Chat, Arquivo, Loja (Mestre), Quadro, Escudo, Som, Opções, Ajuda, Sair.
- Regras, Hall da Caixa, Parede de Desejos e Cor da cobaia entram no menu quando o botão correspondente existe no painel daquele perfil.

### Robôs S.T.A.F.F. dos auxiliares

Cada auxiliar com perfil de robô (C2P0, B00BIES, M3RL1N, K4ISER) coloca o próprio robô no mapa:

- **No 2D:** painel do auxiliar → **🤖 Colocar meu robô no mapa** (entra na Zona Neutra do andar que está na tela).
- **No 3D:** menu ☰ → **Meu robô aqui** (entra num ponto livre perto da câmera) e a vista passa a controlar o robô no modo Jogo.
- **Como funciona:** o auxiliar grava o robô escondido em `privado/tokens`; a tela do Mestre confirma e publica no mapa (com aviso no chat "🤖 … entrou no Nº andar"). **A tela do Mestre precisa estar aberta** para o robô aparecer. Se o robô já está no mapa, o botão leva o robô até o ponto, desde que seja o mesmo andar. Trocar o robô de andar continua sendo com o Mestre (elevador).

### Desempenho

O Three.js (cdnjs, r128) só baixa na primeira abertura. No andar inteiro, só os móveis da sala atual (e vizinhas, para o Mestre) ficam carregados; as luzes são um conjunto fixo (6 no celular, 10 no computador) que copia as mais próximas.

A **qualidade automática** (`imersao.js`) cuida do resto: veja abaixo.

### Imersão automática (`imersao.js`)

Tudo aqui roda sozinho, sem nenhum botão para o Mestre apertar na mesa. Cada coisa tem no máximo uma opção para ligar e desligar, salva neste aparelho junto com as outras Opções do 3D.

**1. Qualidade automática do 3D** (⚙ Opções › Gráficos › Qualidade automática, ligada). O 3D mede os quadros por segundo. Se ficar abaixo de ~26 (ou de 80% do limite escolhido) por 4 segundos, desce um degrau; se sobrar folga (92% do limite) por 15 segundos seguidos, sobe um. Se cair de novo logo depois de subir, espera o dobro antes de tentar outra vez (até 4 minutos), para não ficar indo e voltando. Degraus: 0 tudo ligado; 1 resolução 85%; 2 sem poeira no ar e sem fumaça baixa; 3 resolução 72% e câmeras de segurança leves; 4 sem câmeras de segurança e sem sombra da lanterna; 5 resolução 60% e menos luzes no conjunto (60% das mais próximas). O aparelho lembra o degrau por 3 dias e começa nele da próxima vez. **O que o jogador escolheu à mão manda:** a escala de resolução, a poeira, a fumaça, as sombras e as câmeras só mudam sozinhas se estiverem no padrão (100%, ligada, Automático). Na primeira vez que baixa, aparece um aviso discreto. A aba Gráficos mostra o degrau atual e os quadros por segundo.

**2. Coração e respiração do personagem** (só o jogador ouve; Opções › Áudio › Coração e respiração). Um batimento grave aparece quando há perigo e acelera com ele (de ~62 a ~160 por minuto): PV abaixo de 60% (vitais publicadas pela ficha ativa), um Filho à vista a menos de 12 m de regra, um eco de som de Filho perto, a perseguição em que a cobaia participa e um susto recente. Sem perigo, silêncio. Com a opção ligada, é ele que faz a batida da perseguição (no lugar da batida fixa do `momento.js`, que volta se a opção for desligada). **Ofegante:** depois de correr mais de ~1 s no 3D (Shift ou o joystick no fim) e ao fim de uma perseguição de que participou, alguns segundos de respiração pesada que vai acalmando. Tudo gerado na hora (WebAudio), respeitando o mudo do site, o "Som do 3D" e o volume do ambiente; só toca depois do primeiro toque na página.

**3. Vibração do celular** (Opções › Áudio › Vibração do celular). Vibra no dano ao próprio personagem (mais forte se perder 25% dos PV de uma vez; trocar de ficha não conta), no susto que só ele vê, no Encontro confirmado e no "o chão treme" (os dois últimos já existiam e agora obedecem a mesma opção, como todas as vibrações do site). Onde o navegador não vibra (iPhone, computador), nada acontece.

**4. Ambiente que reage.** Quando um Filho passa perto, as luzes da sala piscam, as lâmpadas e telas falham, monitores, TVs, telões e terminais (peças de tela e interações "ligar" e "vídeo") chiam com cor e brilho tremendo, o telão do YouTube ganha chiado e toca um zumbido elétrico curto vindo de onde ele está. Na tela do Mestre e dos auxiliares, vale a posição real de cada Filho que anda no andar aberto; nos jogadores, só os ecos de som que o `momento.js` já publica (`ecos3d`, posição aproximada, sem dizer quem; "passos silenciosos" continuam calando). Só efeito local no 3D: nada é gravado.

**5. Marcas que ficam.** A tela do Mestre grava em `mapa/marcas` (sem dizer quem): **garras** onde um Filho atacou pelo Controle (apontando para a cobaia mais perto; perto de uma parede, também na parede) e **rastro** a cada ~2 m de regra que um Filho à vista anda durante a perseguição. No 3D de todos viram decalques no chão (arranhões, manchas arrastadas). O "Nova cena" do Mestre apaga tudo; no máximo 80 marcas (as mais velhas saem).

**6. Backup automático** (aba Segredos › Backup). A tela do Mestre guarda a cada 15 minutos o mesmo pacote do "Baixar backup" (mapa, segredos, privado e Calculadora de NEX), só se algo mudou, no servidor em `segredosBk` (só o Mestre lê), e mantém os 6 últimos. O primeiro sai até 15 minutos depois de abrir a tela (ou 1 minuto, se o último for mais velho que isso). **Voltar a um backup automático…** lista os guardados (data, hora, dia na Caixa, tokens, tamanho), com **Voltar** em cada um (pede confirmação; o diário atual é mantido) e **Guardar um agora**. Sem Firebase (modo local), ficam no navegador e cabem menos.

**7. Resumo automático da sessão** (aba Mesa › Resumo automático da sessão). Quando o Encerramento exibido para todos termina (ou é parado) na tela do Mestre, abre sozinho um relatório para revisar e editar: salas visitadas (no total e por cobaia), encontros (e falsos alarmes), perseguições, quem quase morreu (caiu em Morrendo, morreu, enlouqueceu ou chegou a 25% dos PV ou menos), corpos, itens achados (as mensagens "pegou" e "vestiu" do chat), interações curiosas no 3D (o que foi tocado, ligado, lido, jogado, aberto quando era cofre, gaveta ou armário, com quem e onde), pistas, sustos e marcas. Vem do que o site já registra: Diário, Relatório da Mesa, chat Geral e `mapa/inter`. A sessão vai da Abertura (ou da última "Nova sessão" do Diário) até o Encerramento. **O texto não cita Filhos nem nomes de salas não reveladas.** Botões: **Copiar para o grupo**, **Mandar no chat Geral** (em mensagens de até 480 caracteres) e **Baixar .txt**. O botão **📝 Ver o resumo desta sessão** monta de novo a qualquer hora.

**8. Tutorial da primeira vez no 3D** (jogador). Seis cartões curtos, 5 segundos cada (andar, olhar, usar com E, mochila com I, lanterna, menu), com o texto do celular ou do computador e as teclas que o jogador escolheu; **Pular** ou **Próximo**. Uma vez por aparelho; **Rever o tutorial do 3D** fica em Opções › Controles.

**9. Modo foto** (jogador, auxiliar e Mestre). O botão 📷 no topo do 3D (no celular estreito, flutuando na borda direita) tira uma foto da vista, sem a interface, os nomes e o anel da vez, na resolução cheia do aparelho (mesmo com a qualidade automática baixa), com clarão e som de obturador. Uma prévia aparece por alguns segundos com **⬇** e **Galeria**. As fotos ficam só neste aparelho (IndexedDB, até 60), agrupadas por sessão em ☰ › **📷 Fotos da sessão**, com **⬇ Baixar** e apagar. Se a ficha ativa tem câmera ou celular e um Filho "só por uma lente" está à frente, na mesma sala, a foto dispara o **mesmo Flash** do botão ⚡ (1 por cena, mesma regra).

**No Firebase (novos):** `mapa/marcas/<k>` = `{a, x, y, t: g|r, r, ts, c}` (todos leem; só o Mestre grava, com validação) e `segredosBk/idx/<k>` = `{ts, n, kb, dia}` + `segredosBk/d/<k>` = o pacote em texto (só o Mestre lê e grava). **Atualize as regras** com `regras-firebase.json`.

**Limites:** a qualidade automática mede o desempenho do 3D, não a bateria nem o calor do aparelho; trocar sombras e luzes recompila os materiais uma vez (um pequeno tranco). O coração, a respiração e a vibração dependem do navegador (som só depois de um toque; vibração só no Android). O ambiente e as marcas são pistas visuais: quem abrir as ferramentas do navegador pode ler `mapa/marcas` (posições, sem nome), como os `ecos3d`. As marcas, o backup automático e o resumo precisam da tela do Mestre aberta. As fotos não saem deste aparelho (limpar os dados do site apaga a galeria).

### Formato do `salas-3d.json`

`{"tipo":"planta-acf-3d","versao":2,"salas":{"c4":{piso,parede,teto,amb,nevoa,som,itens:[{t:"cadeira_dentista",x,z,r,esc,v}]}},"formas":{"f04":"colosso"}}`

- Medidas em metros. Com `"lado":10`, a sala vai de −4,9 a 4,9 em x (oeste → leste) e em z (norte → sul); pé-direito 3,2 m. A sala do 3D tem 20 m: cenas com `lado` 10 (ou sem `lado`, formato antigo de 7,07 m) são só espalhadas (ficam ralas); uma cena feita já com `"lado":20` (de −9,9 a 9,9, pé-direito 4 m) entra como está. O arquivo desta versão traz as 125 salas com `"lado":20`.
- Os vãos das portas ficam no meio de cada parede (2,4 m de largura). Deixe esses trechos livres.
- `uso`: `loja` (Maurício), `agua` ou `comida` (despensa).
- `imagens`: imagens embutidas na cena (`{"mae":"data:image/jpeg;base64,…"}`), usadas por quadros com `img:"mae"`. Como ficam dentro do arquivo de cenas, não vão para o GitHub.
- `esc`: nome do esconderijo. `v`: versão da sala onde o item aparece (`neutro`, `rei`, `mae`, `consagrado`).
- `narrativa`: `{"c13":{"nome":…,"el":…,"ler":"texto para ler à mesa","mesa":"nota do Mestre"}}`. Ao importar, vai para `segredos/_narrativa` (só o Mestre lê) e alimenta o Narrador.
- Som gerado pelo navegador, sem arquivos: zumbido, fluor, freezer, ventilacao, vapor, gotas, coracao, bip, estatica, vela, maquinas, neutra, eco, relogio, geiger, grilos, vento, mar, alarme_baixo, respiracao, coro.

### Modelos 3D próprios (opcional)

Para trocar uma miniatura por um modelo feito em outra ferramenta, crie a pasta `modelos/` com:

- `modelos/modelos.json`: `{"faca":{"arquivo":"faca.glb","altura":1.6,"rot":0}}` (a chave é o id do token);
- `modelos/faca.glb`: o modelo. Se tiver animações chamadas `idle` e `walk`, o site usa as duas.

Sem a pasta, o site usa as miniaturas desenhadas por código. **Atenção:** o que estiver em `modelos/` fica público no GitHub.

## Névoa de guerra e molduras dos tokens (`nevoa.js`)

- **Névoa:** o Mestre liga ou desliga por andar no cartão de qualquer sala ("🌫 Névoa de guerra"). Com ela ligada, cada jogador vê claras só as salas por onde a cobaia dele já passou e a sala onde ela está; as outras ficam escuras, sem nome, e os tokens dentro delas somem da tela dele (o cartão da sala também não diz quem está lá).
- **Visitas:** a tela do Mestre anota em `mapa/visitas/<token>/cNN`; o aparelho do jogador também guarda as próprias visitas. "Limpar névoa" faz todos esquecerem as visitas daquele andar.
- **Quem vê tudo:** Mestre e auxiliares. A tela da mesa (`?tv`) e quem entra sem cobaia veem a soma das visitas de todas as cobaias.
- **Limite:** é um véu na tela. As posições continuam no mapa público do Firebase.
- **Molduras:** os tokens ganham um aro na cor de cada um, com fio dourado e brilho. Liga e desliga em ⚙ Aparência ("Molduras nos tokens"), só neste aparelho. Os Filhos mantêm a borda tracejada.

## Perfis

Ao abrir o site, a pessoa escolhe **Jogador**, **Mestre Auxiliar** ou **Mestre**. O Mestre Auxiliar entra com a senha dos auxiliares (com Firebase, é a senha da conta `auxiliares@caixa-acf.com`), escolhe o próprio robô e move os Filhos e o seu robô; ele não vê as cobaias, só os sons das salas, até o Mestre revelar. O jogador escolhe a própria cobaia e só consegue arrastar essa ficha. O Mestre entra com senha e move tudo. A escolha fica salva no navegador; o botão no topo ("trocar") volta para a tela de escolha.

**Senha uma vez só.** "Trocar" não desconecta mais. Com a conta do Mestre conectada, Mestre e Mestre Auxiliar entram direto, sem senha (a conta do Mestre pode tudo o que o auxiliar pode). Com a conta dos auxiliares, o modo auxiliar entra direto e o Mestre pede a senha dele uma vez. A tela de escolha mostra qual conta está conectada e tem o botão **Sair da conta**; o botão "Sair da conta do Mestre" no painel faz o mesmo. Escolher **Jogador** sai da conta (o jogador grava com login anônimo), então voltar a Mestre pede a senha de novo.

Cada aba guarda o próprio perfil e o próprio login. Dá para testar Mestre, auxiliar e jogador em abas do mesmo navegador. Recarregar a página mantém o login; abrir uma aba nova pede a senha uma vez.

**O que o Mestre divide com os auxiliares** (aparecem no painel do auxiliar): Cena e Escudo (Nova cena e Escudo do Mestre), Ameaças (as divididas na aba "Ameaças e Filhos"), Membrana (ajustar pelo cartão da sala e restaurar pelo bloco; as quedas automáticas continuam pela tela do Mestre), Calculadora de NEX (o histórico mora em `nexCalc`, que Mestre e auxiliares leem e gravam; o que o auxiliar aplica entra no Relatório pela tela do Mestre e dispara os alertas de marco) e Parede de Desejos (despertar, desejar por qualquer cobaia, ver os desejos e marcar como cobrado). As sugestões automáticas de NEX continuam só na tela do Mestre, para ninguém aplicar a mesma sugestão duas vezes.

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

As regras completas e atualizadas (incluindo `mapa/fil`, `privado/filhosEstado`, `filAcoes`, `filResp`, `filMsg` e `leituras` das características dos Filhos, e `mapa/encontro`, `mapa/cameras`, `mapa/corpos`, `mapa/pilhas`, `ecos3d` e `sustos` do `momento.js`) ficam no arquivo `regras-firebase.json`, fora do repositório; o bloco acima é o resumo antigo.

Com isso: todo mundo vê o mapa público; Filhos, NPCs e robôs ocultos, nomes secretos das salas e o canal Filhos só chegam ao Mestre e à conta dos auxiliares; funções, anotações, diário e Balança só ao Mestre; os jogadores só movem a própria cobaia.

---

Desenvolvido por Rodrigo Terroso Junior. O Claude, da Anthropic, foi usado como ferramenta durante o desenvolvimento.
