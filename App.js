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
const block = ["pinarayi", "panoor", "chittariparamba", "azhikode", "iriveri"];
const block1 = ["pinarayi", "panoor", "chittariparamba"];
const block2 = ["azhikode", "iriveri"];

//available age group

const ageGroup = ["18+", "40+", "45+", "All age group"];

async function getSlot(reqDate, chatId, blockData, userAge, userDose, userFee) {
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
          (userAge === 0 ? true : items.min_age_limit === userAge) &&
          (userDose === 0
            ? true
            : userDose === 1
            ? items.available_capacity_dose1 > 0
            : items.available_capacity_dose2 > 0) &&
          (userFee === 0
            ? true
            : userFee === 1
            ? items.fee_type === "Free"
            : items.fee_type === "Paid")
        ) {
          var CurrentDate = moment().utcOffset("+05:30");
          var message = `<b>${items.name}</b> \nAge:${items.min_age_limit}+ -> ${items.date}\n${items.pincode}\n${items.address}\n${items.vaccine}  ▶${items.available_capacity} (${items.fee_type})\nDose 1▶${items.available_capacity_dose1}\nDose 2▶${items.available_capacity_dose2} \nhttps://selfregistration.cowin.gov.in/`;
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
        eachUser.age,
        eachUser.dose,
        eachUser.pay
      );
      await getSlot(
        dateDATomorrow,
        eachUser.id,
        eachUser.blockData,
        eachUser.age,
        eachUser.dose,
        eachUser.pay
      );
      await getSlot(
        dateDATT,
        eachUser.id,
        eachUser.blockData,
        eachUser.age,
        eachUser.dose,
        eachUser.pay
      );
      // if (centerList.length > 0) {
      //   bot.sendMessage(eachUser.id, centerList, { parse_mode: "HTML" });
      //   var CurrentDate = moment();
      //   console.log("message sent @", CurrentDate);
      // }
      if (eachUser.version) {
        bot.sendMessage(
          eachUser.id,
          "<b>Bot Updated - now paid you can choose fee/paid and dose1/dose2</b>",
          { parse_mode: "HTML" }
        );
      }
    }
  });
});
//Block name to original format
const updateData = (
  chatId,
  str,
  age,
  unsubscribe = false,
  subscribe = false,
  dose = false,
  pay = false
) => {
  const options = {
    new: true,
    upsert: true,
  };
  if (unsubscribe) {
    User.findOneAndUpdate(
      { id: chatId },
      { notify: subscribe },
      options,
      (err, user) => {
        if (err || !user) {
          console.log("DB error while creating user");
        } else {
          console.log(user);
        }
      }
    );
  } else if (dose && age) {
    userDose = 0;
    if (str === "dose 1") userDose = 1;
    else if (str === "dose 2") userDose = 2;
    User.findOneAndUpdate(
      { id: chatId },
      { dose: userDose },
      options,
      (err, user) => {
        if (err || !user) {
          console.log("DB error while creating user");
        } else {
          console.log(user);
        }
      }
    );
  } else if (pay && age) {
    userFee = 0;
    if (str === "free") userFee = 1;
    else if (str === "paid") userFee = 2;
    User.findOneAndUpdate(
      { id: chatId },
      { pay: userFee },
      options,
      (err, user) => {
        if (err || !user) {
          console.log("DB error while creating user");
        } else {
          console.log(user);
        }
      }
    );
  } else if (!age) {
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
          keyboard: [block1, block2],
        },
      });
      await bot.sendDocument(chatId, "Block_List.pdf");
      bot.sendMessage(chatId, "You can add multiple block name");
    })();
  } else if (msg.text.toString().toLowerCase() === "⬅blocks") {
    bot.sendMessage(chatId, "Blocks are listed bellow", {
      reply_markup: {
        keyboard: [block1, block2],
      },
    });
  } else if (msg.text.toString().toLowerCase() === "⬅age group") {
    bot.sendMessage(chatId, "Age groups are listed bellow", {
      reply_markup: {
        keyboard: [ageGroup, ["⬅Blocks"], ["Unsubscribe"]],
      },
    });
  } else if (block.includes(msg.text.toString().toLowerCase())) {
    (async () => {
      await updateData(chatId, msg.text.toString(), false);
      await bot.sendMessage(
        chatId,
        `${msg.text.toString()} added to block list`
      );
      bot.sendMessage(chatId, "Which age group do prefer to get notified?", {
        reply_markup: {
          keyboard: [ageGroup, ["⬅Blocks"], ["Unsubscribe"]],
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
      bot.sendMessage(chatId, "You can customize free/paid and dosage", {
        reply_markup: {
          keyboard: [
            ["Dose 1", "Dose 2", "D1 & D2"],
            ["free", "paid", "free & paid"],
            ["⬅Age Group"],
            ["Unsubscribe"],
          ],
        },
      });
    })();
  } else if (
    msg.text.toString().toLowerCase() === "dose 1" ||
    msg.text.toString().toLowerCase() === "dose 2" ||
    msg.text.toString().toLowerCase() === "d1 & d2"
  ) {
    (async () => {
      await updateData(
        chatId,
        msg.text.toString().toLowerCase(),
        true,
        false,
        false,
        true,
        false
      );
      bot.sendMessage(chatId, "Dose selected.");
      bot.sendMessage(chatId, "Select your fee type");
    })();
  } else if (
    msg.text.toString().toLowerCase() === "free" ||
    msg.text.toString().toLowerCase() === "paid" ||
    msg.text.toString().toLowerCase() === "free & paid"
  ) {
    (async () => {
      await updateData(
        chatId,
        msg.text.toString().toLowerCase(),
        true,
        false,
        false,
        false,
        true
      );
      bot.sendMessage(chatId, "Fee Type selected.");
    })();
  } else if (msg.text.toString().toLowerCase() === "unsubscribe") {
    (async () => {
      await updateData(chatId, undefined, undefined, true);
      bot.sendMessage(chatId, "Unsubscribed :)", {
        reply_markup: {
          keyboard: [["Subscribe"]],
        },
      });
    })();
  } else if (msg.text.toString().toLowerCase() === "subscribe") {
    (async () => {
      await updateData(chatId, undefined, undefined, true, true);
      bot.sendMessage(chatId, "Subscribed :)", {
        reply_markup: {
          keyboard: [ageGroup, ["⬅Blocks"], ["Unsubscribe"]],
        },
      });
    })();
  } else {
    bot.sendMessage(chatId, "Invalid Command\n");
  }
});
