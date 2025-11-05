/**
 * DataExtractor - 데이터 추출 로직 통합 클래스
 * extractAssets와 extractPrice의 중복 코드 제거
 */
class DataExtractor {
  constructor() {
    this.contentScriptInjected = false;
  }
  
  /**
   * URL이 content script 주입 가능한지 확인
   * @param {string} url - 확인할 URL
   * @returns {boolean} 주입 가능 여부
   */
  isInjectableUrl(url) {
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

  /**
   * Content Script 주입 확인 및 주입
   * @returns {Promise<boolean>} 주입 성공 여부
   */
  async ensureContentScript() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // URL 체크
      if (!tab || !tab.url || !this.isInjectableUrl(tab.url)) {
        console.log('⚠️ Content Script 주입 불가능한 URL:', tab?.url);
        return false;
      }
      
      if (this.contentScriptInjected) {
        // 이미 주입되었는지 확인
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
          if (response && response.status === 'ready') {
            return true;
          }
        } catch (error) {
          // Content Script가 주입되지 않았음
        }
      }
      
      // Content Script 주입
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });
      this.contentScriptInjected = true;
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
  
  /**
   * Content Script에 메시지 전송
   * @param {Object} message - 전송할 메시지
   * @returns {Promise<Object>} 응답 객체
   */
  async sendMessageToContentScript(message) {
    try {
      const injected = await this.ensureContentScript();
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
  
  /**
   * 데이터 추출 (통합 함수)
   * @param {string} type - 추출 타입 ('assets' or 'price')
   * @param {string} selector - CSS 셀렉터
   * @param {HTMLElement} targetElement - 결과를 표시할 요소
   * @param {Function} onSuccess - 성공 시 콜백 함수
   * @returns {Promise<void>}
   */
  async extract(type, selector, targetElement, onSuccess = null) {
    if (!selector) {
      console.log(`⚠️ ${type} 셀렉터가 설정되지 않았습니다.`);
      return;
    }
    
    if (!targetElement) {
      console.error(`❌ ${type} 대상 요소를 찾을 수 없습니다.`);
      return;
    }
    
    try {
      // Content Script 주입
      await this.ensureContentScript();
      
      // 잠시 대기 후 데이터 추출
      setTimeout(async () => {
        try {
          const response = await this.sendMessageToContentScript({
            action: 'getBalance',
            selector: selector
          });
          
          console.log(`${type} 추출 응답:`, response);
          
          if (response && response.balance) {
            const value = response.balance.balance;
            targetElement.textContent = value;
            console.log(`✅ ${type} 추출 성공:`, value);
            
            // 성공 콜백 호출
            if (onSuccess) {
              onSuccess(value);
            }
          } else {
            targetElement.textContent = '-';
            console.log(`❌ ${type}를 찾을 수 없음`);
            
            if (onSuccess) {
              onSuccess(null);
            }
          }
        } catch (error) {
          console.error(`❌ ${type} 추출 실패:`, error);
          targetElement.textContent = '-';
          
          if (onSuccess) {
            onSuccess(null);
          }
        }
      }, 500);
      
    } catch (error) {
      console.error(`❌ Content Script 주입 실패:`, error);
      targetElement.textContent = '-';
    }
  }
  
  /**
   * 자산(Assets) 추출
   * @param {string} selector - CSS 셀렉터
   * @param {HTMLElement} targetElement - 결과를 표시할 요소
   * @param {Function} onSuccess - 성공 시 콜백 함수
   * @returns {Promise<void>}
   */
  async extractAssets(selector, targetElement, onSuccess = null) {
    return this.extract('assets', selector, targetElement, onSuccess);
  }
  
  /**
   * 가격(Price) 추출
   * @param {string} selector - CSS 셀렉터
   * @param {HTMLElement} targetElement - 결과를 표시할 요소
   * @param {Function} onSuccess - 성공 시 콜백 함수
   * @returns {Promise<void>}
   */
  async extractPrice(selector, targetElement, onSuccess = null) {
    return this.extract('price', selector, targetElement, onSuccess);
  }
}

// 전역에서 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataExtractor;
} else {
  window.DataExtractor = DataExtractor;
}

