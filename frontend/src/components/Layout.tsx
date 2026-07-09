import { Outlet } from 'react-router-dom';
import TabBar from './TabBar';

function Layout() {
  return (
    <div className="app-shell">
      <main className="app-body">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}

export default Layout;
