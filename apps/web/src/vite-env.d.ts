/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `false` skryje nápovědu s demo účtem na přihlašovací stránce (produkce). */
  readonly VITE_SHOW_DEMO_HINT?: string;
}
