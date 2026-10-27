// Vídeos de exemplo da tela de entrada. Perfis e legendas são fictícios; trocar pelos primeiros vídeos aprovados.
// Versículos: texto exato da tradução Almeida devolvido pelo bible-api.com (a mesma fonte do backend).
// Imagens: Wikimedia Commons, créditos em public/feed/credits.json e na legenda da tela.
export type Media = {
  kind: 'video' | 'photo'
  src: string
  alt: string
  title: string
  author: string
  license: string
  href: string
  /** Vídeo: quadro mostrado antes de tocar e segundo em que o trecho começa. */
  poster?: string
  start?: number
}

export type Reel = {
  id: string
  category: string
  author: string
  caption: string
  duration: string
  amens: number
  comments: number
  verse: { reference: string; text: string }
  media: Media
}

export const reels: Reel[] = [
  {
    id: 'ponta-negra',
    category: 'Devocional',
    author: 'pedro.alves',
    caption: 'Li isso antes do sol nascer em Ponta Negra.',
    duration: '0:38',
    amens: 17,
    comments: 3,
    verse: { reference: 'Salmos 23:1', text: 'O Senhor é o meu pastor; nada me faltará.' },
    media: {
      kind: 'photo',
      src: '/feed/nascer-do-sol-natal-rn-brasil-04.jpg',
      alt: 'Nascer do sol sobre o mar e o morro da praia de Ponta Negra, em Natal',
      title: 'Nascer do sol Natal RN Brasil 04',
      author: 'Bramiguinho',
      license: 'CC BY-SA 3.0',
      href: 'https://commons.wikimedia.org/wiki/File:Nascer_do_sol_Natal_RN_Brasil_04.JPG',
    },
  },
  {
    id: 'violao',
    category: 'Louvor',
    author: 'ministerio.alianca',
    caption: 'Afinando pro culto de jovens de sábado.',
    duration: '0:54',
    amens: 41,
    comments: 7,
    verse: { reference: 'Salmos 150:6', text: 'Tudo quanto tem fôlego louve ao Senhor. Louvai ao Senhor!' },
    media: {
      kind: 'photo',
      src: '/feed/guitar-may-2009-1.jpg',
      alt: 'Cabeça de um violão de madeira com as tarraxas e as cordas de náilon',
      title: 'Guitar May 2009-1',
      author: 'Alvesgaspar',
      license: 'CC BY 3.0',
      href: 'https://commons.wikimedia.org/wiki/File:Guitar_May_2009-1.jpg',
    },
  },
  {
    id: 'almeida-1899',
    category: 'Estudo bíblico',
    author: 'helena.estuda',
    caption: 'Por que Jesus ensinava por parábolas, em um minuto.',
    duration: '1:02',
    amens: 12,
    comments: 2,
    verse: {
      reference: 'Mateus 13:34',
      text: 'Todas estas coisas falou Jesus às multidões por parábolas, e sem parábolas nada lhes falava;',
    },
    media: {
      kind: 'photo',
      src: '/feed/biblia-sagrada-joao-ferreira-de-almeida-1899.jpg',
      alt: 'Folha de rosto de uma Bíblia Sagrada traduzida por João Ferreira de Almeida, impressa em Lisboa em 1899',
      title: 'Bíblia Sagrada João Ferreira de Almeida 1899',
      author: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      href: 'https://commons.wikimedia.org/wiki/File:B%C3%ADblia_Sagrada_Jo%C3%A3o_Ferreira_de_Almeida_1899.jpg',
    },
  },
  {
    id: 'amanhecer',
    category: 'Devocional',
    author: 'julia.ramos',
    caption: 'Acordei cedo só pra ver isso.',
    duration: '0:28',
    amens: 23,
    comments: 4,
    verse: {
      reference: 'Lamentações 3:22-23',
      text: 'A benignidade do Senhor jamais acaba, as suas misericórdias não têm fim; renovam-se cada manhã. Grande é a tua fidelidade.',
    },
    media: {
      kind: 'video',
      src: '/feed/sunrise-timelapse-30174294051.webm',
      alt: 'Timelapse do sol nascendo atrás de montanhas, com o céu passando de azul a dourado',
      title: 'Sunrise Timelapse (30174294051)',
      author: 'ShenandoahNPS',
      license: 'domínio público',
      href: 'https://commons.wikimedia.org/wiki/File:Sunrise_Timelapse_(30174294051).webm',
      poster: '/feed/sunrise-timelapse-poster.png',
      start: 10,
    },
  },
]
