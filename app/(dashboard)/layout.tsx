import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = requireUser();
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar email={user.email} />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
