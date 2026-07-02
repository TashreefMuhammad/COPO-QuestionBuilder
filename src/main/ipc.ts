import { ipcMain, dialog, safeStorage } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import Store from 'electron-store'
import { buildDocx } from './docx'

const store = new Store()

export function registerIpcHandlers(): void {

  // ── Courses persistence (auto-save to electron-store) ─────────────────────
  ipcMain.handle('courses:load', () => {
    return store.get('courses', null)
  })

  ipcMain.handle('courses:save', (_e, data: string) => {
    store.set('courses', JSON.parse(data))
    return { ok: true }
  })

  // ── Project file save / load (manual file export/import) ──────────────────
  ipcMain.handle('project:save', async (_e, data: string) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Courses to File',
      defaultPath: 'courses.copoq',
      filters: [{ name: 'CO-PO Project', extensions: ['copoq'] }]
    })
    if (!filePath) return { ok: false }
    writeFileSync(filePath, data, 'utf-8')
    return { ok: true, path: filePath }
  })

  ipcMain.handle('project:open', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import Courses from File',
      filters: [{ name: 'CO-PO Project', extensions: ['copoq'] }],
      properties: ['openFile']
    })
    if (!filePaths[0]) return { ok: false }
    const data = readFileSync(filePaths[0], 'utf-8')
    return { ok: true, data, path: filePaths[0] }
  })

  // ── DOCX export ────────────────────────────────────────────────────────────
  ipcMain.handle('export:docx', async (_e, payload: string) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Question Paper',
      defaultPath: 'question_paper.docx',
      filters: [{ name: 'Word Document', extensions: ['docx'] }]
    })
    if (!filePath) return { ok: false }
    try {
      await buildDocx(JSON.parse(payload), filePath)
      return { ok: true, path: filePath }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  })

  // ── Settings (non-secret) ──────────────────────────────────────────────────
  ipcMain.handle('settings:get', (_e, key: string) => store.get(key))
  ipcMain.handle('settings:set', (_e, key: string, value: unknown) => store.set(key, value))

  // ── API key — encrypted via Electron safeStorage ──────────────────────────
  ipcMain.handle('apikey:save', (_e, provider: string, key: string) => {
    if (!safeStorage.isEncryptionAvailable()) {
      store.set(`apikey_plain_${provider}`, key)
      return { ok: true }
    }
    const encrypted = safeStorage.encryptString(key)
    store.set(`apikey_enc_${provider}`, encrypted.toString('base64'))
    return { ok: true }
  })

  ipcMain.handle('apikey:load', (_e, provider: string) => {
    if (!safeStorage.isEncryptionAvailable()) {
      return store.get(`apikey_plain_${provider}`, '') as string
    }
    const b64 = store.get(`apikey_enc_${provider}`, '') as string
    if (!b64) return ''
    try { return safeStorage.decryptString(Buffer.from(b64, 'base64')) }
    catch { return '' }
  })

  ipcMain.handle('apikey:clear', (_e, provider: string) => {
    store.delete(`apikey_enc_${provider}`)
    store.delete(`apikey_plain_${provider}`)
  })
}
