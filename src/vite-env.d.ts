/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_DEMO_MODE?: string
  readonly VITE_BILLING?: string
  readonly VITE_FOUNDER_OFFER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Wird von Vite über `define` gesetzt; siehe vite.config.ts. */
declare const __APP_VERSION__: string
