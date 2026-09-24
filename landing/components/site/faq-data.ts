import type { PublicPlan } from '@/lib/api';
import { trialAnswer } from '@/lib/faq';

export type QA = { q: string; a: string };

/** Shared by the FAQ section and its FAQPage structured data, so they never disagree. */
export function faqItems(plans: PublicPlan[]): QA[] {
  return [
    { q: 'How does the free trial work?', a: trialAnswer(plans) },
    {
      q: 'Do I need to install anything?',
      a: 'No. PharmaFlow runs in the browser, so the counter PC, a laptop or a tablet all work. Receipts print from the browser to your receipt printer.',
    },
    {
      q: 'Can I bring in my current product list?',
      a: 'Yes. Paste it in from a spreadsheet with names, batch numbers, expiry dates, prices and quantities, and you can sell from it the same day.',
    },
    {
      q: 'How does batch and expiry tracking work?',
      a: 'Stock is held batch by batch, each with its own expiry date. At the counter and online, the batch that expires first is sold first. Anything within 60 days of expiry shows up in your return suggestions, grouped by supplier.',
    },
    {
      q: 'Does the online store sell prescription medicines?',
      a: 'No. Items marked as needing a prescription never appear on your online store. It only lists what you have in stock that can be sold over the counter.',
    },
    {
      q: 'How do my customers pay, and how do orders reach them?',
      a: 'Customers can pay cash on delivery or in the shop, or online through JazzCash where it has been switched on. You deliver with your own rider or book a PostEx pickup from the order, and customers follow their order with their phone number.',
    },
    {
      q: 'Can my supplier use PharmaFlow too?',
      a: 'Yes. Distributors get their own account with their catalogue, prices, incoming orders and returns. You send a connection request, they approve it, and then you can order from them inside PharmaFlow.',
    },
    {
      q: 'Can staff have different permissions?',
      a: 'Yes. Counter, warehouse, manager and admin roles each see their own part of the system. Your plan sets how many staff logins you can have.',
    },
    {
      q: 'Is my data kept separate from other pharmacies?',
      a: 'Yes. Every pharmacy is its own account, and your products, sales, customers and staff are only read inside it.',
    },
    {
      q: 'Can I change plans later?',
      a: 'Yes, up or down, whenever you need to. Your products, sales and settings stay exactly as they are. Email us and we’ll switch it.',
    },
  ];
}
