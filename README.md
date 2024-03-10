![example workflow](https://github.com/jbush001/fconsole/actions/workflows/node.js.yml/badge.svg)

FORTH has a fervent base of adherents who rave about its simplicity and power.
While the mechanics are pretty simple, I've never really fully understood its Te.
I've been having fun recently making small games in PICO-8, and I thought an
interesting way to understand FORTH better would be to create a small fantasy
console based on it.

Live version here: <https://jbush001.github.io/fconsole/>

## Develop and test locally

Install NodeJS:

    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    (reopen shell)
    nvm install node

To run tests:

    npm test

To run in browser (locally):

    npm run serve

Open a web browser to <http://localhost:3000/index.html>
