# Pruebas y alcance de la entrega

Revisión del 4 de noviembre de 2026. Se comprobó la versión web estática en Chrome aislado: controles de edición, marcadores, rangos, relleno por arrastre, deshacer/rehacer, cambios de manos independientes y rechazo de efectos incompatibles.

Se completaron los 180 segundos del show y su blackout final. La diferencia máxima observada entre audio y editor en esa pasada fue 43,85 ms; no mide latencia física. Durante 330 saltos se mantuvieron 87 geometrías GPU tras el calentamiento, con 8 ampliaciones de buffers. La simulación no se recalculó en la pausa medida.

El ZIP exportado en navegador se volvió a importar. Proyecto, pistas y marcadores se conservaron; la música volvió a reproducirse después de recargar IndexedDB. ILDA, RGB, manos, marcadores y copia de efectos LED coincidieron byte por byte con la exportación del programa de escritorio. El audio conservó su SHA-256.

En el enlace público se verificaron HTTPS, dirección final, 30 archivos de aplicación y audio. También se probaron reproducción, creación de rango por tacto, edición de marcador, relleno, panel de salidas y órbita de cámara en viewport de 390×844. Ese viewport fue emulado en Chrome de escritorio, no en un Android físico.

No hubo excepciones de página ni solicitudes para habilitar salidas físicas durante las pruebas. El operador integrado sigue pendiente de una prueba física conjunta con tres FB3, tres trajes y seis manos. La simulación 3D no es una calibración de proyección. El control nativo de Windows no pudo verificar la URL de la ventana personal de Brave; la comprobación de interacción se hizo en un Chrome de pruebas separado.

## Evidencias

- [Exportación y comparación con escritorio](evidencias/browser-export-verification.json)
- [Controles desde la dirección pública](evidencias/public-web-ui.json)

Los resultados son registros de las pasadas descritas, no monitorización continua ni promesa de optimización absoluta del 100 %.
