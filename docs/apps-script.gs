/**
 * ADHD 자가진단 테스트 - 설문 응답 저장 + 통계 (구글 시트)
 * 원본 Figma Make 의 /api/survey-results 와 같은 역할.
 * 설정 방법: docs/google-sheet-setup.md
 *
 * 시트 구성
 * - '응답' 탭: 응답 원본 (주관식 포함). 시트 소유자·공유받은 사람만 볼 수 있음.
 * - '통계' 탭: 문항별 응답 수·비율·평균 (수식으로 자동 갱신)
 * - 웹페이지에 공개되는 실시간 통계에는 객관식 집계만 포함되며 주관식은 절대 포함되지 않음.
 */
var RESPONSE_SHEET = '응답';
var SUMMARY_SHEET = '통계';
var HEADERS = ['제출 시각', 'Q1 진단명 표현 사용 빈도 (1~5)', 'Q2 전문의 진단 필요성 인식 (1~5)', 'Q3 인식 변화 (선택지 1~5)', 'Q4 주관식'];
var CHANGE_LABELS = [
  '1. 이전에도 부적절, 지금도 같음',
  '2. 이전엔 괜찮았으나 이제 신중하게',
  '3. 부적절하나 습관적으로 계속 사용',
  '4. 이전에도 지금도 문제없음',
  '5. 잘 모르겠음',
];

/** 처음 한 번 실행: 응답·통계 탭 생성 */
function setup() {
  responses_();
  summary_();
}

function responses_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(RESPONSE_SHEET);
  if (!sh) {
    sh = ss.getSheets()[0];
    if (sh.getLastRow() > 0 || sh.getName() === SUMMARY_SHEET) sh = ss.insertSheet(RESPONSE_SHEET);
    else sh.setName(RESPONSE_SHEET);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#e5f3ff');
    sh.setColumnWidth(1, 150);
    sh.setColumnWidths(2, 3, 190);
    sh.setColumnWidth(5, 420);
  }
  return sh;
}

function summary_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(SUMMARY_SHEET)) return;
  var sh = ss.insertSheet(SUMMARY_SHEET);
  var R = "'" + RESPONSE_SHEET + "'!";
  var rows = [];
  rows.push(['ADHD 자가진단 테스트 설문 통계', '', '']);
  rows.push(['총 응답 수', '=COUNT(' + R + 'B2:B)', '']);
  rows.push(['', '', '']);

  function block(title, col, labels) {
    var start = rows.length + 2; // 다음 행 번호(1부터) + 제목행
    rows.push([title, '응답 수', '비율']);
    labels.forEach(function (label, i) {
      rows.push([label, '=COUNTIF(' + R + col + '2:' + col + ',' + (i + 1) + ')', '=IF($B$2=0,0,B' + (start + i) + '/$B$2)']);
    });
    return start;
  }

  var five = ['1점 (전혀 그렇지 않다)', '2점', '3점', '4점', '5점 (매우 그렇다)'];
  var q1 = block('Q1. 평소 ‘나 완전 ADHD인가 봐’라는 말 사용 빈도', 'B', five);
  rows.push(['평균 (5점 만점)', '=IFERROR(ROUND(AVERAGE(' + R + 'B2:B),2),0)', '']);
  rows.push(['', '', '']);
  var q2 = block('Q2. ADHD는 전문의 진단이 필요한 신경발달장애라는 인식', 'C', five);
  rows.push(['평균 (5점 만점)', '=IFERROR(ROUND(AVERAGE(' + R + 'C2:C),2),0)', '']);
  rows.push(['', '', '']);
  var q3 = block('Q3. 테스트 참여 후 인식 변화', 'D', CHANGE_LABELS);
  rows.push(['', '', '']);
  rows.push(['Q4 주관식 응답 수', '=COUNTA(' + R + 'E2:E)', '']);

  sh.getRange(1, 1, rows.length, 3).setValues(rows);
  sh.getRange('A1').setFontWeight('bold').setFontSize(14);
  sh.getRange('A2:B2').setFontWeight('bold');
  [q1, q2, q3].forEach(function (s) {
    sh.getRange(s - 1, 1, 1, 3).setFontWeight('bold').setBackground('#e5f3ff');
    sh.getRange(s, 3, 5, 1).setNumberFormat('0.0%');
  });
  sh.setColumnWidth(1, 380);
  sh.setColumnWidths(2, 2, 90);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function isScale_(v) {
  return typeof v === 'number' && v % 1 === 0 && v >= 1 && v <= 5;
}

// 웹페이지 공개용 집계 (객관식만, 주관식 제외)
function stats_() {
  var sh = responses_();
  var rows = sh.getLastRow() > 1 ? sh.getRange(2, 2, sh.getLastRow() - 1, 3).getValues() : [];
  var freq = [0, 0, 0, 0, 0], rec = [0, 0, 0, 0, 0], chg = [0, 0, 0, 0, 0];
  rows.forEach(function (r) {
    if (isScale_(r[0])) freq[r[0] - 1]++;
    if (isScale_(r[1])) rec[r[1] - 1]++;
    if (isScale_(r[2])) chg[r[2] - 1]++;
  });
  return { total: rows.length, frequency: freq, recognition: rec, change: chg, updatedAt: new Date().toISOString() };
}

function doGet() {
  return json_(stats_());
}

function doPost(e) {
  var v;
  try { v = JSON.parse(e.postData.contents); } catch (err) { return json_({ error: '올바른 설문 응답 형식이 아닙니다.' }); }
  if (!v || !isScale_(v.frequency) || !isScale_(v.recognition) || !isScale_(v.changeResponse)) {
    return json_({ error: '모든 선택 문항에 응답해 주세요.' });
  }
  var comment = typeof v.comment === 'string' ? v.comment.trim().slice(0, 1000) : '';
  // 시트 수식 주입 방지
  if (/^[=+\-@]/.test(comment)) comment = "'" + comment;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = responses_();
    summary_();
    sh.appendRow([new Date(), v.frequency, v.recognition, v.changeResponse, comment]);
  } finally {
    lock.releaseLock();
  }
  return json_(stats_());
}
