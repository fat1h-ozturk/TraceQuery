export type Source = Record<string, number>;
export type FilterCheck = {condition:string; truth:'TRUE'|'FALSE'|'UNKNOWN'; operands:string[]; values:unknown[]};
export type Outcome = {table:string; alias:string; id:number; counts:(number|null)[]; contributions:number; record:Record<string,unknown>; first_missing_stage:number|null};
export type Table = {name:string; primary_key:string|null; columns:{name:string;type:string;pk:boolean;nullable:boolean}[]; foreign_keys:{id:number;sequence:number;table:string;column:string;target_column:string|null}[]};
export const showValue=(value:unknown)=>value===null?<span className="null">NULL</span>:String(value);

export function RecordValues({record}:{record:Record<string,unknown>}){
 return <dl className="record-values">{Object.entries(record).map(([name,value])=><div key={name}><dt>{name}</dt><dd>{showValue(value)}</dd></div>)}</dl>;
}

export function FilterChecks({checks}:{checks:FilterCheck[]}){
 return <div className="filter-checks">{checks.map((check,i)=><div className={'filter-check truth-'+check.truth.toLowerCase()} key={i}>
  <code>{check.condition}</code><strong>{check.truth}</strong>
  <dl>{check.operands.map((operand,j)=><div key={j}><dt>{operand}</dt><dd>{showValue(check.values[j])}</dd></div>)}</dl>
  {check.truth==='UNKNOWN'&&<p>NULL karşılaştırması; bu kayıt filtreyi geçmez.</p>}
 </div>)}</div>;
}

export function SchemaDetails({table}:{table:Table}){
 return <details className="schema-details"><summary>Tablo yapısı · {table.columns.length} sütun</summary>
  {!table.primary_key&&<p className="schema-warning">Bu tablo yalnızca görüntülenebilir: INTEGER PRIMARY KEY gerekli.</p>}
  <div className="schema-columns">{table.columns.map(column=><div key={column.name}>
   <strong>{column.name}</strong><code>{column.type||'Tür belirtilmemiş'}</code>
   {column.pk&&<span className="schema-key">PRIMARY KEY</span>}
   <small>{column.nullable?'NULL olabilir':'NOT NULL'}</small>
  </div>)}</div>
  {table.foreign_keys.length>0&&<div className="foreign-keys"><strong>Tanımlı ilişkiler</strong>{table.foreign_keys.map((key,i)=><p key={i}><code>{key.column}</code> → <code>{key.table}.{key.target_column??'(birincil anahtar)'}</code></p>)}</div>}
 </details>;
}
