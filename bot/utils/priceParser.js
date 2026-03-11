/**
 * Parses a string representing a price into a number.
 * Removes '₹' and supports 'k' formatting.
 * 
 * @param {string} input - The raw input string from the user
 * @returns {number|null} - The parsed number, or null if invalid
 */
module.exports = function priceParser(input) {
  if (!input || typeof input !== "string") return null;

  let normalized = input.trim().toLowerCase();

  // Strip currency symbol if present
  if (normalized.startsWith('₹') || normalized.startsWith('rs') || normalized.startsWith('$')) {
    normalized = normalized.replace(/[₹$]|rs/g, '').trim();
  }

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
