import { getToken } from "@/lib/apiToken";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN || "pharma-pay-tracker.onrender.com"}`;

export async function medpayApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body as T;
}

export type Agency = { id: number; name: string; existing?: boolean };

export type RegisterAgency = {
  agencyId: number;
  serialNumber: number;
  agencyName: string;
  totalBills: number;
  totalBillAmount: number;
  totalStores?: number;
  totalPaid: number;
  totalRemaining: number;
  status: "paid" | "partial" | "outstanding" | "no_transaction";
};

export type MonthlyRegister = {
  month: string;
  summary: {
    totalAgencies: number;
    totalBills: number;
    totalBillAmount: number;
    totalPaid: number;
    totalRemaining: number;
  };
  agencies: RegisterAgency[];
};
