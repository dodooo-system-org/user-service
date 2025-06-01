import { UUID } from 'crypto';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { AuthEntity } from './auth.entity';
import { BaseEntity } from './base.entity';

@Entity({ name: 'jwts', comment: 'Json web tokens for authentication' })
export class JWTEntity extends BaseEntity {
    @PrimaryColumn('uuid', {
        name: 'jwt_id',
    })
    readonly jwtId: UUID;

    @Column({ name: 'expires_at', type: 'timestamp', nullable: false })
    readonly expiresAt: Date;

    @ManyToOne(() => AuthEntity, (auth) => auth.authId, {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    })
    @JoinColumn({ name: 'auth_id', referencedColumnName: 'authId' })
    auth: AuthEntity;
}
