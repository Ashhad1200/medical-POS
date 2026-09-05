export const money = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

export const int = (n) => new Intl.NumberFormat('en-US').format(Number(n || 0));

export const date = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

export const dateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
