/**
 * timeParser.js — Natural-language date parser
 *
 * Handles formats like:
 *   "Closes on Tuesday"
 *   "Ends 12 June 2025"
 *   "Closes on 25th March"
 *   "Registration ends Friday"
 */

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

/**
 * Try to extract a future Date from a message string.
 * Returns a Date object or null if no valid date found.
 */
function parse(text) {
  if (!text || typeof text !== 'string') return null;

  const cleaned = text.toLowerCase().trim();

  /* ── Try day-of-week ("tuesday", "closes on friday") ── */

  for (let i = 0; i < DAY_NAMES.length; i++) {
    if (cleaned.includes(DAY_NAMES[i])) {
      return getNextDayOfWeek(i);
    }
  }

  /* ── Try "DD Month YYYY" or "DD Month" ("12 June 2025", "25th March") ── */

  const dateRegex = /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?/i;
  const match = cleaned.match(dateRegex);

  if (match) {
    const day = parseInt(match[1], 10);
    const monthIndex = MONTH_NAMES.indexOf(match[2].toLowerCase());
    const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();

    if (monthIndex >= 0 && day >= 1 && day <= 31) {
      const date = new Date(year, monthIndex, day, 23, 59, 59);

      // If the date is in the past and no year was specified, bump to next year
      if (!match[3] && date < new Date()) {
        date.setFullYear(date.getFullYear() + 1);
      }

      return date;
    }
  }

  /* ── Try "Month DD YYYY" or "Month DD" ("June 12 2025", "March 25") ── */

  const altRegex = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?/i;
  const altMatch = cleaned.match(altRegex);

  if (altMatch) {
    const monthIndex = MONTH_NAMES.indexOf(altMatch[1].toLowerCase());
    const day = parseInt(altMatch[2], 10);
    const year = altMatch[3] ? parseInt(altMatch[3], 10) : new Date().getFullYear();

    if (monthIndex >= 0 && day >= 1 && day <= 31) {
      const date = new Date(year, monthIndex, day, 23, 59, 59);

      if (!altMatch[3] && date < new Date()) {
        date.setFullYear(date.getFullYear() + 1);
      }

      return date;
    }
  }

  return null;
}

/**
 * Get the next occurrence of a day-of-week (0=Sun, 6=Sat).
 * Always returns a future date, end of day.
 */
function getNextDayOfWeek(targetDay) {
  const now = new Date();
  const current = now.getDay();

  let daysAhead = targetDay - current;
  if (daysAhead <= 0) daysAhead += 7; // Always push to next week if today or past

  const result = new Date(now);
  result.setDate(result.getDate() + daysAhead);
  result.setHours(23, 59, 59, 0);

  return result;
}

module.exports = { parse };
