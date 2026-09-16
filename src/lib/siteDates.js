// Date handling for the stop editor's <input type="date">, done on the site's
// own clock.
//
// Every stop date is displayed in America/Los_Angeles (see formatStopDate in
// src/app/[...slug]/page.js), so the editor has to read and write dates in that
// zone too. It used to do both in UTC, which caused two bugs:
//   - Loading: the box showed the UTC calendar date, so a stop logged after
//     5pm Pacific (in summer) opened showing the NEXT day.
//   - Saving: the time of day was discarded and replaced with 00:00 UTC, which
//     is 5pm the PREVIOUS day in Pacific. Just opening a stop and saving it
//     moved its published date back a day and set the time to 5:00pm.
//
// Pure functions with no browser or filesystem dependencies, so the client
// form can import them and they can be tested directly under Node.

export const SITE_TIME_ZONE = 'America/Los_Angeles';

const pad = (n) => String(n).padStart(2, '0');

// Wall-clock parts of an instant as seen in `timeZone`. hourCycle h23 rather
// than hour12:false, which some engines render as "24" at midnight.
function wallParts(ms, timeZone = SITE_TIME_ZONE) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}

// Epoch seconds for a wall-clock time in the site's zone. Starts by treating
// the wall time as if it were UTC, then corrects by however far off that
// guess reads on the site clock; a second pass settles DST-boundary cases.
function wallTimeToEpoch(y, mo, d, h, mi, s) {
  const target = Date.UTC(y, mo - 1, d, h, mi, s);
  let guess = target;
  for (let i = 0; i < 2; i++) {
    const p = wallParts(guess);
    guess += target - Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  }
  return Math.floor(guess / 1000);
}

// "YYYY-MM-DD" for the date input: the calendar date on the site's clock.
export function toSiteDateInput(unixSeconds) {
  if (!unixSeconds) return '';
  const ms = Number(unixSeconds) * 1000;
  if (Number.isNaN(ms)) return '';
  const p = wallParts(ms);
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
}

// Turn the date input's value back into a timestamp.
//   - Date unchanged: the ORIGINAL timestamp, untouched, to the second. Saving
//     a stop for an unrelated reason must never alter its date.
//   - Date changed: the new day, keeping the original time of day.
//   - No original (a new stop): noon on the site's clock — the middle of the
//     day, so no time-zone edge can push it onto a neighbouring date.
//   - Box cleared: 0, as before.
export function fromSiteDateInput(dateStr, originalUnixSeconds) {
  if (!dateStr) return 0;
  const original = Number(originalUnixSeconds) || 0;
  if (original && dateStr === toSiteDateInput(original)) return original;

  const [y, mo, d] = dateStr.split('-').map(Number);
  let h = 12, mi = 0, s = 0;
  if (original) ({ h, mi, s } = wallParts(original * 1000));
  return wallTimeToEpoch(y, mo, d, h, mi, s);
}
