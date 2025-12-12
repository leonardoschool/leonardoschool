/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: 'any' types used for complex tRPC query results with dynamic template data
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { colors } from '@/lib/theme/colors';
import { Spinner } from '@/components/ui/loaders';
import { useApiError } from '@/lib/hooks/useApiError';
import { useToast } from '@/components/ui/Toast';
import { 
  FileText, 
  Plus, 
  Edit2, 
  Euro,
  Clock,
  Save,
  X,
  Eye,
  AlertCircle,
  FileCode,
  Info,
  GraduationCap,
  UserCog,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export default function ContractTemplatesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    price: '',
    duration: '',
    targetRole: 'STUDENT' as 'STUDENT' | 'COLLABORATOR',
  });

  // Field errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const utils = trpc.useUtils();
  const { handleMutationError } = useApiError();
  const { showSuccess } = useToast();

  // Fetch templates
  const { data: templates, isLoading } = trpc.contracts.getTemplates.useQuery();

  // Mutations
  const createMutation = trpc.contracts.createTemplate.useMutation({
    onSuccess: () => {
      utils.contracts.getTemplates.invalidate();
      showSuccess('Modello creato', 'Il nuovo modello di contratto è stato creato.');
      resetForm();
    },
    onError: handleMutationError,
  });

  const updateMutation = trpc.contracts.updateTemplate.useMutation({
    onSuccess: () => {
      utils.contracts.getTemplates.invalidate();
      showSuccess('Modello aggiornato', 'Il modello di contratto è stato aggiornato.');
      resetForm();
    },
    onError: handleMutationError,
  });

  const deleteMutation = trpc.contracts.deleteTemplate.useMutation({
    onSuccess: () => {
      utils.contracts.getTemplates.invalidate();
      showSuccess('Modello eliminato', 'Il modello di contratto è stato eliminato.');
      setDeleteModal({ isOpen: false, templateId: '', templateName: '' });
    },
    onError: handleMutationError,
  });

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    templateId: string;
    templateName: string;
  }>({
    isOpen: false,
    templateId: '',
    templateName: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      content: '',
      price: '',
      duration: '',
      targetRole: 'STUDENT',
    });
    setFieldErrors({});
    setTouched({});
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (template: any) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      content: template.content,
      price: template.price?.toString() || '',
      duration: template.duration || '',
      targetRole: template.targetRole || 'STUDENT',
    });
    setEditingId(template.id);
    setShowForm(true);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateField = (field: string, value: string) => {
    let error = '';
    
    switch (field) {
      case 'name':
        if (!value.trim()) error = 'Il nome del template è obbligatorio';
        else if (value.length < 3) error = 'Minimo 3 caratteri';
        break;
      case 'content':
        if (!value.trim()) error = 'Il contenuto del contratto è obbligatorio';
        else if (value.length < 100) error = 'Il contenuto deve essere più dettagliato (minimo 100 caratteri)';
        break;
      case 'price':
        if (value && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
          error = 'Inserisci un prezzo valido';
        }
        break;
    }
    
    setFieldErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field as keyof typeof formData]);
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ name: true, content: true, price: true });
    
    // Validate all required fields
    const nameValid = validateField('name', formData.name);
    const contentValid = validateField('content', formData.content);
    const priceValid = validateField('price', formData.price);

    if (!nameValid || !contentValid || !priceValid) {
      return;
    }

    const data = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      content: formData.content,
      price: formData.price ? parseFloat(formData.price) : undefined,
      duration: formData.duration.trim() || undefined,
      targetRole: formData.targetRole,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Helper to get input class based on error state
  const getInputClass = (field: string) => {
    const hasError = touched[field] && fieldErrors[field];
    const baseClass = `block w-full px-4 py-3 text-base ${colors.background.input} ${colors.text.primary} border rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all`;
    
    if (hasError) {
      return `${baseClass} border-red-500 focus:ring-red-500 focus:border-red-500`;
    }
    return `${baseClass} ${colors.border.primary} focus:ring-[#A01B3B] focus:border-transparent`;
  };

  const defaultContent = `<h2>CONTRATTO DI ISCRIZIONE</h2>

<p><strong>Leonardo School</strong></p>

<hr/>

<h3>PARTI CONTRAENTI</h3>

<p>Il presente contratto è stipulato tra:</p>

<p><strong>Leonardo School</strong> (di seguito "la Scuola")<br/>
con sede in [INDIRIZZO SCUOLA]</p>

<p>e</p>

<p><strong>{{NOME_COMPLETO}}</strong> (di seguito "lo Studente")<br/>
Codice Fiscale: {{CODICE_FISCALE}}<br/>
Data di nascita: {{DATA_NASCITA}}<br/>
Indirizzo: {{INDIRIZZO_COMPLETO}}<br/>
Telefono: {{TELEFONO}}<br/>
Email: {{EMAIL}}</p>

<hr/>

<h3>OGGETTO DEL CONTRATTO</h3>

<p>La Scuola si impegna a fornire allo Studente un percorso di preparazione ai test di ammissione universitari, comprensivo di:</p>

<ul>
  <li>Accesso alla piattaforma di e-learning</li>
  <li>Simulazioni d'esame illimitate</li>
  <li>Materiale didattico digitale</li>
  <li>Monitoraggio dei progressi</li>
  <li>Supporto didattico via email</li>
</ul>

<hr/>

<h3>DURATA E VALIDITÀ</h3>

<p>Il presente contratto ha validità dalla data di sottoscrizione fino al termine dell'anno accademico in corso.</p>

<hr/>

<h3>CORRISPETTIVO</h3>

<p>Per i servizi descritti, lo Studente si impegna a corrispondere l'importo indicato secondo le modalità concordate.</p>

<hr/>

<h3>PRIVACY E TRATTAMENTO DATI</h3>

<p>Lo Studente autorizza il trattamento dei propri dati personali ai sensi del Regolamento UE 2016/679 (GDPR) per le finalità connesse all'esecuzione del presente contratto.</p>

<hr/>

<h3>ACCETTAZIONE</h3>

<p>Con la firma del presente contratto, lo Studente dichiara di aver letto, compreso e accettato tutte le condizioni sopra riportate.</p>

<p>Data: {{DATA_ODIERNA}}</p>`;

  const defaultCollaboratorContent = `<h2>CONTRATTO DI COLLABORAZIONE</h2>

<p><strong>Leonardo School</strong></p>

<hr/>

<h3>PARTI CONTRAENTI</h3>

<p>Il presente contratto è stipulato tra:</p>

<p><strong>Leonardo School</strong> (di seguito "la Scuola")<br/>
con sede in [INDIRIZZO SCUOLA]<br/>
P.IVA: [PARTITA IVA]</p>

<p>e</p>

<p><strong>{{NOME_COMPLETO}}</strong> (di seguito "il Collaboratore")<br/>
Codice Fiscale: {{CODICE_FISCALE}}<br/>
Data di nascita: {{DATA_NASCITA}}<br/>
Indirizzo: {{INDIRIZZO_COMPLETO}}<br/>
Telefono: {{TELEFONO}}<br/>
Email: {{EMAIL}}</p>

<hr/>

<h3>OGGETTO DELLA COLLABORAZIONE</h3>

<p>Il Collaboratore si impegna a prestare la propria attività professionale a favore della Scuola per le seguenti mansioni:</p>

<ul>
  <li>Preparazione e gestione del materiale didattico</li>
  <li>Inserimento e revisione domande nel database</li>
  <li>Supporto agli studenti nella preparazione ai test</li>
  <li>Analisi delle statistiche e reportistica</li>
  <li>Altre attività concordate con la Direzione</li>
</ul>

<hr/>

<h3>DURATA DEL CONTRATTO</h3>

<p>Il presente contratto ha durata dal {{DATA_INIZIO}} al {{DATA_FINE}}, salvo proroga da concordare tra le parti.</p>

<hr/>

<h3>COMPENSO</h3>

<p>Per l'attività svolta, al Collaboratore verrà corrisposto un compenso lordo di €{{COMPENSO}} con le seguenti modalità:</p>

<ul>
  <li>Pagamento mensile/a progetto (specificare)</li>
  <li>Bonifico bancario su IBAN fornito dal Collaboratore</li>
</ul>

<hr/>

<h3>OBBLIGHI DEL COLLABORATORE</h3>

<p>Il Collaboratore si impegna a:</p>

<ul>
  <li>Svolgere le attività assegnate con diligenza e professionalità</li>
  <li>Rispettare le scadenze concordate</li>
  <li>Mantenere la riservatezza su dati e informazioni della Scuola</li>
  <li>Non divulgare materiale didattico proprietario</li>
  <li>Segnalare tempestivamente eventuali impedimenti</li>
</ul>

<hr/>

<h3>OBBLIGHI DELLA SCUOLA</h3>

<p>La Scuola si impegna a:</p>

<ul>
  <li>Fornire gli strumenti necessari allo svolgimento delle attività</li>
  <li>Corrispondere il compenso pattuito nei termini concordati</li>
  <li>Fornire supporto e formazione se necessario</li>
</ul>

<hr/>

<h3>PROPRIETÀ INTELLETTUALE</h3>

<p>Tutto il materiale prodotto dal Collaboratore nell'ambito della presente collaborazione resta di proprietà esclusiva della Scuola.</p>

<hr/>

<h3>PRIVACY E TRATTAMENTO DATI</h3>

<p>Il Collaboratore autorizza il trattamento dei propri dati personali ai sensi del Regolamento UE 2016/679 (GDPR) e si impegna a trattare i dati degli studenti nel rispetto della normativa vigente.</p>

<hr/>

<h3>RISOLUZIONE</h3>

<p>Il contratto può essere risolto:</p>

<ul>
  <li>Per mutuo consenso delle parti</li>
  <li>Con preavviso scritto di 15 giorni</li>
  <li>Per giusta causa in caso di inadempimento grave</li>
</ul>

<hr/>

<h3>ACCETTAZIONE</h3>

<p>Con la firma del presente contratto, il Collaboratore dichiara di aver letto, compreso e accettato tutte le condizioni sopra riportate.</p>

<p>Data: {{DATA_ODIERNA}}</p>`;

  // Get appropriate default content based on target role
  const getDefaultContent = (targetRole: 'STUDENT' | 'COLLABORATOR') => {
    return targetRole === 'COLLABORATOR' ? defaultCollaboratorContent : defaultContent;
  };

  const placeholders = [
    { tag: '{{NOME_COMPLETO}}', desc: 'Nome e cognome' },
    { tag: '{{EMAIL}}', desc: 'Email' },
    { tag: '{{CODICE_FISCALE}}', desc: 'Codice fiscale' },
    { tag: '{{DATA_NASCITA}}', desc: 'Data di nascita' },
    { tag: '{{TELEFONO}}', desc: 'Numero di telefono' },
    { tag: '{{INDIRIZZO}}', desc: 'Via e numero civico' },
    { tag: '{{CITTA}}', desc: 'Città' },
    { tag: '{{PROVINCIA}}', desc: 'Sigla provincia' },
    { tag: '{{CAP}}', desc: 'CAP' },
    { tag: '{{INDIRIZZO_COMPLETO}}', desc: 'Indirizzo completo' },
    { tag: '{{DATA_ODIERNA}}', desc: 'Data firma contratto' },
    { tag: '{{ANNO}}', desc: 'Anno corrente' },
  ];

  // Placeholders aggiuntivi solo per collaboratori
  const collaboratorPlaceholders = [
    { tag: '{{DATA_INIZIO}}', desc: 'Data inizio collaborazione' },
    { tag: '{{DATA_FINE}}', desc: 'Data fine collaborazione' },
    { tag: '{{COMPENSO}}', desc: 'Compenso pattuito' },
    { tag: '{{SPECIALIZZAZIONE}}', desc: 'Area di competenza' },
  ];

  // Get placeholders based on target role
  const getPlaceholders = () => {
    return formData.targetRole === 'COLLABORATOR' 
      ? [...placeholders, ...collaboratorPlaceholders]
      : placeholders;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${colors.text.primary} flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-xl ${colors.primary.bg} flex items-center justify-center`}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            Template Contratti
          </h1>
          <p className={`mt-2 ${colors.text.secondary}`}>
            Crea e gestisci i template dei contratti di iscrizione
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setFormData(prev => ({ ...prev, content: getDefaultContent(prev.targetRole) }));
              setShowForm(true);
            }}
            className={`px-5 py-3 rounded-xl ${colors.primary.gradient} text-white font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all`}
          >
            <Plus className="w-5 h-5" />
            Nuovo Template
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className={`${colors.background.card} rounded-2xl ${colors.effects.shadow.xl} overflow-hidden`}>
          {/* Form Header */}
          <div className={`px-6 py-4 border-b ${colors.border.primary} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${colors.primary.bg} flex items-center justify-center`}>
                <FileCode className="w-4 h-4 text-white" />
              </div>
              <h2 className={`text-lg font-semibold ${colors.text.primary}`}>
                {editingId ? 'Modifica Template' : 'Nuovo Template'}
              </h2>
            </div>
            <button
              onClick={resetForm}
              className={`p-2 rounded-lg ${colors.background.secondary} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-8">
            {/* Error Message */}
            {(createMutation.error || updateMutation.error) && (
              <div className={`${colors.status.error.bgLight} border ${colors.status.error.border} ${colors.status.error.text} px-4 py-3 rounded-xl text-sm flex items-center gap-2`}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {createMutation.error?.message || updateMutation.error?.message}
              </div>
            )}

            {/* Section 1: Informazioni Base */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${colors.primary.bg} flex items-center justify-center`}>
                  <span className="text-white font-semibold text-sm">1</span>
                </div>
                <h3 className={`text-lg font-semibold ${colors.text.primary}`}>
                  Informazioni Base
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Nome Template */}
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                    Nome Template <span className={colors.status.error.text}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    placeholder="Es. Corso Annuale Medicina 2025"
                    className={getInputClass('name')}
                  />
                  {touched.name && fieldErrors.name && (
                    <p className={`mt-1.5 text-sm ${colors.status.error.text} flex items-center gap-1`}>
                      <AlertCircle className="w-4 h-4" />
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                {/* Descrizione */}
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                    Descrizione
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Breve descrizione del corso"
                    className={getInputClass('description')}
                  />
                </div>

                {/* Prezzo */}
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                    <Euro className="w-4 h-4 inline mr-1" />
                    Prezzo (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    onBlur={() => handleBlur('price')}
                    placeholder="1500.00"
                    className={getInputClass('price')}
                  />
                  {touched.price && fieldErrors.price && (
                    <p className={`mt-1.5 text-sm ${colors.status.error.text} flex items-center gap-1`}>
                      <AlertCircle className="w-4 h-4" />
                      {fieldErrors.price}
                    </p>
                  )}
                </div>

                {/* Durata */}
                <div>
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                    <Clock className="w-4 h-4 inline mr-1" />
                    Durata
                  </label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => handleChange('duration', e.target.value)}
                    placeholder="Es. 12 mesi, 6 mesi, 1 anno"
                    className={getInputClass('duration')}
                  />
                </div>

                {/* Destinatario */}
                <div className="lg:col-span-2">
                  <label className={`block text-sm font-medium ${colors.text.primary} mb-2`}>
                    Destinatario Template <span className={colors.status.error.text}>*</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!editingId) {
                          // Se stiamo creando un nuovo template, aggiorna anche il contenuto
                          setFormData(prev => ({ 
                            ...prev, 
                            targetRole: 'STUDENT',
                            content: getDefaultContent('STUDENT')
                          }));
                        } else {
                          setFormData(prev => ({ ...prev, targetRole: 'STUDENT' }));
                        }
                      }}
                      className={`flex-1 min-w-[150px] px-4 py-3 rounded-xl border-2 font-medium flex items-center justify-center gap-2 transition-all ${
                        formData.targetRole === 'STUDENT'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : `${colors.border.primary} ${colors.background.secondary} hover:border-blue-300`
                      }`}
                    >
                      <GraduationCap className="w-5 h-5" />
                      Studenti
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!editingId) {
                          // Se stiamo creando un nuovo template, aggiorna anche il contenuto
                          setFormData(prev => ({ 
                            ...prev, 
                            targetRole: 'COLLABORATOR',
                            content: getDefaultContent('COLLABORATOR')
                          }));
                        } else {
                          setFormData(prev => ({ ...prev, targetRole: 'COLLABORATOR' }));
                        }
                      }}
                      className={`flex-1 min-w-[150px] px-4 py-3 rounded-xl border-2 font-medium flex items-center justify-center gap-2 transition-all ${
                        formData.targetRole === 'COLLABORATOR'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : `${colors.border.primary} ${colors.background.secondary} hover:border-purple-300`
                      }`}
                    >
                      <UserCog className="w-5 h-5" />
                      Collaboratori
                    </button>
                  </div>
                  <p className={`mt-1.5 text-xs ${colors.text.muted}`}>
                    Questo template sarà disponibile solo per il tipo di utente selezionato
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Contenuto Contratto */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${colors.primary.bg} flex items-center justify-center`}>
                  <span className="text-white font-semibold text-sm">2</span>
                </div>
                <h3 className={`text-lg font-semibold ${colors.text.primary}`}>
                  Contenuto Contratto
                </h3>
              </div>

              {/* Placeholder Info */}
              <div className={`p-4 rounded-xl ${colors.status.info.softBg} border ${colors.status.info.border}`}>
                <div className="flex items-start gap-3">
                  <Info className={`w-5 h-5 ${colors.status.info.text} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className={`font-medium ${colors.status.info.text} mb-2`}>Placeholder disponibili</p>
                    <div className="flex flex-wrap gap-2">
                      {getPlaceholders().map((p) => (
                        <span
                          key={p.tag}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-mono ${colors.background.secondary} ${colors.text.secondary} cursor-help`}
                          title={p.desc}
                        >
                          {p.tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`block text-sm font-medium ${colors.text.primary}`}>
                    Contenuto HTML <span className={colors.status.error.text}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPreviewContent(formData.content)}
                    className={`text-sm ${colors.primary.text} flex items-center gap-1 hover:underline font-medium`}
                  >
                    <Eye className="w-4 h-4" />
                    Anteprima
                  </button>
                </div>
                <textarea
                  value={formData.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  onBlur={() => handleBlur('content')}
                  rows={18}
                  placeholder="Inserisci il contenuto HTML del contratto..."
                  className={`${getInputClass('content')} font-mono text-sm leading-relaxed`}
                />
                {touched.content && fieldErrors.content && (
                  <p className={`mt-1.5 text-sm ${colors.status.error.text} flex items-center gap-1`}>
                    <AlertCircle className="w-4 h-4" />
                    {fieldErrors.content}
                  </p>
                )}
                <p className={`mt-1.5 text-xs ${colors.text.muted}`}>
                  Usa i tag HTML standard (h2, h3, p, ul, li, strong, br, hr) per formattare il contratto
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className={`flex flex-col sm:flex-row gap-3 pt-4 border-t ${colors.border.primary}`}>
              <button
                type="button"
                onClick={resetForm}
                className={`px-6 py-3 rounded-xl ${colors.background.secondary} font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className={`px-6 py-3 rounded-xl ${colors.primary.gradient} text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all`}
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <Spinner size="sm" variant="white" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {editingId ? 'Salva Modifiche' : 'Crea Template'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      <div className={`${colors.background.card} rounded-2xl ${colors.effects.shadow.xl} overflow-hidden`}>
        {/* List Header */}
        <div className={`px-6 py-4 border-b ${colors.border.primary}`}>
          <h2 className={`font-semibold ${colors.text.primary}`}>
            Template Salvati
            {templates && templates.length > 0 && (
              <span className={`ml-2 text-sm font-normal ${colors.text.secondary}`}>
                ({templates.length})
              </span>
            )}
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" />
            <p className={`mt-4 ${colors.text.secondary}`}>Caricamento template...</p>
          </div>
        ) : !templates?.length ? (
          <div className="p-12 text-center">
            <div className={`w-16 h-16 mx-auto rounded-2xl ${colors.background.secondary} flex items-center justify-center mb-4`}>
              <FileText className={`w-8 h-8 ${colors.text.muted}`} />
            </div>
            <p className={`font-medium ${colors.text.primary}`}>Nessun template creato</p>
            <p className={`text-sm ${colors.text.muted} mt-1`}>
              Crea il primo template per iniziare ad assegnare contratti
            </p>
          </div>
        ) : (
          <div className={`divide-y ${colors.border.primary}`}>
            {templates.map((template: any) => (
              <div 
                key={template.id} 
                className={`p-6 hover:${colors.background.secondary} transition-colors`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${colors.status.success.softBg} flex items-center justify-center flex-shrink-0`}>
                        <FileText className={`w-5 h-5 ${colors.status.success.text}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className={`font-semibold text-lg ${colors.text.primary} truncate`}>
                          {template.name}
                        </h3>
                        {template.description && (
                          <p className={`${colors.text.secondary} text-sm truncate`}>
                            {template.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3 ml-13">
                      {/* Target Role Badge */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        template.targetRole === 'COLLABORATOR'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }`}>
                        {template.targetRole === 'COLLABORATOR' ? (
                          <><UserCog className="w-3.5 h-3.5" /> Collaboratori</>
                        ) : (
                          <><GraduationCap className="w-3.5 h-3.5" /> Studenti</>
                        )}
                      </span>
                      {template.price && (
                        <span className={`inline-flex items-center gap-1.5 text-sm ${colors.text.secondary}`}>
                          <Euro className="w-4 h-4" />
                          {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(template.price)}
                        </span>
                      )}
                      {template.duration && (
                        <span className={`inline-flex items-center gap-1.5 text-sm ${colors.text.secondary}`}>
                          <Clock className="w-4 h-4" />
                          {template.duration}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 self-end lg:self-center">
                    <button
                      onClick={() => setPreviewContent(template.content)}
                      className={`px-4 py-2 rounded-lg ${colors.background.secondary} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm font-medium`}
                      title="Anteprima"
                    >
                      <Eye className="w-4 h-4" />
                      Anteprima
                    </button>
                    <button
                      onClick={() => handleEdit(template)}
                      className={`px-4 py-2 rounded-lg ${colors.status.info.softBg} ${colors.status.info.text} hover:opacity-80 transition-colors flex items-center gap-2 text-sm font-medium`}
                      title="Modifica"
                    >
                      <Edit2 className="w-4 h-4" />
                      Modifica
                    </button>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, templateId: template.id, templateName: template.name })}
                      className={`px-4 py-2 rounded-lg ${colors.status.error.softBg} ${colors.status.error.text} hover:opacity-80 transition-colors flex items-center gap-2 text-sm font-medium`}
                      title="Elimina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewContent && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewContent(null)}
        >
          <div 
            className={`${colors.background.card} rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${colors.border.primary}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${colors.primary.bg} flex items-center justify-center`}>
                  <Eye className="w-4 h-4 text-white" />
                </div>
                <h3 className={`font-semibold ${colors.text.primary}`}>Anteprima Contratto</h3>
              </div>
              <button
                onClick={() => setPreviewContent(null)}
                className={`p-2 rounded-lg ${colors.background.secondary} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 lg:p-8 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div 
                className="contract-preview"
                dangerouslySetInnerHTML={{ __html: previewContent }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom styles for contract preview */}
      <style jsx global>{`
        .contract-preview {
          font-size: 0.95rem;
          line-height: 1.7;
        }
        .contract-preview h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          margin-top: 0;
        }
        .contract-preview h3 {
          font-size: 1.15rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          margin-top: 1.5rem;
        }
        .contract-preview p {
          margin-bottom: 0.75rem;
        }
        .contract-preview ul {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }
        .contract-preview li {
          margin-bottom: 0.5rem;
        }
        .contract-preview hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 1.5rem 0;
        }
        .dark .contract-preview hr {
          border-top-color: #374151;
        }
        .contract-preview strong {
          font-weight: 600;
        }
      `}</style>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${colors.background.card} rounded-2xl max-w-md w-full p-6 shadow-2xl`}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-bold ${colors.text.primary}`}>Elimina Template</h3>
                <p className={`mt-2 ${colors.text.secondary}`}>
                  Sei sicuro di voler eliminare il template &quot;{deleteModal.templateName}&quot;? 
                  Il template non sarà più disponibile per nuovi contratti.
                </p>
              </div>
            </div>
            
            {deleteMutation.error && (
              <div className={`mt-4 p-3 rounded-lg ${colors.status.error.softBg} ${colors.status.error.text} text-sm`}>
                {deleteMutation.error.message}
              </div>
            )}
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteModal({ isOpen: false, templateId: '', templateName: '' })}
                disabled={deleteMutation.isPending}
                className={`flex-1 px-4 py-3 rounded-xl ${colors.background.secondary} font-medium hover:opacity-80 transition-opacity disabled:opacity-50`}
              >
                Annulla
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: deleteModal.templateId })}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size="xs" variant="white" />
                    Eliminazione...
                  </span>
                ) : (
                  'Elimina'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
