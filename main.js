
const LIB = `

define if immediate
    8 emit        ( 7 is code for 0branch )
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
const OP_GTR = 13;
const OP_OVER = 14;
const OP_ADD = 15;
const OP_SUB = 16;
const OP_MUL = 17;
const OP_PRINT = 18;

const BUILTINS =  {
    "drop": OP_DROP,
    "dup": OP_DUP,
    "swap": OP_SWAP,
    "!": OP_STORE,
    "@": OP_LOAD,
    "emit": OP_EMIT,
    "gtr": OP_GTR,
    "over": OP_OVER,
    "+": OP_ADD,
    "-": OP_SUB,
    "*": OP_MUL,
    ">": OP_GTR,
    "emit": OP_EMIT,
    "here": OP_HERE,
    "print": OP_PRINT
}

class Word {
    constructor(name, address) {
        this.immediate = false;
        this.name = name;
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
        for (let i = 0; i < 1000; i++) {
            console.log("execute", pc, this.memory[pc], this.opStack);
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

                case OP_ADD: {
                    const op2 = this.opStack.pop();
                    const op1 = this.opStack.pop();
                    this.opStack.push(op1 + op2);
                    break;
                }

                case OP_SUB: {
                    const op2 = this.opStack.pop();
                    const op1 = this.opStack.pop();
                    this.opStack.push(op1 - op2);
                    break;
                }

                case OP_MUL: {
                    const op2 = this.opStack.pop();
                    const op1 = this.opStack.pop();
                    this.opStack.push(op1 * op2);
                    break;
                }
    
                case OP_STORE: {
                    const addr = this.opStack.pop();
                    const value = this.opStack.pop();
                    console.log("store addr", addr, "value", value);
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
                    console.log("enter op call", pc);
                    this.returnStack.push(pc + 1);
                    pc = this.memory[pc];
                    console.log("calling", pc);
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

                case OP_GTR: {
                    const op2 = this.opStack.pop();
                    const op1 = this.opStack.pop();
                    this.opStack.push(op1 > op2);
                    break;
                }

                case OP_PRINT:
                    doConsoleOutput(this.opStack.pop().toString() + "\n");
                    break;

                default:
                    throw new Error(`Undefined opcode @${pc - 1}`);
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
                    console.log(currentToken);
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
                    while (tokens.next().value.currentToken != ")")
                        console.log("comment");
                    
                    break;

                case "define":
                    if (currentWord)
                        throw new Error(`Line ${lineNumber}: define inside define`);

                    const funcName = tokens.next().value.currentToken;
                    currentWord = new Word(funcName, this.nextCompile);
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

function startup() {
}

function doConsoleOutput(text) {
    document.getElementById("output").value += text;
}

function doCompile() {
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

        document.getElementById("output").value = "";

        if ("main" in ctx.dictionary)
            ctx.exec(ctx.dictionary['main'].address);

    } catch (err) {
        alert(err);
    }
}
