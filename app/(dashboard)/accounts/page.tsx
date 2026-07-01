import { requireUser } from "@/lib/auth";
import { listAccounts, accountTotals, accountTransactionCount } from "@/lib/data";
import { AccountsClient } from "./accounts-client";

export const dynamic = "force-dynamic";

export default function AccountsPage() {
  const user = requireUser();
  const accounts = listAccounts(user.id);
  const totals = accountTotals(user.id);
  const counts: Record<string, number> = {};
  for (const a of accounts) {
    counts[a.id] = accountTransactionCount(user.id, a.id);
  }
  return <AccountsClient accounts={accounts} totals={totals} counts={counts} />;
}
