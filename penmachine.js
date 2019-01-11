function penMachine(){

    this.MAX = 2**13;
    this.MIN = -((2**13)-1);

    this.x = 0;
    this.y = 0;
    this.nextXValue = null;
    this.nextYValue = null;
    this.nextX = null;
    this.nextY = null;

    this.updated = true;
    this.penUp = true;
    this.color = 'rgba(255,255,255,255)';

    this.canvas = null;
    this.ctx = null;

    this.queue = [];

    // Attach output div
    this.outputDiv = null;
    this.attachOutputDiv = function(id){
      this.outputDiv = document.getElementById(id);
    }

    // Print output to console and div if one is attached
    this.print = function(string){
      console.log(string);
      if(this.outputDiv){
        string = string.replace('\n', '<br><br>');
        this.outputDiv.innerHTML += string;
      }
    }

    this.printQueue = function(){
        console.log('**********************************************\n');
        console.log('This pen machine\'s command queue:\n');
        console.log(this.queue);
        console.log('\n**********************************************\n\n');
    };

    // Draw plot to canvas
    this.attachCanvas = function(id){
      this.canvas = document.getElementById(id);
      this.ctx = this.canvas.getContext("2d");

      this.ctx.translate(8200, 8200);
      this.ctx.scale(1,-1);

      this.ctx.beginPath();
      this.ctx.moveTo(0, 8191);
      this.ctx.lineTo(0, -8191);
      this.ctx.lineWidth = 15;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(-8191, 0);
      this.ctx.lineTo(8191, 0);
      this.ctx.lineWidth = 15;
      this.ctx.stroke();

      this.ctx.translate(0,0);
    }
    this.drawSquare = function(){
      this.ctx.fillStyle = this.color;
      this.ctx.fillRect(this.x-25, this.y-25, 50, 50);
    }

    // Decode hex string to base 10 integer.
    this.decodeHex = function(encodedHex){
      var HiByte = encodedHex.slice(0,2);
      var LoByte = encodedHex.slice(2);
      LoByte = parseInt("0x"+LoByte);
      HiByte = parseInt("0x"+HiByte);
      if(LoByte > 0x7F || HiByte > 0x7F) return "Outside of range";
      var decoded = 2**15;
      HiByte = HiByte << 7;
      decoded = decoded | HiByte;
      decoded = decoded | LoByte;
      var mask = 2**15;
      decoded = decoded ^ mask;
      decoded = decoded - 8192;
      return decoded;
    };

    // Check if string segment is Op Code
    this.isCmd = function(string){
        var parsed = parseInt(string, 16);
        if(parsed & 128) return true;
        return false;
    };

    // Parse the datastream and fill the queue with commands.
    this.load = function(string){
        this.queue = [];
        var i = 0;
        var cmdPointer = -1;
        while(i < string.length){
            if(this.isCmd(string.slice(i, i+2))){
                var cmd = string.slice(i, i+2);
                this.queue.push([cmd]);
                cmdPointer++;
                i += 2;
            } else {
                var param = string.slice(i, i+4);
                this.queue[cmdPointer].push(param);
                i += 4;
            }
        }
    };

    // Check if (x,y) coordinate is within canvas bounds
    this.inBounds = function(x,y){
        if(x <= this.MIN ||
           x >= this.MAX ||
           y <= this.MIN ||
           y >= this.MAX ){
            return false;
        }
        return true;
    }

    // This function calculates the next (x,y) values,
    // one step closer to the final (x,y) position.
    this.getNextStepValue = function(){
        // First, check if the final x position is different
        // from the current x position.
        // If not, then we only need to update the y value.
        if(this.nextX - this.x == 0){
            if(this.nextY > this.y){
                // Set y increment or decrement.
                this.nextYValue = this.y + 1;
            } else this.nextYValue = this.y - 1;
        } else{
            // x changes. Increment/Decrement x and calculate y.
            // y = mx + b
            var m = (this.nextY - this.y) / (this.nextX - this.x);
            var b = this.nextY - (m * this.nextX);
            if(this.nextX > this.x){
                // Set x increment or decrement.
                this.nextXValue = this.x + 1;
            } else{
                this.nextXValue = this.x - 1;
            }
            // Calculate y.
            this.nextYValue = (m * this.nextXValue) + b;
        }
    }

    // Update pen head (x,y) to stored nextValues.
    this.step = function(){
        if(this.nextXValue == this.nextX && this.nextYValue == this.nextY){
            this.updated = true;
        }
        this.x = this.nextXValue;
        this.y = this.nextYValue;
        if(this.ctx && !this.penUp){
          this.drawSquare();
        }
    }

    // Read operation queue
    this.run = function(){
        for(var i=0; i<this.queue.length; i++){
            // Send command to router
            this.runCmd(this.queue[i]);
        }
    };

    // Routes commands to functions
    this.runCmd = function(cmd){
        switch(cmd[0]){
            case 'F0':
                this.CLR();
                break;
            case '80':
                this.PEN(cmd[1]);
                break;
            case 'A0':
                this.CO(cmd[1], cmd[2], cmd[3], cmd[4]);
                break;
            case 'C0':
                this.MV(cmd);
                break;
            default:
                return;
        }
    };

    // Clear pen machine.
    this.CLR = function(){
        this.penUp = true;
        this.CO('4000','4000','4000','417F');
        this.x = this.y = this.nextX = this.nextY = this.nextXValue = this.nextYValue = 0;
        if(this.outputDiv) this.outputDiv.innerHTML = '';
        this.print('CLR;\n');
    };

    // Raise and lower pen.
    this.PEN = function(value){
        var output = "";
        if(this.decodeHex(value)==0){
            this.penUp = true;
            output += 'PEN UP; \n';
        } else{
            this.penUp = false;
            output += 'PEN DOWN; \n';
        }
        this.print(output);
    };

    // Set pen color.
    this.CO = function(r, g, b, a){
        r = this.decodeHex(r);
        g = this.decodeHex(g);
        b = this.decodeHex(b);
        a = this.decodeHex(a);
        this.print('CO '+r+' '+g+' '+b+' '+a+'; \n');
        this.color = 'rgba('+r+','+g+','+b+','+a+')';
    };

    // Move pen head to array of (x,y) coordinates.
    this.MV = function(cmd){
        var output;

        // Store initial pen state.
        var initPenUp = this.penUp;

        // Read off (x,y) coordinates
        for(var i=1; i<cmd.length-1; i+=2){
            this.updated = false;
            this.nextX = this.x + this.decodeHex(cmd[i]);
            this.nextY = this.y + this.decodeHex(cmd[i+1]);

            while(!this.updated){
                if(!output) output = 'MV '
                this.getNextStepValue();
                // If next step is out of bounds and pen is down,
                // print current (x,y) and raise pen.
                if(!this.inBounds(this.nextXValue, this.nextYValue) && !this.penUp){
                    output+= '('+Math.ceil(this.x)+', '+Math.ceil(this.y)+'); \n';
                    this.print(output);
                    output = '';
                    this.PEN('4000');
                }
                // If next step is in bounds, and the initial pen state is down...
                if(this.inBounds(this.nextXValue, this.nextYValue) && !initPenUp){
                    // But the current pen state is up...
                    if(this.penUp){
                        // Then we're crossing back into bounds.
                        // Move to next position and print re-entrance (x,y).
                        this.step();
                        output+= '('+Math.ceil(this.x)+', '+Math.ceil(this.y)+'); \n';
                        this.print(output);
                        output = '';
                        // Lower pen, and skip the remainder of this loop iteration.
                        this.PEN('4001');
                        continue;
                    }
                    // Otherwise, the pen is down and in bounds.
                    // No need to do anything until this while loop has completed.
                }
                // Update the pen head to the next (x,y) position
                // until it matches the final position.
                this.step();
            }
            // We are at the next (x,y) position.
            // Only mark it if pen is down, or if it is the last (x,y) pair.
            if(!this.penUp || i == cmd.length - 2){
                output+= '('+this.x+', '+this.y+')';
            }
        }
        // If any output is stored, then print it.
        // There may not be if we crossed in/out of bounds.
        if(output){
            output += '; \n';
            this.print(output);
        }
    }
}
