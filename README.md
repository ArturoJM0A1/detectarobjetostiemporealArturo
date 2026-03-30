# Detector de Objetos PWA en tiempo real

Aplicacion web construida con Angular 19, Angular Material y TensorFlow.js para detectar objetos usando el modelo MobileNet.

Permite trabajar de dos formas:

- `Camara en vivo`: activa la webcam y clasifica objetos en tiempo real.
- `Subir imagen`: analiza una imagen local y muestra las clases detectadas.

Cada resultado incluye el porcentaje de confianza, por ejemplo:

- `Persona (98%)`
- `Lapicero (87%)`
- `Montaña (64%)`

Tambien funciona como PWA, por lo que puede instalarse y recibir actualizaciones mediante service worker en modo produccion.

# Proyecto inspirado en 

Este proyecto toma como base el trabajo: https://github.com/domini-code/midudev-pwa
- [Repositorio midudev-pwa](https://github.com/domini-code/midudev-pwa)  
- Autor: **DOMINICODE** y **midudev**


# Ver demostración

Puedes ver una demostración del proyecto en el siguiente video:

[![Ver demo en YouTube](https://img.youtube.com/vi/Y5zaSOqqMcM/0.jpg)](https://youtu.be/Y5zaSOqqMcM)

## Caracteristicas

- Deteccion de objetos con `@tensorflow-models/mobilenet`
- Inferencia en tiempo real desde webcam
- Analisis de imagenes subidas por el usuario
- Visualizacion de porcentaje de confianza
- Interfaz responsive con Angular Material
- Soporte PWA con service worker y aviso de nueva version

## Tecnologias principales

- Angular 19
- Angular Material
- TensorFlow.js
- MobileNet
- Angular Service Worker
- Karma + Jasmine
- ESLint

## Requisitos

Antes de ejecutar el proyecto, asegúrate de tener:

- `Node.js` recomendado: version LTS `20.x` o `22.x`
- `npm` incluido con Node.js

Nota:

- Durante las verificaciones se detecto `Node.js v25.8.1`, que funciona para compilar, pero es una version impar y no LTS. Para desarrollo normal se recomienda usar Node LTS.

## Instalacion

Desde la carpeta del proyecto:

```bash
npm install
```

## Como ejecutarlo

La forma mas simple para desarrollo local es:

```bash
npm start
```

Eso levanta el servidor de desarrollo de Angular.

Luego abre:

```text
http://localhost:4200
```

## Ejecucion paso a paso

1. Abre una terminal en la carpeta del proyecto.
2. Instala dependencias:

```bash
npm install
```

3. Inicia el servidor:

```bash
npm start
```

4. En el navegador entra a:

```text
http://localhost:4200
```

5. Usa uno de estos modos:

- `Camara en vivo`: pulsa `Activar camara`, acepta el permiso del navegador y espera los resultados.
- `Subir imagen`: selecciona una imagen y pulsa `Detectar objetos`.

## Uso de la aplicacion

### Modo camara

1. Selecciona `Camara en vivo`.
2. Pulsa `Activar camara`.
3. Acepta el permiso del navegador.
4. Observa la lista de predicciones que se actualiza automaticamente.
5. Si quieres detener la captura, pulsa `Detener camara`.

### Modo imagen

1. Selecciona `Subir imagen`.
2. Pulsa `Seleccionar imagen`.
3. Elige un archivo local.
4. Pulsa `Detectar objetos`.
5. Revisa las clases detectadas y su confianza.

## Scripts disponibles

### Desarrollo

```bash
npm start
```

Inicia el servidor de desarrollo con recarga automatica.

### Build de produccion

```bash
npm run build
```

Genera la aplicacion optimizada en:

```text
dist/angular-pwa
```

### Lint

```bash
npm run lint
```

Ejecuta las reglas de ESLint sobre TypeScript y plantillas Angular.

### Tests

```bash
npm run test -- --watch=false --browsers=ChromeHeadless
```

Ejecuta las pruebas unitarias una sola vez en modo headless.

## Ejecutarlo como PWA en local

Para probar el service worker y el comportamiento PWA necesitas servir el build de produccion.

1. Genera el build:

```bash
npm run build
```

2. **Sirve la carpeta compilada:**

```bash
npx http-server -p 8082 -c-1 dist/angular-pwa/browser
```

3. Abre:

```text
http://localhost:8080
```

Notas:

- El service worker solo se activa en produccion.
- La instalacion PWA y varios flujos relacionados con camara funcionan mejor en `localhost` o en `HTTPS`.

## Estructura del proyecto

```text
src/
  app/
    components/
      shared/
        check-update/
        header/
    pages/
      object-detection/
        models/
        prediction-list/
        upload-card/
        object-detection.component.*
        object-detection.service.ts
    app.component.*
    app.config.ts
    app.routes.ts
  styles.scss
public/
  manifest.webmanifest
  icons/
```

## Arquitectura resumida

### `ObjectDetectionService`

Se encarga de:

- cargar el modelo MobileNet
- seleccionar backend de TensorFlow.js
- exponer estados como carga del modelo e inferencia
- ejecutar `classify(...)` sobre imagen, video o canvas

### `ObjectDetectionComponent`

Controla:

- el modo activo: camara o imagen
- el permiso y ciclo de vida de la webcam
- la vista previa del video o de la imagen
- el bucle de inferencia en tiempo real con `requestAnimationFrame`
- la limpieza del `MediaStream` y de las URLs temporales

### `PredictionListComponent`

Renderiza:

- las clases detectadas
- el porcentaje de confianza
- una barra visual para la confianza
- el estado vacio o el estado en vivo

### `CheckUpdateComponent`

Muestra un banner cuando el service worker detecta una nueva version disponible.

## Flujo de deteccion

### Cuando usas imagen

1. El usuario selecciona un archivo.
2. Se crea una URL temporal para previsualizarlo.
3. Se carga la imagen en memoria.
4. MobileNet clasifica la imagen.
5. Se muestran las predicciones con porcentaje.

### Cuando usas webcam

1. El navegador solicita permiso para acceder a la camara.
2. Se crea un `MediaStream`.
3. El video se asigna al elemento `<video>`.
4. Se ejecuta un bucle de inferencia en vivo.
5. La lista de resultados se actualiza continuamente.

## Consideraciones sobre la webcam

- La camara requiere permiso del navegador.
- Si no funciona, revisa que no este bloqueada por el navegador o por otro programa.
- Si otra aplicacion esta usando la webcam, el navegador puede devolver un error.
- En muchos navegadores la camara solo funciona correctamente en `localhost` o `HTTPS`.

## Solucion de problemas

### La webcam no abre

Revisa lo siguiente:

- aceptaste el permiso del navegador
- no hay otra aplicacion usando la camara
- estas en `http://localhost` o en `https://`

### La primera carga tarda un poco

Es normal. TensorFlow.js y MobileNet deben cargarse antes de la primera inferencia.

### La PWA no se instala o no actualiza

Comprueba que estas sirviendo el build de produccion y no el servidor de desarrollo.

### Hay advertencias por la version de Node

Usa Node `20.x` o `22.x` LTS para evitar advertencias y tener un entorno mas estable.

## Verificacion realizada

En este repositorio se verifico correctamente:

- `npm run build`
- `npm run lint`
- `npm run test -- --watch=false --browsers=ChromeHeadless`

## Comandos rapidos

Instalar dependencias:

```bash
npm install
```

Ejecutar en desarrollo:

```bash
npm start
```

Compilar:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Tests:

```bash
npm run test -- --watch=false --browsers=ChromeHeadless
```
