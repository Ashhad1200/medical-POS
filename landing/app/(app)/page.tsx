'use client';

import Header from '@/components/header';
import Hero from '@/components/hero';
import HowItWorks from '@/components/how-it-works';
import Features from '@/components/features';
import Pricing from '@/components/pricing';
import FAQ from '@/components/faq';
import CallToAction from '@/components/call-to-action';
import Contact from '@/components/contact';
import Footer from '@/components/footer';

// Testimonials + TrustedBrands are intentionally omitted until there are real
// customers to feature — the components still live in /components if wanted.
export default function Page() {
	return (
		<div className="min-h-screen">
			<Header />
      <Hero />
      <HowItWorks />
      <Features />
      <Pricing />
      <FAQ />
      <CallToAction />
      <Contact />
      <Footer />
		</div>
	);
}
