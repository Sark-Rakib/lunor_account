"use client";

import { HandCoins } from "lucide-react";
import LedgerPage from "@/components/LedgerPage";
import { INCOME_CATEGORIES } from "@/lib/constants";

export default function IncomePage() {
  return (
    <LedgerPage
      kind="income"
      title="Income"
      description="Non-sales income such as services and miscellaneous revenue."
      emptyIcon={HandCoins}
      categories={INCOME_CATEGORIES}
    />
  );
}