const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const axios = require("axios");
const mongoose = require("mongoose");
const User = require("./User");
mongoose
  .connect(`${process.env.DB_URL}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
  .then(() => console.log("DB connected"))
  .catch((error) => console.log(error));

const token = process.env.TELEGRAM_BOT_TOKEN;

var cron = require("node-cron");

const moment = require("moment");

//console.log(date, dateTomorrow, dateDATomorrow);
// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

//var centerList = "";
//available slot will append here
let slots = [];

//available block to a user
const block = ["pinarayi", "panoor", "chittariparamba"];

//available age group

const ageGroup = ["18+", "40+", "45+", "All age group"];

async function getSlot(reqDate, chatId, blockData, userAge) {
  try {
    // handle success
    const response = await axios.get(
      `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/findByDistrict?district_id=297&date=${reqDate}`
    );
    if (response.data.length !== 0) {
      slots = response.data.sessions;
      var userBlocks = blockData;
      //console.log(userBlocks);
      slots.map((items) => {
        if (
          userBlocks.includes(items.block_name) &&
          items.available_capacity !== 0 &&
          (userAge === 0 ? true : items.min_age_limit === userAge)
        ) {
          var CurrentDate = moment().utcOffset("+05:30");
          var message = `<b>${items.name}</b> \nAge:${items.min_age_limit} -> ${items.date}\n ${items.vaccine}  ▶${items.available_capacity} \nhttps://selfregistration.cowin.gov.in/`;
          bot
            .sendMessage(chatId, message, { parse_mode: "HTML" })
            .then(() =>
              console.log("message sent to ", chatId, "@", CurrentDate)
            )
            .catch(() => console.log("User not found/ user blocked the bot"));
          //centerList = centerList + `<b>->${items.name} ${items.date}</b>\n`;
          //console.log("message send");
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
}
//for cron job
cron.schedule("* * * * *", async () => {
  //console.log("running a task every minute");
  const date = moment().utcOffset("+05:30").format("DD-MM-YYYY");
  const dateTomorrow = moment()
    .add(1, "days")
    .utcOffset("+05:30")
    .format("DD-MM-YYYY");
  const dateDATomorrow = moment()
    .add(2, "days")
    .utcOffset("+05:30")
    .format("DD-MM-YYYY");
  const dateDATT = moment()
    .add(3, "days")
    .utcOffset("+05:30")
    .format("DD-MM-YYYY");
  users = await User.find({ notify: true }).exec();
  users.map(async (eachUser) => {
    //console.log(eachUser.id);
    if (eachUser.serverDown) {
      bot.sendMessage(
        eachUser.id,
        "<b>Server under maintenance, will be back within few minutes :)</b>",
        { parse_mode: "HTML" }
      );
    } else {
      //centerList = "";
      await getSlot(date, eachUser.id, eachUser.blockData, eachUser.age);
      await getSlot(
        dateTomorrow,
        eachUser.id,
        eachUser.blockData,
        eachUser.age
      );
      await getSlot(
        dateDATomorrow,
        eachUser.id,
        eachUser.blockData,
        eachUser.age
      );
      await getSlot(dateDATT, eachUser.id, eachUser.blockData, eachUser.age);
      // if (centerList.length > 0) {
      //   bot.sendMessage(eachUser.id, centerList, { parse_mode: "HTML" });
      //   var CurrentDate = moment();
      //   console.log("message sent @", CurrentDate);
      // }
      if (eachUser.version) {
        bot.sendMessage(
          eachUser.id,
          "<b>New update available(bug fixed), update your bot to get latest features by entering /start :)</b>",
          { parse_mode: "HTML" }
        );
      }
    }
  });
});
//Block name to original format
const updateData = (chatId, str, age) => {
  const options = {
    new: true,
    upsert: true,
  };
  if (!age) {
    var splitStr = str.toLowerCase().split(" ");
    for (var i = 0; i < splitStr.length; i++) {
      // You do not need to check if i is larger than splitStr length, as your for does that for you
      // Assign it back to the array
      splitStr[i] =
        splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
    }
    // Directly return the joined string
    var finalString = splitStr.join(" ");

    User.findOneAndUpdate(
      { id: chatId },
      { $addToSet: { blockData: finalString } },
      options,
      (err, user) => {
        if (err || !user) {
          console.log("DB error while creating user");
        } else {
          console.log(user);
        }
      }
    );
  } else {
    User.findOneAndUpdate(
      { id: chatId },
      { age: parseInt(str), notify: true, serverDown: false, version: false },
      options,
      (err, user) => {
        if (err || !user) {
          console.log("DB error while creating user");
        } else {
          console.log(user);
        }
      }
    );
  }
  //userBlocks.push(finalString);
};

// Listen for any kind of message. There are different kinds of
// messages.
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  if (msg.text.toString().toLowerCase() === "/start") {
    const resp =
      "Enter your block name\nAvailable Block are mentioned in bellow pdf\nIf want to add more block/district just message @akshay_vinod468";

    (async () => {
      await bot.sendMessage(chatId, resp, {
        reply_markup: {
          keyboard: [block],
        },
      });
      await bot.sendDocument(chatId, "Block_List.pdf");
      bot.sendMessage(chatId, "You can add multiple block name");
    })();
  } else if (block.includes(msg.text.toString().toLowerCase())) {
    (async () => {
      await updateData(chatId, msg.text.toString(), false);
      await bot.sendMessage(
        chatId,
        `${msg.text.toString()} added to block list`
      );
      bot.sendMessage(chatId, "Which age group do prefer to get notified?", {
        reply_markup: {
          keyboard: [ageGroup, block],
        },
      });
    })();
  } else if (ageGroup.includes(msg.text.toString())) {
    //console.log(reqAge);
    (async () => {
      await updateData(
        chatId,
        msg.text.toString() === "All age group"
          ? "0"
          : msg.text.toString().replace("+", ""),
        true
      );
      await bot.sendMessage(chatId, `Updated age:${msg.text.toString()}`);
      bot.sendMessage(chatId, "Available slot will be notified :)");
    })();
  } else {
    bot.sendMessage(
      chatId,
      "Invalid Block Name\n<b>Available Block are mentioned in bellow pdf</b>",
      { parse_mode: "HTML" }
    );
    bot.sendDocument(chatId, "Block List.pdf");
  }
});
