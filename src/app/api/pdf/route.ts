import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import BookPDF from '@/components/BookPDF'
import { createElement } from 'react'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, childName, chapters } = body

    if (!title || !childName || !chapters) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create PDF document
    const doc = createElement(BookPDF, { title, childName, chapters })
    
    // Render to buffer
    const buffer = await renderToBuffer(doc)

    // Return PDF - convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка генерации PDF' },
      { status: 500 }
    )
  }
}
