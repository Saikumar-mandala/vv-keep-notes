import ColorPicker, { getColorClasses } from "./ColorPicker";

export default function NoteForm({
  form,
  handleChange,
  handleSubmit,
  editing,
  cancelEdit,
  user,
}) {
  const colorData = getColorClasses(form.color || "default");

  return (
    <form
      onSubmit={handleSubmit}
      className={`${colorData.bg} rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8 transition-all duration-300 hover:shadow-2xl lg:sticky lg:top-6`}
    >
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-white"
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
          </div>
          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
            {editing ? "Edit Note" : "Create Note"}
          </h3>
        </div>
        <div className="flex items-center space-x-3">
          <ColorPicker
            currentColor={form.color}
            onColorChange={(color) =>
              handleChange({ target: { name: "color", value: color } })
            }
          />
          {editing && (
            <button
              type="button"
              onClick={cancelEdit}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <div>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Note title..."
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 text-lg sm:text-xl font-semibold border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200"
          />
        </div>

        <div>
          <textarea
            name="content"
            value={form.content}
            onChange={handleChange}
            placeholder="Take a note..."
            rows={6}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none transition-all duration-200 leading-relaxed text-sm sm:text-base"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-2.5">
              <span className="flex items-center space-x-1.5 sm:space-x-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400"
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
                </div>
                <span>Set Reminder</span>
              </span>
            </label>
            <input
              name="reminderAt"
              type="datetime-local"
              value={form.reminderAt}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-all duration-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-2.5">
            <span className="flex items-center space-x-1.5 sm:space-x-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-lg flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400"
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
              </div>
              <span>Collaborators</span>
            </span>
          </label>

          {/* Display email badges if any */}
          {form.collaborators &&
            form.collaborators.split(",").filter((email) => email.trim())
              .length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3 p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                {form.collaborators
                  .split(",")
                  .filter((email) => email.trim())
                  .map((email, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full text-xs sm:text-sm font-medium shadow-sm"
                    >
                      <svg
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span>{email.trim()}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const emails = form.collaborators
                            .split(",")
                            .filter((e) => e.trim());
                          emails.splice(idx, 1);
                          handleChange({
                            target: {
                              name: "collaborators",
                              value: emails.join(", "),
                            },
                          });
                        }}
                        className="ml-0.5 sm:ml-1 hover:bg-purple-700 rounded-full p-0.5 transition-colors"
                      >
                        <svg
                          className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
              </div>
            )}

          <input
            name="collaborators"
            value={form.collaborators}
            onChange={handleChange}
            placeholder="Enter email addresses"
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 sm:mt-2 ml-1">
            Separate multiple emails with commas
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-0 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="submit"
            className="px-6 sm:px-8 py-2.5 sm:py-3.5 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {editing ? "✓ Update Note" : "+ Save Note"}
          </button>
        </div>
      </div>
    </form>
  );
}
