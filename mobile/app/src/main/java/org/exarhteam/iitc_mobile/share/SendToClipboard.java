package org.exarhteam.iitc_mobile.share;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Toast;

import org.exarhteam.iitc_mobile.R;

public class SendToClipboard extends Activity {

    public static Intent clipboard(Context context, String text) {
        Intent intent = new Intent();
        intent.setComponent(new ComponentName(context, SendToClipboard.class));
        intent.putExtra(Intent.EXTRA_TEXT, text);
        return intent;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String text = getIntent().getStringExtra(Intent.EXTRA_TEXT);
        if (text == null) {
            text = getIntent().getData().toString();
        }

        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);

        ClipData clip = ClipData.newPlainText("Copied Text ", text);
        clipboard.setPrimaryClip(clip);

        Toast.makeText(this, R.string.msg_copied, Toast.LENGTH_SHORT).show();

        finish();
        setResult(RESULT_OK);
    }
}
