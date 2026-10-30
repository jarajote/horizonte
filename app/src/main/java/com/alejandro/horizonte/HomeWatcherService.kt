package com.alejandro.horizonte

import android.accessibilityservice.AccessibilityService
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.SystemClock
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent

/**
 * Hace que el botón Home abra Horizonte sin necesidad de ordenador ni ADB.
 *
 * Android TV no deja elegir otro launcher desde los ajustes, así que este servicio
 * de accesibilidad vigila cuándo aparece la pantalla de inicio de TCL/Google
 * y en ese momento abre Horizonte encima. Es el mismo truco que usa Projectivy.
 *
 * Se activa en: Ajustes → Sistema → Accesibilidad → Horizonte.
 */
class HomeWatcherService : AccessibilityService() {

    private var stockLaunchers: Set<String> = emptySet()
    private var lastJump = 0L

    override fun onServiceConnected() {
        super.onServiceConnected()
        stockLaunchers = stockLaunchers(this)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg == packageName) return
        if (stockLaunchers.isEmpty()) stockLaunchers = stockLaunchers(this)
        if (pkg !in stockLaunchers) return

        // Ventanas del sistema dentro del launcher (diálogos, paneles): no las tocamos
        val cls = event.className?.toString() ?: ""
        if (cls.startsWith("android.")) return

        val now = SystemClock.elapsedRealtime()
        if (now < allowStockUntil || now - lastJump < 1500) return
        lastJump = now

        val i = Intent(this, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        try { startActivity(i) } catch (_: Exception) {}
    }

    override fun onInterrupt() {}

    companion object {
        /** Si abres a propósito el launcher original desde el cajón, lo dejamos en paz un rato. */
        @Volatile
        var allowStockUntil = 0L

        private val KNOWN = setOf(
            "com.google.android.tvlauncher",
            "com.google.android.apps.tv.launcherx",
            "com.google.android.leanbacklauncher"
        )
        private val NEVER = setOf("com.android.settings", "com.android.tv.settings", "com.android.provision")

        fun stockLaunchers(ctx: Context): Set<String> {
            val out = HashSet<String>(KNOWN)
            try {
                val q = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
                @Suppress("DEPRECATION")
                for (ri in ctx.packageManager.queryIntentActivities(q, PackageManager.MATCH_ALL)) {
                    out.add(ri.activityInfo.packageName)
                }
            } catch (_: Exception) {}
            out.remove(ctx.packageName)
            out.removeAll(NEVER)
            return out
        }

        fun isEnabled(ctx: Context): Boolean {
            val me = ComponentName(ctx, HomeWatcherService::class.java)
            val list = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
            return list.split(':').any { ComponentName.unflattenFromString(it) == me }
        }

        fun isDefaultHome(ctx: Context): Boolean {
            val q = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            @Suppress("DEPRECATION")
            val ri = ctx.packageManager.resolveActivity(q, PackageManager.MATCH_DEFAULT_ONLY)
            return ri?.activityInfo?.packageName == ctx.packageName
        }
    }
}
