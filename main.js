// Copyright 2024 Jeff Bush
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const LIB = `

define if immediate
    8 emit        ( 0branch )
    here          ( save on stack )
    0 emit        ( dummy offset )
enddef

define then immediate
    here swap !          ( patch branch )
enddef

define else immediate
    7 emit        ( branch at end of previous block )
    here          ( Save new branch address )
    0 emit        ( dummy offset )

    ( Now patch previous branch )
    swap
    here swap !
enddef

define begin immediate
    here
enddef

define until immediate
    8 emit          ( create a conditional branch to break out if 0 )
    here 3 + emit   ( branch address past unconditional branch )
    7 emit          ( unconditional branch to head )
    emit            ( pop head address off stack and emit as branch addr )
enddef

define while immediate
    8 emit          ( create a conditional branch to break out if 0 )
    here            ( Save new branch address )
    0 emit          ( dummy offset )
enddef

( loop_top_addr cond_branch_to_path -- )
define repeat immediate
    7 emit        ( branch at end of previous block )
    swap
    emit          ( push address of top of loop)
    
    ( now patch the previous break out )
    here swap !
enddef

`;


const MEMORY_SIZE = 128;

const OP_PUSH = 1;
const OP_DROP = 2;
const OP_DUP = 3;
const OP_SWAP = 4;
const OP_STORE = 5;
const OP_LOAD = 6;
const OP_BRANCH = 7;
const OP_0BRANCH = 8;
const OP_CALL = 9;
const OP_RET = 10;
const OP_EMIT = 11;
const OP_HERE = 12;
const OP_OVER = 14;
const OP_ADD = 15;
const OP_SUB = 16;
const OP_MUL = 17;
const OP_PRINT = 18;
const OP_GT = 19;
const OP_GTE = 20;
const OP_LT = 21;
const OP_LTE = 22;
const OP_EQ = 23;
const OP_NEQ = 24;
const OP_NOT = 25;
const OP_AND = 26;
const OP_OR = 27;
const OP_CLEAR_SCREEN = 28;
const OP_SET_COLOR = 29;
const OP_DRAW_LINE = 30;

const BUILTINS =  {
    "drop": OP_DROP,
    "dup": OP_DUP,
    "swap": OP_SWAP,
    "!": OP_STORE,
    "@": OP_LOAD,
    "emit": OP_EMIT,
    "over": OP_OVER,
    "+": OP_ADD,
    "-": OP_SUB,
    "*": OP_MUL,
    "emit": OP_EMIT,
    "here": OP_HERE,
    "print": OP_PRINT,
    "gt": OP_GT,
    "gte": OP_GTE,
    "lt": OP_LT,
    "lte": OP_LTE,
    "eq": OP_EQ,
    "neq": OP_NEQ,
    "not": OP_NOT,
    "and": OP_AND,
    "or": OP_OR,
    "cls": OP_CLEAR_SCREEN,
    "setColor": OP_SET_COLOR,
    "drawLine": OP_DRAW_LINE
}

class Word {
    constructor(address) {
        this.immediate = false;
        this.variable = false;
        this.address = address;
    }
}

class Context {
    constructor() {
        this.opStack = [];
        this.returnStack = [];
        this.memory = new Array(MEMORY_SIZE).fill(0);
        this.nextCompile = 0;
        this.dictionary = {}
    }

    exec(entryAddress) {
        let pc = entryAddress;

        const self = this;
        function binop(opfunc) {
            const op2 = self.opStack.pop();
            const op1 = self.opStack.pop();
            self.opStack.push(opfunc(op1, op2));
        }

        for (let i = 0; i < 1000; i++) {
            switch (this.memory[pc++]) {
                case OP_PUSH:
                    this.opStack.push(this.memory[pc++]);
                    break;

                case OP_DROP:
                    this.opStack.pop();
                    break;

                case OP_DUP:
                    this.opStack.push(this.opStack[this.opStack.length - 1]);
                    break;

                case OP_SWAP: {
                    const top = this.opStack.length - 1;
                    const temp1 = this.opStack.pop();
                    const temp2 = this.opStack.pop();
                    this.opStack.push(temp1);
                    this.opStack.push(temp2);
                    break;
                }

                case OP_OVER:
                    this.opStack.push(this.opStack[this.opStack.length - 2]);
                    break;

                case OP_ADD:
                    binop((a, b) => a + b);
                    break;

                case OP_SUB:
                    binop((a, b) => a - b);
                    break;

                case OP_MUL:
                    binop((a, b) => a * b);
                    break;
    
                case OP_STORE: {
                    const addr = this.opStack.pop();
                    const value = this.opStack.pop();
                    this.memory[addr] =  value;
                    break;
                }

                case OP_LOAD:
                    this.opStack.push(this.memory[this.opStack.pop()]);
                    break;

                case OP_0BRANCH:
                    if (!this.opStack.pop())
                        pc = this.memory[pc];
                    else
                        pc++;

                    break;

                case OP_BRANCH:
                    pc = this.memory[pc];
                    break;

                case OP_CALL:
                    this.returnStack.push(pc + 1);
                    pc = this.memory[pc];
                    break;

                case OP_RET:
                    if (this.returnStack.length == 0)
                        return;

                    pc = this.returnStack.pop();
                    break;
    
                case OP_HERE:
                    this.opStack.push(this.nextCompile);
                    break;

                case OP_EMIT:
                    this.memory[this.nextCompile++] = this.opStack.pop();
                    break;

                case OP_GT:
                    binop((a, b) => a > b);
                    break;

                case OP_GTE:
                    binop((a, b) => a >= b);
                    break;

                case OP_LT:
                    binop((a, b) => a < b);
                    break;

                case OP_LTE:
                    binop((a, b) => a <= b);
                    break;

                case OP_EQ:
                    binop((a, b) => a === b);
                    break;

                case OP_NEQ:
                    binop((a, b) => a !== b);
                    break;

                case OP_NOT:
                    this.opStack.push(~this.opStack.pop());
                    break;

                case OP_AND:
                    binop((a, b) => a & b);
                    break;

                case OP_OR:
                    unop((a, b) => a | b);
                    break;

                case OP_PRINT:
                    writeConsole(this.opStack.pop().toString() + "\n");
                    break;

                case OP_CLEAR_SCREEN:
                    clearScreen(this.opStack.pop());
                    break;

                case OP_DRAW_LINE: {
                    const d = this.opStack.pop();
                    const c = this.opStack.pop();
                    const b = this.opStack.pop();
                    const a = this.opStack.pop();
                    drawLine(a, b, c, d);
                    break;
                }

                case OP_SET_COLOR:
                    setColor(this.opStack.pop());
                    break;

                default:
                    throw new Error(`Undefined opcode @${pc - 1} ${this.memory[pc - 1]}`);
            }
        }

        alert("timed out");
    }

    compile(src) {
        function* tokenize() {
            let lineNumber = 1;
            let currentToken = "";
            
            for (const ch of src) {
                if (ch == '\n')
                    lineNumber++;

                const isSpace = /\s/.test(ch);
                if (!isSpace)
                    currentToken += ch;
                else if (currentToken != "") {
                    yield { currentToken, lineNumber };
                    currentToken = "";
                    continue;
                }
            }
        }

        const tokens = tokenize();

        const self = this;
        function emit(value) {
            self.memory[self.nextCompile++] = value;
        }

        let currentWord = null;
        while (true) {
            const result = tokens.next();
            if (result.done)
                break;

            const tok = result.value.currentToken;
            const lineNumber = result.value.lineNumber;
            switch (tok) {
                case "(":
                    while (true) {
                        const next = tokens.next();
                        if (next.done)
                            throw new Error(`Line ${lineNumber}: unmatched comment`);    

                        if (next.value.currentToken == ")")
                            break;
                    }
                    
                    break;

                case "define":
                    if (currentWord)
                        throw new Error(`Line ${lineNumber}: define inside define`);

                    const funcName = tokens.next().value.currentToken;
                    currentWord = new Word(this.nextCompile);
                    this.dictionary[funcName] = currentWord;
                    break;

                case "enddef":
                    if (!currentWord)
                        throw new Error(`Line ${lineNumber}: unmatched enddef`);

                    emit(OP_RET);
                    currentWord = null;
                    break;

                case "immediate":
                    if (currentWord)
                        currentWord.immediate = true;

                    break;

                case "variable": {
                    if (currentWord)
                        throw new Error(`Line ${lineNumber}: variable inside define`);

                    const varName = tokens.next().value.currentToken;
                    const word = new Word(this.nextCompile++);
                    word.variable = true;
                    this.dictionary[varName] = word;
                    break;
                }
        
                default:
                    if (tok in BUILTINS) {
                        emit(BUILTINS[tok]);
                        break;
                    }

                    const tokVal = parseFloat(tok);
                    if (!Number.isNaN(tokVal)) {
                        emit(OP_PUSH);
                        emit(tokVal);
                        break;
                    }
            
                    if (tok in this.dictionary) {
                        const word = this.dictionary[tok];
                        if (word.immediate) {
                            this.exec(word.address);
                        } else if (word.variable) {
                            emit(OP_PUSH);
                            emit(word.address);
                        } else {
                            emit(OP_CALL);
                            emit(word.address);
                        }

                    } else
                        throw new Error(`Line ${lineNumber}: unknown token ${tok}`);

                    break;
            }
        }
    }
}

let canvas = null;
let context = null;

function startup() {
    canvas = document.getElementById("screen");
    context = canvas.getContext("2d");
}

function writeConsole(text) {
    document.getElementById("output").textContent += text;
}

const COLOR_STRS = [
    "black",
    "red", 
    "magenta",
    "green",
    "yellow",
    "blue",
    "cyan",
    "white"
];

function clearScreen(color) {
    context.fillStyle = COLOR_STRS[color];
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.stroke();
}

function drawLine(left, top, right, bottom) {
    context.beginPath();
    context.moveTo(left, top);
    context.lineTo(right, bottom);
    context.stroke();
}

function setColor(color) {
    context.strokeStyle = COLOR_STRS[color & 7];
}

function doRun() {
    console.log("started");
    try {
        const ctx = new Context();
        console.log("compiling");
        ctx.compile(LIB);
        ctx.compile(document.getElementById("source").value);
        console.log("done");
        console.log(ctx.memory);
        for (const key in ctx.dictionary)
            console.log(key, ctx.dictionary[key].address);

        document.getElementById("output").textContent = "";

        if ("main" in ctx.dictionary)
            ctx.exec(ctx.dictionary['main'].address);

    } catch (err) {
        alert(err);
    }
}
