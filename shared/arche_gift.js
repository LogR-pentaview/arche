/* ARCHE · 시즌 선물하기 (QR 선물코드)
 * 저장소: public.gift_coupons | RPC: issue_gift / redeem_gift / gift_info (→ grant_season)
 * 전역: window.ArcheGift
 * 의존: 전역 sb(Supabase). QR은 cdnjs qrcodejs 동적 로드.
 */
(function(){
  "use strict";
  var QR_SRC='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  function esc(s){ if(window.esc)return window.esc(s); s=(s==null?'':String(s)); return s.replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function _sb(){ return window.sb||null; }

  var LABELS={ 'vision|starter':'펜타 비전 기초', 'vision|architecture':'펜타 비전 심화', 'track|':'펜타 트랙' };
  function courseLabel(stage,level){ return LABELS[(stage||'')+'|'+(level||'')]||(stage||''); }
  function giftTitle(g){ return (g.label && String(g.label).trim()) ? g.label : (courseLabel(g.stage,g.level)+' · 시즌'+g.season); }
  function redeemURL(code){ try{ return location.origin+'/parent?gift='+encodeURIComponent(code); }catch(e){ return 'https://arche.penta-view.com/parent?gift='+encodeURIComponent(code); } }

  /* ---------- CSS ---------- */
  function injectCSS(){
    if(document.getElementById('agft-css'))return;
    var st=document.createElement('style'); st.id='agft-css';
    st.textContent=[
      '.agft-ov{position:fixed;inset:0;z-index:1200;background:rgba(10,14,20,.6);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Pretendard,system-ui,sans-serif}',
      '.agft-c{background:#fff;color:#191f28;width:100%;max-width:420px;max-height:90vh;overflow:auto;border-radius:18px;padding:22px 20px 24px;box-shadow:0 24px 70px rgba(0,0,0,.4)}',
      '.agft-c h3{margin:0 0 4px;font-size:19px;font-weight:800;color:#1A237E}',
      '.agft-c .sub{font-size:12.5px;color:#8b95a1;line-height:1.6;margin-bottom:16px}',
      '.agft-gift{background:linear-gradient(135deg,#1A237E,#3949ab);color:#fff;border-radius:14px;padding:16px 18px;margin-bottom:16px}',
      '.agft-gift .t{font-size:11px;letter-spacing:.1em;color:#c5cae9;font-weight:700}',
      '.agft-gift .n{font-size:18px;font-weight:800;margin-top:5px}',
      '.agft-gift .c{font-family:monospace;font-size:13px;letter-spacing:.06em;margin-top:8px;color:#e8eaf6}',
      '.agft-kids{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}',
      '.agft-kid{display:flex;align-items:center;gap:10px;border:1.5px solid #e5e8eb;border-radius:11px;padding:11px 13px;cursor:pointer;font-size:14px}',
      '.agft-kid.on{border-color:#3949ab;background:#eef1fb}',
      '.agft-kid .rd{width:18px;height:18px;border-radius:50%;border:2px solid #c5cad3;flex:none}',
      '.agft-kid.on .rd{border-color:#3949ab;background:#3949ab;box-shadow:inset 0 0 0 3px #fff}',
      '.agft-kid b{font-weight:700}.agft-kid small{color:#8b95a1;margin-left:auto}',
      '.agft-btn{width:100%;padding:13px;border:none;border-radius:11px;font-size:14px;font-weight:800;cursor:pointer;background:#3949ab;color:#fff}',
      '.agft-btn[disabled]{opacity:.5;cursor:default}',
      '.agft-btn.g{background:#fff;color:#4e5968;border:1px solid #e5e8eb;font-weight:700}',
      '.agft-x{position:absolute;top:14px;right:16px;background:none;border:none;font-size:20px;color:#8b95a1;cursor:pointer}',
      '.agft-msg{font-size:12.5px;margin-top:10px;min-height:16px}',
      '.agft-qrbox{display:flex;justify-content:center;padding:16px;background:#f7f8fb;border-radius:14px;margin-bottom:14px}',
      '.agft-qrbox img,.agft-qrbox canvas{display:block}',
      '.agft-link{display:flex;gap:8px;margin-bottom:10px}',
      '.agft-link input{flex:1;padding:10px 12px;border:1px solid #e5e8eb;border-radius:9px;font-size:12px;color:#4e5968;background:#fff}',
      '.agft-row{display:flex;gap:8px}'
    ].join('');
    document.head.appendChild(st);
  }

  function ovWrap(inner){
    injectCSS();
    var ov=document.createElement('div'); ov.className='agft-ov';
    ov.innerHTML='<div class="agft-c" style="position:relative"><button class="agft-x" aria-label="닫기">✕</button>'+inner+'</div>';
    document.body.appendChild(ov);
    ov.querySelector('.agft-x').addEventListener('click',function(){ ov.remove(); cleanUrl(); });
    ov.addEventListener('click',function(e){ if(e.target===ov){ ov.remove(); cleanUrl(); } });
    return ov;
  }
  function cleanUrl(){ try{ if(/[?&]gift=/.test(location.search)){ history.replaceState({}, '', location.pathname); } }catch(e){} }

  function loadQR(cb){
    if(window.QRCode){ cb(true); return; }
    var s=document.createElement('script'); s.src=QR_SRC;
    s.onload=function(){ cb(!!window.QRCode); }; s.onerror=function(){ cb(false); };
    document.head.appendChild(s);
  }

  /* ---------- 자녀 목록 ---------- */
  function loadChildren(){
    var sb=_sb();
    var pre=[].concat(window._students||[], window._gstudents||[]);
    if(pre.length) return Promise.resolve(pre.slice());
    if(!sb) return Promise.resolve([]);
    return sb.from('students').select('id,name,grade,admission_track').then(function(r){ return (r&&r.data)||[]; });
  }

  /* ================= 선물 사용 (받는 사람) ================= */
  function openRedeem(code){
    var sb=_sb();
    if(!sb){ alert('로그인 후 이용해 주세요.'); return; }
    injectCSS();
    var ov=ovWrap('<h3>🎁 선물 받기</h3><div class="sub">불러오는 중…</div>');
    var c=ov.querySelector('.agft-c');
    Promise.all([ sb.auth.getUser(), sb.rpc('gift_info',{p_code:code}) ]).then(function(res){
      var user=res[0]&&res[0].data&&res[0].data.user;
      var info=res[1]&&res[1].data;
      if(!user){
        c.innerHTML='<button class="agft-x">✕</button><h3>🎁 선물 받기</h3><div class="sub">선물을 받으려면 먼저 <b>학부모 로그인</b>이 필요해요. 로그인 후 이 화면이 다시 열립니다.</div><button class="agft-btn" id="agft-login">로그인하러 가기</button>';
        bindClose(ov); var lg=c.querySelector('#agft-login'); if(lg)lg.addEventListener('click',function(){ location.href='/login?gift='+encodeURIComponent(code); }); return;
      }
      if(!info || !info.ok){ renderErr(ov,'존재하지 않는 선물 코드예요.'); return; }
      if(info.status==='redeemed'){ renderErr(ov,'이미 사용된 선물 코드예요.'); return; }
      if(info.status==='expired'){ renderErr(ov,'사용 기간이 지난 선물 코드예요.'); return; }
      if(info.status!=='issued'){ renderErr(ov,'지금은 사용할 수 없는 코드예요.'); return; }
      loadChildren().then(function(kids){
        var title=giftTitle(info);
        var kidsHTML = kids.length
          ? kids.map(function(k,i){ return '<div class="agft-kid" data-id="'+esc(k.id)+'"><span class="rd"></span><b>'+esc(k.name||'-')+'</b><small>'+esc(k.grade||'')+'</small></div>'; }).join('')
          : '<div class="sub">연결된 자녀가 없어요. 먼저 자녀를 등록해 주세요.</div>';
        c.innerHTML='<button class="agft-x">✕</button><h3>🎁 선물이 도착했어요</h3><div class="sub">아래 선물을 받을 자녀를 선택하세요.</div>'
          +'<div class="agft-gift"><div class="t">GIFT</div><div class="n">'+esc(title)+'</div><div class="c">'+esc(code)+'</div></div>'
          +'<div class="agft-kids">'+kidsHTML+'</div>'
          +'<button class="agft-btn" id="agft-redeem"'+(kids.length?'':' disabled')+'>선물 받기</button>'
          +'<div class="agft-msg" id="agft-msg"></div>';
        bindClose(ov);
        var sel=null;
        c.querySelectorAll('.agft-kid').forEach(function(el){ el.addEventListener('click',function(){ c.querySelectorAll('.agft-kid').forEach(function(x){x.classList.remove('on');}); el.classList.add('on'); sel=el.getAttribute('data-id'); }); });
        var btn=c.querySelector('#agft-redeem'), msg=c.querySelector('#agft-msg');
        btn.addEventListener('click',function(){
          if(!sel){ msg.style.color='#f04452'; msg.textContent='자녀를 선택해 주세요.'; return; }
          btn.disabled=true; msg.style.color='#8b95a1'; msg.textContent='처리 중…';
          sb.rpc('redeem_gift',{p_code:code,p_student:sel}).then(function(r){
            if(r.error){ throw r.error; }
            var d=r.data||{};
            c.innerHTML='<button class="agft-x">✕</button><h3>🎉 선물 등록 완료!</h3>'
              +'<div class="agft-gift"><div class="t">지급 완료</div><div class="n">'+esc(giftTitle(d.label?d:info))+'</div></div>'
              +'<div class="sub">선택한 자녀 계정에 해당 시즌이 열렸어요. 지금 바로 학습을 시작할 수 있습니다.</div>'
              +'<button class="agft-btn" id="agft-done">확인</button>';
            bindClose(ov);
            var dn=c.querySelector('#agft-done'); if(dn)dn.addEventListener('click',function(){ ov.remove(); cleanUrl(); location.reload(); });
          }).catch(function(e){
            var m=String(e&&e.message||e);
            var map={ALREADY_REDEEMED:'이미 사용된 코드예요.',EXPIRED:'사용 기간이 지났어요.',INVALID_CODE:'존재하지 않는 코드예요.',NOT_YOUR_STUDENT:'선택한 자녀에 대한 권한이 없어요.',NOT_AVAILABLE:'지금은 사용할 수 없어요.'};
            var friendly=Object.keys(map).filter(function(k){return m.indexOf(k)>=0;}).map(function(k){return map[k];})[0];
            msg.style.color='#f04452'; msg.textContent=friendly||('실패: '+m); btn.disabled=false;
          });
        });
      });
    });
  }
  function renderErr(ov,text){
    var c=ov.querySelector('.agft-c');
    c.innerHTML='<button class="agft-x">✕</button><h3>🎁 선물 받기</h3><div class="sub">'+esc(text)+'</div><button class="agft-btn g" id="agft-close2">닫기</button>';
    bindClose(ov); var b=c.querySelector('#agft-close2'); if(b)b.addEventListener('click',function(){ ov.remove(); cleanUrl(); });
  }
  function bindClose(ov){ var x=ov.querySelector('.agft-x'); if(x)x.addEventListener('click',function(){ ov.remove(); cleanUrl(); }); }

  /* ================= 발급 코드 표시 (보내는 사람) — QR + 링크 ================= */
  function showCode(g){
    injectCSS();
    var code=g.code||g; var title=giftTitle(g.stage?g:{stage:g.stage,level:g.level,season:g.season,label:g.label});
    var url=redeemURL(code);
    var ov=ovWrap('<h3>🎁 선물 코드가 준비됐어요</h3><div class="sub">아래 QR을 친구에게 보여주거나 링크를 보내세요. 친구가 열어 자녀에게 등록하면 사용됩니다.</div>'
      +'<div class="agft-gift"><div class="t">'+esc(title)+'</div><div class="c">'+esc(code)+'</div></div>'
      +'<div class="agft-qrbox" id="agft-qr"><span style="color:#8b95a1;font-size:12px">QR 생성 중…</span></div>'
      +'<div class="agft-link"><input id="agft-url" readonly value="'+esc(url)+'"><button class="agft-btn g" id="agft-copy" style="width:auto;flex:none">복사</button></div>'
      +'<button class="agft-btn g" id="agft-share">링크 공유</button>');
    var c=ov.querySelector('.agft-c');
    var copy=c.querySelector('#agft-copy'); if(copy)copy.addEventListener('click',function(){ try{ navigator.clipboard.writeText(url); copy.textContent='복사됨'; setTimeout(function(){copy.textContent='복사';},1400);}catch(e){} });
    var sh=c.querySelector('#agft-share'); if(sh)sh.addEventListener('click',function(){ if(navigator.share){ navigator.share({title:'펜타 시즌 선물',text:title+' 선물이 도착했어요!',url:url}).catch(function(){}); } else { try{navigator.clipboard.writeText(url);}catch(e){} sh.textContent='링크 복사됨'; } });
    loadQR(function(ok){
      var box=c.querySelector('#agft-qr'); if(!box)return; box.innerHTML='';
      if(ok && window.QRCode){ try{ new window.QRCode(box,{text:url,width:180,height:180,correctLevel:window.QRCode.CorrectLevel.M}); }catch(e){ box.innerHTML='<span style="color:#8b95a1;font-size:12px">QR 생성 실패 — 링크를 이용하세요</span>'; } }
      else { box.innerHTML='<span style="color:#8b95a1;font-size:12px">QR 로드 실패 — 아래 링크를 이용하세요</span>'; }
    });
    return ov;
  }

  /* 스태프/대표: 즉시 발급 후 QR 표시 */
  function openIssue(spec){
    var sb=_sb(); if(!sb){ alert('로그인이 필요해요.'); return; }
    spec=spec||{};
    sb.rpc('issue_gift',{ p_stage:spec.stage, p_level:spec.level||'', p_season:spec.season, p_label:spec.label||null, p_price:spec.price||null, p_order_ref:spec.order_ref||null })
      .then(function(r){
        if(r.error){
          var m=String(r.error.message||r.error);
          if(m.indexOf('not allowed')>=0){
            ovWrap('<h3>🎁 선물하기</h3><div class="sub">선물하기는 <b>결제 연동(KG이니시스)</b> 완료 후 제공됩니다. 결제가 열리면 결제 완료 시 선물 코드가 자동 발급됩니다.</div><button class="agft-btn g" id="agft-ok">확인</button>');
            var okb=document.querySelector('.agft-ov #agft-ok'); if(okb)okb.addEventListener('click',function(){ var o=okb.closest('.agft-ov'); if(o)o.remove(); });
          } else { alert('발급 실패: '+m); }
          return;
        }
        showCode({ code:r.data, stage:spec.stage, level:spec.level||'', season:spec.season, label:spec.label });
      });
  }

  /* ================= URL 진입 (?gift=CODE) ================= */
  function checkUrl(){
    var code=null;
    try{ var m=location.search.match(/[?&]gift=([^&]+)/); if(m)code=decodeURIComponent(m[1]); }catch(e){}
    if(!code)return false;
    var tries=0;
    (function wait(){
      if(_sb()){ openRedeem(code); return; }
      if(tries++>40)return; setTimeout(wait,150);
    })();
    return true;
  }

  window.ArcheGift={ openRedeem:openRedeem, showCode:showCode, openIssue:openIssue, checkUrl:checkUrl, redeemURL:redeemURL };
})();
