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
  ctx.bindNative('.', 1, (val) => {
    strval += val.toString() + '\n';
  });

  ctx.interpretSource(source);
  return strval.trim();
}

test('maths', () => {
  const src = `
  \\ Immediate
  1 2 + .
  -5 7 * .
  4 10 - .
  347 7 2 3 * + / 13 +  .

  \\ Compiled
  : foo
      -7 9 + .
      8 3 - .
      -3 -4 * .
      123 4 5 6 * + / 7 + .
  ;
  foo
  `;

  expect(runCode(src)).toBe('3\n-35\n-6\n39\n2\n5\n12\n10');
});

test('variables', () => {
  const src = `
  variable a
  variable b
  variable c

  12 a !
  -13 b !
  14 c !
  a @ .
  b @ .
  c @ .
  15 a !
  a @ .`;

  expect(runCode(src)).toBe('12\n-13\n14\n15');
});

test('constant', () => {
  const src = `
  13 constant a
  17 constant b

  a .
  b .
  a b + .`;

  expect(runCode(src)).toBe('13\n17\n30');
});

test('conditionals', () => {
  const src = `
: main
1 if
  17 .
else
  18 .
then

0 if
  19 .
else
  20 .
then

1 if
  21 .
then

0 if
  22 .
then

1 if
  1 if
     23 .
  then
else
  24 .
then
;

main
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
    dup .
    1 -
  repeat
  ;

  main`;

  expect(runCode(src)).toBe('10\n9\n8\n7\n6\n5\n4\n3\n2\n1');
});

test('until loop', () => {
  src = `
  : main
    10
    begin
      dup .
      1 -
      dup 0=
    until
  ;

  main
  `;

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
      a @ b @ + .
      b @ 2 + b !
    repeat

    a @ 10 + dup a ! 30 >=
  until
  ;

  main`;

  expect(runCode(src)).toBe('3\n5\n13\n15\n23\n25');
});


test('underflow', () => {
  const t = () => {
    runCode('+');
  };
  expect(t).toThrow('stack underflow');
});

test('drop', () => {
  expect(runCode('1 2 3 drop . .')).toBe('2\n1');
});

test('dup', () => {
  expect(runCode('1 2 3 dup . . . .'))
      .toBe('3\n3\n2\n1');
});

test('swap', () => {
  expect(runCode('1 2 3 swap . . .')).toBe('2\n3\n1');
});

test('over', () => {
  expect(runCode('1 2 3 over . . . .'))
      .toBe('2\n3\n2\n1');
});

test('2dup', () => {
  expect(runCode('27 31 over over . . . .'))
      .toBe('31\n27\n31\n27');
});

test('0=', () => {
  expect(runCode('1 0= . 100 0= . 0 0= .'))
      .toBe('0\n0\n1');
});

test('comparisons', () => {
  expect(runCode(`
    12 24 > .
    12 -24 > .
    13 9 > .
    17 19 < .
    19 17 < .
    11 11 >= .
    11 12 >= .
    12 11 >= .
    22 23 <= .
    23 22 <= .
    22 22 <= .
    44 44 = .
    44 43 = .
    55 55 <> .
    54 53 <> .
  `)).toBe('0\n1\n1\n1\n0\n1\n0\n1\n1\n0\n1\n1\n0\n0\n1');
});

test('logical', () => {
  expect(runCode(`
    4 1 or .
    10 3 and .
    13 6 xor .
    13 -1 xor .
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

    7 bar foo .
  `)).toBe('17');
});

test('nested :', () => {
  const t = () => {
    runCode('\n\n: foo\n: bar\n');
  };
  expect(t).toThrow('Line 4: nested colon def');
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
  expect(t).toThrow('Line 3: create inside colon def');
});

test('lookup table', () => {
  expect(runCode(`
    create foo 13 , 17 , 19 , 21 , 23 , 27 , 31 , 33 ,

    foo @ .
    foo 4 + @ .
    foo 8 + @ .
    foo 12 + @ .
    foo 16 + @ .
    foo 20 + @ .
    foo 24 + @ .
    foo 28 + @ .
  `)).toBe('13\n17\n19\n21\n23\n27\n31\n33');
});

test('array alloc', () => {
  expect(runCode(`
    create array1 5 cells allot
    variable foo
    5 array1 !
    7 array1 4 + !
    9 array1 8 + !
    13 array1 12 + !
    17 array1 16 + !

    99 foo !

    array1 @ .
    array1 4 + @ .
    array1 8 + @ .
    array1 12 + @ .
    array1 16 + @ .

    foo @ .
  `)).toBe('5\n7\n9\n13\n17\n99');
});

test('store out of range 1', () => {
  const t = () => {
    runCode('2 -1 !');
  };
  expect(t).toThrow('Memory store out of range: -1');
});

test('store out of range 2', () => {
  const t = () => {
    runCode('2 1000000 !');
  };
  expect(t).toThrow('Memory store out of range: 1000000');
});

test('fetch out of range 1', () => {
  const t = () => {
    runCode('-1 @');
  };
  expect(t).toThrow('Memory fetch out of range: -1');
});

test('fetch out of range 2', () => {
  const t = () => {
    runCode('9999999 @');
  };
  expect(t).toThrow('Memory fetch out of range: 9999999');
});

test('invoke native underflow', () => {
  const ctx = new forth.ForthContext();
  ctx.bindNative('foo', 1, (val) => {});

  const t = () => {
    ctx.interpretSource('foo');
  };

  expect(t).toThrow('stack underflow');
});


test('invoke native return', () => {
  const ctx = new forth.ForthContext();
  ctx.bindNative('foo', 1, (val) => {
    return [val + 1, val + 2];
  });
  let strval = '';
  ctx.bindNative('.', 1, (val) => {
    strval += val.toString() + '\n';
  });

  ctx.interpretSource('17 foo . .');
  expect(strval).toBe('19\n18\n');
});

test('infinite loop', () => {
  const t = () => {
    runCode(': main begin 0 until ; main');
  };
  expect(t).toThrow('Exceeded maximum cycles');
});

test('branch zero', () => {
  const t = () => {
    runCode(': foo immediate \' branch , 0 , ;  : main foo ; main');
  };
  expect(t).toThrow(Error);
});

test('branch out of range', () => {
  const t = () => {
    runCode(': foo immediate \' branch , 9999 , ;  : main foo ; main');
  };
  expect(t).toThrow('PC out of range');
});

test('single line comment', () => {
  expect(runCode(`
    \\ ignore this it is a comment
    42 \\ push a value
    .
  `)).toBe('42');
});

test('paren comment', () => {
  expect(runCode(`
    (
      this is an example of a
      paren comment
    )
    ( a single line version )
    42 \\ ( this should be ignored )
    ( here's an interesting one \\ )
    .
  `)).toBe('42');
});

test('gcd', () => {
  expect(runCode(`
    : gcd ( a b -- n )
      begin dup while swap over mod repeat drop
    ;

    15 10 gcd .
    128 96 gcd .
  `)).toBe('5\n32');
});

test('exit', () => {
  expect(runCode(`
    : foo
      27 .
      39 .
      exit
      49 .
    ;

    foo
  `)).toBe('27\n39');
});

test('unmatched comment', () => {
  expect(runCode('\n: main ; \n( this is an unmatched... \n\n')).toBe('');
});

test('immediate outside word', () => {
  expect(runCode(`
    immediate
    : foo
      27 .
    ;

    foo
  `)).toBe('27');
});

test('push/pop return', () => {
  expect(runCode(`
    immediate
    : foo
      7 9 12 13 >r >r
      15 . .
      r> r> . .
      .
    ;

    foo
    99 .
  `)).toBe('15\n9\n13\n12\n7\n99');
});

test('return stack underflow 1', () => {
  const t = () => {
    runCode(': main r> r> ; main');
  };
  expect(t).toThrow(Error);
});

test('return stack underflow 2', () => {
  const t = () => {
    runCode(': main r> ; main');
  };
  expect(t).toThrow(Error);
});

test('missing word name', () => {
  const t = () => {
    runCode(':');
  };
  expect(t).toThrow('Line 1: missing word name');
});

test('set here', () => {
  expect(runCode(`
    : main
      300 here !
      here @ .
      1234 ,
      300 @ .
    ;

    main
  `)).toBe('300\n1234');
});

test('pick', () => {
  expect(runCode(`
    7 6 5 4 3 2 1
    1 pick .
    2 pick .
    3 pick .
    4 pick .
    5 pick .
    6 pick .
    7 pick .
  `)).toBe('1\n2\n3\n4\n5\n6\n7');
});

test('bases', () => {
  expect(runCode(`
    16 base !
    f00Abc .
    8 base !
    1234 .
    12 base !  \\ Actually 10, since our numbers are octal now
    456 .
  `)).toBe('15731388\n668\n456');
});

test('unknown word1', () => {
  const t = () => {
    runCode('16 base 1234g .');
  };
  expect(t).toThrow('Line 1: unknown word 1234g');
});

test('unknown word2', () => {
  const t = () => {
    runCode('16 base 12-34 .');
  };
  expect(t).toThrow('Line 1: unknown word 12-34');
});

test('unknown word3', () => {
  const t = () => {
    runCode('adsfasdf');
  };
  expect(t).toThrow('Line 1: unknown word adsfasdf');
});


test('state', () => {
  expect(runCode(`
    : foo immediate
      state @ .
    ;

    : bar
      state @ .
      foo
    ;

    state @ .
    bar
  `)).toBe('1\n0\n0');
});

test('push undefined', () => {
  const t = () => {
    const ctx = new forth.ForthContext();
    ctx._push(undefined);
  };
  expect(t).toThrow('internal error: undefined pushed on stack');
});
