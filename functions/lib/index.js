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
exports.onPasswordChanged = exports.onAdmissionLetterSent = exports.onCertificateCreated = exports.onCaseUpdated = exports.onApplicationUpdated = exports.onUserCreated = exports.onAdminNotification = exports.onStudentNotification = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const resend_1 = require("resend");
admin.initializeApp();
const db = admin.firestore();
const FROM_EMAIL = 'GIAC <noreply@giacghana.com>';
const CONTACT_EMAIL = 'info@giacghana.com';
const EMAIL_FOOTER = `
  <hr style="border:none;border-top:1px solid #E3E9F2;margin:32px 0 20px" />
  <p style="font-size:12px;color:#9AA3B2;line-height:1.8;margin:0">
    Global Institute of ADR Center · Kasoa, Ghana<br/>
    For enquiries, contact us at <a href="mailto:${CONTACT_EMAIL}" style="color:#14213A">${CONTACT_EMAIL}</a><br/>
    This is an automated message — please do not reply to this email.
  </p>`;
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
// ─── Part 4: Push Notifications ───────────────────────────────────────────────
// Student gets a push when a new StudentNotification is created for them
exports.onStudentNotification = (0, firestore_1.onDocumentCreated)('StudentNotifications/{id}', async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const { userId, message } = data;
    if (!userId || !message)
        return;
    const userSnap = await db.collection('users').doc(userId).get();
    const pushToken = userSnap.data()?.pushToken;
    if (!pushToken)
        return;
    await sendFcmPush([pushToken], 'GIAC', message, { notificationId: event.params.id });
});
// Admin gets a push when a new AdminNotification is created
exports.onAdminNotification = (0, firestore_1.onDocumentCreated)('AdminNotifications/{id}', async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const { message } = data;
    if (!message)
        return;
    const tokens = await getAdminPushTokens();
    await sendFcmPush(tokens, 'GIAC Admin', message, { notificationId: event.params.id });
});
// ─── Part 5: Automated Emails ─────────────────────────────────────────────────
// Welcome email when a new user document is created
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
            <a href="https://giacghana.com" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#1F2A44;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
              Open GIAC App
            </a>
            ${EMAIL_FOOTER}
          </div>
        `,
        });
    }
    catch (err) {
        console.error('[onUserCreated] Failed to send welcome email:', err);
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
              Please log in to the GIAC app to view your admission details and next steps.
            </p>
            <a href="https://giacghana.com" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#2D6A4F;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
              View My Admission
            </a>
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
              We encourage you to reapply in the future or contact us if you have any questions.
            </p>
            <a href="https://giacghana.com" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#1F2A44;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
              Contact GIAC
            </a>
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
              You can track progress and communicate through the GIAC app.
            </p>
            <a href="https://giacghana.com" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#1F2A44;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
              View My Case
            </a>
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
              Thank you for trusting GIAC with your dispute resolution needs.
            </p>
            <a href="https://giacghana.com" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#2D6A4F;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
              View Resolution
            </a>
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
          <p style="line-height:1.6;color:#4A5468">
            Credential ID: <strong>${data.credentialId || 'N/A'}</strong>
          </p>
          <a href="https://giacghana.com" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#2D6A4F;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Download Certificate
          </a>
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
          <a href="https://giacghana.com" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#1F2A44;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            View Admission Letter
          </a>
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
          If you did <strong>not</strong> make this change, please reset your password immediately and contact GIAC support.
        </p>
        <a href="https://giacghana.com" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#C0392B;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Reset My Password
        </a>
        ${EMAIL_FOOTER}
      </div>
    `,
    });
});
//# sourceMappingURL=index.js.map