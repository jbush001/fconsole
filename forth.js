// Copyright 2024 Jeff Bush
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// This was heavily inspired by the excellent jonesforth tutorial by
// Richard W.M. Jones: <http://git.annexia.org/?p=jonesforth.git;a=tree>

// This contains words that implement the FORTH interpreter itself.
// It is loaded automatically when the interpreter is initialized.
const LIB = `
: begin immediate
  here @
;

: until immediate
  ' 0branch ,
  ,  \\ branch address, from stack, beginning of loop
;

\\ paren comment
: ( immediate
  begin      \\ consume until end of comment
    key dup
    41 =     \\ close paren
    swap -1 =  \\ end of input
    or
  until
;

: while immediate
  ' 0branch ,      \\ create a conditional branch to break out if 0
  here @           \\ Save new branch address
  0 ,              \\ dummy offset
;

: repeat immediate
  ' branch ,       \\ branch at end of previous block
  swap
  ,                \\ push address of top of loop

  \\ now patch the previous break out
  here @ swap !
;

: if immediate
  ' 0branch ,
  here @            \\ save on stack
  0 ,               \\ dummy offset
;

: then immediate
  here @ swap !     \\ patch branch
;

: else immediate
  ' branch ,       \\ branch at end of previous block
  here @           \\ Save new branch address
  0 ,              \\ dummy offset

  \\ Now patch previous branch
  swap
  here @ swap !
;

: 0= 0 = ;

: > swap < ;
: >= < 0= ;
: <= swap < 0= ;
: <> = 0= ;

: 2dup over over ;

: allot  ( n -- start_address )
  here @ swap  ( start_address count )
  over +       ( start_address end_address )
  here !       ( start_address )
;

: cells 4 * ;

: variable immediate
  create 0 ,
;

( offset -- value )
: pick
  4 * dsp@ + @
;

( src dest count -- )
: copy_memory
    >r  \\ save count
    begin
        r> dup >r 0 >
    while
        over @ over !
        4 + swap 4 + swap
        r> 1 - >r
    repeat
    r> drop \\ Remove saved count
;

( address count -- )
: zero_memory
    begin
        dup 0 >
    while
        over 0 swap !       \\ write 0
        1 -                 \\ decrement counter
        swap 4 + swap       \\ increment data pointer
    repeat
;

variable __rand_seed

_get_time __rand_seed !

: random
    __rand_seed @ 1103515245 * 12345 +
    2147483647 and
    dup __rand_seed !
;

: negate 0 swap - ;

\\ Add n to the contents of addr and write back to addr.
( n addr -- )
: +!
    swap over @
    + swap !
;

: case immediate
    0 \\ stack delimiter
;

: of immediate
    ' over ,
    ' = ,
    ' 0branch ,
    here @      \\ Save address to patch
    0 ,         \\ dummy branch offset
    ' drop ,
;

: endof immediate
    ' branch ,       \\ branch at end of previous block
    here @           \\ Save new branch address
    0 ,              \\ dummy branch offset

    \\ Now patch previous branch
    swap
    here @ swap !
;

: endcase immediate
    ' drop ,
    begin
        dup
    while
        here @ swap !     \\ patch branch
    repeat
    drop
;

: dup2 over over ;

\\ Any literal numeric is interpreted in the current base, which means
\\ the hex and decimal words would not necessarily be idempotent
\\ if we didn't define these as constants up-front.
16 constant _BASE16
10 constant _BASE10
2 constant _BASE2

: hex immediate _BASE16 base ! ;
: decimal immediate _BASE10 base ! ;
: binary immediate _BASE2 base ! ;

`;

const MEMORY_SIZE = 8192;

class Word {
  constructor(value, immediate=false, literal=false) {
    this.immediate = immediate;
    this.literal = literal;
    this.value = value;
  }
}

const STATE_INTERP = 0;
const STATE_COMPILE = 1;

// Indices into the memory array for built-in variables.
const HERE_IDX = 0;
const BASE_IDX = 1;
const STATE_IDX = 2;

const ZERO_ASCII = '0'.charCodeAt(0);
const LOWER_A_ASCII = 'a'.charCodeAt(0);
const A_ASCII = 'A'.charCodeAt(0);

/**
 * Store information used to generate human readable traces,
 * including mapping addresses to words and source control lines.
 * @note This is still a little buggy.
 */
class DebugInfo {
  constructor() {
    this.lineMappings = {};
    this.wordMappings = [];
  }

  startWord(name, address) {
    this.wordMappings.push([name, address, address]);
  }

  endWord(address) {
    this.wordMappings[this.wordMappings.length - 1][2] = address;
  }

  addLineMapping(address, line) {
    this.lineMappings[address] = line;
  }

  lookupWord(address) {
    for (const [name, start, end] of this.wordMappings) {
      if (address >= start && address <= end) {
        return name;
      }
    }

    return null;
  }

  lookupLine(address) {
    return this.lineMappings[address];
  }
}

class ForthContext {
  constructor() {
    this.returnStack = [];

    // Memory is an array of 32-bit words, although pointers are byte oriented.
    this.memory = Array(MEMORY_SIZE >> 2).fill(0);
    this.stackPointer = MEMORY_SIZE - 4;
    this.memory[HERE_IDX] = 12; // Account for built-in variables
    this.memory[BASE_IDX] = 10;
    this.memory[STATE_IDX] = STATE_INTERP;
    this.dictionary = {
      'create': new Word(this._create),
      'lit': new Word(this._lit),
      'constant': new Word(this._constant, true),
      '+': new Word(this._add),
      '-': new Word(this._sub),
      '*': new Word(this._mul),
      '/': new Word(this._div),
      'mod': new Word(this._mod),
      'dup': new Word(this._dup),
      'or': new Word(this._or),
      'and': new Word(this._and),
      'xor': new Word(this._xor),
      '=': new Word(this._equals),
      '<': new Word(this._lessThan),
      '!': new Word(this._store),
      '@': new Word(this._fetch),
      ':': new Word(this._colon, true),
      ';': new Word(this._semicolon, true),
      'immediate': new Word(this._immediate, true),
      'drop': new Word(this._drop),
      'swap': new Word(this._swap),
      'over': new Word(this._over),
      'here': new Word(() => {
        this._push(HERE_IDX * 4);
      }),
      'base': new Word(() => {
        this._push(BASE_IDX * 4);
      }),
      'state': new Word(() => {
        this._push(STATE_IDX * 4);
      }),
      ',': new Word(this._comma),
      '\'': new Word(this._tick),
      '0branch': new Word(this._branchIfZero),
      'branch': new Word(this._branch),
      'key': new Word(this._key),
      'exit': new Word(this._exit),
      '>r': new Word(this._pushReturn),
      'r>': new Word(this._popReturn),
      'dsp@': new Word(this._dsp),
      '_get_time': new Word(this._getTime),
      'rot': new Word(this._rot),
      '-rot': new Word(this._reverseRot),
      's"': new Word(this._makeString, true),
      'c@': new Word(this._fetchChar),
      'c!': new Word(this._storeChar),
    };

    this.debugInfo = new DebugInfo();

    this.interpretSource(LIB);
  }

  /**
   * Used by code outside of the interpreter to add new forth words
   * that call native functions (which effectively allows dependency
   * injection so we can test the interpreter standalone). The callback
   * can return a list, which will be pushed back onto the stack.
   * @param {string} name How this is referenced in the dictionary.
   * @param {number} argCount The number of arguments will be popped off
   *   the stack and passed to the called function.
   * @param {function} callback A javascript function to call when this
   *   word is executed.
   * @throw {Error} If there is a stack underflow reading the arguments.
   */
  createBuiltinWord(name, argCount, callback) {
    const self = this;
    this.dictionary[name] = new Word(() => {
      if (((MEMORY_SIZE - self.stackPointer - 4) >> 2) < argCount) {
        throw new Error('stack underflow\n' + this._debugStackCrawl());
      }

      const args = [];
      let argIndex = (this.stackPointer >> 2) + argCount - 1;
      for (let i = 0; i < argCount; i++) {
        args.push(self.memory[argIndex--]);
      }

      self.stackPointer += argCount * 4;
      const result = callback(...args);
      if (result) {
        for (const elem of result) {
          self._push(elem);
        }
      }
    });
  }

  /**
   * Remove top value from operand stack and return it.
   * @return {number|function}
   * @throws {Error} if the stack is empty.
   */
  _pop() {
    if (this.stackPointer >= MEMORY_SIZE) {
      throw new Error('stack underflow\n' + this._debugStackCrawl());
    }

    const result = this.memory[this.stackPointer >> 2];
    this.stackPointer += 4;
    return result;
  }

  /**
   * Put a value on top of the operand stack
   * @param {number|function} val What to push. If this is a number, it will
   *   be automatically converted to an integer.
   * @throws {Error} if the stack is full.
   */
  _push(val) {
    if (val === undefined) {
      throw new Error('internal error: undefined pushed on stack\n' +
          this._debugStackCrawl());
    }

    if (this.stackPointer < this.memory[HERE_IDX]) {
      throw new Error('stack overflow\n' + this._debugStackCrawl());
    }

    // the '| 0' forces this to fit in an int. We always keep the stack
    // as integer types (unless they are function references, used for
    // built-in words).
    this.stackPointer -= 4;
    if (!(val instanceof Function)) {
      val |= 0;
    }

    this.memory[this.stackPointer >> 2] = val;
  }

  /**
   * During compilation, write a word at 'here' (next code address)
   * and increment the pointer by one word.
   * @param {number} value
   */
  _emitCode(value) {
    this.debugInfo.addLineMapping(this.memory[HERE_IDX], this.lineNumber);
    if (this.memory[HERE_IDX] >= MEMORY_SIZE) {
      throw new Error('out of memory');
    }

    this.memory[this.memory[HERE_IDX] >> 2] = value;
    this.memory[HERE_IDX] += 4;
  }

  /**
   * Read the next character from input. Since we don't implement an
   * actual REPL, this will always be pulled from the current source
   * string.
   * @return {string} next character.
   */
  _readChar() {
    if (this.interpOffs == this.interpStr.length) {
      return '';
    }

    const ch = this.interpStr[this.interpOffs++];
    if (ch == '\n') {
      this.lineNumber++;
    }

    return ch;
  }

  /**
   * Read the next space delimited character sequence from input, calling
   * into _readChar.
   * @return {string} Next token, with leading and trailing whitespace stripped.
   */
  _readWord() {
    let singleLineComment = false;
    let token = '';
    while (true) {
      const ch = this._readChar();
      if (!ch) {
        return token;
      }

      const isSpace = /\s/.test(ch);
      if (singleLineComment) {
        if (ch == '\n') {
          singleLineComment = false;
        }
      } else if (!singleLineComment && ch == '\\') {
        singleLineComment = true;
      } else if (!isSpace) {
        token += ch;
      } else if (token != '') {
        // If terminated by newline, push back so line number is correct.
        if (this.interpStr[--this.interpOffs] == '\n') {
          this.lineNumber--;
        }

        return token;
      }
    }
  }

  /**
   * Add a word to the dictionary. The name for this word
   * will be pulled from the next token in the input string. The
   * value of this word will be the current 'here' address (next
   * code to be emitted)
   */
  _create() {
    if (this.memory[STATE_IDX] == STATE_COMPILE) {
      throw new Error(`Line ${this.lineNumber}: create inside colon def`);
    }

    const name = this._readWord();
    if (!name) {
      throw new Error(`Line ${this.lineNumber}: missing word name`);
    }

    this.currentWord = new Word(this.memory[HERE_IDX], false, true);
    this.dictionary[name] = this.currentWord;
    this.debugInfo.startWord(name, this.memory[HERE_IDX]);
  }

  /**
   * Push a constant value onto the stack (literal). This is usually generated
   * implicity by the interpreter when it encounters a numbers, but will in
   * some cases be referenced explicitly, often paired with the tick operator.
   * This can only be invoked from compiled code. It will use the next program
   * address as the value to be pushed.
   */
  _lit() {
    this._push(this.memory[this.pc >> 2]);
    this.pc += 4;
  }

  /**
   * Create a constant in the dictionary. The value for the constant is taken
   * from the stack, and the name is pulled from the next token in the stream.
   * e.g.
   *     10 constant foo
   */
  _constant() {
    if (this.memory[STATE_IDX] == STATE_COMPILE) {
      throw new Error(`Line ${this.lineNumber}: constant inside colon def`);
    }

    const name = this._readWord();
    if (!name) {
      throw new Error(`Line ${this.lineNumber}: missing word name`);
    }

    this.dictionary[name] = new Word(this._pop(), false, true);
  }

  _add() {
    this._push(this._pop() + this._pop());
  }

  _mul() {
    this._push(this._pop() * this._pop());
  }

  _sub() {
    const a = this._pop();
    const b = this._pop();
    this._push(b - a);
  }

  _div() {
    const a = this._pop();
    const b = this._pop();
    this._push(b / a);
  }

  _mod() {
    const a = this._pop();
    const b = this._pop();
    this._push(b % a);
  }

  _or() {
    this._push(this._pop() | this._pop());
  }

  _and() {
    this._push(this._pop() & this._pop());
  }

  _xor() {
    this._push(this._pop() ^ this._pop());
  }

  _equals() {
    this._push(this._pop() === this._pop());
  }

  _lessThan() {
    const a = this._pop();
    const b = this._pop();
    this._push(b < a);
  }

  _dup() {
    const val = this._pop();
    this._push(val);
    this._push(val);
  }

  /**
   * Return from the current function.
   */
  _exit() {
    // In a normal FORTH interpreter, the REPL is an infinite loop. However,
    // we will return to the caller once a function completes. The continueExec
    // flag will be cleared if we return from the topmost called function.
    // (this is checked by exec())
    if (this.returnStack.length > 0) {
      this.pc = this.returnStack.pop();
    } else {
      this.continueExec = false;
    }
  }

  /**
   * Read a word from memory and push onto the stack
   */
  _fetch() {
    const addr = this._pop();
    if (addr < 0 || addr >= MEMORY_SIZE) {
      throw new Error(`Memory fetch out of range: ${addr}\n` +
        this._debugStackCrawl());
    }

    this._push(this.memory[addr >> 2]);
  }

  /**
   * Pop address and value from the stack and store into memory.
   */
  _store() {
    const addr = this._pop();
    if (addr < 0 || addr >= MEMORY_SIZE) {
      throw new Error(`Memory store out of range: ${addr}\n` +
        this._debugStackCrawl());
    }

    const value = this._pop();
    this.memory[addr >> 2] = value;
  }

  /**
   * Begin compiling a new word. This will pull the next token from the
   * stream and put that into the dictionary. It also sets the state
   * to compiling.
   */
  _colon() {
    if (this.memory[STATE_IDX] == STATE_COMPILE) {
      throw new Error(`Line ${this.lineNumber}: nested colon def`);
    }

    this._create();
    this.currentWord.literal = false;
    this.memory[STATE_IDX] = STATE_COMPILE;
  }

  /**
   * Finish compilation of the current word, automatically generating
   * an implicit 'exit' word to return to the caller, and switching
   * the state from compiling back to interpeting.
   */
  _semicolon() {
    if (this.memory[STATE_IDX] != STATE_COMPILE) {
      throw new Error(`Line ${this.lineNumber}: unmatched ;`);
    }

    this.memory[STATE_IDX] = STATE_INTERP;
    this._emitCode(this._exit);
    this.debugInfo.endWord(this.memory[HERE_IDX]);
  }

  /**
   * Mark the most recently emitted word to execute immediately
   * when seen (instead of being compiled).
   */
  _immediate() {
    if (this.currentWord) {
      this.currentWord.immediate = true;
    }
  }

  _drop() {
    this._pop();
  }

  _swap() {
    const a = this._pop();
    const b = this._pop();
    this._push(a);
    this._push(b);
  }

  _over() {
    this._push(this.memory[(this.stackPointer + 4) >> 2]);
  }

  _comma() {
    this._emitCode(this._pop());
  }

  /**
   * Push the function address for the next word onto the stack.
   * This only works in compiled code. It uses the trick from jonesforth
   * which grabs the pointer from the next cell.
   */
  _tick() {
    this._push(this.memory[this.pc >> 2]);
    this.pc += 4;
  }

  _branchIfZero() {
    if (this._pop()) {
      // Don't branch
      this.pc += 4;
    } else {
      // Condition is false, branch
      this.pc = this.memory[this.pc >> 2];
    }
  }

  _branch() {
    this.pc = this.memory[this.pc >> 2];
  }

  /**
   * Return the next input character. In our implementation,
   * this is always from the source code string we are interpreting.
   * (since this interpreter doesn't have a true REPL).
   */
  _key() {
    const val = this._readChar();
    if (val) {
      this._push(val.charCodeAt(0));
    } else {
      this._push(-1);
    }
  }

  // ( a b c -- b c a )
  _rot() {
    const c = this._pop();
    const b = this._pop();
    const a = this._pop();
    this._push(b);
    this._push(c);
    this._push(a);
  }

  // ( a b c -- c a b )
  _reverseRot() {
    const c = this._pop();
    const b = this._pop();
    const a = this._pop();
    this._push(c);
    this._push(a);
    this._push(b);
  }

  /**
   * This could be implemented in FORTH, but I was too lazy...
   */
  _makeString() {
    const startLine = this.lineNumber;
    const startAddr = this.memory[HERE_IDX];

    // The tokenizer always pushes back the whitespace char,
    // which is a bit of a hack to ensure the line number is correct.
    // Discard this.
    this._readChar();

    // Create a jump over the contents of the string, which is emitted
    // in-line.
    this.memory[startAddr >> 2] = this._branch;
    let curAddr = this.memory[HERE_IDX] + 8;
    while (true) {
      const ch = this._readChar();
      if (ch == '"') {
        break;
      } else if (ch) {
        const shift = (curAddr % 4) * 8;
        this.memory[curAddr >> 2] &= ~(0xff << shift);
        this.memory[curAddr >> 2] |= (ch.charCodeAt(0) & 0xff) << shift;
        curAddr++;
      } else {
        throw new Error(`Line ${startLine}: unterminated quote`);
      }

      if (curAddr >= MEMORY_SIZE) {
        throw new Error('out of memory');
      }
    }

    const length = curAddr - (startAddr + 8);
    curAddr = (curAddr + 3) & ~3;
    this.memory[(startAddr >> 2) + 1] = curAddr; // Patch branch address

    // Align to next word boundary
    this.memory[HERE_IDX] = curAddr;

    // Push start address and length on the stack
    if (this.memory[STATE_IDX] == STATE_COMPILE) {
      this._emitCode(this._lit);
      this._emitCode(startAddr + 8);
      this._emitCode(this._lit);
      this._emitCode(length);
    } else {
      this._push(startAddr + 8);
      this._push(length);
    }
  }

  /**
   * Read a byte from memory and push on operand stack. This byte
   * is treated as unsigned and is not sign extended.
   */
  _fetchChar() {
    const addr = this._pop();
    this._push(this.readByte(addr));
  }

  /**
   * Convenience function to read a byte from memory.
   * @param {number} addr
   * @return {number} Contents of location. This is treated as
   *    unsigne and not sign extended.
   */
  readByte(addr) {
    if (addr < 0 || addr >= MEMORY_SIZE) {
      throw new Error(`Memory fetch out of range: ${addr}\n` +
        this._debugStackCrawl());
    }

    const shift = (addr % 4) * 8;
    return (this.memory[addr >> 2] >> shift) & 0xff;
  }

  /**
   * Write a byte to memory, popping address and value from the
   * operand stack. The upper bits of the byte will be truncated.
   */
  _storeChar() {
    const addr = this._pop();
    if (addr < 0 || addr >= MEMORY_SIZE) {
      throw new Error(`Memory store out of range: ${addr}\n` +
        this._debugStackCrawl());
    }

    const shift = (addr % 4) * 8;
    const value = this._pop();
    this.memory[addr >> 2] &= ~(0xff << shift);
    this.memory[addr >> 2] |= (value & 0xff) << shift;
  }

  /**
   * Pop a value from the operand stack and push onto the return stack.
   */
  _pushReturn() {
    this.returnStack.push(this._pop());
  }

  /**
   * Pop a value from the return stack and push onto the operand stack.
   */
  _popReturn() {
    if (this.returnStack.length == 0) {
      throw new Error(`return stack underflow\n` + this._debugStackCrawl());
    }

    this._push(this.returnStack.pop());
  }

  /**
   * Push the stack pointer.
   */
  _dsp() {
    this._push(this.stackPointer);
  }

  /**
   * Return number of elapsed seconds since epoch. Used to
   * seed random number generator.
   */
  _getTime() {
    this._push(Date.now());
  }

  /**
   * @param {string} src The source code to interpret.
   *
   * Immedately execute code. This intepreter doesn't have an actual REPL, so
   * we interpret code out of a string buffer. This implements what is
   * formally known as the "outer interpreter."
   */
  interpretSource(src) {
    this.interpStr = src;
    this.interpOffs = 0;
    this.lineNumber = 1;

    while (true) {
      const tok = this._readWord();
      if (!tok) {
        break;
      }

      const isCompiling = this.memory[STATE_IDX] == STATE_COMPILE;
      if (tok in this.dictionary) {
        const word = this.dictionary[tok];
        if (isCompiling && !word.immediate) {
          if (word.literal) {
            this._emitCode(this._lit);
          }

          this._emitCode(word.value);
        } else {
          if (word.value instanceof Function) {
            word.value.call(this);
          } else if (word.literal) {
            this._push(word.value);
          } else {
            this.exec(word.value);
          }
        }
      } else {
        const tokVal = this._parseNumber(tok);
        if (isCompiling) {
          this._emitCode(this._lit);
          this._emitCode(tokVal);
        } else {
          this._push(tokVal);
        }
      }
    }
  }

  /**
   * Run compiled code. This is what is usually referred to as the "inner
   * interpreter." It is basically an indirect threaded interpreter.
   * Each word in the prgram consists of either javascript function
   * references (for built-in words) or an integer number that is a call
   * address for a user defined word.
   * @param {number} startAddress Address in FORTH address space to begin
   * execution.
   */
  exec(startAddress) {
    // Used to prevent infinite loops, which hang the browser.
    const MAX_EXEC_CYCLES = 100000;

    this.continueExec = true;
    this.pc = startAddress;
    for (let i = 0; i < MAX_EXEC_CYCLES && this.continueExec; i++) {
      if (this.pc >= MEMORY_SIZE || this.pc < 0) {
        throw new Error('PC out of range\n' + this._debugStackCrawl());
      }

      const value = this.memory[this.pc >> 2];
      this.pc += 4;
      if (value == 0) {
        throw new Error(`invalid branch to zero\n` + this._debugStackCrawl());
      } else if (value instanceof Function) {
        value.call(this);
      } else {
        this.returnStack.push(this.pc);
        this.pc = value;
      }
    }

    if (this.continueExec) {
      throw new Error('Exceeded maximum cycles\n' + this._debugStackCrawl());
    }
  }

  /**
   * Find the address of a word in the dictionary.
   * @param {string} name Name of the word to find.
   * @return {number} Address or undefined if it doesn't exist.
   */
  lookupWord(name) {
    if (!(name in this.dictionary)) {
      return null;
    }

    return this.dictionary[name].value;
  }

  /**
   * Convert a string form of a number into an actual numeric form.
   * @param {string} tok A string containing the number.
   * @return {number} The numeric value
   * @throw {Error} if the format is incorrect.
   */
  _parseNumber(tok) {
    let tokVal = 0;
    let digitval = 0;
    const base = this.memory[1];
    let i = 0;
    let isNeg = false;
    if (tok[0] == '-') {
      isNeg = true;
      i++;
    }

    for (; i < tok.length; i++) {
      if (tok[i] >= '0' && tok[i] <= '9') {
        digitval = tok.charCodeAt(i) - ZERO_ASCII;
      } else if (tok[i] >= 'a' && tok[i] <= 'z') {
        digitval = tok.charCodeAt(i) - LOWER_A_ASCII + 10;
      } else if (tok[i] >= 'A' && tok[i] <= 'Z') {
        digitval = tok.charCodeAt(i) - A_ASCII + 10;
      } else {
        throw new Error(`Line ${this.lineNumber}: unknown word ${tok}`);
      }

      if (digitval >= base) {
        throw new Error(`Line ${this.lineNumber}: unknown word ${tok}`);
      }

      tokVal = (tokVal * base) + digitval;
    }

    if (isNeg) {
      tokVal = -tokVal;
    }

    return tokVal;
  }

  /**
   * Walk the return stack and show names of user defined words.
   * @return {string} A human readable stack crawl
   */
  _debugStackCrawl() {
    let crawlInfo = '(most recent call first)\n';

    const self = this;
    function addEntry(address) {
      const wordDef = self.debugInfo.lookupWord(address);
      const lineNo = self.debugInfo.lookupLine(address);
      crawlInfo += `${wordDef} @${address} (line ${lineNo})\n`;
    }

    addEntry(this.pc - 4);
    for (let i = this.returnStack.length - 1; i >= 0; i--) {
      addEntry(this.returnStack[i] - 4);
    }

    return crawlInfo;
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    ForthContext,
  };
}
