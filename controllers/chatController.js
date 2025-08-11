const Conversation = require("../models/conversation.models")
const PlayGround = require("../models/playGround.models")
const catchAsync = require("../utils/catchAsync")
const AppError = require("../utils/appError")
const { createNotification } = require("./notificationController")

// Ensure a unique conversation between the playground owner and the other user per playground
exports.startConversation = catchAsync(async (req, res, next) => {
  const { ownerId, playgroundId, userId: providedUserId } = req.body
  const initiatorId = String(req.user.id)

  if (!ownerId || !playgroundId) {
    return next(new AppError("ownerId and playgroundId are required", 400))
  }

  const playground = await PlayGround.findById(playgroundId)
  if (!playground) return next(new AppError("Playground not found", 404))

  // Use the actual owner from the playground to avoid client mistakes
  const actualOwnerId = String(playground.owner)
  if (String(ownerId) !== actualOwnerId) {
    return next(new AppError("Owner does not match playground", 400))
  }

  // Determine the non-owner user participant
  let userParticipantId
  const initiatorIsOwner = initiatorId === actualOwnerId
  if (initiatorIsOwner) {
    if (!providedUserId) {
      return next(new AppError("userId is required when the owner initiates the conversation", 400))
    }
    userParticipantId = String(providedUserId)
  } else {
    userParticipantId = initiatorId
  }

  // Ensure owner and user are different and produce exactly two unique participants
  const uniqueParticipants = Array.from(new Set([actualOwnerId, String(userParticipantId)]))
  if (uniqueParticipants.length !== 2) {
    return next(new AppError("Owner and user must be different participants", 400))
  }

  let conversation = await Conversation.findOne({
    participants: { $all: uniqueParticipants },
    playground: playgroundId,
  })

  if (!conversation) {
    conversation = await Conversation.create({
      participants: uniqueParticipants,
      user: uniqueParticipants.find((id) => id !== actualOwnerId),
      owner: actualOwnerId,
      playground: playgroundId,
    })
  }

  res.status(200).json({ status: "success", data: conversation })
})

exports.getMyConversations = catchAsync(async (req, res, next) => {
  console.log("req.user.id", req.user.id)
  
  const conversations = await Conversation.find({
    participants: req.user.id,
  }).sort({ lastMessageAt: -1, updatedAt: -1 })
  res.status(200).json({ status: "success", length: conversations.length, data: conversations })
})

exports.getConversationMessages = catchAsync(async (req, res, next) => {
  const { id } = req.params
  const conversation = await Conversation.findById(id)
  if (!conversation) return next(new AppError("Conversation not found", 404))
  const isParticipant = conversation.participants.some((p) => String(p._id || p) === String(req.user.id))
  if (!isParticipant) return next(new AppError("Forbidden", 403))

  const messagesArray = Array.isArray(conversation.messages) ? conversation.messages : []
  const messages = messagesArray.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  res.status(200).json({ status: "success", length: messages.length, data: messages })
})

exports.sendMessage = catchAsync(async (req, res, next) => {
  const { id } = req.params // conversation id
  const { text } = req.body
  const conversation = await Conversation.findById(id)
  if (!conversation) return next(new AppError("Conversation not found", 404))

  const senderId = req.user.id
  const isParticipant = conversation.participants.some((p) => String(p._id || p) === String(senderId))
  if (!isParticipant) return next(new AppError("Forbidden", 403))
  
  // Determine recipient as the other participant
  const participantIds = (conversation.participants || []).map((p) => String(p._id || p))
  const recipientId = participantIds.find((pid) => pid !== String(senderId))
  if (!recipientId) {
    return next(new AppError("Invalid conversation participants", 400))
  }

  // Normalize participants to contain exactly the two unique participant IDs
  const uniqueParticipants = Array.from(new Set([String(senderId), String(recipientId)]))
  const currentParticipants = (conversation.participants || []).map((p) => String(p._id || p))
  const needsParticipantFix =
    uniqueParticipants.length !== currentParticipants.length ||
    !uniqueParticipants.every((pid) => currentParticipants.includes(pid))
  if (needsParticipantFix) {
    conversation.participants = uniqueParticipants
  }

  const newMessage = {
    sender: senderId,
    recipient: recipientId,
    text,
    isRead: false,
    createdAt: new Date(),
  }
  if (!Array.isArray(conversation.messages)) conversation.messages = []
  conversation.messages.push(newMessage)

  // Update conversation summary
  conversation.lastMessage = text
  conversation.lastMessageAt = new Date()
  await conversation.save()

  // Notify recipient (non-blocking)
  try {
    await createNotification({
      recipient: recipientId,
      sender: senderId,
      playground: conversation.playground,
      title: "New message",
      message: text || "You received a new message.",
      type: "general",
    })
  } catch (e) {
    console.log("Notification error (sendMessage):", e.message)
  }

  res.status(201).json({ status: "success", data: newMessage })
})

exports.markConversationMessagesRead = catchAsync(async (req, res, next) => {
  const { id } = req.params
  const conversation = await Conversation.findById(id)
  if (!conversation) return next(new AppError("Conversation not found", 404))
  const userId = req.user.id
  const isParticipant = conversation.participants.some((p) => String(p._id || p) === String(userId))
  if (!isParticipant) return next(new AppError("Forbidden", 403))

  let updated = false
  for (const msg of conversation.messages) {
    const messageRecipientId = String((msg.recipient && msg.recipient._id) || msg.recipient)
    if (messageRecipientId === String(userId) && !msg.isRead) {
      msg.isRead = true
      updated = true
    }
  }
  if (updated) {
    // Ensure Mongoose detects nested array subdocument updates
    conversation.markModified("messages")
    await conversation.save()
  }
  res.status(200).json({ status: "success" })
})


