# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Comment this to unreserved the line number information for
# debugging stack traces.
-keepattributes *Annotation*,SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

-keep class androidx.appcompat.widget.SearchView { *; }

-keepclassmembers class * extends android.webkit.WebChromeClient{
    public void openFileChooser(...);
}

-dontwarn javax.script.ScriptEngine
-dontwarn javax.script.ScriptEngineManager