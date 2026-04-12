/**
 * iconRegistry.ts — Shared icon resolution for the Nords UI.
 *
 * Maps icon string names stored in the database (e.g., "Square", "Bug")
 * to Lucide React component references. Used by both graphToReactFlow.ts
 * (for canvas rendering) and TypeRegistryContext (for dock/flyout icons).
 */

import {
  Square, User, FileText, Bug, Target, Lightbulb, Layers,
  AlertTriangle, CheckSquare, CircleDot, Hexagon, Star,
  Zap, Heart, Bookmark, Flag, Clock, Shield, Globe,
  Code, Database, Cloud, Settings, Package, Puzzle,
  MessageSquare, Folder, Tag, Milestone, Flame, Rocket,
  Eye, Lock, Unlock, Bell, Search, Filter, Hash,
  BarChart2, PieChart, TrendingUp, Activity, Cpu,
  GitBranch, GitMerge, GitPullRequest, Terminal,
  Box, Briefcase, Calendar, Camera, Clipboard,
  Compass, CreditCard, Download, Edit2, ExternalLink,
  Feather, Film, Gift, Home, Image, Inbox, Info,
  Key, Layers as LayersIcon, Layout, LifeBuoy,
  Link, List, Mail, Map, MapPin, Monitor, Moon,
  MoreHorizontal, Music, Navigation, Paperclip,
  Pause, PenTool, Phone, Play, Plus, Power, Printer,
  Radio, RefreshCw, Repeat, RotateCw, Rss, Save,
  Scissors, Send, Server, Share2, ShoppingCart,
  Sidebar, Sliders, Smartphone, Speaker, Sun,
  Tablet, ThumbsUp, ToggleLeft, Wrench, Trash2,
  Truck, Tv, Type, Umbrella, Upload, Users, Video,
  Volume2, Watch, Wifi, Wind, XCircle, Crosshair,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  // Common project types
  Square, User, FileText, Bug, Target, Lightbulb, Layers,
  AlertTriangle, CheckSquare, CircleDot, Hexagon, Star,
  Zap, Heart, Bookmark, Flag, Clock, Shield, Globe,
  // Dev & tech
  Code, Database, Cloud, Settings, Package, Puzzle,
  Terminal, Cpu, GitBranch, GitMerge, GitPullRequest,
  // Communication
  MessageSquare, Bell, Mail, Send, Phone, Video,
  // Organization
  Folder, Tag, Milestone, Briefcase, Calendar, Clipboard,
  List, Filter, Hash, Inbox, Layout,
  // Analytics
  BarChart2, PieChart, TrendingUp, Activity,
  // Actions
  Download, Upload, Save, Edit2, Trash2, Plus, Search,
  RefreshCw, Repeat, RotateCw, Share2, ExternalLink,
  // Objects
  Box, Camera, Compass, CreditCard, Feather, Film,
  Gift, Home, Image, Info, Key, LifeBuoy, Link,
  Lock, Unlock, Map, MapPin, Monitor, Moon, Sun,
  Music, Navigation, Paperclip, PenTool, Power,
  Printer, Radio, Rss, Scissors, Server,
  ShoppingCart, Sidebar, Sliders, Smartphone,
  Speaker, Tablet, ThumbsUp, ToggleLeft, Wrench,
  Truck, Tv, Type, Umbrella, Users, Volume2,
  Watch, Wifi, Wind, XCircle, Crosshair,
  // Extras
  Flame, Rocket, Eye, Play, Pause,
  MoreHorizontal,
};

export const DEFAULT_ICON: LucideIcon = Square;

/**
 * Resolve an icon string name to its Lucide component.
 * Returns DEFAULT_ICON (Square) if not found or null.
 */
export function resolveIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return DEFAULT_ICON;
  return ICON_MAP[iconName] || DEFAULT_ICON;
}

/**
 * Get all available icon names for the icon picker UI.
 */
export function getAvailableIconNames(): string[] {
  return Object.keys(ICON_MAP);
}
