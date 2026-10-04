const LV=[{n:3,t:60,s:3},{n:3,t:50,s:6},{n:4,t:90,s:8},{n:5,t:150,s:12}];
const $=id=>document.getElementById(id);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.xr.enabled=true;document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x12060a);scene.fog=new THREE.FogExp2(0x1a0708,0.045);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,100);
const rig=new THREE.Group();rig.add(camera);scene.add(rig);
scene.add(new THREE.AmbientLight(0x553355,0.7));
const spot=new THREE.PointLight(0x66e0ff,1.2,14);spot.position.set(0,4,0);scene.add(spot);
// lava (animated emissive + vertex waves)
const lavaG=new THREE.PlaneGeometry(40,40,40,40);lavaG.rotateX(-Math.PI/2);
const lava=new THREE.Mesh(lavaG,new THREE.MeshStandardMaterial({color:0xff4a00,emissive:0xff3300,emissiveIntensity:.9,roughness:.6}));
lava.position.y=-2;scene.add(lava);
const lavaLight=new THREE.PointLight(0xff4a00,2,18);scene.add(lavaLight);
// torch pillars
const pm=new THREE.MeshStandardMaterial({color:0x3a2a33,roughness:.9});
[[-6,-6],[6,-6],[-6,6],[6,6]].forEach(([x,z])=>{
 const p=new THREE.Mesh(new THREE.CylinderGeometry(.5,.7,8,10),pm);p.position.set(x,2,z);scene.add(p);
 const f=new THREE.Mesh(new THREE.ConeGeometry(.35,.9,8),new THREE.MeshBasicMaterial({color:0xffa31a}));f.position.set(x,6.4,z);f.userData.fl=1;scene.add(f);
 const l=new THREE.PointLight(0xff8a1f,1.1,12);l.position.set(x,6.2,z);scene.add(l);});
// embers (particle system)
const EN=250,ep=new Float32Array(EN*3);
for(let i=0;i<EN;i++){ep.set([(Math.random()-.5)*20,Math.random()*8-1,(Math.random()-.5)*20],i*3);}
const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.BufferAttribute(ep,3));
scene.add(new THREE.Points(eg,new THREE.PointsMaterial({color:0xffb347,size:.08,transparent:true,opacity:.85})));
// gate (opens on win)
const gate=new THREE.Mesh(new THREE.TorusGeometry(1,.15,12,40),new THREE.MeshStandardMaterial({color:0x66e0ff,emissive:0x2299ff,emissiveIntensity:.2}));
gate.position.set(0,2.2,-4);scene.add(gate);
// puzzle state
const board=new THREE.Group();scene.add(board);
let tiles=[],N=3,lvl=0,state=[],sol=new Set(),moves=0,score=0,timeLeft=0,total=0,mode='menu',hintK=-1,hints=0,lastAt=performance.now();
const mOn=new THREE.Color(0x30e8ff),mOff=new THREE.Color(0x3a1055),mHint=new THREE.Color(0xff3dd0);
function build(){
 while(board.children.length)board.remove(board.children[0]);tiles=[];
 const c=LV[lvl];N=c.n;total=c.t;timeLeft=total;moves=0;hints=0;hintK=-1;sol.clear();
 const sz=N*1.05+.4,base=new THREE.Mesh(new THREE.BoxGeometry(sz,.4,sz),new THREE.MeshStandardMaterial({color:0x2b1c26,roughness:.8}));
 base.position.y=-.35;board.add(base);
 state=Array(N*N).fill(true);
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){
  const m=new THREE.Mesh(new THREE.BoxGeometry(.95,.2,.95),new THREE.MeshStandardMaterial({color:0x222233,emissive:mOn,emissiveIntensity:1,metalness:.3,roughness:.4}));
  m.position.set((j-(N-1)/2)*1.05,0,(i-(N-1)/2)*1.05);m.userData.k=i*N+j;board.add(m);tiles.push(m);}
 // scramble from solved state => always solvable
 const ks=[...Array(N*N).keys()].sort(()=>Math.random()-.5).slice(0,c.s);
 ks.forEach(k=>{flip(k,true);sol.add(k);});
 if(state.every(x=>x))return build();
 tiles.forEach(m=>{m.userData.p=state[m.userData.k]?1:0;});
 camBase.set(0,N*.9+2.2,N*1.1+2.8);
 if(!renderer.xr.isPresenting)camera.position.copy(camBase);else rig.position.set(0,.6,N*.6+1.6);
 gate.material.emissiveIntensity=.2;ui();
}
const camBase=new THREE.Vector3();
function nb(k){const i=k/N|0,j=k%N,r=[k];if(i>0)r.push(k-N);if(i<N-1)r.push(k+N);if(j>0)r.push(k-1);if(j<N-1)r.push(k+1);return r;}
function flip(k){nb(k).forEach(x=>state[x]=!state[x]);}
function press(k){
 if(mode!=='play')return;
 flip(k);moves++;sol.has(k)?sol.delete(k):sol.add(k);beep(300+k*20,.08);
 if(hintK===k)hintK=-1;
 if(state.every(x=>x))win();ui();
}
function win(){
 mode='won';const tb=Math.round(timeLeft)*10,mb=Math.max(0,LV[lvl].s+4-moves)*50,pts=Math.max(100,1000+tb+mb-hints*150);
 score+=pts;beep(660,.3);setTimeout(()=>beep(880,.4),200);gate.material.emissiveIntensity=2.5;
 const last=lvl===LV.length-1;
 show(last?'Temple Conquered!':'Gate Opened!',`Level ${lvl+1} score +${pts} (time bonus ${tb}, move bonus ${mb}, hints -${hints*150}). Total: ${score}`,last?'Play again':'Next level',()=>{if(last){lvl=0;score=0;}else lvl++;build();mode='play';hide();});
}
function lose(){mode='lost';beep(110,.6);show('Consumed by Lava!',`The temple collapsed. Your score so far: ${score}`,'Retry level',()=>{build();mode='play';hide();});}
function show(t,m,b,f){$('ot').textContent=t;$('om').textContent=m;$('go').textContent=b;$('go').onclick=f;$('ov').style.display='flex';}
function hide(){$('ov').style.display='none';}
function ui(){$('lv').textContent=lvl+1;$('mv').textContent=moves;$('sc').textContent=score;$('t').textContent=Math.ceil(timeLeft);$('t').className=timeLeft<10?'low':'';}
// audio
let ac;function beep(f,d){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;o.type='triangle';g.gain.value=.08;o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+d);}catch(e){}}
// picking (raycasting)
const ray=new THREE.Raycaster(),mv=new THREE.Vector2(),tmp=new THREE.Matrix4();
function pick(){const h=ray.intersectObjects(tiles);return h.length?h[0].object.userData.k:-1;}
renderer.domElement.addEventListener('pointerdown',e=>{
 if(renderer.xr.isPresenting||mode!=='play')return;
 mv.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(mv,camera);const k=pick();if(k>=0)press(k);});
let mx=0;addEventListener('pointermove',e=>mx=e.clientX/innerWidth-.5);
for(let q=0;q<2;q++){const c=renderer.xr.getController(q);rig.add(c);
 c.addEventListener('select',()=>{tmp.identity().extractRotation(c.matrixWorld);ray.ray.origin.setFromMatrixPosition(c.matrixWorld);ray.ray.direction.set(0,0,-1).applyMatrix4(tmp);const k=pick();if(k>=0)press(k);});}
// gaze reticle for VR
const ret=new THREE.Mesh(new THREE.RingGeometry(.02,.03,24),new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false}));
ret.position.z=-1.5;ret.renderOrder=9;ret.visible=false;camera.add(ret);
let gk=-1,gt=0;
// buttons
$('hint').onclick=()=>{if(mode!=='play'||!sol.size)return;hintK=[...sol][0];hints++;timeLeft=Math.max(1,timeLeft);ui();};
$('rs').onclick=()=>{if(mode==='menu')return;build();mode='play';hide();};
$('go').onclick=()=>{build();mode='play';hide();};
$('vr').onclick=async()=>{
 if(!navigator.xr){alert('WebXR / VR headset not detected. The game still works with mouse or touch.');return;}
 try{if(!(await navigator.xr.isSessionSupported('immersive-vr')))throw 0;
  const s=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor']});
  s.addEventListener('end',()=>{rig.position.set(0,0,0);ret.visible=false;camera.position.copy(camBase);});
  await renderer.xr.setSession(s);rig.position.set(0,.6,N*.6+1.6);ret.visible=true;}
 catch(e){alert('No VR headset available here. Open this page in a headset browser to use VR mode.');}};
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
// main loop
const col=new THREE.Color();
renderer.setAnimationLoop(now=>{
 const dt=Math.min((now-lastAt)/1000,.1);lastAt=now;const t=now/1000,xr=renderer.xr.isPresenting;
 if(mode==='play'){timeLeft-=dt;if(timeLeft<=0){timeLeft=0;lose();}
  if(Math.ceil(timeLeft)!=+$('t').textContent)ui();}
 const frac=total?1-timeLeft/total:0;
 lava.position.y=-2.2+1.9*(mode==='menu'?0:frac);lavaLight.position.set(0,lava.position.y+1,0);
 const lp=lavaG.attributes.position;for(let i=0;i<lp.count;i+=3)lp.setY(i,Math.sin(lp.getX(i)*.6+t*2)*.15+Math.cos(lp.getZ(i)*.5+t*1.5)*.15);lp.needsUpdate=true;
 lava.material.emissiveIntensity=.8+Math.sin(t*3)*.2;
 scene.children.forEach(o=>{if(o.userData.fl)o.scale.y=1+Math.sin(t*12+o.position.x)*.2;});
 for(let i=0;i<EN;i++){let y=ep[i*3+1]+dt*.6;if(y>7)y=-1;ep[i*3+1]=y;}eg.attributes.position.needsUpdate=true;
 tiles.forEach(m=>{const k=m.userData.k,on=state[k];m.userData.p+=((on?1:0)-m.userData.p)*Math.min(1,dt*10);const p=m.userData.p;
  m.position.y=.05+p*.12;col.copy(mOff).lerp(mOn,p);
  if(k===hintK&&mode==='play')col.lerp(mHint,.5+.5*Math.sin(t*8));
  m.material.emissive.copy(col);m.material.emissiveIntensity=.4+p*.9;});
 gate.rotation.z=t*(mode==='won'?3:.4);gate.scale.setScalar(mode==='won'?1.3:1);
 if(!xr){const sh=timeLeft<10&&mode==='play'?(Math.random()-.5)*.08:0;
  camera.position.set(camBase.x+mx*2+sh,camBase.y+sh,camBase.z);camera.lookAt(0,0,0);}
 else if(mode==='play'){ray.setFromCamera({x:0,y:0},camera);const k=pick();
  if(k===gk&&k>=0){gt+=dt;ret.scale.setScalar(1+gt*2);if(gt>1){press(k);gt=0;}}else{gk=k;gt=0;ret.scale.setScalar(1);}}
 renderer.render(scene,camera);
});
build();
