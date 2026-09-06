
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { CustomBadge } from '@/components/custom/badge';
import { CustomTitle } from '@/components/custom/title';
import { CustomSubtitle } from '@/components/custom/subtitle';
import { Boxes, ShieldCheck, BarChart3, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

const Features = () => {
  const features = [
    {
      id: 'batch-inventory',
      icon: Boxes,
      title: 'Batch-aware inventory',
      description:
        'Every product tracked by batch and expiry. Sales pick the earliest-expiring stock automatically (FEFO), so you sell before you write off.',
      stats: 'FEFO',
      metric: 'Auto stock pick',
      colors: {
        bg: 'bg-blue-100/40 dark:bg-blue-950/40',
        icon: 'text-blue-600',
        hover: 'hover:border-blue-500',
        shadow: 'group-hover:shadow-blue-500/30',
        gradient: 'from-blue-500 via-blue-600 to-blue-700',
        text: 'group-hover:text-blue-700'
      }
    },
    {
      id: 'fast-counter',
      icon: ShieldCheck,
      title: 'Fast, controlled counter',
      description:
        'Type-to-search checkout, partial payments and credit, prescription prompts on Rx items, and role-based access for counter, warehouse and manager staff.',
      stats: 'Rx',
      metric: 'Prescription checks',
      colors: {
        bg: 'bg-red-100/40 dark:bg-red-950/40',
        icon: 'text-red-600',
        hover: 'hover:border-red-500',
        shadow: 'group-hover:shadow-red-500/30',
        gradient: 'from-red-500 via-red-600 to-red-700',
        text: 'group-hover:text-red-700'
      }
    },
    {
      id: 'purchasing',
      icon: Truck,
      title: 'Purchasing & suppliers',
      description:
        'Raise purchase orders, approve and receive them into batch stock, track supplier terms and credit, and get return-to-vendor suggestions before items expire.',
      stats: 'RTV',
      metric: 'Return suggestions',
      colors: {
        bg: 'bg-emerald-100/40 dark:bg-emerald-950/40',
        icon: 'text-emerald-600',
        hover: 'hover:border-emerald-500',
        shadow: 'group-hover:shadow-emerald-500/30',
        gradient: 'from-emerald-500 via-emerald-600 to-emerald-700',
        text: 'group-hover:text-emerald-700'
      }
    },
    {
      id: 'analytics',
      icon: BarChart3,
      title: 'Sales & margin analytics',
      description:
        'Daily revenue and profit, low-stock and expiry alerts, dued-customer tracking, and AI insights on your fastest and slowest movers.',
      stats: 'Live',
      metric: 'Revenue & profit',
      colors: {
        bg: 'bg-amber-100/40 dark:bg-amber-950/20',
        icon: 'text-amber-600',
        hover: 'hover:border-amber-500',
        shadow: 'group-hover:shadow-amber-500/30',
        gradient: 'from-amber-500 via-amber-600 to-amber-700',
        text: 'group-hover:text-amber-700'
      }
    }
  ];

  return (
    <section id="features" className="py-24 bg-background border-b border-border/50">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }} className="flex items-center justify-center flex-col text-center gap-5 mb-16">
          <CustomBadge>
            Features
          </CustomBadge>

          <CustomTitle>
            Everything a medical store runs on
          </CustomTitle>

          <CustomSubtitle>
            Inventory, counter, purchasing and reporting in one system —
            built around batches, expiry and prescriptions.
          </CustomSubtitle>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              className="group"
            >
              <Card className={cn('h-full bg-background border border-border transition-all duration-500 p-8 relative overflow-hidden hover:shadow-lg', feature.colors.hover)}>
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-8">
                    <div className={cn(
                      'size-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-500 relative overflow-hidden', 
                      feature.colors.bg
                      )}
                    >
                      <feature.icon className={cn('size-5 relative z-10', feature.colors.icon)} />
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-semibold text-foreground mb-1">{feature.stats}</div>
                      <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">{feature.metric}</div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-2xl font-bold text-foreground mb-6 group-hover:text-foreground transition-colors leading-tight">
                    {feature.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </CardContent>

                {/* Hover effect gradient border */}
                <div className={cn('absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left', feature.colors.gradient, feature.colors.gradient)} />
                
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/0 to-slate-100/0 group-hover:from-slate-50/30 group-hover:to-slate-100/10 dark:from-slate-900/0 dark:to-slate-800/0 transition-all duration-500 pointer-events-none" />
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
