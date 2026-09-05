import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { date, int } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const STATUS_BADGE = {
  active: 'success',
  trialing: 'info',
  suspended: 'destructive',
  past_due: 'warning',
  canceled: 'secondary',
};

function CreateOrgDialog({ open, onOpenChange, plans }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: '',
    code: '',
    email: '',
    planCode: 'basic',
    adminUsername: '',
    adminEmail: '',
    adminPassword: '',
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target?.value ?? e }));

  const mut = useMutation({
    mutationFn: () =>
      api.post('/platform/organizations', {
        name: f.name,
        code: f.code,
        email: f.email || undefined,
        planCode: f.planCode,
        admin: {
          username: f.adminUsername,
          email: f.adminEmail,
          password: f.adminPassword,
          fullName: f.adminUsername,
        },
      }),
    onSuccess: () => {
      toast.success('Organization provisioned');
      qc.invalidateQueries({ queryKey: ['platform'] });
      onOpenChange(false);
      setF((s) => ({ ...s, name: '', code: '', email: '', adminUsername: '', adminEmail: '', adminPassword: '' }));
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New organization</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={f.name} onChange={set('name')} />
            </div>
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={f.code} onChange={set('code')} placeholder="acme-pharmacy" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Billing email</Label>
              <Input value={f.email} onChange={set('email')} />
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={f.planCode} onValueChange={set('planCode')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(plans || []).map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <div className="mb-2 text-sm font-medium">First administrator</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input value={f.adminUsername} onChange={set('adminUsername')} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={f.adminEmail} onChange={set('adminEmail')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Temporary password</Label>
                <Input
                  type="text"
                  value={f.adminPassword}
                  onChange={set('adminPassword')}
                />
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={
              mut.isPending ||
              !f.name ||
              !f.code ||
              !f.adminUsername ||
              !f.adminEmail ||
              !f.adminPassword
            }
          >
            {mut.isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OrganizationsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState(false);

  const plans = useQuery({
    queryKey: ['platform', 'plans'],
    queryFn: async () => (await api.get('/platform/plans')).data.data,
  });

  const orgs = useQuery({
    queryKey: ['platform', 'organizations', { search, status }],
    queryFn: async () =>
      (
        await api.get('/platform/organizations', {
          params: { search: search || undefined, status, limit: 100 },
        })
      ).data.data,
  });

  return (
    <>
      <PageHeader
        title="Organizations"
        description="Every tenant on the platform."
      >
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> New organization
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-64">
          <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-8"
            placeholder="Search name, code, email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['all', 'active', 'trialing', 'suspended', 'inactive', 'expired'].map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Access until</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {orgs.data?.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <Link
                    to={`/organizations/${o.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {o.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{o.code}</div>
                </TableCell>
                <TableCell>{o.plan_name || '—'}</TableCell>
                <TableCell>
                  <Badge
                    variant={STATUS_BADGE[o.plan_status] || 'secondary'}
                    appearance="light"
                  >
                    {o.is_active ? o.plan_status : 'inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {int(o.active_users)}
                  {o.max_users ? (
                    <span className="text-muted-foreground"> / {o.max_users}</span>
                  ) : null}
                </TableCell>
                <TableCell>{date(o.access_valid_till)}</TableCell>
                <TableCell>{date(o.created_at)}</TableCell>
              </TableRow>
            ))}
            {orgs.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No organizations match.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <CreateOrgDialog open={open} onOpenChange={setOpen} plans={plans.data} />
    </>
  );
}
