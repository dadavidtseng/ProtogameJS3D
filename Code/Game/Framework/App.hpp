//----------------------------------------------------------------------------------------------------
// App.hpp
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
#pragma once
#include <memory>

#include "Game/Framework/GameScriptInterface.hpp"

#include "Engine/Audio/AudioScriptInterface.hpp"
#include "Engine/Core/EventSystem.hpp"
#include "Engine/Input/InputScriptInterface.hpp"

//-Forward-Declaration--------------------------------------------------------------------------------
class Camera;

//----------------------------------------------------------------------------------------------------
class App
{
public:
    App()  = default;
    ~App() = default;

    void Startup();
    void Shutdown();
    void RunFrame();

    void RunMainLoop();

    static bool OnCloseButtonClicked(EventArgs& args);
    static void RequestQuit();
    static bool m_isQuitting;

private:
    void BeginFrame() const;
    void Update();
    void Render() const;
    void EndFrame() const;

    static std::any OnPrint(std::vector<std::any> const& args);
    static std::any OnDebug(std::vector<std::any> const& args);
    static std::any OnGarbageCollection(std::vector<std::any> const& args);

    void UpdateCursorMode();
    void SetupScriptingBindings();

    Camera*                                m_devConsoleCamera = nullptr;
    std::shared_ptr<GameScriptInterface>   m_gameScriptInterface;
    std::shared_ptr<InputScriptInterface>  m_inputScriptInterface;
    std::shared_ptr<AudioScriptInterface>  m_audioScriptInterface;
};
