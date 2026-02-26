'use client'

import { useState, useRef } from 'react'
import { Loader2, Wand2, RefreshCw, Download, Printer } from 'lucide-react'

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

export default function MobileBookPreview({
  title,
  childName,
  chapters,
  storyId,
  onGenerateImage,
  generatingImage,
  onDownloadPDF,
  downloadingPDF,
}: MobileBookPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Total pages: cover + dedication + chapters + end
  const totalPages = chapters.length + 3
  
  const scrollToPage = (index: number) => {
    const container = containerRef.current
    if (!container) return
    
    const pageHeight = container.clientHeight
    container.scrollTo({
      top: pageHeight * index,
      behavior: 'smooth'
    })
  }
  
  const handleScroll = () => {
    const container = containerRef.current
    if (!container) return
    
    const pageHeight = container.clientHeight
    const scrollTop = container.scrollTop
    const newPage = Math.round(scrollTop / pageHeight)
    
    if (newPage !== currentPage) {
      setCurrentPage(newPage)
    }
  }

  return (
    <div className="mobile-book-container">
      {/* Scrollable pages */}
      <div 
        ref={containerRef}
        className="mobile-book-scroll"
        onScroll={handleScroll}
      >
        {/* Cover */}
        <div className="mobile-page cover">
          <div className="page-content">
            <div className="cover-icon">✨</div>
            <h1 className="cover-title">{title}</h1>
            <div className="cover-divider" />
            <p className="cover-subtitle">Сказка для</p>
            <p className="cover-name">{childName}</p>
            <div className="cover-book">📚</div>
            <p className="cover-hint">Листайте вниз ↓</p>
          </div>
        </div>
        
        {/* Dedication */}
        <div className="mobile-page dedication">
          <div className="page-content">
            <div className="dedication-icon">💝</div>
            <p className="dedication-text">
              Эта волшебная книга<br />
              создана специально для
            </p>
            <p className="dedication-name">{childName}</p>
            <p className="dedication-from">с любовью от Книга Про Меня</p>
          </div>
        </div>
        
        {/* Chapters */}
        {chapters.map((chapter) => (
          <div key={chapter.number} className="mobile-page chapter">
            {/* Image area */}
            <div className="chapter-image-area">
              {chapter.image_url ? (
                <>
                  <img
                    src={chapter.image_url}
                    alt={`Глава ${chapter.number}`}
                    className="chapter-image"
                  />
                  <button
                    onClick={() => onGenerateImage(chapter.number)}
                    disabled={generatingImage !== null}
                    className="regenerate-btn"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onGenerateImage(chapter.number)}
                  disabled={generatingImage !== null}
                  className="generate-image-btn"
                >
                  {generatingImage === chapter.number ? (
                    <>
                      <Loader2 className="w-10 h-10 animate-spin" />
                      <span>Рисую картинку...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-10 h-10" />
                      <span>Нажмите для картинки</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            {/* Text area */}
            <div className="chapter-text-area">
              <div className="chapter-number">Глава {chapter.number}</div>
              <p className="chapter-text">{chapter.text}</p>
            </div>
          </div>
        ))}
        
        {/* End page */}
        <div className="mobile-page ending">
          <div className="page-content">
            <div className="ending-icon">🎉</div>
            <h2 className="ending-title">Конец!</h2>
            <p className="ending-text">
              Понравилась сказка?<br />
              Сохраните её навсегда!
            </p>
            
            <div className="ending-buttons">
              <button 
                onClick={onDownloadPDF}
                disabled={downloadingPDF}
                className="ending-btn primary"
              >
                {downloadingPDF ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                <span>Скачать PDF — 490₽</span>
              </button>
              
              <button className="ending-btn secondary">
                <Printer className="w-5 h-5" />
                <span>Печатная книга — 1490₽</span>
              </button>
            </div>
            
            <p className="ending-hint">
              💡 Сгенерируйте картинки для всех глав
            </p>
          </div>
        </div>
      </div>
      
      {/* Dots navigation */}
      <div className="mobile-dots">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToPage(i)}
            className={`mobile-dot ${currentPage === i ? 'active' : ''}`}
            aria-label={`Страница ${i + 1}`}
          />
        ))}
      </div>
      
      {/* Page counter */}
      <div className="mobile-counter">
        {currentPage + 1} / {totalPages}
      </div>
      
      <style jsx>{`
        .mobile-book-container {
          position: fixed;
          inset: 0;
          background: #1a1a2e;
          z-index: 50;
        }
        
        .mobile-book-scroll {
          height: 100%;
          overflow-y: auto;
          scroll-snap-type: y mandatory;
          -webkit-overflow-scrolling: touch;
        }
        
        .mobile-page {
          height: 100vh;
          height: 100dvh;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          display: flex;
          flex-direction: column;
        }
        
        /* Cover page */
        .mobile-page.cover {
          background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);
        }
        
        .mobile-page.cover .page-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: white;
          text-align: center;
        }
        
        .cover-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
        }
        
        .cover-title {
          font-size: 1.75rem;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 1rem;
        }
        
        .cover-divider {
          width: 4rem;
          height: 3px;
          background: rgba(255,255,255,0.5);
          border-radius: 2px;
          margin: 1rem 0;
        }
        
        .cover-subtitle {
          font-size: 1.125rem;
          opacity: 0.9;
        }
        
        .cover-name {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 0.25rem;
        }
        
        .cover-book {
          font-size: 3rem;
          margin-top: 2rem;
        }
        
        .cover-hint {
          position: absolute;
          bottom: 2rem;
          font-size: 0.875rem;
          opacity: 0.7;
          animation: bounce 2s infinite;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
        
        /* Dedication page */
        .mobile-page.dedication {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        }
        
        .mobile-page.dedication .page-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          text-align: center;
        }
        
        .dedication-icon {
          font-size: 3rem;
          margin-bottom: 1.5rem;
        }
        
        .dedication-text {
          font-size: 1.25rem;
          color: #78716c;
          line-height: 1.6;
          font-style: italic;
        }
        
        .dedication-name {
          font-size: 1.75rem;
          font-weight: 700;
          color: #7c3aed;
          margin-top: 0.5rem;
        }
        
        .dedication-from {
          margin-top: 2rem;
          font-size: 0.875rem;
          color: #a8a29e;
        }
        
        /* Chapter pages */
        .mobile-page.chapter {
          background: white;
        }
        
        .chapter-image-area {
          flex: 0 0 60%;
          position: relative;
          background: linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .chapter-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .generate-image-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 2rem;
          color: #a855f7;
          background: none;
          border: none;
          cursor: pointer;
        }
        
        .generate-image-btn span {
          font-size: 1rem;
          color: #6b7280;
        }
        
        .regenerate-btn {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          background: rgba(255,255,255,0.9);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          color: #6b7280;
        }
        
        .chapter-text-area {
          flex: 1;
          padding: 1.25rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        
        .chapter-number {
          font-size: 0.75rem;
          font-weight: 600;
          color: #a855f7;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }
        
        .chapter-text {
          font-size: 1rem;
          line-height: 1.7;
          color: #374151;
        }
        
        /* Ending page */
        .mobile-page.ending {
          background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%);
        }
        
        .mobile-page.ending .page-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          text-align: center;
        }
        
        .ending-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        
        .ending-title {
          font-size: 2rem;
          font-weight: 700;
          color: #7c3aed;
          margin-bottom: 0.5rem;
        }
        
        .ending-text {
          font-size: 1.125rem;
          color: #6b7280;
          line-height: 1.6;
          margin-bottom: 2rem;
        }
        
        .ending-buttons {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
          max-width: 280px;
        }
        
        .ending-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .ending-btn:active {
          transform: scale(0.98);
        }
        
        .ending-btn.primary {
          background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);
          color: white;
        }
        
        .ending-btn.secondary {
          background: white;
          color: #374151;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .ending-hint {
          margin-top: 2rem;
          font-size: 0.875rem;
          color: #9ca3af;
        }
        
        /* Dots navigation */
        .mobile-dots {
          position: fixed;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          z-index: 60;
        }
        
        .mobile-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.4);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .mobile-dot.active {
          background: white;
          transform: scale(1.3);
        }
        
        /* Page counter */
        .mobile-counter {
          position: fixed;
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.5);
          color: white;
          padding: 0.375rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          z-index: 60;
        }
      `}</style>
    </div>
  )
}
