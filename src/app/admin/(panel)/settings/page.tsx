import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettings() {
  await requireAdmin();
  const s = await getSettings();
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold">Shop settings</h1>
      <p className="mt-2 text-ink-soft">Payment and contact details shown to customers. Test and live shops have separate settings.</p>
      <SettingsForm settings={s} />
    </div>
  );
}
