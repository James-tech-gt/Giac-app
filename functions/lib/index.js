"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPasswordChanged = exports.onGraduationInvitation = exports.onAdmissionLetterSent = exports.onCertificateCreated = exports.onCaseUpdated = exports.onApplicationUpdated = exports.onServiceCreated = exports.onCourseRegistrationCreated = exports.onApplicationCreated = exports.onUserCreated = exports.onAdminNotification = exports.onStudentNotification = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const resend_1 = require("resend");
admin.initializeApp();
const db = admin.firestore();
const FROM_EMAIL = 'GIAC <noreply@giacghana.com>';
const CONTACT_EMAIL = 'info@giacghana.com';
const EMAIL_FOOTER = `
  <div style="margin-top:32px;padding-top:20px;border-top:1px solid #E3E9F2;font-size:13px;color:#9AA3B2;line-height:1.8">
    Global Institute of ADR Center &middot; Kasoa, Ghana<br>
    Enquiries: <a href="mailto:${CONTACT_EMAIL}" style="color:#4A5468;text-decoration:none">${CONTACT_EMAIL}</a><br>
    Please do not reply to this email.
  </div>`;
function getResend() {
    return new resend_1.Resend(process.env.RESEND_API_KEY);
}
async function sendTransactionalEmail(input) {
    const { from = FROM_EMAIL, to, subject, html, label } = input;
    try {
        const result = await getResend().emails.send({ from, to, subject, html });
        console.log(`[Email] ${label} sent`, JSON.stringify({ to, subject, id: result.data?.id ?? null, error: result.error ?? null }));
        if (result.error) {
            console.error(`[Email] ${label} Resend API error`, JSON.stringify(result.error));
        }
        return result;
    }
    catch (err) {
        console.error(`[Email] ${label} failed`, err);
        throw err;
    }
}
// ─── Expo Push Helper ─────────────────────────────────────────────────────────
async function sendFcmPush(tokens, title, body, data) {
    const messages = tokens
        .filter((t) => t.startsWith('ExponentPushToken['))
        .map((to) => ({ to, title, body, sound: 'default', data: data ?? {} }));
    if (messages.length === 0)
        return;
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
    });
    const json = await res.json();
    const failed = json?.data?.filter((r) => r.status === 'error');
    if (failed?.length)
        console.error('[Push] Failed deliveries:', JSON.stringify(failed));
}
async function getAdminPushTokens() {
    const snap = await db.collection('users').where('role', '==', 'admin').get();
    return snap.docs.map((d) => d.data().pushToken).filter(Boolean);
}
async function getAdminEmailRecipients() {
    const snap = await db.collection('users').where('role', '==', 'admin').get();
    const emails = snap.docs.map((d) => d.data().email).filter(Boolean);
    // Always include the contact email, deduplicate
    return [...new Set([...emails, CONTACT_EMAIL])];
}
// ─── Part 4: Push Notifications ───────────────────────────────────────────────
// Student gets a push when a new StudentNotification is created for them
exports.onStudentNotification = (0, firestore_1.onDocumentCreated)('StudentNotifications/{id}', async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const { userId, message, type, referenceId } = data;
    if (!userId || !message)
        return;
    const userSnap = await db.collection('users').doc(userId).get();
    const pushToken = userSnap.data()?.pushToken;
    if (!pushToken)
        return;
    await sendFcmPush([pushToken], 'GIAC', message, {
        notificationId: event.params.id,
        type: type || '',
        referenceId: referenceId || '',
    });
});
// Admin gets a push when a new AdminNotification is created
exports.onAdminNotification = (0, firestore_1.onDocumentCreated)('AdminNotifications/{id}', async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const { message, type, referenceId } = data;
    if (!message)
        return;
    const tokens = await getAdminPushTokens();
    await sendFcmPush(tokens, 'GIAC Admin', message, {
        notificationId: event.params.id,
        type: type || 'admin',
        referenceId: referenceId || '',
    });
});
// ─── Part 5: Automated Emails ─────────────────────────────────────────────────
// Welcome email when a new user document is created + admin alert
exports.onUserCreated = (0, firestore_1.onDocumentCreated)({ document: 'users/{uid}', secrets: ['RESEND_API_KEY'] }, async (event) => {
    let data = event.data?.data();
    if (!data)
        return;
    // Push token write can create the doc before the profile write lands.
    // If email is missing, wait and re-fetch once so we get the full profile.
    if (!data.email) {
        await new Promise((r) => setTimeout(r, 4000));
        const snap = await db.collection('users').doc(event.params.uid).get();
        data = snap.data();
        if (!data?.email)
            return;
    }
    const name = data.fullName || data.email;
    const role = data.role || 'applicant';
    const signedUpAt = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Accra' });
    // Welcome email to new user
    try {
        await sendTransactionalEmail({
            label: 'welcome',
            to: data.email,
            subject: 'Welcome to GIAC',
            html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#14213A">
            <img src="https://www.giacghana.com/logo.png" alt="GIAC" width="120" style="margin-bottom:24px" />
            <h2 style="margin:0 0 12px">Welcome to GIAC, ${name}!</h2>
            <p style="line-height:1.6;color:#4A5468">
              Thank you for joining the Global Institute of ADR Center. Your account is now active.
            </p>
            <p style="line-height:1.6;color:#4A5468">
              To get started, register for a course that interests you and our team will be in touch with next steps.
            </p>
            <p style="line-height:1.6;color:#4A5468">
              Open the GIAC app to explore available courses.
            </p>
            ${EMAIL_FOOTER}
          </div>
        `,
        });
    }
    catch (err) {
        console.error('[onUserCreated] Failed to send welcome email:', err);
    }
    // Admin email alert
    try {
        const adminEmails = await getAdminEmailRecipients();
        await sendTransactionalEmail({
            label: 'admin-new-user',
            to: adminEmails,
            subject: `New User Signed Up — ${name}`,
            html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#14213A">
            <h2 style="margin:0 0 12px;color:#2A3F66">New User Signed Up</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr><td style="padding:8px 0;color:#6B7689;width:120px">Name</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7689">Email</td><td style="padding:8px 0">${data.email}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7689">Role</td><td style="padding:8px 0;text-transform:capitalize">${role}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7689">Signed up</td><td style="padding:8px 0">${signedUpAt}</td></tr>
            </table>
            <p style="line-height:1.6;color:#4A5468">Open the GIAC admin panel to view their profile.</p>
            ${EMAIL_FOOTER}
          </div>
        `,
        });
    }
    catch (err) {
        console.error('[onUserCreated] Failed to send admin alert:', err);
    }
    // Admin push notification
    try {
        const tokens = await getAdminPushTokens();
        await sendFcmPush(tokens, 'New User', `${name} just signed up on GIAC`, { type: 'new_user', referenceId: event.params.uid });
    }
    catch (err) {
        console.error('[onUserCreated] Failed to send admin push:', err);
    }
});
// Admin alert when a new application is submitted
exports.onApplicationCreated = (0, firestore_1.onDocumentCreated)({ document: 'APPLICATIONS/{id}', secrets: ['RESEND_API_KEY'] }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const name = data.fullName || data.email || 'Unknown';
    const course = data.courseTitle || data.program || 'GIAC Programme';
    const submittedAt = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Accra' });
    try {
        const adminEmails = await getAdminEmailRecipients();
        await sendTransactionalEmail({
            label: 'admin-new-application',
            to: adminEmails,
            subject: `New Application — ${course}`,
            html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#14213A">
            <h2 style="margin:0 0 12px;color:#2A3F66">New Application Submitted</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr><td style="padding:8px 0;color:#6B7689;width:120px">Applicant</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7689">Email</td><td style="padding:8px 0">${data.email || 'N/A'}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7689">Programme</td><td style="padding:8px 0">${course}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7689">Submitted</td><td style="padding:8px 0">${submittedAt}</td></tr>
            </table>
            <p style="line-height:1.6;color:#4A5468">Open the GIAC admin panel to review and process this application.</p>
            ${EMAIL_FOOTER}
          </div>
        `,
        });
    }
    catch (err) {
        console.error('[onApplicationCreated] Failed to send admin alert:', err);
    }
    try {
        const tokens = await getAdminPushTokens();
        await sendFcmPush(tokens, 'New Application', `${name} applied for ${course}`, { type: 'new_application', referenceId: event.params.id });
    }
    catch (err) {
        console.error('[onApplicationCreated] Failed to send admin push:', err);
    }
});
// Admin alert when a new course registration is submitted
exports.onCourseRegistrationCreated = (0, firestore_1.onDocumentCreated)({ document: 'CourseRegistrations/{id}', secrets: ['RESEND_API_KEY'] }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const name = data.fullName || data.email || 'Unknown';
    const course = data.courseInterest === 'pecadr'
        ? 'Professional Executive Certificate in ADR'
        : data.courseInterest === 'pemad'
            ? 'Professional Executive Masters in ADR'
            : data.courseInterest || 'GIAC Course';
    const submittedAt = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Accra' });
    try {
        const adminEmails = await getAdminEmailRecipients();
        await sendTransactionalEmail({
            label: 'admin-new-registration',
            to: adminEmails,
            subject: `New Course Registration — ${name}`,
            html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#14213A">
            <h2 style="margin:0 0 12px;color:#2A3F66">New Course Registration</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr><td style="padding:8px 0;color:#6B7689;width:120px">Student</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7689">Email</td><td style="padding:8px 0">${data.email || 'N/A'}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7689">Course</td><td style="padding:8px 0">${course}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7689">Submitted</td><td style="padding:8px 0">${submittedAt}</td></tr>
            </table>
            <p style="line-height:1.6;color:#4A5468">Open the GIAC admin panel to review this registration and issue an admission letter.</p>
            ${EMAIL_FOOTER}
          </div>
        `,
        });
    }
    catch (err) {
        console.error('[onCourseRegistrationCreated] Failed to send admin alert:', err);
    }
    try {
        const tokens = await getAdminPushTokens();
        await sendFcmPush(tokens, 'New Registration', `${name} registered for ${course}`, { type: 'new_registration', referenceId: event.params.id });
    }
    catch (err) {
        console.error('[onCourseRegistrationCreated] Failed to send admin push:', err);
    }
});
// Admin alert when a new mediation/service request is submitted
exports.onServiceCreated = (0, firestore_1.onDocumentCreated)({ document: 'Services/{id}', secrets: ['RESEND_API_KEY'] }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const name = data.fullName || data.clientName || data.email || 'Unknown';
    const email = data.email || data.clientEmail || '';
    const serviceType = data.serviceType || data.type || 'Mediation Request';
    const submittedAt = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Accra' });
    try {
        const adminEmails = await getAdminEmailRecipients();
        await sendTransactionalEmail({
            label: 'admin-new-service',
            to: adminEmails,
            subject: `New Service Request — ${serviceType}`,
            html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#14213A">
            <h2 style="margin:0 0 12px;color:#2A3F66">New Service Request</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr><td style="padding:8px 0;color:#6B7689;width:120px">Client</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7689">Email</td><td style="padding:8px 0">${email || 'N/A'}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7689">Service</td><td style="padding:8px 0">${serviceType}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7689">Submitted</td><td style="padding:8px 0">${submittedAt}</td></tr>
            </table>
            <p style="line-height:1.6;color:#4A5468">Open the GIAC admin panel to review and assign a mediator.</p>
            ${EMAIL_FOOTER}
          </div>
        `,
        });
    }
    catch (err) {
        console.error('[onServiceCreated] Failed to send admin alert:', err);
    }
    try {
        const tokens = await getAdminPushTokens();
        await sendFcmPush(tokens, 'New Service Request', `${name} submitted a ${serviceType}`, { type: 'new_service', referenceId: event.params.id });
    }
    catch (err) {
        console.error('[onServiceCreated] Failed to send admin push:', err);
    }
});
// Application approved or rejected email
exports.onApplicationUpdated = (0, firestore_1.onDocumentUpdated)({ document: 'APPLICATIONS/{id}', secrets: ['RESEND_API_KEY'] }, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    // Only fire when status actually changes
    if (before.status === after.status)
        return;
    const { email, fullName, courseTitle, status } = after;
    if (!email)
        return;
    const name = fullName || email;
    if (status === 'approved') {
        await sendTransactionalEmail({
            label: 'application-approved',
            to: email,
            subject: 'Congratulations — Your GIAC Application is Approved',
            html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#14213A">
            <h2 style="margin:0 0 12px;color:#2D6A4F">You've been accepted! 🎉</h2>
            <p style="line-height:1.6;color:#4A5468">
              Dear ${name},<br/><br/>
              We are pleased to inform you that your application for <strong>${courseTitle || 'the GIAC programme'}</strong> has been <strong>approved</strong>.
            </p>
            <p style="line-height:1.6;color:#4A5468">
              Please open the GIAC app to view your admission details and next steps.
            </p>
            ${EMAIL_FOOTER}
          </div>
        `,
        });
    }
    else if (status === 'rejected') {
        await sendTransactionalEmail({
            label: 'application-rejected',
            to: email,
            subject: 'Update on Your GIAC Application',
            html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#14213A">
            <h2 style="margin:0 0 12px">Application Update</h2>
            <p style="line-height:1.6;color:#4A5468">
              Dear ${name},<br/><br/>
              Thank you for your interest in <strong>${courseTitle || 'GIAC programmes'}</strong>.
              After careful review, we are unable to proceed with your application at this time.
            </p>
            <p style="line-height:1.6;color:#4A5468">
              We encourage you to reapply in the future. If you have any questions, please contact us at <a href="mailto:${CONTACT_EMAIL}" style="color:#14213A">${CONTACT_EMAIL}</a>.
            </p>
            ${EMAIL_FOOTER}
          </div>
        `,
        });
    }
});
// Mediator assigned or case status changed email
exports.onCaseUpdated = (0, firestore_1.onDocumentUpdated)({ document: 'Services/{id}', secrets: ['RESEND_API_KEY'] }, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const email = after.email || after.clientEmail;
    if (!email)
        return;
    const name = after.fullName || after.clientName || email;
    // Mediator just assigned
    if (!before.mediatorName && after.mediatorName) {
        await sendTransactionalEmail({
            label: 'case-assigned',
            to: email,
            subject: 'Your GIAC Case Has Been Assigned',
            html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#14213A">
            <h2 style="margin:0 0 12px">A mediator has been assigned to your case</h2>
            <p style="line-height:1.6;color:#4A5468">
              Dear ${name},<br/><br/>
              <strong>${after.mediatorName}</strong> has been assigned to handle your case.
              Open the GIAC app to track progress and communicate with your mediator.
            </p>
            ${EMAIL_FOOTER}
          </div>
        `,
        });
    }
    // Case completed
    if (before.status !== 'completed' && after.status === 'completed') {
        await sendTransactionalEmail({
            label: 'case-completed',
            to: email,
            subject: 'Your GIAC Case Has Been Resolved',
            html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#14213A">
            <h2 style="margin:0 0 12px;color:#2D6A4F">Your case has been resolved ✓</h2>
            <p style="line-height:1.6;color:#4A5468">
              Dear ${name},<br/><br/>
              We are pleased to let you know that your case has been successfully resolved.
              ${after.resolution ? `<br/><br/><strong>Resolution:</strong> ${after.resolution}` : ''}
            </p>
            <p style="line-height:1.6;color:#4A5468">
              Thank you for trusting GIAC with your dispute resolution needs. Open the GIAC app to view the full resolution details.
            </p>
            ${EMAIL_FOOTER}
          </div>
        `,
        });
    }
});
// Certificate issued — course completed email
exports.onCertificateCreated = (0, firestore_1.onDocumentCreated)({ document: 'Certificates/{id}', secrets: ['RESEND_API_KEY'] }, async (event) => {
    const data = event.data?.data();
    if (!data?.userId)
        return;
    const userSnap = await db.collection('users').doc(data.userId).get();
    const email = userSnap.data()?.email;
    if (!email)
        return;
    const name = userSnap.data()?.fullName || email;
    const courseTitle = data.courseTitle || 'your GIAC programme';
    await sendTransactionalEmail({
        label: 'certificate-issued',
        to: email,
        subject: `Congratulations — You've Completed ${courseTitle}`,
        html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#14213A">
          <h2 style="margin:0 0 12px;color:#2D6A4F">Course Completed! 🎓</h2>
          <p style="line-height:1.6;color:#4A5468">
            Dear ${name},<br/><br/>
            Congratulations on successfully completing <strong>${courseTitle}</strong>.
            Your certificate has been issued and is available in the GIAC app.
          </p>
          ${data.credentialId ? `<p style="line-height:1.6;color:#4A5468">Credential ID: <strong>${data.credentialId}</strong></p>` : ''}
          <p style="line-height:1.6;color:#4A5468">
            Open the GIAC app to view and download your certificate.
          </p>
          ${EMAIL_FOOTER}
        </div>
      `,
    });
});
// Admission letter sent email
exports.onAdmissionLetterSent = (0, firestore_1.onDocumentUpdated)({ document: 'CourseRegistrations/{id}', secrets: ['RESEND_API_KEY'] }, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    if (before.status === after.status)
        return;
    if (after.status !== 'letter_sent')
        return;
    const { email, fullName, courseInterest } = after;
    if (!email)
        return;
    const name = fullName || email;
    const courseName = courseInterest === 'pecadr'
        ? 'Professional Executive Certificate in ADR'
        : 'Professional Executive Masters in ADR';
    await sendTransactionalEmail({
        label: 'admission-letter',
        to: email,
        subject: 'Your GIAC Admission Letter is Ready',
        html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#14213A">
          <h2 style="margin:0 0 12px">Your Admission Letter is Ready</h2>
          <p style="line-height:1.6;color:#4A5468">
            Dear ${name},<br/><br/>
            Your admission letter for <strong>${courseName}</strong> has been issued.
            Please open the GIAC app to view and download your letter.
          </p>
          ${EMAIL_FOOTER}
        </div>
      `,
    });
});
// Graduation invitation email
exports.onGraduationInvitation = (0, firestore_1.onDocumentCreated)({ document: 'GraduationInvitations/{id}', secrets: ['RESEND_API_KEY'] }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const { userId, studentName, courseTitle, message, letterUrl } = data;
    let email = data.email;
    if (!email && userId) {
        const userSnap = await db.collection('users').doc(userId).get();
        email = userSnap.data()?.email;
    }
    if (!email)
        return;
    const name = studentName || email;
    const bodyText = message?.trim();
    const messageSection = bodyText
        ? `<p style="line-height:1.8;color:#4A5468;margin:0 0 16px">Dear ${name},<br/><br/>${bodyText.replace(/\n/g, '<br/>')}</p>`
        : `<p style="line-height:1.8;color:#4A5468;margin:0 0 16px">Dear ${name},<br/><br/>Please find your graduation invitation letter attached below.</p>`;
    const letterSection = letterUrl
        ? `<div style="margin-top:24px;text-align:center">
           <a href="${letterUrl}" target="_blank"
              style="display:inline-block;background:#2A3F66;color:#fff;text-decoration:none;
                     padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
             Download Invitation Letter
           </a>
         </div>`
        : '';
    await sendTransactionalEmail({
        label: 'graduation-invitation',
        to: email,
        subject: `GIAC Graduation Invitation — ${courseTitle || 'Programme Completion'}`,
        html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#14213A">
          <img src="https://www.giacghana.com/logo.png" alt="GIAC" width="120" style="margin-bottom:24px" />
          <h2 style="margin:0 0 16px;color:#2A3F66">Graduation Invitation 🎓</h2>
          ${messageSection}
          ${letterSection}
          ${EMAIL_FOOTER}
        </div>
      `,
    });
});
// Password changed security alert (callable from app after successful password change)
exports.onPasswordChanged = (0, https_1.onCall)({ secrets: ['RESEND_API_KEY'] }, async (request) => {
    const { email, name } = request.data;
    if (!email)
        return;
    await sendTransactionalEmail({
        label: 'password-changed',
        to: email,
        subject: 'Your GIAC Password Was Changed',
        html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#14213A">
        <h2 style="margin:0 0 12px">Password Changed</h2>
        <p style="line-height:1.6;color:#4A5468">
          Dear ${name || email},<br/><br/>
          Your GIAC account password was recently changed.
          If you made this change, no action is needed.
        </p>
        <p style="line-height:1.6;color:#4A5468">
          If you did <strong>not</strong> make this change, please reset your password immediately via the GIAC app or contact us at <a href="mailto:${CONTACT_EMAIL}" style="color:#C0392B">${CONTACT_EMAIL}</a>.
        </p>
        ${EMAIL_FOOTER}
      </div>
    `,
    });
});
//# sourceMappingURL=index.js.map