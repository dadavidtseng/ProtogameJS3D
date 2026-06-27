//----------------------------------------------------------------------------------------------------
// GameControlTools.js
// KADI tool schema definitions for game control
//----------------------------------------------------------------------------------------------------

/**
 * Tool schema array for KADI registration
 * Follows JSON-RPC tool specification format
 */
export const GameControlTools = [
    {
        name: "spawn_cube",
        description: "Create a new cube at specified position with optional color",
        inputSchema: {
            type: "object",
            properties: {
                position: {
                    type: "array",
                    items: { type: "number" },
                    minItems: 3,
                    maxItems: 3,
                    description: "Position [x, y, z] in world coordinates"
                },
                color: {
                    oneOf: [
                        {
                            type: "string",
                            enum: ["red", "green", "blue", "yellow", "cyan", "magenta", "white", "black", "orange", "purple"],
                            description: "Color name from predefined palette"
                        },
                        {
                            type: "object",
                            properties: {
                                r: { type: "number", minimum: 0, maximum: 255 },
                                g: { type: "number", minimum: 0, maximum: 255 },
                                b: { type: "number", minimum: 0, maximum: 255 },
                                a: { type: "number", minimum: 0, maximum: 255 }
                            },
                            required: ["r", "g", "b"],
                            description: "RGB color object (a is optional, defaults to 255)"
                        }
                    ],
                    description: "Color specification (name or RGB object)"
                }
            },
            required: ["position"]
        }
    },
    {
        name: "move_cube",
        description: "Move an existing cube to a new position",
        inputSchema: {
            type: "object",
            properties: {
                entityId: {
                    type: "string",
                    pattern: "^cube_\\d{3}$",
                    description: "Entity ID (format: cube_001, cube_002, etc.)"
                },
                position: {
                    type: "array",
                    items: { type: "number" },
                    minItems: 3,
                    maxItems: 3,
                    description: "New position [x, y, z] in world coordinates"
                }
            },
            required: ["entityId", "position"]
        }
    },
    {
        name: "get_game_state",
        description: "Query current game state (minimal information)",
        inputSchema: {
            type: "object",
            properties: {},
            description: "No parameters required"
        }
    },
    {
        name: "remove_cube",
        description: "Remove a cube from the game",
        inputSchema: {
            type: "object",
            properties: {
                entityId: {
                    type: "string",
                    pattern: "^cube_\\d{3}$",
                    description: "Entity ID of cube to remove"
                }
            },
            required: ["entityId"]
        }
    }
];

// Export for hot-reload
globalThis.GameControlTools = GameControlTools;

console.log(`GameControlTools: Module loaded (${GameControlTools.length} tools defined)`);
