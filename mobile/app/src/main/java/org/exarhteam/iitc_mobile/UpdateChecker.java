package org.exarhteam.iitc_mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Resources;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import java.io.IOException;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public class UpdateChecker {
    private final Context context;
    private final String buildType;
    private final int currentVersionCode;
    private static final String SHARED_PREFS = "UpdateCheckerPrefs";
    private static final String HIDE_FOREVER = "HideForever";

    public UpdateChecker(Context context, String buildType, int currentVersionCode) {
        this.context = context;
        this.buildType = buildType;
        this.currentVersionCode = currentVersionCode;
    }

    public void checkForUpdates() {
        if (!this.buildType.equals("beta") && !this.buildType.equals("release")) {
            return;
        }

        SharedPreferences sharedPreferences = context.getSharedPreferences(SHARED_PREFS, Context.MODE_PRIVATE);
        boolean hideForever = sharedPreferences.getBoolean(HIDE_FOREVER, false);

        if (!hideForever) {
            new Thread(() -> {
                try {
                    OkHttpClient client = new OkHttpClient();
                    Request request = new Request.Builder()
                            .url("https://iitc.app/build/" + buildType + "/version_fdroid.txt")
                            .build();
                    try (Response response = client.newCall(request).execute()) {
                        if (response.isSuccessful()) {
                            String responseBody = response.body().string();
                            String remoteVersionName = extractVersionName(responseBody);
                            int remoteVersionCode = extractVersionCode(responseBody);

                            if (remoteVersionCode > currentVersionCode) {
                                showUpdateNotification(remoteVersionName);
                            }
                        }
                    }
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }).start();
        }
    }

    private int extractVersionCode(String responseBody) {
        String[] lines = responseBody.split("\n");
        for (String line : lines) {
            if (line.startsWith("versionCode=")) {
                return Integer.parseInt(line.substring("versionCode=".length()));
            }
        }
        return -1;
    }

    private String extractVersionName(String responseBody) {
        String[] lines = responseBody.split("\n");
        for (String line : lines) {
            if (line.startsWith("versionName=")) {
                return line.substring("versionName=".length());
            }
        }
        return null;
    }

    private void showUpdateNotification(String remoteVersionName) {
        String channelId = "update_notification_channel";
        String downloadUrl = "https://iitc.app/build/" + buildType + "/IITC_Mobile-" + buildType + ".apk";

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId, this.context.getString(R.string.update_notifications_channel_name), NotificationManager.IMPORTANCE_HIGH);
            notificationManager.createNotificationChannel(channel);
        }

        Intent downloadIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl));
        PendingIntent downloadPendingIntent = PendingIntent.getActivity(context, 0, downloadIntent, 0);

        String notificationTitle = this.context.getString(R.string.update_notifications_title);
        String notificationText = String.format(this.context.getString(R.string.update_notifications_text), remoteVersionName);
        String notificationActionHideForever = this.context.getString(R.string.update_notifications_action_hide_forever);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_iitcm)
                .setContentTitle(notificationTitle)
                .setContentText(notificationText)
                .setContentIntent(downloadPendingIntent)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);
        // Add "Hide Forever" action
        Intent hideForeverIntent = new Intent(context, UpdateCheckerReceiver.class);
        hideForeverIntent.setAction("HIDE_FOREVER");
        PendingIntent hideForeverPendingIntent = PendingIntent.getBroadcast(context, 0, hideForeverIntent, PendingIntent.FLAG_UPDATE_CURRENT);
        builder.addAction(R.drawable.ic_action_warning, notificationActionHideForever, hideForeverPendingIntent);

        Notification notification = builder.build();
        notificationManager.notify(1, notification);
    }
}
