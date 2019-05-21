export interface UserUpdate {
    user: User;
    channel: number;
    roles: Array<string>;
    permissions: Array<any>;
}

export interface User {
    id: number;
    token: string;
}

export interface BannedUser extends User {
    bans: number;
}