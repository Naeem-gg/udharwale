const fs = require('fs');

function patch() {
  let code = fs.readFileSync('app/components/Dashboard.tsx', 'utf8');

  // 1. Add state variable
  code = code.replace(
    /const \[isAddContactOpen, setIsAddContactOpen\] = useState\(false\);/,
    `const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);`
  );

  // 2. Add handleEditContactSubmit right below handleAddContactSubmit
  const addContactFuncRegex = /const handleAddContactSubmit = async \([\s\S]*?\} catch \(err\) \{[\s\S]*?\}\n  \};/;
  
  const editContactFunc = `
  const handleEditContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId || !contactName.trim() || !contactPhone.trim()) return;

    try {
      const res = await fetch(\`/api/contacts/\${selectedContactId}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName.trim(),
          phone: contactPhone.trim(),
          email: contactEmail.trim() || undefined,
        }),
      });

      if (res.ok) {
        const updatedContact = await res.json();
        const updatedContacts = contacts.map(c => 
          c.id === selectedContactId ? { ...c, name: updatedContact.name, phone: updatedContact.phone, email: updatedContact.email } : c
        );
        saveContactsState(updatedContacts);
        setIsEditContactOpen(false);
        showToast('Contact updated successfully', 'success');
      } else {
        const errorData = await res.json();
        alert(\`Failed to update contact: \${errorData.error || 'Server error'}\`);
      }
    } catch (err) {
      console.error('Error updating contact:', err);
      alert('An error occurred while communicating with the database.');
    }
  };`;

  code = code.replace(addContactFuncRegex, match => match + '\n' + editContactFunc);

  // 3. Add Edit Contact button in the menu
  const menuDeleteBtnRegex = /<button onClick=\{\(\) => \{ setIsContactMenuOpen\(false\); handleDeleteContact\(selectedContact\.id\); \}\}/;
  const menuEditBtn = `<button onClick={() => { 
                                        setIsContactMenuOpen(false); 
                                        setContactName(selectedContact.name);
                                        setContactPhone(selectedContact.phone);
                                        setContactEmail(selectedContact.email || '');
                                        setIsEditContactOpen(true);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors"
                                      style={{ color: 'var(--text-primary)' }}
                                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)'}
                                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      Edit Contact
                                    </button>
                                    `;
  code = code.replace(menuDeleteBtnRegex, menuEditBtn + '\n' + menuDeleteBtnRegex.source.replace(/\\/g, ''));
  // Wait, menuDeleteBtnRegex.source is a string of the regex. I should just use replace with a match function.
  // Actually let's re-do the replace properly.
  
  code = code.replace(/<button onClick=\{\(\) => \{ setIsContactMenuOpen\(false\); handleDeleteContact\(selectedContact\.id\); \}\}/, 
    match => menuEditBtn + match
  );

  // 4. Add the Edit Contact Modal UI
  // We can just find the Add Contact Modal and clone it for Edit Contact
  const addContactModalRegex = /\{isAddContactOpen && \([\s\S]*?<\!-- END ADD CONTACT MODAL -->/g;
  // Wait, I don't have <!-- END ADD CONTACT MODAL -->
  // I will just append the Edit Contact Modal before the final `</div>` of the component.
  
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

  // Insert before the last closing div
  code = code.replace(/    <\/div>\s*<\/div>\s*\)\;\s*\}\s*export default Dashboard/g, match => editContactModalHtml + '\n' + match);
  code = code.replace(/    <\/div>\s*<\/div>\s*<\/div>\s*\)\;\s*\}\s*export default Dashboard/g, match => editContactModalHtml + '\n' + match);
  code = code.replace(/  <\/div>\s*\)\;\s*\}/g, match => editContactModalHtml + '\n' + match);
  
  fs.writeFileSync('app/components/Dashboard.tsx', code, 'utf8');
}
patch();
