import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PlazaScreen from './screens/PlazaScreen';
import DrawScreen from './screens/DrawScreen';
import ChatScreen from './screens/ChatScreen';
import ZukanScreen from './screens/ZukanScreen';
import SettingsScreen from './screens/SettingsScreen';
import StickerDetailScreen from './screens/StickerDetailScreen';
import LoginScreen from './screens/LoginScreen';
import { useAuth } from './stores/AuthStore';
import './App.css';

// 認証が必要なルートをラップするコンポーネント
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, restoring } = useAuth();
  if (restoring) {
    return <div className="screen">読み込み中...</div>;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} /> // ログイン画面のルート
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<PlazaScreen />} />
          <Route path="/sticker/:id" element={<StickerDetailScreen />} />
          <Route path="/chat" element={<ChatScreen />} />
          <Route path="/zukan" element={<ZukanScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Route>
        // 認証が必要なルートを追加
        <Route
          path="/draw"
          element={
            <RequireAuth>
              <DrawScreen />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
