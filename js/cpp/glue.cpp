#include <iostream>
#include <vector>
#include "lyra/lyra_decoder.h"
#include "lyra/lyra_encoder.h"

#include <emscripten/bind.h>
#include <emscripten/val.h>

using namespace emscripten;
using namespace chromemedia::codec;

EMSCRIPTEN_BINDINGS(my_module) {

  class_<LyraEncoder>("LyraEncoder")
      .class_function(
          "create", optional_override([](int sample_rate_hz, int num_channels,
                                         int bitrate, bool enable_dtx) {
            return LyraEncoder::Create(sample_rate_hz, num_channels, bitrate,
                                       enable_dtx, "/model_path");
          }))
      .function("encode", optional_override([](LyraEncoder &self, val v) {
                  std::vector<int16_t> samples = vecFromJSArray<int16_t>(v);

                  const absl::Span<const int16_t> audio{samples};
                  std::optional<std::vector<uint8_t>> ret =
                      self.LyraEncoder::Encode(audio);
                  if (ret) {
                    auto data = ret.value();

                    return val(typed_memory_view(data.size(), data.data()));
                  } else {
                    std::cout << "encode data is empty" << std::endl;
                    return val::null();
                  }
                }));
  class_<LyraDecoder>("LyraDecoder")
      .class_function(
          "create", optional_override([](int sample_rate_hz, int num_channels) {
            return LyraDecoder::Create(sample_rate_hz, num_channels,
                                       "/model_path");
          }))
      .function(
          "setEncodedPacket", optional_override([](LyraDecoder &self, val v) {
            std::vector<uint8_t> packetsArray = vecFromJSArray<uint8_t>(v);
            const absl::Span<const uint8_t> packets{packetsArray};
            return self.LyraDecoder::SetEncodedPacket(packets);
          }))
      .function(
          "decodeSamples",
          optional_override([](LyraDecoder &self, int num_samples) {
            auto arrayBuffer = val::global("Int16Array").new_(num_samples);

            int split = 1;
            for (int i = 0; i < split; i++) {
              std::optional<std::vector<int16_t>> ret =
                  self.LyraDecoder::DecodeSamples(num_samples / split);
              if (ret) {
                auto data = ret.value();

                auto view = val(typed_memory_view(data.size(), data.data()));

                arrayBuffer.call<void>("set", view, num_samples / split * i);

              } else {
                std::cout << "decode data is empty" << std::endl;
                return val::null();
              }
            }

            return arrayBuffer;
          }))
      .function("isComfortNoise", &LyraDecoder::is_comfort_noise);
}
