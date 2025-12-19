
/**
 * Formats a Unix timestamp (seconds) into a readable ISO-like string.
 * Example: "2023-01-01 12:00:00"
 */
export const formatFullTimestamp = (ts: number): string => {
  if (!ts) return "0000-00-00 00:00:00";
  const date = new Date(ts * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
};
