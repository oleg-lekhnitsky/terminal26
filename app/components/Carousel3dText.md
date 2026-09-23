# Carousel 3D 06

The board's Carousel card uses this component, replacing its previous Carousel 18 fan layout. The existing WebGLText carousel remains available to other consumers.

Motion and camera settings come from the local Figma library's `carousel-3d-06` preset: 33 planes, plane size 250, 90° plane twist, X 90° / Y -90° orientation, zero orbit radius, distance 660, perspective 160, Y offset -6, no fade, and a linear 360° turn every five seconds. Each plane is an opaque square in the card background color containing an uppercase letter from the card's text, repeated to fill all 33 slots. Lighting and camera-facing text follow the reference renderer. The existing card color, aspect ratio, and selected font apply.

`app/utils/carousel3dRenderer.ts` contains the scene and preset parameters. Playback pauses offscreen, in hidden tabs, and for reduced motion. Font changes regenerate textures.
