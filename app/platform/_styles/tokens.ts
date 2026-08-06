export const platformTokens = {
  siderBg: '#0c1426',
  siderBorder: 'rgba(255,255,255,0.1)',
  primary: '#1890ff',
  purple: '#722ed1',
  brandGradient: 'linear-gradient(135deg, #1890ff, #722ed1)',
  danger: '#ff4d4f',
  success: '#52c41a',
  warning: '#faad14',
  contentBg: '#f0f2f5',
  cardRadius: 12,
  cardShadow: '0 2px 8px rgba(0,0,0,0.06)',
  softSuccessBg: '#f6ffed',
  softSuccessBorder: '#b7eb8f',
  softInfoBg: '#e6f7ff',
  softErrorBg: '#fff2f0',
  softPurpleBg: '#f9f0ff',
  softWarningBg: '#fffbe6',
} as const;

export const statusColors: Record<string, string> = {
  active: 'success',
  suspended: 'error',
  provisioning: 'processing',
  failed: 'warning',
  pending: 'default',
  trial: 'processing',
  past_due: 'warning',
  cancelled: 'default',
  expired: 'default',
};

export function formatINR(amount: number) {
  if (amount === 0) return 'Custom';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRole(role: string) {
  const map: Record<string, string> = {
    platform_owner: 'Platform Owner',
    platform_admin: 'Platform Admin',
    support_manager: 'Support Manager',
    billing_manager: 'Billing Manager',
    read_only: 'Read Only',
  };
  return map[role] || role;
}
