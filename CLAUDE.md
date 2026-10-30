# Horizonte — notas para Claude

Launcher para la TV TCL de Ale (Android TV 12). La interfaz y la escena son web (`app/src/main/assets/web`), y la parte nativa está en Kotlin.

## Cómo llegan los cambios a la tele

- **Cambios solo en `assets/web/`:** sube `version` en `app/src/main/assets/web/version.json` en el mismo commit. Si no, la tele no los descarga. Si añades un archivo nuevo, añádelo también a `files`. La app lo descarga sola y lo aplica al pulsar Home. Estos cambios no lanzan una compilación de APK.
- **Cambios nativos** (Kotlin, manifest, recursos, Gradle): al hacer push a `main`, GitHub Actions compila y publica una release `vN` con `horizonte.apk`. La home avisa y se instala con un clic.
- **Si el diseño nuevo necesita un método nuevo del puente `window.Android`:** pon `minNative` en `version.json` al número de la compilación (run number) que lo trae.

## Probar

- Abre `app/src/main/assets/web/index.html` en Chrome. Admite `?t=2026-10-30T19:10`, `?speed=600`, `?wx=96`, `?ui=0` y `?update=1`.
- Comprueba el Kotlin con kotlinc contra `android.jar` si no hay SDK disponible.

Enlace de instalación (Downloader): https://is.gd/CeIgq1, que apunta a releases/latest/download/horizonte.apk.
