import { createServer } from 'node:http';
import { createHmac, randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { openDb, reset, slugify } from './db.mjs';
import * as v from './views.mjs';

const contentKeys=['nameEn','benefits','descriptionEn','seoTitle','seoDescription'];
const aiMode=()=>process.env.AI_API_KEY?'实时 AI API':'离线模拟 · 使用预设英文模板';
const digest=value=>createHash('sha256').update(value).digest();
const quantityOk=(p,n)=>p?.status==='published'&&Number.isInteger(n)&&n>=p.moq&&n<=1e6;
const priceFor=(p,n)=>p.priceTiers.findLast(t=>n>=t.min)?.price;
async function generate(name,source,p) {
  if (!process.env.AI_API_KEY) {
    const types=[[/笔记本|手账/,'Wholesale Notebook'],[/套装|礼盒/,'Stationery Set'],[/文件夹/,'Document Folder'],[/便签/,'Sticky Note Set'],[/笔筒|收纳/,'Desk Organizer']];
    const nameEn=types.find(([pattern])=>pattern.test(name+' '+source))?.[1]||p?.nameEn||'Wholesale Stationery';
    return {nameEn,benefits:'Suitable for bulk assortments\nRequest packaging options with your quote',descriptionEn:`Explore ${nameEn.toLowerCase()} for retail assortments and office supply programs. Contact us for product and packaging details.`,seoTitle:`${nameEn} | Paper Harbor`,seoDescription:`Request a demo wholesale quote for ${nameEn.toLowerCase()} from Paper Harbor.`};
  }
  const response=await fetch(process.env.AI_API_URL,{method:'POST',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+process.env.AI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({
    model:process.env.AI_MODEL,messages:[{role:'system',content:'Return a JSON object with English string fields nameEn, benefits (one benefit per line), descriptionEn, seoTitle, seoDescription. Use only supplied product facts. Do not invent specifications, claims, certifications, supplier details, or prices.'},{role:'user',content:JSON.stringify({name,source})}],response_format:{type:'json_object'}
  })});
  if(!response.ok) throw Error('Provider request failed');
  const payload=JSON.parse((await response.json()).choices[0].message.content);
  if(!contentKeys.every(k=>typeof payload[k]==='string'&&payload[k].trim()&&payload[k].length<=4000)) throw Error('Invalid AI output');
  return Object.fromEntries(contentKeys.map(k=>[k,payload[k]]));
}
export function app(db=openDb(),{password=process.env.ADMIN_PASSWORD,secure=process.env.PUBLIC_DEMO==='1'}={}) {
  if(secure&&(!password||password.length<16)) throw Error('Public demo requires ADMIN_PASSWORD of at least 16 characters.');
  const all=table=>db.prepare(`SELECT data FROM ${table}`).all().map(row=>JSON.parse(row.data));
  const product=id=>JSON.parse(db.prepare('SELECT data FROM products WHERE id=?').get(id)?.data||'null');
  const epoch=()=>db.prepare("SELECT key FROM settings WHERE key LIKE 'cart:%'").get()?.key||'initial';
  const sign=value=>createHmac('sha256',password).update(value).digest('hex');
  return createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');
    const path=url.pathname;
    const post=req.method==='POST';
    const admin=path==='/admin'||path.startsWith('/admin/');
    const cookies=Object.fromEntries((req.headers.cookie||'').split(/;\s*/).filter(c=>c.includes('=')).map(c=>[c.slice(0,c.indexOf('=')),c.slice(c.indexOf('=')+1)]));
    const [expires,signature]=cookies.session?.split('.')||[];
    const authenticated=Boolean(password&&Number(expires)>Date.now()&&signature&&timingSafeEqual(digest(signature),digest(sign(expires))));
    let cart={};
    try{
      const parsed=JSON.parse(decodeURIComponent(cookies.cart||'{}'));
      if(parsed.epoch===epoch()&&parsed.items&&typeof parsed.items==='object') cart=Object.fromEntries(Object.entries(parsed.items).filter(([id,n])=>/^[A-Za-z0-9-]{1,32}$/.test(id)&&Number.isInteger(n)));
    }catch{}
    const cookie=(name,value,age)=>res.setHeader('Set-Cookie',`${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`);
    const saveCart=()=>cookie('cart',encodeURIComponent(JSON.stringify({epoch:epoch(),items:cart})),86400);
    const redirect=location=>res.writeHead(303,{Location:location}).end();
    const page=(title,body,status=200,description='')=>res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end(v.layout(title,body,{admin,description,cart:Object.keys(cart).length}));
    const notFound=()=>page('Page not found','<main class="wrap section"><h1>Page not found</h1><a href="/">Return home</a></main>',404);
    const items=()=>Object.entries(cart).map(([id,quantity])=>{
      const p=product(id);
      return {id,p:p?.status==='published'?p:null,quantity,price:quantityOk(p,quantity)?priceFor(p,quantity):null};
    });
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    try{
      if(post&&req.headers.origin){
        const origin=new URL(req.headers.origin);
        if(origin.host!==req.headers.host) return page('Forbidden','<main class="wrap section">Forbidden</main>',403);
      }
      if(admin&&!authenticated&&path!=='/admin/login') return post?page('Forbidden',v.login(),403):redirect('/admin/login');
      let f={};
      if(post){
        let size=0;
        const chunks=[];
        for await(const chunk of req){
          size+=chunk.length;
          if(size>32768){res.writeHead(413).end();return;}
          chunks.push(chunk);
        }
        f=Object.fromEntries([...new URLSearchParams(Buffer.concat(chunks).toString())].map(([k,val])=>[k,val.trim()]));
      }
      if(!post&&/^\/(style\.css|product-[1-6]\.jpg)$/.test(path)){
        const bytes=await readFile(new URL('./public'+path,import.meta.url));
        return res.writeHead(200,{'Content-Type':path.endsWith('.css')?'text/css':'image/jpeg'}).end(bytes);
      }
      if(!post&&path==='/') return page('Wholesale stationery',v.home(all('products').filter(p=>p.status==='published')));
      if(!post&&path==='/products'){
        const q=url.searchParams.get('q')||'', category=url.searchParams.get('category')||'';
        const rows=all('products').filter(p=>p.status==='published'&&(!category||p.category===category)&&(p.nameEn+' '+p.sku).toLowerCase().includes(q.toLowerCase().trim()));
        return page('Catalog',v.catalog(rows,q,category));
      }
      if(!post&&path.startsWith('/products/')){
        const p=JSON.parse(db.prepare('SELECT data FROM products WHERE slug=?').get(path.slice(10))?.data||'null');
        return p?.status==='published'?page(p.seoTitle||p.nameEn,v.detail(p),200,p.seoDescription):notFound();
      }
      if(post&&path==='/cart'){
        const id=f.id||'';
        const p=product(id);
        const n=Number(f.quantity);
        if(f.action==='remove') delete cart[id];
        else if(!quantityOk(p,n)){
          const message=p?.status==='published'?`Enter a whole quantity from ${p.moq} to 1,000,000.`:'This product is unavailable.';
          return f.action==='update'||p?.status!=='published'?page('Quote list',v.quote(items(),message),422):page(p.nameEn,v.detail(p,message),422);
        }else{
          if(!Object.hasOwn(cart,id)&&Object.keys(cart).length>=20) return page('Quote list',v.quote(items(),'The quote list supports up to 20 products.'),422);
          cart[id]=n;
        }
        saveCart();
        return redirect('/quote');
      }
      if(path==='/quote'){
        const rows=items();
        if(!post) return page('Quote list',v.quote(rows));
        let error='';
        if(!rows.length||rows.some(i=>i.price==null)) error='Review the products and quantities in your quote list.';
        else if(!['buyerName','company','country'].every(k=>f[k]&&f[k].length<=100)) error='Enter a buyer name, company, and country with at most 100 characters each.';
        else if(!/^[^\s@]+@example\.(com|net|org)$/i.test(f.email||'')||f.email.length>150) error='Use a fictional email address at example.com, example.net, or example.org.';
        else if(f.fictional!=='on'||(f.message||'').length>1000) error='Confirm fictional details and keep your message under 1,000 characters.';
        if(error) return page('Quote list',v.quote(rows,error,f),422);
        const id=randomUUID(),createdAt=new Date().toISOString();
        const {buyerName,company,email,country,message=''}=f;
        const inquiry={id,buyerName,company,email,country,message,status:'new',createdAt,items:rows.map(({p,quantity,price})=>({productId:p.id,nameEn:p.nameEn,quantity,unitPriceSnapshot:price}))};
        db.prepare('INSERT INTO inquiries VALUES (?,?,?)').run(id,createdAt,JSON.stringify(inquiry));
        cart={};saveCart();
        return redirect('/quote/received');
      }
      if(!post&&path==='/quote/received') return page('RFQ received','<main class="wrap section"><h1>RFQ received</h1><p>Your demo request is ready for merchant follow-up.</p><a class="button" href="/products">Continue browsing</a></main>');
      if(path==='/admin/login'){
        if(!post) return authenticated?redirect('/admin'):page('商家登录',v.login(password?'':'请在服务端配置 ADMIN_PASSWORD。'));
        if(!password||!timingSafeEqual(digest(f.password||''),digest(password))) return page('商家登录',v.login('登录失败。请检查管理密码。'),401);
        const expiration=String(Date.now()+8*3600000);
        cookie('session',expiration+'.'+sign(expiration),28800);
        return redirect('/admin');
      }
      if(post&&path==='/admin/logout'){cookie('session','',0);return redirect('/admin/login');}
      if(!post&&path==='/admin'){
        const q=url.searchParams.get('q')||'',status=url.searchParams.get('status')||'';
        return page('询盘管理',v.inquiries(all('inquiries').reverse().filter(r=>(!status||r.status===status)&&[r.id,r.company,r.email,r.buyerName].join(' ').toLowerCase().includes(q.toLowerCase().trim())),q,status));
      }
      if(post&&path.startsWith('/admin/inquiries/')){
        const id=path.split('/').at(-1);
        const row=db.prepare('SELECT data FROM inquiries WHERE id=?').get(id);
        if(!row||!Object.hasOwn(v.statuses,f.status)) return notFound();
        db.prepare('UPDATE inquiries SET data=? WHERE id=?').run(JSON.stringify({...JSON.parse(row.data),status:f.status}),id);
        return redirect('/admin');
      }
      if(!post&&path==='/admin/products') return page('商品管理',v.productList(all('products')));
      if(post&&path==='/admin/reset'&&f.confirm==='on'){
        reset(db);
        return redirect('/admin/products');
      }
      if(path.startsWith('/admin/products/')){
        const id=path.split('/').at(-1),existing=id==='new'?null:product(id);
        if(id!=='new'&&!existing) return notFound();
        if(!post) return page('编辑商品',v.editor(existing||{}));
        const sku=(f.sku||'').toUpperCase(), moq=Number(f.moq);
        const tiers=(f.tiers||'').split(',').map(t=>t.trim().match(/^(\d+)\s*:\s*(\d+(?:\.\d{1,2})?)$/)).map(t=>({min:Number(t?.[1]),price:Number(t?.[2])}));
        const err=!/^[A-Z0-9-]{1,32}$/.test(sku)||(sku!==existing?.sku&&all('products').some(p=>p.sku===sku))?'请输入唯一 SKU（字母、数字或连字符，最多 32 位）。':
          !['nameZh','nameEn','descriptionEn','specifications'].every(k=>f[k]&&f[k].length<=4000)||!contentKeys.every(k=>(f[k]||'').length<=4000)||!v.categories.includes(f.category)||!/^\/product-[1-6]\.jpg$/.test(f.image||'')||!['draft','published'].includes(f.status)?'请检查必填字段、分类和图片。':
          !Number.isInteger(moq)||moq<1||tiers[0].min!==moq||tiers.some((t,i)=>!Number.isInteger(t.min)||t.min>1e6||!Number.isFinite(t.price)||t.price<=0||t.price>1e6||(i>0&&(t.min<=tiers[i-1].min||t.price>tiers[i-1].price)))?'首档数量必须等于 MOQ，各档数量递增、单价为正且不递增。':'';
        if(err) return page('编辑商品',v.editor({...f,id:existing?.id},err),422);
        const productId=existing?.id||randomUUID().replaceAll('-','');
        const slug=existing?.slug||((slugify(f.nameEn).slice(0,80)||'product')+'-'+productId.slice(0,8));
        const {nameZh,category,specifications,status}=f;
        const p={id:productId,sku,slug,nameZh,category,specifications,status,moq,images:[f.image],priceTiers:tiers,...Object.fromEntries(contentKeys.map(k=>[k,f[k]||'']))};
        db.prepare('INSERT INTO products VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(productId,slug,JSON.stringify(p));
        return redirect('/admin/products');
      }
      if(path==='/admin/ai'){
        const rows=all('products');
        if(!post) return page('AI 商品内容助手',v.aiForm(rows,aiMode()));
        const p=f.target?product(f.target):null;
        const nameZh=f.nameZh||p?.nameZh;
        if((f.target&&!p)||!nameZh||nameZh.length>200||!f.source||f.source.length>4000) return page('AI 商品内容助手',v.aiForm(rows,aiMode(),'请提供中文品名和有效资料。',f),422);
        try{
          const content=await generate(nameZh,f.source,p);
          return page('编辑生成结果',v.editor({...p,nameZh,specifications:p?.specifications||f.source,...content},'',aiMode()));
        }catch{
          return page('AI 商品内容助手',v.aiForm(rows,aiMode(),'生成失败。请检查服务端 API 地址、模型和凭据后重试。',f),502);
        }
      }
      return notFound();
    }catch(error){
      console.error(error.name);
      return page('Unavailable','<main class="wrap section"><h1>Service temporarily unavailable</h1></main>',500);
    }
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const port=Number(process.env.PORT||3000);
  const host=process.env.HOST||'127.0.0.1';
  app().listen(port,host,()=>console.log(`Paper Harbor listening on http://${host}:${port}`));
}
