import React from 'react';
import { 
  Bot, 
  BookOpen, 
  Wrench, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Settings as SettingsIcon,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Compass,
  SlidersHorizontal,
  Mic
} from 'lucide-react';
import { ScreenId } from '../components/Navigation';
import { useTranslation } from '../services/i18n';
import { db } from '../services/storage';
import { FlameLogo } from '../components/flame/FlameLogo';
import { FlameIcon } from '../components/flame/FlameIcon';

interface MoreScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onRefresh: () => void;
}

interface HubItem {
  id: ScreenId;
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  onClickCustom?: () => void;
}

interface HubSection {
  titleKey: string;
  defaultTitle: string;
  items: HubItem[];
}

export const MoreScreen: React.FC<MoreScreenProps> = ({ onNavigate, onRefresh }) => {
  const { t, isRtl } = useTranslation();
  const state = db.getState();
  const modules = state.settings.modules || {};

  const allSections: HubSection[] = [
    {
      titleKey: 'more.intel',
      defaultTitle: 'Intelligence & Review',
      items: [
        ...(modules.assistant !== false ? [
          {
            id: 'assistant' as ScreenId,
            titleKey: 'nav.assistant',
            defaultTitle: 'AI Assistant',
            descKey: 'more.assistantDesc',
            defaultDesc: 'Gemini-powered financial & life insights',
            icon: Bot,
          },
          {
            id: 'assistant' as ScreenId,
            titleKey: 'voice.voiceModeCardTitle',
            defaultTitle: 'Hermes Voice Conversation',
            descKey: 'voice.voiceModeCardSubtitle',
            defaultDesc: 'Hands-free voice mode with live speech and ambient orb',
            icon: Mic,
            badge: 'Live',
            onClickCustom: () => {
              window.dispatchEvent(new CustomEvent('open_hermes_voice'));
            },
          }
        ] : []),
        ...(modules.weekly_review !== false ? [{
          id: 'weekly-review' as ScreenId,
          titleKey: 'nav.weeklyReview',
          defaultTitle: 'Weekly Review',
          descKey: 'more.reviewDesc',
          defaultDesc: 'Reflect on habits, finances, and discipline',
          icon: Sparkles,
        }] : []),
        ...(modules.flame !== false ? [{
          id: 'flame' as ScreenId,
          titleKey: 'flame.title',
          defaultTitle: 'Sober Flame',
          descKey: 'flame.subtitle',
          defaultDesc: 'Daily sober streak & earned words',
          icon: () => <FlameIcon size={18} animated={false} />,
        }] : []),
      ],
    },
    {
      titleKey: 'more.daily',
      defaultTitle: 'Daily & Organization',
      items: [
        ...(modules.calendar !== false ? [{
          id: 'calendar' as ScreenId,
          titleKey: 'nav.calendar',
          defaultTitle: 'Calendar & Agenda',
          descKey: 'more.calendarDesc',
          defaultDesc: 'Events, tasks, and monthly timeline',
          icon: CalendarIcon,
        }] : []),
        ...(modules.maintenance !== false ? [{
          id: 'maintenance' as ScreenId,
          titleKey: 'nav.maintenance',
          defaultTitle: 'Care, Service & Shopping',
          descKey: 'more.maintenanceDesc',
          defaultDesc: 'Vehicle maintenance, hygiene cycles & shopping',
          icon: Wrench,
        }] : []),
        ...(modules.journal !== false ? [{
          id: 'journal' as ScreenId,
          titleKey: 'nav.journal',
          defaultTitle: 'Journal & Reflections',
          descKey: 'more.journalDesc',
          defaultDesc: 'Daily notes, thoughts, and emotional log',
          icon: BookOpen,
        }] : []),
      ],
    },
    {
      titleKey: 'more.system',
      defaultTitle: 'System & Preferences',
      items: [
        {
          id: 'settings' as ScreenId,
          titleKey: 'more.customizeModules',
          defaultTitle: 'Customize Modules',
          descKey: 'more.customizeModulesDesc',
          defaultDesc: 'Enable or disable features and tabs',
          icon: SlidersHorizontal,
        },
        {
          id: 'settings' as ScreenId,
          titleKey: 'nav.settings',
          defaultTitle: 'Settings',
          descKey: 'more.settingsDesc',
          defaultDesc: 'Language, theme, font size, backup & AI key',
          icon: SettingsIcon,
        },
      ],
    },
  ];

  const sections = allSections.filter(sec => sec.items.length > 0);

  return (
    <div className="w-full pb-8 space-y-6">
      {/* Header */}
      <div className="pt-2 px-1 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <FlameLogo onOpenFlame={() => onNavigate('flame')} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {t('nav.more', 'More')}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {t('more.subtitle', 'Tools, secondary modules & system preferences')}
            </p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-2">
            <h2 className="text-xs font-semibold text-[var(--color-text-muted)] px-1">
              {t(section.titleKey, section.defaultTitle)}
            </h2>

            <div className="card-clean divide-y divide-[var(--color-border)]">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={`${item.id}-${item.titleKey}`}
                    type="button"
                    onClick={() => {
                      if (item.onClickCustom) {
                        item.onClickCustom();
                      } else {
                        onNavigate(item.id);
                      }
                    }}
                    className="w-full flex items-center justify-between p-4 text-start hover:bg-[var(--color-surface-subtle)] tap-feedback transition-colors min-h-[56px]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-subtle)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                            {t(item.titleKey, item.defaultTitle)}
                          </span>
                          {item.badge && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
                          {t(item.descKey, item.defaultDesc)}
                        </p>
                      </div>
                    </div>

                    <ChevronRight 
                      className={`w-5 h-5 text-[var(--color-text-muted)] shrink-0 ms-2 ${
                        isRtl ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
