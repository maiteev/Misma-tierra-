# Oír la luz

**Oír la luz** es una herramienta web para **visualizar el sonido y explorar cómo una imagen en movimiento puede convertirse en sonido**. Funciona con un video, con la cámara web o con una escena de ejemplo. La pantalla se divide en zonas y cada zona suena cuando algo cambia dentro de ella.

La desarrollamos para el curso *Dispositivos periféricos y plataformas para la interacción digital* (DPPI 2026, Escuela de Diseño UDP). Es la demo del **Ejercicio 03 · Escuchar la imagen**.

## Objetivo

La herramienta persigue dos objetivos.

1. **Visualizar el sonido.** Cada variable que se ve en clase (forma de onda, armónicos, attack, release, filtro, reverb, volumen) tiene una representación visible que cambia en tiempo real. Lo que se oye también se puede ver.
2. **Abrir otras posibilidades.** La herramienta es un punto de partida, no un instrumento cerrado. Hoy las zonas tocan notas sintetizadas, pero la misma estructura sirve para que suenen aves, autos, lluvia, animales, voces o cualquier grabación. La idea es que cada proyecto explore qué significa **sonorizar una experiencia**: qué fenómeno escuchamos, con qué sonido lo representamos y qué relación construimos entre ambos. La sección [Usar otros sonidos](#usar-otros-sonidos) explica cómo hacerlo.

## La cadena

```
luz → cámara → píxel → cambio → regla → nota → sonido
```

La máquina no reconoce autos, manos ni personas. Solo compara cada fotograma con el anterior y cuenta cuántos píxeles cambiaron. Todo lo demás es una **regla que diseñamos** (el *mapping*): qué zona produce qué sonido, con qué intensidad y en qué lugar del espacio.

---

## Cómo abrirlo

### En el computador (recomendado para clases)

La cámara y el controlador MIDI solo funcionan si la página se abre desde un servidor local, en Chrome o Edge.

**Windows (PowerShell)**

```
Set-Location "ruta\a\oir-la-luz"
py -m http.server 8123
```

**macOS (Terminal)**

```
cd ruta/a/oir-la-luz
python3 -m http.server 8123
```

Luego:

1. Abrir **http://localhost:8123** en Chrome o Edge.
2. Presionar **▶ Activar sonido** en la barra superior. El navegador no deja sonar audio sin un clic.
3. Para cerrar el servidor, presionar `Ctrl + C` en la terminal.

Si no ves los cambios después de actualizar los archivos, recarga con `Ctrl + F5` o usa otro puerto (por ejemplo `8124`).

### En GitHub Pages

En el repositorio: **Settings → Pages → Deploy from a branch → `main` → `/ (root)`**. Pages usa HTTPS, así que la cámara y el MIDI también funcionan desde el enlace publicado.

---

## La interfaz

La interfaz sigue el sistema visual de *Lo que queda* (Computación Avanzada 2026): barras fijas arriba y abajo, escenario a pantalla completa, dock numerado a la derecha, líneas de 1 px, sin esquinas redondeadas y un grano fino. La paleta es azul noche con amarillo neón como único acento. El título usa Anaktoria.

| Lugar | Qué contiene |
|---|---|
| **Barra superior** | Activar / apagar sonido · Pantalla completa (solo el escenario; `Esc` para salir) |
| **Escenario** | El video con las zonas. Arriba a la izquierda el título y la fuente; abajo a la izquierda la última nota, su frecuencia, la zona y el porcentaje de cambio |
| **Dock 01–07** | Paneles de parámetros (se abren hacia la izquierda; `Esc` los cierra) |
| **Ventana 08 · Señal** | Forma de onda, armónicos, envolvente y partitura |
| **Barra inferior, izquierda** | Fuente: Ejemplo, Cámara (con *Apagar cámara*), Video (con *Play*, *Pausa*, *Loop* y *Cambiar*) |
| **Barra inferior, derecha** | Capas que se encienden y apagan: **Líneas**, **Notas**, **Partículas**, **Señal** |

### Capas del escenario

- **Tono azul.** La zona que suena se tiñe de azul y se desvanece. Siempre está activo; su intensidad se ajusta en el panel 01.
- **Líneas.** La grilla de 1 px, el marco neón de la zona que suena y una barra fina que muestra cuánto cambio hay en cada zona respecto de la sensibilidad.
- **Notas.** El nombre de la nota de cada zona.
- **Partículas.** Puntos breves donde hay cambio, sin estela: violeta si el cambio es suave, neón si es brusco.
- **Señal.** La ventana 08.

Al apagar Líneas, Notas, Partículas y Señal queda **solo el video, el sonido y el tono azul** sobre lo que cambia.

### Paneles del dock

| Panel | Controles |
|---|---|
| **01 · Visualización** | Fondo: *Video* o *Máquina* (la máscara de píxeles que cambiaron: todo lo que el sistema "ve") · Intensidad del tono azul · Oscurecer el video |
| **02 · Teclas** | Columnas (3–12) · Filas (1–3) · Escala (pentatónica mayor, pentatónica menor, mayor, cromática) · Nota base |
| **03 · Detección** | Umbral por píxel · Sensibilidad por zona · Tiempo mínimo entre repeticiones |
| **04 · Sonido** | Fuente sonora: *Catálogo* (Campanas y campanillas de viento con bancos: Multimuestra afinada, Agudas, Graves, Ráfagas, Aleatorio) o *Sintetizador* (seno, triangular, cuadrada, sierra) · Attack · Release · Pasa-bajos · Reverb · Volumen |
| **05 · Mapping** | Intensidad del movimiento → volumen · Posición horizontal → pan · Espejo de la cámara |
| **06 · Grabar** | Grabar lo que suena y descargarlo · Descargar la última nota aislada |
| **07 · MIDI** | Conectar un controlador · Asignar perillas a sliders · Borrar asignaciones |

---

## Cómo funciona por dentro

### 1. Fuente

- **Ejemplo:** una calle sintética dibujada en un canvas, con autos en tres carriles y un pájaro. Toca sola, sin cámara.
- **Cámara:** `getUserMedia` a 640 × 360. Con *espejo* activado la imagen se invierte horizontalmente, como un espejo.
- **Video:** cualquier archivo de video del computador, que se reproduce en silencio y en loop.

### 2. Detección (diferencia entre fotogramas)

Es el mismo principio del Sistema B de *Dos realidades*.

1. Quince veces por segundo, la imagen se reduce a **128 × 72 píxeles** y se convierte a escala de grises (`0,3 R + 0,59 G + 0,11 B`).
2. Cada píxel se compara con el mismo píxel del fotograma anterior. Si la diferencia supera el **umbral por píxel** (por defecto 28 de 255), ese píxel "cambió".
3. Para cada zona se calcula el **porcentaje de píxeles que cambiaron**, suavizado con el valor anterior.
4. Si ese porcentaje supera la **sensibilidad** (por defecto 3 %) y pasó el **tiempo mínimo de repetición** (por defecto 320 ms) desde la última vez, la zona suena.

### 3. Mapping (la regla)

| Dato | Variable sonora |
|---|---|
| Zona (columna) | Nota de la escala elegida |
| Zona (fila) | Octava: la fila de arriba es la más aguda |
| Porcentaje de cambio | Volumen de la nota (si está activado) |
| Posición horizontal de la zona | Pan izquierda–derecha (si está activado) |

La nota se convierte en frecuencia con la fórmula de la afinación temperada, donde *n* es el número de nota MIDI y La4 = 69 = 440 Hz:

```
f = 440 · 2^((n − 69) / 12)
```

Por defecto la escala es **pentatónica**: cualquier combinación de notas suena consonante, algo útil cuando quien toca es un movimiento impreciso.

### 4. Síntesis (Web Audio API)

Cada nota se construye así:

```
oscilador → envolvente → pan → pasa-bajos → (seco + reverb) → volumen → compresor → salida
```

- **Oscilador:** seno, triangular, cuadrada o sierra.
- **Envolvente:** sube en el tiempo de **attack**, baja a un 60 % en ~80 ms, se mantiene 60 ms y cae con el **release**.
- **Pan:** `StereoPannerNode` según la columna.
- **Pasa-bajos:** filtro `lowpass` de 12 dB por octava; deja pasar las frecuencias bajo el **corte**.
- **Reverb:** convolución con una respuesta al impulso generada (ruido que decae en 2,6 s). El slider mezcla la señal seca con la reverberada.
- **Compresor:** evita que muchas notas juntas saturen.

### 5. Visualización de la señal (ventana 08)

| Gráfica | Qué muestra | Qué controles la cambian |
|---|---|---|
| **Forma de onda** | Dos ciclos y medio de la onda elegida. Sin sonido se dibuja la forma ideal; con sonido, la forma ideal queda tenue y encima aparece la señal real, sincronizada al inicio del ciclo y tomada después del filtro | Forma de onda · Pasa-bajos (la cuadrada y la sierra se suavizan) |
| **Armónicos** | Las intensidades teóricas de los armónicos: el seno tiene uno; la cuadrada solo impares (1/n); la triangular impares que caen rápido (1/n²); la sierra todos (1/n). La curva punteada es la respuesta del pasa-bajos; los armónicos sobre el corte se apagan | Forma de onda · Pasa-bajos |
| **Envolvente** | La forma de cada nota en el tiempo, con las marcas A y R. La zona violeta es la cola de reverb. La altura es el volumen. Una línea vertical sigue la última nota | Attack · Release · Reverb · Volumen |
| **Medidor** | El marco muestra el volumen elegido; el relleno, el nivel real que sale | Volumen |
| **Partitura** | Las notas de los últimos 10 s, en altura × tiempo | Todo lo que dispara notas |

Al mover un slider, la parte de la gráfica que controla se ilumina en blanco durante un segundo.

### 6. Grabar y descargar

- **Grabar:** usa `MediaRecorder` sobre la salida final.
- **Descargar última nota:** vuelve a tocar la última nota en una cadena aparte y la graba aislada.
- En la versión local los archivos se descargan en **WAV**. En el enlace publicado en Claude se descargan en **WebM**, porque esa vista no permite WAV.

### 7. Controlador MIDI (Web MIDI API)

1. Conectar el controlador por USB antes de abrir la página.
2. Panel **07** → **Conectar MIDI** → aceptar el permiso.
3. **Asignar** → abrir otro panel → tocar un slider → mover una perilla. Junto al nombre del slider aparece su número, por ejemplo `CC21`.
4. **Asignar** de nuevo para terminar.

Las asignaciones se guardan en el `localStorage` del navegador. Cada perilla (mensaje *Control Change*, 0–127) se escala al rango del slider.

---

## Parámetros y valores por defecto

| Parámetro | Rango | Por defecto |
|---|---|---|
| Columnas / Filas | 3–12 / 1–3 | 5 / 3 |
| Escala | 4 opciones | Pentatónica mayor |
| Nota base | Do3, Sol3, La3, Do4 | Do3 (131 Hz) |
| Umbral por píxel | 8–80 | 28 |
| Sensibilidad | 1–40 % | 3 % |
| Repetición | 60–1200 ms | 320 ms |
| Attack | 1–800 ms | 8 ms |
| Release | 40–3000 ms | 700 ms |
| Pasa-bajos | 200–12000 Hz | 3200 Hz |
| Reverb | 0–100 % | 30 % |
| Volumen | 0–100 % | 60 % |
| Tono azul | 0–60 % | 22 % |

---

## Archivos

```
oir-la-luz/
├── index.html          estructura de la interfaz
├── style.css           sistema visual
├── script.js           toda la lógica
├── fonts/
│   └── anaktoria.woff2 tipografía del título (subconjunto latino)
└── sonidos/
    └── LEEME.md        dónde poner sonidos propios
```

`script.js` está dividido en secciones comentadas:

| Sección | Qué hace |
|---|---|
| `dock` | Abre y cierra los paneles |
| `fuentes` | Ejemplo, cámara y video |
| `capas` | Botones Líneas, Notas, Partículas y Señal |
| `audio` | Cadena de Web Audio y función `voice()`, que toca una nota |
| `descargas` | Grabación, conversión a WAV y descarga |
| `detección` | Diferencia entre fotogramas, energía por zona y disparo de notas (`analyse()`) |
| `dibujo` | Escenario, forma de onda, armónicos, envolvente y partitura |
| `controles` | Sliders y estado |
| `MIDI` | Conexión y asignación de perillas |
| `bucle` | El ciclo de animación |

---

## Usar otros sonidos

Hoy cada zona dispara un **oscilador**. Para que suene una grabación (un ave, un auto, la lluvia, un perro, una voz) hay que reemplazar ese oscilador por una **muestra de audio**. Las variables de la clase siguen funcionando: el filtro, la reverb, el pan y el volumen se aplican igual.

### 1. Conseguir los sonidos

- Formatos: **WAV**, **MP3** u **OGG**, cortos (de 0,3 a 5 s) y sin silencio al inicio.
- Fuentes con licencia abierta: [freesound.org](https://freesound.org) (revisar la licencia de cada archivo) o grabaciones propias con el celular.
- Guardarlos en la carpeta `sonidos/` con nombres simples: `ave.wav`, `auto.wav`, `lluvia.wav`.

### 2. Cargar los sonidos

En `script.js`, dentro de la sección `audio`, después de `initAudio()`:

```js
const BANCO = {};
async function cargarSonido(nombre, url) {
  const datos = await fetch(url).then((r) => r.arrayBuffer());
  BANCO[nombre] = await ac.decodeAudioData(datos);
}
async function cargarBanco() {
  await Promise.all([
    cargarSonido("ave", "sonidos/ave.wav"),
    cargarSonido("auto", "sonidos/auto.wav"),
    cargarSonido("lluvia", "sonidos/lluvia.wav"),
  ]);
}
```

Y llamar a `cargarBanco()` justo después de `initAudio()` en el botón de sonido.

### 3. Reproducir una muestra en vez de una nota

```js
function muestra(nombre, vel, pan, velocidad = 1) {
  if (!BANCO[nombre]) return;
  const src = ac.createBufferSource();
  src.buffer = BANCO[nombre];
  src.playbackRate.value = velocidad; // > 1 más agudo y rápido · < 1 más grave y lento
  const g = ac.createGain(); g.gain.value = 0.8 * vel;
  const p = ac.createStereoPanner(); p.pan.value = pan;
  src.connect(g); g.connect(p); p.connect(main.input); // pasa por el filtro y la reverb
  src.start();
}
```

### 4. Decidir la regla: qué zona suena a qué

En `analyse()`, cambiar la línea que llama a `voice(...)` por una regla propia. Algunos ejemplos:

```js
// a) cada fila es un tipo de sonido: arriba aves, al medio autos, abajo lluvia
const porFila = ["ave", "auto", "lluvia"];
muestra(porFila[r], vel, pan);

// b) un solo sonido que cambia de altura según la nota de la zona
muestra("ave", vel, pan, mtof(m) / mtof(S.root));

// c) mientras más cambio hay, más grave y lento (como algo que se acerca)
muestra("auto", vel, pan, 1.4 - energy[k] * 3);
```

### Ideas para explorar

- **Paisaje sonoro invertido:** un video de una ciudad que suena a bosque, o un bosque que suena a ciudad.
- **Sonificación de datos:** el tráfico de una esquina que se escucha como lluvia; la intensidad del movimiento controla la densidad de gotas.
- **Escucha del cuerpo:** la cámara apunta a quien está frente a la pantalla y cada parte del cuerpo dispara un animal distinto.
- **Memoria de un lugar:** grabar los sonidos reales de un espacio y hacer que el video de ese mismo espacio los "recuerde" cuando algo se mueve.
- **Sonido como advertencia:** un sonido que solo aparece cuando el cambio es brusco (el amarillo neón de las partículas).

Las preguntas de fondo son las del curso: **¿qué fenómeno seleccionamos?, ¿qué dato producimos realmente?, ¿qué regla traduce ese dato en sonido?, ¿qué queda fuera de la escucha del sistema?**

---

## Limitaciones

- La cámara y el MIDI necesitan `localhost` o HTTPS (GitHub Pages), y el MIDI solo funciona en Chrome o Edge.
- La detección es por cambio de brillo: no distingue qué cambió. La luz que parpadea, la cámara que se mueve o la compresión del video también "suenan".
- Con muchas zonas activas a la vez, la forma de onda real es la suma de varias notas y deja de verse limpia. Bajar la sensibilidad o subir el tiempo de repetición ayuda.
- Las barras de armónicos son teóricas; muestran cómo se comporta cada forma de onda, no un análisis del sonido real.

---

## Créditos

- Felipe Roa · Santiago Gaete · DPPI 2026 · Escuela de Diseño UDP.
- Sistema visual a partir de *Lo que queda* (Computación Avanzada 2026).
- Tipografía Anaktoria, de George Douros: uso libre, se permite redistribuir y modificar.
- IBM Plex Sans e IBM Plex Mono vía Google Fonts (SIL Open Font License).
- HTML, CSS y JavaScript sin frameworks: Web Audio API, MediaRecorder, Web MIDI API y Canvas 2D.
