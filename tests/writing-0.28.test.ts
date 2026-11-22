// 0.28.0 writing help and templates per type (A8).
import { describe, expect, it } from 'vitest'
import { parseSchema } from '../src/modules/schema'
import { writingHints } from '../src/shared/writing'

const none = {}

describe('0.28.0 writing hints', () => {
  it('a clear requirement gets no hints', () => {
    expect(writingHints('The door shall lock within 2 s after the car starts moving.', none, true)).toEqual([])
  })
  it('vague words, each once, whole words only', () => {
    const h = writingHints('The display shall be user-friendly and fast. Fast means fast. Steadfast is a word.', none, true)
    expect(h.filter((x) => x.kind === 'vague').map((x) => (x as { word: string }).word)).toEqual(['fast', 'user-friendly'])
  })
  it('no "shall", or "shall" twice in one sentence; headings only get the vague-word hints', () => {
    expect(writingHints('The door locks within 2 s.', none, true)).toEqual([{ kind: 'noRequirementWord', word: 'shall' }])
    expect(writingHints('The door shall lock and the alarm shall sound.', none, true)).toEqual([{ kind: 'twoInOneSentence', word: 'shall' }])
    expect(writingHints('The door shall lock. The alarm shall sound.', none, true)).toEqual([])
    expect(writingHints('This chapter is about the door, etc.', none, false)).toEqual([{ kind: 'vague', word: 'etc' }])
  })
  it('passive voice without an actor', () => {
    expect(writingHints('The input shall be checked.', none, true)).toEqual([{ kind: 'passive' }])
    expect(writingHints('The input shall be checked by the controller.', none, true)).toEqual([])
  })
  it('the English defaults stay away from other languages; a project can set its own words', () => {
    expect(writingHints('Die Tür muss innerhalb von 2 s verriegeln.', none, true)).toEqual([])
    expect(writingHints('يجب أن يُقفل الباب خلال ثانيتين.', none, true)).toEqual([])
    const de = { writing: { requirementWord: 'muss', vagueWords: ['schnell', 'ausreichend'] } }
    expect(writingHints('Die Tür verriegelt schnell.', de, true)).toEqual([
      { kind: 'noRequirementWord', word: 'muss' },
      { kind: 'vague', word: 'schnell' }
    ])
    const ar = { writing: { requirementWord: 'يجب', vagueWords: ['سريع'] } }
    expect(writingHints('الباب سريع.', ar, true)).toEqual([
      { kind: 'noRequirementWord', word: 'يجب' },
      { kind: 'vague', word: 'سريع' }
    ])
    expect(writingHints('The door is fast.', { writing: { hints: false } }, true)).toEqual([])
  })
})

describe('0.28.0 schema: templates and writing settings', () => {
  const yaml = (extra: string): string => `version: 1
itemTypes:
  - id: test-case
    name: Test Case
${extra}
fields:
  - { id: status, name: Status, type: enum, options: [Draft, Approved], default: Draft }
  - { id: method, name: Method, type: enum, options: [Test, Review] }
linkTypes:
  - { id: verifies, name: verifies, reverseName: verified by }
`
  it('reads a template; field values must exist and be valid', () => {
    const r = parseSchema(yaml(`    template: { text: "Steps:", fields: { method: Test, status: Nope, ghost: x } }`))
    expect(r.schema.itemTypes[0]?.template).toEqual({ text: 'Steps:', fields: { method: 'Test' } })
    expect(r.problems.map((p) => p.path).sort()).toEqual(['itemTypes.test-case.template.fields.ghost', 'itemTypes.test-case.template.fields.status'])
  })
  it('reads the writing settings', () => {
    const r = parseSchema(`${yaml('')}writing: { requirementWord: muss, vagueWords: [schnell, 3], hints: true }\n`)
    expect(r.schema.writing).toEqual({ hints: true, requirementWord: 'muss', vagueWords: ['schnell'] })
    expect(parseSchema(`${yaml('')}writing: [x]\n`).problems.map((p) => p.path)).toEqual(['writing'])
  })
})

describe('0.28.0 Arabic review fixes', () => {
  const ar = { writing: { requirementWord: 'يجب', vagueWords: ['سريع'] } }
  it('A1: a one-letter prefix (ف, و …) does not hide the requirement word', () => {
    expect(writingHints('إذا حدث خطأ، فيجب على النظام أن يعرض رسالة.', ar, true)).toEqual([])
    expect(writingHints('ويجب أن يسجل النظام الحدث.', ar, true)).toEqual([])
  })
  it('A2: the Arabic question mark and semicolon end a sentence', () => {
    expect(writingHints('يجب أن يكون الرد واضحًا؟ يجب أن يسجل.', ar, true)).toEqual([])
    expect(writingHints('يجب أن يقفل الباب؛ يجب أن يرن الإنذار.', ar, true)).toEqual([])
  })
})
