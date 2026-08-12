# Detector de Objetos PWA en tiempo real

Una aplicación web que reconoce objetos usando la cámara del dispositivo o una imagen subida, y te dice con qué porcentaje de confianza los detecta. Todo corre en el navegador: las fotos no se envían a ningún servidor.

![Vista previa de la aplicación](<Screenshot 2026-04-02 022625.png>)

---

## Qué problema resuelve

Saber qué hay frente a la cámara suele requerir servicios externos de visión por computadora: cargar imágenes a un servidor, esperar una respuesta, pagar por el procesamiento.

Este proyecto evita todo eso. Con un modelo de clasificación que corre directamente en el dispositivo, responde a dos preguntas simples:

- **¿Qué hay en esta imagen?** Subes un archivo, eliges "Detectar objetos" y obtienes las clases más probables.
- **¿Qué hay en vivo?** Activas la webcam y el modelo clasifica lo que ve en tiempo real.

Cada resultado incluye su porcentaje de confianza:

- `Persona (98%)`
- `Lapicero (87%)`
- `Montaña (64%)`

Al ejecutarse localmente, funciona sin conexión una vez cargado, y como es una PWA puede instalarse en el equipo como una app más.

## Cómo funciona por dentro

La app tiene un servicio central que se encarga de la parte de visión, y una interfaz que orquesta los dos modos de uso.

**El motor de detección**

Cuando arranca, la app carga el modelo MobileNet (versión 2, ligera y precisa para clasificación general) sobre TensorFlow.js. Primero intenta usar la GPU vía WebGL para que las inferencias sean rápidas; si el dispositivo no la soporta, cae automáticamente a la CPU. El modelo se carga una sola vez y se reutiliza en toda la sesión, así la primera detección real es casi inmediata.

**El modo cámara**

Al activar la cámara, el navegador pide permiso y se configura el stream de video. Un bucle de inferencia toma cuadros continuamente y actualiza la lista de resultados en vivo. Dos detalles clave de ese bucle:

- Las inferencias nunca se solapan: mientras una clasificación está en curso, el siguiente cuadro espera. Así se evita acumular trabajo y que la app se quede lenta.
- Al detener o cerrar la vista, se liberan los recursos de la cámara y se cancela el bucle; no quedan procesos en segundo plano.

Si el usuario está en un celular, la cámara usa la trasera de forma preferente, que es la que da mejor vista del entorno.

**El modo imagen**

Seleccionar un archivo crea una vista previa local y habilita el botón de detección. La imagen se clasifica al vuelo y se muestran las coincidencias ordenadas por confianza, con una barra visual para leer el porcentaje de un vistazo. También se gestiona la memoria de las vistas previas temporales, liberándolas cuando dejan de usarse.

**La capa PWA**

La app es instalable y, gracias al service worker, precarga el modelo de clasificación en producción. Eso significa que una vez visitada, la detección puede funcionar incluso sin conexión. Si se publica una nueva versión, un banner avisa al usuario para que la active con un clic.

## Decisiones de diseño

- **Todo en el navegador, sin servidor.** MobileNet es un modelo chico que corre bien en dispositivos comunes. Esto da privacidad (las imágenes no salen del dispositivo) y elimina costos de infraestructura.
- **Carga del modelo de una sola vez.** Se carga al iniciar la app y se comparte entre ambos modos. Evita repetir descargas de pesos del modelo en cada uso.
- **Interfaz reactiva y ligera.** La UI usa señales y estrategia de detección de cambios `OnPush`, así Angular solo repinta lo que realmente cambió durante el flujo de video, que es intensivo.
- **Errores pensados para la persona.** Los mensajes de la cámara son específicos según el fallo: permiso denegado, cámara no encontrada o cámara en uso por otra app. No hay un "algo falló" genérico.
- **Experiencia offline por diseño.** El service worker precachea hasta el modelo, no solo los archivos de la app.

## Tecnologías

- **Angular 19** — interfaz, señales y reactividad
- **Angular Material** — componentes de UI
- **TensorFlow.js** — inferencia en el navegador
- **MobileNet v2** — modelo de clasificación de imágenes
- **Angular Service Worker** — PWA, instalación y actualizaciones

## Requisitos

- Node.js **20.x** o **22.x** LTS (también funciona con versiones recientes, pero se recomienda LTS para un entorno estable)
- npm (viene con Node.js)

## Puesta en marcha

```bash
npm install      # instala dependencias
npm start        # levanta el servidor de desarrollo
```

Abre `http://localhost:4200`.

Con la cámara: elige "Cámara en vivo", pulsa "Activar cámara" y acepta el permiso del navegador.

Con una imagen: elige "Subir imagen", selecciona un archivo y pulsa "Detectar objetos".

> La cámara requiere localhost o HTTPS para funcionar en la mayoría de navegadores.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm start` | Servidor de desarrollo con recarga automática |
| `npm run build` | Build optimizado de producción en `dist/` |
| `npm run lint` | ESLint sobre TypeScript y plantillas |
| `npm test` | Pruebas unitarias con Karma + Jasmine |

El service worker solo se activa en producción, así que para probar el comportamiento PWA hay que servir el build: `npx http-server -p 8082 -c-1 dist/angular-pwa/browser`.

## Inspiración

Proyecto inspirado en el trabajo de [DOMINICODE](https://github.com/domini-code) y [midudev](https://github.com/domini-code/midudev-pwa), que sirvió como punto de partida: [midudev-pwa](https://github.com/domini-code/midudev-pwa).

Puedes ver una demostración del resultado aquí:

[![Ver demo en YouTube](https://img.youtube.com/vi/Y5zaSOqqMcM/0.jpg)](https://youtu.be/Y5zaSOqqMcM)

## Verificación

El repositorio se verificó correctamente con `npm run build`, `npm run lint` y las pruebas unitarias en modo headless.
