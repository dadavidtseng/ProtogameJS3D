//----------------------------------------------------------------------------------------------------
// DevelopmentToolHandler.js
// KADI development tool invocation handlers (Phase 6a)
// Migrated to async GenericCommand pipeline (no direct C++ bridge)
//----------------------------------------------------------------------------------------------------

import {CommandQueue} from '../Interface/CommandQueue.js';

/**
 * DevelopmentToolHandler - Handles KADI tool invocations for development tools
 *
 * Architecture:
 * - Uses CommandQueue (GenericCommand pipeline) for all C++ operations
 * - All tool handlers are async (Promise-based callbacks from C++)
 * - No direct C++ bridge dependency (decoupled via command types)
 *
 * Command Types Used:
 * - game.create_script_file  → Create .js file
 * - game.read_script_file    → Read .js file
 * - game.delete_script_file  → Delete .js file
 * - game.inject_key_press    → Single key press
 * - game.inject_key_hold     → Multi-key sequence
 * - game.get_key_hold_status → Query key hold job
 * - game.cancel_key_hold     → Cancel key hold job
 * - game.list_active_key_holds → List active jobs
 * - game.capture_screenshot    → Capture game window screenshot
 */
export class DevelopmentToolHandler
{
    /**
     * @param {CommandQueue} commandQueue - CommandQueue instance for GenericCommand pipeline
     */
    constructor(commandQueue)
    {
        this.commandQueue = commandQueue;

        console.log('DevelopmentToolHandler: Initialized (async GenericCommand mode)');
    }

    /**
     * Submit a command and return a Promise for the result
     * @param {string} type - Command type (e.g. 'game.read_script_file')
     * @param {Object} payload - Command payload
     * @returns {Promise<Object>} Resolves with the callback result
     */
    _submitCommand(type, payload)
    {
        return new Promise((resolve) =>
        {
            this.commandQueue.submit(type, payload, 'DevelopmentToolHandler', (result) =>
            {
                resolve(result);
            });
        });
    }

    /**
     * Main tool invocation router
     * Called by KADIGameControl when broker invokes a tool
     */
    handleToolInvoke(requestId, toolName, args)
    {
        console.log(`DevelopmentToolHandler: Tool invoked - ${toolName}`, args);

        // Parse args if it's a JSON string
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

        // Route to async handler — catch rejections
        this._routeToolAsync(requestId, toolName, parsedArgs).catch((error) =>
        {
            console.log(`DevelopmentToolHandler: ERROR - Error handling ${toolName}:`, error);
            this.sendError(requestId, `Exception: ${error.message}`);
        });
    }

    /**
     * Async router for tool invocations
     */
    async _routeToolAsync(requestId, toolName, parsedArgs)
    {
        switch (toolName)
        {
            case 'create_script':
                await this.handleCreateScript(requestId, parsedArgs);
                break;
            case 'read_script':
                await this.handleReadScript(requestId, parsedArgs);
                break;
            case 'delete_script':
                await this.handleDeleteScript(requestId, parsedArgs);
                break;
            case 'input_press_keycode':
                await this.handlePressKeycode(requestId, parsedArgs);
                break;
            case 'input_hold_keycode':
                await this.handleHoldKeycode(requestId, parsedArgs);
                break;
            case 'get_keyhold_status':
                await this.handleGetKeyHoldStatus(requestId, parsedArgs);
                break;
            case 'cancel_keyhold':
                await this.handleCancelKeyHold(requestId, parsedArgs);
                break;
            case 'list_active_keyholds':
                await this.handleListActiveKeyHolds(requestId, parsedArgs);
                break;
            case 'modify_script':
                await this.handleModifyScript(requestId, parsedArgs);
                break;
            case 'capture_screenshot':
                await this.handleCaptureScreenshot(requestId, parsedArgs);
                break;
            case 'validate_script':
                await this.handleValidateScript(requestId, parsedArgs);
                break;
            case 'run_script_test':
                await this.handleRunScriptTest(requestId, parsedArgs);
                break;
            case 'get_entity_list':
                await this.handleGetEntityList(requestId);
                break;
            case 'get_engine_metrics':
                await this.handleGetEngineMetrics(requestId);
                break;
            case 'list_scripts':
                await this.handleListScripts(requestId);
                break;
            default:
                this.sendError(requestId, `Unknown tool: ${toolName}`);
        }
    }

    // ==========================================
    // Tool Handlers (all async)
    // ==========================================

    /**
     * Tool: create_script
     */
    async handleCreateScript(requestId, args)
    {
        if (!args.filePath || typeof args.filePath !== 'string')
        {
            this.sendError(requestId, 'Invalid filePath: must be string');
            return;
        }
        if (!args.content || typeof args.content !== 'string')
        {
            this.sendError(requestId, 'Invalid content: must be string');
            return;
        }

        const overwrite = args.overwrite !== undefined ? args.overwrite : false;

        const resultObj = await this._submitCommand('game.create_script_file', {
            filePath: args.filePath,
            content: args.content,
            overwrite: overwrite
        });

        if (resultObj.success)
        {
            console.log(`DevelopmentToolHandler: Script created successfully - ${args.filePath}`);
            kadi.sendToolResult(requestId, JSON.stringify({
                success: true,
                filePath: resultObj.filePath,
                bytesWritten: resultObj.bytesWritten
            }));
        }
        else
        {
            this.sendError(requestId, resultObj.error || 'Unknown error');
        }
    }

    /**
     * Tool: read_script
     */
    async handleReadScript(requestId, args)
    {
        if (!args.filePath || typeof args.filePath !== 'string')
        {
            this.sendError(requestId, 'Invalid filePath: must be string');
            return;
        }

        const resultObj = await this._submitCommand('game.read_script_file', {
            filePath: args.filePath
        });

        if (resultObj.success)
        {
            console.log(`DevelopmentToolHandler: Script read successfully - ${args.filePath} (${resultObj.lineCount} lines, ${resultObj.byteSize} bytes)`);
            kadi.sendToolResult(requestId, JSON.stringify({
                success: true,
                filePath: resultObj.filePath,
                content: resultObj.content,
                lineCount: resultObj.lineCount,
                byteSize: resultObj.byteSize
            }));
        }
        else
        {
            this.sendError(requestId, resultObj.error || 'Unknown error');
        }
    }

    /**
     * Tool: delete_script
     */
    async handleDeleteScript(requestId, args)
    {
        if (!args.filePath || typeof args.filePath !== 'string')
        {
            this.sendError(requestId, 'Invalid filePath: must be string');
            return;
        }

        const resultObj = await this._submitCommand('game.delete_script_file', {
            filePath: args.filePath
        });

        if (resultObj.success)
        {
            console.log(`DevelopmentToolHandler: Script deletion completed - ${args.filePath} (existed: ${resultObj.existed})`);
            kadi.sendToolResult(requestId, JSON.stringify({
                success: true,
                filePath: resultObj.filePath,
                existed: resultObj.existed
            }));
        }
        else
        {
            this.sendError(requestId, resultObj.error || 'Unknown error');
        }
    }

    /**
     * Tool: press_keycode
     */
    async handlePressKeycode(requestId, args)
    {
        if (typeof args.keyCode !== 'number' || args.keyCode < 0 || args.keyCode > 255)
        {
            this.sendError(requestId, 'Invalid keyCode: must be number 0-255');
            return;
        }

        const durationMs = args.durationMs !== undefined ? args.durationMs : 50;
        if (typeof durationMs !== 'number' || durationMs < 0)
        {
            this.sendError(requestId, 'Invalid durationMs: must be number >= 0');
            return;
        }

        const resultObj = await this._submitCommand('game.inject_key_press', {
            keyCode: args.keyCode,
            durationMs: durationMs
        });

        if (resultObj.success)
        {
            console.log(`DevelopmentToolHandler: Key press injected - keyCode=${args.keyCode}, duration=${durationMs}ms`);
            kadi.sendToolResult(requestId, JSON.stringify({
                success: true,
                keyCode: resultObj.keyCode,
                durationMs: resultObj.durationMs
            }));
        }
        else
        {
            this.sendError(requestId, resultObj.error || 'Unknown error');
        }
    }

    /**
     * Tool: hold_keycode
     */
    async handleHoldKeycode(requestId, args)
    {
        if (!args.keySequence || !Array.isArray(args.keySequence))
        {
            this.sendError(requestId, 'Invalid keySequence: must be array of key objects');
            return;
        }
        if (args.keySequence.length === 0)
        {
            this.sendError(requestId, 'Invalid keySequence: cannot be empty');
            return;
        }

        // Validate each key in the sequence
        for (let i = 0; i < args.keySequence.length; i++)
        {
            const key = args.keySequence[i];
            if (typeof key.keyCode !== 'number' || key.keyCode < 0 || key.keyCode > 255)
            {
                this.sendError(requestId, `Invalid keyCode in keySequence[${i}]: must be number 0-255`);
                return;
            }
            if (key.delayMs !== undefined && (typeof key.delayMs !== 'number' || key.delayMs < 0))
            {
                this.sendError(requestId, `Invalid delayMs in keySequence[${i}]: must be number >= 0`);
                return;
            }
            if (typeof key.durationMs !== 'number' || key.durationMs < 0)
            {
                this.sendError(requestId, `Invalid durationMs in keySequence[${i}]: must be number >= 0`);
                return;
            }
        }

        // C++ handler expects the full args as JSON (keySequence + optional fields)
        const resultObj = await this._submitCommand('game.inject_key_hold', args);

        if (resultObj.success)
        {
            console.log(`DevelopmentToolHandler: Key sequence injected - ${args.keySequence.length} keys, primaryJobId=${resultObj.primaryJobId}`);
            kadi.sendToolResult(requestId, JSON.stringify({
                success: true,
                primaryJobId: resultObj.primaryJobId,
                keyCount: resultObj.keyCount,
                keySequence: args.keySequence.map(key => ({
                    keyCode: key.keyCode,
                    delayMs: key.delayMs || 0,
                    durationMs: key.durationMs
                }))
            }));
        }
        else
        {
            this.sendError(requestId, resultObj.error || 'Unknown error');
        }
    }

    /**
     * Tool: get_keyhold_status
     */
    async handleGetKeyHoldStatus(requestId, args)
    {
        if (typeof args.jobId !== 'number' || args.jobId < 1)
        {
            this.sendError(requestId, 'Invalid jobId: must be number >= 1');
            return;
        }

        const resultObj = await this._submitCommand('game.get_key_hold_status', {
            jobId: args.jobId
        });

        if (resultObj.success)
        {
            console.log(`DevelopmentToolHandler: Got key hold status - jobId=${args.jobId}, status=${resultObj.status}`);
            kadi.sendToolResult(requestId, JSON.stringify(resultObj));
        }
        else
        {
            this.sendError(requestId, resultObj.error || 'Unknown error');
        }
    }

    /**
     * Tool: cancel_keyhold
     */
    async handleCancelKeyHold(requestId, args)
    {
        if (typeof args.jobId !== 'number' || args.jobId < 1)
        {
            this.sendError(requestId, 'Invalid jobId: must be number >= 1');
            return;
        }

        const resultObj = await this._submitCommand('game.cancel_key_hold', {
            jobId: args.jobId
        });

        if (resultObj.success)
        {
            console.log(`DevelopmentToolHandler: Cancelled key hold - jobId=${args.jobId}, cancelled=${resultObj.cancelled}`);
            kadi.sendToolResult(requestId, JSON.stringify(resultObj));
        }
        else
        {
            this.sendError(requestId, resultObj.error || 'Unknown error');
        }
    }

    /**
     * Tool: list_active_keyholds
     */
    async handleListActiveKeyHolds(requestId, args)
    {
        const resultObj = await this._submitCommand('game.list_active_key_holds', {});

        if (resultObj.success)
        {
            console.log(`DevelopmentToolHandler: Listed active key holds - count=${resultObj.count}`);
            kadi.sendToolResult(requestId, JSON.stringify(resultObj));
        }
        else
        {
            this.sendError(requestId, resultObj.error || 'Unknown error');
        }
    }

    // ==========================================
    // Screenshot Tool (async)
    // ==========================================

    /**
     * Tool: capture_screenshot
     * Captures the current game window as PNG or JPEG
     */
    async handleCaptureScreenshot(requestId, args)
    {
        const format = args.format || 'png';
        if (!['png', 'jpeg'].includes(format))
        {
            this.sendError(requestId, 'Invalid format: must be "png" or "jpeg"');
            return;
        }

        const quality = args.quality !== undefined ? args.quality : 90;
        if (typeof quality !== 'number' || quality < 1 || quality > 100)
        {
            this.sendError(requestId, 'Invalid quality: must be number 1-100');
            return;
        }

        const payload = { format, quality };
        if (args.filename && typeof args.filename === 'string')
        {
            payload.filename = args.filename;
        }

        const resultObj = await this._submitCommand('game.capture_screenshot', payload);

        if (resultObj.success)
        {
            console.log(`DevelopmentToolHandler: Screenshot captured - ${resultObj.filePath}`);

            // Build MCP-compatible CallToolResult with content array
            // The broker is a dumb pipe — it passes this through to MCP clients unchanged
            const content = [];

            // Include image as MCP image content (base64)
            if (resultObj.imageData)
            {
                content.push({
                    type: 'image',
                    data: resultObj.imageData,
                    mimeType: resultObj.mimeType || 'image/png'
                });
            }

            // Include metadata as text content
            content.push({
                type: 'text',
                text: JSON.stringify({
                    filePath: resultObj.filePath,
                    format: resultObj.format,
                    fileSize: resultObj.fileSize
                })
            });

            kadi.sendToolResult(requestId, JSON.stringify({ content }));
        }
        else
        {
            this.sendError(requestId, resultObj.error || 'Screenshot capture failed');
        }
    }

    // ==========================================
    // modify_script Tool (async read-modify-write)
    // ==========================================

    /**
     * Tool: modify_script
     * Fine-grained modification of existing JavaScript files
     */
    async handleModifyScript(requestId, args)
    {
        if (!args.filePath || typeof args.filePath !== 'string')
        {
            this.sendError(requestId, 'Invalid filePath: must be string');
            return;
        }
        if (!args.operation || typeof args.operation !== 'string')
        {
            this.sendError(requestId, 'Invalid operation: must be string');
            return;
        }
        if (!args.params || typeof args.params !== 'object')
        {
            this.sendError(requestId, 'Invalid params: must be object');
            return;
        }

        try
        {
            let result;
            switch (args.operation)
            {
                case 'add_line':
                    result = await this.modifyScript_AddLine(args.filePath, args.params);
                    break;
                case 'remove_line':
                    result = await this.modifyScript_RemoveLine(args.filePath, args.params);
                    break;
                case 'add_function':
                    result = await this.modifyScript_AddFunction(args.filePath, args.params);
                    break;
                case 'remove_function':
                    result = await this.modifyScript_RemoveFunction(args.filePath, args.params);
                    break;
                case 'replace_text':
                    result = await this.modifyScript_ReplaceText(args.filePath, args.params);
                    break;
                default:
                    this.sendError(requestId, `Unknown modify_script operation: ${args.operation}`);
                    return;
            }

            kadi.sendToolResult(requestId, JSON.stringify(result));
        }
        catch (error)
        {
            console.log(`DevelopmentToolHandler: ERROR - modify_script failed:`, error);
            this.sendError(requestId, `modify_script error: ${error.message}`);
        }
    }

    /**
     * Helper: Read a script file via GenericCommand pipeline
     * @returns {Promise<Object>} Result with {success, content, ...} or {success: false, error}
     */
    async _readFile(filePath)
    {
        return await this._submitCommand('game.read_script_file', { filePath });
    }

    /**
     * Helper: Write a script file via GenericCommand pipeline (overwrite mode)
     * @returns {Promise<Object>} Result with {success, ...} or {success: false, error}
     */
    async _writeFile(filePath, content)
    {
        return await this._submitCommand('game.create_script_file', {
            filePath,
            content,
            overwrite: true
        });
    }

    /**
     * Operation: add_line
     */
    async modifyScript_AddLine(filePath, params)
    {
        const { lineNumber, content, position } = params;

        if (typeof lineNumber !== 'number' || lineNumber < 1)
        {
            return { success: false, error: 'Invalid lineNumber: must be number >= 1' };
        }
        if (typeof content !== 'string')
        {
            return { success: false, error: 'Invalid content: must be string' };
        }
        if (!['before', 'after', 'replace'].includes(position))
        {
            return { success: false, error: 'Invalid position: must be "before", "after", or "replace"' };
        }

        const readResult = await this._readFile(filePath);
        if (!readResult.success)
        {
            return { success: false, error: readResult.error || 'Failed to read file' };
        }

        const lines = readResult.content.split('\n');
        if (lineNumber > lines.length + 1)
        {
            return { success: false, error: `Invalid line number ${lineNumber}: file has ${lines.length} lines` };
        }

        const index = lineNumber - 1;
        let linesModified = 1;

        switch (position)
        {
            case 'before':
                lines.splice(index, 0, content);
                break;
            case 'after':
                lines.splice(index + 1, 0, content);
                break;
            case 'replace':
                lines[index] = content;
                break;
        }

        if (content.includes('\n'))
        {
            linesModified = content.split('\n').length;
        }

        const writeResult = await this._writeFile(filePath, lines.join('\n'));
        if (!writeResult.success)
        {
            return { success: false, error: writeResult.error || 'Failed to write file' };
        }

        return {
            success: true,
            filePath: filePath,
            operation: 'add_line',
            linesModified: linesModified,
            timestamp: Date.now()
        };
    }

    /**
     * Operation: remove_line
     */
    async modifyScript_RemoveLine(filePath, params)
    {
        const readResult = await this._readFile(filePath);
        if (!readResult.success)
        {
            return { success: false, error: readResult.error || 'Failed to read file' };
        }

        const lines = readResult.content.split('\n');
        let linesModified = 0;
        let newLines;

        if (params.lineNumber !== undefined)
        {
            const { lineNumber, count = 1 } = params;
            if (typeof lineNumber !== 'number' || lineNumber < 1 || lineNumber > lines.length)
            {
                return { success: false, error: `Invalid lineNumber ${lineNumber}: file has ${lines.length} lines` };
            }
            if (typeof count !== 'number' || count < 1)
            {
                return { success: false, error: 'Invalid count: must be number >= 1' };
            }

            const index = lineNumber - 1;
            lines.splice(index, count);
            linesModified = count;
            newLines = lines;
        }
        else if (params.pattern !== undefined)
        {
            const { pattern, maxMatches = null } = params;
            if (typeof pattern !== 'string')
            {
                return { success: false, error: 'Invalid pattern: must be string' };
            }

            newLines = lines.filter(line => {
                if (maxMatches !== null && linesModified >= maxMatches) return true;
                if (line.includes(pattern))
                {
                    linesModified++;
                    return false;
                }
                return true;
            });
        }
        else
        {
            return { success: false, error: 'Must provide either lineNumber or pattern' };
        }

        const writeResult = await this._writeFile(filePath, newLines.join('\n'));
        if (!writeResult.success)
        {
            return { success: false, error: writeResult.error || 'Failed to write file' };
        }

        return {
            success: true,
            filePath: filePath,
            operation: 'remove_line',
            linesModified: linesModified,
            timestamp: Date.now()
        };
    }

    /**
     * Operation: add_function
     */
    async modifyScript_AddFunction(filePath, params)
    {
        const { functionCode, insertionPoint, className } = params;

        if (typeof functionCode !== 'string')
        {
            return { success: false, error: 'Invalid functionCode: must be string' };
        }
        if (typeof insertionPoint !== 'string')
        {
            return { success: false, error: 'Invalid insertionPoint: must be string' };
        }

        const readResult = await this._readFile(filePath);
        if (!readResult.success)
        {
            return { success: false, error: readResult.error || 'Failed to read file' };
        }

        const lines = readResult.content.split('\n');
        let insertIndex = -1;

        if (insertionPoint === 'end_of_file')
        {
            insertIndex = lines.length;
        }
        else if (insertionPoint === 'end_of_class' && className)
        {
            insertIndex = this.findClassEnd(lines, className);
            if (insertIndex === -1)
            {
                return { success: false, error: `Class not found: ${className}` };
            }
        }
        else if (insertionPoint.startsWith('before_function:'))
        {
            const targetFunc = insertionPoint.split(':')[1];
            insertIndex = this.findFunctionStart(lines, targetFunc);
            if (insertIndex === -1)
            {
                return { success: false, error: `Function not found: ${targetFunc}` };
            }
        }
        else if (insertionPoint.startsWith('after_function:'))
        {
            const targetFunc = insertionPoint.split(':')[1];
            const funcStart = this.findFunctionStart(lines, targetFunc);
            if (funcStart === -1)
            {
                return { success: false, error: `Function not found: ${targetFunc}` };
            }
            insertIndex = this.findFunctionEnd(lines, funcStart) + 1;
        }
        else
        {
            return { success: false, error: `Invalid insertion point: ${insertionPoint}` };
        }

        if (insertIndex === -1)
        {
            return { success: false, error: `Could not find insertion point: ${insertionPoint}` };
        }

        lines.splice(insertIndex, 0, '', functionCode, '');

        const writeResult = await this._writeFile(filePath, lines.join('\n'));
        if (!writeResult.success)
        {
            return { success: false, error: writeResult.error || 'Failed to write file' };
        }

        return {
            success: true,
            filePath: filePath,
            operation: 'add_function',
            linesModified: functionCode.split('\n').length,
            timestamp: Date.now()
        };
    }

    /**
     * Operation: remove_function
     */
    async modifyScript_RemoveFunction(filePath, params)
    {
        const { functionName, className } = params;

        if (typeof functionName !== 'string')
        {
            return { success: false, error: 'Invalid functionName: must be string' };
        }

        const readResult = await this._readFile(filePath);
        if (!readResult.success)
        {
            return { success: false, error: readResult.error || 'Failed to read file' };
        }

        const lines = readResult.content.split('\n');
        const funcStart = this.findFunctionStart(lines, functionName, className);
        if (funcStart === -1)
        {
            return { success: false, error: `Function not found: ${functionName}` };
        }

        const funcEnd = this.findFunctionEnd(lines, funcStart);
        if (funcEnd === -1)
        {
            return { success: false, error: `Could not find function end: ${functionName}` };
        }

        const removedCount = funcEnd - funcStart + 1;
        lines.splice(funcStart, removedCount);

        const writeResult = await this._writeFile(filePath, lines.join('\n'));
        if (!writeResult.success)
        {
            return { success: false, error: writeResult.error || 'Failed to write file' };
        }

        return {
            success: true,
            filePath: filePath,
            operation: 'remove_function',
            linesModified: removedCount,
            timestamp: Date.now()
        };
    }

    /**
     * Operation: replace_text
     */
    async modifyScript_ReplaceText(filePath, params)
    {
        const { search, replace, isRegex = false, maxReplacements = null } = params;

        if (typeof search !== 'string')
        {
            return { success: false, error: 'Invalid search: must be string' };
        }
        if (typeof replace !== 'string')
        {
            return { success: false, error: 'Invalid replace: must be string' };
        }

        const readResult = await this._readFile(filePath);
        if (!readResult.success)
        {
            return { success: false, error: readResult.error || 'Failed to read file' };
        }

        let fileContent = readResult.content;
        let replacementCount = 0;

        if (isRegex)
        {
            try
            {
                const regex = new RegExp(search, 'g');
                fileContent = fileContent.replace(regex, (match) => {
                    if (maxReplacements !== null && replacementCount >= maxReplacements) return match;
                    replacementCount++;
                    return replace;
                });
            }
            catch (error)
            {
                return { success: false, error: `Invalid regex pattern: ${error.message}` };
            }
        }
        else
        {
            if (maxReplacements === null)
            {
                const beforeLength = fileContent.length;
                fileContent = fileContent.replaceAll(search, replace);
                const afterLength = fileContent.length;
                const replaceLengthDiff = replace.length - search.length;
                if (replaceLengthDiff !== 0 && search.length > 0)
                {
                    replacementCount = Math.abs(Math.floor((afterLength - beforeLength) / replaceLengthDiff));
                }
                else if (search.length > 0)
                {
                    replacementCount = (beforeLength - fileContent.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '').length) / search.length;
                }
            }
            else
            {
                let remaining = maxReplacements;
                while (remaining > 0 && fileContent.includes(search))
                {
                    fileContent = fileContent.replace(search, replace);
                    replacementCount++;
                    remaining--;
                }
            }
        }

        const writeResult = await this._writeFile(filePath, fileContent);
        if (!writeResult.success)
        {
            return { success: false, error: writeResult.error || 'Failed to write file' };
        }

        return {
            success: true,
            filePath: filePath,
            operation: 'replace_text',
            linesModified: replacementCount,
            timestamp: Date.now()
        };
    }

    // ==========================================
    // Helper Methods for Pattern Matching
    // ==========================================

    findClassEnd(lines, className)
    {
        let classStart = -1;
        let braceDepth = 0;

        for (let i = 0; i < lines.length; i++)
        {
            if (lines[i].match(new RegExp(`class\\s+${className}`)))
            {
                classStart = i;
                break;
            }
        }

        if (classStart === -1) return -1;

        for (let i = classStart; i < lines.length; i++)
        {
            const line = lines[i];
            braceDepth += (line.match(/\{/g) || []).length;
            braceDepth -= (line.match(/\}/g) || []).length;

            if (braceDepth === 0 && i > classStart)
            {
                return i;
            }
        }

        return -1;
    }

    findFunctionStart(lines, functionName, className = null)
    {
        let searchStart = 0;
        let searchEnd = lines.length;

        if (className)
        {
            searchStart = -1;
            for (let i = 0; i < lines.length; i++)
            {
                if (lines[i].match(new RegExp(`class\\s+${className}`)))
                {
                    searchStart = i;
                    break;
                }
            }
            if (searchStart === -1) return -1;

            searchEnd = this.findClassEnd(lines, className);
            if (searchEnd === -1) return -1;
        }

        for (let i = searchStart; i < searchEnd; i++)
        {
            if (lines[i].match(new RegExp(`(function\\s+)?${functionName}\\s*\\(`)))
            {
                return i;
            }
        }

        return -1;
    }

    findFunctionEnd(lines, startIndex)
    {
        let braceDepth = 0;
        let inFunction = false;

        for (let i = startIndex; i < lines.length; i++)
        {
            const line = lines[i];
            braceDepth += (line.match(/\{/g) || []).length;
            braceDepth -= (line.match(/\}/g) || []).length;

            if (braceDepth > 0) inFunction = true;

            if (inFunction && braceDepth === 0)
            {
                return i;
            }
        }

        return -1;
    }

    /**
     * Helper: Send error result to KADI broker
     */
    sendError(requestId, errorMessage)
    {
        console.log(`DevelopmentToolHandler: ERROR - ${errorMessage}`);
        kadi.sendToolResult(requestId, JSON.stringify({
            success: false,
            error: errorMessage
        }));
    }

    // ==========================================
    // M6 New Tools: Script Validation, Engine Inspection
    // ==========================================

    async handleValidateScript(requestId, args)
    {
        if (!args.source || typeof args.source !== 'string')
        {
            this.sendError(requestId, 'Invalid source: must be non-empty string');
            return;
        }

        const payload = { source: args.source };
        if (args.name) payload.name = args.name;

        const resultObj = await this._submitCommand('game.validate_script', payload);
        kadi.sendToolResult(requestId, JSON.stringify(resultObj));
    }

    async handleRunScriptTest(requestId, args)
    {
        if (!args.source || typeof args.source !== 'string')
        {
            this.sendError(requestId, 'Invalid source: must be non-empty string');
            return;
        }

        const payload = { source: args.source };
        if (args.name) payload.name = args.name;
        if (args.timeout) payload.timeout = args.timeout;

        const resultObj = await this._submitCommand('game.run_script_test', payload);
        kadi.sendToolResult(requestId, JSON.stringify(resultObj));
    }

    async handleGetEntityList(requestId)
    {
        const resultObj = await this._submitCommand('game.get_entity_list', {});
        kadi.sendToolResult(requestId, JSON.stringify(resultObj));
    }

    async handleGetEngineMetrics(requestId)
    {
        const resultObj = await this._submitCommand('game.get_engine_metrics', {});
        kadi.sendToolResult(requestId, JSON.stringify(resultObj));
    }

    async handleListScripts(requestId)
    {
        const resultObj = await this._submitCommand('game.list_scripts', {});
        kadi.sendToolResult(requestId, JSON.stringify(resultObj));
    }
}

// Export for hot-reload
globalThis.DevelopmentToolHandler = DevelopmentToolHandler;

console.log('DevelopmentToolHandler: Module loaded');
