import { OAuthClient, ShortCodeError, ShortCodeExpireError, OAuthTokens } from "@mixer/shortcode-oauth";
import { logger } from "../util/logger";
import * as fs from 'fs';
import { post } from 'request';

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
        //Check to see if we have previous tokenss
        return new Promise((resolve, reject) => {
            let fileExist = fs.existsSync('authtokens.json');
            if (fileExist) {
                fs.readFile('authtokens.json', (error, buffer) => {
                    let data = JSON.parse(Buffer.from(buffer).toString());

                    logger.info("Requesting new auth tokens");
                    post('https://mixer.com/api/v1/oauth/token', {
                        headers: {
                            'User-Agent': `MixBans v${process.env.VERSION}`,
                            'Authorization': 'Bearer ' + data.accessToken
                        },
                        form: {
                            grant_type: 'refresh_token',
                            client_id: process.env.CLIENT_ID,
                            refresh_token: data.refreshToken
                        },
                        json: true
                    }, (error, response, body) => {
                        if (error) {
                            logger.error(error);
                            process.exit(0); //Hard quit if there's an error getting new tokens
                        }

                        let newTokens = OAuthTokens.fromTokenResponse(body, ['chat:connect', 'chat:chat']);
                        fs.writeFileSync('authtokens.json', JSON.stringify(newTokens.data));

                        this.accessToken = newTokens.data.accessToken;

                        logger.info("Set new auth tokens");

                        return resolve(newTokens);
                    });
                });

            } else {
                this.client.getCode().then((code) => {
                    logger.info(`Go to https://mixer.com/go?code=${code.code}`);
                    return code.waitForAccept();
                }).then((tokens) => {

                    logger.info(tokens);

                    fs.writeFileSync('authtokens.json', JSON.stringify(tokens.data));

                    this.accessToken = tokens.data.accessToken;

                    return resolve(tokens);
                }).catch((err) => {
                    if (err instanceof ShortCodeExpireError) {
                        return this.attempt();
                    }

                    reject(err);

                    throw err;
                });
            }
        });
    }
}