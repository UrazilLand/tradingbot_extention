// Background Service Worker
console.log('Background service worker loaded');

// ============================================
// Storage API: 백그라운드에서 데이터 관리
// ============================================
console.log('=== Background: Storage API ===');

// 데이터 저장 테스트
chrome.storage.local.set({
  backgroundLoaded: true,
  timestamp: new Date().toISOString()
}).then(() => {
  console.log('✅ Background에서 데이터 저장됨');
});

// 데이터 불러오기 테스트
chrome.storage.local.get(['backgroundLoaded']).then((result) => {
  console.log('✅ Background에서 데이터 불러옴:', result);
});

// ============================================
// Runtime/Messages API: Background가 메시지 수신
// ============================================
console.log('=== Background: Messages API ===');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('✅ Background가 메시지 수신:', request);
  
  // 요청에 따라 처리
  if (request.action === 'startTrading') {
    console.log('🚀 거래 시작 명령 수신');
    // 여기서 거래 로직이 실행될 예정
  } else if (request.action === 'stopTrading') {
    console.log('⏹️ 거래 중단 명령 수신');
    // 여기서 거래 로직이 중단될 예정
  } else if (request.action === 'startElementSelection') {
    console.log('🎯 요소 선택 모드 시작 요청');
    // 현재 활성 탭에 메시지 전달
    chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0]) {
        // Content Script가 로드될 때까지 기다리기
        const trySendMessage = (retries = 5) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'startElementSelection' })
            .then(() => {
              console.log('✅ Content Script에 요소 선택 시작 메시지 전달됨');
              sendResponse({ success: true });
            })
            .catch(error => {
              if (retries > 0) {
                console.log(`Content Script 로드 대기 중... (${6-retries}/5)`);
                setTimeout(() => trySendMessage(retries - 1), 500);
              } else {
                console.error('❌ Content Script 메시지 전달 실패:', error);
                sendResponse({ success: false, error: 'Content Script가 로드되지 않았습니다. 페이지를 새로고침해주세요.' });
              }
            });
        };
        trySendMessage();
      }
    });
    return true; // 비동기 응답
  } else if (request.action === 'stopElementSelection') {
    console.log('🛑 요소 선택 모드 중단 요청');
    // 현재 활성 탭에 메시지 전달
    chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0]) {
        // Content Script가 로드될 때까지 기다리기
        const trySendMessage = (retries = 5) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'stopElementSelection' })
            .then(() => {
              console.log('✅ Content Script에 요소 선택 중단 메시지 전달됨');
              sendResponse({ success: true });
            })
            .catch(error => {
              if (retries > 0) {
                console.log(`Content Script 로드 대기 중... (${6-retries}/5)`);
                setTimeout(() => trySendMessage(retries - 1), 500);
              } else {
                console.error('❌ Content Script 메시지 전달 실패:', error);
                sendResponse({ success: false, error: 'Content Script가 로드되지 않았습니다.' });
              }
            });
        };
        trySendMessage();
      }
    });
    return true; // 비동기 응답
  } else if (request.action === 'elementSelected') {
    console.log('🎯 요소 선택됨:', request);
    // Popup에 선택된 요소 정보 전달
    chrome.runtime.sendMessage({
      action: 'elementSelected',
      selector: request.selector,
      text: request.text
    }).catch(error => {
      console.log('Popup 메시지 전달 실패 (정상):', error.message);
    });
    sendResponse({ success: true });
  } else if (request.action === 'contentScriptLoaded') {
    console.log('✅ Content Script 로드 완료:', request.url);
    sendResponse({ success: true });
  }
  
  // 기본 응답
  sendResponse({ 
    success: true, 
    message: `Background가 ${request.action} 요청을 처리했습니다.` 
  });
  
  return true; // 비동기 응답을 위해 반드시 true 반환
});

// ============================================
// 브라우저 종료 시 거래 상태 초기화
// ============================================
chrome.runtime.onSuspend.addListener(() => {
  console.log('🔴 브라우저 종료 감지 - 거래 상태 초기화');
  
  // 거래 상태를 중단으로 설정
  chrome.storage.local.set({
    isTrading: false,
    lastUpdate: Date.now()
  }, () => {
    console.log('✅ 브라우저 종료 시 거래 상태 초기화 완료');
  });
});

// 익스텐션 시작 시 거래 상태 확인 및 초기화
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 익스텐션 시작 - 거래 상태 확인');
  
  chrome.storage.local.get(['isTrading'], (result) => {
    if (result.isTrading) {
      console.log('⚠️ 이전 거래 상태 발견 - 강제 중단');
      chrome.storage.local.set({
        isTrading: false,
        lastUpdate: Date.now()
      });
    }
  });
});

// 익스텐션 설치/업데이트 시 거래 상태 초기화
chrome.runtime.onInstalled.addListener(() => {
  console.log('📦 익스텐션 설치/업데이트 - 거래 상태 초기화');
  
  chrome.storage.local.set({
    isTrading: false,
    lastUpdate: Date.now()
  });
});

// ============================================
// 익스텐션 아이콘 클릭 시 사이드 패널 열기 및 탭 변경 감지
// ============================================
let currentActiveTabId = null;
let sidePanelOpenTabId = null;

// 익스텐션 아이콘 클릭 시 사이드패널 열기
chrome.action.onClicked.addListener((tab) => {
  console.log('✅ 익스텐션 아이콘 클릭됨, 탭 정보:', tab.title);
  chrome.sidePanel.open({ windowId: tab.windowId });
  
  // 사이드패널이 열린 탭 ID 저장
  sidePanelOpenTabId = tab.id;
  currentActiveTabId = tab.id;
  console.log('🔧 사이드패널 열린 탭 ID 저장:', tab.id);
});

// 활성 탭 변경 감지
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('🔄 탭 변경 감지:', activeInfo.tabId, '이전 탭:', currentActiveTabId);
  
  // 사이드패널이 열려있고, 다른 탭으로 변경된 경우
  if (sidePanelOpenTabId && currentActiveTabId && currentActiveTabId !== activeInfo.tabId) {
    try {
      // 사이드패널 닫기 시도
      await chrome.sidePanel.setOptions({
        windowId: activeInfo.windowId,
        enabled: false
      });
      
      // 즉시 다시 활성화하여 닫힌 상태로 만들기
      setTimeout(async () => {
        try {
          await chrome.sidePanel.setOptions({
            windowId: activeInfo.windowId,
            enabled: true
          });
          console.log('✅ 탭 변경으로 인한 사이드 패널 닫기 완료');
        } catch (error) {
          console.log('사이드 패널 재활성화 실패:', error.message);
        }
      }, 50);
      
      // 사이드패널 상태 초기화
      sidePanelOpenTabId = null;
      
    } catch (error) {
      console.log('사이드 패널 닫기 실패:', error.message);
    }
  }
  
  // 현재 활성 탭 ID 업데이트
  currentActiveTabId = activeInfo.tabId;
});

// 탭 제거 감지
chrome.tabs.onRemoved.addListener((tabId) => {
  if (sidePanelOpenTabId === tabId) {
    sidePanelOpenTabId = null;
    console.log('🗑️ 사이드패널 탭 제거됨:', tabId);
  }
  if (currentActiveTabId === tabId) {
    currentActiveTabId = null;
  }
});
