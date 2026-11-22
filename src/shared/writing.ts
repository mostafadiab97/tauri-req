// Writing help (0.28.0): hints about a requirement's wording — vague words, no requirement word ("shall"), two
// requirement words in one sentence, passive voice. Suggestions only: they never block a save. Pure, so the window
// can run it on every key press and the tests can check it.
import type { Schema } from './domain'

export type WritingHint =
  | { kind: 'vague'; word: string }
  | { kind: 'noRequirementWord'; word: string }
  | { kind: 'twoInOneSentence'; word: string }
  | { kind: 'passive' }

/** English words that leave a requirement open to reading (INCOSE/ISO 29148 lists, shortened). */
export const DEFAULT_VAGUE_WORDS = [
  'adequate',
  'appropriate',
  'as appropriate',
  'as needed',
  'as soon as possible',
  'approximately',
  'easy',
  'efficient',
  'etc',
  'fast',
  'flexible',
  'if possible',
  'minimal',
  'normally',
  'optimal',
  'quickly',
  'reasonable',
  'robust',
  'several',
  'some',
  'state-of-the-art',
  'sufficient',
  'user-friendly',
  'usually',
  'and/or'
]

/**
 * The hints for one text. `requirement` = the item is a requirement (headings and information get only the vague-word
 * hints). Without project settings the English defaults apply, and only to text that is mostly English letters, so a
 * German or Arabic text is not told it lacks "shall"; a project sets its own words in schema.yaml (`writing:`).
 */
export function writingHints(text: string, schema: Pick<Schema, 'writing'>, requirement: boolean): WritingHint[] {
  const w = schema.writing
  if (w?.hints === false || !text.trim()) return []
  // each half on its own: a project's vague words do not switch the English "shall" check on for its texts
  const english = mostlyEnglish(text)
  const vague = w?.vagueWords ?? (english ? DEFAULT_VAGUE_WORDS : [])
  const word = w?.requirementWord !== undefined ? plain(w.requirementWord) : english ? 'shall' : ''
  if (vague.length === 0 && !word) return []
  // Arabic vowel signs (tashkeel) are left out on both sides, so "سريعٌ" matches "سريع"
  const lower = plain(text)
  const hints: WritingHint[] = []
  const structural: WritingHint[] = []
  const seen = new Set<string>()
  for (const v of vague) {
    const key = plain(v)
    if (seen.has(key)) continue
    if (wordIn(lower, key)) {
      seen.add(key)
      hints.push({ kind: 'vague', word: v })
    }
  }
  if (requirement && word) {
    if (!wordIn(lower, word)) structural.push({ kind: 'noRequirementWord', word })
    else if (sentences(lower).some((s) => count(s, word) > 1)) structural.push({ kind: 'twoInOneSentence', word })
    // "shall be checked", "shall be done": who checks it? English only; participles, not "between", "open" or "green"
    if (word === 'shall' && PASSIVE.test(lower) && !/\bby (the|a|an)\b/.test(lower)) structural.push({ kind: 'passive' })
  }
  // the hints about the sentence first, so many vague words cannot push them out
  return [...structural, ...hints].slice(0, 12)
}

const plain = (s: string): string => s.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '')

/** "shall be checked": be + a past participle (-ed, or a common irregular one); "be between", "be open" are not passive. */
const PASSIVE = /\b(shall|must|should) be (\w+ed|done|made|shown|given|taken|sent|kept|set|put|known|seen|written|built|run|read|held|found|told|chosen|driven|broken)\b/

/** The word or phrase stands on its own (not inside another word); works for any script. */
function wordIn(text: string, word: string): boolean {
  return count(text, word) > 0
}

function count(text: string, word: string): number {
  if (!word) return 0
  // spaces in a phrase match any white space, also a line break
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  // Arabic joins one-letter words to the next (و and, ف so, ب with, ل for, ك like): "فيجب" holds "يجب"
  const prefix = /^[\u0600-\u06FF]/.test(word) ? '[وفبلك]?' : ''
  // a word character is a letter, a mark (Arabic vowel signs), a digit or "_"
  return (text.match(new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}_])${prefix}${esc}(?=$|[^\\p{L}\\p{M}\\p{N}_])`, 'gu')) ?? []).length
}

// also the Arabic question mark and semicolon (؟ ؛ — Arabic review A2)
const sentences = (text: string): string[] => text.split(/(?<=[.!?;:\u061F\u061B])\s+|\n+/)

/** At least 60 % of the letters are A–Z (so the English defaults fit). */
function mostlyEnglish(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? []
  if (letters.length === 0) return false
  const latin = letters.filter((c) => /[a-z]/i.test(c)).length
  return latin / letters.length >= 0.6 && /\b(the|a|an|shall|is|be|of|to)\b/i.test(text)
}
