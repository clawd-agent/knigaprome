import type { Metadata } from 'next'
import { Comfortaa, Nunito } from 'next/font/google'
import './globals.css'

const comfortaa = Comfortaa({ 
  subsets: ['cyrillic', 'latin'],
  variable: '--font-display',
})

const nunito = Nunito({ 
  subsets: ['cyrillic', 'latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'Книга Про Меня — Персональная сказка с вашим ребёнком',
  description: 'Создайте уникальную книгу, где ваш ребёнок — главный герой. AI генерирует историю и иллюстрации за 5 минут.',
  keywords: 'персональная книга, детская сказка, именная книга, подарок ребёнку, AI книга',
  openGraph: {
    title: 'Книга Про Меня — Персональная сказка',
    description: 'Ваш ребёнок — главный герой волшебной истории',
    locale: 'ru_RU',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={`${comfortaa.variable} ${nunito.variable}`}>
      <body className="font-body bg-gradient-to-b from-purple-50 to-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
