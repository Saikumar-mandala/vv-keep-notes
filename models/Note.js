// models/Note.js
import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: {
    type: String,
    default: '',
    maxlength: [500, 'Title must be less than 500 characters'],
    trim: true
  },
  content: {
    type: String,
    default: '',
    maxlength: [100000, 'Content must be less than 100,000 characters']
  },

  // When the reminder should fire (nullable)
  reminderAt: { type: Date, default: null },


  // collaborator emails (simple list of strings)
  collaborators: [{
    type: String,
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format in collaborators array'
    }
  }],

  archived: { type: Boolean, default: false },

  // NEW: mark whether reminder email has been sent
  reminderSent: { type: Boolean, default: false },

  // Completed status - when true, note becomes read-only
  completed: { type: Boolean, default: false },

  // Original content (owner's original version)
  originalContent: { type: String, default: '' },

  // Current content (may be updated by collaborators)
  currentContent: { type: String, default: '' },

  // Track who last edited the note (userId reference)
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Track last editor email directly (for guest/robust attribution)
  lastEditorEmail: { type: String, default: null },

  // Track edits per collaborator
  collaboratorEdits: [{
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    editedAt: { type: Date, default: Date.now },
    content: { type: String, required: true },
    email: { type: String, default: null } // Email of the collaborator who made the edit
  }],

  // Track which collaborators opened the email notification link
  emailOpenedBy: [{ type: String }], // Array of collaborator emails who clicked the email link

  // Visual customization
  color: {
    type: String,
    enum: ['default', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'gray'],
    default: 'default'
  },

  // Pin status - pinned notes appear first
  pinned: { type: Boolean, default: false }
}, { timestamps: true });

// Prevent model overwrite issue in dev/hot reload
export default mongoose.models.Note || mongoose.model('Note', NoteSchema);
