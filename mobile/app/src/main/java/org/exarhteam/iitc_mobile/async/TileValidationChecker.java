package org.exarhteam.iitc_mobile.async;

import android.os.AsyncTask;

import org.exarhteam.iitc_mobile.IITC_Mobile;
import org.exarhteam.iitc_mobile.Log;

import java.io.File;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Background task to check if cached tiles are outdated using HEAD requests.
 * If a tile is outdated, it gets deleted from cache so that next request will fetch fresh version.
 */
public class TileValidationChecker extends AsyncTask<String, Void, Boolean> {

    private final String mFilePath;
    private final IITC_Mobile mIitc;

    public TileValidationChecker(final String filePath, final IITC_Mobile iitc) {
        mFilePath = filePath;
        mIitc = iitc;
    }

    @Override
    protected Boolean doInBackground(final String... urls) {
        try {
            URL tileUrl = new URL(urls[0]);
            HttpURLConnection conn = (HttpURLConnection) tileUrl.openConnection();

            String host = tileUrl.getHost();
            String userAgent = mIitc.getUserAgentForHostname(host);

            // Fallback to IITC default User-Agent for unknown hosts
            if (userAgent == null) {
                userAgent = mIitc.getDefaultUserAgent();
            }

            String referer = mIitc.getIntelUrl();

            conn.setRequestProperty("User-Agent", userAgent);
            conn.setRequestProperty("Referer", referer);
            conn.setRequestMethod("HEAD"); // Use HEAD request - only get headers, not content
            conn.setConnectTimeout(10000); // 10 seconds
            conn.setReadTimeout(5000);     // 5 seconds for HEAD
            
            final File file = new File(mFilePath);
            if (!file.exists()) {
                return true; // File doesn't exist, nothing to validate
            }

            // Get modification times
            final long urlLM = conn.getLastModified();
            final long fileLM = file.lastModified();
            
            // some tiles don't have the lastModified header field set
            // ...update tile every two month
            final long updateTime = 2 * 30 * 24 * 60 * 60 * 1000L;
            final long systemTime = System.currentTimeMillis();
            
            boolean shouldInvalidate = false;
            
            if (urlLM != 0) {
                // Server provided Last-Modified header
                if (urlLM > fileLM) {
                    shouldInvalidate = true;
                    Log.d("Tile outdated by server timestamp: " + file.toString());
                }
            } else {
                // No Last-Modified header - use 2 month rule
                if (fileLM <= systemTime - updateTime) {
                    shouldInvalidate = true;
                    Log.d("Tile outdated by age (>2 months): " + file.toString());
                }
            }
            
            if (shouldInvalidate) {
                // Remove outdated tile from cache
                if (file.delete()) {
                    Log.d("Outdated tile removed from cache: " + file.toString());
                } else {
                    Log.w("Failed to remove outdated tile: " + file.toString());
                }
                return false; // Indicate tile was invalidated
            }
            
            return true; // Tile is still valid
            
        } catch (final IOException e) {
            Log.w("Failed to validate tile " + mFilePath + ": " + e.getMessage());
            return true;
        }
    }
}
