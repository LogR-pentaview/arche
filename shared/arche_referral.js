/* ARCHE · 친구 초대(파운더 리퍼럴) — 드롭인
 * 파운더(선착순100 중 카드등록자)만 노출. 컨설팅 홈(#v-home) 상단에 "친구 초대" 카드 자동 삽입.
 * 발급 → 기존 선물 링크/QR(ArcheGift.showCode) 재사용해 전달. 친구가 열면 /parent?gift=CODE 로 사용.
 * 백엔드: founder_referral_status / issue_referral / my_referral_invites (SECURITY DEFINER RPC)
 * 연결: parent/index.html 에 arche_gift.js 뒤로 <script src="/shared/arche_referral.js?v=1"></script>
 */
(function(){
  "use strict";
  function sb(){ return window.sb || null; }
  function esc(s){ if(window.esc)return window.esc(s); return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];}); }
  var _isFounder=null, _cap=10, _observing=false;

  function injectCSS(){
    if(document.getElementById('aref-css'))return;
    var st=document.createElement('style'); st.id='aref-css';
    st.textContent=[
      '#aref-home-card{background:linear-gradient(135deg,#eef4ff,#f6f0ff);border:1px solid #e3e8ff;border-radius:18px;padding:18px 18px 16px;margin:0 0 14px;font-family:Pretendard,system-ui,sans-serif}',
      '#aref-home-card .hd{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:800;color:#1A237E}',
      '#aref-home-card .tag{font-size:10px;font-weight:800;color:#7c3aed;background:#f0e9ff;border-radius:20px;padding:2px 8px}',
      '#aref-home-card .desc{font-size:12.5px;color:#4e5968;line-height:1.6;margin:8px 0 12px}',
      '#aref-home-card .desc b{color:#1b64da}',
      '#aref-home-card .stat{font-size:12.5px;color:#191f28;font-weight:600;margin-bottom:10px}',
      '#aref-home-card .stat b{color:#3182f6;font-size:15px}',
      '#aref-btn{width:100%;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;background:#3182f6;color:#fff}',
      '#aref-btn[disabled]{opacity:.5;cursor:default}',
      '#aref-list{margin-top:12px;display:flex;flex-direction:column;gap:7px}',
      '.aref-row{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e9edf3;border-radius:11px;padding:9px 11px;font-size:12px}',
      '.aref-row .code{font-family:ui-monospace,monospace;font-weight:700;color:#191f28}',
      '.aref-row .st{margin-left:auto;font-weight:700;font-size:10.5px;border-radius:20px;padding:2px 8px}',
      '.aref-st-issued{background:#eef4ff;color:#1b64da}.aref-st-redeemed{background:#fff7e6;color:#f79009}.aref-st-converted{background:#eafaf0;color:#12b76a}',
      '.aref-row button{border:1px solid #e5e8eb;background:#fff;border-radius:9px;padding:5px 9px;font-size:11px;font-weight:700;color:#4e5968;cursor:pointer}',
      '#aref-msg{font-size:12px;margin-top:8px;min-height:14px}'
    ].join('');
    document.head.appendChild(st);
  }

  function stLabel(giftStatus, refStatus){
    if(refStatus==='converted') return {t:'전환됨 · 보상지급',c:'aref-st-converted'};
    if(giftStatus==='redeemed') return {t:'사용됨',c:'aref-st-redeemed'};
    return {t:'미사용',c:'aref-st-issued'};
  }

  function renderList(host){
    var s=sb(); if(!s||!host)return;
    s.rpc('my_referral_invites').then(function(r){
      if(r.error){ host.innerHTML=''; return; }
      var rows=r.data||[];
      if(!rows.length){ host.innerHTML='<div style="font-size:12px;color:#8b95a1">아직 발급한 초대권이 없어요.</div>'; return; }
      host.innerHTML=rows.map(function(x){
        var st=stLabel(x.status,x.ref_status);
        var url=(location.origin||'https://arche.penta-view.com')+'/parent?gift='+encodeURIComponent(x.code);
        return '<div class="aref-row"><span class="code">'+esc(x.code)+'</span>'
          +'<span class="st '+st.c+'">'+st.t+'</span>'
          +'<button data-copy="'+esc(url)+'">링크</button></div>';
      }).join('');
      host.querySelectorAll('button[data-copy]').forEach(function(b){
        b.addEventListener('click',function(){ try{ navigator.clipboard.writeText(b.getAttribute('data-copy')); b.textContent='복사됨'; setTimeout(function(){b.textContent='링크';},1200);}catch(e){} });
      });
    });
  }

  function refreshStat(card){
    var s=sb(); if(!s)return;
    s.rpc('founder_referral_status').then(function(r){
      var d=(r&&r.data)||{}; _cap=d.cap||10;
      var stat=card.querySelector('.stat'), btn=card.querySelector('#aref-btn');
      var rem=(typeof d.remaining==='number')?d.remaining:_cap;
      if(stat)stat.innerHTML='남은 초대권 <b>'+rem+'</b> / '+_cap;
      if(btn){ btn.disabled = rem<=0; if(rem<=0)btn.textContent='초대권 모두 사용함 ('+_cap+'/'+_cap+')'; }
    });
  }

  function buildCard(){
    injectCSS();
    var card=document.createElement('div'); card.id='aref-home-card'; card.className='card';
    card.innerHTML='<div class="hd">🎁 친구 초대 이벤트 <span class="tag">파운더 전용</span></div>'
      +'<div class="desc">친구에게 <b>아르케 5회권 + 첫 결제 30% 할인</b>을 선물하세요. 친구가 유료 전환하면 파운더님도 <b>다음 결제 30% 할인</b>!</div>'
      +'<div class="stat">남은 초대권 불러오는 중…</div>'
      +'<button id="aref-btn">초대권 발급하기</button>'
      +'<div id="aref-msg"></div>'
      +'<div id="aref-list"></div>';
    var btn=card.querySelector('#aref-btn'), msg=card.querySelector('#aref-msg');
    btn.addEventListener('click',function(){
      var s=sb(); if(!s)return;
      btn.disabled=true; msg.style.color='#8b95a1'; msg.textContent='발급 중…';
      s.rpc('issue_referral').then(function(r){
        if(r.error){
          var m=String(r.error.message||r.error);
          var map={NOT_FOUNDER:'파운더(카드등록 선착순100) 계정만 발급할 수 있어요.',CAP_REACHED:'초대권을 모두 사용했어요.'};
          var fr=Object.keys(map).filter(function(k){return m.indexOf(k)>=0;}).map(function(k){return map[k];})[0];
          msg.style.color='#f04452'; msg.textContent=fr||('발급 실패: '+m); btn.disabled=false; return;
        }
        msg.textContent='';
        if(window.ArcheGift && ArcheGift.showCode){
          ArcheGift.showCode({ code:r.data, label:'친구 초대장 · 아르케5회권+첫달30%' });
        } else {
          var url=(location.origin)+'/parent?gift='+encodeURIComponent(r.data);
          try{ navigator.clipboard.writeText(url); }catch(e){}
          msg.style.color='#12b76a'; msg.textContent='초대 링크 복사됨: '+url;
        }
        refreshStat(card); renderList(card.querySelector('#aref-list'));
      }).catch(function(e){ msg.style.color='#f04452'; msg.textContent='오류: '+String(e&&e.message||e); btn.disabled=false; });
    });
    refreshStat(card); renderList(card.querySelector('#aref-list'));
    return card;
  }

  function inject(){
    if(!_isFounder) return;
    var home=document.getElementById('v-home'); if(!home) return;
    if(home.querySelector('#aref-home-card')) return;
    home.insertBefore(buildCard(), home.firstChild);
  }

  function startObserver(){
    if(_observing) return; _observing=true;
    var home=document.getElementById('v-home');
    try{
      var mo=new MutationObserver(function(){ if(_isFounder && document.getElementById('v-home') && !document.querySelector('#aref-home-card')) inject(); });
      if(home) mo.observe(home,{childList:true});
    }catch(e){}
    // 뷰 전환 대비 가벼운 폴백
    var n=0, iv=setInterval(function(){ inject(); if(++n>20)clearInterval(iv); }, 700);
  }

  function boot(){
    var s=sb();
    if(!s){ var t=0; var w=setInterval(function(){ if(sb()){clearInterval(w);boot();} if(++t>40)clearInterval(w); },200); return; }
    s.rpc('founder_referral_status').then(function(r){
      var d=(r&&r.data)||{};
      _isFounder = !!d.is_founder; _cap=d.cap||10;
      if(_isFounder){ inject(); startObserver(); }
    }).catch(function(){});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();

  window.ArcheReferral={ refresh:function(){ _isFounder=null; boot(); }, _inject:inject };
})();
