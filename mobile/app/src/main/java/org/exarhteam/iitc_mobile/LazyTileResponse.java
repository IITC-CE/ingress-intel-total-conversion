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

        TileHttpHelper.setTileGetRequestHeaders(conn, iitc, url);

        // Check if we need to update
        final File file = new File(cachePath);
        final long serverLastModified = conn.getLastModified();

        // If file exists and is not outdated, return from cache instead
        if (!TileHttpHelper.shouldUpdateTile(file, serverLastModified)) {
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