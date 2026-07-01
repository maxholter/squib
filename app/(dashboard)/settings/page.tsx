import { requireUser, getProfile } from "@/lib/auth";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const user = requireUser();
  const profile = getProfile(user.id);
  return <SettingsClient profile={profile} />;
}
