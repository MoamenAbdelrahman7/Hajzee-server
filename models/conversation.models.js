const mongoose = require("mongoose")



const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    playground: { type: mongoose.Schema.Types.ObjectId, ref: "PlayGround" },
    // Embed messages as subdocuments in the conversation
    messages: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, trim: true },
        attachments: [{ type: String }],
        isRead: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
)

conversationSchema.index({ participants: 1 })
conversationSchema.index({ updatedAt: -1 })

conversationSchema.pre(/^find/, function (next) {
  this.populate("user owner playground participants")
    .populate("messages.sender")
    .populate("messages.recipient")
  next()
})

const Conversation = mongoose.model("Conversation", conversationSchema)
module.exports = Conversation


