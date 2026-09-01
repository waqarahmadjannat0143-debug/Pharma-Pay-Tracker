export function formatDateDDMMYY(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const raw = String(dateStr).slice(0, 10);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1].slice(-2)}`;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6)].filter(Boolean).join("-");
}

export function formatLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ddmmyyToISO(value: string): string | null {
  const m = value.trim().match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const yyyy = 2000 + Number(m[3]);
  const mm = Number(m[2]);
  const dd = Number(m[1]);
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}
