import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

const ALLOWED_CREATE: Record<string, ("admin" | "user")[]> = {
  master: ["admin", "user"],
  admin: ["user"],
  user: [],
};

const ALLOWED_DELETE: Record<string, ("admin" | "user")[]> = {
  master: ["admin", "user"],
  admin: ["user"],
  user: [],
};

router.get("/accounts", requireAuth, async (req, res) => {
  const callerRole = req.session.userRole ?? "";
  if (callerRole === "user") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
        createdBy: usersTable.createdBy,
      })
      .from(usersTable)
      .where(ne(usersTable.role, "master"));

    res.json(users);
  } catch (err) {
    console.error("List accounts error:", err);
    res.status(500).json({ error: "Failed to list accounts." });
  }
});

router.post("/accounts", requireAuth, async (req, res) => {
  const callerRole = req.session.userRole ?? "";
  const callerUsername = req.session.username ?? "";
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    res.status(400).json({ error: "username, password, and role are required." });
    return;
  }

  const allowed = ALLOWED_CREATE[callerRole] ?? [];
  if (!allowed.includes(role as "admin" | "user")) {
    res.status(403).json({ error: "You do not have permission to create this account type." });
    return;
  }

  if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
    res.status(400).json({ error: "Username must be 3–32 alphanumeric characters or underscores." });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const [created] = await db
      .insert(usersTable)
      .values({ username: username.trim(), passwordHash, role, createdBy: callerUsername })
      .returning({ id: usersTable.id, username: usersTable.username, role: usersTable.role });

    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Username already exists." });
    } else {
      console.error("Create account error:", err);
      res.status(500).json({ error: "Failed to create account." });
    }
  }
});

router.delete("/accounts/:id", requireAuth, async (req, res) => {
  const callerRole = req.session.userRole ?? "";
  const targetId = Number(req.params.id);

  if (isNaN(targetId)) {
    res.status(400).json({ error: "Invalid account ID." });
    return;
  }

  if (targetId === req.session.userId) {
    res.status(400).json({ error: "You cannot delete your own account." });
    return;
  }

  try {
    const [target] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, targetId))
      .limit(1);

    if (!target) {
      res.status(404).json({ error: "Account not found." });
      return;
    }

    const allowed = ALLOWED_DELETE[callerRole] ?? [];
    if (!allowed.includes(target.role as "admin" | "user")) {
      res.status(403).json({ error: "You do not have permission to delete this account." });
      return;
    }

    await db.delete(usersTable).where(eq(usersTable.id, targetId));
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ error: "Failed to delete account." });
  }
});

export default router;
