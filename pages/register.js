// pages/register.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { isValidEmail, validateName, validatePassword, validateRegistration } from '../utils/validation';

export default function RegisterPage() {
  const { user, saveToken } = useAuth();
  const router = useRouter();
  const { email: emailParam, note: noteId, from } = router.query;

  const [form, setForm] = useState({
    name: '',
    email: emailParam ? decodeURIComponent(emailParam) : '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [showEmailMessage, setShowEmailMessage] = useState(from === 'email' && emailParam);

  // Update email field when emailParam changes
  useEffect(() => {
    if (emailParam && typeof emailParam === 'string') {
      setForm(prev => ({ ...prev, email: decodeURIComponent(emailParam) }));
      setShowEmailMessage(from === 'email' && emailParam);
    }
  }, [emailParam, from]);

  // Redirect if already logged in (but only if not in the process of registering)
  useEffect(() => {
    if (user && !loading && !msg) {
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
  }, [user, from, noteId, emailParam, router, loading, msg]);

  function validateField(name, value) {
    const newErrors = { ...errors };

    if (name === 'name') {
      const validation = validateName(value);
      newErrors.name = validation.valid ? '' : validation.errors[0] || '';
    }

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
      const validation = validatePassword(value);
      newErrors.password = validation.valid ? '' : validation.errors[0] || '';
      // Also validate confirm password if it has a value
      if (form.confirmPassword) {
        newErrors.confirmPassword = form.confirmPassword === value ? '' : 'Passwords do not match';
      }
    }

    if (name === 'confirmPassword') {
      if (!value) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (value !== form.password) {
        newErrors.confirmPassword = 'Passwords do not match';
      } else {
        newErrors.confirmPassword = '';
      }
    }

    setErrors(newErrors);
  }

  async function submit(e) {
    e.preventDefault();
    setErr(null);

    // Validate all fields
    const validation = validateRegistration(form);
    const passwordMatch = form.password === form.confirmPassword;

    if (!passwordMatch) {
      setErrors({ ...errors, confirmPassword: 'Passwords do not match' });
      setErr('Passwords do not match');
      return;
    }

    if (!validation.valid) {
      const fieldErrors = { name: '', email: '', password: '', confirmPassword: '' };
      validation.errors.forEach(error => {
        if (error.toLowerCase().includes('name')) {
          fieldErrors.name = error;
        } else if (error.toLowerCase().includes('email')) {
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
      const res = await axios.post('/api/auth/register', validation.sanitized);
      // Redirect to login page after successful registration
      setMsg('Account created successfully! Please login.');
      
      // Redirect to login page
      if (from === 'email' && noteId && emailParam) {
        setTimeout(() => {
          router.push(`/login?email=${encodeURIComponent(form.email)}&note=${encodeURIComponent(noteId)}&from=email`);
        }, 700);
      } else {
        setTimeout(() => router.push('/login'), 700);
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.error || error.message || 'Register failed';
      setErr(errorMsg);
      if (error?.response?.data?.errors) {
        const fieldErrors = { name: '', email: '', password: '', confirmPassword: '' };
        error.response.data.errors.forEach(error => {
          if (error.toLowerCase().includes('name')) {
            fieldErrors.name = error;
          } else if (error.toLowerCase().includes('email')) {
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
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-3">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create account</h2>
          <p className="text-gray-600 text-sm">Start organizing your thoughts</p>
        </div>

        {showEmailMessage && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-lg text-xs">
            <p className="font-medium mb-0.5">Note Shared with You!</p>
            <p>Create an account to access the shared note. Your email has been pre-filled.</p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              required
              placeholder="Enter your full name"
              value={form.name}
              onChange={e => {
                setForm({ ...form, name: e.target.value });
                validateField('name', e.target.value);
              }}
              onBlur={e => validateField('name', e.target.value)}
              className={`input-field ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

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
              placeholder="Create a password (min 6 characters)"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              required
              type="password"
              placeholder="Confirm your password"
              value={form.confirmPassword || ''}
              onChange={e => {
                setForm({ ...form, confirmPassword: e.target.value });
                validateField('confirmPassword', e.target.value);
              }}
              onBlur={e => validateField('confirmPassword', e.target.value)}
              className={`input-field ${errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {msg && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {msg}
            </div>
          )}

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
                Creating account...
              </span>
            ) : (
              'Create account'
            )}
          </button>

          <div className="text-center pt-2">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link 
                href={from === 'email' && emailParam && noteId
                  ? `/login?email=${encodeURIComponent(emailParam)}&note=${encodeURIComponent(noteId)}&from=email`
                  : "/login"
                }
                className="text-blue-600 font-medium hover:text-blue-700 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </>
  );
}
