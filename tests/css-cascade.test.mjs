import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dedupeCss} from '../scripts/css-cascade.mjs';

test('removes exact shadowed declarations without reordering rules', () => {
  assert.equal(dedupeCss('.a{width:10px;color:red}.b{color:blue}.a{width:10px}').css, '.a{color:red}.b{color:blue}.a{width:10px}');
});
test('does not merge media boundaries or supports fallbacks', () => {
  const source='.a{width:10px}@media(max-width:650px){.a{width:10px}}@media(min-width:651px){.a{width:10px}}.b{display:block;display:grid}';
  assert.equal(dedupeCss(source).css,source);
});
test('does not confuse important or shorthand with longhand', () => {
  const source='.a{margin:1px;margin-top:2px;color:red!important}.a{color:red}';
  assert.equal(dedupeCss(source).css,source);
});
test('does not remove earlier fallback across a different intervening value', () => {
  const source='.a{color:red}.a{color:blue}.a{color:red}';
  assert.equal(dedupeCss(source).css,source);
});
test('preserves layout fallbacks for newer viewport units and functions',()=>{
 const source='.a{height:200px}.a{height:100dvh}.b{width:100px;width:100cqw}';
 assert.equal(dedupeCss(source).css,source);
});
