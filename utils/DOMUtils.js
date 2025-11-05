/**
 * DOMUtils - DOM 조작 헬퍼 함수 모음
 * DOM 요소 접근 및 조작 로직 통합
 */
class DOMUtils {
  /**
   * 요소 가져오기 (안전)
   * @param {string} id - 요소 ID
   * @returns {HTMLElement|null}
   */
  static getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
      console.warn(`⚠️ 요소를 찾을 수 없습니다: #${id}`);
    }
    return element;
  }
  
  /**
   * 여러 요소 한 번에 가져오기
   * @param {string[]} ids - 요소 ID 배열
   * @returns {Object} {id: element} 형태의 객체
   */
  static getElements(ids) {
    const elements = {};
    ids.forEach(id => {
      elements[id] = this.getElement(id);
    });
    return elements;
  }
  
  /**
   * 텍스트 컨텐츠 설정
   * @param {HTMLElement|string} element - 요소 또는 ID
   * @param {string} text - 설정할 텍스트
   */
  static setText(element, text) {
    const el = typeof element === 'string' ? this.getElement(element) : element;
    if (el) {
      el.textContent = text;
    }
  }
  
  /**
   * 텍스트 컨텐츠 가져오기
   * @param {HTMLElement|string} element - 요소 또는 ID
   * @returns {string} 텍스트 컨텐츠
   */
  static getText(element) {
    const el = typeof element === 'string' ? this.getElement(element) : element;
    return el ? el.textContent.trim() : '';
  }
  
  /**
   * 값 설정 (input, select 등)
   * @param {HTMLElement|string} element - 요소 또는 ID
   * @param {*} value - 설정할 값
   */
  static setValue(element, value) {
    const el = typeof element === 'string' ? this.getElement(element) : element;
    if (el) {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        el.value = value;
      } else {
        el.textContent = value;
      }
    }
  }
  
  /**
   * 값 가져오기 (input, select 등)
   * @param {HTMLElement|string} element - 요소 또는 ID
   * @returns {*} 요소의 값
   */
  static getValue(element) {
    const el = typeof element === 'string' ? this.getElement(element) : element;
    if (el) {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        return el.value;
      } else {
        return el.textContent;
      }
    }
    return null;
  }
  
  /**
   * 클래스 추가
   * @param {HTMLElement|string} element - 요소 또는 ID
   * @param {string} className - 추가할 클래스명
   */
  static addClass(element, className) {
    const el = typeof element === 'string' ? this.getElement(element) : element;
    if (el) {
      el.classList.add(className);
    }
  }
  
  /**
   * 클래스 제거
   * @param {HTMLElement|string} element - 요소 또는 ID
   * @param {string} className - 제거할 클래스명
   */
  static removeClass(element, className) {
    const el = typeof element === 'string' ? this.getElement(element) : element;
    if (el) {
      el.classList.remove(className);
    }
  }
  
  /**
   * 클래스 토글
   * @param {HTMLElement|string} element - 요소 또는 ID
   * @param {string} className - 토글할 클래스명
   */
  static toggleClass(element, className) {
    const el = typeof element === 'string' ? this.getElement(element) : element;
    if (el) {
      el.classList.toggle(className);
    }
  }
  
  /**
   * 요소 활성/비활성화
   * @param {HTMLElement|string} element - 요소 또는 ID
   * @param {boolean} disabled - 비활성화 여부
   */
  static setDisabled(element, disabled) {
    const el = typeof element === 'string' ? this.getElement(element) : element;
    if (el) {
      el.disabled = disabled;
    }
  }
  
  /**
   * 요소 표시/숨김
   * @param {HTMLElement|string} element - 요소 또는 ID
   * @param {boolean} visible - 표시 여부
   */
  static setVisible(element, visible) {
    const el = typeof element === 'string' ? this.getElement(element) : element;
    if (el) {
      el.style.display = visible ? '' : 'none';
    }
  }
  
  /**
   * 스타일 설정
   * @param {HTMLElement|string} element - 요소 또는 ID
   * @param {string} property - CSS 속성명
   * @param {string} value - CSS 값
   */
  static setStyle(element, property, value) {
    const el = typeof element === 'string' ? this.getElement(element) : element;
    if (el) {
      el.style[property] = value;
    }
  }
  
  /**
   * 숫자 파싱 (안전)
   * @param {string} text - 파싱할 텍스트
   * @param {number} defaultValue - 기본값
   * @returns {number} 파싱된 숫자
   */
  static parseNumber(text, defaultValue = 0) {
    if (!text || text === '-') return defaultValue;
    const cleaned = text.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  /**
   * 숫자 포맷팅
   * @param {number} value - 포맷팅할 숫자
   * @param {number} decimals - 소수점 자리수
   * @returns {string} 포맷팅된 문자열
   */
  static formatNumber(value, decimals = 8) {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return value.toFixed(decimals);
  }
}

// 전역에서 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOMUtils;
} else {
  window.DOMUtils = DOMUtils;
}

