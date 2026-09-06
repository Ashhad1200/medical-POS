import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { medicineServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { parseCsv } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const TEMPLATE =
  'name,manufacturer,generic_name,category,batch_number,selling_price,cost_price,quantity,expiry_date,prescription_required\n' +
  'Paracetamol 500mg,Acme,Paracetamol,tablet,B-1,15,8,100,2029-01-01,no';

export function InventoryImportDialog({ open, onOpenChange }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [report, setReport] = useState(null); // server response.data

  const parsed = useMemo(() => parseCsv(text), [text]);

  const run = useMutation({
    mutationFn: (dryRun) =>
      medicineServices.bulkImport(parsed.rows, dryRun).then((r) => r.data.data),
    onSuccess: (data, dryRun) => {
      setReport(data);
      if (!dryRun) {
        toast.success(`Imported ${data.inserted} of ${data.total}`);
        qc.invalidateQueries({ queryKey: ['medicines'] });
      }
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const close = () => {
    setText('');
    setReport(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk import products</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Paste CSV with a header row. Recognised columns: name, manufacturer,
            generic_name, category, batch_number, selling_price, cost_price,
            quantity, low_stock_threshold, expiry_date, prescription_required.
          </p>
          <textarea
            className="h-40 w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
            placeholder={TEMPLATE}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setReport(null);
            }}
          />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{parsed.rows.length} data row(s)</span>
            {parsed.unknownHeaders.length > 0 && (
              <span className="text-amber-600">
                ignored columns: {parsed.unknownHeaders.join(', ')}
              </span>
            )}
            <button
              className="text-primary hover:underline"
              onClick={() => setText(TEMPLATE)}
            >
              load template
            </button>
          </div>

          {report && (
            <div className="rounded-md border border-border p-3 text-sm">
              <div className="mb-2">
                {report.dryRun ? 'Preview: ' : 'Imported: '}
                <strong>{report.inserted}</strong> ok · {report.errorCount} error(s)
              </div>
              {report.errors.length > 0 && (
                <div className="max-h-40 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead>Problem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.errors.map((e) => (
                        <TableRow key={e.row}>
                          <TableCell>{e.row}</TableCell>
                          <TableCell className="text-destructive">{e.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Close
          </Button>
          <Button
            variant="outline"
            disabled={!parsed.rows.length || run.isPending}
            onClick={() => run.mutate(true)}
          >
            Dry run
          </Button>
          <Button
            disabled={!parsed.rows.length || run.isPending}
            onClick={() => run.mutate(false)}
          >
            {run.isPending ? 'Importing…' : `Import ${parsed.rows.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
