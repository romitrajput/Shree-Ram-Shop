/**
 * Create or reset an admin login.
 *   ADMIN_EMAIL=staff@x.in ADMIN_PASSWORD='long-password' ADMIN_ROLE=STAFF npm run create-admin
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const role = process.env.ADMIN_ROLE === "STAFF" ? "STAFF" : "OWNER";
  if (!email || !password || password.length < 10) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ characters).");
  const passwordHash = await bcrypt.hash(password, 12);
  await db.adminUser.upsert({
    where: { email },
    create: { email, name: process.env.ADMIN_NAME || email.split("@")[0], passwordHash, role },
    update: { passwordHash, role }
  });
  console.log(`${role} login ready for ${email}`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
