// Edge cases: writing hints — odd input.
import { describe, expect, it } from 'vitest'
import { parseSchema } from '../src/modules/schema'
import { writingHints, DEFAULT_VAGUE_WORDS } from '../src/shared/writing'

const kinds = (t: string, s = {}, r = true) => writingHints(t, s, r).map((h) => h.kind)

describe('writing hints', () => {
  it('"shall be between 1 and 5 s" is not a passive sentence', () => {
    expect(kinds('The value shall be between 1 and 5 s.')).not.toContain('passive')
  })
  it('"shall be open" / "shall be green" are not passive', () => {
    expect(kinds('The door shall be open when the car stops.')).not.toContain('passive')
  })
  it('the "no requirement word" hint is not cut off by many vague words (12-hint cap)', () => {
    const text = DEFAULT_VAGUE_WORDS.filter((w) => !w.includes('/') && w !== 'etc').join(' and the ') + ' is of the system.'
    expect(kinds(text)).toContain('noRequirementWord')
  })
  it('regex special characters in custom words do not throw and match literally', () => {
    const s = { writing: { requirementWord: 'shall', vagueWords: ['c++', '(tbd)', '.*', '[x]', 'a|b', '\\'] } }
    expect(() => writingHints('We shall use c++ (tbd) .* [x] a|b \\ here.', s, true)).not.toThrow()
    expect(kinds('We shall use c++ here.', s)).toEqual(['vague'])
    expect(kinds('We shall use cxx here.', s)).toEqual([])
  })
  it('a very long text stays fast', () => {
    const t = ('The door shall lock quickly. ').repeat(20000)
    const a = Date.now()
    writingHints(t, {}, true)
    expect(Date.now() - a).toBeLessThan(2000)
  })
  it('a long text without any separator stays fast (no backtracking)', () => {
    const t = 'shall '.repeat(1) + 'a'.repeat(300000)
    const a = Date.now()
    writingHints(t, {}, true)
    expect(Date.now() - a).toBeLessThan(2000)
  })
  it('setting only German vague words does not make German text "lack shall"', () => {
    const s = { writing: { vagueWords: ['schnell'] } }
    expect(kinds('Die Tür verriegelt innerhalb von 2 s.', s)).not.toContain('noRequirementWord')
  })
  it('Arabic custom words match, also with a diacritic (tashkeel) on the word', () => {
    const s = { writing: { requirementWord: 'يجب', vagueWords: ['سريع'] } }
    expect(kinds('يجب أن يكون النظام سريع جدا.', s)).toEqual(['vague'])
    expect(kinds('يجب أن يكون النظام سريعٌ جدا.', s)).toEqual(['vague'])
  })
  it('German umlaut/sharp s words and upper case', () => {
    const s = { writing: { requirementWord: 'muss', vagueWords: ['größer', 'STRASSE'] } }
    expect(kinds('Die Tür MUSS größer sein als die Straße.', s)).toEqual(['vague'])
  })
  it('multi-word phrase over a line break or double space', () => {
    expect(kinds('The tool shall react as\nsoon as possible.')).toContain('vague')
    expect(kinds('The tool shall react as  needed.')).toContain('vague')
  })
  it('a custom word with blank / whitespace is dropped by the parser and never matches spaces', () => {
    const p = parseSchema('version: 1\nitemTypes: []\nfields: []\nlinkTypes: []\nwriting:\n  vagueWords: ["  ", "", "ok "]\n')
    expect(p.schema.writing?.vagueWords).toEqual(['ok'])
  })
  it('writing hints:"no" (string) is reported, not silently on', () => {
    const p = parseSchema('version: 1\nitemTypes: []\nfields: []\nlinkTypes: []\nwriting:\n  hints: "no"\n')
    expect(p.problems.some((x) => x.path === 'writing.hints')).toBe(true)
  })
  it('"some" is not found in "some-thing" or "Some_thing"', () => {
    expect(kinds('The tool shall keep some_thing safe.')).not.toContain('vague')
  })
  it('two shall in different sentences split by a colon / newline / semicolon are fine', () => {
    expect(kinds('The tool shall: lock the door; shall warn.')).toEqual([])
  })
})
