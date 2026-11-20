/* ============================================================
 * arche_ramyeon_series.js · '~와 함께라면' 시리즈 등록표 (v1)
 *  - 시리즈마다 달라지는 것(이름·시즌 수와 이름·중심 눈·아이콘·AI 판정 프로필)을 한 곳에서 관리
 *  - 새 시리즈 = 아래 LIST에 1항목 추가 + DB ramyeon_series 1행 INSERT (앱 코드 수정 불필요)
 *  - enabled:false 이면 화면에 노출되지 않음 (콘텐츠 완성 전 숨김)
 * ============================================================ */
(function(){
  var LIST=[
    { key:'lit', stage:'ramyeon_lit', level:'mild', lens:'literature', enabled:true,
      icon:'🍜', title:'문학과 함께라면', short:'라면 문학', band:'초3~4', unit:'이야기',
      pitch:'이야기로 5개의 눈을 키우는 20강',
      centerEye:'F1',
      seasons:[ {no:1,name:'나'}, {no:2,name:'가족'}, {no:3,name:'친구'}, {no:4,name:'마을과 나라'} ] },
    { key:'sci', stage:'ramyeon_sci', level:'mild', lens:'science', enabled:true,
      icon:'🔬', title:'과학과 함께라면', short:'라면 과학', band:'초3~4', unit:'실험',
      pitch:'직접 해 보며 5개의 눈을 키우는 25강',
      centerEye:'F2',
      eyes:[{ax:'F1',ic:'🔭',nm:'관찰력',c:'#e0453a'},{ax:'F2',ic:'🌿',nm:'자연의 눈',c:'#2f9e8f'},{ax:'F3',ic:'🌍',nm:'세상의 눈',c:'#2b6cb0'},{ax:'F4',ic:'💗',nm:'마음의 눈',c:'#d6578a'},{ax:'F5',ic:'💡',nm:'상상력',c:'#d4a94a'}],
      seasons:[ {no:1,name:'물리'}, {no:2,name:'화학'}, {no:3,name:'생명'}, {no:4,name:'열과 날씨'}, {no:5,name:'지구와 환경'} ] }
  ];
  function list(all){ return LIST.filter(function(s){ return all||s.enabled; }); }
  function byStage(stage){ for(var i=0;i<LIST.length;i++) if(LIST[i].stage===stage && LIST[i].enabled) return LIST[i]; return null; }
  function isStage(stage){ return !!byStage(stage); }
  function lessonsOf(s){ return (s.seasons.length)*5; }
  function eyesOf(stage){ for(var i=0;i<LIST.length;i++) if(LIST[i].stage===stage) return LIST[i].eyes||null; return null; }
  window.ArcheRamyeonSeries={ eyesOf:eyesOf, list:list, byStage:byStage, isStage:isStage, lessonsOf:lessonsOf, version:2 };
})();
