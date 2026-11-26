export const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60_000);

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 24 * 60 * 60_000);

export const isFuture = (date: Date, leewayMinutes = 0): boolean =>
  date.getTime() > Date.now() + leewayMinutes * 60_000;
