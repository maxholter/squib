import { requireUser } from "@/lib/auth";
import { listTransactions, listAccounts } from "@/lib/data";
import { IncomeClient } from "./income-client";

export const dynamic = "force-dynamic";

export default function IncomePage() {
  const user = requireUser();
  const transactions = listTransactions(user.id, { type: "income" });
  const accounts = listAccounts(user.id);
  return <IncomeClient transactions={transactions} accounts={accounts} />;
}
