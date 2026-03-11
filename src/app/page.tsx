'use client'

import { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { Sparkles, Book, Wand2, Download, Star, Clock, Shield, Loader2, ChevronLeft } from 'lucide-react'
import BookPreview from '@/components/BookPreview'
import MobileBookPreview from '@/components/MobileBookPreview'

interface Chapter {
  number: number
  text: string
  illustration_prompt: string
  image_url?: string
}

interface GeneratedStory {
  id: string
  title: string
  childName: string
  chapters: Chapter[]
}

export default function Home() {
  const [formData, setFormData] = useState({
    childName: '',
    childAge: '',
    childGender: 'girl',
    interests: '',
  })
  const [generatingImage, setGeneratingImage] = useState<number | null>(null)
  const [referencePhoto, setReferencePhoto] = useState<string>('')
  const [referencePhotoName, setReferencePhotoName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [error, setError] = useState('')
  const [story, setStory] = useState<GeneratedStory | null>(null)
  const [progress, setProgress] = useState('')
  const [isMobileReading, setIsMobileReading] = useState(false)
  
  // Detect mobile/tablet viewport for reading mode
  useEffect(() => {
    const checkMobile = () => {
      // До 1024px используем мобильный вертикальный ридер (телефоны + планшеты)
      setIsMobileReading(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
      reader.readAsDataURL(file)
    })
  }

  const handleReferencePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Можно загрузить только изображение')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Фото слишком большое. Максимум 8MB')
      return
    }

    try {
      const base64 = await fileToBase64(file)
      setReferencePhoto(base64)
      setReferencePhotoName(file.name)
      setError('')
    } catch {
      setError('Не удалось загрузить фото')
    }
  }

  // Генерация картинки для конкретной главы
  const generateImage = async (chapterNumber: number) => {
    if (!story) return
    
    setGeneratingImage(chapterNumber)
    
    try {
      const chapter = story.chapters.find(c => c.number === chapterNumber)
      if (!chapter) return
      
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: chapter.illustration_prompt,
          storyId: story.id,
          chapterNumber,
          referencePhotos: referencePhoto ? [referencePhoto] : [],
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка генерации')
      }
      
      // Обновляем URL картинки в истории
      setStory(prev => {
        if (!prev) return prev
        return {
          ...prev,
          chapters: prev.chapters.map(c => 
            c.number === chapterNumber 
              ? { ...c, image_url: data.image_url }
              : c
          ),
        }
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка генерации картинки')
    } finally {
      setGeneratingImage(null)
    }
  }

  // Скачивание PDF
  const downloadPDF = async () => {
    if (!story) return
    
    setDownloadingPDF(true)
    
    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: story.title,
          childName: story.childName,
          chapters: story.chapters,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Ошибка генерации PDF')
      }
      
      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${story.title}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка скачивания PDF')
    } finally {
      setDownloadingPDF(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    setProgress('📝 Пишем волшебную историю...')

    try {
      const form = new FormData()
      form.append('childName', formData.childName)
      form.append('childAge', formData.childAge)
      form.append('childGender', formData.childGender)
      form.append('interests', formData.interests)
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: form,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка генерации')
      }

      setStory(data.story)
      setProgress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Что-то пошло не так')
    } finally {
      setIsLoading(false)
    }
  }

  // Показываем книгу в формате превью
  if (story) {
    // Мобильная версия — полноэкранный вертикальный скролл
    if (isMobileReading) {
      return (
        <>
          {/* Кнопка "назад" поверх превью */}
          <button
            onClick={() => setStory(null)}
            className="fixed top-4 left-4 z-[70] bg-white/90 backdrop-blur rounded-full p-2 shadow-lg"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          
          <MobileBookPreview
            title={story.title}
            childName={story.childName}
            chapters={story.chapters}
            storyId={story.id}
            onGenerateImage={generateImage}
            generatingImage={generatingImage}
            onDownloadPDF={downloadPDF}
            downloadingPDF={downloadingPDF}
            onCreateAnotherStory={() => setStory(null)}
          />
        </>
      )
    }
    
    // Десктопная версия — spread view
    return (
      <main className="min-h-screen py-8 px-4 bg-gradient-to-b from-purple-50 to-white">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => setStory(null)}
            className="flex items-center gap-2 text-gray-600 hover:text-primary mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Создать другую книгу
          </button>

          <h1 className="font-display text-3xl md:text-4xl font-bold text-center mb-2 text-gradient">
            {story.title}
          </h1>
          <p className="text-center text-gray-500 mb-8">
            Персональная сказка для {story.childName}
          </p>

          {/* Книжный превью */}
          <BookPreview
            title={story.title}
            childName={story.childName}
            chapters={story.chapters}
            storyId={story.id}
            onGenerateImage={generateImage}
            generatingImage={generatingImage}
          />

          {/* CTA секция */}
          <div className="mt-12 bg-white rounded-3xl shadow-xl p-8 text-center">
            <h2 className="font-display text-2xl font-bold mb-4">
              Понравилась история?
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Давайте сделаем ещё одну — с новым сюжетом и новым героем.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setStory(null)}
                className="bg-primary hover:bg-purple-700 text-white font-bold px-8 py-4 rounded-xl flex items-center gap-2 transition-all transform hover:scale-105"
              >
                <Sparkles className="w-5 h-5" />
                Сделать ещё одну историю
              </button>
              <button className="bg-pink-500 hover:bg-pink-600 text-white font-bold px-8 py-4 rounded-xl flex items-center gap-2 transition-all transform hover:scale-105">
                <Book className="w-5 h-5" />
                Печатная книга — 1490₽
              </button>
            </div>
            
            <p className="mt-4 text-sm text-gray-400">
              💡 Можете менять имя, возраст и интересы — история будет другой
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute top-20 left-10 text-6xl animate-float">✨</div>
        <div className="absolute top-40 right-20 text-5xl animate-float" style={{animationDelay: '1s'}}>🌟</div>
        <div className="absolute bottom-20 left-1/4 text-4xl animate-float" style={{animationDelay: '0.5s'}}>📚</div>
        
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6">
            <span className="text-gradient">Создай свою книгу</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Создайте волшебную сказку, где ваш ребёнок — главный герой. 
            AI нарисует его на каждой странице!
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
              <Clock className="w-5 h-5 text-primary" />
              <span>Готово за 5 минут</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
              <Wand2 className="w-5 h-5 text-primary" />
              <span>Уникальные иллюстрации</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
              <Download className="w-5 h-5 text-primary" />
              <span>PDF сразу после оплаты</span>
            </div>
          </div>

          <a 
            href="#create" 
            className="inline-flex items-center gap-2 bg-primary hover:bg-purple-700 text-white font-bold text-xl px-8 py-4 rounded-full transition-all transform hover:scale-105 shadow-lg"
          >
            <Sparkles className="w-6 h-6" />
            Создать книгу — 490₽
          </a>
          
          <p className="mt-4 text-gray-500 text-sm">
            Печатная версия — от 1490₽ с доставкой
          </p>
        </div>
      </section>

      {/* Как это работает */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">
            Как создать книгу?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✏️</span>
              </div>
              <h3 className="font-display text-xl font-bold mb-2">1. Расскажите о ребёнке</h3>
              <p className="text-gray-600">Имя, возраст, интересы — для уникальной истории</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎨</span>
              </div>
              <h3 className="font-display text-xl font-bold mb-2">2. AI создаёт книгу</h3>
              <p className="text-gray-600">Волшебная история + уникальные иллюстрации</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎁</span>
              </div>
              <h3 className="font-display text-xl font-bold mb-2">3. Получите книгу</h3>
              <p className="text-gray-600">PDF готов через 5 минут, печать — за 3-5 дней</p>
            </div>
          </div>
        </div>
      </section>

      {/* Форма создания */}
      <section id="create" className="py-16 px-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h2 className="font-display text-2xl font-bold text-center mb-8">
              Создайте книгу прямо сейчас
            </h2>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Имя ребёнка *</label>
                <input
                  type="text"
                  required
                  placeholder="Как зовут вашего героя?"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition"
                  value={formData.childName}
                  onChange={(e) => setFormData({...formData, childName: e.target.value})}
                  disabled={isLoading}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Возраст *</label>
                  <select 
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition"
                    value={formData.childAge}
                    onChange={(e) => setFormData({...formData, childAge: e.target.value})}
                    disabled={isLoading}
                  >
                    <option value="">Выберите</option>
                    {[1,2,3,4,5,6,7,8,9,10].map(age => (
                      <option key={age} value={age}>{age} {age === 1 ? 'год' : age < 5 ? 'года' : 'лет'}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Пол</label>
                  <select 
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition"
                    value={formData.childGender}
                    onChange={(e) => setFormData({...formData, childGender: e.target.value})}
                    disabled={isLoading}
                  >
                    <option value="girl">Девочка</option>
                    <option value="boy">Мальчик</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Интересы ребёнка</label>
                <textarea
                  placeholder="Любит динозавров, космос, принцесс..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition resize-none"
                  rows={3}
                  value={formData.interests}
                  onChange={(e) => setFormData({...formData, interests: e.target.value})}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Фото ребёнка (для похожего персонажа)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReferencePhotoChange}
                  disabled={isLoading}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-purple-100 file:text-purple-700 file:font-medium"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Опционально. Используем как референс для генерации иллюстраций (jpg/png, до 8MB).
                </p>
                {referencePhoto && (
                  <div className="mt-3 flex items-center gap-3">
                    <img src={referencePhoto} alt="Фото-референс" className="w-14 h-14 object-cover rounded-lg border" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{referencePhotoName}</p>
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:text-red-600"
                        onClick={() => {
                          setReferencePhoto('')
                          setReferencePhotoName('')
                        }}
                      >
                        Удалить фото
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold text-lg py-4 rounded-xl transition-all transform hover:scale-[1.02] disabled:scale-100 shadow-lg flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {progress}
                  </>
                ) : (
                  <>
                    <Book className="w-5 h-5" />
                    Создать книгу бесплатно
                  </>
                )}
              </button>
              
              <p className="text-center text-xs text-gray-400">
                Демо-версия — создайте книгу бесплатно и посмотрите результат
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Отзывы */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center mb-12">
            Что говорят родители
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { name: 'Анна М.', text: 'Дочка была в восторге! Узнала себя на картинках и теперь это её любимая книга.', rating: 5 },
              { name: 'Дмитрий К.', text: 'Подарил сыну на день рождения. Качество иллюстраций поразило — как настоящая книга!', rating: 5 },
              { name: 'Елена С.', text: 'Сделала за 10 минут, ребёнок счастлив. Обязательно закажу ещё на Новый год.', rating: 5 },
              { name: 'Михаил Р.', text: 'Сначала сомневался, но результат превзошёл ожидания. Сын перечитывает каждый вечер.', rating: 5 },
            ].map((review, i) => (
              <div key={i} className="bg-purple-50 rounded-2xl p-6">
                <div className="flex gap-1 mb-3">
                  {[...Array(review.rating)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-3">"{review.text}"</p>
                <p className="font-medium text-gray-900">{review.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Гарантии */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-primary to-pink-500 rounded-3xl p-8 text-white text-center">
            <Shield className="w-12 h-12 mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold mb-4">100% гарантия</h2>
            <p className="text-lg opacity-90 max-w-xl mx-auto">
              Если книга вам не понравится — вернём деньги без вопросов. 
              Но за 2+ года работы такого ещё не случалось 😊
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-4xl mx-auto text-center text-gray-500 text-sm">
          <p>© 2026 Книга Про Меня. Все права защищены.</p>
          <div className="mt-2 space-x-4">
            <a href="/oferta" className="hover:text-primary">Оферта</a>
            <a href="/privacy" className="hover:text-primary">Конфиденциальность</a>
            <a href="/contacts" className="hover:text-primary">Контакты</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
