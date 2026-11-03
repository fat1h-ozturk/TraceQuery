import sqlite3

DEMO_SQL = '''SELECT o.ad, d.ad AS ders, k.notu
FROM ogrenciler o
JOIN kayitlar k ON o.id = k.ogrenci_id
JOIN dersler d ON d.id = k.ders_id
WHERE k.notu >= 60'''

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
