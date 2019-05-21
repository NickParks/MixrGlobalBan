import ChatClient from "./client/chatClient";

import * as request from 'request';
import { OAuthHandler } from "./auth/oauthHandler";

export default class ChatTracker {
    public ChatClient: ChatClient;

    public OAuthHandler: OAuthHandler;

    constructor() {
        this.OAuthHandler = new OAuthHandler();

        this.start();
    }

    async start() {
        console.log(`[App] Starting chat tracking service`);

        let tokens = await this.OAuthHandler.attempt();

        this.ChatClient = new ChatClient(tokens.data.accessToken);

        this.grabNewChannels();

        setInterval(() => {
            this.grabNewChannels();
        }, 1000 * 60 * 5);
    }

    addChannelToClient(channelId: number) {
        this.ChatClient.connectToChannel(channelId).then((result) => { }).catch((err) => {
            if (err.error == true) {
                console.error(err.reason);
            } else {
                console.error(`[App] Error: `, err.reason);
            }
        });
    }

    grabNewChannels(page = 0) {
        console.log(`[App] Grabbing partners on page ${page}`);
        let options = {
            url: `https://mixer.com/api/v1/channels?where=partnered:eq:true&limit=100&fields=id,token&page=${page}`,
            headers: {
                'User-Agent': 'GlobalBanBot v0.1',
                'Authorization': 'Bearer ' + this.OAuthHandler.accessToken
            }
        }

        request.get(options, (error, response, request) => {
            if (error) {
                console.error(`[App] Request hit an error`, error);
                return;
            }

            if (response.statusCode == 200) {
                let channels = JSON.parse(response.body);

                channels.forEach((channel: { id: number, token: string }) => {
                    this.addChannelToClient(channel.id);
                });

                if (channels.length == 100) {
                    this.grabNewChannels(page + 1);
                }
            }
        })
    }

}