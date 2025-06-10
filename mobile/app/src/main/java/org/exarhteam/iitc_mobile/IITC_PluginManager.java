package org.exarhteam.iitc_mobile;

import android.content.SharedPreferences;
import android.content.res.AssetManager;
import android.os.Build;
import androidx.documentfile.provider.DocumentFile;

import org.exarhteam.iitc_mobile.prefs.PluginInfo;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Central plugin management system for IITC Mobile.
 * Handles discovery, loading, and serving of plugins from multiple sources
 */
public class IITC_PluginManager {

    private static IITC_PluginManager instance;

    public enum PluginType {
        ASSET,  // Built-in plugins from assets (lowest priority)
        DEV,    // Development override plugins (medium priority)
        USER    // User-installed plugins (highest priority)
    }

    public static class Plugin {
        public final String filename;       // Full filename including .user.js
        public final PluginType type;       // Source type with priority
        public final PluginInfo info;       // Plugin metadata
        public final DocumentFile file;     // File reference for DEV/USER, null for ASSET

        public Plugin(String filename, PluginType type, PluginInfo info, DocumentFile file) {
            this.filename = filename;
            this.type = type;
            this.info = info;
            this.file = file;
        }

        public boolean isAsset() {
            return type == PluginType.ASSET;
        }

        public boolean isDev() {
            return type == PluginType.DEV;
        }

        public boolean isUser() {
            return type == PluginType.USER;
        }
    }

    // Main registry: ID -> Plugin (highest priority only)
    private final Map<String, Plugin> plugins = new HashMap<>();

    /**
     * Private constructor for singleton pattern
     */
    private IITC_PluginManager() {}

    /**
     * Get singleton instance of PluginManager
     */
    public static synchronized IITC_PluginManager getInstance() {
        if (instance == null) {
            instance = new IITC_PluginManager();
        }
        return instance;
    }

    /**
     * Load and register all plugins from available sources
     */
    public void loadAllPlugins(IITC_StorageManager storageManager, AssetManager assetManager, boolean devMode) {
        plugins.clear();

        loadAssetPlugins(assetManager);

        if (devMode) {
            loadDevPlugins(storageManager);
        }

        loadUserPlugins(storageManager);

        Log.d("PluginManager loaded " + plugins.size() + " plugins");
    }

    /**
     * Load plugins from assets
     */
    private void loadAssetPlugins(AssetManager assetManager) {
        try {
            String[] assetFiles = assetManager.list("plugins");
            if (assetFiles == null) return;

            for (String fileName : assetFiles) {
                if (!fileName.endsWith(".user.js")) continue;

                try {
                    InputStream stream = assetManager.open("plugins/" + fileName);
                    String content = IITC_FileManager.readStream(stream);
                    PluginInfo info = IITC_FileManager.getScriptInfo(content);

                    Plugin plugin = new Plugin(fileName, PluginType.ASSET, info, null);

                    if (!isExcludedCategory(info.getCategory())) {
                        plugins.put(fileName, plugin);
                    }

                } catch (IOException e) {
                    Log.e("Failed to load asset plugin: " + fileName, e);
                }
            }
        } catch (IOException e) {
            Log.e("Failed to list asset plugins", e);
        }
    }

    /**
     * Load plugins from dev directory
     */
    private void loadDevPlugins(IITC_StorageManager storageManager) {
        DocumentFile devFolder = storageManager.getDevFolder();
        if (devFolder == null || !devFolder.exists()) return;

        DocumentFile[] devFiles = devFolder.listFiles();

        for (DocumentFile file : devFiles) {
            if (file == null || !file.exists() || !file.isFile()) continue;

            String fileName = file.getName();
            if (fileName == null || !fileName.endsWith(".user.js")) continue;

            try {
                InputStream stream = storageManager.openPluginInputStream(file);
                String content = IITC_FileManager.readStream(stream);
                PluginInfo info = IITC_FileManager.getScriptInfo(content);

                Plugin plugin = new Plugin(fileName, PluginType.DEV, info, file);

                if (!isExcludedCategory(info.getCategory())) {
                    plugins.put(fileName, plugin);
                }

            } catch (IOException e) {
                Log.e("Failed to load dev plugin: " + fileName, e);
            }
        }
    }

    /**
     * Load plugins from user directory
     */
    private void loadUserPlugins(IITC_StorageManager storageManager) {
        DocumentFile[] userFiles = storageManager.getUserPlugins();

        for (DocumentFile file : userFiles) {
            if (file == null || !file.exists() || !file.isFile()) continue;

            String fileName = file.getName();
            if (fileName == null || !fileName.endsWith(".user.js")) continue;

            try {
                InputStream stream = storageManager.openPluginInputStream(file);
                String content = IITC_FileManager.readStream(stream);
                PluginInfo info = IITC_FileManager.getScriptInfo(content);

                Plugin plugin = new Plugin(fileName, PluginType.USER, info, file);

                if (!isExcludedCategory(info.getCategory())) {
                    plugins.put(fileName, plugin);
                }

            } catch (IOException e) {
                Log.e("Failed to load user plugin: " + fileName, e);
            }
        }
    }

    /**
     * Check if plugin category should be excluded
     */
    private boolean isExcludedCategory(String category) {
        return "Deleted".equals(category);
    }

    /**
     * Get plugin by filename
     */
    public Plugin getPlugin(String filename) {
        return plugins.get(filename);
    }

    /**
     * Get all enabled plugins according to preferences
     */
    public List<Plugin> getEnabledPlugins(SharedPreferences prefs) {
        List<Plugin> enabled = new ArrayList<>();

        for (Plugin plugin : plugins.values()) {
            if (isPluginEnabled(plugin.filename, prefs)) {
                enabled.add(plugin);
            }
        }

        return enabled;
    }

    /**
     * Check if plugin is enabled in preferences
     */
    public boolean isPluginEnabled(String filename, SharedPreferences prefs) {
        return prefs.getBoolean(filename, false);
    }

    /**
     * Read plugin content (always reads fresh, no caching)
     */
    public String readPluginContent(Plugin plugin, IITC_StorageManager storageManager, AssetManager assetManager) {
        try {
            InputStream stream;

            if (plugin.isAsset()) {
                stream = assetManager.open("plugins/" + plugin.filename);
            } else {
                // DEV or USER plugin
                stream = storageManager.openPluginInputStream(plugin.file);
            }

            return IITC_FileManager.readStream(stream);

        } catch (IOException e) {
            Log.e("Failed to read plugin content: " + plugin.filename, e);
            return "";
        }
    }

    /**
     * Get all plugins grouped by category for UI display
     */
    public Map<String, List<Plugin>> getPluginsByCategory() {
        Map<String, List<Plugin>> result = new TreeMap<>();

        for (Plugin plugin : plugins.values()) {
            String category = plugin.info.getCategory();
            if (category == null) category = "Misc";

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                result.computeIfAbsent(category, k -> new ArrayList<>()).add(plugin);
            } else {
                List<Plugin> categoryList = result.get(category);
                if (categoryList == null) {
                    categoryList = new ArrayList<>();
                    result.put(category, categoryList);
                }
                categoryList.add(plugin);
            }
        }

        return result;
    }

    /**
     * Get all plugins of specific type
     */
    public List<Plugin> getPluginsByType(PluginType type) {
        List<Plugin> result = new ArrayList<>();

        for (Plugin plugin : plugins.values()) {
            if (plugin.type == type) {
                result.add(plugin);
            }
        }

        return result;
    }

    /**
     * Get count of enabled user plugins
     */
    public int getEnabledUserPluginCount(SharedPreferences prefs) {
        int count = 0;
        List<Plugin> userPlugins = getPluginsByType(PluginType.USER);

        for (Plugin plugin : userPlugins) {
            if (isPluginEnabled(plugin.filename, prefs)) {
                count++;
            }
        }

        return count;
    }

    /**
     * Clear all loaded plugins (for testing or reloading)
     */
    public void clear() {
        plugins.clear();
    }
}