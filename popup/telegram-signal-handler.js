/**
 * Telegram Signal Handler for Auto-Trading (Priority Based)
 * 키워드 신호와 일반 방향 신호를 엄격히 분리하여 중복 진입을 원천 차단합니다.
 */

async function handleTelegramSignal(parsedSignal) {
    try {

        const result = await chrome.storage.local.get(['tradingConfig']);
        const config = result.tradingConfig;
        if (!config || !config.entries) return;

        const originalText = (parsedSignal.originalMessage || parsedSignal.text || '').toUpperCase();
        const positionState = window.positionManager.getState();

        // 0. 청산 트리거 감지 (최우선 처리)
        const liqTrigger = (config.liqTrigger || '').toUpperCase().trim();
        if (liqTrigger && originalText.includes(liqTrigger)) {
            console.log('💥 [LIQ] 청산 트리거 감지:', liqTrigger);

            const shouldClosePosition = config.liqClosePosition === true;

            // 포지션 종료 옵션이 켜져있고 활성 포지션이 있으면 청산
            if (shouldClosePosition && positionState.active) {
                const currentHolding = positionState.totalFilled - positionState.totalClosed;
                if (currentHolding > 0) {
                    const macroType = positionState.type === 'long' ? 'close_long_market' : 'close_short_market';
                    console.log(`💥 [LIQ] 포지션 종료 실행: ${macroType}, 수량: ${currentHolding}`);
                    await executeSmartTradeWithTelegram(macroType, currentHolding, true);
                }
            }

            // 봇 상태 초기화
            if (window.positionManager) {
                window.positionManager.reset();
                console.log('💥 [LIQ] PositionManager 초기화 완료');
            }
            if (config.entries) config.entries.forEach(e => e.executed = false);
            if (config.takeProfit) config.takeProfit.forEach(tp => tp.executed = false);
            await chrome.storage.local.set({ tradingConfig: config });

            // Telegram 알림
            if (typeof telegramManager !== 'undefined' && telegramManager) {
                const msg = shouldClosePosition
                    ? '💥 [LIQ] Position closed + Bot reset'
                    : '💥 [LIQ] Bot reset (position maintained)';
                await telegramManager.sendMessage(msg);
            }

            // UI 업데이트
            if (typeof updateDashboardValues === 'function') {
                updateDashboardValues();
            }

            return; // 청산 트리거 처리 완료, 다른 처리 중단
        }

        // 1. 방향 감지 (진입/청산을 판단하기 위해 우선 필요)
        const longTrigger = (config.longTrigger || 'LONG').toUpperCase();
        const shortTrigger = (config.shortTrigger || 'SHORT').toUpperCase();

        let detectedDirection = null;
        if (originalText.includes(longTrigger)) detectedDirection = 'long';
        else if (originalText.includes(shortTrigger)) detectedDirection = 'short';

        // 1.1 [중요] 신규 진입 시 상태 초기화
        // 포지션이 비어있는 상태에서 방향 신호를 받으면, 기존에 '실행됨'으로 표시된 엔트리/TP 상태를 모두 초기화합니다.
        if (!positionState.active && detectedDirection) {
            if (config.entries) config.entries.forEach(e => e.executed = false);
            if (config.takeProfit) config.takeProfit.forEach(tp => tp.executed = false);
        } else if (positionState.active) {
        }

        // 1. [우선순위] TP(청산) 키워드 감지
        if (positionState.active) {
            for (const tp of config.takeProfit || []) {
                if (tp.conditionType === 'keyword' && tp.conditionValue) {
                    const keyword = tp.conditionValue.trim().toUpperCase();
                    if (originalText.includes(keyword)) {

                        // 통합된 executeTP 로직 사용 (total/holding 비중 계산 포함)
                        if (window.AutoTradingLogic && window.AutoTradingLogic.executeTP) {
                            await window.AutoTradingLogic.executeTP(
                                tp,
                                config,
                                positionState,
                                savedSelectors,
                                executeSmartTradeWithTelegram
                            );

                            // 모든 익절이 완료되었거나 포지션이 0이 되면 종료 처리
                            const updatedPosition = window.positionManager.getState();
                            const currentHolding = updatedPosition.totalFilled - updatedPosition.totalClosed;

                            if (currentHolding <= 0 || config.takeProfit.every(t => t.executed)) {
                                window.positionManager.closePosition();
                            }
                        } else {
                            console.error('❌ AutoTradingLogic.executeTP 함수를 찾을 수 없습니다.');
                        }
                        return; // TP 처리 완료 후 종료
                    }
                }
            }
        }

        if (!detectedDirection) return;


        // 다른 방향 포지션이 이미 있다면 무시 (헷징 미지원 시)
        if (positionState.active && positionState.type !== detectedDirection) {
            console.warn(`⚠️ [SignalHandler] 반대 방향(${positionState.type}) 이미 활성화됨. 신규 진입을 무시합니다.`);
            return;
        }

        // 키워드 엔트리 매칭
        const matchingKeywordEntries = config.entries.filter(e =>
            e.conditionType === 'keyword' &&
            e.conditionValue &&
            originalText.includes(e.conditionValue.trim().toUpperCase())
        );

        let targets = [];
        if (matchingKeywordEntries.length > 0) {
            targets = matchingKeywordEntries;
        } else {
            // 키워드가 없으면 일반 '즉시' 진입 실행
            targets = config.entries.filter(e => e.conditionType === 'immediate');
        }

        if (targets.length === 0) return;

        for (const entry of targets) {
            // [로직 변경] 키워드 진입의 경우, 사용자가 신호를 다시 보냈다면 강제 재진입을 허용합니다.

            entry.executed = true;
            await executeEntryFromTelegram(entry, config, positionState, detectedDirection, parsedSignal.symbol);
        }

    } catch (error) {
        console.error('❌ [SignalHandler] 오류:', error);
    }
}

async function executeEntryFromTelegram(entry, config, positionState, direction, signalSymbol = null) {
    if (!positionState.active) {
        await window.AutoTradingLogic.startNewPosition(direction, savedSelectors);
    }

    const leverageValue = document.getElementById('leverageValue')?.value || 1;
    const amount = window.AutoTradingLogic.calculateEntryAmount(
        entry.weight,
        config.balanceUsage || 100,
        savedSelectors,
        leverageValue
    );

    if (amount <= 0) {
        entry.executed = false;
        console.error(`❌ [Entry] ${entry.id} 수량 계산 실패`);
        return;
    }

    const macroType = direction === 'long' ? 'open_long_market' : 'open_short_market';

    await executeSmartTradeWithTelegram(macroType, amount, true, signalSymbol);

    // [Fix] 진입 시 가격이 0이면 (추출 전이면) 현재 시점의 가격을 최대한 확보
    let entryPrice = savedSelectors.price || 0;
    if (entryPrice <= 0 && window.AutoTradingLogic) {
        // Fallback: extractPrice가 아직 수행되지 않았거나 실패했을 때
        // 런타임에서 강제 추출은 어렵지만, 이미 extractPrice가 주기적으로 돌고 있으므로 
        // 약간의 대기 후 다시 가져오거나 0이면 기록하지 않음
    }

    entry.price = entryPrice;
    entry.amount = amount;
    window.positionManager.recordEntry(entry.id, entry.price, amount);
    await chrome.storage.local.set({ tradingConfig: config });

    // [Add] 팝업 UI 대시보드 즉시 업데이트 트리거
    if (typeof updateDashboardValues === 'function') {
        updateDashboardValues();
    }
}

window.handleTelegramSignal = handleTelegramSignal;
