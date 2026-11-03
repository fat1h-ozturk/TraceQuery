import {useRef,useState} from 'react';
import {RecordValues, FilterChecks, SchemaDetails, showValue as show} from './Details';
import type {Table, Outcome, FilterCheck} from './Details';

type Source=Record<string,number>;
type Row={values:unknown[];sources:Source;checks?:FilterCheck[]};
type Grid={columns:string[];rows:Row[];count:number;label?:string;detail?:string};
type Database={id:string;name:string;tables:Table[];demo_sql:string};
type Explanation={sql:string;stages:Grid[];result:Grid;excluded:{sources:Source;reason:string;condition:string;checks:FilterCheck[]}[];outcomes:Outcome[];notice:string};
type Page={columns:string[];rows:unknown[][];has_more:boolean;offset:number};
async function api<T>(path:string,options?:RequestInit):Promise<T>{
 const response=await fetch('/api'+path,options);
 const body=await response.json();
 if(!response.ok)throw new Error(typeof body.detail==='string'?body.detail:'İstek tamamlanamadı. Girdileri kontrol edin.');
 return body;
}
function DataGrid({grid,selected,onSelect}:{grid:Grid;selected:number;onSelect:(n:number)=>void}){
 return <div className="table-scroll"><table aria-label={grid.label??"Sorgu sonucu"}><thead><tr><th className="row-number">#</th>{grid.columns.map((c,i)=><th key={i}>{c}</th>)}</tr></thead><tbody>{grid.rows.map((row,i)=><tr key={i} className={selected===i?'selected':''}><td className="row-number"><button aria-label={`${i+1}. satırın kaynaklarını göster`} onClick={()=>onSelect(i)}>{i+1} ↗</button></td>{row.values.map((v,j)=><td key={j}>{show(v)}</td>)}</tr>)}</tbody></table>{!grid.rows.length&&<div className="empty">Bu aşamada kayıt yok. Kaynak izlerinden elenme noktasını inceleyebilirsin.</div>}</div>
}
export default function App(){
 const [db,setDb]=useState<Database|null>(null),[sql,setSql]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[analysis,setAnalysis]=useState<Explanation|null>(null);
 const [stage,setStage]=useState(-1),[selected,setSelected]=useState(-1),[tab,setTab]=useState('sonuc');
 const [table,setTable]=useState(''),[page,setPage]=useState<Page|null>(null),[focus,setFocus]=useState<Outcome|null>(null);
 const file=useRef<HTMLInputElement>(null);
 const queryController=useRef<AbortController|null>(null);
 async function action(fn:()=>Promise<void>){setError('');setBusy(true);try{await fn()}catch(e){setError(e instanceof DOMException&&e.name==='AbortError'?'İşlem iptal edildi. Önceki başarılı sonuçlar korundu.':e instanceof Error?e.message:'İşlem tamamlanamadı.')}finally{setBusy(false)}}
 function opened(next:Database){setDb(next);setSql(next.demo_sql);setAnalysis(null);setPage(null);setTable('');setSelected(-1);setFocus(null);setTab('sonuc')}
 async function runQuery(){
  if(!db||busy)return;
  const controller=new AbortController();
  queryController.current=controller;
  try {
   await action(async()=>{
    const result=await api<Explanation>('/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({database_id:db.id,sql}),signal:controller.signal});
    setAnalysis(result);setStage(-1);setSelected(-1);setFocus(null);setTab('sonuc');
   });
  } finally {queryController.current=null;}
 }
 async function browse(name:string,offset=0){await action(async()=>{const next=await api<Page>(`/table/${db!.id}/${encodeURIComponent(name)}?offset=${offset}`);setTable(name);setPage(next);setTab('tablo')})}
 const grid=analysis?(stage<0?analysis.result:analysis.stages[stage]):null;
 const row=grid&&selected>=0?grid.rows[selected]:null;
 return <div className="app">
  <aside className="sidebar"><a className="brand" href="/" aria-label="TraceQuery ana sayfa"><span className="brand-icon">T↗</span>TraceQuery<span className="version">α</span></a>
   <div className="workspace-label">ÇALIŞMA ALANI <span>01</span></div>
   <button className="open-db" disabled={busy} onClick={()=>file.current?.click()}>＋ SQLite dosyası aç</button>
   <input ref={file} hidden type="file" accept=".db,.sqlite,.sqlite3" onChange={e=>{const f=e.target.files?.[0];if(f)void action(async()=>{const form=new FormData();form.append('file',f);opened(await api<Database>('/databases',{method:'POST',body:form}))});e.target.value=''}}/>
   <div className="db-name"><span className="status-dot"/>{db?.name??'Bağlantı yok'}</div>
   <p className="section-caption">TABLOLAR {db&&<span>{db.tables.length}</span>}</p>
   {db?.tables.map(t=><button disabled={busy} className={'table-link '+(table===t.name?'active':'')} key={t.name} onClick={()=>void browse(t.name)}><span>▦</span>{t.name}<small>{t.columns.length}</small></button>)}
   {!db&&<p className="sidebar-hint">Bir SQLite dosyası aç veya örnek verilerle başla.</p>}
   <div className="sidebar-bottom"><span>◈ Salt okunur çalışma</span><p>Kaynak veritabanın değiştirilmez.</p><button disabled={busy} onClick={()=>void action(async()=>opened(await api<Database>('/demo',{method:'POST'})))}>Öğrenci demosunu aç ↗</button></div>
  </aside>
  <main><header><div className="breadcrumb">Çalışma alanı <span>/</span> <strong>Sorgu inceleme</strong></div><div className="local-tag"><span className="status-dot"/> SQLite · Yerel</div></header>
   <section className="intro"><div><p className="eyebrow">VERİNİN ARKASINDAKİ HİKÂYE</p><h1>Sonucun izini sür.</h1><p>Sorgunu çalıştır. Eşleşmeleri, elenen kayıtları ve her satırın kaynağını keşfet.</p></div><span className="intro-symbol" aria-hidden="true">↳</span></section>
   {error&&<div className="error" role="alert"><strong>İşlem tamamlanamadı</strong><p>{error}</p></div>}
   <section className="editor panel"><div className="panel-heading"><div><span className="code-icon">⌘</span><strong>SQL sorgusu</strong><span className="muted">SQLite</span></div><button className="subtle" disabled={!db||busy} onClick={()=>setSql(db!.demo_sql)}>Örnek sorgu</button></div>
    <label className="sr-only" htmlFor="sql">SQL sorgusu</label><textarea id="sql" spellCheck={false} value={sql} onChange={e=>setSql(e.target.value)} placeholder={'SELECT ...\nFROM ...\nWHERE ...'}/>
    <div className="editor-footer"><span>SELECT · INNER JOIN · WHERE <span className="muted">/ ilk sürüm</span></span>{busy&&queryController.current&&<button className="cancel-query" onClick={()=>queryController.current?.abort()}>İptal et</button>}<button className="primary" disabled={!db||busy||!sql.trim()} onClick={()=>void runQuery()}>{busy?'İşleniyor…':'▷ Çalıştır ve açıkla'}</button></div>
   </section>
   {!db&&<section className="welcome panel"><span>01 / BAŞLANGIÇ</span><h2>Bir sonuçtan daha fazlasını gör.</h2><p>Ali neden iki kez görünüyor? Ayşe hangi koşulda elendi?<br/>Örnek veritabanını açarak kayıtların yolculuğuna başla.</p><button className="primary" disabled={busy} onClick={()=>void action(async()=>opened(await api<Database>('/demo',{method:'POST'})))}>Örnek veritabanıyla başla ↗</button></section>}
   {db&&<div className="tabs"><button className={tab==='sonuc'?'current':''} onClick={()=>setTab('sonuc')}>Sorgu inceleme {analysis&&<span>{analysis.result.count}</span>}</button><button className={tab==='tablo'?'current':''} onClick={()=>{if(table)setTab('tablo');else if(db.tables[0])void browse(db.tables[0].name)}}>Kaynak tablolar</button></div>}
   {db&&tab==='tablo'&&page&&<section className="panel"><div className="panel-heading"><strong>{table}</strong><span className="muted">Sayfa başlangıcı: {page.offset}</span></div>{db.tables.find(t=>t.name===table)&&<SchemaDetails table={db.tables.find(t=>t.name===table)!}/>}<div className="table-scroll"><table><thead><tr>{page.columns.map((c,i)=><th key={i}>{c}</th>)}</tr></thead><tbody>{page.rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{show(v)}</td>)}</tr>)}</tbody></table></div><div className="pagination"><button disabled={busy||page.offset===0} onClick={()=>void browse(table,Math.max(0,page.offset-100))}>← Önceki</button><span>{page.rows.length} kayıt gösteriliyor</span><button disabled={busy||!page.has_more} onClick={()=>void browse(table,page.offset+100)}>Sonraki →</button></div></section>}
   {db&&tab==='sonuc'&&!analysis&&<div className="empty panel">Sorguyu çalıştırdığında sonuçlar ve açıklama aşamaları burada görünecek.</div>}
   {tab==='sonuc'&&analysis&&grid&&<>
    <p className="footnote">Son başarılı çalıştırmanın sonuçları gösteriliyor. SQL değişikliklerini uygulamak için tekrar çalıştır.</p><div className="stage-flow">{analysis.stages.map((s,i)=><button key={i} className={stage===i?'chosen':''} onClick={()=>{setStage(i);setSelected(-1)}}><span className="step-index">{String(i+1).padStart(2,'0')}</span><strong>{s.label}</strong><small>{s.count} satır</small></button>)}<button className={stage===-1?'chosen':''} onClick={()=>{setStage(-1);setSelected(-1)}}><span className="step-index">↗</span><strong>Sonuç</strong><small>{analysis.result.count} satır</small></button></div>
    <div className="result-layout"><section className="panel result"><div className="panel-heading"><strong>{stage<0?'Sorgu sonucu':grid.label}</strong><span className="count">{grid.count} satır</span></div>{stage>=0&&<p className="stage-detail">{grid.detail}</p>}<DataGrid grid={grid} selected={selected} onSelect={setSelected}/><p className="grid-help">↗ Satır numarasını seçerek kaynak kayıtları incele.</p></section>
     <aside className="panel provenance" aria-label="Kaynak izi"><p className="eyebrow">KAYNAK İZİ</p><h2>Bu satır nereden geldi?</h2>{row?Object.entries(row.sources).map(([alias,id])=><div className="source-card" key={alias}><span>▦ {analysis.outcomes.find(o=>o.alias===alias)?.table??alias}</span><strong>{alias} · #{id}</strong><RecordValues record={analysis.outcomes.find(o=>o.alias===alias&&o.id===id)?.record??{}}/><button onClick={()=>setFocus(analysis.outcomes.find(o=>o.alias===alias&&o.id===id)??null)}>Kaydın yolculuğu →</button></div>):<p className="muted">Bir sonuç satırı seç. Onu oluşturan kaynak kayıt kimlikleri burada görünecek.</p>}{row?.checks&&<div className="passed-filters"><h3>WHERE koşulları nasıl geçti?</h3><FilterChecks checks={row.checks}/></div>}</aside></div>
    <section className="panel traces"><div className="panel-heading"><div><strong>Kayıtların yolculuğu</strong><span className="muted">Katkılar ve elenme noktaları</span></div></div><div className="outcomes">{analysis.outcomes.map(o=><button className={(focus===o?'focused ':'')+(o.contributions?'survived':'eliminated')} key={`${o.alias}-${o.id}`} onClick={()=>setFocus(o)}><span>{o.alias} · #{o.id}{Object.values(o.record).find(v=>typeof v==='string')?` / ${Object.values(o.record).find(v=>typeof v==='string')}`:''}</span><strong>{o.contributions?`${o.contributions} sonuç`:'Sonuçta yok'}</strong></button>)}</div>{focus&&<div className="journey"><strong>{focus.table} / {focus.alias} · #{focus.id}</strong><RecordValues record={focus.record}/><div>{analysis.stages.map((s,i)=><span key={i}>{s.label}: <b>{focus.counts[i]===null?'Henüz katılmadı':focus.counts[i]}</b></span>)}</div>{analysis.excluded.filter(e=>e.sources[focus.alias]===focus.id).map((e,i)=><div className="excluded-branch" key={i}><p>{Object.entries(e.sources).map(([a,id])=>`${a}: ${id}`).join(', ')}</p><FilterChecks checks={e.checks}/></div>)}{!focus.contributions&&!analysis.excluded.some(e=>e.sources[focus.alias]===focus.id)&&<p>{focus.first_missing_stage!==null?`${analysis.stages[focus.first_missing_stage].label} aşamasında bu kaydı taşıyan eşleşme kalmadı.`:'Bu kayıt nihai sonuç üretmedi.'} Yukarıdaki eşleşme sayılarını incele.</p>}</div>}</section>
    <p className="footnote">ⓘ {analysis.notice}</p>
   </>}
   <footer>TraceQuery <span>Veriye sor, sonucun izini sür.</span><small>İlk prototip · Doğal dil desteği henüz yok</small></footer>
  </main>
 </div>
}
