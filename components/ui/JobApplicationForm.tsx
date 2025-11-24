'use client';

import { useState, FormEvent, useRef } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface FormData {
  name: string;
  phone: string;
  email: string;
  subject: string;
  materia: string;
  message: string;
  cv?: File | null;
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  subject?: string;
  materia?: string;
  message?: string;
  cv?: string;
}

export default function JobApplicationForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    subject: '',
    materia: '',
    message: '',
    cv: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (formData.name.length < 8) {
      newErrors.name = 'Inserisci il tuo Nome e Cognome';
    }

    if (formData.phone.length < 10) {
      newErrors.phone = 'Inserisci un numero valido';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Inserisci un'Email valida";
    }

    if (formData.subject.length < 6) {
      newErrors.subject = 'Inserisci almeno 6 caratteri';
    }

    if (!formData.materia) {
      newErrors.materia = 'Seleziona una materia';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Scrivici qualcosa!';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          name: '',
          phone: '',
          email: '',
          subject: '',
          materia: '',
          message: '',
          cv: null,
        });
        setErrors({});
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (PDF, DOC, DOCX)
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({...prev, cv: 'Formato non valido. Usa PDF o DOC'}));
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({...prev, cv: 'File troppo grande. Max 5MB'}));
        return;
      }
      setFormData(prev => ({...prev, cv: file}));
      setErrors(prev => ({...prev, cv: undefined}));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {submitStatus === 'success' && (
        <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg text-green-700">
          Il tuo messaggio è stato inviato. Grazie!
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
          Si è verificato un errore. Riprova più tardi.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Input
            type="text"
            name="name"
            id="name"
            placeholder="Nome e Cognome"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            required
            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
          />
        </div>

        <div>
          <Input
            type="tel"
            name="phone"
            id="phone"
            placeholder="Telefono"
            value={formData.phone}
            onChange={handleChange}
            error={errors.phone}
            required
            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
          />
        </div>

        <div>
          <Input
            type="email"
            name="email"
            id="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
          />
        </div>

        <div>
          <Input
            type="text"
            name="subject"
            id="subject"
            placeholder="Oggetto"
            value={formData.subject}
            onChange={handleChange}
            error={errors.subject}
            required
            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
          />
        </div>

        <div>
          <select
            name="materia"
            id="materia"
            value={formData.materia}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
            required
          >
            <option value="">Seleziona la materia</option>
            <option value="Biologia">Biologia</option>
            <option value="Chimica e Propedeutica Biochimica">Chimica e Propedeutica Biochimica</option>
            <option value="Disegno e Rappresentazione">Disegno e Rappresentazione</option>
            <option value="Fisica e Matematica">Fisica e Matematica</option>
            <option value="Ragionamento Logico">Ragionamento Logico</option>
            <option value="Storia e Cultura Generale">Storia e Cultura Generale</option>
          </select>
          {errors.materia && (
            <p className="mt-1 text-sm text-red-600">{errors.materia}</p>
          )}
        </div>

        <div>
          <textarea
            name="message"
            id="message"
            rows={8}
            placeholder="Messaggio"
            value={formData.message}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors resize-none"
            required
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600">{errors.message}</p>
          )}
        </div>

        {/* File Upload for CV */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            id="cv"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            {formData.cv ? formData.cv.name : 'Allega il tuo CV (PDF, DOC)'}
          </button>
          {errors.cv && (
            <p className="mt-1 text-sm text-red-600">{errors.cv}</p>
          )}
          {formData.cv && (
            <p className="mt-1 text-sm text-green-600">✓ {formData.cv.name}</p>
          )}
        </div>

        <div className="text-center">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            className="min-w-[200px]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Invio in corso...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Invia
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
