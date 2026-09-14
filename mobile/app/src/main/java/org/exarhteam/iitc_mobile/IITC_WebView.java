package org.exarhteam.iitc_mobile;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Build;
import android.preference.PreferenceManager;
import android.util.AttributeSet;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import org.exarhteam.iitc_mobile.async.CheckHttpResponse;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@SuppressLint("SetJavaScriptEnabled")
public class IITC_WebView extends WebView {

    // fullscreen modes
    public static final int FS_ENABLED = (1 << 0);
    public static final int FS_SYSBAR = (1 << 1);
    public static final int FS_ACTIONBAR = (1 << 2);
    public static final int FS_STATUSBAR = (1 << 3);
    public static final int FS_NAVBAR = (1 << 4);

    private WebSettings mSettings;
    private IITC_WebViewClient mIitcWebViewClient;
    private IITC_WebChromeClient mIitcWebChromeClient;
    private IITC_JSInterface mJsInterface;
    private IITC_Mobile mIitc;
    private SharedPreferences mSharedPrefs;
    private int mFullscreenStatus = 0;
    private WindowInsetsControllerCompat mInsetsController;
    private boolean mDisableJs = false;
    private int defaultZoom;
    private int mSafeAreaTopPx = 0;
    private int mSafeAreaBottomPx = 0;
    private int mSafeAreaLeftPx = 0;
    private int mSafeAreaRightPx = 0;


    // init web view
    private void iitc_init(final Context c) {
        if (isInEditMode()) return;
        mIitc = (IITC_Mobile) c;
        mSharedPrefs = PreferenceManager.getDefaultSharedPreferences(mIitc);


        mSettings = getSettings();
        defaultZoom = mSettings.getTextZoom();
        mSettings.setJavaScriptEnabled(true);
        mSettings.setDomStorageEnabled(true);
        mSettings.setAllowFileAccess(true);
        mSettings.setGeolocationEnabled(true);

        setSupportPopup(true);
        setWebViewZoom(Integer.parseInt(mSharedPrefs.getString("pref_webview_zoom", "-1")));

        // Set _ncc cookie to disable Niantic's cookie consent banner
        try {
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setCookie("https://signin.nianticspatial.com", "_ncc=0; Path=/; Domain=.nianticspatial.com");
        } catch (Exception e) {
            Log.w("Could not set _ncc cookie: " + e.getMessage());
        }

        // enable mixed content (http on https...needed for some map tiles) mode
        setWebContentsDebuggingEnabled(true);
        mSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        mJsInterface = new IITC_JSInterface(mIitc);

        addJavascriptInterface(mJsInterface, "app");

        mIitcWebChromeClient = new IITC_WebChromeClient(mIitc);
        setWebChromeClient(mIitcWebChromeClient);
        mIitcWebViewClient = new IITC_WebViewClient(mIitc);
        setWebViewClient(mIitcWebViewClient);
    }

    // constructors -------------------------------------------------
    public IITC_WebView(final Context context) {
        super(context);

        iitc_init(context);
    }

    public IITC_WebView(final Context context, final AttributeSet attrs) {
        super(context, attrs);

        iitc_init(context);
    }

    public IITC_WebView(final Context context, final AttributeSet attrs, final int defStyle) {
        super(context, attrs, defStyle);

        iitc_init(context);
    }

    // ----------------------------------------------------------------

    @Override
    public void loadUrl(String url) {
        if (url.startsWith("javascript:")) {
            // do nothing if script is enabled;
            if (mDisableJs) {
                Log.d("javascript injection disabled...return");
                return;
            }
            loadJS(url.substring("javascript:".length()));
        } else {
            // Niantic no longer allows connections without https
            url = url.replace("http://", "https://");

            // disable splash screen if a http error code is responded
            new CheckHttpResponse(mIitc).execute(url);

            // Set User Agent with respect to given URL (Google/Facebook or fake user agent)
            mIitcWebViewClient.setUserAgentForUrl(this, url);
            Log.d("loading url: " + url);
            super.loadUrl(url);
        }
    }

    public void loadJS(final String js) {
        try {
            evaluateJavascript(js, null);
        } catch (final IllegalStateException e) {
            Log.e(e);
        }
    }

    @Override
    public void onWindowFocusChanged(final boolean hasWindowFocus) {
        if (hasWindowFocus) {
            // if the webView has focus, JS should always be enabled
            mDisableJs = false;
            // the system brings the bars back while the window is out of focus,
            // for example when the notification shade is pulled down
            if (isInFullscreen()) {
                hideSystemBars();
            }
        }
        super.onWindowFocusChanged(hasWindowFocus);
    }

    private WindowInsetsControllerCompat getInsetsController() {
        if (mInsetsController == null) {
            mInsetsController = WindowCompat.getInsetsController(
                    mIitc.getWindow(), mIitc.getWindow().getDecorView());
        }
        return mInsetsController;
    }

    // hide the bars selected in the fullscreen preference
    private void hideSystemBars() {
        final WindowInsetsControllerCompat controller = getInsetsController();
        // the user can interact with the app while the bars are hidden and brings them
        // back temporarily by swiping from the edge of the screen
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);

        if ((mFullscreenStatus & FS_SYSBAR) != 0) {
            controller.hide(WindowInsetsCompat.Type.statusBars());
        }
        if ((mFullscreenStatus & FS_NAVBAR) != 0) {
            controller.hide(WindowInsetsCompat.Type.navigationBars());
        }
    }

    public void toggleFullscreen() {
        mFullscreenStatus ^= FS_ENABLED;

        // toggle notification bar
        if (isInFullscreen()) {
            // show a toast with instructions to exit the fullscreen mode again
            Toast.makeText(mIitc, "Press back button to exit fullscreen", Toast.LENGTH_SHORT).show();
            if ((mFullscreenStatus & FS_ACTIONBAR) != 0) {
                mIitc.getNavigationHelper().hideActionBar();
            }
            hideSystemBars();
            if ((mFullscreenStatus & FS_STATUSBAR) != 0) {
                loadUrl("javascript: $('#updatestatus').hide();");
            }
        } else {
            getInsetsController().show(WindowInsetsCompat.Type.systemBars());
            mIitc.getNavigationHelper().showActionBar();
            loadUrl("javascript: $('#updatestatus').show();");
        }
        mIitc.invalidateOptionsMenu();

        // Update safe area insets when fullscreen mode changes
        applySafeAreaInsets();
    }

    void updateFullscreenStatus() {
        final String[] fullscreenDefaults = getResources().getStringArray(R.array.pref_hide_fullscreen_defaults);
        final Set<String> entries = mSharedPrefs.getStringSet("pref_fullscreen",
                new HashSet<String>(Arrays.asList(fullscreenDefaults)));
        mFullscreenStatus &= FS_ENABLED;

        for (final String entry : entries) {
            mFullscreenStatus += Integer.parseInt(entry);
        }
    }

    public boolean isInFullscreen() {
        return (mFullscreenStatus & FS_ENABLED) != 0;
    }

    public IITC_WebViewClient getWebViewClient() {
        return mIitcWebViewClient;
    }

    public IITC_JSInterface getJSInterface() {
        return mJsInterface;
    }

    /**
     * Set CSS safe-area-inset values for web content
     */
    public void setSafeAreaInsets(int topPx, int rightPx, int bottomPx, int leftPx) {
        mSafeAreaTopPx = topPx;
        mSafeAreaRightPx = rightPx;
        mSafeAreaBottomPx = bottomPx;
        mSafeAreaLeftPx = leftPx;
        applySafeAreaInsets();
    }

    /**
     * Apply current safe area insets to CSS
     */
    public void applySafeAreaInsets() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            return;
        }

        // Convert pixels to CSS pixels (density-independent)
        float density = getContext().getResources().getDisplayMetrics().density;

        // Calculate effective values based on app state
        boolean isFullscreen = isInFullscreen();
        boolean isDebugging = mIitc.isDebugging();

        int topCss = isFullscreen ? Math.round(mSafeAreaTopPx / density) : 0;
        int rightCss = Math.round(mSafeAreaRightPx / density);
        int bottomCss = isDebugging ? 0 : Math.round(mSafeAreaBottomPx / density);
        int leftCss = Math.round(mSafeAreaLeftPx / density);

        String safeAreaJs = String.format(
            "document.documentElement.style.setProperty('--safe-area-inset-top', '%dpx');" +
            "document.documentElement.style.setProperty('--safe-area-inset-right', '%dpx');" +
            "document.documentElement.style.setProperty('--safe-area-inset-bottom', '%dpx');" +
            "document.documentElement.style.setProperty('--safe-area-inset-left', '%dpx');",
            topCss, rightCss, bottomCss, leftCss
        );

        loadJS(safeAreaJs);
    }

    public boolean isConnectedToWifi() {
        final ConnectivityManager conMan = (ConnectivityManager) mIitc.getSystemService(Context.CONNECTIVITY_SERVICE);
        final NetworkInfo wifi = conMan.getNetworkInfo(ConnectivityManager.TYPE_WIFI);

        // you can mark wifi networks as mobile hotspots
        // settings -> data usage -> menu -> mobile hotspots
        // ConnectivityManager.isActiveNetworkMeter returns if the currently used wifi-network
        // is ticked as mobile hotspot or not.
        // --> IITC_WebView.isConnectedToWifi should return 'false' if connected to mobile hotspot
        if (conMan.isActiveNetworkMetered()) return false;

        return (wifi.getState() == NetworkInfo.State.CONNECTED);
    }

    public void disableJS(final boolean val) {
        mDisableJs = val;
    }

    public void setSupportPopup(final boolean val) {
        mSettings.setSupportMultipleWindows(val);
    }

    public void setWebViewZoom(int zoom) {
        if (zoom != -1) {
            mSettings.setTextZoom(zoom);
        } else {
            mSettings.setTextZoom(defaultZoom);
        }
    }
}
