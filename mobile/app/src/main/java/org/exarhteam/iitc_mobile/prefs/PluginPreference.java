package org.exarhteam.iitc_mobile.prefs;

import android.app.AlertDialog;
import android.content.Context;
import android.preference.CheckBoxPreference;
import android.view.ContextMenu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import org.exarhteam.iitc_mobile.R;
import org.exarhteam.iitc_mobile.share.ShareActivity;

import java.io.File;

// multiline checkbox preference
public class PluginPreference extends CheckBoxPreference {

    private Runnable onConfirmDelete;
    private PluginInfo pluginInfo;

    public PluginPreference(Context context) {
        super(context);
    }

    protected void onBindView(View view) {
        super.onBindView(view);
        makeMultiline(view);
        if (getPluginInfo().isUserPlugin()) {
            setupContextMenu(view);
        }
    }

    protected void makeMultiline(View view) {
        if (view instanceof ViewGroup) {
            ViewGroup grp = (ViewGroup) view;
            for (int index = 0; index < grp.getChildCount(); index++) {
                makeMultiline(grp.getChildAt(index));
            }
        } else if (view instanceof TextView) {
            TextView t = (TextView) view;
            t.setSingleLine(false);
            t.setEllipsize(null);
        }
    }

    private void setupContextMenu(View view) {
        view.setOnCreateContextMenuListener((menu, v, menuInfo) -> {
            if (getPluginInfo().getDownloadURL() != null) {
                addShareUrlMenuItem(menu, R.string.menu_share_plugin_download_url, getPluginInfo().getDownloadURL());
            }
            if ((getPluginInfo().getDownloadURL() == null && getPluginInfo().getUpdateURL() != null)
                    || getPluginInfo().getUpdateURL() != null && !getPluginInfo().getDownloadURL().equals(getPluginInfo().getUpdateURL())
            ) {
                addShareUrlMenuItem(menu, R.string.menu_share_plugin_update_url, getPluginInfo().getUpdateURL());
            }
            MenuItem sharePluginMenu = menu.add(R.string.menu_share_plugin_file);
            sharePluginMenu.setOnMenuItemClickListener(item -> {
                getContext().startActivity(ShareActivity.forFile(getContext(), new File(getPluginInfo().getKey()), "application/javascript"));
                return true;
            });
            MenuItem deleteItem = menu.add(R.string.menu_delete_plugin);
            deleteItem.setOnMenuItemClickListener(item -> {
                Context context = getContext();
                new AlertDialog.Builder(context)
                        .setMessage(context.getString(R.string.delete_plugin_question, getTitle()))
                        .setPositiveButton(R.string.button_confirm_description, (dialog, which) -> onConfirmDelete())
                        .setNegativeButton(R.string.button_cancel_description, (dialog, which) -> {
                        })
                        .show();
                return true;
            });
        });
        view.setOnClickListener(v -> onClick());
    }

    private void addShareUrlMenuItem(ContextMenu menu, int menuItemTextId, String url) {
        MenuItem menuItem = menu.add(menuItemTextId);
        menuItem.setOnMenuItemClickListener(item -> {
            getContext().startActivity(ShareActivity.forUrl(getContext(), getPluginInfo().getName(), url));
            return true;
        });
    }

    private void onConfirmDelete() {
        // disable the option to prevent plugin from loading
        setChecked(false);
        if (this.onConfirmDelete != null) {
            this.onConfirmDelete.run();
        }
    }

    public void setOnConfirmDelete(Runnable onConfirmDelete) {
        this.onConfirmDelete = onConfirmDelete;
    }

    public void setPluginInfo(PluginInfo pluginInfo) {
        this.pluginInfo = pluginInfo;
        this.setKey(pluginInfo.getKey());
        this.setTitle(pluginInfo.getName());
        this.setSummary(pluginInfo.getDescription());
    }

    public PluginInfo getPluginInfo() {
        return pluginInfo;
    }
}
