import * as lyraJs from '../build-outputs/lyra-glue.js';
const lyraPath = '../build-outputs/';

const quantizerModelFile = await fetch('./model/quantizer.tflite').then(res => res.arrayBuffer());
const lyraganModelFile = await fetch('./model/lyragan.tflite').then(res => res.arrayBuffer());
const soundstreamModelFile = await fetch('./model/soundstream_encoder.tflite').then(res => res.arrayBuffer());
const lyraConfigModelFile = await fetch('./model/lyra_config.binarypb').then(res => res.arrayBuffer());

const lyraEncoderInner =  await lyraJs.default({
    locateFile: (path, scriptDirectory) => {
        // 絶対パスで埋め込まれているので修正
        if (path.endsWith('.wasm')) return lyraPath + path;

        return scriptDirectory + path;
    },
    ModelData: {
        quantizer: new Uint8Array(quantizerModelFile),
        lyragan: new Uint8Array(lyraganModelFile),
        soundstream: new Uint8Array(soundstreamModelFile),
        lyra_config: new Uint8Array(lyraConfigModelFile),
    },
}).then(async ({ready, LyraEncoder} )=> {
    await ready;
    return LyraEncoder;
});

const lyraDecoderInner =  await lyraJs.default({
    locateFile: (path, scriptDirectory) => {
        // 絶対パスで埋め込まれているので修正
        if (path.endsWith('.wasm')) return lyraPath + path;

        return scriptDirectory + path;
    },
    ModelData: {
        quantizer: new Uint8Array(quantizerModelFile),
        lyragan: new Uint8Array(lyraganModelFile),
        soundstream: new Uint8Array(soundstreamModelFile),
        lyra_config: new Uint8Array(lyraConfigModelFile),
    },
}).then(async ({ready, LyraDecoder} )=> {
    await ready;
    return LyraDecoder;
});

export class LyraEncoder {
    /**
     * 
     * @param {number} sampleRateHz - 8000 or 16000 or 32000 or 48000
     * @param {number} bitrate - 3200 or 6000 or 9200
     * @param {boolean} dtx 
     */
    constructor(sampleRateHz, bitrate, dtx) {
        this.encoder = lyraEncoderInner.create(sampleRateHz,1,bitrate,dtx);
        this.sampleRateHz = sampleRateHz;
        if (this.encoder === null) {

        }
        this.isEncoding = false;
    }
    /**
     * 
     * @param {Int16Array} samples 
     * @returns {UInt8Array | null}
     */
    encode(samples) {
        if (samples.length !== this.sampleRateHz / 50) {
            console.log('invalid sample length?');
        }
        if (this.isEncoding) {
            console.log('already encoding');
        }
        this.isEncoding = true;
        const ret = this.encoder.encode(samples);
        this.isEncoding = false;
        return ret;
    }
}

export class LyraDecoder {
    /**
     * 
     * @param {number} sampleRateHz 
     */
    constructor(sampleRateHz) {
        this.decoder = lyraDecoderInner.create(sampleRateHz, 1);
        this.sampleRateHz = sampleRateHz;
        this.isDecoding = false;
    }
    /**
     * 
     * @param {UInt8Array} encodedPackets 
     * @returns {Int16Array}
     */
    decode(encodedPackets) {
        if (this.isDecoding) {
            console.log('already recording.');
        }
        this.isDecoding = true;
        const ok = this.decoder.setEncodedPacket(encodedPackets);
        const ret =  this.decoder.decodeSamples(Math.ceil(this.sampleRateHz/50));
        this.isDecoding = false;
        return ret;
    }
    /**
     * 
     * @returns {boolean}
     */
    isNoiseMode() {
        return this.decoder.isComfortNoise();
    }
}
