import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function seedMasterAccount() {
  try {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, "dkisling"))
      .limit(1);

    if (existing) {
      return;
    }

    const passwordHash = await bcrypt.hash("CCK4ever2@", 12);
    await db.insert(usersTable).values({
      username: "dkisling",
      passwordHash,
      role: "master",
      createdBy: "system",
    });

    console.log("Master account created: dkisling");
  } catch (err) {
    console.error("Failed to seed master account:", err);
  }
}
