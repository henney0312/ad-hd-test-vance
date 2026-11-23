/**
 * 사후 설문 응답을 구글 시트에 저장하는 Apps Script.
 * 설정 방법은 docs/google-sheet-setup.md 참고.
 */
var HEADERS = ["timestamp", "checkedCount", "q1", "q2", "q3", "userAgent"];

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  var data = {};
  try { data = JSON.parse(e.postData.contents); } catch (err) {}
  var row = HEADERS.map(function (h) {
    if (h === "timestamp") return new Date();
    return data[h] !== undefined ? data[h] : "";
  });
  sheet.appendRow(row);
  return ContentService.createTextOutput("ok");
}
