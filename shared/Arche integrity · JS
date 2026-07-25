/* ============================================================================
 * arche_integrity.js  ·  타이핑DNA(v2) + 작성 diff(L3) 통합 배선 모듈
 * ----------------------------------------------------------------------------
 * 역할: 기존 shared 모듈 3개를 하나로 묶어 "캡처 → 판정 → writing_integrity 저장"
 *       까지 한 번에 처리. 앱 HTML은 <script> 한 줄 + 훅 2~3줄만 추가하면 됨.
 *
 * 의존(로드 순서 준수):
 *   1) supabase-js CDN
 *   2) /shared/config.js  → SB_URL, SB_KEY, (FN_BASE)
 *   3) /shared/supabase.js → window.sb
 *   4) /shared/arche_typing_v2.js   → window.ArcheType
 *   5) /shared/arche_writing_diff.js → window.ArcheWritingDiff
 *   6) /shared/arche_integrity.js   (이 파일)  ← 마지막
 *
 * 공개 API (window.ArcheIntegrity):
 *   attach(el, opts)                      캡처 시작(요소당 1회). cap 반환
 *   metaFor(el)                           현재 typing_meta 반환
 *   embed(texts[])                        arche-embed로 임베딩(옵션, 실패 시 null)
 *   l3(draftText, finalText)              L3 의미변화 진단(임베딩 자동, 실패 시 텍스트만)
 *   assessAndSave({...})                  타이핑+L3 종합판정 후 writing_integrity 저장
 *
 * assessAndSave 인자:
 *   { el | tm, studentId, academyId, sourceType, sourceId,
 *     draftText, finalText, history, session, save, coldStartCapYellow }
 *   - el 또는 tm 중 하나로 타이핑 데이터 전달
 *   - draftText/finalText 있으면 L3 자동 산출
 *   - save:false 면 저장 없이 판정만
 *   반환: { verdict, l3, tm, saved(id|null), error }
 * ==========================================================================*/
(function () {
  "use strict";

  function warn(m) { try { console.warn("[ArcheIntegrity] " + m); } catch (_) {} }
  function dep(name, obj) { if (!obj) { warn("의존성 없음: " + name + " (로드 순서 확인)"); return false; } return true; }

  function fnBase() {
    if (window.FN_BASE) return window.FN_BASE;
    if (window.SB_URL) return window.SB_URL + "/functions/v1";
    return "";
  }
  async function authHeader() {
    try {
      if (window.sb && window.sb.auth && window.sb.auth.getSession) {
        var r = await window.sb.auth.getSession();
        var t = r && r.data && r.data.session && r.data.session.access_token;
        if (t) return "Bearer " + t;
      }
    } catch (_) {}
    return "Bearer " + (window.SB_KEY || "");
  }
  function elLen(el) {
    if (!el) return 0;
    return el.isContentEditable ? (el.innerText || "").length : (el.value || "").length;
  }

  /* 1) 캡처 부착 --------------------------------------------------------- */
  function attach(el, opts) {
    if (!el) return null;
    if (!dep("ArcheType", window.ArcheType)) return null;
    if (el._archeCap) return el._archeCap;               // 중복 부착 방지
    var cap = window.ArcheType.make();
    window.ArcheType.attach(el, cap, opts || {});
    el._archeCap = cap;
    return cap;
  }
  function metaFor(el) {
    if (!el || !el._archeCap) { warn("metaFor: attach 되지 않은 요소"); return null; }
    if (!window.ArcheType) return null;
    return window.ArcheType.meta(el._archeCap, elLen(el));
  }

  /* 2) 임베딩(옵션) — arche-embed 엣지함수 ------------------------------- */
  async function embed(texts) {
    if (!Array.isArray(texts) || !texts.length) return null;
    try {
      var res = await fetch(fnBase() + "/arche-embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": window.SB_KEY || "",
          "Authorization": await authHeader()
        },
        body: JSON.stringify({ texts: texts })
      });
      if (!res.ok) { warn("embed HTTP " + res.status); return null; }
      var d = await res.json();
      return d && Array.isArray(d.vectors) ? d.vectors : null;
    } catch (e) { warn("embed 실패: " + e); return null; }
  }

  /* 3) L3 의미변화(초안 vs 최종) — 임베딩 실패 시 텍스트 지표만 ---------- */
  async function l3(draftText, finalText) {
    if (!dep("ArcheWritingDiff", window.ArcheWritingDiff)) return null;
    var dv = null, fv = null;
    if (draftText && finalText) {
      var vecs = await embed([draftText, finalText]);
      if (vecs && vecs.length === 2 && vecs[0] && vecs[0].length && vecs[1] && vecs[1].length) {
        dv = vecs[0]; fv = vecs[1];
      }
    }
    try { return window.ArcheWritingDiff.l3Semantic(dv, fv, draftText || "", finalText || ""); }
    catch (e) { warn("l3Semantic 실패: " + e); return null; }
  }

  /* 4) 종합 판정 + 저장 -------------------------------------------------- */
  async function assessAndSave(o) {
    o = o || {};
    var tm = o.tm || (o.el ? metaFor(o.el) : null);
    if (!tm) warn("assessAndSave: typing_meta 없음 (el 또는 tm 필요)");

    var l3res = o.l3 || null;
    if (!l3res && (o.draftText || o.finalText)) l3res = await l3(o.draftText || "", o.finalText || "");

    var verdict = null;
    if (window.ArcheType && tm) {
      verdict = window.ArcheType.finalVerdict(tm, o.history || null, {
        l3: l3res ? { l3Score: l3res.l3Score, sim: l3res.sim, note: l3res.note } : undefined,
        session: o.session || undefined,
        coldStartCapYellow: (o.coldStartCapYellow !== false)   // 기본 true (신규생 안전측)
      });
    }

    var saved = null, saveErr = null;
    if (o.save !== false && window.sb && verdict) {
      var payload = {
        p_academy: o.academyId || null,
        p_student: (o.studentId != null) ? String(o.studentId) : null,
        p_source_type: o.sourceType || null,
        p_source_id: (o.sourceId != null) ? String(o.sourceId) : null,
        p_sim: (l3res && l3res.sim != null) ? l3res.sim : null,
        p_l3: (l3res && l3res.l3Score != null) ? l3res.l3Score : null,
        p_lev: (l3res && l3res.levenshtein != null) ? l3res.levenshtein : null,
        p_logic: (l3res && typeof l3res.logicChanged === "boolean") ? l3res.logicChanged : null,
        p_composite: (verdict.composite != null) ? Math.round(verdict.composite) : null,
        p_tier: verdict.tier || null,
        p_layers: verdict.layers || null,
        p_reasons: verdict.reasons || null
      };
      try {
        var rpc = await window.sb.rpc("save_writing_integrity", payload);
        if (rpc.error) throw rpc.error;
        saved = rpc.data;
      } catch (e1) {
        // RPC 미배포(SQL 미적용) 시 직접 insert 폴백 — RLS off 상태에서만 성공
        try {
          var ins = await window.sb.from("writing_integrity").insert({
            academy_id: payload.p_academy, student_id: payload.p_student,
            source_type: payload.p_source_type, source_id: payload.p_source_id,
            sim_draft_final: payload.p_sim, l3_score: payload.p_l3,
            levenshtein_ratio: payload.p_lev, logic_changed: payload.p_logic,
            composite: payload.p_composite, tier: payload.p_tier,
            layers: payload.p_layers, reasons: payload.p_reasons
          }).select("id").single();
          if (ins.error) throw ins.error;
          saved = ins.data && ins.data.id;
        } catch (e2) {
          saveErr = ((e1 && e1.message) || e1) + " / " + ((e2 && e2.message) || e2);
          warn("저장 실패: " + saveErr);
        }
      }
    }
    return { verdict: verdict, l3: l3res, tm: tm, saved: saved, error: saveErr };
  }

  window.ArcheIntegrity = {
    attach: attach, metaFor: metaFor, embed: embed, l3: l3,
    assessAndSave: assessAndSave, version: "1.0"
  };
  try { console.info("[ArcheIntegrity] ready v1.0"); } catch (_) {}
})();
