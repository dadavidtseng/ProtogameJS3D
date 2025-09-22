//----------------------------------------------------------------------------------------------------
// Game.cpp
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
#include "Game/Game.hpp"

#include "Engine/Core/Clock.hpp"
#include "Engine/Core/DevConsole.hpp"
#include "Engine/Core/EngineCommon.hpp"
#include "Engine/Core/ErrorWarningAssert.hpp"
#include "Engine/Core/LogSubsystem.hpp"
#include "Engine/Input/InputSystem.hpp"
#include "Engine/Math/RandomNumberGenerator.hpp"
#include "Engine/Platform/Window.hpp"
#include "Engine/Renderer/BitmapFont.hpp"
#include "Engine/Renderer/DebugRenderSystem.hpp"
#include "Engine/Renderer/Renderer.hpp"
#include "Engine/Resource/ResourceSubsystem.hpp"
#include "Engine/Resource/Resource/ModelResource.hpp"
#include "Engine/Scripting/V8Subsystem.hpp"
#include "Game/Framework/App.hpp"
#include "Game/Framework/GameCommon.hpp"
#include "Game/Player.hpp"
#include "Game/Prop.hpp"

#include <fstream>
#include <sstream>

//----------------------------------------------------------------------------------------------------
Game::Game()
{
    DAEMON_LOG(LogGame, eLogVerbosity::Log, Stringf("(Game::Game)(start)"));
    SpawnPlayer();
    SpawnProp();

    m_gameState    = eGameState::GAME;
    m_screenCamera = new Camera();

    Vec2 const bottomLeft = Vec2::ZERO;
    // Vec2 const screenTopRight = Vec2(SCREEN_SIZE_X, SCREEN_SIZE_Y);
    Vec2 clientDimensions = Window::s_mainWindow->GetClientDimensions();

    m_screenCamera->SetOrthoGraphicView(bottomLeft, clientDimensions);
    m_screenCamera->SetNormalizedViewport(AABB2::ZERO_TO_ONE);
    m_gameClock = new Clock(Clock::GetSystemClock());

    m_player->m_position     = Vec3(-2.f, 0.f, 1.f);
    m_firstCube->m_position  = Vec3(2.f, 2.f, 0.f);
    m_secondCube->m_position = Vec3(-2.f, -2.f, 0.f);
    m_sphere->m_position     = Vec3(10, -5, 1);
    m_grid->m_position       = Vec3::ZERO;

    DebugAddWorldBasis(Mat44(), -1.f);

    Mat44 transform;

    transform.SetIJKT3D(-Vec3::Y_BASIS, Vec3::X_BASIS, Vec3::Z_BASIS, Vec3(0.25f, 0.f, 0.25f));
    DebugAddWorldText("X-Forward", transform, 0.25f, Vec2::ONE, -1.f, Rgba8::RED);

    transform.SetIJKT3D(-Vec3::X_BASIS, -Vec3::Y_BASIS, Vec3::Z_BASIS, Vec3(0.f, 0.25f, 0.5f));
    DebugAddWorldText("Y-Left", transform, 0.25f, Vec2::ZERO, -1.f, Rgba8::GREEN);

    transform.SetIJKT3D(-Vec3::X_BASIS, Vec3::Z_BASIS, Vec3::Y_BASIS, Vec3(0.f, -0.25f, 0.25f));
    DebugAddWorldText("Z-Up", transform, 0.25f, Vec2(1.f, 0.f), -1.f, Rgba8::BLUE);

    DAEMON_LOG(LogGame, eLogVerbosity::Log, "(Game::Game)(end)");
}

//----------------------------------------------------------------------------------------------------
Game::~Game()
{
    DAEMON_LOG(LogGame, eLogVerbosity::Log, "(Game::~Game)(start)");

    m_props.clear();

    GAME_SAFE_RELEASE(m_gameClock);
    GAME_SAFE_RELEASE(m_grid);
    GAME_SAFE_RELEASE(m_sphere);
    GAME_SAFE_RELEASE(m_secondCube);
    GAME_SAFE_RELEASE(m_firstCube);
    GAME_SAFE_RELEASE(m_player);
    GAME_SAFE_RELEASE(m_screenCamera);

    DAEMON_LOG(LogGame, eLogVerbosity::Display, "Game::~Game() end");
}


void Game::PostInit()
{
    InitializeJavaScriptFramework();
    m_hasInitializedJS = true;
}

//----------------------------------------------------------------------------------------------------
void Game::Update()
{
    // Temporarily disable JavaScript calls to test for buffer overrun
    // Update JavaScript framework - this will call the actual C++ Update(float,float)
    if (m_hasInitializedJS && g_v8Subsystem && g_v8Subsystem->IsInitialized())
    {
        float       deltaTimeMs = static_cast<float>(m_gameClock->GetDeltaSeconds() * 1000.0f);
        std::string updateCmd   = "globalThis.JSEngine.update(" + std::to_string(deltaTimeMs) + ");";
        ExecuteJavaScriptCommand(updateCmd);
    }
    // else
    // {
    //     // // Fallback: call the overloaded update directly if JS framework isn't ready
    //     // float const gameDeltaSeconds   = static_cast<float>(m_gameClock->GetDeltaSeconds());
    //     // float const systemDeltaSeconds = static_cast<float>(Clock::GetSystemClock().GetDeltaSeconds());
    //     // Update(gameDeltaSeconds, systemDeltaSeconds);
    // }

    // Handle additional JavaScript commands via keyboard
    // HandleJavaScriptCommands();
}

//----------------------------------------------------------------------------------------------------
void Game::Render()
{
    // Temporarily disable JavaScript calls to test for buffer overrun
    // Render JavaScript framework - this will call the actual C++ Render(float,float)
    if (m_hasInitializedJS && g_v8Subsystem && g_v8Subsystem->IsInitialized())
    {
        ExecuteJavaScriptCommand("globalThis.JSEngine.render();");
    }
    // else
    // {
    //     // // Fallback: call the overloaded render directly if JS framework isn't ready
    //     // float const gameDeltaSeconds   = static_cast<float>(m_gameClock->GetDeltaSeconds());
    //     // float const systemDeltaSeconds = static_cast<float>(Clock::GetSystemClock().GetDeltaSeconds());
    //     // Render(gameDeltaSeconds, systemDeltaSeconds);
    // }
}

//----------------------------------------------------------------------------------------------------
bool Game::IsAttractMode() const
{
    return m_gameState == eGameState::ATTRACT;
}

//----------------------------------------------------------------------------------------------------
void Game::UpdateFromKeyBoard()
{
    if (m_gameState == eGameState::ATTRACT)
    {
        if (g_input->WasKeyJustPressed(KEYCODE_ESC))
        {
            App::RequestQuit();
        }

        if (g_input->WasKeyJustPressed(KEYCODE_SPACE))
        {
            m_gameState = eGameState::GAME;
        }
    }

    if (m_gameState == eGameState::GAME)
    {
        if (g_input->WasKeyJustPressed(KEYCODE_G))
        {
            DAEMON_LOG(LogTemp, eLogVerbosity::Warning, "G");
        }
        if (g_input->WasKeyJustPressed(KEYCODE_ESC))
        {
            m_gameState = eGameState::ATTRACT;
        }

        if (g_input->WasKeyJustPressed(KEYCODE_P))
        {
            m_gameClock->TogglePause();
        }

        if (g_input->WasKeyJustPressed(KEYCODE_O))
        {
            m_gameClock->StepSingleFrame();
        }

        if (g_input->IsKeyDown(KEYCODE_T))
        {
            m_gameClock->SetTimeScale(0.1f);
        }

        if (g_input->WasKeyJustReleased(KEYCODE_T))
        {
            m_gameClock->SetTimeScale(1.f);
        }

        if (g_input->WasKeyJustPressed(NUMCODE_1))
        {
            Vec3 forward;
            Vec3 right;
            Vec3 up;
            m_player->m_orientation.GetAsVectors_IFwd_JLeft_KUp(forward, right, up);

            DebugAddWorldLine(m_player->m_position, m_player->m_position + forward * 20.f, 0.01f, 10.f, Rgba8(255, 255, 0), Rgba8(255, 255, 0), eDebugRenderMode::X_RAY);
        }

        if (g_input->IsKeyDown(NUMCODE_2))
        {
            DebugAddWorldPoint(Vec3(m_player->m_position.x, m_player->m_position.y, 0.f), 0.25f, 60.f, Rgba8(150, 75, 0), Rgba8(150, 75, 0));
        }

        if (g_input->WasKeyJustPressed(NUMCODE_3))
        {
            Vec3 forward;
            Vec3 right;
            Vec3 up;
            m_player->m_orientation.GetAsVectors_IFwd_JLeft_KUp(forward, right, up);

            DebugAddWorldWireSphere(m_player->m_position + forward * 2.f, 1.f, 5.f, Rgba8::GREEN, Rgba8::RED);
        }

        if (g_input->WasKeyJustPressed(NUMCODE_4))
        {
            DebugAddWorldBasis(m_player->GetModelToWorldTransform(), 20.f);
        }

        if (g_input->WasKeyJustReleased(NUMCODE_5))
        {
            float const  positionX    = m_player->m_position.x;
            float const  positionY    = m_player->m_position.y;
            float const  positionZ    = m_player->m_position.z;
            float const  orientationX = m_player->m_orientation.m_yawDegrees;
            float const  orientationY = m_player->m_orientation.m_pitchDegrees;
            float const  orientationZ = m_player->m_orientation.m_rollDegrees;
            String const text         = Stringf("Position: (%.2f, %.2f, %.2f)\nOrientation: (%.2f, %.2f, %.2f)", positionX, positionY, positionZ, orientationX, orientationY, orientationZ);

            Vec3 forward;
            Vec3 right;
            Vec3 up;
            m_player->m_orientation.GetAsVectors_IFwd_JLeft_KUp(forward, right, up);

            DebugAddBillboardText(text, m_player->m_position + forward, 0.1f, Vec2::HALF, 10.f, Rgba8::WHITE, Rgba8::RED);
        }

        if (g_input->WasKeyJustPressed(NUMCODE_6))
        {
            DebugAddWorldCylinder(m_player->m_position, m_player->m_position + Vec3::Z_BASIS * 2, 1.f, 10.f, true, Rgba8::WHITE, Rgba8::RED);
        }


        if (g_input->WasKeyJustReleased(NUMCODE_7))
        {
            float const orientationX = m_player->GetCamera()->GetOrientation().m_yawDegrees;
            float const orientationY = m_player->GetCamera()->GetOrientation().m_pitchDegrees;
            float const orientationZ = m_player->GetCamera()->GetOrientation().m_rollDegrees;

            DebugAddMessage(Stringf("Camera Orientation: (%.2f, %.2f, %.2f)", orientationX, orientationY, orientationZ), 5.f);
        }

        DebugAddMessage(Stringf("Player Position: (%.2f, %.2f, %.2f)", m_player->m_position.x, m_player->m_position.y, m_player->m_position.z), 0.f);
    }
}

//----------------------------------------------------------------------------------------------------
void Game::UpdateFromController()
{
    XboxController const& controller = g_input->GetController(0);

    if (m_gameState == eGameState::ATTRACT)
    {
        if (controller.WasButtonJustPressed(XBOX_BUTTON_BACK))
        {
            App::RequestQuit();
        }

        if (controller.WasButtonJustPressed(XBOX_BUTTON_START))
        {
            m_gameState = eGameState::GAME;
        }
    }

    if (m_gameState == eGameState::GAME)
    {
        if (controller.WasButtonJustPressed(XBOX_BUTTON_BACK))
        {
            m_gameState = eGameState::ATTRACT;
        }

        if (controller.WasButtonJustPressed(XBOX_BUTTON_B))
        {
            m_gameClock->TogglePause();
        }

        if (controller.WasButtonJustPressed(XBOX_BUTTON_Y))
        {
            m_gameClock->StepSingleFrame();
        }

        if (controller.WasButtonJustPressed(XBOX_BUTTON_X))
        {
            m_gameClock->SetTimeScale(0.1f);
        }

        if (controller.WasButtonJustReleased(XBOX_BUTTON_X))
        {
            m_gameClock->SetTimeScale(1.f);
        }
    }
}

//----------------------------------------------------------------------------------------------------
void Game::UpdateEntities(float const gameDeltaSeconds, float const systemDeltaSeconds) const
{
    // 更新玩家
    if (m_player)
    {
        m_player->Update(gameDeltaSeconds);
    }

    // 更新所有物件
    for (Prop* prop : m_props)
    {
        if (prop)
        {
            prop->Update(gameDeltaSeconds);
        }
    }
    // m_player->Update(systemDeltaSeconds);
    // m_firstCube->Update(gameDeltaSeconds);
    // m_secondCube->Update(gameDeltaSeconds);
    // m_sphere->Update(gameDeltaSeconds);
    // m_grid->Update(gameDeltaSeconds);

    m_firstCube->m_orientation.m_pitchDegrees += 30.f * gameDeltaSeconds;
    m_firstCube->m_orientation.m_rollDegrees += 30.f * gameDeltaSeconds;

    float const time       = static_cast<float>(m_gameClock->GetTotalSeconds());
    float const colorValue = (sinf(time) + 1.0f) * 0.5f * 255.0f;

    m_secondCube->m_color.r = static_cast<unsigned char>(colorValue);
    m_secondCube->m_color.g = static_cast<unsigned char>(colorValue);
    m_secondCube->m_color.b = static_cast<unsigned char>(colorValue);

    m_sphere->m_orientation.m_yawDegrees += 45.f * gameDeltaSeconds;

    DebugAddScreenText(Stringf("Time: %.2f\nFPS: %.2f\nScale: %.1f", m_gameClock->GetTotalSeconds(), 1.f / m_gameClock->GetDeltaSeconds(), m_gameClock->GetTimeScale()), m_screenCamera->GetOrthographicTopRight() - Vec2(250.f, 60.f), 20.f, Vec2::ZERO, 0.f, Rgba8::WHITE, Rgba8::WHITE);
}

//----------------------------------------------------------------------------------------------------
void Game::RenderAttractMode() const
{
    Vec2 clientDimensions = Window::s_mainWindow->GetClientDimensions();

    VertexList_PCU verts;
    AddVertsForDisc2D(verts, Vec2(clientDimensions.x * 0.5f, clientDimensions.y * 0.5f), 300.f, 10.f, Rgba8::YELLOW);
    g_renderer->SetModelConstants();
    g_renderer->SetBlendMode(eBlendMode::OPAQUE);
    g_renderer->SetRasterizerMode(eRasterizerMode::SOLID_CULL_BACK);
    g_renderer->SetSamplerMode(eSamplerMode::BILINEAR_CLAMP);
    g_renderer->SetDepthMode(eDepthMode::DISABLED);
    g_renderer->BindTexture(nullptr);
    g_renderer->BindShader(g_renderer->CreateOrGetShaderFromFile("Data/Shaders/Default"));
    g_renderer->DrawVertexArray(verts);
}

//----------------------------------------------------------------------------------------------------
void Game::RenderEntities() const
{
    m_firstCube->Render();
    m_secondCube->Render();
    m_sphere->Render();
    m_grid->Render();

    g_renderer->SetModelConstants(m_player->GetModelToWorldTransform());
    m_player->Render();

    for (Prop* prop : m_props)
    {
        prop->Render();
    }
}

//----------------------------------------------------------------------------------------------------
void Game::SpawnPlayer()
{
    m_player = new Player(this);
}

//----------------------------------------------------------------------------------------------------
void Game::SpawnProp()
{
    Texture const* texture = g_renderer->CreateOrGetTextureFromFile("Data/Images/TestUV.png");

    m_firstCube  = new Prop(this);
    m_secondCube = new Prop(this);
    m_sphere     = new Prop(this, texture);
    m_grid       = new Prop(this);

    m_firstCube->InitializeLocalVertsForCube();
    m_secondCube->InitializeLocalVertsForCube();
    m_sphere->InitializeLocalVertsForSphere();
    m_grid->InitializeLocalVertsForGrid();

    if (m_firstCube) m_props.push_back(m_firstCube);
    if (m_secondCube) m_props.push_back(m_secondCube);
    if (m_sphere) m_props.push_back(m_sphere);
    if (m_grid) m_props.push_back(m_grid);
}

//----------------------------------------------------------------------------------------------------
void Game::ExecuteJavaScriptCommand(String const& command)
{
    // DAEMON_LOG(LogGame, eLogVerbosity::Log, Stringf("Game::ExecuteJavaScriptCommand() start | %s", command.c_str()));

    if (g_v8Subsystem == nullptr)
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, Stringf("(Game::ExecuteJavaScriptCommand)(failed)(g_v8Subsystem is nullptr!)"));
        return;
    }

    if (!g_v8Subsystem->IsInitialized())
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, Stringf("(Game::ExecuteJavaScriptCommand) failed| %s | V8Subsystem is not initialized", command.c_str()));
        return;
    }

    bool const success = g_v8Subsystem->ExecuteScript(command);

    if (success)
    {
        String const result = g_v8Subsystem->GetLastResult();

        if (!result.empty())
        {
            DAEMON_LOG(LogGame, eLogVerbosity::Log, Stringf("Game::ExecuteJavaScriptCommand() result | %s", result.c_str()));
        }
    }
    else
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, Stringf("Game::ExecuteJavaScriptCommand() failed"));

        if (g_v8Subsystem->HasError())
        {
            DAEMON_LOG(LogGame, eLogVerbosity::Error, Stringf("Game::ExecuteJavaScriptCommand() error | %s", g_v8Subsystem->GetLastError().c_str()));
        }
    }

    // DAEMON_LOG(LogGame, eLogVerbosity::Log, Stringf("Game::ExecuteJavaScriptCommand() end | %s", command.c_str()));
}

//----------------------------------------------------------------------------------------------------
void Game::ExecuteJavaScriptCommandForDebug(String const& command, String const& scriptName)
{
    // Execute JavaScript command with Chrome DevTools integration for debugging
    // This method registers the script so it appears in DevTools Sources panel

    if (g_v8Subsystem == nullptr)
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, Stringf("Game::ExecuteJavaScriptCommandForDebug() failed| %s | V8Subsystem is nullptr", command.c_str()));
        return;
    }

    if (!g_v8Subsystem->IsInitialized())
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, Stringf("Game::ExecuteJavaScriptCommandForDebug() failed| %s | V8Subsystem is not initialized", command.c_str()));
        return;
    }

    // Use the registered script execution method for Chrome DevTools debugging
    bool const success = g_v8Subsystem->ExecuteRegisteredScript(command, scriptName);

    if (success)
    {
        String const result = g_v8Subsystem->GetLastResult();

        if (!result.empty())
        {
            DAEMON_LOG(LogGame, eLogVerbosity::Log, Stringf("Game::ExecuteJavaScriptCommandForDebug() result | %s", result.c_str()));
        }
    }
    else
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, Stringf("Game::ExecuteJavaScriptCommandForDebug() failed"));

        if (g_v8Subsystem->HasError())
        {
            DAEMON_LOG(LogGame, eLogVerbosity::Error, Stringf("Game::ExecuteJavaScriptCommandForDebug() error | %s", g_v8Subsystem->GetLastError().c_str()));
        }
    }
}

//----------------------------------------------------------------------------------------------------
void Game::ExecuteJavaScriptFileForDebug(String const& filename)
{
    // Load JavaScript file and execute it with Chrome DevTools integration for debugging
    // This method reads a script file and registers it so it appears in DevTools Sources panel

    if (g_v8Subsystem == nullptr)
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, Stringf("Game::ExecuteJavaScriptFileForDebug() failed| %s | V8Subsystem is nullptr", filename.c_str()));
        return;
    }

    if (!g_v8Subsystem->IsInitialized())
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, Stringf("Game::ExecuteJavaScriptFileForDebug() failed| %s | V8Subsystem is not initialized", filename.c_str()));
        return;
    }

    // Read the script file content
    std::string   fullPath = filename;
    std::ifstream file(fullPath);

    if (!file.is_open())
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, Stringf("Game::ExecuteJavaScriptFileForDebug() failed to open file: %s", filename.c_str()));
        return;
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string scriptContent = buffer.str();
    file.close();

    if (scriptContent.empty())
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Warning, Stringf("Game::ExecuteJavaScriptFileForDebug() file is empty: %s", filename.c_str()));
        return;
    }

    // Extract just the filename for the script name in DevTools
    std::string scriptName = filename;
    size_t      lastSlash  = scriptName.find_last_of("/\\");
    if (lastSlash != std::string::npos)
    {
        scriptName = scriptName.substr(lastSlash + 1);
    }

    DAEMON_LOG(LogGame, eLogVerbosity::Display, Stringf("Game::ExecuteJavaScriptFileForDebug() executing %s for Chrome DevTools debugging", filename.c_str()));

    // Use the registered script execution method for Chrome DevTools debugging
    bool const success = g_v8Subsystem->ExecuteRegisteredScript(scriptContent, scriptName);

    if (success)
    {
        String const result = g_v8Subsystem->GetLastResult();

        if (!result.empty())
        {
            DAEMON_LOG(LogGame, eLogVerbosity::Log, Stringf("Game::ExecuteJavaScriptFileForDebug() result | %s", result.c_str()));
        }
    }
    else
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, Stringf("Game::ExecuteJavaScriptFileForDebug() failed"));

        if (g_v8Subsystem->HasError())
        {
            DAEMON_LOG(LogGame, eLogVerbosity::Error, Stringf("Game::ExecuteJavaScriptFileForDebug() error | %s", g_v8Subsystem->GetLastError().c_str()));
        }
    }
}

//----------------------------------------------------------------------------------------------------
void Game::ExecuteJavaScriptFile(String const& filename)
{
    if (g_v8Subsystem == nullptr)ERROR_AND_DIE(StringFormat("(Game::ExecuteJavaScriptFile)(g_v8Subsystem is nullptr!)"))
    if (!g_v8Subsystem->IsInitialized())ERROR_AND_DIE(StringFormat("(Game::ExecuteJavaScriptFile)(g_v8Subsystem is not initialized!)"))

    DAEMON_LOG(LogGame, eLogVerbosity::Log, StringFormat("(Game::ExecuteJavaScriptFile)(start)({})", filename));

    bool const success = g_v8Subsystem->ExecuteScriptFile(filename);

    if (!success)
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, StringFormat("(Game::ExecuteJavaScriptFile)(fail)({})", filename));

        if (g_v8Subsystem->HasError())
        {
            DAEMON_LOG(LogGame, eLogVerbosity::Error, StringFormat("(Game::ExecuteJavaScriptFile)(fail)(error: {})", g_v8Subsystem->GetLastError()));
        }

        return;
    }

    DAEMON_LOG(LogGame, eLogVerbosity::Log, StringFormat("(Game::ExecuteJavaScriptFile)(end)({})", filename.c_str()));
}

//----------------------------------------------------------------------------------------------------
void Game::HandleJavaScriptCommands()
{
    // 處理動態 JavaScript 指令（例如從網路、檔案或其他來源）
    // 這裡可以加入定期檢查 JavaScript 指令的邏輯

    // 範例：檢查特定按鍵來執行預設腳本
    if (g_input->WasKeyJustPressed('J'))
    {
        // ExecuteJavaScriptCommand("console.log('J 鍵觸發的 JavaScript!');");
        ExecuteJavaScriptFile("Data/Scripts/test_scripts.js");
    }

    if (g_input->IsKeyDown('K'))
    {
        // ExecuteJavaScriptCommand("game.createCube(Math.random() * 10 - 5, 0, Math.random() * 10 - 5);");
        ExecuteJavaScriptCommand("game.moveProp(0, Math.random() * 10 - 5, 0, Math.random() * 10 - 5);");
    }

    if (g_input->WasKeyJustPressed('L'))
    {
        // ExecuteJavaScriptCommand("var pos = game.getPlayerPosition(); console.log('Player Position:', pos);");
        ExecuteJavaScriptCommand("debug('Player Position');");
        // ExecuteJavaScriptCommand("console.log('這是真的 JavaScript 輸出！'); 42;");
    }

    // SCRIPT REGISTRY: F2 Key - Register for Chrome DevTools debugging  
    if (g_input->WasKeyJustPressed(VK_F2))
    {
        ExecuteJavaScriptFileForDebug("Data/Scripts/F1_KeyHandler.js");
        // ExecuteJavaScriptCommandForDebug("toggleShouldRender()","Data/Scripts/F1_KeyHandler.js");
    }
    if (g_input->WasKeyJustPressed(VK_F3))
    {
        // ExecuteJavaScriptFileForDebug("Data/Scripts/F1_KeyHandler.js");
        ExecuteJavaScriptCommandForDebug("toggleShouldRender()", "Data/Scripts/F1_KeyHandler.js");
    }
}

//----------------------------------------------------------------------------------------------------
void Game::CreateCube(Vec3 const& position)
{
    DAEMON_LOG(LogScript, eLogVerbosity::Log, StringFormat("(Game::CreateCube)(start)(position ({:.2f}, {:.2f}, {:.2f}))", position.x, position.y, position.z));

    Prop* newCube       = new Prop(this);
    newCube->m_position = position;
    newCube->m_color    = Rgba8(
        static_cast<unsigned char>(g_rng->RollRandomIntInRange(100, 255)),
        static_cast<unsigned char>(g_rng->RollRandomIntInRange(100, 255)),
        static_cast<unsigned char>(g_rng->RollRandomIntInRange(100, 255)),
        255
    );
    newCube->InitializeLocalVertsForCube();

    m_props.push_back(newCube);

    DAEMON_LOG(LogScript, eLogVerbosity::Log, StringFormat("(Game::CreateCube)(end)(m_props size: {})", m_props.size()));
}

//----------------------------------------------------------------------------------------------------
void Game::MoveProp(int         propIndex,
                    Vec3 const& newPosition)
{
    if (propIndex >= 0 && propIndex < static_cast<int>(m_props.size()))
    {
        m_props[propIndex]->m_position = newPosition;
        DAEMON_LOG(LogScript, eLogVerbosity::Log, StringFormat("(Game::MoveProp)(end)(prop {} move to position ({:.2f}, {:.2f}, {:.2f}))", propIndex, newPosition.x, newPosition.y, newPosition.z));
    }
    else
    {
        DebuggerPrintf("警告：JavaScript 請求移動無效的物件索引 %d（總共 %zu 個物件）\n", propIndex, m_props.size());
    }
}

//----------------------------------------------------------------------------------------------------
Player* Game::GetPlayer()
{
    return m_player;
}

void Game::Update(float gameDeltaSeconds,
                  float systemDeltaSeconds)
{
    // Note: gameDeltaSeconds and systemDeltaSeconds are already passed in, don't recalculate
    gameDeltaSeconds   = static_cast<float>(m_gameClock->GetDeltaSeconds());
    systemDeltaSeconds = static_cast<float>(Clock::GetSystemClock().GetDeltaSeconds());

    UpdateEntities(gameDeltaSeconds, systemDeltaSeconds);
    UpdateFromKeyBoard();
    UpdateFromController();

    // Note: HandleJavaScriptCommands is now called from the main Update() method
    HandleJavaScriptCommands();
    HandleConsoleCommands();
}

void Game::Render(float gameDeltaSeconds, float systemDeltaSeconds)
{
    //-Start-of-Game-Camera---------------------------------------------------------------------------

    g_renderer->BeginCamera(*m_player->GetCamera());

    if (m_gameState == eGameState::GAME)
    {
        RenderEntities();
        Vec2 screenDimensions = Window::s_mainWindow->GetScreenDimensions();
        Vec2 windowDimensions = Window::s_mainWindow->GetWindowDimensions();
        Vec2 clientDimensions = Window::s_mainWindow->GetClientDimensions();
        Vec2 windowPosition   = Window::s_mainWindow->GetWindowPosition();
        Vec2 clientPosition   = Window::s_mainWindow->GetClientPosition();
        DebugAddScreenText(Stringf("ScreenDimensions=(%.1f,%.1f)", screenDimensions.x, screenDimensions.y), Vec2(0, 0), 20.f, Vec2::ZERO, 0.f);
        DebugAddScreenText(Stringf("WindowDimensions=(%.1f,%.1f)", windowDimensions.x, windowDimensions.y), Vec2(0, 20), 20.f, Vec2::ZERO, 0.f);
        DebugAddScreenText(Stringf("ClientDimensions=(%.1f,%.1f)", clientDimensions.x, clientDimensions.y), Vec2(0, 40), 20.f, Vec2::ZERO, 0.f);
        DebugAddScreenText(Stringf("WindowPosition=(%.1f,%.1f)", windowPosition.x, windowPosition.y), Vec2(0, 60), 20.f, Vec2::ZERO, 0.f);
        DebugAddScreenText(Stringf("ClientPosition=(%.1f,%.1f)", clientPosition.x, clientPosition.y), Vec2(0, 80), 20.f, Vec2::ZERO, 0.f);
        // 新增：JavaScript 狀態顯示
        if (g_v8Subsystem)
        {
            std::string jsStatus = g_v8Subsystem->IsInitialized() ? "JS:Initialized" : "JS:UnInitialized";
            DebugAddScreenText(jsStatus, Vec2(0, 100), 20.f, Vec2::ZERO, 0.f);

            if (g_v8Subsystem->HasError())
            {
                DebugAddScreenText("JS錯誤: " + g_v8Subsystem->GetLastError(), Vec2(0, 120), 15.f, Vec2::ZERO, 0.f, Rgba8::RED);
            }
        }
    }

    g_renderer->EndCamera(*m_player->GetCamera());

    //-End-of-Game-Camera-----------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------
    if (m_gameState == eGameState::GAME)
    {
        DebugRenderWorld(*m_player->GetCamera());
    }
    //------------------------------------------------------------------------------------------------
    //-Start-of-Screen-Camera-------------------------------------------------------------------------

    g_renderer->BeginCamera(*m_screenCamera);

    if (m_gameState == eGameState::ATTRACT)
    {
        RenderAttractMode();
    }

    g_renderer->EndCamera(*m_screenCamera);

    //-End-of-Screen-Camera---------------------------------------------------------------------------
    if (m_gameState == eGameState::GAME)
    {
        DebugRenderScreen(*m_screenCamera);
    }
}

//----------------------------------------------------------------------------------------------------
void Game::MovePlayerCamera(Vec3 const& offset)
{
    if (m_player)
    {
        if (!m_cameraShakeActive)
        {
            m_originalPlayerPosition = m_player->m_position;
            m_cameraShakeActive      = true;
            DebuggerPrintf("開始相機震動，原始位置: (%.3f, %.3f, %.3f)\n",
                           m_originalPlayerPosition.x, m_originalPlayerPosition.y, m_originalPlayerPosition.z);
        }

        // 基於原始位置計算新位置（而不是當前位置）
        Vec3 newPosition     = m_originalPlayerPosition + offset;
        m_player->m_position = newPosition;
    }
}

//----------------------------------------------------------------------------------------------------
void Game::HandleConsoleCommands()
{
    // 處理開發者控制台的 JavaScript 指令
    // 這需要與 DevConsole 整合

    if (g_devConsole && g_devConsole->IsOpen())
    {
        // 檢查控制台輸入是否為 JavaScript 指令
        // 這裡需要實作具體的控制台輸入檢查邏輯

        // 範例實作（需要 DevConsole 支援）:
        /*
        std::string input = g_theConsole->GetLastInput();
        if (input.substr(0, 3) == "js:")
        {
            std::string jsCommand = input.substr(3);
            ExecuteJavaScriptCommand(jsCommand);
        }
        else if (input.substr(0, 7) == "jsfile:")
        {
            std::string filename = input.substr(7);
            ExecuteJavaScriptFile(filename);
        }
        */
    }
}

//----------------------------------------------------------------------------------------------------
void Game::InitializeJavaScriptFramework()
{
    DAEMON_LOG(LogGame, eLogVerbosity::Display, "Game::InitializeJavaScriptFramework() start");

    if (!g_v8Subsystem || !g_v8Subsystem->IsInitialized())
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, "Game::InitializeJavaScriptFramework() failed - V8 not available");
        return;
    }

    try
    {
        // Load the JavaScript framework files in dependency order
        DAEMON_LOG(LogGame, eLogVerbosity::Display, "Loading JSEngine.js...");
        ExecuteJavaScriptFile("Data/Scripts/JSEngine.js");

        DAEMON_LOG(LogGame, eLogVerbosity::Display, "Loading InputSystem.js...");
        ExecuteJavaScriptFile("Data/Scripts/InputSystem.js");

        // Hot-reload system is now implemented in C++ (FileWatcher + ScriptReloader)
        // No longer need to load JavaScript hot-reload files

        DAEMON_LOG(LogGame, eLogVerbosity::Display, "Loading JSGame.js...");
        ExecuteJavaScriptFile("Data/Scripts/JSGame.js");

        DAEMON_LOG(LogGame, eLogVerbosity::Display, "Game::InitializeJavaScriptFramework() complete - C++ hot-reload system integrated");
    }
    catch (...)
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, "Game::InitializeJavaScriptFramework() exception occurred");
    }
}
