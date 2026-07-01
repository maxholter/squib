import { requireUser } from "@/lib/auth";
import { listPayrollRuns, listContractors, contractorYearlyTotals } from "@/lib/data";
import { PayrollClient } from "./payroll-client";

export const dynamic = "force-dynamic";

export default function PayrollPage() {
  const user = requireUser();
  const year = new Date().getFullYear();
  const runs = listPayrollRuns(user.id);
  const contractors = listContractors(user.id);
  const yearlyTotals = contractorYearlyTotals(user.id, year);
  return (
    <PayrollClient
      runs={runs}
      contractors={contractors}
      yearlyTotals={yearlyTotals}
      year={year}
    />
  );
}
