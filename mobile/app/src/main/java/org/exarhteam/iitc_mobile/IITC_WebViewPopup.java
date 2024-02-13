package org.exarhteam.iitc_mobile;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.AttributeSet;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

@SuppressLint("SetJavaScriptEnabled")
public class IITC_WebViewPopup extends WebView {
    private WebSettings mSettings;
    private IITC_Mobile mIitc;

    private Dialog mDialog;

    // init web view
    private void iitc_init(final Context c) {
        if (isInEditMode())
            return;
        mIitc = (IITC_Mobile) c;
        mSettings = getSettings();
        mSettings.setJavaScriptEnabled(true);
        setVerticalScrollBarEnabled(false);
        setHorizontalScrollBarEnabled(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT)
            setWebContentsDebuggingEnabled(true);

        setWebChromeClient(new WebChromeClient() {
            @Override
            public void onCloseWindow(WebView view) {
                Log.d("close popup window");
                mDialog.dismiss();
            }
        });
        setWebViewClient(new WebViewClient() {
            // duplicate code from IITC_WebViewClient
            private boolean reloadWithUserAgent(final WebView view, final String url) {
                final Uri uri = Uri.parse(url);
                final String uriHost = uri.getHost();

                final String currentUA = view.getSettings().getUserAgentString();
                final String targetUA = mIitc.getUserAgentForHostname(uriHost);
                if (targetUA == null || currentUA.equals(targetUA))
                    return false;

                Log.d("reload url from " + uriHost + " with UA `" + targetUA + "`");

                view.getSettings().setUserAgentString(targetUA);
                view.loadUrl(url);
                return true;
            }

            @Override
            public boolean shouldOverrideUrlLoading(final WebView view, final String url) {
                final Uri uri = Uri.parse(url);
                if (uri.isHierarchical() && mIitc.isAllowedHostname(uri.getHost())) {
                    final String uriHost = uri.getHost();
                    final String uriPath = uri.getPath();
                    final String uriQuery = uri.getQueryParameter("q");

                    // load intel into main view
                    if (uriHost.equals("intel.ingress.com")) {
                        Log.d("popup: intel link requested, reset app and load into main view" + url);
                        mIitc.reset();
                        mIitc.setLoadingState(true);
                        mIitc.loadUrl(url);
                        mDialog.dismiss();
                        return true;
                    }

                    if (reloadWithUserAgent(view, url)) {
                        openDialogPopup();
                        return true;
                    }

                    if ((uriHost.startsWith("google.") || uriHost.contains(".google."))
                            && uriPath.equals("/url") && uriQuery != null) {
                        Log.d("popup: redirect to: " + uriQuery);
                        return shouldOverrideUrlLoading(view, uriQuery);
                    }
                    if (uriHost.endsWith("facebook.com")
                            && (uriPath.contains("oauth") || uriPath.equals("/login.php") || uriPath.equals("/checkpoint/")
                            || uriPath.equals("/cookie/consent_prompt/"))) {
                        Log.d("popup: Facebook login");
                        openDialogPopup();
                        return false;
                    }
                    if (uriHost.startsWith("accounts.google.") ||
                            uriHost.startsWith("appengine.google.") ||
                            uriHost.startsWith("accounts.youtube.") ||
                            uriHost.startsWith("myaccount.google.")) {
                        Log.d("popup: Google login");
                        openDialogPopup();
                        return false;
                    }
                    if (uriHost.startsWith("signin.nianticlabs.")) {
                        Log.d("popup: Niantic login");
                        openDialogPopup();
                        return false;
                    }
                    if (mIitc.isInternalHostname(uriHost)) {
                        Log.d("popup: internal host");
                        openDialogPopup();
                        return false;
                    }
                }

                Log.d("popup: no login link, nor internal host, start external app to load url: " + url);

                final Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                // make new activity independent from iitcm
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                mIitc.startActivity(intent);

                return true;
            }
        });

        mDialog = new Dialog(mIitc);
        mDialog.setContentView(this);
        final WebView view = this;
        mDialog.setOnCancelListener(new DialogInterface.OnCancelListener() {
            @Override
            public void onCancel(DialogInterface dialog) {
                view.destroy();
            }
        });
        mDialog.setOnDismissListener(new DialogInterface.OnDismissListener() {
            @Override
            public void onDismiss(DialogInterface dialog) {
                view.destroy();
            }
        });
    }

    private void openDialogPopup() {
        if (mDialog.isShowing()) return;
        mDialog.show();
        mDialog.getWindow().clearFlags(
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM);
    }

    // constructors -------------------------------------------------
    public IITC_WebViewPopup(final Context context) {
        super(context);

        iitc_init(context);
    }

    public IITC_WebViewPopup(final Context context, final AttributeSet attrs) {
        super(context, attrs);

        iitc_init(context);
    }

    public IITC_WebViewPopup(final Context context, final AttributeSet attrs, final int defStyle) {
        super(context, attrs, defStyle);

        iitc_init(context);
    }
}
