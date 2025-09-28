//----------------------------------------------------------------------------------------------------
// GameScriptInterface.hpp
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
#pragma once
#include "Engine/Scripting/IScriptableObject.hpp"
#include "Engine/Scripting/ScriptTypeExtractor.hpp"

//-Forward-Declaration--------------------------------------------------------------------------------
class Game;
class Player;
class ScriptSubsystem;
struct Vec3;

//----------------------------------------------------------------------------------------------------
class GameScriptInterface : public IScriptableObject
{
public:
    explicit GameScriptInterface(Game* game);
    ~GameScriptInterface() override;

    // 實作 IScriptableObject 介面
    std::string                   GetScriptObjectName() const override;
    std::vector<ScriptMethodInfo> GetAvailableMethods() const override;
    ScriptMethodResult            CallMethod(std::string const& methodName, std::vector<std::any> const& args) override;

    // 實作屬性存取
    std::any                 GetProperty(const std::string& propertyName) const override;
    bool                     SetProperty(const std::string& propertyName, const std::any& value) override;
    std::vector<std::string> GetAvailableProperties() const override;

private:
    Game* m_game;

    ScriptMethodResult ExecuteGetGameState(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteSetGameState(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteCreateCube(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteMoveProp(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteGetPlayerPosition(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteMovePlayerCamera(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteRender(std::vector<std::any> const& args);
    ScriptMethodResult ExecuteUpdate(std::vector<std::any> const& args);
    ScriptMethodResult ExecuteJavaScriptCommand(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteJavaScriptFile(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteIsAttractMode(const std::vector<std::any>& args);
};