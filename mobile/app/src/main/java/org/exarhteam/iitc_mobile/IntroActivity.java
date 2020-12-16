package org.exarhteam.iitc_mobile;
import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Resources;
import android.nfc.NfcAdapter;
import android.os.Bundle;
import android.preference.PreferenceManager;

import androidx.annotation.Nullable;
import androidx.core.content.res.ResourcesCompat;
import androidx.fragment.app.Fragment;

import com.github.appintro.AppIntro;
import org.exarhteam.iitc_mobile.fragments.IntroSlide;


import com.akexorcist.localizationactivity.core.LocalizationActivityDelegate;
import com.akexorcist.localizationactivity.core.OnLocaleChangedListener;

import java.util.Locale;

public class IntroActivity extends AppIntro implements OnLocaleChangedListener {
    private LocalizationActivityDelegate localizationDelegate = new LocalizationActivityDelegate(this);

    private IITC_Localization mLocalization;
    private SharedPreferences mSharedPrefs;

    @Override
    public void onResume() {
        super.onResume();
        localizationDelegate.onResume(this);
    }

    @Override
    protected void attachBaseContext(Context newBase) {
        mLocalization = new IITC_Localization();
        super.attachBaseContext(localizationDelegate.attachBaseContext(newBase));
    }

    @Override
    public Context getApplicationContext() {
        return localizationDelegate.getApplicationContext(super.getApplicationContext());
    }

    @Override
    public Resources getResources() {
        return localizationDelegate.getResources(super.getResources());
    }

    // Just override method locale change event
    @Override
    public void onBeforeLocaleChanged() { }

    @Override
    public void onAfterLocaleChanged() { }

    public final void setLanguage(String language) {
        localizationDelegate.setLanguage(this, language);
    }

    public final void setLanguage(Locale locale) {
        localizationDelegate.setLanguage(this, locale);
    }

    public final Locale getCurrentLanguage() {
        return localizationDelegate.getLanguage(this);
    }

    public void setRecommendedLocale() { setLanguage(mLocalization.getRecommendedLocale()); }

    public void setEnglishLocale() {
        setLanguage(Locale.ENGLISH);
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        mLocalization.initResources(getResources());

        mSharedPrefs = PreferenceManager.getDefaultSharedPreferences(this);
        boolean isNeedOneTimeDefaultLanguageSelection = mSharedPrefs.getBoolean("isNeedOneTimeDefaultLanguageSelection", true);
        if (isNeedOneTimeDefaultLanguageSelection) {
            this.setRecommendedLocale();
            mSharedPrefs.edit().putBoolean("isNeedOneTimeDefaultLanguageSelection", false).apply();
        }

        localizationDelegate.addOnLocaleChangedListener(this);
        localizationDelegate.onCreate();
        super.onCreate(savedInstanceState);

        // App intro slides
        addSlide(IntroSlide.newInstance(R.layout.intro_welcome));
        addSlide(IntroSlide.newInstance(R.layout.intro_location));
        askForPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, 2);

        final NfcAdapter nfc = NfcAdapter.getDefaultAdapter(this);
        if (nfc != null) {
            addSlide(IntroSlide.newInstance(R.layout.intro_nfc));
            askForPermissions(new String[]{Manifest.permission.NFC}, 3);
        }

        addSlide(IntroSlide.newInstance(R.layout.intro_navigation));
        addSlide(IntroSlide.newInstance(R.layout.intro_layers));
        addSlide(IntroSlide.newInstance(R.layout.intro_plugins));


        setBarColor(ResourcesCompat.getColor(getResources(), R.color.iitc_blue_dark, null));
        setButtonsEnabled(true);
        setVibrate(true);
        setVibrateDuration(50);
    }

    @Override
    public void onSkipPressed(Fragment currentFragment) {
        super.onSkipPressed(currentFragment);
        this.closeIntro();
    }

    @Override
    public void onDonePressed(Fragment currentFragment) {
        super.onDonePressed(currentFragment);
        this.closeIntro();
    }

    public void closeIntro() {
        mSharedPrefs.edit().putBoolean("firstStart", false).apply();
        mSharedPrefs.edit().putString("pref_language", this.getCurrentLanguage().toString()).apply();

        // restart IITC_Mobile activity
        Intent intent = new Intent(this, IITC_Mobile.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);

        finish();
    }

    @Override
    public void onSlideChanged(@Nullable Fragment oldFragment, @Nullable Fragment newFragment) {
        super.onSlideChanged(oldFragment, newFragment);
        // Do something when the slide changes.
    }
}