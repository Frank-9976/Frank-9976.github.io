var iP = 1;
var iN = -1;

function createIframe(context){
  var Iframe = document.createElement("IFRAME");
  Iframe.id = "id_" + context;
  Iframe.src = "https://onlinesequencer.net/forum/chat_frame.php?context=" + context;
  Iframe.width = 100;
  Iframe.height = 100;
  if (context > 0) iP++;
  else iN--;
  return Iframe;
}

function onClick(sign){
  document.getElementById("frameArea"+sign).appendChild(createIframe('Pos'==sign?iP:iN))
}

function auto(amount){
  if (!amount) var amount = parseInt(prompt("How much?"));
  if (!amount) return;
  var sign = amount > 0 ? "Pos" : "Neg";
  for(var i = 0; i < Math.abs(amount); i++){
    onClick(sign);
  }
}

auto(100);
auto(-100);