# Specimen wheel

Adapted from Carousel 3D 07 in the local Figma Library renderer, with generated AB Terminal posters. `specimenWheel.ts` holds the artwork, geometry, lighting, and timing settings; `wheelRenderer.ts` builds the Three.js scene.

The wheel completes a Flow-eased revolution in 8.5 seconds. Geometry is normalized to plane width 1, with 4:5 posters, subtly rounded corners (radius 0.045), and a negative-Z camera. Rounded geometry preserves the full poster UV mapping. Printed faces stay upright and face the camera without mirrored textures. Depth writing, alpha testing, and depth-based opacity handle the compressed arrangement.

A fixed white spotlight at (-0.2, 0.3, -2.8) points at the center of the wheel. Its broad 32-degree cone and full penumbra spread the falloff across the stack instead of leaving a distinct circular pool on the posters. Key intensity 3.2 and cool hemisphere intensity 0.2 soften the contrast. MeshStandardMaterial uses roughness 0.85 and metalness 0 for a matte surface with subdued highlights. Illumination follows each surface's angle and position, including the upper cards; there is no height-based blackout. A single-pass shader keeps unprinted reverse faces black.

The dark navy-to-slate background supports the spotlight treatment. Font selection recreates the poster textures. Offscreen/background playback pauses; reduced motion uses a static pose. The renderer is loaded on the client and disposed on unmount.
