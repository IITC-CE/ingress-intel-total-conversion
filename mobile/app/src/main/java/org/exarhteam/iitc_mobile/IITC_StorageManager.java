package org.exarhteam.iitc_mobile;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.UriPermission;
import android.net.Uri;
import android.os.Build;
import android.preference.PreferenceManager;

import androidx.documentfile.provider.DocumentFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

public class IITC_StorageManager {
    private static final String PREF_PLUGINS_FOLDER_URI = "plugins_folder_uri";
    private static final String PREF_IITC_FOLDER_URI = "iitc_folder_uri";
    public static final int REQUEST_FOLDER_ACCESS = 4001;

    private final Context context;
    private final SharedPreferences prefs;
    private DocumentFile pluginsFolder;
    private DocumentFile iitcFolder;

    public IITC_StorageManager(Context context) {
        this.context = context;
        this.prefs = PreferenceManager.getDefaultSharedPreferences(context);
        loadSavedFolders();
    }

    private void loadSavedFolders() {
        String pluginsUri = prefs.getString(PREF_PLUGINS_FOLDER_URI, null);
        String iitcUri = prefs.getString(PREF_IITC_FOLDER_URI, null);

        if (pluginsUri != null) {
            try {
                Uri uri = Uri.parse(pluginsUri);
                if (uri.getPath() != null && uri.getPath().contains("/document/")) {
                    String docId = uri.getLastPathSegment();
                    if (docId != null && docId.contains(":")) {
                        if (iitcUri != null && hasUriPermission(Uri.parse(iitcUri))) {
                            iitcFolder = DocumentFile.fromTreeUri(context, Uri.parse(iitcUri));
                            if (iitcFolder != null) {
                                pluginsFolder = iitcFolder.findFile("plugins");
                            }
                        }
                    }
                } else if (hasUriPermission(uri)) {
                    pluginsFolder = DocumentFile.fromTreeUri(context, uri);
                }
            } catch (Exception e) {
                Log.e("Failed to load plugins folder", e);
            }
        }

        if (iitcUri != null) {
            try {
                Uri uri = Uri.parse(iitcUri);
                if (hasUriPermission(uri)) {
                    iitcFolder = DocumentFile.fromTreeUri(context, uri);
                }
            } catch (Exception e) {
                Log.e("Failed to load IITC folder", e);
            }
        }
    }

    private boolean hasUriPermission(Uri uri) {
        List<UriPermission> persistedUris = context.getContentResolver().getPersistedUriPermissions();
        for (UriPermission permission : persistedUris) {
            if (permission.getUri().equals(uri) && permission.isReadPermission() && permission.isWritePermission()) {
                return true;
            }
        }
        return false;
    }

    public boolean hasPluginsFolderAccess() {
        return pluginsFolder != null && pluginsFolder.exists() && pluginsFolder.canWrite();
    }

    public void requestFolderAccess(Activity activity) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION |
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        activity.startActivityForResult(intent, REQUEST_FOLDER_ACCESS);
    }

    public void handleFolderSelection(Uri treeUri) {
        if (treeUri == null) return;

        // Take persistable permissions
        try {
            context.getContentResolver().takePersistableUriPermission(treeUri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        } catch (Exception e) {
            Log.e("Failed to take persistable permission", e);
            return;
        }

        DocumentFile folder = DocumentFile.fromTreeUri(context, treeUri);
        if (folder == null) return;

        iitcFolder = folder;
        prefs.edit().putString(PREF_IITC_FOLDER_URI, treeUri.toString()).apply();

        // Find or create plugins subfolder
        DocumentFile plugins = folder.findFile("plugins");
        if (plugins == null) {
            plugins = folder.createDirectory("plugins");
        }
        if (plugins != null) {
            pluginsFolder = plugins;
            prefs.edit().putString(PREF_PLUGINS_FOLDER_URI, plugins.getUri().toString()).apply();
        }
    }

    public DocumentFile getDevFolder() {
        if (iitcFolder == null) return null;

        DocumentFile devFolder = iitcFolder.findFile("dev");
        if (devFolder == null) {
            devFolder = iitcFolder.createDirectory("dev");
        }
        return devFolder;
    }

    public DocumentFile[] getUserPlugins() {
        if (!hasPluginsFolderAccess()) {
            return new DocumentFile[0];
        }

        List<DocumentFile> plugins = new ArrayList<>();
        DocumentFile[] allFiles = pluginsFolder.listFiles();

        for (DocumentFile file : allFiles) {
            // Only add actual files with .user.js extension
            if (file.isFile() && file.getName() != null && file.getName().endsWith(".user.js")) {
                plugins.add(file);
            }
        }
        return plugins.toArray(new DocumentFile[0]);
    }

    public DocumentFile createPluginFile(String fileName) {
        if (!hasPluginsFolderAccess()) return null;

        // Ensure .user.js extension
        if (!fileName.endsWith(".user.js")) {
            fileName += ".user.js";
        }

        return pluginsFolder.createFile("application/javascript", fileName);
    }

    public boolean deletePlugin(String uriString) {
        try {
            DocumentFile file = DocumentFile.fromSingleUri(context, Uri.parse(uriString));
            return file != null && file.delete();
        } catch (Exception e) {
            Log.w("Failed to delete plugin", e);
            return false;
        }
    }

    public InputStream openPluginInputStream(DocumentFile plugin) throws IOException {
        return context.getContentResolver().openInputStream(plugin.getUri());
    }

    public OutputStream openPluginOutputStream(DocumentFile plugin) throws IOException {
        return context.getContentResolver().openOutputStream(plugin.getUri());
    }

    public static boolean isLegacyStorageMode() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP;
    }
}