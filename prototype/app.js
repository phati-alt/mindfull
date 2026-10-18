/* App logic: state, scoring, screens, parade, scenes, result card, care pick, micro-actions, share. Uses globals from content.js */
(function(){
  'use strict';

  /* ---------- State ---------- */
  var S = {screen:'landing', i:0, answers:[], order:[], duration:null, result:null, fogLeft:1};
  var timers = [];

  var app = document.getElementById('app');
  var content = document.getElementById('content');
  var charWrap = document.getElementById('charWrap'), charFog = document.getElementById('charFog');
  var overlay = document.getElementById('overlay');
  var shareCard = document.getElementById('shareCard');
  var toastEl = document.getElementById('toast');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Helpers ---------- */
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function later(fn,ms){var t=setTimeout(fn,ms);timers.push(t);return t;}
  function clearTimers(){timers.forEach(clearTimeout);timers=[];}
  function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function toast(msg){
    toastEl.textContent=msg;toastEl.classList.add('show');
    clearTimeout(toast._t);toast._t=setTimeout(function(){toastEl.classList.remove('show');},2600);
  }

  /* ---------- Scoring ---------- */
  function resultFrom(list){
    var E=0,P=0;list.forEach(function(k){E+=AXES[k].e;P+=AXES[k].p;});
    if(E>0&&P>0)return 'storm';
    if(E<0&&P>0)return 'rain';
    if(E<0&&P<0)return 'fog';
    return 'fluffy';
  }
  function pulse(){
    var el=app.classList.contains('show-char')?(charWrap.querySelector('img')||charWrap):null;
    if(!el||reduceMotion.matches||!el.animate)return;
    el.animate([{transform:'scale(1)'},{transform:'scale(1.07)'},{transform:'scale(1)'}],{duration:700,easing:'ease-out'});
  }

  function showChar(k){
    app.classList.toggle('show-char',!!k);
    if(!k)buildParade();
    if(!k){charWrap.innerHTML='';charFog.style.opacity=0;return;}
    var c=CHAR[k];
    if(charWrap.getAttribute('data-k')!==k){var nm=c.name.toLowerCase();charWrap.innerHTML='<img src="assets/characters/'+nm+'.jpg" width="900" height="900" alt="'+CHAR_IMG_ALT[nm]+'" decoding="async">';charWrap.setAttribute('data-k',k);}
    updateFog();
  }
  function buildParade(){
    var el=document.getElementById('parade');
    if(el.getAttribute('data-built'))return;
    el.innerHTML='<span class="parade-hint">เพื่อนเมฆรออยู่ เฉลยตอนจบนะ</span><img src="assets/characters/all.jpg" width="900" height="672" alt="" decoding="async">';
    el.setAttribute('data-built','1');
  }
  function updateFog(){
    charFog.style.opacity=(S.result==='fog'&&S.screen==='micro')?(0.9*S.fogLeft).toFixed(2):0;
  }

  /* ---------- Screens ---------- */
  function setScreen(name){
    clearTimers();
    charWrap.classList.remove('inhale','exhale');
    S.screen=name;
    showChar(['reveal','care','micro','next'].indexOf(name)>-1?S.result:null);
    app.classList.toggle('compact', name==='question');
    render();
  }

  function render(){
    var html='';
    if(S.screen==='landing')html=landing();
    else if(S.screen==='question')html=question();
    else if(S.screen==='reveal')html=reveal();
    else if(S.screen==='care')html=care();
    else if(S.screen==='micro')html=micro();
    else if(S.screen==='next')html=nextStep();
    content.classList.remove('enter');void content.offsetWidth;content.classList.add('enter');
    content.innerHTML=html;
    if(S.screen==='question'){var sc=document.getElementById('scene');if(sc.getAttribute('data-i')!==String(S.i)){sc.innerHTML=SCENES[S.i]||'';sc.setAttribute('data-i',S.i);sc.classList.remove('swap');void sc.offsetWidth;sc.classList.add('swap');}}
    var f=content.querySelector('[data-focus]');
    if(f&&S.screen!=='landing'){f.focus({preventScroll:true});}
    window.scrollTo(0,0);
  }

  function landing(){
    return ''+
      '<img class="logo" src="'+LOGO_SRC+'" alt="mindfull" width="419" height="82">'+
      '<h1 tabindex="-1" data-focus>วันนี้ท้องฟ้าในใจคุณ<br>เป็นยังไงบ้าง?</h1>'+
      '<p>ใจคนเราก็เหมือนท้องฟ้า บางวันฟ้าใส บางวันก็มีเมฆบ้าง ลองตอบ 6 คำถามสบายๆ เกี่ยวกับงานช่วงนี้ แล้วมาดูกันว่าวันนี้เมฆแบบไหนลอยมาหาคุณ พร้อมวิธีดูแลใจเล็กๆ ที่ทำได้เลย</p>'+
      '<p class="muted">ใช้แค่ 2 นาที · ไม่ต้องสมัคร · ไม่เก็บคำตอบ<br>คำถามอิงแบบวัด WHO-5 และ PSS</p>'+
      '<div class="actions">'+
        '<button class="btn" data-act="start">ไปดูน้องก้อนเมฆกัน</button>'+
        '<p class="muted" style="text-align:center">เป็นแค่การเช็กความรู้สึก ไม่ใช่การวินิจฉัยนะ</p>'+
      '</div>';
  }

  function head(){
    var dots='';for(var i=0;i<TOTAL;i++)dots+='<span class="dot'+(i<=S.i?' on':'')+'"></span>';
    return '<div class="head">'+
      (S.i>0?'<button class="back" data-act="back">ย้อนกลับ</button>':'<span></span>')+
      '<div class="progress"><span>'+(S.i===TOTAL-1?'ข้อสุดท้าย':'ข้อ '+(S.i+1)+' จาก '+TOTAL)+'</span><span class="dots" aria-hidden="true">'+dots+'</span></div>'+
    '</div>';
  }

  function question(){
    var isDur=S.i===QUESTIONS.length;
    var q=isDur?DURATION_Q:QUESTIONS[S.i];
    var opts=isDur?q.opts:S.order[S.i];
    var picked=isDur?S.duration:S.answers[S.i];
    var list=opts.map(function(o,idx){
      var val=isDur?idx:o.k;
      var pressed=isDur?(S.durIdx===idx):(picked===o.k);
      return '<button class="opt" aria-pressed="'+(pressed?'true':'false')+'" data-act="pick" data-v="'+val+'">'+esc(o.t)+'</button>';
    }).join('');
    return head()+
      '<h2 tabindex="-1" data-focus>'+esc(q.text)+'</h2>'+
      (isDur?'':'<p class="muted">ช่วงนี้ ถ้าเจอแบบนี้ คุณน่าจะ…</p>')+
      '<div class="opts" role="group" aria-label="ตัวเลือก">'+list+'</div>';
  }

  function reveal(){
    var r=RESULTS[S.result], c=CHAR[S.result], k=CARD[S.result], a=ABOUT[S.result];
    return ''+
      '<div class="mym-head">'+
        '<p class="mym-kicker">นี่คือใจคุณช่วงนี้<br>เมฆลอยผ่านไปได้ พรุ่งนี้อาจเป็นเมฆตัวอื่น</p>'+
        '<h2 class="mym-name" tabindex="-1" data-focus>'+c.name+'</h2>'+
        '<p class="mym-title">'+c.title+'</p>'+
        '<p class="mym-type">'+c.cloud+'</p>'+
      '</div>'+
      '<section class="mym-about" aria-label="รู้จัก '+c.name+'"><p class="mym-label">รู้จัก '+c.name+'</p><p>'+a.a+'</p>'+'</section>'+
      /* more about the cloud sits right under รู้จัก, folded so the care CTA stays within the first screen */
      '<details class="more"><summary>รู้จัก '+c.name+' ให้มากขึ้น</summary><div class="more-body">'+
        '<section class="mym-power" aria-label="พลังพิเศษ"><p class="mym-label">พลังพิเศษ</p><p class="mym-pname">"'+c.power+'" <span>('+c.en+')</span></p><p class="mym-ptext">'+c.p+'</p></section>'+
        '<div class="mym-pair">'+
          '<section class="mym-cell"><p class="mym-label">ข้อดีที่ '+c.name+' พามาด้วย</p><p>'+k.st+'</p></section>'+
          '<section class="mym-cell warn"><p class="mym-label">เมื่อพลังล้น</p><p>'+k.ov+'</p></section>'+
        '</div>'+
        '<div class="buddy mym-buddy"><div class="buddy-av" aria-hidden="true"><img src="assets/characters/'+CHAR[c.buddy].name.toLowerCase()+'.jpg" width="72" height="72" alt="" decoding="async"></div><div><p class="mym-label">เพื่อนซี้</p><p class="bname">'+CHAR[c.buddy].name+'</p><p class="muted">'+c.bnote+'</p></div></div>'+
      '</div></details>'+
      '<section class="mym-care" aria-labelledby="careH"><p class="mym-label" id="careH">How to ดูแล '+c.name+'</p>'+
        '<p class="mym-ptext">เลือกสิ่งเล็กๆ ที่ช่วยดูแลใจ ลองตอนนี้ 20&nbsp;วินาที หรือนัดตัวเองไว้คืนนี้ สัปดาห์นี้</p>'+
        '<button class="btn" data-act="to-care">ลองทำดู</button>'+
      '</section>'+
      '<p class="mym-quote">"'+r.reframe+'"</p>'+
      '<div class="actions">'+
        '<button class="btn ghost" data-act="share">ส่งการ์ด '+c.name+' ให้เพื่อน</button>'+
        '<button class="link" data-act="to-next">ไปที่ก้าวต่อไป</button>'+
      '</div>';
  }

  /* How to ดูแล: its own screen, reached from the result card's main CTA */
  function care(){
    var c=CHAR[S.result];
    return '<div class="head"><button class="back" data-act="to-reveal">ย้อนกลับ</button><span></span></div>'+
      '<p class="mym-label" id="careH">How to ดูแล '+c.name+'</p>'+
      '<h2 tabindex="-1" data-focus>เลือกหนึ่งอย่างที่คุณจะลอง</h2>'+
      '<div class="care-opts" role="radiogroup" aria-labelledby="careH">'+CARE[S.result].map(function(t,i){
        var on=S.carePick===i;
        return '<button class="care-opt" role="radio" aria-checked="'+on+'" data-act="care" data-v="'+i+'"><span class="care-when">'+WHEN[i]+'</span><span class="care-text">'+t+'</span></button>';
      }).join('')+'</div>'+
      '<div class="actions" id="careFollow" aria-live="polite">'+careFollow()+'</div>';
  }
  function careFollow(){
    var skip='<button class="link" data-act="to-next">ไปที่ก้าวต่อไป</button>';
    if(S.carePick==null)return skip;
    if(S.carePick===0)return '<button class="btn" data-act="micro">เริ่มเลย 20 วินาที</button>'+skip;
    var when=S.carePick===1?'คืนนี้':'สัปดาห์นี้';
    return '<p class="note">'+when+'ฉันจะลอง: '+CARE[S.result][S.carePick]+'</p>'+
      '<button class="btn" data-act="to-next">ไปที่ก้าวต่อไป</button>'+
      '<button class="btn ghost" data-act="care-remind">ตั้งเตือนในแอป</button>';
  }
  function pickCare(btn){
    S.carePick=+btn.getAttribute('data-v');
    content.querySelectorAll('.care-opt').forEach(function(b){b.setAttribute('aria-checked',b===btn?'true':'false');});
    document.getElementById('careFollow').innerHTML=careFollow();
  }

  function micro(){
    var r=RESULTS[S.result], k=S.result, inner='';
    if(k==='storm'){
      inner='<div class="breath" id="breath"><span class="count" id="count">4</span><span class="breath-label" id="breathLabel">พร้อมแล้วกดเริ่ม</span></div>'+
        '<div class="actions" id="microActions"><button class="btn" data-act="breath-start">เริ่มหายใจ</button><button class="link" data-act="to-next">ข้าม</button></div>';
    } else if(k==='rain'){
      inner='<label class="muted" for="dropText">วันนี้ฉันจะวางเรื่องนี้ลงก่อน</label>'+
        '<input class="field" id="dropText" maxlength="80" placeholder="เช่น ตอบแชตงานหลังสองทุ่ม" autocomplete="off">'+
        '<p class="field-error" id="fieldErr" hidden>พิมพ์สักหนึ่งเรื่องก่อน หรือกดข้ามได้</p>'+
        '<div class="actions" id="microActions"><button class="btn" data-act="let-go">วางมันลง</button><button class="link" data-act="to-next">ข้าม</button></div>';
    } else if(k==='fog'){
      inner='<ol class="steps" id="steps">'+
        '<li class="now">มองหา 3 สิ่งรอบตัวคุณ</li>'+
        '<li>ฟัง 2 เสียงที่ได้ยินตอนนี้</li>'+
        '<li>สัมผัส 1 อย่างที่อยู่ใกล้มือ</li></ol>'+
        '<div class="actions" id="microActions"><button class="btn" data-act="ground">ทำแล้ว</button><button class="link" data-act="to-next">ข้าม</button></div>';
    } else {
      inner='<label class="muted" for="goodText">สัปดาห์นี้โอเคเพราะ</label>'+
        '<input class="field" id="goodText" maxlength="80" placeholder="เช่น ได้กินข้าวกับเพื่อนสนิท" autocomplete="off">'+
        '<p class="field-error" id="fieldErr" hidden>พิมพ์สักหนึ่งอย่างก่อน หรือกดข้ามได้</p>'+
        '<div class="actions" id="microActions"><button class="btn" data-act="keep">เก็บไว้</button><button class="link" data-act="to-next">ข้าม</button></div>';
    }
    return '<div class="head"><button class="back" data-act="to-reveal">กลับไปที่ผลลัพธ์</button><span></span></div>'+
      '<p class="muted">How to ดูแล '+CHAR[k].name+' ใช้เวลา 20 วินาที</p>'+
      '<h2 tabindex="-1" data-focus>'+r.microTitle+'</h2>'+
      '<p>'+r.microIntro+'</p>'+inner;
  }

  function doneMicro(msgHtml){
    var a=document.getElementById('microActions');
    if(a)a.innerHTML=(msgHtml?'<p class="note">'+msgHtml+'</p>':'')+'<button class="btn" data-act="to-next">ไปที่ก้าวต่อไป</button>';
    var b=a&&a.querySelector('.btn');if(b)b.focus();
  }

  function nextStep(){
    var r=RESULTS[S.result], n=NEXT[S.result][S.duration];
    return ''+
      '<div class="head"><button class="back" data-act="to-reveal">กลับไปที่ผลลัพธ์</button><span></span></div>'+
      '<p class="muted">ก้าวต่อไปที่พอดีกับคุณ</p>'+
      '<h2 tabindex="-1" data-focus>ก้าวต่อไปหลัง '+CHAR[S.result].name+' มาเยือน</h2>'+
      (S.carePick!=null?'<div class="commit"><p class="mym-label">สิ่งที่คุณเลือกจะลอง ('+WHEN[S.carePick].split(' ·')[0]+')</p><p>'+CARE[S.result][S.carePick]+'</p></div>':'')+
      '<p class="note">'+n.body+'</p>'+
      '<div class="actions">'+
        '<button class="btn" data-act="primary">'+n.primary+'</button>'+
        (n.share?'':'<button class="btn ghost" data-act="share">ส่งการ์ด '+CHAR[S.result].name+' ให้เพื่อน</button>')+
        '<button class="link" data-act="again">เล่นอีกครั้ง</button>'+
      '</div>';
  }

  /* ---------- Breathing ---------- */
  function breathe(){
    var phases=[['หายใจเข้า',4,'inhale'],['หายใจออกช้าๆ',6,'exhale'],['หายใจเข้า',4,'inhale'],['หายใจออกช้าๆ',6,'exhale']];
    var a=document.getElementById('microActions');
    if(a)a.innerHTML='<button class="link" data-act="to-next">ข้าม</button>';
    var countEl=document.getElementById('count'), labelEl=document.getElementById('breathLabel');
    var p=0;
    function runPhase(){
      if(p>=phases.length){
        charWrap.classList.remove('inhale','exhale');
        labelEl.textContent='ทำได้ดีมาก';countEl.textContent='';
        doneMicro('');return;
      }
      var ph=phases[p], left=ph[1];
      charWrap.classList.remove('inhale','exhale');void charWrap.offsetWidth;charWrap.classList.add(ph[2]);
      labelEl.textContent=ph[0];countEl.textContent=left;
      (function tick(){
        later(function(){
          left--;
          if(left>0){countEl.textContent=left;tick();}
          else{p++;runPhase();}
        },1000);
      })();
    }
    runPhase();
  }

  /* ---------- Share ---------- */
  function openShare(){
    var k=S.result;
    shareCard.innerHTML=''+
      '<div class="share-sky"><img src="assets/characters/'+CHAR[k].name.toLowerCase()+'.jpg" width="900" height="900" alt="'+CHAR_IMG_ALT[CHAR[k].name.toLowerCase()]+'" decoding="async"></div>'+
      '<div class="share-body">'+
        '<img class="logo" src="'+LOGO_SRC+'" alt="mindfull" width="419" height="82">'+
        '<p class="share-title" id="shareTitle">วันนี้ '+CHAR[k].name+' มาเยือนฉัน</p><p class="muted">'+CHAR[k].title+' · พลังพิเศษ "'+CHAR[k].power+'"</p>'+'<div class="fact"><p class="factl">รู้ไหม</p><p class="facttext">'+CHAR[k].fact+'</p></div>'+
        '<p class="muted">การ์ดนี้แสดงแค่เพื่อนเมฆ ไม่มีคำตอบหรือรายละเอียดส่วนตัวของคุณ</p>'+
        '<button class="btn" data-act="share-now">แชร์</button>'+
        '<button class="link" data-act="share-close">ปิด</button>'+
      '</div>';
    overlay.hidden=false;
    shareCard.querySelector('.btn').focus();
  }
  function closeShare(){overlay.hidden=true;var b=content.querySelector('[data-act="share"],[data-act="primary"]');if(b)b.focus();}
  function shareNow(){
    var r=RESULTS[S.result];
    var c=CHAR[S.result];var text='วันนี้ '+c.name+' ('+c.title+') มาเยือนฉัน ลองดูว่าเพื่อนเมฆตัวไหนมาเยือนคุณ ใช้เวลาแค่ 2 นาที';
    if(navigator.share){
      navigator.share({title:'ท้องฟ้าในใจวันนี้',text:text}).catch(function(){});
    } else if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){toast('คัดลอกข้อความแล้ว วางในแชตหรือสตอรี่ได้เลย');},function(){toast('ในเวอร์ชันจริง ปุ่มนี้จะเปิดหน้าแชร์ของมือถือ');});
    } else {
      toast('ในเวอร์ชันจริง ปุ่มนี้จะเปิดหน้าแชร์ของมือถือ');
    }
  }

  /* ---------- Actions ---------- */
  function start(){
    S.i=0;S.carePick=null;S.answers=[];S.duration=null;S.durIdx=null;S.result=null;S.fogLeft=1;
    S.order=QUESTIONS.map(function(q){return shuffle(q.opts);});
    SCENES.forEach(function(html){var m=/src="([^"]+)"/.exec(html);if(m)new Image().src=m[1];}); /* warm the cache so the next picture is ready */
    setScreen('question');
  }
  function pick(btn){
    if(S.locked)return;
    var isDur=S.i===QUESTIONS.length;
    content.querySelectorAll('.opt').forEach(function(b){b.setAttribute('aria-pressed','false');});
    btn.setAttribute('aria-pressed','true');
    if(isDur){
      var idx=+btn.getAttribute('data-v');
      S.durIdx=idx;S.duration=DURATION_Q.opts[idx].d;
    } else {
      S.answers[S.i]=btn.getAttribute('data-v');
      S.answers.length=S.i+1;
      /* v2.1: keep the sky neutral while answering; no hint of the result */
    }
    S.locked=true;
    later(function(){
      S.locked=false;
      if(isDur){
        S.result=resultFrom(S.answers);
        setScreen('reveal');pulse();
      } else {
        S.i++;render();
      }
    },reduceMotion.matches?150:480);
  }
  function back(){
    if(S.i===0)return;
    S.i--;
    S.answers.length=S.i;
    render();
  }
  function letGo(){
    var input=document.getElementById('dropText'), err=document.getElementById('fieldErr');
    var v=input.value.trim();
    if(!v){err.hidden=false;input.focus();return;}
    err.hidden=true;
    input.outerHTML='<p class="note"><span class="letgo">'+esc(v)+'</span></p>';
    doneMicro('วางลงแล้ว วันนี้ไม่ต้องแบกเรื่องนี้');
  }
  function ground(){
    var items=document.querySelectorAll('#steps li');
    var nowIdx=-1;items.forEach(function(li,i){if(li.classList.contains('now'))nowIdx=i;});
    if(nowIdx<0)return;
    items[nowIdx].classList.remove('now');items[nowIdx].classList.add('done');
    S.fogLeft=Math.max(0,1-(nowIdx+1)/3);
    updateFog();
    if(nowIdx+1<items.length){items[nowIdx+1].classList.add('now');}
    else{doneMicro('หมอกจางลงนิดหนึ่งแล้ว');}
  }
  function keep(){
    var input=document.getElementById('goodText'), err=document.getElementById('fieldErr');
    var v=input.value.trim();
    if(!v){err.hidden=false;input.focus();return;}
    err.hidden=true;
    try{localStorage.setItem('sky-note',v);}catch(e){}
    input.outerHTML='<p class="note">"'+esc(v)+'"</p>';
    doneMicro('เก็บไว้แล้ว เป็นข้อความถึงตัวเองในวันที่ฟ้าครึ้ม');
  }
  function primary(){
    var n=NEXT[S.result][S.duration];
    if(n.share){openShare();return;}
    toast('Prototype: ในแอปจริง ปุ่ม "'+n.primary+'" จะพาเข้าแอปปรึกษา');
  }

  content.addEventListener('click',function(e){
    var t=e.target.closest('[data-act]');if(!t)return;
    var act=t.getAttribute('data-act');
    if(act==='start')start();
    else if(act==='pick')pick(t);
    else if(act==='back')back();
    else if(act==='to-care')setScreen('care');
    else if(act==='to-reveal')setScreen('reveal');
    else if(act==='care')pickCare(t);
    else if(act==='care-remind')toast('Prototype: ในแอปจริง จะตั้งเตือนให้ลองทำตามที่เลือกไว้');
    else if(act==='micro'){S.fogLeft=1;setScreen('micro');}
    else if(act==='to-next'){S.fogLeft=1;setScreen('next');}
    else if(act==='breath-start')breathe();
    else if(act==='let-go')letGo();
    else if(act==='ground')ground();
    else if(act==='keep')keep();
    else if(act==='primary')primary();
    else if(act==='share')openShare();
    else if(act==='again')setScreen('landing');
  });
  content.addEventListener('keydown',function(e){
    if(e.key==='Enter'&&e.target.classList.contains('field')){
      e.preventDefault();
      if(e.target.id==='dropText')letGo();else keep();
    }
  });
  overlay.addEventListener('click',function(e){
    var t=e.target.closest('[data-act]');
    if(e.target===overlay){closeShare();return;}
    if(!t)return;
    if(t.getAttribute('data-act')==='share-now')shareNow();
    if(t.getAttribute('data-act')==='share-close')closeShare();
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!overlay.hidden)closeShare();});


  buildParade();
  render();
})();
