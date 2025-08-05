package org.exarhteam.iitc_mobile;

import android.app.ActionBar;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.app.SearchManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.SharedPreferences.OnSharedPreferenceChangeListener;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.Bitmap.CompressFormat;
import android.graphics.Canvas;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.preference.PreferenceManager;
import android.view.KeyEvent;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.SearchView;
import androidx.appcompat.widget.Toolbar;

import com.akexorcist.localizationactivity.core.LocalizationActivityDelegate;
import com.akexorcist.localizationactivity.core.OnLocaleChangedListener;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.melnykov.fab.FloatingActionButton;

import org.exarhteam.iitc_mobile.IITC_NavigationHelper.Pane;
import org.exarhteam.iitc_mobile.prefs.PluginPreferenceActivity;
import org.exarhteam.iitc_mobile.prefs.PreferenceActivity;
import org.exarhteam.iitc_mobile.share.ShareActivity;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.URISyntaxException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.Stack;
import java.util.Vector;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class IITC_Mobile extends AppCompatActivity
        implements OnSharedPreferenceChangeListener, OnLocaleChangedListener {
    private static final String mIntelUrl = "https://intel.ingress.com/";

    private LocalizationActivityDelegate localizationDelegate = new LocalizationActivityDelegate(this);
    private SharedPreferences mSharedPrefs;
    private IITC_FileManager mFileManager;
    private IITC_WebView mIitcWebView;
    private IITC_UserLocation mUserLocation;
    private IITC_NavigationHelper mNavigationHelper;
    private IITC_MapSettings mMapSettings;
    private final Vector<ResponseHandler> mResponseHandlers = new Vector<ResponseHandler>();
    private boolean mDexRunning = false;
    private boolean mDexDesktopMode = true;
    private boolean mDesktopMode = false;
    private Set<String> mAdvancedMenu;
    private MenuItem mSearchMenuItem;
    private View mImageLoading;
    public RecyclerView mLvDebug;
    private View mLayoutDebug;
    private View mViewDebug;
    private LinearLayoutManager llm;
    public FloatingActionButton debugScrollButton;
    private ImageButton mBtnToggleMap;
    private EditText mEditCommand;
    private boolean mDebugging = false;
    private boolean mReloadNeeded = false;
    private boolean mIsLoading = false;
    private boolean mShowMapInDebug = false;
    private boolean mPersistentZoom = false;
    private final Stack<String> mDialogStack = new Stack<String>();
    private String mPermalink = null;
    private String mSearchTerm = "";
    private IntentFilter mDesktopFilter;
    private IITC_DebugHistory debugHistory;
    private int debugHistoryPosition = -1;
    private String debugInputStore = "";
    private Map<String, String> mAllowedHostnames = new HashMap<>();
    private Set<String> mInternalHostnames = new HashSet<>();
    private final Pattern mGoogleHostnamePattern = Pattern.compile("(^|\\.)google(\\.com|\\.co)?\\.\\w+$");

    private String mIITCDefaultUA;
    private String mIITCOriginalUA;
    private final String mDesktopUA = "Mozilla/5.0 (X11; Linux x86_64; rv:17.0) Gecko/20130810 Firefox/17.0 Iceweasel/17.0.8";

    // Used for custom back stack handling
    private final Stack<Pane> mBackStack = new Stack<IITC_NavigationHelper.Pane>();
    private Pane mCurrentPane = Pane.MAP;
    private boolean mBackButtonPressed = false;

    private final BroadcastReceiver mBroadcastReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(final Context context, final Intent intent) {
            ((IITC_Mobile) context).installIitcUpdate();
        }
    };

    // Setup receiver to detect if Samsung DeX mode has been changed
	private final BroadcastReceiver mDesktopModeReceiver = new BroadcastReceiver() {
		@Override
    	public void onReceive(Context context, Intent intent) {
        	String action = intent.getAction();

        	if ("android.app.action.ENTER_KNOX_DESKTOP_MODE".equals(action)) {
            	// Samsung DeX Mode has been entered
            	mDexRunning = true;
            	mNavigationHelper.onDexModeChanged(true);
        	} else if ("android.app.action.EXIT_KNOX_DESKTOP_MODE".equals(action)) {
            	// Samsung DeX mode has been exited
            	mDexRunning = false;
            	mNavigationHelper.onDexModeChanged(false);
        	}
    	}
	};

    @Override
    protected void onCreate(final Bundle savedInstanceState) {
        // enable webview debug for debug builds
        if (0 != (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE)) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // get status of Samsung DeX Mode at creation
        Configuration config = getResources().getConfiguration();
        try {
            Class configClass = config.getClass();
            if(configClass.getField("SEM_DESKTOP_MODE_ENABLED").getInt(configClass)
                    == configClass.getField("semDesktopModeEnabled").getInt(config)) {
                mDexRunning = true; // Samsung DeX mode enabled
            }
        } catch(NoSuchFieldException e) {
            //Handle the NoSuchFieldException
        } catch(IllegalAccessException e) {
            //Handle the IllegalAccessException
        } catch(IllegalArgumentException e) {
            //Handle the IllegalArgumentException
        }

        // Define webview user agent for known external hosts
        mIITCOriginalUA = WebSettings.getDefaultUserAgent(this);
        mIITCDefaultUA = sanitizeUserAgent(mIITCOriginalUA);
        final String googleUA = mIITCDefaultUA;

        // IITC-Mobile User-Agent for tile servers with strip build details after first dash
        String version = BuildConfig.VERSION_NAME;
        int dashIndex = version.indexOf('-');
        if (dashIndex != -1) {
            version = version.substring(0, dashIndex);
        }
        final String iitcMobileUA = "IITC-Mobile/" + version + " (https://github.com/IITC-CE/ingress-intel-total-conversion)";
        
        mAllowedHostnames.put("intel.ingress.com", mIITCDefaultUA);
        mAllowedHostnames.put("google.com", googleUA);
        mAllowedHostnames.put("youtube.com", googleUA);
        mAllowedHostnames.put("facebook.com", mDesktopUA);
        mAllowedHostnames.put("appleid.apple.com", mIITCDefaultUA);
        mAllowedHostnames.put("signin.nianticlabs.com", mIITCDefaultUA);
        mAllowedHostnames.put("signin.nianticspatial.com", mIITCDefaultUA);
        mAllowedHostnames.put("openstreetmap.org", iitcMobileUA);
        mAllowedHostnames.put("openstreetmap.fr", iitcMobileUA);

        // enable progress bar above action bar
        // must be called BEFORE calling parent method
        requestWindowFeature(Window.FEATURE_PROGRESS);

        super.onCreate(savedInstanceState);

        debugHistory = new IITC_DebugHistory(50);

        setContentView(R.layout.activity_main);
        debugScrollButton = findViewById(R.id.debugScrollButton);

        mImageLoading = findViewById(R.id.imageLoading);
        mIitcWebView = (IITC_WebView) findViewById(R.id.iitc_webview);
        mLayoutDebug = findViewById(R.id.layoutDebug);
        mLvDebug = (RecyclerView) findViewById(R.id.lvDebug);
        mViewDebug = findViewById(R.id.viewDebug);
        mBtnToggleMap = (ImageButton) findViewById(R.id.btnToggleMapVisibility);
        mEditCommand = (EditText) findViewById(R.id.editCommand);
        mEditCommand.setOnKeyListener(new View.OnKeyListener() {
            @Override
            public boolean onKey(final View v, final int keyCode, final KeyEvent event) {
                if (keyCode == KeyEvent.KEYCODE_ENTER && event.isCtrlPressed()) {
                    onBtnRunCodeClick(v);
                    return true;
                }
                return false;
            }
        });
        mEditCommand.setOnEditorActionListener(new TextView.OnEditorActionListener() {
            @Override
            public boolean onEditorAction(final TextView v, final int actionId, final KeyEvent event) {
                if (EditorInfo.IME_ACTION_GO == actionId ||
                        EditorInfo.IME_ACTION_SEND == actionId ||
                        EditorInfo.IME_ACTION_DONE == actionId) {
                    onBtnRunCodeClick(v);

                    final InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                    imm.hideSoftInputFromWindow(v.getWindowToken(), 0);

                    return true;
                }
                return false;
            }
        });

        mLvDebug.setAdapter(new IITC_LogAdapter(this));

        llm = new LinearLayoutManager(this);
        llm.setStackFromEnd(true);
        mLvDebug.setLayoutManager(llm);

        // do something if user changed something in the settings
        mSharedPrefs = PreferenceManager.getDefaultSharedPreferences(this);
        mSharedPrefs.registerOnSharedPreferenceChangeListener(this);

        // enable/disable mDexDesktopMode mode on menu create and url load
        mDexDesktopMode = mSharedPrefs.getBoolean("pref_dex_desktop", true);

        // enable/disable mDesktopMode mode on menu create and url load
        mDesktopMode = mSharedPrefs.getBoolean("pref_force_desktop", false);

        // enable/disable advance menu
        final String[] menuDefaults = getResources().getStringArray(R.array.pref_android_menu_default);
        mAdvancedMenu = mSharedPrefs
                .getStringSet("pref_android_menu_options", new HashSet<String>(Arrays.asList(menuDefaults)));

        mPersistentZoom = mSharedPrefs.getBoolean("pref_persistent_zoom", false);

        Set<String> restoreDebugHstory = mSharedPrefs.getStringSet("debug_history", new HashSet<>());

        if (restoreDebugHstory != null) {
            for (String item : restoreDebugHstory) {
                debugHistory.push(item);
            }
        }

        // get fullscreen status from settings
        mIitcWebView.updateFullscreenStatus();

        mFileManager = new IITC_FileManager(this);
        mFileManager.setUpdateInterval(Integer.parseInt(mSharedPrefs.getString("pref_update_plugins_interval", "7")));

        // Perform data migrations
        IITC_MigrationHelper migrationHelper = new IITC_MigrationHelper(this);
        migrationHelper.performMigrations();

        // Initialize PluginManager
        boolean devMode = mSharedPrefs.getBoolean("pref_dev_checkbox", false);
        IITC_PluginManager.getInstance().loadAllPlugins(
                mFileManager.getStorageManager(),
                getAssets(),
                devMode
        );

        mUserLocation = new IITC_UserLocation(this);
        mUserLocation.setLocationMode(Integer.parseInt(mSharedPrefs.getString("pref_user_location_mode", "0")));

        // compat actionbar
        Toolbar toolbar = (Toolbar) findViewById(R.id.iitc_toolbar);
        setSupportActionBar(toolbar);

        // pass ActionBar to helper because we deprecated getActionBar
        mNavigationHelper = new IITC_NavigationHelper(this, super.getSupportActionBar(), toolbar);

        mMapSettings = new IITC_MapSettings(this);

        // Clear the back stack
        mBackStack.clear();

        // Setup Samsung DeX Desktop detection
        mDesktopFilter = new IntentFilter();
        mDesktopFilter.addAction("UiModeManager.SEM_ACTION_ENTER_KNOX_DESKTOP_MODE");
        mDesktopFilter.addAction("UiModeManager.SEM_ACTION_EXIT_KNOX_DESKTOP_MODE");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) { // API 33+
            registerReceiver(mDesktopModeReceiver, mDesktopFilter, Context.RECEIVER_NOT_EXPORTED);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) { // API 31-32
            registerReceiver(mDesktopModeReceiver, mDesktopFilter, 0x00000001); // RECEIVER_NOT_EXPORTED
        } else {
            registerReceiver(mDesktopModeReceiver, mDesktopFilter);
        }

        // Check for app updates
        if (BuildConfig.ENABLE_CHECK_APP_UPDATES) {
            String buildType = BuildConfig.BUILD_TYPE;
            int currentVersionCode = BuildConfig.VERSION_CODE;
            UpdateChecker updateChecker = new UpdateChecker(this, buildType, currentVersionCode);
            updateChecker.checkForUpdates();
        }

        // receive downloadManagers downloadComplete intent
        // afterwards install iitc update
        IntentFilter downloadFilter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) { // API 33+
            registerReceiver(mBroadcastReceiver, downloadFilter, Context.RECEIVER_NOT_EXPORTED);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) { // API 31-32
            registerReceiver(mBroadcastReceiver, downloadFilter, 0x00000001); // RECEIVER_NOT_EXPORTED
        } else {
            registerReceiver(mBroadcastReceiver, downloadFilter);
        }

        this.firstTimeIntro();

        handleIntent(getIntent(), true);
    }

    @Override
    public void onSharedPreferenceChanged(final SharedPreferences sharedPreferences, final String key) {
        if (key.equals("pref_force_desktop")) {
            mDesktopMode = sharedPreferences.getBoolean("pref_force_desktop", false);
            mNavigationHelper.onPrefChanged();
        } else if (key.equals("pref_dex_desktop")) {
            mDexDesktopMode = sharedPreferences.getBoolean( "pref_dex_desktop", true);
            mNavigationHelper.onPrefChanged();
        } else if (key.equals("pref_user_location_mode")) {
            final int mode = Integer.parseInt(mSharedPrefs.getString("pref_user_location_mode", "0"));
            if (mUserLocation.setLocationMode(mode))
                mReloadNeeded = true;
            
            // Sync plugin checkbox state with location mode preference
            boolean shouldBeEnabled = mode != 0;
            boolean isCurrentlyEnabled = mSharedPrefs.getBoolean("user-location.user.js", false);
            
            if (shouldBeEnabled != isCurrentlyEnabled) {
                SharedPreferences.Editor editor = mSharedPrefs.edit();
                editor.putBoolean("user-location.user.js", shouldBeEnabled);
                editor.apply();
            }
            return;
        } else if (key.equals("user-location.user.js")) {
            // Sync location mode preference when user-location plugin checkbox changes
            boolean pluginEnabled = sharedPreferences.getBoolean(key, false);
            String currentMode = mSharedPrefs.getString("pref_user_location_mode", "0");
            
            if (pluginEnabled && "0".equals(currentMode)) {
                // Enable location mode when plugin is enabled (default to show position)
                SharedPreferences.Editor editor = mSharedPrefs.edit();
                editor.putString("pref_user_location_mode", "1");
                editor.apply();
            } else if (!pluginEnabled && !"0".equals(currentMode)) {
                // Disable location mode when plugin is disabled
                SharedPreferences.Editor editor = mSharedPrefs.edit();
                editor.putString("pref_user_location_mode", "0");
                editor.apply();
            }
            return;
        } else if (key.equals("pref_language")) {
            final String lang = mSharedPrefs.getString("pref_language", this.getCurrentLanguage().toString());
            this.setLanguage(lang);
            return;
        } else if (key.equals("pref_persistent_zoom")) {
            mPersistentZoom = mSharedPrefs.getBoolean("pref_persistent_zoom", false);
            return;
        } else if (key.equals("pref_fullscreen")) {
            mIitcWebView.updateFullscreenStatus();
            mNavigationHelper.onPrefChanged();
            return;
        } else if (key.equals("pref_android_menu_options")) {
            final String[] menuDefaults = getResources().getStringArray(R.array.pref_android_menu_default);
            mAdvancedMenu = mSharedPrefs.getStringSet("pref_android_menu_options",
                    new HashSet<String>(Arrays.asList(menuDefaults)));
            mNavigationHelper.setDebugMode(mAdvancedMenu.contains("menu_debug"));
            invalidateOptionsMenu();
            // no reload needed
            return;
        } else if (key.equals("pref_last_plugin_update")) {
            final Long forceUpdate = sharedPreferences.getLong("pref_last_plugin_update", 0);
            if (forceUpdate == 0) mFileManager.updatePlugins(true);
            return;
        } else if (key.equals("pref_update_plugins_interval")) {
            final int interval = Integer.parseInt(mSharedPrefs.getString("pref_update_plugins_interval", "7"));
            mFileManager.setUpdateInterval(interval);
            return;
        } else if (key.equals("pref_dev_checkbox")) {
            // Reload PluginManager when dev mode changes
            boolean devMode = sharedPreferences.getBoolean("pref_dev_checkbox", false);
            IITC_PluginManager.getInstance().loadAllPlugins(
                    mFileManager.getStorageManager(),
                    getAssets(),
                    devMode
            );
            mReloadNeeded = true;
            return;
        } else if (key.equals("pref_press_twice_to_exit")
                || key.equals("pref_share_selected_tab")
                || key.equals("pref_messages")
                || key.equals("pref_secure_updates")
                || key.equals("pref_external_storage")) {
            // no reload needed
            return;
        } else if (key.equals("pref_webview_zoom")) {
            mIitcWebView.setWebViewZoom(Integer.parseInt(mSharedPrefs.getString("pref_webview_zoom", "-1")));
        }

        mReloadNeeded = true;
    }

    @Override
    protected void onNewIntent(final Intent intent) {
        setIntent(intent);
        handleIntent(intent, false);
    }

    // handles ingress intel url intents, search intents, geo intents and javascript file intents
    private void handleIntent(final Intent intent, final boolean onCreate) {
        final String action = intent.getAction();
        if (Intent.ACTION_VIEW.equals(action)) {
            final Uri uri = intent.getData();
            Log.d("intent received url: " + uri.toString());

            if (uri.getScheme().equals("http") || uri.getScheme().equals("https")) {
                if (uri.getHost() != null
                        && (uri.getHost().equals("ingress.com") || uri.getHost().endsWith(".ingress.com"))) {
                    Log.d("loading url...");
                    loadUrl(uri.toString());
                    return;
                }
            }
            
            if (uri.getScheme().equals("iitc")) {
                // Convert iitc:// scheme to https://intel.ingress.com/ URL
                String convertedUrl = mIntelUrl + uri.getSchemeSpecificPart();
                Log.d("loading iitc deep link: " + uri.toString() + " -> " + convertedUrl);
                loadUrl(convertedUrl);
                return;
            }

            if (uri.getScheme().equals("geo")) {
                try {
                    handleGeoUri(uri);
                    return;
                } catch (final URISyntaxException e) {
                    Log.w(e);
                    new AlertDialog.Builder(this)
                            .setTitle(R.string.intent_error)
                            .setMessage(e.getReason())
                            .setNeutralButton(android.R.string.ok, new DialogInterface.OnClickListener() {
                                @Override
                                public void onClick(final DialogInterface dialog, final int which) {
                                    dialog.dismiss();
                                }
                            })
                            .create()
                            .show();
                }
            }
        }

        if (Intent.ACTION_SEARCH.equals(action)) {
            final String query = intent.getStringExtra(SearchManager.QUERY);
            final SearchView searchView = (SearchView) mSearchMenuItem.getActionView();
            searchView.setQuery(query, false);
            searchView.clearFocus();

            search(query, true);

            return;
        }

        if (onCreate) {
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptThirdPartyCookies(mIitcWebView, true);
            loadUrl(mIntelUrl);
        }
    }

    private void search(String term, final boolean confirmed) {
        if (term.isEmpty() && !confirmed) return;

        term = term.replace("'", "\\'");
        mIitcWebView.loadUrl("javascript:if(window.search&&window.search.doSearch){window.search.doSearch('" + term
                + "'," + confirmed + ");}");
    }

    private void handleGeoUri(final Uri uri) throws URISyntaxException {
        final String[] parts = uri.getSchemeSpecificPart().split("\\?", 2);
        Double lat = null, lon = null;
        Integer z = null;
        String search = null;

        // parts[0] may contain an 'uncertainty' parameter, delimited by a semicolon
        final String[] pos = parts[0].split(";", 2)[0].split(",", 2);
        if (pos.length == 2) {
            try {
                lat = Double.valueOf(pos[0]);
                lon = Double.valueOf(pos[1]);
            } catch (final NumberFormatException e) {
                lat = null;
                lon = null;
            }
        }

        if (parts.length > 1) { // query string present
            // search for z=
            for (final String param : parts[1].split("&")) {
                if (param.startsWith("z=")) {
                    try {
                        z = Integer.valueOf(param.substring(2));
                    } catch (final NumberFormatException e) {
                    }
                }
                if (param.startsWith("q=")) {
                    search = param.substring(2);
                    final Pattern pattern = Pattern.compile("^(-?\\d+(\\.\\d+)?),(-?\\d+(\\.\\d+)?)\\s*\\(.+\\)");
                    final Matcher matcher = pattern.matcher(search);
                    if (matcher.matches()) {
                        try {
                            lat = Double.valueOf(matcher.group(1));
                            lon = Double.valueOf(matcher.group(3));
                            search = null; // if we have a position, we don't need the search term
                        } catch (final NumberFormatException e) {
                            lat = null;
                            lon = null;
                        }
                    }
                }
            }
        }

        if (lat != null && lon != null) {
            String url = mIntelUrl + "?ll=" + lat + "," + lon;
            if (z != null) {
                url += "&z=" + z;
            }
            loadUrl(url);
            return;
        }

        if (search != null) {
            if (mIsLoading) {
                mSearchTerm = search;
                loadUrl(mIntelUrl);
            } else {
                search(search, true);
            }
            return;
        }

        throw new URISyntaxException(uri.toString(), "position could not be parsed");
    }

    @Override
    protected void onStart() {
        super.onStart();

        if (mReloadNeeded) {
            Log.d("preference had changed...reload needed");
            reloadIITC();
        } else {
            // iitc is not fully booted...timer will be reset by the script itself
            if (findViewById(R.id.imageLoading).getVisibility() == View.GONE) {
                // enough idle...let's do some work
                Log.d("resuming...reset idleTimer");
                mIitcWebView.loadJS("(function(){if(window.idleReset) window.idleReset();})();");
            }
        }

        mUserLocation.onStart();
    }

    @Override
    protected void onResume() {
        super.onResume();
        mIitcWebView.resumeTimers();
        mIitcWebView.onResume();
        localizationDelegate.onCreate();
        localizationDelegate.onResume(this);
    }

    @Override
    protected void attachBaseContext(Context newBase) {
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

    public final void setLanguage(String language) { localizationDelegate.setLanguage(this, language); }

    public final Locale getCurrentLanguage() {
        return localizationDelegate.getLanguage(this);
    }

    @Override
    protected void onPause() {
        super.onPause();
        mIitcWebView.pauseTimers();
        mIitcWebView.onPause();
    }

    @Override
    protected void onStop() {
        super.onStop();
        Log.d("stopping iitcm");
        mIitcWebView.loadUrl("javascript: window.idleSet();");
        mUserLocation.onStop();
    }

    @Override
    protected void onDestroy() {
        unregisterReceiver(mBroadcastReceiver);
        unregisterReceiver(mDesktopModeReceiver);
        super.onDestroy();
    }

    @Override
    public void onConfigurationChanged(final Configuration newConfig) {
        super.onConfigurationChanged(newConfig);

        mNavigationHelper.onConfigurationChanged(newConfig);

        Log.d("configuration changed...restoring...reset idleTimer");
        mIitcWebView.loadUrl("javascript: window.idleTime = 0");
        mIitcWebView.loadUrl("javascript: window.renderUpdateStatus()");
    }

    @Override
    protected void onPostCreate(final Bundle savedInstanceState) {
        super.onPostCreate(savedInstanceState);
        mNavigationHelper.onPostCreate(savedInstanceState);
    }

    // we want a self defined behavior for the back button
    @Override
    public void onBackPressed() {
        // exit fullscreen mode if it is enabled and action bar is disabled or the back stack is empty
        if (mIitcWebView.isInFullscreen() && mBackStack.isEmpty()) {
            mIitcWebView.toggleFullscreen();
            return;
        }

        // close drawer if opened
        if (mNavigationHelper.isDrawerOpened()) {
            mNavigationHelper.closeDrawers();
            return;
        }

        // kill all open iitc dialogs
        if (!mDialogStack.isEmpty()) {
            final String id = mDialogStack.pop();
            mIitcWebView.loadUrl("javascript: " +
                    "var selector = $(window.DIALOGS['" + id + "']); " +
                    "selector.dialog('close'); " +
                    "selector.remove();");
            return;
        }

        // Pop last item from backstack and pretend the relevant menu item was clicked
        if (!mBackStack.isEmpty()) {
            backStackPop();
            mBackButtonPressed = true;
            return;
        }

        if (mBackButtonPressed || !mSharedPrefs.getBoolean("pref_press_twice_to_exit", false)) {
            super.onBackPressed();
        } else {
            mBackButtonPressed = true;
            Toast.makeText(this, getString(R.string.toast_press_twice_to_exit), Toast.LENGTH_SHORT).show();
            // reset back button after 2 seconds
            new Handler().postDelayed(new Runnable() {
                @Override
                public void run() {
                    mBackButtonPressed = false;
                }
            }, 2000);
        }
    }

    public void backStackPop() {
        // shouldn't be called when back stack is empty
        // catch wrong usage
        if (mBackStack.isEmpty()) {
            mBackStack.push(Pane.MAP);
        }

        final Pane pane = mBackStack.pop();
        switchToPane(pane);
    }

    public void setCurrentPane(final Pane pane) {
        // ensure no double adds
        if (pane == mCurrentPane) return;

        // map pane is top-lvl. clear stack.
        if (pane == Pane.MAP) {
            mBackStack.clear();
        }
        // don't push current pane to backstack if this method was called via back button
        else if (!mBackButtonPressed) mBackStack.push(mCurrentPane);

        mBackButtonPressed = false;
        mCurrentPane = pane;
        mNavigationHelper.switchTo(pane);
    }

    public void switchToPane(final Pane pane) {
        if (mNavigationHelper.isDesktopActive()) return;
        mIitcWebView.loadUrl("javascript: window.show('" + pane.name + "');");
    }

    public boolean isDexRunning() {
        return mDexRunning;
    }

    @Override
    public boolean onKeyDown(final int keyCode, final KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_SEARCH) {
            mSearchMenuItem.expandActionView();

            final SearchView tv = (SearchView) mSearchMenuItem.getActionView();
            tv.setQuery(mSearchTerm, false);
            tv.requestFocus();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean onCreateOptionsMenu(final Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.main, menu);
        // Get the SearchView and set the searchable configuration
        final SearchManager searchManager = (SearchManager) getSystemService(Context.SEARCH_SERVICE);
        mSearchMenuItem = menu.findItem(R.id.menu_search);
        final SearchView searchView = (SearchView) mSearchMenuItem.getActionView();
        // Assumes current activity is the searchable activity
        searchView.setSearchableInfo(searchManager.getSearchableInfo(getComponentName()));
        searchView.setIconifiedByDefault(false); // Do not iconify the widget; expand it by default
        searchView.setOnQueryTextListener(new SearchView.OnQueryTextListener() {
            @Override
            public boolean onQueryTextSubmit(final String query) {
                mSearchTerm = query;
                search(query, true);
                return true;
            }

            @Override
            public boolean onQueryTextChange(final String query) {
                if (!query.isEmpty()) {
                    mSearchTerm = query;
                    search(query, false);
                }
                return true;
            }
        });

        // the SearchView does not allow submitting an empty query, so we catch the clear button
        final View buttonClear = searchView.findViewById(
                getResources().getIdentifier("android:id/search_close_btn", null, null));
        if (buttonClear != null) buttonClear.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(final View v) {
                searchView.setQuery("", false);
                search("", true);
            }
        });
        return true;
    }

    @Override
    public boolean onPrepareOptionsMenu(final Menu menu) {
        boolean visible = false;
        if (mNavigationHelper != null) visible = !mNavigationHelper.isDrawerOpened();
        if (mIsLoading) visible = false;

        ((SearchView) menu.findItem(R.id.menu_search).getActionView()).setQuery(mSearchTerm, false);

        for (int i = 0; i < menu.size(); i++) {
            final MenuItem item = menu.getItem(i);
            final boolean enabled = mAdvancedMenu.contains( getResources().getResourceEntryName(item.getItemId()) );

            switch (item.getItemId()) {
                case R.id.action_settings:
                    item.setVisible(true);
                    break;

                case R.id.menu_open_plugins:
                    item.setVisible(enabled);
                    break;

                case R.id.menu_toggle_fullscreen:
                    item.setChecked(mIitcWebView.isInFullscreen());
                    item.setIcon(mIitcWebView.isInFullscreen()
                            ? R.drawable.ic_action_return_from_full_screen
                            : R.drawable.ic_action_full_screen);
                    break;

                case R.id.menu_locate:
                    item.setVisible(enabled && visible);
                    item.setEnabled(!mIsLoading);
                    item.setIcon(mUserLocation.isFollowing()
                            ? R.drawable.ic_action_location_follow
                            : R.drawable.ic_action_location_found);
                    break;

                case R.id.menu_debug:
                    item.setVisible(enabled);
                    item.setChecked(mDebugging);
                    break;

                default:
                    item.setVisible(enabled && visible);
            }
        }

        return super.onPrepareOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(final MenuItem item) {
        if (mNavigationHelper.onOptionsItemSelected(item)) return true;

        // Handle item selection
        final int itemId = item.getItemId();

        switch (itemId) {
            case android.R.id.home:
                switchToPane(Pane.MAP);
                return true;
            case R.id.menu_reload:
                reloadIITC();
                return true;
            case R.id.menu_toggle_fullscreen:
                mIitcWebView.toggleFullscreen();
                return true;
            case R.id.menu_layer_chooser:
                mNavigationHelper.openRightDrawer();
                return true;
            case R.id.menu_locate: // get the users current location and focus it on map
                switchToPane(Pane.MAP);

                if (mUserLocation.hasCurrentLocation()) {
                    // if gps location is displayed we can use a better location without any costs
                    mUserLocation.locate(mPersistentZoom);
                } else {
                    // get location from network by default
                    mIitcWebView.loadUrl("javascript: window.map.locate({setView : true" +
                            (mPersistentZoom ? ", maxZoom : map.getZoom()" : "") + "});");
                }
                return true;
            case R.id.action_settings: // start settings activity
                final Intent intent = new Intent(this, PreferenceActivity.class);
                intent.putExtra("iitc_userAgent", mIITCDefaultUA);
                intent.putExtra("iitc_originalUserAgent", mIITCOriginalUA);
                try {
                    intent.putExtra("iitc_version", mFileManager.getIITCVersion());
                } catch (final IOException e) {
                    Log.w(e);
                    return true;
                }
                startActivity(intent);
                return true;
            case R.id.menu_clear_cookies:
                final CookieManager cm = CookieManager.getInstance();
                cm.removeAllCookie();
                return true;
            case R.id.menu_send_screenshot:
                sendScreenshot();
                return true;
            case R.id.menu_open_plugins:
                final Intent intent_plugins = new Intent(this, PluginPreferenceActivity.class);
                startActivity(intent_plugins);
                return true;
            case R.id.menu_debug:
                mDebugging = !mDebugging;
                updateViews();
                invalidateOptionsMenu();

                // TODO remove debugging stuff from JS?
                return true;
            default:
                return false;
        }
    }

    @Override
    public File getCacheDir() {
        return getApplicationContext().getCacheDir();
    }

    public void reloadIITC() {
        loadUrl(mIntelUrl);
        mReloadNeeded = false;
    }

    // vp=f enables mDesktopMode mode...vp=m is the default mobile view
    private String addUrlParam(final String url) {
        return url + (url.contains("?") ? '&' : '?') + "vp=" + (mNavigationHelper.isDesktopActive() ? 'f' : 'm');
    }

    public void reset() {
        mNavigationHelper.reset();
        mMapSettings.reset();
        mUserLocation.reset();
        mIitcWebView.getWebViewClient().reset();
        mBackStack.clear();
        mCurrentPane = Pane.MAP;
        mInternalHostnames = new HashSet<>();
    }

    // inject the iitc-script and load the intel url
    // plugins are injected onPageFinished
    public void loadUrl(String url) {
        reset();
        setLoadingState(true);
        url = addUrlParam(url);
        mIitcWebView.loadUrl(url);
    }

    public IITC_WebView getWebView() {
        return mIitcWebView;
    }

    public void startActivityForResult(final Intent launch, final ResponseHandler handler) {
        int index = mResponseHandlers.indexOf(handler);
        if (index == -1) {
            mResponseHandlers.add(handler);
            index = mResponseHandlers.indexOf(handler);
        }

        startActivityForResult(launch, RESULT_FIRST_USER + index);
    }

    public void deleteResponseHandler(final ResponseHandler handler) {
        final int index = mResponseHandlers.indexOf(handler);
        if (index != -1) {
            // set value to null to enable garbage collection, but don't remove it to keep indexes
            mResponseHandlers.set(index, null);
        }
    }

    @Override
    protected void onActivityResult(final int requestCode, final int resultCode, final Intent data) {
        // Handle folder selection for storage access
        if (requestCode == IITC_StorageManager.REQUEST_FOLDER_ACCESS) {
            if (resultCode == RESULT_OK && data != null) {
                Uri treeUri = data.getData();
                if (treeUri != null && mFileManager != null) {
                    mFileManager.getStorageManager().handleFolderSelection(treeUri);

                    // Reload PluginManager to pick up migrated plugins
                    boolean devMode = mSharedPrefs.getBoolean("pref_dev_checkbox", false);
                    IITC_PluginManager.getInstance().loadAllPlugins(
                            mFileManager.getStorageManager(),
                            getAssets(),
                            devMode
                    );

                    // Check for pending plugin installation
                    String pendingUri = mSharedPrefs.getString("pending_plugin_install", null);
                    if (pendingUri != null) {
                        mSharedPrefs.edit().remove("pending_plugin_install").apply();
                        mFileManager.installPlugin(Uri.parse(pendingUri), false);
                    }

                    // Reload IITC to apply changes
                    reloadIITC();
                }
            }
            return;
        }

        final int index = requestCode - RESULT_FIRST_USER;

        try {
            final ResponseHandler handler = mResponseHandlers.get(index);
            handler.onActivityResult(resultCode, data);
        } catch (final ArrayIndexOutOfBoundsException e) {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    // remove dialog and add it back again
    // to ensure it is the last element of the list
    // focused dialogs should be closed first
    public void setFocusedDialog(final String id) {
        Log.d("Dialog " + id + " focused");
        mDialogStack.remove(id);
        mDialogStack.push(id);
    }

    // called by the javascript interface
    public void dialogOpened(final String id, final boolean open) {
        if (open) {
            Log.d("Dialog " + id + " added");
	    if (!mDialogStack.contains(id)) {
                mDialogStack.push(id);
	    }
        } else {
            Log.d("Dialog " + id + " closed");
            mDialogStack.remove(id);
        }
    }

    public void setLoadingState(final boolean isLoading) {
        if (isLoading == mIsLoading) return;

        if (mSearchTerm != null && !mSearchTerm.isEmpty() && mIsLoading && !isLoading) {
            new Handler().postDelayed(new Runnable() {
                @Override
                public void run() {
                    search(mSearchTerm, true);
                }
            }, 5000);
        }

        mIsLoading = isLoading;
        mNavigationHelper.onLoadingStateChanged();
        mUserLocation.onLoadingStateChanged();
        invalidateOptionsMenu();
        updateViews();
        if (!isLoading) mFileManager.updatePlugins(false);
    }

    private void updateViews() {
        if (!mDebugging) {
            mViewDebug.setVisibility(View.GONE);
            mLayoutDebug.setVisibility(View.GONE);

            if (mIsLoading && !mSharedPrefs.getBoolean("pref_disable_splash", false)) {
                mIitcWebView.setVisibility(View.GONE);
                mImageLoading.setVisibility(View.VISIBLE);
            } else {
                mIitcWebView.setVisibility(View.VISIBLE);
                mImageLoading.setVisibility(View.GONE);
            }
        } else {
            // if the debug container is invisible (and we are about to show it), select the text box
            final boolean select = mViewDebug.getVisibility() != View.VISIBLE;

            mImageLoading.setVisibility(View.GONE); // never show splash screen while debugging
            mViewDebug.setVisibility(View.VISIBLE);

            if (select) {
                mEditCommand.requestFocus();
                mEditCommand.selectAll();
            }

            if (mShowMapInDebug) {
                mBtnToggleMap.setImageResource(R.drawable.ic_view_list_white);
                mIitcWebView.setVisibility(View.VISIBLE);
                mLayoutDebug.setVisibility(View.GONE);
            } else {
                mBtnToggleMap.setImageResource(R.drawable.ic_map_white);
                mIitcWebView.setVisibility(View.GONE);
                mLayoutDebug.setVisibility(View.VISIBLE);
            }
        }
    }

    public void onBtnRunCodeClick(final View v) {
        final String code = mEditCommand.getText().toString();
        final JSONObject obj = new JSONObject();
        try {
            obj.put("code", code);
        } catch (final JSONException e) {
            Log.w(e);
            return;
        }
        debugHistoryPosition = -1;
        debugHistory.push(code);
        mEditCommand.setText("");

        Set<String> in = new HashSet<>(Arrays.asList(debugHistory.getStackArray()));
        mSharedPrefs.edit().putStringSet("debug_history", in).apply();

        // throwing an exception will be reported by WebView
        final String js = "(function(obj){var result;" +
                "console.log('>>> ' + obj.code);" +
                "try{result=eval(obj.code);}catch(e){if(e.stack) console.error(e.stack);throw e;}" +
                "if(result!==undefined) console.log(result===null?null:result.toString());" +
                "})(" + obj.toString() + ");";

        mIitcWebView.loadJS(js);
    }

    /**
     * onClick handler for R.id.btnToggleMapVisibility, assigned in activity_main.xml
     */
    public void onToggleMapVisibility(final View v)
    {
        mShowMapInDebug = !mShowMapInDebug;
        updateViews();
    }

    /**
     * onClick handler for R.id.btnClearLog, assigned in activity_main.xml
     */
    public void onClearLog(final View v)
    {
        ((IITC_LogAdapter) mLvDebug.getAdapter()).clear();
    }

    private void setDebugCursorToEnd() {
        mEditCommand.setSelection(mEditCommand.getText().length());
    }

    /**
     * onClick handler for R.id.btnDebugUp, assigned in activity_main.xml
     */
    public void onDebugHistoryUp(final View v)
    {
        if (debugHistoryPosition >= debugHistory.getSize()-1) return;

        if (debugHistoryPosition < 0) {
            debugInputStore = mEditCommand.getText().toString();
        }

        debugHistoryPosition += 1;
        mEditCommand.setText(debugHistory.peek(debugHistoryPosition));
        setDebugCursorToEnd();
    }

    /**
     * onClick handler for R.id.btnDebugDown, assigned in activity_main.xml
     */
    public void onDebugHistoryDown(final View v)
    {
        if (debugHistoryPosition < 0) return;
        debugHistoryPosition -= 1;

        String text;
        if (debugHistoryPosition < 0) {
            text = debugInputStore;
        } else {
            text = debugHistory.peek(debugHistoryPosition);
        }

        mEditCommand.setText(text);
        setDebugCursorToEnd();
    }

    private int debugCursorMove(boolean right) {
        mEditCommand.requestFocus();
        int pos = mEditCommand.getSelectionEnd();
        int len = mEditCommand.length();

        if (right && pos < len) {
            pos += 1;
        } else if (!right && pos > 0) {
            pos -= 1;
        }

        return pos;
    }

    /**
     * onClick handler for R.id.btnDebugLeft, assigned in activity_main.xml
     */
    public void onDebugCursorMoveRight(final View v)
    {
        mEditCommand.setSelection(debugCursorMove(true));
    }

    /**
     * onClick handler for R.id.btnDebugRight, assigned in activity_main.xml
     */
    public void onDebugCursorMoveLeft(final View v)
    {
        mEditCommand.setSelection(debugCursorMove(false));
    }

    private void deleteUpdateFile() {
        final File file = new File(getExternalFilesDir(null).toString() + "/iitcUpdate.apk");
        if (file != null) file.delete();
    }

    public void updateIitc(final String url) {
        final DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setDescription(getString(R.string.download_description));
        request.setTitle("IITCm Update");
        request.allowScanningByMediaScanner();
        final Uri fileUri = Uri.parse("file://" + getExternalFilesDir(null).toString() + "/iitcUpdate.apk");
        request.setDestinationUri(fileUri);
        // remove old update file...we don't want to spam the external storage
        deleteUpdateFile();
        // get download service and enqueue file
        final DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        manager.enqueue(request);
    }

    private void installIitcUpdate() {
        final String iitcUpdatePath = getExternalFilesDir(null).toString() + "/iitcUpdate.apk";
        final Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(Uri.fromFile(new File(iitcUpdatePath)), "application/vnd.android.package-archive");
        startActivity(intent);
        // finish app, because otherwise it gets killed on update
        finish();
    }

    public boolean isLoading() {
        return mIsLoading;
    }

    public void firstTimeIntro() {
        Thread t = new Thread(() -> {
            boolean isFirstStart = mSharedPrefs.getBoolean("firstStart", true);
            if (isFirstStart) {
                final Intent i = new Intent(IITC_Mobile.this, IntroActivity.class);
                runOnUiThread(() -> startActivity(i));
            }
        });
        t.start();
    }

    /**
     *
     * @deprecated ActionBar related stuff should be handled by IITC_NavigationHelper
     */
    @Deprecated
    @Override
    public ActionBar getActionBar() {
        return super.getActionBar();
    }

    public IITC_NavigationHelper getNavigationHelper() {
        return mNavigationHelper;
    }

    public IITC_MapSettings getMapSettings() {
        return mMapSettings;
    }

    public IITC_FileManager getFileManager() {
        return mFileManager;
    }

    public SharedPreferences getPrefs() {
        return mSharedPrefs;
    }

    public IITC_UserLocation getUserLocation() {
        return mUserLocation;
    }

    public String getIntelUrl() {
        return mIntelUrl;
    }

    public String getDefaultUserAgent() {
        return mIITCDefaultUA;
    }

    public interface ResponseHandler {
        void onActivityResult(int resultCode, Intent data);
    }

    public void setPermalink(final String href) {
        mPermalink = href;
    }

    private void sendScreenshot() {
        Toast.makeText(this, R.string.msg_prepare_screenshot, Toast.LENGTH_SHORT).show();

        // Hack for Android >= 5.0 Lollipop
        // When hardware acceleration is enabled, it is not possible to create a screenshot.
        mIitcWebView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        // After switch to software render, we need to redraw the webview, but of all the ways I have worked only resizing.
        final ViewGroup.LayoutParams savedLayoutParams = mIitcWebView.getLayoutParams();
        mIitcWebView.setLayoutParams(new LinearLayout.LayoutParams(mIitcWebView.getWidth()+10, LinearLayout.LayoutParams.FILL_PARENT));
        // This takes some time, so a timer is set.
        // After the screenshot is taken, the webview size and render type are returned to their original state.

        new Handler().postDelayed(() -> {
            final Bitmap bitmap = Bitmap.createBitmap(mIitcWebView.getWidth(),mIitcWebView.getHeight(), Bitmap.Config.ARGB_8888);
            mIitcWebView.draw(new Canvas(bitmap));

            try {
                mIitcWebView.setLayoutParams(savedLayoutParams);
                mIitcWebView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
                Toast.makeText(this, R.string.msg_take_screenshot, Toast.LENGTH_SHORT).show();
                final File file = File.createTempFile("IITC screenshot", ".png", getExternalCacheDir());
                if (!bitmap.compress(CompressFormat.PNG, 100, new FileOutputStream(file))) {
                    // quality is ignored by PNG
                    throw new IOException("Failed to compress bitmap");
                }
                startActivityForResult(ShareActivity.forFile(this, file, "image/png"), (resultCode, data) -> {
                    file.delete();
                });
            } catch (final IOException e) {
                Log.e("Failed to generate screenshot", e);
            }

        }, 2000);

    }

    public void clipboardCopy(String msg) {
        mIitcWebView.getJSInterface().copy(msg);
    }

    public boolean isDebugEnd() {
        int visibleItemCount = mLvDebug.getChildCount();
        int totalItemCount = llm.getItemCount();
        int firstVisibleItemPosition = llm.findFirstVisibleItemPosition();

        return ((visibleItemCount + firstVisibleItemPosition) >= totalItemCount
                && firstVisibleItemPosition >= 0 || llm.getItemCount() < 1);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        if (requestCode == IITC_UserLocation.REQ_PERMISSIONS_LOCATION && mUserLocation != null) {
            int grantedCount = 0;
            for (int i = 0; i < grantResults.length; i++) {
                if (grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                    grantedCount++;
                }
            }
            if (grantedCount > 0) {
                mUserLocation.onRuntimePermissionsGranted();
            }
        }
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    /**
     * Add host name that should be opened in the internal webview.
     * @param hostname host name.
     */
    public void addInternalHostname(String hostname) {
        mInternalHostnames.add(hostname);
    }

    /**
     * @param hostname host name.
     * @return <code>true</code> if a host name should be opened in the internal webview.
     */
    public boolean isInternalHostname(String hostname) {
        return mInternalHostnames.contains(hostname);
    }

    /**
     * @param hostname host name
     * @return <code>true</code> if host name is google.* or google.com?.* domain
     */
    public boolean isGoogleHostname(String hostname) {
        if (hostname.startsWith("google.") || hostname.contains(".google.")) {
            return mGoogleHostnamePattern.matcher(hostname).find();
        }
        return false;
    }

    /**
     * @param hostname host name.
     * @return <code>true</code> if a host name allowed to be load in IITC.
     */
    public boolean isAllowedHostname(String hostname) {
        // shortcut for .google.* hostnames
        if (isGoogleHostname(hostname)) {
            return true;
        }
        for (String key : mAllowedHostnames.keySet()) {
            if (hostname.equals(key)) return true;
            if (hostname.endsWith("." + key)) return true;
        }
        return isInternalHostname(hostname);
    }

    /**
     * @param hostname host name.
     * @return <code>user-agent string</code> if a host name allowed to be load in IITC.
     */
    public String getUserAgentForHostname(String hostname) {
        if (mSharedPrefs.getBoolean("pref_fake_user_agent", false))
            return mDesktopUA;
        // shortcut for .google.* hostnames
        if (isGoogleHostname(hostname)) {
            hostname = "google.com";
        }
        for (Map.Entry<String,String> e : mAllowedHostnames.entrySet()) {
            final String key = e.getKey();
            if (hostname.equals(key)) return e.getValue();
            if (hostname.endsWith("." + key)) return e.getValue();
        }
        return null;
    }

    public String sanitizeUserAgent(String userAgent) {
        // Hide webview postfix
        // Remove the "; wv" postfix from the user agent to hide WebView usage and present as a regular browser.
        userAgent = userAgent.replace("; wv", "");

        // Regular expression to find the substring "Chrome/[N].0.0.0" where [N] is any number.
        // For some reason, Google disallows authorization if the Chrome version ends in ".0.0.0"
        String regex = "Chrome/(\\d+)\\.0\\.0\\.0";
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(userAgent);
        if (matcher.find()) {
            // Extract the version number [N] from the found match.
            String numberStr = matcher.group(1);
            int number = Integer.parseInt(numberStr);

            // Create the replacement string in the format "Chrome/[N].0.0.1".
            String replacement = "Chrome/" + number + ".0.0.1";

            // Replace the found match with the new version number in the user agent string.
            userAgent = userAgent.replaceFirst(regex, replacement);
        }
        return userAgent;
    }
}
