/* App logic: state, scoring, screens, scenes, result card, care pick, micro-actions, share. Uses globals from content.js */
(function(){
  'use strict';

  /* ---------- State ---------- */
  var S = {screen:'landing', who:null, i:0, answers:[], order:[], duration:null, result:null};
  var timers = [];

  var app = document.getElementById('app');
  var content = document.getElementById('content');
  var charWrap = document.getElementById('charWrap');
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

  /* ---------- v3.6 คุณคือใคร: swap the question set and the work/study wording; clouds and scoring stay the same ---------- */
  var BASE={questions:QUESTIONS,duration:DURATION_Q,scenes:SCENES,results:RESULTS,char:CHAR,about:ABOUT,card:CARD,care:CARE};
  function merge(base,over){var out={};for(var k in base){out[k]={};var b=base[k],o=(over&&over[k])||{},f;for(f in b)out[k][f]=b[f];for(f in o)out[k][f]=o[f];}return out;}
  var STUDENT_SET={questions:STUDENT.questions,duration:STUDENT.duration,scenes:STUDENT.scenes,
    results:merge(RESULTS,STUDENT.results),char:merge(CHAR,STUDENT.char),about:merge(ABOUT,STUDENT.about),card:merge(CARD,STUDENT.card),
    care:(function(){var o={};for(var k in CARE)o[k]=(STUDENT.care[k]||CARE[k]);return o;})()};
  function useWho(k){
    var set=k==='student'?STUDENT_SET:BASE;
    S.who=k;
    QUESTIONS=set.questions;DURATION_Q=set.duration;SCENES=set.scenes;RESULTS=set.results;CHAR=set.char;ABOUT=set.about;CARD=set.card;CARE=set.care;
    TOTAL=QUESTIONS.length+1;
    var sc=document.getElementById('scene');if(sc)sc.removeAttribute('data-i');
  }
  /* pictures live in assets/<work|student>/ ; the landing page shows the group chosen last time, work by default */
  function charSrc(n){return 'assets/'+(S.who||'work')+'/characters/'+n+'.jpg';}
  function charAlt(n){return S.who==='student'?CHAR_IMG_ALT_STUDENT[n]:CHAR_IMG_ALT[n];}
  function nextImg(){return S.who==='student'?NEXT_IMG_STUDENT:NEXT_IMG;}

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
    if(!k){charWrap.innerHTML='';charWrap.removeAttribute('data-k');return;}
    var c=CHAR[k];
    /* the last screen shows the app-reminder picture instead of the character */
    var key=S.screen==='next'?'next':k;
    if(charWrap.getAttribute('data-k')!==key){
      if(key==='next')charWrap.innerHTML='<img src="'+nextImg().src+'" width="900" height="672" alt="'+nextImg().alt+'" decoding="async">';
      else{var nm=c.name.toLowerCase();charWrap.innerHTML='<img src="'+charSrc(nm)+'" width="900" height="900" alt="'+charAlt(nm)+'" decoding="async">';}
      charWrap.setAttribute('data-k',key);
    }
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
    app.classList.toggle('is-landing',S.screen==='landing');
    document.body.classList.toggle('on-landing',S.screen==='landing');
    app.classList.toggle('is-question',S.screen==='question');
    app.classList.toggle('is-reveal',S.screen==='reveal');
    app.classList.toggle('is-care',S.screen==='care');
    app.classList.toggle('is-next',S.screen==='next');
    app.classList.toggle('is-micro',S.screen==='micro');
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

  /* v3.7 landing: logo, kicker, one-line title, lead, tip banner, two set cards (picture banner + topic tags + short description + button), footer note.
     Choosing a card is the start button. The characters appear only inside the card banners. */
  var IC_CLOCK='<svg class="land-ic" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5V8l2.25 1.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var IC_INFO='<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M12 11v5.25" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><circle cx="12" cy="7.75" r="1.1" fill="currentColor"/></svg>';
  function landing(){
    return ''+
      '<img class="logo hero-logo" src="'+LOGO_SRC+'" alt="mindfull" width="419" height="82">'+
      '<p class="land-kicker">'+IC_CLOCK+'เช็กอินใจ · ใช้เวลาประมาณ 2 นาที</p>'+
      '<h1 class="land-title" tabindex="-1" data-focus>วันนี้ใจคุณเป็นแบบไหน?</h1>'+
      '<p class="land-lead">ลองสังเกตความรู้สึกของตัวเองผ่าน 6 คำถาม <span class="nw">ไม่มีคำตอบถูกหรือผิด</span></p>'+
      '<aside class="land-tip"><span class="land-tip-ic">'+IC_INFO+'</span><div><p class="land-tip-t">เลือกชุดคำถามให้ตรงกับชีวิตช่วงนี้</p><p class="land-tip-s">เนื้อหาแยกตามวัย เพื่อให้สถานการณ์ใกล้ตัวและตอบได้ง่ายขึ้น</p></div></aside>'+
      '<h2 class="land-h2" id="whoH">คุณอยู่ในช่วงไหน?</h2>'+
      '<div class="who-cards" role="group" aria-labelledby="whoH">'+WHO.map(function(w){
        return '<article class="who-card">'+
          '<div class="who-pic"><img src="assets/'+w.k+'/characters/all.jpg" width="900" height="672" alt="'+w.alt+'" decoding="async"><span class="who-tags">'+w.tags.map(function(t){return '<span class="who-tag">'+t+'</span>';}).join('')+'</span></div>'+
          '<div class="who-body"><h3 class="who-t">'+w.t+'</h3><p class="who-s">'+w.d+'</p>'+
          '<button class="btn" data-act="start" data-v="'+w.k+'" aria-label="เริ่มเช็กใจเลย สำหรับ'+w.t+'">เริ่มเช็กใจเลย</button></div>'+
        '</article>';
      }).join('')+'</div>'+
      '<p class="land-foot">ไม่ต้องสมัคร · ไม่เก็บคำตอบ · ไม่ใช่การวินิจฉัย</p>';
  }

  /* v3.8 question screen (the scene picture sits in the stage above; the white sheet overlaps its lower edge): back + group tag, 'คำถามที่ n / 6' with a bar, question, answer cards with the check circle in front, footer.
     Copy of the questions and options is untouched; picking an option still moves on by itself. */
  var IC_CHECK='<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function question(){
    var isDur=S.i===QUESTIONS.length;
    var q=isDur?DURATION_Q:QUESTIONS[S.i];
    var opts=isDur?q.opts:S.order[S.i];
    var picked=isDur?S.duration:S.answers[S.i];
    var n=S.i+1;
    var who=WHO.filter(function(w){return w.k===(S.who||'work');})[0];
    var list=opts.map(function(o,idx){
      var val=isDur?idx:o.k;
      var pressed=isDur?(S.durIdx===idx):(picked===o.k);
      return '<button class="opt" aria-pressed="'+(pressed?'true':'false')+'" data-act="pick" data-v="'+val+'">'+
        '<span class="opt-s" aria-hidden="true">'+IC_CHECK+'</span><span class="opt-t">'+esc(o.t)+'</span></button>';
    }).join('');
    return ''+
      '<div class="q-top">'+(S.i>0?'<button class="back" data-act="back">ข้อก่อนหน้า</button>':'<button class="back" data-act="home">กลับหน้าแรก</button>')+'<span class="q-who">'+who.t+'</span></div>'+
      '<div class="q-prog"><p class="q-count">คำถามที่ <b>'+n+'</b> / '+TOTAL+'</p>'+
        '<div class="q-bar" role="progressbar" aria-label="ความคืบหน้า" aria-valuemin="1" aria-valuemax="'+TOTAL+'" aria-valuenow="'+n+'" aria-valuetext="คำถามที่ '+n+' จาก '+TOTAL+'"><span style="width:'+Math.round(n/TOTAL*100)+'%"></span></div></div>'+
      '<h2 class="q-text" tabindex="-1" data-focus>'+esc(q.text)+'</h2>'+
      (isDur?'':'<p class="muted q-frame">ช่วงนี้ ถ้าเจอแบบนี้ คุณน่าจะ…</p>')+
      '<div class="opts" role="group" aria-label="ตัวเลือก">'+list+'</div>'+
      /* footer: short rule, wordmark, reminder that this is not a diagnosis */
      '<div class="q-foot"><hr class="hero-rule"><img class="logo q-logo" src="'+LOGO_SRC+'" alt="mindfull" width="419" height="82"><p class="q-note">เป็นแค่การเช็กความรู้สึก ไม่ใช่การวินิจฉัยนะ</p></div>';
  }

  /* v3.9 result page: character picture on top (stage), badge, name, role + cloud type, feeling overview card, 'small step' card with the main CTA,
     folded 'know more' section, closing sentence box, share + next-step, footer. All copy comes from CHAR / ABOUT / CARD / RESULTS. */
  function reveal(){
    var r=RESULTS[S.result], c=CHAR[S.result], k=CARD[S.result], a=ABOUT[S.result];
    var sci=String(c.cloud).split(' | ')[0];
    return ''+
      '<div class="res-head">'+
        '<p class="res-badge">ผลเช็กใจของคุณ · วันนี้</p>'+
        '<h2 class="res-name" tabindex="-1" data-focus>'+c.name+'</h2>'+
        '<p class="res-role">'+c.title+'</p>'+
        '<p class="res-type"><span class="res-chip">'+r.name+'</span><span class="res-sci">'+sci+'</span></p>'+
        '<p class="res-kicker">นี่คือใจคุณช่วงนี้ เมฆลอยผ่านไปได้ พรุ่งนี้อาจเป็นเมฆตัวอื่น</p>'+
      '</div>'+
      '<section class="res-card res-about" aria-labelledby="aboutH"><p class="res-label" id="aboutH">ภาพรวมความรู้สึก</p><p class="res-body">'+a.a+'</p></section>'+
      '<section class="res-card res-step" aria-labelledby="stepH"><p class="res-label" id="stepH">ก้าวเล็กๆ ที่เริ่มได้</p>'+
        '<h3 class="res-step-t">อยากลองดูแลใจตัวเองไหม?</h3>'+
        '<p class="res-desc">เลือกสิ่งเล็กๆ ที่ช่วยดูแลใจ ลองตอนนี้ 20&nbsp;วินาที หรือนัดตัวเองไว้คืนนี้ สัปดาห์นี้</p>'+
        '<button class="btn" data-act="to-care">เลือกวิธีดูแลใจ</button>'+
      '</section>'+
      '<details class="res-more"><summary>รู้จัก '+c.name+' ให้มากขึ้น</summary><div class="res-more-body">'+
        '<section class="res-sub" aria-label="พลังพิเศษ"><p class="res-label">พลังพิเศษ</p><p class="res-pname">"'+c.power+'" <span>('+c.en+')</span></p><p>'+c.p+'</p></section>'+
        (S.who==='student'&&a.sg?'<section class="res-sub" aria-label="สัญญาณที่พบบ่อย"><p class="res-label">สัญญาณที่พบบ่อย</p><ul class="res-list">'+a.sg.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></section>':'')+
        '<div class="res-pair">'+
          '<section class="res-sub"><p class="res-label">ข้อดีที่ '+c.name+' พามาด้วย</p><p>'+k.st+'</p></section>'+
          '<section class="res-sub warn"><p class="res-label">เมื่อพลังล้น</p><p>'+k.ov+'</p></section>'+
        '</div>'+
        '<section class="res-sub res-buddy" aria-label="เพื่อนซี้"><div class="buddy-av" aria-hidden="true"><img src="'+charSrc(CHAR[c.buddy].name.toLowerCase())+'" width="72" height="72" alt="" decoding="async"></div><div><p class="res-label">เพื่อนซี้</p><p class="res-bname">'+CHAR[c.buddy].name+'</p><p>'+c.bnote+'</p></div></section>'+
      '</div></details>'+
      '<blockquote class="res-quote">"'+r.reframe+'"</blockquote>'+
      '<div class="actions">'+
        '<button class="btn ghost" data-act="share">แชร์ผลลัพธ์นี้</button>'+
        '<button class="link" data-act="to-next">ดูก้าวต่อไป</button>'+
      '</div>'+
      '<div class="q-foot"><hr class="hero-rule"><img class="logo q-logo" src="'+LOGO_SRC+'" alt="mindfull" width="419" height="82"><p class="q-note">เป็นแค่การเช็กความรู้สึก ไม่ใช่การวินิจฉัยนะ</p></div>';
  }

  /* How to ดูแล: its own screen, reached from the result card's main CTA */
  /* v3.10 How to ดูแล: back + group tag, label, heading, lead, three time cards (check circle, time tag, text; the picked night / week card also shows 'ฉันจะลอง:' in front of its text), follow-up area that only appears after a pick, footer.
     Texts come from CARE[...] and WHEN unchanged; the card size does not change when one is picked. */
  function care(){
    var c=CHAR[S.result];
    var who=WHO.filter(function(w){return w.k===(S.who||'work');})[0];
    return ''+
      '<div class="q-top"><button class="back" data-act="to-reveal">กลับไปดูผลลัพธ์</button><span class="q-who">'+who.t+'</span></div>'+
      '<div class="care-head"><p class="care-eyebrow" id="careH">HOW TO ดูแล · '+c.name+'</p>'+
        '<h2 tabindex="-1" data-focus>เลือกหนึ่งอย่างที่คุณจะลอง</h2>'+
        '<p class="care-lead">เลือกตามเวลาและแรงที่มี ไม่จำเป็นต้องทำทุกข้อ</p></div>'+
      '<div class="care-opts" role="radiogroup" aria-labelledby="careH">'+CARE[S.result].map(function(t,i){
        var on=S.carePick===i;
        return '<button class="care-opt" role="radio" aria-checked="'+on+'" data-act="care" data-v="'+i+'">'+
          '<span class="care-s" aria-hidden="true">'+IC_CHECK+'</span>'+
          '<span class="care-body"><span class="care-when">'+WHEN[i]+'</span><span class="care-text">'+(i>0?'<span class="care-will">ฉันจะลอง: </span>':'')+t+'</span></span></button>';
      }).join('')+'</div>'+
      '<div class="actions" id="careFollow" aria-live="polite">'+careFollow()+'</div>'+
      '<div class="q-foot"><hr class="hero-rule"><img class="logo q-logo" src="'+LOGO_SRC+'" alt="mindfull" width="419" height="82"><p class="q-note">เป็นแค่การเช็กความรู้สึก ไม่ใช่การวินิจฉัยนะ</p></div>';
  }
  function careFollow(){
    var skip='<button class="link" data-act="to-next">ไปที่ก้าวต่อไป</button>';
    if(S.carePick==null)return skip;
    if(S.carePick===0)return '<button class="btn" data-act="micro">เริ่มเลย 20 วินาที</button>'+skip;
    return '<button class="btn" data-act="to-next">ไปที่ก้าวต่อไป</button>'+
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
        '<input class="field" id="dropText" maxlength="80" placeholder="'+(S.who==='student'?STUDENT.dropHint:'เช่น ตอบแชตงานหลังสองทุ่ม')+'" autocomplete="off">'+
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
      '<p>'+r.microIntro+'</p>'+inner+
      '<div class="q-foot"><hr class="hero-rule"><img class="logo q-logo" src="'+LOGO_SRC+'" alt="mindfull" width="419" height="82"><p class="hero-note">เป็นแค่การเช็กความรู้สึก ไม่ใช่การวินิจฉัยนะ</p></div>';
  }

  function doneMicro(msgHtml){
    var a=document.getElementById('microActions');
    if(a)a.innerHTML=(msgHtml?'<p class="note">'+msgHtml+'</p>':'')+'<button class="btn" data-act="to-next">ไปที่ก้าวต่อไป</button>';
    var b=a&&a.querySelector('.btn');if(b)b.focus();
  }

  function nextStep(){
    var k=S.result, c=CHAR[k], n=NEXT[k][S.duration];
    /* a short recap of the visit: today's cloud, what they chose to try, and the next step */
    var rows='';
    if(S.carePick!=null)rows+='<div class="sum-row pick"><p class="mym-label">สิ่งที่จะลอง · '+WHEN[S.carePick].split(' ·')[0]+'</p><p>'+CARE[k][S.carePick]+'</p></div>';
    var recap='<section class="summary" aria-label="สรุปใจคุณวันนี้">'+
      '<div class="sum-head"><div class="buddy-av" aria-hidden="true"><img src="'+charSrc(c.name.toLowerCase())+'" width="56" height="56" alt="" decoding="async"></div>'+
      '<div><p class="bname">'+c.name+'</p><p class="muted">'+c.title+'</p></div></div>'+rows+
      /* Figma keeps the next step inside the same card */
      '<div class="sum-row sum-next"><p class="mym-label">ก้าวต่อไป</p><p>'+n.body+'</p></div></section>';
    return ''+
      '<div class="head"><button class="back" data-act="to-reveal">กลับไปที่ผลลัพธ์</button><span></span></div>'+
      '<h2 tabindex="-1" data-focus>สรุปใจคุณวันนี้</h2>'+
      recap+
      '<div class="actions">'+
        '<button class="btn" data-act="primary">'+n.primary+'</button>'+
        (n.share?'':'<button class="btn ghost" data-act="share">ส่งการ์ด '+c.name+' ให้เพื่อน</button>')+
        '<button class="link" data-act="again">เล่นอีกครั้ง</button>'+
      '</div>'+
      '<div class="q-foot"><hr class="hero-rule"><img class="logo q-logo" src="'+LOGO_SRC+'" alt="mindfull" width="419" height="82"><p class="hero-note">เป็นแค่การเช็กความรู้สึก ไม่ใช่การวินิจฉัยนะ</p></div>';
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
      '<div class="share-sky"><img src="'+charSrc(CHAR[k].name.toLowerCase())+'" width="900" height="900" alt="'+charAlt(CHAR[k].name.toLowerCase())+'" decoding="async"></div>'+
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
  function copyShare(text){
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(function(){toast('คัดลอกข้อความแล้ว วางในแชตหรือสตอรี่ได้เลย');},function(){toast('ในเวอร์ชันจริง ปุ่มนี้จะเปิดหน้าแชร์ของมือถือ');});
    else toast('ในเวอร์ชันจริง ปุ่มนี้จะเปิดหน้าแชร์ของมือถือ');
  }
  function shareNow(){
    var r=RESULTS[S.result];
    var c=CHAR[S.result];var text='วันนี้ '+c.name+' ('+c.title+') มาเยือนฉัน ลองดูว่าเพื่อนเมฆตัวไหนมาเยือนคุณ ใช้เวลาแค่ 2 นาที';
    /* if the share sheet is refused (e.g. inside an embedded frame), fall back to copying the text */
    if(navigator.share){
      navigator.share({title:'ท้องฟ้าในใจวันนี้',text:text}).catch(function(e){if(!e||e.name!=='AbortError')copyShare(text);});
    } else if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){toast('คัดลอกข้อความแล้ว วางในแชตหรือสตอรี่ได้เลย');},function(){toast('ในเวอร์ชันจริง ปุ่มนี้จะเปิดหน้าแชร์ของมือถือ');});
    } else {
      toast('ในเวอร์ชันจริง ปุ่มนี้จะเปิดหน้าแชร์ของมือถือ');
    }
  }

  /* ---------- Actions ---------- */
  function start(btn){
    useWho((btn&&btn.getAttribute('data-v'))||'work');
    S.i=0;S.carePick=null;S.answers=[];S.duration=null;S.durIdx=null;S.result=null;
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
    if(act==='start')start(t);
    else if(act==='pick')pick(t);
    else if(act==='back')back();
    else if(act==='to-care')setScreen('care');
    else if(act==='to-reveal')setScreen('reveal');
    else if(act==='care')pickCare(t);
    else if(act==='care-remind')toast('Prototype: ในแอปจริง จะตั้งเตือนให้ลองทำตามที่เลือกไว้');
    else if(act==='micro')setScreen('micro');
    else if(act==='to-next')setScreen('next');
    else if(act==='breath-start')breathe();
    else if(act==='let-go')letGo();
    else if(act==='ground')ground();
    else if(act==='keep')keep();
    else if(act==='primary')primary();
    else if(act==='share')openShare();
    else if(act==='again')setScreen('landing');
    else if(act==='home')setScreen('landing');
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


  render();
})();
