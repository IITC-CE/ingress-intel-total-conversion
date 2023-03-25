package org.exarhteam.iitc_mobile;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import androidx.core.app.NotificationManagerCompat;

public class UpdateCheckerReceiver extends BroadcastReceiver {
    private static final String SHARED_PREFS = "UpdateCheckerPrefs";
    private static final String HIDE_FOREVER = "HideForever";

    @Override
    public void onReceive(Context context, Intent intent) {
        if ("HIDE_FOREVER".equals(intent.getAction())) {
            SharedPreferences sharedPreferences = context.getSharedPreferences(SHARED_PREFS, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = sharedPreferences.edit();
            editor.putBoolean(HIDE_FOREVER, true);
            editor.apply();

            // Cancel the notification
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
            notificationManager.cancel(1);
        }
    }
}