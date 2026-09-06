import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { connectionServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { money } from '@/lib/format';
import { useAuth } from '@/auth/auth-context';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const STATUS = {
  pending: 'warning',
  active: 'success',
  paused: 'secondary',
  revoked: 'destructive',
};

function ApproveDialog({ conn, open, onOpenChange, onApprove, busy }) {
  const [limit, setLimit] = useState(conn?.credit_limit || 0);
  const [terms, setTerms] = useState(conn?.payment_terms_days || 30);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Approve {conn?.pharmacy_name}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="space-y-1.5">
            <Label>Credit limit</Label>
            <Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment terms (days)</Label>
            <Input type="number" value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={busy}
            onClick={() =>
              onApprove({ creditLimit: Number(limit), paymentTermsDays: Number(terms) })
            }
          >
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectionsPage() {
  const { orgType } = useAuth();
  const isSupplier = orgType === 'supplier';
  const qc = useQueryClient();
  const [approving, setApproving] = useState(null);
  const [code, setCode] = useState('');
  const [reqOpen, setReqOpen] = useState(false);

  const q = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await connectionServices.list()).data.data,
  });

  const request = useMutation({
    mutationFn: () => connectionServices.request(code.trim()),
    onSuccess: () => {
      toast.success('Request sent');
      qc.invalidateQueries({ queryKey: ['connections'] });
      setReqOpen(false);
      setCode('');
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const respond = useMutation({
    mutationFn: ({ id, body }) => connectionServices.respond(id, body),
    onSuccess: () => {
      toast.success('Updated');
      qc.invalidateQueries({ queryKey: ['connections'] });
      setApproving(null);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const rows = q.data || [];

  return (
    <>
      <PageHeader
        title="Connections"
        description={
          isSupplier
            ? 'Pharmacies you supply to.'
            : 'Suppliers you can reorder from.'
        }
      >
        {!isSupplier && (
          <Button onClick={() => setReqOpen(true)}>
            <Plus className="size-4" /> Connect a supplier
          </Button>
        )}
      </PageHeader>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isSupplier ? 'Pharmacy' : 'Supplier'}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-end">Credit limit</TableHead>
              <TableHead className="text-end">Terms</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow><TableCell colSpan={5} className="text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-medium">
                    {isSupplier ? c.pharmacy_name : c.supplier_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isSupplier ? c.pharmacy_code : c.supplier_code}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS[c.status] || 'secondary'} appearance="light">
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-end">{money(c.credit_limit)}</TableCell>
                <TableCell className="text-end">{c.payment_terms_days}d</TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-1">
                    {isSupplier && ['pending', 'paused'].includes(c.status) && (
                      <Button variant="ghost" size="sm" onClick={() => setApproving(c)}>
                        Approve
                      </Button>
                    )}
                    {isSupplier && c.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => respond.mutate({ id: c.id, body: { action: 'pause' } })}
                      >
                        Pause
                      </Button>
                    )}
                    {['pending', 'active', 'paused'].includes(c.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => respond.mutate({ id: c.id, body: { action: 'revoke' } })}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!q.isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-muted-foreground">No connections yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Connect a supplier</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-2">
            <Label>Supplier code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ask your supplier for their code"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReqOpen(false)}>Cancel</Button>
            <Button onClick={() => request.mutate()} disabled={request.isPending || !code.trim()}>
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {approving && (
        <ApproveDialog
          conn={approving}
          open
          busy={respond.isPending}
          onOpenChange={(v) => !v && setApproving(null)}
          onApprove={(body) =>
            respond.mutate({ id: approving.id, body: { action: 'approve', ...body } })
          }
        />
      )}
    </>
  );
}
