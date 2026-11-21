// Runs during the Netlify build, after database migrations.
// - ADMIN_EMAIL + ADMIN_PASSWORD set → creates or resets that admin login.
// - SEED_SAMPLE=1 → loads the sample catalogue (safe to repeat).
import { execSync } from "node:child_process";
const run = (cmd) => execSync(cmd, { stdio: "inherit", env: process.env });
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) run("npx tsx scripts/create-admin.ts");
if (process.env.SEED_SAMPLE === "1") run("npx tsx prisma/seed.ts");
