package org.exarhteam.iitc_mobile.prefs;

import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.preference.PreferenceActivity;
import android.text.InputType;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.ListAdapter;
import android.widget.TextView;
import android.widget.Toast;

import org.exarhteam.iitc_mobile.IITC_FileManager;
import org.exarhteam.iitc_mobile.IITC_NotificationHelper;
import org.exarhteam.iitc_mobile.IITC_PluginManager;
import org.exarhteam.iitc_mobile.IITC_StorageManager;
import org.exarhteam.iitc_mobile.Log;
import org.exarhteam.iitc_mobile.R;
import org.exarhteam.iitc_mobile.fragments.PluginsFragment;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Preference activity for managing IITC plugins.
 */
public class PluginPreferenceActivity extends PreferenceActivity {

    private final static int COPY_PLUGIN_REQUEST = 1;
    private static final int PERMISSION_REQUEST_CODE = 3;

    private List<Header> mHeaders;
    // we use a tree map to have a map with alphabetical order
    private static final Map<String, ArrayList<PluginInfo>> sAssetPlugins = new TreeMap<>();
    private static final Map<String, ArrayList<PluginInfo>> sUserPlugins = new TreeMap<>();

    private IITC_FileManager mFileManager;

    @Override
    public void setListAdapter(final ListAdapter adapter) {
        if (adapter == null) {
            super.setListAdapter(null);
        } else {
            super.setListAdapter(new HeaderAdapter(this, mHeaders));
        }
    }

    @Override
    public void onBuildHeaders(final List<Header> target) {
        getActionBar().setDisplayHomeAsUpEnabled(true);

        // notify about external plugins
        final IITC_NotificationHelper nh = new IITC_NotificationHelper(this);
        nh.showNotice(IITC_NotificationHelper.NOTICE_EXTPLUGINS);

        mHeaders = target;

        // Always rebuild plugin data to catch new installations
        setUpPluginPreferenceScreen();
        addHeaders();
    }

    @Override
    protected void onCreate(final Bundle savedInstanceState) {
        // on tablets, select a default fragment BEFORE calling super onCreate
        // otherwise the application will crash, because the first header (the
        // category) does not have a fragment assigned
        if (onIsMultiPane()) {
            getIntent()
                    .putExtra(PreferenceActivity.EXTRA_SHOW_FRAGMENT, PluginsFragment.class.getName());
        }

        mFileManager = new IITC_FileManager(this);

        final Uri uri = getIntent().getData();
        if (uri != null) {
            mFileManager.installPlugin(uri, true);
        }
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onResume() {
        // Call super :
        super.onResume();

        // Reload plugin list in case folder access was granted
        invalidateHeaders();

        // Select the displayed fragment in the headers (when using a tablet) :
        // This should be done by Android, it is a bug fix
        // thx to http://stackoverflow.com/a/16793839
        if (mHeaders != null) {

            final String displayedFragment = getIntent().getStringExtra(EXTRA_SHOW_FRAGMENT);
            if (displayedFragment != null) {
                for (final Header header : mHeaders) {
                    if (displayedFragment.equals(header.fragment)) {
                        switchToHeader(header);
                        break;
                    }
                }
            }
        }

        // Check for pending plugin installation
        String pendingUri = getSharedPreferences("IITC_Mobile", MODE_PRIVATE)
                .getString("pending_plugin_install", null);
        if (pendingUri != null) {
            getSharedPreferences("IITC_Mobile", MODE_PRIVATE).edit()
                    .remove("pending_plugin_install").apply();
            mFileManager.installPlugin(Uri.parse(pendingUri), true);
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.plugins, menu);
        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(final MenuItem item) {
        switch (item.getItemId()) {
            case android.R.id.home: // exit settings when home button (iitc icon) is pressed
                onBackPressed();
                return true;
            case R.id.menu_plugins_add:
                if (checkStorageAccess()) {
                    showPluginFileChooser();
                }
                return true;
            case R.id.menu_plugins_add_url:
                if (checkStorageAccess()) {
                    showPluginUrlDialog();
                }
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    private boolean checkStorageAccess() {
        IITC_StorageManager storageManager = mFileManager.getStorageManager();
        if (!storageManager.hasPluginsFolderAccess()) {
            new AlertDialog.Builder(this)
                    .setTitle(R.string.plugins_folder_access_title)
                    .setMessage(R.string.plugins_folder_access_message)
                    .setPositiveButton(android.R.string.ok, (dialog, which) -> {
                        storageManager.requestFolderAccess(this);
                    })
                    .setNegativeButton(android.R.string.cancel, null)
                    .show();
            return false;
        }
        return true;
    }

    private void showPluginFileChooser() {
        final Intent target = new Intent(Intent.ACTION_GET_CONTENT);
        target.setType("*/*");
        String[] mimeTypes = {"application/javascript", "text/plain", "text/javascript", "application/octet-stream"};
        target.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
        target.addCategory(Intent.CATEGORY_OPENABLE);

        try {
            startActivityForResult(Intent.createChooser(target, getString(R.string.file_browser_choose_file)), COPY_PLUGIN_REQUEST);
        } catch (final ActivityNotFoundException e) {
            Toast.makeText(this, getString(R.string.file_browser_is_required), Toast.LENGTH_LONG).show();
        }
    }

    private void showPluginUrlDialog() {
        final AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(R.string.menu_plugins_add_url);

        final EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        builder.setView(input);

        builder.setPositiveButton(android.R.string.ok, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                final String url = input.getText().toString();
                final Uri uri = Uri.parse(url);
                if (uri != null) {
                    mFileManager.installPlugin(uri, true);
                }
            }
        });
        builder.setNegativeButton(android.R.string.cancel, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                dialog.cancel();
            }
        });

        builder.show();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String permissions[], int[] grantResults) {
        switch (requestCode) {
            case PERMISSION_REQUEST_CODE:
                if (grantResults.length == 0 || grantResults[0] != PackageManager.PERMISSION_GRANTED) {
                    Toast.makeText(this, getString(R.string.plugins_permission_denied),
                            Toast.LENGTH_LONG).show();
                } else {
                    Toast.makeText(this, getString(R.string.plugins_permission_granted),
                            Toast.LENGTH_LONG).show();
                }
                break;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        switch (requestCode) {
            case COPY_PLUGIN_REQUEST:
                if (data != null && data.getData() != null) {
                    mFileManager.installPlugin(data.getData(), true);
                    return;
                }
                break;
            case IITC_StorageManager.REQUEST_FOLDER_ACCESS:
                if (resultCode == RESULT_OK && data != null) {
                    Uri treeUri = data.getData();
                    if (treeUri != null) {
                        mFileManager.getStorageManager().handleFolderSelection(treeUri);
                        invalidateHeaders();
                        Toast.makeText(this, R.string.plugins_permission_granted, Toast.LENGTH_SHORT).show();
                    }
                }
                break;
            default:
                super.onActivityResult(requestCode, resultCode, data);
                break;

        }
    }

    @Override
    protected boolean isValidFragment(String fragmentName) {
        return PluginsFragment.class.getName().equals(fragmentName);
    }

    // called by Plugins Fragment
    public static ArrayList<PluginInfo> getPluginInfo(final String key, final boolean userPlugin) {
        if (userPlugin) return sUserPlugins.get(key);

        return sAssetPlugins.get(key);
    }

    void setUpPluginPreferenceScreen() {
        // Clear previous data
        sAssetPlugins.clear();
        sUserPlugins.clear();

        // Load all plugins through PluginManager
        boolean devMode = getSharedPreferences("IITC_Mobile", MODE_PRIVATE)
                .getBoolean("pref_dev_checkbox", false);

        IITC_PluginManager.getInstance().loadAllPlugins(
                mFileManager.getStorageManager(),
                getAssets(),
                devMode
        );

        // Get plugins grouped by category from PluginManager
        Map<String, List<IITC_PluginManager.Plugin>> pluginsByCategory =
                IITC_PluginManager.getInstance().getPluginsByCategory();

        // Convert PluginManager data to legacy format for UI
        for (Map.Entry<String, List<IITC_PluginManager.Plugin>> entry : pluginsByCategory.entrySet()) {
            String category = entry.getKey();

            for (IITC_PluginManager.Plugin plugin : entry.getValue()) {
                boolean isUserPlugin = plugin.isUser();

                // Get or create category list
                Map<String, ArrayList<PluginInfo>> targetMap = isUserPlugin ? sUserPlugins : sAssetPlugins;
                if (!targetMap.containsKey(category)) {
                    targetMap.put(category, new ArrayList<>());
                }

                // Convert Plugin to PluginInfo with proper key
                PluginInfo pluginInfo = new PluginInfo(plugin.info);
                pluginInfo.setKey(plugin.filename);
                pluginInfo.setUserPlugin(isUserPlugin);

                targetMap.get(category).add(pluginInfo);
            }
        }

        Log.d("Plugin preference screen setup complete. Asset categories: " +
                sAssetPlugins.size() + ", User categories: " + sUserPlugins.size());
    }

    void addHeaders() {
        if (sUserPlugins.size() > 0) {
            final Header category = new Header();
            category.title = getString(R.string.plugins_user_plugins);
            mHeaders.add(category);
            for (final Map.Entry<String, ArrayList<PluginInfo>> entry : sUserPlugins.entrySet()) {
                if (entry.getValue() != null && !entry.getValue().isEmpty()) {
                    addHeader(entry.getKey(), true);
                }
            }
        }
        if (sAssetPlugins.size() > 0) {
            final Header category = new Header();
            category.title = getString(R.string.plugins_official_plugins);
            mHeaders.add(category);
            for (final Map.Entry<String, ArrayList<PluginInfo>> entry : sAssetPlugins.entrySet()) {
                addHeader(entry.getKey(), false);
            }
        }
    }

    private void addHeader(final String title, final boolean userPlugin) {
        final Bundle bundle = new Bundle();
        bundle.putString("category", title);
        bundle.putBoolean("userPlugin", userPlugin);
        final Header newHeader = new Header();
        newHeader.title = title;
        newHeader.fragmentArguments = bundle;
        newHeader.fragment = "org.exarhteam.iitc_mobile.fragments.PluginsFragment";
        mHeaders.add(newHeader);
    }

    /*
     * This code is only for header categories. Thx to Android that we haven't this by default and
     * thx to Stackoverflow for this post: http://stackoverflow.com/a/18720212
     */
    private static class HeaderAdapter extends ArrayAdapter<Header> {
        static final int HEADER_TYPE_CATEGORY = 0;
        static final int HEADER_TYPE_NORMAL = 1;
        private static final int HEADER_TYPE_COUNT = HEADER_TYPE_NORMAL + 1;

        private static class HeaderViewHolder {
            TextView title;
            TextView summary;
        }

        private final LayoutInflater mInflater;

        static int getHeaderType(final Header header) {
            if (header.fragment == null && header.intent == null) {
                return HEADER_TYPE_CATEGORY;
            } else {
                return HEADER_TYPE_NORMAL;
            }
        }

        @Override
        public int getItemViewType(final int position) {
            final Header header = getItem(position);
            return getHeaderType(header);
        }

        @Override
        public boolean areAllItemsEnabled() {
            return false; // because of categories
        }

        @Override
        public boolean isEnabled(final int position) {
            return getItemViewType(position) != HEADER_TYPE_CATEGORY;
        }

        @Override
        public int getViewTypeCount() {
            return HEADER_TYPE_COUNT;
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }

        public HeaderAdapter(final Context context, final List<Header> objects) {
            super(context, 0, objects);

            mInflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);

        }

        @Override
        public View getView(final int position, final View convertView, final ViewGroup parent) {
            HeaderViewHolder holder;
            final Header header = getItem(position);
            final int headerType = getHeaderType(header);
            View view = null;

            if (convertView == null) {
                holder = new HeaderViewHolder();
                switch (headerType) {
                    case HEADER_TYPE_CATEGORY:
                        view = new TextView(getContext(), null, android.R.attr.listSeparatorTextViewStyle);
                        holder.title = (TextView) view;
                        break;

                    case HEADER_TYPE_NORMAL:
                        view = mInflater.inflate(R.layout.preference_header_item, parent, false);
                        holder.title = (TextView) view.findViewById(R.id.plug_pref_title);
                        holder.summary = (TextView) view.findViewById(R.id.plug_pref_summary);
                        break;
                }
                view.setTag(holder);
            } else {
                view = convertView;
                holder = (HeaderViewHolder) view.getTag();
            }

            // All view fields must be updated every time, because the view may be recycled
            switch (headerType) {
                case HEADER_TYPE_CATEGORY:
                    holder.title.setText(header.getTitle(getContext().getResources()));
                    break;
                case HEADER_TYPE_NORMAL:
                    holder.title.setText(header.getTitle(getContext().getResources()));
                    final CharSequence summary = header.getSummary(getContext().getResources());
                    if (summary != null && summary.length() > 0) {
                        holder.summary.setVisibility(View.VISIBLE);
                        holder.summary.setText(summary);
                    } else {
                        holder.summary.setVisibility(View.GONE);
                    }
                    break;
            }

            return view;
        }
    }
}
