# PentaView 아르케 (Arche)

학원용 입시 컨설팅 엔진 프론트엔드. 정적 단일 페이지(`index.html`).

## 구조
- `index.html` — 앱 셸(진단·역설계·로드맵·설계 UI)
- `vercel.json` — 정적 배포 설정(cleanUrls)

## 백엔드
- Supabase 프로젝트: `pentaview-arche` (`dvxepjctjazobrkjrkdw`, ap-northeast-2)
- 참조 데이터: `achievement_standards`(2,936) · `subject_catalog`(199) 적재 완료
- 입결: `admission_cutlines` (업로드 대기)
- ※ Supabase 클라이언트 연동은 다음 단계(anon key + RLS 정책 설정 후)

## 배포 (GitHub → Vercel)
```bash
git init
git add .
git commit -m "arche: initial front"
git branch -M main
git remote add origin https://github.com/<계정>/arche.git
git push -u origin main
```
이후 Vercel에서 해당 GitHub 레포를 Import → 자동 배포. 이후 push마다 자동 재배포.
