const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const STORAGE="etec-gallery-works-v2";
const svg=(body,bg="#111")=>"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="'+bg+'"/>'+body+'</svg>');
const defaults=[
{id:"01",title:"Arquitetura do aprender",description:"Geometrias, corredores e pequenos momentos da rotina escolar.",author:"ETEC Lauro Gomes",src:svg('<path d="M80 510L450 90l370 420M450 90v420M80 510h740" fill="none" stroke="#eee" stroke-width="3"/><circle cx="450" cy="300" r="120" fill="none" stroke="#777"/><text x="450" y="560" text-anchor="middle" fill="#aaa" font-size="18">ETEC / 01</text>')},
{id:"02",title:"Entre matéria e código",description:"Uma interpretação visual da mistura entre tecnologia e criação.",author:"Semana da ETEC",src:svg('<rect x="130" y="110" width="640" height="380" fill="#090909"/><path d="M210 400L330 210l120 150 90-110 150 150" fill="none" stroke="white" stroke-width="8"/><circle cx="330" cy="210" r="35" fill="none" stroke="#999" stroke-width="4"/><text x="450" y="530" text-anchor="middle" fill="#111" font-size="18">CREATE / ITERATE / SHARE</text>','#e9e9e9')},
{id:"03",title:"Luz de corredor",description:"Fotografia experimental inspirada pela passagem entre salas.",author:"Acervo ETEC",src:svg('<defs><linearGradient id="g"><stop stop-color="#fafafa"/><stop offset=".5" stop-color="#333"/><stop offset="1" stop-color="#050505"/></linearGradient></defs><rect width="900" height="600" fill="url(#g)"/><path d="M0 520L390 260 900 520M0 80L390 260 900 80M390 260v260" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/><circle cx="390" cy="260" r="8" fill="white"/>')}
];
let works=loadWorks();
function loadWorks(){try{return [...defaults,...JSON.parse(localStorage.getItem(STORAGE)||"[]")]}catch{return defaults}}
function saveWorks(){localStorage.setItem(STORAGE,JSON.stringify(works.slice(defaults.length)))}
function esc(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

let scene3D=null, worldGroup=null, camera3D=null, renderer3D=null, raycaster=null, pointer3D=new (window.THREE?.Vector2||class{})(), cards=[], dragging=false, lastX=0,lastY=0,rotX=-.12,rotY=.25,velX=0,velY=0,downX=0,downY=0;
async function initThree(){
 if(scene3D)return;
 const THREE=await import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js");
 const host=$("#threeGallery"); if(!host)return;
 scene3D={THREE};
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x050505);scene.fog=new THREE.FogExp2(0x050505,.0016);
 const camera=new THREE.PerspectiveCamera(42,host.clientWidth/host.clientHeight,.1,200);camera.position.set(0,0,15);camera3D=camera;
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(host.clientWidth,host.clientHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.domElement.className="three-canvas";host.innerHTML="";host.appendChild(renderer.domElement);renderer3D=renderer;
 scene.add(new THREE.AmbientLight(0xffffff,.6));const key=new THREE.PointLight(0xffffff,75,35);key.position.set(5,7,8);scene.add(key);const rim=new THREE.PointLight(0x8090ff,45,30);rim.position.set(-8,-3,-5);scene.add(rim);
 worldGroup=new THREE.Group();scene.add(worldGroup);
 const core=new THREE.Mesh(new THREE.IcosahedronGeometry(3.35,5),new THREE.MeshPhysicalMaterial({color:0x101010,metalness:.8,roughness:.18,clearcoat:1,clearcoatRoughness:.12,emissive:0x080808}));worldGroup.add(core);
 const wire=new THREE.Mesh(new THREE.IcosahedronGeometry(3.42,2),new THREE.MeshBasicMaterial({color:0x444444,wireframe:true,transparent:true,opacity:.2}));worldGroup.add(wire);
 [4.1,4.7,5.35].forEach((r,i)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.006,8,160),new THREE.MeshBasicMaterial({color:0x777777,transparent:true,opacity:.18}));ring.rotation.set(i*.65,i*.4,i*.9);worldGroup.add(ring)});
 const pts=new Float32Array(950*3);for(let i=0;i<950;i++){const r=7+Math.random()*5,a=Math.random()*Math.PI*2,b=Math.acos(2*Math.random()-1);pts[i*3]=r*Math.sin(b)*Math.cos(a);pts[i*3+1]=r*Math.cos(b);pts[i*3+2]=r*Math.sin(b)*Math.sin(a)}const pg=new THREE.BufferGeometry();pg.setAttribute("position",new THREE.BufferAttribute(pts,3));scene.add(new THREE.Points(pg,new THREE.PointsMaterial({color:0xffffff,size:.018,transparent:true,opacity:.5})));
 await rebuildThreeWorks();
 raycaster=new THREE.Raycaster();
 host.addEventListener("pointerdown",e=>{dragging=true;downX=lastX=e.clientX;downY=lastY=e.clientY;velX=velY=0});
 host.addEventListener("pointermove",e=>{const r=host.getBoundingClientRect();pointer3D.x=((e.clientX-r.left)/r.width)*2-1;pointer3D.y=-((e.clientY-r.top)/r.height)*2+1;if(dragging){const dx=e.clientX-lastX,dy=e.clientY-lastY;rotY+=dx*.005;rotX+=dy*.005;velY=dx*.003;velX=dy*.003;lastX=e.clientX;lastY=e.clientY}hoverThree()});
 host.addEventListener("pointerup",e=>{dragging=false;if(Math.hypot(e.clientX-downX,e.clientY-downY)<7)clickThree()});host.addEventListener("pointerleave",()=>{dragging=false});
 host.addEventListener("wheel",e=>{e.preventDefault();camera.position.z=Math.max(8,Math.min(21,camera.position.z+e.deltaY*.012))},{passive:false});
 window.addEventListener("resize",()=>{if(!renderer3D)return;camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight)});
 (function animate(){requestAnimationFrame(animate);if(!dragging){rotY+=.0009+velY*.15;rotX+=velX*.15;velX*=.92;velY*=.92}worldGroup.rotation.y=rotY;worldGroup.rotation.x=rotX;cards.forEach(c=>c.lookAt(camera.position));renderer.render(scene,camera);$("#worldCoords").textContent="X "+String(Math.round(rotX*57)).padStart(2,"0")+" · Y "+String(Math.round(rotY*57)).padStart(2,"0")+" · Z "+Math.round(camera.position.z).toString().padStart(2,"0")})()
}
async function rebuildThreeWorks(){
 if(!scene3D||!worldGroup)return;const THREE=scene3D.THREE;
 cards.forEach(c=>{worldGroup.remove(c);c.geometry.dispose();c.material.map?.dispose();c.material.dispose()});cards=[];
 works.forEach((w,i)=>{const n=works.length,phi=Math.acos(1-2*(i+.5)/n),theta=Math.PI*(1+Math.sqrt(5))*i,r=5.05;const pos=new THREE.Vector3(Math.cos(theta)*Math.sin(phi)*r,Math.cos(phi)*r,Math.sin(theta)*Math.sin(phi)*r);const tex=new THREE.TextureLoader().load(w.src);tex.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.95,1.38),mat);mesh.position.copy(pos);mesh.lookAt(camera3D.position);mesh.userData.work=w;worldGroup.add(mesh);cards.push(mesh);});
 $("#worldCount").textContent=String(works.length).padStart(2,"0")+" OBRAS";
}
function hoverThree(){if(!raycaster||!renderer3D)return;const host=$("#threeGallery");raycaster.setFromCamera(pointer3D,camera3D);const hit=raycaster.intersectObjects(cards)[0];renderer3D.domElement.style.cursor=hit?"pointer":"grab";cards.forEach(c=>c.scale.lerp(c===hit?new scene3D.THREE.Vector3(1.12,1.12,1.12):new scene3D.THREE.Vector3(1,1,1),.18))}
function clickThree(){if(!raycaster)return;raycaster.setFromCamera(pointer3D,camera3D);const hit=raycaster.intersectObjects(cards)[0];if(hit)openArt(hit.object.userData.work)}

function renderGrid(){const grid=$("#galleryGrid");grid.innerHTML="";works.forEach((w,i)=>{const card=document.createElement("article");card.className="art-card reveal";card.innerHTML='<div class="art-thumb"><img src="'+w.src+'" alt="'+esc(w.title)+'"></div><div class="art-meta"><span>'+String(i+1).padStart(2,"0")+'</span><h3>'+esc(w.title)+'</h3><p>'+esc(w.author||"Artista visitante")+"</p></div>";card.onclick=()=>openArt(w);grid.append(card)})}
function openArt(w){$("#modalImage").src=w.src;$("#modalTitle").textContent=w.title;$("#modalDescription").textContent=w.description;$("#modalAuthor").textContent="por "+(w.author||"Artista visitante");$("#artModal").classList.add("open")}
function closeModals(){$("#artModal").classList.remove("open");$("#publishModal").classList.remove("open")}
$("#modalClose").onclick=()=>$("#artModal").classList.remove("open");$("#artModal").onclick=e=>{if(e.target===e.currentTarget)e.currentTarget.classList.remove("open")};
function openStudio(){initCanvas();$("#studioOverlay").classList.add("open")}function closeStudio(){$("#studioOverlay").classList.remove("open")}
$$("[data-open-studio]").forEach(b=>b.onclick=openStudio);$$("[data-close-studio]").forEach(b=>b.onclick=closeStudio);
$("#menuBtn").onclick=()=>document.body.classList.toggle("menu-open");

let currentTool="brush",drawing=false,start=null,last=null,history=[],redoStack=[];const canvas=$("#paintCanvas"),ctx=canvas.getContext("2d"),placeholder=$("#canvasPlaceholder");
function resizeCanvas(){const ratio=devicePixelRatio||1;canvas.width=1400*ratio;canvas.height=850*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.lineCap="round";ctx.lineJoin="round";ctx.fillStyle="#0b0b0b";ctx.fillRect(0,0,1400,850)}
function initCanvas(){if(!canvas.dataset.ready){resizeCanvas();history=[canvas.toDataURL()];canvas.dataset.ready="1"}}
function snapshot(){history.push(canvas.toDataURL());if(history.length>30)history.shift();redoStack=[]}
function restore(data){const im=new Image;im.onload=()=>{ctx.clearRect(0,0,1400,850);ctx.drawImage(im,0,0,1400,850);placeholder.classList.add("hidden")};im.src=data}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*1400/r.width,y:(e.clientY-r.top)*850/r.height}}
function draw(e){if(!drawing)return;const p=point(e),size=+$("#sizeRange").value,alpha=+$("#opacityRange").value/100,color=$("#colorPicker").value;ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=currentTool==="eraser"?"#0b0b0b":color;ctx.fillStyle=color;ctx.lineWidth=size;if(currentTool==="brush"||currentTool==="eraser"){ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke()}else{restore(history[history.length-1]);ctx.beginPath();if(currentTool==="line"){ctx.moveTo(start.x,start.y);ctx.lineTo(p.x,p.y);ctx.stroke()}if(currentTool==="rect")ctx.strokeRect(start.x,start.y,p.x-start.x,p.y-start.y);if(currentTool==="circle"){const rx=p.x-start.x,ry=p.y-start.y;ctx.ellipse(start.x+rx/2,start.y+ry/2,Math.abs(rx/2),Math.abs(ry/2),0,0,Math.PI*2);ctx.stroke()}}ctx.restore();last=p;placeholder.classList.add("hidden")}
canvas.addEventListener("pointerdown",e=>{canvas.setPointerCapture(e.pointerId);drawing=true;start=last=point(e);if(currentTool!=="brush"&&currentTool!=="eraser")snapshot()});canvas.addEventListener("pointermove",draw);canvas.addEventListener("pointerup",()=>{if(drawing){drawing=false;if(currentTool==="brush"||currentTool==="eraser")snapshot();$("#canvasStatus").textContent="Obra em criação"}});canvas.addEventListener("pointercancel",()=>drawing=false);
$$(".tool").forEach(b=>b.onclick=()=>{$$(".tool").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentTool=b.dataset.tool});
$("#colorPicker").oninput=e=>$("#colorValue").textContent=e.target.value.toUpperCase();$("#sizeRange").oninput=e=>$("#sizeValue").textContent=e.target.value;$("#opacityRange").oninput=e=>$("#opacityValue").textContent=e.target.value+"%";
["#ffffff","#bdbdbd","#777777","#444444","#111111","#e7e0d2","#b6c7d9","#d8a6a6"].forEach(c=>{const b=document.createElement("button");b.className="swatch";b.style.background=c;b.onclick=()=>{$("#colorPicker").value=c;$("#colorValue").textContent=c.toUpperCase()};$("#swatches").append(b)});
$("#undoBtn").onclick=()=>{if(history.length>1){redoStack.push(history.pop());restore(history[history.length-1])}};$("#redoBtn").onclick=()=>{if(redoStack.length){const x=redoStack.pop();history.push(x);restore(x)}};$("#clearBtn").onclick=()=>{snapshot();ctx.fillStyle="#0b0b0b";ctx.fillRect(0,0,1400,850);placeholder.classList.remove("hidden")};
$("#publishBtn").onclick=()=>{if(history.length<=1){alert("Crie alguma coisa antes de publicar.");return}$("#publishModal").classList.add("open")};$("#publishClose").onclick=()=>$("#publishModal").classList.remove("open");
$("#saveArtBtn").onclick=async()=>{const title=$("#artTitle").value.trim();if(!title){$("#artTitle").focus();return}const w={id:Date.now().toString(),title,description:$("#artDescription").value.trim()||"Uma criação feita no Studio da ETEC.",author:$("#artAuthor").value.trim()||"Artista visitante",src:canvas.toDataURL("image/jpeg",.9)};works.push(w);saveWorks();renderGrid();await rebuildThreeWorks();$("#publishModal").classList.remove("open");closeStudio();$("#artTitle").value=$("#artDescription").value=$("#artAuthor").value="";location.hash="galeria";$("#threeGallery")[0]?.scrollIntoView?.()};

$$(".view-btn").forEach(b=>b.onclick=()=>{$$(".view-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");const grid=$("#galleryGrid"),stage=$("#sphereStage");if(b.dataset.view==="grid"){grid.classList.add("show");stage.classList.add("hide")}else{grid.classList.remove("show");stage.classList.remove("hide");initThree()}});
const cursor=$("#cursorGlow");let mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my;if(cursor){document.addEventListener("pointermove",e=>{mx=e.clientX;my=e.clientY});(function loop(){cx+=(mx-cx)*.2;cy+=(my-cy)*.2;cursor.style.left=cx+"px";cursor.style.top=cy+"px";requestAnimationFrame(loop)})()}
$$("a,button,.art-card").forEach(el=>{el.addEventListener("mouseenter",()=>document.body.classList.add("cursor-hover"));el.addEventListener("mouseleave",()=>document.body.classList.remove("cursor-hover"))});
const revealTargets=$$(".intro-strip,.gallery-section .section-heading,.sphere-stage,.artist-banner,.about-section,.site-footer");const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");observer.unobserve(e.target)}}),{threshold:.08});revealTargets.forEach(e=>{e.classList.add("reveal");observer.observe(e)});
window.addEventListener("keydown",e=>{if(e.key==="Escape"){closeStudio();closeModals()}});
renderGrid();initThree();