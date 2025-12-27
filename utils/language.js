/**
 * Multi-language Support System
 * Default: English, Optional: Korean
 */

class LanguageManager {
  constructor() {
    this.currentLanguage = 'en'; // Default to English
    this.translations = {
      en: {
        // UI Labels
        'trading_bot': 'Trading Bot',
        'start_trading': 'Start Trading',
        'stop_trading': 'Stop Trading',
        'exchange_select': 'Select Exchange',
        'assets_extraction': 'Assets Extraction',
        'price_extraction': 'Price Extraction',
        'extract_assets': 'Extract Assets',
        'extract_price': 'Extract Price',
        'current_assets': 'Current Assets',
        'current_price': 'Current Price',
        'calculated_amount': 'Max Amount',
        'macro_recording': 'Macro Recording',
        'record_long': 'Record Long',
        'record_short': 'Record Short',
        'manual_trading': 'Manual Trading',
        'manual_long': 'Long',
        'manual_short': 'Short',
        'manual_sl': 'Manual SL',
        'manual_close': 'Close',
        'stoploss_not_set': 'Stop loss is not set. Please enter a stop loss value.',
        'stoploss_too_high': 'Stop loss is set to 100% or higher. Please set it below 100%.',
        'sl_record': 'SL Record',
        'close_record': 'Record Close',
        'telegram_settings': 'Telegram Settings',
        'bot_token': 'Bot Token',
        'chat_id': 'Chat ID',
        'trading_trigger': 'Trading Trigger',
        'test_connection': 'Test Connection',
        'test': 'Test',
        'url': 'URL',
        'language': 'Language',

        // Status Messages
        'trading_started': 'Trading Started',
        'trading_stopped': 'Trading Stopped',
        'connection_success': 'Connection Successful',
        'connection_failed': 'Connection Failed',
        'macro_recorded': 'Macro Recorded',
        'macro_executed': 'Macro Executed',
        'extraction_success': 'Extraction Successful',
        'extraction_failed': 'Extraction Failed',

        // Telegram Messages
        'trade_success': '✅ {symbol} {action} trade executed successfully!',
        'trade_failed': '❌ {symbol} {action} trade execution failed',
        'trade_error': '❌ {symbol} {action} trade execution error',
        'signal_info': '📊 Signal: {message}',
        'amount_info': '💰 Amount: {amount}',
        'time_info': '⏰ Execution Time: {time}',
        'error_info': '🚨 Error: {error}',
        'auto_trading_started': '🤖 Auto trading started ({symbol} only)',
        'auto_trading_stopped': '⏸️ Auto trading stopped',
        'screenshot_caption': '📸 Trading Screen Capture',
        'macro_executing': '⚠️ Macro is currently executing. Please try again later.',
        'cooldown_message': '⏳ Please wait {seconds} more seconds before next trade.',

        // Debug Messages
        'debug_info': '🔧 Debug Information:',
        'symbol_setting': '• Symbol Setting: {symbol}',
        'parser_status': '• SignalParser Status: {status}',
        'bot_status': '• TelegramBot Status: {status}',
        'trading_status': '• Auto Trading Status: {status}',
        'macro_status': '• Macro Executing: {status}',
        'last_trade': '• Last Trade: {time}',
        'screenshot_feature': '• Screenshot Feature: ✅ Available',
        'test_commands': '💡 Test Commands: SCREENSHOT',

        // Error Messages
        'no_exchange_selected': 'Please select an exchange first.',
        'no_macro_recorded': '{type} macro not recorded. Please record macro first.',
        'amount_calculation_failed': 'Cannot calculate amount. Please extract Assets and Price first.',
        'active_tab_not_found': 'Active tab not found.',
        'signal_parsing_failed': 'Signal parsing failed',
        'signal_validation_failed': 'Signal validation failed: {reason}',
        'symbol_mismatch': 'Symbol mismatch (Setting: {userSymbol}, Signal: {signalSymbol})',
        'no_symbol_found': 'No symbol found',
        'no_action_found': 'No action found',
        'unsupported_action': 'Unsupported action',
        'telegram_not_configured': 'Telegram settings incomplete',
        'screenshot_capture_failed': 'Screenshot capture failed: {error}',
        'screenshot_send_failed': 'Screenshot send failed: {error}',

        // Success Messages
        'telegram_connected': 'Connected: @{username}',
        'telegram_connection_test_success': 'Telegram connection test successful',
        'screenshot_test_success': '✅ Screenshot feature is working properly!',
        'parsing_test_success': '🧪 Parsing Test Result:',
        'parsing_input': '📝 Input: "{input}"',
        'parsing_result': '• Parsing Result: {result}',
        'parsing_symbol': '• Symbol: {symbol}',
        'parsing_action': '• Action: {action}',
        'parsing_validation': '• Validation: {result}',
        'parsing_error': '• Error: {error}',

        // Additional UI Elements
        'settings': 'Settings',
        'dashboard': 'Dashboard',
        'position_status': 'Position',
        'trading_status': 'Status',
        'standby': 'Standby',
        'leverage': 'Leverage',
        'market_type': 'Market Type',
        'spot': 'Spot',
        'futures': 'Futures',
        'position_percent': 'Position (%)',
        'stoploss_percent': 'Stoploss (%)',
        'sl_record': 'SL Record',
        'close_record': 'Record Close',
        'custom_tp_strategy': 'Custom TP Strategy',
        'select_strategy': 'TP Strategy',
        'simple_tp': 'Simple TP',
        'trailing_tp': 'Trailing TP',
        'split_tp': 'Split TP',
        'take_profit_percent': 'Take Profit (%)',
        'trailing_distance': 'Trailing Distance (%)',
        'split_tp_percent': 'Split TP (%)',
        'load_data': 'Load Data',
        'save_data': 'Save Data',
        'clear_data': 'Clear Data',
        'load_data_success': 'Data loaded successfully.',
        'load_data_failed': 'Failed to load data.',
        'save_data_success': 'Data saved successfully.',
        'save_data_failed': 'Failed to save data. Please check the file format.',
        'clear_data_confirm': 'Are you sure you want to clear all data? This action cannot be undone.',
        'clear_data_success': 'All data has been cleared successfully.',
        'clear_data_failed': 'Failed to clear data.',
        'trading_settings': 'Action Console',
        'trading_options': 'Trading Settings',
        'trading_controls': 'Controls',
        'trading_controls_title': 'Trading Controls',
        'trading': 'Trading',
        'record': 'Recording Mode',
        'auto_trading': 'Auto Trading',
        'auto_refresh': 'Auto Refresh',
        'auto_refresh_minutes': 'Minutes',
        'extract': 'Extract',
        'selecting': 'Selecting...',
        'trading_mode': 'Trading Mode',
        'one_way_mode': 'One Way Mode',
        'hedge_mode': 'Hedge Mode',
        'close_position_confirm': 'End {type} position status? (Reset state)',
        'open': 'Open',
        'close': 'Close',
        'limit': 'Limit',
        'market': 'Market',
        'long': 'Long',
        'short': 'Short',
        'close_long': 'Close Long',
        'close_short': 'Close Short',
        'style': 'Style',
        'standard': 'Standard',
        'martingale': 'Martingale',
        'fixed_risk': 'Fixed Risk %',
        'smart_dca': 'Smart DCA',
        'pyramiding': 'Pyramiding',
        'twap': 'TWAP',
        'box_control': 'Box Control',
        'upper_limit': 'Upper Limit',
        'lower_limit': 'Lower Limit',
        'risk_per_trade': 'Risk per Trade (%)',
        'max_safety_orders': 'Max Safety Orders',
        'price_deviation': 'Price Deviation (%)',
        'step_volume_scale': 'Step Volume Scale',
        'add_step_percent': 'Add Step (%)',
        'add_amount_percent': 'Add Amount (%)',
        'total_duration_min': 'Total Duration (min)',
        'order_slices': 'Order Slices',

        // Languages
        'english': 'English',
        'korean': '한국어'
      },

      ko: {
        // UI Labels
        'trading_bot': '트레이딩 봇',
        'start_trading': '거래 시작',
        'stop_trading': '거래 중단',
        'exchange_select': '거래소 선택',
        'assets_extraction': '자산 추출',
        'price_extraction': '가격 추출',
        'extract_assets': '자산 추출',
        'extract_price': '가격 추출',
        'current_assets': '현재 자산',
        'current_price': '현재 가격',
        'calculated_amount': '최대 수량',
        'macro_recording': '매크로 녹화',
        'record_long': 'Long 녹화',
        'record_short': 'Short 녹화',
        'manual_trading': '수동 거래',
        'manual_long': 'Long',
        'manual_short': 'Short',
        'manual_sl': '수동 SL',
        'manual_close': 'Close',
        'stoploss_not_set': '스탑로스가 설정되지 않았습니다. 스탑로스 값을 입력해주세요.',
        'stoploss_too_high': '스탑로스가 100% 이상으로 설정되어 있습니다. 100% 미만으로 설정해주세요.',
        'sl_record': 'SL 녹화',
        'close_record': '녹화 Close',
        'telegram_settings': '텔레그램 설정',
        'bot_token': '봇 토큰',
        'chat_id': '채팅 ID',
        'trading_trigger': '거래 트리거',
        'test_connection': '연결 테스트',
        'test': '테스트',
        'url': 'URL',
        'language': '언어',

        // Status Messages
        'trading_started': '거래 시작됨',
        'trading_stopped': '거래 중단됨',
        'connection_success': '연결 성공',
        'connection_failed': '연결 실패',
        'macro_recorded': '매크로 녹화됨',
        'macro_executed': '매크로 실행됨',
        'extraction_success': '추출 성공',
        'extraction_failed': '추출 실패',

        // Telegram Messages
        'trade_success': '✅ {symbol} {action} 매크로 실행 성공!',
        'trade_failed': '❌ {symbol} {action} 매크로 실행 실패',
        'trade_error': '❌ {symbol} {action} 매크로 실행 중 오류 발생',
        'signal_info': '📊 신호: {message}',
        'amount_info': '💰 Amount: {amount}',
        'time_info': '⏰ 실행 시간: {time}',
        'error_info': '🚨 오류: {error}',
        'auto_trading_started': '🤖 자동매매 시작됨 ({symbol} 전용)',
        'auto_trading_stopped': '⏸️ 자동매매 중단됨',
        'screenshot_caption': '📸 거래 화면 캡처',
        'macro_executing': '⚠️ 매크로 실행 중입니다. 잠시 후 다시 시도해주세요.',
        'cooldown_message': '⏳ 다음 거래까지 {seconds}초 더 기다려주세요.',

        // Debug Messages
        'debug_info': '🔧 디버그 정보:',
        'symbol_setting': '• 설정된 심볼: {symbol}',
        'parser_status': '• SignalParser 상태: {status}',
        'bot_status': '• TelegramBot 상태: {status}',
        'trading_status': '• 자동매매 상태: {status}',
        'macro_status': '• 매크로 실행 중: {status}',
        'last_trade': '• 마지막 거래: {time}',
        'screenshot_feature': '• 스크린샷 기능: ✅ 사용 가능',
        'test_commands': '💡 테스트 명령어: SCREENSHOT',

        // Error Messages
        'no_exchange_selected': '먼저 거래소를 선택해주세요.',
        'no_macro_recorded': '{type} 매크로가 녹화되지 않았습니다. 먼저 매크로를 녹화해주세요.',
        'amount_calculation_failed': 'Amount를 계산할 수 없습니다. Assets와 Price를 먼저 추출해주세요.',
        'active_tab_not_found': '활성 탭을 찾을 수 없습니다.',
        'signal_parsing_failed': '신호 파싱 실패',
        'signal_validation_failed': '신호 검증 실패: {reason}',
        'symbol_mismatch': '심볼 불일치 (설정: {userSymbol}, 신호: {signalSymbol})',
        'no_symbol_found': '심볼이 없음',
        'no_action_found': '액션이 없음',
        'unsupported_action': '지원하지 않는 액션',
        'telegram_not_configured': '텔레그램 설정이 불완전함',
        'screenshot_capture_failed': '스크린샷 캡처 실패: {error}',
        'screenshot_send_failed': '스크린샷 전송 실패: {error}',

        // Success Messages
        'telegram_connected': '연결됨: @{username}',
        'telegram_connection_test_success': '텔레그램 연결 테스트 성공',
        'screenshot_test_success': '✅ 스크린샷 기능이 정상 작동합니다!',
        'parsing_test_success': '🧪 파싱 테스트 결과:',
        'parsing_input': '📝 입력: "{input}"',
        'parsing_result': '• 파싱 결과: {result}',
        'parsing_symbol': '• 심볼: {symbol}',
        'parsing_action': '• 액션: {action}',
        'parsing_validation': '• 검증: {result}',
        'parsing_error': '• 오류: {error}',

        // Additional UI Elements
        'settings': '설정',
        'dashboard': '대시보드',
        'position_status': '포지션 상태',
        'trading_status': '상태',
        'standby': '대기',
        'leverage': '레버리지',
        'market_type': '거래 유형',
        'spot': '현물',
        'futures': '선물',
        'position_percent': '포지션 (%)',
        'stoploss_percent': '손절 (%)',
        'sl_record': 'SL 녹화',
        'close_record': '녹화 청산',
        'custom_tp_strategy': '커스텀 TP 전략',
        'select_strategy': 'TP 전략',
        'simple_tp': '단순 TP',
        'trailing_tp': '트레일링 TP',
        'split_tp': '분할 TP',
        'take_profit_percent': '익절 (%)',
        'trailing_distance': '트레일링 거리 (%)',
        'split_tp_percent': '분할 TP 비중 (%)',
        'load_data': '데이터 불러오기',
        'save_data': '데이터 저장하기',
        'clear_data': '데이터 삭제',
        'load_data_success': '데이터가 성공적으로 불러와졌습니다.',
        'load_data_failed': '데이터 불러오기에 실패했습니다.',
        'save_data_success': '데이터가 성공적으로 저장되었습니다.',
        'save_data_failed': '데이터 저장에 실패했습니다. 파일 형식을 확인해주세요.',
        'clear_data_confirm': '모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
        'clear_data_success': '모든 데이터가 성공적으로 삭제되었습니다.',
        'clear_data_failed': '데이터 삭제에 실패했습니다.',
        'trading_settings': '액션 콘솔',
        'trading_options': '거래 설정',
        'trading_controls': '컨트롤',
        'trading_controls_title': '트레이딩 컨트롤',
        'trading': '거래',
        'record': '녹화모드',
        'auto_trading': '자동 거래',
        'auto_refresh': '자동 새로고침',
        'auto_refresh_minutes': '분',
        'extract': '추출',
        'selecting': '선택 중...',
        'trading_mode': '거래 모드',
        'one_way_mode': '원웨이 모드',
        'hedge_mode': '헤지 모드',
        'close_position_confirm': '{type} 포지션 상태를 종료하시겠습니까? (상태 초기화)',
        'open': 'Open',
        'close': 'Close',
        'limit': 'Limit',
        'market': 'Market',
        'long': 'Long',
        'short': 'Short',
        'close_long': 'Close Long',
        'close_short': 'Close Short',
        'style': '스타일',
        'standard': '표준',
        'martingale': '마틴게일',
        'fixed_risk': '리스크 고정형',
        'smart_dca': '스마트 DCA',
        'pyramiding': '피라미딩',
        'twap': 'TWAP',
        'box_control': '박스 컨트롤',
        'upper_limit': '상한 라인 (Price)',
        'lower_limit': '하한 라인 (Price)',
        'risk_per_trade': '진입 리스크 (%)',
        'max_safety_orders': '최대 안전 주문',
        'price_deviation': '가격 간격 (%)',
        'step_volume_scale': '수량 배수',
        'add_step_percent': '불타기 간격 (%)',
        'add_amount_percent': '추가 수량 (%)',
        'total_duration_min': '총 지속 시간 (분)',
        'order_slices': '분할 횟수',

        // Languages
        'english': 'English',
        'korean': '한국어'
      }
    };

    this.loadLanguageSettings();
  }

  /**
   * Get translated text
   * @param {string} key Translation key
   * @param {object} params Parameters for string interpolation
   * @returns {string} Translated text
   */
  t(key, params = {}) {
    let text = this.translations[this.currentLanguage][key] ||
      this.translations['en'][key] ||
      key;

    // String interpolation
    Object.keys(params).forEach(param => {
      text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    });

    return text;
  }

  /**
   * Set current language
   * @param {string} language Language code ('en' or 'ko')
   */
  setLanguage(language) {
    if (this.translations[language]) {
      this.currentLanguage = language;
      this.saveLanguageSettings();
      console.log(`Language changed to: ${language}`);
    }
  }

  /**
   * Get current language
   * @returns {string} Current language code
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Get available languages
   * @returns {Array} Array of language objects
   */
  getAvailableLanguages() {
    return [
      { code: 'en', name: this.translations['en']['english'] },
      { code: 'ko', name: this.translations['ko']['korean'] }
    ];
  }

  /**
   * Load language settings from storage
   */
  async loadLanguageSettings() {
    try {
      const result = await chrome.storage.local.get(['languageSettings']);
      if (result.languageSettings && result.languageSettings.language) {
        this.currentLanguage = result.languageSettings.language;
      }
    } catch (error) {
      console.log('Language settings not found, using default (English)');
    }
  }

  /**
   * Save language settings to storage
   */
  async saveLanguageSettings() {
    try {
      await chrome.storage.local.set({
        languageSettings: {
          language: this.currentLanguage
        }
      });
    } catch (error) {
      console.error('Failed to save language settings:', error);
    }
  }
}

// Create global instance
const lang = new LanguageManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LanguageManager;
} else {
  window.LanguageManager = LanguageManager;
  window.lang = lang;
}

console.log('LanguageManager loaded');
