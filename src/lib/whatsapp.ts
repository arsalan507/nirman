/**
 * WhatsApp share helpers — generate formatted invoice messages
 * and open via wa.me deep link.
 */
import { format } from 'date-fns';
import type { Entry, Project } from '@/types';
import { CATEGORIES, formatINR, PAYMENT_MODES } from '@/lib/constants';

/**
 * Format a single entry as a WhatsApp-shareable invoice line.
 */
export function formatEntryAsInvoice(entry: Entry, project?: Project): string {
  const cat = CATEGORIES[entry.category];
  const pay = PAYMENT_MODES[entry.payment_mode];
  const lines: string[] = [
    `*${project?.name ?? 'Construction'} — Entry*`,
    `📅 ${format(new Date(entry.entry_date), 'dd MMM yyyy')}`,
    `${cat.icon} ${cat.label}${entry.subcategory ? ` — ${entry.subcategory}` : ''}`,
    `📝 ${entry.description}`,
    `💰 *${formatINR(entry.amount)}*`,
    `${pay.icon} ${pay.label}${entry.is_credit ? ' (Credit / Due)' : ''}`,
  ];
  if (entry.bill_number) lines.push(`🧾 Bill: ${entry.bill_number}`);
  if (entry.notes) lines.push(`📌 ${entry.notes}`);
  return lines.join('\n');
}

/**
 * Format multiple entries as a daily / weekly summary.
 */
export function formatSummary(
  entries: Entry[],
  project?: Project,
  title = 'Daily Summary'
): string {
  if (entries.length === 0) return 'No entries to share.';

  const total = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  const credit = entries
    .filter((e) => e.is_credit)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const byCategory = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {});

  const lines: string[] = [
    `*${title}* — ${project?.name ?? 'Construction'}`,
    `📅 ${format(new Date(entries[0].entry_date), 'dd MMM yyyy')}`,
    '',
    `*Entries (${entries.length}):*`,
  ];

  for (const e of entries.slice(0, 30)) {
    const cat = CATEGORIES[e.category];
    lines.push(`${cat.icon} ${e.description} — ${formatINR(Number(e.amount))}`);
  }

  if (entries.length > 30) lines.push(`... +${entries.length - 30} more`);

  lines.push('');
  lines.push('*By Category:*');
  for (const [catKey, sum] of Object.entries(byCategory)) {
    const cat = CATEGORIES[catKey as keyof typeof CATEGORIES];
    lines.push(`${cat.icon} ${cat.label}: ${formatINR(sum)}`);
  }

  lines.push('');
  lines.push(`*Total: ${formatINR(total)}*`);
  if (credit > 0) lines.push(`⏳ Of which credit / due: ${formatINR(credit)}`);
  lines.push('');
  lines.push('_Sent from Nirman_');

  return lines.join('\n');
}

/**
 * Open WhatsApp with a pre-filled message.
 * If `phone` provided, opens chat with that number; else opens share-to-anyone.
 */
export function shareToWhatsApp(message: string, phone?: string) {
  const encoded = encodeURIComponent(message);
  const url = phone
    ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
}
