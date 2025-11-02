// =========================================================
// sketch.js: Intervención Generativa de Afiches
// =========================================================

// =========================================================
// 🚨 CONFIGURACIÓN MANUAL (¡AJUSTA ESTO!)
// =========================================================

// 1. Ruta al afiche que quieres usar (desde tu carpeta /poster_dataset)
const POSTER_IMAGE_PATH = '../poster_dataset/afiches_partidos_políticos_chilenos/afiche_afiches_partidos_politicos_chilenos_039.jpg'; 

// 2. El título que quieres generar (ignora acentos, usa mayúsculas)
const TITLE_STRING = "ALLENDE";

// 3. Posición (x, y) donde comenzará el título generativo
const TITLE_X = 0 // 🚨 Píxeles desde la izquierda
const TITLE_Y = 1280; // 🚨 Píxeles desde arriba

// 4. Layout del título
const LETTER_WIDTH = 160;  // Ancho de cada letra generada
// 🚨 CAMBIO: Añadido alto para deformar la letra verticalmente
const LETTER_HEIGHT = 290; // 🚨 Alto de cada letra (ajusta este valor)
const LETTER_SPACING = 0; // Espacio entre letras

// =========================================================
// CONFIGURACIÓN GLOBAL (Basada en tu Celda 3)
// =========================================================
const LATENT_DIM = 64; // 🚨 ¡Confirmado desde tu Celda 3!
const IMG_SIZE = 64;
const MODEL_BASE_URL = '../tfjs_models_final'; // 🚨 ¡Confirmado desde tu repo!

let posterImg; // Variable para el afiche de fondo
let generativeLetters = []; // Array para nuestras letras vivas
let loadedModels = new Map(); // Almacén para los modelos cargados
let posterBgColor; // 🚨 CAMBIO: Variable global para el color de fondo

// --- 1. PRELOAD ---
// Carga el afiche antes de empezar
function preload() {
    posterImg = loadImage(POSTER_IMAGE_PATH, 
        () => console.log("Afiche cargado"), 
        (e) => console.error("Error al cargar el afiche:", e)
    );
}

// --- 2. SETUP ---
async function setup() {
    // Crear un canvas del mismo tamaño que el afiche
    createCanvas(posterImg.width, posterImg.height);
    noSmooth(); // Para la estética pixelada
    
    // 🚨 CAMBIO: Muestrear el color de fondo del afiche
    // Tomamos una muestra 10px adentro de donde empieza el título
    posterBgColor = posterImg.get(TITLE_X + 10, TITLE_Y + 10);
    console.log("Color de fondo del afiche muestreado:", posterBgColor);

    console.log("TensorFlow.js listo. Cargando modelos necesarios...");
    await tf.ready();
    
    // Iniciar el proceso de carga y creación de letras
    await loadGenerativeTitle();
    
    console.log("✅ Título generativo cargado. Iniciando loop.");
}

// --- 3. DRAW ---
// Bucle principal de p5.js
function draw() {
    // 1. Dibuja el afiche original como fondo en cada fotograma
    image(posterImg, 0, 0, width, height);

    // 2. Dibuja cada letra generativa encima
    let currentX = TITLE_X;
    for (const letter of generativeLetters) {
        // Actualiza la mutación de la letra
        letter.update(); 
        
        // 🚨 CAMBIO: Dibuja el canvas con el alto y ancho definidos
        image(letter.canvas, currentX, TITLE_Y, LETTER_WIDTH, LETTER_HEIGHT);
        
        // Mueve la posición X para la siguiente letra
        currentX += LETTER_WIDTH + LETTER_SPACING;
    }
}

// --- 4. LÓGICA DE CARGA DEL TÍTULO ---
async function loadGenerativeTitle() {
    // Encuentra letras únicas
    const lettersNeeded = [...new Set(TITLE_STRING.split(''))]; 
    
    // Cargar solo los modelos que necesitamos para este título
    for (const letter of lettersNeeded) {
        if (!loadedModels.has(letter)) {
            const modelPath = `${MODEL_BASE_URL}/decoder_${letter}/model.json`;
            try {
                const model = await tf.loadGraphModel(modelPath);
                loadedModels.set(letter, model); // Guardar el modelo cargado
            } catch (e) {
                console.error(`Error al cargar el modelo para la letra: ${letter}`, e);
            }
        }
    }
    
    console.log(`Modelos únicos cargados: ${[...loadedModels.keys()]}`);

    // Crear las instancias de las letras generativas
    for (const char of TITLE_STRING.split('')) {
        const model = loadedModels.get(char);
        if (model) {
            generativeLetters.push(new GenerativeLetter(model));
        } else {
            console.warn(`No se pudo crear la letra ${char} (modelo no cargado)`);
        }
    }
}

// --- 5. CLASE DE LETRA GENERATIVA ---
// Esta clase maneja la lógica de CADA letra individualmente
class GenerativeLetter {
    constructor(decoder) {
        this.decoder = decoder;
        this.latentVector = new Array(LATENT_DIM).fill(0);
        this.noiseOffset = random(1000);
        
        // Cada letra tiene su propio canvas (p5.Graphics) de 64x64
        this.canvas = createGraphics(IMG_SIZE, IMG_SIZE);
        this.canvas.noSmooth();
    }

    // Actualiza el vector latente (mutación)
    update() {
        // Mover el ruido Perlin
        this.noiseOffset += 0.02; // Velocidad de mutación
        for (let i = 0; i < LATENT_DIM; i++) {
            this.latentVector[i] = map(noise(this.noiseOffset + i * 0.1), 0, 1, -5, 5);
        }
        
        // Generar la nueva imagen en el canvas de esta letra
        this.generate();
    }

    // Dibuja la letra en su propio canvas (asíncrono)
    async generate() {
        const z_tensor = tf.tensor2d([this.latentVector]);
        try {
            const result_tensor = this.decoder.predict(z_tensor);
            const pixelData = await result_tensor.data();

            // 🚨 CAMBIO: Fondo del canvas usa el color muestreado del afiche
            this.canvas.background(posterBgColor); 
            this.canvas.loadPixels();
            
            const threshold = 127.5;
            let index = 0;
            for (let y = 0; y < IMG_SIZE; y++) {
                for (let x = 0; x < IMG_SIZE; x++) {
                    let grayValue = pixelData[index] * 255;
                    // 🚨 CAMBIO: El color "blanco" ahora es el color del afiche
                    let finalColor = (grayValue > threshold) ? color(0) : posterBgColor; // Letra negra o fondo
                    this.canvas.set(x, y, finalColor);
                    index++;
                }
            }
            this.canvas.updatePixels();

            tf.dispose([z_tensor, result_tensor]);
        } catch (e) {
            console.error("Error en la predicción de GenerativeLetter:", e);
            tf.dispose([z_tensor]);
        }
    }
}

