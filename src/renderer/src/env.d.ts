declare global {
  interface Window {
    api: {
      courses: {
        load: () => Promise<unknown>
        save: (data: string) => Promise<{ ok: boolean }>
      }
      project: {
        save: (data: string) => Promise<{ ok: boolean; path?: string }>
        open: () => Promise<{ ok: boolean; data?: string; path?: string }>
      }
      export: {
        docx: (payload: string) => Promise<{ ok: boolean; path?: string; error?: string }>
      }
      settings: {
        get: (key: string) => Promise<unknown>
        set: (key: string, value: unknown) => Promise<void>
      }
      apiKey: {
        save:  (provider: string, key: string) => Promise<{ ok: boolean }>
        load:  (provider: string) => Promise<string>
        clear: (provider: string) => Promise<void>
      }
    }
  }
}

export {}
