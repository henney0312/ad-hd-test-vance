# 사후 설문 응답 구글 시트 연결 방법

1. 구글 드라이브에서 새 스프레드시트 생성 (예: `ADHD 테스트 사후 설문 응답`)
2. 상단 메뉴 **확장 프로그램 → Apps Script** 선택
3. 기본 코드를 모두 지우고 `docs/apps-script.gs` 내용 붙여넣기 → 저장
4. 오른쪽 위 **배포 → 새 배포** 선택
   - 유형 선택(톱니바퀴): **웹 앱**
   - 다음 사용자 인증 정보로 실행: **나**
   - 액세스 권한이 있는 사용자: **모든 사용자**
5. **배포** 클릭 → 구글 계정 권한 허용 → 표시되는 **웹 앱 URL**(`https://script.google.com/macros/s/.../exec`) 복사
6. `config.js`의 `SURVEY_ENDPOINT: ""` 따옴표 안에 해당 URL 붙여넣기 후 저장·커밋

응답은 시트 첫 번째 탭에 `timestamp, checkedCount, q1, q2, q3, userAgent` 열로 한 줄씩 쌓임.
