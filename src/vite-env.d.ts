/// <reference types="vite/client" />

interface ImportMetaEnv {
  // No client-side env vars — webhook is server-side only (see /api/track).
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
