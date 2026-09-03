import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Schriften lokal gebündelt statt von Google Fonts geladen.
// Eine PWA, die in der Halle offline laufen soll, darf ihre Typografie nicht
// von einem fremden Server holen — und ein externer Aufruf beim Start ist
// zugleich ein vermeidbarer Datenabfluss. Eingebunden sind nur die
// tatsächlich benutzten Schnitte im Latin-Subset.
import '@fontsource/saira-condensed/latin-600.css'
import '@fontsource/saira-condensed/latin-700.css'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import './styles/theme.css'
import { i18nReady } from './i18n'
import { setupPwaUpdates } from './lib/pwaUpdate'
import { ThemeProvider } from './lib/theme'
import App from './App'

// Muss vor dem Rendern laufen: die Registrierung soll nicht auf React warten.
setupPwaUpdates()

// Die Startsprache muss stehen, bevor gerendert wird — sonst sähe ein
// englischer Start für einen Moment deutschen Text. Deutsch ist bereits da,
// die Zusage löst dann sofort auf.
void i18nReady.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  )
})
