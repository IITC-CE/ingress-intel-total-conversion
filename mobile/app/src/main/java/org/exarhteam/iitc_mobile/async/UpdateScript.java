package org.exarhteam.iitc_mobile.async;

import android.os.AsyncTask;

import org.exarhteam.iitc_mobile.IITC_FileManager;
import org.exarhteam.iitc_mobile.Log;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashMap;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public class UpdateScript extends AsyncTask<String, Void, Boolean> {

    private final ScriptUpdatedFinishedCallback mCallback;
    private final boolean mForceSecureUpdates;
    private final OkHttpClient mClient;
    private String mScriptName;

    public UpdateScript(final ScriptUpdatedFinishedCallback callback, final Boolean forceSecureUpdates) {
        mCallback = callback;
        mForceSecureUpdates = forceSecureUpdates;
        mClient = new OkHttpClient();
    }

    @Override
    protected Boolean doInBackground(final String... urls) {
        try {
            final String filePath = urls[0];
            // get local script meta information
            final String script = IITC_FileManager.readStream(new FileInputStream(new File(filePath)));
            final HashMap<String, String> mScriptInfo = IITC_FileManager.getScriptInfo(script);

            mScriptName = mScriptInfo.get("name");
            String updateURL = mScriptInfo.get("updateURL");
            String downloadURL = mScriptInfo.get("downloadURL");
            if (updateURL == null) updateURL = downloadURL;
            if (updateURL == null) return false;
            if (!isUpdateAllowed(updateURL)) return false;

            final String updateMetaScript = downloadFile(updateURL);
            if (updateMetaScript == null) {
                return false;
            }
            final HashMap<String, String> updateInfo =
                    IITC_FileManager.getScriptInfo(updateMetaScript);

            final String remote_version = updateInfo.get("version");

            final File local_file = new File(filePath);
            final String local_version = mScriptInfo.get("version");

            if (local_version.compareTo(remote_version) >= 0) return false;

            Log.d("plugin " + filePath + " outdated\n" + local_version + " vs " + remote_version);

            String updatedScript = null;
            if (updateURL.equals(downloadURL)) {
                updatedScript = updateMetaScript;
            } else {
                if (updateInfo.get("downloadURL") != null) {
                    downloadURL = updateInfo.get("downloadURL");
                }

                if (!isUpdateAllowed(downloadURL)) return false;
                updatedScript = downloadFile(downloadURL);
                if (updatedScript == null) {
                    return false;
                }
            }

            Log.d("updating file....");
            try (FileOutputStream stream = new FileOutputStream(local_file)) {
                stream.write(updatedScript.getBytes());
            }
            Log.d("...done");

            return true;

        } catch (final IOException e) {
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

    public interface ScriptUpdatedFinishedCallback {
        void scriptUpdateFinished(String scriptName, Boolean updated);
    }
}
