import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { storefrontServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { useAuth } from '@/auth/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const STATUS = {
  pending: { variant: 'warning', icon: Clock, label: 'Pending — add the DNS records' },
  verifying: { variant: 'info', icon: Loader2, label: 'Verifying…' },
  active: { variant: 'success', icon: CheckCircle2, label: 'Active' },
  failed: { variant: 'destructive', icon: XCircle, label: 'Failed' },
};

// storeIsLive gates the whole panel — a custom domain is only offered once the
// store is already reachable on its free subdomain (PRODUCT_ROADMAP.md §6a).
export function CustomDomainPanel({ storeIsLive }) {
  const { hasFeature } = useAuth();
  const qc = useQueryClient();
  const [input, setInput] = useState('');

  const enabled = hasFeature('custom_domain') && storeIsLive;

  const q = useQuery({
    queryKey: ['storefront', 'domain'],
    queryFn: async () => (await storefrontServices.getDomain()).data.data,
    enabled,
    retry: false,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['storefront', 'domain'] });

  const add = useMutation({
    mutationFn: () => storefrontServices.addDomain(input.trim()),
    onSuccess: () => {
      toast.success('Domain added — now add the DNS records');
      setInput('');
      invalidate();
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const verify = useMutation({
    mutationFn: () => storefrontServices.verifyDomain(),
    onSuccess: (res) => {
      const s = res.data.data.status;
      toast[s === 'active' ? 'success' : 'message'](
        s === 'active' ? 'Domain is live' : res.data.data.failureReason || 'Not verified yet',
      );
      invalidate();
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: () => storefrontServices.removeDomain(),
    onSuccess: () => {
      toast.success('Domain removed');
      invalidate();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  if (!hasFeature('custom_domain')) return null;

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="text-sm font-semibold text-foreground">Custom domain</div>

        {!storeIsLive && (
          <p className="text-xs text-muted-foreground">
            Make your store live first — a custom domain becomes available once
            it&apos;s running on its free address.
          </p>
        )}

        {enabled && !q.data && (
          <div className="flex gap-2">
            <Input
              placeholder="noorpharmacy.pk or shop.noorpharmacy.pk"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button disabled={!input.trim() || add.isPending} onClick={() => add.mutate()}>
              Add
            </Button>
          </div>
        )}

        {enabled && q.data && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{q.data.domain}</span>
              <Badge
                variant={STATUS[q.data.status]?.variant || 'secondary'}
                appearance="light"
              >
                {STATUS[q.data.status]?.label || q.data.status}
              </Badge>
            </div>

            {q.data.failureReason && q.data.status !== 'active' && (
              <p className="text-xs text-destructive">{q.data.failureReason}</p>
            )}

            {q.data.status !== 'active' && q.data.records && (
              <div className="rounded-md border border-border p-3 text-xs">
                <div className="mb-1 text-muted-foreground">
                  Add these at your domain registrar:
                </div>
                <table className="w-full">
                  <tbody>
                    {q.data.records.map((r, i) => (
                      <tr key={i}>
                        <td className="pe-2 font-mono">{r.type}</td>
                        <td className="pe-2 font-mono break-all">{r.host}</td>
                        <td className="font-mono break-all">{r.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-1 text-muted-foreground">
                  DNS can take a few minutes to 48 hours to propagate.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {q.data.status !== 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={verify.isPending}
                  onClick={() => verify.mutate()}
                >
                  Check now
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                Remove domain
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
