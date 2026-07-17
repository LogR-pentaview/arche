/* =========================================================
   아르케 · 로그인 / 세션 / 역할판별 / 라우팅  (shared/auth.js)
   ---------------------------------------------------------
   로드 순서: config.js → supabase.js → 이 파일
   역할:  로그인하면 "누구인지" 판별해서 알맞은 앱으로 자동 이동시킵니다.
          학원 → /academy   학부모 → /parent   관리자 → /admin   매니저 → /partner

   ⚠️ 이 파일은 "새 구조 전용"입니다.
      현재 라이브 index.html은 이 파일을 사용하지 않습니다 → 서비스 영향 0.
   ========================================================= */

/* 역할별 목적지 앱 경로 (한 곳에서 관리) */
const APP_PATHS = {
  admin:   '/admin/',
  academy: '/academy/',
  parent:  '/parent/',
  partner: '/partner/'
};

/* ---------- 기본 인증 (기존 코드 그대로 옮김) ---------- */

async function signIn(email, password) {
  if (!sb) throw new Error('DB 미로드 — 새로고침 해주세요');
  const { data, error } = await sb.auth.signInWithPassword({ email: email, password: password });
  if (error) throw new Error(error.message);
  return data.session;
}
window.signIn = signIn;

async function signOut() {
  if (sb) await sb.auth.signOut();
}
window.signOut = signOut;

async function getSession() {
  if (!sb) return null;
  return (await sb.auth.getSession()).data.session;
}
window.getSession = getSession;


/* ---------- 역할 판별 (읽기 전용 · 기록 안 만듦) ---------- */
/* 반환: { role, accountType, isAdmin, isManager, academy } */
async function resolveRole(user) {
  const meta = user.user_metadata || {};
  const info = {
    role: meta.role || 'con',
    accountType: meta.account_type || 'b2b',
    isAdmin: false,
    isManager: false,
    academy: null
  };

  /* 1) 영업매니저 — 승인된(approved) 경우만 매니저로 인정 */
  info.managerStatus = null;
  try {
    const { data: mgr } = await sb.from('sales_managers').select('status').eq('uid', user.id).limit(1);
    if (mgr && mgr[0]) {
      info.managerStatus = mgr[0].status;
      if (mgr[0].status === 'approved') info.isManager = true;
    }
  } catch (e) { /* 테이블 미생성 시 무시 */ }

  /* 2) 학원 판별: 내가 소유한(원장) → 소속(컨설턴트) 순서 */
  let ac = null;
  const { data: owned } = await sb.from('academies')
    .select('id,name,is_admin,account_type').eq('owner_uid', user.id).limit(1);
  if (owned && owned[0]) ac = owned[0];

  if (!ac) {
    const { data: au } = await sb.from('academy_users')
      .select('academy_id').eq('uid', user.id).limit(1);
    if (au && au[0]) {
      const { data: ac2 } = await sb.from('academies')
        .select('id,name,is_admin,account_type').eq('id', au[0].academy_id).limit(1);
      if (ac2 && ac2[0]) ac = ac2[0];
    }
  }

  if (ac) {
    info.academy = ac;
    info.isAdmin = !!ac.is_admin;
    info.accountType = ac.account_type || info.accountType;   // b2b(학원) / b2c(학부모)
  }
  return info;
}
window.resolveRole = resolveRole;


/* ---------- 역할 → 목적지 경로 ---------- */
function pathForRole(info) {
  if (info.isAdmin)   return APP_PATHS.admin;
  if (info.isManager) return APP_PATHS.partner;   // 승인된 매니저

  /* 소속 학원이 있거나 학생이면 → 트랙에 따라 */
  if (info.academy || info.role === 'student') {
    return info.accountType === 'b2c' ? APP_PATHS.parent : APP_PATHS.academy;
  }

  /* 소속 없음 + 매니저 승인 대기 → 이동 보류(로그인 화면에서 안내) */
  if (info.managerStatus === 'pending') return null;

  /* 그 외(신규 원장 등)는 기본 학원으로 */
  return info.accountType === 'b2c' ? APP_PATHS.parent : APP_PATHS.academy;
}
window.pathForRole = pathForRole;


/* ---------- 로그인 후: 판별해서 해당 앱으로 이동 ---------- */
/* 반환: {ok:true, dest} 이동함 / {ok:false, reason} 이동 보류(승인 대기 등) */
async function routeByRole(session) {
  const info = await resolveRole(session.user);
  const dest = pathForRole(info);
  if (!dest) {
    return { ok: false, reason: (info.managerStatus === 'pending' ? 'manager_pending' : 'unknown') };
  }
  location.replace(dest);   // 뒤로가기로 로그인 화면에 안 돌아오게 replace 사용
  return { ok: true, dest: dest };
}
window.routeByRole = routeByRole;
