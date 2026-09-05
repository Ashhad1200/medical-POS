import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Pencil, Plus, X } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { int, money } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const FEATURE_KEYS = [
  'ai_analytics',
  'purchase_orders',
  'multi_branch',
  'exports',
  'api_access',
];

const empty = {
  code: '',
  name: '',
  description: '',
  price_monthly: 0,
  price_yearly: 0,
  max_users: '',
  max_products: '',
  trial_days: 14,
  is_active: true,
  is_public: true,
  features: {},
};

function PlanDialog({ open, onOpenChange, plan }) {
  const qc = useQueryClient();
  const isEdit = !!plan;
  const [f, setF] = useState(plan ? { ...empty, ...plan, features: plan.features || {} } : empty);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const mut = useMutation({
    mutationFn: () => {
      const payload = {
        ...f,
        price_monthly: Number(f.price_monthly),
        price_yearly: Number(f.price_yearly),
        max_users: f.max_users === '' ? null : Number(f.max_users),
        max_products: f.max_products === '' ? null : Number(f.max_products),
        trial_days: Number(f.trial_days),
      };
      return isEdit
        ? api.patch(`/platform/plans/${plan.id}`, payload)
        : api.post('/platform/plans', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Plan updated' : 'Plan created');
      qc.invalidateQueries({ queryKey: ['platform', 'plans'] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${plan.name}` : 'New plan'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                value={f.code}
                onChange={(e) => set('code', e.target.value)}
                disabled={isEdit}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={f.name} onChange={(e) => set('name', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={f.description || ''}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>$ / mo</Label>
              <Input
                type="number"
                value={f.price_monthly}
                onChange={(e) => set('price_monthly', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>$ / yr</Label>
              <Input
                type="number"
                value={f.price_yearly}
                onChange={(e) => set('price_yearly', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max users</Label>
              <Input
                type="number"
                placeholder="∞"
                value={f.max_users ?? ''}
                onChange={(e) => set('max_users', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Trial days</Label>
              <Input
                type="number"
                value={f.trial_days}
                onChange={(e) => set('trial_days', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Features</Label>
            <div className="space-y-2 rounded-md border border-border p-3">
              {FEATURE_KEYS.map((k) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{k.replace('_', ' ')}</span>
                  <Switch
                    checked={!!f.features[k]}
                    onCheckedChange={(v) =>
                      set('features', { ...f.features, [k]: v })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={f.is_active}
                onCheckedChange={(v) => set('is_active', v)}
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={f.is_public}
                onCheckedChange={(v) => set('is_public', v)}
              />
              Public
            </label>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !f.code || !f.name}>
            {mut.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PlansPage() {
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, obj = edit
  const plans = useQuery({
    queryKey: ['platform', 'plans'],
    queryFn: async () => (await api.get('/platform/plans')).data.data,
  });

  return (
    <>
      <PageHeader title="Plans" description="Subscription tiers and feature gates.">
        <Button onClick={() => setEditing(null)}>
          <Plus className="size-4" /> New plan
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.data?.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {p.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.code}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(p)}
                >
                  <Pencil className="size-3.5" />
                </Button>
              </div>
              <div className="mt-3 text-2xl font-semibold text-foreground">
                {money(p.price_monthly)}
                <span className="text-sm font-normal text-muted-foreground">
                  {' '}
                  / mo
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {p.max_users ? `${p.max_users} users` : 'Unlimited users'} ·{' '}
                {int(p.organization_count)} orgs
              </div>
              <div className="mt-3 space-y-1">
                {FEATURE_KEYS.map((k) => (
                  <div key={k} className="flex items-center gap-1.5 text-xs">
                    {p.features?.[k] ? (
                      <Check className="size-3.5 text-green-600" />
                    ) : (
                      <X className="size-3.5 text-muted-foreground" />
                    )}
                    <span
                      className={
                        p.features?.[k]
                          ? 'capitalize'
                          : 'capitalize text-muted-foreground'
                      }
                    >
                      {k.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-1.5">
                {!p.is_active && <Badge variant="secondary" appearance="light">retired</Badge>}
                {p.is_public ? (
                  <Badge variant="info" appearance="light">public</Badge>
                ) : (
                  <Badge variant="secondary" appearance="light">private</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing !== undefined && (
        <PlanDialog
          open
          onOpenChange={(v) => !v && setEditing(undefined)}
          plan={editing || undefined}
        />
      )}
    </>
  );
}
