/**
 * Trading Configuration Tables Initialization
 * 진입 테이블과 익절 테이블 설정
 */

// 테이블 인스턴스 저장
let entryTable = null;
let tpTable = null;

/**
 * 진입 테이블 초기화
 */
function initializeEntryTable() {
    const defaultEntries = [
        { id: 1, conditionType: 'immediate', conditionValue: '', weight: 100 }
    ];

    entryTable = new DynamicTable({
        containerId: 'entryTableContainer',
        title: '진입 설정',
        columns: [
            { label: '#', field: 'index', type: 'index', width: '8%' },
            {
                label: '조건',
                field: 'conditionType',
                type: 'select',
                width: '28%',
                options: [
                    { value: 'immediate', label: '즉시' },
                    { value: 'percent', label: '변동(%)' },
                    { value: 'keyword', label: '키워드' }
                ]
            },
            {
                label: '값',
                field: 'conditionValue',
                type: 'text',
                width: '25%',
                placeholder: '0 또는 ENTRY1'
            },
            {
                label: '비중(%)',
                field: 'weight',
                type: 'number',
                width: '24%',
                min: 1,
                max: 100,
                step: 1
            }
        ],
        data: defaultEntries,
        maxRows: 10,
        onAdd: (data, newRow) => {
            console.log('진입 추가:', newRow);
            saveTradingConfig();
        },
        onDelete: (data, deletedRow) => {
            console.log('진입 삭제:', deletedRow);
            saveTradingConfig();
        },
        onChange: (data, index, field, value) => {
            console.log(`진입 변경: [${index}].${field} = ${value}`);
            saveTradingConfig();
        }
    });

    entryTable.render();
    return entryTable;
}

/**
 * TP 테이블 초기화
 */
function initializeTPTable() {
    const defaultTPs = [
        { id: 1, conditionType: 'percent', conditionValue: '2', closePercent: 100 }
    ];

    tpTable = new DynamicTable({
        containerId: 'tpTableContainer',
        title: '익절 설정',
        columns: [
            { label: '#', field: 'index', type: 'index', width: '8%' },
            {
                label: '조건',
                field: 'conditionType',
                type: 'select',
                width: '28%',
                options: [
                    { value: 'percent', label: '수익(%)' },
                    { value: 'trailing', label: '트레일링' },
                    { value: 'keyword', label: '키워드' }
                ]
            },
            {
                label: '값',
                field: 'conditionValue',
                type: 'text',
                width: '25%',
                placeholder: '2 또는 TP1'
            },
            {
                label: '청산(%)',
                field: 'closePercent',
                type: 'number',
                width: '24%',
                min: 1,
                max: 100,
                step: 1
            }
        ],
        data: defaultTPs,
        maxRows: 10,
        onAdd: (data, newRow) => {
            console.log('TP 추가:', newRow);
            saveTradingConfig();
        },
        onDelete: (data, deletedRow) => {
            console.log('TP 삭제:', deletedRow);
            saveTradingConfig();
        },
        onChange: (data, index, field, value) => {
            console.log(`TP 변경: [${index}].${field} = ${value}`);
            saveTradingConfig();
        }
    });

    tpTable.render();
    return tpTable;
}

/**
 * 트레이딩 설정 저장
 */
async function saveTradingConfig() {
    const tpModeSelect = document.getElementById('tpCalculationMode');
    const balanceUsageInput = document.getElementById('balanceUsage');
    const longTriggerInput = document.getElementById('longTrigger');
    const shortTriggerInput = document.getElementById('shortTrigger');
    const liqTriggerInput = document.getElementById('liqTrigger');
    const liqClosePositionToggle = document.getElementById('liqClosePosition');
    const stoplossInput = document.getElementById('stoplossValue');
    const leverageInput = document.getElementById('leverageValue');

    const config = {
        entries: entryTable ? entryTable.getData() : [],
        takeProfit: tpTable ? tpTable.getData() : [],
        tpCalculationMode: tpModeSelect ? tpModeSelect.value : 'total',
        balanceUsage: balanceUsageInput ? (parseFloat(balanceUsageInput.value) || 100) : 100,
        longTrigger: longTriggerInput ? longTriggerInput.value : 'LONG',
        shortTrigger: shortTriggerInput ? shortTriggerInput.value : 'SHORT',
        liqTrigger: liqTriggerInput ? liqTriggerInput.value : '',
        liqClosePosition: liqClosePositionToggle ? liqClosePositionToggle.checked : false,
        stopLoss: stoplossInput ? (parseFloat(stoplossInput.value) || 2) : 2,
        leverage: leverageInput ? (parseInt(leverageInput.value) || 1) : 1,
        timestamp: Date.now()
    };

    try {
        await chrome.storage.local.set({ tradingConfig: config });
        // UI의 수량 실시간 업데이트 반영
        if (typeof updateCalculatedAmount === 'function') {
            updateCalculatedAmount();
        }
    } catch (error) {
        console.error('❌ Failed to save trading config:', error);
    }
}

/**
 * 트레이딩 설정 로드
 */
async function loadTradingConfig() {
    try {
        const result = await chrome.storage.local.get(['tradingConfig']);
        if (result.tradingConfig) {
            const config = result.tradingConfig;

            if (entryTable && config.entries) {
                entryTable.setData(config.entries);
            }

            if (tpTable && config.takeProfit) {
                tpTable.setData(config.takeProfit);
            }

            const tpModeSelect = document.getElementById('tpCalculationMode');
            if (tpModeSelect && config.tpCalculationMode) {
                tpModeSelect.value = config.tpCalculationMode;
            }

            // 전역 설정 UI 값 복원
            if (config.balanceUsage) {
                const input = document.getElementById('balanceUsage');
                if (input) input.value = config.balanceUsage;
            }
            if (config.longTrigger) {
                const input = document.getElementById('longTrigger');
                if (input) input.value = config.longTrigger;
            }
            if (config.shortTrigger) {
                const input = document.getElementById('shortTrigger');
                if (input) input.value = config.shortTrigger;
            }
            // 청산 트리거 설정 로드
            if (config.liqTrigger !== undefined) {
                const input = document.getElementById('liqTrigger');
                if (input) input.value = config.liqTrigger;
            }
            if (config.liqClosePosition !== undefined) {
                const toggle = document.getElementById('liqClosePosition');
                if (toggle) toggle.checked = config.liqClosePosition;
            }
            if (config.stopLoss) {
                const input = document.getElementById('stoplossValue');
                if (input) input.value = config.stopLoss;
            }
            if (config.leverage) {
                const input = document.getElementById('leverageValue');
                if (input) {
                    input.value = config.leverage;
                    // 슬라이더 동기화
                    const slider = document.getElementById('leverageSlider');
                    if (slider) slider.value = config.leverage;
                }
            }

            // 수량 계산 업데이트
            if (typeof updateCalculatedAmount === 'function') {
                updateCalculatedAmount();
            }
        }
    } catch (error) {
        console.error('❌ Failed to load trading config:', error);
    }
}

// popup.js의 DOMContentLoaded에 추가할 초기화 코드
// document.addEventListener('DOMContentLoaded', () => {
//   initializeEntryTable();
//   initializeTPTable();
//   loadTradingConfig();
// });
