const bundle = require('../index.js');
const { js_beautify } = require('js-beautify');
const entry = './example/basic/entry.js';

const result = bundle(entry);

console.log(`
    --------------------
    Plebpack Blunder  
    --------------------
    ${js_beautify(result)}
`);