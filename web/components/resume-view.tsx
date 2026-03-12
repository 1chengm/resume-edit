import type { CSSProperties } from 'react'
import type { ResumeContent } from '@/types/resume'
import { renderMarkdown } from '@/lib/markdown'

interface ResumeViewProps {
  data: {
    resume?: {
      color_theme?: string | null
      template?: string | null
    }
    content?: {
      content_json?: ResumeContent
    } | null
  }
}

function SectionTitle({ theme, children }: { theme: string; children: string }) {
  return (
    <h2
      className="mb-3 border-b pb-1 text-lg font-bold uppercase tracking-[0.18em]"
      style={{ color: theme, borderColor: '#e5e7eb' }}
    >
      {children}
    </h2>
  )
}

function ModernTemplate({ content, theme }: { content: ResumeContent; theme: string }) {
  return (
    <>
      <header className="mb-8 border-b-2 pb-6" style={{ borderColor: theme }}>
        <h1 className="mb-2 text-4xl font-bold tracking-tight" style={{ color: theme }}>
          {content.personal?.full_name || 'Your Name'}
        </h1>
        <p className="mb-4 text-xl text-slate-500">{content.personal?.title || 'Professional Title'}</p>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
          {content.personal?.phone && <span>{content.personal.phone}</span>}
          {content.personal?.email && <span>{content.personal.email}</span>}
          {content.personal?.linkedin && <span>{content.personal.linkedin}</span>}
          {content.personal?.portfolio && <span>{content.personal.portfolio}</span>}
        </div>
      </header>

      <div className="space-y-8">
        {content.summary && (
          <section>
            <SectionTitle theme={theme}>Professional Summary</SectionTitle>
            <div
              className="text-sm leading-relaxed text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content.summary) }}
            />
          </section>
        )}

        {(content.experience?.length || 0) > 0 && (
          <section>
            <SectionTitle theme={theme}>Experience</SectionTitle>
            <div className="space-y-6">
              {content.experience?.map((item, index) => (
                <div key={index}>
                  <div className="mb-1 flex justify-between gap-4">
                    <h3 className="font-bold text-slate-900">{item?.role}</h3>
                    <span className="whitespace-nowrap text-sm text-slate-500">
                      {item?.from} - {item?.to}
                    </span>
                  </div>
                  <p className="mb-2 text-sm font-medium text-slate-700">{item?.company}</p>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-slate-600">
                    {(item?.highlights || []).map((highlight, idx) => (
                      <li key={idx}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {(content.projects?.length || 0) > 0 && (
          <section>
            <SectionTitle theme={theme}>Projects</SectionTitle>
            <div className="space-y-5">
              {content.projects?.map((project, index) => (
                <div key={index}>
                  <h3 className="font-bold text-slate-900">{project?.name}</h3>
                  <p className="mb-2 text-sm italic text-slate-700">{project?.description}</p>
                  <ul className="ml-4 list-disc space-y-1 text-sm text-slate-600">
                    {(project?.highlights || []).map((highlight, idx) => (
                      <li key={idx}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {(content.education?.length || 0) > 0 && (
          <section>
            <SectionTitle theme={theme}>Education</SectionTitle>
            <div className="space-y-4">
              {content.education?.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between gap-4">
                    <h3 className="font-bold text-slate-900">{item?.school}</h3>
                    <span className="text-sm text-slate-500">{item?.year}</span>
                  </div>
                  <p className="text-sm text-slate-700">{item?.degree}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {((content.skills?.length || 0) > 0 || (content.certificates?.length || 0) > 0) && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {(content.skills?.length || 0) > 0 && (
              <section>
                <SectionTitle theme={theme}>Skills</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {content.skills?.map((skill, index) => (
                    <span key={index} className="rounded bg-slate-100 px-2 py-1 text-sm text-slate-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {(content.certificates?.length || 0) > 0 && (
              <section>
                <SectionTitle theme={theme}>Certificates</SectionTitle>
                <ul className="ml-4 list-disc space-y-1 text-sm text-slate-600">
                  {content.certificates?.map((certificate, index) => (
                    <li key={index}>{certificate}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function ClassicTemplate({ content, theme }: { content: ResumeContent; theme: string }) {
  return (
    <div className="text-stone-900" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <header className="mb-8 border-b pb-5" style={{ borderColor: `${theme}55` }}>
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-[2.4rem] font-semibold" style={{ color: theme }}>
              {content.personal?.full_name || 'Your Name'}
            </h1>
            <p className="mt-1 text-base uppercase tracking-[0.22em] text-stone-500">
              {content.personal?.title || 'Professional Title'}
            </p>
          </div>
          <div className="space-y-1 text-right text-sm text-stone-600">
            {content.personal?.email && <div>{content.personal.email}</div>}
            {content.personal?.phone && <div>{content.personal.phone}</div>}
            {content.personal?.linkedin && <div>{content.personal.linkedin}</div>}
            {content.personal?.portfolio && <div>{content.personal.portfolio}</div>}
          </div>
        </div>
      </header>

      {content.summary && (
        <section className="mb-7">
          <SectionTitle theme={theme}>Profile</SectionTitle>
          <div
            className="text-sm leading-7 text-stone-700"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content.summary) }}
          />
        </section>
      )}

      <div className="grid grid-cols-[1.4fr_0.8fr] gap-8">
        <div className="space-y-7">
          {(content.experience?.length || 0) > 0 && (
            <section>
              <SectionTitle theme={theme}>Experience</SectionTitle>
              <div className="space-y-5">
                {content.experience?.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-stone-900">{item?.role}</h3>
                        <p className="text-sm text-stone-600">{item?.company}</p>
                      </div>
                      <span className="text-sm text-stone-500">
                        {item?.from} - {item?.to}
                      </span>
                    </div>
                    <ul className="mt-2 ml-4 list-disc space-y-1 text-sm leading-6 text-stone-700">
                      {(item?.highlights || []).map((highlight, idx) => (
                        <li key={idx}>{highlight}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(content.projects?.length || 0) > 0 && (
            <section>
              <SectionTitle theme={theme}>Selected Projects</SectionTitle>
              <div className="space-y-4">
                {content.projects?.map((project, index) => (
                  <div key={index}>
                    <h3 className="font-semibold text-stone-900">{project?.name}</h3>
                    <p className="text-sm italic text-stone-600">{project?.description}</p>
                    <ul className="mt-2 ml-4 list-disc space-y-1 text-sm leading-6 text-stone-700">
                      {(project?.highlights || []).map((highlight, idx) => (
                        <li key={idx}>{highlight}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-7 border-l pl-6" style={{ borderColor: `${theme}25` }}>
          {(content.education?.length || 0) > 0 && (
            <section>
              <SectionTitle theme={theme}>Education</SectionTitle>
              <div className="space-y-3">
                {content.education?.map((item, index) => (
                  <div key={index}>
                    <h3 className="font-semibold text-stone-900">{item?.school}</h3>
                    <p className="text-sm text-stone-700">{item?.degree}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{item?.year}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(content.skills?.length || 0) > 0 && (
            <section>
              <SectionTitle theme={theme}>Skills</SectionTitle>
              <div className="space-y-2 text-sm leading-6 text-stone-700">
                {content.skills?.map((skill, index) => (
                  <div key={index}>{skill}</div>
                ))}
              </div>
            </section>
          )}

          {(content.certificates?.length || 0) > 0 && (
            <section>
              <SectionTitle theme={theme}>Certificates</SectionTitle>
              <ul className="ml-4 list-disc space-y-1 text-sm leading-6 text-stone-700">
                {content.certificates?.map((certificate, index) => (
                  <li key={index}>{certificate}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

function CreativeTemplate({ content, theme }: { content: ResumeContent; theme: string }) {
  const sidebarStyle = {
    background: `linear-gradient(180deg, ${theme} 0%, ${theme}cc 100%)`,
  } satisfies CSSProperties

  return (
    <div className="grid min-h-full grid-cols-[0.75fr_1.45fr] overflow-hidden rounded-[18px] border border-slate-200">
      <aside className="px-8 py-9 text-white" style={sidebarStyle}>
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">Resume</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight">{content.personal?.full_name || 'Your Name'}</h1>
          <p className="mt-3 text-sm uppercase tracking-[0.22em] text-white/80">
            {content.personal?.title || 'Professional Title'}
          </p>
        </div>

        <div className="space-y-6">
          <section>
            <p className="mb-2 text-xs uppercase tracking-[0.24em] text-white/70">Contact</p>
            <div className="space-y-2 text-sm leading-6 text-white/95">
              {content.personal?.phone && <div>{content.personal.phone}</div>}
              {content.personal?.email && <div>{content.personal.email}</div>}
              {content.personal?.linkedin && <div>{content.personal.linkedin}</div>}
              {content.personal?.portfolio && <div>{content.personal.portfolio}</div>}
            </div>
          </section>

          {(content.skills?.length || 0) > 0 && (
            <section>
              <p className="mb-2 text-xs uppercase tracking-[0.24em] text-white/70">Core Skills</p>
              <div className="flex flex-wrap gap-2">
                {content.skills?.map((skill, index) => (
                  <span key={index} className="rounded-full border border-white/25 px-3 py-1 text-xs text-white">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {(content.education?.length || 0) > 0 && (
            <section>
              <p className="mb-2 text-xs uppercase tracking-[0.24em] text-white/70">Education</p>
              <div className="space-y-3 text-sm leading-6 text-white/95">
                {content.education?.map((item, index) => (
                  <div key={index}>
                    <div className="font-semibold">{item?.school}</div>
                    <div>{item?.degree}</div>
                    <div className="text-white/70">{item?.year}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(content.certificates?.length || 0) > 0 && (
            <section>
              <p className="mb-2 text-xs uppercase tracking-[0.24em] text-white/70">Certificates</p>
              <ul className="space-y-2 text-sm leading-6 text-white/95">
                {content.certificates?.map((certificate, index) => (
                  <li key={index}>{certificate}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </aside>

      <main className="bg-white px-8 py-9">
        {content.summary && (
          <section className="mb-8">
            <SectionTitle theme={theme}>Profile</SectionTitle>
            <div
              className="text-sm leading-7 text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content.summary) }}
            />
          </section>
        )}

        {(content.experience?.length || 0) > 0 && (
          <section className="mb-8">
            <SectionTitle theme={theme}>Experience</SectionTitle>
            <div className="space-y-5">
              {content.experience?.map((item, index) => (
                <div key={index} className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-2 flex justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">{item?.role}</h3>
                      <p className="text-sm text-slate-600">{item?.company}</p>
                    </div>
                    <span className="text-sm text-slate-500">
                      {item?.from} - {item?.to}
                    </span>
                  </div>
                  <ul className="ml-4 list-disc space-y-1 text-sm leading-6 text-slate-700">
                    {(item?.highlights || []).map((highlight, idx) => (
                      <li key={idx}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {(content.projects?.length || 0) > 0 && (
          <section>
            <SectionTitle theme={theme}>Projects</SectionTitle>
            <div className="grid gap-4">
              {content.projects?.map((project, index) => (
                <div key={index} className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-900">{project?.name}</h3>
                  <p className="mt-1 text-sm italic text-slate-600">{project?.description}</p>
                  <ul className="mt-2 ml-4 list-disc space-y-1 text-sm leading-6 text-slate-700">
                    {(project?.highlights || []).map((highlight, idx) => (
                      <li key={idx}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export function ResumeView({ data }: ResumeViewProps) {
  const content = data.content?.content_json || {}
  const theme = data.resume?.color_theme || '#0d0d0d'
  const template = data.resume?.template || 'Modern'

  return (
    <div
      className="resume-print resume-content mx-auto min-h-[297mm] w-[210mm] rounded-xl bg-white p-[20mm] shadow-2xl print:m-0 print:rounded-none print:p-[20mm] print:shadow-none"
      style={{ boxSizing: 'border-box' }}
    >
      {template === 'Classic' ? (
        <ClassicTemplate content={content} theme={theme} />
      ) : template === 'Creative' ? (
        <CreativeTemplate content={content} theme={theme} />
      ) : (
        <ModernTemplate content={content} theme={theme} />
      )}
    </div>
  )
}
