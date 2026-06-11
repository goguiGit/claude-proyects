---
name: scene-conventions
description: >
  Artemis Tracker Three.js scene conventions. Use when editing Earth atmosphere,
  glow, Moon rendering, trajectory lines, camera views, object scale, colors,
  opacity, lighting, or other visual tuning in the 3D scene.
paths: "public/js/**,src/**"
---

# Artemis Tracker — 3D Scene Conventions

## Coordinate system
- Y-axis is UP (Three.js default)
- 1 unit = 1,000 km (Earth radius ≈ 6.371 units)
- Earth at origin (0, 0, 0)
- Moon orbit radius ≈ 384 units (384,400 km)
- All positions in Earth-Centered Inertial (ECI) frame

## Scale factors
- Celestial bodies: 1x real scale relative to distances
- Spacecraft: 500x exaggerated (otherwise invisible)
- Trajectory line width: 2px (thin) to 4px (highlighted segment)

## Color palette
- Earth atmosphere — 4 layers (all MeshBasicMaterial + AdditiveBlending):
  - Troposphere: #88aaff opacity 0.08 · r=1.02 · FrontSide
  - Stratosphere: #4488ff opacity 0.15 · r=1.06 · FrontSide
  - Mesosphere:   #2255cc opacity 0.06 · r=1.12 · BackSide
  - Exosphere:    #112244 opacity 0.03 · r=1.22 · BackSide
- Moon: #cccccc base texture
- Trajectory default: #00ff88 (green)
- Trajectory active segment: #ff6600 (orange)
- Trajectory future: #00ff88 (opacity 0.3)
- HUD text: #00ff88 (terminal green)
- Warning values: #ff4444

## Performance rules
- Max 60fps target, use requestAnimationFrame
- Dispose textures and geometries when removing objects
- Use BufferGeometry, never legacy Geometry
- LOD (Level of Detail) for Earth/Moon at distance