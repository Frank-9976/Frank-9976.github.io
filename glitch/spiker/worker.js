onmessage = function(e) {
  const ogSamples = e.data;
  var resSamples = [];
  const ogl = ogSamples.length;
  for (let i = 0; i < ogl; i++) {
    const sample = ogSamples[i];
    resSamples.push(sample, -sample);
    if (i % 10000 === 0) postMessage(i / ogl);
  }
  postMessage(resSamples);
}