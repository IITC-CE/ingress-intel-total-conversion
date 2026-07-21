package org.exarhteam.iitc_mobile.channel;

import org.exarhteam.iitc_mobile.Log;

import java.io.IOException;
import java.util.List;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

/**
 * Downloads channel data (meta.json, core script, plugins) from a remote URL
 */
public class ChannelDownloader {

    /**
     * Callback for download progress and completion
     */
    public interface Callback {
        void onProgress(int current, int total);
        void onComplete();
        void onError(String message);
    }

    private final OkHttpClient client;

    public ChannelDownloader() {
        this.client = new OkHttpClient();
    }

    /**
     * Download all channel data from baseUrl and save to storage
     * Must be called from a background thread
     *
     * @param channel   the channel to download
     * @param baseUrl   base URL (e.g. "https://iitc.app/build/release")
     * @param storage   storage to save downloaded data
     * @param callback  progress/completion callback (called on the calling thread)
     */
    public void download(Channel channel, String baseUrl, ChannelStorage storage, Callback callback) {
        try {
            // Step 1: Download meta.json and extract cache validator
            DownloadResult metaResult = downloadWithHeaders(baseUrl + "/meta.json");
            if (metaResult == null) {
                callback.onError("Failed to download meta.json");
                return;
            }
            storage.saveMetaJson(channel, metaResult.body);
            if (metaResult.cacheValidator != null) {
                storage.setCacheValidator(channel, metaResult.cacheValidator);
            }

            ChannelMetaData meta = ChannelMetaData.fromJson(metaResult.body);
            List<ChannelMetaData.PluginMeta> plugins = meta.getAllPlugins();
            int total = plugins.size() + 1; // +1 for core script
            int current = 0;

            // Step 2: Download core script
            callback.onProgress(current, total);
            String coreScript = downloadString(baseUrl + "/total-conversion-build.user.js");
            if (coreScript == null) {
                callback.onError("Failed to download IITC core script");
                return;
            }
            storage.saveCoreScript(channel, coreScript);
            current++;

            // Step 3: Download each plugin
            for (ChannelMetaData.PluginMeta plugin : plugins) {
                callback.onProgress(current, total);
                String pluginScript = downloadString(baseUrl + "/plugins/" + plugin.filename);
                if (pluginScript != null) {
                    storage.savePlugin(channel, plugin.filename, pluginScript);
                } else {
                    Log.w("Failed to download plugin: " + plugin.filename);
                }
                current++;
            }

            callback.onProgress(total, total);
            callback.onComplete();

        } catch (Exception e) {
            Log.e("Channel download failed", e);
            callback.onError("Download failed: " + e.getMessage());
        }
    }

    /**
     * Check if remote meta.json has been modified since last download
     * Uses ETag with priority, falls back to Last-Modified
     *
     * @return new cache validator value if changed, null if unchanged or on error
     */
    public String checkForUpdate(String baseUrl, String storedCacheValidator) {
        try {
            Request request = new Request.Builder()
                    .url(baseUrl + "/meta.json")
                    .head()
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (!response.isSuccessful()) return null;

                String validator = extractCacheValidator(response);
                if (validator == null) {
                    // No cache headers available — treat as changed
                    return "";
                }
                if (!validator.equals(storedCacheValidator)) {
                    return validator;
                }
                return null;
            }
        } catch (IOException e) {
            Log.w("Failed to check for channel update: " + e.getMessage());
            return null;
        }
    }

    /**
     * Extract cache validator from response: ETag if available, otherwise Last-Modified
     */
    static String extractCacheValidator(Response response) {
        String etag = response.header("ETag");
        if (etag != null) return etag;
        return response.header("Last-Modified");
    }

    private static class DownloadResult {
        final String body;
        final String cacheValidator;

        DownloadResult(String body, String cacheValidator) {
            this.body = body;
            this.cacheValidator = cacheValidator;
        }
    }

    /**
     * Download a URL and return body + cache validator headers
     */
    private DownloadResult downloadWithHeaders(String url) throws IOException {
        Request request = new Request.Builder()
                .url(url)
                .get()
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                Log.d("Error downloading \"" + url + "\", code: " + response.code());
                return null;
            }
            if (response.body() == null) {
                Log.d("Empty response from " + url);
                return null;
            }
            return new DownloadResult(response.body().string(), extractCacheValidator(response));
        }
    }

    private String downloadString(String url) throws IOException {
        DownloadResult result = downloadWithHeaders(url);
        return result != null ? result.body : null;
    }
}
