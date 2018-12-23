// Notes taken from readings of "Eloquent JavaScript, Second Edition", by Marijn Haverbeke, Chapter 15, "Project: A Platform Game"

var simpleLevelPlan = [
  "                      ",
  "                      ",
  "  x              = x  ",
  "  x         o o    x  ",
  "  x @      xxxxx   x  ",
  "  xxxxx            x  ",
  "      x!!!!!!!!!!!!x  ",
  "      xxxxxxxxxxxxxx  ",
  "                      "
]

function Level(plan) {
  this.width = plan[0].length
  this.height = plan.length
  this.grid = []
  this.actors = []

  for (var y = 0; y < this.height; y++) {
    var line = plan[y], gridLine = []
    for (var x = 0; x < this.width; x++) {
      var ch = line[x], fieldType = null
      var Actor = actorChars[ch]
      if (Actor)
        this.actors.push(new Actor(new Vector(x, y), ch))
      else if (ch == "x")
        fieldType = "wall"
      else if (ch == '!')
        fieldType = "lava"
      gridLine.push(fieldType)
    }
    this.grid.push(gridLine)
  }

  this.player = this.actors.filter(function(actor) {
    return actor.type == "player"
  })[0]
  this.status = this.finishDelay = null
}

// Check for game completion
Level.prototype.isFinished = function() {
  return this.status != null && this.finishDelay < 0
}

// Vector()
// Groups a x-coordinate and y-coordinate into an object
function Vector(x, y) {
  this.x = x; this.y = y;
}

//
Vector.prototype.plus = function(other) {
  return new Vector(this.x + other.x, this.y + other.y)
}

// Vector.times(factor)
// Scales a vector by a given amount. Useful for calculating
// a Vector's distance traveled over a factor of time
Vector.prototype.times = function(factor) {
  return new Vector(this.x * factor, this.y * factor)
}


// actorChars - maps the game object elements to their chars.
// Lava maps to three characters, to define each Lava objects behavior:
// (bouncing horizontally, bouncing vertically, or dripping.)
var actorChars = {
  "@": Player,
  "o": Coin,
  "=": Lava, "|": Lava, "v": Lava
}

// Player()
// 1 1/2 sqaures high, so its initial pos is set to be a half square
// above the pos of the @ character. This aligns its bottom to the
// sqaure it appears in.
function Player(pos) {
  this.pos = pos.plus(new Vector(0, -0.5))
  this.size = new Vector(0.8, 1.5)
  this.speed = new Vector(0, 0)
}
Player.prototype.type = "player"


// Lava()
// Behaves in one of two ways:
//  1) a moving back-and-forth manner (horizontal or vertical patrol motion)
//  2) or a repeating manner (if the repeatPos property is set, for dripping)
function Lava(pos, ch) {
  this.pos = pos
  this.size = new Vector(1, 1)
  if (ch == "=") {
    this.speed = new Vector(2, 0)
  } else if (ch == "|") {
    this.speed = new Vector(0, 2)
  } else if (ch == "v") {
    this.speed = new Vector(0, 3)
    this.repeatPos = pos
  }
}
Lava.prototype.type = "lava"

// **********
// **** Coin(pos)
// ****
// **** pos -> the x/y location of the coin
// ****
// **** Mostly a stationary object.
// **** The wobble property is given to make a coin appear a bit animated in-place.
function Coin(pos) {
  this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1))
  this.size = new Vector(0.6, 0.6)
  // The random number gives a non-uniform motion to the wobble effect for individual coins,
  // so they don't all move in sync. (The _phase_ of Math.sin's wave, the width of a wave it
  // produces, is 2π (2 * the ratio of a circle's circumference to its diameter))
  this.wobble = Math.random() * Math.PI * 2
}
Coin.prototype.type = "coin"

// console.log(simpleLevel.width, "by", simpleLevel.height)

// **********
// **** elt(name, className)
// **** name -> the element's tag name
// **** className -> the style definition to categorize this element for CSS
// A helper function to create the display elements.
// Uses simple DOM elements to show the level.
function elt(name, className) {
  var elt = document.createElement(name)
  if (className) elt.className = className
  return elt
}

// **********
// **** DOMDDisplay(parent, level)
// **** parent -> the parent element to append to for generating this element
// **** level -> the level object its a part of
// **********
function DOMDisplay(parent, level) {
  // Create and store the wrapper element returned by .appendChild()
  this.wrap = parent.appendChild(elt("div", "game"))
  this.level = level

  // the background is only drawn once, so we set it here
  this.wrap.appendChild(this.drawBackground())
  // user by the drawFrame() to track the element that holds the actors
  this.actorLayer = null
  this.drawFrame()
}

// the number of pixels a single square element unit takes up
var scale = 20

DOMDisplay.prototype.drawBackground = function() {
  var table = elt("table", "background")
  table.style.width = this.level.width * scale + "px"
  this.level.grid.forEach(function(row) {
    var rowElt = table.appendChild(elt("tr"))
    rowElt.style.height = scale + "px"
    row.forEach(function(type) {
      rowElt.appendChild(elt("td", type))
    })
  })
  return table
}


// Draw each actor and scale it up from game units to pixels size.
DOMDisplay.prototype.drawActors = function() {
  var wrap = elt("div")
  this.level.actors.forEach(function(actor) {
    var rect = wrap.appendChild(elt("div", "actor " + actor.type))
    rect.style.width = actor.size.x * scale + "px"
    rect.style.height = actor.size.y * scale + "px"
    rect.style.left = actor.pos.x * scale + "px"
    rect.style.top = actor.pos.y * scale + "px"
  })
  return wrap
}

// Since there are only a few game objects to draw, we forgo reusing them
// and that ways need of information flow associating DOM elements and actors.
// We redraw the actor elements each frame, simplifying the drawing code.
DOMDisplay.prototype.drawFrame = function() {
  if (this.actorLayer)
    this.wrap.removeChild(this.actorLayer)
  this.actorLayer = this.wrap.appendChild(this.drawActors())
  this.wrap.className = "game " + (this.level.status || "")
  this.scrollPlayerIntoView()
}


// Find the player's position and update the wrapping element's scroll position
// when the player is too close to the edge.
DOMDisplay.prototype.scrollPlayerIntoView = function() {
  var width = this.wrap.clientWidth
  var height = this.wrap.clientHeight
  var margin = width / 3

  // The viewport
  var left = this.wrap.scrollLeft, right = left + width
  var top = this.wrap.scrollTop, bottom = top + height

  var player = this.level.player
  var center = player.pos.plus(player.size.times(0.5)).times(scale)

  // Verify the player position isn't outside of the allowed range.
  if (center.x < left + margin)
    this.wrap.scrollLeft = center.x - margin
  else if (center.x > right - margin)
    this.wrap.scrollLeft = center.x + margin - width
  if (center.y < top + margin)
    this.wrap.scrollTop = center.y - margin
  else if (center.y > bottom - margin)
    this.wrap.scrollTop = center.y + margin - height
}

// Clears the displayed level, for gameplay advancement or resetting.
DOMDisplay.prototype.clear = function() {
  this.wrap.parentNode.removeChild(this.wrap)
}

var simpleLevel = new Level(simpleLevelPlan)
var display = new DOMDisplay(document.body, simpleLevel)