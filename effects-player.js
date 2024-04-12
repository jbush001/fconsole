
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
  }

  process(inputs, outputs, parameters) {
    const outputBuf = outputs[0][0];
    if (this.duration > 0) {
      for (let i = 0; i < outputBuf.length; i++) {
        outputBuf[i] = Math.sin(this.angle) * 3.4;
        this.angle = (this.angle + this.frequency) % (Math.PI * 2);
      }

      this.duration -= outputBuf.length;
    }

    return true;
  }

  handleMessage(data) {
    this.frequency = Math.PI * 2 * data.frequency / sampleRate;
    this.duration = data.duration / 1000 * sampleRate;
  }
}

registerProcessor('effects-player', EffectsPlayer);
