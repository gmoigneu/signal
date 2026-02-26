import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3EF]">
      <Sidebar />
      <main className="flex flex-col flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
