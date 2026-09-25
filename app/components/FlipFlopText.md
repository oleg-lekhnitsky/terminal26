# Flip flop

Replaces the gallery's Carousel card with the local Figma Library's Flip Flop → Flip 01 (`test-01`) preset. The existing `carousel` gallery ID is retained so curated placements remain stable.

Source: `apps/web/app/utils/video-templates.ts` (`testDefaults`) and `apps/web/app/composables/useVideoComposer.ts` (`drawTestFlip`) in the local Figma Library checkout.

The single panel turns left by 180 degrees per face using Sweep easing (0.86, 0.14, 0.14, 0.86). Six letters complete a sequence in 4.8 seconds (0.8 seconds per flip). Separate front-facing meshes make both sides readable without mirrored artwork. Camera FOV 36°, distance 5, plane scale 80%, viewport fill 82%, lighting, and roughness match the source preset. Letter textures use the selected font, alternating the existing purple ink and lavender paper colors.

Geometry and textures are reused across frames. Font changes rebuild the textures. Playback pauses offscreen, in background tabs, and for reduced motion. All textures, geometry, materials, and the renderer are disposed on unmount.
