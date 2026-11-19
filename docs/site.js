const categories={All:'全部',Earrings:'耳环',Necklaces:'项链',Bracelets:'手链','Hair Accessories':'发饰',Rings:'戒指'};
const notes={
 ER101:['柔润珠光沿耳侧垂落，适合搭配简洁领口。','Soft pearl drops frame the face and pair with a clean neckline.'],
 NK201:['小巧的金色爱心落在锁骨处，适合单戴或叠搭。','A small golden heart sits at the collarbone, alone or layered.'],
 BR301:['粉色圆珠围绕手腕，为日常搭配增添一抹柔和色彩。','Rose-colored beads add a soft accent to an everyday wrist stack.'],
 HC401:['雾蓝色夹身与弧形轮廓，适合低盘发造型。','A mist-blue claw with a curved profile for a low updo.'],
 RG501:['流动的银色波纹，在指间勾勒简洁线条。','An undulating silver tone traces a clean line around the finger.'],
 ER102:['小圈轮廓贴近耳垂，金色光泽适合日常佩戴。','Petite golden hoops sit close to the lobe for everyday wear.']
};
const edits=[
 {title:['珠光与玫瑰','Pearl & rose'],copy:['用暖粉串珠呼应耳畔珠光，适合布置柔色礼赠台。','Pair soft pearl lustre with rose beads for a blush-toned gifting display.'],skus:['ER101','BR301']},
 {title:['日常金调','Everyday gold'],copy:['用小圈耳环衬托爱心吊坠，让颈间保留一个视觉重点。','Frame a heart pendant with close-fitting hoops to keep the neckline in focus.'],skus:['NK201','ER102']},
 {title:['雾蓝线条','Blue contours'],copy:['把头发轻轻挽起，用银色指环呼应抓夹的弧线。','Sweep hair up with a blue claw and echo its curves with a silver-tone ring.'],skus:['HC401','RG501']}
];
function renderEdits(){
 get('stories').innerHTML=edits.map(edit=>{
   const styles=edit.skus.map(sku=>catalog.find(p=>p.sku===sku));
   return `<article class="story"><div class="diptych">${styles.map(p=>`<button data-sku="${p.sku}" aria-label="${tr(p.nameZh,p.nameEn)}"><img loading="lazy" src="${p.image}" alt=""></button>`).join('')}</div><h3>${tr(...edit.title)}</h3><p>${tr(...edit.copy)}</p><div class="style-links">${styles.map(p=>`<button data-sku="${p.sku}">${tr(p.nameZh,p.nameEn)} ↗</button>`).join('')}</div></article>`;
 }).join('');
}
let english=localStorage.getItem('lookbook-lang')==='en', category='All';
const get=id=>document.getElementById(id);
const tr=(zh,en)=>english?en:zh;
function render(){
 document.documentElement.lang=tr('zh-CN','en');
 document.title='Luma Bijoux · '+tr('饰品选品册','Jewelry Lookbook');
 document.querySelectorAll('[data-en]').forEach(el=>{el.dataset.zh??=el.textContent;el.textContent=tr(el.dataset.zh,el.dataset.en);});
 renderEdits();
 get('lang').textContent=tr('English','中文');
 get('search').placeholder=tr('款名 / SKU','Style name / SKU');
 get('filters').innerHTML=Object.entries(categories).map(([key,zh])=>`<button data-category="${key}" aria-pressed="${category===key}">${tr(zh,key)}</button>`).join('');
 const query=get('search').value.trim().toLowerCase();
 const matches=catalog.filter(p=>(category==='All'||p.category===category)&&[p.nameZh,p.nameEn,p.sku].join(' ').toLowerCase().includes(query));
 get('empty').hidden=matches.length>0;
 get('grid').innerHTML=matches.map(p=>`<button class="card" data-sku="${p.sku}"><img loading="lazy" src="${p.image}" alt=""><small>${tr(categories[p.category],p.category)} · ${p.sku}</small><h3>${tr(p.nameZh,p.nameEn)}</h3><span class="meta">${tr('起订','MOQ')} ${p.priceTiers[0].min} · ${tr('查看详情','View details')} ↗</span></button>`).join('');
}
get('lang').onclick=()=>{english=!english;localStorage.setItem('lookbook-lang',english?'en':'zh');render();};
get('search').oninput=render;
get('filters').onclick=event=>{if(event.target.dataset.category){category=event.target.dataset.category;render();get('filters').querySelector('[aria-pressed=true]').focus();}};
function openStyle(event){
 const sku=event.target.closest('[data-sku]')?.dataset.sku;
 const p=catalog.find(product=>product.sku===sku);
 if(!p)return;
 get('inside').innerHTML=`<img src="${p.image}" alt="${tr(p.nameZh,p.nameEn)}"><section><small>${p.sku} · ${tr(categories[p.category],p.category)}</small><h2 id="dialog-title">${tr(p.nameZh,p.nameEn)}</h2><p>${tr(...notes[sku])}</p><p>${tr('尺寸','Size')} · ${p.specifications}</p><table><caption>${tr('批量参考价（美元）','Illustrative bulk pricing (USD)')}</caption><thead><tr><th>${tr('数量','Quantity')}</th><th>${tr('单价','Unit price')}</th></tr></thead><tbody>${p.priceTiers.map(t=>`<tr><td>${t.min}+</td><td>$${t.price.toFixed(2)}</td></tr>`).join('')}</tbody></table></section>`;
 const unit=tr(p.category==='Earrings'?'对':'件',p.category==='Earrings'?'pairs':'units');
 const panel=get('inside').querySelector('section');
 panel.insertAdjacentHTML('beforeend',`<div class="estimate"><label>${tr('采购数量','Order quantity')} (${unit})<input id="units" type="number" min="${p.priceTiers[0].min}" max="1000000" value="${p.priceTiers[0].min}" step="1"></label><output id="subtotal" aria-live="polite"></output></div>`);
 function estimate(){
   const input=get('units'), n=input.valueAsNumber;
   const tier=p.priceTiers.findLast(t=>n>=t.min);
   get('subtotal').textContent=input.validity.valid&&tier ? tr('参考总价 ','Estimated total ')+new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n*tier.price) : tr('请输入符合起订量的整数。','Enter a whole quantity within the allowed range.');
 }
 get('units').oninput=estimate;
 estimate();
 get('details').setAttribute('aria-labelledby','dialog-title');
 get('details').showModal();
};
get('grid').onclick=openStyle;
get('stories').onclick=openStyle;
get('details').querySelector('.close').onclick=()=>get('details').close();
get('details').onclick=event=>{if(event.target===get('details'))get('details').close();};
render();
