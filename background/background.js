// Background Service Worker

// ============================================
// Runtime/Messages API: Background가 메시지 수신
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 요청에 따라 처리
  if (request.action === 'startTrading') {
    // 거래 시작 처리
  } else if (request.action === 'stopTrading') {
    // 거래 중단 처리
  } else if (request.action === 'startElementSelection') {
    // 현재 활성 탭에 메시지 전달
    chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0]) {
        // Content Script가 로드될 때까지 기다리기
        const trySendMessage = (retries = 5) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'startElementSelection' })
            .then(() => {
              sendResponse({ success: true });
            })
            .catch(error => {
              if (retries > 0) {
                setTimeout(() => trySendMessage(retries - 1), 500);
              } else {
                sendResponse({ success: false, error: 'Content Script가 로드되지 않았습니다. 페이지를 새로고침해주세요.' });
              }
            });
        };
        trySendMessage();
      }
    });
    return true; // 비동기 응답
  } else if (request.action === 'stopElementSelection') {
    // 현재 활성 탭에 메시지 전달
    chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0]) {
        // Content Script가 로드될 때까지 기다리기
        const trySendMessage = (retries = 5) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'stopElementSelection' })
            .then(() => {
              sendResponse({ success: true });
            })
            .catch(error => {
              if (retries > 0) {
                setTimeout(() => trySendMessage(retries - 1), 500);
              } else {
                sendResponse({ success: false, error: 'Content Script가 로드되지 않았습니다.' });
              }
            });
        };
        trySendMessage();
      }
    });
    return true; // 비동기 응답
  } else if (request.action === 'elementSelected') {
    // Popup에 선택된 요소 정보 전달
    chrome.runtime.sendMessage({
      action: 'elementSelected',
      selector: request.selector,
      text: request.text
    }).catch(() => {
      // Popup이 닫혀있으면 정상적으로 실패
    });
    sendResponse({ success: true });
  } else if (request.action === 'contentScriptLoaded') {
    sendResponse({ success: true });
  }
  
  // 기본 응답
  sendResponse({ success: true });
  
  return true; // 비동기 응답을 위해 반드시 true 반환
});

// ============================================
// 브라우저 종료 시 거래 상태 초기화
// ============================================
chrome.runtime.onSuspend.addListener(() => {
  // 거래 상태를 중단으로 설정
  chrome.storage.local.set({
    isTrading: false,
    lastUpdate: Date.now()
  });
});

// 익스텐션 설치/업데이트 시 거래 상태 초기화
chrome.runtime.onInstalled.addListener(async () => {
  chrome.storage.local.set({
    isTrading: false,
    lastUpdate: Date.now()
  });
});

// 익스텐션 시작 시 거래 상태 확인
chrome.runtime.onStartup.addListener(async () => {
  // 거래 상태 확인 (필요시 추가 처리)
});

// ============================================
// 익스텐션 아이콘 클릭 시 사이드 패널 열기 및 탭 변경 감지
// ============================================
let currentActiveTabId = null;
let sidePanelOpenTabId = null;

// 익스텐션 아이콘 클릭 시 사이드패널 열기
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
  
  // 사이드패널이 열린 탭 ID 저장
  sidePanelOpenTabId = tab.id;
  currentActiveTabId = tab.id;
});

// 활성 탭 변경 감지
chrome.tabs.onActivated.addListener(async (activeInfo) => {
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
        } catch (error) {
          // 사이드 패널 재활성화 실패 (정상)
        }
      }, 50);
      
      // 사이드패널 상태 초기화
      sidePanelOpenTabId = null;
      
    } catch (error) {
      // 사이드 패널 닫기 실패 (정상)
    }
  }
  
  // 현재 활성 탭 ID 업데이트
  currentActiveTabId = activeInfo.tabId;
});

// 탭 제거 감지
chrome.tabs.onRemoved.addListener((tabId) => {
  if (sidePanelOpenTabId === tabId) {
    sidePanelOpenTabId = null;
  }
  if (currentActiveTabId === tabId) {
    currentActiveTabId = null;
  }
});
