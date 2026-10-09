/* App logic: state, scoring, screens, parade, scenes, result card, care pick, micro-actions, share. Uses globals from content.js */
(function(){
  'use strict';

  /* ---------- State ---------- */
  var S = {screen:'landing', i:0, answers:[], order:[], duration:null, result:null, fogLeft:1};
  var weights = {neutral:1};
  var timers = [];

  var app = document.getElementById('app');
  var content = document.getElementById('content');
  var svg = document.getElementById('cloud');
  var breather = document.getElementById('breather');
  var charWrap = document.getElementById('charWrap'), charFog = document.getElementById('charFog');
  var body = document.getElementById('body');
  var puffs = document.getElementById('puffs');
  var overlay = document.getElementById('overlay');
  var shareCard = document.getElementById('shareCard');
  var toastEl = document.getElementById('toast');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Helpers ---------- */
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function clamp(v){return Math.max(0,Math.min(1,v));}
  function later(fn,ms){var t=setTimeout(fn,ms);timers.push(t);return t;}
  function clearTimers(){timers.forEach(clearTimeout);timers=[];}
  function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function hexToRgb(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  function mix(map,w){
    var r=0,g=0,b=0;
    Object.keys(w).forEach(function(k){var c=hexToRgb(map[k]);r+=c[0]*w[k];g+=c[1]*w[k];b+=c[2]*w[k];});
    return 'rgb('+Math.round(r)+','+Math.round(g)+','+Math.round(b)+')';
  }
  function toast(msg){
    toastEl.textContent=msg;toastEl.classList.add('show');
    clearTimeout(toast._t);toast._t=setTimeout(function(){toastEl.classList.remove('show');},2600);
  }

  /* ---------- Scoring ---------- */
  function weightsFrom(list, damp){
    if(!list.length)return {neutral:1};
    var E=0,P=0;list.forEach(function(k){E+=AXES[k].e;P+=AXES[k].p;});
    var d=damp?list.length+1:list.length, e=E/d, p=P/d;
    return {
      storm:((1+e)/2)*((1+p)/2), rain:((1-e)/2)*((1+p)/2),
      fog:((1-e)/2)*((1-p)/2), fluffy:((1+e)/2)*((1-p)/2)
    };
  }
  function resultFrom(list){
    var E=0,P=0;list.forEach(function(k){E+=AXES[k].e;P+=AXES[k].p;});
    if(E>0&&P>0)return 'storm';
    if(E<0&&P>0)return 'rain';
    if(E<0&&P<0)return 'fog';
    return 'fluffy';
  }
  function oneHot(k){var w={};w[k]=1;return w;}

  /* ---------- Cloud ---------- */
  function drawCloud(w){
    weights=w;
    var pal=PALETTE;
    /* page background stays gray-50 (design system); the sky colour lives only in illustration panels */
    puffs.style.fill=mix(pal.cloud,w);
    var ws=w.storm||0, wr=w.rain||0, wf=w.fog||0, wl=w.fluffy||0, wn=w.neutral||0;
    var sx=wn+ws*1.04+wr*1.0+wf*1.12+wl*1.05;
    var sy=wn+ws*1.1+wr*0.9+wf*0.84+wl*1.05;
    body.style.transform='scale('+sx.toFixed(3)+','+sy.toFixed(3)+')';
    body.style.opacity=(1-0.18*wf).toFixed(2);
    document.getElementById('rainFx').style.opacity=clamp(wr*1.6-0.3);
    document.getElementById('boltFx').style.opacity=ws>0.45?clamp(ws*1.3):0;
    document.getElementById('fogFx').style.opacity=clamp(wf*1.5-0.2)*S.fogLeft;
    document.getElementById('sunFx').style.opacity=clamp(wl*1.5-0.3);
    var a=16*ws-14*wr-5*(wl+wn);
    document.getElementById('browL').style.transform='rotate('+a.toFixed(1)+'deg)';
    document.getElementById('browR').style.transform='rotate('+(-a).toFixed(1)+'deg)';
    var ey=1-0.6*wf-0.12*wr+0.08*ws;
    document.querySelectorAll('.eye').forEach(function(e){e.style.transform='scaleY('+ey.toFixed(2)+')';});
    var cheek=(0.15+0.5*(wl+wn)).toFixed(2);
    document.getElementById('cheekL').setAttribute('opacity',cheek);
    document.getElementById('cheekR').setAttribute('opacity',cheek);
    var mouth='smile';
    if(!wn){
      var best=['storm','rain','fog','fluffy'].reduce(function(m,k){return (w[k]||0)>(w[m]||0)?k:m;},'fluffy');
      mouth={storm:'tense',rain:'frown',fog:'flat',fluffy:'smile'}[best];
      svg.setAttribute('aria-label','ก้อนเมฆตอนนี้ใกล้เคียง'+RESULTS[best].name);
    } else {
      svg.setAttribute('aria-label','ก้อนเมฆสีขาวยิ้มเล็กน้อย');
    }
    document.querySelectorAll('.mouth').forEach(function(m){m.style.opacity=m.getAttribute('data-m')===mouth?1:0;});
  }
  function pulse(){
    var el=app.classList.contains('show-char')?charWrap:breather;
    if(reduceMotion.matches||!el.animate)return;
    el.animate([{transform:'scale(1)'},{transform:'scale(1.07)'},{transform:'scale(1)'}],{duration:700,easing:'ease-out'});
  }

  function showChar(k){
    app.classList.toggle('show-char',!!k);
    if(!k)buildParade();
    if(!k){charWrap.innerHTML='';charFog.style.opacity=0;return;}
    var c=CHAR[k];
    if(charWrap.getAttribute('data-k')!==k){charWrap.innerHTML=CHAR_SVG[c.name];charWrap.setAttribute('data-k',k);}
    updateFog();
  }
  function buildParade(){
    var el=document.getElementById('parade');
    if(el.getAttribute('data-built'))return;
    var names=['Cumulo','Nimbo','Strato','Humi'];
    el.innerHTML='<span class="parade-hint">ใครจะมาเยือนคุณ เฉลยตอนจบ</span>'+names.map(function(n){
      return '<div class="walker">'+CHAR_SVG[n]+'</div>';
    }).join('');
    el.setAttribute('data-built','1');
  }
  function updateFog(){
    charFog.style.opacity=(S.result==='fog'&&S.screen==='micro')?(0.9*S.fogLeft).toFixed(2):0;
  }

  /* ---------- Screens ---------- */
  function setScreen(name){
    clearTimers();
    breather.classList.remove('inhale','exhale');charWrap.classList.remove('inhale','exhale');
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
      '<h1 tabindex="-1" data-focus>วันนี้เพื่อนเมฆตัวไหนจะมาเยือนคุณ?</h1>'+
      '<p>ตอบ 6 คำถามจากเรื่องงานที่หลายคนเคยเจอ แล้วพบกับเพื่อนเมฆที่มาเยือนใจคุณวันนี้ พร้อมพลังพิเศษและวิธีดูแลที่ทำได้ทันที</p>'+
      '<p class="muted">ใช้เวลาราว 2 นาที ไม่ต้องสมัครสมาชิก และไม่เก็บคำตอบของคุณ</p>'+
      '<div class="actions">'+
        '<button class="btn" data-act="start">เริ่มเลย</button>'+
        '<p class="muted" style="text-align:center">นี่เป็นการสำรวจความรู้สึก ไม่ใช่การวินิจฉัย</p>'+
      '</div>';
  }

  function head(){
    var dots='';for(var i=0;i<TOTAL;i++)dots+='<span class="dot'+(i<=S.i?' on':'')+'"></span>';
    return '<div class="head">'+
      (S.i>0?'<button class="back" data-act="back">ย้อนกลับ</button>':'<span></span>')+
      '<div class="progress"><span>ข้อ '+(S.i+1)+' จาก '+TOTAL+'</span><span class="dots" aria-hidden="true">'+dots+'</span></div>'+
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
      (isDur?'<p class="muted durhint">ข้อนี้ไม่เปลี่ยนเพื่อนเมฆที่จะมาเยือน แต่ช่วยให้เราแนะนำก้าวต่อไปได้พอดีกับคุณ</p>':'')+
      '<div class="opts" role="group" aria-label="ตัวเลือก">'+list+'</div>';
  }

  function reveal(){
    var r=RESULTS[S.result], c=CHAR[S.result], k=CARD[S.result], a=ABOUT[S.result];
    return ''+
      '<div class="mym-head">'+
        '<p class="mym-kicker">วันนี้มาเยือนคุณ</p>'+
        '<h2 class="mym-name" tabindex="-1" data-focus>'+c.name+'</h2>'+
        '<p class="mym-title">'+c.title+'</p>'+
        '<p class="mym-type">'+c.cloud+'</p>'+
      '</div>'+
      '<section class="mym-about" aria-label="รู้จัก '+c.name+'"><p class="mym-label">รู้จัก '+c.name+'</p><p>'+a.a+'</p>'+'</section>'+
      '<section class="mym-power" aria-label="พลังพิเศษ"><p class="mym-label">พลังพิเศษ</p><p class="mym-pname">"'+c.power+'" <span>('+c.en+')</span></p><p class="mym-ptext">'+c.p+'</p></section>'+
      '<div class="mym-pair">'+
        '<section class="mym-cell"><p class="mym-label">จุดเด่น</p><p>'+k.st+'</p></section>'+
        '<section class="mym-cell warn"><p class="mym-label">เมื่อพลังล้น</p><p>'+k.ov+'</p></section>'+
      '</div>'+
      '<section class="mym-care" aria-labelledby="careH"><p class="mym-label" id="careH">How to ดูแล '+c.name+'</p>'+
        '<p class="mym-ptext">เลือกวิธีดูแลตัวเองเล็กๆ หนึ่งอย่าง จะลองตอนนี้ 20 วินาที คืนนี้ หรือสัปดาห์นี้ก็ได้</p>'+
        '<button class="btn" data-act="to-care">เลือกวิธีดูแล '+c.name+'</button>'+
      '</section>'+
      '<p class="mym-quote">"'+r.reframe+'"</p>'+
      '<div class="buddy mym-buddy"><div class="buddy-av" style="background:'+PALETTE.sky[c.buddy]+'" aria-hidden="true">'+CHAR_SVG[CHAR[c.buddy].name]+'</div><div><p class="mym-label">เพื่อนซี้</p><p class="bname">'+CHAR[c.buddy].name+'</p><p class="muted">'+c.bnote+'</p></div></div>'+
      '<div class="actions">'+
        '<button class="btn ghost" data-act="share">ส่งการ์ด '+c.name+' ให้เพื่อน</button>'+
        '<button class="link" data-act="to-next">ไปที่ก้าวต่อไป</button>'+
      '</div>'+
      '<p class="muted" style="text-align:center">เมฆลอยผ่านไปได้เสมอ พรุ่งนี้อาจมีเพื่อนเมฆตัวอื่นมาเยือน</p>';
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
    return '<p class="muted">How to ดูแล '+CHAR[k].name+' ใช้เวลา 20 วินาที</p>'+
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
  function miniCloud(k){
    var pal=PALETTE;
    var fill=pal.cloud[k];
    var mouth={storm:'M142 166 L147 162 L153 167 L159 162 L164 166',rain:'M144 168 Q153 160 162 168',fog:'M145 165 L161 165',fluffy:'M144 162 Q153 170 162 162'}[k];
    var fx='';
    if(k==='rain')fx='<g stroke="#62A0E9" stroke-width="3" stroke-linecap="round"><line x1="110" y1="208" x2="106" y2="220"/><line x1="150" y1="212" x2="146" y2="224"/><line x1="190" y1="208" x2="186" y2="220"/></g>';
    if(k==='storm')fx='<polygon points="160,202 146,222 156,222 149,238 172,214 161,214 168,202" fill="#ECB226"/>';
    if(k==='fluffy')fx='<circle cx="234" cy="56" r="30" fill="#F4D280"/>';
    if(k==='fog')fx='<g fill="#FFFFFF" opacity=".7"><rect x="24" y="150" width="252" height="14" rx="7"/><rect x="54" y="184" width="210" height="12" rx="6"/></g>';
    var a={storm:16,rain:-14,fog:0,fluffy:-5}[k];
    var ey={storm:1.08,rain:0.88,fog:0.4,fluffy:1}[k];
    return '<svg viewBox="0 0 300 240" aria-hidden="true">'+
      (k==='fluffy'?fx:'')+
      '<g fill="'+fill+'"><circle cx="95" cy="128" r="52"/><circle cx="150" cy="102" r="66"/><circle cx="208" cy="126" r="52"/><circle cx="70" cy="156" r="36"/><circle cx="236" cy="156" r="36"/><rect x="70" y="128" width="166" height="64" rx="32"/></g>'+
      '<g fill="#26313C"><ellipse cx="130" cy="140" rx="6.5" ry="'+(9.5*ey)+'"/><ellipse cx="176" cy="140" rx="6.5" ry="'+(9.5*ey)+'"/></g>'+
      '<g stroke="#26313C" stroke-width="5" stroke-linecap="round"><path d="M121 123 L140 123" transform="rotate('+a+' 130.5 123)"/><path d="M166 123 L185 123" transform="rotate('+(-a)+' 175.5 123)"/></g>'+
      '<path d="'+mouth+'" fill="none" stroke="#26313C" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'+
      (k!=='fluffy'?fx:'')+
    '</svg>';
  }
  function openShare(){
    var k=S.result, r=RESULTS[k], pal=PALETTE;
    shareCard.innerHTML=''+
      '<div class="share-sky" style="background:'+pal.sky[k]+'">'+CHAR_SVG[CHAR[k].name]+'</div>'+
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
    drawCloud({neutral:1});
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
        drawCloud(oneHot(S.result));
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
    drawCloud(weights);updateFog();
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
    else if(act==='to-next'){S.fogLeft=1;drawCloud(oneHot(S.result));setScreen('next');}
    else if(act==='breath-start')breathe();
    else if(act==='let-go')letGo();
    else if(act==='ground')ground();
    else if(act==='keep')keep();
    else if(act==='primary')primary();
    else if(act==='share')openShare();
    else if(act==='again'){drawCloud({neutral:1});setScreen('landing');}
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


  drawCloud({neutral:1});
  buildParade();
  render();
})();
