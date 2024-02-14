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

let canvas = null;
let context = null;
let sprite = null;

function startup() {
    canvas = document.getElementById("screen");
    context = canvas.getContext("2d");

    // Intercept tab key so it inserts into the source instead of switching
    // to a different element in the page.
    document.getElementById("source").addEventListener("keydown", (evt) => {
        if (evt.key === 'Tab') {
            evt.preventDefault();
            document.execCommand("insertText", false, '\t');
        }
    });

    openPage("outputtab", document.getElementsByClassName("tablink")[0]);
    clearScreen(0);

    const rawData = [
        0xff000000, 0xff000000, 0xff000000, 0xffff0000, 0xffff0000, 0xff000000, 0xff000000, 0xff000000, 
        0xff000000, 0xff000000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xff000000, 0xff000000, 
        0xff000000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xff000000, 
        0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 
        0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 
        0xff000000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xff000000, 
        0xff000000, 0xff000000, 0xffff0000, 0xffff0000, 0xffff0000, 0xffff0000, 0xff000000, 0xff000000, 
        0xff000000, 0xff000000, 0xff000000, 0xffff0000, 0xffff0000, 0xff000000, 0xff000000, 0xff000000, 
    ];

    sprite = context.createImageData(8, 8);
    for (let i = 0; i < 64; i++) {
        sprite.data[i * 4] = rawData[i] & 0xff;
        sprite.data[i * 4 + 1] = (rawData[i] >> 8) & 0xff;
        sprite.data[i * 4 + 2] = (rawData[i] >> 16) & 0xff;
        sprite.data[i * 4 + 3] = (rawData[i] >> 24) & 0xff;
    }
}


function writeConsole(text) {
    document.getElementById("output").textContent += text;
}

const COLOR_STRS = [
    "black",
    "red", 
    "magenta",
    "green",
    "yellow",
    "blue",
    "cyan",
    "white"
];

function clearScreen(color) {
    context.fillStyle = COLOR_STRS[color];
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.stroke();
}

function drawLine(left, top, right, bottom) {
    context.beginPath();
    context.moveTo(left, top);
    context.lineTo(right, bottom);
    context.stroke();
}

function setColor(color) {
    context.strokeStyle = COLOR_STRS[color & 7];
}

function drawSprite(x, y, index) {
    context.putImageData(sprite, x, y);
}

let timer = null;
let drawFrameAddr = -1;

function drawFrame(ctx) {
    ctx.exec(drawFrameAddr);
    timer = setTimeout(()=>{drawFrame(ctx)}, 16);
}

function doRun() {
    console.log("started");
    try {
        const ctx = new Context();
        ctx.registerNative("cls", 1, clearScreen);
        ctx.registerNative("setColor", 1, setColor);
        ctx.registerNative("drawLine", 4, drawLine);
        ctx.registerNative("drawSprite", 3, drawSprite);
        ctx.registerNative("print", 1, (val) => {
            writeConsole(val + "\n");
        });
        
        console.log("compiling");
        ctx.compile(LIB);
        ctx.compile(document.getElementById("source").value);
        console.log("done");
        console.log(ctx.memory);
        for (const key in ctx.dictionary)
            console.log(key, ctx.dictionary[key].address);

        document.getElementById("output").textContent = "";

        if ("init" in ctx.dictionary)
            ctx.exec(ctx.dictionary['init'].address);

        drawFrameAddr = ctx.dictionary['drawFrame'].address;
        clearTimeout(timer);
        drawFrame(ctx);
    } catch (err) {
        alert(err);
    }
}

function openPage(pageName, element) {
    for (const tab of document.getElementsByClassName("tabcontent"))
        tab.style.display = "none";

    for (const tab of document.getElementsByClassName("tablink"))
        tab.className = tab.className.replace(" active", "");

    document.getElementById(pageName).style.display = "block";
    element.className += " active";
}
