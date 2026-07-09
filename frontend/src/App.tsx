import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PlazaScreen from './screens/PlazaScreen';
import DrawScreen from './screens/DrawScreen';
import ChatScreen from './screens/ChatScreen';
import ZukanScreen from './screens/ZukanScreen';
import SettingsScreen from './screens/SettingsScreen';
import StickerDetailScreen from './screens/StickerDetailScreen';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<PlazaScreen />} />
          <Route path="/sticker/:id" element={<StickerDetailScreen />} />
          <Route path="/chat" element={<ChatScreen />} />
          <Route path="/zukan" element={<ZukanScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Route>
        <Route path="/draw" element={<DrawScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
