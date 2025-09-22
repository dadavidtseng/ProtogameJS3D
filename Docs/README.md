# FirstV8 - Dual-Language Game Engine with V8 JavaScript Integration

**Part of the "First" Series** - Advanced Game Development Research Projects

A sophisticated C++ game engine demonstrating cutting-edge dual-language architecture through seamless integration of **V8 JavaScript Engine** and **Chrome DevTools** with the **DaemonEngine** foundation. This project represents the next evolution in modern game development methodologies, enabling unprecedented flexibility between performance-critical C++ systems and rapid JavaScript prototyping.

## 🚀 Project Overview

FirstV8 is a groundbreaking research project that bridges the gap between traditional C++ game engine performance and modern JavaScript development workflows. As part of the "First" series of experimental game development frameworks, this project demonstrates how to achieve enterprise-grade dual-language architecture while maintaining the performance characteristics required for production game development.

### 🎯 Core Innovation

- **Dual-Language Architecture**: C++ for engine performance, JavaScript for game logic flexibility
- **Real-Time Hot Reloading**: JavaScript changes without C++ recompilation
- **Chrome DevTools Integration**: Full debugging support for JavaScript game logic
- **DaemonEngine Foundation**: Built upon proven engine architecture patterns
- **Academic Research Quality**: Suitable for computer science research and education

## ✨ Key Features

### 🔥 V8 JavaScript Integration
- **Google V8 Engine v13.0.245.25**: Latest JavaScript runtime with optimal performance
- **Bidirectional Communication**: Seamless C++ ↔ JavaScript interoperability
- **Chrome DevTools Support**: Professional debugging environment through ChromeDevToolsServer
- **Memory Management**: RAII patterns with automatic JavaScript garbage collection
- **Error Isolation**: JavaScript errors don't crash the C++ engine

### 🏗️ Engine Architecture
- **Modular Subsystem Design**: Core, Math, Renderer, Audio, Input, Resource, Network, Scripting
- **Entity-Component System**: Flexible game object architecture with dual-language support
- **Hot-Reload Development**: FileWatcher and ScriptReloader for rapid iteration
- **Production-Ready Build System**: Enterprise-grade MSBuild configuration
- **Cross-Platform Support**: Windows x64 with comprehensive compatibility

### 🛠️ Development Experience
- **Visual Studio 2022 Integration**: Complete debugging support for C++ and JavaScript
- **Academic Documentation**: Research-grade documentation and architectural specifications
- **Professional Build Pipeline**: Automated V8 runtime deployment and asset management
- **Industry Standards**: SOLID principles, modern C++20, and professional coding practices

## 🏭 Architecture Overview

### Dual-Language Integration Flow
```
Windows Application Entry
├── DaemonEngine Foundation
│   ├── Core Subsystems (C++)
│   ├── Rendering Pipeline (C++)
│   └── Resource Management (C++)
├── V8 JavaScript Engine
│   ├── Game Logic Layer (JS)
│   ├── Chrome DevTools (Debug)
│   └── Hot-Reload System (JS)
└── GameScriptInterface
    ├── C++ → JavaScript Bindings
    └── JavaScript → C++ Callbacks
```

### Runtime Execution Model
```
C++ Main Loop:
├── BeginFrame()
├── Update() ──→ V8::Execute(JSEngine.update()) ──→ JSGame.update()
├── Render() ──→ V8::Execute(JSEngine.render()) ──→ JSGame.render()
└── EndFrame()
```

## 📁 Project Structure

```
FirstV8/
├── Code/
│   └── Game/                          # Game Application (.exe)
│       ├── Game.cpp/hpp               # Main game class and state management
│       ├── Entity.cpp/hpp             # Base entity system
│       ├── Player.cpp/hpp             # Player entity with input handling
│       ├── Prop.cpp/hpp               # Interactive game objects
│       ├── Framework/                 # Application infrastructure
│       │   ├── App.cpp/hpp            # Application lifecycle and main loop
│       │   ├── GameScriptInterface.*  # C++ ↔ JavaScript bindings
│       │   ├── FileWatcher.*          # Hot-reload file monitoring
│       │   ├── ScriptReloader.*       # JavaScript hot-reload system
│       │   └── GameCommon.hpp         # Shared definitions and globals
│       ├── Subsystem/                 # Game-specific subsystems
│       │   └── Light/                 # Lighting subsystem example
│       └── EngineBuildPreferences.hpp # Engine compilation configuration
├── Run/                               # Execution Environment
│   ├── Data/                          # Game Assets
│   │   ├── Scripts/                   # JavaScript game logic
│   │   │   ├── JSEngine.js            # JavaScript engine framework
│   │   │   ├── JSGame.js              # Game logic implementation
│   │   │   └── test_scripts.js        # Development and testing scripts
│   │   ├── Shaders/                   # HLSL rendering shaders
│   │   ├── Models/                    # 3D assets (.obj, .fbx)
│   │   ├── Textures/                  # Image assets and materials
│   │   ├── Audio/                     # FMOD audio assets
│   │   └── GameConfig.xml             # Runtime configuration
│   ├── FirstV8_Debug_x64.exe          # Debug application build
│   ├── FirstV8_Release_x64.exe        # Release application build
│   └── *.dll                          # V8 and FMOD runtime libraries
├── Engine/                            # DaemonEngine Integration (External)
│   └── Code/Engine/                   # Engine static library
│       ├── Core/                      # Engine foundation systems
│       ├── Scripting/                 # V8Subsystem and Chrome DevTools
│       ├── Renderer/                  # DirectX graphics pipeline
│       ├── Audio/                     # FMOD audio integration
│       └── [Additional Subsystems]    # Math, Input, Resource, Network
├── Docs/                              # Project Documentation
│   ├── README.md                      # This file
│   └── [Academic Papers]              # Research documentation
└── FirstV8.sln                       # Visual Studio 2022 Solution
```

## 🚀 Getting Started

### Prerequisites

- **Visual Studio 2022** with C++ development workload
- **Windows 10/11 (x64)** - Primary development platform
- **Git** with submodule support
- **NuGet Package Manager** (included with Visual Studio)

### Quick Start

1. **Clone the Repository:**
   ```bash
   git clone --recursive https://github.com/yourusername/FirstV8.git
   cd FirstV8
   ```

2. **Initialize DaemonEngine Submodule:**
   ```bash
   git submodule update --init --recursive
   ```

3. **Open Visual Studio Solution:**
   ```bash
   start FirstV8.sln
   ```

4. **Restore NuGet Packages:**
   - Visual Studio will automatically restore V8 packages
   - Manual restore: `Build → Restore NuGet Packages`

5. **Build the Solution:**
   - Select `Debug|x64` or `Release|x64` configuration
   - `Build → Build Solution` (Ctrl+Shift+B)

6. **Run the Application:**
   ```bash
   cd Run
   FirstV8_Debug_x64.exe
   ```

### Development Workflow

1. **C++ Engine Development**: Modify files in `Code/Game/` and `Engine/`
2. **JavaScript Game Logic**: Edit files in `Run/Data/Scripts/`
3. **Hot Reloading**: JavaScript changes apply automatically without rebuild
4. **Debugging**: Use Visual Studio for C++ and Chrome DevTools for JavaScript
5. **Asset Management**: Add resources to `Run/Data/` subdirectories

## 🔧 Configuration

### Game Configuration (`Run/Data/GameConfig.xml`)
```xml
<GameConfig>
    <WindowClose>false</WindowClose>
    <screenSizeX>1600</screenSizeX>
    <screenSizeY>900</screenSizeY>
    <screenCenterX>800</screenCenterX>
    <screenCenterY>450</screenCenterY>
    <enableVSync>true</enableVSync>
    <debugMode>true</debugMode>
</GameConfig>
```

### V8 Engine Configuration
- **Chrome DevTools Port**: 9222 (configurable)
- **JavaScript Runtime**: V8 v13.0.245.25
- **Memory Management**: Automatic garbage collection with RAII cleanup
- **Error Handling**: Non-fatal JavaScript error reporting

## 🎮 JavaScript Game Development

### Core JavaScript APIs

```javascript
// Game lifecycle callbacks
function update(deltaTime) {
    // Game logic implementation
    player.update(deltaTime);
    entities.forEach(entity => entity.update(deltaTime));
}

function render() {
    // Rendering commands
    renderer.clear();
    scene.render();
    ui.render();
}

// C++ binding examples
createEntity("Player", {x: 0, y: 0, z: 0});
playSound("footstep.wav");
setLightColor(255, 255, 255);
```

### Hot Reload Development

1. Edit JavaScript files in `Run/Data/Scripts/`
2. Save changes (Ctrl+S)
3. FileWatcher automatically detects modifications
4. ScriptReloader recompiles and reloads JavaScript
5. Changes take effect immediately without restart

## 🧪 "First" Series Context

FirstV8 is part of the **"First" series** - a collection of experimental game development projects exploring cutting-edge technologies:

- **FirstV8** (This Project): V8 JavaScript integration with DaemonEngine
- **FirstVulkan** (Future): Modern Vulkan graphics API exploration
- **FirstML** (Future): Machine learning integration for game AI
- **FirstVR** (Future): Virtual reality development frameworks

Each project in the "First" series pushes the boundaries of conventional game development, serving as research vehicles for next-generation game engine architecture and development methodologies.

## 🔬 Research Applications

### Academic Use Cases
- **Computer Science Education**: Modern game engine architecture patterns
- **Software Engineering Research**: Dual-language application development
- **Programming Language Integration**: Performance analysis of C++/JavaScript interop
- **Real-Time Systems**: Development workflow optimization and hot-reloading
- **Human-Computer Interaction**: Rapid prototyping methodologies

### Research Contributions
1. **Novel Dual-Language Integration**: Performance-critical C++ with flexible JavaScript
2. **Real-Time Hot-Reloading**: Advanced script reloading without application restart
3. **Chrome DevTools Integration**: Professional JavaScript debugging in game engines
4. **Academic-Quality Codebase**: Research-grade documentation and architecture
5. **DaemonEngine Integration**: Proven engine foundation with modern scripting

## 📦 Dependencies

### Core Technologies
- **Google V8 JavaScript Engine**: v13.0.245.25 (Apache 2.0 License)
- **DaemonEngine**: Custom game engine foundation (External submodule)
- **FMOD Audio Engine**: Professional audio system (Commercial license)
- **DirectX Graphics API**: Windows graphics pipeline
- **Microsoft Visual C++ 2022**: C++20 compiler and runtime

### NuGet Packages
- `v8-v143-x64`: V8 engine headers and libraries
- `v8.redist-v143-x64`: V8 runtime redistribution files

## 🤝 Contributing

### Development Guidelines
1. **Follow SOLID Principles**: Maintain clean architecture patterns
2. **C++20 Standards**: Use modern C++ features with full conformance
3. **Academic Quality**: Document code for research and educational use
4. **Dual-Language Thinking**: Consider both C++ performance and JavaScript flexibility
5. **Professional Standards**: Industry-grade code quality and documentation

### Contribution Process
1. Fork the repository and create a feature branch
2. Implement changes following project coding standards
3. Test in both Debug and Release configurations
4. Verify JavaScript hot-reloading functionality
5. Update documentation and academic specifications
6. Submit pull request with detailed description

## 📄 License

This project is licensed under the **MIT License with Academic Research Clause**.

See the [LICENSE](../LICENSE) file for complete terms. Academic and research use must provide appropriate citation and acknowledgment of the original work.

## 🔗 Related Projects

- **DaemonEngine**: [Custom Game Engine Foundation](https://github.com/dadavidtseng/Engine)
- **Google V8**: [JavaScript Engine](https://v8.dev/)
- **Chrome DevTools**: [Developer Tools](https://developer.chrome.com/docs/devtools/)
- **FMOD**: [Audio Engine](https://www.fmod.com/)

## 🙏 Acknowledgments

- **DaemonEngine Team**: Foundation engine architecture and systems
- **Google V8 Team**: JavaScript engine technology and Chrome DevTools integration
- **Firelight Technologies**: FMOD professional audio engine
- **Microsoft**: Visual Studio development environment and C++20 compiler
- **Academic Research Community**: Computer science education and research support
- **Open Source Community**: Inspiration and collaborative development practices

---

## 📊 Project Status

- **Version**: 1.0.0-alpha
- **Development Status**: Active Research Project
- **Platforms**: Windows x64
- **Build Status**: ✅ Passing (Debug/Release)
- **Documentation**: 📚 Academic Grade
- **Research Quality**: 🎓 Thesis-Level

**Built with passion for advancing game development research and education** 🎮✨

---

*Part of the "First" Series - Exploring the Future of Game Development*