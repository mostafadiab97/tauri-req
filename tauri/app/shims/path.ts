// node:path for reqochet's core: pathe (forward slashes on every system; Windows accepts them).
import * as p from 'pathe'
export const { basename, dirname, extname, isAbsolute, join, normalize, relative, resolve, parse, format, toNamespacedPath } = p
export const sep = '/'
export const delimiter = navigator.userAgent.includes('Windows') ? ';' : ':'
const all = { ...p, sep, delimiter }
export const posix = all
export const win32 = all
export default { ...all, posix, win32 }
