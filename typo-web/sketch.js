let font;
let loaded = false;

// texto automático
let autoText = "Typografica Propagandistica es un proyecto exploratorio de la tipografia en afiches politicos chilenos y de latinoamerica usando codigo e inteligencia artificial";
let autoBuffer = "";
let autoIndex = 0;
let lastAutoType = 0;
let nextAutoDelay = 120; // se recalcula dinámicamente

// texto usuario
let userBuffer = "";
let userTyping = false;
let lastKeyTime = 0;

// cursor
let cursorVisible = true;
let lastCursorBlink = 0;
const CURSOR_BLINK = 450; // ms

const INACTIVITY_TIMEOUT = 3000; // ms
const TEXT_SIZE = 70; // fuente más pequeña

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  background(255);
  textAlign(LEFT, TOP);

  // cargamos la fuente desde typo-web (misma carpeta del sketch)
  opentype.load("TypoGraficaPropagandistica.otf", function (err, f) {
    if (err) {
      console.error("Error cargando fuente:", err);
      return;
    }
    font = f;
    loaded = true;
    console.log("Fuente cargada OK");
  });
}

function draw() {
  background(255);

  // si la fuente aún no está lista, no dibujar
  if (!loaded || !font) return;

  let now = millis();

  // --------------------------
  // cursor titilante
  // --------------------------
  if (now - lastCursorBlink > CURSOR_BLINK) {
    cursorVisible = !cursorVisible;
    lastCursorBlink = now;
  }

  const startX = 50;
  const startY = 150;
  let endPos;

  // --------------------------
  // MODO USUARIO
  // --------------------------
  if (userTyping) {
    if (now - lastKeyTime > INACTIVITY_TIMEOUT) {
      userTyping = false;
      userBuffer = "";
      autoBuffer = "";
      autoIndex = 0;
    }

    // dibujamos SOLO el texto del usuario
    endPos = drawGlyphString(userBuffer, startX, startY, TEXT_SIZE);

    // cursor como línea vertical
    if (cursorVisible && endPos) {
      stroke(0);
      strokeWeight(3);
      // línea algo más alta que la letra
      line(endPos.x, endPos.y - TEXT_SIZE * 0.8, endPos.x, endPos.y + TEXT_SIZE * 0.2);
    }
    return;
  }

  // --------------------------
  // MODO AUTOMÁTICO (máquina + humano)
  // --------------------------
  if (now - lastAutoType > nextAutoDelay) {
    let ch = autoText.charAt(autoIndex % autoText.length);
    autoBuffer += ch;
    autoIndex++;

    lastAutoType = now;
    nextAutoDelay = computeHumanDelay(ch); // velocidad aleatoria
  }

  // dibujar texto automático
  endPos = drawGlyphString(autoBuffer, startX, startY, TEXT_SIZE);

  // cursor al final del texto automático
  if (cursorVisible && endPos) {
    stroke(0);
    strokeWeight(3);
    line(endPos.x, endPos.y - TEXT_SIZE * 0.8, endPos.x, endPos.y + TEXT_SIZE * 0.2);
  }
}

// ---------------------------------------------
// VELOCIDAD HUMANA: pausas irregulares como si alguien escribiera
// ---------------------------------------------
function computeHumanDelay(ch) {
  // base aleatoria
  let d = random(40, 140);

  // pausas más largas al terminar palabras
  if (ch === " ") d += random(80, 220);

  // pausas más largas en signos
  if (".,;:!?…".includes(ch)) d += random(150, 320);

  return d;
}

// ---------------------------------------------
// entrada de teclado
// ---------------------------------------------
function keyTyped() {
  if (!userTyping) {
    userTyping = true;
    autoBuffer = "";
    autoIndex = 0;
    userBuffer = "";
  }
  userBuffer += key;
  lastKeyTime = millis();
}

function keyPressed() {
  if (keyCode === BACKSPACE) {
    userBuffer = userBuffer.slice(0, -1);
    lastKeyTime = millis();
    return false;
  }
}

// ---------------------------------------------
// alternancia entre glifo normal y alternates .ss01
// ---------------------------------------------
function getGlyphWithAlternates(char) {
  if (!font) return null;

  let glyphs = font.stringToGlyphs(char);
  if (!glyphs || glyphs.length === 0) return null;

  if (glyphs.length === 1) return glyphs[0];

  // varios alternates disponibles → elegimos uno al azar
  return glyphs[floor(random(glyphs.length))];
}

// ---------------------------------------------
// dibuja un string con salto de línea automático
// y devuelve la posición final (para el cursor)
// ---------------------------------------------
function drawGlyphString(txt, x, y, size) {
  let ctx = drawingContext;
  let scale = size / font.unitsPerEm;
  let cx = x;
  let cy = y;

  let maxWidth = width - 100;

  for (let c of txt) {
    if (c === "\n") {
      cx = x;
      cy += size * 1.2;
      continue;
    }

    let glyph = getGlyphWithAlternates(c);
    if (!glyph) continue;

    let glyphWidth = glyph.advanceWidth * scale;

    if (cx + glyphWidth > maxWidth) {
      cx = x;
      cy += size * 1.2;
    }

    let path = glyph.getPath(cx, cy, size);
    path.draw(ctx);

    cx += glyphWidth;
  }

  // devolver la posición donde terminó el texto
  return { x: cx, y: cy };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
