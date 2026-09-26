<script setup lang="ts">
import { fontProducts, toggleFontSelection, type FontProductId } from '~/utils/fontShop'

const shop = useTemplateRef('shop')
const id = useId()
const options = fontProducts
const selected = useState<FontProductId[]>('font-cart', () => [])
const total = computed(() => options.filter(option => selected.value.includes(option.id)).reduce((sum, option) => sum + option.price, 0))
const fullPack = options.find(option => option.id === 'full-pack')!
const { checkingOut, checkoutError, checkout } = useFontCheckout(() => selected.value)
function toggleSelection(product: FontProductId) {
  if (checkingOut.value) return
  selected.value = toggleFontSelection(selected.value, product)
  checkoutError.value = ''
}
function openShop() {
  if (!checkingOut.value) {
    checkoutError.value = ''
  }
  shop.value?.showModal()
}
defineExpose({ openShop })
</script>

<template>
  <section class="buy-font" aria-label="Buy AB Terminal">
    <button class="buy-font__button" type="button" aria-haspopup="dialog" @click="openShop">
      <span>Buy AB Terminal</span>
    </button>
    <dialog ref="shop" class="buy-font__shop" :aria-labelledby="`${id}-title`" @click.self="shop?.close()">
      <div class="buy-font__inner">
        <button class="buy-font__close" type="button" aria-label="Close font shop" @click="shop?.close()">
          <PixelCloseIcon />
        </button>
        <h2 :id="`${id}-title`" tabindex="-1" autofocus>Select weights.</h2>
        <p class="buy-font__intro">AB Terminal · For personal and commercial use</p>
        <fieldset :disabled="checkingOut" class="buy-font__options">
          <legend class="sr-only">Choose font styles or the full pack</legend>
          <label v-for="option in options" :key="option.id" class="buy-font__option" :class="{ 'is-selected': selected.includes(option.id) }">
            <input class="sr-only" type="checkbox" :name="`${id}-product`" :value="option.id" :checked="selected.includes(option.id)" @change="toggleSelection(option.id)" />
            <span class="buy-font__check" aria-hidden="true">
              <svg viewBox="0 0 7 7">
                <rect x="0" y="3" width="1" height="1" rx=".18" />
                <rect x="1" y="4" width="1" height="1" rx=".18" />
                <rect x="2" y="5" width="1" height="1" rx=".18" />
                <rect x="3" y="4" width="1" height="1" rx=".18" />
                <rect x="4" y="3" width="1" height="1" rx=".18" />
                <rect x="5" y="2" width="1" height="1" rx=".18" />
                <rect x="6" y="1" width="1" height="1" rx=".18" />
              </svg>
            </span>
            <span :style="{ fontWeight: option.weight, fontStyle: option.style }">{{ option.label }}<small v-if="option.id === 'full-pack'">All 4 styles</small></span>
            <span class="buy-font__price">${{ option.price }}</span>
          </label>
        </fieldset>
        <p v-if="total > fullPack.price" class="buy-font__note" role="status">All 4 styles cost ${{ fullPack.price }} with Full pack.</p>
        <p v-if="checkoutError" class="buy-font__error" role="alert">{{ checkoutError }}</p>
        <p class="buy-font__license">Desktop, web, and apps included. Unlimited projects.<br />By checking out, you agree to the <a href="/license" target="_blank" rel="noopener">font license</a>.</p>
        <button class="buy-font__checkout" type="button" :disabled="checkingOut || !selected.length" :aria-busy="checkingOut" @click="checkout">
          {{ checkingOut ? 'Opening checkout…' : selected.length ? `Checkout · $${total}` : 'Choose your fonts' }}
        </button>
        <p class="buy-font__note">USD · Secure checkout with Stripe</p>
      </div>
    </dialog>
  </section>
</template>

<style scoped lang="scss">
.buy-font {
  width: 100%; min-width: 0;
  button { font-family: var(--font-sans); cursor: pointer; }
  svg { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  &__button {
    display: flex; align-items: center; justify-content: center; gap: 24px;
    width: 100%; margin-inline: auto; min-height: clamp(180px, 24vw, 440px); padding: clamp(24px, 5vw, 80px);
    border: 0; border-radius: calc(var(--radius-xl) * 2);
    background: linear-gradient(180deg, #000000 18%, #23314b 65%, #7c8390 100%); color: #eeeae3;
    font-size: clamp(32px, 7vw, 128px); line-height: 1.05; text-align: center;
    font-weight: var(--specimen-weight, 400); font-style: var(--specimen-style, normal);
    transition: color 150ms ease, scale 150ms ease;
    @media (hover: hover) { &:hover { color: #daf759; } }
    &:active { scale: .96; }
    &:focus-visible { outline: 2px solid #eeeae3; outline-offset: 4px; }
    @media (max-width: 600px) { border-radius: 48px; }
  }
  &__shop {
    width: min(28rem, calc(100vw - 2rem)); max-height: 90dvh;
    padding: 0 0 10px; border: 0; border-radius: 0; background: transparent; color: #24221f;
    font-family: var(--font-sans); font-weight: 400; font-style: normal;
    &::backdrop { background: #000c; }
  }
  &__inner { position: relative; padding: 64px clamp(20px, 5vw, 32px) 24px; background: #f4f1e7; }
  &__inner::after {
    content: ''; position: absolute; top: 100%; inset-inline: 0; height: 10px;
    background: linear-gradient(135deg, #f4f1e7 25%, transparent 25%) 0 0 / 16px 16px,
      linear-gradient(225deg, #f4f1e7 25%, transparent 25%) 0 0 / 16px 16px;
  }
  h2 { margin: 0; font-size: clamp(28px, 7vw, 40px); font-weight: 400; line-height: 1.1; }
  h2:focus { outline: none; }
  &__intro { margin: 12px 0 24px; font-size: 13px; }
  &__options { display: grid; gap: 8px; padding: 0; margin: 0; border: 0; min-width: 0; }
  &__option {
    display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 12px;
    border-radius: 12px; background: #24221f08; cursor: pointer; font-size: 16px;
    &.is-selected { background: #daf759; }
    &:focus-within { outline: 2px solid #24221f; outline-offset: 2px; }
    small { display: block; margin-top: 4px; font-size: 12px; font-weight: 400; font-style: normal; }
  }
  &__check {
    display: grid; place-items: center; flex-shrink: 0; width: 20px; height: 20px;
    border: 1px solid #24221f80; border-radius: 4px; background: transparent; color: #eeeae3;
    svg { width: 14px; height: 14px; fill: currentColor; stroke: none; visibility: hidden; }
  }
  input:checked + &__check {
    background: #24221f; border-color: #24221f;
    svg { visibility: visible; }
  }
  @media (forced-colors: active) {
    &__check { border-color: ButtonText; }
    input:checked + &__check { background: Highlight; color: HighlightText; forced-color-adjust: none; }
  }
  &__price { margin-left: auto; font-variant-numeric: tabular-nums; }
  &__checkout {
    width: 100%; min-height: 56px; margin-top: 24px; padding: 12px; border: 0;
    border-radius: 0; background: #24221f; color: #f4f1e7; font-size: 16px;
    &:disabled { opacity: .6; cursor: wait; }
    &:focus-visible { outline: 2px solid #24221f; outline-offset: 3px; }
    @media (hover: hover) { &:hover:not(:disabled) { background: #403d37; } }
  }
  &__note { margin: 12px 0 0; font-size: 11px; text-align: center; }
  &__license { margin: 20px 0 0; font-size: 12px; line-height: 1.6; }
  &__license a { color: inherit; text-underline-offset: 3px; }
  &__error { margin: 16px 0 0; font-size: 13px; line-height: 1.5; }
  &__close {
    position: absolute; top: 12px; right: 12px; display: grid; place-items: center;
    width: 44px; height: 44px; border: 0; border-radius: 0; background: transparent; color: #24221f;
    svg { width: 20px; height: 20px; }
    @media (hover: hover) { &:hover { background: #daf759; } }
    &:focus-visible { outline: 2px solid #daf759; outline-offset: 2px; }
  }
  @media (prefers-reduced-motion: reduce) { &__button { transition: none; } }
}
</style>
