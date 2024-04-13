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

class EffectsPlayer extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.port.onmessage = this.handleMessage.bind(this);

    this.angle = 0.0;
    this.frequencies = null;
    this.amplitudes = null;
    this.effectIndex = 0;
    this.samplesPerNote = 0;
    this.sampleCount = 0;
  }

  // @todo: This has a lot of popping and crackling because there are abrupt
  // transitions.
  process(inputs, outputs, parameters) {
    const outputBuf = outputs[0][0];
    if (this.frequencies) {
      for (let i = 0; i < outputBuf.length; i++) {
        outputBuf[i] = Math.sin(this.angle) * this.amplitudes[this.effectIndex];
        this.angle = (this.angle + this.frequencies[this.effectIndex]) %
          (Math.PI * 2);
        if (++this.sampleCount == this.samplesPerNote) {
          this.sampleCount = 0;
          if (++this.effectIndex == this.frequencies.length) {
            this.frequencies = null;
            break;
          }
        }
      }
    }

    return true;
  }

  handleMessage(event) {
    this.frequencies = event.data.frequencies;
    this.amplitudes = event.data.amplitudes;
    this.samplesPerNote = event.data.samplesPerNote;
    this.effectIndex = 0;
    this.sampleCount = 0;
    this.angle = 0; // Avoid a pop at the beginning.
  }
}

registerProcessor('effects-player', EffectsPlayer);
