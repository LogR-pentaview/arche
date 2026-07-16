# /shared — 4개 앱 공통 소스 (단일 소스)

academy · parent · admin · partner 네 앱이 **똑같이 import**하는 공통 코드입니다.
**절대 앱별로 복붙하지 마세요.** 여기 한 벌만 두고 모두가 `/shared/...` 경로로 불러옵니다.

## 현재 포함 (1일차 추출분)

| 파일 | 역할 |
|------|------|
| `config.js`   | Supabase URL/Key, Toss 키 등 공개 상수 |
| `supabase.js` | Supabase 클라이언트(`sb`) 초기화 |
| `ai.js`       | `callAI()`, `careernet()` 엣지함수 호출 래퍼 |

## 로드 순서 (각 앱 index.html의 `<head>` 또는 `<body>` 끝)

```html
<!-- 1) 외부 라이브러리 -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- 2) 공통 (반드시 이 순서) -->
<script src="/shared/config.js"></script>
<script src="/shared/supabase.js"></script>
<script src="/shared/ai.js"></script>

<!-- 3) 이 앱 전용 코드 -->
<script src="./app.js"></script>
```

- 경로는 **절대경로 `/shared/...`** — 앱 폴더 깊이와 무관하게 로드됩니다.
- 전역 스코프 유지 → 기존 `onclick="..."` 핸들러 그대로 작동합니다.

## 다음에 추가될 예정

- `auth.js` — 로그인·세션·역할판별·리다이렉트 (공통 로그인 → 각 앱)
- `tokens.css` — 디자인 토큰·공통 컴포넌트(브랜딩 단일 소스)
- `utils.js` — PDF 파싱·포맷 등 공용 함수
- `student/` — 학생·자녀 기능 (academy·parent 공용)
