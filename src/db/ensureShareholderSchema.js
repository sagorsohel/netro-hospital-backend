import { db } from "./index.js";
import { sql } from "drizzle-orm";

/**
 * Creates / updates everything the shareholder module needs. Idempotent and
 * non-destructive (only ADD COLUMN / CREATE ... IF NOT EXISTS, never drops or truncates).
 * Runs automatically when the server starts; can also be run by hand:
 *   node src/scripts/migrateShareholderProfiles.js
 */
export async function ensureShareholderSchema() {
  console.log("⚡ Migrating shareholder module...");
  try {
    // Base tables (older databases never had them — the old shareholder page saved in the browser only)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shareholders (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        nid VARCHAR(50),
        ownership_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
        investment_amount NUMERIC(12, 2) DEFAULT 0.00,
        joined_date VARCHAR(50),
        bank_account_details VARCHAR(500),
        status VARCHAR(50) DEFAULT 'Active',
        notes VARCHAR(1000),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shareholder_payouts (
        id VARCHAR(64) PRIMARY KEY,
        shareholder_id VARCHAR(64) NOT NULL,
        shareholder_name VARCHAR(255) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        period VARCHAR(100) NOT NULL,
        payment_date VARCHAR(50) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
        transaction_ref VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Paid',
        notes VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      ALTER TABLE shareholders
        ADD COLUMN IF NOT EXISTS shareholder_code VARCHAR(20),
        ADD COLUMN IF NOT EXISTS user_id VARCHAR(64),
        ADD COLUMN IF NOT EXISTS identity_type VARCHAR(30) DEFAULT 'NATIONAL_ID',
        ADD COLUMN IF NOT EXISTS nid_front_image VARCHAR(500),
        ADD COLUMN IF NOT EXISTS nid_back_image VARCHAR(500),
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS created_by VARCHAR(64),
        ADD COLUMN IF NOT EXISTS updated_by VARCHAR(64),
        ADD COLUMN IF NOT EXISTS photo VARCHAR(500),
        ADD COLUMN IF NOT EXISTS tin_number VARCHAR(50),
        ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
        ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(50),
        ADD COLUMN IF NOT EXISTS religion VARCHAR(50),
        ADD COLUMN IF NOT EXISTS marital_status VARCHAR(30),
        ADD COLUMN IF NOT EXISTS father_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS spouse_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS present_address JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS permanent_address JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS nominees JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS shares JSONB DEFAULT '[]'::jsonb;
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS shareholders_shareholder_code_unique ON shareholders (shareholder_code);
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS share_plans (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description VARCHAR(1000),
        plan_year INTEGER,
        price NUMERIC(14, 2),
        currency VARCHAR(10) DEFAULT 'BDT',
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_by VARCHAR(64),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS share_purchases (
        id VARCHAR(64) PRIMARY KEY,
        shareholder_id VARCHAR(64) NOT NULL,
        plan_id VARCHAR(64),
        plan_name_snapshot VARCHAR(255),
        share_number VARCHAR(100) NOT NULL UNIQUE,
        payment_type VARCHAR(30) DEFAULT 'FULL_PAYMENT',
        purchase_date VARCHAR(20),
        reference_name VARCHAR(255),
        quantity INTEGER DEFAULT 1,
        total_amount NUMERIC(14, 2) DEFAULT 0,
        paid_amount NUMERIC(14, 2) DEFAULT 0,
        due_amount NUMERIC(14, 2) DEFAULT 0,
        payment_status VARCHAR(20) DEFAULT 'UNPAID',
        transaction_reference VARCHAR(255),
        notes VARCHAR(1000),
        created_by VARCHAR(64),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS share_purchases_shareholder_idx ON share_purchases (shareholder_id);`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        actor_id VARCHAR(64),
        actor_name VARCHAR(255),
        action VARCHAR(60) NOT NULL,
        entity_type VARCHAR(40) NOT NULL,
        entity_id VARCHAR(64) NOT NULL,
        summary VARCHAR(1000),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity_type, entity_id);`);

    // Codes for shareholders that don't have one yet (oldest first)
    await db.execute(sql`
      WITH base AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(shareholder_code FROM 4) AS INTEGER)), 0) AS n
        FROM shareholders WHERE shareholder_code ~ '^SH-[0-9]+$'
      ),
      todo AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
        FROM shareholders WHERE shareholder_code IS NULL
      )
      UPDATE shareholders s
      SET shareholder_code = 'SH-' || LPAD(CAST(base.n + todo.rn AS TEXT), 6, '0')
      FROM todo, base
      WHERE s.id = todo.id;
    `);

    // Old JSON share rows -> share_purchases (skips share numbers already present)
    const moved = await db.execute(sql`
      INSERT INTO share_purchases (id, shareholder_id, plan_name_snapshot, share_number, payment_type, purchase_date, reference_name, payment_status)
      SELECT
        'spur_mig_' || s.id || '_' || x.ord,
        s.id,
        x.item->>'package',
        x.item->>'shareNo',
        CASE WHEN LOWER(COALESCE(x.item->>'payment', '')) LIKE 'install%' THEN 'INSTALLMENT' ELSE 'FULL_PAYMENT' END,
        x.item->>'purchasedDate',
        x.item->>'reference',
        'UNPAID'
      FROM shareholders s
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.shares, '[]'::jsonb)) WITH ORDINALITY AS x(item, ord)
      WHERE COALESCE(x.item->>'shareNo', '') <> ''
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);
    console.log(`   moved ${moved.length ?? moved.count ?? 0} legacy share rows into share_purchases`);

    console.log("✅ Shareholder module migration complete!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    throw err;
  }
}
