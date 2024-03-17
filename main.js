// Copyright 2024 Jeff Bush
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const SPRITE_BLOCK_SIZE = 8;
const SPRITE_SHEET_W_BLKS = 16;
const SPRITE_SHEET_H_BLKS = 16;
const SPRITE_SHEET_WIDTH = SPRITE_SHEET_W_BLKS * SPRITE_BLOCK_SIZE;
const SPRITE_SHEET_HEIGHT = SPRITE_SHEET_H_BLKS * SPRITE_BLOCK_SIZE;

const BUTTON_L = 1;
const BUTTON_R = 2;
const BUTTON_U = 4;
const BUTTON_D = 8;
const BUTTON_A = 16;
const BUTTON_B = 32;

const BUTTON_MAP = {
  'ArrowUp': BUTTON_U,
  'ArrowLeft': BUTTON_L,
  'ArrowDown': BUTTON_D,
  'ArrowRight': BUTTON_R,
  'z': BUTTON_A,
  'x': BUTTON_B,
};

const PALETTE = [
  0x00000000, // transparent
  0xff000000, // black
  0xffff0000, // red
  0xff00ff00, // light green
  0xff0000ff, // blue
  0xffff00ff, // magenta
  0xffffff00, // yellow
  0xff00ffff, // cyan
  0xff808080, // gray
  0xff00a5ff, // lightblue
  0xffffa500, // orange
  0xff800080, // purple
  0xff008000, // dark green
  0xffa0522d, // brown
  0xffd97162, // salmon
  0xffffffff, // white
];

const INVERSE_PALETTE = new Map();
for (let i = 0; i < PALETTE.length; i++) {
  INVERSE_PALETTE.set(PALETTE[i], i);
}

// spriteBitmap must be kept in sync with spriteData (since bitmaps
// are immutable, we keep spriteData around to modify it).
const spriteData = new ImageData(SPRITE_SHEET_WIDTH, SPRITE_SHEET_HEIGHT);
let spriteBitmap = null;

let outputCanvas = null;
let outputContext = null;
let saveFileName = null;

// Tracks which buttons are currently held.
let buttonMask = 0;

// eslint-disable-next-line no-unused-vars
function startup() {
  outputCanvas = document.getElementById('screen');
  outputContext = outputCanvas.getContext('2d');
  outputContext.imageSmoothingEnabled = false;

  // Intercept tab key so it inserts into the source instead of switching
  // to a different element in the page.
  document.getElementById('source').addEventListener('keydown', (evt) => {
    if (evt.key === 'Tab') {
      evt.preventDefault();
      document.execCommand('insertText', false, '\t');
    }
  });

  document.addEventListener('keydown', function(event) {
    if (event.key in BUTTON_MAP) {
      buttonMask |= BUTTON_MAP[event.key];
    }
  });

  document.addEventListener('keyup', function(event) {
    if (event.key in BUTTON_MAP) {
      buttonMask &= ~BUTTON_MAP[event.key];
    }
  });

  openTab('outputtab', document.getElementsByClassName('tablink')[0]);

  doNew();
  initSpriteEditor();

  const fileSelect = document.getElementById('fileSelect');
  fileSelect.addEventListener('change', function(event) {
    loadFromServer(event.target.value);
  });

  updateFileList();
}

/**
 * Load the list of files on the server from a manifest file.
 * This is explained more in serve.js, but the manifest file allows
 * this to run with its custom server (allowing saving), or from
 * a public web server like github for demo mode.
 */
function updateFileList() {
  fetch('games/manifest.json').then((response) => {
    return response.json();
  }).then((files) => {
    fileSelect.innerHTML = '<option value="">Select a file...</option>';
    const selectOptions = files.map((file) =>
      `<option value="${file}">${file}</option>`);
    fileSelect.innerHTML += selectOptions.join('');
  });
}

// This separates the FORTH source code (above) from the text sprite
// representation (below).
const SPRITE_DELIMITER = '\n--------------------------------\n';

/**
 * Copy source code and sprites to the web server (serve.js), which
 * will save on the local filesystem.
 */
function saveToServer() {
  console.log('Saving to server...');
  if (!saveFileName) {
    saveFileName = window.prompt('Enter filename:');
    document.title = saveFileName;
  }

  if (!saveFileName) {
    return; // cancelled by user
  }

  const content = document.getElementById('source').value +
    SPRITE_DELIMITER + saveSprites();

  fetch(`/save/${saveFileName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: content,
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Unable to save to server');
    }
    console.log('Saved');

    updateFileList();
  }).catch((error) => {
    alert('Error saving text to server:' + error);
  });
}

/**
 * Load source code and sprites from the server. This just
 * uses a normal GET.
 * @param {string} filename Name of file to load
 */
function loadFromServer(filename) {
  stopRun();

  console.log('loadFromServer', filename);
  saveFileName = filename;
  document.title = saveFileName;
  fetch('games/' + saveFileName).then((response) => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return response.text();
  }).then((data) => {
    // Split this into
    const split = data.search(SPRITE_DELIMITER);
    if (split == -1) {
      // This file does not have any sprite data in it.
      document.getElementById('source').value = data;
      clearSprites();
    } else {
      // Load sprites
      const code = data.substring(0, split);
      const sprites = data.substring(split + SPRITE_DELIMITER.length);
      document.getElementById('source').value = code;
      loadSprites(sprites);
    }

    doReset();

    // Important to move focus away from this, otherwise user
    // input for the game ends up loading another file.
    document.getElementById('fileSelect').blur();
  }).catch((error) => {
    alert('Error loading file');
  });
}

/**
 * Given a string containing the sprite data (as stored in the file),m
 * populate the spriteBitmap and spriteData. Each pixel is stored as a single
 * digit, a hex value 0-15. These are references into the PALETTE table.
 * @param {string} text Hex encoded version of sprite data
 * @see saveSprites
 */
function loadSprites(text) {
  clearSprites();

  let outIndex = 0;
  for (let i = 0; i < text.length; i++) {
    if (!/\s/.test(text[i])) {
      const rgba = PALETTE[parseInt(text[i], 16)];
      spriteData.data[outIndex++] = rgba & 0xff;
      spriteData.data[outIndex++] = (rgba >> 8) & 0xff;
      spriteData.data[outIndex++] = (rgba >> 16) & 0xff;
      spriteData.data[outIndex++] = (rgba >> 24) & 0xff;
    }
  }

  createImageBitmap(spriteData).then((bm) => {
    spriteBitmap = bm;
    invalidate(); // Sprite editor
  });
}

/**
 * Convert array to packed vlaue
 * @param {number[]} rgba Uint8ClampedArray of four values.
 * @returns {number} Single packed integer.
 */
function packRGBA(rgba) {
  // the >>> 0 converts back to unsigned.
  return ((rgba[3] << 24) | (rgba[2] << 16) | (rgba[1] << 8) | rgba[0]) >>> 0;
}

/**
 * Takes the current sprite sheet and converts it to a string suitable for
 * storing in a text file. The format is described in loadSprites.
 * @returns {string} Hex representation of image data
 * @see loadSprites
 */
function saveSprites() {
  // We ignore any zeroes at the end to save space. Walk backward
  // to determine how many there are.
  const zero = PALETTE[0];
  let dataEnd = spriteData.data.length;
  while (dataEnd > 0) {
    const rgba = packRGBA(spriteData.data.slice(dataEnd, dataEnd + 4));
    if (rgba != zero) {
      break;
    }

    dataEnd -= 4;
  }

  result = '';
  for (let i = 0; i <= dataEnd; i += 4) {
    const rgba = packRGBA(spriteData.data.slice(i, i + 4));
    const index = INVERSE_PALETTE.get(rgba);
    result += index.toString(16);
    if (((i / 4) % SPRITE_SHEET_WIDTH) == SPRITE_SHEET_WIDTH - 1) {
      result += '\n';
    }
  }

  return result;
}

/**
 * Set the sprite sheet to be fully transparent.
 */
function clearSprites() {
  for (let i = 0; i < SPRITE_SHEET_WIDTH * SPRITE_SHEET_HEIGHT * 4; i++) {
    spriteData.data[i] = 0;
  }

  createImageBitmap(spriteData).then((bm) => {
    spriteBitmap = bm;
    invalidate(); // Sprite editor
  });
}

/**
 * Start a new project, clearing out source code, sprites, etc.
 */
function doNew() {
  stopRun();

  saveFileName = '';
  document.title = 'Untitled';
  document.getElementById('source').value = ': draw_frame ; ';

  clearSprites();
  clearScreen(0);
}

/**
 * Copy text into an area in the web interface that shows program output.
 * This is usually invoked from the forth '.' word.
 * @param {string} text What to write.
 */
function writeConsole(text) {
  document.getElementById('output').textContent += text;
}

/**
 * Convert a color value into a CSS string.
 * @param {number} value A packed RGBA value
 * @returns {string} CSS string representing the color.
 */
function makeColorString(value) {
  return `rgb(${(value >> 16) & 0xff}, ${(value >> 8) & 0xff}, ${(value & 0xff)})`;
}

/**
 * Erase the entire drawing area.
 * @param {number} color Index (0-15) into the pallete for the color.
 */
function clearScreen(color) {
  outputContext.fillStyle = makeColorString(PALETTE[color & 15]);
  outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
}

function drawLine(left, top, right, bottom) {
  outputContext.beginPath();
  outputContext.moveTo(left, top);
  outputContext.lineTo(right, bottom);
  outputContext.stroke();
}

function fillRect(left, top, width, height) {
  outputContext.fillRect(left, top, width, height);
}

/**
 * Set the color to be used by subsequent drawLine and fillRect
 * calls. This is invoked as a FORTH word.
 * @param {number} color Index into palette table, 0-15
 */
function setColor(color) {
  const colorStr = makeColorString(PALETTE[color & 15]);
  outputContext.strokeStyle = colorStr;
  outputContext.fillStyle = colorStr;
}

/**
 * Draw a sprite onto the screen. This is invoked as a FORTH word.
 * @param {number} x Horizontal offset, in pixels
 * @param {number} y Vertical offset in pixels .
 * @param {number} w Width, as a number of 8 pixel blocks.
 * @param {number} h Height, as a number of 8 pixel blocks.
 * @param {number} index Index into sprite array, in terms of 8x8 pixel blocks,
 *     numbered left to right, top to bottom.
 */
function drawSprite(x, y, w, h, index) {
  const sheetRow = Math.floor(index / SPRITE_SHEET_W_BLKS);
  const sheetCol = index % SPRITE_SHEET_W_BLKS;
  const pixWidth = w * SPRITE_BLOCK_SIZE;
  const pixHeight = h * SPRITE_BLOCK_SIZE;
  outputContext.drawImage(spriteBitmap, sheetCol * SPRITE_BLOCK_SIZE, sheetRow *
    SPRITE_BLOCK_SIZE, pixWidth, pixHeight, x, y, pixWidth, pixHeight);
}

/**
 * Read virtual joystick buttons (up/down/left/right/a/b)
 * @returns {number} A bitmask of held buttons
 */
function getButtons() {
  return [buttonMask];
}

let drawFrameTimer = null;
let drawFramcoloreAddr = -1;

/**
 * Called to render a frame to the screen. This invokes the FORTH interpreter
 * to allow the game code to do the actual rendering of the frame, then
 * sets a timer to call itself at the next frame interval.
 * @param {ForthContext} ctx
 */
function drawFrame(ctx) {
  try {
    ctx.exec(drawFrameAddr);

    drawFrameTimer = setTimeout(() => {
      drawFrame(ctx);
    }, 16);
  } catch (err) {
    clearTimeout(drawFrameTimer);
    drawFrameTimer = -1;
    updateStopButton();

    alert(err);
  }
}

// This code is invoked when the game interpreter is created to add
// any game specific words.
const GAME_BUILTINS = `
${BUTTON_L} constant BUTTON_L
${BUTTON_R} constant BUTTON_R
${BUTTON_U} constant BUTTON_U
${BUTTON_D} constant BUTTON_D
${BUTTON_A} constant BUTTON_A
${BUTTON_B} constant BUTTON_B

128 constant SCREEN_WIDTH
128 constant SCREEN_HEIGHT
`;

/**
 * Called to set up the interpreter and start running code.
 */
// eslint-disable-next-line no-unused-vars
function doReset() {
  try {
    const ctx = new ForthContext();
    ctx.bindNative('cls', 1, clearScreen);
    ctx.bindNative('set_color', 1, setColor);
    ctx.bindNative('draw_line', 4, drawLine);
    ctx.bindNative('draw_sprite', 5, drawSprite);
    ctx.bindNative('.', 1, (val) => {
      writeConsole(val + '\n');
    });
    ctx.bindNative('buttons', 0, getButtons);
    ctx.bindNative('fill_rect', 4, fillRect);
    ctx.bindNative('beep', 2, playBeep);
    ctx.interpretSource(GAME_BUILTINS);

    ctx.interpretSource(document.getElementById('source').value);
    document.getElementById('output').textContent = '';

    drawFrameAddr = ctx.lookupWord('draw_frame');
    if (drawFrameAddr === undefined) {
      throw new Error('draw_frame not defined');
    }

    clearTimeout(drawFrameTimer);
    drawFrame(ctx);
    updateStopButton();
  } catch (err) {
    clearTimeout(drawFrameTimer);
    drawFrameTimer = -1;
    updateStopButton();
    alert(err);
  }
}

function stopRun() {
  if (drawFrameTimer != -1) {
    clearTimeout(drawFrameTimer);
    drawFrameTimer = -1;
    updateStopButton();
  }
}

/**
 * Set the stop button to be enabled/disabled depending on the state of the
 * game engine.
 */
function updateStopButton() {
  document.getElementById('stop_button').disabled = drawFrameTimer == -1;
}

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playBeep(frequency, duration) {
  const oscillator = audioContext.createOscillator();
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.connect(audioContext.destination);
  oscillator.type = 'square';
  oscillator.start();
  setTimeout(() => {
    oscillator.stop();
  }, duration);
}

function openTab(pageName, element) {
  for (const tab of document.getElementsByClassName('tabcontent')) {
    tab.style.display = 'none';
  }

  for (const tab of document.getElementsByClassName('tablink')) {
    tab.className = tab.className.replace(' active', '');
  }

  document.getElementById(pageName).style.display = 'block';
  element.className += ' active';
}

