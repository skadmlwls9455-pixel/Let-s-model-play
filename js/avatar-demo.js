/* Standalone demo. This file never runs in the existing game. */
(function(){
  'use strict';
  var A=window.AVATAR,P=window.AVATAR_PARTS,KEY='ppolppol_avatar_demo_v1';
  var host=document.getElementById('av-scene'),fallback=document.getElementById('av-fallback'),notice=document.getElementById('av-notice');
  var motion=document.getElementById('av-motion'),media=window.matchMedia('(prefers-reduced-motion: reduce)');
  var look=A.validate(),walking=false,disposed=false,renderer=null,scene=null,camera=null,avatar=null,observer=null;
  var width=1,height=1,raf=0,lastPose='',lastTime=0,time=0,resources=[],backend='canvas2d',initError='';
  try{var stored=JSON.parse(localStorage.getItem(KEY));if(stored&&stored.version===1)look=A.validate(stored.look);}catch(e){notice.textContent='저장된 모습 대신 기본 모습으로 열었어.';}
  function keep(r){resources.push(r);return r;}
  function material(color){return keep(new THREE.MeshLambertMaterial({color:new THREE.Color(color).convertSRGBToLinear(),flatShading:true}));}
  function box(x,y,z,w,h,d,mat){var mesh=new THREE.Mesh(keep(new THREE.BoxGeometry(w,h,d)),mat);mesh.position.set(x,y,z);scene.add(mesh);return mesh;}
  function setupScene(){
    if(typeof THREE==='undefined')throw new Error('Three.js unavailable');
    renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
    renderer.setPixelRatio(1);renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.NoToneMapping;
    renderer.setClearColor('#e6ebdd',1);renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);
    scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-2,2,1.5,-1.5,.1,40);
    camera.position.set(4,3.1,5);camera.lookAt(0,.65,0);
    scene.add(new THREE.HemisphereLight('#fff4d6','#7d917b',.82));
    var sun=new THREE.DirectionalLight('#fff3d4',.75);sun.position.set(-3,6,5);scene.add(sun);
    var wall=material('#e7d5b3'),timber=material('#ad7757'),wood=material('#c09473'),floor=material('#d7b594'),pale=material('#e7d5b3');
    var green=material('#819796'),cream=material('#ebede9'),navy=material('#394a50'),leaf=material('#75a743'),leafDark=material('#468232');
    var blue=material('#73bed3'),sky=material('#a4dddb'),pink=material('#df84a5');
    // A small open room; every prop is independent of the avatar module.
    box(0,-.08,0,2.9,.16,2.35,wood);
    for(var i=0;i<9;i++)box(0,.01,-1.04+i*.26,2.86,.035,.245,i%3===0?pale:floor);
    box(0,.80,-1.13,2.9,1.6,.10,wall);box(-1.43,.8,0,.10,1.6,2.35,wall);
    box(0,1.62,-1.12,2.94,.10,.16,timber);box(-1.43,1.62,0,.14,.10,2.4,timber);
    box(-1.39,.08,0,.12,.14,2.35,timber);box(0,.08,-1.08,2.8,.14,.12,timber);
    [-1.38,1.38].forEach(function(x){box(x,.8,-1.06,.10,1.58,.14,timber);});
    // Window, sill and curtains.
    box(-.35,1.04,-1.05,.9,.83,.10,timber);box(-.35,1.06,-.98,.76,.68,.05,blue);
    box(-.35,1.20,-.94,.70,.34,.015,sky);box(-.56,1.22,-.922,.23,.07,.01,cream);box(-.46,1.25,-.921,.12,.07,.01,cream);
    box(-.35,1.06,-.91,.055,.7,.05,pale);box(-.35,1.05,-.90,.77,.05,.05,pale);box(-.35,.64,-.94,1.02,.08,.27,timber);
    [-.86,.16].forEach(function(x){box(x,1.12,-.94,.14,.78,.13,cream);box(x,1.08,-.855,.06,.64,.015,pale);});
    // Little bookshelf, colourful books and a framed picture.
    box(.85,.50,-.90,.72,.92,.32,wood);
    [0,1,2].forEach(function(i){box(.85,.16+i*.30,-.69,.73,.055,.38,timber);});
    for(var j=0;j<5;j++)box(.59+j*.11,.37,-.70,.075,.29-(j%2)*.06,.18,[green,navy,pink,pale,blue][j]);
    box(.77,.69,-.70,.32,.16,.20,pale);box(.78,.79,-.70,.30,.03,.21,green);
    box(.86,1.17,-1.025,.39,.30,.07,timber);box(.86,1.17,-.98,.30,.22,.025,pale);box(.86,1.16,-.96,.12,.12,.02,green);
    // Woven rug; no CSS scaling of the avatar canvas.
    box(.10,.045,.28,1.46,.018,.92,green);
    [-.31,.86].forEach(function(z){box(.10,.06,z,1.40,.005,.04,pale);});
    for(var k=0;k<8;k++){box(-.59+k*.20,.059,-.19,.08,.008,.04,pale);box(-.59+k*.20,.059,.72,.08,.008,.04,pale);}
    // Stool with a mug, and a leafy plant.
    box(-.87,.37,-.29,.48,.09,.43,timber);
    [-1.04,-.70].forEach(function(x){[-.43,-.15].forEach(function(z){box(x,.18,z,.06,.35,.06,wood);});});
    box(-.86,.48,-.29,.14,.16,.14,cream);box(-.76,.49,-.29,.065,.06,.06,cream);
    box(-1.05,.18,.68,.30,.32,.30,wood);box(-1.05,.36,.68,.35,.07,.35,pale);
    box(-1.05,.63,.68,.055,.50,.055,leafDark);
    [[-.11,.58,0],[.10,.74,.02],[-.08,.89,.01],[.10,.57,.05]].forEach(function(a){box(-1.05+a[0],a[1],.68+a[2],.24,.12,.15,leaf);});
    box(1.04,.16,.58,.23,.24,.23,pink);box(1.04,.31,.58,.04,.15,.04,leafDark);
    box(1.04,.42,.58,.18,.14,.16,pale);box(1.04,.43,.67,.06,.06,.015,wood);
    avatar=window.AVATAR_THREE.create({THREE:THREE,look:look,outline:true});avatar.object.position.set(.18,.08,.58);scene.add(avatar.object);
    renderer.domElement.addEventListener('webglcontextlost',onContextLost,false);
    backend='three';resize();
  }
  function onContextLost(event){event.preventDefault();useFallback('3D 화면 대신 같은 픽셀 캐릭터로 보여 줄게.');}
  function useFallback(message){
    backend='canvas2d';fallback.hidden=false;if(renderer)renderer.domElement.hidden=true;
    if(message)notice.textContent=message;resize();renderPose(true);
  }
  function resize(){
    if(backend!=='three'){
      var fallbackScale=host.clientWidth>=500?3:2;
      width=Math.max(80,Math.floor(host.clientWidth/fallbackScale));height=Math.floor(host.clientHeight/fallbackScale);
      fallback.width=width;fallback.height=height;fallback.style.width=(width*fallbackScale)+'px';fallback.style.height=(height*fallbackScale)+'px';
      renderPose(true);return;
    }
    if(!renderer)return;
    var factor=host.clientWidth>=500?3:2;
    width=Math.max(1,Math.floor(host.clientWidth/factor));height=Math.max(1,Math.floor(host.clientHeight/factor));
    renderer.setSize(width,height,false);renderer.domElement.style.width=(width*factor)+'px';renderer.domElement.style.height=(height*factor)+'px';
    var view=2.72;camera.left=-view*width/height/2;camera.right=-camera.left;camera.top=view/2;camera.bottom=-view/2;camera.updateProjectionMatrix();
    avatar.object.position.set(.18,.08,.58);avatar.snapToCamera(camera,width,height);drawScene();
  }
  function drawScene(){if(backend==='three'&&renderer)renderer.render(scene,camera);}
  function drawFallback(pose){
    // Rectangular pixel art keeps the same character and a usable room without WebGL.
    var c=fallback.getContext('2d'),x=Math.floor((width-124)/2),y=Math.floor((height-106)/2);
    c.imageSmoothingEnabled=false;c.clearRect(0,0,width,height);
    function r(a,b,w,h,color){c.fillStyle=color;c.fillRect(x+a,y+b,w,h);}
    r(3,105,118,3,'#b7c3a6');r(0,6,124,98,'#ad7757');r(3,10,118,65,'#e7d5b3');
    r(3,75,118,27,'#d7b594');r(3,75,118,2,'#c09473');
    for(var line=82;line<102;line+=8)r(3,line,118,1,'#c09473');
    r(0,6,124,4,'#c09473');r(0,10,4,94,'#c09473');r(120,10,4,94,'#c09473');
    r(14,21,39,33,'#ad7757');r(17,24,33,27,'#73bed3');r(18,25,31,12,'#a4dddb');
    r(20,29,13,3,'#ebede9');r(26,27,6,2,'#ebede9');r(32,23,2,30,'#e7d5b3');r(17,37,33,2,'#e7d5b3');
    r(10,21,5,32,'#ebede9');r(52,21,5,32,'#ebede9');r(11,54,46,3,'#ad7757');
    r(89,40,24,36,'#c09473');r(88,39,26,3,'#ad7757');r(88,56,26,3,'#ad7757');r(88,74,26,3,'#ad7757');
    ['#3c5e8b','#7a4841','#819796','#e7d5b3','#df84a5'].forEach(function(color,i){r(91+i*4,43+i%2*2,3,12-i%2*2,color);});
    r(92,63,16,8,'#e7d5b3');r(92,62,16,2,'#819796');r(96,20,14,13,'#ad7757');r(98,22,10,9,'#ebede9');r(101,25,4,4,'#819796');
    r(33,81,55,18,'#819796');r(35,83,51,1,'#d0da91');r(35,96,51,1,'#d0da91');
    for(var fringe=36;fringe<87;fringe+=5){r(fringe,80,2,1,'#d0da91');r(fringe,99,2,1,'#d0da91');}
    r(13,72,12,16,'#c09473');r(11,71,16,3,'#ad7757');r(18,54,2,18,'#468232');
    r(9,58,10,5,'#75a743');r(19,52,10,5,'#75a743');r(12,49,7,5,'#a8ca58');r(19,63,9,4,'#468232');
    r(100,78,10,10,'#df84a5');r(104,72,2,6,'#468232');r(100,67,10,6,'#ebede9');r(103,69,3,3,'#e8c170');
    r(46,93,31,3,'#577277');
    c.drawImage(A.compose(look,pose),x+38,y+27,48,72);
  }
  function identity(){
    document.getElementById('av-description').textContent=A.describe(look);host.setAttribute('aria-label',A.describe(look));
    var c=document.getElementById('av-portrait'),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,48,48);ctx.drawImage(A.face(look),0,0,48,48);
  }
  function apply(value){look=A.validate(value);if(avatar)avatar.setLook(look);identity();renderPose(true);}
  function renderPose(force){
    var reduced=media.matches,pose={frame:walking&&!reduced?'walk'+(Math.floor(time*8)%4):'stand',expr:!reduced&&time%4.3>4.15?'blink':'idle'};
    var key=pose.frame+pose.expr;if(force||key!==lastPose){lastPose=key;if(backend==='three'){avatar.setPose(pose);drawScene();}else drawFallback(pose);}
  }
  function loop(now){
    if(disposed)return;
    if(lastTime&&!document.hidden)time+=Math.min((now-lastTime)/1000,.1);lastTime=now;
    if(!document.hidden)renderPose(false);raf=requestAnimationFrame(loop);
  }
  function onMotion(){walking=!walking;motion.setAttribute('aria-pressed',String(walking));motion.textContent=walking?'가만히 서기':'걸어 보기';renderPose(true);}
  function onMedia(){if(media.matches&&walking){walking=false;motion.setAttribute('aria-pressed','false');motion.textContent='걸어 보기';}renderPose(true);}
  function download(blob,name){var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);}
  function exportPng(){var c=document.createElement('canvas');c.width=128;c.height=192;A.draw(c,look);c.toBlob(function(blob){if(blob){download(blob,'my-avatar.png');notice.textContent='투명 배경 그림을 저장했어.';}else notice.textContent='그림을 저장하지 못했어.';},'image/png');}
  function exportJson(){download(new Blob([JSON.stringify({schema:'ppolppol-avatar',version:1,look:look},null,2)],{type:'application/json'}),'my-avatar.json');notice.textContent='모습 설정을 내보냈어.';}
  var editor=window.AVATAR_EDITOR.mount(document.getElementById('av-editor'),{look:look,onChange:apply,
    onSave:function(value){localStorage.setItem(KEY,JSON.stringify({version:1,look:value}));}});
  try{setupScene();}catch(e){initError=String(e.message||e);if(renderer){renderer.dispose();renderer.domElement.remove();renderer=null;}useFallback('같은 픽셀 캐릭터로 미리 볼 수 있어.');}
  if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(resize);observer.observe(host);}else window.addEventListener('resize',resize);
  motion.addEventListener('click',onMotion);document.getElementById('av-png').addEventListener('click',exportPng);document.getElementById('av-json').addEventListener('click',exportJson);
  if(media.addEventListener)media.addEventListener('change',onMedia);else media.addListener(onMedia);
  identity();renderPose(true);raf=requestAnimationFrame(loop);
  function dispose(){
    if(disposed)return;disposed=true;cancelAnimationFrame(raf);if(observer)observer.disconnect();window.removeEventListener('resize',resize);
    motion.removeEventListener('click',onMotion);document.getElementById('av-png').removeEventListener('click',exportPng);document.getElementById('av-json').removeEventListener('click',exportJson);
    if(media.removeEventListener)media.removeEventListener('change',onMedia);else media.removeListener(onMedia);
    editor.destroy();if(avatar)avatar.dispose();resources.forEach(function(r){r.dispose();});
    if(renderer){renderer.domElement.removeEventListener('webglcontextlost',onContextLost);renderer.dispose();renderer.domElement.remove();}
  }
  // Visible review/debug API, also used by the browser QA page.
  window.AVATAR_DEMO={editor:editor,setLook:function(v){editor.setLook(v);apply(v);},
    inspect:function(){return {backend:backend,initError:initError,look:A.validate(look),walking:walking,reduced:media.matches,pose:lastPose,
      target:[width,height],calls:renderer?renderer.info.render.calls:0,textures:renderer?renderer.info.memory.textures:0};},
    forceContextLoss:function(){if(renderer)renderer.forceContextLoss();},dispose:dispose};
  window.addEventListener('pagehide',function(e){if(!e.persisted)dispose();});
})();
