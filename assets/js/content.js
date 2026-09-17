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
      "id": "health-visualization",
      "tier": 2,
      "name": "Health Visualization",
      "kicker": "Category · stack",
      "status": "Shipped",
      "statusKind": "shipped",
      "stack": [],
      "links": [],
      "problem": "I just wanted to visualize the health data from Apple. Apple's own health visualizations is lacking in identifying macro patterns and wanted something better. ",
      "built": [
        "Simple HTML and JS that parses the health data zip , does aggregations and visualises the results."
      ],
      "next": "Nothing more is planned. Built it cause building is commoditized. ",
      "pitch": "Claude made a dashboard to visualize my health export data from Apple",
      "cta": [
        {
          "label": "Read more here",
          "href": "https://debayanbhattacharya.substack.com/p/claude-whats-my-health-like"
        }
      ],
      "image": "art/bildschirmfoto-2026-09-17-um-21.37.56.png"
    },
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
      "status": "Sunsetted",
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
      "id": "curiosities",
      "type": "curiosities",
      "enabled": true,
      "inNav": true,
      "nav": "curiosities",
      "navShort": "curious",
      "label": "My curiosities",
      "title": "Things I keep thinking about.",
      "intro": "Ideas I keep turning over. Mostly things with a name, where the name turned out to be doing a lot of work."
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
  "background": {
    "cell": 17,
    "fps": 9,
    "density": 0.26,
    "links": true
  },
  "analytics": {
    "goatcounter": ""
  },
  "curiosities": {
    "intro": "Ideas I keep turning over. Mostly things with a name, where the name turned out to be doing a lot of work.",
    "items": [
      {
        "id": "streisand-effect",
        "title": "The Streisand effect",
        "gist": "Trying to suppress something is itself information, and the internet reads it.",
        "tags": [
          "psychology",
          "internet",
          "systems"
        ],
        "status": "settled",
        "added": "2026-08-16",
        "source": "Named after a 2003 lawsuit over an aerial photo of a house.",
        "body": "Barbra Streisand sued to have a photograph of her clifftop house removed from a public coastal-erosion survey. Before the suit, the image had been downloaded six times, two of them by her own lawyers. The lawsuit was reported, and it was downloaded well over a million times in the following month.<br><br>The interesting part is not the irony. It is that <em>the act of suppression is a signal</em>. Nobody had any reason to look at photo number 3850 in a survey of the Californian coast until somebody powerful indicated that it mattered. Attention is scarce, and the effort spent hiding something is a surprisingly reliable estimate of how interesting it is.",
        "links": [
          {
            "label": "Wikipedia",
            "href": "https://en.wikipedia.org/wiki/Streisand_effect"
          }
        ],
        "related": [
          "goodharts-law"
        ],
        "why": "This is a good way for me to find good movies to watch. If a government is trying to censor a movie, I know it will be worth the watch. "
      },
      {
        "id": "goodharts-law",
        "title": "Goodhart’s law",
        "gist": "When a measure becomes a target, it stops being a good measure.",
        "tags": [
          "systems",
          "machine-learning",
          "economics"
        ],
        "status": "settled",
        "added": "2026-08-16",
        "source": "Charles Goodhart, 1975, on monetary policy. Marilyn Strathern gave it the phrasing everyone quotes.",
        "body": "Goodhart was writing about central banks: any statistical regularity you observe will collapse once you start using it as a lever, because everyone now has a reason to game it. Strathern compressed it to the line people actually remember.<br><br>The sharp version is that a metric is a <em>proxy</em>. It correlates with the thing you care about across the range you happened to observe. Optimise hard enough against the proxy and you leave that range and you are now in the region where the correlation never held.",
        "why": "This is the whole of machine learning in one sentence, and I do not think that is an exaggeration. Every loss function is a proxy for something you cannot write down. \nReward hacking, benchmark contamination, a model that aces the eval and is useless in the product is Goodhart's law in some shape and form.  \nRecent victim of Goodhart's law is tokenmaxxing. When consuming token became a proxy of productivity, it stopped being a good measure. Case in point Uber and Meta. ",
        "links": [
          {
            "label": "Wikipedia",
            "href": "https://en.wikipedia.org/wiki/Goodhart%27s_law"
          }
        ],
        "related": [
          "streisand-effect"
        ]
      },
      {
        "id": "chestertons-fence",
        "title": "Chesterton’s fence",
        "gist": "Do not remove a fence until you know why somebody put it there.",
        "tags": [
          "systems",
          "decisions",
          "philosophy"
        ],
        "status": "settled",
        "added": "2026-08-16",
        "source": "G. K. Chesterton, The Thing, 1929.",
        "body": "Chesterton describes a fence across a road with no obvious purpose. The impatient reformer says: I see no use for this, let us clear it away. The wiser answer is: if you do not see its use, I will not let you clear it away  but go and find out, and when you come back and tell me you do see its use, I may allow you to destroy it.<br><br>It is not an argument for keeping things. It is an argument about the order of operations: understand, then decide.",
        "why": "Every legacy codebase is a field of these. So is every process at a large company. I try my best to understand why something is put in place before wanting to remove it. ",
        "links": [
          {
            "label": "Original passage",
            "href": "https://en.wikipedia.org/wiki/G._K._Chesterton#Chesterton's_fence"
          }
        ],
        "related": []
      },
      {
        "id": "moravecs-paradox",
        "title": "Moravec’s paradox",
        "gist": "The hard problems turned out to be easy, and the easy ones impossibly hard.",
        "tags": [
          "machine-learning",
          "cognition",
          "robotics"
        ],
        "status": "chewing",
        "added": "2026-08-16",
        "source": "Hans Moravec, Mind Children, 1988.",
        "body": "Reasoning like chess, theorem proving, symbolic logic takes remarkably little computation. Perception and mobility, the things a one-year-old does without thinking, take enormous amounts. \nMoravec’s explanation is evolutionary: sensorimotor skill has been under optimisation for a billion years and is deeply, invisibly good. Abstract reasoning is a few thousand years old and barely debugged.<br><br>Which means introspection is a terrible guide to difficulty. The things that feel effortful to us are the recently-bolted-on ones.",
        "why": "It stuck with me because I found this interesting. ",
        "links": [
          {
            "label": "Wikipedia",
            "href": "https://en.wikipedia.org/wiki/Moravec%27s_paradox"
          }
        ],
        "related": []
      },
      {
        "id": "survivorship-bias",
        "title": "Survivorship bias",
        "gist": "Armour the parts of the returning planes with no bullet holes.",
        "tags": [
          "statistics",
          "decisions",
          "psychology"
        ],
        "status": "settled",
        "added": "2026-08-16",
        "source": "Abraham Wald, Statistical Research Group, 1943.",
        "body": "The military wanted armour where returning bombers showed the most damage. Wald pointed out the inversion: those are the places a plane can be hit and still come home. The undamaged regions on survivors are exactly where the lost planes were hit.<br><br>The general form is that your sample is not the population but it is the population filtered by whatever process let it reach you. And that filter is usually invisible, because the things it removed are, by construction, not in front of you.",
        "why": "Nearly every dataset I have trained on has one of these hiding in it.  Something I try my best to keep in my mind when approaching a new problem. ",
        "links": [
          {
            "label": "Wald’s memoranda",
            "href": "https://en.wikipedia.org/wiki/Abraham_Wald#Wald's_work_on_aircraft_survivability"
          }
        ],
        "related": []
      },
      {
        "id": "cunninghams-law",
        "title": "Cunningham’s law",
        "gist": "The fastest way to get an answer is to post a wrong one.",
        "tags": [
          "internet",
          "psychology"
        ],
        "status": "settled",
        "added": "2026-08-16",
        "source": "Attributed to Ward Cunningham, who invented the wiki and disowns the attribution.",
        "body": "Asking a question online is a request for a favour. Posting something confidently incorrect is an invitation to demonstrate superiority, which is a far stronger motivator. The correction arrives faster and in more detail than any answer to a polite question would have.<br><br>Cunningham has said he never said it, which is itself a nicely recursive demonstration.",
        "why": "I remember this concept because I want to use it someday to get what I want albeit it damages my reputation. But anonymously doing this is fine. Reddit someday.",
        "links": [
          {
            "label": "Background",
            "href": "https://en.wikipedia.org/wiki/Ward_Cunningham#Cunningham's_Law"
          }
        ],
        "related": []
      },
      {
        "id": "frequency-illusion",
        "title": "The frequency illusion",
        "gist": "You learn a word, then it is suddenly everywhere. It was always everywhere.",
        "tags": [
          "cognition",
          "psychology"
        ],
        "status": "settled",
        "added": "2026-08-16",
        "source": "Named by Arnold Zwicky, 2005. Also called Baader–Meinhof.",
        "body": "Two mechanisms stacked. Selective attention means a newly-learned thing now clears the filter that was discarding it. Confirmation bias means each subsequent sighting feels like evidence of a real increase rather than a sampling artefact.<br><br>The base rate never changed. Your detector did.",
        "why": "It is a good reminder that the feeling of a trend and the existence of one are almost unrelated, and that I am a badly calibrated instrument for measuring how common anything is. Which is most of the argument for writing measurements down instead of remembering them.\n",
        "links": [
          {
            "label": "Zwicky’s note",
            "href": "https://en.wikipedia.org/wiki/Frequency_illusion"
          }
        ],
        "related": []
      }
    ]
  },
  "pages": {
    "projects": {
      "title": "The things I have built",
      "intro": "Every project I have kept, with the problem each one was trying to solve. Most of them started as something I wanted for myself."
    },
    "writing": {
      "title": "Just Build It",
      "intro": "I write about what I am actually building — mostly personal AI and automation, occasionally what any of it means inside a large enterprise. The Building My Second Brain series is the long-running thread."
    },
    "curiosities": {
      "title": "Things I keep thinking about",
      "intro": "A running collection of concepts I find interesting. "
    },
    "offclock": {
      "title": "Records, films, books and strong opinions about rice.",
      "intro": "The stuff that has nothing to do with work, which is to say the stuff that quietly explains most of it."
    }
  }
};
