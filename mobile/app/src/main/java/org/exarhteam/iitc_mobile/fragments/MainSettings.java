package org.exarhteam.iitc_mobile.fragments;

import android.app.Dialog;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.PackageManager.NameNotFoundException;
import android.os.Bundle;
import android.preference.ListPreference;
import android.preference.Preference;
import android.preference.PreferenceFragment;
import android.preference.PreferenceScreen;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.widget.FrameLayout;
import android.widget.LinearLayout;

import org.exarhteam.iitc_mobile.IntroActivity;
import org.exarhteam.iitc_mobile.Log;
import org.exarhteam.iitc_mobile.R;
import org.exarhteam.iitc_mobile.prefs.AboutDialogPreference;

public class MainSettings extends PreferenceFragment {
    @Override
    public void onCreate(final Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        addPreferencesFromResource(R.xml.preferences);

        // set versions
        final String iitcVersion = getArguments().getString("iitc_version");

        String buildVersion = "unknown";

        final PackageManager pm = getActivity().getPackageManager();
        try {
            final PackageInfo info = pm.getPackageInfo(getActivity().getPackageName(), 0);
            buildVersion = info.versionName;
        } catch (final NameNotFoundException e) {
            Log.w(e);
        }

        // Button to open the start screen
        Preference show_appintro_screen = findPreference("show_appintro_screen");
        show_appintro_screen.setOnPreferenceClickListener((preference) -> {
            final Intent i = new Intent((getActivity()), IntroActivity.class);
            startActivity(i);
            return true;
        });

        Preference pref_language = findPreference("pref_language");
        pref_language.setOnPreferenceChangeListener((preference, newValue) -> {
            (getActivity()).recreate();
            return true;
        });

        final AboutDialogPreference pref_about = (AboutDialogPreference) findPreference("pref_about");
        pref_about.setVersions(iitcVersion, buildVersion);

        final ListPreference pref_user_location_mode = (ListPreference) findPreference("pref_user_location_mode");
        pref_user_location_mode.setOnPreferenceChangeListener((preference, newValue) -> {
            final int mode = Integer.parseInt((String) newValue);
            preference.setSummary(getResources().getStringArray(R.array.pref_user_location_titles)[mode]);
            return true;
        });

        final String value = getPreferenceManager().getSharedPreferences().getString("pref_user_location_mode", "0");
        final int mode = Integer.parseInt(value);
        pref_user_location_mode.setSummary(getResources().getStringArray(R.array.pref_user_location_titles)[mode]);
    }

    // we want a home button + HomeAsUpEnabled in nested preferences
    // for some odd reasons android is not able to do this by default
    // so we need some additional hacks...
    // thx to http://stackoverflow.com/a/16800527/2638486 !!
    @Override
    public boolean onPreferenceTreeClick(final PreferenceScreen preferenceScreen, final Preference preference) {
        if (preference.getTitle().toString().equals(getString(R.string.pref_advanced_options))
                || preference.getTitle().toString().equals(getString(R.string.pref_about_title))) {
            initializeActionBar((PreferenceScreen) preference);
        }
        return super.onPreferenceTreeClick(preferenceScreen, preference);
    }

    // Apply custom home button area click listener to close the PreferenceScreen
    // because PreferenceScreens are dialogs which swallow
    // events instead of passing to the activity
    // Related Issue: https://code.google.com/p/android/issues/detail?id=4611
    public static void initializeActionBar(final PreferenceScreen preferenceScreen) {
        final Dialog dialog = preferenceScreen.getDialog();

        if (dialog != null) {
            if (dialog.getActionBar() != null) dialog.getActionBar().setDisplayHomeAsUpEnabled(true);

            final View homeBtn = dialog.findViewById(android.R.id.home);

            if (homeBtn != null) {
                final View.OnClickListener dismissDialogClickListener = new View.OnClickListener() {
                    @Override
                    public void onClick(final View v) {
                        dialog.dismiss();
                    }
                };

                final ViewParent homeBtnContainer = homeBtn.getParent();

                // The home button is an ImageView inside a FrameLayout
                if (homeBtnContainer instanceof FrameLayout) {
                    final ViewGroup containerParent = (ViewGroup) homeBtnContainer.getParent();

                    if (containerParent instanceof LinearLayout) {
                        // This view also contains the title text, set the whole view as clickable
                        ((LinearLayout) containerParent).setOnClickListener(dismissDialogClickListener);
                    } else {
                        // Just set it on the home button
                        ((FrameLayout) homeBtnContainer).setOnClickListener(dismissDialogClickListener);
                    }
                } else {
                    homeBtn.setOnClickListener(dismissDialogClickListener);
                }
            }
        }
    }
}
