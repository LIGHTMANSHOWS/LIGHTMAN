export const categories = [
  {id:'shows',name:'Shows sincronizados',short:'Shows LED',path:'showsyncro.html',image:'hero2.webp',intro:'Música, coreografía y luz que se mueven como una sola puesta en escena.'},
  {id:'activaciones',name:'Activaciones y branding',short:'Activaciones',path:'activaciones.html',image:'galerias/bandera/bandera-00.webp',intro:'Formatos visuales para presentar tu marca, recibir al público y transformar un lanzamiento.'},
  {id:'trajes',name:'Trajes y personajes',short:'Trajes LED',path:'trajes.html',image:'trajes/robot-led-lightman.webp',intro:'Personajes luminosos para entradas, escenarios, fotografías y recorridos.'},
  {id:'estructuras',name:'Estructuras y ambientación',short:'Estructuras',path:'estructuras.html',image:'hero1.webp',intro:'Diseño y operación de instalaciones LED para escenarios y espacios.'}
];
const item=(id,name,category,image,description,extra={})=>({id,name,category,image,description,...extra});
export const products = [
 item('arbol-navideno-led','Árbol navideño LED · 12 m','estructuras','arbol-navidad-led.png','Explora tres diseños de árbol en 3D, con efectos de luz y música sincronizada. Propuesta conceptual de Navidad San Fernando.',{href:'/propuestas/navidad-san-fernando/'}),
 item('banderas-led','Banderas LED digitales','activaciones','galerias/bandera/bandera-00.webp','Luz, contenido y movimiento en una superficie flexible. Un formato para aperturas y activaciones de marca.',{video:'DVzoQfEjTRW',gallery:['galerias/bandera/bandera-01.webp','galerias/bandera/bandera-02.webp','galerias/bandera/bandera-03.webp','galerias/bandera/bandera-04.webp'],features:['Alimentación con baterías','Control inalámbrico','Contenido visual según modelo','Integración Resolume / Art-Net, previa coordinación']}),
 item('tijeras-led','Tijeras LED Syncro','shows','tije.webp','Tradición andina reinterpretada con programación de luz y una puesta en escena sincronizada.',{video:'DWnRe6MDdTR',gallery:['hero2.webp','syncro2.webp','galerias/andino/andino-00.webp']}),
 item('robot-led-lightman','Robot LED Lightman','trajes','trajes/robot-led-lightman.webp','Un personaje de gran presencia para ingresos, escenarios y momentos de encuentro con el público.',{video:'CypT5liNP2F'}),
 item('tubos-led-360','Tubos LED 360','estructuras','tubos360.webp','Composiciones de luz para delinear escenarios, crear volúmenes y acompañar el contenido de un concierto.',{video:'DY2wju-u81M',gallery:['tubos360-01.webp','scn5.webp','scn2.webp']}),
 item('tambores-led','Tambores y batucada LED','shows','tmbsy.webp','Percusión y programación visual para una presentación que combina ritmo, movimiento y luz.',{video:'DPzSY7wkkmz',start:186}),
 item('urban-syncro','Urban Syncro','shows','ubns.webp','Coreografías urbanas acompañadas por secuencias LED programadas para la puesta en escena.'),
 item('tron-syncro','Tron + pantalla','shows','trns.webp','Siluetas luminosas y recursos visuales que construyen una experiencia de estética futurista.'),
 item('riders-led','Riders LED','shows','rdrsy.webp','Un formato escénico de movimiento y luz que se adapta a la propuesta del evento.'),
 item('poi-diablo','Poi Diablo','shows','dblsy.webp','Malabares luminosos para sumar movimiento y trazos de luz a una presentación.'),
 item('holograma-led','Holograma LED','activaciones','holo.webp','Un recurso visual para explorar contenido de marca en stands, exhibiciones y presentaciones.'),
 item('poi-led','Pois LED','activaciones','trajes/diablo-poi.webp','Movimiento y secuencias luminosas para acompañar una activación o intervención escénica.'),
 item('robot-led-piso','Robot LED de piso','trajes','trajes/robot-led-piso.webp','Un formato cercano al público para recepciones, fotografías y activaciones.'),
 item('pixel-led','Pixel LED','trajes','trajes/pixel-led.webp','Un traje con matriz visual para secuencias, contenido y shows sincronizados.'),
 item('urban-led','Urban LED','trajes','trajes/urban-led.webp','Estética urbana para coreografías, fiestas y presencia escénica.'),
 item('tron-led','Tron LED','trajes','trajes/tron-led.webp','Líneas luminosas para escenas tecnológicas y presentaciones nocturnas.'),
 item('stickman-led','Stickman LED','trajes','trajes/stickman-led.webp','Siluetas luminosas para rutinas grupales y momentos de entretenimiento.'),
 item('danzante-tijera-led','Danzante de Tijera LED','trajes','trajes/danzante-tijera-led.webp','Tradición y luz para espectáculos culturales e ingresos temáticos.'),
 item('diablo-urban','Diablo Urban','trajes','trajes/diablo-urban.webp','Un personaje visual para comparsas, intervenciones y shows temáticos.'),
 item('galactica-led','Galáctica LED','trajes','trajes/galactica-led.webp','Estética espacial para recepciones y performance visual.'),
 item('hada-futurista','Hada Futurista','trajes','trajes/hada-futurista.webp','Un personaje de fantasía para recepción de invitados y fotografías.'),
 item('hula-futurista','Hula Futurista','trajes','trajes/hula-futurista.webp','Movimiento circular y efectos de luz para intervenciones escénicas.'),
 item('marote-led','Marote LED','trajes','trajes/marote-led.webp','Un personaje móvil para ingresos, recorridos y pasacalles.'),
 item('calavera-led','Calavera LED','trajes','trajes/calavera-led.webp','Una propuesta temática para fiestas, Halloween y espectáculos nocturnos.'),
 item('alas-led','Alas LED','trajes','trajes/alas-led.webp','Un recurso visual amplio para entradas y composiciones fotográficas.'),
 item('alas-led-gigantes','Alas LED gigantes','trajes','trajes/alas-led-gigantes.webp','Luz a mayor escala para escenarios, recepciones y momentos especiales.'),
 item('tela-led','Tela LED rectangular','estructuras','Bled.webp','Una superficie luminosa que se integra a la composición visual del montaje.'),
 item('matrix-led','Matrix LED','estructuras','matriz.webp','Matrices de puntos de luz para composiciones visuales y ambientación.'),
 item('neon-flex','Neón Flex','estructuras','flex-01.webp','Delineados luminosos para resaltar formas, recorridos y estructuras.'),
 item('instalacion-pixel','Instalación LED Pixel','estructuras','scn5.webp','Diseño, montaje y control de elementos LED según el espacio y la propuesta visual.',{video:'DTjWdqPDVvo',gallery:['scn2.webp','scn4.webp','scen3.webp']})
];
export const references = ['01-banderas-grupo.webp','03-bandera-logo.webp','04-bandera-traje-led.webp','05-bandera-artista.webp','02-banderas-duo.webp'];
