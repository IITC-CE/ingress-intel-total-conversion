package org.exarhteam.iitc_mobile;

import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.preference.PreferenceManager;

import java.util.HashMap;
import java.util.Map;

/**
 * Handles data migrations between app versions
 */
public class IITC_MigrationHelper {
    private final Context context;
    private final SharedPreferences prefs;

    public IITC_MigrationHelper(Context context) {
        this.context = context;
        this.prefs = PreferenceManager.getDefaultSharedPreferences(context);
    }

    /**
     * Performs all necessary migrations
     */
    public void performMigrations() {
        migrateToSafPlugins();
    }

    /**
     * Migrates plugin preferences from full file paths to filenames only
     * for Storage Access Framework compatibility
     */
    private void migrateToSafPlugins() {
        if (prefs.getBoolean("saf_plugins_migrated", false)) {
            return;
        }

        boolean hasUserPlugins = false;
        SharedPreferences.Editor editor = prefs.edit();
        Map<String, ?> allPrefs = new HashMap<>(prefs.getAll());

        for (Map.Entry<String, ?> entry : allPrefs.entrySet()) {
            String key = entry.getKey();

            // Check if this is a plugin path
            if (key.startsWith("/") && key.endsWith(".user.js")) {
                if (entry.getValue() instanceof Boolean) {
                    Log.d("Migration", "plugin " + key + " value " + entry.getValue());
                    String filename = key.substring(key.lastIndexOf('/') + 1);
                    editor.putBoolean(filename, (Boolean) entry.getValue());
                    editor.remove(key);

                    // Track if any user plugins were enabled
                    if ((Boolean) entry.getValue()) {
                        Log.d("Migration", "plugin " + key + " - ENABLED");
                        hasUserPlugins = true;
                    }
                }
            }
        }

        editor.putBoolean("saf_plugins_migrated", true);
        editor.apply();

        // Show dialog if user had enabled plugins and folder access not granted yet
        if (hasUserPlugins && context instanceof IITC_Mobile) {
            IITC_Mobile activity = (IITC_Mobile) context;
            if (!activity.getFileManager().getStorageManager().hasPluginsFolderAccess()) {
                showMigrationDialog(activity);
            }
        }
    }

    /**
     * Shows dialog explaining the need for folder access after migration
     */
    private void showMigrationDialog(IITC_Mobile activity) {
        new AlertDialog.Builder(activity)
                .setTitle(R.string.migration_saf_title)
                .setMessage(R.string.migration_saf_message)
                .setPositiveButton(R.string.migration_saf_button_grant, (dialog, which) -> {
                    activity.getFileManager().getStorageManager().requestFolderAccess(activity);
                })
                .setNegativeButton(R.string.migration_saf_button_later, null)
                .show();
    }
}