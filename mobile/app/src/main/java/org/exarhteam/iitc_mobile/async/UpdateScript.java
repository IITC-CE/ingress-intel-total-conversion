package org.exarhteam.iitc_mobile.async;

import android.content.Context;
import android.net.Uri;
import android.os.AsyncTask;
import androidx.documentfile.provider.DocumentFile;

import org.exarhteam.iitc_mobile.IITC_FileManager;
import org.exarhteam.iitc_mobile.IITC_StorageManager;
import org.exarhteam.iitc_mobile.Log;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.MalformedURLException;
import java.net.URL;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.exarhteam.iitc_mobile.prefs.PluginInfo;

public class UpdateScript extends AsyncTask<String, Void, Boolean> {

    public interface ScriptUpdatedFinishedCallback {
        void scriptUpdateFinished(String scriptName, Boolean updated);
    }

    private final ScriptUpdatedFinishedCallback mCallback;
    private String mScriptName;
    private final boolean mForceSecureUpdates;

    private final OkHttpClient mClient;
    private Context mContext;

    public UpdateScript(final ScriptUpdatedFinishedCallback callback, final Boolean forceSecureUpdates) {
        mCallback = callback;
        mForceSecureUpdates = forceSecureUpdates;
        mClient = new OkHttpClient();
    }

    public UpdateScript(final Context context, final ScriptUpdatedFinishedCallback callback, final Boolean forceSecureUpdates) {
        this(callback, forceSecureUpdates);
        mContext = context;
    }

    @Override
    protected Boolean doInBackground(final String... params) {
        try {
            final String pluginKey = params[0];
            String script;
            PluginInfo mScriptInfo;

            // Handle both legacy file paths and SAF URIs
            if (IITC_StorageManager.isLegacyStorageMode() || !isValidUri(pluginKey)) {
                // Legacy mode or asset plugin
                script = IITC_FileManager.readStream(new FileInputStream(new File(pluginKey)));
                mScriptInfo = IITC_FileManager.getScriptInfo(script);
            } else {
                // SAF mode
                if (mContext == null) {
                    Log.e("UpdateScript requires context for SAF mode");
                    return false;
                }

                DocumentFile file = DocumentFile.fromSingleUri(mContext, Uri.parse(pluginKey));
                if (file == null || !file.exists()) {
                    Log.e("Plugin file not found: " + pluginKey);
                    return false;
                }

                InputStream is = mContext.getContentResolver().openInputStream(file.getUri());
                script = IITC_FileManager.readStream(is);
                mScriptInfo = IITC_FileManager.getScriptInfo(script);
            }

            mScriptName = mScriptInfo.getName();
            String updateURL = mScriptInfo.getUpdateURL();
            String downloadURL = mScriptInfo.getDownloadURL();
            if (updateURL == null) updateURL = downloadURL;
            if (updateURL == null) return false;
            if (!isUpdateAllowed(updateURL)) return false;

            final String updateMetaScript = downloadFile(updateURL);
            if (updateMetaScript == null) {
                return false;
            }
            final PluginInfo updateInfo = IITC_FileManager.getScriptInfo(updateMetaScript);

            final String remote_version = updateInfo.getVersion();
            final String local_version = mScriptInfo.getVersion();

            if (local_version.compareTo(remote_version) >= 0) return false;

            Log.d("plugin " + pluginKey + " outdated\n" + local_version + " vs " + remote_version);

            String updatedScript = null;
            if (updateURL.equals(downloadURL)) {
                updatedScript = updateMetaScript;
            } else {
                if (updateInfo.getDownloadURL() != null) {
                    downloadURL = updateInfo.getDownloadURL();
                }

                if (!isUpdateAllowed(downloadURL)) return false;
                updatedScript = downloadFile(downloadURL);
                if (updatedScript == null) {
                    return false;
                }
            }

            Log.d("updating file....");

            // Write updated script
            if (IITC_StorageManager.isLegacyStorageMode() || !isValidUri(pluginKey)) {
                // Legacy mode
                try (FileOutputStream stream = new FileOutputStream(new File(pluginKey))) {
                    stream.write(updatedScript.getBytes());
                }
            } else {
                // SAF mode
                DocumentFile file = DocumentFile.fromSingleUri(mContext, Uri.parse(pluginKey));
                try (OutputStream stream = mContext.getContentResolver().openOutputStream(file.getUri())) {
                    stream.write(updatedScript.getBytes());
                }
            }

            Log.d("...done");

            return true;

        } catch (final IOException e) {
            Log.e("Failed to update plugin", e);
            return false;
        }
    }

    private boolean isValidUri(String str) {
        try {
            Uri uri = Uri.parse(str);
            return uri.getScheme() != null;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isUpdateAllowed(final String url) throws MalformedURLException {
        if (new URL(url).getProtocol().equals("https"))
            return true;

        return !mForceSecureUpdates;
    }

    private String downloadFile(final String url) throws IOException {
        final Response response = mClient.newCall(
                new Request.Builder()
                        .url(url)
                        .get()
                        .build()).execute();
        final int code = response.code();
        if (code != 200) {
            Log.d("Error when request \"" + url + "\", code: " + code);
            return null;
        }
        if (response.body() == null) {
            Log.d("Empty response from " + url);
            return null;
        }
        return response.body().string();
    }

    @Override
    protected void onPostExecute(final Boolean updated) {
        mCallback.scriptUpdateFinished(mScriptName, updated);
    }
}
