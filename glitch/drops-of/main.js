var DROP_SIZE = 10;
var SLIDING_SPEED = 0.01;
var DROP_NAMES =  "this is a random background because why not".split(' ');
var DROP_NAME_FONT = 'Courier';

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var cw = canvas.width;
var ch = canvas.height;
var clack = document.getElementById('clack');
var fpsMeter = document.getElementById('fpsmeter');
var lastTimestamp;

class DropContext {
  constructor() {
    this.drops = [];
  }
  
  dropOneDrop() {
    let x = Math.random() * cw;
    let y = Math.random() * ch;
    var currentDrop = new Drop(x, y, DROP_SIZE, this.getRandomName());
    var potentialAbsorbers = this.checkIfAnyTouching(currentDrop);
    if (potentialAbsorbers.length > 0) {
      let i = Math.floor(Math.random() * potentialAbsorbers.length);
      potentialAbsorbers[i].absorb(currentDrop);
    }
    if (currentDrop) this.drops.push(currentDrop);
    this.draw();
  }
  
  checkIfAnyTouching(currentDrop) {
    var potentialAbsorbers = [];
    for (var i in this.drops) {
      var drop = this.drops[i];
      if (currentDrop.isTouching(drop)) potentialAbsorbers.push(drop);
    }
    return potentialAbsorbers;
  }
  
  slideDownDrops() {
    this.drops.map(drop => drop.slideDown())
  }
  
  playSound(el, vol = 1) {
    el.currentTime = 0;
    el.volume = vol > 1 ? 1 : (vol < 0 ? 0 : vol);
    el.play();
  }
  
  getRandomName() {
    let i = Math.floor(Math.random() * DROP_NAMES.length);
    return DROP_NAMES[i];
  }
  
  draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    this.drops.map(drop => drop.draw())
  }
}

class Drop {
  constructor(x, y, r, name) {
    this._x = x;
    this._y = y;
    this._r = r;
    this.name = name;
    this.id = dropContext.drops.length;
  }
  
  get x() {return this._x}
  get y() {return this._y}
  get r() {return this._r}
  get rsquared() {return this._r ** 2}
  set x(v) {this._x = v; this.checkCol()}
  set y(v) {this._y = v; this.checkCol()}
  set r(v) {this._r = v; this.checkCol()}
  checkCol() {
    var potentialAbsorbees = dropContext.checkIfAnyTouching(this);
    for (var i in potentialAbsorbees) {
      var absorbee = potentialAbsorbees[i];
      if (absorbee.id === this.id) continue;
      this.absorb(absorbee, true);
      break;
    }
  }
  
  isTouching(drop2) {
    var drop1 = this;
    var dx = drop1.x - drop2.x;
    var dy = drop1.y - drop2.y;
    var rTotal = drop1.r + drop2.r;
    return dx ** 2 + dy ** 2 < rTotal ** 2; 
  }
  
  absorb(drop, playSound) {
    if (playSound) dropContext.playSound(clack, (this.r + drop.r) / 100);
    drop.removeSelf();
    this._x = (this.x * this.rsquared + drop.x * drop.rsquared) / (this.rsquared + drop.rsquared);
    this._y = (this.y * this.rsquared + drop.y * drop.rsquared) / (this.rsquared + drop.rsquared);
    this.r = Math.sqrt(this.rsquared + drop.rsquared);
  }
  
  removeSelf() {
    delete dropContext.drops[this.id];
  }
  
  slideDown() {
    this.y += this.r * SLIDING_SPEED;
    if (this.y - this.r > ch) this.removeSelf();
  }
  
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fill();
    ctx.textAlign = 'center';
    let fontSize = 2 * this.r / this.name.length;
    ctx.font = fontSize + 'px ' + DROP_NAME_FONT;
    ctx.strokeText(this.name, this.x, this.y + fontSize / 3);
  }
}

var dropContext = new DropContext();
function loop(timestamp) {
  dropContext.dropOneDrop();
  dropContext.slideDownDrops();
  window.requestAnimationFrame(loop);
  var fps = 1000 / (timestamp - lastTimestamp)
  lastTimestamp = timestamp;
  fpsMeter.innerText = 'fps: ' + Math.trunc(fps);
}
loop();