const fs = require('fs');

function refactor() {
  const lines = fs.readFileSync('app/components/Dashboard.tsx', 'utf8').split('\n');
  const out = [];
  let inCurrencySettings = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Remove Currency state
    if (line.includes('const [currency, setCurrency]')) continue;
    
    // Remove Currency localstorage read
    if (line.includes("const storedCurrency = localStorage.getItem('udhar_currency');")) {
      i += 5; // skip the if block
      continue;
    }

    // Remove handleCurrencyChange
    if (line.includes('const handleCurrencyChange = ')) {
      i += 3; // skip the function block
      continue;
    }
    
    // Skip the Currency Settings block entirely
    if (line.includes('{/* Currency */}')) {
      inCurrencySettings = true;
      continue;
    }
    if (inCurrencySettings && line.includes('{/* Account */}')) {
      inCurrencySettings = false;
    }
    if (inCurrencySettings) continue;

    // Types and variables renaming
    line = line.replace(/CategoryType/g, 'ModeType');
    line = line.replace(/CURRENCIES,\s*CurrencyConfig,\s*/g, '');
    line = line.replace(/CURRENCIES,\s*/g, '');
    line = line.replace(/CurrencyConfig,\s*/g, '');
    line = line.replace(/txDescription/g, 'txRemark');
    line = line.replace(/setTxDescription/g, 'setTxRemark');
    line = line.replace(/txCategory/g, 'txMode');
    line = line.replace(/setTxCategory/g, 'setTxMode');
    line = line.replace(/\.description/g, '.remark');
    line = line.replace(/description:/g, 'remark:');
    line = line.replace(/\.category/g, '.mode');
    line = line.replace(/category:/g, 'mode:');
    
    // Replace {currency.symbol} with ₹
    line = line.replace(/\{currency\.symbol\}/g, '₹');
    line = line.replace(/\$\{currency\.symbol\}/g, '₹');
    
    // Rename UdharWale
    line = line.replace(/UdharWale/g, 'Udharwale by Naeem Navjivan');
    line = line.replace(/Udharwale(?! by Naeem Navjivan)/g, 'Udharwale by Naeem Navjivan');
    
    out.push(line);
  }

  let code = out.join('\n');

  // Fix mode init
  code = code.replace(
    /Food: 0, Shopping: 0, Travel: 0, Rent: 0, Cash: 0, Business: 0, Other: 0/,
    `'Cash': 0, 'Online Transfer': 0`
  );
  
  code = code.replace(
    /mode: 'Other',/,
    `mode: 'Cash',`
  );

  // Replace category options
  code = code.replace(/\{\(\['Cash','Food','Shopping','Travel','Rent','Business','Other'\] as ModeType\[\]\)\.map[\s\S]*?<\/select>/,
`{(['Cash','Online Transfer'] as ModeType[]).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>`);

  // Replace catIcons
  code = code.replace(/const catIcons: Record<ModeType, string> = \{[\s\S]*?\};/, 
`const catIcons: Record<ModeType, string> = {
    'Cash': '💵',
    'Online Transfer': '🏦'
  };`);
  
  code = code.replace(/const catIcons: Record<string, string> = \{[\s\S]*?\};/, 
`const catIcons: Record<string, string> = {
    'Cash': '💵',
    'Online Transfer': '🏦'
  };`);

  // Replace bottom buttons
  const bottomButtonsRegex = /<button onClick=\{\(\) => handleOpenAddTx\('got'\)\}[\s\S]*?<\/button>\s*<button onClick=\{\(\) => handleOpenAddTx\('gave'\)\}[\s\S]*?<\/button>/;
  code = code.replace(bottomButtonsRegex, 
`<button onClick={() => handleOpenAddTx('gave')}
                          className="w-full py-4 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm text-white"
                          style={{ background: 'var(--primary-color)' }}>
                          <span className="text-lg">➕</span>
                          <span>ADD RECORD</span>
                        </button>`);

  // Update settle up function
  const settleFuncRegex = /const handleSettleFullBalance = async \(\) => \{[\s\S]*?(?=const handleShareLedger = async \(\(option)/;
  code = code.replace(settleFuncRegex,
`const handleSettleFullBalance = async () => {
    if (!selectedContact) return;
    const balance = getContactBalance(selectedContact);
    if (balance === 0) return;

    const settleAmount = Math.abs(balance);
    const settleType = balance > 0 ? 'got' : 'gave';
    
    setTxAmount(settleAmount.toString());
    setTxType(settleType);
    setTxRemark('✅ Fully Settled Account Balance');
    setAddTxModalOpen(true);
  };

  `);

  // Replace Insights
  code = code.replace(/const categoryDistribution = useMemo[\s\S]*?(?=const sortedCategories)/,
`const modeDistribution = useMemo(() => {
    const distribution: Record<ModeType, number> = {
      'Cash': 0,
      'Online Transfer': 0
    };
    if (activeTab === 'insights') {
      const allTx = contacts.flatMap(c => c.transactions);
      allTx.forEach(t => {
        if (t.type === 'gave') { // Only tracking what you spent/gave for insights
          distribution[t.mode] += t.amount;
        }
      });
    }
    return distribution;
  }, [contacts, activeTab]);

  `);
  
  code = code.replace(/const sortedCategories = Object\.entries\(categoryDistribution\)[\s\S]*?(?=return \()/,
`const sortedModes = Object.entries(modeDistribution)
    .sort(([, a], [, b]) => b - a)
    .filter(([, v]) => v > 0);

  `);
  
  code = code.replace(/\{sortedCategories\.map\(\(\[cat, amount\]\) => \([\s\S]*?(?=<\/div>\s*<\/div>\s*\{!\(sortedCategories)/,
`{sortedModes.map(([cat, amount]) => (
                  <div key={cat} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-sm font-bold items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{catIcons[cat as ModeType] || '🏷️'}</span>
                        <span style={{ color: 'var(--text-primary)' }}>{cat}</span>
                      </div>
                      <span style={{ color: 'var(--text-primary)' }}>
                        ₹{amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="h-2 rounded-full w-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: \`\${(amount / (stats.totalGave || 1)) * 100}%\`,
                          background: 'var(--primary-color)'
                        }} />
                    </div>
                  </div>
                ))}
              `);
  code = code.replace(/\{\!\(sortedCategories\.length > 0\) &&/, '{!(sortedModes.length > 0) &&');
  code = code.replace(/Category-wise/g, 'Mode-wise');
  code = code.replace(/Spending by Category/g, 'Spending by Mode');

  fs.writeFileSync('app/components/Dashboard.tsx', code, 'utf8');
}

refactor();
