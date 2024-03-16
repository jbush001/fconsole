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

// These are automatically kept in sync (spriteBitmap is recreated when
// spriteData changes)
let spriteData = new ImageData(SPRITE_SHEET_WIDTH,
    SPRITE_SHEET_HEIGHT);
for (let i = 0; i < SPRITE_SHEET_WIDTH * SPRITE_SHEET_HEIGHT; i++) {
  spriteData.data[i * 4] = 0;
  spriteData.data[i * 4 + 1] = 0;
  spriteData.data[i * 4 + 2] = 0;
  spriteData.data[i * 4 + 3] = 0xff;
}
let spriteBitmap = null;
createImageBitmap(spriteData).then((bm) => {
  spriteBitmap = bm;
});

let outputCanvas = null;
let outputContext = null;
let saveFileName = null;

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
  clearScreen(0);

  initSpriteEditor();

  const fileSelect = document.getElementById('fileSelect');
  fileSelect.addEventListener('change', function(event) {
    loadFromServer(event.target.value);
  });

  updateFileList();
}

function updateFileList() {
  fetch('/games/manifest.json').then((response) => {
    return response.json();
  }).then((files) => {
    fileSelect.innerHTML = '<option value="">Select a file...</option>';
    const selectOptions = files.map((file) =>
      `<option value="${file}">${file}</option>`);
    fileSelect.innerHTML += selectOptions.join('');
  });
}

const SPRITE_DELIMITER = '\n--------------------------------\n';

function saveToServer() {
  console.log('Saving to server...');
  if (!saveFileName) {
    saveFileName = window.prompt('Enter filename:');
    document.title = saveFileName;
  }

  if (!saveFileName) {
    return; // cancelled
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
    if (split != -1) {
      const code = data.substring(0, split);
      const sprites = data.substring(split + SPRITE_DELIMITER.length);
      document.getElementById('source').value = code;
      loadSprites(sprites);
    } else {
      document.getElementById('source').value = data;
    }
  }).catch((error) => {
    alert('Error loading file');
  });
}

function loadSprites(text) {
  for (let i = 0; i < text.length; i += 2) {
    spriteData.data[i / 2] = parseInt(text.substr(i, 2), 16);
  }
  createImageBitmap(spriteData).then((bm) => {
    spriteBitmap = bm;
    invalidate(); // Sprite editor
  });
}

function saveSprites() {
  function byteToHex(byte) {
    return ('0' + byte.toString(16)).slice(-2);
  }

  return Array.from(spriteData.data, byteToHex).join('');
}

function doNew() {
  saveFileName = '';
  document.title = 'Untitled';
  document.getElementById('source').value = '';
  createImageBitmap(spriteData).then((bm) => {
    spriteBitmap = bm;
    invalidate(); // Sprite editor
  });
}

function writeConsole(text) {
  document.getElementById('output').textContent += text;
}

const COLOR_STRS = [
  'black',
  'red',
  'magenta',
  'green',
  'yellow',
  'blue',
  'cyan',
  'white',
];

function clearScreen(color) {
  outputContext.fillStyle = COLOR_STRS[color];
  outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputContext.stroke();
}

function drawLine(left, top, right, bottom) {
  outputContext.beginPath();
  outputContext.moveTo(left, top);
  outputContext.lineTo(right, bottom);
  outputContext.stroke();
}

function fillRect(left, top, width, height) {
  outputContext.beginPath();
  outputContext.fillRect(left, top, width, height);
  outputContext.stroke();
}

function setColor(color) {
  outputContext.strokeStyle = COLOR_STRS[color & 7];
  outputContext.fillStyle = COLOR_STRS[color & 7];
}

function drawSprite(x, y, w, h, index) {
  const sheetRow = Math.floor(index / SPRITE_SHEET_W_BLKS);
  const sheetCol = index % SPRITE_SHEET_W_BLKS;
  const pixWidth = w * SPRITE_BLOCK_SIZE;
  const pixHeight = h * SPRITE_BLOCK_SIZE;
  outputContext.drawImage(spriteBitmap, sheetCol * SPRITE_BLOCK_SIZE, sheetRow *
    SPRITE_BLOCK_SIZE, pixWidth, pixHeight, x, y, pixWidth, pixHeight);
}

function getButtons() {
  return [buttonMask];
}

let drawFrameTimer = null;
let drawFrameAddr = -1;

function drawFrame(ctx) {
  try {
    ctx.exec(drawFrameAddr);

    drawFrameTimer = setTimeout(() => {
      drawFrame(ctx);
    }, 16);
  } catch (err) {
    alert(err);
  }
}

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

// eslint-disable-next-line no-unused-vars
function doRun() {
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
  } catch (err) {
    alert(err);
  }
}

function stopRun() {
  if (drawFrameTimer != -1) {
    clearTimeout(drawFrameTimer);
    drawFrameTimer = -1;
  }
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

