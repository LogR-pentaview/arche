/* ARCHE 고입 컨설팅 · 학교 정보 (특목고·자사고 입시 정보 열람)
 * window.mountGoipSchool(selectorOrElement)
 * 데이터: goip_schools / essay_templates / goip_interview_questions / goip_past_exams / goip_exclusion_rules (authenticated SELECT)
 */
(function () {
  'use strict';
  var TYPES = ['외고', '국제고', '과학고', '영재학교', '자사고'];
  var TABS = [
    ['ov', '개요'], ['req', '입시요강'], ['es', '자소서'],
    ['iv', '면접'], ['pf', '학교 특성'], ['px', '기출']
  ];
  var S = { loaded: false, loading: false, err: null, schools: [], tpls: [], iq: [], pe: [], rules: [],
            type: '', region: '', q: '', sel: null, tab: 'ov', root: null };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sb() { return window.sb || null; }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function obj(x) { return (x && typeof x === 'object' && !Array.isArray(x)) ? x : null; }
  function jparse(x) { if (typeof x === 'string') { try { return JSON.parse(x); } catch (e) { return null; } } return x; }
  function safeUrl(u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : ''; }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

  function css() {
    if (document.getElementById('gs-css')) return;
    var st = document.createElement('style'); st.id = 'gs-css';
    st.textContent = [
      '.gs-wrap{display:grid;grid-template-columns:320px 1fr;gap:16px;margin-top:16px;align-items:start}',
      '.gs-side{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px;position:sticky;top:12px;max-height:calc(100vh - 40px);display:flex;flex-direction:column}',
      '.gs-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}',
      '.gs-chip{padding:4px 10px;border-radius:999px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink-dim);font-size:12px;cursor:pointer}',
      '.gs-chip.on{background:var(--gold);color:#111;border-color:var(--gold);font-weight:600}',
      '.gs-in{width:100%;box-sizing:border-box;padding:8px 10px;background:var(--panel-2);border:1px solid var(--line);border-radius:8px;color:var(--ink);font-size:13px;margin-bottom:8px}',
      '.gs-list{overflow:auto;flex:1;margin:0 -4px;padding:0 4px}',
      '.gs-item{padding:9px 10px;border-radius:8px;cursor:pointer;border:1px solid transparent}',
      '.gs-item:hover{background:var(--panel-2)}',
      '.gs-item.on{background:var(--panel-2);border-color:var(--gold)}',
      '.gs-nm{font-size:13.5px;color:var(--ink);font-weight:600}',
      '.gs-meta{font-size:11.5px;color:var(--ink-mute);margin-top:2px}',
      '.gs-dots{display:flex;gap:3px;margin-top:5px}',
      '.gs-dot{width:7px;height:7px;border-radius:50%;background:var(--line)}',
      '.gs-dot.y{background:var(--gold)}',
      '.gs-main{min-width:0}',
      '.gs-head{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 18px}',
      '.gs-title{font-size:20px;font-weight:700;color:var(--ink)}',
      '.gs-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
      '.gs-tag{font-size:11.5px;padding:3px 9px;border-radius:6px;background:var(--panel-2);border:1px solid var(--line);color:var(--ink-dim)}',
      '.gs-tag.g{color:var(--gold);border-color:var(--gold)}',
      '.gs-tabs{display:flex;gap:4px;margin:12px 0;flex-wrap:wrap;border-bottom:1px solid var(--line)}',
      '.gs-tab{padding:8px 14px;font-size:13px;color:var(--ink-dim);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}',
      '.gs-tab.on{color:var(--gold);border-bottom-color:var(--gold);font-weight:600}',
      '.gs-tab .c{font-size:10.5px;color:var(--ink-mute);margin-left:4px}',
      '.gs-card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:12px}',
      '.gs-card h4{margin:0 0 8px;font-size:13.5px;color:var(--gold);letter-spacing:.02em}',
      '.gs-kv{display:grid;grid-template-columns:110px 1fr;gap:6px 12px;font-size:13px;line-height:1.55}',
      '.gs-kv dt{color:var(--ink-mute);margin:0}',
      '.gs-kv dd{margin:0;color:var(--ink)}',
      '.gs-tbl{width:100%;border-collapse:collapse;font-size:12.5px}',
      '.gs-tbl th,.gs-tbl td{border:1px solid var(--line);padding:6px 9px;text-align:left;vertical-align:top;color:var(--ink)}',
      '.gs-tbl th{background:var(--panel-2);color:var(--ink-dim);font-weight:600}',
      '.gs-note{font-size:12px;color:var(--ink-mute);line-height:1.6;margin-top:8px}',
      '.gs-warn{font-size:12px;line-height:1.6;padding:9px 12px;border-radius:8px;background:var(--panel-2);border-left:3px solid var(--gold);color:var(--ink-dim);margin-bottom:12px}',
      '.gs-empty{padding:26px 16px;text-align:center;color:var(--ink-mute);font-size:13px;line-height:1.7}',
      '.gs-ul{margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:var(--ink)}',
      '.gs-prog{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}',
      '.gs-prog>div{background:var(--panel-2);border:1px solid var(--line-soft,var(--line));border-radius:10px;padding:10px 12px}',
      '.gs-prog b{font-size:13px;color:var(--ink);display:block;margin-bottom:4px}',
      '.gs-prog span{font-size:12px;color:var(--ink-dim);line-height:1.6}',
      '.gs-band{display:inline-block;padding:2px 9px;border-radius:6px;font-size:12px;margin-right:6px;border:1px solid var(--line)}',
      '.gs-band.s{color:var(--safe,#4ade80)}.gs-band.a{color:var(--gold)}.gs-band.c{color:var(--reach,#f59e0b)}',
      '.gs-btn{padding:7px 13px;border-radius:8px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);font-size:12.5px;cursor:pointer}',
      '.gs-btn:hover{border-color:var(--gold)}',
      '.gs-cov{font-size:12px;color:var(--ink-mute);margin-top:6px}',
      '.gs-det summary{cursor:pointer;font-size:12.5px;color:var(--ink-dim)}',
      '@media (max-width:960px){.gs-wrap{grid-template-columns:1fr}.gs-side{position:static;max-height:380px}.gs-kv{grid-template-columns:90px 1fr}}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- data ---------- */
  function load() {
    if (S.loaded || S.loading) return Promise.resolve();
    var c = sb();
    if (!c) { S.err = '서버 연결을 확인할 수 없습니다. 로그인 후 다시 시도해 주세요.'; return Promise.resolve(); }
    S.loading = true; S.err = null;
    function q(p) { return p.then(function (r) { if (r.error) throw r.error; return r.data || []; }); }
    return Promise.all([
      q(c.from('goip_schools').select('id,name,school_type,region,scope,gender,extra_regions,eligibility_note,admission_type,stage1_desc,stage2_desc,year,notes,homepage,profile,profile_updated_at,conversion,interview').order('name')),
      q(c.from('essay_templates').select('id,school_id,school_type,title,year,questions,total_max_chars,active').eq('active', true)),
      q(c.from('goip_interview_questions').select('school_id,school_name,year,area,question,source')),
      q(c.from('goip_past_exams').select('school_id,school_name,year,stage,subject,title,file_note')),
      q(c.from('goip_exclusion_rules').select('*'))
    ]).then(function (r) {
      S.schools = r[0].map(function (s) { s.profile = jparse(s.profile); s.conversion = jparse(s.conversion); s.interview = jparse(s.interview); return s; });
      S.tpls = r[1].map(function (t) { t.questions = jparse(t.questions); return t; });
      S.iq = r[2]; S.pe = r[3]; S.rules = r[4];
      S.loaded = true;
    }).catch(function (e) {
      S.err = '학교 정보를 불러오지 못했습니다: ' + ((e && e.message) || e);
    }).then(function () { S.loading = false; });
  }

  function tplFor(s) {
    var own = S.tpls.filter(function (t) { return t.school_id === s.id; });
    if (own.length) return { t: own[0], generic: false, fallback: false };
    var gen = S.tpls.filter(function (t) { return !t.school_id && t.school_type === s.school_type; });
    if (gen.length) return { t: gen[0], generic: true, fallback: false };
    if (s.school_type === '국제고') {
      var fg = S.tpls.filter(function (t) { return !t.school_id && t.school_type === '외고'; });
      if (fg.length) return { t: fg[0], generic: true, fallback: true };
    }
    return null;
  }
  function ivQ(s) { return S.iq.filter(function (x) { return x.school_id === s.id || (!x.school_id && x.school_name === s.name); }); }
  function peOf(s) { return S.pe.filter(function (x) { return x.school_id === s.id || (!x.school_id && x.school_name === s.name); }); }
  function hasProfile(s) { var p = s.profile; return !!(p && (p.ideology || arr(p.programs).length || arr(p.keywords).length)); }
  function hasIv(s) { var i = s.interview; return !!(i && (i.format || arr(i.focus).length || arr(i.past_questions).length)) || ivQ(s).length > 0; }
  function convInfo(s) { var c = s.conversion; return !!(c && c.type); }

  /* ---------- list ---------- */
  function filtered() {
    var q = S.q.trim().toLowerCase();
    return S.schools.filter(function (s) {
      if (S.type && s.school_type !== S.type) return false;
      if (S.region === '__nat') { if (s.scope !== '전국') return false; }
      else if (S.region && s.region !== S.region && s.scope !== '전국' && arr(s.extra_regions).indexOf(S.region) < 0) return false;
      if (q && (s.name + ' ' + (s.region || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function dots(s) {
    var f = [!!(s.stage1_desc || s.stage2_desc), convInfo(s), !!tplFor(s), hasIv(s), hasProfile(s), peOf(s).length > 0];
    var lb = ['요강', '환산', '자소서', '면접', '특색', '기출'];
    return '<div class="gs-dots" title="' + lb.map(function (l, i) { return l + (f[i] ? '○' : '×'); }).join(' ') + '">' +
      f.map(function (y) { return '<span class="gs-dot' + (y ? ' y' : '') + '"></span>'; }).join('') + '</div>';
  }
  function renderList() {
    var el = S.root.querySelector('.gs-list'); if (!el) return;
    var L = filtered();
    if (S.region && S.region !== '__nat') L = L.slice().sort(function (a, b) { return (a.region === S.region ? 0 : 1) - (b.region === S.region ? 0 : 1); });
    if (!L.length) { el.innerHTML = '<div class="gs-empty">조건에 맞는 학교가 없습니다.</div>'; return; }
    el.innerHTML = L.map(function (s) {
      return '<div class="gs-item' + (S.sel === s.id ? ' on' : '') + '" data-id="' + esc(s.id) + '">' +
        '<div class="gs-nm">' + esc(s.name) + '</div>' +
        '<div class="gs-meta">' + esc(s.school_type) + ' · ' + esc(s.region || '-') + ' · ' + (s.scope === '전국' ? '<b style="color:var(--gold)">전국단위</b>' : esc(s.scope || '')) + '</div>' + dots(s) + '</div>';
    }).join('');
    var cnt = S.root.querySelector('.gs-count');
    if (cnt) {
      var own = L.filter(function (s) { return s.region === S.region; }).length;
      cnt.textContent = L.length + '개교 / 전체 ' + S.schools.length + (S.region && S.region !== '__nat' ? ' (' + S.region + ' ' + own + ' + 타지역 전국단위 ' + (L.length - own) + ')' : '');
    }
  }

  /* ---------- detail ---------- */
  function sec(title, body) { return '<div class="gs-card"><h4>' + esc(title) + '</h4>' + body + '</div>'; }
  function kv(rows) {
    rows = rows.filter(function (r) { return r[1] != null && r[1] !== ''; });
    if (!rows.length) return '<div class="gs-note">등록된 정보가 없습니다.</div>';
    return '<dl class="gs-kv">' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>';
  }
  function empty(msg) { return '<div class="gs-card"><div class="gs-empty">' + msg + '</div></div>'; }
  function ul(a) { a = arr(a); return a.length ? '<ul class="gs-ul">' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : ''; }

  function tabOv(s) {
    var hp = safeUrl(s.homepage);
    var h = sec('기본 정보', kv([
      ['학교 유형', esc(s.school_type)], ['소재지', esc(s.region)], ['모집 범위', esc(s.scope)], ['남녀구분', esc(s.gender)],
      ['추가 지원 지역', arr(s.extra_regions).length ? esc(arr(s.extra_regions).join(', ')) : (typeof s.extra_regions === 'string' ? esc(s.extra_regions) : '')],
      ['전형 구분', esc(s.admission_type)], ['기준 학년도', s.year ? esc(s.year) + '학년도' : ''],
      ['지원 자격', s.eligibility_note ? nl2br(s.eligibility_note) : ''],
      ['홈페이지', hp ? '<a href="' + esc(hp) + '" target="_blank" rel="noopener noreferrer" style="color:var(--gold)">' + esc(hp) + '</a>' : '']
    ]));
    var p = s.profile || {};
    h += sec('한눈에 보기', kv([
      ['1단계', s.stage1_desc ? nl2br(s.stage1_desc) : ''], ['2단계', s.stage2_desc ? nl2br(s.stage2_desc) : ''],
      ['교육 이념', p.ideology ? nl2br(p.ideology) : ''],
      ['키워드', arr(p.keywords).length ? arr(p.keywords).map(function (k) { return '<span class="gs-tag">' + esc(k) + '</span>'; }).join(' ') : ''],
      ['비고', s.notes ? nl2br(s.notes) : '']
    ]));
    var c = [['입시요강', !!(s.stage1_desc || s.stage2_desc)], ['환산식', convInfo(s)], ['자소서 양식', !!tplFor(s)], ['면접 자료', hasIv(s)], ['학교 특성', hasProfile(s)], ['기출', peOf(s).length > 0]];
    h += sec('자료 확보 현황', '<div style="display:flex;flex-wrap:wrap;gap:6px">' + c.map(function (x) {
      return '<span class="gs-tag' + (x[1] ? ' g' : '') + '">' + esc(x[0]) + ' ' + (x[1] ? '○' : '미등록') + '</span>';
    }).join('') + '</div><div class="gs-note">미등록 항목은 학원 보유 자료가 DB에 반영되지 않은 상태입니다. 입시요강 확정본은 반드시 학교 공식 모집요강으로 확인하세요.</div>');
    return h;
  }

  function convHtml(s) {
    var c = s.conversion; if (!c || !c.type) return '<div class="gs-note">환산 방식이 등록되지 않았습니다.</div>';
    var typeLb = { foreign_common: '외고·국제고 공통 환산 (영어 성취도 중심)', per_subject: '교과별 성취도 합산', weighted: '가중치 환산', qualitative: '정성 평가 (정량 환산 없음)' };
    var h = '';
    var rows = [['환산 방식', esc(typeLb[c.type] || c.type)]];
    if (arr(c.subjects).length) rows.push(['반영 과목', esc(c.subjects.join(', '))]);
    if (arr(c.semesters).length) rows.push(['반영 학기', esc(c.semesters.join(', '))]);
    if (c.total != null) rows.push(['만점', esc(c.total) + '점']);
    if (c.variant) rows.push(['변형', esc(c.variant)]);
    if (c.min_achievement) rows.push(['최소 성취도', esc(c.min_achievement) + ' 이상']);
    if (arr(c.check_subjects).length) rows.push(['확인 교과', esc(c.check_subjects.join(', '))]);
    if (c.grade_ratio) rows.push(['학년별 비율', esc(typeof c.grade_ratio === 'object' ? JSON.stringify(c.grade_ratio) : c.grade_ratio)]);
    h += kv(rows);
    var m = obj(c.map);
    if (m) {
      var ks = Object.keys(m);
      h += '<div style="margin-top:10px;overflow:auto"><table class="gs-tbl"><tr><th>성취도</th>' + ks.map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '</tr><tr><td>점수</td>' + ks.map(function (k) { return '<td>' + esc(m[k]) + '</td>'; }).join('') + '</tr></table></div>';
    }
    var w = obj(c.weights);
    if (w) h += '<div style="margin-top:10px;overflow:auto"><table class="gs-tbl"><tr>' + Object.keys(w).map(function (k) { return '<th>' + esc(k) + '</th>'; }).join('') + '</tr><tr>' + Object.keys(w).map(function (k) { return '<td>' + esc(w[k]) + '</td>'; }).join('') + '</tr></table></div>';
    var b = obj(c.bands), bp = obj(c.bands_pct);
    if (b || bp) {
      h += '<div style="margin-top:10px;font-size:12.5px;color:var(--ink-dim)">합격 가능권 기준 (' + (b ? '환산점수' : '만점 대비 비율') + ')</div><div style="margin-top:6px">';
      var src = b || bp;
      [['안정', 's'], ['적정', 'a'], ['도전', 'c']].forEach(function (x) {
        if (src[x[0]] != null) h += '<span class="gs-band ' + x[1] + '">' + x[0] + ' ' + (b ? '≥ ' + esc(src[x[0]]) + '점' : '≥ ' + Math.round(src[x[0]] * 1000) / 10 + '%') + '</span>';
      });
      h += '</div>';
    }
    var ex = [];
    if (c.tiebreak) ex.push(['동점자 처리', esc(c.tiebreak)]);
    if (c.deduction) ex.push(['출결 감점', esc(c.deduction)]);
    if (c.free_semester) ex.push(['자유학기', esc(c.free_semester)]);
    if (ex.length) h += '<div style="margin-top:10px">' + kv(ex) + '</div>';
    if (c.note) h += '<div class="gs-note">' + (c.approx ? '⚠ 근사식 · ' : '') + nl2br(c.note) + '</div>';
    else if (c.approx) h += '<div class="gs-note">⚠ 근사식입니다. 요강 확정 시 갱신 필요.</div>';
    return h;
  }

  function tabReq(s) {
    var h = '<div class="gs-warn">모집인원·원서접수/전형 일정은 DB에 등록되어 있지 않습니다. 해당 학년도 <b>학교 공식 모집요강</b>에서 반드시 확인하세요.</div>';
    h += sec('전형 단계', kv([
      ['전형', esc(s.admission_type)], ['기준 학년도', s.year ? esc(s.year) + '학년도' : ''],
      ['1단계', s.stage1_desc ? nl2br(s.stage1_desc) : ''], ['2단계', s.stage2_desc ? nl2br(s.stage2_desc) : ''],
      ['지원 자격', s.eligibility_note ? nl2br(s.eligibility_note) : '']
    ]));
    h += sec('내신 환산 방식', convHtml(s));
    var exr = S.rules.filter(function (r) { return r.severity === 'zero' || r.severity === 'deduct' || r.severity === 'deduct_minor'; });
    if (exr.length && s.school_type !== '영재학교') {
      // 요강 감점 규칙은 외고·영재학교 요강 기준 — 참고용
    }
    return h;
  }

  var SEV = { zero: '0점/탈락', deduct: '감점', deduct_minor: '경미 감점' };
  function tabEs(s) {
    var t = tplFor(s), h = '';
    if (!t) h += empty('등록된 자소서 양식이 없습니다.<br>학교 공식 서식을 확인해 주세요.');
    else {
      var qs = arr(t.t.questions);
      if (t.generic) h += '<div class="gs-warn">' + (t.fallback ? '국제고는 <b>외고 공통 양식</b>을 기준으로 표시합니다.' : '이 학교 전용 양식이 아닌 <b>' + esc(s.school_type) + ' 공통 양식</b>입니다.') + ' 실제 서식은 학교 공식 요강을 확인하세요.</div>';
      h += sec((t.t.title || '자소서 양식') + (t.t.year ? ' · ' + esc(t.t.year) : ''),
        (qs.length ? '<div style="overflow:auto"><table class="gs-tbl"><tr><th style="width:44px">번호</th><th style="width:110px">영역</th><th>문항</th><th style="width:78px">글자수</th></tr>' +
          qs.map(function (q, i) { return '<tr><td>' + esc(q.no != null ? q.no : i + 1) + '</td><td>' + esc(q.area) + '</td><td>' + nl2br(q.prompt) + '</td><td>' + (q.max_chars ? esc(q.max_chars) + '자' : '') + '</td></tr>'; }).join('') +
          '</table></div>' : '<div class="gs-note">문항이 등록되지 않았습니다.</div>') +
        (t.t.total_max_chars ? '<div class="gs-note">총 ' + esc(t.t.total_max_chars) + '자 이내</div>' : ''));
    }
    var rules = S.rules;
    if (rules.length) {
      var applies = s.school_type === '영재학교' || s.school_type === '외고';
      h += '<div class="gs-card"><details class="gs-det"' + (applies ? ' open' : '') + '><summary><b style="color:var(--gold)">자소서 기재 금지·감점 사유</b> (' + rules.length + '건)</summary>' +
        (applies ? '' : '<div class="gs-note">※ 외고·영재학교 요강에서 수집한 규정입니다. ' + esc(s.school_type) + '에는 그대로 적용되지 않을 수 있으니 학교 요강과 대조하세요.</div>') +
        '<div style="overflow:auto;margin-top:8px"><table class="gs-tbl"><tr><th style="width:84px">구분</th><th style="width:110px">분류</th><th>내용</th></tr>' +
        rules.map(function (r) { return '<tr><td>' + esc(SEV[r.severity] || r.severity) + '</td><td>' + esc(r.category) + '</td><td>' + nl2br(r.description) + '</td></tr>'; }).join('') +
        '</table></div></details></div>';
    }
    return h;
  }

  function tabIv(s) {
    var i = s.interview || {}, q = ivQ(s), h = '';
    if (!hasIv(s)) return empty('등록된 면접 자료가 없습니다.<br>면접 기출·형식 자료를 확보하면 DB에 추가할 수 있습니다.');
    if (i.format || i.common_question_style) h += sec('면접 형식', kv([['형식', i.format ? nl2br(i.format) : ''], ['출제 유형', i.common_question_style ? nl2br(i.common_question_style) : '']]));
    if (arr(i.focus).length) h += sec('평가 포인트', ul(i.focus));
    if (arr(i.past_questions).length) h += sec('기출·예상 질문 (' + i.past_questions.length + ')', '<ol class="gs-ul">' + i.past_questions.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>');
    if (q.length) h += sec('면접 문항 DB (' + q.length + ')', '<div style="overflow:auto"><table class="gs-tbl"><tr><th style="width:60px">연도</th><th style="width:100px">영역</th><th>문항</th></tr>' +
      q.map(function (x) { return '<tr><td>' + esc(x.year) + '</td><td>' + esc(x.area) + '</td><td>' + nl2br(x.question) + '</td></tr>'; }).join('') + '</table></div>');
    if (arr(i.tips).length) h += sec('준비 팁', ul(i.tips));
    if (i.source_note) h += '<div class="gs-note">출처: ' + esc(i.source_note) + '</div>';
    return h;
  }

  function tabPf(s) {
    var p = s.profile;
    if (!hasProfile(s)) return empty('등록된 학교 특성(특색사업) 정보가 없습니다.');
    var h = '';
    if (p.ideology) h += sec('교육 이념·인재상', '<div style="font-size:13.5px;line-height:1.7;color:var(--ink)">' + nl2br(p.ideology) + '</div>');
    if (arr(p.keywords).length) h += sec('핵심 키워드', p.keywords.map(function (k) { return '<span class="gs-tag g" style="margin:0 6px 6px 0;display:inline-block">' + esc(k) + '</span>'; }).join(''));
    if (arr(p.programs).length) h += sec('학교 특색사업·프로그램 (' + p.programs.length + ')', '<div class="gs-prog">' + p.programs.map(function (x) {
      return '<div><b>' + esc(x && x.name) + '</b><span>' + nl2br(x && x.desc) + '</span></div>'; }).join('') + '</div>');
    if (p.clubs_summary) h += sec('동아리·활동 요약', '<div style="font-size:13px;line-height:1.7;color:var(--ink)">' + nl2br(p.clubs_summary) + '</div>');
    var meta = [];
    if (p.source) meta.push('출처: ' + esc(p.source));
    if (s.profile_updated_at) meta.push('갱신: ' + esc(String(s.profile_updated_at).slice(0, 10)));
    if (meta.length) h += '<div class="gs-note">' + meta.join(' · ') + '</div>';
    h += '<div class="gs-note">자소서·면접 답변에 학교 특색을 연결할 때 위 프로그램명을 근거로 활용하세요.</div>';
    return h;
  }

  function tabPx(s) {
    var p = peOf(s);
    if (!p.length) return empty('등록된 기출문제가 없습니다.<br>(현재 과학고·영재학교 위주로 등록)');
    return sec('기출 목록 (' + p.length + ')', '<div style="overflow:auto"><table class="gs-tbl"><tr><th style="width:60px">연도</th><th style="width:90px">단계</th><th style="width:90px">과목</th><th>제목</th><th>비고</th></tr>' +
      p.slice().sort(function (a, b) { return String(b.year).localeCompare(String(a.year)); }).map(function (x) {
        return '<tr><td>' + esc(x.year) + '</td><td>' + esc(x.stage) + '</td><td>' + esc(x.subject) + '</td><td>' + esc(x.title) + '</td><td>' + esc(x.file_note) + '</td></tr>'; }).join('') + '</table></div>');
  }

  function tabCount(s, k) {
    if (k === 'iv') return hasIv(s) ? '●' : '';
    if (k === 'px') return peOf(s).length ? '(' + peOf(s).length + ')' : '';
    if (k === 'es') return tplFor(s) ? '●' : '';
    if (k === 'pf') return hasProfile(s) ? '●' : '';
    return '';
  }

  function renderDetail() {
    var el = S.root.querySelector('.gs-main'); if (!el) return;
    var s = S.schools.filter(function (x) { return x.id === S.sel; })[0];
    if (!s) { el.innerHTML = '<div class="gs-card"><div class="gs-empty">왼쪽에서 학교를 선택하면 입시요강 · 자소서 · 면접 · 학교 특성을 확인할 수 있습니다.</div></div>'; return; }
    var body = { ov: tabOv, req: tabReq, es: tabEs, iv: tabIv, pf: tabPf, px: tabPx }[S.tab](s);
    el.innerHTML =
      '<div class="gs-head"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><div class="gs-title">' + esc(s.name) + '</div>' +
      '<button class="gs-btn" data-act="print">인쇄 / PDF</button></div>' +
      '<div class="gs-tags"><span class="gs-tag g">' + esc(s.school_type) + '</span><span class="gs-tag">' + esc(s.region || '-') + '</span><span class="gs-tag">' + esc(s.scope || '-') + '</span><span class="gs-tag">' + esc(s.gender || '-') + '</span>' +
      (s.year ? '<span class="gs-tag">' + esc(s.year) + '학년도</span>' : '') + '</div></div>' +
      '<div class="gs-tabs">' + TABS.map(function (t) { return '<div class="gs-tab' + (S.tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '<span class="c">' + tabCount(s, t[0]) + '</span></div>'; }).join('') + '</div>' + body;
  }

  /* ---------- print ---------- */
  function printSchool(s) {
    var parts = [['개요', tabOv], ['입시요강', tabReq], ['자소서', tabEs], ['면접', tabIv], ['학교 특성', tabPf], ['기출', tabPx]]
      .map(function (p) { return '<h2>' + p[0] + '</h2>' + p[1](s); }).join('');
    var doc = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(s.name) + ' 학교 정보</title><style>' +
      ':root{--panel:#fff;--panel-2:#f4f4f6;--line:#ccc;--line-soft:#ddd;--ink:#111;--ink-dim:#333;--ink-mute:#666;--gold:#8a5a00;--safe:#0a7a3a;--reach:#b45309}' +
      'body{font-family:"Malgun Gothic","Noto Sans KR",sans-serif;color:#111;margin:20px;font-size:12px}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;border-bottom:2px solid #8a5a00;padding-bottom:3px;margin:20px 0 8px;page-break-after:avoid}' +
      '.gs-card{border:1px solid #ccc;border-radius:6px;padding:10px 12px;margin-bottom:8px;page-break-inside:avoid}.gs-card h4{margin:0 0 6px;font-size:12.5px;color:#8a5a00}' +
      '.gs-kv{display:grid;grid-template-columns:100px 1fr;gap:4px 10px}.gs-kv dt{color:#666}.gs-kv dd{margin:0}.gs-tbl{width:100%;border-collapse:collapse}.gs-tbl th,.gs-tbl td{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}.gs-tbl th{background:#eee}' +
      '.gs-tag{border:1px solid #bbb;border-radius:4px;padding:1px 6px;margin-right:4px}.gs-prog{display:grid;grid-template-columns:1fr 1fr;gap:6px}.gs-prog>div{border:1px solid #ccc;padding:6px 8px;border-radius:6px}.gs-prog b{display:block}.gs-warn,.gs-note{color:#555;margin:6px 0}.gs-empty{color:#777;padding:8px}' +
      '.gs-band{border:1px solid #bbb;border-radius:4px;padding:1px 7px;margin-right:4px}.gs-ul{margin:0;padding-left:18px}.gs-det summary{font-weight:700}' +
      '</style></head><body><h1>' + esc(s.name) + '</h1><div>' + esc(s.school_type) + ' · ' + esc(s.region || '') + ' · ' + esc(s.scope || '') + '</div>' + parts +
      '<div class="gs-note" style="margin-top:16px">※ 본 자료는 학원 DB 기준이며, 모집인원·일정 등 확정 사항은 학교 공식 모집요강을 확인하세요.</div></body></html>';
    var f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    var d = f.contentWindow.document; d.open(); d.write(doc); d.close();
    f.contentWindow.focus();
    setTimeout(function () { try { f.contentWindow.print(); } catch (e) {} setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 2000); }, 300);
  }

  /* ---------- shell ---------- */
  function regions() {
    var ORD = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
    var m = {}; S.schools.forEach(function (s) { if (s.region) m[s.region] = 1; });
    return Object.keys(m).sort(function (a, b) { var x = ORD.indexOf(a), y = ORD.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y) || a.localeCompare(b); });
  }
  function shell() {
    var cov = { 면접: S.schools.filter(hasIv).length, 특색: S.schools.filter(hasProfile).length, 기출: S.schools.filter(function (s) { return peOf(s).length; }).length };
    S.root.innerHTML =
      '<div class="gs-cov">총 ' + S.schools.length + '개교 · 학교 특색 ' + cov['특색'] + ' · 면접 자료 ' + cov['면접'] + ' · 기출 ' + cov['기출'] + '개교 등록</div>' +
      '<div class="gs-wrap"><div class="gs-side">' +
      '<div class="gs-chips"><span class="gs-chip' + (S.type ? '' : ' on') + '" data-type="">전체</span>' + TYPES.map(function (t) { return '<span class="gs-chip' + (S.type === t ? ' on' : '') + '" data-type="' + t + '">' + t + '</span>'; }).join('') + '</div>' +
      '<input class="gs-in" type="search" placeholder="학교명 검색" value="' + esc(S.q) + '">' +
      '<select class="gs-in gs-reg" title="지역 선택 시 해당 광역단체 학교 + 전국단위 학교가 모두 표시됩니다"><option value="">전체 지역</option><option value="__nat"' + (S.region === '__nat' ? ' selected' : '') + '>전국단위만</option>' + regions().map(function (r) { var n = S.schools.filter(function (s) { return s.region === r; }).length; return '<option value="' + esc(r) + '"' + (S.region === r ? ' selected' : '') + '>' + esc(r) + ' (' + n + ')</option>'; }).join('') + '</select>' +
      '<div class="gs-meta" style="margin:-4px 0 8px">※ 지역 선택 시 해당 지역 학교 + 전국단위 학교 모두 표시</div>' +
      '<div class="gs-meta gs-count" style="margin-bottom:6px"></div>' +
      '<div class="gs-meta" style="margin-bottom:6px">● 요강 · 환산 · 자소서 · 면접 · 특색 · 기출 확보 여부</div>' +
      '<div class="gs-list"></div></div><div class="gs-main"></div></div>';
    renderList(); renderDetail();
  }

  function bind() {
    if (S.root._gsBound) return; S.root._gsBound = true;
    S.root.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target : e.target.parentNode;
      var it = t.closest('.gs-item'); if (it) { S.sel = it.getAttribute('data-id'); S.tab = 'ov'; renderList(); renderDetail(); if (window.innerWidth <= 960) { var m = S.root.querySelector('.gs-main'); if (m && m.scrollIntoView) m.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
      var ch = t.closest('.gs-chip'); if (ch) { S.type = ch.getAttribute('data-type') || ''; S.root.querySelectorAll('.gs-chip').forEach(function (c) { c.classList.toggle('on', (c.getAttribute('data-type') || '') === S.type); }); renderList(); return; }
      var tb = t.closest('.gs-tab'); if (tb) { S.tab = tb.getAttribute('data-tab'); renderDetail(); return; }
      var bt = t.closest('[data-act="print"]'); if (bt) { var s = S.schools.filter(function (x) { return x.id === S.sel; })[0]; if (s) printSchool(s); }
    });
    S.root.addEventListener('input', function (e) { if (e.target.classList.contains('gs-in') && e.target.type === 'search') { S.q = e.target.value; renderList(); } });
    S.root.addEventListener('change', function (e) { if (e.target.classList.contains('gs-reg')) { S.region = e.target.value; renderList(); } });
  }

  window.mountGoipSchool = function (target) {
    var root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) return;
    css(); S.root = root; bind();
    if (!S.loaded) {
      root.innerHTML = '<div class="gs-empty">학교 정보를 불러오는 중…</div>';
      load().then(function () {
        if (S.err) { root.innerHTML = '<div class="gs-empty">' + esc(S.err) + '<br><button class="gs-btn" id="gs-retry" style="margin-top:10px">다시 시도</button></div>';
          var rb = root.querySelector('#gs-retry'); if (rb) rb.onclick = function () { S.err = null; window.mountGoipSchool(root); }; return; }
        shell();
      });
    } else shell();
  };
  window.selectGoipSchool = function (id) { S.sel = id; S.tab = 'ov'; if (S.root && S.loaded) { renderList(); renderDetail(); } };
})();
