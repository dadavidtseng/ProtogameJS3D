//----------------------------------------------------------------------------------------------------
// GameControlHandler.js
// KADI game control tool invocation handlers (JavaScript-only)
//----------------------------------------------------------------------------------------------------

import {hotReloadRegistry} from '../Core/HotReloadRegistry.js';

/**
 * GameControlHandler - Handles KADI tool invocations for game control
 *
 * Architecture:
 * - Purely JavaScript implementation (no C++ bridge needed)
 * - Manages spawned cubes via entity ID mapping
 * - Direct manipulation of JSGame.propGameObjects array
 * - Immediate cube removal (KISS principle)
 *
 * Responsibilities:
 * - spawn_cube: Create new Prop GameObject
 * - move_cube: Update cube.position property
 * - get_game_state: Query minimal game state
 * - remove_cube: Remove from propGameObjects array
 */
export class GameControlHandler
{
    /**
     * @param {JSGame} jsGame - Reference to JSGame instance
     */
    constructor(jsGame)
    {
        this.jsGame = jsGame;

        // Entity tracking
        this.entityIdCounter = 1;  // Simple counter: cube_001, cube_002, ...
        this.spawnedCubes = new Map();  // entityId -> Prop GameObject

        // Color palette (for color name support)
        this.colorPalette = {
            'red': {r: 255, g: 0, b: 0, a: 255},
            'green': {r: 0, g: 255, b: 0, a: 255},
            'blue': {r: 0, g: 0, b: 255, a: 255},
            'yellow': {r: 255, g: 255, b: 0, a: 255},
            'cyan': {r: 0, g: 255, b: 255, a: 255},
            'magenta': {r: 255, g: 0, b: 255, a: 255},
            'white': {r: 255, g: 255, b: 255, a: 255},
            'black': {r: 0, g: 0, b: 0, a: 255},
            'orange': {r: 255, g: 165, b: 0, a: 255},
            'purple': {r: 128, g: 0, b: 128, a: 255}
        };

        console.log('GameControlHandler: Initialized (entity counter starts at 1)');
    }

    /**
     * Main tool invocation router
     * Called by KADIGameControl when broker invokes a tool
     */
    handleToolInvoke(requestId, toolName, args)
    {
        console.log(`GameControlHandler: Tool invoked - ${toolName}`, args);

        // Parse args if it's a JSON string (C++ interface might pass JSON string)
        let parsedArgs = args;
        if (typeof args === 'string')
        {
            console.log('GameControlHandler: Parsing args from JSON string');
            try
            {
                parsedArgs = JSON.parse(args);
            }
            catch (error)
            {
                console.log('GameControlHandler: ERROR - Failed to parse args JSON:', error);
                this.sendError(requestId, `Invalid arguments: ${error.message}`);
                return;
            }
        }

        try
        {
            switch (toolName)
            {
                case 'spawn_cube':
                    this.handleSpawnCube(requestId, parsedArgs);
                    break;

                case 'move_cube':
                    this.handleMoveCube(requestId, parsedArgs);
                    break;

                case 'get_game_state':
                    this.handleGetGameState(requestId, parsedArgs);
                    break;

                case 'remove_cube':
                    this.handleRemoveCube(requestId, parsedArgs);
                    break;

                default:
                    this.sendError(requestId, `Unknown tool: ${toolName}`);
            }
        }
        catch (error)
        {
            console.log(`GameControlHandler: ERROR - Error handling ${toolName}:`, error);
            this.sendError(requestId, `Exception: ${error.message}`);
        }
    }

    /**
     * Tool: spawn_cube
     * Create a new cube at specified position with optional color
     */
    handleSpawnCube(requestId, args)
    {
        // Debug logging for argument structure
        console.log(`GameControlHandler: handleSpawnCube - args type: ${typeof args}`);
        console.log(`GameControlHandler: handleSpawnCube - args.position type: ${typeof args.position}`);
        console.log(`GameControlHandler: handleSpawnCube - args.position value: ${JSON.stringify(args.position)}`);

        // Validate position
        if (!this.validatePosition(args.position))
        {
            this.sendError(requestId, 'Invalid position: must be [x, y, z] array');
            return;
        }

        // Parse color (support both names and RGB objects)
        const color = this.parseColor(args.color);

        // Generate entity ID
        const entityId = `cube_${String(this.entityIdCounter).padStart(3, '0')}`;
        this.entityIdCounter++;

        // Create Prop GameObject (pure JavaScript!)
        const position = {
            x: args.position[0],
            y: args.position[1],
            z: args.position[2]
        };

        // Get Prop class from HotReloadRegistry (hot-reload compatible!)
        const PropClass = hotReloadRegistry.getClass('Prop');
        if (!PropClass)
        {
            this.sendError(requestId, 'Prop class not registered in HotReloadRegistry');
            return;
        }

        const cube = new PropClass(
            'cube',      // meshType
            position,    // position {x, y, z}
            'static',    // behaviorType - No automatic behavior
            color,       // color {r, g, b, a}
            1.0          // scale (default)
        );

        // Add to game's prop list
        this.jsGame.propGameObjects.push(cube);

        // Track in handler's entity map
        this.spawnedCubes.set(entityId, cube);

        console.log(`GameControlHandler: Spawned cube ${entityId} at (${position.x}, ${position.y}, ${position.z})`);

        // Send success result
        kadi.sendToolResult(requestId, JSON.stringify({
            success: true,
            entityId: entityId,
            position: [position.x, position.y, position.z],
            color: color
        }));
    }

    /**
     * Tool: move_cube
     * Move existing cube to new position
     */
    handleMoveCube(requestId, args)
    {
        // Validate entity ID
        if (!args.entityId || typeof args.entityId !== 'string')
        {
            this.sendError(requestId, 'Invalid entityId: must be string');
            return;
        }

        // Validate position
        if (!this.validatePosition(args.position))
        {
            this.sendError(requestId, 'Invalid position: must be [x, y, z] array');
            return;
        }

        // Find cube
        const cube = this.spawnedCubes.get(args.entityId);
        if (!cube)
        {
            this.sendError(requestId, `Entity not found: ${args.entityId}`);
            return;
        }

        // Move cube (direct JavaScript property update!)
        const oldPosition = {...cube.position};
        cube.position.x = args.position[0];
        cube.position.y = args.position[1];
        cube.position.z = args.position[2];

        console.log(`GameControlHandler: Moved cube ${args.entityId} from (${oldPosition.x}, ${oldPosition.y}, ${oldPosition.z}) to (${cube.position.x}, ${cube.position.y}, ${cube.position.z})`);

        // Send success result
        kadi.sendToolResult(requestId, JSON.stringify({
            success: true,
            entityId: args.entityId,
            oldPosition: [oldPosition.x, oldPosition.y, oldPosition.z],
            newPosition: [cube.position.x, cube.position.y, cube.position.z]
        }));
    }

    /**
     * Tool: get_game_state
     * Query minimal game state (user requested minimal info)
     */
    handleGetGameState(requestId, args)
    {
        // Build minimal game state
        const state = {
            gameMode: this.jsGame.gameState,  // 'ATTRACT', 'GAME', 'PAUSED'
            propCount: this.jsGame.propGameObjects.length,
            spawnedCubeCount: this.spawnedCubes.size,
            playerPosition: null
        };

        // Get player position if player exists
        if (this.jsGame.playerGameObject)
        {
            const pos = this.jsGame.playerGameObject.position;
            state.playerPosition = [pos.x, pos.y, pos.z];
        }

        console.log('GameControlHandler: Game state queried:', state);

        // Send success result
        kadi.sendToolResult(requestId, JSON.stringify({
            success: true,
            gameState: state
        }));
    }

    /**
     * Tool: remove_cube
     * Remove cube from game (immediate destruction - KISS principle)
     */
    async handleRemoveCube(requestId, args)
    {
        // Validate entity ID
        if (!args.entityId || typeof args.entityId !== 'string')
        {
            this.sendError(requestId, 'Invalid entityId: must be string');
            return;
        }

        // Find cube
        const cube = this.spawnedCubes.get(args.entityId);
        if (!cube)
        {
            this.sendError(requestId, `Entity not found: ${args.entityId}`);
            return;
        }

        // Remove from propGameObjects array
        const index = this.jsGame.propGameObjects.indexOf(cube);
        if (index !== -1)
        {
            this.jsGame.propGameObjects.splice(index, 1);
        }

        // Properly destroy GameObject and its components (especially MeshComponent → C++ entity)
        console.log(`GameControlHandler: [DEBUG] Cube details for ${args.entityId}:`);
        console.log(`GameControlHandler: [DEBUG]   - type: ${typeof cube}`);
        console.log(`GameControlHandler: [DEBUG]   - constructor: ${cube.constructor.name}`);
        console.log(`GameControlHandler: [DEBUG]   - hasDestroy: ${!!cube.destroy}`);
        console.log(`GameControlHandler: [DEBUG]   - destroyType: ${typeof cube.destroy}`);

        // Call destroy() to trigger MeshComponent.destroy() → entityAPI.destroyEntity()
        try {
            console.log(`GameControlHandler: [DEBUG] Calling cube.destroy() for ${args.entityId}...`);
            await cube.destroy();
            console.log(`GameControlHandler: [DEBUG] cube.destroy() completed for ${args.entityId}`);
        } catch (error) {
            console.log(`GameControlHandler: [ERROR] cube.destroy() failed for ${args.entityId}:`, error);
            console.log(`GameControlHandler: [ERROR] Error message: ${error.message}`);
            console.log(`GameControlHandler: [ERROR] Error stack: ${error.stack}`);
        }

        // Remove from tracking map
        this.spawnedCubes.delete(args.entityId);

        console.log(`GameControlHandler: Removed cube ${args.entityId} (${this.spawnedCubes.size} cubes remaining)`);

        // Send success result
        kadi.sendToolResult(requestId, JSON.stringify({
            success: true,
            entityId: args.entityId,
            remainingCubes: this.spawnedCubes.size
        }));
    }

    /**
     * Helper: Parse color (support both names and RGB objects)
     */
    parseColor(color)
    {
        // Default to white if not specified
        if (!color)
        {
            return {r: 255, g: 255, b: 255, a: 255};
        }

        // If string, look up in palette
        if (typeof color === 'string')
        {
            const colorLower = color.toLowerCase();
            if (this.colorPalette[colorLower])
            {
                return this.colorPalette[colorLower];
            }
            console.log(`GameControlHandler: WARNING - Unknown color name '${color}', using white`);
            return {r: 255, g: 255, b: 255, a: 255};
        }

        // If object, validate and use directly
        if (typeof color === 'object' && color.r !== undefined && color.g !== undefined && color.b !== undefined)
        {
            return {
                r: color.r,
                g: color.g,
                b: color.b,
                a: color.a !== undefined ? color.a : 255
            };
        }

        console.log('GameControlHandler: WARNING - Invalid color format, using white');
        return {r: 255, g: 255, b: 255, a: 255};
    }

    /**
     * Helper: Validate position array
     */
    validatePosition(position)
    {
        return Array.isArray(position) &&
               position.length === 3 &&
               typeof position[0] === 'number' &&
               typeof position[1] === 'number' &&
               typeof position[2] === 'number';
    }

    /**
     * Helper: Send error result to KADI broker
     */
    sendError(requestId, errorMessage)
    {
        console.log(`GameControlHandler: ERROR - ${errorMessage}`);
        kadi.sendToolResult(requestId, JSON.stringify({
            success: false,
            error: errorMessage
        }));
    }
}

// Export for hot-reload
globalThis.GameControlHandler = GameControlHandler;

console.log('GameControlHandler: Module loaded');
