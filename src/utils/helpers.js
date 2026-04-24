/**
 * helpers.js — Dukaan AI
 * General utility functions
 */

/**
 * Format number as Pakistani Rupees
 * @param {number} n
 * @returns {string}
 */
function formatRs(n) {
  if (n >= 100000) return 'Rs ' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000)   return 'Rs ' + (n / 1000).toFixed(1) + 'k';
  return 'Rs ' + n;
}

/**
 * Get current day name
 * @returns {string}
 */
function todayName() {
  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return days[new Date().getDay()];
}

/**
 * Get today's date string
 * @returns {string}
 */
function todayStr() {
  return new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Stock bar color based on days left
 * @param {number} dl - days left
 * @returns {string} CSS color
 */
function barColor(dl) {
  if (dl <= 3) return '#E05252';
  if (dl <= 7) return '#E09A34';
  return '#1DB584';
}

/**
 * Pill CSS class based on stock status
 * @param {'critical'|'low'|'ok'} status
 * @returns {string}
 */
function pillClass(status) {
  return { critical: 'pill-crit', low: 'pill-warn', ok: 'pill-ok' }[status] || 'pill-ok';
}

/**
 * Pill label based on status
 * @param {'critical'|'low'|'ok'} status
 * @returns {string}
 */
function pillLabel(status) {
  return { critical: 'Critical', low: 'Low', ok: 'OK' }[status] || 'OK';
}

/**
 * Clamp a number between min and max
 */
function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}
