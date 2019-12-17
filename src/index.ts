import { Client, TextChannel } from "discord.js"
import * as express from "express"
import * as path from "path"
import { reCaptchaToken, discordToken, reCaptchaKey } from "../secrets.json"
import fetch from "node-fetch"
import { URLSearchParams } from "url"

const bot = new Client()
const server = express()

bot.login(discordToken)
server.listen(8080)
const SERV_URL = "http://localhost:8080/"

/** The payload is the informations we keep for "on validation" user */
interface Payload {
  guildID: string
  userID: string
  channelID: string
  /** The validation ID is used to get th */
  valID: string
}
// Here we use a variable but you could use Redis or any kind of DB
let users: Payload[] = []

// Simple function to generate a short random id
const genID = () =>
  Math.random()
    .toString(36)
    .substr(2, 9)

// This function is called when a user successfully complete a captcha
const onSuccess = (payload: Payload) => {
  /**
   * Write you own code !
   */
  console.log(payload)
  // This will send a message on the channel where the user did the command
  const guild = bot.guilds.get(payload.guildID)
  if (guild) {
    const channel = guild.channels.get(payload.channelID) as TextChannel
    if (channel) {
      channel.send(`<@${payload.userID}> as completed a captcha !`)
    }
  }
}
const onFail = (payload: Payload) => {
  /**
   * Write you own code !
   */
  console.log(payload)
  // This will send a message on the channel where the user did the command
  const guild = bot.guilds.get(payload.guildID)
  if (guild) {
    const channel = guild.channels.get(payload.channelID) as TextChannel
    if (channel) {
      channel.send(`<@${payload.userID}> as failed a captcha !`)
    }
  }
}

// A simple way to define the command
// You can use the same mechanism for bot.on("guildMemberAdd", ...) for an anti raid bot
bot.on("message", (message) => {
  if (message.content === "cap") {
    const index = users.findIndex(({ userID }) => userID === message.author.id)
    if (index !== -1) {
      // If the user already make the command
      message.reply(`${SERV_URL}?valID=${users[index].valID}`)
    } else {
      // Otherwise create a new entry
      // Creates the payload
      const payload = {
        userID: message.author.id,
        channelID: message.channel.id,
        guildID: message.guild.id,
        valID: genID(),
      }
      // Keeps the payload in memory
      users.push(payload)
      message.reply(`${SERV_URL}?valID=${payload.valID}`)
    }
  }
})

// Serve the client directory
server.use("/", express.static(path.resolve(__dirname, "client")))

// Use to get the key
server.get("/key", (req, res) => res.json({ key: reCaptchaKey }))

// `/val` is use to validate a captcha request.
server.get("/val", async (req, res) => {
  if ("token" in req.query && "valID" in req.query) {
    // Make the request to google recaptcha to verify if the catcha is solved correctly
    const body = new URLSearchParams()
    body.append("secret", reCaptchaToken)
    body.append("response", req.query.token)
    const apiCall = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "post",
      body,
    })
    const apiRes = await apiCall.json()

    if (apiRes.success === true) {
      // Test if the validation ID is in `users`
      const index = users.findIndex(({ valID }) => valID === req.query.valID)
      if (index !== -1) {
        onSuccess(users[index])
        users.splice(index, 1)
        res.send("Success !")
      } else {
        res.status(401).send("Wrong valID.")
      }
    } else {
      const index = users.findIndex(({ valID }) => valID === req.query.valID)
      if (index !== -1) {
        onFail(users[index])
      }
      res.status(401).send("reCaptcha not successful.")
    }
  } else {
    res.status(400).send("Wrong request.")
  }
})
