# 설문 응답 저장·실시간 통계 연결 방법 (구글 시트)

1. 구글 드라이브에서 새 스프레드시트 생성 (예: `ADHD 테스트 설문 응답`)
2. 상단 메뉴 **확장 프로그램 → Apps Script**
3. 기본 코드를 모두 지우고 `docs/apps-script.gs` 내용 붙여넣기 → 저장(💾)
4. 오른쪽 위 **배포 → 새 배포**
   - 유형 선택(톱니바퀴): **웹 앱**
   - 다음 사용자 인증 정보로 실행: **나**
   - 액세스 권한이 있는 사용자: **모든 사용자**
5. **배포** → 구글 계정 권한 허용 (경고 화면에서 고급 → 이동 클릭)
6. 표시되는 **웹 앱 URL** (`https://script.google.com/macros/s/.../exec`) 복사
7. `config.js`의 `window.SURVEY_ENDPOINT = ""` 따옴표 안에 URL 붙여넣기 후 커밋

응답은 시트 첫 탭에 `timestamp, frequency, recognition, changeResponse, comment` 열로 쌓이며,
설문 제출 후 화면의 실시간 통계는 이 시트 데이터를 5초마다 다시 읽어 표시함.
