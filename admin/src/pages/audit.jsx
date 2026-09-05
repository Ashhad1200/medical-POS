import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AuditPage() {
  const logs = useQuery({
    queryKey: ['platform', 'audit-logs'],
    queryFn: async () =>
      (await api.get('/platform/audit-logs', { params: { limit: 100 } })).data
        .data,
  });

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Tenant activity recorded across the platform."
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {logs.data?.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {dateTime(l.created_at)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" appearance="light">
                    {l.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  {l.entity}
                  {l.entity_id ? (
                    <span className="text-muted-foreground">
                      {' '}
                      · {String(l.entity_id).slice(0, 8)}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>{l.organization_name || '—'}</TableCell>
                <TableCell>{l.user_name || '—'}</TableCell>
              </TableRow>
            ))}
            {logs.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No audit entries yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
