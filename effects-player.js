
class EffectsPlayer extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const self = this;
    this.port.onmessage = (e) => {
      self.handleMessage(e.data);
    };

    this.frequency = Math.PI * 2 * 2000 / sampleRate;
    this.duration = 0;
    this.angle = 0.0;
    this.frequencies = null;
    this.amplitudes = null;
    this.effectIndex = 0;
    this.samplesPerNote = 0;
    this.sampleCount = 0;
  }

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

  handleMessage(data) {
    if (data.action == 'play') {
      // XXX should probably do this once at load time rather than every time
      // this is played.
      this.samplesPerNote = Math.floor(data.effect.noteDuration * sampleRate);
      this.frequencies = [];
      this.amplitudes = [];
      for (let i = 0; i < data.effect.notes.length; i++) {
        // Notes correspond to notes on a piano, with 0 being A0 and 88 being
        // c8.
        const freq = 27.5 * 2 ** (Math.floor(data.effect.notes[i]) / 12);
        const freqStep = freq * Math.PI * 2 / sampleRate;
        this.frequencies.push(freqStep);
        this.amplitudes.push(3.4 * data.effect.amplitudes[i] / 255);
      }

      this.effectIndex = 0;
      this.sampleCount = 0;
    } else if (data.action == 'stop') {
      this.frequencies = null;
    }
  }
}

registerProcessor('effects-player', EffectsPlayer);
