import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  courses: {
    load: ()            => ipcRenderer.invoke('courses:load'),
    save: (data: string) => ipcRenderer.invoke('courses:save', data)
  },
  project: {
    save: (data: string) => ipcRenderer.invoke('project:save', data),
    open: ()            => ipcRenderer.invoke('project:open')
  },
  export: {
    docx: (payload: string) => ipcRenderer.invoke('export:docx', payload)
  },
  settings: {
    get: (key: string)              => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value)
  },
  apiKey: {
    save:  (provider: string, key: string) => ipcRenderer.invoke('apikey:save', provider, key),
    load:  (provider: string)              => ipcRenderer.invoke('apikey:load', provider),
    clear: (provider: string)              => ipcRenderer.invoke('apikey:clear', provider)
  }
})
