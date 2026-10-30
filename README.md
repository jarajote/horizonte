# Horizonte — launcher para la TCL

La vista del Estrecho desde el faro de Punta Carnero. Ale, Ana, Leo y Juanita pasean por el camino a lo largo del día. El sol, la luna (con su fase real), los colores, las nubes y el viento siguen la hora y el tiempo de verdad.

## Qué hace

- **Escena viva.** El sol sale y se pone a la hora real de Punta Carnero. De noche se encienden las estrellas, el faro gira y se ven las luces de la costa africana. Cruzan barcos de vez en cuando, y cuando llueve o graniza también se ve en la escena.
- **El tiempo del día**, con su icono (sol, sol con nubes, nubes, lluvia, granizo, tormenta o nieve) y la temperatura actual.
- **El paseo.** Salís del faro tras el amanecer y llegáis al final del camino al atardecer. De noche estáis junto al faro con los perros tumbados.
- **La ropa cambia con la estación.**
- **Juanita** (nacida el 4 de octubre de 2026) empieza siendo una cachorra y va creciendo hasta tamaño adulto.
- **El dock tiene Kodi, YouTube (TizenTube), Fútbol (FCTV33), Spotify y PS5.**
- **Cajón de apps:** flecha abajo. **Cambiar un hueco:** mantén OK sobre el icono.

---

## Instalarlo solo con el móvil y el mando

### 1. Conseguir el APK (una sola vez)

El proyecto trae un proceso que hace que GitHub compile la app solo y la publique con un enlace fijo:

1. Crea una cuenta en GitHub (github.com, desde el navegador del móvil) si no tienes.
2. Crea un repositorio **público** y **vacío** llamado `horizonte`.
3. Sube este proyecto ahí. Si conectas GitHub a Claude, Claude lo sube por ti.
4. A los ~5 minutos, en la pestaña **Releases** del repositorio aparece `horizonte.apk`. El enlace es siempre el mismo:

```
https://is.gd/CeIgq1   (= github.com/jarajote/horizonte/releases/latest/download/horizonte.apk)
```

### 2. Permitir que Downloader instale apps

En la tele: **Ajustes → Privacidad → Seguridad y restricciones → Fuentes desconocidas** y activa **Downloader**. Según la versión, puede llamarse «Instalar apps desconocidas» o estar dentro de **Ajustes → Apps → Seguridad y restricciones**.

### 3. Instalar con Downloader

1. Abre **Downloader** y, en la barra de dirección, escribe el enlace del paso 1.
2. Pulsa **Go**. Se descarga y aparece el instalador: **Instalar**.
3. Cuando termine, pulsa **Listo** (no hace falta abrirla todavía) y borra el APK descargado si Downloader te lo ofrece.

> Truco: escribir un enlace largo con el mando cuesta. Puedes acortarlo desde el móvil con cualquier acortador (is.gd, por ejemplo) y escribir solo el corto.

### 4. Hacer que el botón Home abra Horizonte

1. Abre Horizonte desde **Apps** en la tele.
2. Verás un aviso y un punto naranja en ⚙. Sube con el mando hasta ⚙ y pulsa OK: se abren los ajustes de Accesibilidad.
3. Entra en **Horizonte: botón Home** y actívalo. Acepta el aviso.
4. Pulsa Home en el mando: aparece Horizonte.

Este servicio no lee nada de lo que ves ni de lo que escribes. Solo detecta cuándo aparece la pantalla de inicio de TCL/Google y pone Horizonte encima. Para volver a la de antes, desactívalo en el mismo sitio.

### Actualizar

No tienes que hacer nada:

- **Diseño** (escena, dock, reloj, tiempo): Horizonte lo descarga solo de GitHub y lo aplica la próxima vez que pulses Home.
- **App:** cuando hay una versión nueva, aparece un botón ⬇ junto a ⚙ y un aviso. Sube hasta él y pulsa OK: se descarga y sale el instalador. La primera vez, Android te pedirá permitir que Horizonte instale apps.

Si algo fallara, el enlace de Downloader (`https://is.gd/CeIgq1`) siempre tiene la última versión.

---

## Personalizar

En `app/src/main/assets/web/index.html`, bloque `HZ_CONFIG`:

```js
names: 'Ale y Ana',
juanitaBirth: '2026-10-04T12:00:00',
lat: 36.0773, lon: -5.4258
```

### Icono propio para un hueco

Copia un PNG cuadrado llamado `kodi`, `youtube`, `futbol`, `spotify` o `ps5` (con su extensión) en:

```
Android/data/com.alejandro.horizonte/files/icons/
```

Puedes hacerlo con un explorador de archivos en la tele, o con `adb push` si usas ordenador.

## Con ordenador (alternativa)

1. Abre la carpeta en Android Studio y elige **Build → Build APK(s)**.
2. Instala con `adb install -r app/build/outputs/apk/release/app-release.apk`.
3. Si prefieres no usar el servicio de accesibilidad, ejecuta `adb shell cmd package set-home-activity com.alejandro.horizonte/.MainActivity`. Si con eso no basta, desactiva el launcher original con `adb shell pm disable-user --user 0 com.google.android.tvlauncher`, que se deshace con `pm enable`.

## Probar en el navegador

Abre `app/src/main/assets/web/index.html` en Chrome. Las flechas, Enter y Esc hacen de mando.

- `?t=2026-10-30T19:10` fija una hora.
- `?speed=600` acelera el día.
- `?wx=96` simula el tiempo (0 sol, 2 sol y nubes, 3 nubes, 63 lluvia, 95 tormenta, 96 granizo).
- `?ui=0` oculta la interfaz.
