/* ============================================================================
 * 아르케 타이핑DNA v2 · 공유 캡처 코어
 * ----------------------------------------------------------------------------
 * 목적: 기존 cbCap / pfCap 계열의 프로토타입 캡처(집계 8개 + 단순 룰 3개)를
 *       IME(한글 조합) 오탐을 제거하고, 리듬 시퀀스를 담는 v2로 교체.
 *
 * 설계 원칙
 *  1) IME 안전: keydown의 e.key.length===1 필터는 한글 조합을 놓쳐 오탐을 냄.
 *     → input 이벤트의 '텍스트 길이 델타'로 실제 삽입/삭제 글자수를 센다.
 *     (한글 음절이 완성되면 길이에 정확히 반영되므로 조합 문자도 정확)
 *  2) 개인정보 보호: 키 하나하나의 전체 로그(키로거)를 저장하지 않는다.
 *     → 키 '간격'을 히스토그램 버킷으로만 저장(무엇을 쳤는지는 남기지 않음).
 *  3) 하위호환: 기존 typing_meta 필드(keyCount 등) 전부 유지 → 기존 화면 안 깨짐.
 *     v2 신규 필드는 추가로 얹는다. verdict 판정은 v2 신호를 우선 사용.
 *
 * 사용법 (학원용index.html 통합)
 *  - 이 파일 내용을 <script> 블록(Arche 엔진 근처)에 그대로 삽입.
 *  - 기존 cbCapInit/cbCapAttach/cbCapMeta, pfCapInit/pfCapAttach/pfCapMeta,
 *    cbCheat 를 아래 '드롭인 교체' 섹션 버전으로 바꾼다(시그니처 동일).
 * ========================================================================== */

(function () {
  'use strict';

  // 간격 버킷 경계(ms). 사람의 타이핑 리듬을 7구간으로 분포화.
  // [0,50) 초고속(연타) / [50,150) 빠름 / [150,300) 보통 / [300,600) 느림
  // [600,1200) 머뭇 / [1200,2000) 멈칫 / [2000+) 사고 정지
  var BUCKET_EDGES = [50, 150, 300, 600, 1200, 2000];

  function bucketOf(dt) {
    for (var i = 0; i < BUCKET_EDGES.length; i++) {
      if (dt < BUCKET_EDGES[i]) return i;
    }
    return BUCKET_EDGES.length; // 마지막 버킷(2000+)
  }

  // 캐럿의 문서 내 상대 위치(0~1) 반환. 실패 시 -1.
  // textarea/input: selectionStart 사용. contentEditable: Range로 앞쪽 텍스트 길이 계산.
  function caretRel(el) {
    try {
      if (!el.isContentEditable) {
        var vlen = (el.value || '').length;
        if (vlen <= 0) return 0;
        var s = (el.selectionStart == null ? vlen : el.selectionStart);
        return Math.max(0, Math.min(1, s / vlen));
      }
      var sel = (el.ownerDocument.defaultView || window).getSelection();
      if (!sel || sel.rangeCount === 0) return -1;
      var range = sel.getRangeAt(0);
      var pre = range.cloneRange();
      pre.selectNodeContents(el);
      pre.setEnd(range.endContainer, range.endOffset);
      var before = pre.toString().length;
      var total = (el.textContent || '').length;
      if (total <= 0) return 0;
      return Math.max(0, Math.min(1, before / total));
    } catch (_) { return -1; }
  }

  // 캡처 상태 객체 생성
  function makeCap() {
    return {
      v: 2,
      start: Date.now(),
      last: Date.now(),
      prevLen: 0,          // 직전 input 시점의 텍스트 길이(델타 계산용)
      pasteFlag: false,    // 직전 input이 paste로 인한 것인지

      // ── 레거시 호환 필드 ──
      kc: 0,               // (레거시) keydown 단일키 카운트 — IME에 부정확, 참고용만
      bc: 0,               // Backspace/Delete 키 횟수
      pc: 0,               // 2초 이상 정지 횟수(레거시 pauseCount)
      paste: 0,            // 붙여넣기 횟수
      pasteChars: 0,       // 붙여넣은 총 글자수
      saves: 0,            // 중간 저장 횟수

      // ── v2 신규: IME 안전 카운트 ──
      ins: 0,              // input 델타로 잰 '실제 삽입 글자수'(붙여넣기 제외) ★핵심
      del: 0,              // input 델타로 잰 '실제 삭제 글자수'

      // ── v2 신규: 리듬 시퀀스(개인정보 아님) ──
      intervals: [0, 0, 0, 0, 0, 0, 0], // 7버킷 간격 히스토그램
      burst: 0,            // 150ms 이하 연속 입력(버스트) 횟수
      longestPauseMs: 0,   // 최장 정지(ms)
      activeMs: 0,         // 실제 입력 활동 시간(2초 초과 정지는 제외)

      // ── v2 신규: L2 수정 위치 지도 ──
      // 삭제/수정이 '문서 내 어느 상대 위치(0~1)'에서 일어났는지 10구간 히스토그램.
      // 자연 작성 = 전체에 분산 / 붙여넣기 위장 = 끝(마지막 구간)에 집중.
      editPos: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      backEdits: 0,        // 타이핑 최전선보다 뒤(본문)로 돌아가 고친 횟수
      tailEdits: 0,        // 문서 맨 끝(마지막 15%)에서만 고친 횟수
      maxLen: 0            // 지금까지 도달한 최대 길이(최전선 추적용)
    };
  }

  // 요소에 캡처 리스너 부착(중복 부착 방지 키는 호출측에서 지정)
  function attach(el, cap, opts) {
    if (!el || !cap) return;
    opts = opts || {};
    var lenOf = opts.lenOf || function () {
      return el.isContentEditable ? (el.textContent || '').length : (el.value || '').length;
    };

    // 붙여넣기: 횟수/글자수 기록 + 다음 input을 paste로 마킹
    el.addEventListener('paste', function (e) {
      cap.paste++;
      cap.pasteFlag = true;
      try {
        var t = ((e.clipboardData || window.clipboardData).getData('text')) || '';
        cap.pasteChars += t.length;
      } catch (_) {}
    });

    // 레거시 backspace 카운트(참고용). 단일키 kc도 유지하되 판정엔 ins를 씀.
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' || e.key === 'Delete') cap.bc++;
      else if (e.key && e.key.length === 1) cap.kc++;
    });

    // ★ 핵심: input 델타 기반 IME 안전 카운트 + 리듬
    el.addEventListener('input', function () {
      var now = Date.now();
      var dt = now - cap.last;
      var len = lenOf();
      var delta = len - cap.prevLen;
      cap.prevLen = len;

      if (cap.pasteFlag) {
        // 이번 input은 붙여넣기로 인한 것 → 타이핑 카운트/리듬에 넣지 않음
        cap.pasteFlag = false;
        cap.last = now;
        return;
      }

      // 리듬(간격) 기록 — 유효 범위 내에서만
      if (dt > 0 && dt < 60000) {
        cap.intervals[bucketOf(dt)]++;
        if (dt <= 150) cap.burst++;
        if (dt > cap.longestPauseMs) cap.longestPauseMs = dt;
        if (dt > 2000) cap.pc++;           // 레거시 pauseCount 유지
        else cap.activeMs += dt;           // 정지 아닌 구간만 활동시간에 가산
      }

      // IME 안전 글자수: 양수 델타=삽입, 음수 델타=삭제
      if (delta > 0) {
        cap.ins += delta;
        if (len > cap.maxLen) cap.maxLen = len; // 타이핑 최전선 갱신
      } else if (delta < 0) {
        cap.del += (-delta);
        // L2: 이 삭제가 문서 어디서 일어났나
        var rel = caretRel(el);
        if (rel >= 0) {
          var bin = Math.min(9, Math.max(0, Math.floor(rel * 10)));
          cap.editPos[bin]++;
          if (rel >= 0.85) cap.tailEdits++;   // 맨 끝(꼬리)만 수정
          // 최전선(maxLen) 대비 뒤로 돌아가 고쳤는지: 현재 길이가 최대치의 85% 미만 지점
          if (cap.maxLen > 0 && len < cap.maxLen * 0.85) cap.backEdits++;
        }
      }

      cap.last = now;
    });
  }

  // 저장용 메타 생성(레거시 필드 + v2 필드)
  function meta(cap, charCount) {
    if (!cap) cap = makeCap();
    var totalMs = Date.now() - cap.start;
    return {
      // 레거시(하위호환)
      keyCount: cap.kc,
      backCount: cap.bc,
      pauseCount: cap.pc,
      pasteCount: cap.paste,
      pasteChars: cap.pasteChars,
      totalMs: totalMs,
      charCount: (charCount == null ? cap.prevLen : charCount),
      saves: cap.saves,
      startedAt: new Date(cap.start).toISOString(),
      // v2 신규
      v: 2,
      insCount: cap.ins,
      delCount: cap.del,
      intervals: cap.intervals.slice(),
      burstCount: cap.burst,
      longestPauseMs: cap.longestPauseMs,
      activeMs: cap.activeMs,
      // v2 신규: L2 수정 위치
      editPos: cap.editPos.slice(),
      backEdits: cap.backEdits,
      tailEdits: cap.tailEdits
    };
  }

  /* --------------------------------------------------------------------------
   * v2 판정: IME 안전 룰
   * 반환: { verdict, tier, composite, reasons[] }
   *  - verdict: 레거시 호환('AUTHENTIC'|'SUSPICIOUS'|'AI_GENERATED')
   *  - tier: 'green'|'yellow'|'red' (신규 3등급)
   *  - composite: 0~100 (L1 리듬 신뢰도. L2/L4는 후속 단계에서 합산)
   * ------------------------------------------------------------------------ */
  function assess(tm) {
    if (!tm) return { verdict: '', tier: 'yellow', composite: 50, reasons: [] };
    var cc = tm.charCount || 0;
    var ins = (tm.insCount != null ? tm.insCount : null);
    var pasteChars = tm.pasteChars || 0;
    var paste = tm.pasteCount || 0;
    var iv = tm.intervals || null;
    var reasons = [];
    var flags = 0;

    // (1) IME 안전 입력량 검사: 실제 삽입 글자수가 최종 글자수 대비 지나치게 적으면 의심.
    //     레거시 keyCount 대신 insCount 사용 → 한글 오탐 제거.
    if (ins != null && cc > 40) {
      var typedRatio = ins / cc; // 정상 작성이면 보통 1.0 이상(수정하며 더 많이 침)
      if (typedRatio < 0.35) { flags += 2; reasons.push('실제 타이핑량(' + ins + ')이 글자수(' + cc + ') 대비 매우 적음 → 외부 복사/AI 생성 의심'); }
      else if (typedRatio < 0.6) { flags += 1; reasons.push('타이핑량이 다소 적음(비율 ' + typedRatio.toFixed(2) + ')'); }
    }

    // (2) 붙여넣기 비중
    if (pasteChars > 0 && cc > 0 && pasteChars > cc * 0.5) { flags += 2; reasons.push('붙여넣은 글자(' + pasteChars + ')가 전체의 절반 이상 → 대량 복사 의심'); }
    else if (paste > 3) { flags += 1; reasons.push('붙여넣기 ' + paste + '회'); }

    // (3) 리듬 자연성(L1): 간격 분포가 한두 버킷에만 쏠리면(=기계적 균일) 의심.
    //     사람은 여러 구간에 분산됨(연타+머뭇+정지). 엔트로피 근사로 평가.
    var rhythmScore = null;
    if (iv && iv.length) {
      var total = iv.reduce(function (a, b) { return a + b; }, 0);
      if (total >= 15) {
        var H = 0, nz = 0;
        for (var i = 0; i < iv.length; i++) {
          if (iv[i] > 0) { var p = iv[i] / total; H += -p * Math.log(p); nz++; }
        }
        var Hmax = Math.log(iv.length);
        rhythmScore = Hmax > 0 ? (H / Hmax) : 0; // 0~1 (1=매우 다양=자연)
        if (nz <= 2 && total >= 30) { flags += 1; reasons.push('타이핑 간격이 지나치게 균일함 → 기계적 입력 가능성'); }
      }
    }

    // (4) 수정 위치 분산(L2): 수정이 문서 전체에 퍼졌나, 끝에만 몰렸나.
    //     자연 작성 = 본문 여기저기 되돌아가 고침(backEdits 존재, 분산 높음).
    //     붙여넣기 위장 = 통째 붙인 뒤 꼬리만 손댐(tailEdits 편중, 분산 낮음).
    var editScore = null;
    var ep = tm.editPos || null;
    if (ep && ep.length) {
      var epTotal = ep.reduce(function (a, b) { return a + b; }, 0);
      if (epTotal >= 6) {
        var eH = 0, enz = 0;
        for (var j = 0; j < ep.length; j++) {
          if (ep[j] > 0) { var ep2 = ep[j] / epTotal; eH += -ep2 * Math.log(ep2); enz++; }
        }
        var eHmax = Math.log(ep.length);
        var dispersion = eHmax > 0 ? (eH / eHmax) : 0; // 0~1
        var backRatio = (tm.backEdits || 0) / epTotal;   // 본문 회귀 수정 비율
        var tailRatio = (tm.tailEdits || 0) / epTotal;   // 꼬리 편중 비율
        // 분산 + 본문회귀를 가점, 꼬리편중을 감점
        editScore = Math.max(0, Math.min(1, dispersion * 0.6 + backRatio * 0.4));
        if (tailRatio > 0.8 && backRatio < 0.1 && epTotal >= 10) {
          flags += 1; reasons.push('수정이 문서 끝부분에만 집중됨 → 붙여넣기 후 꼬리만 다듬은 패턴 의심');
        }
      }
    }

    // composite: 사용 가능한 계층 점수의 가중 평균 - 플래그 감점
    var parts = [], weights = [];
    if (rhythmScore != null) { parts.push(rhythmScore); weights.push(0.55); }
    if (editScore != null)   { parts.push(editScore);   weights.push(0.45); }
    var composite;
    if (parts.length) {
      var wsum = weights.reduce(function (a, b) { return a + b; }, 0);
      var acc = 0;
      for (var k = 0; k < parts.length; k++) acc += parts[k] * weights[k];
      composite = Math.round(40 + (acc / wsum) * 55); // 40~95
    } else {
      composite = 75; // 신호 부족 시 중립
    }
    composite -= flags * 12;
    if (composite < 0) composite = 0; if (composite > 100) composite = 100;

    var tier, verdict;
    if (flags >= 2 || composite < 45) { tier = 'red'; verdict = 'AI_GENERATED'; }
    else if (flags === 1 || composite < 75) { tier = 'yellow'; verdict = 'SUSPICIOUS'; }
    else { tier = 'green'; verdict = 'AUTHENTIC'; }

    return { verdict: verdict, tier: tier, composite: composite, reasons: reasons, rhythmScore: rhythmScore, editScore: editScore };
  }

  /* --------------------------------------------------------------------------
   * L4 · 본인 이력 대조
   * 이 학생의 과거 제출 typing_meta 배열과 이번 작성을 비교.
   *  - 평소 대비 '갑자기 빠르고, 수정이 사라진' 도약 = 대필 의심.
   *  - 신규 학생(이력 3건 미만) = 콜드스타트: L4 미산출, baseline 학습중 표시.
   * history: [{insCount,activeMs,delCount,intervals,...}, ...] (v2 meta 배열)
   * 반환: { available, l4Score(0~1|null), z:{speed,rev}, rhythmSim, reasons[], note }
   * ------------------------------------------------------------------------ */
  function assessHistory(tm, history) {
    var valid = (history || []).filter(function (h) {
      return h && h.v === 2 && (h.insCount || 0) > 20 && (h.activeMs || 0) > 1000;
    });
    if (valid.length < 3) {
      return { available: false, l4Score: null, reasons: [], note: '개인 타이핑 패턴 학습 중 (' + valid.length + '/3)' };
    }

    // 특징 추출: 타이핑 속도(글자/활동초), 수정률(삭제/삽입)
    function speedOf(h) { return h.insCount / (h.activeMs / 1000); }
    function revOf(h) { return h.delCount / Math.max(1, h.insCount); }

    var speeds = valid.map(speedOf), revs = valid.map(revOf);
    function mean(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
    function std(a, m) {
      var v = a.reduce(function (x, y) { return x + (y - m) * (y - m); }, 0) / a.length;
      return Math.sqrt(v);
    }
    var mS = mean(speeds), mR = mean(revs);
    // 표준편차 하한(작은 표본에서 z 폭발 방지)
    var sS = Math.max(std(speeds, mS), mS * 0.15, 0.05);
    var sR = Math.max(std(revs, mR), 0.05);

    var curS = speedOf(tm), curR = revOf(tm);
    var zSpeed = (curS - mS) / sS;
    var zRev = (curR - mR) / sR;

    // 리듬 프로파일 유사도(코사인): 이번 간격분포 vs 과거 평균 분포
    var rhythmSim = null;
    if (tm.intervals && valid[0].intervals) {
      var dim = tm.intervals.length;
      var avg = new Array(dim).fill(0);
      valid.forEach(function (h) {
        var t = (h.intervals || []).reduce(function (a, b) { return a + b; }, 0) || 1;
        for (var i = 0; i < dim; i++) avg[i] += (h.intervals[i] || 0) / t;
      });
      for (var i = 0; i < dim; i++) avg[i] /= valid.length;
      var ct = tm.intervals.reduce(function (a, b) { return a + b; }, 0) || 1;
      var cur = tm.intervals.map(function (x) { return x / ct; });
      var dot = 0, na = 0, nb = 0;
      for (var j = 0; j < dim; j++) { dot += cur[j] * avg[j]; na += cur[j] * cur[j]; nb += avg[j] * avg[j]; }
      rhythmSim = (na > 0 && nb > 0) ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : null;
    }

    var reasons = [];
    var l4 = 1.0;
    // 핵심 이상신호: 평소보다 확 빠르면서(+2.5σ) 수정이 확 줄면(-1.5σ) = 붙여넣기성 도약
    if (zSpeed > 2.5 && zRev < -1.5) {
      l4 = 0.2; reasons.push('평소보다 급격히 빠르고 수정이 사라짐 → 대필 의심 도약');
    } else if (zSpeed > 3) {
      l4 = 0.45; reasons.push('평소 대비 타이핑 속도가 비정상적으로 빠름');
    } else if (zRev < -2 && curR < 0.02) {
      l4 = 0.5; reasons.push('평소 있던 수정 과정이 거의 사라짐');
    }
    if (rhythmSim != null && rhythmSim < 0.55) {
      l4 = Math.min(l4, 0.55); reasons.push('타이핑 리듬이 평소 본인 패턴과 다름');
    }

    return {
      available: true, l4Score: l4,
      z: { speed: +zSpeed.toFixed(2), rev: +zRev.toFixed(2) },
      rhythmSim: rhythmSim == null ? null : +rhythmSim.toFixed(3),
      reasons: reasons, note: '개인 패턴 ' + valid.length + '건 기준'
    };
  }

  /* --------------------------------------------------------------------------
   * 최종 종합 판정: L1/L2(assess) + L4(assessHistory) 결합
   *  coldStartCapYellow=true 이면 이력 부족 시 green을 yellow로 강등(보수적).
   *  기본 false: 이력 없어도 L1/L2가 충분히 신뢰되면 green 허용(오탐/과플래그 최소화).
   * ------------------------------------------------------------------------ */
  function finalVerdict(tm, history, opts) {
    opts = opts || {};
    var base = assess(tm);                 // L1/L2 + flags
    var h = assessHistory(tm, history);    // L4
    var reasons = base.reasons.slice();
    var composite = base.composite;
    var extraFlag = 0;

    // L3 의미변화(선택): opts.l3 = { l3Score, sim, note } (arche_writing_diff.l3Semantic 결과)
    var l3 = (opts.l3 && typeof opts.l3.l3Score === 'number') ? opts.l3 : null;
    var l3Flag = 0;
    if (l3) {
      // 초안=최종(붙여넣기)면 l3Score가 0에 가까움 → 강한 의심
      if (l3.l3Score < 0.05) { l3Flag = 2; reasons.push('초안과 최종본이 거의 동일 → 통째 붙여넣기 의심(L3)'); }
      else if (l3.l3Score < 0.15) { l3Flag = 1; reasons.push('초안 대비 수정 폭이 매우 작음(L3)'); }
    }

    // ── L5: 세션 내 자기대조 (비노출·내부 보정 전용) ──
    // opts.session = { pre, post } — 사전/회고 구간의 typing_meta(v2)
    //   본작성(tm)의 리듬 지문이 사전·회고와 얼마나 닮았는지로 진정성 보정.
    //   사전·회고는 짧으므로 단독 판정 불가 → composite에 소폭 가감만. 표본 부족시 skip.
    var l5adj = 0; // composite에 더할 보정치(-8 ~ +5)
    var l5consistent = null;
    if (opts.session) {
      var segs = [opts.session.pre, opts.session.post].filter(function (s) {
        return s && s.intervals && s.intervals.reduce(function (a, b) { return a + b; }, 0) >= 8;
      });
      if (segs.length >= 1 && tm.intervals) {
        function normHist(iv) { var t = iv.reduce(function (a, b) { return a + b; }, 0) || 1; return iv.map(function (x) { return x / t; }); }
        function cos(a, b) { var d = 0, na = 0, nb = 0; for (var i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return (na && nb) ? d / (Math.sqrt(na) * Math.sqrt(nb)) : null; }
        // 무게중심(평균 버킷 인덱스): 값이 클수록 느린 타이핑
        function centroid(h) { var s = 0, w = 0; for (var i = 0; i < h.length; i++) { s += i * h[i]; w += h[i]; } return w ? s / w : 0; }
        var mainH = normHist(tm.intervals);
        var mainC = centroid(mainH);
        var simList = [], cShiftList = [];
        segs.forEach(function (s) {
          var sh = normHist(s.intervals);
          var c = cos(mainH, sh); if (c != null) simList.push(c);
          cShiftList.push(Math.abs(mainC - centroid(sh))); // 속도대역 이동량
        });
        if (simList.length) {
          var avgSim = simList.reduce(function (a, b) { return a + b; }, 0) / simList.length;
          var avgShift = cShiftList.reduce(function (a, b) { return a + b; }, 0) / cShiftList.length;
          l5consistent = +avgSim.toFixed(3);
          // 종합 일치도: 모양(코사인) 높고 속도대역 이동 작으면 일관.
          // 모양이 비슷해도 속도대역이 1.2버킷 이상 이동하면 '본작성만 다른 속도' 신호.
          if (avgSim >= 0.75 && avgShift < 0.8) l5adj = 5;
          else if (avgSim >= 0.6 && avgShift < 1.2) l5adj = 2;
          else if (avgShift >= 1.8 || avgSim <= 0.4) { l5adj = -8; reasons.push('본작성 타이핑이 같은 세션의 사전/회고와 크게 다름(속도·리듬 불일치)'); }
          else if (avgShift >= 1.2) { l5adj = -4; }
        }
      }
    }

    // 계층 결합: L1/L2(base) + L3 + L4
    var partsC = [{ v: base.composite, w: 0.5 }];
    if (l3) partsC.push({ v: l3.l3Score * 100, w: 0.2 });
    if (h.available) partsC.push({ v: h.l4Score * 100, w: 0.3 });
    var wsum = partsC.reduce(function (a, p) { return a + p.w; }, 0);
    composite = Math.round(partsC.reduce(function (a, p) { return a + p.v * p.w; }, 0) / wsum);

    if (h.available && h.reasons.length) {
      reasons = reasons.concat(h.reasons);
      if (h.l4Score <= 0.3) extraFlag = Math.max(extraFlag, 2);
      else if (h.l4Score <= 0.55) extraFlag = Math.max(extraFlag, 1);
    }
    extraFlag = Math.max(extraFlag, l3Flag);
    if (l5adj <= -8) extraFlag = Math.max(extraFlag, 1); // 세션 불일치는 최소 yellow 유도
    composite += l5adj; // L5 세션 자기대조 내부 보정(비노출)
    if (composite < 0) composite = 0; if (composite > 100) composite = 100;

    var strongBase = (base.verdict === 'AI_GENERATED');
    var tier, verdict;
    if (strongBase || extraFlag >= 2 || composite < 45) { tier = 'red'; verdict = 'AI_GENERATED'; }
    else if (base.verdict === 'SUSPICIOUS' || extraFlag === 1 || composite < 75) { tier = 'yellow'; verdict = 'SUSPICIOUS'; }
    else { tier = 'green'; verdict = 'AUTHENTIC'; }

    if (!h.available && opts.coldStartCapYellow && tier === 'green') {
      tier = 'yellow'; verdict = 'SUSPICIOUS';
      reasons.push('개인 이력이 아직 부족해 확정 인증 보류(' + h.note + ')');
    }

    return {
      verdict: verdict, tier: tier, composite: composite, reasons: reasons,
      baseline: h.available, baselineNote: h.note,
      layers: {
        l1: base.rhythmScore == null ? null : +base.rhythmScore.toFixed(3),
        l2: base.editScore == null ? null : +base.editScore.toFixed(3),
        l3: l3 ? l3.l3Score : null,
        l4: h.available ? h.l4Score : null
      },
      l4detail: h.available ? { z: h.z, rhythmSim: h.rhythmSim } : null
    };
  }

  // 전역 노출
  window.ArcheType = {
    make: makeCap,
    attach: attach,
    meta: meta,
    assess: assess,
    assessHistory: assessHistory,
    finalVerdict: finalVerdict,
    BUCKET_EDGES: BUCKET_EDGES
  };
})();


/* ============================================================================
 * 드롭인 교체 — 기존 함수들을 아래 버전으로 교체 (시그니처 동일)
 * ----------------------------------------------------------------------------
 * 코스웨어(cbCap*)와 수행평가(pfCap*)가 동일 로직이므로 둘 다 ArcheType 위임.
 * 기존 호출부(cbCapAttach(el), cbCapMeta(t), cbCheat(tm) 등)는 그대로 둔다.
 * ========================================================================== */

/* ── 코스웨어 ── */
function cbCapInit() { window.cbCap = window.ArcheType.make(); }
function cbCapAttach(el) {
  if (!el || el._cbBound) return; el._cbBound = true;
  if (!window.cbCap) cbCapInit();
  window.ArcheType.attach(el, window.cbCap, {
    lenOf: function () { return el.isContentEditable ? (typeof cbEdLen === 'function' ? cbEdLen() : (el.textContent || '').length) : (el.value || '').length; }
  });
  // 글자수 카운터 UI 갱신(기존 동작 유지)
  el.addEventListener('input', function () {
    var c = document.getElementById('cb-cc');
    if (c) c.textContent = (el.isContentEditable ? (typeof cbEdLen === 'function' ? cbEdLen() : (el.textContent || '').length) : (el.value || '').length) + '자';
  });
}
function cbCapMeta(t) { if (!window.cbCap) cbCapInit(); return window.ArcheType.meta(window.cbCap, (t || '').length); }

/* cbCheat: 레거시 시그니처 유지(문자열 반환). 내부는 v2 assess 사용.
   반환 문자열이 비어있으면 '정상', 있으면 사유. verdict/tier는 별도 함수로 얻는다. */
function cbCheat(tm) {
  if (!tm) return '';
  var r = window.ArcheType.assess(tm);
  return (r.reasons && r.reasons.length) ? r.reasons.join('; ') : '';
}
/* 신규: 등급/점수까지 필요할 때 */
function cbVerdict(tm) { return window.ArcheType.assess(tm); }

/* ── 수행평가 ── */
function pfCapInit() { window.pfCap = window.ArcheType.make(); }
function pfCapAttach(el) {
  if (!el || el._pfBound) return; el._pfBound = true;
  if (!window.pfCap) pfCapInit();
  window.ArcheType.attach(el, window.pfCap, {
    lenOf: function () { return typeof pfEdLen === 'function' ? pfEdLen() : (el.isContentEditable ? (el.textContent || '').length : (el.value || '').length); }
  });
  el.addEventListener('input', function () { if (typeof pfEdCount === 'function') pfEdCount(); });
}
function pfCapMeta(t) { if (!window.pfCap) pfCapInit(); return window.ArcheType.meta(window.pfCap, (t || '').length); }
