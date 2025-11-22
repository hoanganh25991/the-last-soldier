# 3D Models Directory

Place your 3D soldier model file here.

## Required File

- **soldier.glb** or **soldier.gltf** - The 3D soldier model (brown colored)

## Model Requirements

- Format: GLB or GLTF
- The model should be in brown color (will be automatically colored blue for teammates, red for enemies)
- Recommended scale: Normalized to reasonable size (will be scaled if needed)
- The model should face forward along the Z-axis (negative Z is forward in Three.js)

## Usage

The game will automatically:
- Load the soldier model for both teammates and enemies
- Change colors: Blue for teammates, Red for enemies
- Apply shadows and lighting
- Position health bars above the model

If the model file is not found, the game will fall back to simple geometric shapes.

