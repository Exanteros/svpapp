import type { MetadataRoute } from "next";

import { getPublicRoutesForSeo } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const { seo, routes } = getPublicRoutesForSeo();
  const now = new Date();
  const scheduleLastModified =
    seo.spielplanPublishedAt && !Number.isNaN(new Date(seo.spielplanPublishedAt).getTime())
      ? new Date(seo.spielplanPublishedAt)
      : now;

  return routes
    .filter((route) => route.path !== "/spielplan" || seo.spielplanPublished)
    .map((route) => ({
      url: `${seo.siteUrl}${route.path}`,
      lastModified: route.path === "/spielplan" ? scheduleLastModified : now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }));
}
