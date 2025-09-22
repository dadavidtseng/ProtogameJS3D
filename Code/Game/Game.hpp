//----------------------------------------------------------------------------------------------------
// Game.hpp
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
#pragma once
#include <string>
#include <vector>
#include "Engine/Core/StringUtils.hpp"
#include "Engine/Renderer/VertexUtils.hpp"

//----------------------------------------------------------------------------------------------------
class Camera;
class Clock;
class Player;
class Prop;

//----------------------------------------------------------------------------------------------------
enum class eGameState : uint8_t
{
    ATTRACT,
    GAME
};

//----------------------------------------------------------------------------------------------------
class Game
{
public:
    Game();
    ~Game();

    void PostInit();
    void UpdateJS();
    void RenderJS();
    bool IsAttractMode() const;

    // 新增：JavaScript 相關功能
    void ExecuteJavaScriptCommand(String const& command);
    void ExecuteJavaScriptFile(String const& filename);
    void HandleJavaScriptCommands();

    // SCRIPT REGISTRY: Chrome DevTools selective integration
    void ExecuteJavaScriptCommandForDebug(const std::string& command, const std::string& scriptName);
    void ExecuteJavaScriptFileForDebug(const std::string& filename);

    // 新增：JavaScript 回呼函數需要的遊戲功能
    void    CreateCube(Vec3 const& position);
    void    MoveProp(int propIndex, Vec3 const& newPosition);
    void    MovePlayerCamera(Vec3 const& offset);
    Player* GetPlayer();
    void    Update(float gameDeltaSeconds, float systemDeltaSeconds);
    void    Render();

    // 新增：控制台命令處理
    void HandleConsoleCommands();

private:
    void UpdateFromKeyBoard();
    void UpdateFromController();
    void UpdateEntities(float gameDeltaSeconds, float systemDeltaSeconds) const;
    void RenderAttractMode() const;
    void RenderEntities() const;

    void SpawnPlayer();
    void InitPlayer() const;
    void SpawnProps();
    void InitProps() const;


    void SetupJavaScriptBindings();
    void InitializeJavaScriptFramework();

    Camera*            m_screenCamera = nullptr;
    Player*            m_player       = nullptr;
    Clock*             m_gameClock    = nullptr;
    std::vector<Prop*> m_props;
    eGameState         m_gameState = eGameState::ATTRACT;

    Vec3 m_originalPlayerPosition = Vec3(-2.f, 0.f, 1.f);  // 儲存原始位置
    bool m_cameraShakeActive      = false;                        // 追蹤震動狀態
};
