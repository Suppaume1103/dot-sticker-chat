import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: '広場' },
  { to: '/chat', label: 'チャット' },
  { to: '/zukan', label: '図鑑' },
  { to: '/settings', label: '設定' },
];

function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => (isActive ? 'on' : '')}
        >
          <span className="ic" />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default TabBar;
