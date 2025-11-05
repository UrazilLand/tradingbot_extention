/**
 * StateManager - 중앙화된 상태 관리 클래스
 * 상태 변경 감지 및 구독자 패턴 구현
 */
class StateManager {
  constructor() {
    this.state = {
      trading: {
        isActive: false,
        mode: 'oneway', // 'oneway' or 'hedge'
        changed: false
      },
      macro: {
        recording: false,
        recordingType: null, // 'long', 'short', 'close'
        types: {
          long: false,
          short: false,
          close: false
        },
        changed: false
      },
      position: {
        current: null, // 'long', 'short', null
        entryPrice: null,
        entryTime: null,
        isActive: false,
        changed: false
      },
      selection: {
        isSelecting: false,
        type: 'balance', // 'balance' or 'price'
        changed: false
      },
      selectors: {
        assets: null,
        price: null,
        changed: false
      },
      settings: {
        exchange: null,
        leverage: 1,
        position: [100, 0, 0],
        stoploss: 2,
        autoRefresh: 0,
        changed: false
      },
      timers: {
        extraction: null,
        autoRefresh: null,
        autoRefreshCountdown: null,
        autoRefreshRemainingTime: 0,
        changed: false
      }
    };
    
    // 이전 상태 저장 (변경 감지용)
    this.previousState = JSON.parse(JSON.stringify(this.state));
    this.listeners = [];
  }
  
  /**
   * 상태 가져오기 (경로 기반)
   * @param {string} path - 점으로 구분된 경로 (예: 'trading.isActive')
   * @returns {*} 상태 값
   */
  getState(path) {
    if (!path) return this.state;
    
    const parts = path.split('.');
    let value = this.state;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  /**
   * 상태 설정 (경로 기반)
   * @param {string} path - 점으로 구분된 경로
   * @param {*} value - 설정할 값
   */
  setState(path, value) {
    const oldValue = this.getState(path);
    
    // 값이 실제로 변경되었는지 확인
    if (JSON.stringify(oldValue) === JSON.stringify(value)) {
      return; // 변경 없으면 리턴
    }
    
    // 상태 업데이트
    this.setNestedValue(this.state, path, value);
    
    // 변경 플래그 설정
    this.markChanged(path);
    
    // 구독자들에게 알림
    this.notifyListeners();
    
    // 이전 상태 업데이트
    this.previousState = JSON.parse(JSON.stringify(this.state));
  }
  
  /**
   * 중첩된 객체에 값 설정
   * @private
   */
  setNestedValue(obj, path, value) {
    const parts = path.split('.');
    const lastPart = parts.pop();
    
    let current = obj;
    for (const part of parts) {
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[lastPart] = value;
  }
  
  /**
   * 변경 플래그 설정
   * @private
   */
  markChanged(path) {
    const parts = path.split('.');
    const firstPart = parts[0];
    
    // 최상위 섹션에 changed 플래그 설정
    if (firstPart in this.state && this.state[firstPart] && typeof this.state[firstPart] === 'object') {
      this.state[firstPart].changed = true;
    }
  }
  
  /**
   * 구독자들에게 알림
   * @private
   */
  notifyListeners() {
    // 구독자들에게 변경된 상태 전달
    this.listeners.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        console.error('StateManager listener error:', error);
      }
    });
    
    // 알림 후 changed 플래그 초기화
    this.resetChangedFlags();
  }
  
  /**
   * 모든 changed 플래그 리셋
   * @private
   */
  resetChangedFlags() {
    this.state.trading.changed = false;
    this.state.macro.changed = false;
    this.state.position.changed = false;
    this.state.selection.changed = false;
    this.state.selectors.changed = false;
    this.state.settings.changed = false;
    this.state.timers.changed = false;
  }
  
  /**
   * 상태 변경 구독
   * @param {Function} callback - 상태 변경 시 호출될 콜백 함수
   * @returns {Function} 구독 해제 함수
   */
  subscribe(callback) {
    this.listeners.push(callback);
    
    // 구독 해제 함수 반환
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * 전체 상태 가져오기
   * @returns {Object} 전체 상태 객체
   */
  getFullState() {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  /**
   * 상태 초기화
   */
  reset() {
    this.state = {
      trading: { isActive: false, mode: 'oneway', changed: false },
      macro: { recording: false, recordingType: null, types: { long: false, short: false, close: false }, changed: false },
      position: { current: null, entryPrice: null, entryTime: null, isActive: false, changed: false },
      selection: { isSelecting: false, type: 'balance', changed: false },
      selectors: { assets: null, price: null, changed: false },
      settings: { exchange: null, leverage: 1, position: [100, 0, 0], stoploss: 2, autoRefresh: 0, changed: false },
      timers: { extraction: null, autoRefresh: null, autoRefreshCountdown: null, autoRefreshRemainingTime: 0, changed: false }
    };
    this.previousState = JSON.parse(JSON.stringify(this.state));
    this.notifyListeners();
  }
}

// 전역에서 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateManager;
} else {
  window.StateManager = StateManager;
}

