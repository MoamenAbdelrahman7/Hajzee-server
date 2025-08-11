const express = require("express")
const router = express.Router()
const chatController = require("../controllers/chatController")
const authController = require("../controllers/authController")

router.use(authController.protect)

// Conversations
router.route("/conversations")
  .get(chatController.getMyConversations)
  .post(chatController.startConversation)

// Messages within a conversation
router.route("/conversations/:id/messages")
  .get(chatController.getConversationMessages)
  .post(chatController.sendMessage)

// Mark messages as read in a conversation
router.route("/conversations/:id/read")
  .get(chatController.markConversationMessagesRead)

module.exports = router


