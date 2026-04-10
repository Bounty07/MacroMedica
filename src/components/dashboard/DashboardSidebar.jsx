import {
  CalendarDays,
  ChartColumnBig,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  FilePenLine,
  FolderHeart,
  LayoutDashboard,
  Settings2,
  Stethoscope,
  UsersRound,
  X,
} from 'lucide-react'
import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Tooltip as TooltipPrimitive } from 'radix-ui'
import { useAppContext } from '../../context/AppContext'
import { getSidebarForRole } from '../../lib/sidebarConfig'
import { useSidebar } from '../../ui/sidebar'

const iconMap = {
  'calendar-days': CalendarDays,
  'chart-column-big': ChartColumnBig,
  'clock-3': Clock3,
  'credit-card': CreditCard,
  'file-pen-line': FilePenLine,
  'folder-heart': FolderHeart,
  'layout-dashboard': LayoutDashboard,
  'settings-2': Settings2,
  stethoscope: Stethoscope,
  'users-round': UsersRound,
}

const CustomHoverTooltip = ({ children, content }) => (
  <TooltipPrimitive.Provider delayDuration={0}>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="right"
          sideOffset={14}
          className="z-[100] rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-lg"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
)

function SidebarLink({ item, onClick, isCollapsed }) {
  const Icon = iconMap[item.icon] || Stethoscope

  const link = (
    <NavLink
      to={item.to}
      end={item.to.endsWith('/dashboard')}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'group relative flex items-center text-[14px] font-medium outline-none transition-all duration-200',
          isCollapsed
            ? 'mx-auto h-12 w-12 justify-center rounded-2xl'
            : 'w-full gap-3 rounded-2xl px-4 py-3',
          isActive
            ? (isCollapsed
              ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
              : 'bg-white text-slate-950 shadow-[0_18px_40px_-28px_rgba(13,148,136,0.7)]')
            : (isCollapsed
              ? 'text-slate-300 hover:bg-white/8 hover:text-white'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'),
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={[
              'flex shrink-0 items-center justify-center transition-colors duration-200',
              isCollapsed
                ? `h-11 w-11 rounded-2xl ${isActive ? 'bg-teal-500 text-white shadow-md' : 'text-slate-300 group-hover:text-teal-300'}`
                : `h-10 w-10 rounded-2xl bg-white/10 ${isActive ? 'text-slate-950' : 'text-slate-300'}`,
            ].join(' ')}
          >
            <Icon className={isCollapsed ? 'h-5 w-5' : 'h-5 w-5'} />
          </span>

          <span className={isCollapsed ? 'hidden' : 'block min-w-0 break-words leading-tight'}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  )

  return isCollapsed ? <CustomHoverTooltip content={item.label}>{link}</CustomHoverTooltip> : link
}

function DashboardSidebar({ mobile = false, onClose }) {
  const { state, toggleSidebar } = useSidebar()
  const { profile, cabinet, specialiteKey } = useAppContext()
  const isCollapsed = !mobile && state === 'collapsed'

  useEffect(() => {
    if (!mobile) {
      localStorage.setItem('sidebar-collapsed', isCollapsed ? 'true' : 'false')
    }
  }, [isCollapsed, mobile])

  const cabinetName = cabinet?.nom || 'Administration'
  const userName = profile?.nom_complet || 'Utilisateur'
  const userInitials = userName.slice(0, 2).toUpperCase()

  return (
    <aside
      className={`relative flex h-full flex-col overflow-x-hidden bg-[#0d1117] text-white transition-[width,min-width,max-width] duration-300 ${
        mobile ? 'w-full' : isCollapsed ? 'w-16 min-w-[4rem] max-w-[4rem] shrink-0' : 'w-[255px] min-w-[255px] max-w-[255px] shrink-0'
      }`}
    >
      <div className={`relative flex h-[96px] items-center border-b border-white/10 ${isCollapsed ? 'px-2' : 'px-6'}`}>
        <div className={`flex flex-1 items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className={`flex items-center justify-center rounded-2xl bg-teal-500/20 text-teal-300 ${isCollapsed ? 'h-8 w-8 rounded-xl' : 'h-10 w-10'}`}>
            <Stethoscope className={isCollapsed ? 'h-4 w-4' : 'h-5 w-5'} />
          </div>
          {!isCollapsed ? (
            <div className="overflow-hidden">
              <p className="whitespace-nowrap text-[17px] font-[700] tracking-tight">MacroMedica</p>
            </div>
          ) : null}
        </div>

        {!mobile ? (
          <button
            type="button"
            onClick={toggleSidebar}
            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/[0.07] hover:text-white"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto shrink-0 rounded-xl border border-white/10 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className={`flex-1 space-y-8 overflow-y-auto py-6 ${isCollapsed ? 'px-1.5' : 'px-4'}`}>
        {getSidebarForRole(profile?.role || 'docteur', specialiteKey).map((section) => (
          <div key={section.label}>
            {isCollapsed ? (
              <div className="my-4 flex justify-center">
                <div className="h-px w-6 bg-white/10" />
              </div>
            ) : (
              <div className="mb-2 px-3">
                <p className="text-[10px] font-[700] uppercase tracking-[0.1em] text-[#8b949e]">{section.label}</p>
              </div>
            )}

            <div className="space-y-2">
              {section.items.map((item) => (
                <SidebarLink key={item.to} item={item} onClick={onClose} isCollapsed={isCollapsed} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="relative h-[160px] shrink-0 overflow-hidden border-t border-white/10">
        {!isCollapsed ? (
          <div className="absolute inset-0 flex flex-col justify-center p-5">
            <div className="w-[215px] rounded-[24px] bg-white/5 p-4">
              <p className="truncate whitespace-nowrap text-[13px] font-semibold text-white">{cabinetName}</p>
              <p className="mt-1 truncate whitespace-nowrap text-[11px] capitalize text-slate-400">
                Role: {profile?.role || 'Medecin'}
              </p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex justify-center pt-8">
            <CustomHoverTooltip content={userName}>
              <div className="flex h-10 w-10 cursor-default items-center justify-center rounded-full bg-teal-600 text-[13px] font-bold uppercase text-white shadow-md">
                {userInitials}
              </div>
            </CustomHoverTooltip>
          </div>
        )}
      </div>
    </aside>
  )
}

export default DashboardSidebar
