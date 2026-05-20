import {
    addDoc,
    collection,
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { normalizeUserRole, type UserRole } from './access';

const COLLECTIONS = {
  announcements: 'Announcements',
  courses: 'Courses',
  applications: 'APPLICATIONS',
  services: 'Services',
  users: 'users',
  notifications: 'AdminNotifications',
} as const;

// ─── Types ──────────────────────────────────────────────────────────────────
export interface Course {
  id: string;
  title: string;
  description?: string;
  program: string;
  level: string;
  duration: string;
  modules?: number;
  fees?: number;
  schedule: string;
  platform?: string;
  practicalSessions?: string;
  idealFor?: string;
  content?: string[];
  createdAt: any;
}

export interface Announcement {
  id: string;
  title: string;
  detail: string;
  urgent: boolean;
  createdAt: any;
}

export interface AnnouncementInput {
  title: string;
  detail: string;
  urgent: boolean;
}

export interface AdminNotification {
  id: string;
  type: 'application' | 'service' | 'account' | 'registration';
  message: string;
  referenceId: string;
  userId: string;
  read: boolean;
  createdAt: any;
}

export interface Application {
  id: string;
  userId: string;
  courseId: string;
  courseTitle?: string;
  courseProgram?: string;
  courseDuration?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  location?: string;
  educationLevel?: string;
  certificateLink?: string;
  areaOfStudy?: string;
  occupation?: string;
  organization?: string;
  motivation?: string;
  paymentMode?: string;
  transactionRef?: string;
  receiptLink?: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'completed';
  documents: string[];
  feedback: string;
  submittedAt: any;
  decidedAt?: any;
  withdrawnAt?: any;
  courseCompleted?: boolean;
  completedAt?: any;
  paymentStatus?: 'partial' | 'full';
  accessLocked?: boolean;
  certificateUrl?: string;
}

export interface ApplicationInput {
  userId: string;
  courseId: string;
  courseTitle: string;
  courseProgram: string;
  courseDuration: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  location?: string;
  educationLevel?: string;
  certificateLink?: string;
  areaOfStudy?: string;
  occupation?: string;
  organization?: string;
  motivation?: string;
  paymentMode?: string;
  transactionRef?: string;
  receiptLink?: string;
  message?: string;
}

export interface Service {
  id: string;
  userId: string;
  clientName?: string;
  clientEmail?: string;
  serviceType: 'mediation' | 'arbitration';
  category: string;
  caseDetails: string;
  documents: string[];
  status: 'submitted' | 'in-progress' | 'completed';
  mediatorAssigned: string;
  mediatorName?: string;
  mediatorNote?: string;
  meetingLink?: string;
  scheduledDate?: any;
  resolution?: string;
  statusUpdatedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface CaseMessage {
  id: string;
  caseId: string;
  senderId: string;
  senderName: string;
  senderType: 'client' | 'admin';
  text: string;
  createdAt: any;
}

export interface ServiceInput {
  userId: string;
  clientName?: string;
  clientEmail?: string;
  serviceType: 'mediation' | 'arbitration';
  category: string;
  caseDetails: string;
}

function pickField<T>(data: Record<string, any>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (key in data) {
      return data[key] as T;
    }
  }

  return undefined;
}

const CURATED_COURSES: Course[] = [
  {
    id: 'pecadr',
    title: 'Professional Executive Certificate in ADR',
    description:
      'Foundational ADR certification covering negotiation, mediation, ethics, and court-connected practice in Ghana.',
    program: 'PECADR',
    level: 'Certificate',
    duration: '4 weeks',
    modules: 7,
    fees: 3200,
    schedule: 'Mondays, Wednesdays, and Fridays | 5:30 PM - 8:30 PM',
    platform: 'Virtual (Google Meet/Zoom)',
    practicalSessions: 'In-person sessions at Kasoa',
    idealFor:
      'Beginners and professionals seeking foundational knowledge and certification in ADR.',
    content: [
      'Introduction to ADR & its benefits',
      'Conflict theories and analysis',
      'Negotiation techniques',
      'Mediation principles and practice',
      'Court-Connected ADR in Ghana',
      'Ethics in Mediation',
      'Practical role-play simulations',
    ],
    createdAt: null,
  },
  {
    id: 'pemadr',
    title: "Professional Executive Master's in ADR",
    description:
      'Advanced executive ADR program focused on dispute resolution, arbitration, settlement drafting, and professional standards.',
    program: 'PEMADR',
    level: "Master's",
    duration: '3 months',
    modules: 8,
    fees: 6300,
    schedule: 'Mondays, Wednesdays, and Fridays | 5:30 PM - 8:30 PM',
    platform: 'Virtual (Google Meet/Zoom)',
    idealFor:
      'Professionals seeking advanced executive-level ADR knowledge and practical conflict resolution expertise.',
    content: [
      'Functional Law (Tort, Constitutional, and Property Law)',
      'Workplace and business dispute resolution',
      'International Arbitration & Trade Law',
      'Drafting Settlement Agreements',
      'Advanced Mediation & Arbitration Techniques',
      'Labour and Industrial Relations Law',
      'Ethical & Professional Standards in ADR',
      'Case Studies and Practical Role-Play',
    ],
    createdAt: null,
  },
];

const LEGACY_COURSE_ALIASES: Record<string, string> = {
  course1: 'pecadr',
  'course-1': 'pecadr',
  foundationsofalternativedisputeresolution: 'pecadr',
  pecadr: 'pecadr',
  course2: 'pemadr',
  'course-2': 'pemadr',
  masters: 'pemadr',
  masterinadr: 'pemadr',
  professionalexecutivemastersinadr: 'pemadr',
  pemadr: 'pemadr',
};

function normalizeCourseKey(value: string | undefined) {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function resolveCourseFromReference(reference?: string) {
  const normalizedReference = normalizeCourseKey(reference);
  const curatedDirectMatch = CURATED_COURSES.find(
    (course) => normalizeCourseKey(course.id) === normalizedReference
  );

  if (curatedDirectMatch) return curatedDirectMatch;

  const aliasId = LEGACY_COURSE_ALIASES[normalizedReference];
  if (!aliasId) return null;

  return CURATED_COURSES.find((course) => course.id === aliasId) ?? null;
}

function isCurrentApplicationRecord(application: Application) {
  const hasCourseSnapshot = Boolean(
    application.courseTitle?.trim() ||
      application.courseProgram?.trim() ||
      application.courseDuration?.trim()
  );

  return hasCourseSnapshot || CURATED_COURSES.some((course) => course.id === application.courseId);
}

// ─── Internal helpers ───────────────────────────────────────────────────────
export async function createAdminNotification(data: {
  type: 'application' | 'service' | 'account' | 'registration';
  message: string;
  referenceId: string;
  userId: string;
}): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.notifications), {
    ...data,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export interface AccountDeletionRequestInput {
  userId: string;
  email: string;
  fullName?: string;
  role?: string;
  reason?: string;
}

export interface AccountDeletionRequest {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: any;
  decidedAt?: any;
}

export async function createAccountDeletionRequest(
  input: AccountDeletionRequestInput
): Promise<void> {
  const fullName = input.fullName?.trim() || '';
  const email = input.email.trim();
  const role = input.role?.trim() || '';
  const reason = input.reason?.trim() || '';
  const docRef = await addDoc(collection(db, 'AccountDeletionRequests'), {
    userId: input.userId,
    email,
    fullName,
    role,
    reason,
    status: 'pending',
    requestedAt: serverTimestamp(),
  });

  await createAdminNotification({
    type: 'account',
    message: `${fullName || email} requested account deletion.`,
    referenceId: docRef.id,
    userId: input.userId,
  });
}

export function subscribeAccountDeletionRequests(
  callback: (requests: AccountDeletionRequest[]) => void
): () => void {
  const q = query(
    collection(db, 'AccountDeletionRequests'),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snap) => {
    const requests = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as AccountDeletionRequest));
    requests.sort((a, b) => {
      const aTime = typeof a.requestedAt?.toDate === 'function' ? a.requestedAt.toDate().getTime() : 0;
      const bTime = typeof b.requestedAt?.toDate === 'function' ? b.requestedAt.toDate().getTime() : 0;
      return bTime - aTime;
    });
    callback(requests);
  });
}

export async function approveAccountDeletionRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'AccountDeletionRequests', requestId), {
    status: 'approved',
    decidedAt: serverTimestamp(),
  });
}

export async function rejectAccountDeletionRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'AccountDeletionRequests', requestId), {
    status: 'rejected',
    decidedAt: serverTimestamp(),
  });
}

export async function hasPendingAccountDeletionRequest(userId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'AccountDeletionRequests'),
      where('userId', '==', userId),
      where('status', '==', 'pending'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.warn('hasPendingAccountDeletionRequest failed:', error);
    return false;
  }
}

// ─── Courses ────────────────────────────────────────────────────────────────
/**
 * Fetch all courses from Firestore
 */
export async function getCourses(): Promise<Course[]> {
  try {
    return CURATED_COURSES;
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch a single course by ID
 */
export async function getCourseById(courseId: string): Promise<Course | null> {
  try {
    const curatedCourse = CURATED_COURSES.find((course) => course.id === courseId);
    if (curatedCourse) {
      return curatedCourse;
    }

    return null;
  } catch (error) {
    throw error;
  }
}

// ─── Announcements ──────────────────────────────────────────────────────────
/**
 * Fetch all announcements from Firestore, ordered by newest first
 */
export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    let lastError: unknown;

    for (const orderField of ['CreatedAt', 'createdAt']) {
      try {
        const announcementsCollection = collection(db, COLLECTIONS.announcements);
        const q = query(
          announcementsCollection,
          orderBy(orderField, 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(q);

        const announcements: Announcement[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          announcements.push({
            id: doc.id,
            title: pickField<string>(data, 'title', 'Title') ?? '',
            detail: pickField<string>(data, 'detail', 'Detail') ?? '',
            urgent: pickField<boolean>(data, 'urgent', 'Urgent') ?? false,
            createdAt: pickField<any>(data, 'createdAt', 'CreatedAt'),
          });
        });

        return announcements;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  } catch (error) {
    throw error;
  }
}

/**
 * Real-time listener for announcements, newest first.
 * Returns the unsubscribe function.
 */
export function subscribeAnnouncements(
  callback: (announcements: Announcement[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTIONS.announcements),
    orderBy('CreatedAt', 'desc'),
    limit(20)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const announcements: Announcement[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: pickField<string>(data, 'title', 'Title') ?? '',
          detail: pickField<string>(data, 'detail', 'Detail') ?? '',
          urgent: pickField<boolean>(data, 'urgent', 'Urgent') ?? false,
          createdAt: pickField<any>(data, 'createdAt', 'CreatedAt'),
        };
      });
      callback(announcements);
    },
    () => callback([])
  );
}

/**
 * Create a new announcement in Firestore
 */
export async function createAnnouncement(input: AnnouncementInput): Promise<void> {
  try {
    const announcementsCollection = collection(db, COLLECTIONS.announcements);
    await addDoc(announcementsCollection, {
      Title: input.title.trim(),
      Detail: input.detail.trim(),
      Urgent: input.urgent,
      CreatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
}

// ─── Applications ───────────────────────────────────────────────────────────
/**
 * Fetch all applications for a specific user
 */
export async function getUserApplications(userId: string): Promise<Application[]> {
  try {
    let lastError: unknown;

    for (const attempt of [
      { userField: 'userId', orderField: 'submittedAt' },
      { userField: 'UserId', orderField: 'SubmittedAt' },
    ]) {
      try {
        const applicationsCollection = collection(db, COLLECTIONS.applications);
        const q = query(
          applicationsCollection,
          where(attempt.userField, '==', userId),
          orderBy(attempt.orderField, 'desc')
        );
        const snapshot = await getDocs(q);

        const applications: Application[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          applications.push({
            id: doc.id,
            userId: pickField<string>(data, 'userId', 'UserId') ?? '',
            courseId: pickField<string>(data, 'courseId', 'CourseId') ?? '',
            courseTitle: pickField<string>(data, 'courseTitle', 'CourseTitle'),
            courseProgram: pickField<string>(data, 'courseProgram', 'CourseProgram'),
            courseDuration: pickField<string>(data, 'courseDuration', 'CourseDuration'),
            fullName: pickField<string>(data, 'fullName', 'FullName'),
            email: pickField<string>(data, 'email', 'Email'),
            phone: pickField<string>(data, 'phone', 'Phone'),
            whatsapp: data.whatsapp,
            location: data.location,
            educationLevel: data.educationLevel,
            certificateLink: data.certificateLink,
            areaOfStudy: data.areaOfStudy,
            occupation: data.occupation,
            organization: data.organization,
            motivation: data.motivation,
            paymentMode: data.paymentMode,
            transactionRef: data.transactionRef,
            receiptLink: data.receiptLink,
            status: pickField<Application['status']>(data, 'status', 'Status') ?? 'pending',
            documents: pickField<string[]>(data, 'documents', 'Documents') ?? [],
            feedback: pickField<string>(data, 'feedback', 'Feedback') ?? '',
            submittedAt: pickField<any>(data, 'submittedAt', 'SubmittedAt'),
            decidedAt: pickField<any>(data, 'decidedAt', 'DecidedAt'),
            courseCompleted: data.courseCompleted ?? false,
            completedAt: data.completedAt,
          });
        });

        return applications.filter(isCurrentApplicationRecord);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  } catch (error) {
    throw error;
  }
}

/**
 * Real-time listener for a user's own applications.
 * Fires immediately and on every status change (e.g. pending → approved).
 * Returns the unsubscribe function.
 */
export function subscribeUserApplications(
  userId: string,
  callback: (applications: Application[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTIONS.applications),
    where('userId', '==', userId),
    orderBy('submittedAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const applications: Application[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId: pickField<string>(data, 'userId', 'UserId') ?? '',
            courseId: pickField<string>(data, 'courseId', 'CourseId') ?? '',
            courseTitle: pickField<string>(data, 'courseTitle', 'CourseTitle'),
            courseProgram: pickField<string>(data, 'courseProgram', 'CourseProgram'),
            courseDuration: pickField<string>(data, 'courseDuration', 'CourseDuration'),
            fullName: pickField<string>(data, 'fullName', 'FullName'),
            email: pickField<string>(data, 'email', 'Email'),
            phone: pickField<string>(data, 'phone', 'Phone'),
            whatsapp: data.whatsapp,
            location: data.location,
            educationLevel: data.educationLevel,
            certificateLink: data.certificateLink,
            areaOfStudy: data.areaOfStudy,
            occupation: data.occupation,
            organization: data.organization,
            motivation: data.motivation,
            paymentMode: data.paymentMode,
            transactionRef: data.transactionRef,
            receiptLink: data.receiptLink,
            status: pickField<Application['status']>(data, 'status', 'Status') ?? 'pending',
            documents: pickField<string[]>(data, 'documents', 'Documents') ?? [],
            feedback: pickField<string>(data, 'feedback', 'Feedback') ?? '',
            submittedAt: pickField<any>(data, 'submittedAt', 'SubmittedAt'),
            decidedAt: pickField<any>(data, 'decidedAt', 'DecidedAt'),
            courseCompleted: data.courseCompleted ?? false,
            completedAt: data.completedAt,
            paymentStatus: data.paymentStatus ?? 'partial',
            accessLocked: data.accessLocked ?? false,
            certificateUrl: data.certificateUrl,
          };
        })
        .filter(isCurrentApplicationRecord);
      callback(applications);
    },
    () => callback([])
  );
}

/**
 * Fetch a single application by ID
 */
export async function getApplicationById(applicationId: string): Promise<Application | null> {
  try {
    const applicationsCollection = collection(db, COLLECTIONS.applications);
    const q = query(applicationsCollection, where('__name__', '==', applicationId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      userId: pickField<string>(data, 'userId', 'UserId') ?? '',
      courseId: pickField<string>(data, 'courseId', 'CourseId') ?? '',
      courseTitle: pickField<string>(data, 'courseTitle', 'CourseTitle'),
      courseProgram: pickField<string>(data, 'courseProgram', 'CourseProgram'),
      courseDuration: pickField<string>(data, 'courseDuration', 'CourseDuration'),
      fullName: pickField<string>(data, 'fullName', 'FullName'),
      email: pickField<string>(data, 'email', 'Email'),
      phone: pickField<string>(data, 'phone', 'Phone'),
      whatsapp: data.whatsapp,
      location: data.location,
      educationLevel: data.educationLevel,
      certificateLink: data.certificateLink,
      areaOfStudy: data.areaOfStudy,
      occupation: data.occupation,
      organization: data.organization,
      motivation: data.motivation,
      paymentMode: data.paymentMode,
      status: pickField<Application['status']>(data, 'status', 'Status') ?? 'pending',
      documents: pickField<string[]>(data, 'documents', 'Documents') ?? [],
      feedback: pickField<string>(data, 'feedback', 'Feedback') ?? '',
      submittedAt: pickField<any>(data, 'submittedAt', 'SubmittedAt'),
      decidedAt: pickField<any>(data, 'decidedAt', 'DecidedAt'),
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Create a new training application
 */
export async function createApplication(input: ApplicationInput): Promise<void> {
  try {
    const applicationsCollection = collection(db, COLLECTIONS.applications);
    const docRef = await addDoc(applicationsCollection, {
      userId: input.userId,
      courseId: input.courseId,
      courseTitle: input.courseTitle.trim(),
      courseProgram: input.courseProgram.trim(),
      courseDuration: input.courseDuration.trim(),
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      whatsapp: input.whatsapp?.trim() ?? '',
      location: input.location?.trim() ?? '',
      educationLevel: input.educationLevel?.trim() ?? '',
      certificateLink: input.certificateLink?.trim() ?? '',
      areaOfStudy: input.areaOfStudy?.trim() ?? '',
      occupation: input.occupation?.trim() ?? '',
      organization: input.organization?.trim() ?? '',
      motivation: input.motivation?.trim() ?? '',
      paymentMode: input.paymentMode?.trim() ?? '',
      transactionRef: input.transactionRef?.trim() ?? '',
      receiptLink: input.receiptLink?.trim() ?? '',
      status: 'pending',
      documents: [],
      feedback: input.message?.trim() ?? '',
      submittedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    createAdminNotification({
      type: 'application',
      message: `New application from ${input.fullName.trim()} for ${input.courseTitle.trim()}`,
      referenceId: docRef.id,
      userId: input.userId,
    }).catch(() => {});
  } catch (error) {
    throw error;
  }
}

export async function deleteApplication(applicationId: string): Promise<void> {
  const appSnap = await getDoc(doc(db, COLLECTIONS.applications, applicationId));
  if (appSnap.exists()) {
    const data = appSnap.data();
    const userId = pickField<string>(data, 'userId', 'UserId') ?? '';
    const courseId = pickField<string>(data, 'courseId', 'CourseId') ?? '';
    if (userId && courseId) {
      const progressQ = query(
        collection(db, 'LearningProgress'),
        where('userId', '==', userId),
        where('courseId', '==', courseId)
      );
      const progressSnap = await getDocs(progressQ);
      for (const d of progressSnap.docs) {
        await deleteDoc(d.ref);
      }
    }
  }
  await deleteDoc(doc(db, COLLECTIONS.applications, applicationId));
}

export async function withdrawApplication(applicationId: string): Promise<void> {
  const applicationDoc = doc(db, COLLECTIONS.applications, applicationId);
  const applicationSnap = await getDoc(applicationDoc);

  if (!applicationSnap.exists()) return;

  const data = applicationSnap.data();
  const fullName = pickField<string>(data, 'fullName', 'FullName')?.trim() || 'An applicant';
  const courseTitle = pickField<string>(data, 'courseTitle', 'CourseTitle')?.trim() || 'a course';
  const userId = pickField<string>(data, 'userId', 'UserId') ?? '';

  // Mark as withdrawn so admin can still see it in the Admissions panel
  await updateDoc(applicationDoc, {
    status: 'withdrawn',
    withdrawnAt: serverTimestamp(),
  });

  await createAdminNotification({
    type: 'application',
    message: `${fullName} withdrew their application for ${courseTitle}.`,
    referenceId: applicationId,
    userId,
  });
}

// ─── Services ───────────────────────────────────────────────────────────────
/**
 * Fetch all services (ADR requests) for a specific user
 */
export async function getUserServices(userId: string): Promise<Service[]> {
  try {
    let lastError: unknown;

    for (const attempt of [
      { userField: 'userId', orderField: 'createdAt' },
      { userField: 'UserId', orderField: 'CreatedAt' },
    ]) {
      try {
        const servicesCollection = collection(db, COLLECTIONS.services);
        const q = query(
          servicesCollection,
          where(attempt.userField, '==', userId),
          orderBy(attempt.orderField, 'desc')
        );
        const snapshot = await getDocs(q);

        const services: Service[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          services.push({
            id: doc.id,
            userId: pickField<string>(data, 'userId', 'UserId') ?? '',
            serviceType: pickField<Service['serviceType']>(data, 'serviceType', 'ServiceType') ?? 'mediation',
            category: pickField<string>(data, 'category', 'Category') ?? '',
            caseDetails: pickField<string>(data, 'caseDetails', 'CaseDetails') ?? '',
            documents: pickField<string[]>(data, 'documents', 'Documents') ?? [],
            status: pickField<Service['status']>(data, 'status', 'Status') ?? 'submitted',
            mediatorAssigned: pickField<string>(data, 'mediatorAssigned', 'MediatorAssigned') ?? '',
            createdAt: pickField<any>(data, 'createdAt', 'CreatedAt'),
            updatedAt: pickField<any>(data, 'updatedAt', 'UpdatedAt'),
          });
        });

        return services;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  } catch (error) {
    throw error;
  }
}

export function subscribeUserServices(
  userId: string,
  callback: (services: Service[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTIONS.services),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const services = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId: pickField<string>(data, 'userId', 'UserId') ?? '',
            serviceType: pickField<Service['serviceType']>(data, 'serviceType', 'ServiceType') ?? 'mediation',
            category: pickField<string>(data, 'category', 'Category') ?? '',
            caseDetails: pickField<string>(data, 'caseDetails', 'CaseDetails') ?? '',
            documents: pickField<string[]>(data, 'documents', 'Documents') ?? [],
            status: pickField<Service['status']>(data, 'status', 'Status') ?? 'submitted',
            mediatorAssigned: pickField<string>(data, 'mediatorAssigned', 'MediatorAssigned') ?? '',
            mediatorName: pickField<string>(data, 'mediatorName') ?? '',
            mediatorNote: pickField<string>(data, 'mediatorNote') ?? '',
            meetingLink: pickField<string>(data, 'meetingLink') ?? '',
            scheduledDate: pickField<any>(data, 'scheduledDate'),
            resolution: pickField<string>(data, 'resolution') ?? '',
            statusUpdatedAt: pickField<any>(data, 'statusUpdatedAt'),
            createdAt: pickField<any>(data, 'createdAt', 'CreatedAt'),
            updatedAt: pickField<any>(data, 'updatedAt', 'UpdatedAt'),
          };
        })
        .sort((a, b) => {
          const aDate = a.createdAt;
          const bDate = b.createdAt;
          const aTime =
            typeof aDate?.toDate === 'function'
              ? aDate.toDate().getTime()
              : new Date(aDate ?? 0).getTime();
          const bTime =
            typeof bDate?.toDate === 'function'
              ? bDate.toDate().getTime()
              : new Date(bDate ?? 0).getTime();

          return bTime - aTime;
        });

      callback(services);
    },
    () => callback([])
  );
}

/**
 * Fetch all services by status
 */
export async function getServicesByStatus(status: string): Promise<Service[]> {
  try {
    let lastError: unknown;

    for (const statusField of ['status', 'Status']) {
      try {
        const servicesCollection = collection(db, COLLECTIONS.services);
        const q = query(servicesCollection, where(statusField, '==', status));
        const snapshot = await getDocs(q);

        const services: Service[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          services.push({
            id: doc.id,
            userId: pickField<string>(data, 'userId', 'UserId') ?? '',
            serviceType: pickField<Service['serviceType']>(data, 'serviceType', 'ServiceType') ?? 'mediation',
            category: pickField<string>(data, 'category', 'Category') ?? '',
            caseDetails: pickField<string>(data, 'caseDetails', 'CaseDetails') ?? '',
            documents: pickField<string[]>(data, 'documents', 'Documents') ?? [],
            status: pickField<Service['status']>(data, 'status', 'Status') ?? 'submitted',
            mediatorAssigned: pickField<string>(data, 'mediatorAssigned', 'MediatorAssigned') ?? '',
            createdAt: pickField<any>(data, 'createdAt', 'CreatedAt'),
            updatedAt: pickField<any>(data, 'updatedAt', 'UpdatedAt'),
          });
        });

        return services;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  } catch (error) {
    throw error;
  }
}

/**
 * Create a new ADR service request
 */
export async function createService(input: ServiceInput): Promise<void> {
  try {
    const servicesCollection = collection(db, COLLECTIONS.services);
    const docRef = await addDoc(servicesCollection, {
      userId: input.userId,
      clientName: input.clientName ?? '',
      clientEmail: input.clientEmail ?? '',
      serviceType: input.serviceType,
      category: input.category.trim(),
      caseDetails: input.caseDetails.trim(),
      documents: [],
      status: 'submitted',
      mediatorAssigned: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    createAdminNotification({
      type: 'service',
      message: `New ${input.serviceType} request — category: ${input.category.trim()}`,
      referenceId: docRef.id,
      userId: input.userId,
    }).catch(() => {});
  } catch (error) {
    throw error;
  }
}

// ─── Student: Learning Progress ──────────────────────────────────────────────
export interface LearningProgress {
  id: string;
  userId: string;
  courseId: string;
  completedModules: string[];
  totalModules: number;
  progressPercentage: number;
  lastAccessed: any;
}

export async function getLearningProgress(
  userId: string,
  courseId: string
): Promise<LearningProgress | null> {
  try {
    const col = collection(db, 'LearningProgress');
    const q = query(col, where('userId', '==', userId), where('courseId', '==', courseId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId ?? '',
      courseId: data.courseId ?? '',
      completedModules: data.completedModules ?? [],
      totalModules: data.totalModules ?? 0,
      progressPercentage: data.progressPercentage ?? 0,
      lastAccessed: data.lastAccessed,
    };
  } catch (error) {
    console.error('getLearningProgress failed:', error);
    return null;
  }
}

// ─── Student: Materials ──────────────────────────────────────────────────────
export interface Material {
  id: string;
  courseId: string;
  moduleId: string;
  moduleTitle: string;
  title: string;
  type: 'pdf' | 'video' | 'doc' | 'link';
  fileUrl: string;
  uploadDate: any;
  order: number;
}

export function subscribeMaterials(
  courseId: string,
  callback: (materials: Material[]) => void
): () => void {
  const q = query(
    collection(db, 'Materials'),
    where('courseId', '==', courseId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const materials: Material[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            courseId: data.courseId ?? '',
            moduleId: data.moduleId ?? '',
            moduleTitle: data.moduleTitle ?? '',
            title: data.title ?? '',
            type: data.type ?? 'link',
            fileUrl: data.fileUrl ?? '',
            uploadDate: data.uploadDate,
            order: data.order ?? 0,
          };
        })
        .sort((a, b) => a.order - b.order);
      callback(materials);
    },
    () => callback([])
  );
}

export async function getMaterials(courseId: string): Promise<Material[]> {
  try {
    const col = collection(db, 'Materials');
    const q = query(col, where('courseId', '==', courseId), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const materials: Material[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      materials.push({
        id: doc.id,
        courseId: data.courseId ?? '',
        moduleId: data.moduleId ?? '',
        moduleTitle: data.moduleTitle ?? '',
        title: data.title ?? '',
        type: data.type ?? 'pdf',
        fileUrl: data.fileUrl ?? '',
        uploadDate: data.uploadDate,
        order: data.order ?? 0,
      });
    });
    return materials;
  } catch (error) {
    console.error('getMaterials failed:', error);
    return [];
  }
}

// ─── Student: Assignments ────────────────────────────────────────────────────
export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  deadline: any;
  maxGrade: number;
  fileUrl?: string;
  submittedAt?: any;
  submissionText?: string;
  attachmentLink?: string;
  grade?: number;
  feedback?: string;
  status: 'pending' | 'submitted' | 'graded';
}

export interface AssignmentSubmissionInput {
  assignmentId: string;
  userId: string;
  courseId: string;
  submissionText?: string;
  attachmentLink?: string;
  studentName?: string;
  studentEmail?: string;
}

export function subscribeAssignments(
  userId: string,
  courseId: string,
  callback: (assignments: Assignment[]) => void
): () => void {
  const q = query(
    collection(db, 'Assignments'),
    where('courseId', '==', courseId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const assignments: Assignment[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const userSub = data[`sub_${userId}`];
        return {
          id: docSnap.id,
          courseId: data.courseId ?? '',
          title: data.title ?? '',
          description: data.description ?? '',
          deadline: data.deadline,
          maxGrade: data.maxGrade ?? 100,
          fileUrl: data.fileUrl ?? '',
          submittedAt: userSub?.submittedAt,
          submissionText: userSub?.text,
          attachmentLink: userSub?.attachmentLink,
          grade: userSub?.grade,
          feedback: userSub?.feedback,
          status: userSub?.grade != null ? 'graded' : userSub ? 'submitted' : 'pending',
        };
      });
      assignments.sort((a, b) => {
        const at = typeof a.deadline?.toDate === 'function' ? a.deadline.toDate().getTime() : 0;
        const bt = typeof b.deadline?.toDate === 'function' ? b.deadline.toDate().getTime() : 0;
        return at - bt;
      });
      callback(assignments);
    },
    () => callback([])
  );
}

export async function getAssignments(userId: string, courseId: string): Promise<Assignment[]> {
  try {
    const col = collection(db, 'Assignments');
    const q = query(col, where('courseId', '==', courseId), orderBy('deadline', 'asc'));
    const snapshot = await getDocs(q);
    const assignments: Assignment[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const userSub = data[`sub_${userId}`];
      assignments.push({
        id: doc.id,
        courseId: data.courseId ?? '',
        title: data.title ?? '',
        description: data.description ?? '',
        deadline: data.deadline,
        maxGrade: data.maxGrade ?? 100,
        submittedAt: userSub?.submittedAt,
        submissionText: userSub?.text,
        attachmentLink: userSub?.attachmentLink,
        grade: userSub?.grade,
        feedback: userSub?.feedback,
        status: userSub?.grade != null ? 'graded' : userSub ? 'submitted' : 'pending',
      });
    });
    return assignments;
  } catch (error) {
    console.error('getAssignments failed:', error);
    return [];
  }
}

export async function submitAssignment(input: AssignmentSubmissionInput): Promise<void> {
  const submissionText = input.submissionText?.trim() || '';
  const attachmentLink = input.attachmentLink?.trim() || '';
  const col = collection(db, 'AssignmentSubmissions');
  await addDoc(col, {
    assignmentId: input.assignmentId,
    userId: input.userId,
    courseId: input.courseId,
    submissionText,
    attachmentLink,
    studentName: input.studentName?.trim() || '',
    studentEmail: input.studentEmail?.trim() || '',
    submittedAt: serverTimestamp(),
    status: 'submitted',
  });
  await updateDoc(doc(db, 'Assignments', input.assignmentId), {
    [`sub_${input.userId}`]: {
      text: submissionText,
      attachmentLink,
      studentName: input.studentName?.trim() || '',
      studentEmail: input.studentEmail?.trim() || '',
      submittedAt: serverTimestamp(),
    },
  });
}

// ─── Student: Tests ──────────────────────────────────────────────────────────
export interface Test {
  id: string;
  courseId: string;
  title: string;
  description: string;
  scheduledDate: any;
  durationMinutes: number;
  totalMarks: number;
  passMark: number;
  fileUrl?: string;
  submittedAt?: any;
  submissionText?: string;
  attachmentLink?: string;
  feedback?: string;
  score?: number;
  status: 'upcoming' | 'submitted' | 'graded' | 'completed' | 'missed';
}

export interface TestSubmissionInput {
  testId: string;
  userId: string;
  courseId: string;
  submissionText?: string;
  attachmentLink?: string;
  studentName?: string;
  studentEmail?: string;
}

export function subscribeTests(
  userId: string,
  courseId: string,
  callback: (tests: Test[]) => void
): () => void {
  const q = query(
    collection(db, 'Tests'),
    where('courseId', '==', courseId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const tests: Test[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          const userSub = data[`sub_${userId}`];
          const baseStatus = data.status ?? 'upcoming';
          const status =
            userSub?.score != null
              ? 'graded'
              : userSub
              ? 'submitted'
              : baseStatus;
          return {
            id: docSnap.id,
            courseId: data.courseId ?? '',
            title: data.title ?? '',
            description: data.description ?? '',
            scheduledDate: data.scheduledDate,
            durationMinutes: data.durationMinutes ?? 60,
            totalMarks: data.totalMarks ?? 100,
            passMark: data.passMark ?? 50,
            fileUrl: data.fileUrl ?? '',
            submittedAt: userSub?.submittedAt,
            submissionText: userSub?.text,
            attachmentLink: userSub?.attachmentLink,
            feedback: userSub?.feedback,
            score: userSub?.score ?? data.score,
            status,
          };
        })
        .sort((a, b) => {
          const at = typeof a.scheduledDate?.toDate === 'function' ? a.scheduledDate.toDate().getTime() : 0;
          const bt = typeof b.scheduledDate?.toDate === 'function' ? b.scheduledDate.toDate().getTime() : 0;
          return at - bt;
        });
      callback(tests);
    },
    () => callback([])
  );
}

export async function getTests(courseId: string): Promise<Test[]> {
  try {
    const col = collection(db, 'Tests');
    const q = query(col, where('courseId', '==', courseId), orderBy('scheduledDate', 'asc'));
    const snapshot = await getDocs(q);
    const tests: Test[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      tests.push({
        id: doc.id,
        courseId: data.courseId ?? '',
        title: data.title ?? '',
        description: data.description ?? '',
        scheduledDate: data.scheduledDate,
        durationMinutes: data.durationMinutes ?? 60,
        totalMarks: data.totalMarks ?? 100,
        passMark: data.passMark ?? 50,
        score: data.score,
        status: data.status ?? 'upcoming',
      });
    });
    return tests;
  } catch (error) {
    console.error('getTests failed:', error);
    return [];
  }
}

export async function submitTest(input: TestSubmissionInput): Promise<void> {
  const text = input.submissionText?.trim() || '';
  const attachmentLink = input.attachmentLink?.trim() || '';
  await addDoc(collection(db, 'TestSubmissions'), {
    testId: input.testId,
    userId: input.userId,
    courseId: input.courseId,
    submissionText: text,
    attachmentLink,
    studentName: input.studentName?.trim() || '',
    studentEmail: input.studentEmail?.trim() || '',
    submittedAt: serverTimestamp(),
    status: 'submitted',
  });
  await updateDoc(doc(db, 'Tests', input.testId), {
    [`sub_${input.userId}`]: {
      text,
      attachmentLink,
      studentName: input.studentName?.trim() || '',
      studentEmail: input.studentEmail?.trim() || '',
      submittedAt: serverTimestamp(),
    },
  });
}

// ─── Student: Certificates ───────────────────────────────────────────────────
export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  program: string;
  issueDate: any;
  certificateUrl: string;
  credentialId: string;
}

export async function getCertificates(userId: string): Promise<Certificate[]> {
  try {
    const col = collection(db, 'Certificates');
    const q = query(col, where('userId', '==', userId), orderBy('issueDate', 'desc'));
    const snapshot = await getDocs(q);
    const certificates: Certificate[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      certificates.push({
        id: doc.id,
        userId: data.userId ?? '',
        courseId: data.courseId ?? '',
        courseTitle: data.courseTitle ?? '',
        program: data.program ?? '',
        issueDate: data.issueDate,
        certificateUrl: data.certificateUrl ?? '',
        credentialId: data.credentialId ?? '',
      });
    });
    return certificates;
  } catch (error) {
    console.error('getCertificates failed:', error);
    return [];
  }
}

export async function issueCertificate(params: {
  applicationId: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  program: string;
  studentName: string;
  certificateUrl: string;
}): Promise<string> {
  const credentialId = `GIAC-${params.courseId.toUpperCase().slice(0, 6)}-${Date.now().toString(36).toUpperCase()}`;
  const docRef = await addDoc(collection(db, 'Certificates'), {
    userId: params.userId,
    courseId: params.courseId,
    courseTitle: params.courseTitle,
    program: params.program,
    issueDate: serverTimestamp(),
    certificateUrl: params.certificateUrl,
    credentialId,
  });
  await updateDoc(doc(db, COLLECTIONS.applications, params.applicationId), {
    certificateUrl: params.certificateUrl,
  });
  createStudentNotification(
    params.userId,
    `Your certificate for "${params.courseTitle}" is ready. Tap to download.`,
    'certificate_issued',
    docRef.id
  ).catch(() => {});
  return credentialId;
}

export async function deleteCertificate(
  applicationId: string,
  userId: string,
  courseId: string
): Promise<void> {
  const q = query(
    collection(db, 'Certificates'),
    where('userId', '==', userId),
    where('courseId', '==', courseId)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  // Revert to enrolled state — student goes back to learning until cert is re-issued
  await updateDoc(doc(db, COLLECTIONS.applications, applicationId), {
    certificateUrl: deleteField(),
    courseCompleted: false,
    status: 'approved',
    completedAt: deleteField(),
  });
}

// ─── Course Registration ──────────────────────────────────────────────────────
export interface CourseRegistration {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  courseInterest: 'pecadr' | 'pemadr';
  status: 'pending' | 'letter_sent' | 'accepted' | 'rejected' | 'declined';
  studentNumber: string;
  letterUrl?: string;
  submittedAt: any;
  updatedAt: any;
}

export async function createCourseRegistration(input: {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  courseInterest: 'pecadr' | 'pemadr';
}): Promise<void> {
  const docRef = await addDoc(collection(db, 'CourseRegistrations'), {
    userId: input.userId,
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    courseInterest: input.courseInterest,
    status: 'pending',
    studentNumber: '',
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  createAdminNotification({
    type: 'registration',
    message: `${input.fullName.trim()} submitted a course registration for ${input.courseInterest.toUpperCase()}.`,
    referenceId: docRef.id,
    userId: input.userId,
  }).catch(() => {});
}

export function subscribeUserRegistration(
  userId: string,
  callback: (reg: CourseRegistration | null) => void
): () => void {
  const q = query(collection(db, 'CourseRegistrations'), where('userId', '==', userId));
  return onSnapshot(q, (snap) => {
    if (snap.empty) { callback(null); return; }
    const d = snap.docs[0];
    callback({ id: d.id, ...d.data() } as CourseRegistration);
  }, () => callback(null));
}

export function subscribePendingRegistrations(
  callback: (regs: CourseRegistration[]) => void
): () => void {
  const q = query(collection(db, 'CourseRegistrations'), where('status', '==', 'pending'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CourseRegistration)));
  });
}

export function subscribeAllRegistrations(
  callback: (regs: CourseRegistration[]) => void
): () => void {
  return onSnapshot(collection(db, 'CourseRegistrations'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CourseRegistration)));
  });
}

export async function sendAdmissionLetter(
  registrationId: string,
  userId: string,
  studentNumber: string,
  studentName: string,
  courseInterest: string,
  letterUrl?: string,
): Promise<void> {
  await updateDoc(doc(db, 'CourseRegistrations', registrationId), {
    status: 'letter_sent',
    studentNumber: studentNumber.trim(),
    ...(letterUrl ? { letterUrl } : {}),
    updatedAt: serverTimestamp(),
  });
  await createStudentNotification(
    userId,
    `Congratulations ${studentName}! Your student number is ${studentNumber}. Tap to accept your admission and begin your ${courseInterest.toUpperCase()} journey.`,
    'admission_letter',
    registrationId,
  );
}

export async function acceptAdmissionLetter(registrationId: string): Promise<void> {
  await updateDoc(doc(db, 'CourseRegistrations', registrationId), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
}

export async function declineAdmissionLetter(registrationId: string): Promise<void> {
  await updateDoc(doc(db, 'CourseRegistrations', registrationId), {
    status: 'declined',
    updatedAt: serverTimestamp(),
  });
}

export async function rejectRegistration(registrationId: string): Promise<void> {
  await updateDoc(doc(db, 'CourseRegistrations', registrationId), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export async function getApprovedApplications(userId: string): Promise<Application[]> {
  const apps = await getUserApplications(userId);
  return apps.filter((a) => a.status === 'approved');
}

export async function getActiveApplications(userId: string): Promise<Application[]> {
  const apps = await getUserApplications(userId);
  return apps.filter((a) => a.status === 'approved' || a.status === 'completed');
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
  createdAt: any;
}

export async function getAllUsers(): Promise<UserRecord[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.users));
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      fullName: data.fullName ?? '',
      email: data.email ?? '',
      role: normalizeUserRole(data.role),
      phone: data.phone ?? '',
      createdAt: data.createdAt,
    };
  });
}

export function getAllPendingApplications(
  callback: (applications: Application[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTIONS.applications),
    where('status', '==', 'pending'),
    orderBy('submittedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const applications: Application[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: pickField<string>(data, 'userId', 'UserId') ?? '',
        courseId: pickField<string>(data, 'courseId', 'CourseId') ?? '',
        courseTitle: pickField<string>(data, 'courseTitle', 'CourseTitle'),
        courseProgram: pickField<string>(data, 'courseProgram', 'CourseProgram'),
        courseDuration: pickField<string>(data, 'courseDuration', 'CourseDuration'),
        fullName: pickField<string>(data, 'fullName', 'FullName'),
        email: pickField<string>(data, 'email', 'Email'),
        phone: pickField<string>(data, 'phone', 'Phone'),
        whatsapp: data.whatsapp,
        location: data.location,
        educationLevel: data.educationLevel,
        certificateLink: data.certificateLink,
        areaOfStudy: data.areaOfStudy,
        occupation: data.occupation,
        organization: data.organization,
        motivation: data.motivation,
        paymentMode: data.paymentMode,
        status: 'pending' as const,
        documents: pickField<string[]>(data, 'documents', 'Documents') ?? [],
        feedback: pickField<string>(data, 'feedback', 'Feedback') ?? '',
        submittedAt: pickField<any>(data, 'submittedAt', 'SubmittedAt'),
        decidedAt: pickField<any>(data, 'decidedAt', 'DecidedAt'),
      };
    });
    callback(applications);
  });
}

export function subscribeAllApplications(
  callback: (applications: Application[]) => void
): () => void {
  return onSnapshot(
    collection(db, COLLECTIONS.applications),
    (snapshot) => {
      const applications: Application[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId: pickField<string>(data, 'userId', 'UserId') ?? '',
            courseId: pickField<string>(data, 'courseId', 'CourseId') ?? '',
            courseTitle: pickField<string>(data, 'courseTitle', 'CourseTitle'),
            courseProgram: pickField<string>(data, 'courseProgram', 'CourseProgram'),
            courseDuration: pickField<string>(data, 'courseDuration', 'CourseDuration'),
            fullName: pickField<string>(data, 'fullName', 'FullName'),
            email: pickField<string>(data, 'email', 'Email'),
            phone: pickField<string>(data, 'phone', 'Phone'),
            whatsapp: data.whatsapp,
            location: data.location,
            educationLevel: data.educationLevel,
            certificateLink: data.certificateLink,
            areaOfStudy: data.areaOfStudy,
            occupation: data.occupation,
            organization: data.organization,
            motivation: data.motivation,
            paymentMode: data.paymentMode,
            transactionRef: data.transactionRef,
            receiptLink: data.receiptLink,
            status: pickField<Application['status']>(data, 'status', 'Status') ?? 'pending',
            documents: pickField<string[]>(data, 'documents', 'Documents') ?? [],
            feedback: pickField<string>(data, 'feedback', 'Feedback') ?? '',
            submittedAt: pickField<any>(data, 'submittedAt', 'SubmittedAt'),
            decidedAt: pickField<any>(data, 'decidedAt', 'DecidedAt'),
            courseCompleted: data.courseCompleted ?? false,
            completedAt: data.completedAt,
            paymentStatus: data.paymentStatus ?? 'partial',
            accessLocked: data.accessLocked ?? false,
            certificateUrl: data.certificateUrl,
          };
        })
        .filter(isCurrentApplicationRecord)
        .sort((a, b) => {
          const aDate = pickField<any>(a as Record<string, any>, 'submittedAt', 'SubmittedAt');
          const bDate = pickField<any>(b as Record<string, any>, 'submittedAt', 'SubmittedAt');
          const aTime =
            typeof aDate?.toDate === 'function'
              ? aDate.toDate().getTime()
              : new Date(aDate ?? 0).getTime();
          const bTime =
            typeof bDate?.toDate === 'function'
              ? bDate.toDate().getTime()
              : new Date(bDate ?? 0).getTime();

          return bTime - aTime;
        });

      callback(applications);
    },
    () => callback([])
  );
}

export function subscribeAllServices(
  callback: (services: Service[]) => void
): () => void {
  return onSnapshot(
    collection(db, COLLECTIONS.services),
    (snapshot) => {
      const services: Service[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            userId: pickField<string>(data, 'userId', 'UserId') ?? '',
            clientName: data.clientName ?? '',
            clientEmail: data.clientEmail ?? '',
            serviceType: pickField<Service['serviceType']>(data, 'serviceType', 'ServiceType') ?? 'mediation',
            category: pickField<string>(data, 'category', 'Category') ?? '',
            caseDetails: pickField<string>(data, 'caseDetails', 'CaseDetails') ?? '',
            documents: pickField<string[]>(data, 'documents', 'Documents') ?? [],
            status: pickField<Service['status']>(data, 'status', 'Status') ?? 'submitted',
            mediatorAssigned: pickField<string>(data, 'mediatorAssigned', 'MediatorAssigned') ?? '',
            mediatorName: pickField<string>(data, 'mediatorName') ?? '',
            mediatorNote: pickField<string>(data, 'mediatorNote') ?? '',
            meetingLink: pickField<string>(data, 'meetingLink') ?? '',
            scheduledDate: pickField<any>(data, 'scheduledDate'),
            resolution: pickField<string>(data, 'resolution') ?? '',
            statusUpdatedAt: pickField<any>(data, 'statusUpdatedAt'),
            createdAt: pickField<any>(data, 'createdAt', 'CreatedAt'),
            updatedAt: pickField<any>(data, 'updatedAt', 'UpdatedAt'),
          };
        })
        .sort((a, b) => {
          const aDate = pickField<any>(a as Record<string, any>, 'createdAt', 'CreatedAt');
          const bDate = pickField<any>(b as Record<string, any>, 'createdAt', 'CreatedAt');
          const aTime =
            typeof aDate?.toDate === 'function'
              ? aDate.toDate().getTime()
              : new Date(aDate ?? 0).getTime();
          const bTime =
            typeof bDate?.toDate === 'function'
              ? bDate.toDate().getTime()
              : new Date(bDate ?? 0).getTime();

          return bTime - aTime;
        });

      callback(services);
    },
    () => callback([])
  );
}

export function isPaymentLocked(application: Application): boolean {
  return application.accessLocked === true;
}

export async function updatePaymentStatus(
  applicationId: string,
  status: 'partial' | 'full'
): Promise<void> {
  const update: Record<string, unknown> = { paymentStatus: status };
  if (status === 'full') update.accessLocked = false;
  await updateDoc(doc(db, COLLECTIONS.applications, applicationId), update);
}

export async function toggleAccessLock(
  applicationId: string,
  locked: boolean
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.applications, applicationId), { accessLocked: locked });
}

export async function approveApplication(
  applicationId: string,
  userId: string,
  courseTitle?: string,
  courseId?: string
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, COLLECTIONS.applications, applicationId), {
    status: 'approved',
    decidedAt: serverTimestamp(),
    courseCompleted: false,
    completedAt: null,
    paymentStatus: 'partial',
    accessLocked: false,
  });
  if (userId) {
    batch.set(doc(db, COLLECTIONS.users, userId), { role: 'student' }, { merge: true });
  }
  await batch.commit();

  // Reset any existing learning progress so new enrolments always start at 0%
  if (userId && courseId) {
    const progressQ = query(
      collection(db, 'LearningProgress'),
      where('userId', '==', userId),
      where('courseId', '==', courseId)
    );
    const snap = await getDocs(progressQ);
    if (snap.empty) {
      await addDoc(collection(db, 'LearningProgress'), {
        userId,
        courseId,
        progressPercentage: 0,
        completedModules: [],
        totalModules: 0,
        lastAccessed: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'LearningProgress', snap.docs[0].id), {
        progressPercentage: 0,
      });
    }
  }

  if (userId) {
    const msg = courseTitle
      ? `Your application for ${courseTitle} has been approved. Welcome to GIAC!`
      : 'Your application has been approved. Welcome to GIAC!';
    createStudentNotification(userId, msg, 'application_approved', applicationId).catch(() => {});
  }
}

export async function rejectApplication(
  applicationId: string,
  feedback?: string,
  userId?: string,
  courseTitle?: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.applications, applicationId), {
    status: 'rejected',
    feedback: feedback?.trim() ?? '',
    decidedAt: serverTimestamp(),
  });
  if (userId) {
    const msg = courseTitle
      ? `Your application for ${courseTitle} was not approved at this time.${feedback ? ` Feedback: ${feedback.trim()}` : ''}`
      : `Your application was not approved at this time.${feedback ? ` Feedback: ${feedback.trim()}` : ''}`;
    createStudentNotification(userId, msg, 'application_rejected', applicationId).catch(() => {});
  }
}

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.users, userId), { role });
}

export async function updateUserPushToken(uid: string, pushToken: string): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.users, uid),
    {
      pushToken,
      pushTokenUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeAdminNotifications(
  callback: (notifications: AdminNotification[]) => void
): () => void {
  // orderBy alone — no composite index needed; filter read===false client-side
  const q = query(
    collection(db, COLLECTIONS.notifications),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const notifications: AdminNotification[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: data.type,
            message: data.message,
            referenceId: data.referenceId,
            userId: data.userId,
            read: data.read ?? false,
            createdAt: data.createdAt,
          };
        })
        .filter((n) => !n.read);
      callback(notifications);
    },
    () => callback([])
  );
}

export async function markAdminNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const batch = writeBatch(db);
  for (const id of ids) {
    batch.update(doc(db, COLLECTIONS.notifications, id), { read: true });
  }
  await batch.commit();
}

export async function updateServiceRequest(
  serviceId: string,
  updates: {
    mediatorAssigned?: string;
    mediatorName?: string;
    mediatorNote?: string;
    scheduledDate?: string;
    resolution?: string;
    status?: Service['status'];
  }
): Promise<void> {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (updates.mediatorAssigned !== undefined) payload.mediatorAssigned = updates.mediatorAssigned.trim();
  if (updates.mediatorName !== undefined) payload.mediatorName = updates.mediatorName.trim();
  if (updates.mediatorNote !== undefined) payload.mediatorNote = updates.mediatorNote.trim();
  if (updates.scheduledDate !== undefined) payload.scheduledDate = updates.scheduledDate;
  if (updates.resolution !== undefined) payload.resolution = updates.resolution.trim();
  if (updates.status !== undefined) { payload.status = updates.status; payload.statusUpdatedAt = serverTimestamp(); }
  await updateDoc(doc(db, COLLECTIONS.services, serviceId), payload);
}

export async function deleteService(serviceId: string): Promise<void> {
  // Delete the service document
  await deleteDoc(doc(db, COLLECTIONS.services, serviceId));

  // Delete all chat messages for this case
  const messagesSnap = await getDocs(
    query(collection(db, 'CaseMessages'), where('caseId', '==', serviceId))
  );
  if (!messagesSnap.empty) {
    const batch = writeBatch(db);
    messagesSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // Delete any student notifications that referenced this case
  const notifsSnap = await getDocs(
    query(collection(db, 'StudentNotifications'), where('referenceId', '==', serviceId))
  );
  if (!notifsSnap.empty) {
    const batch = writeBatch(db);
    notifsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function assignMediator(
  serviceId: string,
  mediatorName: string,
  mediatorNote: string,
  clientUserId: string,
  meetingLink?: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.services, serviceId), {
    mediatorName: mediatorName.trim(),
    mediatorAssigned: mediatorName.trim(),
    meetingLink: meetingLink?.trim() || '',
    mediatorNote: mediatorNote.trim(),
    status: 'in-progress',
    statusUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  createStudentNotification(
    clientUserId,
    `A mediator has been assigned to your case: ${mediatorName.trim()}`,
    'case_assigned',
    serviceId
  ).catch(() => {});
}

export async function updateCaseStatus(
  serviceId: string,
  status: Service['status'],
  resolution: string,
  clientUserId: string
): Promise<void> {
  const payload: Record<string, unknown> = {
    status,
    statusUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (resolution.trim()) payload.resolution = resolution.trim();
  await updateDoc(doc(db, COLLECTIONS.services, serviceId), payload);

  const type = status === 'completed' ? 'case_completed' : 'case_updated';
  const message =
    status === 'completed'
      ? 'Your case has been resolved. View your resolution summary.'
      : 'Your case status has been updated by the admin.';
  createStudentNotification(clientUserId, message, type, serviceId).catch(() => {});
}

export async function sendCaseMessage(
  caseId: string,
  senderId: string,
  senderName: string,
  senderType: CaseMessage['senderType'],
  text: string
): Promise<void> {
  await addDoc(collection(db, 'CaseMessages'), {
    caseId,
    senderId,
    senderName,
    senderType,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
}

export function subscribeCaseMessages(
  caseId: string,
  callback: (messages: CaseMessage[]) => void
): () => void {
  const q = query(
    collection(db, 'CaseMessages'),
    where('caseId', '==', caseId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const messages: CaseMessage[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            caseId: data.caseId ?? '',
            senderId: data.senderId ?? '',
            senderName: data.senderName ?? '',
            senderType: data.senderType ?? 'client',
            text: data.text ?? '',
            createdAt: data.createdAt,
          };
        })
        .sort((a, b) => {
          const at = typeof a.createdAt?.toDate === 'function' ? a.createdAt.toDate().getTime() : 0;
          const bt = typeof b.createdAt?.toDate === 'function' ? b.createdAt.toDate().getTime() : 0;
          return at - bt;
        });
      callback(messages);
    },
    () => callback([])
  );
}


// ─── Student Notifications ───────────────────────────────────────────────────
export interface StudentNotification {
  id: string;
  userId: string;
  type:
    | 'assignment_graded'
    | 'test_graded'
    | 'application_approved'
    | 'application_rejected'
    | 'admission_letter'
    | 'material_posted'
    | 'assignment_posted'
    | 'test_posted'
    | 'case_assigned'
    | 'case_updated'
    | 'case_completed'
    | 'case_message'
    | 'course_completed'
    | 'session_posted'
    | 'certificate_issued';
  message: string;
  referenceId: string;
  read: boolean;
  createdAt: any;
}

export async function createStudentNotification(
  userId: string,
  message: string,
  type: StudentNotification['type'],
  referenceId: string
): Promise<void> {
  await addDoc(collection(db, 'StudentNotifications'), {
    userId,
    message,
    type,
    referenceId,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export function subscribeStudentNotifications(
  userId: string,
  callback: (notifications: StudentNotification[]) => void
): () => void {
  const q = query(
    collection(db, 'StudentNotifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const notifications: StudentNotification[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          type: data.type,
          message: data.message,
          referenceId: data.referenceId,
          read: data.read ?? false,
          createdAt: data.createdAt,
        };
      });
      callback(notifications);
    },
    () => callback([])
  );
}

export async function markStudentNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const batch = writeBatch(db);
  for (const id of ids) {
    batch.update(doc(db, 'StudentNotifications', id), { read: true });
  }
  await batch.commit();
}

// ─── Materials (Admin) ───────────────────────────────────────────────────────
export interface MaterialInput {
  courseId: string;
  moduleTitle: string;
  title: string;
  type: 'pdf' | 'video' | 'doc' | 'link';
  fileUrl: string;
  order: number;
}

async function notifyEnrolledStudents(
  courseId: string,
  message: string,
  type: StudentNotification['type'],
  referenceId: string
): Promise<void> {
  const q = query(
    collection(db, COLLECTIONS.applications),
    where('courseId', '==', courseId),
    where('status', '==', 'approved')
  );
  const snap = await getDocs(q);
  const userIds = [...new Set(snap.docs.map((d) => d.data().userId as string).filter(Boolean))];
  await Promise.all(
    userIds.map((uid) => createStudentNotification(uid, message, type, referenceId))
  );
}

export async function createMaterial(input: MaterialInput): Promise<Material> {
  const moduleTitle = input.moduleTitle.trim();
  const title = input.title.trim();
  const fileUrl = input.fileUrl.trim();
  const moduleId = moduleTitle.toLowerCase().replace(/\s+/g, '-');
  const createdAt = new Date();
  const docRef = await addDoc(collection(db, 'Materials'), {
    courseId: input.courseId,
    moduleId,
    moduleTitle,
    title,
    type: input.type,
    fileUrl,
    order: input.order,
    uploadDate: serverTimestamp(),
  });
  notifyEnrolledStudents(
    input.courseId,
    `New material posted: "${title}"`,
    'material_posted',
    docRef.id
  ).catch(() => {});
  return {
    id: docRef.id,
    courseId: input.courseId,
    moduleId,
    moduleTitle,
    title,
    type: input.type,
    fileUrl,
    uploadDate: createdAt,
    order: input.order,
  };
}

export async function deleteMaterial(materialId: string): Promise<void> {
  await deleteDoc(doc(db, 'Materials', materialId));
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  await deleteDoc(doc(db, 'Assignments', assignmentId));
}

export async function deleteTest(testId: string): Promise<void> {
  await deleteDoc(doc(db, 'Tests', testId));
}

export function subscribeAllMaterials(
  callback: (materials: Material[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'Materials'),
    (snapshot) => {
      const materials: Material[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            courseId: data.courseId ?? '',
            moduleId: data.moduleId ?? '',
            moduleTitle: data.moduleTitle ?? '',
            title: data.title ?? '',
            type: data.type ?? 'link',
            fileUrl: data.fileUrl ?? '',
            uploadDate: data.uploadDate,
            order: data.order ?? 0,
          };
        })
        .sort((a, b) => a.order - b.order);
      callback(materials);
    },
    () => callback([])
  );
}

// ─── Assignments (Admin) ─────────────────────────────────────────────────────
export interface CreateAssignmentInput {
  courseId: string;
  title: string;
  description: string;
  deadlineIso: string;
  maxGrade: number;
  fileUrl?: string;
}

export interface AdminSubmission {
  userId: string;
  studentName?: string;
  studentEmail?: string;
  text: string;
  attachmentLink?: string;
  submittedAt: any;
  grade?: number;
  feedback?: string;
  status: 'submitted' | 'graded';
}

export interface AdminAssignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  deadline: any;
  maxGrade: number;
  fileUrl?: string;
  submissions: AdminSubmission[];
}

export async function createAdminAssignment(input: CreateAssignmentInput): Promise<void> {
  const title = input.title.trim();
  const docRef = await addDoc(collection(db, 'Assignments'), {
    courseId: input.courseId,
    title,
    description: input.description.trim(),
    deadline: new Date(input.deadlineIso),
    maxGrade: input.maxGrade,
    ...(input.fileUrl ? { fileUrl: input.fileUrl } : {}),
    createdAt: serverTimestamp(),
  });
  notifyEnrolledStudents(
    input.courseId,
    `New assignment posted: "${title}"`,
    'assignment_posted',
    docRef.id
  ).catch(() => {});
}

export function subscribeAdminAssignments(
  callback: (assignments: AdminAssignment[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'Assignments'),
    (snapshot) => {
      const assignments: AdminAssignment[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const submissions: AdminSubmission[] = [];
        for (const key of Object.keys(data)) {
          if (key.startsWith('sub_')) {
            const userId = key.slice(4);
            const sub = data[key] as Record<string, any>;
            submissions.push({
              userId,
              studentName: sub.studentName ?? '',
              studentEmail: sub.studentEmail ?? '',
              text: sub.text ?? '',
              attachmentLink: sub.attachmentLink ?? '',
              submittedAt: sub.submittedAt,
              grade: sub.grade,
              feedback: sub.feedback,
              status: sub.grade != null ? 'graded' : 'submitted',
            });
          }
        }
        return {
          id: docSnap.id,
          courseId: data.courseId ?? '',
          title: data.title ?? '',
          description: data.description ?? '',
          deadline: data.deadline,
          maxGrade: data.maxGrade ?? 100,
          fileUrl: data.fileUrl ?? '',
          submissions,
        };
      });
      callback(assignments);
    },
    () => callback([])
  );
}

export async function gradeAssignmentSubmission(
  assignmentId: string,
  userId: string,
  grade: number,
  feedback: string,
  assignmentTitle: string
): Promise<void> {
  await updateDoc(doc(db, 'Assignments', assignmentId), {
    [`sub_${userId}.grade`]: grade,
    [`sub_${userId}.feedback`]: feedback,
  });
  await createStudentNotification(
    userId,
    `Your assignment "${assignmentTitle}" has been reviewed.${feedback ? ' Admin has left feedback for you.' : ''}`,
    'assignment_graded',
    assignmentId
  );
}

// Also update submitAssignment to write inline so admin can see it
export async function submitAssignmentWithInline(
  input: AssignmentSubmissionInput
): Promise<void> {
  await submitAssignment(input);
}

// ─── Tests (Admin) ───────────────────────────────────────────────────────────
export interface CreateTestInput {
  courseId: string;
  title: string;
  description: string;
  scheduledDateIso: string;
  durationMinutes: number;
  totalMarks: number;
  passMark: number;
  fileUrl?: string;
}

export interface TestGrade {
  id: string;
  testId: string;
  testTitle: string;
  userId: string;
  courseId: string;
  score: number;
  totalMarks: number;
  passMark: number;
  feedback: string;
  gradedAt: any;
}

export interface AdminTestSubmission {
  userId: string;
  studentName?: string;
  studentEmail?: string;
  text: string;
  attachmentLink?: string;
  submittedAt: any;
  grade?: number;
  feedback?: string;
  status: 'submitted' | 'graded';
}

export interface AdminTest {
  id: string;
  courseId: string;
  title: string;
  description: string;
  scheduledDate: any;
  durationMinutes: number;
  totalMarks: number;
  passMark: number;
  fileUrl?: string;
  status: 'upcoming' | 'submitted' | 'graded' | 'completed' | 'missed';
  submissions: AdminTestSubmission[];
}

export async function createAdminTest(input: CreateTestInput): Promise<void> {
  const title = input.title.trim();
  const docRef = await addDoc(collection(db, 'Tests'), {
    courseId: input.courseId,
    title,
    description: input.description.trim(),
    scheduledDate: new Date(input.scheduledDateIso),
    durationMinutes: input.durationMinutes,
    totalMarks: input.totalMarks,
    passMark: input.passMark,
    ...(input.fileUrl ? { fileUrl: input.fileUrl } : {}),
    status: 'upcoming',
    createdAt: serverTimestamp(),
  });
  notifyEnrolledStudents(
    input.courseId,
    `New test scheduled: "${title}"`,
    'test_posted',
    docRef.id
  ).catch(() => {});
}

export function subscribeAdminTests(
  callback: (tests: AdminTest[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'Tests'),
    (snapshot) => {
      const tests: AdminTest[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const submissions: AdminTestSubmission[] = [];
        for (const key of Object.keys(data)) {
          if (key.startsWith('sub_')) {
            const userId = key.slice(4);
            const sub = data[key] as Record<string, any>;
            submissions.push({
              userId,
              studentName: sub.studentName ?? '',
              studentEmail: sub.studentEmail ?? '',
              text: sub.text ?? '',
              attachmentLink: sub.attachmentLink ?? '',
              submittedAt: sub.submittedAt,
              grade: sub.score,
              feedback: sub.feedback,
              status: sub.score != null ? 'graded' : 'submitted',
            });
          }
        }
        return {
          id: docSnap.id,
          courseId: data.courseId ?? '',
          title: data.title ?? '',
          description: data.description ?? '',
          scheduledDate: data.scheduledDate,
          durationMinutes: data.durationMinutes ?? 60,
          totalMarks: data.totalMarks ?? 100,
          passMark: data.passMark ?? 50,
          fileUrl: data.fileUrl ?? '',
          status: data.status ?? 'upcoming',
          submissions,
        };
      });
      callback(tests);
    },
    () => callback([])
  );
}

export async function gradeTestSubmission(
  testId: string,
  userId: string,
  score: number,
  feedback: string,
  testTitle: string,
  courseId: string,
  totalMarks: number,
  passMark: number
): Promise<void> {
  const existing = query(
    collection(db, 'TestGrades'),
    where('testId', '==', testId),
    where('userId', '==', userId)
  );
  const snap = await getDocs(existing);
  const gradeData = {
    testId,
    testTitle,
    userId,
    courseId,
    score,
    totalMarks,
    passMark,
    feedback: feedback.trim(),
    gradedAt: serverTimestamp(),
  };
  if (snap.empty) {
    await addDoc(collection(db, 'TestGrades'), gradeData);
  } else {
    await updateDoc(doc(db, 'TestGrades', snap.docs[0].id), gradeData);
  }
  await updateDoc(doc(db, 'Tests', testId), {
    [`sub_${userId}.score`]: score,
    [`sub_${userId}.feedback`]: feedback.trim(),
    [`sub_${userId}.gradedAt`]: serverTimestamp(),
  });
  await createStudentNotification(
    userId,
    `Your test "${testTitle}" has been reviewed.${feedback ? ' Admin has left feedback for you.' : ''}`,
    'test_graded',
    testId
  );
}

export function subscribeStudentTestGrades(
  userId: string,
  callback: (grades: TestGrade[]) => void
): () => void {
  const q = query(
    collection(db, 'TestGrades'),
    where('userId', '==', userId)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const grades: TestGrade[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          testId: data.testId ?? '',
          testTitle: data.testTitle ?? '',
          userId: data.userId ?? '',
          courseId: data.courseId ?? '',
          score: data.score ?? 0,
          totalMarks: data.totalMarks ?? 100,
          passMark: data.passMark ?? 50,
          feedback: data.feedback ?? '',
          gradedAt: data.gradedAt,
        };
      });
      callback(grades);
    },
    () => callback([])
  );
}

// ─── Course Completion ────────────────────────────────────────────────────────

export async function markCourseComplete(
  applicationId: string,
  userId: string,
  courseId: string,
  courseName: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.applications, applicationId), {
    courseCompleted: true,
    completedAt: serverTimestamp(),
    status: 'completed',
  });
  const progressQuery = query(
    collection(db, 'LearningProgress'),
    where('userId', '==', userId),
    where('courseId', '==', courseId)
  );
  const snap = await getDocs(progressQuery);
  if (snap.empty) {
    await addDoc(collection(db, 'LearningProgress'), {
      userId,
      courseId,
      progressPercentage: 100,
      completedModules: [],
      totalModules: 0,
      lastAccessed: serverTimestamp(),
    });
  } else {
    await updateDoc(doc(db, 'LearningProgress', snap.docs[0].id), {
      progressPercentage: 100,
    });
  }
  await createStudentNotification(
    userId,
    `Congratulations! You have completed "${courseName}".`,
    'course_completed',
    applicationId
  );
}

export async function setStudentProgress(
  userId: string,
  courseId: string,
  percentage: number
): Promise<void> {
  const q = query(
    collection(db, 'LearningProgress'),
    where('userId', '==', userId),
    where('courseId', '==', courseId)
  );
  const snap = await getDocs(q);
  const clamped = Math.min(100, Math.max(0, Math.round(percentage)));
  if (snap.empty) {
    await addDoc(collection(db, 'LearningProgress'), {
      userId,
      courseId,
      progressPercentage: clamped,
      completedModules: [],
      totalModules: 0,
      lastAccessed: serverTimestamp(),
    });
  } else {
    await updateDoc(doc(db, 'LearningProgress', snap.docs[0].id), {
      progressPercentage: clamped,
    });
  }
}

// ─── Virtual Sessions ─────────────────────────────────────────────────────────

export interface Session {
  id: string;
  courseId: string;
  title: string;
  scheduledDate: any;
  zoomLink: string;
  createdAt: any;
}

export interface CreateSessionInput {
  courseId: string;
  title: string;
  scheduledDateIso: string;
  zoomLink: string;
}

export async function createSession(input: CreateSessionInput): Promise<void> {
  const title = input.title.trim();
  const docRef = await addDoc(collection(db, 'Sessions'), {
    courseId: input.courseId,
    title,
    scheduledDate: new Date(input.scheduledDateIso),
    zoomLink: input.zoomLink.trim(),
    createdAt: serverTimestamp(),
  });
  notifyEnrolledStudents(
    input.courseId,
    `Virtual session scheduled: "${title}"`,
    'session_posted',
    docRef.id
  ).catch(() => {});
}

export function subscribeSessionsByCourse(
  courseId: string,
  callback: (sessions: Session[]) => void
): () => void {
  const q = query(
    collection(db, 'Sessions'),
    where('courseId', '==', courseId),
    orderBy('scheduledDate', 'asc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const sessions: Session[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          courseId: data.courseId ?? '',
          title: data.title ?? '',
          scheduledDate: data.scheduledDate,
          zoomLink: data.zoomLink ?? '',
          createdAt: data.createdAt,
        };
      });
      callback(sessions);
    },
    () => callback([])
  );
}

export function subscribeAdminSessions(
  callback: (sessions: Session[]) => void
): () => void {
  const q = query(collection(db, 'Sessions'), orderBy('scheduledDate', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const sessions: Session[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          courseId: data.courseId ?? '',
          title: data.title ?? '',
          scheduledDate: data.scheduledDate,
          zoomLink: data.zoomLink ?? '',
          createdAt: data.createdAt,
        };
      });
      callback(sessions);
    },
    () => callback([])
  );
}

export async function deleteSession(sessionId: string): Promise<void> {
  await deleteDoc(doc(db, 'Sessions', sessionId));
}

// ─── Personal Sessions ────────────────────────────────────────────────────────

export interface PersonalSession {
  id: string;
  userId: string;
  title: string;
  scheduledDate: any;
  zoomLink: string;
  createdAt: any;
}

export async function createPersonalSession(input: {
  userId: string;
  title: string;
  scheduledDateIso: string;
  zoomLink: string;
}): Promise<void> {
  await addDoc(collection(db, 'PersonalSessions'), {
    userId: input.userId,
    title: input.title.trim(),
    scheduledDate: new Date(input.scheduledDateIso),
    zoomLink: input.zoomLink.trim(),
    createdAt: serverTimestamp(),
  });
  await createStudentNotification(
    input.userId,
    `A virtual session has been scheduled for you: "${input.title.trim()}"`,
    'session_posted',
    input.userId
  );
}

export function subscribePersonalSessions(
  userId: string,
  callback: (sessions: PersonalSession[]) => void
): () => void {
  const q = query(
    collection(db, 'PersonalSessions'),
    where('userId', '==', userId),
    orderBy('scheduledDate', 'asc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId ?? '',
          title: data.title ?? '',
          scheduledDate: data.scheduledDate,
          zoomLink: data.zoomLink ?? '',
          createdAt: data.createdAt,
        };
      }));
    },
    () => callback([])
  );
}

export async function deletePersonalSession(sessionId: string): Promise<void> {
  await deleteDoc(doc(db, 'PersonalSessions', sessionId));
}
