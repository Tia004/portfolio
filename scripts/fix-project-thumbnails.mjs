import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  // Delete duplicate 'Studio Ingegnere Davide Moretti' if exists
  await client.execute("DELETE FROM Project WHERE title = 'Studio Ingegnere Davide Moretti'");

  // Fix all thumbnail paths to correct .webp files
  const thumbnailFixes = [
    { title: 'GSA Hotels', thumbnail: '/uploads/gsahotels.webp', order: 1, featured: 1 },
    { title: 'Vergilius Nectar', thumbnail: '/uploads/vergiliusnectar.webp', order: 2, featured: 1 },
    { title: 'Studio Ing. Moretti', thumbnail: '/uploads/studioingmoretti.webp', order: 3, featured: 1 },
    { title: 'PCS Mantova', thumbnail: '/uploads/pcsmantova.webp', order: 4, featured: 1 },
    { title: 'Canapa Store', thumbnail: '/uploads/canapastore.webp', order: 5, featured: 1 },
    { title: 'Pigg', thumbnail: '/uploads/pigg-cover.webp', order: 6, featured: 1 },
    { title: 'Flussi di Coscienza', thumbnail: '/uploads/design-works/Misti/CopertinaFlussiDiCoscienza-OUS.webp', order: 7, featured: 0 },
    { title: 'Introspection', thumbnail: '/uploads/design-works/Misti/IntrospectionPoster.webp', order: 8, featured: 0 },
    { title: 'Obi-Wan Kenobi', thumbnail: '/uploads/design-works/Misti/ObiWanPoster.webp', order: 9, featured: 0 },
    { title: 'Trovare le parole', thumbnail: '/uploads/design-works/Misti/TrovareLeParolePerRaccontareUnaViolenzaFisica.webp', order: 10, featured: 0 },
    { title: 'Vergilius Nectar Poster', thumbnail: '/uploads/design-works/Misti/VergiliusNectarPoster.webp', order: 11, featured: 0 },
    { title: 'Design Editoriale — Vol. 1', thumbnail: '/uploads/design-works/Misti/IMG_20251017_201424_889.webp', order: 12, featured: 0 },
    { title: 'Design Editoriale — Vol. 2', thumbnail: '/uploads/design-works/Misti/IMG_20251017_201938_166.webp', order: 13, featured: 0 },
    { title: 'Design Editoriale — Vol. 2B', thumbnail: '/uploads/design-works/Misti/IMG_20251017_202553_172.webp', order: 14, featured: 0 },
    { title: 'Design Editoriale — Vol. 3', thumbnail: '/uploads/design-works/Misti/IMG_20251017_203329_129.webp', order: 15, featured: 0 },
    { title: 'Collage Digitale Astratto', thumbnail: '/uploads/design-works/Misti/IMG_20251017_202838_852.webp', order: 16, featured: 0 },
    { title: 'DestTime — Shaman King', thumbnail: '/uploads/design-works/DestTime Post about Shaman King/LaCalmaELaPazienza_PrimaSlide_Finale.webp', order: 17, featured: 0 },
    { title: 'DestTime — My Hero Academia', thumbnail: '/uploads/design-works/DestTime Post about MHA/MHA_Post_1.webp', order: 18, featured: 0 },
    { title: 'DestTime — Spider-Man', thumbnail: '/uploads/design-works/DestTime Post about Spiderman/Spiderman-EffettoNostalgia_PrimaSlide-Rivisitata.webp', order: 19, featured: 0 },
    { title: 'DestTime — Stories Social', thumbnail: '/uploads/design-works/DestTime Stories about their social contacts/Storia_Social_Spotify_Podcast.webp', order: 20, featured: 0 },
  ];

  for (const item of thumbnailFixes) {
    await client.execute({
      sql: 'UPDATE Project SET thumbnail = ?, "order" = ?, featured = ? WHERE title = ?',
      args: [item.thumbnail, item.order, item.featured, item.title],
    });
  }

  console.log('✅ Successfully fixed project thumbnails and canonical order in Turso!');
}

main().catch(console.error);
