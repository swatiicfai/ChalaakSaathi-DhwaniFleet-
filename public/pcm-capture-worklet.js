/**
 * AudioWorklet processor that downsamples browser capture audio (e.g. 44.1kHz / 48kHz)
 * to exact 16,000 Hz 16-bit signed linear PCM mono frames for Gemini 3.8 Live.
 */
class Pcm16kCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetRate = 16000;
    this.chunkSamples = 512; // 32ms at 16kHz
    this.outBuffer = new Int16Array(this.chunkSamples);
    this.outIndex = 0;
    this.phase = 0;
    this.sum = 0;
    this.count = 0;
    this.sqSum = 0;
  }

  process(inputs) {
    const micInput = inputs[0]?.[0];
    if (!micInput || micInput.length === 0) {
      return true;
    }

    // Optional second input carries synthetic yard noise if mixed into Gemini stream
    const noiseInput = inputs[1]?.[0];
    const ratio = sampleRate / this.targetRate;

    for (let i = 0; i < micInput.length; i++) {
      const cleanSample = micInput[i];
      this.sqSum += cleanSample * cleanSample;

      const mixedSample = noiseInput
        ? Math.max(-1, Math.min(1, cleanSample + noiseInput[i]))
        : cleanSample;

      this.sum += mixedSample;
      this.count++;
      this.phase++;

      if (this.phase >= ratio) {
        const avg = this.sum / this.count;
        const clamped = Math.max(-1, Math.min(1, avg));
        this.outBuffer[this.outIndex++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;

        this.phase -= ratio;
        this.sum = 0;
        this.count = 0;

        if (this.outIndex >= this.chunkSamples) {
          const cleanRms = Math.sqrt(this.sqSum / Math.max(1, micInput.length));
          const copy = new Int16Array(this.outBuffer);
          this.port.postMessage(
            {
              pcm16Buffer: copy.buffer,
              cleanRms,
              preview: Array.from(micInput.subarray(0, 64))
            },
            [copy.buffer]
          );
          this.outIndex = 0;
          this.sqSum = 0;
        }
      }
    }

    return true;
  }
}

registerProcessor('pcm-16k-capture-processor', Pcm16kCaptureProcessor);
