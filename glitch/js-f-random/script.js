var stats = document.getElementById("stats");
var examples = document.getElementById("examples");
var amount = document.getElementById('amount');
var listOfResults = {};
var stopTimeoutId;

//onclick of start button
function start() {
  reset();
  testLoop(parseInt(amount.value));
}

//reset everything
function reset() {
  clearTimeout(stopTimeoutId);
  stats.innerHTML = '';
  examples.innerHTML = '';
}

//test forever
function testLoop(amountChar) {
  //result is in form [value, code]
  var result = createCode(amountChar);
  var key = result[0];
  var value = result[1];
  //append result to html
  if (!listOfResults[key]) {
    appendToList(stats, key, 0);
    appendToList(examples, key, value);
    listOfResults[key] = true;
  }
  document.getElementById(key + '|stats').innerText++;
  //set timeout
  stopTimeoutId = setTimeout(testLoop, 10, amountChar);
}

//appends value to given list as <li>$key: <a id="$key|$list.id">$value</a></li>
function appendToList(list, key, value) {
  list.innerHTML += '<li>' + key + ': <a id="' + key + '|' + list.id + '">' + value + '</a></li>';
}

//creates random JSF code that is generally error-free
function createCode(amount) {
  //called a bunch below
  function addChar(appendResult) {
    //push or pop paren stack, char is actually the last char in the code
    var char = code.slice(-1);
    if (char == '(' || char == '[') stack.push(char);
    if (char == ')' || char == ']') stack.pop();
    //if actually being added to code, 
    if (appendResult) {
      var stackTop = stack[stack.length - 1];
      //no (), +), !), +], !]
      if (stackTop && char != '(' && char != '+' && char != '!') stackMatcher = stackTop == '(' ? ')' : ']';
      else stackMatcher = '';
      //no ][], )[]
      var char2 = code.slice(-2, -1);
      if ((stackMatcher == ']') && (char2 == ']' || char2 == ')')) stackMatcher = '';
      //no ++, )!, ]!, )(, ](
      var pChars = (char == '+' ? '' : '+') + (char == ')' || char == ']' ? '' : '!(') + '[' + stackMatcher;
      //if possible, close parens
      if (stackMatcher == ')') pChars = ')';
      //return a random char from pChars
      return pChars[Math.floor(Math.random() * pChars.length)];
    }
  }
  var stack = [];
  var code = '';
  //add a char amount times
  for (var i = 0; i < amount; i++) code += addChar(true);
  addChar(false);
  //filler value before extra parens are made
  code += '[[]]';
  //match parens from stack
  for (var i = stack.length - 1; i >= 0; i--) {
    var stackMatcher = stack[i] == '(' ? ')' : ']';
    code += stackMatcher;
  }
  //eval code
  var result;
  try {
    result = eval(code);
  } catch (err) {
    result = err.toString();
  }
  //return result and code
  return [result, code];
}