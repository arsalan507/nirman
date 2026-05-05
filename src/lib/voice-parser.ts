/**
 * Parse a Hindi/Kannada/English transcript into entry fields.
 * Handles things like:
 *   "do hazaar rupye cement Ramesh ko"
 *   "5000 mason 4 din"
 *   "₹3500 jcb rental"
 *   "tin sau electricity bill"
 */
import { detectCategory } from '@/lib/constants';

const HINDI_NUM_WORDS: Record<string, number> = {
  ek: 1, do: 2, teen: 3, tin: 3, char: 4, chaar: 4, panch: 5, paanch: 5,
  che: 6, chhe: 6, saat: 7, aath: 8, nau: 9, das: 10, dus: 10,
  bees: 20, tees: 30, chalis: 40, pachas: 50, saath: 60, sattar: 70,
  assi: 80, nabbe: 90, sau: 100, hazaar: 1000, hazar: 1000, lakh: 100000,
};

/**
 * Extract amount from text. Handles digits and Hindi/Kannada number words.
 * Returns the FIRST detected amount.
 */
export function extractAmount(text: string): number | null {
  const t = text.toLowerCase().replace(/[₹,]/g, '').trim();

  // Direct digit match (e.g. "5000", "3,500")
  const digitMatch = t.match(/\b(\d+(?:\.\d+)?)\b/);
  if (digitMatch) {
    const n = Number(digitMatch[1]);
    if (n > 0) return n;
  }

  // Hindi number word combinations: "do hazaar", "panch sau", "ek lakh"
  const tokens = t.split(/\s+/);
  let total = 0;
  let current = 0;
  let foundAny = false;

  for (const tok of tokens) {
    const num = HINDI_NUM_WORDS[tok];
    if (num !== undefined) {
      foundAny = true;
      if (num >= 100) {
        current = Math.max(current, 1) * num;
      } else {
        current += num;
      }
    } else if (foundAny && current > 0) {
      total += current;
      current = 0;
      foundAny = false;
    }
  }
  total += current;
  return total > 0 ? total : null;
}

export interface ParsedVoiceEntry {
  amount: number | null;
  description: string;
  category: ReturnType<typeof detectCategory>['category'];
  subcategory?: string;
  rawTranscript: string;
}

/**
 * Parse full voice transcript into an entry draft.
 */
export function parseVoiceTranscript(transcript: string): ParsedVoiceEntry {
  const amount = extractAmount(transcript);
  const { category, subcategory } = detectCategory(transcript);

  // Description = transcript with detected amount removed
  let description = transcript;
  if (amount !== null) {
    description = description.replace(/\b\d+(?:[.,]\d+)?\b/, '').trim();
  }
  // Strip common Hindi number/currency words
  description = description
    .replace(/\b(rupye|rupee|rupees|rs\.?)\b/gi, '')
    .replace(/\b(do|tin|teen|char|paanch|hazaar|hazar|sau|lakh)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    amount,
    description: description || transcript,
    category,
    subcategory,
    rawTranscript: transcript,
  };
}
