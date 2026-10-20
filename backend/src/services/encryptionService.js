import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// For AES-256-GCM, the secret key must be exactly 32 bytes (characters) long.
const SECRET_KEY = process.env.ENCRYPTION_SECRET;
const ALGORITHM = 'aes-256-gcm';

if (!SECRET_KEY || SECRET_KEY.length !== 32) {
  console.warn("WARNING: ENCRYPTION_SECRET in .env is missing or not exactly 32 characters. Encryption will fail.");
}

export const encryptKey = (text) => {
  if (!text) return null;
  
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decryptKey = (encryptedData) => {
  if (!encryptedData) return null;
  
  const [ivHex, authTagHex, encryptedText] = encryptedData.split(':');
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    Buffer.from(SECRET_KEY), 
    Buffer.from(ivHex, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};