[Root Directory](../../CLAUDE.md) > [Run](../) > **Data**

# Game Assets and Configuration Module

## Module Responsibilities

The Game Assets module provides **runtime resources and configuration** for the ProtogameJS3D engine, including 3D models, HLSL shaders, textures, audio assets, and system configuration files. This module serves as the content pipeline for the dual-language game engine.

## Entry and Startup

### Primary Configuration
- **`GameConfig.xml`** - Main runtime configuration file
  - Screen resolution and window settings
  - Graphics and performance options
  - Debug mode configuration

### Configuration Structure
```xml
<GameConfig>
    <WindowClose>false</WindowClose>
    <screenSizeX>1600</screenSizeX>
    <screenSizeY>800</screenSizeY>
    <screenCenterX>800</screenCenterX>
    <screenCenterY>400</screenCenterY>
</GameConfig>
```

## External Interfaces

### Asset Categories

#### 3D Models and Geometry
- **`Models/Cube/`** - Basic geometric primitives
  - `Cube_v.obj` - Vertex-only cube
  - `Cube_vi.obj` - Vertex + index cube
  - `Cube_vn.obj` - Vertex + normal cube
  - `Cube_vni.obj` - Vertex + normal + index cube

- **`Models/TutorialBox_Phong/`** - Phong-shaded tutorial asset
  - `Tutorial_Box.FBX` - 3D Studio Max export
  - `Tutorial_Box.obj` - Wavefront OBJ format
  - Texture maps: Diffuse, Normal, SpecGlossEmit

- **`Models/Woman/`** - Character model example
  - `Woman.obj` - Character geometry
  - `Woman_Diffuse.png` - Character textures
  - `Woman_Normal.png` - Normal mapping

#### Shader Pipeline
- **`Shaders/Default.hlsl`** - Basic rendering shader
- **`Shaders/BlinnPhong.hlsl`** - Phong lighting implementation
- **`Shaders/Bloom.hlsl`** - Post-processing bloom effect

#### Audio Assets
- **`Audio/TestSound.mp3`** - FMOD audio system testing
- FMOD integration for professional audio processing

#### Font and UI Assets
- **`Fonts/DaemonFont.png`** - Primary game font
- **`Fonts/SquirrelFixedFont.png`** - Fixed-width font for debugging
- Bitmap font rendering support

#### Test and Development Assets
- **`Images/TestUV.png`** - UV mapping verification texture

## Key Dependencies and Configuration

### Runtime Dependencies
- **FMOD Audio Engine** - Professional audio system integration
- **DirectX Graphics Pipeline** - Windows graphics API
- **V8 JavaScript Engine** - For script-driven asset loading

### Configuration Management
- **`Config/LogRotation.json`** - Logging system configuration
- **`GameConfig.xml`** - Primary runtime settings
- Asset path resolution through C++ resource management system

### Asset Loading Pipeline
```cpp
// C++ asset loading through ResourceHandle system
ResourceHandle<ModelResource> cubeModel;
ResourceHandle<TextureResource> testTexture;
```

## Data Models

### Asset Organization Structure
```
Run/Data/
├── Audio/           # FMOD audio assets
├── Config/          # Configuration files
├── Fonts/           # Bitmap fonts
├── Images/          # Textures and test images
├── Models/          # 3D geometry and materials
│   ├── Cube/        # Basic primitives
│   ├── TutorialBox_Phong/  # Phong lighting example
│   └── Woman/       # Character model
├── Scripts/         # JavaScript game logic
└── Shaders/         # HLSL rendering shaders
```

### Shader Asset Types
- **Vertex Shaders** - Geometry transformation and positioning
- **Pixel Shaders** - Lighting, texturing, and material calculations
- **Post-Processing** - Bloom, tone mapping, and visual effects

### Model Asset Formats
- **Wavefront OBJ** - Primary 3D model format
- **Autodesk FBX** - Industry-standard 3D interchange format
- **Texture Formats** - PNG, TGA for diffuse, normal, and specular maps

## Testing and Quality

### Asset Verification
- **TestUV.png** - UV coordinate mapping verification
- **Test models** - Cube primitives for basic rendering verification
- **Audio testing** - TestSound.mp3 for FMOD integration validation

### Development Assets
- Debug fonts for console and development UI
- Test textures for shader and material validation
- Progressive complexity models (Cube → TutorialBox → Character)

### Quality Assurance
- **Consistent file naming** - Clear asset identification
- **Multiple format support** - OBJ and FBX for flexibility
- **Complete material sets** - Diffuse, normal, and specular maps provided
- **Resolution standards** - Appropriate texture sizes for performance

## FAQ

### Q: How are assets loaded in the dual-language architecture?
**A**: C++ handles core asset loading through the ResourceHandle system, while JavaScript can trigger asset loading through the GameScriptInterface. The V8 integration allows JavaScript to request asset operations without direct file system access.

### Q: What shader language is used?
**A**: HLSL (High-Level Shading Language) for DirectX graphics pipeline. Shaders include vertex, pixel, and post-processing effects with modern lighting models.

### Q: How is audio handled?
**A**: FMOD professional audio engine integration. Audio assets are loaded through the FMOD system and can be triggered from both C++ and JavaScript layers.

### Q: Can assets be modified at runtime?
**A**: Yes, the hot-reload system monitors file changes. Shaders and some assets can be reloaded without application restart, supporting rapid iteration during development.

### Q: What texture formats are supported?
**A**: PNG and TGA formats are supported. The engine includes diffuse, normal, and specular mapping capabilities through the material system.

## Related File List

### Configuration Files
- **`GameConfig.xml`** - Primary runtime configuration
- **`Config/LogRotation.json`** - Logging system settings

### 3D Model Assets
- **`Models/Cube/Cube_*.obj`** - Basic geometric primitives (4 variants)
- **`Models/TutorialBox_Phong/Tutorial_Box.*`** - Complete material example
- **`Models/Woman/Woman.*`** - Character model with textures

### Shader and Graphics
- **`Shaders/Default.hlsl`** - Basic rendering pipeline
- **`Shaders/BlinnPhong.hlsl`** - Advanced lighting
- **`Shaders/Bloom.hlsl`** - Post-processing effects

### Audio and UI
- **`Audio/TestSound.mp3`** - FMOD audio testing
- **`Fonts/DaemonFont.png`** - Primary game font
- **`Fonts/SquirrelFixedFont.png`** - Debug console font

### Development Assets
- **`Images/TestUV.png`** - UV mapping verification

## Asset Integration Guidelines

### Adding New Models
1. Export in OBJ or FBX format
2. Include complete material sets (diffuse, normal, specular)
3. Follow consistent naming conventions
4. Test with both C++ and JavaScript loading paths

### Shader Development
1. Use HLSL syntax for DirectX compatibility
2. Follow existing shader structure patterns
3. Test with hot-reload for rapid iteration
4. Document shader parameters and usage

### Audio Asset Integration
1. Use compressed formats (MP3, OGG) for FMOD
2. Test audio triggering from JavaScript systems
3. Consider spatial audio and 3D positioning

## Changelog
- **2025-09-20**: Initial module documentation created with comprehensive asset pipeline analysis