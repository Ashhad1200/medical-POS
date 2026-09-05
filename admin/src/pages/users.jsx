import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KeyRound, Search } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const users = useQuery({
    queryKey: ['platform', 'users', { search }],
    queryFn: async () =>
      (
        await api.get('/platform/users', {
          params: { search: search || undefined, limit: 100 },
        })
      ).data.data,
  });

  const revoke = useMutation({
    mutationFn: (id) => api.post(`/platform/users/${id}/revoke-session`),
    onSuccess: () => {
      toast.success('Session revoked');
      qc.invalidateQueries({ queryKey: ['platform', 'users'] });
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const toggle = useMutation({
    mutationFn: ({ id, isActive }) =>
      api.patch(`/platform/users/${id}/status`, { isActive }),
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['platform', 'users'] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <>
      <PageHeader
        title="Users"
        description="Every tenant user across all organizations."
      />

      <div className="mb-4 relative w-72">
        <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="ps-8"
          placeholder="Search name, email, username"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {users.data?.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.full_name || u.username}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell>
                  <Link
                    to={`/organizations/${u.organization_id}`}
                    className="text-primary hover:underline"
                  >
                    {u.organization_name}
                  </Link>
                </TableCell>
                <TableCell className="capitalize">{u.role_in_pos}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={u.is_active ? 'success' : 'secondary'}
                      appearance="light"
                    >
                      {u.is_active ? 'active' : 'inactive'}
                    </Badge>
                    {u.has_session && (
                      <Badge variant="info" appearance="light">
                        online
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{dateTime(u.last_login)}</TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revoke.mutate(u.id)}
                    >
                      <KeyRound className="size-3.5" /> Revoke
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggle.mutate({ id: u.id, isActive: !u.is_active })
                      }
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
