import { db } from "../db/index.js";
import bcrypt from "bcryptjs";
import {
  shareholders,
  shareholderPayouts,
  sharePlans,
  sharePurchases,
  auditLogs,
  diagnosticInvoices,
  admissions,
  expenses,
  users,
} from "../db/schema.js";
import { eq, ne, and, or, ilike, desc, asc, sql, inArray, isNull, notInArray } from "drizzle-orm";
import { generateId } from "../utils/generateId.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions } from "../utils/query.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

// Fields the admin form can set (anything else in the body is ignored)
const PROFILE_FIELDS = [
  "name", "phone", "email", "identityType", "nid", "nidFrontImage", "nidBackImage",
  "joinedDate", "bankAccountDetails", "status", "notes",
  "photo", "tinNumber", "gender", "dateOfBirth", "religion", "maritalStatus",
  "fatherName", "motherName", "spouseName",
  "presentAddress", "permanentAddress", "nominees",
];

const pickProfile = (payload) => {
  const out = {};
  for (const key of PROFILE_FIELDS) {
    if (payload[key] === undefined) continue; // partial update: leave existing value alone
    out[key] = payload[key] === "" ? null : payload[key];
  }
  if (payload.ownershipPercentage !== undefined) out.ownershipPercentage = String(payload.ownershipPercentage || 0);
  if (payload.investmentAmount !== undefined) out.investmentAmount = String(payload.investmentAmount || 0);
  return out;
};

/** "1234567890123" -> "*********0123" */
export const maskValue = (v) => {
  if (!v) return v;
  const s = String(v);
  return s.length <= 4 ? "*".repeat(s.length) : "*".repeat(s.length - 4) + s.slice(-4);
};

const maskShareholder = (s) => ({
  ...s,
  nid: maskValue(s.nid),
  tinNumber: maskValue(s.tinNumber),
  nominees: (s.nominees || []).map((n) => ({ ...n, nid: maskValue(n.nid) })),
});

const isAdmin = (req) => ["admin", "super_admin"].includes(req.user?.role);

const notDeleted = isNull(shareholders.deletedAt);

const audit = async (tx, req, action, entityType, entityId, summary) => {
  await tx.insert(auditLogs).values({
    id: generateId("aud", 6),
    actorId: req.user?.id || null,
    actorName: req.user?.name || null,
    action,
    entityType,
    entityId,
    summary: summary ? String(summary).slice(0, 1000) : null,
  });
};

const emailTaken = async (tx, email, exceptUserId) => {
  const [u] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  return !!u && u.id !== exceptUserId;
};

const nextShareholderCode = async (tx) => {
  const [row] = await tx
    .select({
      n: sql`COALESCE(MAX(CAST(SUBSTRING(${shareholders.shareholderCode} FROM 4) AS INTEGER)), 0)`,
    })
    .from(shareholders)
    .where(sql`${shareholders.shareholderCode} ~ '^SH-[0-9]+$'`);
  return `SH-${String(Number(row?.n || 0) + 1).padStart(6, "0")}`;
};

const toNum = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

/** total / paid / due / status for one purchase */
export const computeAmounts = (row, plan, existing) => {
  const qty = row.quantity ?? existing?.quantity ?? 1;
  const planTotal = plan?.price != null ? Number(plan.price) * qty : null;
  const total = toNum(row.totalAmount) ?? toNum(existing?.totalAmount) ?? planTotal ?? 0;
  const paid = toNum(row.paidAmount) ?? toNum(existing?.paidAmount) ?? 0;
  if (total > 0 && paid > total + 0.001) {
    throw new ApiError(422, `Share ${row.shareNumber}: paid amount is more than the total.`);
  }
  const due = Math.max(0, total - paid);
  const asked = row.paymentStatus || existing?.paymentStatus;
  let status;
  if (asked === "CANCELLED") status = "CANCELLED";
  else if (total > 0 && due <= 0.001) status = "PAID";
  else if (asked === "OVERDUE" && due > 0) status = "OVERDUE";
  else if (paid > 0) status = "PARTIAL";
  else if (total === 0 && asked === "PAID") status = "PAID";
  else status = "UNPAID";
  return {
    quantity: qty,
    totalAmount: total.toFixed(2),
    paidAmount: paid.toFixed(2),
    dueAmount: due.toFixed(2),
    paymentStatus: status,
  };
};

/**
 * Save the purchase list sent with the shareholder form (inside a transaction).
 * Rows with `id` are updated, rows without are created, and saved rows that are
 * missing from the list are CANCELLED (never hard-deleted).
 */
const syncPurchases = async (tx, req, shareholderId, rows) => {
  const existing = await tx.select().from(sharePurchases).where(eq(sharePurchases.shareholderId, shareholderId));
  const existingById = new Map(existing.map((p) => [p.id, p]));

  // Share numbers must be unique across ALL shareholders
  const ownIds = rows.map((r) => r.id).filter(Boolean);
  const numbers = rows.map((r) => r.shareNumber.trim().toLowerCase());
  if (numbers.length) {
    const clashes = await tx
      .select({ shareNumber: sharePurchases.shareNumber })
      .from(sharePurchases)
      .where(
        and(
          inArray(sql`LOWER(${sharePurchases.shareNumber})`, numbers),
          ownIds.length ? notInArray(sharePurchases.id, ownIds) : sql`TRUE`
        )
      );
    if (clashes.length) {
      throw ApiError.conflict(`Share number already used: ${clashes.map((c) => c.shareNumber).join(", ")}`);
    }
  }

  const planIds = [...new Set(rows.map((r) => r.planId).filter(Boolean))];
  const plans = planIds.length ? await tx.select().from(sharePlans).where(inArray(sharePlans.id, planIds)) : [];
  const planById = new Map(plans.map((p) => [p.id, p]));

  const changes = [];
  for (const row of rows) {
    const prev = row.id ? existingById.get(row.id) : null;
    if (row.id && !prev) throw ApiError.notFound(`Share purchase ${row.id} not found for this shareholder.`);

    let plan = null;
    if (row.planId) {
      plan = planById.get(row.planId);
      if (!plan) throw new ApiError(422, `Share plan not found for share ${row.shareNumber}.`);
      const planChanged = !prev || prev.planId !== row.planId;
      if (planChanged && plan.status !== "ACTIVE") {
        throw new ApiError(422, `Plan "${plan.name}" is not active and cannot be used for a new purchase.`);
      }
    }

    const values = {
      planId: row.planId ?? prev?.planId ?? null,
      planNameSnapshot: plan?.name ?? row.planName ?? prev?.planNameSnapshot ?? null,
      shareNumber: row.shareNumber.trim(),
      paymentType: row.paymentType ?? prev?.paymentType ?? "FULL_PAYMENT",
      purchaseDate: row.purchaseDate ?? prev?.purchaseDate ?? new Date().toISOString().slice(0, 10),
      referenceName: row.referenceName ?? prev?.referenceName ?? null,
      transactionReference: row.transactionReference ?? prev?.transactionReference ?? null,
      notes: row.notes ?? prev?.notes ?? null,
      ...computeAmounts(row, plan, prev),
    };

    if (prev) {
      await tx.update(sharePurchases).set({ ...values, updatedAt: new Date() }).where(eq(sharePurchases.id, prev.id));
      changes.push(`updated share ${values.shareNumber}`);
    } else {
      await tx.insert(sharePurchases).values({
        id: generateId("spur", 6),
        shareholderId,
        createdBy: req.user?.id || null,
        ...values,
      });
      changes.push(`added share ${values.shareNumber} (${values.planNameSnapshot || "no plan"})`);
    }
  }

  const keep = new Set(ownIds);
  for (const p of existing) {
    if (!keep.has(p.id) && p.paymentStatus !== "CANCELLED") {
      await tx
        .update(sharePurchases)
        .set({ paymentStatus: "CANCELLED", updatedAt: new Date() })
        .where(eq(sharePurchases.id, p.id));
      changes.push(`cancelled share ${p.shareNumber}`);
    }
  }
  return changes;
};

const loadPurchases = async (shareholderIds, { includeCancelled = true } = {}) => {
  if (!shareholderIds.length) return [];
  return db
    .select()
    .from(sharePurchases)
    .where(
      and(
        inArray(sharePurchases.shareholderId, shareholderIds),
        includeCancelled ? sql`TRUE` : ne(sharePurchases.paymentStatus, "CANCELLED")
      )
    )
    .orderBy(asc(sharePurchases.purchaseDate), asc(sharePurchases.createdAt));
};

const purchaseSummary = (list) => {
  const active = list.filter((p) => p.paymentStatus !== "CANCELLED");
  const sum = (k) => active.reduce((s, p) => s + Number(p[k] || 0), 0);
  return {
    purchaseCount: active.length,
    shareNumbers: active.map((p) => p.shareNumber),
    planNames: [...new Set(active.map((p) => p.planNameSnapshot).filter(Boolean))],
    totalAmount: sum("totalAmount"),
    paidAmount: sum("paidAmount"),
    dueAmount: sum("dueAmount"),
  };
};

// Attach login-account info (never the password)
const attachAccounts = async (list) => {
  const ids = list.map((s) => s.userId).filter(Boolean);
  const accounts = ids.length
    ? await db
        .select({ id: users.id, email: users.email, isActive: users.isActive })
        .from(users)
        .where(inArray(users.id, ids))
    : [];
  const byId = new Map(accounts.map((a) => [a.id, a]));
  return list.map((s) => {
    const a = s.userId ? byId.get(s.userId) : null;
    return { ...s, account: a ? { email: a.email, isActive: a.isActive !== false } : null };
  });
};

const findShareholder = async (id) => {
  const [sh] = await db.select().from(shareholders).where(and(eq(shareholders.id, id), notDeleted));
  if (!sh) throw ApiError.notFound("Shareholder not found");
  return sh;
};

// Postgres errors -> readable API errors
const MIGRATION_HINT =
  "The database is missing the new shareholder tables/columns. On the server run: node src/scripts/migrateShareholderProfiles.js (then restart the backend).";
const translateDbError = (err) => {
  const code = err?.code || err?.cause?.code;
  // 42P01 = table does not exist, 42703 = column does not exist
  if (code === "42P01" || code === "42703") {
    const e = new ApiError(500, MIGRATION_HINT);
    e.cause = err?.cause || err;
    return e;
  }
  if (code === "23505") {
    const detail = `${err?.detail || ""} ${err?.cause?.detail || ""} ${err?.constraint_name || ""} ${err?.cause?.constraint_name || ""}`;
    if (detail.includes("share_number")) return ApiError.conflict("That share number is already used.");
    if (detail.includes("email")) return ApiError.conflict("That email is already used by another account.");
    if (detail.includes("code")) return ApiError.conflict("That code is already used.");
    return ApiError.conflict("Duplicate value.");
  }
  return err;
};

/* ------------------------------------------------------------------ */
/* Shareholders                                                       */
/* ------------------------------------------------------------------ */

/**
 * @route GET /api/v1/shareholders?page&limit&search&status&planId&paymentStatus
 * @access Admin, Accountant
 */
export const getShareholders = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, 20);
    const search = (req.query.search || "").trim();
    const { status, planId, paymentStatus } = req.query;

    const conditions = [notDeleted];
    if (status) conditions.push(eq(shareholders.status, status));
    if (search) {
      const like = `%${search}%`;
      conditions.push(
        or(
          ilike(shareholders.name, like),
          ilike(shareholders.phone, like),
          ilike(shareholders.email, like),
          ilike(shareholders.shareholderCode, like),
          sql`EXISTS (SELECT 1 FROM share_purchases sp WHERE sp.shareholder_id = ${shareholders.id} AND sp.share_number ILIKE ${like})`
        )
      );
    }
    if (planId) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM share_purchases sp WHERE sp.shareholder_id = ${shareholders.id} AND sp.plan_id = ${planId} AND sp.payment_status <> 'CANCELLED')`
      );
    }
    if (paymentStatus) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM share_purchases sp WHERE sp.shareholder_id = ${shareholders.id} AND sp.payment_status = ${paymentStatus})`
      );
    }
    const where = combineConditions(conditions);

    const [[{ count }], list] = await Promise.all([
      db.select({ count: sql`COUNT(*)` }).from(shareholders).where(where),
      db.select().from(shareholders).where(where).orderBy(desc(shareholders.createdAt)).limit(limit).offset(offset),
    ]);

    // Hospital figures for the profit-share cards (all non-deleted shareholders)
    const [[diagRevenue], [admRevenue], [expTotal], [alloc]] = await Promise.all([
      db.select({ total: sql`COALESCE(SUM(paid_amount), 0)` }).from(diagnosticInvoices),
      db.select({ total: sql`COALESCE(SUM(advance_payment), 0)` }).from(admissions),
      db.select({ total: sql`COALESCE(SUM(amount), 0)` }).from(expenses),
      db
        .select({
          n: sql`COUNT(*)`,
          pct: sql`COALESCE(SUM(${shareholders.ownershipPercentage}), 0)`,
          capital: sql`COALESCE(SUM(${shareholders.investmentAmount}), 0)`,
        })
        .from(shareholders)
        .where(notDeleted),
    ]);
    // Share sales: everything sold to non-removed shareholders, cancelled shares excluded
    const salesRows = await db
      .select({
        planId: sharePurchases.planId,
        planName: sharePurchases.planNameSnapshot,
        sold: sql`COUNT(*)`,
        quantity: sql`COALESCE(SUM(${sharePurchases.quantity}), 0)`,
        total: sql`COALESCE(SUM(${sharePurchases.totalAmount}), 0)`,
        paid: sql`COALESCE(SUM(${sharePurchases.paidAmount}), 0)`,
        due: sql`COALESCE(SUM(${sharePurchases.dueAmount}), 0)`,
        overdue: sql`COALESCE(SUM(CASE WHEN ${sharePurchases.paymentStatus} = 'OVERDUE' THEN ${sharePurchases.dueAmount} ELSE 0 END), 0)`,
      })
      .from(sharePurchases)
      .innerJoin(shareholders, eq(shareholders.id, sharePurchases.shareholderId))
      .where(and(notDeleted, ne(sharePurchases.paymentStatus, "CANCELLED")))
      .groupBy(sharePurchases.planId, sharePurchases.planNameSnapshot);
    const [withDue] = await db
      .select({ n: sql`COUNT(DISTINCT ${sharePurchases.shareholderId})` })
      .from(sharePurchases)
      .innerJoin(shareholders, eq(shareholders.id, sharePurchases.shareholderId))
      .where(and(notDeleted, ne(sharePurchases.paymentStatus, "CANCELLED"), sql`${sharePurchases.dueAmount} > 0`));
    const byPlan = salesRows
      .map((r) => ({
        planId: r.planId,
        planName: r.planName || "No plan",
        sold: Number(r.sold),
        total: Number(r.total),
        paid: Number(r.paid),
        due: Number(r.due),
      }))
      .sort((a, b) => b.total - a.total);
    const sumOf = (k) => salesRows.reduce((s, r) => s + Number(r[k] || 0), 0);
    const shareSales = {
      sharesSold: sumOf("sold"),
      unitsSold: sumOf("quantity"),
      totalAmount: sumOf("total"),
      paidAmount: sumOf("paid"),
      dueAmount: sumOf("due"),
      overdueAmount: sumOf("overdue"),
      shareholdersWithDue: Number(withDue?.n || 0),
      byPlan,
    };

    const totalIncome = Number(diagRevenue?.total || 0) + Number(admRevenue?.total || 0);
    const totalExpense = Number(expTotal?.total || 0);
    const netProfit = Math.max(0, totalIncome - totalExpense);
    const totalOwnershipAllocated = Number(alloc?.pct || 0);

    const purchases = await loadPurchases(list.map((s) => s.id));
    const byOwner = new Map();
    for (const p of purchases) {
      if (!byOwner.has(p.shareholderId)) byOwner.set(p.shareholderId, []);
      byOwner.get(p.shareholderId).push(p);
    }

    const withAccounts = await attachAccounts(list);
    const data = withAccounts.map((s) => {
      const { shares, ...rest } = maskShareholder(s); // ID numbers are masked in lists
      return {
        ...rest,
        calculatedEarning: Number(((netProfit * Number(s.ownershipPercentage || 0)) / 100).toFixed(2)),
        purchaseSummary: purchaseSummary(byOwner.get(s.id) || []),
      };
    });

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(count, page, limit),
      metrics: {
        totalShareholders: Number(alloc?.n || 0),
        totalOwnershipAllocated,
        availableOwnershipPercentage: Math.max(0, 100 - totalOwnershipAllocated),
        totalCapital: Number(alloc?.capital || 0),
        shareSales,
        hospitalFinancialSummary: { totalIncome, totalExpense, netProfit },
      },
    });
  } catch (error) {
    next(translateDbError(error));
  }
};

/**
 * @route GET /api/v1/shareholders/:id
 * @access Admin (full), Accountant (ID numbers masked)
 */
export const getShareholderById = async (req, res, next) => {
  try {
    const sh = await findShareholder(req.params.id);
    const [purchases, payouts, [withAccount]] = await Promise.all([
      loadPurchases([sh.id]),
      db
        .select()
        .from(shareholderPayouts)
        .where(eq(shareholderPayouts.shareholderId, sh.id))
        .orderBy(desc(shareholderPayouts.paymentDate)),
      attachAccounts([sh]),
    ]);
    const { shares, ...rest } = isAdmin(req) ? withAccount : maskShareholder(withAccount);
    res.json({
      success: true,
      data: { ...rest, purchases, purchaseSummary: purchaseSummary(purchases), payouts },
    });
  } catch (error) {
    next(translateDbError(error));
  }
};

/**
 * @route POST /api/v1/shareholders
 * @access Admin
 */
export const createShareholder = async (req, res, next) => {
  try {
    const payload = req.body;
    const loginEmail = payload.loginEmail || null;
    const loginHash = loginEmail ? await bcrypt.hash(payload.loginPassword, 10) : null;

    const created = await db.transaction(async (tx) => {
      if (loginEmail && (await emailTaken(tx, loginEmail))) {
        throw ApiError.conflict(`Login email ${loginEmail} is already used by another account.`);
      }

      const id = generateId("sh");
      let userId = null;
      if (loginEmail) {
        userId = generateId("usr");
        await tx.insert(users).values({
          id: userId,
          name: payload.name,
          email: loginEmail,
          password: loginHash,
          role: "shareholder",
          phone: payload.phone || null,
          avatar: payload.photo || null,
          isActive: true,
        });
      }

      const [row] = await tx
        .insert(shareholders)
        .values({
          ownershipPercentage: "0",
          investmentAmount: "0",
          ...pickProfile(payload),
          id,
          shareholderCode: await nextShareholderCode(tx),
          joinedDate: payload.joinedDate || new Date().toISOString().slice(0, 10),
          status: payload.status || "Active",
          userId,
          createdBy: req.user?.id || null,
          updatedBy: req.user?.id || null,
        })
        .returning();

      const changes = payload.purchases?.length ? await syncPurchases(tx, req, id, payload.purchases) : [];
      await audit(
        tx,
        req,
        "SHAREHOLDER_CREATED",
        "SHAREHOLDER",
        id,
        [
          `Created ${row.shareholderCode} ${row.name}`,
          `${(payload.nominees || []).length} nominee(s)`,
          ...changes,
          loginEmail ? `login created (${loginEmail})` : null,
        ]
          .filter(Boolean)
          .join("; ")
      );
      return row;
    });

    const [withAccount] = await attachAccounts([created]);
    res.status(201).json({
      success: true,
      message: loginEmail ? "Shareholder registered and login account created" : "Shareholder registered successfully",
      data: withAccount,
    });
  } catch (error) {
    next(translateDbError(error));
  }
};

/**
 * @route PUT|PATCH /api/v1/shareholders/:id
 * @access Admin
 */
export const updateShareholder = async (req, res, next) => {
  try {
    const before = await findShareholder(req.params.id);
    const profile = pickProfile(req.body);

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(shareholders)
        .set({ ...profile, updatedBy: req.user?.id || null, updatedAt: new Date() })
        .where(eq(shareholders.id, before.id))
        .returning();

      const changes = req.body.purchases ? await syncPurchases(tx, req, before.id, req.body.purchases) : [];

      // Keep the login's display name / phone / photo in sync
      if (row.userId) {
        await tx
          .update(users)
          .set({ name: row.name, phone: row.phone, avatar: row.photo, updatedAt: new Date() })
          .where(eq(users.id, row.userId));
      }

      // Changed-field names only — no sensitive values in the log
      const changedFields = Object.keys(profile).filter(
        (k) => JSON.stringify(profile[k] ?? null) !== JSON.stringify(before[k] ?? null)
      );
      if (changedFields.length || changes.length) {
        await audit(
          tx,
          req,
          "SHAREHOLDER_UPDATED",
          "SHAREHOLDER",
          before.id,
          [changedFields.length ? `changed: ${changedFields.join(", ")}` : null, ...changes].filter(Boolean).join("; ")
        );
      }
      return row;
    });

    const [withAccount] = await attachAccounts([updated]);
    res.json({ success: true, message: "Shareholder updated successfully", data: withAccount });
  } catch (error) {
    next(translateDbError(error));
  }
};

/**
 * @route PATCH /api/v1/shareholders/:id/status
 * @access Admin
 */
export const updateShareholderStatus = async (req, res, next) => {
  try {
    const sh = await findShareholder(req.params.id);
    const { status, reason } = req.body;
    const row = await db.transaction(async (tx) => {
      const [r] = await tx
        .update(shareholders)
        .set({ status, updatedBy: req.user?.id || null, updatedAt: new Date() })
        .where(eq(shareholders.id, sh.id))
        .returning();
      await audit(
        tx,
        req,
        "SHAREHOLDER_STATUS_CHANGED",
        "SHAREHOLDER",
        sh.id,
        `${sh.status} → ${status}${reason ? ` (${reason})` : ""}`
      );
      return r;
    });
    res.json({ success: true, message: `Status changed to ${status}`, data: row });
  } catch (error) {
    next(translateDbError(error));
  }
};

/**
 * Soft delete: keeps history, hides the record, disables the login.
 * @route DELETE /api/v1/shareholders/:id
 * @access Admin
 */
export const deleteShareholder = async (req, res, next) => {
  try {
    const sh = await findShareholder(req.params.id);
    await db.transaction(async (tx) => {
      await tx
        .update(shareholders)
        .set({ deletedAt: new Date(), status: "Inactive", updatedBy: req.user?.id || null, updatedAt: new Date() })
        .where(eq(shareholders.id, sh.id));
      if (sh.userId) {
        await tx.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, sh.userId));
      }
      await audit(
        tx,
        req,
        "SHAREHOLDER_DELETED",
        "SHAREHOLDER",
        sh.id,
        `Removed ${sh.shareholderCode || ""} ${sh.name} (soft delete, login disabled)`
      );
    });
    res.json({ success: true, message: "Shareholder removed (history kept)" });
  } catch (error) {
    next(translateDbError(error));
  }
};

/**
 * @route GET /api/v1/shareholders/:id/audit-logs
 * @access Admin
 */
export const getShareholderAuditLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, "SHAREHOLDER"), eq(auditLogs.entityId, id)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(200);
    res.json({ success: true, data: logs });
  } catch (error) {
    next(translateDbError(error));
  }
};

/**
 * @route POST /api/v1/shareholders/:id/payouts
 * @access Admin
 */
export const createShareholderPayout = async (req, res, next) => {
  try {
    const payload = req.body;
    const shareholder = await findShareholder(payload.shareholderId);
    const [created] = await db
      .insert(shareholderPayouts)
      .values({
        id: generateId("pay"),
        shareholderId: shareholder.id,
        shareholderName: shareholder.name,
        amount: String(payload.amount),
        period: payload.period,
        paymentDate: payload.paymentDate || new Date().toISOString().slice(0, 10),
        paymentMethod: payload.paymentMethod || "Bank Transfer",
        transactionRef: payload.transactionRef || null,
        status: payload.status || "Paid",
        notes: payload.notes || null,
      })
      .returning();
    res.status(201).json({ success: true, message: "Dividend payout recorded successfully", data: created });
  } catch (error) {
    next(translateDbError(error));
  }
};

/* ------------------------------------------------------------------ */
/* Login account                                                      */
/* ------------------------------------------------------------------ */

/** @route POST /api/v1/shareholders/:id/account  @access Admin */
export const createShareholderAccount = async (req, res, next) => {
  try {
    const sh = await findShareholder(req.params.id);
    const { email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    await db.transaction(async (tx) => {
      if (sh.userId) {
        const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.id, sh.userId));
        if (existing) throw ApiError.conflict("This shareholder already has a login. Use reset password instead.");
      }
      if (await emailTaken(tx, email)) throw ApiError.conflict(`Email ${email} is already used by another account.`);

      const userId = generateId("usr");
      await tx.insert(users).values({
        id: userId,
        name: sh.name,
        email,
        password: hash,
        role: "shareholder",
        phone: sh.phone,
        avatar: sh.photo,
        isActive: true,
      });
      await tx.update(shareholders).set({ userId, updatedAt: new Date() }).where(eq(shareholders.id, sh.id));
      await audit(tx, req, "LOGIN_CREATED", "SHAREHOLDER", sh.id, `Login created (${email})`);
    });

    res.status(201).json({ success: true, message: `Login created for ${sh.name}`, data: { email, isActive: true } });
  } catch (error) {
    next(translateDbError(error));
  }
};

/** @route PUT /api/v1/shareholders/:id/account  @access Admin */
export const updateShareholderAccount = async (req, res, next) => {
  try {
    const sh = await findShareholder(req.params.id);
    if (!sh.userId) throw ApiError.notFound("This shareholder has no login account yet.");
    const { email, isActive } = req.body;

    const u = await db.transaction(async (tx) => {
      if (email && (await emailTaken(tx, email, sh.userId))) {
        throw ApiError.conflict(`Email ${email} is already used by another account.`);
      }
      const [row] = await tx
        .update(users)
        .set({
          ...(email !== undefined && { email }),
          ...(isActive !== undefined && { isActive }),
          updatedAt: new Date(),
        })
        .where(eq(users.id, sh.userId))
        .returning({ email: users.email, isActive: users.isActive });
      await audit(
        tx,
        req,
        "LOGIN_UPDATED",
        "SHAREHOLDER",
        sh.id,
        [email ? "login email changed" : null, isActive !== undefined ? (isActive ? "login enabled" : "login disabled") : null]
          .filter(Boolean)
          .join("; ")
      );
      return row;
    });

    res.json({ success: true, message: "Login account updated", data: u });
  } catch (error) {
    next(translateDbError(error));
  }
};

/** @route PUT /api/v1/shareholders/:id/account/reset-password  @access Admin */
export const resetShareholderPassword = async (req, res, next) => {
  try {
    const sh = await findShareholder(req.params.id);
    if (!sh.userId) throw ApiError.notFound("This shareholder has no login account yet.");
    const hash = await bcrypt.hash(req.body.newPassword, 10);
    const u = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(users)
        .set({ password: hash, updatedAt: new Date() })
        .where(eq(users.id, sh.userId))
        .returning({ email: users.email });
      if (!row) throw ApiError.notFound("Login account not found.");
      await audit(tx, req, "PASSWORD_RESET", "SHAREHOLDER", sh.id, "Password reset by admin");
      return row;
    });
    res.json({ success: true, message: `Password reset for ${sh.name} (${u.email})` });
  } catch (error) {
    next(translateDbError(error));
  }
};

/* ------------------------------------------------------------------ */
/* Shareholder's own view (read-only)                                 */
/* ------------------------------------------------------------------ */

/**
 * Identity comes from the token only — there is no id parameter.
 * @route GET /api/v1/shareholders/me
 * @access Shareholder
 */
export const getMyShareholderProfile = async (req, res, next) => {
  try {
    const [sh] = await db
      .select()
      .from(shareholders)
      .where(and(eq(shareholders.userId, req.user.id), notDeleted));
    if (!sh) throw ApiError.notFound("No shareholder profile linked to this login.");

    const [purchases, payouts] = await Promise.all([
      loadPurchases([sh.id], { includeCancelled: false }),
      db
        .select()
        .from(shareholderPayouts)
        .where(eq(shareholderPayouts.shareholderId, sh.id))
        .orderBy(desc(shareholderPayouts.paymentDate)),
    ]);

    // Never return admin notes, audit fields, login ids or full ID numbers
    const { notes, shares, userId, createdBy, updatedBy, deletedAt, ...visible } = maskShareholder(sh);
    res.json({
      success: true,
      data: {
        ...visible,
        purchases: purchases.map(({ notes: _n, createdBy: _c, ...p }) => p),
        purchaseSummary: purchaseSummary(purchases),
        payouts: payouts.map(({ notes: _n, ...p }) => p),
      },
    });
  } catch (error) {
    next(translateDbError(error));
  }
};

/* ------------------------------------------------------------------ */
/* Share plans                                                        */
/* ------------------------------------------------------------------ */

/** @route GET /api/v1/share-plans?status=ACTIVE  @access Admin, Accountant */
export const getSharePlans = async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const rows = await db
      .select({
        plan: sharePlans,
        // table-qualified on purpose: inside select() Drizzle renders a bare "id"
        purchaseCount: sql`(SELECT COUNT(*) FROM share_purchases sp WHERE sp.plan_id = "share_plans"."id" AND sp.payment_status <> 'CANCELLED')`,
      })
      .from(sharePlans)
      .where(status ? eq(sharePlans.status, status) : undefined)
      .orderBy(desc(sharePlans.planYear), asc(sharePlans.name));
    res.json({ success: true, data: rows.map((r) => ({ ...r.plan, purchaseCount: Number(r.purchaseCount || 0) })) });
  } catch (error) {
    next(translateDbError(error));
  }
};

/** @route POST /api/v1/share-plans  @access Admin */
export const createSharePlan = async (req, res, next) => {
  try {
    const p = req.body;
    const plan = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(sharePlans)
        .values({
          id: generateId("plan", 6),
          code: p.code,
          name: p.name,
          description: p.description || null,
          planYear: p.planYear ?? null,
          price: p.price !== undefined ? String(p.price) : null,
          currency: p.currency || "BDT",
          status: p.status || "ACTIVE",
          createdBy: req.user?.id || null,
        })
        .returning();
      await audit(tx, req, "PLAN_CREATED", "SHARE_PLAN", row.id, `${row.code} — ${row.name}`);
      return row;
    });
    res.status(201).json({ success: true, message: "Share plan created", data: plan });
  } catch (error) {
    next(translateDbError(error));
  }
};

/** @route PUT|PATCH /api/v1/share-plans/:planId  @access Admin */
export const updateSharePlan = async (req, res, next) => {
  try {
    const p = req.body;
    const set = {};
    for (const k of ["code", "name", "description", "planYear", "currency", "status"]) {
      if (p[k] !== undefined) set[k] = p[k];
    }
    if (p.price !== undefined) set.price = String(p.price);

    const plan = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(sharePlans)
        .set({ ...set, updatedAt: new Date() })
        .where(eq(sharePlans.id, req.params.planId))
        .returning();
      if (!row) throw ApiError.notFound("Share plan not found");
      await audit(tx, req, "PLAN_UPDATED", "SHARE_PLAN", row.id, `changed: ${Object.keys(set).join(", ")}`);
      return row;
    });
    res.json({ success: true, message: "Share plan updated", data: plan });
  } catch (error) {
    next(translateDbError(error));
  }
};

/** Plans are never deleted — deactivate instead. @route PATCH /api/v1/share-plans/:planId/status */
export const updateSharePlanStatus = async (req, res, next) => {
  try {
    const plan = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(sharePlans)
        .set({ status: req.body.status, updatedAt: new Date() })
        .where(eq(sharePlans.id, req.params.planId))
        .returning();
      if (!row) throw ApiError.notFound("Share plan not found");
      await audit(tx, req, "PLAN_STATUS_CHANGED", "SHARE_PLAN", row.id, `status → ${row.status}`);
      return row;
    });
    res.json({ success: true, message: `Plan is now ${plan.status}`, data: plan });
  } catch (error) {
    next(translateDbError(error));
  }
};
