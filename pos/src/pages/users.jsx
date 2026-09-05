import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { userServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ROLES = ['counter', 'warehouse', 'manager', 'admin'];

function UserDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: 'counter',
  });
  const set = (k) => (e) =>
    setF((s) => ({ ...s, [k]: e.target?.value ?? e }));

  const mut = useMutation({
    mutationFn: () => userServices.create(f),
    onSuccess: () => {
      toast.success('User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      onOpenChange(false);
      setF({ fullName: '', username: '', email: '', password: '', role: 'counter' });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={f.fullName} onChange={set('fullName')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input value={f.username} onChange={set('username')} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={f.role} onValueChange={set('role')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={f.email} onChange={set('email')} />
          </div>
          <div className="space-y-1.5">
            <Label>Temporary password</Label>
            <Input value={f.password} onChange={set('password')} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={
              mut.isPending || !f.fullName || !f.username || !f.email || !f.password
            }
          >
            {mut.isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await userServices.getAll()).data.data,
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }) => userServices.updateStatus(id, { isActive }),
    onSuccess: () => {
      toast.success('Updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const rows = q.data?.users || [];

  return (
    <>
      <PageHeader title="Users" description="Staff accounts for this store.">
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> New user
        </Button>
      </PageHeader>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.fullName || u.username}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell className="capitalize">{u.role}</TableCell>
                <TableCell>
                  <Badge
                    variant={u.isActive ? 'success' : 'secondary'}
                    appearance="light"
                  >
                    {u.isActive ? 'active' : 'inactive'}
                  </Badge>
                </TableCell>
                <TableCell>{dateTime(u.lastLogin)}</TableCell>
                <TableCell className="text-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toggle.mutate({ id: u.id, isActive: !u.isActive })
                    }
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <UserDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
