# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ============================================================
# Capacitor / WebView / JavaScript Interface Rules
# ============================================================

# Keep Capacitor plugin classes and JavaScript interfaces
-keep class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }
-keep class com.aksraag.app.** { *; }

# Keep JavaScript interfaces for WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep JavaScript interface classes used by Capacitor
-keepclassmembers class com.getcapacitor.PluginHandle {
    public *;
}
-keepclassmembers class com.getcapacitor.Plugin {
    public *;
}
-keepclassmembers class com.getcapacitor.Bridge {
    public *;
}

# Keep WebViewClient and WebChromeClient implementations
-keep class * extends android.webkit.WebViewClient { *; }
-keep class * extends android.webkit.WebChromeClient { *; }

# ============================================================
# Network / HTTP / OkHttp / Retrofit / Axios (via Capacitor)
# ============================================================

# Keep OkHttp classes (used by Capacitor HTTP plugin)
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**

# Keep Okio classes
-keep class okio.** { *; }
-dontwarn okio.**

# ============================================================
# Gson / JSON Serialization (if used by plugins)
# ============================================================

-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# ============================================================
# AndroidX / Jetpack / Support Library
# ============================================================

-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# ============================================================
# Preserve annotations for reflection
# ============================================================

-keepattributes *Annotation*
-keepattributes Signature
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# ============================================================
# Keep line numbers for debugging stack traces
# ============================================================

-keepattributes SourceFile,LineNumberTable

# ============================================================
# Don't warn about common issues
# ============================================================

-dontwarn java.lang.ClassValue
-dontwarn sun.misc.Unsafe
-dontwarn com.google.android.gms.**
-dontwarn org.apache.cordova.**
-dontwarn com.getcapacitor.**

# ============================================================
# Capacitor Plugins - keep specific plugin classes
# ============================================================

# Browser plugin
-keep class com.getcapacitor.community.browser.** { *; }

# File system / storage plugins
-keep class com.getcapacitor.community.filesystem.** { *; }

# Network / HTTP plugin
-keep class com.getcapacitor.community.http.** { *; }

# Splash screen
-keep class com.getcapacitor.splashscreen.** { *; }

# Status bar
-keep class com.getcapacitor.statusbar.** { *; }

# Keyboard
-keep class com.getcapacitor.keyboard.** { *; }

# App launcher / deep links
-keep class com.getcapacitor.app.** { *; }

# Haptics
-keep class com.getcapacitor.haptics.** { *; }

# Device info
-keep class com.getcapacitor.device.** { *; }

# Clipboard
-keep class com.getcapacitor.clipboard.** { *; }

# Share
-keep class com.getcapacitor.share.** { *; }

# ============================================================
# React / Webpack / Metro (if any native modules)
# ============================================================

# Keep any React Native bridge classes if present
-keep class com.facebook.react.** { *; }
-dontwarn com.facebook.react.**

# ============================================================
# Optimization settings
# ============================================================

# Allow optimization but keep debugging info
-optimizationpasses 5
-allowaccessmodification
-mergeinterfacesaggressively

# ============================================================
# Remove logging in release builds (optional)
# ============================================================

-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
    public static int w(...);
}
