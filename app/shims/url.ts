// node:url (only the file-URL helpers)
export const fileURLToPath = (u: string | URL): string => decodeURIComponent(new URL(String(u)).pathname).replace(/^\/([A-Za-z]:)/, '$1')
export const pathToFileURL = (p: string): URL => new URL(`file:///${p.replace(/\\/g, '/').replace(/^\//, '')}`)
export default { fileURLToPath, pathToFileURL, URL }
