package org.exarhteam.iitc_mobile.async;

import android.os.AsyncTask;

import org.exarhteam.iitc_mobile.IITC_Mobile;
import org.exarhteam.iitc_mobile.Log;
import org.exarhteam.iitc_mobile.TileHttpHelper;

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

            TileHttpHelper.setTileHeadRequestHeaders(conn, mIitc, urls[0]);
            
            final File file = new File(mFilePath);
            if (!file.exists()) {
                return true; // File doesn't exist, nothing to validate
            }

            final long serverLastModified = conn.getLastModified();
            boolean shouldInvalidate = TileHttpHelper.shouldUpdateTile(file, serverLastModified);
            
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
