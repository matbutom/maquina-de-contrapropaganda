"""
Generar múltiples hojas A3 usando una grilla generativa del espacio latente,
continuando numeración automáticamente.

Typografica Propagandistica — Rafita Studio
"""

import tensorflow as tf
import numpy as np
from pathlib import Path
from PIL import Image
import re

# =======================================
# CONFIGURACIÓN
# =======================================

LATENT_DIM = 64
IMG_SIZE = 64
NUEVAS_HOJAS = 10        # ← generar 10 nuevas por ejecución
ESCALA_LATENTE = 5.0
A3_DPI = 300

BASE = Path(__file__).resolve().parent.parent
SAVED_MODELS = BASE / "saved_models_temp"
OUTPUT_DIR = BASE / "abecedariosA3_grilla"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

LETRAS = [chr(c) for c in range(ord("A"), ord("Z") + 1)]


# =======================================
# CARGA DE DECODERS
# =======================================

def cargar_decoders():
    modelos = {}
    print(f"Cargando decoders desde: {SAVED_MODELS}\n")

    for letra in LETRAS:
        ruta = SAVED_MODELS / f"decoder_{letra}"
        if not ruta.exists():
            print(f"✗ No encontrado decoder_{letra}")
            continue

        try:
            modelos[letra] = tf.saved_model.load(str(ruta))
            print(f"✓ Cargado decoder_{letra}")
        except Exception as e:
            print(f"⚠️ Error cargando decoder_{letra}: {e}")

    print()
    return modelos


# =======================================
# DETECTAR NUMERACIÓN EXISTENTE
# =======================================

def detectar_ultimo_indice():
    """
    Busca en OUTPUT_DIR archivos como:
    abecedario_A3_grilla_001.png
    y retorna el número máximo encontrado para continuar.
    """
    patron = re.compile(r"abecedario_A3_grilla_(\d+)\.png")

    max_n = 0
    for archivo in OUTPUT_DIR.iterdir():
        m = patron.match(archivo.name)
        if m:
            n = int(m.group(1))
            if n > max_n:
                max_n = n

    return max_n


# =======================================
# LATENTE SUAVE (grilla generativa)
# =======================================

def generar_latente_suave(pagina_idx: int, celda_idx: int) -> np.ndarray:
    seed = pagina_idx * 1000 + celda_idx
    rng = np.random.default_rng(seed)

    coarse_len = 16
    xs_coarse = np.linspace(0, 1, coarse_len)
    xs_full = np.linspace(0, 1, LATENT_DIM)

    coarse_noise = rng.random(coarse_len)
    smooth_noise = np.interp(xs_full, xs_coarse, coarse_noise)

    latent = (smooth_noise * 2 * ESCALA_LATENTE) - ESCALA_LATENTE

    global_offset = rng.normal(loc=0.0, scale=0.5)
    latent = latent + global_offset

    return latent.astype("float32")[None, :]


# =======================================
# GENERAR LETRA
# =======================================

def generar_letra(decoder, z: np.ndarray) -> Image.Image:
    fn = decoder.signatures["serving_default"]
    nombre_input = list(fn.structured_input_signature[1].keys())[0]

    z_tf = tf.convert_to_tensor(z, dtype=tf.float32)
    salida = fn(**{nombre_input: z_tf})
    pred = list(salida.values())[0].numpy()[0]

    pred = (pred * 255).clip(0, 255).astype("uint8")
    arr = pred.squeeze()

    h, w = arr.shape
    rgb = np.ones((h, w, 3), dtype=np.uint8) * 255
    mask = arr < 200
    rgb[mask] = [0, 0, 0]

    return Image.fromarray(rgb, mode="RGB")


# =======================================
# GENERAR HOJA A3
# =======================================

def generar_hoja_A3(modelos, nombre_archivo: str, pagina_idx: int):
    A3_W = int(11.69 * A3_DPI)
    A3_H = int(16.54 * A3_DPI)

    lienzo = Image.new("RGB", (A3_W, A3_H), "white")

    COLS = 4
    ROWS = 8
    CELL_W = A3_W // (COLS + 1)
    CELL_H = A3_H // (ROWS + 1)

    index = 0
    for fila in range(ROWS):
        for col in range(COLS):
            letra = LETRAS[index % len(LETRAS)]
            index += 1

            if letra not in modelos:
                continue

            decoder = modelos[letra]

            celda_id = fila * COLS + col
            z = generar_latente_suave(pagina_idx, celda_id)

            img = generar_letra(decoder, z)

            escala = 4
            img = img.resize((IMG_SIZE * escala, IMG_SIZE * escala), Image.NEAREST)

            x = (col + 1) * CELL_W - img.width // 2
            y = (fila + 1) * CELL_H - img.height // 2
            lienzo.paste(img, (x, y))

    salida = OUTPUT_DIR / nombre_archivo
    lienzo.save(salida, "PNG", dpi=(A3_DPI, A3_DPI))
    print("Guardado:", salida)


# =======================================
# MAIN
# =======================================

def main():
    modelos = cargar_decoders()
    if not modelos:
        print("No se cargaron modelos.")
        return

    ultimo = detectar_ultimo_indice()
    print(f"Último índice existente: {ultimo}")

    inicio = ultimo + 1
    fin = ultimo + NUEVAS_HOJAS

    print(f"\nGenerando {NUEVAS_HOJAS} nuevas hojas A3...")
    print(f"Irán desde {inicio:03d} hasta {fin:03d}.\n")

    for i in range(inicio, fin + 1):
        nombre = f"abecedario_A3_grilla_{i:03d}.png"
        generar_hoja_A3(modelos, nombre, pagina_idx=i)

    print("\nListo. Nuevas hojas en:", OUTPUT_DIR)


if __name__ == "__main__":
    main()
