// pages/_app.js
import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import Layout from '../components/Layout';
import Toast from '../components/Toast';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <Layout>
          <Component {...pageProps} />
          <Toast />
        </Layout>
      </ToastProvider>
    </AuthProvider>
  );
}
