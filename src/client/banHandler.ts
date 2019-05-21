import { setInterval } from "timers";
import ChatClient from "./chatClient";

export class BanHandler {
    private globalBanned: Array<number>;
    private chatClient: ChatClient;

    constructor(chatClient: ChatClient) {
        this.globalBanned = new Array();

        this.chatClient = chatClient;

        setInterval(() => {
            this.checkNewBans();
        }, 1000 * 60);
    }

    checkNewBans() {
        let totalChannels = this.chatClient.channelIds.length; //Gets total channels
        let totalBans = new Map<number, number>();

        this.chatClient.bans.forEach((userIds, channelId) => {
            userIds.forEach((user) => {
                let userBans = totalBans.get(user);

                if (userBans == null) {
                    totalBans.set(user, 1);
                    console.log(`[BanHandler] Setting ${user} to ${1}`);
                } else {
                    totalBans.set(user, totalBans.get(user) + 1);
                    console.log(`[BanHandler] Setting ${user} to ${totalBans.get(user)}`);
                }
            });
        });

        totalBans.forEach((bans, userId) => {
            let banPercenet: number = ((bans / totalChannels) * 100);
            console.log(`[Output] User ${userId} has ${bans} out of ${totalChannels} for %${banPercenet.toFixed(2)}`);

            if (banPercenet >= 30.00) {
                //User is banned in 30% or more of channels, ban them globally
                this.globalBanned.push(userId);
                this.chatClient.broadcastBan(userId);
            }
        });
    }
}