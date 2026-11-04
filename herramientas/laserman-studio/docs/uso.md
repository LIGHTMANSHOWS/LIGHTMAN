# Manual de uso

## Abrir y reproducir

Abre [LASERMAN Studio](https://lightmanperu.com/herramientas/laserman-studio/) y pulsa **Reproducir**. El navegador necesita una acción del visitante para iniciar el audio. La composición incluida es NEON PROTOCOL / Director Cut, de 180 segundos a 128 BPM.

Hay seis pistas principales: tres proyectores y tres trajes. **Manos** o la flecha de cada traje despliega sus dos subpistas. Cada mano tiene tiempos independientes de encendido/apagado, sin fades. Los botones **M** de las etiquetas silencian una pista y **S** la dejan en solo. No confundir el botón M de pista con el atajo de teclado M, que crea un marcador.

## Marcar y rellenar

1. Sitúa el cabezal pulsando sobre la regla o la onda.
2. Pulsa **M** o **+ Marcador** para registrar ese instante exacto. Un marcador puntual se extiende hasta el siguiente límite marcado; el último no genera un rango útil si está en el final del proyecto.
3. Para una duración explícita, pulsa **R** o **Rango** y arrastra sobre una pista. También sirve **Mayús + arrastrar**, incluso sobre bloques existentes.
4. Selecciona la pista y arrastra una figura o efecto desde la biblioteca. Con **Encajar al rango** activo, ocupa el intervalo marcado. También puedes elegir el efecto y pulsar **Rellenar rango** o **F**.
5. Edita nombre, inicio, fin y color del marcador en el panel derecho. **Enter** confirma un campo. Sus extremos se pueden arrastrar.

El relleno sobrescribe solamente la pista elegida. Conserva los tramos anteriores y posteriores de los bloques afectados, incluida su fase original. Una figura de láser no se coloca en una pista LED ni un efecto LED en un proyector. Al rellenar una mano, las otras manos permanecen independientes.

**Ver rango** amplía la zona marcada y **Ver todo** vuelve al espectáculo completo. **▶ Rango** reproduce ese intervalo; **Bucle** lo repite.

## Editar bloques

Selecciona un bloque para modificar tiempo, duración, color y parámetros. Arrástralo para moverlo o usa el borde derecho para cambiar su duración. **Precisión** ofrece 1/16, 1/8, beat y compás. Desactiva **Ajuste musical** o mantén **Alt** para evitar el ajuste. **Escape** cancela un arrastre en curso.

**Duplicar**, **Eliminar**, **Deshacer** y **Rehacer** permiten revisar cambios. Deshacer usa Ctrl+Z y rehacer Ctrl+Shift+Z. Doble clic en espacio vacío o **+ Bloque** crea contenido. Los acentos LED aparecen como bandas finas: aumenta el zoom para seleccionarlos con precisión.

Los proyectores permiten figura, tamaño, giro, desplazamiento, transición geométrica y fuerza de movimiento musical. **Importar de Laser Studio** incorpora sus fotogramas JSON. Los trajes permiten efecto, intensidad, velocidad y zonas; una capa de acento se suma a la base. Las manos conservan control binario.

## Cámara y pantalla

Usa Frente, Perspectiva, Trajes, Planta o Lateral. Arrastra la escena para orbitar y usa rueda o gesto de acercamiento. **Foto** descarga la escena. La altura inicial de los proyectores es de cuatro metros.

Arrastra la división sobre los controles para cambiar la altura del timeline. En pantalla estrecha, **Editar** abre/cierra las propiedades; los controles se desplazan horizontalmente y las pistas verticalmente. El modo Rango acepta un gesto táctil sobre el timeline.

## Guardar y trasladar el show

**Guardar** descarga un `.laserman.json`. **Exportar show** crea un ZIP que incluye también la música, ILDA, RGB, manos y marcadores. **Abrir** admite ambos formatos. Para cambiar de ordenador o teléfono con música importada, utiliza el ZIP: el JSON por sí solo no transporta el archivo de audio.

En la web, proyectos, versiones y audio importado se guardan en el navegador y no se envían a un servidor de proyectos. Borrar sus datos elimina esas copias locales. Mantén un ZIP descargado como respaldo. El programa de escritorio añade archivos en su carpeta `projects/` y audios en `assets/`.

**Abrir show Director Cut** restaura el show original y archiva antes el proyecto actual. **Proyectos anteriores** permite recuperar esas versiones. En la primera apertura de la actualización también se archiva la edición anterior antes de cargar Director Cut.

## Emisión física

La web permite editar y simular. En **Salidas**, **Abrir operador local** apunta a la aplicación instalada en el PC del montaje; esta debe estar ejecutándose en ese mismo PC. El enlace no instala ni controla un ordenador remoto. El programa local requiere asignar dispositivos y habilitar explícitamente las salidas.

**Parar** y **Escape** detienen reproducción y salida del operador local. La calibración real y la prueba conjunta del montaje se realizan por separado; el tamaño en la escena 3D no representa un ángulo físico calibrado.
