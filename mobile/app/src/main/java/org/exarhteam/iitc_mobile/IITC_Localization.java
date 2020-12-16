package org.exarhteam.iitc_mobile;

import android.content.res.Resources;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

// How to use:
//
// 1. Create an instance of IITC_Localization() in attachBaseContext()
//    to get the device language before Android-Localization library initialization.
//
// 2. Call initResources(getResources()) method in onCreate()
//    to get a list of available languages from resources (pref_languages_values).

class IITC_Localization {
    private String systemLocale;
    private String systemLocaleLong;
    private List<String> appLanguages;

    IITC_Localization() {
        this.getSystemLocale();
    }

    void initResources(Resources res) {
        appLanguages = Arrays.asList(res.getStringArray(R.array.pref_languages_values));
    }

    private void getSystemLocale() {
        systemLocale = Locale.getDefault().getLanguage();
        systemLocaleLong = Locale.getDefault().toString();
    }

    String getRecommendedLocale() {
        if (appLanguages.contains(systemLocaleLong)) { return systemLocaleLong; }
        if (appLanguages.contains(systemLocale)) { return systemLocale; }
        return Locale.ENGLISH.toString();
    }
}
