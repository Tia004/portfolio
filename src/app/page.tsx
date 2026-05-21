import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Project } from '@prisma/client';

export const revalidate = 0; // Dynamic server rendering to fetch fresh projects on every load

export default async function Home() {
  let projects: Project[] = [];
  let errorMsg = null;

  try {
    projects = await prisma.project.findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  } catch (error) {
    console.error('Error loading projects on Home:', error);
    errorMsg = 'Impossibile caricare i progetti al momento.';
  }

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 font-sans p-6 md:p-12 relative overflow-x-hidden">
      {/* Background radial glow */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-900/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto relative z-10 py-12">
        {/* Main Header */}
        <header className="flex justify-between items-center mb-16">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Tia Designs
            </h1>
            <p className="text-gray-400 text-sm mt-2 tracking-wide">Developer & Designer Portfolio</p>
          </div>
          <Link
            href="/loginmaster"
            className="text-gray-500 hover:text-blue-400 transition-colors text-xs font-semibold uppercase tracking-widest bg-white/5 border border-white/5 hover:border-blue-500/20 px-4 py-2 rounded-lg"
          >
            Master Portal
          </Link>
        </header>

        {/* Selected Showcase */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
            <h2 className="text-xl font-bold tracking-tight text-white uppercase tracking-wider text-xs">
              Progetti Selezionati
            </h2>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/20 text-red-200 text-sm">
              {errorMsg}
            </div>
          )}

          {projects.length === 0 ? (
            <div className="h-80 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 text-gray-500 text-sm">
              <svg className="w-10 h-10 text-gray-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
              <span>Nessun progetto ancora caricato. Accedi al portale per caricare il tuo primo lavoro!</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1 flex flex-col"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-video w-full overflow-hidden border-b border-white/10 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={project.thumbnail}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    {project.featured && (
                      <span className="absolute top-4 left-4 bg-blue-600/90 backdrop-blur-md text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border border-blue-400/20 shadow-md">
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-gray-400 text-sm mt-3 line-clamp-3 leading-relaxed flex-1">
                      {project.description}
                    </p>

                    {/* Tags */}
                    {project.tags && (
                      <div className="flex gap-2 flex-wrap mt-5">
                        {project.tags.split(',').filter(Boolean).map((t, idx) => (
                          <span
                            key={idx}
                            className="bg-white/5 border border-white/5 text-gray-400 text-xs px-2.5 py-1 rounded-lg"
                          >
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    {(project.projectUrl || project.githubUrl) && (
                      <div className="flex gap-4 border-t border-white/5 mt-5 pt-4">
                        {project.projectUrl && (
                          <a
                            href={project.projectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider"
                          >
                            <span>Live Demo</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                        {project.githubUrl && (
                          <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-300 transition-colors uppercase tracking-wider"
                          >
                            <span>GitHub</span>
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                            </svg>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
