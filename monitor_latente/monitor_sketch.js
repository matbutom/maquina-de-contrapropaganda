// =========================================================
// monitor_sketch.js: Visualizador Experimental (8x8 Grid)
// =========================================================

const LATENT_DIM = 64; // 8x8 = 64
const GRID_SIZE = 8; 
let currentLatentVector = new Array(LATENT_DIM).fill(0);
let canvas;
let cellWidth, cellHeight;
// 🚨 CAMBIO: Ya no necesitamos la variable 'fontMono'

// 🚨 CAMBIO: Se elimina la función preload() por completo, 
// ya que el .html carga la fuente 'IBM Plex Mono' con una etiqueta <link>.

function setup() {
    let container = select('#canvas-container');
    canvas = createCanvas(container.width, container.height);
    canvas.parent(container);
    
    noStroke();
    
    // 🚨 CAMBIO: Le decimos a p5.js que use el *nombre* de la fuente 
    // que el archivo .html ya cargó.
    textFont('IBM Plex Mono');
    
    // Calcular tamaño de celdas
    cellWidth = width / GRID_SIZE;
    cellHeight = height / GRID_SIZE;

    // Dibujar el estado inicial
    drawLatentGrid(currentLatentVector);

    // Escuchador de eventos de LocalStorage
    window.addEventListener('storage', (event) => {
        if (event.key === 'live_latent_vector_z') {
            try {
                const newVector = JSON.parse(event.newValue);
                if (newVector && newVector.length === LATENT_DIM) {
                    currentLatentVector = newVector;
                    drawLatentGrid(currentLatentVector);
                }
            } catch (e) {
                console.warn("Error al parsear el vector latente de localStorage:", e);
            }
        }
    });

    noLoop(); // El dibujo es 100% controlado por eventos
}

/**
 * Dibuja la grilla de 8x8 con los valores del vector.
 * @param {Array} vector - El array de 64 números.
 */
function drawLatentGrid(vector) {
    if (!vector) return; // Añadido chequeo de seguridad

    background(0); // Fondo negro

    // Ajustar el tamaño del texto basado en el tamaño de la celda
    textSize(cellWidth * 0.25); // Experimental: 25% del ancho

    for (let i = 0; i < LATENT_DIM; i++) {
        const val = vector[i] || 0; // Usar 0 si el valor es nulo/undefined
        
        // Coordenadas de la celda
        const x = (i % GRID_SIZE) * cellWidth;
        const y = Math.floor(i / GRID_SIZE) * cellHeight;

        // 1. Visualización del Fondo (Brillo)
        const brightness = map(abs(val), 0, 5, 0, 255); 
        fill(brightness);
        rect(x, y, cellWidth, cellHeight);

        // 2. Visualización del Texto (Número)
        if (brightness > 120) {
            fill(0); // Texto negro
        } else {
            fill(255); // Texto blanco
        }
        
        let numString = val.toFixed(2);
        
        textAlign(CENTER, CENTER);
        text(numString, x + (cellWidth / 2), y + (cellHeight / 2));
    }
}

// Redimensionar el canvas si la ventana cambia
function windowResized() {
    let container = select('#canvas-container');
    // Asegurarse de que el contenedor tenga dimensiones
    if (container.width > 0 && container.height > 0) {
        resizeCanvas(container.width, container.height);
        // Recalcular el tamaño de las celdas
        cellWidth = width / GRID_SIZE;
        cellHeight = height / GRID_SIZE;
        // Volver a dibujar
        drawLatentGrid(currentLatentVector);
    }
}

