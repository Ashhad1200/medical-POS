export const siteConfig = {
	name: "PharmaFlow",
	// Set NEXT_PUBLIC_SITE_URL in production: canonical URLs, Open Graph and the
	// sitemap are all built from it.
	url: process.env.NEXT_PUBLIC_SITE_URL || "https://pharmaflow.example.com",
	description:
		"Pharmacy and medical store software where the counter, your own online store and your supplier orders all run off the same batch-by-batch stock, sold earliest expiry first.",
	// Placeholder until the real support inbox exists; used by every contact link.
	email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@pharmaflow.example.com",
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
