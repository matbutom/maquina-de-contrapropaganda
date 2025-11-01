// =========================================================
// sketch.js: Grilla Generativa Masiva (Aleatoria y Asíncrona)
// =========================================================

// --- Variables Globales de Configuración ---
const LATENT_DIM = 64; 
const IMG_SIZE = 64;
const MODEL_BASE_URL = '../tfjs_models_final'; 

// 🚨 CAMBIO: Aumentamos el número de celdas para llenar la pantalla verticalmente
const NUM_CELLS = 160; // (Antes era 150) ¡Ajusta este número si aún ves espacios!

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
    
    // 3. 🚨 CAMBIO: Crear 300 celdas
    for (let i = 0; i < NUM_CELLS; i++) {
        let cellDiv = document.createElement('div');
        cellDiv.className = 'grid-cell';
        gridContainer.appendChild(cellDiv);
        
        // 4. Asignar un modelo aleatorio
        const randomModel = allModels[Math.floor(Math.random() * allModels.length)];
        
        // 5. Asignar velocidades aleatorias
        const randomFrameRate = Math.random() * (15 - 2) + 2;
        const randomMutationSpeed = Math.random() * (0.1 - 0.02) + 0.02;

        // 6. Crear el sketch con los parámetros aleatorios
        new p5(sketchWrapper(randomModel, randomFrameRate, randomMutationSpeed), cellDiv);
    }
}

/**
 * Fábrica de sketches.
 * @param {tf.GraphModel} decoder - El modelo TF.js cargado (aleatorio).
 * @param {number} frameRate - La velocidad de fotogramas aleatoria.
 * @param {number} mutationSpeed - La velocidad de mutación aleatoria.
 */
const sketchWrapper = (decoder, frameRate, mutationSpeed) => {
    
    return (s) => {
        let latentVector = new Array(LATENT_DIM).fill(0);
        let noiseOffset; 

        s.setup = () => {
            s.createCanvas(IMG_SIZE, IMG_SIZE);
            s.noSmooth(); 
            s.frameRate(frameRate); 
            noiseOffset = s.random(1000); 
            updateLatentVector();
        };

        s.draw = async () => {
            if (!decoder) return; 
            
            updateLatentVector();
            await generateImage(s, latentVector, decoder);
            
            noiseOffset += mutationSpeed; 
        };

        function updateLatentVector() {
            // Usamos el rango amplio (-5 a 5) para "sacudir" los modelos colapsados
            for (let i = 0; i < LATENT_DIM; i++) {
                latentVector[i] = s.map(s.noise(noiseOffset + i * 0.1), 0, 1, -10, 5);
            }
        }
    };
};

/**
 * Función auxiliar (global) para generar una imagen (B&N Invertido).
 */
async function generateImage(s, z_vector, decoder) {
    const z_tensor = tf.tensor2d([z_vector]);

    try {
        const result_tensor = decoder.predict(z_tensor);
        const pixelData = await result_tensor.data();

        // Fondo blanco de la celda (Como lo pediste)
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

