const MAX_LIMIT = 100;

/**
 * Parse page/limit from the query string, clamped to sane bounds
 * @param {object} query - req.query
 * @param {number} defaultLimit
 * @returns {{ page: number, limit: number, offset: number }}
 */
export const getPagination = (query, defaultLimit = 10) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.max(1, Math.min(MAX_LIMIT, parseInt(query.limit) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
};

/**
 * Build the pagination block returned in list responses
 * @param {number|string} total - raw count(*) result
 * @param {number} page
 * @param {number} limit
 */
export const buildPaginationMeta = (total, page, limit) => {
  const totalCount = parseInt(total || "0", 10);
  return {
    total: totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1,
  };
};
