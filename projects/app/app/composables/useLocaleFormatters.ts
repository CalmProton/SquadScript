interface RelativeTimeOptions {
  now?: Date;
}

function getCurrentLocale(defaultLocale: string): string {
  const route = useRoute();
  const firstSegment = route.path.split('/').filter(Boolean)[0];

  if (firstSegment === 'en' || firstSegment === 'ru' || firstSegment === 'uk') {
    return firstSegment;
  }

  return defaultLocale;
}

export function useLocaleFormatters() {
  const { defaultLocale } = useI18n();

  function resolveDefaultLocale(): string {
    if (typeof defaultLocale === 'function') {
      return defaultLocale() || 'en';
    }

    if (typeof defaultLocale === 'object' && defaultLocale && 'value' in defaultLocale) {
      const localeRef = defaultLocale as { value?: string };
      return localeRef.value || 'en';
    }

    return 'en';
  }

  const locale = computed(() => getCurrentLocale(resolveDefaultLocale()));

  function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(locale.value, options).format(value);
  }

  function formatDateTime(value: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(locale.value, options).format(date);
  }

  function formatRelativeTime(value: Date | string | number, options?: RelativeTimeOptions): string {
    const date = value instanceof Date ? value : new Date(value);
    const now = options?.now ?? new Date();
    const diffMs = date.getTime() - now.getTime();

    const formatter = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' });

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (Math.abs(diffMs) < hour) {
      return formatter.format(Math.round(diffMs / minute), 'minute');
    }

    if (Math.abs(diffMs) < day) {
      return formatter.format(Math.round(diffMs / hour), 'hour');
    }

    return formatter.format(Math.round(diffMs / day), 'day');
  }

  return {
    locale,
    formatNumber,
    formatDateTime,
    formatRelativeTime,
  };
}
