<script setup lang="ts">
import { fontProducts, addFontToCart, type FontProductId } from '~/utils/fontShop'
import { motionSystem } from '~/utils/textRenderer'

const { activeFont } = useFontSelection()
const selected = ref<FontProductId>(activeFont.value.id)
const product = computed(() => fontProducts.find(item => item.id === selected.value)!)
const cart = useState<FontProductId[]>('font-cart', () => [])
const cartProducts = computed(() => fontProducts.filter(item => cart.value.includes(item.id)))
const total = computed(() => cartProducts.value.reduce((sum, item) => sum + item.price, 0))
const included = computed(() => cart.value.includes(product.value.id) || (product.value.id !== 'test-font' && cart.value.includes('full-pack')))
const dialog = useTemplateRef('dialog')
const money = (value: number) => `$${value}`
const checkingOut = ref(false)
const checkoutError = ref('')
async function checkout() {
  if (checkingOut.value || !cart.value.length) return
  checkingOut.value = true
  checkoutError.value = ''
  try {
    const result = await $fetch('/api/checkout', { method: 'POST', body: { items: cart.value } })
    window.location.assign(result.url)
  } catch (error: any) {
    checkoutError.value = error?.data?.statusMessage || 'Could not open checkout. Please try again.'
    checkingOut.value = false
  }
}
let loaded = false
watch(activeFont, font => { if (selected.value !== 'full-pack') selected.value = font.id })
onMounted(() => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('terminal-font-cart-v1') || '[]')
    if (Array.isArray(saved)) {
      cart.value = saved.reduce<FontProductId[]>((items, id) => fontProducts.some(product => product.id === id)
        ? addFontToCart(items, id as FontProductId) : items, [])
    }
  } catch { /* Cart remains usable without browser storage. */ }
  loaded = true
  if (new URLSearchParams(location.search).get('checkout') === 'cancelled') dialog.value?.showModal()
})
watch(cart, value => {
  if (loaded) try { localStorage.setItem('terminal-font-cart-v1', JSON.stringify(value)) } catch { /* Keep the in-memory cart. */ }
}, { deep: true })
function add() { cart.value = addFontToCart(cart.value, product.value.id) }
function changeStyle(direction: number) {
  const index = fontProducts.findIndex(item => item.id === selected.value)
  selected.value = fontProducts[(index + direction + fontProducts.length) % fontProducts.length]!.id
}
</script>

<template>
  <figure class="price-pin">
    <div class="price-pin__art">
      <header><span>AB Terminal</span><button type="button" @click="dialog?.showModal()">Cart · {{ cart.length
          }}</button></header>
      <div class="price-pin__selection" role="group" aria-label="Font style or full pack"
        @keydown.left.prevent="changeStyle(-1)" @keydown.right.prevent="changeStyle(1)">
        <button class="price-pin__step" type="button" aria-label="Previous font option" @click="changeStyle(-1)">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 6-6 6 6 6M6 12h12" />
          </svg>
        </button>
        <span class="price-pin__style" aria-live="polite" aria-atomic="true"
          :style="{ fontWeight: product.weight, fontStyle: product.style }">{{ product.label }}</span>
        <button class="price-pin__step" type="button" aria-label="Next font option" @click="changeStyle(1)">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 6 6 6-6 6M6 12h12" />
          </svg>
        </button>
      </div>
      <div class="price-pin__price" :aria-label="`${product.label}, ${money(product.price)} USD`">
        <WebGLText :text="money(product.price)" preset="typewriter" :duration="motionSystem.enter / 2"
          :stagger="motionSystem.stagger / 2" :font-weight="product.weight" :font-style="product.style"
          color="#f0e9d9" />
      </div>
      <div class="price-pin__purchase">
        <p>{{ product.description }} · USD</p>
        <button class="price-pin__add" :class="{ 'price-pin__add--checkout': included }" type="button" @click="included ? dialog?.showModal() : add()">{{ included ? 'Checkout' : 'Add to cart' }}</button>
        <span class="price-pin__sr" role="status">{{ cart.length ? `${cart.length} items in cart` : '' }}</span>
      </div>
    </div>
    <figcaption>Font shop</figcaption>
    <dialog ref="dialog" class="price-cart" aria-labelledby="font-cart-title" @click.self="dialog?.close()">
      <div class="price-cart__inner">
        <button class="price-cart__close" type="button" aria-label="Close cart" @click="dialog?.close()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
        <header class="price-cart__heading">
          <h2 id="font-cart-title">AB TERMINAL</h2>
          <p>TYPE FOUNDRY / FONT SHOP</p>
          <span>YOUR CART</span>
        </header>
        <div class="price-cart__columns" aria-hidden="true"><span>ITEM / QTY 1</span><span>USD</span></div>
        <p v-if="!cartProducts.length">Your cart is empty.</p>
        <ul v-else>
          <li v-for="item in cartProducts" :key="item.id">
            <div class="price-cart__item"><span :style="{ fontWeight: item.weight, fontStyle: item.style }">{{
                item.label }}</span><small>{{ item.description }}</small>
              <button type="button" :aria-label="`Remove ${item.label}`"
                @click="cart = cart.filter(id => id !== item.id)">Remove</button>
            </div>
            <span class="price-cart__amount">{{ item.price.toFixed(2) }}</span>
          </li>
        </ul>
        <p v-if="cartProducts.length" class="price-cart__total"><span>TOTAL</span><span>{{ money(total) }}</span></p>
        <div class="price-cart__footer">
          <p>{{ cart.length }} {{ cart.length === 1 ? 'ITEM' : 'ITEMS' }} / DIGITAL FONTS</p>
          <div class="price-cart__barcode" aria-hidden="true"></div>
          <p>THANK YOU FOR YOUR TYPE.</p>
        </div>
        <p v-if="checkoutError" role="alert">{{ checkoutError }}</p>
        <button class="price-cart__continue" type="button" :disabled="checkingOut || !cart.length" @click="checkout">{{
          checkingOut ? 'Opening checkout…' : `Checkout · ${money(total)}` }}</button>
        <p class="price-cart__secure">Secure checkout with Stripe</p>
        <NuxtLink class="price-cart__downloads" to="/checkout">Your downloads</NuxtLink>
      </div>
    </dialog>
  </figure>
</template>

<style scoped lang="scss">
.price-pin {
  margin: 0 0 var(--space-6);
  break-inside: avoid;

  &__art {
    container-type: inline-size;
    position: relative;
    aspect-ratio: 22 / 24;
    overflow: hidden;
    border-radius: var(--radius-xl);
    background: #252e48;
    color: #f0e9d9;
    font-family: var(--font-sans);
    font-weight: var(--specimen-weight, 700);
    font-style: var(--specimen-style, normal);
  }

  &__art>header {
    position: absolute;
    top: 7cqw;
    inset-inline: 7cqw;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 3cqw;
  }

  button {
    font: inherit;
  }

  &__art>header button {
    padding: .5em 0 .5em .75em;
    border: 0;
    color: inherit;
    background: transparent;
    cursor: pointer;
  }

  &__selection {
    position: absolute;
    top: 19cqw;
    inset-inline: 12cqw;
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) 44px;
    align-items: center;
    text-align: center;
    z-index: 1;
  }

  &__style {
    font-size: 5cqw;
    line-height: 1.2;
    white-space: nowrap;
  }

  &__step {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    color: inherit;
    background: transparent;
    opacity: .45;
    cursor: pointer;
    transition: opacity 150ms ease, background-color 150ms ease;
  }

  &__step:hover,
  &__step:focus-visible {
    opacity: 1;
    background: #f0e9d90a;
  }

  &__step svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &__price {
    position: absolute;
    top: 25cqw;
    inset-inline: 3cqw;
    height: 57cqw;
    --webgl-text-height: 100%;
    pointer-events: none;
  }

  &__price :deep(.webgl-text) {
    height: 100%;
  }

  &__purchase {
    position: absolute;
    bottom: 7cqw;
    inset-inline: 7cqw;
    text-align: center;
  }

  &__purchase p {
    margin: 0 0 3cqw;
    font-size: 3cqw;
  }

  &__add {
    width: 100%;
    min-height: 44px;
    padding: 3cqw;
    background: #f0e9d9;
    color: #252e48;
    border: 0;
    border-radius: 999px;
    font-size: 4cqw;
    cursor: pointer;
  }

  &__add--checkout {
    background: #f1d58a;
    color: #000;
  }

  &__add:disabled {
    opacity: .6;
    cursor: default;
  }

  button:active:not(:disabled) {
    transform: scale(.96);
  }

  button:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 4px;
  }

  &__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  figcaption {
    padding: var(--space-3) var(--space-2) 0;
    font-size: var(--text-sm);
    color: var(--color-text);
  }
}

.price-cart {
  width: min(25rem, calc(100vw - 2rem));
  box-sizing: border-box;
  max-height: 88dvh;
  padding: 0 0 10px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #22221e;
  font-family: var(--font-sans);
  font-size: .9rem;
  font-weight: 400;
  font-style: normal;

  &::backdrop {
    background: rgb(0 0 0 / .7);
  }

  &__inner {
    position: relative;
    padding: 3.5rem clamp(1.25rem, 5vw, 2rem) 1.5rem;
    background: #f4f1e7;
  }

  &__inner::after {
    content: '';
    position: absolute;
    top: 100%;
    inset-inline: 0;
    height: 10px;
    background: linear-gradient(135deg, #f4f1e7 25%, transparent 25%) 0 0 / 16px 16px, linear-gradient(225deg, #f4f1e7 25%, transparent 25%) 0 0 / 16px 16px;
  }

  button {
    color: inherit;
    font: inherit;
    border: 0;
    background: transparent;
    cursor: pointer;
    min-height: 44px;
  }

  &__close {
    position: absolute;
    top: .4rem;
    right: .5rem;
    width: 44px;
    display: grid;
    place-items: center;
  }

  &__close svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
  }

  &__heading {
    text-align: center;
    padding-bottom: 1.75rem;
  }

  h2 {
    margin: 0;
    font-size: clamp(1.6rem, 7vw, 2rem);
    font-weight: 700;
    line-height: 1.1;
  }

  &__heading p {
    margin: .6rem 0 1.5rem;
    font-size: .7rem;
    letter-spacing: .05em;
  }

  &__heading>span {
    letter-spacing: .16em;
    font-size: .8rem;
  }

  &__columns {
    display: flex;
    justify-content: space-between;
    padding-block: .7rem;
    border-block: 1px dashed #22221e80;
    font-size: .7rem;
  }

  ul {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    padding-top: 1.1rem;
  }

  &__item>span {
    text-transform: uppercase;
  }

  small {
    display: block;
    margin-top: .3rem;
    font-size: .75rem;
    color: #626258;
  }

  li button {
    display: block;
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 3px;
    font-size: .7rem;
    color: #626258;
  }

  &__amount {
    font-variant-numeric: tabular-nums;
  }

  &__total {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin: .6rem 0 0;
    padding-block: 1.1rem;
    border-top: 1px dashed #22221e80;
    border-bottom: 3px double #22221e80;
    font-size: 1.5rem;
    font-weight: 700;
  }

  &__footer {
    text-align: center;
    padding-block: 1.4rem .5rem;
  }

  &__footer p {
    margin: 0 0 1rem;
    font-size: .65rem;
    letter-spacing: .05em;
  }

  &__barcode {
    width: 70%;
    height: 38px;
    margin: 1.4rem auto .8rem;
    background: repeating-linear-gradient(90deg, #22221e 0 2px, transparent 2px 4px, #22221e 4px 5px, transparent 5px 8px, #22221e 8px 12px, transparent 12px 14px, #22221e 14px 15px, transparent 15px 19px, #22221e 19px 22px, transparent 22px 25px);
  }

  &__continue {
    width: 100%;
    margin-top: .25rem;
    padding: 1rem;
    background: #22221e !important;
    color: #f4f1e7 !important;
    font-size: .9rem !important;
  }

  &__continue:disabled {
    opacity: .5;
    cursor: default;
  }

  &__secure {
    text-align: center;
    font-size: .65rem;
    margin: .8rem 0 0;
  }

  &__downloads {
    display: block;
    text-align: center;
    margin-top: 1rem;
    color: inherit;
    font-size: .75rem;
    text-underline-offset: 3px;
  }

  button:hover {
    color: #000;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}
</style>
