'use strict';

// Copyright 2024 Jeff Bush
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

let spriteCanvas = null;
let spriteContext = null;
// spriteBitmap and spriteData are inherited from main.js

/**
 * Base class for any UI component.
 */
class View {
  constructor(width, height) {
    this.children = [];
    this.xoffs = 0;
    this.yoffs = 0;
    this.width = width;
    this.height = height;
  }

  addChild(view, xoffs, yoffs) {
    view.xoffs = xoffs;
    view.yoffs = yoffs;
    this.children.push(view);
  }

  mouseDown(x, y) {}
  mouseMoved(x, y) {}
  mouseUp(x, y) {}
  draw(context) {}
}

let root = null;

function repaint() {
  spriteContext.fillStyle = 'white';
  spriteContext.fillRect(0, 0, spriteCanvas.width, spriteCanvas.height);

  function recurse(view) {
    spriteContext.save();
    spriteContext.translate(view.xoffs, view.yoffs);
    view.draw(spriteContext);
    for (const child of view.children) {
      recurse(child);
    }
    spriteContext.restore();
  }

  recurse(root);
}

function invalidate() {
  setTimeout(repaint, 0);
}

function dispatchMouse(event, callback) {
  function recurse(view, cx, cy) {
    if (cx >= view.xoffs && cy >= view.yoffs && cx < view.xoffs + view.width &&
      cy < view.yoffs + view.height) {
      cx -= view.xoffs;
      cy -= view.yoffs;
      for (const child of view.children) {
        const found = recurse(child, cx, cy);
        if (found) {
          return true;
        }
      }

      callback(view, cx, cy);
      return true;
    }

    return false;
  }

  const rect = event.target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  recurse(root, x, y);
}

function handleMouseDown(event) {
  dispatchMouse(event, (view, x, y) => {
    view.mouseDown(x, y);
  });
}

function handleMouseUp(event) {
  dispatchMouse(event, (view, x, y) => {
    view.mouseUp(x, y);
  });
}

function handleMouseMoved(event) {
  dispatchMouse(event, (view, x, y) => {
    view.mouseMoved(x, y);
  });
}

let checkerPattern = null;

class UndoBuffer {
  constructor() {
    this.actions = [];
    this.undoIndex = 0;
  }

  do(action) {
    if (this.undoIndex < this.actions.length) {
      this.actions.length = this.undoIndex;
    }

    this.actions.push(action);
    this.undoIndex = this.actions.length;
  }

  undo() {
    if (this.undoIndex > 0) {
      return this.actions[--this.undoIndex];
    } else {
      return null;
    }
  }

  redo() {
    if (this.undoIndex < this.actions.length) {
      return this.actions[this.undoIndex++];
    } else {
      return null;
    }
  }
}

class SpriteEditorModel {
  constructor() {
    this.selectedRow = 0;
    this.selectedCol = 0;
    this.currentColor = 0;
    this.spriteSize = 1;
    this.brushSize = 1;
    this.undoBuffer = new UndoBuffer();
  }
}


const MAP_SIZE = 400;

/**
 * This view has two purposes: show all of the sprites in the map,
 * and selecting which sprites the editor view currently points to.
 */
class SpriteMapView extends View {
  constructor(width, height, model) {
    super(width, height);
    this.model = model;
  }

  draw(context) {
    if (!spriteBitmap) {
      return; // Not initialized yet
    }

    // This represents transparent areas.
    context.fillStyle = checkerPattern;
    context.fillRect(1, 1, MAP_SIZE, MAP_SIZE);

    context.drawImage(spriteBitmap, 1, 1,
        MAP_SIZE, MAP_SIZE);
    context.strokeStyle = 'black';
    context.strokeRect(0, 0, MAP_SIZE + 2, MAP_SIZE + 2);

    const spriteWidth = MAP_SIZE / SPRITE_SHEET_W_BLKS;
    const spriteHeight = MAP_SIZE / SPRITE_SHEET_H_BLKS;

    context.beginPath();
    context.strokeStyle = 'red';
    const selectLeft = this.model.selectedCol * spriteWidth + 1;
    const selectTop = this.model.selectedRow * spriteHeight + 1;
    context.strokeRect(selectLeft, selectTop,
        spriteWidth * this.model.spriteSize,
        spriteHeight * this.model.spriteSize);
  }

  mouseDown(x, y) {
    if (x <= MAP_SIZE + 2 && y <= MAP_SIZE + 2) {
      this.model.selectedCol = Math.floor(x / (MAP_SIZE /
        SPRITE_SHEET_W_BLKS));
      if (this.model.selectedCol + this.model.spriteSize >
        SPRITE_SHEET_W_BLKS) {
        this.model.selectedCol = SPRITE_SHEET_W_BLKS - this.model.spriteSize;
      }

      if (this.model.selectedRow + this.model.spriteSize >
        SPRITE_SHEET_H_BLKS) {
        this.model.selectedRow = SPRITE_SHEET_H_BLKS - this.model.spriteSize;
      }

      this.model.selectedRow = Math.floor(y / (MAP_SIZE /
        SPRITE_SHEET_H_BLKS));
      invalidate();
    }
  }
}

/**
 * This view allows turning individual pixels on and off.
 */
class EditView extends View {
  constructor(width, height, model) {
    super(width, height);
    this.model = model;
    this.mouseIsDown = false;
  }

  draw(context) {
    if (!spriteBitmap) {
      return; // Not initialized yet
    }

    // This represents transparent areas.
    context.fillStyle = checkerPattern;
    context.fillRect(0, 0, this.width, this.height);

    const left = this.model.selectedCol * SPRITE_BLOCK_SIZE;
    const top = this.model.selectedRow * SPRITE_BLOCK_SIZE;
    const size = this.model.spriteSize * SPRITE_BLOCK_SIZE;
    context.drawImage(spriteBitmap, left, top, size,
        size, 0, 0, this.width, this.height);

    // Draw grid lines
    context.strokeStyle = '#808080';
    const numLines = this.model.spriteSize * 8;
    const pixelSize = this.width / numLines;
    for (let i = 1; i < numLines; i++) {
      const offs = i * pixelSize;
      context.beginPath();
      context.moveTo(offs, 0);
      context.lineTo(offs, this.height);
      context.stroke();
      context.beginPath();
      context.moveTo(0, offs);
      context.lineTo(this.width, offs);
      context.stroke();
    }

    context.strokeStyle = 'black';
    context.strokeRect(0, 0, this.width, this.height);
  }

  mouseDown(x, y) {
    this.mouseIsDown = true;
    this._setPixel(x, y);
  }

  mouseUp(x, y) {
    this.mouseIsDown = false;
  }

  mouseMoved(x, y) {
    if (this.mouseIsDown) {
      this._setPixel(x, y);
    }
  }

  _setPixel(x, y) {
    const size = this.model.spriteSize * SPRITE_BLOCK_SIZE;
    const left = this.model.selectedCol * SPRITE_BLOCK_SIZE;
    const top = this.model.selectedRow * SPRITE_BLOCK_SIZE;
    const coloffs = Math.floor(x * size / this.width);
    const rowoffs = Math.floor(y * size / this.height);
    const colorVal = PALETTE[this.model.currentColor];
    const col = left + coloffs;
    const row = top + rowoffs;

    const oldPixel = getPixel(col, row);
    if (!oldPixel.every((val, index) => val === colorVal[index])) {
      this.model.undoBuffer.do([col, row, oldPixel, colorVal]);
      setPixel(col, row, colorVal);
    }
  }
}

/**
 * Select which color to paint, from the system palette of 16.
 */
class ColorPicker extends View {
  constructor(width, height, model) {
    super(width, height);
    this.model = model;
    this.swatchWidth = width / 8;
    this.swatchHeight = height / 2;
  }

  draw(context) {
    const NUM_COLS = 8;
    const NUM_ROWS = 2;
    for (let col = 0; col < NUM_COLS; col++) {
      for (let row = 0; row < NUM_ROWS; row++) {
        context.fillStyle = makeColorString(PALETTE[row *
            NUM_COLS + col]);
        context.fillRect(col * this.swatchWidth, row * this.swatchHeight,
            this.swatchWidth, this.swatchHeight);
      }
    }

    context.fillStyle = checkerPattern;
    context.fillRect(0, 0, this.swatchWidth, this.swatchHeight);

    context.strokeStyle = 'black';
    context.strokeRect(0, 0, this.width, this.height);

    const selectedCol = Math.floor(this.model.currentColor % NUM_COLS);
    const selectedRow = Math.floor(this.model.currentColor / NUM_COLS);
    context.strokeStyle = 'black';
    context.lineWidth = 4;
    context.strokeRect(selectedCol * this.swatchWidth,
        selectedRow * this.swatchHeight, this.swatchWidth,
        this.swatchHeight);
    context.lineWidth = 1;
  }

  mouseDown(x, y) {
    const col = Math.floor(x / this.swatchWidth);
    const row = Math.floor(y / this.swatchHeight);
    this.model.currentColor = row * 8 + col;
    invalidate();
  }
}

/**
 * Allows selecting how many 8x8 sprite chunks the editor window
 * covers.
 */
class SliderControl extends View {
  constructor(width, height, label, numDetents) {
    super(width, height);
    this.label = label;
    this.numDetents = numDetents;
    this.currentValue = 0;
    this.dragging = false;
  }

  draw(context) {
    context.strokeStyle = 'black';
    context.strokeRect(0, 10, this.width, 6);
    for (let i = 0; i < this.numDetents; i++) {
      const x = Math.floor(this.width / (this.numDetents - 1) * i);
      context.beginPath();
      context.moveTo(x, 10);
      context.lineTo(x, 16);
      context.stroke();
    }

    const thumbX = Math.floor(this.width / (this.numDetents - 1) *
      this.currentValue);
    const thumbWidth = 10;
    context.fillStyle = 'black';
    context.strokeStyle = 'black';
    context.beginPath();
    context.moveTo(thumbX, 10);
    context.lineTo(thumbX + thumbWidth / 2, 5);
    context.lineTo(thumbX + thumbWidth / 2, 0);
    context.lineTo(thumbX - thumbWidth / 2, 0);
    context.lineTo(thumbX - thumbWidth / 2, 5);
    context.lineTo(thumbX, 10);
    context.fill();
    context.fillText(this.label, 4, 26);
  }

  setValue(val) {
  }

  mouseDown(x, y) {
    this._updateThumb(x);
    this.dragging = true;
  }

  mouseUp(x, y) {
    this.dragging = false;
  }

  mouseMoved(x, y) {
    if (this.dragging) {
      this._updateThumb(x);
    }
  }

  _updateThumb(x) {
    this.currentValue = Math.min(Math.floor(x / (this.width / this.numDetents)),
        this.numDetents - 1);
    this.setValue(this.currentValue);
    invalidate();
  }
}

class SpriteSizeControl extends SliderControl {
  constructor(width, height, model) {
    super(width, height, 'Sprite Size', 3);
    this.model = model;
  }

  setValue(value) {
    const SIZES = [1, 2, 4];
    this.model.spriteSize = SIZES[value];

    // Ensure this is in-bounds still
    if (this.model.selectedCol + this.model.spriteSize > SPRITE_SHEET_W_BLKS) {
      this.model.selectedCol = SPRITE_SHEET_W_BLKS - this.model.spriteSize;
    }

    if (this.model.selectedRow + this.model.spriteSize > SPRITE_SHEET_H_BLKS) {
      this.model.selectedRow = SPRITE_SHEET_H_BLKS - this.model.spriteSize;
    }

    invalidate();
  }
}

class SpriteIndexView extends View {
  constructor(width, height, model) {
    super(width, height);
    this.model = model;
  }

  draw(context) {
    context.font = '12px monospace';
    context.fillStyle = 'black';
    context.fillText('Sprite #' + (this.model.selectedRow *
      SPRITE_SHEET_W_BLKS + this.model.selectedCol), 0, 12);
  }
}

function getPixel(x, y) {
  const pixelIndex = (y * spriteBitmap.width + x) * 4;
  return spriteData.data.slice(pixelIndex, pixelIndex + 4);
}

function setPixel(x, y, colorVal) {
  const pixelIndex = (y * spriteBitmap.width + x) * 4;
  const pix = spriteData.data;
  for (let i = 0; i < 4; i++) {
    pix[pixelIndex + i] = colorVal[i];
  }

  setNeedsSave();
  createImageBitmap(spriteData).then((bm) => {
    spriteBitmap = bm;
    repaint();
  });
}

function undoAction(undoBuffer) {
  const entry = undoBuffer.undo();
  if (entry) {
    setPixel(entry[0], entry[1], entry[2]);
  }
}

function redoAction(undoBuffer) {
  const entry = undoBuffer.redo();
  if (entry) {
    setPixel(entry[0], entry[1], entry[3]);
  }
}

/**
 * Copy the currently edited sprite to the clipboard.
 * @param {SpriteEditorModel} model
 */
async function copyCanvas(model) {
  const canvas = document.createElement('canvas');
  canvas.width = model.spriteSize * 8;
  canvas.height = canvas.width;
  const context = canvas.getContext('2d');

  const left = model.selectedCol * SPRITE_BLOCK_SIZE;
  const top = model.selectedRow * SPRITE_BLOCK_SIZE;
  const size = model.spriteSize * SPRITE_BLOCK_SIZE;
  context.drawImage(spriteBitmap, left, top, size,
      size, 0, 0, canvas.width, canvas.height);

  const dataURL = canvas.toDataURL('image/png');
  const blob = await (await fetch(dataURL)).blob();
  const clipboardItem = new ClipboardItem({'image/png': blob});
  navigator.clipboard.write([clipboardItem]).catch((error) => {
    console.error('Unable to copy to clipboard:', error);
  });
}

async function pasteCanvas(event, model) {
  const items = event.clipboardData.items;
  for (const item of items) {
    if (item.type === 'image/png' || item.type === 'image/jpeg') {
      const blob = item.getAsFile();
      const pasteBitmap = await createImageBitmap(blob);
      const left = model.selectedCol * SPRITE_BLOCK_SIZE;
      const top = model.selectedRow * SPRITE_BLOCK_SIZE;
      const size = model.spriteSize * SPRITE_BLOCK_SIZE;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = spriteBitmap.width;
      tempCanvas.height = spriteBitmap.height;
      const tempContext = tempCanvas.getContext('2d');
      tempContext.imageSmoothingEnabled = false;
      tempContext.drawImage(spriteBitmap, 0, 0);
      tempContext.drawImage(pasteBitmap, 0, 0,
          pasteBitmap.width, pasteBitmap.height,
          left, top, size, size, 0, 0);
      spriteBitmap = await createImageBitmap(tempCanvas);
      spriteData.data.set(tempContext.getImageData(0, 0,
          tempCanvas.width, tempCanvas.height).data);
      setNeedsSave();
      invalidate();
      break;
    }
  }
}

/**
 * Called once when page is initially loaded to set up resources related
 * to the sprite editor.
 */
// eslint-disable-next-line no-unused-vars
function initSpriteEditor() {
  spriteCanvas = document.getElementById('sprite_edit');
  spriteContext = spriteCanvas.getContext('2d');
  spriteContext.imageSmoothingEnabled = false;
  checkerPattern = makeCheckerPattern(spriteContext);

  spriteCanvas.addEventListener('mousedown', handleMouseDown);
  spriteCanvas.addEventListener('mouseup', handleMouseUp);
  spriteCanvas.addEventListener('mousemove', handleMouseMoved);
  root = new View(spriteCanvas.width, spriteCanvas.height);
  const model = new SpriteEditorModel();

  root.addChild(new EditView(320, 320, model), 30, 32);
  root.addChild(new SpriteMapView(512, 512, model), 380, 24);
  root.addChild(new ColorPicker(320, 32, model), 30, 360);
  root.addChild(new SpriteSizeControl(64, 32, model), 30, 400);
  root.addChild(new SpriteIndexView(32, 16, model), 148, 12);
  repaint();


  const tab = document.getElementById('spritestab');
  document.addEventListener('keydown', (event) => {
    if (window.getComputedStyle(tab).display !== 'none') {
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        event.preventDefault();
        copyCanvas(model);
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        undoAction(model.undoBuffer);
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault();
        redoAction(model.undoBuffer);
      }
    }
  });

  document.addEventListener('paste', (event) => {
    if (window.getComputedStyle(tab).display !== 'none') {
      event.preventDefault();
      pasteCanvas(event, model);
    }
  });
}

/**
 * This is a checkerboard pattern of white and gray squares, used to indicate
 * areas of transparency.
 * @param {CanvasRenderingContext2D} context The context that this will be
 *     drawn onto.
 * @return {CanvasPattern} A pattern
 */
function makeCheckerPattern(context) {
  const checkerSize = 10;

  const miniCanvas = document.createElement('canvas');
  miniCanvas.width = checkerSize;
  miniCanvas.height = checkerSize;
  const miniCtx = miniCanvas.getContext('2d');

  miniCtx.fillStyle = 'white';
  miniCtx.fillRect(0, 0, checkerSize, checkerSize);

  miniCtx.fillStyle = '#ddd';
  miniCtx.fillRect(checkerSize / 2, 0, checkerSize / 2, checkerSize / 2);
  miniCtx.fillRect(0, checkerSize / 2, checkerSize / 2, checkerSize / 2);

  return context.createPattern(miniCanvas, 'repeat');
}
