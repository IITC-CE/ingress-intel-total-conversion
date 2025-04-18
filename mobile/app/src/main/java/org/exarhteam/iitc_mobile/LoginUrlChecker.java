package org.exarhteam.iitc_mobile;

import android.net.Uri;

public class LoginUrlChecker {

    private LoginUrlChecker() {
        //hiding default constructor - only static methods
    }

    public static boolean isLoginUrl(Uri uri) {
        String uriHost = uri.getHost();
        String uriPath = uri.getPath();

        return isFacebookAuth(uriHost, uriPath)
                || isGoogleAuth(uriHost)
                || isAppleAuth(uriHost)
                || isNianticAuth(uriHost);
    }

    private static boolean isFacebookAuth(String uriHost, String uriPath) {
        return uriHost.endsWith("facebook.com")
                && (uriPath.contains("oauth") || uriPath.startsWith("/login") || uriPath.equals("/checkpoint/")
                || uriPath.equals("/cookie/consent_prompt/"));
    }

    private static boolean isGoogleAuth(String uriHost) {
        return uriHost.startsWith("accounts.google.") ||
                uriHost.startsWith("appengine.google.") ||
                uriHost.startsWith("accounts.youtube.") ||
                uriHost.startsWith("myaccount.google.") ||
                uriHost.startsWith("gds.google.");
    }

    private static boolean isAppleAuth(String uriHost) {
        return uriHost.equals("appleid.apple.com");
    }

    private static boolean isNianticAuth(String uriHost) {
        return uriHost.startsWith("signin.nianticlabs.") ||
                uriHost.startsWith("signin.nianticspatial.");
    }
}
