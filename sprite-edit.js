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

class SpriteEditorModel {
  constructor(spriteBitmap) {
    this.selectedRow = 0;
    this.selectedCol = 0;
    this.spriteBitmap = spriteBitmap;
  }
}

const MAP_SIZE = 400;
const MAP_X_OFFSET = 16;
const MAP_Y_OFFSET = 16;

class SpriteMapView extends View {
  constructor(width, height, model) {
    super(width, height);
    this.model = model;
  }

  draw(context) {
    context.drawImage(this.model.spriteBitmap, MAP_X_OFFSET, MAP_Y_OFFSET,
        MAP_SIZE, MAP_SIZE);
    context.strokeStyle = 'black';
    context.strokeRect(MAP_X_OFFSET - 1, MAP_Y_OFFSET - 1,
        MAP_SIZE + 2, MAP_SIZE + 2);

    context.font = '16px monospace';
    context.fillStyle = 'black';
    for (let i = 0; i < SPRITE_SHEET_W; i++) {
      const label = i.toString(16);
      const metrics = spriteContext.measureText(label);
      const xOffs = i * MAP_SIZE / SPRITE_SHEET_W +
        (MAP_SIZE / SPRITE_SHEET_W - metrics.width) / 2;
      context.fillText(label, xOffs + MAP_X_OFFSET, MAP_Y_OFFSET - 4);
      const yOffs = i * MAP_SIZE / SPRITE_SHEET_H +
        metrics.fontBoundingBoxAscent;
      context.fillText(label, MAP_X_OFFSET - 4 - metrics.width,
          yOffs + MAP_Y_OFFSET + 8);
    }

    const spriteWidth = MAP_SIZE / SPRITE_SHEET_W;
    const spriteHeight = MAP_SIZE / SPRITE_SHEET_H;

    context.beginPath();
    context.strokeStyle = 'red';
    const selectLeft = this.model.selectedCol * spriteWidth + MAP_X_OFFSET;
    const selectTop = this.model.selectedRow * spriteHeight + MAP_Y_OFFSET;
    context.strokeRect(selectLeft, selectTop, spriteWidth, spriteHeight);

    context.fillText('sprite ' + (this.model.selectedRow * SPRITE_SHEET_W +
        this.model.selectedCol), MAP_X_OFFSET, MAP_SIZE + MAP_Y_OFFSET + 16);
  }

  mouseDown(x, y) {
    if (x >= MAP_X_OFFSET && y >= MAP_Y_OFFSET &&
          x <= MAP_X_OFFSET + MAP_SIZE && y <= MAP_Y_OFFSET + MAP_SIZE) {
      this.model.selectedCol = Math.floor((x - MAP_X_OFFSET) / (MAP_SIZE /
        SPRITE_SHEET_W));
      this.model.selectedRow = Math.floor((y - MAP_Y_OFFSET) / (MAP_SIZE /
        SPRITE_SHEET_H));
      invalidate();
    }
  }
}

class EditView extends View {
  constructor(width, height, model) {
    super(width, height);
    this.model = model;
  }

  draw(context) {
    const left = this.model.selectedCol * SPRITE_SIZE;
    const top = this.model.selectedRow * SPRITE_SIZE;
    context.drawImage(this.model.spriteBitmap, left, top, SPRITE_SIZE,
        SPRITE_SIZE, 0, 0, this.width, this.height);
  }
}

function initSpriteEditor(spriteBitmap) {
  spriteCanvas = document.getElementById('sprite_edit');
  spriteContext = spriteCanvas.getContext('2d');

  spriteCanvas.addEventListener('mousedown', handleMouseDown);
  spriteCanvas.addEventListener('mouseup', handleMouseUp);
  spriteCanvas.addEventListener('mousemoved', handleMouseMoved);
  root = new View(spriteCanvas.width, spriteCanvas.height);
  const model = new SpriteEditorModel(spriteBitmap);
  root.addChild(new SpriteMapView(400, 400, model), 400, 32);
  root.addChild(new EditView(350, 350, model), 5, 35);
  repaint();
}
