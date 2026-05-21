'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  title: string;
  description: string;
  longDescription: string | null;
  thumbnail: string;
  projectUrl: string | null;
  githubUrl: string | null;
  tags: string;
  featured: boolean;
  order: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [tags, setTags] = useState('');
  const [featured, setFeatured] = useState(false);
  const [order, setOrder] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Impossibile caricare i progetti.');
      const data = await res.json();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Errore nel recupero dei progetti.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/projects/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Errore di caricamento immagine.');
      }

      const data = await res.json();
      setThumbnail(data.url);
      showTemporarySuccess('Immagine caricata con successo!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Errore durante l&apos;upload dell&apos;immagine.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !thumbnail) {
      setError('Titolo, descrizione e immagine di copertina sono obbligatori.');
      return;
    }

    setSubmitLoading(true);
    setError(null);
    setSuccessMessage(null);

    const projectData = {
      title,
      description,
      longDescription: longDescription || null,
      thumbnail,
      projectUrl: projectUrl || null,
      githubUrl: githubUrl || null,
      tags,
      featured,
      order: Number(order) || 0,
    };

    try {
      let res;
      if (editingId) {
        // Edit project
        res = await fetch(`/api/projects/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });
      } else {
        // Create project
        res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Errore durante il salvataggio del progetto.');
      }

      showTemporarySuccess(editingId ? 'Progetto modificato con successo!' : 'Nuovo progetto caricato con successo!');
      resetForm();
      fetchProjects();
    } catch (err: any) {
      setError(err.message || 'Errore nel salvataggio del progetto.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditClick = (project: Project) => {
    setEditingId(project.id);
    setTitle(project.title);
    setDescription(project.description);
    setLongDescription(project.longDescription || '');
    setThumbnail(project.thumbnail);
    setProjectUrl(project.projectUrl || '');
    setGithubUrl(project.githubUrl || '');
    setTags(project.tags);
    setFeatured(project.featured);
    setOrder(project.order);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo progetto? L&apos;azione è irreversibile.')) return;

    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Errore nell&apos;eliminazione.');
      }

      showTemporarySuccess('Progetto eliminato.');
      fetchProjects();
      if (editingId === id) resetForm();
    } catch (err: any) {
      setError(err.message || 'Errore nell&apos;eliminazione del progetto.');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setLongDescription('');
    setThumbnail('');
    setProjectUrl('');
    setGithubUrl('');
    setTags('');
    setFeatured(false);
    setOrder(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/loginmaster');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const showTemporarySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm tracking-wider animate-pulse font-medium">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 font-sans p-6 md:p-12 relative overflow-x-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-30%] right-[-10%] w-[70%] h-[70%] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-900/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Block */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 pb-6 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Master Dashboard
            </h1>
            <p className="text-gray-400 text-sm mt-1">Gestisci i tuoi progetti in tempo reale con autenticazione Passkey sicura.</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/5 hover:bg-red-950/30 border border-white/10 hover:border-red-500/20 text-gray-400 hover:text-red-400 font-medium py-2 px-5 rounded-lg transition duration-200 cursor-pointer flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Disconnetti
          </button>
        </header>

        {/* Action Feedbacks */}
        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-950/40 border border-red-500/20 text-red-200 text-sm flex gap-3 items-center">
            <svg className="w-5 h-5 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-8 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-200 text-sm flex gap-3 items-center">
            <svg className="w-5 h-5 flex-shrink-0 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Column */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl sticky top-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                {editingId ? 'Modifica Progetto' : 'Nuovo Progetto'}
              </h2>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-2">Titolo *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Esempio: Canapa Store E-Commerce"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition duration-150"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-2">Breve Descrizione *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Riassunto visibile nella scheda del portfolio..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition duration-150 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-2">Descrizione Dettagliata (Opzionale)</label>
                  <textarea
                    value={longDescription}
                    onChange={(e) => setLongDescription(e.target.value)}
                    rows={4}
                    placeholder="Dettagli aggiuntivi per la pagina interna del progetto..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition duration-150 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-2">Copertina Progetto *</label>
                  <div className="flex flex-col gap-3">
                    {thumbnail && (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-black/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setThumbnail('')}
                          className="absolute top-2 right-2 bg-red-650 hover:bg-red-550 border border-red-800 text-white rounded-full p-1.5 shadow transition cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    {!thumbnail && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadLoading}
                        className="w-full bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-xl py-8 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 text-sm text-gray-400 disabled:opacity-50"
                      >
                        {uploadLoading ? (
                          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Seleziona o trascina un file</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-2">Link Progetto</label>
                    <input
                      type="url"
                      value={projectUrl}
                      onChange={(e) => setProjectUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition duration-150"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-2">GitHub URL</label>
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition duration-150"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-2">Tags (separati da virgola)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Next.js, Tailwind, WebAuthn"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition duration-150"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-2">Ordinamento (Ordine)</label>
                    <input
                      type="number"
                      value={order}
                      onChange={(e) => setOrder(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition duration-150"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-5">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 bg-white/5 border border-white/10 rounded cursor-pointer"
                    />
                    <label htmlFor="featured" className="text-sm font-medium text-gray-300 cursor-pointer select-none">
                      In Evidenza
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 rounded-xl transition duration-150 cursor-pointer"
                    >
                      Annulla
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-medium py-3 rounded-xl transition duration-150 cursor-pointer shadow-lg hover:shadow-blue-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span>{editingId ? 'Aggiorna' : 'Salva Progetto'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* List Column */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl min-h-[500px]">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                Tutti i Progetti ({projects.length})
              </h2>

              {projects.length === 0 ? (
                <div className="h-96 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-4 text-gray-500 text-sm">
                  <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>Non hai ancora caricato alcun progetto. Usa il modulo a sinistra per iniziare!</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="bg-white/3 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-xl p-4 transition duration-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between group"
                    >
                      <div className="flex gap-4 items-center">
                        <div className="relative w-20 aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/40 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-white tracking-tight">{project.title}</h3>
                            {project.featured && (
                              <span className="bg-blue-900/40 border border-blue-500/20 text-blue-300 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
                                In Evidenza
                              </span>
                            )}
                            <span className="bg-white/5 border border-white/5 text-gray-400 text-xs px-2 py-0.5 rounded-lg">
                              Ordine: {project.order}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs mt-1.5 line-clamp-1 max-w-md">{project.description}</p>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {project.tags.split(',').filter(Boolean).map((t, idx) => (
                              <span key={idx} className="bg-white/5 text-gray-500 text-[10px] px-2 py-0.5 rounded-md">
                                {t.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleEditClick(project)}
                          className="bg-white/5 hover:bg-blue-950/20 border border-white/10 hover:border-blue-500/20 text-gray-400 hover:text-blue-400 p-2 rounded-lg transition duration-150 cursor-pointer"
                          title="Modifica"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(project.id)}
                          className="bg-white/5 hover:bg-red-950/20 border border-white/10 hover:border-red-500/20 text-gray-400 hover:text-red-400 p-2 rounded-lg transition duration-150 cursor-pointer"
                          title="Elimina"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
