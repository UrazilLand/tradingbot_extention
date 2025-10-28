# 크롬 익스텐션 기반 암호화폐 자동매매 봇 API 참조

## 개요
이 문서는 크롬 익스텐션 기반 암호화폐 자동매매 봇의 API와 내부 구조에 대한 상세한 참조 정보를 제공합니다.

## 아키텍처

### 전체 구조
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Background    │    │    Content      │    │     Popup       │
│   Script        │◄──►│    Script       │◄──►│   Interface     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Storage       │    │   Macro Engine  │    │   Settings      │
│   Manager       │    │                 │    │   Panel        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 모듈 구조
- **Background Script**: 백그라운드 작업 및 메시지 처리
- **Content Script**: 웹페이지 주입 및 매크로 실행
- **Popup Interface**: 사용자 인터페이스
- **Utils**: 공통 유틸리티 모듈들

## API 참조

### Background Script API

#### 메시지 처리
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 메시지 타입별 처리
});
```

**지원하는 메시지 타입**:
- `startTrading`: 거래 시작
- `stopTrading`: 거래 중단
- `getStatus`: 상태 조회
- `updateSettings`: 설정 업데이트
- `showNotification`: 알림 표시

#### 알람 관리
```javascript
chrome.alarms.create('statusCheck', {
    delayInMinutes: 5,
    periodInMinutes: 5
});
```

**알람 타입**:
- `statusCheck`: 정기 상태 체크
- `dailyStats`: 일일 통계 업데이트

### Content Script API

#### 매크로 엔진
```javascript
class MacroEngine {
    startRecording(macroName, macroType)
    stopRecording()
    executeMacro(macroName, delay)
    testMacro(macroName)
    deleteMacro(macroName)
}
```

**주요 메서드**:
- `startRecording()`: 매크로 녹화 시작
- `stopRecording()`: 매크로 녹화 중단
- `executeMacro()`: 매크로 실행
- `testMacro()`: 매크로 테스트

#### 기술적 지표
```javascript
class TechnicalIndicators {
    addPriceData(price, timestamp)
    calculateSMA(period)
    calculateEMA(period)
    calculateBollingerBands(period, stdDev)
    calculateRSI(period)
    calculateMACD(fastPeriod, slowPeriod, signalPeriod)
    calculateStochastic(kPeriod, dPeriod)
}
```

**지표 타입**:
- `SMA`: 단순 이동평균선
- `EMA`: 지수 이동평균선
- `BollingerBands`: 볼린저 밴드
- `RSI`: 상대강도지수
- `MACD`: 이동평균수렴확산
- `Stochastic`: 스토캐스틱

#### 거래 로직
```javascript
class TradingLogic {
    startTrading()
    stopTrading()
    checkTradingSignals()
    executeBuyOrder()
    executeSellOrder()
    analyzeSignals()
}
```

**주요 메서드**:
- `startTrading()`: 거래 시작
- `stopTrading()`: 거래 중단
- `checkTradingSignals()`: 거래 신호 확인
- `executeBuyOrder()`: 매수 주문 실행
- `executeSellOrder()`: 매도 주문 실행

### Storage Manager API

#### 설정 관리
```javascript
class StorageManager {
    saveSettings(settings)
    loadSettings()
    updateSettings(updates)
}
```

#### 매크로 관리
```javascript
saveMacro(name, macro)
loadMacro(name)
loadAllMacros()
deleteMacro(name)
```

#### 거래 내역 관리
```javascript
saveTradeHistory(trade)
loadTradeHistory(limit)
clearTradeHistory()
```

#### 통계 관리
```javascript
saveStatistics(stats)
loadStatistics()
updateStatistics(trade)
```

## 데이터 구조

### 설정 데이터
```javascript
{
    strategy: 'bollinger_bands',
    period: 20,
    stdDev: 2.0,
    tradePercentage: 10,
    checkInterval: 5000,
    enabled: false,
    notifications: {
        buySignals: true,
        sellSignals: true,
        orderExecuted: true,
        positionClosed: true,
        errors: true
    }
}
```

### 매크로 데이터
```javascript
{
    name: 'buy',
    type: 'buy',
    steps: [
        {
            type: 'click',
            selector: '#buy-button',
            text: 'Buy',
            timestamp: 1234567890,
            position: { x: 100, y: 200 }
        }
    ],
    createdAt: 1234567890,
    exchange: 'gateio'
}
```

### 거래 내역 데이터
```javascript
{
    id: 'abc123',
    type: 'buy',
    price: 50000.00,
    timestamp: 1234567890,
    profitLoss: 1000.00,
    profitLossPercent: 2.0,
    strategy: 'bollinger_bands'
}
```

### 포지션 데이터
```javascript
{
    type: 'long',
    entryPrice: 50000.00,
    entryTime: 1234567890,
    amount: 0.1,
    currentPrice: 51000.00,
    unrealizedPnl: 100.00,
    unrealizedPnlPct: 2.0
}
```

### 통계 데이터
```javascript
{
    totalTrades: 100,
    profitableTrades: 60,
    totalProfitLoss: 5000.00,
    winRate: 60.0,
    averageProfitLoss: 50.00,
    bestTrade: 500.00,
    worstTrade: -200.00,
    lastUpdated: 1234567890
}
```

## 이벤트 시스템

### 메시지 이벤트
```javascript
// 팝업 → 백그라운드
chrome.runtime.sendMessage({
    type: 'startTrading'
});

// 백그라운드 → 콘텐츠
chrome.tabs.sendMessage(tabId, {
    type: 'startTrading'
});

// 콘텐츠 → 팝업
chrome.runtime.sendMessage({
    type: 'updateStatus',
    status: statusData
});
```

### 알림 이벤트
```javascript
chrome.notifications.create({
    type: 'basic',
    iconUrl: 'assets/icon48.png',
    title: 'Crypto Trading Bot',
    message: '매수 신호 감지!'
});
```

### 스토리지 이벤트
```javascript
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        // 로컬 스토리지 변경 처리
    }
});
```

## 확장 API

### 새로운 거래소 추가
```javascript
// manifest.json에 도메인 추가
"host_permissions": [
    "https://*.newexchange.com/*"
]

// 가격 추출 함수 추가
extractNewExchangePrice() {
    const priceElement = document.querySelector('.new-exchange-price');
    if (priceElement) {
        const priceText = priceElement.textContent.replace(/[^0-9.-]/g, '');
        return parseFloat(priceText);
    }
    return null;
}
```

### 새로운 지표 추가
```javascript
class TechnicalIndicators {
    calculateNewIndicator(period) {
        // 새로운 지표 계산 로직
        const data = this.priceHistory.slice(-period);
        // 계산 로직 구현
        return result;
    }
    
    checkNewIndicatorBuySignal(period, threshold) {
        const value = this.calculateNewIndicator(period);
        return value < threshold;
    }
}
```

### 새로운 전략 추가
```javascript
// 전략 타입 추가
const StrategyType = {
    NEW_STRATEGY: 'new_strategy'
};

// 전략 로직 구현
analyzeSignals() {
    switch (this.settings.strategy) {
        case 'new_strategy':
            signals.buySignal = this.checkNewStrategyBuySignal();
            signals.sellSignal = this.checkNewStrategySellSignal();
            break;
    }
}
```

## 성능 최적화

### 메모리 관리
```javascript
// 가격 히스토리 제한
if (this.priceHistory.length > this.maxHistoryLength) {
    this.priceHistory.shift();
}

// 거래 내역 제한
if (history.length > 1000) {
    history.splice(0, history.length - 1000);
}
```

### CPU 최적화
```javascript
// 체크 간격 조정
const checkInterval = Math.max(this.settings.checkInterval, 5000);

// 불필요한 계산 방지
if (this.priceHistory.length < this.settings.period) {
    return;
}
```

### 네트워크 최적화
```javascript
// 로컬 데이터만 사용
const price = this.extractLocalPrice();
// 외부 API 호출 없음
```

## 디버깅

### 로그 시스템
```javascript
console.log('거래 시작:', status);
console.error('오류 발생:', error);
console.warn('경고:', warning);
```

### 개발자 도구
```javascript
// 콘솔에서 직접 접근
window.macroEngine.getMacros();
window.technicalIndicators.getAllIndicators();
window.tradingLogic.getStatus();
```

### 오류 처리
```javascript
try {
    await this.executeMacro(macroName);
} catch (error) {
    console.error('매크로 실행 실패:', error);
    this.showNotification(`매크로 실행 실패: ${error.message}`, 'error');
}
```

## 보안 고려사항

### 데이터 보안
- 모든 데이터는 로컬에만 저장
- 외부 서버로 데이터 전송 없음
- 민감한 정보 암호화

### 권한 관리
```javascript
// 최소 권한 원칙
"permissions": [
    "activeTab",
    "storage",
    "scripting",
    "tabs",
    "notifications"
]
```

### 입력 검증
```javascript
validateInput(input) {
    if (typeof input !== 'number' || input <= 0) {
        throw new Error('유효하지 않은 입력값');
    }
    return input;
}
```

## 테스트

### 단위 테스트
```javascript
// 지표 계산 테스트
test('SMA 계산', () => {
    const indicators = new TechnicalIndicators();
    indicators.addPriceData(100);
    indicators.addPriceData(200);
    const sma = indicators.calculateSMA(2);
    expect(sma).toBe(150);
});
```

### 통합 테스트
```javascript
// 매크로 실행 테스트
test('매크로 실행', async () => {
    const macroEngine = new MacroEngine();
    await macroEngine.startRecording('test', 'buy');
    // 매크로 녹화 시뮬레이션
    await macroEngine.stopRecording();
    const result = await macroEngine.executeMacro('test');
    expect(result).toBe(true);
});
```

## 배포

### 패키징
```bash
# 프로젝트 폴더 압축
zip -r tradingbot-extension.zip .
```

### 설치
1. Chrome 브라우저에서 `chrome://extensions/` 접속
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. 프로젝트 폴더 선택

### 업데이트
1. 새 버전 다운로드
2. 기존 익스텐션 제거
3. 새 버전 설치
4. 설정 복원

## 라이선스
MIT License - 자유롭게 사용, 수정, 배포 가능

## 기여
1. Fork 프로젝트
2. Feature 브랜치 생성
3. 변경사항 커밋
4. Pull Request 생성
