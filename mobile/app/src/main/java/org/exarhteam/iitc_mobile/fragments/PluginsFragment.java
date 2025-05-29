package org.exarhteam.iitc_mobile.fragments;

import android.app.ActionBar;
import android.os.Bundle;
import android.preference.PreferenceFragment;
import android.preference.PreferenceScreen;
import android.widget.Toast;

import org.exarhteam.iitc_mobile.IITC_FileManager;
import org.exarhteam.iitc_mobile.IITC_StorageManager;
import org.exarhteam.iitc_mobile.R;
import org.exarhteam.iitc_mobile.prefs.PluginInfo;
import org.exarhteam.iitc_mobile.prefs.PluginPreference;
import org.exarhteam.iitc_mobile.prefs.PluginPreferenceActivity;

import java.io.File;
import java.util.ArrayList;

public class PluginsFragment extends PreferenceFragment {

    private IITC_StorageManager mStorageManager;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // just a dummy to get the preferenceScreen
        addPreferencesFromResource(R.xml.pluginspreference);

        // alphabetical order
        getPreferenceScreen().setOrderingAsAdded(false);

        // Initialize storage manager
        mStorageManager = new IITC_FileManager(getActivity()).getStorageManager();

        if (getArguments() != null) {
            // get plugins category for this fragments and plugins list
            String category = getArguments().getString("category");
            boolean userPlugin = getArguments().getBoolean("userPlugin");
            ArrayList<PluginInfo> prefs =
                    PluginPreferenceActivity.getPluginInfo(category, userPlugin);

            // add plugin checkbox preferences
            PreferenceScreen preferenceScreen = getPreferenceScreen();
            for (PluginInfo pluginInfo : prefs) {
                preferenceScreen.addPreference(createPluginPreference(prefs, preferenceScreen, pluginInfo));
            }

            // set action bar stuff
            ActionBar bar = getActivity().getActionBar();
            bar.setTitle(getString(R.string.pref_plugins)+": " + category);
            bar.setDisplayHomeAsUpEnabled(true);
        }
    }

    private PluginPreference createPluginPreference(ArrayList<PluginInfo> prefs, PreferenceScreen preferenceScreen, PluginInfo pluginInfo) {
        final PluginPreference preference = new PluginPreference(getActivity());
        preference.setDefaultValue(false);
        preference.setPersistent(true);
        preference.setPluginInfo(pluginInfo);

        if (pluginInfo.isUserPlugin()) {
            preference.setOnConfirmDelete(() -> {
                if (deletePlugin(pluginInfo)) {
                    Toast.makeText(getActivity(), getString(R.string.plugin_deleted, pluginInfo.getName()), Toast.LENGTH_SHORT).show();
                    prefs.remove(pluginInfo);
                    preferenceScreen.removePreference(preference);
                } else {
                    Toast.makeText(getActivity(), getString(R.string.plugin_delete_failed), Toast.LENGTH_SHORT).show();
                }
            });
        }
        return preference;
    }

    private boolean deletePlugin(PluginInfo pluginInfo) {
        String key = pluginInfo.getKey();

        if (IITC_StorageManager.isLegacyStorageMode()) {
            // Legacy storage - delete file directly
            File file = new File(key);
            return file.delete();
        } else {
            // SAF storage - use storage manager
            return mStorageManager.deletePlugin(key);
        }
    }
}
