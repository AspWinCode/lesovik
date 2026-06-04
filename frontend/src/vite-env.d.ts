/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" enables the in-memory MSW mock backend (npm run dev:mock). */
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
