import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from './db.mjs';
import { app } from './server.mjs';

test('Merchant publishes, buyer submits multiple products, merchant follows up and edits AI content',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'paperharbor-'));
  const file=join(folder,'demo.sqlite');
  let db,server,base;
  async function start(){
    db=openDb(file);
    server=app(db,{password:'test-password-only'});
    server.listen(0,'127.0.0.1');
    await once(server,'listening');
    base='http://127.0.0.1:'+server.address().port;
  }
  async function stop(){
    if(server?.listening) await new Promise(resolve=>server.close(resolve));
    db?.close();
    db=null;
  }
  t.after(async()=>{await stop();rmSync(folder,{recursive:true,force:true});});
  await start();
  let session='',cart='';
  async function request(path,fields,cookie=''){
    const result=await fetch(base+path,{redirect:'manual',headers:{cookie},...(fields?{method:'POST',body:new URLSearchParams(fields)}:{})});
    return {status:result.status,location:result.headers.get('location'),cookie:result.headers.get('set-cookie')?.split(';')[0],body:await result.text()};
  }
  assert.equal((await request('/admin')).location,'/admin/login');
  assert.equal((await request('/admin/reset',{confirm:'on'})).status,403);
  assert.match((await request('/products?category=Earrings&q=pearl')).body,/Pearl Drop Earrings/);
  for(let i=1;i<=6;i++) assert.equal((await request('/product-'+i+'.jpg')).status,200);
  session=(await request('/admin/login',{password:'test-password-only'})).cookie;
  const fields={sku:'TEST-100',nameZh:'珍珠耳环',nameEn:'Canvas Journal',descriptionEn:'A canvas-covered notebook.',specifications:'A5',category:'Earrings',moq:'100',tiers:'100:2, 500:1.5',image:'/product-6.jpg',status:'published'};
  assert.equal((await request('/admin/products/new',fields,session)).status,303);
  const catalog=(await request('/products?q=TEST-100')).body;
  const slug=catalog.match(/\/products\/(canvas-journal-[a-z0-9]+)/)[1];
  const id=(await request('/admin/products',null,session)).body.match(/TEST-100[\s\S]*?\/admin\/products\/([a-z0-9]+)/)[1];
  assert.match((await request('/products/'+slug)).body,/Volume pricing/);
  assert.equal((await request('/cart',{id,quantity:'99'})).status,422);
  cart=(await request('/cart',{id,quantity:'500'})).cookie;
  cart=(await request('/cart',{id:'ER101',quantity:'200'},cart)).cookie;
  assert.match((await request('/quote',null,cart)).body,/\$1\.50/);
  const buyer={buyerName:'Demo Buyer',company:'Sample Retail',email:'buyer@example.com',country:'Canada',fictional:'on'};
  assert.equal((await request('/quote',{...buyer,email:'buyer@real.invalid'},cart)).status,422);
  assert.equal((await request('/quote',buyer,cart)).location,'/quote/received');
  const inbox=(await request('/admin?q=Sample',null,session)).body;
  assert.match(inbox,/Canvas Journal \(.*\) × 500/);
  assert.match(inbox,/Pearl Drop Earrings \(ER101\) × 200/);
  const inquiry=inbox.match(/\/admin\/inquiries\/([a-z0-9-]+)/)[1];
  assert.equal((await request('/admin/inquiries/'+inquiry,{status:'contacted'},session)).status,303);
  assert.match((await request('/admin?status=contacted',null,session)).body,/Sample Retail/);
  const ai=await request('/admin/ai',{target:id,source:'A5 珍珠耳环'},session);
  assert.equal(ai.status,200);
  assert.match(ai.body,/Wholesale Earrings/);
  assert.match(ai.body,/离线模拟/);
  const edited={...fields,nameEn:'Canvas Journal Revised',descriptionEn:'Edited by the merchant.',seoTitle:'Revised wholesale journal'};
  assert.equal((await request('/admin/products/'+id,edited,session)).status,303);
  await stop();
  await start();
  const detail=(await request('/products/'+slug)).body;
  assert.match(detail,/Canvas Journal Revised/);
  assert.match(detail,/Edited by the merchant/);
  assert.match((await request('/admin?status=contacted',null,session)).body,/Sample Retail/);
  assert.equal((await request('/admin/products/'+id,{...edited,status:'draft'},session)).status,303);
  assert.equal((await request('/products/'+slug)).status,404);
  assert.equal((await request('/admin/reset',{confirm:'on'},session)).status,303);
  assert.match((await request('/products')).body,/6 products/);
  assert.match((await request('/quote',null,cart)).body,/quote list is empty/);
  assert.match((await request('/admin',null,session)).body,/没有符合条件的询盘/);
});

test('Public mode refuses missing or short admin credentials',()=>{
  const db=openDb(':memory:');
  try{assert.throws(()=>app(db,{secure:true,password:'short'}),/ADMIN_PASSWORD/);}
  finally{db.close();}
});
