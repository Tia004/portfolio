import type { MetadataRoute } from 'next';

const BASE_URL = 'https://tiadesigns.it';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
      alternates: {
        languages: {
          it: `${BASE_URL}/`,
          en: `${BASE_URL}/en`,
          es: `${BASE_URL}/es`,
          'x-default': `${BASE_URL}/`,
        },
      },
    },
    {
      url: `${BASE_URL}/en`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: {
        languages: {
          en: `${BASE_URL}/en`,
          it: `${BASE_URL}/`,
          es: `${BASE_URL}/es`,
          'x-default': `${BASE_URL}/`,
        },
      },
    },
    {
      url: `${BASE_URL}/es`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: {
        languages: {
          es: `${BASE_URL}/es`,
          it: `${BASE_URL}/`,
          en: `${BASE_URL}/en`,
          'x-default': `${BASE_URL}/`,
        },
      },
    },
  ];
}
