//----------------------------------------------------------------------------------------------------
// BuildTools.js
// KADI tool schema definitions for build and versioning tools
//----------------------------------------------------------------------------------------------------

export const BuildTools = [
    {
        name: "get_version",
        description: "Get the current DaemonAgent version from the VERSION file (semver format).",
        inputSchema: {
            type: "object",
            properties: {},
            required: []
        }
    },
    {
        name: "load_model",
        description: "Load an OBJ model file into the game engine as a new entity. The model renders with full PCUTBN vertex data (normals preserved for lighting).",
        inputSchema: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Path to .obj file relative to Run/ directory (e.g. 'Data/Models/robot.obj')"
                },
                position: {
                    type: "array",
                    items: { type: "number" },
                    minItems: 3,
                    maxItems: 3,
                    description: "World position [x, y, z] (default: [0, 0, 0])"
                },
                scale: {
                    type: "number",
                    default: 1.0,
                    description: "Uniform scale factor (default: 1.0)"
                },
                color: {
                    type: "array",
                    items: { type: "integer", minimum: 0, maximum: 255 },
                    minItems: 3,
                    maxItems: 4,
                    description: "RGBA tint color [r, g, b, a] (default: [255, 255, 255, 255])"
                },
                textureId: {
                    type: "integer",
                    description: "Texture handle from load_texture (0 = default white)"
                }
            },
            required: ["path"]
        }
    },
    {
        name: "load_texture",
        description: "Load a texture file (PNG, TGA, JPG) and return a texture handle for use with load_model or entity.set_texture.",
        inputSchema: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Path to texture file relative to Run/ directory (e.g. 'Data/Models/TutorialBox_Phong/Tutorial_Box_Diffuse.tga')"
                }
            },
            required: ["path"]
        }
    }
];

// Export for hot-reload
globalThis.BuildTools = BuildTools;

console.log(`BuildTools: Module loaded (${BuildTools.length} tools defined)`);
