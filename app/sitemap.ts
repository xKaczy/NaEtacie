import { MetadataRoute } from 'next';
import { ALL_SEO_PAGES } from '@/lib/seo/seoPagesConfig';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://naetacie.pl';
  const now = new Date();

  // Static core routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Dynamic SEO trade & district landing pages
  const seoRoutes: MetadataRoute.Sitemap = ALL_SEO_PAGES.map((page) => ({
    url: `${baseUrl}/praca/${page.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [...staticRoutes, ...seoRoutes];
}
