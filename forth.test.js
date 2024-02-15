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
    const src = "define main 1 2 + print 5 7 * print 10 4 - print enddef";

    expect(run_file(src)).toBe("3\n35\n6");
});

test("variables", () => {
    const src = `
    variable a
    variable b
    variable c

    define main
    12 a !
    13 b !
    14 c !
    a @ print
    b @ print
    c @ print
    15 a !
    a @ print
    enddef
`
    expect(run_file(src)).toBe("12\n13\n14\n15")


});

test("conditionals", () => {
    const src = `
define main
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
enddef
`;

    expect(run_file(src)).toBe("17\n20\n21\n23");

});

test("while loop", () => {
    src = `
    define main
    10
    begin
        dup 0 gt
    while
        dup print
        1 -
    repeat
    enddef`

    expect(run_file(src)).toBe("10\n9\n8\n7\n6\n5\n4\n3\n2\n1");
});

test("until loop", () => {
    src = `
    define main
    10
    begin
        dup print
        1 - 
        dup
    until
    enddef`

    expect(run_file(src)).toBe("10\n9\n8\n7\n6\n5\n4\n3\n2\n1");
});

test("underflow", () => {
    const t = () => { run_file("define main + enddef") };
    expect(t).toThrow("stack underflow")
})

test("drop", () => {
    expect(run_file("define main 1 2 3 drop print print enddef")).toBe("2\n1");
})

test("dup", () => {
    expect(run_file("define main 1 2 3 dup print print print print enddef")).toBe("3\n3\n2\n1");
});

test("swap", () => {
    expect(run_file("define main 1 2 3 swap print print print enddef")).toBe("2\n3\n1");
});

test("over", () => {
    expect(run_file("define main 1 2 3 over print print print print enddef")).toBe("2\n3\n2\n1");
});

test("comparisons", () => {
    expect(run_file(`define main
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
      enddef
    `)).toBe("0\n1\n1\n0\n1\n0\n1\n1\n0\n1\n1\n0\n0\n1");
});

test("logical", () => {
    expect(run_file(`
        define main
        4 1 or print 
        10 3 and print 
        11 not print
        enddef
    `)).toBe("5\n2\n-12");
});

test("def", () => {
    expect(run_file(`
        define foo
           3 +
        enddef

        define bar
            2 * 
        enddef

        define main
            7 bar foo print
        enddef
    `)).toBe("17");
});


test("unmatched comment", () => {
    const t = () => { run_file("\n\n( this is an unmatched... \n\n") };
    expect(t).toThrow("Line 3: unmatched comment")
});

test("nested define", () => {
    const t = () => { run_file("\n\ndefine foo\ndefine bar\n") };
    expect(t).toThrow("Line 4: define inside define")
});

test("unmatched enddef", () => {
    const t = () => { run_file("\n\nenddef\n") };
    expect(t).toThrow("Line 3: unmatched enddef")
});

test("variable inside define", () => {
    const t = () => { run_file("\ndefine foo\nvariable bar\n") };
    expect(t).toThrow("Line 3: variable inside define")
});

test("unknown token", () => {
    const t = () => { run_file("\ndefine foo\nbar\n") };
    expect(t).toThrow("Line 3: unknown token bar")
});

test("store out of range 1", () => {
    const t = () => { run_file("define main 2 -1 ! enddef") };
    expect(t).toThrow("Memory store out of range: -1")
});

test("store out of range 2", () => {
    const t = () => { run_file("define main 2 1000000 ! enddef") };
    expect(t).toThrow("Memory store out of range: 1000000")
});

test("load out of range 1", () => {
    const t = () => { run_file("define main -1 @ enddef") };
    expect(t).toThrow("Memory load out of range: -1")
});

test("load out of range 2", () => {
    const t = () => { run_file("define main 9999999 @ enddef") };
    expect(t).toThrow("Memory load out of range: 9999999")
});

test("invoke native underflow", () => {
    const ctx = new forth.Context();
    ctx.registerNative("foo", 1, (val) =>  {});
    ctx.compile("define main foo enddef");

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

    ctx.compile("define main 17 foo print print enddef");
    ctx.exec(ctx.dictionary["main"].address);
    expect(strval).toBe("19\n18\n");
});

test("infinite loop", () => {
    const t = () => { run_file("define main begin 1 until enddef") };
    expect(t).toThrow("Exceeded maximum cycles");
});

test("undefined opcode", () => {
    const t = () => { run_file("define foo immediate 9999 emit enddef define main foo enddef") };
    expect(t).toThrow(Error);
});
