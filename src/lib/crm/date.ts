const italianDayFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
export const italianDateKey = (date: Date = new Date()) => italianDayFormatter.format(date);
export const italianDateAfterDays = (days: number) => {
  const [year, month, day] = italianDateKey().split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10);
};
