/**
 * Time Utilities
 * Shared helpers for HH:MM time-string arithmetic. Centralized here because
 * this exact "add N minutes to a time string, wrapping safely across
 * midnight" calculation was previously reimplemented separately in
 * coreTimer.js, segmentManager.js, and timer.html - which is exactly how the
 * midnight-crossing bug (negative/malformed times like "-1:-25") happened in
 * segmentManager.js. One implementation, used everywhere.
 */

/**
 * Add (or subtract) whole minutes to/from a "HH:MM" time string, safely
 * wrapping across midnight in either direction.
 * @param {string} timeStr - Time in HH:MM format
 * @param {number} minutesToAdd - Minutes to add (may be negative)
 * @returns {string} Resulting time in HH:MM format
 */
export function addMinutesToTimeStr(timeStr, minutesToAdd) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const total = hours * 60 + minutes + minutesToAdd;
  const normalized = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Parse a "HH:MM" time string into minutes since midnight.
 * @param {string} timeStr - Time in HH:MM format
 * @returns {number} Minutes since midnight (0-1439)
 */
export function parseTimeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Resolve an "HH:MM" time-of-day to a real timestamp near `nowMs`.
 * A schedule never spans more than a day, so the time is taken as the
 * occurrence within 12 hours either side of now: at 22:00, "00:30" means
 * tomorrow 00:30 (2.5h ahead), not today's (21.5h ago); at 18:00, "09:00"
 * means this morning (9h ago, i.e. already over). This is what makes
 * schedules that cross midnight work.
 * @param {string} timeStr - Time in HH:MM format
 * @param {number} [nowMs=Date.now()]
 * @returns {number} Epoch milliseconds
 */
export function resolveTimeNearNow(timeStr, nowMs = Date.now()) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date(nowMs);
  d.setHours(hours, minutes, 0, 0);
  const HALF_DAY = 12 * 60 * 60 * 1000;
  if (nowMs - d.getTime() > HALF_DAY) d.setDate(d.getDate() + 1);
  else if (d.getTime() - nowMs > HALF_DAY) d.setDate(d.getDate() - 1);
  return d.getTime();
}

/**
 * Sort segments ({ time: "HH:MM", ... }) into chronological order using the
 * same 12-hours-either-side rule as resolveTimeNearNow, so "23:30, 00:00"
 * stays in that order instead of being sorted by clock time.
 * @param {Array<{time: string}>} segments - sorted in place
 * @param {number} [nowMs=Date.now()]
 */
export function sortSegmentsChronologically(segments, nowMs = Date.now()) {
  return segments.sort((a, b) => resolveTimeNearNow(a.time, nowMs) - resolveTimeNearNow(b.time, nowMs));
}

/** Valid "H:MM"/"HH:MM" 24-hour time. */
export const TIME_PATTERN = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;

/**
 * Validate and normalise one segment. Returns null if it isn't valid, so
 * untrusted URL text can never reach the page as markup.
 * @returns {{time: string, duration: number, mode: 'up'|'down'} | null}
 */
export function normaliseSegment(time, duration, mode) {
  const t = String(time || '').trim();
  const d = parseInt(duration, 10);
  const m = String(mode || 'down').trim().toLowerCase();
  if (!TIME_PATTERN.test(t)) return null;
  if (!Number.isInteger(d) || d < 1 || d > 480) return null;
  if (m !== 'up' && m !== 'down') return null;
  const [h, mm] = t.split(':');
  return { time: `${h.padStart(2, '0')}:${mm}`, duration: d, mode: m };
}

/** Escape text for safe insertion into HTML. */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
