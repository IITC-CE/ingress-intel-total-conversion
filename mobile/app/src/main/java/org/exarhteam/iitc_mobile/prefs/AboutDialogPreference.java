package org.exarhteam.iitc_mobile.prefs;

import android.content.Context;
import android.preference.Preference;
import android.text.Html;
import android.text.method.LinkMovementMethod;
import android.util.AttributeSet;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import org.apache.commons.text.StringSubstitutor;

import org.exarhteam.iitc_mobile.R;

import java.util.HashMap;
import java.util.Map;

public class AboutDialogPreference extends Preference {
    private String mBuildVersion = "";
    private String mIitcVersion = "";

    public AboutDialogPreference(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    @Override
    public View getView(View convertView, ViewGroup parent) {
        /*
         * I found no better way for clickable links in a TextView then using Html.fromHtml(). Linkify
         * is just broken and does not understand html href tags, so let's tag the @string/about_msg
         * with CDATA and use Html.fromHtml() for clickable hrefs with tags.
         */
        final TextView tv = new TextView(getContext());

        Map<String, String> valuesMap = new HashMap<>();
        valuesMap.put("build_version", mBuildVersion);
        valuesMap.put("iitc_version", mIitcVersion);
        valuesMap.put("cradle_link", getContext().getText(R.string.cradle_link).toString());
        valuesMap.put("fkloft_link", getContext().getText(R.string.fkloft_link).toString());
        valuesMap.put("giuseppe_lucido_link", getContext().getText(R.string.giuseppe_lucido_link).toString());
        valuesMap.put("tg_iitc_news_link", getContext().getText(R.string.tg_iitc_news_link).toString());
        valuesMap.put("tg_iitc_group_link", getContext().getText(R.string.tg_iitc_group_link).toString());
        valuesMap.put("reddit_iitc_link", getContext().getText(R.string.reddit_iitc_link).toString());
        valuesMap.put("bugtracker_link", getContext().getText(R.string.bugtracker_link).toString());
        valuesMap.put("website_url", getContext().getText(R.string.website_url).toString());
        valuesMap.put("github_iitc_url", getContext().getText(R.string.github_iitc_url).toString());
        valuesMap.put("ISC_license_text", getContext().getText(R.string.ISC_license_text).toString());

        String templateString = getContext().getText(R.string.pref_about_text).toString();
        String text = new StringSubstitutor(valuesMap).replace(templateString);

        tv.setText(Html.fromHtml(text));
        tv.setMovementMethod(LinkMovementMethod.getInstance());

        return tv;
    }

    public void setVersions(String iitcVersion, String buildVersion) {
        mIitcVersion = iitcVersion;
        mBuildVersion = buildVersion;
    }
}
