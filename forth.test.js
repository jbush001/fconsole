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

function run_file(source) {
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
    const src = ": main 1 2 + print 5 7 * print 10 4 - print ;";

    expect(run_file(src)).toBe("3\n35\n6");
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
    expect(run_file(src)).toBe("12\n13\n14\n15")


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

    expect(run_file(src)).toBe("17\n20\n21\n23");

});

test("while loop", () => {
    src = `
    : main
    10
    begin
        dup 0 gt
    while
        dup print
        1 -
    repeat
    ;`

    expect(run_file(src)).toBe("10\n9\n8\n7\n6\n5\n4\n3\n2\n1");
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

    expect(run_file(src)).toBe("10\n9\n8\n7\n6\n5\n4\n3\n2\n1");
});

test("underflow", () => {
    const t = () => { run_file(": main + ;") };
    expect(t).toThrow("stack underflow")
})

test("drop", () => {
    expect(run_file(": main 1 2 3 drop print print ;")).toBe("2\n1");
})

test("dup", () => {
    expect(run_file(": main 1 2 3 dup print print print print ;")).toBe("3\n3\n2\n1");
});

test("swap", () => {
    expect(run_file(": main 1 2 3 swap print print print ;")).toBe("2\n3\n1");
});

test("over", () => {
    expect(run_file(": main 1 2 3 over print print print print ;")).toBe("2\n3\n2\n1");
});

test("comparisons", () => {
    expect(run_file(`: main
      12 24 gt print
      13 9 gt print
      17 19 lt print
      19 17 lt print
      11 11 gte print
      11 12 gte print
      12 11 gte print
      22 23 lte print
      23 22 lte print
      22 22 lte print
      44 44 eq print
      44 43 eq print
      55 55 neq print
      54 53 neq print
      ;
    `)).toBe("0\n1\n1\n0\n1\n0\n1\n1\n0\n1\n1\n0\n0\n1");
});

test("logical", () => {
    expect(run_file(`
        : main
        4 1 or print 
        10 3 and print 
        11 not print
        ;
    `)).toBe("5\n2\n-12");
});

test("def", () => {
    expect(run_file(`
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
    const t = () => { run_file("\n\n( this is an unmatched... \n\n") };
    expect(t).toThrow("Line 3: unmatched comment")
});

test("nested :", () => {
    const t = () => { run_file("\n\n: foo\n: bar\n") };
    expect(t).toThrow("Line 4: colon inside colon")
});

test("unmatched ;", () => {
    const t = () => { run_file("\n\n;\n") };
    expect(t).toThrow("Line 3: unmatched ;")
});

test("variable inside :", () => {
    const t = () => { run_file("\n: foo\nvariable bar\n") };
    expect(t).toThrow("Line 3: variable inside word def")
});

test("unknown token", () => {
    const t = () => { run_file("\n: foo\nbar\n") };
    expect(t).toThrow("Line 3: unknown token bar")
});

test("store out of range 1", () => {
    const t = () => { run_file(": main 2 -1 ! ;") };
    expect(t).toThrow("Memory store out of range: -1")
});

test("store out of range 2", () => {
    const t = () => { run_file(": main 2 1000000 ! ;") };
    expect(t).toThrow("Memory store out of range: 1000000")
});

test("load out of range 1", () => {
    const t = () => { run_file(": main -1 @ ;") };
    expect(t).toThrow("Memory load out of range: -1")
});

test("load out of range 2", () => {
    const t = () => { run_file(": main 9999999 @ ;") };
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
    const t = () => { run_file(": main begin 1 until ;") };
    expect(t).toThrow("Exceeded maximum cycles");
});

test("un:d opcode", () => {
    const t = () => { run_file(": foo immediate 9999 emit ; : main foo ;") };
    expect(t).toThrow(Error);
});
