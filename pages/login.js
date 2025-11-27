// pages/login.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { isValidEmail, validateLogin } from '../utils/validation';

export default function LoginPage() {
  const { saveToken, token } = useAuth();
  const router = useRouter();
  const { email: emailParam, note: noteId, from } = router.query;

  const [form, setForm] = useState({
    email: emailParam ? decodeURIComponent(emailParam) : '',
    password: ''
  });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEmailMessage, setShowEmailMessage] = useState(from === 'email' && emailParam);

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      // If coming from email link and has note ID, redirect to note with email parameter for editing
      if (from === 'email' && noteId && emailParam) {
        const decodedNoteId = decodeURIComponent(noteId);
        const decodedEmail = decodeURIComponent(emailParam);
        router.push(`/notes/${decodedNoteId}?from=email&email=${encodeURIComponent(decodedEmail)}`);
      } else if (from === 'email' && noteId) {
        // Fallback if email param is missing
        router.push(`/notes/${decodeURIComponent(noteId)}`);
      } else {
        router.push('/');
      }
    }
  }, [token, from, noteId, emailParam, router]);

  function validateField(name, value) {
    const newErrors = { ...errors };

    if (name === 'email') {
      if (!value) {
        newErrors.email = 'Email is required';
      } else if (!isValidEmail(value)) {
        newErrors.email = 'Please enter a valid email address';
      } else {
        newErrors.email = '';
      }
    }

    if (name === 'password') {
      if (!value) {
        newErrors.password = 'Password is required';
      } else {
        newErrors.password = '';
      }
    }

    setErrors(newErrors);
  }

  async function submit(e) {
    e.preventDefault();
    setErr(null);

    // Validate all fields
    const validation = validateLogin(form);
    if (!validation.valid) {
      const fieldErrors = { email: '', password: '' };
      validation.errors.forEach(error => {
        if (error.toLowerCase().includes('email')) {
          fieldErrors.email = error;
        } else if (error.toLowerCase().includes('password')) {
          fieldErrors.password = error;
        }
      });
      setErrors(fieldErrors);
      setErr(validation.errors[0]);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', validation.sanitized);
      if (res.data.token) {
        saveToken(res.data.token);
      }
      // Wait a moment for token to be saved, then redirect
      setTimeout(() => {
        // If coming from email link and has note ID, redirect to note with email parameter for editing
        if (from === 'email' && noteId && emailParam) {
          const decodedNoteId = decodeURIComponent(noteId);
          const decodedEmail = decodeURIComponent(emailParam);
          router.push(`/notes/${decodedNoteId}?from=email&email=${encodeURIComponent(decodedEmail)}`);
        } else if (from === 'email' && noteId) {
          // Fallback if email param is missing
          router.push(`/notes/${decodeURIComponent(noteId)}`);
        } else {
          router.push('/');
        }
      }, 100);
    } catch (error) {
      const errorMsg = error?.response?.data?.error || error.message || 'Login failed';
      setErr(errorMsg);
      if (error?.response?.data?.errors) {
        const fieldErrors = { email: '', password: '' };
        error.response.data.errors.forEach(error => {
          if (error.toLowerCase().includes('email')) {
            fieldErrors.email = error;
          } else if (error.toLowerCase().includes('password')) {
            fieldErrors.password = error;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="card p-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-3">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-600 text-sm">Sign in to access your notes</p>
        </div>

        {showEmailMessage && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-lg text-xs">
            <p className="font-medium mb-0.5">Note Shared with You!</p>
            <p>Sign in to access the shared note. Your email has been pre-filled.</p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              required
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={e => {
                setForm({ ...form, email: e.target.value });
                validateField('email', e.target.value);
              }}
              onBlur={e => validateField('email', e.target.value)}
              className={`input-field ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              required
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => {
                setForm({ ...form, password: e.target.value });
                validateField('password', e.target.value);
              }}
              onBlur={e => validateField('password', e.target.value)}
              className={`input-field ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {err}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>

          <div className="text-center pt-1">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <div className="text-center pt-3">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                href={from === 'email' && emailParam && noteId
                  ? `/register?email=${encodeURIComponent(emailParam)}&note=${encodeURIComponent(noteId)}&from=email`
                  : "/register"
                }
                className="text-blue-600 font-medium hover:text-blue-700 hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </>
  );
}
