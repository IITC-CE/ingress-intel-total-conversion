package org.exarhteam.iitc_mobile.fragments;

import android.app.ActionBar;
import android.content.DialogInterface;
import android.os.Bundle;
import android.preference.Preference;
import android.preference.PreferenceFragment;
import android.view.View;

import org.exarhteam.iitc_mobile.Log;
import org.exarhteam.iitc_mobile.R;
import org.exarhteam.iitc_mobile.prefs.PluginPreference;
import org.exarhteam.iitc_mobile.prefs.PluginPreferenceActivity;

import java.io.File;
import java.util.ArrayList;

public class PluginsFragment extends PreferenceFragment {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // just a dummy to get the preferenceScreen
        addPreferencesFromResource(R.xml.pluginspreference);

        // alphabetical order
        getPreferenceScreen().setOrderingAsAdded(false);

        Preference.OnPreferenceChangeListener myCheckboxListener = new Preference.OnPreferenceChangeListener() {

            public boolean onPreferenceChange(Preference preference, Object newValue) {


                Log.i("PREF CLICK -->" + preference.getKey() + " Status: " + Boolean.parseBoolean(newValue.toString()));
                deletplugin(Boolean.parseBoolean(newValue.toString()), preference, preference.getKey());
                return true;
            }
        };
        if (getArguments() != null) {
            // get plugins category for this fragments and plugins list
            String category = getArguments().getString("category");
            boolean userPlugin = getArguments().getBoolean("userPlugin");
            ArrayList<PluginPreference> prefs =
                    PluginPreferenceActivity.getPluginPreference(category, userPlugin);

            // add plugin checkbox preferences
            for (PluginPreference pref : prefs) {
                getPreferenceScreen().addPreference(pref);
                if (pref.getKey().contains("/IITC_Mobile/plugins/")) {
                    pref.setOnPreferenceChangeListener(myCheckboxListener);
                }
            }

            // set action bar stuff
            ActionBar bar = getActivity().getActionBar();
            bar.setTitle(getString(R.string.pref_plugins) + ": " + category);
            bar.setDisplayHomeAsUpEnabled(true);
        }


    }

    private void deletplugin(boolean status, Preference preference, String key) {
        final View content = getActivity().getLayoutInflater().inflate(R.layout.dialog_notice, null);
        if (!status) {

            android.app.AlertDialog dialog = new android.app.AlertDialog.Builder(getActivity())
                    //TODO TEXT DELETE PLUGIN
                    .setView(content)
                    .setCancelable(true)
                    .setPositiveButton(android.R.string.ok, new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(final DialogInterface dialog, final int which) {
                            File fdelete = new File(preference.getKey());
                            if (fdelete.exists()) {
                                if (fdelete.delete()) {
                                    System.out.println("file Deleted :" + preference.getKey());
                                } else {
                                    System.out.println("file not Deleted :" + preference.getKey());
                                }
                            }
                            dialog.cancel();
                        }
                    })
                    .setNegativeButton(android.R.string.cancel, new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(final DialogInterface dialog, final int which) {

                            dialog.cancel();
                        }
                    })
                    .create();
            dialog.setOnDismissListener(new DialogInterface.OnDismissListener() {
                @Override
                public void onDismiss(final DialogInterface dialog) {


                }
            });


            dialog.show();


            Log.i("Status delet Plugin");
            // Read new value from Object newValue here

        }
    }
}
