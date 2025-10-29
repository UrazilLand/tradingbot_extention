// utils/signalParser.js
class SignalParser {
  constructor(userSymbol = '') {
    this.userSymbol = userSymbol.toUpperCase();
    
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
      /^(LONG|SHORT|BUY|SELL):\s*(\w+)$/i
    ];
  }

  setUserSymbol(symbol) {
    this.userSymbol = symbol.toUpperCase();
    console.log(`📊 사용자 심볼 설정: ${this.userSymbol}`);
  }

  parseSignal(message) {
    if (!message || typeof message !== 'string') {
      return null;
    }

    const cleanMessage = message.trim().toUpperCase();
    console.log(`🔍 신호 파싱 시도: "${cleanMessage}"`);

    for (const pattern of this.signalPatterns) {
      const match = cleanMessage.match(pattern);
      
      if (match) {
        let symbol, action;
        
        // 패턴에 따라 심볼과 액션 위치가 다름
        if (pattern.source.startsWith('^(\\w+)')) {
          // 심볼이 첫 번째인 경우: "BTC LONG"
          symbol = match[1];
          action = match[2];
        } else {
          // 액션이 첫 번째인 경우: "LONG BTC"  
          action = match[1];
          symbol = match[2];
        }

        // 액션 정규화
        action = this.normalizeAction(action);
        
        // 심볼 정리 (BTCUSDT -> BTC 등)
        symbol = this.extractBaseSymbol(symbol);

        const parsedSignal = {
          originalMessage: message,
          symbol: symbol,
          action: action,
          timestamp: new Date().toISOString()
        };

        console.log(`✅ 신호 파싱 성공:`, parsedSignal);
        return parsedSignal;
      }
    }

    console.log(`❌ 신호 파싱 실패: 패턴 매칭되지 않음`);
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
    // BTCUSDT, ETHUSDT 등에서 기본 심볼 추출
    const baseSymbol = symbol.replace(/USDT|USD|BUSD|BTC|ETH$/i, '');
    return baseSymbol.toUpperCase();
  }

  isSymbolMatch(signalSymbol) {
    if (!this.userSymbol || !signalSymbol) {
      return false;
    }

    const userSym = this.userSymbol.toUpperCase();
    const sigSym = signalSymbol.toUpperCase();

    // 정확한 매칭
    if (userSym === sigSym) {
      return true;
    }

    // 부분 매칭 (BTC가 BTCUSDT에 포함되는 경우)
    if (userSym.includes(sigSym) || sigSym.includes(userSym)) {
      return true;
    }

    return false;
  }

  validateSignal(parsedSignal) {
    if (!parsedSignal) {
      return { valid: false, reason: '파싱된 신호가 없음' };
    }

    if (!parsedSignal.symbol) {
      return { valid: false, reason: '심볼이 없음' };
    }

    if (!parsedSignal.action) {
      return { valid: false, reason: '액션이 없음' };
    }

    if (!['LONG', 'SHORT'].includes(parsedSignal.action)) {
      return { valid: false, reason: '지원하지 않는 액션' };
    }

    if (!this.isSymbolMatch(parsedSignal.symbol)) {
      return { 
        valid: false, 
        reason: `심볼 불일치 (설정: ${this.userSymbol}, 신호: ${parsedSignal.symbol})` 
      };
    }

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
    
    testMessages.forEach(msg => {
      const result = this.parseSignal(msg);
      console.log(`"${msg}" -> `, result);
    });
  }
}

// 전역에서 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SignalParser;
}
