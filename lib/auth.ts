import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'udharwale-custom-aes-256-secret-key-32chars!';

/**
 * Hash a plain text password with a random salt using PBKDF2 (SHA-512)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plain text password against a stored hash
 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, originalHash] = stored.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  } catch (e) {
    return false;
  }
}

/**
 * Encrypt a payload into an AES-256-CBC session token
 */
export function signToken(payload: any): string {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days expiration
  });
  
  const iv = crypto.randomBytes(16);
  // scryptSync derives a 32-byte key from the SECRET string
  const key = crypto.scryptSync(SECRET, 'udharwale-salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt and verify an AES-256-CBC session token
 */
export function verifyToken(token: string): any | null {
  try {
    const [ivHex, encrypted] = token.split(':');
    if (!ivHex || !encrypted) return null;
    
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(SECRET, 'udharwale-salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const payload = JSON.parse(decrypted);
    if (!payload.exp || payload.exp < Date.now()) {
      return null; // Expired
    }
    
    return payload;
  } catch (err) {
    return null; // Invalid token
  }
}
