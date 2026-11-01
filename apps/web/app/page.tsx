import { FileCheck, History, Percent, Satellite, Send, Sprout, Workflow } from "lucide-react";
import Link from "next/link";

import LiveStatus from "@/components/LiveStatus";
import { CTASection } from "@/components/sections/cta";
import { FeatureSection } from "@/components/sections/features";
import { HeroSection } from "@/components/sections/hero";
import { MarketingShell } from "@/components/shells/marketing-shell";
import { ButtonLink } from "@/components/ui/button-link";

const GITHUB = "https://github.com/ZaroCoding/khetikavach";

// Everything below is taken from README.md and docs/STRATEGY.md.
const FEATURES = [
  {
    icon: <Percent />,
    title: "Probabilities, not adjectives",
    description:
      "The share of 51 ECMWF and 31 NOAA GEFS ensemble members that cross crop-relevant thresholds, with a 90% interval, next to how often the IMD record (1991–2020) saw the same event in the same window.",
  },
  {
    icon: <Satellite />,
    title: "Field evidence",
    description:
      "Sentinel-2 NDVI and NDMI against the field's own 2017+ history, and Sentinel-1 radar when monsoon cloud blinds optical imagery.",
  },
  {
    icon: <FileCheck />,
    title: "Plans you can audit",
    description:
      "Hybrid retrieval over the district's ICAR-CRIDA contingency plan. Every action cites a page, and a verifier rejects numbers that are not in the evidence and dates outside the forecast window.",
  },
  {
    icon: <Workflow />,
    title: "A visible, self-correcting agent",
    description:
      "A LangGraph agent with quality gates and source fallback chains, streamed live so you watch it plan, call tools, check them and fall back.",
  },
  {
    icon: <History />,
    title: "Proof without hindsight",
    description:
      "Time Machine replays the forecast actually issued on a past date (from 2024-03-14) or, earlier, a LightGBM model on rain observed up to the day before.",
  },
  {
    icon: <Send />,
    title: "Alerts where farmers are",
    description:
      "FPO agronomists and KVK officers manage many fields in the web app; the farmers they serve receive Telegram alerts in Hindi or Punjabi.",
  },
];

const SOURCES = [
  ["Open-Meteo", "ECMWF IFS and NOAA GEFS ensembles, ERA5-Land (CC BY 4.0)"],
  ["Copernicus Sentinel-2 and Sentinel-1", "via Copernicus Data Space and Microsoft Planetary Computer"],
  ["IMD Pune", "0.25° gridded daily rainfall"],
  ["NASA POWER", "daily point rainfall"],
  ["ICAR-CRIDA", "district agriculture contingency plans"],
  ["OpenStreetMap", "district boundaries and place search"],
];

export default function Landing() {
  return (
    <MarketingShell>
      <MarketingShell.Nav>
        <a href="#top" className="flex items-center gap-1.5 text-lg font-bold text-leaf-700">
          <Sprout className="size-5" />
          KhetKavach
          <span className="ml-1 text-sm font-normal text-soil-500">खेतकवच</span>
        </a>
        <nav aria-label="Sections" className="ml-6 hidden gap-4 text-sm text-soil-700 sm:flex">
          <a href="#features" className="hover:text-leaf-700">
            What it does
          </a>
          <a href="#sources" className="hover:text-leaf-700">
            Data
          </a>
          <a href="#status" className="hover:text-leaf-700">
            Live status
          </a>
        </nav>
        <ButtonLink href="/app" className="ml-auto">
          Open the app
        </ButtonLink>
      </MarketingShell.Nav>

      <MarketingShell.Hero>
        <span id="top" />
        <HeroSection
          badge="FORGE 2026"
          heading="Field-level early warning for dry spells and damaging rain"
          description="India has plenty of weather data. What farmers lack is a forecast for one field, this week, and the action that field needs. KhetKavach gives the probability of a dry spell, heavy rain or rain at harvest over the next 15 days, then writes a dated action plan quoted from the district's official ICAR-CRIDA contingency plan."
          primaryCTA={{ label: "Open the app", href: "/app" }}
          secondaryCTA={{ label: "View on GitHub", href: GITHUB, external: true }}
        >
          <p className="mt-8 text-sm text-soil-500">Demo districts: Ludhiana (Punjab) and Dharwad (Karnataka).</p>
        </HeroSection>
      </MarketingShell.Hero>

      <MarketingShell.Main>
        <section id="features" aria-labelledby="features-title">
          <FeatureSection
            title="What makes it different"
            description="Every number comes from a live API, the database or an official open dataset, and carries its source and fetch time. The language model writes wording only."
            features={FEATURES}
          />
        </section>

        <section id="sources" className="border-y bg-muted/40 py-12" aria-labelledby="sources-title">
          <div className="mx-auto max-w-6xl px-4">
            <h2 id="sources-title" className="mb-6 text-center text-2xl font-bold tracking-tight text-soil-900">
              Built on open data
            </h2>
            <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {SOURCES.map(([name, role]) => (
                <li key={name} className="text-sm">
                  <span className="font-semibold">{name}</span> <span className="text-soil-500">{role}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="status" className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="status-title">
          <h2 id="status-title" className="mb-2 text-center text-3xl font-bold tracking-tight text-soil-900">
            Live status
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-muted-foreground">
            Your browser asks the running API right now. If it cannot answer, this block says unavailable instead of showing a number.
          </p>
          <LiveStatus />
        </section>

        <CTASection
          title="See it on a real field"
          description="Draw a field on the satellite basemap, pick the crop and sowing date, and watch the agent plan, call its tools, check their quality and verify its plan."
          primaryCTA={{ label: "Open the app", href: "/app" }}
          secondaryCTA={{ label: "Read the source", href: GITHUB, external: true }}
        />
      </MarketingShell.Main>

      <MarketingShell.Footer>
        <div className="flex flex-col gap-4 text-sm text-soil-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-semibold text-soil-900">KhetKavach</span> · built for FORGE 2026
          </div>
          <div className="flex gap-4">
            <a className="hover:text-leaf-700" href={GITHUB} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <Link className="hover:text-leaf-700" href="/app">
              Open the app
            </Link>
          </div>
          <div>© 2026 KhetKavach. Imagery © Esri; map data © OpenStreetMap contributors.</div>
        </div>
      </MarketingShell.Footer>
    </MarketingShell>
  );
}
