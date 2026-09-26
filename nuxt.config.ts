// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  serverDir: 'server',
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      meta: [
        { name: 'theme-color', content: '#000000' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'AB Terminal' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        { id: 'terminal-favicon', rel: 'icon', type: 'image/png', href: '/favicon/frame-0.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon.png' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      siteUrl: 'https://terminal26.vercel.app',
    },
    stripeSecretKey: '',
    fontDownloadSecret: '',
    siteUrl: 'http://localhost:3000',
    r2AccountId: '',
    r2AccessKeyId: '',
    r2SecretAccessKey: '',
    r2Bucket: '',
  },
  nitro: {
    externals: {
      inline: [/^@aws-sdk\//, /^@smithy\//],
    },
    serverAssets: [{ baseName: 'fontDownloads', dir: './font-downloads' }],
  },
  css: ['~/assets/scss/main.scss'],
  devtools: { enabled: true }
})
