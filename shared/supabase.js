/* =========================================================
   아르케 · Supabase 클라이언트  (shared/supabase.js)
   ---------------------------------------------------------
   로드 순서(중요):
     1) supabase-js (CDN)
     2) shared/config.js
     3) 이 파일 (shared/supabase.js)
   → 이후 모든 코드에서 전역 sb 로 DB에 접근합니다.
   ========================================================= */

let sb = null;

if (window.supabase && window.supabase.createClient) {
  try {
    sb = window.supabase.createClient(SB_URL, SB_KEY);
    window.sb = sb;
  } catch (e) {
    console.error('[arche] supabase init 실패', e);
  }
} else {
  console.error('[arche] supabase-js 미로드 (CDN 차단?) — <script src=".../supabase-js@2"> 를 config.js 앞에 로드했는지 확인');
}
