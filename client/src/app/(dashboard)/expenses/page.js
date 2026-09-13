"use client";

import { CreditCard } from "lucide-react";
import LedgerPage from "@/components/LedgerPage";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export default function ExpensesPage() {
  return (
    <LedgerPage
      kind="expense"
      title="Expenses"
      description="Operating expenses across your business."
      emptyIcon={CreditCard}
      categories={EXPENSE_CATEGORIES}
    />
  );
}