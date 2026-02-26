import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'

// Register Russian font
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf', fontStyle: 'italic' },
  ],
})

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    padding: 0,
  },
  
  // Cover page
  coverPage: {
    flex: 1,
    backgroundColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  coverEmoji: {
    fontSize: 72,
    marginBottom: 30,
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 1.3,
  },
  coverDivider: {
    width: 80,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginVertical: 20,
  },
  coverSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  coverName: {
    fontSize: 28,
    fontWeight: 700,
    color: 'white',
  },
  coverBook: {
    fontSize: 48,
    marginTop: 30,
  },
  
  // Dedication page
  dedicationPage: {
    flex: 1,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  dedicationEmoji: {
    fontSize: 48,
    marginBottom: 24,
  },
  dedicationText: {
    fontSize: 18,
    color: '#4b5563',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 1.6,
  },
  dedicationName: {
    fontSize: 24,
    fontWeight: 700,
    color: '#a855f7',
    marginTop: 12,
  },
  dedicationFooter: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 30,
  },
  
  // Chapter page
  chapterPage: {
    flex: 1,
    backgroundColor: 'white',
  },
  chapterImageContainer: {
    width: '100%',
    height: '60%',
    backgroundColor: '#f3e8ff',
  },
  chapterImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  chapterImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterImagePlaceholderText: {
    fontSize: 48,
    color: '#d8b4fe',
  },
  chapterTextContainer: {
    padding: 24,
    flex: 1,
  },
  chapterText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 1.7,
    textAlign: 'justify',
  },
  chapterNumber: {
    fontSize: 10,
    color: '#d1d5db',
    textAlign: 'right',
    marginTop: 12,
  },
  
  // End page
  endPage: {
    flex: 1,
    backgroundColor: '#fce7f3',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  endEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  endTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: '#a855f7',
    marginBottom: 20,
  },
  endText: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 30,
  },
  endDecoration: {
    fontSize: 36,
  },
})

interface Chapter {
  number: number
  text: string
  illustration_prompt: string
  image_url?: string
}

interface BookPDFProps {
  title: string
  childName: string
  chapters: Chapter[]
}

export default function BookPDF({ title, childName, chapters }: BookPDFProps) {
  return (
    <Document>
      {/* Cover Page */}
      <Page size="A5" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.coverEmoji}>✨</Text>
          <Text style={styles.coverTitle}>{title}</Text>
          <View style={styles.coverDivider} />
          <Text style={styles.coverSubtitle}>Сказка для</Text>
          <Text style={styles.coverName}>{childName}</Text>
          <Text style={styles.coverBook}>📚</Text>
        </View>
      </Page>
      
      {/* Dedication Page */}
      <Page size="A5" style={styles.page}>
        <View style={styles.dedicationPage}>
          <Text style={styles.dedicationEmoji}>💝</Text>
          <Text style={styles.dedicationText}>
            Эта волшебная книга{'\n'}
            создана специально для
          </Text>
          <Text style={styles.dedicationName}>{childName}</Text>
          <Text style={styles.dedicationFooter}>
            с любовью от Книга Про Меня
          </Text>
        </View>
      </Page>
      
      {/* Chapter Pages */}
      {chapters.map((chapter) => (
        <Page key={chapter.number} size="A5" style={styles.page}>
          <View style={styles.chapterPage}>
            {/* Image area */}
            <View style={styles.chapterImageContainer}>
              {chapter.image_url ? (
                <Image
                  src={chapter.image_url}
                  style={styles.chapterImage}
                />
              ) : (
                <View style={styles.chapterImagePlaceholder}>
                  <Text style={styles.chapterImagePlaceholderText}>🎨</Text>
                </View>
              )}
            </View>
            
            {/* Text area */}
            <View style={styles.chapterTextContainer}>
              <Text style={styles.chapterText}>{chapter.text}</Text>
              <Text style={styles.chapterNumber}>{chapter.number}</Text>
            </View>
          </View>
        </Page>
      ))}
      
      {/* End Page */}
      <Page size="A5" style={styles.page}>
        <View style={styles.endPage}>
          <Text style={styles.endEmoji}>🎉</Text>
          <Text style={styles.endTitle}>Конец!</Text>
          <Text style={styles.endText}>
            Понравилась книга?{'\n'}
            Закажи печатную версию!
          </Text>
          <Text style={styles.endDecoration}>📖 ✨ 💜</Text>
        </View>
      </Page>
    </Document>
  )
}
