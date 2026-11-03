import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

function databaseFixture(path:string,sql:string){
 execFileSync(fileURLToPath(new URL('../../.venv/bin/python',import.meta.url)),['-c',`import sqlite3,sys
with sqlite3.connect(sys.argv[1]) as db:
    db.executescript(sys.argv[2])
`,path,sql]);
}

test.beforeEach(async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Demo aç'}).click();
 await expect(page.getByText('Öğrenci veritabanı',{exact:true})).toBeVisible();
});

test('actual demo shows source values, missing JOIN records and FALSE versus UNKNOWN',async({page},testInfo)=>{
 await page.getByRole('button',{name:'Çalıştır'}).click();
 const table=page.getByRole('table',{name:'Sorgu sonucu'});
 await expect(table.getByRole('row')).toHaveCount(3);
 await table.getByRole('button',{name:'1. satırın kaynaklarını göster',exact:true}).click();
 const sources=page.getByRole('complementary',{name:'Kaynak izi'});
 await expect(sources.getByText('Ali',{exact:true})).toBeVisible();
 await expect(sources.getByText('Matematik',{exact:true})).toBeVisible();
 await expect(sources.locator('.record-values').getByText('80',{exact:true})).toBeVisible();
 await expect(sources.getByRole('heading',{name:'Filtreler'})).toBeVisible();
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
 await page.getByRole('button',{name:'Çalıştır'}).click();
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
 await page.getByRole('button',{name:'Çalıştır'}).click();
 await expect(page.getByRole('alert')).toHaveCount(0);
 await expect(page.getByRole('table',{name:'Sorgu sonucu'}).getByRole('row')).toHaveCount(1);
 await expect(page.getByText('Sonuç yok.',{exact:false})).toBeVisible();
});

test('executed SQL appears only when the editor differs from the result query',async({page})=>{
 await page.getByRole('button',{name:'Çalıştır'}).click();
 await expect(page.getByRole('table',{name:'Sorgu sonucu'}).getByRole('row')).toHaveCount(3);
 await expect(page.locator('.executed-query')).toHaveCount(0);
 const next='SELECT o.ad FROM ogrenciler o WHERE o.id > 100';
 await page.getByLabel('SQL sorgusu',{exact:true}).fill(next);
 await page.getByText('Çalıştırılan sorgu',{exact:true}).click();
 await expect(page.locator('.executed-query code')).toContainText('WHERE k.notu >= 60');
 await expect(page.getByText('Sonuçlar önceki sorguya ait.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Çalıştır'}).click();
 await expect(page.getByRole('table',{name:'Sorgu sonucu'}).getByRole('row')).toHaveCount(1);
 await expect(page.locator('.executed-query')).toHaveCount(0);
 await expect(page.getByText('Sonuçlar önceki sorguya ait.',{exact:true})).toHaveCount(0);
 await page.getByLabel('SQL sorgusu',{exact:true}).fill('SELECT o.ad FROM ogrenciler o WHERE o.id > 200');
 await page.getByText('Çalıştırılan sorgu',{exact:true}).click();
 await expect(page.locator('.executed-query code')).toContainText('WHERE o.id > 100');
 await page.getByLabel('SQL sorgusu',{exact:true}).fill(next);
 await expect(page.locator('.executed-query')).toHaveCount(0);
});

test('a real uploaded SQLite file gets a valid query and keeps its original bytes',async({page},testInfo)=>{
 const databasePath=testInfo.outputPath('inventory.db');
 databaseFixture(databasePath,`CREATE TABLE "order items/2026"(id INTEGER PRIMARY KEY, name TEXT, stock INTEGER);
 INSERT INTO "order items/2026" VALUES(1,'Notebook',8);`);
 const original=readFileSync(databasePath);
 await page.getByRole('button',{name:'Çalıştır'}).click();
 await expect(page.getByRole('table',{name:'Sorgu sonucu'}).getByRole('row')).toHaveCount(3);
 await page.locator('input[type="file"]').setInputFiles(databasePath);
 await expect(page.getByText('inventory.db',{exact:true})).toBeVisible();
 await expect(page.getByLabel('SQL sorgusu',{exact:true})).toHaveValue('SELECT * FROM "order items/2026"');
 await expect(page.getByRole('table',{name:'Sorgu sonucu'})).toHaveCount(0);
 await page.getByRole('button',{name:'Çalıştır'}).click();
 const table=page.getByRole('table',{name:'Sorgu sonucu'});
 await expect(table.getByRole('row')).toHaveCount(2);
 await expect(table.getByRole('cell',{name:'Notebook',exact:true})).toBeVisible();
 await table.getByRole('button',{name:'1. satırın kaynaklarını göster',exact:true}).click();
 await expect(page.getByRole('complementary',{name:'Kaynak izi'}).getByText('Notebook',{exact:true})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('upload-provenance.png'),fullPage:true});
 await page.locator('.sidebar').getByRole('button',{name:/order items\/2026/}).click();
 await expect(page.getByRole('table').getByRole('cell',{name:'Notebook',exact:true})).toBeVisible();
 expect(readFileSync(databasePath).equals(original)).toBe(true);
});

test('cancelling a pending query preserves its previous result and blocks table browsing',async({page})=>{
 await page.getByRole('button',{name:'Çalıştır'}).click();
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
  await page.getByRole('button',{name:'Çalıştır'}).click();
  await expect(page.getByRole('button',{name:'İptal et',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Kaynak tablolar',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'İptal et',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('iptal edildi');
  await expect(table.getByRole('row')).toHaveCount(3);
  await expect(page.getByRole('button',{name:'Çalıştır'})).toBeEnabled();
  await page.getByText('Çalıştırılan sorgu',{exact:true}).click();
  await expect(page.locator('.executed-query code')).toContainText('WHERE k.notu >= 60');
 } finally {
  release();
  await page.unrouteAll({behavior:'wait'});
 }
});

test('identical results preserve source identities and later JOIN losses stay partial',async({page},testInfo)=>{
 const path=testInfo.outputPath('partial.db');
 databaseFixture(path,`CREATE TABLE students(id INTEGER PRIMARY KEY,name TEXT);
 CREATE TABLE courses(id INTEGER PRIMARY KEY,name TEXT);
 CREATE TABLE enrollments(id INTEGER PRIMARY KEY,student_id INTEGER,course_id INTEGER,grade INTEGER);
 INSERT INTO students VALUES(1,'Ali');
 INSERT INTO courses VALUES(10,'Math');
 INSERT INTO enrollments VALUES(101,1,10,80),(102,1,99,75);`);
 await page.locator('input[type="file"]').setInputFiles(path);
 await expect(page.getByText('partial.db',{exact:true})).toBeVisible();
 await page.getByLabel('SQL sorgusu',{exact:true}).fill('SELECT s.name FROM students s JOIN enrollments e ON s.id = e.student_id WHERE e.grade >= 60');
 await page.getByRole('button',{name:'Çalıştır'}).click();
 const table=page.getByRole('table',{name:'Sorgu sonucu'});
 await expect(table.getByRole('cell',{name:'Ali',exact:true})).toHaveCount(2);
 const sources=page.getByRole('complementary',{name:'Kaynak izi'});
 const identities:string[]=[];
 for(const index of [1,2]){
  await table.getByRole('button',{name:`${index}. satırın kaynaklarını göster`,exact:true}).click();
  const enrollment=sources.locator('.source-card').filter({hasText:/e · #/});
  const identity=await enrollment.locator('strong').innerText();
  expect(identity).toMatch(/^e · #(101|102)$/);
  identities.push(identity);
  await expect(enrollment.getByText(identity.endsWith('#101')?'80':'75',{exact:true})).toBeVisible();
 }
 expect(identities.sort()).toEqual(['e · #101','e · #102']);
 await page.locator('.stage-flow').getByRole('button',{name:/JOIN 1/}).click();
 await expect(page.getByRole('table',{name:'JOIN 1',exact:true}).getByRole('row')).toHaveCount(3);
 await page.getByRole('table',{name:'JOIN 1',exact:true}).getByRole('button',{name:'1. satırın kaynaklarını göster',exact:true}).click();
 await expect(sources.getByRole('heading',{name:'Filtreler'})).toHaveCount(0);
 await page.getByLabel('SQL sorgusu',{exact:true}).fill('SELECT s.name FROM students s JOIN enrollments e ON s.id = e.student_id JOIN courses c ON c.id = e.course_id WHERE e.grade >= 60');
 await page.getByRole('button',{name:'Çalıştır'}).click();
 await expect(table.getByRole('row')).toHaveCount(2);
 const ali=page.locator('.outcomes').getByRole('button',{name:/s · #1.*Ali/});
 await expect(ali).toContainText('1 sonuç');
 await ali.click();
 await expect(page.locator('.journey .join-loss').getByRole('heading',{name:'JOIN 2: eşleşme bulunamadı'})).toBeVisible();
 await expect(page.locator('.journey .join-loss')).toContainText('e: 102');
 await expect(page.locator('.journey .join-loss')).toContainText('courses (c)');
 await page.screenshot({path:testInfo.outputPath('partial-join.png'),fullPage:true});
});

test('a table without a primary key stays browsable and explains its limitation',async({page},testInfo)=>{
 const path=testInfo.outputPath('no-key.db');
 databaseFixture(path,"CREATE TABLE notes(body TEXT); INSERT INTO notes VALUES('Readable');");
 await page.locator('input[type="file"]').setInputFiles(path);
 await expect(page.getByText('no-key.db',{exact:true})).toBeVisible();
 await expect(page.getByLabel('SQL sorgusu',{exact:true})).toHaveValue('');
 await expect(page.getByRole('button',{name:'Çalıştır'})).toBeDisabled();
 await expect(page.getByText('Kaynak izleme için INTEGER PRIMARY KEY gerekli.',{exact:false})).toBeVisible();
 await page.locator('.sidebar').getByRole('button',{name:/notes/}).click();
 await expect(page.getByRole('cell',{name:'Readable',exact:true})).toBeVisible();
 await page.getByText('Tablo yapısı',{exact:false}).click();
 await expect(page.locator('.schema-warning')).toContainText('INTEGER PRIMARY KEY gerekli');
});

test('initial workspace stays focused on opening a database',async({page})=>{
 await page.reload();
 await expect(page.getByRole('heading',{name:'Veritabanı aç',exact:true})).toBeVisible();
 await expect(page.getByLabel('SQL sorgusu',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Sonucun izini sür.',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Bir sonuçtan daha fazlasını gör.',{exact:true})).toHaveCount(0);
});
