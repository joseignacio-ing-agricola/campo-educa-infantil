import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createProgressSync,mergeProgress,completedLessons} from '../dist/progress-sync.js';
const ids=new Map(),storage=new Map(),events=new Map();
class Element{constructor(tag){this.tag=tag;this.children=[];this.value='';this.hidden=false;}set id(x){this._id=x;ids.set(x,this);}get id(){return this._id;}append(...x){this.children.push(...x);}replaceChildren(...x){this.children=x;}insertBefore(x,b){const n=this.children.indexOf(b);this.children.splice(n<0?0:n,0,x);}setAttribute(k,v){this[k]=v;}addEventListener(name,fn){events.set((this.id||this.tag)+':'+name,fn);}querySelector(){return new Element('button');}}
const html=fs.readFileSync('dist/aula.html','utf8');
for(const [,id]of html.matchAll(/id="([^"]+)"/g)){const n=new Element('div');n.id=id;}
const traces=[];let admin=false;
const data={learner_profiles:[{user_id:'owner',full_name:'Encargado',email:'owner@example.test'},{user_id:'family-child',full_name:'Familia infantil',email:'child@example.test'},{user_id:'family-adult',full_name:'Otra familia',email:'adult@example.test'}],courses:[{id:'infantil-mini-huerta',title:'Huerta',description:'Curso',active:true},{id:'adult-course',title:'Original',active:true}],enrollments:[{user_id:'family-child',course_id:'infantil-mini-huerta',active:true,expires_at:'2099-01-01'},{user_id:'family-adult',course_id:'adult-course',active:true}],campo_learning_state:[],campo_portfolios:[],campo_certificates:[],infantil_sales_metrics:[]};
function from(table){let filters=[],single=false,trace={table};const q={select(columns){trace.columns=columns;return q;},eq(k,v){filters.push(x=>x[k]===v);return q;},like(k,v){trace.prefix=v;filters.push(x=>String(x[k]).startsWith(v.replace('%','')));return q;},in(k,values){trace.in={key:k,values};filters.push(x=>values.includes(x[k]));return q;},order(){return q;},limit(){return q;},maybeSingle(){single=true;return q;},then(resolve){traces.push(trace);let rows=table==='course_admins'?(admin?[{user_id:'owner'}]:[]):data[table]||[];rows=rows.filter(x=>filters.every(f=>f(x)));return Promise.resolve({data:single?(rows[0]||null):rows,error:null}).then(resolve);}};return q;}
const client={from,auth:{getUser:async()=>({data:{user:{id:'owner',email:'owner@example.test'}},error:null})},rpc:async()=>({error:null})};
const context={createProgressSync,mergeProgress,completedLessons,infantHTML:()=>'',document:{getElementById:id=>ids.get(id),createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),addEventListener(){}},window:{AULA_CONFIG:{},location:{origin:'https://example.test'},addEventListener(){}},navigator:{onLine:true},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setTimeout:()=>0,clearTimeout(){},Intl,Date,console,location:{origin:'https://example.test'}};
let source=fs.readFileSync('dist/app.js','utf8').replace(/^import .*;\s*$/gm,'').replace(/initialize\(\)\.catch\([^\n]+\);/,'');source+='\nglobalThis.api={start:async(client)=>{sb=client;await loadDashboard();},admin:loadAdmin};';vm.runInNewContext(source,context);
await context.api.start(client);assert.equal(ids.get('courses').children.length,1);assert.equal(ids.get('continue-adventure').hidden,false);
admin=true;traces.length=0;await context.api.start(client);
const enroll=traces.find(t=>t.table==='enrollments'&&t.prefix==='infantil-%');assert(enroll);
const learner=traces.find(t=>t.table==='learner_profiles'&&t.in);assert.deepEqual([...learner.in.values],['family-child']);assert(!learner.in.values.includes('family-adult'));
for(const table of ['campo_portfolios','campo_certificates'])assert(traces.find(t=>t.table===table&&t.in.values.every(v=>v.startsWith('infantil-'))));
assert(!html.includes('delete-user-form'));assert(html.includes('sales-form'));
console.log('PASS: catálogo infantil, continuación, alumnos por matrícula, entregas filtradas y eliminación global retirada.');
