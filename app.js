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
    '기타 (직접 작성)',
  ]
  var CHANGE_OTHER = changeOptions.length - 1 // 마지막 선택지 = 기타(직접 작성)

  var state = {
    screen: 'intro', // intro | quiz | loading | result | survey
    verdictShown: false, // 판정 연출은 처음 결과 화면에 들어올 때 한 번만
    current: 0,
    answers: [],
    surveyFrequency: null,
    surveyRecognition: null,
    surveyChange: null,
    surveyChangeOther: '',
    surveyComment: '',
    copied: false,
    submitted: false,
    isSubmitting: false,
    submitError: '',
    stats: null,
  }

  var root = document.getElementById('root')
  var lastView = ''
  var participants = 0
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
    var alt = '고깔모자를 쓴 마법사와 별 지팡이를 든 마법 고양이'
    if (mood === 'smile') {
      // 결과 화면: 마법봉을 따로 떼어 움직일 수 있게 겹쳐 그림
      return '<div class="cat cat-smile cat-stage" role="img" aria-label="' + alt + '">' +
        '<img src="assets/wizard-cat-base.png" width="340" height="350" alt="" />' +
        '<div class="wand"><img src="assets/wand.png" width="340" height="350" alt="" /><i class="wand-tip"></i></div>' +
        '</div>'
    }
    return '<img class="cat cat-' + (mood || 'curious') + '" src="assets/wizard-cat.png" width="340" height="350" alt="' + alt + '" />'
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
      statBars(stats.change, ['계속 부적절', '이제 신중하게', '습관 지속 예상', '계속 문제없음', '잘 모르겠음', '기타'], false) + '</div>' +
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
      '<div class="intro-art">' + cat() + '</div>' +
      '<div class="intro-side">' +
        '<div class="intro-copy"><p>온라인으로 알아보는 나의 일상</p>' +
        '<h1><em>ADHD</em><br />자가진단 테스트</h1>' +
        '<span>일상 속 내 모습을 떠올리며<br />솔직하게 답해 주세요.</span></div>' +
        '<button class="main-button" data-action="start">테스트 시작하기 <b>→</b></button>' +
      '</div>' +
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
      '<h2>고양이가 답변을<br />살펴보고 있어요</h2>' +
      '<p>잠시만 기다려 주세요.</p>' +
      '</section>'
  }

  function viewResult() {
    return '<section class="result' + (state.verdictShown ? '' : ' enter') + '">' +
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

      '<div class="next-step">' +
        '<span>잠깐만요!</span>' +
        '<h2>다른 사람들은<br />어떻게 생각할까요?</h2>' +
        '<p>1분짜리 설문에 답하면 다른 참여자들의 응답 통계를 볼 수 있어요.</p>' +
        '<button class="main-button" data-action="toSurvey">설문하고 통계 보기 <b>→</b></button>' +
        '<button class="retry" data-action="restart">처음부터 다시 하기</button>' +
      '</div>' +
      '</section>'
  }

  function surveyReady() {
    return state.surveyFrequency !== null && state.surveyRecognition !== null && state.surveyChange !== null &&
      (state.surveyChange !== CHANGE_OTHER || state.surveyChangeOther.trim() !== '')
  }

  function viewSurvey() {
    var canSubmit = surveyReady() && !state.isSubmitting && !state.submitted
    return '<section class="survey-page enter">' +
      '<article class="survey" id="survey">' +
        '<span class="survey-label">인식 설문</span>' +
        '<div class="survey-question"><h2>1. 평소 ‘나 완전 ADHD인가 봐’라는 말을 얼마나 자주 사용했나요?</h2>' + likert('surveyFrequency', state.surveyFrequency) + '</div>' +
        '<div class="survey-question"><h2>2. ADHD는 전문의의 진단이 필요한 신경발달장애라고 생각하나요?</h2>' + likert('surveyRecognition', state.surveyRecognition) + '</div>' +
        '<div class="survey-question"><h2>3. 이번 테스트에 참여한 후, 일상적인 실수나 집중력 저하를 ADHD라고 표현하는 것에 대한 생각이 어떻게 달라졌나요?</h2>' +
          '<div class="survey-options">' + changeOptions.map(function (item, i) {
            return '<button class="' + (state.surveyChange === i ? 'selected' : '') + '" data-action="change" data-value="' + i + '" aria-pressed="' + (state.surveyChange === i) + '"' + (state.submitted ? ' disabled' : '') + '><i>' + (i + 1) + '</i>' + esc(item) + '<b>✓</b></button>'
          }).join('') + '</div>' +
          (state.surveyChange === CHANGE_OTHER
            ? '<input id="survey-change-other" class="survey-other" type="text" maxlength="200" placeholder="생각을 직접 적어 주세요." value="' + esc(state.surveyChangeOther) + '"' + (state.submitted ? ' disabled' : '') + ' />'
            : '') +
        '</div>' +
        '<div class="survey-question">' +
          '<label for="survey-comment">4. 이 테스트의 전후에서 ADHD에 대한 인식 변화가 있다면 적어주세요.</label>' +
          '<textarea id="survey-comment" placeholder="적어주시면 저희 팀에게 큰 힘이 됩니다." maxlength="1000" rows="5"' + (state.submitted ? ' disabled' : '') + '>' + esc(state.surveyComment) + '</textarea>' +
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

  // 효과음: 파일 없이 Web Audio로 직접 합성 (저작권 걱정 없음)
  // 브라우저는 사용자가 누르기 전엔 소리를 막으므로, 첫 클릭 때 오디오를 깨워 둠
  var actx = null
  function audio() {
    if (!actx) {
      var AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      try { actx = new AC() } catch (e) { return null }
    }
    if (actx.state === 'suspended') actx.resume()
    return actx
  }
  document.addEventListener('pointerdown', function () { audio() }, { passive: true })
  function noiseBuf(ctx, sec) {
    var b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0)
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    return b
  }
  function env(ctx, g, t, peak, a, r) {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + r)
  }
  var SIREN_AT = 1560, SIREN_CYCLE = 900, SIREN_TIMES = 3
  var sfx = {
    swish: function (ctx, t) { // 숑: 바람 소리가 위로 쓸려 올라감
      var n = ctx.createBufferSource(); n.buffer = noiseBuf(ctx, .35)
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2
      f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(3800, t + .25)
      var g = ctx.createGain(); env(ctx, g, t, .5, .08, .22)
      n.connect(f); f.connect(g); g.connect(ctx.destination); n.start(t); n.stop(t + .35)
    },
    sparkle: function (ctx, t) { // 뾰로롱: 높은 음이 차르르 올라감
      [1568, 2093, 2637, 3136, 4186].forEach(function (hz, i) {
        var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz
        var g = ctx.createGain(); env(ctx, g, t + i * .055, .16, .01, .3)
        o.connect(g); g.connect(ctx.destination); o.start(t + i * .055); o.stop(t + i * .055 + .35)
      })
    },
    zap: function (ctx, t) { // 빔 발사: 피융
      var o = ctx.createOscillator(); o.type = 'sawtooth'
      o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(220, t + .4)
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400
      var g = ctx.createGain(); env(ctx, g, t, .12, .02, .38)
      o.connect(f); f.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + .45)
    },
    siren: function (ctx, t) { // 왜용왜용: 경고 사이렌 (경고 표시 깜빡임과 같은 박자)
      var o = ctx.createOscillator(); o.type = 'square'
      var cycle = SIREN_CYCLE / 1000, dur = cycle * SIREN_TIMES
      o.frequency.setValueAtTime(620, t)
      for (var k = 0; k < SIREN_TIMES; k++) {
        o.frequency.linearRampToValueAtTime(1250, t + k * cycle + cycle * .5)
        o.frequency.linearRampToValueAtTime(620, t + (k + 1) * cycle)
      }
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200
      var g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(.1, t + .04)
      g.gain.setValueAtTime(.1, t + dur - .15)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(f); f.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + .05)
    },
    stamp: function (ctx, t) { // 쾅: 묵직한 저음 + 탁 치는 소리
      var o = ctx.createOscillator(); o.type = 'sine'
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .35)
      var g = ctx.createGain(); env(ctx, g, t, .9, .005, .45)
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + .5)
      var n = ctx.createBufferSource(); n.buffer = noiseBuf(ctx, .2)
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400
      var g2 = ctx.createGain(); env(ctx, g2, t, .7, .003, .14)
      n.connect(f); f.connect(g2); g2.connect(ctx.destination); n.start(t); n.stop(t + .2)
    }
  }
  function play(name, delayMs) {
    var ctx = audio()
    if (!ctx || ctx.state !== 'running') return
    try { sfx[name](ctx, ctx.currentTime + delayMs / 1000) } catch (e) {}
  }

  // 화면 전체 뒤에서 노란 경고 표시가 사이렌 박자에 맞춰 3번 깜빡이고 사라짐
  function flashWarning() {
    var w = document.createElement('div')
    w.className = 'warning-flash'
    w.setAttribute('aria-hidden', 'true')
    w.innerHTML = '<svg viewBox="0 0 220 200"><path class="tri" d="M110 16 Q118 16 123 24 L204 166 Q210 180 194 182 L26 182 Q10 180 16 166 L97 24 Q102 16 110 16 Z"/>' +
      '<rect class="ex" x="101" y="64" width="18" height="76"/><rect class="ex" x="101" y="152" width="18" height="17"/></svg>'
    document.body.appendChild(w)
    if (!w.animate) { setTimeout(function () { w.remove() }, SIREN_AT + SIREN_CYCLE * SIREN_TIMES); return }
    var a = w.animate([
      { opacity: 0, transform: 'scale(.96)' },
      { opacity: 1, transform: 'scale(1.02)', offset: .18 },
      { opacity: .85, transform: 'scale(1)', offset: .45 },
      { opacity: 0, transform: 'scale(.98)' }
    ], { duration: SIREN_CYCLE, delay: SIREN_AT, iterations: SIREN_TIMES, easing: 'ease-out', fill: 'both' })
    a.onfinish = function () { w.remove() }
    // 다른 화면으로 넘어가면 바로 정리
    setTimeout(function () { if (w.parentNode) w.remove() }, SIREN_AT + SIREN_CYCLE * SIREN_TIMES + 500)
  }

  // 결과 화면 연출: 별 끝에서 뾰로롱 → 빨간 빛이 판정 불가 자리로 발사 → 쾅(진동)
  function playVerdictMagic() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    play('swish', 680); play('sparkle', 900); play('zap', 960); play('stamp', 1500); play('siren', SIREN_AT)
    flashWarning()
    setTimeout(function () {
      var tip = root.querySelector('.wand-tip'), badge = root.querySelector('.result-badge')
      if (!tip || !badge || !tip.animate) return
      var a = tip.getBoundingClientRect(), b = badge.getBoundingClientRect()
      var sx = a.left + window.scrollX, sy = a.top + window.scrollY
      var ex = b.left + b.width / 2 + window.scrollX, ey = b.top + b.height / 2 + window.scrollY
      var made = []
      function add(cls, css, html) {
        var el = document.createElement('div'); el.className = cls; el.style.cssText = css
        if (html) el.innerHTML = html
        document.body.appendChild(el); made.push(el); return el
      }
      // 뾰로롱: 별 주위로 작은 반짝이가 퍼짐
      for (var i = 0; i < 8; i++) {
        var ang = (Math.PI * 2 * i) / 8, d = 26 + (i % 2) * 14
        var sp = add('magic-spark', 'left:' + (sx - 8) + 'px;top:' + (sy - 8) + 'px;font-size:' + (i % 2 ? 12 : 17) + 'px', '✦')
        sp.animate([
          { transform: 'translate(0,0) scale(.3)', opacity: 0 },
          { transform: 'translate(' + Math.cos(ang) * d * .6 + 'px,' + Math.sin(ang) * d * .6 + 'px) scale(1.1)', opacity: 1, offset: .4 },
          { transform: 'translate(' + Math.cos(ang) * d + 'px,' + Math.sin(ang) * d + 'px) scale(.4) rotate(90deg)', opacity: 0 }
        ], { duration: 620, easing: 'ease-out', fill: 'forwards' })
      }
      // 빨간 빛줄기 + 빛 구슬 발사
      var dx = ex - sx, dy = ey - sy, len = Math.sqrt(dx * dx + dy * dy), deg = Math.atan2(dy, dx) * 180 / Math.PI
      var beam = add('magic-beam', 'left:' + sx + 'px;top:' + (sy - 3) + 'px;width:' + len + 'px;transform:rotate(' + deg + 'deg) scaleX(0)')
      beam.animate([
        { transform: 'rotate(' + deg + 'deg) scaleX(0)', opacity: 1 },
        { transform: 'rotate(' + deg + 'deg) scaleX(1)', opacity: 1, offset: .65 },
        { transform: 'rotate(' + deg + 'deg) scaleX(1)', opacity: 0 }
      ], { duration: 560, delay: 60, easing: 'ease-in', fill: 'forwards' })
      var orb = add('magic-orb', 'left:' + sx + 'px;top:' + sy + 'px')
      orb.animate([
        { transform: 'translate(0,0) scale(.6)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.6)', opacity: 1, offset: .85 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(3)', opacity: 0 }
      ], { duration: 460, delay: 60, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' })
      setTimeout(function () { made.forEach(function (el) { el.remove() }) }, 900)
    }, 900)
    // 쾅! 찍히는 순간 휴대폰 진동 (지원하는 기기만)
    if (navigator.vibrate) setTimeout(function () { try { navigator.vibrate([30, 20, 60]) } catch (e) {} }, 1560)
  }

  function render() {
    var s = state.screen
    var view = s + ':' + state.current
    var keepScroll = view === lastView ? window.scrollY : 0

    var showBack = !(s === 'intro' || s === 'loading')
    var body = s === 'intro' ? viewIntro() : s === 'quiz' ? viewQuiz() : s === 'loading' ? viewLoading() : s === 'survey' ? viewSurvey() : viewResult()

    root.innerHTML =
      '<main class="site screen-' + s + '"><div class="phone">' +
        '<header><div class="header-inner">' +
          (showBack ? '<button class="ios-back" data-action="back" aria-label="이전 화면">‹</button>' : '<span class="nav-spacer"></span>') +
          '<strong>' + (s === 'result' ? '테스트 결과' : s === 'survey' ? '인식 설문' : 'ADHD 자가진단 테스트') + '</strong>' +
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
    if (s === 'result' && view !== lastView && !state.verdictShown) { state.verdictShown = true; playVerdictMagic() }
    lastView = view

    var ta = document.getElementById('survey-comment')
    if (ta) ta.addEventListener('input', function (e) { state.surveyComment = e.target.value })
    var other = document.getElementById('survey-change-other')
    if (other) other.addEventListener('input', function (e) {
      // 다시 그리면 입력 중 포커스가 풀리므로 제출 버튼 상태만 직접 갱신
      state.surveyChangeOther = e.target.value
      var btn = root.querySelector('.survey-submit')
      if (btn && !state.submitted && !state.isSubmitting) btn.disabled = !surveyReady()
    })
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
    var should = state.screen === 'survey' && state.submitted && !!ENDPOINT
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
    if (!surveyReady() || state.isSubmitting || state.submitted) return
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
        changeOther: state.surveyChange === CHANGE_OTHER ? state.surveyChangeOther.trim().slice(0, 200) : '',
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
    state.surveyChangeOther = ''
    state.surveyComment = ''
    state.submitted = false
    state.submitError = ''
    state.stats = null
    state.verdictShown = false
    setScreen('intro')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    if (state.screen === 'quiz' && state.current > 0) {
      state.current -= 1
      render()
    } else if (state.screen === 'survey') {
      setScreen('result')
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
    else if (a === 'change') {
      state.surveyChange = v
      render()
      if (v === CHANGE_OTHER) { var o = document.getElementById('survey-change-other'); if (o && !o.value) o.focus() }
    }
    else if (a === 'submit') submitSurvey()
    else if (a === 'toSurvey') setScreen('survey')
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
      '<textarea id="feedback-text" maxlength="1000" rows="6" placeholder="적어주시면 저희 팀에게 큰 힘이 됩니다."></textarea>' +
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

  // 첫 화면 참여자 수 표시
  if (ENDPOINT) {
    fetch(ENDPOINT, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (d) {
        if (d && typeof d.total === 'number') {
          participants = d.total
          if (state.screen === 'intro') render()
        }
      })
      .catch(function () {})
  }
})()
