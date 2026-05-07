import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserRole } from './access';

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
  type: 'application' | 'service';
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
  status: 'pending' | 'approved' | 'rejected';
  documents: string[];
  feedback: string;
  submittedAt: any;
  decidedAt?: any;
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
  message?: string;
}

export interface Service {
  id: string;
  userId: string;
  serviceType: 'mediation' | 'arbitration';
  category: string;
  caseDetails: string;
  documents: string[];
  status: 'submitted' | 'in-progress' | 'completed';
  mediatorAssigned: string;
  createdAt: any;
  updatedAt: any;
}

export interface ServiceInput {
  userId: string;
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
async function createAdminNotification(data: {
  type: 'application' | 'service';
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
            status: pickField<Application['status']>(data, 'status', 'Status') ?? 'pending',
            documents: pickField<string[]>(data, 'documents', 'Documents') ?? [],
            feedback: pickField<string>(data, 'feedback', 'Feedback') ?? '',
            submittedAt: pickField<any>(data, 'submittedAt', 'SubmittedAt'),
            decidedAt: pickField<any>(data, 'decidedAt', 'DecidedAt'),
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
            status: pickField<Application['status']>(data, 'status', 'Status') ?? 'pending',
            documents: pickField<string[]>(data, 'documents', 'Documents') ?? [],
            feedback: pickField<string>(data, 'feedback', 'Feedback') ?? '',
            submittedAt: pickField<any>(data, 'submittedAt', 'SubmittedAt'),
            decidedAt: pickField<any>(data, 'decidedAt', 'DecidedAt'),
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

export async function withdrawApplication(applicationId: string): Promise<void> {
  const applicationDoc = doc(db, COLLECTIONS.applications, applicationId);
  await deleteDoc(applicationDoc);
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
  submittedAt?: any;
  submissionText?: string;
  grade?: number;
  feedback?: string;
  status: 'pending' | 'submitted' | 'graded';
}

export interface AssignmentSubmissionInput {
  assignmentId: string;
  userId: string;
  courseId: string;
  submissionText: string;
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
  const col = collection(db, 'AssignmentSubmissions');
  await addDoc(col, {
    assignmentId: input.assignmentId,
    userId: input.userId,
    courseId: input.courseId,
    submissionText: input.submissionText.trim(),
    submittedAt: serverTimestamp(),
    status: 'submitted',
  });
  await updateDoc(doc(db, 'Assignments', input.assignmentId), {
    [`sub_${input.userId}`]: {
      text: input.submissionText.trim(),
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
  score?: number;
  status: 'upcoming' | 'completed' | 'missed';
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
export async function getApprovedApplications(userId: string): Promise<Application[]> {
  const apps = await getUserApplications(userId);
  return apps.filter((a) => a.status === 'approved');
}

// ─── Admin ───────────────────────────────────────────────────────────────────

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
            status: pickField<Application['status']>(data, 'status', 'Status') ?? 'pending',
            documents: pickField<string[]>(data, 'documents', 'Documents') ?? [],
            feedback: pickField<string>(data, 'feedback', 'Feedback') ?? '',
            submittedAt: pickField<any>(data, 'submittedAt', 'SubmittedAt'),
            decidedAt: pickField<any>(data, 'decidedAt', 'DecidedAt'),
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
            serviceType: pickField<Service['serviceType']>(data, 'serviceType', 'ServiceType') ?? 'mediation',
            category: pickField<string>(data, 'category', 'Category') ?? '',
            caseDetails: pickField<string>(data, 'caseDetails', 'CaseDetails') ?? '',
            documents: pickField<string[]>(data, 'documents', 'Documents') ?? [],
            status: pickField<Service['status']>(data, 'status', 'Status') ?? 'submitted',
            mediatorAssigned: pickField<string>(data, 'mediatorAssigned', 'MediatorAssigned') ?? '',
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

export async function approveApplication(
  applicationId: string,
  userId: string,
  courseTitle?: string
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, COLLECTIONS.applications, applicationId), {
    status: 'approved',
    decidedAt: serverTimestamp(),
  });
  if (userId) {
    batch.set(doc(db, COLLECTIONS.users, userId), { role: 'student' }, { merge: true });
  }
  await batch.commit();
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
    status?: Service['status'];
  }
): Promise<void> {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.mediatorAssigned !== undefined) {
    payload.mediatorAssigned = updates.mediatorAssigned.trim();
  }

  if (updates.status !== undefined) {
    payload.status = updates.status;
  }

  await updateDoc(doc(db, COLLECTIONS.services, serviceId), payload);
}

// ─── Student Notifications ───────────────────────────────────────────────────
export interface StudentNotification {
  id: string;
  userId: string;
  type: 'assignment_graded' | 'test_graded' | 'application_approved' | 'application_rejected';
  message: string;
  referenceId: string;
  read: boolean;
  createdAt: any;
}

async function createStudentNotification(
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
}

export interface AdminSubmission {
  userId: string;
  text: string;
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
  submissions: AdminSubmission[];
}

export async function createAdminAssignment(input: CreateAssignmentInput): Promise<void> {
  await addDoc(collection(db, 'Assignments'), {
    courseId: input.courseId,
    title: input.title.trim(),
    description: input.description.trim(),
    deadline: new Date(input.deadlineIso),
    maxGrade: input.maxGrade,
    createdAt: serverTimestamp(),
  });
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
              text: sub.text ?? '',
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
    `Your assignment "${assignmentTitle}" has been graded. Score: ${grade}`,
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

export async function createAdminTest(input: CreateTestInput): Promise<void> {
  await addDoc(collection(db, 'Tests'), {
    courseId: input.courseId,
    title: input.title.trim(),
    description: input.description.trim(),
    scheduledDate: new Date(input.scheduledDateIso),
    durationMinutes: input.durationMinutes,
    totalMarks: input.totalMarks,
    passMark: input.passMark,
    status: 'upcoming',
    createdAt: serverTimestamp(),
  });
}

export function subscribeAdminTests(
  callback: (tests: Test[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'Tests'),
    (snapshot) => {
      const tests: Test[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          courseId: data.courseId ?? '',
          title: data.title ?? '',
          description: data.description ?? '',
          scheduledDate: data.scheduledDate,
          durationMinutes: data.durationMinutes ?? 60,
          totalMarks: data.totalMarks ?? 100,
          passMark: data.passMark ?? 50,
          score: data.score,
          status: data.status ?? 'upcoming',
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
  await createStudentNotification(
    userId,
    `Your test "${testTitle}" has been graded. Score: ${score}/${totalMarks}`,
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
