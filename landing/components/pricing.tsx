'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Check, Star } from 'lucide-react';
import { CustomTitle } from './custom/title';
import { CustomSubtitle } from './custom/subtitle';
import { CustomBadge } from './custom/badge';
import { cn } from '@/lib/utils';
import { getPublicPlans, type PublicPlan } from '@/lib/api';

const FEATURE_LABELS: Record<string, string> = {
  storefront: 'Online storefront & delivery',
  custom_domain: 'Custom storefront domain',
  ai_analytics: 'AI analytics dashboard',
  purchase_orders: 'Purchase orders & suppliers',
  multi_branch: 'Multiple branches',
  exports: 'CSV / Excel exports',
  api_access: 'API access',
};

const POPULAR_CODE = 'pro';

function planLines(plan: PublicPlan): string[] {
  const lines: string[] = [
    plan.max_users ? `Up to ${plan.max_users} team members` : 'Unlimited team members',
    plan.max_products
      ? `Up to ${plan.max_products.toLocaleString()} products`
      : 'Unlimited product catalogue',
    'Batch-aware inventory (FEFO)',
    'Counter checkout & receipts',
  ];
  for (const [key, label] of Object.entries(FEATURE_LABELS)) {
    if (plan.features?.[key]) lines.push(label);
  }
  return lines;
}

const money = (v: string | number) => {
  const n = Number(v || 0);
  return n === 0 ? 'Free' : `$${n}`;
};

const Pricing = () => {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const isYearly = billingPeriod === 'yearly';
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublicPlans()
      .then(setPlans)
      .catch(() => setError('Could not load pricing right now.'));
  }, []);

  return (
    <section
      id="pricing"
      className="py-24 bg-background border-b border-border/50"
    >
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="flex items-center justify-center flex-col text-center gap-5"
        >
          <CustomBadge>Pricing</CustomBadge>
          <CustomTitle>Simple &amp; Transparent Pricing</CustomTitle>
          <CustomSubtitle className="mb-10">
            Choose the plan that fits your store.
            <br />
            Every paid plan starts with a free trial.
          </CustomSubtitle>

          <div className="flex items-center justify-center mb-18">
            <ToggleGroup
              type="single"
              value={billingPeriod}
              onValueChange={(value) => value && setBillingPeriod(value)}
              className="bg-accent rounded-xl gap-1 p-1.5"
            >
              <ToggleGroupItem
                value="monthly"
                className="cursor-pointer flex items-center rounded-lg text-sm font-medium px-6 py-2 data-[state=on]:bg-background data-[state=on]:shadow-sm"
              >
                Monthly
              </ToggleGroupItem>
              <ToggleGroupItem
                value="yearly"
                className="cursor-pointer flex items-center rounded-lg text-sm font-medium px-6 py-2 data-[state=on]:bg-background data-[state=on]:shadow-sm gap-2"
              >
                Yearly
                <Badge
                  variant="outline"
                  className="leading-0 rounded-sm px-1 py-0.5 text-[11px] bg-indigo-100 border-indigo-100 text-indigo-700 dark:text-indigo-200 dark:bg-indigo-950/50 dark:border-indigo-950/50 font-semibold"
                >
                  2 months free
                </Badge>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </motion.div>

        {error && (
          <p className="text-center text-sm text-muted-foreground">{error}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const popular = plan.code === POPULAR_CODE;
            const price = isYearly ? plan.price_yearly : plan.price_monthly;
            return (
              <motion.div
                key={plan.code}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                viewport={{ once: true }}
              >
                <Card
                  className={cn(
                    'h-full relative transition-all duration-300 group',
                    popular
                      ? 'border-indigo-500 shadow-2xl lg:scale-105'
                      : 'border-border hover:border-indigo-500',
                  )}
                >
                  {popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2.5 py-1">
                        <Star className="h-3 w-3 me-0.5" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center py-6">
                    <CardTitle className="text-2xl font-bold">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground mb-5 min-h-10">
                      {plan.description}
                    </CardDescription>
                    <div className="flex items-end justify-center">
                      <div className="relative h-16 flex items-end">
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={isYearly ? 'yearly' : 'monthly'}
                            initial={{ opacity: 0, y: 20, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.8 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                          >
                            {money(price)}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                      {Number(price) > 0 && (
                        <span className="text-muted-foreground ms-1 mb-1">
                          {isYearly ? '/year' : '/month'}
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {planLines(plan).map((feature, i) => (
                        <li key={i} className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                          <span className="text-muted-foreground text-sm">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-6">
                      <Button
                        className="w-full cursor-pointer"
                        size="lg"
                        variant={popular ? 'default' : 'outline'}
                        asChild
                      >
                        <Link href={`/signup?plan=${plan.code}`}>
                          {Number(plan.price_monthly) === 0
                            ? 'Get started'
                            : `Start ${plan.trial_days}-day trial`}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
