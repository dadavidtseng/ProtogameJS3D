//----------------------------------------------------------------------------------------------------
// GameScriptInterface.hpp
//----------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------
#pragma once
#include "Engine/Scripting/IScriptableObject.hpp"
#include "FileWatcher.hpp"
#include "ScriptReloader.hpp"
#include <memory>
#include <queue>
#include <mutex>

//-Forward-Declaration--------------------------------------------------------------------------------
class Game;
class Player;
class V8Subsystem;
struct Vec3;

//----------------------------------------------------------------------------------------------------
// Game 類別的腳本介面包裝器
// 這個類別作為 Game 物件與 V8Subsystem 之間的橋樑
//----------------------------------------------------------------------------------------------------
class GameScriptInterface : public IScriptableObject
{
public:
    explicit GameScriptInterface(Game* game);
    ~GameScriptInterface();

    // 實作 IScriptableObject 介面
    std::string                   GetScriptObjectName() const override;
    std::vector<ScriptMethodInfo> GetAvailableMethods() const override;
    ScriptMethodResult            CallMethod(std::string const& methodName, std::vector<std::any> const& args) override;

    // 實作屬性存取
    std::any                 GetProperty(const std::string& propertyName) const override;
    bool                     SetProperty(const std::string& propertyName, const std::any& value) override;
    std::vector<std::string> GetAvailableProperties() const override;

    // Hot-reload system initialization
    bool InitializeHotReload(V8Subsystem* v8System, const std::string& projectRoot);
    void ShutdownHotReload();
    
    // Thread-safe method to process pending hot-reload events on main thread
    void ProcessPendingHotReloadEvents();

private:
    Game* m_game; // 不擁有，只是參考

    // Hot-reload system components
    std::unique_ptr<FileWatcher> m_fileWatcher;
    std::unique_ptr<ScriptReloader> m_scriptReloader;
    bool m_hotReloadEnabled{false};
    std::string m_projectRoot; // Store project root for path construction
    
    // Thread-safe event queue for main thread processing
    std::queue<std::string> m_pendingFileChanges;
    mutable std::mutex m_fileChangeQueueMutex;

    // Hot-reload callbacks
    void OnFileChanged(const std::string& filePath);
    void OnReloadComplete(bool success, const std::string& error);
    
    // Helper method to construct absolute paths (same logic as FileWatcher)
    std::string GetAbsoluteScriptPath(const std::string& relativePath) const;

    // 輔助方法來處理類型轉換和錯誤檢查
    template <typename T>
    T ExtractArg(const std::any& arg, const std::string& expectedType = "") const;

    // 專門的類型提取方法
    Vec3        ExtractVec3(const std::vector<std::any>& args, size_t startIndex) const;
    float       ExtractFloat(const std::any& arg) const;
    int         ExtractInt(const std::any& arg) const;
    std::string ExtractString(const std::any& arg) const;
    bool        ExtractBool(const std::any& arg) const;

    // 參數驗證輔助方法
    ScriptMethodResult ValidateArgCount(const std::vector<std::any>& args,
                                        size_t                       expectedCount,
                                        const std::string&           methodName) const;

    ScriptMethodResult ValidateArgCountRange(const std::vector<std::any>& args,
                                             size_t                       minCount,
                                             size_t                       maxCount,
                                             const std::string&           methodName) const;

    // 方法實作
    ScriptMethodResult ExecuteCreateCube(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteMoveProp(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteGetPlayerPosition(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteMovePlayerCamera(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteRender(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteUpdate(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteJavaScriptCommand(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteJavaScriptFile(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteIsAttractMode(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteGetGameState(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteGetFileTimestamp(const std::vector<std::any>& args);
    
    // Hot-reload methods
    ScriptMethodResult ExecuteEnableHotReload(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteDisableHotReload(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteIsHotReloadEnabled(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteAddWatchedFile(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteRemoveWatchedFile(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteGetWatchedFiles(const std::vector<std::any>& args);
    ScriptMethodResult ExecuteReloadScript(const std::vector<std::any>& args);
};
