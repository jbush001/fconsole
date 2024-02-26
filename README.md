![example workflow](https://github.com/jbush001/fconsole/actions/workflows/node.js.yml/badge.svg)

FORTH has a fervent base of adherents who rave about its simplicity and power.
While the mechanics are pretty simple, I've never really fully understood its Te.
I've been having fun recently making small games in PICO-8, and I thought an
interesting way to understand FORTH better would be to create a small fantasy
console based on it.

I've found implementing FORTH in Javascript to be a bit tricky. Most native
FORTH machines use a direct threaded interpreter, but that doesn't really
work in Javascript, which can't branch directly. For my first pass, I tried using
bytecode for the inner interpreter, but that's not working well because so many
constructs require the outer interpreter (e.g. allot). So I probably need to
rethink this.

To set up, install NodeJS:

    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    (reopen shell)
    nvm install node

To run tests:

    npm test

To run in browser:

    npm run serve

Open a web browser to <http://localhost:3000/index.html>
