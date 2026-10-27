export function upcomingWeek(today: string): { start: string; end: string } {
  // pin "today" to UTC midnight
  const date = new Date(`${today}T00:00:00Z`);
  const day = date.getUTCDay(); // Sunday is 0, Monday is 1, etc. for the whole week

  let daysToNextStart = (1 - day + 7) % 7;

  // make sure we go forward a week if we are running on a Monday
  if (daysToNextStart === 0) {
    daysToNextStart = 7;
  }

  // we mutate in place so date is the upcoming Monday
  date.setUTCDate(date.getUTCDate() + daysToNextStart);

  const daysToNextEnd = 6;

  // just go forward six days
  const nextSunday = new Date(date);
  nextSunday.setUTCDate(nextSunday.getUTCDate() + daysToNextEnd);

  const start = date.toISOString().slice(0, 10);
  const end = nextSunday.toISOString().slice(0, 10);

  return { start, end };
}
