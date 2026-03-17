import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { searchesTable, searchFoldersTable } from "@workspace/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const MAX_SEARCHES = 100;

async function generateTitle(type: string, query: string): Promise<string> {
  try {
    const prompt =
      type === "translate"
        ? `Create a concise 3-6 word title for this English-to-ASL translation search: "${query}". Return ONLY the title, no punctuation at the end, no quotes.`
        : `Create a concise 3-6 word title for this ASL dictionary lookup: "${query}". Return ONLY the title, no punctuation at the end, no quotes.`;

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 20,
    });
    return res.choices[0]?.message?.content?.trim() || query.slice(0, 40);
  } catch {
    return query.slice(0, 40);
  }
}

router.get("/history/count", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  try {
    const [row] = await db
      .select({ count: count() })
      .from(searchesTable)
      .where(eq(searchesTable.userId, userId));
    res.json({ count: row?.count ?? 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to get count" });
  }
});

router.get("/history", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  try {
    const [searches, folders] = await Promise.all([
      db
        .select()
        .from(searchesTable)
        .where(eq(searchesTable.userId, userId))
        .orderBy(desc(searchesTable.createdAt))
        .limit(MAX_SEARCHES),
      db
        .select()
        .from(searchFoldersTable)
        .where(eq(searchFoldersTable.userId, userId))
        .orderBy(searchFoldersTable.name),
    ]);
    res.json({ searches, folders });
  } catch (err) {
    res.status(500).json({ error: "Failed to load history" });
  }
});

router.post("/history", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const { type, query, result } = req.body;

  if (!type || !query || !result) {
    res.status(400).json({ error: "type, query, and result are required" });
    return;
  }

  try {
    const [{ count: currentCount }] = await db
      .select({ count: count() })
      .from(searchesTable)
      .where(eq(searchesTable.userId, userId));

    if (currentCount >= MAX_SEARCHES) {
      res.status(409).json({ error: "History is full", count: currentCount });
      return;
    }

    const title = await generateTitle(type, query);

    const [inserted] = await db
      .insert(searchesTable)
      .values({ userId, type, query, result, title })
      .returning();

    res.json(inserted);
  } catch (err) {
    console.error("History POST error:", err);
    res.status(500).json({ error: "Failed to save search" });
  }
});

router.put("/history/:id", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id);
  const { title, folderId } = req.body;

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const updates: Record<string, any> = {};
  if (typeof title === "string") updates.title = title.trim() || "Untitled";
  if ("folderId" in req.body) updates.folderId = folderId ?? null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  try {
    const [updated] = await db
      .update(searchesTable)
      .set(updates)
      .where(and(eq(searchesTable.id, id), eq(searchesTable.userId, userId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update" });
  }
});

router.delete("/history/:id", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    await db
      .delete(searchesTable)
      .where(and(eq(searchesTable.id, id), eq(searchesTable.userId, userId)));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

router.post("/history/folders", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const { name } = req.body;

  if (!name?.trim()) {
    res.status(400).json({ error: "Folder name is required" });
    return;
  }

  try {
    const [folder] = await db
      .insert(searchFoldersTable)
      .values({ userId, name: name.trim() })
      .returning();
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: "Failed to create folder" });
  }
});

router.put("/history/folders/:id", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id);
  const { name } = req.body;

  if (isNaN(id) || !name?.trim()) {
    res.status(400).json({ error: "Valid id and name required" });
    return;
  }

  try {
    const [updated] = await db
      .update(searchFoldersTable)
      .set({ name: name.trim() })
      .where(and(eq(searchFoldersTable.id, id), eq(searchFoldersTable.userId, userId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to rename folder" });
  }
});

router.delete("/history/folders/:id", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    await db
      .delete(searchFoldersTable)
      .where(and(eq(searchFoldersTable.id, id), eq(searchFoldersTable.userId, userId)));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete folder" });
  }
});

export default router;
