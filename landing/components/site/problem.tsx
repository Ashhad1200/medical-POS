// The problem, told as a stock count that doesn't reconcile. Dark and quiet
// after the loud hero; nothing moves here.

const ROWS: { where: string; says: string; note?: string; truth?: boolean }[] =
  [
    { where: 'The counter register', says: '14' },
    {
      where: 'WhatsApp to the distributor',
      says: '“Send 20 more”',
      note: 'a guess, made on Tuesday',
    },
    { where: 'What a customer was told', says: '“Yes, available”' },
    {
      where: 'What is actually on the shelf',
      says: '9',
      note: 'and 3 of those expire in March',
      truth: true,
    },
  ];

export default function Problem() {
  return (
    <section
      aria-labelledby="problem-title"
      className="on-ink bg-ink text-paper"
    >
      <div className="pf-wrap py-24 lg:py-36">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-6">
          <h2 id="problem-title" className="pf-display pf-h2 lg:col-span-7">
            Most medical stores keep the same medicine in three places. None of
            them agree.
          </h2>
          <p className="pf-body text-ink-mute lg:col-span-4 lg:col-start-9 lg:self-end">
            A register at the counter, a chat with the order booker, and
            whatever the shop tells customers is in stock. Each one is updated
            by a different person at a different time, so the shelf is the only
            place that knows, and nobody has time to count it.
          </p>
        </div>

        <figure className="mt-16 lg:mt-24">
          <figcaption className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-white/15 pb-4">
            <span className="text-[1.05rem] font-semibold">
              Paracetamol 500 mg. How many do you have?
            </span>
            <span className="pf-small text-ink-mute">A normal Thursday</span>
          </figcaption>
          <dl className="divide-y divide-white/10">
            {ROWS.map((r) => (
              <div
                key={r.where}
                className="grid grid-cols-1 gap-1 py-5 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:items-baseline sm:gap-8 lg:py-6"
              >
                <dt
                  className={
                    r.truth ? 'font-semibold text-paper' : 'text-ink-mute'
                  }
                >
                  {r.where}
                  {r.note && (
                    <span
                      className={
                        r.truth
                          ? 'block text-[0.9rem] font-normal text-amber'
                          : 'block text-[0.9rem] text-ink-mute/80'
                      }
                    >
                      {r.note}
                    </span>
                  )}
                </dt>
                <dd
                  className={
                    'pf-display pf-num text-[clamp(2.4rem,1.5rem+3vw,4.5rem)] ' +
                    (r.truth ? 'text-amber' : 'text-paper/85')
                  }
                  style={{ fontStretch: '70%' }}
                >
                  {r.says}
                </dd>
              </div>
            ))}
          </dl>
        </figure>

        <p
          className="mt-16 max-w-[26ch] pf-display text-[clamp(1.9rem,1.2rem+2.2vw,3rem)] lg:mt-24"
          style={{ fontStretch: '80%' }}
        >
          PharmaFlow keeps one number, and everything else reads from it.
        </p>
      </div>
    </section>
  );
}
