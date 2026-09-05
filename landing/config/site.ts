export const siteConfig = {
	name: "Medical POS",
	url: "https://medical-pos.example.com",
	ogImage: "https://medical-pos.example.com/og.jpg",
	description:
		"Medical POS — point of sale, batch-aware inventory and analytics for pharmacies and medical stores.",
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
	pos: process.env.NEXT_PUBLIC_POS_URL || "http://localhost:5173",
};
