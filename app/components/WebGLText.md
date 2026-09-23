# WebGLText

A reusable WebGL font specimen. Each grapheme is a separate textured quad. The homepage presents autoplaying specimens in a masonry board, using `FontPresetCard` for the artwork and caption.

- `rise`: staggered lift and settle using Flow.
- `drop`: staggered fall with a Flow settle.
- `letter`: one whitespace-separated group at a time, such as `Aa Bb Cc`. The board cycles through all 26 uppercase/lowercase pairs.
- `words`: cycles through whitespace-separated words with a Flow entrance, hold, and exit. Words are measured and drawn as complete units to retain kerning, with a consistent font size fitted to the widest word. The board uses `Form Rhythm Motion Balance`.
- `numbers`: oversized numerals cycling from 0 to 9, fitted to fill the card at a consistent size, with Flow transitions.
- `poster`: stacks newline-separated uppercase lines in a portrait composition. Each line enters with staggered Flow motion; all lines share a font size fitted to the longest line and available height. The board reads `what / TYPE / MOVE`.
- `carousel`: uppercase letters using local Figma library Carousel 18 with fan tilt: 1.6-second Flow steps, no added hold or fading, plane size 657, gap 273, tilt -25 (hundredths of a radian), and six visible slots. The reference perspective depth is projected into WebGL glyph positions/scales; the glyphs straighten at the center.
- `typewriter`: the word appears one letter at a time, each revealed with Flow opacity.
- `slide`: a continuously scrolling, repeating specimen.
- `fan`: an oversized letter carousel moving along a shallow arc; each letter tilts with its position and becomes upright at the center, using Flow easing between steps.
- `collage`: overlapping cream paper tiles with oversized colored glyphs and small specimen labels. The cards stay fixed while the camera pans across the field with Flow timing. Tiles cycle through the non-whitespace graphemes of `text`, default specimen `ABCDEFGHIJKLMNOPQRSTUVWXYZ`; artwork positions and colors live in `collageTiles` and `collageColors`.

All animated transitions use the shared Flow curve: `cubic-bezier(0.86, 0.14, 0.14, 0.86)`, including Drop, scrolling cycles, sequential typewriter reveals, entrance opacity, and loop fades. The renderer evaluates this curve in JavaScript; CSS components can reuse `var(--ease-flow)`.

`motionSystem` defines the base rhythm: 800ms entrance, 800ms hold, 400ms exit, 160ms rest, 80ms stagger, and 0.65em travel. Entrance opacity follows the same eased progress and duration as movement; exits also share progress for movement and fade. `motionProfiles` derives each preset's timing using ½×, 1×, 2×, or 4× multipliers:

| Presets | Movement duration | Internal stagger |
| --- | --- | --- |
| Rise | 800ms | 80ms |
| One at a time | Hard cut every 667ms | Not used |
| Numbers | 400ms | Not used |
| Carousel | 1600ms, no added hold | Not used |
| Word by word | 800ms | Not used |
| Drop | 400ms | 160ms |
| Typewriter | 400ms sequence minimum | 40ms per character |
| Fan | 1600ms | Not used |
| Type collage | 6400ms per camera pan | No tile stagger |
| Poster | 1600ms | 160ms per line |
| On repeat | 3200ms | Not used |

Board cards use repeating start offsets of 0, 160, 320, and 480ms. `delay` runs once when a card first starts or is replayed, and pauses with the timeline while offscreen. Holds, exits, travel, and Flow stay shared. Adjust the base tokens to change the whole system; adjust profile multipliers to change a preset's character.

```vue
<WebGLText
  text="Motion"
  preset="carousel"
  font-family="AB Terminal, sans-serif"
  :font-weight="700"
  :letter-spacing="-0.04"
  color="#38214a"
  :duration="0.8"
  loop
  style="--webgl-text-height: 24rem"
/>
```

| Prop | Default | Purpose |
| --- | --- | --- |
| `text` | Required | Short single-line specimen; whitespace is collapsed. |
| `preset` | `rise` | One of the preset IDs above. |
| `loop` | `false` | Autoplay repeatedly. Entrance presets hold, fade, and restart; continuous presets wrap seamlessly. |
| `replayKey` | `0` | Change to restart the timeline. |
| `fontFamily` | `"AB Terminal", sans-serif` | CSS font-family stack. |
| `fontWeight` | `700` | Weight supported by the face. |
| `fontStyle` | `normal` | `normal` or `italic`; used for font loading, canvas drawing, and fallback text. |
| `letterSpacing` | `0` | Tracking in em, added to native kerning. Negative tightens, positive loosens. Changes redraw the texture. |
| `color` | `#d6d6d6` | Literal Canvas-compatible color. |
| `duration` | `0.8` | Movement duration in seconds; shared holds and exits are added automatically. Clamped to 0.1–5. |
| `stagger` | `0.08` | Delay between entrances; character interval for typewriter. |
| `delay` | `0` | Initial/replay delay in seconds, clamped to 0–5; pauses with the timeline. |
| `speed` | `1` | Playback multiplier, clamped to 0–4. |
| `paused` | `false` | Freeze the timeline. |

The exposed `replay()` method resets the timeline. Text, font, weight, color, or preset changes restart it. Resizing preserves timeline position. Set `--webgl-text-height` to change height. Art direction and specimen text are configured in `textPresets` in `app/utils/textRenderer.ts`.

Define custom fonts with `@font-face` in global SCSS and put their files in `public/fonts/`. The component waits for font loading before restarting.

Set `typographySystem.letterSpacing` in `app/utils/textRenderer.ts` for every board card, or pass `:letter-spacing="0.04"` to one `WebGLText`. Tracking applies inside words, lines, and Aa pairs as well as animated text. Carousel/fan paths keep their own spatial arrangement. The value is converted to pixels at the actual canvas font size and reapplied after canvas resets, for both measurement and drawing. This uses the [Canvas letterSpacing API](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/letterSpacing), supported by current browsers. The HTML fallback uses the same em value.

Word layouts use kerned prefix measurements at the final font size, preserving kerning in letter placement and whole-word centering. Individual glyph textures preserve combining marks and emoji sequences, but do not reproduce cross-letter ligatures, contextual glyph substitutions, or bidirectional layout. It is intended for short Latin specimens. The pair and carousel presets measure each displayed unit independently; pairs such as `Aa` retain internal kerning.

SSR and unavailable/lost WebGL contexts show HTML text. Reduced-motion preferences show a static composition. Hidden tabs and offscreen cards suspend playback; unmount releases GPU resources, observers, listeners, and animation frames.

The project font is bundled locally from `app/assets/fonts/AB_Terminal-Bold.ttf` via `_fonts.scss`. CSS uses `--font-sans`; canvas defaults use `typographySystem.fontFamily` and `fontWeight`. WebGL textures are rebuilt after the font finishes loading. Regular, Italic, Bold, and Bold Italic are bundled. The board selector uses `useFontSelection()` to update WebGL font weight/style and CSS/SVG specimen variables together. The default selection is Bold.

The collage camera follows a closed four-stop path across a repeated paper field. Each pan uses Flow over four times the preset duration, then the shared hold. Neighboring patches reuse textures, with offscreen cards culled by their diagonal bounds. Reduced motion freezes the camera at its starting composition.

The `letter` specimen now follows One Shot 01: a hard cut every 4/6 seconds, 70% fit, no fade, travel, or initial delay. It starts with all 26 pairs, then shows the selected font’s supported punctuation and symbols. Coverage comes from the bundled fonts’ Unicode cmap tables in `fontSymbols.ts`; the loop length follows the number of supported items. `oneShotSystem` and `oneShotIndex()` control this sequence. Reduced motion holds Aa. Words and numbers retain their Flow transitions.
