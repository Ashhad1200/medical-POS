export const siteConfig = {
	name: "PharmaFlow",
	url: "https://pharmaflow.example.com",
	ogImage: "https://pharmaflow.example.com/og.jpg",
	description:
		"PharmaFlow — point of sale, batch-aware inventory, supplier ordering and a per-pharmacy online storefront, on one shared data layer.",
	links: {
		twitter: "#",
		github: "#",
	},
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
