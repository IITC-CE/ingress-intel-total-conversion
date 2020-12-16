package org.exarhteam.iitc_mobile;

import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.webkit.ConsoleMessage;
import android.webkit.GeolocationPermissions;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.annotation.RequiresApi;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

import static android.webkit.WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE;
import static android.webkit.WebChromeClient.FileChooserParams.parseResult;

/**
 * Created by cradle on 12/21/13.
 */
public class IITC_WebChromeClient extends WebChromeClient {

    private final IITC_Mobile mIitc;

    IITC_WebChromeClient(final IITC_Mobile iitc) {
        mIitc = iitc;
    }

    /**
     * our WebChromeClient should share geolocation with the iitc script.
     * allow access by default
     */
    @Override
    public void onGeolocationPermissionsShowPrompt(final String origin, final GeolocationPermissions.Callback callback) {
        callback.invoke(origin, true, false);
    }

    /**
     * display progress bar in activity
     */
    @Override
    public void onProgressChanged(final WebView view, final int newProgress) {
        super.onProgressChanged(view, newProgress);

        // maximum for newProgress is 100
        // maximum for setProgress is 10,000
        mIitc.setProgress(newProgress * 100);
    }

    /**
     * remove splash screen if any JS error occurs
     */
    @Override
    public boolean onConsoleMessage(final ConsoleMessage message) {
        if (message.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
            mIitc.setLoadingState(false);
        }

        if (Log.log(message))
            return true; // message was handled

        return super.onConsoleMessage(message);
    }

    /**
     * show file chooser for WebView on Android >= 16
     */
    public void openFileChooser(ValueCallback<Uri> uploadFile, String acceptType, String capture) {
        Log.d("Opening file chooser");
        final Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        try {
            mIitc.startActivityForResult(intent, new FileRequestHandlerBelowLollipop(uploadFile));
        } catch (final ActivityNotFoundException e) {
            Toast.makeText(mIitc, mIitc.getString(R.string.file_browser_is_required), Toast.LENGTH_LONG).show();
        }
    }

    private class FileRequestHandlerBelowLollipop implements IITC_Mobile.ResponseHandler {
        FileRequestHandlerBelowLollipop(ValueCallback<Uri> filePathCallback) {
            this.filePathCallback = filePathCallback;
        }

        ValueCallback<Uri> filePathCallback;

        @Override
        public void onActivityResult(final int resultCode, final Intent data) {
            mIitc.deleteResponseHandler(this); // to enable garbage collection

            final Uri uri = data.getData();
            if (uri != null) {
                this.filePathCallback.onReceiveValue(uri);
            }
        }
    }

    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private String[] convertToMimeTypes(String[] acceptTypes) {
        final Set<String> results = new HashSet<>();
        final MimeTypeMap mtm = MimeTypeMap.getSingleton();
        for (final String acceptType : acceptTypes) {
            if (acceptType == null) {
                continue;
            }
            String convertedType = null;
            if (acceptType.contains("/")) {
                convertedType = acceptType;
            } else if (acceptType.startsWith(".") && mtm.hasExtension(acceptType.substring(1))) {
                convertedType = mtm.getMimeTypeFromExtension(acceptType.substring(1));
            }
            if (convertedType == null || convertedType.equals("*/*")) {
                return new String[0];
            }
            results.add(Intent.normalizeMimeType(convertedType));
        }
        return results.toArray(new String[0]);
    }

    /**
     * show file chooser for WebView on Android >= 21
     */
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    @Override
    public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
        Log.d("Opening file chooser");
        final Intent intent = fileChooserParams.createIntent();
        if (fileChooserParams.getMode() == MODE_OPEN_MULTIPLE) {
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        }
        final String[] mimeTypes = convertToMimeTypes(fileChooserParams.getAcceptTypes());
        intent.setType(mimeTypes.length == 1 ? mimeTypes[0] : "*/*");
        if (mimeTypes.length > 1) {
            intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
        }
        final FileRequestHandler handler = new FileRequestHandler(filePathCallback);
        try {

            mIitc.startActivityForResult(intent, handler);
        } catch (final ActivityNotFoundException e) {
            Toast.makeText(mIitc, mIitc.getString(R.string.file_browser_is_required), Toast.LENGTH_LONG).show();
            handler.cancel();
            return false;
        }
        return true;
    }

    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private class FileRequestHandler implements IITC_Mobile.ResponseHandler {
        FileRequestHandler(ValueCallback<Uri[]> filePathCallback) {
            this.filePathCallback = filePathCallback;
        }

        public void cancel() {
            this.filePathCallback = null;
        }

        ValueCallback<Uri[]> filePathCallback;

        @Override
        public void onActivityResult(final int resultCode, final Intent data) {
            mIitc.deleteResponseHandler(this); // to enable garbage collection
            Uri[] uris = null;
            if (data.getData() != null) {
                uris = parseResult(resultCode, data);
            } else if (data.getClipData() != null) {
                final ClipData clipData = data.getClipData();
                final ArrayList<Uri> uriList = new ArrayList<>();
                for (int i = 0; i < clipData.getItemCount(); i++) {
                    final Uri uri = clipData.getItemAt(i).getUri();
                    if (uri != null) {
                        uriList.add(uri);
                    }
                }
                uris = uriList.toArray(new Uri[]{});
            }
            if (uris != null && filePathCallback != null) {
                filePathCallback.onReceiveValue(uris);
            }
        }
    }

    @Override
    public boolean onJsAlert(final WebView view, final String url, final String message, final JsResult result) {
        return new IITC_JsDialogHelper(IITC_JsDialogHelper.ALERT, view, url, message, null, result).shouldInterrupt();
    }

    @Override
    public boolean onJsBeforeUnload(final WebView view, final String url, final String message, final JsResult result) {
        return new IITC_JsDialogHelper(IITC_JsDialogHelper.UNLOAD, view, url, message, null, result).shouldInterrupt();
    }

    @Override
    public boolean onJsConfirm(final WebView view, final String url, final String message, final JsResult result) {
        return new IITC_JsDialogHelper(IITC_JsDialogHelper.CONFIRM, view, url, message, null, result).shouldInterrupt();
    }

    @Override
    public boolean onJsPrompt(final WebView view, final String url, final String message, final String defaultValue, final JsPromptResult result) {
        return new IITC_JsDialogHelper(IITC_JsDialogHelper.PROMPT, view, url, message, defaultValue, result)
                .shouldInterrupt();
    }
}
