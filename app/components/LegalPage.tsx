import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import BrandMark from '@/app/components/BrandMark';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';

interface LegalSection {
  title: string;
  body: string[];
}

interface LegalPageProps {
  title: string;
  effectiveDate: string;
  intro: string;
  sections: LegalSection[];
}

export default function LegalPage({
  title,
  effectiveDate,
  intro,
  sections,
}: LegalPageProps) {
  return (
    <main className="min-h-dvh bg-[var(--bg-base)] px-6 py-8 text-foreground">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'w-fit' })}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back Home
          </Link>

          <BrandMark
            size={40}
            withName
            subtitle={
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">By Naeem Navjivan</p>
            }
          />
        </header>

        <Card className="border-primary/15 bg-card/85 backdrop-blur">
          <CardContent className="p-6 md:p-8">
            <p className="text-xs font-bold uppercase text-primary">Effective {effectiveDate}</p>
            <h1 className="mt-3 text-3xl font-bold md:text-4xl">{title}</h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{intro}</p>

            <div className="mt-8 space-y-7">
              {sections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <h2 className="text-lg font-bold">{section.title}</h2>
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-muted-foreground">
                      {paragraph}
                    </p>
                  ))}
                </section>
              ))}
            </div>

            <div className="mt-8 rounded-lg border border-border bg-secondary/60 p-4 text-sm text-muted-foreground">
              This page is provided for product transparency and is not legal advice. If Udharwale is used commercially or published broadly, have these terms reviewed for your jurisdiction.
            </div>

            <p className="mt-6 text-center text-xs font-semibold text-primary">
              Udharwale by Naeem Navjivan
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
