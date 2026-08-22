import { SideMenuItemProps } from "./SideMenu"
import {
  BsGearFill,
  BsPaletteFill,
  BsCameraFill,
  BsWindow,
  BsPersonCircle,
  BsJoystick,
  BsMedium,
  BsFingerprint,
  BsFront,
  BsSearch,
  BsHddNetwork,
  BsArrowLeftRight,
} from "solid-icons/bs"
import { FiLogIn } from "solid-icons/fi"
import { SiMetabase } from "solid-icons/si"
import { CgDatabase, CgShare } from "solid-icons/cg"
import { IoHome } from "solid-icons/io"
import { Component, lazy } from "solid-js"
import { Group, UserRole } from "~/types"
import {
  FaSolidBook,
  FaSolidDatabase,
  FaSolidPuzzlePiece,
} from "solid-icons/fa"

export type SideMenuItem = SideMenuItemProps & {
  component?: Component
  children?: SideMenuItem[]
}

const CommonSettings = lazy(() => import("./settings/Common"))

export const side_menu_items: SideMenuItem[] = [
  {
    title: "manage.sidemenu.dashboard",
    icon: BsHddNetwork,
    to: "/@manage/dashboard",
    role: UserRole.GUEST,
    component: lazy(() => import("./Dashboard")),
  },
  {
    title: "manage.sidemenu.profile",
    icon: BsFingerprint,
    to: "/@manage",
    role: UserRole.GUEST,
    component: lazy(() => import("./users/Profile")),
  },
  {
    title: "manage.sidemenu.settings",
    icon: BsGearFill,
    to: "/@manage/settings",
    children: [
      {
        title: "manage.sidemenu.site",
        icon: BsWindow,
        to: "/@manage/settings/site",
        component: () => <CommonSettings group={Group.SITE} />,
      },
      {
        title: "manage.sidemenu.style",
        icon: BsPaletteFill,
        to: "/@manage/settings/style",
        component: () => <CommonSettings group={Group.STYLE} />,
      },
      {
        title: "manage.sidemenu.preview",
        icon: BsCameraFill,
        to: "/@manage/settings/preview",
        component: () => <CommonSettings group={Group.PREVIEW} />,
      },
      {
        title: "manage.sidemenu.global",
        icon: BsJoystick,
        to: "/@manage/settings/global",
        component: () => <CommonSettings group={Group.GLOBAL} />,
      },
      {
        title: "manage.sidemenu.sso",
        icon: FiLogIn,
        to: "/@manage/settings/sso",
        component: () => <CommonSettings group={Group.SSO} />,
      },
      {
        title: "manage.sidemenu.ldap",
        icon: FiLogIn,
        to: "/@manage/settings/ldap",
        component: () => <CommonSettings group={Group.LDAP} />,
      },
      {
        title: "manage.sidemenu.traffic",
        icon: BsArrowLeftRight,
        to: "/@manage/settings/traffic",
        component: () => <CommonSettings group={Group.TRAFFIC} />,
      },
      {
        title: "manage.sidemenu.other",
        icon: BsMedium,
        to: "/@manage/settings/other",
        component: lazy(() => import("./settings/Other")),
      },
    ],
  },
  {
    title: "manage.sidemenu.users",
    icon: BsPersonCircle,
    to: "/@manage/users",
    component: lazy(() => import("./users/Users")),
  },
  {
    title: "manage.sidemenu.storages",
    icon: CgDatabase,
    to: "/@manage/storages",
    component: lazy(() => import("./storages/Storages")),
  },
  {
    title: "manage.sidemenu.shares",
    icon: CgShare,
    to: "/@manage/shares",
    role: UserRole.GENERAL,
    component: lazy(() => import("./shares/Shares")),
  },
  {
    title: "manage.sidemenu.metas",
    icon: SiMetabase,
    to: "/@manage/metas",
    component: lazy(() => import("./metas/Metas")),
  },
  {
    title: "manage.sidemenu.indexes",
    icon: BsSearch,
    to: "/@manage/indexes",
    component: lazy(() => import("./indexes/index_page")),
  },
  {
    title: "manage.sidemenu.plugins",
    icon: FaSolidPuzzlePiece,
    to: "/@manage/plugins",
    component: lazy(() => import("./plugins")),
  },
  {
    title: "manage.sidemenu.backup-restore",
    to: "/@manage/backup-restore",
    icon: FaSolidDatabase,
    component: lazy(() => import("./backup-restore")),
  },
  {
    title: "manage.sidemenu.about",
    icon: BsFront,
    to: "/@manage/about",
    role: UserRole.GUEST,
    component: lazy(() => import("./About")),
  },
  {
    title: "manage.sidemenu.docs",
    icon: FaSolidBook,
    to: "https://doc.oplist.org",
    role: UserRole.GUEST,
    external: true,
  },
  {
    title: "manage.sidemenu.home",
    icon: IoHome,
    to: "/",
    role: UserRole.GUEST,
    refresh: true,
  },
]
