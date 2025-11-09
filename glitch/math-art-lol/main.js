//canvas setup
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var cw = canvas.width;
var ch = canvas.height;

//draw line as if the canvas is a 1 by 1 box
function drawLine(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.lineCap = "round";
  ctx.moveTo(x1 * cw, y1 * ch);
  ctx.lineTo(x2 * cw, y2 * ch);
  ctx.lineWidth = 10;
  ctx.strokeStyle = "black";
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "grey";
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "white";
  ctx.stroke();
}

//return a jiggly value
var g_jiggle = 0;
var g_jiggle_meta = 0;
const JIGGLE_INC = 0.1;
function jiggle() {
  g_jiggle += JIGGLE_INC;
  return g_jiggle % 1;
}

//main draw function
const NUM_LINES = 100;
function draw() {
  //black background
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  //draw lines based on parameter
  for (let t = 0; t < NUM_LINES; t++) {
    //proportion of t
    let p = 0.49 + -0.99 * (t / NUM_LINES);
    //fixed jiggle, scale based on square size
    let j = p + jiggle() * (1 - 2 * p);
    drawLine(j    , p    , 1 - p, j    );
    drawLine(1 - j, 1 - p, 1 - p, j    );
    drawLine(1 - j, 1 - p, p    , 1 - j);
    drawLine(j    , p    , p    , 1 - j);
  }

  //60 fps
  g_jiggle_meta++;
  g_jiggle = g_jiggle_meta / (60 * 5) - JIGGLE_INC;
  requestAnimationFrame(draw);
}
draw();

//nonsense i copied from google
var video = document.getElementById('video');
var videoStream = canvas.captureStream(60);
var mediaRecorder = new MediaRecorder(videoStream);
var chunks = [];
mediaRecorder.ondataavailable = function(e) {
  chunks.push(e.data);
};
mediaRecorder.onstop = function(e) {
  var blob = new Blob(chunks, { 'type' : 'video/mp4' });
  chunks = [];
  var videoURL = URL.createObjectURL(blob);
  video.src = videoURL;
  //ok i did this part
  video.play();
  video.setAttribute("controls","controls");
};
mediaRecorder.ondataavailable = function(e) {
  chunks.push(e.data);
};

//click once to start, click again to stop
let g_toggle_control = 0;
function toggle() {
  if (g_toggle_control == 0) mediaRecorder.start();
  if (g_toggle_control == 1) mediaRecorder.stop();
  g_toggle_control++;
}