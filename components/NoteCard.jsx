// components/NoteCard.jsx
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { getColorClasses } from "./ColorPicker";

export default function NoteCard({
  note,
  onEdit,
  onDelete,
  onToggleComplete,
  onTogglePin,
  isNew = false,
}) {
  const { user } = useAuth();
  const isOwner = note.isOwner;
  const isShared = !isOwner;
  const isCompleted = note.completed;
  const isPinned = note.pinned || false;

  // Get color classes for this note - use green for new notes
  const colorData = isNew 
    ? getColorClasses("green")
    : getColorClasses(note.color || "default");

  // Owner display info (for "Original (Created by ...)" only)
  const ownerDisplayName =
    note.ownerInfo?.name ||
    note.owner?.name ||
    note.ownerInfo?.email ||
    note.owner?.email ||
    "Unknown";
  const ownerEmail = note.ownerInfo?.email || note.owner?.email || null;

  // Helper: get most recent email from collaboratorEdits (if present)
  function getEmailFromCollaboratorEdits(edits = []) {
    if (!Array.isArray(edits) || edits.length === 0) return null;
    for (let i = edits.length - 1; i >= 0; i--) {
      const e = edits[i];
      if (!e) continue;
      if (e.email) return e.email;
      if (e.editedBy && e.editedBy.email) return e.editedBy.email;
    }
    return null;
  }

  // Determine who to display as "Last edited by"
  // Priority: 1) Most recent collaborator edit email, 2) Owner's email
  // If there are collaborator edits, show the collaborator who last edited
  // If no collaborator edits, show owner's email
  let lastEditorDisplay = null;
  const fromEdits = getEmailFromCollaboratorEdits(note.collaboratorEdits);

  if (fromEdits) {
    // Show collaborator email if there are collaborator edits
    lastEditorDisplay = fromEdits;
  } else {
    // No collaborator edits - show owner's email
    lastEditorDisplay =
      note.lastEditorEmail ||
      (note.lastEditedBy && typeof note.lastEditedBy === "object"
        ? note.lastEditedBy.email
        : null) ||
      ownerEmail ||
      ownerDisplayName ||
      "Unknown";
  }

  // If lastEditorDisplay equals owner email and owner was not actually the editor,
  // we still show owner only when it's truly the owner. Otherwise the UI prefers collaborator.
  // (We assume backend sets lastEditorEmail or lastEditedBy correctly on edit.)
  const originalContent = note.originalContent || note.content || "";
  const currentContent = note.currentContent || note.content || "";
  const hasChanges = originalContent !== currentContent;

  // Determine flags for badges (owner vs collaborator)
  const ownerId = note.owner?._id?.toString() || note.owner?.toString();
  const lastEditorId =
    note.lastEditedBy?._id?.toString() || note.lastEditedBy?.toString();
  const currentUserId = user?.id?.toString();
  const isCurrentUserOwner = currentUserId === ownerId;
  const isCurrentUserLastEditor =
    !isCurrentUserOwner &&
    currentUserId &&
    lastEditorId &&
    currentUserId === lastEditorId;

  return (
    <div
      className={`note-card group p-4 sm:p-5 ${colorData.bg} ${
        isShared ? "border-l-4 border-l-purple-500" : ""
      } ${isCompleted ? "opacity-75" : ""}`}
    >
      <div className="flex gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {isCompleted && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full border border-green-300 dark:border-green-700 text-xs font-medium">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Completed</span>
              </div>
            )}
            {isPinned && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full border border-yellow-300 dark:border-yellow-700 text-xs font-medium">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M10 3a1 1 0 011 1v5h3a1 1 0 110 2h-3v5a1 1 0 11-2 0v-5H6a1 1 0 110-2h3V4a1 1 0 011-1z"
                    transform="rotate(45 10 10)"
                  />
                </svg>
                <span>Pinned</span>
              </div>
            )}
            {isShared && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full border border-purple-300 dark:border-purple-700 text-xs font-medium">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                <span>Shared with me</span>
                {note.ownerInfo && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    by {note.ownerInfo.name || note.ownerInfo.email}
                  </span>
                )}
              </div>
            )}
          </div>

          {note.title && (
            <div 
              onClick={() => !isCompleted && onEdit(note)} 
              className={isCompleted ? "" : "cursor-pointer"}
            >
              <h3 className={`font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 transition-colors ${
                isCompleted 
                  ? "line-through opacity-60" 
                  : "hover:text-blue-600 dark:hover:text-blue-400"
              }`}>
                {note.title}
              </h3>
            </div>
          )}

          <div className="mt-2 space-y-3">
            <div className="border-l-4 border-yellow-400 pl-3 py-2 bg-yellow-50 dark:bg-yellow-900/10 rounded-r">
              <div className="flex items-center space-x-1.5 mb-1">
                <svg
                  className="w-3.5 h-3.5 text-yellow-700 dark:text-yellow-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-xs font-semibold text-yellow-800 dark:text-yellow-300">
                  Original (Created by {ownerDisplayName})
                </span>
                {isCurrentUserOwner && (
                  <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium ml-1">
                    You
                  </span>
                )}
              </div>
              <div className={`text-sm whitespace-pre-wrap ${
                isCompleted 
                  ? "text-gray-500 dark:text-gray-500 line-through opacity-60" 
                  : "text-gray-700 dark:text-gray-300"
              }`}>
                {originalContent || (
                  <span className="text-gray-400 italic">Empty note</span>
                )}
              </div>
            </div>

            {hasChanges ? (
              <div className="border-l-4 border-blue-400 pl-3 py-2 bg-blue-50 dark:bg-blue-900/10 rounded-r">
                <div className="flex items-center space-x-1.5 mb-1">
                  <svg
                    className="w-3.5 h-3.5 text-blue-700 dark:text-blue-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                    Updated (Last edited by {lastEditorDisplay})
                  </span>
                  {isCurrentUserLastEditor && (
                    <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium ml-1">
                      Collaborator
                    </span>
                  )}
                </div>
                <div className={`text-sm whitespace-pre-wrap ${
                  isCompleted 
                    ? "text-gray-500 dark:text-gray-500 line-through opacity-60" 
                    : "text-gray-700 dark:text-gray-300"
                }`}>
                  {currentContent || (
                    <span className="text-gray-400 italic">Empty note</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                No changes from original
              </div>
            )}
          </div>

          <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            {note.reminderAt && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-700">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium">
                  {new Date(note.reminderAt).toLocaleString()}
                </span>
              </div>
            )}
            {note.collaborators && note.collaborators.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {note.collaborators.map((email, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-700"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <span className="font-medium text-xs">{email}</span>
                  </div>
                ))}
              </div>
            )}
            {isShared && !isOwner && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full border border-green-200 dark:border-green-700">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span className="font-medium">Can edit</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex flex-col items-end space-y-1.5 sm:space-y-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          {/* Pin Button */}
          <button
            onClick={() => onTogglePin(note)}
            className={`p-2 sm:p-2.5 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${
              isPinned
                ? "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30"
                : "text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
            }`}
            title={isPinned ? "Unpin note" : "Pin note"}
          >
            <svg
              className="w-5 h-5"
              fill={isPinned ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </button>

          <button
            onClick={onToggleComplete}
            className={`p-2 sm:p-2.5 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${
              isCompleted
                ? "text-green-600 bg-green-50 dark:bg-green-900/30"
                : "text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"
            }`}
            title={isCompleted ? "Mark as incomplete" : "Mark as complete"}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>

          <button
            onClick={() => !isCompleted && onEdit(note)}
            disabled={isCompleted}
            className={`p-2 sm:p-2.5 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${
              isCompleted
                ? "text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50"
                : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            }`}
            title={isCompleted ? "Cannot edit completed notes" : "Edit note"}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>

          {isOwner && (
            <button
              onClick={() => onDelete(note)}
              className="p-2 sm:p-2.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Delete note"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
