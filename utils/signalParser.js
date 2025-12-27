// utils/signalParser.js
class SignalParser {
  constructor(userSymbol = '') {
    this.userSymbol = userSymbol; // Trading Trigger는 대소문자 구분

    // 다양한 신호 형식을 지원하는 정규표현식들
    this.signalPatterns = [
      // "BTC LONG", "ETH SHORT" 형식
      /^(\w+)\s+(LONG|SHORT|BUY|SELL)$/i,

      // "LONG BTC", "SHORT ETH" 형식  
      /^(LONG|SHORT|BUY|SELL)\s+(\w+)$/i,

      // "BTC: LONG", "ETH: SHORT" 형식
      /^(\w+):\s*(LONG|SHORT|BUY|SELL)$/i,

      // "📈 BTC LONG", "📉 ETH SHORT" 형식 (이모지 포함)
      /^[📈📉🟢🔴⬆️⬇️]*\s*(\w+)\s+(LONG|SHORT|BUY|SELL)$/i,

      // "LONG: BTC", "SHORT: ETH" 형식
      /^(LONG|SHORT|BUY|SELL):\s*(\w+)$/i,

      // "BTC TP1", "BTC TP2", "BTC TP3" 형식 (TP 신호)
      /^(\w+)\s+TP([123])$/i,

      // "TP1 BTC", "TP2 BTC" 형식
      /^TP([123])\s+(\w+)$/i,

      // Strategy.md formats
      // "🔵 [Entry] ENY1 Executed"
      /\[Entry\]\s+(?:ENY\d+|DCA\d+)/i,

      // "💰 [Exit] TP1 (Rescue Mode) Triggered"
      /\[Exit\]\s+(?:TP\d+|Trailing)/i,

      // "💥 [CRITICAL] Liquidation Triggered!"
      /\[CRITICAL\]\s+Liquidation/i
    ];
  }

  setUserSymbol(symbol) {
    this.userSymbol = symbol; // Trading Trigger는 대소문자 구분
    console.log(`📊 사용자 트리거 설정: ${this.userSymbol}`);
  }

  parseSignal(message) {
    if (!message || typeof message !== 'string') {
      return null;
    }

    const originalMessage = message.trim();
    const cleanMessage = originalMessage.toUpperCase(); // 액션 매칭을 위해 대문자 변환
    console.log(`🔍 신호 파싱 시도: "${originalMessage}"`);

    // 먼저 기본 패턴들로 시도
    for (const pattern of this.signalPatterns) {
      const match = cleanMessage.match(pattern);

      if (match) {
        let symbol, action;

        // Strategy.md specific parsing
        if (originalMessage.includes('[Entry]')) {
          action = 'LONG';
          symbol = this.userSymbol || 'UNKNOWN'; // Strategy.md doesn't send symbol in entry msg
        } else if (originalMessage.includes('[Exit]')) {
          if (originalMessage.includes('TP1')) action = 'TP1';
          else if (originalMessage.includes('TP2')) action = 'TP2';
          else if (originalMessage.includes('TP3') || originalMessage.includes('Trailing')) action = 'TP3';
          else action = 'CLOSE';

          symbol = this.userSymbol || 'UNKNOWN';
        } else if (originalMessage.includes('[CRITICAL] Liquidation')) {
          action = 'CLOSE'; // Or specific panic mode
          symbol = this.userSymbol || 'UNKNOWN';
        } else {
          // General case existing logic...
          if (pattern.source.includes('TP([123])')) {
            // ... existing TP logic
            if (pattern.source.startsWith('^(\\w+)')) {
              // "BTC TP1" 형식
              const symbolMatch = originalMessage.match(/^(\w+)/i);
              symbol = symbolMatch ? symbolMatch[1] : match[1];
              const tpLevel = match[2];
              action = `TP${tpLevel}`;
            } else {
              // "TP1 BTC" 형식
              const tpLevel = match[1];
              const symbolMatch = originalMessage.match(/(\w+)(?:\s|$)/i);
              if (symbolMatch) {
                const words = originalMessage.split(/\s+/);
                symbol = words.length > 1 ? words[1] : match[2];
              } else {
                symbol = match[2];
              }
              action = `TP${tpLevel}`;
            }
          } else {
            // ... existing normal logic
            // 일반 거래 신호
            // 패턴에 따라 심볼과 액션 위치가 다름
            if (pattern.source.startsWith('^(\\w+)')) {
              // 심볼이 첫 번째인 경우: "BTC LONG"
              // 원본 메시지에서 심볼 추출 (대소문자 유지)
              const symbolMatch = originalMessage.match(/^(\w+)/i);
              symbol = symbolMatch ? symbolMatch[1] : match[1];
              action = match[2];
            } else if (match[1] && (match[1].toUpperCase() === 'LONG' || match[1].toUpperCase() === 'SHORT' || match[1].toUpperCase() === 'BUY' || match[1].toUpperCase() === 'SELL')) {
              // 액션이 첫 번째인 경우: "LONG BTC"
              action = match[1];
              const symbolMatch = originalMessage.match(/(\w+)(?:\s|$)/i);
              if (symbolMatch) {
                const words = originalMessage.split(/\s+/);
                symbol = words.length > 1 ? words[1] : match[2];
              } else {
                symbol = match[2];
              }
            }

            if (action) action = this.normalizeAction(action);
          }
        }

        // 심볼 정리 (BTCUSDT -> BTC 등, 대소문자 유지)
        symbol = this.extractBaseSymbol(symbol);

        const parsedSignal = {
          originalMessage: originalMessage,
          symbol: symbol,
          action: action,
          timestamp: new Date().toISOString()
        };

        console.log(`✅ 신호 파싱 성공:`, parsedSignal);
        return parsedSignal;
      }
    }

    // 기본 패턴 실패 시 유연한 파싱 시도
    const flexibleResult = this.flexibleParsing(cleanMessage, originalMessage);
    if (flexibleResult) {
      return flexibleResult;
    }

    console.log(`❌ 신호 파싱 실패: 패턴 매칭되지 않음`);
    return null;
  }

  // 유연한 파싱 (기본 패턴 실패 시 사용)
  flexibleParsing(cleanMessage, originalMessage) {
    console.log(`🔄 유연한 파싱 시도: "${originalMessage}"`);

    // 알려진 액션들 (대소문자 무시)
    const knownActions = ['LONG', 'SHORT', 'BUY', 'SELL', 'CLOSE', 'TP1', 'TP2', 'TP3'];

    let foundSymbol = null;
    let foundAction = null;

    // 사용자 설정 트리거 확인 (대소문자 구분)
    if (this.userSymbol) {
      // 원본 메시지에서 정확한 대소문자로 찾기
      const triggerIndex = originalMessage.indexOf(this.userSymbol);
      if (triggerIndex !== -1) {
        foundSymbol = this.userSymbol;
      }
    }

    // 액션 찾기 (대소문자 무시)
    for (const action of knownActions) {
      if (cleanMessage.includes(action)) {
        // TP 신호는 그대로 유지, 나머지는 정규화
        if (action.startsWith('TP')) {
          foundAction = action;
        } else {
          foundAction = this.normalizeAction(action);
        }
        break;
      }
    }

    // 심볼과 액션이 모두 발견된 경우
    if (foundSymbol && foundAction) {
      const parsedSignal = {
        originalMessage: originalMessage,
        symbol: foundSymbol,
        action: foundAction,
        timestamp: new Date().toISOString()
      };

      console.log(`✅ 유연한 파싱 성공:`, parsedSignal);
      return parsedSignal;
    }

    // 사용자 설정 트리거만 확인 (액션 없이도 허용하지 않음)
    if (foundSymbol && !foundAction) {
      console.log(`⚠️ 트리거만 발견, 액션 없음: ${this.userSymbol}`);
      return null;
    }

    console.log(`❌ 유연한 파싱 실패: 심볼=${foundSymbol}, 액션=${foundAction}`);
    return null;
  }

  normalizeAction(action) {
    const upperAction = action.toUpperCase();

    // BUY/SELL을 LONG/SHORT로 변환
    switch (upperAction) {
      case 'BUY':
        return 'LONG';
      case 'SELL':
        return 'SHORT';
      case 'LONG':
      case 'SHORT':
        return upperAction;
      default:
        return upperAction;
    }
  }

  extractBaseSymbol(symbol) {
    if (!symbol || typeof symbol !== 'string') {
      console.log('❌ extractBaseSymbol: 유효하지 않은 심볼 -', symbol);
      return '';
    }

    const originalSymbol = symbol.trim(); // 대소문자 유지
    const upperSymbol = originalSymbol.toUpperCase();
    console.log('🔍 심볼 추출 시작:', originalSymbol);

    // BTCUSDT, ETHUSDT 등에서 기본 심볼 추출
    // 주의: BTC로 끝나는 경우 제외 (예: WBTC)
    let baseSymbol = originalSymbol; // 대소문자 유지

    // 일반적인 페어링 제거 (순서 중요, 대소문자 무시)
    const pairings = ['USDT', 'BUSD', 'USDC', 'USD', 'KRW', 'EUR', 'GBP'];

    for (const pairing of pairings) {
      if (upperSymbol.endsWith(pairing) && upperSymbol !== pairing) {
        // 대소문자 유지하면서 페어링 제거
        baseSymbol = originalSymbol.slice(0, -pairing.length);
        console.log(`🔧 ${pairing} 제거: ${originalSymbol} -> ${baseSymbol}`);
        break;
      }
    }

    // 결과 검증
    if (baseSymbol.length === 0) {
      console.log('⚠️ 심볼 추출 결과가 비어있음, 원본 사용:', originalSymbol);
      baseSymbol = originalSymbol;
    }

    console.log('✅ 심볼 추출 완료:', baseSymbol);
    return baseSymbol;
  }

  isSymbolMatch(signalSymbol) {
    if (!this.userSymbol || !signalSymbol) {
      return false;
    }

    // Trading Trigger는 대소문자 구분 (정확한 매칭만)
    if (this.userSymbol === signalSymbol) {
      return true;
    }

    return false;
  }

  validateSignal(parsedSignal) {
    console.log('🔍 신호 검증 시작:', parsedSignal);

    if (!parsedSignal) {
      console.log('❌ 검증 실패: 파싱된 신호가 없음');
      return { valid: false, reason: '파싱된 신호가 없음' };
    }

    if (!parsedSignal.symbol || parsedSignal.symbol.trim() === '') {
      console.log('❌ 검증 실패: 심볼이 없음 -', parsedSignal.symbol);
      return { valid: false, reason: '심볼이 없음' };
    }

    if (!parsedSignal.action || parsedSignal.action.trim() === '') {
      console.log('❌ 검증 실패: 액션이 없음 -', parsedSignal.action);
      return { valid: false, reason: '액션이 없음' };
    }

    // TP 신호는 별도 처리
    if (parsedSignal.action.startsWith('TP')) {
      // TP 신호는 심볼만 확인
      const symbolMatch = this.isSymbolMatch(parsedSignal.symbol);
      if (!symbolMatch) {
        return {
          valid: false,
          reason: `심볼 불일치 (설정: ${this.userSymbol}, 신호: ${parsedSignal.symbol})`
        };
      }
      console.log('✅ TP 신호 검증 성공');
      return { valid: true };
    }

    if (!['LONG', 'SHORT'].includes(parsedSignal.action)) {
      console.log('❌ 검증 실패: 지원하지 않는 액션 -', parsedSignal.action);
      return { valid: false, reason: '지원하지 않는 액션' };
    }

    const symbolMatch = this.isSymbolMatch(parsedSignal.symbol);
    console.log('🔍 심볼 매칭 확인:', {
      설정된심볼: this.userSymbol,
      신호심볼: parsedSignal.symbol,
      매칭결과: symbolMatch
    });

    if (!symbolMatch) {
      console.log('❌ 검증 실패: 심볼 불일치');
      return {
        valid: false,
        reason: `심볼 불일치 (설정: ${this.userSymbol}, 신호: ${parsedSignal.symbol})`
      };
    }

    console.log('✅ 신호 검증 성공');
    return { valid: true };
  }

  // 테스트용 메서드
  testSignalParsing() {
    const testMessages = [
      'BTC LONG',
      'ETH SHORT',
      'LONG BTC',
      'SHORT ETH',
      'BTC: LONG',
      'ETH: SHORT',
      '📈 BTC LONG',
      '📉 ETH SHORT',
      'LONG: BTC',
      'SHORT: ETH',
      'BTCUSDT LONG',
      'BUY BTC',
      'SELL ETH'
    ];

    console.log('🧪 신호 파싱 테스트 시작...');
    console.log(`설정된 심볼: ${this.userSymbol}`);

    testMessages.forEach(msg => {
      const result = this.parseSignal(msg);
      const validation = this.validateSignal(result);

      console.log(`"${msg}" -> `, result);
      console.log(`   검증: ${validation.valid ? '✅' : '❌'} ${validation.reason || ''}`);
    });
  }

  // Phase 8 통합 테스트용 메서드
  static testPhase8Integration(userSymbol = 'BTC') {
    console.log('🚀 Phase 8 통합 테스트 시작...');

    // 1. SignalParser 테스트
    const parser = new SignalParser(userSymbol);
    console.log('1️⃣ SignalParser 초기화 완료');

    // 2. 다양한 신호 형식 테스트
    const testSignals = [
      'BTC LONG',
      'ETH SHORT',  // 심볼 불일치 (BTC 설정인 경우)
      'LONG BTC',
      'SHORT BTC',
      '📈 BTC LONG',
      'BTCUSDT LONG',
      '🔵 [Entry] ENY1 Executed',
      '💰 [Exit] TP1 (Rescue Mode) Triggered',
      '🚀 [Exit] TP3 (Trailing Stop) Triggered',
      '💥 [CRITICAL] Liquidation Triggered!'
    ];

    console.log('2️⃣ 신호 파싱 테스트:');
    testSignals.forEach(signal => {
      const parsed = parser.parseSignal(signal);
      const validation = parser.validateSignal(parsed);

      console.log(`   "${signal}"`);
      console.log(`   -> 파싱: ${parsed ? '✅' : '❌'}`);
      if (parsed) {
        console.log(`   -> 심볼: ${parsed.symbol}, 액션: ${parsed.action}`);
        console.log(`   -> 검증: ${validation.valid ? '✅' : '❌'} ${validation.reason || ''}`);
      }
    });

    console.log('3️⃣ Phase 8 테스트 완료');
    return true;
  }
}

// 전역에서 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SignalParser;
}
