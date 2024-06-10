// NOTES_PER_EFFECT and soundEffects inherited from main.js

// eslint-disable-next-line no-unused-vars
let soundEffectDiv = null;
let currentFx = 0;
let soundTable = null;

// eslint-disable-next-line no-unused-vars
function initSoundEditor() {
  soundEffectDiv = document.getElementById('soundstab');

  const currentIndexDiv = document.getElementById('curfx');
  document.getElementById('prevfx').onclick = () => {
    if (currentFx > 0) {
      currentFx --;
      currentIndexDiv.innerText = currentFx;
      updateSfxTableValues();
    }
  };

  document.getElementById('nextfx').onclick = () => {
    if (currentFx < MAX_SOUND_EFFECTS - 1) {
      currentFx++;
      currentIndexDiv.innerText = currentFx;
      updateSfxTableValues();
    }
  };

  document.getElementById('playfx').onclick = () => {
    playSoundEffect(currentFx);
  };

  const durationInput = document.getElementById('sfxduration');
  durationInput.oninput = () => {
    const noteDuration = Math.min(Math.max(parseInt(durationInput.value),
        0), 255);
    soundEffects[currentFx].noteDuration = noteDuration;
  };

  // Create a table
  soundTable = document.createElement('table');
  soundTable.style.border = '1px solid black';
  soundTable.style.borderCollapse = 'collapse';
  for (let i = 0; i < 2; i++) {
    const row = document.createElement('tr');
    for (let j = 0; j < NOTES_PER_EFFECT; j++) {
      const cell = document.createElement('td');
      cell.style.border = '1px solid black';
      cell.contentEditable = 'true';
      cell.style.width = '30px';
      cell.oninput = () => {
        const value = Math.min(Math.max(parseInt(cell.innerText), 0), 255);
        if (i == 0) {
          soundEffects[currentFx].pitches[j] = value;
        } else {
          soundEffects[currentFx].amplitudes[j] = value;
        }
      };

      row.appendChild(cell);
    }

    soundTable.appendChild(row);
  }

  soundEffectDiv.appendChild(soundTable);
  updateSfxTableValues();
}

function updateSfxTableValues() {
  if (soundEffects[currentFx]=== undefined) {
    return;
  }

  const durationInput = document.getElementById('sfxduration');
  durationInput.value = soundEffects[currentFx].noteDuration;

  const pitches = soundEffects[currentFx].pitches;
  const amplitudes = soundEffects[currentFx].amplitudes;
  for (let rowi = 0; rowi < 2; rowi++) {
    for (let coli = 0; coli < NOTES_PER_EFFECT; coli++) {
      const cell = soundTable.rows[rowi].cells[coli];
      if (rowi == 0) {
        cell.innerText = pitches[coli];
      } else {
        cell.innerText = amplitudes[coli];
      }
    }
  }
}
