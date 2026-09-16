/* ============================================================================
 * arche_entitlements.js · 학원 상품 구독(entitlements) 공용 게이팅 헬퍼
 * ----------------------------------------------------------------------------
 * academies.entitlements(jsonb) 를 읽어 상품 개방 여부를 판정. DB의
 * academy_has_product() 와 동일 규칙(프론트/백엔드 일치).
 *
 * entitlements 예:
 *   { "mode":"individual",
 *     "items": { "penta":{"status":"trial","trial_ends_at":"2026-12-14T00:00:00Z"},
 *                "bridge_perf":{"status":"active"},
 *                "admissions":{"status":"off"},
 *                "promo":{"status":"trial","trial_ends_at":"..."} } }
 *   - mode="allinone" → 전 상품 개방(무료)
 *   - 빈값/누락 → 기존 학원 보호(전체 개방 grandfather)
 *   - 개별(individual) → 상품별 status: active 개방 / trial 만료 전 개방 / 그 외 잠금
 *
 * API:
 *   ArcheEntitlements.PRODUCTS                       // 상품 메타(키·라벨·설명)
 *   ArcheEntitlements.BASE_KEYS                      // 항상 개방 키(원장 대시보드·공통)
 *   ArcheEntitlements.has(entitlements, productKey)  // boolean
 *   ArcheEntitlements.trial(entitlements, productKey)// {status, daysLeft|null, endsAt|null}
 *   ArcheEntitlements.badge(entitlements, productKey)// 짧은 상태 뱃지 텍스트('무료 12일'|'구독중'|'')
 * ==========================================================================*/
(function(){
  "use strict";

  // 판매 상품 3종 + 부가상품(promo). 원장 대시보드/공통은 베이스라 여기 없음(항상 개방).
  var PRODUCTS = {
    penta:       { label:'펜타 시리즈',            desc:'펜타 비전·트랙 워크북 · 실시간 수업 관제 · 코스웨어 · 제출물/분석리포트 · 정기 리포트' },
    bridge_perf: { label:'진로 징검다리·수행평가', desc:'탐구보고서 설계·코칭 · 수행평가 도우미' },
    admissions:  { label:'입시센터',               desc:'진단 · 합격 역설계 · 학과 매칭 · 이수검증 · 로드맵 · 리포트 · 자소서 · 면접 · 고입 트랙' },
    promo:       { label:'홍보·안내문 스튜디오',   desc:'홍보 콘텐츠 · 안내문 제작' }
  };
  // 구독과 무관하게 항상 열리는 베이스/공통 키
  var BASE_KEYS = { dashboard:1, base:1, common:1 };

  function isObj(o){ return o && typeof o==='object'; }

  function has(ent, key){
    if(!key) return true;
    if(BASE_KEYS[key]) return true;
    if(!isObj(ent) || !Object.keys(ent).length) return true;   // grandfather: 미설정 학원은 전체 개방
    if(ent.mode==='allinone') return true;
    var it = ent.items && ent.items[key];
    if(!isObj(it)) return false;
    if(it.status==='active') return true;
    if(it.status==='trial'){
      var te = it.trial_ends_at;
      if(!te) return true;
      var d = new Date(te);
      return isNaN(d.getTime()) ? true : (d.getTime() > Date.now());
    }
    return false;
  }

  function trial(ent, key){
    var out = { status:'open', daysLeft:null, endsAt:null };
    if(BASE_KEYS[key] || !isObj(ent) || !Object.keys(ent).length){ out.status='open'; return out; }
    if(ent.mode==='allinone'){ out.status='allinone'; return out; }
    var it = ent.items && ent.items[key];
    if(!isObj(it)){ out.status='off'; return out; }
    out.status = it.status || 'off';
    if(it.status==='trial' && it.trial_ends_at){
      out.endsAt = it.trial_ends_at;
      var d = new Date(it.trial_ends_at);
      if(!isNaN(d.getTime())) out.daysLeft = Math.max(0, Math.ceil((d.getTime()-Date.now())/86400000));
      if(out.daysLeft!=null && out.daysLeft<=0) out.status='expired';
    }
    return out;
  }

  function badge(ent, key){
    var t = trial(ent, key);
    if(t.status==='open' || t.status==='allinone') return '';
    if(t.status==='active') return '구독중';
    if(t.status==='trial') return (t.daysLeft!=null ? ('무료 '+t.daysLeft+'일') : '무료 체험');
    if(t.status==='expired') return '체험 종료';
    return '미구독';
  }

  window.ArcheEntitlements = { PRODUCTS:PRODUCTS, BASE_KEYS:BASE_KEYS, has:has, trial:trial, badge:badge, version:'1.0' };
})();
