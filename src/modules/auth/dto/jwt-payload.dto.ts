import { UUID } from 'crypto';

export interface JwtPayload {
    iss: string; // Issuer
    sub: UUID; // Subject (usually user ID or auth ID)
    email: string;
    jwtId?: UUID; // Optional JWT ID for tracking
}

export interface TokenResponse {
    token: string;
    expiresIn: number; // Expiration time in ms
    jwtId?: UUID; // Optional JWT ID for tracking
}
