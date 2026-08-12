/* ARCHE · 메뉴별 사용법 가이드 (학부모 B2C) — 드롭인
 * 사이드바 각 메뉴(자녀 관리 ~ 구독·결제)를 처음 열 때 3~4단계 안내를 1회 자동 표시.
 * 이후엔 화면 오른쪽 아래 [❔사용법] 버튼으로 언제든 다시 볼 수 있음.
 * 동작: 전역 핸들러(goView / b2cOpenInbox / b2cOpenSeasonPicker / b2cOpenPeriodReport /
 *       b2cOpenStore / b2cOpenCart)를 감싸(wrap) 어떤 메뉴가 열렸는지 감지 → 가이드 표시.
 * 저장: localStorage('pv_g_<key>_<uid>')  ·  B2C 학부모 계정에서만 동작.
 * 연결: parent/index.html 스크립트 마지막에 <script src="/shared/arche_guides.js?v=1"></script>
 */
(function(){
  "use strict";

  /* ── 메뉴별 가이드 콘텐츠 ───────────────────────────────── */
  var G = {
    allstudents: { ic:'👨‍👧', title:'자녀 관리', desc:'자녀를 등록하면 로그인 아이디가 자동 발급됩니다.', steps:[
      '첫 자녀 등록 시 <b>가정 코드</b>(예: KIM)를 한 번만 정해요 — 이후 모든 자녀 아이디의 앞부분이 됩니다.',
      '이름·학년을 입력·저장하면 <b>코드+번호</b> 아이디가 발급돼요 (초기 비밀번호 <b>0000</b>).',
      '학년에 맞는 코스가 자동 배정돼요 — 초=펜타 / 중=아르케+펜타 / 고=아르케.',
      '자녀가 여럿이면 <b>홈 상단</b>에서 현재 자녀를 바꿔가며 관리해요.' ] },

    inbox: { ic:'🗂', title:'자녀 제출함', desc:'자녀가 제출한 결과물을 확인하고 성장 리포트를 발행해요.', steps:[
      '자녀가 워크북·활동을 제출하면 이곳에 모여요.',
      '제출물을 열어 내용을 확인하고 <b>리포트 생성</b>을 눌러요.',
      'AI 초안을 확인·수정한 뒤 <b>발행</b>하면 자녀·가정 리포트로 저장돼요.',
      '발행한 리포트로 아이와 <b>대화</b>를 이어가세요.' ] },

    vision: { ic:'📗', title:'펜타 비전', desc:'융합사고를 키우는 시즌형 워크북 코스예요.', steps:[
      '펜타 비전은 <b>기초(초5~6) → 심화(중1~2)</b>로 이어지는 융합사고 코스예요.',
      '<b>시즌(폴더)</b> 명함에서 주제·학습목적을 보고 골라요.',
      '마음에 드는 시즌은 <b>1강을 무료 체험</b>할 수 있어요.',
      '<b>장바구니</b>에 시즌을 담거나 <b>구독</b>으로 전체를 열 수 있어요.' ] },

    track: { ic:'📙', title:'펜타 트랙', desc:'중3 대상 융합사고 심화 코스예요.', steps:[
      '펜타 트랙은 <b>중3</b> 대상 융합사고 심화 코스예요.',
      '시즌을 골라 주제를 확인하고 <b>1강 체험</b>으로 맛보기 해요.',
      '자녀가 회차 워크북을 <b>단계(스텝)</b>대로 풀며 사고를 확장해요.',
      '탐구 전/후 <b>지성 레이더</b>로 성장을 눈으로 확인해요.' ] },

    career: { ic:'🪜', title:'펜타 아르케 · 진로', desc:'관심사에서 진로 탐구 주제를 스스로 찾는 코스예요.', steps:[
      '<b>진로 징검다리</b>는 관심사 인터뷰에서 진로 탐구 주제·보고서 구조를 잡아요.',
      '자녀 계정으로 로그인해 <b>자녀가 직접</b> 질문에 답해요.',
      'AI는 <b>정답·대필 없이</b> 방향만 코칭해요.',
      '완성되면 홈·<b>정기 성장 리포트</b>에서 결과를 확인하고 코칭해요.' ] },

    perf: { ic:'📝', title:'펜타 아르케 · 수행평가', desc:'학교 수행평가를 단계별로 준비해요.', steps:[
      '학교에서 받은 <b>수행평가 안내문</b>을 올려요.',
      'AI 인터뷰로 자녀가 <b>관점</b>을 스스로 골라요.',
      '나만의 <b>접근 설계도·예상 채점기준</b>을 확인해요.',
      '작성은 <b>자녀 본인</b>이 하고 스스로 점검해요 (대필 없음).' ] },

    period: { ic:'📈', title:'정기 성장 리포트', desc:'월간·분기·연간 활동을 종합해 성향·발전을 분석해요.', steps:[
      '자녀와 <b>기간(월간/분기/연간)</b>을 선택해요.',
      '누적된 활동을 AI가 <b>종합 분석</b>해 초안을 만들어요.',
      '내용을 확인·수정한 뒤 <b>발행</b>해요.',
      '발행한 리포트는 <b>언제든 다시</b> 볼 수 있어요.' ] },

    store: { ic:'🛍️', title:'상품 담기', desc:'원하는 시즌·이용권을 장바구니에 담아요.', steps:[
      '<b>현재 자녀</b> 기준으로 담겨요 (홈 상단에서 자녀 전환).',
      '원하는 시즌·이용권을 <b>장바구니에 담기</b> 해요.',
      '담은 뒤 <b>🛒 장바구니</b>에서 결제로 이어가요.',
      '펜타는 디지털 학습 서비스로 <b>실물 배송이 없어요</b>.' ] },

    cart: { ic:'🛒', title:'장바구니', desc:'담은 상품을 확인하고 결제해요.', steps:[
      '담은 상품과 금액을 한눈에 확인해요.',
      '수량 조절·삭제 후 <b>결제하기</b>를 눌러요.',
      '결제 카드가 없으면 <b>구독·결제</b>에서 먼저 등록해요.',
      '<b>형제 할인</b>(둘째부터 30%) 등 프로모션이 자동 반영돼요.' ] },

    billing: { ic:'💳', title:'구독·결제', desc:'결제 카드와 구독을 한 곳에서 관리해요.', steps:[
      '여기서 <b>결제 카드</b>를 등록·변경해요.',
      '<b>구독</b>은 매월 자동 청구되고, <b>다음 결제일 전 해지</b>할 수 있어요.',
      '현재 <b>구독 상태·다음 결제일</b>을 확인해요.',
      '결제·해지 내역을 한 곳에서 관리해요.' ] }
  };

  /* ── 유틸 ───────────────────────────────────────────────── */
  function uid(){ return window._myUid || (window.sb && '') || ''; }
  function seenKey(k){ return 'pv_g_'+k+'_'+uid(); }
  function isSeen(k){ try{ return !!window.localStorage.getItem(seenKey(k)); }catch(e){ return false; } }
  function markSeen(k){ try{ window.localStorage.setItem(seenKey(k),"1"); }catch(e){} }
  var _cur=null;

  /* ── 오버레이(가이드 카드) ──────────────────────────────── */
  function closeOv(){ var o=document.getElementById('pv-guide-ov'); if(o){ try{o.remove();}catch(e){} } }
  function showGuide(key){
    var g=G[key]; if(!g) return;
    closeOv();
    var ov=document.createElement('div'); ov.id='pv-guide-ov';
    ov.style.cssText='position:fixed;inset:0;z-index:2147483601;background:rgba(15,20,40,.5);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Pretendard,system-ui,sans-serif';
    var stepsHtml=g.steps.map(function(s){ return '<li>'+s+'</li>'; }).join('');
    ov.innerHTML='<div style="width:100%;max-width:430px;max-height:88vh;overflow:auto;background:#fff;border-radius:20px;padding:24px 22px 18px;box-shadow:0 24px 60px rgba(0,0,0,.35);position:relative">'
      +'<button id="pv-g-x" aria-label="닫기" style="position:absolute;top:13px;right:15px;background:none;border:none;color:#8b95a1;font-size:20px;line-height:1;cursor:pointer">×</button>'
      +'<div style="font-size:40px;line-height:1;margin:2px 0 12px">'+g.ic+'</div>'
      +'<div style="font-size:18px;font-weight:800;color:#191f28">'+g.title+'</div>'
      +'<div style="font-size:12.5px;color:#8b95a1;margin:5px 0 14px;line-height:1.55">'+g.desc+'</div>'
      +'<ol style="margin:0;padding-left:20px;font-size:13px;color:#191f28;line-height:1.95">'+stepsHtml+'</ol>'
      +'<div style="font-size:11px;color:#b0b8c1;margin:14px 2px 12px;line-height:1.5">처음 한 번만 자동으로 보여요 · 오른쪽 아래 <b style="color:#8b95a1">❔사용법</b>으로 다시 볼 수 있어요.</div>'
      +'<button id="pv-g-ok" style="width:100%;padding:12px;background:#1b64da;color:#fff;border:none;border-radius:12px;font-weight:800;font-size:14px;cursor:pointer">확인했어요</button>'
      +'</div>';
    document.body.appendChild(ov);
    markSeen(key);
    function bye(){ closeOv(); }
    var x=ov.querySelector('#pv-g-x'); if(x)x.onclick=bye;
    var ok=ov.querySelector('#pv-g-ok'); if(ok)ok.onclick=bye;
    ov.addEventListener('click',function(e){ if(e.target===ov)bye(); });
  }
  window.__archeShowGuide=showGuide;

  /* ── 플로팅 [❔사용법] 버튼 ─────────────────────────────── */
  function fab(){
    var b=document.getElementById('pv-guide-fab');
    if(!b){
      b=document.createElement('button'); b.id='pv-guide-fab'; b.type='button';
      b.style.cssText='position:fixed;right:16px;bottom:78px;z-index:2147483000;display:none;align-items:center;gap:6px;'
        +'background:#fff;color:#1b64da;border:1px solid #cfe0fb;border-radius:22px;padding:9px 14px;'
        +'font-family:Pretendard,system-ui,sans-serif;font-size:13px;font-weight:800;cursor:pointer;'
        +'box-shadow:0 6px 18px rgba(27,100,218,.22)';
      b.innerHTML='<span style="font-size:14px">❔</span>사용법';
      b.addEventListener('click',function(){ if(_cur) showGuide(_cur); });
      document.body.appendChild(b);
    }
    return b;
  }
  function setCurrent(key){
    _cur = (key && G[key]) ? key : null;
    var b=fab();
    b.style.display = _cur ? 'inline-flex' : 'none';
  }

  function onOpen(key){
    if(!window._isB2C) return;
    setCurrent(key);
    if(key && G[key] && !isSeen(key)){
      setTimeout(function(){ if(_cur===key) showGuide(key); }, 140);
    }
  }

  /* ── 전역 핸들러 래핑 ───────────────────────────────────── */
  var VIEWMAP = { allstudents:'allstudents', students:'allstudents', gstudents:'allstudents',
                  sr:'career', gdesign:'career', perf:'perf', gperf:'perf', billing:'billing' };

  function wrap(name, keyFn){
    var orig=window[name];
    if(typeof orig!=='function' || orig.__pvGuide) return (typeof orig==='function');
    var w=function(){
      var r=orig.apply(this, arguments);
      try{ onOpen(keyFn.apply(null, arguments)); }catch(e){}
      return r;
    };
    w.__pvGuide=true;
    try{ w.prototype=orig.prototype; }catch(e){}
    window[name]=w;
    return true;
  }

  function wrapAll(){
    var ok=true;
    ok = wrap('goView', function(v){ return VIEWMAP[v]||null; }) && ok;
    ok = wrap('b2cOpenInbox', function(){ return 'inbox'; }) && ok;
    ok = wrap('b2cOpenSeasonPicker', function(child,key){ return (key==='track')?'track':'vision'; }) && ok;
    ok = wrap('b2cOpenPeriodReport', function(){ return 'period'; }) && ok;
    ok = wrap('b2cOpenStore', function(){ return 'store'; }) && ok;
    ok = wrap('b2cOpenCart', function(){ return 'cart'; }) && ok;
    return ok;
  }

  function boot(){
    var n=0;
    var iv=setInterval(function(){
      var done = wrapAll();
      if(done || ++n>50) clearInterval(iv);
    }, 150);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
