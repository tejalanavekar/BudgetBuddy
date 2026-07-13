import mongoose from 'mongoose';

// One document per exchange — lets us see what users actually ask the assistant
// and which tools got used, without needing a separate analytics pipeline.
const chatMessageSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question:  { type: String, required: true },
  answer:    { type: String, required: true },
  toolsUsed: { type: [String], default: [] },
  page:      { type: String, default: 'app' }
}, { timestamps: true });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;
