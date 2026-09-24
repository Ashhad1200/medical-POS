import StorePreview from './store-preview';

// Three surfaces, three compositions: a checkout fragment that bleeds off the
// page, a phone you can recolour, and a supplier comparison table.

// Plain hairline rows: the fragments beside them carry the visuals.
function Point({ children }: { children: React.ReactNode }) {
  return <li className="border-t border-foil-deep/60 py-3">{children}</li>;
}

function CounterFragment() {
  const results = [
    {
      name: 'Paracetamol 500 mg',
      batch: 'B-2407',
      exp: '03/27',
      left: 4,
      price: 42,
      first: true,
    },
    {
      name: 'Paracetamol 500 mg',
      batch: 'B-2411',
      exp: '11/27',
      left: 10,
      price: 42,
    },
    {
      name: 'Paracetamol syrup 120 ml',
      batch: 'B-2390',
      exp: '01/27',
      left: 6,
      price: 95,
    },
  ];
  return (
    <div
      className="pf-shadow-ui w-full overflow-hidden rounded-[14px] bg-white text-[0.88rem] xl:min-w-[780px] xl:rounded-r-none"
      role="img"
      aria-label="Counter checkout: searching 'para' lists each batch with its expiry, earliest first"
    >
      <div className="flex items-center gap-3 border-b border-foil px-5 py-4">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-paper px-4 py-2.5">
          <svg
            viewBox="0 0 24 24"
            className="size-4 text-ink-soft"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="m20 20-3.5-3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>para</span>
          <span className="h-4 w-px animate-pulse bg-ink" />
        </div>
        <span className="hidden text-[0.8rem] text-ink-soft sm:inline">
          Counter 1
        </span>
      </div>
      <div className="grid sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <ul className="divide-y divide-foil">
          {results.map((r) => (
            <li
              key={r.batch}
              className={
                r.first ? 'bg-cross-tint/50 px-5 py-3.5' : 'px-5 py-3.5'
              }
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{r.name}</span>
                <span className="pf-num font-semibold">Rs {r.price}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 text-[0.78rem] text-ink-soft">
                <span>Batch {r.batch}</span>
                <span>Expires {r.exp}</span>
                <span className="pf-num">{r.left} left</span>
                {r.first && (
                  <span className="font-semibold text-cross">
                    Sell this one first
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t border-foil bg-paper-bright px-5 py-4 sm:border-l sm:border-t-0">
          <div className="text-[0.8rem] font-semibold text-ink-soft">Sale</div>
          <div className="mt-2 space-y-1.5">
            <div className="flex justify-between">
              <span>Paracetamol 500 mg × 2</span>
              <span className="pf-num">84</span>
            </div>
            <div className="flex justify-between">
              <span>ORS sachets × 1</span>
              <span className="pf-num">90</span>
            </div>
          </div>
          <div className="mt-3 flex justify-between border-t border-foil pt-3 font-bold">
            <span>Total</span>
            <span className="pf-num">Rs 174</span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-1 text-center text-[0.72rem] font-semibold">
            {['Cash', 'Card', 'Bank', 'Credit'].map((p, i) => (
              <span
                key={p}
                className={
                  i === 3
                    ? 'rounded-md bg-ink py-1.5 text-paper'
                    : 'rounded-md bg-foil py-1.5 text-ink-soft'
                }
              >
                {p}
              </span>
            ))}
          </div>
          <div className="mt-2 text-[0.74rem] text-ink-soft">
            On credit to Asif K., shows in dued customers
          </div>
          <div className="mt-4 rounded-full bg-cross py-2.5 text-center text-[0.8rem] font-semibold text-white">
            Complete sale and print
          </div>
        </div>
      </div>
    </div>
  );
}

function SupplierFragment() {
  const rows = [
    {
      name: 'Indus Medical Supply',
      price: '335',
      fill: 98,
      time: 96,
      moq: 2,
      best: true,
    },
    {
      name: 'Ravi Pharma Distribution',
      price: '342',
      fill: 94,
      time: 91,
      moq: 1,
    },
    { name: 'Margalla Traders', price: '350', fill: 91, time: 88, moq: 5 },
  ];
  return (
    <div className="pf-shadow-ui overflow-hidden rounded-[14px] bg-white text-[0.86rem]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-foil px-5 py-4">
        <span className="font-semibold">
          Paracetamol 500 mg, box of 10 strips
        </span>
        <span className="text-[0.78rem] text-ink-soft">
          3 connected suppliers, cheapest first
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <caption className="sr-only">
            Supplier price comparison (sample data)
          </caption>
          <thead className="text-[0.74rem] text-ink-soft">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-semibold">
                Supplier
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                Price
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Filled
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                On time
              </th>
              <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                Min. order
              </th>
            </tr>
          </thead>
          <tbody className="pf-num">
            {rows.map((r) => (
              <tr
                key={r.name}
                className={r.best ? 'bg-cross-tint/50' : 'border-t border-foil'}
              >
                <th scope="row" className="px-5 py-3 font-semibold">
                  {r.name}
                  {r.best && (
                    <span className="ml-2 rounded-full bg-cross px-2 py-0.5 text-[0.66rem] text-white">
                      Cheapest
                    </span>
                  )}
                </th>
                <td className="px-3 py-3 text-right">Rs {r.price}</td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-14 overflow-hidden rounded-full bg-foil">
                      <span
                        className="block h-full bg-cross"
                        style={{ width: `${r.fill}%` }}
                      />
                    </span>
                    {r.fill}%
                  </span>
                </td>
                <td className="px-3 py-3 text-right">{r.time}%</td>
                <td className="px-5 py-3 text-right">{r.moq}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foil bg-paper-bright px-5 py-4">
        <div className="min-w-[220px] flex-1">
          <div className="flex justify-between text-[0.76rem] text-ink-soft">
            <span>Credit used with Indus</span>
            <span className="pf-num">Rs 42,000 of 60,000</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foil">
            <span className="block h-full w-[70%] bg-amber" />
          </div>
        </div>
        <span className="rounded-full bg-cross px-4 py-2 text-[0.8rem] font-semibold text-white">
          Place order
        </span>
      </div>
    </div>
  );
}

export default function Product() {
  return (
    <section
      id="product"
      aria-labelledby="product-title"
      className="overflow-x-clip border-t border-foil-deep/50 bg-paper"
    >
      <div className="pf-wrap pt-24 lg:pt-36">
        <h2 id="product-title" className="pf-display pf-h2 max-w-[18ch]">
          The counter, your online store and your suppliers, in one system.
        </h2>
      </div>

      {/* Counter: text left, checkout bleeding off the right edge */}
      <div className="pf-wrap mt-16 grid items-center gap-10 lg:mt-24 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-4">
          <h3 className="pf-h3">At the counter</h3>
          <p className="pf-body mt-3 text-ink-soft">
            Built for a queue. Search as you type, see every batch and its
            expiry, and let the system choose the one to sell first.
          </p>
          <ul className="mt-6 border-b border-foil-deep/60">
            <Point>
              Cash, card, bank transfer or credit on the same screen
            </Point>
            <Point>Credit sales keep a running list of who owes what</Point>
            <Point>Printed receipts carry the batch that was sold</Point>
            <Point>Bring your product list in from a spreadsheet</Point>
          </ul>
        </div>
        <div className="lg:col-span-8 lg:col-start-5 xl:mr-[calc(-1*(var(--pf-gutter)+max(0px,(100vw-var(--pf-max))/2)))]">
          <CounterFragment />
        </div>
      </div>

      {/* Online store: phone left on a tinted panel, text right */}
      <div className="mt-24 bg-foil/60 lg:mt-36">
        <div className="pf-wrap grid items-center gap-12 py-20 lg:grid-cols-12 lg:gap-6 lg:py-28">
          <div className="lg:col-span-5">
            <StorePreview />
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <h3 className="pf-h3">Your own online store</h3>
            <p className="pf-body mt-3 text-ink-soft">
              Every pharmacy gets a store at its own address, with its own name,
              logo and colour. It lists what you have in stock, at your counter
              price, and nothing that needs a prescription.
            </p>
            <ul className="mt-6 border-b border-foil-deep/60">
              <Point>Run your own banners, deals and featured products</Point>
              <Point>
                Cash on delivery, pay in store, or JazzCash where it’s switched
                on
              </Point>
              <Point>
                Deliver with your own rider or book PostEx from the order
              </Point>
              <Point>Customers track their order with their phone number</Point>
              <Point>Use your own domain on Pro and Enterprise</Point>
            </ul>
            <p className="pf-small mt-6 text-ink-soft">
              The online store comes with Pro and Enterprise.
            </p>
          </div>
        </div>
      </div>

      {/* Suppliers: text left, comparison right */}
      <div className="pf-wrap grid items-center gap-10 py-24 lg:grid-cols-12 lg:gap-6 lg:py-36">
        <div className="lg:col-span-4">
          <h3 className="pf-h3">Your suppliers</h3>
          <p className="pf-body mt-3 text-ink-soft">
            Connect to the distributors you already buy from. When something
            runs low, compare their prices and track records, then order in two
            taps instead of a phone call.
          </p>
          <ul className="mt-6 border-b border-foil-deep/60">
            <Point>
              Fill rate and on-time rate from your own order history
            </Point>
            <Point>
              Minimum order quantities and credit limits checked before you send
            </Point>
            <Point>
              Return near-expiry stock against a received order for credit
            </Point>
            <Point>
              Suppliers get their own login for their catalogue and incoming
              orders
            </Point>
          </ul>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <SupplierFragment />
        </div>
      </div>
    </section>
  );
}
