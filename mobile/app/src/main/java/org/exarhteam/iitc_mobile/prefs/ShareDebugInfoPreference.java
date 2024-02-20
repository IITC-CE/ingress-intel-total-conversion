package org.exarhteam.iitc_mobile.prefs;

import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.preference.Preference;
import android.preference.PreferenceManager;
import android.text.Html;
import android.util.AttributeSet;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import org.exarhteam.iitc_mobile.BuildConfig;
import org.exarhteam.iitc_mobile.IITC_FileManager;
import org.exarhteam.iitc_mobile.R;
import org.exarhteam.iitc_mobile.share.SendToClipboard;
import org.exarhteam.iitc_mobile.share.ShareActivity;

public class ShareDebugInfoPreference extends Preference {
    private String iitcVersion;
    private String buildVersion;
    private String originalUserAgent;
    private String userAgent;

    public ShareDebugInfoPreference(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    @Override
    protected void onClick() {
        super.onClick();

        LayoutInflater layoutInflater = (LayoutInflater) getContext().getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        View dialogView = layoutInflater.inflate(R.layout.debug_info_dialog, null);

        dialogView.<TextView>findViewById(R.id.debug_info_dialog_text).setText(Html.fromHtml(createDialogText()));

        AlertDialog dialog = new AlertDialog.Builder(getContext())
                .setTitle(R.string.debug_info_dialog_title)
                .setView(dialogView)
                .create();

        Button shareBtn = dialogView.findViewById(R.id.btnShare);
        shareBtn.setOnClickListener(v -> v.getContext().startActivity(ShareActivity.forString(v.getContext(), getDialogText(dialogView))));

        Button copyBtn = dialogView.findViewById(R.id.btnCopy);
        copyBtn.setOnClickListener(v -> v.getContext().startActivity(SendToClipboard.clipboard(v.getContext(), getDialogText(dialogView))));

        Button okBtn = dialogView.findViewById(R.id.btnOk);
        okBtn.setOnClickListener(v -> dialog.cancel());

        dialog.show();
    }

    private String createDialogText() {
        String manufacturer = Build.MANUFACTURER;
        String model = Build.MODEL;
        int version = Build.VERSION.SDK_INT;
        String versionRelease = Build.VERSION.RELEASE;

        return getContext().getString(R.string.debug_info_dialog_text, manufacturer, model, version, versionRelease, buildVersion, BuildConfig.BUILD_TYPE, iitcVersion, originalUserAgent, userAgent, getBooleanDescription("pref_fake_user_agent", false), getUserPluginCount());
    }

    private String getDialogText(View dialogView) {
        return dialogView.<TextView>findViewById(R.id.debug_info_dialog_text).getText().toString();
    }

    private int getUserPluginCount() {
        int count = 0;
        SharedPreferences preferences = PreferenceManager.getDefaultSharedPreferences(getContext());
        for (String s : preferences.getAll().keySet()) {
            if (s.startsWith(IITC_FileManager.USER_PLUGINS_PATH) && preferences.getBoolean(s, false)) {
                count++;
            }
        }
        return count;
    }

    private String getBooleanDescription(String prefPopup, boolean defaultValue) {
        boolean value = getSharedPreferences().getBoolean(prefPopup, defaultValue);
        if (value) {
            return getContext().getString(R.string.pref_enabled);
        }
        return getContext().getString(R.string.pref_disabled);
    }

    public void setVersions(String iitcVersion, String buildVersion) {
        this.iitcVersion = iitcVersion;
        this.buildVersion = buildVersion;
    }

    public void setUserAgents(String originalUserAgent, String userAgent) {
        this.originalUserAgent = originalUserAgent;
        this.userAgent = userAgent;
    }
}
