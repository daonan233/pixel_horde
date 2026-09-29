# PIXEL HORDE

> Survive endless hordes, unleash absurd firepower, and conquer a vast low-poly wasteland.

PIXEL HORDE is a fast-paced browser-based 3D first-person shooter built around a huge low-poly world, dense monster hordes, exaggerated weapons, and drop-in online co-op. Open the page, click **CLICK TO PLAY**, and start shooting—no installation or game launcher required.

## Highlights

- **Huge procedural world** — a 6000 × 6000 m chunk-streamed map with towns, forests, factories, wastelands, military bases, ancient ruins, crystal altars, beacons, and crashed UFOs.
- **Large monster hordes** — zombies, runners, tanks, and a towering TITAN world boss with distinct silhouettes and movement.
- **Five detailed weapons** — assault rifle, SMG, shotgun, minigun, and RPG, each with its own model, handling, recoil, reload animation, and effects.
- **Ballistic rockets** — RPG projectiles travel along a gravity-driven arc with a visible body, exhaust flame, smoke trail, impact explosion, splash damage, and knockback.
- **Infinite reserve ammo** — magazines still need to be reloaded, so combat keeps its rhythm without running dry.
- **Online co-op** — Colyseus-powered rooms support up to 30 players with server-authoritative monsters and combat.
- **Performance-focused rendering** — chunk streaming, area-of-interest snapshots, instanced monster rigs, dynamic resolution scaling, and distance-based detail keep the action smooth.
- **Combat feedback** — hit markers, damage numbers, kill combos, death fragments, screen shake, muzzle flashes, tracers, explosions, and a detailed 120 m radar.

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| Mouse | Look around |
| Left mouse button | Fire |
| Right mouse button | Aim |
| `Shift` | Sprint |
| `Space` | Jump |
| `R` | Reload |
| `1`–`5` | Select weapon |
| `Esc` | Release mouse cursor |

## Weapons

1. **AK-47 // IRON FANG** — versatile automatic rifle
2. **VX-9 // HORNET** — high-rate close-range SMG
3. **M12 // BOOMSTICK** — heavy spread shotgun
4. **M134 // MEAT GRINDER** — warm-up rotary minigun
5. **RPG-7 // APOCALYPSE** — ballistic explosive launcher

## Run locally

### Requirements

- Node.js 20 or newer
- A modern browser with WebGL 2 and Pointer Lock support

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite client runs on port `5173`, while the Colyseus game server runs on port `2567`.

To test multiplayer locally, open the game in multiple browser tabs or windows.

### Production build

```bash
npm run build
```

The optimized client bundle is generated in `dist/`. Start the game server separately with:

```bash
npm start
```

## Tech stack

- **TypeScript**
- **Three.js** for 3D rendering
- **Rapier** for player physics and collision
- **Colyseus** for authoritative multiplayer rooms
- **Vite** for development and production builds

## Project structure

```text
src/
  core/        Game loop and scene orchestration
  effects/     Particles, explosions, rockets, and weapon feedback
  monsters/    Instanced monster rigs and client interpolation
  network/     Colyseus client connection
  player/      First-person movement and physics controller
  ui/          HUD, radar, health, and weapon display
  weapons/     Weapon models, firing, recoil, and reload logic
  world/       Chunk-streamed map generation
server/src/    Authoritative Colyseus game server
shared/        Client/server network protocol
```

## Status

PIXEL HORDE is an actively evolving prototype. Balance, content density, visuals, and multiplayer behavior may continue to change.

## License

Released under the [MIT License](LICENSE).

