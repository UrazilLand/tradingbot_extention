
// Content Script 로드 완료 신호
chrome.runtime.sendMessage({
  action: 'contentScriptLoaded',
  url: window.location.href,
  timestamp: new Date().toISOString()
}).catch(error => {
  console.log('Background 통신 실패 (정상):', error.message);
});

// ============================================
// 거래소 페이지 감지
// ============================================
console.log('=== 거래소 페이지 감지 ===');

function detectExchange() {
  const url = window.location.href.toLowerCase();
  const hostname = window.location.hostname.toLowerCase();
  
  console.log('현재 URL:', url);
  console.log('현재 호스트:', hostname);
  
  // 거래소별 패턴 매칭
  if (hostname.includes('binance.com') || hostname.includes('binance.us') || hostname.includes('binance.kr')) {
    return 'binance';
  } else if (hostname.includes('gate.io') || hostname.includes('gate.com')) {
    return 'gateio';
  } else if (hostname.includes('upbit.com') || hostname.includes('upbit.co.kr')) {
    return 'upbit';
  } else if (hostname.includes('coinbase.com')) {
    return 'coinbase';
  }
  
  return null;
}

// 현재 거래소 감지
const currentExchange = detectExchange();
console.log('감지된 거래소:', currentExchange);

// ============================================
// 자본금 추출 함수
// ============================================
console.log('=== 자본금 추출 기능 ===');

// 자본금 추출 함수 (사용자 지정 셀렉터 사용)
function extractBalance(selector) {
  if (!selector) {
    console.log('자본금 셀렉터가 지정되지 않았습니다.');
    return null;
  }
  
  console.log(`자본금 추출 시도 (셀렉터: ${selector})`);
  
  const element = document.querySelector(selector);
  if (element) {
    const text = element.textContent || element.innerText;
    console.log(`자본금 발견:`, text);
    return {
      exchange: currentExchange,
      balance: text.trim(),
      selector: selector,
      timestamp: new Date().toISOString()
    };
  }
  
  console.log(`자본금 요소를 찾을 수 없습니다 (셀렉터: ${selector})`);
  return null;
}

// ============================================
// Background/Popup과 통신
// ============================================
console.log('=== Content Script 통신 ===');

// Background로부터 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content Script가 메시지 수신:', request);
  
  if (request.action === 'ping') {
    // Content Script가 주입되었는지 확인용
    sendResponse({ status: 'ready' });
    return true;
  } else if (request.action === 'getExchangeInfo') {
    // 현재 거래소 정보 전송
    sendResponse({
      exchange: currentExchange,
      url: window.location.href,
      title: document.title
    });
  } else if (request.action === 'getBalance') {
    // 자본금 정보 추출 (셀렉터 필요)
    const balance = extractBalance(request.selector);
    sendResponse({ balance });
  } else if (request.action === 'getPrice') {
    // 가격 정보 추출 (다음 단계에서 구현)
    const price = extractPrice();
    sendResponse({ price });
  } else if (request.action === 'startElementSelection') {
    // 요소 선택 모드 시작
    startElementSelection();
    sendResponse({ success: true });
  } else if (request.action === 'stopElementSelection') {
    // 요소 선택 모드 중단
    stopElementSelection();
    sendResponse({ success: true });
  } else if (request.action === 'startMacroRecording') {
    // 매크로 녹화 시작
    startMacroRecording(request.macroType);
    sendResponse({ success: true });
  } else if (request.action === 'stopMacroRecording') {
    // 매크로 녹화 중단
    stopMacroRecording();
    sendResponse({ success: true });
  } else if (request.action === 'playMacro') {
    // 매크로 재생
    playMacro(request.macroType, request.amount);
    sendResponse({ success: true });
  } else if (request.action === 'executeSmartTrade') {
    // 스마트 거래 실행
    executeSmartTrade(request.tradeType, request.amount)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 비동기 응답을 위해 true 반환
  }
  
  return true;
});

// 가격 추출 함수 (다음 단계에서 구현)
function extractPrice() {
  // 임시로 더미 데이터 반환
  return {
    exchange: currentExchange,
    price: '0.00',
    timestamp: new Date().toISOString()
  };
}

// ============================================
// 요소 선택 기능
// ============================================
console.log('=== 요소 선택 기능 ===');

let isElementSelectionMode = false;
let originalCursor = '';

// 요소 선택 모드 시작
function startElementSelection() {
  console.log('요소 선택 모드 시작');
  isElementSelectionMode = true;
  
  // 커서 변경
  originalCursor = document.body.style.cursor;
  document.body.style.cursor = 'crosshair';
  
  // 모든 요소에 마우스 오버 이벤트 추가
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('click', handleElementClick, true);
  
  console.log('요소 선택 모드 활성화됨');
}

// 요소 선택 모드 중단
function stopElementSelection() {
  console.log('요소 선택 모드 중단');
  isElementSelectionMode = false;
  
  // 커서 복원
  document.body.style.cursor = originalCursor;
  
  // 이벤트 리스너 제거
  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('click', handleElementClick, true);
  
  // 모든 하이라이트 제거
  document.querySelectorAll('.element-selector-highlight').forEach(el => {
    el.classList.remove('element-selector-highlight');
  });
  
  console.log('요소 선택 모드 비활성화됨');
}

// 마우스 오버 이벤트 처리
function handleMouseOver(event) {
  if (!isElementSelectionMode) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  // 이전 하이라이트 제거
  document.querySelectorAll('.element-selector-highlight').forEach(el => {
    el.classList.remove('element-selector-highlight');
  });
  
  // 현재 요소 하이라이트
  event.target.classList.add('element-selector-highlight');
}

// 요소 클릭 이벤트 처리
function handleElementClick(event) {
  if (!isElementSelectionMode) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  const element = event.target;
  const selector = generateSelector(element);
  const text = element.textContent || element.innerText || '';
  
  console.log('요소 선택됨:', { selector, text });
  
  // 선택 모드 종료
  stopElementSelection();
  
  // Background에 선택된 요소 정보 전송
  chrome.runtime.sendMessage({
    action: 'elementSelected',
    selector: selector,
    text: text.trim().substring(0, 100) // 텍스트 길이 제한
  }).catch(error => {
    console.log('Background 통신 실패 (정상):', error.message);
  });
}

// 셀렉터 생성 함수
function generateSelector(element) {
  // 하이라이트 클래스 제거
  const cleanElement = element.cloneNode(true);
  cleanElement.classList.remove('element-selector-highlight');
  
  // ID가 있으면 우선 사용
  if (cleanElement.id) {
    return `#${cleanElement.id}`;
  }
  
  // Long/Short 버튼의 경우 텍스트 기반으로 구분
  const elementText = element.textContent?.trim().toLowerCase();
  if (elementText && (elementText.includes('long') || elementText.includes('short'))) {
    console.log(`🎯 Long/Short 버튼 감지: "${element.textContent.trim()}"`);
    
    // 같은 클래스를 가진 버튼들 중에서 텍스트로 구분
    const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
    const sameClassButtons = allButtons.filter(btn => 
      btn.className === element.className && 
      btn.textContent?.trim()
    );
    
    if (sameClassButtons.length > 1) {
      const index = sameClassButtons.indexOf(element);
      if (index !== -1) {
        // nth-child 사용하여 정확한 버튼 선택
        const baseSelector = `.${element.className.split(' ').join('.')}`;
        console.log(`🔧 Long/Short 버튼 구분: ${baseSelector}:nth-child(${index + 1})`);
        return `${baseSelector}:nth-child(${index + 1})`;
      }
    }
  }
  
  // 클래스명에서 하이라이트 클래스 제거 후 사용
  if (cleanElement.className) {
    const classes = cleanElement.className.split(' ')
      .filter(cls => cls.trim() && !cls.includes('element-selector-highlight'));
    
    if (classes.length > 0) {
      const selector = `.${classes.join('.')}`;
      
      // 셀렉터가 유일한지 확인
      const elements = document.querySelectorAll(selector);
      if (elements.length === 1) {
        return selector;
      } else if (elements.length > 1) {
        // 여러 요소가 있으면 nth-of-type 추가
        const index = Array.from(elements).indexOf(element);
        if (index !== -1) {
          console.log(`🔧 중복 셀렉터 구분: ${selector}:nth-of-type(${index + 1})`);
          return `${selector}:nth-of-type(${index + 1})`;
        }
      }
      
      return selector;
    }
  }
  
  // 태그명과 위치 기반 셀렉터
  const tagName = cleanElement.tagName.toLowerCase();
  const parent = cleanElement.parentElement;
  
  // 부모 컨테이너부터 시작하여 더 구체적인 셀렉터 생성
  let currentElement = element;
  const selectorParts = [];
  
  // 최대 4단계까지 부모를 거슬러 올라가며 셀렉터 구성
  for (let i = 0; i < 4 && currentElement; i++) {
    let part = currentElement.tagName.toLowerCase();
    
    // 클래스가 있으면 추가 (Long/Short 구분에 중요한 클래스 우선)
    if (currentElement.className) {
      const classes = currentElement.className.split(' ')
        .filter(cls => cls.trim() && !cls.includes('element-selector-highlight'));
      
      // Long/Short 구분에 중요한 클래스들 우선 선택
      const importantClasses = classes.filter(c => 
        c.includes('80d6b0c8') || c.includes('c1f4796') || // Long/Short 구분 클래스
        c.includes('button') || c.includes('btn') ||
        c.includes('gui_') || // Gate.io 특정 클래스
        (c.length > 5 && c.length < 20) // 적당한 길이의 클래스
      );
      
      if (importantClasses.length > 0) {
        // 중요한 클래스들을 모두 포함 (Long/Short 구분을 위해)
        part += '.' + importantClasses.join('.');
      } else if (classes.length > 0) {
        // 중요한 클래스가 없으면 처음 3개만 사용
        part += '.' + classes.slice(0, 3).join('.');
      }
    }
    
    // ID가 있으면 추가
    if (currentElement.id) {
      part = `#${currentElement.id}`;
      selectorParts.unshift(part);
      break; // ID가 있으면 더 이상 올라갈 필요 없음
    }
    
    selectorParts.unshift(part);
    currentElement = currentElement.parentElement;
    
    // 충분히 구체적인 셀렉터가 만들어졌으면 중단
    if (selectorParts.join(' > ').length > 100) {
      break;
    }
  }
  
  let selector = selectorParts.join(' > ');
  
  // 셀렉터가 너무 길면 마지막 3단계만 사용
  if (selector.length > 300) {
    selector = selectorParts.slice(-3).join(' > ');
  }
  
  console.log(`🔧 생성된 셀렉터: ${selector.substring(0, 100)}${selector.length > 100 ? '...' : ''}`);
  return selector;
}

// CSS 스타일 주입 (요소 하이라이트용)
const style = document.createElement('style');
style.textContent = `
  .element-selector-highlight {
    outline: 2px solid #ff9800 !important;
    outline-offset: 2px !important;
    background-color: rgba(255, 152, 0, 0.1) !important;
    cursor: crosshair !important;
  }
`;
document.head.appendChild(style);

// 페이지 로드 완료 후 Background에 알림
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('페이지 로드 완료');
    notifyBackground();
  });
} else {
  console.log('페이지 이미 로드됨');
  notifyBackground();
}

function notifyBackground() {
  chrome.runtime.sendMessage({
    action: 'pageLoaded',
    exchange: currentExchange,
    url: window.location.href,
    title: document.title
  }).catch(error => {
    console.log('Background 통신 실패 (정상):', error.message);
  });
}

// ============================================
// 매크로 녹화 시스템
// ============================================
console.log('=== 매크로 녹화 시스템 ===');

let isMacroRecording = false;
let currentMacroType = null; // 'long' or 'short'
let recordedActions = [];
let macroRecordingStartTime = null;
let macroEventController = null; // AbortController for cleanup
let recordingThrottle = null; // 녹화 throttling

// 저장된 매크로들
let savedMacros = {
  long: [],
  short: []
};

// 매크로 녹화 시작 (성능 최적화)
function startMacroRecording(macroType) {
  console.log(`매크로 녹화 시작: ${macroType}`);
  
  isMacroRecording = true;
  currentMacroType = macroType;
  recordedActions = [];
  macroRecordingStartTime = Date.now();
  
  // AbortController로 이벤트 관리
  macroEventController = new AbortController();
  const signal = macroEventController.signal;
  
  // 최적화된 이벤트 리스너 (passive 옵션 및 throttling)
  document.addEventListener('click', recordClick, { 
    capture: true, 
    passive: false,
    signal: signal 
  });
  document.addEventListener('input', throttledRecordInput, { 
    capture: true, 
    passive: false,
    signal: signal 
  });
  document.addEventListener('change', recordChange, { 
    capture: true, 
    passive: false,
    signal: signal 
  });
  document.addEventListener('keydown', recordKeydown, { 
    capture: true, 
    passive: false,
    signal: signal 
  });
  
  // 시각적 피드백
  showMacroRecordingIndicator();
  
  console.log(`${macroType} 매크로 녹화 활성화됨`);
}

// 매크로 녹화 중단 (성능 최적화)
function stopMacroRecording() {
  if (!isMacroRecording) return;
  
  console.log(`매크로 녹화 중단: ${currentMacroType}`);
  
  // AbortController로 모든 이벤트 한번에 제거
  if (macroEventController) {
    macroEventController.abort();
    macroEventController = null;
  }
  
  // throttling 정리
  if (recordingThrottle) {
    clearTimeout(recordingThrottle);
    recordingThrottle = null;
  }
  
  // 녹화된 액션 저장
  if (recordedActions.length > 0) {
    savedMacros[currentMacroType] = [...recordedActions];
    console.log(`${currentMacroType} 매크로 저장됨: ${recordedActions.length}개 액션`);
    
    // Background에 매크로 저장 알림
    chrome.runtime.sendMessage({
      action: 'macroRecorded',
      macroType: currentMacroType,
      actions: recordedActions
    }).catch(error => {
      console.log('Background 통신 실패 (정상):', error.message);
    });
  }
  
  // 상태 초기화
  isMacroRecording = false;
  currentMacroType = null;
  recordedActions = [];
  
  // 시각적 피드백 제거
  hideMacroRecordingIndicator();
}

// 클릭 이벤트 녹화 (하이브리드 방식 - 키워드 + 셀렉터 + 위치)
function recordClick(event) {
  if (!isMacroRecording) return;
  
  const element = event.target;
  const selector = generateSelector(element);
  const timestamp = Date.now() - macroRecordingStartTime;
  
  // 클릭된 요소의 상세 정보 수집
  const elementInfo = {
    text: element.textContent?.trim() || '',
    id: element.id || '',
    className: element.className || '',
    tagName: element.tagName.toLowerCase(),
    type: element.type || '',
    value: element.value || ''
  };
  
  // 클릭 유형 분석
  const clickType = analyzeClickType(elementInfo);
  
  const action = {
    type: 'click',
    selector: selector,
    timestamp: timestamp,
    elementText: elementInfo.text.substring(0, 50),
    elementType: elementInfo.tagName,
    elementId: elementInfo.id,
    elementClass: elementInfo.className,
    elementValue: elementInfo.value,
    clickType: clickType, // 클릭 유형 추가
    keywords: extractElementKeywords(element), // 키워드 수집
    position: getElementPosition(element) // 위치 정보 수집
  };
  
  recordedActions.push(action);
  
  console.log(`🖱️ 클릭 녹화됨 [${clickType}]: "${elementInfo.text}" -> ${selector}`);
  console.log(`   - 키워드: ${action.keywords.join(', ')}`);
  console.log(`   - 위치: (${action.position.x}, ${action.position.y})`);
  
  if (elementInfo.id) console.log(`   - ID: ${elementInfo.id}`);
  if (elementInfo.className) console.log(`   - Class: ${elementInfo.className}`);
}

// 클릭 유형 분석 함수
function analyzeClickType(elementInfo) {
  const text = elementInfo.text.toLowerCase();
  const allText = (elementInfo.text + ' ' + elementInfo.id + ' ' + elementInfo.className).toLowerCase();
  
  // Open/Close 탭 구분 (Gate.io Hedge 모드)
  if (text.includes('open')) {
    return 'OPEN_TAB';
  }
  if (text.includes('close')) {
    return 'CLOSE_TAB';
  }
  
  // Long/Short 버튼 구분
  if (text.includes('long') || text.includes('매수') || text.includes('buy')) {
    return 'LONG_BUTTON';
  }
  if (text.includes('short') || text.includes('매도') || text.includes('sell')) {
    return 'SHORT_BUTTON';
  }
  
  // 주문 유형
  if (text.includes('market') || text.includes('시장가')) {
    return 'MARKET_ORDER';
  }
  if (text.includes('limit') || text.includes('지정가')) {
    return 'LIMIT_ORDER';
  }
  
  // 주문 실행
  if (text.includes('submit') || text.includes('확인') || text.includes('주문')) {
    return 'ORDER_SUBMIT';
  }
  
  // 탭 전환
  if (allText.includes('tab') || allText.includes('open') || allText.includes('close')) {
    return 'TAB_SWITCH';
  }
  
  return 'GENERAL_CLICK';
}

// Throttled 입력 이벤트 녹화 (성능 최적화)
function throttledRecordInput(event) {
  if (!isMacroRecording) return;
  
  // 100ms throttling으로 과도한 입력 이벤트 제한
  if (recordingThrottle) {
    clearTimeout(recordingThrottle);
  }
  
  recordingThrottle = setTimeout(() => {
    recordInput(event);
  }, 100);
}

// 입력 이벤트 녹화 (하이브리드 방식 - 키보드 입력 최적화)
function recordInput(event) {
  if (!isMacroRecording) return;
  
  const element = event.target;
  const value = element.value;
  const selector = generateSelector(element);
  const timestamp = Date.now() - macroRecordingStartTime;
  
  // 숫자 입력인지 확인
  const isNumericInput = /^\d*\.?\d*$/.test(value) && value !== '';
  
  // Amount 필드 더 정확한 판단
  const isAmountField = isNumericInput && isLikelyAmountField(element, value);
  
  if (isAmountField) {
    // Amount 필드인 경우: 중복 제거하고 필드 정보만 저장
    const existingAmountAction = recordedActions.find(action => 
      action.type === 'amountField' && action.selector === selector
    );
    
    if (!existingAmountAction) {
      const action = {
        type: 'amountField', // 특별한 타입으로 구분
        selector: selector,
        timestamp: timestamp,
        elementType: element.type || 'text',
        elementId: element.id || '',
        elementClass: element.className || '',
        elementName: element.name || '',
        placeholder: element.placeholder || '',
        keywords: extractElementKeywords(element),
        position: getElementPosition(element)
      };
      
      recordedActions.push(action);
      console.log(`🎯 Amount 필드 위치 저장됨: ${selector}`);
      console.log(`   - 키워드: ${action.keywords.join(', ')}`);
      console.log(`   - 위치: (${action.position.x}, ${action.position.y})`);
    }
  } else {
    // 일반 입력 필드는 기존 방식으로 처리 (하지만 연속 입력은 마지막 값만)
    const existingInputAction = recordedActions.findIndex(action => 
      action.type === 'input' && action.selector === selector
    );
    
    const action = {
      type: 'input',
      selector: selector,
      value: value,
      timestamp: timestamp,
      elementType: element.type || 'text',
      placeholder: element.placeholder || '',
      elementId: element.id || '',
      elementClass: element.className || '',
      elementName: element.name || ''
    };
    
    if (existingInputAction !== -1) {
      // 기존 입력 액션 업데이트 (마지막 값으로)
      recordedActions[existingInputAction] = action;
      console.log(`📝 일반 입력 업데이트됨: ${value} -> ${selector}`);
    } else {
      recordedActions.push(action);
      console.log(`📝 일반 입력 녹화됨: ${value} -> ${selector}`);
    }
  }
}

// Amount 필드인지 더 정확하게 판단하는 함수
function isLikelyAmountField(element, value) {
  // 기본 숫자 입력 체크
  const isNumeric = /^\d*\.?\d*$/.test(value) && value !== '';
  if (!isNumeric) return false;
  
  // 텍스트 기반 판단 (ID, Class, Name, Placeholder)
  const text = (
    (element.id || '') + ' ' +
    (element.className || '') + ' ' +
    (element.name || '') + ' ' +
    (element.placeholder || '')
  ).toLowerCase();
  
  // Amount 관련 키워드
  const amountKeywords = [
    'amount', 'quantity', 'qty', 'size', 'volume', 
    '수량', '금액', '거래량', 'trade', 'order'
  ];
  
  // 제외할 키워드 (레버리지, 가격 등)
  const excludeKeywords = [
    'leverage', 'price', 'stop', 'limit', 'percent', '%',
    '레버리지', '가격', '손절', '익절', 'sl', 'tp'
  ];
  
  // 제외 키워드가 있으면 Amount 필드가 아님
  for (const keyword of excludeKeywords) {
    if (text.includes(keyword)) {
      console.log(`❌ Amount 필드 제외: ${keyword} 키워드 발견`);
      return false;
    }
  }
  
  // Amount 키워드가 있으면 Amount 필드
  for (const keyword of amountKeywords) {
    if (text.includes(keyword)) {
      console.log(`✅ Amount 필드 확인: ${keyword} 키워드 발견`);
      return true;
    }
  }
  
  // 값의 크기로 판단 (일반적으로 Amount는 소수점이 있는 작은 값)
  const numValue = parseFloat(value);
  if (numValue > 0 && numValue < 1000 && value.includes('.')) {
    console.log(`✅ Amount 필드 추정: 소수점 포함 작은 값 (${value})`);
    return true;
  }
  
  // 레버리지 같은 정수값은 제외
  if (Number.isInteger(numValue) && numValue >= 1 && numValue <= 125) {
    console.log(`❌ Amount 필드 제외: 레버리지 추정값 (${value})`);
    return false;
  }
  
  console.log(`❓ Amount 필드 불확실: ${value}`);
  return false;
}

// 요소에서 키워드 추출하는 함수
function extractElementKeywords(element) {
  const keywords = [];
  
  // 텍스트 내용
  const text = element.textContent?.trim();
  if (text) keywords.push(text);
  
  // ID
  if (element.id) keywords.push(element.id);
  
  // 클래스명들
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c.length > 2);
    keywords.push(...classes);
  }
  
  // name 속성
  if (element.name) keywords.push(element.name);
  
  // placeholder
  if (element.placeholder) keywords.push(element.placeholder);
  
  // 부모 요소의 텍스트 (라벨 등)
  const parent = element.parentElement;
  if (parent) {
    const parentText = parent.textContent?.trim();
    if (parentText && parentText !== text && parentText.length < 50) {
      keywords.push(parentText);
    }
  }
  
  // 중복 제거 및 정리
  return [...new Set(keywords)].filter(k => k && k.length > 0);
}

// 요소의 위치 정보 가져오는 함수
function getElementPosition(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.round(rect.left + rect.width / 2),
    y: Math.round(rect.top + rect.height / 2),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

// 변경 이벤트 녹화 (드롭다운, 체크박스 등)
function recordChange(event) {
  if (!isMacroRecording) return;
  
  const element = event.target;
  const value = element.value;
  const selector = generateSelector(element);
  const timestamp = Date.now() - macroRecordingStartTime;
  
  const action = {
    type: 'change',
    selector: selector,
    value: value,
    timestamp: timestamp,
    elementType: element.tagName.toLowerCase(),
    inputType: element.type || ''
  };
  
  recordedActions.push(action);
  console.log('변경 녹화됨:', action);
}

// 키보드 이벤트 녹화 (Enter, Tab 등)
function recordKeydown(event) {
  if (!isMacroRecording) return;
  
  // 중요한 키만 녹화 (Enter, Tab, Escape)
  if (['Enter', 'Tab', 'Escape'].includes(event.key)) {
    const element = event.target;
    const selector = generateSelector(element);
    const timestamp = Date.now() - macroRecordingStartTime;
    
    const action = {
      type: 'keydown',
      selector: selector,
      key: event.key,
      timestamp: timestamp,
      elementType: element.tagName.toLowerCase()
    };
    
    recordedActions.push(action);
    console.log('키 입력 녹화됨:', action);
  }
}

// ============================================
// 스마트 요소 탐지 시스템 (성능 최적화)
// ============================================

class TradingElementDetector {
  constructor() {
    this.cache = new Map();
    this.lastScan = 0;
    this.CACHE_DURATION = 5000; // 5초 캐시
  }
  
  // 캐시된 요소 탐지
  findTradingElements() {
    const now = Date.now();
    if (now - this.lastScan < this.CACHE_DURATION && this.cache.has('elements')) {
      return this.cache.get('elements');
    }
    
    const elements = this.scanForElements();
    this.cache.set('elements', elements);
    this.lastScan = now;
    
    return elements;
  }
  
  // 효율적인 요소 스캔
  scanForElements() {
    // 1. 특정 영역만 스캔 (전체 DOM 대신)
    const tradingArea = this.findTradingArea();
    
    // 2. 버튼 탐지 (텍스트 기반)
    const buttons = tradingArea.querySelectorAll('button, [role="button"], .btn, div[class*="button"]');
    const longButton = this.findByKeywords(buttons, ['long', 'buy', '매수', '롱']);
    const shortButton = this.findByKeywords(buttons, ['short', 'sell', '매도', '숏']);
    const marketButton = this.findByKeywords(buttons, ['market', '시장가']);
    
    // 3. 입력 필드 탐지 (컨텍스트 기반)
    const inputs = tradingArea.querySelectorAll('input');
    const amountInput = this.findAmountInput(inputs);
    
    return { longButton, shortButton, marketButton, amountInput };
  }
  
  // 거래 영역 찾기
  findTradingArea() {
    const selectors = [
      '[class*="trading"]', '[class*="order"]', '[class*="trade"]',
      '[id*="trading"]', '[id*="order"]'
    ];
    
    for (const selector of selectors) {
      const area = document.querySelector(selector);
      if (area) return area;
    }
    
    return document.body;
  }
  
  // 키워드로 요소 찾기
  findByKeywords(elements, keywords) {
    return Array.from(elements).find(element => {
      const text = (element.textContent || '').toLowerCase();
      const id = (element.id || '').toLowerCase();
      const className = (element.className || '').toLowerCase();
      const allText = text + ' ' + id + ' ' + className;
      
      return keywords.some(keyword => allText.includes(keyword));
    });
  }
  
  // Amount 입력 필드 찾기
  findAmountInput(inputs) {
    return Array.from(inputs).find(input => {
      const context = (
        (input.id || '') + ' ' +
        (input.className || '') + ' ' +
        (input.name || '') + ' ' +
        (input.placeholder || '')
      ).toLowerCase();
      
      const amountKeywords = ['amount', 'quantity', 'qty', 'size', 'volume', '수량', '금액'];
      const excludeKeywords = ['leverage', 'price', 'stop', 'limit', 'percent', '%', '레버리지', '가격'];
      
      // 제외 키워드 확인
      for (const keyword of excludeKeywords) {
        if (context.includes(keyword)) return false;
      }
      
      // Amount 키워드 확인
      return amountKeywords.some(keyword => context.includes(keyword));
    });
  }
  
  // 캐시 클리어
  clearCache() {
    this.cache.clear();
    this.lastScan = 0;
  }
}

// 전역 탐지기 인스턴스
const elementDetector = new TradingElementDetector();

// 현재 실행 중인 매크로 타입 추적
let currentExecutingMacroType = null;

// 현재 매크로 타입 가져오기
function getCurrentMacroType() {
  return currentExecutingMacroType;
}

// 텍스트로 요소 찾기 헬퍼 함수
function findElementByText(texts, selector = '*') {
  const elements = document.querySelectorAll(selector);
  
  for (const element of elements) {
    const elementText = element.textContent?.toLowerCase() || '';
    
    for (const text of texts) {
      if (elementText.includes(text.toLowerCase())) {
        return element;
      }
    }
  }
  
  return null;
}

// 하이브리드 거래 실행 함수 (매크로 + 스마트 탐지)
async function executeSmartTrade(type, amount) {
  console.log(`🎯 하이브리드 거래 실행: ${type}, Amount: ${amount}`);
  
  try {
    // 1. 저장된 매크로에서 요소 정보 가져오기
    const macroData = await getStoredMacroData(type);
    
    if (macroData && macroData.length > 0) {
      console.log(`📋 저장된 매크로 사용: ${macroData.length}개 액션`);
      return await executeHybridMacro(macroData, amount, type);
    } else {
      console.log(`📋 저장된 매크로 없음, 스마트 탐지 사용`);
      return await executeFallbackSmartTrade(type, amount);
    }
    
  } catch (error) {
    console.error(`❌ 하이브리드 거래 실패:`, error.message);
    return { success: false, error: error.message };
  }
}

// 하이브리드 매크로 실행 (셀렉터 우선, 스마트 탐지 백업)
async function executeHybridMacro(actions, amount, macroType) {
  console.log(`🔄 하이브리드 매크로 실행 시작`);
  
  // 현재 실행 중인 매크로 타입 설정
  currentExecutingMacroType = macroType;
  
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    console.log(`${i + 1}/${actions.length}: ${action.type} 실행 중...`);
    
    try {
      let element = null;
      
      // 1단계: 셀렉터로 요소 찾기
      try {
        element = document.querySelector(action.selector);
        if (element) {
          // Long/Short 버튼의 경우 텍스트 검증 추가
          if (action.clickType === 'LONG_BUTTON' || action.clickType === 'SHORT_BUTTON') {
            const elementText = element.textContent?.trim().toLowerCase();
            const expectedText = action.clickType === 'LONG_BUTTON' ? 'long' : 'short';
            
            if (!elementText.includes(expectedText)) {
              console.warn(`⚠️ 텍스트 불일치: 예상="${expectedText}", 실제="${elementText}"`);
              console.warn(`⚠️ 잘못된 버튼 선택됨 - 스마트 탐지로 재시도`);
              element = null; // 텍스트가 맞지 않으면 스마트 탐지로 넘어감
            } else {
              console.log(`✅ 셀렉터로 올바른 ${expectedText.toUpperCase()} 버튼 발견`);
            }
          } else {
            console.log(`✅ 셀렉터로 요소 발견: ${action.selector}`);
          }
        }
      } catch (selectorError) {
        console.log(`❌ 셀렉터 실패: ${selectorError.message}`);
      }
      
      // 2단계: 셀렉터 실패 시 스마트 탐지
      if (!element && action.keywords && action.keywords.length > 0) {
        console.log(`🔍 스마트 탐지 시도: ${action.keywords.join(', ')}`);
        element = findElementByHybridSearch(action);
        if (element) {
          console.log(`✅ 스마트 탐지로 요소 발견`);
        }
      }
      
      // 3단계: 요소를 찾지 못한 경우
      if (!element) {
        console.warn(`⚠️ 요소를 찾을 수 없음: ${action.selector}`);
        continue;
      }
      
      // 4단계: 액션 실행
      await executeHybridAction(action, element, amount);
      await sleep(200); // 액션 간 대기
      
    } catch (actionError) {
      console.error(`❌ 액션 실행 실패:`, actionError.message);
      continue;
    }
  }
  
  console.log(`✅ 하이브리드 매크로 실행 완료`);
  
  // 매크로 타입 초기화
  currentExecutingMacroType = null;
  
  return { success: true, message: '하이브리드 거래 완료' };
}

// 하이브리드 검색으로 요소 찾기 (개선된 정확도)
function findElementByHybridSearch(action) {
  console.log(`🔍 하이브리드 검색 시작: ${action.clickType || action.type}`);
  console.log(`   - 찾는 키워드: ${action.keywords.join(', ')}`);
  
  // 키워드 기반 검색
  const allElements = document.querySelectorAll('button, input, [role="button"], div[class*="button"]');
  const candidates = [];
  
  for (const element of allElements) {
    const elementKeywords = extractElementKeywords(element);
    const elementText = element.textContent?.toLowerCase() || '';
    
    // 정확한 키워드 매칭 확인 (부분 매칭에서 정확 매칭으로 개선)
    let matchScore = 0;
    let matchedKeywords = [];
    
    for (const keyword of action.keywords) {
      const keywordLower = keyword.toLowerCase();
      
      // 텍스트 정확 매칭 (우선순위 높음)
      if (elementText === keywordLower) {
        matchScore += 10;
        matchedKeywords.push(`TEXT_EXACT:${keyword}`);
      }
      // 텍스트 포함 매칭
      else if (elementText.includes(keywordLower)) {
        matchScore += 5;
        matchedKeywords.push(`TEXT_CONTAINS:${keyword}`);
      }
      
      // 키워드 정확 매칭
      for (const ek of elementKeywords) {
        if (ek.toLowerCase() === keywordLower) {
          matchScore += 8;
          matchedKeywords.push(`KEYWORD_EXACT:${keyword}`);
        } else if (ek.toLowerCase().includes(keywordLower)) {
          matchScore += 3;
          matchedKeywords.push(`KEYWORD_CONTAINS:${keyword}`);
        }
      }
    }
    
    if (matchScore > 0) {
      candidates.push({
        element,
        matchScore,
        matchedKeywords,
        text: elementText,
        position: getElementPosition(element)
      });
    }
  }
  
  if (candidates.length === 0) {
    console.log(`❌ 매칭되는 요소 없음`);
    return null;
  }
  
  // 매치 스코어 순으로 정렬
  candidates.sort((a, b) => b.matchScore - a.matchScore);
  
  console.log(`🎯 후보 요소들:`);
  candidates.slice(0, 3).forEach((candidate, index) => {
    console.log(`   ${index + 1}. "${candidate.text}" (점수: ${candidate.matchScore})`);
    console.log(`      매칭: ${candidate.matchedKeywords.join(', ')}`);
  });
  
  // 최고 점수 요소 선택
  const bestCandidate = candidates[0];
  
  // 위치 정보로 최종 검증 (있는 경우)
  if (action.position) {
    const distance = Math.sqrt(
      Math.pow(bestCandidate.position.x - action.position.x, 2) + 
      Math.pow(bestCandidate.position.y - action.position.y, 2)
    );
    
    console.log(`📍 위치 검증: 거리 ${Math.round(distance)}px`);
    
    // 위치가 너무 많이 변경된 경우 경고하지만 실행은 계속
    if (distance > 100) {
      console.warn(`⚠️ 위치 변경됨: ${Math.round(distance)}px (계속 진행)`);
    }
  }
  
  console.log(`✅ 선택된 요소: "${bestCandidate.text}" (점수: ${bestCandidate.matchScore})`);
  return bestCandidate.element;
}

// 하이브리드 액션 실행 (탭 검증 추가)
async function executeHybridAction(action, element, amount) {
  switch (action.type) {
    case 'click':
      // Open/Close 탭 검증 (Gate.io Hedge 모드)
      if (action.clickType === 'OPEN_TAB' || action.clickType === 'CLOSE_TAB') {
        console.log(`📋 ${action.clickType} 클릭 - 포지션 ${action.clickType === 'OPEN_TAB' ? '진입' : '종료'} 모드`);
        
        // Open 탭인지 확인 (Long/Short 매크로 모두 Open 탭 필요)
        if (action.clickType === 'CLOSE_TAB') {
          console.warn(`⚠️ Close 탭 클릭됨 - 포지션 종료 모드로 전환`);
        }
      }
      
      element.click();
      console.log(`🖱️ 클릭 실행: ${action.clickType || 'CLICK'}`);
      
      // 중요한 클릭인 경우 추가 확인
      if (action.clickType === 'OPEN_TAB' || action.clickType === 'CLOSE_TAB') {
        console.log(`⚠️  중요: ${action.clickType} 클릭됨!`);
      }
      if (action.clickType === 'LONG_BUTTON' || action.clickType === 'SHORT_BUTTON') {
        console.log(`⚠️  중요: ${action.clickType} 클릭됨!`);
      }
      break;
      
    case 'amountField':
      // Amount 필드에 계산된 값 입력
      element.focus();
      element.value = amount;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`🎯 Amount 입력: ${amount}`);
      break;
      
    case 'input':
      // 일반 입력 (원래 값 사용)
      element.focus();
      element.value = action.value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`📝 입력 실행: ${action.value}`);
      break;
      
    case 'keydown':
      // 키 입력
      const keyEvent = new KeyboardEvent('keydown', { key: action.key, bubbles: true });
      element.dispatchEvent(keyEvent);
      console.log(`⌨️ 키 입력: ${action.key}`);
      break;
      
    default:
      console.log(`❓ 알 수 없는 액션 타입: ${action.type}`);
  }
}

// 저장된 매크로 데이터 가져오기
async function getStoredMacroData(type) {
  try {
    const key = `${type}Macro`;
    const result = await chrome.storage.local.get([key]);
    return result[key] || [];
  } catch (error) {
    console.error('매크로 데이터 로드 실패:', error);
    return [];
  }
}

// 백업용 스마트 거래 (매크로가 없을 때)
async function executeFallbackSmartTrade(type, amount) {
  const elements = elementDetector.findTradingElements();
  
  if (!elements.longButton || !elements.shortButton) {
    throw new Error('거래 버튼을 찾을 수 없습니다');
  }
  
  if (!elements.amountInput) {
    throw new Error('Amount 입력 필드를 찾을 수 없습니다');
  }
  
  // 1단계: 포지션 버튼 클릭
  const button = type === 'long' ? elements.longButton : elements.shortButton;
  console.log(`1단계: ${type} 버튼 클릭`);
  button.click();
  
  await sleep(200);
  
  // 2단계: Amount 입력
  console.log(`2단계: Amount 입력 (${amount})`);
  elements.amountInput.focus();
  elements.amountInput.value = amount;
  elements.amountInput.dispatchEvent(new Event('input', { bubbles: true }));
  elements.amountInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  await sleep(200);
  
  // 3단계: Market 버튼 클릭 (있는 경우)
  if (elements.marketButton) {
    console.log('3단계: Market 버튼 클릭');
    elements.marketButton.click();
    await sleep(200);
  }
  
  console.log(`✅ ${type} 백업 거래 준비 완료`);
  return { success: true, message: `${type} 백업 거래 준비 완료` };
}

// ============================================
// 매크로 재생 시스템
// ============================================

// 매크로 재생
async function playMacro(macroType, amount) {
  console.log(`매크로 재생 시작: ${macroType}, Amount: ${amount}`);
  
  // Chrome Storage에서 매크로 불러오기
  let actions = savedMacros[macroType];
  
  if (!actions || actions.length === 0) {
    console.log(`메모리에 매크로가 없음. Storage에서 불러오는 중...`);
    
    try {
      const key = `${macroType}Macro`;
      const result = await chrome.storage.local.get([key]);
      actions = result[key];
      
      if (actions && actions.length > 0) {
        savedMacros[macroType] = actions; // 메모리에 캐시
        console.log(`Storage에서 ${macroType} 매크로 불러옴:`, actions.length, '개 액션');
      } else {
        console.log(`저장된 ${macroType} 매크로가 없습니다.`);
        return;
      }
    } catch (error) {
      console.error('매크로 불러오기 실패:', error);
      return;
    }
  }
  
  console.log(`${actions.length}개의 액션 재생 시작`);
  
  // 전체 액션 목록 출력 (디버깅용)
  console.log('📋 매크로 액션 목록:');
  actions.forEach((action, index) => {
    if (action.type === 'input') {
      console.log(`  ${index + 1}. INPUT: ${action.value} -> ${action.selector} ${action.isAmountField ? '(🎯 Amount 필드)' : '(일반 입력)'}`);
      if (action.elementId) console.log(`      - ID: ${action.elementId}`);
      if (action.placeholder) console.log(`      - Placeholder: ${action.placeholder}`);
    } else if (action.type === 'click') {
      const clickType = action.elementText ? analyzeClickType({
        text: action.elementText,
        id: action.elementId || '',
        className: action.elementClass || ''
      }) : 'UNKNOWN';
      console.log(`  ${index + 1}. CLICK [${clickType}]: "${action.elementText}" -> ${action.selector}`);
      if (action.elementId) console.log(`      - ID: ${action.elementId}`);
    } else {
      console.log(`  ${index + 1}. ${action.type.toUpperCase()}: ${action.selector} ${action.elementText ? `"${action.elementText}"` : ''}`);
    }
  });
  
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    
    try {
      await executeAction(action, amount);
      
      // 다음 액션까지의 대기 시간 계산
      if (i < actions.length - 1) {
        const nextAction = actions[i + 1];
        const delay = Math.max(100, nextAction.timestamp - action.timestamp);
        await sleep(delay);
      }
    } catch (error) {
      console.error(`액션 실행 실패:`, action, error);
    }
  }
  
  console.log('매크로 재생 완료');
}

// 개별 액션 실행
async function executeAction(action, amount) {
  const element = document.querySelector(action.selector);
  if (!element) {
    console.warn(`요소를 찾을 수 없음: ${action.selector}`);
    return;
  }
  
  switch (action.type) {
    case 'click':
      const clickType = action.elementText ? analyzeClickType({
        text: action.elementText,
        id: action.elementId || '',
        className: action.elementClass || ''
      }) : 'UNKNOWN';
      
      element.click();
      console.log(`🖱️ 클릭 실행 [${clickType}]: "${action.elementText}" -> ${action.selector}`);
      
      // 중요한 클릭인 경우 추가 확인
      if (clickType === 'LONG_BUTTON' || clickType === 'SHORT_BUTTON') {
        console.log(`⚠️  중요: ${clickType} 클릭됨!`);
      }
      break;
      
    case 'input':
      if (action.isAmountField && amount) {
        // Amount 필드인 경우 계산된 값 사용
        console.log(`🎯 Amount 필드 대체: ${action.value} → ${amount} (${action.selector})`);
        element.value = amount;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`Amount 입력 완료: ${amount} -> ${action.selector}`);
      } else {
        // 일반 입력 필드는 원래 값 사용
        console.log(`📝 일반 입력 실행: ${action.value} -> ${action.selector}`);
        element.value = action.value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        
        // 추가 정보 출력
        if (action.elementId) console.log(`   - ID: ${action.elementId}`);
        if (action.elementClass) console.log(`   - Class: ${action.elementClass}`);
        if (action.placeholder) console.log(`   - Placeholder: ${action.placeholder}`);
      }
      break;
      
    case 'change':
      element.value = action.value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`변경 실행: ${action.value} -> ${action.selector}`);
      break;
      
    case 'keydown':
      const keyEvent = new KeyboardEvent('keydown', {
        key: action.key,
        bubbles: true
      });
      element.dispatchEvent(keyEvent);
      console.log(`키 입력 실행: ${action.key} -> ${action.selector}`);
      break;
  }
}

// 유틸리티 함수: 대기
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 매크로 녹화 시각적 표시
function showMacroRecordingIndicator() {
  // 기존 표시기 제거
  hideMacroRecordingIndicator();
  
  const indicator = document.createElement('div');
  indicator.id = 'macro-recording-indicator';
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    ">
      🔴 ${currentMacroType.toUpperCase()} RECORDING
    </div>
    <style>
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }
    </style>
  `;
  
  document.body.appendChild(indicator);
}

// 매크로 녹화 표시기 제거
function hideMacroRecordingIndicator() {
  const indicator = document.getElementById('macro-recording-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// 자본금 추출 테스트 (개발용 - 셀렉터 예시)
console.log('자본금 추출 테스트 실행');
setTimeout(() => {
  // 예시 셀렉터들 (실제로는 사용자가 지정)
  const testSelectors = [
    '[class*="balance"]',
    '.balance',
    '[data-testid="balance"]'
  ];
  
  testSelectors.forEach(selector => {
    const balance = extractBalance(selector);
    if (balance) {
      console.log('자본금 추출 성공:', balance);
    }
  });
}, 2000);
