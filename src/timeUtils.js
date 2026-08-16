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
