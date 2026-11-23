/**
 * ADHD 자가진단 테스트 - 설문 응답 저장 + 실시간 통계 (구글 시트)
 * 원본 Figma Make 의 /api/survey-results 와 같은 역할.
 * 설정 방법: docs/google-sheet-setup.md
 */
var HEADERS = ['timestamp', 'frequency', 'recognition', 'changeResponse', 'comment'];

function sheet_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function isScale_(v) {
  return typeof v === 'number' && v % 1 === 0 && v >= 1 && v <= 5;
}

function stats_() {
  var sh = sheet_();
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
    sheet_().appendRow([new Date(), v.frequency, v.recognition, v.changeResponse, comment]);
  } finally {
    lock.releaseLock();
  }
  return json_(stats_());
}
