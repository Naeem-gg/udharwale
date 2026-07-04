const fs = require('fs');

function fix() {
  let code = fs.readFileSync('app/components/Dashboard.tsx', 'utf8');

  // 1. Remove the duplicate Edit Contact button
  // We know it is in the menu. Let's find both buttons.
  const duplicateBtnRegex = /<button onClick=\{\(\) => \{\s*setIsContactMenuOpen\(false\);\s*setContactName\(selectedContact\.name\);\s*setContactPhone\(selectedContact\.phone\);\s*setContactEmail\(selectedContact\.email \|\| ''\);\s*setIsEditContactOpen\(true\);\s*\}\}[\s\S]*?Edit Contact\s*<\/button>/g;
  
  const matches = [...code.matchAll(duplicateBtnRegex)];
  if (matches.length > 1) {
    // Replace the first occurrence with empty string to remove the duplicate
    code = code.replace(matches[0][0], '');
    console.log("Removed duplicate button.");
  }

  // 2. Re-insert the Edit Contact Modal
  // Let's make sure it's not already there first
  if (!code.includes('EDIT CONTACT MODAL')) {
    const editContactModalHtml = `
      {/* ── EDIT CONTACT MODAL ───────────────────────── */}
      {isEditContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsEditContactOpen(false)} />
          <div className="relative w-full max-w-sm rounded-3xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            
            <div className="px-5 py-4 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <h3 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>Edit Contact</h3>
              <button onClick={() => setIsEditContactOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto scrollbar-thin">
              <form id="edit-contact-form" onSubmit={handleEditContactSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Name <span className="text-rose-500">*</span></label>
                  <input type="text" required value={contactName} onChange={e => setContactName(e.target.value)}
                    className="input-field w-full" placeholder="e.g. Rahul Sharma" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Phone <span className="text-rose-500">*</span></label>
                  <input type="tel" required value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                    className="input-field w-full" placeholder="e.g. +91 98765 43210" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email <span style={{ opacity: 0.5 }}>(Optional)</span></label>
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                    className="input-field w-full" placeholder="e.g. rahul@example.com" />
                </div>
              </form>
            </div>

            <div className="p-5 shrink-0" style={{ background: 'var(--bg-raised)', borderTop: '1px solid var(--border-soft)' }}>
              <button type="submit" form="edit-contact-form" className="btn-primary w-full shadow-lg shadow-indigo-500/25">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
`;
    // Insert before the last </div>
    const insertionIndex = code.lastIndexOf('</div>');
    if (insertionIndex !== -1) {
      code = code.substring(0, insertionIndex) + editContactModalHtml + code.substring(insertionIndex);
      console.log("Re-inserted modal.");
    }
  }

  fs.writeFileSync('app/components/Dashboard.tsx', code, 'utf8');
}

fix();
