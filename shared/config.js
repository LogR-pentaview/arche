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

/* Toss Payments · API 개별 연동 키(결제창/빌링)  클라이언트 키(ck)
   ▸ 짝이 되는 시크릿 키(live_sk_…)는 Supabase 시크릿 TOSS_SECRET_KEY 에 설정 (빌링/자동결제 승인용) */
const TOSS_CLIENT_KEY = "live_ck_6bJXmgo28e92O94RbWeW8LAnGKWx";

/* Toss Payments · 결제위젯(주문서형·결제창형) 연동 키  클라이언트 키(gck)
   ▸ 짝이 되는 시크릿 키(live_gsk_…)는 Supabase 시크릿 TOSS_WIDGET_SECRET_KEY 에 설정 (단품 결제위젯 승인용) */
const TOSS_WIDGET_CLIENT_KEY = "live_gck_mBZ1gQ4YVXgBBqJdPJYa3l2KPoqN";

/* 엣지 함수 베이스 URL (편의용) */
const FN_BASE = SB_URL + "/functions/v1";

/* 전역 노출 (인라인 onclick·다른 파일에서 window.SB_URL 등으로 접근 가능하게) */
window.SB_URL = SB_URL;
window.SB_KEY = SB_KEY;
window.TOSS_CLIENT_KEY = TOSS_CLIENT_KEY;
window.TOSS_WIDGET_CLIENT_KEY = TOSS_WIDGET_CLIENT_KEY;
window.FN_BASE = FN_BASE;
