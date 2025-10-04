package org.exarhteam.iitc_mobile.prefs;

import java.util.HashMap;

public class PluginInfo extends HashMap<String, String> {

    public static final String KEY_CATEGORY = "category";
    public static final String KEY_DESCRIPTION = "description";
    public static final String KEY_NAME = "name";
    public static final String KEY_VERSION = "version";
    public static final String KEY_ID = "id";
    public static final String KEY_UPDATE_URL = "updateURL";
    public static final String KEY_DOWNLOAD_URL = "downloadURL";

    private String key;
    private boolean userPlugin;

    private PluginInfo() {
        super();
    }

    public PluginInfo(PluginInfo other) {
        super(other);
        this.key = other.key;
        this.userPlugin = other.userPlugin;
    }

    public static PluginInfo createEmpty() {
        PluginInfo info = new PluginInfo();
        info.setId("unknown");
        info.setVersion("not found");
        info.setName("unknown");
        info.setDescription("");
        info.setCategory("Misc");
        return info;
    }

    public void setId(String id) {
        this.put(KEY_ID, id);
    }

    public void setVersion(String version) {
        this.put(KEY_VERSION, version);
    }

    public void setName(String name) {
        if (name != null) {
            name = name.replace("IITC Plugin: ", "");
            name = name.replace("IITC plugin: ", "");
        }
        this.put(KEY_NAME, name);
    }

    public void setDescription(String description) {
        this.put(KEY_DESCRIPTION, description);
    }

    public void setCategory(String category) {
        this.put(KEY_CATEGORY, category);
    }

    public String getVersion() {
        return this.get(KEY_VERSION);
    }

    public String getId() {
        return this.get(KEY_ID);
    }

    public String getName() {
        String name = this.get(KEY_NAME);
        if (name != null) {
            name = name.replace("IITC Plugin: ", "");
            name = name.replace("IITC plugin: ", "");
        }
        return name;
    }

    public String getUpdateURL() {
        return this.get(KEY_UPDATE_URL);
    }

    public String getDownloadURL() {
        return this.get(KEY_DOWNLOAD_URL);
    }

    public String getCategory() {
        return this.get(KEY_CATEGORY);
    }

    public String getDescription() {
        return this.get(KEY_DESCRIPTION);
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getKey() {
        return this.key;
    }

    public void setUserPlugin(boolean userPlugin) {
        this.userPlugin = userPlugin;
    }

    public boolean isUserPlugin() {
        return userPlugin;
    }
}
