package org.exarhteam.iitc_mobile.channel;

import android.content.Context;
import android.content.SharedPreferences;
import android.preference.PreferenceManager;

/**
 * Orchestrates channel storage and downloading
 * Single entry point for all channel-related operations
 */
public class ChannelManager {

    private static ChannelManager instance;

    private static final String PREF_CHANNEL = "pref_update_channel";
    private static final String PREF_CUSTOM_URL = "pref_custom_channel_url";

    private final SharedPreferences prefs;
    private final ChannelStorage storage;
    private final ChannelDownloader downloader;

    public ChannelManager(Context context) {
        this.prefs = PreferenceManager.getDefaultSharedPreferences(context);
        this.storage = new ChannelStorage(context);
        this.downloader = new ChannelDownloader();
        instance = this;
    }

    public static ChannelManager getInstance() {
        return instance;
    }

    /**
     * Get the currently selected channel
     */
    public Channel getCurrentChannel() {
        return Channel.fromKey(prefs.getString(PREF_CHANNEL, Channel.BUILTIN.getKey()));
    }

    /**
     * Set the active channel
     */
    public void setChannel(Channel channel) {
        prefs.edit().putString(PREF_CHANNEL, channel.getKey()).apply();
    }

    /**
     * Get custom channel URL
     */
    public String getCustomChannelUrl() {
        return prefs.getString(PREF_CUSTOM_URL, "");
    }

    /**
     * Set custom channel URL
     */
    public void setCustomChannelUrl(String url) {
        prefs.edit().putString(PREF_CUSTOM_URL, url).apply();
    }

    /**
     * Get the base URL for a channel
     */
    public String getBaseUrl(Channel channel) {
        if (channel == Channel.CUSTOM) {
            return getCustomChannelUrl();
        }
        return channel.getDefaultUrl();
    }

    /**
     * Check if a channel has cached scripts ready to use
     */
    public boolean isChannelReady() {
        return isChannelReady(getCurrentChannel());
    }

    /**
     * Check if a specific channel has cached scripts ready to use
     */
    public boolean isChannelReady(Channel channel) {
        if (!channel.isRemote()) return true; // BUILTIN is always ready
        return storage.isChannelReady(channel);
    }

    /**
     * Get parsed metadata for the current channel, or null if not cached
     */
    public ChannelMetaData getMetaData() {
        return getMetaData(getCurrentChannel());
    }

    /**
     * Get parsed metadata for a specific channel, or null if not cached/BUILTIN
     */
    public ChannelMetaData getMetaData(Channel channel) {
        if (!channel.isRemote()) return null;
        return storage.loadMetaJson(channel);
    }

    /**
     * Read the IITC core script from channel cache
     * Returns null for BUILTIN (caller should fall back to assets)
     */
    public String readCore() {
        Channel channel = getCurrentChannel();
        if (!channel.isRemote()) return null;
        return storage.loadCoreScript(channel);
    }

    /**
     * Read a plugin script from channel cache
     * Returns null for BUILTIN or if plugin not cached
     */
    public String readPlugin(String filename) {
        Channel channel = getCurrentChannel();
        if (!channel.isRemote()) return null;
        return storage.loadPlugin(channel, filename);
    }

    /**
     * Download/update scripts for the current channel
     * Must be called from a background thread
     */
    public void syncChannel(ChannelDownloader.Callback callback) {
        Channel channel = getCurrentChannel();
        if (!channel.isRemote()) {
            callback.onComplete();
            return;
        }

        String baseUrl = getBaseUrl(channel);
        if (baseUrl == null || baseUrl.isEmpty()) {
            callback.onError("Channel URL is not configured");
            return;
        }

        downloader.download(channel, baseUrl, storage, callback);
    }

    /**
     * Check if the current channel has updates available
     * Must be called from a background thread
     *
     * @return true if updates are available
     */
    public boolean checkForUpdates() {
        Channel channel = getCurrentChannel();
        if (!channel.isRemote()) return false;

        String baseUrl = getBaseUrl(channel);
        if (baseUrl == null || baseUrl.isEmpty()) return false;

        String storedValidator = storage.getCacheValidator(channel);
        String newValidator = downloader.checkForUpdate(baseUrl, storedValidator);
        return newValidator != null;
    }

    /**
     * Clear cached data for a specific channel
     */
    public void clearChannel(Channel channel) {
        storage.clearChannel(channel);
    }

    /**
     * Get the underlying storage (for use by PluginManager)
     */
    public ChannelStorage getStorage() {
        return storage;
    }
}
