const mongoose = require("mongoose")

// Note: Standalone Message model kept for future use (e.g., migrations),
// but the app currently uses embedded messages in conversations.
const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true },
    attachments: [{ type: String }],
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

messageSchema.pre(/^find/, function (next) {
  this.populate("sender recipient")
  next()
})

const Message = mongoose.model("Message", messageSchema)
module.exports = Message


