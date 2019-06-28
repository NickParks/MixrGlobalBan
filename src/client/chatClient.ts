import * as request from "request";
import WebSocket from 'ws';
import { UserUpdate, User } from "../types/UserEvents";
import { BanHandler } from "./banHandler";

import { logger } from "../util/logger";

export default class ChatClient {
    public channelIds: Array<number>;
    private chatSockets: Array<WebSocket>;
    public bans: Map<number, Array<number>>;

    private banHandler: BanHandler;

    public accessToken: string;

    constructor(accessToken: string) {
        this.channelIds = new Array();
        this.chatSockets = new Array();
        this.bans = new Map();

        this.accessToken = accessToken;

        this.banHandler = new BanHandler(this);
    }

    connectToChannel(channelId: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (this.isChannelMonitored(channelId)) {
                return reject({
                    error: false,
                    reason: "Channel already being monitored"
                });
            }

            //Push the channel to the list of monitored channels
            this.channelIds.push(channelId);

            let options = {
                url: `https://mixer.com/api/v1/chats/${channelId}`,
                headers: {
                    'User-Agent': 'GlobalBanBot v0.1',
                    'Authorization': 'Bearer ' + this.accessToken
                }
            }

            //Make request to chat endpoint
            request.get(options, (error, response, body) => {
                if (error) {
                    this.channelIds.splice(this.channelIds.indexOf(channelId), 1);
                    return reject({
                        error: true,
                        reason: error
                    });
                }

                if (response.statusCode == 200) {
                    let data = JSON.parse(response.body);

                    let chatToken = data.authkey;

                    if (data.endpoints == undefined || data.endpoints == null) {
                        this.channelIds.splice(this.channelIds.indexOf(channelId), 1);
                        return reject({
                            error: true,
                            reason: "Endpoints not found"
                        });
                    }

                    let chatClient = new WebSocket(data.endpoints[0]);

                    chatClient.on('open', () => {
                        logger.info(`Chat Socket opened on ${channelId}`);
                        this.chatSockets.push(chatClient);
                        return resolve(true);
                    });

                    chatClient.on('error', (error: Error) => {
                        this.channelIds.splice(this.channelIds.indexOf(channelId), 1);
                        this.chatSockets.splice(this.chatSockets.indexOf(chatClient), 1);
                        logger.error(error);
                    });

                    chatClient.on('message', (rawData: any) => {
                        let data = JSON.parse(rawData);
                        if (data.type == "event") {
                            //Our Welcome event so we can authenticate
                            if (data.event == "WelcomeEvent") {
                                chatClient.send(JSON.stringify({
                                    "type": "method",
                                    "method": "auth",
                                    "arguments": [channelId, 74617032, chatToken],
                                    "id": 0
                                }));
                            }

                            if (data.event == "UserUpdate") {
                                let updateEvent: UserUpdate = {
                                    user: {
                                        id: data.data.user,
                                        token: data.data.username //Doesn't actually get sent down even tho the docs say they do
                                    },
                                    channel: channelId,
                                    roles: data.data.roles,
                                    permissions: data.data.permissions // Also not sent down but the docs say it is
                                }

                                if (updateEvent.roles.indexOf("Banned") != -1) {
                                    let channelBans = this.bans.get(channelId);

                                    logger.info(`${updateEvent.user.id} has been banned in ${channelId}`)

                                    if (channelBans == null) {
                                        this.bans.set(channelId, [updateEvent.user.id]);
                                    } else {
                                        if (channelBans.indexOf(updateEvent.user.id) != -1) {
                                            logger.info(`User ${updateEvent.user.id} already banned in ${channelId}`)
                                        } else {
                                            channelBans.push(updateEvent.user.id);
                                        }
                                    }
                                }
                            }
                        }
                    });

                } else {
                    this.channelIds.splice(this.channelIds.indexOf(channelId), 1);
                    return reject({
                        error: true,
                        reason: "Response status: " + response.statusCode
                    });
                }
            });
        });
    }

    /**
     * Sends the ban command across every active chat socket
     *
     * @param {number} userId
     * @memberof ChatClient
     */
    broadcastBan(userId: number) {
        this.chatSockets.forEach((socket) => {
            socket.send(JSON.stringify({
                "type": "method",
                "method": "msg",
                "arguments": [`/ban ${userId}`],
                "id": 2
            }));
        });
    }

    /**
     * Checks if a channel already is in our list
     *
     * @param {number} channelId The channel ID
     * @returns {boolean}
     * @memberof ChatClient
     */
    isChannelMonitored(channelId: number): boolean {
        return this.channelIds.indexOf(channelId) == -1 ? false : true;
    }
}