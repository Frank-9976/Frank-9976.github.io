const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const cw = canvas.width;
const ch = canvas.height;
const loadText = document.getElementById("loading");

var keysDown = {};
document.addEventListener("keydown", (e) => (keysDown[e.key] = true));
document.addEventListener("keyup", (e) => (keysDown[e.key] = false));
var dim;
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
    for (let h = 0; h < ch / rectWidth; h++) {
      const digits = (w & h).toString(2);
      const onesCount = digits.split('').reduce((a, x) => a + parseInt(x), 0);
      const totalDigits = Math.log(cw / rectWidth) / Math.log(2);
      const lol = 9
      const result = ((w & h) % lol) / lol; //onesCount / totalDigits;
      ctx.fillStyle = `hsl(180, ${100 * (onesCount === highlight)}%, ${result * 100}%)`;
      ctx.fillRect(w * rectWidth, h * rectWidth, rectWidth, rectWidth);
    }
  }
  loadText.innerText = "enjoy uwu (the website is furry because bit triangle was already taken)";
}

draw(64);
pollInput();