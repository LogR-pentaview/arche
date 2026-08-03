/* ARCHE 자기주도 시스템 (합격 역설계 · 학생 자기주도모드)
 * 저장소: public.arche_selfdrive (student_id PK, mode, data jsonb)
 * 전역: window.ArcheSelfDrive
 * 의존: 전역 sb(Supabase client). esc는 없으면 자체 폴백.
 */
(function(){
  "use strict";
  var TAG='[ArcheSelfDrive]';
  function _sb(){ return window.sb || null; }
  function esc(s){ if(window.esc) return window.esc(s); s=(s==null?'':String(s)); return s.replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function num(v){ v=parseFloat(v); return isNaN(v)?null:v; }
  function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }

  var AXES=[['activity','활동'],['thinking','사고'],['values','가치관'],['vision','비전']];

  /* ---------- CSS (1회 주입) ---------- */
  function injectCSS(){
    if(document.getElementById('asd-css')) return;
    var st=document.createElement('style'); st.id='asd-css';
    st.textContent=[
      '.asd-wrap{max-width:760px}',
      '.asd-card{background:var(--panel,#151a22);border:1px solid var(--line,#232a35);border-radius:14px;padding:18px 20px;margin-bottom:14px}',
      '.asd-card h4{font-size:14px;color:var(--ink,#eaf3ee);margin:0 0 4px;font-weight:800;display:flex;align-items:center;gap:8px}',
      '.asd-card .hint{font-size:11.5px;color:var(--ink-mute,#7d8794);line-height:1.6;margin-bottom:12px}',
      '.asd-in{width:100%;padding:9px 11px;background:var(--panel-2,#0f1319);border:1px solid var(--line,#232a35);border-radius:8px;color:var(--ink,#eaf3ee);font-size:13px;box-sizing:border-box}',
      '.asd-row{display:flex;gap:8px;margin-bottom:8px}',
      '.asd-tgt{background:var(--panel-2,#0f1319);border:1px solid var(--line,#232a35);border-radius:10px;padding:12px;margin-bottom:10px;position:relative}',
      '.asd-tgt .del{position:absolute;top:8px;right:10px;color:var(--ink-mute,#7d8794);cursor:pointer;font-size:16px;line-height:1;background:none;border:none}',
      '.asd-gap{display:inline-block;font-size:11px;font-weight:700;border-radius:6px;padding:2px 9px;margin-top:8px}',
      '.asd-ax{padding:9px 0;border-bottom:1px solid var(--line-soft,rgba(234,243,238,.06))}',
      '.asd-ax .lab{display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-dim,#aeb7c2);margin-bottom:5px}',
      '.asd-ax input[type=range]{width:100%;accent-color:var(--gold,#3182f6)}',
      '.asd-bar{height:7px;background:var(--panel-2,#0f1319);border-radius:4px;overflow:hidden}',
      '.asd-bar i{display:block;height:100%;background:linear-gradient(90deg,#12b76a,var(--gold,#3182f6))}',
      '.asd-mi{display:flex;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid var(--line-soft,rgba(234,243,238,.06))}',
      '.asd-mi input[type=checkbox]{width:17px;height:17px;accent-color:var(--lime,#00b8a9);flex:none;cursor:pointer}',
      '.asd-mi .t{flex:1;font-size:13px;color:var(--ink,#eaf3ee)}',
      '.asd-mi .t.done{text-decoration:line-through;color:var(--ink-mute,#7d8794)}',
      '.asd-mi .x{color:var(--ink-mute,#7d8794);cursor:pointer;background:none;border:none;font-size:15px}',
      '.asd-prog{height:9px;background:var(--panel-2,#0f1319);border-radius:5px;overflow:hidden;margin:8px 0}',
      '.asd-prog i{display:block;height:100%;background:linear-gradient(90deg,#12b76a,var(--lime,#00b8a9))}',
      '.asd-btn{padding:11px 16px;background:var(--gold,#3182f6);color:#fff;border:none;border-radius:9px;font-weight:700;cursor:pointer;font-size:13px}',
      '.asd-btn.ghost{background:transparent;border:1px solid var(--line,#232a35);color:var(--ink-dim,#aeb7c2)}',
      '.asd-save{position:sticky;bottom:0;background:var(--panel,#151a22);padding:12px 0;display:flex;gap:10px;align-items:center;border-top:1px solid var(--line,#232a35);margin-top:6px}',
      '.asd-save .msg{font-size:12px;color:var(--safe,#12b76a)}',
      '.asd-empty{color:var(--ink-mute,#7d8794);padding:22px;text-align:center;font-size:13px;line-height:1.7}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- 데이터 정규화 ---------- */
  function normalize(data){
    data=data||{};
    var d={
      targets: Array.isArray(data.targets)?data.targets.slice(0,3):[],
      grade: (data.grade!=null&&!isNaN(data.grade))?Number(data.grade):null,
      self4: data.self4||{},
      missions: Array.isArray(data.missions)?data.missions:[]
    };
    AXES.forEach(function(a){ var v=d.self4[a[0]]; d.self4[a[0]]=(v!=null&&!isNaN(v))?clamp(Number(v),0,10):0; });
    return d;
  }

  /* ---------- DB ---------- */
  function load(studentId){
    var sb=_sb(); if(!sb||!studentId) return Promise.resolve(null);
    return sb.from('arche_selfdrive').select('*').eq('student_id',studentId).limit(1)
      .then(function(r){ if(r.error){ console.warn(TAG,'load',r.error); return null; } return (r.data&&r.data[0])||null; });
  }
  function save(studentId, patch){
    var sb=_sb(); if(!sb||!studentId) return Promise.reject(new Error('no sb/student'));
    var row={ student_id:studentId, data:patch.data, updated_at:new Date().toISOString() };
    if(patch.mode) row.mode=patch.mode;
    return sb.from('arche_selfdrive').upsert(row,{onConflict:'student_id'}).select().then(function(r){
      if(r.error) throw r.error; return (r.data&&r.data[0])||row;
    });
  }
  function setMode(studentId, mode){
    var sb=_sb(); if(!sb||!studentId) return Promise.reject(new Error('no sb/student'));
    return sb.from('arche_selfdrive').upsert({student_id:studentId,mode:mode,updated_at:new Date().toISOString()},{onConflict:'student_id'})
      .then(function(r){ if(r.error) throw r.error; return mode; });
  }

  /* ---------- 격차 계산 ---------- */
  function gapBadge(grade, cut){
    var g=num(grade), c=num(cut);
    if(g==null||c==null) return '';
    var diff=+(g-c).toFixed(2); // 낮을수록 좋음(등급)
    var col,label;
    if(diff<=-0.2){ col='var(--safe,#12b76a)'; label='안정권 (여유 '+Math.abs(diff)+'등급)'; }
    else if(diff<=0.2){ col='var(--reach,#f79009)'; label='적정권 (격차 '+(diff>0?'+':'')+diff+'등급)'; }
    else { col='var(--risk,#f04452)'; label='상향 지원 (부족 '+diff+'등급)'; }
    return '<span class="asd-gap" style="color:'+col+';border:1px solid '+col+'">'+label+'</span>';
  }

  function missionPct(missions){
    if(!missions.length) return 0;
    var done=missions.filter(function(m){return m.done;}).length;
    return Math.round(done/missions.length*100);
  }

  /* ================= 학생: 자기주도 에디터 ================= */
  function renderEditor(container, opts){
    injectCSS();
    opts=opts||{}; var student=opts.student||{}; var sid=student.id;
    container.innerHTML='<div class="asd-empty">불러오는 중…</div>';
    load(sid).then(function(row){
      var d=normalize(row&&row.data);
      var state={ d:d, dirty:false };
      draw();

      function markDirty(){ state.dirty=true; var m=container.querySelector('#asd-msg'); if(m){m.textContent='';m.style.color='var(--safe,#12b76a)';} }

      function draw(){
        var d=state.d;
        var tgtHTML=d.targets.map(function(t,i){
          return '<div class="asd-tgt" data-i="'+i+'">'
            +'<button class="del" data-del="'+i+'" title="삭제">×</button>'
            +'<div class="asd-row"><input class="asd-in" data-f="univ" data-i="'+i+'" placeholder="목표 대학 (예: 연세대)" value="'+esc(t.univ||'')+'" style="flex:1.2"><input class="asd-in" data-f="major" data-i="'+i+'" placeholder="학과 (예: 경영)" value="'+esc(t.major||'')+'" style="flex:1"></div>'
            +'<div class="asd-row"><input class="asd-in" data-f="cut" data-i="'+i+'" inputmode="decimal" placeholder="합격 커트라인 등급 (예: 1.3)" value="'+(t.cut!=null?esc(t.cut):'')+'"></div>'
            +gapBadge(d.grade,t.cut)
            +'</div>';
        }).join('');
        if(d.targets.length<3) tgtHTML+='<button class="asd-btn ghost" id="asd-addtgt" style="width:100%">＋ 목표 추가</button>';

        var axHTML=AXES.map(function(a){
          var v=d.self4[a[0]]||0;
          return '<div class="asd-ax"><div class="lab"><span>'+a[1]+'</span><b class="mono" style="color:var(--gold,#3182f6)">'+v+'<span style="color:var(--ink-mute,#7d8794);font-weight:400">/10</span></b></div>'
            +'<input type="range" min="0" max="10" step="1" value="'+v+'" data-ax="'+a[0]+'">'
            +'<div class="asd-bar" style="margin-top:6px"><i style="width:'+(v*10)+'%"></i></div></div>';
        }).join('');

        var pct=missionPct(d.missions);
        var miHTML=d.missions.map(function(m,i){
          return '<div class="asd-mi"><input type="checkbox" data-mi="'+i+'"'+(m.done?' checked':'')+'><span class="t'+(m.done?' done':'')+'">'+esc(m.t||'')+'</span><button class="x" data-mix="'+i+'" title="삭제">×</button></div>';
        }).join('') || '<div style="font-size:12px;color:var(--ink-mute,#7d8794);padding:6px 0">아직 미션이 없어요. 이번 주에 할 일을 추가해 보세요.</div>';

        container.innerHTML=
          '<div class="asd-wrap">'
          +'<div class="asd-card"><h4>🎯 나의 목표</h4><div class="hint">가고 싶은 대학·학과를 최대 3개까지 적고, 아는 만큼 합격 커트라인 등급을 넣어 보세요. 내 현재 등급과 자동 비교됩니다.</div>'+tgtHTML+'</div>'
          +'<div class="asd-card"><h4>📊 현재 나의 위치</h4><div class="hint">가장 최근 내신 평균 등급을 입력하세요.</div>'
            +'<input class="asd-in" id="asd-grade" inputmode="decimal" placeholder="현재 내신 등급 (예: 1.42)" value="'+(d.grade!=null?esc(d.grade):'')+'" style="max-width:260px"></div>'
          +'<div class="asd-card"><h4>🧭 역량 자가진단 <span style="font-size:11px;color:var(--ink-mute,#7d8794);font-weight:500">· 솔직하게</span></h4><div class="hint">활동·사고·가치관·비전 4가지를 스스로 0~10점으로 평가해 보세요. 낮은 축이 앞으로 채워갈 부분이에요.</div>'+axHTML+'</div>'
          +'<div class="asd-card"><h4>✅ 이번 주 실행 미션</h4><div class="hint">목표를 위해 이번 주에 실제로 할 일을 적고, 끝내면 체크하세요.</div>'
            +'<div class="asd-prog"><i style="width:'+pct+'%"></i></div><div style="font-size:12px;color:var(--ink-dim,#aeb7c2);margin-bottom:6px">진행률 <b style="color:var(--lime,#00b8a9)">'+pct+'%</b> · '+d.missions.filter(function(m){return m.done;}).length+'/'+d.missions.length+'</div>'
            +'<div id="asd-milist">'+miHTML+'</div>'
            +'<div class="asd-row" style="margin-top:10px"><input class="asd-in" id="asd-newmi" placeholder="예: 관심 분야 논문 1편 요약하기"><button class="asd-btn ghost" id="asd-addmi" style="flex:none">추가</button></div></div>'
          +'<div class="asd-save"><button class="asd-btn" id="asd-save">저장</button><span class="msg" id="asd-msg"></span></div>'
          +'</div>';
        bind();
      }

      function bind(){
        // targets
        container.querySelectorAll('input[data-f]').forEach(function(el){
          el.addEventListener('input',function(){
            var i=+el.getAttribute('data-i'), f=el.getAttribute('data-f');
            if(!state.d.targets[i]) state.d.targets[i]={};
            state.d.targets[i][f]=(f==='cut')?el.value.trim():el.value;
            markDirty();
            if(f==='cut'||f==='grade'){ refreshGaps(); }
          });
        });
        container.querySelectorAll('button[data-del]').forEach(function(b){
          b.addEventListener('click',function(){ var i=+b.getAttribute('data-del'); state.d.targets.splice(i,1); markDirty(); draw(); });
        });
        var addT=container.querySelector('#asd-addtgt'); if(addT) addT.addEventListener('click',function(){ state.d.targets.push({}); markDirty(); draw(); });
        // grade
        var g=container.querySelector('#asd-grade'); if(g) g.addEventListener('input',function(){ state.d.grade=num(g.value); markDirty(); refreshGaps(); });
        // axes
        container.querySelectorAll('input[data-ax]').forEach(function(el){
          el.addEventListener('input',function(){
            var k=el.getAttribute('data-ax'); state.d.self4[k]=clamp(+el.value,0,10); markDirty();
            var wrap=el.closest('.asd-ax'); if(wrap){ wrap.querySelector('.lab b').innerHTML=state.d.self4[k]+'<span style="color:var(--ink-mute,#7d8794);font-weight:400">/10</span>'; wrap.querySelector('.asd-bar i').style.width=(state.d.self4[k]*10)+'%'; }
          });
        });
        // missions toggle/del
        container.querySelectorAll('input[data-mi]').forEach(function(el){
          el.addEventListener('change',function(){ var i=+el.getAttribute('data-mi'); state.d.missions[i].done=el.checked; markDirty(); draw(); });
        });
        container.querySelectorAll('button[data-mix]').forEach(function(b){
          b.addEventListener('click',function(){ var i=+b.getAttribute('data-mix'); state.d.missions.splice(i,1); markDirty(); draw(); });
        });
        var addMi=container.querySelector('#asd-addmi'), newMi=container.querySelector('#asd-newmi');
        function doAdd(){ var t=(newMi.value||'').trim(); if(!t) return; state.d.missions.push({t:t,done:false}); markDirty(); draw(); }
        if(addMi) addMi.addEventListener('click',doAdd);
        if(newMi) newMi.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); doAdd(); } });
        // save
        var sv=container.querySelector('#asd-save'); if(sv) sv.addEventListener('click',doSave);
      }

      function refreshGaps(){
        container.querySelectorAll('.asd-tgt').forEach(function(el){
          var i=+el.getAttribute('data-i'); var t=state.d.targets[i]||{};
          var old=el.querySelector('.asd-gap'); if(old) old.remove();
          var html=gapBadge(state.d.grade,t.cut);
          if(html) el.insertAdjacentHTML('beforeend',html);
        });
      }

      function doSave(){
        var msg=container.querySelector('#asd-msg'); if(msg){ msg.style.color='var(--ink-dim,#aeb7c2)'; msg.textContent='저장 중…'; }
        // 정리: 빈 목표 제거
        state.d.targets=state.d.targets.filter(function(t){ return (t.univ||t.major||t.cut); }).map(function(t){ return {univ:t.univ||'',major:t.major||'',cut:(t.cut!==''&&t.cut!=null)?t.cut:null}; });
        save(sid,{ data:state.d, mode: (row&&row.mode)||'student' }).then(function(saved){
          row=saved; state.dirty=false;
          if(msg){ msg.style.color='var(--safe,#12b76a)'; msg.textContent='✅ 저장됐어요'; setTimeout(function(){ if(msg)msg.textContent=''; },2200); }
          if(opts.onSaved) opts.onSaved(saved);
        }).catch(function(e){
          console.error(TAG,'save',e);
          if(msg){ msg.style.color='var(--risk,#f04452)'; msg.textContent='저장 실패: '+(e.message||e); }
        });
      }
    });
  }

  /* ================= 학부모/컨설턴트: 읽기전용 진행 뷰 ================= */
  function renderParentView(container, opts){
    injectCSS();
    opts=opts||{}; var student=opts.student||{}; var sid=student.id;
    container.innerHTML='<div class="asd-empty">불러오는 중…</div>';
    load(sid).then(function(row){
      if(!row || !row.data || (!(row.data.targets&&row.data.targets.length) && !row.data.missions && row.data.grade==null)){
        container.innerHTML='<div class="asd-card"><div class="asd-empty">🦉 아직 '+esc(student.name||'학생')+' 학생이 자기주도 진행을 시작하지 않았어요.<br>학생이 로그인해 <b>합격 역설계</b>에서 목표·미션을 입력하면 여기에 실시간으로 표시됩니다.</div></div>';
        return;
      }
      var d=normalize(row.data);
      var upd = row.updated_at ? new Date(row.updated_at) : null;
      var updLabel = upd ? (upd.getFullYear()+'.'+String(upd.getMonth()+1).padStart(2,'0')+'.'+String(upd.getDate()).padStart(2,'0')) : '';

      var tgtHTML=d.targets.length ? d.targets.map(function(t){
        return '<div class="asd-tgt"><div style="font-size:13.5px;color:var(--ink,#eaf3ee);font-weight:700">'+esc(t.univ||'-')+' '+esc(t.major||'')+'</div>'
          +'<div style="font-size:11.5px;color:var(--ink-mute,#7d8794);margin-top:3px">커트라인 '+(t.cut!=null?esc(t.cut)+'등급':'미입력')+' · 현재 '+(d.grade!=null?d.grade+'등급':'미입력')+'</div>'
          +gapBadge(d.grade,t.cut)+'</div>';
      }).join('') : '<div style="font-size:12px;color:var(--ink-mute,#7d8794)">입력된 목표가 없습니다.</div>';

      var axHTML=AXES.map(function(a){ var v=d.self4[a[0]]||0;
        return '<div class="asd-ax"><div class="lab"><span>'+a[1]+'</span><b class="mono" style="color:var(--gold,#3182f6)">'+v+'/10</b></div><div class="asd-bar"><i style="width:'+(v*10)+'%"></i></div></div>';
      }).join('');

      var pct=missionPct(d.missions);
      var miHTML=d.missions.length ? d.missions.map(function(m){
        return '<div class="asd-mi"><span style="flex:none;font-size:14px">'+(m.done?'✅':'⬜')+'</span><span class="t'+(m.done?' done':'')+'">'+esc(m.t||'')+'</span></div>';
      }).join('') : '<div style="font-size:12px;color:var(--ink-mute,#7d8794)">등록된 미션이 없습니다.</div>';

      container.innerHTML='<div class="asd-wrap">'
        +'<div style="font-size:11.5px;color:var(--ink-mute,#7d8794);margin-bottom:12px">👀 학생 자기주도 진행 현황 (읽기 전용)'+(updLabel?' · 최근 업데이트 '+updLabel:'')+'</div>'
        +'<div class="asd-card"><h4>🎯 학생이 설정한 목표</h4>'+tgtHTML+'</div>'
        +'<div class="asd-card"><h4>🧭 역량 자가진단</h4>'+axHTML+'</div>'
        +'<div class="asd-card"><h4>✅ 실행 미션 진행률</h4><div class="asd-prog"><i style="width:'+pct+'%"></i></div>'
          +'<div style="font-size:12px;color:var(--ink-dim,#aeb7c2);margin-bottom:8px">진행률 <b style="color:var(--lime,#00b8a9)">'+pct+'%</b> · '+d.missions.filter(function(m){return m.done;}).length+'/'+d.missions.length+'</div>'+miHTML+'</div>'
        +'</div>';
    });
  }

  window.ArcheSelfDrive={ load:load, save:save, setMode:setMode, renderEditor:renderEditor, renderParentView:renderParentView };
})();
