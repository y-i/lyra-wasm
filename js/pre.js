Module['preRun'] = () => {
    FS.mkdir('/model_path');
    FS.writeFile('/model_path/quantizer.tflite', Module['ModelData']['quantizer']);
    FS.writeFile('/model_path/lyragan.tflite', Module['ModelData']['lyragan']);
    FS.writeFile('/model_path/soundstream_encoder.tflite', Module['ModelData']['soundstream']);
    FS.writeFile('/model_path/lyra_config.binarypb', Module['ModelData']['lyra_config']);
};
