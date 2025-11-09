const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const cw = canvas.width;
const ch = canvas.height;
const loadText = document.getElementById("loading");

var keysDown = {};
document.addEventListener("keydown", (e) => (keysDown[e.key] = true));
document.addEventListener("keyup", (e) => (keysDown[e.key] = false));
var dim = 3;
var highlight = -1;
var mode = 'dim change';
function pollInput() {
  for (const key in keysDown) {
    if (keysDown[key]) {
      if (!isNaN(+key)) {
        if (mode === 'dim change') {
          if (+key === 0) mode = 'highlight';
          else {
            dim = +key;
            doLoadAndDraw();
          }
        }
        else if (mode === 'highlight') {
          if (+key === 0) mode = 'dim change';
          else {
            highlight = +key;
            doLoadAndDraw();
          }
        }
      }
    }
  }
  keysDown = {};
  window.requestAnimationFrame(pollInput);
}

function doLoadAndDraw() {
  loadText.innerText = `LOADING... (dimension = ${dim}, highlight = ${highlight})`;
  setTimeout(draw, 100, cw / (2 ** dim), highlight);
}

function draw(rectWidth, highlight) {
  for (let w = 0; w < cw / rectWidth; w++) {
    for (let h = 0; h <= w; h++) {
      let degree = dim;
      if (w && h) {
        let pol1 = [];
        let pol2 = [];
        for (let i = 0; i < dim; i++) {
          pol1[i] = (w >> i) % 2;
          pol2[i] = (h >> i) % 2;
        }
        let i = dim - 1;
        let j = dim - 1;
        while (i > -1 && j > -1) {
          if (pol1[i] === 0) i--;
          else if (pol2[j] === 0) j--;
          else {
            if (i < j) {
              for (let k = 0; k <= i; k++) {
                pol2[j - k] ^= pol1[i - k];
              }
            }
            else {
              for (let k = 0; k <= j; k++) {
                pol1[i - k] ^= pol2[j - k];
              }
            }
          }
        }
        while (!pol1[i] && !pol2[j]) {
          if (pol1[i] === 0) i--;
          if (pol2[j] === 0) j--;
        }
        degree = Math.max(i, j);
      }
      ctx.fillStyle = `hsl(180, ${100 * (degree === highlight)}%, ${(dim - degree) / dim * 100}%)`;
      ctx.fillRect(w * rectWidth, cw - (h + 1) * rectWidth, rectWidth, rectWidth);
      ctx.fillRect(h * rectWidth, cw - (w + 1) * rectWidth, rectWidth, rectWidth);
    }
  }
  loadText.innerText = "loaded successfully";
}

doLoadAndDraw();
pollInput();