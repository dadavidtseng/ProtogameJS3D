//----------------------------------------------------------------------------------------------------
// App.cpp
//----------------------------------------------------------------------------------------------------

// IMPORTANT: Define NOMINMAX before any Windows headers to prevent min/max macro conflicts with V8
#ifndef NOMINMAX
#define NOMINMAX
#endif

#include "Game/Framework/App.hpp"
//----------------------------------------------------------------------------------------------------
#include "Engine/Resource/MeshCache.hpp"
#include "Game/Framework/GameCommon.hpp"
#include "Game/Framework/JSGameLogicJob.hpp"
#include "Game/Gameplay/Game.hpp"
//----------------------------------------------------------------------------------------------------
#include "Engine/Audio/AudioStateBuffer.hpp"
#include "Engine/Audio/AudioSystem.hpp"
#include "Engine/Core/CallbackQueue.hpp"
#include "Engine/Core/CallbackQueueScriptInterface.hpp"
//----------------------------------------------------------------------------------------------------
#include <Windows.h>
#include <Psapi.h>
#pragma comment(lib, "Psapi.lib")
#include "Engine/Core/Clock.hpp"
#include "Engine/Core/DevConsole.hpp"
#include "Engine/Core/Engine.hpp"
#include "Engine/Core/EngineCommon.hpp"
#include "Engine/Core/ErrorWarningAssert.hpp"
#include "Engine/Core/FrameEventQueue.hpp"
#include "Engine/Core/FrameEventQueueScriptInterface.hpp"
#include "Engine/Core/GenericCommandExecutor.hpp"
#include "Engine/Core/GenericCommandQueue.hpp"
#include "Engine/Core/JobSystem.hpp"
#include "Engine/Core/LogSubsystem.hpp"
#include "Engine/Entity/EntityStateBuffer.hpp"
#include "Engine/Input/InputSystem.hpp"
#include "Engine/Network/KADIAuthenticationUtility.hpp"
#include "Engine/Network/KADIScriptInterface.hpp"
#include "Engine/Platform/Window.hpp"
#include "Engine/Renderer/Camera.hpp"
#include "Engine/Renderer/CameraStateBuffer.hpp"
#include "Engine/Renderer/DebugRenderSystem.hpp"
#include "Engine/Renderer/Renderer.hpp"
#include "Engine/Renderer/Texture.hpp"
#include "Engine/Renderer/VertexUtils.hpp"
#include "Engine/Resource/ResourceSubsystem.hpp"
#include "Engine/Script/GenericCommandScriptInterface.hpp"
#include "Engine/Script/ScriptSubsystem.hpp"
#include "Engine/UI/ImGuiSubsystem.hpp"
#include "ThirdParty/json/json.hpp"

#include <optional>


//----------------------------------------------------------------------------------------------------
App*  g_app  = nullptr;       // Created and owned by Main_Windows.cpp
Game* g_game = nullptr;       // Created and owned by the App

//----------------------------------------------------------------------------------------------------
// Helper: Escape special characters in JSON strings (shared with GenericCommand handlers)
//----------------------------------------------------------------------------------------------------
static std::string EscapeJsonString(std::string const& input)
{
    std::string escaped;
    escaped.reserve(static_cast<size_t>(input.length() * 1.2));
    for (char c : input)
    {
        switch (c)
        {
        case '\\': escaped += "\\\\";
            break;
        case '\"': escaped += "\\\"";
            break;
        case '\n': escaped += "\\n";
            break;
        case '\r': escaped += "\\r";
            break;
        case '\t': escaped += "\\t";
            break;
        case '\b': escaped += "\\b";
            break;
        case '\f': escaped += "\\f";
            break;
        default: escaped += c;
            break;
        }
    }
    return escaped;
}

//----------------------------------------------------------------------------------------------------
// Helper: Validate .js file path for security (shared by file operation handlers)
// Returns empty string on success, or error JSON string on failure.
//----------------------------------------------------------------------------------------------------
static std::string ValidateJsFilePath(std::string const& filePath)
{
    if (filePath.empty()) return R"({"success":false,"error":"Invalid file path: cannot be empty"})";

    if (filePath.find("..") != std::string::npos) return R"({"success":false,"error":"Invalid file path: directory traversal not allowed"})";

    if (filePath.length() < 3 || filePath.substr(filePath.length() - 3) != ".js") return R"({"success":false,"error":"Invalid file extension: must end with .js"})";

    size_t      lastSlash = filePath.find_last_of("/\\");
    std::string filename  = (lastSlash != std::string::npos) ? filePath.substr(lastSlash + 1) : filePath;
    if (!filename.empty() && filename[0] == '.') return R"json({"success":false,"error":"Invalid filename: cannot start with dot (hidden files not allowed)"})json";

    return {};  // Valid
}

//----------------------------------------------------------------------------------------------------
// Helper: Parse JSON payload from GenericCommand std::any (shared by all command handlers)
//----------------------------------------------------------------------------------------------------
static String ParseJsonPayload(std::any const& payload, nlohmann::json& outJson)
{
    String payloadStr;
    try { payloadStr = std::any_cast<String>(payload); }
    catch (std::bad_any_cast const&) { return "ERR_INVALID_PAYLOAD: expected JSON string"; }
    try { outJson = nlohmann::json::parse(payloadStr); }
    catch (nlohmann::json::exception const& e) { return Stringf("ERR_JSON_PARSE: %s", e.what()); }
    return "";
}

//----------------------------------------------------------------------------------------------------
// Helper: Parse Vec3 from JSON key holding [x, y, z] array
//----------------------------------------------------------------------------------------------------
static Vec3 ParseVec3(nlohmann::json const& json, char const* key, Vec3 const& defaultVal = Vec3::ZERO)
{
    auto arr = json.value(key, std::vector<double>{(double)defaultVal.x, (double)defaultVal.y, (double)defaultVal.z});
    return Vec3(
        static_cast<float>(arr.size() > 0 ? arr[0] : defaultVal.x),
        static_cast<float>(arr.size() > 1 ? arr[1] : defaultVal.y),
        static_cast<float>(arr.size() > 2 ? arr[2] : defaultVal.z)
    );
}

//----------------------------------------------------------------------------------------------------
// Helper: Parse Rgba8 from JSON with component keys r, g, b, a
//----------------------------------------------------------------------------------------------------
static Rgba8 ParseRgba8(nlohmann::json const& json, Rgba8 const& defaultVal = Rgba8::WHITE)
{
    return Rgba8(
        static_cast<unsigned char>(json.value("r", (int)defaultVal.r)),
        static_cast<unsigned char>(json.value("g", (int)defaultVal.g)),
        static_cast<unsigned char>(json.value("b", (int)defaultVal.b)),
        static_cast<unsigned char>(json.value("a", (int)defaultVal.a))
    );
}

//----------------------------------------------------------------------------------------------------
// Helper: Require entityId field from JSON, return nullopt if missing
//----------------------------------------------------------------------------------------------------
static std::optional<uint64_t> RequireEntityId(nlohmann::json const& json)
{
    if (!json.contains("entityId")) return std::nullopt;
    return json.value("entityId", static_cast<uint64_t>(0));
}

//----------------------------------------------------------------------------------------------------
// Helper: Configure orthographic screen camera state
//----------------------------------------------------------------------------------------------------
static void ConfigureScreenCamera(CameraState& state)
{
    Vec2 dims = Vec2(1600.f, 800.f);
    if (Window::s_mainWindow)
    {
        dims = Window::s_mainWindow->GetViewportDimensions();
    }
    state.mode        = Camera::eMode_Orthographic;
    state.orthoLeft   = 0.0f;
    state.orthoBottom = 0.0f;
    state.orthoRight  = dims.x;
    state.orthoTop    = dims.y;
    state.orthoNear   = 0.0f;
    state.orthoFar    = 1.0f;
    state.viewport    = AABB2(Vec2::ZERO, Vec2::ONE);
}

//----------------------------------------------------------------------------------------------------
App::App()
{
    GEngine::Get().Construct();
}

//----------------------------------------------------------------------------------------------------
App::~App()
{
    GEngine::Get().Destruct();
}

//----------------------------------------------------------------------------------------------------
void App::Startup()
{
    GEngine::Get().Startup();

    g_eventSystem->SubscribeEventCallbackFunction("OnCloseButtonClicked", OnCloseButtonClicked);
    g_eventSystem->SubscribeEventCallbackFunction("quit", OnCloseButtonClicked);

    // Initialize async architecture infrastructure
    m_callbackQueue   = new CallbackQueue();
    m_frameEventQueue = new FrameEventQueue();

    // Connect FrameEventQueue to InputSystem (C++ → JS event channel)
    g_input->SetFrameEventQueue(m_frameEventQueue);

    // Load GenericCommand configuration from JSON (optional — uses defaults if file missing)
    size_t   gcQueueCapacity     = 500;    // GenericCommandQueue::DEFAULT_CAPACITY
    uint32_t gcRateLimitPerAgent = 100;  // Default: 100 commands/sec per agent
    bool     gcAuditLogging      = false;
    try
    {
        std::ifstream configFile("Data/Config/GenericCommand.json");
        if (configFile.is_open())
        {
            nlohmann::json jsonConfig;
            configFile >> jsonConfig;

            gcQueueCapacity     = jsonConfig.value("queueCapacity", 500);
            gcRateLimitPerAgent = jsonConfig.value("rateLimitPerAgent", 100u);
            gcAuditLogging      = jsonConfig.value("enableAuditLogging", false);

            DAEMON_LOG(LogApp, eLogVerbosity::Log,
                       Stringf("GenericCommand config loaded: capacity=%zu, rateLimit=%u/s, audit=%s",
                           gcQueueCapacity, gcRateLimitPerAgent, gcAuditLogging ? "ON" : "OFF"));
        }
        else
        {
            DAEMON_LOG(LogApp, eLogVerbosity::Log, "GenericCommand.json not found, using defaults");
        }
    }
    catch (nlohmann::json::exception const& e)
    {
        DAEMON_LOG(LogApp, eLogVerbosity::Warning,
                   Stringf("GenericCommand config parse error: %s - using defaults", e.what()));
    }

    m_genericCommandQueue    = new GenericCommandQueue(gcQueueCapacity);
    m_genericCommandExecutor = new GenericCommandExecutor();
    m_genericCommandExecutor->SetRateLimitPerAgent(gcRateLimitPerAgent);
    m_genericCommandExecutor->SetAuditLoggingEnabled(gcAuditLogging);

    // Initialize state buffers with dirty tracking for O(d) swap optimization
    m_entityStateBuffer = new EntityStateBuffer();
    m_entityStateBuffer->EnableDirtyTracking(true);
    m_cameraStateBuffer = new CameraStateBuffer();
    m_cameraStateBuffer->EnableDirtyTracking(true);
    m_audioStateBuffer = new AudioStateBuffer();
    m_audioStateBuffer->EnableDirtyTracking(true);

    // Initialize mesh cache
    m_meshCache = new MeshCache();

    // === GenericCommand handler: "create_mesh" (Task 8.3 — EntityScriptInterface migration) ===
    // Replaces EntityScriptInterface::ExecuteCreateMesh with GenericCommand pipeline.
    // Handler runs on main thread; entity ID is generated immediately, render command queued.
    // Flow: JS submit("create_mesh", payload) → handler → HandlerResult::Success({resultId}) → JS callback
    m_genericCommandExecutor->RegisterHandler("create_mesh",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  // Extract fields with defaults matching EntityAPI.js validation
                                                  String meshType = json.value("meshType", "cube");

                                                  Vec3 position = ParseVec3(json, "position");

                                                  float scale = json.value("scale", 1.0f);

                                                  auto  colorArr = json.value("color", std::vector<int>{255, 255, 255, 255});
                                                  Rgba8 color(
                                                      static_cast<unsigned char>(colorArr.size() > 0 ? colorArr[0] : 255),
                                                      static_cast<unsigned char>(colorArr.size() > 1 ? colorArr[1] : 255),
                                                      static_cast<unsigned char>(colorArr.size() > 2 ? colorArr[2] : 255),
                                                      static_cast<unsigned char>(colorArr.size() > 3 ? colorArr[3] : 255)
                                                  );

                                                  // Generate entity ID (atomic counter — no EntityAPI dependency needed)
                                                  static std::atomic<EntityID> s_nextEntityId{1};
                                                  EntityID                     entityId = s_nextEntityId++;

                                                  // Write directly to EntityStateBuffer (Audio pattern — no RenderCommandQueue hop)
                                                  // Vertex data is created lazily by MeshCache on first render.
                                                  EntityState state;
                                                  state.position    = position;
                                                  state.orientation = EulerAngles::ZERO;
                                                  state.color       = color;
                                                  state.radius      = scale;
                                                  state.meshType    = meshType;
                                                  state.isActive    = true;
                                                  state.cameraType  = "world";
                                                  state.textureId   = json.value("textureId", static_cast<uint64_t>(0));

                                                  auto* backBuffer        = m_entityStateBuffer->GetBackBuffer();
                                                  (*backBuffer)[entityId] = state;
                                                  m_entityStateBuffer->MarkDirty(entityId);

                                                  DAEMON_LOG(LogApp, eLogVerbosity::Log,
                                                             Stringf("GenericCommand [create_mesh]: entityId=%llu, mesh=%s, pos=(%.1f,%.1f,%.1f), scale=%.1f",
                                                                 entityId, meshType.c_str(), position.x, position.y, position.z, scale));

                                                  // Return entityId via resultId field — GenericCommand pipeline delivers to JS callback
                                                  return HandlerResult::Success({{"resultId", std::any(static_cast<uint64_t>(entityId))}});
                                              });

    // === GenericCommand handler: "create_camera" (Task 8.4 — CameraScriptInterface migration) ===
    // Replaces CameraScriptInterface::ExecuteCreateCamera with GenericCommand pipeline.
    // Direct CameraStateBuffer write (Audio/Entity pattern — no RenderCommandQueue hop).
    // Camera ID generated via static atomic counter (same namespace as CameraAPI: starts at 1000).
    m_genericCommandExecutor->RegisterHandler("create_camera",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  // Extract position [x, y, z] — default [0, 0, 0]
                                                  Vec3 position = ParseVec3(json, "position");

                                                  // Extract orientation [yaw, pitch, roll] — default [0, 0, 0]
                                                  Vec3        oriVec = ParseVec3(json, "orientation");
                                                  EulerAngles orientation(oriVec.x, oriVec.y, oriVec.z);

                                                  String type = json.value("type", "world");

                                                  // Generate camera ID (atomic counter — no CameraAPI dependency needed)
                                                  // Camera IDs start at 1000 to avoid collision with entity IDs
                                                  static std::atomic<EntityID> s_nextCameraId{1000};
                                                  EntityID                     cameraId = s_nextCameraId++;

                                                  // Write directly to CameraStateBuffer (Audio/Entity pattern — no RenderCommandQueue hop)
                                                  CameraState state;
                                                  state.position    = position;
                                                  state.orientation = orientation;
                                                  state.type        = type;
                                                  state.isActive    = true;

                                                  // Configure camera based on type (inlined from ProcessRenderCommands CREATE_CAMERA)
                                                  if (type == "world")
                                                  {
                                                      state.mode              = Camera::eMode_Perspective;
                                                      state.perspectiveFOV    = 60.0f;
                                                      state.perspectiveAspect = 16.0f / 9.0f;
                                                      state.perspectiveNear   = 0.1f;
                                                      state.perspectiveFar    = 100.0f;
                                                  }
                                                  else if (type == "screen")
                                                  {
                                                      ConfigureScreenCamera(state);
                                                  }

                                                  auto* backBuffer        = m_cameraStateBuffer->GetBackBuffer();
                                                  (*backBuffer)[cameraId] = state;
                                                  m_cameraStateBuffer->MarkDirty(cameraId);

                                                  DAEMON_LOG(LogApp, eLogVerbosity::Log,
                                                             Stringf("GenericCommand [create_camera]: cameraId=%llu, type=%s, pos=(%.1f,%.1f,%.1f)",
                                                                 cameraId, type.c_str(), position.x, position.y, position.z));

                                                  return HandlerResult::Success({{"resultId", std::any(static_cast<uint64_t>(cameraId))}});
                                              });

    // === GenericCommand handler: "set_active_camera" (Task 8.4) ===
    // Replaces CameraScriptInterface::ExecuteSetActiveCamera.
    // Direct CameraStateBuffer write (Audio/Entity pattern — no RenderCommandQueue hop).
    m_genericCommandExecutor->RegisterHandler("set_active_camera",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  EntityID cameraId = json.value("cameraId", static_cast<uint64_t>(0));
                                                  if (cameraId == 0)
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: cameraId is required and must be non-zero");
                                                  }

                                                  // Write directly to CameraStateBuffer (Audio/Entity pattern — no RenderCommandQueue hop)
                                                  m_cameraStateBuffer->SetActiveCameraID(cameraId);

                                                  DAEMON_LOG(LogApp, eLogVerbosity::Log,
                                                             Stringf("GenericCommand [set_active_camera]: cameraId=%llu", cameraId));

                                                  return HandlerResult::Success({{"resultId", std::any(static_cast<uint64_t>(cameraId))}});
                                              });

    // === GenericCommand handler: "update_camera_type" (Task 8.4) ===
    // Replaces CameraScriptInterface::ExecuteUpdateCameraType.
    // Direct CameraStateBuffer write (Audio/Entity pattern — no RenderCommandQueue hop).
    m_genericCommandExecutor->RegisterHandler("update_camera_type",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  EntityID cameraId = json.value("cameraId", static_cast<uint64_t>(0));
                                                  if (cameraId == 0)
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: cameraId is required and must be non-zero");
                                                  }

                                                  String type = json.value("type", "");
                                                  if (type.empty())
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: type is required");
                                                  }

                                                  // Write directly to CameraStateBuffer (Audio/Entity pattern — no RenderCommandQueue hop)
                                                  // Inlined from ProcessRenderCommands UPDATE_CAMERA_TYPE
                                                  auto* backBuffer = m_cameraStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(cameraId);
                                                  if (it == backBuffer->end())
                                                  {
                                                      return HandlerResult::Error(Stringf("ERR_NOT_FOUND: camera %llu not in CameraStateBuffer", cameraId));
                                                  }

                                                  it->second.type = type;

                                                  if (type == "world")
                                                  {
                                                      it->second.mode              = Camera::eMode_Perspective;
                                                      it->second.perspectiveFOV    = 60.0f;
                                                      it->second.perspectiveAspect = 16.0f / 9.0f;
                                                      it->second.perspectiveNear   = 0.1f;
                                                      it->second.perspectiveFar    = 100.0f;
                                                  }
                                                  else if (type == "screen")
                                                  {
                                                      ConfigureScreenCamera(it->second);
                                                  }

                                                  m_cameraStateBuffer->MarkDirty(cameraId);

                                                  DAEMON_LOG(LogApp, eLogVerbosity::Log,
                                                             Stringf("GenericCommand [update_camera_type]: cameraId=%llu, type=%s", cameraId, type.c_str()));

                                                  return HandlerResult::Success({{"resultId", std::any(static_cast<uint64_t>(cameraId))}});
                                              });

    // === GenericCommand handler: "destroy_camera" (Task 8.4) ===
    // Replaces CameraScriptInterface::ExecuteDestroyCamera.
    // Direct CameraStateBuffer write (Audio/Entity pattern — no RenderCommandQueue hop).
    m_genericCommandExecutor->RegisterHandler("destroy_camera",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  EntityID cameraId = json.value("cameraId", static_cast<uint64_t>(0));
                                                  if (cameraId == 0)
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: cameraId is required and must be non-zero");
                                                  }

                                                  // Write directly to CameraStateBuffer (Audio/Entity pattern — no RenderCommandQueue hop)
                                                  auto* backBuffer = m_cameraStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(cameraId);
                                                  if (it != backBuffer->end())
                                                  {
                                                      it->second.isActive = false;
                                                      m_cameraStateBuffer->MarkDirty(cameraId);
                                                  }

                                                  DAEMON_LOG(LogApp, eLogVerbosity::Log,
                                                             Stringf("GenericCommand [destroy_camera]: cameraId=%llu", cameraId));

                                                  return HandlerResult::Success({{"resultId", std::any(static_cast<uint64_t>(cameraId))}});
                                              });

    // === GenericCommand handler: "load_sound" (Task 8.2 — AudioScriptInterface migration) ===
    // Replaces AudioScriptInterface::ExecuteLoadSoundAsync + ProcessAudioCommands LOAD_SOUND path.
    // Handler runs on main thread; calls g_audio->CreateOrGetSound() directly, updates AudioStateBuffer.
    m_genericCommandExecutor->RegisterHandler("load_sound",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  String soundPath = json.value("soundPath", "");
                                                  if (soundPath.empty())
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: soundPath is required");
                                                  }

                                                  // Dimension: default Sound2D (2D is always audible; use Sound3D explicitly for spatial audio)
                                                  String                     dimStr    = json.value("dimension", "Sound2D");
                                                  eAudioSystemSoundDimension dimension = eAudioSystemSoundDimension::Sound3D;
                                                  if (dimStr == "Sound2D" || dimStr == "2D")
                                                  {
                                                      dimension = eAudioSystemSoundDimension::Sound2D;
                                                  }

                                                  SoundID soundId = g_audio->CreateOrGetSound(soundPath, dimension);

                                                  if (soundId == MISSING_SOUND_ID)
                                                  {
                                                      DAEMON_LOG(LogApp, eLogVerbosity::Warning,
                                                                 Stringf("GenericCommand [load_sound]: failed to load '%s'", soundPath.c_str()));
                                                      return HandlerResult::Error("ERR_LOAD_FAILED: sound file not found or invalid");
                                                  }

                                                  // Update AudioStateBuffer (same as ProcessAudioCommands LOAD_SOUND)
                                                  AudioState state;
                                                  state.soundId   = soundId;
                                                  state.soundPath = soundPath;
                                                  state.position  = Vec3::ZERO;
                                                  state.volume    = 1.0f;
                                                  state.isPlaying = false;
                                                  state.isLooped  = false;
                                                  state.isLoaded  = true;
                                                  state.isActive  = true;

                                                  (*m_audioStateBuffer->GetBackBuffer())[soundId] = state;
                                                  m_audioStateBuffer->MarkDirty(soundId);

                                                  DAEMON_LOG(LogApp, eLogVerbosity::Log,
                                                             Stringf("GenericCommand [load_sound]: soundId=%llu, path=%s", soundId, soundPath.c_str()));

                                                  return HandlerResult::Success({{"resultId", std::any(static_cast<uint64_t>(soundId))}});
                                              });

    // === GenericCommand handler: "play_sound" (Task 8.2) ===
    // Replaces AudioScriptInterface::ExecutePlaySoundAsync + ProcessAudioCommands PLAY_SOUND path.
    m_genericCommandExecutor->RegisterHandler("play_sound",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  if (!json.contains("soundId"))
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: soundId is required");
                                                  }
                                                  SoundID soundId = json.value("soundId", static_cast<uint64_t>(0));

                                                  float volume = json.value("volume", 1.0f);
                                                  bool  looped = json.value("looped", false);

                                                  // Verify sound exists in AudioStateBuffer
                                                  auto* backBuffer = m_audioStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(soundId);
                                                  if (it == backBuffer->end())
                                                  {
                                                      return HandlerResult::Error(Stringf("ERR_NOT_FOUND: soundId %llu not in AudioStateBuffer", soundId));
                                                  }

                                                  // 2D vs 3D: match the playback mode to how the sound was loaded.
                                                  // Sound2D (FMOD_DEFAULT) → StartSound (no FMOD_3D flag)
                                                  // Sound3D (FMOD_3D)      → StartSoundAt (with 3D position)
                                                  SoundPlaybackID playbackId    = MISSING_SOUND_ID;
                                                  bool const      has3DPosition = json.contains("position");

                                                  if (has3DPosition)
                                                  {
                                                      Vec3 position       = ParseVec3(json, "position");
                                                      it->second.position = position;
                                                      playbackId          = g_audio->StartSoundAt(soundId, position, looped, volume);
                                                  }
                                                  else
                                                  {
                                                      // 2D playback — matches Sound2D (FMOD_DEFAULT) load mode.
                                                      // This is the same path as the original synchronous AudioInterface.startSound().
                                                      playbackId = g_audio->StartSound(soundId, looped, volume);
                                                  }

                                                  // Update state
                                                  it->second.isPlaying = true;
                                                  it->second.volume    = volume;
                                                  it->second.isLooped  = looped;
                                                  m_audioStateBuffer->MarkDirty(soundId);

                                                  DAEMON_LOG(LogApp, eLogVerbosity::Log,
                                                             Stringf("GenericCommand [play_sound]: soundId=%llu, playbackId=%llu, vol=%.2f, looped=%d, 3D=%d",
                                                                 soundId, playbackId, volume, looped, has3DPosition));

                                                  return HandlerResult::Success({{"resultId", std::any(static_cast<uint64_t>(playbackId))}});
                                              });

    // === GenericCommand handler: "stop_sound" (Task 8.2) ===
    // Replaces AudioScriptInterface::ExecuteStopSoundAsync + ProcessAudioCommands STOP_SOUND path.
    m_genericCommandExecutor->RegisterHandler("stop_sound",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  if (!json.contains("soundId"))
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: soundId is required");
                                                  }
                                                  SoundID soundId = json.value("soundId", static_cast<uint64_t>(0));

                                                  auto* backBuffer = m_audioStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(soundId);
                                                  if (it != backBuffer->end())
                                                  {
                                                      it->second.isPlaying = false;
                                                      m_audioStateBuffer->MarkDirty(soundId);
                                                  }

                                                  g_audio->StopSound(soundId);

                                                  DAEMON_LOG(LogApp, eLogVerbosity::Log,
                                                             Stringf("GenericCommand [stop_sound]: soundId=%llu", soundId));

                                                  return HandlerResult::Success({{"resultId", std::any(static_cast<uint64_t>(soundId))}});
                                              });

    // === GenericCommand handler: "set_volume" (Task 8.2) ===
    // Replaces AudioScriptInterface::ExecuteSetVolumeAsync + ProcessAudioCommands SET_VOLUME path.
    m_genericCommandExecutor->RegisterHandler("set_volume",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  if (!json.contains("soundId"))
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: soundId is required");
                                                  }
                                                  SoundID soundId = json.value("soundId", static_cast<uint64_t>(0));

                                                  float volume = json.value("volume", 1.0f);

                                                  auto* backBuffer = m_audioStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(soundId);
                                                  if (it != backBuffer->end())
                                                  {
                                                      it->second.volume = volume;
                                                      m_audioStateBuffer->MarkDirty(soundId);
                                                  }

                                                  g_audio->SetSoundPlaybackVolume(soundId, volume);

                                                  DAEMON_LOG(LogApp, eLogVerbosity::Log,
                                                             Stringf("GenericCommand [set_volume]: soundId=%llu, volume=%.2f", soundId, volume));

                                                  return HandlerResult::Success({{"resultId", std::any(static_cast<uint64_t>(soundId))}});
                                              });

    // === GenericCommand handler: "update_3d_position" (Task 8.2) ===
    // Replaces AudioScriptInterface::ExecuteUpdate3DPositionAsync + ProcessAudioCommands UPDATE_3D_POSITION path.
    m_genericCommandExecutor->RegisterHandler("update_3d_position",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  if (!json.contains("soundId"))
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: soundId is required");
                                                  }
                                                  SoundID soundId = json.value("soundId", static_cast<uint64_t>(0));

                                                  Vec3 position = ParseVec3(json, "position");

                                                  auto* backBuffer = m_audioStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(soundId);
                                                  if (it != backBuffer->end())
                                                  {
                                                      it->second.position = position;
                                                      m_audioStateBuffer->MarkDirty(soundId);
                                                  }

                                                  g_audio->SetSoundPosition(soundId, position);

                                                  DAEMON_LOG(LogApp, eLogVerbosity::Log,
                                                             Stringf("GenericCommand [update_3d_position]: soundId=%llu, pos=(%.1f,%.1f,%.1f)",
                                                                 soundId, position.x, position.y, position.z));

                                                  return HandlerResult::Success({{"resultId", std::any(static_cast<uint64_t>(soundId))}});
                                              });

    // === GenericCommand handler: "load_texture" (Task 8.1 — ResourceScriptInterface migration) ===
    // Replaces ResourceScriptInterface::ExecuteLoadTexture with GenericCommand pipeline.
    // Handler runs on main thread; calls g_resourceSubsystem->CreateOrGetTextureFromFile() directly.
    // Returns opaque resourceId (Texture* cast to uint64_t) matching ResourceLoadJob pattern.
    m_genericCommandExecutor->RegisterHandler("load_texture",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  String path = json.value("path", "");
                                                  if (path.empty())
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: path is required");
                                                  }

                                                  if (!g_resourceSubsystem)
                                                  {
                                                      return HandlerResult::Error("ERR_NOT_INITIALIZED: ResourceSubsystem is null");
                                                  }

                                                  Texture* texture = g_resourceSubsystem->CreateOrGetTextureFromFile(path);
                                                  if (!texture)
                                                  {
                                                      DAEMON_LOG(LogApp, eLogVerbosity::Warning,
                                                                 Stringf("GenericCommand [load_texture]: failed to load '%s'", path.c_str()));
                                                      return HandlerResult::Error(Stringf("ERR_LOAD_FAILED: texture not found or invalid: %s", path.c_str()));
                                                  }

                                                  uint64_t resourceId = reinterpret_cast<uint64_t>(texture);

                                                  DAEMON_LOG(LogApp, eLogVerbosity::Log,
                                                             Stringf("GenericCommand [load_texture]: resourceId=%llu, path=%s", resourceId, path.c_str()));

                                                  return HandlerResult::Success({{"resultId", std::any(resourceId)}});
                                              });

    // === GenericCommand handler: "load_model" — Load OBJ model as entity ===
    // Loads .obj file via MeshCache (lazy ObjModelLoader), creates entity in EntityStateBuffer.
    // Rendering uses PCUTBN with indexed drawing (preserves normals for lighting).
    m_genericCommandExecutor->RegisterHandler("load_model",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  String path = json.value("path", "");
                                                  if (path.empty())
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: path is required");
                                                  }

                                                  // Construct meshType with "obj:" prefix for MeshCache dispatch
                                                  String meshType = "obj:" + path;

                                                  // Verify file can be loaded (eager load into cache)
                                                  ModelMeshData const* model = m_meshCache->GetOrCreateModel(meshType);
                                                  if (!model || model->vertices.empty())
                                                  {
                                                      return HandlerResult::Error(Stringf("ERR_LOAD_FAILED: could not load OBJ: %s", path.c_str()));
                                                  }

                                                  Vec3  position = ParseVec3(json, "position");
                                                  float scale    = json.value("scale", 1.0f);
                                                  auto  colorArr = json.value("color", std::vector<int>{255, 255, 255, 255});
                                                  Rgba8 color(
                                                      static_cast<unsigned char>(colorArr.size() > 0 ? colorArr[0] : 255),
                                                      static_cast<unsigned char>(colorArr.size() > 1 ? colorArr[1] : 255),
                                                      static_cast<unsigned char>(colorArr.size() > 2 ? colorArr[2] : 255),
                                                      static_cast<unsigned char>(colorArr.size() > 3 ? colorArr[3] : 255)
                                                  );

                                                  // Use high offset to avoid collision with create_mesh entity IDs
                                                  static std::atomic<EntityID> s_nextModelEntityId{10000};
                                                  EntityID entityId = s_nextModelEntityId++;

                                                  EntityState state;
                                                  state.position    = position;
                                                  state.orientation = EulerAngles::ZERO;
                                                  state.color       = color;
                                                  state.radius      = scale;
                                                  state.meshType    = meshType;
                                                  state.isActive    = true;
                                                  state.cameraType  = "world";
                                                  state.textureId   = json.value("textureId", static_cast<uint64_t>(0));

                                                  auto* backBuffer = m_entityStateBuffer->GetBackBuffer();
                                                  (*backBuffer)[entityId] = state;
                                                  m_entityStateBuffer->MarkDirty(entityId);

                                                  DAEMON_LOG(LogApp, eLogVerbosity::Log,
                                                             Stringf("GenericCommand [load_model]: entityId=%llu, path=%s, verts=%zu, pos=(%.1f,%.1f,%.1f), tex=%llu",
                                                                 entityId, path.c_str(), model->vertices.size(), position.x, position.y, position.z, state.textureId));

                                                  return HandlerResult::Success({{"resultId", std::any(static_cast<uint64_t>(entityId))}});
                                              });

    // === GenericCommand handler: "load_shader" (Task 8.1 — ResourceScriptInterface migration) ===
    // Replaces ResourceScriptInterface::ExecuteLoadShader with GenericCommand pipeline.
    // Handler runs on main thread; calls g_resourceSubsystem->CreateOrGetShaderFromFile() directly.
    // Returns opaque resourceId (Shader* cast to uint64_t) matching ResourceLoadJob pattern.
    m_genericCommandExecutor->RegisterHandler("load_shader",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  String path = json.value("path", "");
                                                  if (path.empty())
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: path is required");
                                                  }

                                                  if (!g_resourceSubsystem)
                                                  {
                                                      return HandlerResult::Error("ERR_NOT_INITIALIZED: ResourceSubsystem is null");
                                                  }

                                                  Shader* shader = g_resourceSubsystem->CreateOrGetShaderFromFile(path);
                                                  if (!shader)
                                                  {
                                                      DAEMON_LOG(LogApp, eLogVerbosity::Warning,
                                                                 Stringf("GenericCommand [load_shader]: failed to load '%s'", path.c_str()));
                                                      return HandlerResult::Error(Stringf("ERR_LOAD_FAILED: shader not found or invalid: %s", path.c_str()));
                                                  }

                                                  uint64_t resourceId = reinterpret_cast<uint64_t>(shader);

                                                  DAEMON_LOG(LogApp, eLogVerbosity::Log,
                                                             Stringf("GenericCommand [load_shader]: resourceId=%llu, path=%s", resourceId, path.c_str()));

                                                  return HandlerResult::Success({{"resultId", std::any(resourceId)}});
                                              });

    // === GenericCommand handler: "entity.update_position" (Task 9.1.1 — EntityAPI fire-and-forget migration) ===
    // Replaces EntityScriptInterface::ExecuteUpdatePosition with GenericCommand pipeline.
    // Fire-and-forget: no callback needed, position applied immediately on main thread.
    // Flow: JS submit("entity.update_position", {entityId, x, y, z}) → handler → EntityAPI::UpdatePosition()
    m_genericCommandExecutor->RegisterHandler("entity.update_position",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  // Extract entityId (required)
                                                  auto entityIdOpt = RequireEntityId(json);
                                                  if (!entityIdOpt) return HandlerResult::Error("ERR_INVALID_PARAM: entityId is required");
                                                  uint64_t entityId = *entityIdOpt;

                                                  // Extract position components (required)
                                                  double x = json.value("x", 0.0);
                                                  double y = json.value("y", 0.0);
                                                  double z = json.value("z", 0.0);

                                                  Vec3 position(static_cast<float>(x), static_cast<float>(y), static_cast<float>(z));

                                                  // Write directly to EntityStateBuffer (Audio pattern — no RenderCommandQueue hop)
                                                  auto* backBuffer = m_entityStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(entityId);
                                                  if (it != backBuffer->end())
                                                  {
                                                      it->second.position = position;
                                                      m_entityStateBuffer->MarkDirty(entityId);
                                                  }

                                                  // Fire-and-forget: no callback result needed
                                                  return HandlerResult::Success();
                                              });

    // === GenericCommand handler: "entity.move_by" (Task 9.1.2 — EntityAPI fire-and-forget migration) ===
    // Replaces EntityScriptInterface::ExecuteMoveBy with GenericCommand pipeline.
    // Fire-and-forget: relative movement applied immediately on main thread.
    // Flow: JS submit("entity.move_by", {entityId, dx, dy, dz}) → handler → EntityAPI::MoveBy()
    m_genericCommandExecutor->RegisterHandler("entity.move_by",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  // Extract entityId (required)
                                                  auto entityIdOpt = RequireEntityId(json);
                                                  if (!entityIdOpt) return HandlerResult::Error("ERR_INVALID_PARAM: entityId is required");
                                                  uint64_t entityId = *entityIdOpt;

                                                  // Extract delta components
                                                  double dx = json.value("dx", 0.0);
                                                  double dy = json.value("dy", 0.0);
                                                  double dz = json.value("dz", 0.0);

                                                  Vec3 delta(static_cast<float>(dx), static_cast<float>(dy), static_cast<float>(dz));

                                                  // Write directly to EntityStateBuffer (Audio pattern — no RenderCommandQueue hop)
                                                  // Proper relative movement: read current position, add delta, write back
                                                  auto* backBuffer = m_entityStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(entityId);
                                                  if (it != backBuffer->end())
                                                  {
                                                      it->second.position += delta;
                                                      m_entityStateBuffer->MarkDirty(entityId);
                                                  }

                                                  // Fire-and-forget: no callback result needed
                                                  return HandlerResult::Success();
                                              });

    // === GenericCommand handler: "entity.update_orientation" (Task 9.1.3) ===
    // Fire-and-forget: orientation applied immediately on main thread.
    m_genericCommandExecutor->RegisterHandler("entity.update_orientation",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  auto entityIdOpt = RequireEntityId(json);
                                                  if (!entityIdOpt) return HandlerResult::Error("ERR_INVALID_PARAM: entityId is required");
                                                  uint64_t entityId = *entityIdOpt;

                                                  double yaw   = json.value("yaw", 0.0);
                                                  double pitch = json.value("pitch", 0.0);
                                                  double roll  = json.value("roll", 0.0);

                                                  EulerAngles orientation(static_cast<float>(yaw), static_cast<float>(pitch), static_cast<float>(roll));

                                                  // Write directly to EntityStateBuffer (Audio pattern — no RenderCommandQueue hop)
                                                  auto* backBuffer = m_entityStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(entityId);
                                                  if (it != backBuffer->end())
                                                  {
                                                      it->second.orientation = orientation;
                                                      m_entityStateBuffer->MarkDirty(entityId);
                                                  }

                                                  return HandlerResult::Success();
                                              });

    // === GenericCommand handler: "entity.update_color" (Task 9.1.4) ===
    // Fire-and-forget: color applied immediately on main thread.
    m_genericCommandExecutor->RegisterHandler("entity.update_color",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  auto entityIdOpt = RequireEntityId(json);
                                                  if (!entityIdOpt) return HandlerResult::Error("ERR_INVALID_PARAM: entityId is required");
                                                  uint64_t entityId = *entityIdOpt;

                                                  Rgba8 color = ParseRgba8(json);

                                                  // Write directly to EntityStateBuffer (Audio pattern — no RenderCommandQueue hop)
                                                  auto* backBuffer = m_entityStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(entityId);
                                                  if (it != backBuffer->end())
                                                  {
                                                      it->second.color = color;
                                                      m_entityStateBuffer->MarkDirty(entityId);
                                                  }

                                                  return HandlerResult::Success();
                                              });

    // === GenericCommand handler: "entity.set_texture" ===
    // Fire-and-forget: binds an opaque texture handle (from resource.loadTexture) to an entity.
    // textureId=0 resets to default white texture.
    m_genericCommandExecutor->RegisterHandler("entity.set_texture",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  auto entityIdOpt = RequireEntityId(json);
                                                  if (!entityIdOpt) return HandlerResult::Error("ERR_INVALID_PARAM: entityId is required");
                                                  uint64_t entityId  = *entityIdOpt;
                                                  uint64_t textureId = json.value("textureId", static_cast<uint64_t>(0));

                                                  auto* backBuffer = m_entityStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(entityId);
                                                  if (it != backBuffer->end())
                                                  {
                                                      it->second.textureId = textureId;
                                                      m_entityStateBuffer->MarkDirty(entityId);
                                                  }

                                                  return HandlerResult::Success();
                                              });

    // === GenericCommand handler: "entity.destroy" (Task 9.1.5) ===
    // Lifecycle operation with optional callback for confirmation.
    m_genericCommandExecutor->RegisterHandler("entity.destroy",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  auto entityIdOpt = RequireEntityId(json);
                                                  if (!entityIdOpt) return HandlerResult::Error("ERR_INVALID_PARAM: entityId is required");
                                                  uint64_t entityId = *entityIdOpt;

                                                  // Write directly to EntityStateBuffer (Audio pattern — no RenderCommandQueue hop)
                                                  auto* backBuffer = m_entityStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(entityId);
                                                  if (it != backBuffer->end())
                                                  {
                                                      it->second.isActive = false;
                                                      m_entityStateBuffer->MarkDirty(entityId);
                                                  }

                                                  DAEMON_LOG(LogApp, eLogVerbosity::Log,
                                                             Stringf("GenericCommand [entity.destroy]: entityId=%llu", entityId));

                                                  return HandlerResult::Success({{"resultId", std::any(entityId)}});
                                              });

    // === GenericCommand handler: "camera.update" (Task 9.2.2 — CameraAPI fire-and-forget migration) ===
    // Atomic position+orientation update. Direct CameraStateBuffer write (Audio/Entity pattern).
    m_genericCommandExecutor->RegisterHandler("camera.update",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  if (!json.contains("cameraId"))
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: cameraId is required");
                                                  }
                                                  uint64_t cameraId = json.value("cameraId", static_cast<uint64_t>(0));

                                                  float posX  = json.value("posX", 0.0f);
                                                  float posY  = json.value("posY", 0.0f);
                                                  float posZ  = json.value("posZ", 0.0f);
                                                  float yaw   = json.value("yaw", 0.0f);
                                                  float pitch = json.value("pitch", 0.0f);
                                                  float roll  = json.value("roll", 0.0f);

                                                  // Write directly to CameraStateBuffer (Audio/Entity pattern — no RenderCommandQueue hop)
                                                  auto* backBuffer = m_cameraStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(cameraId);
                                                  if (it != backBuffer->end())
                                                  {
                                                      it->second.position    = Vec3(posX, posY, posZ);
                                                      it->second.orientation = EulerAngles(yaw, pitch, roll);
                                                      m_cameraStateBuffer->MarkDirty(cameraId);
                                                  }

                                                  return HandlerResult::Success();
                                              });

    // === GenericCommand handler: "camera.update_position" (Task 9.2.3) ===
    // DEPRECATED: Use camera.update for atomic updates. Kept for backward compatibility.
    // Direct CameraStateBuffer write (Audio/Entity pattern).
    m_genericCommandExecutor->RegisterHandler("camera.update_position",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  if (!json.contains("cameraId"))
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: cameraId is required");
                                                  }
                                                  uint64_t cameraId = json.value("cameraId", static_cast<uint64_t>(0));

                                                  float x = json.value("x", 0.0f);
                                                  float y = json.value("y", 0.0f);
                                                  float z = json.value("z", 0.0f);

                                                  // Write directly to CameraStateBuffer (Audio/Entity pattern — no RenderCommandQueue hop)
                                                  auto* backBuffer = m_cameraStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(cameraId);
                                                  if (it != backBuffer->end())
                                                  {
                                                      it->second.position = Vec3(x, y, z);
                                                      m_cameraStateBuffer->MarkDirty(cameraId);
                                                  }

                                                  return HandlerResult::Success();
                                              });

    // === GenericCommand handler: "camera.update_orientation" (Task 9.2.4) ===
    // DEPRECATED: Use camera.update for atomic updates. Kept for backward compatibility.
    // Direct CameraStateBuffer write (Audio/Entity pattern).
    m_genericCommandExecutor->RegisterHandler("camera.update_orientation",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  if (!json.contains("cameraId"))
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: cameraId is required");
                                                  }
                                                  uint64_t cameraId = json.value("cameraId", static_cast<uint64_t>(0));

                                                  float yaw   = json.value("yaw", 0.0f);
                                                  float pitch = json.value("pitch", 0.0f);
                                                  float roll  = json.value("roll", 0.0f);

                                                  // Write directly to CameraStateBuffer (Audio/Entity pattern — no RenderCommandQueue hop)
                                                  auto* backBuffer = m_cameraStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(cameraId);
                                                  if (it != backBuffer->end())
                                                  {
                                                      it->second.orientation = EulerAngles(yaw, pitch, roll);
                                                      m_cameraStateBuffer->MarkDirty(cameraId);
                                                  }

                                                  return HandlerResult::Success();
                                              });

    // === GenericCommand handler: "camera.move_by" (Task 9.2.5) ===
    // Relative camera movement. Direct CameraStateBuffer read-modify-write (Audio/Entity pattern).
    m_genericCommandExecutor->RegisterHandler("camera.move_by",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  if (!json.contains("cameraId"))
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: cameraId is required");
                                                  }
                                                  uint64_t cameraId = json.value("cameraId", static_cast<uint64_t>(0));

                                                  float dx = json.value("dx", 0.0f);
                                                  float dy = json.value("dy", 0.0f);
                                                  float dz = json.value("dz", 0.0f);

                                                  // Read-modify-write to CameraStateBuffer (Audio/Entity pattern — no RenderCommandQueue hop)
                                                  auto* backBuffer = m_cameraStateBuffer->GetBackBuffer();
                                                  auto  it         = backBuffer->find(cameraId);
                                                  if (it != backBuffer->end())
                                                  {
                                                      it->second.position += Vec3(dx, dy, dz);
                                                      m_cameraStateBuffer->MarkDirty(cameraId);
                                                  }

                                                  return HandlerResult::Success();
                                              });

    // === GenericCommand handler: "camera.look_at" (Task 9.2.6) ===
    // Make camera look at target position. (Phase 2 stub — not yet implemented.)
    // Direct CameraStateBuffer write (Audio/Entity pattern) — will compute orientation when implemented.
    m_genericCommandExecutor->RegisterHandler("camera.look_at",
                                              [this](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  if (!json.contains("cameraId"))
                                                  {
                                                      return HandlerResult::Error("ERR_INVALID_PARAM: cameraId is required");
                                                  }
                                                  uint64_t cameraId = json.value("cameraId", static_cast<uint64_t>(0));

                                                  float targetX = json.value("targetX", 0.0f);
                                                  float targetY = json.value("targetY", 0.0f);
                                                  float targetZ = json.value("targetZ", 0.0f);

                                                  // TODO: Phase 2 — compute orientation from current position to target, write to CameraStateBuffer
                                                  // For now, this is a no-op stub
                                                  (void)cameraId;
                                                  (void)targetX;
                                                  (void)targetY;
                                                  (void)targetZ;

                                                  return HandlerResult::Success();
                                              });

    // === GenericCommand handlers: "debug_render.*" (Pass 2 — DebugRenderAPI migration) ===
    // Replaces DebugRenderSystemScriptInterface direct calls with GenericCommand pipeline.
    // Handlers call Engine's global DebugAdd* functions directly (main-thread safe).
    // JS DebugRenderAPI.js submits these commands via CommandQueue → GenericCommandQueue → here.

    // --- Helper lambdas for debug_render handlers ---
    auto parseDebugRenderMode = [](String const& modeStr) -> eDebugRenderMode
    {
        if (modeStr == "ALWAYS") return eDebugRenderMode::ALWAYS;
        if (modeStr == "X_RAY") return eDebugRenderMode::X_RAY;
        return eDebugRenderMode::USE_DEPTH;
    };


    // --- Control handlers ---

    m_genericCommandExecutor->RegisterHandler("debug_render.set_visible",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  DebugRenderSetVisible();
                                                  return HandlerResult::Success();
                                              });

    m_genericCommandExecutor->RegisterHandler("debug_render.set_hidden",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  DebugRenderSetHidden();
                                                  return HandlerResult::Success();
                                              });

    m_genericCommandExecutor->RegisterHandler("debug_render.clear",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  DebugRenderClear();
                                                  return HandlerResult::Success();
                                              });

    m_genericCommandExecutor->RegisterHandler("debug_render.clear_all",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  DebugRenderClear();
                                                  return HandlerResult::Success();
                                              });

    // --- World-space geometry handlers ---

    m_genericCommandExecutor->RegisterHandler("debug_render.add_world_point",
                                              [parseDebugRenderMode](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  Vec3             pos(json.value("x", 0.0f), json.value("y", 0.0f), json.value("z", 0.0f));
                                                  float            radius   = json.value("radius", 0.1f);
                                                  float            duration = json.value("duration", 0.0f);
                                                  Rgba8            color    = ParseRgba8(json);
                                                  eDebugRenderMode mode     = parseDebugRenderMode(json.value("mode", "USE_DEPTH"));

                                                  DebugAddWorldPoint(pos, radius, duration, color, color, mode);
                                                  return HandlerResult::Success();
                                              });

    m_genericCommandExecutor->RegisterHandler("debug_render.add_world_line",
                                              [parseDebugRenderMode](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  Vec3             start(json.value("x1", 0.0f), json.value("y1", 0.0f), json.value("z1", 0.0f));
                                                  Vec3             end(json.value("x2", 0.0f), json.value("y2", 0.0f), json.value("z2", 0.0f));
                                                  float            radius   = json.value("radius", 0.02f);
                                                  float            duration = json.value("duration", 0.0f);
                                                  Rgba8            color    = ParseRgba8(json);
                                                  eDebugRenderMode mode     = parseDebugRenderMode(json.value("mode", "USE_DEPTH"));

                                                  DebugAddWorldLine(start, end, radius, duration, color, color, mode);
                                                  return HandlerResult::Success();
                                              });

    m_genericCommandExecutor->RegisterHandler("debug_render.add_world_cylinder",
                                              [parseDebugRenderMode](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  Vec3             base(json.value("baseX", 0.0f), json.value("baseY", 0.0f), json.value("baseZ", 0.0f));
                                                  Vec3             top(json.value("topX", 0.0f), json.value("topY", 0.0f), json.value("topZ", 0.0f));
                                                  float            radius      = json.value("radius", 0.5f);
                                                  float            duration    = json.value("duration", 0.0f);
                                                  bool             isWireframe = json.value("isWireframe", false);
                                                  Rgba8            color       = ParseRgba8(json);
                                                  eDebugRenderMode mode        = parseDebugRenderMode(json.value("mode", "USE_DEPTH"));

                                                  DebugAddWorldCylinder(base, top, radius, duration, isWireframe, color, color, mode);
                                                  return HandlerResult::Success();
                                              });

    m_genericCommandExecutor->RegisterHandler("debug_render.add_world_wire_sphere",
                                              [parseDebugRenderMode](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  Vec3             center(json.value("x", 0.0f), json.value("y", 0.0f), json.value("z", 0.0f));
                                                  float            radius   = json.value("radius", 0.5f);
                                                  float            duration = json.value("duration", 0.0f);
                                                  Rgba8            color    = ParseRgba8(json);
                                                  eDebugRenderMode mode     = parseDebugRenderMode(json.value("mode", "USE_DEPTH"));

                                                  DebugAddWorldWireSphere(center, radius, duration, color, color, mode);
                                                  return HandlerResult::Success();
                                              });

    m_genericCommandExecutor->RegisterHandler("debug_render.add_world_arrow",
                                              [parseDebugRenderMode](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  Vec3             start(json.value("x1", 0.0f), json.value("y1", 0.0f), json.value("z1", 0.0f));
                                                  Vec3             end(json.value("x2", 0.0f), json.value("y2", 0.0f), json.value("z2", 0.0f));
                                                  float            radius   = json.value("radius", 0.02f);
                                                  float            duration = json.value("duration", 0.0f);
                                                  Rgba8            color    = ParseRgba8(json);
                                                  eDebugRenderMode mode     = parseDebugRenderMode(json.value("mode", "USE_DEPTH"));

                                                  DebugAddWorldArrow(start, end, radius, duration, color, color, mode);
                                                  return HandlerResult::Success();
                                              });

    m_genericCommandExecutor->RegisterHandler("debug_render.add_world_text",
                                              [parseDebugRenderMode](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  String           text       = json.value("text", "");
                                                  float            textHeight = json.value("textHeight", 1.0f);
                                                  float            alignX     = json.value("alignX", 0.5f);
                                                  float            alignY     = json.value("alignY", 0.5f);
                                                  float            duration   = json.value("duration", 0.0f);
                                                  Rgba8            color      = ParseRgba8(json);
                                                  eDebugRenderMode mode       = parseDebugRenderMode(json.value("mode", "USE_DEPTH"));

                                                  // Build transform from 16-element array (or identity if not provided)
                                                  Mat44 transform;
                                                  if (json.contains("transform") && json["transform"].is_array())
                                                  {
                                                      auto const& arr = json["transform"];
                                                      if (arr.size() >= 16)
                                                      {
                                                          float values[16];
                                                          for (int i = 0; i < 16; ++i) values[i] = arr[i].get<float>();
                                                          transform = Mat44(values);
                                                      }
                                                  }

                                                  DebugAddWorldText(text, transform, textHeight, Vec2(alignX, alignY), duration, color, color, mode);
                                                  return HandlerResult::Success();
                                              });

    m_genericCommandExecutor->RegisterHandler("debug_render.add_billboard_text",
                                              [parseDebugRenderMode](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  String           text = json.value("text", "");
                                                  Vec3             origin(json.value("x", 0.0f), json.value("y", 0.0f), json.value("z", 0.0f));
                                                  float            textHeight = json.value("textHeight", 1.0f);
                                                  float            alignX     = json.value("alignX", 0.5f);
                                                  float            alignY     = json.value("alignY", 0.5f);
                                                  float            duration   = json.value("duration", 0.0f);
                                                  Rgba8            color      = ParseRgba8(json);
                                                  eDebugRenderMode mode       = parseDebugRenderMode(json.value("mode", "USE_DEPTH"));

                                                  DebugAddBillboardText(text, origin, textHeight, Vec2(alignX, alignY), duration, color, color, mode);
                                                  return HandlerResult::Success();
                                              });

    m_genericCommandExecutor->RegisterHandler("debug_render.add_world_basis",
                                              [parseDebugRenderMode](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  float            duration = json.value("duration", 0.0f);
                                                  eDebugRenderMode mode     = parseDebugRenderMode(json.value("mode", "USE_DEPTH"));

                                                  // Build transform from 16-element array (or identity if not provided)
                                                  Mat44 transform;
                                                  if (json.contains("transform") && json["transform"].is_array())
                                                  {
                                                      auto const& arr = json["transform"];
                                                      if (arr.size() >= 16)
                                                      {
                                                          float values[16];
                                                          for (int i = 0; i < 16; ++i) values[i] = arr[i].get<float>();
                                                          transform = Mat44(values);
                                                      }
                                                  }

                                                  DebugAddWorldBasis(transform, duration, mode);
                                                  return HandlerResult::Success();
                                              });

    // --- Screen-space geometry handlers ---

    m_genericCommandExecutor->RegisterHandler("debug_render.add_screen_text",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  String text = json.value("text", "");
                                                  Vec2   pos(json.value("x", 0.0f), json.value("y", 0.0f));
                                                  float  size     = json.value("size", 20.0f);
                                                  float  alignX   = json.value("alignX", 0.0f);
                                                  float  alignY   = json.value("alignY", 0.0f);
                                                  float  duration = json.value("duration", 0.0f);
                                                  Rgba8  color    = ParseRgba8(json);

                                                  DebugAddScreenText(text, pos, size, Vec2(alignX, alignY), duration, color, color);
                                                  return HandlerResult::Success();
                                              });

    m_genericCommandExecutor->RegisterHandler("debug_render.add_message",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  String text     = json.value("text", "");
                                                  float  duration = json.value("duration", 0.0f);
                                                  Rgba8  color    = ParseRgba8(json);

                                                  DebugAddMessage(text, duration, color, color);
                                                  return HandlerResult::Success();
                                              });

    //------------------------------------------------------------------------------------------------
    // GameScriptInterface Migration: File Operations, Input Injection, FileWatcher Management
    // These handlers replace the synchronous GameScriptInterface methods with async GenericCommand
    // pipeline. Results are delivered via CallbackData.resultJson → CommandQueue.handleCallback.
    //------------------------------------------------------------------------------------------------

    // game.app_request_quit — Request application quit
    m_genericCommandExecutor->RegisterHandler("game.app_request_quit",
                                              [](std::any const& /*payload*/) -> HandlerResult
                                              {
                                                  App::RequestQuit();
                                                  return HandlerResult::Success({{"resultJson", std::any(std::string(R"({"success":true})"))}});
                                              });

    // game.execute_command — Execute JavaScript command string
    m_genericCommandExecutor->RegisterHandler("game.execute_command",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  String command = json.value("command", "");
                                                  if (command.empty()) return HandlerResult::Error("Missing 'command' field");

                                                  if (g_game) g_game->ExecuteJavaScriptCommand(command);
                                                  std::string resultJson = R"({"success":true,"command":")" + EscapeJsonString(command) + R"("})";
                                                  return HandlerResult::Success({{"resultJson", std::any(resultJson)}});
                                              });

    // game.execute_file — Execute JavaScript file
    m_genericCommandExecutor->RegisterHandler("game.execute_file",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  String filename = json.value("filename", "");
                                                  if (filename.empty()) return HandlerResult::Error("Missing 'filename' field");

                                                  if (g_game) g_game->ExecuteJavaScriptFile(filename);
                                                  std::string resultJson = R"({"success":true,"filename":")" + EscapeJsonString(filename) + R"("})";
                                                  return HandlerResult::Success({{"resultJson", std::any(resultJson)}});
                                              });

    // game.create_script_file — Create/overwrite a .js file in Scripts directory
    m_genericCommandExecutor->RegisterHandler("game.create_script_file",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  std::string filePath  = json.value("filePath", "");
                                                  std::string content   = json.value("content", "");
                                                  bool        overwrite = json.value("overwrite", false);

                                                  std::string validationErr = ValidateJsFilePath(filePath);
                                                  if (!validationErr.empty()) return HandlerResult::Success({{"resultJson", std::any(validationErr)}});

                                                  try
                                                  {
                                                      namespace fs = std::filesystem;
                                                      fs::path scriptsDir = fs::current_path() / "Data" / "Scripts";
                                                      fs::path fullPath   = scriptsDir / filePath;

                                                      if (fs::exists(fullPath) && !overwrite)
                                                      {
                                                          std::string r = R"({"success":false,"error":"File already exists and overwrite=false: )" + EscapeJsonString(filePath) + R"("})";
                                                          return HandlerResult::Success({{"resultJson", std::any(r)}});
                                                      }

                                                      fs::path parentDir = fullPath.parent_path();
                                                      if (!fs::exists(parentDir)) fs::create_directories(parentDir);

                                                      std::ofstream outFile(fullPath, std::ios::out | std::ios::trunc);
                                                      if (!outFile.is_open())
                                                      {
                                                          std::string r = R"({"success":false,"error":"Failed to open file for writing: )" + EscapeJsonString(filePath) + R"("})";
                                                          return HandlerResult::Success({{"resultJson", std::any(r)}});
                                                      }

                                                      outFile << content;
                                                      outFile.close();

                                                      std::ostringstream resultJson;
                                                      resultJson << R"({"success":true,"filePath":")" << EscapeJsonString(fullPath.string())
                                                          << R"(","bytesWritten":)" << content.length() << "}";
                                                      return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                                  }
                                                  catch (std::exception const& e)
                                                  {
                                                      std::string r = R"({"success":false,"error":"Create script file exception: )" + EscapeJsonString(e.what()) + R"("})";
                                                      return HandlerResult::Success({{"resultJson", std::any(r)}});
                                                  }
                                              });

    // game.read_script_file — Read a .js file from Scripts directory
    m_genericCommandExecutor->RegisterHandler("game.read_script_file",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  std::string filePath = json.value("filePath", "");

                                                  std::string validationErr = ValidateJsFilePath(filePath);
                                                  if (!validationErr.empty()) return HandlerResult::Success({{"resultJson", std::any(validationErr)}});

                                                  try
                                                  {
                                                      namespace fs = std::filesystem;
                                                      fs::path scriptsDir = fs::current_path() / "Data" / "Scripts";
                                                      fs::path fullPath   = scriptsDir / filePath;

                                                      if (!fs::exists(fullPath))
                                                      {
                                                          std::string r = R"({"success":false,"error":"File not found: )" + EscapeJsonString(filePath) + R"("})";
                                                          return HandlerResult::Success({{"resultJson", std::any(r)}});
                                                      }

                                                      std::ifstream inFile(fullPath, std::ios::in);
                                                      if (!inFile.is_open())
                                                      {
                                                          std::string r = R"({"success":false,"error":"Failed to open file for reading: )" + EscapeJsonString(filePath) + R"("})";
                                                          return HandlerResult::Success({{"resultJson", std::any(r)}});
                                                      }

                                                      std::stringstream buffer;
                                                      buffer << inFile.rdbuf();
                                                      inFile.close();

                                                      std::string content   = buffer.str();
                                                      size_t      lineCount = std::count(content.begin(), content.end(), '\n') + 1;
                                                      size_t      byteSize  = content.length();

                                                      std::ostringstream resultJson;
                                                      resultJson << R"({"success":true,"filePath":")" << EscapeJsonString(fullPath.string())
                                                          << R"(","content":")" << EscapeJsonString(content)
                                                          << R"(","lineCount":)" << lineCount
                                                          << R"(,"byteSize":)" << byteSize << "}";
                                                      return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                                  }
                                                  catch (std::exception const& e)
                                                  {
                                                      std::string r = R"({"success":false,"error":"Read script file exception: )" + EscapeJsonString(e.what()) + R"("})";
                                                      return HandlerResult::Success({{"resultJson", std::any(r)}});
                                                  }
                                              });

    // game.delete_script_file — Delete a .js file from Scripts directory
    m_genericCommandExecutor->RegisterHandler("game.delete_script_file",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  std::string filePath = json.value("filePath", "");

                                                  std::string validationErr = ValidateJsFilePath(filePath);
                                                  if (!validationErr.empty()) return HandlerResult::Success({{"resultJson", std::any(validationErr)}});

                                                  // Protected files list
                                                  static const std::vector<std::string> protectedFiles = {
                                                      "JSEngine.js", "JSGame.js", "InputSystem.js", "main.js",
                                                      "kadi/KADIGameControl.js", "kadi/GameControlHandler.js",
                                                      "kadi/GameControlTools.js", "kadi/DevelopmentToolHandler.js",
                                                      "kadi/DevelopmentTools.js", "core/Subsystem.js",
                                                      "components/RendererSystem.js", "components/Prop.js"
                                                  };

                                                  std::string normalizedPath = filePath;
                                                  std::replace(normalizedPath.begin(), normalizedPath.end(), '\\', '/');

                                                  for (auto const& pf : protectedFiles)
                                                  {
                                                      if (normalizedPath == pf || normalizedPath.find(pf) != std::string::npos)
                                                      {
                                                          std::string r = R"({"success":false,"error":"Cannot delete protected file: )" + EscapeJsonString(filePath) + R"("})";
                                                          return HandlerResult::Success({{"resultJson", std::any(r)}});
                                                      }
                                                  }

                                                  try
                                                  {
                                                      namespace fs = std::filesystem;
                                                      fs::path scriptsDir = fs::current_path() / "Data" / "Scripts";
                                                      fs::path fullPath   = scriptsDir / filePath;

                                                      bool existed = fs::exists(fullPath);
                                                      if (existed) fs::remove(fullPath);

                                                      std::ostringstream resultJson;
                                                      resultJson << R"({"success":true,"filePath":")" << EscapeJsonString(fullPath.string())
                                                          << R"(","existed":)" << (existed ? "true" : "false") << "}";
                                                      return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                                  }
                                                  catch (std::exception const& e)
                                                  {
                                                      std::string r = R"({"success":false,"error":"Delete script file exception: )" + EscapeJsonString(e.what()) + R"("})";
                                                      return HandlerResult::Success({{"resultJson", std::any(r)}});
                                                  }
                                              });

    // game.inject_key_press — Inject a single key press with duration
    m_genericCommandExecutor->RegisterHandler("game.inject_key_press",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  int keyCode    = json.value("keyCode", -1);
                                                  int durationMs = json.value("durationMs", -1);

                                                  if (keyCode < 0 || keyCode > 255)
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(R"({"success":false,"error":"Invalid keyCode: must be 0-255"})"))}});
                                                  }
                                                  if (durationMs < 0)
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(R"({"success":false,"error":"Invalid durationMs: must be >= 0"})"))}});
                                                  }
                                                  if (!g_input)
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(R"({"success":false,"error":"InputSystem not available"})"))}});
                                                  }

                                                  g_input->InjectKeyPress(static_cast<unsigned char>(keyCode), durationMs);

                                                  std::ostringstream resultJson;
                                                  resultJson << R"({"success":true,"keyCode":)" << keyCode << R"(,"durationMs":)" << durationMs << "}";
                                                  return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                              });

    // game.inject_key_hold — Inject multi-key sequence with timing control
    m_genericCommandExecutor->RegisterHandler("game.inject_key_hold",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  if (!json.contains("keySequence") || !json["keySequence"].is_array())
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(R"({"success":false,"error":"Missing or invalid 'keySequence' array"})"))}});
                                                  }

                                                  if (!g_input)
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(R"({"success":false,"error":"InputSystem not available"})"))}});
                                                  }

                                                  try
                                                  {
                                                      std::vector<sKeySequenceItem> keySequence;
                                                      for (auto const& keyItem : json["keySequence"])
                                                      {
                                                          sKeySequenceItem item;
                                                          item.keyCode    = static_cast<unsigned char>(keyItem.value("keyCode", 0));
                                                          item.delayMs    = keyItem.value("delayMs", 0);
                                                          item.durationMs = keyItem.value("durationMs", 0);
                                                          keySequence.push_back(item);
                                                      }

                                                      if (keySequence.empty())
                                                      {
                                                          return HandlerResult::Success({{"resultJson", std::any(std::string(R"({"success":false,"error":"keySequence cannot be empty"})"))}});
                                                      }

                                                      uint32_t primaryJobId = g_input->InjectKeySequence(keySequence);
                                                      if (primaryJobId == 0)
                                                      {
                                                          return HandlerResult::Success({{"resultJson", std::any(std::string(R"({"success":false,"error":"Failed to inject key sequence"})"))}});
                                                      }

                                                      std::ostringstream resultJson;
                                                      resultJson << R"({"success":true,"primaryJobId":)" << primaryJobId
                                                          << R"(,"keyCount":)" << keySequence.size() << "}";
                                                      return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                                  }
                                                  catch (std::exception const& e)
                                                  {
                                                      std::string r = R"({"success":false,"error":"Inject key hold exception: )" + EscapeJsonString(e.what()) + R"("})";
                                                      return HandlerResult::Success({{"resultJson", std::any(r)}});
                                                  }
                                              });

    // game.get_key_hold_status — Get status of a key hold job
    m_genericCommandExecutor->RegisterHandler("game.get_key_hold_status",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  uint32_t jobId = json.value("jobId", 0u);
                                                  if (!g_input)
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(R"({"success":false,"error":"InputSystem not available"})"))}});
                                                  }

                                                  sToolJobStatus status = g_input->GetKeyHoldStatus(jobId);

                                                  std::ostringstream resultJson;
                                                  resultJson << R"({"success":true,"jobId":)" << status.jobId
                                                      << R"(,"toolType":")" << status.toolType
                                                      << R"(","status":")" << static_cast<int>(status.status)
                                                      << R"(","metadata":{)";

                                                  bool first = true;
                                                  for (auto const& [key, value] : status.metadata)
                                                  {
                                                      if (!first) resultJson << ",";
                                                      resultJson << "\"" << key << "\":\"" << value << "\"";
                                                      first = false;
                                                  }
                                                  resultJson << "}}";
                                                  return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                              });

    // game.cancel_key_hold — Cancel an active key hold job
    m_genericCommandExecutor->RegisterHandler("game.cancel_key_hold",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  uint32_t jobId = json.value("jobId", 0u);
                                                  if (!g_input)
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(R"({"success":false,"error":"InputSystem not available"})"))}});
                                                  }

                                                  bool cancelled = g_input->CancelKeyHold(jobId);

                                                  std::ostringstream resultJson;
                                                  resultJson << R"({"success":true,"jobId":)" << jobId
                                                      << R"(,"cancelled":)" << (cancelled ? "true" : "false") << "}";
                                                  return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                              });

    // game.list_active_key_holds — List all active key hold jobs
    m_genericCommandExecutor->RegisterHandler("game.list_active_key_holds",
                                              [](std::any const& /*payload*/) -> HandlerResult
                                              {
                                                  if (!g_input)
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(R"({"success":false,"error":"InputSystem not available"})"))}});
                                                  }

                                                  std::vector<sToolJobStatus> activeJobs = g_input->ListActiveKeyHolds();

                                                  std::ostringstream resultJson;
                                                  resultJson << R"({"success":true,"count":)" << activeJobs.size() << R"(,"jobs":[)";

                                                  for (size_t i = 0; i < activeJobs.size(); ++i)
                                                  {
                                                      auto const& job = activeJobs[i];
                                                      resultJson << R"({"jobId":)" << job.jobId
                                                          << R"(,"toolType":")" << job.toolType
                                                          << R"(","status":")" << static_cast<int>(job.status)
                                                          << R"(","metadata":{)";

                                                      bool first = true;
                                                      for (auto const& [key, value] : job.metadata)
                                                      {
                                                          if (!first) resultJson << ",";
                                                          resultJson << "\"" << key << "\":\"" << value << "\"";
                                                          first = false;
                                                      }
                                                      resultJson << "}}";
                                                      if (i < activeJobs.size() - 1) resultJson << ",";
                                                  }
                                                  resultJson << "]}";
                                                  return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                              });

    // game.add_watched_file — Add a .js file to hot-reload file watcher
    m_genericCommandExecutor->RegisterHandler("game.add_watched_file",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  std::string filePath = json.value("filePath", "");

                                                  std::string validationErr = ValidateJsFilePath(filePath);
                                                  if (!validationErr.empty()) return HandlerResult::Success({{"resultJson", std::any(validationErr)}});

                                                  if (!g_scriptSubsystem)
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(R"({"success":false,"error":"ScriptSubsystem not available"})"))}});
                                                  }

                                                  std::string relativePath = "Data/Scripts/" + filePath;
                                                  g_scriptSubsystem->AddWatchedFile(relativePath);

                                                  std::ostringstream resultJson;
                                                  resultJson << R"({"success":true,"filePath":")" << EscapeJsonString(filePath)
                                                      << R"(","relativePath":")" << EscapeJsonString(relativePath) << R"("})";
                                                  return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                              });

    // game.remove_watched_file — Remove a .js file from hot-reload file watcher
    m_genericCommandExecutor->RegisterHandler("game.remove_watched_file",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  std::string filePath = json.value("filePath", "");

                                                  if (filePath.empty())
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(R"({"success":false,"error":"Invalid file path: cannot be empty"})"))}});
                                                  }
                                                  if (filePath.find("..") != std::string::npos)
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(R"({"success":false,"error":"Invalid file path: directory traversal not allowed"})"))}});
                                                  }
                                                  if (!g_scriptSubsystem)
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(R"({"success":false,"error":"ScriptSubsystem not available"})"))}});
                                                  }

                                                  std::string relativePath = "Data/Scripts/" + filePath;
                                                  g_scriptSubsystem->RemoveWatchedFile(relativePath);

                                                  std::ostringstream resultJson;
                                                  resultJson << R"({"success":true,"filePath":")" << EscapeJsonString(filePath)
                                                      << R"(","relativePath":")" << EscapeJsonString(relativePath) << R"("})";
                                                  return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                              });


    // game.capture_screenshot — Capture current frame as PNG or JPEG
    m_genericCommandExecutor->RegisterHandler("game.capture_screenshot",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  std::string format  = json.value("format", "png");
                                                  int         quality = json.value("quality", 90);
                                                  std::string name    = json.value("filename", "");

                                                  // Auto-generate filename if not provided
                                                  if (name.empty())
                                                  {
                                                      auto        now       = std::chrono::system_clock::now();
                                                      std::time_t nowTime   = std::chrono::system_clock::to_time_t(now);
                                                      std::tm     localTime = {};
                                                      localtime_s(&localTime, &nowTime);

                                                      auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
                                                          now.time_since_epoch()) % 1000;

                                                      std::ostringstream oss;
                                                      oss << "screenshot_"
                                                          << std::put_time(&localTime, "%Y-%m-%d_%H%M%S")
                                                          << "_" << std::setfill('0') << std::setw(3) << ms.count();
                                                      name = oss.str();
                                                  }

                                                  // Output directory: Run/Screenshots/
                                                  namespace fs = std::filesystem;
                                                  fs::path outputDir = fs::current_path() / "Screenshots";

                                                  std::string outFilePath;
                                                  bool        success = g_renderer->CaptureScreenshot(
                                                      outputDir.string(), name, format, quality, outFilePath);

                                                  if (!success)
                                                  {
                                                      std::string r = R"({"success":false,"error":"Screenshot capture failed"})";
                                                      return HandlerResult::Success({{"resultJson", std::any(r)}});
                                                  }

                                                  // Get file size and read file as binary for base64 encoding
                                                  uintmax_t   fileSize = 0;
                                                  std::string imageBase64;
                                                  if (fs::exists(outFilePath))
                                                  {
                                                      fileSize = fs::file_size(outFilePath);

                                                      // Read file into binary buffer
                                                      std::ifstream file(outFilePath, std::ios::binary);
                                                      if (file)
                                                      {
                                                          std::vector<unsigned char> fileData(
                                                              (std::istreambuf_iterator<char>(file)),
                                                              std::istreambuf_iterator<char>());
                                                          imageBase64 = KADIAuthenticationUtility::Base64Encode(fileData);
                                                      }
                                                  }

                                                  std::string mimeType = (format == "jpeg" || format == "jpg")
                                                                             ? "image/jpeg"
                                                                             : "image/png";

                                                  std::ostringstream resultJson;
                                                  resultJson << R"({"success":true,"filePath":")" << EscapeJsonString(outFilePath)
                                                      << R"(","format":")" << format
                                                      << R"(","fileSize":)" << fileSize
                                                      << R"(,"mimeType":")" << mimeType
                                                      << R"(","imageData":")" << imageBase64 << R"("})";
                                                  return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                              });

    // game.validate_script — Parse JS source via V8 without execution, return syntax errors
    m_genericCommandExecutor->RegisterHandler("game.validate_script",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  std::string source = json.value("source", "");
                                                  if (source.empty())
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(
                                                          R"({"valid":false,"errors":[{"message":"source parameter is required","line":-1,"column":-1}]})"))}});
                                                  }

                                                  std::string scriptName = json.value("name", "validate");

                                                  if (!g_scriptSubsystem)
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(
                                                          R"({"valid":false,"errors":[{"message":"ScriptSubsystem not available","line":-1,"column":-1}]})"))}});
                                                  }

                                                  ScriptValidationResult result = g_scriptSubsystem->ValidateScript(source, scriptName);

                                                  std::ostringstream resultJson;
                                                  resultJson << R"({"valid":)" << (result.valid ? "true" : "false") << R"(,"errors":[)";
                                                  for (size_t i = 0; i < result.errors.size(); ++i)
                                                  {
                                                      if (i > 0) resultJson << ",";
                                                      resultJson << R"({"message":")" << EscapeJsonString(result.errors[i].message)
                                                                 << R"(","line":)" << result.errors[i].line
                                                                 << R"(,"column":)" << result.errors[i].column << "}";
                                                  }
                                                  resultJson << "]}";

                                                  return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                              });

    // game.run_script_test — Execute script in sandboxed V8 context with timeout
    m_genericCommandExecutor->RegisterHandler("game.run_script_test",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  std::string source = json.value("source", "");
                                                  if (source.empty())
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(
                                                          R"({"success":false,"output":"","errors":["source parameter is required"],"timedOut":false})"))}});
                                                  }

                                                  std::string scriptName = json.value("name", "test");
                                                  int         timeoutMs  = json.value("timeout", 10000);

                                                  if (!g_scriptSubsystem)
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(
                                                          R"({"success":false,"output":"","errors":["ScriptSubsystem not available"],"timedOut":false})"))}});
                                                  }

                                                  ScriptTestResult result = g_scriptSubsystem->RunScriptTest(source, scriptName, timeoutMs);

                                                  std::ostringstream resultJson;
                                                  resultJson << R"({"success":)" << (result.success ? "true" : "false")
                                                             << R"(,"output":")" << EscapeJsonString(result.output)
                                                             << R"(","errors":[)";
                                                  for (size_t i = 0; i < result.errors.size(); ++i)
                                                  {
                                                      if (i > 0) resultJson << ",";
                                                      resultJson << "\"" << EscapeJsonString(result.errors[i]) << "\"";
                                                  }
                                                  resultJson << R"(],"timedOut":)" << (result.timedOut ? "true" : "false") << "}";

                                                  return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                              });

    // game.get_entity_list — Enumerate all active entities with type, position, and ID
    m_genericCommandExecutor->RegisterHandler("game.get_entity_list",
                                              [this](std::any const&) -> HandlerResult
                                              {
                                                  if (!m_entityStateBuffer)
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(
                                                          R"({"success":false,"error":"EntityStateBuffer not available"})"))}});
                                                  }

                                                  EntityStateMap const* frontBuffer = m_entityStateBuffer->GetFrontBuffer();
                                                  if (!frontBuffer)
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(
                                                          R"({"success":true,"entities":[],"count":0})"))}});
                                                  }

                                                  std::ostringstream resultJson;
                                                  resultJson << R"({"success":true,"entities":[)";

                                                  int count = 0;
                                                  int limit = 1000;
                                                  for (auto const& [entityId, state] : *frontBuffer)
                                                  {
                                                      if (!state.isActive) continue;
                                                      if (count >= limit) break;

                                                      if (count > 0) resultJson << ",";
                                                      resultJson << R"({"entityId":)" << entityId
                                                                 << R"(,"type":")" << EscapeJsonString(state.meshType)
                                                                 << R"(","position":[)"
                                                                 << state.position.x << "," << state.position.y << "," << state.position.z
                                                                 << R"(],"orientation":[)"
                                                                 << state.orientation.m_yawDegrees << "," << state.orientation.m_pitchDegrees << "," << state.orientation.m_rollDegrees
                                                                 << R"(],"scale":)" << state.radius
                                                                 << R"(,"color":[)" << (int)state.color.r << "," << (int)state.color.g << "," << (int)state.color.b << "," << (int)state.color.a
                                                                 << R"(],"cameraType":")" << EscapeJsonString(state.cameraType) << R"("})";
                                                      ++count;
                                                  }

                                                  resultJson << R"(],"count":)" << count << "}";

                                                  return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                              });

    // game.get_engine_metrics — Return FPS, entity count, and memory usage
    m_genericCommandExecutor->RegisterHandler("game.get_engine_metrics",
                                              [this](std::any const&) -> HandlerResult
                                              {
                                                  // FPS from system clock
                                                  double deltaSeconds = Clock::GetSystemClock().GetDeltaSeconds();
                                                  double fps = (deltaSeconds > 0.0) ? (1.0 / deltaSeconds) : 0.0;

                                                  // Entity count from EntityStateBuffer
                                                  int entityCount = 0;
                                                  if (m_entityStateBuffer)
                                                  {
                                                      EntityStateMap const* frontBuffer = m_entityStateBuffer->GetFrontBuffer();
                                                      if (frontBuffer) entityCount = static_cast<int>(frontBuffer->size());
                                                  }

                                                  // Memory usage via Windows API
                                                  double memoryMB = 0.0;
                                                  PROCESS_MEMORY_COUNTERS pmc;
                                                  if (GetProcessMemoryInfo(GetCurrentProcess(), &pmc, sizeof(pmc)))
                                                  {
                                                      memoryMB = static_cast<double>(pmc.WorkingSetSize) / (1024.0 * 1024.0);
                                                  }

                                                  std::ostringstream resultJson;
                                                  resultJson << std::fixed << std::setprecision(1)
                                                             << R"({"success":true,"fps":)" << fps
                                                             << R"(,"entityCount":)" << entityCount
                                                             << R"(,"memoryUsageMB":)" << memoryMB
                                                             << R"(,"frameCount":)" << Clock::GetSystemClock().GetFrameCount()
                                                             << "}";

                                                  return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                              });

    // game.list_scripts — Return all loaded scripts with path, name, and active status
    m_genericCommandExecutor->RegisterHandler("game.list_scripts",
                                              [](std::any const&) -> HandlerResult
                                              {
                                                  if (!g_scriptSubsystem)
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(
                                                          R"({"success":false,"error":"ScriptSubsystem not available"})"))}});
                                                  }

                                                  std::vector<std::string> watchedFiles = g_scriptSubsystem->GetWatchedFiles();

                                                  std::ostringstream resultJson;
                                                  resultJson << R"({"success":true,"scripts":[)";

                                                  for (size_t i = 0; i < watchedFiles.size(); ++i)
                                                  {
                                                      std::string const& path = watchedFiles[i];

                                                      // Extract filename from path
                                                      size_t      lastSlash = path.find_last_of("/\\");
                                                      std::string name      = (lastSlash != std::string::npos) ? path.substr(lastSlash + 1) : path;

                                                      if (i > 0) resultJson << ",";
                                                      resultJson << R"({"path":")" << EscapeJsonString(path)
                                                                 << R"(","name":")" << EscapeJsonString(name)
                                                                 << R"(","active":true})";
                                                  }

                                                  resultJson << R"(],"count":)" << watchedFiles.size() << "}";
                                                  return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                              });

    // game.get_version — Read VERSION file from repo root and return semver string
    m_genericCommandExecutor->RegisterHandler("game.get_version",
                                              [](std::any const&) -> HandlerResult
                                              {
                                                  std::ifstream file("../VERSION");
                                                  if (!file.is_open())
                                                  {
                                                      return HandlerResult::Success({{"resultJson", std::any(std::string(
                                                          R"({"success":false,"error":"VERSION file not found"})"))}});
                                                  }

                                                  std::string version;
                                                  std::getline(file, version);
                                                  file.close();

                                                  // Trim whitespace
                                                  while (!version.empty() && (version.back() == '\r' || version.back() == '\n' || version.back() == ' '))
                                                      version.pop_back();

                                                  std::ostringstream resultJson;
                                                  resultJson << R"({"success":true,"version":")" << EscapeJsonString(version) << R"("})";
                                                  return HandlerResult::Success({{"resultJson", std::any(resultJson.str())}});
                                              });

    // input.set_cursor_mode — Set cursor mode (POINTER=0, FPS=1)
    // Migrated from InputScriptInterface to GenericCommand pipeline
    m_genericCommandExecutor->RegisterHandler("input.set_cursor_mode",
                                              [](std::any const& payload) -> HandlerResult
                                              {
                                                  nlohmann::json json;
                                                  String         err = ParseJsonPayload(payload, json);
                                                  if (!err.empty()) return HandlerResult::Error(err);

                                                  int mode = json.value("mode", -1);
                                                  if (mode < 0 || mode > 1)
                                                  {
                                                      return HandlerResult::Error("Invalid cursor mode (0=POINTER, 1=FPS)");
                                                  }

                                                  g_input->SetCursorMode(static_cast<eCursorMode>(mode));
                                                  return HandlerResult::Success({});
                                              });

    DAEMON_LOG(LogApp, eLogVerbosity::Display, "XXXXXApp::Startup - Async architecture initialized");

    g_game = new Game();
    SetupScriptingBindings();
    g_game->PostInit();

    // Submit JavaScript worker thread job after game and script initialization
    m_jsGameLogicJob = new JSGameLogicJob(g_game, m_entityStateBuffer, m_callbackQueue);
    g_jobSystem->SubmitJob(m_jsGameLogicJob);
}

//----------------------------------------------------------------------------------------------------
// Shutdown - reverse order of Startup
//----------------------------------------------------------------------------------------------------
void App::Shutdown()
{
    // Shutdown async job first
    if (m_jsGameLogicJob)
    {
        DAEMON_LOG(LogApp, eLogVerbosity::Display, "App::Shutdown - Requesting worker thread shutdown...");
        m_jsGameLogicJob->RequestShutdown();

        // Wait for worker thread to complete (max 5 seconds timeout)
        constexpr int kMaxWaitIterations = 500;
        constexpr int kWaitMilliseconds  = 10;
        int           waitCount          = 0;
        while (!m_jsGameLogicJob->IsShutdownComplete() && waitCount < kMaxWaitIterations)
        {
            std::this_thread::sleep_for(std::chrono::milliseconds(kWaitMilliseconds));
            ++waitCount;
        }

        if (m_jsGameLogicJob->IsShutdownComplete())
        {
            DAEMON_LOG(LogApp, eLogVerbosity::Display, "App::Shutdown - Worker thread exited successfully");
        }
        else
        {
            DAEMON_LOG(LogApp, eLogVerbosity::Warning, "App::Shutdown - Worker thread shutdown timeout!");
        }

        // Retrieve job from JobSystem before deletion to prevent double-delete
        Job* retrievedJob = g_jobSystem->RetrieveCompletedJob();
        while (retrievedJob != nullptr && retrievedJob != m_jsGameLogicJob)
        {
            delete retrievedJob;
            retrievedJob = g_jobSystem->RetrieveCompletedJob();
        }

        delete m_jsGameLogicJob;
        m_jsGameLogicJob = nullptr;
    }

    // Clear V8::Persistent callbacks before V8 isolate destruction
    if (m_kadiScriptInterface)
    {
        m_kadiScriptInterface->ClearCallbacks();
    }

    GAME_SAFE_RELEASE(g_game);

    // Cleanup APIs (before state buffers)


    delete m_meshCache;
    m_meshCache = nullptr;

    // Cleanup state buffers
    delete m_entityStateBuffer;
    m_entityStateBuffer = nullptr;

    delete m_cameraStateBuffer;
    m_cameraStateBuffer = nullptr;


    delete m_audioStateBuffer;
    m_audioStateBuffer = nullptr;

    // Cleanup command queues

    delete m_genericCommandExecutor;
    m_genericCommandExecutor = nullptr;

    delete m_genericCommandQueue;
    m_genericCommandQueue = nullptr;

    delete m_callbackQueue;
    m_callbackQueue = nullptr;

    // Disconnect FrameEventQueue from InputSystem before deletion
    if (g_input)
    {
        g_input->SetFrameEventQueue(nullptr);
    }
    delete m_frameEventQueue;
    m_frameEventQueue = nullptr;

    GEngine::Get().Shutdown();
}

//----------------------------------------------------------------------------------------------------
// One "frame" of the game.  Generally: Input, Update, Render.  We call this 60+ times per second.
//
void App::RunFrame()
{
    BeginFrame();   // Engine pre-frame stuff
    Update();       // Game updates / moves / spawns / hurts / kills stuff
    Render();       // Game draws current state of things
    EndFrame();     // Engine post-frame stuff
}

//----------------------------------------------------------------------------------------------------
void App::RunMainLoop()
{
    // Program main loop; keep running frames until it's time to quit
    while (!m_isQuitting)
    {
        // Sleep(16); // Temporary code to "slow down" our app to ~60Hz until we have proper frame timing in
        RunFrame();
    }
}

STATIC bool App::m_isQuitting = false;

//----------------------------------------------------------------------------------------------------
STATIC bool App::OnCloseButtonClicked(EventArgs& args)
{
    UNUSED(args)

    RequestQuit();

    return true;
}

//----------------------------------------------------------------------------------------------------
STATIC void App::RequestQuit()
{
    m_isQuitting = true;
}

//----------------------------------------------------------------------------------------------------
void App::BeginFrame() const
{
    g_eventSystem->BeginFrame();
    g_window->BeginFrame();
    g_renderer->BeginFrame();
    DebugRenderBeginFrame();
    g_devConsole->BeginFrame();
    g_input->BeginFrame();
    g_audio->BeginFrame();
    g_kadiSubsystem->BeginFrame();
}

//----------------------------------------------------------------------------------------------------
void App::Update()
{
    Clock::TickSystemClock();
    UpdateCursorMode();

    g_imgui->Update();
    g_scriptSubsystem->Update();

    // ProcessRenderCommands();
    ProcessGenericCommands();

    // Async Frame Synchronization: Check if worker thread completed previous JavaScript frame
    if (m_jsGameLogicJob && m_jsGameLogicJob->IsFrameComplete())
    {
        // Swap state buffers (copy back buffer to front buffer)
        if (m_entityStateBuffer) m_entityStateBuffer->SwapBuffers();
        if (m_cameraStateBuffer) m_cameraStateBuffer->SwapBuffers();
        if (m_audioStateBuffer) m_audioStateBuffer->SwapBuffers();

        m_jsGameLogicJob->TriggerNextFrame();
    }
    else if (m_jsGameLogicJob)
    {
        // Frame skip: Worker still executing, continue with last state (maintains stable 60 FPS)
        static uint64_t frameSkipCount = 0;
        if (frameSkipCount % 60 == 0)
        {
            DAEMON_LOG(LogApp, eLogVerbosity::Warning,
                       Stringf("App::Update - JavaScript frame skip (worker still executing) - Total skips: %llu",
                           frameSkipCount));
        }
        ++frameSkipCount;
    }

    // Execute pending callbacks from APIs
    if (m_genericCommandExecutor) m_genericCommandExecutor->ExecutePendingCallbacks(m_callbackQueue);
}

//----------------------------------------------------------------------------------------------------
void App::Render() const
{
    g_renderer->ClearScreen(Rgba8::BLACK, Rgba8::BLACK);

    // Render entities only in GAME mode
    if (g_game && !g_game->IsAttractMode())
    {
        RenderEntities();
    }

    // Get world camera for 3D debug rendering
    Camera const* worldCamera = nullptr;
    if (m_cameraStateBuffer)
    {
        EntityID activeCameraId = m_cameraStateBuffer->GetActiveCameraID();
        if (activeCameraId != 0)
        {
            worldCamera = m_cameraStateBuffer->GetCameraById(activeCameraId);
        }
    }

    // Render 3D debug visualization (world space) - only in GAME mode
    if (worldCamera && g_game && !g_game->IsAttractMode())
    {
        DebugRenderWorld(*worldCamera);
    }

    // Find and use screen camera for 2D debug rendering
    Camera const* screenCamera = nullptr;
    if (m_cameraStateBuffer)
    {
        CameraStateMap const* frontBuffer = m_cameraStateBuffer->GetFrontBuffer();
        if (frontBuffer)
        {
            for (auto const& [cameraId, cameraState] : *frontBuffer)
            {
                if (cameraState.type == "screen")
                {
                    screenCamera = m_cameraStateBuffer->GetCameraById(cameraId);
                    break;
                }
            }
        }
    }

    if (screenCamera)
    {
        DebugRenderScreen(*screenCamera);
    }

    AABB2 const consoleBox = AABB2(Vec2::ZERO, Vec2(1600.f, 30.f));
    g_devConsole->Render(consoleBox);
    g_imgui->Render();
}

//----------------------------------------------------------------------------------------------------
void App::EndFrame() const
{
    g_eventSystem->EndFrame();
    g_window->EndFrame();
    g_renderer->EndFrame();
    DebugRenderEndFrame();
    g_devConsole->EndFrame();
    g_input->EndFrame();
    g_audio->EndFrame();
    g_kadiSubsystem->EndFrame();
}

//----------------------------------------------------------------------------------------------------
STATIC std::any App::OnPrint(std::vector<std::any> const& args)
{
    if (!args.empty())
    {
        try
        {
            std::string message = std::any_cast<std::string>(args[0]);
            DebuggerPrintf("JS: %s\n", message.c_str());

            if (g_devConsole)
            {
                g_devConsole->AddLine(DevConsole::INFO_MINOR, "JS: " + message);
            }
        }
        catch (std::bad_any_cast const&)
        {
            DebuggerPrintf("JS: [無法轉換的物件]\n");
        }
    }
    return std::any{};
}

std::any App::OnDebug(std::vector<std::any> const& args)
{
    if (!args.empty())
    {
        try
        {
            std::string message = std::any_cast<std::string>(args[0]);
            DebuggerPrintf("JS DEBUG: %s\n", message.c_str());
        }
        catch (std::bad_any_cast const&)
        {
            DebuggerPrintf("JS DEBUG: [無法轉換的物件]\n");
        }
    }
    return std::any{};
}

std::any App::OnGarbageCollection(std::vector<std::any> const& args)
{
    UNUSED(args)
    if (g_scriptSubsystem)
    {
        g_scriptSubsystem->ForceGarbageCollection();
        DebuggerPrintf("JS: 垃圾回收已執行\n");
    }
    return std::any{};
}

//----------------------------------------------------------------------------------------------------
void App::UpdateCursorMode()
{
    bool const windowHasFocus       = GetActiveWindow() == g_window->GetWindowHandle();
    bool const shouldUsePointerMode = !windowHasFocus || g_devConsole->IsOpen();

    g_input->SetCursorMode(shouldUsePointerMode ? eCursorMode::POINTER : eCursorMode::FPS);
}

//----------------------------------------------------------------------------------------------------
void App::SetupScriptingBindings()
{
    if (g_scriptSubsystem == nullptr)
        ERROR_AND_DIE("App::SetupScriptingBindings - g_scriptSubsystem is nullptr!")
    if (!g_scriptSubsystem->IsInitialized())
        ERROR_AND_DIE("App::SetupScriptingBindings - g_scriptSubsystem is not initialized!")
    if (g_game == nullptr)
        ERROR_AND_DIE("App::SetupScriptingBindings - g_game is nullptr")

    DAEMON_LOG(LogApp, eLogVerbosity::Log, "App::SetupScriptingBindings - start");

    // Initialize hot-reload system
    if (g_scriptSubsystem->InitializeHotReload("../"))
    {
        DAEMON_LOG(LogApp, eLogVerbosity::Log, "App::SetupScriptingBindings - Hot-reload system initialized successfully");
    }
    else
    {
        DAEMON_LOG(LogApp, eLogVerbosity::Warning, "App::SetupScriptingBindings - Hot-reload system initialization failed");
    }

    // Register core script interfaces
    // NOTE: InputScriptInterface removed — replaced by FrameEventQueue (event-driven input)
    // NOTE: GameScriptInterface removed — all methods migrated to GenericCommand handlers (game.*)

    // Register FrameEventQueue script interface (replaces InputScriptInterface)
    if (m_frameEventQueue)
    {
        m_frameEventQueueScriptInterface = std::make_shared<FrameEventQueueScriptInterface>(m_frameEventQueue);
        g_scriptSubsystem->RegisterScriptableObject("frameEvents", m_frameEventQueueScriptInterface);
    }

    // Register KADI broker integration
    if (g_kadiSubsystem)
    {
        m_kadiScriptInterface = std::make_shared<KADIScriptInterface>(g_kadiSubsystem);
        m_kadiScriptInterface->SetV8Isolate(g_scriptSubsystem->GetIsolate());
        g_scriptSubsystem->RegisterScriptableObject("kadi", m_kadiScriptInterface);
    }
    else
    {
        DAEMON_LOG(LogApp, eLogVerbosity::Warning, "App::SetupScriptingBindings - KADI subsystem not available");
    }

    // Register callback queue script interface
    if (m_callbackQueue)
    {
        m_callbackQueueScriptInterface = std::make_shared<CallbackQueueScriptInterface>(m_callbackQueue);
        g_scriptSubsystem->RegisterScriptableObject("callbackQueue", m_callbackQueueScriptInterface);
    }

    // Register generic command script interface
    if (m_genericCommandQueue && m_genericCommandExecutor)
    {
        m_genericCommandScriptInterface = std::make_shared<GenericCommandScriptInterface>(m_genericCommandQueue, m_genericCommandExecutor);
        g_scriptSubsystem->RegisterScriptableObject("commandQueue", m_genericCommandScriptInterface);
    }

    // Register global functions
    g_scriptSubsystem->RegisterGlobalFunction("print", OnPrint);
    g_scriptSubsystem->RegisterGlobalFunction("debug", OnDebug);
    g_scriptSubsystem->RegisterGlobalFunction("gc", OnGarbageCollection);

    DAEMON_LOG(LogApp, eLogVerbosity::Log, "App::SetupScriptingBindings - end");
}

//----------------------------------------------------------------------------------------------------
// ProcessGenericCommands
//
// Consumes all pending GenericCommands from the queue and dispatches them to registered handlers
// via GenericCommandExecutor. Follows the same ConsumeAll pattern as ProcessRenderCommands and
// ProcessAudioCommands.
//
// Called from Update() on the main render thread, after ProcessAudioCommands().
//----------------------------------------------------------------------------------------------------
void App::ProcessGenericCommands()
{
    if (!m_genericCommandQueue || !m_genericCommandExecutor)
    {
        return;
    }

    m_genericCommandQueue->ConsumeAll([this](GenericCommand const& cmd)
    {
        m_genericCommandExecutor->ExecuteCommand(cmd);
    });
}

//----------------------------------------------------------------------------------------------------
void App::RenderEntities() const
{
    EntityStateMap const* frontBuffer = m_entityStateBuffer->GetFrontBuffer();
    if (!frontBuffer)
    {
        return;
    }

    // Get active camera from camera state buffer
    Camera const* worldCamera = nullptr;
    if (m_cameraStateBuffer)
    {
        EntityID activeCameraId = m_cameraStateBuffer->GetActiveCameraID();
        if (activeCameraId != 0)
        {
            worldCamera = m_cameraStateBuffer->GetCameraById(activeCameraId);
        }
    }

    // Camera creation is async, skip rendering until camera is ready
    if (!worldCamera)
    {
        return;
    }

    g_renderer->BeginCamera(*worldCamera);

    for (auto const& [entityId, state] : *frontBuffer)
    {
        if (!state.isActive) continue;
        if (state.cameraType != "world") continue;

        Mat44 modelMatrix;
        modelMatrix.SetTranslation3D(state.position);
        modelMatrix.Append(state.orientation.GetAsMatrix_IFwd_JLeft_KUp());

        // Apply uniform scale for OBJ models (primitives bake scale into vertices via MeshCache)
        if (state.meshType.size() > 4 && state.meshType.substr(0, 4) == "obj:")
        {
            modelMatrix.AppendScaleUniform3D(state.radius);
        }

        g_renderer->SetModelConstants(modelMatrix, state.color);
        Texture* tex = (state.textureId != 0)
                           ? reinterpret_cast<Texture*>(state.textureId)
                           : nullptr;
        g_renderer->BindTexture(tex);

        if (state.meshType.size() > 4 && state.meshType.substr(0, 4) == "obj:")
        {
            // OBJ model — PCUTBN with indexed rendering (preserves normals for lighting)
            ModelMeshData const* model = m_meshCache->GetOrCreateModel(state.meshType);
            if (model && !model->vertices.empty())
            {
                g_renderer->DrawVertexArray(model->vertices, model->indices);
            }
        }
        else
        {
            // Primitive — PCU
            VertexList_PCU const* verts = m_meshCache->GetOrCreate(state.meshType, state.radius, Rgba8::WHITE);
            if (verts && !verts->empty())
            {
                g_renderer->DrawVertexArray(static_cast<int>(verts->size()), verts->data());
            }
        }
    }

    g_renderer->EndCamera(*worldCamera);
}
