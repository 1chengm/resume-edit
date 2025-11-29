import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileText, Sparkles, Download, Share2, CheckCircle } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <FileText className="h-6 w-6" />
            <span>ResumeCraft</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/sign-in">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>

          <div className="container mx-auto px-4 text-center max-w-4xl">
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20 mb-6">
              <Sparkles className="mr-1 h-3 w-3" />
              <span>Powered by Advanced AI</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Craft Your Perfect Resume <br className="hidden md:block" /> in Minutes, Not Hours
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Create professional, ATS-friendly resumes with our AI-powered builder.
              Get real-time feedback, optimize for job descriptions, and land your dream job.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-in">
                <Button size="lg" className="h-12 px-8 text-base">
                  Create My Resume
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Hero Image Placeholder */}
            <div className="mt-16 rounded-xl border bg-card p-2 shadow-2xl">
              <div className="rounded-lg border bg-muted/50 aspect-[16/9] flex items-center justify-center text-muted-foreground">
                Resume Editor Preview
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Everything you need to stand out</h2>
              <p className="text-muted-foreground">
                Our platform provides all the tools you need to create a compelling resume that gets past ATS and catches recruiters' eyes.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-background/50 backdrop-blur-sm border-muted/50">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <CardTitle>AI Optimization</CardTitle>
                  <CardDescription>
                    Get smart suggestions to improve your content and match job descriptions perfectly.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-background/50 backdrop-blur-sm border-muted/50">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                    <FileText className="h-6 w-6" />
                  </div>
                  <CardTitle>Real-time Preview</CardTitle>
                  <CardDescription>
                    See your changes instantly as you type. Switch between templates with a single click.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-background/50 backdrop-blur-sm border-muted/50">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                    <Download className="h-6 w-6" />
                  </div>
                  <CardTitle>PDF Export</CardTitle>
                  <CardDescription>
                    Download high-quality PDFs that are compatible with all major application systems.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="bg-primary text-primary-foreground rounded-2xl p-8 md:p-16 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>
              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to build your career?</h2>
                <p className="text-primary-foreground/80 mb-8 text-lg">
                  Join thousands of professionals who have successfully landed jobs using ResumeCraft.
                </p>
                <Link href="/sign-in">
                  <Button size="lg" variant="secondary" className="h-12 px-8 text-base font-semibold">
                    Get Started for Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 font-bold text-xl text-primary mb-4">
                <FileText className="h-6 w-6" />
                <span>ResumeCraft</span>
              </div>
              <p className="text-muted-foreground max-w-sm">
                The smartest way to build, optimize, and share your professional resume.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">Features</Link></li>
                <li><Link href="#" className="hover:text-foreground">Templates</Link></li>
                <li><Link href="#" className="hover:text-foreground">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">About</Link></li>
                <li><Link href="#" className="hover:text-foreground">Blog</Link></li>
                <li><Link href="#" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} ResumeCraft. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
