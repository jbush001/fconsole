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

EDITOR_COLORS = [
  0xff000000,
  0xffff0000,
  0xff00ff00,
  0xff0000ff,
  0xffff00ff,
  0xffffff00,
  0xff00ffff,
  0xff808080,
  0xff8080ff,
  0xff80ff80,
  0xffff8080,
  0xffffff80,
  0xff80ffff,
  0xffff80ff,
  0xff3080ff,
  0xffffffff,
];

class SpriteEditorModel {
  constructor(spriteBitmap) {
    this.selectedRow = 0;
    this.selectedCol = 0;
    this.currentColor = 0;
    this.spriteSize = 1;
    this.spriteData = new ImageData(SPRITE_SHEET_WIDTH,
        SPRITE_SHEET_HEIGHT);
    createImageBitmap(this.spriteData).then((bm) => {
      this.spriteBitmap = bm;
      repaint();
    });
  }
}

const MAP_SIZE = 400;
const MAP_X_OFFSET = 4;
const MAP_Y_OFFSET = 4;

class SpriteMapView extends View {
  constructor(width, height, model) {
    super(width, height);
    this.model = model;
  }

  draw(context) {
    if (!this.model.spriteBitmap) {
      return; // Not initialized yet
    }

    context.drawImage(this.model.spriteBitmap, MAP_X_OFFSET, MAP_Y_OFFSET,
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
    if (!this.model.spriteBitmap) {
      return; // Not initialized yet
    }

    const left = this.model.selectedCol * SPRITE_BLOCK_SIZE;
    const top = this.model.selectedRow * SPRITE_BLOCK_SIZE;
    const size = this.model.spriteSize * SPRITE_BLOCK_SIZE;
    context.drawImage(this.model.spriteBitmap, left, top, size,
        size, 0, 0, this.width, this.height);
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
    const pixelIndex = ((top + dy) * this.model.spriteBitmap.width + left +
        dx) * 4;
    const colorVal = EDITOR_COLORS[this.model.currentColor];
    const r = (colorVal >> 16) & 0xff;
    const g = (colorVal >> 8) & 0xff;
    const b = colorVal & 0xff;
    const pix = this.model.spriteData.data;
    pix[pixelIndex] = r;
    pix[pixelIndex + 1] = g;
    pix[pixelIndex + 2] = b;
    pix[pixelIndex + 3] = 0xff;
    const self = this;
    createImageBitmap(this.model.spriteData).then((bm) => {
      self.model.spriteBitmap = bm;
      repaint();
    });
  }
}

function makeColorString(value) {
  return `rgb(${(value >> 16) & 0xff}, ${(value >> 8) & 0xff}, ${(value & 0xff)})`;
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
        context.fillStyle = makeColorString(EDITOR_COLORS[row *
            NUM_COLS + col]);
        context.fillRect(col * this.swatchWidth, row * this.swatchHeight,
            this.swatchWidth, this.swatchHeight);
      }
    }

    const selectedCol = Math.floor(this.model.currentColor % NUM_COLS);
    const selectedRow = Math.floor(this.model.currentColor / NUM_COLS);
    context.strokeStyle = 'black';
    context.strokeRect(selectedCol * this.swatchWidth,
        selectedRow * this.swatchHeight, this.swatchWidth, this.swatchHeight);
    context.strokeStyle = 'white';
    context.strokeRect(selectedCol * this.swatchWidth + 1,
        selectedRow * this.swatchHeight + 1, this.swatchWidth - 2,
        this.swatchHeight - 2);
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
    context.fillStyle = 'red';
    context.fillText(this.model.spriteSize.toString(), 4, this.height - 8);
  }

  mouseDown(x, y) {
    this.model.spriteSize = this.model.spriteSize * 2;
    if (this.model.spriteSize == 8) {
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

function initSpriteEditor(spriteBitmap) {
  spriteCanvas = document.getElementById('sprite_edit');
  spriteContext = spriteCanvas.getContext('2d');
  spriteContext.imageSmoothingEnabled = false;

  spriteCanvas.addEventListener('mousedown', handleMouseDown);
  spriteCanvas.addEventListener('mouseup', handleMouseUp);
  spriteCanvas.addEventListener('mousemove', handleMouseMoved);
  root = new View(spriteCanvas.width, spriteCanvas.height);
  const model = new SpriteEditorModel(spriteBitmap);
  root.addChild(new SpriteMapView(512, 512, model), 400, 32);
  root.addChild(new EditView(350, 350, model), 5, 35);
  root.addChild(new ColorPicker(350, 32, model), 5, 400);
  root.addChild(new SpriteSizeControl(32, 32, model), 368, 400);
  repaint();
}