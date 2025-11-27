// pages/notes/index.js
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/router";
import axios from "axios";
import { validateNote } from "../../utils/validation";
import NoteCard from "../../components/NoteCard";
import ColorPicker from "../../components/ColorPicker";

export default function NotesDashboard() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [form, setForm] = useState({
    title: "",
    content: "",
    collaborators: "",
    color: "default",
  });
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, active, completed
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [collaboratorEmails, setCollaboratorEmails] = useState([]);
  const [formErrors, setFormErrors] = useState({ title: '', content: '', collaborators: '' });
  const [userEmail, setUserEmail] = useState("");
  const [newNoteIds, setNewNoteIds] = useState(new Set());

  // Check authentication
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      setCheckingAuth(false);
      if (!token) {
        router.push("/login");
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [token, router]);

  // Load notes
  useEffect(() => {
    if (!token || checkingAuth) return;
    setLoading(true);
    fetch("/api/notes", {
      headers: { Authorization: "Bearer " + token },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => {
        // Additional deduplication on frontend as a safeguard
        const uniqueNotesMap = new Map();
        data.forEach(note => {
          if (note && note._id) {
            const noteId = note._id.toString();
            if (!uniqueNotesMap.has(noteId)) {
              uniqueNotesMap.set(noteId, note);
            }
          }
        });
        const uniqueNotes = Array.from(uniqueNotesMap.values());
        setNotes(uniqueNotes);
      })
      .catch((err) => console.error("Fetch notes error", err))
      .finally(() => setLoading(false));
  }, [token, checkingAuth]);

  // Fetch user email
  useEffect(() => {
    if (!token) return;
    fetch("/api/user/me", {
      headers: { Authorization: "Bearer " + token },
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        return data.email;
      })
      .then((email) => {
        if (email) setUserEmail(email);
      })
      .catch((err) => console.error("Fetch user error", err));
  }, [token]);

  // Update collaborator emails when form changes
  useEffect(() => {
    const emails = form.collaborators
      ? form.collaborators
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      : [];
    setCollaboratorEmails(emails);
  }, [form.collaborators]);

  if (checkingAuth || !token) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleColorChange(color) {
    setForm((prev) => ({ ...prev, color }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) return;

    // Validate note data
    const validation = validateNote({
      title: form.title,
      content: form.content,
      collaborators: collaboratorEmails
    });

    if (!validation.valid) {
      const errors = { title: '', content: '', collaborators: '' };
      validation.errors.forEach(error => {
        if (error.toLowerCase().includes('title')) {
          errors.title = error;
        } else if (error.toLowerCase().includes('content')) {
          errors.content = error;
        } else if (error.toLowerCase().includes('collaborator') || error.toLowerCase().includes('email')) {
          errors.collaborators = error;
        }
      });
      setFormErrors(errors);
      setMessage("Error: " + validation.errors[0]);
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setFormErrors({ title: '', content: '', collaborators: '' });

    const payload = {
      title: form.title || '',
      content: form.content || '',
      collaborators: collaboratorEmails,
      color: form.color || 'default',
    };

    try {
      let res;
      if (editing) {
        res = await axios.put(`/api/notes/${editing._id}`, payload, {
          headers: { Authorization: "Bearer " + token },
        });
      } else {
        res = await axios.post("/api/notes", payload, {
          headers: { Authorization: "Bearer " + token },
        });
      }

      setMessage("Saved");
      setForm({ title: "", content: "", collaborators: "", color: "default" });
      
      // If creating a new note (not editing), mark it as new
      let newNoteId = null;
      if (!editing && res.data) {
        newNoteId = res.data._id || res.data.id;
      }
      
      setEditing(null);
      setCollaboratorEmails([]);
      setFormErrors({ title: '', content: '', collaborators: '' });

      // Reload notes
      const notesRes = await axios.get("/api/notes", {
        headers: { Authorization: "Bearer " + token },
      });
      setNotes(notesRes.data);
      
      // Mark the newly created note as new
      if (newNoteId) {
        // Convert to string to ensure consistent comparison
        const noteIdStr = String(newNoteId);
        setNewNoteIds(prev => new Set([...prev, noteIdStr]));
        // Remove the "new" status after 5 seconds
        setTimeout(() => {
          setNewNoteIds(prev => {
            const updated = new Set(prev);
            updated.delete(noteIdStr);
            return updated;
          });
        }, 5000);
      }

      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || err.message || "Failed to save";
      setMessage("Error: " + errorMsg);

      // Handle validation errors from server
      if (err.response?.data?.errors) {
        const errors = { title: '', content: '', collaborators: '' };
        err.response.data.errors.forEach(error => {
          if (error.toLowerCase().includes('title')) {
            errors.title = error;
          } else if (error.toLowerCase().includes('content')) {
            errors.content = error;
          } else if (error.toLowerCase().includes('collaborator') || error.toLowerCase().includes('email')) {
            errors.collaborators = error;
          }
        });
        setFormErrors(errors);
      }

      setTimeout(() => setMessage(""), 3000);
    }
  }

  function startEdit(note) {
    if (note.completed) return; // Don't allow editing completed notes
    setEditing(note);
    setForm({
      title: note.title || "",
      content: note.currentContent || note.content || "",
      collaborators: (note.collaborators || []).join(", "),
      color: note.color || "default",
    });
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ title: "", content: "", collaborators: "", color: "default" });
    setCollaboratorEmails([]);
  }

  async function handleDelete(note) {
    if (!confirm("Delete this note?")) return;
    try {
      await axios.delete(`/api/notes/${note._id}`, {
        headers: { Authorization: "Bearer " + token },
      });
      // Reload notes
      const notesRes = await axios.get("/api/notes", {
        headers: { Authorization: "Bearer " + token },
      });
      setNotes(notesRes.data);
    } catch (err) {
      console.error("delete error", err);
      alert("Delete failed");
    }
  }

  async function toggleCompleted(note) {
    try {
      await axios.put(
        `/api/notes/${note._id}`,
        { completed: !note.completed },
        {
          headers: { Authorization: "Bearer " + token },
        }
      );
      // Reload notes
      const notesRes = await axios.get("/api/notes", {
        headers: { Authorization: "Bearer " + token },
      });
      setNotes(notesRes.data);
    } catch (err) {
      console.error("toggle completed error", err);
      alert("Failed to update note");
    }
  }

  async function handleTogglePin(note) {
    try {
      await axios.put(
        `/api/notes/${note._id}`,
        { pinned: !note.pinned },
        {
          headers: { Authorization: "Bearer " + token },
        }
      );
      // Reload notes
      const notesRes = await axios.get("/api/notes", {
        headers: { Authorization: "Bearer " + token },
      });
      setNotes(notesRes.data);
    } catch (err) {
      console.error("toggle pin error", err);
      alert("Failed to update note");
    }
  }

  // Filter and search notes
  const filteredNotes = notes.filter((note) => {
    // Status filter
    if (statusFilter === "active" && note.completed) return false;
    if (statusFilter === "completed" && !note.completed) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = note.title?.toLowerCase().includes(query);
      const matchesContent = note.content?.toLowerCase().includes(query) ||
        note.currentContent?.toLowerCase().includes(query) ||
        note.originalContent?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesContent) return false;
    }

    return true;
  });

  // Separate notes by ownership and completion
  const activeNotes = filteredNotes.filter((n) => !n.completed);
  const completedNotes = filteredNotes.filter((n) => n.completed);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notes</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowCompletedModal(true)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Completed
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Responsive 2-column layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Left Column - Note Input Panel */}
        <div className="lg:sticky lg:top-6 lg:h-fit">
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editing ? "Edit note" : "Create new note"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Note title..."
                  className={`input-field text-lg font-medium ${formErrors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  disabled={editing?.completed || false}
                />
                {formErrors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.title}</p>
                )}
              </div>

              <div>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  placeholder="Take a note..."
                  rows={8}
                  className={`input-field resize-none ${formErrors.content ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  disabled={editing?.completed || false}
                />
                {formErrors.content && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.content}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Collaborators
                </label>
                <input
                  name="collaborators"
                  value={form.collaborators}
                  onChange={handleChange}
                  placeholder="Comma-separated emails"
                  className={`input-field ${formErrors.collaborators ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  disabled={editing?.completed || false}
                />
                {formErrors.collaborators && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.collaborators}</p>
                )}
                {collaboratorEmails.length > 0 && !formErrors.collaborators && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {collaboratorEmails.map((email, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium"
                      >
                        {email}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-4">
                  <ColorPicker
                    currentColor={form.color}
                    onColorChange={handleColorChange}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  {editing && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={editing?.completed || false}
                  >
                    {editing ? "Update" : "Save"}
                  </button>
                </div>
              </div>
              {message && (
                <div
                  className={`text-sm font-medium ${message.includes("Error")
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                    }`}
                >
                  {message}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column - Notes List */}
        <div className="space-y-6">
          {/* Search and Filter */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field flex-1"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field sm:w-auto"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Notes List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600 dark:text-gray-400">Loading notes...</p>
              </div>
            </div>
          ) : activeNotes.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No notes yet</h3>
              <p className="text-gray-600 dark:text-gray-400">Create your first note to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeNotes.map((note) => (
                <NoteCard
                  key={note._id}
                  note={note}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  onToggleComplete={toggleCompleted}
                  onTogglePin={handleTogglePin}
                  isNew={newNoteIds.has(String(note._id))}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Completed Notes Modal */}
      {showCompletedModal && (
        <CompletedNotesModal
          notes={completedNotes}
          onClose={() => setShowCompletedModal(false)}
          userEmail={userEmail}
        />
      )}
    </div>
  );
}

// Completed Notes Modal Component
function CompletedNotesModal({ notes, onClose, userEmail }) {
  const myCompleted = notes.filter((n) => n.isOwner);
  const sharedCompleted = notes.filter((n) => !n.isOwner);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Completed Notes</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {notes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">No completed notes yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {myCompleted.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    My Completed ({myCompleted.length})
                  </h3>
                  <div className="space-y-3">
                    {myCompleted.map((note) => (
                      <CompletedNoteItem key={note._id} note={note} />
                    ))}
                  </div>
                </div>
              )}
              {sharedCompleted.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Shared Completed ({sharedCompleted.length})
                  </h3>
                  <div className="space-y-3">
                    {sharedCompleted.map((note) => (
                      <CompletedNoteItem key={note._id} note={note} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompletedNoteItem({ note }) {
  const hasOriginalAndUpdated = note.originalContent && note.currentContent && note.originalContent !== note.currentContent;

  return (
    <div className="card p-4 opacity-75">
      <h4 className="font-semibold text-gray-900 dark:text-gray-100 line-through">
        {note.title || "Untitled"}
      </h4>
      {hasOriginalAndUpdated ? (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Original Content:</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-through">{note.originalContent}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Updated Content:</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-through">{note.currentContent}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-through">
          {note.currentContent || note.content || note.originalContent}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {note.ownerInfo && (
          <span className="text-gray-500 dark:text-gray-400">Owner: {note.ownerInfo.email}</span>
        )}
        {note.collaborators && note.collaborators.length > 0 && (
          <span className="text-gray-500 dark:text-gray-400">
            Collaborators: {note.collaborators.join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}
