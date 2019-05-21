import { OAuthClient, ShortCodeError, ShortCodeExpireError, OAuthTokens } from "@mixer/shortcode-oauth";

export class OAuthHandler {

    private client: OAuthClient;

    public accessToken: string;

    constructor() {
        this.client = new OAuthClient({
            clientId: process.env.CLIENT_ID,
            scopes: ['chat:connect', 'chat:chat']
        });
    }

    attempt(): Promise<OAuthTokens> {
        return new Promise((resolve, reject) => {
            this.client.getCode().then((code) => {
                console.log(`[OAuth] Go to https://mixer.com/go?code=${code.code}`);
                return code.waitForAccept();
            }).then((tokens) => {

                this.accessToken = tokens.data.accessToken;

                return resolve(tokens);
            }).catch((err) => {
                if (err instanceof ShortCodeExpireError) {
                    return this.attempt();
                }

                reject(err);

                throw err;
            });
        });
    }
}