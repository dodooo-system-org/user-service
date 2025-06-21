import * as crypto from 'crypto';

export class EncryptionHelper {
    /**
     * Encrypts a given text using the specified algorithm and secret key.
     * The encrypted data is returned as a string with the IV prepended.
     *
     * @param text - The text to encrypt.
     * @param algorithm - The encryption algorithm to use (e.g., 'aes-256-gcm').
     * @param secretKey - The secret key for encryption, must be of appropriate length for the algorithm.
     * @returns The encrypted text with IV prepended, separated by ':'.
     */
    public static encode(text: string, algorithm: crypto.CipherGCMTypes, secretKey: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // For GCM mode, get the auth tag
        const authTag = cipher.getAuthTag ? cipher.getAuthTag().toString('hex') : '';
        // Store as iv:encrypted:authTag (authTag may be empty for non-GCM)
        return [iv.toString('hex'), encrypted, authTag].join(':');
    }

    /**
     * Decrypts a given encrypted string using the specified algorithm and secret key.
     * The encrypted data must be in the format 'IV:encryptedData'.
     *
     * @param encryptedData - The encrypted text with IV prepended, separated by ':'.
     * @param algorithm - The encryption algorithm to use (e.g., 'aes-256-gcm').
     * @param secretKey - The secret key for decryption, must be of appropriate length for the algorithm.
     * @returns The decrypted text.
     */
    public static decode(encryptedData: string, algorithm: crypto.CipherGCMTypes, secretKey: string): string {
        const [iv, realEncrypted, authTag] = encryptedData.split(':');
        const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(iv, 'hex'));
        // For GCM mode, set the auth tag if present
        if (authTag && decipher.setAuthTag) {
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        }
        let decrypted = decipher.update(realEncrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
