const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const STORAGE="etec-gallery-works-v1";
const defaults=[
 {id:"01",title:"Arquitetura do aprender",description:"Geometrias, corredores e pequenos momentos da rotina escolar.",author:"ETEC Lauro Gomes",src:"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#111"/><path d="M80 510L450 90l370 420" fill="none" stroke="#eee" stroke-width="2"/><circle cx="450" cy="300" r="120" fill="none" stroke="#777"/><path d="M450 90v420M80 510h740" stroke="#555"/><text x="450" y="560" text-anchor="middle" fill="#aaa" font-family="Arial" font-size="18">ETEC / 01</text></svg>')},
 {id:"02",title:"Entre matéria e código",description:"Uma interpretação visual da mistura entre tecnologia e criação.",author:"Semana da ETEC",src:"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#e9e9e9"/><rect x="130" y="110" width="640" height="380" fill="#0b0b0b"/><path d="M210 400L330 210l120 150 90-110 150 150" fill="none" stroke="white" stroke-width="8"/><circle cx="330" cy="210" r="35" fill="none" stroke="#999" stroke-width="4"/><text x="450" y="530" text-anchor="middle" fill="#111" font-family="Arial" font-size="18">CREATE / ITERATE / SHARE</text></svg>')},
 {id:"03",title:"Luz de corredor",description:"Fotografia experimental inspirada pela passagem entre salas.",author:"Acervo ETEC",src:"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#fafafa"/><stop offset=".5" stop-color="#333"/><stop offset="1" stop-color="#050505"/></linearGradient></defs><rect width="900" height="600" fill="url(#g)"/><path d="M0 520L390 260 900 520M0 80L390 260 900 80M390 260v260" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/><circle cx="390" cy="260" r="8" fill="white"/></svg>')}
];
let works=loadWorks(), currentTool="brush",drawing=false,start=null,last=null,history=[],redoStack=[];
const canvas=$("#paintCanvas"),ctx=canvas.getContext("2d"),placeholder=$("#canvasPlaceholder");
function loadWorks(){try{return [...defaults,...JSON.parse(localStorage.getItem(STORAGE)||"[]")]}catch{return defaults}}
function saveWorks(){localStorage.setItem(STORAGE,JSON.stringify(works.filter(w=>!defaults.includes(w))))}
function renderGallery(){
 const grid=$("#galleryGrid"),sphere=$("#artSphere"); grid.innerHTML=""; sphere.innerHTML="";
 works.forEach((w,i)=>{
  const card=document.createElement("article");card.className="art-card";card.innerHTML=`<div class="art-thumb"><img src="${w.src}" alt="${escapeHtml(w.title)}"></div><div class="art-meta"><span>${String(i+1).padStart(2,"0")}</span><h3>${escapeHtml(w.title)}</h3><p>${escapeHtml(w.author||"Artista visitante")}</p></div>`;card.onclick=()=>openArt(w);grid.append(card);
  const node=document.createElement("button");node.className="sphere-art";node.style.setProperty("--i",i);node.innerHTML=`<img src="${w.src}" alt="${escapeHtml(w.title)}"><span>${escapeHtml(w.title)}</span>`;node.onclick=()=>openArt(w);sphere.append(node);
 });
 positionSphere();
}
function escapeHtml(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function positionSphere(){const nodes=$$(".sphere-art"),n=nodes.length;nodes.forEach((el,i)=>{const phi=Math.acos(1-2*(i+.5)/n),theta=Math.PI*(1+Math.sqrt(5))*i;el.style.setProperty("--x",(Math.cos(theta)*Math.sin(phi)).toFixed(4));el.style.setProperty("--y",(Math.cos(phi)).toFixed(4));el.style.setProperty("--z",(Math.sin(theta)*Math.sin(phi)).toFixed(4));});}
function openArt(w){$("#modalImage").src=w.src;$("#modalImage").alt=w.title;$("#modalTitle").textContent=w.title;$("#modalDescription").textContent=w.description;$("#modalAuthor").textContent=w.author?"por "+w.author:"Artista visitante";$("#artModal").classList.add("open");}
$("#modalClose").onclick=()=>$("#artModal").classList.remove("open");
$("#artModal").onclick=e=>{if(e.target.id==="artModal")e.currentTarget.classList.remove("open")};
function openStudio(){initCanvas();$("#studioOverlay").classList.add("open");$("#studioOverlay").setAttribute("aria-hidden","false")}
function closeStudio(){$("#studioOverlay").classList.remove("open");$("#studioOverlay").setAttribute("aria-hidden","true")}
$$("[data-open-studio]").forEach(b=>b.onclick=openStudio);$$("[data-close-studio]").forEach(b=>b.onclick=closeStudio);
$("#menuBtn").onclick=()=>document.body.classList.toggle("menu-open");
function resizeCanvas(){const r=canvas.getBoundingClientRect(),ratio=devicePixelRatio||1,w=1400,h=850;canvas.width=w*ratio;canvas.height=h*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.lineCap="round";ctx.lineJoin="round";ctx.fillStyle="#0b0b0b";ctx.fillRect(0,0,w,h);canvas.dataset.w=w;canvas.dataset.h=h}
function snapshot(){history.push(canvas.toDataURL());if(history.length>30)history.shift();redoStack=[]}
function restore(data){const im=new Image;im.onload=()=>{ctx.clearRect(0,0,1400,850);ctx.drawImage(im,0,0,1400,850);placeholder.classList.add("hidden")};im.src=data}
function initCanvas(){if(!canvas.dataset.ready){resizeCanvas();history=[canvas.toDataURL()];canvas.dataset.ready="1";}else if(canvas.clientWidth===0)resizeCanvas()}
window.addEventListener("resize",()=>{if($("#studioOverlay").classList.contains("open"))resizeCanvas()});
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*1400/r.width,y:(e.clientY-r.top)*850/r.height}}
function draw(e){if(!drawing)return;const p=point(e),size=+$("#sizeRange").value,alpha=+$("#opacityRange").value/100;color=$("#colorPicker").value;
ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=currentTool==="eraser"?"#0b0b0b":color;ctx.fillStyle=color;ctx.lineWidth=size;
if(currentTool==="brush"||currentTool==="eraser"){ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke()}else{restore(history[history.length-1]);ctx.beginPath();if(currentTool==="line"){ctx.moveTo(start.x,start.y);ctx.lineTo(p.x,p.y);ctx.stroke()}if(currentTool==="rect")ctx.strokeRect(start.x,start.y,p.x-start.x,p.y-start.y);if(currentTool==="circle"){const rx=p.x-start.x,ry=p.y-start.y;ctx.ellipse(start.x+rx/2,start.y+ry/2,Math.abs(rx/2),Math.abs(ry/2),0,0,Math.PI*2);ctx.stroke()}}ctx.restore();last=p;placeholder.classList.add("hidden")}
canvas.addEventListener("pointerdown",e=>{canvas.setPointerCapture(e.pointerId);drawing=true;start=last=point(e);if(currentTool!=="brush"&&currentTool!=="eraser")snapshot()});
canvas.addEventListener("pointermove",draw);
canvas.addEventListener("pointerup",()=>{if(drawing){drawing=false;if(currentTool==="brush"||currentTool==="eraser")snapshot();$("#canvasStatus").textContent="Obra em criação"}});canvas.addEventListener("pointercancel",()=>drawing=false);
$$(".tool").forEach(b=>b.onclick=()=>{$$(".tool").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentTool=b.dataset.tool});
$("#colorPicker").oninput=e=>$("#colorValue").textContent=e.target.value.toUpperCase();
$("#sizeRange").oninput=e=>$("#sizeValue").textContent=e.target.value;
$("#opacityRange").oninput=e=>$("#opacityValue").textContent=e.target.value+"%";
["#ffffff","#bdbdbd","#777777","#444444","#111111","#e7e0d2","#b6c7d9","#d8a6a6"].forEach(c=>{const b=document.createElement("button");b.className="swatch";b.style.background=c;b.title=c;b.onclick=()=>{$("#colorPicker").value=c;$("#colorValue").textContent=c.toUpperCase()};$("#swatches").append(b)});
$("#undoBtn").onclick=()=>{if(history.length>1){redoStack.push(history.pop());restore(history[history.length-1])}};
$("#redoBtn").onclick=()=>{if(redoStack.length){const x=redoStack.pop();history.push(x);restore(x)}};
$("#clearBtn").onclick=()=>{snapshot();ctx.fillStyle="#0b0b0b";ctx.fillRect(0,0,1400,850);placeholder.classList.remove("hidden")};
$("#publishBtn").onclick=()=>{if(history.length<=1){alert("Crie alguma coisa antes de publicar.");return}$("#publishModal").classList.add("open")};
$("#publishClose").onclick=()=>$("#publishModal").classList.remove("open");
$("#saveArtBtn").onclick=()=>{const title=$("#artTitle").value.trim();if(!title){$("#artTitle").focus();return}const w={id:Date.now().toString(),title,description:$("#artDescription").value.trim()||"Uma criação feita no Studio da ETEC.",author:$("#artAuthor").value.trim()||"Artista visitante",src:canvas.toDataURL("image/jpeg",.9)};works.push(w);saveWorks();renderGallery();$("#publishModal").classList.remove("open");closeStudio();$("#artTitle").value=$("#artDescription").value=$("#artAuthor").value="";location.hash="galeria";document.querySelector('[data-view="grid"]').click()};
$$(".view-btn").forEach(b=>b.onclick=()=>{$$(".view-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");const grid=$("#galleryGrid"),stage=$("#sphereStage");if(b.dataset.view==="grid"){grid.classList.add("show");stage.classList.add("hide")}else{grid.classList.remove("show");stage.classList.remove("hide")}});
let rotX=-.1,rotY=.3,drag=false,px=0,py=0;
$("#sphereStage").addEventListener("pointerdown",e=>{drag=true;px=e.clientX;py=e.clientY});
window.addEventListener("pointermove",e=>{if(!drag)return;rotY+=(e.clientX-px)*.006;rotX+=(e.clientY-py)*.006;px=e.clientX;py=e.clientY;updateSphere()});
window.addEventListener("pointerup",()=>drag=false);
function updateSphere(){const nodes=$$(".sphere-art");nodes.forEach((el)=>{let x=+el.style.getPropertyValue("--x"),y=+el.style.getPropertyValue("--y"),z=+el.style.getPropertyValue("--z");let a=Math.cos(rotY)*x-Math.sin(rotY)*z,b=Math.sin(rotY)*x+Math.cos(rotY)*z;let c=Math.cos(rotX)*y-Math.sin(rotX)*b,d=Math.sin(rotX)*y+Math.cos(rotX)*b;el.style.transform=`translate3d(${a*250}px,${c*250}px,${d*250}px) scale(${.65+d*.35})`;el.style.zIndex=Math.round((d+1)*100)}});requestAnimationFrame(updateSphere)}
function updateHero(){const s=$("#heroSphere");if(s){s.style.transform=`rotateX(${rotX*18}deg) rotateY(${rotY*18}deg)`}}
document.addEventListener("mousemove",e=>{$("#cursorGlow").style.transform=`translate(${e.clientX}px,${e.clientY}px)`});
renderGallery();updateSphere();

/* premium interaction layer */
const cursor=$("#cursorGlow");
let mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my;
if(cursor){document.addEventListener("pointermove",e=>{mx=e.clientX;my=e.clientY});(function tick(){cx+=(mx-cx)*.18;cy+=(my-cy)*.18;cursor.style.left=cx+"px";cursor.style.top=cy+"px";requestAnimationFrame(tick)})()}
$$("a,button,.art-card,.sphere-art,.swatch").forEach(el=>{el.addEventListener("mouseenter",()=>document.body.classList.add("cursor-hover"));el.addEventListener("mouseleave",()=>document.body.classList.remove("cursor-hover"))});
const hero=$(".hero"),orbit=$(".hero-orbit");
hero?.addEventListener("pointermove",e=>{if(innerWidth<850)return;const r=hero.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;orbit.style.transform=`translate3d(${x*18}px,${y*18}px,0) rotateX(${-y*3}deg) rotateY(${x*3}deg)`});
hero?.addEventListener("pointerleave",()=>{orbit.style.transform=""});
const revealTargets=$$(".intro-strip,.gallery-section .section-heading,.sphere-stage,.artist-banner,.about-section,.site-footer,.art-card");
revealTargets.forEach(el=>el.classList.add("reveal"));
const revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");revealObserver.unobserve(e.target)}}),{threshold:.08});
revealTargets.forEach(el=>revealObserver.observe(el));
const title=$("#heroSphere");
if(title){let t=0;window.addEventListener("scroll",()=>{t=scrollY*.06;title.style.transform=`rotateX(${Math.sin(t)*4}deg) rotateY(${t}deg)`},{passive:true})}
let sphereVelocity=.002;
const stage=$("#sphereStage");
stage?.addEventListener("wheel",e=>{if(innerWidth>850){e.preventDefault();rotY+=e.deltaY*.001;updateSphere()}},{passive:false});
stage?.addEventListener("dblclick",()=>{rotX=-.1;rotY=.3});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeStudio();$("#artModal")?.classList.remove("open");$("#publishModal")?.classList.remove("open")}});
