// The shared calls test: every call of the window.reqochet contract, run against a fresh Git repository with a
// bare "GitHub" remote, through the real bridge. The same function runs in Electron (baseline) and in Tauri, so a
// call that passes in Electron and fails in Tauri is a Tauri gap. Kept self-contained (it is sent into the page as
// text): no imports, no outside variables.
//
//   runCalls(api, env) → { results: [{ name, ok, ms, note }], totalMs }
//   env: { tmp(name), git(cwd, args), write(path, text), answer({ open?, save?, message? }), dataCount?, progress?(results) }
export async function runCalls(api, env) {
  const results = []
  const short = (v) => {
    try {
      return JSON.stringify(v).slice(0, 160)
    } catch {
      return String(v).slice(0, 160)
    }
  }
  const T = async (name, fn, check = () => true) => {
    const t0 = performance.now()
    try {
      const v = await fn()
      const ok = !!check(v)
      results.push({ name, ok, ms: Math.round(performance.now() - t0), note: ok ? '' : `unexpected: ${short(v)}` })
      await env.progress?.(results)
      return v
    } catch (e) {
      results.push({ name, ok: false, ms: Math.round(performance.now() - t0), note: String(e?.message ?? e).slice(0, 240) })
      await env.progress?.(results)
      return undefined
    }
  }
  const isOk = (v) => v && v.ok === true
  const resolves = (v) => v === undefined || v !== null || v === null
  const hasOk = (v) => v && typeof v.ok === 'boolean'
  const same = (a, b) => String(a).replace(/\\/g, '/').toLowerCase() === String(b).replace(/\\/g, '/').toLowerCase()
  const started = performance.now()

  // ---------- app, theme, updates
  await T('getAppInfo', () => api.getAppInfo(), (v) => !!v.version)
  await T('getGitInfo', () => api.getGitInfo(), (v) => v.installed === true)
  await T('getTheme', () => api.getTheme(), (v) => !!v.config)
  const layers = await T('getThemeLayers', () => api.getThemeLayers(), (v) => !!v.base && typeof v.revision === 'string')
  await T('saveUserTheme', () => api.saveUserTheme(layers?.user ?? {}, layers?.revision ?? ''), (v) => !!v.config)
  await T('setWindowIcon', () => api.setWindowIcon('dark'), resolves)
  await T('setLanguage', () => api.setLanguage('en'), resolves)
  await T('getUpdateStatus', () => api.getUpdateStatus(), (v) => typeof v.state === 'string')
  await T('checkForUpdates', () => api.checkForUpdates(), resolves)
  // installUpdate closes the window and installs (it is offered only when an update is ready): the update test covers it
  await T('resumeUpdates', () => api.resumeUpdates(), resolves)
  await T('listEarlierVersions', () => api.listEarlierVersions(), hasOk)
  await T('installEarlierVersion', () => api.installEarlierVersion('0.0.0'), (v) => v.ok === false)
  await T('onUpdateStatus', async () => api.onUpdateStatus(() => {}), (v) => typeof v === 'function')
  await T('reportUiError', async () => api.reportUiError('calls test: a harmless UI error report'), resolves)
  await T('getDiagnostics', () => api.getDiagnostics(), (v) => typeof v === 'string' && v.length > 0)
  await T('openLogFolder', () => api.openLogFolder(), resolves)
  await T('openThemeFolder', () => api.openThemeFolder(), resolves)

  // ---------- a project
  const root = await env.tmp('calls-repo')
  const remote = await env.tmp('calls-remote')
  const out = await env.tmp('calls-out')
  await env.git(root, ['init', '-q', '-b', 'main'])
  await env.git(root, ['config', 'user.name', 'Calls Test'])
  await env.git(root, ['config', 'user.email', 'calls@example.com'])
  await env.git(remote, ['init', '-q', '--bare', '-b', 'main'])
  await env.git(root, ['remote', 'add', 'origin', remote])

  await env.answer({ open: [root] })
  await T('pickFolder', () => api.pickFolder(), (v) => same(v, root))
  await T('checkFolder', () => api.checkFolder(root), (v) => v.state === 'not-initialized' || v.state === 'ready')
  let info = await T('initializeRepository', () => api.initializeRepository(root), (v) => same(v.root, root))
  info = (await T('openRepository', () => api.openRepository(root), (v) => same(v.root, root))) ?? info
  await T('refreshRepository', () => api.refreshRepository(), (v) => same(v.root, root))
  await T('getRecentRepositories', () => api.getRecentRepositories(), (v) => Array.isArray(v) && v.some((r) => same(r.root ?? r.path ?? r, root)))
  const t = info?.schema?.itemTypes?.[0]?.id ?? 'requirement'
  const lt = info?.schema?.linkTypes?.[0]?.id ?? 'refines'
  const doc = info?.defaultDocument ?? ''

  const a = await T('newItem', () => api.newItem(t), (v) => !!v.id)
  // a new item exists once it is saved (the screens do the same: new → edit → save)
  await T('saveItem', () => api.saveItem({ ...a, title: 'Alpha' }, null), isOk)
  const b0 = await api.newItem(t).catch(() => null)
  const b = b0 ? ((await api.saveItem({ ...b0, title: 'Beta' }, null).catch(() => null))?.details?.item ?? b0) : null
  await T('wordTemplates', () => api.wordTemplates(), Array.isArray)
  const da = await T('getItem', () => api.getItem(a?.id), (v) => v && v.item.id === a.id && !!v.revision)
  await T('saveItem:again', () => api.saveItem({ ...da.item, title: 'Alpha', text: 'The first requirement.' }, da.revision), isOk)
  await T('queryItems', () => api.queryItems({ limit: 50 }), (v) => typeof v.total === 'number' && v.total >= 2)
  await T('getAncestors', () => api.getAncestors(b.id), Array.isArray)
  await T('addLink', () => api.addLink(b.id, lt, a.id), isOk)
  await T('getImpact', () => api.getImpact(a.id), (v) => v && typeof v === 'object')
  await T('getMatrix', () => api.getMatrix({ rowType: t, colType: t }), (v) => v && typeof v === 'object')
  await T('getCoverage', () => api.getCoverage(), (v) => v && typeof v === 'object')
  const field = info?.schema?.fields?.[0]?.id ?? 'status'
  await T('getFieldValues', () => api.getFieldValues(field), Array.isArray)
  await T('getTypeUsage', () => api.getTypeUsage(), (v) => v && typeof v.items === 'object')
  await T('checkFields', () => api.checkFields(info.schema.fields), Array.isArray)
  const rules = await T('starterRules', () => api.starterRules(), Array.isArray)
  const r1 = await T('saveSchemaRules', () => api.saveSchemaRules(rules ?? [], info.schemaRevision), isOk)
  info = r1?.info ?? (await api.refreshRepository())
  const r2 = await T('saveSchemaFields', () => api.saveSchemaFields(info.schema.fields, info.schemaRevision), isOk)
  info = r2?.info ?? (await api.refreshRepository())
  await T('saveSchemaTypes', () => api.saveSchemaTypes(info.schema.itemTypes, info.schema.linkTypes, info.schemaRevision), isOk)
  await T('removeLink', () => api.removeLink(b.id, lt, a.id), isOk)
  await api.addLink(b.id, lt, a.id).catch(() => null)
  await T('decideLinks', () => api.decideLinks([{ source: b.id, type: lt, target: a.id, keep: true }]), isOk)
  await T('moveItem', () => api.moveItem(b.id, 'up'), hasOk)
  await T('reparentItem', () => api.reparentItem(b.id, a.id), isOk)
  await T('reparentItems', () => api.reparentItems([b.id], null), isOk)
  const dup = await T('duplicateItem', () => api.duplicateItem(a.id, false), (v) => isOk(v) && !!v.newId)
  await T('changeItems', () => api.changeItems([b.id], { kind: 'type', type: t }), isOk)
  await T('listViews', () => api.listViews(), (v) => Array.isArray(v.personal))
  await T('saveView', () => api.saveView({ name: 'calls view', text: 'Alpha' }, 'personal'), isOk)
  await T('deleteView', () => api.deleteView('calls view', 'personal'), isOk)
  await T('createDocument', () => api.createDocument('Second'), isOk)
  await T('renameDocument', () => api.renameDocument('Second', 'Third'), isOk)
  await T('mergeDocument', () => api.mergeDocument('Third', doc), isOk)
  await api.createDocument('Fourth').catch(() => null)
  await T('deleteDocument', () => api.deleteDocument('Fourth'), isOk)
  await T('renameProjectFolder', () => api.renameProjectFolder(), hasOk)
  await T('fixFileName', () => api.fixFileName(a.id), hasOk)
  await T('renewCopyId', () => api.renewCopyId(dup?.newId ?? b.id), hasOk)

  // ---------- Git
  await T('setGitIdentity', () => api.setGitIdentity('Calls Test', 'calls@example.com'), isOk)
  await T('getGitState', () => api.getGitState(), (v) => v.available === true)
  await T('commit', () => api.commit('Calls test: first items'), isOk)
  await T('push', () => api.push(), isOk)
  const hist = await T('getHistory', () => api.getHistory({}), (v) => Array.isArray(v.commits) && v.commits.length > 0)
  const h = hist?.commits?.[0]?.hash ?? 'HEAD'
  await T('getItemHistory', () => api.getItemHistory(a.id), (v) => Array.isArray(v) && v.length > 0)
  await T('compareItemVersion', () => api.compareItemVersion(a.id, h), (v) => v && typeof v === 'object')
  try {
    const da2 = await api.getItem(a.id)
    await api.saveItem({ ...da2.item, title: 'Alpha changed' }, da2.revision)
    await api.commit('Calls test: Alpha changed') // a restore refuses to overwrite an uncommitted change
  } catch (e) {
    results.push({ name: '(helper: change Alpha)', ok: false, ms: 0, note: String(e?.message ?? e) })
  }
  await T('restoreItemVersion', () => api.restoreItemVersion(a.id, h), isOk)
  await T('revertChange', () => api.revertChange(a.id, { kind: 'text' }), hasOk)
  await T('discardChanges', () => api.discardChanges([]), hasOk)
  const opts = await T('getCompareOptions', () => api.getCompareOptions(), (v) => Array.isArray(v.commits))
  await T('compareVersions', () => api.compareVersions(opts?.commits?.[0]?.hash ?? h, 'WORKING'), (v) => v && typeof v === 'object')
  await T('listBranches', () => api.listBranches(), (v) => Array.isArray(v) && v.length > 0)
  await T('createBranch', () => api.createBranch('calls-feature'), isOk)
  await T('switchBranch', () => api.switchBranch('main', 'take'), isOk)
  await T('branchRange', () => api.branchRange('calls-feature'), resolves)
  await T('createBranchAt', () => api.createBranchAt('calls-old', h), isOk)
  await T('deleteBranch', () => api.deleteBranch('calls-old', true), isOk)
  await T('pull', () => api.pull(), hasOk)
  const pf = await T('pullFrom', () => api.pullFrom('calls-feature'), hasOk)
  await T('finishPull', () => (pf?.plan ? api.finishPull(pf.plan, {}) : Promise.resolve({ ok: true, skipped: true })), hasOk)
  await T('createBaseline', () => api.createBaseline({ name: 'calls-baseline', note: 'calls test', uncommitted: 'without' }), isOk)
  await T('listBaselines', () => api.listBaselines(), Array.isArray)
  await T('openVersion', () => api.openVersion(h), isOk)
  await T('closeVersion', () => api.closeVersion(), (v) => same(v.root, root))
  await api.commit('Calls test: second').catch(() => null)
  await T('undoLastCommit', () => api.undoLastCommit(), hasOk)
  await T('publishToRemote', () => api.publishToRemote(remote), hasOk)

  // ---------- export (each save dialog answered with a file in the out folder)
  const sep = root.includes('\\') ? '\\' : '/'
  for (const format of ['csv', 'markdown', 'xlsx', 'reqif', 'docx', 'html', 'pdf']) {
    await env.answer({ save: [`${out}${sep}items.${format === 'markdown' ? 'md' : format}`] })
    await T(`exportItems:${format}`, () => api.exportItems({ scope: 'all', columns: ['id', 'title'], format }), isOk)
  }
  await env.answer({ save: [`${out}${sep}matrix.xlsx`] })
  await T('exportMatrix', () => api.exportMatrix({ rowType: t, colType: t }), isOk)
  await env.answer({ save: [`${out}${sep}changes.csv`] })
  await T('exportCompare', () => api.exportCompare(h, 'WORKING', 'csv'), isOk)
  await T('showInFolder', () => api.showInFolder(root), resolves)

  // ---------- import
  const csv = `${out}${sep}import.csv`
  await env.write(csv, 'Title,Text\nImported one,From the calls test\nImported two,Second row\n')
  await env.answer({ open: [csv] })
  await T('chooseImportFile', () => api.chooseImportFile(), (v) => v && !!v.token)
  const f = await T('openImportFile', () => api.openImportFile(csv), (v) => v && !!v.token)
  const settings = { token: f?.token, sheet: f?.sheets?.[0]?.name ?? '', headerRow: 1, defaultType: t, mapping: ['title', 'text'] }
  await T('previewImport', () => api.previewImport(settings), (v) => v && typeof v === 'object')
  await T('runImport', () => api.runImport(settings, 'Calls test import'), isOk)
  await T('getImportSource', () => api.getImportSource(), resolves)
  await env.answer({ save: [`${out}${sep}import-updated.csv`] })
  await T('updateSourceFile', () => api.updateSourceFile('copy'), hasOk)

  // ---------- removing, reports, self-tests
  const dd = dup?.newId ? await api.getItem(dup.newId).catch(() => null) : null
  await T('deleteItem', () => api.deleteItem(dup?.newId, dd?.revision ?? '', { removeIncomingLinks: true }), isOk)
  await env.answer({ save: [`${out}${sep}problem-report.txt`] })
  await T('saveProblemReport', () => api.saveProblemReport('calls test'), isOk)
  const count = env.dataCount ?? 500
  const data = await T('runDataSelfTest', () => api.runDataSelfTest(count), (v) => v.items === count)
  await T('runReleaseSelfTest', () => api.runReleaseSelfTest(), (v) => v.ok === true)
  const empty = await env.tmp('calls-new')
  await env.answer({ open: [csv, empty] })
  await T('newProjectFromFile', () => api.newProjectFromFile(), hasOk)
  await T('closeRepository', () => api.closeRepository(), resolves)
  await T('forgetRecentRepository', () => api.forgetRecentRepository(root), resolves)

  return { results, totalMs: Math.round(performance.now() - started), out, data: data ?? null }
}
