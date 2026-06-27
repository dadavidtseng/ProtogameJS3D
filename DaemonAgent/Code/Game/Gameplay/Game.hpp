//----------------------------------------------------------------------------------------------------
// Game.hpp
//----------------------------------------------------------------------------------------------------
#pragma once

#include "Engine/Core/StringUtils.hpp"
#include "Engine/Entity/EntityStateBuffer.hpp"
#include "Engine/Script/IJSGameLogicContext.hpp"

#include <atomic>

//----------------------------------------------------------------------------------------------------
class Game : public IJSGameLogicContext
{
public:
    Game();
    ~Game();

    void PostInit();
    void UpdateJS();
    void RenderJS();
    void ShowSimpleDemoWindow();

    bool IsAttractMode() const;

    // JavaScript execution
    void ExecuteJavaScriptCommand(String const& command);
    void ExecuteJavaScriptFile(String const& filename);
    void ExecuteModuleFile(String const& modulePath);

    // IJSGameLogicContext interface (worker thread)
    void UpdateJSWorkerThread(float deltaTime) override;
    void RenderJSWorkerThread(float deltaTime) override;
    void HandleJSException(char const* errorMessage, char const* stackTrace) override;

    // JavaScript error monitoring
    uint64_t GetJSExceptionCount() const { return m_jsExceptionCount.load(std::memory_order_relaxed); }
    bool     HasJSExceptions() const { return m_jsExceptionCount.load(std::memory_order_relaxed) > 0; }
    void     ResetJSExceptionCount() { m_jsExceptionCount.store(0, std::memory_order_relaxed); }

private:
    void InitializeJavaScriptFramework();
    bool IsScriptSubsystemReady() const;
    bool IsJSEngineReady(char const* methodName) const;

    bool                    m_showDemoWindow = true;
    std::atomic<uint64_t>   m_jsExceptionCount{0};
};
