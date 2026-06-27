//----------------------------------------------------------------------------------------------------
// KADIGameControl.js
// KADI game control subsystem (registered with JSEngine)
//----------------------------------------------------------------------------------------------------

import {Subsystem} from '../Core/Subsystem.js';
import {GameControlHandler} from './GameControlHandler.js';
import {GameControlTools} from './GameControlTools.js';
import {DevelopmentToolHandler} from './DevelopmentToolHandler.js';
import {BuildToolHandler} from './BuildToolHandler.js';
import {CommandQueue} from '../Interface/CommandQueue.js';
import {DevelopmentTools} from './DevelopmentTools.js';
import {BuildTools} from './BuildTools.js';

/**
 * KADIGameControl - Subsystem for KADI game control integration
 *
 * Architecture:
 * - Registered as proper subsystem (Priority 11, after InputSystem)
 * - Purely reactive (no update logic needed)
 * - Integrates GameControlHandler and DevelopmentToolHandler with KADI protocol
 *
 * Responsibilities:
 * - Register game control tools and development tools with KADI
 * - Route tool invocations to appropriate handlers
 * - Manage KADI connection lifecycle
 */
export class KADIGameControl extends Subsystem
{
    /**
     * @param {JSGame} jsGame - Reference to JSGame instance
     */
    constructor(jsGame)
    {
        super('KADIGameControl', 11);  // Priority 11 (after InputSystem at 10)

        this.jsGame = jsGame;
        this.gameControlHandler = new GameControlHandler(jsGame);
        // Use CommandQueue singleton for async GenericCommand pipeline
        const commandQueue = new CommandQueue();
        this.developmentToolHandler = new DevelopmentToolHandler(commandQueue);
        this.buildToolHandler = new BuildToolHandler(commandQueue);
        this.toolsRegistered = false;
        this.connectionInitiated = false;

        console.log('KADIGameControl: Subsystem constructed (priority 11)');

        // DEFER KADI initialization until update cycle
        // This prevents constructor errors if KADI is not yet available
        this.kadiInitialized = false;
    }

    /**
     * Setup KADI connection and tool registration
     */
    setupKADIConnection()
    {
        console.log('KADIGameControl: Setting up KADI connection...');

        // Check if KADI is available
        if (typeof kadi === 'undefined')
        {
            console.log('KADIGameControl: ERROR - KADI global object not found! Is Phase 4 complete?');
            return false;
        }

        // Generate Ed25519 key pair for authentication
        console.log('KADIGameControl: Generating Ed25519 key pair...');
        try
        {
            const keyPair = kadi.generateKeyPair();
            console.log('KADIGameControl: Key pair generated successfully');

            // Connect to KADI broker (localhost:8080 from Phase 4)
            console.log('KADIGameControl: Connecting to ws://localhost:8080...');
            kadi.connect('ws://64.23.168.129:8080/kadi', keyPair.publicKey, keyPair.privateKey);
            // kadi.connect('ws://172.31.9.248:8080/kadi', keyPair.publicKey, keyPair.privateKey);
            this.connectionInitiated = true;
            console.log('KADIGameControl: Connection initiated');

            return true;
        } catch (error)
        {
            console.log('KADIGameControl: ERROR - Failed to connect:', error);
            return false;
        }
    }

    /**
     * Setup KADI tool registration and callbacks
     */
    setupKADITools()
    {
        console.log('KADIGameControl: Setting up KADI tools...');

        // Check if KADI is available
        if (typeof kadi === 'undefined')
        {
            console.log('KADIGameControl: ERROR - KADI global object not found! Is Phase 4 complete?');
            return;
        }

        // Combine all tool sets
        const allTools = [...GameControlTools, ...DevelopmentTools, ...BuildTools];

        // Register tools with KADI
        try
        {
            kadi.registerTools(JSON.stringify(allTools));
            this.toolsRegistered = true;
            console.log(`KADIGameControl: Registered ${allTools.length} tools total`);
            console.log(`  - ${GameControlTools.length} game control tools`);
            console.log(`  - ${DevelopmentTools.length} development tools (Phase 6a)`);
            console.log(`  - ${BuildTools.length} build tools`);

            // List registered tools
            console.log('KADIGameControl: Game Control Tools:');
            for (const tool of GameControlTools)
            {
                console.log(`  - ${tool.name}: ${tool.description}`);
            }

            console.log('KADIGameControl: Development Tools (Phase 6a):');
            for (const tool of DevelopmentTools)
            {
                console.log(`  - ${tool.name}: ${tool.description}`);
            }

            console.log('KADIGameControl: Build Tools:');
            for (const tool of BuildTools)
            {
                console.log(`  - ${tool.name}: ${tool.description}`);
            }
        } catch (error)
        {
            console.log('KADIGameControl: ERROR - Failed to register tools:', error);
            return;
        }

        // Wrap kadi.sendToolResult to auto-convert results to MCP content format.
        // MCP clients (Claude Desktop/Code) require {content: [{type, text}]} envelope.
        // Handlers send raw JSON — this wrapper adds the envelope transparently.
        const _origSendToolResult = kadi.sendToolResult;
        kadi.sendToolResult = (requestId, resultJson) =>
        {
            try
            {
                const parsed = JSON.parse(resultJson);
                if (!parsed.content || !Array.isArray(parsed.content))
                {
                    resultJson = JSON.stringify({ content: [{ type: 'text', text: resultJson }] });
                }
            }
            catch (e)
            {
                resultJson = JSON.stringify({ content: [{ type: 'text', text: resultJson }] });
            }
            _origSendToolResult(requestId, resultJson);
        };
        console.log('KADIGameControl: Wrapped sendToolResult for MCP compatibility');

        // Register tool invocation handler
        try
        {
            kadi.onToolInvoke((requestId, toolName, args) =>
            {
                // Route to appropriate handler based on tool name
                if (GameControlTools.some(tool => tool.name === toolName))
                {
                    this.gameControlHandler.handleToolInvoke(requestId, toolName, args);
                }
                else if (DevelopmentTools.some(tool => tool.name === toolName))
                {
                    this.developmentToolHandler.handleToolInvoke(requestId, toolName, args);
                }
                else if (BuildTools.some(tool => tool.name === toolName))
                {
                    this.buildToolHandler.handleToolInvoke(requestId, toolName, args);
                }
                else
                {
                    console.log(`KADIGameControl: ERROR - Unknown tool: ${toolName}`);
                    kadi.sendToolResult(requestId, JSON.stringify({
                        success: false,
                        error: `Unknown tool: ${toolName}`
                    }));
                }
            });
            console.log('KADIGameControl: Tool invocation handler registered');
        } catch (error)
        {
            console.log('KADIGameControl: ERROR - Failed to register tool handler:', error);
        }
    }

    /**
     * Publish game.ready event to notify external agents (e.g. agent-builder)
     * that DaemonAgent has connected and registered all tools.
     */
    publishGameReadyEvent()
    {
        try
        {
            const allTools = [...GameControlTools, ...DevelopmentTools, ...BuildTools];
            kadi.publishEvent('game.ready', JSON.stringify({
                agentName: 'Daemon Agent',
                toolCount: allTools.length,
                timestamp: Date.now()
            }));
            console.log('KADIGameControl: Published game.ready event');
        } catch (error)
        {
            console.log('KADIGameControl: WARNING - Failed to publish game.ready event:', error);
        }
    }

    /**
     * Update (lazy KADI initialization + deferred game.ready publish)
     */
    update(deltaTime)
    {
        // Lazy initialization: setup KADI connection and tools on first update
        if (!this.kadiInitialized)
        {
            // Step 1: Establish connection (if not already initiated)
            if (!this.connectionInitiated)
            {
                if (this.setupKADIConnection())
                {
                    console.log('KADIGameControl: Connection setup successful');
                }
                else
                {
                    console.log('KADIGameControl: Connection setup failed, will retry next frame');
                    return; // Retry next frame
                }
            }

            // Step 2: Set agent display name (before tool registration sends it to broker)
            kadi.setDisplayName('Daemon Agent');

            // Step 3: Register tools (after connection is established)
            this.setupKADITools();
            this.kadiInitialized = true;
            console.log('KADIGameControl: Initialization complete');

            // Step 4: Schedule game.ready event after delay (broker processes
            // register and publish concurrently, so we need to wait for
            // registration to complete before publishing)
            this.gameReadyDelayRemaining = 3.0; // seconds
        }

        // Deferred game.ready publish — count down via update loop
        // (V8 runtime has no setTimeout)
        if (this.gameReadyDelayRemaining !== undefined && this.gameReadyDelayRemaining > 0)
        {
            this.gameReadyDelayRemaining -= deltaTime;
            if (this.gameReadyDelayRemaining <= 0)
            {
                this.gameReadyDelayRemaining = undefined;
                this.publishGameReadyEvent();
            }
        }
    }

    /**
     * Render (no-op - no visual component)
     */
    render()
    {
        // No rendering needed
    }

    /**
     * Get subsystem status (for debugging)
     */
    getSystemStatus()
    {
        return {
            enabled: this.enabled,
            priority: this.priority,
            toolsRegistered: this.toolsRegistered,
            gameControlTools: GameControlTools.length,
            developmentTools: DevelopmentTools.length,
            buildTools: BuildTools.length,
            spawnedCubeCount: this.gameControlHandler.spawnedCubes.size,
            entityIdCounter: this.gameControlHandler.entityIdCounter
        };
    }
}

// Export for hot-reload
globalThis.KADIGameControl = KADIGameControl;

console.log('KADIGameControl: Subsystem module loaded');
