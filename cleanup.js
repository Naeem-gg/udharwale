const fs = require('fs');

function cleanup() {
  let code = fs.readFileSync('app/components/Dashboard.tsx', 'utf8');

  // The modal starts with {/* ── EDIT CONTACT MODAL ───────────────────────── */}
  // and ends with </div> </div> )} (with some spaces)

  // Find all instances of the modal block
  const modalRegex = /\s*\{\/\* ── EDIT CONTACT MODAL ───────────────────────── \*\/\}[\s\S]*?isEditContactOpen && \([\s\S]*?<\/div>\s*<\/div>\s*\)\}/g;
  
  const matches = [...code.matchAll(modalRegex)];
  
  if (matches.length > 1) {
    // Keep the last match, remove all others
    const lastMatchIndex = matches[matches.length - 1].index;
    const lastMatchString = matches[matches.length - 1][0];

    // Remove all of them globally
    let cleanCode = code.replace(modalRegex, '');
    
    // Now just insert it right before the last closing </div> in the component
    // Let's just find `  </div>\n  );\n}\n\nexport default Dashboard;`
    // Or we can just stick it at the very end.
    
    const insertionPoint = /\s*<\/div>\s*\)\;\s*\}\s*export default Dashboard/g;
    cleanCode = cleanCode.replace(insertionPoint, match => lastMatchString + '\n' + match);

    fs.writeFileSync('app/components/Dashboard.tsx', cleanCode, 'utf8');
    console.log(`Removed ${matches.length - 1} duplicate modals.`);
  } else {
    console.log("No duplicates found, or regex failed.");
  }
}

cleanup();
