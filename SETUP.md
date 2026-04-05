# 🤖 Discord Bot Setup Guide

This guide walks you through properly adding the bot to your Discord server. Follow each step carefully — most "bot added but doesn't appear" issues are caused by an invalid token, missing OAuth2 scopes, or the bot not running.

---

## 1. Bot Token Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and give it a name
3. In the left sidebar, go to **Bot**
4. Click **Add Bot** and confirm
5. Under the **Token** section, click **Reset Token** (or **Copy** if shown)
6. Copy the **TOKEN** — this is not the same as the Client ID
7. Set the `DISCORD_TOKEN` environment variable to this token

> ⚠️ Never share your bot token. If it is ever exposed, regenerate it immediately in the Developer Portal and update your environment variable.

---

## 2. Get Your Client ID

1. In the Developer Portal, select your application
2. Go to **General Information** in the left sidebar
3. Copy the **Application ID** — this is your Client ID
4. Set the `CLIENT_ID` environment variable to this value

---

## 3. Enable Required Intents

1. In the Developer Portal, go to **Bot**
2. Scroll down to **Privileged Gateway Intents**
3. Enable the following:
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
4. Click **Save Changes**

> ⚠️ Without these intents, the bot will fail to start or behave incorrectly.

---

## 4. Create the Correct Invite Link

Use the following URL to invite the bot to your server. Replace `YOUR_CLIENT_ID` with the Application ID copied in Step 2:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

- `permissions=8` grants **Administrator** access
- `scope=bot%20applications.commands` ensures slash commands are registered in the server

> ℹ️ Using an invite link that is missing `applications.commands` is the most common reason slash commands don't appear after adding the bot.

---

## 5. Verify the Bot is Running

After deploying, check your Railway deployment logs. You should see a line like:

```
✅ Logged in as Bank Trade#7148
```

If this line does not appear, the bot token is invalid or the service failed to start. Check the logs for error messages.

---

## 6. Troubleshooting

### Bot added but doesn't appear online or commands are missing

1. **Regenerate the bot token** in the Discord Developer Portal (Bot → Reset Token)
2. **Update `DISCORD_TOKEN`** in your Railway environment variables with the new token
3. **Redeploy the service** in Railway
4. **Re-invite the bot** using the invite link from Step 4 (remove the old bot from the server first if needed)

### Slash commands not showing up

- Make sure the invite link includes `scope=bot%20applications.commands`
- Run the deploy script to register commands:
  ```bash
  npm run deploy
  ```
- Guild-specific commands appear instantly; global commands can take up to 1 hour

### Bot token errors on startup

- Confirm you copied the **Token** from the Bot page, not the Client Secret or Client ID
- Tokens look like: `MTExMTEx...` (a long string with dots)
- If in doubt, reset the token and update your environment variable

### MongoDB connection errors

- Verify `MONGODB_URI` is set correctly in your environment variables
- For Atlas, ensure your IP address (or `0.0.0.0/0`) is whitelisted in Network Access

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ Yes | Bot token from the Developer Portal (Bot page) |
| `CLIENT_ID` | ✅ Yes | Application ID from General Information |
| `MONGODB_URI` | ✅ Yes | MongoDB connection string |
| `GUILD_ID` | No | Guild ID for instant slash command updates during testing |
| `ADMIN_ROLE_ID` | No | Role ID that grants access to admin commands |
| `LOG_CHANNEL_ID` | No | Channel ID for admin action logs |
| `BOT_VERSION` | No | Version string shown in `/botinfo` |
| `DEVELOPER` | No | Developer name shown in `/botinfo` |
