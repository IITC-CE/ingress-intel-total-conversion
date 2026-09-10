package org.exarhteam.iitc_mobile;

import android.content.SharedPreferences;
import android.graphics.drawable.Animatable;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.os.Handler;
import android.preference.PreferenceManager;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.AdapterView.OnItemClickListener;
import android.widget.ArrayAdapter;
import android.widget.ListView;
import android.widget.TextView;

import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.ActionBarDrawerToggle;
import androidx.appcompat.content.res.AppCompatResources;
import androidx.appcompat.widget.Toolbar;
import androidx.drawerlayout.widget.DrawerLayout;

import java.util.HashMap;
import java.util.Map;

public class IITC_NavigationHelper extends ActionBarDrawerToggle implements OnItemClickListener {

    // Show/hide the up arrow on the very left
    // getActionBar().setDisplayHomeAsUpEnabled(enabled);

    // Show/hide the activity icon/logo
    // getActionBar().setDisplayShowHomeEnabled(enabled);

    // Show/hide the activity title
    // getActionBar().setDisplayShowTitleEnabled(enabled);

    // Makes the icon/title clickable
    // getActionBar().setHomeButtonEnabled(enabled);

    private final IITC_Mobile mIitc;
    private final ActionBar mActionBar;
    private final SharedPreferences mPrefs;
    private final NavigationAdapter mNavigationAdapter;
    private final DrawerLayout mDrawerLayout;
    private final ListView mDrawerLeft;
    private final View mDrawerRight;
    private final IITC_NotificationHelper mNotificationHelper;
    private final Toolbar mToolbar;

    private boolean mDexRunning = false;
    private boolean mDexDesktopMode = true;
    private boolean mDesktopMode = false;
    private Pane mPane = Pane.MAP;
    private String mHighlighter = null;
    // null = none shown yet, true = hamburger shown, false = arrow shown
    private Boolean mIconIsMenu = null;
    private float mLastDrawerSlideOffset = 0f;

    public IITC_NavigationHelper(final IITC_Mobile iitc, final ActionBar bar, Toolbar toolbar) {
        super(iitc, (DrawerLayout) iitc.findViewById(R.id.drawer_layout),
                toolbar, R.string.drawer_open, R.string.drawer_close);

        mIitc = iitc;
        mActionBar = bar;
        mToolbar = toolbar;
        mDrawerLeft = (ListView) iitc.findViewById(R.id.left_drawer);
        mDrawerRight = iitc.findViewById(R.id.right_drawer);
        mDrawerLayout = (DrawerLayout) iitc.findViewById(R.id.drawer_layout);
        mDexRunning = iitc.isDexRunning();

        mPrefs = PreferenceManager.getDefaultSharedPreferences(iitc);

        mActionBar.setDisplayShowHomeEnabled(true); // show icon

        mNavigationAdapter = new NavigationAdapter();
        mDrawerLeft.setAdapter(mNavigationAdapter);
        mDrawerLeft.setOnItemClickListener(this);
        mDrawerLeft.setItemChecked(0, true);
        mDrawerLayout.setDrawerListener(this);
        mNotificationHelper = new IITC_NotificationHelper(mIitc);

        onPrefChanged(); // also calls updateActionBar()

        mToolbar.setNavigationOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (mPane == Pane.MAP) {
                    if (mDrawerLayout.isDrawerOpen(mDrawerLeft)) {
                        mDrawerLayout.closeDrawer(mDrawerLeft);
                    } else {
                        mDrawerLayout.openDrawer(mDrawerLeft);
                    }
                } else {
                    mIitc.switchToPane(Pane.MAP);
                }
            }
        });
    }

    private void setNavigationIconAnimated(final int resId) {
        final Drawable avd = AppCompatResources.getDrawable(mIitc, resId);
        mToolbar.setNavigationIcon(avd);
        if (avd instanceof Animatable) {
            ((Animatable) avd).start();
        }
    }

    private void updateViews() {
        updateViews(false);
    }

    private void updateViews(final boolean animate) {
        final int position = mNavigationAdapter.getPosition(mPane);
        if (position >= 0 && position < mNavigationAdapter.getCount()) {
            mDrawerLeft.setItemChecked(position, true);
        } else {
            mDrawerLeft.setItemChecked(mDrawerLeft.getCheckedItemPosition(), false);
        }

        // Never use setDrawerIndicatorEnabled(true) - DrawerArrowDrawable uses hardware layers
        // that cause BLASTBufferQueue sync issues with the WebView compositor on Android 12+
        setDrawerIndicatorEnabled(false);

        if (isDesktopActive()) {
            mActionBar.setDisplayHomeAsUpEnabled(false); // Hide "up" indicator
            mActionBar.setHomeButtonEnabled(false); // Make icon unclickable
            mActionBar.setTitle(mIitc.getString(R.string.app_name));
            mDrawerLayout.setDrawerLockMode(DrawerLayout.LOCK_MODE_LOCKED_CLOSED, mDrawerLeft);
            mDrawerLayout.setDrawerLockMode(DrawerLayout.LOCK_MODE_UNLOCKED, mDrawerRight);
            mToolbar.setNavigationIcon(null);
            mIconIsMenu = null;
        } else {
            if (mIitc.isLoading()) {
                mActionBar.setDisplayHomeAsUpEnabled(false); // Hide "up" indicator
                mActionBar.setHomeButtonEnabled(false);
                mDrawerLayout.setDrawerLockMode(DrawerLayout.LOCK_MODE_LOCKED_CLOSED);
                mToolbar.setNavigationIcon(null);
                mIconIsMenu = null;
            } else {
                mDrawerLayout.setDrawerLockMode(DrawerLayout.LOCK_MODE_UNLOCKED);
                mActionBar.setDisplayHomeAsUpEnabled(false);
                mActionBar.setHomeButtonEnabled(false);

                final boolean wantMenu = mPane == Pane.MAP && !mDrawerLayout.isDrawerOpen(mDrawerLeft);
                if (animate && mIconIsMenu != null && mIconIsMenu != wantMenu) {
                    setNavigationIconAnimated(wantMenu ? R.drawable.ic_arrow_anim : R.drawable.ic_menu_anim);
                } else {
                    mToolbar.setNavigationIcon(AppCompatResources.getDrawable(mIitc, wantMenu ? R.drawable.ic_menu_anim : R.drawable.ic_arrow_anim));
                }
                mIconIsMenu = wantMenu;
            }

            if (mDrawerLayout.isDrawerOpen(mDrawerLeft) || mPane == Pane.MAP) {
                mActionBar.setTitle(mIitc.getString(R.string.app_name));
            } else {
                mActionBar.setTitle(mPane.label);
            }
        }

        final boolean mapVisible = isDesktopActive() || mPane == Pane.MAP;
        if ("No Highlights".equals(mHighlighter) || isDrawerOpened() || mIitc.isLoading() || !mapVisible) {
            mActionBar.setSubtitle(null);
        } else {
            mActionBar.setSubtitle(mHighlighter);
        }
    }

    /**
     * Drawable names that plugins outside this repository still pass to addPane, each mapped to the
     * icon that stands in for it.
     */
    private static final Map<String, String> LEGACY_ICONS = new HashMap<String, String>() {{
        put("ic_action_about", "info");
        put("ic_action_add_to_queue", "add_circle");
        put("ic_action_cc_bcc", "mail");
        put("ic_action_copy", "content_copy");
        put("ic_action_data_usage", "bar_chart");
        put("ic_action_error", "warning");
        put("ic_action_error_red", "error");
        put("ic_action_full_screen", "fullscreen");
        put("ic_action_group", "group");
        put("ic_action_location_follow", "my_location");
        put("ic_action_location_found", "location_on");
        put("ic_action_new", "add");
        put("ic_action_new_event", "event");
        put("ic_action_paste", "content_paste");
        put("ic_action_place", "place");
        put("ic_action_refresh", "sync");
        put("ic_action_return_from_full_screen", "fullscreen_exit");
        put("ic_action_save", "save");
        put("ic_action_search", "search");
        put("ic_action_share", "share");
        put("ic_action_star", "star");
        put("ic_action_view_as_list", "list");
        put("ic_action_view_as_list_compact", "view_list");
        put("ic_action_warning", "warning");
        put("ic_action_warning_yellow", "warning");
        put("ic_action_web_site", "public");
        put("ic_drawer", "menu");
        put("ic_iitcm", "map");
        put("ic_missions", "flag");
    }};

    public void addPane(final String name, final String label, final String icon) {
        final String ligature = LEGACY_ICONS.containsKey(icon) ? LEGACY_ICONS.get(icon) : icon;
        mNavigationAdapter.add(Pane.withFontIcon(name, label, ligature));
    }

    public void closeDrawers() {
        mDrawerLayout.closeDrawers();
    }

    public Pane getPane(final String id) {
        for (int i = 0; i < mNavigationAdapter.getCount(); i++) {
            final Pane pane = mNavigationAdapter.getItem(i);
            if (pane.name.equals(id))
                return pane;
        }
        throw new IllegalArgumentException("Unknown pane: " + id);
    }

    public void hideActionBar() {
        mActionBar.hide();
    }

    public boolean isDrawerOpened() {
        return mDrawerLayout.isDrawerOpen(mDrawerLeft) || mDrawerLayout.isDrawerOpen(mDrawerRight);
    }

    public boolean isDesktopActive() {
        return (mDesktopMode || (mDexRunning && mDexDesktopMode));
    }

    @Override
    public void onDrawerClosed(final View drawerView) {
        super.onDrawerClosed(drawerView);
        if (drawerView == mDrawerLeft) {
            mLastDrawerSlideOffset = 0f;
        }

        // delay invalidating to prevent flickering in case another drawer is opened
        (new Handler()).postDelayed(new Runnable() {
            @Override
            public void run() {
                mIitc.invalidateOptionsMenu();
                updateViews();
            }
        }, 200);
    }

    @Override
    public void onDrawerOpened(final View drawerView) {
        super.onDrawerOpened(drawerView);
        if (drawerView == mDrawerLeft) {
            mLastDrawerSlideOffset = 1f;
        }
        mIitc.invalidateOptionsMenu();
        updateViews();
        mDrawerLayout.closeDrawer(drawerView.equals(mDrawerLeft) ? mDrawerRight : mDrawerLeft);
    }

    @Override
    public void onDrawerSlide(final View drawerView, final float slideOffset) {
        super.onDrawerSlide(drawerView, slideOffset);
        if (drawerView != mDrawerLeft) return;
        if (slideOffset == mLastDrawerSlideOffset) return;
        final boolean opening = slideOffset > mLastDrawerSlideOffset;
        mLastDrawerSlideOffset = slideOffset;
        if (opening && Boolean.TRUE.equals(mIconIsMenu)) {
            setNavigationIconAnimated(R.drawable.ic_menu_anim);
            mIconIsMenu = false;
        } else if (!opening && mPane == Pane.MAP && Boolean.FALSE.equals(mIconIsMenu)) {
            setNavigationIconAnimated(R.drawable.ic_arrow_anim);
            mIconIsMenu = true;
        }
    }

    @Override
    public void onItemClick(final AdapterView<?> parent, final View view, final int position, final long id) {
        final Pane item = mNavigationAdapter.getItem(position);
        mIitc.switchToPane(item);

        if (item == Pane.INFO) {
            mNotificationHelper.showNotice(IITC_NotificationHelper.NOTICE_INFO);
        }

        mDrawerLayout.closeDrawer(mDrawerLeft);
    }

    public void onLoadingStateChanged() {
        updateViews();
    }

    @Override
    public boolean onOptionsItemSelected(final MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            mDrawerLayout.closeDrawer(mDrawerRight);
        }

        return super.onOptionsItemSelected(item);
    }

    public void onPostCreate(final Bundle savedInstanceState) {
        // Sync the toggle state after onRestoreInstanceState has occurred.
        syncState();
    }

    // Samsung DeX mode has been changed
    public void onDexModeChanged(boolean activity) {
        mDexRunning = activity;
        updateViews();
    }

    public void onPrefChanged() {
        mDexDesktopMode = mPrefs.getBoolean( "pref_dex_desktop", true);
        mDesktopMode = mPrefs.getBoolean("pref_force_desktop", false);
        updateViews();
    }

    public void openRightDrawer() {
        if (mDrawerLayout.getDrawerLockMode(mDrawerRight) == DrawerLayout.LOCK_MODE_UNLOCKED) {
            mDrawerLayout.openDrawer(mDrawerRight);
        }
    }

    public void reset() {
        mPane = Pane.MAP;
        mNavigationAdapter.reset();
        updateViews();
    }

    public void setDebugMode(final boolean enabled) {
        mNavigationAdapter.reset();
    }

    public void setHighlighter(final String name) {
        mHighlighter = name;
        updateViews();
    }

    public void showActionBar() {
        mActionBar.show();
    }

    public void switchTo(final Pane pane) {
        mPane = pane;

        if (pane.equals(Pane.INFO)) mNotificationHelper.showNotice(IITC_NotificationHelper.NOTICE_SHARING);
        updateViews(true);
    }

    private class NavigationAdapter extends ArrayAdapter<Pane> {
        public NavigationAdapter() {
            super(mIitc, R.layout.list_item_selectable);

            reset();
        }

        @Override
        public View getView(final int position, final View convertView, final ViewGroup parent) {
            final TextView view = (TextView) super.getView(position, convertView, parent);
            final Pane item = getItem(position);

            if (item.label_resource != 0) {
                item.label = mIitc.getString(item.label_resource);
            }

            view.setText(item.label);

            final Drawable icon = new IITC_IconDrawable(mIitc, item.iconLigature, view.getCurrentTextColor());
            view.setCompoundDrawablesWithIntrinsicBounds(icon, null, null, null);

            return view;
        }

        public void reset() {
            clear();

            add(Pane.INFO);
            add(Pane.ALL);
            add(Pane.FACTION);
            add(Pane.ALERTS);
        }
    }

    public static class Pane {
        public static final Pane ALL = Pane.withFontIcon("all", R.string.pane_all, "campaign");
        public static final Pane FACTION = Pane.withFontIcon("faction", R.string.pane_faction, "group");
        public static final Pane ALERTS = Pane.withFontIcon("alerts", R.string.pane_alerts, "notifications");
        public static final Pane INFO = Pane.withFontIcon("info", R.string.pane_info, "info");
        public static final Pane MAP = Pane.withFontIcon("map", R.string.pane_map, "map");

        private final String iconLigature;
        public String label;
        public int label_resource;
        public String name;

        private Pane(final String name, final String label, final int label_resource, final String iconLigature) {
            this.name = name;
            this.label = label;
            this.label_resource = label_resource;
            this.iconLigature = iconLigature;
        }

        public static Pane withFontIcon(final String name, final String label, final String ligature) {
            return new Pane(name, label, 0, ligature);
        }

        public static Pane withFontIcon(final String name, final int label_resource, final String ligature) {
            return new Pane(name, null, label_resource, ligature);
        }

        @Override
        public boolean equals(final Object o) {
            if (o == null) return false;
            if (o.getClass() != getClass()) return false;

            final Pane pane = (Pane) o;
            return name.equals(pane.name);
        }

        @Override
        public int hashCode() {
            return name.hashCode();
        }
    }
}
