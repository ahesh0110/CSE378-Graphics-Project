# Island Storm

A 3D browser-based game built with Three.js for CSE378 Computer Graphics.

Navigate your boat through stormy waters, find the golden coin on a remote island, and return safely to win.

## Features

### Environment
- Dynamic day/night cycle with procedural sky gradients and cubemap skybox
- Realistic water simulation using Three.js Water shader
- Volumetric clouds with drift animation
- Rain particle system (18,000 particles)
- Lightning and thunder effects
- Fog effects that change with time of day

### Island Scene
- Central island with grass, trees, rocks, and houses
- Animated fire with particle effects and dynamic lighting
- Smoke particle system rising from the campfire
- NPC villagers with walking animations
- Animals (dogs and cats) roaming the island

### Gameplay
- Player-controlled sailing boat with physics-based movement
- NPC boats patrolling the waters
- Coin collection objective
- Collision detection system
- Win condition: collect the coin and return to the island

### Audio
- Ambient rain and thunder soundtrack
- Procedurally generated fire crackling sound
- Water splash effects tied to boat movement

### UI
- Start screen with game instructions
- Pause menu (ESC key)
- Win screen with restart option
- Object info panel (click on objects to see details)
- Objective tracker

## Controls

| Key | Action |
|-----|--------|
| W / Arrow Up | Move forward |
| S / Arrow Down | Move backward |
| A / Arrow Left | Turn left |
| D / Arrow Right | Turn right |
| T | Toggle day/night |
| ESC | Pause game |
| Mouse | Orbit camera |
| Click | Select object for info |

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ahesh0110/CSE378-Graphics-Project.git
   cd CSE378-Graphics-Project
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start a local server (Three.js requires a server for module imports):
   ```bash
   npx vite
   ```
   Or use any static file server like `live-server` or Python's `http.server`.

4. Open `http://localhost:5173` (or your server's URL) in a browser.

## Project Structure

```
CSE378-Graphics-Project/
├── main.js          # Main game logic and Three.js scene
├── index.html       # HTML entry point with import map
├── package.json     # npm configuration
└── assets/          # Game assets
    ├── dark-s_*.jpg         # Night skybox textures
    ├── Water_*_Normal.jpg   # Water normal maps
    ├── clouds.jpg           # Cloud texture
    └── rain-and-thunder.mp3 # Ambient audio
```

## Technologies

- [Three.js](https://threejs.org/) - 3D graphics library
- WebGL - Hardware-accelerated 3D rendering
- Web Audio API - Procedural audio generation

## Browser Support

Requires a modern browser with WebGL 2.0 support:
- Chrome 80+
- Firefox 75+
- Edge 80+
- Safari 14+

## License

ISC
