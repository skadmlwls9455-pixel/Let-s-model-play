#!/usr/bin/env node
/* mcp/cli.js — 사람 쪽 작은 손잡이 (모델에게 보내는 것은 없다)
 *   node mcp/cli.js table 미역탕 4    식탁에 한 접시 차리기 (다음 finish 뒤에 한 번 묻는다)
 *   node mcp/cli.js status             산책 수·활성 메모 수
 */
'use strict';
var core = require('./core.js');
var oct = new core.Octopus({ statePath: process.env.PPOLPPOL_STATE || undefined, outDir: process.env.PPOLPPOL_OUT || undefined });
var cmd = process.argv[2];
if (cmd === 'table' && process.argv[3]) { oct.putDish(process.argv[3], process.argv[4]); console.log('식탁에 올렸어: ' + process.argv[3]); }
else if (cmd === 'status') console.log(JSON.stringify({ trips: oct.S.trips.length, activeNotes: oct.activeNotes().length, running: !!oct.S.running }));
else { console.log('쓰는 법: node mcp/cli.js table <요리 이름> [단계] | status'); process.exit(1); }
