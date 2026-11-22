export interface A11yFinding { id: string; impact: string; help: string; count: number; examples: string[] }
export function summarise(violations: Array<{ id: string; impact?: string | null; help: string; nodes: Array<{ target: unknown[] }> }>): A11yFinding[]
export function checkA11y(page: unknown, name: string, dir: string): Promise<A11yFinding[] | null>
export function report(dir: string): string
export function resetA11y(dir: string): void
