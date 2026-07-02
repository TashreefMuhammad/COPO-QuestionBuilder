import { useState, useEffect } from 'react'
import type { CourseSetup, ProgramOutcome, CourseOutcome } from '../core/models'
import { BAETE_PRESET, ensureMatrixShape } from '../core/coPOEngine'

interface Props {
  setup: CourseSetup
  setSetup: (s: CourseSetup) => void
}

export default function SetupTab({ setup, setSetup }: Props) {
  const [local, setLocal] = useState<CourseSetup>(setup)

  useEffect(() => { setLocal(setup) }, [setup])

  const update = (patch: Partial<CourseSetup>) => setLocal(s => ({ ...s, ...patch }))

  const loadBaete = () => update({ pos: BAETE_PRESET.map(p => ({ ...p })) })

  const setPOCount = (n: number) => {
    const pos = [...local.pos]
    while (pos.length < n) pos.push({ code: `PO${pos.length + 1}`, statement: '' })
    update({ pos: pos.slice(0, n) })
  }

  const updatePO = (i: number, field: keyof ProgramOutcome, val: string) => {
    const pos = [...local.pos]
    pos[i] = { ...pos[i], [field]: val }
    update({ pos })
  }

  const addCO = () => {
    const cos = [...local.cos, { code: `CO${local.cos.length + 1}`, statement: '' }]
    const coPOMatrix = { ...local.coPOMatrix, [`CO${local.cos.length + 1}`]: '' }
    update({ cos, coPOMatrix })
  }

  const removeCO = () => {
    if (!local.cos.length) return
    const removed = local.cos[local.cos.length - 1]
    const cos = local.cos.slice(0, -1)
    const coPOMatrix = { ...local.coPOMatrix }
    delete coPOMatrix[removed.code]
    update({ cos, coPOMatrix })
  }

  const updateCO = (i: number, field: keyof CourseOutcome, val: string) => {
    const cos = [...local.cos]
    const old = cos[i]
    cos[i] = { ...cos[i], [field]: val }
    // If code changed, re-key the matrix entry
    if (field === 'code') {
      const matrix = { ...local.coPOMatrix }
      matrix[val] = matrix[old.code] ?? ''
      delete matrix[old.code]
      update({ cos, coPOMatrix: matrix })
    } else {
      update({ cos })
    }
  }

  const setMapping = (coCode: string, poCode: string) => {
    update({ coPOMatrix: { ...local.coPOMatrix, [coCode]: poCode } })
  }

  const apply = () => {
    const next = { ...local }
    ensureMatrixShape(next)
    setSetup(next)
    alert('Setup saved!')
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">

      {/* Course info */}
      <div className="card">
        <h2 className="text-base font-semibold mb-3">Course Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Course Title</label>
            <input className="input-full" value={local.courseTitle}
              onChange={e => update({ courseTitle: e.target.value })} />
          </div>
          <div>
            <label className="label">Course Code</label>
            <input className="input-full" value={local.courseCode}
              onChange={e => update({ courseCode: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Program Outcomes */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Program Outcomes</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Count:</label>
            <input type="number" min={1} max={30} value={local.pos.length}
              onChange={e => setPOCount(parseInt(e.target.value) || 1)}
              className="input w-16 text-center" />
            <button className="btn-secondary" onClick={loadBaete}>Load BAETE 12-PO preset</button>
          </div>
        </div>
        {/* Column headers */}
        <div className="flex gap-3 px-1 mb-1">
          <span className="w-20 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</span>
          <span className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outcome Statement</span>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {local.pos.map((po, i) => (
            <div key={i} className="flex gap-3">
              <input
                className="input w-20 shrink-0"
                value={po.code}
                onChange={e => updatePO(i, 'code', e.target.value)}
                placeholder="PO1"
              />
              <input
                className="input flex-1 min-w-0"
                value={po.statement}
                onChange={e => updatePO(i, 'statement', e.target.value)}
                placeholder="e.g. Apply mathematics and engineering fundamentals to solve complex problems"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Course Outcomes */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Course Outcomes</h2>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={addCO}>+ Add CO</button>
            <button className="btn-secondary" onClick={removeCO}>Remove last</button>
          </div>
        </div>
        {local.cos.length > 0 && (
          <div className="flex gap-3 px-1 mb-1">
            <span className="w-20 shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</span>
            <span className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outcome Statement</span>
          </div>
        )}
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {local.cos.map((co, i) => (
            <div key={i} className="flex gap-3">
              <input
                className="input w-20 shrink-0"
                value={co.code}
                onChange={e => updateCO(i, 'code', e.target.value)}
                placeholder="CO1"
              />
              <input
                className="input flex-1 min-w-0"
                value={co.statement}
                onChange={e => updateCO(i, 'statement', e.target.value)}
                placeholder="e.g. Analyze and design basic digital circuits using Boolean algebra"
              />
            </div>
          ))}
          {!local.cos.length && (
            <p className="text-sm text-gray-400">No COs yet. Click "+ Add CO".</p>
          )}
        </div>
      </div>

      {/* CO-PO Mapping — radio buttons, one PO per CO */}
      <div className="card">
        <h2 className="text-base font-semibold mb-1">CO-PO Mapping</h2>
        <p className="text-xs text-gray-500 mb-3">
          Each Course Outcome maps to exactly one Program Outcome.
          Click a cell to assign. One PO can be shared by multiple COs.
        </p>
        {local.cos.length && local.pos.length ? (
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-2 py-2 bg-gray-100 text-left min-w-[80px]">CO</th>
                  {local.pos.map(po => (
                    <th key={po.code}
                      className="border border-gray-300 px-2 py-2 bg-gray-100 text-center min-w-[52px]"
                      title={po.statement}>
                      {po.code}
                    </th>
                  ))}
                  <th className="border border-gray-300 px-2 py-2 bg-gray-100 text-center min-w-[60px]">Mapped to</th>
                </tr>
              </thead>
              <tbody>
                {local.cos.map(co => {
                  const selected = local.coPOMatrix[co.code] ?? ''
                  return (
                    <tr key={co.code} className="hover:bg-blue-50">
                      <td className="border border-gray-300 px-2 py-1.5 font-medium" title={co.statement}>
                        {co.code}
                      </td>
                      {local.pos.map(po => (
                        <td key={po.code}
                          className="border border-gray-300 p-1 text-center cursor-pointer"
                          onClick={() => setMapping(co.code, po.code)}>
                          <input
                            type="radio"
                            name={`copo-${co.code}`}
                            checked={selected === po.code}
                            onChange={() => setMapping(co.code, po.code)}
                            className="cursor-pointer w-4 h-4 accent-blue-600"
                          />
                        </td>
                      ))}
                      <td className="border border-gray-300 px-2 py-1.5 text-center">
                        {selected
                          ? <span className="text-blue-700 font-medium">{selected}</span>
                          : <span className="text-red-400 italic">none</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Add POs and COs above first.</p>
        )}
      </div>

      <button className="btn-primary w-full py-2.5" onClick={apply}>
        Save Setup
      </button>
    </div>
  )
}
