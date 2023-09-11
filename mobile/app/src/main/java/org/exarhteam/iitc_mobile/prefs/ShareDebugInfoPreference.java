package org.exarhteam.iitc_mobile.prefs;

import android.app.AlertDialog;
import android.content.Context;
import android.os.Build;
import android.preference.Preference;
import android.util.AttributeSet;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import org.exarhteam.iitc_mobile.BuildConfig;
import org.exarhteam.iitc_mobile.R;
import org.exarhteam.iitc_mobile.share.SendToClipboard;
import org.exarhteam.iitc_mobile.share.ShareActivity;

public class ShareDebugInfoPreference extends Preference {
    private String iitcVersion;
    private String buildVersion;
    private String userAgent;

    public ShareDebugInfoPreference(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    @Override
    protected void onClick() {
        super.onClick();

        LayoutInflater layoutInflater = (LayoutInflater) getContext().getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        View dialogView = layoutInflater.inflate(R.layout.debug_info_dialog, null);

        TextView dialogTextView = dialogView.findViewById(R.id.dialogText);

        String dialogText = getDialogText();
        dialogTextView.setText(dialogText);

        AlertDialog dialog = new AlertDialog.Builder(getContext())
                .setTitle(R.string.debug_info_dialog_title)
                .setView(dialogView)
                .create();

        Button shareBtn = dialogView.findViewById(R.id.btnShare);
        shareBtn.setOnClickListener(v -> v.getContext().startActivity(ShareActivity.forString(v.getContext(), dialogText)));

        Button copyBtn = dialogView.findViewById(R.id.btnCopy);
        copyBtn.setOnClickListener(v -> v.getContext().startActivity(SendToClipboard.clipboard(v.getContext(), dialogText)));

        Button okBtn = dialogView.findViewById(R.id.btnOk);
        okBtn.setOnClickListener(v -> dialog.cancel());

        dialog.show();
    }

    private String getDialogText() {
        String manufacturer = Build.MANUFACTURER;
        String model = Build.MODEL;
        int version = Build.VERSION.SDK_INT;
        String versionRelease = Build.VERSION.RELEASE;

        return getContext().getString(R.string.debug_info_dialog_text, manufacturer, model, version, versionRelease, buildVersion, BuildConfig.BUILD_TYPE, iitcVersion, userAgent, getBooleanDescription("pref_fake_user_agent", false), getBooleanDescription("pref_popup", true));
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

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }
}
