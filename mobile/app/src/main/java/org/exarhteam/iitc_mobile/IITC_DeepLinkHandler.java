package org.exarhteam.iitc_mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

/**
 * Helper class for managing deep link permissions and default handler status
 */
public class IITC_DeepLinkHandler {
    private final Activity mActivity;
    
    public IITC_DeepLinkHandler(Activity activity) {
        mActivity = activity;
    }
    
    /**
     * Check if the app is the default handler for Intel Map deep links
     * @return true if app is default handler, false if not, null if can't check or not supported
     */
    public Boolean isDefaultDeepLinkHandler() {
        if (mActivity == null) return null;
        
        // Only show deep link permission button on Android 12+ where system can reset the setting
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return null; // Hide button on older Android - system doesn't reset deep link settings
        }
        
        try {
            PackageManager packageManager = mActivity.getPackageManager();
            String currentPackageName = mActivity.getPackageName();
            
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(IITC_Mobile.getIntelUrl()));
            
            ResolveInfo resolveInfo = packageManager.resolveActivity(
                intent, 
                PackageManager.MATCH_DEFAULT_ONLY
            );
            
            if (resolveInfo == null || resolveInfo.activityInfo == null) {
                return false;
            }
            
            return currentPackageName.equals(resolveInfo.activityInfo.packageName);
        } catch (Exception e) {
            Log.w("Error checking default deep link handler: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Open app deep link settings for the current app
     * @return true if settings opened successfully
     */
    public boolean openDeepLinkSettings() {
        if (mActivity == null) return false;
        
        try {
            String packageName = mActivity.getPackageName();
            Intent intent = new Intent(Settings.ACTION_APP_OPEN_BY_DEFAULT_SETTINGS);
            intent.setData(Uri.parse("package:" + packageName));
            
            mActivity.startActivity(intent);
            return true;
        } catch (Exception e) {
            Log.w("Error opening deep link settings: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * Show dialog asking user to enable IITC Mobile as default deep link handler
     */
    public void showDeepLinkPermissionDialog() {
        if (mActivity == null) return;
        
        new AlertDialog.Builder(mActivity)
            .setTitle(R.string.deep_link_permission_dialog_title)
            .setMessage(R.string.deep_link_permission_dialog_message)
            .setPositiveButton(R.string.deep_link_permission_dialog_enable, new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialog, int which) {
                    openDeepLinkSettings();
                }
            })
            .setNegativeButton(R.string.deep_link_permission_dialog_skip, null)
            .show();
    }
}