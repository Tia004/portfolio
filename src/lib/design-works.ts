import type { Lang, ProjectData } from './translations';

type LocalizedCopy = { title: string; description: string };

type DesignWorkGroup = {
  id: string;
  copy: Record<Lang, LocalizedCopy>;
  images: string[];
  documents?: string[];
  tags?: string[];
  /** Override the auto-generated thumbnail (gallery[0]) — useful for PDF-only or text-based projects */
  thumbnail?: string;
};

const asset = (path: string) => encodeURI(`/uploads/design-works/${path}`);

// ── SVG data URI: "Design UI/UX" text thumbnail ─────────
const UI_UX_THUMB = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">' +
  '<rect fill="%23121212" width="960" height="540" rx="16"/>' +
  '<rect fill="none" stroke="%232dd4bf" stroke-width="2" stroke-opacity="0.3" width="960" height="540" rx="16"/>' +
  '<text fill="%232dd4bf" font-family="Outfit,sans-serif" font-size="52" font-weight="700" text-anchor="middle" x="480" y="262" letter-spacing="0.08em">Design UI/UX</text>' +
  '<text fill="%23666" font-family="Outfit,sans-serif" font-size="24" text-anchor="middle" x="480" y="312">Portfolio PDF</text>' +
  '</svg>'
);

// ── Helper: one-image design project ──────────────────────
function solo(
  id: string,
  img: string,
  title: string,
  descIt: string,
  descEn: string,
  descEs: string,
  tags: string[] = ['Design'],
): DesignWorkGroup {
  return {
    id,
    images: [img],
    tags,
    copy: {
      it: { title, description: descIt },
      en: { title, description: descEn },
      es: { title, description: descEs },
    },
  };
}

const DESIGN_WORK_GROUPS: DesignWorkGroup[] = [
  // ══════ Copertine e poster — progetti singoli ═════════════
  solo(
    'flussi-di-coscienza',
    'Misti/CopertinaFlussiDiCoscienza-OUS.webp',
    'Flussi di Coscienza',
    'Copertina editoriale per il progetto "Flussi di Coscienza" — OUS.',
    'Editorial cover for the "Flussi di Coscienza" project — OUS.',
    'Portada editorial para el proyecto "Flussi di Coscienza" — OUS.',
    ['Design', 'Editoriale'],
  ),
  solo(
    'introspection-poster',
    'Misti/IntrospectionPoster.webp',
    'Introspection',
    'Poster artistico sperimentale con tecnica mista e palette retro-futurista.',
    'Experimental artistic poster with mixed technique and a retro-futuristic palette.',
    'Póster artístico experimental con técnica mixta y paleta retro-futurista.',
    ['Design', 'Poster'],
  ),
  solo(
    'obi-wan-poster',
    'Misti/ObiWanPoster.webp',
    'Obi-Wan Kenobi',
    'Poster cinematografico dedicato alla serie Obi-Wan Kenobi, con composizione drammatica e palette desertica.',
    'Cinematic poster for the Obi-Wan Kenobi series, featuring a dramatic composition and desert palette.',
    'Póster cinematográfico dedicado a la serie Obi-Wan Kenobi, con composición dramática y paleta desértica.',
    ['Design', 'Poster'],
  ),
  solo(
    'violenza-fisica',
    'Misti/TrovareLeParolePerRaccontareUnaViolenzaFisica.webp',
    'Trovare le parole',
    'Composizione tipografica sul tema della violenza fisica — progetto editoriale di forte impatto visivo.',
    'Typographic composition on the topic of physical violence — a high-impact editorial design.',
    'Composición tipográfica sobre el tema de la violencia física — un diseño editorial de alto impacto.',
    ['Design', 'Tipografia'],
  ),
  solo(
    'vergilius-nectar-poster',
    'Misti/VergiliusNectarPoster.webp',
    'Vergilius Nectar',
    'Poster per il brand Vergilius Nectar, con palette scura e dorata e composizione elegante.',
    'Poster for the Vergilius Nectar brand, featuring a dark and gold palette with an elegant composition.',
    'Póster para la marca Vergilius Nectar, con paleta oscura y dorada y composición elegante.',
    ['Design', 'Poster'],
  ),

  // ══════ Raccolte design editoriale ════════════════════════
  {
    id: 'design-editoriale-1',
    copy: {
      it: { title: 'Design Editoriale — Vol. 1', description: 'Raccolta di composizioni editoriali, mockup e poster realizzati con Photoshop. Palette scure, contrasti tipografici e texture materiche per progetti stampa e digitali.' },
      en: { title: 'Editorial Design — Vol. 1', description: 'A collection of editorial compositions, mockups and posters created with Photoshop. Dark palettes, typographic contrasts and material textures for print and digital projects.' },
      es: { title: 'Diseño Editorial — Vol. 1', description: 'Colección de composiciones editoriales, mockups y pósteres realizados con Photoshop. Paletas oscuras, contrastes tipográficos y texturas matéricas para proyectos impresos y digitales.' },
    },
    images: [
      'Misti/IMG_20251017_201424_889.webp',
      'Misti/IMG_20251017_201427_806.webp',
      'Misti/IMG_20251017_201445_008.webp',
      'Misti/IMG_20251017_201501_982.webp',
      'Misti/IMG_20251017_201503_944.webp',
      'Misti/IMG_20251017_201510_743.webp',
      'Misti/IMG_20251017_201511_187.webp',
      'Misti/IMG_20251017_201517_956.webp',
      'Misti/IMG_20251017_201521_619.webp',
      'Misti/IMG_20251017_201523_019.webp',
      'Misti/IMG_20251017_201524_835.webp',
      'Misti/IMG_20251017_201747_039.webp',
    ],
    tags: ['Design', 'Editoriale', 'Photoshop'],
  },
  {
    id: 'design-editoriale-2',
    copy: {
      it: { title: 'Design Editoriale — Vol. 2', description: 'Bozzetti digitali e mockup di brand identity realizzati con tecniche miste in Photoshop. Palette pulite e layout moderni.' },
      en: { title: 'Editorial Design — Vol. 2', description: 'Digital sketches and brand identity mockups crafted with mixed techniques in Photoshop. Clean palettes and modern layouts.' },
      es: { title: 'Diseño Editorial — Vol. 2', description: 'Bocetos digitales y mockups de identidad de marca realizados con técnicas mixtas en Photoshop. Paletas limpias y diseños modernos.' },
    },
    images: [
      'Misti/IMG_20251017_201938_166.webp',
      'Misti/IMG_20251017_202112_932.webp',
      'Misti/IMG_20251017_202156_558.webp',
      'Misti/IMG_20251017_202157_678.webp',
    ],
    tags: ['Design', 'Editoriale', 'Branding'],
  },
  {
    id: 'design-editoriale-2b',
    copy: {
      it: { title: 'Copertine per iPalBoyTV', description: 'Poster, banner e copertine YouTube per il canale iPalBoyTV con palette dal pastello al metallico. Composizioni tipografiche, collage digitali e pattern organici realizzati in Photoshop.' },
      en: { title: 'Covers for iPalBoyTV', description: 'Posters, banners, and YouTube covers for the iPalBoyTV channel with pastel to metallic palettes. Typographic compositions, digital collages, and organic patterns crafted in Photoshop.' },
      es: { title: 'Portadas para iPalBoyTV', description: 'Pósters, banners y portadas de YouTube para el canal iPalBoyTV con paletas de pastel a metálico. Composiciones tipográficas, collages digitales y patrones orgánicos en Photoshop.' },
    },
    images: [
      'Misti/IMG_20251017_202553_172.webp',
      'Misti/IMG_20251017_202635_900.webp',
      'Misti/IMG_20251017_202648_672.webp',
      'Misti/IMG_20251017_202731_403.webp',
    ],
    tags: ['Design', 'Editoriale', 'Poster'],
  },
  {
    id: 'design-editoriale-3',
    copy: {
      it: { title: 'Design Editoriale — Vol. 3', description: 'Terza raccolta: poster, brochure, flyer e composizioni astratte con pattern geometrici, doppie esposizioni e palette ad alto contrasto.' },
      en: { title: 'Editorial Design — Vol. 3', description: 'Third volume: posters, brochures, flyers and abstract compositions with geometric patterns, double exposures and high-contrast palettes.' },
      es: { title: 'Diseño Editorial — Vol. 3', description: 'Tercer volumen: pósteres, folletos, flyers y composiciones abstractas con patrones geométricos, dobles exposiciones y paletas de alto contraste.' },
    },
    images: [
      'Misti/IMG_20251017_203329_129.webp',
      'Misti/IMG_20251017_203335_448.webp',
      'Misti/IMG_20251017_203516_990.webp',
      'Misti/IMG_20251017_203518_207.webp',
      'Misti/IMG_20251017_203520_468.webp',
      'Misti/IMG_20251017_203524_068.webp',
    ],
    tags: ['Design', 'Editoriale', 'Poster'],
  },

  // ══════ Altri progetti — elementi spostati ═══════════════
  solo(
    'collage-digitale-astratto',
    'Misti/IMG_20251017_202838_852.webp',
    'Collage Digitale Astratto',
    'Composizione astratta con pattern organici, palette metallica e texture stratificate realizzata in Photoshop. Sperimentazione visiva tra digitale e materico.',
    'Abstract composition with organic patterns, metallic palette and layered textures made in Photoshop. Visual experimentation between digital and material.',
    'Composición abstracta con patrones orgánicos, paleta metálica y texturas estratificadas realizada en Photoshop. Experimentación visual entre lo digital y lo matérico.',
    ['Design', 'Astratto', 'Photoshop'],
  ),

  // ══════ Progetti di UI — PDF portfolio ════════════════════
  {
    id: 'progetti-ui',
    copy: {
      it: { title: 'Progetti di UI', description: 'Portfolio PDF con progetti di UI/UX design: WCM (WeCanMake) e materiali per l\'Istituto Fermi. Raccolta di design editoriali, branding e interfacce.' },
      en: { title: 'UI Projects', description: 'PDF portfolio with UI/UX design projects: WCM (WeCanMake) and materials for the Fermi Institute. A collection of editorial designs, branding and interfaces.' },
      es: { title: 'Proyectos de UI', description: 'Portfolio PDF con proyectos de diseño UI/UX: WCM (WeCanMake) y materiales para el Instituto Fermi. Colección de diseños editoriales, branding e interfaces.' },
    },
    images: [],
    thumbnail: UI_UX_THUMB,
    documents: ['Misti/WCM.pdf'],
    tags: ['Design', 'UI/UX', 'PDF'],
  },

  // ══════ DestTime carousels ═════════════════════════════════
  {
    id: 'desttime-shaman-king',
    copy: {
      it: { title: 'DestTime — Shaman King', description: 'Carosello social dedicato a Shaman King, progettato come una sequenza narrativa di slide collegate.' },
      en: { title: 'DestTime — Shaman King', description: 'A social carousel about Shaman King, designed as a connected narrative sequence of slides.' },
      es: { title: 'DestTime — Shaman King', description: 'Carrusel social sobre Shaman King, diseñado como una secuencia narrativa de diapositivas conectadas.' },
    },
    images: [
      'DestTime Post about Shaman King/LaCalmaELaPazienza_PrimaSlide_Finale.webp',
      'DestTime Post about Shaman King/LaCalmaELaPazienza_SecondaSlide.webp',
      'DestTime Post about Shaman King/LaCalmaELaPazienza_TerzaSlide.webp',
      'DestTime Post about Shaman King/LaCalmaELaPazienza_QuartaSlide.webp',
      'DestTime Post about Shaman King/LaCalmaELaPazienza_QuintaSlide.webp',
      'DestTime Post about Shaman King/LaCalmaELaPazienza_SestaSlide.webp',
      'DestTime Post about Shaman King/LaCalmaELaPazienza_SettimaSlide_Alt_Bold.webp',
    ],
    tags: ['Design', 'Social Media', 'Carousel'],
  },
  {
    id: 'desttime-mha',
    copy: {
      it: { title: 'DestTime — My Hero Academia', description: 'Carousel editoriale per social media con una direzione visiva coerente e una pagina per ogni passaggio del racconto.' },
      en: { title: 'DestTime — My Hero Academia', description: 'An editorial social carousel with a cohesive visual direction and one page for every step of the story.' },
      es: { title: 'DestTime — My Hero Academia', description: 'Carrusel editorial para redes con una dirección visual coherente y una página para cada paso de la historia.' },
    },
    images: [
      'DestTime Post about MHA/MHA_Post_1.webp',
      'DestTime Post about MHA/MHA_Post_2.webp',
      'DestTime Post about MHA/MHA_Post_3.webp',
      'DestTime Post about MHA/MHA_Post_4.webp',
      'DestTime Post about MHA/MHA_Post_5.webp',
      'DestTime Post about MHA/MHA_Post_6.webp',
      'DestTime Post about MHA/MHA_Post_7.webp',
      'DestTime Post about MHA/MHA_Post_8.webp',
      'DestTime Post about MHA/MHA_Post_9.webp',
    ],
    tags: ['Design', 'Social Media', 'Carousel'],
  },
  {
    id: 'desttime-spiderman',
    copy: {
      it: { title: 'DestTime — Spider-Man', description: 'Carosello social a tema Spider-Man, composto da slide verticali pensate per essere sfogliate come un post Instagram.' },
      en: { title: 'DestTime — Spider-Man', description: 'A Spider-Man themed social carousel made of vertical slides designed to be browsed like an Instagram post.' },
      es: { title: 'DestTime — Spider-Man', description: 'Carrusel social sobre Spider-Man, compuesto por diapositivas verticales pensadas para deslizarse como un post de Instagram.' },
    },
    images: [
      'DestTime Post about Spiderman/Spiderman-EffettoNostalgia_PrimaSlide-Rivisitata.webp',
      'DestTime Post about Spiderman/Spiderman-EffettoNostalgia_SecondaSlide.webp',
      'DestTime Post about Spiderman/Spiderman-EffettoNostalgia_TerzaSlide.webp',
      'DestTime Post about Spiderman/Spiderman-EffettoNostalgia_QuartaSlide.webp',
      'DestTime Post about Spiderman/Spiderman-EffettoNostalgia_QuintaSlide.webp',
      'DestTime Post about Spiderman/Spiderman-EffettoNostalgia_SestaSlide.webp',
      'DestTime Post about Spiderman/Spiderman-EffettoNostalgia_SettimaSlide.webp',
    ],
    tags: ['Design', 'Social Media', 'Carousel'],
  },
  {
    id: 'desttime-stories',
    copy: {
      it: { title: 'DestTime — Stories social', description: 'Set di stories verticali per raccontare la presenza di DestTime su Spotify, Facebook, Apple Podcasts, YouTube, blog, TikTok e Telegram.' },
      en: { title: 'DestTime — Social stories', description: 'A vertical story set presenting DestTime across Spotify, Facebook, Apple Podcasts, YouTube, blog, TikTok, and Telegram.' },
      es: { title: 'DestTime — Stories sociales', description: 'Set de stories verticales para presentar la presencia de DestTime en Spotify, Facebook, Apple Podcasts, YouTube, blog, TikTok y Telegram.' },
    },
    images: [
      'DestTime Stories about their social contacts/Storia_Social_Spotify_Podcast.webp',
      'DestTime Stories about their social contacts/Storia_Social_Facebook.webp',
      'DestTime Stories about their social contacts/Storia_Social_Apple_Podcast.webp',
      'DestTime Stories about their social contacts/Storia_Social_Youtube.webp',
      'DestTime Stories about their social contacts/Storia_Social_Blog.webp',
      'DestTime Stories about their social contacts/Storia_Social_Tiktok.webp',
      'DestTime Stories about their social contacts/Storia_Social_Telegram.webp',
    ],
    tags: ['Design', 'Social Media', 'Carousel'],
  },
];

export function getDesignWorks(lang: Lang): ProjectData[] {
  return DESIGN_WORK_GROUPS.map((work) => {
    const copy = work.copy[lang] ?? work.copy.it;
    const gallery = [...work.images, ...(work.documents ?? [])].map(asset);
    return {
      id: work.id,
      title: copy.title,
      description: copy.description,
      url: '',
      thumbnail: work.thumbnail ?? gallery[0],
      category: 'Design',
      tags: work.tags ?? ['Design'],
      gallery,
      documents: work.documents?.map(asset),
    };
  });
}
