//----------------------------------------------------------------------------------------------------
// DevelopmentTools.js
// KADI tool schema definitions for development tools (Phase 6a)
//----------------------------------------------------------------------------------------------------

/**
 * Tool schema array for KADI registration
 * Phase 6a: File I/O and Enhanced Input Injection tools
 * Follows JSON-RPC tool specification format
 *
 * Enhanced Features:
 * - Multi-key sequence support with precise timing control
 * - Job tracking and management for key hold operations
 * - Fine-grained script modification capabilities
 */
export const DevelopmentTools = [
    {
        name: "create_script",
        description: "Create a new JavaScript file in Scripts directory with specified content",
        inputSchema: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    pattern: "^[^.].*\\.js$",
                    description: "Relative file path within Scripts directory (must end with .js, subdirectories allowed, no directory traversal)"
                },
                content: {
                    type: "string",
                    description: "JavaScript code content to write to the file"
                },
                overwrite: {
                    type: "boolean",
                    default: false,
                    description: "Whether to overwrite existing file (default: false)"
                }
            },
            required: ["filePath", "content"]
        }
    },
    {
        name: "read_script",
        description: "Read an existing JavaScript file from Scripts directory",
        inputSchema: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    pattern: "^[^.].*\\.js$",
                    description: "Relative file path within Scripts directory (must end with .js, subdirectories allowed)"
                }
            },
            required: ["filePath"]
        }
    },
    {
        name: "delete_script",
        description: "Delete a JavaScript file from Scripts directory (protected files cannot be deleted)",
        inputSchema: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    pattern: "^[^.].*\\.js$",
                    description: "Relative file path within Scripts directory (must end with .js, subdirectories allowed)"
                }
            },
            required: ["filePath"]
        }
    },
    {
        name: "input_press_keycode",
        description: "Inject a key press event with specified duration",
        inputSchema: {
            type: "object",
            properties: {
                keyCode: {
                    type: "integer",
                    minimum: 0,
                    maximum: 255,
                    description: "Windows virtual key code (0-255, e.g., 0x45 for 'E' key)"
                },
                durationMs: {
                    type: "integer",
                    minimum: 0,
                    maximum: 5000,
                    default: 50,
                    description: "Key hold duration in milliseconds (default: 50ms)"
                }
            },
            required: ["keyCode"]
        }
    },
    {
        name: "input_hold_keycode",
        description: "Inject multi-key sequence events with precise timing control for advanced input scenarios",
        inputSchema: {
            type: "object",
            properties: {
                keySequence: {
                    type: "array",
                    description: "Array of key objects with individual timing control",
                    items: {
                        type: "object",
                        properties: {
                            keyCode: {
                                type: "integer",
                                minimum: 0,
                                maximum: 255,
                                description: "Windows virtual key code (0-255, e.g., 87 for 'W', 65 for 'A')"
                            },
                            delayMs: {
                                type: "integer",
                                minimum: 0,
                                maximum: 10000,
                                default: 0,
                                description: "Delay before pressing this key (relative to sequence start, in milliseconds)"
                            },
                            durationMs: {
                                type: "integer",
                                minimum: 0,
                                maximum: 10000,
                                description: "Duration to hold this key (in milliseconds)"
                            }
                        },
                        required: ["keyCode", "durationMs"]
                    },
                    minItems: 1,
                    maxItems: 10
                }
            },
            required: ["keySequence"]
        }
    },
    {
        name: "get_keyhold_status",
        description: "Get the status of a key hold job by its job ID",
        inputSchema: {
            type: "object",
            properties: {
                jobId: {
                    type: "integer",
                    minimum: 1,
                    description: "Job ID returned from hold_keycode tool"
                }
            },
            required: ["jobId"]
        }
    },
    {
        name: "cancel_keyhold",
        description: "Cancel an active key hold job by its job ID",
        inputSchema: {
            type: "object",
            properties: {
                jobId: {
                    type: "integer",
                    minimum: 1,
                    description: "Job ID of the key hold to cancel"
                }
            },
            required: ["jobId"]
        }
    },
    {
        name: "list_active_keyholds",
        description: "List all currently active key hold jobs with their status",
        inputSchema: {
            type: "object",
            properties: {},
            required: []
        }
    },
    {
        name: "modify_script",
        description: "Fine-grained modification of JavaScript files with 5 operations: add_line, remove_line, add_function, remove_function, replace_text",
        inputSchema: {
            type: "object",
            properties: {
                filePath: {
                    type: "string",
                    pattern: "^[^.].*\\.js$",
                    description: "Relative file path within Scripts directory (must end with .js, subdirectories allowed)"
                },
                operation: {
                    type: "string",
                    enum: ["add_line", "remove_line", "add_function", "remove_function", "replace_text"],
                    description: "Type of modification operation to perform"
                },
                params: {
                    type: "object",
                    description: "Operation-specific parameters (varies by operation type)"
                }
            },
            required: ["filePath", "operation", "params"]
        }
    },
    {
        name: "capture_screenshot",
        description: "Capture a screenshot of the current game window and save it as PNG or JPEG",
        inputSchema: {
            type: "object",
            properties: {
                format: {
                    type: "string",
                    enum: ["png", "jpeg"],
                    default: "png",
                    description: "Image format (default: png)"
                },
                quality: {
                    type: "integer",
                    minimum: 1,
                    maximum: 100,
                    default: 90,
                    description: "JPEG quality 1-100 (only used for jpeg format, default: 90)"
                },
                filename: {
                    type: "string",
                    description: "Optional filename (without extension). If omitted, auto-generates timestamp-based name"
                }
            },
            required: []
        }
    },

    /**
     * modify_script Operation Parameter Schemas
 *
 * add_line params:
 * {
 *   lineNumber: number (1-indexed),
 *   content: string (line content, can include \n for multi-line),
 *   position: "before" | "after" | "replace"
 * }
 *
 * remove_line params (Mode 1 - By Line Number):
 * {
 *   lineNumber: number (1-indexed),
 *   count?: number (default: 1)
 * }
 *
 * remove_line params (Mode 2 - By Pattern):
 * {
 *   pattern: string (text to match),
 *   maxMatches?: number | null (null = all matches)
 * }
 *
 * add_function params:
 * {
 *   functionCode: string (complete function definition),
 *   insertionPoint: "end_of_file" | "end_of_class" | "before_function:name" | "after_function:name",
 *   className?: string (required if insertionPoint is "end_of_class")
 * }
 *
 * remove_function params:
 * {
 *   functionName: string (name of function to remove),
 *   className?: string (optional: class containing the method)
 * }
 *
 * replace_text params:
 * {
 *   search: string (text or regex pattern),
 *   replace: string (replacement text),
 *   isRegex?: boolean (default: false),
 *   maxReplacements?: number | null (null = all occurrences)
 * }
 */

/**
 * Common Virtual Key Code Reference (for KADI broker documentation)
 *
 * Common Keys:
 * - A-Z: 0x41-0x5A (65-90)
 * - 0-9: 0x30-0x39 (48-57)
 * - F1-F12: 0x70-0x7B (112-123)
 * - Enter: 0x0D (13)
 * - Escape: 0x1B (27)
 * - Space: 0x20 (32)
 * - Arrow Keys: Left=0x25, Up=0x26, Right=0x27, Down=0x28
 *
 * Complete reference: https://learn.microsoft.com/en-us/windows/win32/inputdev/virtual-key-codes
 */

    {
        name: "validate_script",
        description: "Parse JavaScript source code via V8 without executing it. Returns syntax errors with line and column numbers. Use this to check code correctness before deploying scripts.",
        inputSchema: {
            type: "object",
            properties: {
                source: {
                    type: "string",
                    description: "JavaScript source code to validate"
                },
                name: {
                    type: "string",
                    default: "validate",
                    description: "Optional script name for error messages"
                }
            },
            required: ["source"]
        }
    },
    {
        name: "run_script_test",
        description: "Execute JavaScript in a sandboxed V8 context with timeout. The sandbox has no access to game state — only console.log/warn/error are available. Returns success/failure, captured console output, and any errors.",
        inputSchema: {
            type: "object",
            properties: {
                source: {
                    type: "string",
                    description: "JavaScript source code to execute in sandbox"
                },
                name: {
                    type: "string",
                    default: "test",
                    description: "Optional script name for error messages"
                },
                timeout: {
                    type: "integer",
                    minimum: 100,
                    maximum: 30000,
                    default: 10000,
                    description: "Execution timeout in milliseconds (default: 10000)"
                }
            },
            required: ["source"]
        }
    },
    {
        name: "get_entity_list",
        description: "Enumerate all active entities in the game scene with their ID, mesh type, position, orientation, scale, color, and camera type. Reads from the C++ EntityStateBuffer (authoritative render state).",
        inputSchema: {
            type: "object",
            properties: {},
            required: []
        }
    },
    {
        name: "get_engine_metrics",
        description: "Get current engine performance metrics: FPS, entity count, process memory usage (MB), and total frame count.",
        inputSchema: {
            type: "object",
            properties: {},
            required: []
        }
    },
    {
        name: "list_scripts",
        description: "List all loaded JavaScript scripts with their file path, display name, and active status. Returns scripts currently watched by the hot-reload system.",
        inputSchema: {
            type: "object",
            properties: {},
            required: []
        }
    }
];

// Export for hot-reload
globalThis.DevelopmentTools = DevelopmentTools;

console.log(`DevelopmentTools: Module loaded (${DevelopmentTools.length} tools defined)`);
