import { compare, hash } from 'bcrypt';

export class AuthHelper {
    private static readonly saltRounds = 11;

    static async hashText(text: string): Promise<string> {
        return await hash(text, this.saltRounds);
    }

    static async compareHashedText(text: string, hashedText: string): Promise<boolean> {
        return await compare(text, hashedText);
    }
}
