package org.exarhteam.iitc_mobile.prefs;

import android.app.AlertDialog;
import android.content.Context;
import android.preference.CheckBoxPreference;
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
        this.setDefaultValue(false);
        this.setPersistent(true);
    }

    protected void onBindView(View view) {
        super.onBindView(view);
        makeMultiline(view);
        setupContextMenu(view);
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
            if (getPluginInfo().isUserPlugin()) {
                if (getPluginInfo().getDownloadURL() != null) {
                    MenuItem copyUrlMenu = menu.add(R.string.menu_share_plugin_url);
                    copyUrlMenu.setOnMenuItemClickListener(item -> {
                        getContext().startActivity(ShareActivity.forUrl(getContext(), getPluginInfo().getName(), getPluginInfo().getDownloadURL()));
                        return true;
                    });
                }
                MenuItem sharePluginMenu = menu.add(R.string.menu_share_plugin_file);
                sharePluginMenu.setOnMenuItemClickListener(item -> {
                    getContext().startActivity(ShareActivity.forFile(getContext(), new File(getPluginInfo().getKey()), "application/json"));
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
            }
        });
        view.setOnClickListener(v -> onClick());
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
