import dotenv from "dotenv";
dotenv.config();
import { ensureShareholderSchema } from "../db/ensureShareholderSchema.js";

// Manual run:  node src/scripts/migrateShareholderProfiles.js
// (The server also runs this automatically on start.)
ensureShareholderSchema()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
