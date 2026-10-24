import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createImageLoader} from '../src/media/image-loader.ts';

function fixture(timeoutMs = 100) {
  const images: Array<any> = [];
  const load = createImageLoader({timeoutMs, createImage: () => {
    const image = {src: '', onload: null, onerror: null, decode: async () => {}};
    images.push(image);
    return image as unknown as HTMLImageElement;
  }});
  return {load, images};
}
test('shares in-flight and decoded images', async () => {
  const {load, images} = fixture();
  const first = load('/a.webp');
  assert.equal(load('/a.webp'), first);
  images[0].onload();
  assert.equal(await first, images[0]);
  assert.equal(await load('/a.webp'), images[0]);
  assert.equal(images.length, 1);
});
test('waits for decoding before completing', async () => {
  const {load, images} = fixture();
  let decode!: () => void;
  const pending = load('/a.webp');
  images[0].decode = () => new Promise<void>(resolve => {decode = resolve;});
  let ready = false;
  void pending.then(() => {ready = true;});
  images[0].onload();
  await Promise.resolve();
  assert.equal(ready, false);
  decode();
  await pending;
  assert.equal(ready, true);
});
test('network/decode failures are evicted so they can be retried', async () => {
  const {load, images} = fixture();
  const first = load('/a.webp');
  images[0].onerror();
  await assert.rejects(first);
  const second = load('/a.webp');
  images[1].decode = async () => {throw new Error('decode');};
  images[1].onload();
  await assert.rejects(second);
  const third = load('/a.webp');
  images[2].onload();
  await third;
  assert.equal(images.length, 3);
});
test('timed-out loads can be retried', async () => {
  const {load, images} = fixture(5);
  await assert.rejects(load('/a.webp'), /超时/);
  const retry = load('/a.webp');
  images[1].onload();
  await retry;
});
