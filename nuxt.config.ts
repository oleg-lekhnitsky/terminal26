// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  serverDir: 'server',
  runtimeConfig: {
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
