(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};
  var items = cfg.ITEMS || [];
  var survey = cfg.SURVEY || [];
  var checked = new Set();
  var submitted = false;

  function $(id) { return document.getElementById(id); }

  function go(id) {
    document.querySelectorAll(".screen").forEach(function (s) {
      s.classList.toggle("active", s.id === id);
    });
    document.body.classList.toggle("is-calm", $(id).classList.contains("calm"));
    window.scrollTo(0, 0);
    if (id === "s-loading") runLoading();
  }

  document.querySelectorAll("[data-go]").forEach(function (el) {
    el.addEventListener("click", function () { go(el.getAttribute("data-go")); });
  });

  // 문항 렌더링
  var list = $("checks");
  items.forEach(function (text, i) {
    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "check";
    btn.setAttribute("aria-pressed", "false");
    btn.innerHTML = '<span class="box" aria-hidden="true"></span><span class="txt"></span>';
    btn.querySelector(".txt").textContent = (i + 1) + ". " + text;
    btn.addEventListener("click", function () {
      if (checked.has(i)) checked.delete(i); else checked.add(i);
      var on = checked.has(i);
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", String(on));
      $("count").textContent = checked.size;
    });
    li.appendChild(btn);
    list.appendChild(li);
  });

  $("btn-result").addEventListener("click", function () { go("s-loading"); });

  function runLoading() {
    var fill = $("bar-fill");
    fill.style.transition = "none";
    fill.style.width = "0%";
    void fill.offsetWidth;
    fill.style.transition = "width 1.8s ease-in-out";
    fill.style.width = "100%";
    setTimeout(function () {
      $("verdict-sub").textContent =
        "체크한 항목 " + checked.size + "개. 몇 개를 체크해도 결과는 같음.";
      go("s-verdict");
    }, 2000);
  }

  // 설문 렌더링
  var qWrap = $("questions");
  survey.forEach(function (q, qi) {
    var fs = document.createElement("fieldset");
    fs.className = "q";
    var lg = document.createElement("legend");
    lg.textContent = (qi + 1) + ". " + q.text;
    fs.appendChild(lg);
    var scale = document.createElement("div");
    scale.className = "scale";
    for (var v = 1; v <= 5; v++) {
      var lab = document.createElement("label");
      var inp = document.createElement("input");
      inp.type = "radio";
      inp.name = q.id;
      inp.value = String(v);
      lab.appendChild(inp);
      var sp = document.createElement("span");
      sp.textContent = v;
      lab.appendChild(sp);
      scale.appendChild(lab);
    }
    fs.appendChild(scale);
    var ends = document.createElement("div");
    ends.className = "ends";
    ends.innerHTML = "<span></span><span></span>";
    ends.children[0].textContent = q.low;
    ends.children[1].textContent = q.high;
    fs.appendChild(ends);
    qWrap.appendChild(fs);
  });

  $("survey").addEventListener("submit", function (e) {
    e.preventDefault();
    var data = { checkedCount: checked.size, userAgent: navigator.userAgent.slice(0, 200) };
    var missing = false;
    survey.forEach(function (q) {
      var sel = document.querySelector('input[name="' + q.id + '"]:checked');
      if (!sel) missing = true; else data[q.id] = Number(sel.value);
    });
    $("survey-error").hidden = !missing;
    if (missing) return;
    if (submitted) { go("s-share"); return; }

    var btn = $("btn-submit");
    btn.disabled = true;
    btn.textContent = "제출 중";

    var done = function () {
      submitted = true;
      $("thanks").hidden = false;
      btn.disabled = false;
      btn.textContent = "제출";
      go("s-share");
    };

    if (!cfg.SURVEY_ENDPOINT) { done(); return; }

    // Apps Script는 CORS 응답을 주지 않으므로 no-cors + text/plain 으로 전송
    fetch(cfg.SURVEY_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data)
    }).then(done, done);
  });

  // 공유
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    setTimeout(function () { t.hidden = true; }, 2000);
  }

  $("btn-share").addEventListener("click", function () {
    var url = location.href.split("#")[0];
    var shareData = {
      title: "ADHD 테스트 5문항 (결과 주의)",
      text: "나의 결과: 판정 불가. 3개 이상이면 ADHD라는 테스트, 직접 해 보기",
      url: url
    };
    if (navigator.share) {
      navigator.share(shareData).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () { toast("링크가 복사됨"); });
    } else {
      prompt("아래 링크를 복사하여 공유", url);
    }
  });

  $("btn-restart").addEventListener("click", function () {
    checked.clear();
    document.querySelectorAll(".check").forEach(function (b) {
      b.classList.remove("on");
      b.setAttribute("aria-pressed", "false");
    });
    $("count").textContent = "0";
    go("s-cover");
  });
})();
