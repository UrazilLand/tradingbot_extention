//@version=6
indicator("ATR Sniper Loop [Hybrid: Rescue & Profit]", overlay=false, max_labels_count=500, max_lines_count=500)

// ==============================================================================
// 1. Inputs (입력 설정)
// ==============================================================================

group_time = "0. Time Settings (Backtest Start)"
input_useDate   = input.bool(false, "Use Start Date Filter", group=group_time)
input_startYear = input.int(2024, "Start Year", minval=2000, group=group_time)
input_startMonth= input.int(1, "Start Month", minval=1, maxval=12, group=group_time)
input_startDay  = input.int(1, "Start Day", minval=1, maxval=31, group=group_time)

group_main = "1. Entry Settings"
input_atrLength = input.int(50, "ATR Period", minval=1, group=group_main)
input_maLength  = input.int(50, "Base MA Period", minval=1, group=group_main)
input_dipMult   = input.float(3, "Dip ATR Multiple", step=0.1, group=group_main)

group_filter = "2. Filter (RSI)"
input_rsiLen    = input.int(14, "RSI Length", minval=1, group=group_filter)
input_rsiLimit  = input.int(30, "RSI Limit", minval=1, maxval=100, tooltip="ENY1(첫 진입) 필수 적용", group=group_filter)
input_useRsiDca = input.bool(true, "Use RSI for DCA?", tooltip="ENY2 및 DCA 진입 시에도 RSI 과매도 조건 적용", group=group_filter)

group_dca = "3. DCA & Sizing (Simulation)"
input_capital   = input.float(10000, "Initial Capital", group=group_dca)
input_leverage  = input.float(10.0, "Leverage", minval=1.0, step=1, group=group_dca)
input_maxOrders = input.int(10, "Max Orders (Total)", minval=1, tooltip="총 진입 허용 횟수", group=group_dca)
input_stepMult  = input.float(4.0, "DCA ATR Multiple", step=0.1, group=group_dca)
input_marginPercent = input.float(5.0, "Initial Margin %", step=0.1, tooltip="진입 시 사용할 증거금 비율", group=group_dca)
input_martingale    = input.float(1.35, "Martingale", step=0.01, group=group_dca)

group_exit = "4. TP Settings"
input_tp1_percent = input.float(1.0, "[TP1] Target % (DCA Rescue)", step=0.1, tooltip="DCA 물량 청산 (구조 모드)", group=group_exit) / 100
input_tp2_percent = input.float(3.0, "[TP2] Target % (ENY2 Profit)", step=0.1, tooltip="ENY2 물량 청산 (수익 모드) 및 TP3 트레일링 스탑 간격", group=group_exit) / 100


// ==============================================================================
// 2. Calculations
// ==============================================================================

float atrValue = ta.atr(input_atrLength)
float baseMa   = ta.sma(close, input_maLength)
float rsiValue = ta.rsi(close, input_rsiLen)
float lowerBand = baseMa - (atrValue * input_dipMult)

// 날짜 필터 계산
int startTime = timestamp(input_startYear, input_startMonth, input_startDay, 00, 00)
bool isDateOk = input_useDate ? (time >= startTime) : true

// ==============================================================================
// 3. Simulation Engine (Futures Style State Machine)
// ==============================================================================

// 포지션 관리 변수 (LIFO)
var float[] entry_prices = array.new_float(0)
var float[] entry_qties  = array.new_float(0)

// 평단가 및 상태 변수
var float sim_avg_price = na   
var float sim_pos_size  = 0.0  
var float sim_highest_price = 0.0 
var int last_tp1_bar = -999

// 통계 변수
var float total_realized_pnl = 0.0
var int win_count = 0
var int loss_count = 0

// 현재 오픈된 포지션 수
int sim_openTrades = array.size(entry_prices)

// ------------------------------------------------------------------------------
// 진입 조건 (Entry Logic)
// ------------------------------------------------------------------------------
bool condBand = close < lowerBand
bool condRsi  = rsiValue < input_rsiLimit
float lastEntryPrice = sim_openTrades > 0 ? array.get(entry_prices, sim_openTrades - 1) : na

// 다음 진입 예상 가격 계산
float next_entry_price = na
if sim_openTrades == 0
    next_entry_price := lowerBand
else if sim_openTrades < input_maxOrders
    float step_target = lastEntryPrice - (atrValue * input_stepMult)
    next_entry_price := math.min(step_target, nz(sim_avg_price, step_target)) // 평단가 상승 방지

bool isEntrySignal = false

if sim_openTrades == 0
    // [ENY1] 첫 진입
    isEntrySignal := condBand and condRsi and isDateOk
else if sim_openTrades < input_maxOrders
    // [ENY2, DCA...] 추가 진입
    bool is_cooldown = (bar_index <= last_tp1_bar + 3)
    bool rsi_condition = input_useRsiDca ? condRsi : true
    
    if (close < next_entry_price) and not is_cooldown and rsi_condition
        isEntrySignal := true

// 최고가 갱신
if sim_pos_size > 0
    sim_highest_price := math.max(sim_highest_price, high)
else
    sim_highest_price := 0.0

// 목표가 계산
float refPrice = nz(sim_avg_price, close)
float priceTP1 = refPrice * (1 + input_tp1_percent)
float priceTP2 = refPrice * (1 + input_tp2_percent)
float trailingPrice = sim_highest_price * (1 - input_tp2_percent) // TP3 트레일링 스탑

// ------------------------------------------------------------------------------
// 시뮬레이션 및 신호 처리 (Simulation & Signals)
// ------------------------------------------------------------------------------

string signal_txt = na
color signal_col = na
string entry_label = na

// Alert 플래그
bool alert_trig_entry = false
bool alert_trig_tp    = false
bool alert_trig_liq   = false

// 1. Check Exits (청산 로직)
bool exit_triggered = false
string alert_exit_msg = na

// 강제청산 판정
bool is_max_position = (sim_openTrades == input_maxOrders)
float liq_price_check = (sim_pos_size > 0 and is_max_position) ? sim_avg_price * (1 - (1.0 / input_leverage)) : na

if not na(liq_price_check) and low <= liq_price_check
    signal_txt := "💥 LIQUIDATION"
    signal_col := color.red
    
    total_realized_pnl := -input_capital
    loss_count += 1
    
    // 초기화
    sim_pos_size := 0.0
    sim_avg_price := na
    sim_highest_price := 0.0
    array.clear(entry_prices)
    array.clear(entry_qties)
    
    exit_triggered := true
    alert_trig_liq := true
    
    // [중요] 강제청산 알림 메시지 발송
    alert_exit_msg := "💥 [CRITICAL] Liquidation Triggered!\nPrice: " + str.tostring(low) + "\nAccount Blown."
    alert(alert_exit_msg, alert.freq_once_per_bar)

// 일반 청산 로직
if not exit_triggered and sim_openTrades > 0
    float pnl_sum = 0.0
    
    // [MODE 1: Rescue] DCA 물량 청산
    if sim_openTrades > 2
        if high >= priceTP1
            while array.size(entry_prices) > 2
                float exit_p = priceTP1
                float q = array.pop(entry_qties)
                array.pop(entry_prices)
                
                float pnl = (exit_p - sim_avg_price) * q
                pnl_sum += pnl
                total_realized_pnl += pnl
                if pnl > 0
                    win_count += 1
                else
                    loss_count += 1
                
                sim_pos_size -= q
            
            signal_txt := "TP1"
            signal_col := color.green
            exit_triggered := true
            alert_trig_tp := true
            last_tp1_bar := bar_index
            
            alert_exit_msg := "💰 [Exit] TP1 (Rescue Mode) Triggered\nPrice: " + str.tostring(priceTP1) + "\nRealized PnL: " + str.tostring(math.round(pnl_sum, 2))
            alert(alert_exit_msg, alert.freq_once_per_bar)

    // [MODE 2: Profit] ENY2 물량 청산
    else if sim_openTrades == 2
        if high >= priceTP2
            float exit_p = priceTP2
            float q = array.pop(entry_qties)
            array.pop(entry_prices)
            
            float pnl = (exit_p - sim_avg_price) * q
            total_realized_pnl += pnl
            if pnl > 0
                win_count += 1
            else
                loss_count += 1
            
            sim_pos_size -= q
            
            signal_txt := "TP2"
            signal_col := color.green
            exit_triggered := true
            alert_trig_tp := true
            
            alert_exit_msg := "💰 [Exit] TP2 (Profit Mode) Triggered\nPrice: " + str.tostring(priceTP2) + "\nRealized PnL: " + str.tostring(math.round(pnl, 2))
            alert(alert_exit_msg, alert.freq_once_per_bar)

    // [MODE 3: MoonBag] 마지막 물량 트레일링 스탑
    else if sim_openTrades == 1
        bool condTrail = (low <= trailingPrice) and (trailingPrice > sim_avg_price)
        
        if condTrail
            float exit_p = trailingPrice
            float q = array.pop(entry_qties)
            array.pop(entry_prices)
            
            float pnl = (exit_p - sim_avg_price) * q
            total_realized_pnl += pnl
            if pnl > 0
                win_count += 1
            else
                loss_count += 1
            
            sim_pos_size -= q
            
            signal_txt := "TP3(Trail)"
            signal_col := color.blue
            exit_triggered := true
            alert_trig_tp := true
            
            alert_exit_msg := "🚀 [Exit] TP3 (Trailing Stop) Triggered\nPrice: " + str.tostring(trailingPrice) + "\nRealized PnL: " + str.tostring(math.round(pnl, 2))
            alert(alert_exit_msg, alert.freq_once_per_bar)

    if sim_pos_size <= 0.0000001
        sim_pos_size := 0.0
        sim_avg_price := na
        sim_highest_price := 0.0


// 2. Check Entries (진입 로직)
float current_equity = input_capital + total_realized_pnl
if not exit_triggered and isEntrySignal and current_equity > 0
    float safeEquity = math.max(0.0, current_equity)
    float baseAmount = safeEquity * (input_marginPercent / 100) * input_leverage 
    float entryAmount = baseAmount * math.pow(input_martingale, sim_openTrades)
    float qty = entryAmount / close
    
    // 평단가 계산
    float current_val = (nz(sim_pos_size) * nz(sim_avg_price))
    float new_cost = qty * close
    sim_avg_price := (current_val + new_cost) / (sim_pos_size + qty)
    sim_pos_size += qty
    sim_highest_price := high

    array.push(entry_prices, close)
    array.push(entry_qties, qty)
    
    if sim_openTrades == 0
        entry_label := "ENY1"
    else if sim_openTrades == 1
        entry_label := "ENY2"
    else
        entry_label := "DCA" + str.tostring(sim_openTrades - 1)
        
    alert_trig_entry := true

    string alert_entry_msg = "🔵 [Entry] " + entry_label + " Executed\nPrice: " + str.tostring(close)
    alert(alert_entry_msg, alert.freq_once_per_bar_close)

// 상태 업데이트
sim_openTrades := array.size(entry_prices)

// ==============================================================================
// 4. Alert Conditions (Webhook)
// ==============================================================================
alertcondition(alert_trig_entry, title="[Alert] Long Entry", message="Long Entry Signal Triggered")
alertcondition(alert_trig_tp,    title="[Alert] Take Profit (All)", message="Take Profit Signal Triggered (TP1/TP2/TP3)")
alertcondition(alert_trig_liq,   title="[Alert] Liquidation", message="Liquidation Signal Triggered")


// ==============================================================================
// 5. Visualization
// ==============================================================================

// Indicators
plot(baseMa, "Base MA", color=color.gray, force_overlay=true)
plot(lowerBand, "Lower Band", color=color.new(color.red, 0), linewidth=2, force_overlay=true)
plot(sim_pos_size > 0 ? sim_avg_price : na, "Avg Price", color=color.yellow, style=plot.style_linebr, linewidth=2, force_overlay=true)

// Liquidation Price
plot(liq_price_check, "Liquidation Price", color=color.new(color.red, 50), style=plot.style_cross, linewidth=2, force_overlay=true)

// Next Entry Step
plot(next_entry_price, "Next Entry Step", color=color.new(color.gray, 50), style=plot.style_stepline, force_overlay=true)

// Labels
color entry_col = color.red
if not na(entry_label)
    entry_col := str.contains(entry_label, "ENY") ? color.orange : color.from_gradient(sim_openTrades, 2, input_maxOrders, color.new(color.red, 40), color.maroon)
    label.new(bar_index, low, text=entry_label, color=entry_col, textcolor=color.white, style=label.style_label_up, yloc=yloc.belowbar, size=size.small, force_overlay=true)

if not na(signal_txt)
    label.new(bar_index, high, text=signal_txt, color=signal_col, textcolor=color.white, style=label.style_label_down, yloc=yloc.abovebar, size=size.small, force_overlay=true)

// Target Lines
float show_tp1 = sim_openTrades > 2 ? sim_avg_price * (1 + input_tp1_percent) : na
float show_tp2 = sim_openTrades >= 2 ? sim_avg_price * (1 + input_tp2_percent) : na
float show_trail = (sim_openTrades == 1 and sim_highest_price > 0 and trailingPrice > sim_avg_price) ? trailingPrice : na

plot(show_tp1, "TP1 Target", color=color.green, style=plot.style_circles, force_overlay=true)
plot(show_tp2, "TP2 Target", color=color.green, style=plot.style_circles, force_overlay=true)
plot(show_trail, "TP3 Trail", color=color.blue, style=plot.style_cross, force_overlay=true)

// RSI Panel
hline(70, "RSI Overbought", color=color.gray, linestyle=hline.style_dotted)
hline(30, "RSI Oversold", color=color.gray, linestyle=hline.style_dotted)
hline(input_rsiLimit, "Entry Limit", color=color.new(color.red, 50), linestyle=hline.style_dashed, linewidth=1)
plot(rsiValue, "RSI", color=color.purple, linewidth=2)
bgcolor(condRsi ? color.new(color.green, 70) : na, title = "RSI Bull BG")

// ==============================================================================
// 6. Dashboard Table
// ==============================================================================

var table dash = table.new(position.top_right, 2, 5, border_width=1, border_color=color.gray, frame_color=color.gray, frame_width=1, force_overlay=true)

if barstate.islast
    table.cell(dash, 0, 0, "Metric", bgcolor=color.new(color.gray, 50), text_color=color.white)
    table.cell(dash, 1, 0, "Value", bgcolor=color.new(color.gray, 50), text_color=color.white)
    
    string status_txt = sim_openTrades == 0 ? "Flat" : (sim_openTrades == 1 ? "MoonBag" : (sim_openTrades == 2 ? "Profit Mode" : "Rescue Mode"))
    if total_realized_pnl <= -input_capital
        status_txt := "BANKRUPT"
        
    color status_col = total_realized_pnl <= -input_capital ? color.red : (sim_openTrades > 2 ? color.red : (sim_openTrades > 0 ? color.green : color.gray))
    
    table.cell(dash, 0, 1, "Status", bgcolor=color.black, text_color=color.white)
    table.cell(dash, 1, 1, status_txt, bgcolor=color.black, text_color=status_col)
    
    table.cell(dash, 0, 2, "Open Trades", bgcolor=color.black, text_color=color.white)
    table.cell(dash, 1, 2, str.tostring(sim_openTrades), bgcolor=color.black, text_color=color.white)
    
    color pnl_col = total_realized_pnl >= 0 ? color.green : color.red
    table.cell(dash, 0, 3, "Total PnL", bgcolor=color.black, text_color=color.white)
    table.cell(dash, 1, 3, str.tostring(math.round(total_realized_pnl, 2)) + " $", bgcolor=color.black, text_color=pnl_col)
    
    int total_trades = win_count + loss_count
    float win_rate = total_trades > 0 ? (win_count / float(total_trades)) * 100 : 0.0
    table.cell(dash, 0, 4, "Win Rate", bgcolor=color.black, text_color=color.white)
    table.cell(dash, 1, 4, str.tostring(math.round(win_rate, 1)) + "% (" + str.tostring(total_trades) + ")", bgcolor=color.black, text_color=color.white)