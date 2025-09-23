package org.exarhteam.iitc_mobile.share;

import android.app.ActionBar;
import android.app.FragmentTransaction;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.preference.PreferenceManager;
import android.view.MenuItem;

import androidx.core.app.NavUtils;
import androidx.core.content.FileProvider;
import androidx.fragment.app.FragmentActivity;
import androidx.viewpager.widget.ViewPager;

import org.exarhteam.iitc_mobile.BuildConfig;
import org.exarhteam.iitc_mobile.Log;
import org.exarhteam.iitc_mobile.R;
import org.exarhteam.iitc_mobile.WindowInsetsHelper;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class ShareActivity extends FragmentActivity implements ActionBar.TabListener {
    private static final String EXTRA_TYPE = "share-type";
    private static final String EXTRA_CONTENT_TYPE = "content-type";
    private static final int REQUEST_START_INTENT = 1;
    private static final String TYPE_FILE = "file";
    private static final String TYPE_PERMALINK = "permalink";
    private static final String TYPE_PORTAL_LINK = "portal_link";
    private static final String TYPE_STRING = "string";
    private static final String TYPE_URL = "url";

    public static Intent forFile(final Context context, final File file, final String type) {
        final Uri uri = Build.VERSION.SDK_INT >= Build.VERSION_CODES.N
                ? FileProvider.getUriForFile(context, BuildConfig.APPLICATION_ID + ".provider", file)
                : Uri.fromFile(file);
        return new Intent(context, ShareActivity.class)
                .putExtra(EXTRA_TYPE, TYPE_FILE)
                .putExtra("uri", uri)
                .putExtra("type", type)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    }

    public static Intent forPosition(final Context context, final double lat, final double lng, final int zoom,
                                     final String title, final boolean isPortal, String guid) {
        return new Intent(context, ShareActivity.class)
                .putExtra(EXTRA_TYPE, isPortal ? TYPE_PORTAL_LINK : TYPE_PERMALINK)
                .putExtra("lat", lat)
                .putExtra("lng", lng)
                .putExtra("zoom", zoom)
                .putExtra("title", title)
                .putExtra("guid", guid)
                .putExtra("isPortal", isPortal);
    }

    public static Intent forUrl(final Context context, String title, final String url) {
        return new Intent(context, ShareActivity.class)
                .putExtra(EXTRA_TYPE, TYPE_URL)
                .putExtra(EXTRA_CONTENT_TYPE, "text/x-uri")
                .putExtra(Intent.EXTRA_TITLE, title)
                .setData(Uri.parse(url));
    }

    public static Intent forString(final Context context, final String str) {
        return new Intent(context, ShareActivity.class)
                .putExtra(EXTRA_TYPE, TYPE_STRING)
                .putExtra("shareString", str);
    }

    private IntentComparator mComparator;
    private FragmentAdapter mFragmentAdapter;
    private IntentGenerator mGenerator;
    private SharedPreferences mSharedPrefs = null;
    private ViewPager mViewPager;

    private void addTab(final List<Intent> intents, final int label, final int icon) {
        final IntentListFragment fragment = new IntentListFragment();
        final Bundle args = new Bundle();
        args.putParcelableArrayList("intents", new ArrayList<>(intents));
        args.putString("title", getString(label));
        args.putInt("icon", icon);
        fragment.setArguments(args);
        mFragmentAdapter.add(fragment);
    }

    private String getIntelUrl(final String ll, final int zoom, final boolean isPortal) {
        String url = "https://intel.ingress.com/?ll=" + ll + "&z=" + zoom;
        if (isPortal) {
            url += "&pll=" + ll;
        }
        return url;
    }

    private void setSelected(final int position) {
        // Activity not fully loaded yet (may occur during tab creation)
        if (mSharedPrefs == null) return;

        mSharedPrefs
                .edit()
                .putInt("pref_share_selected_tab", position)
                .apply();
    }

    @Override
    protected void onActivityResult(final int requestCode, final int resultCode, final Intent data) {
        if (REQUEST_START_INTENT == requestCode) {
            setResult(resultCode, data);
            // parent activity can now clean up
            finish();
            return;
        }

        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onCreate(final Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_share);

        // Setup window insets for edge-to-edge display
        WindowInsetsHelper.setupPreferenceActivityInsets(this);

        mComparator = new IntentComparator(this);
        mGenerator = new IntentGenerator(this);

        mFragmentAdapter = new FragmentAdapter(getSupportFragmentManager());

        mSharedPrefs = PreferenceManager.getDefaultSharedPreferences(this);

        final ActionBar actionBar = getActionBar();
        actionBar.setDisplayHomeAsUpEnabled(true);

        final Intent intent = getIntent();
        final String type = intent.getStringExtra(EXTRA_TYPE);
        // from portallinks/permalinks we build 3 intents (share / geo / vanilla-intel-link)
        if (TYPE_PERMALINK.equals(type) || TYPE_PORTAL_LINK.equals(type)) {
            final String title = intent.getStringExtra("title");
            double lat = intent.getDoubleExtra("lat", 0);
            double lng = intent.getDoubleExtra("lng", 0);
            final String ll = lat + "," + lng;
            final int zoom = intent.getIntExtra("zoom", 0);
            final String guid = intent.getStringExtra("guid");

            final String url = getIntelUrl(ll, zoom, TYPE_PORTAL_LINK.equals(type));
            String primeUrl = null;
            if (guid != null) {
                primeUrl = "https://link.ingress.com/?link=https%3A%2F%2Fintel.ingress.com%2Fportal%2F" + guid + "&apn=com.nianticproject.ingress&isi=576505181&ibi=com.google.ingress&ifl=https%3A%2F%2Fapps.apple.com%2Fapp%2Fingress%2Fid576505181&ofl=https%3A%2F%2Fintel.ingress.com%2Fintel%3Fpll%3D" + lat + "%2C" + lng;
            }

            actionBar.setTitle(title);

            addTab(mGenerator.getShareIntents(title, url, "text/plain"),
                    R.string.tab_share,
                    R.drawable.ic_action_share);
            addTab(mGenerator.getGeoIntents(title, ll, zoom),
                    R.string.tab_map,
                    R.drawable.ic_action_place);
            addTab(mGenerator.getBrowserIntents(title, url),
                    R.string.tab_browser,
                    R.drawable.ic_action_web_site);
            if (primeUrl != null) {
                addTab(mGenerator.getBrowserIntents(title, primeUrl),
                        R.string.tab_prime,
                        R.drawable.ic_ingress_prime);
            }
        } else if (TYPE_STRING.equals(type)) {
            final String title = getString(R.string.app_name);
            final String shareString = intent.getStringExtra("shareString");

            addTab(mGenerator.getShareIntents(title, shareString, "text/plain"), R.string.tab_share, R.drawable.ic_action_share);
        } else if (TYPE_FILE.equals(type)) {
            final Uri uri = intent.getParcelableExtra("uri");
            final String mime = intent.getStringExtra("type");

            addTab(mGenerator.getShareIntents(uri, mime), R.string.tab_share, R.drawable.ic_action_share);
        } else if (TYPE_URL.equals(type)) {
            String title = intent.getStringExtra(Intent.EXTRA_TITLE);
            String string = intent.getData().toString();
            String contentType = intent.getStringExtra(EXTRA_CONTENT_TYPE);
            addTab(mGenerator.getShareIntents(title, string, contentType), R.string.tab_share, R.drawable.ic_action_share);
        } else {
            Log.w("Unknown sharing type: " + type);
            setResult(RESULT_CANCELED);
            finish();
            return;
        }

        mViewPager = (ViewPager) findViewById(R.id.pager);
        mViewPager.setAdapter(mFragmentAdapter);

        mViewPager.setOnPageChangeListener(new ViewPager.SimpleOnPageChangeListener() {
            @Override
            public void onPageSelected(final int position) {
                if (actionBar.getNavigationMode() != ActionBar.NAVIGATION_MODE_STANDARD) {
                    actionBar.setSelectedNavigationItem(position);
                }
                setSelected(position);
            }
        });

        for (int i = 0; i < mFragmentAdapter.getCount(); i++) {
            final IntentListFragment fragment = (IntentListFragment) mFragmentAdapter.getItem(i);

            actionBar.addTab(actionBar
                    .newTab()
                    .setText(fragment.getTitle())
                    .setIcon(fragment.getIcon())
                    .setTabListener(this));
        }

        // read the selected tab from prefs before enabling tab mode
        // setNavigationMode calls our OnPageChangeListener, resetting the pref to 0
        final int selected = mSharedPrefs.getInt("pref_share_selected_tab", 0);

        if (mFragmentAdapter.getCount() > 1) {
            actionBar.setNavigationMode(ActionBar.NAVIGATION_MODE_TABS);
        }

        if (selected < mFragmentAdapter.getCount()) {
            mViewPager.setCurrentItem(selected);
            if (actionBar.getNavigationMode() != ActionBar.NAVIGATION_MODE_STANDARD) {
                actionBar.setSelectedNavigationItem(selected);
            }
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        mComparator.save();
    }

    public IntentComparator getIntentComparator() {
        return mComparator;
    }

    public void launch(final Intent intent) {
        mComparator.trackIntentSelection(intent);
        mGenerator.cleanup(intent);

        // we should wait for the new intent to be finished so the calling activity (IITC_Mobile) can clean up
        startActivityForResult(intent, REQUEST_START_INTENT);
    }

    @Override
    public boolean onOptionsItemSelected(final MenuItem item) {
        switch (item.getItemId()) {
            case android.R.id.home:
                NavUtils.navigateUpFromSameTask(this);
                return true;
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    public void onTabReselected(final ActionBar.Tab tab, final FragmentTransaction fragmentTransaction) {
    }

    @Override
    public void onTabSelected(final ActionBar.Tab tab, final FragmentTransaction fragmentTransaction) {
        final int position = tab.getPosition();
        mViewPager.setCurrentItem(position);
        setSelected(position);
    }

    @Override
    public void onTabUnselected(final ActionBar.Tab tab, final FragmentTransaction fragmentTransaction) {
    }
}
