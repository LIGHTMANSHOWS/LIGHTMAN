# NEON PROTOCOL / Director Cut

Composición instrumental original sintetizada para LIGHTMAN: **180 s, 128 BPM, 96 compases**, máster WAV mono de 22.050 Hz. No contiene grabaciones de terceros.

SHA-256 del máster incluido:

```text
889b6e97bfc9b52da43675ca6840370f9d9a99a3df6c7d8bfdbbd34c0b958f18
```

## Dirección escénica

| Tiempo | Capítulo | Desarrollo |
| --- | --- | --- |
| 0–30 s | Aparición | Entrada escalonada, siluetas, líneas y primeros gestos |
| 30–60 s | La geometría despierta | Cuadrados, ondas y respuestas entre artistas |
| 60–90 s | Primer drop / llamadas | Anillos, túneles, acentos y alternancia de manos |
| 90–120 s | Respiración / diálogo | Menor densidad, pausas y foco por artista |
| 120–150 s | Segundo drop / neón | Mayor actividad, paleta naranja, turquesa y violeta |
| 150–180 s | Coda / unión | Motivos conjuntos, resolución y blackout |

Hay marcadores de frase cada 7,5 s y un rango final de blackout de 179,53125 a 180 s. Las manos siguen siendo binarias durante toda la composición.

## Capas y cantidades

| Elemento | Cantidad |
| --- | ---: |
| Bloques de los tres proyectores | 326 |
| Puntos de movimiento geométrico | 2.442 |
| Bases LED | 144 |
| Capas de recorridos y acentos LED | 1.870 |
| Bloques de las seis manos | 410 |
| Total de bloques | 2.750 |
| Marcadores | 25 |

Las bases mantienen una silueta visible. Los recorridos dan continuidad; los acentos responden a instrumentos y se distribuyen por zonas. El lead recorre las 18 zonas, la caja responde en cintura, el bajo en piernas, el hi-hat en capucha y el kick apoya en pies. La energía medida en el WAV modula la intensidad de los acentos. Los proyectores usan motivos por capítulo y pequeñas variaciones musicales de tamaño y giro.

El análisis parte de la partitura conocida de la síntesis y la contrasta con el máster real. Registra 2.392 eventos: 324 kick, 184 caja, 740 hi-hat, 368 bajo, 704 lead, 48 pad y 24 riser. La cuantización de una muestra a 22.050 Hz es aproximadamente 0,04535 ms; **no es una medida de latencia de salida**.

## Editar y regenerar

Edita una copia desde el programa para conservar la composición original. El generador de desarrollo está en `desktop/tools/build_professional_show.mjs`; la síntesis y análisis están en `generate_music.py` y `analyze_music.py`.

Regenerar la música puede depender de la versión de las bibliotecas numéricas. El WAV entregado y su huella son la referencia de esta versión. Si se sustituye, hay que regenerar y comprobar análisis, composición y exportaciones antes de volver a publicar.
