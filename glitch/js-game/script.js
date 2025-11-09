"use strict";
var MAX_EXPECTED_WIDTH = 100;
var CHUNK_SIZE = 200;

class Thing {
  constructor(x) {
    //pass
  }
  
  //convenient
  get xMid() {
    return this.x + this.width / 2;
  }
  get yMid() {
    return this.y + this.height / 2;
  }
  get chunk() {
    return Thing.xToChunk(this.x);
  }
  
  //shoot based on target location
  shoot(x, y, speed, shootType={}) {
    //darn it, maths!
    var diffx = x - this.xMid;
    var diffy = y - this.yMid;
    var mag = Math.sqrt(diffx * diffx + diffy * diffy);
    if (mag == 0) this.removeHp(1);
    var dx = diffx / mag;
    var dy = diffy / mag;
    var xOffset = this.width * (dx + .5);
    var yOffset = this.height * (dy + .5);
    dx *= speed;
    dy *= speed;
    this.container.playSFX('thing.shoot', this);
    this.container.add(new Projectile(this.x + xOffset, this.y + yOffset, 20, dx, dy, 50, this, shootType));
  }
  
  //general checkCol, checks collision via rectangle collision algorithm, returns how many collisions there were
  checkCol(self, indexName, callback) {
    var collisions = 0;
    //remember that things has objects but typeIndex has indeices to things.
    var container = self.container;
    var things = container.things;
    //only check in own chunk for indexName
    var index = container.chunkedTypeIndex[indexName + self.chunk];
    //if on boundary, check boundary chunk
    //right edge in other chunk
    if ((self.x + self.width) % CHUNK_SIZE < self.width) {
      let otherIndex = container.chunkedTypeIndex[indexName + (self.chunk + 1)];
      index = index ? index.concat(otherIndex) : otherIndex;
    }
    //left edge able to collide with other thing in other chunk
    if ((self.x - MAX_EXPECTED_WIDTH) % CHUNK_SIZE > self.width) {
      let otherIndex = container.chunkedTypeIndex[indexName + (self.chunk - 1)];
      index = index ? index.concat(otherIndex) : otherIndex;
    }
    if (!index) return 0;
    for (var i in index) {
      //very confusing
      var idx = index[i];
      if (self.id == idx) continue;
      var thing = things[idx];
      if (!thing) continue;
      //positive if ...
      var checks = [
        thing.x + thing.width - self.x, //left of self < right of thing
        self.x + self.width - thing.x , //right of self > left of thing
        thing.y + thing.height - self.y, //top of self < bottom of thing
        self.y + self.height - thing.y //bottom of self > top of thing
      ];
      //if touching and not self
      if (checks.reduce((a, c) => a && (c > 0), true)) {
        //execute callback in self, pass thing and checks
        var stop = callback.bind(self)(thing, checks);
        //collisions increment
        collisions++;
        //if callback returns true, break
        if (stop) break;
      }
    }
    return collisions
  }
  //find what chunk something is in based on its x value
  static xToChunk(x) {
    return (x / CHUNK_SIZE) | 0;
  }
}

class Player extends Thing {
  constructor(x, y, input, name) {
    super();
    //position of top left corner on screen
    this.x = x;
    this.y = y;
    //[left, right, up, down]
    this.input = input;
    //name to display
    this.name = name;
    //for identification during collision, etc.
    this.type = 'player';
    //speed
    this.dx = 0;
    this.dy = 0;
    //used during both drawing and collision
    this.width = 100;
    this.height = 95;
    this.maxHeight = this.height;
    this.minHeight = 45;
    //base speed for running
    this.speed = 7;
    //when true, player is on the ground
    this.grounded = false;
    //when true, player is in water
    this.inWater = false;
    //when true, player is crouching
    this.crouching = false;
    //when > than 0, player is dodging
    this.dodging = 0;
    //max hp and hp counter
    //GLOBAL T WARNING
    this.maxHp = 5;
    this.hp = t.challenges['one hit wonder'] ? 0.1 : this.maxHp;
    //disables x movement for its value in frames, for recoil
    this.disableX = 0;
    //disables shooting after shooting
    this.disableShoot = 0;
  }

  //polls keyboard input. Updates position/velocity/state accordingly.
  pollInput() {
    //collect polled keys
    var polledKeys = [];
    for (var i = 0; i < this.input.length; i++) {
      var key = keysDown[this.input[i]];
      polledKeys.push(key);
    }
    //must nuke dx here, otherwise collision bugs out, also check this.disableX
    if (this.disableX <= 0) {
      //if in water, have some inertia
      if (this.inWater) this.dx *= 0.95;
      else this.dx = 0;
    }
    else {
      this.dx *= 0.9;
      polledKeys[0] = false;
      polledKeys[1] = false;
      this.disableX--;
    }
    //everything else
    //move slower in water because there is more inertia, no actual jumping
    if (this.inWater) {
      if (polledKeys[0]) this.dx -= 0.1 * this.speed;
      if (polledKeys[1]) this.dx += 0.1 * this.speed;
      if (polledKeys[2]) {
        //if (this.dy > 0) this.container.playSFX('player.swim', this);
        this.dy -= 1.5;
      }
      if (polledKeys[3]) {
        this.dy += 0.5;
      }
      if (polledKeys[4] || polledKeys[5]) this.airDodge();
    }
    //grounded out of water state
    else if (this.grounded) {
      if (polledKeys[0]) this.dx -= 1 * this.speed;
      if (polledKeys[1]) this.dx += 1 * this.speed;
      //only play jump sound from actual input
      if (polledKeys[2]) {
        this.container.playSFX('player.jump', this);
        this.jump(17.5);
      };
      if (polledKeys[3]) this.setCrouchState(true);
      else this.setCrouchState(false);
    }
    //in air move faster
    else {
      if (polledKeys[0]) this.dx -= 1.5 * this.speed;
      if (polledKeys[1]) this.dx += 1.5 * this.speed;
      //if not trying to dodge, decrease wait until next dodge
      if (polledKeys[4] || polledKeys[5]) this.airDodge();
    }
    //shooting
    if (this.disableShoot > 0) {
      this.disableShoot--;
    }
    else {
      //mouse shooting
      if (keysDown.click) {
        super.shoot(keysDown.click[0], keysDown.click[1], 20);
        keysDown.click = undefined;
        this.disableShoot = 10;
      }
      //keyboard shooting auto-aims
      if (keysDown.k) {
        var enemyIndices = this.container.typeIndex.enemy;
        var lowestDist = Infinity;
        var closestEnemy = this;
        for (var index in enemyIndices) {
          var enemy = this.container.things[enemyIndices[index]];
          var squaredDist = (enemy.xMid - this.xMid) ** 2 + (enemy.yMid - this.yMid) ** 2;
          if (squaredDist < lowestDist) {
            lowestDist = squaredDist;
            closestEnemy = enemy;
          }
        }
        super.shoot(closestEnemy.xMid , closestEnemy.yMid, 20);
        this.disableShoot = 30;
      }
    }
  }

  //updates x, y, and height based on dx, dy, and grounded / dodging status.
  updatePos() {
    //updates x
    this.x += this.dx;
    //updates y
    if (this.grounded) {
      this.dy = 0;
      if (this.dodging > 0) this.dodging = 0;
      else this.dodging--;
    }
    else {
      if (this.inWater) this.dy *= 0.9;
      this.y += this.dy;
      if (this.inWater) this.dy += 0.5;
      else this.dy++;
      if (100 < this.dy) this.dy = 100;
      if (-100 > this.dy) this.dy = -100;
      //hurts player if below ground for too long
      if (this.y > this.container.yMax) this.removeHp(1);
      //updates height
      if (!this.crouching) {
        if (this.height < this.maxHeight) this.height += 2;
        else this.height = this.maxHeight;
      }
      this.dodging--;
    }
  }

  //does extra stuff beyond general function given
  checkCol() {
    var collided = 0;
    collided += super.checkCol(this, 'player', this.wallCol);
    collided += super.checkCol(this, 'enemy', this.wallCol);
    collided += super.checkCol(this, 'wall', this.wallCol);
    //fall if not touching anything and not crouch-floating
    if (!collided && !this.crouching) this.jump(0);
    
    //check if there touching water, if so, water physics
    collided = super.checkCol(this, 'water', this.waterCol);
    //update water status if not in water
    if (!collided) this.inWater = false;
    
    //heal only heals, not wall-like object
    super.checkCol(this, 'heal', this.healCol);
  }

  //handles player and wall collision. Updates position/velocity/state accordingly.
  wallCol(thing, checks) {
    var c1 = checks[1] < this.dx + 5;
    var c0 = checks[0] < 5 - this.dx;
    var c3 = checks[3] < this.dy + 5;
    var c2 = checks[2] < 5 - this.dy;
    //if this is to the side of thing, nuke x velocity and stick x position
    if (c1) {
      this.x = thing.x - this.width;
      this.dx = 0;
    }
    else if (c0) {
      this.x = thing.x + thing.width;
      this.dx = 0;
    }
    //if bottom of this is above thing, land on thing
    else if (c3) {
      this.land(thing.y - this.height);
    }
    //if this is below thing and in air, nuke y velocity, and then height no matter what
    else if (c2) {
      if (!this.grounded) {
        this.y -= this.dy;
        this.dy = 1;
      }
      //un-updates height gain from this.updatePos
      if (!this.crouching) {
        if (this.height > this.minHeight) {
          this.height -= 2;
          this.y += 2;
        }
        else this.height = 46;
      }
    }
  }

  //handles heal collision. Heals self and kills heal.
  healCol(thing) {
    this.hp = this.maxHp;
    this.container.playSFX('player.heal', this);
    this.container.remove(thing);
  }
  
  //handles water collision. Does nothing much as of yet.
  waterCol() {
    this.inWater = true;
    //only needs one square of water
    return true;
  }

  //updates camera to player's middle if center is past half the screen, for both axes
  updateCamera() {
    //for x, don't scroll if boss
    var ownCenter = this.xMid;
    var canvasCenter = this.ctx.canvas.width / 2;
    if (canvasCenter < ownCenter && !this.container.mData.etype) this.container.cameraX = ownCenter - canvasCenter;
    else this.container.cameraX = 0;
    //for y, stuff is weird, very spaghet
    ownCenter = this.yMid;
    var canvasHeight = this.ctx.canvas.height;
    canvasCenter = this.container.yMax - canvasHeight;
    if (canvasCenter !== 0 && canvasCenter + canvasHeight / 2 > ownCenter) this.container.cameraY = ownCenter - canvasHeight / 2;
    else this.container.cameraY = canvasCenter;
    if (ownCenter < 0) this.container.cameraY = ownCenter - canvasCenter;
  }

  //sets crouch state, jumps if state changes from true to false
  setCrouchState(state) {
    //if crouch off, don't do anything
    if (this.container.challenges['no crouch']) return;
    //max jump speed is (this.maxHeight - this.minHeight) * (25 / 55) = 25
    if (this.crouching && !state) {
      //also play sound here
      this.container.playSFX('player.jump', this);
      this.jump((this.maxHeight - this.height) * 5 / 11, true);
    }
    this.crouching = state;
    //if state is true
    if (!state) return;
    //if height not minimized, shrink
    if (this.height > this.minHeight) {
      this.height--;
      this.y++;
    }
    //otherwise force jump
    else this.setCrouchState(false);
  }

  //unground and jump
  jump(vel, overrideChecks) {
    //no jumps in air / jumps while crouched failsafe, important, unless I really don't care
    if (overrideChecks || (this.grounded && (this.height > 60 && !this.crouching))) {
      this.dy = -1 * vel;
      this.grounded = false;
    }
  }

  //ground and unjump
  land(y) {
    this.grounded = true;
    //play sfx only if dy is large
    if (this.dy > 10) this.container.playSFX('player.land', this);
    this.dy = 0;
    this.y = y;
  }
  
  //when in air, can dodge for a bit
  airDodge() {
    //if not ready, return
    if (this.dodging > -30) return;
    //set dodging timer
    this.dodging = 30;
  }

  //recoil from projectile, do damage, return whether successful
  recoil(dx, dy, projectile) {
    //if crouching, reflect
    if (this.crouching) {
      this.container.playSFX('player.reflect', this);
      return false;
    }
    //if dodging, pretend it hit, but do no damage
    if (this.dodging > 0) return true;
    this.grounded = false;
    //equal sign important here
    this.dx = Math.sign(dx) * 5;
    if (this.height > 75) this.jump(Math.sign(dy) * -5, true);
    this.disableX = 20;
    //damage formula
    this.removeHp((Math.abs(dx) + Math.abs(dy)) / 20);
    return true;
  }

  //remove hp, if less than or equal to 0, kill self, halt everything, and restart in 2 seconds
  removeHp(lostHp) {
    this.hp -= lostHp;
    if (this.hp <= 0) {
      //halts everything and restarts
      this.container.remove(this);
      var ct = this.container;
      ct.remove(this);
      ct.pause('YOU DIED');
      window.setTimeout(ct.init.bind(ct), 2000);
    }
  }

  draw() {
    //draw the body. If dodging, flicker.
    if (this.dodging <= 0 || this.dodging % 3) this.ctx.drawImage(assets.PlayerImg, this.x, this.y, this.width, this.height);
    //draw the name
    this.ctx.textAlign = 'left';
    this.ctx.strokeStyle = '#000000';
    this.ctx.font = '10px sans-serif';
    this.ctx.strokeText(this.name, this.x, this.y);
    //draw the hp to nearest 10th
    this.ctx.textAlign = 'right';
    this.ctx.font = '20px sans-serif';
    this.ctx.strokeText(Math.ceil(this.hp * 10) / 10, this.x + this.width, this.y);
  }

  //must go in this order
  everyFrame() {
    this.pollInput();
    this.updatePos();
    this.checkCol();
    this.updateCamera();
  }
}

class Enemy extends Thing {
  constructor(x, y, behavior) {
    super();
    this.x = x;
    //y is private because it is dependent on hp
    this._y = y;
    //determines a lot of behavior, i.e. 'walk'
    this.behavior = behavior;
    this.dx = -1;
    this.dy = 0;
    //different sizes for different behaviors
    switch (this.behavior) {
      case 'boss1':
      case 'boss2':
        this.width = 100;
        this.hp = 20;
        break;
      case 'swim':
        this.width = 50;
        this.hp = 5;
        break;
      default:
        this.width = 50;
        this.hp = 10;
    }
    //used for auto-updating height / y to hp
    this.maxHp = this.hp;
    this.maxHeight = this.width;
    this.type = 'enemy';
    //home for very mobile enemies
    this.home = [this.xMid, this.yMid];
    //used to know when to shoot every frame
    this.shootCounter = 0;
    this.shootDelay = 40;
    //boss1 and fly shoot less frequently
    if (this.behavior === 'boss1') this.shootDelay *= 2;
    if (this.behavior === 'fly' || this.behavior === 'boss2') this.shootDelay *= 3;
    //GLOBAL T WARNING
    //shootType defines properties of projectiles shot from this enemy.
    this.shootType = {}
    if (t.challenges['stronger enemies']) this.shootType.frag = true;
    if (this.behavior === 'fly' || this.behavior === 'boss2') this.shootType.noCol = true
  }
  
  //height is proportion of hp left
  get height() {
    return (this.hp / this.maxHp) * this.maxHeight;
  }
  //y is _y but plus lost height
  get y() {
    return this._y + this.maxHeight - this.height;
  }
  set y(v) {
    this._y = v - this.maxHeight + this.height;
  }

  //update position
  updatePos() {
    //other stuff
    switch (this.behavior) {
      //if swimming, swim
      case 'swim':
        //oscillate around home
        this.dx -= (this.xMid - this.home[0]) / 100;
        this.dx *= 0.99;
        this.dy -= (this.yMid - this.home[1]) / 100;
        this.dy *= 0.99;
        break;
      //if flying, fly
      case 'fly':
      case 'boss2':
        //oscillate around player horizontally
        this.dy = 0;
        this.dx -= (this.xMid - this.container.player.xMid) / 100;
        //cap dx
        this.dx *= 1 + Math.random() / 10
        if (Math.abs(this.dx) > 10) this.dx = 10 * Math.sign(this.dx);
        //special boss2 stuff, he's basically a mixture
        if (this.behavior === 'boss2') {
          this.dy -= (this.yMid - this.home[1]) / 100;
          this.dy *= 0.99;
        }
        break;
      //otherwise don't move up or down
      default:
        this.dy = 0;
        //cap dx
        if (Math.abs(this.dx) > 2) this.dx = 2 * Math.sign(this.dx);
    }
    
    //dodging
    if (this.behavior === 'swim' || this.behavior === 'boss2') {
      //if projectile near, dodge perpendicularly
      var projectiles = this.container.typeIndex.projectile;
      for (var index in projectiles) {
        var projectile = this.container.things[projectiles[index]];
        //only projectiles not from self
        if (projectile.player.id === this.id) continue;
        if (Math.abs(projectile.x - this.x) + Math.abs(projectile.y - this.y) < 100) {
          //dodge perpendicularly in either direction
          let direction = [-1, 1][Math.random() * 2 | 0]
          this.dx = direction * -0.5 * projectile.dy;
          this.dy = direction * 0.5 * projectile.dx;
        }
      }
    }
    
    //moving
    this.x += this.dx;
    this.y += this.dy;
  }

  //checks every wall twice because I'm lazy
  checkCol() {
    switch (this.behavior) {
      case 'swim':
        //if not in water, go to home
        var collided = super.checkCol(this, 'water', () => true);
        if (!collided) {
          this.dx = 0;
          this.dy = 0;
        }
        //if in wall, get out
        super.checkCol(this, 'wall', function(thing) {
          this.x -= this.dx;
          this.y -= this.dy;
          this.dx = 0;
          this.dy = 0;
        });
        break;
      case 'fly':
      case 'boss2':
        //don't check collision
        break;
      default:
        //normal wall-like object collision
        super.checkCol(this, 'wall', this.wallCol);
        super.checkCol(this, 'player', this.wallCol);
        super.checkCol(this, 'enemy', this.wallCol);
        //temporarily make y 5 less than it is and extend x by a body width
        var xChange = this.dx * this.width;
        this.x += xChange;
        this.y += 5;
        var collided = super.checkCol(this, 'wall', () => true);
        this.x -= xChange;
        this.y -= 5;
        //if nothing is 5 below, change direction
        if (!collided) this.dx *= -1;
    }
  }

  //handles wall collision. Can turn self around if lateral collision detected.
  wallCol(thing, checks) {
    //if this is to the side of thing
    if (checks[1] < this.dx + 5) {
      this.dx = -1;
    }
    if (checks[0] < 5 - this.dx) {
      this.dx = 1;
    }
  }

  //just copy the player's shoot unless special is passed, then use cool params
  shoot(dx, dy, speed, special) {
    if (!special) {
      super.shoot(dx, dy, speed, this.shootType)
      return;
    }
    var x = this.xMid + dx;
    var y = this.yMid + dy;
    super.shoot(x, y, speed, this.shootType);
  }

  //recoil from projectile, do damage, return whether successful
  recoil(dx, dy, projectile) {
    //if boss1, reflect bullet if facing towards bullet. Boss has 10 hp btw.
    if (this.behavior === 'boss1') {
      if (Math.sign(dx) !== Math.sign(this.dx)) {
        this.container.playSFX('player.reflect', this);
        return false;
      }
    }
    //if flier, go up a bit
    if (this.behavior === 'fly') this.y -= 10;
    if (this.behavior === 'boss2') this.y -= 20;
    //general recoil
    this.dx += Math.sign(dx);
    //damage formula
    var damage = (Math.abs(dx) + Math.abs(dy)) / 20;
    //if boss2, reduce damage taken
    if (this.behavior === 'boss2') damage /= 2;
    this.removeHp(damage);
    return true;
  }

  //also updates height
  removeHp(lostHp) {
    this.hp -= lostHp;
    if (this.hp <= 0) {
      this.container.playSFX('enemy.die', this);
      this.container.add(new Burst(this.xMid, this.yMid, 5, 20));
      this.container.remove(this);
    }
  }

  //if boss, draw different sprite based on dx
  draw() {
    switch (this.behavior) {
      case 'boss1':
        let flipScale = this.dx < 0 ? -1 : 1
        this.ctx.scale(flipScale, 1)
        this.ctx.drawImage(assets.Boss1Img, this.x * flipScale, this.y, this.width * flipScale, this.height);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        break;
      case 'swim':
      case 'boss2':
        this.ctx.drawImage(assets.Boss2Img, this.x, this.y, this.width, this.height);
        break;
      default:
        this.ctx.drawImage(assets.EnemyImg, this.x, this.y, this.width, this.height);
    }
  }

  everyFrame() {
    //move
    switch (this.behavior) {
      case 'lock':
      case 'float':
        //do nothing
        break;
      case 'walk':
      case 'boss1':
      case 'swim':
      case 'fly':
      case 'boss2':
        //move and check wall-like collision
        this.updatePos();
        this.checkCol();
    }
    //shoot
    if (this.shootCounter > this.shootDelay) {
      switch (this.behavior) {
        case 'walk':
        case 'lock':
          //shoot upwards only
          this.shoot(Math.random() - 0.5, Math.random() - 1, 5, true);
          break;
        case 'float':
        case 'swim':
          //shoot everywhere
          this.shoot(Math.random() - 0.5, Math.random() - 0.5, 5, true);
          break;
        case 'boss1':
          //shoot at player
          this.shoot(this.container.player.x, this.container.player.y, 10);
          //boss heals self every time it shoots
          if (this.maxHp > this.hp) this.hp += 0.5;
          else this.hp = this.maxHp
          break;
        case 'boss2':
          //boss heals self every time it shoots
          if (this.maxHp > this.hp) this.hp += 0.5;
          else this.hp = this.maxHp
        case 'fly':
          //shoot at player through walls (see shootType)
          this.shoot(this.container.player.x, this.container.player.y, 5);
          break;
        default:
          throw('Enemy Behavior');
      }
      this.shootCounter = 0;
    }
    else this.shootCounter++;
  }
}

//Projectile constructor
class Projectile extends Thing {
  constructor(x, y, r, dx, dy, time, player={id:-1}, shootType={}) {
    super();
    //takes x and y as center and normalizes it to its rect corner
    this.r = r;
    this.x = x - this.r;
    this.y = y - this.r;
    this.dx = dx;
    this.dy = dy;
    this.time = time;
    this.player = player;
    this.type = 'projectile';
    //properties of shot
    this.shootType = shootType;
  }
  
  //might as well, should be based on r
  get width() {
    return 2 * this.r;
  }
  get height() {
    return 2 * this.r;
  }

  //updates position and kills self if expired, unless this.shootType.frag
  updatePos() {
    this.x += this.dx;
    this.y += this.dy;
    this.time--;
    if (!this.time || this.time <= 0) {
      if (this.shootType.frag) this.fragmentSelf(5, 2, Math.random() * 2 * Math.PI);
      this.container.remove(this);
    }
  }
  
  //shoot similar projectiles from self in several directions
  fragmentSelf(count, speedMult, startAngle, endAngle = startAngle + 2 * Math.PI) {
    //prevent weird rounding errors by using counter
    var spread = (endAngle - startAngle) / count;
    var fragmentSpeed = Math.sqrt(this.dx ** 2 + this.dy ** 2) * speedMult;
    for (var i = 0; i < count; i++) {
      let angle = startAngle + i * spread;
      let dx = Math.cos(angle) * fragmentSpeed;
      let dy = Math.sin(angle) * fragmentSpeed;
      //shoot using projectile constructor
      this.container.add(new Projectile(this.xMid, this.yMid, 5, dx, dy, 10, this.player));
    }
  }

  //handles wall collision. Kills self and stops other checking.
  wallCol() {
    this.container.remove(this);
    return true;
  }

  //handles player-like object collision. Updates position/velocity/state accordingly.
  playerCol(thing) {
    //can't hit self with own projectile
    if (this.player.id == thing.id) return;
    //recoil from projectile
    var success = thing.recoil(this.dx, this.dy, this);
    //if successful, kill projectile automatically
    if (success) {
      this.container.playSFX('thing.recoil', this);
      this.container.remove(this);
    }
    //if unsuccessful, reflect
    else {
      this.dx *= -1.5;
      this.dy *= -1.5;
      this.player = thing;
    }
  }
  
  //water slows down projectiles
  waterCol() {
    this.dx *= 0.99;
    this.dy *= 0.99;
  }

  draw() {
    //drawn as circle
    this.ctx.drawImage(assets.ProjectileImg, this.x, this.y, this.width, this.height);
    /*used to just be a circle
    this.ctx.strokeStyle = '#000000';
    this.ctx.beginPath();
    this.ctx.arc(this.x + this.r, this.y + this.r, this.r, 0, 2*Math.PI);
    this.ctx.stroke();*/
  }

  everyFrame() {
    this.updatePos();
    //if not noCol, can collide with walls
    if (!this.shootType.noCol) super.checkCol(this, 'wall', this.wallCol);
    //other collision
    super.checkCol(this, 'player', this.playerCol);
    super.checkCol(this, 'enemy', this.playerCol);
    super.checkCol(this, 'water', this.waterCol);
  }
}

//Wall constructor. Don't make it check any collision.
class Wall extends Thing {
  constructor(x, y, width, height, facing=1, vertical=0, sheet='WallImgs', time=NaN) {
    super();
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = 'wall';
    //facing is blocks to left + 2 * blocks to right
    //vertical is 0 when there is nothing, 1 when there is something below but not above, and 2 when there is something above
    //however, if there is something below and above, facing is set to 3, so beware
    //sheet is just the name of the sheet in assets
    this.sprite = [facing, vertical, sheet];
    //time left in frames ticked, NaN if permanent
    this.time = time;
    //add plant randomly
    if (Math.random() < 0.1 && vertical < 2) {
      this.plant = new Plant(this, 0.5);
    }
  }

  draw() {
    //assets[this.sprite[2]] is a 4 x 3 grid of 32 x 32 sprites
    this.ctx.drawImage(assets[this.sprite[2]], 32 * this.sprite[0], 32 * this.sprite[1], 32, 32, this.x, this.y, this.width, this.height);
    //draw plant if exists
    if (this.plant) this.plant.draw();
  }

  everyFrame() {
    this.time--;
    if (this.time <= 0) this.container.remove(this);
  }
}

//just for that plant touch, attached to walls
class Plant extends Wall {
  constructor(parent, scale) {
    super();
    //for getting ctx
    this.parent = parent;
    //random sprite
    this.sprite = Math.random() * 3 | 0;
    //distributed over wall top, scale is size compared to wall
    this.x = parent.x + Math.random() * parent.width;
    this.width = parent.width * scale;
    this.y = parent.y - parent.height * scale;
    this.height = parent.height * scale;
  }
  //draw plant
  draw() {
    //assets.PlantImgs is a 3 x 1 grid of 12 x 14 sprites with 2 width padding
    this.parent.ctx.drawImage(assets.PlantImgs, 14 * this.sprite, 0, 12, 14, this.x, this.y, this.width, this.width);
  }
}

//Water is similar to Wall
class Water extends Wall {
  constructor(x, y, width, height, time) {
    super(x, y, width, height);
    this.time = time;
    this.type = 'water';
  }
  
  draw() {
    //gradient for cool water effect
    var grd = ctx.createLinearGradient(0, 0, 0, 200);
    grd.addColorStop(0, "#1111ff");
    grd.addColorStop(1, "#000000");
    this.ctx.fillStyle = grd;
    //draw 1 pixel thicker for coverage
    this.ctx.fillRect(this.x - 0.5, this.y - 0.5, this.width + 0.5, this.height + 0.5);
  }
}

//Heal constructor. Heals player upon being touched.
class Heal extends Thing {
  constructor(x, y, size) {
    super();
    this.x = x;
    this.y = y;
    this.width = size;
    this.height = size;
    this.type = 'heal';
  }

  draw() {
    this.ctx.drawImage(assets.HealImg, this.x, this.y, this.width, this.height);
  }

  everyFrame() {
    //none, interacts via collision
  }
}

//Burst constructor. Purely visual, for bursts.
class Burst extends Thing {
  constructor(x, y, dr, time) {
    super();
    this.x = x;
    this.y = y;
    this.r = 0;
    this.dr = dr;
    this.time = time;
    this.type = 'burst';
  }

  draw() {
    //drawn as full circle
    //this.ctx.drawImage(assets.BurstImg, this.x - this.r, this.y - this.r, this.r * 2, this.r * 2);
    //is just a circle right now
    this.ctx.fillStyle = '#0000FF';
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
    this.ctx.fill();
  }

  //expand by dr, until time is up
  everyFrame() {
    this.r += this.dr;
    this.time--;
    if (this.time <= 0) this.container.remove(this);
  }
}

//Button constructor, used in the menu, not a Thing, x and y define center with y a bit lower
class Button {
  constructor(container, x, y, text, fontSize, onclick) {
    this.container = container;
    this.ctx = this.container.ctx;
    this.x = x;
    this.y = y;
    this.text = text;
    //if array, have textState
    if (typeof this.text === 'object') {
      this.textState = 0;
    }
    else {
      this.textState = null;
    }
    this.fontSize = fontSize;
    //onclick action
    this.onclick = onclick;
    //whether it is being hovered over
    this.hoveredOver = false;
  }
  
  //because text is jank
  get currentText() {
    return this.textState === null ? this.text : this.text[this.textState];
  }
  get width() {
    this.ctx.font = this.font;
    return this.ctx.measureText(this.currentText).width;
  }
  get height() {
    return this.fontSize;
  }
  get font() {
    return this.fontSize + 'px impact';
  }
  
  //check if mouse click hit button
  checkCol(clickX, clickY, click) {
    //if just for looks, don't do this
    if (!this.onclick) return;
    var checks = [
      clickX < this.x + this.width / 2, //click is to left of right side
      clickX > this.x - this.width / 2, //click is to right of left side
      clickY < this.y + this.height / 4, //click above bottom
      clickY > this.y - 3 * this.height / 4 //click is below top
    ];
    this.hoveredOver = false;
    //if checks are all true
    if (checks.reduce((a, c) => a && c, true)) {
      //if clicked, onclick, otherwise is hoveredOver
      if (click) {
        this.onclick();
      }
      else this.hoveredOver = true;
    }
  }
  
  //toggle textState upwards one, loop if needed
  toggle(min=0, max=this.text.length) {
    this.textState = this.textState < min ? min : this.textState + 1;
    if (this.textState === max) this.textState = min;
  }

  draw() {
    //text
    this.ctx.fillStyle = '#000000';
    this.ctx.textAlign = 'center';
    this.ctx.font = this.font;
    this.ctx.fillText(this.currentText, this.x, this.y);
    //underline if hovered over
    this.ctx.lineWidth = 3;
    if (this.hoveredOver) this.ctx.strokeRect(this.x - this.width / 2, this.y + this.height * 0.15, this.width, 0);
    this.ctx.lineWidth = 1;
  }
}

//ThingsContainer constructor to hold all things
class ThingsContainer {
  constructor(ctx) {
    //canvas context to draw to
    this.ctx = ctx;
    //things is a sparse array to save memory and time
    this.things = [];
    //for each thing.type there will be a type index for specific collision checking. Stores ids.
    this.typeIndex = {};
    //prepends chunk numbers at the end of types
    this.chunkedTypeIndex = {};
    //stop everything, i.e. dies or pauses. When true, contains string with reason.
    this.stop = false;
    //top left corner of camera
    this.cameraX = 0;
    this.cameraY = 0;
    //what objects to draw first
    this.drawOrder = ['water', 'wall']
    //bgm volume
    this.BGMVolume = 1;
    //sfx volume
    this.SFXVolume = 1;
    //background / sky on
    this.skyOn = 1;
    //menu up based on location hash
    this.menuUp = '/' + location.hash.slice(1);
    //BGM for menu done later because it can't be done now
    //challenges
    this.challenges = {
      'no heal': false,
      'one hit wonder': false,
      'no crouch': false,
      'decaying platforms': false,
      'stronger enemies': false
    }
    //init buttons
    this.initMenuButtons();
    //for clearing the request when needed
    this.cancelRAFId = window.requestAnimationFrame(this.everyFrame.bind(this));
  }

  //BGM change handling, autoplay upon set
  get BGM() {
    return this._BGM
  }

  set BGM(v) {
    //private bgm, pls don't use
    var BGM = this._BGM
    //stop current
    if (BGM) {
      BGM.pause();
      BGM.currentTime = 0;
    }
    //update current to new
    this._BGM = v;
    //if v falsy (undefined), don't play any music
    if (v) {
      this._BGM.volume = this.BGMVolume;
      //play new, if fail, then warn user and delete BGM from record
      this._BGM.play().then(
        () => {
          this.needsGesture = false;
        },
        (e) => {
          this.needsGesture = e.toString();
          delete this._BGM;
        }
      );
    }
  }
  
  //auto-update volume upon set
  get BGMVolume() {
    return this._BGMVolume;
  }
  set BGMVolume(v) {
    this._BGMVolume = v;
    //_BGM may not exist
    if (this._BGM) {
      this._BGM.volume = v;
    }
  }

  //adds container properties (id, container, ctx) and adds thing to things. Also pushes some indices.
  add(thing) {
    //container properties + push returns new length
    thing.id = this.things.push(thing) - 1;
    thing.container = this;
    thing.ctx = this.ctx;
    //add to or create new index
    var index = this.typeIndex[thing.type];
    if (index) index.push(thing.id);
    else this.typeIndex[thing.type] = [thing.id];
    //if enemy add to enemiesLeft
    if (thing.type === 'enemy') this.enemiesLeft++;
  }

  //remove thing from things and their index. Yay for sparse arrays!
  remove(thing) {
    //if enemy subtract from enemiesLeft
    if (thing.type === 'enemy') this.enemiesLeft--;
    delete this.things[thing.id];
    //thing does not have its typeIndex index on it, so it has to be looked up
    var index = this.typeIndex[thing.type];
    delete index[index.indexOf(thing.id)];
  }

  //pause game and music, play sound effect if applicable
  pause(message, gui) {
    //don't want to pause while menu is up or while winning
    if (this.menuUp || this.enemiesLeft === 'no check') return;
    this.stop = message;
    this.BGM.pause();
    //cleverness / play sfx
    var SFXName = ({PAUSED: 'meta.pause', 'YOU DIED': 'player.die'})[message];
    if (SFXName) this.playSFX(SFXName);
    //if wanted, pull up pause gui
    if (gui) this.menuUp = '/pause';
  }

  //unpause game and music
  unpause() {
    //don't want a double unpause
    if (!this.stop) return;
    this.stop = false;
    this.menuUp = false;
    if (this.BGM) this.BGM.play();
  }

  //plays sound effects based location of thing provided in source
  playSFX(name, sourceThing='meta') {
    //calculate volume if there is a player to listen to it
    if (!this.player) return;
    var volume;
    if (sourceThing === 'meta') {
      volume = this.SFXVolume;
    }
    else {
      var distance = Math.sqrt(
        (this.player.x + this.player.width / 2 - sourceThing.x - sourceThing.width / 2) ** 2 +
        (this.player.y + this.player.height / 2 - sourceThing.y - sourceThing.height / 2) ** 2);
      volume = 100 / distance;
      //multiply by sfx volume before clipping
      volume *= this.SFXVolume;
    }
    //clip volume
    volume = volume > 1 ? 1 : volume;
    if (!volume) volume = 0;
    //actually play sound
    var sf = assets[name];
    sf.currentTime = 0;
    sf.volume = volume;
    sf.play();
  }

  //takes image, adds things to things starting at (x, y), going to (width, height), to scale
  loadThingsFromImg(img, [x, y, width, height, scale]) {
    //init temp canvas
    var c1 = document.createElement('canvas');
    c1.width = width;
    c1.height = height;
    var c1c = c1.getContext('2d');
    c1c.drawImage(img, 0, 0, c1.width, c1.height);
    
    //other. Use image alt in sneaky way.
    var decayFlag = this.challenges['decaying platforms'];
    var mData = {};
    if (img.alt) mData = JSON.parse(img.alt);
    this.mData = mData
    
    //loop over image
    for (var w = 0; w < c1.width; w++) {
      for (var h = 0; h < c1.height; h++) {
        //data is an 8 bit clamped array in the form [R, G, B, A]
        var data = c1c.getImageData(w, h, 1, 1).data;
        //scaled vars
        var sX = (w + x) * scale;
        var sY = (h + y) * scale;
        //if red channel and allowed, add a heal at w and h
        if (data[0] > 127 && !this.challenges['no heal']) this.add(new Heal(sX, sY, scale));
        //if green channel, add a wall at w and h scaled to scale, also figure out [facing, grounded]
        if (data[1] > 127) {
          //find out if walls are above, below, and to left and right, and adjust sprite
          var isWallLeft = c1c.getImageData(w - 1, h, 1, 1).data[1] > 127;
          var isWallRight = c1c.getImageData(w + 1, h, 1, 1).data[1] > 127;
          var isWallAbove = c1c.getImageData(w, h - 1, 1, 1).data[1] > 127;
          var isWallBelow = c1c.getImageData(w, h + 1, 1, 1).data[1] > 127;
          //if water above, is wet
          var isWet = false;
          if (h !== 0) {
            let waterData = c1c.getImageData(w, 0, 1, h).data
            for (var i = 1; i < waterData.length; i += 4) {
              var wD = waterData[i];
              if (wD > 64 && wD < 128) isWet = true;
            }
          }
          //logic
          var facing = isWallLeft + 2 * isWallRight;
          var vertical = isWallAbove ? 2 : +isWallBelow;
          //special case
          if (isWallAbove && isWallBelow) facing = 3;
          //sprite sheet to use
          var sheet = 'WallImgs';
          if (isWet) {
            sheet = 'WetWallImgs';
            //add water in wall for looks
            this.add(new Water(sX, sY, scale, scale));
          }
          //add wall, make it decay if set to do that
          this.add(new Wall(sX, sY, scale, scale, facing, vertical, sheet, decayFlag ? (w + h) * 30 : undefined));
        }
        //add water
        else if (data[1] > 64) {
          this.add(new Water(sX, sY, scale, scale, decayFlag ? (w + h) * 30 : undefined));
        }
        //if blue channel, add an enemy at w and h
        if (data[2] > 127) {
          var isWallDownLeft = c1c.getImageData(w - 1, h + 1, 1, 1).data[1] > 127;
          var isWallDownRight = c1c.getImageData(w + 1, h + 1, 1, 1).data[1] > 127;
          var isWallBelow = c1c.getImageData(w, h + 1, 1, 1).data[1] > 127;
          let wD = c1c.getImageData(w, h, 1, 1).data[1];
          var isWet = wD > 64 && wD < 128
          //default if not below
          var behavior = 'walk';
          //lock if no wall to left or right (down 1) and if not below
          if (!isWallDownLeft && !isWallDownRight) behavior = 'lock';
          //float if wall below
          if (!isWallBelow) behavior = 'float';
          //if wet, swim
          if (isWet) behavior = 'swim';
          //override if enemy type specifies
          if (mData.etype) behavior = mData.etype;
          this.add(new Enemy(sX, sY, behavior));
        }
      }
    }
    //other mData stuff
    //flier enemy count
    if (mData.fliercount) {
      for (let i = 0; i < mData.fliercount; i++) this.add(new Enemy(i * 50, -25, 'fly'));
    }
    //killplane location
    switch (mData.ymax) {
      //preset values
      case 'imgheight':
        this.yMax = height * scale;
        break;
      //default value or custom number
      default:
        this.yMax = mData.ymax ? mData.ymax : this.ctx.canvas.height;
    }
  }

  //initializes self, resets everything if called again, based on level id.
  init(pause=false, levelId=this.levelId, worldId=this.worldId) {
    //remove everything
    this.things = [];
    this.typeIndex = {};
    //reset camera
    this.cameraX = 0;
    this.cameraY = 0;
    //enemies left
    this.enemiesLeft = 0;
    //menu down
    this.menuUp = false;
    
    //get wall data from assets based on levelId, then extract data via a temp canvas in this.loadThingsFromImg
    //resets to level 1 upon finishing all levels
    this.levelId = levelId;
    this.worldId = worldId;
    var level = assets['Level ' + this.worldId + '-' + this.levelId];
    if (!level) {
      this.worldId++;
      this.levelId = 1;
      level = assets['Level ' + this.worldId + '-1'];
      if (!level) {
        level = assets['Level 1-1'];
        this.worldId = 1;
      }
    };
    //background music
    this.BGM = assets['BGM' + this.worldId];
    
    //update 16 and 8 for larger maps
    var args = [0, 0, level.naturalWidth, level.naturalHeight, 50];
    //deals with load time differences
    if (level.complete) {
      this.loadThingsFromImg(level, args);
      //the player
      this.add(new Player(50, 50, 'adwsl ', 'Bob'));
      //thingsContainer player reference
      this.player = t.things[t.things.length - 1];
      //if unpause set, unpause
      if (pause) this.pause('     UNPAUSE TO START');
      else this.unpause();
    }
    else {
      this.pause('LOADING');
      window.requestAnimationFrame(this.loader.bind(this));
    }
  }

  //does loading animation
  loader() {
    //cool dot adder
    this.stop += '.';
    //draw loader
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.strokeStyle = '#000000';
    this.ctx.textAlign = 'left';
    this.ctx.font = '50px sans-serif';
    this.ctx.strokeText(this.stop, 0, 50);
    //if less than 3 dots (loading...)
    if (this.stop.length < 10) {
      window.requestAnimationFrame(this.loader.bind(this));
    }
    else {
      //still load with auto-pause
      this.init(true);
    }
  }

  //initializes menu buttons
  initMenuButtons() {
    //helpful
    var canvasMiddle = this.ctx.canvas.width / 2;
    var canvasBottom = this.ctx.canvas.height;
    var canvasRight = this.ctx.canvas.width;
    //buttons in the form Button(x, y, text, fontSize, onclick) organized my menu
    this.buttons = {};
    //main menu, arrow function also have cool lexical binding
    this.buttons['/'] = [
      new Button(this, canvasMiddle, 50, 'Bob the Red Box', 50, null),
      new Button(this, canvasMiddle, 100, 'play', 30, () => {this.init(false, 1, 1)}),
      new Button(this, canvasMiddle, 150, 'help', 30, () => {this.menuUp = '/help'}),
      new Button(this, canvasMiddle, 200, 'credits', 30, () => {this.menuUp = '/credits'}),
      new Button(this, canvasMiddle, 250, 'level select', 30, () => {this.menuUp = '/level_select'}),
      new Button(this, canvasMiddle, 300, 'challenges', 30, () => {this.menuUp = '/challenges'}),
      new Button(this, canvasMiddle, canvasBottom - 10, 'version indev', 10, null)
    ];
    
    //help menu
    this.buttons['/help'] = [
      new Button(this, canvasMiddle, 50, 'help', 50, null)
    ]
    //makes it easier for me to edit this section
    var helps = document.getElementById('help').children;
    for (var i = 0; i < helps.length; i++) {
      var helpText = helps[i].innerText;
      this.buttons['/help'].push(new Button(this, canvasMiddle, i * 30 + 100, helpText, 20, null));
    }
    
    //credits menu
    this.buttons['/credits'] = [
      new Button(this, canvasMiddle, 50, 'credits', 50, null)
    ]
    //makes it easier for me to edit this section
    var credits = document.getElementById('credits').children;
    for (var i = 0; i < credits.length; i++) {
      var creditText = credits[i].innerText;
      this.buttons['/credits'].push(new Button(this, canvasMiddle, i * 30 + 100, creditText, 20, null));
    }
    
    //level select menu
    var levelSelectHeader = new Button(this, canvasMiddle, 50, 'level select', 50, null);
    this.buttons['/level_select'] = [
      levelSelectHeader
    ]
    //load all level buttons
    var levelIds = Object.keys(assets).filter(x => x.slice(0, 6) === 'Level ');
    var numberOfWorlds = 0;
    for (var i = 0; i < levelIds.length; i++) {
      var levelText = levelIds[i];
      //get level and world from levelText
      var world_level = levelText.slice(6).split('-');
      var levelId = parseInt(world_level[1]);
      var worldId = parseInt(world_level[0]);
      //clever code for loading new menus
      if (worldId > numberOfWorlds) {
        numberOfWorlds = worldId;
        this.buttons['/level_select/' + worldId] = [levelSelectHeader];
      }
      //clever use of toggle text for storage
      this.buttons['/level_select/' + worldId].push(
        new Button(this, canvasMiddle, (levelId - 1) * 30 + 100, [levelText, levelId, worldId], 20,
                   function() {this.container.init(false, this.text[1], this.text[2])}));
    }
    //world select buttons
    for (var worldId = 1; worldId <= numberOfWorlds; worldId++) {
      var buttonText = 'world ' + worldId;
      this.buttons['/level_select'].push(
        new Button(this, canvasMiddle, (worldId - 1) * 30 + 100, [buttonText, worldId], 20,
                   function() {this.container.menuUp = '/level_select/' + this.text[1]}));
    }
    
    //challenges menu
    this.buttons['/challenges'] = [
      new Button(this, canvasMiddle, 50, 'challenges', 50, null)
    ]
    var challenges = Object.keys(this.challenges);
    for (var i = 0; i < challenges.length; i++) {
      var challenge = challenges[i];
      this.buttons['/challenges'].push(new Button(this, canvasMiddle, i * 30 + 100, [challenge, challenge + ' (on)'], 20, function() {
        //cleverness
        this.container.challenges[this.text[0]] ^= true;
        this.toggle();
      }));
    }
    
    //pause screen buttons
    this.buttons['/pause'] = [
      //music toggle
      new Button(this, canvasRight - 200, canvasBottom - 20, ['Music On', 'Music Off'], 20, function() {
        //turn off/on in clever way
        this.container.BGMVolume = this.textState;
        this.toggle();
      }),
      //sfx toggle
      new Button(this, canvasRight - 75, canvasBottom - 20, ['SFX High', 'SFX Off', 'SFX Low'], 20, function() {
        //toggle in clever way
        this.container.SFXVolume = this.textState;
        this.toggle();
      }),
      //skybox toggle
      new Button(this, 100, canvasBottom - 20, ['Background On', 'Background Off'], 20, function() {
        //toggle in clever way
        this.container.skyOn = this.textState;
        this.toggle();
      }),
      //back button to all menus
      new Button(this, canvasMiddle, canvasBottom - 30, ['back', "you can't do that here!",
                                                         'back to menu', 'are you sure?'], 30, function() {
        //special cases
        switch (this.container.menuUp) {
          //main menu, close game for lulz
          case '/':
            if (window.opener) {
              window.close();
            }
            else {
              //else be funny
              this.toggle(0, 2);
              setTimeout(this.toggle.bind(this), 1000, 0, 2);
            }
            break;
          //pause menu, go back to main menu after making sure they really do intend to go back
          case '/pause':
            if (this.textState <= 2) this.toggle(2, 4);
            else {
              this.textState = 0;
              this.container.menuUp = '/';
              this.container.BGM = assets.Menu;
            }
            break;
          //default, go back one menu
          default:
            var i = this.container.menuUp.lastIndexOf('/');
            this.container.menuUp = this.container.menuUp.slice(0, i);
            if (this.container.menuUp === '') this.container.menuUp = '/';
        }
      })
    ]
  }

  drawButtons() {
    //only see / use buttons on current screen, plus pause screen.
    var buttons = this.buttons[this.menuUp]
    if (this.menuUp !== '/pause') buttons = buttons.concat(this.buttons['/pause']);
    //click / hover detection
    if (keysDown.click) {
      let x = keysDown.click[0];
      let y = keysDown.click[1];
      buttons.forEach(button => button.checkCol(x - this.cameraX, y - this.cameraY, true));
      delete keysDown.click;
    }
    else if (keysDown.mousemove) {
      let x = keysDown.mousemove[0];
      let y = keysDown.mousemove[1];
      buttons.forEach(button => button.checkCol(x - this.cameraX, y - this.cameraY, false));
      delete keysDown.mousemove;
    }
    //draw buttons
    buttons.forEach(button => button.draw());
    //if this.needsGesture, print message
    //it would be cool to add this.needsGesture = 'YOUR FIRST "GESTURE" WAS MUTING THE MUSIC?!';this.easterEgg = true;, but I can't figure it out
    /*if (this.needsGesture) {
      this.ctx.font = '20px courier';
      this.ctx.strokeStyle = '#ff0000';
      this.ctx.textAlign = 'left';
      if (this.easterEgg) {
        this.ctx.strokeText(this.needsGesture, 0, 220);
      }
      else {
        this.ctx.strokeText('Your browser is not letting me play music right now because', 0, 300);
        this.ctx.strokeText(this.needsGesture.slice(0, 50) + '-', 0, 320);
        this.ctx.strokeText(this.needsGesture.slice(50), 0, 340);
        this.ctx.strokeText('Please click to hear awesome music :)', 0, 360);
      }
    }*/
  }

  //draws background and things, changes view area via setTransform
  draw(special) {
    var x = this.ctx;
    //background, draw first
    x.setTransform(1, 0, 0, 1, 0, 0);
    if (this.skyOn) {
      //parallax scrolling on image
      var paraScroll = -1 * this.cameraX / 5;
      x.drawImage(assets.Background, paraScroll + x.canvas.width, 0, x.canvas.width, x.canvas.height);
      x.drawImage(assets.Background, paraScroll, 0, x.canvas.width, x.canvas.height);
      x.drawImage(assets.Background, paraScroll - x.canvas.width, 0, x.canvas.width, x.canvas.height);
    }
    else {
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, x.canvas.width, x.canvas.height);
    }
    //if in menu, draw menu, then return
    if (special === 'menu') {
      this.drawButtons();
      return;
    }
    //things are affected by the camera, draw next
    x.setTransform(1, 0, 0, 1, -1 * this.cameraX, -1 * this.cameraY);
    //draw by type using this.drawOrder
    for (var i = 0; i < this.drawOrder.length; i++) {
      var indices = this.typeIndex[this.drawOrder[i]];
      for (var index in indices) {
        let thing = this.things[indices[index]];
        thing.draw();
      }
    }
    //draw everything else
    for (var type in this.typeIndex) {
      //skip what is already drawn
      if (this.drawOrder.includes(type)) continue;
      var indices = this.typeIndex[type];
      for (var index in indices) {
        let thing = this.things[indices[index]];
        thing.draw();
      }
    }
    //global overlays, don't use the camera, draw last
    x.setTransform(1, 0, 0, 1, 0, 0);
    //stop message
    if (this.stop) {
      x.fillStyle = '#000000';
      x.textAlign = 'left';
      x.font = '50px impact';
      x.fillText(this.stop, 0, 50);
    }
    //enemies left display
    x.fillStyle = '#000033';
    x.textAlign = 'right';
    x.font = '30px courier';
    var left = this.enemiesLeft > 0 ? this.enemiesLeft : 'none';
    x.fillText(left + ' left.', x.canvas.width, 30);
    //restarts into next level only if checks pass
    if (left === 'none' && this.enemiesLeft !== 'no check' && this.typeIndex.enemy) {
      if (!Object.keys(this.typeIndex.enemy)[0]) {
        //prevent this from being executed more than once
        this.enemiesLeft = 'no check';
        //play win sfx after stopping music
        this.BGM = undefined;
        this.playSFX('meta.win');
        window.setTimeout(this.init.bind(this), 2000, true, this.levelId + 1);
      }
    }
    //if in puase screen, draw pause buttons with banner at bottom
    if (special === 'pause') {
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.fillStyle = '#eeeeee';
      x.fillRect(0, x.canvas.height - 60, x.canvas.width, x.canvas.height);
      this.drawButtons();
    }
  }

  //executes the 'everyFrame's of things and then draws things every frame if not stopped
  everyFrame() {
    //if menu up, draw menu
    if (this.menuUp) {
      //if there is no BGM, attempt to set the BGM to Menu
      if (!t.BGM) t.BGM = assets.Menu;
      //if paused, only draw pause buttons
      if (this.menuUp === '/pause') this.draw('pause');
      //else draw menu normally
      else this.draw('menu');
    }
    else {
      //populate chunked type index as well as a plain chunk index
      this.chunkedTypeIndex = {};
      this.chunkIndex = {}
      this.things.forEach(thing => {
        //chunked type
        var chunkedType = thing.type + thing.chunk;
        if (this.chunkedTypeIndex[chunkedType]) this.chunkedTypeIndex[chunkedType].push(thing.id);
        else this.chunkedTypeIndex[chunkedType] = [thing.id];
        //just that sweet chunky peanut butter
        if (this.chunkIndex[thing.chunk]) this.chunkIndex[thing.chunk].push(thing.id);
        else this.chunkIndex[thing.chunk] = [thing.id];
      });
      //do everyFrames of things onscreen
      let firstChunk = Thing.xToChunk(this.cameraX);
      let lastChunk = Thing.xToChunk(this.cameraX + this.ctx.canvas.width);
      let thingsOnScreenIndex = [];
      for (let chunk = firstChunk; chunk <= lastChunk; chunk++) {
        let index = this.chunkIndex[chunk];
        if (index) thingsOnScreenIndex = thingsOnScreenIndex.concat(index);
      }
      if (!this.stop) thingsOnScreenIndex.forEach(id => {
        let thing = this.things[id];
        if (thing) thing.everyFrame()
      });
      //finally, draw
      this.draw();
    }
    window.requestAnimationFrame(this.everyFrame.bind(this));
  }
}


//canvas init
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
//assets init
{
  const rawAssets = document.getElementById('assets').children;
  var assets = {};
  for (var i = 0; i < rawAssets.length; i++) {
    var asset = rawAssets[i];
    assets[asset.id] = asset;
  }
}
//general key press / click detection
var keysDown = {};
//key detection
document.addEventListener('keydown', e => keysDown[e.key] = true);
document.addEventListener('keyup', e => keysDown[e.key] = false);
//click detection
canvas.addEventListener('click', e => keysDown['click'] = [e.offsetX + t.cameraX, e.offsetY + t.cameraY]);
//hover detection
canvas.addEventListener('mousemove', e => keysDown['mousemove'] = [e.offsetX + t.cameraX, e.offsetY + t.cameraY]);
//pause toggle upon p or esc press
document.addEventListener('keypress', e => {if (e.key === 'p') t.stop ? t.unpause() : t.pause('PAUSED', true)});
//pause upon lost focus
window.addEventListener('blur', e => {t.pause('PAUSED', true)});
//global thingContainer initialization
var t = new ThingsContainer(ctx);

//https://stackoverflow.com/questions/880512/prevent-text-selection-after-double-click
//executed upon click to canvas
function clearSelection() {
    if(document.selection && document.selection.empty) {
        document.selection.empty();
    } else if(window.getSelection) {
        var sel = window.getSelection();
        sel.removeAllRanges();
    }
}