//----------------------------------------------------------------------------------------------------
// GameScriptInterface.hpp
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
#pragma once
//----------------------------------------------------------------------------------------------------
#include "Engine/Script/IScriptableObject.hpp"

//-Forward-Declaration--------------------------------------------------------------------------------
class Game;

//----------------------------------------------------------------------------------------------------
class GameScriptInterface : public IScriptableObject
{
public:
    explicit GameScriptInterface(Game* game);

    std::vector<ScriptMethodInfo> GetAvailableMethods() const override;
    StringList                    GetAvailableProperties() const override;

    ScriptMethodResult CallMethod(String const& methodName, ScriptArgs const& args) override;
    std::any           GetProperty(String const& propertyName) const override;
    bool               SetProperty(String const& propertyName, std::any const& value) override;

private:
    Game* m_game;

    void InitializeMethodRegistry() override;

    ScriptMethodResult ExecuteAppRequestQuit(ScriptArgs const& args);
    ScriptMethodResult ExecuteJavaScriptCommand(ScriptArgs const& args);
    ScriptMethodResult ExecuteJavaScriptFile(ScriptArgs const& args);

    // Phase 6a: KADI Development Tools - File Operations
    ScriptMethodResult ExecuteCreateScriptFile(ScriptArgs const& args);
    ScriptMethodResult ExecuteReadScriptFile(ScriptArgs const& args);
    ScriptMethodResult ExecuteDeleteScriptFile(ScriptArgs const& args);

    // Phase 6a: KADI Development Tools - Input Injection
    ScriptMethodResult ExecuteInjectKeyPress(ScriptArgs const& args);
    ScriptMethodResult ExecuteInjectKeyHold(ScriptArgs const& args);
    ScriptMethodResult ExecuteKeyHoldSequence(const std::string& keySequenceJson);
    ScriptMethodResult ExecuteGetKeyHoldStatus(ScriptArgs const& args);
    ScriptMethodResult ExecuteCancelKeyHold(ScriptArgs const& args);
    ScriptMethodResult ExecuteListActiveKeyHolds(ScriptArgs const& args);

    // Phase 6b: KADI Development Tools - FileWatcher Management
    ScriptMethodResult ExecuteAddWatchedFile(ScriptArgs const& args);
    ScriptMethodResult ExecuteRemoveWatchedFile(ScriptArgs const& args);
    ScriptMethodResult ExecuteGetWatchedFiles(ScriptArgs const& args);
};
