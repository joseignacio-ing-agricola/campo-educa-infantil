import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {offers,price,formatPrice,purchaseLink,savings} from '../dist/commercial-catalog.js';
assert.equal(price('huerta','USD'),790);assert.equal(price('pack','USD'),1890);assert.equal(savings('USD'),480);assert.equal(savings('CLP'),3980);
assert.throws(()=>price('pack','EUR'));assert.throws(()=>price('other','USD'));
for(const id of Object.keys(offers))for(const currency of ['USD','CLP']){const u=new URL(purchaseLink(id,currency));assert.equal(u.hostname,'wa.me');const text=u.searchParams.get('text');assert(text.includes(formatPrice(id,currency)));assert(text.includes('6 meses'));assert(text.includes('total final'));assert(offers[id].courses.every(c=>text.includes(c)));}
const source=fs.readFileSync('dist/infant-reader.js','utf8');assert(source.includes('Mi cuaderno imprimible'));assert(source.includes('lesson.extensionTask'));assert(source.includes('journal-page'));
const sample=fs.readFileSync('dist/clase-gratis.html','utf8');new vm.Script(sample.match(/<script>([\s\S]*)<\/script>/)[1]);
console.log('PASS: importes por moneda, ahorro del pack, solicitud de compra con condiciones y cuaderno.');
