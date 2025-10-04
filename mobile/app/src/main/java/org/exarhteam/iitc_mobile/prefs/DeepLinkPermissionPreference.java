package org.exarhteam.iitc_mobile.prefs;

import android.app.Activity;
import android.content.Context;
import android.preference.Preference;
import android.preference.PreferenceCategory;
import android.preference.PreferenceManager;
import android.util.AttributeSet;

import org.exarhteam.iitc_mobile.IITC_DeepLinkHandler;

/**
 * Smart preference that manages deep link permissions and controls its own visibility
 */
public class DeepLinkPermissionPreference extends Preference {
    
    private IITC_DeepLinkHandler mDeepLinkHandler;
    private PreferenceCategory mParentCategory;
    private boolean mIsAttached = false;
    
    public DeepLinkPermissionPreference(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }
    
    public DeepLinkPermissionPreference(Context context, AttributeSet attrs, int defStyle) {
        super(context, attrs, defStyle);
        init();
    }
    
    private void init() {
        // Initialize deep link handler when we have context
        Context context = getContext();
        if (context instanceof Activity) {
            mDeepLinkHandler = new IITC_DeepLinkHandler((Activity) context);
        }
    }
    
    @Override
    protected void onAttachedToHierarchy(PreferenceManager preferenceManager) {
        super.onAttachedToHierarchy(preferenceManager);
        mIsAttached = true;
        
        // Find parent category
        if (getParent() instanceof PreferenceCategory) {
            mParentCategory = (PreferenceCategory) getParent();
        }
        
        // Update visibility after attachment
        updateVisibility();
    }
    
    @Override
    protected void onAttachedToActivity() {
        super.onAttachedToActivity();
        
        // Reinitialize handler with activity context
        Context context = getContext();
        if (context instanceof Activity) {
            mDeepLinkHandler = new IITC_DeepLinkHandler((Activity) context);
        }
        
        // Check visibility when activity becomes available
        updateVisibility();
    }
    
    /**
     * Call this method when returning from system settings to update visibility
     */
    public void onActivityResumed() {
        updateVisibility();
    }
    
    @Override
    protected void onClick() {
        super.onClick();
        
        if (mDeepLinkHandler != null) {
            mDeepLinkHandler.showDeepLinkPermissionDialog();
        }
    }
    
    /**
     * Update preference visibility based on current deep link handler status
     */
    private void updateVisibility() {
        if (!mIsAttached || mDeepLinkHandler == null) {
            return;
        }
        
        // Try to find parent category if we don't have it yet
        if (mParentCategory == null && getParent() instanceof PreferenceCategory) {
            mParentCategory = (PreferenceCategory) getParent();
        }
        
        if (mParentCategory == null) {
            return;
        }
        
        Boolean isDefaultHandler = mDeepLinkHandler.isDefaultDeepLinkHandler();
        
        if (isDefaultHandler != null && isDefaultHandler) {
            // Hide preference if app is already default handler
            mParentCategory.removePreference(this);
        } else {
            // Show preference if app is not default handler
            if (mParentCategory.findPreference(getKey()) == null) {
                mParentCategory.addPreference(this);
            }
        }
    }
}