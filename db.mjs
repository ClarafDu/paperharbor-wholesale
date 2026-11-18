import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const samples = [
  ['ER101','珍珠垂坠耳环','Pearl Drop Earrings','Earrings',200,1.85,'24 mm'],
  ['NK201','金色爱心项链','Heart Pendant Necklace','Necklaces',100,4.20,'42 cm + 5 cm'],
  ['BR301','粉晶串珠手链','Rose Bead Bracelet','Bracelets',300,.88,'17 cm'],
  ['HC401','雾蓝抓夹','Cloud Blue Hair Clip','Hair Accessories',300,.72,'8 cm'],
  ['RG501','银色波纹戒指','Silver Wave Ring','Rings',150,2.60,'16–19 mm'],
  ['ER102','迷你金色圈式耳环','Mini Gold Hoops','Earrings',200,2.10,'14 mm'],
];
export const slugify = name => name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function seedJewelry(db) {
    const insert = db.prepare('INSERT OR IGNORE INTO products VALUES (?,?,?)');
    for (const [index,[sku,nameZh,nameEn,category,moq,price,specifications]] of samples.entries()) {
      const slug = slugify(nameEn);
      insert.run(sku,slug,JSON.stringify({id:sku,sku,slug,nameZh,nameEn,category,moq,specifications,
        images:[`/product-${index+1}.jpg`],descriptionEn:`${nameEn} for retail assortments, boutique collections and bulk gifting. Request a quote to discuss packaging and order requirements.`,
        descriptionZh:`${nameZh}，适合精品店选品和批量采购。包装与订单细节可在询价时确认。`,benefitsZh:'适合批量选品\n包装选项可在询价时确认',benefits:'Designed for wholesale assortments\nPackaging options available on request',
        priceTiers:[{min:moq,price},{min:moq*3,price:Number((price*.85).toFixed(2))}],
        seoTitle:nameEn,seoDescription:`Explore wholesale options for ${nameEn}.`,status:'published'}));
    }
    db.exec("INSERT OR IGNORE INTO settings VALUES ('jewelry-v1')");
}
export function reset(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec("DELETE FROM inquiries; DELETE FROM products; DELETE FROM settings WHERE key LIKE 'cart:%'");
    db.prepare('INSERT INTO settings VALUES (?)').run('cart:'+randomUUID());
    db.exec("INSERT OR IGNORE INTO settings VALUES ('seeded')");
    seedJewelry(db);
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
  if (!db.prepare("SELECT 1 FROM settings WHERE key='jewelry-v1'").get()) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const remove = db.prepare("DELETE FROM products WHERE id=? AND slug=? AND json_extract(data,'$.nameEn')=?");
      for (const [id,name] of [['NB101','Studio Spiral Notebook'],['ST201','Everyday Stationery Set'],['FL301','Terra Document Folders'],['SN401','Soft Tone Sticky Notes'],['DS501','Olive Desk Organizer'],['NB102','Kraft Hardcover Journal']]) remove.run(id,slugify(name),name);
      seedJewelry(db);
      db.exec('COMMIT');
    } catch(error) { db.exec('ROLLBACK'); throw error; }
  }
  return db;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db=openDb();
  if(process.argv.includes('--reset')) reset(db);
  db.close();
  console.log('Demo database ready.');
}
