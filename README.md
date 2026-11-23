# ADHD 자가진단 테스트 (판정 불가)

수업 '광고와 대중문화' 4팀 사회캠페인 웹페이지.
Figma Make 시안(`[시안] ADHD 자가진단 테스트`)의 화면·문구·이미지·스타일을 GitHub Pages용 정적 사이트로 옮긴 것.

- 배포 주소: https://henney0312.github.io/ad-hd-test-vance/
- 화면 흐름: 소개 → 5문항(밈 이미지) → 로딩 → 판정 불가 결과·정보 카드 → 인식 설문 4문항 → 실시간 통계 → 공유
- 데스크탑(431px 이상): 화면 가운데 아이폰 프레임 형태로 표시 / 폰(430px 이하): 화면 전체 사용

## 파일
- `index.html`, `styles.css`(원본 styles.css), `app.js`(원본 ADHDTest.tsx 이식), `assets/`(원본 이미지)
- `config.js`: 설문 저장 주소
- `docs/apps-script.gs`, `docs/google-sheet-setup.md`: 설문 저장·통계용 구글 시트 연결

## 로컬 확인
```
python3 -m http.server 8000
```
