const AudioCtx = new AudioContext();
const loadBar = document.getElementById('loadbar');

function saveData(data, fileName) {
  const a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  const blob = new Blob([data], {type: "octet/stream"});
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

function doSpike(el) {
  const file = el.files[0];
  const resultFileName = file.name.split('.')[0] + '_spiked.raw';
  const reader = new FileReader();
  reader.onload = async function(e) {
    const ogArrayBuffer = e.target.result;
    const ogAudioBuffer = await AudioCtx.decodeAudioData(ogArrayBuffer);
    const ogSamples = ogAudioBuffer.getChannelData(0);
    const worker = new Worker('worker.js');
    worker.onmessage = function(e) {
      const data = e.data;
      if (typeof data === 'object') {
        loadBar.innerText = 'Packaging... ??%';
        const resArrayBuffer = Float32Array.from(data);
        saveData(resArrayBuffer.buffer, resultFileName);
        worker.terminate();
        loadBar.innerText = '';
      }
      else {
        loadBar.innerText = 'Processing... ' + Math.floor(data * 100) + '%';
        if (data > 0.9) loadBar.innerText = 'Packaging... ??%';
      }
    }
    worker.postMessage(ogSamples);
  }
  loadBar.innerText = 'Assembling... ??%';
  reader.readAsArrayBuffer(file);
}