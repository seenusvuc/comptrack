import { Link } from 'react-router-dom';

interface Props {
  title: string;
  userName?: string;
  isAuthenticated?: boolean;
  onLogout?: () => void;
  children: React.ReactNode;
}

export function Layout({ title, userName, isAuthenticated = false, onLogout, children }: Props) {
  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <h1>{title}</h1>
          {userName ? <p className="topbar-subtitle">Signed in as {userName}</p> : null}
        </div>
        <nav>
          <Link to="/">Home</Link>
          {isAuthenticated ? <Link to="/employee">Employee</Link> : null}
          {isAuthenticated ? <Link to="/manager">Manager</Link> : null}
          {isAuthenticated ? <Link to="/admin">Admin</Link> : null}
          {!isAuthenticated ? <Link to="/login">Login</Link> : null}
          {!isAuthenticated ? <Link to="/register">Register</Link> : null}
          {isAuthenticated && onLogout ? <button className="link-button" onClick={onLogout} type="button">Logout</button> : null}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
