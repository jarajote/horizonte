package com.alejandro.horizonte

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import android.widget.Toast
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Actualizaciones desde GitHub (repositorio jarajote/horizonte).
 *
 * 1) Diseño (assets/web): se descarga solo y se usa la próxima vez que se pulsa Home.
 *    Lo controla assets/web/version.json: hay que subir "version" en cada cambio.
 * 2) App (APK): si hay una release más nueva que el versionCode instalado,
 *    se avisa en la home y se instala con un clic.
 */
object Updater {
    private const val REPO = "jarajote/horizonte"
    private const val BRANCH = "main"
    private const val RAW = "https://raw.githubusercontent.com/$REPO/$BRANCH/app/src/main/assets/web/"
    private const val RELEASES = "https://api.github.com/repos/$REPO/releases/latest"
    // El diseño se mira a menudo (raw.githubusercontent no tiene límite); el APK, cada 10 min (API limitada a 60/h)
    private const val WEB_EVERY = 2 * 60 * 1000L
    private const val APK_EVERY = 10 * 60 * 1000L

    @Volatile private var lastWeb = 0L
    @Volatile private var lastApk = 0L
    @Volatile var apkUrl: String? = null
    @Volatile var apkTag: Int = 0

    fun webDir(ctx: Context) = File(ctx.filesDir, "web")

    fun nativeVersion(ctx: Context): Long = try {
        val pi = ctx.packageManager.getPackageInfo(ctx.packageName, 0)
        if (Build.VERSION.SDK_INT >= 28) pi.longVersionCode else @Suppress("DEPRECATION") pi.versionCode.toLong()
    } catch (e: Exception) { 1L }

    private fun bundledWebVersion(ctx: Context): Int = try {
        JSONObject(ctx.assets.open("web/version.json").bufferedReader().readText()).optInt("version", 0)
    } catch (e: Exception) { 0 }

    private fun downloadedWebVersion(ctx: Context): Int = try {
        JSONObject(File(webDir(ctx), "version.json").readText()).optInt("version", 0)
    } catch (e: Exception) { 0 }

    /** La versión del diseño que hay que mostrar: la descargada si es más nueva que la que trae el APK. */
    fun startUrl(ctx: Context): String {
        val dir = webDir(ctx)
        return if (File(dir, "index.html").exists() && downloadedWebVersion(ctx) > bundledWebVersion(ctx))
            "file://" + File(dir, "index.html").absolutePath
        else "file:///android_asset/web/index.html"
    }

    /**
     * Comprueba ambas cosas en segundo plano.
     * onWebReady: hay un diseño nuevo descargado. onApk: hay un APK nuevo (número de versión).
     */
    fun check(ctx: Context, force: Boolean, onWebReady: () -> Unit, onApk: (Int) -> Unit) {
        val now = System.currentTimeMillis()
        val doWeb = force || now - lastWeb >= WEB_EVERY
        val doApk = force || now - lastApk >= APK_EVERY
        if (!doApk && apkTag > nativeVersion(ctx)) onApk(apkTag)
        if (!doWeb && !doApk) return
        if (doWeb) lastWeb = now
        if (doApk) lastApk = now
        val app = ctx.applicationContext
        Thread {
            if (doWeb) try { if (updateWeb(app)) onWebReady() } catch (_: Exception) {}
            if (doApk) try {
                val j = JSONObject(get(RELEASES))
                val tag = j.optString("tag_name").trimStart('v', 'V').toIntOrNull() ?: 0
                val assets = j.optJSONArray("assets")
                var url: String? = null
                if (assets != null) for (i in 0 until assets.length()) {
                    val a = assets.getJSONObject(i)
                    if (a.optString("name").endsWith(".apk")) url = a.optString("browser_download_url")
                }
                if (url != null && tag > nativeVersion(app)) { apkUrl = url; apkTag = tag; onApk(tag) }
            } catch (_: Exception) {}
        }.start()
    }

    private fun updateWeb(ctx: Context): Boolean {
        val remote = JSONObject(get(RAW + "version.json?t=" + System.currentTimeMillis()))
        val version = remote.optInt("version", 0)
        val minNative = remote.optLong("minNative", 1)
        val current = maxOf(bundledWebVersion(ctx), downloadedWebVersion(ctx))
        if (version <= current || minNative > nativeVersion(ctx)) return false

        val files = remote.optJSONArray("files") ?: return false
        val tmp = File(ctx.filesDir, "web-new")
        tmp.deleteRecursively()
        for (i in 0 until files.length()) {
            val name = files.getString(i)
            if (name.contains("..")) return false
            val out = File(tmp, name)
            out.parentFile?.mkdirs()
            download(RAW + name + "?v=" + version, out)
            if (out.length() == 0L) return false
        }
        File(tmp, "version.json").writeText(remote.toString())
        val dir = webDir(ctx)
        dir.deleteRecursively()
        return tmp.renameTo(dir)
    }

    /** Descarga el APK nuevo y abre el instalador de Android. */
    fun installApk(ctx: Context, toast: (String) -> Unit) {
        val url = apkUrl ?: run { toast("No hay ninguna versión nueva"); return }
        if (Build.VERSION.SDK_INT >= 26 && !ctx.packageManager.canRequestPackageInstalls()) {
            toast("Primero permite que Horizonte instale apps y vuelve a pulsar ⬇")
            val i = Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, android.net.Uri.parse("package:" + ctx.packageName))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try { ctx.startActivity(i) } catch (e: Exception) {
                toast("Ajustes → Privacidad → Seguridad y restricciones → Fuentes desconocidas → Horizonte")
            }
            return
        }
        val app = ctx.applicationContext
        Thread {
            try {
                val apk = File(app.cacheDir, "horizonte-update.apk")
                download(url, apk)
                val installer = app.packageManager.packageInstaller
                val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
                params.setAppPackageName(app.packageName)
                val id = installer.createSession(params)
                installer.openSession(id).use { session ->
                    session.openWrite("horizonte", 0, apk.length()).use { out ->
                        apk.inputStream().use { it.copyTo(out) }
                        session.fsync(out)
                    }
                    val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
                    val pi = PendingIntent.getBroadcast(app, id, Intent(app, InstallReceiver::class.java), flags)
                    session.commit(pi.intentSender)
                }
            } catch (e: Exception) {
                toast("No se ha podido descargar la actualización")
            }
        }.start()
    }

    private fun open(url: String): HttpURLConnection {
        var u = url
        for (hop in 0 until 5) {
            val c = URL(u).openConnection() as HttpURLConnection
            c.connectTimeout = 15000
            c.readTimeout = 30000
            c.instanceFollowRedirects = true
            c.setRequestProperty("User-Agent", "Horizonte")
            c.setRequestProperty("Accept", "*/*")
            val code = c.responseCode
            if (code in 300..399) { u = c.getHeaderField("Location") ?: break; c.disconnect(); continue }
            if (code != 200) { c.disconnect(); throw RuntimeException("HTTP $code") }
            return c
        }
        throw RuntimeException("Demasiadas redirecciones")
    }

    private fun get(url: String): String {
        val c = open(url)
        try { return c.inputStream.bufferedReader().readText() } finally { c.disconnect() }
    }

    private fun download(url: String, to: File) {
        val c = open(url)
        try { c.inputStream.use { inp -> to.outputStream().use { inp.copyTo(it) } } } finally { c.disconnect() }
    }
}

/** Recibe el resultado del instalador: si Android pide confirmación, muestra su pantalla. */
class InstallReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        when (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                val confirm: Intent? = if (Build.VERSION.SDK_INT >= 33)
                    intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                else @Suppress("DEPRECATION") intent.getParcelableExtra(Intent.EXTRA_INTENT)
                confirm?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                try { if (confirm != null) ctx.startActivity(confirm) } catch (_: Exception) {}
            }
            PackageInstaller.STATUS_SUCCESS -> {}
            else -> {
                val msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: ""
                Toast.makeText(ctx, "No se ha podido instalar la actualización. $msg", Toast.LENGTH_LONG).show()
            }
        }
    }
}
