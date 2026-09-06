import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, Lock } from 'lucide-react';
import { storefrontServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { useAuth } from '@/auth/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

function FeatureLocked() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
        <Lock className="size-8 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          The online storefront is available on the Pro and Enterprise plans.
        </div>
      </CardContent>
    </Card>
  );
}

export function StorefrontSettingsPage() {
  const { hasFeature } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState(null);

  const q = useQuery({
    queryKey: ['storefront', 'settings'],
    queryFn: async () => (await storefrontServices.getSettings()).data.data,
    enabled: hasFeature('storefront'),
    retry: false,
  });

  useEffect(() => {
    if (q.data !== undefined && f === null) {
      setF({
        display_name: q.data?.display_name || '',
        slug: q.data?.slug || '',
        logo_url: q.data?.logo_url || '',
        accent_color: q.data?.accent_color || '',
        delivery_fee: q.data?.delivery_fee ?? 0,
        min_order: q.data?.min_order ?? 0,
        delivery_radius_km: q.data?.delivery_radius_km ?? '',
        cod_enabled: q.data?.cod_enabled ?? true,
        pay_in_store_enabled: q.data?.pay_in_store_enabled ?? true,
        online_enabled: q.data?.online_enabled ?? false,
        is_live: q.data?.is_live ?? false,
      });
    }
  }, [q.data, f]);

  const save = useMutation({
    mutationFn: () =>
      storefrontServices.saveSettings({
        ...f,
        delivery_fee: Number(f.delivery_fee),
        min_order: Number(f.min_order),
        delivery_radius_km:
          f.delivery_radius_km === '' ? null : Number(f.delivery_radius_km),
      }),
    onSuccess: (res) => {
      toast.success('Store saved');
      qc.setQueryData(['storefront', 'settings'], res.data.data);
      setF((s) => ({ ...s, slug: res.data.data.slug }));
    },
    onError: (e) => toast.error(apiError(e)),
  });

  if (!hasFeature('storefront'))
    return (
      <>
        <PageHeader title="Online store" />
        <FeatureLocked />
      </>
    );

  if (!f)
    return (
      <>
        <PageHeader title="Online store" />
        <div className="text-sm text-muted-foreground">Loading…</div>
      </>
    );

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const storeUrl = f.slug ? `/store/${f.slug}` : null;

  return (
    <>
      <PageHeader
        title="Online store"
        description="Your OTC storefront — same inventory and prices as the counter."
      >
        {storeUrl && f.is_live && (
          <Button variant="outline" asChild>
            <a href={storeUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> View store
            </a>
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="text-sm font-semibold text-foreground">Branding</div>
            <div className="space-y-1.5">
              <Label>Store name</Label>
              <Input
                value={f.display_name}
                onChange={(e) => set('display_name', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Store address (slug)</Label>
              <Input
                value={f.slug}
                onChange={(e) => set('slug', e.target.value)}
                placeholder="auto from name"
              />
              {f.slug && (
                <p className="text-xs text-muted-foreground">/store/{f.slug}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Logo URL</Label>
              <Input
                value={f.logo_url}
                onChange={(e) => set('logo_url', e.target.value)}
                placeholder="https://…/logo.png"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Accent colour</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="size-9 rounded border border-border bg-transparent"
                  value={f.accent_color || '#0ea5e9'}
                  onChange={(e) => set('accent_color', e.target.value)}
                />
                <Input
                  value={f.accent_color}
                  onChange={(e) => set('accent_color', e.target.value)}
                  placeholder="#0ea5e9"
                  className="max-w-[9rem]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="text-sm font-semibold text-foreground">Delivery</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Delivery fee</Label>
                <Input
                  type="number"
                  value={f.delivery_fee}
                  onChange={(e) => set('delivery_fee', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Minimum order</Label>
                <Input
                  type="number"
                  value={f.min_order}
                  onChange={(e) => set('min_order', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Radius (km)</Label>
                <Input
                  type="number"
                  value={f.delivery_radius_km}
                  onChange={(e) => set('delivery_radius_km', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="text-sm font-semibold text-foreground">Payment</div>
            <label className="flex items-center justify-between text-sm">
              Cash on delivery
              <Switch
                checked={f.cod_enabled}
                onCheckedChange={(v) => set('cod_enabled', v)}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              Pay in store on pickup
              <Switch
                checked={f.pay_in_store_enabled}
                onCheckedChange={(v) => set('pay_in_store_enabled', v)}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>
                Pay online (JazzCash)
                <span className="block text-xs text-muted-foreground">
                  Orders stay unconfirmed until payment clears
                </span>
              </span>
              <Switch
                checked={f.online_enabled}
                onCheckedChange={(v) => set('online_enabled', v)}
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="text-sm font-semibold text-foreground">Status</div>
            <label className="flex items-center justify-between text-sm">
              <span>
                Store is live
                <span className="block text-xs text-muted-foreground">
                  Customers can browse and order
                </span>
              </span>
              <Switch
                checked={f.is_live}
                onCheckedChange={(v) => set('is_live', v)}
              />
            </label>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Button onClick={() => save.mutate()} disabled={save.isPending || !f.display_name}>
          {save.isPending ? 'Saving…' : 'Save store'}
        </Button>
      </div>
    </>
  );
}
