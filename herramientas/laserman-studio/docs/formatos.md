# Formatos del proyecto y exportaciones

## Proyecto editable

Un archivo `.laserman.json` utiliza `format: "lightman-laserman"` y `version: 1`. Su estructura principal contiene `name`, `duration`, `bpm`, `stage`, `audio`, `markers` y exactamente seis `tracks`: tres `laser` y tres `suit`. Cada traje contiene `hands.left` y `hands.right`.

| Campo | Unidad / significado |
| --- | --- |
| `duration`, `start`, `duration` de bloque | Segundos |
| `bpm` | Pulsos por minuto; define la cuadrícula de edición |
| `stage.width`, `stage.depth`, `stage.rigHeight` | Metros escénicos de la simulación |
| `position` | Vector de tres coordenadas escénicas |
| `color` | Color hexadecimal `#RRGGBB` |
| `audio.url` | Referencia relativa bajo `assets/` |
| `audio.offset` | Desplazamiento en segundos |
| `marker.end` ausente o nulo | Marcador puntual; se calcula hasta el siguiente límite |
| `marker.end` numérico | Rango explícito |
| `layer` | Acento LED que se suma a la base |
| `sourceOffset`, `sourceDuration` | Fase y duración originales de un bloque recortado |
| `motion` | Puntos locales de tamaño, giro y desplazamiento |
| `motionBase`, `motionStrength`, `motionEnabled` | Referencia y control del movimiento musical |

El validador del editor comprueba tipos de pista, IDs únicos, tiempos, colores, parámetros y límites: proyecto de 1–1.200 s, BPM de 40–240, hasta 12.000 bloques y 1.024 marcadores. El límite de archivo importado es 5 MB. El servidor local hace además una validación básica de formato, número de pistas y tamaño; el validador completo del modelo está en `engine.js`.

El ejemplo completo e importable es `desktop/samples/NEON-PROTOCOL-Director-Cut.laserman.json`. No es necesario crear a mano seis pistas para empezar: abre Director Cut y edita una copia.

## ZIP de show

| Archivo | Contenido |
| --- | --- |
| `project.laserman.json` | Edición completa y parámetros |
| `laser-1.ild` … `laser-3.ild` | Una secuencia independiente por proyector |
| `suit-1.rgb` … `suit-3.rgb` | Una secuencia RGB por traje |
| `hands.csv` | Transiciones binarias de las seis manos |
| `markers.csv` | Nombre, inicio, fin y color de marcadores |
| `led-ldp-backup.json` | Tres gears, preview y secuencia para la adaptación local LIGHTMAN de LDP |
| `manifest.json` | Duración, tasas, tipos de pista, patch y metadatos |
| `assets/…` | Música del proyecto |
| `patch/portion-x-jacket.json` | Patch de referencia del jacket |
| `LEEME.txt` | Indicaciones del paquete |

Abrir ZIP vuelve a incorporar la música. El almacenamiento interno puede asignarle un nombre `user-<hash>`; eso no modifica su contenido. Las pruebas comparan su SHA-256.

## ILDA

Se exporta formato 5: coordenadas 2D de 16 bits con signo y orden big-endian, estado de blanking y color BGR888. El último registro de un fotograma lleva el indicador de fin de puntos; un encabezado con cero puntos termina el archivo.

El valor predeterminado es 15 fotogramas/s; el selector permite de 5 a 30. **FPS y KPPS son parámetros distintos.** ILDA no guarda la tasa del DAC: el reproductor debe configurarse con un máximo de 15.000 puntos/s para esta instalación. A 180 s y 15 FPS se generan 2.700 fotogramas por proyector.

## RGB y manos

Cada `.rgb` contiene RGB888 sin cabecera: 530 píxeles × 3 bytes, a 30 fotogramas/s desde t=0. Un show de 180 s ocupa 8.586.000 bytes por traje. El orden coincide con `jacket-patch.json`.

`hands.csv` usa `track,hand,time_s,value`. Solo contiene cambios a 0 o 255. Al solaparse dos bloques de una misma mano, no se apaga hasta terminar su unión. `markers.csv` usa `name,start_s,end_s,color`; el fin vacío representa un marcador puntual.

Los RGB horneados son la referencia exacta de reproducción LED. Otro editor puede interpretar de forma distinta la fase de un efecto recortado; el proyecto LASERMAN conserva esos desplazamientos. La comparación de la entrega confirmó coincidencia exacta entre exportación web y escritorio para ILDA, RGB, manos, marcadores y copia LED.
