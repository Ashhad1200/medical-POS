
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CustomBadge } from '@/components/custom/badge';
import { CustomTitle } from '@/components/custom/title';
import { CustomSubtitle } from '@/components/custom/subtitle';

import Link from 'next/link'; 

const FAQ = () => {
  const faqs = [
    {
      question: "How does the free trial work?",
      answer: "Every paid plan starts with a free trial (14 days on Basic and Pro, 30 on Enterprise). No card required — you get full access, and your data stays if you subscribe."
    },
    {
      question: "Do I need to install anything?",
      answer: "No. PharmaFlow runs in the browser. Any modern laptop, desktop or tablet at the counter works — just sign in."
    },
    {
      question: "Can I import my existing product list?",
      answer: "Yes. You can add products manually or bulk-import them with batch numbers, expiry dates and prices so you're selling from day one."
    },
    {
      question: "How does batch and expiry tracking work?",
      answer: "Stock is held per batch with its own expiry date. At checkout the system sells the earliest-expiring batch first (FEFO), and flags anything expiring soon so you can return or discount it."
    },
    {
      question: "Can I add staff with different permissions?",
      answer: "Yes. Counter, warehouse, manager and admin roles each see only what they need — the plan's user limit sets how many active staff you can have."
    },
    {
      question: "Can I change plans later?",
      answer: "Yes, you can move up or down a plan at any time from your dashboard, or an operator can do it for you. Your data and settings carry over."
    },
    {
      question: "Is my data separated from other pharmacies?",
      answer: "Every store is a separate tenant. Your products, sales, customers and staff are isolated to your organization."
    },
    {
      question: "Do you offer custom or enterprise setups?",
      answer: "For multi-branch operations or specific requirements, the Enterprise plan lifts the user and catalogue limits. Get in touch to talk through anything beyond that."
    }
  ];

  return (
    <section className="py-24 bg-background" id="faq">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }} className="flex items-center justify-center flex-col text-center gap-5 mb-25">
          <CustomBadge>
            FAQ
          </CustomBadge>

          <CustomTitle>
            Frequently Asked Questions
          </CustomTitle>
          
          <CustomSubtitle>
            Got questions? We&apos;ve got answers. Here are the most common questions about our pricing and service.
          </CustomSubtitle>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <AccordionItem 
                  value={`item-${index}`} 
                  className="bg-background rounded-lg border! border-border px-6 hover:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="text-start font-semibold text-foreground hover:text-indigo-600 data-[state=open]:text-indigo-600 transition-colors cursor-pointer">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="flex flex-col justify-center items-center gap-1.5 text-center mt-12"
        >
          <span className="text-muted-foreground">
            Still have questions?
          </span>

          <Link href="#contact" className="text-indigo-600 hover:text-indigo-700 transition-colors hover:underline">
            Contact our Support Team
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
