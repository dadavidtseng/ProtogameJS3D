//----------------------------------------------------------------------------------------------------
// GameScriptInterface.cpp
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
#include "Game/Framework/GameScriptInterface.hpp"

#include <chrono>
#include <filesystem>
#include <iostream>
#include <sstream>
#include <stdexcept>

#include "Engine/Core/Clock.hpp"
#include "Engine/Core/EngineCommon.hpp"
#include "Engine/Core/ErrorWarningAssert.hpp"
#include "Engine/Core/LogSubsystem.hpp"
#include "Engine/Core/StringUtils.hpp"
#include "Engine/Math/Vec3.hpp"
#include "Engine/Scripting/ScriptSubsystem.hpp"
#include "Engine/Scripting/ScriptTypeExtractor.hpp"
#include "Game/Game.hpp"
#include "Game/Player.hpp"
#include "Game/Framework/GameCommon.hpp"

//----------------------------------------------------------------------------------------------------
GameScriptInterface::GameScriptInterface(Game* game)
    : m_game(game)
{
    if (!g_game)
    {
        ERROR_AND_DIE("GameScriptInterface: Game pointer cannot be null")
    }
}

//----------------------------------------------------------------------------------------------------
GameScriptInterface::~GameScriptInterface()
{
}

//----------------------------------------------------------------------------------------------------
std::string GameScriptInterface::GetScriptObjectName() const
{
    return "game";
}

//----------------------------------------------------------------------------------------------------
std::vector<ScriptMethodInfo> GameScriptInterface::GetAvailableMethods() const
{
    return {
        ScriptMethodInfo("getGameState",
                         "Get current game state",
                         {},
                         "string"),

        ScriptMethodInfo("setGameState",
                         "Set current game state",
                         {},
                         "void"),

        ScriptMethodInfo("createCube",
                         "在指定位置創建一個立方體",
                         {"float", "float", "float"},
                         "string"),

        ScriptMethodInfo("moveProp",
                         "移動指定索引的道具到新位置",
                         {"int", "float", "float", "float"},
                         "string"),

        ScriptMethodInfo("getPlayerPosition",
                         "取得玩家目前位置",
                         {},
                         "object"),

        ScriptMethodInfo("movePlayerCamera",
                         "移動玩家相機（用於晃動效果）",
                         {"float", "float", "float"},
                         "string"),

        ScriptMethodInfo("update",
                         "JavaScript GameLoop Update",
                         {"float", "float"},
                         "void"),

        ScriptMethodInfo("render",
                         "JavaScript GameLoop Render",
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

        ScriptMethodInfo("isAttractMode",
                         "檢查遊戲是否處於吸引模式",
                         {},
                         "bool"),

        ScriptMethodInfo("getGameState",
                         "取得目前遊戲狀態",
                         {},
                         "string"),

        ScriptMethodInfo("getFileTimestamp",
                         "取得檔案的最後修改時間戳記",
                         {"string"},
                         "number")
    };
}

//----------------------------------------------------------------------------------------------------
std::vector<std::string> GameScriptInterface::GetAvailableProperties() const
{
    return {
        "attractMode",
        "gameState"
    };
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::CallMethod(std::string const&           methodName,
                                                   std::vector<std::any> const& args)
{
    try
    {
        if (methodName == "getGameState")
        {
            return ExecuteGetGameState(args);
        }
        else if (methodName == "setGameState")
        {
            return ExecuteSetGameState(args);
        }

        if (methodName == "createCube")
        {
            return ExecuteCreateCube(args);
        }
        else if (methodName == "moveProp")
        {
            return ExecuteMoveProp(args);
        }
        else if (methodName == "getPlayerPosition")
        {
            return ExecuteGetPlayerPosition(args);
        }
        else if (methodName == "movePlayerCamera")
        {
            return ExecuteMovePlayerCamera(args);
        }
        else if (methodName == "update")
        {
            return ExecuteUpdate(args);
        }
        else if (methodName == "render")
        {
            return ExecuteRender(args);
        }
        else if (methodName == "executeCommand")
        {
            return ExecuteJavaScriptCommand(args);
        }
        else if (methodName == "executeFile")
        {
            return ExecuteJavaScriptFile(args);
        }
        else if (methodName == "isAttractMode")
        {
            return ExecuteIsAttractMode(args);
        }

        return ScriptMethodResult::Error("未知的方法: " + methodName);
    }
    catch (std::exception const& e)
    {
        return ScriptMethodResult::Error("方法執行時發生例外: " + std::string(e.what()));
    }
}

//----------------------------------------------------------------------------------------------------
std::any GameScriptInterface::GetProperty(const std::string& propertyName) const
{
    if (propertyName == "attractMode")
    {
        return m_game->IsAttractMode();
    }
    else if (propertyName == "gameState")
    {
        return m_game->IsAttractMode() ? "attract" : "game";
    }

    return std::any{};
}

//----------------------------------------------------------------------------------------------------
bool GameScriptInterface::SetProperty(const std::string& propertyName, const std::any& value)
{
    // 目前 Game 物件沒有可設定的屬性
    // 如果需要，可以在這裡添加
    UNUSED(propertyName);
    UNUSED(value);
    return false;
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteGetGameState(const std::vector<std::any>& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 0, "getGameState");

    if (!result.success) return result;

    try
    {
        eGameState state = m_game->GetGameState();
        
        // Convert enum to string for JavaScript
        std::string stateStr;
        switch (state)
        {
            case eGameState::ATTRACT:
                stateStr = "ATTRACT";
                break;
            case eGameState::GAME:
                stateStr = "GAME";
                break;
            default:
                stateStr = "UNKNOWN";
                break;
        }
        
        return ScriptMethodResult::Success(stateStr);
    }
    catch (const std::exception& e)
    {
        return ScriptMethodResult::Error("取得遊戲狀態失敗: " + std::string(e.what()));
    }
}

ScriptMethodResult GameScriptInterface::ExecuteSetGameState(const std::vector<std::any>& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 1, "setGameState");

    if (!result.success) return result;

    try
    {
        std::string stateStr = ScriptTypeExtractor::ExtractString(args[0]);
        
        // Convert string to enum
        eGameState newState;
        if (stateStr == "ATTRACT" || stateStr == "attract" || stateStr == "0")
        {
            newState = eGameState::ATTRACT;
        }
        else if (stateStr == "GAME" || stateStr == "game" || stateStr == "1")
        {
            newState = eGameState::GAME;
        }
        else
        {
            return ScriptMethodResult::Error("無效的遊戲狀態: " + stateStr + " (有效值: ATTRACT, GAME, 0, 1)");
        }
        
        m_game->SetGameState(newState);
        return ScriptMethodResult::Success("遊戲狀態已設定為: " + stateStr);
    }
    catch (const std::exception& e)
    {
        return ScriptMethodResult::Error("設定遊戲狀態失敗: " + std::string(e.what()));
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteCreateCube(const std::vector<std::any>& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 3, "createCube");
    if (!result.success) return result;

    try
    {
        Vec3 position = ScriptTypeExtractor::ExtractVec3(args, 0);
        m_game->CreateCube(position);
        return ScriptMethodResult::Success(std::string("立方體創建成功，位置: (" +
            std::to_string(position.x) + ", " +
            std::to_string(position.y) + ", " +
            std::to_string(position.z) + ")"));
    }
    catch (const std::exception& e)
    {
        return ScriptMethodResult::Error("創建立方體失敗: " + std::string(e.what()));
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteMoveProp(const std::vector<std::any>& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 4, "moveProp");
    if (!result.success) return result;

    try
    {
        int  propIndex   = ScriptTypeExtractor::ExtractInt(args[0]);
        Vec3 newPosition = ScriptTypeExtractor::ExtractVec3(args, 1);
        m_game->MoveProp(propIndex, newPosition);
        return ScriptMethodResult::Success(std::string("道具 " + std::to_string(propIndex) +
            " 移動成功，新位置: (" +
            std::to_string(newPosition.x) + ", " +
            std::to_string(newPosition.y) + ", " +
            std::to_string(newPosition.z) + ")"));
    }
    catch (const std::exception& e)
    {
        return ScriptMethodResult::Error("移動道具失敗: " + std::string(e.what()));
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteGetPlayerPosition(const std::vector<std::any>& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 0, "getPlayerPosition");
    if (!result.success) return result;

    try
    {
        Player* player = m_game->GetPlayer();
        if (!player)
        {
            return ScriptMethodResult::Error("玩家物件不存在");
        }

        Vec3 position = player->m_position;


        // 回傳一個可以被 JavaScript 使用的物件
        std::string positionStr = "{ x: " + std::to_string(position.x) +
            ", y: " + std::to_string(position.y) +
            ", z: " + std::to_string(position.z) + " }";

        return ScriptMethodResult::Success(positionStr);
    }
    catch (const std::exception& e)
    {
        return ScriptMethodResult::Error("取得玩家位置失敗: " + std::string(e.what()));
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteMovePlayerCamera(const std::vector<std::any>& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 3, "movePlayerCamera");
    if (!result.success) return result;

    try
    {
        Vec3 offset = ScriptTypeExtractor::ExtractVec3(args, 0);
        m_game->MovePlayerCamera(offset);
        return ScriptMethodResult::Success(std::string("相機位置已移動: (" +
            std::to_string(offset.x) + ", " +
            std::to_string(offset.y) + ", " +
            std::to_string(offset.z) + ")"));
    }
    catch (const std::exception& e)
    {
        return ScriptMethodResult::Error("移動玩家相機失敗: " + std::string(e.what()));
    }
}

ScriptMethodResult GameScriptInterface::ExecuteRender(const std::vector<std::any>& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 0, "Render");
    if (!result.success) return result;

    try
    {
        m_game->Render();
        return ScriptMethodResult::Success(Stringf("Render Success"));
    }
    catch (const std::exception& e)
    {
        return ScriptMethodResult::Error("Render failed: " + std::string(e.what()));
    }
}

ScriptMethodResult GameScriptInterface::ExecuteUpdate(const std::vector<std::any>& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 2, "Update");
    if (!result.success) return result;

    try
    {
        float gameDeltaSeconds   = ScriptTypeExtractor::ExtractFloat(args[0]);
        float systemDeltaSeconds = ScriptTypeExtractor::ExtractFloat(args[1]);

        m_game->Update(gameDeltaSeconds, systemDeltaSeconds);
        return ScriptMethodResult::Success(Stringf("Update Success"));
    }
    catch (std::exception const& e)
    {
        return ScriptMethodResult::Error("Update failed: " + std::string(e.what()));
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteJavaScriptCommand(const std::vector<std::any>& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 1, "executeCommand");
    if (!result.success) return result;

    try
    {
        std::string command = ScriptTypeExtractor::ExtractString(args[0]);
        m_game->ExecuteJavaScriptCommand(command);
        return ScriptMethodResult::Success(std::string("指令執行: " + command));
    }
    catch (std::exception const& e)
    {
        return ScriptMethodResult::Error("執行 JavaScript 指令失敗: " + std::string(e.what()));
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteJavaScriptFile(const std::vector<std::any>& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 1, "executeFile");
    if (!result.success) return result;

    try
    {
        std::string filename = ScriptTypeExtractor::ExtractString(args[0]);
        m_game->ExecuteJavaScriptFile(filename);
        return ScriptMethodResult::Success(std::string("檔案執行: " + filename));
    }
    catch (std::exception const& e)
    {
        return ScriptMethodResult::Error("執行 JavaScript 檔案失敗: " + std::string(e.what()));
    }
}

//----------------------------------------------------------------------------------------------------
ScriptMethodResult GameScriptInterface::ExecuteIsAttractMode(const std::vector<std::any>& args)
{
    auto result = ScriptTypeExtractor::ValidateArgCount(args, 0, "isAttractMode");
    if (!result.success) return result;

    try
    {
        bool isAttract = m_game->IsAttractMode();
        return ScriptMethodResult::Success(isAttract);
    }
    catch (std::exception const& e)
    {
        return ScriptMethodResult::Error("檢查吸引模式失敗: " + std::string(e.what()));
    }
}