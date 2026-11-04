# Plataforma web 1.1

Enlace activo: https://lightmanperu.com/herramientas/laserman-studio/

La aplicación es estática: los módulos, la escena y el máster musical se cargan desde LIGHTMAN. `web-main.js` instala la plataforma de navegador antes de iniciar `app.js`. `web-platform.js` resuelve guardado, versiones, importación y exportación en el propio navegador; no necesita un servicio Python público.

El guardado combina localStorage e IndexedDB (`lightman-laserman-web-v1`). Los audios importados se guardan como blobs identificados por su hash; se reproducen mediante URLs locales de objeto. Los datos de un dispositivo no se sincronizan automáticamente con otro. Exportar el ZIP permite llevar proyecto y música juntos.

`web-zip.js` escribe y lee paquetes con CRC32. Utiliza compresión nativa cuando está disponible; al escribir puede conservar entradas sin comprimir. La importación comprueba tamaños, integridad y formatos de compresión admitidos. Los recursos del programa usan rutas relativas para funcionar dentro de la subcarpeta publicada.

La escena se genera con Three.js. Los efectos LED utilizan el renderer CPU y patch de referencia indicados en NOTICE.md. Las manos mantienen encendido/apagado. La plataforma web no inicia transporte USB ni envía Art-Net; el panel Salidas puede abrir el operador local instalado en el mismo PC.

En una pantalla estrecha, Editar abre las propiedades, el timeline permite desplazamiento y el modo Rango acepta un gesto táctil. La compatibilidad de la entrega se comprobó con Chrome aislado y viewport emulado; no se afirma una certificación para todos los navegadores o teléfonos.
