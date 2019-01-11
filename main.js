function runMachine(machine){
  var dataStream = document.getElementById('datastream').value;
  if(!dataStream){
    alert('You must input a datastream.');
    return;
  }
  machine.load(dataStream);
  machine.run();
}

// Input handler for data stream.
// This will clean up whitespace and line breaks which would break the
// pen machine.
function sanitizeInput(string){
  var input = document.getElementById('datastream');
  string = string.trim();
  string = string.replace('\n','');
  input.value = string;
}

document.addEventListener("DOMContentLoaded", function() {

  // Initialize pen machine with print area and canvas.
  var machine = new penMachine();
  machine.attachOutputDiv('print-area');
  machine.attachCanvas('canvas');

  // Click handler for run button.
  document.getElementById('run').addEventListener("click", function(){
    runMachine(machine);
  });

});
