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

// This was heavily inspired by the excellent jonesforth tutorial by
// Richard W.M. Jones: <http://git.annexia.org/?p=jonesforth.git;a=tree>

const LIB = `
: begin immediate
    here
;

: until immediate
    8 emit    \\ 0branch instruction
    emit      \\ branch address, from stack, beginning of loop
;

\\ paren comment
: ( immediate
    begin          \\ consume until end of comment
        key dup
        41 =       \\ close paren
        swap -1 =  \\ end of input
        or
    until
;

: if immediate
    8 emit        ( 0branch )
    here          ( save on stack )
    0 emit        ( dummy offset )
;

: then immediate
    here swap !          ( patch branch )
;

: else immediate
    7 emit        ( branch at end of previous block )
    here          ( Save new branch address )
    0 emit        ( dummy offset )

    ( Now patch previous branch )
    swap
    here swap !
;

: while immediate
    8 emit          ( create a conditional branch to break out if 0 )
    here            ( Save new branch address )
    0 emit          ( dummy offset )
;

( loop_top_addr cond_branch_to_path -- )
: repeat immediate
    7 emit        ( branch at end of previous block )
    swap
    emit          ( push address of top of loop)

( now patch the previous break out )
    here swap !
;

: 2dup over over ;

: pick ( offset -- value )
    1 + 4 * sp + @
;

: > swap < ;
: >= < 0= ;
: <= swap < 0= ;
: <> = 0= ;

`;

const MEMORY_SIZE = 4096;

const OP_LIT = 1;
const OP_DROP = 2;
const OP_DUP = 3;
const OP_SWAP = 4;
const OP_STORE = 5;
const OP_FETCH = 6;
const OP_BRANCH = 7;
const OP_0BRANCH = 8;
const OP_CALL = 9;
const OP_EXIT = 10;
const OP_EMIT = 11;
const OP_HERE = 12;
const OP_MOD = 13;
const OP_OVER = 14;
const OP_ADD = 15;
const OP_SUB = 16;
const OP_MUL = 17;
const OP_DIV = 18;
const OP_SP = 19;
const OP_LT = 20;
const OP_EQ = 21;
const OP_XOR = 22;
const OP_AND = 23;
const OP_OR = 24;
const OP_INVOKE_NATIVE = 25;
const OP_ZERO_EQUALS = 26;
const OP_PUSH_RETURN = 27;
const OP_POP_RETURN = 28;

const INTRINSICS = [
    ["drop", OP_DROP],
    ["dup", OP_DUP],
    ["swap", OP_SWAP],
    ["!", OP_STORE],
    ["@", OP_FETCH],
    ["emit", OP_EMIT],
    ["over", OP_OVER],
    ["+", OP_ADD],
    ["-", OP_SUB],
    ["*", OP_MUL],
    ["/", OP_DIV],
    ["sp", OP_SP],
    ["exit", OP_EXIT],
    ["emit", OP_EMIT],
    ["here", OP_HERE],
    ["mod", OP_MOD],
    ["<", OP_LT],
    ["=", OP_EQ],
    ["xor", OP_XOR],
    ["and", OP_AND],
    ["or", OP_OR],
    ["0=", OP_ZERO_EQUALS],
    [">r", OP_PUSH_RETURN],
    ["r>", OP_POP_RETURN]
]

class Word {
    constructor() {
        this.immediate = false;
        this.variable = false;
        this.native = false;
        this.nativeIndex = -1;
        this.intrinsic = -1;
    }
}

class ForthContext {
    constructor() {
        this.returnStack = [];
        // Memory is an array of 32-bit words, although pointers are byte oriented.
        this.memory = Array(MEMORY_SIZE).fill(0);
        this.dictionary = {}
        this.nativeFunctions = [];
        this.stackPointer = MEMORY_SIZE - 4;
        this.here = 0; // Next instruction to emit

        for (const intr of INTRINSICS) {
            const word = new Word();
            word.intrinsic = intr[1];
            this.dictionary[intr[0]] = word;
        }

        const self = this;
        this.bindNative("key", 0, () => {
            const ch = self.nextChar();
            if (!ch)
                return [ -1 ];

            return [ ch.charCodeAt(0) ];
        });

        this.compile(LIB);
    }

    bindNative(funcName, argCount, callback) {
        const word = new Word();
        this.dictionary[funcName] = word;
        word.native = true;
        word.nativeIndex = this.nativeFunctions.length;
        this.nativeFunctions.push([callback, argCount]);
    }

    pop() {
        if (this.stackPointer >= MEMORY_SIZE)
            throw new Error("stack underflow");

        const result = this.memory[this.stackPointer >> 2];
        this.stackPointer += 4;
        return result;
    }

    push(val) {
        if (val === undefined)
            throw new Exception("internal error: undefined pushed on stack");

        // the "| 0" forces this to fit in an int. We always keep the stack
        // as integer types.
        this.stackPointer -= 4;
        this.memory[this.stackPointer >> 2] = val | 0;
    }

    exec(entryAddress) {
        let pc = entryAddress;

        const self = this;

        function binop(opfunc) {
            const op2 = self.pop();
            const op1 = self.pop();
            self.push(opfunc(op1, op2));
        }

        for (let i = 0; i < 10000; i++) {
            if (pc >= MEMORY_SIZE || pc < 0)
                throw new Error("PC out of range");

            const op = this.memory[pc >> 2];
            pc += 4;
            switch (op) {
                case OP_LIT:
                    this.push(this.memory[pc >> 2]);
                    pc += 4;
                    break;

                case OP_DROP:
                    this.pop();
                    break;

                case OP_DUP:
                    this.push(this.memory[this.stackPointer >> 2]);
                    break;

                case OP_SWAP: {
                    const temp1 = this.pop();
                    const temp2 = this.pop();
                    this.push(temp1);
                    this.push(temp2);
                    break;
                }

                case OP_OVER:
                    this.push(this.memory[(this.stackPointer + 4) >> 2]);
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

                case OP_DIV:
                    binop((a, b) => a / b);
                    break;

                case OP_SP:
                    this.push(this.stackPointer);
                    break;

                case OP_STORE: {
                    const addr = this.pop();
                    if (addr < 0 || addr >= MEMORY_SIZE)
                        throw new Error(`Memory store out of range: ${addr}`);

                    const value = this.pop();
                    this.memory[addr >> 2] =  value;
                    break;
                }

                case OP_FETCH: {
                    const addr = this.pop();
                    if (addr < 0 || addr >= MEMORY_SIZE)
                        throw new Error(`Memory load out of range: ${addr}`);

                    this.push(this.memory[addr >> 2]);
                    break;
                }

                case OP_0BRANCH:
                    if (!this.pop())
                        pc = this.memory[pc >> 2];
                    else
                        pc += 4;

                    break;

                case OP_BRANCH:
                    pc = this.memory[pc >> 2];
                    break;

                case OP_CALL:
                    this.returnStack.push(pc + 4);
                    pc = this.memory[pc >> 2];
                    break;

                case OP_EXIT:
                    if (this.returnStack.length == 0)
                        return;

                    pc = this.returnStack.pop();
                    break;

                case OP_HERE:
                    this.push(this.here);
                    break;

                case OP_MOD:
                    binop((a, b) => a % b);
                    break;

                case OP_EMIT:
                    if (this.here >= MEMORY_SIZE)
                        throw new Error("out of memory");

                    this.memory[this.here >> 2] = this.pop();
                    this.here += 4
                    break;

                case OP_LT:
                    binop((a, b) => a < b);
                    break;

                case OP_EQ:
                    binop((a, b) => a === b);
                    break;

                case OP_XOR:
                    binop((a, b) => a ^ b);
                    break;

                case OP_AND:
                    binop((a, b) => a & b);
                    break;

                case OP_OR:
                    binop((a, b) => a | b);
                    break;

                case OP_INVOKE_NATIVE: {
                    const index = this.memory[pc >> 2];
                    pc += 4;
                    const [ callback, argCount ] = this.nativeFunctions[index];
                    if (((MEMORY_SIZE - this.stackPointer - 4) >> 2) < argCount)
                        throw new Error("stack underflow");

                    const args = [];
                    let argIndex = (this.stackPointer >> 2) + argCount - 1;
                    for (let i = 0; i < argCount; i++)
                        args.push(this.memory[argIndex--]);

                    this.stackPointer += argCount * 4;
                    const result = callback.apply(null, args);
                    if (result) {
                        for (const elem of result)
                            this.push(elem);
                    }
                    break;
                }

                case OP_ZERO_EQUALS:
                    this.push(!this.pop());
                    break;

                case OP_PUSH_RETURN:
                    this.returnStack.push(this.pop());
                    break;

                case OP_POP_RETURN:
                    if (this.returnStack.length == 0)
                        throw new Error(`return stack underflow PC @{pc - 4}`);

                    this.push(this.returnStack.pop());
                    break;

                default:
                    throw new Error(`Undefined opcode @${pc - 4} ${this.memory[(pc - 1) >> 2]}`);
            }
        }

        throw new Error("Exceeded maximum cycles");
    }

    nextChar() {
        if (this.compileOffs == this.compileStr.length)
            return "";

        const ch = this.compileStr[this.compileOffs++];
        if (ch == '\n')
            this.lineNumber++;

        return ch;
    }

    nextToken() {
        let singleLineComment = false;
        let currentToken = "";
        while (true) {
            const ch = this.nextChar();
            if (!ch)
                return currentToken;

            const isSpace = /\s/.test(ch);
            if (singleLineComment) {
                if (ch == "\n")
                    singleLineComment = false;
            } else if (!singleLineComment && ch == "\\")
                singleLineComment = true;
            else if (!isSpace)
                currentToken += ch;
            else if (currentToken != "") {
                // If terminated by newline, push back so line number is correct.
                if (this.compileStr[--this.compileOffs] == '\n')
                    this.lineNumber--;

                return currentToken;
            }
        }
    }

    compile(src) {
        this.compileStr = src;
        this.compileOffs = 0;
        this.lineNumber = 1;

        const self = this;
        function emit(value) {
            self.memory[self.here >> 2] = value;
            self.here += 4;
        }

        let currentWord = null;
        while (true) {
            const tok = this.nextToken();
            if (!tok)
                break;

            if (/^[+-]?\d+(\.\d+)?$/.test(tok)) {
                const tokVal = parseFloat(tok);
                emit(OP_LIT);
                emit(tokVal);
                continue;
            }

            if (tok in this.dictionary) {
                const word = this.dictionary[tok];
                if (word.native) {
                    emit(OP_INVOKE_NATIVE);
                    emit(word.nativeIndex);
                } else if (word.immediate) {
                    this.exec(word.address);
                } else if (word.variable) {
                    emit(OP_LIT);
                    emit(word.address);
                } else if (word.intrinsic >= 0) {
                    emit(word.intrinsic);
                } else {
                    emit(OP_CALL);
                    emit(word.address);
                }

                continue;
            }

            switch (tok) {
                case ":":
                    if (currentWord !== null)
                        throw new Error(`Line ${this.lineNumber}: colon inside colon`);

                    const funcName = this.nextToken();
                    if (!funcName)
                        throw new Error(`Line ${this.lineNumber}: missing word name`);
                    currentWord = new Word();
                    currentWord.address = this.here;
                    this.dictionary[funcName] = currentWord;
                    break;

                case ";":
                    if (currentWord === null)
                        throw new Error(`Line ${this.lineNumber}: unmatched ;`);

                    emit(OP_EXIT);
                    currentWord = null;
                    break;

                case "immediate":
                    if (currentWord)
                        currentWord.immediate = true;

                    break;

                case "variable": {
                    if (currentWord)
                        throw new Error(`Line ${this.lineNumber}: variable inside word def`);

                    const varName = this.nextToken();
                    const word = new Word();
                    word.address = this.here;
                    this.here += 4;
                    word.variable = true;
                    this.dictionary[varName] = word;
                    break;
                }

                default:
                    throw new Error(`Line ${this.lineNumber}: unknown token ${tok}`);
            }
        }
    }
}

if (typeof module !== 'undefined') {
    module.exports = {
        ForthContext
    };
}
