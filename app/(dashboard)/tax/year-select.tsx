"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

export function YearSelect({ year }: { year: number }) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) years.push(y);
  // Keep the selected year selectable even if it falls outside the default range.
  if (!years.includes(year)) years.push(year);
  years.sort((a, b) => a - b);

  return (
    <Select
      value={year}
      onChange={(e) => router.push(`/tax?year=${e.target.value}`)}
      className="w-32"
      aria-label="Tax year"
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </Select>
  );
}
