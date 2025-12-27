/**
 * StorageUtils - Chrome Storage API 래퍼 클래스
 * 설정 저장/로드 로직 통합
 */
class StorageUtils {
  constructor() {
    this.storage = chrome.storage.local;
  }

  /**
   * 설정 저장
   * @param {Object} data - 저장할 데이터
   * @returns {Promise<void>}
   */
  async save(data) {
    try {
      await this.storage.set(data);
      console.log('✅ Storage 저장 완료:', Object.keys(data));
    } catch (error) {
      console.error('❌ Storage 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 설정 불러오기
   * @param {string|string[]} keys - 불러올 키 또는 키 배열
   * @returns {Promise<Object>} 저장된 데이터
   */
  async load(keys) {
    try {
      const result = await this.storage.get(keys);
      console.log('✅ Storage 로드 완료:', keys);
      return result;
    } catch (error) {
      console.error('❌ Storage 로드 실패:', error);
      throw error;
    }
  }

  /**
   * 설정 삭제
   * @param {string|string[]} keys - 삭제할 키 또는 키 배열
   * @returns {Promise<void>}
   */
  async remove(keys) {
    try {
      await this.storage.remove(keys);
      console.log('✅ Storage 삭제 완료:', keys);
    } catch (error) {
      console.error('❌ Storage 삭제 실패:', error);
      throw error;
    }
  }

  /**
   * 전체 데이터 초기화
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      await this.storage.clear();
      console.log('✅ Storage 전체 초기화 완료');
    } catch (error) {
      console.error('❌ Storage 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 매크로 저장
   * @param {string} macroType - 매크로 타입 ('long', 'short', 'close')
   * @param {Array} actions - 매크로 액션 배열
   * @returns {Promise<void>}
   */
  async saveMacro(macroType, actions) {
    const key = `${macroType}Macro`;
    await this.save({ [key]: actions });
    console.log(`✅ ${macroType} 매크로 저장됨:`, actions.length, 'actions');
  }

  /**
   * 매크로 불러오기
   * @param {string[]} macroTypes - 불러올 매크로 타입 배열
   * @returns {Promise<Object>} 매크로 객체
   */
  async loadMacros(macroTypes = [
    'open_long_limit', 'open_short_limit',
    'open_long_market', 'open_short_market',
    'close_long_limit', 'close_short_limit',
    'close_long_market', 'close_short_market'
  ]) {
    const keys = macroTypes.map(type => `${type}Macro`);
    const result = await this.load(keys);

    const macros = {};
    macroTypes.forEach(type => {
      macros[`${type}Macro`] = result[`${type}Macro`] || null;
    });

    return macros;
  }

  /**
   * 셀렉터 저장 (Exchange & Market Type Scope Support)
   * @param {string} type - 셀렉터 타입 ('balance' or 'price')
   * @param {string|Object} selectorData - CSS 셀렉터 문자열 또는 { selector, frameId } 객체
   * @param {string} exchange - 거래소 이름 (Optional)
   * @param {string} marketType - 마켓 타입 ('spot' or 'futures') (Optional, default: futures)
   * @returns {Promise<void>}
   */
  async saveSelector(type, selectorData, exchange = null, marketType = 'futures') {
    // Normalize data to object structure
    const data = typeof selectorData === 'object' ? selectorData : { selector: selectorData, frameId: 0 };

    if (exchange) {
      // Exchange-specific storage with Market Type sub-classification
      const key = `selectors_${exchange}_${marketType}`;
      const currentData = await this.load([key]);
      const settings = currentData[key] || {};
      settings[type] = data;
      await this.save({ [key]: settings });
      console.log(`✅ ${exchange}_${marketType} ${type} 셀렉터 저장됨:`, data);
    } else {
      // Default global storage (Legacy support)
      const key = type === 'balance' ? 'balanceSelector' : 'priceSelector';
      await this.save({ [key]: data });
      console.log(`✅ Global ${type} 셀렉터 저장됨:`, data);
    }
  }

  /**
   * 셀렉터 불러오기 (Exchange & Market Type Scope Support)
   * @param {string} exchange - 거래소 이름 (Optional)
   * @param {string} marketType - 마켓 타입 ('spot' or 'futures') (Optional, default: futures)
   * @returns {Promise<Object>} 셀렉터 객체 {balanceSelector, priceSelector} (normalized to {selector, frameId})
   */
  async loadSelectors(exchange = null, marketType = 'futures') {
    let rawResult;
    if (exchange) {
      const key = `selectors_${exchange}_${marketType}`;
      const result = await this.load([key]);
      const settings = result[key] || {};
      rawResult = {
        balanceSelector: settings.balance,
        priceSelector: settings.price
      };
    } else {
      rawResult = await this.load(['balanceSelector', 'priceSelector']);
    }

    // Normalize legacy strings to objects
    const normalize = (val) => {
      if (!val) return null;
      if (typeof val === 'string') return { selector: val, frameId: 0 };
      return val;
    };

    return {
      balanceSelector: normalize(rawResult.balanceSelector),
      priceSelector: normalize(rawResult.priceSelector)
    };
  }

  /**
   * 텔레그램 설정 저장
   * @param {Object} settings - 텔레그램 설정 객체
   * @returns {Promise<void>}
   */
  async saveTelegramSettings(settings) {
    await this.save({ telegramSettings: settings });
    console.log('✅ 텔레그램 설정 저장됨');
  }

  /**
   * 텔레그램 설정 불러오기
   * @returns {Promise<Object|null>} 텔레그램 설정 객체
   */
  async loadTelegramSettings() {
    const result = await this.load(['telegramSettings']);
    return result.telegramSettings || null;
  }

  /**
   * TP 설정 저장
   * @param {Object} tpSettings - TP 설정 객체
   * @returns {Promise<void>}
   */
  async saveTpSettings(tpSettings) {
    await this.save({ customTpSettings: tpSettings });
    console.log('✅ TP 설정 저장됨');
  }

  /**
   * TP 설정 불러오기
   * @returns {Promise<Object|null>} TP 설정 객체
   */
  async loadTpSettings() {
    const result = await this.load(['customTpSettings']);
    return result.customTpSettings || null;
  }

  /**
   * 분할 진입 설정 저장
   * @param {Object} splitEntrySettings - 분할 진입 설정 객체
   * @returns {Promise<void>}
   */
  async saveSplitEntrySettings(splitEntrySettings) {
    await this.save({ splitEntrySettings });
    console.log('✅ 분할 진입 설정 저장됨');
  }

  /**
   * 분할 진입 설정 불러오기
   * @returns {Promise<Object|null>} 분할 진입 설정 객체
   */
  async loadSplitEntrySettings() {
    const result = await this.load(['splitEntrySettings']);
    return result.splitEntrySettings || null;
  }

  /**
   * 모든 데이터 가져오기 (Export용)
   * @returns {Promise<Object>} 모든 저장된 데이터
   */
  async getAllData() {
    return await this.load(null);
  }

  /**
   * 모든 데이터 설정 (Import용)
   * @param {Object} data - 설정할 데이터
   * @returns {Promise<void>}
   */
  async setAllData(data) {
    await this.storage.clear();
    await this.save(data);
  }
}

// 전역에서 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageUtils;
} else {
  window.StorageUtils = StorageUtils;
}

