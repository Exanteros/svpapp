import type { MetadataRoute } from "next";

import { getPublicRoutesForSeo } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const { seo, routes } = getPublicRoutesForSeo();
  const allowedRoutes = routes.map((route) => route.path);
  const disallowedRoutes = ["/admin", "/api", "/debug", "/helfer/", "/schiedsrichterkarte/"];

  if (!seo.anmeldenAktiv) {
    disallowedRoutes.push("/anmeldung");
  }

  if (!seo.spielplanPublished) {
    disallowedRoutes.push("/spielplan");
  }

  return {
    rules: {
      userAgent: "*",
      allow: allowedRoutes,
      disallow: disallowedRoutes,
    },
    sitemap: `${seo.siteUrl}/sitemap.xml`,
    host: seo.siteUrl,
  };
}
