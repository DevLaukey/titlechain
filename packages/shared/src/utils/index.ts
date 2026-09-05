/**
 * Format an Ethereum address to a shortened display version.
 * e.g. 0x1234...abcd
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Truncate a blockchain transaction hash for display.
 */
export function truncateHash(hash: string, chars = 6): string {
  if (!hash) return "";
  if (hash.length < chars * 2) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

/**
 * Generate a unique property title number.
 * Format: TC-<YEAR>-<STATE>-<RANDOM>
 */
export function generateTitleNumber(state: string): string {
  const year = new Date().getFullYear();
  const stateCode = state.toUpperCase().slice(0, 3).padEnd(3, "X");
  const random = Math.random().toString(36).toUpperCase().slice(2, 8);
  return `TC-${year}-${stateCode}-${random}`;
}

/**
 * Format a numeric value as currency.
 */
export function formatCurrency(
  amount: number | string,
  currency = "USD",
  locale = "en-US"
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Validate an Ethereum address format.
 */
export function isValidEthAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Sleep for a given number of milliseconds (useful in async flows).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
