package org.exarhteam.iitc_mobile.fragments;

import android.app.Dialog;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.PackageManager.NameNotFoundException;
import android.os.Bundle;
import android.preference.*;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.widget.FrameLayout;
import android.widget.LinearLayout;

import org.exarhteam.iitc_mobile.BuildConfig;
import org.exarhteam.iitc_mobile.IntroActivity;
import org.exarhteam.iitc_mobile.Log;
import org.exarhteam.iitc_mobile.R;
import org.exarhteam.iitc_mobile.WindowInsetsHelper;
import org.exarhteam.iitc_mobile.prefs.AboutDialogPreference;
import org.exarhteam.iitc_mobile.prefs.DeepLinkPermissionPreference;
import org.exarhteam.iitc_mobile.prefs.ShareDebugInfoPreference;

public class MainSettings extends PreferenceFragment {
    @Override
    public void onCreate(final Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        addPreferencesFromResource(R.xml.preferences);

        // set versions
        final String iitcVersion = getArguments().getString("iitc_version");
        final String originalUserAgent = getArguments().getString("iitc_originalUserAgent");
        final String userAgent = getArguments().getString("iitc_userAgent");

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

        final ShareDebugInfoPreference prefShareDebug = (ShareDebugInfoPreference) findPreference("pref_debug_info");
        prefShareDebug.setVersions(iitcVersion, buildVersion);
        prefShareDebug.setUserAgents(originalUserAgent, userAgent);

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

        if (!BuildConfig.ENABLE_CHECK_APP_UPDATES) {
            Preference updateCheckPref = findPreference("pref_check_for_updates");
            PreferenceCategory mCategory = (PreferenceCategory) findPreference("pref_mics");
            mCategory.removePreference(updateCheckPref);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        
        // Notify deep link preference about activity resume
        DeepLinkPermissionPreference deepLinkPref =
            (DeepLinkPermissionPreference) findPreference("pref_deep_link_permission");
        if (deepLinkPref != null) {
            deepLinkPref.onActivityResumed();
        }
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

            // Setup window insets for the dialog
            WindowInsetsHelper.setupDialogInsets(dialog);

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
