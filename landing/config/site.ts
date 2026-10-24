export const siteConfig = {
	name: "PharmaFlow",
	// Set NEXT_PUBLIC_SITE_URL in production: canonical URLs, Open Graph and the
	// sitemap are all built from it.
	url: process.env.NEXT_PUBLIC_SITE_URL || "https://pharmaflow.treevoxa.com",
	description:
		"Pharmacy POS where the counter, your online store and supplier orders share one batch-by-batch stock record, sold earliest expiry first. Free plan.",
	// Used by every contact link.
	email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@treevoxa.com",
};

export type SiteConfig = typeof siteConfig;

export const META_THEME_COLORS = {
	light: "#ffffff",
	dark: "#09090b",
};

// Where the marketing site talks to the API, and where its CTAs send people.
export const apiUrl =
	process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api";

export const appUrls = {
	// the tenant-facing POS app
	pos: process.env.NEXT_PUBLIC_POS_URL || "http://localhost:5175",
};
