export function stripeKeyProblem(key: string): string | undefined {
  if (!key.trim()) return 'Stripe secret key is missing.'
  if (key.trim().startsWith('pk_')) return 'Stripe is configured with a publishable key. Set NUXT_STRIPE_SECRET_KEY to a server secret key.'
  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(key.trim())) return 'Stripe server key has an invalid format.'
}
