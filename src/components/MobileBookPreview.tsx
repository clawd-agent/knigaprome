'use client'

import { useMemo, useState } from 'react'
import { Loader2, Wand2, RefreshCw, Download, ChevronLeft, ChevronRight } from 'lucide-react'

interface Chapter {
  number: number
  text: string
  illustration_prompt: string
  image_url?: string
}

interface MobileBookPreviewProps {
  title: string
  childName: string
  chapters: Chapter[]
  storyId: string
  onGenerateImage: (chapterNumber: number) => Promise<void>
  generatingImage: number | null
  onDownloadPDF?: () => void
  downloadingPDF?: boolean
}

type Page =
  | { type: 'cover' }
  | { type: 'chapter'; chapter: Chapter }
  | { type: 'final' }

export default function MobileBookPreview({
  title,
  childName,
  chapters,
  onGenerateImage,
  generatingImage,
  onDownloadPDF,
  downloadingPDF,
}: MobileBookPreviewProps) {
  const pages = useMemo<Page[]>(
    () => [{ type: 'cover' }, ...chapters.map((c) => ({ type: 'chapter' as const, chapter: c })), { type: 'final' }],
    [chapters]
  )
  const [currentPage, setCurrentPage] = useState(0)

  const totalPages = pages.length
  const nextPage = () => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
  const prevPage = () => setCurrentPage((p) => Math.max(0, p - 1))

  return (
    <div className="viewer-root">
      <div className="progress-wrap">
        {pages.map((_, i) => (
          <div key={i} className={`progress-bar ${i <= currentPage ? 'active' : ''}`} />
        ))}
      </div>

      <div className="page-container">
        {pages.map((page, index) => {
          const cls = index === currentPage ? 'active' : index < currentPage ? 'prev' : 'next'

          if (page.type === 'cover') {
            return (
              <div key={`cover-${index}`} className={`page ${cls} cover`} onClick={nextPage}>
                <div className="overlay" />
                <div className="content-center">
                  <h1 className="cover-title">{title}</h1>
                  <h2 className="cover-subtitle">A Story for {childName}</h2>
                </div>
                <div className="tap-start">
                  <div className="bounce">⌃</div>
                  <p>Tap to Start</p>
                </div>
              </div>
            )
          }

          if (page.type === 'final') {
            return (
              <div key={`final-${index}`} className={`page ${cls} final`}>
                <div className="overlay light" />
                <div className="final-card">
                  <h1>The End</h1>
                  <p>Надеюсь, приключение понравилось, {childName}!</p>
                  <button onClick={onDownloadPDF} disabled={downloadingPDF} className="download-btn">
                    {downloadingPDF ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            )
          }

          const chapter = page.chapter
          return (
            <div key={`chapter-${chapter.number}`} className={`page ${cls} chapter`}>
              {chapter.image_url ? (
                <img src={chapter.image_url} alt={`Глава ${chapter.number}`} className="chapter-image" />
              ) : (
                <div className="chapter-image placeholder">
                  <button onClick={() => onGenerateImage(chapter.number)} disabled={generatingImage !== null} className="generate-btn">
                    {generatingImage === chapter.number ? (
                      <>
                        <Loader2 className="w-9 h-9 animate-spin" />
                        <span>Рисую картинку...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-9 h-9" />
                        <span>Сгенерировать иллюстрацию</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="overlay" />
              <div className="chapter-text-wrap">
                <h1>{chapter.text}</h1>
              </div>

              {chapter.image_url && (
                <button onClick={() => onGenerateImage(chapter.number)} disabled={generatingImage !== null} className="regen-btn">
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      <button className="tap-zone left" onClick={prevPage} aria-label="Previous page" />
      <button className="tap-zone right" onClick={nextPage} aria-label="Next page" />

      <div className="hint left"><ChevronLeft className="w-8 h-8" /></div>
      <div className="hint right"><ChevronRight className="w-8 h-8" /></div>

      <div className="page-indicator">Page {currentPage + 1} of {totalPages}</div>

      <style jsx>{`
        .viewer-root { position: fixed; inset: 0; background: #221610; z-index: 50; overflow: hidden; }
        .progress-wrap { position: fixed; top: 0.8rem; left: 0.75rem; right: 0.75rem; display: flex; gap: 4px; z-index: 70; }
        .progress-bar { height: 3px; border-radius: 99px; background: rgba(255,255,255,.3); flex: 1; }
        .progress-bar.active { background: #ec5b13; }

        .page-container { position: relative; width: 100%; height: 100dvh; perspective: 1200px; }
        .page { position: absolute; inset: 0; transition: transform .45s ease, opacity .45s ease, visibility .45s ease; }
        .page.next { transform: translateX(100%); visibility: hidden; }
        .page.prev { transform: translateX(-100%); visibility: hidden; }
        .page.active { transform: translateX(0); visibility: visible; z-index: 20; }

        .cover, .chapter, .final { background: #111; }
        .cover { background: linear-gradient(180deg, rgba(0,0,0,.4), rgba(0,0,0,.7)), #3d2b1f; }
        .final { background: linear-gradient(180deg, rgba(255,255,255,.2), rgba(255,255,255,.2)), #d6c8bc; }

        .chapter-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .chapter-image.placeholder { display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f3e8ff, #ffe4ea); }
        .overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(34,22,16,.8), rgba(34,22,16,.2) 45%, rgba(34,22,16,.45)); }
        .overlay.light { background: transparent; }

        .content-center { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 0 1.2rem; color: #f8f6f6; }
        .cover-title { font-size: 2rem; line-height: 1.15; font-weight: 800; text-shadow: 0 4px 16px rgba(0,0,0,.35); }
        .cover-subtitle { margin-top: 1rem; color: #ec5b13; font-size: 1.4rem; font-weight: 700; text-shadow: 0 4px 10px rgba(0,0,0,.25); }

        .tap-start { position: absolute; z-index: 2; left: 0; right: 0; bottom: 4rem; text-align: center; color: #f1f5f9; font-weight: 700; letter-spacing: .16em; font-size: .7rem; text-transform: uppercase; }
        .bounce { font-size: 1.8rem; margin-bottom: .2rem; animation: bounce 1.2s infinite; }
        @keyframes bounce { 0%,100%{ transform:translateY(0)} 50%{ transform:translateY(6px)} }

        .chapter-text-wrap { position: absolute; z-index: 2; bottom: 5.2rem; left: 1.2rem; right: 1.2rem; }
        .chapter-text-wrap h1 { color: #fff; font-size: 1.45rem; line-height: 1.35; font-weight: 700; text-shadow: 0 3px 10px rgba(0,0,0,.45); }

        .generate-btn { display:flex; flex-direction:column; align-items:center; gap:.8rem; color:#7c3aed; border:0; background:transparent; }
        .generate-btn span { color:#475569; font-weight:600; }

        .regen-btn { position:absolute; z-index:3; bottom:5.1rem; right:1rem; width:38px; height:38px; border-radius:999px; background:rgba(255,255,255,.9); border:0; display:flex; align-items:center; justify-content:center; }

        .final-card { position: absolute; z-index: 2; left: 1.2rem; right: 1.2rem; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,.65); backdrop-filter: blur(10px); border-radius: 1.25rem; padding: 2rem 1.2rem; text-align: center; box-shadow: 0 18px 44px rgba(0,0,0,.18); }
        .final-card h1 { font-size: 2.2rem; font-weight: 800; color: #0f172a; }
        .final-card p { margin-top: .6rem; font-size: 1.1rem; color: #1e293b; }
        .download-btn { margin: 1.6rem auto 0; height: 52px; min-width: 200px; border-radius: 999px; border: 0; background: #ec5b13; color: white; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: .55rem; }

        .tap-zone { position: absolute; top: 0; bottom: 0; width: 25%; z-index: 40; background: transparent; border: 0; }
        .tap-zone.left { left: 0; }
        .tap-zone.right { right: 0; }
        .hint { position: absolute; top: 50%; transform: translateY(-50%); z-index: 30; color: rgba(255,255,255,.3); pointer-events: none; }
        .hint.left { left: 8px; }
        .hint.right { right: 8px; }

        .page-indicator { position: absolute; bottom: 1.25rem; left: 50%; transform: translateX(-50%); z-index: 55; color: rgba(255,255,255,.78); font-size: 10px; text-transform: uppercase; letter-spacing: .18em; font-weight: 700; background: rgba(0,0,0,.25); border-radius: 999px; padding: .35rem .75rem; backdrop-filter: blur(6px); }
      `}</style>
    </div>
  )
}
