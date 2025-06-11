"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { FileText, Users, Home, LogOut, User, BarChart3 } from "lucide-react"
import { Button } from "@/components/shadcn/ui/button"
import { useAuthStore } from "@/lib/auth"
import { cn } from "@/lib/utils"

const navigationItems = [
  {
    title: "ダッシュボード",
    href: "/dashboard",
    icon: Home,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "日報",
    href: "/dashboard/daily-reports",
    icon: FileText,
    roles: ["admin", "manager", "employee"],
  },
  {
    title: "レポート",
    href: "/dashboard/reports",
    icon: BarChart3,
    roles: ["admin", "manager"],
  },
  {
    title: "ユーザー管理",
    href: "/dashboard/users",
    icon: Users,
    roles: ["admin"],
  },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const filteredItems = navigationItems.filter(
    (item) => user && item.roles.includes(user.role)
  )

  return (
    <nav className="flex flex-col h-full bg-gray-900 text-white w-64">
      <div className="p-4">
        <h1 className="text-xl font-bold">日報システム</h1>
      </div>

      <div className="flex-1 px-3">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gray-800 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          ログアウト
        </Button>
      </div>
    </nav>
  )
}