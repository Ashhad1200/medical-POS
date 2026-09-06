import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Lock, Plus, Trash2 } from 'lucide-react';
import { medicineServices, storefrontServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { useAuth } from '@/auth/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const BG_STYLES = ['color', 'gradient', 'image'];
const emptyBanner = () => ({
  headline: '',
  subheadline: '',
  cta_label: '',
  cta_href: '',
  bg_style: 'color',
  bg_value: '#0ea5e9',
  is_active: true,
});

function move(list, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function StorefrontCustomizePage() {
  const { hasFeature } = useAuth();
  const qc = useQueryClient();
  const [banners, setBanners] = useState([]);
  const [deals, setDeals] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const cust = useQuery({
    queryKey: ['storefront', 'customization'],
    queryFn: async () => (await storefrontServices.getCustomization()).data.data,
    enabled: hasFeature('storefront'),
    retry: false,
  });

  const products = useQuery({
    queryKey: ['medicines', 'all-for-customize'],
    queryFn: async () => (await medicineServices.getAll({ limit: 500 })).data.data,
    enabled: hasFeature('storefront'),
    retry: false,
  });

  useEffect(() => {
    if (cust.data && !loaded) {
      setBanners(cust.data.banners || []);
      setDeals(cust.data.deals || []);
      setFeatured(cust.data.featured || []);
      setLoaded(true);
    }
  }, [cust.data, loaded]);

  const save = useMutation({
    mutationFn: () =>
      storefrontServices.saveCustomization({
        banners,
        deals: deals
          .filter((d) => d.product_id)
          .map((d) => ({
            product_id: d.product_id,
            discount_pct: Number(d.discount_pct),
            starts_at: d.starts_at || null,
            ends_at: d.ends_at || null,
          })),
        featured: featured.filter(Boolean),
      }),
    onSuccess: (res) => {
      toast.success('Storefront updated');
      qc.setQueryData(['storefront', 'customization'], res.data.data);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  if (!hasFeature('storefront'))
    return (
      <>
        <PageHeader title="Storefront customization" />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Lock className="size-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              Available on the Pro and Enterprise plans.
            </div>
          </CardContent>
        </Card>
      </>
    );

  const prodList = products.data || [];
  const prodName = (id) => prodList.find((p) => p.id === id)?.name || id;
  const setBanner = (i, patch) =>
    setBanners((b) => b.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  return (
    <>
      <PageHeader
        title="Storefront customization"
        description="Banners, deals and featured products for your online store."
      />

      {/* Banners */}
      <Card className="mb-4">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Homepage banners</div>
            <Button size="sm" variant="outline" onClick={() => setBanners((b) => [...b, emptyBanner()])}>
              <Plus className="size-4" /> Add banner
            </Button>
          </div>
          {banners.length === 0 && (
            <p className="text-sm text-muted-foreground">No banners yet.</p>
          )}
          {banners.map((b, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Banner {i + 1}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setBanners((l) => move(l, i, -1))}>
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setBanners((l) => move(l, i, 1))}>
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setBanners((l) => l.filter((_, k) => k !== i))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Headline"
                  value={b.headline || ''}
                  onChange={(e) => setBanner(i, { headline: e.target.value })}
                />
                <Input
                  placeholder="Subheadline"
                  value={b.subheadline || ''}
                  onChange={(e) => setBanner(i, { subheadline: e.target.value })}
                />
                <Input
                  placeholder="Button label"
                  value={b.cta_label || ''}
                  onChange={(e) => setBanner(i, { cta_label: e.target.value })}
                />
                <Input
                  placeholder="Button link"
                  value={b.cta_href || ''}
                  onChange={(e) => setBanner(i, { cta_href: e.target.value })}
                />
                <Select value={b.bg_style} onValueChange={(v) => setBanner(i, { bg_style: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BG_STYLES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder={b.bg_style === 'image' ? 'Image URL' : 'Colour / gradient'}
                  value={b.bg_value || ''}
                  onChange={(e) => setBanner(i, { bg_value: e.target.value })}
                />
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs">
                <Switch
                  checked={b.is_active !== false}
                  onCheckedChange={(v) => setBanner(i, { is_active: v })}
                />
                Active
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Deals */}
      <Card className="mb-4">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Today&apos;s deals</div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeals((d) => [...d, { product_id: '', discount_pct: 10 }])}
            >
              <Plus className="size-4" /> Add deal
            </Button>
          </div>
          {deals.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select
                value={d.product_id || ''}
                onValueChange={(v) =>
                  setDeals((l) => l.map((x, k) => (k === i ? { ...x, product_id: v } : x)))
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pick a product" />
                </SelectTrigger>
                <SelectContent>
                  {prodList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                className="w-20"
                min={1}
                max={90}
                value={d.discount_pct}
                onChange={(e) =>
                  setDeals((l) =>
                    l.map((x, k) => (k === i ? { ...x, discount_pct: e.target.value } : x)),
                  )
                }
              />
              <span className="text-sm text-muted-foreground">%</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setDeals((l) => l.filter((_, k) => k !== i))}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          {deals.length === 0 && (
            <p className="text-sm text-muted-foreground">No deals running.</p>
          )}
        </CardContent>
      </Card>

      {/* Featured */}
      <Card className="mb-4">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Featured products</div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFeatured((f) => [...f, ''])}
            >
              <Plus className="size-4" /> Add slot
            </Button>
          </div>
          {featured.map((id, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select
                value={id || ''}
                onValueChange={(v) =>
                  setFeatured((l) => l.map((x, k) => (k === i ? v : x)))
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pick a product" />
                </SelectTrigger>
                <SelectContent>
                  {prodList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" variant="ghost" onClick={() => setFeatured((l) => move(l, i, -1))}>
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setFeatured((l) => l.filter((_, k) => k !== i))}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          {featured.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing featured.</p>
          )}
          {featured.some(Boolean) && (
            <p className="text-xs text-muted-foreground">
              {featured.filter(Boolean).map(prodName).join(', ')}
            </p>
          )}
        </CardContent>
      </Card>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? 'Saving…' : 'Save storefront'}
      </Button>
    </>
  );
}
