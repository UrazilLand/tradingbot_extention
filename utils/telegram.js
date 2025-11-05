/**
 * 텔레그램 봇 API 연동 클래스
 * Phase 8-1: 텔레그램 봇 API 연동 구현
 */

class TelegramBot {
  constructor(botToken, chatId) {
    this.botToken = botToken;
    this.chatId = chatId;
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
    this.lastUpdateId = 0;
    
    console.log('TelegramBot 초기화:', {
      botToken: botToken ? `${botToken.substring(0, 10)}...` : 'null',
      chatId: chatId
    });
  }
  
  /**
   * 봇 연결 테스트
   * @returns {Promise<{success: boolean, botInfo?: object, error?: string}>}
   */
  async testConnection() {
    try {
      console.log('텔레그램 봇 연결 테스트 시작...');
      
      const response = await fetch(`${this.baseUrl}/getMe`);
      const data = await response.json();
      
      if (data.ok) {
        console.log('텔레그램 봇 연결 성공:', data.result.username);
        return { 
          success: true, 
          botInfo: data.result 
        };
      } else {
        console.error('텔레그램 봇 연결 실패:', data.description);
        throw new Error(data.description);
      }
    } catch (error) {
      console.error('텔레그램 봇 연결 오류:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  /**
   * 새 메시지 가져오기 (폴링)
   * @returns {Promise<Array>} 새로운 메시지 배열
   */
  async getUpdates() {
    try {
      // Long polling을 위해 timeout=30초 설정
      const url = `${this.baseUrl}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=30`;
      
      console.log('메시지 폴링 시작...', { lastUpdateId: this.lastUpdateId });
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.ok && data.result.length > 0) {
        const messages = data.result;
        console.log(`${messages.length}개의 새 업데이트 수신`);
        
        // 마지막 업데이트 ID 갱신 (중복 방지)
        const lastUpdate = messages[messages.length - 1];
        this.lastUpdateId = lastUpdate.update_id;
        console.log(`📝 lastUpdateId 업데이트: ${this.lastUpdateId}`);
        
        // 지정된 채팅에서 온 메시지만 필터링
        const relevantMessages = messages.filter(msg => 
          msg.message && 
          msg.message.chat.id.toString() === this.chatId.toString()
        );
        
        if (relevantMessages.length > 0) {
          console.log(`${relevantMessages.length}개의 관련 메시지 필터링됨`);
        }
        
        // 메시지 객체 정규화
        return relevantMessages.map(msg => ({
          messageId: msg.message.message_id,
          text: msg.message.text,
          timestamp: msg.message.date * 1000, // 초를 밀리초로 변환
          updateId: msg.update_id,
          from: msg.message.from,
          chat: msg.message.chat
        }));
      }
      
      // 새 메시지가 없는 경우
      return [];
    } catch (error) {
      // 네트워크 에러나 CORS 에러는 정상적인 경우일 수 있음 (설정 누락 등)
      if (error.message && error.message.includes('Failed to fetch')) {
        // 네트워크 연결 문제 또는 CORS 문제
        console.log('ℹ️ Telegram API 연결 실패 - 네트워크 문제 또는 설정 확인 필요');
      } else if (error.message && error.message.includes('401')) {
        // 인증 실패 (잘못된 bot token)
        console.log('⚠️ Telegram Bot Token이 유효하지 않습니다. 설정을 확인하세요.');
      } else {
        // 기타 에러
        console.error('메시지 가져오기 실패:', error);
      }
      return [];
    }
  }
  
  /**
   * 메시지 전송 (알림용)
   * @param {string} text 전송할 메시지
   * @param {object} options 추가 옵션
   * @returns {Promise<boolean>} 전송 성공 여부
   */
  async sendMessage(text, options = {}) {
    try {
      const payload = {
        chat_id: this.chatId,
        text: text,
        parse_mode: options.parseMode || 'HTML',
        disable_web_page_preview: options.disablePreview || true,
        disable_notification: options.silent || false
      };
      
      console.log('메시지 전송 시도:', { 
        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        chatId: this.chatId 
      });
      
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.ok) {
        console.log('메시지 전송 성공:', data.result.message_id);
        return true;
      } else {
        console.error('메시지 전송 실패:', data.description);
        return false;
      }
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      return false;
    }
  }

  /**
   * 사진 전송 (스크린샷 기능)
   * @param {Blob} photoBlob 이미지 Blob 데이터
   * @param {string} caption 사진 설명
   * @returns {Promise<{success: boolean, messageId?: number, error?: string}>}
   */
  async sendPhoto(photoBlob, caption = '') {
    try {
      const url = `${this.baseUrl}/sendPhoto`;
      
      // FormData 생성
      const formData = new FormData();
      formData.append('chat_id', this.chatId);
      formData.append('photo', photoBlob, 'screenshot.png');
      if (caption) {
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
      }

      console.log('사진 전송 시도:', { 
        size: photoBlob.size, 
        caption: caption.substring(0, 30) + (caption.length > 30 ? '...' : ''),
        chatId: this.chatId 
      });

      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.ok) {
        console.log('사진 전송 성공:', data.result.message_id);
        return { success: true, messageId: data.result.message_id };
      } else {
        console.error('사진 전송 실패:', data.description);
        return { success: false, error: data.description };
      }
    } catch (error) {
      console.error('사진 전송 오류:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 메시지와 스크린샷 함께 전송
   * @param {string} text 전송할 메시지
   * @param {boolean} includeScreenshot 스크린샷 포함 여부
   * @returns {Promise<{success: boolean, messageId?: number, photoId?: number, error?: string}>}
   */
  async sendMessageWithScreenshot(text, includeScreenshot = true, delayBeforeScreenshot = 1000) {
    try {
      // 먼저 메시지 전송
      const messageResult = await this.sendMessage(text);
      
      if (!includeScreenshot || !messageResult) {
        return { success: messageResult, messageId: null };
      }
      
      // 스크린샷 전에 딜레이 (주문 후 화면 업데이트 대기)
      if (delayBeforeScreenshot > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBeforeScreenshot));
      }
      
      // 스크린샷 캡처 및 전송
      try {
        const screenshot = await this.captureScreenshot();
        if (screenshot) {
          const photoResult = await this.sendPhoto(screenshot, '📸 Trading Screen Capture');
          return { 
            success: messageResult && photoResult.success,
            messageId: null,
            photoId: photoResult.messageId,
            error: photoResult.error
          };
        }
      } catch (screenshotError) {
        console.warn('스크린샷 전송 실패 (메시지는 전송됨):', screenshotError);
        // 스크린샷 실패해도 메시지는 전송되었으므로 성공으로 처리
      }
      
      return { success: messageResult, messageId: null };
      
    } catch (error) {
      console.error('메시지+스크린샷 전송 오류:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 스크린샷 캡처 (Chrome API 사용)
   * @returns {Promise<Blob>} 스크린샷 Blob 데이터
   */
  async captureScreenshot() {
    try {
      // 활성 탭 가져오기
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('활성 탭을 찾을 수 없습니다');
      }
      
      // 스크린샷 캡처
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png',
        quality: 90
      });
      
      // Data URL을 Blob으로 변환
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      console.log('스크린샷 캡처 성공:', blob.size, 'bytes');
      return blob;
      
    } catch (error) {
      console.error('스크린샷 캡처 실패:', error);
      throw error;
    }
  }
  
  /**
   * 채팅 정보 가져오기
   * @returns {Promise<object|null>} 채팅 정보
   */
  async getChatInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/getChat?chat_id=${this.chatId}`);
      const data = await response.json();
      
      if (data.ok) {
        console.log('채팅 정보 조회 성공:', data.result);
        return data.result;
      } else {
        console.error('채팅 정보 조회 실패:', data.description);
        return null;
      }
    } catch (error) {
      console.error('채팅 정보 조회 오류:', error);
      return null;
    }
  }
  
  /**
   * 봇 설정 업데이트
   * @param {string} newBotToken 새 봇 토큰
   * @param {string} newChatId 새 채팅 ID
   */
  updateSettings(newBotToken, newChatId) {
    this.botToken = newBotToken;
    this.chatId = newChatId;
    this.baseUrl = `https://api.telegram.org/bot${newBotToken}`;
    this.lastUpdateId = 0; // 리셋
    
    console.log('텔레그램 봇 설정 업데이트:', {
      botToken: newBotToken ? `${newBotToken.substring(0, 10)}...` : 'null',
      chatId: newChatId
    });
  }
  
  /**
   * 연결 상태 확인
   * @returns {boolean} 설정 완료 여부
   */
  isConfigured() {
    return !!(this.botToken && this.chatId);
  }
  
  /**
   * 디버그 정보 출력
   */
  getDebugInfo() {
    return {
      botToken: this.botToken ? `${this.botToken.substring(0, 10)}...` : 'null',
      chatId: this.chatId,
      baseUrl: this.baseUrl,
      lastUpdateId: this.lastUpdateId,
      configured: this.isConfigured()
    };
  }
}

// 전역에서 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TelegramBot;
} else {
  window.TelegramBot = TelegramBot;
}

console.log('TelegramBot 클래스 로드 완료');
