import { NavLink } from 'react-router-dom'

export function TabBar() {
  const item = 'flex-1 text-center py-3 text-sm'
  const active = ({ isActive }: { isActive: boolean }) => `${item} ${isActive ? 'text-blue-600 font-semibold' : 'text-slate-400'}`
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t flex">
      <NavLink to="/" className={active} end>词库</NavLink>
      <NavLink to="/stats" className={active}>统计</NavLink>
      <NavLink to="/wrong" className={active}>错词</NavLink>
      <NavLink to="/settings" className={active}>设置</NavLink>
    </nav>
  )
}
