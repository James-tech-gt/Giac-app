# Firebase Firestore Setup Guide

This guide shows how to create the required collections in Firebase Firestore for the GIAC app.

## Step-by-Step: Creating Collections in Firebase Console

### 1. **users** Collection ✅ (Already exists)
- Auto-created when users sign up
- Fields: `fullName`, `phone`, `role`, `email`, `createdAt`

---

### 2. **courses** Collection

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → Firestore Database
3. Click **+ Create collection** → Name: `courses`
4. Click **Auto ID** to create the first document

Add these sample courses:

#### Document 1: PECADR Program
```
Document ID: auto-generated (e.g., "course1")

Fields:
- title: "Foundations of Alternative Dispute Resolution" (string)
- description: "Beginner course covering ADR principles and techniques" (string)
- program: "PECADR" (string)
- level: "Beginner" (string)
- duration: "4 weeks" (string)
- modules: 12 (number)
- fees: 2500 (number)
- schedule: "Flexible online" (string)
- createdAt: (timestamp - current date/time)
```

#### Document 2: Master's Program
```
Document ID: auto-generated

Fields:
- title: "Master's in ADR & Conflict Resolution" (string)
- description: "Advanced comprehensive program in ADR" (string)
- program: "Masters" (string)
- level: "Advanced" (string)
- duration: "3 months" (string)
- modules: 24 (number)
- fees: 7500 (number)
- schedule: "Monday-Friday, 9 AM - 5 PM" (string)
- createdAt: (timestamp - current date/time)
```

---

### 3. **applications** Collection

1. Click **+ Create collection** → Name: `applications`
2. Click **Auto ID**

#### Sample Document:
```
Document ID: auto-generated

Fields:
- userId: "user_uid_here" (string) - Replace with actual user UID
- courseId: "course1" (string) - Reference to courses collection
- status: "pending" (string) - Options: "pending", "approved", "rejected"
- documents: [] (array) - Empty array for now, will store file URLs
- feedback: "" (string) - Empty for pending
- submittedAt: (timestamp - current date)
- decidedAt: null (timestamp) - Leave empty until decision
```

---

### 4. **services** Collection

1. Click **+ Create collection** → Name: `services`
2. Click **Auto ID**

#### Sample Document:
```
Document ID: auto-generated

Fields:
- userId: "user_uid_here" (string)
- serviceType: "mediation" (string) - Options: "mediation", "arbitration"
- category: "land" (string) - Options: "land", "rent", "family", "workplace", "commercial"
- caseDetails: "Dispute over property boundaries" (string)
- documents: [] (array) - Empty for now
- status: "submitted" (string) - Options: "submitted", "in-progress", "completed"
- mediatorAssigned: "" (string) - Empty until assigned
- createdAt: (timestamp - current date)
- updatedAt: (timestamp - current date)
```

---

### 5. **announcements** Collection

1. Click **+ Create collection** → Name: `announcements`
2. Click **Auto ID**

#### Sample Document 1:
```
Document ID: auto-generated

Fields:
- title: "Cohort 5 applications now open" (string)
- detail: "Apply before May 15 to secure your spot in the next ADR training cohort." (string)
- urgent: true (boolean)
- createdAt: (timestamp - 2 hours ago, set manually)
```

#### Sample Document 2:
```
Document ID: auto-generated

Fields:
- title: "Orientation materials available" (string)
- detail: "Registered trainees can now access orientation documents and study resources." (string)
- urgent: false (boolean)
- createdAt: (timestamp - 1 day ago)
```

#### Sample Document 3:
```
Document ID: auto-generated

Fields:
- title: "Mediation session rescheduled" (string)
- detail: "The scheduled session for Apr 28 has been moved to May 2, 2025." (string)
- urgent: false (boolean)
- createdAt: (timestamp - 2 days ago)
```

---

## Quick Reference: Collection Structure

```
firestore/
├── users/
│   ├── {userId}
│   │   ├── fullName: string
│   │   ├── phone: string
│   │   ├── role: string
│   │   ├── email: string
│   │   └── createdAt: timestamp
│
├── courses/
│   ├── {courseId}
│   │   ├── title: string
│   │   ├── description: string
│   │   ├── program: string
│   │   ├── level: string
│   │   ├── duration: string
│   │   ├── modules: number
│   │   ├── fees: number
│   │   ├── schedule: string
│   │   └── createdAt: timestamp
│
├── applications/
│   ├── {applicationId}
│   │   ├── userId: string
│   │   ├── courseId: string
│   │   ├── status: string
│   │   ├── documents: array
│   │   ├── feedback: string
│   │   ├── submittedAt: timestamp
│   │   └── decidedAt: timestamp
│
├── services/
│   ├── {serviceId}
│   │   ├── userId: string
│   │   ├── serviceType: string
│   │   ├── category: string
│   │   ├── caseDetails: string
│   │   ├── documents: array
│   │   ├── status: string
│   │   ├── mediatorAssigned: string
│   │   ├── createdAt: timestamp
│   │   └── updatedAt: timestamp
│
└── announcements/
    ├── {announcementId}
    │   ├── title: string
    │   ├── detail: string
    │   ├── urgent: boolean
    │   └── createdAt: timestamp
```

---

## Important Notes

- **Document IDs**: Use "Auto ID" for automatic UUID generation
- **Timestamps**: Click the timestamp field and select "Server timestamp" for current time
- **User UID**: You can find your user UID from Firebase Authentication console
- **Course IDs**: Copy the document ID from courses collection to use in applications
- **Arrays**: Leave empty `[]` for documents array initially

---

## Next Steps

Once created, your app can:
1. Fetch courses from the `courses` collection
2. Save applications to the `applications` collection
3. Display announcements from the `announcements` collection
4. Manage ADR service requests in the `services` collection
