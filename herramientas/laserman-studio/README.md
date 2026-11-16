# LIGHTMAN LASERMAN Studio · Web 1.1

**Transiciones:** pulsa «↝ Transiciones» y elige una unión. Ajusta tipo, curva, duración y unidad (segundos o pulsos musicales). La franja rayada del bloque muestra la entrada y su borde derecho permite cambiar la duración por arrastre. «Aplicar a los 3 láseres» copia los ajustes a los bloques que empiezan en el mismo instante. «Bucle de transición» reproduce la unión con dos segundos de contexto a cada lado; en «Contexto y cámara lenta» puedes ajustar esos márgenes y elegir 1×, 0,5× o 0,25×. «Detener», «Salir» o Escape terminan el bucle y restauran la velocidad. Deshacer también termina la previsualización. Todas las figuras, incluidas las importadas, admiten las transiciones. Los trajes LED permiten fundido y barrido; las manos conservan encendido/apagado. Guarda o exporta para conservar los ajustes. ILDA y RGB incorporan las transiciones, mientras que el respaldo LDP conserva sus efectos base.

**Show ARIUS · 7:13:** «Abrir show ARIUS» carga la adaptación completa para tres artistas con el audio original mejorado, 93 frases visuales y poses aproximadas del video. El proyecto anterior se archiva automáticamente. La cuadrícula de 150 BPM y la coreografía son estimadas; los acentos se sitúan en transitorios del archivo de audio y los cortes principales se reconstruyeron desde el video. El audio no se recorta ni cambia de velocidad. El volumen se ajusta en el transporte. Los bloques y los orígenes visuales son editables; los patches físicos se configuran por separado.

Editor y simulador 3D de tres proyectores superiores, tres jackets y seis láseres de mano. Incluye NEON PROTOCOL / Director Cut: 180 s, 128 BPM y 2.750 bloques editables.

Pulsa Reproducir para ver y escuchar el show. M añade un marcador; R y arrastrar crea un rango. Arrastra una figura o efecto al rango para rellenarlo. En teléfono, Editar abre el panel de propiedades. Los controles de tiempo se desplazan horizontalmente y las pistas verticalmente.

En una pista láser, **Efectos del video** inserta y reproduce una secuencia de 24 s desde el cabezal en los tres proyectores. Reconstruye aproximadamente el cuadrado verde, la corona violeta, el haz móvil, el doble haz, la cuchilla y la pinza del [video de referencia Laser Assassin](https://www.youtube.com/shorts/9Xt6s-nYO7M). Conserva la música, los trajes, las manos y el resto del show; Ctrl+Z deshace la inserción. Las seis figuras también se pueden añadir por separado desde la biblioteca. Al seleccionar un bloque puedes ajustar velocidad, número de haces de la corona y altura de la figura en el simulador. La referencia usa la música del proyecto, sin incorporar el audio ni el video de YouTube.

Guardar descarga el proyecto JSON. Exportar show genera un ZIP con proyecto, tres ILDA, tres RGB, seis manos binarias, marcadores, patch LED y música. Abrir admite JSON o ZIP. Los proyectos, versiones y audios importados se conservan en el navegador de cada dispositivo; no se suben al sitio. Para trasladar un proyecto con música propia, utiliza el ZIP completo. Conserva copias descargadas si borras los datos del navegador.

La web permite editar y simular. La salida física requiere el programa local de LIGHTMAN en el PC del montaje; el panel Salidas puede abrir el operador local. La vista escénica no es una calibración del proyector.

Código y recursos de terceros: ver NOTICE.md y vendor/LICENSE-three.txt. La música fue sintetizada para este proyecto. No se incluyen proyectos de usuarios, credenciales, ejecutables ni transporte USB en la publicación.

## Documentación

- [Guía rápida para compartir (PDF)](docs/guia-rapida.pdf)

- [Manual de uso y controles](docs/uso.md)
- [Plataforma web y almacenamiento](docs/version-web.md)
- [Formatos del proyecto y exportaciones](docs/formatos.md)
- [Dirección y estructura del show](docs/show.md)
- [Pruebas y alcance de validación](docs/validacion.md)


### Movimiento del video y continuidad

ARIUS conserva 3 artistas y usa una envolvente lateral del haz muestreada a 15 fps del video suministrado. Cada bloque muestra «Movimiento medido del video»: 1× respeta los tiempos originales, 0 mantiene la primera muestra y otras velocidades remuestrean la grabación. La curva guarda apertura, centro y fase sin integradores: pausa, seek, bucle y exportación reconstruyen el mismo fotograma. Un recorte conserva sourceOffset; cambiar la duración no estira la velocidad.

En los efectos procedurales, «Reloj del movimiento → Continuo desde el inicio del show» y «Fase inicial» permiten continuar una figura entre bloques. «Desde el inicio del bloque» conserva el comportamiento anterior. Cero permite mantener una figura estática.

Las mediciones son de la imagen de una sola cámara. La profundidad y el sentido de giro de figuras simétricas siguen estimados. Las observaciones ocultas/no fiables se interpolan solo en huecos cortos y se mantienen en huecos largos. `qa/arius-motion-validation.json` detalla cobertura por bloque. No afirmar identidad 3D exacta ni validación física a partir de estas mediciones.


### Programar movimientos con fotogramas clave

Pulsa **◆ Movimiento**. Elige la pista/persona, el efecto y el parámetro. Mueve el cabezal con el deslizador, escribe un segundo exacto o pulsa sobre el gráfico. **K** o **+ Clave en el cabezal** crea un punto. Cambiar su valor actualiza el escenario; arrastrar el punto cambia tiempo y valor en una sola operación deshacible. También hay duplicar, eliminar y una lista de todos los puntos. Las curvas admiten lineal, suave, acelerar, desacelerar y mantener/corte.

Los láseres permiten programar posición horizontal/profundidad, tamaño, giro, apertura, profundidad de figura, altura, velocidad interna, fase, brillo, color y cambios discretos de origen/cantidad de haces. Los LED permiten intensidad, color y velocidad. **Velocidad global del movimiento** acelera/frena todo el recorrido y el efecto; 0× los pausa. La velocidad se integra analíticamente: seek y bucle no acumulan deriva ni reinician fase al cambiar de velocidad. Los efectos LED acelerados repiten su patrón dentro del bloque en vez de apagarse antes de tiempo.

**Cargar curva medida del video** convierte centro, apertura y fase en puntos editables sin cambiar su muestreo. **Cargar movimiento musical** convierte el movimiento anterior. **Restablecer esta curva** recupera la medición original del canal. Las curvas densas se pueden reducir con una tolerancia visible; se conservan extremos y cortes. Esta reducción es intencional y se puede deshacer.

**Crear y reutilizar movimientos** incluye barrido, apertura/cierre, giro, aceleración/pausa, encendido/apagado, copia/pegado con ajuste de duración y aplicación a tres láseres alineados. La biblioteca con nombre se conserva en este navegador. El proyecto JSON/ZIP conserva las curvas aplicadas; las entradas de la biblioteca son preferencias locales.

**Bucle del movimiento** repite el bloque o un intervalo en segundos, independientemente del bucle general. Cámara lenta 0,5×/0,25× solo afecta a la vista previa; detener/salir restaura la velocidad normal. Deshacer/rehacer conserva el bloque seleccionado y sale de la previsualización. El audio nativo es el reloj común. La exportación ILDA y RGB usa el mismo evaluador que el visor. El respaldo LDP conserva efectos base y patch; el muestreo RGB incorpora las curvas.

Las curvas mantienen tiempos de fuente al recortar un bloque. Cambiar su duración no estira automáticamente el movimiento; copiar con Ajustar a la duración sí escala sus claves. La adaptación del video conserva las limitaciones de profundidad/oclusiones documentadas anteriormente. No se validó emisión física durante estas comprobaciones.

### Revisión completa del show contra el video

`?show=arius-ajustado` abre la revisión con las curvas cargadas y el panel ◆ Movimiento. La primera apertura archiva el proyecto anterior; recargar mantiene las modificaciones de esta edición. El botón **Abrir ARIUS ajustado · 7:13** vuelve a cargar el ejemplo revisado explícitamente.

El guion se reconstruye con tiempos absolutos del video. Centro y apertura se miden a 15 fps; color y apagado se revisan a 30 fps. Se corrigen entradas como 3,066667 s (corona violeta), 252,233333 s (prisma RGB) y 425,933333 s (final blanco). Las transiciones observadas viven en las curvas de geometría, brillo y color; los cortes no reciben un fundido adicional. El audio y la velocidad global permanecen a 1×. Los tres artistas conservan su distribución y comparten las mismas curvas.

El proyecto admite hasta 20 MB. Los documentos de más de 2 MB usan IndexedDB para no agotar localStorage. El historial mantiene un presupuesto de 48 MB. Cuando un abanico sale de una muñeca, el simulador evita dibujar además el rayo binario vertical de esa misma mano.

Los pasajes rojos conservan su haz verde interior con curvas propias de brillo, apertura, centro y color. Se admiten hasta 32 rayos para las coronas y abanicos densos. El brillo interior sigue la observación; su geometría y el número de rayos siguen estimados.

`tools/build-full-show.mjs` usa `newKey` y `simplifyKeys`, las mismas herramientas del editor, para convertir el guion y las mediciones en claves nativas. `qa/full-show-validation.json` documenta observaciones, huecos e incertidumbres por tramo. Un marcador ámbar señala ausencia de medición, no una pausa confirmada. Profundidad, giro simétrico, poses y posición de pilotos siguen siendo estimaciones. La publicación 1.2 comprueba la escena 3D, edición de claves, persistencia tras recargar y descarga del proyecto en el navegador. La comparación 3D exacta con la referencia conserva las limitaciones descritas.
