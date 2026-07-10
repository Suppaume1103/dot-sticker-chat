import { NavLink } from 'react-router-dom';
import { ChatIcon, PlazaIcon, SettingsIcon, ZukanIcon } from './icons/TabIcons';

const TABS = [
  { to: '/', label: '広場', Icon: PlazaIcon },
  { to: '/chat', label: 'チャット', Icon: ChatIcon },
  { to: '/zukan', label: '図鑑', Icon: ZukanIcon },
  { to: '/settings', label: '設定', Icon: SettingsIcon },
];

function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => (isActive ? 'on' : '')}
        >
          {({ isActive }) => (
            <>
              <span className={isActive ? 'ic-chip on' : 'ic-chip'}>
                <Icon active={isActive} />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default TabBar;
