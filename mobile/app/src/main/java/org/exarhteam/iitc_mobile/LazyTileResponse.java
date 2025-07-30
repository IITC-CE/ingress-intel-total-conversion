package org.exarhteam.iitc_mobile;

import android.webkit.WebResourceResponse;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;
import java.util.concurrent.ConcurrentHashMap;

public class LazyTileResponse extends WebResourceResponse {
    private final String url;
    private final String cachePath;
    private final IITC_Mobile iitc;
    private static final String TYPE = "image/*";
    private static final String ENCODING = null;

    // Prevent concurrent writes to the same file
    private static final ConcurrentHashMap<String, Object> fileLocks = new ConcurrentHashMap<>();

    public LazyTileResponse(String url, String cachePath, IITC_Mobile iitc) {
        super(TYPE, ENCODING, null);
        this.url = url;
        this.cachePath = cachePath;
        this.iitc = iitc;
    }

    @Override
    public InputStream getData() {
        Object lock = fileLocks.computeIfAbsent(cachePath, k -> new Object());

        try {
            synchronized (lock) {
                return downloadAndCacheTile();
            }
        } catch (Exception e) {
            Log.w("Tile download failed for " + url + ": " + e.getMessage());
            return null;
        } finally {
            fileLocks.remove(cachePath);
        }
    }

    private InputStream downloadAndCacheTile() throws IOException {
        URL tileUrl = new URL(url);
        URLConnection conn = tileUrl.openConnection();

        // Add proper headers like WebView does
        String host = tileUrl.getHost();
        String userAgent = iitc.getUserAgentForHostname(host);

        // Fallback to IITC default User-Agent for unknown hosts
        if (userAgent == null) {
            userAgent = iitc.getDefaultUserAgent();
        }

        String referer = iitc.getIntelUrl();
        String accept = "image/webp,image/apng,image/*,*/*;q=0.8";

        conn.setRequestProperty("User-Agent", userAgent);
        conn.setRequestProperty("Referer", referer);
        conn.setRequestProperty("Accept", accept);
        conn.setConnectTimeout(10000); // 10 seconds
        conn.setReadTimeout(30000);    // 30 seconds

        // Check if we need to update
        final File file = new File(cachePath);
        final long updateTime = 2 * 30 * 24 * 60 * 60 * 1000L;
        final long systemTime = System.currentTimeMillis();
        final long urlLM = conn.getLastModified();
        final long fileLM = file.lastModified();

        // If file exists and is not outdated, return from cache instead
        if (file.exists() && urlLM != 0 && urlLM <= fileLM) {
            return new BufferedInputStream(new FileInputStream(file));
        }
        if (file.exists() && urlLM == 0 && (fileLM > systemTime - updateTime)) {
            return new BufferedInputStream(new FileInputStream(file));
        }
        
        // Download and cache
        InputStream inputStream = conn.getInputStream();
        Log.d("writing to file: " + file.toString());
        writeTileToFile(inputStream, file);

        // Return cached file
        return new BufferedInputStream(new FileInputStream(file));
    }

    private void writeTileToFile(final InputStream inStream, final File file) throws IOException {
        file.getParentFile().mkdirs();
        final FileOutputStream outStream = new FileOutputStream(file);
        IITC_FileManager.copyStream(inStream, outStream, true);
    }
}