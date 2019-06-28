# MixrGlobalBans
A very basic test of how a global banning system on Mixer.com would work

# What it does
This project aims to counter mass spam and known bad accounts across Mixer. Essentially, if an account gets banned in enough channels it's marked as a bad channel and our system will ban them across the other authenticated channels.

# How to build locally
1. Run `npm i` when first installing
2. Setup `.env` correctly with the format listed below.
3. Run `npm run start` and it will compile and then run
4. Auth using the generated shortcode

# Setting up enviroment
Create a `.env` file in the root directly with the following structure:
```
VERSION=
CLIENT_ID=
```
