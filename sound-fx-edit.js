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


// NOTES_PER_EFFECT and soundEffects inherited from main.js

// eslint-disable-next-line no-unused-vars
let soundEffectDiv = null;
let currentFx = 0;
let soundTable = null;

/**
 * This is called once, when the page is first loaded.
 */
// eslint-disable-next-line no-unused-vars
function initSoundEditor() {
  soundEffectDiv = document.getElementById('soundstab');

  document.getElementById('prevfx').addEventListener('click', () => {
    if (currentFx > 0) {
      currentFx --;
      updateSfxTableValues();
    }
  });

  document.getElementById('nextfx').addEventListener('click', () => {
    if (currentFx < MAX_SOUND_EFFECTS - 1) {
      currentFx++;
      updateSfxTableValues();
    }
  });

  document.getElementById('playfx').addEventListener('click', () => {
    playSoundEffect(currentFx);
  });

  const durationInput = document.getElementById('sfxduration');
  durationInput.addEventListener('blur', () => {
    const noteDuration = Math.min(Math.max(parseInt(durationInput.value),
        0), 255);
    durationInput.value = noteDuration;
    soundEffects[currentFx].noteDuration = noteDuration;
    setNeedsSave();
  });

  const waveformInput = document.getElementById('waveform');
  waveformInput.addEventListener('change', () => {
    let waveform = 0;
    switch (waveformInput.value) {
      case 'square':
        waveform = 0;
        break;
      case 'triangle':
        waveform = 1;
        break;
      case 'sawtooth':
        waveform = 2;
        break;
    }
    soundEffects[currentFx].waveform = waveform;
    setNeedsSave();
  });

  // Create a table of volumes and pitches.
  soundTable = document.createElement('table');
  soundTable.style.border = '1px solid black';
  soundTable.style.borderCollapse = 'collapse';
  soundTable.style.margin = '5px';
  for (let i = 0; i < 2; i++) {
    const row = document.createElement('tr');
    const rowHeader = document.createElement('th');
    rowHeader.innerText = ['Pitch', 'Amp'][i];
    row.appendChild(rowHeader);

    for (let j = 0; j < NOTES_PER_EFFECT; j++) {
      const cell = document.createElement('td');
      cell.style.border = '1px solid black';
      cell.contentEditable = 'true';
      cell.style.width = '30px';
      cell.addEventListener('blur', () => {
        const value = Math.min(Math.max(parseInt(cell.innerText), 0), 255);
        cell.innerText = value;
        if (i == 0) {
          soundEffects[currentFx].pitches[j] = value;
        } else {
          soundEffects[currentFx].amplitudes[j] = value;
        }

        setNeedsSave();
      });

      cell.addEventListener('focus', () => {
        // Select contents of cell
        const range = document.createRange();
        range.selectNodeContents(cell);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        return false;
      });

      row.appendChild(cell);
    }

    soundTable.appendChild(row);
  }

  soundEffectDiv.appendChild(soundTable);
  updateSfxTableValues();
}

/**
 * Update all display values in page whenever underlying values have changed.
 */
function updateSfxTableValues() {
  if (soundEffects[currentFx]=== undefined) {
    return;
  }

  const currentIndexDiv = document.getElementById('curfx');
  currentIndexDiv.innerText = 'Effect #' + currentFx;

  const durationInput = document.getElementById('sfxduration');
  durationInput.value = soundEffects[currentFx].noteDuration;

  const waveformInput = document.getElementById('waveform');
  switch (soundEffects[currentFx].waveform) {
    case 0:
      waveformInput.value = 'square';
      break;
    case 1:
      waveformInput.value = 'triangle';
      break;
    case 2:
      waveformInput.value = 'sawtooth';
      break;
  }

  const pitches = soundEffects[currentFx].pitches;
  const amplitudes = soundEffects[currentFx].amplitudes;
  for (let rowi = 0; rowi < 2; rowi++) {
    for (let coli = 0; coli < NOTES_PER_EFFECT; coli++) {
      const cell = soundTable.rows[rowi].cells[coli + 1];
      if (rowi == 0) {
        cell.innerText = pitches[coli];
      } else {
        cell.innerText = amplitudes[coli];
      }
    }
  }
}
