import { createEncoderTransform, createDecoderTransform, waitLyraReady } from './lyra-transformer';

const codecs = RTCRtpSender.getCapabilities('audio').codecs;
console.log(codecs);

const SAMPLING_RATE_HZ = 16000;
const BIT_RATE_BPS = 9200;
const USE_DTX = false;
const IS_DOWNLOAD_FILE = false;
const AUDIO_TYPE = 'voice';

(async () => {
  const params = new URLSearchParams(window.location.search);
  const samplingRateHz = Number(params.get('sampling')?? SAMPLING_RATE_HZ);
  const bitrateBps = Number(params.get('bitrate') ?? BIT_RATE_BPS);
  const useDtx = params.get('dtx') === 'true' ?? USE_DTX;
  const isDownloadFile = params.get('download') === 'true' ?? IS_DOWNLOAD_FILE;
  const audioType = params.get('audio-type')?? AUDIO_TYPE;

  document.querySelector(`[name="bitrate"][value="${bitrateBps}"]`).checked = true;
  document.querySelector(`[name="dtx"][value="${useDtx}"]`).checked = true;
  document.querySelector(`[name="download"][value="${isDownloadFile}"]`).checked = true;
  document.querySelector(`[name="audio-type"][value="${audioType}"]`).checked = true;

  // ここまでがGUI的設定
  
  const encodeTransform = createEncoderTransform(samplingRateHz,bitrateBps,useDtx);
  const decodeTransform = createDecoderTransform(samplingRateHz);

  const sender = new RTCPeerConnection({ encodedInsertableStreams: true });

  const audioFromElem = audioType === 'voice' ? document.getElementById('audioFromFileVoice') : document.getElementById('audioFromFileMusic');
  const audioElem = document.getElementById('audioElem');
  audioFromElem.volume = 0.0000001;
  audioFromElem.onended = (e) => {
    console.log('sender media ended.')
    sender.close();
  };
  const stream = audioFromElem.captureStream();

  const senderAudioTrack = stream.getAudioTracks()[0];
  sender.addTrack(senderAudioTrack);

  const transceiver = sender.getTransceivers()[0];
  transceiver.direction = 'sendonly';

  await waitLyraReady();
  await new Promise(resolve => setTimeout(resolve, 1000));

  transceiver.setCodecPreferences(codecs.filter(codec => codec.mimeType === 'audio/telephone-event' && codec.clockRate === 8000));

  const offer = await sender.createOffer();

  // setCodecPreferencesではL16を指定できないのでSDPを直接書き換える
  // ついでに20ms分のサンプルが必要なのでそこも書き換える
  offer.sdp = offer.sdp.replace('telephone-event/8000', 'L16/16000').replace('a=rtpmap:126 L16/16000', 'a=rtpmap:126 L16/16000\r\na=ptime:20');

  // Encoder側でLyraの処理を差し込む設定
  const senderStreams = sender.getTransceivers()[0].sender.createEncodedStreams();
  const transformStream = new TransformStream({
    transform: encodeTransform,
  });
  senderStreams.readable.pipeThrough(transformStream).pipeTo(senderStreams.writable);

  await sender.setLocalDescription(offer);

  await new Promise(resolve => {
    sender.addEventListener('icegatheringstatechange', () => {
      if (sender.iceGatheringState === 'complete') resolve();
    });
    if (sender.iceGatheringState === 'complete') resolve();
  });

  const receiver = new RTCPeerConnection({ encodedInsertableStreams: true });
  receiver.addEventListener('track', ev => {
    // Decoder側でLyraの処理を差し込む設定
    const receiverStream = ev.receiver.createEncodedStreams();
    const transformStream = new TransformStream({
      transform: decodeTransform,
    });
    receiverStream.readable.pipeThrough(transformStream).pipeTo(receiverStream.writable);

    audioElem.srcObject = new MediaStream([ev.track]);

    audioFromElem.play();
    audioElem.play();

    // 以下はファイルの保存用
    const chunks = [];
    const recorder = new MediaRecorder(audioElem.srcObject, {mimeType: "audio/webm;codecs=opus"});
    recorder.ondataavailable = (e) => {
      chunks.push(e.data);
    }
    recorder.onstop = (e) => {
      console.log('recording stopped.');
      const blob = new Blob(chunks);
      if (isDownloadFile) {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        // link.download = `lyra-${audioType}-${samplingRateHz}-${bitrateBps}-${useDtx}.webm`;
        link.download = `l-${audioType[0]}-${bitrateBps/1000}-${useDtx?'t':'f'}.webm`;
        link.click();
      }
    }
    recorder.start();

    receiver.onconnectionstatechange = (e) => {
      if (receiver.connectionState === 'disconnected') {
        console.log('receiver ended.')
        recorder.stop();
      }
    }
  });

  await receiver.setRemoteDescription(sender.localDescription);
  const answer = await receiver.createAnswer();
  // sender側と同様に書き換える
  answer.sdp = answer.sdp.replace('a=group:BUNDLE', 'a=group:BUNDLE 0');
  answer.sdp = answer.sdp.replace('m=audio 0 UDP/TLS/RTP/SAVPF 0', 'm=audio 9 UDP/TLS/RTP/SAVPF 126');
  answer.sdp += `a=rtpmap:126 L16/16000\r\na=ptime:20\r\n`;
  await receiver.setLocalDescription(answer);

  await new Promise(resolve => {
    receiver.addEventListener('icegatheringstatechange', () => {
      if (receiver.iceGatheringState === 'complete') resolve();
    });
    if (receiver.iceGatheringState === 'complete') resolve();
  });

  await sender.setRemoteDescription(receiver.localDescription);
})();

// オプションをGUIから変える用
document.getElementById('changeButton').onclick = () => {
  const params = new URLSearchParams({
    bitrate: document.querySelector('[name="bitrate"]:checked')?.value,
    dtx: document.querySelector('[name="dtx"]:checked')?.value,
    download: document.querySelector('[name="download"]:checked')?.value,
    'audio-type': document.querySelector('[name="audio-type"]:checked')?.value,
  });
  
  location.href = location.protocol + '//' + location.host + location.pathname + '?' + params.toString();
}
document.getElementById('clearButton').onclick = () => {
  location.href = location.protocol + '//' + location.host + location.pathname;
}