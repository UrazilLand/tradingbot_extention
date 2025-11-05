/**
 * TelegramManager - 텔레그램 통신 관리 클래스
 * 텔레그램 설정, 폴링, 메시지 처리 로직 통합
 */
class TelegramManager {
  constructor(storageUtils, stateManager) {
    this.storageUtils = storageUtils;
    this.stateManager = stateManager;
    
    // 텔레그램 봇 인스턴스
    this.telegramBot = null;
    this.telegramPollingInterval = null;
    this.isTelegramTrading = false;
    this.signalParser = null;
    
    // 중복 처리 방지를 위한 변수
    this.lastProcessedMessageId = 0;
    this.processedMessageIds = new Set();
    
    // 매크로 실행 중복 방지를 위한 변수
    this.isExecutingTrade = false;
    this.lastTradeTime = 0;
    this.executingTradeType = null;
    this.tradeExecutionStartTime = 0;
    this.MIN_TRADE_INTERVAL = 3000; // 최소 3초 간격
    this.MAX_EXECUTION_TIME = 60000; // 최대 60초 실행 시간
    
    // 매크로 실행 상태 모니터링
    this.macroStatusCheckInterval = null;
    
    // 콜백 함수들
    this.onTradeExecute = null; // 거래 실행 콜백
    this.onStatusUpdate = null; // 상태 업데이트 콜백
    this.onMessageReceived = null; // 메시지 수신 콜백
    
    // UI 요소 참조 (나중에 주입)
    this.botTokenInput = null;
    this.chatIdInput = null;
    this.userSymbolInput = null;
    this.telegramStatusMessage = null;
    this.testTelegramConnectionBtn = null;
  }
  
  /**
   * UI 요소 주입
   * @param {Object} elements - UI 요소 객체
   */
  setUIElements(elements) {
    this.botTokenInput = elements.botTokenInput;
    this.chatIdInput = elements.chatIdInput;
    this.userSymbolInput = elements.userSymbolInput;
    this.telegramStatusMessage = elements.telegramStatusMessage;
    this.testTelegramConnectionBtn = elements.testTelegramConnectionBtn;
  }
  
  /**
   * 콜백 함수 설정
   * @param {Object} callbacks - 콜백 함수 객체
   */
  setCallbacks(callbacks) {
    this.onTradeExecute = callbacks.onTradeExecute;
    this.onStatusUpdate = callbacks.onStatusUpdate;
    this.onMessageReceived = callbacks.onMessageReceived;
  }
  
  /**
   * 텔레그램 설정 로드
   * @returns {Promise<void>}
   */
  async loadSettings() {
    try {
      const settings = await this.storageUtils.loadTelegramSettings();
      if (!settings) {
        console.log('텔레그램 설정이 없습니다.');
        return;
      }
      
      // UI 요소가 주입되지 않았으면 경고
      if (!this.botTokenInput || !this.chatIdInput || !this.userSymbolInput) {
        console.warn('⚠️ TelegramManager UI 요소가 주입되지 않았습니다. initializeTelegramManager()를 먼저 호출하세요.');
        return;
      }
      
      // 저장된 값이 있으면 UI에 설정 (빈 문자열이 아닌 경우에만)
      if (settings.botToken) {
        this.botTokenInput.value = settings.botToken;
      }
      if (settings.chatId) {
        this.chatIdInput.value = settings.chatId;
      }
      if (settings.userSymbol) {
        this.userSymbolInput.value = settings.userSymbol;
      }
      
      console.log('✅ 텔레그램 설정 로드됨:', {
        botToken: settings.botToken ? 'Set' : 'Empty',
        chatId: settings.chatId || 'Empty',
        userSymbol: settings.userSymbol || 'Empty'
      });
    } catch (error) {
      console.error('❌ 텔레그램 설정 로드 실패:', error);
    }
  }
  
  /**
   * 텔레그램 설정 저장
   * @returns {Promise<void>}
   */
  async saveSettings() {
    try {
      if (!this.botTokenInput || !this.chatIdInput || !this.userSymbolInput) {
        throw new Error('UI 요소가 설정되지 않았습니다.');
      }
      
      const settings = {
        botToken: this.botTokenInput.value.trim(),
        chatId: this.chatIdInput.value.trim(),
        userSymbol: this.userSymbolInput.value.trim().toUpperCase()
      };
      
      await this.storageUtils.saveTelegramSettings(settings);
      console.log('텔레그램 설정 저장됨:', {
        botToken: settings.botToken ? 'Set' : 'Empty',
        chatId: settings.chatId || 'Empty',
        userSymbol: settings.userSymbol || 'Empty'
      });
    } catch (error) {
      console.error('텔레그램 설정 저장 실패:', error);
      throw error;
    }
  }
  
  /**
   * 상태 메시지 표시
   * @param {string} message - 표시할 메시지
   * @param {string} type - 메시지 타입 ('info', 'success', 'error')
   */
  showStatus(message, type = 'info') {
    if (this.telegramStatusMessage) {
      this.telegramStatusMessage.textContent = message;
      this.telegramStatusMessage.className = `status-message ${type}`;
      console.log(`Telegram Status [${type}]:`, message);
      
      // 3초 후 자동 숨김 (에러 메시지는 5초)
      const hideDelay = type === 'error' ? 5000 : 3000;
      setTimeout(() => {
        if (this.telegramStatusMessage) {
          this.telegramStatusMessage.className = 'status-message';
        }
      }, hideDelay);
    }
    
    // 콜백 호출
    if (this.onStatusUpdate) {
      this.onStatusUpdate(message, type);
    }
  }
  
  /**
   * 텔레그램 연결 테스트
   * @returns {Promise<boolean>} 연결 성공 여부
   */
  async testConnection() {
    try {
      if (!this.botTokenInput || !this.chatIdInput || !this.userSymbolInput) {
        throw new Error('UI 요소가 설정되지 않았습니다.');
      }
      
      const botToken = this.botTokenInput.value.trim();
      const chatId = this.chatIdInput.value.trim();
      const userSymbol = this.userSymbolInput.value.trim();
      
      if (!botToken || !chatId) {
        this.showStatus('Bot Token and Chat ID are required', 'error');
        return false;
      }
      
      this.showStatus('Testing connection...', 'info');
      if (this.testTelegramConnectionBtn) {
        this.testTelegramConnectionBtn.disabled = true;
      }
      
      // 텔레그램 봇 인스턴스 생성
      this.telegramBot = new TelegramBot(botToken, chatId);
      
      // 하위 호환성을 위한 상태 동기화
      this.syncToGlobalVars();
      
      // 연결 테스트
      const result = await this.telegramBot.testConnection();
      
      if (result.success) {
        const symbolInfo = userSymbol ? ` (${userSymbol} only)` : '';
        this.showStatus(`Connected: @${result.botInfo.username}${symbolInfo}`, 'success');
        
        // 설정 저장
        await this.saveSettings();
        
        // 신호 파서 초기화 (심볼이 설정된 경우)
        if (userSymbol && typeof SignalParser !== 'undefined') {
          this.signalParser = new SignalParser(userSymbol);
          console.log(`📊 신호 파서 초기화 완료: ${userSymbol}`);
          
          // 하위 호환성을 위한 상태 동기화
          this.syncToGlobalVars();
        } else {
          console.warn('SignalParser 클래스가 로드되지 않았습니다');
        }
        
        console.log('텔레그램 연결 성공:', result.botInfo);
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('텔레그램 연결 테스트 실패:', error);
      this.showStatus(`Connection failed: ${error.message}`, 'error');
      return false;
    } finally {
      if (this.testTelegramConnectionBtn) {
        this.testTelegramConnectionBtn.disabled = false;
      }
    }
  }
  
  /**
   * 심볼 업데이트
   * @param {string} userSymbol - 사용자 심볼
   */
  async updateSymbol(userSymbol) {
    if (!userSymbol) return;
    
    const symbol = userSymbol.trim().toUpperCase();
    
    if (this.telegramBot) {
      // 설정 저장
      await this.saveSettings();
      
      // 신호 파서 업데이트
      if (symbol && typeof SignalParser !== 'undefined') {
        this.signalParser = new SignalParser(symbol);
        console.log(`📊 신호 파서 업데이트: ${symbol}`);
      }
      
      const symbolInfo = symbol ? symbol : 'All symbols';
      this.showStatus(`Symbol updated: ${symbolInfo}`, 'info');
      
      console.log('심볼 업데이트됨:', symbol);
    }
  }
  
  /**
   * 텔레그램 자동 연결 및 폴링 시작
   * @param {boolean} isTrading - 거래 상태
   * @returns {Promise<boolean>} 시작 성공 여부
   */
  async autoConnectAndStartPolling(isTrading) {
    try {
      console.log('🔄 텔레그램 자동 연결 시도...');
      
      // 1. 저장된 텔레그램 설정 로드
      const settings = await this.storageUtils.loadTelegramSettings();
      
      if (!settings || !settings.botToken || !settings.chatId || !settings.userSymbol) {
        console.log('❌ 텔레그램 설정이 불완전함');
        return false;
      }
      
      console.log('✅ 텔레그램 설정 확인됨:', {
        botToken: settings.botToken ? 'Set' : 'Empty',
        chatId: settings.chatId || 'Empty',
        userSymbol: settings.userSymbol || 'Empty'
      });
      
      // 2. TelegramBot 인스턴스 생성 (기존 인스턴스가 없거나 설정이 다른 경우)
      if (!this.telegramBot || 
          this.telegramBot.botToken !== settings.botToken || 
          this.telegramBot.chatId !== settings.chatId) {
        
        console.log('🔧 새 TelegramBot 인스턴스 생성...');
        this.telegramBot = new TelegramBot(settings.botToken, settings.chatId);
        
        // 3. 연결 테스트
        const connectionTest = await this.telegramBot.testConnection();
        if (!connectionTest.success) {
          console.error('❌ 텔레그램 연결 테스트 실패:', connectionTest.error);
          this.showStatus(`연결 실패: ${connectionTest.error}`, 'error');
          return false;
        }
        
      console.log('✅ 텔레그램 연결 테스트 성공:', connectionTest.botInfo.username);
      
      // 하위 호환성을 위한 상태 동기화
      this.syncToGlobalVars();
    } else {
      console.log('✅ 기존 TelegramBot 인스턴스 재사용');
      
      // 하위 호환성을 위한 상태 동기화
      this.syncToGlobalVars();
    }
      
      // 4. SignalParser 자동 초기화
      if (settings.userSymbol && typeof SignalParser !== 'undefined') {
        this.signalParser = new SignalParser(settings.userSymbol);
        console.log(`📊 SignalParser 자동 초기화: ${settings.userSymbol}`);
        
        // 하위 호환성을 위한 상태 동기화
        this.syncToGlobalVars();
      } else {
        console.warn('⚠️ SignalParser 초기화 실패 - 심볼 또는 클래스 없음');
      }
      
      // 5. 폴링 시작
      return await this.startPolling(settings.userSymbol);
      
    } catch (error) {
      console.error('❌ 텔레그램 자동 연결 실패:', error);
      this.showStatus(`자동 연결 실패: ${error.message}`, 'error');
      return false;
    }
  }
  
  /**
   * 텔레그램 폴링 시작
   * @param {string} userSymbol - 사용자 심볼
   * @returns {Promise<boolean>} 시작 성공 여부
   */
  async startPolling(userSymbol) {
    try {
      if (!this.telegramBot) {
        console.log('❌ 텔레그램 봇이 연결되지 않음 - 폴링 시작 불가');
        console.log('💡 해결방법: Settings에서 Bot Token과 Chat ID를 입력하고 Test Connection을 먼저 실행하세요');
        return false;
      }
      
      console.log('✅ 텔레그램 봇 연결 상태 확인됨');
      
      if (this.isTelegramTrading) {
        console.log('이미 텔레그램 폴링 실행 중');
        return true;
      }
      
      console.log('텔레그램 폴링 시작...');
      
      // 신호 파서 초기화
      if (!userSymbol) {
        if (this.userSymbolInput) {
          userSymbol = this.userSymbolInput.value.trim();
        }
        if (!userSymbol) {
          throw new Error('거래할 심볼을 입력해주세요 (예: BTC)');
        }
      }
      
      // SignalParser 클래스 존재 확인
      if (typeof SignalParser === 'undefined') {
        throw new Error('SignalParser 클래스가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
      }
      
      this.signalParser = new SignalParser(userSymbol);
      console.log(`📊 신호 파서 초기화 완료: ${userSymbol}`);
      
      // 중복 처리 방지 변수 초기화
      this.lastProcessedMessageId = 0;
      this.processedMessageIds.clear();
      
      // 매크로 실행 중복 방지 변수 초기화
      this.isExecutingTrade = false;
      this.executingTradeType = null;
      this.lastTradeTime = 0;
      
      // 하위 호환성을 위한 상태 동기화
      this.syncToGlobalVars();
      
      console.log('🔄 중복 처리 방지 변수 초기화 완료');
      
      // 폴링 시작 (3초 간격)
      this.telegramPollingInterval = setInterval(async () => {
        await this.pollMessages();
      }, 3000);
      
      // 매크로 상태 모니터링 시작
      this.startMacroStatusMonitoring();
      
      this.isTelegramTrading = true;
      
      // 하위 호환성을 위한 상태 동기화
      this.syncToGlobalVars();
      
      // 시작 알림 전송
      if (typeof lang !== 'undefined') {
        await this.telegramBot.sendMessage(lang.t('auto_trading_started', { symbol: userSymbol }));
      } else {
        await this.telegramBot.sendMessage(`✅ Auto trading started for ${userSymbol}`);
      }
      
      console.log('텔레그램 폴링 및 매크로 모니터링 시작됨');
      return true;
      
    } catch (error) {
      console.error('텔레그램 폴링 시작 실패:', error);
      return false;
    }
  }
  
  /**
   * 텔레그램 폴링 중단
   * @returns {Promise<void>}
   */
  async stopPolling() {
    try {
      if (this.telegramPollingInterval) {
        clearInterval(this.telegramPollingInterval);
        this.telegramPollingInterval = null;
      }
      
      // 매크로 상태 모니터링 중단
      this.stopMacroStatusMonitoring();
      
      // 매크로 실행 상태 초기화
      this.isExecutingTrade = false;
      this.executingTradeType = null;
      this.tradeExecutionStartTime = 0;
      
      this.isTelegramTrading = false;
      
      // 하위 호환성을 위한 상태 동기화
      this.syncToGlobalVars();
      
      // 중단 알림 전송
      if (this.telegramBot) {
        if (typeof lang !== 'undefined') {
          await this.telegramBot.sendMessage(lang.t('auto_trading_stopped'));
        } else {
          await this.telegramBot.sendMessage('🛑 Auto trading stopped');
        }
      }
      
      console.log('텔레그램 폴링 및 매크로 모니터링 중단됨');
      
    } catch (error) {
      console.error('텔레그램 폴링 중단 실패:', error);
    }
  }
  
  /**
   * 매크로 상태 모니터링 시작
   */
  startMacroStatusMonitoring() {
    if (this.macroStatusCheckInterval) {
      clearInterval(this.macroStatusCheckInterval);
    }
    
    this.macroStatusCheckInterval = setInterval(() => {
      if (this.isExecutingTrade && this.tradeExecutionStartTime > 0) {
        const executionTime = Date.now() - this.tradeExecutionStartTime;
        
        // 60초 초과 시 강제 해제
        if (executionTime > this.MAX_EXECUTION_TIME) {
          console.log(`🚨 매크로 실행 시간 초과 감지 - 강제 해제 (${Math.round(executionTime/1000)}초)`);
          this.isExecutingTrade = false;
          this.executingTradeType = null;
          this.tradeExecutionStartTime = 0;
          
          // 텔레그램 알림
          if (this.telegramBot) {
            this.telegramBot.sendMessage(`🚨 Macro execution timeout detected - automatically released after ${Math.round(executionTime/1000)}s`);
          }
        }
      }
    }, 5000); // 5초마다 체크
  }
  
  /**
   * 매크로 상태 모니터링 중단
   */
  stopMacroStatusMonitoring() {
    if (this.macroStatusCheckInterval) {
      clearInterval(this.macroStatusCheckInterval);
      this.macroStatusCheckInterval = null;
    }
  }
  
  /**
   * 메시지 폴링 실행
   * @returns {Promise<void>}
   */
  async pollMessages() {
    try {
      if (!this.telegramBot || !this.isTelegramTrading || !this.signalParser) return;
      
      const messages = await this.telegramBot.getUpdates();
      
      if (messages.length > 0) {
        console.log(`${messages.length}개의 새 메시지 수신:`, messages);
        
        for (const message of messages) {
          // 중복 처리 방지 - messageId 기반
          if (message.messageId <= this.lastProcessedMessageId) {
            console.log(`⏭️ 이미 처리된 메시지 건너뛰기: ${message.messageId}`);
            continue;
          }
          
          // Set을 이용한 추가 중복 방지
          if (this.processedMessageIds.has(message.messageId)) {
            console.log(`⏭️ Set에서 중복 메시지 감지: ${message.messageId}`);
            continue;
          }
          
          console.log(`🆕 새 메시지 처리: ID=${message.messageId}, Text="${message.text}"`);
          
          // 메시지 처리
          await this.processSignalMessage(message);
          
          // 처리 완료 후 ID 업데이트
          this.lastProcessedMessageId = message.messageId;
          this.processedMessageIds.add(message.messageId);
          
          // Set 크기 제한 (메모리 관리)
          if (this.processedMessageIds.size > 100) {
            const oldestIds = Array.from(this.processedMessageIds).slice(0, 50);
            oldestIds.forEach(id => this.processedMessageIds.delete(id));
            console.log('📝 오래된 메시지 ID 정리 완료');
          }
        }
      }
    } catch (error) {
      console.error('메시지 폴링 오류:', error);
    }
  }
  
  /**
   * 신호 메시지 처리 및 자동 매크로 실행
   * @param {Object} message - 텔레그램 메시지 객체
   * @returns {Promise<void>}
   */
  async processSignalMessage(message) {
    try {
      if (!message.text) {
        console.log('❌ 메시지에 텍스트가 없음:', message);
        return;
      }
      
      console.log('📨 메시지 처리 시작:', message.text);
      console.log('🔧 signalParser 상태:', this.signalParser ? '✅ 존재' : '❌ 없음');
      
      // 콜백 호출
      if (this.onMessageReceived) {
        this.onMessageReceived(message);
      }
      
      // TEST 메시지 처리
      if (message.text.toUpperCase().includes('TEST')) {
        await this.telegramBot.sendMessage(`✅ Test message received: ${message.text}`);
        return;
      }
      
      // DEBUG 명령어 처리
      if (message.text.toUpperCase().includes('DEBUG')) {
        await this.handleDebugCommand();
        return;
      }
      
      // PARSE 명령어 처리
      if (message.text.toUpperCase().startsWith('PARSE ')) {
        await this.handleParseCommand(message.text);
        return;
      }
      
      // SCREENSHOT 명령어 처리
      if (message.text.toUpperCase().includes('SCREENSHOT')) {
        await this.handleScreenshotCommand();
        return;
      }
      
      // UNLOCK 명령어 처리
      if (message.text.toUpperCase().includes('UNLOCK')) {
        await this.handleUnlockCommand();
        return;
      }
      
      // 신호 파싱
      if (!this.signalParser) {
        console.log('❌ signalParser가 초기화되지 않음');
        await this.telegramBot.sendMessage('⚠️ 신호 파서가 초기화되지 않았습니다. 자동매매를 다시 시작해주세요.');
        return;
      }
      
      const parsedSignal = this.signalParser.parseSignal(message.text);
      console.log('🔍 파싱 결과:', parsedSignal);
      
      if (!parsedSignal) {
        console.log('❌ 신호 파싱 실패 - 지원하지 않는 형식');
        return;
      }
      
      // 신호 유효성 검증
      const validation = this.signalParser.validateSignal(parsedSignal);
      
      if (!validation.valid) {
        console.log(`❌ 신호 검증 실패: ${validation.reason}`);
        
        // 심볼 불일치나 심볼 없음 경우에는 텔레그램 알림 보내지 않음 (스팸 방지)
        const silentErrors = ['심볼 불일치', '심볼이 없음', '파싱된 신호가 없음'];
        const shouldNotify = !silentErrors.some(error => validation.reason.includes(error));
        
        if (shouldNotify) {
          await this.telegramBot.sendMessage(`⚠️ 신호 처리 실패: ${validation.reason}`);
        }
        return;
      }
      
      console.log(`✅ 유효한 신호 감지:`, parsedSignal);
      
      // 자동 매크로 실행 (콜백 호출)
      if (this.onTradeExecute) {
        await this.onTradeExecute(parsedSignal);
      }
      
    } catch (error) {
      console.error('신호 메시지 처리 오류:', error);
      if (this.telegramBot) {
        await this.telegramBot.sendMessage(`❌ 신호 처리 중 오류 발생: ${error.message}`);
      }
    }
  }
  
  /**
   * DEBUG 명령어 처리
   * @returns {Promise<void>}
   */
  async handleDebugCommand() {
    if (!this.telegramBot || typeof lang === 'undefined') return;
    
    const debugInfo = lang.t('debug_info') + `\n` +
      lang.t('symbol_setting', { symbol: this.signalParser?.userSymbol || 'None' }) + `\n` +
      lang.t('parser_status', { status: this.signalParser ? '✅' : '❌' }) + `\n` +
      lang.t('bot_status', { status: this.telegramBot ? '✅' : '❌' }) + `\n` +
      lang.t('trading_status', { status: this.isTelegramTrading ? 'Running' : 'Stopped' }) + `\n` +
      lang.t('macro_status', { status: this.isExecutingTrade ? `✅ (${this.executingTradeType}, ${Math.round((Date.now() - this.tradeExecutionStartTime)/1000)}s elapsed)` : '❌' }) + `\n` +
      lang.t('last_trade', { time: this.lastTradeTime > 0 ? new Date(this.lastTradeTime).toLocaleTimeString() : 'None' }) + `\n` +
      lang.t('screenshot_feature') + `\n` +
      `\n` + lang.t('test_commands');
    
    await this.telegramBot.sendMessage(debugInfo);
  }
  
  /**
   * PARSE 명령어 처리
   * @param {string} messageText - 메시지 텍스트
   * @returns {Promise<void>}
   */
  async handleParseCommand(messageText) {
    if (!this.telegramBot || typeof lang === 'undefined') return;
    
    const testMessage = messageText.substring(6); // "PARSE " 제거
    const parsed = this.signalParser?.parseSignal(testMessage);
    const validation = parsed ? this.signalParser.validateSignal(parsed) : null;
    
    const result = lang.t('parsing_test_success') + `\n` +
      lang.t('parsing_input', { input: testMessage }) + `\n` +
      lang.t('parsing_result', { result: parsed ? '✅' : '❌' }) + `\n` +
      (parsed ? lang.t('parsing_symbol', { symbol: parsed.symbol }) + `\n` + lang.t('parsing_action', { action: parsed.action }) + `\n` : '') +
      lang.t('parsing_validation', { result: validation?.valid ? '✅' : '❌' }) + `\n` +
      (validation && !validation.valid ? lang.t('parsing_error', { error: validation.reason }) : '');
    
    await this.telegramBot.sendMessage(result);
  }
  
  /**
   * SCREENSHOT 명령어 처리
   * @returns {Promise<void>}
   */
  async handleScreenshotCommand() {
    if (!this.telegramBot || typeof lang === 'undefined') return;
    
    console.log('📸 스크린샷 테스트 시작...');
    
    try {
      const screenshot = await this.telegramBot.captureScreenshot();
      if (screenshot) {
        const result = await this.telegramBot.sendPhoto(screenshot, lang.t('screenshot_caption'));
        if (result.success) {
          await this.telegramBot.sendMessage(lang.t('screenshot_test_success'));
        } else {
          await this.telegramBot.sendMessage(lang.t('screenshot_send_failed', { error: result.error }));
        }
      }
    } catch (error) {
      await this.telegramBot.sendMessage(lang.t('screenshot_capture_failed', { error: error.message }));
    }
  }
  
  /**
   * UNLOCK 명령어 처리
   * @returns {Promise<void>}
   */
  async handleUnlockCommand() {
    if (!this.telegramBot) return;
    
    console.log('🔓 매크로 잠금 강제 해제 시도...');
    
    const wasLocked = this.isExecutingTrade;
    const previousType = this.executingTradeType;
    
    // 강제 잠금 해제
    this.isExecutingTrade = false;
    this.executingTradeType = null;
    this.lastTradeTime = 0;
    
    const unlockMessage = wasLocked 
      ? `🔓 Macro lock released successfully!\nPrevious state: ${previousType} executing\nReady to process new trading signals.`
      : `ℹ️ Macro was not locked.\nCurrent state: Normal (ready to process trading signals)`;
    
    await this.telegramBot.sendMessage(unlockMessage);
    console.log('🔓 매크로 잠금 강제 해제 완료');
  }
  
  /**
   * 거래 실행 잠금 확인 및 설정
   * @param {string} tradeType - 거래 타입
   * @returns {boolean} 실행 가능 여부
   */
  checkAndLockTrade(tradeType) {
    const now = Date.now();
    
    // 1. 현재 매크로 실행 중인지 확인
    if (this.isExecutingTrade) {
      const executionTime = now - this.tradeExecutionStartTime;
      if (executionTime > this.MAX_EXECUTION_TIME) {
        console.log(`⚠️ 매크로 실행 시간 초과 (${executionTime}ms) - 자동 잠금 해제`);
        this.isExecutingTrade = false;
        this.executingTradeType = null;
        this.tradeExecutionStartTime = 0;
        if (this.telegramBot) {
          this.telegramBot.sendMessage(`⚠️ Macro execution timeout - lock automatically released. Starting new trade.`);
        }
      } else {
        console.log(`⚠️ 매크로 실행 중복 방지: 이미 ${this.executingTradeType} 매크로 실행 중 (${Math.round(executionTime/1000)}초 경과)`);
        return false;
      }
    }
    
    // 2. 최소 거래 간격 확인
    const timeSinceLastTrade = now - this.lastTradeTime;
    if (timeSinceLastTrade < this.MIN_TRADE_INTERVAL) {
      const remainingTime = Math.ceil((this.MIN_TRADE_INTERVAL - timeSinceLastTrade) / 1000);
      console.log(`⚠️ 거래 간격 제한: ${remainingTime}초 후 재시도 가능`);
      if (this.telegramBot && typeof lang !== 'undefined') {
        this.telegramBot.sendMessage(lang.t('cooldown_message', { seconds: remainingTime }));
      }
      return false;
    }
    
    // 3. 매크로 실행 상태 설정
    this.isExecutingTrade = true;
    this.executingTradeType = tradeType;
    this.lastTradeTime = now;
    this.tradeExecutionStartTime = now;
    
    // 하위 호환성을 위한 상태 동기화
    this.syncToGlobalVars();
    
    console.log(`🔒 매크로 실행 잠금: ${tradeType} (${new Date().toLocaleTimeString()})`);
    return true;
  }
  
  /**
   * 거래 실행 잠금 해제
   */
  unlockTrade() {
    const executionTime = Date.now() - this.tradeExecutionStartTime;
    this.isExecutingTrade = false;
    this.executingTradeType = null;
    this.tradeExecutionStartTime = 0;
    
    // 하위 호환성을 위한 상태 동기화
    this.syncToGlobalVars();
    
    console.log(`🔓 매크로 실행 잠금 해제 (실행 시간: ${Math.round(executionTime/1000)}초, ${new Date().toLocaleTimeString()})`);
  }
  
  /**
   * 텔레그램 메시지 전송 (스크린샷 포함)
   * @param {string} text - 메시지 텍스트
   * @param {boolean} includeScreenshot - 스크린샷 포함 여부
   * @returns {Promise<void>}
   */
  async sendMessageWithScreenshot(text, includeScreenshot = true, delayBeforeScreenshot = 1000) {
    if (!this.telegramBot) return;
    await this.telegramBot.sendMessageWithScreenshot(text, includeScreenshot, delayBeforeScreenshot);
  }
  
  /**
   * 텔레그램 메시지 전송
   * @param {string} text - 메시지 텍스트
   * @returns {Promise<void>}
   */
  async sendMessage(text) {
    if (!this.telegramBot) return;
    await this.telegramBot.sendMessage(text);
  }
  
  /**
   * 현재 상태 가져오기
   * @returns {Object} 현재 상태 객체
   */
  getStatus() {
    return {
      isConnected: !!this.telegramBot,
      isPolling: this.isTelegramTrading,
      isExecutingTrade: this.isExecutingTrade,
      signalParser: !!this.signalParser
    };
  }
  
  /**
   * 하위 호환성을 위한 getter 메서드들
   */
  getBot() {
    return this.telegramBot;
  }
  
  getSignalParser() {
    return this.signalParser;
  }
  
  /**
   * 하위 호환성을 위한 상태 동기화 (popup.js의 전역 변수와 동기화)
   */
  syncToGlobalVars() {
    // popup.js의 전역 변수와 동기화 (하위 호환성)
    if (typeof window !== 'undefined') {
      window.telegramBot = this.telegramBot;
      window.signalParser = this.signalParser;
      window.isTelegramTrading = this.isTelegramTrading;
      window.isExecutingTrade = this.isExecutingTrade;
      window.executingTradeType = this.executingTradeType;
      window.lastTradeTime = this.lastTradeTime;
      window.tradeExecutionStartTime = this.tradeExecutionStartTime;
    }
  }
}

// 전역에서 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TelegramManager;
} else {
  window.TelegramManager = TelegramManager;
}

