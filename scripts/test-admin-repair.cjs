
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
let requests=[];
const http={interceptors:{response:{use(){}}},get:async(url,config={})=>{
 requests.push({method:'get',url,params:config.params});
 if(url==='/auth/csrf')return{data:{data:{csrfToken:'test-token'}}};
 if(url==='/admin/guides')return{data:{data:[{_id:'g1'},{_id:'g2'}]}};
 const page=config.params?.page||1;
 return {data:{data:[{_id:'row-'+page}],pagination:{pages:2,total:2}}};
},request:async(config)=>{requests.push(config);return{data:{data:{_id:'tour-1'},message:'saved'}};}};
const source=fs.readFileSync(require('path').join(__dirname, '../client/src/services/adminApi.js'),'utf8')
 .replace(/import axios from ['"]axios['"];?/,'const axios = globalThis.axios;')
 .replace(/import\.meta\.env\.VITE_API_URL/g,'undefined')
 .replace('export const adminApi','const adminApi')+'\nglobalThis.api = adminApi;';
const context={axios:{create:()=>http},window:{dispatchEvent(){}},Event:class{},FormData:class{append(){}},console};
context.globalThis=context;vm.createContext(context);vm.runInContext(source,context);
(async()=>{
 const api=context.api;
 const destinations=await api.destinations();assert.equal(destinations.data.length,2);assert.ok(requests.filter(x=>x.url==='/destinations').every(x=>x.params.limit===50));
 const tours=await api.tours();assert.equal(tours.data.length,2);
 const created=await api.createDestination({name:'Test'});assert.equal(created.message,'saved');assert.equal(created.data._id,'tour-1');
 const tour=await api.createTour({status:'draft'});assert.equal(tour._id,'tour-1');assert.ok(requests.some(x=>x.url==='/admin/tours/tour-1/status'&&x.data.status==='draft'));
 const guides=await api.guides({status:'approved',page:1,limit:1});assert.equal(guides.data.length,1);assert.equal(guides.pagination.total,2);
 await assert.rejects(()=>api.guides({status:'pending'}),/duplicate server route/);
 await api.addDeparture('tour-1',{date:'future',capacity:3});await api.removeDeparture('tour-1','dep-1');
 const writes=requests.filter(x=>x.method!=='get');assert.ok(writes.every(x=>x.headers['X-CSRF-Token']==='test-token'));
 console.log(JSON.stringify({passed:8,failed:0,checks:['destination pagination max 50','tour pagination','destination response envelope','draft creation status call','approved guide pagination','explicit shadow-route failure','departure endpoints','CSRF on every write']}));
})().catch(e=>{console.error(e);process.exitCode=1;});
