# 🚀 크롬 익스텐션 기반 암호화폐 자동매매 봇 - 구현 가이드

## 📋 개요

이 문서는 크롬 익스텐션 기반 암호화폐 자동매매 봇을 단계별로 구현하기 위한 완전한 가이드입니다. 각 Phase는 독립적으로 완료 가능하며, 실제 테스트를 통해 검증된 구현 방법을 제공합니다.

### 🎯 구현 전략
- **최소 기능으로 시작**: 핵심 기능만 구현하여 동작 확인
- **단계별 테스트**: 각 단계마다 실제로 테스트하며 진행
- **점진적 확장**: 기본 기능 완성 후 추가 기능 구현
- **안정성 우선**: 빠른 개발보다 안정적인 동작 우선

### ⏱️ 총 구현 시간: 약 20-30시간
- **Phase 1-4**: 기본 구조 (6시간)
- **Phase 5-7**: 핵심 기능 (12시간)
- **Phase 8-11**: 고급 기능 (8-12시간)

---

## 🎯 Phase 1: 기본 구조 설정 (2시간) ✅ 완료

### 📋 목표
최소한의 파일 구조와 manifest만으로 익스텐션 동작 확인

### 🛠️ 구현 단계

#### 1-1. 프로젝트 초기 설정 (30분)
```bash
# 프로젝트 폴더 생성
mkdir tradingbot_extension
cd tradingbot_extension

# 기본 폴더 구조 생성
mkdir popup background content utils docs
```

#### 1-2. Manifest 설정 (30분)
```json
{
  "manifest_version": 3,
  "name": "Crypto Trading Bot",
  "version": "1.0.0",
  "description": "Chrome Extension based Crypto Auto Trading Bot",
  
  "side_panel": {
    "default_path": "popup/popup.html"
  },
  
  "permissions": [
    "storage",
    "tabs",
    "scripting",
    "activeTab"
  ],
  
  "background": {
    "service_worker": "background/background.js"
  }
}
```

#### 1-3. 기본 HTML 구조 (30분)
```html
<!-- popup/popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Trading Bot</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>🤖 Trading Bot</h1>
    <p>Hello World!</p>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

#### 1-4. 테스트 및 검증 (30분)
- [ ] Chrome에 익스텐션 로드
- [ ] 사이드 패널이 정상적으로 열리는지 확인
- [ ] 콘솔 에러 없는지 확인

### ✅ 완료 조건
익스텐션 사이드 패널이 에러 없이 열림

### 🚨 문제 해결
**문제**: 사이드 패널이 열리지 않음
**해결**: manifest.json의 side_panel 경로 확인

---

## 🎯 Phase 2: 사이드 패널 UI 구현 (3시간) ✅ 완료

### 📋 목표
사용자가 볼 수 있는 기본 UI 구현

### 🛠️ 구현 단계

#### 2-1. HTML 구조 확장 (1시간)
```html
<div class="container">
  <header>
    <h1>🤖 Trading Bot</h1>
    <div class="status">대기 중</div>
  </header>
  
  <section class="exchange-section">
    <h3>거래소 선택</h3>
    <select id="exchangeSelect">
      <option value="gate">Gate.io</option>
      <option value="binance">Binance</option>
      <option value="upbit">Upbit</option>
    </select>
    <button id="goToExchange">이동</button>
  </section>
  
  <section class="control-section">
    <button id="startTrading" class="btn-primary">거래 시작</button>
    <button id="stopTrading" class="btn-secondary">거래 중단</button>
  </section>
</div>
```

#### 2-2. CSS 스타일링 (1시간)
```css
.container {
  width: 350px;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.btn-primary {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}

.btn-primary:hover {
  background: #45a049;
}
```

#### 2-3. 기본 JavaScript (1시간)
```javascript
// popup/popup.js
document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startTrading');
  const stopBtn = document.getElementById('stopTrading');
  const exchangeSelect = document.getElementById('exchangeSelect');
  const goToExchangeBtn = document.getElementById('goToExchange');
  
  startBtn.addEventListener('click', () => {
    console.log('거래 시작 클릭됨');
  });
  
  stopBtn.addEventListener('click', () => {
    console.log('거래 중단 클릭됨');
  });
  
  goToExchangeBtn.addEventListener('click', () => {
    const exchange = exchangeSelect.value;
    console.log(`${exchange} 거래소로 이동`);
  });
});
```

### ✅ 완료 조건
UI가 정상적으로 표시되고 버튼이 작동함

### 🚨 문제 해결
**문제**: 레이아웃이 깨짐
**해결**: CSS width 고정, overflow 처리

---

## 🎯 Phase 3: Chrome APIs 연동 (2시간) ✅ 완료

### 📋 목표
Chrome 확장 API 기본 사용법 익히기

### 🛠️ 구현 단계

#### 3-1. Storage API 구현 (30분)
```javascript
// 설정 저장
async function saveSettings(settings) {
  await chrome.storage.local.set(settings);
  console.log('설정 저장됨:', settings);
}

// 설정 로드
async function loadSettings() {
  const result = await chrome.storage.local.get(['exchange', 'interval']);
  console.log('설정 로드됨:', result);
  return result;
}
```

#### 3-2. Tabs API 구현 (30분)
```javascript
// 현재 탭 정보 가져오기
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  return tab;
}

// 새 탭 열기
async function openExchange(exchange) {
  const urls = {
    gate: 'https://www.gate.io/trade/BTC_USDT',
    binance: 'https://www.binance.com/en/trade/BTC_USDT',
    upbit: 'https://upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC'
  };
  
  await chrome.tabs.create({url: urls[exchange]});
}
```

#### 3-3. Messages API 구현 (30분)
```javascript
// popup.js - 메시지 전송
chrome.runtime.sendMessage({
  action: 'startTrading',
  data: { exchange: 'gate', interval: 1000 }
});

// background.js - 메시지 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startTrading') {
    console.log('거래 시작:', message.data);
    sendResponse({success: true});
  }
});
```

#### 3-4. 통합 테스트 (30분)
- [ ] 각 API가 정상 작동하는지 확인
- [ ] 콘솔에 올바른 값 출력되는지 확인
- [ ] 에러 처리 구현

### ✅ 완료 조건
Chrome APIs가 정상적으로 작동함

### 🚨 문제 해결
**문제**: Storage API 권한 오류
**해결**: manifest.json에 "storage" 권한 추가

---

## 🎯 Phase 4: Content Script 기본 (2시간) ✅ 완료

### 📋 목표
웹페이지에 스크립트 주입하여 DOM 조작

### 🛠️ 구현 단계

#### 4-1. Content Script 설정 (30분)
```json
// manifest.json에 추가
"content_scripts": [
  {
    "matches": ["https://*.gate.io/*", "https://*.binance.com/*"],
    "js": ["content/content.js"],
    "run_at": "document_end"
  }
]
```

#### 4-2. 거래소 페이지 감지 (45분)
```javascript
// content/content.js
class ExchangeDetector {
  static detect() {
    const url = window.location.href;
    
    if (url.includes('gate.io')) {
      return { name: 'gate', supported: true };
    } else if (url.includes('binance.com')) {
      return { name: 'binance', supported: true };
    } else if (url.includes('upbit.com')) {
      return { name: 'upbit', supported: true };
    }
    
    return { name: 'unknown', supported: false };
  }
}

const exchange = ExchangeDetector.detect();
console.log('감지된 거래소:', exchange);
```

#### 4-3. 기본 통신 구현 (45분)
```javascript
// Content → Background 통신
chrome.runtime.sendMessage({
  action: 'exchangeDetected',
  exchange: exchange
});

// Content → Popup 통신 (Storage 활용)
chrome.storage.local.set({
  currentExchange: exchange,
  lastUpdate: Date.now()
});
```

### ✅ 완료 조건
거래소 페이지에서 정상적으로 작동하며 통신 가능

### 🚨 문제 해결
**문제**: Content Script가 로드되지 않음
**해결**: matches 패턴 확인, 권한 설정 확인

---

## 🎯 Phase 5: 가격 정보 추출 (4시간) ✅ 완료

### 📋 목표
거래소 페이지에서 가격 정보 읽기

### 🛠️ 구현 단계

#### 5-1. 가격 추출기 구현 (2시간)
```javascript
class PriceExtractor {
  constructor() {
    this.assetsSelector = null;
    this.priceSelector = null;
  }
  
  // 사용자 요소 선택 모드
  enableElementSelection(type) {
    document.body.style.cursor = 'crosshair';
    
    const handleClick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      const element = event.target;
      const selector = this.generateSelector(element);
      
      if (type === 'assets') {
        this.assetsSelector = selector;
      } else if (type === 'price') {
        this.priceSelector = selector;
      }
      
      this.cleanup();
      this.saveSelectors();
    };
    
    document.addEventListener('click', handleClick, true);
  }
  
  // CSS 셀렉터 생성
  generateSelector(element) {
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }
      
      if (current.className) {
        selector += `.${current.className.split(' ').join('.')}`;
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }
  
  // 데이터 추출
  extractAssets() {
    if (!this.assetsSelector) return null;
    
    const element = document.querySelector(this.assetsSelector);
    if (!element) return null;
    
    const text = element.textContent.trim();
    const match = text.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : null;
  }
  
  extractPrice() {
    if (!this.priceSelector) return null;
    
    const element = document.querySelector(this.priceSelector);
    if (!element) return null;
    
    const text = element.textContent.trim();
    const match = text.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : null;
  }
}
```

#### 5-2. 실시간 업데이트 시스템 (1시간)
```javascript
class RealTimeUpdater {
  constructor() {
    this.extractor = new PriceExtractor();
    this.interval = null;
  }
  
  start(intervalMs = 1000) {
    this.interval = setInterval(() => {
      const assets = this.extractor.extractAssets();
      const price = this.extractor.extractPrice();
      
      if (assets !== null && price !== null) {
        const amount = this.calculateAmount(assets, price);
        
        // Popup으로 데이터 전송
        chrome.storage.local.set({
          currentAssets: assets,
          currentPrice: price,
          currentAmount: amount,
          lastUpdate: Date.now()
        });
      }
    }, intervalMs);
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  calculateAmount(assets, price) {
    // Assets × Leverage × Position% ÷ Price
    const leverage = 1; // 기본값
    const positionPercent = 0.1; // 10%
    
    return (assets * leverage * positionPercent) / price;
  }
}
```

#### 5-3. UI 연동 (1시간)
```javascript
// popup.js에서 실시간 데이터 표시
function updateDataDisplay() {
  chrome.storage.local.get(['currentAssets', 'currentPrice', 'currentAmount'], (result) => {
    if (result.currentAssets) {
      document.getElementById('assetsValue').textContent = result.currentAssets.toFixed(2);
    }
    if (result.currentPrice) {
      document.getElementById('priceValue').textContent = result.currentPrice.toFixed(2);
    }
    if (result.currentAmount) {
      document.getElementById('amountValue').textContent = result.currentAmount.toFixed(6);
    }
  });
}

// 1초마다 업데이트
setInterval(updateDataDisplay, 1000);
```

### ✅ 완료 조건
거래소 페이지에서 실제 데이터를 읽어서 팝업에 표시

### 🚨 문제 해결
**문제**: 셀렉터가 동작하지 않음
**해결**: Dynamic Script Injection 사용

---

## 🎯 Phase 6: 매크로 녹화 시스템 (4시간) ✅ 완료

### 📋 목표
사용자가 버튼 위치를 지정하는 시스템

### 🛠️ 구현 단계

#### 6-1. 녹화 모드 구현 (1시간)
```javascript
class MacroRecorder {
  constructor() {
    this.isRecording = false;
    this.recordedActions = [];
    this.currentMacroType = null; // 'long' or 'short'
  }
  
  startRecording(type) {
    this.isRecording = true;
    this.currentMacroType = type;
    this.recordedActions = [];
    
    // 시각적 피드백
    document.body.style.border = '3px solid red';
    document.body.style.cursor = 'crosshair';
    
    // 이벤트 리스너 등록
    document.addEventListener('click', this.handleClick.bind(this), true);
    document.addEventListener('keydown', this.handleKeydown.bind(this), true);
    
    console.log(`${type} 매크로 녹화 시작`);
  }
  
  stopRecording() {
    this.isRecording = false;
    
    // 시각적 피드백 제거
    document.body.style.border = '';
    document.body.style.cursor = '';
    
    // 이벤트 리스너 제거
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeydown, true);
    
    // 매크로 저장
    this.saveMacro();
    
    console.log(`${this.currentMacroType} 매크로 녹화 완료`);
  }
  
  handleClick(event) {
    if (!this.isRecording) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const element = event.target;
    const action = this.analyzeClickAction(element);
    
    this.recordedActions.push(action);
    console.log('액션 기록됨:', action);
  }
  
  handleKeydown(event) {
    if (!this.isRecording) return;
    
    if (event.key === 'Escape') {
      this.stopRecording();
    }
  }
}
```

#### 6-2. 하이브리드 요소 선택 시스템 (2시간)
```javascript
analyzeClickAction(element) {
  const rect = element.getBoundingClientRect();
  const text = element.textContent.trim().toLowerCase();
  
  // 액션 타입 분석
  let actionType = 'CLICK';
  if (text.includes('long') || text.includes('buy')) {
    actionType = 'LONG_BUTTON';
  } else if (text.includes('short') || text.includes('sell')) {
    actionType = 'SHORT_BUTTON';
  } else if (element.tagName === 'INPUT') {
    actionType = 'INPUT_FIELD';
  } else if (text.includes('open') || text.includes('close')) {
    actionType = 'TAB_BUTTON';
  }
  
  return {
    type: actionType,
    selector: this.generateSmartSelector(element),
    keywords: this.extractKeywords(element),
    position: {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    },
    text: text,
    timestamp: Date.now()
  };
}

generateSmartSelector(element) {
  // Long/Short 버튼 구분을 위한 스마트 셀렉터
  const path = [];
  let current = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    }
    
    if (current.className) {
      const classes = current.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        selector += `.${classes.join('.')}`;
      }
    }
    
    // nth-child 추가 (같은 클래스 버튼 구분용)
    const siblings = Array.from(current.parentElement?.children || []);
    const index = siblings.indexOf(current);
    if (index > 0) {
      selector += `:nth-child(${index + 1})`;
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  return path.join(' > ');
}
```

#### 6-3. 매크로 저장 및 최적화 (1시간)
```javascript
async saveMacro() {
  const macroKey = `${this.currentMacroType}Macro`;
  
  // 매크로 최적화
  const optimizedActions = this.optimizeActions(this.recordedActions);
  
  await chrome.storage.local.set({
    [macroKey]: optimizedActions
  });
  
  console.log(`${this.currentMacroType} 매크로 저장됨:`, optimizedActions);
}

optimizeActions(actions) {
  return actions.map(action => {
    // Amount 입력 필드는 자동 계산값으로 대체
    if (action.type === 'INPUT_FIELD') {
      action.useCalculatedAmount = true;
    }
    
    return action;
  });
}
```

### ✅ 완료 조건
매크로를 녹화하고 저장할 수 있음

### 🚨 문제 해결
**문제**: Long/Short 버튼 구분 실패
**해결**: nth-child 셀렉터 추가, 키워드 분석 강화

---

## 🎯 Phase 7: 매크로 실행 (4시간) ✅ 완료

### 📋 목표
녹화한 매크로 실행

### 🛠️ 구현 단계

#### 7-1. 하이브리드 매크로 실행기 (2시간)
```javascript
class MacroExecutor {
  constructor() {
    this.detector = new TradingElementDetector();
  }
  
  async executeMacro(type) {
    const macroKey = `${type}Macro`;
    const result = await chrome.storage.local.get([macroKey]);
    const macro = result[macroKey];
    
    if (!macro || macro.length === 0) {
      throw new Error(`${type} 매크로가 없습니다.`);
    }
    
    console.log(`${type} 매크로 실행 시작:`, macro);
    
    for (let i = 0; i < macro.length; i++) {
      const action = macro[i];
      await this.executeAction(action);
      await this.delay(500); // 액션 간 지연
    }
    
    console.log(`${type} 매크로 실행 완료`);
  }
  
  async executeAction(action) {
    let element = null;
    
    // 1차: 셀렉터로 요소 찾기
    try {
      element = document.querySelector(action.selector);
      if (element && this.validateElement(element, action)) {
        console.log('셀렉터로 요소 찾음:', action.selector);
      } else {
        element = null;
      }
    } catch (e) {
      console.warn('셀렉터 실패:', e.message);
    }
    
    // 2차: 스마트 탐지로 요소 찾기
    if (!element) {
      element = this.detector.findElement(action);
      if (element) {
        console.log('스마트 탐지로 요소 찾음:', action.type);
      }
    }
    
    if (!element) {
      throw new Error(`요소를 찾을 수 없습니다: ${action.type}`);
    }
    
    // 액션 실행
    await this.performAction(element, action);
  }
  
  validateElement(element, action) {
    // 텍스트 검증
    const elementText = element.textContent.trim().toLowerCase();
    const expectedKeywords = action.keywords || [];
    
    if (expectedKeywords.length > 0) {
      const hasKeyword = expectedKeywords.some(keyword => 
        elementText.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        console.warn('텍스트 불일치:', elementText, 'vs', expectedKeywords);
        return false;
      }
    }
    
    return true;
  }
  
  async performAction(element, action) {
    switch (action.type) {
      case 'LONG_BUTTON':
      case 'SHORT_BUTTON':
      case 'TAB_BUTTON':
        element.click();
        break;
        
      case 'INPUT_FIELD':
        if (action.useCalculatedAmount) {
          const amount = await this.getCalculatedAmount();
          this.setInputValue(element, amount.toString());
        }
        break;
        
      default:
        element.click();
    }
  }
}
```

#### 7-2. 스마트 요소 탐지 시스템 (1.5시간)
```javascript
class TradingElementDetector {
  constructor() {
    this.cache = new Map();
  }
  
  findElement(action) {
    const cacheKey = `${action.type}_${action.keywords?.join('_')}`;
    
    // 캐시 확인
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (document.contains(cached)) {
        return cached;
      }
      this.cache.delete(cacheKey);
    }
    
    let element = null;
    
    switch (action.type) {
      case 'LONG_BUTTON':
        element = this.findTradingButton(['long', 'buy', '매수']);
        break;
        
      case 'SHORT_BUTTON':
        element = this.findTradingButton(['short', 'sell', '매도']);
        break;
        
      case 'TAB_BUTTON':
        element = this.findTabButton(action.keywords);
        break;
        
      case 'INPUT_FIELD':
        element = this.findAmountInput();
        break;
    }
    
    if (element) {
      this.cache.set(cacheKey, element);
    }
    
    return element;
  }
  
  findTradingButton(keywords) {
    // 거래 영역에서만 탐색 (성능 최적화)
    const tradingArea = this.findTradingArea();
    const searchArea = tradingArea || document;
    
    const buttons = searchArea.querySelectorAll('button, div[role="button"], span[role="button"]');
    
    for (const button of buttons) {
      const text = button.textContent.trim().toLowerCase();
      
      // 정확한 매칭 우선
      for (const keyword of keywords) {
        if (text === keyword.toLowerCase()) {
          return button;
        }
      }
      
      // 포함 매칭
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          return button;
        }
      }
    }
    
    return null;
  }
  
  findTradingArea() {
    // 거래 영역을 찾는 휴리스틱
    const selectors = [
      '[class*="trading"]',
      '[class*="order"]',
      '[class*="trade-panel"]',
      '[id*="trading"]',
      '[id*="order"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    
    return null;
  }
}
```

#### 7-3. Manual Trading 시스템 (30분)
```javascript
// popup.js에서 수동 거래 버튼
document.getElementById('manualLong').addEventListener('click', async () => {
  try {
    await chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: () => {
          if (window.macroExecutor) {
            window.macroExecutor.executeMacro('long');
          }
        }
      });
    });
  } catch (error) {
    console.error('Long 매크로 실행 실패:', error);
  }
});
```

### ✅ 완료 조건
녹화한 매크로를 정상적으로 실행함

### 🚨 문제 해결
**문제**: Long/Short 버튼 구분 실패
**해결**: 텍스트 검증 + 스마트 탐지 조합

---

## 🎯 Phase 8: 기술적 지표 계산 (6시간)

### 📋 목표
볼린저 밴드 등 기술적 지표 계산 및 신호 생성

### 🛠️ 구현 단계

#### 8-1. 기본 함수 구현 (2시간)
```javascript
// utils/indicators.js
class TechnicalIndicators {
  constructor() {
    this.priceHistory = [];
    this.maxHistory = 100; // 최대 100개 데이터 보관
  }
  
  // 가격 데이터 추가
  addPrice(price, timestamp = Date.now()) {
    this.priceHistory.push({ price, timestamp });
    
    // 최대 개수 초과 시 오래된 데이터 제거
    if (this.priceHistory.length > this.maxHistory) {
      this.priceHistory.shift();
    }
  }
  
  // 단순 이동평균 (SMA) 계산
  calculateSMA(period = 20) {
    if (this.priceHistory.length < period) {
      return null;
    }
    
    const recentPrices = this.priceHistory.slice(-period);
    const sum = recentPrices.reduce((acc, item) => acc + item.price, 0);
    return sum / period;
  }
  
  // 표준편차 계산
  calculateStandardDeviation(period = 20) {
    if (this.priceHistory.length < period) {
      return null;
    }
    
    const sma = this.calculateSMA(period);
    const recentPrices = this.priceHistory.slice(-period);
    
    const squaredDifferences = recentPrices.map(item => 
      Math.pow(item.price - sma, 2)
    );
    
    const variance = squaredDifferences.reduce((acc, val) => acc + val, 0) / period;
    return Math.sqrt(variance);
  }
  
  // 볼린저 밴드 계산
  calculateBollingerBands(period = 20, multiplier = 2) {
    const sma = this.calculateSMA(period);
    const stdDev = this.calculateStandardDeviation(period);
    
    if (!sma || !stdDev) {
      return null;
    }
    
    return {
      upper: sma + (stdDev * multiplier),
      middle: sma,
      lower: sma - (stdDev * multiplier),
      currentPrice: this.getCurrentPrice()
    };
  }
  
  getCurrentPrice() {
    return this.priceHistory.length > 0 
      ? this.priceHistory[this.priceHistory.length - 1].price 
      : null;
  }
}
```

#### 8-2. 신호 생성 시스템 (2시간)
```javascript
class TradingSignals {
  constructor() {
    this.indicators = new TechnicalIndicators();
    this.lastSignal = null;
    this.signalCooldown = 60000; // 1분 쿨다운
  }
  
  // 볼린저 밴드 신호 생성
  generateBollingerSignal() {
    const bb = this.indicators.calculateBollingerBands();
    if (!bb) return null;
    
    const { upper, lower, currentPrice } = bb;
    let signal = null;
    
    // 매수 신호: 가격이 하단선 아래로
    if (currentPrice < lower) {
      signal = {
        type: 'BUY',
        reason: 'Price below Bollinger Lower Band',
        price: currentPrice,
        confidence: this.calculateConfidence(currentPrice, lower, 'below'),
        timestamp: Date.now()
      };
    }
    
    // 매도 신호: 가격이 중앙선 위로 (또는 상단선 근처)
    else if (currentPrice > bb.middle) {
      signal = {
        type: 'SELL',
        reason: 'Price above Bollinger Middle Band',
        price: currentPrice,
        confidence: this.calculateConfidence(currentPrice, bb.middle, 'above'),
        timestamp: Date.now()
      };
    }
    
    // 쿨다운 체크
    if (signal && this.isSignalValid(signal)) {
      this.lastSignal = signal;
      return signal;
    }
    
    return null;
  }
  
  calculateConfidence(currentPrice, referencePrice, direction) {
    const difference = Math.abs(currentPrice - referencePrice);
    const percentage = (difference / referencePrice) * 100;
    
    // 차이가 클수록 신뢰도 높음 (최대 95%)
    return Math.min(95, 50 + (percentage * 10));
  }
  
  isSignalValid(signal) {
    if (!this.lastSignal) return true;
    
    // 쿨다운 체크
    const timeDiff = signal.timestamp - this.lastSignal.timestamp;
    if (timeDiff < this.signalCooldown) return false;
    
    // 같은 타입 신호 연속 방지
    if (signal.type === this.lastSignal.type) return false;
    
    return true;
  }
}
```

#### 8-3. 실시간 모니터링 시스템 (1.5시간)
```javascript
class AutoTradingEngine {
  constructor() {
    this.signals = new TradingSignals();
    this.isRunning = false;
    this.monitoringInterval = null;
    this.priceUpdateInterval = null;
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('자동매매 엔진 시작');
    
    // 가격 데이터 수집 (3초마다)
    this.priceUpdateInterval = setInterval(() => {
      this.updatePriceData();
    }, 3000);
    
    // 신호 모니터링 (10초마다)
    this.monitoringInterval = setInterval(() => {
      this.checkSignals();
    }, 10000);
  }
  
  stop() {
    this.isRunning = false;
    
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('자동매매 엔진 중단');
  }
  
  async updatePriceData() {
    try {
      // 현재 가격 가져오기 (기존 PriceExtractor 활용)
      const result = await chrome.storage.local.get(['currentPrice']);
      if (result.currentPrice) {
        this.signals.indicators.addPrice(result.currentPrice);
        console.log('가격 데이터 업데이트:', result.currentPrice);
      }
    } catch (error) {
      console.error('가격 데이터 업데이트 실패:', error);
    }
  }
  
  async checkSignals() {
    try {
      const signal = this.signals.generateBollingerSignal();
      
      if (signal) {
        console.log('거래 신호 생성:', signal);
        await this.executeSignal(signal);
      }
    } catch (error) {
      console.error('신호 체크 실패:', error);
    }
  }
  
  async executeSignal(signal) {
    try {
      const macroType = signal.type === 'BUY' ? 'long' : 'short';
      
      // 매크로 실행 (기존 MacroExecutor 활용)
      if (window.macroExecutor) {
        await window.macroExecutor.executeMacro(macroType);
        
        // 실행 결과 저장
        await chrome.storage.local.set({
          lastTrade: {
            signal: signal,
            executedAt: Date.now(),
            success: true
          }
        });
        
        console.log(`${signal.type} 신호 실행 완료`);
      }
    } catch (error) {
      console.error('신호 실행 실패:', error);
      
      // 실패 기록
      await chrome.storage.local.set({
        lastTrade: {
          signal: signal,
          executedAt: Date.now(),
          success: false,
          error: error.message
        }
      });
    }
  }
}
```

#### 8-4. UI 연동 및 표시 (30분)
```javascript
// popup.js에 지표 표시 추가
function updateIndicatorDisplay() {
  chrome.storage.local.get(['currentPrice'], (result) => {
    if (result.currentPrice && window.indicators) {
      window.indicators.addPrice(result.currentPrice);
      
      const bb = window.indicators.calculateBollingerBands();
      if (bb) {
        document.getElementById('bbUpper').textContent = bb.upper.toFixed(2);
        document.getElementById('bbMiddle').textContent = bb.middle.toFixed(2);
        document.getElementById('bbLower').textContent = bb.lower.toFixed(2);
        
        // 신호 표시
        const signal = window.tradingSignals.generateBollingerSignal();
        if (signal) {
          document.getElementById('currentSignal').textContent = 
            `${signal.type} (${signal.confidence.toFixed(1)}%)`;
        }
      }
    }
  });
}

// 자동매매 시작/중단 버튼
document.getElementById('startAutoTrading').addEventListener('click', () => {
  if (window.autoTradingEngine) {
    window.autoTradingEngine.start();
    document.getElementById('autoTradingStatus').textContent = '실행 중';
  }
});

document.getElementById('stopAutoTrading').addEventListener('click', () => {
  if (window.autoTradingEngine) {
    window.autoTradingEngine.stop();
    document.getElementById('autoTradingStatus').textContent = '중단됨';
  }
});
```

### ✅ 완료 조건
- [ ] 볼린저 밴드 계산이 정확함
- [ ] 매수/매도 신호가 올바르게 생성됨
- [ ] 실시간 모니터링이 정상 작동함
- [ ] UI에 지표 정보가 표시됨

### 🚨 문제 해결
**문제**: 가격 데이터 부족으로 지표 계산 불가
**해결**: 최소 데이터 요구사항 체크, 초기 데이터 수집 기간 설정

**문제**: 신호 생성 과다
**해결**: 쿨다운 시스템, 신뢰도 필터링 적용

---

## 🎯 Phase 9: 자동매매 로직 (4시간)

### 📋 목표
신호에 따라 완전 자동으로 매매 실행

### 🛠️ 구현 단계

#### 9-1. 포지션 관리 시스템 (1.5시간)
```javascript
class PositionManager {
  constructor() {
    this.currentPosition = null; // null, 'long', 'short'
    this.positionSize = 0;
    this.entryPrice = 0;
    this.entryTime = null;
  }
  
  async openPosition(type, price, size) {
    if (this.currentPosition) {
      console.warn('이미 포지션이 열려있습니다:', this.currentPosition);
      return false;
    }
    
    this.currentPosition = type;
    this.positionSize = size;
    this.entryPrice = price;
    this.entryTime = Date.now();
    
    await this.savePosition();
    console.log(`${type} 포지션 오픈:`, { price, size });
    return true;
  }
  
  async closePosition(price) {
    if (!this.currentPosition) {
      console.warn('닫을 포지션이 없습니다');
      return false;
    }
    
    const pnl = this.calculatePnL(price);
    const holdingTime = Date.now() - this.entryTime;
    
    // 거래 내역 저장
    await this.saveTrade({
      type: this.currentPosition,
      entryPrice: this.entryPrice,
      exitPrice: price,
      size: this.positionSize,
      pnl: pnl,
      holdingTime: holdingTime,
      timestamp: Date.now()
    });
    
    console.log(`${this.currentPosition} 포지션 클로즈:`, { 
      entryPrice: this.entryPrice, 
      exitPrice: price, 
      pnl: pnl 
    });
    
    // 포지션 초기화
    this.currentPosition = null;
    this.positionSize = 0;
    this.entryPrice = 0;
    this.entryTime = null;
    
    await this.savePosition();
    return true;
  }
  
  calculatePnL(currentPrice) {
    if (!this.currentPosition) return 0;
    
    const priceDiff = this.currentPosition === 'long' 
      ? currentPrice - this.entryPrice 
      : this.entryPrice - currentPrice;
      
    return (priceDiff / this.entryPrice) * 100; // 수익률 %
  }
  
  async savePosition() {
    await chrome.storage.local.set({
      currentPosition: {
        type: this.currentPosition,
        size: this.positionSize,
        entryPrice: this.entryPrice,
        entryTime: this.entryTime
      }
    });
  }
  
  async saveTrade(trade) {
    const result = await chrome.storage.local.get(['tradeHistory']);
    const history = result.tradeHistory || [];
    
    history.push(trade);
    
    // 최대 100개 거래 내역 보관
    if (history.length > 100) {
      history.shift();
    }
    
    await chrome.storage.local.set({ tradeHistory: history });
  }
}
```

#### 9-2. 리스크 관리 시스템 (1.5시간)
```javascript
class RiskManager {
  constructor() {
    this.maxLossPercent = 5; // 최대 5% 손실
    this.maxTradesPerHour = 10; // 시간당 최대 10회 거래
    this.minTradingInterval = 30000; // 최소 30초 간격
    this.lastTradeTime = 0;
    this.hourlyTradeCount = 0;
    this.hourlyTradeReset = Date.now();
  }
  
  canTrade() {
    const now = Date.now();
    
    // 시간당 거래 횟수 리셋
    if (now - this.hourlyTradeReset > 3600000) { // 1시간
      this.hourlyTradeCount = 0;
      this.hourlyTradeReset = now;
    }
    
    // 거래 간격 체크
    if (now - this.lastTradeTime < this.minTradingInterval) {
      console.log('거래 간격 부족');
      return false;
    }
    
    // 시간당 거래 횟수 체크
    if (this.hourlyTradeCount >= this.maxTradesPerHour) {
      console.log('시간당 최대 거래 횟수 초과');
      return false;
    }
    
    return true;
  }
  
  shouldStopLoss(currentPnL) {
    return currentPnL <= -this.maxLossPercent;
  }
  
  recordTrade() {
    this.lastTradeTime = Date.now();
    this.hourlyTradeCount++;
  }
  
  async checkStopLoss(positionManager, currentPrice) {
    if (!positionManager.currentPosition) return false;
    
    const pnl = positionManager.calculatePnL(currentPrice);
    
    if (this.shouldStopLoss(pnl)) {
      console.log(`손절 실행: ${pnl.toFixed(2)}%`);
      
      // 반대 매크로 실행 (포지션 청산)
      const closeMacroType = positionManager.currentPosition === 'long' ? 'short' : 'long';
      
      if (window.macroExecutor) {
        await window.macroExecutor.executeMacro(closeMacroType);
        await positionManager.closePosition(currentPrice);
        this.recordTrade();
        return true;
      }
    }
    
    return false;
  }
}
```

#### 9-3. 완전 자동매매 엔진 (1시간)
```javascript
class FullAutoTradingEngine extends AutoTradingEngine {
  constructor() {
    super();
    this.positionManager = new PositionManager();
    this.riskManager = new RiskManager();
  }
  
  async checkSignals() {
    try {
      // 현재 가격 가져오기
      const result = await chrome.storage.local.get(['currentPrice']);
      const currentPrice = result.currentPrice;
      
      if (!currentPrice) return;
      
      // 손절 체크 (최우선)
      const stopLossExecuted = await this.riskManager.checkStopLoss(
        this.positionManager, 
        currentPrice
      );
      
      if (stopLossExecuted) return;
      
      // 거래 가능 여부 체크
      if (!this.riskManager.canTrade()) return;
      
      // 신호 생성
      const signal = this.signals.generateBollingerSignal();
      if (!signal) return;
      
      console.log('거래 신호 감지:', signal);
      
      // 포지션 상태에 따른 처리
      if (this.positionManager.currentPosition) {
        await this.handlePositionClose(signal, currentPrice);
      } else {
        await this.handlePositionOpen(signal, currentPrice);
      }
      
    } catch (error) {
      console.error('자동매매 체크 실패:', error);
    }
  }
  
  async handlePositionOpen(signal, currentPrice) {
    const positionType = signal.type === 'BUY' ? 'long' : 'short';
    
    // 신뢰도 체크
    if (signal.confidence < 70) {
      console.log('신뢰도 부족으로 거래 스킵:', signal.confidence);
      return;
    }
    
    try {
      // 매크로 실행
      const macroType = signal.type === 'BUY' ? 'long' : 'short';
      
      if (window.macroExecutor) {
        await window.macroExecutor.executeMacro(macroType);
        
        // 포지션 기록
        const result = await chrome.storage.local.get(['currentAmount']);
        const positionSize = result.currentAmount || 0;
        
        await this.positionManager.openPosition(positionType, currentPrice, positionSize);
        this.riskManager.recordTrade();
        
        console.log(`${positionType} 포지션 오픈 완료`);
      }
    } catch (error) {
      console.error('포지션 오픈 실패:', error);
    }
  }
  
  async handlePositionClose(signal, currentPrice) {
    const currentPos = this.positionManager.currentPosition;
    
    // 반대 신호인 경우에만 포지션 청산
    const shouldClose = (currentPos === 'long' && signal.type === 'SELL') ||
                       (currentPos === 'short' && signal.type === 'BUY');
    
    if (!shouldClose) return;
    
    try {
      // 청산 매크로 실행
      const closeMacroType = currentPos === 'long' ? 'short' : 'long';
      
      if (window.macroExecutor) {
        await window.macroExecutor.executeMacro(closeMacroType);
        await this.positionManager.closePosition(currentPrice);
        this.riskManager.recordTrade();
        
        console.log(`${currentPos} 포지션 청산 완료`);
      }
    } catch (error) {
      console.error('포지션 청산 실패:', error);
    }
  }
}
```

### ✅ 완료 조건
- [ ] 신호에 따라 자동으로 포지션 오픈/클로즈
- [ ] 손절 시스템이 정상 작동
- [ ] 거래 내역이 정확히 기록됨
- [ ] 리스크 관리 규칙이 적용됨

### 🚨 문제 해결
**문제**: 과도한 거래 발생
**해결**: 거래 간격 제한, 시간당 거래 횟수 제한

**문제**: 손절이 작동하지 않음
**해결**: 실시간 PnL 계산, 우선순위 체크 로직

---

## 🎯 Phase 10: 사용자 인터페이스 완성 (3시간)

### 📋 목표
모든 기능을 사용할 수 있는 완성된 UI

### 🛠️ 구현 단계

#### 10-1. 통계 대시보드 (1.5시간)
```html
<!-- popup.html에 통계 섹션 추가 -->
<section class="stats-section">
  <h3>📊 거래 통계</h3>
  
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">총 거래</div>
      <div class="stat-value" id="totalTrades">0</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-label">승률</div>
      <div class="stat-value" id="winRate">0%</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-label">총 수익률</div>
      <div class="stat-value" id="totalPnL">0%</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-label">현재 포지션</div>
      <div class="stat-value" id="currentPosition">없음</div>
    </div>
  </div>
  
  <div class="recent-trades">
    <h4>최근 거래</h4>
    <div id="tradeList"></div>
  </div>
</section>
```

```javascript
// 통계 업데이트 함수
async function updateStats() {
  const result = await chrome.storage.local.get(['tradeHistory', 'currentPosition']);
  const trades = result.tradeHistory || [];
  const position = result.currentPosition;
  
  // 기본 통계
  document.getElementById('totalTrades').textContent = trades.length;
  
  // 승률 계산
  const winningTrades = trades.filter(trade => trade.pnl > 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length * 100).toFixed(1) : 0;
  document.getElementById('winRate').textContent = `${winRate}%`;
  
  // 총 수익률
  const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  document.getElementById('totalPnL').textContent = `${totalPnL.toFixed(2)}%`;
  
  // 현재 포지션
  const positionText = position?.type ? 
    `${position.type.toUpperCase()} (${position.entryPrice})` : '없음';
  document.getElementById('currentPosition').textContent = positionText;
  
  // 최근 거래 목록
  updateRecentTrades(trades.slice(-5));
}

function updateRecentTrades(recentTrades) {
  const tradeList = document.getElementById('tradeList');
  tradeList.innerHTML = '';
  
  recentTrades.reverse().forEach(trade => {
    const tradeElement = document.createElement('div');
    tradeElement.className = `trade-item ${trade.pnl > 0 ? 'profit' : 'loss'}`;
    tradeElement.innerHTML = `
      <span class="trade-type">${trade.type.toUpperCase()}</span>
      <span class="trade-pnl">${trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(2)}%</span>
      <span class="trade-time">${new Date(trade.timestamp).toLocaleTimeString()}</span>
    `;
    tradeList.appendChild(tradeElement);
  });
}
```

#### 10-2. 설정 페이지 (1시간)
```html
<!-- options/options.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Trading Bot Settings</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div class="container">
    <h1>🤖 Trading Bot 설정</h1>
    
    <section class="settings-section">
      <h3>거래 설정</h3>
      
      <div class="setting-item">
        <label for="leverage">레버리지</label>
        <input type="number" id="leverage" min="1" max="100" value="1">
      </div>
      
      <div class="setting-item">
        <label for="positionPercent">포지션 크기 (%)</label>
        <input type="number" id="positionPercent" min="1" max="100" value="10">
      </div>
      
      <div class="setting-item">
        <label for="maxLoss">최대 손실 (%)</label>
        <input type="number" id="maxLoss" min="1" max="20" value="5">
      </div>
      
      <div class="setting-item">
        <label for="tradingMode">거래 모드</label>
        <select id="tradingMode">
          <option value="oneWay">One-Way</option>
          <option value="hedge">Hedge</option>
        </select>
      </div>
    </section>
    
    <section class="settings-section">
      <h3>지표 설정</h3>
      
      <div class="setting-item">
        <label for="bbPeriod">볼린저 밴드 기간</label>
        <input type="number" id="bbPeriod" min="5" max="50" value="20">
      </div>
      
      <div class="setting-item">
        <label for="bbMultiplier">볼린저 밴드 배수</label>
        <input type="number" id="bbMultiplier" min="1" max="3" step="0.1" value="2">
      </div>
      
      <div class="setting-item">
        <label for="minConfidence">최소 신뢰도 (%)</label>
        <input type="number" id="minConfidence" min="50" max="95" value="70">
      </div>
    </section>
    
    <div class="button-group">
      <button id="saveSettings" class="btn-primary">설정 저장</button>
      <button id="resetSettings" class="btn-secondary">초기화</button>
    </div>
  </div>
  
  <script src="options.js"></script>
</body>
</html>
```

#### 10-3. 알림 시스템 (30분)
```javascript
class NotificationManager {
  static async showTradeNotification(trade) {
    const title = `거래 ${trade.type === 'long' ? '매수' : '매도'} 실행`;
    const message = `가격: ${trade.price}, 신뢰도: ${trade.confidence}%`;
    
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon48.png',
        title: title,
        message: message
      });
    }
  }
  
  static async showPnLNotification(pnl, positionType) {
    const isProfit = pnl > 0;
    const title = isProfit ? '💰 수익 발생' : '📉 손실 발생';
    const message = `${positionType.toUpperCase()} 포지션: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%`;
    
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon48.png',
        title: title,
        message: message
      });
    }
  }
  
  static async showErrorNotification(error) {
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon48.png',
        title: '⚠️ 오류 발생',
        message: error.message || '알 수 없는 오류가 발생했습니다.'
      });
    }
  }
}
```

### ✅ 완료 조건
- [ ] 거래 통계가 정확히 표시됨
- [ ] 설정 페이지에서 모든 옵션 변경 가능
- [ ] 알림이 적절한 시점에 표시됨
- [ ] UI가 직관적이고 사용하기 쉬움

---

## 🎯 Phase 11: 추가 기능 구현 (6시간)

### 📋 목표
프로젝트 계획의 추가 기능 구현

### 🛠️ 구현 단계

#### 11-1. 다양한 전략 구현 (3시간)
```javascript
// RSI 전략
class RSIStrategy {
  constructor(period = 14) {
    this.period = period;
    this.priceChanges = [];
  }
  
  calculateRSI(prices) {
    // RSI 계산 로직
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i-1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const avgGain = gains.slice(-this.period).reduce((a, b) => a + b, 0) / this.period;
    const avgLoss = losses.slice(-this.period).reduce((a, b) => a + b, 0) / this.period;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  generateSignal(prices) {
    if (prices.length < this.period + 1) return null;
    
    const rsi = this.calculateRSI(prices);
    
    if (rsi < 30) {
      return { type: 'BUY', reason: 'RSI Oversold', confidence: 80 };
    } else if (rsi > 70) {
      return { type: 'SELL', reason: 'RSI Overbought', confidence: 80 };
    }
    
    return null;
  }
}

// MACD 전략
class MACDStrategy {
  constructor(fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    this.fastPeriod = fastPeriod;
    this.slowPeriod = slowPeriod;
    this.signalPeriod = signalPeriod;
  }
  
  calculateEMA(prices, period) {
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }
  
  generateSignal(prices) {
    if (prices.length < this.slowPeriod) return null;
    
    const fastEMA = this.calculateEMA(prices.slice(-this.fastPeriod), this.fastPeriod);
    const slowEMA = this.calculateEMA(prices.slice(-this.slowPeriod), this.slowPeriod);
    const macd = fastEMA - slowEMA;
    
    // 간단한 MACD 신호 (실제로는 더 복잡함)
    if (macd > 0) {
      return { type: 'BUY', reason: 'MACD Bullish', confidence: 75 };
    } else if (macd < 0) {
      return { type: 'SELL', reason: 'MACD Bearish', confidence: 75 };
    }
    
    return null;
  }
}
```

#### 11-2. 백테스팅 시스템 (2시간)
```javascript
class BacktestEngine {
  constructor(strategy, initialBalance = 10000) {
    this.strategy = strategy;
    this.initialBalance = initialBalance;
    this.balance = initialBalance;
    this.position = null;
    this.trades = [];
  }
  
  async runBacktest(historicalData) {
    console.log('백테스팅 시작...');
    
    for (let i = 20; i < historicalData.length; i++) {
      const currentData = historicalData.slice(0, i + 1);
      const currentPrice = currentData[currentData.length - 1].price;
      
      const signal = this.strategy.generateSignal(
        currentData.map(d => d.price)
      );
      
      if (signal) {
        await this.processSignal(signal, currentPrice, currentData[i].timestamp);
      }
    }
    
    return this.generateReport();
  }
  
  async processSignal(signal, price, timestamp) {
    if (signal.type === 'BUY' && !this.position) {
      // 매수
      const amount = this.balance * 0.1; // 10% 투자
      const quantity = amount / price;
      
      this.position = {
        type: 'long',
        entryPrice: price,
        quantity: quantity,
        entryTime: timestamp
      };
      
      this.balance -= amount;
      
    } else if (signal.type === 'SELL' && this.position) {
      // 매도
      const exitValue = this.position.quantity * price;
      const pnl = exitValue - (this.position.quantity * this.position.entryPrice);
      const pnlPercent = (pnl / (this.position.quantity * this.position.entryPrice)) * 100;
      
      this.trades.push({
        entryPrice: this.position.entryPrice,
        exitPrice: price,
        pnl: pnl,
        pnlPercent: pnlPercent,
        holdingTime: timestamp - this.position.entryTime
      });
      
      this.balance += exitValue;
      this.position = null;
    }
  }
  
  generateReport() {
    const totalTrades = this.trades.length;
    const winningTrades = this.trades.filter(t => t.pnl > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalReturn = ((this.balance - this.initialBalance) / this.initialBalance) * 100;
    
    return {
      totalTrades,
      winRate: winRate.toFixed(2),
      totalReturn: totalReturn.toFixed(2),
      finalBalance: this.balance.toFixed(2),
      trades: this.trades
    };
  }
}
```

#### 11-3. 성능 최적화 (1시간)
```javascript
// 메모리 관리
class MemoryManager {
  static cleanup() {
    // 오래된 데이터 정리
    chrome.storage.local.get(['tradeHistory', 'priceHistory'], (result) => {
      const trades = result.tradeHistory || [];
      const prices = result.priceHistory || [];
      
      // 최근 100개 거래만 보관
      if (trades.length > 100) {
        const recentTrades = trades.slice(-100);
        chrome.storage.local.set({ tradeHistory: recentTrades });
      }
      
      // 최근 200개 가격 데이터만 보관
      if (prices.length > 200) {
        const recentPrices = prices.slice(-200);
        chrome.storage.local.set({ priceHistory: recentPrices });
      }
    });
  }
  
  static startCleanupSchedule() {
    // 1시간마다 정리
    setInterval(() => {
      this.cleanup();
    }, 3600000);
  }
}

// 성능 모니터링
class PerformanceMonitor {
  static measureExecutionTime(func, name) {
    return async function(...args) {
      const start = performance.now();
      const result = await func.apply(this, args);
      const end = performance.now();
      
      console.log(`${name} 실행 시간: ${(end - start).toFixed(2)}ms`);
      return result;
    };
  }
}
```

### ✅ 완료 조건
- [ ] 다양한 전략이 정상 작동함
- [ ] 백테스팅 결과가 정확함
- [ ] 메모리 사용량이 최적화됨
- [ ] 전체 시스템 성능이 안정적임

---

## 📊 전체 진행 상황 추적

### ✅ 완료된 Phase
- **Phase 1-7**: 기본 구조부터 매크로 실행까지 완료 ✅
- **Phase 8**: 기술적 지표 계산 (진행 예정)
- **Phase 9**: 자동매매 로직 (계획 단계)
- **Phase 10**: UI 완성 (계획 단계)
- **Phase 11**: 추가 기능 (계획 단계)

### 🎯 현재 목표
**Phase 8 구현**: 볼린저 밴드 계산 및 신호 생성 시스템

### 📈 예상 완료 시점
- **Phase 8**: 2일 (6시간)
- **Phase 9**: 2일 (4시간)
- **Phase 10**: 1일 (3시간)
- **Phase 11**: 3일 (6시간)

**총 예상 기간**: 약 8일 (19시간)

---

## 🔗 관련 문서

- **[텔레그램 연동 가이드](TELEGRAM_INTEGRATION_GUIDE.md)**: 트레이딩뷰-텔레그램-익스텐션 연동 방법
- **[PC 전원 관리 가이드](PC_POWER_MANAGEMENT_GUIDE.md)**: 24시간 자동매매를 위한 PC 설정 방법
- **[개발 가이드라인](DEVELOPMENT_GUIDE.md)**: Git 커밋 규칙 및 개발 방법
- **[사용자 가이드](USER_GUIDE.md)**: 익스텐션 사용 방법
- **[설치 가이드](SETUP_GUIDE.md)**: 개발 환경 설정 방법

---

## ⚠️ 중요 원칙

1. **한 번에 하나씩**: 각 Phase를 완전히 완료한 후 다음으로 진행
2. **테스트 필수**: 각 단계마다 반드시 실제 테스트
3. **일찍 실패**: 문제 발견 시 즉시 중단하고 해결
4. **문서화**: 각 단계의 결과와 문제를 상세히 기록
5. **사용자 중심**: 복잡한 기능보다 사용하기 쉬운 인터페이스 우선

---

**💡 성공 팁**: 각 Phase는 독립적으로 완료 가능하도록 설계되었습니다. 문제가 발생하면 이전 단계로 돌아가서 기반을 다시 확인하세요. 안정성이 확보된 후에 다음 단계로 진행하는 것이 전체 개발 시간을 단축시킵니다!