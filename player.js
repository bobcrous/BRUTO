(function(){
  'use strict';
  function fmt(s){
    if(!isFinite(s)) return '00:00';
    s=Math.max(0,Math.floor(s));
    var m=Math.floor(s/60), sec=s%60;
    return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
  }
  function bar(value, width){
    width=width||46; var pos=Math.round((value/100)*width);
    var out=''; for(var i=0;i<=width;i++) out += (i===pos?'●':'─');
    return '├'+out+'┤';
  }
  function init(root){
    var src=root.getAttribute('data-audio');
    if(!src) return;
    var audio=document.createElement('audio'); audio.preload='metadata'; audio.src=src;
    root.appendChild(audio);
    var play=root.querySelector('.ascii-play');
    var time=root.querySelector('.ascii-time');
    var dur=root.querySelector('.ascii-duration');
    var progress=root.querySelector('.ascii-progress');
    var pbar=root.querySelector('.ascii-progress-bar');
    var volume=root.querySelector('.ascii-volume');
    var vbar=root.querySelector('.ascii-volume-bar');
    var status=root.querySelector('.ascii-status');
    var pct=root.querySelector('.ascii-volume-pct');
    audio.volume=.7;
    function render(){
      var percent=audio.duration ? (audio.currentTime/audio.duration)*100 : 0;
      pbar.textContent=bar(percent,46); time.textContent=fmt(audio.currentTime); dur.textContent=fmt(audio.duration);
      vbar.textContent=bar(audio.volume*100,46); pct.textContent=Math.round(audio.volume*100)+'%';
    }
    function setStatus(s){status.textContent=s;}
    play.addEventListener('click',function(){
      if(audio.paused){ audio.play().catch(function(){}); } else { audio.pause(); }
    });
    progress.addEventListener('input',function(){
      if(audio.duration) audio.currentTime=(progress.value/100)*audio.duration;
      render();
    });
    volume.addEventListener('input',function(){ audio.volume=Number(volume.value)/100; render(); });
    audio.addEventListener('play',function(){play.textContent='[ ■ DETENER ]'; setStatus('>>> REPRODUCIENDO');});
    audio.addEventListener('pause',function(){
      play.textContent='[ ▶ REPRODUCIR ]';
      if(audio.ended) setStatus('ESTADO: FINALIZADO'); else setStatus('ESTADO: EN PAUSA');
    });
    audio.addEventListener('loadedmetadata',function(){render(); setStatus('ESTADO: LISTO');});
    audio.addEventListener('timeupdate',function(){
      if(audio.duration) progress.value=(audio.currentTime/audio.duration)*100;
      render();
    });
    audio.addEventListener('ended',function(){progress.value=100; render(); setStatus('ESTADO: FINALIZADO'); play.textContent='[ ▶ REPRODUCIR ]';});
    root.querySelector('.ascii-reset').addEventListener('click',function(){audio.currentTime=0; if(!audio.paused) audio.pause(); render(); setStatus('ESTADO: LISTO');});
    render();
  }
  document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('.ascii-player').forEach(init);});
})();
