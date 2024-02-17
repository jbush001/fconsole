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

const forth = require("./forth");

function run_code(source) {
    const ctx = new forth.Context();
    let strval = "";
    ctx.registerNative("print", 1, (val) =>  {
        strval += val.toString() + "\n";
    });

    ctx.compile(source);
    ctx.exec(ctx.dictionary["main"].address);
    return strval.trim();
}

test("maths", () => {
    const src = ": main 1 2 + print 5 7 * print 10 4 - print  200 7 9 12 * + - 13 +  print ;";

    expect(run_code(src)).toBe("3\n35\n6\n98");
});

test("variables", () => {
    const src = `
    variable a
    variable b
    variable c

    : main
    12 a !
    13 b !
    14 c !
    a @ print
    b @ print
    c @ print
    15 a !
    a @ print
    ;
`
    expect(run_code(src)).toBe("12\n13\n14\n15")
});

test("conditionals", () => {
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

    expect(run_code(src)).toBe("17\n20\n21\n23");
});

test("while loop", () => {
    src = `
    : main
    10
    begin
        dup 0 >
    while
        dup print
        1 -
    repeat
    ;`

    expect(run_code(src)).toBe("10\n9\n8\n7\n6\n5\n4\n3\n2\n1");
});

test("until loop", () => {
    src = `
    : main
    10
    begin
        dup print
        1 - 
        dup
    until
    ;`

    expect(run_code(src)).toBe("10\n9\n8\n7\n6\n5\n4\n3\n2\n1");
});

test("nested loop", () => {
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

        a @ 10 + dup a ! 30 < 
    until
    ;`

    expect(run_code(src)).toBe("3\n5\n13\n15\n23\n25");
});

test("underflow", () => {
    const t = () => { run_code(": main + ;") };
    expect(t).toThrow("stack underflow")
})

test("drop", () => {
    expect(run_code(": main 1 2 3 drop print print ;")).toBe("2\n1");
})

test("dup", () => {
    expect(run_code(": main 1 2 3 dup print print print print ;")).toBe("3\n3\n2\n1");
});

test("swap", () => {
    expect(run_code(": main 1 2 3 swap print print print ;")).toBe("2\n3\n1");
});

test("over", () => {
    expect(run_code(": main 1 2 3 over print print print print ;")).toBe("2\n3\n2\n1");
});

test("2dup", () => {
    expect(run_code(": main 27 31 over over print print print print ;")).toBe("31\n27\n31\n27");
});

test("comparisons", () => {
    expect(run_code(`: main
      12 24 > print
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
    `)).toBe("0\n1\n1\n0\n1\n0\n1\n1\n0\n1\n1\n0\n0\n1");
});

test("logical", () => {
    expect(run_code(`
        : main
        4 1 or print 
        10 3 and print 
        11 not print
        ;
    `)).toBe("5\n2\n-12");
});

test("def", () => {
    expect(run_code(`
        : foo
           3 +
        ;

        : bar
            2 * 
        ;

        : main
            7 bar foo print
        ;
    `)).toBe("17");
});

test("unmatched comment", () => {
    const t = () => { run_code("\n\n( this is an unmatched... \n\n") };
    expect(t).toThrow("Line 3: unmatched comment")
});

test("nested :", () => {
    const t = () => { run_code("\n\n: foo\n: bar\n") };
    expect(t).toThrow("Line 4: colon inside colon")
});

test("unmatched ;", () => {
    const t = () => { run_code("\n\n;\n") };
    expect(t).toThrow("Line 3: unmatched ;")
});

test("variable inside :", () => {
    const t = () => { run_code("\n: foo\nvariable bar\n") };
    expect(t).toThrow("Line 3: variable inside word def")
});

test("unknown token", () => {
    const t = () => { run_code("\n: foo\nbar\n") };
    expect(t).toThrow("Line 3: unknown token bar")
});

test("store out of range 1", () => {
    const t = () => { run_code(": main 2 -1 ! ;") };
    expect(t).toThrow("Memory store out of range: -1")
});

test("store out of range 2", () => {
    const t = () => { run_code(": main 2 1000000 ! ;") };
    expect(t).toThrow("Memory store out of range: 1000000")
});

test("load out of range 1", () => {
    const t = () => { run_code(": main -1 @ ;") };
    expect(t).toThrow("Memory load out of range: -1")
});

test("load out of range 2", () => {
    const t = () => { run_code(": main 9999999 @ ;") };
    expect(t).toThrow("Memory load out of range: 9999999")
});

test("invoke native underflow", () => {
    const ctx = new forth.Context();
    ctx.registerNative("foo", 1, (val) =>  {});
    ctx.compile(": main foo ;");

    const t = () => { 
        ctx.exec(ctx.dictionary["main"].address);
    };

    expect(t).toThrow("stack underflow");
});


test("invoke native return", () => {
    const ctx = new forth.Context();
    ctx.registerNative("foo", 1, (val) =>  { return [val + 1, val + 2] });
    let strval = "";
    ctx.registerNative("print", 1, (val) =>  {
        strval += val.toString() + "\n";
    });

    ctx.compile(": main 17 foo print print ;");
    ctx.exec(ctx.dictionary["main"].address);
    expect(strval).toBe("19\n18\n");
});

test("infinite loop", () => {
    const t = () => { run_code(": main begin 1 until ;") };
    expect(t).toThrow("Exceeded maximum cycles");
});

test("undefined opcode", () => {
    const t = () => { run_code(": foo immediate 9999 emit ; : main foo ;") };
    expect(t).toThrow(Error);
});

test("pc out of range", () => {
    const t = () => { run_code(": foo immediate begin 9999 emit 1 until ; : main foo ;") };
    expect(t).toThrow("out of memory");
});

test("jump out of range", () => {
    const t = () => { run_code(": foo immediate begin 7 emit 9999 emit until ; : main foo ;") };
    expect(t).toThrow("PC out of range");
});

test("pick", () => {
    expect(run_code(': main 27 28 29 30 31 32 0 pick print 1 pick print 2 pick print 5 pick print ;')).toBe(
        "32\n31\n30\n27");
});

test("single line comment", () => {
    expect(run_code(`
        \\ ignore this it is a comment
        : main \\ define function
        42 \\ push a value
        print
        ;   
    `)).toBe("42");
});

test("paren comment", () =>  {
    expect(run_code(`
        ( 
            this is an example of a 
            paren comment 
        )
        : main ( a single line version )
        42 \\ ( this should be ignored )
        ( here's an interesting one \\ )
        )
        print
        ;   
    `)).toBe("42");
});

test("gcd", () => {
    expect(run_code(`
        : gcd ( a b -- n )
            begin dup while swap over mod repeat drop
        ;

        : main
            15 10 gcd print
            128 96 gcd print
        ;
    `)).toBe("5\n32");
});

test("exit", () => {
    expect(run_code(`
        : foo
            27 print
            39 print
            exit
            49 print
        ;

        : main
            foo
        ;
    `)).toBe("27\n39");
});

test("immediate outside word", () => {
    expect(run_code(`
        immediate
        : foo
            27 print
        ;

        : main
            foo
        ;
    `)).toBe("27");
});
