// English and Chinese labels used by the storefront and merchant portal.
const labels = [
['YIWU JEWELRY WHOLESALE','义乌饰品批发'],['Pearls, petals,','珍珠与花瓣，'],['and little charms.','点缀日常。'],
['Discover earrings, necklaces and everyday adornments for your boutique. Mix styles in one wholesale inquiry.','为你的精品店挑选耳环、项链与日常配饰，多款商品可合并询价。'],
['Explore catalog →','浏览饰品 →'],['Request a quote','批量询价'],['Catalog','商品目录'],['Quote list','询价清单'],['Wholesale quantities','批量采购'],['Volume pricing','阶梯报价'],['Multi-product RFQs','多款合并询价'],
['THE COLLECTION','精选系列'],['Boutique favorites','精品店精选'],['View all products →','查看全部商品 →'],['Demo prices in USD. All prices are illustrative.','价格为美元演示报价。'],
['Yiwu, China · Fictional wholesale demo','中国义乌 · 虚构批发品牌演示'],['Merchant portal','商家后台'],['WHOLESALE CATALOG','批发目录'],['Jewelry collection','饰品系列'],['Search','搜索'],['Category','分类'],['All categories','全部分类'],['Filter','筛选'],['Product name or SKU','商品名称或 SKU'],
['Earrings','耳环'],['Necklaces','项链'],['Bracelets','手链'],['Hair Accessories','发饰'],['Rings','戒指'],['Mini Gold Hoops','迷你金色圈式耳环'],
['← Back to catalog','← 返回目录'],['Illustrative USD per unit','演示单价（美元）'],['Quantity','数量'],['Add to quote list','加入询价清单'],['Designed for wholesale assortments','适合批量选品'],['Packaging options available on request','包装选项可在询价时确认'],
['REQUEST FOR QUOTATION','批量询价'],['Selected products','已选饰品'],['Update','更新'],['Remove','移除'],['Review quantity before submitting','请在提交前检查数量'],['Buyer details','采购人信息'],['Demo only. Use fictional details and an example.com, example.net, or example.org email address.','演示请使用虚构资料和 example.com、example.net 或 example.org 邮箱。'],['Buyer name','采购人姓名'],['Company','公司'],['Email','邮箱'],['Country','国家或地区'],['Message (optional)','留言（选填）'],['I am using fictional demo details.','我使用的是虚构演示资料。'],['Submit RFQ','提交询盘'],['Your quote list is empty.','询价清单为空。'],['Browse catalog','浏览商品目录'],['RFQ received','询盘已收到'],['Your demo request is ready for merchant follow-up.','商家可在后台查看并跟进本次询盘。'],['Continue browsing','继续浏览'],
['Inquiries','询盘'],['Products','商品'],['AI assistant','AI 助手'],['Storefront','饰品站'],['Merchant sign in','商家登录'],['Admin password','管理密码'],['Sign in','登录'],['Inquiry management','询盘管理'],['Sign out','退出'],['Company, email or ID','公司、邮箱或编号'],['Status','状态'],['All','全部'],['New','待跟进'],['Contacted','已联系'],['Closed','已关闭'],['Follow-up status','跟进状态'],['Update status','更新状态'],['No matching inquiries.','没有符合条件的询盘。'],['Product management','商品管理'],['Add product','新增商品'],['Edit →','编辑 →'],['Reset demo data','重置演示数据'],['Delete all inquiries and product edits and restore the six sample products.','删除全部询盘和商品修改，恢复 6 个示例商品。'],['Confirm reset','确认重置'],['Edit product','编辑商品'],['Chinese name','中文名称'],['English title','英文标题'],['Specifications','规格'],['English benefits (one per line)','英文卖点（每行一条）'],['English description','英文描述'],['Chinese description','中文描述'],['Chinese benefits (one per line)','中文卖点（每行一条）'],['SEO title','SEO 标题'],['SEO description','SEO 描述'],['Price tiers (quantity:price, comma separated, starting at MOQ)','阶梯价（数量:单价，用逗号分隔；首档等于 MOQ）'],['Demo image','演示图片'],['Save and publish','保存并上架'],['Save draft / unpublish','保存为草稿 / 下架'],['PRODUCT CONTENT','商品内容'],['AI product content assistant','AI 商品内容助手'],['Apply content to','生成结果用于'],['New product','新商品'],['Chinese product name','中文商品名称'],['Chinese product facts, materials and uses','中文规格、材质、用途等已知资料'],['Generate English content','生成英文内容'],['Offline demo · English templates','离线模拟 · 使用预设英文模板'],['Live AI API','实时 AI API'],
['Review the products and quantities in your quote list.','请检查清单内的商品和数量。'],['Enter a buyer name, company, and country with at most 100 characters each.','请填写采购人、公司和国家，每项最多 100 字。'],['Use a fictional email address at example.com, example.net, or example.org.','请使用 example.com、example.net 或 example.org 演示邮箱。'],['Confirm fictional details and keep your message under 1,000 characters.','请确认使用虚构资料，留言限 1000 字。'],['This product is unavailable.','该商品已下架。'],['The quote list supports up to 20 products.','每份清单最多可添加 20 款商品。'],['Sign-in failed. Check the password.','登录失败。请检查管理密码。'],['Configure ADMIN_PASSWORD on the server.','请在服务端配置 ADMIN_PASSWORD。'],['Provide a Chinese product name and valid details.','请提供中文品名和有效资料。'],['Generation failed. Check the server API endpoint, model and credentials.','生成失败。请检查服务端 API 地址、模型和凭据后重试。'],['Use a unique SKU of up to 32 letters, digits or hyphens.','请输入唯一 SKU（字母、数字或连字符，最多 32 位）。'],['Check the required fields, category and image.','请检查必填字段、分类和图片。'],['Start tiers at MOQ, increase quantities and use positive, non-increasing prices.','首档数量必须等于 MOQ，各档数量递增、单价为正且不递增。']
];
const original=new WeakMap();
const button=document.querySelector('#language');
function apply(lang){
  const zh=lang==='zh';
  const lookup=new Map(labels.map(([en,cn])=>zh?[en,cn]:[cn,en]));
  function translate(text){
    if(lookup.has(text)) return lookup.get(text);
    if(zh) return text.replace(/^◈\s+(.+)$/,(_,s)=>'◈　'+(lookup.get(s)||s))
      .replace(/^MOQ (\d+)$/,'起订量 $1').replace(/^From (\$.*)$/,'$1 起')
      .replace(/^(\d+) products · Illustrative prices in USD$/,'$1 款饰品 · 美元演示价')
      .replace(/^(\d+)\+ units$/,'$1 件起').replace(' / unit · demo',' / 件 · 演示价')
      .replace(/^Enter a whole quantity from (\d+) to 1,000,000\.$/,'请输入 $1 至 1,000,000 之间的整数。');
    return text.replace(/ · 已上架$/,' · Published').replace(/ · 草稿 \/ 下架$/,' · Draft').replace(' / 件（演示）',' / unit (demo)').replace('离线模拟 · 使用预设英文模板。请核对内容后保存或发布。','Offline template. Review before saving or publishing.').replace('实时 AI API。请核对内容后保存或发布。','Live AI. Review before saving or publishing.');
  }
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node;
  while(node=walker.nextNode()){
    if(node.parentElement.closest('script,textarea,#language,[data-zh]')) continue;
    if(!original.has(node)) original.set(node,node.data);
    node.data=original.get(node).replace(/\S[\s\S]*\S|\S/,translate);
  }
  document.querySelectorAll('[data-zh]').forEach(el=>{if(!original.has(el))original.set(el,el.textContent);el.textContent=zh?el.dataset.zh:original.get(el);});
  document.querySelectorAll('[placeholder]').forEach(el=>{if(!original.has(el))original.set(el,el.placeholder);el.placeholder=translate(original.get(el));});
  document.documentElement.lang=zh?'zh-CN':'en';
  button.textContent=zh?'English':'中文';
  button.lang=zh?'en':'zh-CN';
}
apply(localStorage.getItem('luma-language')||'en');
button.addEventListener('click',()=>{const lang=document.documentElement.lang==='en'?'zh':'en';localStorage.setItem('luma-language',lang);apply(lang);});
