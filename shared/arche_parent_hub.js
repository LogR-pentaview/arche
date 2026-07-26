/* ============================================================================
 * arche_parent_hub.js · 학부모 전송함(parent_inbox) 허브
 * ----------------------------------------------------------------------------
 * 컨설턴트: ArcheParentHub.mountSend(container) — 소식지·시간표·새강좌·월간분석표·
 *           진로/수행 결과 등을 학부모에게 전송(전체/개별).
 * 학부모  : ArcheParentHub.loadInbox(academyId, studentId) → 항목 배열,
 *           ArcheParentHub.openItem(item) 오버레이 열람.
 * 의존: window.sb, window._acadId
 * ==========================================================================*/
(function(){
  "use strict";
  var TYPES=[
    {v:'notice',    label:'📢 소식지·안내'},
    {v:'timetable', label:'📅 시간표'},
    {v:'new_course',label:'🆕 새 강좌 안내'},
    {v:'monthly',   label:'📊 월간 분석표'},
    {v:'design',    label:'🧭 진로 징검다리 결과'},
    {v:'perf',      label:'📝 수행평가 결과'},
    {v:'etc',       label:'✉️ 기타'}
  ];
  function typeLabel(t){ var f=TYPES.filter(function(x){return x.v===t;})[0]; return f?f.label:'✉️ 기타'; }
  function acadId(){ return window._acadId || (window._academy&&window._academy.id) || null; }
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function el(h){var t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstChild;}

  var CSS=""
    +".aph{max-width:900px;margin:0 auto;font-family:'Noto Sans KR',sans-serif;color:#243244}"
    +".aph *{box-sizing:border-box}"
    +".aph h2{font-size:19px;font-weight:900;color:#1A237E;margin:0 0 4px}"
    +".aph .sub{font-size:12.5px;color:#6b7688;margin-bottom:14px}"
    +".aph .card{background:#fff;border:1px solid #e6e9f0;border-radius:14px;padding:16px 18px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,23,51,.04)}"
    +".aph .fl{font-size:11.5px;font-weight:800;color:#8b95a1;margin:10px 0 5px}"
    +".aph select,.aph input[type=text],.aph textarea{width:100%;border:1.5px solid #dfe3ec;border-radius:9px;padding:10px 12px;font:inherit;font-size:13.5px;background:#fbfcfe;color:#243244}"
    +".aph textarea{resize:vertical}"
    +".aph .row{display:flex;gap:10px;flex-wrap:wrap}.aph .row>*{flex:1;min-width:150px}"
    +".aph .btn{border:none;border-radius:10px;padding:11px 18px;font:inherit;font-weight:800;font-size:13.5px;cursor:pointer;background:linear-gradient(135deg,#1A237E,#0F1548);color:#fff}"
    +".aph .btn:disabled{opacity:.5}"
    +".aph .btn.mut{background:#f0f2f6;color:#6b7688}"
    +".aph .it{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #eef1f4}.aph .it:last-child{border:0}"
    +".aph .it .tt{flex:1}.aph .it .tt b{font-size:13.5px;color:#243244}.aph .it .tt .m{font-size:11.5px;color:#8b95a1;margin-top:2px}"
    +".aph .tag{font-size:10.5px;font-weight:800;background:#eef1ff;color:#1A237E;border-radius:99px;padding:3px 9px}"
    +".aph .del{font-size:11px;color:#c0313d;background:#fdf0f1;border:1px solid #f3c0c5;border-radius:8px;padding:5px 9px;cursor:pointer}"
    +".aph-ov{position:fixed;inset:0;background:rgba(8,11,46,.55);z-index:10000;overflow:auto;padding:24px 14px}"
    +".aph-ovc{max-width:640px;margin:0 auto;background:#fff;border-radius:16px;padding:22px}"
    +".aph-ovc .x{float:right;border:0;background:#1A237E;color:#fff;border-radius:8px;padding:6px 12px;font-weight:800;cursor:pointer}"
    +".aph-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#1A237E;color:#fff;font-size:13px;font-weight:700;padding:11px 18px;border-radius:99px;z-index:10001;opacity:0;transition:.2s}"
    +".aph-toast.on{opacity:1}";
  function inject(){ if(!document.getElementById('aph-css')){var s=document.createElement('style');s.id='aph-css';s.textContent=CSS;document.head.appendChild(s);} }
  function toast(m){ var t=document.querySelector('.aph-toast'); if(!t){t=el('<div class="aph-toast"></div>');document.body.appendChild(t);} t.textContent=m;t.classList.add('on');setTimeout(function(){t.classList.remove('on');},2200); }

  async function loadStaffStudents(){
    var q=window.sb.from('students').select('id,name,grade').eq('academy_id',acadId());
    if(window._isOwner===false && window._myUid){ q=q.eq('consultant_uid',window._myUid); }
    var r=await q.order('name'); return (r&&r.data)||[];
  }
  async function push(studentId,type,title,body,link){
    var r=await window.sb.rpc('push_parent_item',{p_academy:acadId(),p_student:studentId||null,p_type:type,p_title:title,p_body:body,p_data:null,p_link:link||null});
    if(r.error)throw r.error; return r.data;
  }
  async function listSent(){
    var r=await window.sb.from('parent_inbox').select('id,student_id,type,title,created_at,active').eq('academy_id',acadId()).eq('active',true).order('created_at',{ascending:false}).limit(30);
    if(r.error)throw r.error; return r.data||[];
  }
  async function deactivate(id){ var r=await window.sb.from('parent_inbox').update({active:false}).eq('id',id); if(r.error)throw r.error; }

  // 학부모용 조회 (RLS로 자녀+broadcast만)
  async function loadInbox(academyId, studentId){
    var r=await window.sb.from('parent_inbox').select('*').eq('academy_id',academyId||acadId()).eq('active',true).order('created_at',{ascending:false});
    if(r.error) return [];
    return r.data||[];
  }

  function openItem(item){
    inject();
    var ov=el('<div class="aph-ov"><div class="aph-ovc"><button class="x">✕ 닫기</button><div style="clear:both"></div></div></div>');
    var c=ov.querySelector('.aph-ovc');
    c.appendChild(el('<div style="font-size:11px;font-weight:800;color:#8b95a1;letter-spacing:.03em;margin-top:6px">'+esc(typeLabel(item.type))+'</div>'));
    c.appendChild(el('<h2 style="font-size:19px;font-weight:900;color:#1A237E;margin:4px 0 8px">'+esc(item.title||'(제목 없음)')+'</h2>'));
    c.appendChild(el('<div style="font-size:11.5px;color:#8b95a1;margin-bottom:14px">'+esc((item.created_at||'').slice(0,10))+'</div>'));
    if(item.body) c.appendChild(el('<div style="font-size:14px;color:#39465a;line-height:1.85;white-space:pre-wrap">'+esc(item.body)+'</div>'));
    if(item.link) c.appendChild(el('<div style="margin-top:14px"><a href="'+esc(item.link)+'" target="_blank" rel="noopener" style="color:#1A237E;font-weight:700;text-decoration:underline;font-size:13.5px">첨부·링크 열기 →</a></div>'));
    document.body.appendChild(ov);
    ov.querySelector('.x').addEventListener('click',function(){ov.remove();});
    ov.addEventListener('click',function(e){ if(e.target===ov)ov.remove(); });
  }

  function renderList(container, items){
    inject();
    if(!items.length){ container.innerHTML='<div style="text-align:center;color:#8b95a1;font-size:13.5px;padding:30px">받은 항목이 없습니다.</div>'; return; }
    container.innerHTML='';
    items.forEach(function(it){
      var row=el('<div class="it"><div class="tt"><b>'+esc(it.title||'(제목 없음)')+'</b><div class="m">'+esc((it.created_at||'').slice(0,10))+(it.student_id?'':' · 전체 공지')+'</div></div><span class="tag">'+esc(typeLabel(it.type).replace(/^[^ ]+ /,''))+'</span></div>');
      row.style.cursor='pointer';
      row.addEventListener('click',function(){ openItem(it); });
      container.appendChild(row);
    });
  }

  // ── 컨설턴트 전송 도구 ──────────────────────────────────────────────────
  async function mountSend(container){
    inject();
    container=container||document.getElementById('parent-hub-mount');
    if(!container) return;
    var root=el('<div class="aph"></div>'); container.innerHTML=''; container.appendChild(root);
    if(!window.sb){ root.innerHTML='<div class="card">로그인 후 이용할 수 있어요.</div>'; return; }
    root.innerHTML='<h2>학부모에게 보내기</h2><div class="sub">소식지·시간표·새 강좌·월간 분석표, 진로/수행 결과 등을 학부모 대시보드로 전송합니다.</div>'
      +'<div class="card" id="aph-form"></div><h2 style="font-size:15px;margin-top:8px">최근 보낸 항목</h2><div class="card" id="aph-sent"><div class="sub" style="margin:0">불러오는 중…</div></div>';
    var form=root.querySelector('#aph-form');
    var students=[]; try{ students=await loadStaffStudents(); }catch(e){}
    form.innerHTML=''
      +'<div class="row"><div><div class="fl">유형</div><select id="aph-type">'+TYPES.map(function(t){return '<option value="'+t.v+'">'+t.label+'</option>';}).join('')+'</select></div>'
      +'<div><div class="fl">받는 대상</div><select id="aph-target"><option value="">전체 학부모(공지)</option>'+students.map(function(s){return '<option value="'+esc(s.id)+'">'+esc(s.name)+(s.grade?(' · '+esc(s.grade)):'')+' 학부모</option>';}).join('')+'</select></div></div>'
      +'<div class="fl">제목</div><input type="text" id="aph-title" placeholder="예: 3월 학원 소식 / 김서연 월간 분석표">'
      +'<div class="fl">내용</div><textarea id="aph-body" rows="5" placeholder="학부모에게 전달할 내용을 입력하세요."></textarea>'
      +'<div class="fl">링크·첨부 URL (선택)</div><input type="text" id="aph-link" placeholder="https:// (PDF·구글드라이브 등, 선택)">'
      +'<div style="margin-top:14px"><button class="btn" id="aph-send">학부모에게 보내기</button></div>'
      +'<div id="aph-msg" style="font-size:12.5px;margin-top:8px;min-height:14px"></div>';
    var sentBox=root.querySelector('#aph-sent');
    async function refresh(){ try{ var rows=await listSent(); if(!rows.length){ sentBox.innerHTML='<div class="sub" style="margin:0">아직 보낸 항목이 없습니다.</div>'; return; }
      sentBox.innerHTML=''; rows.forEach(function(it){
        var nm = it.student_id ? '개별' : '전체 공지';
        var row=el('<div class="it"><div class="tt"><b>'+esc(it.title||'(제목 없음)')+'</b><div class="m">'+esc(typeLabel(it.type))+' · '+nm+' · '+esc((it.created_at||'').slice(0,10))+'</div></div></div>');
        var d=el('<button class="del">삭제</button>'); d.addEventListener('click',async function(){ if(!confirm('이 항목을 학부모 대시보드에서 내릴까요?'))return; try{ await deactivate(it.id); toast('삭제됨'); refresh(); }catch(e){ toast('실패: '+(e.message||e)); } });
        row.appendChild(d); sentBox.appendChild(row);
      });
    }catch(e){ sentBox.innerHTML='<div class="sub" style="margin:0;color:#c0313d">'+esc(e.message||e)+'</div>'; } }
    form.querySelector('#aph-send').addEventListener('click', async function(){
      var btn=this; var type=form.querySelector('#aph-type').value, target=form.querySelector('#aph-target').value||null;
      var title=form.querySelector('#aph-title').value.trim(), body=form.querySelector('#aph-body').value.trim(), link=form.querySelector('#aph-link').value.trim();
      var msg=form.querySelector('#aph-msg');
      if(!title){ msg.style.color='#c0313d'; msg.textContent='제목을 입력하세요.'; return; }
      btn.disabled=true; msg.style.color='#6b7688'; msg.textContent='전송 중…';
      try{ await push(target, type, title, body, link);
        msg.style.color='#137a44'; msg.textContent=(target?'해당 학부모':'전체 학부모')+'에게 전송했습니다.';
        form.querySelector('#aph-title').value=''; form.querySelector('#aph-body').value=''; form.querySelector('#aph-link').value='';
        refresh();
      }catch(e){ msg.style.color='#c0313d'; msg.textContent='전송 실패: '+(e.message||e); }
      btn.disabled=false;
    });
    refresh();
  }

  window.ArcheParentHub={ mountSend:mountSend, loadInbox:loadInbox, openItem:openItem, renderList:renderList, typeLabel:typeLabel, TYPES:TYPES, version:'1.0' };
})();
