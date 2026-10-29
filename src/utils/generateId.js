/**
 * Generate a prefixed, time-ordered record ID, e.g. "staff_1730198400000_k3x9"
 * @param {string} prefix
 * @param {number} randomLength
 */
export const generateId = (prefix, randomLength = 4) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 2 + randomLength)}`;

/**
 * Today's date as YYYY-MM-DD
 */
export const today = () => new Date().toISOString().slice(0, 10);
