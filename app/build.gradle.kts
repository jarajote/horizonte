plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.alejandro.horizonte"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.alejandro.horizonte"
        minSdk = 26
        targetSdk = 34
        // En GitHub cada compilación tiene un número mayor: así la home sabe si hay versión nueva
        val run = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
        versionCode = run
        versionName = "1.$run"
    }

    // Clave fija dentro del proyecto: así cada versión nueva se instala encima de la anterior
    signingConfigs {
        create("casa") {
            storeFile = file("horizonte.jks")
            storePassword = "horizonte"
            keyAlias = "horizonte"
            keyPassword = "horizonte"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("casa")
        }
        debug {
            signingConfig = signingConfigs.getByName("casa")
        }
    }

    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}
