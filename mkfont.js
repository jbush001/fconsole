'use strict';

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

//
// Used to generate the .png file with all of the font glyphs.
// Reads from gams/font8x8.fth, as I used the sprite editor to
// create the font.
//

const { PNG } = require('pngjs');
const fs = require('fs');

const SRC_PATH = 'games/font8x8.fth';
const DEST_PATH = 'font8x8.png';
const GRID_COLS = 16;
const GRID_ROWS = 6;
const GLYPH_WIDTH = 8;
const GLYPH_HEIGHT = 8;
const TOTAL_GLYPHS = GRID_COLS * GRID_ROWS;

const fileContents = fs.readFileSync(SRC_PATH, 'utf8');

const SPRITE_DELIMITER = '\n--SPRITE DATA------\n';
const SOUND_DELIMITER = '\n--SOUND DATA--------\n';

// Split this into sections.
const split1 = fileContents.indexOf(SPRITE_DELIMITER);
const split2 = fileContents.indexOf(SOUND_DELIMITER);
if (split1 == -1 || split2 == -1) {
  throw new Error('error loading file: missing sprite data');
}

const rawSpriteData = fileContents.substring(split1 + SPRITE_DELIMITER.length, split2);
const packedSrc = rawSpriteData.replace(/\s/g, '').padEnd(TOTAL_GLYPHS *
  GLYPH_WIDTH * GLYPH_HEIGHT, '0');

// Create a new PNG instance
const png = new PNG({
  width: TOTAL_GLYPHS * GLYPH_WIDTH,
  height: GLYPH_HEIGHT,
  colorType: 6, // RGBA
});

let destIndex = 0;
const srcStride = GLYPH_WIDTH * GRID_COLS;
for (let y = 0; y < GLYPH_HEIGHT; y++) {
  for (let glyphIndex = 0; glyphIndex < TOTAL_GLYPHS; glyphIndex++) {
    const srcRow = Math.floor(glyphIndex / 16);
    const srcCol = Math.floor(glyphIndex % 16);

    const srcOffset = (srcRow * GLYPH_HEIGHT + y) * srcStride + (srcCol * GLYPH_WIDTH);
    for (let x = 0; x < GLYPH_WIDTH; x++) {
      png.data[destIndex++] = 255;
      png.data[destIndex++] = 255;
      png.data[destIndex++] = 255;
      if (packedSrc[srcOffset + x] == '0') {
        png.data[destIndex++] = 0;
      } else {
        png.data[destIndex++] = 255;
      }
    }
  }
}

png.pack().pipe(fs.createWriteStream(DEST_PATH)).on('finish', () => {
  console.log('PNG file written successfully!');
});
