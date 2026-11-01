/* ============================================================================
 * arche_live_report.js · 학생 워크북 수행 상태 → 실시간 관제(student_activity_status) 보고
 * ----------------------------------------------------------------------------
 * 일반고엔진의 학생측 heartbeat(cwStuHbSend) 로직을 아르케 스키마에 맞춰 이식.
 *  - 학생이 워크북(오버레이 .pnta-ov.wb > .apw)을 열어 작성하는 동안 5초마다 upsert
 *  - 보고 항목: 작성 문항수/전체, 마지막 입력시각, 정체(초), 성찰력(thinking_speed_x),
 *               타이핑 진정성(typing_dna_verified), 케어 단계(care_level/care_signal)
 *  - 교사/관리자 미리보기·읽기전용(.apw.ro) 에서는 보고하지 않음
 *  - 저장: 학생 본인 행만(RLS sas_student_rw). 답안 원문/대화 내용은 전송하지 않음.
 * 의존: window.sb, window._role==='stu', window._activeStudent{id,class_id}, window._acadId
 * 설치: <script src="/shared/arche_live_report.js?v=1"></script> (arche_penta_app.js 뒤)
 * ==========================================================================*/
(function () {
  "use strict";
  if (window.ArcheLiveReport) return;

  var HB_MS = 5000, WATCH_MS = 1500;
  var S = null;   // 현재 추적 세션

  // 정서 안전망 키워드(일반고엔진 기준에서 '힘들/모르겠' 등 학습 중 빈출어는 제외)
  var CRISIS_MILD   = ['죽고싶', '사라지고싶', '포기하고싶', '때리', '맞았', '무서워'];
  var CRISIS_SEVERE = ['자살', '죽어버', '학대', '폭력', '도망치고싶'];

  function nowMs() { return Date.now(); }
  function isStudent() { return window._role === 'stu' && window._activeStudent && window._activeStudent.id && window.sb; }

  function fields(root) {
    var list = root.querySelectorAll('.apw textarea, .apw input[type=text]');
    var arr = [], i;
    for (i = 0; i < list.length; i++) { if (!list[i].readOnly && !list[i].disabled) arr.push(list[i]); }
    return arr;
  }
  function progress(root) {
    var els = fields(root), fill = 0, i;
    for (i = 0; i < els.length; i++) { if ((els[i].value || '').trim()) fill++; }
    return { fill: fill, total: els.length };
  }
  function titleOf(root) {
    try {
      var h = root.querySelector('.apw .cover h1, .apw .cover .ti, .apw h1, .apw h2');
      var t = h && (h.textContent || '').trim();
      if (t) return t.slice(0, 60);
    } catch (e) {}
    return '워크북 수행';
  }
  // 성찰력(사고 가속도 근사): 숙고(pause)+정교화(수정) 반영, 1.0~3.0
  function reflectX(t) {
    if (!t.keys) return null;
    var rev = Math.min((t.backs / Math.max(t.keys, 1)) * 4, 1.0);
    var ref = Math.min(t.pauses / 8, 1.0);
    return Math.round((1.0 + rev + ref) * 10) / 10;
  }
  function careOf(stag, text) {
    var i, care = 0, sig = null;
    for (i = 0; i < CRISIS_SEVERE.length; i++) { if (text.indexOf(CRISIS_SEVERE[i]) >= 0) return { care: 4, sig: '정서 안전 확인 필요' }; }
    for (i = 0; i < CRISIS_MILD.length; i++) { if (text.indexOf(CRISIS_MILD[i]) >= 0) { care = 2; sig = '정서 관련 표현 감지'; break; } }
    if (stag > 900 && care < 3) { care = 3; sig = '15분+ 장시간 정체'; }
    else if (stag > 600 && care < 2) { care = 2; sig = '10분+ 정체'; }
    else if (stag > 300 && care < 1) { care = 1; sig = '5분+ 정체'; }
    return { care: care, sig: sig };
  }

  async function send(statusOverride) {
    if (!S || !window.sb) return;
    var st = window._activeStudent;
    try {
      var pg = progress(S.ov), t = S.typing, now = nowMs();
      var base = S.lastInput || S.startAt;
      var stag = Math.max(0, Math.floor((now - base) / 1000));
      var txt = '';
      fields(S.ov).forEach(function (el) { txt += ' ' + (el.value || ''); });
      var c = careOf(stag, txt);
      var status = statusOverride || (pg.total === 0 ? 'waiting' : ((pg.fill > 0 || S.lastInput) ? 'working' : 'waiting'));
      var row = {
        student_id: st.id,
        academy_id: window._acadId || st.academy_id || null,
        class_id: st.class_id || null,
        status: status,
        current_title: S.title,
        cur_idx: pg.fill, total_idx: pg.total,
        fill_count: pg.fill, total_fill: pg.total,
        stagnation_sec: stag,
        last_input_at: S.lastInput ? new Date(S.lastInput).toISOString() : null,
        thinking_speed_x: reflectX(t),
        typing_dna_verified: (t.keys >= 20 && !S.pasted),
        care_level: c.care, care_signal: c.sig,
        updated_at: new Date().toISOString()
      };
      await window.sb.from('student_activity_status').upsert(row, { onConflict: 'student_id' });
    } catch (e) { /* 관제 보고는 best-effort */ }
  }

  function onInput(e) { if (S) S.lastInput = nowMs(); }
  function onKey(e) {
    if (!S) return;
    var tg = e.target; if (!(tg && (tg.tagName === 'TEXTAREA' || tg.tagName === 'INPUT'))) return;
    var t = S.typing, now = nowMs();
    if (t.lastAt) { var gap = now - t.lastAt; if (gap > 2500) t.pauses++; }
    t.lastAt = now; t.keys++;
    if (e.key === 'Backspace' || e.key === 'Delete') t.backs++;
  }
  function onPaste(e) {
    if (!S) return;
    try { var d = e.clipboardData || window.clipboardData; var txt = d ? (d.getData('text') || '') : ''; if (txt.length > 30) S.pasted = true; } catch (er) {}
  }

  function start(ov) {
    stop();
    S = {
      ov: ov, title: titleOf(ov), startAt: nowMs(), lastInput: 0, pasted: false,
      typing: { keys: 0, backs: 0, pauses: 0, lastAt: 0 }, timer: null
    };
    ov.addEventListener('input', onInput, true);
    ov.addEventListener('keydown', onKey, true);
    ov.addEventListener('paste', onPaste, true);
    send();
    S.timer = setInterval(function () { send(); }, HB_MS);
  }
  function stop() {
    if (!S) return;
    var old = S; S = null;
    try { clearInterval(old.timer); } catch (e) {}
    try { old.ov.removeEventListener('input', onInput, true); old.ov.removeEventListener('keydown', onKey, true); old.ov.removeEventListener('paste', onPaste, true); } catch (e) {}
    // 이탈 시 idle 1회 (진행도·성찰력은 유지해 교사가 결과를 볼 수 있게 함)
    try {
      var st = window._activeStudent;
      if (st && window.sb) {
        var pg = { fill: 0, total: 0 };
        try { if (document.body.contains(old.ov)) pg = progress(old.ov); } catch (e) {}
        window.sb.from('student_activity_status').update({ status: 'idle', updated_at: new Date().toISOString() }).eq('student_id', st.id).then(function () {}, function () {});
      }
    } catch (e) {}
  }

  // 워크북 오버레이 감시: 학생이 열면 시작, 닫히면 종료
  function watch() {
    try {
      if (!isStudent()) { if (S) stop(); return; }
      if (S && !document.body.contains(S.ov)) { stop(); }
      if (S) return;
      var ov = document.querySelector('.pnta-ov.wb');
      if (!ov) return;
      var apw = ov.querySelector('.apw');
      if (!apw || apw.classList.contains('ro')) return;      // 읽기전용(제출본 열람) 제외
      if (ov.querySelector('.pnta-wbtag')) return;            // 미리보기 태그가 있으면 제외
      start(ov);
    } catch (e) {}
  }
  setInterval(watch, WATCH_MS);
  window.addEventListener('pagehide', function () { stop(); });

  window.ArcheLiveReport = { version: '1.0', start: start, stop: stop };
})();
