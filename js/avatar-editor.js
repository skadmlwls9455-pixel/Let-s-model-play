/* Optional, scoped wardrobe UI. Saving is delegated to the host. */
(function(root){
  'use strict';
  var sequence=0;
  function mount(container,opts){
    opts=opts||{};var A=root.AVATAR,P=root.AVATAR_PARTS,initial=A.validate(opts.look),look=A.validate(initial),destroyed=false;
    var uid='avatar-editor-'+(++sequence), listeners=[], form=document.createElement('form');
    form.className='avatar-editor';form.setAttribute('aria-label','캐릭터 꾸미기');
    var selected={},inputs={},thumbs=[], status=document.createElement('output');status.className='av-status';status.setAttribute('aria-live','polite');
    function on(el,event,fn){el.addEventListener(event,fn);listeners.push(function(){el.removeEventListener(event,fn);});}
    function group(field,title,visual,parent){
      var fs=document.createElement('fieldset'),legend=document.createElement('legend'),value=document.createElement('span'),grid=document.createElement('div');
      fs.className='av-group av-group--'+field;legend.appendChild(document.createTextNode(title));value.className='av-value';legend.appendChild(value);
      selected[field]=value;grid.className='av-options av-options--'+visual;
      fs.append(legend,grid);parent.appendChild(fs);inputs[field]=[];
      P.catalog[field].forEach(function(item){
        var label=document.createElement('label'),input=document.createElement('input'),chip=document.createElement('span'),name=document.createElement('span');
        input.type='radio';input.name=uid+'-'+field;input.value=item.id;input.setAttribute('aria-label',item.label);input.checked=look[field]===item.id;
        label.className='av-option';chip.className='av-chip';name.className='av-option-name';name.textContent=item.label;
        if(visual==='swatch'){chip.className+=' av-swatch';chip.style.backgroundColor=item.colors[1]||item.colors[0];chip.setAttribute('aria-hidden','true');}
        else{var canvas=document.createElement('canvas');canvas.width=32;canvas.height=48;canvas.setAttribute('aria-hidden','true');chip.appendChild(canvas);thumbs.push({canvas:canvas,field:field,id:item.id});}
        label.append(input,chip,name);grid.appendChild(label);inputs[field].push(input);
        on(input,'change',function(){if(!input.checked)return;look[field]=item.id;status.textContent='';sync();if(opts.onChange)opts.onChange(A.validate(look));});
      });
    }
    group('hair','머리 모양','art',form);group('hairColor','머리색','swatch',form);group('eyeColor','눈색','swatch',form);
    group('top','윗옷','art',form);group('bottom','아래옷','art',form);
    var details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='피부색';details.appendChild(summary);form.appendChild(details);
    group('skin','피부색','swatch',details);
    var actions=document.createElement('div'),cancel=document.createElement('button'),save=document.createElement('button');
    actions.className='av-actions';cancel.type='button';cancel.className='av-secondary';cancel.textContent='되돌리기';
    save.type='submit';save.className='av-primary';save.textContent='이 모습으로 할래';actions.append(cancel,save);form.append(actions,status);container.appendChild(form);
    function sync(){
      Object.keys(inputs).forEach(function(f){inputs[f].forEach(function(i){i.checked=i.value===look[f];});selected[f].textContent=P.catalog[f].find(function(i){return i.id===look[f];}).label;});
      thumbs.forEach(function(t){var v=Object.assign({},look);v[t.field]=t.id;A.draw(t.canvas,v);});
    }
    on(cancel,'click',function(){look=A.validate(initial);sync();status.textContent='처음 모습으로 돌아왔어.';if(opts.onChange)opts.onChange(A.validate(look));if(opts.onCancel)opts.onCancel();});
    on(form,'submit',function(e){
      e.preventDefault();if(save.disabled)return;save.disabled=true;var snapshot=A.validate(look);
      Promise.resolve().then(function(){return opts.onSave?opts.onSave(snapshot):undefined;}).then(function(){
        if(destroyed)return;initial=A.validate(snapshot);status.textContent=opts.onSave?'이 모습으로 저장했어.':'이 모습으로 골랐어.';
      }).catch(function(){if(!destroyed)status.textContent='저장하지 못했어. 다시 눌러 줘.';}).finally(function(){if(!destroyed)save.disabled=false;});
    });
    sync();return {getLook:function(){return A.validate(look);},setLook:function(v){look=A.validate(v);sync();},
      destroy:function(){if(destroyed)return;destroyed=true;listeners.forEach(function(f){f();});form.remove();}};
  }
  root.AVATAR_EDITOR={mount:mount};
})(typeof globalThis!=='undefined'?globalThis:this);
