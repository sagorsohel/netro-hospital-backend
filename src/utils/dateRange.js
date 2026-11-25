import { gte, lt } from "drizzle-orm";
import { ApiError } from "./ApiError.js";

/**
 * Read ?from=&to= (ISO date-times, `to` exclusive) and return Drizzle conditions for `column`.
 * The browser sends its own local day boundaries (e.g. Dhaka midnight), so "Today" means the
 * user's today, not the server's.
 */
export const dateRangeConditions = (query, column) => {
  const out = [];
  for (const [key, op] of [["from", gte], ["to", lt]]) {
    const raw = typeof query[key] === "string" ? query[key].trim() : "";
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) throw ApiError.badRequest(`Invalid "${key}" date.`);
    out.push(op(column, d));
  }
  return out;
};
