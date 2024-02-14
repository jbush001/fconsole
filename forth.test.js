const forth = require('./forth');

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

test('addition', () => {
    const src = "define main 1 2 + print enddef";

    expect(run_file(src)).toBe('3');
});

test('variables', () => {
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

test('conditionals', () => {
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

test('while loop', () => {
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

test('until loop', () => {
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

test('underflow', () => {
    const t = () => { run_file("define main + enddef") };
    expect(t).toThrow("stack underflow")
})