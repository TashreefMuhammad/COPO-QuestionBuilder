import {
  Document, Packer, Table, TableRow, TableCell, Paragraph, TextRun,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType
} from 'docx'
import { writeFileSync } from 'fs'
import type { CourseSetup, QuestionRecord } from '../shared/models'

interface ExportPayload {
  setup: CourseSetup
  questions: QuestionRecord[]
  headers?: string[]
  columnWidths?: number[]
}

const DEFAULT_HEADERS = ['No.', 'Question', 'CO', 'Mapped PO', 'Domain', "Bloom's Level", 'Verb', 'Marks']
const DEFAULT_WIDTHS   = [5, 32, 7, 8, 10, 13, 10, 7]

function border() {
  return { style: BorderStyle.SINGLE, size: 4, color: '999999' }
}

function headerCell(text: string, widthPct: number): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.SOLID, color: 'E8F0FE' },
    borders: { top: border(), bottom: border(), left: border(), right: border() },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, size: 20 })]
    })]
  })
}

function dataCell(text: string, widthPct: number, center = false): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: { top: border(), bottom: border(), left: border(), right: border() },
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, size: 20 })]
    })]
  })
}

export async function buildDocx(payload: ExportPayload, outputPath: string): Promise<void> {
  const { setup, questions } = payload
  const headers = payload.headers ?? DEFAULT_HEADERS
  const rawWidths = payload.columnWidths ?? DEFAULT_WIDTHS
  const total = rawWidths.reduce((a, b) => a + b, 0)
  const widths = rawWidths.map(w => Math.round((w / total) * 87))

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => headerCell(h, widths[i]))
  })

  let totalMarks = 0
  const dataRows = questions.map((q, idx) => {
    totalMarks += q.marks ?? 0
    const mappedPo = setup.coPOMatrix[q.claimedCo] ?? ''
    const values = [
      String(idx + 1), q.text, q.claimedCo, mappedPo,
      q.domain, q.level, q.claimedVerb, String(q.marks ?? 0)
    ]
    return new TableRow({
      children: values.map((v, i) => dataCell(v, widths[i], i !== 1))
    })
  })

  const qTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows]
  })

  // CO-PO mapping summary — simple two-column table
  const summaryRows = setup.cos.map(co => {
    const po = setup.coPOMatrix[co.code] ?? ''
    return new TableRow({
      children: [
        dataCell(co.code, 15),
        dataCell(co.statement, 55),
        dataCell(po ? `→ ${po}` : '(unmapped)', 30, true)
      ]
    })
  })

  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          headerCell('CO', 15),
          headerCell('Course Outcome Statement', 55),
          headerCell('Mapped PO', 30)
        ]
      }),
      ...summaryRows
    ]
  })

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 }
        }
      },
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: setup.courseTitle || 'Question Paper', bold: true, size: 32 })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: setup.courseCode || '', italics: true, size: 24 })]
        }),
        new Paragraph({ children: [] }),
        qTable,
        new Paragraph({ children: [] }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `Total marks: ${totalMarks}`, bold: true, size: 22 })]
        }),
        new Paragraph({ children: [] }),
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'CO-PO Mapping', bold: true, size: 26 })]
        }),
        summaryTable
      ]
    }]
  })

  const buffer = await Packer.toBuffer(doc)
  writeFileSync(outputPath, buffer)
}
