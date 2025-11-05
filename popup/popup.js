// DOM 요소 가져오기
const tradingToggle = document.getElementById('tradingToggle');
const exchangeSelect = document.getElementById('exchangeSelect');
const goToExchangeBtn = document.getElementById('goToExchangeBtn');
const leverageValueInput = document.getElementById('leverageValue');
// Trading Mode 제거됨 - 항상 One Way Mode로 동작
const tradingModeSelect = null; // 제거됨
const stoplossValueInput = document.getElementById('stoplossValue');
const tp1ValueInput = document.getElementById('tp1Value');
const tp2ValueInput = document.getElementById('tp2Value');
const closeRecordBtn = document.getElementById('closeRecordBtn');
const tp1RecordBtn = document.getElementById('tp1RecordBtn');
const tp2RecordBtn = document.getElementById('tp2RecordBtn');
const extractAssetsBtn = document.getElementById('extractAssetsBtn');
const extractPriceBtn = document.getElementById('extractPriceBtn');
const longRecordBtn = document.getElementById('longRecordBtn');
const shortRecordBtn = document.getElementById('shortRecordBtn');
const manualLongBtn = document.getElementById('manualLongBtn');
const manualShortBtn = document.getElementById('manualShortBtn');
const manualCloseBtn = document.getElementById('manualCloseBtn');
const recordToggle = document.getElementById('recordToggle');
const autoRefreshInterval = document.getElementById('autoRefreshInterval');
const autoRefreshCountdown = document.getElementById('autoRefreshCountdown');
// const resetAllBtn = document.getElementById('resetAllBtn'); // Removed
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');
const currentAssets = document.getElementById('currentAssets');
const currentPrice = document.getElementById('currentPrice');
const currentAmount = document.getElementById('currentAmount');
const stopLossPrice = document.getElementById('stopLossPrice');

let isTrading = false;
let isSelecting = false;
let currentSelectionType = 'balance'; // 'balance' or 'price'
let savedSelector = null;
let savedPriceSelector = null;
let autoRefreshTimer = null; // 자동 새로고침 타이머
let autoRefreshCountdownTimer = null; // 자동 새로고침 카운트다운 타이머
let autoRefreshRemainingTime = 0; // 남은 시간 (초)
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

/**
 * URL이 content script 주입 가능한지 확인
 */
function isInjectableUrl(url) {
  if (!url) return false;
  // chrome://, chrome-extension://, about:, edge:// 등은 제외
  const restrictedProtocols = ['chrome:', 'chrome-extension:', 'about:', 'edge:', 'moz-extension:', 'opera:', 'vivaldi:'];
  try {
    const urlObj = new URL(url);
    return !restrictedProtocols.some(protocol => urlObj.protocol.startsWith(protocol));
  } catch (error) {
    return false;
  }
}

async function injectContentScript() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // URL 체크
    if (!tab || !tab.url || !isInjectableUrl(tab.url)) {
      console.log('⚠️ Content Script 주입 불가능한 URL:', tab?.url);
      return false;
    }
    
    // 이미 주입되었는지 확인
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      if (response && response.status === 'ready') {
        return true;
      }
    } catch (error) {
      // Content Script가 주입되지 않았음
    }
    
    // Content Script 주입
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/content.js']
    });
    
    return true;
  } catch (error) {
    // 에러 메시지를 덜 공격적으로 변경 (정상적인 경우도 있음)
    if (error.message && error.message.includes('Cannot access a chrome://')) {
      console.log('ℹ️ chrome:// URL에서는 Content Script를 주입할 수 없습니다.');
    } else {
      console.error('❌ Content Script 주입 실패:', error);
    }
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

// Exchange selection change event
exchangeSelect.addEventListener('change', async () => {
  const selectedExchange = exchangeSelect.value;
  
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

// Position split inputs are handled in initializeCustomTpSystem()

  // Stoploss 값 변경 시 설정 저장
stoplossValueInput.addEventListener('input', () => {
  saveSettings();
});

// Trading Mode 제거됨 - 항상 One Way Mode로 동작

// Auto Refresh 입력 변경 시 설정 저장 및 타이머 업데이트
if (autoRefreshInterval) {
  autoRefreshInterval.addEventListener('change', () => {
    const minutes = parseInt(autoRefreshInterval.value) || 0;
    // 0-100 범위 검증
    if (minutes < 0) autoRefreshInterval.value = 0;
    if (minutes > 100) autoRefreshInterval.value = 100;
    saveSettings();
  });
  
  autoRefreshInterval.addEventListener('input', () => {
    const minutes = parseInt(autoRefreshInterval.value) || 0;
    // 0-100 범위 검증
    if (minutes < 0) autoRefreshInterval.value = 0;
    if (minutes > 100) autoRefreshInterval.value = 100;
  });
}

// 거래소로 이동 버튼 클릭 이벤트
goToExchangeBtn.addEventListener('click', async () => {
  const selectedExchange = exchangeSelect.value;
  const url = exchangeUrls[selectedExchange];
  
  if (url) {
    await chrome.tabs.create({ url });
  }
});

// ============================================
// 자본금 추출 기능
// ============================================

// 자본금 추출 버튼 클릭 이벤트
extractAssetsBtn.addEventListener('click', async () => {
  // 기존 셀렉터 제거 후 새로 설정
  savedSelector = null;
  await chrome.storage.local.remove(['balanceSelector']);
  
  // 요소 선택 모드 시작
  await startElementSelection('balance');
});

// 현재가 추출 버튼 클릭 이벤트
extractPriceBtn.addEventListener('click', async () => {
  // 기존 셀렉터 제거 후 새로 설정
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
let isCloseRecording = false;

// Long 매크로 녹화
longRecordBtn.addEventListener('click', async () => {
  
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

// SL 매크로 녹화
// Close 매크로 녹화
closeRecordBtn.addEventListener('click', async () => {
  
  if (isCloseRecording) {
    // 녹화 중단
    await stopMacroRecording('close');
    isCloseRecording = false;
  } else {
    // 녹화 시작
    await startMacroRecording('close');
    isCloseRecording = true;
  }
});

// ============================================
// 수동 매매 기능
// ============================================

// Manual Long 버튼
manualLongBtn.addEventListener('click', async () => {
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
  
  // Long/Short 버튼 클릭 확인
  const hasLongClick = macros.longMacro.some(action => 
    action.type === 'click' && 
    action.elementText && 
    (action.elementText.toLowerCase().includes('long') || 
     action.elementText.toLowerCase().includes('buy') ||
     action.elementText.toLowerCase().includes('매수'))
  );
  
  if (!hasLongClick) {
    const confirmed = confirm('Long 매크로에 Long/Buy 버튼 클릭이 감지되지 않았습니다.\n매크로를 다시 녹화하시겠습니까?');
    if (confirmed) {
      await startMacroRecording('long');
      return;
    }
  }
  
  // Manual 버튼: 모든 단계를 한 번에 실행
  await executeSplitEntryAll('long');
});

// Manual Short 버튼
manualShortBtn.addEventListener('click', async () => {
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
  
  // Long/Short 버튼 클릭 확인
  const hasShortClick = macros.shortMacro.some(action => 
    action.type === 'click' && 
    action.elementText && 
    (action.elementText.toLowerCase().includes('short') || 
     action.elementText.toLowerCase().includes('sell') ||
     action.elementText.toLowerCase().includes('매도'))
  );
  
  if (!hasShortClick) {
    const confirmed = confirm('Short 매크로에 Short/Sell 버튼 클릭이 감지되지 않았습니다.\n매크로를 다시 녹화하시겠습니까?');
    if (confirmed) {
      await startMacroRecording('short');
      return;
    }
  }
  
  // Manual 버튼: 모든 단계를 한 번에 실행
  await executeSplitEntryAll('short');
});

  // SL 수동 매매
// Close 수동 매매
manualCloseBtn.addEventListener('click', async () => {
  
  // 매크로 존재 여부 확인
  const macros = await loadMacros();
  if (!macros.closeMacro || macros.closeMacro.length === 0) {
    alert('Close 매크로가 녹화되지 않았습니다. 먼저 Close Record 버튼으로 매크로를 녹화해주세요.');
    return;
  }
  
  
  // Close 매크로는 단순 클릭만 하므로 별도 값 없이 실행
  const result = await executeSmartTrade('close', null);
  
  // Close 실행 성공 시 분할 진입 상태 초기화 및 포지션 비활성화 (StateManager 사용)
  if (result && result.success) {
    resetSplitEntryState();
    currentPosition.isActive = false;
    currentPosition.entryPrice = null;
    currentPosition.type = null;
    
    // StateManager에도 상태 업데이트
    stateManager.setState('position.isActive', false);
    stateManager.setState('position.entryPrice', null);
    stateManager.setState('position.current', null);
    
    updateStopLossPriceDisplay(); // SL 가격 표시 숨김
    
    // TP 상태 초기화
    splitTpStrategy.executedTps = [false, false, false];
    if (customTpStrategy.type === 'trailing') {
      customTpStrategy.maxPrice = null;
      customTpStrategy.trailingStopPrice = null;
    }
    
    // 텔레그램 메시지 및 스크린샷 전송
    if (telegramManager && telegramManager.telegramBot) {
      const closeMessage = `🔄 포지션 종료 완료\n` +
                          `종료 시간: ${new Date().toLocaleString()}\n` +
                          `수동 종료`;
      
      // 1초 딜레이 후 스크린샷 전송
      await telegramManager.sendMessageWithScreenshot(closeMessage, true, 1000);
    }
  }
});

// ============================================
// 데이터 관리 기능
// ============================================

// Reset All Data functionality removed

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

// resetAllData function removed

// 모든 데이터 내보내기
async function exportAllData() {
  try {
    // 모든 저장된 데이터 가져오기 (StorageUtils 사용)
    const allData = await storageUtils.getAllData();
    
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
    
    alert('데이터가 성공적으로 내보내졌습니다.');
    
  } catch (error) {
    alert('데이터 내보내기에 실패했습니다.');
  }
}

// 모든 데이터 가져오기
async function importAllData(file) {
  try {
    const text = await file.text();
    const importData = JSON.parse(text);
    
    // 버전 확인 (향후 호환성을 위해)
    if (importData.version && importData.version !== '1.0') {
      // 다른 버전의 데이터 (경고만 표시, 계속 진행)
    }
    
    // exportDate와 version 제거
    delete importData.exportDate;
    delete importData.version;
    
    // 새 데이터로 교체 (StorageUtils 사용)
    await storageUtils.setAllData(importData);
    
    // UI 새로고침
    await loadSettings();
    updateSelectorButtonStates();
    updateMacroButtonStates();
    
    alert('데이터가 성공적으로 가져와졌습니다.');
    
  } catch (error) {
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
  } else if (type === 'close') {
    isCloseRecording = false;
  }
  
  // UI 즉시 업데이트
  updateMacroRecordingUI(type, false);
}

// 매크로 녹화 UI 업데이트
function updateMacroRecordingUI(type, isRecording) {
  let button;
  let buttonText;
  let originalColor;
  
  switch(type) {
    case 'long':
      button = longRecordBtn;
      buttonText = 'Long Record';
      originalColor = '#4caf50';
      break;
    case 'short':
      button = shortRecordBtn;
      buttonText = 'Short Record';
      originalColor = '#f44336';
      break;
    case 'close':
      button = closeRecordBtn;
      buttonText = 'Close Record';
      originalColor = '#ff5722';
      break;
    default:
      return;
  }
  
  if (isRecording) {
    button.disabled = false; // 녹화 중에도 클릭 가능하게 변경
    button.textContent = 'Stop Recording';
    button.style.opacity = '1';
    button.style.backgroundColor = '#f44336'; // 빨간색으로 변경
    button.style.color = 'white';
  } else {
    button.disabled = false;
    button.textContent = buttonText;
    button.style.opacity = '1';
    button.style.backgroundColor = originalColor; // 원래 색상 복원
    button.style.color = 'white';
  }
}

// 매크로 저장 (StorageUtils 사용)
async function saveMacro(macroType, actions) {
  await storageUtils.saveMacro(macroType, actions);
}

// 매크로 불러오기 (StorageUtils 사용)
async function loadMacros() {
  return await storageUtils.loadMacros(['long', 'short', 'close']);
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
  
}

// 매크로 실행 (거래 시그널 발생 시 호출)
// 스마트 거래 실행 함수 (매크로 대신 사용)
// Manual 버튼용: 모든 분할 진입 단계를 한 번에 실행
async function executeSplitEntryAll(tradeType) {
  // 활성화된 포지션 비율 찾기 (0이 아닌 값들)
  const activePositions = splitEntryStrategy.positions
    .map((pos, index) => ({ value: pos, index }))
    .filter(item => item.value > 0);
  
  if (activePositions.length === 0) {
    alert('활성화된 포지션이 없습니다. Position (%) 입력 필드에 값을 입력해주세요.');
    return { success: false, error: '활성화된 포지션이 없습니다.' };
  }
  
  // 모든 단계 초기화
  splitEntryStrategy.executedEntries = [false, false, false];
  splitEntryStrategy.entryPrices = [null, null, null];
  
  // 순차적으로 각 포지션 진입
  for (let i = 0; i < activePositions.length; i++) {
    const position = activePositions[i];
    const positionPercent = position.value;
    const amount = calculateAmountForPosition(positionPercent);
    
    if (amount === '-' || parseFloat(amount) === 0) {
      console.warn(`⚠️ ${i + 1}단계 진입 건너뜀: Amount 계산 실패 (${positionPercent}%)`);
      continue;
    }
    
    try {
      // 🎯 진입 전에 현재가를 읽어서 진입가로 저장 (진입 후에는 가격이 변동될 수 있음)
      let entryPriceBeforeTrade = null;
      const currentPriceText = currentPrice.textContent.trim();
      if (currentPriceText !== '-') {
        entryPriceBeforeTrade = parseFloat(currentPriceText.replace(/[^0-9.-]/g, ''));
        if (isNaN(entryPriceBeforeTrade) || entryPriceBeforeTrade === 0) {
          entryPriceBeforeTrade = null;
        }
      }
      
      // 각 진입 실행
      await executeSmartTrade(tradeType, amount);
      
      // 진입 성공 시 상태 업데이트
      splitEntryStrategy.executedEntries[position.index] = true;
      
      // 진입 전에 읽은 가격을 진입가로 저장
      if (entryPriceBeforeTrade) {
        splitEntryStrategy.entryPrices[position.index] = entryPriceBeforeTrade;
        
          // 첫 번째 진입 시 포지션 상태 업데이트 및 자동 SL 설정 (StateManager 사용)
          if (i === 0) {
            currentPosition.type = tradeType;
            currentPosition.entryPrice = entryPriceBeforeTrade;
            currentPosition.entryTime = Date.now();
            currentPosition.isActive = true;
            
            // StateManager에도 상태 저장
            stateManager.setState('position.current', tradeType);
            stateManager.setState('position.entryPrice', entryPriceBeforeTrade);
            stateManager.setState('position.entryTime', Date.now());
            stateManager.setState('position.isActive', true);
          
          console.log(`📊 진입가 기록: ${entryPriceBeforeTrade} (포지션: ${tradeType})`);
          
          // Split TP 상태 초기화
          splitTpStrategy.executedTps = [false, false, false];
          
          // Trailing TP 상태 초기화
          if (customTpStrategy.type === 'trailing') {
            customTpStrategy.maxPrice = null;
            customTpStrategy.trailingStopPrice = null;
          }
          
            // 스탑로스 가격 표시 업데이트 (진입가가 설정된 직후)
            updateStopLossPriceDisplay();
            
            // 첫 번째 진입 후 자동으로 스탑로스 설정 (기록된 진입가 사용)
            await autoSetStopLossAfterEntry(tradeType, entryPriceBeforeTrade);
            
            // SL 설정 후 다시 표시 업데이트 (약간의 지연 후)
            setTimeout(() => {
              updateStopLossPriceDisplay();
            }, 2000);
          }
        } else {
          console.warn('⚠️ 진입 전 가격을 읽을 수 없어 진입가를 기록하지 못했습니다.');
        }
        
        // 마지막 진입이 아니면 대기 (2초)
      if (i < activePositions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`❌ ${i + 1}단계 진입 실패:`, error);
      alert(`${i + 1}단계 진입 실패: ${error.message}`);
      break; // 오류 발생 시 중단
    }
  }
  
  // 설정 저장
  await saveSplitEntrySettings();
  
  return { success: true, message: `${activePositions.length}단계 분할 진입 완료` };
}

// 분할 진입 상태 초기화 함수
async function resetSplitEntryState() {
  splitEntryStrategy.executedEntries = [false, false, false];
  splitEntryStrategy.entryPrices = [null, null, null];
  await saveSplitEntrySettings();
}

// 진입 후 자동 스탑로스 설정 함수
async function autoSetStopLossAfterEntry(tradeType, entryPrice = null) {
  try {
    // 스탑로스 값 검증
    const stoplossPercent = parseFloat(stoplossValueInput.value) || 0;
    if (stoplossPercent === 0 || stoplossPercent >= 100) {
      // 스탑로스가 설정되지 않았으면 설정하지 않음
      console.log('⚠️ 스탑로스가 설정되지 않아 자동 SL 설정을 건너뜁니다.');
      return;
    }
    
    // 진입가 확인 (파라미터로 받은 값 우선, 없으면 저장된 값, 그래도 없으면 현재가)
    let finalEntryPrice = entryPrice;
    if (!finalEntryPrice || isNaN(finalEntryPrice) || finalEntryPrice === 0) {
      // currentPosition에서 가져오기
      finalEntryPrice = currentPosition.entryPrice;
    }
    if (!finalEntryPrice || isNaN(finalEntryPrice) || finalEntryPrice === 0) {
      // splitEntryStrategy에서 가져오기 (첫 번째 저장된 진입가)
      const savedPrices = splitEntryStrategy.entryPrices.filter(p => p && !isNaN(p) && p > 0);
      if (savedPrices.length > 0) {
        finalEntryPrice = savedPrices[0];
      }
    }
    if (!finalEntryPrice || isNaN(finalEntryPrice) || finalEntryPrice === 0) {
      // 마지막으로 현재가 시도
      const currentPriceText = currentPrice.textContent.trim();
      if (currentPriceText !== '-') {
        finalEntryPrice = parseFloat(currentPriceText.replace(/[^0-9.-]/g, ''));
      }
    }
    
    if (!finalEntryPrice || isNaN(finalEntryPrice) || finalEntryPrice === 0) {
      console.error('❌ 진입가를 확인할 수 없어 자동 SL 설정 실패');
      return;
    }
    
    console.log(`🔧 자동 SL 설정 시작: 진입가=${finalEntryPrice}, 포지션=${tradeType}, SL%=${stoplossPercent}`);
    
    const slPrice = calculateSlPrice(finalEntryPrice, tradeType);
    if (slPrice === null) {
      console.error('❌ SL 가격 계산 실패');
      return;
    }
    
    console.log(`✅ 계산된 SL 가격: ${slPrice}`);
    
    // 스탑로스 가격 표시 업데이트 (자동 설정 없이 모니터링만)
    updateStopLossPriceDisplay();
    
  } catch (error) {
    console.error('❌ 자동 SL 설정 오류:', error);
  }
}

// TP 자동 체크 및 실행 함수 (중복 실행 방지)
let isExecutingTp = false;

async function checkAndExecuteTp() {
  try {
    // 이미 TP 실행 중이면 건너뜀
    if (isExecutingTp) return;
    
    // 현재가 확인
    const currentPriceText = currentPrice.textContent.trim();
    if (currentPriceText === '-') return;
    
    const currentPriceValue = parseFloat(currentPriceText.replace(/[^0-9.-]/g, ''));
    if (isNaN(currentPriceValue) || currentPriceValue === 0) return;
    
    // 진입가 확인
    if (!currentPosition.entryPrice) return;
    
    // TP 체크 (시간 경과는 0으로 설정 - 현재는 사용하지 않음)
    const shouldTp = shouldExecuteTp(
      currentPosition.entryPrice, 
      currentPriceValue, 
      currentPosition.type, 
      0
    );
    
    if (shouldTp) {
      isExecutingTp = true;
      try {
        // TP 실행
        await executeTakeProfit();
      } finally {
        // 최소 2초 후에 다시 체크 가능하도록 설정 (중복 실행 방지)
        setTimeout(() => {
          isExecutingTp = false;
        }, 2000);
      }
    }
    
  } catch (error) {
    console.error('TP 체크 오류:', error);
    isExecutingTp = false;
  }
}

// TP 실행 함수
async function executeTakeProfit() {
  try {
    // 매크로 존재 여부 확인
    const macros = await loadMacros();
    if (!macros.closeMacro || macros.closeMacro.length === 0) {
      return;
    }
    
    // TP 타입에 따라 처리
    let tpResult;
    if (customTpStrategy.type === 'split') {
      // Split TP의 경우 수익률 계산
      const currentPriceValue = parseFloat(currentPrice.textContent.replace(/[^0-9.-]/g, ''));
      const profitPercent = currentPosition.type === 'long'
        ? ((currentPriceValue - currentPosition.entryPrice) / currentPosition.entryPrice) * 100
        : ((currentPosition.entryPrice - currentPriceValue) / currentPosition.entryPrice) * 100;
      
      tpResult = checkSplitTp(profitPercent);
      
      if (tpResult && tpResult.percentage) {
        // Split TP 실행 - 일부만 종료하는 경우는 추후 구현
        // 현재는 Close 매크로로 전체 종료
        await executeSmartTrade('close', null);
        
        // 텔레그램 메시지 및 스크린샷 전송
        if (telegramManager && telegramManager.telegramBot) {
          const tpMessage = `🎯 Take Profit 실행 완료\n` +
                           `TP 레벨: ${tpResult.percentage}%\n` +
                           `실행 시간: ${new Date().toLocaleString()}`;
          
          // 1초 딜레이 후 스크린샷 전송
          await telegramManager.sendMessageWithScreenshot(tpMessage, true, 1000);
        }
        
        // 마지막 TP인 경우 포지션 비활성화 (StateManager 사용)
        if (tpResult.percentage >= 100) {
          currentPosition.isActive = false;
          currentPosition.entryPrice = null;
          splitTpStrategy.executedTps = [false, false, false];
          
          // StateManager에도 상태 업데이트
          stateManager.setState('position.isActive', false);
          stateManager.setState('position.entryPrice', null);
          stateManager.setState('position.current', null);
        }
      }
    } else {
      // Simple TP 또는 Trailing TP - 전체 종료
      await executeSmartTrade('close', null);
      
      // 텔레그램 메시지 및 스크린샷 전송
      if (telegramManager && telegramManager.telegramBot) {
        const tpMessage = `🎯 Take Profit 실행 완료\n` +
                         `TP 타입: ${customTpStrategy.type === 'trailing' ? 'Trailing TP' : 'Simple TP'}\n` +
                         `실행 시간: ${new Date().toLocaleString()}`;
        
        // 1초 딜레이 후 스크린샷 전송
        await telegramManager.sendMessageWithScreenshot(tpMessage, true, 1000);
      }
      
      // 포지션 비활성화 (StateManager 사용)
      currentPosition.isActive = false;
      currentPosition.entryPrice = null;
      
      // StateManager에도 상태 업데이트
      stateManager.setState('position.isActive', false);
      stateManager.setState('position.entryPrice', null);
      stateManager.setState('position.current', null);
      
      // Trailing TP 상태 초기화
      if (customTpStrategy.type === 'trailing') {
        customTpStrategy.maxPrice = null;
        customTpStrategy.trailingStopPrice = null;
      }
      
      // Split TP 상태 초기화
      splitTpStrategy.executedTps = [false, false, false];
      
      // 분할 진입 상태 초기화
      resetSplitEntryState();
    }
    
  } catch (error) {
    console.error('TP 실행 오류:', error);
  }
}

// 분할 진입 실행 함수 (메시지 수신 시 다음 단계만 실행)
async function executeSplitEntry(tradeType) {
  
  // 활성화된 포지션 비율 찾기 (0이 아닌 값들)
  const activePositions = splitEntryStrategy.positions
    .map((pos, index) => ({ value: pos, index }))
    .filter(item => item.value > 0);
  
  if (activePositions.length === 0) {
    console.warn('⚠️ 활성화된 포지션이 없습니다. position1에 값을 입력해주세요.');
    return { success: false, error: '활성화된 포지션이 없습니다.' };
  }
  
  // 현재까지 진입된 포지션 비율의 합 계산
  let totalEnteredPosition = 0;
  for (let i = 0; i < activePositions.length; i++) {
    const originalIndex = activePositions[i].index;
    if (splitEntryStrategy.executedEntries[originalIndex]) {
      totalEnteredPosition += activePositions[i].value;
    }
  }
  
  // 총 포지션 비율 계산
  const totalPosition = activePositions.reduce((sum, pos) => sum + pos.value, 0);
  
  // 항상 One Way Mode로 동작 - 100% 포지션 진입 완료 시 진입 제한
  if (totalEnteredPosition >= totalPosition) {
    // One Way Mode: 100% 진입 완료 - 진입 제한
    console.log(`✅ 총 포지션 ${totalPosition}% 진입 완료 (현재: ${totalEnteredPosition}%)`);
    return { 
      success: false, 
      error: `총 포지션 ${totalPosition}%가 진입되었습니다. 포지션이 정리(SL/TP/Close)된 후 다시 진입할 수 있습니다.`,
      isComplete: true,
      allStepsComplete: true
    };
  }
  
  // 실행되지 않은 첫 번째 단계 찾기 (100% 미만일 때만)
  let nextStepIndex = -1;
  for (let i = 0; i < activePositions.length; i++) {
    const originalIndex = activePositions[i].index;
    if (!splitEntryStrategy.executedEntries[originalIndex]) {
      nextStepIndex = i;
      break;
    }
  }
  
  // 모든 단계가 실행되었지만 100%가 안 되었다면 처음부터 다시
  if (nextStepIndex === -1 && totalEnteredPosition < totalPosition) {
    console.log(`🔄 누적 포지션 ${totalEnteredPosition}% < 총 ${totalPosition}% - 처음부터 다시 진입 시작`);
    splitEntryStrategy.executedEntries = [false, false, false];
    nextStepIndex = 0;
  }
  
  // 여전히 다음 단계를 찾을 수 없으면 오류
  if (nextStepIndex === -1) {
    return { 
      success: false, 
      error: '진입할 단계를 찾을 수 없습니다.',
      isComplete: true
    };
  }
  
  const currentStep = activePositions[nextStepIndex];
  const stepNumber = nextStepIndex + 1;
  const totalSteps = activePositions.length;
  const positionPercent = currentStep.value;
  const originalIndex = currentStep.index;
  
  // 다음 단계를 실행하면 100%를 초과하는지 확인
  const nextTotalPosition = totalEnteredPosition + positionPercent;
  if (nextTotalPosition > totalPosition) {
    // 100%를 초과하면 진입하지 않음
    const remainingPercent = totalPosition - totalEnteredPosition;
    if (remainingPercent > 0) {
      console.log(`⚠️ 다음 진입 시 ${nextTotalPosition}%가 되어 총 포지션 ${totalPosition}%를 초과합니다. 남은 ${remainingPercent}%만 진입 가능하지만 설정된 단계 비율과 맞지 않아 진입을 중단합니다.`);
    } else {
      console.log(`✅ 총 포지션 ${totalPosition}%가 이미 진입되었습니다.`);
    }
    return {
      success: false,
      error: `총 포지션 ${totalPosition}%가 이미 진입되었거나 다음 진입 시 ${nextTotalPosition}%로 초과됩니다.`,
      isComplete: true,
      allStepsComplete: true
    };
  }
  
  const amount = calculateAmountForPosition(positionPercent);
  
  if (amount === '-' || parseFloat(amount) === 0) {
    return { success: false, error: `Amount 계산 실패: ${positionPercent}%` };
  }
  
  try {
    // 🎯 진입 전에 현재가를 읽어서 진입가로 저장 (진입 후에는 가격이 변동될 수 있음)
    let entryPriceBeforeTrade = null;
    const currentPriceText = currentPrice.textContent.trim();
    if (currentPriceText !== '-') {
      entryPriceBeforeTrade = parseFloat(currentPriceText.replace(/[^0-9.-]/g, ''));
      if (isNaN(entryPriceBeforeTrade) || entryPriceBeforeTrade === 0) {
        entryPriceBeforeTrade = null;
      }
    }
    
    // 현재 단계 진입 실행
    const result = await executeSmartTrade(tradeType, amount);
    
    if (result && result.success) {
      // 진입 성공 시 상태 업데이트
      splitEntryStrategy.executedEntries[originalIndex] = true;
      
      // 진입 전에 읽은 가격을 진입가로 저장
      if (entryPriceBeforeTrade) {
        splitEntryStrategy.entryPrices[originalIndex] = entryPriceBeforeTrade;
        
        // 첫 번째 진입 시 포지션 상태 업데이트 (StateManager 사용)
        if (stepNumber === 1) {
          currentPosition.type = tradeType;
          currentPosition.entryPrice = entryPriceBeforeTrade;
          currentPosition.entryTime = Date.now();
          currentPosition.isActive = true;
          
          // StateManager에도 상태 저장
          stateManager.setState('position.current', tradeType);
          stateManager.setState('position.entryPrice', entryPriceBeforeTrade);
          stateManager.setState('position.entryTime', Date.now());
          stateManager.setState('position.isActive', true);
          
          console.log(`📊 진입가 기록: ${entryPriceBeforeTrade} (포지션: ${tradeType})`);
          
          // Split TP 상태 초기화
          splitTpStrategy.executedTps = [false, false, false];
          
          // Trailing TP 상태 초기화
          if (customTpStrategy.type === 'trailing') {
            customTpStrategy.maxPrice = null;
            customTpStrategy.trailingStopPrice = null;
          }
          
          // 스탑로스 가격 표시 업데이트 (진입가가 설정된 직후)
          updateStopLossPriceDisplay();
          
          // 첫 번째 진입 단계 완료 시 자동으로 스탑로스 설정 (기록된 진입가 사용)
          await autoSetStopLossAfterEntry(tradeType, entryPriceBeforeTrade);
          
          // SL 설정 후 다시 표시 업데이트 (약간의 지연 후)
          setTimeout(() => {
            updateStopLossPriceDisplay();
          }, 2000);
        }
      } else {
        console.warn('⚠️ 진입 전 가격을 읽을 수 없어 진입가를 기록하지 못했습니다.');
      }
      
      // 설정 저장
      await saveSplitEntrySettings();
      
      const isLastStep = nextStepIndex === activePositions.length - 1;
      return { 
        success: true, 
        message: `${stepNumber}/${totalSteps}단계 진입 완료`,
        step: stepNumber,
        totalSteps: totalSteps,
        isComplete: isLastStep
      };
    } else {
      throw new Error(result?.error || '진입 실패');
    }
  } catch (error) {
    console.error(`❌ ${stepNumber}단계 진입 실패:`, error);
    return { success: false, error: error.message };
  }
}

async function executeSmartTrade(signal, amount) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('활성 탭을 찾을 수 없습니다.');
    }
    
    // Content Script 주입 확인
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });
    } catch (injectionError) {
      // Content Script 이미 주입됨 또는 주입 실패 (정상)
    }
    
    // 잠시 대기 후 메시지 전송
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // Content Script에 스마트 거래 메시지 전송
          const response = await sendMessageToContentScript({
            action: 'executeSmartTrade',
            tradeType: signal, // 'long' or 'short'
            amount: amount
          });
          
          if (response && response.success) {
            resolve(response);
          } else {
            const errorMsg = response?.error || '알 수 없는 오류';
            console.error(`❌ ${signal} 거래 실패: ${errorMsg}`);
            reject(new Error(errorMsg));
          }
        } catch (messageError) {
          console.error('스마트 거래 메시지 전송 실패:', messageError);
          reject(messageError);
        }
      }, 500);
    });
    
  } catch (error) {
    console.error('스마트 거래 실행 실패:', error);
    throw error;
  }
}

// 기존 매크로 실행 함수 (백업용)
async function executeMacro(signal, amount) {
  
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
  // StateManager에도 상태 저장
  stateManager.setState('selection.isSelecting', true);
  stateManager.setState('selection.type', type);
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

// 유틸리티 인스턴스 생성
const dataExtractor = new DataExtractor();
const storageUtils = new StorageUtils();
const stateManager = new StateManager();
const telegramManager = new TelegramManager(storageUtils, stateManager);

// TelegramManager 초기화 (UI 요소 주입 및 콜백 설정)
function initializeTelegramManager() {
  // UI 요소 주입
  telegramManager.setUIElements({
    botTokenInput: botTokenInput,
    chatIdInput: chatIdInput,
    userSymbolInput: userSymbolInput,
    telegramStatusMessage: telegramStatusMessage,
    testTelegramConnectionBtn: testTelegramConnectionBtn
  });
  
  // 콜백 설정
  telegramManager.setCallbacks({
    onTradeExecute: async (signal) => {
      // executeAutoTrade 함수를 콜백으로 호출
      await executeAutoTrade(signal);
    },
    onStatusUpdate: (message, type) => {
      // 상태 업데이트 콜백 (필요시 추가 처리)
      console.log(`Telegram Status: ${message} [${type}]`);
    },
    onMessageReceived: (message) => {
      // 메시지 수신 콜백 (필요시 추가 처리)
      console.log(`Message received: ${message.text}`);
    }
  });
}

// StateManager UI 업데이트 헬퍼 함수들
function updateTradingStateUI(trading) {
  if (tradingToggle) {
    tradingToggle.checked = trading.isActive;
  }
  // 추가 UI 업데이트 로직
}

function updatePositionStateUI(position) {
  // 포지션 상태에 따른 UI 업데이트
  if (!position.isActive) {
    if (stopLossPrice) {
      stopLossPrice.style.display = 'none';
    }
  }
}

function updateSettingsUI(settings) {
  // 설정에 따른 UI 업데이트
  if (exchangeSelect && settings.exchange) {
    exchangeSelect.value = settings.exchange;
  }
  if (leverageValueInput && settings.leverage) {
    leverageValueInput.value = settings.leverage;
  }
}

// StateManager 구독 설정 (UI 업데이트용)
stateManager.subscribe((state) => {
  // 상태 변경 시 UI 업데이트
  if (state.trading.changed) {
    updateTradingStateUI(state.trading);
  }
  if (state.position.changed) {
    updatePositionStateUI(state.position);
  }
  if (state.selectors.changed) {
    updateSelectorButtonStates();
  }
  if (state.settings.changed) {
    updateSettingsUI(state.settings);
  }
});

// 현재가 추출 실행 (DataExtractor 사용)
async function extractPrice() {
  if (!savedPriceSelector) {
    console.log('저장된 현재가 셀렉터가 없습니다.');
    return;
  }
  
  await dataExtractor.extractPrice(savedPriceSelector, currentPrice, (value) => {
    // Amount 계산 콜백
    if (value) {
      currentAmount.textContent = calculateAmount();
    } else {
      currentAmount.textContent = '-';
    }
    // TP 가격 표시 업데이트 (현재가 변경 시)
    updateTpPriceDisplay();
  });
}

// 자본금 추출 실행 (DataExtractor 사용)
async function extractAssets() {
  if (!savedSelector) {
    console.log('저장된 셀렉터가 없습니다.');
    return;
  }
  
  await dataExtractor.extractAssets(savedSelector, currentAssets, (value) => {
    // Amount 계산 콜백
    if (value) {
      currentAmount.textContent = calculateAmount();
    } else {
      currentAmount.textContent = '-';
    }
  });
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
    extractAssetsBtn.classList.add('extracted');
    console.log('Assets button: Has data');
  } else {
    extractAssetsBtn.classList.remove('extracted');
    console.log('Assets button: No data');
  }
  
  // Price Extraction 버튼
  if (savedSelectors.price) {
    extractPriceBtn.classList.add('extracted');
    console.log('Price button: Has data');
  } else {
    extractPriceBtn.classList.remove('extracted');
    console.log('Price button: No data');
  }
}

// 매크로 버튼 상태 업데이트
async function updateMacroButtonStates() {
  console.log('🔄 매크로 버튼 상태 업데이트 시작');
  const macros = await loadMacros();
  console.log('📦 로드된 매크로들:', macros);
  
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
  
  // Close Record 버튼
  if (macros.closeMacro && macros.closeMacro.length > 0) {
    closeRecordBtn.classList.add('has-macro');
    manualCloseBtn.disabled = false;
    console.log('Close macro: Available');
  } else {
    closeRecordBtn.classList.remove('has-macro');
    manualCloseBtn.disabled = true;
    console.log('Close macro: Not available');
  }
  
  console.log('✅ 매크로 버튼 상태 업데이트 완료');
}


// Background로부터 메시지 수신 (선택된 요소 정보)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Popup이 메시지 수신:', request);
  
  if (request.action === 'elementSelected') {
    // 선택된 요소 정보 저장
    const { selector, text } = request;
    
    // 타입에 따라 셀렉터 저장 (StateManager 사용)
    const selectionType = stateManager.getState('selection.type');
    
    if (selectionType === 'balance') {
      savedSelector = selector;
      savedSelectors.assets = selector;
      stateManager.setState('selectors.assets', selector);
      saveSelectorSettings(selector);
      
      // 자동으로 자본금 추출만 실행
      setTimeout(() => {
        extractAssets();
        console.log('요소 선택 완료 - 자본금 추출만 실행');
      }, 1000);
    } else if (selectionType === 'price') {
      savedPriceSelector = selector;
      savedSelectors.price = selector;
      stateManager.setState('selectors.price', selector);
      savePriceSelectorSettings(selector);
      
      // 자동으로 현재가 추출만 실행
      setTimeout(() => {
        extractPrice();
        console.log('요소 선택 완료 - 현재가 추출만 실행');
      }, 1000);
    }
    
    // 선택 모드 종료 (StateManager 사용)
    stateManager.setState('selection.isSelecting', false);
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
    } else if (request.macroType === 'close') {
      isCloseRecording = false;
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

// 설정 저장하기 (StorageUtils 사용)
async function saveSettings() {
  const selectedExchange = exchangeSelect.value;
  const leverage = parseInt(leverageValueInput.value) || 1;
  const position = splitEntryStrategy.positions[0] || 100; // Use first position for total
  const stoploss = parseFloat(stoplossValueInput.value) || 2;
  // Trading Mode 제거됨 - 항상 One Way Mode로 동작
  const tradingMode = 'oneway';
  const autoRefresh = parseInt(autoRefreshInterval?.value) || 0;
  
  await storageUtils.save({
    isTrading: isTrading,
    selectedExchange: selectedExchange,
    leverage: leverage,
    position: position,
    stoploss: stoploss,
    tradingMode: 'oneway', // 항상 One Way Mode
    autoRefresh: autoRefresh
  });
  
  // StateManager에도 설정 반영
  stateManager.setState('settings.exchange', selectedExchange);
  stateManager.setState('settings.leverage', leverage);
  stateManager.setState('settings.position', [position, 0, 0]);
  stateManager.setState('settings.stoploss', stoploss);
  stateManager.setState('trading.mode', 'oneway'); // 항상 One Way Mode
  stateManager.setState('settings.autoRefresh', autoRefresh);
  
  // 자동 새로고침 타이머 업데이트 (Auto Trading이 ON일 때만)
  if (isTrading) {
    setupAutoRefresh(autoRefresh);
  } else {
    // Auto Trading이 OFF면 타이머 중지
    setupAutoRefresh(0);
  }
}

// 셀렉터 설정 저장 (StorageUtils 사용)
async function saveSelectorSettings(selector) {
  await storageUtils.saveSelector('balance', selector);
}

async function savePriceSelectorSettings(selector) {
  await storageUtils.saveSelector('price', selector);
}

// 일반 셀렉터 저장

// 설정 불러오기 (StorageUtils 사용, StateManager 반영)
async function loadSettings() {
  const result = await storageUtils.load(['isTrading', 'selectedExchange', 'balanceSelector', 'priceSelector', 'leverage', 'position', 'stoploss', 'autoRefresh']);
  
  if (result.isTrading !== undefined) {
    isTrading = result.isTrading;
    // StateManager에도 상태 반영
    stateManager.setState('trading.isActive', isTrading);
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
    // StateManager에도 상태 반영
    stateManager.setState('settings.exchange', result.selectedExchange);
  }
  if (result.leverage) {
    leverageValueInput.value = result.leverage;
    // StateManager에도 상태 반영
    stateManager.setState('settings.leverage', result.leverage);
  }
  // Position loading is handled by loadSplitEntrySettings()
  if (result.stoploss !== undefined) {
    stoplossValueInput.value = result.stoploss;
    // StateManager에도 상태 반영
    stateManager.setState('settings.stoploss', result.stoploss);
  } else {
    // 기본값 2% 설정
    stoplossValueInput.value = 2;
    stateManager.setState('settings.stoploss', 2);
  }
  // Trading Mode 제거됨 - 항상 One Way Mode로 동작
  stateManager.setState('trading.mode', 'oneway');
  
  if (result.autoRefresh !== undefined && autoRefreshInterval) {
    autoRefreshInterval.value = result.autoRefresh;
    // StateManager에도 상태 반영
    stateManager.setState('settings.autoRefresh', result.autoRefresh);
    // 자동 새로고침 타이머 설정 (Auto Trading이 ON일 때만)
    if (isTrading && result.autoRefresh > 0 && result.autoRefresh <= 100) {
      setupAutoRefresh(result.autoRefresh);
    }
  } else if (autoRefreshInterval) {
    // 기본값 0 (새로고침 안 함)
    autoRefreshInterval.value = 0;
    stateManager.setState('settings.autoRefresh', 0);
  }
  
  // 모든 셀렉터 로드 (StateManager 반영)
  if (result.balanceSelector) {
    savedSelector = result.balanceSelector;
    savedSelectors.assets = result.balanceSelector;
    // StateManager에도 상태 반영
    stateManager.setState('selectors.assets', result.balanceSelector);
    
    // 저장된 셀렉터가 있으면 자동으로 자본금 추출만 실행
    setTimeout(() => {
      extractAssets();
      console.log('설정 로드 완료 - 자본금 추출만 실행');
    }, 1000);
  }
  
  if (result.priceSelector) {
    savedPriceSelector = result.priceSelector;
    savedSelectors.price = result.priceSelector;
    // StateManager에도 상태 반영
    stateManager.setState('selectors.price', result.priceSelector);
    
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
// 거래 토글 변경 이벤트
tradingToggle.addEventListener('change', async (e) => {
  const isChecked = e.target.checked;
  
  if (isChecked) {
    // 거래 시작
    console.log('거래 시작 토글 활성화');
    
    // Check exchange selection
    if (!exchangeSelect.value) {
      alert('Please select an exchange first.');
      tradingToggle.checked = false;
      return;
    }
    
    // 상태 변경 (StateManager 사용)
    isTrading = true;
    stateManager.setState('trading.isActive', true);
    updateUI();
    
    // 설정 저장
    await saveSettings();
    
    // 자동 새로고침 시작 (Auto Trading ON일 때만)
    const autoRefreshMinutes = parseInt(autoRefreshInterval?.value) || 0;
    if (autoRefreshMinutes > 0 && autoRefreshMinutes <= 100) {
      setupAutoRefresh(autoRefreshMinutes);
    }
    
    // 주기적 자본금 추출 시작
    console.log('거래 시작 - 주기적 추출 시작 시도');
    startPeriodicExtraction();
    
    // 텔레그램 자동 연결 및 폴링 시작 (TelegramManager 사용)
    const telegramStarted = await autoConnectAndStartTelegramPolling();
    
    if (!telegramStarted) {
      console.log('💡 텔레그램 자동매매 비활성화 - 수동 매매만 가능');
    }
    
    // 매크로 기반 자동 매매 준비
    console.log('매크로 기반 자동 매매 준비 완료 (텔레그램 폴링 포함)');
    initializeAutoTrading();
    
    // Background에 메시지 전송
    await sendMessageToBackground({ 
      action: 'startTrading', 
      status: 'active',
      exchange: exchangeSelect.value
    });
  } else {
    // 거래 중단
    console.log('거래 중단 토글 비활성화');
    
    // 상태 변경 (StateManager 사용)
    isTrading = false;
    stateManager.setState('trading.isActive', false);
    
    // 트레이딩 상태 초기화
    resetSplitEntryState();
    currentPosition.isActive = false;
    currentPosition.entryPrice = null;
    currentPosition.type = null;
    currentPosition.entryTime = null;
    
    // StateManager에도 상태 업데이트
    stateManager.setState('position.isActive', false);
    stateManager.setState('position.entryPrice', null);
    stateManager.setState('position.current', null);
    stateManager.setState('position.entryTime', null);
    
    // TP 상태 초기화
    splitTpStrategy.executedTps = [false, false, false];
    if (customTpStrategy.type === 'trailing') {
      customTpStrategy.maxPrice = null;
      customTpStrategy.trailingStopPrice = null;
    }
    
    updateStopLossPriceDisplay(); // SL 가격 표시 숨김
    updateUI();
    
    // 설정 저장
    await saveSettings();
    
    // 자동 새로고침 중지 (Auto Trading OFF)
    setupAutoRefresh(0);
    
    // 주기적 자본금 추출 중단
    stopPeriodicExtraction();
    
    // 텔레그램 폴링 중단 (TelegramManager 사용)
    await telegramManager.stopPolling();
    
    // Background에 메시지 전송
    await sendMessageToBackground({ action: 'stopTrading', status: 'inactive' });
  }
});

// UI 업데이트 함수
// Amount 계산 함수
// 특정 포지션 비율에 대한 Amount 계산
function calculateAmountForPosition(positionPercent) {
  const assetsText = currentAssets.textContent.trim();
  const priceText = currentPrice.textContent.trim();
  const leverage = parseInt(leverageValueInput.value) || 1;
  
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
  const amount = (assetsNum * leverage * positionPercent) / priceNum / 100;
  
  // 소수점 4자리까지 표시
  return amount.toFixed(4);
}

function calculateAmount() {
  const totalPosition = splitEntryStrategy.positions.reduce((sum, pos) => sum + pos, 0) || 100;
  return calculateAmountForPosition(totalPosition);
}


// SL 가격 계산 함수
function calculateSlPrice(entryPrice, position) {
  const stoplossPercent = parseFloat(stoplossValueInput.value) || 0;
  
  if (stoplossPercent === 0 || stoplossPercent >= 100) {
    console.warn('유효하지 않은 스탑로스 값:', stoplossPercent);
    return null; // 유효하지 않은 값일 때 null 반환
  }
  
  let slPrice;
  if (position === 'long') {
    // Long 포지션: 진입가보다 낮은 가격에서 손절
    slPrice = entryPrice * (1 - stoplossPercent / 100);
  } else {
    // Short 포지션: 진입가보다 높은 가격에서 손절
    slPrice = entryPrice * (1 + stoplossPercent / 100);
  }
  
  // 소수점 자릿수 조정 (진입가에 따라)
  if (entryPrice < 1) {
    return slPrice.toFixed(6); // 1달러 미만: 소수점 6자리
  } else if (entryPrice < 100) {
    return slPrice.toFixed(4); // 100달러 미만: 소수점 4자리
  } else {
    return slPrice.toFixed(2); // 100달러 이상: 소수점 2자리
  }
}

// 스탑로스 가격 표시 업데이트 함수
function updateStopLossPriceDisplay() {
  if (!stopLossPrice) {
    console.warn('⚠️ stopLossPrice 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 포지션이 활성화되어 있고 진입가가 있는 경우에만 표시
  if (currentPosition.isActive && currentPosition.entryPrice && currentPosition.type) {
    const slPrice = calculateSlPrice(currentPosition.entryPrice, currentPosition.type);
    
    if (slPrice && !isNaN(slPrice)) {
      stopLossPrice.textContent = `(${slPrice})`;
      stopLossPrice.style.display = 'block';
    } else {
      stopLossPrice.style.display = 'none';
    }
  } else {
    stopLossPrice.style.display = 'none';
  }
}

// TP 가격 표시 업데이트 함수
function updateTpPriceDisplay() {
  // 현재가 추출 (진입 전에도 표시하기 위해)
  const currentPriceText = currentPrice ? currentPrice.textContent.trim() : '-';
  let currentPriceValue = null;
  if (currentPriceText !== '-' && currentPriceText !== '') {
    currentPriceValue = parseFloat(currentPriceText.replace(/[^0-9.-]/g, ''));
    if (isNaN(currentPriceValue) || currentPriceValue === 0) {
      currentPriceValue = null;
    }
  }
  
  // 진입가가 있으면 진입가 사용, 없으면 현재가 사용 (진입 전 미리보기)
  const basePrice = (currentPosition.isActive && currentPosition.entryPrice) 
    ? parseFloat(currentPosition.entryPrice) 
    : currentPriceValue;
  
  // 포지션 타입 (진입 전에는 없으므로 null)
  const position = currentPosition.type || null;
  
  // 가격이 없으면 Simple TP만 숨김 (Trailing과 Split은 항상 표시)
  if (!basePrice || isNaN(basePrice)) {
    const simpleTpPriceDisplay = document.getElementById('simpleTpPriceDisplay');
    if (simpleTpPriceDisplay) simpleTpPriceDisplay.style.display = 'none';
  }
  
  // 진입 전에는 Long 기준으로 가격 계산 (진입 타입이 없으므로)
  const calculatedPosition = position || 'long';
  
  // 현재 선택된 TP 전략에 따라 해당 가격만 표시
  switch(customTpStrategy.type) {
    case 'simple':
      // Simple TP 가격 계산
      const simpleTpPercent = customTpStrategy.simpleTp || 0;
      let simpleTpPrice;
      if (calculatedPosition === 'long') {
        simpleTpPrice = basePrice * (1 + simpleTpPercent / 100);
      } else {
        simpleTpPrice = basePrice * (1 - simpleTpPercent / 100);
      }
      
      // 소수점 자릿수 조정
      if (basePrice < 1) {
        simpleTpPrice = simpleTpPrice.toFixed(6);
      } else if (basePrice < 100) {
        simpleTpPrice = simpleTpPrice.toFixed(4);
      } else {
        simpleTpPrice = simpleTpPrice.toFixed(2);
      }
      
      const simpleTpPriceValue = document.getElementById('simpleTpPriceValue');
      const simpleTpPriceDisplay = document.getElementById('simpleTpPriceDisplay');
      if (simpleTpPriceValue && simpleTpPriceDisplay) {
        simpleTpPriceValue.textContent = simpleTpPrice;
        simpleTpPriceDisplay.style.display = 'flex';
      }
      
      // 다른 TP 가격 숨김
      const trailingTpPriceDisplay = document.getElementById('trailingTpPriceDisplay');
      const splitTpPriceDisplay = document.getElementById('splitTpPriceDisplay');
      if (trailingTpPriceDisplay) trailingTpPriceDisplay.style.display = 'none';
      if (splitTpPriceDisplay) splitTpPriceDisplay.style.display = 'none';
      break;
      
    case 'trailing':
      const trailingTpPriceValue = document.getElementById('trailingTpPriceValue');
      const trailingTpPriceDisplayEl = document.getElementById('trailingTpPriceDisplay');
      if (trailingTpPriceValue && trailingTpPriceDisplayEl) {
        if (customTpStrategy.maxPrice !== null && currentPosition.isActive) {
          const trailingPrice = calculatedPosition === 'long' 
            ? customTpStrategy.maxPrice - customTpStrategy.trailingDistance
            : customTpStrategy.maxPrice + customTpStrategy.trailingDistance;
          
          let formattedPrice;
          if (basePrice < 1) {
            formattedPrice = trailingPrice.toFixed(6);
          } else if (basePrice < 100) {
            formattedPrice = trailingPrice.toFixed(4);
          } else {
            formattedPrice = trailingPrice.toFixed(2);
          }
          
          trailingTpPriceValue.textContent = formattedPrice;
          trailingTpPriceDisplayEl.style.display = 'flex';
        } else {
          trailingTpPriceValue.textContent = '-';
          trailingTpPriceDisplayEl.style.display = 'flex';
        }
      }
      
      // 다른 TP 가격 숨김
      const simpleTpPriceDisplayEl2 = document.getElementById('simpleTpPriceDisplay');
      const splitTpPriceDisplayEl2 = document.getElementById('splitTpPriceDisplay');
      if (simpleTpPriceDisplayEl2) simpleTpPriceDisplayEl2.style.display = 'none';
      if (splitTpPriceDisplayEl2) splitTpPriceDisplayEl2.style.display = 'none';
      break;
      
    case 'split':
      const splitTpPriceValue = document.getElementById('splitTpPriceValue');
      const splitTpPriceDisplayEl = document.getElementById('splitTpPriceDisplay');
      
      if (splitTpPriceValue && splitTpPriceDisplayEl) {
        let nextTpIndex = -1;
        if (currentPosition.isActive) {
          for (let i = 0; i < splitTpStrategy.executedTps.length; i++) {
            if (!splitTpStrategy.executedTps[i] && customTpStrategy.splitTp[i] > 0) {
              nextTpIndex = i;
              break;
            }
          }
        } else {
          for (let i = 0; i < customTpStrategy.splitTp.length; i++) {
            if (customTpStrategy.splitTp[i] > 0) {
              nextTpIndex = i;
              break;
            }
          }
        }
        
        if (nextTpIndex >= 0) {
          if (basePrice && !isNaN(basePrice)) {
            const tpPercent = customTpStrategy.splitTp[nextTpIndex];
            let splitTpPrice;
            if (calculatedPosition === 'long') {
              splitTpPrice = basePrice * (1 + tpPercent / 100);
            } else {
              splitTpPrice = basePrice * (1 - tpPercent / 100);
            }
            
            // 소수점 자릿수 조정
            if (basePrice < 1) {
              splitTpPrice = splitTpPrice.toFixed(6);
            } else if (basePrice < 100) {
              splitTpPrice = splitTpPrice.toFixed(4);
            } else {
              splitTpPrice = splitTpPrice.toFixed(2);
            }
            
            splitTpPriceValue.textContent = `${splitTpPrice} (Step ${nextTpIndex + 1})`;
          } else {
            splitTpPriceValue.textContent = `- (Step ${nextTpIndex + 1})`;
          }
          splitTpPriceDisplayEl.style.display = 'flex';
        } else {
          splitTpPriceValue.textContent = '- (All Steps Complete)';
          splitTpPriceDisplayEl.style.display = 'flex';
        }
      }
      
      // 다른 TP 가격 숨김
      const simpleTpPriceDisplayEl3 = document.getElementById('simpleTpPriceDisplay');
      const trailingTpPriceDisplayEl3 = document.getElementById('trailingTpPriceDisplay');
      if (simpleTpPriceDisplayEl3) simpleTpPriceDisplayEl3.style.display = 'none';
      if (trailingTpPriceDisplayEl3) trailingTpPriceDisplayEl3.style.display = 'none';
      break;
      
    default:
      // 모든 TP 가격 숨김
      const allTpDisplays = ['simpleTpPriceDisplay', 'trailingTpPriceDisplay', 'splitTpPriceDisplay'];
      allTpDisplays.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
  }
}

function updateUI() {
  if (isTrading) {
    tradingToggle.checked = true;
    tradingToggle.disabled = false;
  } else {
    tradingToggle.checked = false;
    tradingToggle.disabled = false;
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
    if (isCloseRecording) {
      stopMacroRecording('close');
      isCloseRecording = false;
      console.log('ESC로 Close 녹화 중단');
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

// 텔레그램 봇 인스턴스 (TelegramManager로 마이그레이션 중 - 하위 호환성 유지)
let telegramBot = null; // TelegramManager에서 관리
let telegramPollingInterval = null; // TelegramManager에서 관리
let isTelegramTrading = false; // TelegramManager에서 관리
let signalParser = null; // TelegramManager에서 관리

// 텔레그램 설정 로드 (TelegramManager 사용)
async function loadTelegramSettings() {
  await telegramManager.loadSettings();
}

// 텔레그램 설정 저장 (TelegramManager 사용)
async function saveTelegramSettings() {
  await telegramManager.saveSettings();
}

// 상태 메시지 표시 (TelegramManager 사용)
function showTelegramStatus(message, type = 'info') {
  telegramManager.showStatus(message, type);
}

// 텔레그램 연결 테스트 (TelegramManager 사용)
async function testTelegramConnection() {
  const success = await telegramManager.testConnection();
  
  // 자동매매가 이미 실행 중이면 폴링도 자동 시작
  if (success && isTrading && !telegramManager.isTelegramTrading) {
    console.log('🔄 자동매매 실행 중 - 텔레그램 폴링 자동 시작');
    await telegramManager.startPolling();
  }
}

// 심볼 업데이트 (TelegramManager 사용)
async function updateTelegramSymbol() {
  const userSymbol = userSymbolInput.value.trim(); // Trading Trigger는 대소문자 구분
  await telegramManager.updateSymbol(userSymbol);
}

// 텔레그램 자동 연결 및 폴링 시작 (TelegramManager 사용)
async function autoConnectAndStartTelegramPolling() {
  return await telegramManager.autoConnectAndStartPolling(isTrading);
}

// 텔레그램 폴링 시작 (TelegramManager 사용)
async function startTelegramPolling() {
  const userSymbol = userSymbolInput ? userSymbolInput.value.trim() : ''; // Trading Trigger는 대소문자 구분
  return await telegramManager.startPolling(userSymbol);
}

// 텔레그램 폴링 중단 (TelegramManager 사용)
async function stopTelegramPolling() {
  await telegramManager.stopPolling();
}

// 중복 처리 방지를 위한 변수 (TelegramManager로 마이그레이션 중 - 하위 호환성 유지)
let lastProcessedMessageId = 0; // TelegramManager에서 관리
let processedMessageIds = new Set(); // TelegramManager에서 관리

// 매크로 실행 중복 방지를 위한 변수 (TelegramManager로 마이그레이션 중)
let isExecutingTrade = false; // TelegramManager에서 관리
let lastTradeTime = 0; // TelegramManager에서 관리
let executingTradeType = null; // TelegramManager에서 관리
let tradeExecutionStartTime = 0; // TelegramManager에서 관리
const MIN_TRADE_INTERVAL = 3000; // TelegramManager에서 관리
const MAX_EXECUTION_TIME = 60000; // TelegramManager에서 관리

// 매크로 실행 상태 모니터링 (TelegramManager로 마이그레이션 중)
let macroStatusCheckInterval = null; // TelegramManager에서 관리

// 하위 호환성을 위한 래퍼 함수들
function startMacroStatusMonitoring() {
  telegramManager.startMacroStatusMonitoring();
}

function stopMacroStatusMonitoring() {
  telegramManager.stopMacroStatusMonitoring();
}

// 메시지 폴링 및 신호 파싱 (TelegramManager에서 처리됨)
// pollTelegramMessages와 processSignalMessage는 TelegramManager 내부에서 처리됨
// 하위 호환성을 위해 함수는 유지하지만 실제로는 호출되지 않음

// 자동 매크로 실행 (TelegramManager 잠금 체크 사용)
async function executeAutoTrade(signal) {
  try {
    console.log(`🚀 자동 매크로 실행 시작: ${signal.action} ${signal.symbol}`);
    
    // 🔒 중복 실행 방지 체크 (TelegramManager 사용)
    let tradeType;
    if (signal.action === 'LONG') {
      tradeType = 'long';
    } else if (signal.action === 'SHORT') {
      tradeType = 'short';
    } else {
      throw new Error(`지원하지 않는 액션: ${signal.action}`);
    }
    
    // TelegramManager를 통한 잠금 체크
    const canExecute = telegramManager.checkAndLockTrade(tradeType);
    if (!canExecute) {
      return; // 잠금되어 있거나 거래 간격 제한
    }
    
    // 분할 진입 실행 (타임아웃 적용)
    const splitEntryResult = await Promise.race([
      executeSplitEntry(tradeType),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Split entry execution timeout (30s)')), 30000)
      )
    ]);
    
    // 실행 결과에 따른 알림 전송
    if (splitEntryResult && splitEntryResult.success) {
      const stepInfo = splitEntryResult.isComplete 
        ? `✅ 분할 진입 완료: ${splitEntryResult.totalSteps}단계 모두 실행됨`
        : `✅ ${splitEntryResult.step}/${splitEntryResult.totalSteps}단계 진입 완료`;
      
      // 현재 단계의 amount 계산
      const activePositions = splitEntryStrategy.positions
        .map((pos, index) => ({ value: pos, index }))
        .filter(item => item.value > 0);
      
      const currentStepIndex = activePositions.findIndex((item, idx) => {
        const originalIndex = item.index;
        return !splitEntryStrategy.executedEntries[originalIndex];
      });
      
      let currentAmount = calculateAmount();
      if (currentStepIndex >= 0 && currentStepIndex < activePositions.length) {
        currentAmount = calculateAmountForPosition(activePositions[currentStepIndex].value);
      }
      
      const successMessage = lang.t('trade_success', { symbol: signal.symbol, action: signal.action }) + `\n` +
                           lang.t('signal_info', { message: signal.originalMessage }) + `\n` +
                           `${stepInfo}\n` +
                           lang.t('amount_info', { amount: currentAmount }) + `\n` +
                           lang.t('time_info', { time: new Date().toLocaleString() });
      
      // 스크린샷과 함께 메시지 전송 (TelegramManager 사용)
      await telegramManager.sendMessageWithScreenshot(successMessage, true);
      console.log('✅ Auto split entry step execution successful (with screenshot)');
    } else if (splitEntryResult && splitEntryResult.allStepsComplete) {
      // 모든 단계가 완료된 경우 알림 (진입하지 않음)
      const infoMessage = lang.t('trade_info', { symbol: signal.symbol, action: signal.action }) + `\n` +
                         lang.t('signal_info', { message: signal.originalMessage }) + `\n` +
                         `⚠️ 모든 분할 진입 단계가 완료되었습니다.\n` +
                         `포지션이 정리(SL/TP/Close)된 후 다시 진입할 수 있습니다.\n` +
                         lang.t('time_info', { time: new Date().toLocaleString() });
      
      // 정보 메시지 전송 (스크린샷 없이, TelegramManager 사용)
      await telegramManager.sendMessage(infoMessage);
      console.log('ℹ️ All split entry steps completed - waiting for position closure');
    } else {
      const errorMessage = lang.t('trade_failed', { symbol: signal.symbol, action: signal.action }) + `\n` +
                          lang.t('signal_info', { message: signal.originalMessage }) + `\n` +
                          lang.t('error_info', { error: splitEntryResult?.error || 'Unknown error' });
      
      // 실패 시에도 스크린샷과 함께 메시지 전송 (TelegramManager 사용)
      await telegramManager.sendMessageWithScreenshot(errorMessage, true);
      console.log('❌ Auto split entry step execution failed (with screenshot):', splitEntryResult?.error);
    }
    
  } catch (error) {
    console.error('자동 매크로 실행 오류:', error);
    
    const errorMessage = lang.t('trade_error', { symbol: signal.symbol, action: signal.action }) + `\n` +
                        lang.t('signal_info', { message: signal.originalMessage }) + `\n` +
                        lang.t('error_info', { error: error.message });
    
    // 오류 시에도 스크린샷과 함께 메시지 전송 (문제 진단용, TelegramManager 사용)
    await telegramManager.sendMessageWithScreenshot(errorMessage, true);
  } finally {
    // 🔓 매크로 실행 잠금 해제 (TelegramManager 사용)
    telegramManager.unlockTrade();
  }
}

// 텔레그램용 매크로 실행 함수
async function executeTelegramMacro(type, amount) {
  try {
    console.log(`📱 텔레그램 매크로 실행: ${type}, Amount: ${amount}`);
    
    // 매크로 존재 여부 확인
    const macros = await loadMacros();
    const macroKey = `${type}Macro`;
    
    if (!macros[macroKey] || macros[macroKey].length === 0) {
      throw new Error(`${type} 매크로가 녹화되지 않았습니다.`);
    }
    
    // 현재 탭 확인
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab) {
      throw new Error('활성 탭을 찾을 수 없습니다.');
    }
    
    // Content Script에 스마트 거래 실행 요청 (타임아웃 적용)
    const response = await Promise.race([
      sendMessageToContentScript({
        action: 'executeSmartTrade',
        tradeType: type,
        amount: amount
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Content script communication timeout')), 25000)
      )
    ]);
    
    console.log(`${type} 텔레그램 매크로 실행 완료:`, response);
    
    if (response && response.success) {
      console.log(`✅ ${type} 텔레그램 매크로 실행 성공`);
      return { success: true, message: response.message };
    } else {
      throw new Error(response?.error || '매크로 실행 실패');
    }
    
  } catch (error) {
    console.error(`❌ ${type} 텔레그램 매크로 실행 실패:`, error);
    return { success: false, error: error.message };
  }
}

// 텔레그램 이벤트 리스너 등록
if (testTelegramConnectionBtn) {
  testTelegramConnectionBtn.addEventListener('click', testTelegramConnection);
}
if (userSymbolInput) {
  userSymbolInput.addEventListener('change', updateTelegramSymbol);
}

// 데이터 표시 업데이트 함수
// 현재 포지션 상태 추적
let currentPosition = {
  type: null, // 'long' or 'short'
  entryPrice: null,
  entryTime: null,
  isActive: false
};

// Stoploss 모니터링 및 자동 Close 실행 (중복 실행 방지)
let isExecutingStoploss = false;

function checkAndExecuteStoploss() {
  try {
    // 이미 실행 중이면 건너뜀
    if (isExecutingStoploss) return;
    
    // 포지션이 활성화되어 있고 진입가가 있는 경우에만 체크
    if (!currentPosition.isActive || !currentPosition.entryPrice || !currentPosition.type) {
      return;
    }
    
    // 현재가 확인
    const currentPriceText = currentPrice.textContent.trim();
    if (currentPriceText === '-') return;
    
    const currentPriceValue = parseFloat(currentPriceText.replace(/[^0-9.-]/g, ''));
    if (isNaN(currentPriceValue) || currentPriceValue === 0) return;
    
    // 스탑로스 값 확인
    const stoplossPercent = parseFloat(stoplossValueInput.value) || 0;
    if (stoplossPercent === 0 || stoplossPercent >= 100) return;
    
    // 스탑로스 가격 계산
    const slPrice = parseFloat(calculateSlPrice(currentPosition.entryPrice, currentPosition.type));
    if (isNaN(slPrice) || slPrice === 0) return;
    
    // Stoploss 도달 확인
    let stoplossTriggered = false;
    if (currentPosition.type === 'long') {
      // Long: 현재가 <= 스탑로스 가격
      stoplossTriggered = currentPriceValue <= slPrice;
    } else {
      // Short: 현재가 >= 스탑로스 가격
      stoplossTriggered = currentPriceValue >= slPrice;
    }
    
    if (stoplossTriggered) {
      isExecutingStoploss = true;
      console.log(`🛑 Stoploss 도달! 현재가: ${currentPriceValue}, SL 가격: ${slPrice}, 포지션: ${currentPosition.type}`);
      
      // Manual Close 실행
      executeSmartTrade('close', null).then(async (result) => {
        if (result && result.success) {
          console.log('✅ Stoploss로 인한 포지션 종료 완료');
          resetSplitEntryState();
          currentPosition.isActive = false;
          currentPosition.entryPrice = null;
          currentPosition.type = null;
          
          // StateManager에도 상태 업데이트
          stateManager.setState('position.isActive', false);
          stateManager.setState('position.entryPrice', null);
          stateManager.setState('position.current', null);
          updateStopLossPriceDisplay();
          
          // 텔레그램 메시지 및 스크린샷 전송
          if (telegramManager && telegramManager.telegramBot) {
            const slMessage = `🛑 Stop Loss 실행 완료\n` +
                            `현재가: ${currentPriceValue}\n` +
                            `SL 가격: ${slPrice}\n` +
                            `실행 시간: ${new Date().toLocaleString()}`;
            
            // 1초 딜레이 후 스크린샷 전송
            await telegramManager.sendMessageWithScreenshot(slMessage, true, 1000);
          }
        }
        
        // 최소 2초 후에 다시 체크 가능하도록 설정 (중복 실행 방지)
        setTimeout(() => {
          isExecutingStoploss = false;
        }, 2000);
      }).catch(error => {
        console.error('❌ Stoploss Close 실행 오류:', error);
        isExecutingStoploss = false;
      });
    }
    
  } catch (error) {
    console.error('Stoploss 체크 오류:', error);
    isExecutingStoploss = false;
  }
}

function updateDataDisplay() {
  // Assets, Price, Amount 값들이 실시간으로 표시되도록 업데이트
  // 이미 currentAssets.textContent, currentPrice.textContent, currentAmount.textContent로 
  // 실시간 업데이트되고 있으므로 추가 작업 불필요
  
  // TP 자동 모니터링 (포지션이 활성화된 경우에만)
  if (currentPosition.isActive && currentPosition.entryPrice) {
    checkAndExecuteTp();
  }
  
  // Stoploss 자동 모니터링 (포지션이 활성화된 경우에만)
  if (currentPosition.isActive && currentPosition.entryPrice) {
    checkAndExecuteStoploss();
  }
  
  // 스탑로스 가격 표시 업데이트
  updateStopLossPriceDisplay();
  
  // TP 가격 표시 업데이트
  updateTpPriceDisplay();
}

// Phase 8 테스트 함수
function testPhase8() {
  console.log('🧪 Phase 8 수동 테스트 시작...');
  
  // SignalParser 테스트
  if (typeof SignalParser !== 'undefined') {
    SignalParser.testPhase8Integration('BTC');
  } else {
    console.error('❌ SignalParser 클래스가 로드되지 않았습니다');
  }
  
  // 텔레그램 봇 상태 확인
  if (telegramBot) {
    console.log('✅ TelegramBot 인스턴스 존재');
    console.log('   봇 설정:', telegramBot.getDebugInfo());
  } else {
    console.log('❌ TelegramBot 인스턴스 없음');
  }
  
  // 신호 파서 상태 확인
  if (signalParser) {
    console.log('✅ SignalParser 인스턴스 존재');
    console.log('   설정된 심볼:', signalParser.userSymbol);
  } else {
    console.log('❌ SignalParser 인스턴스 없음');
  }
  
  console.log('🧪 Phase 8 테스트 완료');
}

// 전역에서 테스트 함수 사용 가능하도록 설정
window.testPhase8 = testPhase8;

// Language system integration
function initializeLanguageSystem() {
  // Load language settings and update UI
  lang.loadLanguageSettings().then(() => {
    updateLanguageUI();
    setupLanguageSelector();
  });
}

function updateLanguageUI() {
  // Update all elements with data-lang attributes
  const elements = document.querySelectorAll('[data-lang]');
  elements.forEach(element => {
    const key = element.getAttribute('data-lang');
    const translation = lang.t(key);
    
    if (element.tagName === 'INPUT' && element.type !== 'button') {
      element.placeholder = translation;
    } else {
      element.textContent = translation;
    }
  });
  
  // Update select options
  const exchangeSelect = document.getElementById('exchangeSelect');
  if (exchangeSelect && exchangeSelect.options[0]) {
    exchangeSelect.options[0].textContent = lang.t('exchange_select');
  }
}

function setupLanguageSelector() {
  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) {
    // Set current language
    languageSelect.value = lang.getCurrentLanguage();
    
    // Add change event listener
    languageSelect.addEventListener('change', (e) => {
      const newLanguage = e.target.value;
      lang.setLanguage(newLanguage);
      updateLanguageUI();
      console.log(`Language changed to: ${newLanguage}`);
    });
  }
}

// Custom TP Strategy System
let customTpStrategy = {
  type: 'simple', // 'simple', 'trailing', 'split'
  simpleTp: 5, // Simple TP percentage
  trailingDistance: 0, // Trailing Distance in price (not percentage)
  splitTp: [3, 6, 10], // Split TP percentages
  entryPrice: null,
  maxPrice: null, // Maximum price reached (for trailing stop)
  trailingStopPrice: null
};

// Split Entry System
let splitEntryStrategy = {
  positions: [100, 0, 0], // Position percentages
  entryPrices: [null, null, null],
  executedEntries: [false, false, false],
  triggerPercents: [0, -2, -5] // Entry triggers (0%, -2%, -5%)
};

// Split TP System
let splitTpStrategy = {
  tpLevels: [3, 6, 10], // TP percentages
  executedTps: [false, false, false],
  positionSizes: [33.33, 33.33, 33.34] // Equal position splits for TP
};

function initializeCustomTpSystem() {
  const strategySelect = document.getElementById('tpStrategySelect');
  const simpleTpSettings = document.getElementById('simpleTpSettings');
  const trailingTpSettings = document.getElementById('trailingTpSettings');
  const splitTpSettings = document.getElementById('splitTpSettings');
  
  // Strategy selector change event
  strategySelect.addEventListener('change', (e) => {
    const selectedStrategy = e.target.value;
    customTpStrategy.type = selectedStrategy;
    
    // Hide all settings
    simpleTpSettings.style.display = 'none';
    trailingTpSettings.style.display = 'none';
    splitTpSettings.style.display = 'none';
    
    // Show selected strategy settings
    switch(selectedStrategy) {
      case 'simple':
        simpleTpSettings.style.display = 'flex';
        trailingTpSettings.style.display = 'none';
        splitTpSettings.style.display = 'none';
        break;
      case 'trailing':
        simpleTpSettings.style.display = 'none';
        trailingTpSettings.style.display = 'flex';
        splitTpSettings.style.display = 'none';
        break;
      case 'split':
        simpleTpSettings.style.display = 'none';
        trailingTpSettings.style.display = 'none';
        splitTpSettings.style.display = 'flex';
        break;
    }
    
    saveCustomTpSettings();
    // TP 가격 표시 업데이트
    updateTpPriceDisplay();
  });
  
  // Input change events for saving settings
  document.getElementById('simpleTpValue').addEventListener('change', (e) => {
    customTpStrategy.simpleTp = parseFloat(e.target.value);
    saveCustomTpSettings();
    // TP 가격 표시 업데이트
    updateTpPriceDisplay();
  });
  
  document.getElementById('trailingDistance').addEventListener('change', (e) => {
    customTpStrategy.trailingDistance = parseFloat(e.target.value) || 0;
    saveCustomTpSettings();
    // TP 가격 표시 업데이트
    updateTpPriceDisplay();
  });
  
  // Split TP input events
  ['splitTp1', 'splitTp2', 'splitTp3'].forEach((id, index) => {
    document.getElementById(id).addEventListener('change', (e) => {
      customTpStrategy.splitTp[index] = parseFloat(e.target.value) || 0;
      saveCustomTpSettings();
      // TP 가격 표시 업데이트
      updateTpPriceDisplay();
    });
  });
  
  // Position split input events
  ['position1', 'position2', 'position3'].forEach((id, index) => {
    document.getElementById(id).addEventListener('change', (e) => {
      splitEntryStrategy.positions[index] = parseFloat(e.target.value) || 0;
      validatePositionTotal();
      saveSplitEntrySettings();
    });
  });
  
  // Load saved settings
  loadCustomTpSettings();
  loadSplitEntrySettings();
}


// Position validation
function validatePositionTotal() {
  const total = splitEntryStrategy.positions.reduce((sum, pos) => sum + pos, 0);
  if (total > 100) {
    console.warn(`Position total exceeds 100%: ${total}%`);
    // Could show warning to user
  }
  return total;
}

// Split entry functions
async function saveSplitEntrySettings() {
  try {
    await storageUtils.saveSplitEntrySettings(splitEntryStrategy);
    console.log('Split entry settings saved');
  } catch (error) {
    console.error('Failed to save split entry settings:', error);
  }
}

async function loadSplitEntrySettings() {
  try {
    const result = await storageUtils.loadSplitEntrySettings();
    if (result) {
      splitEntryStrategy = { ...splitEntryStrategy, ...result };
      
      // Update UI
      document.getElementById('position1').value = splitEntryStrategy.positions[0];
      document.getElementById('position2').value = splitEntryStrategy.positions[1];
      document.getElementById('position3').value = splitEntryStrategy.positions[2];
    }
  } catch (error) {
    console.error('Failed to load split entry settings:', error);
  }
}

function shouldExecuteTp(entryPrice, currentPrice, position, timeElapsed) {
  switch(customTpStrategy.type) {
    case 'simple':
      // Simple TP: 수익률 기준
      const profitPercent = position === 'long' 
        ? ((currentPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - currentPrice) / entryPrice) * 100;
      return profitPercent >= customTpStrategy.simpleTp;
      
    case 'trailing':
      // Trailing TP: 가격 기준
      return checkTrailingTp(currentPrice, position);
      
    case 'split':
      // Split TP: 수익률 기준 (각 단계별 %)
      const splitProfitPercent = position === 'long' 
        ? ((currentPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - currentPrice) / entryPrice) * 100;
      const splitTpResult = checkSplitTp(splitProfitPercent);
      return splitTpResult !== false; // Split TP 조건 충족 시 true 반환
      
    default:
      return false;
  }
}

function checkSplitTp(currentProfit) {
  // Calculate active TP levels (non-zero values)
  const activeTpLevels = customTpStrategy.splitTp.filter(tp => tp > 0);
  const activeCount = activeTpLevels.length;
  
  if (activeCount === 0) return false;
  
  // Calculate dynamic position sizes based on active TP levels
  let positionSizes;
  if (activeCount === 1) {
    positionSizes = [100]; // 100% on single TP
  } else if (activeCount === 2) {
    positionSizes = [50, 50]; // 50% each for two TPs
  } else {
    positionSizes = [33.33, 33.33, 33.34]; // Equal split for three TPs
  }
  
  // Check each TP level
  for (let i = 0; i < customTpStrategy.splitTp.length; i++) {
    const tpLevel = customTpStrategy.splitTp[i];
    if (tpLevel > 0 && !splitTpStrategy.executedTps[i] && currentProfit >= tpLevel) {
      // Execute this TP level
      splitTpStrategy.executedTps[i] = true;
      
      // Find the index in active TPs to get correct position size
      const activeTpIndex = customTpStrategy.splitTp.slice(0, i + 1).filter(tp => tp > 0).length - 1;
      const positionPercentage = positionSizes[activeTpIndex] || (100 / activeCount);
      
      console.log(`Split TP ${i + 1} triggered at ${currentProfit}% (target: ${tpLevel}%) - Closing ${positionPercentage}% of position`);
      
      // 마지막 TP 실행 시 분할 진입 상태 초기화 (모든 포지션이 정리된 경우)
      if (positionPercentage >= 100 || activeTpIndex === activeCount - 1) {
        resetSplitEntryState();
        currentPosition.isActive = false;
        currentPosition.entryPrice = null;
        
        // StateManager에도 상태 업데이트
        stateManager.setState('position.isActive', false);
        stateManager.setState('position.entryPrice', null);
        stateManager.setState('position.current', null);
      }
      
      return { level: i + 1, percentage: positionPercentage };
    }
  }
  return false;
}

function checkTrailingTp(currentPrice, position) {
  // Update max price (최고가 추적)
  if (customTpStrategy.maxPrice === null || currentPrice === null) {
    customTpStrategy.maxPrice = currentPrice;
    return false;
  }
  
  if (position === 'long') {
    // Long: 현재가가 최고가보다 높으면 업데이트
    if (currentPrice > customTpStrategy.maxPrice) {
      customTpStrategy.maxPrice = currentPrice;
    }
    // Trailing Distance만큼 하락하면 TP 실행
    const trailingThreshold = customTpStrategy.maxPrice - customTpStrategy.trailingDistance;
    return currentPrice <= trailingThreshold;
  } else {
    // Short: 현재가가 최저가보다 낮으면 업데이트 (Short는 반대)
    if (currentPrice < customTpStrategy.maxPrice || customTpStrategy.maxPrice === null) {
      customTpStrategy.maxPrice = currentPrice;
    }
    // Trailing Distance만큼 상승하면 TP 실행
    const trailingThreshold = customTpStrategy.maxPrice + customTpStrategy.trailingDistance;
    return currentPrice >= trailingThreshold;
  }
}

// 자동 새로고침 타이머 설정
function setupAutoRefresh(minutes) {
  // 기존 타이머 제거
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
  
  // 기존 카운트다운 타이머 제거
  if (autoRefreshCountdownTimer) {
    clearInterval(autoRefreshCountdownTimer);
    autoRefreshCountdownTimer = null;
  }
  
  // 카운트다운 숨기기
  if (autoRefreshCountdown) {
    autoRefreshCountdown.style.display = 'none';
  }
  
  // Auto Trading이 OFF면 새로고침 안 함
  if (!isTrading) {
    console.log('자동 새로고침 비활성화: Auto Trading이 OFF입니다');
    return;
  }
  
  // 0이면 새로고침 안 함
  if (minutes <= 0 || minutes > 100) {
    console.log('자동 새로고침 비활성화: 간격이 0이거나 100을 초과합니다');
    return;
  }
  
  // 분을 밀리초로 변환
  const intervalMs = minutes * 60 * 1000;
  console.log(`자동 새로고침 설정: ${minutes}분 (${intervalMs}ms)`);
  
  // 남은 시간 초기화 (초 단위)
  autoRefreshRemainingTime = minutes * 60;
  
  // 카운트다운 표시 시작
  if (autoRefreshCountdown) {
    autoRefreshCountdown.style.display = 'inline';
    updateAutoRefreshCountdown();
    
    // 카운트다운 타이머 (1초마다 업데이트)
    autoRefreshCountdownTimer = setInterval(() => {
      if (!isTrading) {
        // Auto Trading이 OFF면 카운트다운 중지
        clearInterval(autoRefreshCountdownTimer);
        autoRefreshCountdownTimer = null;
        if (autoRefreshCountdown) {
          autoRefreshCountdown.style.display = 'none';
        }
        return;
      }
      
      autoRefreshRemainingTime--;
      if (autoRefreshRemainingTime <= 0) {
        // 카운트다운 완료 - 새로고침 실행 후 다시 시작
        autoRefreshRemainingTime = minutes * 60;
      }
      updateAutoRefreshCountdown();
    }, 1000);
  }
  
  // 타이머 설정
  autoRefreshTimer = setInterval(() => {
    // Auto Trading이 여전히 ON인지 확인
    if (!isTrading) {
      console.log('자동 새로고침 중지: Auto Trading이 OFF가 되었습니다');
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
      
      // 카운트다운도 중지
      if (autoRefreshCountdownTimer) {
        clearInterval(autoRefreshCountdownTimer);
        autoRefreshCountdownTimer = null;
      }
      if (autoRefreshCountdown) {
        autoRefreshCountdown.style.display = 'none';
      }
      return;
    }
    
    console.log(`🔄 자동 새로고침 실행 (${minutes}분 간격)`);
    // 현재 활성 탭 새로고침
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
    
    // 카운트다운 리셋
    autoRefreshRemainingTime = minutes * 60;
    if (autoRefreshCountdown) {
      updateAutoRefreshCountdown();
    }
  }, intervalMs);
}

// 자동 새로고침 카운트다운 업데이트
function updateAutoRefreshCountdown() {
  if (!autoRefreshCountdown) return;
  
  const minutes = Math.floor(autoRefreshRemainingTime / 60);
  const seconds = autoRefreshRemainingTime % 60;
  autoRefreshCountdown.textContent = ` (${minutes}:${seconds.toString().padStart(2, '0')})`;
}

// Trading 모드 업데이트 (Manual/Record)
// Trading Mode 제거됨 - updateTradingModeSettings 함수 제거

function updateTradingMode(isRecordMode) {
  if (isRecordMode) {
    // Record 모드: Manual 버튼 숨기기, Record 버튼 표시
    manualLongBtn.style.display = 'none';
    manualShortBtn.style.display = 'none';
    manualCloseBtn.style.display = 'none';
    longRecordBtn.style.display = 'block';
    shortRecordBtn.style.display = 'block';
    closeRecordBtn.style.display = 'block';
  } else {
    // Manual 모드: Record 버튼 숨기기, Manual 버튼 표시
    manualLongBtn.style.display = 'block';
    manualShortBtn.style.display = 'block';
    manualCloseBtn.style.display = 'block';
    longRecordBtn.style.display = 'none';
    shortRecordBtn.style.display = 'none';
    closeRecordBtn.style.display = 'none';
  }
}

async function saveCustomTpSettings() {
  try {
    await storageUtils.saveTpSettings(customTpStrategy);
    console.log('Custom TP settings saved');
  } catch (error) {
    console.error('Failed to save custom TP settings:', error);
  }
}

async function loadCustomTpSettings() {
  try {
    const result = await storageUtils.loadTpSettings();
    if (result) {
      customTpStrategy = { ...customTpStrategy, ...result };
      
      // Update UI
      document.getElementById('tpStrategySelect').value = customTpStrategy.type;
      document.getElementById('simpleTpValue').value = customTpStrategy.simpleTp;
      document.getElementById('trailingDistance').value = customTpStrategy.trailingDistance;
      
      // Update Split TP inputs
      if (customTpStrategy.splitTp) {
        document.getElementById('splitTp1').value = customTpStrategy.splitTp[0] || 3;
        document.getElementById('splitTp2').value = customTpStrategy.splitTp[1] || 6;
        document.getElementById('splitTp3').value = customTpStrategy.splitTp[2] || 10;
      }
      
      // Trigger strategy change to show correct settings
      document.getElementById('tpStrategySelect').dispatchEvent(new Event('change'));
    }
  } catch (error) {
    console.error('Failed to load custom TP settings:', error);
  }
}

// 기존 DOMContentLoaded 이벤트에 언어 시스템 및 텔레그램 설정 로드 추가
document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup loaded with Multi-language, Telegram and Custom TP support');
  
  // Initialize language system first
  initializeLanguageSystem();
  
  // Initialize custom TP system
  initializeCustomTpSystem();
  
  // Record Toggle 이벤트 리스너
  if (recordToggle) {
    recordToggle.addEventListener('change', function() {
      updateTradingMode(recordToggle.checked);
    });
    
    // 초기 상태 설정 (기본값: OFF = Manual 모드)
    updateTradingMode(false);
  }
  
  // 초기 Manual 버튼 상태 설정 (매크로가 없으면 비활성화)
  if (manualLongBtn) manualLongBtn.disabled = true;
  if (manualShortBtn) manualShortBtn.disabled = true;
  if (manualCloseBtn) manualCloseBtn.disabled = true;
  console.log('🔒 Manual 버튼들 초기 비활성화 설정 완료');
  
  loadSettings();
  
  // TelegramManager 초기화 (UI 요소 주입)
  initializeTelegramManager();
  
  // 텔레그램 설정 로드 (TelegramManager 사용) - UI 요소 주입 후에 실행
  // 약간의 지연을 두어 DOM이 완전히 준비되도록 함
  setTimeout(async () => {
    await loadTelegramSettings();
  }, 100);
  
  updateUI();
  updateDataDisplay();
  
  // 매크로 버튼 상태 초기 업데이트
  updateMacroButtonStates();
  
  // 주기적으로 데이터 업데이트 (1초마다)
  setInterval(updateDataDisplay, 1000);
  
  // Phase 8 Test (Development)
  console.log('💡 Phase 8 Test: Run testPhase8() in console for testing');
});
