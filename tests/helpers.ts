import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Point the app at a throwaway SQLite file. Call before the first import of src/lib/db. */
export function pointAtTempDb() {
  const dir = mkdtempSync(join(tmpdir(), "mc-test-"));
  process.env.TURSO_DATABASE_URL = `file:${join(dir, "test.db")}`;
  delete process.env.TURSO_AUTH_TOKEN;
  delete process.env.RESEND_API_KEY;
  delete process.env.REQUIRE_EMAIL_VERIFY;
  delete process.env.ADMIN_ALERT_EMAIL;
  delete process.env.ALERT_WEBHOOK_URL;
}
