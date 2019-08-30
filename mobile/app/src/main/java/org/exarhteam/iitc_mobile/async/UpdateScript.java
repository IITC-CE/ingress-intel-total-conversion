package org.exarhteam.iitc_mobile.async;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.os.AsyncTask;
import android.preference.PreferenceManager;

import org.exarhteam.iitc_mobile.IITC_FileManager;
import org.exarhteam.iitc_mobile.IITC_Mobile;
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

    private final Activity mActivity;
    private String mFilePath;
    private String mScript;
    private HashMap<String, String> mScriptInfo;
    private final boolean mForceSecureUpdates;

    private final OkHttpClient client;

    public UpdateScript(final Activity activity) {
        mActivity = activity;
        mForceSecureUpdates = PreferenceManager.getDefaultSharedPreferences(mActivity)
                .getBoolean("pref_secure_updates", true);
        client = new OkHttpClient();
    }

    @Override
    protected Boolean doInBackground(final String... urls) {
        try {
            mFilePath = urls[0];
            // get local script meta information
            mScript = IITC_FileManager.readStream(new FileInputStream(new File(mFilePath)));
            mScriptInfo = IITC_FileManager.getScriptInfo(mScript);

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

            final File local_file = new File(mFilePath);
            final String local_version = mScriptInfo.get("version");

            if (local_version.compareTo(remote_version) >= 0) return false;

            Log.d("plugin " + mFilePath + " outdated\n" + local_version + " vs " + remote_version);

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
        Response response = client.newCall(
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
        if (updated) {
            final String name = IITC_FileManager.getScriptInfo(mScript).get("name");
            new AlertDialog.Builder(mActivity)
                    .setTitle("Plugin updated")
                    .setMessage(name)
                    .setCancelable(true)
                    .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(final DialogInterface dialog, final int which) {
                            dialog.cancel();
                        }
                    })
                    .setNegativeButton("Reload", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(final DialogInterface dialog, final int which) {
                            dialog.cancel();
                            ((IITC_Mobile) mActivity).reloadIITC();
                        }
                    })
                    .create()
                    .show();
        }
    }
}
