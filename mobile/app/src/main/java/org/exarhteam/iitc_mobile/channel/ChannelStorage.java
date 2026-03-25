package org.exarhteam.iitc_mobile.channel;

import android.content.Context;
import android.content.SharedPreferences;

import org.exarhteam.iitc_mobile.Log;
import org.json.JSONException;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Manages file I/O for cached channel data
 * Scripts are stored in internal app storage: files/channel/{channel_name}/
 */
public class ChannelStorage {

    private static final String CHANNEL_DIR = "channel";
    private static final String META_JSON = "meta.json";
    private static final String CORE_SCRIPT = "total-conversion-build.user.js";
    private static final String PLUGINS_DIR = "plugins";
    private static final String PREF_NAME = "channel_storage";
    private static final String PREF_CACHE_VALIDATOR_PREFIX = "cache_validator_";

    private final Context context;
    private final SharedPreferences prefs;

    public ChannelStorage(Context context) {
        this.context = context;
        this.prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    /**
     * Get the root directory for a channel's cached data
     */
    public File getChannelDir(Channel channel) {
        return new File(context.getFilesDir(), CHANNEL_DIR + "/" + channel.getKey());
    }

    /**
     * Save raw meta.json content for a channel
     */
    public void saveMetaJson(Channel channel, String rawJson) throws IOException {
        writeFile(new File(getChannelDir(channel), META_JSON), rawJson);
    }

    /**
     * Load and parse meta.json for a channel, or null if not cached
     */
    public ChannelMetaData loadMetaJson(Channel channel) {
        String json = readFile(new File(getChannelDir(channel), META_JSON));
        if (json == null) return null;
        try {
            return ChannelMetaData.fromJson(json);
        } catch (JSONException e) {
            Log.e("Failed to parse cached meta.json for channel " + channel.getKey(), e);
            return null;
        }
    }

    /**
     * Save the IITC core script for a channel
     */
    public void saveCoreScript(Channel channel, String content) throws IOException {
        writeFile(new File(getChannelDir(channel), CORE_SCRIPT), content);
    }

    /**
     * Load the IITC core script for a channel, or null if not cached
     */
    public String loadCoreScript(Channel channel) {
        return readFile(new File(getChannelDir(channel), CORE_SCRIPT));
    }

    /**
     * Save a plugin script for a channel
     */
    public void savePlugin(Channel channel, String filename, String content) throws IOException {
        File pluginsDir = new File(getChannelDir(channel), PLUGINS_DIR);
        writeFile(new File(pluginsDir, filename), content);
    }

    /**
     * Load a plugin script for a channel, or null if not cached
     */
    public String loadPlugin(Channel channel, String filename) {
        File pluginsDir = new File(getChannelDir(channel), PLUGINS_DIR);
        return readFile(new File(pluginsDir, filename));
    }

    /**
     * Check if a channel has cached core script (minimum requirement to be "ready")
     */
    public boolean isChannelReady(Channel channel) {
        File coreFile = new File(getChannelDir(channel), CORE_SCRIPT);
        return coreFile.exists() && coreFile.length() > 0;
    }

    /**
     * Get stored cache validator (ETag or Last-Modified) for a channel
     */
    public String getCacheValidator(Channel channel) {
        return prefs.getString(PREF_CACHE_VALIDATOR_PREFIX + channel.getKey(), null);
    }

    /**
     * Store cache validator (ETag or Last-Modified) for a channel
     */
    public void setCacheValidator(Channel channel, String validator) {
        prefs.edit().putString(PREF_CACHE_VALIDATOR_PREFIX + channel.getKey(), validator).apply();
    }

    /**
     * Delete all cached data for a channel
     */
    public void clearChannel(Channel channel) {
        deleteRecursive(getChannelDir(channel));
        prefs.edit().remove(PREF_CACHE_VALIDATOR_PREFIX + channel.getKey()).apply();
    }

    private void writeFile(File file, String content) throws IOException {
        File parent = file.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            throw new IOException("Failed to create directory: " + parent.getAbsolutePath());
        }
        try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(content.getBytes(StandardCharsets.UTF_8));
        }
    }

    private String readFile(File file) {
        if (!file.exists()) return null;
        try {
            try (FileInputStream fis = new FileInputStream(file)) {
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                byte[] buf = new byte[4096];
                int len;
                while ((len = fis.read(buf)) != -1) {
                    bos.write(buf, 0, len);
                }
                return bos.toString("UTF-8");
            }
        } catch (IOException e) {
            Log.e("Failed to read file: " + file.getAbsolutePath(), e);
            return null;
        }
    }

    private void deleteRecursive(File file) {
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        if (!file.delete()) {
            Log.w("Failed to delete: " + file.getAbsolutePath());
        }
    }
}
