# 🚀 크롬 익스텐션 기반 암호화폐 자동매매 봇 - 구현 가이드

## 📋 개요

이 문서는 크롬 익스텐션 기반 암호화폐 자동매매 봇을 단계별로 구현하기 위한 완전한 가이드입니다. 각 Phase는 독립적으로 완료 가능하며, 실제 테스트를 통해 검증된 구현 방법을 제공합니다.

### 🎯 구현 전략
- **최소 기능으로 시작**: 핵심 기능만 구현하여 동작 확인
- **단계별 테스트**: 각 단계마다 실제로 테스트하며 진행
- **점진적 확장**: 기본 기능 완성 후 추가 기능 구현
- **안정성 우선**: 빠른 개발보다 안정적인 동작 우선

### ⏱️ 총 구현 시간: 약 23-33시간
- **Phase 1-4**: 기본 구조 (6시간)
- **Phase 5-7**: 핵심 기능 (12시간)
- **Phase 8-12**: 고급 기능 (11-15시간)

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

## 🎯 Phase 8: 텔레그램 연동 시스템 (4시간)

### 📋 목표
텔레그램 봇 API를 통한 외부 신호 수신 및 자동매매 실행

### 🛠️ 구현 단계

#### 8-1. 텔레그램 봇 API 연동 (1.5시간)
```javascript
// utils/telegram.js
class TelegramBot {
  constructor(botToken, chatId) {
    this.botToken = botToken;
    this.chatId = chatId;
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
    this.lastUpdateId = 0;
  }
  
  // 봇 연결 테스트
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      const data = await response.json();
      
      if (data.ok) {
        console.log('텔레그램 봇 연결 성공:', data.result.username);
        return { success: true, botInfo: data.result };
      } else {
        throw new Error(data.description);
      }
    } catch (error) {
      console.error('텔레그램 봇 연결 실패:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 새 메시지 가져오기 (폴링)
  async getUpdates() {
    try {
      const url = `${this.baseUrl}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=30`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.ok && data.result.length > 0) {
        const messages = data.result;
        this.lastUpdateId = messages[messages.length - 1].update_id;
        
        // 지정된 채팅에서 온 메시지만 필터링
        const relevantMessages = messages.filter(msg => 
          msg.message && 
          msg.message.chat.id.toString() === this.chatId.toString()
        );
        
        return relevantMessages.map(msg => ({
          messageId: msg.message.message_id,
          text: msg.message.text,
          timestamp: msg.message.date * 1000,
          updateId: msg.update_id
        }));
      }
      
      return [];
    } catch (error) {
      console.error('메시지 가져오기 실패:', error);
      return [];
    }
  }
  
  // 메시지 전송 (알림용)
  async sendMessage(text) {
    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: text,
          parse_mode: 'HTML'
        })
      });
      
      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      return false;
    }
  }
}
```

#### 8-2. 다중 심볼 신호 파싱 시스템 (1시간)
```javascript
// utils/signalParser.js
class SignalParser {
  constructor(userSymbol = null) {
    this.userSymbol = userSymbol; // 사용자가 설정한 심볼 (예: "BTC", "ETH")
    this.validSignals = ['BUY', 'SELL', 'LONG', 'SHORT'];
  }
  
  // 사용자 심볼 설정
  setUserSymbol(symbol) {
    this.userSymbol = symbol ? symbol.toUpperCase().trim() : null;
    console.log('사용자 심볼 설정:', this.userSymbol);
  }
  
  // 텔레그램 메시지에서 거래 신호 추출 (심볼 필터링 포함)
  parseSignal(messageText) {
    if (!messageText) return null;
    
    const text = messageText.toUpperCase().trim();
    console.log('신호 파싱 시도:', text);
    
    // 다양한 신호 패턴 매칭
    const patterns = [
      // "BTC Long" 또는 "ETH Short" (심볼이 맨 앞)
      /^([A-Z]{2,10})\s+(LONG|SHORT|BUY|SELL)(?:\s+@\s*([0-9,.]+))?/,
      // "Long BTC" 또는 "Short ETH" (액션이 맨 앞)
      /^(LONG|SHORT|BUY|SELL)\s+([A-Z]{2,10})(?:\s+@\s*([0-9,.]+))?/,
      // "BUY BTCUSDT @ 43250" (기존 형식)
      /^(BUY|SELL|LONG|SHORT)\s+([A-Z]+(?:USDT)?)\s*(?:@\s*([0-9,.]+))?/,
      // "BTC" (심볼만, 기본 액션 없음)
      /^([A-Z]{2,10})$/
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = text.match(pattern);
      
      if (match) {
        let symbol, action, price;
        
        // 패턴별로 매칭 결과 해석
        switch (i) {
          case 0: // "BTC Long"
            symbol = match[1];
            action = this.normalizeAction(match[2]);
            price = match[3] ? parseFloat(match[3].replace(/,/g, '')) : null;
            break;
            
          case 1: // "Long BTC"
            action = this.normalizeAction(match[1]);
            symbol = match[2];
            price = match[3] ? parseFloat(match[3].replace(/,/g, '')) : null;
            break;
            
          case 2: // "BUY BTCUSDT"
            action = this.normalizeAction(match[1]);
            symbol = this.extractBaseSymbol(match[2]);
            price = match[3] ? parseFloat(match[3].replace(/,/g, '')) : null;
            break;
            
          case 3: // "BTC" (심볼만)
            symbol = match[1];
            action = null; // 액션 없음
            price = null;
            break;
        }
        
        // 사용자 설정 심볼과 매칭 확인
        if (!this.isSymbolMatch(symbol)) {
          console.log(`심볼 불일치: 메시지="${symbol}", 설정="${this.userSymbol}"`);
          continue; // 다음 패턴 시도
        }
        
        const signal = {
          action: action,
          symbol: symbol,
          price: price,
          timestamp: Date.now(),
          originalText: messageText,
          confidence: this.calculateConfidence(match, i),
          matched: true // 심볼 매칭됨
        };
        
        if (this.validateSignal(signal)) {
          console.log('유효한 신호 파싱됨:', signal);
          return signal;
        }
      }
    }
    
    console.log('신호 파싱 실패 또는 심볼 불일치:', text);
    return null;
  }
  
  // 사용자 설정 심볼과 메시지 심볼 매칭 확인
  isSymbolMatch(messageSymbol) {
    if (!this.userSymbol || !messageSymbol) return false;
    
    const userSym = this.userSymbol.toUpperCase();
    const msgSym = messageSymbol.toUpperCase();
    
    // 정확한 매칭
    if (userSym === msgSym) return true;
    
    // 부분 매칭 (예: 사용자="BTC", 메시지="BTCUSDT")
    if (msgSym.includes(userSym)) return true;
    if (userSym.includes(msgSym)) return true;
    
    return false;
  }
  
  // BTCUSDT에서 BTC 추출
  extractBaseSymbol(fullSymbol) {
    const commonPairs = ['USDT', 'BUSD', 'USD', 'KRW', 'BTC', 'ETH'];
    
    for (const pair of commonPairs) {
      if (fullSymbol.endsWith(pair)) {
        return fullSymbol.replace(pair, '');
      }
    }
    
    return fullSymbol; // 추출 실패 시 원본 반환
  }
  
  // 액션 정규화 (BUY/LONG -> long, SELL/SHORT -> short)
  normalizeAction(action) {
    switch (action.toUpperCase()) {
      case 'BUY':
      case 'LONG':
        return 'long';
      case 'SELL':
      case 'SHORT':
        return 'short';
      default:
        return null;
    }
  }
  
  // 신호 유효성 검증
  validateSignal(signal) {
    // 액션 검증
    if (!signal.action || !['long', 'short'].includes(signal.action)) {
      console.warn('유효하지 않은 액션:', signal.action);
      return false;
    }
    
    // 심볼 검증 (선택사항)
    if (this.validSymbols.length > 0 && signal.symbol) {
      const symbolValid = this.validSymbols.some(validSymbol => 
        signal.symbol.includes(validSymbol)
      );
      if (!symbolValid) {
        console.warn('지원하지 않는 심볼:', signal.symbol);
        // 경고만 하고 계속 진행 (유연성 확보)
      }
    }
    
    // 가격 검증
    if (signal.price && (signal.price <= 0 || signal.price > 1000000)) {
      console.warn('유효하지 않은 가격:', signal.price);
      return false;
    }
    
    return true;
  }
  
  // 신뢰도 계산
  calculateConfidence(match) {
    let confidence = 70; // 기본 신뢰도
    
    // 심볼이 명시된 경우 +10
    if (match[2]) confidence += 10;
    
    // 가격이 명시된 경우 +10
    if (match[3]) confidence += 10;
    
    // 최대 95%
    return Math.min(95, confidence);
  }
}
```

#### 8-3. 심볼 기반 자동실행 시스템 (1시간)
```javascript
// utils/autoTrader.js
class TelegramAutoTrader {
  constructor() {
    this.telegramBot = null;
    this.signalParser = new SignalParser();
    this.isRunning = false;
    this.pollingInterval = null;
    this.pollingDelay = 3000; // 3초 간격
    this.lastProcessedMessageId = 0;
    this.userSymbol = null; // 사용자 설정 심볼
  }
  
  // 시스템 초기화 (심볼 설정 포함)
  async initialize(botToken, chatId, userSymbol = null) {
    this.telegramBot = new TelegramBot(botToken, chatId);
    
    // 사용자 심볼 설정
    this.setUserSymbol(userSymbol);
    
    // 연결 테스트
    const connectionTest = await this.telegramBot.testConnection();
    if (!connectionTest.success) {
      throw new Error(`텔레그램 연결 실패: ${connectionTest.error}`);
    }
    
    console.log('텔레그램 자동매매 시스템 초기화 완료');
    console.log('설정된 심볼:', this.userSymbol);
    return connectionTest;
  }
  
  // 사용자 심볼 설정
  setUserSymbol(symbol) {
    this.userSymbol = symbol ? symbol.toUpperCase().trim() : null;
    this.signalParser.setUserSymbol(this.userSymbol);
    console.log('사용자 심볼 업데이트:', this.userSymbol);
  }
  
  // 자동매매 시작
  start() {
    if (this.isRunning) {
      console.warn('이미 실행 중입니다');
      return;
    }
    
    if (!this.telegramBot) {
      throw new Error('텔레그램 봇이 초기화되지 않았습니다');
    }
    
    this.isRunning = true;
    console.log('텔레그램 폴링 시작 (3초 간격)');
    
    // 폴링 시작
    this.pollingInterval = setInterval(async () => {
      await this.pollMessages();
    }, this.pollingDelay);
    
    // 상태 알림 (심볼 정보 포함)
    const symbolInfo = this.userSymbol ? ` (${this.userSymbol} 전용)` : '';
    this.telegramBot.sendMessage(`🤖 자동매매 시스템이 시작되었습니다${symbolInfo}.`);
  }
  
  // 자동매매 중단
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    console.log('텔레그램 폴링 중단');
    
    // 상태 알림
    if (this.telegramBot) {
      this.telegramBot.sendMessage('⏸️ 자동매매 시스템이 중단되었습니다.');
    }
  }
  
  // 메시지 폴링 및 처리
  async pollMessages() {
    try {
      const messages = await this.telegramBot.getUpdates();
      
      if (messages.length > 0) {
        console.log(`${messages.length}개의 새 메시지 수신`);
        
        for (const message of messages) {
          // 중복 처리 방지
          if (message.messageId <= this.lastProcessedMessageId) {
            continue;
          }
          
          await this.processMessage(message);
          this.lastProcessedMessageId = message.messageId;
        }
      }
    } catch (error) {
      console.error('메시지 폴링 오류:', error);
    }
  }
  
  // 개별 메시지 처리
  async processMessage(message) {
    try {
      console.log('메시지 처리:', message.text);
      
      // 신호 파싱
      const signal = this.signalParser.parseSignal(message.text);
      
      if (signal) {
        console.log('거래 신호 감지:', signal);
        
        // 액션이 없는 경우 (심볼만 있는 경우) 처리
        if (!signal.action) {
          console.log('액션 없는 신호 무시:', signal.symbol);
          return;
        }
        
        // 매크로 실행
        await this.executeSignal(signal);
        
        // 실행 알림 (심볼 매칭 정보 포함)
        await this.telegramBot.sendMessage(
          `✅ <b>${signal.action.toUpperCase()}</b> 신호 실행 완료\n` +
          `심볼: ${signal.symbol} (설정: ${this.userSymbol})\n` +
          `시간: ${new Date().toLocaleTimeString()}`
        );
      } else {
        // 심볼 불일치로 인한 무시는 로그만 출력 (알림 X)
        if (message.text.match(/^[A-Z]{2,10}(\s+(LONG|SHORT|BUY|SELL))?/i)) {
          console.log('심볼 불일치로 신호 무시:', message.text);
        } else {
          console.log('유효하지 않은 신호:', message.text);
        }
      }
    } catch (error) {
      console.error('메시지 처리 오류:', error);
      
      // 오류 알림
      await this.telegramBot.sendMessage(
        `❌ 신호 처리 중 오류 발생: ${error.message}`
      );
    }
  }
  
  // 신호 실행
  async executeSignal(signal) {
    try {
      // 현재 탭이 거래소인지 확인
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      if (!this.isExchangePage(tab.url)) {
        throw new Error('거래소 페이지가 아닙니다');
      }
      
      // 매크로 실행
      const macroType = signal.action; // 'long' or 'short'
      
      await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        function: (type) => {
          if (window.macroExecutor) {
            return window.macroExecutor.executeMacro(type);
          } else {
            throw new Error('매크로 실행기가 로드되지 않았습니다');
          }
        },
        args: [macroType]
      });
      
      // 실행 기록 저장
      await chrome.storage.local.set({
        lastTelegramTrade: {
          signal: signal,
          executedAt: Date.now(),
          success: true
        }
      });
      
      console.log(`${signal.action} 매크로 실행 완료`);
      
    } catch (error) {
      console.error('신호 실행 실패:', error);
      
      // 실패 기록 저장
      await chrome.storage.local.set({
        lastTelegramTrade: {
          signal: signal,
          executedAt: Date.now(),
          success: false,
          error: error.message
        }
      });
      
      throw error;
    }
  }
  
  // 거래소 페이지 확인
  isExchangePage(url) {
    const exchangePatterns = [
      'gate.io',
      'binance.com',
      'upbit.com',
      'coinbase.com'
    ];
    
    return exchangePatterns.some(pattern => url.includes(pattern));
  }
}
```

#### 8-4. 심볼 설정 UI 및 연동 (30분)
```javascript
// popup.js에 텔레그램 설정 추가
class TelegramUI {
  constructor() {
    this.autoTrader = new TelegramAutoTrader();
    this.initializeUI();
  }
  
  initializeUI() {
    // 텔레그램 설정 섹션
    const telegramSection = document.getElementById('telegramSection');
    
    // 연결 테스트 버튼
    document.getElementById('testTelegramConnection').addEventListener('click', async () => {
      await this.testConnection();
    });
    
    // 자동매매 시작/중단 버튼
    document.getElementById('startTelegramTrading').addEventListener('click', async () => {
      await this.startTrading();
    });
    
    document.getElementById('stopTelegramTrading').addEventListener('click', () => {
      this.stopTrading();
    });
    
    // 심볼 변경 이벤트
    document.getElementById('userSymbol').addEventListener('change', () => {
      this.updateSymbol();
    });
    
    // 설정 로드
    this.loadSettings();
  }
  
  async testConnection() {
    try {
      const botToken = document.getElementById('botToken').value;
      const chatId = document.getElementById('chatId').value;
      const userSymbol = document.getElementById('userSymbol').value;
      
      if (!botToken || !chatId) {
        this.showStatus('봇 토큰과 채팅 ID를 입력하세요', 'error');
        return;
      }
      
      this.showStatus('연결 테스트 중...', 'info');
      
      const result = await this.autoTrader.initialize(botToken, chatId, userSymbol);
      
      if (result.success) {
        const symbolInfo = userSymbol ? ` (${userSymbol} 전용)` : '';
        this.showStatus(`연결 성공: @${result.botInfo.username}${symbolInfo}`, 'success');
        
        // 설정 저장
        await chrome.storage.local.set({
          telegramSettings: { botToken, chatId, userSymbol }
        });
      }
    } catch (error) {
      this.showStatus(`연결 실패: ${error.message}`, 'error');
    }
  }
  
  // 심볼 업데이트
  updateSymbol() {
    const userSymbol = document.getElementById('userSymbol').value;
    if (this.autoTrader.telegramBot) {
      this.autoTrader.setUserSymbol(userSymbol);
      this.showStatus(`심볼 업데이트: ${userSymbol || '전체'}`, 'info');
      
      // 설정 저장
      chrome.storage.local.get(['telegramSettings'], (result) => {
        const settings = result.telegramSettings || {};
        settings.userSymbol = userSymbol;
        chrome.storage.local.set({ telegramSettings: settings });
      });
    }
  }
  
  async startTrading() {
    try {
      if (!this.autoTrader.telegramBot) {
        await this.testConnection();
      }
      
      this.autoTrader.start();
      this.showStatus('텔레그램 자동매매 시작됨', 'success');
      
      // UI 상태 업데이트
      document.getElementById('telegramStatus').textContent = '실행 중';
      document.getElementById('startTelegramTrading').disabled = true;
      document.getElementById('stopTelegramTrading').disabled = false;
      
    } catch (error) {
      this.showStatus(`시작 실패: ${error.message}`, 'error');
    }
  }
  
  stopTrading() {
    this.autoTrader.stop();
    this.showStatus('텔레그램 자동매매 중단됨', 'info');
    
    // UI 상태 업데이트
    document.getElementById('telegramStatus').textContent = '중단됨';
    document.getElementById('startTelegramTrading').disabled = false;
    document.getElementById('stopTelegramTrading').disabled = true;
  }
  
  showStatus(message, type) {
    const statusElement = document.getElementById('telegramStatusMessage');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
  }
  
  async loadSettings() {
    const result = await chrome.storage.local.get(['telegramSettings']);
    if (result.telegramSettings) {
      document.getElementById('botToken').value = result.telegramSettings.botToken || '';
      document.getElementById('chatId').value = result.telegramSettings.chatId || '';
      document.getElementById('userSymbol').value = result.telegramSettings.userSymbol || '';
    }
  }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.telegramUI = new TelegramUI();
});
```

**popup.html에 추가할 UI 요소:**
```html
<!-- 텔레그램 설정 섹션 -->
<section id="telegramSection" class="telegram-section">
  <h3>📱 텔레그램 자동매매</h3>
  
  <div class="input-group">
    <label for="botToken">봇 토큰:</label>
    <input type="password" id="botToken" placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz">
  </div>
  
  <div class="input-group">
    <label for="chatId">채팅 ID:</label>
    <input type="text" id="chatId" placeholder="987654321">
  </div>
  
  <div class="input-group">
    <label for="userSymbol">거래 심볼:</label>
    <input type="text" id="userSymbol" placeholder="BTC" maxlength="10">
    <small>예: BTC, ETH, SOL (이 심볼 신호만 처리)</small>
  </div>
  
  <div class="button-group">
    <button id="testTelegramConnection" class="btn-secondary">연결 테스트</button>
    <button id="startTelegramTrading" class="btn-primary">자동매매 시작</button>
    <button id="stopTelegramTrading" class="btn-danger" disabled>자동매매 중단</button>
  </div>
  
  <div id="telegramStatusMessage" class="status-message"></div>
  <div class="status-info">
    <span>상태: </span>
    <span id="telegramStatus">대기 중</span>
  </div>
</section>
```

### ✅ 완료 조건
- [ ] 텔레그램 봇 연결이 정상 작동함
- [ ] 메시지 폴링이 3초 간격으로 실행됨
- [ ] **사용자 설정 심볼과 매칭되는 신호만 파싱됨**
- [ ] **다양한 신호 형식 지원** ("BTC Long", "Long BTC", "BUY BTCUSDT")
- [ ] **심볼 매칭 시에만 매크로 자동 실행됨**
- [ ] **다른 심볼 신호는 무시됨**
- [ ] UI에서 심볼 설정 및 연결 상태 관리 가능

### 🚨 문제 해결
**문제**: 텔레그램 API 연결 실패
**해결**: 봇 토큰 재확인, 네트워크 상태 점검

**문제**: 심볼 매칭 실패
**해결**: 사용자 심볼 설정 확인, 대소문자 구분 없음, 부분 매칭 지원

**문제**: 신호 파싱 실패
**해결**: 다양한 메시지 형식 지원, 패턴 매칭 로그 확인

**문제**: 매크로 실행 실패
**해결**: 거래소 페이지 확인, 매크로 재녹화

---

## 🎯 Phase 9: 리스크 관리 및 거래 내역 시스템 (3시간)

### 📋 목표
안전한 자동매매를 위한 리스크 관리 및 거래 기록 시스템

### 🛠️ 구현 단계

#### 9-1. 거래 제한 및 안전장치 (1시간)
```javascript
// utils/riskManager.js
class RiskManager {
  constructor() {
    this.settings = {
      maxTradesPerHour: 10,        // 시간당 최대 거래 횟수
      minTradingInterval: 30000,   // 최소 거래 간격 (30초)
      cooldownAfterLoss: 300000,   // 손실 후 쿨다운 (5분)
      maxConsecutiveLosses: 3,     // 최대 연속 손실 횟수
      tradingHours: {              // 거래 허용 시간
        start: 9,   // 오전 9시
        end: 23     // 오후 11시
      }
    };
    
    this.state = {
      lastTradeTime: 0,
      hourlyTradeCount: 0,
      hourlyTradeReset: Date.now(),
      consecutiveLosses: 0,
      lastLossTime: 0,
      totalTrades: 0,
      successfulTrades: 0
    };
  }
  
  // 거래 가능 여부 종합 판단
  canTrade(signal = null) {
    const checks = [
      this.checkTradingHours(),
      this.checkTradingInterval(),
      this.checkHourlyLimit(),
      this.checkCooldown(),
      this.checkConsecutiveLosses()
    ];
    
    const results = checks.map(check => check());
    const failedChecks = results.filter(result => !result.allowed);
    
    if (failedChecks.length > 0) {
      console.log('거래 제한:', failedChecks.map(f => f.reason).join(', '));
      return { allowed: false, reasons: failedChecks.map(f => f.reason) };
    }
    
    return { allowed: true, reasons: [] };
  }
  
  // 거래 시간 체크
  checkTradingHours() {
    const now = new Date();
    const hour = now.getHours();
    
    if (hour < this.settings.tradingHours.start || hour >= this.settings.tradingHours.end) {
      return { allowed: false, reason: '거래 시간 외' };
    }
    
    return { allowed: true };
  }
  
  // 거래 간격 체크
  checkTradingInterval() {
    const now = Date.now();
    const timeSinceLastTrade = now - this.state.lastTradeTime;
    
    if (timeSinceLastTrade < this.settings.minTradingInterval) {
      const remainingTime = Math.ceil((this.settings.minTradingInterval - timeSinceLastTrade) / 1000);
      return { allowed: false, reason: `거래 간격 부족 (${remainingTime}초 대기)` };
    }
    
    return { allowed: true };
  }
  
  // 시간당 거래 횟수 체크
  checkHourlyLimit() {
    const now = Date.now();
    
    // 시간당 거래 횟수 리셋
    if (now - this.state.hourlyTradeReset > 3600000) { // 1시간
      this.state.hourlyTradeCount = 0;
      this.state.hourlyTradeReset = now;
    }
    
    if (this.state.hourlyTradeCount >= this.settings.maxTradesPerHour) {
      return { allowed: false, reason: '시간당 최대 거래 횟수 초과' };
    }
    
    return { allowed: true };
  }
  
  // 손실 후 쿨다운 체크
  checkCooldown() {
    const now = Date.now();
    const timeSinceLoss = now - this.state.lastLossTime;
    
    if (this.state.lastLossTime > 0 && timeSinceLoss < this.settings.cooldownAfterLoss) {
      const remainingTime = Math.ceil((this.settings.cooldownAfterLoss - timeSinceLoss) / 60000);
      return { allowed: false, reason: `손실 후 쿨다운 (${remainingTime}분 대기)` };
    }
    
    return { allowed: true };
  }
  
  // 연속 손실 체크
  checkConsecutiveLosses() {
    if (this.state.consecutiveLosses >= this.settings.maxConsecutiveLosses) {
      return { allowed: false, reason: '연속 손실 한도 초과' };
    }
    
    return { allowed: true };
  }
  
  // 거래 기록 (성공)
  recordSuccessfulTrade() {
    this.state.lastTradeTime = Date.now();
    this.state.hourlyTradeCount++;
    this.state.totalTrades++;
    this.state.successfulTrades++;
    this.state.consecutiveLosses = 0; // 연속 손실 리셋
    
    this.saveState();
  }
  
  // 거래 기록 (실패/손실)
  recordFailedTrade() {
    this.state.lastTradeTime = Date.now();
    this.state.hourlyTradeCount++;
    this.state.totalTrades++;
    this.state.consecutiveLosses++;
    this.state.lastLossTime = Date.now();
    
    this.saveState();
  }
  
  // 상태 저장
  async saveState() {
    await chrome.storage.local.set({
      riskManagerState: this.state
    });
  }
  
  // 상태 로드
  async loadState() {
    const result = await chrome.storage.local.get(['riskManagerState']);
    if (result.riskManagerState) {
      this.state = { ...this.state, ...result.riskManagerState };
    }
  }
  
  // 통계 정보
  getStats() {
    const successRate = this.state.totalTrades > 0 
      ? (this.state.successfulTrades / this.state.totalTrades * 100).toFixed(1)
      : 0;
      
    return {
      totalTrades: this.state.totalTrades,
      successfulTrades: this.state.successfulTrades,
      successRate: `${successRate}%`,
      consecutiveLosses: this.state.consecutiveLosses,
      hourlyTradeCount: this.state.hourlyTradeCount
    };
  }
}
```

#### 9-2. 거래 내역 관리 시스템 (1시간)
```javascript
// utils/tradeHistory.js
class TradeHistoryManager {
  constructor() {
    this.maxHistorySize = 500; // 최대 500개 거래 기록
  }
  
  // 거래 기록 추가
  async addTrade(tradeData) {
    const trade = {
      id: this.generateTradeId(),
      timestamp: Date.now(),
      date: new Date().toISOString(),
      source: tradeData.source || 'telegram', // 'telegram', 'manual', 'indicator'
      signal: tradeData.signal,
      action: tradeData.action, // 'long', 'short'
      symbol: tradeData.symbol || 'BTCUSDT',
      price: tradeData.price,
      amount: tradeData.amount,
      success: tradeData.success,
      error: tradeData.error || null,
      executionTime: tradeData.executionTime || null,
      confidence: tradeData.confidence || null
    };
    
    // 기존 거래 내역 가져오기
    const result = await chrome.storage.local.get(['tradeHistory']);
    const history = result.tradeHistory || [];
    
    // 새 거래 추가
    history.push(trade);
    
    // 최대 크기 초과 시 오래된 거래 제거
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }
    
    // 저장
    await chrome.storage.local.set({ tradeHistory: history });
    
    console.log('거래 기록 추가:', trade);
    return trade;
  }
  
  // 거래 내역 조회
  async getTradeHistory(filters = {}) {
    const result = await chrome.storage.local.get(['tradeHistory']);
    let history = result.tradeHistory || [];
    
    // 필터 적용
    if (filters.source) {
      history = history.filter(trade => trade.source === filters.source);
    }
    
    if (filters.action) {
      history = history.filter(trade => trade.action === filters.action);
    }
    
    if (filters.success !== undefined) {
      history = history.filter(trade => trade.success === filters.success);
    }
    
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom).getTime();
      history = history.filter(trade => trade.timestamp >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo).getTime();
      history = history.filter(trade => trade.timestamp <= toDate);
    }
    
    // 최신순 정렬
    return history.sort((a, b) => b.timestamp - a.timestamp);
  }
  
  // 거래 통계 계산
  async getTradeStats(period = 'all') {
    const history = await this.getTradeHistory();
    
    // 기간 필터링
    let filteredHistory = history;
    if (period !== 'all') {
      const now = Date.now();
      let periodMs = 0;
      
      switch (period) {
        case 'today':
          periodMs = 24 * 60 * 60 * 1000;
          break;
        case 'week':
          periodMs = 7 * 24 * 60 * 60 * 1000;
          break;
        case 'month':
          periodMs = 30 * 24 * 60 * 60 * 1000;
          break;
      }
      
      filteredHistory = history.filter(trade => 
        trade.timestamp >= (now - periodMs)
      );
    }
    
    const totalTrades = filteredHistory.length;
    const successfulTrades = filteredHistory.filter(t => t.success).length;
    const failedTrades = totalTrades - successfulTrades;
    const successRate = totalTrades > 0 ? (successfulTrades / totalTrades * 100) : 0;
    
    // 소스별 통계
    const sourceStats = {};
    filteredHistory.forEach(trade => {
      if (!sourceStats[trade.source]) {
        sourceStats[trade.source] = { total: 0, successful: 0 };
      }
      sourceStats[trade.source].total++;
      if (trade.success) {
        sourceStats[trade.source].successful++;
      }
    });
    
    // 액션별 통계
    const actionStats = {
      long: filteredHistory.filter(t => t.action === 'long').length,
      short: filteredHistory.filter(t => t.action === 'short').length
    };
    
    return {
      period,
      totalTrades,
      successfulTrades,
      failedTrades,
      successRate: successRate.toFixed(1),
      sourceStats,
      actionStats,
      recentTrades: filteredHistory.slice(0, 10) // 최근 10개
    };
  }
  
  // 거래 ID 생성
  generateTradeId() {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // 데이터 내보내기 (CSV)
  async exportToCSV(filters = {}) {
    const history = await this.getTradeHistory(filters);
    
    const headers = [
      'ID', 'Date', 'Source', 'Action', 'Symbol', 'Price', 
      'Amount', 'Success', 'Error', 'Confidence'
    ];
    
    const rows = history.map(trade => [
      trade.id,
      new Date(trade.timestamp).toLocaleString(),
      trade.source,
      trade.action,
      trade.symbol,
      trade.price || '',
      trade.amount || '',
      trade.success ? 'Success' : 'Failed',
      trade.error || '',
      trade.confidence || ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    return csvContent;
  }
}
```

#### 9-3. 통합 자동매매 시스템 (1시간)
```javascript
// utils/enhancedAutoTrader.js
class EnhancedTelegramAutoTrader extends TelegramAutoTrader {
  constructor() {
    super();
    this.riskManager = new RiskManager();
    this.tradeHistory = new TradeHistoryManager();
  }
  
  // 초기화 시 리스크 매니저 상태 로드
  async initialize(botToken, chatId) {
    await this.riskManager.loadState();
    return await super.initialize(botToken, chatId);
  }
  
  // 신호 실행 전 리스크 체크 추가
  async executeSignal(signal) {
    const startTime = Date.now();
    
    try {
      // 리스크 체크
      const riskCheck = this.riskManager.canTrade(signal);
      if (!riskCheck.allowed) {
        console.log('리스크 체크 실패:', riskCheck.reasons);
        
        // 실패 기록
        await this.tradeHistory.addTrade({
          source: 'telegram',
          signal: signal,
          action: signal.action,
          symbol: signal.symbol,
          price: signal.price,
          success: false,
          error: `리스크 체크 실패: ${riskCheck.reasons.join(', ')}`,
          confidence: signal.confidence
        });
        
        // 텔레그램 알림
        await this.telegramBot.sendMessage(
          `⚠️ 거래 제한\n${riskCheck.reasons.join('\n')}`
        );
        
        return;
      }
      
      // 기존 매크로 실행 로직
      await super.executeSignal(signal);
      
      // 성공 기록
      const executionTime = Date.now() - startTime;
      this.riskManager.recordSuccessfulTrade();
      
      await this.tradeHistory.addTrade({
        source: 'telegram',
        signal: signal,
        action: signal.action,
        symbol: signal.symbol,
        price: signal.price,
        success: true,
        executionTime: executionTime,
        confidence: signal.confidence
      });
      
      // 성공 알림 (통계 포함)
      const stats = this.riskManager.getStats();
      await this.telegramBot.sendMessage(
        `✅ <b>${signal.action.toUpperCase()}</b> 실행 완료\n` +
        `심볼: ${signal.symbol}\n` +
        `실행시간: ${executionTime}ms\n` +
        `성공률: ${stats.successRate} (${stats.successfulTrades}/${stats.totalTrades})`
      );
      
    } catch (error) {
      // 실패 기록
      const executionTime = Date.now() - startTime;
      this.riskManager.recordFailedTrade();
      
      await this.tradeHistory.addTrade({
        source: 'telegram',
        signal: signal,
        action: signal.action,
        symbol: signal.symbol,
        price: signal.price,
        success: false,
        error: error.message,
        executionTime: executionTime,
        confidence: signal.confidence
      });
      
      // 실패 알림
      await this.telegramBot.sendMessage(
        `❌ <b>${signal.action.toUpperCase()}</b> 실행 실패\n` +
        `오류: ${error.message}\n` +
        `연속 실패: ${this.riskManager.state.consecutiveLosses}회`
      );
      
      throw error;
    }
  }
  
  // 일일 통계 리포트
  async sendDailyReport() {
    try {
      const stats = await this.tradeHistory.getTradeStats('today');
      const riskStats = this.riskManager.getStats();
      
      const report = 
        `📊 <b>일일 거래 리포트</b>\n\n` +
        `총 거래: ${stats.totalTrades}회\n` +
        `성공: ${stats.successfulTrades}회\n` +
        `실패: ${stats.failedTrades}회\n` +
        `성공률: ${stats.successRate}%\n\n` +
        `Long: ${stats.actionStats.long}회\n` +
        `Short: ${stats.actionStats.short}회\n\n` +
        `연속 손실: ${riskStats.consecutiveLosses}회\n` +
        `시간당 거래: ${riskStats.hourlyTradeCount}회`;
      
      await this.telegramBot.sendMessage(report);
    } catch (error) {
      console.error('일일 리포트 전송 실패:', error);
    }
  }
  
  // 자동매매 시작 시 일일 리포트 스케줄링
  start() {
    super.start();
    
    // 매일 자정에 리포트 전송
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.sendDailyReport();
      
      // 이후 24시간마다 반복
      setInterval(() => {
        this.sendDailyReport();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }
}
```

### ✅ 완료 조건
- [ ] 거래 시간, 횟수, 간격 제한이 정상 작동함
- [ ] 연속 손실 시 자동 중단됨
- [ ] 모든 거래가 정확히 기록됨
- [ ] 통계 정보가 실시간으로 업데이트됨
- [ ] 일일 리포트가 자동 전송됨

### 🚨 문제 해결
**문제**: 과도한 거래로 인한 손실
**해결**: 시간당 거래 횟수 제한, 최소 거래 간격 설정

**문제**: 연속 손실 발생
**해결**: 연속 손실 한도 설정, 쿨다운 시간 적용

**문제**: 거래 기록 누락
**해결**: 성공/실패 모든 경우에 대한 기록 시스템

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

## 🎯 Phase 11: 스크린샷 및 모니터링 시스템 (3시간)

### 📋 목표
자동 스크린샷 캡처 및 텔레그램 전송으로 실시간 거래 모니터링 구현

### 🛠️ 구현 단계

#### 11-1. 자동 스크린샷 시스템 (1.5시간)
```javascript
// utils/screenshot.js
class ScreenshotManager {
  constructor() {
    this.isCapturing = false;
  }

  async captureCurrentTab() {
    if (this.isCapturing) return null;
    
    try {
      this.isCapturing = true;
      
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 90
      });
      
      return dataUrl;
    } catch (error) {
      console.error('스크린샷 캡처 실패:', error);
      return null;
    } finally {
      this.isCapturing = false;
    }
  }

  async captureWithCompression(quality = 80) {
    const dataUrl = await this.captureCurrentTab();
    if (!dataUrl) return null;
    
    return await this.compressImage(dataUrl, quality);
  }

  async compressImage(dataUrl, quality) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 해상도 조절 (최대 1920x1080)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', quality / 100));
      };
      
      img.src = dataUrl;
    });
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
- **Phase 8**: 텔레그램 연동 (진행 중 - 25% 완료)
- **Phase 9**: 리스크 관리 (계획 단계)
- **Phase 10**: UI 완성 (계획 단계)
- **Phase 11**: 스크린샷 & 모니터링 (계획 단계)
- **Phase 12**: 추가 기능 & 최적화 (계획 단계)

### 🎯 현재 목표
**Phase 8 구현**: 텔레그램 폴링 + 다중 심볼 신호 파싱 시스템

### 📈 예상 완료 시점
- **Phase 8**: 2일 (4시간) - 텔레그램 연동
- **Phase 9**: 2일 (3시간) - 리스크 관리
- **Phase 10**: 1일 (3시간) - UI 완성
- **Phase 11**: 2일 (3시간) - 스크린샷 & 모니터링
- **Phase 12**: 3일 (4시간) - 추가 기능 & 최적화

**총 예상 기간**: 약 10일 (17시간)

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