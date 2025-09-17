package org.exarhteam.iitc_mobile;

import android.app.Activity;
import android.os.Build;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.graphics.Insets;

public class WindowInsetsHelper {

    /**
     * Setup window insets for edge-to-edge display on preference activities
     *
     * @param activity The activity to setup window insets for
     */
    public static void setupPreferenceActivityInsets(Activity activity) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            return;
        }
        
        android.view.View rootView = activity.findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(rootView, (v, windowInsets) -> {
            Insets systemBarsInsets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());

            // Apply only side and top insets - let system handle bottom normally
            v.setPadding(
                systemBarsInsets.left,   // Handle side notches/bars
                systemBarsInsets.top,    // Handle status bar
                systemBarsInsets.right,  // Handle side notches/bars
                0                        // Don't override bottom - standard behavior
            );

            // Configure ListView when fragment is loaded
            v.post(() -> {
                android.view.View listView = v.findViewById(android.R.id.list);
                if (listView instanceof android.widget.ListView) {
                    android.widget.ListView lv = (android.widget.ListView) listView;
                    // Allow content to be visible behind system bars
                    lv.setClipToPadding(false);
                    
                    // Also apply padding to ListView itself to ensure proper spacing
                    lv.setPadding(
                        lv.getPaddingLeft(),
                        lv.getPaddingTop(),
                        lv.getPaddingRight(),
                        systemBarsInsets.bottom
                    );
                }
            });

            return windowInsets;
        });

        ViewCompat.requestApplyInsets(rootView);
    }

    /**
     * Setup window insets for main activity with DrawerLayout
     *
     * @param activity The main IITC activity
     */
    public static void setupMainActivityInsets(IITC_Mobile activity) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            return;
        }
        
        android.view.View drawerLayout = activity.findViewById(R.id.drawer_layout);
        drawerLayout.post(() -> {
            ViewCompat.setOnApplyWindowInsetsListener(drawerLayout, (v, windowInsets) -> {
                Insets systemBarsInsets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
                Insets displayCutoutInsets = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout());

                // Combine system bars and display cutout insets to handle both system buttons and camera
                int leftInset = Math.max(systemBarsInsets.left, displayCutoutInsets.left);
                int rightInset = Math.max(systemBarsInsets.right, displayCutoutInsets.right);
                int topInset = Math.max(systemBarsInsets.top, displayCutoutInsets.top);
                int bottomInset = Math.max(systemBarsInsets.bottom, displayCutoutInsets.bottom);

                applyMainActivityInsets(activity, topInset, leftInset, rightInset, bottomInset);
                return windowInsets;
            });

            ViewCompat.requestApplyInsets(drawerLayout);
        });
    }

    /**
     * Setup window insets for preference dialog screens
     *
     * @param dialog The preference dialog to setup insets for
     */
    public static void setupDialogInsets(android.app.Dialog dialog) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            return;
        }

        if (dialog == null) {
            return;
        }

        android.view.View dialogContentView = dialog.findViewById(android.R.id.content);
        if (dialogContentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(dialogContentView, (v, windowInsets) -> {
                Insets systemBarsInsets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());

                // Apply insets to avoid overlapping with system bars
                v.setPadding(
                    systemBarsInsets.left,   // Handle side notches/bars in landscape
                    systemBarsInsets.top,    // Handle status bar
                    systemBarsInsets.right,  // Handle side notches/bars in landscape
                    systemBarsInsets.bottom  // Handle navigation bar
                );

                return windowInsets;
            });
        }
    }

    /**
     * Apply window insets to all views in the main activity
     */
    private static void applyMainActivityInsets(IITC_Mobile activity, int statusBarHeight,
                                               int systemBarLeft, int systemBarRight, int systemBarBottom) {
        // Handle toolbar - add top padding for status bar height
        androidx.appcompat.widget.Toolbar toolbar = activity.findViewById(R.id.iitc_toolbar);
        if (toolbar != null) {
            toolbar.setPadding(
                systemBarLeft,
                statusBarHeight,
                systemBarRight,
                toolbar.getPaddingBottom()
            );
        }

        // Handle debug panel - add side and bottom padding for system bars
        android.view.View debugPanel = activity.findViewById(R.id.viewDebug);
        if (debugPanel != null) {
            debugPanel.setPadding(
                systemBarLeft,
                debugPanel.getPaddingTop(),
                systemBarRight,
                systemBarBottom
            );
        }

        android.view.View debugRecyclerView = activity.findViewById(R.id.lvDebug);
        if (debugRecyclerView != null) {
            debugRecyclerView.setPadding(
                systemBarLeft,
                debugRecyclerView.getPaddingTop(),
                systemBarRight,
                debugRecyclerView.getPaddingBottom()
            );
        }

        // Handle floating action button in debug layout
        android.view.View debugScrollButton = activity.findViewById(R.id.debugScrollButton);
        if (debugScrollButton != null) {
            android.view.ViewGroup.MarginLayoutParams fabParams =
                (android.view.ViewGroup.MarginLayoutParams) debugScrollButton.getLayoutParams();
            
            // Get original margins from XML (16dp)
            int originalMargin = (int) android.util.TypedValue.applyDimension(
                android.util.TypedValue.COMPLEX_UNIT_DIP, 16, 
                activity.getResources().getDisplayMetrics());
            
            fabParams.setMargins(
                originalMargin + systemBarLeft,
                originalMargin,
                originalMargin + systemBarRight,
                originalMargin
            );
            debugScrollButton.setLayoutParams(fabParams);
        }

        // Handle navigation drawers - add top padding to start below toolbar
        int actionBarSize = getActionBarSize(activity);
        int totalTopPadding = statusBarHeight + actionBarSize;

        android.view.View leftDrawer = activity.findViewById(R.id.left_drawer);
        if (leftDrawer != null) {
            android.view.ViewGroup.MarginLayoutParams marginParams =
                    (android.view.ViewGroup.MarginLayoutParams) leftDrawer.getLayoutParams();
            marginParams.topMargin = 0;
            
            // Get original width in pixels
            int originalWidthPx = (int) android.util.TypedValue.applyDimension(
                android.util.TypedValue.COMPLEX_UNIT_DIP, 180, 
                activity.getResources().getDisplayMetrics());
            
            // Adjust width to compensate for left padding
            marginParams.width = originalWidthPx + systemBarLeft;
            leftDrawer.setLayoutParams(marginParams);

            leftDrawer.setPadding(
                systemBarLeft,
                totalTopPadding, // Status bar + toolbar height
                leftDrawer.getPaddingRight(),
                systemBarBottom
            );
        }

        android.view.View rightDrawer = activity.findViewById(R.id.right_drawer);
        if (rightDrawer != null) {
            android.view.ViewGroup.MarginLayoutParams marginParams =
                    (android.view.ViewGroup.MarginLayoutParams) rightDrawer.getLayoutParams();
            marginParams.topMargin = 0;
            
            // Get original width in pixels
            int originalWidthPx = (int) android.util.TypedValue.applyDimension(
                android.util.TypedValue.COMPLEX_UNIT_DIP, 260, 
                activity.getResources().getDisplayMetrics());
            
            // Adjust width to compensate for right padding
            marginParams.width = originalWidthPx + systemBarRight;
            rightDrawer.setLayoutParams(marginParams);

            rightDrawer.setPadding(
                rightDrawer.getPaddingLeft(),
                totalTopPadding, // Status bar + toolbar height
                systemBarRight,
                systemBarBottom
            );
        }

        // Update WebView safe area insets for CSS
        org.exarhteam.iitc_mobile.IITC_WebView webView = activity.getWebView();
        if (webView != null) {
            webView.setSafeAreaInsets(statusBarHeight, systemBarRight, systemBarBottom, systemBarLeft);
        }
    }

    /**
     * Get the action bar size from the current theme
     */
    private static int getActionBarSize(Activity activity) {
        int actionBarSize = 0;
        android.util.TypedValue tv = new android.util.TypedValue();
        if (activity.getTheme().resolveAttribute(android.R.attr.actionBarSize, tv, true)) {
            actionBarSize = android.util.TypedValue.complexToDimensionPixelSize(tv.data,
                           activity.getResources().getDisplayMetrics());
        }
        return actionBarSize;
    }
}
