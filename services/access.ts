import type { Application, Service } from './firestore';

export type UserRole = 'applicant' | 'student' | 'client' | 'admin';
export type AccessRequirement = 'authenticated' | 'student' | 'client' | 'admin';

export type AccessSnapshot = {
  approvedApplicationCount: number;
  role: UserRole | null;
  serviceCount: number;
};

type RoleSignals = {
  applications?: Application[];
  profileRole?: UserRole | null;
  services?: Service[];
};

export function normalizeUserRole(value: unknown): UserRole {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';

  switch (normalized) {
    case 'admin':
      return 'admin';
    case 'student':
    case 'professional':
      return 'student';
    case 'client':
      return 'client';
    case 'applicant':
    default:
      return 'applicant';
  }
}

export function getApprovedApplicationCount(applications: Application[] = []) {
  return applications.filter(
    (application) => application.status === 'approved' || application.status === 'completed'
  ).length;
}

export function getEffectiveRole({
  applications = [],
  profileRole,
  services = [],
}: RoleSignals): UserRole {
  if (profileRole === 'admin') return 'admin';
  if (profileRole === 'student') return 'student';
  if (profileRole === 'client') return 'client';
  // Fallback for users whose role field predates explicit assignment
  if (getApprovedApplicationCount(applications) > 0) return 'student';
  if (applications.length > 0) return 'applicant';
  if (services.length > 0) return 'client';
  return 'applicant';
}

export function getDisplayRole({
  applications = [],
  profileRole,
  services = [],
}: RoleSignals) {
  const role = getEffectiveRole({ applications, profileRole, services });

  if (role === 'student') {
    const hasActiveEnrolment = applications.some((a) => a.status === 'approved');
    const hasCompleted = applications.some((a) => a.status === 'completed');
    if (!hasActiveEnrolment && hasCompleted) return 'Graduate';
    return 'Student';
  }

  switch (role) {
    case 'admin':
      return 'Admin';
    case 'client':
      return 'Client';
    case 'applicant':
    default:
      return 'Applicant';
  }
}

export function hasAccess(requirement: AccessRequirement, snapshot: AccessSnapshot) {
  if (requirement === 'authenticated') {
    return true;
  }

  if (requirement === 'admin') {
    return snapshot.role === 'admin';
  }

  if (snapshot.role === 'admin') {
    return true;
  }

  if (requirement === 'student') {
    return snapshot.role === 'student' || snapshot.approvedApplicationCount > 0;
  }

  if (requirement === 'client') {
    return snapshot.role === 'client' || snapshot.serviceCount > 0;
  }

  return false;
}
