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
  ' 0branch ,       \\ 0branch
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

: > swap < ;
: >= < 0= ;
: <= swap < 0= ;
: <> = 0= ;

: 2dup over over ;

: constant
  word create
  ' lit ,
  ,
  ' exit ,
;

: allot  ( n -- start_address )
  here @ swap  ( start_address count )
  over +       ( start_address end_address )
  here !       ( start_address )
;

: cells 4 * ;

: variable immediate
  1 cells allot
  word create  \\ Create in dictionary
  ' lit ,
  ,            \\ Push the value returned by allot
  ' exit ,
;

( offset -- value )
: pick
  4 * dsp@ + @
;

`;

const MEMORY_SIZE = 4096;

class Word {
  constructor(value, immediate=false) {
    this.immediate = immediate;
    this.value = value;
  }
}

MODE_INTERP = 0;
MODE_COMPILE = 1;

class ForthContext {
  constructor() {
    this.returnStack = [];

    // Memory is an array of 32-bit words, although pointers are byte oriented.
    this.memory = Array(MEMORY_SIZE >> 2).fill(0);
    this.stackPointer = MEMORY_SIZE - 4;
    this.mode = MODE_INTERP;
    this.here = 4; // Zero is reserved for 'here' itself.
    this.currentToken = '';
    this.dictionary = {
      'word': new Word(this._word),
      'create': new Word(this._create),
      'lit': new Word(this._lit),
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
      'here': new Word(this._here),
      ',': new Word(this._comma),
      '\'': new Word(this._tick),
      '0branch': new Word(this._branchIfZero),
      'branch': new Word(this._branch),
      '0=': new Word(this._zeroEquals),
      'key': new Word(this._key),
      'exit': new Word(this._exit),
      '>r': new Word(this._pushReturn),
      'r>': new Word(this._popReturn),
      'dsp@': new Word(this._dsp),
    };

    this.interpretSource(LIB);
  }

  bindNative(name, argCount, callback) {
    const self = this;
    this.dictionary[name] = new Word(() => {
      if (((MEMORY_SIZE - self.stackPointer - 4) >> 2) < argCount) {
        throw new Error('stack underflow');
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

  _pop() {
    if (this.stackPointer >= MEMORY_SIZE) {
      throw new Error('stack underflow');
    }

    const result = this.memory[this.stackPointer >> 2];
    this.stackPointer += 4;
    return result;
  }

  _push(val) {
    if (val === undefined) {
      throw new Error('internal error: undefined pushed on stack');
    }

    // the '| 0' forces this to fit in an int. We always keep the stack
    // as integer types.
    this.stackPointer -= 4;
    if (!(val instanceof Function)) {
      val |= 0;
    }

    this.memory[this.stackPointer >> 2] = val;
  }

  get here() {
    return this.memory[0];
  }

  set here(value) {
    this.memory[0] = value;
  }

  _emitCode(value) {
    this.memory[this.here >> 2] = value;
    this.here += 4;
  }

  _nextChar() {
    if (this.interpOffs == this.interpStr.length) {
      return '';
    }

    const ch = this.interpStr[this.interpOffs++];
    if (ch == '\n') {
      this.lineNumber++;
    }

    return ch;
  }

  _nextWord() {
    let singleLineComment = false;
    this.currentToken = '';
    while (true) {
      const ch = this._nextChar();
      if (!ch) {
        return this.currentToken;
      }

      const isSpace = /\s/.test(ch);
      if (singleLineComment) {
        if (ch == '\n') {
          singleLineComment = false;
        }
      } else if (!singleLineComment && ch == '\\') {
        singleLineComment = true;
      } else if (!isSpace) {
        this.currentToken += ch;
      } else if (this.currentToken != '') {
        // If terminated by newline, push back so line number is correct.
        if (this.interpStr[--this.interpOffs] == '\n') {
          this.lineNumber--;
        }

        return this.currentToken;
      }
    }
  }

  _word() {
    this._nextWord();
    // the word will be stored in this.currentToken
  }

  _create() {
    if (this.mode == MODE_COMPILE) {
      throw new Error(`Line ${this.lineNumber}: create inside colon def`);
    }

    this.dictionary[this.currentToken] = new Word(this.here);
  }

  _lit() {
    this._push(this.memory[this.pc >> 2]);
    this.pc += 4;
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

  _exit() {
    // In a normal FORTH interpreter, the REPL is an infinite loop. However,
    // we will return to the caller once a function completes. The continueExec
    // flag captures if we leave the topmost function call.
    if (this.returnStack.length > 0) {
      this.pc = this.returnStack.pop();
    } else {
      this.continueExec = false;
    }
  }

  _fetch() {
    const addr = this._pop();
    if (addr < 0 || addr >= MEMORY_SIZE) {
      throw new Error(`Memory fetch out of range: ${addr}`);
    }

    this._push(this.memory[addr >> 2]);
  }

  _store() {
    const addr = this._pop();
    if (addr < 0 || addr >= MEMORY_SIZE) {
      throw new Error(`Memory store out of range: ${addr}`);
    }

    const value = this._pop();
    this.memory[addr >> 2] = value;
  }

  _colon() {
    if (this.mode == MODE_COMPILE) {
      throw new Error(`Line ${this.lineNumber}: nested colon def`);
    }

    const name = this._nextWord();
    if (!name) {
      throw new Error(`Line ${this.lineNumber}: missing word name`);
    }

    this.currentWord = new Word(this.here);
    this.dictionary[name] = this.currentWord;
    this.mode = MODE_COMPILE;
  }

  _semicolon() {
    if (this.mode != MODE_COMPILE) {
      throw new Error(`Line ${this.lineNumber}: unmatched ;`);
    }

    this.mode = MODE_INTERP;
    this._emitCode(this._exit);
  }

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

  _here() {
    this._push(0); // Address 0 is returned for builtin here.
  }

  _comma() {
    this._emitCode(this._pop());
  }

  // This only works in compiled code. It uses the trick from jonesforth
  // which grabs the pointer from the next cell.
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

  _zeroEquals() {
    this._push(!this._pop());
  }

  _key() {
    const val = this._nextChar();
    if (val) {
      this._push(val.charCodeAt(0));
    } else {
      this._push(-1);
    }
  }

  _pushReturn() {
    this.returnStack.push(this._pop());
  }

  _popReturn() {
    if (this.returnStack.length == 0) {
      throw new Error(`return stack underflow PC @{this.pc - 4}`);
    }

    this._push(this.returnStack.pop());
  }

  _dsp() {
    this._push(this.stackPointer);
  }

  exec(startAddress) {
    this.continueExec = true;
    this.pc = startAddress;
    for (let i = 0; i < 10000 && this.continueExec; i++) {
      if (this.pc >= MEMORY_SIZE || this.pc < 0) {
        throw new Error('PC out of range');
      }

      const value = this.memory[this.pc >> 2];
      this.pc += 4;
      if (value == 0) {
        throw new Error(`invalid branch to zero @ ${this.pc - 4}`);
      } else if (value instanceof Function) {
        value.call(this);
      } else {
        this.returnStack.push(this.pc);
        this.pc = value;
      }
    }

    if (this.continueExec) {
      throw new Error('Exceeded maximum cycles');
    }
  }

  interpretSource(src) {
    this.interpStr = src;
    this.interpOffs = 0;
    this.lineNumber = 1;

    while (true) {
      const tok = this._nextWord();
      if (!tok) {
        break;
      }

      if (tok in this.dictionary) {
        const word = this.dictionary[tok];
        if (this.mode == MODE_INTERP || word.immediate) {
          if (word.value instanceof Function) {
            word.value.call(this);
          } else {
            this.exec(word.value);
          }
        } else {
          this._emitCode(word.value);
        }
      } else if (/^[+-]?\d+(\.\d+)?$/.test(tok)) {
        // Numeric value
        const tokVal = parseFloat(tok);
        if (this.mode == MODE_INTERP) {
          this._push(tokVal);
        } else {
          // Compile this into current word
          this._emitCode(this._lit);
          this._emitCode(tokVal);
        }
      } else {
        throw new Error(`Line ${this.lineNumber}: unknown token '${tok}'`);
      }
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    ForthContext,
  };
}
