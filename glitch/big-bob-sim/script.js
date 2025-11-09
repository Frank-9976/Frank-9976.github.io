"use strict";

function print(text, set = false) {
  const out = document.getElementById("output");
  if (set) out.innerText = text;
  else out.innerText += text + "\n";
}

function run(ah) {
  let enemyhps = document.getElementsByName("enemyhps")[0].value;
  enemyhps = new Set(enemyhps.split(" ").map((x) => +x));
  let allyhps = ah ? ah : document.getElementsByName("allyhps")[0].value;
  allyhps = allyhps.split(" ").map((x) => +x);
  print("", true);

  let step = 1;
  let flag = true;
  let deaths = 0;
  while (step < 100 && (flag || enemyhps.has(-1))) {
    flag = enemyhps.has(step);
    for (let i = 0; i < allyhps.length; i++) {
      switch (allyhps[i]) {
        case 0:
        case 3.1:
          break;
        case 1:
          flag = true;
          deaths++;
          allyhps[i]--;
          break;
        default:
          if (allyhps[i] > 0) {
            let idx = allyhps.indexOf(0);
            if (idx > -1) allyhps[idx] = 3.1;
            allyhps[i]--;
          } else {
            let result = ++allyhps[i];
            if (result == 0) flag = true;
          }
      }
    }
    allyhps = allyhps.map((x) => x | 0);
    print(allyhps.join(" ") + " | deaths = " + deaths + " | step = " + step);
    step++;
  }
  return deaths;
}
