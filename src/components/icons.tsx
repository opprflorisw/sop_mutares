import type { ComponentType } from "react";
import {
  IconLayoutDashboard, IconHierarchy3, IconChartLine, IconBuildingFactory2,
  IconBox as TIconBox, IconChecks as TIconChecks, IconRadar2, IconSparkles as TIconSparkles,
  IconFolder as TIconFolder, IconUpload as TIconUpload, IconDownload as TIconDownload,
  IconSettings as TIconSettings, IconUsers as TIconUsers, IconLogout as TIconLogout,
  IconArrowLeft as TIconArrowLeft, IconArrowRight as TIconArrowRight, IconPlus as TIconPlus,
  IconSend as TIconSend, IconFileText, IconAlertTriangle, IconDotsVertical, IconEye as TIconEye,
  IconFilter as TIconFilter, IconChevronDown as TIconChevronDown, IconChevronRight as TIconChevronRight,
  IconAdjustmentsHorizontal, IconLoader2, IconLayoutGrid as TIconLayoutGrid, IconX as TIconX,
  IconGripVertical as TIconGripVertical, IconCopy as TIconCopy, IconTrash as TIconTrash,
  IconPencil as TIconPencil, IconDeviceFloppy, IconBolt as TIconBolt, IconCheck as TIconCheck,
  IconList as TIconList, IconUserCircle as TIconUserCircle,
} from "@tabler/icons-react";

// ============================================================
// Icon set — re-exports Tabler Icons (https://tabler.io/icons) under
// the names used across the app, so the whole UI shares one clean,
// consistent stroke icon set. Wrapper keeps our `size`/`stroke`
// defaults and passes through className/style/onClick/title.
// ============================================================

export type IconProps = {
  size?: number;
  stroke?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<SVGSVGElement>;
  title?: string;
  "aria-label"?: string;
};

function wrap(I: ComponentType<Record<string, unknown>>) {
  return function Icon({ size = 18, stroke = 1.8, ...rest }: IconProps) {
    return <I size={size} stroke={stroke} {...rest} />;
  };
}

export const IconDashboard = wrap(IconLayoutDashboard);
export const IconFlow = wrap(IconHierarchy3);
export const IconChart = wrap(IconChartLine);
export const IconFactory = wrap(IconBuildingFactory2);
export const IconBox = wrap(TIconBox);
export const IconChecks = wrap(TIconChecks);
export const IconRadar = wrap(IconRadar2);
export const IconSparkles = wrap(TIconSparkles);
export const IconFolder = wrap(TIconFolder);
export const IconUpload = wrap(TIconUpload);
export const IconDownload = wrap(TIconDownload);
export const IconSettings = wrap(TIconSettings);
export const IconUsers = wrap(TIconUsers);
export const IconLogout = wrap(TIconLogout);
export const IconArrowLeft = wrap(TIconArrowLeft);
export const IconArrowRight = wrap(TIconArrowRight);
export const IconPlus = wrap(TIconPlus);
export const IconSend = wrap(TIconSend);
export const IconFile = wrap(IconFileText);
export const IconAlert = wrap(IconAlertTriangle);
export const IconDots = wrap(IconDotsVertical);
export const IconEye = wrap(TIconEye);
export const IconFilter = wrap(TIconFilter);
export const IconChevronDown = wrap(TIconChevronDown);
export const IconChevronRight = wrap(TIconChevronRight);
export const IconGear = wrap(IconAdjustmentsHorizontal);

// Dashboard-system icons
export const IconGrid = wrap(TIconLayoutGrid);
export const IconList = wrap(TIconList);
export const IconUserCircle = wrap(TIconUserCircle);
export const IconX = wrap(TIconX);
export const IconGrip = wrap(TIconGripVertical);
export const IconCopy = wrap(TIconCopy);
export const IconTrash = wrap(TIconTrash);
export const IconPencil = wrap(TIconPencil);
export const IconSave = wrap(IconDeviceFloppy);
export const IconBolt = wrap(TIconBolt);
export const IconCheck = wrap(TIconCheck);

export const IconSpinner = ({ size = 16, stroke = 1.8, className = "", ...p }: IconProps) => (
  <IconLoader2 size={size} stroke={stroke} className={`animate-spin ${className}`} {...p} />
);
