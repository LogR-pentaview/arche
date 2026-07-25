/* ============================================================================
 * arche_report_typingdna.js · 타이핑DNA v2 4계층 리포트 (컨설턴트 화면)
 * ----------------------------------------------------------------------------
 * 데이터원: writing_integrity 행(composite,tier,layers{l1,l2,l3,l4},reasons) + typing_meta
 * API: ArcheReportTyping.render(mount, data)
 *   data = {
 *     student:{name, grade}, source:{title, chars, minutes},
 *     composite, tier('green'|'yellow'|'red'),
 *     layers:{l1,l2,l3,l4},               // 0~100 (l4는 z문자열 "+0.4σ" 허용)
 *     tm:{ intervals:[7], editPos:[10] }, // 있으면 그래프, 없으면 생략
 *     reasons:{l1,l2,l3,l4} 또는 [],
 *     onApprove:fn, onFlag:fn             // 컨설턴트 확정 버튼(옵션)
 *   }
 * ==========================================================================*/
(function () {
  "use strict";
  var CSS = ".artd{max-width:760px;margin:0 auto;font-family:'Pretendard Variable',Pretendard,sans-serif;color:#191f28}"
    + ".artd *{box-sizing:border-box}"
    + ".artd .eb{font-size:11px;font-weight:800;color:#3182f6;letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px}"
    + ".artd .h1{font-size:21px;font-weight:800}.artd .sub{font-size:13px;color:#4e5968;margin-top:6px;line-height:1.6}"
    + ".artd .v2{display:inline-block;font-size:9.5px;font-weight:800;color:#fff;background:#7c3aed;border-radius:5px;padding:2px 7px;margin-left:7px;vertical-align:middle}"
    + ".artd .tgt{display:flex;gap:12px;align-items:center;background:#fff;border:1px solid #e5e8eb;border-radius:14px;padding:14px 18px;margin:18px 0}"
    + ".artd .av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#3182f6,#00b8a9);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none}"
    + ".artd .tnm{font-size:14px;font-weight:800}.artd .tmeta{font-size:12px;color:#8b95a1;margin-top:2px}"
    + ".artd .verdict{border-radius:20px;padding:22px 24px;margin-bottom:16px;color:#fff}"
    + ".artd .verdict.green{background:linear-gradient(135deg,#0f9d8f,#12b76a)}.artd .verdict.yellow{background:linear-gradient(135deg,#e08600,#f79009)}.artd .verdict.red{background:linear-gradient(135deg,#c01d2e,#f04452)}"
    + ".artd .bl{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;opacity:.85}"
    + ".artd .mark{display:flex;align-items:center;gap:14px;margin:10px 0 4px}.artd .circle{width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:26px;flex:none}"
    + ".artd .tier{font-size:22px;font-weight:800}.artd .sc{font-size:13px;opacity:.9;font-family:ui-monospace,monospace;margin-top:2px}.artd .vd{font-size:12.5px;line-height:1.6;opacity:.95;margin-top:8px}"
    + ".artd .gauge{margin-top:14px;background:rgba(255,255,255,.16);border-radius:10px;padding:11px 13px}.artd .gt{height:8px;border-radius:99px;background:rgba(255,255,255,.25);overflow:hidden;margin-top:6px}.artd .gt i{display:block;height:100%;background:#fff;border-radius:99px}"
    + ".artd .gz{display:flex;justify-content:space-between;font-size:9.5px;opacity:.8;margin-top:4px;font-family:ui-monospace,monospace}"
    + ".artd .lt{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#8b95a1;margin:22px 4px 12px}"
    + ".artd .layer{background:#fff;border:1px solid #e5e8eb;border-radius:14px;padding:16px 18px;margin-bottom:11px}"
    + ".artd .lh{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px}.artd .ln{font-size:13.5px;font-weight:800;display:flex;align-items:center;gap:9px}"
    + ".artd .lnb{width:24px;height:24px;border-radius:7px;background:#f4f6f8;font-size:11px;font-weight:800;color:#4e5968;display:inline-flex;align-items:center;justify-content:center}"
    + ".artd .lsc{font-size:13px;font-weight:800;font-family:ui-monospace,monospace}.artd .lsc.ok{color:#12b76a}.artd .lsc.mid{color:#f79009}.artd .lsc.low{color:#f04452}"
    + ".artd .ld{font-size:12px;color:#4e5968;line-height:1.55;margin-top:10px}.artd .ld b{color:#191f28}"
    + ".artd .rg{display:flex;align-items:flex-end;gap:2px;height:56px;background:#f4f6f8;border-radius:9px;padding:8px 10px}.artd .rg .bar{flex:1;background:linear-gradient(180deg,#00b8a9,#3182f6);border-radius:2px 2px 0 0;min-height:3px;opacity:.85}.artd .rg .bar.pause{background:#e5e8eb;opacity:1}"
    + ".artd .em{background:#f4f6f8;border-radius:9px;padding:12px 14px}.artd .eml{height:8px;border-radius:3px;background:#e5e8eb;position:relative;overflow:hidden;margin-bottom:5px}.artd .eml .e{position:absolute;top:0;height:100%;background:#00b8a9;opacity:.7;border-radius:3px}"
    + ".artd .ime{display:flex;gap:9px;align-items:flex-start;background:rgba(49,130,246,.06);border:1px solid rgba(49,130,246,.18);border-radius:11px;padding:11px 14px;margin-top:11px;font-size:11.5px;color:#4e5968;line-height:1.55}.artd .ime b{color:#3182f6}"
    + ".artd .cc{background:linear-gradient(180deg,rgba(49,130,246,.05),rgba(49,130,246,.01));border:1.5px solid rgba(49,130,246,.25);border-radius:16px;padding:20px 22px;margin-top:22px}"
    + ".artd .ct{font-size:14px;font-weight:800;margin-bottom:4px}.artd .cd{font-size:12.5px;color:#4e5968;line-height:1.6;margin-bottom:16px}"
    + ".artd .cact{display:flex;gap:10px}.artd .cbtn{flex:1;padding:13px;border-radius:11px;font-size:13.5px;font-weight:700;border:1px solid #e5e8eb;background:#fff;cursor:pointer}.artd .cbtn.ap{background:#12b76a;color:#fff;border-color:#12b76a}.artd .cbtn.fl{color:#f79009;border-color:rgba(247,144,9,.4)}"
    + ".artd .cn{font-size:11.5px;color:#8b95a1;margin-top:12px;line-height:1.55}";

  function inject() { if (document.getElementById("artd-css")) return; var s = document.createElement("style"); s.id = "artd-css"; s.textContent = CSS; document.head.appendChild(s); }
  function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function cls(v){ v=+v; return v>=75?"ok":v>=45?"mid":"low"; }
  function tierWord(t){ return t==="green"?"신뢰 · 직접 작성":t==="yellow"?"주의 · 확인 권장":"위험 · 대필/AI 의심"; }

  function rhythm(intervals){
    if(!intervals||!intervals.length) return "";
    var max=Math.max.apply(null,intervals)||1;
    return '<div class="rg">'+intervals.map(function(v,i){var h=Math.max(6,Math.round(v/max*100));var p=(i%4===3)?" pause":"";return '<div class="bar'+p+'" style="height:'+h+'%"></div>';}).join("")+'</div>'
      +'<div style="display:flex;justify-content:space-between;font-size:10.5px;color:#8b95a1;margin-top:6px"><span>타이핑 속도(구간별)</span><span>회색 = 멈춘 구간</span></div>';
  }
  function editmap(editPos){
    if(!editPos||!editPos.length) return "";
    var rows=""; for(var r=0;r<5;r++){var line="";for(var i=0;i<editPos.length;i++){var v=editPos[i]||0;if(v>0 && (i%5)===r){line+='<span class="e" style="left:'+(i/editPos.length*100)+'%;width:'+Math.min(14,6+v)+'%"></span>';}}rows+='<div class="eml">'+line+'</div>';}
    return '<div class="em">'+rows+'<div style="display:flex;gap:14px;font-size:10.5px;color:#8b95a1;margin-top:9px"><span>■ 작성 문장</span><span style="color:#00b8a9">■ 수정·퇴고 위치</span></div></div>';
  }

  function render(mount, d) {
    inject(); d = d || {};
    var tier = d.tier || (d.composite>=75?"green":d.composite>=45?"yellow":"red");
    var L = d.layers || {}; var R = d.reasons || {};
    var initial = (d.student && d.student.name) ? d.student.name.charAt(0) : "학";
    var root = document.createElement("div"); root.className = "artd";
    root.innerHTML =
      '<div class="eb">Typing DNA v2 · 작성 무결성 인증</div>'
      + '<div class="h1">이 학생이 직접 썼습니다 <span class="v2">고도화</span></div>'
      + '<div class="sub">붙여넣기 감지를 넘어, 타이핑 리듬·수정 흐름·본인 고유 패턴까지 4계층 분석.</div>'
      + '<div class="tgt"><div class="av">'+esc(initial)+'</div><div><div class="tnm">'+esc((d.student&&d.student.name)||"학생")+' · '+esc((d.student&&d.student.grade)||"")+'</div>'
      + '<div class="tmeta">'+esc((d.source&&d.source.title)||"")+(d.source&&d.source.chars?' · '+d.source.chars+'자':'')+(d.source&&d.source.minutes?' · 작성 '+d.source.minutes+'분':'')+'</div></div></div>'
      + '<div class="verdict '+tier+'"><div class="bl">종합 판정</div>'
      + '<div class="mark"><div class="circle">'+(tier==="green"?"✓":tier==="yellow"?"!":"×")+'</div><div><div class="tier">'+esc(tierWord(tier))+'</div>'
      + '<div class="sc">Composite '+(d.composite!=null?d.composite:"-")+' / 100 · Tier '+tier.toUpperCase()+'</div></div></div>'
      + '<div class="vd">'+esc(d.verdictDesc || (tier==="green"?"4개 계층 신호가 모두 정상 범위입니다. 외부 복사·AI 대필 징후가 없습니다.":tier==="yellow"?"일부 계층에서 주의 신호가 있습니다. 컨설턴트 확인을 권장합니다.":"복사·대필 의심 신호가 감지됐습니다. 학생과 확인이 필요합니다."))+'</div>'
      + '<div class="gauge"><div style="display:flex;justify-content:space-between;font-size:10.5px;opacity:.9"><span>종합 신뢰도</span><span style="font-family:ui-monospace,monospace">'+(d.composite!=null?d.composite:"-")+'</span></div>'
      + '<div class="gt"><i style="width:'+(d.composite||0)+'%"></i></div><div class="gz"><span>0 위험</span><span>45</span><span>75 신뢰</span><span>100</span></div></div></div>'
      + '<div class="lt">4계층 신호 분석</div>'
      + layer("L1","리듬 패턴",L.l1,R.l1||"입력 간격의 버스트-정지 패턴 — 사람 특유의 리듬. 기계적 필사·일괄 붙여넣기가 아닙니다.",rhythm(d.tm&&d.tm.intervals))
      + layer("L2","수정 위치 지도",L.l2,R.l2||"수정이 글 전체에 분산 — 처음부터 끝까지 다시 읽으며 다듬은 흔적.",editmap(d.tm&&d.tm.editPos))
      + layer("L3","의미 변화 추적",L.l3,R.l3||"초안 대비 최종본에서 어휘·논리가 실제로 발전. 통째 옮긴 글엔 이 변화가 없습니다.","")
      + layer("L4","본인 이력 대조",L.l4,R.l4||"이번 작성이 이 학생 평소 습관과 일치. 급격한 속도 도약·수정 소실이 없습니다.","<div class=\"ime\"><span>🔤</span><div><b>한글 입력 보정</b> — 자모 조합을 음절 단위로 측정해 키카운트 오탐을 제거했습니다.</div></div>")
      + '<div class="cc"><div class="ct">🖊️ 컨설턴트 최종 확인</div><div class="cd">AI는 근거를 모을 뿐, <b>인증 확정은 사람</b>입니다. 4계층 신호를 검토하고 이 학생의 작성을 인증하시겠습니까?</div>'
      + '<div class="cact"><button class="cbtn ap" data-ap>✓ 직접 작성 인증</button><button class="cbtn fl" data-fl>보류 · 학생과 확인</button></div>'
      + '<div class="cn">🔒 \'red\' 판정은 학생·학부모에게 자동 노출되지 않습니다. 컨설턴트가 확인 후 대화로 풀어가는 것이 원칙입니다.</div></div>';
    mount.innerHTML = ""; mount.appendChild(root);
    var ap=root.querySelector("[data-ap]"), fl=root.querySelector("[data-fl]");
    if(ap) ap.onclick=function(){ if(d.onApprove)d.onApprove(); ap.textContent="인증됨 ✓"; ap.disabled=true; };
    if(fl) fl.onclick=function(){ if(d.onFlag)d.onFlag(); fl.textContent="보류 처리됨"; };
    return root;
  }
  function layer(code,name,score,desc,extra){
    var disp = (typeof score==="string")?score:(score!=null?score:"-");
    var c = (typeof score==="number")?cls(score):"ok";
    return '<div class="layer"><div class="lh"><div class="ln"><span class="lnb">'+code+'</span>'+esc(name)+'</div><div class="lsc '+c+'">'+esc(disp)+'</div></div>'
      + (extra&&/rg|em/.test(extra)?extra:"")
      + '<div class="ld">'+esc(desc)+'</div>'
      + (extra&&!/rg|em/.test(extra)?extra:"")+'</div>';
  }

  window.ArcheReportTyping = { render: render, version: "1.0" };
})();
