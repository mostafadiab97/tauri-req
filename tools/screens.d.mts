export const SIZE: number
export const THRESHOLD: number
export function fingerprint(img: { width: number; height: number; data: Uint8Array }): string
export function distance(a: string, b: string): number
export function compare(saved: Record<string, string>, current: Record<string, string>): { changed: string[]; added: string[]; removed: string[] }
export function fingerprintsOf(dir: string): Record<string, string>
