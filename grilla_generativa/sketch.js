// =========================================================
// sketch.js: Grilla Generativa (Transmisor de LocalStorage)
// =========================================================

// --- Variables Globales de Configuración ---
const LATENT_DIM = 64; 
const IMG_SIZE = 64;
const MODEL_BASE_URL = '../tfjs_models_final'; 

// Tus configuraciones personalizadas
const NUM_CELLS = 160; 
const FRAME_RATE_PER_CELL = 19; 

/**
 * Función principal asíncrona.
 */
async function main() {
    await tf.ready();
    console.log("TensorFlow.js listo.");

    // 1. Definir las 26 letras (A-Z)
    const letters = [];
    for (let i = 65; i <= 90; i++) { // A-Z
        letters.push(String.fromCharCode(i));
    }
    
    console.log(`Cargando ${letters.length} modelos (A-Z) en paralelo...`);

    // 2. Cargar los 26 modelos base
    const modelPromises = letters.map(letter => {
        const modelPath = `${MODEL_BASE_URL}/decoder_${letter}/model.json`;
        return tf.loadGraphModel(modelPath);
    });

    let allModels;
    try {
        allModels = await Promise.all(modelPromises);
        console.log(`✅ Todos los ${letters.length} modelos base fueron cargados.`);
    } catch (error) {
        console.error("Error fatal al cargar los modelos base:", error);
        return; 
    }
    
    const gridContainer = document.getElementById('grid-container');
    
    // 3. Crear 160 celdas
    for (let i = 0; i < NUM_CELLS; i++) {
        let cellDiv = document.createElement('div');
        cellDiv.className = 'grid-cell';
        gridContainer.appendChild(cellDiv);
        
        // 4. Asignar un modelo aleatorio
        const randomModel = allModels[Math.floor(Math.random() * allModels.length)];
        
        // 5. Asignar velocidades aleatorias
        const randomFrameRate = Math.random() * (15 - 2) + 2;
        const randomMutationSpeed = Math.random() * (0.1 - 0.02) + 0.02;

        // 6. 🚨 CAMBIO: Pasar el índice 'i' (cellID) al sketch
        new p5(sketchWrapper(randomModel, randomFrameRate, randomMutationSpeed, i), cellDiv);
    }
}

/**
 * Fábrica de sketches.
 * @param {tf.GraphModel} decoder - El modelo TF.js cargado (aleatorio).
 * @param {number} frameRate - La velocidad de fotogramas aleatoria.
 * @param {number} mutationSpeed - La velocidad de mutación aleatoria.
 * @param {number} cellID - El índice de esta celda (0 a 159).
 */
const sketchWrapper = (decoder, frameRate, mutationSpeed, cellID) => { // 🚨 CAMBIO: Recibe cellID
    
    return (s) => {
        let latentVector = new Array(LATENT_DIM).fill(0);
        let noiseOffset; 

        s.setup = () => {
            s.createCanvas(IMG_SIZE, IMG_SIZE);
            s.noSmooth(); 
            s.frameRate(frameRate); // Usa el frame rate aleatorio
            noiseOffset = s.random(1000); 
            updateLatentVector();
        };

        s.draw = async () => {
            if (!decoder) return; 
            
            updateLatentVector(s.map(s.noise(noiseOffset), 0, 1, -5, 5));
            await generateImage(s, latentVector, decoder);
            
            noiseOffset += mutationSpeed; // Usa la velocidad de mutación aleatoria

            // ---------------------------------------------------------
            // 🚨 CAMBIO: TRANSMISOR DE LOCALSTORAGE
            // ---------------------------------------------------------
            // Si esta es la primera celda (ID 0), transmite su vector
            if (cellID === 0) {
                try {
                    // Convertimos el array de 64 números a un string JSON
                    localStorage.setItem('live_latent_vector_z', JSON.stringify(latentVector));
                } catch (e) {
                    // (Ignorar error si localStorage está desactivado o lleno)
                }
            }
        };

        function updateLatentVector(global_offset = 0) {
            for (let i = 0; i < LATENT_DIM; i++) {
                latentVector[i] = s.map(s.noise(noiseOffset + i * 0.1), 0, 1, -5, 5) + global_offset;
            }
        }
    };
};

/**
 * Función auxiliar (global) para generar una imagen (B&N Invertido).
 * (Esta función se mantiene igual que en tu código)
 */
async function generateImage(s, z_vector, decoder) {
    const z_tensor = tf.tensor2d([z_vector]);

    try {
        const result_tensor = decoder.predict(z_tensor);
        const pixelData = await result_tensor.data();

        // Fondo blanco de la celda
        s.background(255); 
        
        s.loadPixels();
        let index = 0;
        
        const threshold = 127.5; 

        for (let y = 0; y < s.height; y++) {
            for (let x = 0; x < s.width; x++) {
                let grayValue = pixelData[index] * 255; 
                
                // Lógica de color (Letra Negra / Fondo Blanco)
                let finalColor = (grayValue > threshold) ? 0 : 255;
                
                s.set(x, y, s.color(finalColor));
                index++; 
            }
        }
        s.updatePixels();

        tf.dispose([z_tensor, result_tensor]); 

    } catch (error) {
        // No imprimimos errores de predicción para no saturar la consola
        // console.error("Error en predicción:", error); 
        tf.dispose([z_tensor]);
    }
}

// Iniciar todo el proceso
main();

