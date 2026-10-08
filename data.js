/* =========================================================
   A CAIXA DE FÓSFOROS · PLANTA DO COMPLEXO
   data.js · tudo o que aparece no mapa mora aqui.
   Para trocar um nome de sala ou de criatura, edite este arquivo.
   ========================================================= */

/* Ordem das 25 salas na planta (espiral, igual ao tabuleiro físico).
   Cada linha é uma fileira do mapa, de cima para baixo.
   O número é a posição da sala dentro do andar (1 a 25).
   A sala 25 fica no centro e é sempre a Zona Neutra. */
const LAYOUT = [
  [ 1,  2,  3,  4,  5],
  [16, 17, 18, 19,  6],
  [15, 24, 25, 20,  7],
  [14, 23, 22, 21,  8],
  [13, 12, 11, 10,  9],
];

/* Elementos: S Sangue, M Morte, C Conhecimento, E Energia,
   F Medo, ? ainda não registrado.
   A Zona Neutra (sala 25 de cada andar) é de Medo por padrão. */
const ELEMENTOS = {
  S: { nome: 'Sangue',        cor: '#b3262e' },
  M: { nome: 'Morte',         cor: '#4a4a4a' },
  C: { nome: 'Conhecimento',  cor: '#c99a1a' },
  E: { nome: 'Energia',       cor: '#8a3fd1' },
  F: { nome: 'Medo',          cor: '#e9e4f2' },
  N: { nome: 'Zona Neutra',   cor: '#2f6f6a' },
  '?': { nome: 'Não registrado', cor: '#33303a' },
};

/* Os 5 andares. As salas de cada andar seguem a numeração CN:
   1º andar CN 01 a 25 · 2º andar CN 26 a 50 · 3º CN 51 a 75 · 4º CN 76 a 100 · 5º CN 101 a 125.
   "salas" usa o número CN como chave: [nome, elemento].
   Sala sem nome aparece só com o número CN.
   "saida" é o número CN da sala que leva ao elevador/porta para o próximo andar.
   Sala na borda da planta: o elevador aparece como um corredor saindo para fora.
   Sala de dentro da planta: o elevador aparece como um poço no chão da sala. */
const ANDARES = [
  {
    id: 1, titulo: '1º Andar', subtitulo: 'Hospital e laboratório',
    saida: 11,
    salas: {
      1:  ['Loja de Conveniência 24hrs', 'M'],
      2:  ['Sala de Dados Criptografados', 'C'],
      3:  ['Sala de Alta Voltagem', 'E'],
      4:  ['Consultório Odontológico Anos 2000', 'M'],
      5:  ['Laboratório de Computação Analítica', 'C'],
      6:  ['Sala de Transfusão Experimental', 'S'],
      7:  ['Sala de Ventiladores Industriais', 'E'],
      8:  ['Depósito Estrutural da ORFEU', 'C'],
      9:  ['Câmara de Vapor Metálico', 'S'],
      10: ['Quarto de Turbinas de Ar', 'E'],
      11: ['Sala de Aula Congelada no Tempo', 'M'],
      12: ['Laboratório de Fonética e Linguagens', 'C'],
      13: ['Sala Hemodinâmica', 'S'],
      14: ['Câmara de Pressão Mecânica', 'E'],
      15: ['Escritório Administrativo Abandonado', 'M'],
      16: ['Centro de Artefatos Cognitivos', 'C'],
      17: ['Laboratório de Amostras', 'S'],
      18: ['Núcleo de Circuitos Pesados', 'E'],
      19: ['Sala de Vídeo Antiga', 'M'],
      20: ['Sala de Testes Psicológicos Avançados', 'C'],
      21: ['Câmara de Isolamento Vermelho', 'S'],
      22: ['?????', 'F'],
      23: ['Sala de Espera Hospitalar', 'M'],
      24: ['Sala de Pensamento Invertido', 'C'],
      25: ['Zona Neutra', 'F'],
    },
  },
  {
    id: 2, titulo: '2º Andar', subtitulo: 'O Alojamento',
    saida: 49,
    salas: {
      26: ['Doca de Chegada', 'E'],
      27: ['Refeitório Coletivo', 'S'],
      28: ['Lavanderia', 'M'],
      29: ['Cozinha', 'S'],
      30: ['Banheiros Coletivos', 'S'],
      31: ['Dormitório 6', 'F'],
      32: ['Fichário de Cobaias', 'C'],
      33: ['Estufa SYMBIONT', 'E'],
      34: ['Ginásio', 'S'],
      35: ['Cinema', 'C'],
      36: ['Corredor de Escuta', 'F'],
      37: ['Enfermaria', 'M'],
      38: ['Casa das Caldeiras', 'E'],
      39: ['Sala de Recreação', 'E'],
      40: ['Capela Amarela', 'F'],
      41: ['Arquivo Morto', 'M'],
      42: ['Sala de Interrogatório', 'C'],
      43: ['Câmara Fria', 'M'],
      44: ['Ateliê da Costureira', 'F'],
      45: ['Sala de Triagem', 'S'],
      46: ['Central de Rádio', 'E'],
      47: ['Sala de Música', 'C'],
      48: ['Sala do Eco', 'F'],
      49: ['Poço Quebrado', 'M'],
      50: ['Zona Neutra', 'F'],
    },
  },
  { id: 3, titulo: '3º Andar', subtitulo: 'Planta não registrada', saida: 55, salas: {} },
  { id: 4, titulo: '4º Andar', subtitulo: 'Planta não registrada', saida: 90, salas: {} },
  { id: 5, titulo: '5º Andar', subtitulo: 'Planta não registrada', saida: 107, salas: {} },
];

/* RUÍDO: a Zona Neutra (sala 25 de cada andar) não conta para o limite diário.
   Troque para false se o barulho também valer lá dentro. */
const ZONA_NEUTRA_ISENTA = true;

/* ---------------------------------------------------------
   OS SERES DA CAIXA
   tipo: 'cobaia' (jogadores), 'npc' (cobaias NPC), 'filho' (Filhos da O.R.F.E.U.)
   Os Filhos aparecem só pelo codinome. O nome verdadeiro de cada um
   NÃO está neste arquivo, de propósito: o repositório é público.
   --------------------------------------------------------- */
const SERES = [
  // Cobaias dos jogadores
  { id: 'faca',     tipo: 'cobaia', codigo: 'FHP-001', nome: 'Faca',     jogador: 'Nathalie Costa',  funcao: 'Cobaia', cor: '#27c46b', img: 'img/faca.jpg' },
  { id: 'sabonete', tipo: 'cobaia', codigo: 'FHP-002', nome: 'Sabonete', jogador: 'Lucas Matheus',   funcao: 'Cobaia', cor: '#ff7a45', img: 'img/sabonete.jpg' },
  { id: 'mostarda', tipo: 'cobaia', codigo: 'FHP-003', nome: 'Mostarda', jogador: 'Carlos André',    funcao: 'Cobaia', cor: '#e5b81e', img: 'img/mostarda.jpg' },
  { id: 'papelao',  tipo: 'cobaia', codigo: 'FHP-004', nome: 'Papelão',  jogador: 'André Carvalho',  funcao: 'Médico', cor: '#b98656', img: 'img/papelao.jpg' },
  { id: 'papel',    tipo: 'cobaia', codigo: 'FHP-005', nome: 'Papel',    jogador: 'Danton Melo',     funcao: 'Faísca', cor: '#22d3e6', img: 'img/papel.jpg' },
  { id: 'luva',     tipo: 'cobaia', codigo: 'FHP-006', nome: 'Luva',     jogador: 'Gabriel Padilha', funcao: 'Médico', cor: '#3d7bff', img: 'img/luva.jpg' },
  { id: 'velcro',   tipo: 'cobaia', codigo: 'FHP-007', nome: 'Velcro',   jogador: 'Ricardo Filho',   funcao: 'Água',   cor: '#ff5ca8', img: 'img/velcro.jpg' },

  // Cobaias NPC (só aparecem quando o mestre coloca no mapa)
  { id: 'risa',        tipo: 'npc', codigo: 'FHP-008', nome: 'Risa',        funcao: 'Cobaia', cor: '#a3ff3c', img: 'img/risa.jpg' },
  { id: 'coelho',      tipo: 'npc', codigo: 'FHP-009', nome: 'Coelho',      funcao: 'Água',   cor: '#ff3b3b', img: 'img/coelho.jpg' },
  { id: 'cara-palida', tipo: 'npc', codigo: 'FHP-010', nome: 'Cara Pálida', funcao: 'Médico', cor: '#d8dde6', img: 'img/cara-palida.jpg' },
  { id: 'onirico',     tipo: 'npc', codigo: 'FHP-011', nome: 'Onírico',     funcao: 'Cobaia', cor: '#7b61ff', img: 'img/onirico.jpg' },

  // Filhos da O.R.F.E.U. (codinomes; podem entrar no mapa várias vezes)
  { id: 'f01', tipo: 'filho', codigo: 'F-01', nome: 'Sobra',      cor: '#ff4d6d' },
  { id: 'f02', tipo: 'filho', codigo: 'F-02', nome: 'Remendo',    cor: '#ff8fa3' },
  { id: 'f03', tipo: 'filho', codigo: 'F-03', nome: 'Inquilina',  cor: '#4cc9f0' },
  { id: 'f04', tipo: 'filho', codigo: 'F-04', nome: 'Colosso',    cor: '#d00000' },
  { id: 'f05', tipo: 'filho', codigo: 'F-05', nome: 'Saudade',    cor: '#f72585' },
  { id: 'f06', tipo: 'filho', codigo: 'F-06', nome: 'Resíduo',    cor: '#6b705c' },
  { id: 'f07', tipo: 'filho', codigo: 'F-07', nome: 'Cela',       cor: '#9d8189' },
  { id: 'f08', tipo: 'filho', codigo: 'F-08', nome: 'Jardineiro', cor: '#2d6a4f' },
  { id: 'f09', tipo: 'filho', codigo: 'F-09', nome: 'Maestro',    cor: '#adb5bd' },
  { id: 'f10', tipo: 'filho', codigo: 'F-10', nome: 'Berço',      cor: '#7f5539' },
  { id: 'f11', tipo: 'filho', codigo: 'F-11', nome: 'Rascunho',   cor: '#ffd166' },
  { id: 'f12', tipo: 'filho', codigo: 'F-12', nome: 'Retrato',    cor: '#ffb703' },
  { id: 'f13', tipo: 'filho', codigo: 'F-13', nome: 'Plateia',    cor: '#fb8500' },
  { id: 'f14', tipo: 'filho', codigo: 'F-14', nome: 'Debaixo',    cor: '#8d6e00' },
  { id: 'f15', tipo: 'filho', codigo: 'F-15', nome: 'Estática',   cor: '#c77dff' },
  { id: 'f16', tipo: 'filho', codigo: 'F-16', nome: 'Prótese',    cor: '#90e0ef' },
  { id: 'f17', tipo: 'filho', codigo: 'F-17', nome: 'Curto',      cor: '#e0aaff' },
  { id: 'f18', tipo: 'filho', codigo: 'F-18', nome: 'Ninguém',    cor: '#5a189a' },
  { id: 'f19', tipo: 'filho', codigo: 'F-19', nome: 'Horizonte',  cor: '#3a86ff' },
  { id: 'f00', tipo: 'filho', codigo: 'F-00', nome: 'Zero',       cor: '#ffffff' },
  { id: 'f20', tipo: 'filho', codigo: 'F-20', nome: 'Pele-Alheia',    cor: '#e76f51' },
  { id: 'f21', tipo: 'filho', codigo: 'F-21', nome: 'O Ouvinte',   cor: '#1b263b' },
];
