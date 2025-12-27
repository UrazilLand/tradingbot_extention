// DOM 요소 가져오기
const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');
const toSettingsBtn = document.getElementById('toSettingsBtn');
const backToMainBtn = document.getElementById('backToMainBtn');
const saveGlobalSettingsBtn = document.getElementById('saveGlobalSettingsBtn');

const tradingToggle = document.getElementById('tradingToggle');
const exchangeSelect = document.getElementById('exchangeSelect');
const marketTypeSelect = document.getElementById('marketTypeSelect');
const goToExchangeBtn = document.getElementById('goToExchangeBtn');
const leverageValueInput = document.getElementById('leverageValue');
// Trading Mode 제거됨 - 항상 One Way Mode로 동작
const tradingModeSelect = null;
const stoplossValueInput = document.getElementById('stoplossValue');
const tpStrategySelect = document.getElementById('tpStrategySelect');

// 매크로 및 수동 조작 버튼 (Split Close 적용)
const extractAssetsBtn = document.getElementById('extractAssetsBtn');
const extractPriceBtn = document.getElementById('extractPriceBtn');

// 버튼 변수들은 아래에서 선언됨 (이미 manual...Btn 선언부와 통합 예정)

const manualLongBtn = document.getElementById('manualLongBtn');
const manualShortBtn = document.getElementById('manualShortBtn');

const recordToggle = document.getElementById('recordToggle');

// Settings Elements
const autoRefreshInterval = document.getElementById('autoRefreshInterval');
const autoRefreshCountdown = document.getElementById('autoRefreshCountdown');
const loadDataBtn = document.getElementById('loadDataBtn');
const saveDataBtn = document.getElementById('saveDataBtn');
const clearDataBtn = document.getElementById('clearDataBtn');
const saveFileInput = document.getElementById('saveFileInput');

// Status Elements
const currentAssets = document.getElementById('currentAssets');
const currentPrice = document.getElementById('currentPrice');
const currentAmount = document.getElementById('currentAmount');
const stopLossPrice = document.getElementById('stopLossPrice');

// Position Status Elements
const positionStatus = document.getElementById('positionStatus');
const activePositionDetails = document.getElementById('activePositionDetails');
const posSymbol = document.getElementById('posSymbol');
const posSide = document.getElementById('posSide');
const posPnl = document.getElementById('posPnl');
const posSize = document.getElementById('posSize');

// Reset Button
const resetSelectorsBtn = document.getElementById('resetSelectorsBtn');

// Trading Style & Martingale Elements
const tradingStyleSelect = document.getElementById('tradingStyleSelect');
const standardPositionSettings = document.getElementById('standardPositionSettings');
const martingalePositionSettings = document.getElementById('martingalePositionSettings');
const martingaleBase = document.getElementById('martingaleBase');
const martingaleMultiplier = document.getElementById('martingaleMultiplier');
const applyMartingaleBtn = document.getElementById('applyMartingaleBtn');

// API Fallback Elements
const apiFallbackToggle = document.getElementById('apiFallbackToggle');
const apiKeyInput = document.getElementById('apiKey');
const apiSecretInput = document.getElementById('apiSecret');

let isTrading = false;
let isSelecting = false;
let currentSelectionType = 'balance'; // 'balance' or 'price'
let savedSelector = null;
let savedPriceSelector = null;
let autoRefreshTimer = null;
let autoRefreshCountdownTimer = null;
let autoRefreshRemainingTime = 0;
let savedSelectors = {
  assets: null,
  price: null
};
let extractionInterval = null;

// Trading Card States (8-Macro System)
let currentRole = 'open'; // 'open', 'close'
let currentType = 'limit'; // 'limit', 'market' (Limit is now first)

// Tabs
const tabOpen = document.getElementById('tabOpen');
const tabClose = document.getElementById('tabClose');
const typeMarket = document.getElementById('typeMarket');
const typeLimit = document.getElementById('typeLimit');

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
  goToExchangeBtn.disabled = !selectedExchange;
  await saveSettings();
  updateSelectorUI(); // Reload selectors based on new scope
});

// Market Type Selection Logic
if (marketTypeSelect) {
  marketTypeSelect.addEventListener('change', async () => {
    // Save settings and reload selectors
    await saveSettings();
    updateSelectorUI();
  });
}

async function saveSettings() {
  const settings = {
    selectedExchange: exchangeSelect.value,
    marketType: marketTypeSelect ? marketTypeSelect.value : 'futures'
  };
  await chrome.storage.local.set(settings);
}



// Leverage Slider Sync
const leverageSlider = document.getElementById('leverageSlider');

function updateLeverageDisplay(value) {
  // Ensure value is within bounds
  let val = parseInt(value);
  if (isNaN(val)) val = 1;
  if (val < 1) val = 1;
  if (val > 125) val = 125;

  leverageValueInput.value = val;
  leverageSlider.value = val;

  currentAmount.textContent = calculateAmount();
}

if (leverageSlider && leverageValueInput) {
  // Slider Input Event (Real-time)
  leverageSlider.addEventListener('input', (e) => {
    updateLeverageDisplay(e.target.value);
  });

  // Slider Change Event (Save)
  leverageSlider.addEventListener('change', () => {
    saveSettings();
  });

  // Input Box Input Event
  leverageValueInput.addEventListener('input', (e) => {
    const val = e.target.value;
    // Update slider visually without clamping immediately while typing? 
    // Or just clamp. Let's clamp on blur/change, but update slider if valid number.
    if (val && !isNaN(val)) {
      leverageSlider.value = Math.min(Math.max(val, 1), 125);
      currentAmount.textContent = calculateAmount();
    }
  });

  // Input Box Change Event (Save & Clamp)
  leverageValueInput.addEventListener('change', (e) => {
    updateLeverageDisplay(e.target.value); // Clamp and sync
    saveSettings();
  });
}

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
    // Open in background to keep popup open
    await chrome.tabs.create({ url, active: false });
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

// ============================================
// View Navigation Functions
// ============================================

function switchView(viewId) {
  // Hide all views
  mainView.classList.add('hidden');
  settingsView.classList.add('hidden');

  // Show target view
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.remove('hidden');
    // Save current view state if needed
  }
}

// Navigation Event Listeners
if (toSettingsBtn) {
  toSettingsBtn.addEventListener('click', () => switchView('settingsView'));
}

if (backToMainBtn) {
  backToMainBtn.addEventListener('click', () => switchView('mainView'));
}

if (saveGlobalSettingsBtn) {
  saveGlobalSettingsBtn.addEventListener('click', async () => {
    await saveSettings();
  });
}

// ============================================
// Trading Style Logic
// ============================================
function toggleTradingStyleUI() {
  const style = tradingStyleSelect.value;

  // Hide all style-specific settings first
  const styleGroups = [
    standardPositionSettings,
    martingalePositionSettings,
    document.getElementById('fixedRiskSettings'),
    document.getElementById('smartDcaSettings'),
    document.getElementById('pyramidingSettings'),
    document.getElementById('twapSettings'),
    document.getElementById('boxControlSettings')
  ];

  styleGroups.forEach(group => {
    if (group) group.classList.add('hidden');
  });

  // Show the selected one
  switch (style) {
    case 'standard':
      standardPositionSettings.classList.remove('hidden');
      break;
    case 'martingale':
      martingalePositionSettings.classList.remove('hidden');
      break;
    case 'fixed_risk':
      document.getElementById('fixedRiskSettings').classList.remove('hidden');
      break;
    case 'smart_dca':
      document.getElementById('smartDcaSettings').classList.remove('hidden');
      break;
    case 'pyramiding':
      document.getElementById('pyramidingSettings').classList.remove('hidden');
      break;
    case 'twap':
      document.getElementById('twapSettings').classList.remove('hidden');
      break;
    case 'box_control':
      document.getElementById('boxControlSettings').classList.remove('hidden');
      break;
    default:
      standardPositionSettings.classList.remove('hidden');
  }
}

if (tradingStyleSelect) {
  tradingStyleSelect.addEventListener('change', toggleTradingStyleUI);
}

// Martingale Calculation Logic
if (applyMartingaleBtn) {
  applyMartingaleBtn.addEventListener('click', () => {
    const base = parseFloat(martingaleBase.value) || 10;
    const multiplier = parseFloat(martingaleMultiplier.value) || 2.0;

    // Simple geometric progression for example: Base, Base*M, Base*M^2
    // Normalized to 100% if sum exceeds 100? Or just set inputs?
    // Strategy.md suggests: input_martingale multiplier applies to size.

    // For now, let's just populate the position inputs as requested
    const p1 = base;
    const p2 = base * multiplier;
    const p3 = base * multiplier * multiplier;

    // Cap at 100 total? Or let user decide?
    // Let's just set the values to the inputs (hidden or not)
    document.getElementById('position1').value = p1.toFixed(2);
    document.getElementById('position2').value = p2.toFixed(2);
    document.getElementById('position3').value = p3.toFixed(2);

    alert(`Martingale Positions Calculated:\nPos1: ${p1}%\nPos2: ${p2}%\nPos3: ${p3}%`);
  });
}

// ============================================
// 매크로 녹화 기능
// ============================================

// 녹화 상태 확인 및 UI 업데이트 함수
function updateRecordingModeUI() {
  const isRecMode = recordToggle.checked;
  const isClose = currentRole === 'close';

  // 버튼 텍스트 업데이트 (다국어 지원)
  if (isRecMode) {
    manualLongBtn.textContent = isClose ? 'Rec Close Long' : 'Rec Long';
    manualShortBtn.textContent = isClose ? 'Rec Close Short' : 'Rec Short';

    // 스타일 변경
    [manualLongBtn, manualShortBtn].forEach(btn => {
      btn.classList.add('recording-mode-active');
    });
  } else {
    updateActionButtonsUI(); // 일반 모드로 명칭 복구

    [manualLongBtn, manualShortBtn].forEach(btn => {
      btn.classList.remove('recording-mode-active');
    });
  }
}

// 액션 버튼 명칭 업데이트 (진입/청산 상태에 따라)
function updateActionButtonsUI() {
  if (recordToggle.checked) return; // 녹화 모드일 때는 무시

  const isClose = currentRole === 'close';
  if (isClose) {
    manualLongBtn.textContent = lang.t('close_long');
    manualShortBtn.textContent = lang.t('close_short');
  } else {
    manualLongBtn.textContent = lang.t('long');
    manualShortBtn.textContent = lang.t('short');
  }
}

// 탭 전환 핸들러
function initTradingTabs() {
  // Role Tabs (Open/Close)
  if (tabOpen && tabClose) {
    tabOpen.addEventListener('click', () => {
      currentRole = 'open';
      tabOpen.classList.add('active');
      tabClose.classList.remove('active');
      updateActionButtonsUI();
      updateMacroButtonStates();
      if (recordToggle.checked) updateRecordingModeUI();
    });

    tabClose.addEventListener('click', () => {
      currentRole = 'close';
      tabClose.classList.add('active');
      tabOpen.classList.remove('active');
      updateActionButtonsUI();
      updateMacroButtonStates();
      if (recordToggle.checked) updateRecordingModeUI();
    });
  }

  // Type Tabs (Market/Limit)
  if (typeMarket && typeLimit) {
    typeMarket.addEventListener('click', () => {
      currentType = 'market';
      typeMarket.classList.add('active');
      typeLimit.classList.remove('active');
      updateMacroButtonStates();
    });

    typeLimit.addEventListener('click', () => {
      currentType = 'limit';
      typeLimit.classList.add('active');
      typeMarket.classList.remove('active');
      updateMacroButtonStates();
    });
  }
}

// 초기화 시 탭 이벤트 등록
initTradingTabs();

// 토글 변경 이벤트
recordToggle.addEventListener('change', updateRecordingModeUI);

// ============================================
// 수동 매매 기능
// ============================================

// Manual Long 버튼 (녹화/실행 통합 - 8-매크로 대응)
manualLongBtn.addEventListener('click', async () => {
  const macroKey = `${currentRole}_long_${currentType}`;

  if (recordToggle.checked) {
    // 녹화 로직
    if (stateManager.getState('recording.active')) {
      await stopMacroRecording(macroKey);
    } else {
      await startMacroRecording(macroKey);
    }
    return;
  }

  // 실행 로직
  const macros = await loadMacros();
  const macroData = macros[`${macroKey}Macro`];
  if (!macroData || macroData.length === 0) {
    alert(lang.t('no_macro_recorded', { type: `${currentRole} Long (${currentType})` }));
    return;
  }

  if (currentRole === 'open') {
    const calculatedAmount = calculateAmount();
    if (!calculatedAmount || calculatedAmount === '-') {
      alert(lang.t('amount_calculation_failed'));
      return;
    }
    await executeSplitEntryAll(macroKey);
  } else {
    // Close 로직
    const result = await executeSmartTrade(macroKey, null);
    if (result && result.success) {
      if (currentPosition.type === 'long') {
        if (confirm(lang.t('close_position_confirm', { type: 'Long' }) || "End Long Position status?")) {
          resetPositionState();
        }
      }
    }
  }
});

// Manual Short 버튼 (녹화/실행 통합 - 8-매크로 대응)
manualShortBtn.addEventListener('click', async () => {
  const macroKey = `${currentRole}_short_${currentType}`;

  if (recordToggle.checked) {
    // 녹화 로직
    if (stateManager.getState('recording.active')) {
      await stopMacroRecording(macroKey);
    } else {
      await startMacroRecording(macroKey);
    }
    return;
  }

  // 실행 로직
  const macros = await loadMacros();
  const macroData = macros[`${macroKey}Macro`];
  if (!macroData || macroData.length === 0) {
    alert(lang.t('no_macro_recorded', { type: `${currentRole} Short (${currentType})` }));
    return;
  }

  if (currentRole === 'open') {
    const calculatedAmount = calculateAmount();
    if (!calculatedAmount || calculatedAmount === '-') {
      alert(lang.t('amount_calculation_failed'));
      return;
    }
    await executeSplitEntryAll(macroKey);
  } else {
    // Close 로직
    const result = await executeSmartTrade(macroKey, null);
    if (result && result.success) {
      if (currentPosition.type === 'short') {
        if (confirm(lang.t('close_position_confirm', { type: 'Short' }) || "End Short Position status?")) {
          resetPositionState();
        }
      }
    }
  }
});

function resetPositionState() {
  resetSplitEntryState();
  currentPosition.isActive = false;
  currentPosition.entryPrice = null;
  currentPosition.type = null;
  stateManager.setState('position.isActive', false);
  updateStopLossPriceDisplay();
}

// ============================================
// 데이터 관리 기능
// ============================================

// Reset All Data functionality removed

// Load Data 버튼 (Import 기능 - 파일에서 데이터 불러오기)
if (loadDataBtn) {
  loadDataBtn.addEventListener('click', () => {
    saveFileInput.click();
  });
}

// 파일 선택 시 Load 실행
if (saveFileInput) {
  saveFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
      await loadAllData(file);
      // 파일 입력 초기화
      saveFileInput.value = '';
    }
  });
}

// Save Data 버튼 (Export 기능 - 데이터 다운로드)
if (saveDataBtn) {
  saveDataBtn.addEventListener('click', async () => {
    await saveAllData();
  });
}

// Clear Data 버튼
if (clearDataBtn) {
  clearDataBtn.addEventListener('click', async () => {
    await clearAllData();
  });
}

// resetAllData function removed

// 모든 데이터 불러오기 (Load = Import 기능 - 파일에서 데이터 불러오기)
async function loadAllData(file) {
  try {
    const text = await file.text();
    const loadData = JSON.parse(text);

    // 버전 확인 (향후 호환성을 위해)
    if (loadData.version && loadData.version !== '1.0') {
      // 다른 버전의 데이터 (경고만 표시, 계속 진행)
    }

    // exportDate와 version 제거
    delete loadData.exportDate;
    delete loadData.version;

    // 새 데이터로 교체 (StorageUtils 사용)
    await storageUtils.setAllData(loadData);

    // UI 새로고침
    await loadSettings();

    // 텔레그램 설정도 로드
    await loadTelegramSettings();

    updateSelectorButtonStates();
    updateMacroButtonStates();

    alert(lang.t('load_data_success', {}));

  } catch (error) {
    console.error('Load Data 실패:', error);
    alert(`${lang.t('load_data_failed', {})}\n${error.message || error}`);
  }
}

// 모든 데이터 삭제
async function clearAllData() {
  try {
    // 확인 메시지
    const confirmMessage = lang.t('clear_data_confirm', {});
    if (!confirm(confirmMessage)) {
      return;
    }

    // 모든 데이터 삭제 (StorageUtils 사용)
    await storageUtils.clear();

    // 페이지 새로고침하여 UI 초기화
    alert(lang.t('clear_data_success', {}));
    location.reload();

  } catch (error) {
    alert(lang.t('clear_data_failed', {}));
  }
}

// 모든 데이터 저장하기 (Save = Export 기능 - 데이터 다운로드)
async function saveAllData() {
  try {
    // 텔레그램 설정 먼저 저장
    await saveTelegramSettings();

    // 모든 저장된 데이터 가져오기 (StorageUtils 사용)
    const allData = await storageUtils.getAllData();

    // 현재 설정 추가
    const saveData = {
      ...allData,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    // JSON 파일로 다운로드
    const dataStr = JSON.stringify(saveData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tradingbot-data-${new Date().toISOString().split('T')[0]}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    alert(lang.t('save_data_success', {}));

  } catch (error) {
    alert(lang.t('save_data_failed', {}));
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
  } else if (type === 'close_long') {
    isCloseLongRecording = false;
  } else if (type === 'close_short') {
    isCloseShortRecording = false;
  }

  // UI 즉시 업데이트
  updateMacroRecordingUI(type, false);
}

// 매크로 녹화 UI 업데이트
function updateMacroRecordingUI(type, isRecording) {
  let button;

  switch (type) {
    case 'long':
      button = longRecordBtn;
      break;
    case 'short':
      button = shortRecordBtn;
      break;
    case 'close_long':
      button = closeLongRecordBtn;
      break;
    case 'close_short':
      button = closeShortRecordBtn;
      break;
    default:
      return;
  }

  if (isRecording) {
    button.classList.add('recording');
  } else {
    button.classList.remove('recording');
  }
}

// 매크로 저장 (StorageUtils 사용)
async function saveMacro(macroType, actions) {
  await storageUtils.saveMacro(macroType, actions);
}

// 매크로 불러오기 (StorageUtils 사용)
async function loadMacros() {
  return await storageUtils.loadMacros(['long', 'short', 'close_long', 'close_short']);
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

  // 🎯 초기 진입 시점의 자본금 고정 (분할 진입 중 자본금 변동 방지)
  const initialAssetsText = currentAssets.textContent.trim();
  console.log(`💰 초기 자본금 고정: ${initialAssetsText}`);

  // 순차적으로 각 포지션 진입
  for (let i = 0; i < activePositions.length; i++) {
    const position = activePositions[i];
    const positionPercent = position.value;
    // 고정된 자본금 사용하여 Amount 계산
    const amount = calculateAmountForPosition(positionPercent, initialAssetsText);

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
          const side = tradeType.includes('long') ? 'long' : 'short';
          currentPosition.type = side;
          currentPosition.entryPrice = entryPriceBeforeTrade;
          currentPosition.entryTime = Date.now();
          currentPosition.isActive = true;

          // StateManager에도 상태 저장
          stateManager.setState('position.current', side);
          stateManager.setState('position.entryPrice', entryPriceBeforeTrade);
          stateManager.setState('position.entryTime', Date.now());
          stateManager.setState('position.isActive', true);

          console.log(`📊 진입가 기록: ${entryPriceBeforeTrade} (포지션: ${side})`);

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
          await autoSetStopLossAfterEntry(side, entryPriceBeforeTrade);

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
    // 매크로 존재 여부 확인 (8-매크로 대응: 현재 포지션에 맞는 청산 매크로 찾기)
    const side = currentPosition.type; // 'long' or 'short'
    if (!side) return;

    const macros = await loadMacros();
    const marketKey = `close_${side}_marketMacro`;
    const macroData = macros[marketKey];
    const macroType = `close_${side}_market`;

    if (!macroData || macroData.length === 0) {
      console.warn(`⚠️ 자동청산 실패: ${side} Market 청산 매크로가 없습니다.`);
      return;
    }

    // TP 타입에 따라 처리
    let tpResult;
    if (customTpStrategy.type === 'split') {
      // Split TP는 텔레그램 신호 기반이므로 여기서는 처리하지 않음
      console.log('Split TP는 텔레그램 신호를 통해 실행됩니다.');
      return;
    } else {
      // Simple TP 또는 Trailing TP - 전체 종료
      await executeSmartTrade(macroType, null);

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
async function executeSplitEntry(tradeType, symbol = null) {

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
    const result = await executeSmartTrade(tradeType, amount, symbol);

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

/*
 * Smart Trade Execution with API Fallback
 */
async function executeSmartTrade(signal, amount, symbol = null) {
  const targetSymbol = symbol || (userSymbolInput ? userSymbolInput.value.trim() : '');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) throw new Error('활성 탭을 찾을 수 없습니다.');

    // Content Script 주입 확인
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ['content/content.js']
      });
    } catch (injectionError) {
      // Ignore
    }

    // Attempt Macro Execution
    return await new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const response = await sendMessageToContentScript({
            action: 'executeSmartTrade',
            tradeType: signal,
            amount: amount
          });

          if (response && response.success) {
            resolve(response);
          } else {
            const errorMsg = response?.error || '알 수 없는 오류';
            console.error(`❌ ${signal} M-Trade Failed: ${errorMsg}`);
            reject(new Error(errorMsg));
          }
        } catch (messageError) {
          reject(messageError);
        }
      }, 500);
    });

  } catch (error) {
    console.warn(`Smart Trade (Macro) failed for ${signal}:`, error);

    // --- API FALLBACK ---
    if (apiFallbackToggle && apiFallbackToggle.checked && exchangeManager && exchangeManager.isConfigured()) {
      console.log('⚠️ Activating API Fallback...');
      try {
        let side = 'BUY';
        if (signal.includes('short')) side = 'SELL';
        if (signal.includes('close_long')) side = 'SELL';
        if (signal.includes('close_short')) side = 'BUY';
        if (signal.includes('close')) {
          if (currentPosition.type === 'long') side = 'SELL';
          else if (currentPosition.type === 'short') side = 'BUY';
          else throw new Error("Close Fallback: Unknown Position Type");
        }

        const result = await exchangeManager.placeOrder(
          targetSymbol,
          side,
          amount || '0',
          'MARKET'
        );
        return { success: true, message: 'Executed via API Fallback', apiResult: result, fallback: true };
      } catch (apiError) {
        console.error('API Fallback failed:', apiError);
        throw new Error(`Macro: ${error.message}, API: ${apiError.message}`);
      }
    }

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
        target: { tabId: tab.id, allFrames: true },
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
const exchangeManager = new ExchangeManager();
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
      // TP 신호 처리
      if (signal.action && signal.action.startsWith('TP')) {
        const tpLevel = signal.action.replace('TP', '');
        await executeSplitTp(tpLevel);
      } else {
        // 일반 거래 신호 처리
        await executeAutoTrade(signal);
      }
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
async function extractPrice(frameId = 0) {
  let selectorStr = savedPriceSelector;
  let targetFrameId = frameId;

  if (savedPriceSelector && typeof savedPriceSelector === 'object' && savedPriceSelector.selector) {
    selectorStr = savedPriceSelector.selector;
    if (!targetFrameId) targetFrameId = savedPriceSelector.frameId || 0;
  }

  // 1. Selector 기반 추출 시도
  if (selectorStr) {
    await dataExtractor.extractPrice(selectorStr, currentPrice, (value) => {
      if (value) {
        currentPrice.textContent = value;
        currentAmount.textContent = calculateAmount();
        updateTpPriceDisplay();
      }
    }, targetFrameId);
  }

  // 2. API Fallback (값이 없거나 '-' 일 경우)
  setTimeout(async () => {
    const priceText = currentPrice.textContent;
    if (priceText === '-' || priceText === '' || !priceText) {
      if (exchangeManager.isConfigured()) {
        try {
          console.log('Extraction failed/empty, attempting API Fallback for Price...');
          // TODO: User Symbol Input might not be focused or valid? Use stored symbol?
          const symbol = userSymbolInput && userSymbolInput.value ? userSymbolInput.value : 'BTCUSDT';
          const result = await exchangeManager.fetchPrice(symbol);
          if (result && result.price) {
            currentPrice.textContent = result.price;
            currentAmount.textContent = calculateAmount();
            updateTpPriceDisplay();
            console.log('Price updated via API Fallback:', result.price);
          }
        } catch (e) {
          console.error('API Fallback failed:', e);
        }
      }
    }
  }, 700); // Wait for potential extraction callback
}

// 자본금 추출 실행 (DataExtractor 사용)
async function extractAssets(frameId = 0) {
  let selectorStr = savedSelector;
  let targetFrameId = frameId;

  if (savedSelector && typeof savedSelector === 'object' && savedSelector.selector) {
    selectorStr = savedSelector.selector;
    if (!targetFrameId) targetFrameId = savedSelector.frameId || 0;
  }

  // 1. Selector 기반 추출 시도
  if (selectorStr) {
    await dataExtractor.extractAssets(selectorStr, currentAssets, (value) => {
      if (value) {
        // Strip non-numeric characters (keep digits, dot, minus)
        const cleanedValue = value.replace(/[^\d.-]/g, '');
        currentAssets.textContent = cleanedValue;
        currentAmount.textContent = calculateAmount();
      }
    }, targetFrameId);
  }

  // 2. API Fallback
  setTimeout(async () => {
    const assetsText = currentAssets.textContent;
    if (assetsText === '-' || assetsText === '' || !assetsText) {
      if (exchangeManager.isConfigured()) {
        try {
          console.log('Extraction failed/empty, attempting API Fallback for Assets...');
          const result = await exchangeManager.fetchBalance();
          if (result && result.availableBalance) {
            currentAssets.textContent = result.availableBalance;
            currentAmount.textContent = calculateAmount();
            console.log('Assets updated via API Fallback:', result.availableBalance);
          }
        } catch (e) {
          console.error('API Fallback failed:', e);
        }
      }
    }
  }, 700);
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
        extractAssetsBtn.textContent = lang.t('selecting');
        break;
      case 'price':
        extractPriceBtn.disabled = true;
        extractPriceBtn.textContent = lang.t('selecting');
        break;
    }
  } else {
    // 모든 버튼 원래 상태로 복원
    extractAssetsBtn.disabled = false;
    extractAssetsBtn.textContent = lang.t('extract');
    extractPriceBtn.disabled = false;
    extractPriceBtn.textContent = lang.t('extract');
  }
}

// 셀렉터 추출 상태 업데이트
// 셀렉터 추출 상태 업데이트
function updateSelectorButtonStates() {
  // Assets Extraction 버튼
  if (savedSelectors.assets) {
    extractAssetsBtn.style.display = 'none';
    currentAssets.style.display = 'block';
    // Ensure value text is visible if hidden by CSS previously
  } else {
    extractAssetsBtn.style.display = 'flex'; // Use flex to center icon
    currentAssets.style.display = 'none';
  }

  // Price Extraction 버튼
  if (savedSelectors.price) {
    extractPriceBtn.style.display = 'none';
    const priceWrapper = document.querySelector('.price-wrapper');
    if (priceWrapper) priceWrapper.style.display = 'flex';
  } else {
    extractPriceBtn.style.display = 'flex';
    const priceWrapper = document.querySelector('.price-wrapper');
    if (priceWrapper) priceWrapper.style.display = 'none';
  }
}


// 매크로 버튼 상태 업데이트
// 매크로 버튼 상태 업데이트
async function updateMacroButtonStates() {
  console.log('🔄 매크로 버튼 상태 업데이트 시작');
  const macros = await loadMacros();
  console.log('📦 로드된 매크로들:', macros);

  // Long Record 버튼
  if (macros.longMacro && macros.longMacro.length > 0) {
    longRecordBtn.classList.add('has-macro');
    if (manualLongBtn) manualLongBtn.disabled = false;
    console.log('Long macro: Available');
  } else {
    longRecordBtn.classList.remove('has-macro');
    if (manualLongBtn) manualLongBtn.disabled = true;
    console.log('Long macro: Not available');
  }

  // Short Record 버튼
  if (macros.shortMacro && macros.shortMacro.length > 0) {
    shortRecordBtn.classList.add('has-macro');
    if (manualShortBtn) manualShortBtn.disabled = false;
    console.log('Short macro: Available');
  } else {
    shortRecordBtn.classList.remove('has-macro');
    if (manualShortBtn) manualShortBtn.disabled = true;
    console.log('Short macro: Not available');
  }

  // Close Record 버튼
  if (macros.close_longMacro && macros.close_longMacro.length > 0) {
    if (closeLongRecordBtn) closeLongRecordBtn.classList.add('has-macro');
  } else {
    if (closeLongRecordBtn) closeLongRecordBtn.classList.remove('has-macro');
  }

  if (macros.close_shortMacro && macros.close_shortMacro.length > 0) {
    if (closeShortRecordBtn) closeShortRecordBtn.classList.add('has-macro');
  } else {
    if (closeShortRecordBtn) closeShortRecordBtn.classList.remove('has-macro');
  }

  console.log('✅ 매크로 버튼 상태 업데이트 완료');
}

// Reset Selectors Button - Clear selectors for current exchange
if (resetSelectorsBtn) {
  resetSelectorsBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to reset the extracted asset/price locations?')) return;

    const currentExchange = exchangeSelect ? exchangeSelect.value : '';

    // Reset state
    savedSelectors.assets = null;
    savedSelectors.price = null;
    savedSelector = null;
    savedPriceSelector = null;
    stateManager.setState('selectors.assets', null);
    stateManager.setState('selectors.price', null);

    // Reset Storage
    if (currentExchange) {
      await storageUtils.saveSelector('balance', null, currentExchange);
      await storageUtils.saveSelector('price', null, currentExchange);
    } else {
      await chrome.storage.local.remove(['balanceSelector', 'priceSelector']);
    }

    // Reset UI text
    currentAssets.textContent = '-';
    currentPrice.textContent = '-';

    updateSelectorButtonStates();
    console.log('Selectors reset complete.');
  });
}


// Background로부터 메시지 수신 (선택된 요소 정보)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Popup이 메시지 수신:', request);

  if (request.action === 'elementSelected') {
    // 선택된 요소 정보 저장
    const { selector, text } = request;
    const frameId = sender.frameId || 0;

    // 성입에 따라 셀렉터 저장 (StateManager 사용)
    const selectionType = stateManager.getState('selection.type');

    const currentExchange = exchangeSelect ? exchangeSelect.value : '';
    const currentMarketType = marketTypeSelect ? marketTypeSelect.value : 'futures';
    const selectorData = { selector, frameId };

    if (selectionType === 'balance') {
      savedSelector = selectorData;
      savedSelectors.assets = selectorData;
      stateManager.setState('selectors.assets', selectorData);

      // Save with Exchange & Market Type Scope
      storageUtils.saveSelector('balance', selectorData, currentExchange, currentMarketType);

      // 자동으로 자본금 추출만 실행
      setTimeout(() => {
        extractAssets(frameId);
        console.log(`요소 선택 완료 (Frame: ${frameId}) - 자본금 추출만 실행`);
      }, 1000);
    } else if (selectionType === 'price') {
      savedPriceSelector = selectorData;
      savedSelectors.price = selectorData;
      stateManager.setState('selectors.price', selectorData);

      // Save with Exchange & Market Type Scope
      storageUtils.saveSelector('price', selectorData, currentExchange, currentMarketType);

      // 자동으로 현재가 추출만 실행
      setTimeout(() => {
        extractPrice(frameId);
        console.log(`요소 선택 완료 (Frame: ${frameId}) - 현재가 추출만 실행`);
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
  const tradingMode = 'oneway';
  const autoRefresh = parseInt(autoRefreshInterval?.value) || 0;

  // New Settings
  const tradingStyle = tradingStyleSelect ? tradingStyleSelect.value : 'standard';
  const apiFallback = apiFallbackToggle ? apiFallbackToggle.checked : false;
  const apiKey = apiKeyInput ? apiKeyInput.value : '';
  const apiSecret = apiSecretInput ? apiSecretInput.value : '';

  // Order Type
  const orderType = document.querySelector('input[name="orderType"]:checked')?.value || 'market';

  // Martingale Settings
  const martingaleBaseVal = parseFloat(martingaleBase.value) || 10;
  const martingaleMultiplierVal = parseFloat(martingaleMultiplier.value) || 2.0;

  await storageUtils.save({
    isTrading: isTrading,
    selectedExchange: selectedExchange,
    leverage: leverage,
    position: position,
    stoploss: stoploss,
    tradingMode: 'oneway',
    autoRefresh: autoRefresh,
    // New Fields
    tradingStyle: tradingStyle,
    apiFallback: apiFallback,
    apiKey: apiKey,
    apiSecret: apiSecret,
    orderType: orderType,
    martingaleSettings: {
      base: martingaleBaseVal,
      multiplier: martingaleMultiplierVal
    }
  });

  // StateManager Update to include new settings if needed
  stateManager.setState('settings.exchange', selectedExchange);
  stateManager.setState('settings.leverage', leverage);
  stateManager.setState('settings.stoploss', stoploss);
  stateManager.setState('settings.autoRefresh', autoRefresh);

  // Setup Auto Refresh
  if (isTrading) {
    setupAutoRefresh(autoRefresh);
  } else {
    setupAutoRefresh(0);
  }

  console.log('Settings Saved Successfully!');
}


// 설정 불러오기 (StorageUtils 사용, StateManager 반영)
async function loadSettings() {
  const keys = ['isTrading', 'selectedExchange', 'marketType', 'balanceSelector', 'priceSelector',
    'leverage', 'position', 'stoploss', 'autoRefresh',
    'tradingStyle', 'apiFallback', 'apiKey', 'apiSecret', 'orderType', 'martingaleSettings'];

  const result = await storageUtils.load(keys);

  if (result.isTrading !== undefined) {
    isTrading = result.isTrading;
    stateManager.setState('trading.isActive', isTrading);
    updateUI();
    if (isTrading && savedSelector) {
      setTimeout(() => startPeriodicExtraction(), 2000);
    }
  }

  if (result.selectedExchange) {
    exchangeSelect.value = result.selectedExchange;
    goToExchangeBtn.disabled = false;
    stateManager.setState('settings.exchange', result.selectedExchange);
  }

  if (marketTypeSelect) {
    marketTypeSelect.value = result.marketType || 'futures';
  }

  if (result.leverage) {
    leverageValueInput.value = result.leverage;
    if (leverageSlider) leverageSlider.value = result.leverage; // Sync slider
    stateManager.setState('settings.leverage', result.leverage);
  }

  if (result.stoploss !== undefined) {
    stoplossValueInput.value = result.stoploss;
    stateManager.setState('settings.stoploss', result.stoploss);
  } else {
    stoplossValueInput.value = 2;
  }

  stateManager.setState('trading.mode', 'oneway');

  if (result.autoRefresh !== undefined && autoRefreshInterval) {
    autoRefreshInterval.value = result.autoRefresh;
    stateManager.setState('settings.autoRefresh', result.autoRefresh);
    if (isTrading && result.autoRefresh > 0 && result.autoRefresh <= 100) {
      setupAutoRefresh(result.autoRefresh);
    }
  } else if (autoRefreshInterval) {
    autoRefreshInterval.value = 0;
  }

  // Load New Settings
  if (result.tradingStyle && tradingStyleSelect) {
    tradingStyleSelect.value = result.tradingStyle;
    toggleTradingStyleUI(); // Update UI visibility
  }

  if (result.apiFallback !== undefined && apiFallbackToggle) {
    apiFallbackToggle.checked = result.apiFallback;
  }

  if (result.apiKey && apiKeyInput) apiKeyInput.value = result.apiKey;
  if (result.apiSecret && apiSecretInput) apiSecretInput.value = result.apiSecret;

  if (result.orderType) {
    const radio = document.querySelector(`input[name="orderType"][value="${result.orderType}"]`);
    if (radio) radio.checked = true;
  }

  if (result.martingaleSettings) {
    if (martingaleBase) martingaleBase.value = result.martingaleSettings.base;
    if (martingaleMultiplier) martingaleMultiplier.value = result.martingaleSettings.multiplier;
  }

  // Initialize ExchangeManager with loaded settings
  if (exchangeManager) {
    exchangeManager.init(
      result.selectedExchange || (exchangeSelect ? exchangeSelect.value : ''),
      result.apiKey || '',
      result.apiSecret || ''
    );
  }

  // 셀렉터 로드 (Exchange & Market Type Scoped)
  const currentExchange = result.selectedExchange || (exchangeSelect ? exchangeSelect.value : '');
  const currentMarketType = result.marketType || (marketTypeSelect ? marketTypeSelect.value : 'futures');
  const selectors = await storageUtils.loadSelectors(currentExchange, currentMarketType);

  if (selectors.balanceSelector) {
    savedSelector = selectors.balanceSelector;
    savedSelectors.assets = selectors.balanceSelector;
    stateManager.setState('selectors.assets', selectors.balanceSelector);
    setTimeout(() => { extractAssets(); console.log('Loaded Assets'); }, 1000);
  } else {
    // Reset if not found for this exchange
    savedSelector = null;
    savedSelectors.assets = null;
    stateManager.setState('selectors.assets', null);
  }

  if (selectors.priceSelector) {
    savedPriceSelector = selectors.priceSelector;
    savedSelectors.price = selectors.priceSelector;
    stateManager.setState('selectors.price', selectors.priceSelector);
    setTimeout(() => { extractPrice(); console.log('Loaded Price'); }, 1000);
  } else {
    // Reset if not found
    savedPriceSelector = null;
    savedSelectors.price = null;
    stateManager.setState('selectors.price', null);
  }

  updateSelectorButtonStates();
  updateMacroButtonStates();
}

// 매크로 버튼 상태 업데이트
// 매크로 버튼 상태 업데이트 (8-매크로 대응)
async function updateMacroButtonStates() {
  const macros = await loadMacros();

  // 현재 설정된 Role과 Type에 맞는 키 생성
  const longKey = `${currentRole}_long_${currentType}Macro`;
  const shortKey = `${currentRole}_short_${currentType}Macro`;

  // Long 버튼 업데이트
  if (macros[longKey] && macros[longKey].length > 0) {
    manualLongBtn.classList.add('has-macro');
  } else {
    manualLongBtn.classList.remove('has-macro');
  }

  // Short 버튼 업데이트
  if (macros[shortKey] && macros[shortKey].length > 0) {
    manualShortBtn.classList.add('has-macro');
  } else {
    manualShortBtn.classList.remove('has-macro');
  }
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
// 특정 포지션 비율에 대한 Amount 계산
function calculateAmountForPosition(positionPercent, overrideAssetsText = null) {
  const assetsText = overrideAssetsText || currentAssets.textContent.trim();
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
  switch (customTpStrategy.type) {
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
        // Split TP는 비중 기반이므로 가격 표시 대신 비중 표시
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
          const positionPercent = customTpStrategy.splitTp[nextTpIndex];
          splitTpPriceValue.textContent = `TP${nextTpIndex + 1}: ${positionPercent}% 비중`;
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
    if (isCloseLongRecording) {
      stopMacroRecording('close_long');
      isCloseLongRecording = false;
      console.log('ESC로 Close Long 녹화 중단');
    }
    if (isCloseShortRecording) {
      stopMacroRecording('close_short');
      isCloseShortRecording = false;
      console.log('ESC로 Close Short 녹화 중단');
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
const copyWebhookUrlBtn = document.getElementById('copyWebhookUrl');
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
  try {
    const botToken = botTokenInput ? botTokenInput.value.trim() : '';
    const chatId = chatIdInput ? chatIdInput.value.trim() : '';

    if (!botToken || !chatId) {
      if (telegramStatusMessage) {
        telegramStatusMessage.textContent = 'Bot Token and Chat ID are required';
        telegramStatusMessage.style.color = '#f44336';
      }
      return;
    }

    // 버튼 비활성화 및 색상 변경
    let originalBgColor = null;
    if (testTelegramConnectionBtn) {
      testTelegramConnectionBtn.disabled = true;
      originalBgColor = testTelegramConnectionBtn.style.backgroundColor || '#6c757d';
      testTelegramConnectionBtn.style.backgroundColor = '#2196f3';
    }

    if (telegramStatusMessage) {
      telegramStatusMessage.textContent = 'Testing connection...';
      telegramStatusMessage.style.color = '#2196f3';
    }

    // TelegramBot 인스턴스 생성
    const telegramBot = new TelegramBot(botToken, chatId);

    // 테스트 메시지 전송
    const testMessage = `✅ Telegram Connection Test\n` +
      `Extension: Crypto Trading Bot\n` +
      `Time: ${new Date().toLocaleString()}\n` +
      `Status: Connected Successfully`;

    const result = await telegramBot.sendMessage(testMessage);

    if (result) {
      // 성공 - 버튼 색상을 녹색으로 변경
      if (testTelegramConnectionBtn) {
        testTelegramConnectionBtn.style.backgroundColor = '#4caf50';
      }

      if (telegramStatusMessage) {
        telegramStatusMessage.textContent = 'Test message sent successfully! Check your Telegram.';
        telegramStatusMessage.style.color = '#4caf50';
      }

      // 설정 저장
      await telegramManager.saveSettings();

      // TelegramManager에 봇 인스턴스 설정
      telegramManager.telegramBot = telegramBot;
      telegramManager.syncToGlobalVars();

      // 신호 파서 초기화
      const userSymbol = userSymbolInput ? userSymbolInput.value.trim() : '';
      if (userSymbol && typeof SignalParser !== 'undefined') {
        telegramManager.signalParser = new SignalParser(userSymbol);
      }

      console.log('✅ 텔레그램 연결 테스트 성공 - 메시지 전송됨');

      // 1.5초 후 원래 색상으로 복귀
      setTimeout(() => {
        if (testTelegramConnectionBtn && originalBgColor) {
          testTelegramConnectionBtn.style.backgroundColor = originalBgColor;
        }
      }, 1500);
    } else {
      throw new Error('Failed to send test message');
    }
  } catch (error) {
    console.error('❌ 텔레그램 연결 테스트 실패:', error);

    // 실패 시 버튼 색상을 빨간색으로 변경
    if (testTelegramConnectionBtn) {
      testTelegramConnectionBtn.style.backgroundColor = '#f44336';
      setTimeout(() => {
        if (testTelegramConnectionBtn && originalBgColor) {
          testTelegramConnectionBtn.style.backgroundColor = originalBgColor;
        }
      }, 1500);
    }

    if (telegramStatusMessage) {
      telegramStatusMessage.textContent = `Connection failed: ${error.message}`;
      telegramStatusMessage.style.color = '#f44336';
    }
  } finally {
    if (testTelegramConnectionBtn) {
      testTelegramConnectionBtn.disabled = false;
    }

    // 자동매매가 이미 실행 중이면 폴링도 자동 시작
    const success = telegramManager.telegramBot !== null;
    if (success && isTrading && !telegramManager.isTelegramTrading) {
      console.log('🔄 자동매매 실행 중 - 텔레그램 폴링 자동 시작');
      await telegramManager.startPolling();
    }
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
      tradeType = 'open_long_market';
    } else if (signal.action === 'SHORT') {
      tradeType = 'open_short_market';
    } else if (signal.action === 'CLOSE') {
      if (currentPosition.isActive && currentPosition.type) {
        tradeType = `close_${currentPosition.type}_market`;
      } else {
        throw new Error("Cannot execute CLOSE: No active position tracked.");
      }
    } else {
      throw new Error(`지원하지 않는 액션: ${signal.action}`);
    }

    // TelegramManager를 통한 잠금 체크
    const canExecute = telegramManager.checkAndLockTrade(tradeType);
    if (!canExecute) {
      return; // 잠금되어 있거나 거래 간격 제한
    }

    if (tradeType === 'close_long' || tradeType === 'close_short') {
      // Close 실행
      const result = await executeSmartTrade(tradeType, null, signal.symbol);

      if (result && result.success) {
        // Cleanup Logic (Same as manualCloseBtn)
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

        const successMessage = lang.t('trade_success', { symbol: signal.symbol, action: signal.action }) + `\n` +
          lang.t('signal_info', { message: signal.originalMessage }) + `\n` +
          `🔄 포지션 종료 완료\n` +
          lang.t('time_info', { time: new Date().toLocaleString() });

        // 스크린샷과 함께 메시지 전송 (TelegramManager 사용)
        await telegramManager.sendMessageWithScreenshot(successMessage, true);
        console.log('✅ Auto close execution successful (with screenshot)');
      } else {
        throw new Error(result?.error || 'Close execution failed');
      }

    } else {
      // 분할 진입 실행 (타임아웃 적용)
      const splitEntryResult = await Promise.race([
        executeSplitEntry(tradeType, signal.symbol),
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
        throw new Error(splitEntryResult?.error || 'Unknown error');
      }
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
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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

// 웹훅 URL 복사 함수
async function copyWebhookUrl() {
  try {
    const botToken = botTokenInput ? botTokenInput.value.trim() : '';
    const chatId = chatIdInput ? chatIdInput.value.trim() : '';

    if (!botToken || !chatId) {
      alert('Bot Token과 Chat ID를 먼저 입력해주세요.');
      return;
    }

    // TradingView 웹훅 URL 생성
    const webhookUrl = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}`;

    // 클립보드에 복사
    await navigator.clipboard.writeText(webhookUrl);

    // 성공 시 버튼 색상만 녹색으로 변경
    if (copyWebhookUrlBtn) {
      const originalBgColor = copyWebhookUrlBtn.style.backgroundColor || '#6c757d';
      copyWebhookUrlBtn.style.backgroundColor = '#4caf50';

      setTimeout(() => {
        copyWebhookUrlBtn.style.backgroundColor = originalBgColor;
      }, 1500);
    }

    console.log('웹훅 URL 복사됨:', webhookUrl);
  } catch (error) {
    console.error('웹훅 URL 복사 실패:', error);
    alert('URL 복사에 실패했습니다. 수동으로 복사해주세요.');
  }
}

// URL 버튼 이벤트 리스너
if (copyWebhookUrlBtn) {
  copyWebhookUrlBtn.addEventListener('click', copyWebhookUrl);
}
// 텔레그램 입력 필드 자동 저장
if (botTokenInput) {
  botTokenInput.addEventListener('blur', async () => {
    await saveTelegramSettings();
  });
}

if (chatIdInput) {
  chatIdInput.addEventListener('blur', async () => {
    await saveTelegramSettings();
  });
}

if (userSymbolInput) {
  userSymbolInput.addEventListener('change', updateTelegramSymbol);
  userSymbolInput.addEventListener('blur', async () => {
    await saveTelegramSettings();
  });
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

      // Determine proper close macro (Strictly use Market for Stop Loss)
      const closeAction = `close_${currentPosition.type}_market`;

      // Manual Close 실행
      executeSmartTrade(closeAction, null).then(async (result) => {
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
  splitTp: [33.33, 33.33, 33.34], // Split TP position percentages (비중)
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
  executedTps: [false, false, false] // TP 실행 여부 추적
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
    switch (selectedStrategy) {
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
  switch (customTpStrategy.type) {
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
      // Split TP: 텔레그램 신호 기반 (가격 체크 없음)
      // TP 신호는 텔레그램을 통해 수신되므로 여기서는 false 반환
      return false;

    default:
      return false;
  }
}

// Split TP 실행 함수 (텔레그램 신호 기반)
async function executeSplitTp(tpLevel) {
  try {
    // TP 레벨 검증 (1, 2, 3)
    const tpIndex = parseInt(tpLevel) - 1;
    if (tpIndex < 0 || tpIndex > 2) {
      console.error(`❌ 잘못된 TP 레벨: ${tpLevel}`);
      return { success: false, error: `잘못된 TP 레벨: ${tpLevel}` };
    }

    // 이미 실행된 TP인지 확인
    if (splitTpStrategy.executedTps[tpIndex]) {
      console.log(`⚠️ TP${tpLevel}는 이미 실행되었습니다.`);
      return { success: false, error: `TP${tpLevel}는 이미 실행되었습니다.` };
    }

    // 활성 포지션이 있는지 확인
    if (!currentPosition.isActive) {
      console.error('❌ 활성 포지션이 없습니다.');
      return { success: false, error: '활성 포지션이 없습니다.' };
    }

    // 해당 TP 레벨의 비중 가져오기
    const positionPercent = customTpStrategy.splitTp[tpIndex];
    if (!positionPercent || positionPercent <= 0) {
      console.error(`❌ TP${tpLevel}의 비중이 설정되지 않았습니다.`);
      return { success: false, error: `TP${tpLevel}의 비중이 설정되지 않았습니다.` };
    }

    console.log(`🎯 TP${tpLevel} 실행: ${positionPercent}% 비중 종료`);

    // 비중에 따른 수량 계산
    const amount = calculateAmountForPosition(positionPercent);
    if (amount === '-' || parseFloat(amount) === 0) {
      console.error(`❌ TP${tpLevel} 수량 계산 실패`);
      return { success: false, error: '수량 계산 실패' };
    }

    // Determine close action
    const closeAction = currentPosition.type === 'long' ? 'close_long' : 'close_short';

    // Close 매크로 실행 (비중만큼)
    await executeSmartTrade(closeAction, amount);

    // TP 실행 표시
    splitTpStrategy.executedTps[tpIndex] = true;

    // 텔레그램 메시지 및 스크린샷 전송
    if (telegramManager && telegramManager.telegramBot) {
      const tpMessage = `🎯 Take Profit TP${tpLevel} 실행 완료\n` +
        `종료 비중: ${positionPercent}%\n` +
        `수량: ${amount}\n` +
        `실행 시간: ${new Date().toLocaleString()}`;

      await telegramManager.sendMessageWithScreenshot(tpMessage, true, 1000);
    }

    // 모든 TP가 실행되었는지 확인
    const allTpsExecuted = splitTpStrategy.executedTps.every((executed, idx) =>
      !customTpStrategy.splitTp[idx] || customTpStrategy.splitTp[idx] <= 0 || executed
    );

    if (allTpsExecuted) {
      // 모든 TP 실행 완료 - 포지션 비활성화
      currentPosition.isActive = false;
      currentPosition.entryPrice = null;
      splitTpStrategy.executedTps = [false, false, false];

      // StateManager에도 상태 업데이트
      stateManager.setState('position.isActive', false);
      stateManager.setState('position.entryPrice', null);
      stateManager.setState('position.current', null);

      // 분할 진입 상태 초기화
      resetSplitEntryState();
    }

    return { success: true, percentage: positionPercent, level: tpLevel };

  } catch (error) {
    console.error('❌ Split TP 실행 오류:', error);
    return { success: false, error: error.message };
  }
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
        document.getElementById('splitTp1').value = customTpStrategy.splitTp[0] || 33.33;
        document.getElementById('splitTp2').value = customTpStrategy.splitTp[1] || 33.33;
        document.getElementById('splitTp3').value = customTpStrategy.splitTp[2] || 33.34;
      }

      // Trigger strategy change to show correct settings
      document.getElementById('tpStrategySelect').dispatchEvent(new Event('change'));
    }
  } catch (error) {
    console.error('Failed to load custom TP settings:', error);
  }
}

// 기존 DOMContentLoaded 이벤트에 언어 시스템 및 텔레그램 설정 로드 추가
document.addEventListener('DOMContentLoaded', function () {
  console.log('Popup loaded with Multi-language, Telegram and Custom TP support');

  // Initialize language system first
  initializeLanguageSystem();

  // Initialize custom TP system
  initializeCustomTpSystem();

  // 매크로 버튼 상태 초기 업데이트
  updateActionButtonsUI();
  updateMacroButtonStates();

  console.log('🔒 Manual 버튼 및 탭 초기화 완료');

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
