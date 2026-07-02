import type { QuestionRecord } from '../core/models'

interface Props {
  questions: QuestionRecord[]
  setQuestions: (qs: QuestionRecord[]) => void
}

export default function QuestionBankTab({ questions, setQuestions }: Props) {
  const totalMarks = questions.reduce((s, q) => s + (q.marks ?? 0), 0)

  const remove = (id: string) => setQuestions(questions.filter(q => q.id !== id))

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">
          {questions.length} question{questions.length !== 1 ? 's' : ''}
        </h2>
        <span className="text-sm font-medium text-gray-700">Total marks: <strong>{totalMarks}</strong></span>
      </div>

      {questions.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-lg mb-2">No questions yet.</p>
          <p className="text-sm">Go to Question Builder, write a question, and click Save to Bank.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                {['#','Question','CO','Mapped PO','Domain','Level','Verb','Marks','Status',''].map(h => (
                  <th key={h} className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {questions.map((q, idx) => {
                const issueCount = q.verification?.issues.length ?? null
                return (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-3 py-2 text-gray-500">{idx + 1}</td>
                    <td className="border border-gray-200 px-3 py-2 max-w-xs">
                      <span className="line-clamp-2">{q.text || <em className="text-gray-400">No text</em>}</span>
                    </td>
                    <td className="border border-gray-200 px-3 py-2">{q.claimedCo}</td>
                    <td className="border border-gray-200 px-3 py-2 text-blue-700 font-medium">
                      {q.verification?.mappedPo || '—'}
                    </td>
                    <td className="border border-gray-200 px-3 py-2">{q.domain}</td>
                    <td className="border border-gray-200 px-3 py-2">{q.level}</td>
                    <td className="border border-gray-200 px-3 py-2">
                      <code className="text-xs bg-gray-100 px-1 rounded">{q.claimedVerb}</code>
                    </td>
                    <td className="border border-gray-200 px-3 py-2 text-center font-medium">{q.marks}</td>
                    <td className="border border-gray-200 px-3 py-2">
                      {issueCount === null
                        ? <span className="warn-badge">Not verified</span>
                        : issueCount === 0
                          ? <span className="ok-badge">OK</span>
                          : <span className="issue-badge">{issueCount} issue{issueCount > 1 ? 's' : ''}</span>
                      }
                    </td>
                    <td className="border border-gray-200 px-3 py-2">
                      <button onClick={() => remove(q.id)} className="text-red-600 hover:text-red-800 text-xs">
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
