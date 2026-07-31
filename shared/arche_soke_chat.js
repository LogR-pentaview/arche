/* ============================================================================
 * arche_soke_chat.js · 소크(Soke) 소크라테스식 발문 챗봇 오버레이
 * ----------------------------------------------------------------------------
 * 목적: 워크북 '생각해 보기' 지점에서 학생이 막히면 소크가 정답 대신 '발문'으로
 *       스스로 답에 다가가도록 돕는 채팅 오버레이. edge function `soke` 호출.
 *  · 정답/대필 금지(프롬프트+서버에서 강제). 응답은 질문(발문) 형태.
 *  · 회차(lesson)당 발문 횟수 제한 + 티어별 차등(무제한은 상위 티어/추가과금).
 *  · 스킨: vision(골드) / track(라임) / 기본(블루). JS 참조 클래스명 보존.
 * API:
 *   ArcheSoke.open({
 *     stage, level, topic, question,      // 맥락(서버 프롬프트에 전달)
 *     getPartial : ()=>string,            // 학생이 쓰던 답 스냅샷(대필 아님, 참고용)
 *     skin       : 'vision'|'track'|'',   // 색 스킨(미지정=블루)
 *     studentId, lessonKey,               // 사용량 카운트 키(미지정 시 window 전역 사용)
 *     tier       : 'trial'|'vision'|'track'|'allinone',  // 티어(미지정 시 자동 추정)
 *     limit                               // 강제 상한(미지정 시 티어별 기본)
 *   })
 *   ArcheSoke.remaining(ctx) → number     // 남은 발문 수(버튼 배지용)
 * ==========================================================================*/
(function () {
  "use strict";
  var PROJECT_URL = 'https://dvxepjctjazobrkjrkdw.supabase.co';
  var AVATAR = '/shared/soke_avatar.png';
  // 티어별 회차당 발문 상한(차등). allinone/무제한권은 큰 값. 필요시 조정.
  var TIER_CAP = { trial: 3, none: 3, vision: 8, track: 10, allinone: 15, unlimited: 999 };
  var DEFAULT_CAP = 10;

  function sb(){ return window.sb; }
  function esc(s){ return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }

  function resolveTier(t){
    if(t) return String(t).toLowerCase();
    // 전역 힌트로 자동 추정(있으면). 없으면 track 기준.
    var g = (window._pentaTier || window._pentaPlan || window._activePlan || '').toString().toLowerCase();
    if(g.indexOf('allinone')>=0 || g.indexOf('올인원')>=0) return 'allinone';
    if(g.indexOf('track')>=0 || g.indexOf('트랙')>=0) return 'track';
    if(g.indexOf('vision')>=0 || g.indexOf('비전')>=0) return 'vision';
    if(g.indexOf('trial')>=0 || g.indexOf('체험')>=0) return 'trial';
    return 'track';
  }
  function capOf(ctx){
    if(ctx && isFinite(+ctx.limit) && +ctx.limit>0) return +ctx.limit;
    var t = resolveTier(ctx && ctx.tier);
    return TIER_CAP[t] != null ? TIER_CAP[t] : DEFAULT_CAP;
  }
  function usageKey(ctx){
    var sid = (ctx && ctx.studentId) || window._activeStudent || window._activeStudentId || 'anon';
    var lk  = (ctx && ctx.lessonKey) || (ctx && ((ctx.stage||'')+':'+(ctx.topic||''))) || 'lesson';
    return 'soke_used:'+sid+':'+lk;
  }
  function usedCount(ctx){ try{ return +(localStorage.getItem(usageKey(ctx))||0)||0; }catch(e){ return 0; } }
  function bumpUsed(ctx){ try{ var n=usedCount(ctx)+1; localStorage.setItem(usageKey(ctx),String(n)); return n; }catch(e){ return usedCount(ctx)+1; } }
  function remaining(ctx){ return Math.max(0, capOf(ctx)-usedCount(ctx)); }

  async function token(){ try{ var s=await sb().auth.getSession(); return (s&&s.data&&s.data.session)?s.data.session.access_token:''; }catch(e){ return ''; } }

  async function callSoke(payload){
    var url=(window.SB_URL||PROJECT_URL)+'/functions/v1/soke';
    var tok=await token();
    var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify(payload)});
    var d=await r.json().catch(function(){return {};});
    if(!r.ok) throw new Error(d.error||('오류('+r.status+')'));
    return d.reply||'';
  }

  var CSS = `
.soke-ov{position:fixed;inset:0;z-index:100000;background:rgba(14,19,34,.55);display:flex;align-items:flex-end;justify-content:center;-webkit-tap-highlight-color:transparent}
.soke-ov *{box-sizing:border-box;font-family:'Pretendard Variable',Pretendard,-apple-system,BlinkMacSystemFont,sans-serif}
.soke-sheet{--acc:#3182f6;--acc-d:#1b64da;--accsoft:#eaf2ff;--ink:#191f28;--dim:#4e5968;--line:#e9ecf1;
  width:100%;max-width:480px;background:#f6f8fb;border-radius:20px 20px 0 0;display:flex;flex-direction:column;
  max-height:86vh;min-height:60vh;overflow:hidden;box-shadow:0 -10px 40px -12px rgba(20,26,41,.5);animation:sokeup .28s cubic-bezier(.2,.8,.2,1)}
.soke-sheet.vision{--acc:#c8a24a;--acc-d:#a9852f;--accsoft:#f7efdb}
.soke-sheet.track{--acc:#6fa81c;--acc-d:#5c8f16;--accsoft:#eef7db}
@keyframes sokeup{from{transform:translateY(28px);opacity:.4}to{transform:none;opacity:1}}
.soke-hd{display:flex;align-items:center;gap:11px;padding:13px 15px;background:linear-gradient(135deg,#1b2440,#141a29);color:#fff;position:relative}
.soke-av{width:42px;height:42px;flex:none;border-radius:50%;object-fit:cover;background:var(--accsoft);border:2px solid rgba(255,255,255,.25)}
.soke-avf{width:42px;height:42px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:23px;background:var(--accsoft);border:2px solid rgba(255,255,255,.25)}
.soke-hd h4{margin:0;font-size:15px;font-weight:800;letter-spacing:-.01em}
.soke-hd small{display:block;color:#b9c3da;font-size:11px;font-weight:600;margin-top:2px}
.soke-x{position:absolute;top:11px;right:12px;width:30px;height:30px;border:none;border-radius:9px;background:rgba(255,255,255,.12);color:#fff;font-size:16px;cursor:pointer;display:grid;place-items:center}
.soke-ctx{padding:9px 15px;background:var(--accsoft);color:var(--acc-d);font-size:12px;font-weight:700;border-bottom:1px solid var(--line);display:flex;gap:6px;align-items:flex-start;line-height:1.5}
.soke-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px 14px 8px;display:flex;flex-direction:column;gap:11px}
.soke-row{display:flex;gap:8px;align-items:flex-end;max-width:88%}
.soke-row.s{align-self:flex-start}
.soke-row.u{align-self:flex-end;flex-direction:row-reverse}
.soke-mav{width:28px;height:28px;flex:none;border-radius:50%;object-fit:cover;background:var(--accsoft)}
.soke-mavf{width:28px;height:28px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:15px;background:var(--accsoft)}
.soke-bub{padding:10px 13px;border-radius:15px;font-size:14.5px;line-height:1.65;color:var(--ink);word-break:keep-all;overflow-wrap:break-word;white-space:pre-wrap}
.soke-row.s .soke-bub{background:#fff;border:1px solid var(--line);border-bottom-left-radius:5px;box-shadow:0 1px 3px rgba(20,26,41,.05)}
.soke-row.u .soke-bub{background:var(--acc);color:#fff;border-bottom-right-radius:5px}
.soke-typ{display:inline-flex;gap:4px;padding:12px 14px}
.soke-typ i{width:7px;height:7px;border-radius:50%;background:#c3ccd8;animation:sokebl 1s infinite}
.soke-typ i:nth-child(2){animation-delay:.15s}.soke-typ i:nth-child(3){animation-delay:.3s}
@keyframes sokebl{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
.soke-note{align-self:center;text-align:center;color:var(--dim);font-size:11.5px;background:#eef1f5;padding:6px 12px;border-radius:20px;margin:2px 0}
.soke-ft{padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid var(--line)}
.soke-cap{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--dim);margin:0 4px 7px;font-weight:600}
.soke-cap b{color:var(--acc-d)}
.soke-inrow{display:flex;gap:8px;align-items:flex-end}
.soke-in{flex:1;border:1.5px solid var(--line);border-radius:14px;padding:11px 13px;font-size:15px;line-height:1.5;resize:none;max-height:96px;background:#fbfcfe;color:var(--ink);-webkit-appearance:none}
.soke-in:focus{outline:none;border-color:var(--acc);background:#fff;box-shadow:0 0 0 3px var(--accsoft)}
.soke-send{flex:none;width:46px;height:46px;border:none;border-radius:14px;background:var(--acc);color:#fff;font-size:18px;cursor:pointer;display:grid;place-items:center}
.soke-send:disabled{background:#c3ccd8;cursor:not-allowed}
.soke-lock{padding:13px;text-align:center;color:var(--dim);font-size:13px;line-height:1.6}
.soke-lock b{color:var(--acc-d)}
`;

  function injectCSS(){ if(document.getElementById('soke-css'))return; var s=document.createElement('style'); s.id='soke-css'; s.textContent=CSS; document.head.appendChild(s); }

  function avImg(cls, fallCls){
    return '<img class="'+cls+'" src="'+AVATAR+'" alt="소크" '
      + 'onerror="this.outerHTML=\'<span class=&quot;'+fallCls+'&quot;>🧔</span>\'">';
  }

  function open(opts){
    injectCSS();
    var ctx = opts||{};
    var skin = (ctx.skin==='vision'||ctx.skin==='track')?ctx.skin:'';
    var cap = capOf(ctx);
    var messages = [];   // {role:'soke'|'student', content}
    var busy=false, closed=false;

    var ov=document.createElement('div'); ov.className='soke-ov';
    ov.innerHTML =
      '<div class="soke-sheet '+skin+'">'
      + '<div class="soke-hd">'+avImg('soke-av','soke-avf')
        + '<div><h4>소크 <span style="font-weight:600;font-size:12px;opacity:.85">· 함께 생각하기</span></h4>'
        + '<small>정답은 안 알려줘. 대신 질문으로 도와줄게 🤔</small></div>'
        + '<button class="soke-x" aria-label="닫기">✕</button></div>'
      + (ctx.question? '<div class="soke-ctx">📌<span>'+esc(ctx.question)+'</span></div>' : '')
      + '<div class="soke-body"></div>'
      + '<div class="soke-ft"></div>'
      + '</div>';

    var sheet=ov.querySelector('.soke-sheet');
    var body=ov.querySelector('.soke-body');
    var foot=ov.querySelector('.soke-ft');

    function close(){ if(closed)return; closed=true; ov.remove(); }
    ov.querySelector('.soke-x').addEventListener('click', close);
    ov.addEventListener('click', function(e){ if(e.target===ov) close(); });

    function scrollDown(){ body.scrollTop = body.scrollHeight; }

    function addBubble(role, text){
      var row=document.createElement('div'); row.className='soke-row '+(role==='student'?'u':'s');
      if(role==='soke') row.innerHTML=avImg('soke-mav','soke-mavf');
      var bub=document.createElement('div'); bub.className='soke-bub'; bub.textContent=text;
      row.appendChild(bub); body.appendChild(row); scrollDown(); return bub;
    }
    function addNote(text){ var n=document.createElement('div'); n.className='soke-note'; n.textContent=text; body.appendChild(n); scrollDown(); }
    function showTyping(){
      var row=document.createElement('div'); row.className='soke-row s'; row.dataset.typing='1';
      row.innerHTML=avImg('soke-mav','soke-mavf')+'<div class="soke-bub" style="padding:0"><div class="soke-typ"><i></i><i></i><i></i></div></div>';
      body.appendChild(row); scrollDown(); return row;
    }

    function payload(){
      return { messages: messages.slice(-12), stage: ctx.stage||'', level: ctx.level||'',
        topic: ctx.topic||'', question: ctx.question||'',
        student_partial: (typeof ctx.getPartial==='function' ? (ctx.getPartial()||'') : (ctx.student_partial||'')) };
    }

    async function ask(userText){
      if(busy||closed) return;
      // 사용량 체크(발문 요청 1회 = 학생 발화 1회). 첫 인사(자동)는 카운트 제외.
      if(userText!=null){
        if(usedCount(ctx) >= cap){ renderLocked(); return; }
      }
      busy=true; renderFooter();
      if(userText!=null){ messages.push({role:'student', content:userText}); addBubble('student', userText); }
      var typ=showTyping();
      try{
        var reply=await callSoke(payload());
        if(closed) return;
        typ.remove();
        reply = reply || '음… 조금만 더 말해줄래? 🤔';
        messages.push({role:'soke', content:reply});
        addBubble('soke', reply);
        if(userText!=null){
          var n=bumpUsed(ctx);
          if(n>=cap){ renderLocked(); busy=false; return; }
        }
      }catch(e){
        if(closed) return;
        typ.remove();
        addNote('소크가 잠깐 딴생각 중이야… 다시 한 번 물어봐 줄래? ('+String(e.message||e).slice(0,60)+')');
      }
      busy=false; renderFooter();
    }

    function renderLocked(){
      var t=resolveTier(ctx.tier);
      var up = (t==='allinone'||t==='unlimited')
        ? '오늘은 소크와 충분히 생각했어! 이 발문들을 곱씹으며 네 답을 완성해 볼까? ✍️'
        : '이번 회차 소크 발문을 다 썼어. 지금까지의 질문으로 네 답을 완성해 보고, 더 필요하면 <b>무제한 이용권</b>으로 계속 함께할 수 있어.';
      foot.innerHTML='<div class="soke-lock">'+up+'</div>';
    }

    function renderFooter(){
      if(usedCount(ctx) >= cap){ renderLocked(); return; }
      var left=remaining(ctx);
      foot.innerHTML=
        '<div class="soke-cap"><span>남은 발문 <b>'+left+'</b> / '+cap+'회</span><span>정답·대필은 안 해요</span></div>'
        + '<div class="soke-inrow">'
        + '<textarea class="soke-in" rows="1" placeholder="소크에게 물어보기…"'+(busy?' disabled':'')+'></textarea>'
        + '<button class="soke-send"'+(busy?' disabled':'')+' aria-label="보내기">➤</button></div>';
      var ta=foot.querySelector('.soke-in'), btn=foot.querySelector('.soke-send');
      if(!ta) return;
      ta.addEventListener('input', function(){ ta.style.height='auto'; ta.style.height=Math.min(96, ta.scrollHeight)+'px'; });
      function send(){ var v=ta.value.trim(); if(!v||busy)return; ta.value=''; ta.style.height='auto'; ask(v); }
      btn.addEventListener('click', send);
      ta.addEventListener('keydown', function(e){ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } });
      setTimeout(function(){ try{ta.focus();}catch(_e){}}, 60);
    }

    document.body.appendChild(ov);
    renderFooter();
    // 첫 발문: 소크가 따뜻한 인사 + 첫 질문 자동 제시(카운트 제외)
    ask(null);

    return { close: close };
  }

  window.ArcheSoke = { open: open, remaining: remaining, capOf: capOf, version: '1.0' };
})();
