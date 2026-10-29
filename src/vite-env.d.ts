/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUSINESS_NAME?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_CONTACT_PHONE?: string;
  readonly VITE_WHATSAPP_NUMBER?: string;
  readonly VITE_LOCATION?: string;
  readonly VITE_SERVICE_AREA?: string;
  readonly VITE_CURRENCY_CODE?: string;
  readonly VITE_LOCALE?: string;
  readonly VITE_SHOW_DEMO_LABELS?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
