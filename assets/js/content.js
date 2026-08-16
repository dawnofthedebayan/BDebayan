/* ============================================================================
   content.js — every word on the site lives in this object.

   GENERATED FILE. It is written by the local CMS (`cms/start.sh`) and is a
   plain JSON assignment on purpose: safe to machine-rewrite, and it still
   works from file:// because nothing fetches it.

   You can hand-edit it — keep it valid JSON after the `=` and the CMS will
   keep working. Comments inside the object will not survive a CMS save.
   ========================================================================== */
window.SITE = {
  "identity": {
    "name": "Debayan Bhattacharya",
    "role": "AI/ML @ Airbus, Hamburg",
    "sub": "I try to stand on my hands. I play six strings badly enough to keep it interesting. I write, mostly to think out loud. Love The Beatles. \nI build AI tools for myself first, for the world second.\nPhD in machine learning. \nCurrently building AI stuff at Airbus. \nAmateur at all of it. Serious about all of it. \nThe only thing I know is that I do not know enough. ",
    "email": "debayanbhattacharyaece@gmail.com",
    "github": "https://github.com/dawnofthedebayan",
    "substack": "https://debayanbhattacharya.substack.com",
    "linkedin": "https://www.linkedin.com/in/dr-ing-debayan-bhattacharya-38ba86108",
    "x": "https://x.com/bhdebayan",
    "scholar": "https://scholar.google.com/citations?user=vU-j0HMAAAAJ&hl=en",
    "bio": "The only thing I know is that I do not know enough. Also, this Dr. does not save lives. "
  },
  "projects": [
    {
      "id": "confidant",
      "tier": 1,
      "name": "Confidant",
      "kicker": "Released · Obsidian community plugin",
      "status": "Shipped",
      "statusKind": "shipped",
      "pitch": "A journaling plugin that reads your entries back to you through thirteen different psychological and philosophical lenses.",
      "stack": [
        "TypeScript",
        "esbuild",
        "OpenRouter",
        "LM Studio",
        "Local LLMs"
      ],
      "links": [
        "vault-llm",
        "mood-classifier"
      ],
      "cta": [
        {
          "label": "Obsidian directory",
          "href": "https://community.obsidian.md/plugins/confidant"
        },
        {
          "label": "Repository",
          "href": "https://github.com/dawnofthedebayan/Confidant"
        },
        {
          "label": "Writeup",
          "href": "https://debayanbhattacharya.substack.com/p/i-just-published-my-first-obsidian"
        }
      ],
      "problem": "Journals are write-only. People produce years of entries and never read them, because re-reading raw daily notes is tedious and the patterns you actually want are invisible at that resolution. The interesting signal only appears when you zoom out and zooming out by hand is exactly the work nobody does. I wanted every body to meta analyse their thoughts and this is what this achieves. ",
      "built": [
        "Rollup summaries across cadences (weekly, biweekly, monthly, yearly) where each tier summarises the tier below it rather than the raw entries, so the distillation compounds.",
        "Thirteen reflection frameworks drawn from established traditions: CBT, ACT, narrative therapy, Stoic reflection and others. You pick the lens; the summary changes shape.",
        "Per-entry mood extraction (emotion, valence, energy, sleep, company, topics) pulled automatically.",
        "An insights dashboard with streaks, mood trend lines, vocabulary drift and outlier detection.",
        "A memory layer holding core facts, semantic knowledge and episodic summaries, so summaries know who the people in your life are.",
        "Local-first via any OpenAI-compatible server, with OpenRouter as an optional fallback."
      ],
      "next": "Shipped and in the community directory. "
    },
    {
      "id": "mood-classifier",
      "tier": 2,
      "name": "Mood classifier pipeline",
      "kicker": "Local inference · structured extraction",
      "status": "Sunsette",
      "pitch": "A local reasoning model that turns free-text journal entries into a queryable database of emotional metadata.",
      "stack": [
        "DeepSeek-R1-0528-Qwen3-8B",
        "mlx_lm",
        "Python",
        "JSON"
      ],
      "links": [
        "confidant",
        "vault-llm"
      ],
      "built": [
        "DeepSeek-R1-0528-Qwen3-8B served through <code>mlx_lm</code>, running entirely on-device.",
        "A structured extraction pass pulling valence, arousal, discrete emotions, sleep quality and social context out of each entry into a JSON database.",
        "Schema validation and repair on the model output, because an 8B reasoning model will occasionally decide that JSON is a suggestion.",
        "A twelve-chart visualiser over the resulting database like trend lines, distributions, and correlations between sleep, social context and next-day valence."
      ],
      "next": "This is a mood tracking app that was a precursor to Confidant. This has been sunsetted. ",
      "problem": "A local reasoning model that turns free-text journal entries into a queryable database of emotional metadata."
    },
    {
      "id": "options-pipeline",
      "tier": 2,
      "name": "Options analysis pipeline",
      "kicker": "Quantitative tooling · Streamlit",
      "status": "Sunsetted",
      "pitch": "A composite signal engine for options, where the deterministic maths decides and the LLM only explains. ",
      "stack": [
        "Python",
        "Streamlit",
        "OpenRouter",
        "JSON schema"
      ],
      "links": [],
      "problem": "Most \"AI trading\" tools let a language model make the call, which is a category error. LLMs are fluent. What they are genuinely good at is synthesising a stated position into readable prose. The architecture had to keep those two jobs strictly separated, and it had to leave a record so the scoring could be corrected against outcomes instead of vibes.",
      "built": [
        "A composite scoring engine over IV rank and percentile, volatility skew, and expected move.",
        "A fully deterministic decision engine having same inputs, same output, every time. No model is in this path.",
        "LLM synthesis via OpenRouter constrained to a strict JSON schema, which writes the rationale <em>after</em> the decision is made and cannot change it.",
        "A decision journal capturing each call with its inputs, so realised outcomes feed back into recalibrating the signal weights.",
        "A Streamlit front end for scanning and drilling into individual chains."
      ],
      "next": "Nothing comes next. I had to build this project to realise that I do not enjoy reading charts and doing these highly risky trades. Its boring for me. "
    },
    {
      "id": "epub-summarizer",
      "tier": 2,
      "name": "Agentic EPUB summarizer",
      "kicker": "Long-context agent · crash-tolerant",
      "status": "Developing",
      "statusKind": "active",
      "pitch": "A two-agent reader that works through a whole book with rolling memory and survives being killed halfway.",
      "stack": [
        "Python",
        "asyncio",
        "EPUB",
        "Agent dispatch"
      ],
      "links": [
        "options-pipeline",
        "vault-llm"
      ],
      "problem": "A book does not fit in a context window, and chunk-and-summarise loses the thread by chapter twelve the summariser has forgotten who anyone is. Fiction and non-fiction also fail differently: one needs narrative and character continuity, the other needs argument structure. And any process that runs for an hour against an API will eventually die partway through, so restarting from zero is not acceptable.",
      "built": [
        "Rolling memory carried chapter to chapter, so later summaries stay anchored to earlier material instead of restarting cold.",
        "Two-agent dispatch with a classifier routes the book to a fiction or non-fiction agent with different prompting and different memory shapes.",
        "Crash recovery through a <code>.state.json</code> checkpoint written after each unit of work; kill it and it resumes where it stopped.",
        "<code>asyncio</code> parallelism across chapters where ordering permits, with the sequential memory chain preserved."
      ],
      "next": "Mostly done and doing its job. I am considering making an obsidian plugin like Confidant."
    }
  ],
  "notebook": [
    {
      "name": "Trading dashboard",
      "note": "Positions, P&L and exposure in one Streamlit page. Unglamorous, used constantly."
    },
    {
      "name": "Language learning app",
      "note": "Spaced repetition with generated example sentences. Written up on the Substack.",
      "href": "https://debayanbhattacharya.substack.com/p/made-an-ai-powered-language-learning"
    },
    {
      "name": "DebayanGPT",
      "note": "An early experiment in a model that talks like me. Mostly a lesson in how much data that actually takes.",
      "href": "https://github.com/dawnofthedebayan/DebayanGPT"
    }
  ],
  "writing": {
    "publication": "Just Build It",
    "seriesName": "Building My Second Brain",
    "url": "https://debayanbhattacharya.substack.com",
    "blurb": "I write about what I am actually building — mostly personal AI and automation, occasionally what any of it means inside a large enterprise.",
    "posts": [
      {
        "flagship": true,
        "title": "Where did we come from and where are we going with AI?",
        "sub": "And what does that mean for enterprise",
        "date": "18 Jul 2026",
        "href": "https://debayanbhattacharya.substack.com/p/where-did-we-come-from-and-where",
        "note": "Four years of AI progress, read from inside a company that has to actually deploy the stuff."
      },
      {
        "flagship": true,
        "title": "I just published my first Obsidian Plug In!",
        "sub": "Giving my \"Second Brain\" to the world",
        "date": "4 Aug 2026",
        "href": "https://debayanbhattacharya.substack.com/p/i-just-published-my-first-obsidian",
        "note": "The Confidant writeup — what it does, why thirteen frameworks, and what shipping to a plugin directory is like."
      },
      {
        "title": "Markdown",
        "sub": "The human-first language that quietly became the language of the machines",
        "date": "13 Mar 2026",
        "href": "https://debayanbhattacharya.substack.com/p/markdown",
        "flagship": true
      },
      {
        "flagship": true,
        "title": "Context Engineering is where value lies in Enterprise AI",
        "sub": "How I got a win in AI within my enterprise",
        "date": "25 Mar 2026",
        "href": "https://debayanbhattacharya.substack.com/p/context-engineering-is-where-value",
        "note": "The unglamorous claim that the model is rarely the bottleneck."
      },
      {
        "title": "Building my second brain — Part 5",
        "date": "12 Jul 2026",
        "href": "https://debayanbhattacharya.substack.com/p/building-my-second-brain-0ee"
      },
      {
        "title": "Building my second brain — Part 4",
        "date": "28 Jun 2026",
        "href": "https://debayanbhattacharya.substack.com/p/building-my-second-brain-8f5"
      },
      {
        "title": "Building my second brain — Part 3",
        "date": "20 Jun 2026",
        "href": "https://debayanbhattacharya.substack.com/p/building-my-second-brain-09d"
      },
      {
        "title": "Building my second brain — Part 2",
        "date": "12 Jun 2026",
        "href": "https://debayanbhattacharya.substack.com/p/building-my-second-brain-1d7"
      },
      {
        "title": "Building my second brain — Part 1",
        "date": "8 Jun 2026",
        "href": "https://debayanbhattacharya.substack.com/p/building-my-second-brain"
      },
      {
        "title": "Started building my second brain — Prologue",
        "date": "7 Jun 2026",
        "href": "https://debayanbhattacharya.substack.com/p/started-building-my-second-brain"
      }
    ]
  },
  "offclock": {
    "items": [
      {
        "id": "revolver",
        "kind": "album",
        "title": "Revolver",
        "by": "The Beatles",
        "meta": "1966 · Parlophone",
        "badge": "On the turntable",
        "art": "assets/img/revolver.jpg",
        "blurb": "The record where the studio stopped being a room and became an instrument.",
        "spotify": "3PRoXYsngSwjEQWR5PsHWR",
        "body": "This is the best album of the Beatles. I like this album cause it shows something about work. \nBy this time the Beatles were big and famous and they could call the shots. They chose to devote hours at the recording studio to make songs. It was unheard of at that time because back then you could only record your songs within a booked slot. The Beatles were not time bound and that led to the burst of creativity which ultimately birthed freaking music genres. \nJust love this album.  "
      },
      {
        "id": "arrival",
        "kind": "film",
        "title": "Arrival",
        "by": "Denis Villeneuve",
        "meta": "2016",
        "badge": "Favourite film",
        "art": "assets/img/arrival.jpg",
        "blurb": "A film about how the representation you use decides what you are able to think.",
        "spotify": "3GDfBsNm22NeGSP2vQDWnO",
        "body": "When I watched this movie, it literally blew my mind. I ended up reading the novella after having watched the movie. I remember talking for hours with my friends and the concepts the film touches upon. Like how language changes your perception of reality and in this your perception of time. And how the whole movie is told in a non-linear manner which is exactly how you perceive time having learned the alien language. Its just too good. "
      },
      {
        "id": "john-and-paul",
        "kind": "book",
        "title": "John & Paul: A Love Story in Songs",
        "by": "Ian Leslie",
        "meta": "Faber, 2025",
        "badge": "Reading now",
        "art": "assets/img/johnpaul.jpeg",
        "blurb": "The Lennon–McCartney partnership read as a relationship, one song at a time.",
        "links": [
          {
            "label": "Faber",
            "href": "https://www.faber.co.uk/product/9780571376117-john-and-paul/"
          }
        ],
        "body": "It is simply cool to hear the stories of the humans that made some of the most iconic songs. Their strengths, vulnerabilities, their jealousy. This book gave me a whole new dimension to the songs I love listening but also taught me to never idolize your heroes. \nGreat book written beautifully by Ian Leslie. Have to read his other stuff.  "
      },
      {
        "id": "biryani",
        "kind": "thing",
        "title": "Biryani",
        "meta": "Field research, indefinite",
        "badge": "Strong opinions",
        "blurb": "Kolkata style. The potato is not optional. I will not be taking questions.",
        "body": "I love biriyani and love making biriyani. One day I want to travel across India and have all kinds of Biriyani. ",
        "art": "art/bir.jpg"
      },
      {
        "id": "vinyl",
        "kind": "thing",
        "title": "The record shelf",
        "meta": "Growing faster than the space allows",
        "blurb": "Deliberately the least convenient way to listen to anything. But damn is it the best way to listen to music. ",
        "body": "The point is not fidelity, whatever anyone tells you. \nThe point is that a record makes you choose one thing and then sit with it for twenty minutes a side without skipping. \nIn a life where everything else is queryable, indexed and instantly retrievable, there is something worth protecting about a format that requires you to hold it, feel it and then hear it. ",
        "art": "art/record.jpg"
      },
      {
        "id": "the-missus",
        "kind": "thing",
        "title": "Annoying the missus",
        "meta": "Daily practice",
        "badge": "Load-bearing",
        "blurb": "A sustained programme of low-grade nonsense, conducted with commitment.",
        "body": "Some times I annoy on purpose, but most times I annoy her by my being. "
      }
    ]
  },
  "photos": {
    "poster": "assets/hero/gaze-poster.webp",
    "egg": "assets/hero/egg.webp",
    "hintTouch": "scroll to look around"
  },
  "sections": [
    {
      "id": "projects",
      "type": "projects",
      "enabled": true,
      "nav": "projects",
      "navShort": "projects",
      "label": "Projects",
      "title": "The things I have worked on",
      "inNav": true,
      "intro": "Some of the personal projects I built over the years"
    },
    {
      "id": "writing",
      "type": "writing",
      "enabled": true,
      "nav": "writing",
      "navShort": "writing",
      "label": "Writing",
      "title": "Just Build It",
      "intro": "A Substack about what I am actually building and its mostly personal AI and automation, occasionally what any of it means inside a large enterprise. The Building My Second Brain series is the long-running thread. ",
      "inNav": true
    },
    {
      "id": "offclock",
      "type": "offclock",
      "enabled": true,
      "nav": "off the clock",
      "navShort": "off-clock",
      "label": "Off the clock",
      "title": "Records, films, books and strong opinions about rice.",
      "intro": "The stuff that has nothing to do with work, which is to say the stuff that quietly explains most of it.",
      "inNav": true
    },
    {
      "id": "contact",
      "type": "contact",
      "enabled": true,
      "nav": "contact",
      "navShort": "contact",
      "label": "Contact",
      "title": "Come find me on the network.",
      "intro": "Happy to talk about survival guides when AI goes sentient. ",
      "inNav": true
    }
  ],
  "hero": {
    "eyebrow": "AI/ML @ Airbus · Hamburg",
    "ctaPrimary": "Open the graph",
    "ctaSecondary": "Read the writing",
    "ctaContact": "Get in touch",
    "facts": [],
    "hint": "move your cursor",
    "satellites": [
      {
        "label": "second brain",
        "deg": -88,
        "tone": "v"
      },
      {
        "label": "confidant",
        "deg": -33,
        "tone": ""
      },
      {
        "label": "curious",
        "deg": 26,
        "tone": "v"
      },
      {
        "label": "obsidian",
        "deg": 138,
        "tone": "a"
      },
      {
        "label": "ai",
        "deg": 178,
        "tone": ""
      }
    ],
    "headlineLead": "Hi I am ",
    "headlineAccent": "Dr. Debayan Bhattacharya"
  },
  "notebookIntro": "Smaller and rougher. Built to answer a question or scratch an itch, kept because they still get used.",
  "notebookTitle": "Lab notebook",
  "background": {
    "cell": 17,
    "fps": 9,
    "density": 0.26,
    "links": true
  },
  "analytics": {
    "goatcounter": ""
  }
};
