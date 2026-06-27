//----------------------------------------------------------------------------------------------------
// BuildToolHandler.js
// KADI build tool invocation handlers (async GenericCommand pipeline)
//----------------------------------------------------------------------------------------------------

import {CommandQueue} from '../Interface/CommandQueue.js';

export class BuildToolHandler
{
    constructor(commandQueue)
    {
        this.commandQueue = commandQueue;
        console.log('BuildToolHandler: Initialized (async GenericCommand mode)');
    }

    _submitCommand(type, payload)
    {
        return new Promise((resolve) =>
        {
            this.commandQueue.submit(type, payload, 'BuildToolHandler', (result) =>
            {
                resolve(result);
            });
        });
    }

    handleToolInvoke(requestId, toolName, args)
    {
        console.log(`BuildToolHandler: Tool invoked - ${toolName}`, args);

        let parsedArgs = args;
        if (typeof args === 'string')
        {
            try
            {
                parsedArgs = JSON.parse(args);
            }
            catch (error)
            {
                this.sendError(requestId, `Invalid arguments: ${error.message}`);
                return;
            }
        }

        this._routeToolAsync(requestId, toolName, parsedArgs).catch((error) =>
        {
            console.log(`BuildToolHandler: ERROR - ${toolName}: ${error.message}`);
            this.sendError(requestId, `Exception: ${error.message}`);
        });
    }

    async _routeToolAsync(requestId, toolName, parsedArgs)
    {
        switch (toolName)
        {
            case 'get_version':
                await this.handleGetVersion(requestId);
                break;
            case 'load_model':
                await this.handleLoadModel(requestId, parsedArgs);
                break;
            case 'load_texture':
                await this.handleLoadTexture(requestId, parsedArgs);
                break;
            default:
                this.sendError(requestId, `Unknown tool: ${toolName}`);
        }
    }

    async handleGetVersion(requestId)
    {
        const resultObj = await this._submitCommand('game.get_version', {});
        kadi.sendToolResult(requestId, JSON.stringify(resultObj));
    }

    async handleLoadModel(requestId, args)
    {
        if (!args.path || typeof args.path !== 'string')
        {
            this.sendError(requestId, 'Invalid path: must be non-empty string');
            return;
        }

        const payload = { path: args.path };
        if (args.position) payload.position = args.position;
        if (args.scale !== undefined) payload.scale = args.scale;
        if (args.color) payload.color = args.color;
        if (args.textureId !== undefined) payload.textureId = args.textureId;

        const resultObj = await this._submitCommand('load_model', payload);
        kadi.sendToolResult(requestId, JSON.stringify(resultObj));
    }

    async handleLoadTexture(requestId, args)
    {
        if (!args.path || typeof args.path !== 'string')
        {
            this.sendError(requestId, 'Invalid path: must be non-empty string');
            return;
        }

        const resultObj = await this._submitCommand('load_texture', { path: args.path });
        kadi.sendToolResult(requestId, JSON.stringify(resultObj));
    }

    sendError(requestId, errorMessage)
    {
        console.log(`BuildToolHandler: ERROR - ${errorMessage}`);
        kadi.sendToolResult(requestId, JSON.stringify({
            success: false,
            error: errorMessage
        }));
    }
}

// Export for hot-reload
globalThis.BuildToolHandler = BuildToolHandler;

console.log('BuildToolHandler: Module loaded');
