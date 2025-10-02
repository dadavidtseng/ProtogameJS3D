//----------------------------------------------------------------------------------------------------
// Game.hpp
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
#pragma once
//----------------------------------------------------------------------------------------------------
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
    void ValidatePhase1ModuleSystem();
    void ValidatePhase2ModuleSystem();
    void ValidatePhase3ModuleSystem();

    void ExecuteJavaScriptCommand(String const& command);
    void ExecuteJavaScriptFile(String const& filename);
    void HandleJavaScriptCommands();

    // SCRIPT REGISTRY: Chrome DevTools selective integration
    void ExecuteJavaScriptCommandForDebug(String const& command, String const& scriptName);
    void ExecuteJavaScriptFileForDebug(String const& filename);

    // JavaScript callback functions
    eGameState GetGameState() const;
    void       SetGameState(eGameState newState);
    void       CreateCube(Vec3 const& position);
    void       MoveProp(int propIndex, Vec3 const& newPosition);
    void       MovePlayerCamera(Vec3 const& offset);
    Player*    GetPlayer();
    void       Update(float gameDeltaSeconds, float systemDeltaSeconds);
    void       Render();


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

    Vec3 m_originalPlayerPosition = Vec3(-2.f, 0.f, 1.f);
    bool m_cameraShakeActive      = false;
};
