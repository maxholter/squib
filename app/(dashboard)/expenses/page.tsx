import { requireUser } from "@/lib/auth";
import { listTransactions, listAccounts } from "@/lib/data";
import { ExpensesClient } from "./expenses-client";

export const dynamic = "force-dynamic";

export default function ExpensesPage() {
  const user = requireUser();
  const transactions = listTransactions(user.id, { type: "expense" });
  const accounts = listAccounts(user.id);
  return <ExpensesClient transactions={transactions} accounts={accounts} />;
}
