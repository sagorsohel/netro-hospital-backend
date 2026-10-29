import { and } from "drizzle-orm";

/**
 * Combine a list of Drizzle conditions into a single where clause
 * @param {Array} conditions
 * @returns {import("drizzle-orm").SQL | undefined}
 */
export const combineConditions = (conditions) => {
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
};

/**
 * Read a trimmed string filter from req.query ("" when absent)
 * @param {object} query - req.query
 * @param {string} key
 */
export const getQueryString = (query, key) =>
  typeof query[key] === "string" ? query[key].trim() : "";
