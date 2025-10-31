// =========================================================
// sketch.js: CÓDIGO FINAL - Lógica VAE y Z-Manipulation
// =========================================================

// --- Variables Globales ---
// 🚨 ¡Verifica que LATENT_DIM coincida con el valor usado en tu entrenamiento!
const LATENT_DIM = 20; 
const IMG_SIZE = 64;
// RUTA BASE: Asegúrate de que esta URL sea la correcta a tu carpeta tfjs_models en GitHub
// Si usas un servidor local o GitHub Pages (opcionalmente)
const MODEL_BASE_URL = './tfjs_models'; 

// Variables de ml5/p5
let currentDecoder;
let currentLetter = 'A'; 
let latentVector = new Array(LATENT_DIM).fill(0); // Vector Z (inicializado a ceros)
let latentSliders = [];

// Elementos HTML
let letterSelect;
let generateButton;
let slidersContainer;

// ---------------------------------------------------------
// 1. Funciones de p5.js (ASÍNCRONAS - Solución a Error de Inicialización)
// ---------------------------------------------------------

async function setup() {
    console.log("Esperando inicialización de TensorFlow.js...");
    
    // 🚨 CORRECCIÓN CLAVE: Esperar a que TensorFlow.js esté listo para evitar el Error de Backend.
    await tf.ready(); 
    console.log("TensorFlow.js listo. Inicializando p5.js...");

    const canvas = createCanvas(IMG_SIZE, IMG_SIZE);
    canvas.parent('canvas-container');
    pixelDensity(1); 
    
    // Asignar elementos HTML
    letterSelect = select('#letter-select');
    generateButton = select('#generate-button');
    slidersContainer = select('#sliders-container');

    generateButton.mousePressed(generateNewLatentVector);

    // Llenar el selector de letras (A-Z)
    for (let i = 65; i <= 90; i++) {
        const letter = String.fromCharCode(i);
        letterSelect.option(letter);
    }

    setupLatentSliders();
    letterSelect.changed(changeLetter);
    
    // Iniciar la carga del primer modelo
    changeLetter();
}

function draw() {
    // La generación se dispara por eventos (sliders o botón)
    noLoop(); 
}

// ---------------------------------------------------------
// 2. Lógica de Sliders y Vector Latente
// ---------------------------------------------------------

function setupLatentSliders() {
    // Creamos sliders para las 5 primeras dimensiones (las más influyentes)
    const N_SLIDERS = 5; 
    
    slidersContainer.html('');
    latentSliders = [];
    
    for (let i = 0; i < N_SLIDERS; i++) {
        // Rango de -3 a 3 para la desviación estándar (el 99% de los valores Z)
        const slider = createSlider(-3, 3, 0, 0.05); // Min, Max, Valor Inicial (0), Paso
        slider.changed(updateLatentVector); // Generar nueva imagen al soltar o mover
        slider.input(updateLatentVector); 

        slider.parent(slidersContainer);
        
        const label = createDiv(`Z${i+1}:`);
        label.parent(slidersContainer);
        label.style('display', 'inline-block');
        createDiv('').parent(slidersContainer).style('clear', 'both');

        latentSliders.push(slider);
    }
    
    // Inicializar el vector Z con los valores iniciales (todos en 0)
    updateLatentVector(); 
}

function updateLatentVector() {
    // 1. Tomar los valores de los sliders para las N primeras dimensiones
    for(let i = 0; i < latentSliders.length; i++) {
        latentVector[i] = latentSliders[i].value();
    }
    
    // 2. Generar la imagen inmediatamente con el vector Z modificado
    generateImage();
}

function generateNewLatentVector() {
    // Generar un nuevo vector de ruido Z completo (para el botón)
    for (let i = 0; i < LATENT_DIM; i++) {
        latentVector[i] = randomGaussian(); 
    }
    
    // Sincronizar los sliders con los primeros 5 valores del nuevo vector Z
    for(let i = 0; i < latentSliders.length; i++) {
        // Ajustamos el valor si está fuera del rango del slider [-3, 3]
        const clampedValue = constrain(latentVector[i], -3, 3); 
        latentSliders[i].value(clampedValue);
    }
    
    generateImage();
}

// ---------------------------------------------------------
// 3. Carga y Generación del Modelo
// ---------------------------------------------------------

function changeLetter() {
    currentLetter = letterSelect.value();
    const modelPath = `${MODEL_BASE_URL}/decoder_${currentLetter}/model.json`;

    // Mensaje de carga
    background(50);
    fill(255);
    textAlign(CENTER, CENTER);
    text('CARGANDO...', width / 2, height / 2);

    const modelDetails = { model: modelPath };
    currentDecoder = ml5.neuralNetwork(modelDetails, modelLoaded);
}

function modelLoaded() {
    console.log(`Modelo ${currentLetter} cargado. Generando vector Z inicial...`);
    // Aseguramos que el vector Z esté en un estado definido
    if (latentVector.length === 0) {
        latentVector = new Array(LATENT_DIM).fill(0);
    }
    generateImage();
}


function generateImage() {
    if (!currentDecoder) return;

    // 1. Crear el tensor de entrada: [1, LATENT_DIM]
    const z_tensor = tf.tensor2d([latentVector]);

    // 2. Ejecutar la predicción (El Decoder)
    currentDecoder.predict(z_tensor, (error, result) => {
        if (error) {
            console.error('Error al predecir:', error);
            return;
        }
        
        // 3. Obtener los datos del tensor [64, 64, 1]
        // 🚨 CORRECCIÓN CLAVE: Usamos 'result' directamente. ml5 devuelve un array plano, no un Tensor.
        const pixelData = result; 

        // 4. Dibujar la imagen en el Canvas (Escala de Grises)
        loadPixels();
        let index = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Escalar de [0, 1] a [0, 255]
                let grayValue = pixelData[index] * 255;
                
                // Dibujar el píxel en escala de grises (usando el mismo valor para RGB)
                set(x, y, color(grayValue, grayValue, grayValue));
                index++; 
            }
        }
        updatePixels();

        // 5. Limpieza de memoria (Solo limpiamos el tensor que creamos nosotros)
        tf.dispose([z_tensor]);
    });
}