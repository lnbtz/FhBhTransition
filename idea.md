Build a SvelteKit + TypeScript page that uses Three.js to display a 3D table tennis table from the player’s perspective and animate balls flying toward the player.

Requirements:
- Perspective camera at the player position, looking at the opposite end of the table.
- Simplified 3D table with realistic proportions and a net.
- Balls are spheres coming from a “robot” at the far end, following a simple arc to a landing point on my side (forehand/backhand).
- make sure ball directions and origins are changeable for future drills and new drills can easily be added

- Configurable:
  - make sure trajectories and speeds are adjustable later
  - also make it possible to have balls orinate from dfferent positions on the table
  - interval between balls (ms)
  - flight duration / speed
  - toggle: alternate forehand/backhand landing spots

- Use `onMount` to initialize Three.js, handle resize, and run an animation loop.
- Provide full TypeScript code for `src/routes/+page.svelte` and any helper modules. Add comments explaining the coordinate system and trajectory calculations.