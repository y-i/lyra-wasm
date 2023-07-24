import {LyraEncoder, LyraDecoder} from './lyra';

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView
const isLittleEndian = (() => {
  const buffer = new ArrayBuffer(2);
  new DataView(buffer).setInt16(0, 256, true /* littleEndian */);
  // Int16Array uses the platform's endianness.
  return new Int16Array(buffer)[0] === 256;
})();

console.debug({isLittleEndian});

export const waitLyraReady = () => Promise.resolve();

export const createEncoderTransform = (sampleRateHz, bitrateBps, useDtx) => {
  const lyraEncoder = new LyraEncoder(sampleRateHz, bitrateBps, useDtx);
  return async (chunk, controller) => {
    if (isLittleEndian) {
      // convert to Int16 of Network Order
      const bytes = new Uint8Array(chunk.data);
      for (let i = 1; i < bytes.length; i+=2) {
        const tmp = bytes[i];
        bytes[i] = bytes[i-1];
        bytes[i-1] = tmp;
      }
    }
  
    const samples = new Int16Array(chunk.data);
  
    const encodedChunk = lyraEncoder.encode(samples);
    chunk.data = new Uint8Array(encodedChunk).buffer;
  
    controller.enqueue(chunk);
  };
}

export const createDecoderTransform = (sampleRateHz) => {
  const lyraDecoder = new LyraDecoder(sampleRateHz);
  return async (chunk, controller) => {
    const encodedChunk = new Uint8Array(chunk.data);
    
    const samples = lyraDecoder.decode(encodedChunk);
    chunk.data = new Int16Array(samples).buffer;
  
    if (isLittleEndian) {
      // convert to Int16 of Network Order
      const bytes = new Uint8Array(chunk.data);
      for (let i = 1; i < bytes.length; i+=2) {
        const tmp = bytes[i];
        bytes[i] = bytes[i-1];
        bytes[i-1] = tmp;
      }
    }
  
    controller.enqueue(chunk);
  };
}
