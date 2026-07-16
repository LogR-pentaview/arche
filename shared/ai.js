/* =========================================================
   아르케 · AI / 엣지함수 호출 래퍼  (shared/ai.js)
   ---------------------------------------------------------
   로드 순서: config.js → supabase.js → 이 파일
   · 4개 앱이 동일하게 사용하는 AI 호출 진입점입니다.
   · 대필 금지 등 실제 생성 규칙은 서버(arche-ai 엣지함수)에서 강제됩니다.
   ========================================================= */

/* 학원 자체 키(BYOK) 기반 AI 엣지함수 호출 */
async function callAI(task, payload) {
  if (!sb) throw new Error('DB 미로드');
  var sess = (await sb.auth.getSession()).data.session;
  var res = await fetch(FN_BASE + '/arche-ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (sess ? sess.access_token : '')
    },
    body: JSON.stringify({ task: task, payload: payload })
  });
  var d = await res.json();
  if (!res.ok) {
    if (d.demo_exhausted || d.demo_expired) throw new Error(d.error || '체험 횟수 소진');
    throw new Error(d.error || 'AI 오류');
  }
  /* 게스트 데모 크레딧 갱신 (게스트 화면이 있을 때만 동작) */
  if (d.demo_credits && window._demo && typeof updateDemoBanner === 'function') {
    window._demo.credits = d.demo_credits;
    updateDemoBanner();
  }
  return d;
}
window.callAI = callAI;

/* CareerNet(전공·계열 매핑) 엣지함수 */
async function careernet(action, query) {
  if (!sb) return null;
  var sess = (await sb.auth.getSession()).data.session;
  try {
    var res = await fetch(FN_BASE + '/careernet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (sess ? sess.access_token : '')
      },
      body: JSON.stringify({ action: action, query: query })
    });
    var d = await res.json();
    return res.ok ? d : null;
  } catch (e) {
    return null;
  }
}
window.careernet = careernet;
