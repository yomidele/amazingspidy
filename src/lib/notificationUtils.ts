// Parse beneficiary-style fields out of a notification message.
// The DB triggers embed bank/account info into the message text using
// patterns like "• Bank: HSBC • Acct: 12345678" or template placeholders.

export interface BeneficiaryHints {
  memberName?: string;
  bankName?: string;
  accountNumber?: string;
  monthLabel?: string;
}

export const parseBeneficiaryHints = (title: string, message: string): BeneficiaryHints => {
  const hints: BeneficiaryHints = {};

  // Bank: word(s) up to next bullet/end
  const bank = message.match(/Bank:\s*([^•\n]+?)(?:\s*•|\s*$)/i);
  if (bank) hints.bankName = bank[1].trim();

  // Acct: 6-12 digits
  const acct = message.match(/Acct(?:ount)?:?\s*([0-9]{4,12})/i);
  if (acct) hints.accountNumber = acct[1].trim();

  // Month "January 2026" pattern
  const month = message.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/
  );
  if (month) hints.monthLabel = month[0];

  // Member name = leading "<Name> is the beneficiary" (default trigger phrasing)
  const nameLead = message.match(/^([^•\n]+?)\s+is the beneficiary/i);
  if (nameLead) hints.memberName = nameLead[1].trim();
  // Fallback: "for <Name>" or assigned-to phrasing — leave undefined if no clean match

  return hints;
};

export const maskAccount = (acct?: string | null): string | null => {
  if (!acct) return null;
  const s = String(acct);
  if (s.length <= 4) return s;
  return `${s.slice(0, 4)}${"*".repeat(Math.max(0, s.length - 7))}${s.slice(-3)}`;
};

export const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

export const groupByPeriod = <T extends { created_at: string }>(items: T[]) => {
  const today: T[] = [];
  const week: T[] = [];
  const earlier: T[] = [];
  const now = Date.now();
  const dayMs = 86_400_000;
  for (const it of items) {
    const age = now - new Date(it.created_at).getTime();
    if (age < dayMs) today.push(it);
    else if (age < 7 * dayMs) week.push(it);
    else earlier.push(it);
  }
  return { today, week, earlier };
};
