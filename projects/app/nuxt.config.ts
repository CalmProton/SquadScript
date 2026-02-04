import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    'nuxt-i18n-micro',
    'shadcn-nuxt',
    'nuxt-auth-utils',
  ],

  // Disable SSR - this is a dashboard app with CSR only
  ssr: false,

  devtools: { enabled: true },

  app: {
    head: {
      title: 'SquadScript Admin Dashboard',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Admin dashboard for SquadScript RCON and server management' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  css: ['~/assets/css/tailwind.css'],

  // i18n configuration
  i18n: {
    defaultLocale: 'en',
    fallbackLocale: 'en',
    translationDir: 'i18n/locales',
    meta: true,
    strategy: 'prefix_except_default',
    types: true,
    locales: [
      {
        code: 'en',
        iso: 'en-US',
        name: 'English',
        nativeName: 'English',
        dir: 'ltr',
      },
      {
        code: 'ru',
        iso: 'ru-RU',
        name: 'Russian',
        nativeName: 'Русский',
        dir: 'ltr',
      },
      {
        code: 'uk',
        iso: 'uk-UA',
        name: 'Ukrainian',
        nativeName: 'Українська',
        dir: 'ltr',
      },
    ],
  },

  // Auth configuration
  auth: {
    webAuthn: false,
  },

  // Runtime config for auth secrets
  runtimeConfig: {
    adminUsername: process.env.NUXT_ADMIN_USERNAME || 'admin',
    adminPassword: process.env.NUXT_ADMIN_PASSWORD || 'admin',
    session: {
      maxAge: 60 * 60 * 24 * 7, // 1 week
    },
  },

  // shadcn-nuxt configuration
  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  // Nuxt 4 compatibility mode
  future: { compatibilityVersion: 4 },

  compatibilityDate: '2026-01-15',

  vite: {
    plugins: [tailwindcss()],
  },
})
