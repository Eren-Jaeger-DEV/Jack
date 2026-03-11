/**
 * Parses a string representing a POP amount into a number.
 * Supports 'k' formatting (e.g., '1k' -> 1000, '2.5k' -> 2500)
 * 
 * @param {string} input - The raw input string from the user
 * @returns {number|null} - The parsed number, or null if invalid
 */
module.exports = function popParser(input) {
  if (!input || typeof input !== "string") return null;

  const normalized = input.trim().toLowerCase();
  
  // Check for 'k' suffix
  if (normalized.endsWith('k')) {
    const numPart = normalized.slice(0, -1);
    const num = parseFloat(numPart);
    if (!isNaN(num)) {
      return num * 1000;
    }
    return null;
  }

  // Plain number
  const num = parseFloat(normalized);
  if (!isNaN(num)) {
    return num;
  }

  return null;
};
