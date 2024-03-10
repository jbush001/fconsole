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

let canvas = null;
let context = null;
let spriteSheet = null;

const SPRITE_SIZE = 8;
const SPRITE_SHEET_W = 16;
const SPRITE_SHEET_H = 16;

const BUTTON_L = 1;
const BUTTON_R = 2;
const BUTTON_U = 4;
const BUTTON_D = 8;
const BUTTON_A = 16;
const BUTTON_B = 32;

const BUTTON_MAP = {
  'w': BUTTON_U,
  'a': BUTTON_L,
  's': BUTTON_D,
  'd': BUTTON_R,
  ',': BUTTON_A,
  '.': BUTTON_B,
};

let buttonMask = 0;

// eslint-disable-next-line no-unused-vars
function startup() {
  canvas = document.getElementById('screen');
  context = canvas.getContext('2d');

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

  const spriteSheetWidth = SPRITE_SHEET_W * SPRITE_SIZE;
  const spriteSheetHeight = SPRITE_SHEET_H * SPRITE_SIZE;
  const spriteData = context.createImageData(spriteSheetWidth,
      spriteSheetHeight);

  function setPixel(x, y, value) {
    const doffs = x + y * 128;
    spriteData.data[doffs * 4] = value & 0xff;
    spriteData.data[doffs * 4 + 1] = (value >> 8) & 0xff;
    spriteData.data[doffs * 4 + 2] = (value >> 16) & 0xff;
    spriteData.data[doffs * 4 + 3] = (value >> 24) & 0xff;
  }

  const rawData = [
    0xff000000, 0xff000000, 0xff000000, 0xffff0000,
    0xffff0000, 0xff000000, 0xff000000, 0xff000000,
    0xff000000, 0xff000000, 0xffff0000, 0xffff0000,
    0xffff0000, 0xffff0000, 0xff000000, 0xff000000,
    0xff000000, 0xffff0000, 0xffff0000, 0xffff0000,
    0xffff0000, 0xffff0000, 0xffff0000, 0xff000000,
    0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000,
    0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000,
    0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000,
    0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000,
    0xff000000, 0xffff0000, 0xffff0000, 0xffff0000,
    0xffff0000, 0xffff0000, 0xffff0000, 0xff000000,
    0xff000000, 0xff000000, 0xffff0000, 0xffff0000,
    0xffff0000, 0xffff0000, 0xff000000, 0xff000000,
    0xff000000, 0xff000000, 0xff000000, 0xffff0000,
    0xffff0000, 0xff000000, 0xff000000, 0xff000000,
  ];

  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      const soffs = x + y * SPRITE_SIZE;
      setPixel(x, y, rawData[soffs]);
    }
  }

  setPixel(8, 0, 0xff00ff00);
  setPixel(9, 1, 0xff00ff00);
  setPixel(10, 2, 0xff00ff00);
  setPixel(11, 3, 0xff00ff00);
  setPixel(12, 4, 0xff00ff00);
  setPixel(13, 5, 0xff00ff00);
  setPixel(14, 6, 0xff00ff00);
  setPixel(15, 7, 0xff00ff00);

  createImageBitmap(spriteData).then((bm) => {
    spriteSheet = bm;
  });

  // window.addEventListener('beforeunload', () => {
  //   saveToServer();
  // });

  const fileSelect = document.getElementById('fileSelect');
  fileSelect.addEventListener('change', function(event) {
    handleFileSelect(event);
  });

  const files = ['pong.fth', 'quadblox.fth'];
  const selectOptions = files.map((file) =>
    `<option value="${file}">${file}</option>`);
  fileSelect.innerHTML += selectOptions.join('');
}

function saveToServer() {
  console.log('saving text');
  const content = document.getElementById('source').value;
  console.log('content', content);
  fetch('/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({content}),
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Failed to save text to server');
    }
    console.log('Saved');
  }).catch((error) => {
    alert('Error saving text to server:' + error);
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
  context.fillStyle = COLOR_STRS[color];
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.stroke();
}

function drawLine(left, top, right, bottom) {
  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(right, bottom);
  context.stroke();
}

function fillRect(left, top, width, height) {
  context.beginPath();
  context.fillRect(left, top, width, height);
  context.stroke();
}

function setColor(color) {
  context.strokeStyle = COLOR_STRS[color & 7];
  context.fillStyle = COLOR_STRS[color & 7];
}

function drawSprite(x, y, w, h, index) {
  const sheetRow = Math.floor(index / SPRITE_SHEET_W);
  const sheetCol = index % SPRITE_SHEET_W;
  const pixWidth = w * SPRITE_SIZE;
  const pixHeight = h * SPRITE_SIZE;
  context.drawImage(spriteSheet, sheetCol * SPRITE_SIZE, sheetRow * SPRITE_SIZE,
      pixWidth, pixHeight, x, y, pixWidth, pixHeight);
}

function getButtons() {
  return [buttonMask];
}

let timer = null;
let drawFrameAddr = -1;

function drawFrame(ctx) {
  try {
    ctx.exec(drawFrameAddr);

    timer = setTimeout(() => {
      drawFrame(ctx);
    }, 16);
  } catch (err) {
    alert(err);
  }
}

// eslint-disable-next-line no-unused-vars
function doRun() {
  console.log('started');
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
    ctx.bindNative('beep', 2, playBeep)

    console.log('compiling');
    ctx.interpretSource(document.getElementById('source').value);
    console.log('done');
    for (const key in ctx.dictionary) {
      console.log(key, ctx.dictionary[key].value);
    }

    document.getElementById('output').textContent = '';

    if (!('draw_frame' in ctx.dictionary)) {
      throw new Error('draw_frame not defined');
    }

    drawFrameAddr = ctx.dictionary['draw_frame'].value;
    clearTimeout(timer);
    drawFrame(ctx);
  } catch (err) {
    alert(err);
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

function handleFileSelect(event) {
  const selectedFile = event.target.value;
  fetch(selectedFile).then((response) => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.text();
  }).then((data) => {
    document.getElementById('source').value = data;
    // setInterval(saveToServer, 10000);
  }).catch((error) => {
    alert('Error loading file');
  });
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
