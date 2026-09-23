# Specimen wheel

Uses Carousel 3D 07 from the local Figma Library project (`apps/web/app/utils/video-templates.ts` and `useVideoComposer.ts`) with generated AB Terminal posters.

`specimenWheel.ts` holds the preset settings, twelve artworks, and the complete 360-degree Flow/Sweep rotation over 2.5 seconds. `wheelRenderer.ts` implements the reference's zero-radius radial placement, aspect-aware inner-edge offset, visible-side -30-degree plane twist, ZYX parent orientation (6, 18, -17 degrees), negative-Z camera, and depth fade. Geometry is normalized to plane width 1, with camera distance 1020/380; our posters have a 4:5 aspect ratio.

Three.js MeshStandardMaterial uses roughness 0.63 and metalness 0. Lighting is fixed in the scene: white/gray hemisphere intensity 2.1 and white directional light intensity 2.4 at (-3, 4, 5). There are no CSS lighting overlays or artificial black backs. Faces turn toward the camera as in the reference. Depth writing and alpha testing remain enabled for the compressed arrangement.

The existing gradient card background and generated typography replace the reference's media assets. Font selection reloads the chosen local face and recreates the poster textures. Offscreen/background playback pauses; reduced motion uses a static pose. The renderer is loaded on the client and disposed on unmount.
