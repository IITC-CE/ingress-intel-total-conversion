package org.exarhteam.iitc_mobile;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.UriPermission;
import android.net.Uri;
import android.os.Build;
import android.os.storage.StorageManager;
import android.os.storage.StorageVolume;
import android.preference.PreferenceManager;

import androidx.documentfile.provider.DocumentFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Manages storage access for IITC Mobile using Storage Access Framework (SAF).
 */
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

    /**
     * Load previously saved folder references from preferences
     */
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

    /**
     * Check if we have persistent permission for the given URI
     */
    private boolean hasUriPermission(Uri uri) {
        List<UriPermission> persistedUris = context.getContentResolver().getPersistedUriPermissions();
        for (UriPermission permission : persistedUris) {
            if (permission.getUri().equals(uri) && permission.isReadPermission() && permission.isWritePermission()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if we have access to plugins folder
     */
    public boolean hasPluginsFolderAccess() {
        return pluginsFolder != null && pluginsFolder.exists() && pluginsFolder.canWrite();
    }

    /**
     * Request folder access from user via SAF dialog
     * Attempts to open dialog at IITC_Mobile folder if it exists
     */
    public void requestFolderAccess(Activity activity) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION |
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);

        // Try to set initial URI to IITC_Mobile folder for Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Uri initialUri = getInitialFolderUri();
            if (initialUri != null) {
                intent.putExtra("android.provider.extra.INITIAL_URI", initialUri);
            }
        }

        activity.startActivityForResult(intent, REQUEST_FOLDER_ACCESS);
    }

    /**
     * Get initial URI for folder picker dialog
     * Attempts to find IITC_Mobile folder in primary storage
     * @return URI pointing to IITC_Mobile folder if possible, null otherwise
     */
    private Uri getInitialFolderUri() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // For Android 10+, use StorageManager to get primary storage volume
            try {
                StorageManager storageManager = (StorageManager) context.getSystemService(Context.STORAGE_SERVICE);
                StorageVolume primaryVolume = storageManager.getPrimaryStorageVolume();
                Intent volumeIntent = primaryVolume.createOpenDocumentTreeIntent();
                Uri rootUri = volumeIntent.getParcelableExtra("android.provider.extra.INITIAL_URI");

                if (rootUri != null) {
                    // Convert root URI to point to IITC_Mobile folder
                    String scheme = rootUri.toString();

                    // Replace /root/ with /document/ and append IITC_Mobile
                    scheme = scheme.replace("/root/", "/document/");
                    scheme += ":IITC_Mobile";

                    return Uri.parse(scheme);
                }
            } catch (Exception e) {
                Log.w("Failed to create initial URI for IITC_Mobile folder", e);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // For Android 8.0-9.0, try to construct URI manually
            try {
                String scheme = "content://com.android.externalstorage.documents/document/primary:IITC_Mobile";
                Uri iitcUri = Uri.parse(scheme);
                return iitcUri;
            } catch (Exception e) {
                Log.w("Failed to create initial URI for older Android version", e);
            }
        }

        return null;
    }

    /**
     * Handle folder selection result from SAF dialog
     */
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

    /**
     * Get or create dev folder for development override plugins
     */
    public DocumentFile getDevFolder() {
        if (iitcFolder == null) return null;

        DocumentFile devFolder = iitcFolder.findFile("dev");
        if (devFolder == null) {
            devFolder = iitcFolder.createDirectory("dev");
        }
        return devFolder;
    }

    /**
     * Get all user plugin files from plugins directory
     */
    public DocumentFile[] getUserPlugins() {
        if (!hasPluginsFolderAccess()) {
            return new DocumentFile[0];
        }

        List<DocumentFile> plugins = new ArrayList<>();
        DocumentFile[] allFiles = pluginsFolder.listFiles();

        for (DocumentFile file : allFiles) {
            if (file == null) continue;
            
            try {
                String fileName = file.getName();
                boolean isFile = file.isFile();
                
                if (isFile && fileName != null && fileName.endsWith(".user.js")) {
                    plugins.add(file);
                }
            } catch (SecurityException | IllegalArgumentException e) {
                // Handle cases where file access is denied or file no longer exists
                Log.w("Skipping inaccessible file during plugin scan: " + e.getMessage());
            }
        }
        return plugins.toArray(new DocumentFile[0]);
    }

    /**
     * Create new plugin file in plugins directory
     */
    public DocumentFile createPluginFile(String fileName) {
        if (!hasPluginsFolderAccess()) return null;

        // Ensure .user.js extension
        if (!fileName.endsWith(".user.js")) {
            fileName += ".user.js";
        }

        return pluginsFolder.createFile("application/javascript", fileName);
    }

    /**
     * Delete plugin file by URI string
     */
    public boolean deletePlugin(String uriString) {
        try {
            DocumentFile file = DocumentFile.fromSingleUri(context, Uri.parse(uriString));
            return file != null && file.delete();
        } catch (Exception e) {
            Log.w("Failed to delete plugin", e);
            return false;
        }
    }

    /**
     * Open input stream for reading plugin content
     */
    public InputStream openPluginInputStream(DocumentFile plugin) throws IOException {
        return context.getContentResolver().openInputStream(plugin.getUri());
    }

    /**
     * Open output stream for writing plugin content
     */
    public OutputStream openPluginOutputStream(DocumentFile plugin) throws IOException {
        return context.getContentResolver().openOutputStream(plugin.getUri());
    }
}