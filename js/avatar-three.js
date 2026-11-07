/* Three.js r128 adapter. Caller owns scene, renderer and animation loop. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./avatar.js'));
  else root.AVATAR_THREE=factory(root.AVATAR);
})(typeof globalThis!=='undefined'?globalThis:this,function(A){
  'use strict';
  function create(opts){
    opts=opts||{};var T=opts.THREE||(typeof THREE!=='undefined'?THREE:null);
    if(!T||!A)throw new Error('AVATAR_THREE needs THREE and AVATAR');
    var look=A.validate(opts.look), pose={frame:'stand',expr:'idle',outline:opts.outline===true}, disposed=false;
    var texture=new T.CanvasTexture(A.compose(look,pose));
    texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;
    texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;texture.encoding=T.sRGBEncoding;
    var material=new T.SpriteMaterial({map:texture,transparent:false,alphaTest:.5,depthTest:true,depthWrite:true,fog:false});
    material.toneMapped=false;
    var object=new T.Group(),sprite=new T.Sprite(material),unit=Number.isFinite(opts.pixelWorldSize)&&opts.pixelWorldSize>0?opts.pixelWorldSize:1/27;
    object.name='player-avatar';object.userData.avatar=true;object.add(sprite);
    sprite.center.set(.5,(pose.outline?1:2)/A.height);sprite.scale.set(A.width*unit,A.height*unit,1);
    var last=JSON.stringify([look,pose]),wp=new T.Vector3(),projected=new T.Vector3(),local=new T.Vector3(),worldScale=new T.Vector3();
    function redraw(){
      if(disposed)return;var key=JSON.stringify([look,pose]);if(key===last)return;
      texture.image=A.compose(look,pose);texture.needsUpdate=true;last=key;
    }
    function snap(camera,width,height){
      if(disposed||!camera||!camera.isOrthographicCamera||width<=0||height<=0)return false;
      camera.updateMatrixWorld();object.updateWorldMatrix(true,false);
      var pixel=(camera.top-camera.bottom)/camera.zoom/height;
      var scale=Math.max(1,Math.round(unit/pixel));
      object.getWorldScale(worldScale);
      if(worldScale.x<=0||worldScale.y<=0)return false;
      sprite.scale.set(A.width*pixel*scale/worldScale.x,A.height*pixel*scale/worldScale.y,1);
      // Only the visual child moves. The host's authored world position is stable.
      object.getWorldPosition(wp);projected.copy(wp).project(camera);
      projected.x=(Math.round((projected.x+1)*width/2)/width)*2-1;
      projected.y=(Math.round((1-projected.y)*height/2)/height)*-2+1;
      local.copy(projected).unproject(camera);
      object.worldToLocal(local);
      sprite.position.copy(local);return true;
    }
    return {object:object,sprite:sprite,texture:texture,
      getLook:function(){return Object.assign({},look);},
      setLook:function(value){look=A.validate(value);redraw();},
      setPose:function(value){value=value||{};pose.frame=value.frame||'stand';pose.expr=value.expr||'idle';redraw();},
      snapToCamera:snap,
      dispose:function(){if(disposed)return;disposed=true;if(object.parent)object.parent.remove(object);texture.dispose();material.dispose();}
    };
  }
  return {create:create};
});
