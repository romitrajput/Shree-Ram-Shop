# Sharing the test shop through GitHub (no server needed)

GitHub Codespaces runs the whole website (shop, admin and database) on GitHub's computers and gives it a web link you can send to the owner.

## Start it

1. Open the repository on github.com (in a phone browser, switch to "Desktop site" if the button is hidden).
2. Green **Code** button → **Codespaces** tab → **Create codespace on main**.
3. Wait 4–6 minutes the first time. The terminal at the bottom installs everything, adds sample products and builds the shop.
4. When it's done the terminal prints:

```
Test shop:    https://<name>-3000.app.github.dev
Owner admin:  https://<name>-3000.app.github.dev/admin
Login:        owner@shreeramtrading.in  /  srt-xxxxxxxx
```

5. Send the owner those links and the login. The red "Test environment" bar on every page shows it isn't the live shop.

If the owner sees a GitHub sign-in page instead of the shop: in the Codespace open the **Ports** tab, right-click port **3000** → **Port visibility** → **Public**.

## Good to know

- The link works only while the Codespace is running. It stops after 30 minutes without activity; reopen it from **Code → Codespaces** and the same link works again (data is kept). You can raise the timeout in GitHub → Settings → Codespaces → Default idle timeout.
- Personal GitHub accounts get about 60 free hours a month on a 2-core Codespace. **Stop** it when testing is done.
- Everything here is test data. Sample products, prices and traffic can be edited or deleted in the admin panel.
- After new code is pushed, run this in the Codespace terminal:
  `git pull && npm install && npx prisma migrate deploy && npm run build && bash .devcontainer/start.sh`

When a server is ready, follow docs/DEPLOYMENT.md for the permanent test and live sites, then set the repository variable `DEPLOY_ENABLED` to `true`.
