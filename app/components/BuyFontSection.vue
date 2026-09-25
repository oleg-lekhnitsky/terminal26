<script setup lang="ts">
import { fontProducts, type FontProductId } from '~/utils/fontShop'

const { activeFont } = useFontSelection()
const shop = useTemplateRef('shop')
const id = useId()
const options = fontProducts
const selected = ref<FontProductId>(activeFont.value.id)
const product = computed(() => options.find(option => option.id === selected.value)!)
const { checkingOut, checkoutError, checkout } = useFontCheckout(() => [selected.value])
function openShop() {
  if (!checkingOut.value) {
    selected.value = activeFont.value.id
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
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        <h2 :id="`${id}-title`">Make it yours.</h2>
        <p class="buy-font__intro">AB Terminal · For personal and commercial use</p>
        <fieldset :disabled="checkingOut" class="buy-font__options">
          <legend class="sr-only">Font style or full pack</legend>
          <label v-for="option in options" :key="option.id" class="buy-font__option" :class="{ 'is-selected': selected === option.id }">
            <input v-model="selected" type="radio" :name="`${id}-product`" :value="option.id" />
            <span :style="{ fontWeight: option.weight, fontStyle: option.style }">{{ option.label }}<small v-if="option.id === 'full-pack'">All 4 styles</small></span>
            <span class="buy-font__price">${{ option.price }}</span>
          </label>
        </fieldset>
        <p v-if="checkoutError" class="buy-font__error" role="alert">{{ checkoutError }}</p>
        <p class="buy-font__license">Desktop, web, and apps included. Unlimited projects.<br />By checking out, you agree to the <a href="/license" target="_blank" rel="noopener">font license</a>.</p>
        <button class="buy-font__checkout" type="button" :disabled="checkingOut" :aria-busy="checkingOut" @click="checkout">
          {{ checkingOut ? 'Opening checkout…' : `Checkout · $${product.price}` }}
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
    background: linear-gradient(180deg, #030607 18%, #23314b 65%, #7c8390 100%); color: #eeeae3;
    font-size: clamp(32px, 7vw, 128px); line-height: 1.05; text-align: center;
    font-weight: var(--specimen-weight, 400); font-style: var(--specimen-style, normal);
    transition: color 150ms ease, scale 150ms ease;
    @media (hover: hover) { &:hover { color: #f2df64; } }
    &:active { scale: .96; }
    &:focus-visible { outline: 2px solid #eeeae3; outline-offset: 4px; }
    @media (max-width: 600px) { border-radius: 48px; }
  }
  &__shop {
    width: min(28rem, calc(100vw - 2rem)); max-height: 90dvh;
    padding: 0; border: 0; border-radius: 24px; background: #eeeae3; color: #24221f;
    font-family: var(--font-sans); font-weight: 400; font-style: normal;
    &::backdrop { background: #000c; }
  }
  &__inner { position: relative; padding: 64px clamp(20px, 5vw, 32px) 24px; }
  h2 { margin: 0; font-size: clamp(28px, 7vw, 40px); font-weight: 400; line-height: 1.1; }
  &__intro { margin: 12px 0 24px; font-size: 13px; }
  &__options { display: grid; gap: 8px; padding: 0; margin: 0; border: 0; min-width: 0; }
  &__option {
    display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 12px;
    border-radius: 12px; background: #24221f08; cursor: pointer; font-size: 16px;
    &.is-selected { background: #f2df64; }
    &:focus-within { outline: 2px solid #24221f; outline-offset: 2px; }
    input { flex-shrink: 0; width: 18px; height: 18px; margin: 0; accent-color: #24221f; }
    small { display: block; margin-top: 4px; font-size: 12px; font-weight: 400; font-style: normal; }
  }
  &__price { margin-left: auto; font-variant-numeric: tabular-nums; }
  &__checkout {
    width: 100%; min-height: 56px; margin-top: 24px; padding: 12px; border: 0;
    border-radius: 999px; background: #24221f; color: #eeeae3; font-size: 16px;
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
    width: 44px; height: 44px; border: 0; border-radius: 50%; background: #eeeae3; color: #24221f;
    svg { width: 20px; height: 20px; }
    @media (hover: hover) { &:hover { background: #f2df64; } }
    &:focus-visible { outline: 2px solid #f2df64; outline-offset: 2px; }
  }
  @media (prefers-reduced-motion: reduce) { &__button { transition: none; } }
}
</style>
