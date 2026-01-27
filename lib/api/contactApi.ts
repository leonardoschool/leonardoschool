/**
 * Shared API utilities for contact and job application routes
 * Consolidates rate limiting, email sending, and request handling
 */

import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
import { 
  validateContactForm, 
  sanitizeContactForm, 
  type ContactFormData 
} from '@/lib/validations/formValidation';
import { 
  validateCVFile, 
  MAX_FILE_SIZES 
} from '@/lib/validations/fileValidation';
import { prisma } from '@/lib/prisma/client';
import { getAdminStorage } from '@/lib/firebase/admin';

// =============================================================================
// RATE LIMITING
// =============================================================================

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory rate limiting (resets on server restart)
// For production, consider using Redis or a database
const rateLimitMap = new Map<string, RateLimitRecord>();

const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5;

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count++;
  return true;
}

export function getClientIp(request: Request): string {
  const headers = request.headers;
  return headers.get('x-forwarded-for') || 
         headers.get('x-real-ip') || 
         'unknown';
}

// =============================================================================
// EMAIL TRANSPORTER
// =============================================================================

export function createEmailTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

function getEmailHeader(title: string, emoji: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #dc2626; }
          .value { margin-top: 5px; padding: 10px; background-color: white; border-radius: 3px; word-break: break-word; }
          .footer { margin-top: 20px; padding: 15px; background-color: #111827; color: white; border-radius: 0 0 5px 5px; text-align: center; font-size: 12px; }
          a { color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">${emoji} ${title}</h2>
          </div>
          <div class="content">
  `;
}

function getEmailFooter(senderName: string, formType: string): string {
  return `
          </div>
          <div class="footer">
            <p style="margin: 0;">${formType} ricevuto/a da: <strong>www.leonardoschool.it</strong></p>
            <p style="margin: 5px 0 0 0;">Puoi rispondere direttamente a questa email per contattare ${senderName}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getEmailField(label: string, value: string, icon: string): string {
  return `
    <div class="field">
      <div class="label">${icon} ${label}:</div>
      <div class="value">${value}</div>
    </div>
  `;
}

// =============================================================================
// CONTACT FORM EMAIL
// =============================================================================

interface ContactEmailOptions {
  data: ContactFormData;
  type: 'contact' | 'job-application';
  cvFile?: File | null;
}

export async function sendContactEmail(options: ContactEmailOptions): Promise<{ success: boolean; error?: string }> {
  const { data, type, cvFile } = options;
  const isJobApplication = type === 'job-application';
  
  const title = isJobApplication ? 'Nuova candidatura - Lavora con noi' : 'Nuovo messaggio dal form di contatto';
  const emoji = isJobApplication ? '💼' : '📧';
  const formType = isJobApplication ? 'Candidatura' : 'Messaggio';
  
  // Build HTML content
  let htmlContent = getEmailHeader(title, emoji);
  
  htmlContent += getEmailField('Nome e Cognome', data.name, '👤');
  htmlContent += getEmailField('Telefono', data.phone, '📱');
  htmlContent += getEmailField('Email', `<a href="mailto:${data.email}">${data.email}</a>`, '✉️');
  htmlContent += getEmailField('Oggetto', data.subject, '📋');
  
  if (isJobApplication && data.materia) {
    htmlContent += getEmailField('Materia', data.materia, '📚');
  }
  
  htmlContent += getEmailField('Messaggio', data.message.replace(/\n/g, '<br>'), '💬');
  
  if (cvFile) {
    htmlContent += getEmailField('CV Allegato', cvFile.name, '📎');
  }
  
  htmlContent += getEmailFooter(data.name, formType);
  
  // Build plain text version
  const textContent = `
${title}

Nome e Cognome: ${data.name}
Telefono: ${data.phone}
Email: ${data.email}
Oggetto: ${data.subject}
${isJobApplication && data.materia ? `Materia: ${data.materia}\n` : ''}

Messaggio:
${data.message}

${cvFile ? `CV allegato: ${cvFile.name}` : ''}

---
${formType} ricevuto/a da: www.leonardoschool.it
Rispondi a questa email per contattare direttamente ${data.name}
  `.trim();
  
  // Prepare attachments
  const attachments: Array<{ filename: string; content: Buffer }> = [];
  if (cvFile) {
    const buffer = Buffer.from(await cvFile.arrayBuffer());
    attachments.push({
      filename: cvFile.name,
      content: buffer,
    });
  }
  
  try {
    const transporter = createEmailTransporter();
    
    await transporter.sendMail({
      from: `"Leonardo School - ${isJobApplication ? 'Lavora con noi' : 'Sito Web'}" <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_TO,
      replyTo: data.email,
      subject: isJobApplication ? `Candidatura: ${data.subject}` : `Nuovo messaggio dal sito: ${data.subject}`,
      html: htmlContent,
      text: textContent,
      attachments,
    });
    
    return { success: true };
  } catch (error) {
    console.error(`Error sending ${type} email:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Errore sconosciuto' 
    };
  }
}

// =============================================================================
// REQUEST HANDLERS
// =============================================================================

export interface HandleContactRequestOptions {
  request: Request;
  type: 'contact' | 'job-application';
}

export async function handleContactRequest(options: HandleContactRequestOptions): Promise<NextResponse> {
  const { request, type } = options;
  const isJobApplication = type === 'job-application';
  
  try {
    // Rate limiting
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Troppe richieste. Riprova tra un'ora." },
        { status: 429 }
      );
    }
    
    let data: ContactFormData;
    let cvFile: File | null = null;
    
    if (isJobApplication) {
      // Parse FormData for job applications (with file upload)
      // Cast to globalThis.FormData to use Web API FormData type
      const formData = await request.formData() as unknown as globalThis.FormData;
      
      data = {
        name: (formData.get('name') as string) || '',
        phone: (formData.get('phone') as string) || '',
        email: (formData.get('email') as string) || '',
        subject: (formData.get('subject') as string) || '',
        message: (formData.get('message') as string) || '',
        materia: (formData.get('materia') as string) || '',
      };
      
      cvFile = formData.get('cv') as File | null;
      
      // Validate CV file if present
      if (cvFile && cvFile.size > 0) {
        const cvValidation = validateCVFile(cvFile);
        if (!cvValidation.valid) {
          return NextResponse.json(
            { error: cvValidation.error },
            { status: 400 }
          );
        }
        
        // Additional size check to prevent DoS
        if (cvFile.size > MAX_FILE_SIZES.CV) {
          return NextResponse.json(
            { error: 'Il file CV è troppo grande. Dimensione massima: 5MB' },
            { status: 400 }
          );
        }
      } else {
        cvFile = null; // Reset if empty
      }
    } else {
      // Parse JSON for contact form
      const body = await request.json();
      data = {
        name: body.name || '',
        phone: body.phone || '',
        email: body.email || '',
        subject: body.subject || '',
        message: body.message || '',
      };
    }
    
    // Sanitize inputs
    data = sanitizeContactForm(data);
    
    // Validate
    const validation = validateContactForm(data);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // For job applications, save to database and upload CV to Firebase Storage
    let cvUrl: string | null = null;
    let cvFileName: string | null = null;
    
    if (isJobApplication) {
      // Upload CV to Firebase Storage if present
      if (cvFile && cvFile.size > 0) {
        try {
          const buffer = Buffer.from(await cvFile.arrayBuffer());
          const fileName = `cv/${Date.now()}_${cvFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const bucket = getAdminStorage().bucket();
          const file = bucket.file(fileName);
          
          await file.save(buffer, {
            metadata: {
              contentType: cvFile.type,
            },
          });
          
          // Make file publicly accessible
          await file.makePublic();
          cvUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          cvFileName = cvFile.name;
        } catch (uploadError) {
          console.error('Error uploading CV to Firebase Storage:', uploadError);
          // Continue without CV - don't fail the whole request
        }
      }
      
      // Save job application to database
      try {
        const jobApplication = await prisma.jobApplication.create({
          data: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            subject: data.subject,
            materia: data.materia || '',
            message: data.message,
            cvUrl,
            cvFileName,
            status: 'PENDING',
          },
        });
        
        // Create admin notifications for new job application using the new unified system
        const { notifications } = await import('@/lib/notifications');
        await notifications.jobApplication(prisma, {
          applicationId: jobApplication.id,
          applicantName: data.name,
          subject: data.materia || 'posizione non specificata',
        });
        
        console.log('Job application saved with ID:', jobApplication.id);
      } catch (dbError) {
        console.error('Error saving job application to database:', dbError);
        // Continue to send email even if DB save fails
      }
    } else {
      // Save contact request to database
      try {
        const contactRequest = await prisma.contactRequest.create({
          data: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            subject: data.subject,
            message: data.message,
            status: 'PENDING',
          },
        });
        
        // Create admin notifications for new contact request using the new unified system
        const { notifications } = await import('@/lib/notifications');
        await notifications.contactRequest(prisma, {
          requestId: contactRequest.id,
          senderName: data.name,
          subject: data.subject,
        });
        
        console.log('Contact request saved with ID:', contactRequest.id);
      } catch (dbError) {
        console.error('Error saving contact request to database:', dbError);
        // Continue to send email even if DB save fails
      }
    }
    
    // Send email (optional - don't fail if email fails, data is already saved)
    const emailResult = await sendContactEmail({
      data,
      type,
      cvFile,
    });
    
    if (!emailResult.success) {
      console.error(`Failed to send ${type} email:`, emailResult.error);
      // Don't return error - the request was saved to database successfully
      // Email is a nice-to-have notification, not critical
    }
    
    const successMessage = isJobApplication 
      ? 'Candidatura inviata con successo' 
      : 'Messaggio inviato con successo';
    
    return NextResponse.json(
      { message: successMessage },
      { status: 200 }
    );
    
  } catch (error) {
    console.error(`Error handling ${type} request:`, error);
    return NextResponse.json(
      { error: "Errore durante l'elaborazione. Riprova più tardi." },
      { status: 500 }
    );
  }
}
