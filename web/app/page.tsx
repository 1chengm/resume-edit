import Link from "next/link"
import { Suspense } from "react"
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google"
import { Button } from "@/components/ui/button"
import { CurrentYear } from "@/components/current-year"
import { ArrowRight, CheckCircle2, FileText, Sparkles, Target, Wand2 } from "lucide-react"

const pageSans = Noto_Sans_SC({
  variable: "--font-page-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
})

const pageSerif = Noto_Serif_SC({
  variable: "--font-page-serif",
  subsets: ["latin"],
  weight: ["600", "700", "900"],
})

const featureCards = [
  {
    icon: Sparkles,
    title: "AI 语义润色",
    desc: "把“会做事”变成“会表达价值”，自然贴合岗位关键词。",
  },
  {
    icon: Target,
    title: "JD 定向匹配",
    desc: "对照岗位要求给出修改建议，突出最该被看见的能力。",
  },
  {
    icon: FileText,
    title: "实时排版预览",
    desc: "编辑与成稿同步，所见即所得，减少反复导出成本。",
  },
  {
    icon: Wand2,
    title: "一键浏览器导出",
    desc: "保持结构稳定，打印即 PDF，快速用于投递与分享。",
  },
]

export default function Home() {
  return (
    <div className={`${pageSans.variable} ${pageSerif.variable} relative min-h-screen bg-background text-foreground`}>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-primary/20 blur-[110px]" />
        <div className="absolute right-[5%] top-[28%] h-[320px] w-[320px] rounded-full bg-cyan-400/20 blur-[100px]" />
        <div className="absolute bottom-0 left-[8%] h-[320px] w-[320px] rounded-full bg-amber-300/20 blur-[100px]" />
        <div className="hero-noise absolute inset-0 opacity-30" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-base font-semibold tracking-wide">ResumeCraft Atelier</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="h-9 px-4">
                登录
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="h-9 px-4">
                免费开始
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:pt-20">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              为中文求职场景而设计
            </div>

            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl [font-family:var(--font-page-serif)]">
              简历不是表格。
              <br />
              它是你的职业叙事。
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              用更现代的方式整理经历、匹配岗位、优化措辞，并以高质量 PDF 输出。
              从第一眼开始，让招聘方读到重点，而不是读到冗余。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/sign-up">
                <Button size="lg" className="group h-11 px-6">
                  创建我的简历
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg" className="h-11 px-6">
                  进入工作台
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-background/70 p-4 shadow-sm">
                <p className="text-xl font-bold">10x</p>
                <p className="mt-1 text-sm text-muted-foreground">更快完成初稿</p>
              </div>
              <div className="rounded-xl border bg-background/70 p-4 shadow-sm">
                <p className="text-xl font-bold">ATS 友好</p>
                <p className="mt-1 text-sm text-muted-foreground">结构清晰，关键词可读</p>
              </div>
              <div className="rounded-xl border bg-background/70 p-4 shadow-sm">
                <p className="text-xl font-bold">一键导出</p>
                <p className="mt-1 text-sm text-muted-foreground">浏览器打印即 PDF</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md">
              <div className="hero-float rounded-2xl border bg-white p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">Preview</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Ready to export
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="h-3 w-2/3 rounded bg-slate-900/80" />
                  <div className="h-2.5 w-1/3 rounded bg-slate-400/80" />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="h-2 rounded bg-slate-200" />
                    <div className="h-2 rounded bg-slate-200" />
                    <div className="h-2 rounded bg-slate-200" />
                    <div className="h-2 rounded bg-slate-200" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-2.5 w-full rounded bg-slate-200" />
                    <div className="h-2.5 w-[92%] rounded bg-slate-200" />
                    <div className="h-2.5 w-[80%] rounded bg-slate-200" />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 max-w-[230px] rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
                <p className="text-xs font-semibold text-primary">岗位匹配建议</p>
                <p className="mt-1 text-xs text-muted-foreground">建议强调“跨团队协作”和“可量化结果”。</p>
              </div>
              <div className="absolute -right-4 -top-4 rounded-xl border bg-background/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur">
                ATS Score +18%
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
          <div className="rounded-3xl border bg-background/70 p-6 shadow-sm backdrop-blur sm:p-8">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Capabilities</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight [font-family:var(--font-page-serif)] sm:text-3xl">
                  一套工具，打通从编辑到投递
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {featureCards.map((item) => (
                <article key={item.title} className="group rounded-2xl border bg-card/80 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
          <div className="rounded-3xl border bg-gradient-to-br from-primary/95 via-primary to-cyan-500 p-8 text-primary-foreground shadow-2xl sm:p-10">
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <p className="text-sm uppercase tracking-[0.18em] text-primary-foreground/80">Start now</p>
                <h2 className="mt-3 text-3xl font-bold leading-tight [font-family:var(--font-page-serif)] sm:text-4xl">
                  把简历升级为你的职业作品集首页
                </h2>
                <p className="mt-4 max-w-2xl text-primary-foreground/85">
                  立即创建并体验：内容分析、岗位匹配、预览导出一体化流程。无须复杂学习，直接进入高质量产出。
                </p>
              </div>

              <div className="lg:col-span-4">
                <div className="rounded-2xl border border-white/30 bg-white/10 p-5 backdrop-blur">
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      多模板编辑
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      简历智能分析
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      浏览器快速导出
                    </li>
                  </ul>
                  <Link href="/sign-up" className="mt-5 block">
                    <Button variant="secondary" className="w-full">
                      免费创建账号
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>ResumeCraft Atelier</p>
          <p>
            © <Suspense fallback="----"><CurrentYear /></Suspense> All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
