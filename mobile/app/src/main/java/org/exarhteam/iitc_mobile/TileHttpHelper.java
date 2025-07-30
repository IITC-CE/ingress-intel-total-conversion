package org.exarhteam.iitc_mobile;

import java.io.File;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLConnection;

/**
 * Utility class for common HTTP operations with tile servers.
 * Provides shared logic for setting proper headers and checking tile freshness.
 */
public class TileHttpHelper {
    
    // Cache update interval: 2 months in milliseconds
    public static final long TILE_UPDATE_TIME = 2 * 30 * 24 * 60 * 60 * 1000L;
    
    /**
     * Sets proper HTTP headers for tile requests to comply with tile server policies
     * 
     * @param conn HTTP connection to configure
     * @param iitc IITC_Mobile instance for getting User-Agent and other settings
     * @param url Request URL for logging purposes
     * @throws IOException if connection setup fails
     */
    public static void setTileRequestHeaders(URLConnection conn, IITC_Mobile iitc, String url) throws IOException {
        URL tileUrl = conn.getURL();
        String host = tileUrl.getHost();
        
        // Get User-Agent - use specific one for known hosts, fallback to IITC default for others
        String userAgent = iitc.getUserAgentForHostname(host);
        if (userAgent == null) {
            userAgent = iitc.getDefaultUserAgent();
        }
        
        String referer = iitc.getIntelUrl();
        
        // Set headers
        conn.setRequestProperty("User-Agent", userAgent);
        conn.setRequestProperty("Referer", referer);
        
        // Set timeouts
        conn.setConnectTimeout(10000); // 10 seconds
    }
    
    /**
     * Sets headers specifically for HEAD requests (validation).
     */
    public static void setTileHeadRequestHeaders(HttpURLConnection conn, IITC_Mobile iitc, String url) throws IOException {
        setTileRequestHeaders(conn, iitc, url);
        conn.setRequestMethod("HEAD");
        conn.setReadTimeout(5000); // 5 seconds for HEAD requests
    }
    
    /**
     * Sets headers for GET requests (downloading).
     */
    public static void setTileGetRequestHeaders(URLConnection conn, IITC_Mobile iitc, String url) throws IOException {
        setTileRequestHeaders(conn, iitc, url);
        conn.setRequestProperty("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8");
        conn.setReadTimeout(30000); // 30 seconds for downloads
    }
    
    /**
     * Checks if a cached tile file is outdated based on server's Last-Modified header
     * and local fallback rules.
     * 
     * @param file Local tile file
     * @param serverLastModified Last-Modified timestamp from server (0 if not available)
     * @return true if tile should be updated, false if current cache is still valid
     */
    public static boolean shouldUpdateTile(File file, long serverLastModified) {
        if (!file.exists()) {
            return true; // File doesn't exist - need to download
        }
        
        final long fileLM = file.lastModified();
        final long systemTime = System.currentTimeMillis();
        
        if (serverLastModified != 0) {
            // Server provided Last-Modified header - use it for comparison
            if (serverLastModified > fileLM) {
                Log.d("Tile outdated by server timestamp: " + file.toString());
                return true;
            }
        } else {
            // No Last-Modified header - use 2 month rule
            if (fileLM <= systemTime - TILE_UPDATE_TIME) {
                Log.d("Tile outdated by age (>2 months): " + file.toString());
                return true;
            }
        }
        
        return false; // Tile is still valid
    }
    
    /**
     * Checks if tile is valid for immediate cache return (not too old).
     */
    public static boolean isTileValidForCache(File file) {
        if (!file.exists() || file.length() == 0) {
            return false;
        }
        
        final long fileLM = file.lastModified();
        final long systemTime = System.currentTimeMillis();
        
        // Return cached tile if younger than 2 months
        return fileLM > systemTime - TILE_UPDATE_TIME;
    }
}