# 판정 불가 ADHD 테스트

수업 '광고와 대중문화' 4팀 사회캠페인 웹페이지. 슬로건: 진단명은 유행어가 아니다.

## 구성
- 표지(밈 테스트 형식) → 5문항 체크 → 결과 로딩 → **판정 불가** → ADHD 진단 기준·대체 표현 → 사후 설문 3문항 → 공유
- 빌드 과정 없는 정적 사이트 (`index.html`, `style.css`, `app.js`, `config.js`)

## 문구 수정
- 테스트 문항, 설문 문항, 설문 저장 주소: `config.js`
- 화면 문구: `index.html`

## 로컬 확인
```
python3 -m http.server 8000
```
브라우저에서 http://localhost:8000 접속

## 배포
- GitHub Pages: 저장소 Settings → Pages → Source `Deploy from a branch`, Branch `main` / `(root)` → 저장. 약 1분 후 `https://<계정>.github.io/<저장소>/` 로 접속 가능
- 설문 응답 저장: `docs/google-sheet-setup.md`
