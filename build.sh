#!/bin/sh
bazelisk build -c opt --features=-wasm_warnings_as_errors //js:lyra
