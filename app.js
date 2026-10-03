/* ---- Config: paste your free Supabase project values to go live. Leave blank for demo mode. ---- */
const SUPABASE_URL = "https://ydvqryfochhebjldylpy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4-nGIn23s4MVu1Nv17tUmA__vHyeMi2";

const CATS = ["Robot arm","Mobile robot","Sensor","Controller","Electronics","Tool","3D printer","Other"];
const LIVE = !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
const sb = LIVE ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today = () => new Date().toISOString().slice(0,10);
const uid = () => crypto.randomUUID();

/* ---- Data layer: same API for localStorage demo and Supabase ---- */
const seed = () => [
 ["RB-001","UR5e collaborative arm","Robot arm","Bench 1","Available"],
 ["RB-002","TurtleBot 4 Lite","Mobile robot","Arena","CheckedOut","Aisha K.","2026-10-09"],
 ["SN-014","Intel RealSense D435i","Sensor","Cabinet B","Available"],
 ["SN-021","RPLidar A2","Sensor","Cabinet B","Maintenance"],
 ["CT-007","Jetson Orin Nano kit","Controller","Bench 2","CheckedOut","Rahul D.","2026-09-28"],
 ["PR-003","Prusa MK4","3D printer","Print room","Available"],
 ["EL-040","Bench power supply 30V","Electronics","Bench 2","Retired"]
].map(([asset_tag,name,category,location,status,assignee,due_date])=>({id:uid(),asset_tag,name,category,location,status,assignee:assignee||null,due_date:due_date||null,notes:"",created_at:new Date().toISOString()}));

const store = {
  async load(){
    if(LIVE){
      const [a,l] = await Promise.all([
        sb.from("assets").select("*").order("asset_tag"),
        sb.from("activity").select("*").order("at",{ascending:false}).limit(12)]);
      if(a.error||l.error) throw (a.error||l.error);
      return {assets:a.data, log:l.data};
    }
    let d = JSON.parse(localStorage.getItem("rleams")||"null");
    if(!d){ d={assets:seed(),log:[]}; localStorage.setItem("rleams",JSON.stringify(d)); }
    return d;
  },
  async upsert(asset, action, who){
    if(LIVE){
      const r = await sb.from("assets").upsert(asset); if(r.error) throw r.error;
      const g = await sb.from("activity").insert({asset_id:asset.id,asset_tag:asset.asset_tag,action,person:who||null}); if(g.error) throw g.error;
      return;
    }
    const d = await this.load(); const i = d.assets.findIndex(x=>x.id===asset.id);
    i<0 ? d.assets.push(asset) : d.assets[i]=asset;
    d.log.unshift({asset_tag:asset.asset_tag,action,person:who||null,at:new Date().toISOString()});
    d.log=d.log.slice(0,12); localStorage.setItem("rleams",JSON.stringify(d));
  },
  async remove(asset){
    if(LIVE){ const r = await sb.from("assets").delete().eq("id",asset.id); if(r.error) throw r.error; return; }
    const d = await this.load(); d.assets=d.assets.filter(x=>x.id!==asset.id);
    d.log.unshift({asset_tag:asset.asset_tag,action:"deleted",at:new Date().toISOString()});
    localStorage.setItem("rleams",JSON.stringify(d));
  }
};

/* ---- State & rendering ---- */
let S = {assets:[],log:[]}, editing=null, acting=null;
const label = s => s==="CheckedOut"?"Checked out":s;

function toast(m){const t=$("#toast");t.textContent=m;t.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display="none",2400)}

function render(){
  const A=S.assets, n=s=>A.filter(a=>a.status===s).length;
  const late=A.filter(a=>a.status==="CheckedOut"&&a.due_date&&a.due_date<today()).length;
  $("#stats").innerHTML=[["Total assets",A.length],["Available",n("Available")],["Checked out",n("CheckedOut")],["Overdue",late],["In maintenance",n("Maintenance")]]
    .map(([k,v])=>`<div><b>${v}</b><span>${k}</span></div>`).join("");
  const q=$("#q").value.toLowerCase(), fc=$("#fc").value, fs=$("#fs").value;
  const rows=A.filter(a=>(!fc||a.category===fc)&&(!fs||a.status===fs)&&
    [a.asset_tag,a.name,a.location,a.assignee,a.category].join(" ").toLowerCase().includes(q));
  $("#rows").innerHTML = rows.length ? rows.map(a=>{
    const over=a.status==="CheckedOut"&&a.due_date&&a.due_date<today();
    const held=a.assignee?`${esc(a.assignee)}<small class="${over?"late":""}">due ${esc(a.due_date)}${over?" · overdue":""}</small>`:"";
    const act=a.status==="CheckedOut"?`<button class="sm" data-a="in" data-id="${a.id}">Check in</button>`
      :a.status==="Available"?`<button class="sm" data-a="out" data-id="${a.id}">Check out</button>`:"";
    return `<tr><td class="tag">${esc(a.asset_tag)}</td><td>${esc(a.name)}<small>${esc(a.category)}</small></td><td>${esc(a.location)}</td>
    <td><span class="st ${a.status}">${label(a.status)}</span></td><td>${held}</td>
    <td class="act">${act}<button class="sm" data-a="edit" data-id="${a.id}">Edit</button><button class="sm" data-a="del" data-id="${a.id}" aria-label="Delete ${esc(a.asset_tag)}">Delete</button></td></tr>`}).join("")
    : `<tr><td colspan="6" class="empty">No assets match. Clear the filters or add a new asset.</td></tr>`;
  $("#log").innerHTML = S.log.length ? S.log.map(l=>`<li><time>${new Date(l.at).toLocaleString([], {dateStyle:"short",timeStyle:"short"})}</time><span><b>${esc(l.asset_tag)}</b> ${esc(l.action)}${l.person?" · "+esc(l.person):""}</span></li>`).join("")
    : `<li><span>No activity yet. Check an asset in or out to see it here.</span></li>`;
}

async function refresh(){
  try{ S=await store.load(); render(); }
  catch(e){ toast("Could not load data: "+e.message); }
}
async function run(fn,msg){ try{ await fn(); await refresh(); toast(msg); }catch(e){ toast("Failed: "+e.message); } }

/* ---- Events ---- */
const fill=(sel,opts,first)=>sel.innerHTML=(first?`<option value="">${first}</option>`:"")+opts.map(o=>`<option>${o}</option>`).join("");
fill($("#fc"),CATS,"All categories"); fill($("#aCat"),CATS);
["#q","#fc","#fs"].forEach(s=>$(s).addEventListener("input",render));
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>b.closest("dialog").close());

$("#add").onclick=()=>{editing=null;$("#fA").reset();$("#tA").textContent="Add asset";$("#dA").showModal()};
$("#fA").onsubmit=()=>{
  const prev=editing||{};
  const a={...prev,id:prev.id||uid(),asset_tag:$("#aTag").value.trim(),name:$("#aName").value.trim(),category:$("#aCat").value,
    location:$("#aLoc").value.trim(),notes:$("#aNote").value.trim(),
    status:prev.status==="CheckedOut"?"CheckedOut":$("#aSt").value,assignee:prev.assignee||null,due_date:prev.due_date||null};
  if(!prev.id) a.created_at=new Date().toISOString();
  run(()=>store.upsert(a,prev.id?"updated":"added"),"Asset saved");
};
$("#fC").onsubmit=()=>{
  const who=$("#cWho").value.trim();
  run(()=>store.upsert({...acting,status:"CheckedOut",assignee:who,due_date:$("#cDue").value},"checked out",who),"Checked out");
};
$("#rows").onclick=e=>{
  const b=e.target.closest("button"); if(!b) return;
  const a=S.assets.find(x=>x.id===b.dataset.id); if(!a) return;
  if(b.dataset.a==="edit"){editing=a;$("#tA").textContent="Edit asset";
    $("#aTag").value=a.asset_tag;$("#aName").value=a.name;$("#aCat").value=a.category;$("#aLoc").value=a.location||"";
    $("#aNote").value=a.notes||"";$("#aSt").value=a.status==="CheckedOut"?"Available":a.status;$("#aSt").disabled=a.status==="CheckedOut";$("#dA").showModal();}
  if(b.dataset.a==="out"){acting=a;$("#fC").reset();$("#tC").textContent="Check out "+a.asset_tag;
    const d=new Date();d.setDate(d.getDate()+7);$("#cDue").value=d.toISOString().slice(0,10);$("#dC").showModal();}
  if(b.dataset.a==="in") run(()=>store.upsert({...a,status:"Available",assignee:null,due_date:null},"checked in",a.assignee),"Checked in");
  if(b.dataset.a==="del" && confirm(`Delete ${a.asset_tag}? This cannot be undone.`)) run(()=>store.remove(a),"Asset deleted");
};
$("#dA").addEventListener("close",()=>$("#aSt").disabled=false);
$("#exp").onclick=()=>{
  const h=["asset_tag","name","category","location","status","assignee","due_date"];
  const csv=[h.join(",")].concat(S.assets.map(a=>h.map(k=>`"${String(a[k]??"").replace(/"/g,'""')}"`).join(","))).join("\n");
  const l=document.createElement("a");l.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));l.download="rleams-assets.csv";l.click();
};

if(LIVE){const m=$("#mode");m.textContent="live · Supabase";m.classList.add("live")}
refresh();
