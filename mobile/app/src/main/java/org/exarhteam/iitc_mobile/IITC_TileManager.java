package org.exarhteam.iitc_mobile;

import android.webkit.WebResourceResponse;

import org.exarhteam.iitc_mobile.async.TileValidationChecker;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.net.URL;

public class IITC_TileManager {

    private final IITC_Mobile mIitc;
    private static final String TYPE = "image/*";
    private static final String ENCODING = null;

    IITC_TileManager(IITC_Mobile iitc) {
        mIitc = iitc;
    }

    public WebResourceResponse getTile(String url) throws Exception {
        /*
         * We want to merge equal top lvl domains into one folder.
         * This saves traffic since many tile providers get one and the same tile from different subdomains.
         * Furthermore, it is easier for users to extend their tile-cache by tiles downloaded from PC.
         */
        URL uri = new URL(url);
        String tileHoster = uri.getHost();
        String[] subdomains = tileHoster.split("\\.");
        String hostId = subdomains[subdomains.length - 2] + "." + subdomains[subdomains.length - 1];

        /*
         * now get the file path...example path:
         * /storage/emulated/0/Android/data/org.exarhteam.iitc_mobile/files/mqcdn.com/tiles/1.0.0/map/18/137397/89580.jpg
         */
        String filePath = uri.getPath();
        String path = mIitc.getApplication().getFilesDir().toString() + "/" + hostId + filePath;
        if (uri.getQuery() != null) path += uri.getQuery();

        // do the tile management
        File file = new File(path);
        if (file.exists() && file.length() > 0) {
            // Check if tile is too old (>2 months) - if so, force refresh
            final long updateTime = 2 * 30 * 24 * 60 * 60 * 1000L; // 2 months
            final long systemTime = System.currentTimeMillis();
            final long fileLM = file.lastModified();
            
            if (fileLM <= systemTime - updateTime) {
                return new LazyTileResponse(url, path, mIitc);
            }

            // File exists and is not too old - return immediately
            // Also start background validation to check server's Last-Modified
            new TileValidationChecker(path, mIitc).execute(url);

            InputStream in = new BufferedInputStream(new FileInputStream(file));
            return new WebResourceResponse(TYPE, ENCODING, in);
        } else {
            // file doesn't exist or is corrupted - use lazy loading
            return new LazyTileResponse(url, path, mIitc);
        }
    }
}
