# Letter cube

`LetterCubeCard` adds an autoplaying six-faced cube to the masonry board. It uses CSS 3D faces, preserving crisp browser-rendered typography without another WebGL context.

The cube tumbles diagonally using Flow and a movement duration of twice `motionSystem.enter`, followed by `motionSystem.hold`. Every turn settles at exact quarter turns, presenting a square face front-on during the hold. The path visits the four side faces, then tips from the front to the bottom and top, so all six faces hold their lettering upright. Each transition takes a 270-degree main turn, adding a curved 45-degree secondary tilt and a 22.5-degree screen-space roll, both driven by the same eased progress. Both vanish at the endpoints, keeping held faces front-on and upright. The outer Z roll leaves the hidden-face depth test unchanged. Its letter spacing comes from `typographySystem.letterSpacing`.

`cubeHiddenFaces()` transforms each face normal using the same rotation order as CSS. The component changes a letter pair only when its face crosses into a fully back-facing orientation (normal z below -0.25). `backface-visibility: hidden` hides the reverse sides. Visible and nearly edge-on faces keep their text. Pairs cycle from Aa through Zz.

The cube pauses offscreen, in background tabs, or when reduced motion is requested. The static SSR pose is visible before mounting. All animation frames, observers, and listeners are cleaned up on unmount.

Rotation and visibility helpers live in `app/utils/cubeMotion.ts`; size, perspective, and face colors live in `LetterCubeCard.vue`.

All faces share the constant paper color `#f5f6f7`, with no animated lighting or shading overlay.
