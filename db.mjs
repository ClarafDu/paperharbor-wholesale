import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const samples = [
  ['NB101','橄榄绿线圈笔记本','Studio Spiral Notebook','Notebooks',200,1.85,'A5 · 80 sheets'],
  ['ST201','桌面文具礼盒','Everyday Stationery Set','Stationery Sets',100,4.20,'5-piece set'],
  ['FL301','大地色文件夹','Terra Document Folders','Folders',300,.88,'A4 · 3 colors'],
  ['SN401','暖色便签套装','Soft Tone Sticky Notes','Sticky Notes',300,.72,'76 × 76 mm · 4 pads'],
  ['DS501','橄榄绿桌面笔筒','Olive Desk Organizer','Office Supplies',150,2.60,'Steel · 10 cm'],
  ['NB102','牛皮纸精装笔记本','Kraft Hardcover Journal','Notebooks',200,2.10,'A5 · 96 sheets'],
];
export const slugify = name => name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function reset(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec("DELETE FROM inquiries; DELETE FROM products; DELETE FROM settings WHERE key LIKE 'cart:%'");
    db.prepare('INSERT INTO settings VALUES (?)').run('cart:'+randomUUID());
    db.exec("INSERT OR IGNORE INTO settings VALUES ('seeded')");
    const insert = db.prepare('INSERT INTO products VALUES (?,?,?)');
    for (const [index,[sku,nameZh,nameEn,category,moq,price,specifications]] of samples.entries()) {
      const slug = slugify(nameEn);
      insert.run(sku,slug,JSON.stringify({id:sku,sku,slug,nameZh,nameEn,category,moq,specifications,
        images:[`/product-${index+1}.jpg`],descriptionEn:`${nameEn} for retail assortments, office supply programs and bulk gifting. Request a quote to discuss packaging and order requirements.`,
        benefits:'Designed for wholesale assortments\nPackaging options available on request',
        priceTiers:[{min:moq,price},{min:moq*3,price:Number((price*.85).toFixed(2))}],
        seoTitle:nameEn,seoDescription:`Explore wholesale options for ${nameEn}.`,status:'published'}));
    }
    db.exec('COMMIT');
  } catch(error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
export function openDb(path = process.env.DB_PATH || 'data/demo.sqlite') {
  if (path !== ':memory:') mkdirSync(dirname(path),{recursive:true});
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY);`);
  if (!db.prepare("SELECT 1 FROM settings WHERE key='seeded'").get()) {
    reset(db);
  }
  return db;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db=openDb();
  if(process.argv.includes('--reset')) reset(db);
  db.close();
  console.log('Demo database ready.');
}
