export function parseRules(text: string): string[]
export function chooseFiles(
  tracked: string[],
  rules: string[],
  options?: { withTauri?: boolean }
): { chosen: string[]; renamed: { from: string; to: string }[] }
