// DOM 요소 가져오기
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDot = document.querySelector('.status-dot');
const statusText = document.querySelector('.status-text');
const exchangeSelect = document.getElementById('exchangeSelect');
const goToExchangeBtn = document.getElementById('goToExchangeBtn');
const leverageValueInput = document.getElementById('leverageValue');
// const tradingModeSelect = document.getElementById('tradingMode'); // 제거됨
const positionValueInput = document.getElementById('positionValue');
const stoplossValueInput = document.getElementById('stoplossValue');
const tp1ValueInput = document.getElementById('tp1Value');
const tp2ValueInput = document.getElementById('tp2Value');
const slRecordBtn = document.getElementById('slRecordBtn');
const closeRecordBtn = document.getElementById('closeRecordBtn');
const tp1RecordBtn = document.getElementById('tp1RecordBtn');
const tp2RecordBtn = document.getElementById('tp2RecordBtn');
const extractAssetsBtn = document.getElementById('extractAssetsBtn');
const extractPriceBtn = document.getElementById('extractPriceBtn');
const longRecordBtn = document.getElementById('longRecordBtn');
const shortRecordBtn = document.getElementById('shortRecordBtn');
const manualLongBtn = document.getElementById('manualLongBtn');
const manualShortBtn = document.getElementById('manualShortBtn');
const resetAllBtn = document.getElementById('resetAllBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');
const currentAssets = document.getElementById('currentAssets');
const currentPrice = document.getElementById('currentPrice');
const currentAmount = document.getElementById('currentAmount');

let isTrading = false;
let isSelecting = false;
let currentSelectionType = 'balance'; // 'balance' or 'price'
let savedSelector = null;
let savedPriceSelector = null;
let savedSelectors = {
  assets: null,
  price: null
};
let extractionInterval = null;

// Exchange URL Mapping
const exchangeUrls = {
  binance: 'https://www.binance.com',
  gateio: 'https://www.gate.io',
  upbit: 'https://upbit.com',
  coinbase: 'https://www.coinbase.com'
};

// ============================================
// Content Script 수동 주입 함수
// ============================================

async function injectContentScript() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 이미 주입되었는지 확인
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      if (response && response.status === 'ready') {
        console.log('✅ Content Script가 이미 주입되어 있습니다.');
        return true;
      }
    } catch (error) {
      // Content Script가 주입되지 않았음
      console.log('📝 Content Script 주입 중...');
    }
    
    // Content Script 주입
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/content.js']
    });
    
    console.log('✅ Content Script 주입 완료');
    return true;
  } catch (error) {
    console.error('❌ Content Script 주입 실패:', error);
    return false;
  }
}

// Content Script와 안전하게 통신하는 함수
async function sendMessageToContentScript(message) {
  try {
    // Content Script 주입 확인
    const injected = await injectContentScript();
    if (!injected) {
      throw new Error('Content Script 주입 실패');
    }
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    console.error('❌ Content Script 통신 실패:', error);
    throw error;
  }
}

// ============================================
// Exchange Selection and Navigation Function
// ============================================
console.log('=== Exchange Selection Function ===');

// Exchange selection change event
exchangeSelect.addEventListener('change', async () => {
  const selectedExchange = exchangeSelect.value;
  console.log('Selected Exchange:', selectedExchange);
  
  // Enable/disable go button
  goToExchangeBtn.disabled = !selectedExchange;
  
  // Save settings
  await chrome.storage.local.set({ selectedExchange });
});


// Leverage 입력 변경 시 저장 및 Amount 재계산
leverageValueInput.addEventListener('change', () => {
  saveSettings();
  // Amount 재계산
  currentAmount.textContent = calculateAmount();
});

// Leverage 입력 중 실시간 Amount 업데이트
leverageValueInput.addEventListener('input', () => {
  currentAmount.textContent = calculateAmount();
});

// Trading Mode 변경 시 버튼 상태 업데이트
// Trading mode 제거됨

// Position 입력 변경 시 저장 및 Amount 재계산
positionValueInput.addEventListener('change', () => {
  saveSettings();
  // Amount 재계산
  currentAmount.textContent = calculateAmount();
});

// Position 입력 중 실시간 Amount 업데이트
positionValueInput.addEventListener('input', () => {
  currentAmount.textContent = calculateAmount();
});

// Stoploss 값 변경 시 설정 저장
stoplossValueInput.addEventListener('input', () => {
  saveSettings();
});

// 거래소로 이동 버튼 클릭 이벤트
goToExchangeBtn.addEventListener('click', async () => {
  const selectedExchange = exchangeSelect.value;
  const url = exchangeUrls[selectedExchange];
  
  if (url) {
    console.log('거래소로 이동:', url);
    await chrome.tabs.create({ url });
  }
});

// ============================================
// 자본금 추출 기능
// ============================================
console.log('=== 자본금 추출 기능 ===');

// 자본금 추출 버튼 클릭 이벤트
extractAssetsBtn.addEventListener('click', async () => {
  console.log('자본금 추출 버튼 클릭됨');
  
  // 기존 셀렉터 제거 후 새로 설정
  console.log('기존 셀렉터 제거 후 새로 설정');
  savedSelector = null;
  await chrome.storage.local.remove(['balanceSelector']);
  
  // 요소 선택 모드 시작
  await startElementSelection('balance');
});

// 현재가 추출 버튼 클릭 이벤트
extractPriceBtn.addEventListener('click', async () => {
  console.log('현재가 추출 버튼 클릭됨');
  
  // 기존 셀렉터 제거 후 새로 설정
  console.log('기존 셀렉터 제거 후 새로 설정');
  savedPriceSelector = null;
  await chrome.storage.local.remove(['priceSelector']);
  
  // 요소 선택 모드 시작
  await startElementSelection('price');
});

// ============================================
// 매크로 녹화 기능
// ============================================

// 녹화 상태 추적 변수
let isLongRecording = false;
let isShortRecording = false;

// Long 매크로 녹화
longRecordBtn.addEventListener('click', async () => {
  console.log('Long 매크로 녹화 클릭됨, 현재 상태:', isLongRecording);
  
  if (isLongRecording) {
    // 녹화 중단
    await stopMacroRecording('long');
    isLongRecording = false;
  } else {
    // 녹화 시작
    await startMacroRecording('long');
    isLongRecording = true;
  }
});

// Short 매크로 녹화
shortRecordBtn.addEventListener('click', async () => {
  console.log('Short 매크로 녹화 클릭됨, 현재 상태:', isShortRecording);
  
  if (isShortRecording) {
    // 녹화 중단
    await stopMacroRecording('short');
    isShortRecording = false;
  } else {
    // 녹화 시작
    await startMacroRecording('short');
    isShortRecording = true;
  }
});

// ============================================
// 수동 매매 기능
// ============================================

// Manual Long 버튼
manualLongBtn.addEventListener('click', async () => {
  console.log('Manual Long 클릭됨');
  
  // 매크로 존재 여부 확인
  const macros = await loadMacros();
  if (!macros.longMacro || macros.longMacro.length === 0) {
    alert('Long 매크로가 녹화되지 않았습니다. 먼저 Long Record 버튼으로 매크로를 녹화해주세요.');
    return;
  }
  
  const calculatedAmount = calculateAmount();
  if (!calculatedAmount || calculatedAmount === '-') {
    alert('Amount를 계산할 수 없습니다. Assets와 Price를 먼저 추출해주세요.');
    return;
  }
  
  console.log(`Long 매크로 실행 시도: Amount=${calculatedAmount}, 액션 수=${macros.longMacro.length}`);
  
  // 매크로 내용 미리보기 (처음 5개 액션)
  console.log('Long 매크로 미리보기:');
  macros.longMacro.slice(0, 5).forEach((action, index) => {
    if (action.type === 'input') {
      console.log(`  ${index + 1}. INPUT: ${action.value} -> ${action.selector} ${action.isAmountField ? '(🎯 Amount 필드)' : '(일반 입력)'}`);
    } else if (action.type === 'click') {
      console.log(`  ${index + 1}. CLICK: "${action.elementText}" -> ${action.selector}`);
    } else {
      console.log(`  ${index + 1}. ${action.type.toUpperCase()}: ${action.selector}`);
    }
  });
  
  // Long/Short 버튼 클릭 확인
  const hasLongClick = macros.longMacro.some(action => 
    action.type === 'click' && 
    action.elementText && 
    (action.elementText.toLowerCase().includes('long') || 
     action.elementText.toLowerCase().includes('buy') ||
     action.elementText.toLowerCase().includes('매수'))
  );
  
  if (!hasLongClick) {
    console.warn('⚠️  경고: Long 매크로에 Long/Buy 버튼 클릭이 없습니다!');
    const confirmed = confirm('Long 매크로에 Long/Buy 버튼 클릭이 감지되지 않았습니다.\n매크로를 다시 녹화하시겠습니까?');
    if (confirmed) {
      await startMacroRecording('long');
      return;
    }
  }
  
  // 스마트 거래 시스템 사용
  await executeSmartTrade('long', calculatedAmount);
});

// Manual Short 버튼
manualShortBtn.addEventListener('click', async () => {
  console.log('Manual Short 클릭됨');
  
  // 매크로 존재 여부 확인
  const macros = await loadMacros();
  if (!macros.shortMacro || macros.shortMacro.length === 0) {
    alert('Short 매크로가 녹화되지 않았습니다. 먼저 Short Record 버튼으로 매크로를 녹화해주세요.');
    return;
  }
  
  const calculatedAmount = calculateAmount();
  if (!calculatedAmount || calculatedAmount === '-') {
    alert('Amount를 계산할 수 없습니다. Assets와 Price를 먼저 추출해주세요.');
    return;
  }
  
  console.log(`Short 매크로 실행 시도: Amount=${calculatedAmount}, 액션 수=${macros.shortMacro.length}`);
  
  // 매크로 내용 미리보기 (처음 5개 액션)
  console.log('Short 매크로 미리보기:');
  macros.shortMacro.slice(0, 5).forEach((action, index) => {
    if (action.type === 'input') {
      console.log(`  ${index + 1}. INPUT: ${action.value} -> ${action.selector} ${action.isAmountField ? '(🎯 Amount 필드)' : '(일반 입력)'}`);
    } else if (action.type === 'click') {
      console.log(`  ${index + 1}. CLICK: "${action.elementText}" -> ${action.selector}`);
    } else {
      console.log(`  ${index + 1}. ${action.type.toUpperCase()}: ${action.selector}`);
    }
  });
  
  // Long/Short 버튼 클릭 확인
  const hasShortClick = macros.shortMacro.some(action => 
    action.type === 'click' && 
    action.elementText && 
    (action.elementText.toLowerCase().includes('short') || 
     action.elementText.toLowerCase().includes('sell') ||
     action.elementText.toLowerCase().includes('매도'))
  );
  
  if (!hasShortClick) {
    console.warn('⚠️  경고: Short 매크로에 Short/Sell 버튼 클릭이 없습니다!');
    const confirmed = confirm('Short 매크로에 Short/Sell 버튼 클릭이 감지되지 않았습니다.\n매크로를 다시 녹화하시겠습니까?');
    if (confirmed) {
      await startMacroRecording('short');
      return;
    }
  }
  
  // 스마트 거래 시스템 사용
  await executeSmartTrade('short', calculatedAmount);
});

// ============================================
// 데이터 관리 기능
// ============================================

// Reset All Data 버튼
resetAllBtn.addEventListener('click', async () => {
  const confirmed = confirm('모든 데이터를 초기화하시겠습니까?\n(셀렉터, 매크로, 설정이 모두 삭제됩니다)');
  
  if (confirmed) {
    await resetAllData();
  }
});

// Export Data 버튼
exportDataBtn.addEventListener('click', async () => {
  await exportAllData();
});

// Import Data 버튼
importDataBtn.addEventListener('click', () => {
  importFileInput.click();
});

// 파일 선택 시 Import 실행
importFileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    await importAllData(file);
    // 파일 입력 초기화
    importFileInput.value = '';
  }
});

// 모든 데이터 초기화
async function resetAllData() {
  try {
    console.log('모든 데이터 초기화 시작');
    
    // Chrome Storage 완전 초기화
    await chrome.storage.local.clear();
    
    // 메모리 변수 초기화
    isTrading = false;
    savedSelector = null;
    savedPriceSelector = null;
    savedSelectors = {
      assets: null,
      price: null
    };
    isLongRecording = false;
    isShortRecording = false;
    
    // UI 초기화
    exchangeSelect.value = '';
    leverageValueInput.value = 1;
    positionValueInput.value = 100;
    stoplossValueInput.value = 2;
    // tradingModeSelect.value = 'oneway'; // 제거됨
    
    // Trading Status 초기화
    currentAssets.textContent = '-';
    currentPrice.textContent = '-';
    currentAmount.textContent = '-';
    
    // 버튼 상태 초기화
    updateSelectorButtonStates();
    updateMacroButtonStates();
    updateUI();
    
    // 주기적 추출 중단
    stopPeriodicExtraction();
    
    console.log('✅ 모든 데이터 초기화 완료');
    alert('모든 데이터가 초기화되었습니다.');
    
  } catch (error) {
    console.error('데이터 초기화 실패:', error);
    alert('데이터 초기화에 실패했습니다.');
  }
}

// 모든 데이터 내보내기
async function exportAllData() {
  try {
    console.log('데이터 내보내기 시작');
    
    // 모든 저장된 데이터 가져오기
    const allData = await chrome.storage.local.get(null);
    
    // 현재 설정 추가
    const exportData = {
      ...allData,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    // JSON 파일로 다운로드
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tradingbot-data-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    console.log('✅ 데이터 내보내기 완료');
    alert('데이터가 성공적으로 내보내졌습니다.');
    
  } catch (error) {
    console.error('데이터 내보내기 실패:', error);
    alert('데이터 내보내기에 실패했습니다.');
  }
}

// 모든 데이터 가져오기
async function importAllData(file) {
  try {
    console.log('데이터 가져오기 시작');
    
    const text = await file.text();
    const importData = JSON.parse(text);
    
    // 버전 확인 (향후 호환성을 위해)
    if (importData.version && importData.version !== '1.0') {
      console.warn('다른 버전의 데이터입니다:', importData.version);
    }
    
    // exportDate와 version 제거
    delete importData.exportDate;
    delete importData.version;
    
    // 기존 데이터 백업 (선택사항)
    const backupData = await chrome.storage.local.get(null);
    console.log('기존 데이터 백업:', Object.keys(backupData).length, '개 항목');
    
    // 새 데이터로 교체
    await chrome.storage.local.clear();
    await chrome.storage.local.set(importData);
    
    // UI 새로고침
    await loadSettings();
    updateSelectorButtonStates();
    updateMacroButtonStates();
    
    console.log('✅ 데이터 가져오기 완료:', Object.keys(importData).length, '개 항목');
    alert('데이터가 성공적으로 가져와졌습니다.');
    
  } catch (error) {
    console.error('데이터 가져오기 실패:', error);
    alert('데이터 가져오기에 실패했습니다. 파일 형식을 확인해주세요.');
  }
}

// 매크로 녹화 시작
async function startMacroRecording(type) {
  console.log(`${type} 매크로 녹화 시작`);
  
  // 녹화 상태 업데이트
  updateMacroRecordingUI(type, true);
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 매크로 녹화 시작 메시지 전송
    setTimeout(async () => {
      try {
        await sendMessageToContentScript({ 
          action: 'startMacroRecording',
          macroType: type
        });
        console.log(`${type} 매크로 녹화 모드 활성화됨`);
      } catch (error) {
        console.error('매크로 녹화 시작 실패:', error);
        updateMacroRecordingUI(type, false);
      }
    }, 500);
    
  } catch (error) {
    console.error('Content Script 주입 실패:', error);
    updateMacroRecordingUI(type, false);
  }
}

// 매크로 녹화 중단
async function stopMacroRecording(type) {
  console.log(`${type} 매크로 녹화 중단`);
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Content Script에 녹화 중단 메시지 전송
    await sendMessageToContentScript({ 
      action: 'stopMacroRecording'
    });
    
    console.log(`${type} 매크로 녹화 중단 완료`);
  } catch (error) {
    console.error('매크로 녹화 중단 실패:', error);
  }
  
  // 녹화 상태 초기화
  if (type === 'long') {
    isLongRecording = false;
  } else if (type === 'short') {
    isShortRecording = false;
  }
  
  // UI 즉시 업데이트
  updateMacroRecordingUI(type, false);
}

// 매크로 녹화 UI 업데이트
function updateMacroRecordingUI(type, isRecording) {
  const button = type === 'long' ? longRecordBtn : shortRecordBtn;
  
  if (isRecording) {
    button.disabled = false; // 녹화 중에도 클릭 가능하게 변경
    button.textContent = 'Stop Recording';
    button.style.opacity = '1';
    button.style.backgroundColor = '#f44336'; // 빨간색으로 변경
    button.style.color = 'white';
  } else {
    button.disabled = false;
    button.textContent = `${type === 'long' ? 'Long' : 'Short'} Record`;
    button.style.opacity = '1';
    button.style.backgroundColor = type === 'long' ? '#4caf50' : '#f44336'; // 원래 색상 복원
    button.style.color = 'white';
  }
}

// 매크로 저장
async function saveMacro(macroType, actions) {
  const key = `${macroType}Macro`;
  await chrome.storage.local.set({ [key]: actions });
  console.log(`✅ ${macroType} 매크로 저장됨:`, actions);
}

// 매크로 불러오기
async function loadMacros() {
  const result = await chrome.storage.local.get(['longMacro', 'shortMacro']);
  console.log('✅ 저장된 매크로:', result);
  return result;
}

// 매크로 저장 완료 메시지 표시
function showMacroSavedMessage(macroType, actionCount) {
  const message = `${macroType.toUpperCase()} 매크로 저장 완료! (${actionCount}개 액션)`;
  
  // 임시 알림 표시
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #4caf50;
    color: white;
    padding: 15px 25px;
    border-radius: 5px;
    font-size: 14px;
    font-weight: bold;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // 3초 후 제거
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
  
  console.log(message);
}

// ============================================
// 자동 매매 시스템
// ============================================

// 자동 매매 초기화
async function initializeAutoTrading() {
  console.log('자동 매매 시스템 초기화');
  
  // 저장된 매크로 확인
  const macros = await loadMacros();
  
  if (!macros.longMacro || !macros.shortMacro) {
    console.warn('매크로가 설정되지 않았습니다. Long/Short 매크로를 먼저 녹화해주세요.');
    return;
  }
  
  console.log('매크로 확인 완료:', {
    longActions: macros.longMacro.length,
    shortActions: macros.shortMacro.length
  });
}

// 매크로 실행 (거래 시그널 발생 시 호출)
// 스마트 거래 실행 함수 (매크로 대신 사용)
async function executeSmartTrade(signal, amount) {
  console.log(`🎯 스마트 거래 실행: ${signal}, Amount: ${amount}`);
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('활성 탭을 찾을 수 없습니다.');
    }
    
    console.log(`탭 ID: ${tab.id}, URL: ${tab.url}`);
    
    // Content Script 주입 확인
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });
      console.log('Content Script 주입 완료');
    } catch (injectionError) {
      console.log('Content Script 이미 주입됨 또는 주입 실패:', injectionError.message);
    }
    
    // 잠시 대기 후 메시지 전송
    setTimeout(async () => {
      try {
        // Content Script에 스마트 거래 메시지 전송
        const response = await sendMessageToContentScript({
          action: 'executeSmartTrade',
          tradeType: signal, // 'long' or 'short'
          amount: amount
        });
        
        console.log(`${signal} 스마트 거래 실행 완료:`, response);
        
        if (response && response.success) {
          console.log(`✅ ${signal} 거래 성공: ${response.message}`);
        } else {
          console.error(`❌ ${signal} 거래 실패: ${response?.error || '알 수 없는 오류'}`);
          alert(`거래 실패: ${response?.error || '알 수 없는 오류'}`);
        }
      } catch (messageError) {
        console.error('스마트 거래 메시지 전송 실패:', messageError);
        alert(`거래 실행 실패: ${messageError.message}`);
      }
    }, 500);
    
  } catch (error) {
    console.error('스마트 거래 실행 실패:', error);
    alert(`거래 실행 실패: ${error.message}`);
  }
}

// 기존 매크로 실행 함수 (백업용)
async function executeMacro(signal, amount) {
  console.log(`매크로 실행: ${signal}, Amount: ${amount}`);
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('활성 탭을 찾을 수 없습니다.');
    }
    
    console.log(`탭 ID: ${tab.id}, URL: ${tab.url}`);
    
    // Content Script 주입 확인
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });
      console.log('Content Script 주입 완료');
    } catch (injectionError) {
      console.log('Content Script 이미 주입됨 또는 주입 실패:', injectionError.message);
    }
    
    // 잠시 대기 후 메시지 전송
    setTimeout(async () => {
      try {
        // Content Script에 매크로 재생 메시지 전송
        const response = await sendMessageToContentScript({
          action: 'playMacro',
          macroType: signal, // 'long' or 'short'
          amount: amount
        });
        
        console.log(`${signal} 매크로 실행 완료:`, response);
      } catch (messageError) {
        console.error('매크로 실행 메시지 전송 실패:', messageError);
        alert(`매크로 실행 실패: ${messageError.message}`);
      }
    }, 500);
    
  } catch (error) {
    console.error('매크로 실행 실패:', error);
    alert(`매크로 실행 실패: ${error.message}`);
  }
}

// 거래 시그널 감지 (예시 - 실제로는 기술적 분석 결과)
function detectTradingSignal() {
  // 임시 예시: 랜덤 시그널 생성 (실제로는 볼린저 밴드, RSI 등 분석)
  const signals = ['long', 'short', null];
  const randomSignal = signals[Math.floor(Math.random() * signals.length)];
  
  if (randomSignal) {
    console.log(`🎯 거래 시그널 감지: ${randomSignal.toUpperCase()}`);
    
    // Amount 계산
    const calculatedAmount = calculateAmount();
    
    // 매크로 실행
    executeMacro(randomSignal, calculatedAmount);
  }
  
  return randomSignal;
}

// 요소 선택 모드 시작
async function startElementSelection(type = 'balance') {
  isSelecting = true;
  currentSelectionType = type;
  updateSelectorUI(type);
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Content Script 주입
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/content.js']
    });
    
    // 잠시 대기 후 메시지 전달
    setTimeout(async () => {
      try {
        await sendMessageToContentScript({ action: 'startElementSelection' });
        console.log('요소 선택 모드 활성화됨');
      } catch (error) {
        console.error('메시지 전달 실패:', error);
        isSelecting = false;
        updateSelectorUI();
      }
    }, 500);
    
  } catch (error) {
    console.error('Content Script 주입 실패:', error);
    isSelecting = false;
    updateSelectorUI();
  }
}

// 현재가 추출 실행
async function extractPrice() {
  if (!savedPriceSelector) {
    console.log('저장된 현재가 셀렉터가 없습니다.');
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Content Script 주입
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/content.js']
    });
    
    // 잠시 대기 후 현재가 추출
    setTimeout(async () => {
      try {
        const response = await sendMessageToContentScript({ 
          action: 'getBalance', 
          selector: savedPriceSelector 
        });
        
        console.log('현재가 추출 응답:', response);
        
        if (response && response.balance) {
          const price = response.balance.balance;
          currentPrice.textContent = price;
          console.log('현재가 추출 성공:', price);
          
          // Amount 계산
          currentAmount.textContent = calculateAmount();
        } else {
          currentPrice.textContent = '-';
          currentAmount.textContent = '-';
          console.log('현재가를 찾을 수 없음');
        }
      } catch (error) {
        console.error('현재가 추출 실패:', error);
        currentPrice.textContent = '-';
        currentAmount.textContent = '-';
      }
    }, 500);
    
  } catch (error) {
    console.error('Content Script 주입 실패:', error);
  }
}

// 자본금 추출 실행
async function extractAssets() {
  if (!savedSelector) {
    console.log('저장된 셀렉터가 없습니다.');
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Content Script 주입
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/content.js']
    });
    
    // 잠시 대기 후 자본금 추출
    setTimeout(async () => {
      try {
        const response = await sendMessageToContentScript({ 
          action: 'getBalance', 
          selector: savedSelector
        });
        
        console.log('자본금 추출 응답:', response);
        
        if (response && response.balance) {
          const assets = response.balance.balance;
          currentAssets.textContent = assets;
          console.log('자본금 추출 성공:', assets);
          
          // Amount 계산
          currentAmount.textContent = calculateAmount();
        } else {
          currentAssets.textContent = '-';
          currentAmount.textContent = '-';
        console.log('자본금을 찾을 수 없음');
        }
      } catch (error) {
        console.error('자본금 추출 실패:', error);
        currentAssets.textContent = '-';
        currentAmount.textContent = '-';
      }
    }, 500);
    
  } catch (error) {
    console.error('Content Script 주입 실패:', error);
  }
}

// 주기적 자본금 추출 시작
function startPeriodicExtraction() {
  if (extractionInterval) {
    clearInterval(extractionInterval);
  }
  
  const interval = 1; // 기본값 1초로 고정
  
  // 최소 1초, 최대 300초 제한
  const safeInterval = Math.max(1, Math.min(300, interval));
  
  extractionInterval = setInterval(async () => {
    console.log(`주기적 데이터 추출 실행 (${safeInterval}초 간격)`);
    
    // 자본금 추출
    if (savedSelector) {
      await extractAssets();
    } else {
      console.log('자본금 추출 대기 중 - 셀렉터가 설정되지 않음');
    }
    
    // 현재가 추출
    if (savedPriceSelector) {
      await extractPrice();
    } else {
      console.log('현재가 추출 대기 중 - 셀렉터가 설정되지 않음');
    }
  }, safeInterval * 1000);
  
  console.log(`주기적 데이터 추출 시작: ${safeInterval}초 간격`);
}

// 주기적 자본금 추출 중단
function stopPeriodicExtraction() {
  if (extractionInterval) {
    clearInterval(extractionInterval);
    extractionInterval = null;
    console.log('주기적 자본금 추출 중단');
  }
}

// 셀렉터 UI 업데이트 함수
function updateSelectorUI(type = 'balance') {
  if (isSelecting) {
    // 선택 중인 버튼만 비활성화
    switch (type) {
      case 'balance':
        extractAssetsBtn.disabled = true;
        extractAssetsBtn.textContent = 'Selecting...';
        break;
      case 'price':
        extractPriceBtn.disabled = true;
        extractPriceBtn.textContent = 'Selecting...';
        break;
    }
  } else {
    // 모든 버튼 원래 상태로 복원
    extractAssetsBtn.disabled = false;
    extractAssetsBtn.textContent = 'Assets Extraction';
    extractPriceBtn.disabled = false;
    extractPriceBtn.textContent = 'Price Extraction';
  }
}

// 셀렉터 추출 상태 업데이트
function updateSelectorButtonStates() {
  // Assets Extraction 버튼
  if (savedSelectors.assets) {
    extractAssetsBtn.classList.add('has-data');
    console.log('Assets button: Has data');
  } else {
    extractAssetsBtn.classList.remove('has-data');
    console.log('Assets button: No data');
  }
  
  // Price Extraction 버튼
  if (savedSelectors.price) {
    extractPriceBtn.classList.add('has-data');
    console.log('Price button: Has data');
  } else {
    extractPriceBtn.classList.remove('has-data');
    console.log('Price button: No data');
  }
}

// 매크로 버튼 상태 업데이트
async function updateMacroButtonStates() {
  const macros = await loadMacros();
  
  // Long Record 버튼
  if (macros.longMacro && macros.longMacro.length > 0) {
    longRecordBtn.classList.add('has-macro');
    manualLongBtn.disabled = false;
    console.log('Long macro: Available');
  } else {
    longRecordBtn.classList.remove('has-macro');
    manualLongBtn.disabled = true;
    console.log('Long macro: Not available');
  }
  
  // Short Record 버튼
  if (macros.shortMacro && macros.shortMacro.length > 0) {
    shortRecordBtn.classList.add('has-macro');
    manualShortBtn.disabled = false;
    console.log('Short macro: Available');
  } else {
    shortRecordBtn.classList.remove('has-macro');
    manualShortBtn.disabled = true;
    console.log('Short macro: Not available');
  }
}


// Background로부터 메시지 수신 (선택된 요소 정보)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Popup이 메시지 수신:', request);
  
  if (request.action === 'elementSelected') {
    // 선택된 요소 정보 저장
    const { selector, text } = request;
    
    // 타입에 따라 셀렉터 저장
    if (currentSelectionType === 'balance') {
      savedSelector = selector;
      savedSelectors.assets = selector;
      saveSelectorSettings(selector);
      
      // 자동으로 자본금 추출만 실행
      setTimeout(() => {
        extractAssets();
        console.log('요소 선택 완료 - 자본금 추출만 실행');
      }, 1000);
    } else if (currentSelectionType === 'price') {
      savedPriceSelector = selector;
      savedSelectors.price = selector;
      savePriceSelectorSettings(selector);
      
      // 자동으로 현재가 추출만 실행
      setTimeout(() => {
        extractPrice();
        console.log('요소 선택 완료 - 현재가 추출만 실행');
      }, 1000);
    }
    
    // 선택 모드 종료
    isSelecting = false;
    updateSelectorUI();
    
    // 버튼 상태 업데이트
    updateSelectorButtonStates();
  } else if (request.action === 'macroRecorded') {
    // 매크로 녹화 완료 처리
    console.log(`${request.macroType} 매크로 녹화 완료:`, request.actions);
    
    // 매크로 저장
    saveMacro(request.macroType, request.actions);
    
    // 녹화 상태 초기화
    if (request.macroType === 'long') {
      isLongRecording = false;
    } else if (request.macroType === 'short') {
      isShortRecording = false;
    }
    
    // UI 업데이트
    updateMacroRecordingUI(request.macroType, false);
    
    // 성공 메시지 표시
    showMacroSavedMessage(request.macroType, request.actions.length);
    
    // 매크로 버튼 상태 업데이트
    updateMacroButtonStates();
  }
  
  sendResponse({ received: true });
});

// ============================================
// Storage API: 설정 저장 및 불러오기
// ============================================
console.log('=== Storage API 테스트 ===');

// 설정 저장하기
async function saveSettings() {
  const selectedExchange = exchangeSelect.value;
  const leverage = parseInt(leverageValueInput.value) || 1;
  const position = parseFloat(positionValueInput.value) || 100;
  const stoploss = parseFloat(stoplossValueInput.value) || 2;
  // const tradingMode = tradingModeSelect.value; // 제거됨
  
  await chrome.storage.local.set({
    isTrading: isTrading,
    selectedExchange: selectedExchange,
    leverage: leverage,
    position: position,
    stoploss: stoploss
  });
  console.log('✅ 설정 저장됨:', { isTrading, selectedExchange, leverage, position, stoploss });
}

// 셀렉터 설정 저장
async function saveSelectorSettings(selector) {
  await chrome.storage.local.set({ balanceSelector: selector });
  console.log('✅ 셀렉터 저장됨:', selector);
}

async function savePriceSelectorSettings(selector) {
  await chrome.storage.local.set({ priceSelector: selector });
  console.log('✅ 현재가 셀렉터 저장됨:', selector);
}

// 일반 셀렉터 저장

// 설정 불러오기
async function loadSettings() {
  const result = await chrome.storage.local.get(['isTrading', 'selectedExchange', 'balanceSelector', 'priceSelector', 'leverage', 'position', 'stoploss']);
  console.log('✅ 저장된 설정:', result);
  
  if (result.isTrading !== undefined) {
    isTrading = result.isTrading;
    updateUI();
    
    // 거래 상태가 활성화되어 있으면 주기적 추출 시작
    if (isTrading && savedSelector) {
      setTimeout(() => {
        startPeriodicExtraction();
      }, 2000);
    }
  }
  if (result.selectedExchange) {
    exchangeSelect.value = result.selectedExchange;
    goToExchangeBtn.disabled = false;
  }
  if (result.leverage) {
    leverageValueInput.value = result.leverage;
  }
  if (result.position !== undefined) {
    positionValueInput.value = result.position;
  } else {
    // 기본값 100% 설정
    positionValueInput.value = 100;
  }
  if (result.stoploss !== undefined) {
    stoplossValueInput.value = result.stoploss;
  } else {
    // 기본값 2% 설정
    stoplossValueInput.value = 2;
  }
  // if (result.tradingMode) {
  //   tradingModeSelect.value = result.tradingMode;
  // } // 제거됨
  
  // 모든 셀렉터 로드
  if (result.balanceSelector) {
    savedSelector = result.balanceSelector;
    savedSelectors.assets = result.balanceSelector;
    
    // 저장된 셀렉터가 있으면 자동으로 자본금 추출만 실행
    setTimeout(() => {
      extractAssets();
      console.log('설정 로드 완료 - 자본금 추출만 실행');
    }, 1000);
  }
  
  if (result.priceSelector) {
    savedPriceSelector = result.priceSelector;
    savedSelectors.price = result.priceSelector;
    
    // 저장된 현재가 셀렉터가 있으면 자동으로 현재가 추출만 실행
    setTimeout(() => {
      extractPrice();
      console.log('설정 로드 완료 - 현재가 추출만 실행');
    }, 1000);
  }
  
  // 셀렉터 버튼 상태 업데이트
  updateSelectorButtonStates();
  
  // 매크로 버튼 상태 업데이트
  updateMacroButtonStates();
}

// ============================================
// Runtime/Messages API: Popup ↔ Background 통신
// ============================================
console.log('=== Messages API 테스트 ===');

// Background에 메시지 보내기
async function sendMessageToBackground(message) {
  try {
    const response = await chrome.runtime.sendMessage(message);
    console.log('✅ Background 응답:', response);
    return response;
  } catch (error) {
    console.error('❌ 메시지 전송 실패:', error);
  }
}

// Background로부터 메시지 수신 대기
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('✅ Popup이 메시지 수신:', request);
  sendResponse({ received: true });
});

// 거래 시작 버튼 클릭 이벤트
startBtn.addEventListener('click', async () => {
  console.log('거래 시작 버튼 클릭됨');
  
  // Check exchange selection
  if (!exchangeSelect.value) {
    alert('Please select an exchange first.');
    return;
  }
  
  // 상태 변경
  isTrading = true;
  updateUI();
  
  // 설정 저장
  await saveSettings();
  
  // 주기적 자본금 추출 시작
  console.log('거래 시작 - 주기적 추출 시작 시도');
  startPeriodicExtraction();
  
  // 텔레그램 폴링 시작 (연결되어 있는 경우)
  await startTelegramPolling();
  
  // 매크로 기반 자동 매매 준비
  console.log('매크로 기반 자동 매매 준비 완료 (텔레그램 폴링 포함)');
  initializeAutoTrading();
  
  // Background에 메시지 전송
  await sendMessageToBackground({ 
    action: 'startTrading', 
    status: 'active',
    exchange: exchangeSelect.value
  });
});

// 거래 중단 버튼 클릭 이벤트
stopBtn.addEventListener('click', async () => {
  console.log('거래 중단 버튼 클릭됨');
  
  // 상태 변경
  isTrading = false;
  updateUI();
  
  // 설정 저장
  await saveSettings();
  
  // 주기적 자본금 추출 중단
  stopPeriodicExtraction();
  
  // 텔레그램 폴링 중단
  await stopTelegramPolling();
  
  // Background에 메시지 전송
  await sendMessageToBackground({ action: 'stopTrading', status: 'inactive' });
});

// UI 업데이트 함수
// Amount 계산 함수
function calculateAmount() {
  const assetsText = currentAssets.textContent.trim();
  const priceText = currentPrice.textContent.trim();
  const leverage = parseInt(leverageValueInput.value) || 1;
  const position = parseFloat(positionValueInput.value) || 100;
  
  // Assets와 Price가 유효한 값인지 확인
  if (assetsText === '-' || priceText === '-') {
    return '-';
  }
  
  // Assets와 Price가 숫자로 변환 가능한지 확인
  const assetsNum = parseFloat(assetsText.replace(/[^0-9.-]/g, ''));
  const priceNum = parseFloat(priceText.replace(/[^0-9.-]/g, ''));
  
  if (isNaN(assetsNum) || isNaN(priceNum) || priceNum === 0) {
    return '-';
  }
  
  // Amount = Assets * Leverage * Position(%) / Price / 100
  const amount = (assetsNum * leverage * position) / priceNum / 100;
  
  // 소수점 4자리까지 표시
  return amount.toFixed(4);
}

function updateUI() {
  if (isTrading) {
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusDot.classList.add('active');
    statusText.textContent = 'Trading';
  } else {
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusDot.classList.remove('active');
    statusText.textContent = 'Standby';
  }
}

// ============================================
// 초기화: 페이지 로드 시 실행
// ============================================
console.log('사이드 패널 UI 로드 완료');

// 초기화 함수
async function initializePanel() {
  console.log('사이드 패널 초기화 시작 - 거래 상태 강제 중단');
  
  // 현재 탭 정보 저장
  try {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (currentTab) {
      await chrome.storage.local.set({ 
        sidePanelTabId: currentTab.id,
        sidePanelUrl: currentTab.url 
      });
      console.log('🔧 사이드패널 탭 정보 저장:', currentTab.id, currentTab.url);
    }
  } catch (error) {
    console.log('탭 정보 저장 실패:', error.message);
  }
  
  // 거래 상태를 항상 중단으로 초기화
  isTrading = false;
  stopPeriodicExtraction();
  
  // 설정 로드 (거래 상태는 강제로 false로 설정)
  await loadSettings();
  
  // 거래 상태를 다시 false로 강제 설정
  isTrading = false;
  await saveSettings();
  
  console.log('거래 상태 초기화 완료 - 항상 중단 상태로 시작');
}

// 초기 설정 불러오기
initializePanel();

// ============================================
// 탭 변경 감지하여 사이드패널 닫기
// ============================================
let tabCheckInterval = null;

// 주기적으로 현재 탭 확인
function startTabMonitoring() {
  if (tabCheckInterval) {
    clearInterval(tabCheckInterval);
  }
  
  tabCheckInterval = setInterval(async () => {
    try {
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const result = await chrome.storage.local.get(['sidePanelTabId', 'sidePanelUrl']);
      
      if (currentTab && result.sidePanelTabId) {
        // 탭 ID가 다르거나 URL이 변경된 경우
        if (currentTab.id !== result.sidePanelTabId || currentTab.url !== result.sidePanelUrl) {
          console.log('🔄 탭 변경 감지됨 - 사이드패널 닫기');
          console.log('이전:', result.sidePanelTabId, result.sidePanelUrl);
          console.log('현재:', currentTab.id, currentTab.url);
          
          // 사이드패널 닫기
          window.close();
        }
      }
    } catch (error) {
      console.log('탭 모니터링 오류:', error.message);
    }
  }, 1000); // 1초마다 확인
  
  console.log('🔍 탭 변경 모니터링 시작');
}

// 탭 모니터링 중단
function stopTabMonitoring() {
  if (tabCheckInterval) {
    clearInterval(tabCheckInterval);
    tabCheckInterval = null;
    console.log('🛑 탭 변경 모니터링 중단');
  }
}

// 탭 모니터링 시작
startTabMonitoring();

// 사이드 패널 닫힘 감지
window.addEventListener('beforeunload', async () => {
  console.log('사이드 패널 닫힘 감지 - 거래 중단 및 모니터링 중단 실행');
  
  // 탭 모니터링 중단
  stopTabMonitoring();
  
  if (isTrading) {
    // 거래 상태 변경
    isTrading = false;
    
    // 주기적 추출 중단
    stopPeriodicExtraction();
    
    // 설정 저장
    await saveSettings();
    
    // Background에 거래 중단 메시지 전송
    try {
      await chrome.runtime.sendMessage({ 
        action: 'stopTrading', 
        status: 'inactive' 
      });
      console.log('사이드 패널 닫힘으로 인한 거래 중단 완료');
    } catch (error) {
      console.log('Background 통신 실패 (정상):', error.message);
    }
  }
  
  // 사이드패널 탭 정보 정리
  try {
    await chrome.storage.local.remove(['sidePanelTabId', 'sidePanelUrl']);
  } catch (error) {
    console.log('탭 정보 정리 실패 (정상):', error.message);
  }
});

// 페이지 가시성 변경 감지 (추가 안전장치)
document.addEventListener('visibilitychange', async () => {
  if (document.hidden && isTrading) {
    console.log('페이지 숨김 감지 - 거래 중단 실행');
    
    // 거래 상태 변경
    isTrading = false;
    
    // 주기적 추출 중단
    stopPeriodicExtraction();
    
    // 설정 저장
    await saveSettings();
    
    // Background에 거래 중단 메시지 전송
    try {
      await chrome.runtime.sendMessage({ 
        action: 'stopTrading', 
        status: 'inactive' 
      });
      console.log('페이지 숨김으로 인한 거래 중단 완료');
    } catch (error) {
      console.log('Background 통신 실패 (정상):', error.message);
    }
  }
});

// 잘못된 셀렉터 초기화 (하이라이트 클래스가 포함된 경우)
if (savedSelector && savedSelector.includes('element-selector-highlight')) {
  console.log('잘못된 셀렉터 감지, 초기화:', savedSelector);
  savedSelector = null;
  chrome.storage.local.remove(['balanceSelector']);
  selectedSelector.textContent = '';
  selectedText.textContent = '';
  updateSelectorUI();
}

// ESC 키로 녹화 중단
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (isLongRecording) {
      stopMacroRecording('long');
      isLongRecording = false;
      console.log('ESC로 Long 녹화 중단');
    }
    if (isShortRecording) {
      stopMacroRecording('short');
      isShortRecording = false;
      console.log('ESC로 Short 녹화 중단');
    }
  }
});

// 브라우저 종료 시 데이터 정리 (선택사항)
window.addEventListener('beforeunload', () => {
  console.log('브라우저 종료 감지');
  // 필요 시 임시 데이터 정리
  stopTabMonitoring();
  stopPeriodicExtraction();
});

// 확장 프로그램 종료 시 정리
chrome.runtime.onSuspend?.addListener(() => {
  console.log('확장 프로그램 일시 중단');
  stopPeriodicExtraction();
});

// 설정 변경 시 자동 저장

// ============================================
// Telegram Auto Trading 기능
// ============================================

// 텔레그램 관련 DOM 요소
const botTokenInput = document.getElementById('botToken');
const chatIdInput = document.getElementById('chatId');
const userSymbolInput = document.getElementById('userSymbol');
const testTelegramConnectionBtn = document.getElementById('testTelegramConnection');
const telegramStatusMessage = document.getElementById('telegramStatusMessage');

// 텔레그램 봇 인스턴스
let telegramBot = null;
let telegramPollingInterval = null;
let isTelegramTrading = false;
let signalParser = null;

// 텔레그램 설정 로드
async function loadTelegramSettings() {
  try {
    const result = await chrome.storage.local.get(['telegramSettings']);
    if (result.telegramSettings) {
      const settings = result.telegramSettings;
      botTokenInput.value = settings.botToken || '';
      chatIdInput.value = settings.chatId || '';
      userSymbolInput.value = settings.userSymbol || '';
      
      console.log('텔레그램 설정 로드됨:', {
        botToken: settings.botToken ? 'Set' : 'Empty',
        chatId: settings.chatId || 'Empty',
        userSymbol: settings.userSymbol || 'Empty'
      });
    }
  } catch (error) {
    console.error('텔레그램 설정 로드 실패:', error);
  }
}

// 텔레그램 설정 저장
async function saveTelegramSettings() {
  try {
    const settings = {
      botToken: botTokenInput.value.trim(),
      chatId: chatIdInput.value.trim(),
      userSymbol: userSymbolInput.value.trim().toUpperCase()
    };
    
    await chrome.storage.local.set({ telegramSettings: settings });
    console.log('텔레그램 설정 저장됨:', {
      botToken: settings.botToken ? 'Set' : 'Empty',
      chatId: settings.chatId || 'Empty',
      userSymbol: settings.userSymbol || 'Empty'
    });
  } catch (error) {
    console.error('텔레그램 설정 저장 실패:', error);
  }
}

// 상태 메시지 표시
function showTelegramStatus(message, type = 'info') {
  telegramStatusMessage.textContent = message;
  telegramStatusMessage.className = `status-message ${type}`;
  
  console.log(`Telegram Status [${type}]:`, message);
  
  // 3초 후 자동 숨김 (에러 메시지는 5초)
  const hideDelay = type === 'error' ? 5000 : 3000;
  setTimeout(() => {
    telegramStatusMessage.className = 'status-message';
  }, hideDelay);
}

// 텔레그램 연결 테스트
async function testTelegramConnection() {
  try {
    const botToken = botTokenInput.value.trim();
    const chatId = chatIdInput.value.trim();
    const userSymbol = userSymbolInput.value.trim();
    
    if (!botToken || !chatId) {
      showTelegramStatus('Bot Token and Chat ID are required', 'error');
      return;
    }
    
    showTelegramStatus('Testing connection...', 'info');
    testTelegramConnectionBtn.disabled = true;
    
    // 텔레그램 봇 인스턴스 생성
    telegramBot = new TelegramBot(botToken, chatId);
    
    // 연결 테스트
    const result = await telegramBot.testConnection();
    
    if (result.success) {
      const symbolInfo = userSymbol ? ` (${userSymbol} only)` : '';
      showTelegramStatus(`Connected: @${result.botInfo.username}${symbolInfo}`, 'success');
      
      // 설정 저장
      await saveTelegramSettings();
      
      // UI 업데이트 - 연결 성공 시 Start Trading 버튼 활성화
      // (텔레그램 연결이 되어야 자동매매 가능)
      
      console.log('텔레그램 연결 성공:', result.botInfo);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('텔레그램 연결 테스트 실패:', error);
    showTelegramStatus(`Connection failed: ${error.message}`, 'error');
  } finally {
    testTelegramConnectionBtn.disabled = false;
  }
}

// 심볼 업데이트
function updateTelegramSymbol() {
  const userSymbol = userSymbolInput.value.trim().toUpperCase();
  
  if (telegramBot) {
    // 여기서는 봇 인스턴스에 심볼 설정 기능이 없으므로 설정만 저장
    saveTelegramSettings();
    
    const symbolInfo = userSymbol ? userSymbol : 'All symbols';
    showTelegramStatus(`Symbol updated: ${symbolInfo}`, 'info');
    
    console.log('심볼 업데이트됨:', userSymbol);
  }
}

// 텔레그램 폴링 시작 (상단 Start Trading 버튼에서 호출)
async function startTelegramPolling() {
  try {
    if (!telegramBot) {
      console.log('❌ 텔레그램 봇이 연결되지 않음 - 폴링 시작 불가');
      console.log('💡 해결방법: Settings에서 Bot Token과 Chat ID를 입력하고 Test Connection을 먼저 실행하세요');
      return false;
    }
    
    console.log('✅ 텔레그램 봇 연결 상태 확인됨');
    
    if (isTelegramTrading) {
      console.log('이미 텔레그램 폴링 실행 중');
      return true;
    }
    
    console.log('텔레그램 폴링 시작...');
    
    // 신호 파서 초기화
    const userSymbol = userSymbolInput.value.trim();
    if (!userSymbol) {
      throw new Error('거래할 심볼을 입력해주세요 (예: BTC)');
    }
    
    // SignalParser 클래스 존재 확인
    if (typeof SignalParser === 'undefined') {
      throw new Error('SignalParser 클래스가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
    }
    
    signalParser = new SignalParser(userSymbol);
    console.log(`📊 신호 파서 초기화 완료: ${userSymbol}`);
    
    // 폴링 시작 (3초 간격)
    telegramPollingInterval = setInterval(async () => {
      await pollTelegramMessages();
    }, 3000);
    
    isTelegramTrading = true;
    
    // 시작 알림 전송
    await telegramBot.sendMessage(`🤖 Auto trading started (${userSymbol} only)`);
    
    console.log('텔레그램 폴링 시작됨');
    return true;
    
  } catch (error) {
    console.error('텔레그램 폴링 시작 실패:', error);
    return false;
  }
}

// 텔레그램 폴링 중단 (상단 Stop Trading 버튼에서 호출)
async function stopTelegramPolling() {
  try {
    if (telegramPollingInterval) {
      clearInterval(telegramPollingInterval);
      telegramPollingInterval = null;
    }
    
    isTelegramTrading = false;
    
    // 중단 알림 전송
    if (telegramBot) {
      await telegramBot.sendMessage('⏸️ Auto trading stopped');
    }
    
    console.log('텔레그램 폴링 중단됨');
    
  } catch (error) {
    console.error('텔레그램 폴링 중단 실패:', error);
  }
}

// 메시지 폴링 및 신호 파싱 (Phase 8-2 구현 완료)
async function pollTelegramMessages() {
  try {
    if (!telegramBot || !isTelegramTrading || !signalParser) return;
    
    const messages = await telegramBot.getUpdates();
    
    if (messages.length > 0) {
      console.log(`${messages.length}개의 새 메시지 수신:`, messages);
      
      for (const message of messages) {
        await processSignalMessage(message);
      }
    }
  } catch (error) {
    console.error('메시지 폴링 오류:', error);
  }
}

// 신호 메시지 처리 및 자동 매크로 실행
async function processSignalMessage(message) {
  try {
    if (!message.text) {
      console.log('❌ 메시지에 텍스트가 없음:', message);
      return;
    }
    
    console.log('📨 메시지 처리 시작:', message.text);
    console.log('🔧 signalParser 상태:', signalParser ? '✅ 존재' : '❌ 없음');
    
    // TEST 메시지 처리 (기존 기능 유지)
    if (message.text.toUpperCase().includes('TEST')) {
      await telegramBot.sendMessage(`✅ Test message received: ${message.text}`);
      return;
    }
    
    // 신호 파싱
    if (!signalParser) {
      console.log('❌ signalParser가 초기화되지 않음');
      await telegramBot.sendMessage('⚠️ 신호 파서가 초기화되지 않았습니다. 자동매매를 다시 시작해주세요.');
      return;
    }
    
    const parsedSignal = signalParser.parseSignal(message.text);
    console.log('🔍 파싱 결과:', parsedSignal);
    
    if (!parsedSignal) {
      console.log('❌ 신호 파싱 실패 - 지원하지 않는 형식');
      return;
    }
    
    // 신호 유효성 검증
    const validation = signalParser.validateSignal(parsedSignal);
    
    if (!validation.valid) {
      console.log(`❌ 신호 검증 실패: ${validation.reason}`);
      
      // 심볼 불일치인 경우에는 텔레그램 알림 보내지 않음 (스팸 방지)
      if (!validation.reason.includes('심볼 불일치')) {
        await telegramBot.sendMessage(`⚠️ 신호 처리 실패: ${validation.reason}`);
      }
      return;
    }
    
    console.log(`✅ 유효한 신호 감지:`, parsedSignal);
    
    // 자동 매크로 실행
    await executeAutoTrade(parsedSignal);
    
  } catch (error) {
    console.error('신호 메시지 처리 오류:', error);
    await telegramBot.sendMessage(`❌ 신호 처리 중 오류 발생: ${error.message}`);
  }
}

// 자동 매크로 실행
async function executeAutoTrade(signal) {
  try {
    console.log(`🚀 자동 매크로 실행 시작: ${signal.action} ${signal.symbol}`);
    
    let macroResult;
    
    if (signal.action === 'LONG') {
      // Long 매크로 실행
      macroResult = await executeLongMacro();
      
    } else if (signal.action === 'SHORT') {
      // Short 매크로 실행  
      macroResult = await executeShortMacro();
      
    } else {
      throw new Error(`지원하지 않는 액션: ${signal.action}`);
    }
    
    // 실행 결과에 따른 알림 전송
    if (macroResult && macroResult.success) {
      const successMessage = `✅ ${signal.symbol} ${signal.action} 매크로 실행 성공!\n` +
                           `📊 신호: ${signal.originalMessage}\n` +
                           `⏰ 실행 시간: ${new Date().toLocaleString('ko-KR')}`;
      
      await telegramBot.sendMessage(successMessage);
      console.log('✅ 자동 매크로 실행 성공');
      
    } else {
      const errorMessage = `❌ ${signal.symbol} ${signal.action} 매크로 실행 실패\n` +
                          `📊 신호: ${signal.originalMessage}\n` +
                          `🚨 오류: ${macroResult?.error || '알 수 없는 오류'}`;
      
      await telegramBot.sendMessage(errorMessage);
      console.log('❌ 자동 매크로 실행 실패:', macroResult?.error);
    }
    
  } catch (error) {
    console.error('자동 매크로 실행 오류:', error);
    
    const errorMessage = `❌ ${signal.symbol} ${signal.action} 매크로 실행 중 오류 발생\n` +
                        `📊 신호: ${signal.originalMessage}\n` +
                        `🚨 오류: ${error.message}`;
    
    await telegramBot.sendMessage(errorMessage);
  }
}

// 텔레그램 이벤트 리스너 등록
if (testTelegramConnectionBtn) {
  testTelegramConnectionBtn.addEventListener('click', testTelegramConnection);
}
if (userSymbolInput) {
  userSymbolInput.addEventListener('change', updateTelegramSymbol);
}

// 기존 DOMContentLoaded 이벤트에 텔레그램 설정 로드 추가
document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup loaded with Telegram support');
  loadSettings();
  loadTelegramSettings(); // 텔레그램 설정 로드 추가
  updateUI();
  updateDataDisplay();
  
  // 주기적으로 데이터 업데이트 (1초마다)
  setInterval(updateDataDisplay, 1000);
});
