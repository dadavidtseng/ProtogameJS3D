//----------------------------------------------------------------------------------------------------
// GameScriptInterface.cpp
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
#include "Game/Framework/GameScriptInterface.hpp"
//----------------------------------------------------------------------------------------------------
#include "Game/Framework/App.hpp"
#include "Game/Framework/GameCommon.hpp"
#include "Game/Gameplay/Game.hpp"
//----------------------------------------------------------------------------------------------------
#include "Engine/Core/Clock.hpp"
#include "Engine/Core/EngineCommon.hpp"
#include "Engine/Core/ErrorWarningAssert.hpp"
#include "Engine/Core/LogSubsystem.hpp"
#include "Engine/Input/InputSystem.hpp"
#include "Engine/Script/ScriptTypeExtractor.hpp"
//----------------------------------------------------------------------------------------------------
#include "ThirdParty/json/json.hpp"
//----------------------------------------------------------------------------------------------------
#include <filesystem>
#include <fstream>
#include <sstream>


//----------------------------------------------------------------------------------------------------
// Helper function: Escape special characters in JSON strings
//----------------------------------------------------------------------------------------------------
static std::string EscapeJsonString(String const& input)
{
    std::string escaped;
    escaped.reserve(static_cast<size_t>(input.length() * 1.2)); // Reserve extra space for escape characters

    for (char c : input)
    {
        switch (c)
        {
        case '\\': escaped += "\\\\";
            break; // Backslash
        case '\"': escaped += "\\\"";
            break; // Quote
        case '\n': escaped += "\\n";
            break;  // Newline
        case '\r': escaped += "\\r";
            break;  // Carriage return
        case '\t': escaped += "\\t";
            break;  // Tab
        case '\b': escaped += "\\b";
            break;  // Backspace
        case '\f': escaped += "\\f";
            break;  // Form feed
        default: escaped += c;
            break;
        }
    }

    return escaped;
}

//----------------------------------------------------------------------------------------------------
GameScriptInterface::GameScriptInterface(Game* game)
    : m_game(game)
{
    if (!g_game)
    {
        ERROR_AND_DIE("GameScriptInterface: Game pointer cannot be null")
    }

    GameScriptInterface::InitializeMethodRegistry();
}

//----------------------------------------------------------------------------------------------------
std::vector<ScriptMethodInfo> GameScriptInterface::GetAvailableMethods() const
{
    return {
        ScriptMethodInfo("appRequestQuit",
                         "Request quit to app",
                         {},
                         "void"),

        ScriptMethodInfo("executeCommand",
                         "執行 JavaScript 指令",
                         {"string"},
                         "string"),

        ScriptMethodInfo("executeFile",
                         "執行 JavaScript 檔案",
                         {"string"},
                         "string"),

        // Phase 6a: KADI Development Tools - File Operations
        ScriptMethodInfo("createScriptFile",
                         "Create new JavaScript file in Scripts directory",
                         {"filePath:string", "content:string", "overwrite:boolean"},
                         "object"),

        ScriptMethodInfo("readScriptFile",
                         "Read existing JavaScript file from Scripts directory",
                         {"filePath:string"},
                         "object"),

        ScriptMethodInfo("deleteScriptFile",
                         "Delete JavaScript file from Scripts directory",
                         {"filePath:string"},
                         "object"),

        // Phase 6a: KADI Development Tools - Input Injection
        ScriptMethodInfo("injectKeyPress",
                         "Inject a key press with duration",
                         {"keyCode:number", "durationMs:number"},
                         "object"),

        ScriptMethodInfo("injectKeyHold",
                         "Inject multi-key sequence events with precise timing control for advanced input scenarios",
                         {"keySequence:array"},
                         "object"),

        ScriptMethodInfo("getKeyHoldStatus",
                         "Get the status of a key hold job by its job ID",
                         {"jobId:number"},
                         "object"),

        ScriptMethodInfo("cancelKeyHold",
                         "Cancel an active key hold job by its job ID",
                         {"jobId:number"},
                         "object"),

        ScriptMethodInfo("listActiveKeyHolds",
                         "List all currently active key hold jobs with their status",
                         {},
                         "object"),

        // Phase 6b: KADI Development Tools - FileWatcher Management
        ScriptMethodInfo("addWatchedFile",
                         "Add JavaScript file to hot-reload file watcher",
                         {"filePath:string"},
                         "object"),

        ScriptMethodInfo("removeWatchedFile",
                         "Remove JavaScript file from hot-reload file watcher",
                         {"filePath:string"},
                         "object"),

        ScriptMethodInfo("getWatchedFiles",
                         "Get list of all watched JavaScript files",
                         {},
                         "object"),
    };
}

//----------------------------------------------------------------------------------------------------
std::vector<String> GameScriptInterface::GetAvailableProperties() const
{
    return {};
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::CallMethod(String const&     methodName,
                                                   ScriptArgs const& args)
{
    try
    {
        if (methodName == "appRequestQuit")
        {
            return ExecuteAppRequestQuit(args);
        }
        else if (methodName == "executeCommand")
        {
            return ExecuteJavaScriptCommand(args);
        }
        else if (methodName == "executeFile")
        {
            return ExecuteJavaScriptFile(args);
        }
        // Phase 6a: KADI Development Tools - File Operations
        else if (methodName == "createScriptFile")
        {
            return ExecuteCreateScriptFile(args);
        }
        else if (methodName == "readScriptFile")
        {
            return ExecuteReadScriptFile(args);
        }
        else if (methodName == "deleteScriptFile")
        {
            return ExecuteDeleteScriptFile(args);
        }
        // Phase 6a: KADI Development Tools - Input Injection
        else if (methodName == "injectKeyPress")
        {
            return ExecuteInjectKeyPress(args);
        }
        else if (methodName == "injectKeyHold")
        {
            return ExecuteInjectKeyHold(args);
        }
        else if (methodName == "getKeyHoldStatus")
        {
            return ExecuteGetKeyHoldStatus(args);
        }
        else if (methodName == "cancelKeyHold")
        {
            return ExecuteCancelKeyHold(args);
        }
        else if (methodName == "listActiveKeyHolds")
        {
            return ExecuteListActiveKeyHolds(args);
        }
        // Phase 6b: KADI Development Tools - FileWatcher Management
        else if (methodName == "addWatchedFile")
        {
            return ExecuteAddWatchedFile(args);
        }
        else if (methodName == "removeWatchedFile")
        {
            return ExecuteRemoveWatchedFile(args);
        }
        else if (methodName == "getWatchedFiles")
        {
            return ExecuteGetWatchedFiles(args);
        }

        return ScriptMethodResult::Error("未知的方法: " + methodName);
    }
    catch (std::exception const& e)
    {
        return ScriptMethodResult::Error("方法執行時發生例外: " + String(e.what()));
    }
}

//----------------------------------------------------------------------------------------------------
std::any GameScriptInterface::GetProperty(const String& propertyName) const
{
    UNUSED(propertyName)

    return std::any{};
}

//----------------------------------------------------------------------------------------------------
bool GameScriptInterface::SetProperty(const String& propertyName, const std::any& value)
{
    UNUSED(propertyName)
    UNUSED(value)

    return false;
}

void GameScriptInterface::InitializeMethodRegistry()
{
}

ScriptMethodResult GameScriptInterface::ExecuteAppRequestQuit(ScriptArgs const& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 0, "appRequestQuit");
    if (!result.success) return result;

    try
    {
        App::RequestQuit();
        return ScriptMethodResult::Success();
    }
    catch (const std::exception& e)
    {
        return ScriptMethodResult::Error("創建立方體失敗: " + String(e.what()));
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteJavaScriptCommand(const ScriptArgs& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 1, "executeCommand");
    if (!result.success) return result;

    try
    {
        String command = ScriptTypeExtractor::ExtractString(args[0]);
        m_game->ExecuteJavaScriptCommand(command);
        return ScriptMethodResult::Success(String("指令執行: " + command));
    }
    catch (std::exception const& e)
    {
        return ScriptMethodResult::Error("執行 JavaScript 指令失敗: " + String(e.what()));
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteJavaScriptFile(const ScriptArgs& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 1, "executeFile");
    if (!result.success) return result;

    try
    {
        String filename = ScriptTypeExtractor::ExtractString(args[0]);
        m_game->ExecuteJavaScriptFile(filename);
        return ScriptMethodResult::Success(String("檔案執行: " + filename));
    }
    catch (std::exception const& e)
    {
        return ScriptMethodResult::Error("執行 JavaScript 檔案失敗: " + String(e.what()));
    }
}

//----------------------------------------------------------------------------------------------------
// Phase 6a: KADI Development Tools - File Operations Implementation
// Append these implementations to GameScriptInterface.cpp
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteCreateScriptFile(ScriptArgs const& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 3, "createScriptFile");
    if (!result.success) return result;

    try
    {
        // Extract parameters
        String filePath  = ScriptTypeExtractor::ExtractString(args[0]);
        String content   = ScriptTypeExtractor::ExtractString(args[1]);
        bool   overwrite = ScriptTypeExtractor::ExtractBool(args[2]);

        // Validation: Empty file path
        if (filePath.empty())
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid file path: cannot be empty\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Security: Path validation (prevent directory traversal)
        if (filePath.find("..") != std::string::npos)
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid file path: directory traversal not allowed\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Security: Extension and filename validation
        // Must match pattern: ^[^.].*\.js$ (no hidden files, must end with .js)

        // Check 1: Must end with ".js" (not just contain it)
        if (filePath.length() < 3 || filePath.substr(filePath.length() - 3) != ".js")
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid file extension: must end with .js\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Check 2: Cannot start with a dot (hidden files not allowed)
        // Extract just the filename from the path to check
        size_t lastSlash = filePath.find_last_of("/\\");
        String filename  = (lastSlash != std::string::npos) ? filePath.substr(lastSlash + 1) : filePath;

        if (!filename.empty() && filename[0] == '.')
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid filename: cannot start with dot (hidden files not allowed)\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Build full path (Run/Data/Scripts/)
        std::filesystem::path scriptsDir = std::filesystem::current_path() / "Data" / "Scripts";
        std::filesystem::path fullPath   = scriptsDir / filePath;

        // Check if file exists
        if (std::filesystem::exists(fullPath) && !overwrite)
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"File already exists and overwrite=false: " << EscapeJsonString(filePath) << "\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Create parent directories if needed
        std::filesystem::path parentDir = fullPath.parent_path();
        if (!std::filesystem::exists(parentDir))
        {
            std::filesystem::create_directories(parentDir);
        }

        // Write file
        std::ofstream outFile(fullPath, std::ios::out | std::ios::trunc);
        if (!outFile.is_open())
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Failed to open file for writing: " << EscapeJsonString(filePath) << "\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        outFile << content;
        outFile.close();

        size_t bytesWritten = content.length();

        // Return success with file info (escape path for JSON)
        std::ostringstream resultJson;
        resultJson << "{";
        resultJson << "\"success\":true,";
        resultJson << "\"filePath\":\"" << EscapeJsonString(fullPath.string()) << "\",";
        resultJson << "\"bytesWritten\":" << bytesWritten;
        resultJson << "}";

        return ScriptMethodResult::Success(resultJson.str());
    }
    catch (std::exception const& e)
    {
        std::ostringstream errorJson;
        errorJson << "{";
        errorJson << "\"success\":false,";
        errorJson << "\"error\":\"Create script file exception: " << EscapeJsonString(e.what()) << "\"";
        errorJson << "}";
        return ScriptMethodResult::Success(errorJson.str());
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteReadScriptFile(ScriptArgs const& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 1, "readScriptFile");
    if (!result.success) return result;

    try
    {
        // Extract parameters
        String filePath = ScriptTypeExtractor::ExtractString(args[0]);

        // Security: Path validation (prevent directory traversal)
        if (filePath.find("..") != std::string::npos)
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid file path: directory traversal not allowed\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Security: Extension and filename validation
        // Must match pattern: ^[^.].*\.js$ (no hidden files, must end with .js)

        // Check 1: Must end with ".js" (not just contain it)
        if (filePath.length() < 3 || filePath.substr(filePath.length() - 3) != ".js")
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid file extension: must end with .js\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Check 2: Cannot start with a dot (hidden files not allowed)
        size_t lastSlash = filePath.find_last_of("/\\");
        String filename  = (lastSlash != std::string::npos) ? filePath.substr(lastSlash + 1) : filePath;

        if (!filename.empty() && filename[0] == '.')
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid filename: cannot start with dot (hidden files not allowed)\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Build full path (Run/Data/Scripts/)
        std::filesystem::path scriptsDir = std::filesystem::current_path() / "Data" / "Scripts";
        std::filesystem::path fullPath   = scriptsDir / filePath;

        // Check if file exists
        if (!std::filesystem::exists(fullPath))
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"File not found: " << EscapeJsonString(filePath) << "\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Read file
        std::ifstream inFile(fullPath, std::ios::in);
        if (!inFile.is_open())
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Failed to open file for reading: " << EscapeJsonString(filePath) << "\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        std::stringstream buffer;
        buffer << inFile.rdbuf();
        inFile.close();

        std::string content   = buffer.str();
        size_t      lineCount = std::count(content.begin(), content.end(), '\n') + 1;
        size_t      byteSize  = content.length();

        // Escape content using helper function
        std::string escapedContent = EscapeJsonString(content);

        // Return success with file content (escape path for JSON)
        std::ostringstream resultJson;
        resultJson << "{";
        resultJson << "\"success\":true,";
        resultJson << "\"filePath\":\"" << EscapeJsonString(fullPath.string()) << "\",";
        resultJson << "\"content\":\"" << escapedContent << "\",";
        resultJson << "\"lineCount\":" << lineCount << ",";
        resultJson << "\"byteSize\":" << byteSize;
        resultJson << "}";

        return ScriptMethodResult::Success(resultJson.str());
    }
    catch (std::exception const& e)
    {
        std::ostringstream errorJson;
        errorJson << "{";
        errorJson << "\"success\":false,";
        errorJson << "\"error\":\"Read script file exception: " << EscapeJsonString(e.what()) << "\"";
        errorJson << "}";
        return ScriptMethodResult::Success(errorJson.str());
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteDeleteScriptFile(ScriptArgs const& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 1, "deleteScriptFile");
    if (!result.success) return result;

    try
    {
        // Extract parameters
        String filePath = ScriptTypeExtractor::ExtractString(args[0]);

        // Security: Path validation (prevent directory traversal)
        if (filePath.find("..") != std::string::npos)
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid file path: directory traversal not allowed\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Security: Extension and filename validation
        // Must match pattern: ^[^.].*\.js$ (no hidden files, must end with .js)

        // Check 1: Must end with ".js" (not just contain it)
        if (filePath.length() < 3 || filePath.substr(filePath.length() - 3) != ".js")
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid file extension: must end with .js\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Check 2: Cannot start with a dot (hidden files not allowed)
        size_t lastSlash = filePath.find_last_of("/\\");
        String filename  = (lastSlash != std::string::npos) ? filePath.substr(lastSlash + 1) : filePath;

        if (!filename.empty() && filename[0] == '.')
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid filename: cannot start with dot (hidden files not allowed)\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Security: Protected files list (Phase 6 plan requirement)
        std::vector<std::string> protectedFiles = {
            "JSEngine.js",
            "JSGame.js",
            "InputSystem.js",
            "main.js",
            "kadi/KADIGameControl.js",
            "kadi/GameControlHandler.js",
            "kadi/GameControlTools.js",
            "kadi/DevelopmentToolHandler.js",
            "kadi/DevelopmentTools.js",
            "core/Subsystem.js",
            "components/RendererSystem.js",
            "components/Prop.js"
        };

        // Normalize path for comparison (replace backslashes with forward slashes)
        std::string normalizedPath = filePath;
        std::replace(normalizedPath.begin(), normalizedPath.end(), '\\', '/');

        // Check if file is protected
        for (const auto& protectedFile : protectedFiles)
        {
            if (normalizedPath == protectedFile || normalizedPath.find(protectedFile) != std::string::npos)
            {
                std::ostringstream errorJson;
                errorJson << "{";
                errorJson << "\"success\":false,";
                errorJson << "\"error\":\"Cannot delete protected file: " << EscapeJsonString(filePath) << "\"";
                errorJson << "}";
                return ScriptMethodResult::Success(errorJson.str());
            }
        }

        // Build full path (Run/Data/Scripts/)
        std::filesystem::path scriptsDir = std::filesystem::current_path() / "Data" / "Scripts";
        std::filesystem::path fullPath   = scriptsDir / filePath;

        // Check if file exists
        bool existed = std::filesystem::exists(fullPath);

        // Delete file if it exists
        if (existed)
        {
            std::filesystem::remove(fullPath);
        }

        // Return success with deletion info (escape path for JSON)
        std::ostringstream resultJson;
        resultJson << "{";
        resultJson << "\"success\":true,";
        resultJson << "\"filePath\":\"" << EscapeJsonString(fullPath.string()) << "\",";
        resultJson << "\"existed\":" << (existed ? "true" : "false");
        resultJson << "}";

        return ScriptMethodResult::Success(resultJson.str());
    }
    catch (std::exception const& e)
    {
        std::ostringstream errorJson;
        errorJson << "{";
        errorJson << "\"success\":false,";
        errorJson << "\"error\":\"Delete script file exception: " << EscapeJsonString(e.what()) << "\"";
        errorJson << "}";
        return ScriptMethodResult::Success(errorJson.str());
    }
}

//----------------------------------------------------------------------------------------------------
// Phase 6a: KADI Development Tools - Input Injection Implementation
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteInjectKeyPress(ScriptArgs const& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 2, "injectKeyPress");
    if (!result.success) return result;

    try
    {
        // Extract parameters
        int keyCode    = ScriptTypeExtractor::ExtractInt(args[0]);
        int durationMs = ScriptTypeExtractor::ExtractInt(args[1]);

        // Validate parameters
        if (keyCode < 0 || keyCode > 255)
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid keyCode: must be 0-255\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        if (durationMs < 0)
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid durationMs: must be >= 0\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Call InputSystem to inject key press
        if (!g_input)
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"InputSystem not available\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        g_input->InjectKeyPress(static_cast<unsigned char>(keyCode), durationMs);

        // Return success with injection info
        std::ostringstream resultJson;
        resultJson << "{";
        resultJson << "\"success\":true,";
        resultJson << "\"keyCode\":" << keyCode << ",";
        resultJson << "\"durationMs\":" << durationMs;
        resultJson << "}";

        return ScriptMethodResult::Success(resultJson.str());
    }
    catch (std::exception const& e)
    {
        std::ostringstream errorJson;
        errorJson << "{";
        errorJson << "\"success\":false,";
        errorJson << "\"error\":\"Inject key press exception: " << EscapeJsonString(e.what()) << "\"";
        errorJson << "}";
        return ScriptMethodResult::Success(errorJson.str());
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteInjectKeyHold(ScriptArgs const& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCountRange(args, 1, 3, "injectKeyHold");
    if (!result.success) return result;

    try
    {
        DAEMON_LOG(LogScript, eLogVerbosity::Log,
                   StringFormat("ExecuteInjectKeyHold: Received {} arguments", args.size()));

        // Only support the enhanced keySequence format
        if (args.size() == 1)
        {
            // Single argument - should be JSON string from JavaScript
            try
            {
                // Extract JSON string
                String jsonString = ScriptTypeExtractor::ExtractString(args[0]);

                // Parse JSON to get the parameter object
                nlohmann::json paramJson = nlohmann::json::parse(jsonString);

                // Check if it contains keySequence (enhanced) or keyCode (legacy)
                bool hasKeySequence = paramJson.contains("keySequence");
                bool hasKeyCode     = paramJson.contains("keyCode");

                DAEMON_LOG(LogScript, eLogVerbosity::Log,
                           StringFormat("ExecuteInjectKeyHold: Object hasKeySequence={}, hasKeyCode={}", hasKeySequence, hasKeyCode));

                if (hasKeySequence && !hasKeyCode)
                {
                    // Enhanced format: extract keySequence and pass to sequence handler
                    DAEMON_LOG(LogScript, eLogVerbosity::Log, "ExecuteInjectKeyHold: Detected enhanced keySequence format");
                    // Convert keySequence array to JSON string and pass it
                    std::string keySequenceJson = paramJson["keySequence"].dump();
                    return ExecuteKeyHoldSequence(keySequenceJson);
                }
                else if (hasKeyCode && !hasKeySequence)
                {
                    // Legacy format: not supported anymore
                    std::ostringstream errorJson;
                    errorJson << "{";
                    errorJson << "\"success\":false,";
                    errorJson << "\"error\":\"Legacy single-key format not supported. Please use keySequence array format: {keySequence: [{keyCode: 87, delayMs: 0, durationMs: 2000}, {keyCode: 65, delayMs: 0, durationMs: 2000}]}\"";
                    errorJson << "}";
                    return ScriptMethodResult::Success(errorJson.str());
                }
                else
                {
                    std::ostringstream errorJson;
                    errorJson << "{";
                    errorJson << "\"success\":false,";
                    errorJson << "\"error\":\"Invalid parameter format. Expected keySequence array.\"";
                    errorJson << "}";
                    return ScriptMethodResult::Success(errorJson.str());
                }
            }
            catch (...)
            {
                // JSON parsing failed
                std::ostringstream errorJson;
                errorJson << "{";
                errorJson << "\"success\":false,";
                errorJson << "\"error\":\"Failed to parse JSON parameter\"";
                errorJson << "}";
                return ScriptMethodResult::Success(errorJson.str());
            }
        }
        else
        {
            // Wrong number of arguments
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid parameters. hold_keycode now requires 1 argument with keySequence array.\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }
    }
    catch (std::exception const& e)
    {
        std::ostringstream errorJson;
        errorJson << "{";
        errorJson << "\"success\":false,";
        errorJson << "\"error\":\"Inject key hold exception: " << EscapeJsonString(e.what()) << "\"";
        errorJson << "}";
        return ScriptMethodResult::Success(errorJson.str());
    }
}

//----------------------------------------------------------------------------------------------------
// Phase 6a: KADI Development Tools - Key Hold Status Management
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteGetKeyHoldStatus(ScriptArgs const& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 1, "getKeyHoldStatus");
    if (!result.success) return result;

    try
    {
        // Extract parameter
        uint32_t jobId = static_cast<uint32_t>(ScriptTypeExtractor::ExtractInt(args[0]));

        // Access InputSystem to get key hold status
        if (!g_input)
        {
            std::ostringstream errorJson;
            errorJson << "{\"success\":false,\"error\":\"InputSystem not available\"}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Get status from InputSystem
        sToolJobStatus status = g_input->GetKeyHoldStatus(jobId);

        // Convert status to JSON
        std::ostringstream resultJson;
        resultJson << "{";
        resultJson << "\"success\":true,";
        resultJson << "\"jobId\":" << status.jobId << ",";
        resultJson << "\"toolType\":\"" << status.toolType << "\",";
        resultJson << "\"status\":\"" << static_cast<int>(status.status) << "\",";
        resultJson << "\"metadata\":{";

        bool first = true;
        for (const auto& [key, value] : status.metadata)
        {
            if (!first) resultJson << ",";
            resultJson << "\"" << key << "\":\"" << value << "\"";
            first = false;
        }

        resultJson << "}}";

        return ScriptMethodResult::Success(resultJson.str());
    }
    catch (std::exception const& e)
    {
        std::ostringstream errorJson;
        errorJson << "{\"success\":false,\"error\":\"Get key hold status exception: " << EscapeJsonString(e.what()) << "\"}";
        return ScriptMethodResult::Success(errorJson.str());
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteCancelKeyHold(ScriptArgs const& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 1, "cancelKeyHold");
    if (!result.success) return result;

    try
    {
        // Extract parameter
        uint32_t jobId = static_cast<uint32_t>(ScriptTypeExtractor::ExtractInt(args[0]));

        // Access InputSystem to cancel key hold
        if (!g_input)
        {
            std::ostringstream errorJson;
            errorJson << "{\"success\":false,\"error\":\"InputSystem not available\"}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Cancel key hold in InputSystem
        bool cancelled = g_input->CancelKeyHold(jobId);

        // Return result
        std::ostringstream resultJson;
        resultJson << "{";
        resultJson << "\"success\":true,";
        resultJson << "\"jobId\":" << jobId << ",";
        resultJson << "\"cancelled\":" << (cancelled ? "true" : "false");
        resultJson << "}";

        return ScriptMethodResult::Success(resultJson.str());
    }
    catch (std::exception const& e)
    {
        std::ostringstream errorJson;
        errorJson << "{\"success\":false,\"error\":\"Cancel key hold exception: " << EscapeJsonString(e.what()) << "\"}";
        return ScriptMethodResult::Success(errorJson.str());
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteListActiveKeyHolds(ScriptArgs const& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 0, "listActiveKeyHolds");
    if (!result.success) return result;

    try
    {
        // Access InputSystem to list active key holds
        if (!g_input)
        {
            std::ostringstream errorJson;
            errorJson << "{\"success\":false,\"error\":\"InputSystem not available\"}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Get active key holds from InputSystem
        std::vector<sToolJobStatus> activeJobs = g_input->ListActiveKeyHolds();

        // Convert to JSON
        std::ostringstream resultJson;
        resultJson << "{";
        resultJson << "\"success\":true,";
        resultJson << "\"count\":" << activeJobs.size() << ",";
        resultJson << "\"jobs\":[";

        for (size_t i = 0; i < activeJobs.size(); ++i)
        {
            const auto& job = activeJobs[i];
            resultJson << "{";
            resultJson << "\"jobId\":" << job.jobId << ",";
            resultJson << "\"toolType\":\"" << job.toolType << "\",";
            resultJson << "\"status\":\"" << static_cast<int>(job.status) << "\",";
            resultJson << "\"metadata\":{";

            bool first = true;
            for (const auto& [key, value] : job.metadata)
            {
                if (!first) resultJson << ",";
                resultJson << "\"" << key << "\":\"" << value << "\"";
                first = false;
            }

            resultJson << "}}";
            if (i < activeJobs.size() - 1) resultJson << ",";
        }

        resultJson << "]}";

        return ScriptMethodResult::Success(resultJson.str());
    }
    catch (std::exception const& e)
    {
        std::ostringstream errorJson;
        errorJson << "{\"success\":false,\"error\":\"List active key holds exception: " << EscapeJsonString(e.what()) << "\"}";
        return ScriptMethodResult::Success(errorJson.str());
    }
}

//----------------------------------------------------------------------------------------------------
// Helper method for enhanced keySequence format (Phase 6a)
//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteKeyHoldSequence(const std::string& keySequenceJson)
{
    DAEMON_LOG(LogScript, eLogVerbosity::Log,
               StringFormat("ExecuteKeyHoldSequence: Processing enhanced keySequence format"));

    try
    {
        // Parse keySequence JSON array directly
        std::vector<sKeySequenceItem> keySequence;

        // Parse JSON using nlohmann/json
        nlohmann::json sequenceDoc = nlohmann::json::parse(keySequenceJson);

        if (!sequenceDoc.is_array())
        {
            std::ostringstream errorJson;
            errorJson << "{\"success\":false,\"error\":\"keySequence must be an array\"}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Convert JSON array to sKeySequenceItem vector
        for (const auto& keyItem : sequenceDoc)
        {
            sKeySequenceItem item;
            item.keyCode    = static_cast<unsigned char>(keyItem.value("keyCode", 0));
            item.delayMs    = keyItem.value("delayMs", 0);
            item.durationMs = keyItem.value("durationMs", 0);

            keySequence.push_back(item);
        }

        // Validate key sequence
        if (keySequence.empty())
        {
            std::ostringstream errorJson;
            errorJson << "{\"success\":false,\"error\":\"keySequence cannot be empty\"}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Validate each key item
        for (size_t i = 0; i < keySequence.size(); ++i)
        {
            const auto& item = keySequence[i];

            if (item.keyCode < 0 || item.keyCode > 255)
            {
                std::ostringstream errorJson;
                errorJson << "{\"success\":false,\"error\":\"Invalid keyCode in keySequence[" << i << "]: must be 0-255\"}";
                return ScriptMethodResult::Success(errorJson.str());
            }

            if (item.delayMs < 0 || item.delayMs > 10000)
            {
                std::ostringstream errorJson;
                errorJson << "{\"success\":false,\"error\":\"Invalid delayMs in keySequence[" << i << "]: must be 0-10000\"}";
                return ScriptMethodResult::Success(errorJson.str());
            }

            if (item.durationMs < 0 || item.durationMs > 10000)
            {
                std::ostringstream errorJson;
                errorJson << "{\"success\":false,\"error\":\"Invalid durationMs in keySequence[" << i << "]: must be 0-10000\"}";
                return ScriptMethodResult::Success(errorJson.str());
            }
        }

        // Access InputSystem to inject key sequence
        if (!g_input)
        {
            std::ostringstream errorJson;
            errorJson << "{\"success\":false,\"error\":\"InputSystem not available\"}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        DAEMON_LOG(LogScript, eLogVerbosity::Log,
                   StringFormat("ExecuteKeyHoldSequence: Calling InputSystem::InjectKeySequence with %zu keys", keySequence.size()));

        // Call InputSystem to inject key sequence
        uint32_t primaryJobId = g_input->InjectKeySequence(keySequence);

        if (primaryJobId == 0)
        {
            std::ostringstream errorJson;
            errorJson << "{\"success\":false,\"error\":\"Failed to inject key sequence\"}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Return success with job tracking info
        std::ostringstream resultJson;
        resultJson << "{";
        resultJson << "\"success\":true,";
        resultJson << "\"primaryJobId\":" << primaryJobId << ",";
        resultJson << "\"keyCount\":" << keySequence.size() << ",";
        resultJson << "\"message\":\"Key sequence injected successfully\"";
        resultJson << "}";

        DAEMON_LOG(LogScript, eLogVerbosity::Log,
                   StringFormat("ExecuteKeyHoldSequence: Key sequence injected successfully, primaryJobId=%d, keyCount=%zu",
                       primaryJobId, keySequence.size()));

        return ScriptMethodResult::Success(resultJson.str());
    }
    catch (std::exception const& e)
    {
        std::ostringstream errorJson;
        errorJson << "{\"success\":false,\"error\":\"ExecuteKeyHoldSequence exception: " << EscapeJsonString(e.what()) << "\"}";
        return ScriptMethodResult::Success(errorJson.str());
    }
}

//----------------------------------------------------------------------------------------------------
// Phase 6b: KADI Development Tools - FileWatcher Management Implementation
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteAddWatchedFile(ScriptArgs const& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 1, "addWatchedFile");
    if (!result.success) return result;

    try
    {
        // Extract parameter
        String filePath = ScriptTypeExtractor::ExtractString(args[0]);

        // Validation: Empty file path
        if (filePath.empty())
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid file path: cannot be empty\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Security: Path validation (prevent directory traversal)
        if (filePath.find("..") != std::string::npos)
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid file path: directory traversal not allowed\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Security: Extension and filename validation
        // Must match pattern: ^[^.].*\.js$ (no hidden files, must end with .js)

        // Check 1: Must end with ".js" (not just contain it)
        if (filePath.length() < 3 || filePath.substr(filePath.length() - 3) != ".js")
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid file extension: must end with .js\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Check 2: Cannot start with a dot (hidden files not allowed)
        // Extract just the filename from the path to check
        size_t lastSlash = filePath.find_last_of("/\\");
        String filename  = (lastSlash != std::string::npos) ? filePath.substr(lastSlash + 1) : filePath;

        if (!filename.empty() && filename[0] == '.')
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid filename: cannot start with dot (hidden files not allowed)\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Access ScriptSubsystem through global pointer
        if (!g_scriptSubsystem)
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"ScriptSubsystem not available\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Build relative path (Data/Scripts/ prefix)
        std::string relativePath = "Data/Scripts/" + filePath;

        // Add to FileWatcher
        g_scriptSubsystem->AddWatchedFile(relativePath);

        // Return success with file info
        std::ostringstream resultJson;
        resultJson << "{";
        resultJson << "\"success\":true,";
        resultJson << "\"filePath\":\"" << EscapeJsonString(filePath) << "\",";
        resultJson << "\"relativePath\":\"" << EscapeJsonString(relativePath) << "\"";
        resultJson << "}";

        return ScriptMethodResult::Success(resultJson.str());
    }
    catch (std::exception const& e)
    {
        std::ostringstream errorJson;
        errorJson << "{";
        errorJson << "\"success\":false,";
        errorJson << "\"error\":\"Add watched file exception: " << EscapeJsonString(e.what()) << "\"";
        errorJson << "}";
        return ScriptMethodResult::Success(errorJson.str());
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteRemoveWatchedFile(ScriptArgs const& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 1, "removeWatchedFile");
    if (!result.success) return result;

    try
    {
        // Extract parameter
        String filePath = ScriptTypeExtractor::ExtractString(args[0]);

        // Validation: Empty file path
        if (filePath.empty())
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid file path: cannot be empty\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Security: Path validation (prevent directory traversal)
        if (filePath.find("..") != std::string::npos)
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"Invalid file path: directory traversal not allowed\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Access ScriptSubsystem through global pointer
        if (!g_scriptSubsystem)
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"ScriptSubsystem not available\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Build relative path (Data/Scripts/ prefix)
        std::string relativePath = "Data/Scripts/" + filePath;

        // Remove from FileWatcher
        g_scriptSubsystem->RemoveWatchedFile(relativePath);

        // Return success with file info
        std::ostringstream resultJson;
        resultJson << "{";
        resultJson << "\"success\":true,";
        resultJson << "\"filePath\":\"" << EscapeJsonString(filePath) << "\",";
        resultJson << "\"relativePath\":\"" << EscapeJsonString(relativePath) << "\"";
        resultJson << "}";

        return ScriptMethodResult::Success(resultJson.str());
    }
    catch (std::exception const& e)
    {
        std::ostringstream errorJson;
        errorJson << "{";
        errorJson << "\"success\":false,";
        errorJson << "\"error\":\"Remove watched file exception: " << EscapeJsonString(e.what()) << "\"";
        errorJson << "}";
        return ScriptMethodResult::Success(errorJson.str());
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteGetWatchedFiles(ScriptArgs const& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 0, "getWatchedFiles");
    if (!result.success) return result;

    try
    {
        // Access ScriptSubsystem through global pointer
        if (!g_scriptSubsystem)
        {
            std::ostringstream errorJson;
            errorJson << "{";
            errorJson << "\"success\":false,";
            errorJson << "\"error\":\"ScriptSubsystem not available\"";
            errorJson << "}";
            return ScriptMethodResult::Success(errorJson.str());
        }

        // Get watched files list
        std::vector<std::string> watchedFiles = g_scriptSubsystem->GetWatchedFiles();

        // Build JSON array
        std::ostringstream resultJson;
        resultJson << "{";
        resultJson << "\"success\":true,";
        resultJson << "\"count\":" << watchedFiles.size() << ",";
        resultJson << "\"files\":[";

        for (size_t i = 0; i < watchedFiles.size(); ++i)
        {
            resultJson << "\"" << EscapeJsonString(watchedFiles[i]) << "\"";
            if (i < watchedFiles.size() - 1)
            {
                resultJson << ",";
            }
        }

        resultJson << "]";
        resultJson << "}";

        return ScriptMethodResult::Success(resultJson.str());
    }
    catch (std::exception const& e)
    {
        std::ostringstream errorJson;
        errorJson << "{";
        errorJson << "\"success\":false,";
        errorJson << "\"error\":\"Get watched files exception: " << EscapeJsonString(e.what()) << "\"";
        errorJson << "}";
        return ScriptMethodResult::Success(errorJson.str());
    }
}
