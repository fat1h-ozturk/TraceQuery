import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Örnek veritabanıyla başla'}).click();
 await expect(page.getByText('Öğrenci veritabanı',{exact:true})).toBeVisible();
});

test('actual demo shows source values, missing JOIN records and FALSE versus UNKNOWN',async({page})=>{
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
 await expect(sources.locator('.filter-check').getByText('60',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:/o · #3.*Mehmet/}).click();
 await expect(page.getByRole('heading',{name:'JOIN 1: eşleşme bulunamadı'})).toBeVisible();
 await expect(page.locator('.join-loss')).toContainText('kayitlar (k)');
 await expect(page.locator('.join-loss')).toContainText('o.id = k.ogrenci_id');
 await page.getByRole('button',{name:/o · #2.*Ayşe/}).click();
 await expect(page.locator('.filter-check').getByText('FALSE',{exact:true})).toBeVisible();
 await expect(page.locator('.filter-check').getByText('UNKNOWN',{exact:true})).toBeVisible();
 await expect(page.locator('.filter-check').getByText('45',{exact:true})).toBeVisible();
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
