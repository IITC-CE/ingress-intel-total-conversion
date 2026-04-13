package org.exarhteam.iitc_mobile.channel;

/**
 * Represents an update channel for IITC scripts
 */
public enum Channel {
    BUILTIN("builtin", null),
    RELEASE("release", "https://iitc.app/build/release"),
    BETA("beta", "https://iitc.app/build/beta"),
    CUSTOM("custom", null);

    private final String key;
    private final String defaultUrl;

    Channel(String key, String defaultUrl) {
        this.key = key;
        this.defaultUrl = defaultUrl;
    }

    /**
     * The string key used in SharedPreferences and storage paths
     */
    public String getKey() {
        return key;
    }

    /**
     * Default base URL for this channel, or null for BUILTIN/CUSTOM
     */
    public String getDefaultUrl() {
        return defaultUrl;
    }

    /**
     * Whether this channel requires network to fetch scripts
     */
    public boolean isRemote() {
        return this != BUILTIN;
    }

    /**
     * Parse a channel from its preference key string
     */
    public static Channel fromKey(String key) {
        if (key == null) return BUILTIN;
        for (Channel c : values()) {
            if (c.key.equals(key)) return c;
        }
        return BUILTIN;
    }
}
