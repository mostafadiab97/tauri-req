// Prints a calls-test result: one line per call, the count, and GitHub annotations for failures.
export function summarize(r, engine) {
  if (r.crashed) {
    console.log(`::error title=Calls test (${engine}) crashed::${String(r.crashed).slice(0, 900).replace(/\r?\n/g, '%0A')}`)
    return { passed: 0, total: 0 }
  }
  // exportItems runs once per format; the contract call counts once (passes when every format passes)
  const byCall = new Map()
  for (const x of r.results) {
    const call = x.name.split(':')[0]
    const prev = byCall.get(call)
    byCall.set(call, prev ? { ...prev, ok: prev.ok && x.ok, note: [prev.note, x.ok ? '' : `${x.name}: ${x.note}`].filter(Boolean).join(' | ') } : { ...x, name: call, note: x.ok ? '' : x.name.includes(':') ? `${x.name}: ${x.note}` : x.note })
  }
  const calls = [...byCall.values()]
  const passed = calls.filter((c) => c.ok).length
  for (const x of r.results) console.log(`${x.ok ? '  ✓' : '  ✗'} ${x.name} (${x.ms} ms)${x.ok && !x.name.startsWith('security:') ? '' : ` — ${x.note}`}`)
  console.log(`\n${engine}: ${passed} of ${calls.length} calls pass (${r.totalMs} ms in all)`)
  const d = r.data
  const dataLine = d ? `data self-test ${d.items} items: write ${d.writeMs} ms, first index ${d.firstIndexMs} ms, re-sync ${d.resyncMs} ms, slowest query ${d.slowestQueryMs} ms` : ''
  if (d) console.log(dataLine)
  if (r.probe) {
    console.log(`probe: ${JSON.stringify(r.probe)}`)
    if (process.env.GITHUB_ACTIONS) console.log(`::notice title=Probe (${engine})::${JSON.stringify(r.probe)}`)
  }
  const b = r.batch
  const batchLine = b ? ` Bulk calls: ${b.calls} Rust calls carried ${b.ops} file calls. Git processes: ${Object.values(b.git ?? {}).reduce((x, y) => x + y, 0)} (status ${b.git?.status ?? 0}).` : ''
  if (b) console.log(batchLine)
  const failed = calls.filter((c) => !c.ok)
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::notice title=Calls test (${engine})::${passed} of ${calls.length} window.reqochet calls pass; total ${r.totalMs} ms. ${dataLine}.${batchLine}`)
    if (failed.length) console.log(`::warning title=${engine}: ${failed.length} call(s) failed::${failed.map((c) => `${c.name}: ${String(c.note).slice(0, 300)}`).join(' %0A ').replace(/::/g, ': :')}`)
  }
  return { passed, total: calls.length, failed: failed.map((c) => c.name) }
}
