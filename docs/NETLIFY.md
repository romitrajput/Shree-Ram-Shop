# Test site on Netlify

Netlify runs the Next.js app; the database is a free Neon Postgres; uploaded photos go to Netlify Blobs (built in, nothing to set up).

1. **Database:** sign up at neon.tech, create a project (region: Singapore / AWS ap-southeast-1), copy the connection string.
2. **Netlify:** Add new site → Import from GitHub → pick this repo, branch `develop` (or `main`). Build settings come from `netlify.toml`.
3. **Environment variables** (Site configuration → Environment variables), before the first deploy:

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `AUTH_SECRET` | 40+ random characters |
| `SITE_URL` | `https://<your-site>.netlify.app` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | the test admin login (password 10+ characters) |
| `SEED_SAMPLE` | `1` to load sample products |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | optional: password-protect the whole test site |

4. Deploy. The build applies database migrations, creates the admin login and loads sample products.
5. Open `/admin`, sign in, and set the UPI ID and WhatsApp number in Shop settings.

Every push to the connected branch redeploys. Production can stay on the server setup in `DEPLOYMENT.md`.
