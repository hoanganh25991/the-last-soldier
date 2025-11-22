# The Last Soldier

A 3D browser-based first-person shooter game built with Three.js. Experience intense battlefield combat with realistic weapon mechanics, team-based gameplay, and immersive 3D environments.

## Features

- **3D First-Person Shooter**: Immersive 3D gameplay powered by Three.js
- **Weapon System**: Primary and secondary weapons with realistic shooting mechanics
- **Team-Based Combat**: Join matches and compete in team-based battles
- **Battlefield Environment**: Dynamic 3D terrain with LOD (Level of Detail) optimization
- **Player Customization**: Customize your weapons and loadout
- **Comprehensive HUD**: Real-time health, ammo, compass, and team score displays
- **Audio System**: Background music and weapon sound effects
- **Menu System**: Intuitive menu interface with multiple game modes
- **Settings**: Customizable graphics, audio, and control settings

## Technologies Used

- **Three.js** (v0.160.0) - 3D graphics rendering
- **Vanilla JavaScript** (ES6 Modules) - Game logic and architecture
- **HTML5/CSS3** - UI and styling
- **Web Audio API** - Sound management

## Getting Started

### Prerequisites

- A modern web browser with ES6 module support
- Python 3.x (for local development server)
- Node.js (optional, for alternative server solutions)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd the-last-soldier
```

2. Set up sound files (see [Sound Setup Guide](docs/sounds-setup.md)):
   - Place required MP3 files in the `sounds/` directory
   - Required files: `menu-music.mp3`, `rifle-shoot.mp3`, `pistol-shoot.mp3`, `bullet-shoot.mp3`

### Running the Game

The game requires a local web server to run due to ES6 module imports and audio file handling.

#### Option 1: Python HTTP Server (Recommended)

```bash
python3 -m http.server 8000
```

Then open your browser and navigate to: `http://localhost:8000`

#### Option 2: Custom Server

If you have a custom server script (`server.py`), run:

```bash
python3 server.py
```

Then open: `http://localhost:8000`

**Note:** The custom server handles audio range requests better and prevents 416 errors.

### Troubleshooting

- **Audio 416 Errors**: Use a custom server that handles range requests properly
- **Module Import Errors**: Ensure you're running the game through a web server, not opening the HTML file directly
- **Missing Sounds**: Check that all required sound files exist in the `sounds/` directory (see [Sound Setup Guide](docs/sounds-setup.md))

## Project Structure

```
the-last-soldier/
├── css/                    # Stylesheets
│   ├── base.css           # Base styles
│   ├── hud.css            # HUD styling
│   ├── menu-*.css         # Menu-specific styles
│   └── style.css          # Main stylesheet
├── docs/                   # Documentation
│   ├── run-server.md      # Server setup guide
│   └── sounds-setup.md    # Sound file setup guide
├── images/                 # Image assets
├── sounds/                 # Audio files
│   ├── menu-music.mp3
│   ├── rifle-shoot.mp3
│   ├── pistol-shoot.mp3
│   └── bullet-shoot.mp3
├── src/                    # Source code
│   ├── collision/         # Collision detection system
│   ├── core/              # Core game engine
│   ├── effects/           # Visual effects
│   ├── enemies/          # Enemy AI and team management
│   ├── player/           # Player controller
│   ├── ui/               # UI management
│   ├── weapons/          # Weapon system
│   ├── world/            # World/terrain generation
│   └── main.js           # Entry point
├── index.html            # Main HTML file
└── LICENSE               # License file
```

## Game Controls

- **Movement**: WASD keys or joystick (mobile)
- **Look Around**: Mouse movement
- **Fire**: Left Mouse Button (LMB)
- **Aim**: Right Mouse Button (RMB)
- **Reload**: R key
- **Grenade**: G key
- **Sprint**: Shift key
- **Crouch**: C key

## Game Modes

- **Create Match**: Host your own custom match for local network play
- **Join Match**: Join a friend's game via IP address
- **Online Match**: Find games from the server browser
- **Map Editor**: Create and customize your own maps

## Development

The game uses ES6 modules and follows a modular architecture:

- **Core Engine** (`src/core/`): Game loop, rendering, and core systems
- **Player Controller** (`src/player/`): First-person movement and camera
- **Weapon System** (`src/weapons/`): Weapon mechanics and bullet physics
- **Collision System** (`src/collision/`): Collision detection and response
- **UI Manager** (`src/ui/`): Menu system and HUD management
- **Team Manager** (`src/enemies/`): Enemy AI and team management

## Version

Current Version: 0.7.2

## License

Copyright © 2025 Monk Journey Team. All Rights Reserved.

This project is proprietary and confidential. Unauthorized reproduction, distribution, or disclosure is prohibited. No license, express or implied, to any intellectual property rights is granted by this document.

See the [LICENSE](LICENSE) file for full details.

