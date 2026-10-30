package com.alejandro.horizonte

import android.annotation.SuppressLint
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.media.tv.TvContract
import android.media.tv.TvInputInfo
import android.media.tv.TvInputManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Base64
import android.view.KeyEvent
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File

/**
 * Horizonte: launcher para Android TV.
 * La interfaz y la escena animada viven en assets/web; esta actividad las muestra
 * a pantalla completa y les da acceso a las apps, iconos y entradas HDMI de la tele.
 */
class MainActivity : Activity() {

    private lateinit var web: WebView
    private val main = Handler(Looper.getMainLooper())
    private var tvInputs: TvInputManager? = null
    @Volatile private var webUpdated = false
    @Volatile private var isResumed = false

    private val packagesChanged = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, i: Intent?) { js("window.hzResume && hzResume()") }
    }
    private val inputCallback = object : TvInputManager.TvInputCallback() {
        override fun onInputAdded(inputId: String) { notifyInputs() }
        override fun onInputRemoved(inputId: String) { notifyInputs() }
        override fun onInputUpdated(inputId: String) { notifyInputs() }
        override fun onInputStateChanged(inputId: String, state: Int) { notifyInputs() }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this).apply {
            setBackgroundColor(0xFF141A2E.toInt())
            isFocusable = true
            isFocusableInTouchMode = true
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.mediaPlaybackRequiresUserGesture = true
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
            addJavascriptInterface(Bridge(), "Android")
        }
        setContentView(web)
        web.loadUrl(Updater.startUrl(this))
        web.requestFocus()

        tvInputs = getSystemService(Context.TV_INPUT_SERVICE) as? TvInputManager
        tvInputs?.registerCallback(inputCallback, main)

        val f = IntentFilter().apply {
            addAction(Intent.ACTION_PACKAGE_ADDED)
            addAction(Intent.ACTION_PACKAGE_REMOVED)
            addAction(Intent.ACTION_PACKAGE_CHANGED)
            addDataScheme("package")
        }
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(packagesChanged, f, Context.RECEIVER_EXPORTED)
        else registerReceiver(packagesChanged, f)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) immersive()
    }

    private fun immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            window.insetsController?.let {
                it.hide(WindowInsets.Type.systemBars())
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)
        }
    }

    override fun onResume() {
        super.onResume()
        isResumed = true
        web.onResume()
        web.resumeTimers()
        if (!reloadIfUpdated()) js("window.hzResume && hzResume()")
        checkUpdates(false)
    }

    /** Si se ha descargado un diseño nuevo, lo cargamos ahora (al volver a la home). */
    private fun reloadIfUpdated(): Boolean {
        if (!webUpdated) return false
        webUpdated = false
        web.loadUrl(Updater.startUrl(this))
        return true
    }

    private fun checkUpdates(force: Boolean) {
        Updater.check(this, force,
            onWebReady = {
                webUpdated = true
                // Si la home está a la vista, aplicamos el diseño nuevo ya mismo
                main.post { if (isResumed) reloadIfUpdated() }
            },
            onApk = { tag -> js("window.hzUpdateAvailable && hzUpdateAvailable('v$tag')") })
    }

    override fun onPause() {
        isResumed = false
        // Pausamos la animación mientras se ve otra app para no gastar CPU
        web.onPause()
        super.onPause()
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        // Pulsar Home estando ya en el launcher: volvemos al dock (o cargamos el diseño nuevo)
        if (!reloadIfUpdated()) js("window.hzBack && hzBack()")
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_UP) {
            when (event.keyCode) {
                KeyEvent.KEYCODE_MENU -> { js("window.hzMenu && hzMenu()"); return true }
                KeyEvent.KEYCODE_BACK -> { js("window.hzBack && hzBack()"); return true }
            }
        }
        if (event.keyCode == KeyEvent.KEYCODE_BACK || event.keyCode == KeyEvent.KEYCODE_MENU) return true
        return super.dispatchKeyEvent(event)
    }

    @Deprecated("Un launcher nunca se cierra con atrás")
    override fun onBackPressed() { /* nada */ }

    override fun onDestroy() {
        try { unregisterReceiver(packagesChanged) } catch (_: Exception) {}
        tvInputs?.unregisterCallback(inputCallback)
        web.destroy()
        super.onDestroy()
    }

    private fun js(code: String) {
        main.post { if (::web.isInitialized) web.evaluateJavascript(code, null) }
    }

    private fun notifyInputs() {
        js("window.hzInputsChanged && hzInputsChanged()")
    }

    // ------------------------------------------------------------------
    // Puente que usa ui.js (window.Android)
    // ------------------------------------------------------------------
    inner class Bridge {

        /** Apps que se pueden abrir desde la tele (lanzador de TV o normal). */
        @JavascriptInterface
        fun apps(): String {
            val pm = packageManager
            val seen = LinkedHashMap<String, String>()
            for (cat in listOf(Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER)) {
                val q = Intent(Intent.ACTION_MAIN).addCategory(cat)
                @Suppress("DEPRECATION")
                for (ri in pm.queryIntentActivities(q, 0)) {
                    val pkg = ri.activityInfo.packageName
                    if (pkg == packageName || seen.containsKey(pkg)) continue
                    seen[pkg] = ri.loadLabel(pm).toString()
                }
            }
            val arr = JSONArray()
            seen.forEach { (pkg, label) -> arr.put(JSONObject().put("pkg", pkg).put("label", label)) }
            return arr.toString()
        }

        /** Icono de una app como data URL (PNG). Si la app tiene banner de TV y no icono, usa el banner. */
        @JavascriptInterface
        fun icon(pkg: String): String = try {
            val d = packageManager.getApplicationIcon(pkg)
            "data:image/png;base64," + toPng(d, 192, 192)
        } catch (e: Exception) { "" }

        /**
         * Icono personalizado para un hueco del dock (kodi, youtube, futbol, ps5).
         * Copia un PNG a /sdcard/Android/data/com.alejandro.horizonte/files/icons/<hueco>.png
         */
        @JavascriptInterface
        fun customIcon(slot: String): String {
            val dir = getExternalFilesDir("icons") ?: return ""
            for (ext in listOf("png", "jpg", "webp")) {
                val f = File(dir, "$slot.$ext")
                if (f.exists()) {
                    val mime = if (ext == "jpg") "jpeg" else ext
                    return "data:image/$mime;base64," + Base64.encodeToString(f.readBytes(), Base64.NO_WRAP)
                }
            }
            return ""
        }

        @JavascriptInterface
        fun launch(pkg: String) {
            main.post {
                val pm = packageManager
                val i = pm.getLeanbackLaunchIntentForPackage(pkg) ?: pm.getLaunchIntentForPackage(pkg)
                if (i == null) {
                    toast("No encuentro esa app")
                } else {
                    if (pkg in HomeWatcherService.stockLaunchers(this@MainActivity)) {
                        HomeWatcherService.allowStockUntil = android.os.SystemClock.elapsedRealtime() + 10 * 60 * 1000L
                    }
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
                    try { startActivity(i) } catch (e: Exception) { toast("No se ha podido abrir") }
                }
            }
        }

        /**
         * Entradas HDMI. Si un aparato se anuncia por HDMI-CEC (p. ej. «PlayStation 5»)
         * aparece como entrada hija con su nombre en "cec", que es lo que usa el dock para encontrar la PS5.
         */
        @JavascriptInterface
        fun hdmiInputs(): String {
            val arr = JSONArray()
            val mgr = tvInputs ?: return arr.toString()
            val list = try { mgr.tvInputList } catch (e: Exception) { emptyList<TvInputInfo>() }
            val byId = list.associateBy { it.id }
            for (info in list) {
                if (info.type != TvInputInfo.TYPE_HDMI) continue
                val label = try { info.loadLabel(this@MainActivity).toString() } catch (e: Exception) { "HDMI" }
                val o = JSONObject().put("id", info.id).put("label", label)
                val parent = info.parentId?.let { byId[it] }
                if (parent != null) {
                    // entrada CEC: la etiqueta es el nombre del aparato, la del padre es «HDMI n»
                    o.put("cec", label)
                    o.put("label", try { parent.loadLabel(this@MainActivity).toString() } catch (e: Exception) { "HDMI" })
                }
                try {
                    val custom = info.loadCustomLabel(this@MainActivity)
                    if (!custom.isNullOrBlank()) o.put("cec", custom.toString())
                } catch (_: Exception) {}
                arr.put(o)
            }
            return arr.toString()
        }

        @JavascriptInterface
        fun openInput(id: String) {
            main.post {
                val uri = TvContract.buildChannelUriForPassthroughInput(id)
                val tries = listOf(
                    Intent(Intent.ACTION_VIEW, uri),
                    Intent(Intent.ACTION_VIEW, uri).setPackage("com.google.android.tv")
                )
                var ok = false
                for (i in tries) {
                    if (ok) break
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    try { startActivity(i); ok = true } catch (_: Exception) {}
                }
                if (!ok) toast("Tu tele no deja abrir esa entrada desde aquí")
            }
        }

        @JavascriptInterface
        fun installUpdate() {
            main.post { Updater.installApk(this@MainActivity) { msg -> main.post { toast(msg) } } }
        }

        /** Buscar novedades ahora mismo (diseño y app). */
        @JavascriptInterface
        fun checkNow() { main.post { checkUpdates(true) } }

        @JavascriptInterface
        fun appVersion(): String = Updater.nativeVersion(this@MainActivity).toString()

        /** true si el botón Home ya abre Horizonte (por ADB o por el servicio de accesibilidad). */
        @JavascriptInterface
        fun homeOk(): Boolean =
            HomeWatcherService.isEnabled(this@MainActivity) || HomeWatcherService.isDefaultHome(this@MainActivity)

        @JavascriptInterface
        fun openHomeSetup() {
            main.post {
                val tries = listOf(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS), Intent(Settings.ACTION_SETTINGS))
                var ok = false
                for (i in tries) {
                    if (ok) break
                    try { startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); ok = true } catch (_: Exception) {}
                }
                if (!ok) toast("Abre Ajustes → Sistema → Accesibilidad")
            }
        }

        @JavascriptInterface
        fun openSettings() {
            main.post {
                try { startActivity(Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
                catch (e: Exception) { toast("No se han podido abrir los ajustes") }
            }
        }
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()

    private fun toPng(d: Drawable, w: Int, h: Int): String {
        val bmp = if (d is BitmapDrawable && d.bitmap != null) {
            Bitmap.createScaledBitmap(d.bitmap, w, h, true)
        } else {
            Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).also {
                val c = Canvas(it); d.setBounds(0, 0, w, h); d.draw(c)
            }
        }
        val out = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }
}
