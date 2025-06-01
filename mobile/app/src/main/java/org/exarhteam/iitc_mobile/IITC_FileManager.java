package org.exarhteam.iitc_mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.preference.PreferenceManager;
import android.text.Html;
import android.util.Base64;
import android.util.Base64OutputStream;
import android.webkit.WebResourceResponse;
import android.widget.Toast;

import androidx.documentfile.provider.DocumentFile;

import org.exarhteam.iitc_mobile.IITC_Mobile.ResponseHandler;
import org.exarhteam.iitc_mobile.async.UpdateScript;
import org.exarhteam.iitc_mobile.prefs.PluginInfo;
import org.exarhteam.iitc_mobile.prefs.PluginPreferenceActivity;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.io.StringReader;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLEncoder;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class IITC_FileManager {

    private static final WebResourceResponse EMPTY =
            new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream("".getBytes()));
    private static final String WRAPPER_NEW = "wrapper(info);";
    private static final String WRAPPER_OLD =
            "script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));\n"
                    + "(document.body || document.head || document.documentElement).appendChild(script);";

    // update interval is 2 days by default
    private long mUpdateInterval = 1000 * 60 * 60 * 24 * 7;

    public static final String DOMAIN = ".iitcm.localhost";

    private final AssetManager mAssetManager;
    private final Activity mActivity;
    private final SharedPreferences mPrefs;
    private final IITC_StorageManager mStorageManager;
    private final IITC_PluginManager mPluginManager;

    public IITC_FileManager(final Activity activity) {
        mActivity = activity;
        mPrefs = PreferenceManager.getDefaultSharedPreferences(activity);
        mAssetManager = mActivity.getAssets();
        mStorageManager = new IITC_StorageManager(activity);
        mPluginManager = IITC_PluginManager.getInstance();
    }

    /**
     * copies the contents of a stream into another stream and (optionally) closes the output stream afterwards
     *
     * @param inStream    the stream to read from
     * @param outStream   the stream to write to
     * @param closeOutput whether to close the output stream when finished
     * @throws IOException
     */
    public static void copyStream(final InputStream inStream, final OutputStream outStream, final boolean closeOutput)
            throws IOException {
        // in case Android includes Apache commons IO in the future, this function should be replaced by IOUtils.copy
        final int bufferSize = 4096;
        final byte[] buffer = new byte[bufferSize];
        int len = 0;

        try {
            while ((len = inStream.read(buffer)) != -1) {
                outStream.write(buffer, 0, len);
            }
        } finally {
            if (outStream != null && closeOutput)
                outStream.close();
        }
    }

    public static PluginInfo getScriptInfo(final String js) {
        final PluginInfo info = PluginInfo.createEmpty();
        String header = "";
        // get metadata of javascript file
        if (js != null && js.contains("==UserScript==") && js.contains("==/UserScript==")) {
            header = js.substring(js.indexOf("==UserScript=="),
                    js.indexOf("==/UserScript=="));
        }

        final BufferedReader reader = new BufferedReader(new StringReader(header));
        try {
            final Pattern p = Pattern.compile("^\\s*//\\s*@(\\S+)(.*)$");
            String headerLine;
            while ((headerLine = reader.readLine()) != null) {
                final Matcher m = p.matcher(headerLine);
                if (m.matches()) {
                    info.put(m.group(1), m.group(2).trim());
                }
            }
        } catch (final IOException e) {
            Log.w(e);
        }
        return info;
    }

    public static String readStream(final InputStream stream) {
        final ByteArrayOutputStream os = new ByteArrayOutputStream();

        try {
            copyStream(stream, os, true);
        } catch (final IOException e) {
            Log.w(e);
            return "";
        }
        return os.toString();
    }

    public InputStream getAssetFile(final String filename) throws IOException {
        if (mPrefs.getBoolean("pref_dev_checkbox", false)) {
            DocumentFile devFolder = mStorageManager.getDevFolder();
            if (devFolder != null) {
                DocumentFile file = devFolder.findFile(filename);
                if (file != null && file.exists()) {
                    try {
                        return mStorageManager.openPluginInputStream(file);
                    } catch (IOException e) {
                        showDevFileNotFoundError(filename);
                        Log.w(e);
                    }
                } else {
                    showDevFileNotFoundError(filename);
                }
            }
        }

        // load plugins from asset folder
        return mAssetManager.open(filename);
    }

    private void showDevFileNotFoundError(String filename) {
        mActivity.runOnUiThread(() -> Toast.makeText(mActivity,
                "File " + filename + " not found in dev folder. " +
                        "Disable developer mode or add iitc files to the dev folder.",
                Toast.LENGTH_SHORT).show());
    }

    private WebResourceResponse getFileRequest(final Uri uri) {
        return new FileRequest(uri);
    }

    private WebResourceResponse getScript(final Uri uri) {
        InputStream stream;
        try {
            stream = getAssetFile(uri.getPath().substring(1));
        } catch (final IOException e) {
            Log.w(e);
            return EMPTY;
        }

        final InputStream data = prepareUserScript(stream);

        return new WebResourceResponse("application/javascript", "UTF-8", data);
    }

    private WebResourceResponse getPlugin(final String pluginId) {
        if (!mPrefs.getBoolean(pluginId, false)) {
            Log.e("Attempted to inject plugin that is not enabled: " + pluginId);
            return EMPTY;
        }

        IITC_PluginManager.Plugin plugin = mPluginManager.getPlugin(pluginId);
        if (plugin == null) {
            Log.e("Plugin not found: " + pluginId);
            return EMPTY;
        }

        try {
            String content = mPluginManager.readPluginContent(plugin, mStorageManager, mAssetManager);
            if (content.isEmpty()) {
                Log.e("Plugin content is empty: " + pluginId);
                return EMPTY;
            }

            final InputStream data = prepareUserScript(new ByteArrayInputStream(content.getBytes()));
            return new WebResourceResponse("application/javascript", "UTF-8", data);

        } catch (Exception e) {
            Log.w("Could not load plugin: " + pluginId, e);
            // Disable the plugin if it fails to load
            SharedPreferences.Editor editor = mPrefs.edit();
            editor.remove(pluginId);
            editor.apply();
            return EMPTY;
        }
    }

    private PluginInfo getScriptInfo(final InputStream stream) {
        return getScriptInfo(readStream(stream));
    }

    private InputStream prepareUserScript(final InputStream stream) {
        String content = readStream(stream);
        final PluginInfo info = getScriptInfo(content);

        final JSONObject jObject = new JSONObject(info);
        final String gmInfo = "var GM_info={\"script\":" + jObject.toString() + "};\n";

        content = content.replace(WRAPPER_OLD, WRAPPER_NEW);

        return new ByteArrayInputStream((gmInfo + content).getBytes());
    }

    public String getFileRequestPrefix() {
        return "//file-request" + DOMAIN + "/";
    }

    public String getIITCVersion() throws IOException {
        final InputStream stream = getAssetFile("total-conversion-build.user.js");

        return getScriptInfo(stream).getVersion();
    }

    public WebResourceResponse getResponse(final Uri uri) {
        String host = uri.getHost();
        if (!host.endsWith(DOMAIN))
            return EMPTY;

        host = host.substring(0, host.length() - DOMAIN.length());

        if ("script".equals(host))
            return getScript(uri);

        if ("plugin".equals(host)) {
            String path = uri.getPath();
            if (path == null) {
                Log.e("IITC_FileManager", "Plugin path is null for URI: " + uri);
                return EMPTY;
            }

            if (path.startsWith("/")) {
                path = path.substring(1);
            }

            return getPlugin(path);
        }

        if ("file-request".equals(host))
            return getFileRequest(uri);

        Log.e("could not generate response for url: " + uri);
        return EMPTY;
    }

    public void installPlugin(final Uri uri, final boolean invalidateHeaders) {
        if (uri != null) {
            if (!mStorageManager.hasPluginsFolderAccess()) {
                // Request folder access and remember the pending installation
                mActivity.runOnUiThread(() -> {
                    new AlertDialog.Builder(mActivity)
                            .setTitle(R.string.plugins_folder_access_title)
                            .setMessage(R.string.plugins_folder_access_message)
                            .setPositiveButton(android.R.string.ok, (dialog, which) -> {
                                mStorageManager.requestFolderAccess(mActivity);
                                // Save pending installation URI
                                mPrefs.edit().putString("pending_plugin_install", uri.toString()).apply();
                            })
                            .setNegativeButton(android.R.string.cancel, null)
                            .show();
                });
                return;
            }

            String text = mActivity.getString(R.string.install_dialog_msg);
            text = String.format(text, uri);

            // create alert dialog
            new AlertDialog.Builder(mActivity)
                    .setTitle(mActivity.getString(R.string.install_dialog_top))
                    .setMessage(Html.fromHtml(text))
                    .setCancelable(true)
                    .setPositiveButton(android.R.string.ok, new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(final DialogInterface dialog, final int which) {
                            copyPlugin(uri, invalidateHeaders);
                        }
                    })
                    .setNegativeButton(android.R.string.cancel, new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(final DialogInterface dialog, final int which) {
                            dialog.cancel();
                        }
                    })
                    .create()
                    .show();
        }
    }

    private void copyPlugin(final Uri uri, final boolean invalidateHeaders) {
        final Thread thread = new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    final String url = uri.toString();
                    InputStream is;
                    String fileName;
                    final String uriScheme = uri.getScheme();
                    if (uriScheme != null && uriScheme.contains("http")) {
                        final URLConnection conn = new URL(url).openConnection();
                        is = conn.getInputStream();
                        fileName = uri.getLastPathSegment();
                    } else {
                        // we need 2 streams since an inputStream is useless after read once
                        // we read it twice because we first need the script ID for the fileName and
                        // afterwards reading it again while copying
                        is = mActivity.getContentResolver().openInputStream(uri);
                        final InputStream isCopy = mActivity.getContentResolver().openInputStream(uri);
                        fileName = getScriptInfo(isCopy).getId() + ".user.js";
                    }

                    DocumentFile pluginFile = mStorageManager.createPluginFile(fileName);
                    if (pluginFile != null) {
                        OutputStream os = mStorageManager.openPluginOutputStream(pluginFile);
                        IITC_FileManager.copyStream(is, os, true);
                    } else {
                        throw new IOException("Failed to create plugin file");
                    }

                    mActivity.runOnUiThread(() ->
                            Toast.makeText(mActivity, R.string.plugin_install_successful, Toast.LENGTH_SHORT).show()
                    );
                } catch (final IOException e) {
                    Log.w(e);
                    mActivity.runOnUiThread(() ->
                            Toast.makeText(mActivity, R.string.plugin_install_failed, Toast.LENGTH_SHORT).show()
                    );
                }
            }
        });
        thread.start();
        if (invalidateHeaders) {
            try {
                thread.join();
                ((PluginPreferenceActivity) mActivity).invalidateHeaders();
            } catch (final InterruptedException e) {
                Log.w(e);
            }
        }
    }

    public void updatePlugins(final boolean force) {
        // do nothing if updates are disabled
        if (mUpdateInterval == 0 && !force) return;
        // check last script update
        final long lastUpdated = mPrefs.getLong("pref_last_plugin_update", 0);
        final long now = System.currentTimeMillis();

        // return if no update wanted
        if ((now - lastUpdated < mUpdateInterval) && !force) return;

        // Get enabled plugins and update them
        final Boolean forceSecureUpdates = mPrefs.getBoolean("pref_secure_updates", true);

        for (IITC_PluginManager.Plugin plugin : mPluginManager.getEnabledPlugins(mPrefs)) {
            if (plugin.isUser()) {
                // Only update user plugins (asset plugins can't be updated)
                String pluginUri = plugin.file.getUri().toString();
                new UpdateScript(mActivity, new ScriptUpdatedCallback(), forceSecureUpdates).execute(pluginUri);
            }
        }

        mPrefs.edit()
                .putLong("pref_last_plugin_update", now)
                .commit();
    }

    public IITC_StorageManager getStorageManager() {
        return mStorageManager;
    }

    private class ScriptUpdatedCallback implements UpdateScript.ScriptUpdatedFinishedCallback {
        public void scriptUpdateFinished(String scriptName, Boolean updated) {
            if (!updated) {
                return;
            }
            new AlertDialog.Builder(mActivity)
                    .setTitle(mActivity.getString(R.string.plugin_updated))
                    .setMessage(scriptName)
                    .setCancelable(true)
                    .setPositiveButton(android.R.string.ok, new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(final DialogInterface dialog, final int which) {
                            dialog.cancel();
                        }
                    })
                    .setNegativeButton(mActivity.getString(R.string.menu_reload), new DialogInterface.OnClickListener() {
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


    public void setUpdateInterval(final int interval) {
        mUpdateInterval = 1000 * 60 * 60 * 24 * interval;
    }

    private class FileRequest extends WebResourceResponse implements ResponseHandler, Runnable {
        private Intent mData;
        private final String mFunctionName;
        private int mResultCode;
        private PipedOutputStream mStreamOut;

        private FileRequest(final Uri uri) {
            // create two connected streams we can write to after the file has been read
            super("application/javascript", "UTF-8", new PipedInputStream());

            try {
                mStreamOut = new PipedOutputStream((PipedInputStream) getData());
            } catch (final IOException e) {
                Log.w(e);
            }

            // the function to call
            mFunctionName = uri.getPathSegments().get(0);

            // create the chooser Intent
            final Intent target = new Intent(Intent.ACTION_GET_CONTENT)
                    .setType("*/*")
                    .addCategory(Intent.CATEGORY_OPENABLE);
            final IITC_Mobile iitc = (IITC_Mobile) mActivity;

            Log.d("Request permissions");

            try {
                iitc.startActivityForResult(Intent.createChooser(target, mActivity.getString(R.string.file_browser_choose_file)), this);
            } catch (final ActivityNotFoundException e) {
                Toast.makeText(mActivity, mActivity.getString(R.string.file_browser_is_required), Toast.LENGTH_LONG).show();
            }
        }

        @Override
        public void onActivityResult(final int resultCode, final Intent data) {
            final IITC_Mobile iitc = (IITC_Mobile) mActivity;
            iitc.deleteResponseHandler(this); // to enable garbage collection

            mResultCode = resultCode;
            mData = data;

            // read file in new thread using Runnable interface, see run()
            new Thread(this, "FileRequestReader").start();
        }

        @Override
        public void run() {
            try {
                if (mResultCode == Activity.RESULT_OK && mData != null) {
                    final Uri uri = mData.getData();

                    // now create a resource that basically looks like:
                    // someFunctionName('<url encoded filename>', '<base64 encoded content>');

                    final String filename = uri.getLastPathSegment();
                    final String call = mFunctionName + "('" + URLEncoder.encode(filename, "UTF-8") + "', '";
                    mStreamOut.write(call.getBytes());

                    final Base64OutputStream encoder =
                            new Base64OutputStream(mStreamOut, Base64.NO_CLOSE | Base64.NO_WRAP | Base64.DEFAULT);

                    final InputStream fileinput = mActivity.getContentResolver().openInputStream(uri);

                    copyStream(fileinput, encoder, true);

                    mStreamOut.write("');".getBytes());
                }

            } catch (final IOException e) {
                Log.w(e);
            } finally {
                // try to close stream, but ignore errors
                try {
                    mStreamOut.close();
                } catch (final IOException e1) {
                }
            }
        }
    }

    public class FileSaveRequest implements ResponseHandler, Runnable {
        private Intent mData;
        private final IITC_Mobile mIitc;
        private final String mContent;

        public FileSaveRequest(final String filename, final String type, final String content) {
            final Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                    .setType(type)
                    .addCategory(Intent.CATEGORY_OPENABLE)
                    .putExtra(Intent.EXTRA_TITLE, filename);

            mContent = content;
            mIitc = (IITC_Mobile) mActivity;
            mIitc.startActivityForResult(intent, this);
        }

        @Override
        public void onActivityResult(final int resultCode, final Intent data) {
            mIitc.deleteResponseHandler(this);

            if (resultCode != Activity.RESULT_OK || data == null) return;

            mData = data;

            new Thread(this, "FileSaveRequest").start();
        }

        @Override
        public void run() {
            if (mData == null) return;

            final Uri uri = mData.getData();
            OutputStream os = null;

            try {
                final ParcelFileDescriptor fd = mIitc.getContentResolver().openFileDescriptor(uri, "w");

                try {
                    os = new FileOutputStream(fd.getFileDescriptor());
                    os.write(mContent.getBytes());
                    os.close();
                } catch (final IOException e) {
                    Log.w("Could not save file!", e);
                }
                fd.close();
            } catch (final IOException e) {
                Log.w("Could not save file!", e);
            }
        }
    }
}
