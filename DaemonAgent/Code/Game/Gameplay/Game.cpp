//----------------------------------------------------------------------------------------------------
// Game.cpp
//----------------------------------------------------------------------------------------------------

// Prevent Windows.h min/max macros from conflicting with V8 and standard library
#ifndef NOMINMAX
#define NOMINMAX
#endif

#include "Game/Gameplay/Game.hpp"

#include "Engine/Core/Clock.hpp"
#include "Engine/Core/EngineCommon.hpp"
#include "Engine/Core/ErrorWarningAssert.hpp"
#include "Engine/Core/LogSubsystem.hpp"
#include "Engine/Platform/Window.hpp"
#include "Engine/Resource/ResourceSubsystem.hpp"
#include "Engine/Script/ModuleLoader.hpp"
#include "Engine/Script/ScriptSubsystem.hpp"
#include "ThirdParty/imgui/imgui.h"

#include <any>
#include <typeinfo>

//----------------------------------------------------------------------------------------------------
Game::Game()
{
    DAEMON_LOG(LogGame, eLogVerbosity::Log, "(Game::Game)");
}

//----------------------------------------------------------------------------------------------------
Game::~Game()
{
    DAEMON_LOG(LogGame, eLogVerbosity::Log, "(Game::~Game)");
}

//----------------------------------------------------------------------------------------------------
void Game::PostInit()
{
    InitializeJavaScriptFramework();
}

//----------------------------------------------------------------------------------------------------
void Game::UpdateJS()
{
    if (IsScriptSubsystemReady())
    {
        float const deltaSeconds = static_cast<float>(Clock::GetSystemClock().GetDeltaSeconds());
        ExecuteJavaScriptCommand(StringFormat("globalThis.JSEngine.update({});", std::to_string(deltaSeconds)));
    }

    // ImGui Debug Window
    ImGui::Begin("SimpleMiner Debug", nullptr, ImGuiWindowFlags_AlwaysAutoResize);

    ImGui::Text("IMGUI Integration Successful!");
    ImGui::Separator();

    ImGui::Text("Game Stats:");

    ImGui::Separator();
    ImGui::Text("Phase 0: Prerequisites");
    ImGui::BulletText("Task 0.1: IMGUI Integration - COMPLETE");
    ImGui::BulletText("Task 0.2: Curve Editor - Pending");
    ImGui::BulletText("Task 0.3: Chunk Regen Controls - Pending");
    ImGui::BulletText("Task 0.4: Noise Visualization - Pending");

    ImGui::Separator();
    ImGui::Text("ImGui Windows:");

    if (ImGui::Button(m_showDemoWindow ? "Hide Demo Window" : "Show Demo Window"))
    {
        m_showDemoWindow = !m_showDemoWindow;
    }

    if (m_showDemoWindow)
    {
        ShowSimpleDemoWindow();
    }

    ImGui::End();
}

//----------------------------------------------------------------------------------------------------
void Game::RenderJS()
{
    if (IsScriptSubsystemReady())
    {
        ExecuteJavaScriptCommand("globalThis.JSEngine.render();");
    }
}

void Game::ShowSimpleDemoWindow()
{
    ImGui::Begin("ImGui Demo Window", nullptr, ImGuiWindowFlags_AlwaysAutoResize);

    if (ImGui::CollapsingHeader("Basic Widgets"))
    {
        // Buttons
        if (ImGui::Button("Button"))
        {
            // Handle button click
        }
        ImGui::SameLine();
        if (ImGui::Button("Another Button"))
        {
            // Handle button click
        }

        // Checkbox
        static bool checkbox_val = false;
        ImGui::Checkbox("Enable Feature", &checkbox_val);

        // Radio buttons
        static int radio_option = 0;
        ImGui::RadioButton("Option A", &radio_option, 0);
        ImGui::SameLine();
        ImGui::RadioButton("Option B", &radio_option, 1);
        ImGui::SameLine();
        ImGui::RadioButton("Option C", &radio_option, 2);
    }

    if (ImGui::CollapsingHeader("Sliders"))
    {
        // Float slider
        static float float_val = 0.0f;
        ImGui::SliderFloat("Float Slider", &float_val, 0.0f, 1.0f);

        // Int slider
        static int int_val = 0;
        ImGui::SliderInt("Int Slider", &int_val, 0, 100);

        // Range slider
        static float range_val = 0.0f;
        ImGui::SliderFloat("Range Slider", &range_val, -10.0f, 10.0f);
    }

    if (ImGui::CollapsingHeader("Color Controls"))
    {
        // Color picker
        static float color[4] = { 1.0f, 1.0f, 1.0f, 1.0f };
        ImGui::ColorEdit3("Color", color);

        // Color button
        static ImVec4 color_button = ImVec4(1.0f, 0.0f, 0.0f, 1.0f);
        if (ImGui::ColorButton("Color Button", color_button))
        {
            // Handle color selection
        }
    }

    if (ImGui::CollapsingHeader("Text Input"))
    {
        // Text input
        static char text_buf[256] = "Hello, ImGui!";
        ImGui::InputText("Text Input", text_buf, sizeof(text_buf));

        // Multiline text
        static char text_multiline[1024] = "This is a\nmultiline\n text area.";
        ImGui::InputTextMultiline("Multiline", text_multiline, sizeof(text_multiline));
    }

    if (ImGui::CollapsingHeader("Progress Bars"))
    {
        // Progress bar
        static float progress = 0.0f;
        ImGui::ProgressBar(progress, ImVec2(200, 0));
        ImGui::SameLine();
        ImGui::Text("Progress: %.0f%%", progress * 100);

        if (ImGui::Button("Add 25%"))
        {
            progress = (std::min)(progress + 0.25f, 1.0f);
        }
        ImGui::SameLine();
        if (ImGui::Button("Reset"))
        {
            progress = 0.0f;
        }
    }

    if (ImGui::CollapsingHeader("Simple Tree"))
    {
        if (ImGui::TreeNode("Root Node"))
        {
            if (ImGui::TreeNode("Child 1"))
            {
                ImGui::Text("Leaf content 1");
                ImGui::TreePop();
            }

            if (ImGui::TreeNode("Child 2"))
            {
                ImGui::Text("Leaf content 2");
                if (ImGui::TreeNode("Sub-child"))
                {
                    ImGui::Text("Sub-leaf content");
                    ImGui::TreePop();
                }
                ImGui::TreePop();
            }

            ImGui::TreePop();
        }
    }

    // Advanced Input Widgets
    if (ImGui::CollapsingHeader("Advanced Input"))
    {
        static float drag_float = 0.0f;
        ImGui::DragFloat("Drag Float", &drag_float, 0.01f, 0.0f, 100.0f);
        if (ImGui::IsItemHovered())
            ImGui::SetTooltip("Drag to adjust value");

        static float input_float = 0.0f;
        ImGui::InputFloat("Input Float", &input_float);

        static int input_int = 0;
        ImGui::InputInt("Input Int", &input_int);

        static float angle = 0.0f;
        ImGui::SliderAngle("Rotation", &angle);

        static float vec3[3] = { 0.0f, 0.0f, 0.0f };
        ImGui::DragFloat3("Position", vec3, 0.1f);
    }

    // Tables & Data Display
    if (ImGui::CollapsingHeader("Tables"))
    {
        if (ImGui::BeginTable("DemoTable", 3, ImGuiTableFlags_Borders | ImGuiTableFlags_RowBg))
        {
            ImGui::TableSetupColumn("Name");
            ImGui::TableSetupColumn("Type");
            ImGui::TableSetupColumn("Value");
            ImGui::TableHeadersRow();

            ImGui::TableNextRow();
            ImGui::TableSetColumnIndex(0);
            ImGui::Text("Position");
            ImGui::TableSetColumnIndex(1);
            ImGui::Text("Vec3");
            ImGui::TableSetColumnIndex(2);
            ImGui::Text("(10.0, 5.0, 2.0)");

            ImGui::TableNextRow();
            ImGui::TableSetColumnIndex(0);
            ImGui::Text("Health");
            ImGui::TableSetColumnIndex(1);
            ImGui::Text("Int");
            ImGui::TableSetColumnIndex(2);
            ImGui::Text("100");

            ImGui::TableNextRow();
            ImGui::TableSetColumnIndex(0);
            ImGui::Text("Speed");
            ImGui::TableSetColumnIndex(1);
            ImGui::Text("Float");
            ImGui::TableSetColumnIndex(2);
            ImGui::Text("5.5");

            ImGui::EndTable();
        }
    }

    // Tabs
    if (ImGui::CollapsingHeader("Tabs"))
    {
        if (ImGui::BeginTabBar("DemoTabs"))
        {
            if (ImGui::BeginTabItem("Tab 1"))
            {
                ImGui::Text("This is Tab 1 content");
                ImGui::BulletText("Feature A");
                ImGui::BulletText("Feature B");
                ImGui::EndTabItem();
            }
            if (ImGui::BeginTabItem("Tab 2"))
            {
                ImGui::Text("This is Tab 2 content");
                ImGui::BulletText("Setting X");
                ImGui::BulletText("Setting Y");
                ImGui::EndTabItem();
            }
            if (ImGui::BeginTabItem("Tab 3"))
            {
                ImGui::Text("This is Tab 3 content");
                static bool option_enabled = false;
                ImGui::Checkbox("Enable Option", &option_enabled);
                ImGui::EndTabItem();
            }
            ImGui::EndTabBar();
        }
    }

    // Child Windows & Scrolling
    if (ImGui::CollapsingHeader("Child Windows"))
    {
        ImGui::Text("Scrollable child region:");
        ImGui::BeginChild("ChildRegion", ImVec2(0, 100), true, ImGuiWindowFlags_HorizontalScrollbar);
        for (int i = 0; i < 20; i++)
        {
            ImGui::Text("Line %d - This is a scrollable content area", i);
        }
        ImGui::EndChild();
    }

    // Popups & Modals
    if (ImGui::CollapsingHeader("Popups & Modals"))
    {
        if (ImGui::Button("Open Modal"))
        {
            ImGui::OpenPopup("DemoModal");
        }

        if (ImGui::BeginPopupModal("DemoModal", nullptr, ImGuiWindowFlags_AlwaysAutoResize))
        {
            ImGui::Text("This is a modal dialog");
            ImGui::Separator();
            ImGui::Text("Click OK to close");

            if (ImGui::Button("OK", ImVec2(120, 0)))
            {
                ImGui::CloseCurrentPopup();
            }
            ImGui::EndPopup();
        }

        ImGui::SameLine();
        if (ImGui::Button("Right-Click Menu"))
        {
            ImGui::OpenPopup("ContextMenu");
        }

        if (ImGui::BeginPopup("ContextMenu"))
        {
            if (ImGui::Selectable("Option 1")) { /* Handle option 1 */ }
            if (ImGui::Selectable("Option 2")) { /* Handle option 2 */ }
            if (ImGui::Selectable("Option 3")) { /* Handle option 3 */ }
            ImGui::EndPopup();
        }
    }

    // Plotting
    if (ImGui::CollapsingHeader("Plotting"))
    {
        static float values[90] = {};
        static int values_offset = 0;
        static float refresh_time = 0.0f;

        // Generate sine wave data
        if (refresh_time == 0.0f)
        {
            for (int i = 0; i < 90; i++)
            {
                values[i] = sinf(i * 0.1f);
            }
        }
        refresh_time += 0.016f;

        ImGui::PlotLines("Sine Wave", values, 90, values_offset, nullptr, -1.0f, 1.0f, ImVec2(0, 80));

        static float histogram[10] = { 0.1f, 0.3f, 0.5f, 0.7f, 0.9f, 0.7f, 0.5f, 0.3f, 0.2f, 0.1f };
        ImGui::PlotHistogram("Histogram", histogram, 10, 0, nullptr, 0.0f, 1.0f, ImVec2(0, 80));
    }

    ImGui::End();
}

//----------------------------------------------------------------------------------------------------
bool Game::IsAttractMode() const
{
    if (!IsScriptSubsystemReady())
    {
        return false;
    }

    try
    {
        std::any result = g_scriptSubsystem->ExecuteScriptWithResult(
            "globalThis.jsGameInstance ? globalThis.jsGameInstance.gameState : 'GAME'");

        if (result.type() == typeid(std::string))
        {
            return std::any_cast<std::string>(result) == "ATTRACT";
        }
    }
    catch (...)
    {
        // Default to non-attract mode on error
    }

    return false;
}

//----------------------------------------------------------------------------------------------------
void Game::ExecuteJavaScriptCommand(String const& command)
{
    if (g_scriptSubsystem == nullptr)
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, "(Game::ExecuteJavaScriptCommand) g_scriptSubsystem is nullptr");
        return;
    }

    if (!g_scriptSubsystem->IsInitialized())
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error,
            StringFormat("(Game::ExecuteJavaScriptCommand) ScriptSubsystem not initialized | {}", command));
        return;
    }

    if (!g_scriptSubsystem->ExecuteScript(command))
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, "(Game::ExecuteJavaScriptCommand) execution failed");

        if (g_scriptSubsystem->HasError())
        {
            DAEMON_LOG(LogGame, eLogVerbosity::Error,
                StringFormat("(Game::ExecuteJavaScriptCommand) error: {}", g_scriptSubsystem->GetLastError()));
        }
    }
}

//----------------------------------------------------------------------------------------------------
void Game::ExecuteJavaScriptFile(String const& filename)
{
    if (g_scriptSubsystem == nullptr)
    {
        ERROR_AND_DIE("(Game::ExecuteJavaScriptFile) g_scriptSubsystem is nullptr");
    }
    if (!g_scriptSubsystem->IsInitialized())
    {
        ERROR_AND_DIE("(Game::ExecuteJavaScriptFile) g_scriptSubsystem is not initialized");
    }

    DAEMON_LOG(LogGame, eLogVerbosity::Log, StringFormat("(Game::ExecuteJavaScriptFile)(start) {}", filename));

    if (!g_scriptSubsystem->ExecuteScriptFile(filename))
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, StringFormat("(Game::ExecuteJavaScriptFile)(fail) {}", filename));

        if (g_scriptSubsystem->HasError())
        {
            DAEMON_LOG(LogGame, eLogVerbosity::Error,
                StringFormat("(Game::ExecuteJavaScriptFile)(error) {}", g_scriptSubsystem->GetLastError()));
        }
        return;
    }

    DAEMON_LOG(LogGame, eLogVerbosity::Log, StringFormat("(Game::ExecuteJavaScriptFile)(end) {}", filename));
}

//----------------------------------------------------------------------------------------------------
void Game::ExecuteModuleFile(String const& modulePath)
{
    if (g_scriptSubsystem == nullptr)
    {
        ERROR_AND_DIE("(Game::ExecuteModuleFile) g_scriptSubsystem is nullptr");
    }
    if (!g_scriptSubsystem->IsInitialized())
    {
        ERROR_AND_DIE("(Game::ExecuteModuleFile) g_scriptSubsystem is not initialized");
    }

    DAEMON_LOG(LogGame, eLogVerbosity::Log, StringFormat("(Game::ExecuteModuleFile)(start) {}", modulePath));

    if (!g_scriptSubsystem->ExecuteModule(modulePath))
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, StringFormat("(Game::ExecuteModuleFile)(fail) {}", modulePath));

        if (g_scriptSubsystem->HasError())
        {
            DAEMON_LOG(LogGame, eLogVerbosity::Error,
                StringFormat("(Game::ExecuteModuleFile)(error) {}", g_scriptSubsystem->GetLastError()));
        }
        return;
    }

    DAEMON_LOG(LogGame, eLogVerbosity::Log, StringFormat("(Game::ExecuteModuleFile)(end) {}", modulePath));
}

//----------------------------------------------------------------------------------------------------
void Game::InitializeJavaScriptFramework()
{
    DAEMON_LOG(LogGame, eLogVerbosity::Display, "(Game::InitializeJavaScriptFramework) start");

    if (!IsScriptSubsystemReady())
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, "(Game::InitializeJavaScriptFramework) ScriptSubsystem not available");
        return;
    }

    try
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Display, "Loading main.js (ES6 module entry point)...");
        ExecuteModuleFile("Data/Scripts/main.js");

        if (IsJSEngineReady("update"))
        {
            DAEMON_LOG(LogGame, eLogVerbosity::Display,
                "(Game::InitializeJavaScriptFramework) SUCCESS - globalThis.JSEngine verified");
        }
        else
        {
            DAEMON_LOG(LogGame, eLogVerbosity::Error,
                "(Game::InitializeJavaScriptFramework) FAILED - globalThis.JSEngine not found after loading main.js");
        }

        DAEMON_LOG(LogGame, eLogVerbosity::Display, "(Game::InitializeJavaScriptFramework) complete");
    }
    catch (...)
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, "(Game::InitializeJavaScriptFramework) exception occurred");
    }
}

//----------------------------------------------------------------------------------------------------
// IJSGameLogicContext Interface (Worker Thread)
//----------------------------------------------------------------------------------------------------

void Game::UpdateJSWorkerThread(float deltaTime)
{
    if (!IsScriptSubsystemReady())
    {
        return;
    }

    if (IsJSEngineReady("update"))
    {
        ExecuteJavaScriptCommand(StringFormat("globalThis.JSEngine.update({});", std::to_string(deltaTime)));
    }
    else
    {
        // Throttled warning (once per second)
        static float lastWarningTime = 0.0f;
        float currentTime = static_cast<float>(Clock::GetSystemClock().GetTotalSeconds());

        if (currentTime - lastWarningTime >= 1.0f)
        {
            DAEMON_LOG(LogScript, eLogVerbosity::Warning,
                "UpdateJSWorkerThread: globalThis.JSEngine not initialized - skipping JavaScript update");
            lastWarningTime = currentTime;
        }
    }
}

//----------------------------------------------------------------------------------------------------
void Game::RenderJSWorkerThread(float deltaTime)
{
    if (!IsScriptSubsystemReady())
    {
        return;
    }

    if (IsJSEngineReady("render"))
    {
        ExecuteJavaScriptCommand("globalThis.JSEngine.render();");
    }
}
//----------------------------------------------------------------------------------------------------
void Game::HandleJSException(char const* errorMessage, char const* stackTrace)
{
    uint64_t exceptionNumber = m_jsExceptionCount.fetch_add(1, std::memory_order_relaxed) + 1;

    DAEMON_LOG(LogGame, eLogVerbosity::Error, StringFormat("=== JavaScript Exception #{} ===", exceptionNumber));

    if (errorMessage && errorMessage[0] != '\0')
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, StringFormat("Error: {}", errorMessage));
    }

    if (stackTrace && stackTrace[0] != '\0')
    {
        DAEMON_LOG(LogGame, eLogVerbosity::Error, StringFormat("Stack Trace:\n{}", stackTrace));
    }

    DAEMON_LOG(LogGame, eLogVerbosity::Error, "=== End JavaScript Exception ===");
}

//----------------------------------------------------------------------------------------------------
// Helper Methods
//----------------------------------------------------------------------------------------------------

bool Game::IsScriptSubsystemReady() const
{
    return g_scriptSubsystem != nullptr && g_scriptSubsystem->IsInitialized();
}

//----------------------------------------------------------------------------------------------------
bool Game::IsJSEngineReady(char const* methodName) const
{
    if (!IsScriptSubsystemReady())
    {
        return false;
    }

    String checkCode = StringFormat(
        "typeof globalThis.JSEngine !== 'undefined' && typeof globalThis.JSEngine.{} === 'function'",
        methodName);

    if (g_scriptSubsystem->ExecuteScript(checkCode))
    {
        return g_scriptSubsystem->GetLastResult() == "true";
    }

    return false;
}
