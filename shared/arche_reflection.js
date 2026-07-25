/* ============================================================================
 * arche_reflection.js · 사후 회고 인터뷰 + 사전 스냅샷 (Sbefore→Safter) 공용 모듈
 * ----------------------------------------------------------------------------
 * 플로우: [1] 사전 스냅샷(왜/예상/궁금) → [2] 본작성(타이핑DNA는 별도) →
 *         [3] 사후 회고(달라진점·새로알게됨) + 자기평가 + AI딜레마 + 재응답 →
 *         [4] SRI·Resilience·C2·Meta 산출(학생 비노출) 후 저장
 * 의존: window.sb, config(SB_URL/SB_KEY/FN_BASE). (선택) ArcheWritingDiff·arche-embed
 * 두 앱(학원용/학부모용) 공용 — 각 앱은 <script src="/shared/arche_reflection.js"> 만.
 *
 * API:
 *   ArcheReflection.renderPre(mount, opts)   // 본작성 전 3문항 스냅샷
 *   ArcheReflection.renderPost(mount, opts)  // 제출 직후 회고 인터뷰 전체
 *   opts 공통: { academyId, studentId, sourceType('lesson'|'perf'|'design'), sourceId, onDone }
 *   renderPost 추가: { kind, subject, title, reportText, conclusion, rubric[], banner{title,desc} }
 * ==========================================================================*/
(function () {
  "use strict";
  var CSS = ".arf{max-width:720px;margin:0 auto;font-family:'Pretendard Variable',Pretendard,sans-serif;color:#191f28}"
    + ".arf *{box-sizing:border-box}"
    + ".arf .eb{font-size:11px;font-weight:800;color:#3182f6;letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px}"
    + ".arf .h1{font-size:20px;font-weight:800}.arf .sub{font-size:13px;color:#4e5968;margin-top:6px;line-height:1.6}"
    + ".arf .banner{display:flex;gap:12px;align-items:center;background:rgba(18,183,106,.07);border:1px solid rgba(18,183,106,.2);border-radius:14px;padding:14px 18px;margin:18px 0}"
    + ".arf .banner .ic{width:36px;height:36px;border-radius:10px;background:rgba(18,183,106,.15);display:flex;align-items:center;justify-content:center;font-size:18px;flex:none}"
    + ".arf .banner .t{font-size:13px;font-weight:800}.arf .banner .d{font-size:12px;color:#4e5968;margin-top:2px}"
    + ".arf .stag{display:inline-block;font-size:10.5px;font-weight:800;color:#fff;border-radius:6px;padding:2px 8px;margin:16px 0 10px}"
    + ".arf .stag.a{background:#12b76a}.arf .stag.b{background:#3182f6}.arf .stag.c{background:#00b8a9}"
    + ".arf .card{background:#fff;border:1px solid #e5e8eb;border-radius:16px;padding:20px 22px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,23,51,.04)}"
    + ".arf .qh{display:flex;align-items:center;margin-bottom:6px}.arf .qnum{width:22px;height:22px;border-radius:7px;background:#f4f6f8;font-size:12px;font-weight:800;color:#4e5968;display:inline-flex;align-items:center;justify-content:center;margin-right:9px}"
    + ".arf .qt{font-size:15px;font-weight:800}.arf .qd{font-size:12.5px;color:#8b95a1;margin:0 0 12px 31px;line-height:1.55}"
    + ".arf textarea{width:100%;min-height:88px;border:1px solid #e5e8eb;border-radius:12px;padding:13px 15px;font-family:inherit;font-size:14px;line-height:1.7;resize:vertical;outline:none}"
    + ".arf textarea:focus{border-color:#3182f6;box-shadow:0 0 0 3px rgba(49,130,246,.1)}"
    + ".arf .big{font-size:40px;font-weight:800;color:#3182f6;text-align:center;font-family:ui-monospace,monospace}.arf .big small{font-size:16px;color:#8b95a1}"
    + ".arf input[type=range]{width:100%;accent-color:#3182f6;margin:12px 0 2px}"
    + ".arf .scale{display:flex;justify-content:space-between;font-size:11px;color:#8b95a1}"
    + ".arf .note{font-size:12px;color:#4e5968;margin-top:12px;background:#f4f6f8;border-radius:10px;padding:11px 14px;line-height:1.6}"
    + ".arf .crit{margin-bottom:16px}.arf .crit .ch{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px}.arf .crit .cn{font-size:13.5px;font-weight:700}.arf .crit .cv{font-size:15px;font-weight:800;color:#3182f6;font-family:ui-monospace,monospace}"
    + ".arf .dilemma{border:1.5px solid rgba(0,184,169,.35);background:linear-gradient(180deg,rgba(0,184,169,.05),rgba(0,184,169,.01))}"
    + ".arf .aib{display:inline-flex;gap:6px;font-size:11px;font-weight:800;color:#00b8a9;background:rgba(0,184,169,.1);border-radius:99px;padding:4px 11px;margin-bottom:12px}"
    + ".arf .yc{font-size:12.5px;color:#4e5968;background:#f4f6f8;border-radius:10px;padding:11px 14px;line-height:1.6;margin-bottom:14px}.arf .yc b{color:#191f28}"
    + ".arf .dq{font-size:16px;font-weight:700;line-height:1.65}"
    + ".arf .tags{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}.arf .tag{font-size:11px;font-weight:700;border-radius:99px;padding:3px 11px;background:rgba(124,58,237,.09);color:#7c3aed}"
    + ".arf .hint{font-size:12px;color:#8b95a1;margin-top:12px;padding-top:12px;border-top:1px dashed #e5e8eb;line-height:1.6}"
    + ".arf .act{display:flex;gap:10px;margin-top:18px}.arf .btn{flex:1;padding:14px;border-radius:12px;font-size:14px;font-weight:700;border:none;cursor:pointer;background:#3182f6;color:#fff}"
    + ".arf .btn.ghost{flex:0 0 auto;padding:14px 20px;background:#fff;border:1px solid #e5e8eb;color:#4e5968}"
    + ".arf .btn:disabled{opacity:.5;cursor:default}"
    + ".arf .muted{opacity:.5;pointer-events:none}";

  function injectCSS() { if (document.getElementById("arf-css")) return; var s = document.createElement("style"); s.id = "arf-css"; s.textContent = CSS; document.head.appendChild(s); }
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fnBase() { return window.FN_BASE || ((window.SB_URL || "") + "/functions/v1"); }
  async function auth() { try { var r = await window.sb.auth.getSession(); var t = r && r.data && r.data.session && r.data.session.access_token; if (t) return "Bearer " + t; } catch (_) {} return "Bearer " + (window.SB_KEY || ""); }

  async function aiCall(task, payload) {
    try {
      var res = await fetch(fnBase() + "/arche-ai", { method: "POST",
        headers: { "Content-Type": "application/json", "apikey": window.SB_KEY || "", "Authorization": await auth() },
        body: JSON.stringify({ task: task, payload: payload }) });
      var d = await res.json();
      if (!res.ok) throw new Error(d && d.error || res.status);
      var t = (d.text || "").replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      try { return JSON.parse(t); } catch (_) { return { _raw: t }; }
    } catch (e) { console.warn("[ArcheReflection] AI 실패: " + e); return null; }
  }
  async function embedDist(a, b) {
    try {
      if (!window.ArcheWritingDiff || !a || !b) return null;
      var res = await fetch(fnBase() + "/arche-embed", { method: "POST",
        headers: { "Content-Type": "application/json", "apikey": window.SB_KEY || "", "Authorization": await auth() },
        body: JSON.stringify({ texts: [a, b] }) });
      if (!res.ok) return null;
      var d = await res.json();
      if (!d.vectors || d.vectors.length < 2) return null;
      var cos = window.ArcheWritingDiff.cosine(d.vectors[0], d.vectors[1]);
      return (cos == null) ? null : +(1 - cos).toFixed(3);   // 의미거리
    } catch (_) { return null; }
  }
  async function rpc(name, args) {
    var r = await window.sb.rpc(name, args);
    if (r.error) throw r.error;
    return r.data;
  }

  /* ── [1] 사전 스냅샷 ───────────────────────────────────────────────── */
  function renderPre(mount, o) {
    injectCSS(); o = o || {};
    var root = el('<div class="arf"></div>');
    root.innerHTML =
      '<div class="eb">Pre-Inquiry Snapshot · 시작 전 생각</div>'
      + '<div class="h1">본격 탐구 전, 지금 생각을 남겨두세요</div>'
      + '<div class="sub">딜레마 없이 가볍게. 탐구가 끝난 뒤 지금의 나와 비교해 성장을 증명합니다.</div>'
      + '<div class="stag a">STEP 0 — 사전 스냅샷</div>'
      + card(1, "이 주제를 왜 탐구하려 하나요?", "동기·관심을 한두 문장으로.", "why")
      + card(2, "지금 예상하는 결론은?", "틀려도 좋아요. 지금 감을 적어두는 게 핵심입니다.", "expect")
      + card(3, "가장 궁금한 점은?", "탐구하며 풀고 싶은 질문.", "curious")
      + '<div class="act"><button class="btn" data-go>스냅샷 저장하고 탐구 시작 →</button></div>';
    mount.innerHTML = ""; mount.appendChild(root);
    if (o.prefill) { ["why", "expect", "curious"].forEach(function (k) { var t = root.querySelector('[data-k="' + k + '"]'); if (t && o.prefill[k]) t.value = o.prefill[k]; }); }
    root.querySelector("[data-go]").onclick = async function () {
      var btn = this; btn.disabled = true; btn.textContent = "저장 중…";
      var before = { why: val(root, "why"), expect: val(root, "expect"), curious: val(root, "curious") };
      try {
        await rpc("save_reflection_pre", { p_academy: o.academyId, p_student: String(o.studentId), p_source_type: o.sourceType, p_source_id: String(o.sourceId), p_before: before });
        btn.textContent = "저장됨 ✓";
        if (o.onDone) o.onDone(before);
      } catch (e) { btn.disabled = false; btn.textContent = "다시 시도"; alert("저장 실패: " + (e.message || e)); }
    };
    return root;
  }

  /* ── [3] 사후 회고 인터뷰 ─────────────────────────────────────────── */
  function renderPost(mount, o) {
    injectCSS(); o = o || {};
    var isPerf = o.kind === "perf";
    var root = el('<div class="arf"></div>');
    var banner = o.banner || {};
    var evalHtml = isPerf ? perfSelfEval(o.rubric || []) : lessonSelfEval();
    root.innerHTML =
      '<div class="eb">Post-Inquiry Reflection · 탐구 회고</div>'
      + '<div class="h1">' + esc(isPerf ? "제출 완료. 채점 기준으로 돌아봅니다" : "보고서를 마쳤네요. 이제 돌아볼 시간") + '</div>'
      + '<div class="sub">' + esc(banner.desc || "시작 전의 나와 지금의 나 — 그 사이 무엇이 바뀌었는지 스스로 정리합니다.") + '</div>'
      + (banner.title ? '<div class="banner"><div class="ic">' + (isPerf ? "✍️" : "📄") + '</div><div><div class="t">' + esc(banner.title) + '</div><div class="d">' + esc(banner.sub || "") + '</div></div></div>' : "")
      + '<div class="stag a">STEP 1 — 회고</div>'
      + card(1, isPerf ? "이 과제에서 가장 어려웠던 부분은?" : "처음 예상과 가장 달라진 점은?", isPerf ? "채점 기준 중 어디가 힘들었는지." : "탐구 전 예상과 달라진 부분.", "changed")
      + card(2, "탐구하며 새로 알게 되거나 궁금해진 점은?", "답을 찾는 과정에서 생긴 새 질문일수록 좋습니다.", "learned")
      + '<div class="stag b">STEP 2 — 자기평가 · <span style="opacity:.85">딜레마 보기 전에 먼저</span></div>'
      + evalHtml
      + '<div class="act"><button class="btn ghost" data-save>임시저장</button><button class="btn" data-dil>딜레마 확인하기 →</button></div>'
      + '<div data-dilzone></div>';
    mount.innerHTML = ""; mount.appendChild(root);
    wireSelfEval(root);

    root.querySelector("[data-save]").onclick = function () { savePartial(root, o, isPerf); };

    root.querySelector("[data-dil]").onclick = async function () {
      var btn = this; btn.disabled = true; btn.textContent = "아르케 AI가 질문 준비 중…";
      var dz = root.querySelector("[data-dilzone]");
      var dil = await aiCall("reflection_dilemma", {
        kind: o.kind, subject: o.subject, title: o.title, conclusion: o.conclusion,
        text: o.reportText || "", rubric: isPerf ? o.rubric : undefined,
        self_eval: readSelfEval(root, isPerf)
      });
      if (!dil) { btn.disabled = false; btn.textContent = "다시 시도"; return; }
      root._dilemma = dil;
      dz.innerHTML =
        '<div class="stag c">STEP 3 — 다시 생각하기</div>'
        + '<div class="card dilemma"><div class="aib">◆ 아르케 AI</div>'
        + '<div class="yc">당신의 결론: <b>' + esc(dil.conclusion || o.conclusion || "") + '</b></div>'
        + '<div class="dq">' + esc(dil.question || "") + '</div>'
        + '<div class="tags">' + (dil.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join("") + '</div>'
        + '<div class="hint">동의해도, 반박해도 좋습니다. 결론을 지키든 발전시키든 — 어떻게 다시 생각하는지가 기록됩니다.</div></div>'
        + card(3, "이 질문을 받고, 당신의 생각은 어떻게 되었나요?", "", "reresponse")
        + '<div class="act"><button class="btn" data-finish>회고 마치기 →</button></div>';
      wireFinish(root, o, isPerf);
      dz.scrollIntoView({ behavior: "smooth", block: "start" });
      btn.style.display = "none";
    };
    return root;
  }

  function wireFinish(root, o, isPerf) {
    root.querySelector("[data-finish]").onclick = async function () {
      var btn = this; btn.disabled = true; btn.textContent = "생각을 분석하는 중…";
      var after = { changed: val(root, "changed"), learned: val(root, "learned"), reresponse: val(root, "reresponse") };
      var selfEval = readSelfEval(root, isPerf);
      var dil = root._dilemma || {};
      // 사전 스냅샷 조회(있으면) → 의미거리
      var before = null;
      try {
        var q = await window.sb.from("reflection_snapshots").select("s_before")
          .eq("source_type", o.sourceType).eq("source_id", String(o.sourceId)).eq("student_id", String(o.studentId)).maybeSingle();
        before = q.data && q.data.s_before || null;
      } catch (_) {}
      var semDist = before ? await embedDist((before.expect || ""), (after.changed || "") + " " + (after.reresponse || "")) : null;
      // 지표 산출
      var score = await aiCall("reflection_score", {
        before: before || {}, after: after, dilemma: { question: dil.question }, self_eval: selfEval, sem_dist: semDist
      }) || {};
      try {
        await rpc("save_reflection_post", {
          p_academy: o.academyId, p_student: String(o.studentId), p_source_type: o.sourceType, p_source_id: String(o.sourceId),
          p_after: after, p_self_eval: selfEval, p_dilemma: dil,
          p_sri: num(score.sri), p_resilience: num(score.resilience), p_c2: num(score.c2),
          p_meta_gap: num(score.meta_gap), p_ai_predicted: num(score.ai_predicted)
        });
        btn.textContent = "회고 완료 ✓";
        if (o.onDone) o.onDone({ after: after, score: score });
      } catch (e) { btn.disabled = false; btn.textContent = "다시 시도"; alert("저장 실패: " + (e.message || e)); }
    };
  }

  async function savePartial(root, o, isPerf) {
    // STEP1/2만 임시저장 (s_after 부분 + self_eval)
    var after = { changed: val(root, "changed"), learned: val(root, "learned"), reresponse: "" };
    try {
      await rpc("save_reflection_post", {
        p_academy: o.academyId, p_student: String(o.studentId), p_source_type: o.sourceType, p_source_id: String(o.sourceId),
        p_after: after, p_self_eval: readSelfEval(root, isPerf), p_dilemma: {},
        p_sri: null, p_resilience: null, p_c2: null, p_meta_gap: null, p_ai_predicted: null
      });
      alert("임시저장 되었습니다.");
    } catch (e) { alert("임시저장 실패: " + (e.message || e)); }
  }

  /* ── helpers: 자기평가 UI ─────────────────────────────────────────── */
  function lessonSelfEval() {
    return '<div class="card"><div class="qh" style="justify-content:center"><span class="qt">내 결과물, 몇 점 정도라고 생각하나요?</span></div>'
      + '<div class="qd" style="margin-left:0;text-align:center">정답 없음. 자기 점수와 실제 평가를 비교해 자기객관화 정도를 봅니다.</div>'
      + '<div class="big" data-selfbig>78<small> / 100</small></div>'
      + '<input type="range" min="0" max="100" value="78" data-self="overall"><div class="scale"><span>0</span><span>50</span><span>100</span></div>'
      + '<div class="note">💡 이 점수는 <b>딜레마를 보기 전</b>에 매기는 게 중요해요. 흔들리기 전 순수한 자기 판단.</div></div>';
  }
  function perfSelfEval(rubric) {
    var rows = (rubric || []).map(function (r, i) {
      var pts = +(r.points || r.max || 20);
      var init = Math.round(pts * 0.8);
      return '<div class="crit"><div class="ch"><span class="cn">' + esc(r.area || ("기준 " + (i + 1))) + ' <span style="font-size:11px;color:#8b95a1">/ ' + pts + '점</span></span>'
        + '<span class="cv" data-critv="' + i + '">' + init + '<small style="font-size:11px;color:#8b95a1"> / ' + pts + '</small></span></div>'
        + '<input type="range" min="0" max="' + pts + '" value="' + init + '" data-crit="' + i + '" data-area="' + esc(r.area || "") + '" data-max="' + pts + '">'
        + (r.criteria ? '<div class="qd" style="margin:6px 0 0">' + esc(r.criteria).slice(0, 80) + '</div>' : '') + '</div>';
    }).join("");
    return '<div class="card"><div class="note" style="margin:0 0 14px">이 수행평가의 <b>실제 채점 기준</b>별로 내가 몇 점쯤 받을지 매겨보세요. 나중에 AI 예상 채점과 비교해 어느 기준을 과대·과소평가했는지 알려드립니다.</div>'
      + (rows || '<div class="qd">채점 기준 정보가 없어 종합 점수로 대체합니다.</div>' + lessonSelfEvalInner()) + '</div>';
  }
  function lessonSelfEvalInner() {
    return '<div class="big" data-selfbig>78<small> / 100</small></div><input type="range" min="0" max="100" value="78" data-self="overall"><div class="scale"><span>0</span><span>50</span><span>100</span></div>';
  }
  function wireSelfEval(root) {
    var ov = root.querySelector('[data-self="overall"]');
    if (ov) ov.oninput = function () { var b = root.querySelector("[data-selfbig]"); if (b) b.innerHTML = this.value + '<small> / 100</small>'; };
    root.querySelectorAll("[data-crit]").forEach(function (inp) {
      inp.oninput = function () { var v = root.querySelector('[data-critv="' + this.dataset.crit + '"]'); if (v) v.innerHTML = this.value + '<small style="font-size:11px;color:#8b95a1"> / ' + this.dataset.max + '</small>'; };
    });
  }
  function readSelfEval(root, isPerf) {
    if (isPerf) {
      var items = [];
      root.querySelectorAll("[data-crit]").forEach(function (inp) { items.push({ area: inp.dataset.area, points: +inp.dataset.max, self: +inp.value }); });
      if (items.length) return { items: items };
    }
    var ov = root.querySelector('[data-self="overall"]');
    return { score: ov ? +ov.value : null };
  }

  /* ── small helpers ─────────────────────────────────────────────────── */
  function card(n, title, desc, key) {
    return '<div class="card"><div class="qh"><span class="qnum">' + n + '</span><span class="qt">' + esc(title) + '</span></div>'
      + (desc ? '<div class="qd">' + esc(desc) + '</div>' : '')
      + '<textarea data-k="' + key + '" placeholder="여기에 적어보세요…"></textarea></div>';
  }
  function val(root, k) { var t = root.querySelector('[data-k="' + k + '"]'); return t ? t.value.trim() : ""; }
  function num(x) { return (x == null || isNaN(+x)) ? null : +x; }

  window.ArcheReflection = { renderPre: renderPre, renderPost: renderPost, version: "1.0" };
  try { console.info("[ArcheReflection] ready v1.0"); } catch (_) {}
})();
