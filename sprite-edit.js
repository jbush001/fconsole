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
  spriteContext.stroke();

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

// ----------------------------------------------------------

let checkerPattern = null;

class SpriteEditorModel {
  constructor() {
    this.selectedRow = 0;
    this.selectedCol = 0;
    this.currentColor = 0;
    this.spriteSize = 1;
  }
}

const MAP_SIZE = 400;
const MAP_X_OFFSET = 1;
const MAP_Y_OFFSET = 1;

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
    context.fillRect(MAP_X_OFFSET, MAP_Y_OFFSET, MAP_SIZE, MAP_SIZE);


    context.drawImage(spriteBitmap, MAP_X_OFFSET, MAP_Y_OFFSET,
        MAP_SIZE, MAP_SIZE);
    context.strokeStyle = 'black';
    context.strokeRect(MAP_X_OFFSET - 1, MAP_Y_OFFSET - 1,
        MAP_SIZE + 2, MAP_SIZE + 2);

    const spriteWidth = MAP_SIZE / SPRITE_SHEET_W_BLKS;
    const spriteHeight = MAP_SIZE / SPRITE_SHEET_H_BLKS;

    context.beginPath();
    context.strokeStyle = 'red';
    const selectLeft = this.model.selectedCol * spriteWidth + MAP_X_OFFSET;
    const selectTop = this.model.selectedRow * spriteHeight + MAP_Y_OFFSET;
    context.strokeRect(selectLeft, selectTop,
        spriteWidth * this.model.spriteSize,
        spriteHeight * this.model.spriteSize);

    context.font = '16px monospace';
    context.fillStyle = 'black';
    context.fillText('sprite ' + (this.model.selectedRow * SPRITE_SHEET_W_BLKS +
        this.model.selectedCol), MAP_X_OFFSET, MAP_SIZE + MAP_Y_OFFSET + 16);
  }

  mouseDown(x, y) {
    if (x >= MAP_X_OFFSET && y >= MAP_Y_OFFSET &&
          x <= MAP_X_OFFSET + MAP_SIZE && y <= MAP_Y_OFFSET + MAP_SIZE) {
      this.model.selectedCol = Math.floor((x - MAP_X_OFFSET) / (MAP_SIZE /
        SPRITE_SHEET_W_BLKS));
      if (this.model.selectedCol + this.model.spriteSize >
        SPRITE_SHEET_W_BLKS) {
        this.model.selectedCol = SPRITE_SHEET_W_BLKS - this.model.spriteSize;
      }

      if (this.model.selectedRow + this.model.spriteSize >
        SPRITE_SHEET_H_BLKS) {
        this.model.selectedRow = SPRITE_SHEET_H_BLKS - this.model.spriteSize;
      }

      this.model.selectedRow = Math.floor((y - MAP_Y_OFFSET) / (MAP_SIZE /
        SPRITE_SHEET_H_BLKS));
      invalidate();
    }
  }
}

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
    const dx = Math.floor(x * size / this.width);
    const dy = Math.floor(y * size / this.height);
    const pixelIndex = ((top + dy) * spriteBitmap.width + left +
        dx) * 4;
    const colorVal = PALETTE[this.model.currentColor];
    const a = (colorVal >> 24) & 0xff;
    const r = (colorVal >> 16) & 0xff;
    const g = (colorVal >> 8) & 0xff;
    const b = colorVal & 0xff;
    const pix = spriteData.data;
    pix[pixelIndex] = r;
    pix[pixelIndex + 1] = g;
    pix[pixelIndex + 2] = b;
    pix[pixelIndex + 3] = a;
    createImageBitmap(spriteData).then((bm) => {
      spriteBitmap = bm;
      repaint();
    });
  }
}

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

class SpriteSizeControl extends View {
  constructor(width, height, model) {
    super(width, height);
    this.model = model;
  }

  draw(context) {
    context.font = '12px monospace';
    context.fillStyle = 'black';
    context.fillText('size', 4, 10);
    context.fillText('1' + (this.model.spriteSize == 1 ? ' *' : ''), 4, 20);
    context.fillText('2' + (this.model.spriteSize == 2 ? ' *' : ''), 4, 40);
    context.fillText('4' + (this.model.spriteSize == 4 ? ' *' : ''), 4, 60);
  }

  mouseDown(x, y) {
    if (y > 50) {
      this.model.spriteSize = 4;
    } else if (y > 30) {
      this.model.spriteSize = 2;
    } else {
      this.model.spriteSize = 1;
    }

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
  root.addChild(new SpriteMapView(512, 512, model), 395, 32);
  root.addChild(new EditView(350, 350, model), 5, 35);
  root.addChild(new ColorPicker(350, 32, model), 5, 400);
  root.addChild(new SpriteSizeControl(32, 64, model), 360, 32);
  repaint();
}

function makeCheckerPattern(context) {
  const checkerSize = 15;

  const miniCanvas = document.createElement('canvas');
  miniCanvas.width = checkerSize;
  miniCanvas.height = checkerSize;
  const miniCtx = miniCanvas.getContext('2d');

  miniCtx.fillStyle = 'white';
  miniCtx.fillRect(0, 0, checkerSize, checkerSize);

  miniCtx.fillStyle = '#ccc';
  miniCtx.fillRect(checkerSize / 2, 0, checkerSize / 2, checkerSize / 2);
  miniCtx.fillRect(0, checkerSize / 2, checkerSize / 2, checkerSize / 2);

  return context.createPattern(miniCanvas, 'repeat');
}
