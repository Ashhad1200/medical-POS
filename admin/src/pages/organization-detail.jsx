import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, KeyRound, PauseCircle, PlayCircle } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { date, dateTime, int } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function Section({ title, children, actions }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {actions}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function OrganizationDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['platform'] });

  const detail = useQuery({
    queryKey: ['platform', 'organization', id],
    queryFn: async () => (await api.get(`/platform/organizations/${id}`)).data.data,
  });
  const plans = useQuery({
    queryKey: ['platform', 'plans'],
    queryFn: async () => (await api.get('/platform/plans')).data.data,
  });

  const [planCode, setPlanCode] = useState('');
  const [extendDays, setExtendDays] = useState('30');

  const changePlan = useMutation({
    mutationFn: () =>
      api.patch(`/platform/organizations/${id}/plan`, { planCode }),
    onSuccess: () => {
      toast.success('Plan changed');
      invalidate();
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const extend = useMutation({
    mutationFn: () =>
      api.patch(`/platform/organizations/${id}/access`, {
        extendDays: Number(extendDays),
      }),
    onSuccess: () => {
      toast.success('Access window extended');
      invalidate();
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const setStatus = useMutation({
    mutationFn: (action) =>
      api.patch(`/platform/organizations/${id}/status`, { action }),
    onSuccess: (_, action) => {
      toast.success(action === 'suspend' ? 'Suspended' : 'Reactivated');
      invalidate();
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const revoke = useMutation({
    mutationFn: (userId) =>
      api.post(`/platform/users/${userId}/revoke-session`),
    onSuccess: () => {
      toast.success('Session revoked');
      invalidate();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  if (detail.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (detail.isError)
    return <div className="text-sm text-destructive">{apiError(detail.error)}</div>;

  const { organization: o, users, usage, events } = detail.data;

  return (
    <>
      <Link
        to="/organizations"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Organizations
      </Link>

      <PageHeader title={o.name} description={o.code}>
        {o.is_active ? (
          <Button
            variant="outline"
            onClick={() => setStatus.mutate('suspend')}
            disabled={setStatus.isPending}
          >
            <PauseCircle className="size-4" /> Suspend
          </Button>
        ) : (
          <Button
            onClick={() => setStatus.mutate('reactivate')}
            disabled={setStatus.isPending}
          >
            <PlayCircle className="size-4" /> Reactivate
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Subscription">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium">{o.plan_name || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge
                  variant={o.is_active ? 'success' : 'destructive'}
                  appearance="light"
                >
                  {o.is_active ? o.plan_status : 'inactive'}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Access until</dt>
              <dd>{date(o.access_valid_till)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">User seats</dt>
              <dd>
                {int(usage.users)}
                {o.plan_max_users ? ` / ${o.plan_max_users}` : ' / ∞'}
              </dd>
            </div>
          </dl>
        </Section>

        <Section title="Usage">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Active users</dt>
              <dd>{int(usage.users)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Products</dt>
              <dd>{int(usage.products)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Orders</dt>
              <dd>{int(usage.orders)}</dd>
            </div>
          </dl>
        </Section>

        <Section title="Controls">
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">Change plan</div>
              <div className="flex gap-2">
                <Select value={planCode} onValueChange={setPlanCode}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={o.plan_name || 'Select plan'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(plans.data || []).map((p) => (
                      <SelectItem key={p.code} value={p.code}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => changePlan.mutate()}
                  disabled={!planCode || changePlan.isPending}
                >
                  Apply
                </Button>
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-muted-foreground">
                Extend access
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  className="w-24"
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={() => extend.mutate()}
                  disabled={extend.isPending}
                >
                  + days
                </Button>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <div className="mt-4">
        <Section title={`Users (${users.length})`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="text-end">Session</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.full_name || u.username}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell className="capitalize">{u.role_in_pos}</TableCell>
                  <TableCell>
                    <Badge
                      variant={u.is_active ? 'success' : 'secondary'}
                      appearance="light"
                    >
                      {u.is_active ? 'active' : 'inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{dateTime(u.last_login)}</TableCell>
                  <TableCell className="text-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revoke.mutate(u.id)}
                    >
                      <KeyRound className="size-3.5" /> Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      </div>

      <div className="mt-4">
        <Section title="Subscription history">
          {events.length ? (
            <div className="divide-y divide-border">
              {events.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span>
                    <span className="font-medium capitalize">
                      {e.event_type.replace('_', ' ')}
                    </span>
                    {e.notes ? (
                      <span className="text-muted-foreground"> — {e.notes}</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {dateTime(e.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No events.</div>
          )}
        </Section>
      </div>
    </>
  );
}
