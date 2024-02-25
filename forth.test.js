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

const forth = require('./forth');

function runCode(source) {
  const ctx = new forth.ForthContext();
  let strval = '';
  ctx.bindNative('print', 1, (val) => {
    strval += val.toString() + '\n';
  });

  ctx.compile(source);
  ctx.exec(ctx.dictionary['main'].address);
  return strval.trim();
}

test('maths', () => {
  const src = `: main
    1 2 + print
    -5 7 * print
    4 10 - print
    347 7 2 3 * + / 13 +  print
    ;`;

  expect(runCode(src)).toBe('3\n-35\n-6\n39');
});

test('variables', () => {
  const src = `
  variable a
  variable b
  variable c

  : main
  12 a !
  -13 b !
  14 c !
  a @ print
  b @ print
  c @ print
  15 a !
  a @ print
  ;
`;

  expect(runCode(src)).toBe('12\n-13\n14\n15');
});

test('conditionals', () => {
  const src = `
: main
1 if
  17 print
else
  18 print
then

0 if
  19 print
else
  20 print
then

1 if
  21 print
then

0 if
  22 print
then

1 if
  1 if
     23 print
  then
else
  24 print
then
;
`;

  expect(runCode(src)).toBe('17\n20\n21\n23');
});

test('while loop', () => {
  src = `
  : main
  10
  begin
    dup 0 >
  while
    dup print
    1 -
  repeat
  ;`;

  expect(runCode(src)).toBe('10\n9\n8\n7\n6\n5\n4\n3\n2\n1');
});

test('until loop', () => {
  src = `
  : main
  10
  begin
    dup print
    1 -
    dup 0=
  until
  ;`;

  expect(runCode(src)).toBe('10\n9\n8\n7\n6\n5\n4\n3\n2\n1');
});

test('nested loop', () => {
  src = `
  variable a
  variable b
  : main
  0 a !
  begin
    3 b !
    begin
      b @ 7 <
    while
      a @ b @ + print
      b @ 2 + b !
    repeat

    a @ 10 + dup a ! 30 >=
  until
  ;`;

  expect(runCode(src)).toBe('3\n5\n13\n15\n23\n25');
});

test('underflow', () => {
  const t = () => {
    runCode(': main + ;');
  };
  expect(t).toThrow('stack underflow');
});

test('drop', () => {
  expect(runCode(': main 1 2 3 drop print print ;')).toBe('2\n1');
});

test('dup', () => {
  expect(runCode(': main 1 2 3 dup print print print print ;'))
      .toBe('3\n3\n2\n1');
});

test('swap', () => {
  expect(runCode(': main 1 2 3 swap print print print ;')).toBe('2\n3\n1');
});

test('over', () => {
  expect(runCode(': main 1 2 3 over print print print print ;'))
      .toBe('2\n3\n2\n1');
});

test('2dup', () => {
  expect(runCode(': main 27 31 over over print print print print ;'))
      .toBe('31\n27\n31\n27');
});

test('0=', () => {
  expect(runCode(': main 1 0= print 100 0= print 0 0= print ;'))
      .toBe('0\n0\n1');
});

test('comparisons', () => {
  expect(runCode(`: main
    12 24 > print
    12 -24 > print
    13 9 > print
    17 19 < print
    19 17 < print
    11 11 >= print
    11 12 >= print
    12 11 >= print
    22 23 <= print
    23 22 <= print
    22 22 <= print
    44 44 = print
    44 43 = print
    55 55 <> print
    54 53 <> print
    ;
  `)).toBe('0\n1\n1\n1\n0\n1\n0\n1\n1\n0\n1\n1\n0\n0\n1');
});

test('logical', () => {
  expect(runCode(`
    : main
    4 1 or print
    10 3 and print
    13 6 xor print
    13 -1 xor print
    ;
  `)).toBe('5\n2\n11\n-14');
});

test('def', () => {
  expect(runCode(`
    : foo
       3 +
    ;

    : bar
      2 *
    ;

    : main
      7 bar foo print
    ;
  `)).toBe('17');
});

test('unmatched comment', () => {
  expect(runCode('\n: main ; \n( this is an unmatched... \n\n')).toBe('');
});

test('nested :', () => {
  const t = () => {
    runCode('\n\n: foo\n: bar\n');
  };
  expect(t).toThrow('Line 4: colon inside colon');
});

test('unmatched ;', () => {
  const t = () => {
    runCode('\n\n;\n');
  };
  expect(t).toThrow('Line 3: unmatched ;');
});

test('variable inside :', () => {
  const t = () => {
    runCode('\n: foo\nvariable bar\n');
  };
  expect(t).toThrow('Line 3: variable inside word def');
});

test('unknown token', () => {
  const t = () => {
    runCode('\n: foo\nbar\n');
  };
  expect(t).toThrow('Line 3: unknown token bar');
});

test('store out of range 1', () => {
  const t = () => {
    runCode(': main 2 -1 ! ;');
  };
  expect(t).toThrow('Memory store out of range: -1');
});

test('store out of range 2', () => {
  const t = () => {
    runCode(': main 2 1000000 ! ;');
  };
  expect(t).toThrow('Memory store out of range: 1000000');
});

test('fetch out of range 1', () => {
  const t = () => {
    runCode(': main -1 @ ;');
  };
  expect(t).toThrow('Memory fetch out of range: -1');
});

test('fetch out of range 2', () => {
  const t = () => {
    runCode(': main 9999999 @ ;');
  };
  expect(t).toThrow('Memory fetch out of range: 9999999');
});

test('invoke native underflow', () => {
  const ctx = new forth.ForthContext();
  ctx.bindNative('foo', 1, (val) => {});
  ctx.compile(': main foo ;');

  const t = () => {
    ctx.exec(ctx.dictionary['main'].address);
  };

  expect(t).toThrow('stack underflow');
});


test('invoke native return', () => {
  const ctx = new forth.ForthContext();
  ctx.bindNative('foo', 1, (val) => {
    return [val + 1, val + 2];
  });
  let strval = '';
  ctx.bindNative('print', 1, (val) => {
    strval += val.toString() + '\n';
  });

  ctx.compile(': main 17 foo print print ;');
  ctx.exec(ctx.dictionary['main'].address);
  expect(strval).toBe('19\n18\n');
});

test('infinite loop', () => {
  const t = () => {
    runCode(': main begin 0 until ;');
  };
  expect(t).toThrow('Exceeded maximum cycles');
});

test('undefined opcode', () => {
  const t = () => {
    runCode(': foo immediate 9999 , ; : main foo ;');
  };
  expect(t).toThrow(Error);
});

test('pc out of range', () => {
  const t = () => {
    runCode(': foo immediate begin 9999 , 0 until ; : main foo ;');
  };
  expect(t).toThrow('out of memory');
});

test('jump out of range', () => {
  const t = () => {
    runCode(': foo immediate begin 7 , 9999 , 1 until ; : main foo ;');
  };
  expect(t).toThrow('PC out of range');
});

test('pick', () => {
  expect(runCode(`: main 27 28 29 30 31 32
    0 pick print
    1 pick print
    2 pick print
    5 pick print ;`)).toBe('32\n31\n30\n27');
});

test('single line comment', () => {
  expect(runCode(`
    \\ ignore this it is a comment
    : main \\ define function
    42 \\ push a value
    print
    ;
  `)).toBe('42');
});

test('paren comment', () => {
  expect(runCode(`
    (
      this is an example of a
      paren comment
    )
    : main ( a single line version )
    42 \\ ( this should be ignored )
    ( here's an interesting one \\ )
    print
    ;
  `)).toBe('42');
});

test('gcd', () => {
  expect(runCode(`
    : gcd ( a b -- n )
      begin dup while swap over mod repeat drop
    ;

    : main
      15 10 gcd print
      128 96 gcd print
    ;
  `)).toBe('5\n32');
});

test('exit', () => {
  expect(runCode(`
    : foo
      27 print
      39 print
      exit
      49 print
    ;

    : main
      foo
    ;
  `)).toBe('27\n39');
});

test('immediate outside word', () => {
  expect(runCode(`
    immediate
    : foo
      27 print
    ;

    : main
      foo
    ;
  `)).toBe('27');
});

test('push/pop return', () => {
  expect(runCode(`
    immediate
    : foo
      7 9 12 13 >r >r
      15 print print
      r> r> print print
      print
    ;

    : main
      foo
      99 print
    ;
  `)).toBe('15\n9\n13\n12\n7\n99');
});

test('return stack underflow 1', () => {
  const t = () => {
    runCode(': main r> r> ;');
  };
  expect(t).toThrow(Error);
});


test('return stack underflow 2', () => {
  const t = () => {
    runCode(': main r> ;');
  };
  expect(t).toThrow(Error);
});

test('missing word name', () => {
  const t = () => {
    runCode(':');
  };
  expect(t).toThrow('Line 1: missing word name');
});

test('fetch char', () => {
  expect(runCode(`
    variable foo
    : main
      3735928559 foo !  \\ 0xdeadbeef
      foo c@ print
      foo 1 + c@ print
      foo 2 + c@ print
      foo 3 + c@ print
    ;
  `)).toBe('239\n190\n173\n222');
});

test('store char', () => {
  expect(runCode(`
    variable foo
    : main
      1717986918 foo ! \\ 0x66666666
      239 foo c!
      foo @ print    \\ 0x666666ef
      190 foo 1 + c!
      foo @ print    \\ 0x6666beef
      173 foo 2 + c!
      foo @ print    \\ 0x66adbeef
      222 foo 3 + c!
      foo @ print    \\ 0xdeadbeef
    ;
  `)).toBe('1717987055\n1718009583\n1722662639\n-559038737');
});

test('store char out of range 1', () => {
  const t = () => {
    runCode(': main 2 -1 c! ;');
  };
  expect(t).toThrow('Memory store out of range: -1');
});

test('store char out of range 2', () => {
  const t = () => {
    runCode(': main 2 1000000 c! ;');
  };
  expect(t).toThrow('Memory store out of range: 1000000');
});

test('fetch char out of range 1', () => {
  const t = () => {
    runCode(': main -1 c@ ;');
  };
  expect(t).toThrow('Memory fetch out of range: -1');
});

test('fetch char out of range 2', () => {
  const t = () => {
    runCode(': main 9999999 c@ ;');
  };
  expect(t).toThrow('Memory fetch out of range: 9999999');
});

test('set here', () => {
  expect(runCode(`
    : main
      300 here !
      here @ print
      1234 ,
      300 @ print
    ;
  `)).toBe('300\n1234');
});
