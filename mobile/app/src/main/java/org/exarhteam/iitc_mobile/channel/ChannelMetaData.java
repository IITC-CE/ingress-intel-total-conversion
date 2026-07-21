package org.exarhteam.iitc_mobile.channel;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Parsed representation of a channel's meta.json file
 * Format matches the one used by lib-iitc-manager
 */
public class ChannelMetaData {

    public final String iitcVersion;
    public final Map<String, CategoryInfo> categories;

    private ChannelMetaData(String iitcVersion, Map<String, CategoryInfo> categories) {
        this.iitcVersion = iitcVersion;
        this.categories = categories;
    }

    /**
     * Parse a meta.json string into a ChannelMetaData object
     *
     * Expected format:
     * {
     *   "iitc_version": "0.42.1",
     *   "categories": {
     *     "Info": {
     *       "name": "Info",
     *       "description": "...",
     *       "plugins": [
     *         { "filename": "ap-stats.user.js", "id": "ap-stats", "name": "...", "version": "0.4.2", ... }
     *       ]
     *     }
     *   }
     * }
     */
    public static ChannelMetaData fromJson(String json) throws JSONException {
        JSONObject root = new JSONObject(json);

        String iitcVersion = root.has("iitc_version") ? root.getString("iitc_version") : null;
        Map<String, CategoryInfo> categories = new LinkedHashMap<>();

        JSONObject cats = root.getJSONObject("categories");
        Iterator<String> keys = cats.keys();
        while (keys.hasNext()) {
            String catKey = keys.next();
            JSONObject catObj = cats.getJSONObject(catKey);

            String name = catObj.optString("name", catKey);
            String description = catObj.optString("description", "");

            List<PluginMeta> plugins = new ArrayList<>();
            if (catObj.has("plugins")) {
                JSONArray pluginsArray = catObj.getJSONArray("plugins");
                for (int i = 0; i < pluginsArray.length(); i++) {
                    JSONObject p = pluginsArray.getJSONObject(i);
                    plugins.add(new PluginMeta(
                            p.getString("filename"),
                            p.optString("id", ""),
                            p.optString("name", ""),
                            p.optString("author", ""),
                            p.optString("description", ""),
                            p.optString("namespace", ""),
                            p.optString("version", "")
                    ));
                }
            }

            categories.put(catKey, new CategoryInfo(name, description, plugins));
        }

        return new ChannelMetaData(iitcVersion, categories);
    }

    /**
     * Get a flat list of all plugins across all categories
     * (excluding Obsolete and Deleted)
     */
    public List<PluginMeta> getAllPlugins() {
        List<PluginMeta> all = new ArrayList<>();
        for (Map.Entry<String, CategoryInfo> entry : categories.entrySet()) {
            String catName = entry.getKey();
            if ("Obsolete".equals(catName) || "Deleted".equals(catName)) continue;
            all.addAll(entry.getValue().plugins);
        }
        return all;
    }

    /**
     * Category information from meta.json
     */
    public static class CategoryInfo {
        public final String name;
        public final String description;
        public final List<PluginMeta> plugins;

        public CategoryInfo(String name, String description, List<PluginMeta> plugins) {
            this.name = name;
            this.description = description;
            this.plugins = plugins;
        }
    }

    /**
     * Plugin metadata from meta.json
     */
    public static class PluginMeta {
        public final String filename;
        public final String id;
        public final String name;
        public final String author;
        public final String description;
        public final String namespace;
        public final String version;

        public PluginMeta(String filename, String id, String name, String author,
                          String description, String namespace, String version) {
            this.filename = filename;
            this.id = id;
            this.name = name;
            this.author = author;
            this.description = description;
            this.namespace = namespace;
            this.version = version;
        }
    }
}
