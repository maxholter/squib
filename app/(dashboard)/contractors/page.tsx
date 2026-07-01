import { requireUser } from "@/lib/auth";
import { listContractors, payrollForContractor, contractorTotalPaid } from "@/lib/data";
import type { PayrollRun } from "@/lib/types";
import { ContractorsClient } from "./contractors-client";

export const dynamic = "force-dynamic";

export interface ContractorDetail {
  runs: PayrollRun[];
  totalPaid: number;
}

export default function ContractorsPage() {
  const user = requireUser();
  const contractors = listContractors(user.id);
  const currentYear = new Date().getFullYear();

  const details: Record<string, ContractorDetail> = {};
  for (const c of contractors) {
    details[c.id] = {
      runs: payrollForContractor(user.id, c.id),
      totalPaid: contractorTotalPaid(user.id, c.id, currentYear),
    };
  }

  return <ContractorsClient contractors={contractors} details={details} year={currentYear} />;
}
