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
exports.onCaseUpdated = exports.onApplicationUpdated = exports.onUserCreated = exports.onAdminNotification = exports.onStudentNotification = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const resend_1 = require("resend");
admin.initializeApp();
const db = admin.firestore();
const FROM_EMAIL = 'GIAC <noreply@giacghana.com>';
function getResend() {
    return new resend_1.Resend(process.env.RESEND_API_KEY);
}
// ─── Expo Push Helper ─────────────────────────────────────────────────────────
async function sendFcmPush(tokens, title, body, data) {
    const messages = tokens
        .filter((t) => t.startsWith('ExponentPushToken['))
        .map((to) => ({ to, title, body, sound: 'default', data: data ?? {} }));
    if (messages.length === 0) {
        console.log('[Push] No valid Expo tokens to send to.');
        return;
    }
    console.log('[Push] Sending to tokens:', tokens);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
    });
    const json = await res.json();
    console.log('[Push] Expo response:', JSON.stringify(json));
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
exports.onUserCreated = (0, firestore_1.onDocumentCreated)('users/{uid}', async (event) => {
    const data = event.data?.data();
    if (!data?.email)
        return;
    const name = data.fullName || data.email;
    await getResend().emails.send({
        from: FROM_EMAIL,
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
          <p style="margin-top:32px;font-size:12px;color:#9AA3B2">
            Global Institute of ADR Center · Kasoa, Ghana
          </p>
        </div>
      `,
    });
});
// Application approved or rejected email
exports.onApplicationUpdated = (0, firestore_1.onDocumentUpdated)('APPLICATIONS/{id}', async (event) => {
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
        await getResend().emails.send({
            from: FROM_EMAIL,
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
            <p style="margin-top:32px;font-size:12px;color:#9AA3B2">Global Institute of ADR Center · Kasoa, Ghana</p>
          </div>
        `,
        });
    }
    else if (status === 'rejected') {
        await getResend().emails.send({
            from: FROM_EMAIL,
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
            <p style="margin-top:32px;font-size:12px;color:#9AA3B2">Global Institute of ADR Center · Kasoa, Ghana</p>
          </div>
        `,
        });
    }
});
// Mediator assigned or case status changed email
exports.onCaseUpdated = (0, firestore_1.onDocumentUpdated)('Services/{id}', async (event) => {
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
        await getResend().emails.send({
            from: FROM_EMAIL,
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
            <p style="margin-top:32px;font-size:12px;color:#9AA3B2">Global Institute of ADR Center · Kasoa, Ghana</p>
          </div>
        `,
        });
    }
    // Case completed
    if (before.status !== 'completed' && after.status === 'completed') {
        await getResend().emails.send({
            from: FROM_EMAIL,
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
            <p style="margin-top:32px;font-size:12px;color:#9AA3B2">Global Institute of ADR Center · Kasoa, Ghana</p>
          </div>
        `,
        });
    }
});
//# sourceMappingURL=index.js.map