package org.exarhteam.iitc_mobile;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.app.Dialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Environment;
import android.preference.PreferenceManager;
import android.text.TextUtils;
import android.view.View;
import android.webkit.HttpAuthHandler;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

import java.io.ByteArrayInputStream;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class IITC_WebViewClient extends WebViewClient {

    private static final String DOMAIN = IITC_FileManager.DOMAIN;
    private static final ByteArrayInputStream EMPTY = new ByteArrayInputStream("".getBytes());
    private static final ByteArrayInputStream STYLE = new ByteArrayInputStream(
            "body, #dashboard_container, #map_canvas { background: #000 !important; }"
                    .getBytes());

    private final IITC_Mobile mIitc;
    private boolean mIitcInjected = false;
    private final String mIitcPath;
    private final IITC_TileManager mTileManager;

    public IITC_WebViewClient(final IITC_Mobile iitc) {
        mIitc = iitc;
        mTileManager = new IITC_TileManager(mIitc);
        mIitcPath = Environment.getExternalStorageDirectory().getPath() + "/IITC_Mobile/";
    }

    @SuppressLint("InflateParams")
    // no other way for AlertDialog
    private Dialog createSignInDialog(final HttpAuthHandler handler, final String host, final String realm,
            final String username, final String password) {
        final View v = mIitc.getLayoutInflater().inflate(R.layout.dialog_http_authentication, null);
        final TextView tvUsername = (TextView) v.findViewById(R.id.username);
        final TextView tvPassword = (TextView) v.findViewById(R.id.password);
        final String title = String.format(mIitc.getString(R.string.sign_in_to), host, realm);

        if (username != null)
            tvUsername.setText(username);
        if (password != null)
            tvPassword.setText(password);

        return new AlertDialog.Builder(mIitc)
                .setView(v)
                .setTitle(title)
                .setCancelable(true)
                .setPositiveButton(R.string.sign_in_action, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(final DialogInterface dialog, final int id) {
                        handler.proceed(tvUsername.getText().toString(), tvPassword.getText().toString());
                    }
                })
                .setNegativeButton(android.R.string.cancel, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(final DialogInterface dialog, final int id) {
                        dialog.cancel();
                    }
                })
                .setOnCancelListener(new DialogInterface.OnCancelListener() {
                    @Override
                    public void onCancel(final DialogInterface dialog) {
                        handler.cancel();
                    }
                })
                .create();
    }

    private void loadScripts(final IITC_WebView view) {
        final List<String> scripts = new LinkedList<String>();

        // get the plugin preferences
        final SharedPreferences sharedPref = PreferenceManager.getDefaultSharedPreferences(mIitc);
        final TreeMap<String, ?> all_prefs = new TreeMap<String, Object>(sharedPref.getAll());

        // iterate through all plugins
        for (final Map.Entry<String, ?> entry : all_prefs.entrySet()) {
            final String plugin = entry.getKey();
            if (plugin.endsWith(".user.js") && entry.getValue().toString().equals("true")) {
                if (plugin.startsWith(mIitcPath)) {
                    scripts.add("user-plugin" + DOMAIN + plugin);
                } else {
                    scripts.add("script" + DOMAIN + "/plugins/" + plugin);
                }
            }
        }

        // inject the user location script if enabled in settings
        if (Integer.parseInt(sharedPref.getString("pref_user_location_mode", "0")) != 0) {
            scripts.add("script" + DOMAIN + "/user-location.user.js");
        }

        scripts.add("script" + DOMAIN + "/total-conversion-build.user.js");

        final String js = "(function(){['" + TextUtils.join("','", scripts) + "'].forEach(function(src) {" +
                "var script = document.createElement('script');script.src = '//'+src;" +
                "(document.body || document.head || document.documentElement).appendChild(script);" +
                "});})();";

        view.loadJS(js);
    }

    @Override
    public void onPageFinished(final WebView view, final String url) {
        if(url.startsWith("https://intel.ingress.com")) {
            if (mIitcInjected) return;
            Log.d("injecting iitc..");
            loadScripts((IITC_WebView) view);
            mIitcInjected = true;
        }
        super.onPageFinished(view, url);
    }

    @Override
    public void onReceivedHttpAuthRequest(final WebView view, final HttpAuthHandler handler, final String host,
            final String realm) {
        String username = null;
        String password = null;

        final boolean reuseHttpAuthUsernamePassword = handler.useHttpAuthUsernamePassword();

        if (reuseHttpAuthUsernamePassword && view != null) {
            final String[] credentials = view.getHttpAuthUsernamePassword(host, realm);
            if (credentials != null && credentials.length == 2) {
                username = credentials[0];
                password = credentials[1];
            }
        }

        if (username != null && password != null) {
            handler.proceed(username, password);
        } else {
            createSignInDialog(handler, host, realm, username, password).show();
        }
    }

    /**
     * this method is called automatically when the Google login form is opened.
     */
    @Override
    public void onReceivedLoginRequest(final WebView view, final String realm, final String account, final String args) {
        // Log.d("iitcm", "Login requested: " + realm + " " + account + " " + args);
        // mIitc.onReceivedLoginRequest(this, view, realm, account, args);
    }

    /**
     * Notify the host application that an SSL error occurred while loading a
     * resource. The host application must call either handler.cancel() or
     * handler.proceed(). Note that the decision may be retained for use in
     * response to future SSL errors. The default behavior is to cancel the
     * load.
     *
     * @param view    The WebView that is initiating the callback.
     * @param handler An SslErrorHandler object that will handle the user's
     *                response.
     * @param error   The SSL error object.
     */
    @Override
    public void onReceivedSslError(WebView view, final SslErrorHandler handler, SslError error) {
        final AlertDialog.Builder builder = new AlertDialog.Builder(mIitc);
        String message = "SSL Certificate error.";
        switch (error.getPrimaryError()) {
            case SslError.SSL_UNTRUSTED:
                message = "The certificate authority is not trusted.";
                break;
            case SslError.SSL_EXPIRED:
                message = "The certificate has expired.";
                break;
            case SslError.SSL_IDMISMATCH:
                message = "The certificate Hostname mismatch.";
                break;
            case SslError.SSL_NOTYETVALID:
                message = "The certificate is not yet valid.";
                break;
        }
        message += " Do you want to continue anyway?";

        builder.setTitle("SSL Certificate Error");
        builder.setMessage(message);
        builder.setPositiveButton("continue", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                handler.proceed();
            }
        });
        builder.setNegativeButton(android.R.string.cancel, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                handler.cancel();
            }
        });
        final AlertDialog dialog = builder.create();
        dialog.show();
    }

    public void reset() {
        mIitcInjected = false;
    }

    /**
     * Check every external resource if it's okay to load it and maybe replace it with our own content.
     * This is used to block loading Niantic resources which aren’t required and to inject IITC early into the site.
     * via http://stackoverflow.com/a/8274881/1684530
     */
    @Override
    public WebResourceResponse shouldInterceptRequest(final WebView view, final String url) {
        // if any tiles are requested, handle it with IITC_TileManager
        if (url.matches(".*tile.*jpg.*") // mapquest tiles | ovi tiles
                || url.matches(".*tile.*png.*") // cloudmade tiles
                || url.matches(".*mts.*googleapis.*") // google tiles
                || url.matches(".*khms.*googleapis.*") // google satellite tiles
                || url.matches(".*tile.*jpeg.*") // bing tiles
                || url.matches(".*maps.*yandex.*tiles.*") // yandex maps
                || url.matches(".*cartocdn.*png.*") // cartoDB tiles
        ) {
            try {
                return mTileManager.getTile(url);
            } catch (final Exception e) {
                Log.w(e);
                return super.shouldInterceptRequest(view, url);
            }
        }

        if (url.contains("/css/common.css")) {
            // return custom stylesheet
            return new WebResourceResponse("text/css", "UTF-8", STYLE);
        }

        if (url.contains("/css/ap_icons.css")
                || url.contains("/css/map_icons.css")
                || url.contains("/css/common.css")
                || url.contains("/css/misc_icons.css")
                || url.contains("/css/style_full.css")
                || url.contains("/css/style_mobile.css")
                || url.contains("/css/portalrender.css")
                || url.contains("/css/portalrender_mobile.css")
                || url.contains("js/analytics.js")
                || url.contains("google-analytics.com/ga.js")) {
            // don't load stylesheets
            return new WebResourceResponse("text/plain", "UTF-8", EMPTY);
        }

        final Uri uri = Uri.parse(url);
        if (uri.getHost() != null && uri.getHost().endsWith(DOMAIN) &&
                ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())))
            return mIitc.getFileManager().getResponse(uri);

        return super.shouldInterceptRequest(view, url);
    }

    // start non-ingress-intel-urls in another app...
    @Override
    public boolean shouldOverrideUrlLoading(final WebView view, final String url) {
        final Uri uri = Uri.parse(url);
        final String uriHost = uri.getHost();
        final String uriPath = uri.getPath();
        final String uriQuery = uri.getQueryParameter("q");
        if (uriHost.equals("intel.ingress.com")) {
            Log.d("intel link requested, reset app and load " + url);
            mIitc.reset();
            mIitc.setLoadingState(true);
            return false;
        }
        if ((uriHost.startsWith("google.") || uriHost.contains(".google."))
                && uriPath.equals("/url") && uriQuery != null) {
            Log.d("redirect to: " + uriQuery);
            return shouldOverrideUrlLoading(view, uriQuery);
        }
        if (uriHost.endsWith("facebook.com")
                && (uriPath.contains("oauth") || uriPath.equals("/login.php") || uriPath.equals("/checkpoint/"))) {
            Log.d("Facebook login");
            return false;
        }
        if (uriHost.startsWith("accounts.google.") ||
                 uriHost.startsWith("appengine.google.") ||
                 uriHost.startsWith("accounts.youtube.")) {
            Log.d("Google login");
            return false;
        }
        Log.d("no ingress intel link, start external app to load url: " + url);
        final Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        // make new activity independent from iitcm
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        mIitc.startActivity(intent);
        return true;
    }
}
