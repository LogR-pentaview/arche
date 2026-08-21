/* =========================================================
   아르케 · 공통 설정  (shared/config.js)
   ---------------------------------------------------------
   · 모든 앱(academy · parent · admin · partner)이 "가장 먼저" 로드합니다.
   · 여기 값은 전부 "클라이언트 공개용"입니다 (RLS로 보호되므로 노출 안전).
   · 새 앱 코드에서는 아래 상수들을 다시 정의하지 말고 이 파일 하나만 로드하세요.
   ========================================================= */

/* Supabase 프로젝트 (pentaview-arche · 서울 리전) */
const SB_URL = "https://dvxepjctjazobrkjrkdw.supabase.co";
const SB_KEY = "sb_publishable_-0O77zGATzEM5_FyEbO_wQ_vCykpXUn"; // publishable key · RLS 보호

/* Toss Payments
   현재 테스트 키. 자동결제(빌링) 계약 체결 후 live_ck_... 로 이 한 줄만 교체하면 됩니다. */
const TOSS_CLIENT_KEY = "test_ck_Z61JOxRQVEaxkB6AzWb0VW0X9bAq";

/* Toss Payments · 결제위젯(v2) 연동 키  ★ 반드시 '결제위젯 연동 키'(test_gck_.../live_gck_...) 사용
   토스 개발자센터 → 내 개발정보 → API 키 → '결제위젯 연동 키'의 클라이언트 키를 복사해 붙여넣으세요.
   (일반 결제창 키 test_ck_ 로는 위젯이 뜨지 않습니다.) */
const TOSS_WIDGET_CLIENT_KEY = "";  // 예: "test_gck_XXXXXXXXXXXXXXXXXXXXXXXX"

/* 엣지 함수 베이스 URL (편의용) */
const FN_BASE = SB_URL + "/functions/v1";

/* 전역 노출 (인라인 onclick·다른 파일에서 window.SB_URL 등으로 접근 가능하게) */
window.SB_URL = SB_URL;
window.SB_KEY = SB_KEY;
window.TOSS_CLIENT_KEY = TOSS_CLIENT_KEY;
window.TOSS_WIDGET_CLIENT_KEY = TOSS_WIDGET_CLIENT_KEY;
window.FN_BASE = FN_BASE;
