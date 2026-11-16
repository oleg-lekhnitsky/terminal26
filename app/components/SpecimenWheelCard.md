# Chrome letters (formerly Specimen wheel)

The card keeps the specimen wheel’s original 4:5 layout, gallery position, and dark navy-to-slate gradient. Its artwork is now rotating, extruded lowercase `ab`, rendered by `metallicLettersRenderer.ts` with beveled edges and a reflective chrome material.

Font selection rebuilds geometry from the actual AB Terminal outlines for all eight styles. Run `scripts/generate-metallic-letter-outlines.py` with fontTools installed after changing source glyph outlines. The exported geometry input is `app/utils/metallicLetterOutlines.json`.

The WebGL scene initializes when the card approaches the viewport, pauses offscreen and in hidden tabs, and shows a static pose for reduced motion. A text fallback remains available when WebGL cannot initialize. Geometry, environment textures, and the renderer are disposed on unmount.
