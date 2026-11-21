/* joins the painter fragments of this folder into js/cook-sprites.js (between the two SPRITES markers) */
var fs = require('fs'), path = require('path'), f = path.resolve(__dirname, '../../../../js/cook-sprites.js');
var src = fs.readFileSync(f, 'utf8'), a = src.indexOf('/*SPRITES-BEGIN*/'), b = src.indexOf('/*SPRITES*/');
var parts = fs.readdirSync(__dirname).filter(function (n) { return /^\d.*\.js$/.test(n); }).sort().map(function (n) { return fs.readFileSync(path.join(__dirname, n), 'utf8'); });
if (a < 0) { a = b; src = src.slice(0, a) + '/*SPRITES-BEGIN*/\n' + src.slice(b); b = src.indexOf('/*SPRITES*/'); }
fs.writeFileSync(f, src.slice(0, a) + '/*SPRITES-BEGIN*/\n' + parts.join('\n') + '\n' + src.slice(b));
console.log('joined ' + parts.length + ' fragments, ' + fs.statSync(f).size + ' bytes');
