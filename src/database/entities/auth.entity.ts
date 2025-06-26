import { UUID } from 'crypto';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from './base.entity';

export enum AuthStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
    DELETED = 'deleted',
}

export enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
}

@Entity({ name: 'auths', comment: 'Authentication details of users' })
export class AuthEntity extends BaseEntity {
    @PrimaryGeneratedColumn('uuid', {
        name: 'auth_id',
    })
    readonly authId: UUID;

    @Column({
        name: 'username',
        type: 'varchar',
        unique: true,
        nullable: true,
    })
    readonly username: string;

    @Index({ unique: true })
    @Column({ name: 'email', type: 'varchar', unique: true, nullable: false })
    readonly email: string;

    @Column({ name: 'password', type: 'varchar', nullable: false })
    readonly password: string;

    @Column({ name: 'status', enum: AuthStatus, default: AuthStatus.INACTIVE, nullable: false })
    readonly status: AuthStatus;

    @Column({ name: 'role', type: 'enum', enum: UserRole, default: UserRole.USER })
    readonly role: UserRole;

    @Column({
        name: 'last_login',
        type: 'timestamp with time zone',
        nullable: true,
    })
    readonly lastLogin: Date | null;
}
