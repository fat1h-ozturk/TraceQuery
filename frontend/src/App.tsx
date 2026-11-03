import {useRef,useState} from 'react';
import {RecordValues, FilterChecks, SchemaDetails, showValue as show} from './Details';
import type {Table, Outcome, FilterCheck} from './Details';

type Source=Record<string,number>;
type Row={values:unknown[];sources:Source;checks?:FilterCheck[]};
type Grid={columns:string[];rows:Row[];count:number;label?:string;detail?:string};
type Database={id:string;name:string;tables:Table[];demo_sql:string};
type JoinLoss={stage:number;sources:Source;condition:string;target:{table:string;alias:string}};
type Explanation={id:string;status:'complete';join_excluded:JoinLoss[];sql:string;stages:Grid[];result:Grid;excluded:{sources:Source;reason:string;condition:string;checks:FilterCheck[]}[];outcomes:Outcome[];notice:string};
type Page={columns:string[];rows:unknown[][];has_more:boolean;offset:number};

async function api<T>(path:string,options?:RequestInit):Promise<T>{
 const response=await fetch('/api'+path,options);
 const body=await response.json();
 if(!response.ok)throw new Error(typeof body.detail==='string'?body.detail:'İstek tamamlanamadı.');
 return body;
}

function DataGrid({grid,selected,onSelect}:{grid:Grid;selected:number;onSelect:(n:number)=>void}){
 return <div className="table-scroll">
  <table aria-label={grid.label??'Sorgu sonucu'}>
   <thead><tr><th className="row-number">#</th>{grid.columns.map((c,i)=><th key={i}>{c}</th>)}</tr></thead>
   <tbody>{grid.rows.map((row,i)=><tr key={i} className={selected===i?'selected':''} aria-selected={selected===i} onClick={()=>onSelect(i)}>
    <td className="row-number"><button aria-label={`${i+1}. satırın kaynaklarını göster`}>{i+1}</button></td>
    {row.values.map((value,j)=><td key={j}>{show(value)}</td>)}
   </tr>)}</tbody>
  </table>
  {!grid.rows.length&&<div className="empty">Sonuç yok.</div>}
 </div>;
}

function DatabaseIcon(){
 return <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
  <ellipse cx="12" cy="5" rx="8" ry="3"/>
  <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>
 </svg>;
}

export default function App(){
 const [db,setDb]=useState<Database|null>(null),[sql,setSql]=useState('');
 const [executedSql,setExecutedSql]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[analysis,setAnalysis]=useState<Explanation|null>(null);
 const [stage,setStage]=useState(-1),[selected,setSelected]=useState(-1),[tab,setTab]=useState('sonuc');
 const [table,setTable]=useState(''),[page,setPage]=useState<Page|null>(null),[focus,setFocus]=useState<Outcome|null>(null);
 const file=useRef<HTMLInputElement>(null);
 const queryController=useRef<AbortController|null>(null);
 const actionPending=useRef(false);

 async function action(fn:()=>Promise<void>){
  if(actionPending.current)return;
  actionPending.current=true;
  setError('');setBusy(true);
  try{await fn()}catch(e){setError(e instanceof DOMException&&e.name==='AbortError'?'İşlem iptal edildi. Önceki sonuç korundu.':e instanceof Error?e.message:'İşlem tamamlanamadı.')}
  finally{actionPending.current=false;setBusy(false)}
 }

 function opened(next:Database){
  setDb(next);setSql(next.demo_sql);setExecutedSql('');setAnalysis(null);
  setPage(null);setTable('');setSelected(-1);setFocus(null);setTab('sonuc');
 }

 async function openDemo(){await action(async()=>opened(await api<Database>('/demo',{method:'POST'})))}

 async function runQuery(){
  if(!db)return;
  await action(async()=>{
   const controller=new AbortController();
   queryController.current=controller;
   try {
    const result=await api<Explanation>('/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({database_id:db.id,sql}),signal:controller.signal});
    setAnalysis(result);setExecutedSql(sql);setStage(-1);setSelected(-1);setFocus(null);setTab('sonuc');
   } finally {queryController.current=null;}
  });
 }

 async function browse(name:string,offset=0){
  await action(async()=>{
   const next=await api<Page>(`/table/${db!.id}?table=${encodeURIComponent(name)}&offset=${offset}`);
   setTable(name);setPage(next);setTab('tablo');
  });
 }

 const grid=analysis?(stage<0?analysis.result:analysis.stages[stage]):null;
 const row=grid&&selected>=0?grid.rows[selected]:null;
 const lostJoins=focus?analysis?.join_excluded.filter(branch=>branch.sources[focus.alias]===focus.id)??[]:[];

 return <div className="app">
  <aside className="sidebar" aria-label="Veritabanı">
   <a className="brand" href="/" aria-label="TraceQuery ana sayfa"><span className="brand-mark">T</span>TraceQuery</a>
   <button className="open-db" disabled={busy} onClick={()=>file.current?.click()}><span aria-hidden="true">+</span> Dosya aç</button>
   <input ref={file} hidden type="file" accept=".db,.sqlite,.sqlite3" onChange={e=>{
    const upload=e.target.files?.[0];
    if(upload)void action(async()=>{const form=new FormData();form.append('file',upload);opened(await api<Database>('/databases',{method:'POST',body:form}))});
    e.target.value='';
   }}/>
   {db&&<>
    <div className="db-name" title={db.name}>{db.name}</div>
    <div className="section-caption">Tablolar <span>{db.tables.length}</span></div>
    {db.tables.map(item=><button disabled={busy} className={'table-link '+(table===item.name?'active':'')} key={item.name} onClick={()=>void browse(item.name)}>{item.name}</button>)}
    {!db.tables.length&&<p className="sidebar-hint">Tablo yok.</p>}
    <div className="sidebar-bottom"><button className="subtle" disabled={busy} onClick={()=>void openDemo()}>Demo aç</button></div>
   </>}
  </aside>

  <main>
   <header><h1>{db?'SQL':'Çalışma alanı'}</h1><span className="readonly">SQLite · Salt okunur</span></header>
   <div className="workspace">
    {error&&<div className="error" role="alert">{error}</div>}
    {!db?<section className="empty-workspace">
     <DatabaseIcon/>
     <h2>Veritabanı aç</h2>
     <div className="empty-actions">
      <button className="primary" disabled={busy} onClick={()=>file.current?.click()}>Dosya seç</button>
      <button className="subtle" disabled={busy} onClick={()=>void openDemo()}>Demo aç</button>
     </div>
     <p>.db, .sqlite, .sqlite3</p>
    </section>:<>
     <section className="editor panel">
      <div className="panel-heading"><strong>SQL sorgusu</strong><button className="subtle" disabled={busy||!db.demo_sql} onClick={()=>setSql(db.demo_sql)}>Örnek</button></div>
      <label className="sr-only" htmlFor="sql">SQL sorgusu</label>
      <textarea id="sql" spellCheck={false} value={sql} onChange={e=>setSql(e.target.value)} placeholder="SELECT * FROM ..."/>
      <div className="editor-footer">
       {busy&&queryController.current&&<button className="subtle" onClick={()=>queryController.current?.abort()}>İptal et</button>}
       <button className="primary" disabled={busy||!sql.trim()} onClick={()=>void runQuery()}>{busy?'Çalışıyor…':'Çalıştır'}</button>
      </div>
     </section>
     {!db.demo_sql&&<p className="footnote">Kaynak izleme için INTEGER PRIMARY KEY gerekli.</p>}

     <div className="tabs">
      <button className={tab==='sonuc'?'current':''} onClick={()=>setTab('sonuc')}>Sonuçlar {analysis&&<span>{analysis.result.count}</span>}</button>
      <button disabled={busy} className={tab==='tablo'?'current':''} aria-label="Kaynak tablolar" onClick={()=>{if(table)setTab('tablo');else if(db.tables[0])void browse(db.tables[0].name)}}>Tablolar</button>
     </div>

     {tab==='tablo'&&page&&<section className="panel">
      <div className="panel-heading"><strong>{table}</strong><span className="muted">{page.rows.length?`${page.offset+1}–${page.offset+page.rows.length}`:'0 satır'}</span></div>
      {db.tables.find(item=>item.name===table)&&<SchemaDetails table={db.tables.find(item=>item.name===table)!}/>}
      <div className="table-scroll"><table><thead><tr>{page.columns.map((column,i)=><th key={i}>{column}</th>)}</tr></thead>
       <tbody>{page.rows.map((values,i)=><tr key={i}>{values.map((value,j)=><td key={j}>{show(value)}</td>)}</tr>)}</tbody>
      </table></div>
      <div className="pagination">
       <button className="subtle" disabled={busy||page.offset===0} onClick={()=>void browse(table,Math.max(0,page.offset-100))}>Önceki</button>
       <span>{page.rows.length} satır</span>
       <button className="subtle" disabled={busy||!page.has_more} onClick={()=>void browse(table,page.offset+100)}>Sonraki</button>
      </div>
     </section>}

     {tab==='sonuc'&&!analysis&&<div className="empty">Sorgu çalıştırılmadı.</div>}
     {tab==='sonuc'&&analysis&&grid&&<>
      {sql!==executedSql&&<p className="draft-note">Sonuçlar önceki sorguya ait.</p>}
      <details className="executed-query"><summary>Çalıştırılan sorgu</summary><pre><code>{analysis.sql}</code></pre></details>
      <div className="stage-flow">
       {analysis.stages.map((item,i)=><button key={i} className={stage===i?'chosen':''} onClick={()=>{setStage(i);setSelected(-1)}}><strong>{item.label}</strong><small>{item.count}</small></button>)}
       <button className={stage===-1?'chosen':''} onClick={()=>{setStage(-1);setSelected(-1)}}><strong>Sonuç</strong><small>{analysis.result.count}</small></button>
      </div>
      <div className="result-layout">
       <section className="panel result">
        <div className="panel-heading"><strong>{stage<0?'Sorgu sonucu':grid.label}</strong><span className="count">{grid.count} satır</span></div>
        {stage>=0&&<p className="stage-detail">{grid.detail}</p>}
        <DataGrid grid={grid} selected={selected} onSelect={setSelected}/>
       </section>
       <aside className="panel provenance" aria-label="Kaynak izi">
        <h2>Kaynaklar</h2>
        {row?Object.entries(row.sources).map(([alias,id])=>{
         const source=analysis.outcomes.find(item=>item.alias===alias&&item.id===id);
         return <div className="source-card" key={alias}>
          <div className="source-heading"><span>{source?.table??alias}</span><strong>{alias} · #{id}</strong></div>
          <RecordValues record={source?.record??{}}/>
          <button disabled={!source} onClick={()=>setFocus(source??null)}>Kaydı incele</button>
         </div>;
        }):<p className="muted">Bir satır seçin.</p>}
        {row?.checks&&<div className="passed-filters"><h3>Filtreler</h3><FilterChecks checks={row.checks}/></div>}
       </aside>
      </div>

      <section className="panel traces">
       <div className="panel-heading"><strong>Kayıtlar</strong><span className="count">{analysis.outcomes.length}</span></div>
       <div className="outcomes">{analysis.outcomes.map(item=><button className={(focus===item?'focused ':'')+(item.contributions?'survived':'eliminated')} key={`${item.alias}-${item.id}`} onClick={()=>setFocus(item)}>
        <span>{item.alias} · #{item.id}{Object.values(item.record).find(value=>typeof value==='string')?` / ${Object.values(item.record).find(value=>typeof value==='string')}`:''}</span>
        <strong>{item.contributions} sonuç</strong>
       </button>)}</div>
       {focus&&<div className="journey">
        <strong>{focus.table} / {focus.alias} · #{focus.id}</strong>
        <RecordValues record={focus.record}/>
        <div>{analysis.stages.map((item,i)=><span key={i}>{item.label}: <b>{focus.counts[i]===null?'—':focus.counts[i]}</b></span>)}</div>
        {lostJoins.map((branch,i)=><div className="excluded-branch join-loss" key={i}>
         <p>{Object.entries(branch.sources).map(([alias,id])=>`${alias}: ${id}`).join(', ')}</p>
         <h3>{analysis.stages[branch.stage].label}: eşleşme bulunamadı</h3>
         <code>{branch.condition}</code>
         <p>{branch.target.table} ({branch.target.alias}) tablosunda eşleşme yok.</p>
        </div>)}
        {analysis.excluded.filter(item=>item.sources[focus.alias]===focus.id).map((item,i)=><div className="excluded-branch" key={i}>
         <p>{Object.entries(item.sources).map(([alias,id])=>`${alias}: ${id}`).join(', ')}</p><FilterChecks checks={item.checks}/>
        </div>)}
        {!focus.contributions&&!lostJoins.length&&!analysis.excluded.some(item=>item.sources[focus.alias]===focus.id)&&<p>{focus.first_missing_stage!==null?`${analysis.stages[focus.first_missing_stage].label} aşamasında eşleşme kalmadı.`:'Bu kayıt sonuç üretmedi.'}</p>}
       </div>}
      </section>
      <details className="explanation-note"><summary>Açıklama hakkında</summary><p>{analysis.notice}</p></details>
     </>}
    </>}
   </div>
  </main>
 </div>;
}
