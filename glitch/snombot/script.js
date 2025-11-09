//this is code reuse from my rlemov project
var SENSITIVITY = 0.5;
var SIZE = 16
var SNOMBA = ':SNOMBA:'
var EMPTY = ' '.repeat(6)

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

var a = document.createElement("a");
document.body.appendChild(a);
a.style = "display: none";
function saveData(data, fileName) {
  var blob = new Blob([data], {type: "octet/stream"});
  var url = URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

async function convertImages(el) {
  var files = el.files;
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var fileName = file.name.split('.')[0] + '.txt';
    var image = await createImageBitmap(file);
    var frameResult = '';
    var width = image.width > SIZE ? SIZE : image.width;
    var height = image.height > SIZE ? SIZE : image.height;
    ctx.drawImage(image, 0, 0, width, height);
    var data = ctx.getImageData(0, 0, width, height).data;
    var frameLine = '';
    for (var j = 0; j < data.length; j += 4) {
      var isBlack = testIfBlack(data[j], data[j + 1], data[j + 2], data[j + 3]);
      frameLine += isBlack ? SNOMBA : EMPTY;
      if ((j / 4) % SIZE == SIZE - 1) {
        frameResult += frameLine.trimEnd() + '\n';
        frameLine = '';
      };
    }
    frameResult = frameResult.trimEnd();
    saveData(frameResult, fileName);
  }
}

function testIfBlack(r, g, b, a) {
  var squaredBrightness = 0.299 * (r / 255) ** 2 + 0.587 * (g / 255) ** 2 + 0.114 * (b / 255) ** 2;
  return squaredBrightness * a / 255 < SENSITIVITY ** 2;
}