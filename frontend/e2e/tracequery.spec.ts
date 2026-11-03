import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

test.beforeEach(async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Örnek veritabanıyla başla'}).click();
 await expect(page.getByText('Öğrenci veritabanı',{exact:true})).toBeVisible();
});

test('actual demo shows source values, missing JOIN records and FALSE versus UNKNOWN',async({page},testInfo)=>{
 await page.getByRole('button',{name:'Çalıştır ve açıkla'}).click();
 const table=page.getByRole('table',{name:'Sorgu sonucu'});
 await expect(table.getByRole('row')).toHaveCount(3);
 await table.getByRole('button',{name:'1. satırın kaynaklarını göster',exact:true}).click();
 const sources=page.getByRole('complementary',{name:'Kaynak izi'});
 await expect(sources.getByText('Ali',{exact:true})).toBeVisible();
 await expect(sources.getByText('Matematik',{exact:true})).toBeVisible();
 await expect(sources.locator('.record-values').getByText('80',{exact:true})).toBeVisible();
 await expect(sources.getByRole('heading',{name:'WHERE koşulları nasıl geçti?'})).toBeVisible();
 await expect(sources.locator('.filter-check').getByText('TRUE',{exact:true})).toBeVisible();
 await expect(sources.locator('.filter-check').getByText('80',{exact:true})).toBeVisible();
 await expect(sources.locator('.filter-check').getByRole('definition').filter({hasText:/^60$/})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('demo-provenance.png'),fullPage:true});
 await page.getByRole('button',{name:/o · #3.*Mehmet/}).click();
 await expect(page.getByRole('heading',{name:'JOIN 1: eşleşme bulunamadı'})).toBeVisible();
 await expect(page.locator('.join-loss')).toContainText('kayitlar (k)');
 await expect(page.locator('.join-loss')).toContainText('o.id = k.ogrenci_id');
 await page.getByRole('button',{name:/o · #2.*Ayşe/}).click();
 await expect(page.locator('.filter-check').getByText('FALSE',{exact:true})).toBeVisible();
 await expect(page.locator('.filter-check').getByText('UNKNOWN',{exact:true})).toBeVisible();
 await expect(page.locator('.filter-check').getByText('45',{exact:true})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('demo-exclusion.png'),fullPage:true});
});

test('unsupported write reports an error and leaves source students intact',async({page})=>{
 await page.getByLabel('SQL sorgusu',{exact:true}).fill('DELETE FROM ogrenciler');
 await page.getByRole('button',{name:'Çalıştır ve açıkla'}).click();
 await expect(page.getByRole('alert')).toContainText('SELECT');
 await page.getByRole('button',{name:/ogrenciler/}).click();
 await expect(page.getByText('Mehmet',{exact:true})).toBeVisible();
 await expect(page.getByText('Ayşe',{exact:true})).toBeVisible();
});

test('schema exposes real foreign keys and an empty query stays a successful explanation',async({page})=>{
 await page.getByRole('button',{name:/kayitlar/}).click();
 await page.getByText('Tablo yapısı',{exact:false}).click();
 await expect(page.locator('.foreign-keys')).toContainText('ogrenciler.id');
 await page.getByLabel('SQL sorgusu',{exact:true}).fill('SELECT o.ad FROM ogrenciler o WHERE o.id > 100');
 await page.getByRole('button',{name:'Çalıştır ve açıkla'}).click();
 await expect(page.getByRole('alert')).toHaveCount(0);
 await expect(page.getByRole('table',{name:'Sorgu sonucu'}).getByRole('row')).toHaveCount(1);
 await expect(page.getByText('Bu aşamada kayıt yok.',{exact:false})).toBeVisible();
});

test('editing SQL preserves the query attached to the last successful explanation',async({page})=>{
 await page.getByRole('button',{name:'Çalıştır ve açıkla'}).click();
 await expect(page.getByRole('table',{name:'Sorgu sonucu'}).getByRole('row')).toHaveCount(3);
 await page.getByLabel('SQL sorgusu',{exact:true}).fill('SELECT o.ad FROM ogrenciler o WHERE o.id > 100');
 await page.getByText('Son çalıştırılan sorgu',{exact:true}).click();
 await expect(page.locator('.executed-query code')).toContainText('WHERE k.notu >= 60');
 await page.getByRole('button',{name:'Çalıştır ve açıkla'}).click();
 await expect(page.locator('.executed-query code')).toContainText('WHERE o.id > 100');
 await expect(page.getByRole('table',{name:'Sorgu sonucu'}).getByRole('row')).toHaveCount(1);
});

test('a real uploaded SQLite file gets a valid query and keeps its original bytes',async({page},testInfo)=>{
 const databasePath=testInfo.outputPath('inventory.db');
 execFileSync('../.venv/bin/python',['-c',`import sqlite3,sys
with sqlite3.connect(sys.argv[1]) as db:
    db.executescript("""CREATE TABLE "order items/2026"(id INTEGER PRIMARY KEY, name TEXT, stock INTEGER);
    INSERT INTO "order items/2026" VALUES(1,'Notebook',8);""")
`,databasePath]);
 const original=readFileSync(databasePath);
 await page.getByRole('button',{name:'Çalıştır ve açıkla'}).click();
 await expect(page.getByRole('table',{name:'Sorgu sonucu'}).getByRole('row')).toHaveCount(3);
 await page.locator('input[type="file"]').setInputFiles(databasePath);
 await expect(page.getByText('inventory.db',{exact:true})).toBeVisible();
 await expect(page.getByLabel('SQL sorgusu',{exact:true})).toHaveValue('SELECT * FROM "order items/2026"');
 await expect(page.getByRole('table',{name:'Sorgu sonucu'})).toHaveCount(0);
 await page.getByRole('button',{name:'Çalıştır ve açıkla'}).click();
 const table=page.getByRole('table',{name:'Sorgu sonucu'});
 await expect(table.getByRole('row')).toHaveCount(2);
 await expect(table.getByRole('cell',{name:'Notebook',exact:true})).toBeVisible();
 await table.getByRole('button',{name:'1. satırın kaynaklarını göster',exact:true}).click();
 await expect(page.getByRole('complementary',{name:'Kaynak izi'}).getByText('Notebook',{exact:true})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('upload-provenance.png'),fullPage:true});
 await page.getByRole('button',{name:/order items\/2026/}).click();
 await expect(page.getByRole('table').getByRole('cell',{name:'Notebook',exact:true})).toBeVisible();
 expect(readFileSync(databasePath).equals(original)).toBe(true);
});

test('cancelling a pending query preserves its previous result and blocks table browsing',async({page})=>{
 await page.getByRole('button',{name:'Çalıştır ve açıkla'}).click();
 const table=page.getByRole('table',{name:'Sorgu sonucu'});
 await expect(table.getByRole('row')).toHaveCount(3);
 let release:()=>void=()=>{};
 const heldRequest=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/explain',async route=>{
  await heldRequest;
  // The browser may already have aborted this request after cancellation.
  await route.continue().catch(()=>{});
 });
 try {
  await page.getByLabel('SQL sorgusu',{exact:true}).fill('SELECT o.ad FROM ogrenciler o WHERE o.id > 100');
  await page.getByRole('button',{name:'Çalıştır ve açıkla'}).click();
  await expect(page.getByRole('button',{name:'İptal et',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Kaynak tablolar',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'İptal et',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('iptal edildi');
  await expect(table.getByRole('row')).toHaveCount(3);
  await expect(page.getByRole('button',{name:'Çalıştır ve açıkla'})).toBeEnabled();
  await page.getByText('Son çalıştırılan sorgu',{exact:true}).click();
  await expect(page.locator('.executed-query code')).toContainText('WHERE k.notu >= 60');
 } finally {
  release();
  await page.unrouteAll({behavior:'wait'});
 }
});
