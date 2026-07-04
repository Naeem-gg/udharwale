const fs = require('fs');

function fix() {
  let dbCode = fs.readFileSync('app/components/Dashboard.tsx', 'utf8');

  // Fix Settle flow
  const settleFuncRegex = /const handleSettleFullBalance = async \(\) => \{[\s\S]*?(?=const handleWhatsAppReminder = \(\) => \{)/;
  dbCode = dbCode.replace(settleFuncRegex,
`const handleSettleFullBalance = async () => {
    if (!selectedContact) return;
    const balance = getContactBalance(selectedContact);
    if (balance === 0) return;

    const settleAmount = Math.abs(balance);
    const settleType = balance > 0 ? 'got' : 'gave';
    
    setTxAmount(settleAmount.toString());
    setTxType(settleType);
    setTxRemark('🤝 Settlement');
    setTxMode('Cash');
    setTxDate(new Date().toISOString().split('T')[0]);
    setEditingTransaction(null);
    setIsAddTransactionOpen(true);
  };

  // --- Share Ledger Template on WhatsApp ---
  `);

  // Branding component replacement
  const brandingHtml = `<div className="flex flex-col">
                <span className="font-black text-lg tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>Udharwale</span>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">By Naeem Navjivan</span>
              </div>`;

  dbCode = dbCode.replace(/<h1 className="font-black text-sm tracking-tight" style=\{\{ color: 'var\(--text-primary\)' \}\}>Udharwale by Naeem Navjivan<\/h1>/g, brandingHtml);
  dbCode = dbCode.replace(/<h1 className="font-black text-sm tracking-tight" style=\{\{ color: 'var\(--text-primary\)' \}\}>UdharWale<\/h1>/g, brandingHtml);

  // Fix known emoji corruptions from PowerShell Set-Content
  dbCode = dbCode.replace(/\?\? Fully Settled Account Balance/g, '🤝 Fully Settled Account Balance');
  dbCode = dbCode.replace(/\?\? I GOT \(Borrowed\)/g, '👇 I GOT (Borrowed)');
  dbCode = dbCode.replace(/\?\? I GAVE \(Lent\)/g, '👆 I GAVE (Lent)');
  dbCode = dbCode.replace(/\?\? Only What You Gave/g, '👆 Only What You Gave');
  dbCode = dbCode.replace(/\?\? Only What You Got/g, '👇 Only What You Got');
  dbCode = dbCode.replace(/'\?\?'/g, "'🏷️'");
  dbCode = dbCode.replace(/>\?\?</g, ">➕<");

  fs.writeFileSync('app/components/Dashboard.tsx', dbCode, 'utf8');
  
  // Page.tsx branding
  let pageCode = fs.readFileSync('app/page.tsx', 'utf8');
  pageCode = pageCode.replace(
    /Udharwale by Naeem Navjivan/,
    `<div className="flex flex-col items-center gap-0.5">
                <span className="font-black text-lg tracking-tight leading-none text-white">Udharwale</span>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">By Naeem Navjivan</span>
              </div>`
  );
  fs.writeFileSync('app/page.tsx', pageCode, 'utf8');

  // Login page branding
  let loginCode = fs.readFileSync('app/login/page.tsx', 'utf8');
  loginCode = loginCode.replace(
    /<h1 className="text-2xl font-black tracking-tight" style=\{\{ color: 'var\(--text-primary\)' \}\}>\s*Udharwale by Naeem Navjivan\s*<\/h1>/,
    `<div className="flex flex-col items-center">
            <span className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Udharwale</span>
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mt-1">By Naeem Navjivan</span>
          </div>`
  );
  fs.writeFileSync('app/login/page.tsx', loginCode, 'utf8');

  // Signup page branding
  let signupCode = fs.readFileSync('app/signup/page.tsx', 'utf8');
  signupCode = signupCode.replace(
    /<h1 className="text-2xl font-black tracking-tight" style=\{\{ color: 'var\(--text-primary\)' \}\}>Udharwale by Naeem Navjivan<\/h1>/,
    `<div className="flex flex-col items-center">
            <span className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Udharwale</span>
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mt-1">By Naeem Navjivan</span>
          </div>`
  );
  fs.writeFileSync('app/signup/page.tsx', signupCode, 'utf8');
}
fix();
