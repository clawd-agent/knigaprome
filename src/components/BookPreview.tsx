'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Wand2, Download, Printer } from 'lucide-react'

interface Chapter {
  number: number
  text: string
  illustration_prompt: string
  image_url?: string
}

interface BookPreviewProps {
  title: string
  childName: string
  chapters: Chapter[]
  storyId: string
  onGenerateImage: (chapterNumber: number) => Promise<void>
  generatingImage: number | null
}

export default function BookPreview({
  title,
  childName,
  chapters,
  storyId,
  onGenerateImage,
  generatingImage,
}: BookPreviewProps) {
  // Page 0 = cover, then pairs of chapters as spreads
  // Total pages: cover + chapters (each chapter is one page)
  const [currentSpread, setCurrentSpread] = useState(0)
  
  // Calculate total spreads: cover (1) + dedic (1) + chapters (12) + end (1) = 15 pages
  // Spreads: 0=cover alone, 1=dedic+ch1, 2=ch2+ch3, ... 6=ch10+ch11, 7=ch12+end
  const totalSpreads = Math.ceil((chapters.length + 3) / 2)
  
  const nextSpread = () => {
    if (currentSpread < totalSpreads - 1) {
      setCurrentSpread(currentSpread + 1)
    }
  }
  
  const prevSpread = () => {
    if (currentSpread > 0) {
      setCurrentSpread(currentSpread - 1)
    }
  }

  // Render a single page
  const renderPage = (pageNum: number, side: 'left' | 'right') => {
    // Page 0 = cover
    // Page 1 = dedication
    // Page 2-13 = chapters 1-12
    // Page 14 = end
    
    if (pageNum === 0) {
      // Cover page
      return (
        <div className={`book-page ${side} bg-gradient-to-br from-purple-600 to-pink-500 flex flex-col items-center justify-center text-white p-8`}>
          <div className="text-6xl mb-6">✨</div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-center mb-4 leading-tight">
            {title}
          </h1>
          <div className="w-16 h-1 bg-white/50 rounded my-4" />
          <p className="text-lg opacity-90">Сказка для</p>
          <p className="text-2xl font-bold">{childName}</p>
          <div className="mt-8 text-4xl">📚</div>
        </div>
      )
    }
    
    if (pageNum === 1) {
      // Dedication page
      return (
        <div className={`book-page ${side} bg-amber-50 flex flex-col items-center justify-center p-8`}>
          <div className="text-4xl mb-6">💝</div>
          <p className="text-center text-gray-600 italic text-lg leading-relaxed">
            Эта волшебная книга<br />
            создана специально для<br />
            <span className="font-bold text-purple-600 text-xl">{childName}</span>
          </p>
          <div className="mt-8 text-sm text-gray-400">
            с любовью от Книга Про Меня
          </div>
        </div>
      )
    }
    
    if (pageNum >= 2 && pageNum <= chapters.length + 1) {
      // Chapter page
      const chapterIndex = pageNum - 2
      const chapter = chapters[chapterIndex]
      
      if (!chapter) return <div className={`book-page ${side} bg-white`} />
      
      return (
        <div className={`book-page ${side} bg-white flex flex-col`}>
          {/* Image area - top 60% */}
          <div className="flex-1 min-h-0 relative bg-purple-50">
            {chapter.image_url ? (
              <img
                src={chapter.image_url}
                alt={`Иллюстрация ${chapter.number}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <button
                onClick={() => onGenerateImage(chapter.number)}
                disabled={generatingImage !== null}
                className="w-full h-full flex flex-col items-center justify-center gap-3 hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                {generatingImage === chapter.number ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    <span className="text-sm text-gray-500">Рисую...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-8 h-8 text-purple-400" />
                    <span className="text-sm text-gray-500">Нажмите для картинки</span>
                  </>
                )}
              </button>
            )}
            
            {/* Regenerate button overlay */}
            {chapter.image_url && (
              <button
                onClick={() => onGenerateImage(chapter.number)}
                disabled={generatingImage !== null}
                className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-xs px-2 py-1 rounded shadow disabled:opacity-50"
              >
                🔄
              </button>
            )}
          </div>
          
          {/* Text area - bottom 40% */}
          <div className="p-4 md:p-6 bg-white">
            <p className="text-sm md:text-base leading-relaxed text-gray-700">
              {chapter.text}
            </p>
            <div className="text-right text-xs text-gray-300 mt-2">
              {chapter.number}
            </div>
          </div>
        </div>
      )
    }
    
    // End page
    return (
      <div className={`book-page ${side} bg-gradient-to-br from-pink-100 to-purple-100 flex flex-col items-center justify-center p-8`}>
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="font-display text-2xl font-bold text-purple-600 mb-4">
          Конец!
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Понравилась книга?<br />
          Закажи печатную версию!
        </p>
        <div className="text-4xl">📖 ✨ 💜</div>
      </div>
    )
  }
  
  // Calculate which pages to show for current spread
  const getSpreadPages = () => {
    if (currentSpread === 0) {
      // First spread: just cover on right
      return { left: null, right: 0 }
    }
    
    // Each subsequent spread shows 2 pages
    const leftPage = currentSpread * 2 - 1
    const rightPage = currentSpread * 2
    
    return { left: leftPage, right: rightPage }
  }
  
  const { left, right } = getSpreadPages()

  return (
    <div className="book-preview-container">
      {/* Book wrapper */}
      <div className="book-wrapper">
        {/* Navigation arrows */}
        <button
          onClick={prevSpread}
          disabled={currentSpread === 0}
          className="book-nav book-nav-left disabled:opacity-30"
          aria-label="Предыдущая страница"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        
        <button
          onClick={nextSpread}
          disabled={currentSpread === totalSpreads - 1}
          className="book-nav book-nav-right disabled:opacity-30"
          aria-label="Следующая страница"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
        
        {/* Book spread */}
        <div className="book-spread">
          {/* Left page */}
          <div className="book-page-container left">
            {left !== null ? renderPage(left, 'left') : (
              <div className="book-page left book-page-empty" />
            )}
          </div>
          
          {/* Spine shadow */}
          <div className="book-spine" />
          
          {/* Right page */}
          <div className="book-page-container right">
            {renderPage(right, 'right')}
          </div>
        </div>
        
        {/* Page indicator */}
        <div className="book-page-indicator">
          Разворот {currentSpread + 1} из {totalSpreads}
        </div>
      </div>
      
      {/* Thumbnail navigation */}
      <div className="book-thumbnails">
        {Array.from({ length: totalSpreads }).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSpread(i)}
            className={`book-thumbnail ${currentSpread === i ? 'active' : ''}`}
          >
            {i === 0 ? '📕' : i === totalSpreads - 1 ? '🎉' : i}
          </button>
        ))}
      </div>
      
      {/* Action buttons */}
      <div className="book-actions">
        <button className="book-action-btn primary">
          <Download className="w-5 h-5" />
          Скачать PDF — 490₽
        </button>
        <button className="book-action-btn secondary">
          <Printer className="w-5 h-5" />
          Печатная книга — 1490₽
        </button>
      </div>
      
      <style jsx>{`
        .book-preview-container {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          padding: 1rem;
        }
        
        .book-wrapper {
          position: relative;
          margin-bottom: 1.5rem;
        }
        
        .book-spread {
          display: flex;
          aspect-ratio: 2 / 1.4;
          background: #2d1f1a;
          border-radius: 8px;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          position: relative;
        }
        
        .book-page-container {
          flex: 1;
          position: relative;
          background: white;
        }
        
        .book-page-container.left {
          border-radius: 4px 0 0 4px;
          margin: 4px 0 4px 4px;
        }
        
        .book-page-container.right {
          border-radius: 0 4px 4px 0;
          margin: 4px 4px 4px 0;
        }
        
        .book-spine {
          width: 12px;
          background: linear-gradient(
            to right,
            rgba(0, 0, 0, 0.2),
            rgba(0, 0, 0, 0.05) 30%,
            transparent 50%,
            rgba(0, 0, 0, 0.05) 70%,
            rgba(0, 0, 0, 0.2)
          );
          z-index: 10;
        }
        
        .book-page {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        .book-page-empty {
          background: linear-gradient(135deg, #f5f5f5, #e8e8e8);
        }
        
        .book-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 20;
          background: white;
          border: none;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.2s;
        }
        
        .book-nav:hover:not(:disabled) {
          transform: translateY(-50%) scale(1.1);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        
        .book-nav-left {
          left: -24px;
        }
        
        .book-nav-right {
          right: -24px;
        }
        
        .book-page-indicator {
          text-align: center;
          margin-top: 1rem;
          color: #666;
          font-size: 0.875rem;
        }
        
        .book-thumbnails {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }
        
        .book-thumbnail {
          width: 36px;
          height: 36px;
          border: 2px solid #e5e5e5;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 0.75rem;
          transition: all 0.2s;
        }
        
        .book-thumbnail:hover {
          border-color: #a855f7;
        }
        
        .book-thumbnail.active {
          border-color: #a855f7;
          background: #f3e8ff;
        }
        
        .book-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .book-action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        
        .book-action-btn.primary {
          background: linear-gradient(135deg, #a855f7, #ec4899);
          color: white;
        }
        
        .book-action-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(168, 85, 247, 0.4);
        }
        
        .book-action-btn.secondary {
          background: white;
          color: #374151;
          border: 2px solid #e5e5e5;
        }
        
        .book-action-btn.secondary:hover {
          border-color: #a855f7;
          color: #a855f7;
        }
        
        @media (max-width: 640px) {
          .book-nav {
            width: 40px;
            height: 40px;
          }
          
          .book-nav-left {
            left: 8px;
          }
          
          .book-nav-right {
            right: 8px;
          }
          
          .book-action-btn {
            padding: 0.875rem 1.5rem;
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  )
}
