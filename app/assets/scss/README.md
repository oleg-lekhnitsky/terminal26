# Shared styles

`main.scss` loads globally through `nuxt.config.ts`, following the [Nuxt styling setup](https://nuxt.com/docs/4.x/getting-started/styling). Do not import it again in component styles.

- `_tokens.scss`: palette, semantic colors, fonts, type scale, spacing, radii, shadows, motion, layers, and control/container sizes. Start here when changing the visual system.
- `_base.scss`: box sizing, document defaults, media, native focus, and `.sr-only`.
- `_typography.scss`: heading defaults and `.heading`, `.text-small`, `.text-muted`, `.text-lead`, `.prose`.
- `_layout.scss`: `.container`, `.section`, `.stack`, `.cluster`, `.grid`, `.grid--two`, `.grid--three`, `.surface`.
- `_buttons.scss`: button variants, sizes, disabled/hover/pressed states, and reduced-motion support.
- `_mixins.scss`: `up(sm | md | lg | xl)` breakpoints. This file emits no CSS and is safe to import in components.

The initial theme uses neutral surfaces and green primary actions. Prefer semantic tokens such as `--color-text` and `--color-primary` over palette values. Override semantic tokens on a wrapper to theme a section. Status colors should accompany a text label or icon, not convey meaning alone.

## Component styles

CSS tokens work in any style block, including scoped styles. Only Sass mixins need an explicit import:

```vue
<style scoped lang="scss">
@use '~/assets/scss/mixins' as tokens;

.panel {
  padding: var(--space-4);
  color: var(--color-text);
  background: var(--color-surface);
  border-radius: var(--radius-lg);

  @include tokens.up(md) {
    padding: var(--space-8);
  }
}
</style>
```

## Layout

```vue
<template>
  <main class="container section stack" style="--stack-gap: var(--space-8)">
    <header class="stack">
      <h1>Page title</h1>
      <p class="text-lead text-muted">Page description.</p>
    </header>
    <div class="grid grid--two">
      <section class="surface stack"><h2>First section</h2></section>
      <section class="surface stack"><h2>Second section</h2></section>
    </div>
  </main>
</template>
```

Grids start with one column. `grid--two` switches to two at `md`; `grid--three` switches to two at `md` and three at `lg`. Customize individual layouts with `--stack-gap`, `--cluster-gap`, `--grid-gap`, `--grid-columns`, and `--surface-padding`.

## Buttons

Nuxt auto-imports `BaseButton`. It renders a native button, defaults to `type="button"`, and forwards attributes and listeners. Use `type="submit"` for form submissions.

```vue
<BaseButton @click="save">Save</BaseButton>
<BaseButton variant="secondary" size="sm">Cancel</BaseButton>
<BaseButton variant="ghost" disabled>Unavailable</BaseButton>
<BaseButton type="submit" size="lg" block>Continue</BaseButton>
<BaseButton static>Without press motion</BaseButton>
```

Variants: `primary`, `secondary`, `ghost`. Sizes: `sm`, `md`, `lg`. All sizes have at least a 44px target at the default root font size. `disabled` uses native browser behavior; `static` disables press scaling. Reduced-motion preferences disable transitions and scaling automatically. Icon-only buttons need an `aria-label`.

For navigation, use a real link with the same classes:

```vue
<NuxtLink to="/settings" class="button button--secondary">Settings</NuxtLink>
```

Do not apply disabled styles to links as a substitute for preventing navigation. Keep native focus indicators visible. Use `.prose` for spaced long-form content; heading levels still follow the document hierarchy.
