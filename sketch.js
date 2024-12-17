///////////////////////////////////////////
// definitions
///////////////////////////////////////////

// linked list

class LinkNode {
  constructor(value, next = null) {
    this.value = value;

    this.next = next;
  }
}

class LinkList {
  constructor() {
    let node = new LinkNode(null);
    this.head = node;
    this.last = node;
    this.length = 0;
  }
  push(value) {
    let next = new LinkNode(value);
    this.last.next = next;
    this.last = next;
    this.length++;
  }
  concat(list) {
    this.last.next = list.head.next;
    this.last = list.last;
  }
  *iter() {
    let node = this.head.next;
    while (node != null) {
      yield node.value;
      node = node.next;
    }
  }
  getLength() {
    return this.length;
  }
}

function toLinkedList(arr) {
  let list = new LinkList();
  for (let value of arr) {
    list.push(value);
  }
  return list;
}

// rules conversion - from chars to objects

function translateRules(rules) {
  let translatedRules = {};
  for (let ruleKey in rules) {
    let rule = rules[ruleKey];
    let newRule;
    if (Array.isArray(rule)) {
      newRule = [];
      for (let r of rule) {
        newRule.push(translateRule(r));
      }
    } else {
      newRule = translateRule(rule);
    }
    translatedRules[ruleKey] = newRule;
  }
  return translatedRules;
}

function translateRule(rule) {
  let newRule = [];
  for (let symbol of rule) {

    newRule.push(new GrammarSymbol(symbol));
  }
  return newRule;
}

class GrammarSymbol {
  constructor(symbol) {
    this.symbol = symbol;
    this.action = this.symbolToAction(symbol);
    this.hasARule = this.symbol in rules;
  }

  activate(transforms, lSystem) {
    let activatedSymbol = this.action(transforms, lSystem);

    if (activatedSymbol != undefined) {
      transforms[transforms.length - 1] = {
        'transform': activatedSymbol.transformOut,
        'rotation': 0,
        'depth': activatedSymbol.age
      };
      return activatedSymbol;
    }
  }

  symbolToAction(symbol) {
    // let action = (transform, lSystem) => { };
    let action = getEmptyActivated
    // symbol in dict
    let symbolKey = symbol.toUpperCase();
    if (symbolKey in symbolToFunction) {
      action = symbolToFunction[symbolKey];
    }
    action = action.bind(undefined, symbol)

    return action;
  }
}

// branch and leaf classes

class ActivatedSymbol {
  constructor(symbol, transformIn, rotation, lSystem) {
    this.symbol = symbol;
    this.transformIn = transformIn;
    this.rotation = rotation;
    let directionOut = this.transformIn.direction.copy().rotate(this.rotation);
    this.transformOut = new CurrentTransform(this.transformIn.position.copy(), directionOut);
    this.transformOut.startGrowth = this.transformIn.startGrowth;
    this.lSystem = lSystem;
    this.randomAngle = 0;
    this.transformOut.growingPrevious = this.transformIn.startGrowth;

  }

  update() {
    // console.log(this.)
    this.transformOut.position.set(this.transformIn.position)
    this.transformOut.direction.set(this.transformIn.direction).rotate(this.rotation);
    this.transformOut.startGrowth = this.transformIn.startGrowth;
  }

  draw() {
    this.update();
  }

  linkTransformOut(transformOut) {
    transformOut.position.set(this.transformOut.position);
    transformOut.direction.set(this.transformOut.direction);
    // transformOut.startGrowth = this.transformOut.startGrowth;
    // transformOut.growingPrevious = this.transformOut.growingPrevious;
    this.transformOut = transformOut;
  }
}

class Bud extends ActivatedSymbol {
  constructor(symbol, transformIn, rotation, age, lSystem) {
    super(symbol, transformIn, rotation, lSystem);
    this.age = age;
    this.color = lSystem.leafColor();
  }

  draw() {
    if (!(this.transformIn.growingPrevious || this.transformIn.startGrowth)){
      return;
    }
    
    this.update();
    let position = this.transformIn.position;
    noStroke();
    fill(this.color);
    // strokeWeight(this.lSystem.leafSize);

    // point(position.x, position.y);
    circle(position.x, position.y, this.lSystem.leafSize);
  }
}

class Branch extends ActivatedSymbol {
  constructor(symbol, transformIn, rotation, age, lSystem) {
    super(symbol, transformIn, rotation, lSystem);
    this.age = age;
    this.finalLength = lSystem.length * random(0.8, 1.2);
    this.length = 0;
    this.transformOut.position = p5.Vector.add(this.transformIn.position, this.transformOut.direction.setMag(this.length));
    
    let startGrowth = this.transformIn.startGrowth && this.length >= this.finalLength;
    this.transformOut.startGrowth = startGrowth;
    this.transformOut.growingPrevious = this.transformIn.startGrowth;

    this.color = lSystem.branchColor();
    this.leafColor = lSystem.leafColor();
  }

  update() {
    super.update();
    this.transformOut.position.add(this.transformOut.direction.setMag(this.length));
    this.transformOut.startGrowth = this.transformIn.startGrowth && this.length >= this.finalLength;
  }
  draw() {
    // console.log('branch')
    // console.log(this.symbol)
    // console.log(this.transformIn.startGrowth)
    if (!this.transformIn.startGrowth){
      return;
    }
    
    let growing = this.length < this.finalLength;
    this.transformOut.growingPrevious = growing;

    if (growing){
      this.length += this.lSystem.growthSpeed * random(0.8, 1.2);
    }
    
    let start = this.transformIn.position;
    let end = this.transformOut.position;
    stroke(this.color);
    strokeWeight(this.lSystem.stroke);
    strokeWeight(this.lSystem.stroke * map(this.age, 1, this.lSystem.age, max(1 * this.lSystem.age * 0.7, 1), 1));
    // strokeWeight(map(state["age"], 1, state["treeAge"], 1, state["stroke"]));

    let flowField = this.lSystem.flowField;
    if (this.lSystem.flowField != null) {
      let angleRange = max(flowField.minChange / this.lSystem.age, flowField.maxChange / this.lSystem.age - flowField.changeStep * (this.lSystem.age - this.age));
      let angleChange = radians(map(noise(end.x / flowField.xScale, end.y / flowField.yScale, millis() / flowField.zScale), 0, 1, -angleRange, angleRange));
      // // const wind =  radians(map(noise(millis() / 5000), 0, 1, -20, 20))

      this.update();
      let direction = this.transformOut.direction
      direction.rotate(angleChange);
      end = this.transformOut.position;
      end.set(start).add(direction);
    }

    // console.log(round(degrees(randomAngle), 2))
    line(start.x, start.y, end.x, end.y);
    if (growing){
      noStroke();
      fill(this.leafColor);
      circle(end.x, end.y, this.lSystem.leafSize);
    }
  }
}

// L-system class

class LSystem {
  constructor(axiom, rules, angle, length, leafSize, leafColor, branchColor, growthSpeed, xPosition = 0, branchWidth = 1, flowField = null) {
    this.angle = angle;
    this.length = length;
    this.age = 1;
    this.stroke = branchWidth;
    this.flowField = flowField;

    this.leafSize = leafSize;
    this.leafColor = leafColor;
    this.branchColor = branchColor;
    this.growthSpeed = growthSpeed;

    let currentTransform = new CurrentTransform(createVector(xPosition, 0), createVector(0, -1));
    currentTransform.startGrowth = true;
    let transforms = [{
      'transform': currentTransform,
      'rotation': 0,
      'depth': 0,
    }];
    this.axiom = new GrammarSymbol(axiom).activate(transforms, this);
    this.sentence = toLinkedList([this.axiom]);
    this.rules = translateRules(rules);
  }
  generate() {
    // this.age++;
    let newSentence = new LinkList();
    for (let activatedSymbol of this.sentence.iter()) {
      let symbol = activatedSymbol.symbol;
      
      // console.log(symbol)

      // let inP = activatedSymbol.transformIn.position;
      // let outP =  activatedSymbol.transformOut.position;
      // console.log(`in: ${inP.x}, ${inP.y}, out: ${outP.x}, ${outP.y}`)

      // update in case position / rotation vectors have changed
      activatedSymbol.update();
      // inP = activatedSymbol.transformIn.position;
      // outP =  activatedSymbol.transformOut.position;
      // console.log(`in: ${inP.x}, ${inP.y}, out: ${outP.x}, ${outP.y}`)

      if (!(symbol in this.rules)) {
        newSentence.push(activatedSymbol);
        continue;
      }
    
      // get current symbol transform vectors (position, rotation)
      let transformStack = [{
        'transform': activatedSymbol.transformIn,
        'rotation': activatedSymbol.rotation,
        'depth': activatedSymbol.age,
      }];

      let newSymbols = this.rules[symbol];

      // check if the rule is a list of rules
      if (Array.isArray(newSymbols[0])) {
        newSymbols = random(newSymbols);
      }

      let lastOuter = null;
      let symbolIdx = newSentence.length;
      let lastOuterIdx = null;
      // console.log('//////////////////////////')
      for (let newSymbol of newSymbols) {
        let newActivated = newSymbol.activate(transformStack, this);

        if (newActivated != undefined) {
          // let inP = newActivated.transformIn.position;
          // let outP =  newActivated.transformOut.position;
          // console.log(newActivated.symbol)
          // console.log(`in: ${inP.x}, ${inP.y}, out: ${outP.x}, ${outP.y}`)
          newSentence.push(newActivated);

          if (transformStack.length == 1) {
            lastOuter = newActivated;
            lastOuterIdx = symbolIdx;
          }
          symbolIdx++;
        }
      }
      // console.log('//////////////////////////')

      // link last outer symbol to the subsequent symbols using existing vectors
      let overleftTrasform = transformStack[transformStack.length - 1];
      let lastIdx = newSentence.length - 1;

      if (lastOuter == null || lastOuterIdx != lastIdx || overleftTrasform.rotation != 0) {
        let adapterSymbol = new ActivatedSymbol(':', overleftTrasform.transform, overleftTrasform.rotation, this);
        newSentence.push(adapterSymbol);
        lastOuter = adapterSymbol;
      }

      // console.log(`outer: ${lastOuter.symbol}`)

      lastOuter.linkTransformOut(activatedSymbol.transformOut);

    }
    this.sentence = newSentence;
  }
  draw() {
    push();
    for (let activatedSymbol of this.sentence.iter()) {
      activatedSymbol.draw();
    }
    pop();
  }
}

// data classes

class CurrentTransform {
  constructor(position, direction) {
    this.position = position;
    this.direction = direction;
    this.startGrowth = false;
    this.growingPrevious = false;
  }
}

class FlowFieldEffect {
  constructor(changeStep, minChange, maxChange, xScale, yScale, zScale) {
    this.changeStep = changeStep;
    this.minChange = minChange;
    this.maxChange = maxChange;
    this.xScale = xScale;
    this.yScale = yScale;
    this.zScale = zScale;
  }
}

class Plant {
  constructor(name, axiom, rules, angle, length) {
    this.axiom = axiom;
    this.rules = rules;
    this.angle = angle;
    this.length = length;
  }
}
// symbol behaviour definitions

function addBud(symbol, transforms, lSystem) {
  // console.log(symbol)
  // console.log(transforms)
  // console.log(lSystem)

  let transform = transforms[transforms.length - 1];
  let activatedSymbol = new Bud(symbol, transform.transform, transform.rotation, transform.depth, lSystem);
  transforms[transforms.length - 1] = {
    'transform': activatedSymbol.transformOut,
    'rotation': 0,
    'depth': activatedSymbol.age
  };
  return activatedSymbol;
};

function addBranch(symbol, transforms, lSystem) {
  let transform = transforms[transforms.length - 1];
  // let branchRandomRotation = randomRotation;
  let branchRandomRotation = max(randomRotation * (transform.depth / lSystem.age), minRandomRotation);
  let rotation = transform.rotation + radians(random(-branchRandomRotation, branchRandomRotation));
  let activatedSymbol = new Branch(symbol, transform.transform, rotation, transform.depth, lSystem);
  transforms[transforms.length - 1] = {
    'transform': activatedSymbol.transformOut,
    'rotation': 0,
    'depth': activatedSymbol.age
  };
  return activatedSymbol;
};

function addRotation(_, transforms, lSystem) {
  transforms[transforms.length - 1].rotation += radians(lSystem.angle);
}

function substractRotation(symbol, transforms, lSystem) {
  transforms[transforms.length - 1].rotation -= radians(lSystem.angle);
}

function pushTransform(symbol, transforms, lSystem) {
  let transform = transforms[transforms.length - 1];
  lSystem.age = max(lSystem.age, transform.depth + 1);
  // console.log("age" + str(lSystem.age))
  transforms.push({
    'transform': transform.transform,
    'rotation': transform.rotation,
    'depth': transform.depth + 1
  })
}

function popTransform(symbol, transforms, _) {
  transforms.pop();
}

function getEmptyActivated(symbol, transforms, lSystem) {

  let transform = transforms[transforms.length - 1];
  let activatedSymbol = new ActivatedSymbol(symbol, transform.transform, transform.rotation, transform.depth, lSystem)
  transforms[transforms.length - 1] = {
    'transform': activatedSymbol.transformOut,
    'rotation': 0,
    'depth': activatedSymbol.age
  };
  return activatedSymbol;
}

const symbolToFunction = {
  'S': addBud,
  'X': addBud,
  'A': addBud,
  'B': addBud,
  'F': addBranch,
  'G': addBranch,
  "+": addRotation,
  "-": substractRotation,
  "[": pushTransform,
  "]": popTransform,
}

function drawBackground() {
  background(backgroundColor);
}

function drawGround() {
  let c = branchColor();
  c = color(hue(c), saturation(c) - 10, brightness(c) - 10);
  noStroke();
  fill(c);
  x1 = - width / 2 / canvasScale;
  x2 = width / 2 / canvasScale;
  y1 = - 15 / canvasScale;
  y2 = groundHeight / canvasScale;
  // let control = createVector(100 / canvasScale, 100 / canvasScale).rotate(radians(-20));
  let control = createVector(-100 / canvasScale, 0);
  let sing = random([-1, 1]);
  let control1 = control.copy().rotate(PI).rotate(radians(random(10, 20) * sing));
  control1.setMag(control1.mag() * random(0.2, 0.5));
  let control2 = control.copy().rotate(radians(random(10, 20) * sing));
  control2.setMag(control2.mag() * random(0.2, 0.5));
  
  // beginShape();
  
  // vertex(x1, y1);
  // vertex(x1, y2);
  // vertex(x2, y2);
  // vertex(x2, y1);
  // bezierVertex(
  //   control1.x, control1.y,
  //   control2.x, control2.y,
  //   x1, y1);
  // endShape();

  // bezierVertex(
  //   width / 2 / canvasScale, - groundHeight / canvasScale,
  //   control, control,
  //   0, 0);
  // bezierVertex(
  //   - -control, -control,
  //   - width / 2 / canvasScale, groundHeight / canvasScale,
  //   - width / 2 / canvasScale, 0);


  // bezierVertex(-width / 2 / canvasScale, 0);

  rect(- width / 2 / canvasScale, 0, width / canvasScale, groundHeight / canvasScale);
  // let v = createVector(x2 - 10, y1);
  // let v2 = createVector(x1 + 10, y1);

  // stroke(0, 100, 100);
  // line(v.x, v.y, v.x + control1.x, v.y + control1.y);
  // stroke(50, 100, 100);
  // line(v2.x, v2.y,  v2.x + control2.x, v2.y + control2.y);
}

///////////////////////////////////////////
// system parameters and variables
///////////////////////////////////////////

p5.disableFriendlyErrors = true;

// global variables
let trees = [];
let plants = [];
let landscapeCenter;

// landscape
const scaleMult = 0.005 //0.008
let canvasScale;
const groundHeight = 20;

const maxTreeNum = 5;
// const minTreeSpacing = 400;
const minTreeSpacing = 500;

let minSmallPlantSpacing = 17;

let backgroundColor;

// plant

const growthSpeed = 0.1;

const randomRotation = 5;
const minRandomRotation = 1;
const nIterations = 5;

const length = 5;
const angle = 17.5;

let branchWidth = 0.6;
const leafSize = 2;

// const leafColor = () => color(random(250, 300), random(60, 75), random(70, 90), 30);
const leafColor = (hs, ls, bs, as) => { return () => color(random((250 + hs) % 360, (310 + hs) % 369), random(70 + bs, 80 + bs), random(75 + ls, 90 + ls), 20 + as) };
const branchColor = () => color(250, 70, 30);

const flowField = new FlowFieldEffect(5, 10, 100, 50, 50, 2000);

// rules

const flower1 = {
  axiom: "S",
  rules: { S: "X", X: ["F[-X][+X]X"], F: ["F", "Ff"] },
  length: 3.5,
  angle: 27,
  leafSize: 2,
  iter: 5,
  type: "low",
  branchWidthScale: 0.8,
}

const flower2 = {
  axiom: "S",
  rules: { S: "X", X: ["[-FX][FX][+FX]"], F: ["FF", "Ff"] },
  length: 3,
  angle: 3,
  leafSize: 3,
  iter: 3,
  type: "low",
  branchWidthScale: 1.2,
}

const flower3 = {
  axiom: "S",
  rules: { S: "X", X: ["[-FX][FX][+FX]", "X"], F: ["Ff"] },
  length: 6,
  angle: 15,
  leafSize: 2,
  iter: 5,
  type: "low",
  branchWidthScale: 1.2,
  colorShift: [0, 0, 0, 10],

}

const tree = {
  axiom: "S",
  rules: { S: "gGX", G: "gG", X: ["F[-X]F[+X]F+[[-X][X]]"], F: ["F", "FF", "FF"] },
  // rules: { S: "FX", X: "F[-A]F[+X]F[[-X]X]", A: "-f[XF]", F: ["F", "FF", "FF"] },
  length: 1.5,
  // length: 4,
  angle: 27,
  leafSize: 5,
  // iter: 7,
  iter: 7,
  "type": "high",
  branchWidthScale: 0.6,
  colorShift: [0, -5, 0, -3],
  growthSpeedMult: 1.2,
}

const tree3 = {
  axiom: "S",
  rules: { S: "ffffX", X: ["X", "[-FX][X][+FX]", "[X][+FX]"], F: ["F", "Ff"] },
  // rules: { S: "FX", X: "F[-A]F[+X]F[[-X]X]", A: "-f[XF]", F: ["F", "FF", "FF"] },
  length: 5,
  angle: 10,
  leafSize: 2,
  iter: 7,
  "type": "high",
  branchWidthScale: 0.5,
  colorShift: [30, 0, 0, 15],
}

const flower4 = {
  axiom: "S",
  rules: { S: "X", X: ["F[-X]F[+X]F+[[-X][X]]", "F[[+X][X]]F[+X]F[-X]"], F: ["F", "FF", "FF"] },
  // rules: { S: "FX", X: "F[-A]F[+X]F[[-X]X]", A: "-f[XF]", F: ["F", "FF", "FF"] },
  length: 2.3,
  angle: 12,
  leafSize: 8,
  iter: 4,
  "type": "high",
  branchWidthScale: 0.3,
  colorShift: [0, 0, -10, -10],

}


const tree2 = {
  axiom: "X",
  // rules: { X: "F[-X]F[+X]F[[-X][X]]", F: ["F", "FF", "FF"] },
  rules: { X: "F[-A]F[+X]Fx[[-X][X]]", F: ["FF", "FF"] },
  length: 2.2,
  angle: 17,
  leafSize: 5,
  iter: 5,
  type: "high",
  branchWidthScale: 0.6,
  colorShift: [30, 0, 0, -10],
}


const plantSettings = [flower2];
// const mediumPlants = [flower3, flower4];
const mediumPlants = [tree3, flower3];
const smallPlants = [flower1, flower1, flower4, flower3];
const miniPlants = [flower2]
const treePlants = [tree];
const fillerPlants = [];

// const rules = { X: "F[-X]F[+X]F[[-X][X]]", F: ["F", "FF", "FF"] };
// const rules = {X: "F[+X]F[-X]F[++X]FX", F: ["F", "FF", "FF"]}

// const rules = { X: "F[+XF]", F: ["F"] };
let rules = { X: "XFA" }
// let rules = {X: "-XFA"}
// let rules = {X: "F[-F][FX][+F]"} // v
// let rules = {S: "FX", X: "[-F][FX][+F]"} // v
// let rules = { X: "F[-X]F[+X]F[-X][+X]"};
// let rules = {X: "F-F-F-F"};
// let rules = {X: "[-F][FX][+F]"}

///////////////////////////////////////////
// setup and draw
///////////////////////////////////////////


function preload(){
  canvasScale = windowHeight * scaleMult;
  branchWidth /= canvasScale;

  colorMode(HSB, 360, 100, 100, 100);

  backgroundColor = color(230, 70, 60);

  minSmallPlantSpacing *= canvasScale;

}

function setup() {

  // check if the plant are defined correctly
  for (let i = 0; i < plantSettings.length; i++) {
    let settings = plantSettings[i];
    settings = [settings.axiom, settings.rules, settings.angle,
    settings.length, settings.leafSize, settings.iter,
    settings.type];
    if (settings.includes(undefined)) {
      console.log('Error in plant definition')
      return
    }
  }


  // draw landscape

  createCanvas(windowWidth, windowHeight);
  landscapeCenter = createVector(width / 2, height - groundHeight);
  translate(landscapeCenter.x, landscapeCenter.y);
  scale(canvasScale);
  drawBackground();


  // generate and draw plants
  let treeRandShift = 0.01;
  let plantShift = 0.005;
  let jitter = (k) => random(-width * k, width * k);

//     let x = 0;
//     let plant = tree;

//     // print(treeSteps)
//     // print(treeRange + treeShift)

//     let leafCol = leafColor(0, 0, 0, 0);
//     let lenR = 0;
//     let angleR = 0;

//     growPlant(plant, x, angleR, lenR, leafCol, branchColor);


  // let treeSpacing = width / (maxTreeNum + 1);
  // treeSpacing = max(minTreeSpacing, treeSpacing);
  // let treeNum = floor(width / treeSpacing);
  // let xTree = - width / 2;

  // for (let n = 0; n < treeNum + 1; n++) {
  //   growPlant(tree, (xTree +  randomShift(treeShift)) / canvasScale);
  //   xLowStart = xTree + minSmallPlantSpacing;
  //   xTree += treeSpacing;
  //   for (let xLow = xLowStart; xLow < xTree; xLow += minSmallPlantSpacing) {
  //     growPlant(flower1, (xLow + randomShift(plantShift)) / canvasScale);
  //   }
  // }

  // ----------------------------

  let treeRange = 4;
  let treeShift = random([0, 1]);
  let treeSteps = treeRange - 1
  let nSteps = ceil(width / minSmallPlantSpacing);
  for (let s = -1; s < nSteps + 2; s++) {
    let x = (s * minSmallPlantSpacing - width / 2 + jitter(0.004)) / canvasScale;
    let plant;

    // print(treeSteps)
    // print(treeRange + treeShift)

    let leafCol = leafColor(0, 0, 0, 0);
    let lenR = 0;
    let angleR = 0;


    if (treeSteps == treeRange + treeShift) {
      treeSteps = 0;
      treeShift = random([0, 1]);
      plant = random(treePlants);
      angleR = random(-5, 0);
    }
    // else if (treeSteps == round(treeRange / 2)) {
    //   plant = random(fillerPlants);
    //   x += jitter(0.01);
    // }
    else if(round(treeRange / 2) == treeSteps){
      plant = random(mediumPlants);
    }
    // leafCol = () => color(0);
    treeSteps++;
    if (plant == undefined) {
      continue;
    }
    growPlant(plant, x, angleR, lenR, leafCol, branchColor);
  }

  nSteps = ceil(width / minSmallPlantSpacing) / 1.3;
  for (let s = -1; s < nSteps; s++) {
    let x = (s * minSmallPlantSpacing * 1.3 - width / 2 + jitter(0.004)) / canvasScale;
    let plant = random(smallPlants);
    let lenR = random(-0.2, 0.2);
    let angleR = random(-10,);
    let leafCol = leafColor(random(-40, 40), 0, 0, 0);

    // leafCol = () => color(0);
    growPlant(plant, x, angleR, lenR, leafCol, branchColor);
  }

  nSteps = ceil(width / minSmallPlantSpacing) / 0.7;
  for (let s = -1; s < nSteps; s++) {
    let x = minSmallPlantSpacing / 3 + (s * minSmallPlantSpacing * 0.7 - width / 2 + jitter(0.01)) / canvasScale;
    let plant = random(miniPlants);

    let lenR = random(-1, 2);
    let angleR = random(-10, 10);
    let leafCol = leafColor(random(-40, 40), 0, 0, 0);

    // leafCol = () => color(0);
    growPlant(plant, x, angleR, lenR, leafCol, branchColor);
  }

  drawGround();

//   console.profileEnd('setup');
}

function growPlant(plant, xPosition,
  branchAngleR = 0, branchLengthR = 0,
  leafCol = leafColor, branchCol = branchColor,
) {

  if (plant.colorShift != undefined) {
    leafCol = leafColor(plant.colorShift[0], plant.colorShift[1], plant.colorShift[2], plant.colorShift[3]);
  }
  
  let plantGrowthSpeed = growthSpeed;
  if (plant.growthSpeedMult != undefined){
    plantGrowthSpeed *= plant.growthSpeedMult;
  }

  // let branchAngle = plant.angle * random(0.8, 2);
  // let branchLength = plant.length * random(0.8, 1.2);
  let branchAngle = plant.angle + branchAngleR;
  let branchLength = plant.length + branchLengthR;

  // console.log(rules)
  // console.log(plant.rules)
  // rules = plant.rules
  let lSystem = new LSystem(plant.axiom, plant.rules, branchAngle, branchLength,
    plant.leafSize, leafCol, branchCol, plantGrowthSpeed, xPosition, branchWidth * plant.branchWidthScale,
    flowField
  );
  trees.push(lSystem);

  // circle(xPosition, -10, 3);

  for (let k = 0; k < plant.iter; k++) {
    // console.log('-------------------')
    lSystem.generate();
    // console.log(lSystem.age)
    // let sentence = ""
    // for (let s of lSystem.sentence.iter()){
    //     // console.log(`${s.symbol} ${s.transformIn.position}, ${s.transformOut.position}`)
    //     sentence += s.symbol
    // }
    // console.log(sentence)
    // console.log(`${lSystem.age} iter ${str(round(millis() - startTime, 0), 2)} ms`);
  }
  lSystem.draw();
  
  for (let t of trees[0].sentence.iter()){
    // console.log(t.transformIn.startGrowth)
  }
}
let count = 0;
function draw() {

  translate(landscapeCenter.x, landscapeCenter.y);
  scale(canvasScale);
  drawBackground();

  for (let lSystem of trees) {
    // let time = millis();
    lSystem.draw();
  }
  drawGround();
  let gr = "";
  let gpr = "";
  for (let s of trees[0].sentence.iter()){
    if (s.transformIn.startGrowth){
      gr += s.symbol
    }
    if (s.transformIn.growingPrevious){
      gpr += s.symbol;}
  }
  
//   if (count < 5){
//   console.log(gr);
//   console.log(gpr);
//   console.log('---------------------------')
//   count++;}
}

function mouseClicked() {
    // trees = [];
    // setup();
  location.reload();
}
