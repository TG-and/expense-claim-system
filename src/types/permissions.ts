export const ROLES = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  FINANCE: 'Finance',
  ADMIN: 'Admin',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  [ROLES.EMPLOYEE]: {
    canSubmitClaims: true,
    canViewOwnClaims: true,
    canEditOwnDrafts: true,
    canWithdrawOwnClaims: true,
    canViewAllClaims: false,
    canApproveClaims: false,
    canViewFinanceData: false,
    canManageUsers: false,
    canManageWorkflows: false,
    canManageVendors: false,
  },
  [ROLES.MANAGER]: {
    canSubmitClaims: true,
    canViewOwnClaims: true,
    canEditOwnDrafts: true,
    canWithdrawOwnClaims: true,
    canViewAllClaims: true,
    canApproveClaims: true,
    approvalStep: 1,
    canViewFinanceData: false,
    canManageUsers: false,
    canManageWorkflows: false,
    canManageVendors: false,
  },
  [ROLES.FINANCE]: {
    canSubmitClaims: true,
    canViewOwnClaims: true,
    canEditOwnDrafts: true,
    canWithdrawOwnClaims: true,
    canViewAllClaims: true,
    canApproveClaims: true,
    approvalStep: 2,
    canViewFinanceData: true,
    canManageUsers: false,
    canManageWorkflows: false,
    canManageVendors: false,
  },
  [ROLES.ADMIN]: {
    canSubmitClaims: true,
    canViewOwnClaims: true,
    canEditOwnDrafts: true,
    canWithdrawOwnClaims: true,
    canViewAllClaims: true,
    canApproveClaims: true,
    canViewFinanceData: true,
    canManageUsers: true,
    canManageWorkflows: true,
    canManageVendors: true,
  },
} as const;

export function getPermissions(role: Role) {
  return PERMISSIONS[role] || PERMISSIONS[ROLES.EMPLOYEE];
}

export function canApproveAtStep(role: Role, step: number): boolean {
  const perms = getPermissions(role);
  if (!perms.canApproveClaims) return false;
  if (perms.approvalStep !== undefined) {
    return perms.approvalStep === step;
  }
  return true;
}
