import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Minus, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { medicineServices, orderServices } from '@/lib/services';
import { apiError } from '@/lib/api';
import { money } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { OrderReceipt } from '@/components/order-receipt';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function CreateOrderPage() {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]); // {id, name, unit_price, quantity, stock}
  const [lastReceipt, setLastReceipt] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  const results = useQuery({
    queryKey: ['medicines', 'search', search],
    queryFn: async () =>
      (await medicineServices.getAll({ search, limit: 20 })).data.data.medicines,
    enabled: search.trim().length >= 2,
  });

  const addItem = (m) => {
    const price = Number(m.max_price ?? m.selling_price ?? 0);
    const stock = Number(m.total_quantity ?? m.quantity ?? 0);
    setCart((c) => {
      const found = c.find((x) => x.id === m.id);
      if (found)
        return c.map((x) =>
          x.id === m.id ? { ...x, quantity: x.quantity + 1 } : x,
        );
      return [...c, { id: m.id, name: m.name, unit_price: price, quantity: 1, stock }];
    });
  };
  const setQty = (id, q) =>
    setCart((c) =>
      c
        .map((x) => (x.id === id ? { ...x, quantity: Math.max(0, q) } : x))
        .filter((x) => x.quantity > 0),
    );
  const setPrice = (id, p) =>
    setCart((c) => c.map((x) => (x.id === id ? { ...x, unit_price: p } : x)));

  const subtotal = useMemo(
    () => cart.reduce((s, x) => s + x.unit_price * x.quantity, 0),
    [cart],
  );

  const checkout = useMutation({
    mutationFn: () =>
      orderServices.create({
        customer_name: customerName || 'Walk-in',
        customer_phone: customerPhone || undefined,
        items: cart.map((x) => ({
          medicine_id: x.id,
          quantity: x.quantity,
          unit_price: x.unit_price,
          total_price: x.unit_price * x.quantity,
        })),
        subtotal,
        total_amount: subtotal,
        tax_amount: 0,
        discount: 0,
        payment_method: paymentMethod,
        amount_paid: amountPaid === '' ? subtotal : Number(amountPaid),
        notes: notes || undefined,
        status: 'completed',
      }),
    onSuccess: (res) => {
      const num = res.data?.data?.order_number || res.data?.data?.orderNumber;
      toast.success(`Order ${num || ''} completed`);
      setLastReceipt({
        order_number: num,
        created_at: new Date().toISOString(),
        customer_name: customerName || 'Walk-in',
        customer_phone: customerPhone || undefined,
        subtotal,
        discount: 0,
        tax_amount: 0,
        total_amount: subtotal,
        order_items: cart.map((x) => ({
          id: x.id,
          medicine_name: x.name,
          quantity: x.quantity,
          unit_price: x.unit_price,
          total_price: x.unit_price * x.quantity,
        })),
      });
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setAmountPaid('');
      setNotes('');
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <>
      <PageHeader title="New order" description="Search products and check out.">
        {lastReceipt && (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Print receipt {lastReceipt.order_number}
          </Button>
        )}
      </PageHeader>

      {lastReceipt && <OrderReceipt order={lastReceipt} />}


      <div className="grid gap-4 lg:grid-cols-3">
        {/* search + results */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="ps-8"
                  placeholder="Search products (min 2 chars)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              {search.trim().length >= 2 && (
                <div className="mt-3 divide-y divide-border">
                  {results.isLoading && (
                    <div className="py-3 text-sm text-muted-foreground">
                      Searching…
                    </div>
                  )}
                  {(results.data || []).map((m) => {
                    const stock = Number(m.total_quantity ?? m.quantity ?? 0);
                    return (
                      <button
                        key={m.id}
                        onClick={() => addItem(m)}
                        disabled={stock <= 0}
                        className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm hover:bg-muted disabled:opacity-40"
                      >
                        <span>
                          <span className="font-medium">{m.name}</span>{' '}
                          <span className="text-muted-foreground">
                            · {m.manufacturer}
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            {stock} in stock
                          </span>
                          <span className="font-medium">
                            {money(m.max_price ?? m.selling_price ?? 0)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                  {results.data && results.data.length === 0 && (
                    <div className="py-3 text-sm text-muted-foreground">
                      No matches.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Cart is empty.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {cart.map((x) => (
                    <div
                      key={x.id}
                      className="flex items-center gap-3 p-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{x.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {x.stock} in stock
                        </div>
                      </div>
                      <Input
                        type="number"
                        className="w-24"
                        value={x.unit_price}
                        onChange={(e) =>
                          setPrice(x.id, Number(e.target.value))
                        }
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => setQty(x.id, x.quantity - 1)}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="w-8 text-center">{x.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => setQty(x.id, x.quantity + 1)}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                      <div className="w-24 text-end font-medium">
                        {money(x.unit_price * x.quantity)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setQty(x.id, 0)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* checkout panel */}
        <Card className="h-fit">
          <CardContent className="space-y-4 p-5">
            <div className="space-y-2">
              <Label>Customer name</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['cash', 'card', 'credit', 'bank'].map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount received</Label>
              <Input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder={String(subtotal)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span>{cart.reduce((s, x) => s + x.quantity, 0)}</span>
              </div>
              <div className="mt-1 flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{money(subtotal)}</span>
              </div>
              {amountPaid !== '' && Number(amountPaid) > subtotal && (
                <div className="mt-1 flex justify-between text-green-600">
                  <span>Change</span>
                  <span>{money(Number(amountPaid) - subtotal)}</span>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={cart.length === 0 || checkout.isPending}
              onClick={() => checkout.mutate()}
            >
              {checkout.isPending ? 'Processing…' : `Charge ${money(subtotal)}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
