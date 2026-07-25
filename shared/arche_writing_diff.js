/* ============================================================================
 * 아르케 L3 · 의미 변화 판정 (writing_diff)
 * ----------------------------------------------------------------------------
 * 명세서(10-2026-0053173) 표3·표4의 3단계 하이브리드를 그대로 구현.
 *   1단계 표면변화량  : Levenshtein Distance
 *   2단계 의미변화량  : Sentence Embedding 코사인 유사도 (arche-embed에서 벡터 수신)
 *   3단계 논리구조변화: 접속사 패턴 규칙 + (선택)LLM 분류
 * 판별(명세서 0048):
 *   의미유사도 ≥0.95        → Wtype 0.1 (단순 오타/표기)
 *   의미변화 + 논리구조변화  → Wtype 1.0 (논리 수정)
 *   그 외                    → Wtype 0.5 (표현 개선)
 *
 * 용도: (a) 타이핑DNA L3 — 초안 vs 최종본 의미변화(통째 붙여넣기면 변화 0)
 *      (b) CSCI/SRI 등 특허 지표의 수정유형 가중치 산출에 공용
 *
 * 임베딩 벡터는 이 모듈이 만들지 않는다(arche-embed 엣지함수 담당).
 * 여기서는 벡터를 받아 코사인 계산만 → 프론트/엣지 어디서든 재사용 가능.
 * ========================================================================== */

(function () {
  'use strict';

  // ── 코사인 유사도 ──
  function cosine(a, b) {
    if (!a || !b || a.length === 0 || a.length !== b.length) return null;
    var dot = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    if (na === 0 || nb === 0) return null;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  // ── Levenshtein 거리 (표면 변화량) ──
  function levenshtein(s, t) {
    s = s || ''; t = t || '';
    if (s === t) return 0;
    var n = s.length, m = t.length;
    if (n === 0) return m; if (m === 0) return n;
    var prev = new Array(m + 1), cur = new Array(m + 1);
    for (var j = 0; j <= m; j++) prev[j] = j;
    for (var i = 1; i <= n; i++) {
      cur[0] = i;
      for (var k = 1; k <= m; k++) {
        var cost = s.charAt(i - 1) === t.charAt(k - 1) ? 0 : 1;
        cur[k] = Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + cost);
      }
      var tmp = prev; prev = cur; cur = tmp;
    }
    return prev[m];
  }
  // 정규화된 표면 변화율 0~1
  function levRatio(s, t) {
    var maxLen = Math.max((s || '').length, (t || '').length);
    if (maxLen === 0) return 0;
    return levenshtein(s, t) / maxLen;
  }

  // ── 논리구조 변화 감지 (접속사/논리표지 규칙) ──
  // 명세서: [~뿐 아니라], [그러나] 등 논리 확장/전환 키워드 등장 변화를 규칙으로 포착.
  var LOGIC_MARKERS = [
    '뿐 아니라', '뿐만 아니라', '그러나', '하지만', '반면', '반면에', '따라서', '그러므로',
    '왜냐하면', '때문에', '그럼에도', '오히려', '한편', '즉', '결국', '만약', '가정하면',
    '첫째', '둘째', '셋째', '예를 들어', '구체적으로', '요컨대',
    '지만', '으나', '나마', '더라도', '음에도', '기 때문', '하므로', '이므로'
  ];
  function logicMarkerCount(text) {
    text = text || '';
    var c = 0;
    for (var i = 0; i < LOGIC_MARKERS.length; i++) {
      var idx = 0, m = LOGIC_MARKERS[i];
      while ((idx = text.indexOf(m, idx)) !== -1) { c++; idx += m.length; }
    }
    return c;
  }
  // 논리 표지가 유의미하게 늘었는지(구조 변화 신호)
  function logicChanged(before, after) {
    var b = logicMarkerCount(before), a = logicMarkerCount(after);
    // 최종본에서 논리표지가 2개 이상 순증하거나, 없다가 생기면 구조 변화로 본다
    return (a - b >= 2) || (b === 0 && a >= 1 && (after || '').length > (before || '').length * 1.1);
  }

  /* --------------------------------------------------------------------------
   * Wtype 산출 (명세서 표3·4)
   *  in: beforeText, afterText, simSemantic(코사인, arche-embed로 계산해 전달)
   *  out: { wtype, kind, levenshtein, semanticSim, logicChanged }
   * ------------------------------------------------------------------------ */
  function classifyEdit(beforeText, afterText, simSemantic) {
    var lev = levRatio(beforeText, afterText);
    var lc = logicChanged(beforeText, afterText);
    var wtype, kind;
    if (simSemantic != null && simSemantic >= 0.95 && !lc) {
      wtype = 0.1; kind = '단순 오타/표기 수정';
    } else if ((simSemantic != null && simSemantic < 0.95) && lc) {
      wtype = 1.0; kind = '논리 구조 수정';
    } else {
      wtype = 0.5; kind = '표현 개선';
    }
    return { wtype: wtype, kind: kind, levenshtein: +lev.toFixed(3), semanticSim: simSemantic == null ? null : +simSemantic.toFixed(3), logicChanged: lc };
  }

  /* --------------------------------------------------------------------------
   * L3 의미변화 점수 (타이핑DNA용)
   *  초안(draft) → 최종(final)의 의미변화를 0~1로.
   *  - 통째 붙여넣기 = 초안이 이미 최종과 동일 → 변화 없음 → L3 낮음(의심).
   *  - 진짜 사고하며 발전 = 어휘·논리 변화 → L3 높음(신뢰).
   *  in: draftVec, finalVec (임베딩), draftText, finalText
   *  out: { l3Score(0~1), sim, levenshtein, logicChanged, note }
   * ------------------------------------------------------------------------ */
  function l3Semantic(draftVec, finalVec, draftText, finalText) {
    var sim = cosine(draftVec, finalVec);          // 초안-최종 의미 유사도
    var lev = levRatio(draftText, finalText);       // 표면 변화율
    var lc = logicChanged(draftText, finalText);    // 논리 구조 변화

    // 의미가 많이 바뀌고(sim 낮음) 표면·논리도 변했으면 = 진짜 퇴고 → 높은 L3
    // sim이 매우 높고(≈1) 표면 변화도 거의 없으면 = 초안=최종(붙여넣기) → 낮은 L3
    var l3;
    if (sim == null) {
      // 임베딩 없으면 표면+논리만으로 근사
      l3 = Math.min(1, lev * 0.7 + (lc ? 0.3 : 0));
    } else {
      var semanticChange = 1 - sim;                 // 0~1 (클수록 의미 많이 변함)
      l3 = Math.min(1, semanticChange * 0.6 + lev * 0.25 + (lc ? 0.15 : 0));
    }

    var note;
    if (l3 < 0.08) note = '초안과 최종본이 거의 동일 → 통째 붙여넣기 가능성';
    else if (l3 < 0.25) note = '수정 폭이 작음';
    else note = '초안 대비 의미·논리가 발전함(정상 퇴고)';

    return {
      l3Score: +l3.toFixed(3),
      sim: sim == null ? null : +sim.toFixed(3),
      levenshtein: +lev.toFixed(3),
      logicChanged: lc,
      note: note
    };
  }

  var api = {
    cosine: cosine,
    levenshtein: levenshtein,
    levRatio: levRatio,
    logicMarkerCount: logicMarkerCount,
    logicChanged: logicChanged,
    classifyEdit: classifyEdit,
    l3Semantic: l3Semantic
  };
  if (typeof window !== 'undefined') window.ArcheWritingDiff = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
