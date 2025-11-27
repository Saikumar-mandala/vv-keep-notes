// context/AuthContext.jsx
// Combined: AuthContext + ThemeContext
import { createContext, useContext, useEffect, useState } from 'react';
import Router from 'next/router';
import axios from 'axios';

const AuthContext = createContext();
const ThemeContext = createContext({
  darkMode: false,
  toggleTheme: () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  
  // Theme state
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load token and theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        setToken(storedToken);
      }
      
      // Load theme
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
      setDarkMode(isDark);
      setMounted(true);
    }
  }, []);
  
  // Update DOM class and localStorage when theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return;
    
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode, mounted]);
  
  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  const saveToken = (newToken) => {
    if (typeof window !== 'undefined') {
      if (newToken) {
        localStorage.setItem('access_token', newToken);
        setToken(newToken);
      } else {
        localStorage.removeItem('access_token');
        setToken(null);
      }
    }
  };

  const checkAuth = async () => {
    try {
      const { data } = await axios.get('/api/auth/me');
      setUser(data.user);
    } catch (error) {
      // If 401, try to refresh
      if (error.response && error.response.status === 401) {
        try {
          const refreshRes = await axios.post('/api/auth/refresh');
          // Update token if returned
          if (refreshRes.data.token) {
            saveToken(refreshRes.data.token);
          }
          // Retry getting user
          const { data } = await axios.get('/api/auth/me');
          setUser(data.user);
        } catch (refreshError) {
          setUser(null);
          saveToken(null);
        }
      } else {
        setUser(null);
        saveToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Re-check auth when token changes (but avoid infinite loop)
  useEffect(() => {
    if (token && !user) {
      // Only check auth if we have a token but no user
      checkAuth();
    } else if (!token) {
      setUser(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Queue to hold requests while refreshing
  let isRefreshing = false;
  let refreshSubscribers = [];

  const subscribeTokenRefresh = (cb) => {
    refreshSubscribers.push(cb);
  };

  const onRefreshed = () => {
    refreshSubscribers.forEach((cb) => cb());
    refreshSubscribers = [];
  };

  // Add Authorization header to requests
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        // Get the latest token (could have been updated)
        const currentToken = typeof window !== 'undefined' 
          ? localStorage.getItem('access_token') 
          : null;
        if (currentToken && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, []);

  // Interceptor to handle token expiration on other requests
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response && error.response.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise((resolve) => {
              subscribeTokenRefresh(() => {
                resolve(axios(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const refreshRes = await axios.post('/api/auth/refresh');
            // Update token if returned
            if (refreshRes.data.token) {
              saveToken(refreshRes.data.token);
            }
            isRefreshing = false;
            onRefreshed();
            return axios(originalRequest);
          } catch (refreshError) {
            isRefreshing = false;
            refreshSubscribers = []; // Clear queue on error
            setUser(null);
            Router.push('/login');
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  async function login(email, password) {
    const { data } = await axios.post('/api/auth/login', { email, password });
    setUser(data.user);
    if (data.token) {
      saveToken(data.token);
    }
    Router.push('/');
  }

  async function register(name, email, password) {
    const { data } = await axios.post('/api/auth/register', { name, email, password });
    setUser(data.user);
    if (data.token) {
      saveToken(data.token);
    }
    Router.push('/');
  }

  async function logout() {
    await axios.post('/api/auth/logout');
    setUser(null);
    saveToken(null);
    Router.push('/login');
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, token, saveToken }}>
      <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
        {children}
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within an AuthProvider');
  }
  return context;
}
