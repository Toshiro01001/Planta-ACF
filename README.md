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
| `sala3d.js`, `objetos3d.js`, `detalhes3d.js`, `tokens3d.js` | A vista 3D (ver "Duas maneiras de jogar") |
| `nevoa.js` | Névoa de guerra e molduras dos tokens |
| `img/` | Retratos das cobaias, o ícone da aba e o fundo da Parede de Desejos (`parede.jpg`, `eco-sigilo.svg`) |

## Publicar no GitHub Pages

1. Crie um repositório público (ex.: `Planta-ACF`).
2. **Add file › Upload files** e arraste os arquivos soltos e a pasta `img`. O `index.html` precisa ficar na raiz.
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

## HUD limpo (todos os perfis)

- **Visual limpo por padrão** em todos os aparelhos. No ⚙ do painel dá para voltar ao **Visual clássico** neste aparelho (fica no navegador).
- **Topo:** botões discretos; abaixo de 1180 px só os ícones (📋 Fichas, 🖍 Quadro, 💬 Chat); o botão do perfil mostra só o nome (▾ troca de perfil). No celular estreito o 🔊 Som (e, abaixo de 380 px, o ? Ajuda) passa para o ⚙ do painel.
- **Câmera:** à vista só **+**, **−**, **◎** centralizar (e **◉** ir até a minha cobaia, para o jogador); o **⋯** abre girar, ISO, TOPO, mover e régua (e lembra se ficou aberto).
- **Retratos:** cartões compactos com a foto no anel da cor da cobaia, nome e PV; a mancha de sangue só aparece em quem está Morrendo. O Mestre vê uma coluna estreita só com foto e PV (nome ao passar o mouse); no celular, uma fileira pequena.
- **Dados:** botão redondo 🎲 no celular. A dica de como mexer no mapa só aparece nas 3 primeiras visitas.
- **Painel:** títulos mais leves; para o jogador, os atalhos da cobaia (Loja, Arquivo, Regras, Hall, Parede, Cor) em grade de duas colunas. No alto do painel: **Procurar ferramenta…** (Mestre e auxiliares; procura pelo título do bloco em todas as abas e, se nenhum título bater, pelo conteúdo), **⊟ recolher tudo**, **⊞ abrir tudo** e **⚙**. A **★** no título de um bloco o leva para o topo do painel (favoritos por aparelho).

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
- **Tela da mesa:** `…/Planta-ACF/?tv=1` mostra só o mapa, com a visão dos jogadores, para uma TV.

## Loja do Maurício

- Os jogadores abrem pelo botão **🛒 Loja do Maurício** no painel ("Sua cobaia"). Cada venda mostra imagem, custo em Sucatas Maiores e Menores, opções com dano e crítico, e o botão **Pedir**.
- O pedido chega no Sussurro do Mestre ("🛒 Pedido ao Maurício: Pistola…"). Por padrão o Maurício só atende quem está na Zona Neutra, e a loja pode ser fechada (aba Sessão).
- O catálogo inicial é o do PDF "Itens do Maurício" (`data.js`, imagens direto na pasta `img/`). O Mestre abre a loja pela aba Sessão para **criar vendas novas** (nome, custo, opções "nome ; dano ; crítico", descrição, imagem), editar, ocultar ou apagar. Venda oculta só aparece quando ele mostrar.
- As sucatas de cada cobaia ficam na ficha resumida (o Mestre preenche); o jogador vê as dele na loja.

## Restaurar o site (aba Segredos → Backup)

"🧹 Restaurar o site…" apaga o que foi feito nos testes. Você marca o que zerar: **Mapa e jogo**, **Conversas e respostas** e **Registros** vêm marcados; o que você preparou (regras restritas, Arquivo, Salas de Exposição, conquistas criadas, sons, loja, quadros, gatilhos, senhas, funções e nomes secretos das salas, Hall) vem desmarcado. As **fichas dos jogadores ficam de fora** (o Mestre não altera fichas; a lista mostra quais existem no servidor). Antes de apagar, o site baixa `backup-antes-de-restaurar-….json`; o "Restaurar backup…" devolve tudo, inclusive chat e relatório. Para confirmar, digite RESTAURAR. Com "Aparelhos de todos", cada celular e computador, ao abrir o site, apaga as visões recebidas, votos, respostas, telas já vistas, avisos e cofres abertos (o Caderno e as fichas ficam); com "Andares liberados", os jogadores digitam a senha dos andares de novo. Em `mapa/restauracao`.

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

- **Perseguição (SaH p. 90 e 91):** o Mestre marca quem é presa e quem é caçador (cobaias e NPCs), a DT pela velocidade do adversário (15, 20, 25 ou 30), o tamanho (curta 2/2, padrão 3/3, longa 5/3, caçada 7/3) e a perícia (Atletismo, Pilotagem ou Adestramento). Cada rodada pode ter evento da Tabela 2.3 (obstáculo ou atalho), sorteado ou escolhido. Na tela do jogador aparece a faixa da perseguição e "Agir nesta rodada": ele escolhe a ação (correr, cortar caminho, esforço extra, criar obstáculo, despistar, sacrifício, atrapalhar ou outra perícia), rola com a ficha ativa e manda. O placar de sucessos e falhas de cada um sobe sozinho; o esforço extra tira os PV na ficha; sacrifício dá +O aos aliados; criar obstáculo baixa a DT da rodada. NPCs rolam pelo botão do Mestre. Em `mapa/persSaH`, respostas em `mesaResp`.
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
| `andares3d.js` | Objetos próprios dos andares 2 a 5 (máquinas, relíquias, crescimentos de carne…), no mesmo estilo do `detalhes3d.js` |
| `vozes.js` | Vozes das mensagens do chat no 3D, geradas na hora (sem arquivos de áudio) |
| `dados3d.js` | Dados 3D com física (d4, d6, d8, d10, d12, d20) na tela de quem rolou; a física vem do cannon.js (jsDelivr), baixado só na primeira rolagem |
| `salas-3d.json` | O que existe em cada uma das 125 salas. **Fica fora do GitHub.** O Mestre importa pelo cartão de qualquer sala |
| `modelos/` (opcional) | Modelos 3D em `.glb` que substituem as miniaturas desenhadas por código |

### Regras do mapa valem no 3D

- **Tamanho no 3D:** a sala tem **20 m de lado** e 3,2 m de pé-direito; o corredor tem 14 m de comprimento e 2,4 m de largura. As cenas feitas para salas menores se espalham sozinhas (o que está na parede continua na parede) e cada sala grande ganha, sorteado pela CN e igual para todos, mais móveis de parede (armários, estantes, arquivos, caixotes), até dois esconderijos novos, papéis, sangue e manchas. Os vãos das portas ficam sempre livres.
- **Mobília da própria sala:** além disso, cada sala grande copia os móveis que a cena já tem (carteiras na sala de aula, macas e armários no hospital, estantes no arquivo, cadeiras, bancadas, quadros e cartazes nas paredes…) para os espaços vazios, com os mesmos esconderijos (até 3 a mais por sala). Uma cópia só entra se ainda der para andar de qualquer porta a qualquer outra (o site confere numa grade de 25 cm) e se a sala continuar com pelo menos metade do chão livre. Também é sorteado pela CN: todos veem a mesma sala.
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
- **Só no 3D:** funciona igual. O Mestre conduz pela gaveta 🗂 (Painel do Mestre, bloco Perseguição: pedir iniciativa, iniciar, próxima vez, refazer rota, cronômetro); os jogadores rolam a iniciativa pelo pedido que abre na tela (os dados 3D rolam junto); os Filhos andam pelo Mestre ou pelo auxiliar (🎛 → controlar o token), com as mesmas regras, a menos que o Mestre ligue o movimento livre.
- **Cuidado:** no 3D o jogador só enxerga a própria sala. Para ter a visão do andar inteiro durante a fuga, o Mestre pode deixar o 2.5D aberto em outra aba ou usar o botão 🏢 Andar.

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
| I | Arquivo · Cifras · Terminal |
| L | Lanterna |
| 1 a 9 | Habilidades do Filho no Controle (Mestre e auxiliares) |
| Esc | Solta o mouse; depois fecha menu, gaveta, painéis e a vista |

### Opções (⚙, tecla O), como num jogo

Tudo fica salvo neste aparelho (`acf-s3d-cfg`).

- **Gráficos:** predefinição (Alta ou Leve), escala de resolução (50% a 150%), sombras da lanterna, brilho das luzes (bloom), aberração cromática, grão de filme, vinheta, névoa (leve, normal, densa, muito densa), poeira no ar, limite de quadros (sem limite, 60, 30) e contador de quadros por segundo. As marcadas com ↻ reabrem o 3D na hora.
- **Câmera e mouse:** Jogo em terceira pessoa (desligado = primeira pessoa), campo de visão, balanço da câmera, sensibilidade do mouse e do toque, inverter o eixo vertical, nomes em cima dos personagens.
- **Controles:** clique na tecla de uma ação e aperte a nova. Vale também botão do meio, direito ou lateral do mouse. Se a tecla já era de outra ação, as duas trocam. **Restaurar as teclas padrão** desfaz tudo.
- **Áudio e chat:** volume do ambiente e dos passos, volume das vozes, balões de fala, a voz do seu personagem e os dados 3D.

Com qualquer janela do site aberta por cima do 3D (ficha, chat, arquivo, loja), as teclas vão para ela, não para o jogo.

**Celular:** joystick no canto esquerdo anda; arrastar a tela olha em volta; pinça aproxima. No celular a gaveta abre como uma folha que sobe de baixo (82% da tela) e esconde joystick e barra enquanto está aberta. Toque no objeto (ou no aviso "E · …" que aparece embaixo) para usar.

**Topo da tela:** ☰ Menu · 💬 Chat · 🗂 Gaveta · 🎛 Controles (Mestre e auxiliares) · ⚙ Opções · ✕ Sair.

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

### Formato do `salas-3d.json`

`{"tipo":"planta-acf-3d","versao":2,"salas":{"c4":{piso,parede,teto,amb,nevoa,som,itens:[{t:"cadeira_dentista",x,z,r,esc,v}]}},"formas":{"f04":"colosso"}}`

- Medidas em metros. Com `"lado":10`, a sala vai de −4,9 a 4,9 em x (oeste → leste) e em z (norte → sul); pé-direito 3,2 m. A sala do 3D tem 20 m: cenas com `lado` 10 (ou sem `lado`, formato antigo de 7,07 m) são espalhadas sozinhas e ganham o enchimento sorteado; uma cena feita já com `"lado":20` (de −9,9 a 9,9) entra como está, sem enchimento.
- Os vãos das portas ficam no meio de cada parede (2,4 m de largura). Deixe esses trechos livres.
- `uso`: `loja` (Maurício), `agua` ou `comida` (despensa).
- `imagens`: imagens embutidas na cena (`{"mae":"data:image/jpeg;base64,…"}`), usadas por quadros com `img:"mae"`. Como ficam dentro do arquivo de cenas, não vão para o GitHub.
- `esc`: nome do esconderijo. `v`: versão da sala onde o item aparece (`neutro`, `rei`, `mae`, `consagrado`).
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

Com isso: todo mundo vê o mapa público; Filhos, NPCs e robôs ocultos, nomes secretos das salas e o canal Filhos só chegam ao Mestre e à conta dos auxiliares; funções, anotações, diário e Balança só ao Mestre; os jogadores só movem a própria cobaia.
