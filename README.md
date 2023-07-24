# lyra-wasm

Compile Lyra to WASM

# How to build

1. Install numpy
   1. `pipenv install`
   2. `pipenv shell`
2. Start build
   1. `./build.sh`

# How to use example

1. Get models
   - Copy files from https://github.com/google/lyra/tree/main/lyra/model_coeffs except a wav file
2. Copy generated files
   1. `cp bazel-out/<somedir>/bin/lyra/* example/build-outputs`
        - For example, if you are using MacOS, `cp bazel-out/darwin-opt/bin/lyra/* example/build-outputs`
3. Start server
   1. `npm install`
   2. `npm run dev`
   3. Open http://localhost:5173/