//constant factor, x^2 + x + 1
let factor = [1, 1, 1];
//called by the slider
function updateFactor(value) {
  factor = +value ? [1, 1, 1] : [1, 0, 1];
  //restart demo
  clearTimeout(resetID);
  topDiv.innerText = '';
  demoLoop([1]);
}
//length of the demo
const DEMO_LENGTH = 7;

//set up output
const topDiv = document.getElementById('topDiv');
function print(line) {
  topDiv.innerText += line + '\n';
}

//maps odd to odd
//syracuse(odd) = (factor * odd + 1) / x^n
//where n is the degree of the smallest term in factor * odd + 1
function syracuse(odd) {
  //product will be factor * odd + 1
  let product = Array(odd.length + factor.length - 1).fill(0);
  for (let factorPower = 0; factorPower < factor.length; factorPower++) {
    if (!factor[factorPower]) continue;
    for (let oddPower = 0; oddPower < odd.length; oddPower++) {
      product[factorPower + oddPower] ^= odd[oddPower];
    }
  }
  //we can assume the constant term is 1
  product[0] = 0;
  //final result with the 0's lopped off the left
  const result = product.slice(product.indexOf(1));
  return result;
}

//used to detect loops
function hash(polynomial) {
  return polynomial.reduce((a, c, i) => BigInt(a) + BigInt(c) * BigInt(2) ** BigInt(i));
}

//used to output polynomials to screen
function pretty(polynomial) {
  return polynomial.map(coef => coef ? '■' : '□').join('');
}

//polynomial of first value
//stored little-endian
//example: [1, 0, 1, 1] = 1 + x^2 + x^3
function compute(polynomial, num_iterate) {
  let pastPolys = new Set();
  let i = 0;
  let initPolyHash = hash(polynomial);
  for (i = 0; i < num_iterate; i++) {
    //loop detection
    pastPolys.add(hash(polynomial));
    //main logic
    print(pretty(polynomial));
    polynomial = syracuse(polynomial);
    //end loop if we hit a loop
    if (pastPolys.has(hash(polynomial))) {
      print(pretty(polynomial) + ' [LOOP FOUND]');
      break;
    }
  }
  //oeis uwu?
  if (i == num_iterate) print('NOTABLE: ' + initPolyHash);
}

//user-inputted polynomial
let resetID;
function reset() {
  const input = prompt('enter polynomial:');
  //if user hits cancel do nothing
  if (!input) return;
  //stop demoloop if not cancelled
  clearTimeout(resetID);
  //sanitize to 0's and 1's
  const parsedInput = input.split(' ').map(coef => +(coef > 0));
  topDiv.innerText = '';
  compute(parsedInput, 500);
}

//on startup
function demoLoop(currentPoly) {
  //loop cap
  if (currentPoly.length > DEMO_LENGTH) return;
  //main logic
  compute(currentPoly, 100);
  //increment poly
  let i = 1;
  while (!(currentPoly[i] ^= 1)) {i++}
  //break
  print('');
  resetID = setTimeout(demoLoop, 200, currentPoly);
}
demoLoop([1]);