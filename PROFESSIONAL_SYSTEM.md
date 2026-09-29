# 🚀 Professional Trading Portfolio Management System

## Overview

This is a complete professional-grade multi-account trading portfolio management system. It tracks multiple trading accounts (Forex, Crypto, Stocks) with advanced analytics, automated alerts, real-time monitoring, and AI-powered recommendations.

## Key Features

### 1. **Multi-Account Management** 💼
- Support for multiple account types: Forex, Crypto, Stocks
- Individual account tracking with separate capital and performance metrics
- Account status monitoring (active, paused, closed)
- Risk profile configuration per account (conservative, moderate, aggressive)
- Monthly allocation tracking for reinvestment

### 2. **Professional Dashboard** 📊
Access at `/professional`

**Tabs:**
- **Overview**: Executive summary of all accounts
- **Accounts**: Manage all trading accounts
- **Portfolio**: Consolidated portfolio view with equity curves
- **Team**: Specialist monitoring with real-time alerts
- **Capital**: Capital allocation and reinvestment tracking
- **Alerts**: System alerts and risk warnings
- **Recommendations**: AI-generated actionable recommendations
- **Reports**: Weekly/monthly/quarterly performance reports

### 3. **Team Specialist System** 👥

Four automated specialists monitor your portfolio:

#### Operations Manager
- Oversees all trading operations
- Manages capital allocation decisions
- Monitors portfolio health
- Triggers reinvestment opportunities

#### Risk Advisor
- Tracks account drawdowns
- Generates risk-based alerts
- Monitors max drawdown limits
- Recommends position size adjustments

#### Price Specialist
- Tracks real-time market prices (via Binance, Alpha Vantage)
- Monitors crypto and stock prices
- Generates price-level alerts
- Identifies trading opportunities

#### Performance Coach
- Analyzes trading psychology
- Tracks discipline and emotional state
- Provides improvement recommendations
- Monitors behavioral patterns

### 4. **Automated Alerts** ⚠️

**Alert Types:**
- **Drawdown Alerts**: Triggered when account equity drops below threshold
- **Profit Alerts**: When account hits profit targets
- **Capital Alerts**: Low capital warnings
- **Price Alerts**: When assets hit defined price levels
- **Account Change Alerts**: Significant account movements

**Alert Levels:**
- 🚨 Critical: Immediate action required
- ⚡ Warning: Monitor closely
- ℹ️ Info: Informational

### 5. **Capital Management** 💰

- Track initial capital and current balance
- Record deposits, withdrawals, and reinvestments
- Automatic reinvestment of profits (configurable %)
- Full transaction history per account
- Capital allocation tracking across accounts

### 6. **Professional Reports** 📄

**Report Types:**
- Daily summaries
- Weekly detailed analysis
- Monthly comprehensive review
- Quarterly performance reviews

**Report Contents:**
- Consolidated performance metrics
- Win rate and profit factor analysis
- Per-account performance breakdown
- Psychological analysis
- Highlights and areas of concern
- AI-generated recommendations
- HTML export for sharing

### 7. **Real-Time Prices** 💹

**Integrated APIs:**
- Binance API (Crypto prices)
- Alpha Vantage (Stock prices)
- Finnhub (Market data)

**Price Tracking:**
- Automatic caching of last prices
- 24h high/low/volume data
- Price change percentages
- Real-time updates

### 8. **AI Recommendations** 💡

**Auto-Generated Recommendations:**
- Capital allocation based on performance
- Risk management adjustments
- Portfolio diversification suggestions
- Strategy optimization tips
- Psychological improvement recommendations

**Recommendation Priority:**
- 🚨 Critical: Implement immediately
- 🔥 High: Implement soon
- ⚡ Medium: Consider implementing
- 💡 Low: Optional improvements

## API Endpoints

### Accounts
```
GET  /api/accounts              - List all accounts
POST /api/accounts              - Create new account
PUT  /api/accounts              - Update account
DELETE /api/accounts?id=<id>   - Delete account
```

### Trades
```
GET  /api/trades?account=<id>   - Get account trades
POST /api/trades               - Create new trade
PUT  /api/trades               - Update trade
DELETE /api/trades             - Delete trade
```

### Portfolio
```
GET  /api/portfolio             - Consolidated portfolio data
```

### Capital
```
GET  /api/capital?account=<id>  - Get capital data
POST /api/capital              - Add capital movement
PATCH /api/capital             - Auto-reinvest profits
```

### Alerts
```
GET  /api/alerts?mode=active   - Get active alerts
POST /api/alerts               - Create alert
PUT  /api/alerts               - Acknowledge alert
PATCH /api/alerts              - Trigger auto-checks
```

### Prices
```
GET  /api/prices               - Get all prices
GET  /api/prices?symbol=BTC   - Get specific price
POST /api/prices               - Update price (Binance)
```

### Reports
```
GET  /api/reports?period=weekly - Get reports
POST /api/reports              - Generate new report
```

### Recommendations
```
GET  /api/recommendations      - List recommendations
POST /api/recommendations      - Generate new recommendations
PUT  /api/recommendations      - Mark as resolved
```

### Team
```
GET  /api/team?mode=status    - Get team status
POST /api/team                 - Acknowledge alerts
PATCH /api/team                - Generate team report
```

## Data Structure

### Account
```typescript
{
  id: string
  name: string
  type: 'forex' | 'crypto' | 'stocks'
  broker: string
  initialCapital: number
  currentCapital: number
  status: 'active' | 'paused' | 'closed'
  accountManager: string
  riskProfile: 'conservative' | 'moderate' | 'aggressive'
  monthlyAllocation: number
  maxDrawdownPercent: number
  createdAt: string
  updatedAt: string
}
```

### Trade
```typescript
{
  id: number
  accountId: string
  date: string
  time: string
  pair: string
  tf: string
  dir: 'LONG' | 'SHORT'
  res: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'PENDING'
  entry: number
  sl: number
  tp: number
  pnl: number
  tags: string[]
  attachments: string[]
}
```

## Usage Examples

### Create Account
```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add",
    "name": "Crypto Portfolio",
    "type": "crypto",
    "broker": "Binance",
    "initialCapital": 5000,
    "riskProfile": "moderate"
  }'
```

### Add Trade
```bash
curl -X POST http://localhost:3000/api/trades \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "propia",
    "date": "2026-09-29",
    "time": "14:30",
    "pair": "BTC/USDT",
    "entry": 45000,
    "sl": 44500,
    "tp": 46000,
    "pnl": 500
  }'
```

### Generate Report
```bash
curl -X POST http://localhost:3000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "period": "weekly"
  }'
```

### Get Portfolio
```bash
curl http://localhost:3000/api/portfolio
```

## Best Practices

1. **Account Setup**
   - Create separate accounts for different strategies
   - Set realistic risk profiles
   - Define clear monthly allocation targets

2. **Trading**
   - Record all trades immediately
   - Include detailed notes and tags
   - Attach analysis screenshots

3. **Capital Management**
   - Review capital allocation weekly
   - Reinvest profitable accounts systematically
   - Track performance per euro invested

4. **Monitoring**
   - Check alerts daily
   - Review recommendations weekly
   - Generate reports monthly

5. **Optimization**
   - Act on risk advisor recommendations
   - Implement performance coach suggestions
   - Follow operations manager allocation decisions

## Performance Metrics

### Consolidated Portfolio
- Total P&L (€ and %)
- Win rate across all trades
- Profit factor
- Drawdown analysis
- Account correlation

### Per-Account
- Individual P&L
- Win/loss statistics
- Average trade size
- Best/worst trade
- Consistency metrics

## Customization

### Alert Thresholds
Modify in account settings:
- Max drawdown percentage
- Profit targets
- Price alert levels

### Team Specialists
Customize specialist roles and responsibilities by editing `/api/team` responses

### Report Format
Customize HTML export by modifying `ReportsPanel.tsx`

## Future Enhancements

- [ ] Advanced 3D isometric office visualization
- [ ] Integration with MT5/MT4 for auto-trading
- [ ] Machine learning for pattern recognition
- [ ] Discord/Telegram bot alerts
- [ ] Mobile app for on-the-go monitoring
- [ ] Advanced charting with TradingView
- [ ] Risk heat maps
- [ ] Advanced correlation analysis
- [ ] Backtesting engine
- [ ] Strategy optimization

## Support

For issues or questions about the professional system, check:
1. This documentation
2. API endpoint documentation
3. Component source code comments
4. Error messages in browser console

## License

Part of the Trading Journal Professional Edition
