import sqlite3

DEMO_SQL = '''SELECT ogrenciler.ad, dersler.ad AS ders, kayitlar.notu
FROM ogrenciler
JOIN kayitlar ON ogrenciler.id = kayitlar.ogrenci_id
JOIN dersler ON dersler.id = kayitlar.ders_id
WHERE kayitlar.notu >= 60'''

def create_demo(path):
    db=sqlite3.connect(path)
    try:
        db.executescript('''
        CREATE TABLE ogrenciler(id INTEGER PRIMARY KEY, ad TEXT);
        CREATE TABLE dersler(id INTEGER PRIMARY KEY, ad TEXT);
        CREATE TABLE kayitlar(id INTEGER PRIMARY KEY, ogrenci_id INTEGER REFERENCES ogrenciler(id), ders_id INTEGER REFERENCES dersler(id), notu INTEGER);
        INSERT INTO ogrenciler VALUES(1,'Ali'),(2,'Ayşe'),(3,'Mehmet');
        INSERT INTO dersler VALUES(10,'Matematik'),(20,'Fizik');
        INSERT INTO kayitlar VALUES(101,1,10,80),(102,1,20,75),(103,2,10,45),(104,2,20,NULL);
        ''')
        db.commit()
    finally:
        db.close()
