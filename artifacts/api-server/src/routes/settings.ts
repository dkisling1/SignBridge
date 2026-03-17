import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

function requireMaster(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.session.userRole !== "master") {
    res.status(403).json({ error: "Master account required" });
    return;
  }
  next();
}

const DEFAULTS: Record<string, string> = {};

router.get("/settings", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const result: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json(result);
  } catch (err) {
    console.error("Settings GET error:", err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

router.put("/settings/:key", requireMaster, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (typeof value !== "string") {
    res.status(400).json({ error: "value must be a string" });
    return;
  }

  const allowedKeys = Object.keys(DEFAULTS);
  if (!allowedKeys.includes(key)) {
    res.status(400).json({ error: `Unknown setting key: ${key}` });
    return;
  }

  try {
    await db
      .insert(settingsTable)
      .values({ key, value })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value } });

    res.json({ key, value });
  } catch (err) {
    console.error("Settings PUT error:", err);
    res.status(500).json({ error: "Failed to update setting" });
  }
});

export async function getSetting(key: string): Promise<string> {
  try {
    const rows = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, key));
    return rows[0]?.value ?? DEFAULTS[key] ?? "";
  } catch {
    return DEFAULTS[key] ?? "";
  }
}

export default router;
