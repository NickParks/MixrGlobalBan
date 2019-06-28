import ChatClient from "./client/chatClient";

import * as request from 'request';
import { OAuthHandler } from "./auth/oauthHandler";

import { logger } from "./util/logger";

export default class ChatTracker {
    public ChatClient: ChatClient;

    public OAuthHandler: OAuthHandler;

    constructor() {
        this.OAuthHandler = new OAuthHandler();

        this.start();
    }

    async start() {
        logger.info("Starting chat tracking");

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
                logger.error(err);
            } else {
                // This isn't an actual error being thrown, instead it's a reject from the promise
                // If the channel is already being monitored. Should be changed later
                logger.info(err);
            }
        });
    }

    grabNewChannels(page = 0, requestFail?: boolean) {
        logger.info(`Grabbing partners on page ${page}`);
        let options = {
            url: `https://mixer.com/api/v1/channels?where=partnered:eq:true&limit=100&fields=id,token&page=${page}`,
            headers: {
                'User-Agent': `MixBans v${process.env.VERSION}`,
                'Authorization': 'Bearer ' + this.OAuthHandler.accessToken
            }
        }

        request.get(options, (error, response, request) => {
            if (error) {
                logger.error(error);
                this.grabNewChannels(page, true); //Recursive the same call but with the failed argument passed
                return;
            }

            if (response.statusCode == 200) {
                let channels = JSON.parse(response.body);

                channels.forEach((channel: { id: number, token: string }) => {
                    this.addChannelToClient(channel.id);
                });

                if (channels.length == 100) {
                    if (!requestFail) {
                        this.grabNewChannels(page + 1);
                    }
                }
            }
        })
    }

}