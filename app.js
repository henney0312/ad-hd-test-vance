// Figma Make 원본 src/components/ADHDTest.tsx 를 GitHub Pages(정적 호스팅)용으로 옮긴 코드.
// 화면 구성·문구·스타일은 원본과 동일하며, 설문 저장만 Payload DB 대신 구글 시트(Apps Script)를 사용함.
(function () {
  'use strict'

  var ENDPOINT = (window.SURVEY_ENDPOINT || '').trim()

  var questions = [
    '여러 가지 일을 동시에 하다가 하나도 제대로 끝내지 못한 적이 있다.',
    '가만히 있을 때 손으로 종이를 만지작거리거나 찢는 습관이 있다.',
    '평소 물건을 자주 잃어버린다.',
    '해야 할 일을 알고 있으면서도 미룬 적이 있다.',
    '약속 시간에 늦거나 일정을 착각한 적이 있다.',
  ]
  var choices = ['전혀 없다', '가끔 있다', '자주 있다', '매우 자주 있다']

  var memes = [
    { image: 'assets/question-1-meme.png', alt: '할 일을 끝내지 못한 상황을 표현한 밈 이미지', cls: 'meme-contain' },
    { image: 'assets/question-2-meme.webp', alt: '책상 위에 잘게 뜯긴 종이 조각이 놓여 있는 모습', cls: 'meme-second' },
    { image: 'assets/question-3-meme.png', alt: '물건을 어디에 두었는지 잊어버리는 상황을 표현한 밈 이미지', cls: 'meme-portrait' },
    { image: 'assets/question-4-meme.png', alt: '해야 할 일을 미루고 다른 정보를 찾아보는 상황을 표현한 밈 이미지', cls: 'meme-wide' },
    { image: 'assets/question-5-meme.png', alt: '약속 시간을 다르게 기억하는 상황을 표현한 밈 이미지', cls: 'meme-fifth' },
  ]

  var changeOptions = [
    '이전에도 적절하지 않다고 생각했으며, 지금도 같은 생각이다.',
    '이전에는 괜찮다고 생각했지만, 이제는 신중하게 사용해야 한다고 생각한다.',
    '적절하지 않다는 생각은 들지만, 앞으로도 습관적으로 사용할 것 같다.',
    '이전에도 괜찮다고 생각했으며, 지금도 사용하는 데 문제가 없다고 생각한다.',
    '잘 모르겠다.',
  ]

  var state = {
    screen: 'intro', // intro | quiz | loading | result
    current: 0,
    answers: [],
    surveyFrequency: null,
    surveyRecognition: null,
    surveyChange: null,
    surveyComment: '',
    copied: false,
    submitted: false,
    isSubmitting: false,
    submitError: '',
    stats: null,
  }

  var root = document.getElementById('root')
  var lastView = ''
  var loadingTimer = null
  var statsTimer = null

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function cat(mood) {
    return '<img class="cat cat-' + (mood || 'curious') + '" src="assets/snowman.svg" width="300" height="330" alt="하늘색 모자와 목도리를 한 눈사람" />'
  }

  var paw =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<ellipse cx="12" cy="15" rx="6" ry="5" />' +
    '<circle cx="5.5" cy="10" r="2.3" /><circle cx="10" cy="6" r="2.3" />' +
    '<circle cx="18.5" cy="10" r="2.3" /><circle cx="14.5" cy="6" r="2.3" />' +
    '</svg>'

  function sum(values) {
    return values.reduce(function (a, b) { return a + b }, 0)
  }

  function statBars(values, labels, vertical, endpointLabels) {
    var total = sum(values)
    var pct = function (v) { return total ? Math.round((v / total) * 100) : 0 }
    if (vertical) {
      var cols = values.map(function (v, i) {
        var p = pct(v)
        return '<div class="vertical-column"><b>' + p + '%</b><div class="vertical-track"><i style="height:' + p + '%"></i></div><span>' + esc(labels[i]) + '</span></div>'
      }).join('')
      return '<div class="vertical-chart-wrap"><div class="vertical-chart" aria-label="응답 비율 막대그래프">' + cols + '</div>' +
        (endpointLabels ? '<div class="chart-endpoints"><span>' + esc(endpointLabels[0]) + '</span><span>' + esc(endpointLabels[1]) + '</span></div>' : '') +
        '</div>'
    }
    return '<div class="stat-bars">' + values.map(function (v, i) {
      var p = pct(v)
      return '<div class="stat-row"><span>' + esc(labels[i]) + '</span><div class="stat-track"><i style="width:' + p + '%"></i></div><b>' + p + '%</b></div>'
    }).join('') + '</div>'
  }

  function average(values) {
    var total = sum(values)
    if (!total) return '0.0'
    var points = values.reduce(function (s, v, i) { return s + v * (i + 1) }, 0)
    return (points / total).toFixed(1)
  }

  function liveStats(stats) {
    var five = ['1점', '2점', '3점', '4점', '5점']
    var ends = ['전혀 그렇지 않다', '매우 그렇다']
    return '<section class="live-stats" aria-live="polite">' +
      '<div class="stats-heading"><div><span><i></i> 실시간 통계</span><h2>다른 참여자들은<br />어떻게 답했을까요?</h2></div>' +
      '<b>' + Number(stats.total || 0).toLocaleString('ko-KR') + '명</b></div>' +
      '<div class="stat-card"><div class="stat-title"><span>진단명 표현 사용 빈도</span><b>' + average(stats.frequency) + '<small> / 5</small></b></div>' +
      statBars(stats.frequency, five, true, ends) + '</div>' +
      '<div class="stat-card"><div class="stat-title"><span>전문의 진단 필요성 인식</span><b>' + average(stats.recognition) + '<small> / 5</small></b></div>' +
      statBars(stats.recognition, five, true, ends) + '</div>' +
      '<div class="stat-card"><div class="stat-title"><span>테스트 후 인식 변화</span></div>' +
      statBars(stats.change, ['계속 부적절', '이제 신중하게', '습관 지속 예상', '계속 문제없음', '잘 모르겠음'], false) + '</div>' +
      '<p class="stats-update">5초마다 최신 응답으로 자동 업데이트됩니다.</p>' +
      '</section>'
  }

  function likert(field, selected) {
    var btns = [1, 2, 3, 4, 5].map(function (v) {
      return '<button class="' + (selected === v ? 'selected' : '') + '" data-action="likert" data-field="' + field + '" data-value="' + v + '" aria-label="' + v + '점" aria-pressed="' + (selected === v) + '"' + (state.submitted ? ' disabled' : '') + '>' + v + '</button>'
    }).join('')
    return '<div class="likert-scale"><div class="likert-buttons">' + btns + '</div>' +
      '<div class="likert-labels"><span>전혀 그렇지 않다</span><span>매우 그렇다</span></div></div>'
  }

  function viewIntro() {
    return '<section class="intro enter">' +
      '<div class="tag">1분 · 5문항</div>' + cat() +
      '<div class="intro-copy"><p>온라인으로 알아보는 나의 일상</p>' +
      '<h1><em>ADHD</em><br />자가진단 테스트</h1>' +
      '<span>일상 속 내 모습을 떠올리며<br />솔직하게 답해 주세요.</span></div>' +
      '<button class="main-button" data-action="start">테스트 시작하기 <b>→</b></button>' +
      '</section>'
  }

  function viewQuiz() {
    var c = state.current
    var m = memes[c]
    return '<section class="quiz enter">' +
      '<div class="quiz-top"><b>질문 ' + (c + 1) + '</b><span>' + (c + 1) + ' / ' + questions.length + '</span></div>' +
      '<div class="progress"><i style="width:' + ((c + 1) / questions.length) * 100 + '%"></i></div>' +
      '<figure class="meme ' + m.cls + '"><img src="' + m.image + '" alt="' + esc(m.alt) + '" /></figure>' +
      '<div class="question"><span>Q' + (c + 1) + '.</span><h2>' + esc(questions[c]) + '</h2></div>' +
      '<div class="answers">' + choices.map(function (ch, i) {
        return '<button data-action="answer" data-value="' + i + '"><i>' + (i + 1) + '</i>' + esc(ch) + '<b>›</b></button>'
      }).join('') + '</div>' +
      '</section>'
  }

  function viewLoading() {
    return '<section class="loading enter">' +
      '<div class="loading-cat">' + cat('thinking') + '</div>' +
      '<div class="dots"><i></i><i></i><i></i></div>' +
      '<h2>눈사람이 답변을<br />살펴보고 있어요</h2>' +
      '<p>잠시만 기다려 주세요.</p>' +
      '</section>'
  }

  function viewResult() {
    var canSubmit = state.surveyFrequency !== null && state.surveyRecognition !== null && state.surveyChange !== null && !state.isSubmitting && !state.submitted
    return '<section class="result enter">' +
      '<div class="result-hero">' +
        '<span class="result-label">테스트 결과</span>' + cat('smile') +
        '<div class="result-badge">판정 불가</div>' +
        '<h1>이 질문 만으로는<br />ADHD임을 알 수 없어요.</h1>' +
        '<p class="consult-message">정확한 정보를 얻기 위해서는<br />전문가의 상담을 받아야합니다.</p>' +
        '<span class="scroll-note">아래에서 이유를 확인해 보세요 ↓</span>' +
      '</div>' +

      '<article class="info-card">' +
        '<span class="card-number">01</span>' +
        '<h2>익숙한 경험이<br />곧 진단은 아니에요.</h2>' +
        '<p>물건을 잃어버리거나 집중하기 어려운 순간은 누구에게나 있을 수 있어요. ' +
        'ADHD는 단순히 ‘산만한 상태’가 아니라 일상 전반에 지속적인 어려움을 일으키는' +
        '<strong> 신경발달장애</strong>예요.</p>' +
        '<div class="compare">' +
          '<div><span>일상의 순간</span><b>“오늘 집중이 안 돼.”</b></div>' +
          '<i>≠</i>' +
          '<div><span>의학적 진단</span><b>전문가의 종합 평가</b></div>' +
        '</div>' +
      '</article>' +

      '<article class="info-card language">' +
        '<span class="card-number">02</span>' +
        '<h2>진단명은 밈이나<br />유행어가 아니에요.</h2>' +
        '<div class="phrase wrong"><span>이 말 대신</span><del>“나 완전 ADHD야.”</del></div>' +
        '<div class="phrase right"><span>이렇게 말해봅시다</span><b>“요즘 집중하기가 어려워.”</b><b>“자꾸 잊어버려서 불편해.”</b></div>' +
      '</article>' +

      '<article class="official-link-card">' +
        '<div><span>공식 정보</span><h2>ADHD에 대해<br />정확히 알아보기</h2><p>국가정신건강정보포털의 공식 설명을 확인할 수 있어요.</p></div>' +
        '<a href="https://www.mentalhealth.go.kr/portal/disease/diseaseDetail.do?dissId=16" target="_blank" rel="noreferrer">공식 사이트 바로가기 <b>↗</b></a>' +
      '</article>' +

      '<article class="survey" id="survey">' +
        '<span class="survey-label">인식 설문</span>' +
        '<div class="survey-question"><h2>1. 평소 ‘나 완전 ADHD인가 봐’라는 말을 얼마나 자주 사용했나요?</h2>' + likert('surveyFrequency', state.surveyFrequency) + '</div>' +
        '<div class="survey-question"><h2>2. ADHD는 전문의의 진단이 필요한 신경발달장애라고 생각하나요?</h2>' + likert('surveyRecognition', state.surveyRecognition) + '</div>' +
        '<div class="survey-question"><h2>3. 이번 테스트에 참여한 후, 일상적인 실수나 집중력 저하를 ADHD라고 표현하는 것에 대한 생각이 어떻게 달라졌나요?</h2>' +
          '<div class="survey-options">' + changeOptions.map(function (item, i) {
            return '<button class="' + (state.surveyChange === i ? 'selected' : '') + '" data-action="change" data-value="' + i + '" aria-pressed="' + (state.surveyChange === i) + '"' + (state.submitted ? ' disabled' : '') + '><i>' + (i + 1) + '</i>' + esc(item) + '<b>✓</b></button>'
          }).join('') + '</div>' +
        '</div>' +
        '<div class="survey-question">' +
          '<label for="survey-comment">4. 이 테스트의 전후에서 ADHD에 대한 인식 변화가 있다면 적어주세요.</label>' +
          '<textarea id="survey-comment" placeholder="자유롭게 작성해 주세요." maxlength="1000" rows="5"' + (state.submitted ? ' disabled' : '') + '>' + esc(state.surveyComment) + '</textarea>' +
        '</div>' +
        '<button class="survey-submit" data-action="submit"' + (canSubmit ? '' : ' disabled') + '>' +
          (state.submitted ? '응답 완료' : state.isSubmitting ? '응답 저장 중…' : '응답 제출하고 통계 보기') +
        '</button>' +
        (state.submitError ? '<p class="survey-error" role="alert">' + esc(state.submitError) + '</p>' : '') +
        (state.submitted ? '<p class="survey-thanks">응답해 주셔서 감사합니다.</p>' : '') +
        (state.submitted && state.stats ? liveStats(state.stats) : '') +
      '</article>' +

      '<div class="share">' +
        '<span class="header-paw">' + paw + '</span>' +
        '<h2>진단명의 무게를 지키는 일,<br />함께 알리기</h2>' +
        '<button class="main-button" data-action="share">' + paw + ' ' + (state.copied ? '링크가 복사됐어요' : '친구에게 공유하기') + '</button>' +
        '<button class="retry" data-action="restart">처음부터 다시 하기</button>' +
      '</div>' +
      '</section>'
  }

  function render() {
    var s = state.screen
    var view = s + ':' + state.current
    var keepScroll = view === lastView ? window.scrollY : 0

    var showBack = !(s === 'intro' || s === 'loading')
    var body = s === 'intro' ? viewIntro() : s === 'quiz' ? viewQuiz() : s === 'loading' ? viewLoading() : viewResult()

    root.innerHTML =
      '<main class="site screen-' + s + '"><div class="phone">' +
        '<header><div class="header-inner">' +
          (showBack ? '<button class="ios-back" data-action="back" aria-label="이전 화면">‹</button>' : '<span class="nav-spacer"></span>') +
          '<strong>' + (s === 'result' ? '테스트 결과' : 'ADHD 자가진단 테스트') + '</strong>' +
          '<button class="header-paw feedback-open" data-action="feedback" aria-label="우리 팀에게 의견 보내기" title="우리 팀에게 의견 보내기">' + paw + '</button>' +
        '</div></header>' +
        body +
      '</div></main>'

    if (view === lastView) {
      // 같은 화면 안에서의 갱신(설문 선택 등)은 등장 애니메이션·스크롤 위치를 유지
      var sec = root.querySelector('.enter')
      if (sec) sec.classList.remove('enter')
    }
    window.scrollTo(0, keepScroll)
    lastView = view

    var ta = document.getElementById('survey-comment')
    if (ta) ta.addEventListener('input', function (e) { state.surveyComment = e.target.value })
  }

  function setScreen(s) {
    state.screen = s
    if (loadingTimer) { clearTimeout(loadingTimer); loadingTimer = null }
    if (s === 'loading') {
      loadingTimer = setTimeout(function () { setScreen('result') }, 1400)
    }
    syncStatsPolling()
    render()
  }

  function syncStatsPolling() {
    var should = state.screen === 'result' && state.submitted && !!ENDPOINT
    if (should && !statsTimer) {
      statsTimer = setInterval(refreshStats, 5000)
    } else if (!should && statsTimer) {
      clearInterval(statsTimer)
      statsTimer = null
    }
  }

  function refreshStats() {
    fetch(ENDPOINT, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (data) {
        if (data && typeof data.total === 'number') {
          state.stats = data
          render()
        }
      })
      .catch(function () { /* 일시적 오류 시 마지막 통계 유지 */ })
  }

  function submitSurvey() {
    if (state.surveyFrequency === null || state.surveyRecognition === null || state.surveyChange === null || state.isSubmitting || state.submitted) return
    state.isSubmitting = true
    state.submitError = ''
    render()

    if (!ENDPOINT) {
      // 저장 주소 미설정 시: 흐름만 진행 (응답 저장 안 됨)
      state.isSubmitting = false
      state.submitted = true
      render()
      return
    }

    fetch(ENDPOINT, {
      method: 'POST',
      // Apps Script 는 사전 요청(CORS preflight)을 받지 않으므로 text/plain 으로 전송
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        frequency: state.surveyFrequency,
        recognition: state.surveyRecognition,
        changeResponse: state.surveyChange + 1,
        comment: state.surveyComment.trim().slice(0, 1000),
      }),
    })
      .then(function (r) { return r.json() })
      .then(function (result) {
        if (result && result.error) {
          state.submitError = result.error
          return
        }
        state.stats = result
        state.submitted = true
      })
      .catch(function () {
        state.submitError = '네트워크 연결을 확인하고 다시 시도해 주세요.'
      })
      .then(function () {
        state.isSubmitting = false
        syncStatsPolling()
        render()
      })
  }

  function share() {
    var data = {
      title: '온라인 ADHD 테스트의 뜻밖의 결과',
      text: 'ADHD, 온라인 테스트만으로 알 수 있을까요? 진단명의 무게를 지키는 테스트에 함께해 주세요.',
      url: window.location.href,
    }
    var p
    if (navigator.share) p = navigator.share(data)
    else if (navigator.clipboard) {
      p = navigator.clipboard.writeText(data.text + ' ' + data.url).then(function () {
        state.copied = true
        render()
        setTimeout(function () { state.copied = false; render() }, 2000)
      })
    }
    if (p && p.catch) p.catch(function () { /* 공유 창 닫기는 정상 동작 */ })
  }

  function restart() {
    state.current = 0
    state.answers = []
    state.surveyFrequency = null
    state.surveyRecognition = null
    state.surveyChange = null
    state.surveyComment = ''
    state.submitted = false
    state.submitError = ''
    state.stats = null
    setScreen('intro')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    if (state.screen === 'quiz' && state.current > 0) {
      state.current -= 1
      render()
    } else {
      setScreen('intro')
    }
  }

  root.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]')
    if (!el || el.disabled) return
    var a = el.getAttribute('data-action')
    var v = Number(el.getAttribute('data-value'))
    if (a === 'start') setScreen('quiz')
    else if (a === 'answer') {
      state.answers[state.current] = v
      if (state.current === questions.length - 1) setScreen('loading')
      else { state.current += 1; render() }
    }
    else if (a === 'back') goBack()
    else if (a === 'likert') { state[el.getAttribute('data-field')] = v; render() }
    else if (a === 'change') { state.surveyChange = v; render() }
    else if (a === 'submit') submitSurvey()
    else if (a === 'share') share()
    else if (a === 'restart') restart()
    else if (a === 'feedback') openFeedback()
  })

  // ===== 팀 의견 보내기 (헤더 발바닥 버튼) =====
  var fb = document.createElement('div')
  fb.className = 'feedback-layer'
  fb.hidden = true
  fb.innerHTML =
    '<div class="feedback-backdrop" data-fb="close"></div>' +
    '<section class="feedback-sheet" role="dialog" aria-modal="true" aria-labelledby="feedback-title">' +
      '<button class="feedback-close" data-fb="close" aria-label="닫기">×</button>' +
      '<span class="header-paw">' + paw + '</span>' +
      '<h2 id="feedback-title">우리 프로젝트에<br />의견을 남겨주세요!</h2>' +
      '<p class="feedback-desc">테스트에 대한 생각, 아쉬운 점, 응원의 말 모두 좋아요. 익명으로 팀에게만 전달돼요.</p>' +
      '<textarea id="feedback-text" maxlength="1000" rows="6" placeholder="자유롭게 작성해 주세요."></textarea>' +
      '<div class="feedback-count"><span id="feedback-count">0</span> / 1000</div>' +
      '<button class="survey-submit" id="feedback-submit" data-fb="send" disabled>의견 보내기</button>' +
      '<p class="survey-error" id="feedback-error" role="alert" hidden></p>' +
      '<p class="survey-thanks" id="feedback-thanks" hidden>소중한 의견 감사합니다. 팀에게 잘 전달됐어요.</p>' +
    '</section>'
  document.body.appendChild(fb)

  var fbText = fb.querySelector('#feedback-text')
  var fbSend = fb.querySelector('#feedback-submit')
  var fbErr = fb.querySelector('#feedback-error')
  var fbThanks = fb.querySelector('#feedback-thanks')
  var fbBusy = false
  var lastFocus = null

  function openFeedback() {
    lastFocus = document.activeElement
    fb.hidden = false
    document.body.classList.add('feedback-open-body')
    if (!fbThanks.hidden) {
      fbThanks.hidden = true
      fbText.value = ''
      fb.querySelector('#feedback-count').textContent = '0'
      fbSend.textContent = '의견 보내기'
    }
    updateFbButton()
    setTimeout(function () { fbText.focus() }, 50)
  }

  function closeFeedback() {
    fb.hidden = true
    document.body.classList.remove('feedback-open-body')
    if (lastFocus && lastFocus.focus) lastFocus.focus()
  }

  function updateFbButton() {
    fbSend.disabled = fbBusy || !fbText.value.trim() || !fbThanks.hidden
  }

  fbText.addEventListener('input', function () {
    fb.querySelector('#feedback-count').textContent = fbText.value.length
    updateFbButton()
  })

  function sendFeedback() {
    var message = fbText.value.trim().slice(0, 1000)
    if (!message || fbBusy) return
    fbBusy = true
    fbErr.hidden = true
    fbSend.textContent = '보내는 중…'
    updateFbButton()

    var done = function (error) {
      fbBusy = false
      if (error) {
        fbErr.textContent = error
        fbErr.hidden = false
        fbSend.textContent = '의견 보내기'
      } else {
        fbThanks.hidden = false
        fbSend.textContent = '전송 완료'
      }
      updateFbButton()
    }

    if (!ENDPOINT) { done('의견 저장 주소가 설정되지 않았습니다.'); return }

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type: 'feedback', message: message, screen: state.screen }),
    })
      .then(function (r) { return r.json() })
      .then(function (res) { done(res && res.error ? res.error : null) })
      .catch(function () { done('네트워크 연결을 확인하고 다시 시도해 주세요.') })
  }

  fb.addEventListener('click', function (e) {
    var el = e.target.closest('[data-fb]')
    if (!el) return
    var a = el.getAttribute('data-fb')
    if (a === 'close') closeFeedback()
    else if (a === 'send' && !el.disabled) sendFeedback()
  })

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !fb.hidden) closeFeedback()
  })

  render()
})()
