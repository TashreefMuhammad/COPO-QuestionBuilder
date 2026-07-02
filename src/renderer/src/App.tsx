import { useState, useCallback, useEffect, useRef } from 'react'
import { newCourseProject, type CourseProject, type CourseSetup, type QuestionRecord } from './core/models'
import SetupTab from './components/SetupTab'
import QuestionEditorTab from './components/QuestionEditorTab'
import QuestionBankTab from './components/QuestionBankTab'
import SettingsDialog from './components/SettingsDialog'

type Tab = 'setup' | 'editor' | 'bank'

async function persist(courses: CourseProject[]) {
  try { await window.api.courses.save(JSON.stringify(courses)) } catch {}
}

// ── Initial state — one function call so both ids match ───────────────────────
function makeInitialState() {
  const courses = [newCourseProject('My First Course')]
  return { courses, activeId: courses[0].id }
}

export default function App() {
  const initial = useRef(makeInitialState())
  const [courses,  setCourses]  = useState<CourseProject[]>(initial.current.courses)
  const [activeId, setActiveId] = useState<string>(initial.current.activeId)
  const [tab,      setTab]      = useState<Tab>('setup')
  const [showSettings, setShowSettings] = useState(false)

  // Inline rename state
  const [editingName, setEditingName] = useState(false)
  const [nameInput,   setNameInput]   = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  // Load persisted courses once — never blocks render
  useEffect(() => {
    (async () => {
      try {
        const saved = await window.api.courses.load()
        if (Array.isArray(saved) && saved.length > 0) {
          setCourses(saved)
          setActiveId(saved[0].id)
        }
      } catch {}
    })()
  }, [])

  // Focus name input when rename starts
  useEffect(() => {
    if (editingName) nameRef.current?.select()
  }, [editingName])

  const active = courses.find(c => c.id === activeId) ?? courses[0]

  // ── Core updater — activeId is always current via functional state update ───
  const updateActive = useCallback((patch: Partial<CourseProject>) => {
    setCourses(prev => {
      // capture the latest activeId from closure — since activeId is stable at
      // call time via the dep array, this is always correct
      const next = prev.map(c => c.id === activeId ? { ...c, ...patch } : c)
      persist(next)
      return next
    })
  }, [activeId])

  const setSetup     = useCallback((setup:     CourseSetup)     => updateActive({ setup }),     [updateActive])
  const setQuestions = useCallback((questions: QuestionRecord[]) => updateActive({ questions }), [updateActive])

  // ── Course management ─────────────────────────────────────────────────────
  const startRename = () => {
    setNameInput(active?.name ?? '')
    setEditingName(true)
  }

  const commitRename = () => {
    const trimmed = nameInput.trim()
    if (trimmed) updateActive({ name: trimmed })
    setEditingName(false)
  }

  const addCourse = () => {
    const proj = newCourseProject('New Course')
    setCourses(prev => { const n = [...prev, proj]; persist(n); return n })
    setActiveId(proj.id)
    setTab('setup')
  }

  const deleteCourse = () => {
    if (courses.length <= 1) { alert('You need at least one course.'); return }
    if (!confirm(`Delete "${active?.name}"? This cannot be undone.`)) return
    setCourses(prev => {
      const n = prev.filter(c => c.id !== activeId)
      persist(n)
      // Switch to the first remaining course
      const next = n.find(c => c.id !== activeId) ?? n[0]
      setActiveId(next.id)
      return n
    })
  }

  const exportFile = useCallback(async () => {
    try {
      const r = await window.api.project.save(JSON.stringify(courses))
      if (r.ok) alert(`Saved to ${r.path}`)
    } catch (e: any) { alert(`Export failed: ${e.message}`) }
  }, [courses])

  const importFile = useCallback(async () => {
    try {
      const r = await window.api.project.open()
      if (!r.ok || !r.data) return
      const parsed = JSON.parse(r.data)
      const list: CourseProject[] = Array.isArray(parsed) ? parsed : [parsed]
      setCourses(list); setActiveId(list[0].id); persist(list)
    } catch (e: any) { alert(`Import failed: ${e.message}`) }
  }, [])

  const exportDocx = useCallback(async () => {
    if (!active) return
    try {
      const r = await window.api.export.docx(
        JSON.stringify({ setup: active.setup, questions: active.questions })
      )
      if (r.ok) alert(`Exported to:\n${r.path}`)
      else if (r.error) alert(`Export failed: ${r.error}`)
    } catch (e: any) { alert(`Export failed: ${e.message}`) }
  }, [active])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'setup',  label: 'Setup' },
    { id: 'editor', label: 'Question Builder' },
    { id: 'bank',   label: `Question Bank (${active?.questions.length ?? 0})` }
  ]

  return (
    <div className="flex flex-col h-screen">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3">

        {/* Course selector + rename */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-gray-500 shrink-0 font-medium">Course:</span>

          {editingName ? (
            <input
              ref={nameRef}
              className="input flex-1 min-w-0 text-sm font-medium"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setEditingName(false)
              }}
            />
          ) : (
            <select
              className="input flex-1 min-w-0 text-sm font-medium"
              value={activeId}
              onChange={e => { setActiveId(e.target.value); setTab('setup') }}
            >
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          <button
            className="btn-secondary text-xs px-2 py-1 shrink-0"
            onClick={editingName ? commitRename : startRename}
            title={editingName ? 'Save name' : 'Rename course'}
          >
            {editingName ? '✓ Save' : '✏️ Rename'}
          </button>
          <button className="btn-secondary text-xs px-2 py-1 shrink-0" onClick={addCourse}>+ New</button>
          <button className="btn-danger   text-xs px-2 py-1 shrink-0" onClick={deleteCourse}>Delete</button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          <button className="btn-secondary text-xs" onClick={importFile}>Import</button>
          <button className="btn-secondary text-xs" onClick={exportFile}>Export file</button>
          <button className="btn-secondary text-xs" onClick={exportDocx}>Export DOCX</button>
          <button className="btn-secondary text-xs" onClick={() => setShowSettings(true)}>⚙ Settings</button>
        </div>
      </header>

      {/* ── Tabs ── */}
      <nav className="bg-white border-b border-gray-200 px-4 flex gap-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-3 text-sm ${tab === t.id ? 'tab-active' : 'tab-inactive'}`}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Content — keyed so child state resets on course switch ── */}
      <main className="flex-1 overflow-auto" key={activeId}>
        {tab === 'setup'  && active && <SetupTab          setup={active.setup}     setSetup={setSetup} />}
        {tab === 'editor' && active && <QuestionEditorTab setup={active.setup}     questions={active.questions} setQuestions={setQuestions} />}
        {tab === 'bank'   && active && <QuestionBankTab   questions={active.questions} setQuestions={setQuestions} />}
      </main>

      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </div>
  )
}
