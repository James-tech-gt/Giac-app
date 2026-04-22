# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Project Structure

This project uses **Expo Router** with **TypeScript (TSX)** for type-safe development:

```
giac-app/
├── app/
│   ├── _layout.tsx              # Root navigation
│   ├── index.tsx                # Splash OR redirect logic
│
│   ├── (auth)/                  # Auth group
│   │   ├── login.tsx
│   │   ├── signup.tsx
│
│   ├── (main)/                  # Main app
│   │   ├── home.tsx
│   │   ├── courses.tsx
│   │   ├── apply.tsx
│   │   ├── services.tsx
│   │   ├── profile.tsx
│
│   ├── (student)/               # Student-specific
│   │   ├── dashboard.tsx
│   │   ├── materials.tsx
│
│   ├── (applicant)/             # Applicant-specific
│   │   ├── status.tsx
│
│   ├── (client)/                # ADR clients
│   │   ├── cases.tsx
│
│   └── splash.tsx
│
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│
├── services/                    # Firebase logic
│   ├── firebase.ts
│   ├── auth.ts
│   ├── user.ts
│   ├── application.ts
│   ├── case.ts
│
├── context/                     # Global state
│   ├── AuthContext.tsx
│
├── hooks/
│   ├── useAuth.ts
│
├── constants/
│   └── theme.ts
│
├── assets/
│   └── images/
│
├── babel.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── app.json
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

Global Institute of ADR Center (GIAC) 
About GIAC 
The Global Institute of ADR Center (GIAC) is a registered institution in Ghana dedicated 
to advancing Alternative Dispute Resolution (ADR). It provides world-class training and 
professional development in mediation, arbitration, negotiation, and other ADR 
mechanisms. Through its certification programs, mediation services, and research 
initiatives, GIAC equips individuals and organizations with the skills to resolve conflicts 
efficiently, preserving relationships while saving time and resources. GIAC also offers 
tailored programs for international students and organizations who wish to study ADR 
abroad, providing customized training solutions to meet diverse needs. 
Motto: 
Collaborative Effort for a Sustainable World 
Vision: 
Advancing Alternative Dispute Resolution (ADR) as a catalyst for global peace, justice, and 
sustainability. 
Mission: 
To promote and advance the use of ADR methods—such as mediation, arbitration, 
negotiation, and other conflict resolution mechanisms—to resolve disputes efficiently and 
effectively. 
Objectives: 
1. Provide training and certification programs for ADR professionals. 
2. Offer resources and support for individuals and organizations seeking ADR 
services. 
3. Promote the benefits of ADR through research, publications, and events. 
4. Foster a global network of ADR professionals and organizations. 
Training & Certification Programs 
GIAC offers structured ADR training programs tailored for professionals, students, and 
individuals interested in dispute resolution. 
1. Professional Executive Certificate in ADR (PECADR) 
• Duration: 4 weeks 
• Platform: Virtual (Google Meet/Zoom) 
• Schedule: Mondays, Wednesdays, and Fridays | 5:30 PM - 8:30 PM 
• Practical Sessions: In-person sessions at Kasoa 
• Tuition Fee:  
Course Content: 
• Introduction to ADR & its benefits 
• Conflict theories and analysis 
• Negotiation techniques 
• Mediation principles and practice 
• Court-Connected ADR in Ghana 
• Ethics in Mediation 
• Practical role-play simulations 
Ideal For: 
Beginners and professionals seeking foundational knowledge and certification in ADR. 
2. Professional Executive Master’s in ADR 
• Duration: 3 months 
• Platform: Virtual (Google Meet/Zoom) 
• Schedule: Mondays, Wednesdays, and Fridays | 5:30 PM - 8:30 PM 
• Tuition Fee:  
Course Content: 
• Functional Law (Tort, Constitutional, and Property Law) 
• Workplace and business dispute resolution 
• International Arbitration & Trade Law 
• Drafting Settlement Agreements 
• Advanced Mediation & Arbitration Techniques 
• Labour and Industrial Relations Law 
• Ethical & Professional Standards in ADR 
• Case Studies and Practical Role-Play 
Ideal For: 
Lawyers, corporate professionals, HR managers, mediators, and ADR specialists seeking 
advanced skills. 
Prospects & Benefits After Completion 
Graduates of GIAC training programs enjoy a wide range of career and professional 
benefits: 
• Global Recognition: Certifications recognized worldwide, enabling graduates to 
work in diverse industries and jurisdictions. 
• Career Opportunities: 
o Court-Connected Mediator/Arbitrator 
o ADR Specialist in corporate organizations, legal firms, NGOs, and 
government agencies 
o Independent mediation or arbitration service provider 
• Enhanced Skills in Various Fields: 
o Conflict resolution for family, land, and workplace disputes 
o Human Resource Management 
o ADR consultancy services 
o Legal practice as a lawyer/mediator 
• Automatic Membership & Networking: 
o Associate membership with the Ghana National Association of ADR 
Practitioners (GNAAP) 
o Connection to Court-Connected ADR Programs 
o Access to Continuing Professional Development (CPD) programs 
• Mass Private Mediation Experience: 
o Members actively partake in mass mediation sessions to enhance practical 
ADR knowledge. 
• Membership: Become an automatic member of GIAC. 
Who Qualifies for GIAC Programs? 
GIAC caters to a broad audience: 
• Professionals: Lawyers, judges, HR managers, business executives, financial 
experts, health professionals, educators 
• Non-Professionals: Community leaders, social workers, counselors, pastors, 
entrepreneurs 
• Students: Law, business, social sciences, and conflict resolution students 
• Organizations: Corporate firms, government agencies, NGOs, and community 
organizations 
• Traditional Leaders: Chiefs and Queen Mothers (through certificates or 
certification programs based on their academic level) 
o Special training in mediation and customary arbitration 
ADR Services & Mediation Expertise 
Beyond training, GIAC provides expert ADR services for various disputes, including: 
• Land disputes 
• Rent & tenant conflicts 
• Commercial & debt recovery cases 
• Child maintenance & family disputes 
• Workplace & business disputes 
• Marriage & domestic issues 
• Drafting & reviewing settlement agreements 
Why Choose GIAC Mediation Services? 
• Confidential, cost-effective, and impartial resolution 
• Preserves relationships and prevents litigation 
• Expert mediators for efficient conflict resolution 
• Free consultation for first-time clients 
Why Choose GIAC? 
• Expert trainers & facilitators – Learn from seasoned ADR professionals and legal 
experts 
• Practical experience – Real-world mediation and arbitration simulations 
• Flexible learning – Online training with scheduled in-person practical sessions 
• Affordable & recognized certification – Cost-effective training with global 
credibility 
• Professional growth & networking – Membership with GIAC & GNAAP for career 
advancement 
Admission Process 
1. Express Interest: Receive a registration link or form 
2. Registration Fee: Applicable for certificate and master’s programs 
3. Admission Letter: Issued after successful registration 
4. Tuition Fees: Payable per program 
5. Entry Requirements: 
o Certificate Program: Minimum qualification is SHS Certificate 
o Master’s Program: Minimum qualification is a degree 
Contact GIAC 
 
Location: Kasoa, Ghana 
 
Phone: +233 24 687 2805 | +233 50 257 3336 
 
Email: globalinstituteofadrcenter@gmail.com 
 
Website: www.giacghana.com 
Start your journey to becoming a certified ADR practitioner today!           

# GIAC Mobile App System Specification
## 1. Purpose
This document defines the functional and technical specifications for the Global Institute of ADR Center (GIAC) Mobile Application.

The system provides a unified digital platform for:
- ADR training and certification
- Course applications and admissions
- Mediation and arbitration service requests
- Student learning and assessment
- Professional membership management

---

## 2. System Overview
The GIAC system is a role-based platform designed to:
- Promote ADR training programs and events
- Enable user registration and course applications
- Provide mediation and arbitration services
- Support student learning and assessments
- Allow administrative control via a web-based dashboard

### System Layers
1. User Application (Mobile Frontend)  
2. Backend Services (API, Database, Storage)  
3. Admin Dashboard (Web Interface)  

---

## 3. User Roles & Lifecycle

### Roles
- Visitor (Unauthenticated User)
- Applicant
- Student (Trainee)
- Professional Member
- Client (ADR Services User)
- Administrator (Web-based system)

---

### Lifecycle Flow
Visitor → (Login/Signup) → Applicant → Student → Professional Member  
                           ↘  
                            Client (via service request)

---

### Role Transitions
- Visitor → Authenticated User: creates account (login/signup)
- Authenticated User → Applicant: submits course application
- Applicant → Student: approved by admin
- Student → Professional Member: completes training
- Authenticated User → Client: submits ADR case

---

## 4. Functional Requirements

### 4.1 Authentication
- Users can sign up with email and password  
- Users can log in with existing credentials  
- Roles are assigned and managed via backend  
- A single account persists across lifecycle  

---

### 4.2 Home Dashboard
Central entry point for all users.

#### Features:
- Welcome message  
- Announcements  
- Events  

#### Quick Actions:
- Explore Courses  
- Apply for Program  
- Request Mediation  
- Track Application / Case  

#### Role-Based Views:
- Applicant → application status  
- Student → courses and materials  
- Client → case tracking  

---

### 4.3 Courses Module
- Display available programs  
- Show details (description, modules, duration, fees)  
- Allow applications  

---

### 4.4 Admissions Module
- Application submission  
- Document upload  
- Status tracking (Pending / Approved / Rejected)  
- Event/workshop registration  

⚠️ Note:  
Users must be logged in before submitting applications.

---

### 4.5 Student Dashboard
Accessible only after approval.

#### Features:
- Class schedule  
- Learning materials  
- Assignments  
- Tests/Examinations  
- Certificate access  

#### Learning Tracking:
- Progress percentage  
- Completed modules  
- Pending tasks  

---

### 4.6 ADR Services Module
- Submit mediation/arbitration requests  
- Select dispute category  
- Provide case details  
- Track case status  

⚠️ Note:  
Visitors must log in or create an account before submitting a request.

---

### 4.7 Profile Module
- User information  
- Role and status  
- Account settings  
- Logout  

---

## 5. Backend System Design

### Core Responsibilities
- Authentication & authorization  
- Role management  
- Data storage  
- Business logic  

---

### Learning Tracking (Backend)
Tracks:
- Enrollment  
- Module completion  
- Material access  
- Attendance  
- Assignments/tests  

Example:
```json
{
  "userId": "123",
  "courseId": "PECADR",
  "progress": 60,
  "completedModules": ["Intro", "Negotiation"]
}

   Admissions Management
Store applications
Update status
Assign students

   ADR Case Management
Store case submissions
Assign mediators
Update case status


   Notification System
Announcements
Application updates
Class reminders
Case updates

  Admin Panel
Access
Web-based
Restricted to authorized staff

   Capabilities
Manage courses
Review applications
Approve/reject applicants
Manage students
Assign mediation cases
Upload learning materials
Manage tests/examinations
Generate certificates 

  Data Model
  Users
userId
name
email
role
status
  Courses
courseId
title
description
duration
fee
   Applications
  applicationId
userId
courseId
status
   Learning Progress
userId
courseId
progress
completedModules
   ADR Cases
caseId
clientId
type
status
   Materials
materialId
courseId
fileUrl

8. System Architecture
Admin Dashboard
↓
Backend (Firebase/API)
↓
Database + Storage
↓
Mobile Application

9. Technology Stack
Frontend
React Native (Expo)
TypeScript
NativeWind
Backend
Firebase Authentication
Firestore Database
Firebase 

10. System Workflow
User opens the app as a visitor
User explores courses and services
User selects an action (apply or request service)
System prompts login/signup if not authenticated
User submits application or mediation request
Admin reviews submission
Approved applicant becomes student
Student accesses learning dashboard
System tracks progress and assessments
Certificate is issued upon completion

11. Design Principles
Single account lifecycle
Role-based UI
Controlled access (authentication required for actions)
Centralized dashboard
Scalable architecture

12. Conclusion
The GIAC mobile application is designed as a comprehensive digital platform that integrates ADR training, applications, and mediation services into a single, secure, and user-friendly system.