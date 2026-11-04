# Planta da Caixa

Site em GitHub Pages da campanha de RPG A Caixa de Fósforos (Ordem Paranormal): mapa 2.5D e vista 3D dos andares, tokens, fichas e ferramentas de mesa, com sincronização por Firebase.

## Como este projeto funciona

- HTML, CSS e JavaScript em arquivos soltos na raiz, sem etapa de build. Publica a partir do `main`, pasta raiz.
- Leia o `README.md` antes de mexer: ele descreve cada arquivo, as regras e os formatos de dados.
- O conteúdo editável fica em `data.js`. A conexão com o Firebase fica em `config.js`.
- Os arquivos em `index.html` usam `?v=` para furar o cache. Atualize esse valor nos arquivos alterados.
- Se uma função usar um caminho novo do banco, avise que as regras do Firebase precisam ser atualizadas.
- Segredos da campanha não ficam no código: moram no servidor ou no navegador do Mestre. Não traga esse conteúdo para o repositório.
- Considere sempre a otimização de desempenho em toda ideia ou alteração.

## Regras de trabalho

- Responda em português do Brasil, sem travessões, e chame o dono de Rodrigo Jr.
- Altere só o que foi pedido. Publicar ou fazer merge no `main` depende de pedido dele.
- Toda função criada ou alterada precisa funcionar também no celular. Teste a versão mobile, não só a de computador.
- Ao criar ou alterar o site, explique como ele funciona.
- Ao terminar uma alteração, entregue a mensagem de commit em dois blocos rotulados: "Título" (até 50 caracteres) e "Descrição" (estendida, com exatamente o que foi feito).
- Entregue arquivos soltos, nunca em `.zip`.
- O repositório é público: não coloque senhas, chaves secretas nem dados pessoais em arquivos versionados.
